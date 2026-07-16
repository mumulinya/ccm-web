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
exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES = void 0;
exports.verifyTaskAgentMemorySnapshotSyncDecision = verifyTaskAgentMemorySnapshotSyncDecision;
exports.verifyTaskAgentMemoryPromptInjectionProof = verifyTaskAgentMemoryPromptInjectionProof;
exports.verifyTaskAgentMemorySnapshotSyncCommit = verifyTaskAgentMemorySnapshotSyncCommit;
exports.verifyMemoryContextDeliveryReceiptChecksum = verifyMemoryContextDeliveryReceiptChecksum;
exports.openTaskAgentSession = openTaskAgentSession;
exports.recordTaskAgentSessionTurn = recordTaskAgentSessionTurn;
exports.verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker = verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker;
exports.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker = inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker;
exports.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome = recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome;
exports.prepareTaskAgentMemoryEntrySyncContext = prepareTaskAgentMemoryEntrySyncContext;
exports.verifyTaskAgentMemoryEntryRenderContentionReceipt = verifyTaskAgentMemoryEntryRenderContentionReceipt;
exports.prepareTaskAgentMemoryEntrySyncContextWithRetry = prepareTaskAgentMemoryEntrySyncContextWithRetry;
exports.bindTaskAgentMemoryContextSnapshot = bindTaskAgentMemoryContextSnapshot;
exports.attachTaskAgentFinalDispatchPayloadGate = attachTaskAgentFinalDispatchPayloadGate;
exports.recordTaskAgentMemoryContextDelivery = recordTaskAgentMemoryContextDelivery;
exports.readTaskAgentMemoryContextDeliveryReceipt = readTaskAgentMemoryContextDeliveryReceipt;
exports.advanceTaskAgentSession = advanceTaskAgentSession;
exports.closeTaskAgentSessions = closeTaskAgentSessions;
exports.reopenTaskAgentSessions = reopenTaskAgentSessions;
exports.getTaskAgentSessionOptions = getTaskAgentSessionOptions;
exports.getTaskAgentSessionContinuity = getTaskAgentSessionContinuity;
exports.listTaskAgentSessions = listTaskAgentSessions;
exports.markTaskAgentSessionsForCapacityDowngrade = markTaskAgentSessionsForCapacityDowngrade;
exports.verifyTaskAgentSessionCapacityRevalidationProof = verifyTaskAgentSessionCapacityRevalidationProof;
exports.verifyTaskAgentSessionCapacityRevalidationCommitReceipt = verifyTaskAgentSessionCapacityRevalidationCommitReceipt;
exports.prepareTaskAgentSessionCapacityRevalidation = prepareTaskAgentSessionCapacityRevalidation;
exports.commitTaskAgentSessionCapacityRevalidation = commitTaskAgentSessionCapacityRevalidation;
exports.acknowledgeTaskAgentSessionCapacityRevalidation = acknowledgeTaskAgentSessionCapacityRevalidation;
exports.runTaskAgentSessionModelIdentitySelfTest = runTaskAgentSessionModelIdentitySelfTest;
exports.listTaskAgentMemoryContextSnapshots = listTaskAgentMemoryContextSnapshots;
exports.buildTaskAgentMemoryContextSnapshotInventory = buildTaskAgentMemoryContextSnapshotInventory;
exports.pruneTaskAgentMemoryContextSnapshots = pruneTaskAgentMemoryContextSnapshots;
exports.purgeTaskAgentSessions = purgeTaskAgentSessions;
exports.reconcileTaskAgentSessions = reconcileTaskAgentSessions;
exports.shouldCloseTaskAgentSessions = shouldCloseTaskAgentSessions;
exports.runTaskAgentSessionSelfTest = runTaskAgentSessionSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const runtime_1 = require("../agents/runtime");
const final_dispatch_payload_gate_1 = require("../agents/final-dispatch-payload-gate");
const final_dispatch_reactive_compact_1 = require("../agents/final-dispatch-reactive-compact");
const native_continuation_1 = require("../agents/native-continuation");
const trusted_memory_prompt_envelope_1 = require("../agents/trusted-memory-prompt-envelope");
const provider_memory_channel_1 = require("../agents/provider-memory-channel");
const memory_context_consumption_receipt_1 = require("../integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("../integrations/memory-context-consumption-recovery");
const utils_1 = require("../core/utils");
const group_post_turn_summary_1 = require("../modules/collaboration/group-post-turn-summary");
const group_memory_compaction_1 = require("../modules/collaboration/group-memory-compaction");
const group_compact_head_1 = require("../modules/collaboration/group-compact-head");
const group_session_lifecycle_head_1 = require("../modules/collaboration/group-session-lifecycle-head");
const task_agent_invocation_lineage_1 = require("./task-agent-invocation-lineage");
const task_agent_continuation_soak_1 = require("./task-agent-continuation-soak");
const task_agent_memory_transport_usage_1 = require("./task-agent-memory-transport-usage");
const task_agent_memory_entry_sync_1 = require("./task-agent-memory-entry-sync");
const STORE_FILE = path.join(utils_1.CCM_DIR, "task-agent-sessions.json");
const STORE_BACKUP_FILE = `${STORE_FILE}.bak`;
const STORE_LOCK_FILE = `${STORE_FILE}.lock`;
const STORE_LOCK_TIMEOUT_MS = 15_000;
const STORE_LOCK_STALE_MS = 60_000;
const STORE_LOCK_RETRY_MS = 20;
const MEMORY_CONTEXT_SNAPSHOT_DIR = path.join(utils_1.CCM_DIR, "task-agent-memory-context-snapshots");
const MAX_SESSION_RECORDS = 500;
const MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION = 20;
const TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA = "ccm-task-agent-memory-context-snapshot-v1";
const TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA = "ccm-task-agent-memory-snapshot-sync-v1";
const TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA = "ccm-task-agent-memory-snapshot-sync-commit-v1";
const TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA = "ccm-task-agent-memory-prompt-injection-proof-v1";
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS = 30;
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS = 45;
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION = 5;
const MEMORY_ENTRY_RENDER_LEASE_TTL_MS = 120_000;
const MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT = 20;
const MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES = 2;
const MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS = 80;
const MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS = 240;
const MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS = 40;
const MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA = "ccm-task-agent-memory-entry-render-contention-v1";
exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES = 3;
function emptyStore() {
    return { version: 1, sessions: [] };
}
function loadStore() {
    try {
        if (!fs.existsSync(STORE_FILE))
            return emptyStore();
        const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
        return {
            version: 1,
            sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
        };
    }
    catch {
        try {
            const recovered = JSON.parse(fs.readFileSync(STORE_BACKUP_FILE, "utf-8"));
            return { version: 1, sessions: Array.isArray(recovered?.sessions) ? recovered.sessions : [] };
        }
        catch {
            return emptyStore();
        }
    }
}
function saveStore(store) {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    const sessions = (store.sessions || [])
        .sort((a, b) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)))
        .slice(-MAX_SESSION_RECORDS);
    const tmp = `${STORE_FILE}.${process.pid}.tmp`;
    if (fs.existsSync(STORE_FILE)) {
        try {
            JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
            fs.copyFileSync(STORE_FILE, STORE_BACKUP_FILE);
        }
        catch { }
    }
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, sessions }, null, 2), "utf-8");
    fs.renameSync(tmp, STORE_FILE);
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
const STORE_LOCK_WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));
function sleepForStoreLock(ms) {
    Atomics.wait(STORE_LOCK_WAIT_ARRAY, 0, 0, Math.max(1, ms));
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
        const parsed = JSON.parse(fs.readFileSync(STORE_LOCK_FILE, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch {
        return null;
    }
}
function removeStaleTaskAgentSessionStoreLock(nowMs = Date.now()) {
    if (!fs.existsSync(STORE_LOCK_FILE))
        return false;
    const current = readTaskAgentSessionStoreLock();
    let stale = false;
    if (current) {
        const expiresAt = Date.parse(String(current.expiresAt || ""));
        stale = !processIsAlive(Number(current.pid || 0)) || (Number.isFinite(expiresAt) && expiresAt <= nowMs);
    }
    else {
        try {
            stale = nowMs - fs.statSync(STORE_LOCK_FILE).mtimeMs >= STORE_LOCK_STALE_MS;
        }
        catch {
            stale = true;
        }
    }
    if (!stale)
        return false;
    try {
        fs.rmSync(STORE_LOCK_FILE, { force: true });
        return true;
    }
    catch {
        return false;
    }
}
function acquireTaskAgentSessionStoreLock(timeoutMs = STORE_LOCK_TIMEOUT_MS) {
    fs.mkdirSync(path.dirname(STORE_LOCK_FILE), { recursive: true });
    const deadline = Date.now() + Math.max(1, timeoutMs);
    while (Date.now() <= deadline) {
        const acquiredAtMs = Date.now();
        const lock = {
            schema: "ccm-task-agent-session-store-lock-v1",
            token: crypto.randomBytes(16).toString("hex"),
            pid: process.pid,
            acquiredAt: new Date(acquiredAtMs).toISOString(),
            expiresAt: new Date(acquiredAtMs + STORE_LOCK_STALE_MS).toISOString(),
        };
        try {
            const fd = fs.openSync(STORE_LOCK_FILE, "wx", 0o600);
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
            sleepForStoreLock(STORE_LOCK_RETRY_MS);
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
        fs.rmSync(STORE_LOCK_FILE, { force: true });
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
    return path.join(MEMORY_CONTEXT_SNAPSHOT_DIR, safeFileSegment(sessionId, "session"));
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
        const base = path.resolve(MEMORY_CONTEXT_SNAPSHOT_DIR).toLowerCase();
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
        if (!fs.existsSync(MEMORY_CONTEXT_SNAPSHOT_DIR))
            return files;
        for (const entry of fs.readdirSync(MEMORY_CONTEXT_SNAPSHOT_DIR, { withFileTypes: true })) {
            if (!entry.isDirectory())
                continue;
            const sessionDir = path.join(MEMORY_CONTEXT_SNAPSHOT_DIR, entry.name);
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
    if (decision?.schema !== TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA)
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
    if (proof?.schema !== TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA)
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
        schema: TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA,
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
function memorySnapshotSyncCommitChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.commit_checksum;
    delete payload.commit_file;
    delete payload.checksum_valid;
    delete payload.issues;
    return hashValue(payload, 64);
}
function verifyTaskAgentMemorySnapshotSyncCommit(commit, expected = {}) {
    const issues = [];
    if (commit?.schema !== TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA)
        issues.push("schema_invalid");
    if (Number(commit?.version || 0) !== 1)
        issues.push("version_invalid");
    if (!String(commit?.commit_checksum || "") || memorySnapshotSyncCommitChecksum(commit) !== String(commit.commit_checksum || ""))
        issues.push("checksum_invalid");
    const bindings = [
        ["group_id", expected.groupId, commit?.group_id],
        ["group_session_id", expected.groupSessionId, commit?.group_session_id],
        ["task_id", expected.taskId, commit?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, commit?.task_agent_session_id],
        ["target_project", expected.targetProject, commit?.target_project],
        ["snapshot_id", expected.snapshotId, commit?.snapshot_id],
        ["snapshot_checksum", expected.snapshotChecksum, commit?.snapshot_checksum],
        ["sync_checksum", expected.syncChecksum, commit?.sync_checksum],
        ["sync_action", expected.syncAction, commit?.sync_action],
        ["memory_prompt_injection_proof_checksum", expected.memoryPromptInjectionProofChecksum, commit?.memory_prompt_injection_proof_checksum],
        ["delivery_receipt_id", expected.deliveryReceiptId, commit?.delivery_receipt_id],
        ["delivery_receipt_checksum", expected.deliveryReceiptChecksum, commit?.delivery_receipt_checksum],
    ];
    for (const [field, wanted, actual] of bindings) {
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`${field}_mismatch`);
    }
    const status = String(commit?.status || "");
    if (!["committed", "rejected"].includes(status))
        issues.push("status_invalid");
    if (status === "committed" && commit?.committed !== true)
        issues.push("committed_flag_missing");
    if (status === "rejected" && commit?.committed === true)
        issues.push("rejected_marked_committed");
    if (commit?.committed === true && String(commit?.delivery_status || "") !== "delivered")
        issues.push("delivery_not_committed");
    if (commit?.committed === true && (!String(commit?.delivery_receipt_id || "") || !String(commit?.delivery_receipt_checksum || "")))
        issues.push("delivery_receipt_missing");
    if (commit?.committed === true && !String(commit?.memory_prompt_injection_proof_checksum || ""))
        issues.push("memory_prompt_injection_proof_missing");
    if (!String(commit?.snapshot_id || "") || !String(commit?.snapshot_checksum || "") || !String(commit?.sync_checksum || ""))
        issues.push("snapshot_binding_missing");
    return { valid: issues.length === 0, issues, committed: commit?.committed === true, status };
}
function createTaskAgentMemorySnapshotSyncDecision(input) {
    const groupSessionId = String(input.groupSessionMemoryBinding?.groupSessionId || "").trim();
    const boundGroupSessionId = String(input.session.groupSessionId || "").trim();
    if (boundGroupSessionId.startsWith("gcs_") && groupSessionId.startsWith("gcs_") && boundGroupSessionId !== groupSessionId) {
        const error = new Error(`task Agent memory snapshot cannot cross group sessions: ${boundGroupSessionId} -> ${groupSessionId}`);
        error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
        throw error;
    }
    const previousRef = input.refs.length ? input.refs[input.refs.length - 1] : null;
    const previousSnapshot = previousRef?.snapshotPath ? safeReadJson(previousRef.snapshotPath, null) : null;
    const previousSnapshotOuterTrusted = !!previousSnapshot
        && previousSnapshot.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA
        && verifyMemoryContextSnapshotChecksum(previousSnapshot)
        && String(previousSnapshot?.session?.id || "") === input.session.id
        && String(previousSnapshot?.session?.group_id || "") === input.session.groupId
        && String(previousSnapshot?.session?.task_id || "") === input.session.taskId
        && String(previousSnapshot?.session?.project || "") === input.session.project;
    const previousSnapshotSync = previousSnapshot?.context?.memory_snapshot_sync || null;
    const previousSnapshotSyncVerification = previousSnapshotOuterTrusted
        ? verifyTaskAgentMemorySnapshotSyncDecision(previousSnapshotSync, {
            groupId: input.session.groupId,
            groupSessionId: String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || ""),
            taskId: input.session.taskId,
            taskAgentSessionId: input.session.id,
            targetProject: input.session.project,
            currentMemoryContextChecksum: String(previousSnapshot?.context?.memory_context_checksum || ""),
        })
        : { valid: false };
    const previousMemoryPromptInjectionProof = previousSnapshot?.context?.memory_prompt_injection_proof || null;
    const previousMemoryPromptInjectionVerification = previousSnapshotOuterTrusted && previousSnapshotSyncVerification.valid === true
        ? verifyTaskAgentMemoryPromptInjectionProof(previousMemoryPromptInjectionProof, {
            groupId: input.session.groupId,
            groupSessionId: String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || ""),
            taskId: input.session.taskId,
            taskAgentSessionId: input.session.id,
            targetProject: input.session.project,
            memoryContextChecksum: String(previousSnapshot?.context?.memory_context_checksum || ""),
            syncChecksum: String(previousSnapshotSync?.sync_checksum || ""),
            renderedPromptChecksum: String(previousSnapshot?.context?.rendered_prompt_checksum || ""),
        })
        : { valid: false, deliveryReady: false };
    const previousGroupSessionId = previousSnapshotOuterTrusted
        ? String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || "").trim()
        : "";
    if (previousGroupSessionId.startsWith("gcs_") && groupSessionId.startsWith("gcs_") && previousGroupSessionId !== groupSessionId) {
        const error = new Error(`task Agent memory snapshot history belongs to another group session: ${previousGroupSessionId} -> ${groupSessionId}`);
        error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
        throw error;
    }
    const previousDeliveryReceipt = previousRef?.deliveryReceiptPath
        ? safeReadJson(previousRef.deliveryReceiptPath, null)
        : null;
    const previousDeliveryReceiptTrusted = !!previousDeliveryReceipt
        && verifyMemoryContextDeliveryReceiptChecksum(previousDeliveryReceipt)
        && previousDeliveryReceipt.delivered === true
        && String(previousDeliveryReceipt.status || "") === "delivered"
        && String(previousDeliveryReceipt.receiptId || "") === String(previousRef?.deliveryReceiptId || "")
        && String(previousDeliveryReceipt.checksum || "") === String(previousRef?.deliveryReceiptChecksum || "")
        && String(previousDeliveryReceipt.taskAgentSessionId || "") === input.session.id
        && String(previousDeliveryReceipt.memoryContextSnapshotId || "") === String(previousSnapshot?.snapshot_id || "")
        && String(previousDeliveryReceipt.memoryContextSnapshotChecksum || "") === String(previousSnapshot?.checksum || "");
    const previousSyncCommitFile = String(previousRef?.memorySnapshotSyncCommitPath
        || (previousRef?.snapshotId ? getMemorySnapshotSyncCommitFile(input.session.id, previousRef.snapshotId) : "")).trim();
    const previousSyncCommit = previousSyncCommitFile ? safeReadJson(previousSyncCommitFile, null) : null;
    const previousSyncCommitVerification = previousSnapshotOuterTrusted
        && previousSnapshotSyncVerification.valid === true
        && previousMemoryPromptInjectionVerification.valid === true
        && previousMemoryPromptInjectionVerification.deliveryReady === true
        && previousDeliveryReceiptTrusted
        ? verifyTaskAgentMemorySnapshotSyncCommit(previousSyncCommit, {
            groupId: input.session.groupId,
            groupSessionId: previousGroupSessionId,
            taskId: input.session.taskId,
            taskAgentSessionId: input.session.id,
            targetProject: input.session.project,
            snapshotId: String(previousSnapshot?.snapshot_id || ""),
            snapshotChecksum: String(previousSnapshot?.checksum || ""),
            syncChecksum: String(previousSnapshotSync?.sync_checksum || ""),
            syncAction: String(previousSnapshotSync?.action || ""),
            memoryPromptInjectionProofChecksum: String(previousMemoryPromptInjectionProof?.proof_checksum || ""),
            deliveryReceiptId: String(previousDeliveryReceipt?.receiptId || ""),
            deliveryReceiptChecksum: String(previousDeliveryReceipt?.checksum || ""),
        })
        : { valid: false, committed: false, status: "" };
    const previousSnapshotCommitted = previousSyncCommitVerification.valid === true
        && previousSyncCommitVerification.committed === true;
    const previousSnapshotTrusted = previousSnapshotOuterTrusted
        && previousSnapshotSyncVerification.valid === true
        && previousMemoryPromptInjectionVerification.valid === true
        && previousMemoryPromptInjectionVerification.deliveryReady === true
        && previousDeliveryReceiptTrusted
        && previousSnapshotCommitted;
    const previousMemoryContextChecksum = previousSnapshotTrusted
        ? String(previousSnapshot?.context?.memory_context_checksum || "")
        : "";
    const continuationNativeSessionId = String(input.session.nativeSessionId || "").trim();
    const continuationProvider = (0, runtime_1.normalizeAgentRuntimeId)(input.session.agentType || "");
    const continuationBaselineEligible = previousSnapshotTrusted
        && previousMemoryContextChecksum === input.currentMemoryContextChecksum
        && input.session.resumeMode === "native"
        && Number(input.session.turnCount || 0) > 0
        && !!continuationNativeSessionId
        && (0, runtime_1.getAgentRuntime)(input.session.agentType).capabilities.sessionResume === true
        && (0, runtime_1.normalizeAgentRuntimeId)(previousDeliveryReceipt?.runtime || "") === continuationProvider
        && String(previousDeliveryReceipt?.nativeSessionId || "") === continuationNativeSessionId;
    const memoryContextUnchanged = previousSnapshotTrusted
        && previousMemoryContextChecksum === input.currentMemoryContextChecksum;
    const unchangedBaselineReusable = memoryContextUnchanged
        && (input.enforcementRequired !== true || input.fullMemoryProjectionInjected === true || continuationBaselineEligible);
    const action = !previousRef
        ? "initialize"
        : unchangedBaselineReusable
            ? "none"
            : "prompt_update";
    const reason = action === "initialize"
        ? "first_task_agent_memory_snapshot"
        : action === "none"
            ? "memory_context_unchanged"
            : previousSnapshotTrusted && previousMemoryContextChecksum === input.currentMemoryContextChecksum
                ? "continuation_baseline_unavailable"
                : previousSnapshotTrusted
                    ? "memory_context_changed"
                    : previousSnapshotOuterTrusted
                        && previousSnapshotSyncVerification.valid === true
                        && previousMemoryPromptInjectionVerification.valid === true
                        && previousMemoryPromptInjectionVerification.deliveryReady === true
                        ? "previous_snapshot_uncommitted"
                        : "previous_snapshot_untrusted";
    const payload = {
        schema: TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA,
        version: 1,
        action,
        reason,
        group_id: input.session.groupId,
        group_session_id: groupSessionId,
        task_id: input.session.taskId,
        task_agent_session_id: input.session.id,
        target_project: input.session.project,
        turn: input.turn,
        checked_at: input.generatedAt,
        current_memory_context_checksum: input.currentMemoryContextChecksum,
        previous_snapshot_id: String(previousSnapshotTrusted ? previousSnapshot?.snapshot_id : previousRef?.snapshotId || ""),
        previous_snapshot_checksum: String(previousSnapshotTrusted ? previousSnapshot?.checksum : previousRef?.checksum || ""),
        previous_memory_context_checksum: previousMemoryContextChecksum,
        previous_group_session_id: previousGroupSessionId,
        previous_snapshot_trusted: previousSnapshotTrusted,
        previous_snapshot_committed: previousSnapshotCommitted,
        previous_sync_commit_checksum: String(previousSyncCommitVerification.valid ? previousSyncCommit?.commit_checksum || "" : ""),
        enforcement_required: input.enforcementRequired === true,
        full_memory_projection_injected: input.fullMemoryProjectionInjected === true,
        continuation_baseline_required: action === "none" && input.enforcementRequired === true && input.fullMemoryProjectionInjected !== true,
        continuation_baseline_eligible: continuationBaselineEligible,
        continuation_native_session_id: continuationBaselineEligible ? continuationNativeSessionId : "",
        continuation_provider: continuationBaselineEligible ? continuationProvider : "",
        continuation_provider_contract_id: continuationBaselineEligible ? String(input.session.providerContractId || "") : "",
        continuation_delivery_receipt_id: continuationBaselineEligible ? String(previousDeliveryReceipt?.receiptId || "") : "",
        continuation_delivery_receipt_checksum: continuationBaselineEligible ? String(previousDeliveryReceipt?.checksum || "") : "",
        memory_injection_required: action !== "none",
    };
    const decision = { ...payload, sync_checksum: memorySnapshotSyncChecksum(payload) };
    const verification = verifyTaskAgentMemorySnapshotSyncDecision(decision, {
        groupId: input.session.groupId,
        groupSessionId,
        taskId: input.session.taskId,
        taskAgentSessionId: input.session.id,
        targetProject: input.session.project,
        currentMemoryContextChecksum: input.currentMemoryContextChecksum,
    });
    if (!verification.valid)
        throw new Error(`task Agent memory snapshot sync decision invalid: ${verification.issues.join(",")}`);
    return decision;
}
function hasMeaningfulMemoryContext(value) {
    if (!value || typeof value !== "object")
        return false;
    if (Array.isArray(value))
        return value.length > 0;
    return Object.keys(value).length > 0;
}
function extractGroupSessionMemoryBinding(memoryContext = {}) {
    const groupMemory = memoryContext?.schema === "ccm-group-memory-context-v1"
        ? memoryContext
        : memoryContext?.group_memory?.schema === "ccm-group-memory-context-v1"
            ? memoryContext.group_memory
            : null;
    if (!groupMemory)
        return null;
    const groupId = String(groupMemory.group_id || groupMemory.groupId || "").trim();
    const groupSessionId = String(groupMemory.group_session_id || groupMemory.groupSessionId || "").trim();
    const sessionMemory = groupMemory.compaction?.sessionMemory || groupMemory.compaction?.session_memory || null;
    const sectionEvidence = sessionMemory?.sectionEvidence || sessionMemory?.section_evidence || null;
    const modelReceipt = sessionMemory?.modelExtractionReceipt || sessionMemory?.model_extraction_receipt || null;
    const replayEvidence = sessionMemory?.modelExtractionReplayEvidence || sessionMemory?.model_extraction_replay_evidence || null;
    const factSupersession = sessionMemory?.factSupersession || sessionMemory?.fact_supersession || null;
    const sessionBinding = groupMemory.session_binding || groupMemory.sessionBinding || {};
    const compactTransactionReceipt = groupMemory.compaction?.compactTransactionReceipt
        || groupMemory.compaction?.compact_transaction_receipt
        || groupMemory.compactTransactionReceipt
        || groupMemory.compact_transaction_receipt
        || null;
    const compactEpoch = String(compactTransactionReceipt?.compact_epoch
        || groupMemory.group_state?.typedMemory?.ledger?.compactEpoch
        || groupMemory.group_state?.typed_memory?.ledger?.compact_epoch
        || "precompact").trim() || "precompact";
    const compactTransactionReceiptRequired = compactEpoch !== "precompact";
    const compactTransactionVerification = compactTransactionReceipt
        ? (0, group_memory_compaction_1.verifyGroupCompactTransactionReceipt)(compactTransactionReceipt, { groupId, groupSessionId, compactEpoch })
        : { valid: false, issues: ["compact_transaction_receipt_missing"] };
    const compactHead = groupMemory.compact_head || groupMemory.compactHead || null;
    const compactHeadFenceRequired = groupSessionId.startsWith("gcs_")
        && groupMemory.memory_policy?.ignored !== true
        && groupMemory.memoryPolicy?.ignored !== true;
    const compactHeadValidation = compactHeadFenceRequired
        ? (0, group_compact_head_1.validateGroupCompactHeadBinding)({
            groupId,
            groupSessionId,
            compactEpoch,
            compactTransactionReceiptChecksum: compactTransactionReceipt?.receipt_checksum || "",
            compactTransactionBoundaryId: compactTransactionReceipt?.boundary_id || "",
            compactHeadGeneration: Number(compactHead?.generation || 0),
            compactHeadId: String(compactHead?.head_id || ""),
            compactHeadChecksum: String(compactHead?.head_checksum || ""),
        })
        : { valid: true, status: "exempt", issues: [] };
    const sessionLifecycleFenceRequired = groupSessionId.startsWith("gcs_");
    let sessionLifecycleHead = groupMemory.session_lifecycle_head || groupMemory.sessionLifecycleHead || null;
    if (sessionLifecycleFenceRequired && !sessionLifecycleHead) {
        try {
            sessionLifecycleHead = (0, group_session_lifecycle_head_1.ensureGroupSessionLifecycleHead)(groupId, groupSessionId, { reason: "task_agent_snapshot_lazy_adopt" }).head;
        }
        catch { }
    }
    const sessionLifecycleValidation = sessionLifecycleFenceRequired
        ? (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleBinding)({
            groupId,
            groupSessionId,
            lifecycleStatus: sessionLifecycleHead?.status,
            lifecycleGeneration: sessionLifecycleHead?.generation,
            lifecycleHeadId: sessionLifecycleHead?.lifecycle_head_id,
            lifecycleHeadChecksum: sessionLifecycleHead?.head_checksum,
        })
        : { valid: true, status: "exempt", issues: [] };
    const scopeId = groupSessionId === "default" || !groupSessionId ? groupId : `${groupId}--${groupSessionId}`;
    const replayEvidencePayload = replayEvidence ? { ...replayEvidence } : null;
    if (replayEvidencePayload) {
        delete replayEvidencePayload.checksum;
        delete replayEvidencePayload.checksumValid;
    }
    const replayEvidenceChecksumValid = !!replayEvidence?.checksum
        && replayEvidence?.checksumValid === true
        && hashValue(replayEvidencePayload || {}, 64) === String(replayEvidence.checksum || "");
    const modelExtractionExecutionId = String(replayEvidence?.executionId || modelReceipt?.executionId || "").trim();
    const modelExtractionReceiptChecksum = String(replayEvidence?.receiptChecksum || modelReceipt?.checksum || "").trim();
    const factSupersessionGraphChecksum = String(factSupersession?.graphChecksum || factSupersession?.graph_checksum || "").trim();
    const modelExtractionEvidenceRequired = String(modelReceipt?.status || "") === "committed" || !!modelExtractionExecutionId;
    const modelExtractionEvidenceValid = !modelExtractionEvidenceRequired || (replayEvidenceChecksumValid
        && replayEvidence?.historyIntegrityValid === true
        && replayEvidence?.replayPass === true
        && String(replayEvidence?.replayStatus || "") === "verified"
        && String(replayEvidence?.replayExecutionId || "") === modelExtractionExecutionId
        && modelExtractionReceiptChecksum === String(modelReceipt?.checksum || "")
        && String(replayEvidence?.factSupersessionGraphChecksum || "") === String(modelReceipt?.factSupersessionGraphChecksum || factSupersessionGraphChecksum)
        && (!factSupersessionGraphChecksum || factSupersession?.graphValid === true)
        && (!factSupersessionGraphChecksum || factSupersessionGraphChecksum === String(replayEvidence?.factSupersessionGraphChecksum || "")));
    const activeFacts = factSupersession?.graphValid === true && Array.isArray(factSupersession?.activeFacts || factSupersession?.active_facts)
        ? (factSupersession.activeFacts || factSupersession.active_facts).slice(0, 120).map((fact) => ({
            factId: String(fact?.factId || fact?.fact_id || "").trim(),
            factChecksum: String(fact?.factChecksum || fact?.fact_checksum || "").trim(),
            sourceMessageId: String(fact?.sourceMessageId || fact?.source_message_id || "").trim(),
        })).filter((fact) => fact.factId && fact.factChecksum)
        : [];
    const binding = {
        schema: "ccm-task-agent-group-session-memory-binding-v2",
        version: 2,
        groupId,
        groupSessionId,
        scopeId,
        memoryBindingId: String(sessionBinding.binding_id || sessionBinding.bindingId || "").trim(),
        memoryPolicy: String(groupMemory.memory_policy?.use || groupMemory.memoryPolicy?.use || "").trim(),
        memoryIgnored: groupMemory.memory_policy?.ignored === true || groupMemory.memoryPolicy?.ignored === true,
        sessionMemoryAvailable: !!sessionMemory?.schema,
        sessionMemorySnapshotFile: String(sessionMemory?.snapshotFile || sessionMemory?.snapshot_file || "").trim(),
        sessionMemorySummaryFile: String(sessionMemory?.summaryFile || sessionMemory?.summary_file || "").trim(),
        sessionMemoryChecksum: String(sessionMemory?.markdownChecksum || sessionMemory?.markdown_checksum || "").trim(),
        sessionMemoryHasSummary: sessionMemory?.hasSummary === true || sessionMemory?.has_summary === true,
        sessionMemoryFencingToken: Number(sessionMemory?.extractionTransaction?.fencingToken || sessionMemory?.extraction_transaction?.fencing_token || 0),
        sessionMemorySectionEvidenceChecksum: String(sectionEvidence?.checksum || "").trim(),
        sessionMemorySectionEvidence: Array.isArray(sectionEvidence?.sections)
            ? sectionEvidence.sections.slice(0, 20).map((item) => ({
                evidenceId: String(item?.evidenceId || item?.evidence_id || "").trim(),
                section: String(item?.section || "").trim(),
                sectionIndex: Number(item?.sectionIndex || item?.section_index || 0),
                sectionChecksum: String(item?.sectionChecksum || item?.section_checksum || "").trim(),
                sourceTranscriptChecksum: String(item?.sourceTranscriptChecksum || item?.source_transcript_checksum || sectionEvidence?.sourceTranscriptChecksum || "").trim(),
                sourceFirstMessageId: String(item?.sourceFirstMessageId || item?.source_first_message_id || sectionEvidence?.sourceFirstMessageId || "").trim(),
                sourceLastMessageId: String(item?.sourceLastMessageId || item?.source_last_message_id || sectionEvidence?.sourceLastMessageId || "").trim(),
                sourceMessageIds: Array.from(new Set((Array.isArray(item?.sourceMessageIds || item?.source_message_ids)
                    ? (item.sourceMessageIds || item.source_message_ids)
                    : sectionEvidence?.sourceMessageIds || [])
                    .map((value) => String(value || "").trim())
                    .filter(Boolean))).slice(0, 240),
            })).filter((item) => item.evidenceId && item.sectionChecksum)
            : [],
        modelExtractionExecutionId,
        modelExtractionReceiptChecksum,
        modelExtractionHistoryHeadChecksum: String(replayEvidence?.historyHeadChecksum || "").trim(),
        modelExtractionReplayStatus: String(replayEvidence?.replayStatus || "").trim(),
        modelExtractionReplayExecutionId: String(replayEvidence?.replayExecutionId || "").trim(),
        modelExtractionReplayEvidenceChecksum: String(replayEvidence?.checksum || "").trim(),
        modelExtractionEvidenceRequired,
        modelExtractionEvidenceValid,
        factSupersessionGraphChecksum,
        factSupersessionGraphValid: factSupersession?.graphValid === true,
        activeFactChecksums: activeFacts.map((fact) => fact.factChecksum),
        activeFacts,
        compactEpoch,
        compactTransactionReceiptRequired,
        compactTransactionReceipt: compactTransactionReceipt || null,
        compactTransactionReceiptId: String(compactTransactionReceipt?.receipt_id || "").trim(),
        compactTransactionBoundaryId: String(compactTransactionReceipt?.boundary_id || "").trim(),
        compactTransactionReceiptChecksum: String(compactTransactionReceipt?.receipt_checksum || "").trim(),
        compactTransactionReceiptValid: compactTransactionVerification.valid === true,
        compactTransactionReceiptIssues: compactTransactionVerification.issues,
        compactHeadFenceRequired,
        compactHeadFenceValid: compactHeadValidation.valid === true,
        compactHeadFenceStatus: compactHeadValidation.status,
        compactHeadFenceIssues: compactHeadValidation.issues,
        compactHeadId: String(compactHead?.head_id || ""),
        compactHeadGeneration: Number(compactHead?.generation || 0),
        compactHeadChecksum: String(compactHead?.head_checksum || ""),
        sessionLifecycleFenceRequired,
        sessionLifecycleFenceValid: sessionLifecycleValidation.valid === true,
        sessionLifecycleFenceStatus: sessionLifecycleValidation.status,
        sessionLifecycleFenceIssues: sessionLifecycleValidation.issues,
        sessionLifecycleHeadId: String(sessionLifecycleHead?.lifecycle_head_id || ""),
        sessionLifecycleGeneration: Number(sessionLifecycleHead?.generation || 0),
        sessionLifecycleStatus: String(sessionLifecycleHead?.status || ""),
        sessionLifecycleHeadChecksum: String(sessionLifecycleHead?.head_checksum || ""),
        deliveryReady: modelExtractionEvidenceValid
            && (!compactTransactionReceiptRequired || compactTransactionVerification.valid === true)
            && compactHeadValidation.valid === true
            && sessionLifecycleValidation.valid === true,
    };
    return { ...binding, checksum: hashValue(binding) };
}
function verifyMemoryContextDeliveryReceiptChecksum(receipt) {
    if (!receipt?.checksum)
        return false;
    const payload = { ...receipt };
    const expected = String(payload.checksum || "");
    delete payload.checksum;
    delete payload.receiptFile;
    return hashValue(payload, 64) === expected;
}
function openTaskAgentSession(input) {
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const runtime = (0, runtime_1.normalizeAgentRuntimeId)(input.agentType);
        const existing = [...store.sessions].reverse().find((item) => item.status === "open"
            && item.scopeId === input.scopeId
            && item.groupId === input.groupId
            && item.project === input.project
            && item.agentType === runtime);
        if (existing) {
            if (existing.resumeMode !== "native" && (0, runtime_1.getAgentRuntime)(runtime).capabilities.sessionResume && Number(existing.nativeCaptureFailures || 0) < 3) {
                existing.resumeMode = "native";
                existing.nativeSessionId = "";
                existing.nativeRecoveryAttempts = Number(existing.nativeRecoveryAttempts || 0) + 1;
                existing.lastNativeRecoveryAt = new Date().toISOString();
                existing.lastError = "正在重新尝试捕获原生 session ID";
                saveStore(store);
            }
            return existing;
        }
        const now = new Date().toISOString();
        const session = {
            id: `tas_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
            scopeId: String(input.scopeId || input.taskId || "").trim(),
            taskId: String(input.taskId || "").trim(),
            groupId: String(input.groupId || "").trim(),
            project: String(input.project || "").trim(),
            agentType: runtime,
            nativeSessionId: createNativeSessionId(runtime),
            resumeMode: (0, runtime_1.getAgentRuntime)(runtime).capabilities.sessionResume ? "native" : "scratchpad",
            status: "open",
            turnCount: 0,
            lastTurnSucceeded: null,
            createdAt: now,
            lastUsedAt: now,
            closedAt: "",
            closeReason: "",
            nativeCaptureFailures: 0,
            nativeRecoveryAttempts: 0,
            nativeSessionHistory: [],
            lastNativeRecoveryAt: "",
            lastError: "",
        };
        store.sessions.push(session);
        saveStore(store);
        return session;
    });
}
function recordTaskAgentSessionTurn(sessionId, result = {}) {
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((item) => item.id === sessionId);
        if (index < 0)
            return null;
        const current = store.sessions[index];
        const next = advanceTaskAgentSession(current, result);
        store.sessions[index] = next;
        saveStore(store);
        return next;
    });
}
function finalDispatchReactiveCompactCircuitChecksum(state) {
    const payload = { ...(state || {}) };
    delete payload.state_checksum;
    delete payload.checksum_valid;
    delete payload.blocked;
    delete payload.issues;
    return hashValue(payload, 64);
}
function emptyFinalDispatchReactiveCompactCircuit(session, groupSessionId = "") {
    const payload = {
        schema: "ccm-final-dispatch-reactive-compact-circuit-breaker-v1",
        version: 1,
        group_id: String(session.groupId || ""),
        group_session_id: String(groupSessionId || ""),
        task_id: String(session.taskId || ""),
        task_agent_session_id: String(session.id || ""),
        scope_id: `${String(session.groupId || "")}::${String(groupSessionId || "")}::${String(session.taskId || "")}::${String(session.id || "")}`,
        state: "closed",
        consecutive_failures: 0,
        max_consecutive_failures: exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES,
        revision: 0,
        opened_at: "",
        last_failure_at: "",
        last_success_at: "",
        last_attempt_id: "",
        recent_events: [],
        updated_at: "",
    };
    return { ...payload, state_checksum: finalDispatchReactiveCompactCircuitChecksum(payload) };
}
function verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(state, expected = {}) {
    const issues = [];
    if (state?.schema !== "ccm-final-dispatch-reactive-compact-circuit-breaker-v1" || Number(state?.version || 0) !== 1)
        issues.push("final_dispatch_reactive_circuit_schema_invalid");
    if (!String(state?.group_id || ""))
        issues.push("final_dispatch_reactive_circuit_group_missing");
    if (!String(state?.group_session_id || "").startsWith("gcs_"))
        issues.push("final_dispatch_reactive_circuit_exact_group_session_missing");
    if (!String(state?.task_id || ""))
        issues.push("final_dispatch_reactive_circuit_task_missing");
    if (!String(state?.task_agent_session_id || "").startsWith("tas_"))
        issues.push("final_dispatch_reactive_circuit_task_session_missing");
    if (String(state?.scope_id || "") !== `${String(state?.group_id || "")}::${String(state?.group_session_id || "")}::${String(state?.task_id || "")}::${String(state?.task_agent_session_id || "")}`)
        issues.push("final_dispatch_reactive_circuit_scope_invalid");
    const failures = Number(state?.consecutive_failures || 0);
    if (!Number.isInteger(failures) || failures < 0 || failures > exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES)
        issues.push("final_dispatch_reactive_circuit_failure_count_invalid");
    if (!['closed', 'open'].includes(String(state?.state || "")))
        issues.push("final_dispatch_reactive_circuit_state_invalid");
    if ((failures >= exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES) !== (state?.state === "open"))
        issues.push("final_dispatch_reactive_circuit_state_count_mismatch");
    for (const [field, value] of [
        ["group_id", expected.groupId || expected.group_id],
        ["group_session_id", expected.groupSessionId || expected.group_session_id],
        ["task_id", expected.taskId || expected.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
    ])
        if (value && String(state?.[field] || "") !== String(value))
            issues.push(`final_dispatch_reactive_circuit_${field}_mismatch`);
    if (String(state?.state_checksum || "") !== finalDispatchReactiveCompactCircuitChecksum(state))
        issues.push("final_dispatch_reactive_circuit_checksum_invalid");
    return { valid: issues.length === 0, issues };
}
function inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(sessionId, input = {}) {
    const session = loadStore().sessions.find((item) => item.id === String(sessionId || ""));
    if (!session)
        return { state: "fail_closed", blocked: true, checksum_valid: false, issues: ["task_agent_session_missing"] };
    const groupSessionId = String(input.groupSessionId || input.group_session_id || session.finalDispatchReactiveCompactCircuitBreaker?.group_session_id || "");
    const raw = session.finalDispatchReactiveCompactCircuitBreaker || emptyFinalDispatchReactiveCompactCircuit(session, groupSessionId);
    const verification = verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(raw, {
        groupId: input.groupId || input.group_id || session.groupId,
        groupSessionId,
        taskId: input.taskId || input.task_id || session.taskId,
        taskAgentSessionId: session.id,
    });
    if (!verification.valid)
        return { ...raw, state: "fail_closed", blocked: true, checksum_valid: false, issues: verification.issues };
    return { ...raw, blocked: raw.state === "open", checksum_valid: true, issues: [] };
}
function recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(sessionId, input = {}) {
    const id = String(sessionId || "").trim();
    const outcome = String(input.outcome || "").trim();
    const attemptId = String(input.attemptId || input.attempt_id || "").trim();
    if (!id || !attemptId || !["failure", "success"].includes(outcome))
        throw new Error("final dispatch reactive compact circuit outcome requires session, attempt, and success/failure");
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((item) => item.id === id);
        if (index < 0)
            throw new Error("task agent session missing for final dispatch reactive compact circuit");
        const session = store.sessions[index];
        const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
        if (!groupSessionId.startsWith("gcs_"))
            throw new Error("final dispatch reactive compact circuit requires exact gcs_* session");
        const currentRaw = session.finalDispatchReactiveCompactCircuitBreaker || emptyFinalDispatchReactiveCompactCircuit(session, groupSessionId);
        const verification = verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(currentRaw, {
            groupId: input.groupId || input.group_id || session.groupId,
            groupSessionId,
            taskId: input.taskId || input.task_id || session.taskId,
            taskAgentSessionId: session.id,
        });
        if (!verification.valid && outcome !== "success")
            return { ...currentRaw, state: "fail_closed", blocked: true, checksum_valid: false, issues: verification.issues, recorded: false };
        if (verification.valid && currentRaw.last_attempt_id === attemptId)
            return { ...currentRaw, blocked: currentRaw.state === "open", checksum_valid: true, issues: [], recorded: false, idempotent: true };
        const now = String(input.at || input.recorded_at || new Date().toISOString());
        const previousFailures = verification.valid ? Number(currentRaw.consecutive_failures || 0) : exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES;
        const consecutiveFailures = outcome === "success" ? 0 : Math.min(exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES, previousFailures + 1);
        const state = consecutiveFailures >= exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES ? "open" : "closed";
        const event = {
            event_id: `fdrcbe_${hashValue([session.groupId, groupSessionId, session.taskId, session.id, attemptId, outcome], 24)}`,
            attempt_id: attemptId,
            outcome,
            reason: String(input.reason || (outcome === "success" ? "provider_accepted_recovered_prompt" : "reactive_compact_failed")).replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
            error_fingerprint: input.error ? hashValue(String(input.error), 24) : "",
            consecutive_failures: consecutiveFailures,
            state,
            recorded_at: now,
        };
        const payload = {
            schema: "ccm-final-dispatch-reactive-compact-circuit-breaker-v1",
            version: 1,
            group_id: session.groupId,
            group_session_id: groupSessionId,
            task_id: session.taskId,
            task_agent_session_id: session.id,
            scope_id: `${session.groupId}::${groupSessionId}::${session.taskId}::${session.id}`,
            state,
            consecutive_failures: consecutiveFailures,
            max_consecutive_failures: exports.FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES,
            revision: Number(currentRaw.revision || 0) + 1,
            opened_at: state === "open" ? String(currentRaw.opened_at || now) : "",
            last_failure_at: outcome === "failure" ? now : String(currentRaw.last_failure_at || ""),
            last_success_at: outcome === "success" ? now : String(currentRaw.last_success_at || ""),
            last_attempt_id: attemptId,
            recent_events: [...(Array.isArray(currentRaw.recent_events) ? currentRaw.recent_events : []), event].slice(-40),
            updated_at: now,
        };
        const saved = { ...payload, state_checksum: finalDispatchReactiveCompactCircuitChecksum(payload) };
        store.sessions[index] = { ...session, finalDispatchReactiveCompactCircuitBreaker: saved, lastUsedAt: now };
        saveStore(store);
        return { ...saved, blocked: state === "open", checksum_valid: true, issues: [], recorded: true, idempotent: false };
    });
}
function prepareTaskAgentMemoryEntrySyncContext(sessionId, memoryContextInput) {
    const id = String(sessionId || "").trim();
    if (!id || !memoryContextInput || typeof memoryContextInput !== "object")
        return { memoryContext: memoryContextInput, plan: null, prepared: false };
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const session = store.sessions.find((item) => item.id === id);
        if (!session)
            return { memoryContext: memoryContextInput, plan: null, prepared: false };
        const binding = extractGroupSessionMemoryBinding(memoryContextInput || {});
        const groupSessionId = String(binding?.groupSessionId || "");
        if (!groupSessionId.startsWith("gcs_"))
            return { memoryContext: memoryContextInput, plan: null, prepared: false };
        if (session.groupSessionId?.startsWith("gcs_") && session.groupSessionId !== groupSessionId) {
            const error = new Error(`task Agent memory entry sync belongs to another group session: ${session.groupSessionId} -> ${groupSessionId}`);
            error.code = "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED";
            throw error;
        }
        const preparedAtMs = Date.now();
        const sourceMemoryContextChecksum = (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContextInput);
        const existingRenderLease = session.memoryEntrySyncRenderLease || null;
        const existingLeaseExpiresMs = Date.parse(String(existingRenderLease?.expires_at || ""));
        const existingLeaseActive = existingRenderLease?.status === "prepared"
            && Number.isFinite(existingLeaseExpiresMs)
            && existingLeaseExpiresMs > preparedAtMs
            && processIsAlive(Number(existingRenderLease?.owner_pid || 0));
        if (existingLeaseActive
            && (Number(existingRenderLease.owner_pid || 0) !== process.pid
                || String(existingRenderLease.source_memory_context_checksum || "") !== sourceMemoryContextChecksum)) {
            const error = new Error(`task Agent memory entry render lease is busy: ${existingRenderLease.lease_id || "unknown"}`);
            error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY";
            error.leaseId = String(existingRenderLease.lease_id || "");
            error.fencingToken = Number(existingRenderLease.fencing_token || 0);
            error.ownerPid = Number(existingRenderLease.owner_pid || 0);
            error.leaseExpiresAt = String(existingRenderLease.expires_at || "");
            throw error;
        }
        const refs = normalizeMemorySnapshotRefs(session.memoryContextSnapshots);
        const previousRef = refs.length ? refs[refs.length - 1] : null;
        const previousSnapshot = previousRef?.snapshotPath ? safeReadJson(previousRef.snapshotPath, null) : null;
        const previousOuterTrusted = !!previousSnapshot
            && previousSnapshot.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA
            && verifyMemoryContextSnapshotChecksum(previousSnapshot)
            && String(previousSnapshot?.session?.id || "") === session.id
            && String(previousSnapshot?.session?.group_id || "") === session.groupId
            && String(previousSnapshot?.session?.task_id || "") === session.taskId
            && String(previousSnapshot?.session?.project || "") === session.project
            && String(previousSnapshot?.context?.group_session_memory_binding?.groupSessionId || "") === groupSessionId;
        const previousMemoryContext = previousSnapshot?.context?.memory_context || null;
        const previousSemanticChecksum = previousOuterTrusted ? (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(previousMemoryContext) : "";
        const previousSync = previousSnapshot?.context?.memory_snapshot_sync || null;
        const previousSyncVerification = previousOuterTrusted ? verifyTaskAgentMemorySnapshotSyncDecision(previousSync, {
            groupId: session.groupId,
            groupSessionId,
            taskId: session.taskId,
            taskAgentSessionId: session.id,
            targetProject: session.project,
            currentMemoryContextChecksum: previousSemanticChecksum,
        }) : { valid: false };
        const previousProof = previousSnapshot?.context?.memory_prompt_injection_proof || null;
        const previousProofVerification = previousOuterTrusted && previousSyncVerification.valid === true
            ? verifyTaskAgentMemoryPromptInjectionProof(previousProof, {
                groupId: session.groupId,
                groupSessionId,
                taskId: session.taskId,
                taskAgentSessionId: session.id,
                targetProject: session.project,
                memoryContextChecksum: previousSemanticChecksum,
                syncChecksum: String(previousSync?.sync_checksum || ""),
                renderedPromptChecksum: String(previousSnapshot?.context?.rendered_prompt_checksum || ""),
            })
            : { valid: false, deliveryReady: false };
        const previousReceipt = previousRef?.deliveryReceiptPath ? safeReadJson(previousRef.deliveryReceiptPath, null) : null;
        const previousReceiptTrusted = !!previousReceipt
            && verifyMemoryContextDeliveryReceiptChecksum(previousReceipt)
            && previousReceipt.delivered === true
            && String(previousReceipt.status || "") === "delivered"
            && String(previousReceipt.receiptId || "") === String(previousRef?.deliveryReceiptId || "")
            && String(previousReceipt.checksum || "") === String(previousRef?.deliveryReceiptChecksum || "")
            && String(previousReceipt.taskAgentSessionId || "") === session.id
            && String(previousReceipt.memoryContextSnapshotId || "") === String(previousSnapshot?.snapshot_id || "")
            && String(previousReceipt.memoryContextSnapshotChecksum || "") === String(previousSnapshot?.checksum || "");
        const previousCommitFile = String(previousRef?.memorySnapshotSyncCommitPath || (previousRef?.snapshotId ? getMemorySnapshotSyncCommitFile(session.id, previousRef.snapshotId) : ""));
        const previousCommit = previousCommitFile ? safeReadJson(previousCommitFile, null) : null;
        const previousCommitVerification = previousReceiptTrusted && previousProofVerification.valid === true && previousProofVerification.deliveryReady === true
            ? verifyTaskAgentMemorySnapshotSyncCommit(previousCommit, {
                groupId: session.groupId,
                groupSessionId,
                taskId: session.taskId,
                taskAgentSessionId: session.id,
                targetProject: session.project,
                snapshotId: String(previousSnapshot?.snapshot_id || ""),
                snapshotChecksum: String(previousSnapshot?.checksum || ""),
                syncChecksum: String(previousSync?.sync_checksum || ""),
                syncAction: String(previousSync?.action || ""),
                memoryPromptInjectionProofChecksum: String(previousProof?.proof_checksum || ""),
                deliveryReceiptId: String(previousReceipt?.receiptId || ""),
                deliveryReceiptChecksum: String(previousReceipt?.checksum || ""),
            })
            : { valid: false, committed: false };
        const previousEntryPlan = previousSnapshot?.context?.memory_entry_sync || (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(previousMemoryContext);
        const previousManifest = previousEntryPlan?.current_manifest || null;
        const previousManifestVerification = previousManifest ? (0, task_agent_memory_entry_sync_1.verifyTaskAgentMemoryEntryManifest)(previousManifest, {
            groupId: session.groupId,
            groupSessionId,
            sourceMemoryContextChecksum: previousSemanticChecksum,
        }) : { valid: false };
        const previousTrusted = previousOuterTrusted
            && previousSyncVerification.valid === true
            && previousProofVerification.valid === true
            && previousProofVerification.deliveryReady === true
            && previousReceiptTrusted
            && previousCommitVerification.valid === true
            && previousCommitVerification.committed === true
            && previousManifestVerification.valid === true;
        const reuseRenderLease = existingLeaseActive
            && Number(existingRenderLease.owner_pid || 0) === process.pid
            && String(existingRenderLease.source_memory_context_checksum || "") === sourceMemoryContextChecksum
            && String(existingRenderLease.base_snapshot_id || "") === String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || "")
            && String(existingRenderLease.base_snapshot_checksum || "") === String(previousSnapshot?.checksum || previousRef?.checksum || "");
        const staleRenderLeaseRecovered = !!existingRenderLease
            && existingRenderLease.status === "prepared"
            && !reuseRenderLease;
        const renderFencingToken = reuseRenderLease
            ? Number(existingRenderLease.fencing_token || 0)
            : Math.max(Number(session.memoryEntrySyncRenderFencingToken || 0), Number(existingRenderLease?.fencing_token || 0)) + 1;
        const renderLease = reuseRenderLease ? existingRenderLease : {
            schema: "ccm-task-agent-memory-entry-render-lease-v1",
            version: 1,
            lease_id: `tamerl_${crypto.randomBytes(12).toString("hex")}`,
            fencing_token: renderFencingToken,
            owner_pid: process.pid,
            status: "prepared",
            group_id: session.groupId,
            group_session_id: groupSessionId,
            task_id: session.taskId,
            task_agent_session_id: session.id,
            target_project: session.project,
            source_memory_context_checksum: sourceMemoryContextChecksum,
            base_snapshot_id: String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || ""),
            base_snapshot_checksum: String(previousSnapshot?.checksum || previousRef?.checksum || ""),
            base_manifest_checksum: previousTrusted ? String(previousManifest?.manifest_checksum || "") : "",
            acquired_at: new Date(preparedAtMs).toISOString(),
            expires_at: new Date(preparedAtMs + MEMORY_ENTRY_RENDER_LEASE_TTL_MS).toISOString(),
            recovered_stale_lease_id: staleRenderLeaseRecovered ? String(existingRenderLease?.lease_id || "") : "",
        };
        const plan = (0, task_agent_memory_entry_sync_1.buildTaskAgentMemoryEntrySyncPlan)({
            memory: memoryContextInput,
            groupId: session.groupId,
            groupSessionId,
            taskId: session.taskId,
            taskAgentSessionId: session.id,
            targetProject: session.project,
            previousSnapshotId: String(previousSnapshot?.snapshot_id || previousRef?.snapshotId || ""),
            previousSnapshotChecksum: String(previousSnapshot?.checksum || previousRef?.checksum || ""),
            previousManifest,
            previousTrusted,
            renderLease,
        });
        const sealedRenderLease = {
            ...renderLease,
            plan_checksum: plan.plan_checksum,
            manifest_checksum: String(plan.current_manifest?.manifest_checksum || ""),
            transport_mode: plan.transport_mode,
        };
        const previousHistory = Array.isArray(session.memoryEntrySyncRenderLeaseHistory) ? session.memoryEntrySyncRenderLeaseHistory : [];
        if (!reuseRenderLease && existingRenderLease?.lease_id) {
            session.memoryEntrySyncRenderLeaseHistory = [...previousHistory, existingRenderLease].slice(-MEMORY_ENTRY_RENDER_LEASE_HISTORY_LIMIT);
        }
        if (!session.groupSessionId && groupSessionId.startsWith("gcs_"))
            session.groupSessionId = groupSessionId;
        session.memoryEntrySyncRenderLease = sealedRenderLease;
        session.memoryEntrySyncRenderFencingToken = renderFencingToken;
        session.memoryEntrySyncRenderLeaseTakeoverCount = Number(session.memoryEntrySyncRenderLeaseTakeoverCount || 0) + (staleRenderLeaseRecovered ? 1 : 0);
        session.lastUsedAt = new Date(preparedAtMs).toISOString();
        saveStore(store);
        return {
            memoryContext: (0, task_agent_memory_entry_sync_1.attachTaskAgentMemoryEntrySyncPlan)(memoryContextInput, plan),
            plan,
            prepared: true,
            previousBaselineTrusted: previousTrusted,
            renderLease: sealedRenderLease,
            renderLeaseReused: reuseRenderLease,
            staleRenderLeaseRecovered,
        };
    });
}
function memoryEntryRenderContentionChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.contention_checksum;
    return hashValue(payload, 64);
}
function verifyTaskAgentMemoryEntryRenderContentionReceipt(receipt, expected = {}) {
    const issues = [];
    if (receipt?.schema !== MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA)
        issues.push("render_contention_schema_invalid");
    if (Number(receipt?.version || 0) !== 1)
        issues.push("render_contention_version_invalid");
    if (!new Set(["resolved", "timeout", "same_process"]).has(String(receipt?.status || "")))
        issues.push("render_contention_status_invalid");
    if (String(receipt?.contention_checksum || "") !== memoryEntryRenderContentionChecksum(receipt))
        issues.push("render_contention_checksum_invalid");
    const bindings = [
        ["group_id", expected.groupId, receipt?.group_id],
        ["group_session_id", expected.groupSessionId, receipt?.group_session_id],
        ["task_id", expected.taskId, receipt?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, receipt?.task_agent_session_id],
        ["target_project", expected.targetProject, receipt?.target_project],
    ];
    for (const [field, wanted, actual] of bindings)
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`render_contention_${field}_mismatch`);
    if (!Number.isInteger(Number(receipt?.contender_pid || 0)) || Number(receipt?.contender_pid || 0) <= 0)
        issues.push("render_contention_contender_pid_invalid");
    if (!/^tamerl_[a-f0-9]{24}$/.test(String(receipt?.blocked_lease_id || "")))
        issues.push("render_contention_blocked_lease_invalid");
    if (!Number.isInteger(Number(receipt?.blocked_fencing_token || 0)) || Number(receipt?.blocked_fencing_token || 0) <= 0)
        issues.push("render_contention_fencing_token_invalid");
    if (!Number.isInteger(Number(receipt?.blocked_owner_pid || 0)) || Number(receipt?.blocked_owner_pid || 0) <= 0)
        issues.push("render_contention_owner_pid_invalid");
    if (!Number.isInteger(Number(receipt?.retries ?? -1)) || Number(receipt?.retries ?? -1) < 0 || Number(receipt?.retries || 0) > 5)
        issues.push("render_contention_retries_invalid");
    if (!Number.isInteger(Number(receipt?.waited_ms ?? -1)) || Number(receipt?.waited_ms ?? -1) < 0)
        issues.push("render_contention_wait_invalid");
    if (!/^[a-f0-9]{64}$/.test(String(receipt?.source_memory_context_checksum || "")))
        issues.push("render_contention_source_checksum_invalid");
    if (!Number.isFinite(Date.parse(String(receipt?.observed_at || ""))))
        issues.push("render_contention_observed_at_invalid");
    if (receipt?.status === "same_process" && (Number(receipt?.retries || 0) !== 0 || Number(receipt?.waited_ms || 0) !== 0))
        issues.push("render_contention_same_process_wait_invalid");
    return { valid: issues.length === 0, issues: [...new Set(issues)], status: String(receipt?.status || "") };
}
function recordTaskAgentMemoryEntryRenderContention(sessionId, input) {
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const session = store.sessions.find((item) => item.id === sessionId);
        if (!session)
            return null;
        const observedAt = new Date().toISOString();
        const payload = {
            schema: MEMORY_ENTRY_RENDER_CONTENTION_SCHEMA,
            version: 1,
            status: input.status,
            group_id: session.groupId,
            group_session_id: session.groupSessionId || "",
            task_id: session.taskId,
            task_agent_session_id: session.id,
            target_project: session.project,
            contender_pid: process.pid,
            blocked_lease_id: String(input.blockedLeaseId || ""),
            blocked_fencing_token: Number(input.blockedFencingToken || 0),
            blocked_owner_pid: Number(input.blockedOwnerPid || 0),
            retries: Math.max(0, Number(input.retries || 0)),
            waited_ms: Math.max(0, Number(input.waitedMs || 0)),
            source_memory_context_checksum: String(input.sourceMemoryContextChecksum || ""),
            observed_at: observedAt,
        };
        const receipt = { ...payload, contention_checksum: memoryEntryRenderContentionChecksum(payload) };
        session.memoryEntrySyncRenderContentionCount = Number(session.memoryEntrySyncRenderContentionCount || 0) + 1;
        session.memoryEntrySyncRenderWaitResolvedCount = Number(session.memoryEntrySyncRenderWaitResolvedCount || 0) + (input.status === "resolved" ? 1 : 0);
        session.memoryEntrySyncRenderWaitTimeoutCount = Number(session.memoryEntrySyncRenderWaitTimeoutCount || 0) + (input.status === "timeout" ? 1 : 0);
        session.memoryEntrySyncRenderSameProcessConflictCount = Number(session.memoryEntrySyncRenderSameProcessConflictCount || 0) + (input.status === "same_process" ? 1 : 0);
        session.memoryEntrySyncRenderWaitTotalMs = Number(session.memoryEntrySyncRenderWaitTotalMs || 0) + payload.waited_ms;
        session.memoryEntrySyncRenderLastContention = receipt;
        session.lastUsedAt = observedAt;
        saveStore(store);
        return receipt;
    });
}
function prepareTaskAgentMemoryEntrySyncContextWithRetry(sessionId, memoryContextInput, options = {}) {
    const maxConflictRetries = Math.min(5, Math.max(0, Math.floor(Number(options.maxConflictRetries ?? MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES))));
    const baseDelayMs = Math.min(1_000, Math.max(1, Math.floor(Number(options.baseDelayMs ?? MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS))));
    const maxDelayMs = Math.min(2_000, Math.max(baseDelayMs, Math.floor(Number(options.maxDelayMs ?? MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS))));
    const jitterMs = Math.min(500, Math.max(0, Math.floor(Number(options.jitterMs ?? MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS))));
    const sourceMemoryContextChecksum = (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContextInput || {});
    let retries = 0;
    let waitedMs = 0;
    let firstConflict = null;
    while (true) {
        try {
            const prepared = prepareTaskAgentMemoryEntrySyncContext(sessionId, memoryContextInput);
            if (!firstConflict)
                return prepared;
            const contention = recordTaskAgentMemoryEntryRenderContention(sessionId, {
                status: "resolved",
                retries,
                waitedMs,
                blockedLeaseId: firstConflict.leaseId,
                blockedFencingToken: firstConflict.fencingToken,
                blockedOwnerPid: firstConflict.ownerPid,
                sourceMemoryContextChecksum,
            });
            return { ...prepared, renderContention: contention };
        }
        catch (error) {
            if (error?.code !== "TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY")
                throw error;
            firstConflict ||= error;
            const sameProcess = Number(error.ownerPid || 0) === process.pid;
            if (sameProcess || retries >= maxConflictRetries) {
                const status = sameProcess ? "same_process" : "timeout";
                const contention = recordTaskAgentMemoryEntryRenderContention(sessionId, {
                    status,
                    retries,
                    waitedMs,
                    blockedLeaseId: firstConflict.leaseId,
                    blockedFencingToken: firstConflict.fencingToken,
                    blockedOwnerPid: firstConflict.ownerPid,
                    sourceMemoryContextChecksum,
                });
                error.renderContentionStatus = status;
                error.renderContentionRetries = retries;
                error.renderContentionWaitedMs = waitedMs;
                error.renderContentionReceipt = contention;
                throw error;
            }
            const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** retries));
            const delayMs = exponentialDelay + (jitterMs > 0 ? crypto.randomInt(0, jitterMs + 1) : 0);
            sleepForStoreLock(delayMs);
            waitedMs += delayMs;
            retries += 1;
        }
    }
}
function bindTaskAgentMemoryContextSnapshot(sessionId, input = {}) {
    const id = String(sessionId || "").trim();
    if (!id)
        return null;
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((item) => item.id === id);
        if (index < 0)
            return null;
        const current = store.sessions[index];
        const packet = input.workerContextPacket || input.workerHandoff?.worker_context_packet || input.workerHandoff?.workerContextPacket || {};
        const packetMemory = packet.memory || input.workerHandoff?.references?.memory_context || input.workerHandoff?.references?.memoryContext || null;
        const memoryContext = (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(packetMemory)
            ? packetMemory
            : input.memoryContext || packetMemory || null;
        const groupSessionMemoryBinding = extractGroupSessionMemoryBinding(memoryContext || {});
        const workerHandoffId = String(input.workerHandoff?.handoff_id || input.workerHandoff?.handoffId || input.workerHandoffSummary?.handoff_id || input.workerHandoffSummary?.handoffId || "").trim();
        const workerContextPacketId = String(packet?.packet_id || packet?.packetId || input.workerHandoffSummary?.packet_id || input.workerHandoffSummary?.packetId || "").trim();
        const generatedAt = new Date().toISOString();
        const turn = Number(input.turn || current.turnCount + 1 || 0);
        const memoryContextChecksum = (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContext || {});
        const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
        const memoryEntrySync = (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(memoryContext);
        const memoryEntryTransport = (0, task_agent_memory_entry_sync_1.taskAgentMemoryTransport)(memoryContext);
        const rejectCurrentMemoryEntryRenderLease = (reason) => {
            const lease = current.memoryEntrySyncRenderLease || null;
            if (!lease || String(lease.lease_id || "") !== String(memoryEntrySync?.render_lease_id || "")
                || Number(lease.fencing_token || 0) !== Number(memoryEntrySync?.render_fencing_token || 0))
                return;
            current.memoryEntrySyncRenderLease = {
                ...lease,
                status: "rejected",
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
            };
            current.lastUsedAt = new Date().toISOString();
            store.sessions[index] = current;
            saveStore(store);
        };
        if (memoryEntrySync && !memoryEntryTransport.valid) {
            rejectCurrentMemoryEntryRenderLease(`plan_invalid:${memoryEntryTransport.issues.join(",")}`);
            const error = new Error(`task Agent memory entry sync plan invalid: ${memoryEntryTransport.issues.join(",")}`);
            error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_INVALID";
            throw error;
        }
        const effectiveRenderedMemoryContext = memoryEntryTransport.mode === "delta"
            ? memoryEntryTransport.text
            : memoryEntryTransport.mode === "continuation"
                ? ""
                : String(input.renderedMemoryContext || "");
        const renderedProjection = renderedMemoryProjection(memoryContext, effectiveRenderedMemoryContext);
        const trustedEnvelopeRequired = input.requireTrustedMemoryPromptEnvelope === true;
        const trustedEnvelope = (0, trusted_memory_prompt_envelope_1.verifyTrustedMemoryPromptEnvelope)(String(input.renderedPrompt || ""), {
            ...(renderedProjection.text ? { projection: renderedProjection.text } : {}),
            sourceChecksum: (0, trusted_memory_prompt_envelope_1.trustedMemorySourceChecksum)(memoryContext || {}),
        });
        const fullMemoryProjectionInjected = !!renderedProjection.text
            && (trustedEnvelopeRequired
                ? trustedEnvelope.valid
                : String(input.renderedPrompt || "").includes(renderedProjection.text));
        const memorySnapshotSync = createTaskAgentMemorySnapshotSyncDecision({
            session: current,
            refs,
            groupSessionMemoryBinding,
            currentMemoryContextChecksum: memoryContextChecksum,
            generatedAt,
            turn,
            fullMemoryProjectionInjected: memoryEntryTransport.mode === "delta" ? false : fullMemoryProjectionInjected,
            enforcementRequired: input.requireMemoryPromptInjectionProof === true,
        });
        if (memoryEntrySync) {
            const currentManifest = (0, task_agent_memory_entry_sync_1.buildTaskAgentMemoryEntryManifest)((0, task_agent_memory_entry_sync_1.stripTaskAgentMemoryEntrySync)(memoryContext));
            const entryVerification = (0, task_agent_memory_entry_sync_1.verifyTaskAgentMemoryEntrySyncPlan)(memoryEntrySync, {
                groupId: current.groupId,
                groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
                taskId: current.taskId,
                taskAgentSessionId: current.id,
                targetProject: current.project,
                sourceMemoryContextChecksum: memoryContextChecksum,
            });
            const entryIssues = [...entryVerification.issues];
            const currentRenderLease = current.memoryEntrySyncRenderLease || null;
            const renderLeaseExpiresMs = Date.parse(String(currentRenderLease?.expires_at || ""));
            if (currentRenderLease?.schema !== "ccm-task-agent-memory-entry-render-lease-v1")
                entryIssues.push("entry_sync_render_lease_missing");
            if (String(currentRenderLease?.status || "") !== "prepared")
                entryIssues.push("entry_sync_render_lease_not_prepared");
            if (String(currentRenderLease?.lease_id || "") !== String(memoryEntrySync?.render_lease_id || ""))
                entryIssues.push("entry_sync_render_lease_id_stale");
            if (Number(currentRenderLease?.fencing_token || 0) !== Number(memoryEntrySync?.render_fencing_token || 0))
                entryIssues.push("entry_sync_render_fencing_token_stale");
            if (Number(memoryEntrySync?.render_lease_owner_pid || 0) !== process.pid || Number(currentRenderLease?.owner_pid || 0) !== process.pid)
                entryIssues.push("entry_sync_render_lease_owner_mismatch");
            if (!Number.isFinite(renderLeaseExpiresMs) || renderLeaseExpiresMs <= Date.now())
                entryIssues.push("entry_sync_render_lease_expired");
            if (String(currentRenderLease?.source_memory_context_checksum || "") !== memoryContextChecksum)
                entryIssues.push("entry_sync_render_lease_source_mismatch");
            if (String(currentRenderLease?.plan_checksum || "") !== String(memoryEntrySync?.plan_checksum || ""))
                entryIssues.push("entry_sync_render_lease_plan_mismatch");
            if (String(currentRenderLease?.manifest_checksum || "") !== String(memoryEntrySync?.current_manifest?.manifest_checksum || ""))
                entryIssues.push("entry_sync_render_lease_manifest_mismatch");
            if (String(currentRenderLease?.base_snapshot_id || "") !== String(memoryEntrySync?.previous_snapshot_id || ""))
                entryIssues.push("entry_sync_render_lease_base_snapshot_mismatch");
            if (String(currentRenderLease?.base_manifest_checksum || "") !== String(memoryEntrySync?.previous_manifest_checksum || ""))
                entryIssues.push("entry_sync_render_lease_base_manifest_mismatch");
            if (String(memoryEntrySync?.current_manifest?.manifest_checksum || "") !== String(currentManifest.manifest_checksum || ""))
                entryIssues.push("entry_sync_current_manifest_stale");
            if (memoryEntryTransport.mode !== "full" && String(memoryEntrySync?.previous_snapshot_id || "") !== String(memorySnapshotSync?.previous_snapshot_id || ""))
                entryIssues.push("entry_sync_previous_snapshot_stale");
            const compatible = (memorySnapshotSync.action === "initialize" && memoryEntryTransport.mode === "full")
                || (memorySnapshotSync.action === "none" && memoryEntryTransport.mode === "continuation")
                || (memorySnapshotSync.action === "prompt_update" && ["full", "delta"].includes(memoryEntryTransport.mode));
            if (!compatible)
                entryIssues.push("entry_sync_snapshot_action_mismatch");
            if (entryIssues.length) {
                rejectCurrentMemoryEntryRenderLease(`bind_stale:${[...new Set(entryIssues)].join(",")}`);
                const error = new Error(`task Agent memory entry sync changed before snapshot bind: ${[...new Set(entryIssues)].join(",")}`);
                error.code = "TASK_AGENT_MEMORY_ENTRY_SYNC_STALE";
                throw error;
            }
        }
        const memoryPromptInjectionProof = createTaskAgentMemoryPromptInjectionProof({
            session: current,
            groupSessionMemoryBinding,
            memoryContext,
            memoryContextChecksum,
            memorySnapshotSync,
            renderedPrompt: String(input.renderedPrompt || ""),
            renderedMemoryContext: effectiveRenderedMemoryContext,
            enforcementRequired: input.requireMemoryPromptInjectionProof === true,
            trustedEnvelopeRequired,
            generatedAt,
        });
        const gateIds = Array.from(collectMemoryContextGateIds({
            worker_context_packet: packet,
            worker_handoff: input.workerHandoff || null,
            memory_context: memoryContext,
        })).slice(0, 100);
        const postTurnSummaryCapsuleInput = packet?.post_turn_summary_delivery_capsule
            || packet?.postTurnSummaryDeliveryCapsule
            || (0, group_post_turn_summary_1.extractGroupPostTurnSummaryDeliveryCapsule)(memoryContext || packet || null);
        const postTurnSummaryCapsule = (0, group_post_turn_summary_1.validateGroupPostTurnSummaryDeliveryCapsule)(postTurnSummaryCapsuleInput, {
            expectedBinding: {
                group_id: String(input.groupId || current.groupId || ""),
                task_id: String(input.taskId || current.taskId || ""),
                target_project: String(input.project || current.project || ""),
                task_agent_session_id: current.id,
                native_session_id: String(input.nativeSessionId || current.nativeSessionId || ""),
                execution_id: String(input.executionId || ""),
                attempt_sequence: turn,
                invocation_kind: turn > 1 ? "resume" : "spawn",
                ...(input.invocationLineage?.invocation_edge_id ? {
                    invocation_edge_id: input.invocationLineage.invocation_edge_id,
                    parent_invocation_edge_id: input.invocationLineage.parent_invocation_edge_id || "",
                    root_invocation_edge_id: input.invocationLineage.root_invocation_edge_id || "",
                    branch_id: input.invocationLineage.branch_id || "",
                    parent_branch_id: input.invocationLineage.parent_branch_id || "",
                    branch_kind: input.invocationLineage.branch_kind || "main",
                    expected_lineage_head_checksum: input.invocationLineage.expected_lineage_head_checksum || "",
                } : {}),
            },
            renderedPrompt: input.renderedPrompt || "",
        });
        const snapshotSeed = [
            current.id,
            input.taskId || current.taskId,
            input.groupId || current.groupId,
            input.project || current.project,
            input.executionId || "",
            workerContextPacketId,
            turn,
            generatedAt,
        ].join("\0");
        const snapshotId = `tams_${hashValue(snapshotSeed, 18)}`;
        const snapshotFile = path.join(getMemoryContextSnapshotDir(current.id), `${snapshotId}.json`);
        const payloadWithoutChecksum = {
            schema: TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA,
            snapshot_id: snapshotId,
            generated_at: generatedAt,
            session: {
                id: current.id,
                scope_id: current.scopeId,
                task_id: String(input.taskId || current.taskId || "").trim(),
                group_id: String(input.groupId || current.groupId || "").trim(),
                project: String(input.project || current.project || "").trim(),
                agent_type: (0, runtime_1.normalizeAgentRuntimeId)(input.agentType || current.agentType || ""),
                native_session_id: String(input.nativeSessionId || current.nativeSessionId || "").trim(),
                turn,
                resume_mode: current.resumeMode,
            },
            context: {
                execution_id: String(input.executionId || "").trim(),
                trace_id: String(input.traceId || "").trim(),
                worker_context_packet_id: workerContextPacketId,
                worker_handoff_id: workerHandoffId,
                worker_context_packet: packet || null,
                worker_handoff_summary: input.workerHandoffSummary || null,
                memory_context: memoryContext || null,
                memory_context_checksum: memoryContextChecksum,
                memory_entry_sync: memoryEntrySync || null,
                group_session_memory_binding: groupSessionMemoryBinding,
                memory_snapshot_sync: memorySnapshotSync,
                memory_prompt_injection_proof: memoryPromptInjectionProof,
                provider_memory_channel_acknowledgement_required: input.requireProviderMemoryChannelAcknowledgement === true,
                memory_context_consumption_receipt_required: input.requireMemoryContextConsumptionReceipt === true,
                memory_context_consumption_challenge: input.memoryContextConsumptionChallenge || null,
                post_turn_summary_delivery_capsule: postTurnSummaryCapsule,
                post_turn_summary_capsule_checksum: String(postTurnSummaryCapsule?.capsule_checksum || ""),
                post_turn_summary_capsule_prompt_bound: postTurnSummaryCapsule?.prompt_bound === true,
                post_turn_summary_capsule_selected_count: Number(postTurnSummaryCapsule?.selected_count || 0),
                post_turn_summary_capsule_ledger_head_checksum: String(postTurnSummaryCapsule?.ledger_head_checksum || ""),
                task_agent_invocation_lineage: input.invocationLineage || packet?.task_agent_invocation_lineage || null,
                invocation_edge_id: String(input.invocationLineage?.invocation_edge_id || packet?.task_agent_invocation_lineage?.invocation_edge_id || ""),
                invocation_branch_id: String(input.invocationLineage?.branch_id || packet?.task_agent_invocation_lineage?.branch_id || ""),
                rendered_handoff_checksum: input.renderedHandoff ? hashValue(input.renderedHandoff) : "",
                rendered_prompt_checksum: input.renderedPrompt ? hashValue(input.renderedPrompt) : "",
                rendered_prompt_excerpt: input.renderedPrompt ? String(input.renderedPrompt).slice(0, 4000) : "",
                runtime_tool_snapshot: input.runtimeToolSnapshot || null,
                gate_ids: gateIds,
            },
        };
        const checksum = hashValue(JSON.parse(JSON.stringify(payloadWithoutChecksum)));
        const snapshot = {
            ...payloadWithoutChecksum,
            checksum,
            snapshot_file: snapshotFile,
        };
        writeJsonAtomic(snapshotFile, snapshot);
        const ref = {
            snapshotId,
            snapshotPath: snapshotFile,
            checksum,
            workerContextPacketId,
            workerHandoffId,
            gateIds,
            generatedAt,
            invocationEdgeId: String(input.invocationLineage?.invocation_edge_id || packet?.task_agent_invocation_lineage?.invocation_edge_id || ""),
            branchId: String(input.invocationLineage?.branch_id || packet?.task_agent_invocation_lineage?.branch_id || ""),
            memorySnapshotSyncAction: memorySnapshotSync.action,
            memorySnapshotSyncChecksum: memorySnapshotSync.sync_checksum,
            memorySnapshotSyncedFromId: memorySnapshotSync.previous_snapshot_id,
        };
        refs.push(ref);
        const next = {
            ...current,
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || current.groupSessionId || ""),
            memoryContextSnapshotId: snapshotId,
            memoryContextSnapshotPath: snapshotFile,
            memoryContextSnapshotChecksum: checksum,
            memoryContextPacketId: workerContextPacketId,
            memoryContextSnapshotAt: generatedAt,
            memoryContextDeliveryReceiptId: "",
            memoryContextDeliveryReceiptPath: "",
            memoryContextDeliveryReceiptChecksum: "",
            memoryContextDeliveryStatus: "pending",
            memoryContextDeliveredAt: "",
            latestMemoryContextDeliveryAttemptReceiptId: "",
            latestMemoryContextDeliveryAttemptReceiptPath: "",
            latestMemoryContextDeliveryAttemptReceiptChecksum: "",
            latestMemoryContextDeliveryAttemptStatus: "pending",
            latestMemoryContextDeliveryAttemptAt: "",
            memorySnapshotSyncCommitPath: "",
            memorySnapshotSyncCommitChecksum: "",
            memorySnapshotSyncCommitStatus: "pending",
            memorySnapshotSyncCommittedAt: "",
            memoryEntrySyncRenderLease: memoryEntrySync ? {
                ...current.memoryEntrySyncRenderLease,
                status: "bound",
                bound_at: generatedAt,
                bound_snapshot_id: snapshotId,
                bound_snapshot_checksum: checksum,
            } : current.memoryEntrySyncRenderLease,
            memoryContextSnapshots: refs.slice(-MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
            lastUsedAt: generatedAt,
        };
        store.sessions[index] = next;
        saveStore(store);
        return { session: next, snapshot, ref };
    });
}
function attachTaskAgentFinalDispatchPayloadGate(sessionId, input = {}) {
    const id = String(sessionId || "").trim();
    const requestedSnapshotId = String(input.snapshotId || "").trim();
    const gate = input.finalDispatchPayloadGate || input.final_dispatch_payload_gate || null;
    const reactiveCompact = input.finalDispatchReactiveCompact || input.final_dispatch_reactive_compact || null;
    const renderedPrompt = String(input.renderedPrompt || input.rendered_prompt || "");
    if (!id || !gate || !renderedPrompt)
        return { updated: false, reason: "missing_final_dispatch_binding_input" };
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((item) => item.id === id);
        if (index < 0)
            return { updated: false, reason: "task_agent_session_missing" };
        const current = store.sessions[index];
        const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
        const ref = refs.find(item => item.snapshotId === (requestedSnapshotId || current.memoryContextSnapshotId))
            || refs.find(item => item.snapshotId === current.memoryContextSnapshotId);
        const snapshotFile = String(ref?.snapshotPath || current.memoryContextSnapshotPath || "").trim();
        const snapshot = safeReadJson(snapshotFile, null);
        if (!snapshot || !verifyMemoryContextSnapshotChecksum(snapshot))
            return { updated: false, reason: "memory_context_snapshot_invalid" };
        const context = snapshot.context || {};
        const packet = context.worker_context_packet || {};
        const verification = (0, final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate)(gate, {
            renderedPrompt,
            groupId: snapshot.session?.group_id || current.groupId,
            groupSessionId: capacityRevalidationGroupSessionId(packet),
            taskId: snapshot.session?.task_id || current.taskId,
            taskAgentSessionId: snapshot.session?.id || current.id,
            workerContextPacketId: context.worker_context_packet_id || packet.packet_id || current.memoryContextPacketId,
        });
        if (!verification.valid)
            return { updated: false, reason: "final_dispatch_payload_gate_invalid", issues: verification.issues };
        const reactiveCompactVerification = reactiveCompact ? (0, final_dispatch_reactive_compact_1.verifyFinalDispatchReactiveCompactReceipt)(reactiveCompact, {
            groupId: snapshot.session?.group_id || current.groupId,
            groupSessionId: capacityRevalidationGroupSessionId(packet),
            taskId: snapshot.session?.task_id || current.taskId,
            taskAgentSessionId: snapshot.session?.id || current.id,
            workerContextPacketId: context.worker_context_packet_id || packet.packet_id || current.memoryContextPacketId,
        }) : { valid: true, issues: [] };
        if (!reactiveCompactVerification.valid)
            return { updated: false, reason: "final_dispatch_reactive_compact_invalid", issues: reactiveCompactVerification.issues };
        let memoryPromptInjectionProof = null;
        try {
            memoryPromptInjectionProof = createTaskAgentMemoryPromptInjectionProof({
                session: current,
                groupSessionMemoryBinding: context.group_session_memory_binding || extractGroupSessionMemoryBinding(context.memory_context || {}),
                memoryContext: context.memory_context || null,
                memoryContextChecksum: String(context.memory_context_checksum || ""),
                memorySnapshotSync: context.memory_snapshot_sync || null,
                renderedPrompt,
                enforcementRequired: context.memory_prompt_injection_proof?.enforcement_required === true,
                trustedEnvelopeRequired: context.memory_prompt_injection_proof?.trusted_envelope_required === true,
                generatedAt: new Date().toISOString(),
            });
        }
        catch (error) {
            return { updated: false, reason: "memory_prompt_injection_required", issues: error?.issues || [error?.message || String(error)] };
        }
        const nextWithoutChecksum = {
            ...snapshot,
            context: {
                ...context,
                worker_context_packet: {
                    ...packet,
                    final_dispatch_payload_gate: gate,
                    ...(reactiveCompact ? { final_dispatch_reactive_compact: reactiveCompact } : {}),
                },
                final_dispatch_payload_gate: gate,
                ...(reactiveCompact ? { final_dispatch_reactive_compact: reactiveCompact } : {}),
                final_dispatch_prompt_checksum: String(gate.prompt_checksum || ""),
                final_dispatch_prompt_tokens: Number(gate.estimated_total_input_tokens || 0),
                final_dispatch_prompt_chars: Number(gate.prompt_chars || renderedPrompt.length),
                final_dispatch_gate_attached_at: new Date().toISOString(),
                rendered_prompt_checksum: hashValue(renderedPrompt),
                rendered_prompt_excerpt: renderedPrompt.slice(0, 4000),
                memory_prompt_injection_proof: memoryPromptInjectionProof,
            },
        };
        delete nextWithoutChecksum.checksum;
        delete nextWithoutChecksum.snapshot_file;
        const serializedPayload = JSON.parse(JSON.stringify(nextWithoutChecksum));
        const checksum = hashValue(serializedPayload);
        const nextSnapshot = { ...serializedPayload, checksum, snapshot_file: snapshotFile };
        writeJsonAtomic(snapshotFile, nextSnapshot);
        const nextRefs = refs.map(item => item.snapshotId === snapshot.snapshot_id ? { ...item, checksum } : item);
        const nextSession = {
            ...current,
            memoryContextSnapshotChecksum: current.memoryContextSnapshotId === snapshot.snapshot_id ? checksum : current.memoryContextSnapshotChecksum,
            memoryContextSnapshots: nextRefs,
            lastUsedAt: new Date().toISOString(),
        };
        store.sessions[index] = nextSession;
        saveStore(store);
        return { updated: true, session: nextSession, snapshot: nextSnapshot, gate, verification, reactiveCompact, reactiveCompactVerification };
    });
}
function verifyTaskAgentMemoryContinuationBaselineDelivery(snapshot, input = {}) {
    const sync = snapshot?.context?.memory_snapshot_sync || null;
    const injectionProof = snapshot?.context?.memory_prompt_injection_proof || null;
    const required = String(sync?.action || "") === "none"
        && sync?.continuation_baseline_required === true
        && injectionProof?.prompt_bound !== true;
    if (!required) {
        return {
            required: false,
            valid: true,
            status: injectionProof?.prompt_bound === true ? "full_prompt_injection" : "not_required",
            issues: [],
            evidenceChecksum: "",
        };
    }
    const issues = [];
    const evidence = input.nativeContinuationEvidence || null;
    const expectedNativeSessionId = String(sync?.continuation_native_session_id || "").trim();
    const expectedProvider = (0, runtime_1.normalizeAgentRuntimeId)(sync?.continuation_provider || input.runtime || "");
    const expectedProviderContractId = String(sync?.continuation_provider_contract_id || "").trim();
    const runnerRequestId = String(input.runnerRequestId || "").trim();
    if (sync?.continuation_baseline_eligible !== true)
        issues.push("continuation_baseline_not_eligible");
    if (!expectedNativeSessionId)
        issues.push("continuation_native_session_missing");
    if (!expectedProvider)
        issues.push("continuation_provider_missing");
    if (!runnerRequestId)
        issues.push("continuation_runner_request_missing");
    const verification = evidence ? (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(evidence, {
        provider: expectedProvider,
        runnerRequestId,
        requestedNativeSessionId: expectedNativeSessionId,
        ...(expectedProviderContractId ? { expectedProviderContractId } : {}),
    }) : { valid: false, issues: ["native_continuation_evidence_missing"] };
    if (!verification.valid)
        issues.push(...verification.issues);
    if (evidence?.nativeResumeRequested !== true)
        issues.push("native_resume_not_requested");
    if (evidence?.nativeContinuationAcknowledged !== true)
        issues.push("native_continuation_not_acknowledged");
    if (evidence?.nativeSessionReusable !== true)
        issues.push("native_session_not_reusable");
    if (evidence?.providerContractContinuityVerified !== true)
        issues.push("provider_contract_continuity_unverified");
    if (evidence?.runnerSuccess !== true)
        issues.push("continuation_runner_failed");
    if (evidence?.nativeForkRequested === true)
        issues.push("native_fork_not_continuation");
    if (String(evidence?.requestedNativeSessionId || "") !== expectedNativeSessionId)
        issues.push("requested_native_session_mismatch");
    if (String(evidence?.effectiveNativeSessionId || "") !== expectedNativeSessionId)
        issues.push("effective_native_session_mismatch");
    if (String(input.nativeSessionId || expectedNativeSessionId) !== expectedNativeSessionId)
        issues.push("delivered_native_session_mismatch");
    return {
        required: true,
        valid: issues.length === 0,
        status: issues.length === 0 ? "acknowledged" : "unverified",
        issues: [...new Set(issues)],
        evidenceChecksum: String(evidence?.evidenceChecksum || ""),
    };
}
function recordTaskAgentMemoryContextDelivery(sessionId, input = {}) {
    const id = String(sessionId || "").trim();
    if (!id)
        return null;
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((item) => item.id === id);
        if (index < 0)
            return null;
        const current = store.sessions[index];
        const snapshotId = String(input.snapshotId || current.memoryContextSnapshotId || "").trim();
        const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
        const refIndex = refs.findIndex(ref => ref.snapshotId === snapshotId);
        const ref = refIndex >= 0 ? refs[refIndex] : null;
        const snapshotFile = String(ref?.snapshotPath || current.memoryContextSnapshotPath || "").trim();
        const snapshot = safeReadJson(snapshotFile, null);
        if (!snapshot || !verifyMemoryContextSnapshotChecksum(snapshot))
            return null;
        const actualPrompt = String(input.renderedPrompt || "");
        const snapshotPrompt = String(input.snapshotRenderedPrompt || "");
        const declaredSnapshotPromptChecksum = String(snapshot.context?.rendered_prompt_checksum || "").trim();
        const snapshotPromptChecksum = snapshotPrompt ? hashValue(snapshotPrompt) : "";
        const basePromptMatchesSnapshot = !!snapshotPrompt && snapshotPromptChecksum === declaredSnapshotPromptChecksum;
        const promptBindingMode = basePromptMatchesSnapshot
            ? actualPrompt === snapshotPrompt ? "exact" : actualPrompt.includes(snapshotPrompt) ? "contains_snapshot_prompt" : "mismatch"
            : "snapshot_prompt_unverified";
        const delivered = input.dispatched !== false
            && basePromptMatchesSnapshot
            && (promptBindingMode === "exact" || promptBindingMode === "contains_snapshot_prompt");
        const deliveredAt = new Date().toISOString();
        const receiptId = `tamdr_${hashValue([id, snapshotId, input.executionId || "", input.attempt || 0, deliveredAt].join("\0"), 20)}`;
        const receiptFile = path.join(getMemoryContextSnapshotDir(id), `${snapshotId}.${receiptId}.delivery.json`);
        const groupSessionMemoryBinding = snapshot.context?.group_session_memory_binding || extractGroupSessionMemoryBinding(snapshot.context?.memory_context || {});
        const compactTransactionReceiptRequired = groupSessionMemoryBinding?.compactTransactionReceiptRequired === true;
        const compactTransactionReceiptValid = groupSessionMemoryBinding?.compactTransactionReceiptValid === true;
        const compactHeadValidation = groupSessionMemoryBinding?.compactHeadFenceRequired === true
            ? (0, group_compact_head_1.validateGroupCompactHeadBinding)({
                groupId: groupSessionMemoryBinding.groupId,
                groupSessionId: groupSessionMemoryBinding.groupSessionId,
                compactEpoch: groupSessionMemoryBinding.compactEpoch,
                compactTransactionReceiptChecksum: groupSessionMemoryBinding.compactTransactionReceiptChecksum,
                compactTransactionBoundaryId: groupSessionMemoryBinding.compactTransactionBoundaryId,
                compactHeadGeneration: groupSessionMemoryBinding.compactHeadGeneration,
                compactHeadId: groupSessionMemoryBinding.compactHeadId,
                compactHeadChecksum: groupSessionMemoryBinding.compactHeadChecksum,
            })
            : { valid: true, status: "exempt", issues: [], expected: null };
        const compactHeadFenceValid = compactHeadValidation.valid === true;
        const deliveryGroupSessionId = String(groupSessionMemoryBinding?.groupSessionId || "");
        const sessionLifecycleFenceRequired = deliveryGroupSessionId.startsWith("gcs_");
        const sessionLifecycleValidation = sessionLifecycleFenceRequired
            ? (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleBinding)({
                groupId: groupSessionMemoryBinding.groupId,
                groupSessionId: groupSessionMemoryBinding.groupSessionId,
                lifecycleStatus: groupSessionMemoryBinding.sessionLifecycleStatus,
                lifecycleGeneration: groupSessionMemoryBinding.sessionLifecycleGeneration,
                lifecycleHeadId: groupSessionMemoryBinding.sessionLifecycleHeadId,
                lifecycleHeadChecksum: groupSessionMemoryBinding.sessionLifecycleHeadChecksum,
            })
            : { valid: true, status: "exempt", issues: [], expected: null };
        const sessionLifecycleFenceValid = sessionLifecycleValidation.valid === true;
        const memoryEvidenceReady = (!groupSessionMemoryBinding || groupSessionMemoryBinding.deliveryReady !== false)
            && compactHeadFenceValid
            && sessionLifecycleFenceValid;
        const continuationBaseline = verifyTaskAgentMemoryContinuationBaselineDelivery(snapshot, input);
        const memoryPromptInjectionProof = snapshot.context?.memory_prompt_injection_proof || null;
        const providerMemoryChannelRequired = memoryPromptInjectionProof?.trusted_envelope_bound === true;
        const providerMemoryChannelAcknowledgementRequired = providerMemoryChannelRequired
            && snapshot.context?.provider_memory_channel_acknowledgement_required === true;
        const memoryContextConsumptionReceiptRequired = providerMemoryChannelRequired
            && snapshot.context?.memory_context_consumption_receipt_required === true;
        const memoryContextConsumptionChallenge = snapshot.context?.memory_context_consumption_challenge || null;
        const memoryContextConsumptionVerification = memoryContextConsumptionReceiptRequired
            ? (0, memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt)(memoryContextConsumptionChallenge, {
                groupId: snapshot.session?.group_id || current.groupId || "",
                groupSessionId: groupSessionMemoryBinding?.groupSessionId || "",
                taskId: snapshot.session?.task_id || current.taskId || "",
                executionId: snapshot.context?.execution_id || "",
                project: snapshot.session?.project || current.project || "",
                taskAgentSessionId: id,
            })
            : { valid: true, issues: [], receipt: null, receiptSignature: "" };
        if (memoryContextConsumptionReceiptRequired
            && String(input.memoryContextConsumptionReceipt?.receipt_signature || "") !== String(memoryContextConsumptionVerification.receiptSignature || "")) {
            memoryContextConsumptionVerification.valid = false;
            memoryContextConsumptionVerification.issues = [...new Set([...(memoryContextConsumptionVerification.issues || []), "receipt_attempt_binding_mismatch"])];
        }
        const memoryContextConsumptionRecoveryVerification = input.memoryContextConsumptionRecovery
            ? (0, memory_context_consumption_recovery_1.verifyMemoryContextConsumptionRecovery)(input.memoryContextConsumptionRecovery, {
                challengeId: memoryContextConsumptionChallenge?.challenge_id || "",
                runnerRequestId: input.runnerRequestId || "",
                groupId: snapshot.session?.group_id || current.groupId || "",
                groupSessionId: groupSessionMemoryBinding?.groupSessionId || "",
                taskId: snapshot.session?.task_id || current.taskId || "",
                executionId: snapshot.context?.execution_id || "",
                project: snapshot.session?.project || current.project || "",
                taskAgentSessionId: id,
                provider: input.runtime || current.agentType || "",
            })
            : { valid: true, issues: [] };
        if (memoryContextConsumptionReceiptRequired && input.memoryContextConsumptionRecovery
            && (!memoryContextConsumptionRecoveryVerification.valid || input.memoryContextConsumptionRecovery.status !== "recovered")) {
            memoryContextConsumptionVerification.valid = false;
            memoryContextConsumptionVerification.issues = [...new Set([
                    ...(memoryContextConsumptionVerification.issues || []),
                    ...memoryContextConsumptionRecoveryVerification.issues,
                    ...(input.memoryContextConsumptionRecovery.status === "recovered" ? [] : ["memory_context_consumption_recovery_unresolved"]),
                ])];
        }
        const providerMemoryChannelVerification = providerMemoryChannelRequired
            ? (0, provider_memory_channel_1.verifyProviderMemoryChannelEvidence)(input.providerMemoryChannelEvidence, {
                provider: input.runtime || current.agentType || "",
                originalPrompt: actualPrompt,
                envelopeChecksum: String(memoryPromptInjectionProof?.trusted_envelope_checksum || ""),
                sourceChecksum: String(memoryPromptInjectionProof?.trusted_envelope_source_checksum || ""),
                runnerRequestId: String(input.runnerRequestId || ""),
                required: true,
                requireAcknowledgement: providerMemoryChannelAcknowledgementRequired,
                providerOutputContractEvidence: input.nativeContinuationEvidence?.providerOutputContractEvidence || null,
                nativeContinuationEvidence: input.nativeContinuationEvidence || null,
                executionSucceeded: input.executionSucceeded !== false,
            })
            : { valid: true, issues: [], required: false, status: "not_required", channel: "none", authorityRole: "none", nativeSystemPrompt: false, nativeDeveloperInstructions: false, fallbackUserPrompt: false, acknowledgementRequired: false, acknowledgementStatus: "not_required", acknowledged: false, acknowledgementPolicy: "" };
        const memoryDeliveryEvidenceReady = memoryEvidenceReady
            && continuationBaseline.valid
            && providerMemoryChannelVerification.valid
            && memoryContextConsumptionVerification.valid;
        const fileChangeRows = (Array.isArray(input.fileChanges?.files)
            ? input.fileChanges.files
            : Array.isArray(input.fileChanges) ? input.fileChanges : [])
            .map((item) => ({
            path: String(item?.path || item?.file || "").trim(),
            status: String(item?.statusKind || item?.status || item?.statusText || "changed").trim(),
            diffChecksum: item?.diff ? hashValue(item.diff, 32) : "",
        }))
            .filter((item) => item.path)
            .slice(0, 80);
        const fileChangeChecksum = fileChangeRows.length ? hashValue(fileChangeRows, 64) : "";
        const outputChecksum = input.output ? hashValue(String(input.output)) : "";
        const runnerStarted = input.runnerStarted !== undefined ? input.runnerStarted === true : input.dispatched !== false;
        const memoryEntryPlan = snapshot.context?.memory_entry_sync || (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(snapshot.context?.memory_context || null);
        const memoryTransportMode = String(memoryEntryPlan?.transport_mode || "legacy");
        const providerMemoryTransportUsage = deliveryGroupSessionId.startsWith("gcs_") ? (0, task_agent_memory_transport_usage_1.buildTaskAgentMemoryTransportUsageReceipt)({
            usage: input.providerUsage,
            executionSucceeded: input.executionSucceeded !== false,
            groupId: String(snapshot.session?.group_id || current.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(snapshot.session?.task_id || current.taskId || ""),
            taskAgentSessionId: id,
            targetProject: String(snapshot.session?.project || current.project || ""),
            snapshotId,
            snapshotChecksum: String(snapshot.checksum || ""),
            runnerRequestId: String(input.runnerRequestId || ""),
            nativeSessionId: String(input.nativeSessionId || current.nativeSessionId || ""),
            provider: input.runtime || current.agentType || "",
            model: current.modelId || "",
            providerContractId: String(input.nativeContinuationEvidence?.providerContractId || current.providerContractId || ""),
            providerRuntimeVersion: String(input.nativeContinuationEvidence?.providerRuntimeVersion || current.providerRuntimeVersion || ""),
            transportMode: memoryTransportMode,
            planChecksum: String(memoryEntryPlan?.plan_checksum || ""),
            manifestChecksum: String(memoryEntryPlan?.current_manifest?.manifest_checksum || ""),
            finalPromptEstimatedTokens: Math.ceil(actualPrompt.length / 4),
            memoryTransportEstimatedTokens: Math.ceil(Number(memoryPromptInjectionProof?.rendered_memory_chars || 0) / 4),
            observedAt: deliveredAt,
        }) : null;
        const providerMemoryTransportUsageVerification = providerMemoryTransportUsage ? (0, task_agent_memory_transport_usage_1.verifyTaskAgentMemoryTransportUsageReceipt)(providerMemoryTransportUsage, {
            groupId: String(snapshot.session?.group_id || current.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(snapshot.session?.task_id || current.taskId || ""),
            taskAgentSessionId: id,
            targetProject: String(snapshot.session?.project || current.project || ""),
            snapshotId,
            snapshotChecksum: String(snapshot.checksum || ""),
            runnerRequestId: String(input.runnerRequestId || ""),
            provider: input.runtime || current.agentType || "",
            nativeSessionId: String(input.nativeSessionId || current.nativeSessionId || ""),
            transportMode: memoryTransportMode,
        }) : { valid: true, issues: [] };
        if (!providerMemoryTransportUsageVerification.valid) {
            throw new Error(`task Agent memory transport usage receipt invalid: ${providerMemoryTransportUsageVerification.issues.join(",")}`);
        }
        const taskArtifactProven = delivered
            && memoryDeliveryEvidenceReady
            && input.executionSucceeded !== false
            && runnerStarted
            && !!String(input.runnerRequestId || "").trim()
            && !!outputChecksum
            && fileChangeRows.length > 0;
        const payload = {
            schema: "ccm-task-agent-memory-context-delivery-receipt-v2",
            version: 2,
            receiptId,
            source: "ccm_runner_dispatch_witness",
            status: delivered && memoryDeliveryEvidenceReady
                ? "delivered"
                : !sessionLifecycleFenceValid
                    ? "session_lifecycle_stale"
                    : !compactHeadFenceValid
                        ? "compact_head_stale"
                        : !continuationBaseline.valid
                            ? "continuation_baseline_unverified"
                            : !providerMemoryChannelVerification.valid
                                ? "provider_memory_channel_unverified"
                                : !memoryContextConsumptionVerification.valid
                                    ? "memory_context_consumption_unverified"
                                    : "binding_failed",
            delivered: delivered && memoryDeliveryEvidenceReady,
            deliveredAt,
            taskAgentSessionId: id,
            taskId: String(snapshot.session?.task_id || current.taskId || "").trim(),
            groupId: String(snapshot.session?.group_id || current.groupId || "").trim(),
            project: String(snapshot.session?.project || current.project || "").trim(),
            runtime: (0, runtime_1.normalizeAgentRuntimeId)(input.runtime || current.agentType || ""),
            nativeSessionId: String(input.nativeSessionId || current.nativeSessionId || "").trim(),
            executionId: String(input.executionId || snapshot.context?.execution_id || "").trim(),
            traceId: String(input.traceId || snapshot.context?.trace_id || "").trim(),
            attempt: Math.max(1, Number(input.attempt || 1)),
            runnerRequestId: String(input.runnerRequestId || "").trim(),
            memoryContextSnapshotId: snapshotId,
            memoryContextSnapshotChecksum: String(snapshot.checksum || "").trim(),
            memoryContextChecksum: String(snapshot.context?.memory_context_checksum || "").trim(),
            workerContextPacketId: String(snapshot.context?.worker_context_packet_id || "").trim(),
            groupSessionMemoryBinding: groupSessionMemoryBinding || null,
            groupSessionMemoryBindingChecksum: String(groupSessionMemoryBinding?.checksum || ""),
            modelExtractionEvidenceValid: groupSessionMemoryBinding?.modelExtractionEvidenceValid !== false,
            compactEpoch: String(groupSessionMemoryBinding?.compactEpoch || "precompact"),
            compactTransactionReceiptRequired,
            compactTransactionReceiptValid,
            compactTransactionReceiptId: String(groupSessionMemoryBinding?.compactTransactionReceiptId || ""),
            compactTransactionBoundaryId: String(groupSessionMemoryBinding?.compactTransactionBoundaryId || ""),
            compactTransactionReceiptChecksum: String(groupSessionMemoryBinding?.compactTransactionReceiptChecksum || ""),
            compactHeadFenceRequired: groupSessionMemoryBinding?.compactHeadFenceRequired === true,
            compactHeadFenceValid,
            compactHeadFenceStatus: compactHeadValidation.status,
            compactHeadFenceIssues: compactHeadValidation.issues,
            compactHeadId: String(groupSessionMemoryBinding?.compactHeadId || ""),
            compactHeadGeneration: Number(groupSessionMemoryBinding?.compactHeadGeneration || 0),
            compactHeadChecksum: String(groupSessionMemoryBinding?.compactHeadChecksum || ""),
            currentCompactHead: compactHeadValidation.expected,
            sessionLifecycleFenceRequired,
            sessionLifecycleFenceValid,
            sessionLifecycleFenceStatus: sessionLifecycleValidation.status,
            sessionLifecycleFenceIssues: sessionLifecycleValidation.issues,
            sessionLifecycleHeadId: String(groupSessionMemoryBinding?.sessionLifecycleHeadId || ""),
            sessionLifecycleGeneration: Number(groupSessionMemoryBinding?.sessionLifecycleGeneration || 0),
            sessionLifecycleStatus: String(groupSessionMemoryBinding?.sessionLifecycleStatus || ""),
            sessionLifecycleHeadChecksum: String(groupSessionMemoryBinding?.sessionLifecycleHeadChecksum || ""),
            currentSessionLifecycleHead: sessionLifecycleValidation.expected,
            snapshotRenderedPromptChecksum: declaredSnapshotPromptChecksum,
            actualRenderedPromptChecksum: hashValue(actualPrompt),
            promptBindingMode,
            executionSucceeded: input.executionSucceeded !== false,
            outputChecksum,
            runnerStarted,
            fileChangeCount: fileChangeRows.length,
            fileChangeChecksum,
            fileChangePaths: fileChangeRows.map((item) => item.path),
            taskArtifactProven,
            providerContractId: String(input.nativeContinuationEvidence?.providerContractId || ""),
            providerRuntimeVersion: String(input.nativeContinuationEvidence?.providerRuntimeVersion || ""),
            providerMemoryTransportUsage,
            providerMemoryTransportUsageChecksum: String(providerMemoryTransportUsage?.usage_checksum || ""),
            memoryContinuationBaselineRequired: continuationBaseline.required,
            memoryContinuationBaselineValid: continuationBaseline.valid,
            memoryContinuationBaselineStatus: continuationBaseline.status,
            memoryContinuationBaselineIssues: continuationBaseline.issues,
            memoryContinuationEvidenceChecksum: continuationBaseline.evidenceChecksum,
            nativeContinuationEvidence: continuationBaseline.required ? input.nativeContinuationEvidence || null : null,
            providerMemoryChannelRequired,
            providerMemoryChannelAcknowledgementRequired,
            providerMemoryChannelAcknowledged: providerMemoryChannelVerification.acknowledged,
            providerMemoryChannelAcknowledgementStatus: providerMemoryChannelVerification.acknowledgementStatus,
            providerMemoryChannelAcknowledgementPolicy: providerMemoryChannelVerification.acknowledgementPolicy,
            providerMemoryChannelValid: providerMemoryChannelVerification.valid,
            providerMemoryChannelStatus: providerMemoryChannelVerification.status,
            providerMemoryChannel: providerMemoryChannelVerification.channel,
            providerMemoryAuthorityRole: providerMemoryChannelVerification.authorityRole,
            providerMemoryNativeSystemPrompt: providerMemoryChannelVerification.nativeSystemPrompt,
            providerMemoryNativeDeveloperInstructions: providerMemoryChannelVerification.nativeDeveloperInstructions,
            providerMemoryUserPromptFallback: providerMemoryChannelVerification.fallbackUserPrompt,
            providerMemoryChannelIssues: providerMemoryChannelVerification.issues,
            providerMemoryChannelEvidenceChecksum: String(input.providerMemoryChannelEvidence?.evidence_checksum || ""),
            providerMemoryChannelEvidence: providerMemoryChannelRequired ? input.providerMemoryChannelEvidence || null : null,
            memoryContextConsumptionReceiptRequired,
            memoryContextConsumptionReceiptValid: memoryContextConsumptionVerification.valid,
            memoryContextConsumptionReceiptStatus: memoryContextConsumptionVerification.valid ? (memoryContextConsumptionReceiptRequired ? "loaded" : "not_required") : "unverified",
            memoryContextConsumptionReceiptIssues: memoryContextConsumptionVerification.issues || [],
            memoryContextConsumptionChallengeId: String(memoryContextConsumptionChallenge?.challenge_id || ""),
            memoryContextConsumptionReceiptSignature: String(memoryContextConsumptionVerification.receiptSignature || ""),
            memoryContextConsumptionReceipt: memoryContextConsumptionReceiptRequired ? memoryContextConsumptionVerification.receipt || null : null,
            memoryContextConsumptionRecoveryPresent: !!input.memoryContextConsumptionRecovery,
            memoryContextConsumptionRecoveryValid: memoryContextConsumptionRecoveryVerification.valid,
            memoryContextConsumptionRecoveryStatus: String(input.memoryContextConsumptionRecovery?.status || "not_needed"),
            memoryContextConsumptionRecoveryId: String(input.memoryContextConsumptionRecovery?.recovery_id || ""),
            memoryContextConsumptionRecoveryIssues: memoryContextConsumptionRecoveryVerification.issues || [],
            memoryContextConsumptionRecovery: input.memoryContextConsumptionRecovery || null,
        };
        const receipt = { ...payload, checksum: hashValue(payload, 64), receiptFile };
        writeJsonAtomic(receiptFile, receipt);
        const memorySnapshotSync = snapshot.context?.memory_snapshot_sync || null;
        const memorySnapshotSyncVerification = verifyTaskAgentMemorySnapshotSyncDecision(memorySnapshotSync, {
            groupId: String(snapshot.session?.group_id || current.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(snapshot.session?.task_id || current.taskId || ""),
            taskAgentSessionId: id,
            targetProject: String(snapshot.session?.project || current.project || ""),
            currentMemoryContextChecksum: String(snapshot.context?.memory_context_checksum || ""),
        });
        const memoryPromptInjectionVerification = verifyTaskAgentMemoryPromptInjectionProof(memoryPromptInjectionProof, {
            groupId: String(snapshot.session?.group_id || current.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(snapshot.session?.task_id || current.taskId || ""),
            taskAgentSessionId: id,
            targetProject: String(snapshot.session?.project || current.project || ""),
            memoryContextChecksum: String(snapshot.context?.memory_context_checksum || ""),
            syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
            renderedPromptChecksum: String(snapshot.context?.rendered_prompt_checksum || ""),
        });
        const syncCommitted = receipt.delivered === true
            && memorySnapshotSyncVerification.valid === true
            && memoryPromptInjectionVerification.valid === true
            && memoryPromptInjectionVerification.deliveryReady === true;
        const syncCommitFile = getMemorySnapshotSyncCommitFile(id, snapshotId);
        const existingCanonicalReceipt = ref?.deliveryReceiptPath
            ? safeReadJson(ref.deliveryReceiptPath, null)
            : null;
        const existingCanonicalReceiptValid = !!existingCanonicalReceipt
            && verifyMemoryContextDeliveryReceiptChecksum(existingCanonicalReceipt)
            && existingCanonicalReceipt.delivered === true
            && String(existingCanonicalReceipt.status || "") === "delivered"
            && String(existingCanonicalReceipt.receiptId || "") === String(ref?.deliveryReceiptId || "")
            && String(existingCanonicalReceipt.checksum || "") === String(ref?.deliveryReceiptChecksum || "")
            && String(existingCanonicalReceipt.taskAgentSessionId || "") === id
            && String(existingCanonicalReceipt.taskId || "") === String(snapshot.session?.task_id || current.taskId || "")
            && String(existingCanonicalReceipt.groupId || "") === String(snapshot.session?.group_id || current.groupId || "")
            && String(existingCanonicalReceipt.project || "") === String(snapshot.session?.project || current.project || "")
            && String(existingCanonicalReceipt.memoryContextSnapshotId || "") === snapshotId
            && String(existingCanonicalReceipt.memoryContextSnapshotChecksum || "") === String(snapshot.checksum || "");
        const existingSyncCommit = fs.existsSync(syncCommitFile) ? safeReadJson(syncCommitFile, null) : null;
        const existingSyncCommitVerification = existingCanonicalReceiptValid
            ? verifyTaskAgentMemorySnapshotSyncCommit(existingSyncCommit, {
                groupId: String(snapshot.session?.group_id || current.groupId || ""),
                groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
                taskId: String(snapshot.session?.task_id || current.taskId || ""),
                taskAgentSessionId: id,
                targetProject: String(snapshot.session?.project || current.project || ""),
                snapshotId,
                snapshotChecksum: String(snapshot.checksum || ""),
                syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
                syncAction: String(memorySnapshotSync?.action || ""),
                memoryPromptInjectionProofChecksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
                deliveryReceiptId: String(existingCanonicalReceipt?.receiptId || ""),
                deliveryReceiptChecksum: String(existingCanonicalReceipt?.checksum || ""),
            })
            : { valid: false, committed: false };
        const preserveExistingCommittedBaseline = existingSyncCommitVerification.valid === true
            && existingSyncCommitVerification.committed === true
            && String(ref?.memorySnapshotSyncCommitChecksum || "") === String(existingSyncCommit?.commit_checksum || "");
        const syncCommitPayload = {
            schema: TASK_AGENT_MEMORY_SNAPSHOT_SYNC_COMMIT_SCHEMA,
            version: 1,
            status: syncCommitted ? "committed" : "rejected",
            committed: syncCommitted,
            group_id: String(snapshot.session?.group_id || current.groupId || ""),
            group_session_id: String(groupSessionMemoryBinding?.groupSessionId || ""),
            task_id: String(snapshot.session?.task_id || current.taskId || ""),
            task_agent_session_id: id,
            target_project: String(snapshot.session?.project || current.project || ""),
            snapshot_id: snapshotId,
            snapshot_checksum: String(snapshot.checksum || ""),
            sync_checksum: String(memorySnapshotSync?.sync_checksum || ""),
            sync_action: String(memorySnapshotSync?.action || ""),
            memory_prompt_injection_proof_checksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
            delivery_receipt_id: receiptId,
            delivery_receipt_checksum: receipt.checksum,
            delivery_status: receipt.status,
            committed_at: syncCommitted ? deliveredAt : "",
            rejected_at: syncCommitted ? "" : deliveredAt,
        };
        const syncCommitCandidate = {
            ...syncCommitPayload,
            commit_checksum: memorySnapshotSyncCommitChecksum(syncCommitPayload),
            commit_file: syncCommitFile,
        };
        const syncCommitVerification = verifyTaskAgentMemorySnapshotSyncCommit(syncCommitCandidate, {
            groupId: syncCommitCandidate.group_id,
            groupSessionId: syncCommitCandidate.group_session_id,
            taskId: syncCommitCandidate.task_id,
            taskAgentSessionId: id,
            targetProject: syncCommitCandidate.target_project,
            snapshotId,
            snapshotChecksum: syncCommitCandidate.snapshot_checksum,
            syncChecksum: syncCommitCandidate.sync_checksum,
            syncAction: syncCommitCandidate.sync_action,
            memoryPromptInjectionProofChecksum: syncCommitCandidate.memory_prompt_injection_proof_checksum,
            deliveryReceiptId: receiptId,
            deliveryReceiptChecksum: receipt.checksum,
        });
        if (!syncCommitVerification.valid) {
            throw new Error(`task Agent memory snapshot sync commit invalid: ${syncCommitVerification.issues.join(",")}`);
        }
        const syncCommit = preserveExistingCommittedBaseline ? existingSyncCommit : syncCommitCandidate;
        const syncCommitDisposition = preserveExistingCommittedBaseline
            ? "preserved_committed"
            : syncCommitted ? "committed" : "rejected";
        if (!preserveExistingCommittedBaseline)
            writeJsonAtomic(syncCommitFile, syncCommitCandidate);
        const canonicalReceipt = preserveExistingCommittedBaseline ? existingCanonicalReceipt : receipt;
        const nextRef = {
            ...(ref || {
                snapshotId,
                snapshotPath: snapshotFile,
                checksum: String(snapshot.checksum || ""),
                generatedAt: String(snapshot.generated_at || ""),
            }),
            deliveryReceiptId: String(canonicalReceipt?.receiptId || ""),
            deliveryReceiptPath: String(canonicalReceipt?.receiptFile || ""),
            deliveryReceiptChecksum: String(canonicalReceipt?.checksum || ""),
            deliveryStatus: String(canonicalReceipt?.status || ""),
            deliveredAt: String(canonicalReceipt?.deliveredAt || ""),
            latestDeliveryAttemptReceiptId: receiptId,
            latestDeliveryAttemptReceiptPath: receiptFile,
            latestDeliveryAttemptReceiptChecksum: receipt.checksum,
            latestDeliveryAttemptStatus: receipt.status,
            latestDeliveryAttemptAt: deliveredAt,
            memorySnapshotSyncCommitPath: syncCommitFile,
            memorySnapshotSyncCommitChecksum: syncCommit.commit_checksum,
            memorySnapshotSyncCommitStatus: syncCommit.status,
            memorySnapshotSyncCommittedAt: String(syncCommit?.committed_at || syncCommit?.rejected_at || ""),
        };
        if (refIndex >= 0)
            refs[refIndex] = nextRef;
        else
            refs.push(nextRef);
        const next = {
            ...current,
            memoryContextDeliveryReceiptId: String(canonicalReceipt?.receiptId || ""),
            memoryContextDeliveryReceiptPath: String(canonicalReceipt?.receiptFile || ""),
            memoryContextDeliveryReceiptChecksum: String(canonicalReceipt?.checksum || ""),
            memoryContextDeliveryStatus: String(canonicalReceipt?.status || ""),
            memoryContextDeliveredAt: String(canonicalReceipt?.deliveredAt || ""),
            latestMemoryContextDeliveryAttemptReceiptId: receiptId,
            latestMemoryContextDeliveryAttemptReceiptPath: receiptFile,
            latestMemoryContextDeliveryAttemptReceiptChecksum: receipt.checksum,
            latestMemoryContextDeliveryAttemptStatus: receipt.status,
            latestMemoryContextDeliveryAttemptAt: deliveredAt,
            memorySnapshotSyncCommitPath: syncCommitFile,
            memorySnapshotSyncCommitChecksum: syncCommit.commit_checksum,
            memorySnapshotSyncCommitStatus: syncCommit.status,
            memorySnapshotSyncCommittedAt: String(syncCommit?.committed_at || syncCommit?.rejected_at || ""),
            memoryContextSnapshots: refs.slice(-MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
            lastUsedAt: deliveredAt,
        };
        store.sessions[index] = next;
        saveStore(store);
        const groupSessionId = String(groupSessionMemoryBinding?.groupSessionId || "");
        const invocationEdgeId = String(input.invocationEdgeId || snapshot.context?.invocation_edge_id || "");
        const invocationEdge = groupSessionId.startsWith("gcs_") && invocationEdgeId
            ? (0, task_agent_invocation_lineage_1.readTaskAgentInvocationLineage)(String(receipt.groupId || current.groupId || ""), groupSessionId, id)
                .edges.find((edge) => edge.invocation_edge_id === invocationEdgeId) || null
            : null;
        if (groupSessionId.startsWith("gcs_") && receipt.runnerRequestId)
            (0, task_agent_continuation_soak_1.tryRecordTaskAgentContinuationSoakEvent)({
                groupId: String(receipt.groupId || current.groupId || ""),
                groupSessionId,
                taskAgentSessionId: id,
                phase: "task_artifact_committed",
                status: taskArtifactProven ? "proven" : "observed",
                eventKey: `task-artifact:${receipt.checksum}`,
                evidence: {
                    invocation_edge_id: invocationEdgeId,
                    runner_request_id: receipt.runnerRequestId,
                    memory_context_snapshot_id: snapshotId,
                    worker_context_packet_id: String(invocationEdge?.worker_context_packet_id || receipt.workerContextPacketId || ""),
                    compact_epoch: String(invocationEdge?.compact_epoch || "precompact"),
                    nativeContinuationEvidence: input.nativeContinuationEvidence || null,
                    recovery_outcome: String(input.recoveryOutcome || ""),
                    taskArtifactEvidence: {
                        taskArtifactProven,
                        taskOutputChecksum: outputChecksum,
                        fileChangeCount: fileChangeRows.length,
                        fileChangeChecksum,
                        fileChangePaths: fileChangeRows.map((item) => item.path),
                        memoryDeliveryReceiptChecksum: receipt.checksum,
                        memoryPromptChecksum: receipt.actualRenderedPromptChecksum,
                        memoryContextChecksum: receipt.memoryContextChecksum,
                        groupSessionMemoryBindingChecksum: receipt.groupSessionMemoryBindingChecksum,
                        compactTransactionReceiptChecksum: receipt.compactTransactionReceiptChecksum,
                        compactTransactionReceiptValid: receipt.compactTransactionReceiptValid,
                        compactTransactionBoundaryId: receipt.compactTransactionBoundaryId,
                        compactHeadFenceValid: receipt.compactHeadFenceValid,
                        compactHeadGeneration: receipt.compactHeadGeneration,
                        compactHeadChecksum: receipt.compactHeadChecksum,
                        sessionLifecycleFenceValid: receipt.sessionLifecycleFenceValid,
                        sessionLifecycleGeneration: receipt.sessionLifecycleGeneration,
                        sessionLifecycleHeadChecksum: receipt.sessionLifecycleHeadChecksum,
                    },
                },
                source: "task_agent_memory_delivery",
            });
        return { session: next, receipt, ref: nextRef, syncCommit, syncCommitDisposition };
    });
}
function readTaskAgentMemoryContextDeliveryReceipt(file) {
    const receipt = safeReadJson(String(file || ""), null);
    if (!receipt)
        return null;
    return { ...receipt, checksumValid: verifyMemoryContextDeliveryReceiptChecksum(receipt) };
}
function advanceTaskAgentSession(current, result = {}) {
    const errorText = String(result.error || "");
    const invalidNativeSession = result.nativeSessionInvalid === true || /(?:session|thread).*(?:not found|invalid|expired|不存在|无效|过期)|无法恢复.*(?:session|会话)/i.test(errorText);
    const nativeContinuationUnverified = result.nativeContinuationUnverified === true;
    const permissionDrift = result.permissionDrift === true;
    const continuationEvidence = result.nativeContinuationEvidence || null;
    const observedProviderContractId = String(continuationEvidence?.providerContractId || "").trim();
    const providerContractTrusted = continuationEvidence?.providerContractCurrentEvidenceVerified === true
        && continuationEvidence?.providerContractContinuityVerified === true
        && continuationEvidence?.nativeSessionReusable === true;
    const providerContractTransition = continuationEvidence?.providerContractTransition === true;
    const capturedNativeId = String(result.nativeSessionId || current.nativeSessionId || "").trim();
    const requiresCapturedId = current.resumeMode === "native"
        && (0, runtime_1.getAgentRuntime)(current.agentType).capabilities.sessionResume
        && (0, runtime_1.normalizeAgentRuntimeId)(current.agentType) !== "claudecode";
    const captureFailed = result.success !== false && requiresCapturedId && (!capturedNativeId || nativeContinuationUnverified);
    const previousIds = [...new Set([...(current.nativeSessionHistory || []), current.nativeSessionId].filter(Boolean))].slice(-10);
    const providerContractHistory = Array.isArray(current.providerContractHistory) ? current.providerContractHistory.slice(-19) : [];
    if (providerContractTrusted && observedProviderContractId && observedProviderContractId !== String(current.providerContractId || "")) {
        if (current.providerContractId)
            providerContractHistory.push({
                contractId: current.providerContractId,
                runtimeVersion: current.providerRuntimeVersion || "",
                runtimeIdentityChecksum: current.providerRuntimeIdentityChecksum || "",
                status: "superseded",
                at: new Date().toISOString(),
            });
    }
    const next = {
        ...current,
        nativeSessionId: permissionDrift ? createNativeSessionId(current.agentType) : invalidNativeSession || captureFailed ? "" : capturedNativeId,
        resumeMode: permissionDrift ? "native" : captureFailed ? "scratchpad" : invalidNativeSession && (0, runtime_1.getAgentRuntime)(current.agentType).capabilities.sessionResume ? "native" : current.resumeMode,
        nativeCaptureFailures: Number(current.nativeCaptureFailures || 0) + (captureFailed ? 1 : 0),
        nativeRecoveryAttempts: Number(current.nativeRecoveryAttempts || 0) + (invalidNativeSession || permissionDrift ? 1 : 0),
        nativeSessionHistory: previousIds,
        lastNativeRecoveryAt: invalidNativeSession || permissionDrift ? new Date().toISOString() : current.lastNativeRecoveryAt || "",
        turnCount: permissionDrift ? 0 : Number(current.turnCount || 0) + 1,
        lastTurnSucceeded: result.success !== false,
        lastError: permissionDrift ? "检测到实际只读权限与可写任务声明不一致；已隔离旧 native session，下轮创建可写恢复会话" : invalidNativeSession ? "原生会话已失效，下轮将创建恢复会话并承接工作区" : result.success === false ? (errorText || "Agent 执行失败") : nativeContinuationUnverified ? "CLI 续接输出契约未验证，已安全降级为 scratchpad 续跑" : captureFailed ? "CLI 未返回原生 session ID，已安全降级为 scratchpad 续跑" : "",
        permissionDriftCount: Number(current.permissionDriftCount || 0) + (permissionDrift ? 1 : 0),
        lastPermissionDriftAt: permissionDrift ? new Date().toISOString() : current.lastPermissionDriftAt || "",
        providerContractId: providerContractTrusted && observedProviderContractId ? observedProviderContractId : current.providerContractId || "",
        pendingProviderContractId: providerContractTrusted
            ? ""
            : observedProviderContractId && observedProviderContractId !== String(current.providerContractId || "")
                ? observedProviderContractId
                : current.pendingProviderContractId || "",
        providerRuntimeVersion: continuationEvidence?.providerRuntimeVersion || current.providerRuntimeVersion || "",
        providerRuntimeIdentityChecksum: continuationEvidence?.providerRuntimeIdentityChecksum || current.providerRuntimeIdentityChecksum || "",
        providerContractHistory: providerContractHistory.slice(-20),
        lastProviderContractTransitionAt: providerContractTransition ? new Date().toISOString() : current.lastProviderContractTransitionAt || "",
        lastUsedAt: new Date().toISOString(),
    };
    const identityHistory = Array.isArray(current.modelIdentityHistory) ? current.modelIdentityHistory.slice(-19) : [];
    if ((permissionDrift || invalidNativeSession) && (current.modelId || current.capacityEvidenceChecksum)) {
        identityHistory.push({
            provider: current.agentType,
            model: current.modelId || "",
            contextWindow: Number(current.modelContextWindow || 0),
            evidenceChecksum: current.capacityEvidenceChecksum || "",
            nativeSessionId: current.nativeSessionId || "",
            status: "invalidated",
            reason: permissionDrift ? "permission_drift_new_native_session" : "native_session_invalid_or_expired",
            at: new Date().toISOString(),
        });
        next.modelId = "";
        next.modelContextWindow = 0;
        next.capacityEvidenceChecksum = "";
        next.modelCapabilitySource = "";
        next.modelCapabilityCheckedAt = "";
    }
    const capabilityRecord = result.modelCapabilityRecord || result.nativeModelCapabilityRecord || null;
    const capabilityEntry = capabilityRecord?.recorded === true ? capabilityRecord.entry || {} : {};
    if (capabilityRecord?.recorded === true && !permissionDrift && !invalidNativeSession) {
        next.modelId = String(capabilityEntry.model || current.modelId || "");
        next.modelContextWindow = Number(capabilityEntry.contextWindow || current.modelContextWindow || 0);
        next.capacityEvidenceChecksum = String(capabilityEntry.checksum || current.capacityEvidenceChecksum || "");
        next.modelCapabilitySource = String(capabilityEntry.source || current.modelCapabilitySource || "");
        next.modelCapabilityCheckedAt = String(capabilityEntry.checkedAt || new Date().toISOString());
        const identity = {
            provider: next.agentType,
            model: next.modelId || "",
            contextWindow: Number(next.modelContextWindow || 0),
            evidenceChecksum: next.capacityEvidenceChecksum || "",
            nativeSessionId: next.nativeSessionId || "",
            status: "verified",
            reason: "native_model_capability_receipt",
            at: next.modelCapabilityCheckedAt,
        };
        const last = identityHistory[identityHistory.length - 1];
        if (!last || last.evidenceChecksum !== identity.evidenceChecksum || last.nativeSessionId !== identity.nativeSessionId)
            identityHistory.push(identity);
    }
    next.modelIdentityHistory = identityHistory.slice(-20);
    if (result.runtimeToolSnapshot && typeof result.runtimeToolSnapshot === "object") {
        next.runtimeSnapshotId = String(result.runtimeToolSnapshot.snapshotId || current.runtimeSnapshotId || "");
        next.runtimeSnapshotPath = String(result.runtimeToolSnapshot.snapshotPath || current.runtimeSnapshotPath || "");
        next.mcpConfigPath = String(result.runtimeToolSnapshot.mcpConfigPath || current.mcpConfigPath || "");
        next.allowedTools = result.runtimeToolSnapshot.allowedTools || current.allowedTools || null;
        next.permissionRules = Array.isArray(result.runtimeToolSnapshot.permissionRules)
            ? result.runtimeToolSnapshot.permissionRules.slice(0, 50)
            : current.permissionRules || [];
        next.runtimeToolUpdatedAt = new Date().toISOString();
    }
    return next;
}
function closeTaskAgentSessions(input, reason = "主 Agent 已完成最终验收") {
    if (!String(input.scopeId || "").trim() && !String(input.taskId || "").trim())
        return [];
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const now = new Date().toISOString();
        const closed = [];
        store.sessions = store.sessions.map((item) => {
            const matches = item.status === "open"
                && (!input.scopeId || item.scopeId === input.scopeId)
                && (!input.taskId || item.taskId === input.taskId)
                && (!input.groupId || item.groupId === input.groupId);
            if (!matches)
                return item;
            const next = { ...item, status: "closed", closedAt: now, closeReason: reason, lastUsedAt: now };
            closed.push(next);
            return next;
        });
        if (closed.length)
            saveStore(store);
        return closed;
    });
}
function reopenTaskAgentSessions(taskId, reason = "用户在同一任务中继续修改") {
    const id = String(taskId || "").trim();
    if (!id)
        return [];
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const now = new Date().toISOString();
        const latestByLane = new Map();
        for (const session of store.sessions) {
            if (session.taskId !== id && session.scopeId !== id)
                continue;
            const key = `${session.groupId}::${session.project}::${session.agentType}`;
            const previous = latestByLane.get(key);
            if (!previous || String(session.lastUsedAt || session.createdAt) > String(previous.lastUsedAt || previous.createdAt))
                latestByLane.set(key, session);
        }
        const ids = new Set(Array.from(latestByLane.values()).map(item => item.id));
        const reopened = [];
        store.sessions = store.sessions.map((session) => {
            if (!ids.has(session.id) || session.status === "open")
                return session;
            const next = { ...session, status: "open", closedAt: "", closeReason: "", lastUsedAt: now, lastError: reason };
            reopened.push(next);
            return next;
        });
        if (reopened.length)
            saveStore(store);
        return reopened;
    });
}
function getTaskAgentSessionOptions(session) {
    return {
        sessionId: session.nativeSessionId,
        resumeSession: session.resumeMode === "native" && session.turnCount > 0 && !!session.nativeSessionId,
        persistSession: session.resumeMode === "native",
        expectedProviderContractId: session.pendingProviderContractId || session.providerContractId || "",
        providerContractId: session.providerContractId || "",
        providerRuntimeVersion: session.providerRuntimeVersion || "",
        runtimeSnapshotId: session.runtimeSnapshotId || "",
        mcpConfigPath: session.mcpConfigPath || "",
    };
}
function getTaskAgentSessionContinuity(session) {
    return {
        mode: session.resumeMode,
        native: session.resumeMode === "native" && !!session.nativeSessionId,
        degraded: session.resumeMode === "scratchpad" && (0, runtime_1.getAgentRuntime)(session.agentType).capabilities.sessionResume,
        reason: session.lastError || "",
        turnCount: session.turnCount,
        recoveryAttempts: Number(session.nativeRecoveryAttempts || 0),
        previousNativeSessionIds: session.nativeSessionHistory || [],
        runtimeSnapshotId: session.runtimeSnapshotId || "",
        mcpConfigPath: session.mcpConfigPath || "",
        runtimeToolUpdatedAt: session.runtimeToolUpdatedAt || "",
        providerContractId: session.providerContractId || "",
        pendingProviderContractId: session.pendingProviderContractId || "",
        providerRuntimeVersion: session.providerRuntimeVersion || "",
        providerContractHistory: session.providerContractHistory || [],
    };
}
function listTaskAgentSessions(filter = {}) {
    return loadStore().sessions.filter((item) => (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
}
function sessionSnapshotContextWindow(session) {
    const snapshot = safeReadJson(String(session.memoryContextSnapshotPath || ""), null);
    return Number(session.modelContextWindow
        || snapshot?.context?.worker_context_packet?.model_context_capacity?.contextWindow
        || snapshot?.context?.worker_context_packet?.context_usage?.capacity_provenance?.contextWindow
        || 0);
}
function capacityRevalidationGroupSessionId(packet = {}) {
    const memory = packet?.memory || packet?.worker_context_packet?.memory || {};
    const groupMemory = memory?.schema === "ccm-group-memory-context-v1"
        ? memory
        : memory?.group_memory?.schema === "ccm-group-memory-context-v1" ? memory.group_memory : {};
    return String(packet?.group_session_id
        || packet?.groupSessionId
        || groupMemory?.group_session_id
        || groupMemory?.groupSessionId
        || packet?.post_turn_summary_delivery_capsule?.group_session_id
        || "").trim();
}
function markTaskAgentSessionsForCapacityDowngrade(input = {}) {
    const rawProvider = String(input.provider || input.agentType || input.agent_type || "").trim().toLowerCase();
    const runtime = runtime_1.AGENT_RUNTIMES.find(item => item.id === rawProvider || item.aliases.includes(rawProvider));
    if (!runtime)
        return { marked: 0, sessions: [], reason: "unsupported_provider" };
    const provider = runtime.id;
    const currentContextWindow = Math.max(0, Number(input.currentContextWindow || input.current_context_window || 0));
    if (!currentContextWindow)
        return { marked: 0, sessions: [] };
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const marked = [];
        const detectedAt = new Date().toISOString();
        store.sessions = store.sessions.map((session) => {
            if (session.status !== "open" || (0, runtime_1.normalizeAgentRuntimeId)(session.agentType) !== provider)
                return session;
            const previousContextWindow = sessionSnapshotContextWindow(session);
            if (!previousContextWindow || previousContextWindow <= currentContextWindow)
                return session;
            const gate = {
                schema: "ccm-task-agent-session-capacity-downgrade-gate-v1",
                provider,
                model: String(input.model || ""),
                previous_context_window: previousContextWindow,
                current_context_window: currentContextWindow,
                previous_evidence_checksum: String(session.capacityEvidenceChecksum || input.previousEvidenceChecksum || ""),
                current_evidence_checksum: String(input.currentEvidenceChecksum || ""),
                action: "rebuild_and_recompact_before_next_dispatch",
                detected_at: detectedAt,
            };
            marked.push({ sessionId: session.id, taskId: session.taskId, groupId: session.groupId, project: session.project, gate });
            gate.gate_id = `tacdg_${hashValue([session.id, provider, previousContextWindow, currentContextWindow, detectedAt], 24)}`;
            gate.gate_checksum = hashValue(gate, 64);
            return {
                ...session,
                capacityRevalidationRequired: true,
                capacityDowngradeGate: gate,
                capacityRevalidationProof: null,
                capacityRevalidationCommitReceipt: null,
                lastUsedAt: detectedAt,
            };
        });
        if (marked.length)
            saveStore(store);
        return { marked: marked.length, sessions: marked };
    });
}
function capacityRevalidationGateChecksum(gate) {
    const payload = { ...(gate || {}) };
    delete payload.gate_checksum;
    return hashValue(payload, 64);
}
function capacityRevalidationProofChecksum(proof) {
    const payload = { ...(proof || {}) };
    delete payload.proof_checksum;
    delete payload.checksum_valid;
    return hashValue(payload, 64);
}
function capacityRevalidationCommitChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    return hashValue(payload, 64);
}
function verifyTaskAgentSessionCapacityRevalidationProof(proof, session = null) {
    const issues = [];
    if (proof?.schema !== "ccm-task-agent-session-capacity-revalidation-proof-v1" || Number(proof?.version || 0) !== 1)
        issues.push("proof_schema_invalid");
    if (String(proof?.proof_checksum || "") !== capacityRevalidationProofChecksum(proof))
        issues.push("proof_checksum_invalid");
    if (!String(proof?.worker_context_packet_id || ""))
        issues.push("worker_context_packet_missing");
    if (!Number(proof?.packet_context_window || 0))
        issues.push("packet_context_window_missing");
    if (String(proof?.context_usage_status || "") === "over_budget")
        issues.push("packet_context_still_over_budget");
    if (proof?.typed_memory_capsule_present === true) {
        if (!String(proof?.typed_memory_capsule_checksum || ""))
            issues.push("typed_memory_capsule_checksum_missing");
        if (!Number(proof?.typed_memory_capsule_context_window || 0))
            issues.push("typed_memory_capsule_window_missing");
    }
    if (session) {
        if (String(proof?.task_agent_session_id || "") !== String(session.id || ""))
            issues.push("task_agent_session_mismatch");
        if (String(proof?.group_id || "") !== String(session.groupId || ""))
            issues.push("group_mismatch");
        if (String(proof?.task_id || "") !== String(session.taskId || ""))
            issues.push("task_mismatch");
        const gate = session.capacityDowngradeGate || null;
        if (String(proof?.capacity_downgrade_gate_checksum || "") !== capacityRevalidationGateChecksum(gate))
            issues.push("capacity_downgrade_gate_mismatch");
        const targetWindow = Number(gate?.current_context_window || 0);
        if (targetWindow > 0 && Number(proof?.packet_context_window || 0) > targetWindow)
            issues.push("packet_capacity_not_revalidated");
    }
    return { valid: issues.length === 0, issues };
}
function verifyTaskAgentSessionCapacityRevalidationCommitReceipt(receipt, proof = null) {
    const issues = [];
    if (receipt?.schema !== "ccm-task-agent-session-capacity-revalidation-commit-v1" || Number(receipt?.version || 0) !== 1)
        issues.push("receipt_schema_invalid");
    if (String(receipt?.receipt_checksum || "") !== capacityRevalidationCommitChecksum(receipt))
        issues.push("receipt_checksum_invalid");
    if (!String(receipt?.dispatch_witness_id || ""))
        issues.push("dispatch_witness_missing");
    if (proof && String(receipt?.capacity_revalidation_proof_checksum || "") !== String(proof?.proof_checksum || ""))
        issues.push("proof_checksum_mismatch");
    return { valid: issues.length === 0, issues };
}
function validateCapacityRevalidationPacket(current, packet = {}) {
    const capacity = packet?.model_context_capacity || packet?.context_usage?.capacity_provenance || {};
    const contextWindow = Number(capacity.contextWindow || 0);
    const targetWindow = Number(current.capacityDowngradeGate?.current_context_window || 0);
    if (!String(packet?.packet_id || ""))
        return { valid: false, reason: "worker_context_packet_missing" };
    if (!contextWindow || (targetWindow > 0 && contextWindow > targetWindow))
        return { valid: false, reason: "packet_capacity_not_revalidated" };
    const contextUsageStatus = String(packet?.context_usage?.status || "unknown");
    const typedMemoryCapsule = packet?.typed_memory_delivery_capsule || packet?.typedMemoryDeliveryCapsule || null;
    if (typedMemoryCapsule?.schema === "ccm-child-typed-memory-delivery-capsule-v1") {
        const capsuleBudget = typedMemoryCapsule.budget || {};
        const capsuleWindow = Number(capsuleBudget.model_context_window || typedMemoryCapsule.model_context_window || 0);
        const configuredMaxTokens = Number(capsuleBudget.configured_max_tokens || typedMemoryCapsule.configured_max_tokens || 0);
        const effectiveMaxTokens = Number(capsuleBudget.effective_max_tokens || typedMemoryCapsule.effective_max_tokens || 0);
        const expectedEffectiveMaxTokens = Math.min(configuredMaxTokens, Math.max(1000, Math.floor(capsuleWindow * 0.02)));
        if (typedMemoryCapsule.trusted_for_delivery !== true
            || !capsuleWindow
            || (targetWindow > 0 && capsuleWindow > targetWindow)
            || effectiveMaxTokens !== expectedEffectiveMaxTokens) {
            return { valid: false, reason: "typed_memory_capsule_capacity_not_revalidated" };
        }
    }
    if (["critical", "over_budget"].includes(contextUsageStatus))
        return { valid: false, reason: "packet_context_still_over_budget" };
    return { valid: true, capacity, contextWindow, contextUsageStatus, typedMemoryCapsule };
}
function prepareTaskAgentSessionCapacityRevalidation(sessionId, packet = {}) {
    const id = String(sessionId || "").trim();
    if (!id)
        return null;
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((session) => session.id === id);
        if (index < 0)
            return null;
        const current = store.sessions[index];
        if (current.capacityRevalidationRequired !== true)
            return { prepared: true, required: false, proof: null, session: current, reason: "capacity_revalidation_not_required" };
        const validated = validateCapacityRevalidationPacket(current, packet);
        if (!validated.valid)
            return { prepared: false, required: true, proof: null, session: current, reason: validated.reason };
        const typedMemoryCapsule = validated.typedMemoryCapsule;
        const capsuleBudget = typedMemoryCapsule?.budget || {};
        const groupSessionId = capacityRevalidationGroupSessionId(packet);
        const proof = {
            schema: "ccm-task-agent-session-capacity-revalidation-proof-v1",
            version: 1,
            proof_id: `tacrp_${hashValue([current.id, current.capacityDowngradeGate, packet.packet_id, typedMemoryCapsule?.capsule_checksum || ""], 24)}`,
            task_agent_session_id: current.id,
            group_id: current.groupId,
            group_session_id: groupSessionId,
            task_id: current.taskId,
            project: current.project,
            provider: (0, runtime_1.normalizeAgentRuntimeId)(current.agentType),
            capacity_downgrade_gate_id: String(current.capacityDowngradeGate?.gate_id || ""),
            capacity_downgrade_gate_checksum: capacityRevalidationGateChecksum(current.capacityDowngradeGate),
            worker_context_packet_id: String(packet.packet_id || ""),
            worker_context_memory_checksum: hashValue(packet.memory || {}, 64),
            packet_context_window: validated.contextWindow,
            packet_capacity_evidence_checksum: String(validated.capacity?.evidenceChecksum || ""),
            context_usage_status: validated.contextUsageStatus,
            typed_memory_capsule_present: typedMemoryCapsule?.schema === "ccm-child-typed-memory-delivery-capsule-v1",
            typed_memory_capsule_checksum: String(typedMemoryCapsule?.capsule_checksum || ""),
            typed_memory_capsule_context_window: Number(capsuleBudget.model_context_window || typedMemoryCapsule?.model_context_window || 0),
            typed_memory_capsule_effective_tokens: Number(capsuleBudget.effective_max_tokens || typedMemoryCapsule?.effective_max_tokens || 0),
            prepared_at: new Date().toISOString(),
            state: "prepared",
        };
        proof.proof_checksum = capacityRevalidationProofChecksum(proof);
        const next = { ...current, capacityRevalidationProof: proof, lastUsedAt: proof.prepared_at };
        store.sessions[index] = next;
        saveStore(store);
        if (groupSessionId.startsWith("gcs_"))
            (0, task_agent_continuation_soak_1.tryRecordTaskAgentContinuationSoakEvent)({
                groupId: current.groupId,
                groupSessionId,
                taskAgentSessionId: current.id,
                phase: "capacity_revalidation_prepared",
                status: "pending",
                eventKey: `capacity:prepared:${proof.proof_checksum}`,
                evidence: { capacityRevalidationProof: proof, invocation_edge_id: packet?.task_agent_invocation_lineage?.invocation_edge_id || "" },
                source: "capacity_runtime",
            });
        return { prepared: true, required: true, proof, session: next, reason: "packet_rebuilt_under_downgraded_capacity_prepared" };
    });
}
function commitTaskAgentSessionCapacityRevalidation(sessionId, proof, dispatchWitness = {}) {
    const id = String(sessionId || "").trim();
    if (!id)
        return null;
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const index = store.sessions.findIndex((session) => session.id === id);
        if (index < 0)
            return null;
        const current = store.sessions[index];
        if (current.capacityRevalidationRequired !== true) {
            const existing = current.capacityRevalidationCommitReceipt || null;
            return { acknowledged: !!existing, committed: !!existing, idempotent: true, receipt: existing, session: current, reason: existing ? "capacity_revalidation_already_committed" : "capacity_revalidation_not_required" };
        }
        const validation = verifyTaskAgentSessionCapacityRevalidationProof(proof, current);
        if (!validation.valid)
            return { acknowledged: false, committed: false, session: current, reason: validation.issues[0] || "capacity_revalidation_proof_invalid", issues: validation.issues };
        if (String(current.capacityRevalidationProof?.proof_checksum || "") !== String(proof?.proof_checksum || "")) {
            return { acknowledged: false, committed: false, session: current, reason: "capacity_revalidation_prepared_proof_mismatch" };
        }
        const walChecksum = String(dispatchWitness.typedMemoryDispatchWalRecordChecksum || dispatchWitness.typed_memory_dispatch_wal_record_checksum || "");
        const walState = String(dispatchWitness.typedMemoryDispatchWalState || dispatchWitness.typed_memory_dispatch_wal_state || "");
        const runnerRequestId = String(dispatchWitness.runnerRequestId || dispatchWitness.runner_request_id || "");
        const runnerStarted = dispatchWitness.runnerStarted === true || dispatchWitness.runner_started === true;
        const walStarted = !!walChecksum && ["dispatch_started", "runner_returned", "committed"].includes(walState);
        const runnerReturned = !!runnerRequestId && runnerStarted;
        if (!walStarted && !runnerReturned) {
            return { acknowledged: false, committed: false, session: current, reason: "durable_dispatch_witness_missing" };
        }
        const committedAt = new Date().toISOString();
        const receipt = {
            schema: "ccm-task-agent-session-capacity-revalidation-commit-v1",
            version: 1,
            receipt_id: `tacrc_${hashValue([proof.proof_checksum, walChecksum, walState, runnerRequestId, committedAt], 24)}`,
            task_agent_session_id: current.id,
            group_id: current.groupId,
            task_id: current.taskId,
            capacity_revalidation_proof_id: String(proof.proof_id || ""),
            capacity_revalidation_proof_checksum: String(proof.proof_checksum || ""),
            worker_context_packet_id: String(proof.worker_context_packet_id || ""),
            dispatch_witness_kind: walStarted ? "typed_memory_dispatch_wal" : "runner_returned",
            dispatch_witness_id: walStarted ? walChecksum : runnerRequestId,
            typed_memory_dispatch_wal_record_checksum: walChecksum,
            typed_memory_dispatch_wal_state: walState,
            runner_request_id: runnerRequestId,
            committed_at: committedAt,
        };
        receipt.receipt_checksum = capacityRevalidationCommitChecksum(receipt);
        const next = {
            ...current,
            modelContextWindow: Number(proof.packet_context_window || current.modelContextWindow || 0),
            capacityEvidenceChecksum: String(proof.packet_capacity_evidence_checksum || current.capacityEvidenceChecksum || ""),
            capacityRevalidationRequired: false,
            capacityDowngradeGate: null,
            capacityRevalidationProof: proof,
            capacityRevalidationCommitReceipt: receipt,
            lastUsedAt: committedAt,
        };
        store.sessions[index] = next;
        saveStore(store);
        const groupSessionId = String(proof?.group_session_id || "");
        if (groupSessionId.startsWith("gcs_"))
            (0, task_agent_continuation_soak_1.tryRecordTaskAgentContinuationSoakEvent)({
                groupId: current.groupId,
                groupSessionId,
                taskAgentSessionId: current.id,
                phase: "capacity_revalidation_committed",
                status: "committed",
                eventKey: `capacity:committed:${receipt.receipt_checksum}`,
                evidence: { capacityRevalidationProof: proof, capacityRevalidationCommitReceipt: receipt },
                source: "capacity_runtime",
            });
        return { acknowledged: true, committed: true, proof, receipt, session: next, reason: "packet_rebuilt_under_downgraded_capacity_committed" };
    });
}
function acknowledgeTaskAgentSessionCapacityRevalidation(sessionId, packet = {}, dispatchWitness = {}) {
    const prepared = prepareTaskAgentSessionCapacityRevalidation(sessionId, packet);
    if (!prepared?.prepared || prepared.required !== true) {
        return { acknowledged: prepared?.prepared === true, committed: prepared?.required !== true, ...prepared };
    }
    return commitTaskAgentSessionCapacityRevalidation(sessionId, prepared.proof, dispatchWitness);
}
function runTaskAgentSessionModelIdentitySelfTest() {
    const base = {
        id: "tas-model-identity-selftest",
        scopeId: "task-model-identity-selftest",
        taskId: "task-model-identity-selftest",
        groupId: "group-model-identity-selftest",
        project: "project-model-identity-selftest",
        agentType: "codex",
        nativeSessionId: "thread-model-identity-selftest",
        resumeMode: "native",
        status: "open",
        turnCount: 1,
        lastTurnSucceeded: true,
        createdAt: "2026-07-12T00:00:00.000Z",
        lastUsedAt: "2026-07-12T00:00:00.000Z",
        closedAt: "",
        closeReason: "",
    };
    const next = advanceTaskAgentSession(base, {
        nativeSessionId: base.nativeSessionId,
        success: true,
        nativeModelCapabilityRecord: {
            recorded: true,
            entry: {
                model: "gpt-phase219",
                contextWindow: 516_000,
                checksum: "capacity-checksum-phase219",
                source: "native_executor_receipt",
                checkedAt: "2026-07-12T01:00:00.000Z",
            },
        },
    });
    const checks = {
        modelIdPersists: next.modelId === "gpt-phase219",
        contextWindowPersists: next.modelContextWindow === 516_000,
        evidenceChecksumPersists: next.capacityEvidenceChecksum === "capacity-checksum-phase219",
        sourceAndTimePersist: next.modelCapabilitySource === "native_executor_receipt" && next.modelCapabilityCheckedAt === "2026-07-12T01:00:00.000Z",
        nativeSessionContinuityPreserved: next.nativeSessionId === base.nativeSessionId && next.turnCount === 2,
        verifiedIdentityAddedToHistory: next.modelIdentityHistory?.some(item => item.status === "verified" && item.model === "gpt-phase219") === true,
    };
    const drifted = advanceTaskAgentSession(next, { success: false, permissionDrift: true, error: "sandbox read-only" });
    const driftChecks = {
        permissionDriftClearsActiveModel: drifted.modelId === "" && drifted.modelContextWindow === 0 && drifted.capacityEvidenceChecksum === "",
        permissionDriftArchivesIdentity: drifted.modelIdentityHistory?.some(item => item.status === "invalidated" && item.reason === "permission_drift_new_native_session" && item.model === "gpt-phase219") === true,
    };
    return { pass: Object.values({ ...checks, ...driftChecks }).every(Boolean), checks: { ...checks, ...driftChecks }, session: next, drifted };
}
function listTaskAgentMemoryContextSnapshots(filter = {}) {
    const sessions = loadStore().sessions.filter((item) => (!filter.sessionId || item.id === filter.sessionId)
        && (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
    const snapshots = [];
    for (const session of sessions) {
        const refs = normalizeMemorySnapshotRefs([
            ...(session.memoryContextSnapshots || []),
            session.memoryContextSnapshotId || session.memoryContextSnapshotPath ? {
                snapshotId: session.memoryContextSnapshotId || "",
                snapshotPath: session.memoryContextSnapshotPath || "",
                checksum: session.memoryContextSnapshotChecksum || "",
                workerContextPacketId: session.memoryContextPacketId || "",
                generatedAt: session.memoryContextSnapshotAt || "",
            } : null,
        ].filter(Boolean));
        const seen = new Set();
        for (const ref of refs) {
            const key = ref.snapshotId || ref.snapshotPath;
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            const loaded = safeReadJson(ref.snapshotPath, null);
            const deliveryReceipt = ref.deliveryReceiptPath ? safeReadJson(ref.deliveryReceiptPath, null) : null;
            snapshots.push({
                ...(loaded || {}),
                schema: loaded?.schema || "ccm-task-agent-memory-context-snapshot-ref-v1",
                snapshot_id: loaded?.snapshot_id || ref.snapshotId,
                snapshot_file: loaded?.snapshot_file || ref.snapshotPath,
                checksum: loaded?.checksum || ref.checksum,
                generated_at: loaded?.generated_at || ref.generatedAt,
                session: loaded?.session || {
                    id: session.id,
                    scope_id: session.scopeId,
                    task_id: session.taskId,
                    group_id: session.groupId,
                    project: session.project,
                    agent_type: session.agentType,
                    native_session_id: session.nativeSessionId,
                    turn: session.turnCount,
                    resume_mode: session.resumeMode,
                },
                ref,
                delivery_receipt: deliveryReceipt,
                delivery_receipt_checksum_valid: deliveryReceipt ? verifyMemoryContextDeliveryReceiptChecksum(deliveryReceipt) : false,
            });
        }
    }
    return snapshots.sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
}
function taskAgentMemorySnapshotMatchesFilter(row, filter = {}) {
    const session = row?.session || {};
    return (!filter.sessionId || session.id === filter.sessionId)
        && (!filter.scopeId || session.scope_id === filter.scopeId || session.scopeId === filter.scopeId)
        && (!filter.taskId || session.task_id === filter.taskId || session.taskId === filter.taskId)
        && (!filter.groupId || session.group_id === filter.groupId || session.groupId === filter.groupId)
        && (!filter.project || session.project === filter.project)
        && (!filter.status || row.status === filter.status || session.status === filter.status);
}
function buildTaskAgentMemorySnapshotRow(input) {
    const loaded = input.loaded || null;
    const loadedSession = loaded?.session || {};
    const session = input.session || null;
    const actualFile = String(input.actualFile || input.ref?.snapshotPath || loaded?.snapshot_file || "").trim();
    const fileExists = !!actualFile && fs.existsSync(actualFile);
    const stat = (() => {
        try {
            return fileExists ? fs.statSync(actualFile) : null;
        }
        catch {
            return null;
        }
    })();
    const generatedAt = String(loaded?.generated_at || input.ref?.generatedAt || (stat ? stat.mtime.toISOString() : "") || "").trim();
    const generatedMs = Date.parse(generatedAt || "");
    const ageMs = Number.isFinite(generatedMs) ? Math.max(0, input.nowMs - generatedMs) : stat ? Math.max(0, input.nowMs - stat.mtimeMs) : null;
    const ageDays = ageMs === null ? null : Math.round((ageMs / (24 * 60 * 60 * 1000)) * 10) / 10;
    const context = loaded?.context || {};
    const memoryContext = context.memory_context || context.worker_context_packet?.memory || null;
    const groupMemoryContext = memoryContext?.group_memory || memoryContext?.groupMemory || memoryContext || {};
    const postTurnSummaryState = groupMemoryContext?.group_state?.postTurnSummaries || groupMemoryContext?.group_state?.post_turn_summaries || {};
    const postTurnSummaryExpected = groupMemoryContext?.memory_policy?.ignored !== true
        && Array.isArray(postTurnSummaryState.latest)
        && postTurnSummaryState.latest.length > 0
        && String(loadedSession.id || input.session?.id || "").startsWith("tas_");
    const postTurnSummaryCapsuleInput = context.post_turn_summary_delivery_capsule
        || context.worker_context_packet?.post_turn_summary_delivery_capsule
        || (0, group_post_turn_summary_1.extractGroupPostTurnSummaryDeliveryCapsule)(memoryContext || null);
    const invocationLineage = context.task_agent_invocation_lineage || context.worker_context_packet?.task_agent_invocation_lineage || null;
    const postTurnSummaryCapsule = (0, group_post_turn_summary_1.validateGroupPostTurnSummaryDeliveryCapsule)(postTurnSummaryCapsuleInput, {
        expectedBinding: {
            group_id: String(loadedSession.group_id || input.session?.groupId || ""),
            task_id: String(loadedSession.task_id || input.session?.taskId || ""),
            target_project: String(loadedSession.project || input.session?.project || ""),
            task_agent_session_id: String(loadedSession.id || input.session?.id || ""),
            native_session_id: String(loadedSession.native_session_id || input.session?.nativeSessionId || ""),
            attempt_sequence: Number(loadedSession.turn || 0),
            invocation_kind: Number(loadedSession.turn || 0) > 1 ? "resume" : "spawn",
            ...(invocationLineage?.invocation_edge_id ? {
                invocation_edge_id: invocationLineage.invocation_edge_id,
                parent_invocation_edge_id: invocationLineage.parent_invocation_edge_id || "",
                root_invocation_edge_id: invocationLineage.root_invocation_edge_id || "",
                branch_id: invocationLineage.branch_id || "",
                parent_branch_id: invocationLineage.parent_branch_id || "",
                branch_kind: invocationLineage.branch_kind || "main",
                expected_lineage_head_checksum: invocationLineage.expected_lineage_head_checksum || "",
            } : {}),
        },
    });
    const postTurnSummaryCapsulePresent = !!postTurnSummaryCapsuleInput?.schema;
    const postTurnSummaryCapsuleValid = postTurnSummaryCapsule?.trusted_for_delivery === true;
    const postTurnSummaryCapsulePromptBound = context.post_turn_summary_capsule_prompt_bound === true;
    const snapshotCompactEpoch = String(groupMemoryContext?.group_state?.typedMemory?.ledger?.compactEpoch || groupMemoryContext?.group_state?.typed_memory?.ledger?.compact_epoch || "");
    const postTurnSummaryCapsuleCompactEpochBound = !postTurnSummaryCapsulePresent || !snapshotCompactEpoch
        || String(postTurnSummaryCapsule?.compact_epoch || "") === snapshotCompactEpoch;
    const snapshotLedgerHead = String(postTurnSummaryState.headChecksum || postTurnSummaryState.head_checksum || "");
    const postTurnSummaryCapsuleLedgerHeadBound = !postTurnSummaryCapsulePresent || !snapshotLedgerHead
        || String(postTurnSummaryCapsule?.ledger_head_checksum || "") === snapshotLedgerHead;
    const snapshotSummaryIds = new Set((Array.isArray(postTurnSummaryState.latest) ? postTurnSummaryState.latest : []).map((row) => String(row.summaryId || row.summary_id || "")));
    const postTurnSummaryCapsuleSelectionBound = !postTurnSummaryCapsulePresent
        || (postTurnSummaryCapsule?.selected_summaries || []).every((row) => snapshotSummaryIds.has(String(row.summary_id || "")));
    const invocationEdgeId = String(invocationLineage?.invocation_edge_id || postTurnSummaryCapsule?.invocation_edge_id || input.ref?.invocationEdgeId || "");
    const invocationEdge = (() => {
        if (!invocationEdgeId)
            return null;
        try {
            const ledger = (0, task_agent_invocation_lineage_1.readTaskAgentInvocationLineage)(String(loadedSession.group_id || input.session?.groupId || ""), String(postTurnSummaryCapsule?.group_session_id || groupMemoryContext?.group_session_id || ""), String(loadedSession.id || input.session?.id || ""));
            return ledger.edges.find((edge) => edge.invocation_edge_id === invocationEdgeId) || null;
        }
        catch {
            return null;
        }
    })();
    const invocationLineageExpected = !!postTurnSummaryCapsule?.invocation_edge_id;
    const invocationLineageBound = !invocationLineageExpected || !!invocationLineage
        && invocationEdgeId === String(postTurnSummaryCapsule?.invocation_edge_id || "")
        && String(invocationLineage.branch_id || "") === String(postTurnSummaryCapsule?.branch_id || "")
        && String(invocationLineage.parent_invocation_edge_id || "") === String(postTurnSummaryCapsule?.parent_invocation_edge_id || "");
    const invocationLedgerBound = !invocationLineageExpected || !!invocationEdge
        && invocationEdge.group_id === String(loadedSession.group_id || input.session?.groupId || "")
        && invocationEdge.group_session_id === String(postTurnSummaryCapsule?.group_session_id || "")
        && invocationEdge.task_agent_session_id === String(loadedSession.id || input.session?.id || "")
        && invocationEdge.task_id === String(loadedSession.task_id || input.session?.taskId || "")
        && invocationEdge.target_project === String(loadedSession.project || input.session?.project || "");
    const groupSessionMemoryBinding = context.group_session_memory_binding || extractGroupSessionMemoryBinding(memoryContext || {});
    const memorySnapshotSync = context.memory_snapshot_sync || null;
    const memorySnapshotSyncPresent = memorySnapshotSync?.schema === TASK_AGENT_MEMORY_SNAPSHOT_SYNC_SCHEMA;
    const memorySnapshotSyncVerification = memorySnapshotSyncPresent
        ? verifyTaskAgentMemorySnapshotSyncDecision(memorySnapshotSync, {
            groupId: String(loadedSession.group_id || session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(loadedSession.task_id || session?.taskId || ""),
            taskAgentSessionId: String(loadedSession.id || session?.id || ""),
            targetProject: String(loadedSession.project || session?.project || ""),
            currentMemoryContextChecksum: String(context.memory_context_checksum || ""),
        })
        : { valid: false, issues: ["memory_snapshot_sync_missing"], action: "" };
    const memoryEntrySync = context.memory_entry_sync || (0, task_agent_memory_entry_sync_1.taskAgentMemoryEntrySyncPlan)(memoryContext);
    const memoryEntrySyncPresent = !!memoryEntrySync?.schema;
    const memoryEntrySyncVerification = memoryEntrySyncPresent
        ? (0, task_agent_memory_entry_sync_1.verifyTaskAgentMemoryEntrySyncPlan)(memoryEntrySync, {
            groupId: String(loadedSession.group_id || session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(loadedSession.task_id || session?.taskId || ""),
            taskAgentSessionId: String(loadedSession.id || session?.id || ""),
            targetProject: String(loadedSession.project || session?.project || ""),
            sourceMemoryContextChecksum: (0, task_agent_memory_entry_sync_1.taskAgentMemorySemanticChecksum)(memoryContext),
        })
        : { valid: false, issues: ["memory_entry_sync_missing"], mode: "" };
    const memoryEntryManifest = memoryEntrySync?.current_manifest || null;
    const rebuiltMemoryEntryManifest = memoryEntrySyncPresent ? (0, task_agent_memory_entry_sync_1.buildTaskAgentMemoryEntryManifest)((0, task_agent_memory_entry_sync_1.stripTaskAgentMemoryEntrySync)(memoryContext)) : null;
    const memoryEntryManifestCurrent = memoryEntrySyncPresent
        && String(memoryEntryManifest?.manifest_checksum || "") === String(rebuiltMemoryEntryManifest?.manifest_checksum || "");
    const memoryPromptInjectionProof = context.memory_prompt_injection_proof || null;
    const memoryPromptInjectionProofPresent = memoryPromptInjectionProof?.schema === TASK_AGENT_MEMORY_PROMPT_INJECTION_PROOF_SCHEMA;
    const memoryPromptInjectionVerification = memoryPromptInjectionProofPresent
        ? verifyTaskAgentMemoryPromptInjectionProof(memoryPromptInjectionProof, {
            groupId: String(loadedSession.group_id || session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(loadedSession.task_id || session?.taskId || ""),
            taskAgentSessionId: String(loadedSession.id || session?.id || ""),
            targetProject: String(loadedSession.project || session?.project || ""),
            memoryContextChecksum: String(context.memory_context_checksum || ""),
            syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
            renderedPromptChecksum: String(context.rendered_prompt_checksum || ""),
        })
        : {
            valid: false,
            issues: ["memory_prompt_injection_proof_missing"],
            deliveryReady: false,
            promptBound: false,
            projectionPresent: false,
            injectionRequired: false,
            enforcementRequired: false,
            trustedEnvelopeRequired: false,
            trustedEnvelopePresent: false,
            trustedEnvelopeValid: false,
            trustedEnvelopeBound: false,
            status: "missing",
        };
    const finalDispatchPayloadGate = context.final_dispatch_payload_gate
        || context.worker_context_packet?.final_dispatch_payload_gate
        || null;
    const finalDispatchPayloadGatePresent = finalDispatchPayloadGate?.schema === "ccm-final-worker-dispatch-payload-gate-v1";
    const finalDispatchPayloadGateVerification = finalDispatchPayloadGatePresent
        ? (0, final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate)(finalDispatchPayloadGate, {
            groupId: String(loadedSession.group_id || input.session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || capacityRevalidationGroupSessionId(context.worker_context_packet || {})),
            taskId: String(loadedSession.task_id || input.session?.taskId || ""),
            taskAgentSessionId: String(loadedSession.id || input.session?.id || ""),
            workerContextPacketId: String(context.worker_context_packet_id || context.worker_context_packet?.packet_id || ""),
        })
        : { valid: false, issues: ["final_dispatch_payload_gate_missing"] };
    const finalDispatchPromptBound = finalDispatchPayloadGatePresent
        && String(finalDispatchPayloadGate.prompt_checksum || "") === String(context.final_dispatch_prompt_checksum || "")
        && Number(finalDispatchPayloadGate.estimated_total_input_tokens || 0) === Number(context.final_dispatch_prompt_tokens || 0)
        && Number(finalDispatchPayloadGate.prompt_chars || 0) === Number(context.final_dispatch_prompt_chars || 0);
    const finalDispatchStatus = String(finalDispatchPayloadGate?.status || "missing");
    const finalDispatchReactiveCompact = context.final_dispatch_reactive_compact
        || context.worker_context_packet?.final_dispatch_reactive_compact
        || null;
    const finalDispatchReactiveCompactPresent = finalDispatchReactiveCompact?.schema === "ccm-final-dispatch-reactive-compact-v1";
    const finalDispatchReactiveCompactVerification = finalDispatchReactiveCompactPresent
        ? (0, final_dispatch_reactive_compact_1.verifyFinalDispatchReactiveCompactReceipt)(finalDispatchReactiveCompact, {
            groupId: String(loadedSession.group_id || input.session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || capacityRevalidationGroupSessionId(context.worker_context_packet || {})),
            taskId: String(loadedSession.task_id || input.session?.taskId || ""),
            taskAgentSessionId: String(loadedSession.id || input.session?.id || ""),
            workerContextPacketId: String(context.worker_context_packet_id || context.worker_context_packet?.packet_id || ""),
        })
        : { valid: true, issues: [] };
    const finalDispatchReactiveCompactBound = !finalDispatchReactiveCompactPresent
        || String(finalDispatchReactiveCompact.recovered_prompt_checksum || "") === String(finalDispatchPayloadGate?.prompt_checksum || "")
            && Number(finalDispatchReactiveCompact.recovered_prompt_tokens || 0) === Number(finalDispatchPayloadGate?.estimated_total_input_tokens || 0)
            && (finalDispatchReactiveCompact.status !== "recovered" || finalDispatchStatus === "ready");
    const finalDispatchReactiveCompactCircuitBreaker = session?.finalDispatchReactiveCompactCircuitBreaker || null;
    const finalDispatchReactiveCompactCircuitBreakerPresent = finalDispatchReactiveCompactCircuitBreaker?.schema === "ccm-final-dispatch-reactive-compact-circuit-breaker-v1";
    const finalDispatchReactiveCompactCircuitBreakerVerification = finalDispatchReactiveCompactCircuitBreakerPresent
        ? verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(finalDispatchReactiveCompactCircuitBreaker, {
            groupId: String(loadedSession.group_id || session?.groupId || ""),
            groupSessionId: String(finalDispatchPayloadGate?.group_session_id || capacityRevalidationGroupSessionId(context.worker_context_packet || {})),
            taskId: String(loadedSession.task_id || session?.taskId || ""),
            taskAgentSessionId: String(loadedSession.id || session?.id || ""),
        })
        : { valid: true, issues: [] };
    const finalDispatchLineageProofRequired = finalDispatchStatus === "ready" && !!invocationEdgeId;
    const finalDispatchLineageProofValid = !finalDispatchLineageProofRequired || !!invocationEdge
        && invocationEdge.final_dispatch_payload_gate_dispatch_valid === true
        && String(invocationEdge.final_dispatch_payload_gate_checksum || "") === String(finalDispatchPayloadGate?.gate_checksum || "");
    const gateIds = Array.isArray(context.gate_ids || input.ref?.gateIds)
        ? (context.gate_ids || input.ref?.gateIds).map((id) => String(id || "").trim()).filter(Boolean)
        : [];
    const workerContextPacketId = String(context.worker_context_packet_id || input.ref?.workerContextPacketId || "").trim();
    const snapshotId = String(loaded?.snapshot_id || input.ref?.snapshotId || path.basename(actualFile || "", ".json") || "").trim();
    const sessionId = String(loadedSession.id || session?.id || "").trim();
    const expectedSessionId = String(session?.id || "").trim();
    const sessionBound = input.source === "session_ref"
        ? !!expectedSessionId && (!loaded || String(loadedSession.id || "") === expectedSessionId)
        : false;
    const schemaOk = loaded?.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA;
    const checksumMatches = !!loaded && verifyMemoryContextSnapshotChecksum(loaded);
    const memoryContextPresent = hasMeaningfulMemoryContext(memoryContext);
    const deliveryReceiptFile = String(input.ref?.deliveryReceiptPath
        || (input.ref?.snapshotId && input.ref.snapshotId === session?.memoryContextSnapshotId ? session?.memoryContextDeliveryReceiptPath : "")
        || "").trim();
    const deliveryReceipt = deliveryReceiptFile ? safeReadJson(deliveryReceiptFile, null) : null;
    const deliveryReceiptChecksumValid = !!deliveryReceipt && verifyMemoryContextDeliveryReceiptChecksum(deliveryReceipt);
    const providerMemoryTransportUsage = deliveryReceipt?.providerMemoryTransportUsage || null;
    const providerMemoryTransportUsagePresent = !!providerMemoryTransportUsage?.schema;
    const providerMemoryTransportUsageVerification = providerMemoryTransportUsagePresent
        ? (0, task_agent_memory_transport_usage_1.verifyTaskAgentMemoryTransportUsageReceipt)(providerMemoryTransportUsage, {
            groupId: String(loadedSession.group_id || session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(loadedSession.task_id || session?.taskId || ""),
            taskAgentSessionId: sessionId,
            targetProject: String(loadedSession.project || session?.project || ""),
            snapshotId,
            snapshotChecksum: String(loaded?.checksum || input.ref?.checksum || ""),
            runnerRequestId: String(deliveryReceipt?.runnerRequestId || ""),
            provider: String(deliveryReceipt?.runtime || session?.agentType || ""),
            nativeSessionId: String(deliveryReceipt?.nativeSessionId || ""),
            transportMode: String(memoryEntrySync?.transport_mode || "legacy"),
        })
        : { valid: false, issues: ["memory_transport_usage_missing"] };
    const memoryContinuationBaselineVerification = deliveryReceipt
        ? verifyTaskAgentMemoryContinuationBaselineDelivery(loaded, {
            runtime: deliveryReceipt.runtime,
            nativeSessionId: deliveryReceipt.nativeSessionId,
            runnerRequestId: deliveryReceipt.runnerRequestId,
            nativeContinuationEvidence: deliveryReceipt.nativeContinuationEvidence,
        })
        : {
            required: String(memorySnapshotSync?.action || "") === "none"
                && memorySnapshotSync?.continuation_baseline_required === true
                && memoryPromptInjectionVerification.promptBound !== true,
            valid: false,
            status: "missing_delivery_receipt",
            issues: ["delivery_receipt_missing"],
            evidenceChecksum: "",
        };
    const deliverySnapshotBound = !!deliveryReceipt
        && String(deliveryReceipt.memoryContextSnapshotId || "") === snapshotId
        && String(deliveryReceipt.memoryContextSnapshotChecksum || "") === String(loaded?.checksum || input.ref?.checksum || "")
        && String(deliveryReceipt.taskAgentSessionId || "") === sessionId;
    const deliveryGroupSessionBound = !deliveryReceipt || !groupSessionMemoryBinding?.scopeId
        || String(deliveryReceipt.groupSessionMemoryBinding?.scopeId || "") === String(groupSessionMemoryBinding.scopeId || "")
            && String(deliveryReceipt.groupSessionMemoryBinding?.checksum || "") === String(groupSessionMemoryBinding.checksum || "");
    const memoryContextDelivered = deliveryReceipt?.delivered === true
        && deliveryReceipt?.status === "delivered"
        && deliveryReceiptChecksumValid
        && deliverySnapshotBound
        && deliveryGroupSessionBound;
    const latestDeliveryAttemptReceiptFile = String(input.ref?.latestDeliveryAttemptReceiptPath
        || (input.ref?.snapshotId && input.ref.snapshotId === session?.memoryContextSnapshotId ? session?.latestMemoryContextDeliveryAttemptReceiptPath : "")
        || "").trim();
    const latestDeliveryAttemptReceipt = latestDeliveryAttemptReceiptFile
        ? safeReadJson(latestDeliveryAttemptReceiptFile, null)
        : null;
    const latestDeliveryAttemptPresent = !!latestDeliveryAttemptReceiptFile;
    const latestDeliveryAttemptValid = !!latestDeliveryAttemptReceipt
        && verifyMemoryContextDeliveryReceiptChecksum(latestDeliveryAttemptReceipt)
        && String(latestDeliveryAttemptReceipt.receiptId || "") === String(input.ref?.latestDeliveryAttemptReceiptId || latestDeliveryAttemptReceipt.receiptId || "")
        && String(latestDeliveryAttemptReceipt.checksum || "") === String(input.ref?.latestDeliveryAttemptReceiptChecksum || latestDeliveryAttemptReceipt.checksum || "")
        && String(latestDeliveryAttemptReceipt.taskAgentSessionId || "") === sessionId
        && String(latestDeliveryAttemptReceipt.memoryContextSnapshotId || "") === snapshotId
        && String(latestDeliveryAttemptReceipt.memoryContextSnapshotChecksum || "") === String(loaded?.checksum || input.ref?.checksum || "");
    const memorySnapshotSyncCommitFile = String(input.ref?.memorySnapshotSyncCommitPath
        || (input.ref?.snapshotId && input.ref.snapshotId === session?.memoryContextSnapshotId ? session?.memorySnapshotSyncCommitPath : "")
        || (sessionId && snapshotId ? getMemorySnapshotSyncCommitFile(sessionId, snapshotId) : "")).trim();
    const memorySnapshotSyncCommitPresent = !!memorySnapshotSyncCommitFile && fs.existsSync(memorySnapshotSyncCommitFile);
    const memorySnapshotSyncCommit = memorySnapshotSyncCommitPresent
        ? safeReadJson(memorySnapshotSyncCommitFile, null)
        : null;
    const memorySnapshotSyncCommitVerification = memorySnapshotSyncCommitPresent
        ? verifyTaskAgentMemorySnapshotSyncCommit(memorySnapshotSyncCommit, {
            groupId: String(loadedSession.group_id || session?.groupId || ""),
            groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
            taskId: String(loadedSession.task_id || session?.taskId || ""),
            taskAgentSessionId: sessionId,
            targetProject: String(loadedSession.project || session?.project || ""),
            snapshotId,
            snapshotChecksum: String(loaded?.checksum || input.ref?.checksum || ""),
            syncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
            syncAction: String(memorySnapshotSync?.action || ""),
            memoryPromptInjectionProofChecksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
            deliveryReceiptId: String(deliveryReceipt?.receiptId || ""),
            deliveryReceiptChecksum: String(deliveryReceipt?.checksum || ""),
        })
        : { valid: false, issues: ["sync_commit_missing"], committed: false, status: "pending" };
    const memorySnapshotSyncCommitRefBound = !input.ref?.memorySnapshotSyncCommitChecksum
        || String(input.ref.memorySnapshotSyncCommitChecksum) === String(memorySnapshotSyncCommit?.commit_checksum || "");
    const memorySnapshotSyncCommitValid = memorySnapshotSyncCommitPresent
        && memorySnapshotSyncCommitVerification.valid === true
        && memorySnapshotSyncCommitRefBound;
    const memorySnapshotSyncCommitted = memorySnapshotSyncCommitValid
        && memorySnapshotSyncCommitVerification.committed === true
        && memoryContextDelivered;
    const memorySnapshotSyncLateFailurePreserved = memorySnapshotSyncCommitted
        && latestDeliveryAttemptValid
        && String(latestDeliveryAttemptReceipt?.receiptId || "") !== String(deliveryReceipt?.receiptId || "")
        && latestDeliveryAttemptReceipt?.delivered !== true;
    const compactHeadFenceRequired = groupSessionMemoryBinding?.compactHeadFenceRequired === true;
    const compactHeadFenceValid = deliveryReceipt
        ? deliveryReceipt.compactHeadFenceValid === true
        : groupSessionMemoryBinding?.compactHeadFenceValid === true;
    const sessionLifecycleFenceRequired = String(groupSessionMemoryBinding?.groupSessionId || "").startsWith("gcs_");
    const sessionLifecycleValidation = sessionLifecycleFenceRequired
        ? (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleBinding)({
            groupId: groupSessionMemoryBinding.groupId,
            groupSessionId: groupSessionMemoryBinding.groupSessionId,
            lifecycleStatus: groupSessionMemoryBinding.sessionLifecycleStatus,
            lifecycleGeneration: groupSessionMemoryBinding.sessionLifecycleGeneration,
            lifecycleHeadId: groupSessionMemoryBinding.sessionLifecycleHeadId,
            lifecycleHeadChecksum: groupSessionMemoryBinding.sessionLifecycleHeadChecksum,
        })
        : { valid: true, status: "exempt", issues: [] };
    const sessionLifecycleFenceValid = sessionLifecycleValidation.valid === true
        && (!deliveryReceipt || deliveryReceipt.sessionLifecycleFenceValid === true);
    const stale = ageDays !== null && ageDays >= input.policy.staleDays;
    const latestRank = input.latestRank ?? null;
    const latestForSession = latestRank === 0;
    const retentionExpired = ageDays !== null && ageDays >= input.policy.retentionDays;
    const prunable = fileExists
        && pathIsInsideMemorySnapshotDir(actualFile)
        && !latestForSession
        && (input.source === "orphan_file" || (latestRank !== null && latestRank >= input.policy.keepLatestPerSession && retentionExpired));
    const hardGaps = [];
    const warningGaps = [];
    if (!fileExists)
        hardGaps.push({ reason: "快照文件缺失" });
    if (fileExists && !loaded)
        hardGaps.push({ reason: "快照 JSON 无法读取" });
    if (loaded && !schemaOk)
        hardGaps.push({ reason: "快照 schema 不匹配" });
    if (loaded && !checksumMatches)
        hardGaps.push({ reason: "快照 checksum 不匹配" });
    if (input.source === "session_ref" && !sessionBound)
        hardGaps.push({ reason: "快照未绑定到实际 task Agent session" });
    if (loaded && !memoryContextPresent)
        hardGaps.push({ reason: "快照缺少可注入 memory_context" });
    if (loaded && !workerContextPacketId)
        hardGaps.push({ reason: "快照缺少 worker context packet id" });
    if (loaded && postTurnSummaryExpected && !postTurnSummaryCapsulePresent)
        hardGaps.push({ reason: "快照注入了逐轮摘要但缺少 delivery capsule" });
    if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleValid)
        hardGaps.push({ reason: `逐轮摘要 delivery capsule 无效：${(postTurnSummaryCapsule?.validation_issues || []).join(",") || "unknown"}` });
    if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsulePromptBound)
        hardGaps.push({ reason: "逐轮摘要 delivery capsule checksum 未绑定 rendered prompt" });
    if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleCompactEpochBound)
        hardGaps.push({ reason: "逐轮摘要 delivery capsule compact epoch 与快照记忆不一致" });
    if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleLedgerHeadBound)
        hardGaps.push({ reason: "逐轮摘要 delivery capsule ledger head 与快照记忆不一致" });
    if (loaded && postTurnSummaryCapsulePresent && !postTurnSummaryCapsuleSelectionBound)
        hardGaps.push({ reason: "逐轮摘要 delivery capsule 选择集未完整绑定快照摘要" });
    if (loaded && invocationLineageExpected && !invocationLineageBound)
        hardGaps.push({ reason: "快照 invocation lineage 与摘要胶囊不一致" });
    if (loaded && invocationLineageExpected && !invocationLedgerBound)
        hardGaps.push({ reason: "快照 invocation edge 在 durable lineage ledger 中缺失或身份不一致" });
    if (loaded && finalDispatchPayloadGatePresent && !finalDispatchPayloadGateVerification.valid)
        hardGaps.push({ reason: `最终 prompt 容量 gate 无效：${finalDispatchPayloadGateVerification.issues.join(",") || "unknown"}` });
    if (loaded && finalDispatchPayloadGatePresent && !finalDispatchPromptBound)
        hardGaps.push({ reason: "最终 prompt 容量 gate 未绑定快照 checksum/token/字符计量" });
    if (loaded && finalDispatchReactiveCompactPresent && (!finalDispatchReactiveCompactVerification.valid || !finalDispatchReactiveCompactBound))
        hardGaps.push({ reason: `最终 prompt reactive compact receipt 无效：${finalDispatchReactiveCompactVerification.issues.join(",") || "gate_binding_mismatch"}` });
    if (loaded && finalDispatchReactiveCompactCircuitBreakerPresent && !finalDispatchReactiveCompactCircuitBreakerVerification.valid)
        hardGaps.push({ reason: `最终 prompt reactive compact 断路器无效：${finalDispatchReactiveCompactCircuitBreakerVerification.issues.join(",") || "unknown"}` });
    if (loaded && finalDispatchLineageProofRequired && !finalDispatchLineageProofValid)
        hardGaps.push({ reason: "最终 prompt 容量 gate 缺少 lineage 派发前验证证明" });
    if (loaded && memorySnapshotSyncPresent && !memorySnapshotSyncVerification.valid)
        hardGaps.push({ reason: `task Agent memory snapshot sync 无效：${memorySnapshotSyncVerification.issues.join(",") || "unknown"}` });
    if (loaded && memoryEntrySyncPresent && (!memoryEntrySyncVerification.valid || !memoryEntryManifestCurrent))
        hardGaps.push({ reason: `task Agent memory entry sync 无效：${[...memoryEntrySyncVerification.issues, ...(!memoryEntryManifestCurrent ? ["current_manifest_stale"] : [])].join(",") || "unknown"}` });
    if (loaded && memoryPromptInjectionProofPresent && !memoryPromptInjectionVerification.valid)
        hardGaps.push({ reason: `task Agent memory prompt injection proof 无效：${memoryPromptInjectionVerification.issues.join(",") || "unknown"}` });
    if (loaded && memorySnapshotSyncPresent && memorySnapshotSyncCommitPresent && !memorySnapshotSyncCommitValid)
        hardGaps.push({ reason: `task Agent memory snapshot sync commit 无效：${[...memorySnapshotSyncCommitVerification.issues, ...(!memorySnapshotSyncCommitRefBound ? ["session_ref_checksum_mismatch"] : [])].join(",") || "unknown"}` });
    if (loaded && memorySnapshotSyncPresent && memorySnapshotSyncCommitValid && !memorySnapshotSyncCommitted)
        hardGaps.push({ reason: `task Agent memory snapshot sync commit 被拒绝：${memorySnapshotSyncCommit?.delivery_status || memorySnapshotSyncCommit?.status || "unknown"}` });
    if (deliveryReceipt && !deliveryReceiptChecksumValid)
        hardGaps.push({ reason: "runner memory delivery receipt checksum 不匹配" });
    if (deliveryReceipt && providerMemoryTransportUsagePresent && !providerMemoryTransportUsageVerification.valid)
        hardGaps.push({ reason: `Provider memory transport usage 无效：${providerMemoryTransportUsageVerification.issues.join(",") || "unknown"}` });
    if (deliveryReceipt && !deliverySnapshotBound)
        hardGaps.push({ reason: "runner memory delivery receipt 未绑定当前 task Agent snapshot/session" });
    if (deliveryReceipt && !deliveryGroupSessionBound)
        hardGaps.push({ reason: "runner memory delivery receipt 群聊会话 scope/checksum 不匹配" });
    if (deliveryReceipt && memoryContinuationBaselineVerification.required && !memoryContinuationBaselineVerification.valid) {
        hardGaps.push({ reason: `runner memory continuation baseline 未经原生续接证明：${memoryContinuationBaselineVerification.issues.join(",") || "unknown"}` });
    }
    if (deliveryReceipt && compactHeadFenceRequired && !compactHeadFenceValid)
        hardGaps.push({ reason: `runner compact head 已过期：${(deliveryReceipt.compactHeadFenceIssues || []).join(",") || deliveryReceipt.compactHeadFenceStatus || "stale"}` });
    if (sessionLifecycleFenceRequired && !sessionLifecycleFenceValid)
        hardGaps.push({ reason: `群聊会话生命周期已变化：${(sessionLifecycleValidation.issues || []).join(",") || sessionLifecycleValidation.status || "stale"}` });
    if (deliveryReceipt && deliveryReceipt.delivered !== true)
        hardGaps.push({ reason: `runner memory delivery 失败：${deliveryReceipt.promptBindingMode || deliveryReceipt.status || "unknown"}` });
    if (latestDeliveryAttemptPresent && !latestDeliveryAttemptValid)
        hardGaps.push({ reason: "最新 runner memory delivery attempt 证据无效" });
    if (input.source === "session_ref" && !deliveryReceipt)
        warningGaps.push({ reason: "快照尚无 runner memory delivery receipt" });
    if (deliveryReceipt && !providerMemoryTransportUsagePresent)
        warningGaps.push({ reason: "runner memory delivery receipt 缺少 Provider transport usage（旧回执兼容）" });
    if (loaded && !memoryPromptInjectionProofPresent)
        warningGaps.push({ reason: "快照缺少 memory prompt injection proof（旧快照兼容）" });
    if (loaded && !memoryEntrySyncPresent)
        warningGaps.push({ reason: "快照缺少 per-entry memory sync manifest（旧快照兼容）" });
    if (loaded && memoryPromptInjectionProofPresent && memoryPromptInjectionVerification.injectionRequired && !memoryPromptInjectionVerification.projectionPresent)
        warningGaps.push({ reason: "memory injection projection 未提供，无法证明最终 prompt 包含群聊记忆" });
    if (loaded && memorySnapshotSyncPresent && !memorySnapshotSyncCommitPresent)
        warningGaps.push({ reason: "task Agent memory snapshot sync 已准备，等待 delivery commit" });
    if (memorySnapshotSyncLateFailurePreserved)
        warningGaps.push({ reason: `已保留成功记忆基线；后续 Provider 重试失败：${latestDeliveryAttemptReceipt?.status || "unknown"}` });
    if (loaded && !gateIds.length)
        warningGaps.push({ reason: "快照未捕获 memory gate ids" });
    if (loaded && !finalDispatchPayloadGatePresent)
        warningGaps.push({ reason: "快照缺少最终 Provider prompt 容量 gate（旧快照兼容）" });
    if (loaded && finalDispatchStatus === "recompact_required")
        warningGaps.push({ reason: "最终 Provider prompt 已被容量 gate 拦截，必须重建或重新压缩" });
    if (input.source === "orphan_file")
        warningGaps.push({ reason: "快照文件未被 task-agent-sessions 索引引用" });
    if (stale)
        warningGaps.push({ reason: `快照超过 ${input.policy.staleDays} 天未刷新` });
    const gaps = [...hardGaps, ...warningGaps];
    const status = hardGaps.length ? "fail" : warningGaps.length ? "warn" : "ok";
    return {
        schema: "ccm-task-agent-memory-context-snapshot-inventory-row-v1",
        source: input.source,
        status,
        snapshotId,
        snapshotFile: actualFile,
        declaredSnapshotFile: String(loaded?.snapshot_file || "").trim(),
        checksum: String(loaded?.checksum || input.ref?.checksum || "").trim(),
        checksumMatches,
        generatedAt,
        ageDays,
        stale,
        prunable,
        latestForSession,
        latestRank,
        sessionId,
        expectedSessionId,
        taskId: String(loadedSession.task_id || session?.taskId || "").trim(),
        scopeId: String(loadedSession.scope_id || session?.scopeId || "").trim(),
        groupId: String(loadedSession.group_id || session?.groupId || "").trim(),
        project: String(loadedSession.project || session?.project || "").trim(),
        agentType: String(loadedSession.agent_type || session?.agentType || "").trim(),
        nativeSessionId: String(loadedSession.native_session_id || session?.nativeSessionId || "").trim(),
        resumeMode: String(loadedSession.resume_mode || session?.resumeMode || "").trim(),
        workerContextPacketId,
        workerHandoffId: String(context.worker_handoff_id || input.ref?.workerHandoffId || "").trim(),
        gateIds,
        gateCount: gateIds.length,
        fileExists,
        readable: !!loaded,
        schemaOk,
        sessionBound,
        memoryContextPresent,
        groupSessionMemoryBinding,
        groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || finalDispatchPayloadGate?.group_session_id || capacityRevalidationGroupSessionId(context.worker_context_packet || {}) || ""),
        groupSessionScopeId: String(groupSessionMemoryBinding?.scopeId || (finalDispatchPayloadGate?.group_session_id ? `${String(loadedSession.group_id || session?.groupId || "")}::${String(finalDispatchPayloadGate.group_session_id)}` : "")),
        sessionMemoryChecksum: String(groupSessionMemoryBinding?.sessionMemoryChecksum || ""),
        sessionMemoryHasSummary: groupSessionMemoryBinding?.sessionMemoryHasSummary === true,
        memorySnapshotSyncPresent,
        memorySnapshotSyncValid: memorySnapshotSyncPresent && memorySnapshotSyncVerification.valid === true,
        memorySnapshotSyncAction: String(memorySnapshotSync?.action || "legacy"),
        memorySnapshotSyncReason: String(memorySnapshotSync?.reason || "legacy_snapshot"),
        memorySnapshotSyncChecksum: String(memorySnapshotSync?.sync_checksum || ""),
        memorySnapshotSyncPreviousSnapshotId: String(memorySnapshotSync?.previous_snapshot_id || ""),
        memorySnapshotSyncPreviousTrusted: memorySnapshotSync?.previous_snapshot_trusted === true,
        memorySnapshotSyncMemoryInjectionRequired: memorySnapshotSync?.memory_injection_required === true,
        memorySnapshotSyncIssues: memorySnapshotSyncVerification.issues,
        memoryEntrySyncPresent,
        memoryEntrySyncValid: memoryEntrySyncPresent && memoryEntrySyncVerification.valid === true && memoryEntryManifestCurrent,
        memoryEntrySyncMode: String(memoryEntrySync?.transport_mode || "legacy"),
        memoryEntrySyncPlanChecksum: String(memoryEntrySync?.plan_checksum || ""),
        memoryEntryManifestChecksum: String(memoryEntryManifest?.manifest_checksum || ""),
        memoryEntryPreviousManifestChecksum: String(memoryEntrySync?.previous_manifest_checksum || ""),
        memoryEntryChangedCount: Number(memoryEntrySync?.changed_entry_count || 0),
        memoryEntryRemovedCount: Number(memoryEntrySync?.removed_entry_count || 0),
        memoryEntryRenderLeaseId: String(memoryEntrySync?.render_lease_id || ""),
        memoryEntryRenderFencingToken: Number(memoryEntrySync?.render_fencing_token || 0),
        memoryEntryRenderLeaseOwnerPid: Number(memoryEntrySync?.render_lease_owner_pid || 0),
        memoryEntryRenderLeaseAcquiredAt: String(memoryEntrySync?.render_lease_acquired_at || ""),
        memoryEntryRenderLeaseExpiresAt: String(memoryEntrySync?.render_lease_expires_at || ""),
        memoryEntryRecoveredStaleLeaseId: String(memoryEntrySync?.recovered_stale_lease_id || ""),
        memoryEntrySyncIssues: [...memoryEntrySyncVerification.issues, ...(!memoryEntryManifestCurrent && memoryEntrySyncPresent ? ["current_manifest_stale"] : [])],
        memoryPromptInjectionProofPresent,
        memoryPromptInjectionProofValid: memoryPromptInjectionProofPresent && memoryPromptInjectionVerification.valid === true,
        memoryPromptInjectionProofStatus: String(memoryPromptInjectionProof?.status || "legacy"),
        memoryPromptInjectionProofChecksum: String(memoryPromptInjectionProof?.proof_checksum || ""),
        memoryPromptInjectionEnforced: memoryPromptInjectionProof?.enforcement_required === true,
        memoryPromptInjectionRequired: memoryPromptInjectionProof?.memory_injection_required === true,
        memoryPromptInjectionProjectionPresent: memoryPromptInjectionVerification.projectionPresent === true,
        memoryPromptInjectionPromptBound: memoryPromptInjectionVerification.promptBound === true,
        memoryPromptInjectionDeliveryReady: memoryPromptInjectionVerification.deliveryReady === true,
        memoryPromptInjectionIssues: memoryPromptInjectionVerification.issues,
        memoryTrustedEnvelopeRequired: memoryPromptInjectionVerification.trustedEnvelopeRequired === true,
        memoryTrustedEnvelopePresent: memoryPromptInjectionVerification.trustedEnvelopePresent === true,
        memoryTrustedEnvelopeValid: memoryPromptInjectionVerification.trustedEnvelopeValid === true,
        memoryTrustedEnvelopeBound: memoryPromptInjectionVerification.trustedEnvelopeBound === true,
        memoryTrustedEnvelopeChecksum: String(memoryPromptInjectionProof?.trusted_envelope_checksum || ""),
        memoryTrustedEnvelopeSourceChecksum: String(memoryPromptInjectionProof?.trusted_envelope_source_checksum || ""),
        memoryTrustedEnvelopeIssues: Array.isArray(memoryPromptInjectionProof?.trusted_envelope_issues) ? memoryPromptInjectionProof.trusted_envelope_issues : [],
        memoryContinuationBaselineRequired: memoryContinuationBaselineVerification.required === true,
        memoryContinuationBaselineValid: memoryContinuationBaselineVerification.valid === true,
        memoryContinuationBaselineStatus: String(memoryContinuationBaselineVerification.status || ""),
        memoryContinuationBaselineIssues: memoryContinuationBaselineVerification.issues,
        memoryContinuationEvidenceChecksum: String(memoryContinuationBaselineVerification.evidenceChecksum || ""),
        providerMemoryChannelRequired: deliveryReceipt?.providerMemoryChannelRequired === true,
        providerMemoryChannelAcknowledgementRequired: deliveryReceipt?.providerMemoryChannelAcknowledgementRequired === true,
        providerMemoryChannelAcknowledged: deliveryReceipt?.providerMemoryChannelAcknowledged === true,
        providerMemoryChannelAcknowledgementStatus: String(deliveryReceipt?.providerMemoryChannelAcknowledgementStatus || ""),
        providerMemoryChannelAcknowledgementPolicy: String(deliveryReceipt?.providerMemoryChannelAcknowledgementPolicy || ""),
        providerMemoryChannelValid: deliveryReceipt?.providerMemoryChannelValid === true,
        providerMemoryChannelStatus: String(deliveryReceipt?.providerMemoryChannelStatus || ""),
        providerMemoryChannel: String(deliveryReceipt?.providerMemoryChannel || "none"),
        providerMemoryAuthorityRole: String(deliveryReceipt?.providerMemoryAuthorityRole || "none"),
        providerMemoryNativeSystemPrompt: deliveryReceipt?.providerMemoryNativeSystemPrompt === true,
        providerMemoryNativeDeveloperInstructions: deliveryReceipt?.providerMemoryNativeDeveloperInstructions === true,
        providerMemoryUserPromptFallback: deliveryReceipt?.providerMemoryUserPromptFallback === true,
        providerMemoryChannelEvidenceChecksum: String(deliveryReceipt?.providerMemoryChannelEvidenceChecksum || ""),
        providerMemoryChannelIssues: Array.isArray(deliveryReceipt?.providerMemoryChannelIssues) ? deliveryReceipt.providerMemoryChannelIssues : [],
        memoryContextConsumptionReceiptRequired: deliveryReceipt?.memoryContextConsumptionReceiptRequired === true,
        memoryContextConsumptionReceiptValid: deliveryReceipt?.memoryContextConsumptionReceiptValid === true,
        memoryContextConsumptionReceiptStatus: String(deliveryReceipt?.memoryContextConsumptionReceiptStatus || ""),
        memoryContextConsumptionChallengeId: String(deliveryReceipt?.memoryContextConsumptionChallengeId || loaded?.context?.memory_context_consumption_challenge?.challenge_id || ""),
        memoryContextConsumptionReceiptSignature: String(deliveryReceipt?.memoryContextConsumptionReceiptSignature || ""),
        memoryContextConsumptionReceiptIssues: Array.isArray(deliveryReceipt?.memoryContextConsumptionReceiptIssues) ? deliveryReceipt.memoryContextConsumptionReceiptIssues : [],
        memoryContextConsumptionRecoveryPresent: deliveryReceipt?.memoryContextConsumptionRecoveryPresent === true,
        memoryContextConsumptionRecoveryValid: deliveryReceipt?.memoryContextConsumptionRecoveryValid === true,
        memoryContextConsumptionRecoveryStatus: String(deliveryReceipt?.memoryContextConsumptionRecoveryStatus || "not_needed"),
        memoryContextConsumptionRecoveryId: String(deliveryReceipt?.memoryContextConsumptionRecoveryId || ""),
        memoryContextConsumptionRecoveryIssues: Array.isArray(deliveryReceipt?.memoryContextConsumptionRecoveryIssues) ? deliveryReceipt.memoryContextConsumptionRecoveryIssues : [],
        providerMemoryTransportUsagePresent,
        providerMemoryTransportUsageValid: providerMemoryTransportUsagePresent && providerMemoryTransportUsageVerification.valid === true,
        providerMemoryTransportUsageStatus: String(providerMemoryTransportUsage?.status || "missing"),
        providerMemoryTransportUsageReported: providerMemoryTransportUsage?.reported === true,
        providerMemoryTransportUsageChecksum: String(providerMemoryTransportUsage?.usage_checksum || ""),
        providerMemoryTransportUsageIssues: providerMemoryTransportUsageVerification.issues,
        providerMemoryTransportInputTokens: Number(providerMemoryTransportUsage?.input_tokens || 0),
        providerMemoryTransportDirectInputTokens: Number(providerMemoryTransportUsage?.direct_input_tokens || 0),
        providerMemoryTransportOutputTokens: Number(providerMemoryTransportUsage?.output_tokens || 0),
        providerMemoryTransportCacheReadTokens: Number(providerMemoryTransportUsage?.cache_read_input_tokens || 0),
        providerMemoryTransportCacheCreationTokens: Number(providerMemoryTransportUsage?.cache_creation_input_tokens || 0),
        providerMemoryTransportAccountedTotalTokens: Number(providerMemoryTransportUsage?.accounted_total_tokens || 0),
        providerMemoryTransportCacheHitRatio: providerMemoryTransportUsage?.cache_hit_ratio ?? null,
        providerMemoryTransportEstimatedTokens: Number(providerMemoryTransportUsage?.memory_transport_estimated_tokens || 0),
        providerMemoryTransportFinalPromptEstimatedTokens: Number(providerMemoryTransportUsage?.final_prompt_estimated_tokens || 0),
        providerMemoryTransportMode: String(providerMemoryTransportUsage?.transport_mode || memoryEntrySync?.transport_mode || "legacy"),
        providerMemoryTransportProvider: String(providerMemoryTransportUsage?.provider || deliveryReceipt?.runtime || ""),
        providerMemoryTransportModel: String(providerMemoryTransportUsage?.model || ""),
        memorySnapshotSyncCommitPath: memorySnapshotSyncCommitFile,
        memorySnapshotSyncCommitPresent,
        memorySnapshotSyncCommitValid,
        memorySnapshotSyncCommitted,
        memorySnapshotSyncCommitStatus: String(memorySnapshotSyncCommit?.status || (memorySnapshotSyncCommitPresent ? "invalid" : "pending")),
        memorySnapshotSyncCommitChecksum: String(memorySnapshotSyncCommit?.commit_checksum || ""),
        memorySnapshotSyncCommitIssues: [
            ...memorySnapshotSyncCommitVerification.issues,
            ...(!memorySnapshotSyncCommitRefBound ? ["session_ref_checksum_mismatch"] : []),
        ],
        latestDeliveryAttemptReceiptId: String(latestDeliveryAttemptReceipt?.receiptId || input.ref?.latestDeliveryAttemptReceiptId || ""),
        latestDeliveryAttemptReceiptFile,
        latestDeliveryAttemptStatus: String(latestDeliveryAttemptReceipt?.status || input.ref?.latestDeliveryAttemptStatus || ""),
        latestDeliveryAttemptAt: String(latestDeliveryAttemptReceipt?.deliveredAt || input.ref?.latestDeliveryAttemptAt || ""),
        latestDeliveryAttemptPresent,
        latestDeliveryAttemptValid,
        memorySnapshotSyncLateFailurePreserved,
        postTurnSummaryExpected,
        postTurnSummaryCapsulePresent,
        postTurnSummaryCapsuleValid,
        postTurnSummaryCapsulePromptBound,
        postTurnSummaryCapsuleChecksum: String(postTurnSummaryCapsule?.capsule_checksum || ""),
        postTurnSummaryCapsuleSessionBound: postTurnSummaryCapsule?.binding_valid === true,
        postTurnSummaryCapsuleCompactEpoch: String(postTurnSummaryCapsule?.compact_epoch || ""),
        postTurnSummaryCapsuleCompactEpochBound,
        postTurnSummaryCapsuleLedgerHeadChecksum: String(postTurnSummaryCapsule?.ledger_head_checksum || ""),
        postTurnSummaryCapsuleLedgerHeadBound,
        postTurnSummaryCapsuleSelectionBound,
        postTurnSummaryCapsuleSelectedCount: Number(postTurnSummaryCapsule?.selected_count || 0),
        invocationLineageExpected,
        invocationLineageBound,
        invocationLedgerBound,
        invocationEdgeId,
        invocationParentEdgeId: String(invocationLineage?.parent_invocation_edge_id || ""),
        invocationRootEdgeId: String(invocationLineage?.root_invocation_edge_id || ""),
        invocationBranchId: String(invocationLineage?.branch_id || ""),
        invocationBranchKind: String(invocationLineage?.branch_kind || ""),
        invocationEdgeStatus: String(invocationEdge?.status || ""),
        finalDispatchPayloadGatePresent,
        finalDispatchPayloadGateValid: finalDispatchPayloadGateVerification.valid === true && finalDispatchPromptBound,
        finalDispatchPayloadGateIssues: finalDispatchPayloadGateVerification.issues,
        finalDispatchPayloadGateId: String(finalDispatchPayloadGate?.gate_id || ""),
        finalDispatchPayloadGateChecksum: String(finalDispatchPayloadGate?.gate_checksum || ""),
        finalDispatchStatus,
        finalDispatchProvider: String(finalDispatchPayloadGate?.provider || ""),
        finalDispatchModel: String(finalDispatchPayloadGate?.model || ""),
        finalDispatchPromptTokens: Number(finalDispatchPayloadGate?.estimated_total_input_tokens || 0),
        finalDispatchPromptChars: Number(finalDispatchPayloadGate?.prompt_chars || 0),
        finalDispatchAutoCompactThreshold: Number(finalDispatchPayloadGate?.auto_compact_threshold || 0),
        finalDispatchRemainingTokens: Number(finalDispatchPayloadGate?.remaining_tokens_before_auto_compact || 0),
        finalDispatchPromptChecksum: String(finalDispatchPayloadGate?.prompt_checksum || ""),
        finalDispatchPromptBound,
        finalDispatchProviderCallAllowed: finalDispatchPayloadGate?.provider_call_allowed === true,
        finalDispatchReactiveCompactPresent,
        finalDispatchReactiveCompactValid: finalDispatchReactiveCompactVerification.valid === true && finalDispatchReactiveCompactBound,
        finalDispatchReactiveCompactStatus: String(finalDispatchReactiveCompact?.status || ""),
        finalDispatchReactiveCompactReceiptId: String(finalDispatchReactiveCompact?.receipt_id || ""),
        finalDispatchReactiveCompactOriginalTokens: Number(finalDispatchReactiveCompact?.original_prompt_tokens || 0),
        finalDispatchReactiveCompactRecoveredTokens: Number(finalDispatchReactiveCompact?.recovered_prompt_tokens || 0),
        finalDispatchReactiveCompactContextBudgetTokens: Number(finalDispatchReactiveCompact?.recent_context_budget_tokens || 0),
        finalDispatchReactiveCompactOmittedLines: Number(finalDispatchReactiveCompact?.omitted_context_lines || 0),
        finalDispatchReactiveCompactBound,
        finalDispatchReactiveCompactCircuitBreakerPresent,
        finalDispatchReactiveCompactCircuitBreakerValid: finalDispatchReactiveCompactCircuitBreakerVerification.valid === true,
        finalDispatchReactiveCompactCircuitState: String(finalDispatchReactiveCompactCircuitBreaker?.state || ""),
        finalDispatchReactiveCompactCircuitBlocked: finalDispatchReactiveCompactCircuitBreaker?.state === "open",
        finalDispatchReactiveCompactCircuitFailures: Number(finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0),
        finalDispatchReactiveCompactCircuitRevision: Number(finalDispatchReactiveCompactCircuitBreaker?.revision || 0),
        finalDispatchReactiveCompactCircuitChecksum: String(finalDispatchReactiveCompactCircuitBreaker?.state_checksum || ""),
        finalDispatchLineageProofRequired,
        finalDispatchLineageProofValid,
        postTurnSummaryCapsuleInvocationKind: String(postTurnSummaryCapsule?.invocation_kind || ""),
        deliveryReceiptId: String(deliveryReceipt?.receiptId || input.ref?.deliveryReceiptId || ""),
        deliveryReceiptFile,
        deliveryReceiptChecksumValid,
        deliverySnapshotBound,
        deliveryGroupSessionBound,
        memoryContextDelivered,
        deliveryStatus: String(deliveryReceipt?.status || input.ref?.deliveryStatus || "missing"),
        deliveryPromptBindingMode: String(deliveryReceipt?.promptBindingMode || ""),
        compactHeadFenceRequired,
        compactHeadFenceValid,
        compactHeadGeneration: Number(deliveryReceipt?.compactHeadGeneration || groupSessionMemoryBinding?.compactHeadGeneration || 0),
        compactHeadFenceStatus: String(deliveryReceipt?.compactHeadFenceStatus || groupSessionMemoryBinding?.compactHeadFenceStatus || ""),
        sessionLifecycleFenceRequired,
        sessionLifecycleFenceValid,
        sessionLifecycleGeneration: Number(deliveryReceipt?.sessionLifecycleGeneration || groupSessionMemoryBinding?.sessionLifecycleGeneration || 0),
        sessionLifecycleFenceStatus: String(deliveryReceipt?.sessionLifecycleFenceStatus || sessionLifecycleValidation.status || ""),
        sessionLifecycleStatus: String(deliveryReceipt?.sessionLifecycleStatus || groupSessionMemoryBinding?.sessionLifecycleStatus || ""),
        deliveredAt: String(deliveryReceipt?.deliveredAt || input.ref?.deliveredAt || ""),
        renderedPromptChecksum: String(context.rendered_prompt_checksum || "").trim(),
        gaps,
    };
}
function buildTaskAgentMemoryContextSnapshotInventory(filter = {}) {
    const staleDays = Math.max(1, Number(filter.staleAfterDays ?? filter.stale_after_days ?? DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS));
    const retentionDays = Math.max(1, Number(filter.retentionDays ?? filter.retention_days ?? DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS));
    const keepLatestPerSession = Math.max(1, Number(filter.keepLatestPerSession ?? filter.keep_latest_per_session ?? DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION));
    const nowMs = Number(filter.nowMs || Date.now());
    const store = loadStore();
    const sessions = store.sessions.filter((item) => (!filter.sessionId || item.id === filter.sessionId)
        && (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
    const allSessionsById = new Map(store.sessions.map((session) => [session.id, session]));
    const policy = {
        staleDays,
        retentionDays,
        keepLatestPerSession,
        memoryEntryRenderLeaseTtlMs: MEMORY_ENTRY_RENDER_LEASE_TTL_MS,
        memoryEntryRenderConflictMaxRetries: MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES,
        memoryEntryRenderConflictBaseDelayMs: MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS,
        memoryEntryRenderConflictMaxDelayMs: MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS,
        memoryEntryRenderConflictJitterMs: MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS,
    };
    const memoryEntryRenderLeases = sessions.map((session) => {
        const lastContention = session.memoryEntrySyncRenderLastContention || null;
        const lastContentionVerification = lastContention ? verifyTaskAgentMemoryEntryRenderContentionReceipt(lastContention, {
            groupId: session.groupId,
            groupSessionId: session.groupSessionId || "",
            taskId: session.taskId,
            taskAgentSessionId: session.id,
            targetProject: session.project,
        }) : { valid: true, issues: [] };
        return {
            sessionId: session.id,
            groupId: session.groupId,
            project: session.project,
            lease: session.memoryEntrySyncRenderLease || null,
            historyCount: Array.isArray(session.memoryEntrySyncRenderLeaseHistory) ? session.memoryEntrySyncRenderLeaseHistory.length : 0,
            takeoverCount: Number(session.memoryEntrySyncRenderLeaseTakeoverCount || 0),
            maxFencingToken: Number(session.memoryEntrySyncRenderFencingToken || 0),
            contentionCount: Number(session.memoryEntrySyncRenderContentionCount || 0),
            waitResolvedCount: Number(session.memoryEntrySyncRenderWaitResolvedCount || 0),
            waitTimeoutCount: Number(session.memoryEntrySyncRenderWaitTimeoutCount || 0),
            sameProcessConflictCount: Number(session.memoryEntrySyncRenderSameProcessConflictCount || 0),
            waitTotalMs: Number(session.memoryEntrySyncRenderWaitTotalMs || 0),
            lastContention,
            lastContentionValid: lastContentionVerification.valid,
            lastContentionIssues: lastContentionVerification.issues,
        };
    });
    const rows = [];
    const referencedFileKeys = new Set();
    const referencedSnapshotIds = new Set();
    for (const session of sessions) {
        const refs = normalizeMemorySnapshotRefs([
            ...(session.memoryContextSnapshots || []),
            session.memoryContextSnapshotId || session.memoryContextSnapshotPath ? {
                snapshotId: session.memoryContextSnapshotId || "",
                snapshotPath: session.memoryContextSnapshotPath || "",
                checksum: session.memoryContextSnapshotChecksum || "",
                workerContextPacketId: session.memoryContextPacketId || "",
                generatedAt: session.memoryContextSnapshotAt || "",
            } : null,
        ].filter(Boolean));
        const uniqueRefs = [];
        const seen = new Set();
        for (const ref of refs) {
            const key = ref.snapshotPath ? normalizeSnapshotFileKey(ref.snapshotPath) : ref.snapshotId;
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            uniqueRefs.push(ref);
            if (ref.snapshotPath)
                referencedFileKeys.add(normalizeSnapshotFileKey(ref.snapshotPath));
            if (ref.snapshotId)
                referencedSnapshotIds.add(ref.snapshotId);
        }
        const sortedRefs = [...uniqueRefs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
        const latestRankByKey = new Map();
        sortedRefs.forEach((ref, index) => latestRankByKey.set(ref.snapshotPath ? normalizeSnapshotFileKey(ref.snapshotPath) : ref.snapshotId, index));
        for (const ref of uniqueRefs) {
            const key = ref.snapshotPath ? normalizeSnapshotFileKey(ref.snapshotPath) : ref.snapshotId;
            const loaded = safeReadJson(ref.snapshotPath, null);
            rows.push(buildTaskAgentMemorySnapshotRow({
                session,
                ref,
                loaded,
                actualFile: ref.snapshotPath,
                source: "session_ref",
                latestRank: latestRankByKey.get(key) ?? null,
                policy,
                nowMs,
            }));
        }
    }
    if (filter.includeOrphans !== false && filter.include_orphans !== false) {
        for (const disk of listMemoryContextSnapshotFilesOnDisk()) {
            const fileKey = normalizeSnapshotFileKey(disk.file);
            if (referencedFileKeys.has(fileKey))
                continue;
            const loaded = safeReadJson(disk.file, null);
            const snapshotId = String(loaded?.snapshot_id || path.basename(disk.file, ".json"));
            if (referencedSnapshotIds.has(snapshotId))
                continue;
            const loadedSession = loaded?.session || {};
            const session = allSessionsById.get(String(loadedSession.id || disk.sessionId || "")) || null;
            const rowSeed = {
                session: loadedSession,
                status: session?.status || "",
            };
            if (!taskAgentMemorySnapshotMatchesFilter(rowSeed, filter))
                continue;
            rows.push(buildTaskAgentMemorySnapshotRow({
                session,
                loaded,
                actualFile: disk.file,
                source: "orphan_file",
                latestRank: null,
                policy,
                nowMs,
            }));
        }
    }
    rows.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
    const byGroup = new Map();
    for (const row of rows) {
        const groupId = row.groupId || "unknown";
        const current = byGroup.get(groupId) || { groupId, snapshotCount: 0, okCount: 0, warnCount: 0, failCount: 0, prunableCount: 0, staleCount: 0, deliveredCount: 0, deliveryMissingCount: 0, deliveryFailedCount: 0, compactHeadFenceRequiredCount: 0, compactHeadFenceValidCount: 0, compactHeadFenceStaleCount: 0, sessionLifecycleFenceRequiredCount: 0, sessionLifecycleFenceValidCount: 0, sessionLifecycleFenceStaleCount: 0, postTurnSummaryCapsuleCount: 0, postTurnSummaryCapsuleValidCount: 0, postTurnSummaryCapsuleMissingCount: 0, postTurnSummaryCapsuleInvalidCount: 0, postTurnSummaryCapsulePromptBoundCount: 0, postTurnSummaryCapsuleCompactEpochMismatchCount: 0, postTurnSummaryCapsuleLedgerHeadMismatchCount: 0, invocationEdgeCount: 0, invocationLineageBoundCount: 0, invocationLedgerMissingCount: 0, finalDispatchGateReadyCount: 0, finalDispatchGateBlockedCount: 0, finalDispatchGateMissingCount: 0, finalDispatchGateInvalidCount: 0, finalDispatchPromptBoundCount: 0, finalDispatchLineageProofCount: 0, finalDispatchReactiveCompactRecoveredCount: 0, finalDispatchReactiveCompactBlockedCount: 0, finalDispatchReactiveCompactInvalidCount: 0, finalDispatchReactiveCompactCircuitOpenCount: 0, finalDispatchReactiveCompactCircuitFailureCount: 0, finalDispatchReactiveCompactCircuitInvalidCount: 0, invocationBranchIds: new Set(), projects: new Set() };
        current.memorySnapshotSyncInitializeCount = Number(current.memorySnapshotSyncInitializeCount || 0);
        current.memorySnapshotSyncPromptUpdateCount = Number(current.memorySnapshotSyncPromptUpdateCount || 0);
        current.memorySnapshotSyncUnchangedCount = Number(current.memorySnapshotSyncUnchangedCount || 0);
        current.memorySnapshotSyncInvalidCount = Number(current.memorySnapshotSyncInvalidCount || 0);
        current.memorySnapshotSyncLegacyCount = Number(current.memorySnapshotSyncLegacyCount || 0);
        current.memorySnapshotSyncCommittedCount = Number(current.memorySnapshotSyncCommittedCount || 0);
        current.memorySnapshotSyncCommitPendingCount = Number(current.memorySnapshotSyncCommitPendingCount || 0);
        current.memorySnapshotSyncCommitRejectedCount = Number(current.memorySnapshotSyncCommitRejectedCount || 0);
        current.memorySnapshotSyncCommitInvalidCount = Number(current.memorySnapshotSyncCommitInvalidCount || 0);
        current.memorySnapshotSyncLateFailurePreservedCount = Number(current.memorySnapshotSyncLateFailurePreservedCount || 0);
        current.memoryEntrySyncFullCount = Number(current.memoryEntrySyncFullCount || 0);
        current.memoryEntrySyncDeltaCount = Number(current.memoryEntrySyncDeltaCount || 0);
        current.memoryEntrySyncContinuationCount = Number(current.memoryEntrySyncContinuationCount || 0);
        current.memoryEntrySyncInvalidCount = Number(current.memoryEntrySyncInvalidCount || 0);
        current.memoryEntryChangedCount = Number(current.memoryEntryChangedCount || 0);
        current.memoryEntryRemovedCount = Number(current.memoryEntryRemovedCount || 0);
        current.memoryPromptInjectionProofCount = Number(current.memoryPromptInjectionProofCount || 0);
        current.memoryPromptInjectionEnforcedCount = Number(current.memoryPromptInjectionEnforcedCount || 0);
        current.memoryPromptInjectionPromptBoundCount = Number(current.memoryPromptInjectionPromptBoundCount || 0);
        current.memoryPromptInjectionMissingCount = Number(current.memoryPromptInjectionMissingCount || 0);
        current.memoryPromptInjectionInvalidCount = Number(current.memoryPromptInjectionInvalidCount || 0);
        current.memoryTrustedEnvelopeRequiredCount = Number(current.memoryTrustedEnvelopeRequiredCount || 0);
        current.memoryTrustedEnvelopeValidCount = Number(current.memoryTrustedEnvelopeValidCount || 0);
        current.memoryTrustedEnvelopeUnverifiedCount = Number(current.memoryTrustedEnvelopeUnverifiedCount || 0);
        current.memoryContinuationBaselineRequiredCount = Number(current.memoryContinuationBaselineRequiredCount || 0);
        current.memoryContinuationBaselineValidCount = Number(current.memoryContinuationBaselineValidCount || 0);
        current.memoryContinuationBaselineUnverifiedCount = Number(current.memoryContinuationBaselineUnverifiedCount || 0);
        current.providerMemoryChannelRequiredCount = Number(current.providerMemoryChannelRequiredCount || 0);
        current.providerMemoryAcknowledgementRequiredCount = Number(current.providerMemoryAcknowledgementRequiredCount || 0);
        current.providerMemoryAcknowledgedCount = Number(current.providerMemoryAcknowledgedCount || 0);
        current.providerMemoryAcknowledgementUnverifiedCount = Number(current.providerMemoryAcknowledgementUnverifiedCount || 0);
        current.providerMemoryStructuredAcknowledgedCount = Number(current.providerMemoryStructuredAcknowledgedCount || 0);
        current.providerMemoryExitSuccessAcknowledgedCount = Number(current.providerMemoryExitSuccessAcknowledgedCount || 0);
        current.providerMemoryNativeSystemCount = Number(current.providerMemoryNativeSystemCount || 0);
        current.providerMemoryNativeDeveloperCount = Number(current.providerMemoryNativeDeveloperCount || 0);
        current.providerMemoryUserFallbackCount = Number(current.providerMemoryUserFallbackCount || 0);
        current.providerMemoryChannelUnverifiedCount = Number(current.providerMemoryChannelUnverifiedCount || 0);
        current.memoryContextConsumptionReceiptRequiredCount = Number(current.memoryContextConsumptionReceiptRequiredCount || 0);
        current.memoryContextConsumptionReceiptValidCount = Number(current.memoryContextConsumptionReceiptValidCount || 0);
        current.memoryContextConsumptionReceiptMissingCount = Number(current.memoryContextConsumptionReceiptMissingCount || 0);
        current.memoryContextConsumptionRecoveryCount = Number(current.memoryContextConsumptionRecoveryCount || 0);
        current.memoryContextConsumptionRecoveredCount = Number(current.memoryContextConsumptionRecoveredCount || 0);
        current.memoryContextConsumptionRecoveryBlockedCount = Number(current.memoryContextConsumptionRecoveryBlockedCount || 0);
        current.memoryContextConsumptionRecoveryInvalidCount = Number(current.memoryContextConsumptionRecoveryInvalidCount || 0);
        current.snapshotCount += 1;
        if (row.status === "ok")
            current.okCount += 1;
        if (row.status === "warn")
            current.warnCount += 1;
        if (row.status === "fail")
            current.failCount += 1;
        if (row.memorySnapshotSyncAction === "initialize" && row.memorySnapshotSyncValid)
            current.memorySnapshotSyncInitializeCount += 1;
        if (row.memorySnapshotSyncAction === "prompt_update" && row.memorySnapshotSyncValid)
            current.memorySnapshotSyncPromptUpdateCount += 1;
        if (row.memorySnapshotSyncAction === "none" && row.memorySnapshotSyncValid)
            current.memorySnapshotSyncUnchangedCount += 1;
        if (row.memorySnapshotSyncPresent && !row.memorySnapshotSyncValid)
            current.memorySnapshotSyncInvalidCount += 1;
        if (!row.memorySnapshotSyncPresent)
            current.memorySnapshotSyncLegacyCount += 1;
        if (row.memorySnapshotSyncCommitted)
            current.memorySnapshotSyncCommittedCount += 1;
        if (row.memorySnapshotSyncPresent && !row.memorySnapshotSyncCommitPresent)
            current.memorySnapshotSyncCommitPendingCount += 1;
        if (row.memorySnapshotSyncCommitValid && row.memorySnapshotSyncCommitStatus === "rejected")
            current.memorySnapshotSyncCommitRejectedCount += 1;
        if (row.memorySnapshotSyncCommitPresent && !row.memorySnapshotSyncCommitValid)
            current.memorySnapshotSyncCommitInvalidCount += 1;
        if (row.memorySnapshotSyncLateFailurePreserved)
            current.memorySnapshotSyncLateFailurePreservedCount += 1;
        if (row.memoryEntrySyncValid && row.memoryEntrySyncMode === "full")
            current.memoryEntrySyncFullCount += 1;
        if (row.memoryEntrySyncValid && row.memoryEntrySyncMode === "delta")
            current.memoryEntrySyncDeltaCount += 1;
        if (row.memoryEntrySyncValid && row.memoryEntrySyncMode === "continuation")
            current.memoryEntrySyncContinuationCount += 1;
        if (row.memoryEntrySyncPresent && !row.memoryEntrySyncValid)
            current.memoryEntrySyncInvalidCount += 1;
        current.memoryEntryChangedCount += Number(row.memoryEntryChangedCount || 0);
        current.memoryEntryRemovedCount += Number(row.memoryEntryRemovedCount || 0);
        if (row.memoryPromptInjectionProofPresent)
            current.memoryPromptInjectionProofCount += 1;
        if (row.memoryPromptInjectionEnforced)
            current.memoryPromptInjectionEnforcedCount += 1;
        if (row.memoryPromptInjectionPromptBound)
            current.memoryPromptInjectionPromptBoundCount += 1;
        if (!row.memoryPromptInjectionProofPresent)
            current.memoryPromptInjectionMissingCount += 1;
        if (row.memoryPromptInjectionProofPresent && !row.memoryPromptInjectionProofValid)
            current.memoryPromptInjectionInvalidCount += 1;
        if (row.memoryTrustedEnvelopeRequired)
            current.memoryTrustedEnvelopeRequiredCount += 1;
        if (row.memoryTrustedEnvelopeRequired && row.memoryTrustedEnvelopeValid && row.memoryTrustedEnvelopeBound)
            current.memoryTrustedEnvelopeValidCount += 1;
        if (row.memoryTrustedEnvelopeRequired && row.memoryPromptInjectionRequired && (!row.memoryTrustedEnvelopeValid || !row.memoryTrustedEnvelopeBound))
            current.memoryTrustedEnvelopeUnverifiedCount += 1;
        if (row.memoryContinuationBaselineRequired)
            current.memoryContinuationBaselineRequiredCount += 1;
        if (row.memoryContinuationBaselineRequired && row.memoryContinuationBaselineValid)
            current.memoryContinuationBaselineValidCount += 1;
        if (row.memoryContinuationBaselineRequired && !row.memoryContinuationBaselineValid)
            current.memoryContinuationBaselineUnverifiedCount += 1;
        if (row.providerMemoryChannelRequired)
            current.providerMemoryChannelRequiredCount += 1;
        if (row.providerMemoryChannelAcknowledgementRequired)
            current.providerMemoryAcknowledgementRequiredCount += 1;
        if (row.providerMemoryChannelAcknowledgementRequired && row.providerMemoryChannelAcknowledged)
            current.providerMemoryAcknowledgedCount += 1;
        if (row.providerMemoryChannelAcknowledgementRequired && !row.providerMemoryChannelAcknowledged)
            current.providerMemoryAcknowledgementUnverifiedCount += 1;
        if (row.providerMemoryChannelAcknowledged && ["structured_thread_started", "structured_session_event"].includes(row.providerMemoryChannelAcknowledgementPolicy))
            current.providerMemoryStructuredAcknowledgedCount += 1;
        if (row.providerMemoryChannelAcknowledged && row.providerMemoryChannelAcknowledgementPolicy === "process_exit_success")
            current.providerMemoryExitSuccessAcknowledgedCount += 1;
        if (row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeSystemPrompt)
            current.providerMemoryNativeSystemCount += 1;
        if (row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeDeveloperInstructions)
            current.providerMemoryNativeDeveloperCount += 1;
        if (row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryUserPromptFallback)
            current.providerMemoryUserFallbackCount += 1;
        if (row.providerMemoryChannelRequired && !row.providerMemoryChannelValid)
            current.providerMemoryChannelUnverifiedCount += 1;
        if (row.memoryContextConsumptionReceiptRequired)
            current.memoryContextConsumptionReceiptRequiredCount += 1;
        if (row.memoryContextConsumptionReceiptRequired && row.memoryContextConsumptionReceiptValid)
            current.memoryContextConsumptionReceiptValidCount += 1;
        if (row.memoryContextConsumptionReceiptRequired && !row.memoryContextConsumptionReceiptValid)
            current.memoryContextConsumptionReceiptMissingCount += 1;
        if (row.memoryContextConsumptionRecoveryPresent)
            current.memoryContextConsumptionRecoveryCount += 1;
        if (row.memoryContextConsumptionRecoveryPresent && row.memoryContextConsumptionRecoveryValid && row.memoryContextConsumptionRecoveryStatus === "recovered")
            current.memoryContextConsumptionRecoveredCount += 1;
        if (row.memoryContextConsumptionRecoveryStatus === "blocked")
            current.memoryContextConsumptionRecoveryBlockedCount += 1;
        if (row.memoryContextConsumptionRecoveryPresent && !row.memoryContextConsumptionRecoveryValid)
            current.memoryContextConsumptionRecoveryInvalidCount += 1;
        if (row.prunable)
            current.prunableCount += 1;
        if (row.stale)
            current.staleCount += 1;
        if (row.memoryContextDelivered)
            current.deliveredCount += 1;
        if (!row.deliveryReceiptId)
            current.deliveryMissingCount += 1;
        if (row.deliveryReceiptId && !row.memoryContextDelivered)
            current.deliveryFailedCount += 1;
        if (row.compactHeadFenceRequired)
            current.compactHeadFenceRequiredCount += 1;
        if (row.compactHeadFenceRequired && row.compactHeadFenceValid)
            current.compactHeadFenceValidCount += 1;
        if (row.compactHeadFenceRequired && !row.compactHeadFenceValid)
            current.compactHeadFenceStaleCount += 1;
        if (row.sessionLifecycleFenceRequired)
            current.sessionLifecycleFenceRequiredCount += 1;
        if (row.sessionLifecycleFenceRequired && row.sessionLifecycleFenceValid)
            current.sessionLifecycleFenceValidCount += 1;
        if (row.sessionLifecycleFenceRequired && !row.sessionLifecycleFenceValid)
            current.sessionLifecycleFenceStaleCount += 1;
        if (row.postTurnSummaryCapsulePresent)
            current.postTurnSummaryCapsuleCount += 1;
        if (row.postTurnSummaryCapsuleValid)
            current.postTurnSummaryCapsuleValidCount += 1;
        if (row.postTurnSummaryExpected && !row.postTurnSummaryCapsulePresent)
            current.postTurnSummaryCapsuleMissingCount += 1;
        if (row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleValid)
            current.postTurnSummaryCapsuleInvalidCount += 1;
        if (row.postTurnSummaryCapsulePromptBound)
            current.postTurnSummaryCapsulePromptBoundCount += 1;
        if (row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleCompactEpochBound)
            current.postTurnSummaryCapsuleCompactEpochMismatchCount += 1;
        if (row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleLedgerHeadBound)
            current.postTurnSummaryCapsuleLedgerHeadMismatchCount += 1;
        if (row.invocationEdgeId)
            current.invocationEdgeCount += 1;
        if (row.invocationLineageExpected && row.invocationLineageBound && row.invocationLedgerBound)
            current.invocationLineageBoundCount += 1;
        if (row.invocationLineageExpected && !row.invocationLedgerBound)
            current.invocationLedgerMissingCount += 1;
        if (row.finalDispatchStatus === "ready")
            current.finalDispatchGateReadyCount += 1;
        if (row.finalDispatchStatus === "recompact_required")
            current.finalDispatchGateBlockedCount += 1;
        if (!row.finalDispatchPayloadGatePresent)
            current.finalDispatchGateMissingCount += 1;
        if (row.finalDispatchPayloadGatePresent && !row.finalDispatchPayloadGateValid)
            current.finalDispatchGateInvalidCount += 1;
        if (row.finalDispatchPromptBound)
            current.finalDispatchPromptBoundCount += 1;
        if (row.finalDispatchLineageProofRequired && row.finalDispatchLineageProofValid)
            current.finalDispatchLineageProofCount += 1;
        if (row.finalDispatchReactiveCompactStatus === "recovered")
            current.finalDispatchReactiveCompactRecoveredCount += 1;
        if (row.finalDispatchReactiveCompactStatus === "blocked")
            current.finalDispatchReactiveCompactBlockedCount += 1;
        if (row.finalDispatchReactiveCompactPresent && !row.finalDispatchReactiveCompactValid)
            current.finalDispatchReactiveCompactInvalidCount += 1;
        if (row.finalDispatchReactiveCompactCircuitBlocked)
            current.finalDispatchReactiveCompactCircuitOpenCount += 1;
        current.finalDispatchReactiveCompactCircuitFailureCount += Number(row.finalDispatchReactiveCompactCircuitFailures || 0);
        if (row.finalDispatchReactiveCompactCircuitBreakerPresent && !row.finalDispatchReactiveCompactCircuitBreakerValid)
            current.finalDispatchReactiveCompactCircuitInvalidCount += 1;
        if (row.invocationBranchId)
            current.invocationBranchIds.add(row.invocationBranchId);
        if (row.project)
            current.projects.add(row.project);
        byGroup.set(groupId, current);
    }
    for (const row of memoryEntryRenderLeases) {
        const groupId = row.groupId || "unknown";
        const current = byGroup.get(groupId) || {
            groupId,
            snapshotCount: 0,
            okCount: 0,
            warnCount: 0,
            failCount: 0,
            prunableCount: 0,
            staleCount: 0,
            invocationBranchIds: new Set(),
            projects: new Set(),
        };
        const leaseActive = row.lease?.status === "prepared"
            && Date.parse(String(row.lease?.expires_at || "")) > nowMs
            && processIsAlive(Number(row.lease?.owner_pid || 0));
        current.memoryEntryRenderLeasePreparedCount = Number(current.memoryEntryRenderLeasePreparedCount || 0) + (row.lease?.status === "prepared" ? 1 : 0);
        current.memoryEntryRenderLeaseActiveCount = Number(current.memoryEntryRenderLeaseActiveCount || 0) + (leaseActive ? 1 : 0);
        current.memoryEntryRenderLeaseBoundCount = Number(current.memoryEntryRenderLeaseBoundCount || 0) + (row.lease?.status === "bound" ? 1 : 0);
        current.memoryEntryRenderLeaseRejectedCount = Number(current.memoryEntryRenderLeaseRejectedCount || 0) + (row.lease?.status === "rejected" ? 1 : 0);
        current.memoryEntryRenderLeaseStaleCount = Number(current.memoryEntryRenderLeaseStaleCount || 0) + (row.lease?.status === "prepared" && !leaseActive ? 1 : 0);
        current.memoryEntryRenderLeaseTakeoverCount = Number(current.memoryEntryRenderLeaseTakeoverCount || 0) + row.takeoverCount;
        current.memoryEntryRenderLeaseHistoryCount = Number(current.memoryEntryRenderLeaseHistoryCount || 0) + row.historyCount;
        current.memoryEntryRenderLeaseMaxFencingToken = Math.max(Number(current.memoryEntryRenderLeaseMaxFencingToken || 0), row.maxFencingToken);
        current.memoryEntryRenderContentionCount = Number(current.memoryEntryRenderContentionCount || 0) + row.contentionCount;
        current.memoryEntryRenderWaitResolvedCount = Number(current.memoryEntryRenderWaitResolvedCount || 0) + row.waitResolvedCount;
        current.memoryEntryRenderWaitTimeoutCount = Number(current.memoryEntryRenderWaitTimeoutCount || 0) + row.waitTimeoutCount;
        current.memoryEntryRenderSameProcessConflictCount = Number(current.memoryEntryRenderSameProcessConflictCount || 0) + row.sameProcessConflictCount;
        current.memoryEntryRenderWaitTotalMs = Number(current.memoryEntryRenderWaitTotalMs || 0) + row.waitTotalMs;
        current.memoryEntryRenderContentionReceiptValidCount = Number(current.memoryEntryRenderContentionReceiptValidCount || 0) + (row.lastContention && row.lastContentionValid ? 1 : 0);
        current.memoryEntryRenderContentionReceiptInvalidCount = Number(current.memoryEntryRenderContentionReceiptInvalidCount || 0) + (row.lastContention && !row.lastContentionValid ? 1 : 0);
        if (row.project)
            current.projects.add(row.project);
        byGroup.set(groupId, current);
    }
    const groups = Array.from(byGroup.values()).map(group => ({
        ...group,
        invocationBranchCount: group.invocationBranchIds.size,
        invocationBranchIds: Array.from(group.invocationBranchIds).slice(0, 20),
        projects: Array.from(group.projects).slice(0, 12),
    })).sort((a, b) => Number(b.failCount + b.warnCount) - Number(a.failCount + a.warnCount));
    return {
        schema: "ccm-task-agent-memory-context-snapshot-inventory-v1",
        generatedAt: new Date(nowMs).toISOString(),
        directory: MEMORY_CONTEXT_SNAPSHOT_DIR,
        filters: {
            scopeId: filter.scopeId || "",
            taskId: filter.taskId || "",
            groupId: filter.groupId || "",
            project: filter.project || "",
            status: filter.status || "",
            sessionId: filter.sessionId || "",
        },
        policy,
        summary: {
            sessionCount: sessions.length,
            snapshotCount: rows.length,
            okCount: rows.filter(row => row.status === "ok").length,
            warnCount: rows.filter(row => row.status === "warn").length,
            failCount: rows.filter(row => row.status === "fail").length,
            referencedCount: rows.filter(row => row.source === "session_ref").length,
            orphanFileCount: rows.filter(row => row.source === "orphan_file").length,
            missingFileCount: rows.filter(row => !row.fileExists).length,
            unreadableCount: rows.filter(row => row.fileExists && !row.readable).length,
            checksumMismatchCount: rows.filter(row => row.readable && !row.checksumMatches).length,
            missingPacketCount: rows.filter(row => row.readable && !row.workerContextPacketId).length,
            missingGateCount: rows.filter(row => row.readable && !row.gateCount).length,
            groupSessionBoundCount: rows.filter(row => !!row.groupSessionScopeId).length,
            memorySnapshotSyncInitializeCount: rows.filter(row => row.memorySnapshotSyncAction === "initialize" && row.memorySnapshotSyncValid).length,
            memorySnapshotSyncPromptUpdateCount: rows.filter(row => row.memorySnapshotSyncAction === "prompt_update" && row.memorySnapshotSyncValid).length,
            memorySnapshotSyncUnchangedCount: rows.filter(row => row.memorySnapshotSyncAction === "none" && row.memorySnapshotSyncValid).length,
            memorySnapshotSyncInvalidCount: rows.filter(row => row.memorySnapshotSyncPresent && !row.memorySnapshotSyncValid).length,
            memorySnapshotSyncLegacyCount: rows.filter(row => !row.memorySnapshotSyncPresent).length,
            memorySnapshotSyncCommittedCount: rows.filter(row => row.memorySnapshotSyncCommitted).length,
            memorySnapshotSyncCommitPendingCount: rows.filter(row => row.memorySnapshotSyncPresent && !row.memorySnapshotSyncCommitPresent).length,
            memorySnapshotSyncCommitRejectedCount: rows.filter(row => row.memorySnapshotSyncCommitValid && row.memorySnapshotSyncCommitStatus === "rejected").length,
            memorySnapshotSyncCommitInvalidCount: rows.filter(row => row.memorySnapshotSyncCommitPresent && !row.memorySnapshotSyncCommitValid).length,
            memorySnapshotSyncLateFailurePreservedCount: rows.filter(row => row.memorySnapshotSyncLateFailurePreserved).length,
            memoryEntrySyncFullCount: rows.filter(row => row.memoryEntrySyncValid && row.memoryEntrySyncMode === "full").length,
            memoryEntrySyncDeltaCount: rows.filter(row => row.memoryEntrySyncValid && row.memoryEntrySyncMode === "delta").length,
            memoryEntrySyncContinuationCount: rows.filter(row => row.memoryEntrySyncValid && row.memoryEntrySyncMode === "continuation").length,
            memoryEntrySyncInvalidCount: rows.filter(row => row.memoryEntrySyncPresent && !row.memoryEntrySyncValid).length,
            memoryEntrySyncLegacyCount: rows.filter(row => !row.memoryEntrySyncPresent).length,
            memoryEntryChangedCount: rows.reduce((sum, row) => sum + Number(row.memoryEntryChangedCount || 0), 0),
            memoryEntryRemovedCount: rows.reduce((sum, row) => sum + Number(row.memoryEntryRemovedCount || 0), 0),
            memoryEntryRenderLeasePreparedCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "prepared").length,
            memoryEntryRenderLeaseActiveCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "prepared" && Date.parse(String(row.lease?.expires_at || "")) > nowMs && processIsAlive(Number(row.lease?.owner_pid || 0))).length,
            memoryEntryRenderLeaseBoundCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "bound").length,
            memoryEntryRenderLeaseRejectedCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "rejected").length,
            memoryEntryRenderLeaseStaleCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "prepared" && !(Date.parse(String(row.lease?.expires_at || "")) > nowMs && processIsAlive(Number(row.lease?.owner_pid || 0)))).length,
            memoryEntryRenderLeaseTakeoverCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.takeoverCount, 0),
            memoryEntryRenderLeaseHistoryCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.historyCount, 0),
            memoryEntryRenderLeaseMaxFencingToken: Math.max(0, ...memoryEntryRenderLeases.map(row => row.maxFencingToken)),
            memoryEntryRenderContentionCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.contentionCount, 0),
            memoryEntryRenderWaitResolvedCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.waitResolvedCount, 0),
            memoryEntryRenderWaitTimeoutCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.waitTimeoutCount, 0),
            memoryEntryRenderSameProcessConflictCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.sameProcessConflictCount, 0),
            memoryEntryRenderWaitTotalMs: memoryEntryRenderLeases.reduce((sum, row) => sum + row.waitTotalMs, 0),
            memoryEntryRenderContentionReceiptValidCount: memoryEntryRenderLeases.filter(row => row.lastContention && row.lastContentionValid).length,
            memoryEntryRenderContentionReceiptInvalidCount: memoryEntryRenderLeases.filter(row => row.lastContention && !row.lastContentionValid).length,
            memoryPromptInjectionProofCount: rows.filter(row => row.memoryPromptInjectionProofPresent).length,
            memoryPromptInjectionEnforcedCount: rows.filter(row => row.memoryPromptInjectionEnforced).length,
            memoryPromptInjectionPromptBoundCount: rows.filter(row => row.memoryPromptInjectionPromptBound).length,
            memoryPromptInjectionMissingCount: rows.filter(row => !row.memoryPromptInjectionProofPresent).length,
            memoryPromptInjectionInvalidCount: rows.filter(row => row.memoryPromptInjectionProofPresent && !row.memoryPromptInjectionProofValid).length,
            memoryTrustedEnvelopeRequiredCount: rows.filter(row => row.memoryTrustedEnvelopeRequired).length,
            memoryTrustedEnvelopeValidCount: rows.filter(row => row.memoryTrustedEnvelopeRequired && row.memoryTrustedEnvelopeValid && row.memoryTrustedEnvelopeBound).length,
            memoryTrustedEnvelopeUnverifiedCount: rows.filter(row => row.memoryTrustedEnvelopeRequired && row.memoryPromptInjectionRequired && (!row.memoryTrustedEnvelopeValid || !row.memoryTrustedEnvelopeBound)).length,
            memoryContinuationBaselineRequiredCount: rows.filter(row => row.memoryContinuationBaselineRequired).length,
            memoryContinuationBaselineValidCount: rows.filter(row => row.memoryContinuationBaselineRequired && row.memoryContinuationBaselineValid).length,
            memoryContinuationBaselineUnverifiedCount: rows.filter(row => row.memoryContinuationBaselineRequired && !row.memoryContinuationBaselineValid).length,
            providerMemoryChannelRequiredCount: rows.filter(row => row.providerMemoryChannelRequired).length,
            providerMemoryAcknowledgementRequiredCount: rows.filter(row => row.providerMemoryChannelAcknowledgementRequired).length,
            providerMemoryAcknowledgedCount: rows.filter(row => row.providerMemoryChannelAcknowledgementRequired && row.providerMemoryChannelAcknowledged).length,
            providerMemoryAcknowledgementUnverifiedCount: rows.filter(row => row.providerMemoryChannelAcknowledgementRequired && !row.providerMemoryChannelAcknowledged).length,
            providerMemoryStructuredAcknowledgedCount: rows.filter(row => row.providerMemoryChannelAcknowledged && ["structured_thread_started", "structured_session_event"].includes(row.providerMemoryChannelAcknowledgementPolicy)).length,
            providerMemoryExitSuccessAcknowledgedCount: rows.filter(row => row.providerMemoryChannelAcknowledged && row.providerMemoryChannelAcknowledgementPolicy === "process_exit_success").length,
            providerMemoryNativeSystemCount: rows.filter(row => row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeSystemPrompt).length,
            providerMemoryNativeDeveloperCount: rows.filter(row => row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeDeveloperInstructions).length,
            providerMemoryUserFallbackCount: rows.filter(row => row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryUserPromptFallback).length,
            providerMemoryChannelUnverifiedCount: rows.filter(row => row.providerMemoryChannelRequired && !row.providerMemoryChannelValid).length,
            memoryContextConsumptionReceiptRequiredCount: rows.filter(row => row.memoryContextConsumptionReceiptRequired).length,
            memoryContextConsumptionReceiptValidCount: rows.filter(row => row.memoryContextConsumptionReceiptRequired && row.memoryContextConsumptionReceiptValid).length,
            memoryContextConsumptionReceiptMissingCount: rows.filter(row => row.memoryContextConsumptionReceiptRequired && !row.memoryContextConsumptionReceiptValid).length,
            memoryContextConsumptionRecoveryCount: rows.filter(row => row.memoryContextConsumptionRecoveryPresent).length,
            memoryContextConsumptionRecoveredCount: rows.filter(row => row.memoryContextConsumptionRecoveryPresent && row.memoryContextConsumptionRecoveryValid && row.memoryContextConsumptionRecoveryStatus === "recovered").length,
            memoryContextConsumptionRecoveryBlockedCount: rows.filter(row => row.memoryContextConsumptionRecoveryStatus === "blocked").length,
            memoryContextConsumptionRecoveryInvalidCount: rows.filter(row => row.memoryContextConsumptionRecoveryPresent && !row.memoryContextConsumptionRecoveryValid).length,
            deliveredCount: rows.filter(row => row.memoryContextDelivered).length,
            deliveryMissingCount: rows.filter(row => !row.deliveryReceiptId).length,
            deliveryFailedCount: rows.filter(row => row.deliveryReceiptId && !row.memoryContextDelivered).length,
            deliveryChecksumMismatchCount: rows.filter(row => row.deliveryReceiptId && !row.deliveryReceiptChecksumValid).length,
            deliveryScopeMismatchCount: rows.filter(row => row.deliveryReceiptId && !row.deliveryGroupSessionBound).length,
            compactHeadFenceRequiredCount: rows.filter(row => row.compactHeadFenceRequired).length,
            compactHeadFenceValidCount: rows.filter(row => row.compactHeadFenceRequired && row.compactHeadFenceValid).length,
            compactHeadFenceStaleCount: rows.filter(row => row.compactHeadFenceRequired && !row.compactHeadFenceValid).length,
            sessionLifecycleFenceRequiredCount: rows.filter(row => row.sessionLifecycleFenceRequired).length,
            sessionLifecycleFenceValidCount: rows.filter(row => row.sessionLifecycleFenceRequired && row.sessionLifecycleFenceValid).length,
            sessionLifecycleFenceStaleCount: rows.filter(row => row.sessionLifecycleFenceRequired && !row.sessionLifecycleFenceValid).length,
            postTurnSummaryCapsuleCount: rows.filter(row => row.postTurnSummaryCapsulePresent).length,
            postTurnSummaryCapsuleValidCount: rows.filter(row => row.postTurnSummaryCapsuleValid).length,
            postTurnSummaryCapsuleMissingCount: rows.filter(row => row.postTurnSummaryExpected && !row.postTurnSummaryCapsulePresent).length,
            postTurnSummaryCapsuleInvalidCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleValid).length,
            postTurnSummaryCapsulePromptBoundCount: rows.filter(row => row.postTurnSummaryCapsulePromptBound).length,
            postTurnSummaryCapsuleSessionBoundCount: rows.filter(row => row.postTurnSummaryCapsuleSessionBound).length,
            postTurnSummaryCapsuleCompactEpochCount: rows.filter(row => !!row.postTurnSummaryCapsuleCompactEpoch).length,
            postTurnSummaryCapsuleCompactEpochMismatchCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleCompactEpochBound).length,
            postTurnSummaryCapsuleLedgerHeadMismatchCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleLedgerHeadBound).length,
            postTurnSummaryCapsuleSelectionMismatchCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleSelectionBound).length,
            invocationEdgeCount: rows.filter(row => row.invocationEdgeId).length,
            invocationLineageExpectedCount: rows.filter(row => row.invocationLineageExpected).length,
            invocationLineageBoundCount: rows.filter(row => row.invocationLineageExpected && row.invocationLineageBound && row.invocationLedgerBound).length,
            invocationLedgerMissingCount: rows.filter(row => row.invocationLineageExpected && !row.invocationLedgerBound).length,
            finalDispatchGateReadyCount: rows.filter(row => row.finalDispatchStatus === "ready").length,
            finalDispatchGateBlockedCount: rows.filter(row => row.finalDispatchStatus === "recompact_required").length,
            finalDispatchGateMissingCount: rows.filter(row => !row.finalDispatchPayloadGatePresent).length,
            finalDispatchGateInvalidCount: rows.filter(row => row.finalDispatchPayloadGatePresent && !row.finalDispatchPayloadGateValid).length,
            finalDispatchPromptBoundCount: rows.filter(row => row.finalDispatchPromptBound).length,
            finalDispatchLineageProofRequiredCount: rows.filter(row => row.finalDispatchLineageProofRequired).length,
            finalDispatchLineageProofCount: rows.filter(row => row.finalDispatchLineageProofRequired && row.finalDispatchLineageProofValid).length,
            finalDispatchReactiveCompactRecoveredCount: rows.filter(row => row.finalDispatchReactiveCompactStatus === "recovered").length,
            finalDispatchReactiveCompactBlockedCount: rows.filter(row => row.finalDispatchReactiveCompactStatus === "blocked").length,
            finalDispatchReactiveCompactInvalidCount: rows.filter(row => row.finalDispatchReactiveCompactPresent && !row.finalDispatchReactiveCompactValid).length,
            finalDispatchReactiveCompactCircuitOpenCount: rows.filter(row => row.finalDispatchReactiveCompactCircuitBlocked).length,
            finalDispatchReactiveCompactCircuitFailureCount: rows.reduce((sum, row) => sum + Number(row.finalDispatchReactiveCompactCircuitFailures || 0), 0),
            finalDispatchReactiveCompactCircuitInvalidCount: rows.filter(row => row.finalDispatchReactiveCompactCircuitBreakerPresent && !row.finalDispatchReactiveCompactCircuitBreakerValid).length,
            invocationBranchCount: new Set(rows.map(row => row.invocationBranchId).filter(Boolean)).size,
            staleCount: rows.filter(row => row.stale).length,
            prunableCount: rows.filter(row => row.prunable).length,
            groupCount: groups.length,
        },
        groups,
        rows: rows.slice(0, 300),
        weakRows: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 60),
        prunableRows: rows.filter(row => row.prunable),
    };
}
function pruneTaskAgentMemoryContextSnapshots(options = {}) {
    const dryRun = options.dryRun !== false && options.dry_run !== false;
    const inventory = buildTaskAgentMemoryContextSnapshotInventory(options);
    const candidates = (inventory.prunableRows || []).filter((row) => row.fileExists && row.snapshotFile && pathIsInsideMemorySnapshotDir(row.snapshotFile));
    const pruned = [];
    const skipped = [];
    const prunedMemoryReceiptChallengeIds = new Set();
    for (const row of candidates) {
        if (dryRun) {
            pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", latestDeliveryAttemptReceiptFile: row.latestDeliveryAttemptReceiptFile || "", syncCommitFile: row.memorySnapshotSyncCommitPath || "", sessionId: row.sessionId, dryRun: true, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
            continue;
        }
        try {
            if (/^mcrc_[a-f0-9]{28}$/.test(String(row.memoryContextConsumptionChallengeId || ""))) {
                prunedMemoryReceiptChallengeIds.add(String(row.memoryContextConsumptionChallengeId));
            }
            fs.rmSync(row.snapshotFile, { force: true });
            if (row.deliveryReceiptFile && pathIsInsideMemorySnapshotDir(row.deliveryReceiptFile))
                fs.rmSync(row.deliveryReceiptFile, { force: true });
            if (row.latestDeliveryAttemptReceiptFile && pathIsInsideMemorySnapshotDir(row.latestDeliveryAttemptReceiptFile))
                fs.rmSync(row.latestDeliveryAttemptReceiptFile, { force: true });
            if (row.memorySnapshotSyncCommitPath && pathIsInsideMemorySnapshotDir(row.memorySnapshotSyncCommitPath))
                fs.rmSync(row.memorySnapshotSyncCommitPath, { force: true });
            pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", latestDeliveryAttemptReceiptFile: row.latestDeliveryAttemptReceiptFile || "", syncCommitFile: row.memorySnapshotSyncCommitPath || "", sessionId: row.sessionId, dryRun: false, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
            try {
                const dir = path.dirname(row.snapshotFile);
                if (pathIsInsideMemorySnapshotDir(dir) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0)
                    fs.rmdirSync(dir);
            }
            catch { }
        }
        catch (error) {
            skipped.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, reason: error?.message || String(error) });
        }
    }
    if (!dryRun && pruned.length) {
        const prunedIds = new Set(pruned.map(row => String(row.snapshotId || "")).filter(Boolean));
        const prunedFiles = new Set(pruned.map(row => normalizeSnapshotFileKey(row.snapshotFile)).filter(Boolean));
        withTaskAgentSessionStoreLock(() => {
            const store = loadStore();
            store.sessions = store.sessions.map((session) => {
                const refs = normalizeMemorySnapshotRefs(session.memoryContextSnapshots).filter(ref => !prunedIds.has(ref.snapshotId)
                    && !prunedFiles.has(normalizeSnapshotFileKey(ref.snapshotPath)));
                const currentPruned = prunedIds.has(String(session.memoryContextSnapshotId || ""))
                    || prunedFiles.has(normalizeSnapshotFileKey(session.memoryContextSnapshotPath || ""));
                if (!currentPruned && refs.length === normalizeMemorySnapshotRefs(session.memoryContextSnapshots).length)
                    return session;
                const latest = [...refs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")))[0] || null;
                return {
                    ...session,
                    memoryContextSnapshotId: latest?.snapshotId || "",
                    memoryContextSnapshotPath: latest?.snapshotPath || "",
                    memoryContextSnapshotChecksum: latest?.checksum || "",
                    memoryContextPacketId: latest?.workerContextPacketId || "",
                    memoryContextSnapshotAt: latest?.generatedAt || "",
                    memoryContextDeliveryReceiptId: latest?.deliveryReceiptId || "",
                    memoryContextDeliveryReceiptPath: latest?.deliveryReceiptPath || "",
                    memoryContextDeliveryReceiptChecksum: latest?.deliveryReceiptChecksum || "",
                    memoryContextDeliveryStatus: latest?.deliveryStatus || "",
                    memoryContextDeliveredAt: latest?.deliveredAt || "",
                    latestMemoryContextDeliveryAttemptReceiptId: latest?.latestDeliveryAttemptReceiptId || "",
                    latestMemoryContextDeliveryAttemptReceiptPath: latest?.latestDeliveryAttemptReceiptPath || "",
                    latestMemoryContextDeliveryAttemptReceiptChecksum: latest?.latestDeliveryAttemptReceiptChecksum || "",
                    latestMemoryContextDeliveryAttemptStatus: latest?.latestDeliveryAttemptStatus || "",
                    latestMemoryContextDeliveryAttemptAt: latest?.latestDeliveryAttemptAt || "",
                    memorySnapshotSyncCommitPath: latest?.memorySnapshotSyncCommitPath || "",
                    memorySnapshotSyncCommitChecksum: latest?.memorySnapshotSyncCommitChecksum || "",
                    memorySnapshotSyncCommitStatus: latest?.memorySnapshotSyncCommitStatus || "",
                    memorySnapshotSyncCommittedAt: latest?.memorySnapshotSyncCommittedAt || "",
                    memoryContextSnapshots: refs,
                };
            });
            saveStore(store);
        });
        for (const challengeId of prunedMemoryReceiptChallengeIds)
            (0, memory_context_consumption_receipt_1.removeMemoryContextConsumptionReceiptIfUnreferenced)(challengeId);
        for (const challengeId of prunedMemoryReceiptChallengeIds)
            (0, memory_context_consumption_recovery_1.removeMemoryContextConsumptionRecoveryIfUnreferenced)(challengeId);
    }
    return {
        schema: "ccm-task-agent-memory-context-snapshot-retention-result-v1",
        generatedAt: new Date().toISOString(),
        dryRun,
        policy: inventory.policy,
        before: inventory.summary,
        candidateCount: candidates.length,
        prunedCount: pruned.length,
        skippedCount: skipped.length,
        pruned,
        skipped,
    };
}
function purgeTaskAgentSessions(taskId) {
    const id = String(taskId || "").trim();
    if (!id)
        return [];
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const removed = store.sessions.filter((item) => item.taskId === id || item.scopeId === id);
        if (!removed.length)
            return [];
        store.sessions = store.sessions.filter((item) => item.taskId !== id && item.scopeId !== id);
        for (const session of removed)
            purgeMemoryContextSnapshotsForSession(session.id);
        saveStore(store);
        // A purged session must not be recoverable from the store backup.
        try {
            fs.copyFileSync(STORE_FILE, STORE_BACKUP_FILE);
        }
        catch { }
        return removed;
    });
}
function reconcileTaskAgentSessions(tasks, nowMs = Date.now()) {
    const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map((task) => [String(task.id || ""), task]));
    return withTaskAgentSessionStoreLock(() => {
        const store = loadStore();
        const closed = [];
        const now = new Date(nowMs).toISOString();
        store.sessions = store.sessions.map((session) => {
            if (session.status !== "open")
                return session;
            const task = taskMap.get(session.taskId || session.scopeId);
            const inactiveMs = nowMs - Date.parse(session.lastUsedAt || session.createdAt || now);
            const terminal = !task || task.archived || task.deleted_at || ["done", "cancelled", "archived"].includes(String(task.status || ""));
            const abandoned = inactiveMs > 30 * 24 * 60 * 60 * 1000 && String(task?.status || "") !== "in_progress";
            if (!terminal && !abandoned)
                return session;
            const next = { ...session, status: "closed", closedAt: now, lastUsedAt: now, closeReason: terminal ? "任务已终态、归档或不存在，自动关闭残留会话" : "会话超过 30 天未使用，自动关闭" };
            closed.push(next);
            return next;
        });
        if (closed.length)
            saveStore(store);
        return { closed: closed.length, sessions: closed };
    });
}
function shouldCloseTaskAgentSessions(input) {
    const hasPersistentTask = !!String(input.taskId || "").trim();
    const terminalStatuses = new Set(["done", "cancelled", "archived", "deleted"]);
    return hasPersistentTask
        ? terminalStatuses.has(String(input.taskStatus || ""))
        : String(input.reviewStatus || "") === "complete";
}
function runTaskAgentSessionSelfTest() {
    const claude = {
        nativeSessionId: crypto.randomUUID(),
        resumeMode: "native",
        turnCount: 1,
    };
    const options = getTaskAgentSessionOptions(claude);
    const cursorWithoutCapturedId = advanceTaskAgentSession({ ...claude, id: "cursor-test", agentType: "cursor", nativeSessionId: "", turnCount: 0 }, { success: true });
    const codexWithCapturedId = advanceTaskAgentSession({ ...claude, id: "codex-test", agentType: "codex", nativeSessionId: "", turnCount: 0 }, { success: true, nativeSessionId: "codex-thread-1" });
    const invalidCursor = advanceTaskAgentSession({ ...claude, id: "cursor-invalid", agentType: "cursor", nativeSessionId: "cursor-thread-old", turnCount: 2 }, { success: false, error: "session not found" });
    const runtimeSnapshotSession = advanceTaskAgentSession({ ...claude, id: "runtime-snapshot", agentType: "claudecode", nativeSessionId: "claude-session", turnCount: 1 }, {
        success: true,
        runtimeToolSnapshot: {
            snapshotId: "snap-runtime",
            snapshotPath: "/tmp/runtime-tool-snapshot.json",
            mcpConfigPath: "/tmp/mcp.json",
            allowedTools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
            permissionRules: [{ rule: "mcp__ccm__payments__createInvoice" }],
        },
    });
    const checks = {
        persistsNativeSession: options.persistSession,
        resumesAfterFirstTurn: options.resumeSession,
        preservesNativeId: options.sessionId === claude.nativeSessionId,
        cursorUsesNativeContinuation: (0, runtime_1.getAgentRuntime)("cursor").capabilities.sessionResume,
        persistentTaskWaitsForDoneState: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "in_progress" }),
        persistentTaskClosesAfterDoneState: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "done" }),
        persistentTaskKeepsSessionOnFailed: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "failed" }),
        persistentTaskKeepsSessionOnPaused: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "paused" }),
        persistentTaskClosesAfterCancelled: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "cancelled" }),
        persistentTaskClosesAfterArchived: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "archived" }),
        conversationalTaskClosesAfterReview: shouldCloseTaskAgentSessions({ reviewStatus: "complete" }),
        missingNativeIdCanDegradeSafely: cursorWithoutCapturedId.resumeMode === "scratchpad" && cursorWithoutCapturedId.nativeCaptureFailures === 1,
        capturedNativeIdStaysResumable: codexWithCapturedId.resumeMode === "native" && getTaskAgentSessionOptions(codexWithCapturedId).resumeSession,
        invalidNativeSessionCreatesRecoveryPath: invalidCursor.resumeMode === "native" && invalidCursor.nativeSessionId === "" && invalidCursor.nativeSessionHistory?.includes("cursor-thread-old") && invalidCursor.nativeRecoveryAttempts === 1,
        runtimeSnapshotPersistsAcrossTurns: runtimeSnapshotSession.runtimeSnapshotId === "snap-runtime" && getTaskAgentSessionOptions(runtimeSnapshotSession).runtimeSnapshotId === "snap-runtime" && getTaskAgentSessionContinuity(runtimeSnapshotSession).mcpConfigPath === "/tmp/mcp.json",
        permissionDriftRebuildsNativeSession: (() => {
            const drifted = advanceTaskAgentSession({ ...claude, id: "codex-drift", agentType: "codex", nativeSessionId: "codex-readonly", turnCount: 3 }, { success: false, error: "sandbox read-only", permissionDrift: true });
            return drifted.resumeMode === "native" && drifted.nativeSessionId === "" && drifted.turnCount === 0 && drifted.nativeSessionHistory?.includes("codex-readonly") && drifted.permissionDriftCount === 1;
        })(),
        taskAgentMemoryContextSnapshotBindsSession: (() => {
            const taskId = `task-agent-memory-snapshot-selftest-${process.pid}-${Date.now().toString(36)}`;
            try {
                const session = openTaskAgentSession({
                    scopeId: taskId,
                    taskId,
                    groupId: "group-agent-memory-snapshot-selftest",
                    project: "frontend",
                    agentType: "codex",
                });
                const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
                    taskId,
                    groupId: "group-agent-memory-snapshot-selftest",
                    project: "frontend",
                    agentType: "codex",
                    nativeSessionId: "codex-native-memory-selftest",
                    turn: 1,
                    executionId: "exec-agent-memory-snapshot-selftest",
                    traceId: "trace-agent-memory-snapshot-selftest",
                    workerContextPacket: {
                        packet_id: "wcp_agent_memory_snapshot_selftest",
                        memory: {
                            schema: "ccm-group-memory-context-v1",
                            target_project: "frontend",
                            dispatch_freshness_gate: {
                                schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
                                dispatch_gate_id: "gmd_agent_memory_snapshot_selftest",
                            },
                        },
                    },
                    renderedPrompt: "prompt contains injected worker memory",
                });
                const listed = listTaskAgentMemoryContextSnapshots({ taskId });
                const loaded = listed.find((item) => item.snapshot_id === bound?.snapshot?.snapshot_id);
                return !!bound?.session.memoryContextSnapshotId
                    && !!bound?.snapshot.snapshot_file
                    && fs.existsSync(bound.snapshot.snapshot_file)
                    && loaded?.context?.worker_context_packet_id === "wcp_agent_memory_snapshot_selftest"
                    && loaded?.context?.gate_ids?.includes("gmd_agent_memory_snapshot_selftest")
                    && loaded?.session?.id === session.id;
            }
            finally {
                purgeTaskAgentSessions(taskId);
            }
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=agent-sessions.js.map