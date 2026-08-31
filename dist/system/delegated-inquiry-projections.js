"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.delegatedInquiryId = delegatedInquiryId;
exports.beginDelegatedInquiryProjection = beginDelegatedInquiryProjection;
exports.finishDelegatedInquiryProjection = finishDelegatedInquiryProjection;
exports.getDelegatedInquiryProjection = getDelegatedInquiryProjection;
exports.updateDelegatedInquiryProjection = updateDelegatedInquiryProjection;
exports.listDelegatedInquiryProjections = listDelegatedInquiryProjections;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const credential_store_1 = require("../core/credential-store");
const runtime_events_1 = require("./runtime-events");
const STORE_FILE = path.join(utils_1.CCM_DIR, "delegated-inquiry-projections.json");
const MAX_RECORDS = 500;
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function safeText(value, max) {
    return (0, credential_store_1.redactSensitiveText)(value)
        .replace(/[\0\r\n\t]+/g, " ")
        .replace(/(?:[A-Za-z]:\\|\/(?:Users|home|root)\/)[^\s]+/g, "[受控路径]")
        .trim()
        .slice(0, max);
}
function projectionChecksum(value) {
    const { checksum: _ignored, ...payload } = value;
    return digest(payload);
}
function normalizeProjection(value) {
    const targetScope = String(value?.targetScope || value?.target_scope || "");
    const legacyStatus = String(value?.status || "");
    const status = (legacyStatus === "insufficient" ? "partial" : legacyStatus);
    const inquiryId = safeText(value?.inquiryId || value?.inquiry_id, 120);
    const sourceSessionId = safeText(value?.sourceSessionId || value?.source_session_id, 160);
    const targetId = safeText(value?.targetId || value?.target_id, 160);
    if (!inquiryId || !sourceSessionId || !targetId || !["group", "project"].includes(targetScope))
        return null;
    if (!["queued", "running", "completed", "partial", "needs_input", "failed"].includes(status))
        return null;
    const evidenceIds = Array.from(new Set((Array.isArray(value?.evidenceIds) ? value.evidenceIds : []).map((item) => safeText(item, 180)).filter(Boolean)));
    const missingEvidenceSummaries = Array.from(new Set((Array.isArray(value?.missingEvidenceSummaries || value?.missing_evidence_summaries)
        ? (value.missingEvidenceSummaries || value.missing_evidence_summaries) : []).map((item) => safeText(item, 500)).filter(Boolean))).slice(0, 8);
    const availableActions = (Array.isArray(value?.availableActions || value?.available_actions) ? (value.availableActions || value.available_actions) : [])
        .map(String).filter((item) => ["continue_with_current", "supplement_check", "provide_clarification", "promote_to_development"].includes(item));
    const legacyOutcome = legacyStatus === "insufficient" ? "partial"
        : ["completed", "failed"].includes(legacyStatus) ? legacyStatus
            : String(value?.outcome || "");
    const outcome = ["completed", "partial", "needs_input", "failed"].includes(legacyOutcome) ? legacyOutcome : undefined;
    const publicBase = {
        schema: "ccm-delegated-inquiry-projection-v2",
        inquiryId,
        revision: Math.max(1, Math.floor(Number(value?.revision || 1))),
        sourceScope: "global",
        sourceScopeId: "global",
        sourceSessionId,
        exactSessionId: sourceSessionId,
        generation: Math.max(0, Math.floor(Number(value?.generation || 0))),
        targetScope,
        targetId,
        status,
        ...(outcome ? { outcome } : {}),
        questionSummary: safeText(value?.questionSummary || value?.question_summary, 500),
        evidenceCount: Math.max(evidenceIds.length, Math.max(0, Math.floor(Number(value?.evidenceCount || value?.evidence_count || 0)))),
        ...(safeText(value?.evidenceReferenceChecksum || value?.evidence_reference_checksum, 80)
            ? { evidenceReferenceChecksum: safeText(value?.evidenceReferenceChecksum || value?.evidence_reference_checksum, 80) } : {}),
        repoStateChecksums: Object.fromEntries(Object.entries(value?.repoStateChecksums || value?.repo_state_checksums || {})
            .map(([key, checksum]) => [safeText(key, 160), safeText(checksum, 128)])
            .filter(([key, checksum]) => key && checksum)),
        missingEvidenceSummaries,
        automaticSupplementAttempts: Math.min(1, Math.max(0, Math.floor(Number(value?.automaticSupplementAttempts || value?.automatic_supplement_attempts || 0)))),
        availableActions: availableActions.length ? Array.from(new Set(availableActions)) : actionsForStatus(status),
        ...(safeText(value?.conclusionSummary || value?.conclusion_summary, 800)
            ? { conclusionSummary: safeText(value?.conclusionSummary || value?.conclusion_summary, 800) }
            : {}),
        startedAt: String(value?.startedAt || value?.started_at || new Date().toISOString()),
        ...(value?.completedAt || value?.completed_at ? { completedAt: String(value.completedAt || value.completed_at) } : {}),
        contentStored: false,
    };
    return {
        ...publicBase,
        checksum: projectionChecksum(publicBase),
        evidenceIds,
        handledActionKeys: Array.from(new Set((Array.isArray(value?.handledActionKeys) ? value.handledActionKeys : []).map((item) => safeText(item, 180)).filter(Boolean))).slice(-40),
    };
}
function emptyStore() {
    return { schema: "ccm-delegated-inquiry-projection-store-v2", revision: 0, inquiries: [], updatedAt: "" };
}
function loadStore() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, emptyStore());
    return {
        schema: "ccm-delegated-inquiry-projection-store-v2",
        revision: Math.max(0, Math.floor(Number(raw?.revision || 0))),
        inquiries: (Array.isArray(raw?.inquiries) ? raw.inquiries : []).map(normalizeProjection).filter(Boolean),
        updatedAt: String(raw?.updatedAt || raw?.updated_at || ""),
    };
}
function saveStore(store) {
    const next = {
        schema: "ccm-delegated-inquiry-projection-store-v2",
        revision: store.revision + 1,
        inquiries: store.inquiries.slice(-MAX_RECORDS),
        updatedAt: new Date().toISOString(),
    };
    (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, next);
    return next;
}
function actionsForStatus(status) {
    if (status === "partial")
        return ["continue_with_current", "supplement_check", "provide_clarification", "promote_to_development"];
    if (status === "needs_input")
        return ["continue_with_current", "provide_clarification", "promote_to_development"];
    if (status === "completed")
        return ["promote_to_development"];
    if (status === "failed")
        return ["supplement_check"];
    return [];
}
function publicProjection(value) {
    const { evidenceIds: _evidenceIds, handledActionKeys: _handledActionKeys, ...projection } = value;
    return projection;
}
function projectionBase(value) {
    const { checksum: _checksum, ...base } = publicProjection(value);
    return base;
}
function notify(value) {
    (0, runtime_events_1.publishRuntimeEvent)(value.targetScope, `${value.targetScope}.delegated_inquiries_changed`, {
        inquiryId: value.inquiryId,
        targetScope: value.targetScope,
        targetId: value.targetId,
        status: value.status,
        outcome: value.outcome,
        revision: value.revision,
        count: value.evidenceCount,
        source: "global-agent",
    });
}
function delegatedInquiryId(input) {
    return `inq_${digest([input.sourceSessionId, input.targetScope, input.targetId, safeText(input.question, 8_000)]).slice(0, 28)}`;
}
function beginDelegatedInquiryProjection(input) {
    const inquiryId = safeText(input.inquiryId, 120) || delegatedInquiryId(input);
    const now = new Date().toISOString();
    const projection = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const existing = store.inquiries.find(item => item.inquiryId === inquiryId);
        if (existing && ["completed", "partial", "needs_input"].includes(existing.status))
            return existing;
        const base = {
            schema: "ccm-delegated-inquiry-projection-v2",
            inquiryId,
            revision: Math.max(1, Number(existing?.revision || 0) + 1),
            sourceScope: "global",
            sourceScopeId: "global",
            sourceSessionId: safeText(input.sourceSessionId, 160),
            exactSessionId: safeText(input.sourceSessionId, 160),
            generation: Math.max(0, Math.floor(Number(input.generation || 0))),
            targetScope: input.targetScope,
            targetId: safeText(input.targetId, 160),
            status: "running",
            questionSummary: safeText(input.question, 500),
            evidenceCount: 0,
            repoStateChecksums: {},
            missingEvidenceSummaries: [],
            automaticSupplementAttempts: 0,
            availableActions: [],
            startedAt: existing?.startedAt || now,
            contentStored: false,
        };
        const next = { ...base, checksum: projectionChecksum(base), evidenceIds: existing?.evidenceIds || [], handledActionKeys: existing?.handledActionKeys || [] };
        if (existing)
            Object.assign(existing, next);
        else
            store.inquiries.push(next);
        saveStore(store);
        return next;
    });
    notify(projection);
    return publicProjection(projection);
}
function finishDelegatedInquiryProjection(input) {
    const projection = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const existing = store.inquiries.find(item => item.inquiryId === input.inquiryId);
        if (!existing)
            throw new Error("全局只读委托记录不存在");
        const evidenceIds = Array.from(new Set([...(existing.evidenceIds || []), ...(input.evidenceIds || []).map(item => safeText(item, 180)).filter(Boolean)]));
        const base = {
            ...projectionBase(existing),
            revision: existing.revision + 1,
            status: input.status,
            outcome: input.status,
            evidenceCount: Math.max(evidenceIds.length, Math.max(0, Math.floor(Number(input.evidenceCount || 0)))),
            ...(evidenceIds.length ? { evidenceReferenceChecksum: digest(evidenceIds.slice().sort()) } : {}),
            repoStateChecksums: Object.fromEntries(Object.entries(input.repoStateChecksums || existing.repoStateChecksums || {})
                .map(([key, checksum]) => [safeText(key, 160), safeText(checksum, 128)])
                .filter(([key, checksum]) => key && checksum)),
            missingEvidenceSummaries: Array.from(new Set((input.missingEvidenceSummaries || []).map(item => safeText(item, 500)).filter(Boolean))).slice(0, 8),
            automaticSupplementAttempts: Math.min(1, Math.max(existing.automaticSupplementAttempts || 0, Math.floor(Number(input.automaticSupplementAttempts || 0)))),
            availableActions: actionsForStatus(input.status),
            ...(safeText(input.conclusion, 800) ? { conclusionSummary: safeText(input.conclusion, 800) } : {}),
            completedAt: new Date().toISOString(),
            contentStored: false,
        };
        const next = { ...base, checksum: projectionChecksum(base), evidenceIds, handledActionKeys: existing.handledActionKeys || [] };
        Object.assign(existing, next);
        saveStore(store);
        return next;
    });
    notify(projection);
    return publicProjection(projection);
}
function getDelegatedInquiryProjection(inquiryId) {
    const found = loadStore().inquiries.find(item => item.inquiryId === safeText(inquiryId, 120));
    return found ? publicProjection(found) : null;
}
function updateDelegatedInquiryProjection(input) {
    const claimed = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = loadStore();
        const existing = store.inquiries.find(item => item.inquiryId === safeText(input.inquiryId, 120));
        if (!existing)
            throw Object.assign(new Error("协作记录不存在"), { code: "DELEGATED_INQUIRY_NOT_FOUND" });
        const actionKey = safeText(input.actionKey, 180);
        if (actionKey && existing.handledActionKeys.includes(actionKey))
            return { projection: existing, replayed: true };
        if (existing.revision !== Math.max(1, Math.floor(Number(input.expectedRevision || 0)))) {
            throw Object.assign(new Error("协作记录已更新，请刷新后重试"), { code: "DELEGATED_INQUIRY_REVISION_CONFLICT" });
        }
        const publicBase = {
            ...projectionBase(existing),
            ...input.patch,
            revision: existing.revision + 1,
            ...(input.patch.status ? { availableActions: input.patch.availableActions || actionsForStatus(input.patch.status) } : {}),
            ...(input.patch.conclusionSummary !== undefined ? { conclusionSummary: safeText(input.patch.conclusionSummary, 800) } : {}),
            ...(input.patch.missingEvidenceSummaries ? { missingEvidenceSummaries: Array.from(new Set(input.patch.missingEvidenceSummaries.map(item => safeText(item, 500)).filter(Boolean))).slice(0, 8) } : {}),
            contentStored: false,
        };
        const next = {
            ...publicBase,
            checksum: projectionChecksum(publicBase),
            evidenceIds: existing.evidenceIds,
            handledActionKeys: actionKey ? [...existing.handledActionKeys, actionKey].slice(-40) : existing.handledActionKeys,
        };
        Object.assign(existing, next);
        saveStore(store);
        return { projection: next, replayed: false };
    });
    if (!claimed.replayed)
        notify(claimed.projection);
    return { projection: publicProjection(claimed.projection), replayed: claimed.replayed };
}
function listDelegatedInquiryProjections(input = {}) {
    const targetScope = String(input.targetScope || "");
    const targetId = String(input.targetId || "");
    const sourceSessionId = String(input.sourceSessionId || "");
    const limit = Math.max(1, Math.min(100, Math.floor(Number(input.limit || 30))));
    return loadStore().inquiries
        .filter(item => (!targetScope || item.targetScope === targetScope)
        && (!targetId || item.targetId === targetId)
        && (!sourceSessionId || item.sourceSessionId === sourceSessionId))
        .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
        .slice(0, limit)
        .map(publicProjection);
}
//# sourceMappingURL=delegated-inquiry-projections.js.map