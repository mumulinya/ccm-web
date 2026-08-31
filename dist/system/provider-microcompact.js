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
exports.verifyProviderMicrocompactNativeApplyPlan = exports.buildProviderMicrocompactNativeApplyPlan = exports.buildProviderMicrocompactEditPlan = void 0;
exports.readCcmProviderMicrocompactReceipt = readCcmProviderMicrocompactReceipt;
exports.captureCcmProviderMicrocompactBaseline = captureCcmProviderMicrocompactBaseline;
exports.readCcmProviderMicrocompactBoundaryEvents = readCcmProviderMicrocompactBoundaryEvents;
exports.recordCcmProviderMicrocompactReceipt = recordCcmProviderMicrocompactReceipt;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const group_memory_compaction_1 = require("../modules/collaboration/group-memory-compaction");
const conversation_identity_1 = require("./conversation-identity");
exports.buildProviderMicrocompactEditPlan = group_memory_compaction_1.buildGroupApiMicroCompactEditPlan;
exports.buildProviderMicrocompactNativeApplyPlan = group_memory_compaction_1.buildGroupApiMicrocompactNativeApplyPlan;
exports.verifyProviderMicrocompactNativeApplyPlan = group_memory_compaction_1.verifyGroupApiMicrocompactNativeApplyPlan;
const STORE_DIR = path.join(utils_1.CCM_DIR, "context-accounting", "provider-microcompact");
const BOUNDARY_DIR = path.join(STORE_DIR, "boundaries");
function digest(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function scopeOf(value) {
    return value === "group" || value === "project" ? value : "global";
}
function fileOf(scope, scopeId, sessionId) {
    return path.join(STORE_DIR, scope, `${(0, conversation_identity_1.conversationIdentityDigest)({ scope: scope, scopeId, exactSessionId: sessionId })}.json`);
}
function boundaryFileOf(scope, scopeId, sessionId) {
    return path.join(BOUNDARY_DIR, scope, `${(0, conversation_identity_1.conversationIdentityDigest)({ scope: scope, scopeId, exactSessionId: sessionId })}.json`);
}
function checksumWithoutField(value) {
    const core = { ...(value || {}) };
    delete core.checksum;
    return digest(core);
}
function verifiedReceipt(value, expected) {
    if (!value || value.schema !== "ccm-provider-microcompact-receipt-v3")
        return null;
    if (value.contentStored !== false || String(value.checksum || "") !== checksumWithoutField(value))
        return null;
    if (expected?.scope && value.scope !== expected.scope)
        return null;
    if (expected?.scopeId && value.scopeId !== expected.scopeId)
        return null;
    if (expected?.exactSessionId && value.exactSessionId !== expected.exactSessionId)
        return null;
    return value;
}
function readCcmProviderMicrocompactReceipt(scopeInput, scopeIdInput, exactSessionIdInput) {
    const scope = scopeOf(scopeInput);
    const scopeId = String(scopeIdInput || "").trim();
    const exactSessionId = String(exactSessionIdInput || "").trim();
    if (!scopeId || !exactSessionId)
        return null;
    const file = fileOf(scope, scopeId, exactSessionId);
    if (!fs.existsSync(file))
        return null;
    return verifiedReceipt((0, atomic_json_file_1.readJsonWithBackup)(file, null), { scope, scopeId, exactSessionId });
}
function captureCcmProviderMicrocompactBaseline(contextPlan, nativePlan) {
    const scope = scopeOf(contextPlan?.scope || nativePlan?.scope);
    const scopeId = String(contextPlan?.scopeId || nativePlan?.scopeId || (scope === "global" ? "global" : "")).trim();
    const exactSessionId = String(contextPlan?.sessionId || nativePlan?.sessionId || nativePlan?.groupSessionId || "").trim();
    if (!scopeId || !exactSessionId)
        return null;
    const latest = readCcmProviderMicrocompactReceipt(scope, scopeId, exactSessionId);
    const baseline = latest?.schema === "ccm-provider-microcompact-receipt-v3"
        ? Math.max(0, Number(latest.cumulativeCacheDeletedTokens || 0))
        : 0;
    const snapshot = {
        scope,
        scopeId,
        exactSessionId,
        generation: Math.max(0, Number(contextPlan?.generation ?? nativePlan?.generation ?? 0)),
        boundaryGeneration: Math.max(0, Number(contextPlan?.boundaryGeneration ?? nativePlan?.boundaryGeneration ?? 0)),
        requestPatchChecksum: String(nativePlan?.requestPatchChecksum || ""),
        baselineCacheDeletedTokens: baseline,
        capturedAt: new Date().toISOString(),
    };
    if (contextPlan && typeof contextPlan === "object")
        Object.defineProperty(contextPlan, "_microcompactBaseline", { value: snapshot, enumerable: false, configurable: true });
    if (nativePlan && typeof nativePlan === "object")
        Object.defineProperty(nativePlan, "_microcompactBaseline", { value: snapshot, enumerable: false, configurable: true });
    return snapshot;
}
function readBoundaryEvents(scope, scopeId, exactSessionId) {
    const file = boundaryFileOf(scope, scopeId, exactSessionId);
    if (!fs.existsSync(file))
        return [];
    const store = (0, atomic_json_file_1.readJsonWithBackup)(file, { events: [] });
    return (Array.isArray(store?.events) ? store.events : []).filter((row) => {
        const core = { ...row };
        delete core.checksum;
        return row?.schema === "ccm-provider-microcompact-boundary-event-v1"
            && row?.scope === scope
            && row?.scopeId === scopeId
            && row?.exactSessionId === exactSessionId
            && row?.contentStored === false
            && row?.checksum === digest(core);
    });
}
function readCcmProviderMicrocompactBoundaryEvents(scopeInput, scopeIdInput, exactSessionIdInput) {
    const scope = scopeOf(scopeInput);
    const scopeId = String(scopeIdInput || "").trim();
    const exactSessionId = String(exactSessionIdInput || "").trim();
    return scopeId && exactSessionId ? readBoundaryEvents(scope, scopeId, exactSessionId) : [];
}
function persistBoundaryEvent(receipt) {
    if (receipt.mode !== "native_applied" || !receipt.requestPatchChecksum)
        return null;
    const eventCore = {
        schema: "ccm-provider-microcompact-boundary-event-v1",
        id: receipt.boundaryEventId || `pmcb_${digest([receipt.scope, receipt.exactSessionId, receipt.generation, receipt.requestPatchChecksum, receipt.cumulativeCacheDeletedTokens]).slice(0, 24)}`,
        scope: receipt.scope,
        scopeId: receipt.scopeId,
        exactSessionId: receipt.exactSessionId,
        generation: receipt.generation,
        boundaryGeneration: receipt.boundaryGeneration,
        payloadChecksum: receipt.payloadChecksum,
        requestPatchChecksum: receipt.requestPatchChecksum,
        deletedTokensDelta: receipt.deletedTokensDelta,
        clearedToolCallIds: receipt.clearedToolCallIds,
        receiptChecksum: receipt.checksum,
        recordedAt: receipt.recordedAt,
        contentStored: false,
    };
    const event = { ...eventCore, checksum: digest(eventCore) };
    const file = boundaryFileOf(receipt.scope, receipt.scopeId, receipt.exactSessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const events = readBoundaryEvents(receipt.scope, receipt.scopeId, receipt.exactSessionId).filter(row => row.id !== event.id);
        (0, atomic_json_file_1.writeJsonAtomic)(file, { schema: "ccm-provider-microcompact-boundary-ledger-v1", events: [...events, event].slice(-512) });
        return event;
    });
}
function recordCcmProviderMicrocompactReceipt(input) {
    const contextPlan = input.contextPlan || {};
    const nativePlan = input.nativePlan || {};
    const scope = scopeOf(contextPlan.scope || nativePlan.scope);
    const scopeId = String(contextPlan.scopeId || nativePlan.scopeId || (scope === "global" ? "global" : "")).trim();
    const exactSessionId = String(contextPlan.sessionId || nativePlan.sessionId || nativePlan.groupSessionId || "").trim();
    if (!scopeId || !exactSessionId)
        return null;
    const baselineSnapshot = contextPlan._microcompactBaseline || nativePlan._microcompactBaseline || captureCcmProviderMicrocompactBaseline(contextPlan, nativePlan) || {};
    const requestPatchPresent = !!input.requestBody?.context_management && !!nativePlan?.requestPatchChecksum;
    const providerOutcome = input.responseBody?.context_management
        || input.responseBody?.contextManagement
        || input.responseBody?.usage?.context_management
        || input.usage?.context_management
        || null;
    const cumulative = Math.max(0, Number(input.responseBody?.usage?.cache_deleted_input_tokens || input.usage?.cache_deleted_input_tokens || input.usage?.cacheDeletedInputTokens || 0));
    const baseline = Math.max(0, Number(baselineSnapshot?.baselineCacheDeletedTokens || 0));
    const delta = Math.max(0, cumulative - baseline);
    const providerOutcomeVerified = requestPatchPresent && input.ok !== false && (delta > 0 || !!providerOutcome);
    const nativeReady = nativePlan?.nativeApplyReady === true;
    const requestedMode = String(contextPlan.requestedMode || "auto");
    const controlled = contextPlan.ccmControlledProjection === true || contextPlan.executionMode === "ccm_controlled_projection";
    const mode = providerOutcomeVerified
        ? "native_applied"
        : requestPatchPresent && input.ok !== false
            ? "native_unverified"
            : input.ok === false && nativeReady
                ? "failed"
                : controlled || (requestedMode === "native" && !nativeReady)
                    ? "controlled_fallback"
                    : "not_needed";
    const reason = mode === "native_applied" ? "provider_context_management_application_verified"
        : mode === "native_unverified" ? "provider_patch_sent_without_request_bound_application_proof"
            : mode === "controlled_fallback" ? String(contextPlan.downgradeReason || "provider_uses_ccm_materialized_context")
                : mode === "failed" ? String(input.error?.message || input.error || "provider_microcompact_failed").slice(0, 240)
                    : "no_provider_microcompact_edit_required";
    const requestPatchChecksum = String(nativePlan.requestPatchChecksum || "");
    const boundaryEventId = mode === "native_applied" && requestPatchChecksum
        ? `pmcb_${digest([scope, exactSessionId, Math.max(0, Number(contextPlan.generation ?? nativePlan.generation ?? 0)), requestPatchChecksum, cumulative]).slice(0, 24)}`
        : "";
    const core = {
        schema: "ccm-provider-microcompact-receipt-v3",
        scope,
        scopeId,
        exactSessionId,
        generation: Math.max(0, Number(contextPlan.generation ?? nativePlan.generation ?? 0)),
        boundaryGeneration: Math.max(0, Number(contextPlan.boundaryGeneration ?? nativePlan.boundaryGeneration ?? 0)),
        payloadChecksum: String(contextPlan.canonicalPayloadChecksum || contextPlan.materializationCache?.keyChecksum || contextPlan.contextPlanChecksum || contextPlan.planChecksum || ""),
        provider: String(input.provider || contextPlan.provider || nativePlan.executor?.provider || ""),
        mode,
        baselineCacheDeletedTokens: baseline,
        cumulativeCacheDeletedTokens: cumulative,
        deletedTokensDelta: mode === "native_applied" ? delta : 0,
        clearedToolCallIds: Array.from(new Set([...(contextPlan.blockChanges?.deleted || []), ...(contextPlan.blockChanges?.replaced || [])].map(String).filter(Boolean))).slice(-128),
        ...(requestPatchChecksum ? { requestPatchChecksum } : {}),
        ...(boundaryEventId ? { boundaryEventId } : {}),
        providerOutcomeVerified,
        reason,
        recordedAt: input.recordedAt || new Date().toISOString(),
        contentStored: false,
    };
    let receipt = { ...core, checksum: digest(core) };
    const prior = readCcmProviderMicrocompactReceipt(scope, scopeId, exactSessionId);
    if (prior?.schema === "ccm-provider-microcompact-receipt-v3"
        && receipt.requestPatchChecksum
        && prior.requestPatchChecksum === receipt.requestPatchChecksum
        && prior.generation === receipt.generation
        && (prior.mode === "native_applied" || receipt.mode !== "native_applied")) {
        receipt = prior;
    }
    else {
        const file = fileOf(scope, scopeId, exactSessionId);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        (0, atomic_json_file_1.withFileLock)(file, () => (0, atomic_json_file_1.writeJsonAtomic)(file, receipt));
    }
    persistBoundaryEvent(receipt);
    return receipt;
}
//# sourceMappingURL=provider-microcompact.js.map