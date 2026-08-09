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
exports.EVIDENCE_STORE_FILE = exports.EVIDENCE_SCHEMA = void 0;
exports.captureRepoStateIdentity = captureRepoStateIdentity;
exports.repoStateFingerprint = repoStateFingerprint;
exports.compareRepoStateIdentity = compareRepoStateIdentity;
exports.normalizeEvidence = normalizeEvidence;
exports.recordEvidence = recordEvidence;
exports.listEvidence = listEvidence;
exports.refreshEvidence = refreshEvidence;
exports.refreshEvidenceForTask = refreshEvidenceForTask;
exports.buildAcceptanceEvaluation = buildAcceptanceEvaluation;
exports.runUnifiedEvidenceRegistrySelfTest = runUnifiedEvidenceRegistrySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const atomic_json_file_1 = require("../core/atomic-json-file");
/**
 * Shared, content-free evidence registry.
 *
 * The registry deliberately stores facts about an observation rather than the
 * command output or prompt that produced it.  Full output remains in the
 * current execution loop and is projected to this shape before persistence.
 */
exports.EVIDENCE_SCHEMA = "ccm-evidence-registry-v1";
exports.EVIDENCE_STORE_FILE = path.join(process.env.CCM_EVIDENCE_STORE_DIR || path.join(os.homedir(), ".cc-connect"), "evidence-registry.json");
function text(value, max = 500) {
    return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max);
}
function list(value, maxItems = 40, maxLength = 300) {
    const values = Array.isArray(value) ? value : value == null ? [] : [value];
    return [...new Set(values.map(item => text(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function runGit(worktree, args) {
    try {
        const result = (0, child_process_1.spawnSync)("git", ["-C", worktree, ...args], { encoding: "utf8", windowsHide: true, timeout: 15_000 });
        if (result.status !== 0)
            return "";
        return String(result.stdout || "").trim();
    }
    catch {
        return "";
    }
}
function fileHash(realWorkDir, declaredFiles) {
    const rows = declaredFiles.map(file => {
        const absolute = path.resolve(realWorkDir, file);
        try {
            const stat = fs.statSync(absolute);
            return { file: path.relative(realWorkDir, absolute).replace(/\\/g, "/"), size: stat.size, mtimeMs: stat.mtimeMs, hash: hash(fs.readFileSync(absolute)) };
        }
        catch {
            return { file: path.relative(realWorkDir, absolute).replace(/\\/g, "/"), missing: true };
        }
    });
    return hash(rows.sort((a, b) => a.file.localeCompare(b.file)));
}
function captureRepoStateIdentity(workDir, declaredFiles = []) {
    const resolved = path.resolve(String(workDir || process.cwd()));
    let realWorkDir = resolved;
    try {
        realWorkDir = fs.realpathSync(resolved);
    }
    catch { }
    const status = runGit(realWorkDir, ["status", "--porcelain=v1", "--untracked-files=all"]);
    const dirtyPatch = runGit(realWorkDir, ["diff", "--binary", "--no-ext-diff"]);
    return {
        realWorkDir,
        worktree: realWorkDir,
        gitHead: runGit(realWorkDir, ["rev-parse", "HEAD"]),
        gitTreeHash: runGit(realWorkDir, ["rev-parse", "HEAD^{tree}"]),
        gitStatusHash: hash(status),
        dirtyPatchHash: hash(dirtyPatch),
        declaredFileHash: fileHash(realWorkDir, list(declaredFiles, 200, 500)),
    };
}
function repoStateFingerprint(identity) {
    return hash(identity || null);
}
function compareRepoStateIdentity(expected, current) {
    if (!expected || !current)
        return "unknown";
    return repoStateFingerprint(expected) === repoStateFingerprint(current) ? "valid" : "stale";
}
function readRegistry() {
    const fallback = { schema: exports.EVIDENCE_SCHEMA, revision: 0, records: [] };
    const value = (0, atomic_json_file_1.readJsonWithBackup)(exports.EVIDENCE_STORE_FILE, fallback);
    return {
        schema: exports.EVIDENCE_SCHEMA,
        revision: Number(value?.revision || 0),
        records: Array.isArray(value?.records) ? value.records : [],
    };
}
function evidenceIdentity(input) {
    return hash({
        taskId: text(input?.taskId || input?.task_id, 160),
        workItemId: text(input?.workItemId || input?.work_item_id, 160),
        generation: Number(input?.generation || 0),
        attempt: Number(input?.attempt || 1),
        operationFingerprint: text(input?.operationFingerprint || input?.operation_fingerprint, 160),
        sourceChecksum: text(input?.sourceChecksum || input?.source_checksum, 160),
        subject: text(input?.subject || input?.command || input?.name, 300),
    });
}
function normalizeEvidence(input) {
    const now = new Date().toISOString();
    const identity = input?.repoStateIdentity || input?.repo_state_identity || null;
    const record = {
        schema: exports.EVIDENCE_SCHEMA,
        evidenceId: text(input?.evidenceId || input?.evidence_id, 160) || `ev_${evidenceIdentity(input).slice(0, 24)}`,
        evidenceType: (text(input?.evidenceType || input?.evidence_type, 40) || "command"),
        taskId: text(input?.taskId || input?.task_id, 160),
        workItemId: text(input?.workItemId || input?.work_item_id, 160),
        scope: text(input?.scope, 40),
        scopeId: text(input?.scopeId || input?.scope_id, 160),
        exactSessionId: text(input?.exactSessionId || input?.exact_session_id, 200),
        generation: Number(input?.generation || 0),
        attempt: Math.max(1, Number(input?.attempt || 1)),
        leaseId: text(input?.leaseId || input?.lease_id, 160),
        repoStateIdentity: identity && typeof identity === "object" ? {
            realWorkDir: text(identity.realWorkDir || identity.real_work_dir, 1000),
            worktree: text(identity.worktree, 1000),
            gitHead: text(identity.gitHead || identity.git_head, 160),
            gitTreeHash: text(identity.gitTreeHash || identity.git_tree_hash, 160),
            gitStatusHash: text(identity.gitStatusHash || identity.git_status_hash, 160),
            dirtyPatchHash: text(identity.dirtyPatchHash || identity.dirty_patch_hash, 160),
            declaredFileHash: text(identity.declaredFileHash || identity.declared_file_hash, 160),
        } : null,
        producerAgentId: text(input?.producerAgentId || input?.producer_agent_id || input?.agent, 200),
        operationFingerprint: text(input?.operationFingerprint || input?.operation_fingerprint, 160),
        status: (text(input?.status, 20) || "unknown"),
        subject: text(input?.subject || input?.command || input?.name, 300),
        references: list(input?.references || input?.refs || input?.filesChanged || input?.files_changed, 40, 500),
        // Never persist a raw tool result. Callers must provide a short, already
        // projected summary or a status/detail string.
        summary: text(input?.summary || input?.detail || input?.status, 800),
        tokenCount: Math.max(0, Number(input?.tokenCount || input?.token_count || 0)),
        createdAt: text(input?.createdAt || input?.created_at, 40) || now,
        expiresAt: text(input?.expiresAt || input?.expires_at, 40),
        sourceChecksum: text(input?.sourceChecksum || input?.source_checksum, 160) || hash({ subject: input?.subject, references: input?.references }),
        contentStored: false,
    };
    if (!["command", "diff", "test", "review", "artifact", "source"].includes(record.evidenceType))
        record.evidenceType = "command";
    if (!["valid", "stale", "invalid", "unknown"].includes(record.status))
        record.status = "unknown";
    if (!record.repoStateIdentity && record.status === "valid" && ["command", "diff", "test", "review", "artifact"].includes(record.evidenceType))
        record.status = "unknown";
    return record;
}
function recordEvidence(input) {
    const record = normalizeEvidence(input);
    (0, atomic_json_file_1.withFileLock)(exports.EVIDENCE_STORE_FILE, () => {
        const registry = readRegistry();
        const existingIndex = registry.records.findIndex(item => item.evidenceId === record.evidenceId || (item.taskId === record.taskId && item.workItemId === record.workItemId && evidenceIdentity(item) === evidenceIdentity(record)));
        if (existingIndex >= 0)
            registry.records[existingIndex] = { ...registry.records[existingIndex], ...record };
        else
            registry.records.push(record);
        registry.records = registry.records.slice(-5000);
        registry.revision += 1;
        (0, atomic_json_file_1.writeJsonAtomic)(exports.EVIDENCE_STORE_FILE, registry);
    });
    return record;
}
function listEvidence(filter = {}) {
    const records = readRegistry().records;
    return records.filter(item => {
        for (const [key, value] of Object.entries(filter || {})) {
            if (value === undefined || value === null || value === "")
                continue;
            const normalizedKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            if (item[normalizedKey] !== value)
                return false;
        }
        return true;
    });
}
function refreshEvidence(record, current) {
    return { ...record, status: compareRepoStateIdentity(record.repoStateIdentity, current) };
}
function refreshEvidenceForTask(task, current, options = {}) {
    const records = listEvidence({ taskId: task?.id });
    return records.map(item => {
        const refreshed = refreshEvidence(item, current);
        if (refreshed.status === "unknown" && options.strict)
            refreshed.status = "stale";
        return refreshed;
    });
}
function buildAcceptanceEvaluation(criteria, evidence) {
    const rows = (Array.isArray(criteria) ? criteria : []).map((criterion, index) => {
        const id = text(criterion?.criterionId || criterion?.criterion_id || criterion?.id, 160) || `AC-${index + 1}`;
        const required = list(criterion?.requiredEvidenceTypes || criterion?.required_evidence_types, 12, 40);
        const matches = evidence.filter(item => item.status === "valid" && (!required.length || required.includes(item.evidenceType)));
        const satisfied = criterion?.status === "satisfied" || criterion?.satisfied === true || matches.length > 0;
        return { criterionId: id, description: text(criterion?.description || criterion?.criterion, 500), requiredEvidenceTypes: required, status: satisfied ? "satisfied" : "pending", evidenceIds: matches.map(item => item.evidenceId) };
    });
    return { satisfied: rows.length > 0 && rows.every(item => item.status === "satisfied"), criteria: rows, evidenceIds: rows.flatMap(item => item.evidenceIds) };
}
function runUnifiedEvidenceRegistrySelfTest() {
    const identity = captureRepoStateIdentity(process.cwd(), ["package.json"]);
    const record = normalizeEvidence({ taskId: "t", workItemId: "w", evidenceType: "test", subject: "npm test", repoStateIdentity: identity, status: "valid" });
    const evaluation = buildAcceptanceEvaluation([{ id: "AC-1", requiredEvidenceTypes: ["test"] }], [record]);
    return { pass: record.schema === exports.EVIDENCE_SCHEMA && record.evidenceId && evaluation.satisfied && compareRepoStateIdentity(identity, identity) === "valid", record, evaluation };
}
//# sourceMappingURL=unified-evidence-registry.js.map