"use strict";
// collaboration-memory-gates.ts — merged from 5 part files (behavior-freeze merge).
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
exports.extractMemoryDispatchFreshnessGateFromValue = extractMemoryDispatchFreshnessGateFromValue;
exports.normalizeMemoryGateAgent = normalizeMemoryGateAgent;
exports.getTaskAgentMemoryContextSnapshotSources = getTaskAgentMemoryContextSnapshotSources;
exports.forEachTaskAgentMemoryContextSnapshotSource = forEachTaskAgentMemoryContextSnapshotSource;
exports.summarizeTaskAgentMemoryContextSnapshot = summarizeTaskAgentMemoryContextSnapshot;
exports.evaluateReceiptTaskAgentMemoryContextSnapshot = evaluateReceiptTaskAgentMemoryContextSnapshot;
exports.collectTaskMemoryDispatchFreshnessGates = collectTaskMemoryDispatchFreshnessGates;
exports.evaluateReceiptMemoryDispatchGate = evaluateReceiptMemoryDispatchGate;
exports.extractReadPlanRevalidationGateFromValue = extractReadPlanRevalidationGateFromValue;
exports.collectTaskReadPlanRevalidationGates = collectTaskReadPlanRevalidationGates;
exports.evaluateReceiptReadPlanRevalidationGate = evaluateReceiptReadPlanRevalidationGate;
exports.extractPostCompactReinjectionGateFromValue = extractPostCompactReinjectionGateFromValue;
exports.collectTaskPostCompactReinjectionGates = collectTaskPostCompactReinjectionGates;
exports.extractPostCompactDispatchMarkerFromValue = extractPostCompactDispatchMarkerFromValue;
exports.collectTaskPostCompactDispatchMarkers = collectTaskPostCompactDispatchMarkers;
exports.normalizePostCompactCandidateUsageState = normalizePostCompactCandidateUsageState;
exports.collectReceiptPostCompactCandidateUsageRows = collectReceiptPostCompactCandidateUsageRows;
exports.structuredUsageMatchesCandidate = structuredUsageMatchesCandidate;
exports.evaluatePostCompactReinjectionCandidateReference = evaluatePostCompactReinjectionCandidateReference;
exports.evaluateReceiptPostCompactReinjectionGate = evaluateReceiptPostCompactReinjectionGate;
exports.extractApiMicrocompactEditPlanFromValue = extractApiMicrocompactEditPlanFromValue;
exports.extractApiMicrocompactNativeApplyPlanFromValue = extractApiMicrocompactNativeApplyPlanFromValue;
exports.extractApiMicrocompactSessionBindingFromValue = extractApiMicrocompactSessionBindingFromValue;
exports.collectTaskApiMicrocompactEditPlans = collectTaskApiMicrocompactEditPlans;
exports.normalizeApiMicrocompactUsageState = normalizeApiMicrocompactUsageState;
exports.collectReceiptApiMicrocompactUsageRows = collectReceiptApiMicrocompactUsageRows;
exports.evaluateReceiptApiMicrocompactEditPlan = evaluateReceiptApiMicrocompactEditPlan;
exports.extractGlobalAgentMemoryRecallFromValue = extractGlobalAgentMemoryRecallFromValue;
exports.collectTaskGlobalMemoryReceiptGates = collectTaskGlobalMemoryReceiptGates;
exports.extractGlobalMemoryHealthGateFromValue = extractGlobalMemoryHealthGateFromValue;
exports.collectTaskGlobalMemoryHealthGates = collectTaskGlobalMemoryHealthGates;
exports.extractTypedMemoryRecallFromValue = extractTypedMemoryRecallFromValue;
exports.collectTaskTypedMemoryPressureRecallDocs = collectTaskTypedMemoryPressureRecallDocs;
exports.collectTaskTypedMemoryRecallDocs = collectTaskTypedMemoryRecallDocs;
exports.collectReceiptTypedMemoryUsageRows = collectReceiptTypedMemoryUsageRows;
exports.configuredProjectWorkDir = configuredProjectWorkDir;
exports.verifyTypedMemoryCurrentSourceEvidence = verifyTypedMemoryCurrentSourceEvidence;
exports.typedMemoryUsageStateFromReceipt = typedMemoryUsageStateFromReceipt;
exports.collectTaskTypedMemoryConsumptionRows = collectTaskTypedMemoryConsumptionRows;
exports.normalizeTypedMemoryPressureUsageState = normalizeTypedMemoryPressureUsageState;
exports.typedMemoryPressureRecallDocRefs = typedMemoryPressureRecallDocRefs;
exports.collectReceiptMemoryProvenanceUsageRows = collectReceiptMemoryProvenanceUsageRows;
exports.pressureRecallUsageStateFromReceipt = pressureRecallUsageStateFromReceipt;
exports.collectTaskTypedMemoryPressureRecallUsageRows = collectTaskTypedMemoryPressureRecallUsageRows;
exports.normalizeGlobalMemoryUsageState = normalizeGlobalMemoryUsageState;
exports.globalMemoryUsageSnippet = globalMemoryUsageSnippet;
exports.collectReceiptGlobalMemoryUsageRows = collectReceiptGlobalMemoryUsageRows;
exports.evaluateReceiptGlobalMemoryUsageGate = evaluateReceiptGlobalMemoryUsageGate;
exports.evaluateReceiptGlobalMemoryHealthGate = evaluateReceiptGlobalMemoryHealthGate;
exports.buildMemoryGateVisibleSummary = buildMemoryGateVisibleSummary;
exports.buildGlobalMemoryReceiptVisibleSummary = buildGlobalMemoryReceiptVisibleSummary;
exports.buildGlobalMemoryHealthGateVisibleSummary = buildGlobalMemoryHealthGateVisibleSummary;
exports.buildReadPlanRevalidationGateVisibleSummary = buildReadPlanRevalidationGateVisibleSummary;
exports.buildPostCompactReinjectionGateVisibleSummary = buildPostCompactReinjectionGateVisibleSummary;
exports.buildApiMicrocompactReceiptVisibleSummary = buildApiMicrocompactReceiptVisibleSummary;
exports.buildPostCompactDispatchMarkerVisibleSummary = buildPostCompactDispatchMarkerVisibleSummary;
exports.normalizeReplayRepairDispatchBriefRef = normalizeReplayRepairDispatchBriefRef;
exports.collectReplayRepairDispatchBriefRefs = collectReplayRepairDispatchBriefRefs;
exports.replayRepairDispatchBriefRefsForMention = replayRepairDispatchBriefRefsForMention;
const collaboration_1 = require("./collaboration");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const memory_1 = require("./memory");
const provider_tool_access_evidence_1 = require("../../agents/provider-tool-access-evidence");
// ===== merged from collaboration-memory-gates-part-01-part-01.ts =====
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
function extractMemoryDispatchFreshnessGateFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.dispatch_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1")
        return value.dispatch_freshness_gate;
    if (value.memory_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1")
        return value.memory_freshness_gate;
    if (value.references?.memory_freshness_gate?.schema === "ccm-child-agent-memory-dispatch-freshness-gate-v1")
        return value.references.memory_freshness_gate;
    if (value.worker_context_packet)
        return extractMemoryDispatchFreshnessGateFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractMemoryDispatchFreshnessGateFromValue(value.workerContextPacket);
    if (value.memory)
        return extractMemoryDispatchFreshnessGateFromValue(value.memory);
    if (value.group_memory)
        return extractMemoryDispatchFreshnessGateFromValue(value.group_memory);
    return null;
}
function normalizeMemoryGateAgent(value) {
    return String(value || "").trim().toLowerCase();
}
function getTaskAgentMemoryContextSnapshotSources(context = {}) {
    return [
        ...(Array.isArray(context.taskAgentMemoryContextSnapshots || context.task_agent_memory_context_snapshots)
            ? (context.taskAgentMemoryContextSnapshots || context.task_agent_memory_context_snapshots)
            : []),
        ...(Array.isArray(context.memoryContextSnapshots || context.memory_context_snapshots)
            ? (context.memoryContextSnapshots || context.memory_context_snapshots)
            : []),
    ].filter((item) => item && typeof item === "object");
}
function forEachTaskAgentMemoryContextSnapshotSource(context = {}, visit) {
    for (const snapshot of getTaskAgentMemoryContextSnapshotSources(context)) {
        const session = snapshot.session || {};
        const ref = snapshot.ref || {};
        const snapshotId = String(snapshot.snapshot_id || snapshot.snapshotId || ref.snapshotId || ref.snapshot_id || "").trim();
        const source = `task_agent_memory_snapshot:${snapshotId || session.id || "unknown"}`;
        const fallbackAgent = String(snapshot.project || snapshot.target_project || session.project || "").trim();
        const snapshotContext = snapshot.context || {};
        const workerContextPacket = snapshotContext.worker_context_packet || snapshotContext.workerContextPacket || snapshot.worker_context_packet || snapshot.workerContextPacket || null;
        const workerHandoff = snapshotContext.worker_handoff || snapshotContext.workerHandoff || snapshot.worker_handoff || snapshot.workerHandoff || null;
        const memoryContext = snapshotContext.memory_context || snapshotContext.memoryContext || snapshot.memory_context || snapshot.memoryContext || workerContextPacket?.memory || null;
        visit(snapshot, source, fallbackAgent);
        visit(workerContextPacket, `${source}:worker_context_packet`, fallbackAgent);
        visit(workerHandoff, `${source}:worker_handoff`, fallbackAgent);
        visit(memoryContext, `${source}:memory_context`, fallbackAgent);
    }
}
function summarizeTaskAgentMemoryContextSnapshot(snapshot = {}) {
    const context = snapshot.context || {};
    const session = snapshot.session || {};
    const groupSessionMemoryBinding = context.group_session_memory_binding || context.groupSessionMemoryBinding || null;
    const deliveryReceipt = snapshot.delivery_receipt || snapshot.deliveryReceipt || null;
    const deliveryReceiptChecksumValid = snapshot.delivery_receipt_checksum_valid === true || snapshot.deliveryReceiptChecksumValid === true;
    const replayRepairDispatchBriefs = collectReplayRepairDispatchBriefRefs(context.worker_context_packet || context.workerContextPacket || {}, {
        project: session.project || "",
        executionId: context.execution_id || context.executionId || "",
    });
    return {
        schema: snapshot.schema || "ccm-task-agent-memory-context-snapshot-v1",
        snapshot_id: snapshot.snapshot_id || snapshot.snapshotId || "",
        snapshot_file: snapshot.snapshot_file || snapshot.snapshotFile || "",
        checksum: snapshot.checksum || "",
        generated_at: snapshot.generated_at || snapshot.generatedAt || "",
        task_agent_session_id: session.id || "",
        task_id: session.task_id || session.taskId || "",
        group_id: session.group_id || session.groupId || "",
        project: session.project || "",
        agent_type: session.agent_type || session.agentType || "",
        native_session_id: session.native_session_id || session.nativeSessionId || "",
        turn: Number(session.turn || 0),
        worker_context_packet_id: context.worker_context_packet_id || context.workerContextPacketId || snapshot.ref?.workerContextPacketId || "",
        worker_handoff_id: context.worker_handoff_id || context.workerHandoffId || snapshot.ref?.workerHandoffId || "",
        memory_context_checksum: context.memory_context_checksum || context.memoryContextChecksum || "",
        rendered_prompt_checksum: context.rendered_prompt_checksum || context.renderedPromptChecksum || "",
        group_session_memory_binding: groupSessionMemoryBinding,
        group_session_id: groupSessionMemoryBinding?.groupSessionId || groupSessionMemoryBinding?.group_session_id || "",
        group_session_scope_id: groupSessionMemoryBinding?.scopeId || groupSessionMemoryBinding?.scope_id || "",
        session_memory_checksum: groupSessionMemoryBinding?.sessionMemoryChecksum || groupSessionMemoryBinding?.session_memory_checksum || "",
        memory_binding_id: groupSessionMemoryBinding?.memoryBindingId || groupSessionMemoryBinding?.memory_binding_id || "",
        model_extraction_execution_id: groupSessionMemoryBinding?.modelExtractionExecutionId || groupSessionMemoryBinding?.model_extraction_execution_id || "",
        model_extraction_receipt_checksum: groupSessionMemoryBinding?.modelExtractionReceiptChecksum || groupSessionMemoryBinding?.model_extraction_receipt_checksum || "",
        model_extraction_history_head_checksum: groupSessionMemoryBinding?.modelExtractionHistoryHeadChecksum || groupSessionMemoryBinding?.model_extraction_history_head_checksum || "",
        model_extraction_replay_status: groupSessionMemoryBinding?.modelExtractionReplayStatus || groupSessionMemoryBinding?.model_extraction_replay_status || "",
        model_extraction_replay_execution_id: groupSessionMemoryBinding?.modelExtractionReplayExecutionId || groupSessionMemoryBinding?.model_extraction_replay_execution_id || "",
        model_extraction_evidence_valid: groupSessionMemoryBinding?.modelExtractionEvidenceValid !== false,
        fact_supersession_graph_checksum: groupSessionMemoryBinding?.factSupersessionGraphChecksum || groupSessionMemoryBinding?.fact_supersession_graph_checksum || "",
        fact_supersession_graph_valid: groupSessionMemoryBinding?.factSupersessionGraphValid === true || groupSessionMemoryBinding?.fact_supersession_graph_valid === true,
        session_lifecycle_fence_required: groupSessionMemoryBinding?.sessionLifecycleFenceRequired === true,
        session_lifecycle_fence_valid: groupSessionMemoryBinding?.sessionLifecycleFenceValid === true,
        session_lifecycle_status: groupSessionMemoryBinding?.sessionLifecycleStatus || groupSessionMemoryBinding?.session_lifecycle_status || "",
        session_lifecycle_generation: Number(groupSessionMemoryBinding?.sessionLifecycleGeneration || groupSessionMemoryBinding?.session_lifecycle_generation || 0),
        session_lifecycle_head_id: groupSessionMemoryBinding?.sessionLifecycleHeadId || groupSessionMemoryBinding?.session_lifecycle_head_id || "",
        session_lifecycle_head_checksum: groupSessionMemoryBinding?.sessionLifecycleHeadChecksum || groupSessionMemoryBinding?.session_lifecycle_head_checksum || "",
        active_fact_count: Array.isArray(groupSessionMemoryBinding?.activeFacts || groupSessionMemoryBinding?.active_facts)
            ? (groupSessionMemoryBinding.activeFacts || groupSessionMemoryBinding.active_facts).length
            : 0,
        delivery_receipt: deliveryReceipt,
        delivery_receipt_checksum_valid: deliveryReceiptChecksumValid,
        memory_context_delivered: deliveryReceipt?.delivered === true && deliveryReceipt?.status === "delivered",
        memory_context_consumption_receipt_required: deliveryReceipt?.memoryContextConsumptionReceiptRequired === true,
        memory_context_consumption_receipt_valid: deliveryReceipt?.memoryContextConsumptionReceiptValid === true,
        memory_context_consumption_receipt_status: String(deliveryReceipt?.memoryContextConsumptionReceiptStatus || ""),
        memory_context_consumption_challenge_id: String(deliveryReceipt?.memoryContextConsumptionChallengeId || context.memory_context_consumption_challenge?.challenge_id || ""),
        memory_context_consumption_receipt_signature: String(deliveryReceipt?.memoryContextConsumptionReceiptSignature || ""),
        memory_context_consumption_recovery_present: deliveryReceipt?.memoryContextConsumptionRecoveryPresent === true,
        memory_context_consumption_recovery_valid: deliveryReceipt?.memoryContextConsumptionRecoveryValid === true,
        memory_context_consumption_recovery_status: String(deliveryReceipt?.memoryContextConsumptionRecoveryStatus || "not_needed"),
        memory_context_consumption_recovery_id: String(deliveryReceipt?.memoryContextConsumptionRecoveryId || ""),
        gate_ids: (0, collaboration_1.uniqueStrings)(context.gate_ids || context.gateIds || snapshot.ref?.gateIds || snapshot.ref?.gate_ids || []).slice(0, 80),
        replay_repair_dispatch_brief_ids: replayRepairDispatchBriefs.map((brief) => brief.brief_id).filter(Boolean),
        replay_repair_dispatch_briefs: replayRepairDispatchBriefs.slice(0, 8),
    };
}
function evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt = {}, context = {}) {
    return require("./collaboration-acceptance").evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt, context);
}
function collectTaskMemoryDispatchFreshnessGates(task = {}, context = {}) {
    const gates = new Map();
    const addGate = (value, source = "", fallbackAgent = "") => {
        const gate = extractMemoryDispatchFreshnessGateFromValue(value);
        if (!gate?.schema)
            return;
        const gateId = String(gate.dispatch_gate_id || gate.dispatchGateId || "").trim();
        if (!gateId)
            return;
        const targetProject = String(gate.target_project || gate.targetProject || fallbackAgent || "").trim();
        const existing = gates.get(gateId) || {};
        gates.set(gateId, {
            ...existing,
            gate_id: gateId,
            schema: gate.schema,
            group_id: gate.group_id || gate.groupId || existing.group_id || "",
            target_project: targetProject || existing.target_project || "",
            scope: gate.scope || existing.scope || "",
            status: gate.status || existing.status || "",
            action: gate.action || existing.action || "",
            memory_ignored: gate.memory_ignored === true || gate.memoryIgnored === true || existing.memory_ignored === true,
            source_checksum: gate.source_manifest?.checksum || gate.sourceManifest?.checksum || existing.source_checksum || "",
            reload_reason: gate.reload_audit?.reason || gate.reloadAudit?.reason || existing.reload_reason || "",
            source: source || existing.source || "",
            raw: gate,
        });
    };
    addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
    addGate(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function evaluateReceiptMemoryDispatchGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.memoryDispatchGates || context.memory_dispatch_gates)
        ? (context.memoryDispatchGates || context.memory_dispatch_gates)
        : collectTaskMemoryDispatchFreshnessGates(task, context);
    const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
    const matching = allGates.filter((gate) => {
        const target = normalizeMemoryGateAgent(gate.target_project);
        return !target || !agent || target === agent;
    });
    const requiredGates = matching.length ? matching : [];
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const declarationText = [...used, ...ignored].map((item) => String(item || "")).join("\n");
    const missing = requiredGates.filter((gate) => !declarationText.includes(String(gate.gate_id || "")));
    return {
        schema: "ccm-child-agent-memory-gate-receipt-validation-v1",
        required: requiredGates.length > 0,
        pass: requiredGates.length === 0 || missing.length === 0,
        gate_ids: requiredGates.map((gate) => gate.gate_id),
        missing_gate_ids: missing.map((gate) => gate.gate_id),
        declared: used.length > 0 || ignored.length > 0,
        used,
        ignored,
    };
}
function extractReadPlanRevalidationGateFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.compact_file_reference_read_plan_revalidation_gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1")
        return value.compact_file_reference_read_plan_revalidation_gate;
    if (value.compactFileReferenceReadPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1")
        return value.compactFileReferenceReadPlanRevalidationGate;
    if (value.references?.read_plan_revalidation_gate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1")
        return value.references.read_plan_revalidation_gate;
    if (value.references?.readPlanRevalidationGate?.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1")
        return value.references.readPlanRevalidationGate;
    if (value.worker_context_packet)
        return extractReadPlanRevalidationGateFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractReadPlanRevalidationGateFromValue(value.workerContextPacket);
    if (value.memory)
        return extractReadPlanRevalidationGateFromValue(value.memory);
    if (value.group_memory)
        return extractReadPlanRevalidationGateFromValue(value.group_memory);
    return null;
}
function collectTaskReadPlanRevalidationGates(task = {}, context = {}) {
    const gates = new Map();
    const addGate = (value, source = "", fallbackAgent = "") => {
        const gate = extractReadPlanRevalidationGateFromValue(value);
        if (!gate?.schema)
            return;
        const gateId = String(gate.revalidation_gate_id || gate.revalidationGateId || "").trim();
        if (!gateId)
            return;
        const targetProject = String(gate.target_project || gate.targetProject || fallbackAgent || "").trim();
        const sessionBinding = gate.session_binding || gate.sessionBinding || {};
        const requiredReadPlanIds = (0, collaboration_1.uniqueStrings)(...(Array.isArray(gate.required_read_plan_ids || gate.requiredReadPlanIds) ? (gate.required_read_plan_ids || gate.requiredReadPlanIds) : []), ...(Array.isArray(gate.required_entries || gate.requiredEntries) ? (gate.required_entries || gate.requiredEntries).map((row) => row.read_plan_id || row.readPlanId) : []), ...(Array.isArray(gate.verification_read_plan_ids || gate.verificationReadPlanIds) ? (gate.verification_read_plan_ids || gate.verificationReadPlanIds) : [])).filter(Boolean).slice(0, 40);
        const existing = gates.get(gateId) || {};
        gates.set(gateId, {
            ...existing,
            gate_id: gateId,
            schema: gate.schema,
            group_id: gate.group_id || gate.groupId || existing.group_id || "",
            target_project: targetProject || existing.target_project || "",
            scope: gate.scope || existing.scope || "",
            status: gate.status || existing.status || "",
            action: gate.action || existing.action || "",
            required_count: Number(gate.required_count || gate.requiredCount || existing.required_count || 0),
            verification_count: Number(gate.verification_count || gate.verificationCount || existing.verification_count || 0),
            required_read_plan_ids: requiredReadPlanIds,
            task_id: gate.task_id || gate.taskId || sessionBinding.task_id || sessionBinding.taskId || existing.task_id || "",
            trace_id: gate.trace_id || gate.traceId || sessionBinding.trace_id || sessionBinding.traceId || existing.trace_id || "",
            task_agent_session_id: gate.task_agent_session_id || gate.taskAgentSessionId || sessionBinding.task_agent_session_id || sessionBinding.taskAgentSessionId || existing.task_agent_session_id || "",
            native_session_id: gate.native_session_id || gate.nativeSessionId || sessionBinding.native_session_id || sessionBinding.nativeSessionId || existing.native_session_id || "",
            agent_type: sessionBinding.agent_type || sessionBinding.agentType || existing.agent_type || "",
            turn: Number(sessionBinding.turn || existing.turn || 0),
            source: source || existing.source || "",
            raw: gate,
        });
    };
    addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
    addGate(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function evaluateReceiptReadPlanRevalidationGate(task, receipt = {}, context = {}) {
    return require("./collaboration-acceptance").evaluateReceiptReadPlanRevalidationGate(task, receipt, context);
}
function extractPostCompactReinjectionGateFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1")
        return value.post_compact_reinjection_gate;
    if (value.postCompactReinjectionGate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1")
        return value.postCompactReinjectionGate;
    if (value.references?.post_compact_reinjection_gate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1")
        return value.references.post_compact_reinjection_gate;
    if (value.references?.postCompactReinjectionGate?.schema === "ccm-child-agent-post-compact-reinjection-gate-v1")
        return value.references.postCompactReinjectionGate;
    if (value.worker_context_packet)
        return extractPostCompactReinjectionGateFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractPostCompactReinjectionGateFromValue(value.workerContextPacket);
    if (value.memory)
        return extractPostCompactReinjectionGateFromValue(value.memory);
    if (value.group_memory)
        return extractPostCompactReinjectionGateFromValue(value.group_memory);
    return null;
}
function collectTaskPostCompactReinjectionGates(task = {}, context = {}) {
    const gates = new Map();
    const addGate = (value, source = "", fallbackAgent = "") => {
        const gate = extractPostCompactReinjectionGateFromValue(value);
        if (!gate?.schema)
            return;
        const gateId = String(gate.reinjection_gate_id || gate.reinjectionGateId || "").trim();
        if (!gateId)
            return;
        const targetProject = String(gate.target_project || gate.targetProject || fallbackAgent || "").trim();
        const existing = gates.get(gateId) || {};
        gates.set(gateId, {
            ...existing,
            gate_id: gateId,
            schema: gate.schema,
            group_id: gate.group_id || gate.groupId || existing.group_id || "",
            target_project: targetProject || existing.target_project || "",
            scope: gate.scope || existing.scope || "",
            status: gate.status || existing.status || "",
            action: gate.action || existing.action || "",
            candidate_count: Number(gate.candidate_count || gate.candidateCount || existing.candidate_count || 0),
            candidates: Array.isArray(gate.candidates)
                ? gate.candidates.map((candidate) => ({
                    candidate_id: candidate.candidate_id || candidate.candidateId || "",
                    kind: candidate.kind || "",
                    value: candidate.value || "",
                    sourceMessageId: candidate.sourceMessageId || candidate.source_message_id || "",
                })).slice(0, 24)
                : (existing.candidates || []),
            summary_checksum: gate.post_compact_recovery_audit?.summary_checksum
                || gate.postCompactRecoveryAudit?.summaryChecksum
                || existing.summary_checksum
                || "",
            source: source || existing.source || "",
            raw: gate,
        });
    };
    addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
    addGate(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function extractPostCompactDispatchMarkerFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1")
        return value.post_compact_dispatch_marker;
    if (value.postCompactDispatchMarker?.schema === "ccm-post-compact-first-dispatch-marker-v1")
        return value.postCompactDispatchMarker;
    if (value.references?.post_compact_dispatch_marker?.schema === "ccm-post-compact-first-dispatch-marker-v1")
        return value.references.post_compact_dispatch_marker;
    if (value.references?.postCompactDispatchMarker?.schema === "ccm-post-compact-first-dispatch-marker-v1")
        return value.references.postCompactDispatchMarker;
    if (value.worker_context_packet)
        return extractPostCompactDispatchMarkerFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractPostCompactDispatchMarkerFromValue(value.workerContextPacket);
    if (value.memory)
        return extractPostCompactDispatchMarkerFromValue(value.memory);
    if (value.group_memory)
        return extractPostCompactDispatchMarkerFromValue(value.group_memory);
    return null;
}
function collectTaskPostCompactDispatchMarkers(task = {}, context = {}) {
    const markers = new Map();
    const addMarker = (value, source = "", fallbackAgent = "") => {
        const marker = extractPostCompactDispatchMarkerFromValue(value);
        if (!marker?.schema)
            return;
        const markerId = String(marker.marker_id || marker.markerId || "").trim();
        if (!markerId)
            return;
        const targetProject = String(marker.target_project || marker.targetProject || fallbackAgent || "").trim();
        const existing = markers.get(markerId) || {};
        markers.set(markerId, {
            ...existing,
            marker_id: markerId,
            schema: marker.schema,
            group_id: marker.group_id || marker.groupId || existing.group_id || "",
            target_project: targetProject || existing.target_project || "",
            scope: marker.scope || existing.scope || "",
            boundary_id: marker.boundary_id || marker.boundaryId || existing.boundary_id || "",
            raw_boundary_id: marker.raw_boundary_id || marker.rawBoundaryId || existing.raw_boundary_id || "",
            summarized_through_message_id: marker.summarized_through_message_id || marker.summarizedThroughMessageId || existing.summarized_through_message_id || "",
            summary_checksum: marker.summary_checksum || marker.summaryChecksum || existing.summary_checksum || "",
            first_dispatch_after_compact: marker.first_dispatch_after_compact === true || marker.firstDispatchAfterCompact === true || existing.first_dispatch_after_compact === true,
            dispatch_sequence: Number(marker.dispatch_sequence || marker.dispatchSequence || existing.dispatch_sequence || 0),
            status: marker.status || existing.status || "",
            action: marker.action || existing.action || "",
            reinjection_gate_id: marker.reinjection_gate_id || marker.reinjectionGateId || existing.reinjection_gate_id || "",
            candidate_count: Number(marker.candidate_count || marker.candidateCount || existing.candidate_count || 0),
            source: source || existing.source || "",
            raw: marker,
        });
    };
    addMarker(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addMarker(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addMarker(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addMarker(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addMarker(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addMarker(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addMarker(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addMarker);
    addMarker(context.execution, "execution", task?.target_project);
    return [...markers.values()];
}
function normalizePostCompactCandidateUsageState(value) {
    const state = String(value || "").toLowerCase().trim();
    if (["used", "ignored", "verified", "mentioned", "unreferenced"].includes(state))
        return state;
    if (["checked", "reviewed", "validated", "confirmed"].includes(state))
        return "verified";
    if (["skipped", "unused", "not_used", "not-used", "not used"].includes(state))
        return "ignored";
    if (["applied", "referenced", "consumed"].includes(state))
        return "used";
    return "";
}
function collectReceiptPostCompactCandidateUsageRows(receipt = {}) {
    const rawRows = [
        ...(Array.isArray(receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) ? (receipt.postCompactCandidateUsage || receipt.post_compact_candidate_usage) : []),
        ...(Array.isArray(receipt.postCompactCandidateUsageRows || receipt.post_compact_candidate_usage_rows) ? (receipt.postCompactCandidateUsageRows || receipt.post_compact_candidate_usage_rows) : []),
        ...(Array.isArray(receipt.candidateUsage || receipt.candidate_usage) ? (receipt.candidateUsage || receipt.candidate_usage) : []),
    ];
    return rawRows.map((raw) => {
        const row = typeof raw === "string" ? { value: raw } : raw;
        if (!row || typeof row !== "object")
            return null;
        const usageState = normalizePostCompactCandidateUsageState(row.usageState || row.usage_state || row.status || row.state);
        return {
            gate_id: String(row.gateId || row.gate_id || row.reinjectionGateId || row.reinjection_gate_id || "").trim(),
            candidate_id: String(row.candidateId || row.candidate_id || row.id || "").trim(),
            kind: String(row.kind || row.type || "").trim(),
            value: (0, memory_1.compactMemoryText)(row.value || row.text || row.summary || "", 800),
            usage_state: usageState,
            reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 500),
            raw: row,
        };
    }).filter((row) => row && (row.gate_id || row.candidate_id || row.value || row.usage_state)).slice(0, 120);
}
function structuredUsageMatchesCandidate(row, gate, candidate) {
    const gateId = String(gate?.gate_id || gate?.reinjection_gate_id || gate?.reinjectionGateId || "").trim().toLowerCase();
    const rowGateId = String(row?.gate_id || row?.gateId || row?.reinjection_gate_id || row?.reinjectionGateId || "").trim().toLowerCase();
    if (gateId && rowGateId && gateId !== rowGateId)
        return false;
    const candidateId = String(candidate?.candidate_id || candidate?.candidateId || "").trim().toLowerCase();
    const rowCandidateId = String(row?.candidate_id || row?.candidateId || row?.id || "").trim().toLowerCase();
    if (candidateId && rowCandidateId && candidateId === rowCandidateId)
        return true;
    const value = String(candidate?.value || "").trim().toLowerCase();
    const rowValue = String(row?.value || row?.text || "").trim().toLowerCase();
    return !!value && !!rowValue && (rowValue.includes(value) || value.includes(rowValue));
}
function evaluatePostCompactReinjectionCandidateReference(gate, declarationText = "", structuredUsageRows = []) {
    const candidates = Array.isArray(gate?.candidates) ? gate.candidates : [];
    const required = candidates.length > 0;
    const text = String(declarationText || "");
    const gateId = String(gate?.gate_id || gate?.reinjection_gate_id || gate?.reinjectionGateId || "").trim();
    const scopedStructuredRows = (Array.isArray(structuredUsageRows) ? structuredUsageRows : [])
        .filter((row) => !row.gate_id || !gateId || String(row.gate_id).trim() === gateId);
    const allWord = String.raw `(?:全部|所有|\ball\b)`;
    const allCandidatesDeclared = new RegExp(`${allWord}.{0,24}(候选|重注入|candidate|candidates|reinjection)|候选.{0,12}${allWord}|candidate.{0,12}${allWord}`, "i").test(text);
    const allCandidatesIgnored = new RegExp(`${allWord}.{0,32}(候选|重注入|candidate|candidates|reinjection).{0,32}(未使用|不使用|忽略|跳过|ignored|skipped|not\\s*used)|未使用.{0,16}${allWord}.{0,16}(候选|candidate)`, "i").test(text);
    const allCandidatesVerified = new RegExp(`${allWord}.{0,32}(候选|重注入|candidate|candidates|reinjection).{0,32}(已?检查|已?核验|已?验证|reviewed|checked|verified)|候选.{0,16}${allWord}.{0,16}(已?检查|已?核验|已?验证)`, "i").test(text);
    const allCandidatesUsed = !allCandidatesIgnored && new RegExp(`${allWord}.{0,32}(候选|重注入|candidate|candidates|reinjection).{0,32}(已?使用|采用|应用|参考|used|applied|consumed)`, "i").test(text);
    const candidateRefs = (candidate) => [
        candidate.candidate_id,
        candidate.candidateId,
        candidate.value,
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const snippetForRefs = (source, refs) => {
        const snippets = [];
        for (const ref of refs) {
            const index = source.indexOf(ref);
            if (index < 0)
                continue;
            snippets.push(source.slice(Math.max(0, index - 80), Math.min(source.length, index + ref.length + 100)));
        }
        return snippets.join("\n");
    };
    const hasIgnored = (value) => /(未使用|不使用|无需使用|没有使用|忽略|跳过|不采用|not\s*used|unused|ignored|skipped|do\s*not\s*use)/i.test(value);
    const hasVerified = (value) => /(已?检查|已?核验|已?验证|确认过|复核|reviewed|checked|verified|validated)/i.test(value);
    const hasUsed = (value) => /(已?使用|采用|应用|参考|依据|消费|用到|used|applied|referenced|consumed)/i.test(value);
    const candidate_usage_rows = candidates.map((candidate) => {
        const refs = candidateRefs(candidate);
        const structuredUsage = scopedStructuredRows.find((row) => structuredUsageMatchesCandidate(row, gate, candidate));
        const structuredState = normalizePostCompactCandidateUsageState(structuredUsage?.usage_state || structuredUsage?.usageState || structuredUsage?.status);
        const usedText = refs.some(ref => String(declarationText || "").includes(ref)) ? snippetForRefs(String(declarationText || ""), refs) : "";
        const referenced = !!structuredUsage || refs.some(ref => text.includes(ref));
        const localText = usedText || (allCandidatesDeclared ? text : "");
        const ignored = structuredState
            ? structuredState === "ignored"
            : referenced
                ? hasIgnored(localText)
                : allCandidatesDeclared && allCandidatesIgnored;
        const verified = !ignored && (structuredState
            ? structuredState === "verified"
            : referenced ? hasVerified(localText) : allCandidatesDeclared && allCandidatesVerified);
        const used = !ignored && (structuredState
            ? structuredState === "used"
            : referenced ? hasUsed(localText) : allCandidatesDeclared && allCandidatesUsed);
        const usageState = ignored ? "ignored" : verified ? "verified" : used ? "used" : referenced || allCandidatesDeclared ? "mentioned" : "unreferenced";
        return {
            candidate_id: candidate.candidate_id || candidate.candidateId || "",
            kind: candidate.kind || "",
            value: candidate.value || "",
            sourceMessageId: candidate.sourceMessageId || candidate.source_message_id || "",
            referenced: referenced || allCandidatesDeclared,
            direct_reference: refs.some(ref => text.includes(ref)),
            structured_reference: !!structuredUsage,
            classification_source: structuredUsage ? "structured_post_compact_candidate_usage" : allCandidatesDeclared ? "all_candidates_statement" : "memory_text",
            usage_state: usageState,
            used,
            ignored,
            verified,
            reason: structuredUsage?.reason || "",
        };
    });
    const referenced = candidates.filter((candidate) => {
        const refs = [
            candidate.candidate_id,
            candidate.candidateId,
            candidate.value,
        ].map((item) => String(item || "").trim()).filter(Boolean);
        return refs.some(ref => text.includes(ref)) || scopedStructuredRows.some((row) => structuredUsageMatchesCandidate(row, gate, candidate));
    });
    const usageRows = candidate_usage_rows.filter((row) => row.referenced);
    const usageDeclared = usageRows.some((row) => ["used", "ignored", "verified"].includes(row.usage_state));
    const strictUsageRows = candidate_usage_rows.filter((row) => ["used", "ignored", "verified"].includes(row.usage_state));
    const missingUsageRows = candidate_usage_rows.filter((row) => !["used", "ignored", "verified"].includes(row.usage_state));
    const usageCounts = {
        used: candidate_usage_rows.filter((row) => row.used).length,
        ignored: candidate_usage_rows.filter((row) => row.ignored).length,
        verified: candidate_usage_rows.filter((row) => row.verified).length,
        mentioned: candidate_usage_rows.filter((row) => row.usage_state === "mentioned").length,
        unreferenced: candidate_usage_rows.filter((row) => row.usage_state === "unreferenced").length,
    };
    return {
        required,
        pass: !required || allCandidatesDeclared || referenced.length > 0,
        referenced_candidate_ids: (0, collaboration_1.uniqueStrings)(referenced.map((candidate) => candidate.candidate_id || candidate.candidateId || "")).slice(0, 24),
        all_candidates_declared: allCandidatesDeclared,
        candidate_usage_required: required,
        candidate_usage_any_declared: usageDeclared,
        candidate_usage_strict_required: required,
        candidate_usage_strict_passed: !required || strictUsageRows.length === candidates.length,
        candidate_usage_declared_passed: !required || strictUsageRows.length === candidates.length,
        candidate_usage_rows,
        candidate_usage_counts: usageCounts,
        used_candidate_ids: (0, collaboration_1.uniqueStrings)(candidate_usage_rows.filter((row) => row.used).map((row) => row.candidate_id)).slice(0, 24),
        ignored_candidate_ids: (0, collaboration_1.uniqueStrings)(candidate_usage_rows.filter((row) => row.ignored).map((row) => row.candidate_id)).slice(0, 24),
        verified_candidate_ids: (0, collaboration_1.uniqueStrings)(candidate_usage_rows.filter((row) => row.verified).map((row) => row.candidate_id)).slice(0, 24),
        mentioned_only_candidate_ids: (0, collaboration_1.uniqueStrings)(candidate_usage_rows.filter((row) => row.usage_state === "mentioned").map((row) => row.candidate_id)).slice(0, 24),
        unreferenced_candidate_ids: (0, collaboration_1.uniqueStrings)(candidate_usage_rows.filter((row) => row.usage_state === "unreferenced").map((row) => row.candidate_id)).slice(0, 24),
        missing_candidate_usage_candidate_ids: (0, collaboration_1.uniqueStrings)(missingUsageRows.map((row) => row.candidate_id || row.value)).slice(0, 24),
        structured_candidate_usage_count: scopedStructuredRows.length,
        candidate_count: candidates.length,
    };
}
function evaluateReceiptPostCompactReinjectionGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.postCompactReinjectionGates || context.post_compact_reinjection_gates)
        ? (context.postCompactReinjectionGates || context.post_compact_reinjection_gates)
        : collectTaskPostCompactReinjectionGates(task, context);
    const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
    const matching = allGates.filter((gate) => {
        const target = normalizeMemoryGateAgent(gate.target_project);
        return !target || !agent || target === agent;
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredUsageRows = collectReceiptPostCompactCandidateUsageRows(receipt);
    const structuredUsageText = structuredUsageRows
        .map((row) => [row.gate_id, row.candidate_id, row.value, row.usage_state, row.reason].filter(Boolean).join(" "))
        .join("\n");
    const declarationText = [...used, ...ignored, structuredUsageText].map((item) => String(item || "")).join("\n");
    const missing = matching.filter((gate) => !declarationText.includes(String(gate.gate_id || "")));
    const candidateRows = matching.map((gate) => ({
        gate_id: gate.gate_id,
        ...evaluatePostCompactReinjectionCandidateReference(gate, declarationText, structuredUsageRows),
    }));
    const missingCandidateReference = candidateRows.filter((row) => row.required && !row.pass);
    const missingCandidateUsage = candidateRows.filter((row) => row.required && row.pass && !row.candidate_usage_declared_passed);
    const flattenedCandidateUsageRows = candidateRows.flatMap((row) => (row.candidate_usage_rows || []).map((candidate) => ({ ...candidate, gate_id: row.gate_id })));
    return {
        schema: "ccm-child-agent-post-compact-reinjection-gate-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || (missing.length === 0 && missingCandidateReference.length === 0 && missingCandidateUsage.length === 0),
        gate_ids: matching.map((gate) => gate.gate_id),
        missing_gate_ids: missing.map((gate) => gate.gate_id),
        candidate_count: matching.reduce((sum, gate) => sum + Number(gate.candidate_count || 0), 0),
        candidate_reference_required: candidateRows.some((row) => row.required),
        candidate_reference_passed: candidateRows.every((row) => !row.required || row.pass),
        candidate_usage_required: candidateRows.some((row) => row.candidate_usage_required),
        candidate_usage_declared_passed: candidateRows.every((row) => !row.candidate_usage_required || row.candidate_usage_declared_passed),
        candidate_usage_strict_required: candidateRows.some((row) => row.candidate_usage_strict_required),
        candidate_usage_strict_passed: candidateRows.every((row) => !row.candidate_usage_strict_required || row.candidate_usage_strict_passed),
        referenced_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.referenced_candidate_ids || [])).slice(0, 24),
        all_candidates_declared: candidateRows.some((row) => row.all_candidates_declared),
        missing_candidate_reference_gate_ids: missingCandidateReference.map((row) => row.gate_id),
        missing_candidate_usage_gate_ids: missingCandidateUsage.map((row) => row.gate_id),
        missing_candidate_usage_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.missing_candidate_usage_candidate_ids || [])).slice(0, 40),
        candidate_usage_rows: flattenedCandidateUsageRows,
        candidate_usage_counts: {
            used: flattenedCandidateUsageRows.filter((row) => row.used).length,
            ignored: flattenedCandidateUsageRows.filter((row) => row.ignored).length,
            verified: flattenedCandidateUsageRows.filter((row) => row.verified).length,
            mentioned: flattenedCandidateUsageRows.filter((row) => row.usage_state === "mentioned").length,
            unreferenced: flattenedCandidateUsageRows.filter((row) => row.usage_state === "unreferenced").length,
        },
        used_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.used_candidate_ids || [])).slice(0, 24),
        ignored_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.ignored_candidate_ids || [])).slice(0, 24),
        verified_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.verified_candidate_ids || [])).slice(0, 24),
        mentioned_only_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.mentioned_only_candidate_ids || [])).slice(0, 24),
        unreferenced_candidate_ids: (0, collaboration_1.uniqueStrings)(...candidateRows.map((row) => row.unreferenced_candidate_ids || [])).slice(0, 24),
        structured_candidate_usage_rows: structuredUsageRows,
        candidate_rows: candidateRows,
        declared: used.length > 0 || ignored.length > 0,
        used,
        ignored,
    };
}
function extractApiMicrocompactEditPlanFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.apiMicroCompactEditPlan;
    if (value.api_microcompact_edit_plan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.api_microcompact_edit_plan;
    if (value.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.compaction.apiMicroCompactEditPlan;
    if (value.compaction?.api_microcompact_edit_plan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.compaction.api_microcompact_edit_plan;
    if (value.compaction?.boundary?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.compaction.boundary.apiMicroCompactEditPlan;
    if (value.compaction?.boundary?.post_compact_restore?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.compaction.boundary.post_compact_restore.apiMicroCompactEditPlan;
    if (value.memory?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.memory.apiMicroCompactEditPlan;
    if (value.memory?.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.memory.compaction.apiMicroCompactEditPlan;
    if (value.group_memory?.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.group_memory.compaction.apiMicroCompactEditPlan;
    if (value.groupMemory?.compaction?.apiMicroCompactEditPlan?.schema === "ccm-api-microcompact-edit-plan-v1")
        return value.groupMemory.compaction.apiMicroCompactEditPlan;
    if (value.references?.memory_context)
        return extractApiMicrocompactEditPlanFromValue(value.references.memory_context);
    if (value.references?.memoryContext)
        return extractApiMicrocompactEditPlanFromValue(value.references.memoryContext);
    if (value.worker_context_packet)
        return extractApiMicrocompactEditPlanFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractApiMicrocompactEditPlanFromValue(value.workerContextPacket);
    if (value.memory)
        return extractApiMicrocompactEditPlanFromValue(value.memory);
    if (value.group_memory)
        return extractApiMicrocompactEditPlanFromValue(value.group_memory);
    if (value.groupMemory)
        return extractApiMicrocompactEditPlanFromValue(value.groupMemory);
    return null;
}
function extractApiMicrocompactNativeApplyPlanFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value;
    if (value.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.apiMicrocompactNativeApplyPlan;
    if (value.apiMicroCompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.apiMicroCompactNativeApplyPlan;
    if (value.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.api_microcompact_native_apply_plan;
    if (value.compaction?.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.compaction.apiMicrocompactNativeApplyPlan;
    if (value.compaction?.apiMicroCompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.compaction.apiMicroCompactNativeApplyPlan;
    if (value.compaction?.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.compaction.api_microcompact_native_apply_plan;
    if (value.references?.api_microcompact_native_apply_plan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.references.api_microcompact_native_apply_plan;
    if (value.references?.apiMicrocompactNativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1")
        return value.references.apiMicrocompactNativeApplyPlan;
    if (value.worker_context_packet)
        return extractApiMicrocompactNativeApplyPlanFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractApiMicrocompactNativeApplyPlanFromValue(value.workerContextPacket);
    if (value.memory)
        return extractApiMicrocompactNativeApplyPlanFromValue(value.memory);
    if (value.group_memory)
        return extractApiMicrocompactNativeApplyPlanFromValue(value.group_memory);
    if (value.groupMemory)
        return extractApiMicrocompactNativeApplyPlanFromValue(value.groupMemory);
    return null;
}
function extractApiMicrocompactSessionBindingFromValue(value) {
    if (!value || typeof value !== "object")
        return {};
    const direct = value.session_binding || value.sessionBinding || value.memory?.session_binding || value.memory?.sessionBinding || null;
    const nativeApply = value.apiMicrocompactNativeApplyPlan
        || value.apiMicroCompactNativeApplyPlan
        || value.api_microcompact_native_apply_plan
        || value.compaction?.apiMicrocompactNativeApplyPlan
        || value.compaction?.apiMicroCompactNativeApplyPlan
        || value.compaction?.api_microcompact_native_apply_plan
        || null;
    const session = value.session || {};
    const context = value.context || {};
    const ref = value.ref || {};
    const binding = direct || nativeApply?.sessionBinding || nativeApply?.session_binding || {};
    const snapshotId = String(value.snapshot_id
        || value.snapshotId
        || ref.snapshot_id
        || ref.snapshotId
        || context.memory_context_snapshot_id
        || context.memoryContextSnapshotId
        || "").trim();
    const snapshotChecksum = String(value.checksum
        || value.snapshot_checksum
        || value.snapshotChecksum
        || context.memory_context_checksum
        || context.memoryContextChecksum
        || "").trim();
    const taskAgentSessionId = String(binding.task_agent_session_id
        || binding.taskAgentSessionId
        || nativeApply?.task_agent_session_id
        || nativeApply?.taskAgentSessionId
        || session.id
        || session.task_agent_session_id
        || session.taskAgentSessionId
        || "").trim();
    const nativeSessionId = String(binding.native_session_id
        || binding.nativeSessionId
        || nativeApply?.native_session_id
        || nativeApply?.nativeSessionId
        || session.native_session_id
        || session.nativeSessionId
        || "").trim();
    if (!taskAgentSessionId && !nativeSessionId && !snapshotId && !snapshotChecksum)
        return {};
    return {
        session_binding: binding?.schema ? binding : null,
        binding_id: String(binding.binding_id || binding.bindingId || nativeApply?.sessionBinding?.binding_id || nativeApply?.session_binding?.binding_id || ""),
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        memory_context_snapshot_id: snapshotId,
        memory_context_snapshot_checksum: snapshotChecksum,
    };
}
function collectTaskApiMicrocompactEditPlans(task = {}, context = {}) {
    const plans = new Map();
    const addPlan = (value, source = "", fallbackAgent = "") => {
        const plan = extractApiMicrocompactEditPlanFromValue(value);
        if (!plan?.schema)
            return;
        const nativeApplyPlan = extractApiMicrocompactNativeApplyPlanFromValue(value);
        const sessionEvidence = extractApiMicrocompactSessionBindingFromValue(value);
        const requestPatch = nativeApplyPlan?.requestPatch || nativeApplyPlan?.request_patch || null;
        const requestPatchReady = !!requestPatch?.body?.context_management
            && Array.isArray(requestPatch?.beta_headers)
            && requestPatch.beta_headers.includes("context-management-2025-06-27");
        const nativeApplyReady = nativeApplyPlan?.schema === "ccm-api-microcompact-native-apply-plan-v1"
            && nativeApplyPlan.nativeApplyReady === true
            && requestPatchReady;
        const planChecksum = String(plan.planChecksum || plan.plan_checksum || crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 24)).trim();
        const targetProject = String(plan.targetProject || plan.target_project || value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
        const existing = plans.get(planChecksum) || {};
        plans.set(planChecksum, {
            ...existing,
            plan_checksum: planChecksum,
            schema: plan.schema,
            group_id: plan.groupId || plan.group_id || existing.group_id || task?.group_id || task?.groupId || "",
            target_project: targetProject || existing.target_project || "",
            source: source || existing.source || "",
            edit_count: Number(plan.editCount || plan.edit_count || existing.edit_count || 0),
            recommended: plan.recommended === true || existing.recommended === true,
            advisory_only: !nativeApplyReady,
            can_apply_natively: nativeApplyReady,
            native_apply_ready: nativeApplyReady,
            native_apply_plan: nativeApplyPlan || null,
            apply_plan_checksum: String(nativeApplyPlan?.applyPlanChecksum || nativeApplyPlan?.apply_plan_checksum || ""),
            request_patch_checksum: String(nativeApplyPlan?.requestPatchChecksum || nativeApplyPlan?.request_patch_checksum || ""),
            session_binding: sessionEvidence.session_binding || nativeApplyPlan?.sessionBinding || nativeApplyPlan?.session_binding || existing.session_binding || null,
            session_binding_id: sessionEvidence.binding_id || nativeApplyPlan?.sessionBinding?.binding_id || nativeApplyPlan?.session_binding?.binding_id || existing.session_binding_id || "",
            task_agent_session_id: sessionEvidence.task_agent_session_id || nativeApplyPlan?.task_agent_session_id || nativeApplyPlan?.taskAgentSessionId || existing.task_agent_session_id || "",
            native_session_id: sessionEvidence.native_session_id || nativeApplyPlan?.native_session_id || nativeApplyPlan?.nativeSessionId || existing.native_session_id || "",
            memory_context_snapshot_id: sessionEvidence.memory_context_snapshot_id || nativeApplyPlan?.memory_context_snapshot_id || nativeApplyPlan?.memoryContextSnapshotId || existing.memory_context_snapshot_id || "",
            memory_context_snapshot_checksum: sessionEvidence.memory_context_snapshot_checksum || nativeApplyPlan?.memory_context_snapshot_checksum || nativeApplyPlan?.memoryContextSnapshotChecksum || existing.memory_context_snapshot_checksum || "",
            active_tokens: Number(plan.activeTokens || plan.active_tokens || existing.active_tokens || 0),
            trigger_value: Number(plan.trigger?.value || plan.maxInputTokens || plan.max_input_tokens || existing.trigger_value || 0),
            context_management: plan.contextManagement || plan.context_management || null,
            raw: plan,
        });
    };
    addPlan(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addPlan(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addPlan(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addPlan(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addPlan(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addPlan(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addPlan(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addPlan);
    addPlan(context.execution, "execution", task?.target_project);
    return [...plans.values()];
}
function normalizeApiMicrocompactUsageState(value) {
    const state = String(value || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
    if (["native_applied", "native_apply", "applied", "used_native"].includes(state))
        return "native_applied";
    if (["advisory", "advisory_only", "context_pressure", "metadata", "used"].includes(state))
        return "advisory";
    if (["ignored", "ignore", "not_used", "unused", "skipped", "not_supported", "unsupported"].includes(state))
        return state === "not_supported" || state === "unsupported" ? "not_supported" : "ignored";
    return "";
}
function collectReceiptApiMicrocompactUsageRows(receipt = {}) {
    const rawRows = [
        ...(Array.isArray(receipt.apiMicrocompactUsage || receipt.api_microcompact_usage) ? (receipt.apiMicrocompactUsage || receipt.api_microcompact_usage) : []),
        ...(Array.isArray(receipt.apiMicroCompactUsage || receipt.api_microCompact_usage) ? (receipt.apiMicroCompactUsage || receipt.api_microCompact_usage) : []),
        ...(Array.isArray(receipt.apiMicrocompactEditPlanUsage || receipt.api_microcompact_edit_plan_usage) ? (receipt.apiMicrocompactEditPlanUsage || receipt.api_microcompact_edit_plan_usage) : []),
    ];
    return rawRows.map((raw) => {
        const row = typeof raw === "string" ? { reason: raw } : raw;
        if (!row || typeof row !== "object")
            return null;
        const nativeApplied = row.nativeApplied === true || row.native_applied === true || row.appliedNatively === true || row.applied_natively === true;
        const usageState = nativeApplied ? "native_applied" : normalizeApiMicrocompactUsageState(row.usageState || row.usage_state || row.status || row.state);
        return {
            plan_checksum: String(row.planChecksum || row.plan_checksum || row.checksum || row.apiMicrocompactPlanChecksum || row.api_microcompact_plan_checksum || "").trim(),
            apply_plan_checksum: String(row.applyPlanChecksum || row.apply_plan_checksum || row.nativeApplyPlanChecksum || row.native_apply_plan_checksum || "").trim(),
            request_patch_checksum: String(row.requestPatchChecksum || row.request_patch_checksum || "").trim(),
            task_agent_session_id: String(row.taskAgentSessionId || row.task_agent_session_id || receipt.taskAgentSessionId || receipt.task_agent_session_id || "").trim(),
            native_session_id: String(row.nativeSessionId || row.native_session_id || receipt.nativeSessionId || receipt.native_session_id || "").trim(),
            memory_context_snapshot_id: String(row.memoryContextSnapshotId || row.memory_context_snapshot_id || receipt.memoryContextSnapshotId || receipt.memory_context_snapshot_id || "").trim(),
            memory_context_snapshot_checksum: String(row.memoryContextSnapshotChecksum || row.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || receipt.memory_context_snapshot_checksum || "").trim(),
            usage_state: usageState,
            native_applied: nativeApplied || usageState === "native_applied",
            advisory_only: row.advisoryOnly === true || row.advisory_only === true || usageState === "advisory",
            reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 500),
            raw: row,
        };
    }).filter((row) => row && (row.plan_checksum || row.usage_state || row.reason)).slice(0, 40);
}
function evaluateReceiptApiMicrocompactEditPlan(task, receipt = {}, context = {}) {
    const allPlans = Array.isArray(context.apiMicrocompactEditPlans || context.api_microcompact_edit_plans)
        ? (context.apiMicrocompactEditPlans || context.api_microcompact_edit_plans)
        : collectTaskApiMicrocompactEditPlans(task, context);
    const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
    const matching = allPlans.filter((plan) => {
        const target = normalizeMemoryGateAgent(plan.target_project);
        return (!target || !agent || target === agent) && (Number(plan.edit_count || 0) > 0 || plan.recommended === true);
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredRows = collectReceiptApiMicrocompactUsageRows(receipt);
    const structuredText = structuredRows.map((row) => [row.plan_checksum, row.usage_state, row.reason].filter(Boolean).join(" ")).join("\n");
    const declarationText = [
        ...used,
        ...ignored,
        structuredText,
        receipt.summary,
        ...(Array.isArray(receipt.verification) ? receipt.verification : []),
    ].map((item) => String(item || "")).join("\n");
    const hasApiMicrocompactKeyword = /api[\s_-]?microcompact|microcompact edit plan|context[-\s]?management|clear_thinking_20251015|clear_tool_uses_20250919/i.test(declarationText);
    const hasAdvisorySignal = /(advisory|metadata|context pressure|not supported|unsupported|不支持|仅作提示|压力提示|上下文压力|未原生应用|没有原生应用)/i.test(declarationText);
    const hasIgnoredSignal = /(memoryignored|ignored|not used|unused|skip|不使用|未使用|忽略|跳过)/i.test(ignored.map((item) => String(item || "")).join("\n") || declarationText);
    const hasNativeAppliedSignal = /(native applied|applied natively|native apply|原生应用|已原生应用|context management applied)/i.test(declarationText);
    const rows = matching.map((plan) => {
        const checksum = String(plan.plan_checksum || "").trim();
        const structured = structuredRows.find((row) => row.plan_checksum && row.plan_checksum === checksum)
            || (!checksum ? structuredRows[0] : null);
        const mentioned = (!!checksum && declarationText.includes(checksum)) || (!!structured) || hasApiMicrocompactKeyword;
        const usageState = structured?.usage_state
            || (hasNativeAppliedSignal ? "native_applied" : hasAdvisorySignal ? "advisory" : hasIgnoredSignal ? "ignored" : "");
        const nativeApplied = usageState === "native_applied" || structured?.native_applied === true;
        const nativeApplyPlan = plan.native_apply_plan || null;
        const requestPatch = nativeApplyPlan?.requestPatch || nativeApplyPlan?.request_patch || null;
        const requestPatchReady = !!requestPatch?.body?.context_management
            && Array.isArray(requestPatch?.beta_headers)
            && requestPatch.beta_headers.includes("context-management-2025-06-27");
        const expectedApplyPlanChecksum = String(plan.apply_plan_checksum || "");
        const expectedRequestPatchChecksum = String(plan.request_patch_checksum || "");
        const expectedTaskAgentSessionId = String(plan.task_agent_session_id || "");
        const expectedNativeSessionId = String(plan.native_session_id || "");
        const expectedSnapshotId = String(plan.memory_context_snapshot_id || "");
        const expectedSnapshotChecksum = String(plan.memory_context_snapshot_checksum || "");
        const applyPlanChecksumMatched = !nativeApplied || (!!expectedApplyPlanChecksum && structured?.apply_plan_checksum === expectedApplyPlanChecksum);
        const requestPatchChecksumMatched = !nativeApplied || (!!expectedRequestPatchChecksum && structured?.request_patch_checksum === expectedRequestPatchChecksum);
        const sessionBindingRequired = !!(expectedTaskAgentSessionId || expectedNativeSessionId || expectedSnapshotId || expectedSnapshotChecksum);
        const taskAgentSessionMatched = !expectedTaskAgentSessionId || structured?.task_agent_session_id === expectedTaskAgentSessionId;
        const nativeSessionMatched = !expectedNativeSessionId || structured?.native_session_id === expectedNativeSessionId;
        const snapshotMatched = (!expectedSnapshotId || structured?.memory_context_snapshot_id === expectedSnapshotId)
            && (!expectedSnapshotChecksum || structured?.memory_context_snapshot_checksum === expectedSnapshotChecksum);
        const sessionMatched = !sessionBindingRequired || (taskAgentSessionMatched && nativeSessionMatched && snapshotMatched);
        const nativeContractReady = plan.native_apply_ready === true
            && nativeApplyPlan?.nativeApplyReady === true
            && requestPatchReady;
        const unsafeNativeApplied = nativeApplied && (!nativeContractReady || !applyPlanChecksumMatched || !requestPatchChecksumMatched);
        const declared = mentioned && ["native_applied", "advisory", "ignored", "not_supported"].includes(usageState);
        const pass = declared && !unsafeNativeApplied && sessionMatched;
        return {
            plan_checksum: checksum,
            edit_count: Number(plan.edit_count || 0),
            advisory_only: plan.advisory_only !== false,
            can_apply_natively: plan.can_apply_natively === true,
            native_apply_ready: nativeContractReady,
            apply_plan_checksum: expectedApplyPlanChecksum,
            request_patch_checksum: expectedRequestPatchChecksum,
            receipt_apply_plan_checksum: structured?.apply_plan_checksum || "",
            receipt_request_patch_checksum: structured?.request_patch_checksum || "",
            apply_plan_checksum_matched: applyPlanChecksumMatched,
            request_patch_checksum_matched: requestPatchChecksumMatched,
            session_binding_required: sessionBindingRequired,
            session_matched: sessionMatched,
            session_mismatch: sessionBindingRequired && !sessionMatched,
            expected_task_agent_session_id: expectedTaskAgentSessionId,
            receipt_task_agent_session_id: structured?.task_agent_session_id || "",
            expected_native_session_id: expectedNativeSessionId,
            receipt_native_session_id: structured?.native_session_id || "",
            expected_memory_context_snapshot_id: expectedSnapshotId,
            receipt_memory_context_snapshot_id: structured?.memory_context_snapshot_id || "",
            expected_memory_context_snapshot_checksum: expectedSnapshotChecksum,
            receipt_memory_context_snapshot_checksum: structured?.memory_context_snapshot_checksum || "",
            mentioned,
            usage_state: usageState,
            native_applied: nativeApplied,
            unsafe_native_applied: unsafeNativeApplied,
            pass,
            reason: structured?.reason || "",
        };
    });
    const missing = rows.filter((row) => !row.pass);
    return {
        schema: "ccm-child-agent-api-microcompact-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || missing.length === 0,
        plan_checksums: matching.map((plan) => plan.plan_checksum),
        missing_plan_checksums: rows.filter((row) => !row.mentioned || !row.usage_state).map((row) => row.plan_checksum),
        unsafe_native_applied_plan_checksums: rows.filter((row) => row.unsafe_native_applied).map((row) => row.plan_checksum),
        session_mismatch_plan_checksums: rows.filter((row) => row.session_mismatch).map((row) => row.plan_checksum),
        native_applied_count: rows.filter((row) => row.native_applied && !row.unsafe_native_applied).length,
        advisory_count: rows.filter((row) => row.usage_state === "advisory").length,
        ignored_count: rows.filter((row) => row.usage_state === "ignored" || row.usage_state === "not_supported").length,
        rows,
        declared: structuredRows.length > 0 || used.length > 0 || ignored.length > 0,
        structured_usage_rows: structuredRows,
        used,
        ignored,
    };
}
function extractGlobalAgentMemoryRecallFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.global_agent_memory?.schema === "ccm-child-global-agent-memory-recall-v1")
        return value.global_agent_memory;
    if (value.globalAgentMemory?.schema === "ccm-child-global-agent-memory-recall-v1")
        return value.globalAgentMemory;
    if (value.memory?.global_agent_memory?.schema === "ccm-child-global-agent-memory-recall-v1")
        return value.memory.global_agent_memory;
    if (value.memory?.globalAgentMemory?.schema === "ccm-child-global-agent-memory-recall-v1")
        return value.memory.globalAgentMemory;
    if (value.group_memory?.global_agent_memory?.schema === "ccm-child-global-agent-memory-recall-v1")
        return value.group_memory.global_agent_memory;
    if (value.groupMemory?.globalAgentMemory?.schema === "ccm-child-global-agent-memory-recall-v1")
        return value.groupMemory.globalAgentMemory;
    if (value.references?.memory_context)
        return extractGlobalAgentMemoryRecallFromValue(value.references.memory_context);
    if (value.references?.memoryContext)
        return extractGlobalAgentMemoryRecallFromValue(value.references.memoryContext);
    if (value.worker_context_packet)
        return extractGlobalAgentMemoryRecallFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractGlobalAgentMemoryRecallFromValue(value.workerContextPacket);
    if (value.memory)
        return extractGlobalAgentMemoryRecallFromValue(value.memory);
    if (value.group_memory)
        return extractGlobalAgentMemoryRecallFromValue(value.group_memory);
    return null;
}
// ===== merged from collaboration-memory-gates-part-01-part-02.ts =====
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
function collectTaskGlobalMemoryReceiptGates(task = {}, context = {}) {
    const gates = new Map();
    const addRecall = (value, source = "", fallbackAgent = "") => {
        const recall = extractGlobalAgentMemoryRecallFromValue(value);
        if (!recall?.schema)
            return;
        const items = (Array.isArray(recall.items) ? recall.items : [])
            .filter((item) => item?.id || item?.globalMemoryId || item?.global_memory_id)
            .slice(0, 20);
        if (!items.length)
            return;
        const targetProject = String(value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
        const itemRows = items.map((item) => {
            const arbitration = item.arbitration || {};
            const semanticRisk = arbitration.semanticRisk || {};
            const cross = item.crossGroupSuppression || arbitration.crossGroupSuppression || {};
            const freshness = cross.freshness || {};
            const semanticRiskScore = Number(arbitration.semanticRiskScore || semanticRisk.score || 0);
            const crossSuppression = cross.suppressed === true
                ? "background_only"
                : cross.advisory === true
                    ? "advisory"
                    : "";
            const risky = arbitration.demoted === true
                || arbitration.conflict === true
                || semanticRiskScore >= 60
                || cross.suppressed === true
                || cross.advisory === true;
            return {
                global_memory_id: String(item.id || item.globalMemoryId || item.global_memory_id || "").trim(),
                type: item.type || "memory",
                status: arbitration.status || "active_global_context",
                action: arbitration.action || "",
                demoted: arbitration.demoted === true,
                conflict: arbitration.conflict === true,
                semantic_risk_score: semanticRiskScore,
                semantic_risk_level: semanticRisk.level || (semanticRiskScore >= 80 ? "high" : semanticRiskScore >= 60 ? "medium" : semanticRiskScore > 0 ? "low" : "none"),
                semantic_reasons: Array.isArray(arbitration.semanticReasons) ? arbitration.semanticReasons.slice(0, 8) : (semanticRisk.reasons || []).slice?.(0, 8) || [],
                cross_group_suppression: crossSuppression,
                cross_group_reason: cross.reason || "",
                cross_group_superseded: freshness.supersededByNewerGlobalMemory === true,
                cross_group_decayed: freshness.decayedToAdvisory === true,
                requires_current_source_verification: risky,
                requires_background_only: cross.suppressed === true || arbitration.demoted === true || arbitration.conflict === true,
            };
        }).filter((item) => item.global_memory_id);
        if (!itemRows.length)
            return;
        const gateId = `gmr:${crypto.createHash("sha256").update([targetProject, source, itemRows.map((item) => item.global_memory_id).join("|")].join("\0")).digest("hex").slice(0, 14)}`;
        gates.set(gateId, {
            schema: "ccm-child-agent-global-memory-receipt-gate-v1",
            gate_id: gateId,
            target_project: targetProject,
            source,
            item_count: itemRows.length,
            risky_count: itemRows.filter((item) => item.requires_current_source_verification).length,
            required_global_memory_ids: itemRows.map((item) => item.global_memory_id),
            items: itemRows,
            raw: recall,
        });
    };
    addRecall(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addRecall(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addRecall(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addRecall(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addRecall(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addRecall);
    addRecall(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function extractGlobalMemoryHealthGateFromValue(value) {
    if (!value || typeof value !== "object")
        return null;
    if (value.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.global_memory_health_gate;
    if (value.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.globalMemoryHealthGate;
    if (value.global_agent_memory?.memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.global_agent_memory.memory_health_gate;
    if (value.globalAgentMemory?.memoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.globalAgentMemory.memoryHealthGate;
    if (value.references?.global_memory_health_gate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.references.global_memory_health_gate;
    if (value.references?.globalMemoryHealthGate?.schema === "ccm-child-global-agent-memory-health-gate-v1")
        return value.references.globalMemoryHealthGate;
    if (value.references?.memory_context)
        return extractGlobalMemoryHealthGateFromValue(value.references.memory_context);
    if (value.references?.memoryContext)
        return extractGlobalMemoryHealthGateFromValue(value.references.memoryContext);
    if (value.worker_context_packet)
        return extractGlobalMemoryHealthGateFromValue(value.worker_context_packet);
    if (value.workerContextPacket)
        return extractGlobalMemoryHealthGateFromValue(value.workerContextPacket);
    if (value.memory)
        return extractGlobalMemoryHealthGateFromValue(value.memory);
    if (value.group_memory)
        return extractGlobalMemoryHealthGateFromValue(value.group_memory);
    return null;
}
function collectTaskGlobalMemoryHealthGates(task = {}, context = {}) {
    const gates = new Map();
    const addGate = (value, source = "", fallbackAgent = "") => {
        const gate = extractGlobalMemoryHealthGateFromValue(value);
        if (!gate?.schema)
            return;
        const gateId = String(gate.gate_id || gate.gateId || "").trim();
        if (!gateId)
            return;
        const targetProject = String(gate.target_project || gate.targetProject || value?.target_project || value?.targetProject || value?.memory?.target_project || fallbackAgent || task?.target_project || "").trim();
        const existing = gates.get(gateId) || {};
        gates.set(gateId, {
            ...existing,
            schema: "ccm-child-agent-global-memory-health-gate-receipt-gate-v1",
            gate_id: gateId,
            target_project: targetProject || existing.target_project || "",
            group_id: gate.group_id || gate.groupId || existing.group_id || "",
            status: gate.status || existing.status || "unknown",
            action: gate.action || existing.action || "",
            pass: gate.pass === true,
            active_contamination_count: Number(gate.active_contamination_count || gate.activeContaminationCount || existing.active_contamination_count || 0),
            residue_contamination_count: Number(gate.residue_contamination_count || gate.residueContaminationCount || existing.residue_contamination_count || 0),
            selftest_bypass: gate.selftest_bypass === true || gate.selftestBypass === true || existing.selftest_bypass === true,
            fail_blocks_global_memory_recall: gate.policy?.fail_blocks_global_memory_recall !== false,
            required_action: gate.status === "fail" || gate.action === "block_global_agent_memory_recall"
                ? "must_ignore_global_agent_memory_and_reference_gate"
                : gate.status === "warn"
                    ? "must_ack_residue_warning_before_global_memory_use"
                    : "must_ack_health_gate",
            source: source || existing.source || "",
            raw: gate,
        });
    };
    addGate(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addGate(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addGate(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addGate(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addGate(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addGate(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addGate);
    addGate(context.execution, "execution", task?.target_project);
    return [...gates.values()];
}
function extractTypedMemoryRecallFromValue(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 6)
        return null;
    if (value.schema === "ccm-group-typed-memory-recall-v1")
        return value;
    const candidates = [
        value.group_state?.typedMemory?.recall,
        value.group_state?.typed_memory?.recall,
        value.groupState?.typedMemory?.recall,
        value.groupState?.typed_memory?.recall,
        value.typedMemory?.recall,
        value.typed_memory?.recall,
        value.typedMemoryRecall,
        value.typed_memory_recall,
        value.recall,
    ];
    for (const candidate of candidates) {
        if (candidate?.schema === "ccm-group-typed-memory-recall-v1")
            return candidate;
    }
    return extractTypedMemoryRecallFromValue(value.memory, depth + 1)
        || extractTypedMemoryRecallFromValue(value.group_memory, depth + 1)
        || extractTypedMemoryRecallFromValue(value.groupMemory, depth + 1)
        || extractTypedMemoryRecallFromValue(value.worker_context_packet, depth + 1)
        || extractTypedMemoryRecallFromValue(value.workerContextPacket, depth + 1)
        || extractTypedMemoryRecallFromValue(value.references?.memory_context, depth + 1)
        || extractTypedMemoryRecallFromValue(value.references?.memoryContext, depth + 1);
}
function collectTaskTypedMemoryPressureRecallDocs(task = {}, context = {}) {
    const docs = new Map();
    const addRecall = (value, source = "", fallbackAgent = "") => {
        const recall = extractTypedMemoryRecallFromValue(value);
        if (!recall?.schema)
            return;
        const scoring = recall.workerContextPressureScoring || recall.worker_context_pressure_scoring || {};
        const recalled = Array.isArray(recall.recalled) ? recall.recalled : [];
        const targetProject = String(value?.target_project
            || value?.targetProject
            || value?.project
            || value?.memory?.target_project
            || value?.memory?.targetProject
            || fallbackAgent
            || task?.target_project
            || "").trim();
        for (const doc of recalled) {
            const pressure = doc.workerContextPressureRecall || doc.worker_context_pressure_recall || {};
            const adjustment = Number(pressure.adjustment || 0);
            if (adjustment <= 0 && scoring.active !== true)
                continue;
            const relPath = String(doc.relPath || doc.rel_path || "").trim();
            if (!relPath)
                continue;
            const key = `${targetProject.toLowerCase()}|${relPath.toLowerCase()}`;
            const existing = docs.get(key) || {};
            docs.set(key, {
                ...existing,
                schema: "ccm-task-typed-memory-pressure-recall-doc-v1",
                group_id: task?.group_id || task?.groupId || value?.group_id || value?.groupId || existing.group_id || "",
                target_project: targetProject || existing.target_project || "",
                rel_path: relPath,
                name: doc.name || existing.name || "",
                type: doc.type || existing.type || "",
                source: doc.source || existing.source || "",
                score: Number(doc.score || existing.score || 0),
                pressure_adjustment: Math.max(Number(existing.pressure_adjustment || 0), adjustment),
                pressure_status: pressure.pressure_status || scoring.pressure_status || existing.pressure_status || "",
                kinds: (0, collaboration_1.uniqueStrings)([...(Array.isArray(existing.kinds) ? existing.kinds : []), ...(Array.isArray(pressure.kinds) ? pressure.kinds : [])]).slice(0, 12),
                source_ref: source || existing.source_ref || "",
                raw: doc,
            });
        }
    };
    addRecall(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addRecall(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addRecall(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addRecall(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addRecall(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addRecall);
    addRecall(context.execution, "execution", task?.target_project);
    return [...docs.values()];
}
// ===== merged from collaboration-memory-gates-part-02-part-01.ts =====
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
function collectTaskTypedMemoryRecallDocs(task = {}, context = {}) {
    const docs = new Map();
    const addRecall = (value, source = "", fallbackAgent = "") => {
        const recall = extractTypedMemoryRecallFromValue(value);
        if (!recall?.schema || recall.ignored === true)
            return;
        const recalled = Array.isArray(recall.recalled) ? recall.recalled : [];
        const targetProject = String(value?.target_project
            || value?.targetProject
            || value?.project
            || value?.memory?.target_project
            || value?.memory?.targetProject
            || fallbackAgent
            || task?.target_project
            || "").trim();
        for (const doc of recalled) {
            const relPath = String(doc.relPath || doc.rel_path || "").trim();
            const documentChecksum = String(doc.checksum || doc.document_checksum || doc.documentChecksum || "").trim();
            if (!relPath || !documentChecksum)
                continue;
            const semantic = doc.semanticReference || doc.semantic_reference || {};
            const freshness = doc.freshness || {};
            const key = `${targetProject.toLowerCase()}|${relPath.toLowerCase()}|${documentChecksum}`;
            docs.set(key, {
                schema: "ccm-task-typed-memory-recall-doc-v1",
                group_id: task?.group_id || task?.groupId || value?.group_id || value?.groupId || "",
                group_session_id: task?.group_session_id || task?.groupSessionId || value?.group_session_id || value?.groupSessionId || value?.memory?.group_session_id || value?.memory?.groupSessionId || "",
                target_project: targetProject,
                rel_path: relPath,
                name: String(doc.name || ""),
                type: String(doc.type || ""),
                document_checksum: documentChecksum,
                score: Number(doc.score || 0),
                memory_age_days: Math.max(0, Number(freshness.age_days || freshness.ageDays || 0)),
                memory_age_label: String(freshness.age_label || freshness.ageLabel || "today"),
                memory_stale: freshness.stale === true,
                memory_freshness_checksum: String(recall.memoryFreshness?.checksum || recall.memory_freshness?.checksum || ""),
                current_source_verification_required: freshness.current_source_verification_required !== false,
                query_concepts: Array.isArray(semantic.queryConcepts) ? semantic.queryConcepts.slice(0, 24) : [],
                query_polarities: Array.isArray(semantic.queryPolarities) ? semantic.queryPolarities.slice(0, 12) : [],
                query_relations: Array.isArray(semantic.queryRelations) ? semantic.queryRelations.slice(0, 12) : [],
                source_ref: source,
            });
        }
    };
    addRecall(task?.mission_handoff || task?.missionHandoff, "task.mission_handoff", task?.target_project);
    addRecall(task?.worker_context_packet || task?.workerContextPacket, "task.worker_context_packet", task?.target_project);
    for (const event of Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []) {
        addRecall(event?.data?.worker_context_packet || event?.data?.workerContextPacket, `timeline:${event?.type || "event"}`, event?.agent || task?.target_project);
        addRecall(event?.data?.worker_handoff || event?.data?.workerHandoff, `timeline:${event?.type || "event"}:handoff`, event?.agent || task?.target_project);
    }
    for (const item of Array.isArray(context.assignmentEvidence || context.assignment_evidence) ? (context.assignmentEvidence || context.assignment_evidence) : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, `assignment:${item?.source || "unknown"}`, item?.project || task?.target_project);
        addRecall(item?.worker_handoff || item?.workerHandoff, `assignment:${item?.source || "unknown"}:handoff`, item?.project || task?.target_project);
    }
    for (const item of Array.isArray(context.assignments) ? context.assignments : []) {
        addRecall(item?.worker_context_packet || item?.workerContextPacket, "execution.assignment", item?.project || item?.targetName || task?.target_project);
    }
    forEachTaskAgentMemoryContextSnapshotSource(context, addRecall);
    addRecall(context.execution, "execution", task?.target_project);
    return [...docs.values()];
}
function collectReceiptTypedMemoryUsageRows(receipt = {}) {
    const rows = Array.isArray(receipt.typedMemoryUsage || receipt.typed_memory_usage)
        ? (receipt.typedMemoryUsage || receipt.typed_memory_usage)
        : [];
    return rows.map((row) => ({
        rel_path: String(row.relPath || row.rel_path || row.path || "").trim(),
        usage_state: normalizeTypedMemoryPressureUsageState(row.usageState || row.usage_state || row.status || row.state || ""),
        current_source_verified: row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true,
        current_source_evidence: row.currentSourceEvidence || row.current_source_evidence || null,
        reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 500),
        conflict_detected: row.conflictDetected === true || row.conflict_detected === true,
        conflict_kind: String(row.conflictKind || row.conflict_kind || "").trim().toLowerCase(),
        recommended_memory_action: String(row.recommendedMemoryAction || row.recommended_memory_action || "").trim().toLowerCase(),
        conflict_reason: (0, memory_1.compactMemoryText)(row.conflictReason || row.conflict_reason || "", 1200),
        replacement_memory: (0, memory_1.compactMemoryText)(row.replacementMemory || row.replacement_memory || "", 12_000),
    })).filter((row) => row.rel_path && row.usage_state).slice(0, 120);
}
function configuredProjectWorkDir(project) {
    const target = String(project || "").trim().toLowerCase();
    if (!target)
        return "";
    try {
        const config = (0, db_1.getConfigs)().find((item) => String(item?.name || "").trim().toLowerCase() === target);
        return String(config ? (0, db_1.getConfigInfo)(config.path)?.[0]?.workDir || "" : "").trim();
    }
    catch {
        return "";
    }
}
function verifyTypedMemoryCurrentSourceEvidence(evidence = null, project = "", context = {}) {
    const sourcePath = String(evidence?.sourcePath || evidence?.source_path || evidence?.path || "").trim();
    const claimedChecksum = String(evidence?.sourceChecksum || evidence?.source_checksum || evidence?.sha256 || evidence?.checksum || "").trim().toLowerCase();
    const evidenceType = String(evidence?.evidenceType || evidence?.evidence_type || evidence?.type || "file_read").trim().toLowerCase();
    const explicitWorkDir = String(context.projectWorkDir || context.project_work_dir
        || context.projectWorkDirs?.[project] || context.project_work_dirs?.[project] || "").trim();
    const workDir = explicitWorkDir || configuredProjectWorkDir(project);
    const base = {
        schema: "ccm-typed-memory-current-source-file-proof-v1",
        valid: false,
        status: "missing_proof",
        evidence_type: evidenceType,
        relative_path: "",
        claimed_checksum: claimedChecksum,
        observed_checksum: "",
        proof_id: "",
    };
    if (!sourcePath || !claimedChecksum)
        return base;
    if (evidenceType !== "file_read")
        return { ...base, status: "unsupported_evidence_type" };
    if (!/^[a-f0-9]{64}$/.test(claimedChecksum))
        return { ...base, status: "invalid_claimed_checksum" };
    if (!workDir || !fs.existsSync(workDir))
        return { ...base, status: "project_workdir_unavailable" };
    try {
        const realRoot = fs.realpathSync(path.resolve(workDir));
        const requested = path.isAbsolute(sourcePath) ? path.resolve(sourcePath) : path.resolve(realRoot, sourcePath);
        if (!fs.existsSync(requested))
            return { ...base, status: "source_missing" };
        const realFile = fs.realpathSync(requested);
        const rootPrefix = `${realRoot}${path.sep}`.toLowerCase();
        if (realFile.toLowerCase() !== realRoot.toLowerCase() && !realFile.toLowerCase().startsWith(rootPrefix)) {
            return { ...base, status: "source_outside_project" };
        }
        const stat = fs.statSync(realFile);
        if (!stat.isFile())
            return { ...base, status: "source_not_file" };
        if (stat.size > 16 * 1024 * 1024)
            return { ...base, status: "source_too_large" };
        const observedChecksum = crypto.createHash("sha256").update(fs.readFileSync(realFile)).digest("hex");
        const relativePath = path.relative(realRoot, realFile).replace(/\\/g, "/") || path.basename(realFile);
        const valid = observedChecksum === claimedChecksum;
        return {
            ...base,
            valid,
            status: valid ? "system_file_checksum_match" : "source_checksum_mismatch",
            relative_path: relativePath,
            observed_checksum: observedChecksum,
            proof_id: valid ? `tmcp_${crypto.createHash("sha256").update(JSON.stringify([project, relativePath, observedChecksum])).digest("hex").slice(0, 28)}` : "",
        };
    }
    catch {
        return { ...base, status: "source_read_failed" };
    }
}
function typedMemoryUsageStateFromReceipt(doc, receipt = {}, context = {}) {
    const relPath = String(doc.rel_path || "");
    const name = String(doc.name || "");
    const structured = collectReceiptTypedMemoryUsageRows(receipt).find((row) => String(row.rel_path || "").toLowerCase() === relPath.toLowerCase());
    const usedRows = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignoredRows = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const usedText = usedRows.map((item) => String(item || "")).join("\n");
    const ignoredText = ignoredRows.map((item) => String(item || "")).join("\n");
    const refs = (0, collaboration_1.uniqueStrings)(relPath, name, relPath ? path.basename(relPath) : "").filter(Boolean);
    const cites = (text) => refs.some((ref) => text.toLowerCase().includes(ref.toLowerCase()));
    if (structured) {
        const claimedState = structured.current_source_verified && structured.usage_state === "used" ? "verified" : structured.usage_state;
        const currentSourceProof = verifyTypedMemoryCurrentSourceEvidence(structured.current_source_evidence, String(doc.target_project || receipt.agent || receipt.project || ""), context);
        const state = claimedState === "verified" && currentSourceProof.valid !== true ? "used" : claimedState;
        return {
            usage_state: state,
            claimed_usage_state: claimedState,
            current_source_verified: state === "verified" && currentSourceProof.valid === true,
            current_source_proof: currentSourceProof,
            direct_reference: true,
            evidence_tier: currentSourceProof.valid === true && state === "verified" ? "system_current_source_file_proof" : "bound_structured_receipt",
            evidence_confidence: currentSourceProof.valid === true && state === "verified" ? 1 : 0.75,
            anomaly_codes: claimedState === "verified" && state !== "verified" ? ["verified_without_system_current_source_proof"] : [],
            reason: structured.reason || "typedMemoryUsage cites surfaced relPath",
            conflict_detected: structured.conflict_detected === true,
            conflict_kind: structured.conflict_kind,
            recommended_memory_action: structured.recommended_memory_action,
            conflict_reason: structured.conflict_reason,
            replacement_memory: structured.replacement_memory,
        };
    }
    if (cites(ignoredText))
        return { usage_state: "ignored", claimed_usage_state: "ignored", current_source_verified: false, current_source_proof: null, direct_reference: true, evidence_tier: "bound_text_receipt", evidence_confidence: 0.5, anomaly_codes: [], reason: "memoryIgnored cites surfaced relPath" };
    if (cites(usedText)) {
        const verified = /verified|validated|checked|current source|re-read|当前源|当前文件|最新源|重读|核验|验证|检查/i.test(usedText);
        return { usage_state: "used", claimed_usage_state: verified ? "verified" : "used", current_source_verified: false, current_source_proof: null, direct_reference: true, evidence_tier: "bound_text_receipt", evidence_confidence: 0.5, anomaly_codes: verified ? ["verified_without_structured_current_source_proof"] : [], reason: "memoryUsed cites surfaced relPath" };
    }
    return { usage_state: "mentioned", claimed_usage_state: "mentioned", current_source_verified: false, current_source_proof: null, direct_reference: false, evidence_tier: "snapshot_surfaced_only", evidence_confidence: 0.25, anomaly_codes: [], reason: "surfaced typed memory missing per-relPath receipt declaration" };
}
function collectTaskTypedMemoryConsumptionRows(task = {}, receipts = [], context = {}) {
    const docs = collectTaskTypedMemoryRecallDocs(task, context);
    if (!docs.length)
        return [];
    const providerEvidenceRows = Array.isArray(context.providerToolAccessEvidence || context.provider_tool_access_evidence)
        ? (context.providerToolAccessEvidence || context.provider_tool_access_evidence)
        : [];
    const receiptCandidates = Array.isArray(receipts) ? receipts : [];
    const accessFor = (doc, snapshot, currentSourceProof = {}) => {
        const expected = {
            groupId: doc.group_id || task?.group_id || task?.groupId || "",
            groupSessionId: doc.group_session_id || task?.group_session_id || task?.groupSessionId || "",
            taskId: task?.id || "",
            executionId: snapshot.execution_id || snapshot.executionId || "",
            taskAgentSessionId: snapshot.task_agent_session_id || snapshot.taskAgentSessionId || "",
        };
        const evidence = providerEvidenceRows.find((candidate) => (0, provider_tool_access_evidence_1.verifyProviderToolAccessEvidence)(candidate, expected).valid === true) || null;
        const match = evidence ? (0, provider_tool_access_evidence_1.matchProviderToolAccessEvidence)(evidence, [
            doc.rel_path,
            doc.name,
            currentSourceProof.relative_path,
        ].filter(Boolean)) : { matched: false, eventCount: 0, events: [] };
        return {
            access_state: match.matched ? "read_observed" : evidence?.captureStatus === "observed" ? "no_matching_read_observed" : String(evidence?.captureStatus || "capture_missing"),
            access_event_count: Number(match.eventCount || 0),
            access_evidence_checksum: String(evidence?.checksum || ""),
            access_event_checksums: (Array.isArray(match.events) ? match.events : []).map((event) => String(event.eventChecksum || "")).filter(Boolean).slice(0, 20),
            access_capture_status: String(evidence?.captureStatus || "capture_missing"),
            access_evidence_valid: !!evidence,
        };
    };
    const claimedRows = receiptCandidates.flatMap((receipt) => {
        const validation = evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt, context);
        const validSnapshot = Array.isArray(validation.rows) ? validation.rows.find((row) => row.pass === true) : null;
        if (validation.required !== true || validation.pass !== true || !validSnapshot)
            return [];
        const expectedGroupId = String(task?.group_id || task?.groupId || "").trim();
        const expectedGroupSessionId = String(task?.group_session_id || task?.groupSessionId || "default").trim();
        if (String(validSnapshot.group_id || "").trim() !== expectedGroupId
            || String(validSnapshot.group_session_id || "default").trim() !== expectedGroupSessionId)
            return [];
        const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
        const matchingDocs = docs.filter((doc) => {
            const target = normalizeMemoryGateAgent(doc.target_project);
            return !target || !agent || target === agent;
        });
        const receiptEvidenceChecksum = crypto.createHash("sha256").update(JSON.stringify({
            typedMemoryUsage: receipt.typedMemoryUsage || receipt.typed_memory_usage || [],
            memoryUsed: receipt.memoryUsed || receipt.memory_used || [],
            memoryIgnored: receipt.memoryIgnored || receipt.memory_ignored || [],
            memoryContextUsage: receipt.memoryContextUsage || receipt.memory_context_usage || receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || null,
        })).digest("hex");
        return matchingDocs.map((doc) => {
            const usage = typedMemoryUsageStateFromReceipt(doc, receipt, context);
            const currentSourceProof = usage.current_source_proof || {};
            const access = accessFor(doc, {
                ...validSnapshot,
                execution_id: receipt.execution_id || receipt.executionId || context.execution?.id || context.execution?.execution_id || "",
            }, currentSourceProof);
            return {
                ...doc,
                agent: receipt.agent || receipt.project || doc.target_project || "",
                agent_type: validSnapshot.agent_type || validSnapshot.runtime || "",
                task_id: task?.id || "",
                execution_id: receipt.execution_id || receipt.executionId || context.execution?.id || context.execution?.execution_id || "",
                task_agent_session_id: validSnapshot.task_agent_session_id || "",
                memory_context_snapshot_id: validSnapshot.snapshot_id || "",
                memory_context_snapshot_checksum: validSnapshot.checksum || "",
                delivery_receipt_checksum: validSnapshot.delivery_receipt?.checksum || "",
                model_context_loaded: validSnapshot.memory_context_consumption_receipt_valid === true,
                model_context_consumption_challenge_id: validSnapshot.memory_context_consumption_challenge_id || "",
                model_context_consumption_receipt_signature: validSnapshot.memory_context_consumption_receipt_signature || "",
                usage_state: usage.usage_state,
                claimed_usage_state: usage.claimed_usage_state,
                current_source_verified: usage.current_source_verified === true,
                current_source_proof_valid: currentSourceProof.valid === true,
                current_source_relative_path: currentSourceProof.relative_path || "",
                current_source_claimed_checksum: currentSourceProof.claimed_checksum || "",
                current_source_observed_checksum: currentSourceProof.observed_checksum || "",
                current_source_proof_id: currentSourceProof.proof_id || "",
                verification_status: currentSourceProof.status || (usage.claimed_usage_state === "verified" ? "missing_proof" : "not_requested"),
                evidence_tier: usage.evidence_tier,
                evidence_confidence: usage.evidence_confidence,
                anomaly_codes: usage.anomaly_codes || [],
                direct_reference: usage.direct_reference === true,
                reason: usage.reason,
                conflict_detected: usage.conflict_detected === true,
                conflict_kind: usage.conflict_kind || "",
                recommended_memory_action: usage.recommended_memory_action || "",
                conflict_reason: usage.conflict_reason || "",
                replacement_memory: usage.replacement_memory || "",
                evidence_valid: true,
                receipt_evidence_checksum: receiptEvidenceChecksum,
                lifecycle_state: usage.usage_state === "ignored" ? "ignored" : usage.usage_state === "verified" ? "verified" : usage.usage_state === "used" ? "used" : "delivered_unreported",
                delivery_state: "delivered",
                ...access,
                memory_used: receipt.memoryUsed || receipt.memory_used || [],
                memory_ignored: receipt.memoryIgnored || receipt.memory_ignored || [],
                typed_memory_usage: receipt.typedMemoryUsage || receipt.typed_memory_usage || [],
            };
        });
    }).slice(0, 320);
    const claimedObservationKeys = new Set(claimedRows.map((row) => [
        row.task_agent_session_id,
        row.memory_context_snapshot_id,
        String(row.rel_path || "").toLowerCase(),
        row.document_checksum,
    ].join("|")));
    const deliveryRows = getTaskAgentMemoryContextSnapshotSources(context)
        .map(summarizeTaskAgentMemoryContextSnapshot)
        .filter((snapshot) => snapshot.memory_context_delivered === true && snapshot.delivery_receipt_checksum_valid === true)
        .flatMap((snapshot) => {
        const expectedGroupId = String(task?.group_id || task?.groupId || "").trim();
        const expectedGroupSessionId = String(task?.group_session_id || task?.groupSessionId || "default").trim();
        if (String(snapshot.group_id || "").trim() !== expectedGroupId
            || String(snapshot.group_session_id || "default").trim() !== expectedGroupSessionId)
            return [];
        const target = normalizeMemoryGateAgent(snapshot.project || task?.target_project);
        const hasMatchingReceiptCandidate = receiptCandidates.some((receipt) => {
            const receiptTarget = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
            return !target || !receiptTarget || target === receiptTarget;
        });
        if (hasMatchingReceiptCandidate)
            return [];
        return docs.filter((doc) => {
            const docTarget = normalizeMemoryGateAgent(doc.target_project);
            return !docTarget || !target || docTarget === target;
        }).flatMap((doc) => {
            const key = [snapshot.task_agent_session_id, snapshot.snapshot_id, String(doc.rel_path || "").toLowerCase(), doc.document_checksum].join("|");
            if (claimedObservationKeys.has(key))
                return [];
            const deliveryReceipt = snapshot.delivery_receipt || {};
            const access = accessFor(doc, {
                ...snapshot,
                execution_id: deliveryReceipt.executionId || deliveryReceipt.execution_id || "",
            });
            const modelContextLoaded = snapshot.memory_context_consumption_receipt_valid === true;
            return [{
                    ...doc,
                    agent: snapshot.project || doc.target_project || "",
                    agent_type: snapshot.agent_type || "",
                    task_id: task?.id || "",
                    execution_id: deliveryReceipt.executionId || deliveryReceipt.execution_id || "",
                    task_agent_session_id: snapshot.task_agent_session_id || "",
                    memory_context_snapshot_id: snapshot.snapshot_id || "",
                    memory_context_snapshot_checksum: snapshot.checksum || "",
                    delivery_receipt_checksum: deliveryReceipt.checksum || "",
                    usage_state: "mentioned",
                    claimed_usage_state: "mentioned",
                    lifecycle_state: modelContextLoaded ? "loaded_unreported" : "delivered_unreported",
                    delivery_state: modelContextLoaded ? "model_loaded" : "delivered",
                    current_source_verified: false,
                    current_source_proof_valid: false,
                    verification_status: "not_reported",
                    evidence_tier: modelContextLoaded ? "model_mcp_load_receipt" : "system_delivery_receipt",
                    evidence_confidence: modelContextLoaded ? 0.55 : 0.35,
                    anomaly_codes: [modelContextLoaded ? "typed_memory_loaded_usage_unreported" : "typed_memory_usage_unreported"],
                    direct_reference: false,
                    reason: modelContextLoaded
                        ? "the Provider model acknowledged loading the exact trusted memory context, but no per-document semantic usage receipt was recorded"
                        : "typed memory was delivered to the exact task session but no valid bound usage receipt was recorded",
                    evidence_valid: true,
                    receipt_evidence_checksum: crypto.createHash("sha256").update(JSON.stringify([deliveryReceipt.checksum || "", "delivered_unreported"])).digest("hex"),
                    ...access,
                    model_context_loaded: modelContextLoaded,
                    model_context_consumption_challenge_id: snapshot.memory_context_consumption_challenge_id || "",
                    model_context_consumption_receipt_signature: snapshot.memory_context_consumption_receipt_signature || "",
                    memory_used: [],
                    memory_ignored: [],
                    typed_memory_usage: [],
                }];
        });
    });
    return [...claimedRows, ...deliveryRows].slice(0, 320);
}
function normalizeTypedMemoryPressureUsageState(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/verified|validated|checked|current_source_verified|current source|re-read|核验|验证|当前源|已检查/.test(text))
        return "verified";
    if (/ignored|ignore|skip|unused|not_used|未使用|不使用|忽略|跳过/.test(text))
        return "ignored";
    if (/used|use|applied|referenced|consumed|使用|采用|应用|引用|参考/.test(text))
        return "used";
    if (/mentioned|surfaced|shown|presented|提及|出现|下发/.test(text))
        return "mentioned";
    return text;
}
// ===== merged from collaboration-memory-gates-part-02-part-02.ts =====
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
function typedMemoryPressureRecallDocRefs(doc = {}) {
    return (0, collaboration_1.uniqueStrings)([
        doc.rel_path,
        doc.relPath,
        doc.name,
        doc.rel_path ? path.basename(String(doc.rel_path)) : "",
    ].filter(Boolean)).slice(0, 8);
}
function collectReceiptMemoryProvenanceUsageRows(receipt = {}) {
    const rows = Array.isArray(receipt.memoryProvenanceUsage || receipt.memory_provenance_usage)
        ? (receipt.memoryProvenanceUsage || receipt.memory_provenance_usage)
        : [];
    return rows.map((row) => ({
        rel_path: String(row.relPath || row.rel_path || row.memoryRelPath || row.memory_rel_path || row.path || "").trim(),
        name: String(row.name || row.memoryName || row.memory_name || row.title || "").trim(),
        usage_state: normalizeTypedMemoryPressureUsageState(row.usageState || row.usage_state || row.status || row.state || ""),
        provenance_status: String(row.provenanceStatus || row.provenance_status || row.trustState || row.trust_state || "").trim().toLowerCase(),
        repair_work_item_id: String(row.repairWorkItemId || row.repair_work_item_id || row.workItemId || row.work_item_id || "").trim(),
        repair_status: String(row.repairStatus || row.repair_status || "").trim().toLowerCase(),
        repair_gap_type: String(row.repairGapType || row.repair_gap_type || row.gapType || row.gap_type || "").trim(),
        current_source_verified: row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true,
        reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 500),
    })).filter((row) => row.rel_path || row.name || row.usage_state || row.provenance_status || row.repair_work_item_id || row.reason).slice(0, 80);
}
function pressureRecallUsageStateFromReceipt(doc = {}, receipt = {}) {
    const structuredRows = collectReceiptMemoryProvenanceUsageRows(receipt);
    const usedText = (Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : []).map((item) => String(item || "")).join("\n");
    const ignoredText = (Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : []).map((item) => String(item || "")).join("\n");
    const allText = [usedText, ignoredText, receipt.summary, ...(Array.isArray(receipt.verification) ? receipt.verification : [])].map((item) => String(item || "")).join("\n");
    const refs = typedMemoryPressureRecallDocRefs(doc);
    const hasRef = (source) => refs.some(ref => source.toLowerCase().includes(String(ref || "").toLowerCase()));
    const structured = structuredRows.find((row) => {
        const rowRefs = typedMemoryPressureRecallDocRefs(row);
        return rowRefs.some(rowRef => refs.some(ref => String(ref || "").toLowerCase() === String(rowRef || "").toLowerCase()));
    });
    if (structured?.usage_state) {
        const usageState = structured.current_source_verified && structured.usage_state === "used" ? "verified" : structured.usage_state;
        return {
            usage_state: ["used", "verified", "ignored", "mentioned"].includes(usageState) ? usageState : "mentioned",
            referenced: true,
            direct_reference: !!(structured.rel_path || structured.name),
            provenance_status: structured.provenance_status || "",
            repair_status: structured.repair_status || "",
            repair_work_item_id: structured.repair_work_item_id || "",
            repair_gap_type: structured.repair_gap_type || "",
            current_source_verified: structured.current_source_verified === true,
            reason: structured.reason || "memoryProvenanceUsage cites pressure typed memory",
        };
    }
    const usedRef = hasRef(usedText);
    const ignoredRef = hasRef(ignoredText);
    const allPressureUsed = /pressure recall|上下文压力召回|typed memory.*pressure|压力.*typed/i.test(usedText);
    const allPressureIgnored = /pressure recall|上下文压力召回|typed memory.*pressure|压力.*typed/i.test(ignoredText);
    if (ignoredRef || allPressureIgnored) {
        return {
            usage_state: "ignored",
            referenced: ignoredRef || allPressureIgnored,
            direct_reference: ignoredRef,
            reason: ignoredRef ? "memoryIgnored cites pressure typed memory" : "memoryIgnored cites pressure recall generically",
        };
    }
    if (usedRef || allPressureUsed) {
        const localText = usedRef ? usedText : allText;
        const verified = /verified|validated|checked|current source|re-read|当前源|当前文件|最新源|重读|核验|验证|检查/.test(localText);
        return {
            usage_state: verified ? "verified" : "used",
            referenced: usedRef || allPressureUsed,
            direct_reference: usedRef,
            reason: usedRef ? "memoryUsed cites pressure typed memory" : "memoryUsed cites pressure recall generically",
        };
    }
    return {
        usage_state: "mentioned",
        referenced: false,
        direct_reference: false,
        reason: "pressure typed memory surfaced but receipt did not cite relPath/name",
    };
}
function collectTaskTypedMemoryPressureRecallUsageRows(task = {}, receipts = [], context = {}) {
    const docs = collectTaskTypedMemoryPressureRecallDocs(task, context);
    if (!docs.length || !Array.isArray(receipts) || !receipts.length)
        return [];
    return receipts.flatMap((receipt) => {
        const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
        const matchingDocs = docs.filter((doc) => {
            const target = normalizeMemoryGateAgent(doc.target_project);
            return !target || !agent || target === agent;
        });
        return matchingDocs.map((doc) => {
            const usage = pressureRecallUsageStateFromReceipt(doc, receipt);
            return {
                ...doc,
                agent: receipt.agent || receipt.project || doc.target_project || "",
                task_id: task?.id || "",
                execution_id: receipt.execution_id || receipt.executionId || context.execution?.id || context.execution?.execution_id || "",
                worker_context_packet_id: receipt.worker_context_packet_id || receipt.workerContextPacketId || "",
                memory_context_snapshot_id: receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "",
                receipt_status: receipt.status || "",
                usage_state: usage.usage_state,
                referenced: usage.referenced,
                direct_reference: usage.direct_reference,
                provenance_status: usage.provenance_status || "",
                repair_status: usage.repair_status || "",
                repair_work_item_id: usage.repair_work_item_id || "",
                repair_gap_type: usage.repair_gap_type || "",
                current_source_verified: usage.current_source_verified === true,
                reason: usage.reason,
            };
        });
    }).slice(0, 160);
}
function normalizeGlobalMemoryUsageState(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/background|background_only|背景|仅作背景/.test(text))
        return "background";
    if (/ignored|ignore|skip|unused|not_used|未使用|不使用|忽略|跳过/.test(text))
        return "ignored";
    if (/verified|validated|checked|current_source_verified|核验|验证|已检查|当前源/.test(text))
        return "verified";
    if (/advisory|advice|参考|提示/.test(text))
        return "advisory";
    if (/used|use|applied|referenced|consumed|使用|采用|应用|引用|参考/.test(text))
        return "used";
    return text;
}
function globalMemoryUsageSnippet(text, id) {
    const source = String(text || "");
    const index = source.toLowerCase().indexOf(String(id || "").toLowerCase());
    if (index < 0)
        return "";
    return source.slice(Math.max(0, index - 90), Math.min(source.length, index + String(id || "").length + 150));
}
function collectReceiptGlobalMemoryUsageRows(receipt = {}) {
    const rows = Array.isArray(receipt.globalMemoryUsage || receipt.global_memory_usage)
        ? (receipt.globalMemoryUsage || receipt.global_memory_usage)
        : [];
    return rows.map((row) => ({
        global_memory_id: String(row.globalMemoryId || row.global_memory_id || row.memoryId || row.memory_id || row.id || "").trim(),
        usage_state: normalizeGlobalMemoryUsageState(row.usageState || row.usage_state || row.status || row.state || ""),
        current_source_verified: row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true,
        semantic_risk_acknowledged: row.semanticRiskAcknowledged === true || row.semantic_risk_acknowledged === true || row.semanticRisk === true || row.semantic_risk === true,
        cross_group_suppression: String(row.crossGroupSuppression || row.cross_group_suppression || row.suppression || "").trim().toLowerCase(),
        reason: (0, memory_1.compactMemoryText)(row.reason || row.note || row.evidence || "", 400),
    })).filter((row) => row.global_memory_id || row.usage_state || row.reason).slice(0, 80);
}
function evaluateReceiptGlobalMemoryUsageGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.globalMemoryReceiptGates || context.global_memory_receipt_gates)
        ? (context.globalMemoryReceiptGates || context.global_memory_receipt_gates)
        : collectTaskGlobalMemoryReceiptGates(task, context);
    const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
    const matching = allGates.filter((gate) => {
        const target = normalizeMemoryGateAgent(gate.target_project);
        return !target || !agent || target === agent;
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredRows = collectReceiptGlobalMemoryUsageRows(receipt);
    const structuredText = structuredRows.map((row) => [
        row.global_memory_id ? `global_memory_id=${row.global_memory_id}` : "",
        row.usage_state ? `usage_state=${row.usage_state}` : "",
        row.current_source_verified ? "current_source_verified=true" : "",
        row.semantic_risk_acknowledged ? "semantic_risk_acknowledged=true" : "",
        row.cross_group_suppression ? `cross_group_suppression=${row.cross_group_suppression}` : "",
        row.reason || "",
    ].filter(Boolean).join("; ")).join("\n");
    const declarationText = [...used, ...ignored, structuredText, receipt.summary, ...(Array.isArray(receipt.verification) ? receipt.verification : [])]
        .map((item) => String(item || ""))
        .join("\n");
    const ignoredText = ignored.map((item) => String(item || "")).join("\n");
    const rows = matching.flatMap((gate) => (Array.isArray(gate.items) ? gate.items : []).map((item) => {
        const id = String(item.global_memory_id || "").trim();
        const structured = structuredRows.find((row) => String(row.global_memory_id || "").trim() === id);
        const snippet = globalMemoryUsageSnippet(declarationText, id);
        const ignoredSnippet = globalMemoryUsageSnippet(ignoredText, id);
        const mentioned = !!structured || !!snippet;
        const rawState = structured?.usage_state || normalizeGlobalMemoryUsageState(ignoredSnippet || snippet);
        const usageState = rawState || (mentioned ? "mentioned" : "missing");
        const structuredEvidenceText = [structured?.reason, structured?.cross_group_suppression, structured?.usage_state].filter(Boolean).join("\n");
        const currentSourceVerified = structured
            ? structured.current_source_verified === true || /(current source verified|verified current source|current source|source verified|current file|latest source|re-read|reread|当前源|当前文件|最新源|重读|重新读取|已核验|已验证|核验当前)/i.test(structuredEvidenceText)
            : /(current source verified|verified current source|current source|source verified|current file|latest source|re-read|reread|当前源|当前文件|最新源|重读|重新读取|已核验|已验证|核验当前)/i.test(snippet);
        const semanticAcknowledged = structured
            ? structured.semantic_risk_acknowledged === true || /semantic[_\s-]?risk|语义风险|semantic|仲裁|conflict|demoted|降权|冲突/i.test(structuredEvidenceText)
            : /semantic[_\s-]?risk|语义风险|semantic|仲裁|conflict|demoted|降权|冲突/i.test(snippet);
        const crossAcknowledged = structured
            ? !!structured.cross_group_suppression || /cross_group_suppression|跨群聊|background_only|advisory|background|仅作背景|背景/i.test(structuredEvidenceText)
            : /cross_group_suppression|跨群聊|background_only|advisory|background|仅作背景|背景/i.test(snippet);
        const risky = item.requires_current_source_verification === true;
        const backgroundOnly = item.requires_background_only === true || item.cross_group_suppression === "background_only";
        const passState = mentioned && ["used", "ignored", "verified", "background", "advisory"].includes(usageState);
        const unsafeUse = backgroundOnly && usageState === "used" && !currentSourceVerified;
        const missingCurrentVerification = risky && usageState === "used" && !currentSourceVerified;
        const missingSemanticAck = Number(item.semantic_risk_score || 0) >= 60 && !semanticAcknowledged;
        const missingCrossAck = !!item.cross_group_suppression && !crossAcknowledged;
        return {
            gate_id: gate.gate_id,
            target_project: gate.target_project || "",
            global_memory_id: id,
            status: item.status || "",
            usage_state: usageState,
            mentioned,
            pass_state: passState,
            current_source_verified: currentSourceVerified,
            semantic_risk_acknowledged: semanticAcknowledged,
            cross_group_acknowledged: crossAcknowledged,
            semantic_risk_score: Number(item.semantic_risk_score || 0),
            cross_group_suppression: item.cross_group_suppression || "",
            requires_current_source_verification: risky,
            requires_background_only: backgroundOnly,
            unsafe_use: unsafeUse,
            missing_current_verification: missingCurrentVerification,
            missing_semantic_acknowledgement: missingSemanticAck,
            missing_cross_group_acknowledgement: missingCrossAck,
            pass: passState && !unsafeUse && !missingCurrentVerification && !missingSemanticAck && !missingCrossAck,
        };
    }));
    const missingRows = rows.filter((row) => !row.mentioned);
    const missingUsageStateRows = rows.filter((row) => row.mentioned && !row.pass_state);
    const unsafeUseRows = rows.filter((row) => row.unsafe_use);
    const missingCurrentVerificationRows = rows.filter((row) => row.missing_current_verification);
    const missingSemanticRows = rows.filter((row) => row.missing_semantic_acknowledgement);
    const missingCrossRows = rows.filter((row) => row.missing_cross_group_acknowledgement);
    return {
        schema: "ccm-child-agent-global-memory-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || rows.every((row) => row.pass),
        gate_ids: matching.map((gate) => gate.gate_id),
        global_memory_ids: (0, collaboration_1.uniqueStrings)(...matching.map((gate) => gate.required_global_memory_ids || [])).slice(0, 40),
        missing_global_memory_ids: (0, collaboration_1.uniqueStrings)(missingRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_usage_state_ids: (0, collaboration_1.uniqueStrings)(missingUsageStateRows.map((row) => row.global_memory_id)).slice(0, 40),
        unsafe_used_global_memory_ids: (0, collaboration_1.uniqueStrings)(unsafeUseRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_current_verification_ids: (0, collaboration_1.uniqueStrings)(missingCurrentVerificationRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_semantic_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(missingSemanticRows.map((row) => row.global_memory_id)).slice(0, 40),
        missing_cross_group_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(missingCrossRows.map((row) => row.global_memory_id)).slice(0, 40),
        used_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "used").map((row) => row.global_memory_id)).slice(0, 40),
        ignored_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "ignored").map((row) => row.global_memory_id)).slice(0, 40),
        verified_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "verified" || row.current_source_verified).map((row) => row.global_memory_id)).slice(0, 40),
        background_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "background" || row.cross_group_suppression === "background_only").map((row) => row.global_memory_id)).slice(0, 40),
        advisory_global_memory_ids: (0, collaboration_1.uniqueStrings)(rows.filter((row) => row.usage_state === "advisory" || row.cross_group_suppression === "advisory").map((row) => row.global_memory_id)).slice(0, 40),
        rows,
        structured_usage_rows: structuredRows,
        declared: used.length > 0 || ignored.length > 0 || structuredRows.length > 0,
        used,
        ignored,
    };
}
function evaluateReceiptGlobalMemoryHealthGate(task, receipt = {}, context = {}) {
    const allGates = Array.isArray(context.globalMemoryHealthGates || context.global_memory_health_gates)
        ? (context.globalMemoryHealthGates || context.global_memory_health_gates)
        : collectTaskGlobalMemoryHealthGates(task, context);
    const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
    const matching = allGates.filter((gate) => {
        const target = normalizeMemoryGateAgent(gate.target_project);
        return !target || !agent || target === agent;
    });
    const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
    const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
    const structuredRows = collectReceiptGlobalMemoryUsageRows(receipt);
    const structuredText = structuredRows.map((row) => [
        row.global_memory_id ? `global_memory_id=${row.global_memory_id}` : "",
        row.usage_state ? `usage_state=${row.usage_state}` : "",
        row.current_source_verified ? "current_source_verified=true" : "",
        row.reason || "",
    ].filter(Boolean).join("; ")).join("\n");
    const usedText = used.map((item) => String(item || "")).join("\n");
    const ignoredText = ignored.map((item) => String(item || "")).join("\n");
    const declarationText = [usedText, ignoredText, structuredText, receipt.summary, ...(Array.isArray(receipt.verification) ? receipt.verification : [])]
        .map((item) => String(item || ""))
        .join("\n");
    const hasIgnoredSignal = /(memoryignored|memory ignored|ignored|ignore|skip|not used|not needed|unused|blocked|do not use|must not use|不使用|未使用|忽略|跳过|阻断|禁止使用|不能使用|未采用)/i.test(ignoredText || declarationText);
    const hasCurrentSourceVerified = /(current source verified|verified current source|current source|source verified|current file|latest source|re-read|reread|当前源|当前文件|最新源|重读|重新读取|已核验|已验证|核验当前)/i.test(declarationText);
    const rows = matching.map((gate) => {
        const gateId = String(gate.gate_id || "").trim();
        const gateMentioned = !!gateId && declarationText.includes(gateId);
        const fail = gate.status === "fail" || gate.action === "block_global_agent_memory_recall";
        const warn = gate.status === "warn";
        const unsafeStructuredUse = structuredRows.some((row) => row.usage_state && !["ignored"].includes(row.usage_state));
        const unsafeUsedText = /global[_\s-]?memory|global agent memory|全局记忆|全局 Agent 记忆/i.test(usedText);
        const blockedGlobalMemoryUsed = fail && (unsafeStructuredUse || unsafeUsedText);
        const ignoredWithReason = gateMentioned && hasIgnoredSignal;
        const warningAcknowledged = gateMentioned && (hasCurrentSourceVerified || hasIgnoredSignal || /residue|残留|warning|warn|active memory clean|active.*clean/i.test(declarationText));
        const acknowledged = fail ? ignoredWithReason : warn ? warningAcknowledged : gateMentioned;
        return {
            gate_id: gateId,
            target_project: gate.target_project || "",
            status: gate.status || "",
            action: gate.action || "",
            active_contamination_count: Number(gate.active_contamination_count || 0),
            residue_contamination_count: Number(gate.residue_contamination_count || 0),
            gate_mentioned: gateMentioned,
            ignored_with_reason: ignoredWithReason,
            warning_acknowledged: warningAcknowledged,
            current_source_verified: hasCurrentSourceVerified,
            blocked_global_memory_used: blockedGlobalMemoryUsed,
            required_action: gate.required_action || "",
            pass: acknowledged && !blockedGlobalMemoryUsed,
        };
    });
    const missingRows = rows.filter((row) => !row.gate_mentioned);
    const missingIgnoredRows = rows.filter((row) => row.status === "fail" && !row.ignored_with_reason);
    const missingWarnRows = rows.filter((row) => row.status === "warn" && !row.warning_acknowledged);
    const unsafeRows = rows.filter((row) => row.blocked_global_memory_used);
    return {
        schema: "ccm-child-agent-global-memory-health-gate-receipt-validation-v1",
        required: matching.length > 0,
        pass: matching.length === 0 || rows.every((row) => row.pass),
        gate_ids: matching.map((gate) => gate.gate_id),
        missing_gate_ids: missingRows.map((row) => row.gate_id),
        fail_gate_ids: rows.filter((row) => row.status === "fail").map((row) => row.gate_id),
        warn_gate_ids: rows.filter((row) => row.status === "warn").map((row) => row.gate_id),
        missing_ignore_gate_ids: missingIgnoredRows.map((row) => row.gate_id),
        missing_warning_ack_gate_ids: missingWarnRows.map((row) => row.gate_id),
        blocked_global_memory_used_gate_ids: unsafeRows.map((row) => row.gate_id),
        rows,
        declared: used.length > 0 || ignored.length > 0 || structuredRows.length > 0,
        used,
        ignored,
    };
}
function buildMemoryGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.memory_dispatch_gates || summary.memoryDispatchGates)
        ? (summary.memory_dispatch_gates || summary.memoryDispatchGates)
        : [];
    const rows = Array.isArray(summary.memory_gate_receipt_rows || summary.memoryGateReceiptRows)
        ? (summary.memory_gate_receipt_rows || summary.memoryGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.dispatch_gate_id || gate.dispatchGateId || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const memoryGate = row.memory_gate || row.memoryGate || row;
        const missingGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(memoryGate.missing_gate_ids || memoryGate.missingGateIds || row.missing_gate_ids || row.missingGateIds));
        const rowGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(memoryGate.gate_ids || memoryGate.gateIds || row.gate_ids || row.gateIds), ...missingGateIds);
        const pass = memoryGate.pass === true || row.pass === true || (missingGateIds.length === 0 && memoryGate.required === true);
        const required = memoryGate.required === true || row.required === true || rowGateIds.length > 0 || missingGateIds.length > 0;
        const status = !required ? "not_required" : pass ? "passed" : "missing_receipt_reference";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明" : status === "missing_receipt_reference" ? "缺记忆声明" : "未触发",
            gate_ids: rowGateIds.slice(0, 12),
            missing_gate_ids: missingGateIds.slice(0, 12),
            declared: memoryGate.declared === true,
            used_count: (0, collaboration_1.normalizeStringArray)(memoryGate.used || row.memoryUsed || row.memory_used).length,
            ignored_count: (0, collaboration_1.normalizeStringArray)(memoryGate.ignored || row.memoryIgnored || row.memory_ignored).length,
            reason: status === "missing_receipt_reference"
                ? `结果说明缺少记忆 gate 引用：${missingGateIds.join("、") || rowGateIds.join("、") || "本轮派发 gate"}`
                : status === "passed"
                    ? "结果说明已声明本轮群聊记忆使用"
                    : "本轮未触发记忆派发 gate",
        };
    });
    const missingGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || []));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.memory_dispatch_gate_count || summary.memoryDispatchGateCount || 0) > 0;
    const pass = !required || summary.memory_gate_receipt_passed === true || summary.memoryGateReceiptPassed === true || (visibleRows.length > 0 && visibleRows.every((row) => row.status !== "missing_receipt_reference"));
    const status = !required
        ? "not_required"
        : pass
            ? "passed"
            : "missing_receipt_reference";
    return {
        schema: "ccm-memory-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "missing_receipt_reference" ? "缺记忆声明" : "未触发",
        summary: !required
            ? "本轮未触发记忆派发校验"
            : pass
                ? `子 Agent 已声明本轮群聊记忆 gate（${gateIds.length || Number(summary.memory_dispatch_gate_count || 0)} 个）`
                : `还有 ${missingGateIds.length || visibleRows.filter((row) => row.status === "missing_receipt_reference").length} 个记忆 gate 未被结果说明引用`,
        gate_count: gateIds.length || Number(summary.memory_dispatch_gate_count || summary.memoryDispatchGateCount || 0),
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: missingGateIds.slice(0, 20),
        missing_count: missingGateIds.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildGlobalMemoryReceiptVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        ? (summary.global_memory_receipt_gates || summary.globalMemoryReceiptGates)
        : [];
    const rows = Array.isArray(summary.global_memory_receipt_rows || summary.globalMemoryReceiptRows)
        ? (summary.global_memory_receipt_rows || summary.globalMemoryReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.id || ""));
    const globalMemoryIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.required_global_memory_ids || gate.global_memory_ids || []));
    const visibleRows = rows.map((row) => {
        const gate = row.global_memory_gate || row.globalMemoryGate || row.global_memory_receipt || row.globalMemoryReceipt || row;
        const missingIds = (0, collaboration_1.uniqueStrings)(gate.missing_global_memory_ids || row.missing_global_memory_ids || []);
        const missingUsageIds = (0, collaboration_1.uniqueStrings)(gate.missing_usage_state_ids || row.missing_usage_state_ids || []);
        const unsafeIds = (0, collaboration_1.uniqueStrings)(gate.unsafe_used_global_memory_ids || row.unsafe_used_global_memory_ids || []);
        const missingCurrentIds = (0, collaboration_1.uniqueStrings)(gate.missing_current_verification_ids || row.missing_current_verification_ids || []);
        const missingSemanticIds = (0, collaboration_1.uniqueStrings)(gate.missing_semantic_acknowledgement_ids || row.missing_semantic_acknowledgement_ids || []);
        const missingCrossIds = (0, collaboration_1.uniqueStrings)(gate.missing_cross_group_acknowledgement_ids || row.missing_cross_group_acknowledgement_ids || []);
        const rowIds = (0, collaboration_1.uniqueStrings)(gate.global_memory_ids || row.global_memory_ids || [], missingIds, missingUsageIds, unsafeIds, missingCurrentIds, missingSemanticIds, missingCrossIds);
        const pass = gate.pass === true || row.pass === true || (gate.required === true && !missingIds.length && !missingUsageIds.length && !unsafeIds.length && !missingCurrentIds.length && !missingSemanticIds.length && !missingCrossIds.length);
        const required = gate.required === true || row.required === true || rowIds.length > 0 || missingIds.length > 0;
        const status = !required
            ? "not_required"
            : pass
                ? "passed"
                : unsafeIds.length
                    ? "unsafe_global_memory_use"
                    : missingIds.length
                        ? "missing_global_memory_reference"
                        : missingCurrentIds.length
                            ? "missing_current_source_verification"
                            : missingSemanticIds.length
                                ? "missing_semantic_acknowledgement"
                                : missingCrossIds.length
                                    ? "missing_cross_group_acknowledgement"
                                    : missingUsageIds.length
                                        ? "missing_usage_state"
                                        : "missing_global_memory_reference";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明"
                : status === "unsafe_global_memory_use" ? "全局记忆误用"
                    : status === "missing_current_source_verification" ? "缺当前源核验"
                        : status === "missing_semantic_acknowledgement" ? "缺语义风险声明"
                            : status === "missing_cross_group_acknowledgement" ? "缺跨群聊声明"
                                : status === "missing_usage_state" ? "缺使用状态"
                                    : status === "missing_global_memory_reference" ? "缺全局记忆声明" : "未触发",
            gate_ids: (0, collaboration_1.uniqueStrings)(gate.gate_ids || row.gate_ids || [], gateIds).slice(0, 12),
            global_memory_ids: rowIds.slice(0, 20),
            missing_global_memory_ids: missingIds.slice(0, 20),
            missing_usage_state_ids: missingUsageIds.slice(0, 20),
            unsafe_used_global_memory_ids: unsafeIds.slice(0, 20),
            missing_current_verification_ids: missingCurrentIds.slice(0, 20),
            missing_semantic_acknowledgement_ids: missingSemanticIds.slice(0, 20),
            missing_cross_group_acknowledgement_ids: missingCrossIds.slice(0, 20),
            used_count: (0, collaboration_1.normalizeStringArray)(gate.used_global_memory_ids || row.used_global_memory_ids).length,
            ignored_count: (0, collaboration_1.normalizeStringArray)(gate.ignored_global_memory_ids || row.ignored_global_memory_ids).length,
            verified_count: (0, collaboration_1.normalizeStringArray)(gate.verified_global_memory_ids || row.verified_global_memory_ids).length,
            reason: status === "passed"
                ? "结果说明已按 global_memory_id 声明全局记忆使用状态"
                : status === "unsafe_global_memory_use"
                    ? `background-only 全局记忆不能直接使用：${unsafeIds.join("、")}`
                    : status === "missing_current_source_verification"
                        ? `风险全局记忆缺少 current source verified：${missingCurrentIds.join("、")}`
                        : status === "missing_semantic_acknowledgement"
                            ? `语义仲裁全局记忆缺少 semantic_risk 声明：${missingSemanticIds.join("、")}`
                            : status === "missing_cross_group_acknowledgement"
                                ? `跨群聊全局记忆缺少 suppression/advisory 声明：${missingCrossIds.join("、")}`
                                : status === "missing_usage_state"
                                    ? `全局记忆缺少 used/ignored/verified/background/advisory 状态：${missingUsageIds.join("、")}`
                                    : `结果说明缺少 global_memory_id 声明：${missingIds.join("、") || rowIds.join("、") || "本轮全局记忆"}`,
        };
    });
    const failingRows = visibleRows.filter((row) => !["not_required", "passed"].includes(row.status));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.global_memory_receipt_gate_count || summary.globalMemoryReceiptGateCount || 0) > 0;
    const pass = !required || summary.global_memory_receipt_passed === true || summary.globalMemoryReceiptPassed === true || (visibleRows.length > 0 && failingRows.length === 0);
    const status = !required ? "not_required" : pass ? "passed" : failingRows[0]?.status || "missing_global_memory_reference";
    return {
        schema: "ccm-global-memory-receipt-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "not_required" ? "未触发" : "需补声明",
        summary: !required
            ? "本轮未触发全局记忆回执校验"
            : pass
                ? `子 Agent 已声明全局记忆使用状态（${globalMemoryIds.length || Number(summary.global_memory_receipt_gate_count || 0)} 条）`
                : failingRows[0]?.reason || "结果说明缺少全局记忆使用状态声明",
        gate_count: gateIds.length || Number(summary.global_memory_receipt_gate_count || summary.globalMemoryReceiptGateCount || 0),
        global_memory_count: globalMemoryIds.length,
        gate_ids: gateIds.slice(0, 20),
        global_memory_ids: globalMemoryIds.slice(0, 40),
        missing_global_memory_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_global_memory_ids || [])).slice(0, 40),
        unsafe_used_global_memory_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.unsafe_used_global_memory_ids || [])).slice(0, 40),
        missing_current_verification_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_current_verification_ids || [])).slice(0, 40),
        missing_semantic_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_semantic_acknowledgement_ids || [])).slice(0, 40),
        missing_cross_group_acknowledgement_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_cross_group_acknowledgement_ids || [])).slice(0, 40),
        missing_count: failingRows.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildGlobalMemoryHealthGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        ? (summary.global_memory_health_gates || summary.globalMemoryHealthGates)
        : [];
    const rows = Array.isArray(summary.global_memory_health_gate_receipt_rows || summary.globalMemoryHealthGateReceiptRows)
        ? (summary.global_memory_health_gate_receipt_rows || summary.globalMemoryHealthGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const gate = row.global_memory_health_gate || row.globalMemoryHealthGate || row.global_memory_health || row.globalMemoryHealth || row;
        const missingIds = (0, collaboration_1.uniqueStrings)(gate.missing_gate_ids || row.missing_gate_ids || []);
        const missingIgnoreIds = (0, collaboration_1.uniqueStrings)(gate.missing_ignore_gate_ids || row.missing_ignore_gate_ids || []);
        const missingWarnIds = (0, collaboration_1.uniqueStrings)(gate.missing_warning_ack_gate_ids || row.missing_warning_ack_gate_ids || []);
        const unsafeIds = (0, collaboration_1.uniqueStrings)(gate.blocked_global_memory_used_gate_ids || row.blocked_global_memory_used_gate_ids || []);
        const rowGateIds = (0, collaboration_1.uniqueStrings)(gate.gate_ids || row.gate_ids || [], missingIds, missingIgnoreIds, missingWarnIds, unsafeIds);
        const pass = gate.pass === true || row.pass === true || (gate.required === true && !missingIds.length && !missingIgnoreIds.length && !missingWarnIds.length && !unsafeIds.length);
        const required = gate.required === true || row.required === true || rowGateIds.length > 0;
        const status = !required
            ? "not_required"
            : pass
                ? "passed"
                : unsafeIds.length
                    ? "blocked_global_memory_used"
                    : missingIgnoreIds.length
                        ? "missing_blocked_memory_ignored"
                        : missingWarnIds.length
                            ? "missing_residue_warning_ack"
                            : missingIds.length
                                ? "missing_health_gate_reference"
                                : "missing_health_gate_reference";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明"
                : status === "blocked_global_memory_used" ? "阻断后误用"
                    : status === "missing_blocked_memory_ignored" ? "缺阻断说明"
                        : status === "missing_residue_warning_ack" ? "缺残留警告声明"
                            : status === "missing_health_gate_reference" ? "缺健康门禁声明" : "未触发",
            gate_ids: rowGateIds.slice(0, 20),
            missing_gate_ids: missingIds.slice(0, 20),
            missing_ignore_gate_ids: missingIgnoreIds.slice(0, 20),
            missing_warning_ack_gate_ids: missingWarnIds.slice(0, 20),
            blocked_global_memory_used_gate_ids: unsafeIds.slice(0, 20),
            fail_gate_ids: (0, collaboration_1.uniqueStrings)(gate.fail_gate_ids || row.fail_gate_ids || []).slice(0, 20),
            warn_gate_ids: (0, collaboration_1.uniqueStrings)(gate.warn_gate_ids || row.warn_gate_ids || []).slice(0, 20),
            reason: status === "passed"
                ? "结果说明已声明 Global Agent memory health gate 的处理情况"
                : status === "blocked_global_memory_used"
                    ? `健康门禁阻断后仍声明使用全局记忆：${unsafeIds.join("、")}`
                    : status === "missing_blocked_memory_ignored"
                        ? `健康门禁失败时 memoryIgnored 必须引用 gate 并说明不使用全局记忆：${missingIgnoreIds.join("、")}`
                        : status === "missing_residue_warning_ack"
                            ? `健康门禁 warn 时必须声明残留警告或当前源核验：${missingWarnIds.join("、")}`
                            : `结果说明缺少 Global Agent memory health gate 引用：${missingIds.join("、") || rowGateIds.join("、") || "本轮健康门禁"}`,
        };
    });
    const failingRows = visibleRows.filter((row) => !["not_required", "passed"].includes(row.status));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.global_memory_health_gate_count || summary.globalMemoryHealthGateCount || 0) > 0;
    const pass = !required || summary.global_memory_health_gate_receipt_passed === true || summary.globalMemoryHealthGateReceiptPassed === true || (visibleRows.length > 0 && failingRows.length === 0);
    const status = !required ? "not_required" : pass ? "passed" : failingRows[0]?.status || "missing_health_gate_reference";
    return {
        schema: "ccm-global-memory-health-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "not_required" ? "未触发" : "需补声明",
        summary: !required
            ? "本轮未触发 Global Agent memory health gate 回执校验"
            : pass
                ? `子 Agent 已声明 Global Agent memory health gate（${gateIds.length || Number(summary.global_memory_health_gate_count || 0)} 个）`
                : failingRows[0]?.reason || "结果说明缺少 Global Agent memory health gate 使用/忽略声明",
        gate_count: gateIds.length || Number(summary.global_memory_health_gate_count || summary.globalMemoryHealthGateCount || 0),
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || [])).slice(0, 40),
        missing_ignore_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_ignore_gate_ids || [])).slice(0, 40),
        missing_warning_ack_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_warning_ack_gate_ids || [])).slice(0, 40),
        blocked_global_memory_used_gate_ids: (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.blocked_global_memory_used_gate_ids || [])).slice(0, 40),
        missing_count: failingRows.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildReadPlanRevalidationGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        ? (summary.read_plan_revalidation_gates || summary.readPlanRevalidationGates)
        : [];
    const rows = Array.isArray(summary.read_plan_revalidation_gate_receipt_rows || summary.readPlanRevalidationGateReceiptRows)
        ? (summary.read_plan_revalidation_gate_receipt_rows || summary.readPlanRevalidationGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.revalidation_gate_id || gate.revalidationGateId || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const gate = row.read_plan_revalidation_gate || row.readPlanRevalidationGate || row;
        const gateRows = Array.isArray(gate.rows || gate.gate_rows || gate.gateRows) ? (gate.rows || gate.gate_rows || gate.gateRows) : [];
        const missingGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_gate_ids || gate.missingGateIds || row.missing_gate_ids || row.missingGateIds));
        const missingReadPlanIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_read_plan_ids || gate.missingReadPlanIds || row.missing_read_plan_ids || row.missingReadPlanIds));
        const sessionMismatchGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.session_mismatch_gate_ids || gate.sessionMismatchGateIds || row.session_mismatch_gate_ids || row.sessionMismatchGateIds));
        const rowGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.gate_ids || gate.gateIds || row.gate_ids || row.gateIds), ...missingGateIds, ...sessionMismatchGateIds);
        const sessionRequired = gate.session_required === true || row.session_required === true || gateRows.some((item) => item.session_required === true);
        const sessionMatched = !sessionRequired || (gate.session_matched !== false && row.session_matched !== false && !sessionMismatchGateIds.length);
        const currentSourceVerified = gate.current_source_verified === true || row.current_source_verified === true || gateRows.some((item) => item.current_source_verified === true);
        const ignoredWithReason = gate.ignored_with_reason === true || row.ignored_with_reason === true || gateRows.some((item) => item.ignored_with_reason === true);
        const pass = gate.pass === true || row.pass === true || (gate.required === true && !missingGateIds.length && !missingReadPlanIds.length && sessionMatched && (currentSourceVerified || ignoredWithReason));
        const required = gate.required === true || row.required === true || rowGateIds.length > 0 || missingGateIds.length > 0 || missingReadPlanIds.length > 0 || sessionMismatchGateIds.length > 0;
        const status = !required
            ? "not_required"
            : missingGateIds.length
                ? "missing_receipt_reference"
                : !sessionMatched
                    ? "session_mismatch"
                    : missingReadPlanIds.length
                        ? "missing_read_plan_reference"
                        : !(currentSourceVerified || ignoredWithReason)
                            ? "missing_current_source_verification"
                            : pass ? "passed" : "missing_current_source_verification";
        const expectedTaskSessionIds = (0, collaboration_1.uniqueStrings)(...gateRows.map((item) => item.expected_task_agent_session_id || item.expectedTaskAgentSessionId || ""));
        const receiptTaskSessionIds = (0, collaboration_1.uniqueStrings)(gate.receipt_task_agent_session_id || gate.receiptTaskAgentSessionId || row.task_agent_session_id || row.taskAgentSessionId || "", ...gateRows.map((item) => item.receipt_task_agent_session_id || item.receiptTaskAgentSessionId || ""));
        const expectedNativeSessionIds = (0, collaboration_1.uniqueStrings)(...gateRows.map((item) => item.expected_native_session_id || item.expectedNativeSessionId || ""));
        const receiptNativeSessionIds = (0, collaboration_1.uniqueStrings)(gate.receipt_native_session_id || gate.receiptNativeSessionId || row.native_session_id || row.nativeSessionId || "", ...gateRows.map((item) => item.receipt_native_session_id || item.receiptNativeSessionId || ""));
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已重读" : status === "session_mismatch" ? "会话不匹配" : status === "missing_read_plan_reference" ? "缺 read_plan_id" : status === "missing_current_source_verification" ? "缺当前源核验" : status === "missing_receipt_reference" ? "缺重读 gate" : "未触发",
            gate_ids: rowGateIds.slice(0, 12),
            missing_gate_ids: missingGateIds.slice(0, 12),
            missing_read_plan_ids: missingReadPlanIds.slice(0, 24),
            session_mismatch_gate_ids: sessionMismatchGateIds.slice(0, 12),
            session_required: sessionRequired,
            session_matched: sessionMatched,
            expected_task_agent_session_ids: expectedTaskSessionIds.slice(0, 8),
            receipt_task_agent_session_ids: receiptTaskSessionIds.slice(0, 8),
            expected_native_session_ids: expectedNativeSessionIds.slice(0, 8),
            receipt_native_session_ids: receiptNativeSessionIds.slice(0, 8),
            current_source_verified: currentSourceVerified,
            ignored_with_reason: ignoredWithReason,
            declared: gate.declared === true,
            rows: gateRows.slice(0, 12),
            reason: status === "session_mismatch"
                ? `结果说明来自错误子 Agent 会话：expected=${expectedTaskSessionIds.join("、") || expectedNativeSessionIds.join("、") || "bound-session"}；receipt=${receiptTaskSessionIds.join("、") || receiptNativeSessionIds.join("、") || "missing"}`
                : status === "missing_read_plan_reference"
                    ? `结果说明缺少 stale read_plan_id：${missingReadPlanIds.join("、") || rowGateIds.join("、") || "本轮读取计划"}`
                    : status === "missing_current_source_verification"
                        ? `结果说明需要声明已重读当前源或在 memoryIgnored 说明不使用：${rowGateIds.join("、") || "本轮读取计划重读 gate"}`
                        : status === "missing_receipt_reference"
                            ? `结果说明缺少读取计划重读 gate 引用：${missingGateIds.join("、") || rowGateIds.join("、") || "本轮重读 gate"}`
                            : status === "passed"
                                ? "结果说明已在绑定子 Agent 会话中声明 stale read plan 已重读当前源"
                                : "本轮未触发读取计划重读 gate",
        };
    });
    const missingGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || []));
    const missingReadPlanIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_read_plan_ids || []));
    const sessionMismatchGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.session_mismatch_gate_ids || []));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.read_plan_revalidation_gate_count || summary.readPlanRevalidationGateCount || 0) > 0;
    const pass = !required
        || summary.read_plan_revalidation_gate_receipt_passed === true
        || summary.readPlanRevalidationGateReceiptPassed === true
        || (visibleRows.length > 0 && visibleRows.every((row) => row.status === "passed"));
    const status = !required
        ? "not_required"
        : pass
            ? "passed"
            : missingGateIds.length
                ? "missing_receipt_reference"
                : sessionMismatchGateIds.length
                    ? "session_mismatch"
                    : missingReadPlanIds.length
                        ? "missing_read_plan_reference"
                        : "missing_current_source_verification";
    return {
        schema: "ccm-read-plan-revalidation-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "session_mismatch" ? "会话不匹配" : status === "missing_read_plan_reference" ? "缺 read_plan_id" : status === "missing_current_source_verification" ? "缺当前源核验" : status === "missing_receipt_reference" ? "缺重读声明" : "未触发",
        summary: !required
            ? "本轮未触发 stale read plan 重读校验"
            : pass
                ? `子 Agent 已在绑定会话中声明 stale read plan 重读（${gateIds.length || Number(summary.read_plan_revalidation_gate_count || 0)} 个 gate）`
                : status === "session_mismatch"
                    ? `还有 ${sessionMismatchGateIds.length} 个读取计划重读 gate 的回执来自错误会话`
                    : status === "missing_read_plan_reference"
                        ? `还有 ${missingReadPlanIds.length} 个 stale read_plan_id 未被结果说明引用`
                        : status === "missing_receipt_reference"
                            ? `还有 ${missingGateIds.length || visibleRows.filter((row) => row.status === "missing_receipt_reference").length} 个读取计划重读 gate 未被结果说明引用`
                            : "还有读取计划重读 gate 缺少 current source verified 或 memoryIgnored 不使用说明",
        gate_count: gateIds.length || Number(summary.read_plan_revalidation_gate_count || summary.readPlanRevalidationGateCount || 0),
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: missingGateIds.slice(0, 20),
        missing_read_plan_ids: missingReadPlanIds.slice(0, 40),
        session_mismatch_gate_ids: sessionMismatchGateIds.slice(0, 20),
        session_mismatch_count: sessionMismatchGateIds.length,
        session_required: visibleRows.some((row) => row.session_required),
        session_matched: visibleRows.every((row) => !row.session_required || row.session_matched),
        missing_count: missingGateIds.length + missingReadPlanIds.length + sessionMismatchGateIds.length + visibleRows.filter((row) => row.status === "missing_current_source_verification").length,
        rows: visibleRows.slice(0, 20),
    };
}
// ===== merged from collaboration-memory-gates-part-03.ts =====
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
function buildPostCompactReinjectionGateVisibleSummary(summary = {}) {
    const gates = Array.isArray(summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
        ? (summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
        : [];
    const rows = Array.isArray(summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows)
        ? (summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows)
        : [];
    const gateIds = (0, collaboration_1.uniqueStrings)(...gates.map((gate) => gate.gate_id || gate.reinjection_gate_id || gate.reinjectionGateId || gate.id || ""));
    const visibleRows = rows.map((row) => {
        const gate = row.post_compact_reinjection_gate || row.postCompactReinjectionGate || row;
        const missingGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_gate_ids || gate.missingGateIds || row.missing_gate_ids || row.missingGateIds));
        const missingCandidateGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_candidate_reference_gate_ids || gate.missingCandidateReferenceGateIds || row.missing_candidate_reference_gate_ids || row.missingCandidateReferenceGateIds));
        const missingCandidateUsageGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_candidate_usage_gate_ids || gate.missingCandidateUsageGateIds || row.missing_candidate_usage_gate_ids || row.missingCandidateUsageGateIds));
        const missingCandidateUsageCandidateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_candidate_usage_candidate_ids || gate.missingCandidateUsageCandidateIds || row.missing_candidate_usage_candidate_ids || row.missingCandidateUsageCandidateIds));
        const rowGateIds = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.gate_ids || gate.gateIds || row.gate_ids || row.gateIds), ...missingGateIds);
        const candidateReferencePassed = gate.candidate_reference_passed !== false && row.candidate_reference_passed !== false && missingCandidateGateIds.length === 0;
        const candidateUsagePassed = gate.candidate_usage_declared_passed !== false
            && row.candidate_usage_declared_passed !== false
            && gate.candidate_usage_strict_passed !== false
            && row.candidate_usage_strict_passed !== false
            && missingCandidateUsageGateIds.length === 0
            && missingCandidateUsageCandidateIds.length === 0;
        const pass = (gate.pass === true || row.pass === true || (missingGateIds.length === 0 && gate.required === true)) && candidateReferencePassed && candidateUsagePassed;
        const required = gate.required === true || row.required === true || rowGateIds.length > 0 || missingGateIds.length > 0 || missingCandidateGateIds.length > 0 || missingCandidateUsageGateIds.length > 0 || missingCandidateUsageCandidateIds.length > 0;
        const status = !required
            ? "not_required"
            : missingGateIds.length
                ? "missing_receipt_reference"
                : !candidateReferencePassed
                    ? "missing_candidate_reference"
                    : !candidateUsagePassed
                        ? "missing_candidate_usage"
                        : pass ? "passed" : "missing_receipt_reference";
        const usageCounts = gate.candidate_usage_counts || gate.candidateUsageCounts || row.candidate_usage_counts || row.candidateUsageCounts || {};
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明" : status === "missing_candidate_usage" ? "缺使用状态" : status === "missing_candidate_reference" ? "缺候选声明" : status === "missing_receipt_reference" ? "缺重注入声明" : "未触发",
            gate_ids: rowGateIds.slice(0, 12),
            missing_gate_ids: missingGateIds.slice(0, 12),
            missing_candidate_reference_gate_ids: missingCandidateGateIds.slice(0, 12),
            missing_candidate_usage_gate_ids: missingCandidateUsageGateIds.slice(0, 12),
            missing_candidate_usage_candidate_ids: missingCandidateUsageCandidateIds.slice(0, 24),
            candidate_count: Number(gate.candidate_count || row.candidate_count || 0),
            candidate_reference_required: gate.candidate_reference_required === true || row.candidate_reference_required === true,
            candidate_reference_passed: candidateReferencePassed,
            candidate_usage_required: gate.candidate_usage_required === true || row.candidate_usage_required === true,
            candidate_usage_declared_passed: candidateUsagePassed,
            candidate_usage_strict_required: gate.candidate_usage_strict_required === true || row.candidate_usage_strict_required === true,
            candidate_usage_strict_passed: candidateUsagePassed,
            candidate_usage_counts: {
                used: Number(usageCounts.used || 0),
                ignored: Number(usageCounts.ignored || 0),
                verified: Number(usageCounts.verified || 0),
                mentioned: Number(usageCounts.mentioned || 0),
                unreferenced: Number(usageCounts.unreferenced || 0),
            },
            candidate_usage_rows: Array.isArray(gate.candidate_usage_rows || gate.candidateUsageRows || row.candidate_usage_rows || row.candidateUsageRows)
                ? (gate.candidate_usage_rows || gate.candidateUsageRows || row.candidate_usage_rows || row.candidateUsageRows).slice(0, 24)
                : [],
            referenced_candidate_ids: (0, collaboration_1.uniqueStrings)(gate.referenced_candidate_ids || gate.referencedCandidateIds || row.referenced_candidate_ids || row.referencedCandidateIds || []).slice(0, 24),
            used_candidate_ids: (0, collaboration_1.uniqueStrings)(gate.used_candidate_ids || gate.usedCandidateIds || row.used_candidate_ids || row.usedCandidateIds || []).slice(0, 24),
            ignored_candidate_ids: (0, collaboration_1.uniqueStrings)(gate.ignored_candidate_ids || gate.ignoredCandidateIds || row.ignored_candidate_ids || row.ignoredCandidateIds || []).slice(0, 24),
            verified_candidate_ids: (0, collaboration_1.uniqueStrings)(gate.verified_candidate_ids || gate.verifiedCandidateIds || row.verified_candidate_ids || row.verifiedCandidateIds || []).slice(0, 24),
            mentioned_only_candidate_ids: (0, collaboration_1.uniqueStrings)(gate.mentioned_only_candidate_ids || gate.mentionedOnlyCandidateIds || row.mentioned_only_candidate_ids || row.mentionedOnlyCandidateIds || []).slice(0, 24),
            unreferenced_candidate_ids: (0, collaboration_1.uniqueStrings)(gate.unreferenced_candidate_ids || gate.unreferencedCandidateIds || row.unreferenced_candidate_ids || row.unreferencedCandidateIds || []).slice(0, 24),
            all_candidates_declared: gate.all_candidates_declared === true || row.all_candidates_declared === true,
            declared: gate.declared === true,
            reason: status === "missing_candidate_usage"
                ? `结果说明已引用候选，但缺少 used / ignored / verified 使用状态声明：${missingCandidateUsageCandidateIds.join("、") || missingCandidateUsageGateIds.join("、") || rowGateIds.join("、") || "本轮重注入候选"}`
                : status === "missing_candidate_reference"
                    ? `结果说明已引用 gate，但缺少具体 candidate_id / 候选值 / 全部候选声明：${missingCandidateGateIds.join("、") || rowGateIds.join("、") || "本轮重注入 gate"}`
                    : status === "missing_receipt_reference"
                        ? `结果说明缺少压缩后重注入 gate 引用：${missingGateIds.join("、") || rowGateIds.join("、") || "本轮重注入 gate"}`
                        : status === "passed"
                            ? "结果说明已声明压缩前重注入候选的使用情况"
                            : "本轮未触发压缩后重注入 gate",
        };
    });
    const missingGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_gate_ids || []));
    const missingCandidateGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_candidate_reference_gate_ids || []));
    const missingCandidateUsageGateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_candidate_usage_gate_ids || []));
    const missingCandidateUsageCandidateIds = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_candidate_usage_candidate_ids || []));
    const required = gates.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.post_compact_reinjection_gate_count || summary.postCompactReinjectionGateCount || 0) > 0;
    const pass = !required
        || summary.post_compact_reinjection_gate_receipt_passed === true
        || summary.postCompactReinjectionGateReceiptPassed === true
        || (visibleRows.length > 0 && visibleRows.every((row) => row.status !== "missing_receipt_reference" && row.status !== "missing_candidate_reference" && row.status !== "missing_candidate_usage"));
    const status = !required
        ? "not_required"
        : pass
            ? "passed"
            : missingGateIds.length
                ? "missing_receipt_reference"
                : missingCandidateGateIds.length
                    ? "missing_candidate_reference"
                    : "missing_candidate_usage";
    const candidateCount = gates.reduce((sum, gate) => sum + Number(gate.candidate_count || gate.candidateCount || 0), 0);
    const usageCounts = visibleRows.reduce((acc, row) => {
        const counts = row.candidate_usage_counts || {};
        acc.used += Number(counts.used || 0);
        acc.ignored += Number(counts.ignored || 0);
        acc.verified += Number(counts.verified || 0);
        acc.mentioned += Number(counts.mentioned || 0);
        acc.unreferenced += Number(counts.unreferenced || 0);
        return acc;
    }, { used: 0, ignored: 0, verified: 0, mentioned: 0, unreferenced: 0 });
    return {
        schema: "ccm-post-compact-reinjection-gate-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "missing_candidate_usage" ? "缺使用状态" : status === "missing_candidate_reference" ? "缺候选声明" : status === "missing_receipt_reference" ? "缺重注入声明" : "未触发",
        summary: !required
            ? "本轮未触发压缩后重注入校验"
            : pass
                ? `子 Agent 已声明压缩后重注入 gate（${gateIds.length || Number(summary.post_compact_reinjection_gate_count || 0)} 个，候选 ${candidateCount} 条）`
                : missingGateIds.length
                    ? `还有 ${missingGateIds.length || visibleRows.filter((row) => row.status === "missing_receipt_reference").length} 个压缩后重注入 gate 未被结果说明引用`
                    : missingCandidateGateIds.length
                        ? `还有 ${missingCandidateGateIds.length} 个压缩后重注入 gate 缺少候选级声明`
                        : `还有 ${missingCandidateUsageGateIds.length} 个压缩后重注入 gate 缺少候选 used / ignored / verified 声明`,
        gate_count: gateIds.length || Number(summary.post_compact_reinjection_gate_count || summary.postCompactReinjectionGateCount || 0),
        candidate_count: candidateCount,
        candidate_usage_counts: usageCounts,
        gate_ids: gateIds.slice(0, 20),
        missing_gate_ids: missingGateIds.slice(0, 20),
        missing_candidate_reference_gate_ids: missingCandidateGateIds.slice(0, 20),
        missing_candidate_usage_gate_ids: missingCandidateUsageGateIds.slice(0, 20),
        missing_candidate_usage_candidate_ids: missingCandidateUsageCandidateIds.slice(0, 40),
        missing_count: missingGateIds.length + missingCandidateGateIds.length + missingCandidateUsageGateIds.length + missingCandidateUsageCandidateIds.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildApiMicrocompactReceiptVisibleSummary(summary = {}) {
    const plans = Array.isArray(summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
        ? (summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
        : [];
    const rows = Array.isArray(summary.api_microcompact_receipt_rows || summary.apiMicrocompactReceiptRows)
        ? (summary.api_microcompact_receipt_rows || summary.apiMicrocompactReceiptRows)
        : [];
    const planChecksums = (0, collaboration_1.uniqueStrings)(...plans.map((plan) => plan.plan_checksum || plan.planChecksum || plan.checksum || ""));
    const visibleRows = rows.map((row) => {
        const gate = row.api_microcompact || row.apiMicrocompact || row.api_microcompact_receipt || row.apiMicrocompactReceipt || row;
        const missing = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.missing_plan_checksums || gate.missingPlanChecksums || row.missing_plan_checksums || row.missingPlanChecksums));
        const unsafe = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.unsafe_native_applied_plan_checksums || gate.unsafeNativeAppliedPlanChecksums || row.unsafe_native_applied_plan_checksums || row.unsafeNativeAppliedPlanChecksums));
        const sessionMismatch = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.session_mismatch_plan_checksums || gate.sessionMismatchPlanChecksums || row.session_mismatch_plan_checksums || row.sessionMismatchPlanChecksums));
        const checksums = (0, collaboration_1.uniqueStrings)(...(0, collaboration_1.normalizeStringArray)(gate.plan_checksums || gate.planChecksums || row.plan_checksums || row.planChecksums), ...missing, ...unsafe, ...sessionMismatch);
        const required = gate.required === true || row.required === true || checksums.length > 0;
        const pass = gate.pass === true || row.pass === true || (required && !missing.length && !unsafe.length && !sessionMismatch.length);
        const status = !required
            ? "not_required"
            : unsafe.length
                ? "unsafe_native_applied"
                : sessionMismatch.length
                    ? "session_mismatch"
                    : missing.length
                        ? "missing_usage_declaration"
                        : pass ? "passed" : "missing_usage_declaration";
        return {
            agent: row.agent || row.project || row.target || "",
            status,
            status_label: status === "passed" ? "已声明" : status === "unsafe_native_applied" ? "误报原生应用" : status === "session_mismatch" ? "会话不匹配" : status === "missing_usage_declaration" ? "缺使用声明" : "未触发",
            plan_checksums: checksums.slice(0, 12),
            missing_plan_checksums: missing.slice(0, 12),
            unsafe_native_applied_plan_checksums: unsafe.slice(0, 12),
            session_mismatch_plan_checksums: sessionMismatch.slice(0, 12),
            native_applied_count: Number(gate.native_applied_count || row.native_applied_count || 0),
            advisory_count: Number(gate.advisory_count || row.advisory_count || 0),
            ignored_count: Number(gate.ignored_count || row.ignored_count || 0),
            rows: Array.isArray(gate.rows || row.rows) ? (gate.rows || row.rows).slice(0, 12) : [],
            reason: status === "passed"
                ? "结果说明已声明 API microcompact edit plan 的 native/advisory/ignored 使用状态"
                : status === "unsafe_native_applied"
                    ? `第三方 CLI 场景不得声称已原生应用 API context-management：${unsafe.join("、")}`
                    : status === "session_mismatch"
                        ? `API microcompact 使用声明来自错误或缺失的子 Agent 会话：${sessionMismatch.join("、")}`
                        : status === "missing_usage_declaration"
                            ? `结果说明缺少 API microcompact edit plan 使用状态：${missing.join("、") || checksums.join("、") || "本轮计划"}`
                            : "本轮未触发 API microcompact 回执校验",
        };
    });
    const missing = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.missing_plan_checksums || []));
    const unsafe = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.unsafe_native_applied_plan_checksums || []));
    const sessionMismatch = (0, collaboration_1.uniqueStrings)(...visibleRows.map((row) => row.session_mismatch_plan_checksums || []));
    const required = plans.length > 0 || visibleRows.some((row) => row.status !== "not_required") || Number(summary.api_microcompact_edit_plan_count || summary.apiMicrocompactEditPlanCount || 0) > 0;
    const pass = !required
        || ((summary.api_microcompact_receipt_passed === true || summary.apiMicrocompactReceiptPassed === true) && !missing.length && !unsafe.length && !sessionMismatch.length)
        || (visibleRows.length > 0 && visibleRows.every((row) => row.status === "passed"));
    const status = !required ? "not_required" : pass ? "passed" : unsafe.length ? "unsafe_native_applied" : sessionMismatch.length ? "session_mismatch" : "missing_usage_declaration";
    return {
        schema: "ccm-api-microcompact-receipt-visible-summary-v1",
        required,
        pass,
        status,
        status_label: status === "passed" ? "已通过" : status === "unsafe_native_applied" ? "误报原生应用" : status === "session_mismatch" ? "会话不匹配" : status === "missing_usage_declaration" ? "缺使用声明" : "未触发",
        summary: !required
            ? "本轮未触发 API microcompact edit plan 回执校验"
            : pass
                ? `子 Agent 已声明 API microcompact edit plan（${planChecksums.length || Number(summary.api_microcompact_edit_plan_count || 0)} 个）`
                : unsafe.length
                    ? `还有 ${unsafe.length} 个计划在不支持 native apply 时被声明为原生应用`
                    : sessionMismatch.length
                        ? `还有 ${sessionMismatch.length} 个 API microcompact 使用声明没有匹配本轮子 Agent 会话或记忆快照`
                        : `还有 ${missing.length || visibleRows.filter((row) => row.status === "missing_usage_declaration").length} 个 API microcompact edit plan 缺少使用状态声明`,
        plan_count: planChecksums.length || Number(summary.api_microcompact_edit_plan_count || summary.apiMicrocompactEditPlanCount || 0),
        plan_checksums: planChecksums.slice(0, 20),
        missing_plan_checksums: missing.slice(0, 20),
        unsafe_native_applied_plan_checksums: unsafe.slice(0, 20),
        session_mismatch_plan_checksums: sessionMismatch.slice(0, 20),
        native_applied_count: visibleRows.reduce((sum, row) => sum + Number(row.native_applied_count || 0), 0),
        advisory_count: visibleRows.reduce((sum, row) => sum + Number(row.advisory_count || 0), 0),
        ignored_count: visibleRows.reduce((sum, row) => sum + Number(row.ignored_count || 0), 0),
        missing_count: missing.length + unsafe.length + sessionMismatch.length,
        rows: visibleRows.slice(0, 20),
    };
}
function buildPostCompactDispatchMarkerVisibleSummary(summary = {}) {
    const markers = Array.isArray(summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
        ? (summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
        : [];
    const rows = markers.map((marker) => {
        const first = marker.first_dispatch_after_compact === true || marker.firstDispatchAfterCompact === true;
        const sequence = Number(marker.dispatch_sequence || marker.dispatchSequence || 0);
        const status = first ? "first_dispatch_after_compact" : sequence > 0 ? "followup_dispatch_after_compact" : "recorded";
        return {
            agent: marker.target_project || marker.targetProject || marker.agent || marker.project || "",
            status,
            status_label: first ? "压缩后首次派发" : sequence > 0 ? `第 ${sequence} 次派发` : "已记录",
            marker_id: marker.marker_id || marker.markerId || "",
            boundary_id: marker.boundary_id || marker.boundaryId || "",
            summary_checksum: marker.summary_checksum || marker.summaryChecksum || "",
            dispatch_sequence: sequence,
            first_dispatch_after_compact: first,
            reinjection_gate_id: marker.reinjection_gate_id || marker.reinjectionGateId || "",
            candidate_count: Number(marker.candidate_count || marker.candidateCount || 0),
            source: marker.source || "",
            reason: first
                ? "该子 Agent 收到压缩恢复后的第一跳记忆包"
                : sequence > 0
                    ? `该子 Agent 已是同一压缩边界后的第 ${sequence} 次派发`
                    : "已记录压缩后派发 marker",
        };
    });
    const markerIds = (0, collaboration_1.uniqueStrings)(...rows.map((row) => row.marker_id || ""));
    const boundaryIds = (0, collaboration_1.uniqueStrings)(...rows.map((row) => row.boundary_id || ""));
    const firstRows = rows.filter((row) => row.first_dispatch_after_compact);
    const required = markers.length > 0 || Number(summary.post_compact_dispatch_marker_count || summary.postCompactDispatchMarkerCount || 0) > 0;
    const status = !required ? "not_required" : firstRows.length ? "first_dispatch_after_compact" : "followup_dispatch_after_compact";
    return {
        schema: "ccm-post-compact-dispatch-marker-visible-summary-v1",
        required,
        pass: true,
        status,
        status_label: !required ? "未触发" : firstRows.length ? "压缩后首次派发" : "压缩后后续派发",
        summary: !required
            ? "本轮未记录压缩后派发 marker"
            : firstRows.length
                ? `已记录 ${firstRows.length} 个子 Agent 收到压缩恢复后的第一跳记忆包`
                : `已记录 ${rows.length} 个压缩后后续派发 marker`,
        marker_count: markerIds.length || Number(summary.post_compact_dispatch_marker_count || summary.postCompactDispatchMarkerCount || 0),
        first_dispatch_count: firstRows.length,
        marker_ids: markerIds.slice(0, 20),
        boundary_ids: boundaryIds.slice(0, 20),
        rows: rows.slice(0, 20),
    };
}
function normalizeReplayRepairDispatchBriefRef(item = {}, fallback = {}) {
    if (!item || typeof item !== "object")
        return null;
    const briefId = String(item.brief_id || item.briefId || "").trim();
    if (!briefId)
        return null;
    return {
        brief_id: briefId,
        work_item_id: String(item.work_item_id || item.workItemId || "").trim(),
        source: String(item.source || "").trim(),
        target_project: String(item.target_project || item.targetProject || fallback.project || "").trim(),
        proof_entry_id: String(item.proof_entry_id || item.proofEntryId || "").trim(),
        request_patch_checksum: String(item.request_patch_checksum || item.requestPatchChecksum || "").trim(),
        provider_reproof_status: String(item.provider_reproof_status || item.providerReproofStatus || "").trim(),
        provider_reproof_reason: String(item.provider_reproof_reason || item.providerReproofReason || "").trim(),
        reproof_candidate_id: String(item.reproof_candidate_id || item.reproofCandidateId || "").trim(),
        timeline_binding_id: String(item.timeline_binding_id || item.timelineBindingId || "").trim(),
        original_work_item_id: String(item.original_work_item_id || item.originalWorkItemId || "").trim(),
        request_telemetry_session_status: String(item.request_telemetry_session_status || item.requestTelemetrySessionStatus || "").trim(),
        request_telemetry_dispatch_status: String(item.request_telemetry_dispatch_status || item.requestTelemetryDispatchStatus || "").trim(),
        runner_request_id: String(item.runner_request_id || item.runnerRequestId || "").trim(),
        execution_id: String(item.execution_id || item.executionId || fallback.executionId || fallback.execution_id || "").trim(),
        should_create_real_task: item.should_create_real_task === false || item.shouldCreateRealTask === false ? false : false,
    };
}
function collectReplayRepairDispatchBriefRefs(value, fallback = {}, out = [], seen = new Set()) {
    if (!value || typeof value !== "object")
        return out;
    const push = (item) => {
        const normalized = normalizeReplayRepairDispatchBriefRef(item, fallback);
        if (!normalized)
            return;
        const key = normalized.brief_id;
        if (seen.has(key))
            return;
        seen.add(key);
        out.push(normalized);
    };
    push(value.replay_repair_dispatch_brief || value.replayRepairDispatchBrief || null);
    if (Array.isArray(value.replay_repair_dispatch_briefs || value.replayRepairDispatchBriefs)) {
        for (const item of value.replay_repair_dispatch_briefs || value.replayRepairDispatchBriefs)
            push(item);
    }
    const packet = value.worker_context_packet || value.workerContextPacket || null;
    if (packet && packet !== value) {
        if (Array.isArray(packet.replay_repair_dispatch_briefs || packet.replayRepairDispatchBriefs)) {
            for (const item of packet.replay_repair_dispatch_briefs || packet.replayRepairDispatchBriefs)
                push(item);
        }
    }
    const receipt = value.receipt || null;
    if (receipt && receipt !== value)
        collectReplayRepairDispatchBriefRefs(receipt, fallback, out, seen);
    return out;
}
function replayRepairDispatchBriefRefsForMention(mention, context = {}) {
    const packet = context.workerContextPacket || mention?.worker_context_packet || mention?.workerContextPacket || context.workerHandoff?.worker_context_packet || null;
    return collectReplayRepairDispatchBriefRefs({
        replay_repair_dispatch_brief: mention?.replay_repair_dispatch_brief || mention?.replayRepairDispatchBrief || null,
        replay_repair_dispatch_briefs: [
            ...(Array.isArray(mention?.replay_repair_dispatch_briefs || mention?.replayRepairDispatchBriefs) ? (mention.replay_repair_dispatch_briefs || mention.replayRepairDispatchBriefs) : []),
            ...(Array.isArray(packet?.replay_repair_dispatch_briefs || packet?.replayRepairDispatchBriefs) ? (packet.replay_repair_dispatch_briefs || packet.replayRepairDispatchBriefs) : []),
        ],
        worker_context_packet: packet,
        receipt: context.receipt || null,
    }, { project: context.targetName || mention?.targetName || mention?.project || "", executionId: context.executionId || context.execution_id || "" });
}
//# sourceMappingURL=collaboration-memory-gates.js.map