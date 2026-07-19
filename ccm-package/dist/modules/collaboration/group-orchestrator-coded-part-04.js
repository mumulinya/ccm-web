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
exports.buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator = buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator;
exports.providerDispatchOverrideFollowupReceiptValidationRepairWorkItemIdForCoordinator = providerDispatchOverrideFollowupReceiptValidationRepairWorkItemIdForCoordinator;
exports.syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator = syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator;
exports.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator;
exports.closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator = closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator;
exports.timelineBindingHasRequiredNativeRepairEvidence = timelineBindingHasRequiredNativeRepairEvidence;
exports.timelineBindingMatchesRepairWorkItem = timelineBindingMatchesRepairWorkItem;
exports.providerRankingProvenanceProofString = providerRankingProvenanceProofString;
exports.providerRankingProvenanceProofStringListForCoordinator = providerRankingProvenanceProofStringListForCoordinator;
exports.providerRankingProvenanceProofBooleanForCoordinator = providerRankingProvenanceProofBooleanForCoordinator;
exports.providerRankingProvenanceRepairStatusForCoordinator = providerRankingProvenanceRepairStatusForCoordinator;
exports.providerRankingProvenanceGapTypeForCoordinator = providerRankingProvenanceGapTypeForCoordinator;
exports.providerRankingProvenanceProofFromConsumptionRowForCoordinator = providerRankingProvenanceProofFromConsumptionRowForCoordinator;
exports.timelineBindingMatchesProviderRankingProvenanceRepairWorkItem = timelineBindingMatchesProviderRankingProvenanceRepairWorkItem;
exports.timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence = timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence;
exports.timelineBindingMatchesPostCompactReinjectionRepairWorkItem = timelineBindingMatchesPostCompactReinjectionRepairWorkItem;
exports.timelineBindingHasRequiredPostCompactReinjectionRepairEvidence = timelineBindingHasRequiredPostCompactReinjectionRepairEvidence;
exports.timelineBindingMatchesPostCompactReceiptMemoryUsageRepairWorkItem = timelineBindingMatchesPostCompactReceiptMemoryUsageRepairWorkItem;
exports.timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence = timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence;
exports.closeReplayRepairWorkItemsFromTimelineBindingForCoordinator = closeReplayRepairWorkItemsFromTimelineBindingForCoordinator;
exports.mergeReplayRepairTimelineBinding = mergeReplayRepairTimelineBinding;
exports.replayRepairConsumptionStringListForCoordinator = replayRepairConsumptionStringListForCoordinator;
exports.replayRepairConsumptionRowsForCoordinator = replayRepairConsumptionRowsForCoordinator;
exports.replayRepairConsumptionMatchesBriefForCoordinator = replayRepairConsumptionMatchesBriefForCoordinator;
exports.normalizeReplayRepairConsumptionStatusForCoordinator = normalizeReplayRepairConsumptionStatusForCoordinator;
exports.postCompactCandidateUsageRowsForCoordinator = postCompactCandidateUsageRowsForCoordinator;
exports.normalizePostCompactCandidateUsageStateForCoordinator = normalizePostCompactCandidateUsageStateForCoordinator;
exports.postCompactReinjectionReceiptProofForCoordinator = postCompactReinjectionReceiptProofForCoordinator;
exports.isPostCompactReceiptMemoryUsageRepairForCoordinator = isPostCompactReceiptMemoryUsageRepairForCoordinator;
exports.postCompactReceiptMemoryUsageRepairProofForCoordinator = postCompactReceiptMemoryUsageRepairProofForCoordinator;
exports.classifyReplayRepairBriefConsumptionForCoordinator = classifyReplayRepairBriefConsumptionForCoordinator;
exports.recordReplayRepairDispatchBriefTimelineBinding = recordReplayRepairDispatchBriefTimelineBinding;
exports.replayRepairStatusForCoordinator = replayRepairStatusForCoordinator;
exports.replayRepairPriorityRankForCoordinator = replayRepairPriorityRankForCoordinator;
exports.candidateNativeBindingForCoordinator = candidateNativeBindingForCoordinator;
exports.readyReplayRepairDispatchBriefsForCoordinator = readyReplayRepairDispatchBriefsForCoordinator;
exports.replayRepairBriefMatchText = replayRepairBriefMatchText;
exports.replayRepairBriefMatchScore = replayRepairBriefMatchScore;
// Behavior-freeze split from group-orchestrator-coded.ts (part 4/5).
const fs = __importStar(require("fs"));
const group_orchestrator_prompts_1 = require("./group-orchestrator-prompts");
const group_orchestrator_coded_part_01_1 = require("./group-orchestrator-coded-part-01");
const group_orchestrator_coded_part_03_1 = require("./group-orchestrator-coded-part-03");
function buildProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(entry = {}, input = {}, at = new Date().toISOString()) {
    const contract = entry.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract
        || entry.workerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContract
        || {};
    const receipt = input.receipt || input.ccm_receipt || input.delivery_summary || {};
    const rows = (0, group_orchestrator_coded_part_03_1.pressureProvenanceUsageRowsFromReceiptForCoordinator)(receipt);
    const receiptStatus = String(input.receipt_status || input.receiptStatus || receipt.status || "").trim().toLowerCase();
    const statusDone = ["done", "completed", "ok", "success"].includes(receiptStatus);
    const relPaths = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)(contract.rel_paths || contract.relPaths, 24);
    const workItemIds = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)(contract.followup_work_item_ids || contract.followupWorkItemIds, 24);
    const overrideIds = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)(contract.override_ids || contract.overrideIds, 24);
    const reverifiedRows = rows.filter(group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowReverifiedForCoordinator);
    const verifiedRows = rows.filter((row) => row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true);
    const contractRows = rows.filter((row) => (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowReverifiedForCoordinator)(row)
        || String(row.repairGapType || row.repair_gap_type || "").trim() === "provider_dispatch_override_followup");
    const gaps = [];
    if (contract.schema !== "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1" || contract.active !== true) {
        gaps.push({ code: "missing_contract", reason: "binding missing active provider override follow-up receipt contract" });
    }
    if (!statusDone)
        gaps.push({ code: "receipt_status_not_done", reason: `receipt status ${receiptStatus || "missing"} is not done/completed/ok` });
    if (!rows.length)
        gaps.push({ code: "missing_memory_provenance_usage", reason: "receipt missing memoryProvenanceUsage rows" });
    if (!contractRows.length)
        gaps.push({ code: "missing_provider_override_followup_reverified_rows", reason: "receipt missing provider override follow-up reverified memoryProvenanceUsage rows" });
    const missingRelPaths = relPaths.filter(item => !rows.some((row) => (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowMatchesForCoordinator)(row, "rel_path", item)
        && (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowReverifiedForCoordinator)(row)
        && (row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)));
    const missingWorkItems = workItemIds.filter(item => !rows.some((row) => (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowMatchesForCoordinator)(row, "work_item", item)
        && (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowReverifiedForCoordinator)(row)
        && (row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)));
    const missingOverrideIds = overrideIds.filter(item => !rows.some((row) => (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowMatchesForCoordinator)(row, "override", item)
        && (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowReverifiedForCoordinator)(row)
        && (row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)));
    if (missingRelPaths.length)
        gaps.push({ code: "missing_rel_path_coverage", reason: `receipt missing reverified relPath coverage: ${missingRelPaths.join(", ")}`, missing: missingRelPaths });
    if (missingWorkItems.length)
        gaps.push({ code: "missing_followup_work_item_coverage", reason: `receipt missing reverified follow-up work item coverage: ${missingWorkItems.join(", ")}`, missing: missingWorkItems });
    if (missingOverrideIds.length)
        gaps.push({ code: "missing_override_id_coverage", reason: `receipt missing reverified override id coverage: ${missingOverrideIds.join(", ")}`, missing: missingOverrideIds });
    for (const row of contractRows) {
        const rowLabel = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractReceiptRowValueForCoordinator)(row, ["relPath", "rel_path", "repairWorkItemId", "repair_work_item_id", "providerDispatchOverrideId", "provider_dispatch_override_id"]) || "provider override follow-up row";
        if (!(row.currentSourceVerified === true || row.current_source_verified === true || row.verified === true)) {
            gaps.push({ code: "current_source_verified_missing", reason: `${rowLabel} missing currentSourceVerified=true` });
        }
        if (!String(row.usageState || row.usage_state || "").trim())
            gaps.push({ code: "usage_state_missing", reason: `${rowLabel} missing usageState` });
        if (!String(row.repairStatus || row.repair_status || "").trim())
            gaps.push({ code: "repair_status_missing", reason: `${rowLabel} missing repairStatus` });
        if (String(row.repairGapType || row.repair_gap_type || "").trim() !== "provider_dispatch_override_followup") {
            gaps.push({ code: "repair_gap_type_mismatch", reason: `${rowLabel} missing repairGapType=provider_dispatch_override_followup` });
        }
    }
    const contractSatisfied = contract.schema === "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1"
        && contract.active === true
        && statusDone
        && rows.length > 0
        && contractRows.length > 0
        && gaps.length === 0;
    return {
        schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
        validation_id: `provider-dispatch-override-followup-receipt-contract-validation:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([
            entry.binding_id || "",
            entry.assignment_id || "",
            entry.worker_context_packet_id || "",
            input.task_id || input.taskId || "",
            input.execution_id || input.executionId || "",
        ], 14)}`,
        groupId: entry.groupId || input.groupId || input.group_id || "",
        project: entry.project || input.project || "",
        agent_type: entry.agent_type || input.agent_type || input.agentType || "unknown",
        binding_id: entry.binding_id || "",
        assignment_id: entry.assignment_id || input.assignment_id || input.assignmentId || "",
        dispatch_key: entry.dispatch_key || input.dispatch_key || input.dispatchKey || "",
        worker_context_packet_id: entry.worker_context_packet_id || input.worker_context_packet_id || input.workerContextPacketId || "",
        task_id: input.task_id || input.taskId || "",
        worker_handoff_id: input.worker_handoff_id || input.workerHandoffId || "",
        task_agent_session_id: input.task_agent_session_id || input.taskAgentSessionId || "",
        native_session_id: input.native_session_id || input.nativeSessionId || "",
        execution_id: input.execution_id || input.executionId || "",
        receipt_status: receiptStatus,
        receipt,
        contract,
        contract_required: contract.active === true,
        contract_satisfied: contractSatisfied,
        status: contractSatisfied ? "passed" : "failed",
        memory_provenance_usage_count: rows.length,
        provider_override_followup_reverified_row_count: reverifiedRows.length,
        current_source_verified_count: verifiedRows.length,
        contract_row_count: contractRows.length,
        required_rel_path_count: relPaths.length,
        covered_rel_path_count: Math.max(0, relPaths.length - missingRelPaths.length),
        required_followup_work_item_count: workItemIds.length,
        covered_followup_work_item_count: Math.max(0, workItemIds.length - missingWorkItems.length),
        required_override_id_count: overrideIds.length,
        covered_override_id_count: Math.max(0, overrideIds.length - missingOverrideIds.length),
        gaps,
        reason: contractSatisfied
            ? "provider override follow-up receipt contract satisfied by reverified memoryProvenanceUsage rows"
            : "provider override follow-up receipt contract missing required reverified memoryProvenanceUsage evidence",
        at,
    };
}
function providerDispatchOverrideFollowupReceiptValidationRepairWorkItemIdForCoordinator(groupId, entry = {}) {
    return `provider-dispatch-override-followup-receipt-validation-repair:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([
        groupId,
        entry.binding_id || "",
        entry.assignment_id || "",
        entry.worker_context_packet_id || "",
    ], 14)}`;
}
function syncProviderDispatchOverrideFollowupReceiptValidationRepairWorkItemForCoordinator(groupId, entry = {}, validation = {}, at = new Date().toISOString()) {
    if (!groupId || !entry.worker_context_packet_id || validation.contract_required !== true)
        return null;
    const ledger = (0, group_orchestrator_coded_part_03_1.readReplayRepairWorkItemLedgerForCoordinator)(groupId);
    const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
    const workItemId = providerDispatchOverrideFollowupReceiptValidationRepairWorkItemIdForCoordinator(groupId, entry);
    const existingIndex = items.findIndex((item) => String(item.work_item_id || item.id || "") === workItemId);
    const contract = validation.contract || {};
    const relPaths = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)(contract.rel_paths || contract.relPaths, 24);
    const followupWorkItemIds = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)(contract.followup_work_item_ids || contract.followupWorkItemIds, 24);
    const overrideIds = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)(contract.override_ids || contract.overrideIds, 24);
    const gapCodes = (0, group_orchestrator_coded_part_03_1.providerOverrideFollowupContractStringListForCoordinator)((validation.gaps || []).map((gap) => gap.code || gap.reason), 24);
    const completed = validation.contract_satisfied === true && validation.status === "passed";
    const base = existingIndex >= 0 ? items[existingIndex] : {};
    const nextItem = {
        ...base,
        schema: "ccm-provider-dispatch-override-followup-receipt-validation-repair-work-item-v1",
        id: workItemId,
        work_item_id: workItemId,
        source: "worker_context_provider_dispatch_override_followup_receipt_contract_validation_repair",
        component: "worker_context_provider_dispatch_override_followup_receipt_contract",
        subject: `Repair provider override follow-up receipt contract for ${entry.project || validation.project || "unknown"}`,
        status: completed ? "completed" : "pending",
        priority: "high",
        owner: completed ? base.owner || "group-main-agent" : "group-main-agent",
        groupId,
        project: entry.project || validation.project || "",
        target_project: entry.project || validation.project || "",
        dispatch_target: completed ? "" : entry.project || validation.project || "",
        agent_type: entry.agent_type || validation.agent_type || "unknown",
        repair_target: entry.project || validation.project || "provider-dispatch-receipt",
        binding_id: entry.binding_id || validation.binding_id || "",
        worker_context_packet_binding_id: entry.binding_id || validation.binding_id || "",
        assignment_id: entry.assignment_id || validation.assignment_id || "",
        dispatch_key: entry.dispatch_key || validation.dispatch_key || "",
        worker_context_packet_id: entry.worker_context_packet_id || validation.worker_context_packet_id || "",
        task_id: validation.task_id || "",
        task_agent_session_id: validation.task_agent_session_id || "",
        execution_id: validation.execution_id || "",
        provider_override_followup_contract_validation_id: validation.validation_id || "",
        provider_override_followup_contract_rel_paths: relPaths,
        provider_override_followup_contract_work_item_ids: followupWorkItemIds,
        provider_override_followup_contract_override_ids: overrideIds,
        provider_override_followup_contract_gap_codes: gapCodes,
        instruction: "Return a corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage covering every provider override follow-up repaired-history relPath, work item, and override id.",
        expected: "validation.status=passed; providerDispatchOverrideFollowupHistoryReverified=true; currentSourceVerified=true for every required row",
        prompt_patch: [
            "Only repair the final receipt evidence; do not redo unrelated implementation.",
            relPaths.length ? `Required relPath: ${relPaths.join(", ")}.` : "",
            followupWorkItemIds.length ? `Required repairWorkItemId: ${followupWorkItemIds.join(", ")}.` : "",
            overrideIds.length ? `Required providerDispatchOverrideId: ${overrideIds.join(", ")}.` : "",
            gapCodes.length ? `Validation gaps: ${gapCodes.join(", ")}.` : "",
            "Each corrected memoryProvenanceUsage row must set repairGapType=provider_dispatch_override_followup, currentSourceVerified=true, and providerDispatchOverrideFollowupHistoryReverified=true.",
        ].filter(Boolean).join("\n"),
        reason: validation.reason || "provider override follow-up receipt contract validation failed",
        blockers: completed ? [] : gapCodes,
        needs: completed ? [] : ["corrected CCM_AGENT_RECEIPT.memoryProvenanceUsage"],
        evidence: (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
            ...(Array.isArray(base.evidence) ? base.evidence : []),
            `validation_id=${validation.validation_id || ""}`,
            `binding_id=${entry.binding_id || ""}`,
            `worker_context_packet_id=${entry.worker_context_packet_id || ""}`,
            `validation_status=${validation.status || ""}`,
            ...gapCodes.map((code) => `gap=${code}`),
        ]).slice(-32),
        verification: completed
            ? (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([...(Array.isArray(base.verification) ? base.verification : []), "provider override follow-up receipt contract validation passed"]).slice(-24)
            : Array.isArray(base.verification) ? base.verification : [],
        createdAt: base.createdAt || base.created_at || at,
        updatedAt: at,
        completedAt: completed ? base.completedAt || base.completed_at || at : "",
        completion_source: completed ? "provider_dispatch_override_followup_receipt_contract_validation" : "",
        resolutionReason: completed ? "corrected_child_agent_receipt_satisfied_provider_override_followup_contract" : "",
    };
    if (existingIndex >= 0)
        items[existingIndex] = nextItem;
    else
        items.push(nextItem);
    const next = (0, group_orchestrator_coded_part_03_1.writeReplayRepairWorkItemLedgerForCoordinator)(groupId, items, at, {
        latestProviderDispatchOverrideFollowupReceiptValidationRepair: {
            work_item_id: workItemId,
            validation_id: validation.validation_id || "",
            status: nextItem.status,
            binding_id: entry.binding_id || "",
            at,
        },
    });
    return {
        schema: "ccm-provider-dispatch-override-followup-receipt-validation-repair-work-item-ref-v1",
        work_item_id: workItemId,
        status: nextItem.status,
        file: next.file,
        source: nextItem.source,
    };
}
function recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, input = {}, options = {}) {
    return require("./group-orchestrator-worker-context").recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, input, options);
}
function closeProviderDispatchOverrideFollowupRepairWorkItemForCoordinator(groupId, completion = {}, at = new Date().toISOString()) {
    if (!groupId || completion.completion_ok !== true || !completion.followup_work_item_id)
        return { closed: 0, itemIds: [] };
    const ledger = (0, group_orchestrator_coded_part_03_1.readReplayRepairWorkItemLedgerForCoordinator)(groupId);
    const items = Array.isArray(ledger.items) ? [...ledger.items] : [];
    let closed = 0;
    const itemIds = [];
    const nextItems = items.map((item) => {
        const itemId = String(item.work_item_id || item.id || "").trim();
        if (itemId !== String(completion.followup_work_item_id || "").trim())
            return item;
        if (!(0, group_orchestrator_coded_part_03_1.replayRepairWorkItemOpenForCoordinator)(item.status))
            return item;
        closed += 1;
        itemIds.push(itemId);
        return {
            ...item,
            status: "completed",
            updatedAt: at,
            completedAt: item.completedAt || item.completed_at || at,
            completion_source: "provider_dispatch_override_completion_receipt",
            resolutionReason: "override_child_agent_receipt_verified_pressure_provenance_followup",
            provider_dispatch_override_completion: {
                completion_id: completion.completion_id || "",
                decision_id: completion.decision_id || "",
                override_id: completion.override_id || "",
                task_id: completion.task_id || "",
                task_agent_session_id: completion.task_agent_session_id || "",
                execution_id: completion.execution_id || "",
                receipt_status: completion.receipt_status || "",
                memory_provenance_usage_count: completion.memory_provenance_usage_count || 0,
                current_source_verified_count: completion.current_source_verified_count || 0,
                completed_at: at,
            },
            blockers: [],
            needs: [],
            evidence: (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
                ...(Array.isArray(item.evidence) ? item.evidence : []),
                `completion_id=${completion.completion_id || ""}`,
                `task_agent_session_id=${completion.task_agent_session_id || ""}`,
                `execution_id=${completion.execution_id || ""}`,
                `memory_provenance_usage_count=${completion.memory_provenance_usage_count || 0}`,
            ]).slice(-24),
            verification: (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
                ...(Array.isArray(item.verification) ? item.verification : []),
                "override completion receipt supplied verified pressure provenance follow-up evidence",
            ]).slice(-24),
        };
    });
    if (!closed)
        return { closed: 0, itemIds: [] };
    (0, group_orchestrator_coded_part_03_1.writeReplayRepairWorkItemLedgerForCoordinator)(groupId, nextItems, at, {
        latestProviderDispatchOverrideCompletion: {
            completion_id: completion.completion_id || "",
            work_item_id: completion.followup_work_item_id || "",
            closed,
            itemIds,
            at,
        },
    });
    return { closed, itemIds };
}
function timelineBindingHasRequiredNativeRepairEvidence(binding = {}) {
    if (!(0, group_orchestrator_coded_part_03_1.isTimelineClosableNativeRepairSourceForCoordinator)(binding.source))
        return false;
    const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((item) => String(item || "").trim()).filter(Boolean));
    if (!group_orchestrator_coded_part_03_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type)))
        return false;
    const receiptStatus = String(binding.receipt_status || binding.receiptStatus || "").trim();
    return !!binding.brief_id
        && !!binding.work_item_id
        && !!binding.task_id
        && !!binding.assignment_id
        && !!binding.dispatch_key
        && !!binding.worker_context_packet_id
        && !!binding.task_agent_session_id
        && !!binding.memory_context_snapshot_id
        && !!binding.execution_id
        && !!binding.runner_request_id
        && !!binding.proof_entry_id
        && !!binding.request_patch_checksum
        && !!binding.request_telemetry_session_status
        && !!binding.request_telemetry_dispatch_status
        && ["done", "completed", "ok"].includes(receiptStatus);
}
function timelineBindingMatchesRepairWorkItem(binding = {}, item = {}) {
    const bindingWorkItemId = String(binding.work_item_id || "").trim();
    const itemId = String(item.work_item_id || item.id || "").trim();
    if (bindingWorkItemId && itemId && bindingWorkItemId === itemId)
        return true;
    const bindingRequest = String(binding.request_patch_checksum || "").trim();
    const itemRequest = String(item.request_patch_checksum || "").trim();
    if (bindingRequest && itemRequest && bindingRequest === itemRequest)
        return true;
    const bindingRunner = String(binding.runner_request_id || "").trim();
    const itemRunner = String(item.runner_request_id || item.request_telemetry_runner_request_id || "").trim();
    if (bindingRunner && itemRunner && bindingRunner === itemRunner)
        return true;
    const bindingProof = String(binding.proof_entry_id || "").trim();
    const itemProof = String(item.proof_entry_id || "").trim();
    return !!bindingProof && !!itemProof && bindingProof === itemProof;
}
function providerRankingProvenanceProofString(value) {
    return String(value || "").trim();
}
function providerRankingProvenanceProofStringListForCoordinator(...values) {
    const flattened = [];
    for (const value of values) {
        if (Array.isArray(value))
            flattened.push(...value.map((item) => providerRankingProvenanceProofString(item)));
        else if (value !== undefined && value !== null && value !== "")
            flattened.push(providerRankingProvenanceProofString(value));
    }
    return (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(flattened);
}
function providerRankingProvenanceProofBooleanForCoordinator(value) {
    if (value === true)
        return true;
    if (value === false)
        return false;
    const text = String(value || "").trim().toLowerCase();
    if (["true", "yes", "1", "preserved", "ok", "completed", "verified"].includes(text))
        return true;
    if (["false", "no", "0", "missing", "lost", "blocked", "failed"].includes(text))
        return false;
    return false;
}
function providerRankingProvenanceRepairStatusForCoordinator(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["completed", "complete", "done", "resolved", "ok", "verified"].includes(status))
        return "completed";
    if (["blocked", "failed", "needs_info", "needs_user"].includes(status))
        return "blocked";
    if (["running", "in_progress", "claimed"].includes(status))
        return "in_progress";
    return status;
}
function providerRankingProvenanceGapTypeForCoordinator(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function providerRankingProvenanceProofFromConsumptionRowForCoordinator(row = {}, brief = {}, status = "") {
    const preservation = row.provider_ranking_provenance_preservation
        || row.providerRankingProvenancePreservation
        || row.preservation
        || {};
    const typedMemoryRelPaths = providerRankingProvenanceProofStringListForCoordinator(row.typedMemoryRelPaths, row.typed_memory_rel_paths, row.provider_ranking_provenance_rel_paths, row.providerRankingProvenanceRelPaths, preservation.typed_memory_rel_paths, preservation.typedMemoryRelPaths);
    const typedMemoryRowIds = providerRankingProvenanceProofStringListForCoordinator(row.typedMemoryRowIds, row.typed_memory_row_ids, row.provider_ranking_provenance_row_ids, row.providerRankingProvenanceRowIds, preservation.typed_memory_row_ids, preservation.typedMemoryRowIds);
    const receiptId = providerRankingProvenanceProofString(row.providerSwitchDecisionReceiptId
        || row.provider_switch_decision_receipt_id
        || row.providerSwitchReceiptId
        || row.provider_switch_receipt_id
        || preservation.provider_switch_decision_receipt_id
        || preservation.providerSwitchDecisionReceiptId
        || "");
    const receiptChecksum = providerRankingProvenanceProofString(row.providerSwitchDecisionReceiptChecksum
        || row.provider_switch_decision_receipt_checksum
        || row.providerSwitchReceiptChecksum
        || row.provider_switch_receipt_checksum
        || preservation.provider_switch_decision_receipt_checksum
        || preservation.providerSwitchDecisionReceiptChecksum
        || "");
    const repairStatus = providerRankingProvenanceRepairStatusForCoordinator(row.repairStatus
        || row.repair_status
        || row.providerRankingProvenanceRepairStatus
        || row.provider_ranking_provenance_repair_status
        || preservation.repair_status
        || preservation.repairStatus
        || "");
    const repairGapType = providerRankingProvenanceGapTypeForCoordinator(row.repairGapType
        || row.repair_gap_type
        || row.providerRankingProvenanceRepairGapType
        || row.provider_ranking_provenance_repair_gap_type
        || preservation.repair_gap_type
        || preservation.repairGapType
        || "");
    const preserved = providerRankingProvenanceProofBooleanForCoordinator(row.providerRankingProvenancePreserved
        ?? row.provider_ranking_provenance_preserved
        ?? preservation.preserved
        ?? preservation.provider_ranking_provenance_preserved
        ?? preservation.providerRankingProvenancePreserved
        ?? false);
    const required = providerRankingProvenanceProofBooleanForCoordinator(row.providerRankingProvenanceRequired
        ?? row.provider_ranking_provenance_required
        ?? preservation.required
        ?? preservation.provider_ranking_provenance_required
        ?? preservation.providerRankingProvenanceRequired
        ?? false);
    const rowBriefId = providerRankingProvenanceProofString(row.brief_id || row.briefId || "");
    const rowWorkItemId = providerRankingProvenanceProofString(row.work_item_id || row.workItemId || "");
    const briefId = providerRankingProvenanceProofString(brief.brief_id || brief.briefId || "");
    const workItemId = providerRankingProvenanceProofString(brief.work_item_id || brief.workItemId || "");
    const statusOk = String(status || "").trim().toLowerCase() === "verified";
    const matchesBrief = !!briefId && rowBriefId === briefId;
    const matchesWorkItem = !!workItemId && rowWorkItemId === workItemId;
    const verified = statusOk
        && matchesBrief
        && matchesWorkItem
        && !!receiptId
        && !!receiptChecksum
        && typedMemoryRelPaths.length > 0
        && typedMemoryRowIds.length > 0
        && preserved === true
        && repairStatus === "completed"
        && repairGapType === "provider_ranking_provenance_compact";
    return {
        verified,
        receiptId,
        receiptChecksum,
        typedMemoryRelPaths,
        typedMemoryRowIds,
        preserved,
        required,
        repairStatus,
        repairGapType,
        rowBriefId,
        rowWorkItemId,
    };
}
function timelineBindingMatchesProviderRankingProvenanceRepairWorkItem(binding = {}, item = {}) {
    if (!(0, group_orchestrator_coded_part_03_1.isProviderRankingProvenanceCompactRepairSourceForCoordinator)(item.source))
        return false;
    const bindingWorkItemId = providerRankingProvenanceProofString(binding.work_item_id || "");
    const itemId = providerRankingProvenanceProofString(item.work_item_id || item.id || "");
    if (!bindingWorkItemId || !itemId || bindingWorkItemId !== itemId)
        return false;
    const expectedReceiptId = providerRankingProvenanceProofString(item.provider_switch_decision_receipt_id || "");
    const expectedReceiptChecksum = providerRankingProvenanceProofString(item.provider_switch_decision_receipt_checksum || "");
    if (expectedReceiptId && binding.provider_switch_decision_receipt_id !== expectedReceiptId)
        return false;
    if (expectedReceiptChecksum && binding.provider_switch_decision_receipt_checksum !== expectedReceiptChecksum)
        return false;
    const bindingRelPaths = new Set(providerRankingProvenanceProofStringListForCoordinator(binding.provider_ranking_provenance_rel_paths));
    const bindingRowIds = new Set(providerRankingProvenanceProofStringListForCoordinator(binding.provider_ranking_provenance_row_ids));
    const expectedRelPaths = providerRankingProvenanceProofStringListForCoordinator(item.provider_ranking_provenance_rel_paths);
    const expectedRowIds = providerRankingProvenanceProofStringListForCoordinator(item.provider_ranking_provenance_row_ids);
    if (expectedRelPaths.length && !expectedRelPaths.every(value => bindingRelPaths.has(value)))
        return false;
    if (expectedRowIds.length && !expectedRowIds.every(value => bindingRowIds.has(value)))
        return false;
    return true;
}
function timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence(binding = {}, item = null) {
    if (!(0, group_orchestrator_coded_part_03_1.isProviderRankingProvenanceCompactRepairSourceForCoordinator)(binding.source))
        return false;
    const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((event) => String(event || "").trim()).filter(Boolean));
    if (!group_orchestrator_coded_part_03_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type)))
        return false;
    const receiptStatus = String(binding.receipt_status || binding.receiptStatus || "").trim().toLowerCase();
    if (!["done", "completed", "ok", "success"].includes(receiptStatus))
        return false;
    if (binding.replay_repair_consumption_source !== "receipt.replayRepairDispatchBriefUsage")
        return false;
    if (binding.provider_ranking_provenance_receipt_consumption_verified !== true)
        return false;
    if (!binding.brief_id || !binding.work_item_id || !binding.task_id || !binding.assignment_id || !binding.dispatch_key)
        return false;
    if (!binding.worker_context_packet_id || !binding.task_agent_session_id || !binding.memory_context_snapshot_id || !binding.execution_id)
        return false;
    if (!binding.provider_switch_decision_receipt_id || !binding.provider_switch_decision_receipt_checksum)
        return false;
    if (!Array.isArray(binding.provider_ranking_provenance_rel_paths) || binding.provider_ranking_provenance_rel_paths.length === 0)
        return false;
    if (!Array.isArray(binding.provider_ranking_provenance_row_ids) || binding.provider_ranking_provenance_row_ids.length === 0)
        return false;
    if (binding.provider_ranking_provenance_preserved !== true)
        return false;
    if (binding.provider_ranking_provenance_repair_status !== "completed")
        return false;
    if (binding.provider_ranking_provenance_repair_gap_type !== "provider_ranking_provenance_compact")
        return false;
    return item ? timelineBindingMatchesProviderRankingProvenanceRepairWorkItem(binding, item) : true;
}
function timelineBindingMatchesPostCompactReinjectionRepairWorkItem(binding = {}, item = {}) {
    if (!(0, group_orchestrator_coded_part_03_1.isPostCompactReinjectionRepairForCoordinator)(binding) || !(0, group_orchestrator_coded_part_03_1.isPostCompactReinjectionRepairForCoordinator)(item))
        return false;
    const bindingWorkItemId = String(binding.work_item_id || "").trim();
    const itemId = String(item.work_item_id || item.id || "").trim();
    if (!bindingWorkItemId || !itemId || bindingWorkItemId !== itemId)
        return false;
    const mirroredFields = [
        "reinjection_gate_id",
        "post_compact_candidate_id",
        "post_compact_candidate_kind",
        "post_compact_candidate_value",
    ];
    for (const field of mirroredFields) {
        const expected = String(item[field] || "").trim();
        if (expected && String(binding[field] || "").trim() !== expected)
            return false;
    }
    return true;
}
function timelineBindingHasRequiredPostCompactReinjectionRepairEvidence(binding = {}, item = null) {
    if (!(0, group_orchestrator_coded_part_03_1.isPostCompactReinjectionRepairForCoordinator)(binding))
        return false;
    const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((event) => String(event || "").trim()).filter(Boolean));
    if (!group_orchestrator_coded_part_03_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type)))
        return false;
    const receiptStatus = String(binding.receipt_status || binding.receiptStatus || "").trim().toLowerCase();
    if (!["done", "completed", "ok", "success"].includes(receiptStatus))
        return false;
    if (binding.replay_repair_consumption_source !== "receipt.replayRepairDispatchBriefUsage")
        return false;
    if (!["used", "verified", "ignored"].includes(String(binding.replay_repair_consumption_status || "").trim().toLowerCase()))
        return false;
    if (binding.post_compact_reinjection_receipt_verified !== true)
        return false;
    if (!binding.reinjection_gate_id || !binding.post_compact_candidate_id || !binding.post_compact_candidate_kind)
        return false;
    if (!binding.brief_id || !binding.work_item_id || !binding.task_id || !binding.assignment_id || !binding.dispatch_key)
        return false;
    if (!binding.worker_context_packet_id || !binding.worker_handoff_id || !binding.memory_context_snapshot_id)
        return false;
    if (!binding.task_agent_session_id || !binding.native_session_id || !binding.execution_id)
        return false;
    if (binding.post_compact_reinjection_task_session_matched !== true || binding.post_compact_reinjection_native_session_matched !== true)
        return false;
    const usageState = String(binding.post_compact_reinjection_receipt_usage_state || "").trim().toLowerCase();
    if (!["used", "verified", "ignored"].includes(usageState))
        return false;
    if (usageState === "ignored") {
        if (!String(binding.post_compact_reinjection_receipt_reason || "").trim())
            return false;
    }
    else if (binding.post_compact_reinjection_current_source_verified !== true) {
        return false;
    }
    if (binding.post_compact_reinjection_memory_receipt_matched !== true)
        return false;
    return item ? timelineBindingMatchesPostCompactReinjectionRepairWorkItem(binding, item) : true;
}
function timelineBindingMatchesPostCompactReceiptMemoryUsageRepairWorkItem(binding = {}, item = {}) {
    if (!isPostCompactReceiptMemoryUsageRepairForCoordinator(binding) || !isPostCompactReceiptMemoryUsageRepairForCoordinator(item))
        return false;
    const bindingWorkItemId = String(binding.work_item_id || "").trim();
    const itemId = String(item.work_item_id || item.id || "").trim();
    if (!bindingWorkItemId || bindingWorkItemId !== itemId)
        return false;
    const expectedDocs = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(item.post_compact_receipt_memory_required_doc_rel_paths || []);
    const bindingDocs = new Set((0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(binding.post_compact_receipt_memory_required_doc_rel_paths || []),
        ...(binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths || []),
    ]));
    return expectedDocs.length > 0 && expectedDocs.every((relPath) => bindingDocs.has(relPath));
}
function timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence(binding = {}, item = null) {
    if (!isPostCompactReceiptMemoryUsageRepairForCoordinator(binding))
        return false;
    const eventTypes = new Set((Array.isArray(binding.event_types) ? binding.event_types : []).map((event) => String(event || "").trim()).filter(Boolean));
    if (!group_orchestrator_coded_part_03_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS_FOR_COORDINATOR.every(type => eventTypes.has(type)))
        return false;
    const receiptStatus = String(binding.receipt_status || "").trim().toLowerCase();
    if (!["done", "completed", "ok", "success"].includes(receiptStatus))
        return false;
    if (binding.replay_repair_consumption_source !== "receipt.replayRepairDispatchBriefUsage")
        return false;
    if (!["used", "verified"].includes(String(binding.replay_repair_consumption_status || "").trim().toLowerCase()))
        return false;
    if (binding.post_compact_receipt_memory_usage_repair_verified !== true)
        return false;
    if (binding.post_compact_receipt_memory_usage_repair_all_docs_compliant !== true)
        return false;
    if (binding.post_compact_receipt_memory_usage_repair_historical_boundary_covered !== true)
        return false;
    if (binding.post_compact_receipt_memory_usage_repair_task_session_matched !== true
        || binding.post_compact_receipt_memory_usage_repair_native_session_matched !== true)
        return false;
    if (!binding.brief_id || !binding.work_item_id || !binding.task_id || !binding.assignment_id || !binding.dispatch_key)
        return false;
    if (!binding.worker_context_packet_id || !binding.worker_handoff_id || !binding.memory_context_snapshot_id)
        return false;
    if (!binding.task_agent_session_id || !binding.native_session_id || !binding.execution_id)
        return false;
    const requiredDocs = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths || []);
    const coveredDocs = new Set((0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(binding.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths || []));
    if (!requiredDocs.length || !requiredDocs.every((relPath) => coveredDocs.has(relPath)))
        return false;
    return item ? timelineBindingMatchesPostCompactReceiptMemoryUsageRepairWorkItem(binding, item) : true;
}
function closeReplayRepairWorkItemsFromTimelineBindingForCoordinator(groupId, binding = {}, at = new Date().toISOString()) {
    if (!groupId)
        return { closed: 0, itemIds: [] };
    const nativeTimelineClosable = timelineBindingHasRequiredNativeRepairEvidence(binding);
    const providerRankingTimelineClosable = timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence(binding);
    const postCompactReinjectionTimelineClosable = timelineBindingHasRequiredPostCompactReinjectionRepairEvidence(binding);
    const postCompactReceiptMemoryUsageTimelineClosable = timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence(binding);
    if (!nativeTimelineClosable && !providerRankingTimelineClosable && !postCompactReinjectionTimelineClosable && !postCompactReceiptMemoryUsageTimelineClosable)
        return { closed: 0, itemIds: [] };
    const groupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(binding.groupSessionId || binding.group_session_id || "");
    const file = (0, group_orchestrator_coded_part_01_1.getReplayRepairWorkItemsFileForCoordinator)(groupId, groupSessionId);
    let ledger = null;
    try {
        ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return { closed: 0, itemIds: [] };
    }
    const items = Array.isArray(ledger?.items) ? ledger.items : [];
    let closed = 0;
    const itemIds = [];
    const nextItems = items.map((item) => {
        const closeAsNative = nativeTimelineClosable
            && (0, group_orchestrator_coded_part_03_1.isTimelineClosableNativeRepairSourceForCoordinator)(item.source)
            && timelineBindingMatchesRepairWorkItem(binding, item);
        const closeAsProviderRanking = providerRankingTimelineClosable
            && (0, group_orchestrator_coded_part_03_1.isProviderRankingProvenanceCompactRepairSourceForCoordinator)(item.source)
            && timelineBindingHasRequiredProviderRankingProvenanceRepairEvidence(binding, item);
        const closeAsPostCompactReinjection = postCompactReinjectionTimelineClosable
            && (0, group_orchestrator_coded_part_03_1.isPostCompactReinjectionRepairForCoordinator)(item)
            && timelineBindingHasRequiredPostCompactReinjectionRepairEvidence(binding, item);
        const closeAsPostCompactReceiptMemoryUsage = postCompactReceiptMemoryUsageTimelineClosable
            && isPostCompactReceiptMemoryUsageRepairForCoordinator(item)
            && timelineBindingHasRequiredPostCompactReceiptMemoryUsageRepairEvidence(binding, item);
        if (!closeAsNative && !closeAsProviderRanking && !closeAsPostCompactReinjection && !closeAsPostCompactReceiptMemoryUsage)
            return item;
        if (!(0, group_orchestrator_coded_part_03_1.replayRepairWorkItemOpenForCoordinator)(item.status))
            return item;
        closed += 1;
        itemIds.push(String(item.work_item_id || item.id || ""));
        const evidence = [
            ...(Array.isArray(item.evidence) ? item.evidence : []),
            `timeline_binding=${binding.timeline_binding_id || ""}`,
            `timeline_events=${(binding.event_types || []).join(",")}`,
            binding.receipt_status ? `receipt_status=${binding.receipt_status}` : "",
            closeAsProviderRanking && binding.provider_switch_decision_receipt_id ? `provider_switch_decision_receipt_id=${binding.provider_switch_decision_receipt_id}` : "",
            closeAsProviderRanking && binding.provider_switch_decision_receipt_checksum ? `provider_switch_decision_receipt_checksum=${binding.provider_switch_decision_receipt_checksum}` : "",
            closeAsProviderRanking && binding.provider_ranking_provenance_rel_paths?.length ? `provider_ranking_rel_paths=${binding.provider_ranking_provenance_rel_paths.join(";")}` : "",
            closeAsProviderRanking && binding.provider_ranking_provenance_row_ids?.length ? `provider_ranking_row_ids=${binding.provider_ranking_provenance_row_ids.slice(0, 8).join(";")}` : "",
            closeAsPostCompactReinjection && binding.reinjection_gate_id ? `reinjection_gate_id=${binding.reinjection_gate_id}` : "",
            closeAsPostCompactReinjection && binding.post_compact_candidate_id ? `post_compact_candidate_id=${binding.post_compact_candidate_id}` : "",
            closeAsPostCompactReinjection && binding.post_compact_reinjection_receipt_usage_state ? `post_compact_candidate_usage=${binding.post_compact_reinjection_receipt_usage_state}` : "",
            closeAsPostCompactReinjection ? `post_compact_current_source_verified=${binding.post_compact_reinjection_current_source_verified === true}` : "",
            closeAsPostCompactReceiptMemoryUsage && binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths?.length ? `post_compact_receipt_memory_required_docs=${binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths.join(";")}` : "",
            closeAsPostCompactReceiptMemoryUsage ? `post_compact_receipt_memory_historical_boundary=${binding.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true}` : "",
            closeAsPostCompactReceiptMemoryUsage ? `post_compact_receipt_memory_repair_session=${binding.task_agent_session_id || ""}/${binding.native_session_id || ""}` : "",
        ].filter(Boolean);
        const verification = [
            ...(Array.isArray(item.verification) ? item.verification : []),
            closeAsProviderRanking
                ? "receipt replayRepairDispatchBriefUsage 已证明 provider ranking provenance compact repair 完成"
                : closeAsPostCompactReceiptMemoryUsage
                    ? "corrected receipt 已在新 repair session 覆盖全部 post-compact receipt MEMORY.md，并满足 current-source / ignored-reason / historical-boundary 合同"
                    : closeAsPostCompactReinjection
                        ? "receipt postCompactCandidateUsage 已证明精确 reinjection gate/candidate 在绑定子 Agent 会话中完成 used/ignored/verified 分类"
                        : "timeline binding 已证明 dispatch->session->snapshot->execution->receipt 闭环",
        ];
        const completionSource = closeAsProviderRanking
            ? "provider_ranking_provenance_replay_repair_receipt_consumption"
            : closeAsPostCompactReceiptMemoryUsage
                ? "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption"
                : closeAsPostCompactReinjection
                    ? "post_compact_reinjection_replay_repair_receipt_consumption"
                    : "replay_repair_timeline_binding";
        const resolutionReason = closeAsProviderRanking
            ? "provider_ranking_provenance_compact_repair_receipt_verified"
            : closeAsPostCompactReceiptMemoryUsage
                ? "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified"
                : closeAsPostCompactReinjection
                    ? "post_compact_reinjection_repair_receipt_verified"
                    : "timeline_binding_child_receipt_proved_native_repair";
        return {
            ...item,
            status: "completed",
            updatedAt: at,
            completedAt: item.completedAt || item.completed_at || at,
            resolutionReason,
            completion_source: completionSource,
            replay_repair_timeline_binding: {
                timeline_binding_id: binding.timeline_binding_id || "",
                brief_id: binding.brief_id || "",
                task_id: binding.task_id || "",
                assignment_id: binding.assignment_id || "",
                worker_context_packet_id: binding.worker_context_packet_id || "",
                task_agent_session_id: binding.task_agent_session_id || "",
                memory_context_snapshot_id: binding.memory_context_snapshot_id || "",
                execution_id: binding.execution_id || "",
                runner_request_id: binding.runner_request_id || "",
                receipt_status: binding.receipt_status || "",
                event_types: binding.event_types || [],
                groupSessionId,
                group_session_id: groupSessionId,
                completed_at: at,
            },
            provider_ranking_provenance_repair_receipt: closeAsProviderRanking ? {
                timeline_binding_id: binding.timeline_binding_id || "",
                brief_id: binding.brief_id || "",
                work_item_id: binding.work_item_id || "",
                provider_switch_decision_receipt_id: binding.provider_switch_decision_receipt_id || "",
                provider_switch_decision_receipt_checksum: binding.provider_switch_decision_receipt_checksum || "",
                typed_memory_rel_paths: binding.provider_ranking_provenance_rel_paths || [],
                typed_memory_row_ids: binding.provider_ranking_provenance_row_ids || [],
                provider_ranking_provenance_preserved: binding.provider_ranking_provenance_preserved === true,
                repair_status: binding.provider_ranking_provenance_repair_status || "",
                repair_gap_type: binding.provider_ranking_provenance_repair_gap_type || "",
                consumption_status: binding.replay_repair_consumption_status || "",
                consumption_source: binding.replay_repair_consumption_source || "",
                completed_at: at,
            } : item.provider_ranking_provenance_repair_receipt,
            post_compact_reinjection_repair_receipt: closeAsPostCompactReinjection ? {
                timeline_binding_id: binding.timeline_binding_id || "",
                brief_id: binding.brief_id || "",
                work_item_id: binding.work_item_id || "",
                reinjection_gate_id: binding.reinjection_gate_id || "",
                post_compact_candidate_id: binding.post_compact_candidate_id || "",
                post_compact_candidate_kind: binding.post_compact_candidate_kind || "",
                post_compact_candidate_value: binding.post_compact_candidate_value || "",
                usage_state: binding.post_compact_reinjection_receipt_usage_state || "",
                current_source_verified: binding.post_compact_reinjection_current_source_verified === true,
                memory_receipt_matched: binding.post_compact_reinjection_memory_receipt_matched === true,
                task_agent_session_id: binding.task_agent_session_id || "",
                native_session_id: binding.native_session_id || "",
                execution_id: binding.execution_id || "",
                groupSessionId,
                group_session_id: groupSessionId,
                completed_at: at,
            } : item.post_compact_reinjection_repair_receipt,
            post_compact_receipt_memory_usage_repair_receipt: closeAsPostCompactReceiptMemoryUsage ? {
                schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-repair-proof-v1",
                verified: true,
                timeline_binding_id: binding.timeline_binding_id || "",
                brief_id: binding.brief_id || "",
                work_item_id: binding.work_item_id || "",
                original_worker_context_packet_id: binding.original_worker_context_packet_id || item.original_worker_context_packet_id || "",
                original_binding_id: binding.original_binding_id || item.original_binding_id || "",
                required_doc_rel_paths: binding.post_compact_receipt_memory_usage_repair_required_doc_rel_paths || [],
                covered_doc_rel_paths: binding.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths || [],
                coverage_rows: binding.post_compact_receipt_memory_usage_repair_coverage_rows || [],
                all_docs_compliant: binding.post_compact_receipt_memory_usage_repair_all_docs_compliant === true,
                historical_boundary_covered: binding.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true,
                task_session_matched: binding.post_compact_receipt_memory_usage_repair_task_session_matched === true,
                native_session_matched: binding.post_compact_receipt_memory_usage_repair_native_session_matched === true,
                original_task_agent_session_id: binding.original_task_agent_session_id || item.original_task_agent_session_id || "",
                original_native_session_id: binding.original_native_session_id || item.original_native_session_id || "",
                original_assignment_id: binding.original_assignment_id || item.original_assignment_id || "",
                original_dispatch_key: binding.original_dispatch_key || item.original_dispatch_key || "",
                event_types: binding.event_types || [],
                task_agent_session_id: binding.task_agent_session_id || "",
                native_session_id: binding.native_session_id || "",
                execution_id: binding.execution_id || "",
                groupSessionId,
                group_session_id: groupSessionId,
                completed_at: at,
            } : item.post_compact_receipt_memory_usage_repair_receipt,
            blockers: [],
            needs: [],
            evidence: (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(evidence).slice(-24),
            verification: (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(verification).slice(-24),
        };
    });
    if (!closed)
        return { closed: 0, itemIds: [] };
    const next = {
        ...ledger,
        schema: ledger.schema || "ccm-compact-boundary-replay-repair-work-items-v1",
        version: ledger.version || 1,
        groupId: ledger.groupId || groupId,
        groupSessionId: groupSessionId || ledger.groupSessionId || "default",
        file: ledger.file || file,
        items: nextItems.slice(-160),
        stats: (0, group_orchestrator_coded_part_03_1.replayRepairWorkItemStatsForCoordinator)(nextItems),
        updatedAt: at,
        latestTimelineCompletion: {
            timeline_binding_id: binding.timeline_binding_id || "",
            brief_id: binding.brief_id || "",
            source: binding.source || "",
            completion_source: providerRankingTimelineClosable
                ? "provider_ranking_provenance_replay_repair_receipt_consumption"
                : postCompactReceiptMemoryUsageTimelineClosable
                    ? "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption"
                    : postCompactReinjectionTimelineClosable
                        ? "post_compact_reinjection_replay_repair_receipt_consumption"
                        : "replay_repair_timeline_binding",
            closed,
            itemIds,
            at,
        },
    };
    (0, group_orchestrator_coded_part_01_1.writeJsonAtomicForCoordinator)(file, next);
    return { closed, itemIds };
}
function mergeReplayRepairTimelineBinding(current = {}, incoming = {}) {
    const eventRefs = [
        ...(Array.isArray(current.event_refs) ? current.event_refs : []),
        ...(Array.isArray(incoming.event_refs) ? incoming.event_refs : []),
    ];
    const seenRefs = new Set();
    const mergedRefs = eventRefs.filter((event) => {
        const key = `${event.type || ""}|${event.id || ""}|${event.at || ""}`;
        if (seenRefs.has(key))
            return false;
        seenRefs.add(key);
        return true;
    }).slice(-40);
    const merged = {
        ...current,
        ...incoming,
        first_seen_at: current.first_seen_at || current.at || incoming.at || incoming.updated_at || "",
        at: incoming.at || current.at || "",
        updated_at: incoming.updated_at || incoming.at || current.updated_at || "",
        event_types: (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([...(current.event_types || []), ...(incoming.event_types || [])]).slice(0, 40),
        event_refs: mergedRefs,
    };
    for (const key of [
        "task_id",
        "project",
        "component",
        "assignment_id",
        "dispatch_key",
        "worker_context_packet_id",
        "worker_handoff_id",
        "memory_context_snapshot_id",
        "memory_context_snapshot_checksum",
        "task_agent_session_id",
        "native_session_id",
        "execution_id",
        "runner_request_id",
        "reinjection_gate_id",
        "post_compact_candidate_id",
        "post_compact_candidate_kind",
        "post_compact_candidate_value",
        "post_compact_candidate_source_message_id",
        "post_compact_reinjection_receipt_usage_state",
        "post_compact_reinjection_receipt_reason",
        "post_compact_reinjection_receipt_task_agent_session_id",
        "post_compact_reinjection_receipt_native_session_id",
        "original_worker_context_packet_id",
        "original_binding_id",
        "original_assignment_id",
        "original_dispatch_key",
        "original_task_agent_session_id",
        "original_native_session_id",
        "post_compact_receipt_memory_usage_repair_receipt_task_agent_session_id",
        "post_compact_receipt_memory_usage_repair_receipt_native_session_id",
        "proof_entry_id",
        "request_patch_checksum",
        "provider_reproof_status",
        "provider_reproof_reason",
        "reproof_candidate_id",
        "original_timeline_binding_id",
        "original_work_item_id",
        "request_telemetry_session_status",
        "request_telemetry_dispatch_status",
        "receipt_status",
        "replay_repair_consumption_status",
        "replay_repair_consumption_reason",
        "replay_repair_consumption_source",
        "replay_repair_consumption_state",
        "provider_switch_decision_receipt_id",
        "provider_switch_decision_receipt_checksum",
        "provider_ranking_provenance_repair_status",
        "provider_ranking_provenance_repair_gap_type",
    ]) {
        merged[key] = incoming[key] || current[key] || "";
    }
    merged.provider_ranking_provenance_rel_paths = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(Array.isArray(current.provider_ranking_provenance_rel_paths) ? current.provider_ranking_provenance_rel_paths : []),
        ...(Array.isArray(incoming.provider_ranking_provenance_rel_paths) ? incoming.provider_ranking_provenance_rel_paths : []),
    ]).slice(0, 24);
    merged.provider_ranking_provenance_row_ids = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(Array.isArray(current.provider_ranking_provenance_row_ids) ? current.provider_ranking_provenance_row_ids : []),
        ...(Array.isArray(incoming.provider_ranking_provenance_row_ids) ? incoming.provider_ranking_provenance_row_ids : []),
    ]).slice(0, 32);
    merged.provider_ranking_provenance_preserved = incoming.provider_ranking_provenance_preserved === true
        || current.provider_ranking_provenance_preserved === true;
    merged.provider_ranking_provenance_required = incoming.provider_ranking_provenance_required === true
        || current.provider_ranking_provenance_required === true;
    merged.provider_ranking_provenance_receipt_consumption_verified = incoming.provider_ranking_provenance_receipt_consumption_verified === true
        || current.provider_ranking_provenance_receipt_consumption_verified === true;
    merged.post_compact_reinjection_current_source_verified = incoming.post_compact_reinjection_current_source_verified === true
        || current.post_compact_reinjection_current_source_verified === true;
    merged.post_compact_reinjection_memory_receipt_matched = incoming.post_compact_reinjection_memory_receipt_matched === true
        || current.post_compact_reinjection_memory_receipt_matched === true;
    merged.post_compact_reinjection_task_session_matched = incoming.post_compact_reinjection_task_session_matched === true
        || current.post_compact_reinjection_task_session_matched === true;
    merged.post_compact_reinjection_native_session_matched = incoming.post_compact_reinjection_native_session_matched === true
        || current.post_compact_reinjection_native_session_matched === true;
    merged.post_compact_reinjection_receipt_verified = incoming.post_compact_reinjection_receipt_verified === true
        || current.post_compact_reinjection_receipt_verified === true;
    merged.post_compact_reinjection_receipt_gaps = incoming.post_compact_reinjection_receipt_verified === true
        ? []
        : (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
            ...(Array.isArray(current.post_compact_reinjection_receipt_gaps) ? current.post_compact_reinjection_receipt_gaps : []),
            ...(Array.isArray(incoming.post_compact_reinjection_receipt_gaps) ? incoming.post_compact_reinjection_receipt_gaps : []),
        ]).slice(0, 24);
    merged.post_compact_receipt_memory_required_doc_rel_paths = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(Array.isArray(current.post_compact_receipt_memory_required_doc_rel_paths) ? current.post_compact_receipt_memory_required_doc_rel_paths : []),
        ...(Array.isArray(incoming.post_compact_receipt_memory_required_doc_rel_paths) ? incoming.post_compact_receipt_memory_required_doc_rel_paths : []),
    ]).slice(0, 16);
    merged.post_compact_receipt_memory_usage_repair_required_doc_rel_paths = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(Array.isArray(current.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? current.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
        ...(Array.isArray(incoming.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? incoming.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
    ]).slice(0, 16);
    merged.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(Array.isArray(current.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths) ? current.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths : []),
        ...(Array.isArray(incoming.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths) ? incoming.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths : []),
    ]).slice(0, 16);
    merged.post_compact_receipt_memory_gap_codes = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
        ...(Array.isArray(current.post_compact_receipt_memory_gap_codes) ? current.post_compact_receipt_memory_gap_codes : []),
        ...(Array.isArray(incoming.post_compact_receipt_memory_gap_codes) ? incoming.post_compact_receipt_memory_gap_codes : []),
    ]).slice(0, 24);
    merged.post_compact_receipt_memory_usage_repair_coverage_rows = Array.isArray(incoming.post_compact_receipt_memory_usage_repair_coverage_rows)
        && incoming.post_compact_receipt_memory_usage_repair_coverage_rows.length
        ? incoming.post_compact_receipt_memory_usage_repair_coverage_rows
        : Array.isArray(current.post_compact_receipt_memory_usage_repair_coverage_rows)
            ? current.post_compact_receipt_memory_usage_repair_coverage_rows
            : [];
    merged.post_compact_receipt_memory_usage_repair_historical_boundary_covered = incoming.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true
        || current.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true;
    merged.post_compact_receipt_memory_usage_repair_all_docs_compliant = incoming.post_compact_receipt_memory_usage_repair_all_docs_compliant === true
        || current.post_compact_receipt_memory_usage_repair_all_docs_compliant === true;
    merged.post_compact_receipt_memory_usage_repair_task_session_matched = incoming.post_compact_receipt_memory_usage_repair_task_session_matched === true
        || current.post_compact_receipt_memory_usage_repair_task_session_matched === true;
    merged.post_compact_receipt_memory_usage_repair_native_session_matched = incoming.post_compact_receipt_memory_usage_repair_native_session_matched === true
        || current.post_compact_receipt_memory_usage_repair_native_session_matched === true;
    merged.post_compact_receipt_memory_usage_repair_verified = incoming.post_compact_receipt_memory_usage_repair_verified === true
        || current.post_compact_receipt_memory_usage_repair_verified === true;
    merged.post_compact_receipt_memory_usage_repair_gaps = incoming.post_compact_receipt_memory_usage_repair_verified === true
        ? []
        : (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)([
            ...(Array.isArray(current.post_compact_receipt_memory_usage_repair_gaps) ? current.post_compact_receipt_memory_usage_repair_gaps : []),
            ...(Array.isArray(incoming.post_compact_receipt_memory_usage_repair_gaps) ? incoming.post_compact_receipt_memory_usage_repair_gaps : []),
        ]).slice(0, 24);
    return merged;
}
function replayRepairConsumptionStringListForCoordinator(value) {
    if (Array.isArray(value))
        return value.map((item) => typeof item === "string" ? item : JSON.stringify(item || {})).filter(Boolean);
    if (value === undefined || value === null || value === "")
        return [];
    return [typeof value === "string" ? value : JSON.stringify(value || {})].filter(Boolean);
}
function replayRepairConsumptionRowsForCoordinator(receipt = {}) {
    const rows = [
        ...(Array.isArray(receipt.replayRepairDispatchBriefUsage) ? receipt.replayRepairDispatchBriefUsage : []),
        ...(Array.isArray(receipt.replay_repair_dispatch_brief_usage) ? receipt.replay_repair_dispatch_brief_usage : []),
        ...(Array.isArray(receipt.replayRepairBriefUsage) ? receipt.replayRepairBriefUsage : []),
        ...(Array.isArray(receipt.replay_repair_brief_usage) ? receipt.replay_repair_brief_usage : []),
        ...(Array.isArray(receipt.replayRepairUsage) ? receipt.replayRepairUsage : []),
        ...(Array.isArray(receipt.replay_repair_usage) ? receipt.replay_repair_usage : []),
    ];
    return rows.filter((row) => row && typeof row === "object");
}
function replayRepairConsumptionMatchesBriefForCoordinator(row = {}, brief = {}) {
    const rowBriefId = String(row.brief_id || row.briefId || "").trim();
    const briefId = String(brief.brief_id || brief.briefId || "").trim();
    if (rowBriefId && briefId && rowBriefId === briefId)
        return true;
    const rowWorkItem = String(row.work_item_id || row.workItemId || "").trim();
    const workItem = String(brief.work_item_id || brief.workItemId || "").trim();
    if (rowWorkItem && workItem && rowWorkItem === workItem)
        return true;
    const rowRequest = String(row.request_patch_checksum || row.requestPatchChecksum || "").trim();
    const request = String(brief.request_patch_checksum || brief.requestPatchChecksum || "").trim();
    return !!rowRequest && !!request && rowRequest === request;
}
function normalizeReplayRepairConsumptionStatusForCoordinator(value, fallback = "") {
    const status = String(value || fallback || "").trim().toLowerCase();
    if (["strong", "native_strong", "provider_strong"].includes(status))
        return "strong";
    if (["used", "consumed", "applied"].includes(status))
        return "used";
    if (["verified", "checked", "rechecked"].includes(status))
        return "verified";
    if (["ignored", "not_used", "skipped"].includes(status))
        return "ignored";
    if (["blocked", "failed", "needs_info", "needs-user", "needs_user"].includes(status))
        return "blocked";
    return "";
}
function postCompactCandidateUsageRowsForCoordinator(receipt = {}) {
    return [
        ...(Array.isArray(receipt.postCompactCandidateUsage) ? receipt.postCompactCandidateUsage : []),
        ...(Array.isArray(receipt.post_compact_candidate_usage) ? receipt.post_compact_candidate_usage : []),
        ...(Array.isArray(receipt.postCompactCandidateUsageRows) ? receipt.postCompactCandidateUsageRows : []),
        ...(Array.isArray(receipt.post_compact_candidate_usage_rows) ? receipt.post_compact_candidate_usage_rows : []),
    ].filter((row) => row && typeof row === "object");
}
function normalizePostCompactCandidateUsageStateForCoordinator(value) {
    const state = String(value || "").trim().toLowerCase();
    if (["used", "applied", "consumed"].includes(state))
        return "used";
    if (["verified", "checked", "reviewed", "validated", "confirmed"].includes(state))
        return "verified";
    if (["ignored", "skipped", "unused", "not_used", "not-used", "not used"].includes(state))
        return "ignored";
    return "";
}
function postCompactReinjectionReceiptProofForCoordinator(brief = {}, receipt = null) {
    if (!(0, group_orchestrator_coded_part_03_1.isPostCompactReinjectionRepairForCoordinator)(brief) || !receipt || typeof receipt !== "object")
        return null;
    const expectedGateId = String(brief.reinjection_gate_id || brief.reinjectionGateId || "").trim();
    const expectedCandidateId = String(brief.post_compact_candidate_id || brief.postCompactCandidateId || "").trim();
    const expectedCandidateKind = String(brief.post_compact_candidate_kind || brief.postCompactCandidateKind || "").trim();
    const expectedCandidateValue = String(brief.post_compact_candidate_value || brief.postCompactCandidateValue || "").trim();
    const rows = postCompactCandidateUsageRowsForCoordinator(receipt);
    const row = rows.find((item) => {
        const gateId = String(item.gateId || item.gate_id || item.reinjectionGateId || item.reinjection_gate_id || "").trim();
        const candidateId = String(item.candidateId || item.candidate_id || item.postCompactCandidateId || item.post_compact_candidate_id || "").trim();
        return !!expectedGateId && !!expectedCandidateId && gateId === expectedGateId && candidateId === expectedCandidateId;
    }) || null;
    const usageState = normalizePostCompactCandidateUsageStateForCoordinator(row?.usageState || row?.usage_state || row?.status || row?.state || "");
    const currentSourceVerified = row?.currentSourceVerified === true
        || row?.current_source_verified === true
        || ["true", "yes", "1", "verified"].includes(String(row?.currentSourceVerified || row?.current_source_verified || "").trim().toLowerCase());
    const reason = (0, group_orchestrator_prompts_1.compactText)(row?.reason || row?.summary || "", 360);
    const usedText = replayRepairConsumptionStringListForCoordinator(receipt.memoryUsed || receipt.memory_used || receipt.used).join("\n");
    const ignoredText = replayRepairConsumptionStringListForCoordinator(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored).join("\n");
    const expectedTokens = [expectedGateId, expectedCandidateId].filter(Boolean);
    const memoryText = usageState === "ignored" ? ignoredText : usedText;
    const memoryReceiptMatched = expectedTokens.length === 2 && expectedTokens.every(token => memoryText.includes(token));
    const receiptTaskAgentSessionId = String(receipt.task_agent_session_id
        || receipt.taskAgentSessionId
        || receipt.session?.task_agent_session_id
        || receipt.session?.taskAgentSessionId
        || "").trim();
    const receiptNativeSessionId = String(receipt.native_session_id
        || receipt.nativeSessionId
        || receipt.session?.native_session_id
        || receipt.session?.nativeSessionId
        || "").trim();
    const usageValid = ["used", "verified", "ignored"].includes(usageState);
    const verificationValid = usageState === "ignored" ? !!reason : currentSourceVerified === true;
    const gaps = [
        !row ? "post_compact_candidate_usage_row" : "",
        !expectedGateId ? "reinjection_gate_id" : "",
        !expectedCandidateId ? "post_compact_candidate_id" : "",
        !usageValid ? "usage_state" : "",
        usageState !== "ignored" && currentSourceVerified !== true ? "current_source_verified" : "",
        usageState === "ignored" && !reason ? "ignored_reason" : "",
        !memoryReceiptMatched ? usageState === "ignored" ? "memoryIgnored_gate_candidate" : "memoryUsed_gate_candidate" : "",
        !receiptTaskAgentSessionId ? "receipt_task_agent_session_id" : "",
        !receiptNativeSessionId ? "receipt_native_session_id" : "",
    ].filter(Boolean);
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-proof-v1",
        verified: gaps.length === 0 && usageValid && verificationValid && memoryReceiptMatched,
        reinjectionGateId: expectedGateId,
        candidateId: expectedCandidateId,
        candidateKind: expectedCandidateKind,
        candidateValue: expectedCandidateValue,
        usageState,
        currentSourceVerified,
        reason,
        memoryReceiptMatched,
        receiptTaskAgentSessionId,
        receiptNativeSessionId,
        gaps,
    };
}
function isPostCompactReceiptMemoryUsageRepairForCoordinator(value = {}) {
    return String(value.source || value.dispatch_source || "").trim() === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair";
}
function postCompactReceiptMemoryUsageRepairProofForCoordinator(brief = {}, receipt = null) {
    if (!isPostCompactReceiptMemoryUsageRepairForCoordinator(brief) || !receipt || typeof receipt !== "object")
        return null;
    const requiredDocRelPaths = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(brief.post_compact_receipt_memory_required_doc_rel_paths || []).slice(0, 12);
    const memoryUsed = replayRepairConsumptionStringListForCoordinator(receipt.memoryUsed || receipt.memory_used || receipt.used);
    const memoryIgnored = replayRepairConsumptionStringListForCoordinator(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored);
    const coverageRows = requiredDocRelPaths.map((relPath) => {
        const usedRows = memoryUsed.filter((item) => item.includes(relPath));
        const ignoredRows = memoryIgnored.filter((item) => item.includes(relPath));
        const usedCovered = usedRows.some((item) => /usageState\s*=\s*(used|verified)|\b(used|verified)\b/i.test(item));
        const currentSourceVerified = usedRows.some((item) => /currentSourceVerified\s*=\s*true/i.test(item));
        const ignoredCovered = ignoredRows.some((item) => /usageState\s*=\s*(ignored|not_used|not used)|\bignored\b/i.test(item));
        const ignoredReasonCovered = ignoredRows.some((item) => /reason\s*=\s*[^;\s][^;]*/i.test(item));
        const ignoredReason = ignoredRows.map((item) => item.match(/reason\s*=\s*([^;]+)/i)?.[1]?.trim() || "").find(Boolean) || "";
        return {
            relPath,
            usageState: usedCovered ? "verified" : ignoredCovered ? "ignored" : "missing",
            covered: usedCovered || ignoredCovered,
            compliant: usedCovered ? currentSourceVerified : ignoredCovered ? ignoredReasonCovered : false,
            usedCovered,
            currentSourceVerified,
            ignoredCovered,
            ignoredReasonCovered,
            reason: ignoredReason,
        };
    });
    const receiptText = [...memoryUsed, ...memoryIgnored].join("\n");
    const historicalBoundaryCovered = /historical repair completion is recovery evidence|recovery evidence.*not permanent repository truth|历史.*恢复证据.*不是.*永久/i.test(receiptText);
    const receiptTaskAgentSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || receipt.session?.task_agent_session_id || "").trim();
    const receiptNativeSessionId = String(receipt.native_session_id || receipt.nativeSessionId || receipt.session?.native_session_id || "").trim();
    const originalTaskAgentSessionId = String(brief.original_task_agent_session_id || brief.originalTaskAgentSessionId || "").trim();
    const originalNativeSessionId = String(brief.original_native_session_id || brief.originalNativeSessionId || "").trim();
    const allDocsCovered = requiredDocRelPaths.length > 0 && coverageRows.every((row) => row.covered === true);
    const allDocsCompliant = requiredDocRelPaths.length > 0 && coverageRows.every((row) => row.compliant === true);
    const gaps = [
        !requiredDocRelPaths.length ? "required_doc_rel_paths" : "",
        !allDocsCovered ? "required_docs_missing" : "",
        !allDocsCompliant ? "usage_state_or_freshness_invalid" : "",
        !historicalBoundaryCovered ? "historical_freshness_boundary_missing" : "",
        !receiptTaskAgentSessionId ? "receipt_task_agent_session_id" : "",
        !receiptNativeSessionId ? "receipt_native_session_id" : "",
        originalTaskAgentSessionId && receiptTaskAgentSessionId === originalTaskAgentSessionId ? "repair_task_session_reused_original" : "",
        originalNativeSessionId && receiptNativeSessionId === originalNativeSessionId ? "repair_native_session_reused_original" : "",
    ].filter(Boolean);
    return {
        schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-repair-proof-v1",
        verified: gaps.length === 0,
        requiredDocRelPaths,
        coveredDocRelPaths: coverageRows.filter((row) => row.covered).map((row) => row.relPath),
        coverageRows,
        historicalBoundaryCovered,
        allDocsCovered,
        allDocsCompliant,
        receiptTaskAgentSessionId,
        receiptNativeSessionId,
        originalTaskAgentSessionId,
        originalNativeSessionId,
        gaps,
    };
}
function classifyReplayRepairBriefConsumptionForCoordinator(brief = {}, receipt = null) {
    if (!receipt || typeof receipt !== "object" || !Object.keys(receipt).length)
        return null;
    const postCompactReinjectionProof = postCompactReinjectionReceiptProofForCoordinator(brief, receipt);
    const postCompactReceiptMemoryUsageRepairProof = postCompactReceiptMemoryUsageRepairProofForCoordinator(brief, receipt);
    const rows = replayRepairConsumptionRowsForCoordinator(receipt);
    const matchedRow = rows.find((row) => replayRepairConsumptionMatchesBriefForCoordinator(row, brief));
    if (matchedRow) {
        const status = normalizeReplayRepairConsumptionStatusForCoordinator(matchedRow.usage_state || matchedRow.usageState || matchedRow.status || matchedRow.provider_reproof_status || matchedRow.providerReproofStatus, String(matchedRow.provider_reproof_status || matchedRow.providerReproofStatus || "").trim().toLowerCase() === "strong" ? "strong" : "used");
        const providerRankingProof = providerRankingProvenanceProofFromConsumptionRowForCoordinator(matchedRow, brief, status || "used");
        return {
            status: status || "used",
            state: String(matchedRow.usage_state || matchedRow.usageState || matchedRow.status || ""),
            reason: (0, group_orchestrator_prompts_1.compactText)(matchedRow.reason || matchedRow.summary || "", 360),
            source: "receipt.replayRepairDispatchBriefUsage",
            providerRankingProof,
            postCompactReinjectionProof,
            postCompactReceiptMemoryUsageRepairProof,
        };
    }
    const tokens = [
        brief.brief_id,
        brief.work_item_id,
        brief.request_patch_checksum,
        brief.proof_entry_id,
        brief.runner_request_id,
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const containsToken = (values) => {
        const text = replayRepairConsumptionStringListForCoordinator(values).join("\n");
        return tokens.some(token => token && text.includes(token));
    };
    if (containsToken(receipt.memoryUsed || receipt.memory_used || receipt.used)) {
        const text = replayRepairConsumptionStringListForCoordinator(receipt.memoryUsed || receipt.memory_used || receipt.used).join("\n");
        return {
            status: /provider[_\s-]*reproof[_\s-]*status\s*[:=]\s*strong|nativeApplyStrongProof\s*[:=]\s*true/i.test(text) ? "strong" : "used",
            state: "",
            reason: (0, group_orchestrator_prompts_1.compactText)(text, 360),
            source: "receipt.memoryUsed",
            postCompactReinjectionProof,
            postCompactReceiptMemoryUsageRepairProof,
        };
    }
    if (containsToken(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored)) {
        const text = replayRepairConsumptionStringListForCoordinator(receipt.memoryIgnored || receipt.memory_ignored || receipt.ignored).join("\n");
        return {
            status: "ignored",
            state: "",
            reason: (0, group_orchestrator_prompts_1.compactText)(text, 360),
            source: "receipt.memoryIgnored",
            postCompactReinjectionProof,
            postCompactReceiptMemoryUsageRepairProof,
        };
    }
    const blockerText = replayRepairConsumptionStringListForCoordinator([
        ...(Array.isArray(receipt.blockers) ? receipt.blockers : []),
        ...(Array.isArray(receipt.needs) ? receipt.needs : []),
        receipt.summary || "",
    ]).join("\n");
    if (tokens.some(token => token && blockerText.includes(token)) || ["blocked", "failed", "needs_info"].includes(String(receipt.status || "").trim())) {
        return {
            status: "blocked",
            state: String(receipt.status || ""),
            reason: (0, group_orchestrator_prompts_1.compactText)(blockerText || receipt.summary || "receipt blocked without replay repair usage declaration", 360),
            source: "receipt.blockers",
            postCompactReinjectionProof,
        };
    }
    return {
        status: "missing",
        state: "",
        reason: "receipt did not declare replay repair brief usage",
        source: "receipt",
        postCompactReinjectionProof,
    };
}
function recordReplayRepairDispatchBriefTimelineBinding(groupId, input = {}, options = {}) {
    return require("./group-orchestrator-replay-repair").recordReplayRepairDispatchBriefTimelineBinding(groupId, input, options);
}
function replayRepairStatusForCoordinator(item) {
    const status = String(item?.status || "").toLowerCase();
    if (["in_progress", "running", "claimed", "dispatching"].includes(status))
        return "in_progress";
    if (["blocked", "needs_info", "needs_user", "waiting"].includes(status))
        return "blocked";
    if (["completed", "done", "resolved", "ok"].includes(status))
        return "completed";
    if (["cancelled", "canceled", "superseded"].includes(status))
        return "cancelled";
    return "pending";
}
function replayRepairPriorityRankForCoordinator(priority) {
    const value = String(priority || "").toLowerCase();
    if (value === "critical")
        return 0;
    if (value === "high")
        return 1;
    if (value === "medium")
        return 2;
    return 3;
}
function candidateNativeBindingForCoordinator(candidate = {}) {
    return [
        candidate.proof_entry_id ? `proof=${candidate.proof_entry_id}` : "",
        candidate.request_patch_checksum ? `request=${candidate.request_patch_checksum}` : "",
        candidate.provider_reproof_status ? `provider_reproof=${candidate.provider_reproof_status}` : "",
        candidate.provider_reproof_reason ? `provider_reason=${candidate.provider_reproof_reason}` : "",
        candidate.timeline_binding_id ? `timeline=${candidate.timeline_binding_id}` : "",
        candidate.request_telemetry_source ? `source=${candidate.request_telemetry_source}` : "",
        candidate.request_telemetry_session_status ? `session=${candidate.request_telemetry_session_status}` : "",
        candidate.request_telemetry_dispatch_status ? `dispatch=${candidate.request_telemetry_dispatch_status}` : "",
        candidate.runner_request_id ? `runner=${candidate.runner_request_id}` : "",
        candidate.execution_id ? `execution=${candidate.execution_id}` : "",
        candidate.provider_switch_decision_receipt_id ? `provider_receipt=${candidate.provider_switch_decision_receipt_id}` : "",
        candidate.provider_switch_decision_receipt_checksum ? `provider_receipt_checksum=${candidate.provider_switch_decision_receipt_checksum}` : "",
        Array.isArray(candidate.provider_ranking_provenance_rel_paths) && candidate.provider_ranking_provenance_rel_paths.length
            ? `provider_memory=${candidate.provider_ranking_provenance_rel_paths.slice(0, 3).join("|")}`
            : "",
        Array.isArray(candidate.provider_ranking_provenance_gap_codes) && candidate.provider_ranking_provenance_gap_codes.length
            ? `provider_gaps=${candidate.provider_ranking_provenance_gap_codes.slice(0, 3).join("|")}`
            : "",
    ].filter(Boolean);
}
function readyReplayRepairDispatchBriefsForCoordinator(groupId) {
    const ledger = (0, group_orchestrator_coded_part_03_1.readReplayRepairDispatchPlanLedgerForCoordinator)(groupId);
    return (Array.isArray(ledger.briefs) ? ledger.briefs : [])
        .filter((brief) => String(brief.status || "") === "ready");
}
function replayRepairBriefMatchText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function replayRepairBriefMatchScore(brief = {}, assignment = {}) {
    const project = String(assignment.project || assignment.targetName || "").trim();
    const text = replayRepairBriefMatchText([
        assignment.task,
        assignment.reason,
        assignment.dependsOn,
    ].filter(Boolean).join("\n"));
    const target = String(brief.dispatch_target || brief.target_project || "").trim();
    if (target && project && target !== project)
        return { score: 0, matched: [] };
    let score = target && project && target === project ? 20 : 0;
    const tokens = [
        { value: brief.brief_id, weight: 80, key: "brief_id" },
        { value: brief.work_item_id, weight: 70, key: "work_item_id" },
        { value: brief.request_patch_checksum, weight: 55, key: "request_patch_checksum" },
        { value: brief.runner_request_id, weight: 45, key: "runner_request_id" },
        { value: brief.proof_entry_id, weight: 35, key: "proof_entry_id" },
    ];
    const matched = [];
    for (const token of tokens) {
        const value = replayRepairBriefMatchText(token.value);
        if (value && text.includes(value)) {
            score += token.weight;
            matched.push(token.key);
        }
    }
    if (/replay|repair|修复|记忆|压缩|compact|native|proof|证明|runner|telemetry|派发/.test(text))
        score += 18;
    if ((0, group_orchestrator_coded_part_03_1.isApiMicrocompactNativeProofRepairSourceForCoordinator)(brief.source) && /native|proof|证明|runner|telemetry|microcompact|原生|re-proof/.test(text))
        score += 18;
    return { score, matched };
}
//# sourceMappingURL=group-orchestrator-coded-part-04.js.map