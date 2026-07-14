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
exports.verifyMemoryContextDeliveryReceiptChecksum = verifyMemoryContextDeliveryReceiptChecksum;
exports.openTaskAgentSession = openTaskAgentSession;
exports.recordTaskAgentSessionTurn = recordTaskAgentSessionTurn;
exports.bindTaskAgentMemoryContextSnapshot = bindTaskAgentMemoryContextSnapshot;
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
const utils_1 = require("../core/utils");
const group_post_turn_summary_1 = require("../modules/collaboration/group-post-turn-summary");
const group_memory_compaction_1 = require("../modules/collaboration/group-memory-compaction");
const group_compact_head_1 = require("../modules/collaboration/group-compact-head");
const group_session_lifecycle_head_1 = require("../modules/collaboration/group-session-lifecycle-head");
const task_agent_invocation_lineage_1 = require("./task-agent-invocation-lineage");
const task_agent_continuation_soak_1 = require("./task-agent-continuation-soak");
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
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS = 30;
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS = 45;
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION = 5;
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
        generatedAt: String(item?.generatedAt || item?.generated_at || "").trim(),
    })).filter((item) => item.snapshotId || item.snapshotPath);
}
function purgeMemoryContextSnapshotsForSession(sessionId) {
    const dir = getMemoryContextSnapshotDir(sessionId);
    try {
        if (fs.existsSync(dir))
            fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
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
                if (fileEntry.isFile() && fileEntry.name.endsWith(".json") && !fileEntry.name.endsWith(".delivery.json")) {
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
        const memoryContext = input.memoryContext || packet.memory || input.workerHandoff?.references?.memory_context || input.workerHandoff?.references?.memoryContext || null;
        const groupSessionMemoryBinding = extractGroupSessionMemoryBinding(memoryContext || {});
        const workerHandoffId = String(input.workerHandoff?.handoff_id || input.workerHandoff?.handoffId || input.workerHandoffSummary?.handoff_id || input.workerHandoffSummary?.handoffId || "").trim();
        const workerContextPacketId = String(packet?.packet_id || packet?.packetId || input.workerHandoffSummary?.packet_id || input.workerHandoffSummary?.packetId || "").trim();
        const generatedAt = new Date().toISOString();
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
                attempt_sequence: Number(input.turn || current.turnCount + 1 || 0),
                invocation_kind: Number(input.turn || current.turnCount + 1 || 0) > 1 ? "resume" : "spawn",
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
            Number(input.turn || current.turnCount + 1 || 0),
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
                turn: Number(input.turn || current.turnCount + 1 || 0),
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
                memory_context_checksum: hashValue(memoryContext || {}),
                group_session_memory_binding: groupSessionMemoryBinding,
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
        };
        const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
        refs.push(ref);
        const next = {
            ...current,
            memoryContextSnapshotId: snapshotId,
            memoryContextSnapshotPath: snapshotFile,
            memoryContextSnapshotChecksum: checksum,
            memoryContextPacketId: workerContextPacketId,
            memoryContextSnapshotAt: generatedAt,
            memoryContextSnapshots: refs.slice(-MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
            lastUsedAt: generatedAt,
        };
        store.sessions[index] = next;
        saveStore(store);
        return { session: next, snapshot, ref };
    });
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
        const taskArtifactProven = delivered
            && memoryEvidenceReady
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
            status: delivered && memoryEvidenceReady
                ? "delivered"
                : !sessionLifecycleFenceValid ? "session_lifecycle_stale" : !compactHeadFenceValid ? "compact_head_stale" : "binding_failed",
            delivered: delivered && memoryEvidenceReady,
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
        };
        const receipt = { ...payload, checksum: hashValue(payload, 64), receiptFile };
        writeJsonAtomic(receiptFile, receipt);
        const nextRef = {
            ...(ref || {
                snapshotId,
                snapshotPath: snapshotFile,
                checksum: String(snapshot.checksum || ""),
                generatedAt: String(snapshot.generated_at || ""),
            }),
            deliveryReceiptId: receiptId,
            deliveryReceiptPath: receiptFile,
            deliveryReceiptChecksum: receipt.checksum,
            deliveryStatus: receipt.status,
            deliveredAt,
        };
        if (refIndex >= 0)
            refs[refIndex] = nextRef;
        else
            refs.push(nextRef);
        const next = {
            ...current,
            memoryContextDeliveryReceiptId: receiptId,
            memoryContextDeliveryReceiptPath: receiptFile,
            memoryContextDeliveryReceiptChecksum: receipt.checksum,
            memoryContextDeliveryStatus: receipt.status,
            memoryContextDeliveredAt: deliveredAt,
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
        return { session: next, receipt, ref: nextRef };
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
    if (deliveryReceipt && !deliveryReceiptChecksumValid)
        hardGaps.push({ reason: "runner memory delivery receipt checksum 不匹配" });
    if (deliveryReceipt && !deliverySnapshotBound)
        hardGaps.push({ reason: "runner memory delivery receipt 未绑定当前 task Agent snapshot/session" });
    if (deliveryReceipt && !deliveryGroupSessionBound)
        hardGaps.push({ reason: "runner memory delivery receipt 群聊会话 scope/checksum 不匹配" });
    if (deliveryReceipt && compactHeadFenceRequired && !compactHeadFenceValid)
        hardGaps.push({ reason: `runner compact head 已过期：${(deliveryReceipt.compactHeadFenceIssues || []).join(",") || deliveryReceipt.compactHeadFenceStatus || "stale"}` });
    if (sessionLifecycleFenceRequired && !sessionLifecycleFenceValid)
        hardGaps.push({ reason: `群聊会话生命周期已变化：${(sessionLifecycleValidation.issues || []).join(",") || sessionLifecycleValidation.status || "stale"}` });
    if (deliveryReceipt && deliveryReceipt.delivered !== true)
        hardGaps.push({ reason: `runner memory delivery 失败：${deliveryReceipt.promptBindingMode || deliveryReceipt.status || "unknown"}` });
    if (input.source === "session_ref" && !deliveryReceipt)
        warningGaps.push({ reason: "快照尚无 runner memory delivery receipt" });
    if (loaded && !gateIds.length)
        warningGaps.push({ reason: "快照未捕获 memory gate ids" });
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
        groupSessionId: String(groupSessionMemoryBinding?.groupSessionId || ""),
        groupSessionScopeId: String(groupSessionMemoryBinding?.scopeId || ""),
        sessionMemoryChecksum: String(groupSessionMemoryBinding?.sessionMemoryChecksum || ""),
        sessionMemoryHasSummary: groupSessionMemoryBinding?.sessionMemoryHasSummary === true,
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
    const policy = { staleDays, retentionDays, keepLatestPerSession };
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
        const current = byGroup.get(groupId) || { groupId, snapshotCount: 0, okCount: 0, warnCount: 0, failCount: 0, prunableCount: 0, staleCount: 0, deliveredCount: 0, deliveryMissingCount: 0, deliveryFailedCount: 0, compactHeadFenceRequiredCount: 0, compactHeadFenceValidCount: 0, compactHeadFenceStaleCount: 0, sessionLifecycleFenceRequiredCount: 0, sessionLifecycleFenceValidCount: 0, sessionLifecycleFenceStaleCount: 0, postTurnSummaryCapsuleCount: 0, postTurnSummaryCapsuleValidCount: 0, postTurnSummaryCapsuleMissingCount: 0, postTurnSummaryCapsuleInvalidCount: 0, postTurnSummaryCapsulePromptBoundCount: 0, postTurnSummaryCapsuleCompactEpochMismatchCount: 0, postTurnSummaryCapsuleLedgerHeadMismatchCount: 0, invocationEdgeCount: 0, invocationLineageBoundCount: 0, invocationLedgerMissingCount: 0, invocationBranchIds: new Set(), projects: new Set() };
        current.snapshotCount += 1;
        if (row.status === "ok")
            current.okCount += 1;
        if (row.status === "warn")
            current.warnCount += 1;
        if (row.status === "fail")
            current.failCount += 1;
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
        if (row.invocationBranchId)
            current.invocationBranchIds.add(row.invocationBranchId);
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
    for (const row of candidates) {
        if (dryRun) {
            pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", sessionId: row.sessionId, dryRun: true, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
            continue;
        }
        try {
            fs.rmSync(row.snapshotFile, { force: true });
            if (row.deliveryReceiptFile && pathIsInsideMemorySnapshotDir(row.deliveryReceiptFile))
                fs.rmSync(row.deliveryReceiptFile, { force: true });
            pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, deliveryReceiptFile: row.deliveryReceiptFile || "", sessionId: row.sessionId, dryRun: false, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
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
                    memoryContextSnapshots: refs,
                };
            });
            saveStore(store);
        });
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