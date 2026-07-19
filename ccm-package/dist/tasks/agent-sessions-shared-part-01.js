"use strict";
// Behavior-freeze split from agent-sessions-shared.ts (part 1/2).
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
exports.STORE_LOCK_WAIT_ARRAY = exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES = exports.MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA = exports.MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS = exports.MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS = exports.MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS = exports.MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES = exports.MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT = exports.MEMORY_ENTRY_RENDER_LEASE_TTL_MS = exports.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION = exports.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS = exports.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS = exports.TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA = exports.TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA = exports.TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA = exports.TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA = exports.MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION = exports.MAX_SESSION_RECORDS = exports.MEMORY_CONTEXT_SNAPSHOT_DIR = exports.STORE_LOCK_RETRY_MS = exports.STORE_LOCK_STALE_MS = exports.STORE_LOCK_TIMEOUT_MS = exports.STORE_LOCK_FILE = exports.STORE_BACKUP_FILE = exports.STORE_FILE = void 0;
exports.emptyStore = emptyStore;
exports.loadStore = loadStore;
exports.saveStore = saveStore;
exports.createNativeSessionId = createNativeSessionId;
exports.safeStringify = safeStringify;
exports.hashValue = hashValue;
exports.safeReadJson = safeReadJson;
exports.writeJsonAtomic = writeJsonAtomic;
exports.sleepForStoreLock = sleepForStoreLock;
exports.processIsAlive = processIsAlive;
exports.readTaskAgentSessionStoreLock = readTaskAgentSessionStoreLock;
exports.removeStaleTaskAgentSessionStoreLock = removeStaleTaskAgentSessionStoreLock;
exports.acquireTaskAgentSessionStoreLock = acquireTaskAgentSessionStoreLock;
exports.releaseTaskAgentSessionStoreLock = releaseTaskAgentSessionStoreLock;
exports.withTaskAgentSessionStoreLock = withTaskAgentSessionStoreLock;
exports.safeFileSegment = safeFileSegment;
exports.getMemoryContextSnapshotDir = getMemoryContextSnapshotDir;
exports.getMemorySnapshotSyncCommitFile = getMemorySnapshotSyncCommitFile;
exports.collectMemoryContextGateIds = collectMemoryContextGateIds;
exports.normalizeMemorySnapshotRefs = normalizeMemorySnapshotRefs;
exports.purgeMemoryContextSnapshotsForSession = purgeMemoryContextSnapshotsForSession;
exports.collectMemoryContextConsumptionChallengeIdsFromSnapshotDir = collectMemoryContextConsumptionChallengeIdsFromSnapshotDir;
exports.normalizeSnapshotFileKey = normalizeSnapshotFileKey;
exports.pathIsInsideMemorySnapshotDir = pathIsInsideMemorySnapshotDir;
exports.listMemoryContextSnapshotFilesOnDisk = listMemoryContextSnapshotFilesOnDisk;
exports.verifyMemoryContextSnapshotChecksum = verifyMemoryContextSnapshotChecksum;
exports.memorySnapshotSyncChecksum = memorySnapshotSyncChecksum;
exports.verifyTaskAgentMemorySnapshotSyncDecision = verifyTaskAgentMemorySnapshotSyncDecision;
exports.memoryPromptInjectionProofChecksum = memoryPromptInjectionProofChecksum;
exports.renderedMemoryProjection = renderedMemoryProjection;
exports.verifyTaskAgentMemoryPromptInjectionProof = verifyTaskAgentMemoryPromptInjectionProof;
exports.createTaskAgentMemoryPromptInjectionProof = createTaskAgentMemoryPromptInjectionProof;
// Behavior-freeze shared store/types/helpers for agent-sessions.
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const runtime_1 = require("../agents/runtime");
const trusted_memory_prompt_envelope_1 = require("../agents/trusted-memory-prompt-envelope");
const memory_context_consumption_receipt_1 = require("../integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("../integrations/memory-context-consumption-recovery");
const utils_1 = require("../core/utils");
exports.STORE_FILE = path.join(utils_1.CCM_DIR, "task-agent-sessions.json");
exports.STORE_BACKUP_FILE = `${exports.STORE_FILE}.bak`;
exports.STORE_LOCK_FILE = `${exports.STORE_FILE}.lock`;
exports.STORE_LOCK_TIMEOUT_MS = 15_000;
exports.STORE_LOCK_STALE_MS = 60_000;
exports.STORE_LOCK_RETRY_MS = 20;
exports.MEMORY_CONTEXT_SNAPSHOT_DIR = path.join(utils_1.CCM_DIR, "task-agent-memory-context-snapshots");
exports.MAX_SESSION_RECORDS = 500;
exports.MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION = 20;
exports.TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA = "ccm-task-agent-memory-context-snapshot-v1";
exports.TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA = "ccm-task-agent-memory-snapshot-sync-v1";
exports.TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA = "ccm-task-agent-memory-snapshot-sync-commit-v1";
exports.TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA = "ccm-task-agent-memory-prompt-injection-proof-v1";
exports.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS = 30;
exports.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS = 45;
exports.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION = 5;
exports.MEMORY_ENTRY_RENDER_LEASE_TTL_MS = 120_000;
exports.MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT = 20;
exports.MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES = 2;
exports.MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS = 80;
exports.MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS = 240;
exports.MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS = 40;
exports.MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA = "ccm-task-agent-memory-entry-render-contention-v1";
exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES = 3;
function emptyStore() {
    return { version: 1, sessions: [] };
}
function loadStore() {
    try {
        if (!fs.existsSync(exports.STORE_FILE))
            return emptyStore();
        const parsed = JSON.parse(fs.readFileSync(exports.STORE_FILE, "utf-8"));
        return {
            version: 1,
            sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
        };
    }
    catch {
        try {
            const recovered = JSON.parse(fs.readFileSync(exports.STORE_BACKUP_FILE, "utf-8"));
            return { version: 1, sessions: Array.isArray(recovered?.sessions) ? recovered.sessions : [] };
        }
        catch {
            return emptyStore();
        }
    }
}
function saveStore(store) {
    fs.mkdirSync(path.dirname(exports.STORE_FILE), { recursive: true });
    const sessions = (store.sessions || [])
        .sort((a, b) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)))
        .slice(-exports.MAX_SESSION_RECORDS);
    const tmp = `${exports.STORE_FILE}.${process.pid}.tmp`;
    if (fs.existsSync(exports.STORE_FILE)) {
        try {
            JSON.parse(fs.readFileSync(exports.STORE_FILE, "utf-8"));
            fs.copyFileSync(exports.STORE_FILE, exports.STORE_BACKUP_FILE);
        }
        catch { }
    }
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, sessions }, null, 2), "utf-8");
    fs.renameSync(tmp, exports.STORE_FILE);
}
function createNativeSessionId(agentType) {
    return (0, runtime_1.normalizeAgentRuntimeId)(agentType) === "claudecode" ? crypto.randomUUID() : "";
}
function safeStringify(value) {
    const seen = new WeakSet();
    return JSON.stringify(value || {}, (_key, item) => {
        if (!item || typeof item !== "object")
            return item;
        if (seen.has(item))
            return "[Circular]";
        seen.add(item);
        return item;
    });
}
function hashValue(value, len = 24) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : safeStringify(value)).digest("hex").slice(0, len);
}
function safeReadJson(file, fallback = null) {
    try {
        if (!file || !fs.existsSync(file))
            return fallback;
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
    fs.renameSync(tmp, file);
}
exports.STORE_LOCK_WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));
function sleepForStoreLock(ms) {
    Atomics.wait(exports.STORE_LOCK_WAIT_ARRAY, 0, 0, Math.max(1, ms));
}
function processIsAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    if (pid === process.pid)
        return true;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error?.code === "EPERM";
    }
}
function readTaskAgentSessionStoreLock() {
    try {
        const parsed = JSON.parse(fs.readFileSync(exports.STORE_LOCK_FILE, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch {
        return null;
    }
}
function removeStaleTaskAgentSessionStoreLock(nowMs = Date.now()) {
    if (!fs.existsSync(exports.STORE_LOCK_FILE))
        return false;
    const current = readTaskAgentSessionStoreLock();
    let stale = false;
    if (current) {
        const expiresAt = Date.parse(String(current.expiresAt || ""));
        stale = !processIsAlive(Number(current.pid || 0)) || (Number.isFinite(expiresAt) && expiresAt <= nowMs);
    }
    else {
        try {
            stale = nowMs - fs.statSync(exports.STORE_LOCK_FILE).mtimeMs >= exports.STORE_LOCK_STALE_MS;
        }
        catch {
            stale = true;
        }
    }
    if (!stale)
        return false;
    try {
        fs.rmSync(exports.STORE_LOCK_FILE, { force: true });
        return true;
    }
    catch {
        return false;
    }
}
function acquireTaskAgentSessionStoreLock(timeoutMs = exports.STORE_LOCK_TIMEOUT_MS) {
    fs.mkdirSync(path.dirname(exports.STORE_LOCK_FILE), { recursive: true });
    const deadline = Date.now() + Math.max(1, timeoutMs);
    while (Date.now() <= deadline) {
        const acquiredAtMs = Date.now();
        const lock = {
            schema: "ccm-task-agent-session-store-lock-v1",
            token: crypto.randomBytes(16).toString("hex"),
            pid: process.pid,
            acquiredAt: new Date(acquiredAtMs).toISOString(),
            expiresAt: new Date(acquiredAtMs + exports.STORE_LOCK_STALE_MS).toISOString(),
        };
        try {
            const fd = fs.openSync(exports.STORE_LOCK_FILE, "wx", 0o600);
            try {
                fs.writeFileSync(fd, `${JSON.stringify(lock)}\n`, "utf-8");
                fs.fsyncSync(fd);
            }
            finally {
                fs.closeSync(fd);
            }
            return lock;
        }
        catch (error) {
            if (error?.code !== "EEXIST")
                throw error;
            removeStaleTaskAgentSessionStoreLock();
            sleepForStoreLock(exports.STORE_LOCK_RETRY_MS);
        }
    }
    const owner = readTaskAgentSessionStoreLock();
    throw new Error(`task Agent session store lock timeout${owner?.pid ? ` (owner pid ${owner.pid})` : ""}`);
}
function releaseTaskAgentSessionStoreLock(lock) {
    const current = readTaskAgentSessionStoreLock();
    if (!current || current.token !== lock.token || Number(current.pid || 0) !== process.pid)
        return false;
    try {
        fs.rmSync(exports.STORE_LOCK_FILE, { force: true });
        return true;
    }
    catch {
        return false;
    }
}
function withTaskAgentSessionStoreLock(operation) {
    const lock = acquireTaskAgentSessionStoreLock();
    try {
        return operation();
    }
    finally {
        releaseTaskAgentSessionStoreLock(lock);
    }
}
function safeFileSegment(value, fallback = "unknown") {
    const text = String(value || "").trim().replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
    return text || fallback;
}
function getMemoryContextSnapshotDir(sessionId) {
    return path.join(exports.MEMORY_CONTEXT_SNAPSHOT_DIR, safeFileSegment(sessionId, "session"));
}
function getMemorySnapshotSyncCommitFile(sessionId, snapshotId) {
    return path.join(getMemoryContextSnapshotDir(sessionId), `${safeFileSegment(snapshotId, "snapshot")}.sync.json`);
}
function collectMemoryContextGateIds(value, out = new Set()) {
    if (!value || typeof value !== "object")
        return out;
    const candidates = [
        value.dispatch_gate_id,
        value.dispatchGateId,
        value.reinjection_gate_id,
        value.reinjectionGateId,
        value.revalidation_gate_id,
        value.revalidationGateId,
        value.gate_id,
        value.gateId,
        value.marker_id,
        value.markerId,
    ];
    for (const candidate of candidates) {
        const text = String(candidate || "").trim();
        if (text)
            out.add(text);
    }
    for (const key of [
        "memory",
        "group_memory",
        "groupMemory",
        "global_agent_memory",
        "globalAgentMemory",
        "references",
        "worker_context_packet",
        "workerContextPacket",
        "memory_context",
        "memoryContext",
        "dispatch_freshness_gate",
        "global_memory_health_gate",
        "post_compact_reinjection_gate",
        "post_compact_dispatch_marker",
        "compact_file_reference_read_plan_revalidation_gate",
    ]) {
        collectMemoryContextGateIds(value[key], out);
    }
    if (Array.isArray(value.items)) {
        for (const item of value.items.slice(0, 80)) {
            const id = String(item?.id || item?.globalMemoryId || item?.global_memory_id || "").trim();
            if (id)
                out.add(id);
        }
    }
    if (Array.isArray(value.candidates)) {
        for (const item of value.candidates.slice(0, 80)) {
            const id = String(item?.candidate_id || item?.candidateId || "").trim();
            if (id)
                out.add(id);
        }
    }
    return out;
}
function normalizeMemorySnapshotRefs(value) {
    return (Array.isArray(value) ? value : []).map((item) => ({
        snapshotId: String(item?.snapshotId || item?.snapshot_id || "").trim(),
        snapshotPath: String(item?.snapshotPath || item?.snapshot_path || "").trim(),
        checksum: String(item?.checksum || item?.snapshotChecksum || item?.snapshot_checksum || "").trim(),
        workerContextPacketId: String(item?.workerContextPacketId || item?.worker_context_packet_id || "").trim(),
        workerHandoffId: String(item?.workerHandoffId || item?.worker_handoff_id || "").trim(),
        gateIds: Array.isArray(item?.gateIds || item?.gate_ids)
            ? (item.gateIds || item.gate_ids).map((id) => String(id || "").trim()).filter(Boolean).slice(0, 80)
            : [],
        deliveryReceiptId: String(item?.deliveryReceiptId || item?.delivery_receipt_id || "").trim(),
        deliveryReceiptPath: String(item?.deliveryReceiptPath || item?.delivery_receipt_path || "").trim(),
        deliveryReceiptChecksum: String(item?.deliveryReceiptChecksum || item?.delivery_receipt_checksum || "").trim(),
        deliveryStatus: String(item?.deliveryStatus || item?.delivery_status || "").trim(),
        deliveredAt: String(item?.deliveredAt || item?.delivered_at || "").trim(),
        latestDeliveryAttemptReceiptId: String(item?.latestDeliveryAttemptReceiptId || item?.latest_delivery_attempt_receipt_id || "").trim(),
        latestDeliveryAttemptReceiptPath: String(item?.latestDeliveryAttemptReceiptPath || item?.latest_delivery_attempt_receipt_path || "").trim(),
        latestDeliveryAttemptReceiptChecksum: String(item?.latestDeliveryAttemptReceiptChecksum || item?.latest_delivery_attempt_receipt_checksum || "").trim(),
        latestDeliveryAttemptStatus: String(item?.latestDeliveryAttemptStatus || item?.latest_delivery_attempt_status || "").trim(),
        latestDeliveryAttemptAt: String(item?.latestDeliveryAttemptAt || item?.latest_delivery_attempt_at || "").trim(),
        generatedAt: String(item?.generatedAt || item?.generated_at || "").trim(),
        memorySnapshotSyncAction: String(item?.memorySnapshotSyncAction || item?.memory_snapshot_sync_action || "").trim(),
        memorySnapshotSyncChecksum: String(item?.memorySnapshotSyncChecksum || item?.memory_snapshot_sync_checksum || "").trim(),
        memorySnapshotSyncedFromId: String(item?.memorySnapshotSyncedFromId || item?.memory_snapshot_synced_from_id || "").trim(),
        memorySnapshotSyncCommitPath: String(item?.memorySnapshotSyncCommitPath || item?.memory_snapshot_sync_commit_path || "").trim(),
        memorySnapshotSyncCommitChecksum: String(item?.memorySnapshotSyncCommitChecksum || item?.memory_snapshot_sync_commit_checksum || "").trim(),
        memorySnapshotSyncCommitStatus: String(item?.memorySnapshotSyncCommitStatus || item?.memory_snapshot_sync_commit_status || "").trim(),
        memorySnapshotSyncCommittedAt: String(item?.memorySnapshotSyncCommittedAt || item?.memory_snapshot_sync_committed_at || "").trim(),
    })).filter((item) => item.snapshotId || item.snapshotPath);
}
function purgeMemoryContextSnapshotsForSession(sessionId) {
    const dir = getMemoryContextSnapshotDir(sessionId);
    const challengeIds = collectMemoryContextConsumptionChallengeIdsFromSnapshotDir(dir);
    try {
        if (fs.existsSync(dir))
            fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    for (const challengeId of challengeIds)
        (0, memory_context_consumption_receipt_1.removeMemoryContextConsumptionReceiptIfUnreferenced)(challengeId);
    for (const challengeId of challengeIds)
        (0, memory_context_consumption_recovery_1.removeMemoryContextConsumptionRecoveryIfUnreferenced)(challengeId);
}
function collectMemoryContextConsumptionChallengeIdsFromSnapshotDir(dir) {
    const ids = new Set();
    try {
        if (!pathIsInsideMemorySnapshotDir(dir) || !fs.existsSync(dir))
            return ids;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.endsWith(".delivery.json") || entry.name.endsWith(".sync.json"))
                continue;
            const snapshot = safeReadJson(path.join(dir, entry.name), null);
            const challengeId = String(snapshot?.context?.memory_context_consumption_challenge?.challenge_id || "");
            if (/^mcrc_[a-f0-9]{28}$/.test(challengeId))
                ids.add(challengeId);
        }
    }
    catch { }
    return ids;
}
function normalizeSnapshotFileKey(file) {
    try {
        return path.resolve(String(file || "")).toLowerCase();
    }
    catch {
        return String(file || "").toLowerCase();
    }
}
function pathIsInsideMemorySnapshotDir(file) {
    try {
        const base = path.resolve(exports.MEMORY_CONTEXT_SNAPSHOT_DIR).toLowerCase();
        const target = path.resolve(file).toLowerCase();
        return target === base || target.startsWith(`${base}${path.sep}`);
    }
    catch {
        return false;
    }
}
function listMemoryContextSnapshotFilesOnDisk() {
    const files = [];
    try {
        if (!fs.existsSync(exports.MEMORY_CONTEXT_SNAPSHOT_DIR))
            return files;
        for (const entry of fs.readdirSync(exports.MEMORY_CONTEXT_SNAPSHOT_DIR, { withFileTypes: true })) {
            if (!entry.isDirectory())
                continue;
            const sessionDir = path.join(exports.MEMORY_CONTEXT_SNAPSHOT_DIR, entry.name);
            for (const fileEntry of fs.readdirSync(sessionDir, { withFileTypes: true })) {
                if (fileEntry.isFile() && fileEntry.name.endsWith(".json") && !fileEntry.name.endsWith(".delivery.json") && !fileEntry.name.endsWith(".sync.json")) {
                    files.push({ file: path.join(sessionDir, fileEntry.name), sessionId: entry.name });
                }
            }
        }
    }
    catch { }
    return files;
}
function verifyMemoryContextSnapshotChecksum(snapshot) {
    if (!snapshot || typeof snapshot !== "object")
        return false;
    const expected = String(snapshot.checksum || "").trim();
    if (!expected)
        return false;
    const payload = { ...snapshot };
    delete payload.checksum;
    delete payload.snapshot_file;
    if (hashValue(payload) === expected)
        return true;
    const aliasPayload = JSON.parse(JSON.stringify(payload));
    if (aliasPayload?.context?.worker_context_packet?.memory) {
        aliasPayload.context.memory_context = aliasPayload.context.worker_context_packet.memory;
        if (hashValue(aliasPayload) === expected)
            return true;
    }
    return false;
}
function memorySnapshotSyncChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.sync_checksum;
    delete payload.checksum_valid;
    delete payload.issues;
    return hashValue(payload, 64);
}
function verifyTaskAgentMemorySnapshotSyncDecision(decision, expected = {}) {
    const issues = [];
    const action = String(decision?.action || "");
    if (decision?.schema !== exports.TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA)
        issues.push("schema_invalid");
    if (!Number.isFinite(Number(decision?.version)) || Number(decision.version) !== 1)
        issues.push("version_invalid");
    if (!["initialize", "prompt_update", "none"].includes(action))
        issues.push("action_invalid");
    if (!String(decision?.sync_checksum || "") || memorySnapshotSyncChecksum(decision) !== String(decision.sync_checksum || ""))
        issues.push("checksum_invalid");
    const expectedBindings = [
        ["group_id", expected.groupId, decision?.group_id],
        ["group_session_id", expected.groupSessionId, decision?.group_session_id],
        ["task_id", expected.taskId, decision?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, decision?.task_agent_session_id],
        ["target_project", expected.targetProject, decision?.target_project],
        ["current_memory_context_checksum", expected.currentMemoryContextChecksum, decision?.current_memory_context_checksum],
    ];
    for (const [field, wanted, actual] of expectedBindings) {
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`${field}_mismatch`);
    }
    const previousId = String(decision?.previous_snapshot_id || "");
    const previousChecksum = String(decision?.previous_memory_context_checksum || "");
    const currentChecksum = String(decision?.current_memory_context_checksum || "");
    if (!currentChecksum)
        issues.push("current_memory_context_checksum_missing");
    if (action === "initialize" && previousId)
        issues.push("initialize_previous_snapshot_present");
    if (action === "none" && (!previousId || decision?.previous_snapshot_trusted !== true || !previousChecksum || previousChecksum !== currentChecksum)) {
        issues.push("none_without_trusted_equal_snapshot");
    }
    if (action === "none" && (decision?.previous_snapshot_committed !== true || !String(decision?.previous_sync_commit_checksum || ""))) {
        issues.push("none_without_committed_snapshot");
    }
    const continuationBaselineRequired = decision?.continuation_baseline_required === true;
    if (action === "none" && decision?.enforcement_required === true
        && decision?.full_memory_projection_injected !== true && !continuationBaselineRequired) {
        issues.push("none_without_injection_or_continuation");
    }
    if (action === "none" && continuationBaselineRequired && decision?.continuation_baseline_eligible !== true)
        issues.push("none_without_continuation_baseline");
    if (action === "none" && continuationBaselineRequired && (!String(decision?.continuation_native_session_id || "") || !String(decision?.continuation_provider || ""))) {
        issues.push("continuation_baseline_identity_missing");
    }
    if (action === "none" && continuationBaselineRequired && (!String(decision?.continuation_delivery_receipt_id || "") || !String(decision?.continuation_delivery_receipt_checksum || ""))) {
        issues.push("continuation_baseline_receipt_missing");
    }
    if (action === "prompt_update" && previousId && decision?.previous_snapshot_trusted === true && previousChecksum === currentChecksum
        && String(decision?.reason || "") !== "continuation_baseline_unavailable") {
        issues.push("prompt_update_without_change");
    }
    const previousGroupSessionId = String(decision?.previous_group_session_id || "");
    const currentGroupSessionId = String(decision?.group_session_id || "");
    if (previousGroupSessionId.startsWith("gcs_") && currentGroupSessionId.startsWith("gcs_") && previousGroupSessionId !== currentGroupSessionId) {
        issues.push("group_session_mismatch");
    }
    return { valid: issues.length === 0, issues, action };
}
function memoryPromptInjectionProofChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.proof_checksum;
    delete payload.checksum_valid;
    delete payload.issues;
    return hashValue(payload, 64);
}
function renderedMemoryProjection(memoryContext, explicit = undefined) {
    if (explicit !== undefined)
        return { text: String(explicit || ""), source: "explicit_rendered_memory_context" };
    const groupMemory = memoryContext?.schema === "ccm-group-memory-context-v1"
        ? memoryContext
        : memoryContext?.group_memory?.schema === "ccm-group-memory-context-v1"
            ? memoryContext.group_memory
            : null;
    const rendered = String(groupMemory?.rendered_text || groupMemory?.renderedText || "");
    return { text: rendered, source: rendered ? "group_memory_rendered_text" : "unavailable" };
}
function verifyTaskAgentMemoryPromptInjectionProof(proof, expected = {}) {
    const issues = [];
    if (proof?.schema !== exports.TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA)
        issues.push("schema_invalid");
    if (Number(proof?.version || 0) !== 1)
        issues.push("version_invalid");
    if (!String(proof?.proof_checksum || "") || memoryPromptInjectionProofChecksum(proof) !== String(proof.proof_checksum || ""))
        issues.push("checksum_invalid");
    const bindings = [
        ["group_id", expected.groupId, proof?.group_id],
        ["group_session_id", expected.groupSessionId, proof?.group_session_id],
        ["task_id", expected.taskId, proof?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, proof?.task_agent_session_id],
        ["target_project", expected.targetProject, proof?.target_project],
        ["memory_context_checksum", expected.memoryContextChecksum, proof?.memory_context_checksum],
        ["sync_checksum", expected.syncChecksum, proof?.sync_checksum],
        ["rendered_prompt_checksum", expected.renderedPromptChecksum, proof?.rendered_prompt_checksum],
    ];
    for (const [field, wanted, actual] of bindings) {
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`${field}_mismatch`);
    }
    const projectionPresent = proof?.projection_present === true;
    const promptBound = proof?.prompt_bound === true;
    const injectionRequired = proof?.memory_injection_required === true;
    const enforcementRequired = proof?.enforcement_required === true;
    const trustedEnvelopeRequired = proof?.trusted_envelope_required === true;
    const trustedEnvelopePresent = proof?.trusted_envelope_present === true;
    const trustedEnvelopeValid = proof?.trusted_envelope_valid === true;
    const trustedEnvelopeBound = proof?.trusted_envelope_bound === true;
    if (promptBound && !projectionPresent)
        issues.push("prompt_bound_without_projection");
    if (projectionPresent && (!String(proof?.rendered_memory_checksum || "") || Number(proof?.rendered_memory_chars || 0) <= 0))
        issues.push("projection_evidence_missing");
    if (trustedEnvelopeValid && !trustedEnvelopePresent)
        issues.push("trusted_envelope_valid_without_presence");
    if (trustedEnvelopeBound && (!trustedEnvelopeValid || !projectionPresent))
        issues.push("trusted_envelope_bound_without_valid_projection");
    if (trustedEnvelopePresent && (!String(proof?.trusted_envelope_checksum || "") || !String(proof?.trusted_envelope_source_checksum || "") || Number(proof?.trusted_envelope_chars || 0) <= 0)) {
        issues.push("trusted_envelope_evidence_missing");
    }
    if (trustedEnvelopeRequired && trustedEnvelopePresent && !trustedEnvelopeValid)
        issues.push("trusted_envelope_invalid");
    if (trustedEnvelopeRequired && injectionRequired && !trustedEnvelopeBound)
        issues.push("required_trusted_envelope_unbound");
    if (trustedEnvelopeRequired && promptBound !== trustedEnvelopeBound)
        issues.push("prompt_binding_not_trusted_envelope_bound");
    if (enforcementRequired && injectionRequired && !promptBound)
        issues.push("required_projection_unbound");
    if (!String(proof?.sync_checksum || "") || !String(proof?.memory_context_checksum || "") || !String(proof?.rendered_prompt_checksum || ""))
        issues.push("binding_missing");
    return {
        valid: issues.length === 0,
        issues,
        promptBound,
        projectionPresent,
        injectionRequired,
        enforcementRequired,
        trustedEnvelopeRequired,
        trustedEnvelopePresent,
        trustedEnvelopeValid,
        trustedEnvelopeBound,
        deliveryReady: !enforcementRequired || !injectionRequired || (promptBound && (!trustedEnvelopeRequired || trustedEnvelopeBound)),
        status: String(proof?.status || ""),
    };
}
function createTaskAgentMemoryPromptInjectionProof(input) {
    const projection = renderedMemoryProjection(input.memoryContext, input.renderedMemoryContext);
    const projectionPresent = !!projection.text;
    const expectedSourceChecksum = (0, trusted_memory_prompt_envelope_1.trustedMemorySourceChecksum)(input.memoryContext || {});
    const trustedEnvelope = (0, trusted_memory_prompt_envelope_1.verifyTrustedMemoryPromptEnvelope)(String(input.renderedPrompt || ""), {
        ...(projectionPresent ? { projection: projection.text } : {}),
        sourceChecksum: expectedSourceChecksum,
    });
    const trustedEnvelopeRequired = input.trustedEnvelopeRequired === true;
    const trustedEnvelopeBound = projectionPresent && trustedEnvelope.valid;
    const promptBound = projectionPresent && (trustedEnvelopeRequired
        ? trustedEnvelopeBound
        : String(input.renderedPrompt || "").includes(projection.text));
    const injectionRequired = input.memorySnapshotSync?.memory_injection_required === true;
    const enforcementRequired = input.enforcementRequired === true;
    const status = !projectionPresent
        ? injectionRequired ? "projection_unavailable" : "continuation_baseline"
        : promptBound
            ? injectionRequired ? "injected" : "redundant_full_injection"
            : injectionRequired ? "projection_missing_from_prompt" : "continuation_baseline";
    const payload = {
        schema: exports.TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA,
        version: 1,
        status,
        group_id: input.session.groupId,
        group_session_id: String(input.groupSessionMemoryBinding?.groupSessionId || ""),
        task_id: input.session.taskId,
        task_agent_session_id: input.session.id,
        target_project: input.session.project,
        sync_checksum: String(input.memorySnapshotSync?.sync_checksum || ""),
        sync_action: String(input.memorySnapshotSync?.action || ""),
        memory_context_checksum: input.memoryContextChecksum,
        memory_injection_required: injectionRequired,
        enforcement_required: enforcementRequired,
        trusted_envelope_required: trustedEnvelopeRequired,
        trusted_envelope_present: trustedEnvelope.present,
        trusted_envelope_valid: trustedEnvelope.valid,
        trusted_envelope_bound: trustedEnvelopeBound,
        trusted_envelope_checksum: trustedEnvelope.contentChecksum,
        trusted_envelope_source_checksum: trustedEnvelope.sourceChecksum,
        trusted_envelope_chars: trustedEnvelope.contentChars,
        trusted_envelope_issues: trustedEnvelope.issues,
        projection_source: projection.source,
        projection_present: projectionPresent,
        rendered_memory_checksum: projectionPresent ? hashValue(projection.text, 64) : "",
        rendered_memory_chars: projection.text.length,
        rendered_prompt_checksum: hashValue(String(input.renderedPrompt || "")),
        prompt_bound: promptBound,
        checked_at: input.generatedAt,
    };
    const proof = { ...payload, proof_checksum: memoryPromptInjectionProofChecksum(payload) };
    const verification = verifyTaskAgentMemoryPromptInjectionProof(proof, {
        groupId: input.session.groupId,
        groupSessionId: String(input.groupSessionMemoryBinding?.groupSessionId || ""),
        taskId: input.session.taskId,
        taskAgentSessionId: input.session.id,
        targetProject: input.session.project,
        memoryContextChecksum: input.memoryContextChecksum,
        syncChecksum: String(input.memorySnapshotSync?.sync_checksum || ""),
        renderedPromptChecksum: hashValue(String(input.renderedPrompt || "")),
    });
    if (!verification.valid) {
        const error = new Error(`task Agent memory prompt injection proof invalid: ${verification.issues.join(",")}`);
        error.code = "TASK_AGENT_MEMORY_PROMPT_INJECTION_REQUIRED";
        error.issues = verification.issues;
        throw error;
    }
    return proof;
}
//# sourceMappingURL=agent-sessions-shared-part-01.js.map