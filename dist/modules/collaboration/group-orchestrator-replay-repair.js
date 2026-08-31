"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.getReplayRepairWorkItemsFileForCoordinator = getReplayRepairWorkItemsFileForCoordinator;
exports.getReplayRepairDispatchPlansFileForCoordinator = getReplayRepairDispatchPlansFileForCoordinator;
exports.getReplayRepairDispatchBindingsFileForCoordinator = getReplayRepairDispatchBindingsFileForCoordinator;
exports.compactReplayRepairDispatchBriefsForWorkerContextRetry = compactReplayRepairDispatchBriefsForWorkerContextRetry;
exports.readReplayRepairDispatchPlanLedgerForCoordinator = readReplayRepairDispatchPlanLedgerForCoordinator;
exports.readReplayRepairDispatchBindingLedgerForCoordinator = readReplayRepairDispatchBindingLedgerForCoordinator;
exports.readReplayRepairDispatchTimelineBindingLedgerForCoordinator = readReplayRepairDispatchTimelineBindingLedgerForCoordinator;
exports.readReplayRepairWorkItemLedgerForCoordinator = readReplayRepairWorkItemLedgerForCoordinator;
exports.recordReplayRepairDispatchBriefTimelineBinding = recordReplayRepairDispatchBriefTimelineBinding;
exports.recordReplayRepairDispatchBriefAssignmentBinding = recordReplayRepairDispatchBriefAssignmentBinding;
exports.buildReplayRepairDispatchBriefForCoordinator = buildReplayRepairDispatchBriefForCoordinator;
exports.syncReplayRepairDispatchPlansForCoordinator = syncReplayRepairDispatchPlansForCoordinator;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_1 = require("./group-orchestrator");
function getReplayRepairWorkItemsFileForCoordinator(groupId, groupSessionId = "") {
    const safe = String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    if (!exactSessionId)
        return path.join(group_orchestrator_1.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${safe}.json`);
    const safeSession = String(exactSessionId).replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    return path.join(group_orchestrator_1.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, safe, `${safeSession}.json`);
}
function getReplayRepairDispatchPlansFileForCoordinator(groupId, groupSessionId = "") {
    const safe = String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    if (!exactSessionId)
        return path.join(group_orchestrator_1.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR, `${safe}.json`);
    const safeSession = String(exactSessionId).replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    return path.join(group_orchestrator_1.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR, safe, `${safeSession}.json`);
}
function getReplayRepairDispatchBindingsFileForCoordinator(groupId) {
    const safe = String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown";
    return path.join(group_orchestrator_1.GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_BINDINGS_DIR, `${safe}.json`);
}
function compactReplayRepairDispatchBriefsForWorkerContextRetry(briefs = [], options = {}) {
    const list = Array.isArray(briefs) ? briefs : [];
    if (!list.length)
        return { compacted: false, briefs: list, summary: null };
    const maxBriefs = Math.max(1, Number(options.maxBriefs || options.max_briefs || 12));
    const maxStringChars = Math.max(80, Number(options.maxStringChars || options.max_string_chars || 360));
    const idMaxChars = Math.max(80, Number(options.maxIdChars || options.max_id_chars || 220));
    const beforeText = JSON.stringify(list || []);
    const truncatedFields = [];
    const compactedBriefs = list.slice(0, maxBriefs).map((item = {}, index) => {
        const next = {};
        for (const field of group_orchestrator_1.WORKER_CONTEXT_REPLAY_BRIEF_PARTIAL_COMPACT_FIELDS) {
            const rawValue = (0, group_orchestrator_1.replayBriefPartialCompactValue)(item, field);
            const rawText = String(rawValue || "").trim();
            const limit = field === "provider_reproof_reason" ? maxStringChars : idMaxChars;
            const compacted = rawText.length > limit ? (0, group_orchestrator_1.compactText)(rawText, limit) : rawText;
            if (rawText.length > compacted.length) {
                truncatedFields.push({
                    index,
                    field,
                    original_chars: rawText.length,
                    compacted_chars: compacted.length,
                    original_hash: (0, group_orchestrator_1.hashCoordinator)(rawText, 16),
                });
            }
            next[field] = compacted;
        }
        next.required_receipt_reference = true;
        next.should_create_real_task = false;
        return next;
    });
    const afterText = JSON.stringify(compactedBriefs || []);
    const omittedByBriefLimit = list.length > compactedBriefs.length
        ? beforeText.length - JSON.stringify(list.slice(0, maxBriefs) || []).length
        : 0;
    const compacted = afterText.length < beforeText.length;
    const summary = compacted ? {
        schema: "ccm-worker-context-replay-brief-partial-compaction-v1",
        method: "preserve_replay_brief_ids_receipts_and_provider_proof_fields",
        category: "replay_repair_dispatch_briefs",
        status: "compacted",
        original_brief_count: list.length,
        compacted_brief_count: compactedBriefs.length,
        original_briefs_hash: (0, group_orchestrator_1.hashCoordinator)(beforeText, 24),
        compacted_briefs_hash: (0, group_orchestrator_1.hashCoordinator)(afterText, 24),
        original_briefs_chars: beforeText.length,
        compacted_briefs_chars: afterText.length,
        omitted_chars: Math.max(0, beforeText.length - afterText.length),
        omitted_by_brief_limit_chars: Math.max(0, omittedByBriefLimit),
        max_string_chars: maxStringChars,
        max_id_chars: idMaxChars,
        preserved_fields: group_orchestrator_1.WORKER_CONTEXT_REPLAY_BRIEF_PARTIAL_COMPACT_FIELDS,
        truncated_field_count: truncatedFields.length,
        truncated_fields: truncatedFields.slice(0, 24),
        preserves_receipt_reference: true,
        preserves_real_task_suppression: true,
        generated_at: new Date().toISOString(),
    } : null;
    return { compacted, briefs: compactedBriefs, summary };
}
function readReplayRepairDispatchPlanLedgerForCoordinator(groupId, groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    const file = getReplayRepairDispatchPlansFileForCoordinator(groupId, exactSessionId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger?.schema === "ccm-replay-repair-main-agent-dispatch-brief-ledger-v1") {
            return { ...ledger, groupSessionId: exactSessionId, file: ledger.file || file };
        }
    }
    catch { }
    return {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-ledger-v1",
        version: 1,
        groupId,
        groupSessionId: exactSessionId,
        file,
        updatedAt: "",
        briefCount: 0,
        readyCount: 0,
        supersededCount: 0,
        briefs: [],
    };
}
function readReplayRepairDispatchBindingLedgerForCoordinator(groupId) {
    const file = getReplayRepairDispatchBindingsFileForCoordinator(groupId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger?.schema === "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1") {
            return {
                ...ledger,
                file: ledger.file || file,
                entries: Array.isArray(ledger.entries) ? ledger.entries : [],
            };
        }
    }
    catch { }
    return {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: 1,
        groupId,
        file,
        updatedAt: "",
        bindingCount: 0,
        nativeBindingCount: 0,
        entries: [],
    };
}
function readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId) {
    const file = (0, group_orchestrator_1.getReplayRepairDispatchTimelineBindingsFileForCoordinator)(groupId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger?.schema === "ccm-replay-repair-main-agent-dispatch-brief-timeline-ledger-v1") {
            return {
                ...ledger,
                file: ledger.file || file,
                entries: Array.isArray(ledger.entries) ? ledger.entries : [],
            };
        }
    }
    catch { }
    return {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-ledger-v1",
        version: 1,
        groupId,
        file,
        updatedAt: "",
        bindingCount: 0,
        nativeBindingCount: 0,
        entries: [],
    };
}
function readReplayRepairWorkItemLedgerForCoordinator(groupId) {
    const file = getReplayRepairWorkItemsFileForCoordinator(groupId);
    try {
        const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (ledger && typeof ledger === "object") {
            return {
                ...ledger,
                schema: ledger.schema || "ccm-compact-boundary-replay-repair-work-items-v1",
                version: ledger.version || 1,
                groupId: ledger.groupId || groupId,
                file: ledger.file || file,
                items: Array.isArray(ledger.items) ? ledger.items : [],
            };
        }
    }
    catch { }
    return {
        schema: "ccm-compact-boundary-replay-repair-work-items-v1",
        version: 1,
        groupId,
        file,
        updatedAt: "",
        stats: (0, group_orchestrator_1.replayRepairWorkItemStatsForCoordinator)([]),
        items: [],
    };
}
function recordReplayRepairDispatchBriefTimelineBinding(groupId, input = {}, options = {}) {
    const brief = input.brief || input.replay_repair_dispatch_brief || input.replayRepairDispatchBrief || input;
    const briefId = String(brief.brief_id || brief.briefId || input.brief_id || "").trim();
    if (!groupId || !briefId)
        return null;
    const at = String(options.at || input.at || new Date().toISOString());
    const groupSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(input.groupSessionId || input.group_session_id || brief.groupSessionId || brief.group_session_id || "");
    const typedMemoryScopeId = groupSessionId ? `${groupId}--${groupSessionId}` : groupId;
    const event = input.timeline_event || input.timelineEvent || null;
    const eventType = String(input.timeline_event_type || input.timelineEventType || event?.type || options.timelineEventType || "").trim();
    const consumption = (0, group_orchestrator_1.classifyReplayRepairBriefConsumptionForCoordinator)(brief, input.receipt || input.ccm_receipt || input.delivery_summary || null);
    const postCompactReinjectionProof = consumption?.postCompactReinjectionProof || {};
    const postCompactReceiptMemoryUsageRepairProof = consumption?.postCompactReceiptMemoryUsageRepairProof || {};
    const assignmentId = String(input.assignment_id || input.assignmentId || "").trim();
    const dispatchKey = String(input.dispatch_key || input.dispatchKey || "").trim();
    const taskId = String(input.task_id || input.taskId || "").trim();
    const project = String(input.project || input.target_project || input.targetProject || brief.target_project || brief.targetProject || "").trim();
    const taskAgentSessionId = String(input.task_agent_session_id || input.taskAgentSessionId || "").trim();
    const nativeSessionId = String(input.native_session_id || input.nativeSessionId || "").trim();
    const postCompactTaskSessionMatched = !!taskAgentSessionId
        && postCompactReinjectionProof.receiptTaskAgentSessionId === taskAgentSessionId;
    const postCompactNativeSessionMatched = !!nativeSessionId
        && postCompactReinjectionProof.receiptNativeSessionId === nativeSessionId;
    const postCompactReceiptMemoryUsageRepairTaskSessionMatched = !!taskAgentSessionId
        && postCompactReceiptMemoryUsageRepairProof.receiptTaskAgentSessionId === taskAgentSessionId;
    const postCompactReceiptMemoryUsageRepairNativeSessionMatched = !!nativeSessionId
        && postCompactReceiptMemoryUsageRepairProof.receiptNativeSessionId === nativeSessionId;
    const providerRankingProof = consumption?.providerRankingProof || {};
    const timelineBindingId = `replay-repair-brief-timeline:${(0, group_orchestrator_1.hashCoordinator)([
        groupId,
        groupSessionId,
        taskId,
        project,
        briefId,
        assignmentId,
        dispatchKey,
    ], 14)}`;
    const entry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-binding-v1",
        timeline_binding_id: timelineBindingId,
        groupId,
        groupSessionId,
        group_session_id: groupSessionId,
        task_id: taskId,
        project,
        brief_id: briefId,
        work_item_id: brief.work_item_id || brief.workItemId || input.work_item_id || "",
        source: brief.source || input.source || "",
        component: brief.component || input.component || "",
        assignment_id: assignmentId,
        dispatch_key: dispatchKey,
        worker_context_packet_id: input.worker_context_packet_id || input.workerContextPacketId || "",
        worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || "",
        memory_context_snapshot_id: input.memory_context_snapshot_id || input.memoryContextSnapshotId || "",
        memory_context_snapshot_checksum: input.memory_context_snapshot_checksum || input.memoryContextSnapshotChecksum || "",
        task_agent_session_id: taskAgentSessionId,
        native_session_id: nativeSessionId,
        execution_id: input.execution_id || input.executionId || brief.execution_id || brief.executionId || "",
        proof_entry_id: brief.proof_entry_id || brief.proofEntryId || input.proof_entry_id || "",
        reinjection_gate_id: brief.reinjection_gate_id || brief.reinjectionGateId || input.reinjection_gate_id || "",
        post_compact_candidate_id: brief.post_compact_candidate_id || brief.postCompactCandidateId || input.post_compact_candidate_id || "",
        post_compact_candidate_kind: brief.post_compact_candidate_kind || brief.postCompactCandidateKind || input.post_compact_candidate_kind || "",
        post_compact_candidate_value: brief.post_compact_candidate_value || brief.postCompactCandidateValue || input.post_compact_candidate_value || "",
        post_compact_candidate_source_message_id: brief.post_compact_candidate_source_message_id || brief.postCompactCandidateSourceMessageId || input.post_compact_candidate_source_message_id || "",
        original_worker_context_packet_id: brief.original_worker_context_packet_id || brief.originalWorkerContextPacketId || "",
        original_binding_id: brief.original_binding_id || brief.originalBindingId || "",
        original_assignment_id: brief.original_assignment_id || brief.originalAssignmentId || "",
        original_dispatch_key: brief.original_dispatch_key || brief.originalDispatchKey || "",
        original_task_agent_session_id: brief.original_task_agent_session_id || brief.originalTaskAgentSessionId || "",
        original_native_session_id: brief.original_native_session_id || brief.originalNativeSessionId || "",
        post_compact_receipt_memory_required_doc_rel_paths: (0, group_orchestrator_1.uniqueCoordinatorStrings)(brief.post_compact_receipt_memory_required_doc_rel_paths || []).slice(0, 12),
        post_compact_receipt_memory_gap_codes: (0, group_orchestrator_1.uniqueCoordinatorStrings)(brief.post_compact_receipt_memory_gap_codes || []).slice(0, 24),
        request_patch_checksum: brief.request_patch_checksum || brief.requestPatchChecksum || input.request_patch_checksum || "",
        provider_reproof_status: brief.provider_reproof_status || brief.providerReproofStatus || input.provider_reproof_status || "",
        provider_reproof_reason: brief.provider_reproof_reason || brief.providerReproofReason || input.provider_reproof_reason || "",
        reproof_candidate_id: brief.reproof_candidate_id || brief.reproofCandidateId || input.reproof_candidate_id || "",
        original_timeline_binding_id: brief.timeline_binding_id || brief.original_timeline_binding_id || input.original_timeline_binding_id || "",
        original_work_item_id: brief.original_work_item_id || brief.originalWorkItemId || input.original_work_item_id || "",
        request_telemetry_session_status: brief.request_telemetry_session_status || brief.requestTelemetrySessionStatus || input.request_telemetry_session_status || "",
        request_telemetry_dispatch_status: brief.request_telemetry_dispatch_status || brief.requestTelemetryDispatchStatus || input.request_telemetry_dispatch_status || "",
        runner_request_id: brief.runner_request_id || brief.runnerRequestId || input.runner_request_id || "",
        receipt_status: input.receipt_status || input.receiptStatus || "",
        replay_repair_consumption_status: consumption?.status || "",
        replay_repair_consumption_reason: consumption?.reason || "",
        replay_repair_consumption_source: consumption?.source || "",
        replay_repair_consumption_state: consumption?.state || "",
        post_compact_reinjection_receipt_usage_state: postCompactReinjectionProof.usageState || "",
        post_compact_reinjection_receipt_reason: postCompactReinjectionProof.reason || "",
        post_compact_reinjection_current_source_verified: postCompactReinjectionProof.currentSourceVerified === true,
        post_compact_reinjection_memory_receipt_matched: postCompactReinjectionProof.memoryReceiptMatched === true,
        post_compact_reinjection_receipt_task_agent_session_id: postCompactReinjectionProof.receiptTaskAgentSessionId || "",
        post_compact_reinjection_receipt_native_session_id: postCompactReinjectionProof.receiptNativeSessionId || "",
        post_compact_reinjection_task_session_matched: postCompactTaskSessionMatched,
        post_compact_reinjection_native_session_matched: postCompactNativeSessionMatched,
        post_compact_reinjection_receipt_gaps: Array.isArray(postCompactReinjectionProof.gaps) ? postCompactReinjectionProof.gaps : [],
        post_compact_reinjection_receipt_verified: postCompactReinjectionProof.verified === true
            && postCompactTaskSessionMatched
            && postCompactNativeSessionMatched,
        post_compact_receipt_memory_usage_repair_required_doc_rel_paths: postCompactReceiptMemoryUsageRepairProof.requiredDocRelPaths || [],
        post_compact_receipt_memory_usage_repair_covered_doc_rel_paths: postCompactReceiptMemoryUsageRepairProof.coveredDocRelPaths || [],
        post_compact_receipt_memory_usage_repair_coverage_rows: postCompactReceiptMemoryUsageRepairProof.coverageRows || [],
        post_compact_receipt_memory_usage_repair_historical_boundary_covered: postCompactReceiptMemoryUsageRepairProof.historicalBoundaryCovered === true,
        post_compact_receipt_memory_usage_repair_all_docs_compliant: postCompactReceiptMemoryUsageRepairProof.allDocsCompliant === true,
        post_compact_receipt_memory_usage_repair_receipt_task_agent_session_id: postCompactReceiptMemoryUsageRepairProof.receiptTaskAgentSessionId || "",
        post_compact_receipt_memory_usage_repair_receipt_native_session_id: postCompactReceiptMemoryUsageRepairProof.receiptNativeSessionId || "",
        post_compact_receipt_memory_usage_repair_task_session_matched: postCompactReceiptMemoryUsageRepairTaskSessionMatched,
        post_compact_receipt_memory_usage_repair_native_session_matched: postCompactReceiptMemoryUsageRepairNativeSessionMatched,
        post_compact_receipt_memory_usage_repair_gaps: postCompactReceiptMemoryUsageRepairProof.gaps || [],
        post_compact_receipt_memory_usage_repair_verified: postCompactReceiptMemoryUsageRepairProof.verified === true
            && postCompactReceiptMemoryUsageRepairTaskSessionMatched
            && postCompactReceiptMemoryUsageRepairNativeSessionMatched,
        provider_switch_decision_receipt_id: providerRankingProof.receiptId
            || brief.provider_switch_decision_receipt_id
            || brief.providerSwitchDecisionReceiptId
            || input.provider_switch_decision_receipt_id
            || input.providerSwitchDecisionReceiptId
            || "",
        provider_switch_decision_receipt_checksum: providerRankingProof.receiptChecksum
            || brief.provider_switch_decision_receipt_checksum
            || brief.providerSwitchDecisionReceiptChecksum
            || input.provider_switch_decision_receipt_checksum
            || input.providerSwitchDecisionReceiptChecksum
            || "",
        provider_ranking_provenance_rel_paths: providerRankingProof.typedMemoryRelPaths?.length
            ? providerRankingProof.typedMemoryRelPaths
            : (0, group_orchestrator_1.providerRankingProvenanceProofStringListForCoordinator)(brief.provider_ranking_provenance_rel_paths, brief.providerRankingProvenanceRelPaths, input.provider_ranking_provenance_rel_paths, input.providerRankingProvenanceRelPaths).slice(0, 24),
        provider_ranking_provenance_row_ids: providerRankingProof.typedMemoryRowIds?.length
            ? providerRankingProof.typedMemoryRowIds
            : (0, group_orchestrator_1.providerRankingProvenanceProofStringListForCoordinator)(brief.provider_ranking_provenance_row_ids, brief.providerRankingProvenanceRowIds, input.provider_ranking_provenance_row_ids, input.providerRankingProvenanceRowIds).slice(0, 32),
        provider_ranking_provenance_preserved: providerRankingProof.preserved === true,
        provider_ranking_provenance_required: providerRankingProof.required === true,
        provider_ranking_provenance_repair_status: providerRankingProof.repairStatus || "",
        provider_ranking_provenance_repair_gap_type: providerRankingProof.repairGapType || "",
        provider_ranking_provenance_receipt_consumption_verified: providerRankingProof.verified === true,
        should_create_real_task: false,
        event_types: eventType ? [eventType] : [],
        event_refs: eventType || event?.id ? [{
                type: eventType || event?.type || "",
                id: event?.id || input.timeline_event_id || input.timelineEventId || "",
                at: event?.at || at,
                worker_context_packet_id: input.worker_context_packet_id || input.workerContextPacketId || "",
                memory_context_snapshot_id: input.memory_context_snapshot_id || input.memoryContextSnapshotId || "",
                task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || "",
                execution_id: input.execution_id || input.executionId || brief.execution_id || brief.executionId || "",
            }] : [],
        at,
        updated_at: at,
    };
    const ledger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const existingIndex = entries.findIndex((item) => item.timeline_binding_id === timelineBindingId);
    if (existingIndex >= 0)
        entries[existingIndex] = (0, group_orchestrator_1.mergeReplayRepairTimelineBinding)(entries[existingIndex], entry);
    else
        entries.push({ ...entry, first_seen_at: at });
    const next = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-ledger-v1",
        version: 1,
        groupId,
        file: ledger.file || (0, group_orchestrator_1.getReplayRepairDispatchTimelineBindingsFileForCoordinator)(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        nativeBindingCount: entries.filter((item) => (0, group_orchestrator_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(item.source)).length,
        entries: entries.slice(-160),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    const finalEntry = existingIndex >= 0 ? entries[existingIndex] : entry;
    if (eventType === "child_agent_receipt") {
        (0, group_orchestrator_1.attachReplayRepairAssignmentReceiptForCoordinator)(groupId, finalEntry, input.receipt || input.ccm_receipt || input.delivery_summary || null, at);
    }
    if (String(finalEntry.source || "") === "api_microcompact_native_apply_provider_reproof"
        && ["strong", "used", "verified", "ignored", "blocked"].includes(String(finalEntry.replay_repair_consumption_status || "").trim().toLowerCase())) {
        try {
            (0, group_memory_index_1.distillProviderReproofReceiptConsumptionToTypedMemory)(typedMemoryScopeId, { rows: [finalEntry] }, {
                reason: "replay-repair-timeline-receipt-consumption",
                sourceGroupId: groupId,
                groupSessionId,
                updatedAt: at,
            });
        }
        catch { }
    }
    if (String(finalEntry.source || "") === "worker_context_provider_ranking_provenance_compact_repair"
        && finalEntry.provider_ranking_provenance_receipt_consumption_verified === true
        && String(finalEntry.replay_repair_consumption_status || "").trim().toLowerCase() === "verified") {
        try {
            (0, group_memory_index_1.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory)(typedMemoryScopeId, { rows: [finalEntry] }, {
                reason: "provider-ranking-provenance-compact-repair-receipt-consumption",
                sourceGroupId: groupId,
                groupSessionId,
                updatedAt: at,
            });
        }
        catch { }
    }
    const completion = (0, group_orchestrator_1.closeReplayRepairWorkItemsFromTimelineBindingForCoordinator)(groupId, finalEntry, at);
    if (completion.closed > 0
        && (0, group_orchestrator_1.isPostCompactReinjectionRepairForCoordinator)(finalEntry)
        && (0, group_orchestrator_1.timelineBindingHasRequiredPostCompactReinjectionRepairEvidence)(finalEntry)) {
        try {
            (0, group_memory_index_1.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory)(typedMemoryScopeId, {
                rows: [{
                        ...finalEntry,
                        completion_source: "post_compact_reinjection_replay_repair_receipt_consumption",
                        resolution_reason: "post_compact_reinjection_repair_receipt_verified",
                        completed_at: at,
                    }],
            }, {
                reason: "post-compact-reinjection-repair-receipt-consumption",
                sourceGroupId: groupId,
                groupSessionId,
                updatedAt: at,
            });
        }
        catch { }
    }
    if (completion.closed > 0
        && (0, group_orchestrator_1.isPostCompactReceiptMemoryUsageRepairForCoordinator)(finalEntry)
        && (0, group_orchestrator_1.timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence)(finalEntry)) {
        try {
            (0, group_memory_index_1.distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory)(typedMemoryScopeId, {
                rows: [{
                        ...finalEntry,
                        completion_source: "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption",
                        resolution_reason: "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified",
                        completed_at: at,
                    }],
            }, {
                reason: "post-compact-receipt-memory-usage-repair-completion",
                sourceGroupId: groupId,
                groupSessionId,
                updatedAt: at,
            });
        }
        catch { }
    }
    return completion.closed > 0 ? { ...finalEntry, repair_work_item_completion: completion } : finalEntry;
}
function recordReplayRepairDispatchBriefAssignmentBinding(groupId, assignment = {}, match = {}, options = {}) {
    const brief = match?.brief || match || {};
    if (!groupId || !brief.brief_id || !assignment?.project)
        return null;
    const at = String(options.at || new Date().toISOString());
    const ledger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
    const entries = Array.isArray(ledger.entries) ? [...ledger.entries] : [];
    const workerContextPacket = assignment.worker_context_packet || assignment.workerContextPacket || null;
    const packetProbe = (0, group_orchestrator_1.buildReplayRepairWorkerContextPacketProbeForCoordinator)(assignment, brief);
    const bindingId = `replay-repair-brief-assignment:${(0, group_orchestrator_1.hashCoordinator)([
        groupId,
        brief.brief_id,
        assignment.assignmentId || assignment.assignment_id || "",
        assignment.dispatchKey || assignment.dispatch_key || "",
    ], 14)}`;
    const entry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
        binding_id: bindingId,
        groupId,
        brief_id: brief.brief_id || "",
        work_item_id: brief.work_item_id || "",
        source: brief.source || "",
        component: brief.component || "",
        project: assignment.project || assignment.targetName || "",
        assignment_id: assignment.assignmentId || assignment.assignment_id || "",
        dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
        task_fingerprint: assignment.taskFingerprint || assignment.task_fingerprint || "",
        worker_context_packet_id: assignment.worker_context_packet?.packet_id || assignment.workerContextPacket?.packet_id || "",
        source_worker_context_packet_id: brief.worker_context_packet_id || "",
        source_worker_context_packet_binding_id: brief.worker_context_packet_binding_id || brief.binding_id || "",
        source_worker_context_packet_memory_policy_reason: brief.worker_context_packet_memory_policy_reason || "",
        reinjection_gate_id: brief.reinjection_gate_id || "",
        post_compact_candidate_id: brief.post_compact_candidate_id || "",
        post_compact_candidate_kind: brief.post_compact_candidate_kind || "",
        post_compact_candidate_value: brief.post_compact_candidate_value || "",
        post_compact_candidate_source_message_id: brief.post_compact_candidate_source_message_id || "",
        original_worker_context_packet_id: brief.original_worker_context_packet_id || "",
        original_binding_id: brief.original_binding_id || "",
        original_assignment_id: brief.original_assignment_id || "",
        original_dispatch_key: brief.original_dispatch_key || "",
        original_task_agent_session_id: brief.original_task_agent_session_id || "",
        original_native_session_id: brief.original_native_session_id || "",
        post_compact_receipt_memory_required_doc_rel_paths: brief.post_compact_receipt_memory_required_doc_rel_paths || [],
        worker_context_packet_context_usage: packetProbe.context_usage,
        worker_context_packet_acceptance: workerContextPacket?.acceptance || null,
        post_compact_reinjection_repair_receipt_memory_contract: workerContextPacket?.post_compact_reinjection_repair_receipt_memory_contract
            || workerContextPacket?.postCompactReinjectionRepairReceiptMemoryContract
            || null,
        worker_context_packet_post_compact_reinjection_repair_receipt_memory_contract: workerContextPacket?.post_compact_reinjection_repair_receipt_memory_contract
            || workerContextPacket?.postCompactReinjectionRepairReceiptMemoryContract
            || null,
        provider_ranking_compact_repair_receipt_memory_contract: workerContextPacket?.provider_ranking_compact_repair_receipt_memory_contract
            || workerContextPacket?.providerRankingCompactRepairReceiptMemoryContract
            || null,
        worker_context_provider_dispatch_decision: assignment.worker_context_provider_dispatch_decision
            || assignment.workerContextProviderDispatchDecision
            || assignment.provider_dispatch_decision
            || assignment.providerDispatchDecision
            || null,
        worker_context_provider_dispatch_override_receipt: (assignment.worker_context_provider_dispatch_decision
            || assignment.workerContextProviderDispatchDecision
            || assignment.provider_dispatch_decision
            || assignment.providerDispatchDecision
            || {})?.provider_dispatch_override_receipt
            || null,
        proof_entry_id: brief.proof_entry_id || "",
        request_patch_checksum: brief.request_patch_checksum || "",
        provider_reproof_status: brief.provider_reproof_status || "",
        provider_reproof_reason: brief.provider_reproof_reason || "",
        reproof_candidate_id: brief.reproof_candidate_id || "",
        timeline_binding_id: brief.timeline_binding_id || "",
        original_work_item_id: brief.original_work_item_id || "",
        request_telemetry_session_status: brief.request_telemetry_session_status || "",
        request_telemetry_dispatch_status: brief.request_telemetry_dispatch_status || "",
        runner_request_id: brief.runner_request_id || "",
        execution_id: brief.execution_id || "",
        should_create_real_task: false,
        worker_context_packet_replay_briefs: packetProbe.briefs,
        worker_context_packet_render_probe: {
            packet_id: packetProbe.packet_id,
            replay_repair_dispatch_brief_count: packetProbe.replay_repair_dispatch_brief_count,
            matching_brief: packetProbe.matching_brief,
            rendered_flags: packetProbe.rendered_flags,
            rendered_excerpt: packetProbe.rendered_excerpt,
        },
        match_score: Number(match.match_score || 0),
        matched_by: Array.isArray(match.matched_by) ? match.matched_by : [],
        at,
    };
    const existingIndex = entries.findIndex((item) => item.binding_id === bindingId);
    if (existingIndex >= 0)
        entries[existingIndex] = { ...entries[existingIndex], ...entry, first_seen_at: entries[existingIndex].first_seen_at || entries[existingIndex].at || at, at };
    else
        entries.push({ ...entry, first_seen_at: at });
    const next = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: 1,
        groupId,
        file: ledger.file || getReplayRepairDispatchBindingsFileForCoordinator(groupId),
        updatedAt: at,
        bindingCount: entries.length,
        nativeBindingCount: entries.filter((item) => (0, group_orchestrator_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(item.source)).length,
        workerContextPacketBindingCount: entries.filter((item) => item.worker_context_packet_id).length,
        providerDispatchDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.schema === "ccm-worker-context-provider-dispatch-decision-v1").length,
        providerDispatchHoldDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "hold_until_repair").length,
        providerDispatchReadyDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.dispatch_ready === true).length,
        providerDispatchOverrideDecisionCount: entries.filter((item) => item.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override").length,
        entries: entries.slice(-120),
    };
    (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
    return entry;
}
function buildReplayRepairDispatchBriefForCoordinator(groupId, candidate = {}, index = 0, existing = {}, at = new Date().toISOString()) {
    const workItemId = String(candidate.work_item_id || candidate.workItemId || `repair-${index}`).trim();
    const targetProject = (0, group_orchestrator_1.compactText)(candidate.dispatch_target || candidate.targetProject || candidate.target_project || candidate.repair_target || "memory-context", 120);
    const nativeBinding = (0, group_orchestrator_1.candidateNativeBindingForCoordinator)(candidate);
    const nativeProofSource = (0, group_orchestrator_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(candidate.source);
    const ignoreMemoryReceiptSource = String(candidate.source || "") === "worker_context_ignore_memory_receipt_repair";
    const pressureMemoryProvenanceReceiptSource = String(candidate.source || "") === "worker_context_pressure_memory_provenance_receipt_repair";
    const providerOverrideFollowupReceiptValidationSource = String(candidate.source || "") === "worker_context_provider_dispatch_override_followup_receipt_contract_validation_repair";
    const providerRankingProvenanceCompactRepairSource = String(candidate.source || "") === "worker_context_provider_ranking_provenance_compact_repair";
    const providerRankingMemoryUsageReceiptRepairSource = String(candidate.source || "") === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair";
    const postCompactReceiptMemoryUsageRepairSource = String(candidate.source || "") === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair";
    const postCompactCompletionPreservationRepairSource = String(candidate.source || "") === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair";
    const readPlanRevalidationRepairSource = String(candidate.source || "") === "compact_read_plan_revalidation_repair";
    const postCompactReinjectionRepairSource = String(candidate.source || "") === "compact_boundary_replay_repair"
        && String(candidate.component || "") === "post_compact_reinject";
    const revalidationGateId = String(candidate.revalidation_gate_id || candidate.revalidationGateId || "").trim();
    const readPlanId = String(candidate.read_plan_id || candidate.readPlanId || "").trim();
    const referenceId = String(candidate.reference_id || candidate.referenceId || "").trim();
    const reinjectionGateId = String(candidate.reinjection_gate_id || candidate.reinjectionGateId || "").trim();
    const postCompactCandidateId = String(candidate.post_compact_candidate_id || candidate.postCompactCandidateId || "").trim();
    const postCompactCandidateKind = String(candidate.post_compact_candidate_kind || candidate.postCompactCandidateKind || "").trim();
    const postCompactCandidateValue = (0, group_orchestrator_1.compactText)(candidate.post_compact_candidate_value || candidate.postCompactCandidateValue || "", 520);
    const postCompactCandidateSourceMessageId = String(candidate.post_compact_candidate_source_message_id || candidate.postCompactCandidateSourceMessageId || "").trim();
    const expectedTaskAgentSessionId = String(candidate.expected_task_agent_session_id || candidate.expectedTaskAgentSessionId || "").trim();
    const expectedNativeSessionId = String(candidate.expected_native_session_id || candidate.expectedNativeSessionId || "").trim();
    const receiptTaskAgentSessionId = String(candidate.receipt_task_agent_session_id || candidate.receiptTaskAgentSessionId || "").trim();
    const receiptNativeSessionId = String(candidate.receipt_native_session_id || candidate.receiptNativeSessionId || "").trim();
    const pressureProvenanceRelPaths = Array.isArray(candidate.pressure_memory_provenance_rel_paths)
        ? candidate.pressure_memory_provenance_rel_paths.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const pressureProvenanceRepairIds = Array.isArray(candidate.pressure_memory_provenance_repair_work_item_ids)
        ? candidate.pressure_memory_provenance_repair_work_item_ids.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const pressureProvenanceGapCodes = Array.isArray(candidate.pressure_memory_provenance_gap_codes)
        ? candidate.pressure_memory_provenance_gap_codes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerOverrideFollowupRelPaths = Array.isArray(candidate.provider_override_followup_contract_rel_paths)
        ? candidate.provider_override_followup_contract_rel_paths.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerOverrideFollowupWorkItemIds = Array.isArray(candidate.provider_override_followup_contract_work_item_ids)
        ? candidate.provider_override_followup_contract_work_item_ids.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerOverrideFollowupOverrideIds = Array.isArray(candidate.provider_override_followup_contract_override_ids)
        ? candidate.provider_override_followup_contract_override_ids.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerOverrideFollowupGapCodes = Array.isArray(candidate.provider_override_followup_contract_gap_codes)
        ? candidate.provider_override_followup_contract_gap_codes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerRankingProvenanceRelPaths = Array.isArray(candidate.provider_ranking_provenance_rel_paths)
        ? candidate.provider_ranking_provenance_rel_paths.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerRankingProvenanceRowIds = Array.isArray(candidate.provider_ranking_provenance_row_ids)
        ? candidate.provider_ranking_provenance_row_ids.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 16)
        : [];
    const providerRankingProvenanceGapCodes = Array.isArray(candidate.provider_ranking_provenance_gap_codes)
        ? candidate.provider_ranking_provenance_gap_codes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerRankingProvenanceMissingRelPaths = Array.isArray(candidate.provider_ranking_provenance_missing_rel_paths)
        ? candidate.provider_ranking_provenance_missing_rel_paths.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerRankingProvenanceMissingRowIds = Array.isArray(candidate.provider_ranking_provenance_missing_row_ids)
        ? candidate.provider_ranking_provenance_missing_row_ids.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 16)
        : [];
    const providerRankingMemoryReceiptRequiredDocRelPaths = providerRankingMemoryUsageReceiptRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)([
            ...(Array.isArray(candidate.provider_ranking_memory_receipt_required_doc_rel_paths) ? candidate.provider_ranking_memory_receipt_required_doc_rel_paths : []),
            ...providerRankingProvenanceRelPaths,
        ]).slice(0, 12)
        : [];
    const providerRankingMemoryReceiptMissingDocRelPaths = providerRankingMemoryUsageReceiptRepairSource && Array.isArray(candidate.provider_ranking_memory_receipt_missing_doc_rel_paths)
        ? candidate.provider_ranking_memory_receipt_missing_doc_rel_paths.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const providerRankingMemoryReceiptMissingUsageStateDocRelPaths = providerRankingMemoryUsageReceiptRepairSource && Array.isArray(candidate.provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths)
        ? candidate.provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
        : [];
    const postCompactReceiptMemoryRequiredDocRelPaths = postCompactReceiptMemoryUsageRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.post_compact_receipt_memory_required_doc_rel_paths || []).slice(0, 12)
        : [];
    const postCompactReceiptMemoryMissingDocRelPaths = postCompactReceiptMemoryUsageRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.post_compact_receipt_memory_missing_doc_rel_paths || []).slice(0, 12)
        : [];
    const postCompactReceiptMemoryMissingCurrentSourceVerifiedDocRelPaths = postCompactReceiptMemoryUsageRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths || []).slice(0, 12)
        : [];
    const postCompactReceiptMemoryMissingIgnoredReasonDocRelPaths = postCompactReceiptMemoryUsageRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths || []).slice(0, 12)
        : [];
    const postCompactReceiptMemoryGapCodes = postCompactReceiptMemoryUsageRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.post_compact_receipt_memory_gap_codes || []).slice(0, 12)
        : [];
    const completionPreservationGapCodes = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_gap_codes || []).slice(0, 24)
        : [];
    const completionPreservationCompletionDocRelPaths = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_completion_doc_rel_paths || []).slice(0, 24)
        : [];
    const completionPreservationRequiredDocRelPaths = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_required_doc_rel_paths || []).slice(0, 24)
        : [];
    const completionPreservationWorkItemIds = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_work_item_ids || []).slice(0, 32)
        : [];
    const completionPreservationTimelineBindingIds = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_timeline_binding_ids || []).slice(0, 32)
        : [];
    const completionPreservationHistoricalTaskAgentSessionIds = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_historical_task_agent_session_ids || []).slice(0, 32)
        : [];
    const completionPreservationHistoricalNativeSessionIds = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_historical_native_session_ids || []).slice(0, 32)
        : [];
    const completionPreservationConflictResolutionDocRelPaths = postCompactCompletionPreservationRepairSource
        ? (0, group_orchestrator_1.uniqueCoordinatorStrings)(candidate.completion_preservation_conflict_resolution_doc_rel_paths || []).slice(0, 8)
        : [];
    const briefId = `replay-repair-dispatch-brief:${(0, group_orchestrator_1.hashCoordinator)([groupId, workItemId, targetProject, candidate.candidate_id || ""], 14)}`;
    const workerTask = [
        `主 Agent Replay Repair 工作简报：${targetProject}`,
        "",
        `目标：修复群聊 ${groupId} 的压缩/记忆上下文恢复缺口。`,
        `来源候选：${candidate.candidate_id || ""}`,
        `work_item_id：${workItemId}`,
        `组件：${candidate.component || "replay_renderer"}`,
        `优先级：${candidate.priority || "medium"}`,
        candidate.source ? `来源类型：${candidate.source}` : "",
        nativeBinding.length ? `native proof 绑定：${nativeBinding.join("；")}` : "",
        pressureMemoryProvenanceReceiptSource && pressureProvenanceRelPaths.length ? `pressure memory docs：${pressureProvenanceRelPaths.join("；")}` : "",
        pressureMemoryProvenanceReceiptSource && pressureProvenanceRepairIds.length ? `pressure repair work items：${pressureProvenanceRepairIds.join("；")}` : "",
        pressureMemoryProvenanceReceiptSource && pressureProvenanceGapCodes.length ? `provenance receipt gaps：${pressureProvenanceGapCodes.join("；")}` : "",
        providerOverrideFollowupReceiptValidationSource && candidate.provider_override_followup_contract_validation_id ? `contract validation：${candidate.provider_override_followup_contract_validation_id}` : "",
        providerOverrideFollowupReceiptValidationSource && providerOverrideFollowupRelPaths.length ? `required relPath：${providerOverrideFollowupRelPaths.join("；")}` : "",
        providerOverrideFollowupReceiptValidationSource && providerOverrideFollowupWorkItemIds.length ? `required follow-up work items：${providerOverrideFollowupWorkItemIds.join("；")}` : "",
        providerOverrideFollowupReceiptValidationSource && providerOverrideFollowupOverrideIds.length ? `required provider override ids：${providerOverrideFollowupOverrideIds.join("；")}` : "",
        providerOverrideFollowupReceiptValidationSource && providerOverrideFollowupGapCodes.length ? `validation gaps：${providerOverrideFollowupGapCodes.join("；")}` : "",
        providerRankingProvenanceCompactRepairSource && candidate.provider_switch_decision_receipt_id ? `provider_switch_decision_receipt_id：${candidate.provider_switch_decision_receipt_id}` : "",
        providerRankingProvenanceCompactRepairSource && candidate.provider_switch_decision_receipt_checksum ? `provider_switch_decision_receipt_checksum：${candidate.provider_switch_decision_receipt_checksum}` : "",
        providerRankingProvenanceCompactRepairSource && candidate.compact_retry_id ? `compact retry：${candidate.compact_retry_id}` : "",
        providerRankingProvenanceCompactRepairSource && candidate.compact_outcome_id ? `compact outcome：${candidate.compact_outcome_id}` : "",
        providerRankingProvenanceCompactRepairSource && candidate.compact_hook_run_id ? `compact hook：${candidate.compact_hook_run_id}` : "",
        providerRankingProvenanceCompactRepairSource && providerRankingProvenanceRelPaths.length ? `provider ranking typed MEMORY.md：${providerRankingProvenanceRelPaths.join("；")}` : "",
        providerRankingMemoryUsageReceiptRepairSource && providerRankingProvenanceRelPaths.length ? `provider ranking memory usage receipt doc：${providerRankingProvenanceRelPaths.join("；")}` : "",
        providerRankingMemoryUsageReceiptRepairSource && providerRankingMemoryReceiptRequiredDocRelPaths.length ? `required memory docs：${providerRankingMemoryReceiptRequiredDocRelPaths.join("；")}` : "",
        providerRankingMemoryUsageReceiptRepairSource && providerRankingMemoryReceiptMissingDocRelPaths.length ? `missing memory docs：${providerRankingMemoryReceiptMissingDocRelPaths.join("；")}` : "",
        providerRankingMemoryUsageReceiptRepairSource && providerRankingMemoryReceiptMissingUsageStateDocRelPaths.length ? `missing usageState docs：${providerRankingMemoryReceiptMissingUsageStateDocRelPaths.join("；")}` : "",
        providerRankingMemoryUsageReceiptRepairSource && providerRankingProvenanceGapCodes.length ? `provider ranking memory usage receipt gaps：${providerRankingProvenanceGapCodes.join("；")}` : "",
        providerRankingMemoryUsageReceiptRepairSource ? "required receipt fields：CCM_AGENT_RECEIPT.memoryUsed 或 CCM_AGENT_RECEIPT.memoryIgnored；每个 required memory doc 必须有 usageState。" : "",
        providerRankingMemoryUsageReceiptRepairSource ? "authorization boundary：ranking evidence only, not authorization。" : "",
        providerRankingMemoryUsageReceiptRepairSource ? "provider switch boundary：fresh valid provider switch decision receipt required for any explicit provider switch。" : "",
        postCompactReceiptMemoryUsageRepairSource && candidate.original_worker_context_packet_id ? `original worker context packet：${candidate.original_worker_context_packet_id}` : "",
        postCompactReceiptMemoryUsageRepairSource && candidate.original_binding_id ? `original binding：${candidate.original_binding_id}` : "",
        postCompactReceiptMemoryUsageRepairSource && candidate.original_task_agent_session_id ? `original task Agent session（evidence only）：${candidate.original_task_agent_session_id}` : "",
        postCompactReceiptMemoryUsageRepairSource && candidate.original_native_session_id ? `original native session（evidence only）：${candidate.original_native_session_id}` : "",
        postCompactReceiptMemoryUsageRepairSource && postCompactReceiptMemoryRequiredDocRelPaths.length ? `required post-compact receipt memory docs：${postCompactReceiptMemoryRequiredDocRelPaths.join("；")}` : "",
        postCompactReceiptMemoryUsageRepairSource && postCompactReceiptMemoryMissingDocRelPaths.length ? `missing memory docs：${postCompactReceiptMemoryMissingDocRelPaths.join("；")}` : "",
        postCompactReceiptMemoryUsageRepairSource && postCompactReceiptMemoryMissingCurrentSourceVerifiedDocRelPaths.length ? `missing currentSourceVerified docs：${postCompactReceiptMemoryMissingCurrentSourceVerifiedDocRelPaths.join("；")}` : "",
        postCompactReceiptMemoryUsageRepairSource && postCompactReceiptMemoryMissingIgnoredReasonDocRelPaths.length ? `missing ignored reason docs：${postCompactReceiptMemoryMissingIgnoredReasonDocRelPaths.join("；")}` : "",
        postCompactReceiptMemoryUsageRepairSource && postCompactReceiptMemoryGapCodes.length ? `receipt gaps：${postCompactReceiptMemoryGapCodes.join("；")}` : "",
        postCompactReceiptMemoryUsageRepairSource ? "required corrected receipt：memoryUsed used/verified 必须 currentSourceVerified=true；memoryIgnored ignored 必须 reason；每个 required doc 都必须覆盖。" : "",
        postCompactReceiptMemoryUsageRepairSource ? "required brief usage：CCM_AGENT_RECEIPT.replayRepairDispatchBriefUsage 必须引用本 brief_id/work_item_id 并声明 verified。" : "",
        postCompactReceiptMemoryUsageRepairSource ? "freshness boundary：historical repair completion is recovery evidence, not permanent repository truth。" : "",
        postCompactReceiptMemoryUsageRepairSource ? "session boundary：corrected receipt 必须绑定本次新 repair task/native session；原 session id 仅作历史证据。" : "",
        postCompactCompletionPreservationRepairSource && candidate.compact_retry_id ? `failed compact retry：${candidate.compact_retry_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.compact_outcome_id ? `failed compact outcome：${candidate.compact_outcome_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.compact_hook_run_id ? `failed compact hook：${candidate.compact_hook_run_id}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationCompletionDocRelPaths.length ? `completion docs：${completionPreservationCompletionDocRelPaths.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationRequiredDocRelPaths.length ? `required docs：${completionPreservationRequiredDocRelPaths.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationWorkItemIds.length ? `completion work items：${completionPreservationWorkItemIds.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationTimelineBindingIds.length ? `completion timeline bindings：${completionPreservationTimelineBindingIds.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationHistoricalTaskAgentSessionIds.length ? `historical task sessions（evidence only）：${completionPreservationHistoricalTaskAgentSessionIds.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationHistoricalNativeSessionIds.length ? `historical native sessions（evidence only）：${completionPreservationHistoricalNativeSessionIds.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_current_session_binding_id ? `required current session binding：${candidate.completion_preservation_current_session_binding_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_current_task_agent_session_id ? `required current task session：${candidate.completion_preservation_current_task_agent_session_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_current_native_session_id ? `required current native session：${candidate.completion_preservation_current_native_session_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_present === true ? "conflict-resolution preservation required：true" : "",
        postCompactCompletionPreservationRepairSource && completionPreservationConflictResolutionDocRelPaths.length ? `conflict-resolution docs：${completionPreservationConflictResolutionDocRelPaths.join("；")}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_entry_id ? `conflict-resolution entry：${candidate.completion_preservation_conflict_resolution_entry_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_state ? `conflict-resolution state：${candidate.completion_preservation_conflict_resolution_state}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_usage_state ? `conflict-resolution usage state：${candidate.completion_preservation_conflict_resolution_usage_state}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_task_agent_session_id ? `historical resolving task session（evidence only）：${candidate.completion_preservation_conflict_resolution_task_agent_session_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_native_session_id ? `historical resolving native session（evidence only）：${candidate.completion_preservation_conflict_resolution_native_session_id}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_present === true ? `conflict-resolution active=${candidate.completion_preservation_conflict_resolution_active === true}；reopened=${candidate.completion_preservation_conflict_resolution_reopened === true}；reversible=${candidate.completion_preservation_conflict_resolution_reversible === true}；historical_branches_preserved=${candidate.completion_preservation_conflict_resolution_historical_branches_preserved === true}` : "",
        postCompactCompletionPreservationRepairSource && candidate.completion_preservation_conflict_resolution_present === true ? `conflict-resolution acceptance：reverification=${candidate.completion_preservation_conflict_resolution_reverification_acceptance_required === true}；reversible=${candidate.completion_preservation_conflict_resolution_reversible_acceptance_required === true}；reopened_current_session_verification=${candidate.completion_preservation_conflict_verification_acceptance_required === true}` : "",
        postCompactCompletionPreservationRepairSource && completionPreservationGapCodes.length ? `failed preservation gaps：${completionPreservationGapCodes.join("；")}` : "",
        postCompactCompletionPreservationRepairSource ? "required corrected proof：CCM_AGENT_RECEIPT reports the attempt, but closure requires a newer, different compact retry/outcome with preservation.required=true, preserved=true, gaps=[], authority_boundary_valid=true and exact identity/session coverage。" : "",
        postCompactCompletionPreservationRepairSource ? "freshness boundary：historical repair completion is recovery evidence, not permanent repository truth；每个新子 Agent 会话仍需 current-source reverify。" : "",
        postCompactCompletionPreservationRepairSource ? "execution boundary：Memory Center must not create a real child task；只允许群聊主 Agent 显式派发本简报。" : "",
        postCompactReinjectionRepairSource && reinjectionGateId ? `post-compact reinjection gate：${reinjectionGateId}` : "",
        postCompactReinjectionRepairSource && postCompactCandidateId ? `required post-compact candidate_id：${postCompactCandidateId}` : "",
        postCompactReinjectionRepairSource && postCompactCandidateKind ? `candidate kind：${postCompactCandidateKind}` : "",
        postCompactReinjectionRepairSource && postCompactCandidateValue ? `candidate value：${postCompactCandidateValue}` : "",
        postCompactReinjectionRepairSource && postCompactCandidateSourceMessageId ? `source message id：${postCompactCandidateSourceMessageId}` : "",
        postCompactReinjectionRepairSource ? "required receipt：CCM_AGENT_RECEIPT.postCompactCandidateUsage 必须引用 gate/candidate_id 并声明 used / ignored / verified；used/verified 时 currentSourceVerified=true；ignored 时给出原因；同时回传 task_agent_session_id/native_session_id。" : "",
        readPlanRevalidationRepairSource && revalidationGateId ? `compact read plan revalidation gate：${revalidationGateId}` : "",
        readPlanRevalidationRepairSource && readPlanId ? `required read_plan_id：${readPlanId}` : "",
        readPlanRevalidationRepairSource && referenceId ? `reference_id：${referenceId}` : "",
        readPlanRevalidationRepairSource && expectedTaskAgentSessionId ? `expected task_agent_session_id：${expectedTaskAgentSessionId}` : "",
        readPlanRevalidationRepairSource && expectedNativeSessionId ? `expected native_session_id：${expectedNativeSessionId}` : "",
        readPlanRevalidationRepairSource && receiptTaskAgentSessionId ? `invalid receipt task_agent_session_id：${receiptTaskAgentSessionId}` : "",
        readPlanRevalidationRepairSource && receiptNativeSessionId ? `invalid receipt native_session_id：${receiptNativeSessionId}` : "",
        readPlanRevalidationRepairSource ? "required receipt：CCM_AGENT_RECEIPT.readPlanRevalidationUsage 或 memoryUsed/memoryIgnored 必须引用 gate/read_plan_id，声明 currentSourceVerified=true 或明确 ignored 原因，并匹配绑定 session。" : "",
        providerRankingProvenanceCompactRepairSource && providerRankingProvenanceRowIds.length ? `provider ranking row ids：${providerRankingProvenanceRowIds.slice(0, 8).join("；")}` : "",
        providerRankingProvenanceCompactRepairSource && providerRankingProvenanceGapCodes.length ? `compact preservation gaps：${providerRankingProvenanceGapCodes.join("；")}` : "",
        providerRankingProvenanceCompactRepairSource ? "required proof：CCM_AGENT_RECEIPT；provider_ranking_provenance_preservation.required=true；provider_ranking_provenance_preservation.preserved=true；provider_ranking_provenance_preserved=true；providerRankingProvenancePreserved=true；replayRepairDispatchBriefUsage；ranking evidence only, not authorization" : "",
        "",
        "执行边界：只有当前用户消息或主 Agent 明确把本简报派发给你时，才执行修复；如果只是作为上下文注入，不要自行创建额外任务。",
        "",
        "修复要求：",
        candidate.instruction ? `- ${candidate.instruction}` : "",
        candidate.expected ? `- 期望结果：${candidate.expected}` : "",
        candidate.prompt_patch ? `- 建议补丁/恢复信息：${candidate.prompt_patch}` : "",
        "",
        "验证要求：",
        "- 重新运行对应 Memory Center replay/native proof 检查，证明缺口关闭。",
        nativeProofSource
            ? "- 对 API microcompact native_applied 修复，必须证明 nativeApplyStrongProof=true、requestTelemetrySessionBound=true、requestTelemetryDispatchBound=true，并保留 runnerRequestId/executionId 绑定。"
            : ignoreMemoryReceiptSource
                ? "- 对 ignore-memory receipt 修复，不得重新注入或使用群聊/typed/global 记忆；只要求补齐 corrected CCM_AGENT_RECEIPT.memoryIgnored，并证明 memoryUsed 未声明历史记忆。"
                : pressureMemoryProvenanceReceiptSource
                    ? "- 对 pressure memory provenance receipt 修复，只要求补齐 corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage；每条 under-repair pressure MEMORY.md 必须声明 relPath、usageState、provenanceStatus、repairWorkItemId、repairStatus、repairGapType；若 used/verified，必须 currentSourceVerified=true。"
                    : providerOverrideFollowupReceiptValidationSource
                        ? "- 对 provider override follow-up receipt contract 修复，只补齐 corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage；不重做无关代码实现。每条必须覆盖 required relPath / repairWorkItemId / providerDispatchOverrideId，并设置 currentSourceVerified=true、providerDispatchOverrideFollowupHistoryReverified=true。"
                        : providerRankingProvenanceCompactRepairSource
                            ? "- 对 provider ranking provenance compact 修复，必须从 typed MEMORY.md 与 provider switch decision receipt 重新渲染 WorkerContextPacket；证明 provider_ranking_provenance_preservation.required=true、preserved=true，compact outcome ledger 记录 provider_ranking_provenance_preserved=true。provider switch execution history 只能作为 ranking evidence，不能作为授权。"
                            : providerRankingMemoryUsageReceiptRepairSource
                                ? "- 对 provider ranking memory usage receipt 修复，只补齐 corrected CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored；必须引用每一个 required memory doc relPath，声明 usageState，并再次声明 ranking evidence only, not authorization；任何显式 provider switch 仍需要 fresh valid provider switch decision receipt。"
                                : postCompactCompletionPreservationRepairSource
                                    ? "- 对 corrected-receipt completion-memory compact preservation 修复，必须从当前 memory bundle 重新渲染并持久化更新且不同的 compact retry/outcome；完整恢复 doc/work-item/timeline identity、相同 current task/native session 与 historical-evidence-only 边界；若存在 conflict-resolution，还必须精确恢复 doc/entry/state/usage state、resolving sessions、active/reopened、reversible branches 和 acceptance requirements。子 Agent 回执不能单独关闭该 work item。"
                                    : postCompactReceiptMemoryUsageRepairSource
                                        ? "- 对 post-compact receipt memory usage 修复，在本次新 repair session 中重新核验当前源并返回 corrected CCM_AGENT_RECEIPT；每个 required doc 必须在 memoryUsed 或 memoryIgnored 中出现，used/verified 要 currentSourceVerified=true，ignored 要 reason；原 task/native session 只能作为历史证据。"
                                        : postCompactReinjectionRepairSource
                                            ? "- 对 post-compact reinjection 修复，必须从 raw transcript 或 typed MEMORY.md 恢复指定候选，并在实际子 Agent 会话中核验当前源；回执必须逐条声明 postCompactCandidateUsage=used/ignored/verified，不能只提 gate。"
                                            : readPlanRevalidationRepairSource
                                                ? "- 对 compact read plan revalidation 修复，必须在绑定子 Agent 会话中重新读取当前源；回执用 readPlanRevalidationUsage 或 memoryUsed/memoryIgnored 引用 revalidation_gate_id、read_plan_id，并声明 currentSourceVerified=true；未使用时必须明确 ignored 原因。"
                                                : "- 必须证明压缩后子 Agent 记忆包能重新包含缺失上下文。",
        "",
        ignoreMemoryReceiptSource
            ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、memoryUsed、memoryIgnored；memoryIgnored 必须声明 user_requested_ignore_memory / must_not_use_group_memory，memoryUsed 不得声明任何群聊/typed/global 历史记忆。"
            : pressureMemoryProvenanceReceiptSource
                ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、memoryUsed、memoryIgnored、memoryProvenanceUsage；memoryProvenanceUsage 必须逐条覆盖上述 pressure memory docs / repair work items，disputed_under_repair 或 stale_evidence_under_repair 被 used/verified 时必须 currentSourceVerified=true。"
                : providerOverrideFollowupReceiptValidationSource
                    ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage；逐条引用 required relPath、repairWorkItemId、providerDispatchOverrideId，设置 usageState=verified、repairStatus=completed、repairGapType=provider_dispatch_override_followup、currentSourceVerified=true、providerDispatchOverrideFollowupHistoryReverified=true。"
                    : providerRankingProvenanceCompactRepairSource
                        ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、replayRepairDispatchBriefUsage；replayRepairDispatchBriefUsage 必须引用本 brief/work_item_id，usageState=verified，repairStatus=completed，repairGapType=provider_ranking_provenance_compact，并声明 providerSwitchDecisionReceiptId、providerSwitchDecisionReceiptChecksum、typedMemoryRelPaths、typedMemoryRowIds、providerRankingProvenancePreserved=true。"
                        : providerRankingMemoryUsageReceiptRepairSource
                            ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、memoryUsed、memoryIgnored；memoryUsed 或 memoryIgnored 必须引用每一个 required memory doc relPath，声明 usageState=verified/used/background 或 ignored/not_used，并写明 ranking evidence only, not authorization；fresh valid provider switch decision receipt required for any explicit provider switch。"
                            : postCompactCompletionPreservationRepairSource
                                ? "回执要求：最后追加 CCM_AGENT_RECEIPT，报告 rerender/compact outcome 持久化结果；但严格关闭只接受更新且不同的 compact outcome ledger proof，要求 preservation.required=true、preserved=true、gaps=[]、authority_boundary_valid=true，并精确保留本简报列出的 identity/session。"
                                : postCompactReceiptMemoryUsageRepairSource
                                    ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT，包含 replayRepairDispatchBriefUsage、memoryUsed、memoryIgnored、task_agent_session_id、native_session_id；replayRepairDispatchBriefUsage 必须引用本 brief/work_item_id 并声明 verified；每个 required memory doc 都必须声明 used/verified+currentSourceVerified=true 或 ignored+reason；必须写明 historical repair completion is recovery evidence, not permanent repository truth。"
                                    : postCompactReinjectionRepairSource
                                        ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs、memoryUsed、memoryIgnored、postCompactCandidateUsage、task_agent_session_id、native_session_id；postCompactCandidateUsage 必须引用本 brief 的 reinjection_gate_id 与 candidate_id，并声明 used/ignored/verified；used/verified 时 currentSourceVerified=true，ignored 时必须写 reason。"
                                        : readPlanRevalidationRepairSource
                                            ? "回执要求：最后追加 corrected CCM_AGENT_RECEIPT；readPlanRevalidationUsage 或 memoryUsed/memoryIgnored 必须引用本 brief 的 revalidation_gate_id、read_plan_id，声明 currentSourceVerified=true 或 ignored 原因，并回传与 expected task_agent_session_id/native_session_id 一致的会话标识。"
                                            : "回执要求：最后追加 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs；如果是 native proof 修复，还要写明 proof_entry_id、request_patch_checksum、runner_request_id。"
    ].filter(Boolean).join("\n");
    return {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-v1",
        brief_id: briefId,
        groupId,
        groupSessionId: (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(candidate.groupSessionId || candidate.group_session_id || ""),
        group_session_id: (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(candidate.groupSessionId || candidate.group_session_id || ""),
        status: "ready",
        should_create_real_task: false,
        source_candidate_id: candidate.candidate_id || "",
        work_item_id: workItemId,
        source: candidate.source || "",
        priority: candidate.priority || "medium",
        component: candidate.component || "replay_renderer",
        target_project: targetProject,
        dispatch_target: candidate.dispatch_target || targetProject,
        recommended_action: candidate.recommendedAction || "main_agent_review_and_dispatch_to_child_agent",
        proof_entry_id: candidate.proof_entry_id || "",
        plan_checksum: candidate.plan_checksum || "",
        request_patch_checksum: candidate.request_patch_checksum || "",
        revalidation_gate_id: revalidationGateId,
        read_plan_id: readPlanId,
        reference_id: referenceId,
        reinjection_gate_id: reinjectionGateId,
        post_compact_candidate_id: postCompactCandidateId,
        post_compact_candidate_kind: postCompactCandidateKind,
        post_compact_candidate_value: postCompactCandidateValue,
        post_compact_candidate_source_message_id: postCompactCandidateSourceMessageId,
        expected_task_agent_session_id: expectedTaskAgentSessionId,
        expected_native_session_id: expectedNativeSessionId,
        receipt_task_agent_session_id: receiptTaskAgentSessionId,
        receipt_native_session_id: receiptNativeSessionId,
        session_mismatch: candidate.session_mismatch === true,
        worker_context_packet_id: candidate.worker_context_packet_id || "",
        worker_context_packet_binding_id: candidate.worker_context_packet_binding_id || candidate.binding_id || "",
        worker_context_packet_memory_policy_reason: candidate.worker_context_packet_memory_policy_reason || "",
        binding_id: candidate.binding_id || candidate.worker_context_packet_binding_id || "",
        assignment_id: candidate.assignment_id || "",
        dispatch_key: candidate.dispatch_key || "",
        pressure_memory_provenance_gap_codes: pressureProvenanceGapCodes,
        pressure_memory_provenance_repair_work_item_ids: pressureProvenanceRepairIds,
        pressure_memory_provenance_rel_paths: pressureProvenanceRelPaths,
        provider_override_followup_contract_validation_id: candidate.provider_override_followup_contract_validation_id || "",
        provider_override_followup_contract_rel_paths: providerOverrideFollowupRelPaths,
        provider_override_followup_contract_work_item_ids: providerOverrideFollowupWorkItemIds,
        provider_override_followup_contract_override_ids: providerOverrideFollowupOverrideIds,
        provider_override_followup_contract_gap_codes: providerOverrideFollowupGapCodes,
        provider_switch_decision_receipt_id: candidate.provider_switch_decision_receipt_id || "",
        provider_switch_decision_receipt_checksum: candidate.provider_switch_decision_receipt_checksum || "",
        provider_ranking_provenance_gap_codes: providerRankingProvenanceGapCodes,
        provider_ranking_provenance_rel_paths: providerRankingProvenanceRelPaths,
        provider_ranking_provenance_row_ids: providerRankingProvenanceRowIds,
        provider_ranking_provenance_missing_rel_paths: providerRankingProvenanceMissingRelPaths,
        provider_ranking_provenance_missing_row_ids: providerRankingProvenanceMissingRowIds,
        provider_ranking_memory_receipt_required_doc_rel_paths: providerRankingMemoryReceiptRequiredDocRelPaths,
        provider_ranking_memory_receipt_missing_doc_rel_paths: providerRankingMemoryReceiptMissingDocRelPaths,
        provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths: providerRankingMemoryReceiptMissingUsageStateDocRelPaths,
        post_compact_receipt_memory_gap_codes: postCompactReceiptMemoryGapCodes,
        post_compact_receipt_memory_required_doc_rel_paths: postCompactReceiptMemoryRequiredDocRelPaths,
        post_compact_receipt_memory_missing_doc_rel_paths: postCompactReceiptMemoryMissingDocRelPaths,
        post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths: postCompactReceiptMemoryMissingCurrentSourceVerifiedDocRelPaths,
        post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths: postCompactReceiptMemoryMissingIgnoredReasonDocRelPaths,
        completion_preservation_gap_codes: completionPreservationGapCodes,
        completion_preservation_completion_doc_rel_paths: completionPreservationCompletionDocRelPaths,
        completion_preservation_required_doc_rel_paths: completionPreservationRequiredDocRelPaths,
        completion_preservation_work_item_ids: completionPreservationWorkItemIds,
        completion_preservation_timeline_binding_ids: completionPreservationTimelineBindingIds,
        completion_preservation_historical_task_agent_session_ids: completionPreservationHistoricalTaskAgentSessionIds,
        completion_preservation_historical_native_session_ids: completionPreservationHistoricalNativeSessionIds,
        completion_preservation_current_session_binding_id: candidate.completion_preservation_current_session_binding_id || "",
        completion_preservation_current_task_agent_session_id: candidate.completion_preservation_current_task_agent_session_id || "",
        completion_preservation_current_native_session_id: candidate.completion_preservation_current_native_session_id || "",
        completion_preservation_conflict_resolution_present: candidate.completion_preservation_conflict_resolution_present === true,
        completion_preservation_conflict_resolution_doc_rel_paths: completionPreservationConflictResolutionDocRelPaths,
        completion_preservation_conflict_resolution_entry_id: candidate.completion_preservation_conflict_resolution_entry_id || "",
        completion_preservation_conflict_resolution_state: candidate.completion_preservation_conflict_resolution_state || "",
        completion_preservation_conflict_resolution_usage_state: candidate.completion_preservation_conflict_resolution_usage_state || "",
        completion_preservation_conflict_resolution_task_agent_session_id: candidate.completion_preservation_conflict_resolution_task_agent_session_id || "",
        completion_preservation_conflict_resolution_native_session_id: candidate.completion_preservation_conflict_resolution_native_session_id || "",
        completion_preservation_conflict_resolution_active: candidate.completion_preservation_conflict_resolution_active === true,
        completion_preservation_conflict_resolution_reopened: candidate.completion_preservation_conflict_resolution_reopened === true,
        completion_preservation_conflict_resolution_reversible: candidate.completion_preservation_conflict_resolution_reversible === true,
        completion_preservation_conflict_resolution_historical_branches_preserved: candidate.completion_preservation_conflict_resolution_historical_branches_preserved === true,
        completion_preservation_conflict_resolution_reverification_acceptance_required: candidate.completion_preservation_conflict_resolution_reverification_acceptance_required === true,
        completion_preservation_conflict_resolution_reversible_acceptance_required: candidate.completion_preservation_conflict_resolution_reversible_acceptance_required === true,
        completion_preservation_conflict_verification_acceptance_required: candidate.completion_preservation_conflict_verification_acceptance_required === true,
        corrected_compact_outcome_id: candidate.corrected_compact_outcome_id || "",
        corrected_compact_retry_id: candidate.corrected_compact_retry_id || "",
        corrected_compact_hook_run_id: candidate.corrected_compact_hook_run_id || "",
        original_worker_context_packet_id: candidate.original_worker_context_packet_id || "",
        original_binding_id: candidate.original_binding_id || "",
        original_assignment_id: candidate.original_assignment_id || "",
        original_dispatch_key: candidate.original_dispatch_key || "",
        original_task_agent_session_id: candidate.original_task_agent_session_id || "",
        original_native_session_id: candidate.original_native_session_id || "",
        compact_outcome_id: candidate.compact_outcome_id || "",
        compact_retry_id: candidate.compact_retry_id || "",
        compact_hook_run_id: candidate.compact_hook_run_id || "",
        provider_reproof_status: candidate.provider_reproof_status || "",
        provider_reproof_reason: candidate.provider_reproof_reason || "",
        reproof_candidate_id: candidate.reproof_candidate_id || "",
        timeline_binding_id: candidate.timeline_binding_id || "",
        original_work_item_id: candidate.original_work_item_id || "",
        request_telemetry_status: candidate.request_telemetry_status || "",
        request_telemetry_source: candidate.request_telemetry_source || "",
        request_telemetry_session_status: candidate.request_telemetry_session_status || "",
        request_telemetry_dispatch_status: candidate.request_telemetry_dispatch_status || "",
        runner_request_id: candidate.runner_request_id || "",
        execution_id: candidate.execution_id || "",
        worker_task: (0, group_orchestrator_1.compactText)(workerTask, 2600),
        verification: nativeProofSource
            ? [
                "runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest 或同等 native proof 检查",
                "runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest 或同等 provider re-proof 派发链检查",
                "buildMemoryQualityReport({checkIds:['api_microcompact_native_apply_proof_repair_dispatch_candidates']})",
                "buildMemoryQualityReport({checkIds:['api_microcompact_native_apply_proof_repair_closure_reproof_work_items']})",
            ]
            : providerOverrideFollowupReceiptValidationSource
                ? [
                    "runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationSelfTest 或同等 validation 检查",
                    "buildMemoryQualityReport({checkIds:['worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract_validation']})",
                ]
                : providerRankingProvenanceCompactRepairSource
                    ? [
                        "runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefSelfTest 或同等 provider ranking provenance compact repair brief 检查",
                        "buildMemoryQualityReport({checkIds:['worker_context_provider_ranking_provenance_compact_repair_dispatch_briefs']})",
                        "buildMemoryQualityReport({checkIds:['worker_context_packet_compact_outcome_ledger']})",
                    ]
                    : providerRankingMemoryUsageReceiptRepairSource
                        ? [
                            "runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefSelfTest 或同等 corrected receipt brief 检查",
                            "buildMemoryQualityReport({checkIds:['worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_briefs']})",
                            "buildMemoryQualityReport({checkIds:['worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt']})",
                        ]
                        : postCompactCompletionPreservationRepairSource
                            ? [
                                "runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationRepairSelfTest 或同等 preservation repair 检查",
                                "buildMemoryQualityReport({checkIds:['post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_work_items','post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_dispatch_candidates','post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_dispatch_briefs','post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure']})",
                                "确认 corrected compact outcome ledger proof 是更新且不同的 retry/outcome，并恢复 exact identity/current-session authority boundary",
                            ]
                            : postCompactReceiptMemoryUsageRepairSource
                                ? [
                                    "runMemoryCenterPostCompactReinjectionRepairReceiptMemoryUsageRepairSelfTest 或同等 corrected receipt repair 检查",
                                    "buildMemoryQualityReport({checkIds:['post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_briefs']})",
                                    "buildMemoryQualityReport({checkIds:['post_compact_reinjection_repair_receipt_memory_usage_repair_receipt_consumption']})",
                                ]
                                : postCompactReinjectionRepairSource
                                    ? [
                                        "runMemoryCenterPostCompactReinjectionRepairDispatchSelfTest 或同等 post-compact reinjection repair dispatch 检查",
                                        "buildMemoryQualityReport({checkIds:['post_compact_reinjection_repair_dispatch_candidates','post_compact_reinjection_repair_dispatch_briefs']})",
                                        "buildMemoryQualityReport({checkIds:['post_compact_candidate_discipline','worker_context_packet_memory_reinjection_proof']})",
                                    ]
                                    : readPlanRevalidationRepairSource
                                        ? [
                                            "runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairDispatchSelfTest 或同等 read-plan revalidation repair dispatch 检查",
                                            "buildMemoryQualityReport({checkIds:['compact_file_reference_read_plan_revalidation_repair_dispatch_candidates','compact_file_reference_read_plan_revalidation_repair_dispatch_briefs']})",
                                            "buildMemoryQualityReport({checkIds:['compact_file_reference_read_plan_revalidation_session_binding']})",
                                        ]
                                        : ["重新运行 compact boundary replay repair dispatch candidate 检查"],
        createdAt: existing.createdAt || existing.created_at || at,
        updatedAt: at,
    };
}
function syncReplayRepairDispatchPlansForCoordinator(groupId, summaryInput = null, options = {}) {
    const at = String(options.at || new Date().toISOString());
    const groupSessionId = (0, group_orchestrator_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || summaryInput?.groupSessionId || summaryInput?.group_session_id || "");
    const summary = summaryInput?.schema ? summaryInput : (0, group_orchestrator_1.readReplayRepairDispatchCandidatesForCoordinator)(groupId, Number(options.limit || 8));
    const ledger = readReplayRepairDispatchPlanLedgerForCoordinator(groupId, groupSessionId);
    const previous = Array.isArray(ledger.briefs) ? ledger.briefs : [];
    const previousByWorkId = new Map(previous.map((brief) => [String(brief.work_item_id || ""), brief]));
    const activeCandidates = Array.isArray(summary?.candidates) ? summary.candidates : [];
    const activeWorkIds = new Set(activeCandidates.map((candidate) => String(candidate.work_item_id || "")).filter(Boolean));
    const nextReady = activeCandidates.map((candidate, index) => {
        const existing = previousByWorkId.get(String(candidate.work_item_id || "")) || {};
        return buildReplayRepairDispatchBriefForCoordinator(groupId, candidate, index, existing, at);
    });
    const superseded = previous
        .filter((brief) => String(brief.status || "ready") === "ready" && !activeWorkIds.has(String(brief.work_item_id || "")))
        .map((brief) => ({
        ...brief,
        status: "superseded",
        updatedAt: at,
        resolutionReason: "candidate_no_longer_active",
    }));
    const closed = previous.filter((brief) => !["ready", ""].includes(String(brief.status || "ready")) && !activeWorkIds.has(String(brief.work_item_id || "")));
    const briefs = [...nextReady, ...superseded, ...closed]
        .sort((a, b) => {
        const statusRank = String(a.status || "") === String(b.status || "") ? 0 : String(a.status || "") === "ready" ? -1 : 1;
        if (statusRank)
            return statusRank;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    })
        .slice(0, 80);
    const next = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-ledger-v1",
        version: 1,
        groupId,
        groupSessionId,
        scopeId: groupSessionId ? `${groupId}::${groupSessionId}` : groupId,
        file: ledger.file || getReplayRepairDispatchPlansFileForCoordinator(groupId, groupSessionId),
        sourceCandidateFile: summary?.file || getReplayRepairWorkItemsFileForCoordinator(groupId),
        updatedAt: at,
        briefCount: briefs.length,
        readyCount: briefs.filter((brief) => String(brief.status || "") === "ready").length,
        supersededCount: briefs.filter((brief) => String(brief.status || "") === "superseded").length,
        shouldCreateRealTask: false,
        briefs,
    };
    const comparableCurrent = JSON.stringify({ briefs: previous, sourceCandidateFile: ledger.sourceCandidateFile || "" });
    const comparableNext = JSON.stringify({ briefs: next.briefs, sourceCandidateFile: next.sourceCandidateFile || "" });
    if (comparableCurrent !== comparableNext || !fs.existsSync(next.file)) {
        (0, group_orchestrator_1.writeJsonAtomicForCoordinator)(next.file, next);
        return next;
    }
    return { ...ledger, ...next, updatedAt: ledger.updatedAt || next.updatedAt };
}
//# sourceMappingURL=group-orchestrator-replay-repair.js.map