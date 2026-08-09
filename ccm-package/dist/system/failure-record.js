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
exports.FAILURE_RECORD_SCHEMA = void 0;
exports.classifyFailure = classifyFailure;
exports.normalizeFailureRecord = normalizeFailureRecord;
exports.recordFailure = recordFailure;
exports.listFailures = listFailures;
exports.markFailure = markFailure;
exports.runFailureRecordSelfTest = runFailureRecordSelfTest;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
exports.FAILURE_RECORD_SCHEMA = "ccm-failure-record-v1";
const STORE_FILE = path.join(process.env.CCM_FAILURE_RECORD_DIR || path.join(os.homedir(), ".cc-connect"), "failure-records.json");
function text(value, max = 500) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max); }
function list(value, max = 40) { return [...new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(item => text(item, 500)).filter(Boolean))].slice(0, max); }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function now() { return new Date().toISOString(); }
function readStore() {
    const fallback = { schema: exports.FAILURE_RECORD_SCHEMA, revision: 0, records: [] };
    const value = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, fallback);
    return { schema: exports.FAILURE_RECORD_SCHEMA, revision: Number(value?.revision || 0), records: Array.isArray(value?.records) ? value.records : [] };
}
function classifyFailure(input) {
    if (input?.failureType || input?.failure_type)
        return String(input.failureType || input.failure_type);
    const textValue = `${input?.status || ""} ${input?.reason || ""} ${input?.error || ""} ${input?.route || ""}`.toLowerCase();
    if (/auth|permission|credential|forbidden|unauthor/.test(textValue))
        return "authorization_failure";
    if (/timeout|environment|network|provider|service|missing credential/.test(textValue))
        return "environment_failure";
    if (/plan|dependency|scope|replan/.test(textValue))
        return "plan_failure";
    if (/resource|capacity|concurr|budget|quota/.test(textValue))
        return "resource_failure";
    if (/verify|test|accept|review|evidence|assert/.test(textValue))
        return "verification_failure";
    return "execution_failure";
}
function normalizeFailureRecord(input) {
    const createdAt = text(input?.createdAt || input?.created_at, 40) || now();
    const criterionIds = list(input?.criterionIds || input?.criterion_ids || input?.unresolvedCriteria || input?.unresolved_criteria);
    const repairScope = {
        allowedFiles: list(input?.repairScope?.allowedFiles || input?.allowedFiles || input?.allowed_files),
        forbiddenFiles: list(input?.repairScope?.forbiddenFiles || input?.forbiddenFiles || input?.forbidden_files),
        unresolvedCriteria: criterionIds,
    };
    const fingerprint = text(input?.fingerprint, 160) || hash({ taskId: input?.taskId || input?.task_id, workItemId: input?.workItemId || input?.work_item_id, type: classifyFailure(input), criteria: criterionIds, evidence: input?.observedEvidenceIds || input?.observed_evidence_ids });
    return {
        schema: exports.FAILURE_RECORD_SCHEMA,
        failureId: text(input?.failureId || input?.failure_id, 160) || `failure_${fingerprint.slice(0, 24)}`,
        taskId: text(input?.taskId || input?.task_id, 160),
        workItemId: text(input?.workItemId || input?.work_item_id, 160),
        criterionIds,
        failureType: classifyFailure(input),
        repairScope,
        observedEvidenceIds: list(input?.observedEvidenceIds || input?.observed_evidence_ids),
        recommendedAction: text(input?.recommendedAction || input?.recommended_action || input?.nextAction || input?.next_action, 800),
        attempt: Math.max(1, Number(input?.attempt || 1)),
        fingerprint,
        status: ["open", "repaired", "escalated", "ignored"].includes(String(input?.status)) ? input.status : "open",
        createdAt,
        updatedAt: text(input?.updatedAt || input?.updated_at, 40) || createdAt,
    };
}
function recordFailure(input) {
    const record = normalizeFailureRecord(input);
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        const same = store.records.filter(item => item.taskId === record.taskId && item.workItemId === record.workItemId && item.fingerprint === record.fingerprint && item.status === "open");
        if (same.length >= 2 && record.failureType !== "authorization_failure" && record.failureType !== "environment_failure") {
            record.failureType = "repeated_failure";
            record.status = "escalated";
        }
        const index = store.records.findIndex(item => item.failureId === record.failureId);
        if (index >= 0)
            store.records[index] = { ...store.records[index], ...record, updatedAt: now() };
        else
            store.records.push(record);
        store.records = store.records.slice(-5000);
        store.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
    });
    return record;
}
function listFailures(filter = {}) {
    return readStore().records.filter(item => Object.entries(filter).every(([key, value]) => value == null || value === "" || item[key] === value));
}
function markFailure(failureId, status) {
    let updated = null;
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        const index = store.records.findIndex(item => item.failureId === failureId);
        if (index < 0)
            return;
        updated = store.records[index] = { ...store.records[index], status, updatedAt: now() };
        store.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
    });
    return updated;
}
function runFailureRecordSelfTest() {
    const record = normalizeFailureRecord({ taskId: "t", workItemId: "w", reason: "npm test verification failed", unresolvedCriteria: ["AC-2"] });
    return { pass: record.failureType === "verification_failure" && record.repairScope.unresolvedCriteria.includes("AC-2"), record };
}
//# sourceMappingURL=failure-record.js.map