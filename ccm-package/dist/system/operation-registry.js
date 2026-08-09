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
exports.OPERATION_REGISTRY_SCHEMA = void 0;
exports.buildOperationFingerprint = buildOperationFingerprint;
exports.reserveOperation = reserveOperation;
exports.completeOperation = completeOperation;
exports.findReusableOperation = findReusableOperation;
exports.attachOperationEvidence = attachOperationEvidence;
exports.runOperationRegistrySelfTest = runOperationRegistrySelfTest;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
exports.OPERATION_REGISTRY_SCHEMA = "ccm-operation-registry-v1";
const STORE_FILE = path.join(process.env.CCM_OPERATION_REGISTRY_DIR || path.join(os.homedir(), ".cc-connect"), "operation-registry.json");
function text(value, max = 500) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max); }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function now() { return new Date().toISOString(); }
function readStore() {
    const fallback = { schema: exports.OPERATION_REGISTRY_SCHEMA, revision: 0, records: [] };
    const value = (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, fallback);
    return { schema: exports.OPERATION_REGISTRY_SCHEMA, revision: Number(value?.revision || 0), records: Array.isArray(value?.records) ? value.records : [] };
}
function buildOperationFingerprint(input) {
    const operationType = text(input?.operationType || input?.operation_type || "read", 40).toLowerCase();
    const normalizedArguments = normalizeArguments(input?.normalizedArguments || input?.normalized_arguments || input?.arguments || {});
    return hash({
        operationType,
        normalizedArguments,
        scope: text(input?.scope, 80),
        target: text(input?.target, 1000),
        repoStateFingerprint: text(input?.repoStateFingerprint || input?.repo_state_fingerprint, 160),
        toolVersion: text(input?.toolVersion || input?.tool_version, 120),
        estimatorVersion: text(input?.estimatorVersion || input?.estimator_version, 120),
    });
}
function normalizeArguments(value) {
    if (Array.isArray(value))
        return value.map(normalizeArguments);
    if (!value || typeof value !== "object")
        return typeof value === "string" ? text(value, 1000) : value;
    const output = {};
    for (const key of Object.keys(value).sort()) {
        if (["content", "text", "body", "rawOutput", "context", "prompt", "result"].includes(key))
            continue;
        output[key] = normalizeArguments(value[key]);
    }
    return output;
}
function reserveOperation(input) {
    const createdAt = now();
    const operationType = text(input?.operationType || input?.operation_type || "read", 40).toLowerCase();
    const fingerprint = text(input?.fingerprint, 160) || buildOperationFingerprint(input);
    const existing = readStore().records.find(item => item.fingerprint === fingerprint && item.status === "succeeded");
    if (existing && operationType !== "side_effecting" && (!existing.expiresAt || Date.parse(existing.expiresAt) >= Date.now()))
        return { record: existing, reused: true };
    const record = {
        schema: exports.OPERATION_REGISTRY_SCHEMA,
        operationId: text(input?.operationId || input?.operation_id, 160) || `op_${fingerprint.slice(0, 24)}`,
        operationType,
        fingerprint,
        normalizedArguments: normalizeArguments(input?.normalizedArguments || input?.normalized_arguments || input?.arguments || {}),
        scope: text(input?.scope, 80),
        target: text(input?.target, 1000),
        repoStateFingerprint: text(input?.repoStateFingerprint || input?.repo_state_fingerprint, 160),
        toolVersion: text(input?.toolVersion || input?.tool_version, 120),
        estimatorVersion: text(input?.estimatorVersion || input?.estimator_version, 120),
        evidenceIds: [],
        status: "running",
        createdAt,
        updatedAt: createdAt,
        expiresAt: text(input?.expiresAt || input?.expires_at, 40),
    };
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        const duplicate = store.records.find(item => item.fingerprint === fingerprint && item.status === "running");
        if (!duplicate)
            store.records.push(record);
        store.revision += 1;
        store.records = store.records.slice(-5000);
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
    });
    return { record, reused: false };
}
function completeOperation(operationId, input = {}) {
    let updated = null;
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        const index = store.records.findIndex(item => item.operationId === operationId);
        if (index < 0)
            return;
        updated = store.records[index] = { ...store.records[index], status: input.status || "succeeded", evidenceIds: Array.from(new Set((input.evidenceIds || []).map(String).filter(Boolean))), updatedAt: now() };
        store.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
    });
    return updated;
}
function findReusableOperation(input) {
    const fingerprint = text(input?.fingerprint, 160) || buildOperationFingerprint(input);
    const record = readStore().records.find(item => item.fingerprint === fingerprint && item.status === "succeeded");
    if (!record || record.operationType === "side_effecting")
        return null;
    if (record.expiresAt && Date.parse(record.expiresAt) < Date.now())
        return null;
    return record;
}
function attachOperationEvidence(operationId, evidence) {
    const evidenceId = typeof evidence === "string" ? evidence : evidence.evidenceId;
    return completeOperation(operationId, { evidenceIds: [evidenceId], status: "succeeded" });
}
function runOperationRegistrySelfTest() {
    const input = { operationType: "test", arguments: { command: "npm test", result: "secret output" }, scope: "project", target: "demo", repoStateFingerprint: "abc" };
    const first = reserveOperation(input);
    completeOperation(first.record.operationId);
    const reused = findReusableOperation(input);
    return { pass: !!reused && reused.operationId === first.record.operationId && !JSON.stringify(reused).includes("secret output"), first, reused };
}
//# sourceMappingURL=operation-registry.js.map