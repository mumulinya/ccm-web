"use strict";
// Behavior-freeze split from typed-memory-distillation-receipts.ts (part 3/5).
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.providerDispatchOverrideFollowupCompletion = providerDispatchOverrideFollowupCompletion;
exports.providerDispatchOverrideFollowupRepair = providerDispatchOverrideFollowupRepair;
exports.providerDispatchOverrideFollowupUsageRows = providerDispatchOverrideFollowupUsageRows;
exports.providerDispatchOverrideFollowupRowId = providerDispatchOverrideFollowupRowId;
exports.normalizeProviderDispatchOverrideFollowupRows = normalizeProviderDispatchOverrideFollowupRows;
exports.mergeProviderDispatchOverrideFollowupRows = mergeProviderDispatchOverrideFollowupRows;
exports.pressureProvenanceProviderDispatchOverrideFollowupArchive = pressureProvenanceProviderDispatchOverrideFollowupArchive;
exports.renderPressureProvenanceProviderDispatchOverrideFollowupBody = renderPressureProvenanceProviderDispatchOverrideFollowupBody;
exports.distillProviderDispatchOverrideFollowupToTypedMemory = distillProviderDispatchOverrideFollowupToTypedMemory;
exports.providerSwitchExecutionInputRows = providerSwitchExecutionInputRows;
exports.providerSwitchExecutionReceiptFromInput = providerSwitchExecutionReceiptFromInput;
exports.providerSwitchDecisionReceiptFromInput = providerSwitchDecisionReceiptFromInput;
exports.providerSwitchExecutionSessionBindingFromInput = providerSwitchExecutionSessionBindingFromInput;
exports.providerSwitchExecutionRowId = providerSwitchExecutionRowId;
exports.normalizeProviderSwitchExecutionRows = normalizeProviderSwitchExecutionRows;
exports.mergeProviderSwitchExecutionRows = mergeProviderSwitchExecutionRows;
exports.providerSwitchExecutionArchive = providerSwitchExecutionArchive;
exports.renderProviderSwitchExecutionBody = renderProviderSwitchExecutionBody;
exports.distillProviderSwitchExecutionToTypedMemory = distillProviderSwitchExecutionToTypedMemory;
exports.providerDispatchOverrideFollowupReceiptValidationInputRows = providerDispatchOverrideFollowupReceiptValidationInputRows;
exports.providerDispatchOverrideFollowupReceiptValidationRowId = providerDispatchOverrideFollowupReceiptValidationRowId;
exports.normalizeProviderDispatchOverrideFollowupReceiptValidationRows = normalizeProviderDispatchOverrideFollowupReceiptValidationRows;
exports.mergeProviderDispatchOverrideFollowupReceiptValidationRows = mergeProviderDispatchOverrideFollowupReceiptValidationRows;
exports.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive = pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive;
exports.renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody = renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody;
exports.distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory = distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory;
exports.ignoreMemoryReceiptRepairInputRows = ignoreMemoryReceiptRepairInputRows;
exports.ignoreMemoryReceiptRepairRowId = ignoreMemoryReceiptRepairRowId;
exports.normalizeIgnoreMemoryReceiptRepairRows = normalizeIgnoreMemoryReceiptRepairRows;
exports.mergeIgnoreMemoryReceiptRepairRows = mergeIgnoreMemoryReceiptRepairRows;
exports.ignoreMemoryReceiptRepairArchive = ignoreMemoryReceiptRepairArchive;
exports.renderIgnoreMemoryReceiptRepairBody = renderIgnoreMemoryReceiptRepairBody;
exports.distillIgnoreMemoryReceiptRepairToTypedMemory = distillIgnoreMemoryReceiptRepairToTypedMemory;
exports.pressureMemoryProvenanceReceiptRepairInputRows = pressureMemoryProvenanceReceiptRepairInputRows;
exports.pressureMemoryProvenanceReceiptRepairRowId = pressureMemoryProvenanceReceiptRepairRowId;
exports.normalizePressureMemoryProvenanceReceiptRepairRows = normalizePressureMemoryProvenanceReceiptRepairRows;
exports.mergePressureMemoryProvenanceReceiptRepairRows = mergePressureMemoryProvenanceReceiptRepairRows;
exports.pressureMemoryProvenanceReceiptRepairArchive = pressureMemoryProvenanceReceiptRepairArchive;
exports.renderPressureMemoryProvenanceReceiptRepairBody = renderPressureMemoryProvenanceReceiptRepairBody;
exports.distillPressureMemoryProvenanceReceiptRepairToTypedMemory = distillPressureMemoryProvenanceReceiptRepairToTypedMemory;
exports.distillPressureProvenancePreDispatchComplianceToTypedMemory = distillPressureProvenancePreDispatchComplianceToTypedMemory;
exports.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory = distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory;
exports.summarizeProviderDispatchOverrideFollowupPolicyAttributions = summarizeProviderDispatchOverrideFollowupPolicyAttributions;
exports.summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions = summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions;
exports.summarizeProviderSwitchExecutionPolicyAttributions = summarizeProviderSwitchExecutionPolicyAttributions;
exports.scoreProviderSwitchExecutionRows = scoreProviderSwitchExecutionRows;
exports.providerDispatchReliabilityNowMs = providerDispatchReliabilityNowMs;
exports.providerDispatchReliabilityRound = providerDispatchReliabilityRound;
exports.providerDispatchReliabilityDecayWeight = providerDispatchReliabilityDecayWeight;
exports.scoreProviderDispatchReliabilityRows = scoreProviderDispatchReliabilityRows;
exports.listProviderDispatchReliabilityDistillationLedgers = listProviderDispatchReliabilityDistillationLedgers;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_distillation_receipts_part_02_1 = require("./typed-memory-distillation-receipts-part-02");
function providerDispatchOverrideFollowupCompletion(entry = {}, raw = {}) {
    return entry.worker_context_provider_dispatch_override_completion
        || entry.workerContextProviderDispatchOverrideCompletion
        || entry.provider_dispatch_override_completion
        || entry.providerDispatchOverrideCompletion
        || raw.completion
        || {};
}
function providerDispatchOverrideFollowupRepair(entry = {}, completion = {}, raw = {}) {
    return entry.worker_context_provider_dispatch_override_followup_repair
        || entry.workerContextProviderDispatchOverrideFollowupRepair
        || entry.provider_dispatch_override_followup_repair_work_item
        || entry.providerDispatchOverrideFollowupRepairWorkItem
        || raw.followup
        || raw.followupRepair
        || raw.followup_repair
        || (completion.followup_work_item_id ? { work_item_id: completion.followup_work_item_id } : {})
        || {};
}
function providerDispatchOverrideFollowupUsageRows(receipt = {}) {
    return [
        ...(Array.isArray(receipt.memoryProvenanceUsage) ? receipt.memoryProvenanceUsage : []),
        ...(Array.isArray(receipt.memory_provenance_usage) ? receipt.memory_provenance_usage : []),
        ...(Array.isArray(receipt.pressureMemoryProvenanceUsage) ? receipt.pressureMemoryProvenanceUsage : []),
        ...(Array.isArray(receipt.pressure_memory_provenance_usage) ? receipt.pressure_memory_provenance_usage : []),
    ].filter((row) => row && typeof row === "object");
}
function providerDispatchOverrideFollowupRowId(row = {}) {
    return `provider-dispatch-override-followup:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.binding_id,
        row.assignment_id,
        row.worker_context_packet_id,
        row.override_id,
        row.completion_id,
        row.followup_work_item_id,
    ], 24)}`;
}
function normalizeProviderDispatchOverrideFollowupRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return (0, typed_memory_distillation_receipts_part_02_1.providerDispatchOverrideFollowupInputRows)(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const decision = (0, typed_memory_distillation_receipts_part_02_1.providerDispatchOverrideFollowupDecision)(entry, raw);
        const overrideReceipt = (0, typed_memory_distillation_receipts_part_02_1.providerDispatchOverrideFollowupReceipt)(entry, decision, raw);
        const completion = providerDispatchOverrideFollowupCompletion(entry, raw);
        const followup = providerDispatchOverrideFollowupRepair(entry, completion, raw);
        const receipt = completion.receipt || raw.receipt || {};
        const usageRows = providerDispatchOverrideFollowupUsageRows(receipt);
        const verifiedRows = usageRows.filter((row) => row.currentSourceVerified === true || row.current_source_verified === true);
        const completionOk = completion.completion_ok === true
            || (String(completion.status || "").toLowerCase() === "completed"
                && usageRows.length > 0
                && verifiedRows.length === usageRows.length);
        const memoryUsageCount = Number(completion.memory_provenance_usage_count || completion.memoryProvenanceUsageCount || usageRows.length || 0);
        const verifiedCount = Number(completion.current_source_verified_count || completion.currentSourceVerifiedCount || verifiedRows.length || 0);
        const row = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            project: String(entry.project || decision.project || completion.project || raw?.project || "").trim(),
            agent_type: String(entry.agent_type || entry.agentType || decision.agent_type || decision.agentType || completion.agent_type || completion.agentType || "unknown").trim() || "unknown",
            binding_id: String(entry.binding_id || entry.bindingId || completion.binding_id || completion.bindingId || raw?.binding_id || raw?.bindingId || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || completion.assignment_id || completion.assignmentId || raw?.assignment_id || raw?.assignmentId || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || completion.dispatch_key || completion.dispatchKey || raw?.dispatch_key || raw?.dispatchKey || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || completion.worker_context_packet_id || completion.workerContextPacketId || raw?.worker_context_packet_id || raw?.workerContextPacketId || "").trim(),
            decision_id: String(decision.decision_id || decision.decisionId || completion.decision_id || completion.decisionId || raw?.decision_id || raw?.decisionId || "").trim(),
            override_id: String(overrideReceipt.override_id || overrideReceipt.overrideId || completion.override_id || completion.overrideId || raw?.override_id || raw?.overrideId || "").trim(),
            followup_work_item_id: String(followup.work_item_id || followup.workItemId || completion.followup_work_item_id || completion.followupWorkItemId || raw?.followup_work_item_id || raw?.followupWorkItemId || "").trim(),
            completion_id: String(completion.completion_id || completion.completionId || raw?.completion_id || raw?.completionId || "").trim(),
            task_id: String(completion.task_id || completion.taskId || raw?.task_id || raw?.taskId || "").trim(),
            worker_handoff_id: String(completion.worker_handoff_id || completion.workerHandoffId || raw?.worker_handoff_id || raw?.workerHandoffId || "").trim(),
            task_agent_session_id: String(completion.task_agent_session_id || completion.taskAgentSessionId || raw?.task_agent_session_id || raw?.taskAgentSessionId || "").trim(),
            native_session_id: String(completion.native_session_id || completion.nativeSessionId || raw?.native_session_id || raw?.nativeSessionId || "").trim(),
            execution_id: String(completion.execution_id || completion.executionId || raw?.execution_id || raw?.executionId || "").trim(),
            memory_context_snapshot_id: String(completion.memory_context_snapshot_id || completion.memoryContextSnapshotId || raw?.memory_context_snapshot_id || raw?.memoryContextSnapshotId || "").trim(),
            receipt_status: String(completion.receipt_status || completion.receiptStatus || receipt.status || raw?.receipt_status || raw?.receiptStatus || "").trim().toLowerCase(),
            completion_status: completionOk ? "completed" : String(completion.status || "needs_repair").trim().toLowerCase(),
            completion_ok: completionOk,
            memory_provenance_usage_count: memoryUsageCount,
            current_source_verified_count: verifiedCount,
            all_current_source_verified: memoryUsageCount > 0 && verifiedCount === memoryUsageCount,
            approved_by: String(overrideReceipt.approved_by || overrideReceipt.approvedBy || raw?.approved_by || raw?.approvedBy || "").trim(),
            override_reason: (0, typed_memory_shared_1.compactText)(overrideReceipt.reason || overrideReceipt.override_reason || overrideReceipt.overrideReason || raw?.override_reason || "", 700),
            completion_reason: (0, typed_memory_shared_1.compactText)(completion.reason || raw?.reason || "", 700),
            rel_paths: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.relPath || usage.rel_path || usage.path || usage.file).filter(Boolean), 16),
            repair_statuses: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.repairStatus || usage.repair_status).filter(Boolean), 8),
            repair_gap_types: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.repairGapType || usage.repair_gap_type).filter(Boolean), 8),
            usage_states: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.usageState || usage.usage_state).filter(Boolean), 8),
            usage_reasons: (0, typed_memory_shared_1.uniqueStrings)(usageRows.map((usage) => usage.reason || usage.summary || usage.note).filter(Boolean), 8),
            dispatch_policy: String(decision.dispatch_policy || decision.dispatchPolicy || decision.action || "").trim(),
            health_status: String(decision.advisory_health_status || decision.health_status || decision.healthStatus || entry.worker_context_packet_pressure_provenance_provider_dispatch_advisory?.health_status || "").trim(),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || completion.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(completion.at || entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerDispatchOverrideFollowupRowId(row) };
    }).filter((row) => row.completion_ok === true)
        .filter((row) => row.memory_provenance_usage_count > 0 && row.all_current_source_verified === true);
}
function mergeProviderDispatchOverrideFollowupRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function pressureProvenanceProviderDispatchOverrideFollowupArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const attributionMap = new Map();
    for (const row of rows || []) {
        const key = `${String(row.agent_type || "unknown").toLowerCase()}|${String(row.project || "unknown").toLowerCase()}`;
        const current = attributionMap.get(key) || {
            agent_type: row.agent_type || "unknown",
            project: row.project || "unknown",
            completed_count: 0,
            memory_provenance_usage_count: 0,
            current_source_verified_count: 0,
            rel_paths: [],
            followup_work_item_ids: [],
            override_ids: [],
            first_completed_at: "",
            last_completed_at: "",
        };
        current.completed_count += 1;
        current.memory_provenance_usage_count += Number(row.memory_provenance_usage_count || 0);
        current.current_source_verified_count += Number(row.current_source_verified_count || 0);
        current.rel_paths = (0, typed_memory_shared_1.uniqueStrings)([...(current.rel_paths || []), ...(Array.isArray(row.rel_paths) ? row.rel_paths : [])], 20);
        current.followup_work_item_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.followup_work_item_ids || []), row.followup_work_item_id].filter(Boolean), 20);
        current.override_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.override_ids || []), row.override_id].filter(Boolean), 20);
        const completedAt = String(row.last_seen_at || row.first_seen_at || "");
        current.first_completed_at = current.first_completed_at
            ? [current.first_completed_at, completedAt].filter(Boolean).sort()[0]
            : completedAt;
        current.last_completed_at = [current.last_completed_at, completedAt].filter(Boolean).sort().slice(-1)[0] || "";
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()]
        .sort((a, b) => Number(b.completed_count || 0) - Number(a.completed_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    const relPaths = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.rel_paths) ? row.rel_paths : []), 80);
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
        version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
        archived_count: rows.length,
        completed_count: rows.length,
        attribution_count: attributions.length,
        rel_path_count: relPaths.length,
        all_current_source_verified_count: rows.filter((row) => row.all_current_source_verified === true).length,
        rel_paths: relPaths,
        attributions,
        rows,
        updatedAt,
    };
}
function renderPressureProvenanceProviderDispatchOverrideFollowupBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Provider Dispatch Override Follow-up Repair History",
        "",
        `Generated by CCM provider dispatch override follow-up distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        "This feedback memory records cases where pressure provenance provider dispatch was temporarily overridden, then repaired by a child Agent completion receipt with verified memoryProvenanceUsage rows.",
        "Stable rule: a completed override follow-up proves the specific repair loop was closed; it does not make future provider holds safe by default. Future dispatch should still prefer the normal provider gate, sample receipts, and re-check current source evidence.",
        "",
        "## Executor / Project Repair Attributions",
    ];
    for (const row of attributions.slice(0, 20)) {
        lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; completed=${row.completed_count || 0}; receiptRows=${row.memory_provenance_usage_count || 0}; verifiedRows=${row.current_source_verified_count || 0}; lastCompletedAt=${row.last_completed_at || ""}.`);
        if (row.rel_paths?.length)
            lines.push(`  Evidence docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
        if (row.followup_work_item_ids?.length)
            lines.push(`  Follow-up work items: ${row.followup_work_item_ids.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Completed Override Follow-ups");
    for (const row of rows.slice(-40).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.agent_type ? `agentType=${row.agent_type}` : "",
            row.task_id ? `task=${row.task_id}` : "",
            row.override_id ? `override=${row.override_id}` : "",
            row.completion_id ? `completion=${row.completion_id}` : "",
            row.followup_work_item_id ? `work_item=${row.followup_work_item_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [repaired] ${ids || row.row_id}; memoryProvenanceUsage=${row.memory_provenance_usage_count || 0}; currentSourceVerified=${row.current_source_verified_count || 0}; session=${row.task_agent_session_id || "unknown"}; execution=${row.execution_id || "unknown"}.`);
        if (row.rel_paths?.length)
            lines.push(`  relPath=${row.rel_paths.slice(0, 8).join(", ")}.`);
        if (row.usage_reasons?.length)
            lines.push(`  Usage evidence: ${row.usage_reasons.slice(0, 4).map((item) => (0, typed_memory_shared_1.compactText)(item, 500).replace(/\n/g, " ")).join(" | ")}`);
        if (row.override_reason)
            lines.push(`  Override reason: ${(0, typed_memory_shared_1.compactText)(row.override_reason, 500).replace(/\n/g, " ")}`);
        if (row.completion_reason)
            lines.push(`  Completion reason: ${(0, typed_memory_shared_1.compactText)(row.completion_reason, 500).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Treat these rows as repaired history and cautionary context for the same agentType/project. If a new provider advisory says hold_until_repair, do not bypass it just because an older override was later repaired.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input, options);
}
function providerSwitchExecutionInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.executions) ? input.executions : []),
        ...(Array.isArray(input.receipts) ? input.receipts : []),
        ...(Array.isArray(input.bindings) ? input.bindings : []),
    ];
    return rows.length ? rows : input && typeof input === "object" ? [input] : [];
}
function providerSwitchExecutionReceiptFromInput(entry = {}, raw = {}) {
    if (entry.schema === "ccm-provider-switch-execution-receipt-v1")
        return entry;
    return entry.worker_context_provider_switch_execution_receipt
        || entry.workerContextProviderSwitchExecutionReceipt
        || entry.provider_switch_execution_receipt
        || entry.providerSwitchExecutionReceipt
        || raw.executionReceipt
        || raw.execution_receipt
        || raw.providerSwitchExecutionReceipt
        || raw.provider_switch_execution_receipt
        || raw.receipt
        || {};
}
function providerSwitchDecisionReceiptFromInput(entry = {}, raw = {}, executionReceipt = {}) {
    if (entry.schema === "ccm-provider-switch-decision-receipt-v1")
        return entry;
    return entry.worker_context_provider_switch_decision_receipt
        || entry.workerContextProviderSwitchDecisionReceipt
        || entry.provider_switch_decision_receipt
        || entry.providerSwitchDecisionReceipt
        || raw.providerSwitchDecisionReceipt
        || raw.provider_switch_decision_receipt
        || executionReceipt.provider_switch_decision_receipt
        || executionReceipt.providerSwitchDecisionReceipt
        || {};
}
function providerSwitchExecutionSessionBindingFromInput(entry = {}, raw = {}) {
    return entry.worker_context_provider_switch_session_binding
        || entry.workerContextProviderSwitchSessionBinding
        || entry.provider_switch_session_binding
        || entry.providerSwitchSessionBinding
        || raw.sessionBinding
        || raw.session_binding
        || {};
}
function providerSwitchExecutionRowId(row = {}) {
    return `provider-switch-execution:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.execution_receipt_id,
        row.provider_switch_decision_receipt_id,
        row.task_agent_session_id,
        row.execution_id,
        row.expected_provider,
        row.actually_executed_provider,
        row.status,
    ], 24)}`;
}
function normalizeProviderSwitchExecutionRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return providerSwitchExecutionInputRows(input).map((raw, index) => {
        raw = raw || {};
        const entry = raw?.entry || raw?.binding || raw || {};
        const executionReceipt = providerSwitchExecutionReceiptFromInput(entry, raw);
        const decisionReceipt = providerSwitchDecisionReceiptFromInput(entry, raw, executionReceipt);
        const sessionBinding = providerSwitchExecutionSessionBindingFromInput(entry, raw);
        const ledgerState = entry.provider_switch_ledger_state || entry.providerSwitchLedgerState || raw.provider_switch_ledger_state || {};
        const expectedProvider = String(executionReceipt.expected_provider
            || executionReceipt.expectedProvider
            || decisionReceipt.new_provider?.agent_type
            || decisionReceipt.newProvider?.agentType
            || sessionBinding.expected_provider
            || sessionBinding.expectedProvider
            || "").trim();
        const actualProvider = String(executionReceipt.actually_executed_provider
            || executionReceipt.actuallyExecutedProvider
            || executionReceipt.executed_provider
            || executionReceipt.executedProvider
            || ledgerState.actually_executed_provider
            || ledgerState.actuallyExecutedProvider
            || sessionBinding.session_provider
            || sessionBinding.sessionProvider
            || "").trim();
        const gaps = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(executionReceipt.gaps) ? executionReceipt.gaps : []),
            ...(Array.isArray(raw.gaps) ? raw.gaps : []),
        ], 24);
        const status = String(executionReceipt.status || raw.status || "").trim().toLowerCase() === "passed"
            || executionReceipt.executed_as_approved === true
            ? "passed"
            : "failed";
        const mismatch = gaps.includes("executed_provider_mismatch")
            || (!!expectedProvider && !!actualProvider && expectedProvider.toLowerCase() !== actualProvider.toLowerCase());
        const at = String(executionReceipt.at || raw.at || entry.at || options.updatedAt || (0, typed_memory_shared_1.now)());
        const row = {
            schema: "ccm-provider-switch-execution-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
            groupId: String(executionReceipt.groupId || executionReceipt.group_id || entry.groupId || entry.group_id || raw.groupId || raw.group_id || fallbackGroupId || "").trim(),
            project: String(executionReceipt.project || decisionReceipt.project || entry.project || raw.project || "").trim(),
            agent_type: expectedProvider || "unknown",
            old_provider: String(decisionReceipt.old_provider?.agent_type || decisionReceipt.oldProvider?.agentType || entry.original_agent_type || entry.originalAgentType || "").trim(),
            expected_provider: expectedProvider || "unknown",
            actually_executed_provider: actualProvider || "unknown",
            provider_switch_decision_receipt_id: String(executionReceipt.provider_switch_decision_receipt_id || executionReceipt.providerSwitchDecisionReceiptId || decisionReceipt.receipt_id || raw.provider_switch_decision_receipt_id || "").trim(),
            provider_switch_decision_receipt_checksum: String(executionReceipt.provider_switch_decision_receipt_checksum || executionReceipt.providerSwitchDecisionReceiptChecksum || decisionReceipt.receipt_checksum || raw.provider_switch_decision_receipt_checksum || "").trim(),
            provider_reliability_snapshot_id: String(decisionReceipt.provider_reliability_snapshot?.snapshot_id || decisionReceipt.providerReliabilitySnapshot?.snapshotId || "").trim(),
            execution_receipt_id: String(executionReceipt.execution_receipt_id || executionReceipt.executionReceiptId || raw.execution_receipt_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw.assignment_id || raw.assignmentId || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw.dispatch_key || raw.dispatchKey || "").trim(),
            worker_context_packet_id: String(executionReceipt.worker_context_packet_id || executionReceipt.workerContextPacketId || entry.worker_context_packet_id || entry.workerContextPacketId || raw.worker_context_packet_id || "").trim(),
            task_agent_session_id: String(executionReceipt.task_agent_session_id || executionReceipt.taskAgentSessionId || entry.task_agent_session_id || raw.task_agent_session_id || "").trim(),
            native_session_id: String(executionReceipt.native_session_id || executionReceipt.nativeSessionId || entry.native_session_id || raw.native_session_id || "").trim(),
            execution_id: String(executionReceipt.execution_id || executionReceipt.executionId || entry.execution_id || raw.execution_id || "").trim(),
            receipt_status: String(executionReceipt.receipt_status || executionReceipt.receiptStatus || entry.receipt_status || raw.receipt_status || "").trim().toLowerCase(),
            advised_alternative: executionReceipt.advised_alternative === true || decisionReceipt.advised_alternative === true,
            approved_switch: executionReceipt.approved_switch === true || decisionReceipt.approved_switch === true,
            system_attested: executionReceipt.system_attested === true,
            child_declared: executionReceipt.child_declared === true,
            final_child_receipt_present: executionReceipt.final_child_receipt_present === true,
            status,
            executed_as_approved: executionReceipt.executed_as_approved === true && !mismatch && status === "passed",
            mismatch,
            gaps,
            reason: (0, typed_memory_shared_1.compactText)(raw.reason || executionReceipt.reason || executionReceipt.child_declaration?.reason || "", 500),
            first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || at),
            last_seen_at: at,
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerSwitchExecutionRowId(row) };
    }).filter((row) => row.groupId)
        .filter((row) => row.provider_switch_decision_receipt_id || row.execution_receipt_id || row.execution_id)
        .filter((row) => row.expected_provider && row.actually_executed_provider);
}
function mergeProviderSwitchExecutionRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerSwitchExecutionRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerSwitchExecutionRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    const currentIds = new Set(rows.map((row) => row.row_id));
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - currentIds.size),
    };
}
function providerSwitchExecutionArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const attributionMap = new Map();
    for (const row of rows || []) {
        const key = `${String(row.expected_provider || row.agent_type || "unknown").toLowerCase()}|${String(row.project || "unknown").toLowerCase()}`;
        const current = attributionMap.get(key) || {
            agent_type: row.expected_provider || row.agent_type || "unknown",
            project: row.project || "unknown",
            expected_provider: row.expected_provider || row.agent_type || "unknown",
            approved_count: 0,
            executed_count: 0,
            passed_count: 0,
            failed_count: 0,
            mismatch_count: 0,
            actual_providers: [],
            execution_receipt_ids: [],
            decision_receipt_ids: [],
            task_agent_session_ids: [],
            row_ids: [],
            memory_rel_paths: ["provider-switch-execution-memory.md"],
            gap_codes: [],
            first_executed_at: "",
            last_executed_at: "",
            last_failed_at: "",
            last_passed_at: "",
        };
        current.approved_count += row.approved_switch === true ? 1 : 0;
        current.executed_count += 1;
        current.passed_count += row.status === "passed" ? 1 : 0;
        current.failed_count += row.status === "failed" ? 1 : 0;
        current.mismatch_count += row.mismatch === true ? 1 : 0;
        current.actual_providers = (0, typed_memory_shared_1.uniqueStrings)([...(current.actual_providers || []), row.actually_executed_provider].filter(Boolean), 12);
        current.execution_receipt_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.execution_receipt_ids || []), row.execution_receipt_id].filter(Boolean), 24);
        current.decision_receipt_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.decision_receipt_ids || []), row.provider_switch_decision_receipt_id].filter(Boolean), 24);
        current.task_agent_session_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.task_agent_session_ids || []), row.task_agent_session_id].filter(Boolean), 24);
        current.row_ids = (0, typed_memory_shared_1.uniqueStrings)([...(current.row_ids || []), row.row_id].filter(Boolean), 32);
        current.memory_rel_paths = (0, typed_memory_shared_1.uniqueStrings)([...(current.memory_rel_paths || []), "provider-switch-execution-memory.md"], 8);
        current.gap_codes = (0, typed_memory_shared_1.uniqueStrings)([...(current.gap_codes || []), ...(Array.isArray(row.gaps) ? row.gaps : [])], 32);
        const executedAt = String(row.last_seen_at || row.first_seen_at || "");
        current.first_executed_at = current.first_executed_at
            ? [current.first_executed_at, executedAt].filter(Boolean).sort()[0]
            : executedAt;
        current.last_executed_at = [current.last_executed_at, executedAt].filter(Boolean).sort().slice(-1)[0] || "";
        if (row.status === "failed")
            current.last_failed_at = [current.last_failed_at, executedAt].filter(Boolean).sort().slice(-1)[0] || "";
        if (row.status === "passed")
            current.last_passed_at = [current.last_passed_at, executedAt].filter(Boolean).sort().slice(-1)[0] || "";
        attributionMap.set(key, current);
    }
    const attributions = [...attributionMap.values()]
        .sort((a, b) => Number(b.mismatch_count || 0) - Number(a.mismatch_count || 0)
        || Number(b.failed_count || 0) - Number(a.failed_count || 0)
        || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
    return {
        schema: "ccm-provider-switch-execution-distillation-v1",
        version: typed_memory_shared_1.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
        archived_count: rows.length,
        approved_count: rows.filter((row) => row.approved_switch === true).length,
        executed_count: rows.length,
        passed_count: rows.filter((row) => row.status === "passed").length,
        failed_count: rows.filter((row) => row.status === "failed").length,
        mismatch_count: rows.filter((row) => row.mismatch === true).length,
        attribution_count: attributions.length,
        attributions,
        rows,
        updatedAt,
    };
}
function renderProviderSwitchExecutionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Provider Switch Execution Memory",
        "",
        `Generated by CCM provider switch execution distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        "This feedback memory records approved provider switches after the child Agent session finished, including the system-attested executed provider and the child receipt declaration.",
        "Stable rule: passed switch history does not authorize future switches by itself. Failed or mismatched execution history must be treated as local dispatch caution until the runner/session cause is repaired and reverified.",
        "",
        "## Provider / Project Execution Attributions",
    ];
    for (const row of attributions.slice(0, 24)) {
        lines.push(`- expected=${row.expected_provider || row.agent_type || "unknown"}; project=${row.project || "unknown"}; executed=${row.executed_count || 0}; passed=${row.passed_count || 0}; failed=${row.failed_count || 0}; mismatch=${row.mismatch_count || 0}; actualProviders=${(row.actual_providers || []).slice(0, 6).join(",") || "unknown"}; last=${row.last_executed_at || ""}.`);
        if (row.gap_codes?.length)
            lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Recent Provider Switch Executions");
    for (const row of rows.slice(-40).reverse()) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.expected_provider ? `expected=${row.expected_provider}` : "",
            row.actually_executed_provider ? `actual=${row.actually_executed_provider}` : "",
            row.provider_switch_decision_receipt_id ? `decision=${row.provider_switch_decision_receipt_id}` : "",
            row.execution_receipt_id ? `receipt=${row.execution_receipt_id}` : "",
            row.task_agent_session_id ? `session=${row.task_agent_session_id}` : "",
            row.execution_id ? `execution=${row.execution_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "unknown"}] ${ids || row.row_id}; approved=${row.approved_switch === true}; systemAttested=${row.system_attested === true}; childDeclared=${row.child_declared === true}; mismatch=${row.mismatch === true}.`);
        if (row.gaps?.length)
            lines.push(`  Gaps: ${row.gaps.slice(0, 8).join(", ")}.`);
        if (row.reason)
            lines.push(`  Reason: ${(0, typed_memory_shared_1.compactText)(row.reason, 400).replace(/\n/g, " ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Use these rows as local execution feedback for the same expected provider and project. Passed history is monitoring evidence only; repeated mismatch history should require receipt sampling or a hold until the runner binding is repaired.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderSwitchExecutionToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderSwitchExecutionToTypedMemory(groupId, input, options);
}
function providerDispatchOverrideFollowupReceiptValidationInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.entries) ? input.entries : []),
        ...(Array.isArray(input.validations) ? input.validations : []),
    ];
    return rows.length ? rows : input && typeof input === "object" ? [input] : [];
}
function providerDispatchOverrideFollowupReceiptValidationRowId(row = {}) {
    return `provider-dispatch-override-followup-receipt-validation:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
        row.validation_id,
        row.binding_id,
        row.execution_id,
        row.attempt_status,
    ], 24)}`;
}
function normalizeProviderDispatchOverrideFollowupReceiptValidationRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
    return providerDispatchOverrideFollowupReceiptValidationInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.binding || raw || {};
        const validation = raw?.validation
            || raw?.receipt_validation
            || entry.worker_context_provider_dispatch_override_followup_receipt_contract_validation
            || entry.provider_dispatch_override_followup_receipt_contract_validation
            || {};
        const contract = validation.contract
            || entry.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract
            || entry.workerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContract
            || {};
        const gaps = Array.isArray(validation.gaps) ? validation.gaps : [];
        const receiptEvidenceRows = providerDispatchOverrideFollowupUsageRows(validation.receipt || {});
        const status = validation.contract_satisfied === true
            ? "passed"
            : String(validation.status || "failed").trim().toLowerCase() === "passed"
                ? "passed"
                : "failed";
        const attemptAt = String(validation.at || validation.validated_at || validation.validatedAt || raw?.at || entry.at || options.updatedAt || (0, typed_memory_shared_1.now)());
        const row = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
            groupId: String(fallbackGroupId || validation.groupId || validation.group_id || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
            groupSessionId: String(fallbackGroupSessionId || validation.groupSessionId || validation.group_session_id || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
            project: String(validation.project || entry.project || raw?.project || "").trim(),
            agent_type: String(validation.agent_type || validation.agentType || entry.agent_type || entry.agentType || raw?.agent_type || raw?.agentType || "unknown").trim() || "unknown",
            validation_id: String(validation.validation_id || validation.validationId || raw?.validation_id || raw?.validationId || "").trim(),
            binding_id: String(validation.binding_id || validation.bindingId || entry.binding_id || entry.bindingId || raw?.binding_id || raw?.bindingId || "").trim(),
            assignment_id: String(validation.assignment_id || validation.assignmentId || entry.assignment_id || entry.assignmentId || "").trim(),
            dispatch_key: String(validation.dispatch_key || validation.dispatchKey || entry.dispatch_key || entry.dispatchKey || "").trim(),
            worker_context_packet_id: String(validation.worker_context_packet_id || validation.workerContextPacketId || entry.worker_context_packet_id || entry.workerContextPacketId || "").trim(),
            task_id: String(validation.task_id || validation.taskId || entry.task_id || entry.taskId || "").trim(),
            worker_handoff_id: String(validation.worker_handoff_id || validation.workerHandoffId || entry.worker_handoff_id || entry.workerHandoffId || "").trim(),
            task_agent_session_id: String(validation.task_agent_session_id || validation.taskAgentSessionId || entry.task_agent_session_id || entry.taskAgentSessionId || "").trim(),
            native_session_id: String(validation.native_session_id || validation.nativeSessionId || entry.native_session_id || entry.nativeSessionId || "").trim(),
            execution_id: String(validation.execution_id || validation.executionId || entry.execution_id || entry.executionId || "").trim(),
            receipt_status: String(validation.receipt_status || validation.receiptStatus || "").trim().toLowerCase(),
            attempt_status: status,
            contract_satisfied: status === "passed",
            repair_work_item_id: String(validation.repair_work_item_id || validation.repairWorkItemId || validation.repair_work_item?.work_item_id || "").trim(),
            repair_work_item_status: String(validation.repair_work_item_status || validation.repairWorkItemStatus || validation.repair_work_item?.status || "").trim().toLowerCase(),
            required_rel_paths: (0, typed_memory_shared_1.uniqueStrings)(contract.rel_paths || contract.relPaths || [], 24),
            required_followup_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(contract.followup_work_item_ids || contract.followupWorkItemIds || [], 24),
            required_override_ids: (0, typed_memory_shared_1.uniqueStrings)(contract.override_ids || contract.overrideIds || [], 24),
            gap_codes: (0, typed_memory_shared_1.uniqueStrings)(gaps.map((gap) => gap.code || gap.gap_code || gap.gapCode).filter(Boolean), 24),
            gap_reasons: (0, typed_memory_shared_1.uniqueStrings)(gaps.map((gap) => gap.reason || gap.message).filter(Boolean), 16),
            receipt_evidence_reasons: (0, typed_memory_shared_1.uniqueStrings)(receiptEvidenceRows.map((row) => row.reason || row.summary || row.note).filter(Boolean), 16),
            memory_provenance_usage_count: Number(validation.memory_provenance_usage_count || validation.memoryProvenanceUsageCount || 0),
            provider_override_followup_reverified_row_count: Number(validation.provider_override_followup_reverified_row_count || validation.providerOverrideFollowupReverifiedRowCount || 0),
            current_source_verified_count: Number(validation.current_source_verified_count || validation.currentSourceVerifiedCount || 0),
            reason: (0, typed_memory_shared_1.compactText)(validation.reason || raw?.reason || "", 700),
            attempt_at: attemptAt,
            first_seen_at: attemptAt,
            last_seen_at: attemptAt,
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: providerDispatchOverrideFollowupReceiptValidationRowId(row) };
    }).filter((row) => !!row.validation_id)
        .filter((row) => row.attempt_status === "failed" || row.attempt_status === "passed");
}
function mergeProviderDispatchOverrideFollowupReceiptValidationRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupReceiptValidationRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming || []) {
        const id = String(row.row_id || providerDispatchOverrideFollowupReceiptValidationRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: row.attempt_at || updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(600, Number(options.limit || options.maxRows || options.max_rows || 240)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.attempt_at || a.last_seen_at || "").localeCompare(String(b.attempt_at || b.last_seen_at || "")) || String(a.row_id || "").localeCompare(String(b.row_id || "")))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const attributionRows = new Map();
    for (const row of rows || []) {
        const key = `${String(row.agent_type || "unknown").toLowerCase()}|${String(row.project || "unknown").toLowerCase()}`;
        attributionRows.set(key, [...(attributionRows.get(key) || []), row]);
    }
    const attributions = [...attributionRows.entries()].map(([, sourceRows]) => {
        const ordered = [...sourceRows].sort((a, b) => String(a.attempt_at || "").localeCompare(String(b.attempt_at || "")) || String(a.row_id || "").localeCompare(String(b.row_id || "")));
        const failed = ordered.filter((row) => row.attempt_status === "failed");
        const passed = ordered.filter((row) => row.attempt_status === "passed");
        let consecutiveFailureCount = 0;
        for (let index = ordered.length - 1; index >= 0; index -= 1) {
            if (ordered[index].attempt_status !== "failed")
                break;
            consecutiveFailureCount += 1;
        }
        const latest = ordered[ordered.length - 1] || {};
        const lastFailedAt = failed.map((row) => row.attempt_at || "").filter(Boolean).sort().slice(-1)[0] || "";
        const lastPassedAt = passed.map((row) => row.attempt_at || "").filter(Boolean).sort().slice(-1)[0] || "";
        const repairVerified = failed.length > 0
            && latest.attempt_status === "passed"
            && !!lastPassedAt
            && (!lastFailedAt || lastPassedAt.localeCompare(lastFailedAt) >= 0);
        return {
            agent_type: latest.agent_type || "unknown",
            project: latest.project || "unknown",
            attempt_count: ordered.length,
            failed_count: failed.length,
            passed_count: passed.length,
            consecutive_failure_count: consecutiveFailureCount,
            latest_status: latest.attempt_status || "",
            repair_verified: repairVerified,
            first_attempt_at: ordered[0]?.attempt_at || "",
            last_attempt_at: latest.attempt_at || "",
            last_failed_at: lastFailedAt,
            last_passed_at: lastPassedAt,
            validation_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.map((row) => row.validation_id).filter(Boolean), 32),
            repair_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.map((row) => row.repair_work_item_id).filter(Boolean), 24),
            rel_paths: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.required_rel_paths || []), 32),
            followup_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.required_followup_work_item_ids || []), 32),
            override_ids: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.required_override_ids || []), 32),
            gap_codes: (0, typed_memory_shared_1.uniqueStrings)(ordered.flatMap((row) => row.gap_codes || []), 32),
        };
    }).sort((a, b) => Number(b.consecutive_failure_count || 0) - Number(a.consecutive_failure_count || 0) || Number(b.failed_count || 0) - Number(a.failed_count || 0));
    return {
        schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
        version: typed_memory_shared_1.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
        sourceGroupId: String(options.sourceGroupId || options.source_group_id || options.groupId || options.group_id || "").trim(),
        groupSessionId: String(options.groupSessionId || options.group_session_id || "").trim(),
        exactSession: !!String(options.groupSessionId || options.group_session_id || "").trim(),
        archived_count: rows.length,
        attempt_count: rows.length,
        failed_count: rows.filter((row) => row.attempt_status === "failed").length,
        passed_count: rows.filter((row) => row.attempt_status === "passed").length,
        attribution_count: attributions.length,
        escalated_attribution_count: attributions.filter((row) => Number(row.consecutive_failure_count || 0) >= 2).length,
        repaired_attribution_count: attributions.filter((row) => row.repair_verified === true).length,
        attributions,
        rows,
        updatedAt,
    };
}
function renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
    const lines = [
        "# Provider Dispatch Override Follow-up Receipt Validation History",
        "",
        `Generated by CCM corrected-receipt validation distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped provider validation memory.",
        "This feedback memory preserves every provider override follow-up receipt validation attempt across child Agent sessions.",
        "Stable rule: repeated failed corrected receipts for the same agentType/project must escalate the next provider dispatch from sampling to hold. A later verified receipt clears the active failure streak and returns the provider to monitored sampling, while the failed attempts remain auditable.",
        "",
        "## Executor / Project Validation State",
    ];
    for (const row of attributions.slice(0, 24)) {
        lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; attempts=${row.attempt_count || 0}; failed=${row.failed_count || 0}; passed=${row.passed_count || 0}; consecutiveFailures=${row.consecutive_failure_count || 0}; latest=${row.latest_status || "unknown"}; repairVerified=${row.repair_verified === true}; lastAttemptAt=${row.last_attempt_at || ""}.`);
        if (row.gap_codes?.length)
            lines.push(`  Gap codes: ${row.gap_codes.slice(0, 12).join(", ")}.`);
        if (row.repair_work_item_ids?.length)
            lines.push(`  Validation repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
    }
    lines.push("");
    lines.push("## Validation Attempts");
    for (const row of rows.slice(-80).reverse()) {
        lines.push(`- [${row.attempt_status || "unknown"}] agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; validation=${row.validation_id || "unknown"}; execution=${row.execution_id || "unknown"}; repairWorkItem=${row.repair_work_item_id || "unknown"}; at=${row.attempt_at || ""}.`);
        if (row.gap_codes?.length)
            lines.push(`  Missing evidence: ${row.gap_codes.slice(0, 12).join(", ")}.`);
        if (row.required_rel_paths?.length)
            lines.push(`  Required relPath: ${row.required_rel_paths.slice(0, 8).join(", ")}.`);
        if (row.receipt_evidence_reasons?.length)
            lines.push(`  Receipt evidence: ${row.receipt_evidence_reasons.slice(0, 4).map((item) => (0, typed_memory_shared_1.compactText)(item, 500).replace(/\n/g, " ")).join(" | ")}`);
    }
    lines.push("");
    lines.push("## Dispatch Reminder");
    lines.push("- Use the latest consecutive failure streak for the active gate, but never delete older failures or successful repairs from audit history.");
    return lines.join("\n").trim() + "\n";
}
function distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input, options);
}
function ignoreMemoryReceiptRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.candidates) ? input.candidates : []),
        ...(Array.isArray(input.briefs) ? input.briefs : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.candidates) ? group.candidates : []),
        ...(Array.isArray(group.briefs) ? group.briefs : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function ignoreMemoryReceiptRepairRowId(row = {}) {
    return `ignore-memory-receipt-repair:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.work_item_id,
        row.worker_context_packet_id,
        row.binding_id,
        row.assignment_id,
        row.project,
        row.status,
        row.gap_signature,
    ], 24)}`;
}
function normalizeIgnoreMemoryReceiptRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return ignoreMemoryReceiptRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.candidate || raw?.brief || raw || {};
        const source = String(entry.source || raw?.source || "").trim();
        const gaps = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(entry.gaps) ? entry.gaps : []),
            ...(Array.isArray(raw?.gaps) ? raw.gaps : []),
        ].map((gap) => typeof gap === "string" ? gap : gap?.reason || gap?.type || JSON.stringify(gap)), 16);
        const reason = (0, typed_memory_shared_1.compactText)(entry.reason
            || entry.source_reason
            || entry.description
            || entry.instruction
            || raw?.reason
            || gaps.join("; ")
            || "ignore-memory receipt repair required", 900);
        const row = {
            schema: "ccm-ignore-memory-receipt-repair-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
            candidate_id: String(entry.candidate_id || entry.candidateId || raw?.candidate_id || raw?.candidateId || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source,
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            priority: String(entry.priority || raw?.priority || "").trim(),
            component: String(entry.component || raw?.component || "worker_context_ignore_memory_receipt_contract").trim(),
            memory_policy_reason: String(entry.worker_context_packet_memory_policy_reason || entry.memory_policy_reason || entry.expectedReason || raw?.memory_policy_reason || "user_requested_ignore_memory").trim(),
            gap_signature: gaps.join("|"),
            reason,
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "CCM_AGENT_RECEIPT.memoryIgnored includes user_requested_ignore_memory; memoryUsed empty for platform memory", 700),
            prompt_patch: (0, typed_memory_shared_1.compactText)(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1200),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: ignoreMemoryReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_ignore_memory_receipt_repair" || row.component === "worker_context_ignore_memory_receipt_contract" || /ignore-memory|memoryIgnored|user_requested_ignore_memory/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}`));
}
function mergeIgnoreMemoryReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || ignoreMemoryReceiptRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || ignoreMemoryReceiptRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(240, Number(options.limit || options.maxRows || options.max_rows || 80)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function ignoreMemoryReceiptRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    return {
        schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail"].includes(String(row.status || ""))).length,
        completed_count: rows.filter((row) => ["completed", "done", "ok"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        corrected_prompt_count: rows.filter((row) => /memoryIgnored/i.test(`${row.expected}\n${row.prompt_patch}`)).length,
        rows,
        updatedAt,
    };
}
function renderIgnoreMemoryReceiptRepairBody(rows = [], options = {}) {
    const lines = [
        "# Ignore-Memory Receipt Discipline",
        "",
        `Generated by CCM ignore-memory receipt repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        "This feedback memory records repeated child-Agent receipt failures when the WorkerContextPacket says platform/group/typed/global memory must be ignored.",
        "When a current task says to ignore memory, treat platform memory as empty and require the final CCM_AGENT_RECEIPT.memoryIgnored to mention user_requested_ignore_memory / must_not_use_group_memory. Do not put historical group, typed MEMORY.md, or global memory in memoryUsed.",
        "",
        "## Receipt Discipline Rows",
    ];
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "pending"}] ${ids || row.row_id}; reason=${row.memory_policy_reason || "user_requested_ignore_memory"}.`);
        lines.push(`  Rule: corrected receipts must put user_requested_ignore_memory / must_not_use_group_memory in memoryIgnored and must not claim historical platform memory in memoryUsed.`);
        if (row.reason)
            lines.push(`  Evidence: ${(0, typed_memory_shared_1.compactText)(row.reason, 650).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input, options);
}
function pressureMemoryProvenanceReceiptRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.candidates) ? input.candidates : []),
        ...(Array.isArray(input.briefs) ? input.briefs : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.candidates) ? group.candidates : []),
        ...(Array.isArray(group.briefs) ? group.briefs : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function pressureMemoryProvenanceReceiptRepairRowId(row = {}) {
    return `pressure-memory-provenance-receipt-repair:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.work_item_id,
        row.worker_context_packet_id,
        row.binding_id,
        row.assignment_id,
        row.project,
        row.status,
        row.rel_paths,
        row.repair_work_item_ids,
        row.gap_signature,
    ], 24)}`;
}
function normalizePressureMemoryProvenanceReceiptRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return pressureMemoryProvenanceReceiptRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.candidate || raw?.brief || raw || {};
        const source = String(entry.source || raw?.source || "").trim();
        const recoveryDocs = (0, typed_memory_recall_1.pressureMemoryProvenanceRowsFromRawRecovery)(entry);
        const gapCodes = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.pressure_memory_provenance_gap_codes, entry.pressureMemoryProvenanceGapCodes, recoveryDocs.map((doc) => doc.repair_gap_type).filter(Boolean), Array.isArray(entry.gaps) ? entry.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : [], Array.isArray(raw?.gaps) ? raw.gaps.map((gap) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : []);
        const relPaths = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.pressure_memory_provenance_rel_paths, entry.pressureMemoryProvenanceRelPaths, recoveryDocs.map((doc) => doc.rel_path || doc.relPath).filter(Boolean), entry.repair_target && String(entry.repair_target).endsWith(".md") ? entry.repair_target : "");
        const repairIds = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.pressure_memory_provenance_repair_work_item_ids, entry.pressureMemoryProvenanceRepairWorkItemIds, recoveryDocs.map((doc) => doc.repair_work_item_id || doc.repairWorkItemId).filter(Boolean));
        const provenanceStatuses = (0, typed_memory_recall_1.pressureMemoryProvenanceStringList)(entry.provenance_status, entry.provenanceStatus, recoveryDocs.map((doc) => doc.provenance_status || doc.provenanceStatus).filter(Boolean));
        const reason = (0, typed_memory_shared_1.compactText)(entry.reason
            || entry.source_reason
            || entry.description
            || entry.instruction
            || raw?.reason
            || gapCodes.join("; ")
            || "pressure memory provenance receipt repair required", 1000);
        const row = {
            schema: "ccm-pressure-memory-provenance-receipt-repair-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
            candidate_id: String(entry.candidate_id || entry.candidateId || raw?.candidate_id || raw?.candidateId || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source,
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            priority: String(entry.priority || raw?.priority || "").trim(),
            component: String(entry.component || raw?.component || "worker_context_pressure_memory_provenance_receipt_contract").trim(),
            rel_paths: relPaths,
            repair_work_item_ids: repairIds,
            provenance_statuses: provenanceStatuses,
            gap_codes: gapCodes,
            gap_signature: gapCodes.join("|"),
            reason,
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "CCM_AGENT_RECEIPT.memoryProvenanceUsage covers pressure repair memory and marks currentSourceVerified=true when disputed/stale memory is used", 850),
            prompt_patch: (0, typed_memory_shared_1.compactText)(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1400),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: pressureMemoryProvenanceReceiptRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_pressure_memory_provenance_receipt_repair"
        || row.component === "worker_context_pressure_memory_provenance_receipt_contract"
        || /memoryProvenanceUsage|provenanceStatus|repairWorkItemId|currentSourceVerified|pressure memory provenance/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}`));
}
function mergePressureMemoryProvenanceReceiptRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || pressureMemoryProvenanceReceiptRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || pressureMemoryProvenanceReceiptRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(260, Number(options.limit || options.maxRows || options.max_rows || 100)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function pressureMemoryProvenanceReceiptRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const relPaths = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.rel_paths) ? row.rel_paths : []), 80);
    const repairIds = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : []), 80);
    const provenanceStatuses = (0, typed_memory_shared_1.uniqueStrings)(rows.flatMap((row) => Array.isArray(row.provenance_statuses) ? row.provenance_statuses : []), 20);
    return {
        schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail"].includes(String(row.status || ""))).length,
        completed_count: rows.filter((row) => ["completed", "done", "ok"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        rel_path_count: relPaths.length,
        repair_work_item_count: repairIds.length,
        disputed_count: rows.filter((row) => (row.provenance_statuses || []).includes("disputed_under_repair")).length,
        stale_under_repair_count: rows.filter((row) => (row.provenance_statuses || []).includes("stale_evidence_under_repair")).length,
        corrected_prompt_count: rows.filter((row) => /memoryProvenanceUsage/i.test(`${row.expected}\n${row.prompt_patch}\n${row.reason}`)).length,
        current_source_verified_prompt_count: rows.filter((row) => /currentSourceVerified|current_source_verified/i.test(`${row.expected}\n${row.prompt_patch}\n${row.reason}`)).length,
        rel_paths: relPaths,
        repair_work_item_ids: repairIds,
        provenance_statuses: provenanceStatuses,
        rows,
        updatedAt,
    };
}
function renderPressureMemoryProvenanceReceiptRepairBody(rows = [], options = {}) {
    const lines = [
        "# Pressure Memory Provenance Receipt Discipline",
        "",
        `Generated by CCM pressure memory provenance receipt repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        "This feedback memory records repeated child-Agent receipt failures when WorkerContextPacket surfaced pressure MEMORY.md that was disputed_under_repair or stale_evidence_under_repair.",
        "When a current task sees pressure repair provenance, the final CCM_AGENT_RECEIPT must include memoryProvenanceUsage rows. Each row must include relPath, usageState, provenanceStatus, repairWorkItemId, repairStatus, repairGapType. If usageState is used or verified for disputed/stale-under-repair memory, currentSourceVerified must be true.",
        "",
        "## Receipt Discipline Rows",
    ];
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
            row.brief_id ? `brief=${row.brief_id}` : "",
        ].filter(Boolean).join("; ");
        const relPaths = Array.isArray(row.rel_paths) && row.rel_paths.length ? `relPath=${row.rel_paths.slice(0, 6).join(",")}` : "relPath=unknown";
        const repairIds = Array.isArray(row.repair_work_item_ids) && row.repair_work_item_ids.length ? `repairWorkItemId=${row.repair_work_item_ids.slice(0, 6).join(",")}` : "repairWorkItemId=unknown";
        const provenance = Array.isArray(row.provenance_statuses) && row.provenance_statuses.length ? `provenanceStatus=${row.provenance_statuses.slice(0, 4).join(",")}` : "provenanceStatus=under_repair";
        lines.push(`- [${row.status || "pending"}] ${ids || row.row_id}; ${relPaths}; ${repairIds}; ${provenance}.`);
        lines.push("  Rule: memoryProvenanceUsage is mandatory for pressure repair memory; used/verified disputed_under_repair or stale_evidence_under_repair rows require currentSourceVerified=true.");
        if (row.gap_codes?.length)
            lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
        if (row.reason)
            lines.push(`  Evidence: ${(0, typed_memory_shared_1.compactText)(row.reason, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input, options);
}
function distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input, options);
}
function distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input, options);
}
function summarizeProviderDispatchOverrideFollowupPolicyAttributions(attributions = []) {
    const completedCount = attributions.reduce((sum, row) => sum + Number(row.completed_count || row.completedCount || 0), 0);
    const memoryUsageCount = attributions.reduce((sum, row) => sum + Number(row.memory_provenance_usage_count || row.memoryProvenanceUsageCount || 0), 0);
    const verifiedCount = attributions.reduce((sum, row) => sum + Number(row.current_source_verified_count || row.currentSourceVerifiedCount || 0), 0);
    const lastCompletedAt = attributions
        .map((row) => row.last_completed_at || row.lastCompletedAt || "")
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || "";
    return {
        completedCount,
        memoryUsageCount,
        verifiedCount,
        lastCompletedAt,
        relPaths: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => Array.isArray(row.rel_paths || row.relPaths) ? (row.rel_paths || row.relPaths) : []), 16),
        followupWorkItemIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => Array.isArray(row.followup_work_item_ids || row.followupWorkItemIds) ? (row.followup_work_item_ids || row.followupWorkItemIds) : []), 16),
        overrideIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => Array.isArray(row.override_ids || row.overrideIds) ? (row.override_ids || row.overrideIds) : []), 16),
    };
}
function summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions(attributions = []) {
    const ordered = [...(attributions || [])]
        .sort((a, b) => String(a.last_attempt_at || a.lastAttemptAt || "").localeCompare(String(b.last_attempt_at || b.lastAttemptAt || "")));
    const latest = ordered[ordered.length - 1] || {};
    return {
        attemptCount: attributions.reduce((sum, row) => sum + Number(row.attempt_count || row.attemptCount || 0), 0),
        failedCount: attributions.reduce((sum, row) => sum + Number(row.failed_count || row.failedCount || 0), 0),
        passedCount: attributions.reduce((sum, row) => sum + Number(row.passed_count || row.passedCount || 0), 0),
        consecutiveFailureCount: Number(latest.consecutive_failure_count || latest.consecutiveFailureCount || 0),
        latestStatus: String(latest.latest_status || latest.latestStatus || ""),
        repairVerified: latest.repair_verified === true || latest.repairVerified === true,
        lastAttemptAt: String(latest.last_attempt_at || latest.lastAttemptAt || ""),
        lastFailedAt: String(latest.last_failed_at || latest.lastFailedAt || ""),
        lastPassedAt: String(latest.last_passed_at || latest.lastPassedAt || ""),
        validationIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.validation_ids || row.validationIds || []), 32),
        repairWorkItemIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.repair_work_item_ids || row.repairWorkItemIds || []), 24),
        relPaths: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.rel_paths || row.relPaths || []), 32),
        followupWorkItemIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.followup_work_item_ids || row.followupWorkItemIds || []), 32),
        overrideIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.override_ids || row.overrideIds || []), 32),
        gapCodes: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.gap_codes || row.gapCodes || []), 32),
    };
}
function summarizeProviderSwitchExecutionPolicyAttributions(attributions = []) {
    const ordered = [...(attributions || [])]
        .sort((a, b) => String(a.last_executed_at || a.lastExecutedAt || "").localeCompare(String(b.last_executed_at || b.lastExecutedAt || "")));
    const latest = ordered[ordered.length - 1] || {};
    return {
        executedCount: attributions.reduce((sum, row) => sum + Number(row.executed_count || row.executedCount || 0), 0),
        approvedCount: attributions.reduce((sum, row) => sum + Number(row.approved_count || row.approvedCount || 0), 0),
        passedCount: attributions.reduce((sum, row) => sum + Number(row.passed_count || row.passedCount || 0), 0),
        failedCount: attributions.reduce((sum, row) => sum + Number(row.failed_count || row.failedCount || 0), 0),
        mismatchCount: attributions.reduce((sum, row) => sum + Number(row.mismatch_count || row.mismatchCount || 0), 0),
        expectedProvider: String(latest.expected_provider || latest.expectedProvider || latest.agent_type || latest.agentType || ""),
        actualProviders: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.actual_providers || row.actualProviders || []), 24),
        lastExecutedAt: String(latest.last_executed_at || latest.lastExecutedAt || ""),
        lastFailedAt: attributions.map((row) => row.last_failed_at || row.lastFailedAt || "").filter(Boolean).sort().slice(-1)[0] || "",
        lastPassedAt: attributions.map((row) => row.last_passed_at || row.lastPassedAt || "").filter(Boolean).sort().slice(-1)[0] || "",
        executionReceiptIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.execution_receipt_ids || row.executionReceiptIds || []), 24),
        decisionReceiptIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.decision_receipt_ids || row.decisionReceiptIds || []), 24),
        taskAgentSessionIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.task_agent_session_ids || row.taskAgentSessionIds || []), 24),
        rowIds: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.row_ids || row.rowIds || []), 32),
        memoryRelPaths: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.memory_rel_paths || row.memoryRelPaths || []), 8),
        gapCodes: (0, typed_memory_shared_1.uniqueStrings)(attributions.flatMap((row) => row.gap_codes || row.gapCodes || []), 32),
    };
}
function scoreProviderSwitchExecutionRows(rows = [], options = {}) {
    const passedCredit = Math.max(0, Number(options.providerSwitchExecutionPassedCredit
        || options.provider_switch_execution_passed_credit
        || 1));
    const mismatchPenalty = Math.max(1, Number(options.providerSwitchExecutionMismatchPenalty
        || options.provider_switch_execution_mismatch_penalty
        || 1.5));
    let weightedMismatchScore = 0;
    let weightedFailedScore = 0;
    let weightedPassedScore = 0;
    let newestAttemptAt = "";
    let oldestAttemptAt = "";
    for (const row of rows || []) {
        const at = String(row.last_seen_at || row.last_executed_at || row.lastExecutedAt || row.first_seen_at || row.at || "");
        const decay = providerDispatchReliabilityDecayWeight(at, options);
        const status = String(row.status || "").trim().toLowerCase();
        const gaps = Array.isArray(row.gaps || row.gap_codes || row.gapCodes) ? (row.gaps || row.gap_codes || row.gapCodes) : [];
        const mismatch = row.mismatch === true
            || row.provider_switch_execution_mismatch === true
            || row.providerSwitchExecutionMismatch === true
            || gaps.includes("executed_provider_mismatch");
        if (mismatch)
            weightedMismatchScore += decay.weight;
        if (status === "failed")
            weightedFailedScore += decay.weight;
        if (status === "passed")
            weightedPassedScore += decay.weight;
        if (at) {
            newestAttemptAt = [newestAttemptAt, at].filter(Boolean).sort().slice(-1)[0] || "";
            oldestAttemptAt = oldestAttemptAt ? [oldestAttemptAt, at].sort()[0] : at;
        }
    }
    const weightedRiskScore = weightedFailedScore + weightedMismatchScore * (mismatchPenalty - 1);
    const weightedEvidence = weightedRiskScore + weightedPassedScore;
    const adjustedEvidence = weightedRiskScore + weightedPassedScore * passedCredit;
    const riskScore = adjustedEvidence > 0 ? weightedRiskScore / adjustedEvidence : 0;
    const confidence = weightedEvidence > 0 ? 1 - Math.exp(-weightedEvidence / 3) : 0;
    return {
        attemptCount: rows.length,
        failedCount: rows.filter((row) => String(row.status || "").trim().toLowerCase() === "failed").length,
        passedCount: rows.filter((row) => String(row.status || "").trim().toLowerCase() === "passed").length,
        mismatchCount: rows.filter((row) => row.mismatch === true).length,
        weightedMismatchScore: providerDispatchReliabilityRound(weightedMismatchScore),
        weightedFailedScore: providerDispatchReliabilityRound(weightedFailedScore),
        weightedPassedScore: providerDispatchReliabilityRound(weightedPassedScore),
        weightedRiskScore: providerDispatchReliabilityRound(weightedRiskScore),
        weightedEvidence: providerDispatchReliabilityRound(weightedEvidence),
        riskScore: providerDispatchReliabilityRound(riskScore),
        confidence: providerDispatchReliabilityRound(confidence),
        passedCredit,
        mismatchPenalty,
        halfLifeDays: Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS))),
        newestAttemptAt,
        oldestAttemptAt,
    };
}
function providerDispatchReliabilityNowMs(options = {}) {
    const explicit = Number(options.nowMs || options.now_ms || 0);
    if (Number.isFinite(explicit) && explicit > 0)
        return explicit;
    const parsed = Date.parse(String(options.generatedAt || options.generated_at || options.now || ""));
    return Number.isFinite(parsed) ? parsed : Date.now();
}
function providerDispatchReliabilityRound(value, digits = 4) {
    const number = Number(value || 0);
    const scale = 10 ** digits;
    return Math.round(number * scale) / scale;
}
function providerDispatchReliabilityDecayWeight(at, options = {}) {
    const nowMs = providerDispatchReliabilityNowMs(options);
    const atMs = Date.parse(String(at || ""));
    const ageDays = Number.isFinite(atMs) ? Math.max(0, (nowMs - atMs) / 86_400_000) : 0;
    const halfLifeDays = Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS)));
    return {
        ageDays,
        weight: 2 ** (-ageDays / halfLifeDays),
        halfLifeDays,
    };
}
function scoreProviderDispatchReliabilityRows(rows = [], options = {}) {
    const recoveryCredit = Math.max(0, Number(options.recoveryCredit || options.recovery_credit || 1.25));
    let weightedFailureScore = 0;
    let weightedPassedScore = 0;
    let newestAttemptAt = "";
    let oldestAttemptAt = "";
    for (const row of rows || []) {
        const at = String(row.attempt_at || row.last_seen_at || row.first_seen_at || "");
        const decay = providerDispatchReliabilityDecayWeight(at, options);
        if (row.attempt_status === "failed")
            weightedFailureScore += decay.weight;
        if (row.attempt_status === "passed")
            weightedPassedScore += decay.weight;
        if (at) {
            newestAttemptAt = [newestAttemptAt, at].filter(Boolean).sort().slice(-1)[0] || "";
            oldestAttemptAt = oldestAttemptAt ? [oldestAttemptAt, at].sort()[0] : at;
        }
    }
    const weightedEvidence = weightedFailureScore + weightedPassedScore;
    const adjustedEvidence = weightedFailureScore + weightedPassedScore * recoveryCredit;
    const riskScore = adjustedEvidence > 0 ? weightedFailureScore / adjustedEvidence : 0;
    const confidence = weightedEvidence > 0 ? 1 - Math.exp(-weightedEvidence / 3) : 0;
    return {
        attemptCount: rows.length,
        failedCount: rows.filter((row) => row.attempt_status === "failed").length,
        passedCount: rows.filter((row) => row.attempt_status === "passed").length,
        weightedFailureScore: providerDispatchReliabilityRound(weightedFailureScore),
        weightedPassedScore: providerDispatchReliabilityRound(weightedPassedScore),
        weightedEvidence: providerDispatchReliabilityRound(weightedEvidence),
        riskScore: providerDispatchReliabilityRound(riskScore),
        confidence: providerDispatchReliabilityRound(confidence),
        recoveryCredit,
        halfLifeDays: Math.max(1, Math.min(365, Number(options.halfLifeDays || options.half_life_days || options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS))),
        newestAttemptAt,
        oldestAttemptAt,
    };
}
function listProviderDispatchReliabilityDistillationLedgers(options = {}) {
    const explicitGroupIds = Array.isArray(options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids)
        ? (options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids)
            .map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const excluded = new Set((Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : [])
        .flatMap((item) => [String(item || "").trim().toLowerCase(), (0, typed_memory_shared_1.safeSegment)(item).toLowerCase()])
        .filter(Boolean));
    const maxGroups = Math.max(1, Math.min(200, Number(options.maxGroups || options.max_groups || typed_memory_shared_1.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS)));
    const maxLedgersPerGroup = Math.max(1, Math.min(100, Number(options.maxLedgersPerGroup || options.max_ledgers_per_group || 24)));
    const candidates = (() => {
        try {
            return fs.readdirSync(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map(entry => ({ groupId: entry.name, file: path.join(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, entry.name, typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER) }));
        }
        catch {
            return [];
        }
    })();
    const explicitKeys = new Set(explicitGroupIds.flatMap((item) => [item.toLowerCase(), (0, typed_memory_shared_1.safeSegment)(item).toLowerCase()]));
    const sortedCandidates = candidates
        .filter((item) => {
        if (!explicitKeys.size)
            return true;
        const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(item.groupId, { groupId: item.groupId });
        return explicitKeys.has(String(item.groupId || "").toLowerCase())
            || explicitKeys.has(identity.rootGroupId.toLowerCase())
            || explicitKeys.has((0, typed_memory_shared_1.safeSegment)(identity.rootGroupId).toLowerCase());
    })
        .filter((item) => item.file && fs.existsSync(item.file))
        .map((item) => {
        try {
            const stat = fs.statSync(item.file);
            return { ...item, mtimeMs: Number(stat.mtimeMs || 0) };
        }
        catch {
            return { ...item, mtimeMs: 0 };
        }
    })
        .filter((item) => {
        const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(item.groupId, { groupId: item.groupId });
        return !excluded.has(String(item.groupId || "").toLowerCase())
            && !excluded.has(identity.rootGroupId.toLowerCase())
            && !excluded.has((0, typed_memory_shared_1.safeSegment)(identity.rootGroupId).toLowerCase());
    })
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0));
    const selected = [];
    const selectedRootGroups = new Set();
    const selectedLedgersPerGroup = new Map();
    for (const item of sortedCandidates) {
        const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(item.groupId, { groupId: item.groupId });
        const rootKey = identity.rootGroupId.toLowerCase();
        const isNewRoot = !selectedRootGroups.has(rootKey);
        if (isNewRoot && selectedRootGroups.size >= maxGroups)
            continue;
        if (Number(selectedLedgersPerGroup.get(rootKey) || 0) >= maxLedgersPerGroup)
            continue;
        selectedRootGroups.add(rootKey);
        selectedLedgersPerGroup.set(rootKey, Number(selectedLedgersPerGroup.get(rootKey) || 0) + 1);
        selected.push(item);
    }
    return selected;
}
//# sourceMappingURL=typed-memory-distillation-receipts-part-03.js.map