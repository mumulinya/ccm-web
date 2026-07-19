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
exports.TERMINAL = exports.RECOVERY_LEASE_MS = exports.LOCK_STALE_MS = exports.TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA = exports.TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA = exports.TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA = exports.TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA = exports.TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA = exports.TASK_AGENT_INVOCATION_RECOVERY_DIR = exports.TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA = exports.TASK_AGENT_INVOCATION_LINEAGE_DIR = exports.TASK_AGENT_INVOCATION_EVENT_SCHEMA = exports.TASK_AGENT_INVOCATION_EDGE_SCHEMA = void 0;
exports.canonical = canonical;
exports.sha256 = sha256;
exports.rawJsonSha256 = rawJsonSha256;
exports.writeJsonAtomic = writeJsonAtomic;
exports.clean = clean;
exports.processAlive = processAlive;
exports.assertIdentity = assertIdentity;
exports.assertGroupSessionIdentity = assertGroupSessionIdentity;
exports.recordInvocationSoakPhase = recordInvocationSoakPhase;
exports.getTaskAgentInvocationLineageFile = getTaskAgentInvocationLineageFile;
exports.acquireLock = acquireLock;
exports.eventChecksum = eventChecksum;
exports.edgeChecksum = edgeChecksum;
exports.readEventsFromFile = readEventsFromFile;
exports.appendEvent = appendEvent;
exports.listFiles = listFiles;
exports.readTaskAgentInvocationLineage = readTaskAgentInvocationLineage;
exports.listTaskAgentInvocationEdges = listTaskAgentInvocationEdges;
exports.findTaskAgentInvocationEdge = findTaskAgentInvocationEdge;
exports.latestCommittedEdge = latestCommittedEdge;
exports.prepareTaskAgentInvocationEdge = prepareTaskAgentInvocationEdge;
exports.transitionEdge = transitionEdge;
exports.bindTaskAgentInvocationContext = bindTaskAgentInvocationContext;
exports.dispatchTaskAgentInvocationEdge = dispatchTaskAgentInvocationEdge;
exports.bindTaskAgentInvocationRunnerRequest = bindTaskAgentInvocationRunnerRequest;
exports.nativeContinuationReceiptChecksum = nativeContinuationReceiptChecksum;
exports.verifyTaskAgentNativeContinuationReceipt = verifyTaskAgentNativeContinuationReceipt;
exports.buildTaskAgentNativeContinuationReceipt = buildTaskAgentNativeContinuationReceipt;
exports.contextRebudgetProofChecksum = contextRebudgetProofChecksum;
exports.verifyTaskAgentContextRebudgetProof = verifyTaskAgentContextRebudgetProof;
exports.buildTaskAgentContextRebudgetProof = buildTaskAgentContextRebudgetProof;
exports.adoptionReceiptChecksum = adoptionReceiptChecksum;
exports.verifyTaskAgentInvocationAdoptionReceipt = verifyTaskAgentInvocationAdoptionReceipt;
exports.buildTaskAgentInvocationAdoptionReceipt = buildTaskAgentInvocationAdoptionReceipt;
exports.completeTaskAgentInvocationEdge = completeTaskAgentInvocationEdge;
exports.verifyMemoryDeliveryReceiptChecksum = verifyMemoryDeliveryReceiptChecksum;
exports.reinjectionProofChecksum = reinjectionProofChecksum;
exports.verifyTaskAgentInvocationReinjectionProof = verifyTaskAgentInvocationReinjectionProof;
exports.bindTaskAgentInvocationMemoryDelivery = bindTaskAgentInvocationMemoryDelivery;
exports.recoveryEventChecksum = recoveryEventChecksum;
exports.recoveryStatusChecksum = recoveryStatusChecksum;
exports.getInvocationRecoveryHistoryFile = getInvocationRecoveryHistoryFile;
exports.getInvocationRecoveryStatusFile = getInvocationRecoveryStatusFile;
// Behavior-freeze split from task-agent-invocation-lineage.ts (part 1/2).
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const native_continuation_1 = require("../agents/native-continuation");
const runtime_1 = require("../agents/runtime");
const task_agent_continuation_soak_1 = require("./task-agent-continuation-soak");
const group_compact_head_1 = require("../modules/collaboration/group-compact-head");
const group_session_lifecycle_head_1 = require("../modules/collaboration/group-session-lifecycle-head");
const final_dispatch_payload_gate_1 = require("../agents/final-dispatch-payload-gate");
exports.TASK_AGENT_INVOCATION_EDGE_SCHEMA = "ccm-task-agent-invocation-edge-v1";
exports.TASK_AGENT_INVOCATION_EVENT_SCHEMA = "ccm-task-agent-invocation-lineage-event-v1";
exports.TASK_AGENT_INVOCATION_LINEAGE_DIR = path.join(utils_1.CCM_DIR, "task-agent-invocation-lineage");
exports.TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA = "ccm-task-agent-invocation-recovery-event-v1";
exports.TASK_AGENT_INVOCATION_RECOVERY_DIR = path.join(utils_1.CCM_DIR, "task-agent-invocation-recovery");
exports.TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA = "ccm-task-agent-invocation-recovery-lease-v1";
exports.TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA = "ccm-task-agent-invocation-adoption-receipt-v1";
exports.TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA = "ccm-task-agent-invocation-reinjection-proof-v1";
exports.TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA = "ccm-task-agent-native-continuation-receipt-v1";
exports.TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA = "ccm-task-agent-context-rebudget-proof-v1";
exports.LOCK_STALE_MS = 60_000;
exports.RECOVERY_LEASE_MS = 120_000;
exports.TERMINAL = new Set(["completed", "failed"]);
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonical(value[key]);
        return result;
    }, {});
}
function sha256(value, length = 64) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}
function rawJsonSha256(value, length = 64) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.tmp`;
    const fd = fs.openSync(temp, "w");
    try {
        fs.writeFileSync(fd, JSON.stringify(value, null, 2), "utf-8");
        fs.fsyncSync(fd);
    }
    finally {
        fs.closeSync(fd);
    }
    fs.renameSync(temp, file);
}
function clean(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}
function processAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function assertIdentity(groupId, groupSessionId, taskAgentSessionId) {
    if (!groupId || !groupSessionId.startsWith("gcs_") || !taskAgentSessionId.startsWith("tas_")) {
        throw new Error("task-agent invocation lineage requires groupId--gcs_*--tas_* identity");
    }
}
function assertGroupSessionIdentity(groupId, groupSessionId) {
    if (!groupId || !groupSessionId.startsWith("gcs_")) {
        throw new Error("task-agent invocation recovery requires groupId--gcs_* identity");
    }
}
function recordInvocationSoakPhase(edge, phase, status, evidence = {}, eventKey = "") {
    return (0, task_agent_continuation_soak_1.tryRecordTaskAgentContinuationSoakEvent)({
        groupId: edge?.group_id,
        groupSessionId: edge?.group_session_id,
        taskAgentSessionId: edge?.task_agent_session_id,
        phase,
        status,
        invocationEdgeId: edge?.invocation_edge_id,
        eventKey: eventKey || `${phase}:${edge?.invocation_edge_id || "unknown"}:${evidence?.proof_checksum || evidence?.receipt_checksum || edge?.edge_checksum || status}`,
        evidence: { ...edge, ...evidence },
        source: "invocation_runtime",
    });
}
function getTaskAgentInvocationLineageFile(groupId, groupSessionId, taskAgentSessionId) {
    assertIdentity(groupId, groupSessionId, taskAgentSessionId);
    return path.join(exports.TASK_AGENT_INVOCATION_LINEAGE_DIR, `${clean(groupId)}--${clean(groupSessionId)}--${clean(taskAgentSessionId)}.jsonl`);
}
function acquireLock(file) {
    const lock = `${file}.lock`;
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
            const fd = fs.openSync(lock, "wx");
            fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), acquired_at: new Date().toISOString() }), "utf-8");
            fs.fsyncSync(fd);
            return () => { try {
                fs.closeSync(fd);
            }
            catch { } try {
                fs.unlinkSync(lock);
            }
            catch { } };
        }
        catch (error) {
            if (error?.code !== "EEXIST")
                throw error;
            try {
                const stat = fs.statSync(lock);
                const owner = JSON.parse(fs.readFileSync(lock, "utf-8"));
                if (Date.now() - stat.mtimeMs > exports.LOCK_STALE_MS && !processAlive(Number(owner?.pid || 0))) {
                    fs.unlinkSync(lock);
                    continue;
                }
            }
            catch { }
            const until = Date.now() + 12 + attempt * 4;
            while (Date.now() < until) { }
        }
    }
    throw new Error(`task-agent invocation lineage lock busy: ${lock}`);
}
function eventChecksum(event) {
    const payload = { ...(event || {}) };
    delete payload.event_checksum;
    delete payload.checksum_valid;
    return sha256(payload);
}
function edgeChecksum(edge) {
    const payload = { ...(edge || {}) };
    delete payload.edge_checksum;
    delete payload.checksum_valid;
    delete payload.event_checksum;
    delete payload.previous_event_checksum;
    delete payload.sequence;
    delete payload.ledger_file;
    delete payload.ledger_valid;
    delete payload.event_sequence;
    return sha256(payload);
}
function readEventsFromFile(file) {
    if (!fs.existsSync(file))
        return { file, valid: true, events: [], issues: [], headChecksum: "", lastSequence: 0 };
    const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean);
    const events = [];
    const issues = [];
    let previous = "";
    let expectedSequence = 1;
    for (const line of lines) {
        try {
            const event = JSON.parse(line);
            const checksumValid = String(event.event_checksum || "") === eventChecksum(event);
            if (event.schema !== exports.TASK_AGENT_INVOCATION_EVENT_SCHEMA)
                issues.push("event_schema_invalid");
            if (Number(event.sequence || 0) !== expectedSequence)
                issues.push("event_sequence_invalid");
            if (String(event.previous_event_checksum || "") !== previous)
                issues.push("event_chain_broken");
            if (!checksumValid)
                issues.push("event_checksum_invalid");
            events.push({ ...event, checksum_valid: checksumValid });
            previous = String(event.event_checksum || "");
            expectedSequence += 1;
        }
        catch {
            issues.push("event_json_invalid");
        }
    }
    return { file, valid: issues.length === 0, events, issues: Array.from(new Set(issues)), headChecksum: previous, lastSequence: events.length };
}
function appendEvent(file, edge, transition) {
    const release = acquireLock(file);
    try {
        const ledger = readEventsFromFile(file);
        if (!ledger.valid)
            throw new Error(`task-agent invocation lineage invalid: ${ledger.issues.join(",")}`);
        const event = {
            schema: exports.TASK_AGENT_INVOCATION_EVENT_SCHEMA,
            version: 1,
            sequence: ledger.lastSequence + 1,
            previous_event_checksum: ledger.headChecksum,
            transition,
            recorded_at: new Date().toISOString(),
            edge,
        };
        event.event_checksum = eventChecksum(event);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const fd = fs.openSync(file, "a");
        try {
            fs.writeSync(fd, `${JSON.stringify(event)}\n`, undefined, "utf-8");
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
        return { ...event, checksum_valid: true };
    }
    finally {
        release();
    }
}
function listFiles() {
    try {
        return fs.readdirSync(exports.TASK_AGENT_INVOCATION_LINEAGE_DIR).filter(name => name.endsWith(".jsonl")).map(name => path.join(exports.TASK_AGENT_INVOCATION_LINEAGE_DIR, name));
    }
    catch {
        return [];
    }
}
function readTaskAgentInvocationLineage(groupId, groupSessionId, taskAgentSessionId) {
    const ledger = readEventsFromFile(getTaskAgentInvocationLineageFile(groupId, groupSessionId, taskAgentSessionId));
    const byId = new Map();
    for (const event of ledger.events) {
        const edge = event.edge || {};
        if (edge.invocation_edge_id)
            byId.set(String(edge.invocation_edge_id), { ...edge, ledger_file: ledger.file, event_sequence: event.sequence, event_checksum: event.event_checksum });
    }
    return { ...ledger, edges: Array.from(byId.values()), latest: Array.from(byId.values()).slice(-1)[0] || null };
}
function listTaskAgentInvocationEdges(filter = {}) {
    const edges = [];
    const issues = [];
    for (const file of listFiles()) {
        const ledger = readEventsFromFile(file);
        if (!ledger.valid)
            issues.push({ file, issues: ledger.issues });
        const byId = new Map();
        for (const event of ledger.events) {
            if (event.edge?.invocation_edge_id)
                byId.set(String(event.edge.invocation_edge_id), { ...event.edge, ledger_file: file, event_sequence: event.sequence, event_checksum: event.event_checksum, ledger_valid: ledger.valid });
        }
        edges.push(...byId.values());
    }
    const filtered = edges.filter(edge => (!filter.groupId && !filter.group_id || edge.group_id === String(filter.groupId || filter.group_id))
        && (!filter.groupSessionId && !filter.group_session_id || edge.group_session_id === String(filter.groupSessionId || filter.group_session_id))
        && (!filter.taskAgentSessionId && !filter.task_agent_session_id || edge.task_agent_session_id === String(filter.taskAgentSessionId || filter.task_agent_session_id))
        && (!filter.taskId && !filter.task_id || edge.task_id === String(filter.taskId || filter.task_id))
        && (!filter.project || edge.target_project === String(filter.project)));
    filtered.sort((a, b) => String(a.prepared_at || "").localeCompare(String(b.prepared_at || "")) || Number(a.provider_attempt || 0) - Number(b.provider_attempt || 0));
    return { schema: "ccm-task-agent-invocation-lineage-list-v1", valid: issues.length === 0, issues, edges: filtered };
}
function findTaskAgentInvocationEdge(invocationEdgeId) {
    return listTaskAgentInvocationEdges({}).edges.find((edge) => edge.invocation_edge_id === String(invocationEdgeId || "")) || null;
}
function latestCommittedEdge(filter = {}) {
    const edges = listTaskAgentInvocationEdges(filter).edges.filter((edge) => ["dispatched", "completed", "failed"].includes(String(edge.status || "")));
    return edges.slice(-1)[0] || null;
}
function prepareTaskAgentInvocationEdge(input = {}) {
    const groupId = String(input.groupId || input.group_id || "").trim();
    const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
    const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || "").trim();
    assertIdentity(groupId, groupSessionId, taskAgentSessionId);
    const parent = input.parentInvocationEdge || input.parent_invocation_edge || (input.parentInvocationEdgeId || input.parent_invocation_edge_id ? findTaskAgentInvocationEdge(String(input.parentInvocationEdgeId || input.parent_invocation_edge_id)) : latestCommittedEdge({ groupId, groupSessionId, taskId: input.taskId || input.task_id, project: input.targetProject || input.target_project }));
    const branchKind = String(input.branchKind || input.branch_kind || (parent ? "native_recovery" : "main"));
    const createsBranch = ["provider_switch", "fork"].includes(branchKind);
    const branchId = String(input.branchId || input.branch_id || (!parent ? `tbr_${sha256(`${groupId}\0${groupSessionId}\0${taskAgentSessionId}\0main`, 20)}` : createsBranch ? `tbr_${sha256(`${parent.invocation_edge_id}\0${taskAgentSessionId}\0${branchKind}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 20)}` : parent.branch_id)).trim();
    const preparedAt = String(input.preparedAt || input.prepared_at || new Date().toISOString());
    const edgeId = `tie_${sha256(`${groupId}\0${groupSessionId}\0${taskAgentSessionId}\0${preparedAt}\0${crypto.randomBytes(10).toString("hex")}`, 24)}`;
    const invocationKind = String(input.invocationKind || input.invocation_kind || (Number(input.attemptSequence || input.attempt_sequence || 1) > 1 ? "resume" : "spawn")) === "resume" ? "resume" : "spawn";
    const parentAncestry = parent ? [
        { invocation_edge_id: String(parent.invocation_edge_id || ""), edge_checksum: String(parent.edge_checksum || "") },
        ...(Array.isArray(parent.parent_ancestry) ? parent.parent_ancestry : []),
    ].filter((row) => row.invocation_edge_id && row.edge_checksum).slice(0, 32) : [];
    const edge = {
        schema: exports.TASK_AGENT_INVOCATION_EDGE_SCHEMA,
        version: 1,
        invocation_edge_id: edgeId,
        parent_invocation_edge_id: String(parent?.invocation_edge_id || ""),
        root_invocation_edge_id: String(parent?.root_invocation_edge_id || parent?.invocation_edge_id || edgeId),
        branch_id: branchId,
        parent_branch_id: createsBranch ? String(parent?.branch_id || "") : String(parent?.parent_branch_id || ""),
        group_id: groupId,
        group_session_id: groupSessionId,
        task_id: String(input.taskId || input.task_id || ""),
        target_project: String(input.targetProject || input.target_project || input.project || ""),
        task_agent_session_id: taskAgentSessionId,
        native_session_id: String(input.nativeSessionId || input.native_session_id || ""),
        parent_native_session_id: String(parent?.native_session_id || ""),
        execution_id: String(input.executionId || input.execution_id || ""),
        attempt_sequence: Math.max(1, Math.floor(Number(input.attemptSequence || input.attempt_sequence || 1) || 1)),
        provider_attempt: Math.max(1, Math.floor(Number(input.providerAttempt || input.provider_attempt || 1) || 1)),
        invocation_kind: invocationKind,
        branch_kind: branchKind,
        retry_of_invocation_edge_id: String(input.retryOfInvocationEdgeId || input.retry_of_invocation_edge_id || (parent && branchKind !== "main" ? parent.invocation_edge_id : "")),
        fork_reason: String(input.forkReason || input.fork_reason || ""),
        compact_epoch: String(input.compactEpoch || input.compact_epoch || "precompact"),
        expected_lineage_head_checksum: String(parent?.edge_checksum || ""),
        expected_lineage_head_edge_id: String(parent?.invocation_edge_id || ""),
        parent_ancestry: parentAncestry,
        continuity_contract_required: invocationKind === "resume" || ["native_recovery", "provider_switch", "fork"].includes(branchKind),
        status: "prepared",
        prepared_at: preparedAt,
    };
    edge.edge_checksum = edgeChecksum(edge);
    const file = getTaskAgentInvocationLineageFile(groupId, groupSessionId, taskAgentSessionId);
    appendEvent(file, edge, "prepared");
    recordInvocationSoakPhase(edge, "invocation_prepared", "prepared");
    return { ...edge, ledger_file: file };
}
function transitionEdge(edgeOrId, status, evidence = {}) {
    const current = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
    if (!current)
        throw new Error("task-agent invocation edge not found");
    if (exports.TERMINAL.has(String(current.status || "")) && current.status !== status)
        throw new Error("task-agent invocation edge is terminal");
    const parent = current.parent_invocation_edge_id ? findTaskAgentInvocationEdge(current.parent_invocation_edge_id) : null;
    if (current.parent_invocation_edge_id && (!parent || parent.invocation_edge_id === current.invocation_edge_id))
        throw new Error("task-agent invocation parent missing or cyclic");
    if (parent && (parent.group_id !== current.group_id || parent.group_session_id !== current.group_session_id || parent.task_id !== current.task_id || parent.target_project !== current.target_project))
        throw new Error("task-agent invocation parent identity mismatch");
    if (parent && String(parent.edge_checksum || "") !== String(current.expected_lineage_head_checksum || ""))
        throw new Error("task-agent invocation lineage head changed");
    const now = new Date().toISOString();
    const next = {
        ...current,
        ...evidence,
        status,
        ...(status === "dispatched" ? { dispatched_at: evidence.dispatched_at || now } : {}),
        ...(status === "completed" || status === "failed" ? { completed_at: evidence.completed_at || now } : {}),
    };
    delete next.ledger_file;
    delete next.event_sequence;
    delete next.event_checksum;
    delete next.ledger_valid;
    next.edge_checksum = edgeChecksum(next);
    appendEvent(current.ledger_file, next, status);
    return { ...next, ledger_file: current.ledger_file };
}
function bindTaskAgentInvocationContext(edgeOrId, evidence = {}) {
    const deliveryCapsule = evidence.typedMemoryDeliveryCapsule || evidence.typed_memory_delivery_capsule || null;
    const deliveryBudget = deliveryCapsule?.budget || {};
    const finalDispatchPayloadGate = evidence.finalDispatchPayloadGate
        || evidence.final_dispatch_payload_gate
        || evidence.workerContextPacket?.final_dispatch_payload_gate
        || evidence.worker_context_packet?.final_dispatch_payload_gate
        || null;
    const finalDispatchPayloadGateVerification = finalDispatchPayloadGate
        ? (0, final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate)(finalDispatchPayloadGate)
        : { valid: false, issues: ["final_dispatch_payload_gate_missing"] };
    const memoryBinding = evidence.groupSessionMemoryBinding || evidence.group_session_memory_binding || {};
    const compactTransactionReceipt = evidence.compactTransactionReceipt
        || evidence.compact_transaction_receipt
        || memoryBinding.compactTransactionReceipt
        || memoryBinding.compact_transaction_receipt
        || null;
    const next = transitionEdge(edgeOrId, "prepared", {
        worker_context_packet_id: String(evidence.workerContextPacketId || evidence.worker_context_packet_id || ""),
        memory_context_snapshot_id: String(evidence.memoryContextSnapshotId || evidence.memory_context_snapshot_id || ""),
        memory_context_snapshot_checksum: String(evidence.memoryContextSnapshotChecksum || evidence.memory_context_snapshot_checksum || ""),
        summary_capsule_checksum: String(evidence.summaryCapsuleChecksum || evidence.summary_capsule_checksum || ""),
        prompt_checksum: evidence.renderedPrompt || evidence.rendered_prompt ? sha256(String(evidence.renderedPrompt || evidence.rendered_prompt), 32) : String(evidence.promptChecksum || evidence.prompt_checksum || ""),
        compact_epoch: String(evidence.compactEpoch || evidence.compact_epoch || compactTransactionReceipt?.compact_epoch || memoryBinding.compactEpoch || deliveryCapsule?.compact_epoch || "precompact"),
        compact_transaction_receipt_id: String(compactTransactionReceipt?.receipt_id || memoryBinding.compactTransactionReceiptId || ""),
        compact_transaction_boundary_id: String(compactTransactionReceipt?.boundary_id || memoryBinding.compactTransactionBoundaryId || ""),
        compact_transaction_receipt_checksum: String(compactTransactionReceipt?.receipt_checksum || memoryBinding.compactTransactionReceiptChecksum || ""),
        compact_transaction_receipt_valid: memoryBinding.compactTransactionReceiptValid === true,
        compact_head_fence_required: memoryBinding.compactHeadFenceRequired === true,
        compact_head_id: String(memoryBinding.compactHeadId || ""),
        compact_head_generation: Number(memoryBinding.compactHeadGeneration || 0),
        compact_head_checksum: String(memoryBinding.compactHeadChecksum || ""),
        session_lifecycle_fence_required: memoryBinding.sessionLifecycleFenceRequired === true,
        session_lifecycle_head_id: String(memoryBinding.sessionLifecycleHeadId || ""),
        session_lifecycle_generation: Number(memoryBinding.sessionLifecycleGeneration || 0),
        session_lifecycle_status: String(memoryBinding.sessionLifecycleStatus || ""),
        session_lifecycle_head_checksum: String(memoryBinding.sessionLifecycleHeadChecksum || ""),
        typed_memory_delivery_capsule_checksum: String(deliveryCapsule?.capsule_checksum || evidence.typedMemoryDeliveryCapsuleChecksum || evidence.typed_memory_delivery_capsule_checksum || ""),
        dispatch_model_context_window: Number(deliveryBudget.model_context_window || deliveryCapsule?.model_context_window || evidence.modelContextWindow || evidence.model_context_window || 0),
        dispatch_configured_memory_tokens: Number(deliveryBudget.configured_max_tokens || deliveryCapsule?.configured_max_tokens || evidence.configuredMaxTokens || evidence.configured_max_tokens || 0),
        dispatch_effective_memory_tokens: Number(deliveryBudget.effective_max_tokens || deliveryCapsule?.effective_max_tokens || evidence.effectiveMaxTokens || evidence.effective_max_tokens || 0),
        dispatch_memory_budget_formula: String(deliveryBudget.token_budget_formula || ""),
        final_dispatch_payload_gate_required: !!finalDispatchPayloadGate,
        final_dispatch_payload_gate: finalDispatchPayloadGate,
        final_dispatch_payload_gate_valid: finalDispatchPayloadGateVerification.valid === true,
        final_dispatch_payload_gate_issues: finalDispatchPayloadGateVerification.issues,
        final_dispatch_payload_gate_id: String(finalDispatchPayloadGate?.gate_id || ""),
        final_dispatch_payload_gate_checksum: String(finalDispatchPayloadGate?.gate_checksum || ""),
        final_dispatch_payload_gate_status: String(finalDispatchPayloadGate?.status || ""),
        final_dispatch_payload_tokens: Number(finalDispatchPayloadGate?.estimated_total_input_tokens || 0),
        final_dispatch_payload_threshold: Number(finalDispatchPayloadGate?.auto_compact_threshold || 0),
        context_bound_at: new Date().toISOString(),
    });
    recordInvocationSoakPhase(next, "context_bound", "bound");
    return next;
}
function dispatchTaskAgentInvocationEdge(edgeOrId, evidence = {}) {
    let edge = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
    if (!edge)
        throw new Error("task-agent invocation edge not found");
    for (const field of ["worker_context_packet_id", "memory_context_snapshot_id", "prompt_checksum"]) {
        if (!String(edge[field] || evidence[field] || ""))
            throw new Error(`task-agent invocation ${field} missing`);
    }
    const compactHeadValidation = edge.compact_head_fence_required === true
        ? (0, group_compact_head_1.validateGroupCompactHeadBinding)({
            groupId: edge.group_id,
            groupSessionId: edge.group_session_id,
            compactEpoch: edge.compact_epoch,
            compactTransactionReceiptChecksum: edge.compact_transaction_receipt_checksum,
            compactTransactionBoundaryId: edge.compact_transaction_boundary_id,
            compactHeadGeneration: edge.compact_head_generation,
            compactHeadId: edge.compact_head_id,
            compactHeadChecksum: edge.compact_head_checksum,
        })
        : { valid: true, status: "exempt", issues: [], expected: null };
    const sessionLifecycleFenceRequired = edge.session_lifecycle_fence_required === true || String(edge.group_session_id || "").startsWith("gcs_");
    const sessionLifecycleValidation = sessionLifecycleFenceRequired
        ? (0, group_session_lifecycle_head_1.validateGroupSessionLifecycleBinding)({
            groupId: edge.group_id,
            groupSessionId: edge.group_session_id,
            lifecycleStatus: edge.session_lifecycle_status,
            lifecycleGeneration: edge.session_lifecycle_generation,
            lifecycleHeadId: edge.session_lifecycle_head_id,
            lifecycleHeadChecksum: edge.session_lifecycle_head_checksum,
        })
        : { valid: true, status: "exempt", issues: [], expected: null };
    const finalDispatchPayloadGateRequired = edge.final_dispatch_payload_gate_required === true;
    const finalDispatchPayloadGateValidation = finalDispatchPayloadGateRequired
        ? (0, final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate)(edge.final_dispatch_payload_gate, {
            groupId: edge.group_id,
            groupSessionId: edge.group_session_id,
            taskId: edge.task_id,
            taskAgentSessionId: edge.task_agent_session_id,
            workerContextPacketId: edge.worker_context_packet_id,
        })
        : { valid: true, issues: [] };
    edge = transitionEdge(edge, String(edge.status || "prepared"), {
        compact_head_dispatch_fence_valid: compactHeadValidation.valid === true,
        compact_head_dispatch_fence_status: compactHeadValidation.status,
        compact_head_dispatch_fence_issues: compactHeadValidation.issues,
        compact_head_dispatch_expected: compactHeadValidation.expected,
        compact_head_dispatch_checked_at: new Date().toISOString(),
        session_lifecycle_dispatch_fence_valid: sessionLifecycleValidation.valid === true,
        session_lifecycle_fence_required: sessionLifecycleFenceRequired,
        session_lifecycle_dispatch_fence_status: sessionLifecycleValidation.status,
        session_lifecycle_dispatch_fence_issues: sessionLifecycleValidation.issues,
        session_lifecycle_dispatch_expected: sessionLifecycleValidation.expected,
        session_lifecycle_dispatch_checked_at: new Date().toISOString(),
        final_dispatch_payload_gate_dispatch_valid: finalDispatchPayloadGateValidation.valid === true,
        final_dispatch_payload_gate_dispatch_issues: finalDispatchPayloadGateValidation.issues,
        final_dispatch_payload_gate_dispatch_checked_at: new Date().toISOString(),
    });
    recordInvocationSoakPhase(edge, "compact_head_dispatch_fence", compactHeadValidation.valid ? "current" : "stale", compactHeadValidation);
    recordInvocationSoakPhase(edge, "session_lifecycle_dispatch_fence", sessionLifecycleValidation.valid ? "current" : "stale", sessionLifecycleValidation);
    recordInvocationSoakPhase(edge, "final_dispatch_payload_gate", finalDispatchPayloadGateValidation.valid && edge.final_dispatch_payload_gate?.provider_call_allowed === true ? "ready" : "blocked", {
        gate_id: edge.final_dispatch_payload_gate_id || "",
        status: edge.final_dispatch_payload_gate_status || "",
        estimated_total_input_tokens: edge.final_dispatch_payload_tokens || 0,
        auto_compact_threshold: edge.final_dispatch_payload_threshold || 0,
        issues: finalDispatchPayloadGateValidation.issues,
    });
    if (finalDispatchPayloadGateRequired && (!finalDispatchPayloadGateValidation.valid || edge.final_dispatch_payload_gate?.provider_call_allowed !== true || edge.final_dispatch_payload_gate?.status !== "ready")) {
        const error = new Error(`task-agent final dispatch payload blocked: ${finalDispatchPayloadGateValidation.issues.join(",") || edge.final_dispatch_payload_gate?.status || "unknown"}`);
        error.code = "TASK_AGENT_FINAL_DISPATCH_PAYLOAD_BLOCKED";
        error.finalDispatchPayloadGate = edge.final_dispatch_payload_gate;
        throw error;
    }
    if (!compactHeadValidation.valid) {
        const error = new Error(`task-agent compact head stale: ${compactHeadValidation.issues.join(",")}`);
        error.code = "TASK_AGENT_COMPACT_HEAD_STALE";
        error.compactHeadValidation = compactHeadValidation;
        throw error;
    }
    if (!sessionLifecycleValidation.valid) {
        const error = new Error(`task-agent group session lifecycle stale: ${sessionLifecycleValidation.issues.join(",")}`);
        error.code = "TASK_AGENT_GROUP_SESSION_STALE";
        error.sessionLifecycleValidation = sessionLifecycleValidation;
        throw error;
    }
    if (edge.status === "dispatched" && (!evidence.runnerRequestId || edge.runner_request_id === String(evidence.runnerRequestId)))
        return edge;
    const next = transitionEdge(edge, "dispatched", {
        runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
        transport: String(evidence.transport || ""),
        dispatch_ticket_id: String(evidence.dispatchTicketId || evidence.dispatch_ticket_id || edge.dispatch_ticket_id || ""),
        dispatch_ticket_checksum: String(evidence.dispatchTicketChecksum || evidence.dispatch_ticket_checksum || edge.dispatch_ticket_checksum || ""),
        typed_memory_dispatch_wal_file: String(evidence.typedMemoryDispatchWalFile || evidence.typed_memory_dispatch_wal_file || edge.typed_memory_dispatch_wal_file || ""),
        typed_memory_dispatch_wal_record_checksum: String(evidence.typedMemoryDispatchWalRecordChecksum || evidence.typed_memory_dispatch_wal_record_checksum || edge.typed_memory_dispatch_wal_record_checksum || ""),
        typed_memory_dispatch_wal_state: String(evidence.typedMemoryDispatchWalState || evidence.typed_memory_dispatch_wal_state || edge.typed_memory_dispatch_wal_state || ""),
        platform_dispatch_id: String(evidence.platformDispatchId || evidence.platform_dispatch_id || edge.platform_dispatch_id || ""),
        dispatched_at: String(evidence.dispatchedAt || evidence.dispatched_at || new Date().toISOString()),
    });
    recordInvocationSoakPhase(next, "dispatch_started", "started");
    return next;
}
function bindTaskAgentInvocationRunnerRequest(edgeOrId, runnerRequestId, evidence = {}) {
    const edge = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
    if (!edge)
        throw new Error("task-agent invocation edge not found");
    const nextRunnerRequestId = String(runnerRequestId || "");
    const walRecordChecksum = String(evidence.typedMemoryDispatchWalRecordChecksum || evidence.typed_memory_dispatch_wal_record_checksum || edge.typed_memory_dispatch_wal_record_checksum || "");
    if (edge.runner_request_id === nextRunnerRequestId && edge.typed_memory_dispatch_wal_record_checksum === walRecordChecksum)
        return edge;
    return transitionEdge(edge, "dispatched", {
        runner_request_id: nextRunnerRequestId,
        typed_memory_dispatch_wal_record_checksum: walRecordChecksum,
        typed_memory_dispatch_wal_state: String(evidence.typedMemoryDispatchWalState || evidence.typed_memory_dispatch_wal_state || edge.typed_memory_dispatch_wal_state || ""),
    });
}
function nativeContinuationReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    return sha256(payload);
}
function verifyTaskAgentNativeContinuationReceipt(receipt, edge = null) {
    const issues = [];
    if (receipt?.schema !== exports.TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA || Number(receipt?.version || 0) !== 1)
        issues.push("native_continuation_receipt_schema_invalid");
    if (String(receipt?.receipt_checksum || "") !== nativeContinuationReceiptChecksum(receipt))
        issues.push("native_continuation_receipt_checksum_invalid");
    if (receipt?.continuation_capability_profile
        && String(receipt?.continuation_capability_profile_checksum || "") !== sha256(receipt.continuation_capability_profile)) {
        issues.push("native_continuation_capability_profile_checksum_invalid");
    }
    if (edge) {
        if (String(receipt?.invocation_edge_id || "") !== String(edge.invocation_edge_id || ""))
            issues.push("native_continuation_edge_mismatch");
        if (String(receipt?.group_id || "") !== String(edge.group_id || ""))
            issues.push("native_continuation_group_mismatch");
        if (String(receipt?.group_session_id || "") !== String(edge.group_session_id || ""))
            issues.push("native_continuation_group_session_mismatch");
        if (String(receipt?.task_agent_session_id || "") !== String(edge.task_agent_session_id || ""))
            issues.push("native_continuation_task_session_mismatch");
        if (String(receipt?.runner_request_id || "") !== String(edge.runner_request_id || ""))
            issues.push("native_continuation_runner_request_mismatch");
    }
    if (receipt?.continuation_required === true && receipt?.status === "acknowledged") {
        if (receipt?.runner_evidence_valid !== true)
            issues.push("native_continuation_runner_evidence_invalid");
        if (receipt?.native_continuation_acknowledged !== true)
            issues.push("native_continuation_ack_missing");
        if (!receipt?.requested_native_session_id || receipt.requested_native_session_id !== receipt.effective_native_session_id)
            issues.push("native_continuation_identity_invalid");
        if (["request_fallback", "missing"].includes(String(receipt?.session_id_evidence_source || "")))
            issues.push("native_continuation_source_untrusted");
        if (receipt?.source_allowed_by_profile !== true)
            issues.push("native_continuation_source_policy_rejected");
        if (receipt?.resume_ack_policy === "provider_output" && receipt?.provider_output_contract_status !== "recognized")
            issues.push("native_continuation_provider_output_contract_unverified");
        if (!String(receipt?.continuation_capability_profile_checksum || ""))
            issues.push("native_continuation_capability_profile_missing");
    }
    return { valid: issues.length === 0, issues };
}
function buildTaskAgentNativeContinuationReceipt(edge, evidence, success) {
    const requestedNativeSessionId = String(evidence.requestedNativeSessionId || evidence.requested_native_session_id || edge.native_session_id || "");
    const rawEvidence = evidence.nativeContinuationEvidence || evidence.native_continuation_evidence || null;
    const fallbackEvidence = (0, native_continuation_1.buildNativeSessionContinuationEvidence)({
        provider: evidence.provider || evidence.runtime || edge.transport || "",
        runnerRequestId: evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || "",
        requestedNativeSessionId,
        returnedNativeSessionId: evidence.returnedNativeSessionId || evidence.returned_native_session_id || "",
        nativeResumeRequested: evidence.nativeResumeRequested === true || evidence.native_resume_requested === true,
        runnerSuccess: success,
    });
    const runnerEvidence = rawEvidence || fallbackEvidence;
    const runnerValidation = (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(runnerEvidence, {
        provider: evidence.provider || evidence.runtime || edge.transport || "",
        runnerRequestId: evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || "",
        requestedNativeSessionId,
    });
    const continuationRequired = edge.invocation_kind === "resume" && !!requestedNativeSessionId && !["provider_switch", "fork"].includes(String(edge.branch_kind || ""));
    const effectiveNativeSessionId = String(runnerEvidence?.effectiveNativeSessionId || evidence.effectiveNativeSessionId || evidence.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || requestedNativeSessionId || "");
    const acknowledged = !!rawEvidence
        && runnerValidation.valid
        && runnerEvidence?.nativeContinuationAcknowledged === true
        && effectiveNativeSessionId === requestedNativeSessionId
        && !["request_fallback", "missing"].includes(String(runnerEvidence?.evidenceSource || ""));
    const status = !success ? "failed" : continuationRequired ? acknowledged ? "acknowledged" : "unverified" : "not_required";
    const receipt = {
        schema: exports.TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA,
        version: 1,
        receipt_id: `tncr_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
        invocation_edge_id: String(edge.invocation_edge_id || ""),
        invocation_edge_preterminal_checksum: String(edge.edge_checksum || ""),
        parent_invocation_edge_id: String(edge.parent_invocation_edge_id || ""),
        branch_id: String(edge.branch_id || ""),
        branch_kind: String(edge.branch_kind || ""),
        group_id: String(edge.group_id || ""),
        group_session_id: String(edge.group_session_id || ""),
        task_id: String(edge.task_id || ""),
        task_agent_session_id: String(edge.task_agent_session_id || ""),
        provider: String(runnerEvidence?.provider || edge.transport || ""),
        runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
        requested_native_session_id: requestedNativeSessionId,
        returned_native_session_id: String(runnerEvidence?.returnedNativeSessionId || ""),
        effective_native_session_id: effectiveNativeSessionId,
        native_resume_requested: runnerEvidence?.nativeResumeRequested === true,
        continuation_required: continuationRequired,
        session_id_evidence_source: String(runnerEvidence?.evidenceSource || "missing"),
        continuation_capability_profile: runnerEvidence?.continuationCapabilityProfile || null,
        continuation_capability_profile_checksum: runnerEvidence?.continuationCapabilityProfile
            ? sha256(runnerEvidence.continuationCapabilityProfile)
            : "",
        resume_ack_policy: String(runnerEvidence?.resumeAckPolicy || "unsupported"),
        source_allowed_by_profile: runnerEvidence?.sourceAllowedByProfile === true,
        compatibility_status: String(runnerEvidence?.compatibilityStatus || "unknown"),
        provider_output_contract_status: String(runnerEvidence?.providerOutputContractStatus || ""),
        provider_output_contract_recognized: runnerEvidence?.providerOutputContractRecognized === true,
        provider_output_format_fingerprint: String(runnerEvidence?.providerOutputFormatFingerprint || ""),
        provider_output_contract_evidence: runnerEvidence?.providerOutputContractEvidence || null,
        provider_contract_id: String(runnerEvidence?.providerContractId || runnerEvidence?.providerOutputContractEvidence?.providerContractId || ""),
        expected_provider_contract_id: String(runnerEvidence?.expectedProviderContractId || ""),
        provider_contract_transition: runnerEvidence?.providerContractTransition === true,
        provider_contract_continuity_verified: runnerEvidence?.providerContractContinuityVerified === true,
        provider_runtime_version: String(runnerEvidence?.providerRuntimeVersion || runnerEvidence?.providerRuntimeVersionSnapshot?.semanticVersion || runnerEvidence?.providerRuntimeVersionSnapshot?.versionText || ""),
        provider_runtime_identity_checksum: String(runnerEvidence?.providerRuntimeIdentityChecksum || runnerEvidence?.providerRuntimeVersionSnapshot?.executableIdentityChecksum || ""),
        runner_success: runnerEvidence?.runnerSuccess === true,
        provider_return_matched_request: runnerEvidence?.providerReturnMatchedRequest === true,
        native_continuation_acknowledged: acknowledged,
        runner_evidence_checksum: String(runnerEvidence?.evidenceChecksum || ""),
        runner_evidence_valid: runnerValidation.valid,
        runner_evidence_issues: runnerValidation.issues,
        status,
        acknowledged_at: new Date().toISOString(),
    };
    receipt.receipt_checksum = nativeContinuationReceiptChecksum(receipt);
    return receipt;
}
function contextRebudgetProofChecksum(proof) {
    const payload = { ...(proof || {}) };
    delete payload.proof_checksum;
    delete payload.checksum_valid;
    return sha256(payload);
}
function verifyTaskAgentContextRebudgetProof(proof, edge = null) {
    const issues = [];
    if (proof?.schema !== exports.TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA || Number(proof?.version || 0) !== 1)
        issues.push("context_rebudget_proof_schema_invalid");
    if (String(proof?.proof_checksum || "") !== contextRebudgetProofChecksum(proof))
        issues.push("context_rebudget_proof_checksum_invalid");
    if (edge) {
        if (String(proof?.invocation_edge_id || "") !== String(edge.invocation_edge_id || ""))
            issues.push("context_rebudget_edge_mismatch");
        if (String(proof?.group_id || "") !== String(edge.group_id || ""))
            issues.push("context_rebudget_group_mismatch");
        if (String(proof?.group_session_id || "") !== String(edge.group_session_id || ""))
            issues.push("context_rebudget_group_session_mismatch");
        if (String(proof?.task_agent_session_id || "") !== String(edge.task_agent_session_id || ""))
            issues.push("context_rebudget_task_session_mismatch");
        if (Number(proof?.dispatch_model_context_window || 0) !== Number(edge.dispatch_model_context_window || 0))
            issues.push("context_rebudget_dispatch_window_mismatch");
    }
    if (proof?.native_capability_receipt_present === true && proof?.native_capability_receipt_valid !== true)
        issues.push("context_rebudget_native_receipt_invalid");
    if (proof?.capacity_downgrade_detected === true && proof?.next_dispatch_rebuild_required !== true)
        issues.push("context_rebudget_downgrade_gate_missing");
    return { valid: issues.length === 0, issues };
}
function buildTaskAgentContextRebudgetProof(edge, evidence) {
    const nativeReceipt = evidence.nativeModelCapabilityReceipt || evidence.native_model_capability_receipt || null;
    const continuationEvidence = evidence.nativeContinuationEvidence || evidence.native_continuation_evidence || null;
    const effectiveNativeSessionId = String(continuationEvidence?.effectiveNativeSessionId || evidence.effectiveNativeSessionId || evidence.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || edge.native_session_id || "");
    const receiptValidation = nativeReceipt
        ? (0, runtime_1.verifyNativeModelCapabilityReceipt)(nativeReceipt, {
            provider: evidence.provider || evidence.runtime || edge.transport || "",
            runnerRequestId: evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || "",
            groupId: edge.group_id,
            taskId: edge.task_id,
            executionId: edge.execution_id,
            taskAgentSessionId: edge.task_agent_session_id,
            nativeSessionId: effectiveNativeSessionId,
        })
        : { valid: false, gaps: ["receipt_missing"] };
    const dispatchWindow = Number(edge.dispatch_model_context_window || 0);
    const actualWindow = receiptValidation.valid ? Number(nativeReceipt?.contextWindow || 0) : 0;
    const configuredTokens = Number(edge.dispatch_configured_memory_tokens || 0);
    const dispatchEffectiveTokens = Number(edge.dispatch_effective_memory_tokens || 0);
    const expectedActualEffectiveTokens = actualWindow > 0 && configuredTokens > 0
        ? Math.min(configuredTokens, Math.max(1000, Math.floor(actualWindow * 0.02)))
        : 0;
    const downgradeDetected = receiptValidation.valid && dispatchWindow > 0 && actualWindow > 0 && actualWindow < dispatchWindow;
    const record = evidence.nativeModelCapabilityRecord || evidence.native_model_capability_record || null;
    const proof = {
        schema: exports.TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA,
        version: 1,
        proof_id: `tcrp_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
        invocation_edge_id: String(edge.invocation_edge_id || ""),
        invocation_edge_preterminal_checksum: String(edge.edge_checksum || ""),
        group_id: String(edge.group_id || ""),
        group_session_id: String(edge.group_session_id || ""),
        task_id: String(edge.task_id || ""),
        task_agent_session_id: String(edge.task_agent_session_id || ""),
        provider: String(nativeReceipt?.provider || edge.transport || ""),
        model: String(nativeReceipt?.model || record?.entry?.model || ""),
        runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
        native_session_id: effectiveNativeSessionId,
        typed_memory_delivery_capsule_checksum: String(edge.typed_memory_delivery_capsule_checksum || ""),
        dispatch_model_context_window: dispatchWindow,
        dispatch_configured_memory_tokens: configuredTokens,
        dispatch_effective_memory_tokens: dispatchEffectiveTokens,
        actual_model_context_window: actualWindow,
        actual_effective_memory_tokens: expectedActualEffectiveTokens,
        native_capability_receipt_present: !!nativeReceipt,
        native_capability_receipt_checksum: String(nativeReceipt?.checksum || ""),
        native_capability_receipt_valid: receiptValidation.valid,
        native_capability_receipt_issues: receiptValidation.gaps || [],
        capacity_downgrade_detected: downgradeDetected,
        budget_drift_tokens: downgradeDetected ? Math.max(0, dispatchEffectiveTokens - expectedActualEffectiveTokens) : 0,
        current_prompt_rebudgeted: false,
        next_dispatch_rebuild_required: downgradeDetected,
        next_dispatch_action: downgradeDetected ? "rebuild_and_recompact_before_next_dispatch" : "none",
        capacity_downgrade_gate: record?.downgrade || null,
        status: !nativeReceipt ? "capacity_unavailable" : !receiptValidation.valid ? "unverified" : downgradeDetected ? "drift_detected" : "within_verified_capacity",
        compared_at: new Date().toISOString(),
    };
    proof.proof_checksum = contextRebudgetProofChecksum(proof);
    return proof;
}
function adoptionReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receipt_checksum;
    delete payload.checksum_valid;
    return sha256(payload);
}
function verifyTaskAgentInvocationAdoptionReceipt(receipt, edge = null) {
    const issues = [];
    if (receipt?.schema !== exports.TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA || Number(receipt?.version || 0) !== 1)
        issues.push("adoption_receipt_schema_invalid");
    if (String(receipt?.receipt_checksum || "") !== adoptionReceiptChecksum(receipt))
        issues.push("adoption_receipt_checksum_invalid");
    if (edge) {
        if (String(receipt?.invocation_edge_id || "") !== String(edge.invocation_edge_id || ""))
            issues.push("adoption_receipt_edge_mismatch");
        if (String(receipt?.group_id || "") !== String(edge.group_id || ""))
            issues.push("adoption_receipt_group_mismatch");
        if (String(receipt?.group_session_id || "") !== String(edge.group_session_id || ""))
            issues.push("adoption_receipt_group_session_mismatch");
        if (String(receipt?.task_agent_session_id || "") !== String(edge.task_agent_session_id || ""))
            issues.push("adoption_receipt_task_session_mismatch");
        if (String(receipt?.parent_invocation_edge_id || "") !== String(edge.parent_invocation_edge_id || ""))
            issues.push("adoption_receipt_parent_mismatch");
        if (String(receipt?.native_continuation_receipt_checksum || "") !== String(edge.native_continuation_receipt_checksum || ""))
            issues.push("adoption_receipt_native_continuation_mismatch");
    }
    return { valid: issues.length === 0, issues };
}
function buildTaskAgentInvocationAdoptionReceipt(edge, evidence, success, nativeContinuationReceipt) {
    const requestedNativeSessionId = String(edge.native_session_id || "");
    const adoptedNativeSessionId = String(nativeContinuationReceipt?.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || requestedNativeSessionId || "");
    const required = edge.continuity_contract_required === true;
    const mode = ["provider_switch", "fork"].includes(String(edge.branch_kind || ""))
        ? "provider_switch_fork"
        : edge.invocation_kind === "resume" && requestedNativeSessionId
            ? "native_resume"
            : edge.invocation_kind === "resume" ? "scratchpad_resume" : "spawn";
    const contextBound = !!edge.worker_context_packet_id && !!edge.memory_context_snapshot_id && !!edge.prompt_checksum && !!(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id);
    const nativeReceiptValidation = verifyTaskAgentNativeContinuationReceipt(nativeContinuationReceipt, edge);
    const nativeIdentityValid = mode !== "native_resume" || (!!requestedNativeSessionId
        && requestedNativeSessionId === adoptedNativeSessionId
        && nativeContinuationReceipt?.status === "acknowledged"
        && nativeReceiptValidation.valid);
    const runnerContinuationValid = nativeReceiptValidation.valid
        && (mode === "native_resume" ? nativeContinuationReceipt?.status === "acknowledged" : nativeContinuationReceipt?.status === "not_required");
    const adoptionStatus = !success ? "failed"
        : required ? contextBound && nativeIdentityValid && runnerContinuationValid ? "adopted" : "unverified"
            : "observed";
    const payload = {
        schema: exports.TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA,
        version: 1,
        receipt_id: `tiar_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
        invocation_edge_id: String(edge.invocation_edge_id || ""),
        invocation_edge_preterminal_checksum: String(edge.edge_checksum || ""),
        parent_invocation_edge_id: String(edge.parent_invocation_edge_id || ""),
        parent_invocation_edge_checksum: String(edge.expected_lineage_head_checksum || ""),
        root_invocation_edge_id: String(edge.root_invocation_edge_id || ""),
        branch_id: String(edge.branch_id || ""),
        branch_kind: String(edge.branch_kind || ""),
        invocation_kind: String(edge.invocation_kind || ""),
        group_id: String(edge.group_id || ""),
        group_session_id: String(edge.group_session_id || ""),
        task_id: String(edge.task_id || ""),
        target_project: String(edge.target_project || ""),
        task_agent_session_id: String(edge.task_agent_session_id || ""),
        transport: String(edge.transport || evidence.transport || ""),
        adoption_mode: mode,
        requested_native_session_id: requestedNativeSessionId,
        parent_native_session_id: String(edge.parent_native_session_id || ""),
        adopted_native_session_id: adoptedNativeSessionId,
        native_identity_valid: nativeIdentityValid,
        native_continuation_receipt_checksum: String(nativeContinuationReceipt?.receipt_checksum || ""),
        native_continuation_status: String(nativeContinuationReceipt?.status || ""),
        native_continuation_receipt_valid: nativeReceiptValidation.valid,
        worker_context_packet_id: String(edge.worker_context_packet_id || ""),
        memory_context_snapshot_id: String(edge.memory_context_snapshot_id || ""),
        memory_context_snapshot_checksum: String(edge.memory_context_snapshot_checksum || ""),
        prompt_checksum: String(edge.prompt_checksum || ""),
        compact_epoch: String(edge.compact_epoch || ""),
        runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || edge.runner_request_id || ""),
        continuity_contract_required: required,
        context_bound: contextBound,
        status: adoptionStatus,
        adopted_at: new Date().toISOString(),
    };
    payload.receipt_checksum = adoptionReceiptChecksum(payload);
    return payload;
}
function completeTaskAgentInvocationEdge(edgeOrId, evidence = {}) {
    const current = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
    if (!current)
        throw new Error("task-agent invocation edge not found");
    const status = evidence.success === false || evidence.status === "failed" ? "failed" : "completed";
    const nativeContinuationReceipt = buildTaskAgentNativeContinuationReceipt(current, evidence, status === "completed");
    const contextRebudgetProof = buildTaskAgentContextRebudgetProof(current, evidence);
    const adoptionReceipt = buildTaskAgentInvocationAdoptionReceipt(current, evidence, status === "completed", nativeContinuationReceipt);
    const next = transitionEdge(current, status, {
        native_session_id: String(nativeContinuationReceipt.effective_native_session_id || evidence.nativeSessionId || evidence.native_session_id || current.native_session_id || ""),
        runner_request_id: String(evidence.runnerRequestId || evidence.runner_request_id || current.runner_request_id || ""),
        result_checksum: evidence.output !== undefined ? sha256(String(evidence.output || ""), 32) : String(evidence.resultChecksum || evidence.result_checksum || ""),
        error: String(evidence.error || "").slice(0, 1200),
        terminal_reason: String(evidence.reason || evidence.terminal_reason || ""),
        recovery_outcome: String(evidence.recoveryOutcome || evidence.recovery_outcome || ""),
        recovery_source: String(evidence.recoverySource || evidence.recovery_source || ""),
        recovered_at: String(evidence.recoveredAt || evidence.recovered_at || ""),
        recovery_lease_id: String(evidence.recoveryLeaseId || evidence.recovery_lease_id || current.recovery_lease_id || ""),
        recovery_fencing_token: Number(evidence.recoveryFencingToken || evidence.recovery_fencing_token || current.recovery_fencing_token || 0),
        adoption_receipt: adoptionReceipt,
        adoption_receipt_checksum: adoptionReceipt.receipt_checksum,
        adoption_status: adoptionReceipt.status,
        native_continuation_receipt: nativeContinuationReceipt,
        native_continuation_receipt_checksum: nativeContinuationReceipt.receipt_checksum,
        native_continuation_status: nativeContinuationReceipt.status,
        context_rebudget_proof: contextRebudgetProof,
        context_rebudget_proof_checksum: contextRebudgetProof.proof_checksum,
        context_rebudget_status: contextRebudgetProof.status,
    });
    recordInvocationSoakPhase(next, "continuation_evidence_captured", nativeContinuationReceipt.status, nativeContinuationReceipt);
    recordInvocationSoakPhase(next, "invocation_terminal", status, nativeContinuationReceipt);
    return next;
}
function verifyMemoryDeliveryReceiptChecksum(receipt) {
    if (!receipt?.checksum)
        return false;
    const payload = { ...receipt };
    const expected = String(payload.checksum || "");
    delete payload.checksum;
    delete payload.receiptFile;
    return rawJsonSha256(payload) === expected;
}
function reinjectionProofChecksum(proof) {
    const payload = { ...(proof || {}) };
    delete payload.proof_checksum;
    delete payload.checksum_valid;
    return sha256(payload);
}
function verifyTaskAgentInvocationReinjectionProof(proof, edge = null) {
    const issues = [];
    if (proof?.schema !== exports.TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA || Number(proof?.version || 0) !== 1)
        issues.push("reinjection_proof_schema_invalid");
    if (String(proof?.proof_checksum || "") !== reinjectionProofChecksum(proof))
        issues.push("reinjection_proof_checksum_invalid");
    if (edge) {
        if (String(proof?.invocation_edge_id || "") !== String(edge.invocation_edge_id || ""))
            issues.push("reinjection_proof_edge_mismatch");
        if (String(proof?.group_id || "") !== String(edge.group_id || ""))
            issues.push("reinjection_proof_group_mismatch");
        if (String(proof?.group_session_id || "") !== String(edge.group_session_id || ""))
            issues.push("reinjection_proof_group_session_mismatch");
        if (String(proof?.task_agent_session_id || "") !== String(edge.task_agent_session_id || ""))
            issues.push("reinjection_proof_task_session_mismatch");
        if (String(proof?.memory_context_snapshot_id || "") !== String(edge.memory_context_snapshot_id || ""))
            issues.push("reinjection_proof_snapshot_mismatch");
        if (String(edge.compact_epoch || "") !== "precompact") {
            if (proof?.compact_transaction_receipt_valid !== true)
                issues.push("reinjection_proof_compact_transaction_invalid");
            if (!String(proof?.compact_transaction_receipt_checksum || ""))
                issues.push("reinjection_proof_compact_transaction_missing");
            if (String(proof?.compact_transaction_receipt_checksum || "") !== String(edge.compact_transaction_receipt_checksum || ""))
                issues.push("reinjection_proof_compact_transaction_mismatch");
            if (String(proof?.compact_transaction_boundary_id || "") !== String(edge.compact_transaction_boundary_id || ""))
                issues.push("reinjection_proof_compact_boundary_mismatch");
        }
        if (edge.compact_head_fence_required === true) {
            if (proof?.compact_head_fence_valid !== true)
                issues.push("reinjection_proof_compact_head_stale");
            if (Number(proof?.compact_head_generation || 0) !== Number(edge.compact_head_generation || 0))
                issues.push("reinjection_proof_compact_head_generation_mismatch");
            if (String(proof?.compact_head_checksum || "") !== String(edge.compact_head_checksum || ""))
                issues.push("reinjection_proof_compact_head_checksum_mismatch");
        }
    }
    return { valid: issues.length === 0, issues };
}
function bindTaskAgentInvocationMemoryDelivery(edgeOrId, evidence = {}) {
    const edge = typeof edgeOrId === "string" ? findTaskAgentInvocationEdge(edgeOrId) : findTaskAgentInvocationEdge(String(edgeOrId?.invocation_edge_id || ""));
    if (!edge)
        throw new Error("task-agent invocation edge not found");
    const receipt = evidence.deliveryReceipt || evidence.delivery_receipt || null;
    const binding = receipt?.groupSessionMemoryBinding || receipt?.group_session_memory_binding || {};
    const receiptChecksumValid = receipt ? verifyMemoryDeliveryReceiptChecksum(receipt) : false;
    const receiptIdentityValid = !!receipt
        && String(receipt.groupId || receipt.group_id || "") === String(edge.group_id || "")
        && String(receipt.taskId || receipt.task_id || "") === String(edge.task_id || "")
        && String(receipt.taskAgentSessionId || receipt.task_agent_session_id || "") === String(edge.task_agent_session_id || "")
        && String(receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "") === String(edge.memory_context_snapshot_id || "")
        && (!receipt.workerContextPacketId || String(receipt.workerContextPacketId || "") === String(edge.worker_context_packet_id || ""))
        && (!receipt.runnerRequestId || String(receipt.runnerRequestId || "") === String(edge.runner_request_id || ""))
        && (!binding.groupSessionId || String(binding.groupSessionId || binding.group_session_id || "") === String(edge.group_session_id || ""));
    const receiptDelivered = receipt?.delivered === true && ["exact", "contains_snapshot_prompt"].includes(String(receipt.promptBindingMode || receipt.prompt_binding_mode || ""));
    const compactTransactionRequired = String(edge.compact_epoch || "") !== "precompact";
    const compactTransactionReceiptChecksum = String(receipt?.compactTransactionReceiptChecksum || receipt?.compact_transaction_receipt_checksum || binding.compactTransactionReceiptChecksum || binding.compact_transaction_receipt_checksum || "");
    const compactTransactionBoundaryId = String(receipt?.compactTransactionBoundaryId || receipt?.compact_transaction_boundary_id || binding.compactTransactionBoundaryId || binding.compact_transaction_boundary_id || "");
    const compactTransactionReceiptValid = !compactTransactionRequired || (receipt?.compactTransactionReceiptValid === true
        && binding.compactTransactionReceiptValid === true
        && !!compactTransactionReceiptChecksum
        && !!compactTransactionBoundaryId
        && String(receipt?.compactEpoch || receipt?.compact_epoch || binding.compactEpoch || binding.compact_epoch || "") === String(edge.compact_epoch || "")
        && compactTransactionReceiptChecksum === String(edge.compact_transaction_receipt_checksum || "")
        && compactTransactionBoundaryId === String(edge.compact_transaction_boundary_id || ""));
    const compactHeadFenceRequired = edge.compact_head_fence_required === true;
    const compactHeadFenceValid = !compactHeadFenceRequired || (edge.compact_head_dispatch_fence_valid === true
        && receipt?.compactHeadFenceValid === true
        && Number(receipt?.compactHeadGeneration || 0) === Number(edge.compact_head_generation || 0)
        && String(receipt?.compactHeadChecksum || "") === String(edge.compact_head_checksum || ""));
    const sessionLifecycleFenceRequired = edge.session_lifecycle_fence_required === true || String(edge.group_session_id || "").startsWith("gcs_");
    const sessionLifecycleFenceValid = !sessionLifecycleFenceRequired || (edge.session_lifecycle_dispatch_fence_valid === true
        && receipt?.sessionLifecycleFenceValid === true
        && Number(receipt?.sessionLifecycleGeneration || 0) === Number(edge.session_lifecycle_generation || 0)
        && String(receipt?.sessionLifecycleHeadChecksum || "") === String(edge.session_lifecycle_head_checksum || ""));
    const runnerPairValid = evidence.recoveryRunnerPairValid === true || evidence.recovery_runner_pair_valid === true;
    const runnerPromptChecksum = String(evidence.runnerPromptChecksum || evidence.runner_prompt_checksum || "");
    const reconstructedIdentityValid = runnerPairValid
        && !!edge.runner_request_id
        && (!runnerPromptChecksum || runnerPromptChecksum === String(edge.prompt_checksum || ""));
    const proven = receipt
        ? receiptChecksumValid && receiptIdentityValid && receiptDelivered && binding.deliveryReady !== false && compactTransactionReceiptValid && compactHeadFenceValid && sessionLifecycleFenceValid
        : reconstructedIdentityValid;
    const source = receipt ? "memory_context_delivery_receipt" : runnerPairValid ? "direct_runner_pair_reconstruction" : "missing";
    const proof = {
        schema: exports.TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA,
        version: 1,
        proof_id: `tirp_${sha256(`${edge.invocation_edge_id}\0${edge.edge_checksum}\0${Date.now()}\0${crypto.randomBytes(6).toString("hex")}`, 24)}`,
        invocation_edge_id: String(edge.invocation_edge_id || ""),
        invocation_edge_predelivery_checksum: String(edge.edge_checksum || ""),
        adoption_receipt_checksum: String(edge.adoption_receipt_checksum || ""),
        group_id: String(edge.group_id || ""),
        group_session_id: String(edge.group_session_id || ""),
        group_session_scope_id: String(binding.scopeId || binding.scope_id || ""),
        group_session_memory_binding_checksum: String(receipt?.groupSessionMemoryBindingChecksum || receipt?.group_session_memory_binding_checksum || binding.checksum || ""),
        task_id: String(edge.task_id || ""),
        task_agent_session_id: String(edge.task_agent_session_id || ""),
        native_session_id: String(receipt?.nativeSessionId || receipt?.native_session_id || edge.native_session_id || ""),
        runner_request_id: String(edge.runner_request_id || ""),
        worker_context_packet_id: String(edge.worker_context_packet_id || ""),
        memory_context_snapshot_id: String(edge.memory_context_snapshot_id || ""),
        memory_context_snapshot_checksum: String(edge.memory_context_snapshot_checksum || ""),
        prompt_checksum: String(edge.prompt_checksum || ""),
        compact_epoch: String(edge.compact_epoch || ""),
        compact_transaction_receipt_required: compactTransactionRequired,
        compact_transaction_receipt_id: String(receipt?.compactTransactionReceiptId || receipt?.compact_transaction_receipt_id || binding.compactTransactionReceiptId || ""),
        compact_transaction_boundary_id: compactTransactionBoundaryId,
        compact_transaction_receipt_checksum: compactTransactionReceiptChecksum,
        compact_transaction_receipt_valid: compactTransactionReceiptValid,
        compact_head_fence_required: compactHeadFenceRequired,
        compact_head_fence_valid: compactHeadFenceValid,
        compact_head_id: String(receipt?.compactHeadId || binding.compactHeadId || edge.compact_head_id || ""),
        compact_head_generation: Number(receipt?.compactHeadGeneration || binding.compactHeadGeneration || edge.compact_head_generation || 0),
        compact_head_checksum: String(receipt?.compactHeadChecksum || binding.compactHeadChecksum || edge.compact_head_checksum || ""),
        session_lifecycle_fence_required: sessionLifecycleFenceRequired,
        session_lifecycle_fence_valid: sessionLifecycleFenceValid,
        session_lifecycle_head_id: String(receipt?.sessionLifecycleHeadId || binding.sessionLifecycleHeadId || edge.session_lifecycle_head_id || ""),
        session_lifecycle_generation: Number(receipt?.sessionLifecycleGeneration || binding.sessionLifecycleGeneration || edge.session_lifecycle_generation || 0),
        session_lifecycle_status: String(receipt?.sessionLifecycleStatus || binding.sessionLifecycleStatus || edge.session_lifecycle_status || ""),
        session_lifecycle_head_checksum: String(receipt?.sessionLifecycleHeadChecksum || binding.sessionLifecycleHeadChecksum || edge.session_lifecycle_head_checksum || ""),
        delivery_receipt_id: String(receipt?.receiptId || receipt?.receipt_id || ""),
        delivery_receipt_checksum: String(receipt?.checksum || ""),
        delivery_receipt_checksum_valid: receiptChecksumValid,
        delivery_receipt_identity_valid: receiptIdentityValid,
        delivery_prompt_binding_mode: String(receipt?.promptBindingMode || receipt?.prompt_binding_mode || (runnerPairValid ? "runner_pair_exact" : "")),
        source,
        first_dispatch_after_recovery: edge.continuity_contract_required === true,
        required: edge.continuity_contract_required === true,
        status: proven ? "proven" : "unverified",
        proven_at: proven ? new Date().toISOString() : "",
    };
    proof.proof_checksum = reinjectionProofChecksum(proof);
    const next = transitionEdge(edge, String(edge.status || "prepared"), {
        reinjection_proof: proof,
        reinjection_proof_checksum: proof.proof_checksum,
        reinjection_status: proof.status,
    });
    recordInvocationSoakPhase(next, "post_compact_reinjection", proof.status, proof);
    return next;
}
function recoveryEventChecksum(event) {
    const payload = { ...(event || {}) };
    delete payload.event_checksum;
    delete payload.checksum_valid;
    return sha256(payload);
}
function recoveryStatusChecksum(status) {
    const payload = { ...(status || {}) };
    delete payload.checksum;
    delete payload.checksum_valid;
    delete payload.file;
    return sha256(payload);
}
function getInvocationRecoveryHistoryFile(groupId, groupSessionId) {
    return path.join(exports.TASK_AGENT_INVOCATION_RECOVERY_DIR, `${clean(groupId)}--${clean(groupSessionId)}.jsonl`);
}
function getInvocationRecoveryStatusFile(groupId, groupSessionId) {
    return path.join(exports.TASK_AGENT_INVOCATION_RECOVERY_DIR, `${clean(groupId)}--${clean(groupSessionId)}.latest.json`);
}
//# sourceMappingURL=task-agent-invocation-lineage-part-01.js.map