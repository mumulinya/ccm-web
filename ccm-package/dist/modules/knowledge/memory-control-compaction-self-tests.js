"use strict";
// Category-specific TestAgent self-tests. The compatibility facade remains in self-test.ts.
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
exports.runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest = runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest;
exports.runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest = runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest;
exports.runMemoryCenterWorkerContextPacketCompactionRetrySelfTest = runMemoryCenterWorkerContextPacketCompactionRetrySelfTest;
exports.runMemoryCenterWorkerContextPacketMemoryFirstCompactionRetrySelfTest = runMemoryCenterWorkerContextPacketMemoryFirstCompactionRetrySelfTest;
exports.runMemoryCenterWorkerContextPacketPartialCompactRetrySelfTest = runMemoryCenterWorkerContextPacketPartialCompactRetrySelfTest;
exports.runMemoryCenterWorkerContextPacketMetadataPartialCompactRetrySelfTest = runMemoryCenterWorkerContextPacketMetadataPartialCompactRetrySelfTest;
exports.runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest = runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest;
exports.runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest = runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairWorkItemsSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairWorkItemsSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumptionSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumptionSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptTypedMemorySelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptWorkerContextRecallSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptWorkerContextRecallSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageContractSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageContractSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairTypedMemorySelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkerContextInjectionSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkerContextInjectionSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocsSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocsSelfTest;
exports.runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefRequiredDocsSelfTest = runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefRequiredDocsSelfTest;
exports.runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest = runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest = runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest = runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest;
exports.runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest = runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest = runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest;
exports.runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest = runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest;
exports.runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest = runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest;
exports.runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest = runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketCompactHookLedgerSelfTest = runMemoryCenterWorkerContextPacketCompactHookLedgerSelfTest;
exports.runMemoryCenterWorkerContextPacketMemoryReinjectionProofSelfTest = runMemoryCenterWorkerContextPacketMemoryReinjectionProofSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineBindingSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineBindingSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const memory_control_center_1 = require("./memory-control-center");
function runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest() {
    const sourceGroupId = `memory-center-cross-pressure-repair-source-${process.pid}-${Date.now()}`;
    const targetGroupId = `memory-center-cross-pressure-repair-target-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(targetGroupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(targetGroupId);
    const sourceTypedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(sourceGroupId));
    const targetTypedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(targetGroupId));
    const targetProject = "phase130-pressure-project";
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId: targetGroupId,
            file: bindingFile,
            updatedAt: "2026-07-09T23:55:00.000Z",
            bindingCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "binding-cross-pressure-repair-selftest",
                    groupId: targetGroupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: targetProject,
                    assignment_id: "assignment-cross-pressure-repair-selftest",
                    dispatch_key: "dispatch-cross-pressure-repair-selftest",
                    worker_context_packet_id: "wcp-cross-pressure-repair-selftest",
                    worker_context_packet_context_usage: {
                        schema: "ccm-worker-context-usage-v1",
                        packet_id: "wcp-cross-pressure-repair-selftest",
                        project: targetProject,
                        status: "over_budget",
                        pressure: 118,
                        total_tokens: 1180,
                        max_tokens: 1000,
                        free_tokens: -300,
                        autocompact_buffer_tokens: 120,
                    },
                    should_create_real_task: false,
                    at: "2026-07-09T23:55:00.000Z",
                }],
        });
        const { recordGroupTypedMemoryPressureRecallUsageLedger, } = require("../collaboration/group-memory-index");
        recordGroupTypedMemoryPressureRecallUsageLedger(sourceGroupId, {
            targetProject,
            taskId: "cross-pressure-repair-source-task",
            executionId: "cross-pressure-repair-source-execution",
            agent: targetProject,
            generatedAt: "2026-07-09T23:55:01.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-repair-source-used",
                    pressure_status: "over_budget",
                    usage_state: "used",
                    reason: "selftest: source group used compact strategy pressure memory",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-repair-source-verified",
                    pressure_status: "over_budget",
                    usage_state: "verified",
                    reason: "selftest: source group verified compact strategy pressure memory",
                },
            ],
        });
        recordGroupTypedMemoryPressureRecallUsageLedger(targetGroupId, {
            targetProject,
            taskId: "cross-pressure-repair-local-task",
            executionId: "cross-pressure-repair-local-execution",
            agent: targetProject,
            generatedAt: "2026-07-09T23:55:02.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-repair-local-ignored-1",
                    pressure_status: "over_budget",
                    usage_state: "ignored",
                    reason: "selftest: target group ignored compact strategy pressure memory",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-repair-local-ignored-2",
                    pressure_status: "over_budget",
                    usage_state: "ignored",
                    reason: "selftest: target group ignored compact strategy pressure memory again",
                },
            ],
        });
        const pressureReport = (0, memory_control_center_1.buildWorkerContextPacketCrossGroupPressureRecallUsageReport)({
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            nowMs: Date.parse("2026-07-09T23:55:03.000Z"),
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemReport)({
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            crossGroupPressureRecallUsageReport: pressureReport,
            generatedAt: "2026-07-09T23:55:04.000Z",
        });
        const repairQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_cross_group_pressure_recall_usage_repair_work_items"],
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            nowMs: Date.parse("2026-07-09T23:55:04.000Z"),
            generatedAt: "2026-07-09T23:55:04.000Z",
            refresh: true,
        });
        const repairCheck = (repairQuality.checks || []).find((item) => item.id === "worker_context_packet_cross_group_pressure_recall_usage_repair_work_items") || {};
        const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(targetGroupId);
        const repairItems = (ledger.items || []).filter((item) => item.source === "cross_group_pressure_recall_usage_repair");
        const repairItem = repairItems[0] || {};
        const candidates = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(targetGroupId);
        const candidate = (candidates.candidates || []).find((item) => item.work_item_id === repairItem.id || item.work_item_id === repairItem.work_item_id) || {};
        const claim = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId: targetGroupId,
            itemId: repairItem.id || repairItem.work_item_id,
            action: "claim",
            owner: "group-main-agent",
            reason: "主 Agent 认领跨群聊 pressure memory 冲突修复",
            at: "2026-07-09T23:55:05.000Z",
        });
        const completed = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId: targetGroupId,
            itemId: repairItem.id || repairItem.work_item_id,
            action: "complete",
            owner: "group-main-agent",
            reason: "已确认本群聊 local-first，跨群聊经验只保留为背景提示",
            at: "2026-07-09T23:55:06.000Z",
        });
        const finalLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(targetGroupId);
        const finalItem = (finalLedger.items || []).find((item) => item.id === repairItem.id) || {};
        const checks = {
            pressureReportFindsConflict: pressureReport.overall?.status === "warn"
                && Number(pressureReport.overall?.conflictCount || 0) >= 1,
            repairReportCreatesCoveredWorkItem: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.requiredActionCount || 0) === 1
                && Number(repairReport.overall?.openItemCount || 0) === 1
                && repairCheck.status === "ok",
            repairItemCarriesPressureContext: repairItem.source === "cross_group_pressure_recall_usage_repair"
                && repairItem.component === "cross_group_pressure_recall_usage"
                && repairItem.target_project === targetProject
                && repairItem.cross_group_pressure_recall_usage_gap_type === "recommendation_conflict"
                && repairItem.local_recommendation === "deprioritize_pressure_recall"
                && repairItem.cross_group_recommendation === "promote_pressure_recall",
            repairItemSurfacesAsMainAgentCandidate: candidates.candidateCount >= 1
                && candidate.source === "cross_group_pressure_recall_usage_repair"
                && candidate.shouldCreateRealTask === false
                && /cross-group pressure recall usage|pressure memory/i.test(`${candidate.instruction || ""}\n${candidate.subject || ""}`),
            existingStateMachineHandlesRepairItem: claim.item?.status === "in_progress"
                && completed.item?.status === "completed"
                && finalItem.status === "completed"
                && finalItem.history?.some((entry) => entry.action === "claim")
                && finalItem.history?.some((entry) => entry.action === "complete"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            pressure: pressureReport.overall,
            repair: repairReport.overall,
            repairItem: {
                id: repairItem.id || "",
                status: repairItem.status || "",
                priority: repairItem.priority || "",
                target_project: repairItem.target_project || "",
                local_recommendation: repairItem.local_recommendation || "",
                cross_group_recommendation: repairItem.cross_group_recommendation || "",
            },
            candidate: {
                id: candidate.candidate_id || "",
                source: candidate.source || "",
                recommendedAction: candidate.recommendedAction || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [sourceTypedDir, targetTypedDir]) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest() {
    const groupId = `memory-center-worker-context-pre-dispatch-gate-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    try {
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-pre-dispatch-gate-selftest",
            project: "api",
            task_id: "pre-dispatch-gate-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 1000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 120,
            total_tokens: 1180,
            total_chars: 4720,
            free_tokens: -300,
            pressure: 118,
            status: "over_budget",
            compact_recommended: true,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 90, chars: 360, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 780, chars: 3120, required: true, included: true },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 210, chars: 840, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 100, chars: 400, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 0, chars: 0, source: "budget", included: false },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 120, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 780, chars: 3120 },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 210, chars: 840 },
            ],
            suggested_reductions: [{
                    category_id: "group_memory_rendered",
                    name: "Group memory rendered context",
                    tokens: 780,
                    suggestion: "先用 compact summary 替代完整群聊记忆。",
                }],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:selftest",
            assignment_id: "assignment-pre-dispatch-gate-selftest",
            dispatch_key: "dispatch-pre-dispatch-gate-selftest",
            project: "api",
            worker_context_packet_id: "wcp-pre-dispatch-gate-selftest",
            usage_status: "over_budget",
            pressure_status: "over_budget",
            dispatch_ready: false,
            dispatchReady: false,
            blocked: true,
            compact_recommended: true,
            must_repair_before_dispatch: true,
            reason: "WorkerContextPacket over budget before child dispatch.",
            repair_source: "worker_context_packet_context_usage_repair",
            next_step: "compact_worker_context_packet_before_child_dispatch",
            total_tokens: 1180,
            max_tokens: 1000,
            free_tokens: -300,
            pressure: 118,
            autocompact_buffer_tokens: 120,
            top_categories: usage.top_categories,
            suggested_reductions: usage.suggested_reductions,
            generated_at: "2026-07-09T10:00:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T10:00:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:pre-dispatch-gate-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-pre-dispatch-gate-selftest",
                    dispatch_key: "dispatch-pre-dispatch-gate-selftest",
                    task_fingerprint: "pre-dispatch-gate-selftest",
                    worker_context_packet_id: "wcp-pre-dispatch-gate-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: false,
                    dispatchReady: false,
                    worker_context_packet_render_probe: {
                        packet_id: "wcp-pre-dispatch-gate-selftest",
                        rendered_flags: { has_context_usage_budget: true, has_worker_context_packet: true },
                    },
                    should_create_real_task: false,
                    at: "2026-07-09T10:00:00.000Z",
                }],
        });
        const gateReport = (0, memory_control_center_1.buildWorkerContextPacketPreDispatchGateReport)({ groupIds: [groupId] });
        const gateQuality = (0, memory_control_center_1.evaluateWorkerContextPacketPreDispatchGate)({ groupIds: [groupId] });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketContextUsageRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T10:01:00.000Z",
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pre_dispatch_gate"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_pre_dispatch_gate") || {};
        const checks = {
            gateReportAcceptsBlockedOverBudget: gateReport.overall?.status === "ok"
                && Number(gateReport.overall?.overBudgetCount || 0) === 1
                && Number(gateReport.overall?.blockedOverBudgetCount || 0) === 1
                && Number(gateReport.overall?.metadataGapCount || 0) === 0,
            gateQualityCheckPasses: gateQuality.id === "worker_context_packet_pre_dispatch_gate"
                && gateQuality.status === "ok"
                && Number(gateQuality.checked || 0) === 1
                && Number(gateQuality.passed || 0) === 1
                && qualityCheck.status === "ok",
            overBudgetStillCreatesRepairItem: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.requiredActionCount || 0) === 1
                && Number(repairReport.overall?.currentOpenItemCount || 0) === 1
                && Number(repairReport.overall?.overBudgetCount || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            gateReport: gateReport.overall,
            repairReport: repairReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketCompactionRetrySelfTest() {
    const groupId = `memory-center-worker-context-compaction-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:selftest",
            method: "deterministic_head_tail_critical_lines",
            status: "recovered",
            from_packet_id: "wcp-retry-before-selftest",
            retry_packet_id: "wcp-retry-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 6200,
            from_max_tokens: 4000,
            from_free_tokens: -2500,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 4000,
            retry_free_tokens: 1100,
            original_task_hash: "original-task-hash-selftest",
            compacted_task_hash: "compacted-task-hash-selftest",
            original_task_chars: 24000,
            compacted_task_chars: 2200,
            omitted_chars: 21800,
            critical_line_count: 6,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T11:00:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-retry-after-selftest",
            project: "api",
            task_id: "compaction-retry-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 2600,
            total_chars: 7800,
            free_tokens: 1100,
            pressure: 65,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 1900, chars: 5700, required: true, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 180, chars: 540, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1100, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "task_goal", name: "Task and goal", tokens: 1900, chars: 5700 },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660 },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:retry-selftest",
            assignment_id: "assignment-compaction-retry-selftest",
            dispatch_key: "dispatch-compaction-retry-selftest",
            project: "api",
            worker_context_packet_id: "wcp-retry-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            compact_recommended: false,
            must_repair_before_dispatch: false,
            reason: "WorkerContextPacket recovered after deterministic retry.",
            repair_source: "",
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2600,
            max_tokens: 4000,
            free_tokens: 1100,
            pressure: 65,
            autocompact_buffer_tokens: 300,
            generated_at: "2026-07-09T11:00:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T11:00:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:compaction-retry-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-compaction-retry-selftest",
                    dispatch_key: "dispatch-compaction-retry-selftest",
                    task_fingerprint: "compaction-retry-selftest",
                    worker_context_packet_id: "wcp-retry-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T11:00:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactionRetryReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactionRetry)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compaction_retry"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compaction_retry") || {};
        const checks = {
            reportAcceptsRecoveredRetry: report.overall?.status === "ok"
                && Number(report.overall?.retryBindingCount || 0) === 1
                && Number(report.overall?.recoveredCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversRetry: quality.id === "worker_context_packet_compaction_retry"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok",
            retryShowsTokenRecovery: (report.groups?.[0]?.retries || [])[0]?.from_usage_status === "over_budget"
                && (report.groups?.[0]?.retries || [])[0]?.retry_usage_status === "warn"
                && (report.groups?.[0]?.retries || [])[0]?.dispatch_ready === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketMemoryFirstCompactionRetrySelfTest() {
    const groupId = `memory-center-worker-context-memory-first-compaction-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const memoryCompaction = {
            schema: "ccm-worker-context-memory-first-compaction-v1",
            method: "memory_fields_head_tail_and_recall_limit",
            status: "compacted",
            original_memory_hash: "original-memory-hash-selftest",
            compacted_memory_hash: "compacted-memory-hash-selftest",
            original_memory_chars: 24000,
            compacted_memory_chars: 3200,
            omitted_chars: 20800,
            max_rendered_chars: 900,
            max_recall_items: 3,
            preserves_schema: true,
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:memory-first-selftest",
            method: "memory_first_deterministic_context_compaction",
            status: "recovered",
            from_packet_id: "wcp-memory-first-before-selftest",
            retry_packet_id: "wcp-memory-first-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 6200,
            from_max_tokens: 4000,
            from_free_tokens: -2500,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 4000,
            retry_free_tokens: 1100,
            memory_first: true,
            memory_compaction: memoryCompaction,
            original_task_hash: "same-task-hash-selftest",
            compacted_task_hash: "same-task-hash-selftest",
            original_task_chars: 420,
            compacted_task_chars: 420,
            omitted_chars: 20800,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T11:30:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-memory-first-after-selftest",
            project: "api",
            task_id: "memory-first-compaction-retry-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 2600,
            total_chars: 7800,
            free_tokens: 1100,
            pressure: 65,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 140, chars: 420, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 1100, chars: 3200, required: true, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 180, chars: 540, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1100, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 1100, chars: 3200 },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660 },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:memory-first-retry-selftest",
            assignment_id: "assignment-memory-first-retry-selftest",
            dispatch_key: "dispatch-memory-first-retry-selftest",
            project: "api",
            worker_context_packet_id: "wcp-memory-first-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            compact_recommended: false,
            must_repair_before_dispatch: false,
            reason: "WorkerContextPacket recovered after memory-first deterministic retry.",
            repair_source: "",
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2600,
            max_tokens: 4000,
            free_tokens: 1100,
            pressure: 65,
            autocompact_buffer_tokens: 300,
            generated_at: "2026-07-09T11:30:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T11:30:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:memory-first-compaction-retry-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-memory-first-retry-selftest",
                    dispatch_key: "dispatch-memory-first-retry-selftest",
                    task_fingerprint: "memory-first-compaction-retry-selftest",
                    worker_context_packet_id: "wcp-memory-first-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T11:30:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactionRetryReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactionRetry)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compaction_retry"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compaction_retry") || {};
        const retryRow = (report.groups?.[0]?.retries || [])[0] || {};
        const checks = {
            reportAcceptsMemoryFirstRetry: report.overall?.status === "ok"
                && Number(report.overall?.retryBindingCount || 0) === 1
                && Number(report.overall?.memoryFirstCount || 0) === 1
                && Number(report.overall?.memoryOmittedChars || 0) === 20800
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversMemoryFirstRetry: quality.id === "worker_context_packet_compaction_retry"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok",
            retryShowsMemoryFirstRecovery: retryRow.memory_first === true
                && retryRow.memory_compaction_schema === "ccm-worker-context-memory-first-compaction-v1"
                && Number(retryRow.memory_omitted_chars || 0) === 20800
                && Number(retryRow.original_task_chars || 0) === Number(retryRow.compacted_task_chars || 0)
                && retryRow.dispatch_ready === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            retry: {
                memory_first: retryRow.memory_first === true,
                memory_compaction_schema: retryRow.memory_compaction_schema || "",
                memory_omitted_chars: retryRow.memory_omitted_chars || 0,
                original_task_chars: retryRow.original_task_chars || 0,
                compacted_task_chars: retryRow.compacted_task_chars || 0,
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketPartialCompactRetrySelfTest() {
    const groupId = `memory-center-worker-context-partial-compact-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const partialCompaction = {
            schema: "ccm-worker-context-replay-brief-partial-compaction-v1",
            method: "preserve_replay_brief_ids_receipts_and_provider_proof_fields",
            category: "replay_repair_dispatch_briefs",
            status: "compacted",
            original_brief_count: 1,
            compacted_brief_count: 1,
            original_briefs_hash: "original-replay-briefs-hash-selftest",
            compacted_briefs_hash: "compacted-replay-briefs-hash-selftest",
            original_briefs_chars: 28000,
            compacted_briefs_chars: 980,
            omitted_chars: 27020,
            omitted_by_brief_limit_chars: 0,
            max_string_chars: 180,
            max_id_chars: 140,
            preserved_fields: [
                "brief_id",
                "work_item_id",
                "source",
                "target_project",
                "proof_entry_id",
                "request_patch_checksum",
                "provider_reproof_status",
                "provider_reproof_reason",
                "reproof_candidate_id",
                "timeline_binding_id",
                "original_work_item_id",
                "request_telemetry_session_status",
                "request_telemetry_dispatch_status",
                "runner_request_id",
                "execution_id",
            ],
            truncated_field_count: 1,
            truncated_fields: [{ index: 0, field: "provider_reproof_reason", original_chars: 27000, compacted_chars: 183, original_hash: "provider-reason-hash" }],
            preserves_receipt_reference: true,
            preserves_real_task_suppression: true,
            generated_at: "2026-07-09T13:00:00.000Z",
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:partial-compact-selftest",
            method: "replay_brief_partial_compact",
            status: "recovered",
            from_packet_id: "wcp-partial-before-selftest",
            retry_packet_id: "wcp-partial-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 7600,
            from_max_tokens: 4000,
            from_free_tokens: -3700,
            retry_usage_status: "warn",
            retry_total_tokens: 2400,
            retry_max_tokens: 4000,
            retry_free_tokens: 1300,
            memory_first: false,
            memory_compaction: null,
            partial_compact: true,
            partial_compaction: partialCompaction,
            original_task_hash: "same-task-hash-partial-selftest",
            compacted_task_hash: "same-task-hash-partial-selftest",
            original_task_chars: 420,
            compacted_task_chars: 420,
            omitted_chars: 27020,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T13:00:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-partial-after-selftest",
            project: "api",
            task_id: "partial-compact-retry-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 2400,
            total_chars: 7200,
            free_tokens: 1300,
            pressure: 60,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 140, chars: 420, required: true, included: true },
                { id: "replay_repair_dispatch_briefs", name: "Replay repair dispatch briefs", tokens: 320, chars: 980, required: true, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 520, chars: 1560, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 180, chars: 540, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1300, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 520, chars: 1560 },
                { id: "replay_repair_dispatch_briefs", name: "Replay repair dispatch briefs", tokens: 320, chars: 980 },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:partial-compact-selftest",
            assignment_id: "assignment-partial-compact-selftest",
            dispatch_key: "dispatch-partial-compact-selftest",
            project: "api",
            worker_context_packet_id: "wcp-partial-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            compact_recommended: false,
            must_repair_before_dispatch: false,
            reason: "WorkerContextPacket recovered after replay brief partial compact retry.",
            repair_source: "",
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2400,
            max_tokens: 4000,
            free_tokens: 1300,
            pressure: 60,
            autocompact_buffer_tokens: 300,
            generated_at: "2026-07-09T13:00:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T13:00:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:partial-compact-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-partial-compact-selftest",
                    dispatch_key: "dispatch-partial-compact-selftest",
                    task_fingerprint: "partial-compact-selftest",
                    worker_context_packet_id: "wcp-partial-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_partial_compaction: partialCompaction,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T13:00:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactionRetryReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactionRetry)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compaction_retry"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compaction_retry") || {};
        const retryRow = (report.groups?.[0]?.retries || [])[0] || {};
        const checks = {
            reportAcceptsPartialCompactRetry: report.overall?.status === "ok"
                && Number(report.overall?.retryBindingCount || 0) === 1
                && Number(report.overall?.partialCompactCount || 0) === 1
                && Number(report.overall?.partialOmittedChars || 0) === 27020
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversPartialCompactRetry: quality.id === "worker_context_packet_compaction_retry"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok",
            retryShowsPartialRecoveryWithoutTaskCompaction: retryRow.partial_compact === true
                && retryRow.partial_compaction_schema === "ccm-worker-context-replay-brief-partial-compaction-v1"
                && retryRow.partial_compaction_category === "replay_repair_dispatch_briefs"
                && Number(retryRow.original_task_chars || 0) === Number(retryRow.compacted_task_chars || 0)
                && retryRow.dispatch_ready === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            retry: {
                partial_compact: retryRow.partial_compact === true,
                partial_compaction_schema: retryRow.partial_compaction_schema || "",
                partial_compaction_category: retryRow.partial_compaction_category || "",
                partial_omitted_chars: retryRow.partial_omitted_chars || 0,
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketMetadataPartialCompactRetrySelfTest() {
    const groupId = `memory-center-worker-context-metadata-partial-compact-retry-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const partialCompaction = {
            schema: "ccm-worker-context-metadata-partial-compaction-v1",
            method: "top_category_metadata_field_compaction",
            category: "worker_context_metadata",
            categories: ["constraints_and_documents", "contract_injections", "dependencies"],
            selected_from_top_categories: ["constraints_and_documents", "contract_injections"],
            status: "compacted",
            original_metadata_hash: "original-metadata-hash-selftest",
            compacted_metadata_hash: "compacted-metadata-hash-selftest",
            original_metadata_chars: 36000,
            compacted_metadata_chars: 1800,
            omitted_chars: 34200,
            original_counts: { constraints: 10, document_findings: 14, dependencies: 7, contract_injections: 6 },
            compacted_counts: { constraints: 4, document_findings: 4, dependencies: 4, contract_injections: 4 },
            max_items: 4,
            max_string_chars: 160,
            max_dependency_reason_chars: 160,
            max_contract_summary_chars: 160,
            preserved_fields: [
                "constraints",
                "documentFindings",
                "dependency.project",
                "dependency.reason",
                "dependency.dependency_id",
                "contract.injection_id",
                "contract.source_agent",
                "contract.target_agent",
                "contract.endpoint",
                "contract.required_receipt_reference",
            ],
            preserves_receipt_reference: true,
            preserves_real_task_suppression: true,
            generated_at: "2026-07-09T13:30:00.000Z",
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:metadata-partial-compact-selftest",
            method: "metadata_partial_compact",
            status: "recovered",
            from_packet_id: "wcp-metadata-before-selftest",
            retry_packet_id: "wcp-metadata-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 8600,
            from_max_tokens: 4200,
            from_free_tokens: -4520,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 4200,
            retry_free_tokens: 1480,
            memory_first: false,
            memory_compaction: null,
            partial_compact: true,
            partial_compaction: partialCompaction,
            partial_compactions: [partialCompaction],
            original_task_hash: "same-task-hash-metadata-selftest",
            compacted_task_hash: "same-task-hash-metadata-selftest",
            original_task_chars: 480,
            compacted_task_chars: 480,
            omitted_chars: 34200,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T13:30:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-metadata-after-selftest",
            project: "frontend",
            task_id: "metadata-partial-compact-retry-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4200,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 2600,
            total_chars: 7800,
            free_tokens: 1480,
            pressure: 61.9,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 160, chars: 480, required: true, included: true },
                { id: "constraints_and_documents", name: "Constraints and document findings", tokens: 420, chars: 1260, included: true },
                { id: "contract_injections", name: "Contract injections", tokens: 320, chars: 960, included: true },
                { id: "dependencies", name: "Dependencies", tokens: 220, chars: 660, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 520, chars: 1560, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 180, chars: 540, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1480, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 520, chars: 1560 },
                { id: "constraints_and_documents", name: "Constraints and document findings", tokens: 420, chars: 1260 },
                { id: "contract_injections", name: "Contract injections", tokens: 320, chars: 960 },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:metadata-partial-compact-selftest",
            assignment_id: "assignment-metadata-partial-compact-selftest",
            dispatch_key: "dispatch-metadata-partial-compact-selftest",
            project: "frontend",
            worker_context_packet_id: "wcp-metadata-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            compact_recommended: false,
            must_repair_before_dispatch: false,
            reason: "WorkerContextPacket recovered after metadata partial compact retry.",
            repair_source: "",
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2600,
            max_tokens: 4200,
            free_tokens: 1480,
            pressure: 61.9,
            autocompact_buffer_tokens: 300,
            generated_at: "2026-07-09T13:30:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T13:30:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:metadata-partial-compact-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "frontend",
                    assignment_id: "assignment-metadata-partial-compact-selftest",
                    dispatch_key: "dispatch-metadata-partial-compact-selftest",
                    task_fingerprint: "metadata-partial-compact-selftest",
                    worker_context_packet_id: "wcp-metadata-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_partial_compaction: partialCompaction,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T13:30:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactionRetryReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactionRetry)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compaction_retry"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compaction_retry") || {};
        const retryRow = (report.groups?.[0]?.retries || [])[0] || {};
        const checks = {
            reportAcceptsMetadataPartialCompactRetry: report.overall?.status === "ok"
                && Number(report.overall?.retryBindingCount || 0) === 1
                && Number(report.overall?.partialCompactCount || 0) === 1
                && Number(report.overall?.partialOmittedChars || 0) === 34200
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversMetadataPartialCompactRetry: quality.id === "worker_context_packet_compaction_retry"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok",
            retryShowsMetadataRecoveryWithoutTaskCompaction: retryRow.partial_compact === true
                && retryRow.partial_compaction_schema === "ccm-worker-context-metadata-partial-compaction-v1"
                && retryRow.partial_compaction_category === "worker_context_metadata"
                && Array.isArray(retryRow.partial_compaction_categories)
                && retryRow.partial_compaction_categories.includes("contract_injections")
                && Number(retryRow.original_task_chars || 0) === Number(retryRow.compacted_task_chars || 0)
                && retryRow.dispatch_ready === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            retry: {
                partial_compact: retryRow.partial_compact === true,
                partial_compaction_schema: retryRow.partial_compaction_schema || "",
                partial_compaction_category: retryRow.partial_compaction_category || "",
                partial_compaction_categories: retryRow.partial_compaction_categories || [],
                partial_omitted_chars: retryRow.partial_omitted_chars || 0,
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest() {
    const groupId = `memory-center-worker-context-partial-compact-policy-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const policy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            source: "worker_context_usage.top_categories",
            supported_categories: ["constraints_and_documents", "contract_injections", "dependencies"],
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["contract_injections", "dependencies"],
            selected_count: 1,
            max_categories: 1,
            min_category_tokens: 1,
            candidates: [{ category: "constraints_and_documents", tokens: 5400, chars: 16200, rank: 1 }],
            fallback_used: false,
            reason: "Selected constraints_and_documents from WorkerContextPacket context_usage top categories before task compaction.",
            generated_at: "2026-07-09T14:00:00.000Z",
        };
        const partialCompaction = {
            schema: "ccm-worker-context-metadata-partial-compaction-v1",
            method: "top_category_metadata_field_compaction",
            category: "worker_context_metadata",
            categories: ["constraints_and_documents"],
            partial_compact_policy: policy,
            selected_from_top_categories: ["constraints_and_documents"],
            skipped_categories: ["contract_injections", "dependencies"],
            status: "compacted",
            original_metadata_hash: "original-policy-metadata-hash-selftest",
            compacted_metadata_hash: "compacted-policy-metadata-hash-selftest",
            original_metadata_chars: 22000,
            compacted_metadata_chars: 900,
            omitted_chars: 21100,
            original_counts: { constraints: 12, document_findings: 16, dependencies: 1, contract_injections: 1 },
            compacted_counts: { constraints: 4, document_findings: 4, dependencies: 1, contract_injections: 1 },
            max_items: 4,
            max_string_chars: 150,
            preserved_fields: [
                "constraints",
                "documentFindings",
                "dependency.project",
                "dependency.reason",
                "dependency.dependency_id",
                "contract.injection_id",
                "contract.source_agent",
                "contract.target_agent",
                "contract.endpoint",
                "contract.required_receipt_reference",
            ],
            preserves_receipt_reference: true,
            preserves_real_task_suppression: true,
            generated_at: "2026-07-09T14:00:00.000Z",
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:partial-compact-policy-selftest",
            method: "metadata_partial_compact",
            status: "recovered",
            from_packet_id: "wcp-policy-before-selftest",
            retry_packet_id: "wcp-policy-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 7600,
            from_max_tokens: 3600,
            from_free_tokens: -4120,
            retry_usage_status: "warn",
            retry_total_tokens: 2200,
            retry_max_tokens: 3600,
            retry_free_tokens: 1280,
            memory_first: false,
            partial_compact: true,
            partial_compact_policy: policy,
            partial_compaction: partialCompaction,
            partial_compactions: [partialCompaction],
            original_task_hash: "same-task-policy-selftest",
            compacted_task_hash: "same-task-policy-selftest",
            original_task_chars: 460,
            compacted_task_chars: 460,
            omitted_chars: 21100,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T14:00:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-policy-after-selftest",
            project: "frontend",
            max_tokens: 3600,
            autocompact_buffer_tokens: 120,
            total_tokens: 2200,
            total_chars: 6600,
            free_tokens: 1280,
            pressure: 61.1,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 153, chars: 460, required: true, included: true },
                { id: "constraints_and_documents", name: "Constraints and document findings", tokens: 300, chars: 900, included: true },
                { id: "contract_injections", name: "Contract injections", tokens: 40, chars: 120, included: true },
                { id: "dependencies", name: "Dependencies", tokens: 30, chars: 90, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 520, chars: 1560, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1280, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 120, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 520, chars: 1560 },
                { id: "constraints_and_documents", name: "Constraints and document findings", tokens: 300, chars: 900 },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:partial-compact-policy-selftest",
            assignment_id: "assignment-partial-compact-policy-selftest",
            dispatch_key: "dispatch-partial-compact-policy-selftest",
            project: "frontend",
            worker_context_packet_id: "wcp-policy-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2200,
            max_tokens: 3600,
            free_tokens: 1280,
            pressure: 61.1,
            autocompact_buffer_tokens: 120,
            generated_at: "2026-07-09T14:00:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T14:00:00.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:partial-compact-policy-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "frontend",
                    assignment_id: "assignment-partial-compact-policy-selftest",
                    dispatch_key: "dispatch-partial-compact-policy-selftest",
                    worker_context_packet_id: "wcp-policy-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_partial_compaction: partialCompaction,
                    worker_context_packet_partial_compact_policy: policy,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T14:00:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactionRetryReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactionRetry)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compaction_retry"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compaction_retry") || {};
        const retryRow = (report.groups?.[0]?.retries || [])[0] || {};
        const checks = {
            reportCountsPartialCompactPolicy: report.overall?.status === "ok"
                && Number(report.overall?.partialCompactPolicyCount || 0) === 1
                && Number(report.overall?.partialCompactCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            retryRowExposesPolicy: retryRow.partial_compact_policy?.schema === "ccm-worker-context-partial-compact-policy-v1"
                && retryRow.partial_compact_policy?.valid === true
                && retryRow.partial_compact_policy?.selected_categories?.[0] === "constraints_and_documents"
                && retryRow.partial_compact_policy?.skipped_categories?.includes("contract_injections"),
            qualityCheckCoversPolicy: quality.id === "worker_context_packet_compaction_retry"
                && quality.status === "ok"
                && qualityCheck.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            retry: {
                partial_compact_policy: retryRow.partial_compact_policy || null,
                partial_compaction_categories: retryRow.partial_compaction_categories || [],
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest() {
    const groupId = `memory-center-worker-context-compact-outcome-ledger-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    try {
        const policy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            source: "worker_context_usage.top_categories",
            supported_categories: ["constraints_and_documents", "contract_injections", "dependencies"],
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["contract_injections", "dependencies"],
            selected_count: 1,
            max_categories: 1,
            min_category_tokens: 1,
            candidates: [{ category: "constraints_and_documents", tokens: 5400, chars: 16200, rank: 1 }],
            fallback_used: false,
            generated_at: "2026-07-09T14:30:00.000Z",
        };
        const partialCompaction = {
            schema: "ccm-worker-context-metadata-partial-compaction-v1",
            method: "top_category_metadata_field_compaction",
            category: "worker_context_metadata",
            categories: ["constraints_and_documents"],
            partial_compact_policy: policy,
            selected_from_top_categories: ["constraints_and_documents"],
            skipped_categories: ["contract_injections", "dependencies"],
            status: "compacted",
            original_metadata_hash: "original-outcome-metadata-hash-selftest",
            compacted_metadata_hash: "compacted-outcome-metadata-hash-selftest",
            original_metadata_chars: 22000,
            compacted_metadata_chars: 900,
            omitted_chars: 21100,
            preserved_fields: [
                "constraints",
                "documentFindings",
                "dependency.project",
                "contract.injection_id",
            ],
            preserves_receipt_reference: true,
            preserves_real_task_suppression: true,
        };
        const providerRankingProvenancePreservation = {
            schema: "ccm-provider-ranking-provenance-preservation-v1",
            required: true,
            preserved: true,
            compact_safe_preserved: true,
            retry_id: "worker-context-retry:compact-outcome-ledger-selftest",
            before: {
                schema: "ccm-provider-ranking-provenance-packet-summary-v1",
                present: true,
                compact_safe: true,
                provider_switch_decision_receipt_present: true,
                provider_switch_decision_receipt_id: "provider-switch-decision:compact-outcome-ledger-selftest",
                typed_memory_rel_paths: ["provider-switch-execution-memory.md"],
                typed_memory_row_ids: ["provider-switch-execution:compact-outcome-ledger-selftest"],
            },
            after: {
                schema: "ccm-provider-ranking-provenance-packet-summary-v1",
                present: true,
                compact_safe: true,
                provider_switch_decision_receipt_present: true,
                provider_switch_decision_receipt_id: "provider-switch-decision:compact-outcome-ledger-selftest",
                typed_memory_rel_paths: ["provider-switch-execution-memory.md"],
                typed_memory_row_ids: ["provider-switch-execution:compact-outcome-ledger-selftest"],
            },
            missing_typed_memory_rel_paths: [],
            missing_typed_memory_row_ids: [],
            gaps: [],
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:compact-outcome-ledger-selftest",
            method: "metadata_partial_compact",
            status: "recovered",
            from_packet_id: "wcp-outcome-before-selftest",
            retry_packet_id: "wcp-outcome-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 7600,
            from_max_tokens: 3800,
            from_free_tokens: -3920,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 3800,
            retry_free_tokens: 1080,
            compact_hook_run_id: "wcch-outcome-ledger-selftest",
            memory_first: false,
            partial_compact: true,
            partial_compact_policy: policy,
            partial_compaction: partialCompaction,
            partial_compactions: [partialCompaction],
            original_task_hash: "same-task-outcome-selftest",
            compacted_task_hash: "same-task-outcome-selftest",
            original_task_chars: 460,
            compacted_task_chars: 460,
            omitted_chars: 21100,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            provider_ranking_provenance_preservation: providerRankingProvenancePreservation,
            provider_ranking_provenance_preserved: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T14:30:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            packet_id: "wcp-outcome-after-selftest",
            project: "frontend",
            max_tokens: 3800,
            total_tokens: 2600,
            free_tokens: 1080,
            status: "warn",
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            assignment_id: "assignment-compact-outcome-ledger-selftest",
            dispatch_key: "dispatch-compact-outcome-ledger-selftest",
            project: "frontend",
            worker_context_packet_id: "wcp-outcome-after-selftest",
            dispatch_ready: true,
            dispatchReady: true,
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            total_tokens: 2600,
            max_tokens: 3800,
            free_tokens: 1080,
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T14:30:00.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:compact-outcome-ledger-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "frontend",
                    assignment_id: "assignment-compact-outcome-ledger-selftest",
                    dispatch_key: "dispatch-compact-outcome-ledger-selftest",
                    worker_context_packet_id: "wcp-outcome-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_partial_compaction: partialCompaction,
                    worker_context_packet_partial_compact_policy: policy,
                    worker_context_packet_compact_hook_run_id: "wcch-outcome-ledger-selftest",
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T14:30:00.000Z",
                }],
        });
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T14:30:01.000Z",
            entries: [{
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-outcome-ledger-selftest",
                    group_id: groupId,
                    assignment_id: "assignment-compact-outcome-ledger-selftest",
                    dispatch_key: "dispatch-compact-outcome-ledger-selftest",
                    project: "frontend",
                    hook_run_id: "wcch-outcome-ledger-selftest",
                    retry_id: "worker-context-retry:compact-outcome-ledger-selftest",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_packet_id: "wcp-outcome-before-selftest",
                    retry_packet_id: "wcp-outcome-after-selftest",
                    initial_usage_status: "over_budget",
                    final_usage_status: "warn",
                    from_total_tokens: 7600,
                    retry_total_tokens: 2600,
                    from_free_tokens: -3920,
                    retry_free_tokens: 1080,
                    token_delta: 5000,
                    free_token_delta: 5000,
                    memory_first: false,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["constraints_and_documents"],
                    partial_compact_policy: policy,
                    omitted_chars: 21100,
                    partial_omitted_chars: 21100,
                    original_task_hash: "same-task-outcome-selftest",
                    compacted_task_hash: "same-task-outcome-selftest",
                    provider_ranking_provenance_preservation: providerRankingProvenancePreservation,
                    provider_ranking_provenance_preserved: true,
                    distillation_candidate: true,
                    at: "2026-07-09T14:30:01.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactOutcomeLedgerReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactOutcomeLedger)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compact_outcome_ledger"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compact_outcome_ledger") || {};
        const outcomeRow = (report.groups?.[0]?.outcomes || [])[0] || {};
        const checks = {
            reportAcceptsOutcomeLedger: report.overall?.status === "ok"
                && Number(report.overall?.outcomeCount || 0) === 1
                && Number(report.overall?.partialCompactPolicyOutcomeCount || 0) === 1
                && Number(report.overall?.taskPreservedOutcomeCount || 0) === 1
                && Number(report.overall?.providerRankingProvenanceRequiredCount || 0) === 1
                && Number(report.overall?.providerRankingProvenancePreservedCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversOutcomeLedger: quality.id === "worker_context_packet_compact_outcome_ledger"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok"
                && (quality.evidence || [])[0]?.providerRankingProvenancePreservedCount === 1,
            outcomeRowCarriesStrategySample: outcomeRow.outcome_status === "recovered"
                && outcomeRow.dispatch_ready === true
                && outcomeRow.selected_categories?.[0] === "constraints_and_documents"
                && Number(outcomeRow.token_delta || 0) === 5000
                && outcomeRow.task_hash_unchanged === true
                && outcomeRow.provider_ranking_provenance_required === true
                && outcomeRow.provider_ranking_provenance_preserved === true
                && outcomeRow.provider_ranking_provenance_rel_paths?.includes("provider-switch-execution-memory.md")
                && outcomeRow.provider_ranking_provenance_row_ids?.includes("provider-switch-execution:compact-outcome-ledger-selftest"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            outcome: {
                outcome_status: outcomeRow.outcome_status || "",
                selected_categories: outcomeRow.selected_categories || [],
                token_delta: outcomeRow.token_delta || 0,
                task_hash_unchanged: outcomeRow.task_hash_unchanged === true,
                provider_ranking_provenance_required: outcomeRow.provider_ranking_provenance_required === true,
                provider_ranking_provenance_preserved: outcomeRow.provider_ranking_provenance_preserved === true,
                provider_ranking_provenance_rel_paths: outcomeRow.provider_ranking_provenance_rel_paths || [],
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, outcomeFile, `${outcomeFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairWorkItemsSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    try {
        const preservationLost = {
            schema: "ccm-provider-ranking-provenance-preservation-v1",
            required: true,
            preserved: false,
            compact_safe_preserved: false,
            retry_id: "worker-context-retry:provider-ranking-provenance-lost",
            before: {
                schema: "ccm-provider-ranking-provenance-packet-summary-v1",
                present: true,
                compact_safe: true,
                provider_switch_decision_receipt_present: true,
                provider_switch_decision_receipt_id: "provider-switch-decision:phase162-repair-selftest",
                typed_memory_rel_paths: ["provider-switch-execution-memory.md"],
                typed_memory_row_ids: ["provider-switch-execution:phase162-repair-selftest"],
            },
            after: {
                schema: "ccm-provider-ranking-provenance-packet-summary-v1",
                present: false,
                compact_safe: false,
                provider_switch_decision_receipt_present: false,
                provider_switch_decision_receipt_id: "",
                typed_memory_rel_paths: [],
                typed_memory_row_ids: [],
            },
            missing_typed_memory_rel_paths: ["provider-switch-execution-memory.md"],
            missing_typed_memory_row_ids: ["provider-switch-execution:phase162-repair-selftest"],
            gaps: [
                "provider_ranking_provenance_missing_after_compact",
                "provider_switch_decision_receipt_missing_after_compact",
                "typed_memory_rel_paths_missing_after_compact",
                "typed_memory_row_ids_missing_after_compact",
            ],
        };
        const preservationOk = {
            ...preservationLost,
            preserved: true,
            compact_safe_preserved: true,
            after: {
                ...preservationLost.before,
            },
            missing_typed_memory_rel_paths: [],
            missing_typed_memory_row_ids: [],
            gaps: [],
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:provider-ranking-provenance-lost",
            method: "metadata_partial_compact",
            status: "recovered",
            from_packet_id: "wcp-provider-ranking-before-selftest",
            retry_packet_id: "wcp-provider-ranking-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 7600,
            from_max_tokens: 3800,
            from_free_tokens: -3920,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 3800,
            retry_free_tokens: 1080,
            compact_hook_run_id: "wcch-provider-ranking-provenance-lost",
            memory_first: false,
            partial_compact: true,
            original_task_hash: "same-provider-ranking-task",
            compacted_task_hash: "same-provider-ranking-task",
            preserved_receipt_contract: true,
            provider_ranking_provenance_preservation: preservationLost,
            provider_ranking_provenance_preserved: false,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-10T16:20:00.000Z",
        };
        const bindingEntry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "worker-context-packet-assignment:provider-ranking-provenance-compact-repair",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            assignment_id: "assignment-provider-ranking-provenance-compact-repair",
            dispatch_key: "dispatch-provider-ranking-provenance-compact-repair",
            worker_context_packet_id: "wcp-provider-ranking-after-selftest",
            worker_context_packet_compaction_retry: retry,
            worker_context_packet_compact_hook_run_id: "wcch-provider-ranking-provenance-lost",
            worker_context_pre_dispatch_gate: {
                schema: "ccm-worker-context-pre-dispatch-gate-v1",
                assignment_id: "assignment-provider-ranking-provenance-compact-repair",
                dispatch_key: "dispatch-provider-ranking-provenance-compact-repair",
                project: "api",
                worker_context_packet_id: "wcp-provider-ranking-after-selftest",
                dispatch_ready: true,
                dispatchReady: true,
                context_compaction_retry: retry,
            },
            dispatch_ready: true,
            dispatchReady: true,
            should_create_real_task: true,
            at: "2026-07-10T16:20:00.000Z",
        };
        const outcomeEntry = (preservation) => ({
            schema: "ccm-worker-context-compact-outcome-entry-v1",
            outcome_id: "wcco-provider-ranking-provenance-compact-repair",
            group_id: groupId,
            assignment_id: "assignment-provider-ranking-provenance-compact-repair",
            dispatch_key: "dispatch-provider-ranking-provenance-compact-repair",
            project: "api",
            hook_run_id: "wcch-provider-ranking-provenance-lost",
            retry_id: "worker-context-retry:provider-ranking-provenance-lost",
            method: "metadata_partial_compact",
            status: "recovered",
            dispatch_ready: true,
            from_packet_id: "wcp-provider-ranking-before-selftest",
            retry_packet_id: "wcp-provider-ranking-after-selftest",
            initial_usage_status: "over_budget",
            final_usage_status: "warn",
            from_total_tokens: 7600,
            retry_total_tokens: 2600,
            from_free_tokens: -3920,
            retry_free_tokens: 1080,
            token_delta: 5000,
            free_token_delta: 5000,
            memory_first: false,
            partial_compact: true,
            task_compacted: false,
            task_hash_unchanged: true,
            provider_ranking_provenance_preservation: preservation,
            provider_ranking_provenance_preserved: preservation.preserved === true,
            distillation_candidate: true,
            at: "2026-07-10T16:20:01.000Z",
        });
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T16:20:00.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [bindingEntry],
        });
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-10T16:20:01.000Z",
            entries: [outcomeEntry(preservationLost)],
        });
        const lossReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-10T16:20:02.000Z" });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairWorkItems)({ groupIds: [groupId], generatedAt: "2026-07-10T16:20:03.000Z" });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_work_items"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_work_items") || {};
        const candidateSummary = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId);
        const repairLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const openRepairItem = (repairLedger.items || []).find((item) => item.source === "worker_context_provider_ranking_provenance_compact_repair"
            && (0, memory_control_center_1.replayRepairWorkItemOpen)(item.status)) || {};
        const candidate = (candidateSummary.candidates || []).find((item) => item.source === "worker_context_provider_ranking_provenance_compact_repair") || {};
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-10T16:20:04.000Z",
            entries: [outcomeEntry(preservationOk)],
        });
        const resolvedReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-10T16:20:05.000Z" });
        const resolvedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedRepairItem = (resolvedLedger.items || []).find((item) => item.source === "worker_context_provider_ranking_provenance_compact_repair"
            && (0, memory_control_center_1.replayRepairWorkItemStatus)(item.status) === "completed") || {};
        const checks = {
            lossReportCreatesRepairWorkItem: lossReport.overall?.status === "ok"
                && Number(lossReport.overall?.requiredActionCount || 0) === 1
                && Number(lossReport.overall?.coveredItemCount || 0) === 1
                && Number(lossReport.overall?.currentOpenItemCount || 0) === 1,
            qualityCheckCoversRepairWorkItems: quality.id === "worker_context_provider_ranking_provenance_compact_repair_work_items"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
            repairItemCarriesProviderProvenanceContract: openRepairItem.source === "worker_context_provider_ranking_provenance_compact_repair"
                && openRepairItem.priority === "critical"
                && openRepairItem.provider_switch_decision_receipt_id === "provider-switch-decision:phase162-repair-selftest"
                && openRepairItem.provider_ranking_provenance_rel_paths?.includes("provider-switch-execution-memory.md")
                && openRepairItem.provider_ranking_provenance_row_ids?.includes("provider-switch-execution:phase162-repair-selftest")
                && /preserved=true/.test(openRepairItem.expected || ""),
            repairCandidateSurfacesForMainAgent: candidate.source === "worker_context_provider_ranking_provenance_compact_repair"
                && candidate.provider_switch_decision_receipt_id === "provider-switch-decision:phase162-repair-selftest"
                && candidate.provider_ranking_provenance_rel_paths?.includes("provider-switch-execution-memory.md")
                && candidate.prompt_patch?.includes("ranking evidence only"),
            resolvedOutcomeClosesOpenRepairItem: resolvedReport.overall?.status === "empty"
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(completedRepairItem.status) === "completed"
                && completedRepairItem.resolutionReason === "provider_ranking_provenance_compact_preserved",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            lossReport: lossReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            repairItem: {
                id: openRepairItem.id || openRepairItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(openRepairItem.status),
                priority: openRepairItem.priority || "",
                provider_switch_decision_receipt_id: openRepairItem.provider_switch_decision_receipt_id || "",
                rel_paths: openRepairItem.provider_ranking_provenance_rel_paths || [],
            },
            candidate: {
                id: candidate.candidate_id || "",
                source: candidate.source || "",
                receipt: candidate.provider_switch_decision_receipt_id || "",
                rel_paths: candidate.provider_ranking_provenance_rel_paths || [],
            },
            resolved: {
                status: resolvedReport.overall?.status || "",
                completedStatus: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedRepairItem.status),
                resolutionReason: completedRepairItem.resolutionReason || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, outcomeFile, `${outcomeFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-brief-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const planFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    try {
        const receiptId = "provider-switch-decision:phase163-brief-selftest";
        const receiptChecksum = "provider-switch-receipt-checksum-phase163";
        const preservationLost = {
            schema: "ccm-provider-ranking-provenance-preservation-v1",
            required: true,
            preserved: false,
            compact_safe_preserved: false,
            retry_id: "worker-context-retry:provider-ranking-provenance-brief",
            before: {
                schema: "ccm-provider-ranking-provenance-packet-summary-v1",
                present: true,
                compact_safe: true,
                provider_switch_decision_receipt_present: true,
                provider_switch_decision_receipt_id: receiptId,
                provider_switch_decision_receipt_checksum: receiptChecksum,
                typed_memory_rel_paths: ["provider-switch-execution-memory.md"],
                typed_memory_row_ids: ["provider-switch-execution:phase163-brief-selftest"],
            },
            after: {
                schema: "ccm-provider-ranking-provenance-packet-summary-v1",
                present: false,
                compact_safe: false,
                provider_switch_decision_receipt_present: false,
                provider_switch_decision_receipt_id: "",
                provider_switch_decision_receipt_checksum: "",
                typed_memory_rel_paths: [],
                typed_memory_row_ids: [],
            },
            missing_typed_memory_rel_paths: ["provider-switch-execution-memory.md"],
            missing_typed_memory_row_ids: ["provider-switch-execution:phase163-brief-selftest"],
            gaps: [
                "provider_ranking_provenance_missing_after_compact",
                "provider_switch_decision_receipt_missing_after_compact",
                "typed_memory_rel_paths_missing_after_compact",
                "typed_memory_row_ids_missing_after_compact",
            ],
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:provider-ranking-provenance-brief",
            method: "metadata_partial_compact",
            status: "recovered",
            from_packet_id: "wcp-provider-ranking-brief-before",
            retry_packet_id: "wcp-provider-ranking-brief-after",
            from_usage_status: "over_budget",
            from_total_tokens: 7600,
            from_max_tokens: 3800,
            from_free_tokens: -3920,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 3800,
            retry_free_tokens: 1080,
            compact_hook_run_id: "wcch-provider-ranking-provenance-brief",
            partial_compact: true,
            original_task_hash: "same-provider-ranking-brief-task",
            compacted_task_hash: "same-provider-ranking-brief-task",
            provider_ranking_provenance_preservation: preservationLost,
            provider_ranking_provenance_preserved: false,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-10T16:40:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T16:40:00.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:provider-ranking-provenance-compact-brief",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-provider-ranking-provenance-compact-brief",
                    dispatch_key: "dispatch-provider-ranking-provenance-compact-brief",
                    worker_context_packet_id: "wcp-provider-ranking-brief-after",
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_compact_hook_run_id: "wcch-provider-ranking-provenance-brief",
                    worker_context_pre_dispatch_gate: {
                        schema: "ccm-worker-context-pre-dispatch-gate-v1",
                        assignment_id: "assignment-provider-ranking-provenance-compact-brief",
                        dispatch_key: "dispatch-provider-ranking-provenance-compact-brief",
                        project: "api",
                        worker_context_packet_id: "wcp-provider-ranking-brief-after",
                        dispatch_ready: true,
                        dispatchReady: true,
                        context_compaction_retry: retry,
                    },
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-10T16:40:00.000Z",
                }],
        });
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-10T16:40:01.000Z",
            entries: [{
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-provider-ranking-provenance-compact-brief",
                    group_id: groupId,
                    assignment_id: "assignment-provider-ranking-provenance-compact-brief",
                    dispatch_key: "dispatch-provider-ranking-provenance-compact-brief",
                    project: "api",
                    hook_run_id: "wcch-provider-ranking-provenance-brief",
                    retry_id: "worker-context-retry:provider-ranking-provenance-brief",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_packet_id: "wcp-provider-ranking-brief-before",
                    retry_packet_id: "wcp-provider-ranking-brief-after",
                    initial_usage_status: "over_budget",
                    final_usage_status: "warn",
                    from_total_tokens: 7600,
                    retry_total_tokens: 2600,
                    from_free_tokens: -3920,
                    retry_free_tokens: 1080,
                    token_delta: 5000,
                    free_token_delta: 5000,
                    partial_compact: true,
                    task_hash_unchanged: true,
                    provider_ranking_provenance_preservation: preservationLost,
                    provider_ranking_provenance_preserved: false,
                    at: "2026-07-10T16:40:01.000Z",
                }],
        });
        const workItemReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T16:40:02.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefReport)({
            groupIds: [groupId],
            workItemReport,
            generatedAt: "2026-07-10T16:40:03.000Z",
        });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefs)({
            groupIds: [groupId],
            workItemReport,
            generatedAt: "2026-07-10T16:40:04.000Z",
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_dispatch_briefs"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_dispatch_briefs") || {};
        const ledger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const readyBrief = (ledger.briefs || []).find((brief) => brief.source === "worker_context_provider_ranking_provenance_compact_repair"
            && String(brief.status || "") === "ready") || {};
        const workerTask = String(readyBrief.worker_task || "");
        const checks = {
            workItemReportCreatesProviderRepairItem: workItemReport.overall?.status === "ok"
                && Number(workItemReport.overall?.requiredActionCount || 0) === 1
                && Number(workItemReport.overall?.coveredItemCount || 0) === 1,
            briefReportCoversProviderRepairCandidate: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) === 1
                && Number(briefReport.overall?.coveredBriefCount || 0) === 1
                && Number(briefReport.overall?.metadataGapCount || 0) === 0
                && Number(briefReport.overall?.receiptBoundBriefCount || 0) === 1
                && Number(briefReport.overall?.typedMemoryBriefCount || 0) === 1
                && Number(briefReport.overall?.preservationContractBriefCount || 0) === 1,
            qualityCheckCoversProviderRepairBrief: quality.id === "worker_context_provider_ranking_provenance_compact_repair_dispatch_briefs"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
            readyBriefMirrorsReceiptAndTypedMemory: readyBrief.provider_switch_decision_receipt_id === receiptId
                && readyBrief.provider_switch_decision_receipt_checksum === receiptChecksum
                && readyBrief.provider_ranking_provenance_rel_paths?.includes("provider-switch-execution-memory.md")
                && readyBrief.provider_ranking_provenance_row_ids?.includes("provider-switch-execution:phase163-brief-selftest")
                && readyBrief.compact_retry_id === "worker-context-retry:provider-ranking-provenance-brief"
                && readyBrief.compact_outcome_id === "wcco-provider-ranking-provenance-compact-brief",
            workerTaskCarriesRerenderReceiptContract: workerTask.includes(receiptId)
                && workerTask.includes(receiptChecksum)
                && workerTask.includes("provider-switch-execution-memory.md")
                && workerTask.includes("provider-switch-execution:phase163-brief-selftest")
                && /provider_ranking_provenance_preservation\.preserved=true/i.test(workerTask)
                && /replayRepairDispatchBriefUsage/i.test(workerTask)
                && /providerRankingProvenancePreserved=true/i.test(workerTask)
                && /ranking evidence only|不能作为授权/i.test(workerTask),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            workItemReport: workItemReport.overall,
            briefReport: briefReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            brief: {
                brief_id: readyBrief.brief_id || "",
                source: readyBrief.source || "",
                receipt_id: readyBrief.provider_switch_decision_receipt_id || "",
                receipt_checksum: readyBrief.provider_switch_decision_receipt_checksum || "",
                rel_paths: readyBrief.provider_ranking_provenance_rel_paths || [],
                row_ids: readyBrief.provider_ranking_provenance_row_ids || [],
                metadataGaps: briefReport.groups?.[0]?.metadataGaps || [],
                worker_task: (0, memory_control_center_1.compactMemoryCenterText)(workerTask, 1000),
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, outcomeFile, `${outcomeFile}.bak`, workItemsFile, `${workItemsFile}.bak`, planFile, `${planFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumptionSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchTimelineBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const workItemId = "provider-ranking-provenance-compact-repair:phase164-receipt";
        const briefId = "replay-repair-dispatch-brief:phase164-receipt";
        const receiptId = "provider-switch-decision:phase164-receipt-selftest";
        const receiptChecksum = "provider-switch-receipt-checksum-phase164";
        const relPath = "provider-switch-execution-memory.md";
        const rowId = "provider-switch-execution:phase164-receipt-selftest";
        const brief = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-v1",
            brief_id: briefId,
            groupId,
            status: "ready",
            source: "worker_context_provider_ranking_provenance_compact_repair",
            work_item_id: workItemId,
            target_project: "api",
            dispatch_target: "api",
            worker_context_packet_id: "wcp-provider-ranking-receipt-after",
            worker_context_packet_binding_id: "worker-context-packet-assignment:phase164-receipt",
            binding_id: "worker-context-packet-assignment:phase164-receipt",
            assignment_id: "assignment-provider-ranking-provenance-receipt",
            dispatch_key: "dispatch-provider-ranking-provenance-receipt",
            provider_switch_decision_receipt_id: receiptId,
            provider_switch_decision_receipt_checksum: receiptChecksum,
            provider_ranking_provenance_rel_paths: [relPath],
            provider_ranking_provenance_row_ids: [rowId],
            compact_retry_id: "worker-context-retry:phase164-receipt",
            compact_outcome_id: "wcco-provider-ranking-provenance-phase164-receipt",
            compact_hook_run_id: "wcch-provider-ranking-provenance-phase164-receipt",
        };
        (0, memory_control_center_1.writeJsonAtomic)(workItemsFile, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId,
            file: workItemsFile,
            updatedAt: "2026-07-10T17:10:00.000Z",
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)([{ status: "pending" }]),
            items: [{
                    id: workItemId,
                    work_item_id: workItemId,
                    source: "worker_context_provider_ranking_provenance_compact_repair",
                    status: "pending",
                    priority: "critical",
                    target_project: "api",
                    dispatch_target: "api",
                    worker_context_packet_id: "wcp-provider-ranking-receipt-after",
                    worker_context_packet_binding_id: "worker-context-packet-assignment:phase164-receipt",
                    binding_id: "worker-context-packet-assignment:phase164-receipt",
                    assignment_id: "assignment-provider-ranking-provenance-receipt",
                    dispatch_key: "dispatch-provider-ranking-provenance-receipt",
                    provider_switch_decision_receipt_id: receiptId,
                    provider_switch_decision_receipt_checksum: receiptChecksum,
                    provider_ranking_provenance_rel_paths: [relPath],
                    provider_ranking_provenance_row_ids: [rowId],
                    provider_ranking_provenance_gap_codes: [
                        "provider_ranking_provenance_missing_after_compact",
                        "provider_switch_decision_receipt_missing_after_compact",
                    ],
                    evidence: [`provider_switch_decision_receipt_id=${receiptId}`, `provider_switch_decision_receipt_checksum=${receiptChecksum}`],
                    needs: ["等待子 Agent 回执证明 provider ranking provenance compact repair 完成"],
                    blockers: [],
                    createdAt: "2026-07-10T17:10:00.000Z",
                    updatedAt: "2026-07-10T17:10:00.000Z",
                }],
        });
        const common = {
            brief,
            task_id: "task-provider-ranking-provenance-receipt",
            project: "api",
            assignment_id: "assignment-provider-ranking-provenance-receipt",
            dispatch_key: "dispatch-provider-ranking-provenance-receipt",
            worker_context_packet_id: "wcp-provider-ranking-receipt-after",
            worker_handoff_id: "worker-handoff-provider-ranking-provenance-receipt",
            memory_context_snapshot_id: "task-agent-memory-context-snapshot:phase164-receipt",
            memory_context_snapshot_checksum: "memory-context-snapshot-checksum-phase164-receipt",
            task_agent_session_id: "task-agent-session-provider-ranking-provenance-receipt",
            native_session_id: "native-session-provider-ranking-provenance-receipt",
            execution_id: "execution-provider-ranking-provenance-receipt",
        };
        for (const eventType of ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot"]) {
            recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                ...common,
                timeline_event_type: eventType,
                timeline_event_id: `${eventType}:phase164-receipt`,
            }, { at: "2026-07-10T17:10:01.000Z" });
        }
        const incompleteBinding = recordReplayRepairDispatchBriefTimelineBinding(groupId, {
            ...common,
            timeline_event_type: "child_agent_receipt",
            timeline_event_id: "child-agent-receipt:phase164-incomplete",
            receipt_status: "completed",
            receipt: {
                status: "completed",
                replayRepairDispatchBriefUsage: [{
                        brief_id: briefId,
                        work_item_id: workItemId,
                        usageState: "verified",
                        repairStatus: "completed",
                        repairGapType: "provider_ranking_provenance_compact",
                        providerSwitchDecisionReceiptId: receiptId,
                        providerSwitchDecisionReceiptChecksum: receiptChecksum,
                        typedMemoryRelPaths: [relPath],
                        typedMemoryRowIds: [rowId],
                        providerRankingProvenancePreserved: false,
                        reason: "provider ranking provenance compact repair receipt is intentionally incomplete",
                    }],
            },
        }, { at: "2026-07-10T17:10:02.000Z" });
        const incompleteLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const itemAfterIncomplete = (incompleteLedger.items || []).find((item) => item.work_item_id === workItemId) || {};
        const incompleteReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumptionReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T17:10:03.000Z",
        });
        const completeBinding = recordReplayRepairDispatchBriefTimelineBinding(groupId, {
            ...common,
            timeline_event_type: "child_agent_receipt",
            timeline_event_id: "child-agent-receipt:phase164-complete",
            receipt_status: "completed",
            receipt: {
                status: "completed",
                replayRepairDispatchBriefUsage: [{
                        brief_id: briefId,
                        work_item_id: workItemId,
                        usageState: "verified",
                        repairStatus: "completed",
                        repairGapType: "provider_ranking_provenance_compact",
                        providerSwitchDecisionReceiptId: receiptId,
                        providerSwitchDecisionReceiptChecksum: receiptChecksum,
                        typedMemoryRelPaths: [relPath],
                        typedMemoryRowIds: [rowId],
                        providerRankingProvenancePreserved: true,
                        provider_ranking_provenance_preservation: {
                            required: true,
                            preserved: true,
                        },
                        reason: "provider ranking provenance compact repair receipt verified typed memory and provider switch decision receipt",
                    }],
            },
        }, { at: "2026-07-10T17:10:04.000Z" });
        const completeLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedItem = (completeLedger.items || []).find((item) => item.work_item_id === workItemId) || {};
        const timelineLedger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const binding = (timelineLedger.entries || []).find((entry) => entry.brief_id === briefId) || {};
        const report = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumptionReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T17:10:05.000Z",
        });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumption)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T17:10:06.000Z",
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_consumption"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_consumption") || {};
        const checks = {
            incompleteReceiptDoesNotCloseRepairItem: (0, memory_control_center_1.replayRepairWorkItemOpen)(itemAfterIncomplete.status)
                && !incompleteBinding?.repair_work_item_completion
                && incompleteReport.overall?.status === "fail",
            completeReceiptClosesOnlyAfterVerifiedProviderProof: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedItem.status) === "completed"
                && completedItem.resolutionReason === "provider_ranking_provenance_compact_repair_receipt_verified"
                && completeBinding?.repair_work_item_completion?.closed === 1,
            timelineBindingRecordsProviderProof: binding.provider_ranking_provenance_receipt_consumption_verified === true
                && binding.provider_switch_decision_receipt_id === receiptId
                && binding.provider_switch_decision_receipt_checksum === receiptChecksum
                && binding.provider_ranking_provenance_rel_paths?.includes(relPath)
                && binding.provider_ranking_provenance_row_ids?.includes(rowId)
                && binding.provider_ranking_provenance_preserved === true
                && binding.provider_ranking_provenance_repair_status === "completed"
                && binding.provider_ranking_provenance_repair_gap_type === "provider_ranking_provenance_compact",
            receiptConsumptionReportPasses: report.overall?.status === "ok"
                && Number(report.overall?.receiptBindingCount || 0) === 1
                && Number(report.overall?.validConsumptionCount || 0) === 1
                && Number(report.overall?.completedRepairItemCount || 0) === 1,
            qualityCheckRegisteredAndPasses: quality.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_consumption"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            incompleteReport: incompleteReport.overall,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            binding: {
                timeline_binding_id: binding.timeline_binding_id || "",
                receipt_id: binding.provider_switch_decision_receipt_id || "",
                receipt_checksum: binding.provider_switch_decision_receipt_checksum || "",
                rel_paths: binding.provider_ranking_provenance_rel_paths || [],
                row_ids: binding.provider_ranking_provenance_row_ids || [],
                preserved: binding.provider_ranking_provenance_preserved === true,
                repair_status: binding.provider_ranking_provenance_repair_status || "",
                repair_gap_type: binding.provider_ranking_provenance_repair_gap_type || "",
            },
            completedItem: {
                id: completedItem.work_item_id || completedItem.id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedItem.status),
                resolutionReason: completedItem.resolutionReason || "",
                completion_source: completedItem.completion_source || "",
            },
        };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`, timelineBindingFile, `${timelineBindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptTypedMemorySelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, buildGroupTypedMemoryRecall, } = require("../collaboration/group-memory-index");
        const entry = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-binding-v1",
            timeline_binding_id: "replay-repair-brief-timeline:phase165-typed-memory",
            groupId,
            task_id: "task-provider-ranking-repair-typed-memory",
            project: "api",
            brief_id: "replay-repair-dispatch-brief:phase165-typed-memory",
            work_item_id: "provider-ranking-provenance-compact-repair:phase165-typed-memory",
            source: "worker_context_provider_ranking_provenance_compact_repair",
            assignment_id: "assignment-provider-ranking-repair-typed-memory",
            dispatch_key: "dispatch-provider-ranking-repair-typed-memory",
            worker_context_packet_id: "wcp-provider-ranking-repair-typed-memory",
            worker_handoff_id: "worker-handoff-provider-ranking-repair-typed-memory",
            memory_context_snapshot_id: "task-agent-memory-context-snapshot:phase165-typed-memory",
            memory_context_snapshot_checksum: "snapshot-checksum-phase165-typed-memory",
            task_agent_session_id: "task-agent-session-provider-ranking-repair-typed-memory",
            native_session_id: "native-session-provider-ranking-repair-typed-memory",
            execution_id: "execution-provider-ranking-repair-typed-memory",
            receipt_status: "completed",
            replay_repair_consumption_status: "verified",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_RANKING_REPAIR_TYPED_MEMORY_SENTINEL verified compact repair preserved provider-switch-execution:phase165-memory-center.",
            provider_switch_decision_receipt_id: "provider-switch-decision:phase165-memory-center",
            provider_switch_decision_receipt_checksum: "provider-switch-receipt-checksum-phase165-memory-center",
            provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
            provider_ranking_provenance_row_ids: ["provider-switch-execution:phase165-memory-center"],
            provider_ranking_provenance_preserved: true,
            provider_ranking_provenance_required: true,
            provider_ranking_provenance_repair_status: "completed",
            provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
            provider_ranking_provenance_receipt_consumption_verified: true,
            should_create_real_task: false,
            event_types: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS,
            event_refs: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS.map((type) => ({ type, id: `${type}:phase165-typed-memory`, at: "2026-07-10T17:50:00.000Z" })),
            at: "2026-07-10T17:50:00.000Z",
            updated_at: "2026-07-10T17:50:00.000Z",
            first_seen_at: "2026-07-10T17:50:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(timelineBindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-ledger-v1",
            version: 1,
            groupId,
            file: timelineBindingFile,
            updatedAt: "2026-07-10T17:50:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            entries: [entry],
        });
        const report = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptTypedMemoryReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T17:50:01.000Z",
        });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptTypedMemory)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T17:50:02.000Z",
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_typed_memory") || {};
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const recall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_RANKING_REPAIR_TYPED_MEMORY_SENTINEL provider-switch-execution:phase165-memory-center", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = JSON.stringify(recall.recalled || []);
        const archive = typedLedger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
        const checks = {
            reportDistillsVerifiedReceipts: report.overall?.status === "ok"
                && Number(report.overall?.verifiedReceiptCount || 0) === 1
                && Number(report.overall?.archivedReceiptCount || 0) === 1
                && Number(report.overall?.typedDocCount || 0) === 1
                && Number(report.overall?.authorizationBoundaryCoveredCount || 0) === 1,
            qualityCheckRegisteredAndPasses: quality.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_typed_memory"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
            ledgerArchiveCreated: archive.archived_count === 1
                && archive.rows?.[0]?.provider_switch_decision_receipt_id === "provider-switch-decision:phase165-memory-center",
            typedDocAndRecallWork: docs.some((doc) => doc.relPath === "provider-ranking-provenance-compact-repair-receipt-memory.md" && doc.type === "reference")
                && recallText.includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && recallText.includes("PROVIDER_RANKING_REPAIR_TYPED_MEMORY_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            archive: {
                archived_count: archive.archived_count || 0,
                rel_path_count: archive.rel_path_count || 0,
                row_id_count: archive.row_id_count || 0,
            },
            recalled: recall.recalled.map((item) => item.relPath),
        };
    }
    finally {
        for (const file of [timelineBindingFile, `${timelineBindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptWorkerContextRecallSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-worker-context-recall-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory, readGroupTypedMemoryDistillationLedger, } = require("../collaboration/group-memory-index");
        const row = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-binding-v1",
            timeline_binding_id: "replay-repair-brief-timeline:phase166-worker-context-recall",
            groupId,
            task_id: "task-provider-ranking-repair-worker-context-recall",
            project: "api",
            brief_id: "replay-repair-dispatch-brief:phase166-worker-context-recall",
            work_item_id: "provider-ranking-provenance-compact-repair:phase166-worker-context-recall",
            source: "worker_context_provider_ranking_provenance_compact_repair",
            assignment_id: "assignment-provider-ranking-repair-worker-context-recall",
            dispatch_key: "dispatch-provider-ranking-repair-worker-context-recall",
            worker_context_packet_id: "wcp-provider-ranking-repair-worker-context-recall",
            worker_handoff_id: "worker-handoff-provider-ranking-repair-worker-context-recall",
            memory_context_snapshot_id: "task-agent-memory-context-snapshot:phase166-worker-context-recall",
            memory_context_snapshot_checksum: "snapshot-checksum-phase166-worker-context-recall",
            task_agent_session_id: "task-agent-session-provider-ranking-repair-worker-context-recall",
            native_session_id: "native-session-provider-ranking-repair-worker-context-recall",
            execution_id: "execution-provider-ranking-repair-worker-context-recall",
            receipt_status: "completed",
            replay_repair_consumption_status: "verified",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_RANKING_REPAIR_WORKER_CONTEXT_RECALL_SENTINEL verified compact repair preserved provider-switch-execution:phase166-worker-context; ranking evidence only, not authorization.",
            provider_switch_decision_receipt_id: "provider-switch-decision:phase166-worker-context-recall",
            provider_switch_decision_receipt_checksum: "provider-switch-receipt-checksum-phase166-worker-context-recall",
            provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
            provider_ranking_provenance_row_ids: ["provider-switch-execution:phase166-worker-context"],
            provider_ranking_provenance_preserved: true,
            provider_ranking_provenance_required: true,
            provider_ranking_provenance_repair_status: "completed",
            provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
            provider_ranking_provenance_receipt_consumption_verified: true,
            at: "2026-07-10T18:10:00.000Z",
            updated_at: "2026-07-10T18:10:00.000Z",
            first_seen_at: "2026-07-10T18:10:00.000Z",
        };
        const distillation = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, { rows: [row] }, {
            reason: "memory-center-provider-ranking-provenance-compact-repair-receipt-worker-context-recall-selftest",
            updatedAt: "2026-07-10T18:10:01.000Z",
        });
        const task = "继续 PROVIDER_RANKING_REPAIR_WORKER_CONTEXT_RECALL_SENTINEL provider ranking provenance compact repair receipt provider-switch-execution-memory.md，确认 ranking evidence only not authorization 且 fresh valid provider switch decision receipt required";
        const report = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptWorkerContextRecallReport)({
            groupIds: [groupId],
            targetProject: "api",
            task,
        });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall)({
            groupIds: [groupId],
            targetProject: "api",
            task,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_worker_context_recall"],
            groupIds: [groupId],
            targetProject: "api",
            task,
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_worker_context_recall") || {};
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = typedLedger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
        const group = report.groups?.[0] || {};
        const checks = {
            distillationCreatedArchive: distillation.archivedCount === 1
                && archive.archived_count === 1
                && archive.rows?.[0]?.provider_switch_decision_receipt_id === "provider-switch-decision:phase166-worker-context-recall",
            legacyMemoryIsNotInjectedIntoUnscopedSessions: report.overall?.status === "empty"
                && Number(report.overall?.checkedGroupCount || 0) === 0
                && Number(report.overall?.legacyScopeCount || 0) === 1
                && group.status === "legacy"
                && group.legacyAutoInjectionBlocked === true,
            qualityCheckRegistersSafeLegacyBoundary: quality.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_worker_context_recall"
                && quality.status === "empty"
                && qualityCheck.status === "empty"
                && Number(quality.checked || 0) === 0
                && Number(quality.passed || 0) === 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            group: {
                status: group.status || "",
                recalledThisTurn: group.recalledThisTurn === true,
                repeatChildSessionRecalled: group.repeatChildSessionRecalled === true,
                workerContextPacketCovered: group.workerContextPacketCovered === true,
                typedRecallUsageTokens: group.typedRecallUsageTokens || 0,
            },
        };
    }
    finally {
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageContractSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-memory-usage-contract-selftest-${process.pid}-${Date.now()}`;
    const groupSessionId = "gcs_phase167_memory_usage_contract";
    const typedScopeId = `${groupId}--${groupSessionId}`;
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(typedScopeId));
    try {
        const { distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory, readGroupTypedMemoryDistillationLedger, } = require("../collaboration/group-memory-index");
        const row = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-binding-v1",
            timeline_binding_id: "replay-repair-brief-timeline:phase167-memory-usage-contract",
            groupId,
            groupSessionId,
            task_id: "task-provider-ranking-repair-memory-usage-contract",
            project: "api",
            brief_id: "replay-repair-dispatch-brief:phase167-memory-usage-contract",
            work_item_id: "provider-ranking-provenance-compact-repair:phase167-memory-usage-contract",
            source: "worker_context_provider_ranking_provenance_compact_repair",
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-contract",
            memory_context_snapshot_id: "task-agent-memory-context-snapshot:phase167-memory-usage-contract",
            task_agent_session_id: "task-agent-session-provider-ranking-repair-memory-usage-contract",
            execution_id: "execution-provider-ranking-repair-memory-usage-contract",
            receipt_status: "completed",
            replay_repair_consumption_status: "verified",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            replay_repair_consumption_reason: "PROVIDER_RANKING_REPAIR_MEMORY_USAGE_CONTRACT_SENTINEL verified compact repair receipt memory must be declared in memoryUsed or memoryIgnored; ranking evidence only, not authorization.",
            provider_switch_decision_receipt_id: "provider-switch-decision:phase167-memory-usage-contract",
            provider_switch_decision_receipt_checksum: "provider-switch-receipt-checksum-phase167-memory-usage-contract",
            provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
            provider_ranking_provenance_row_ids: ["provider-switch-execution:phase167-memory-usage-contract"],
            provider_ranking_provenance_preserved: true,
            provider_ranking_provenance_required: true,
            provider_ranking_provenance_repair_status: "completed",
            provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
            provider_ranking_provenance_receipt_consumption_verified: true,
            at: "2026-07-10T18:25:00.000Z",
            updated_at: "2026-07-10T18:25:00.000Z",
            first_seen_at: "2026-07-10T18:25:00.000Z",
        };
        const distillation = distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(typedScopeId, { rows: [row] }, {
            sourceGroupId: groupId,
            groupSessionId,
            reason: "memory-center-provider-ranking-provenance-compact-repair-receipt-memory-usage-contract-selftest",
            updatedAt: "2026-07-10T18:25:01.000Z",
        });
        const task = "继续 PROVIDER_RANKING_REPAIR_MEMORY_USAGE_CONTRACT_SENTINEL provider ranking compact repair receipt memory usage contract，要求 memoryUsed memoryIgnored 声明且保持 ranking evidence only not authorization";
        const report = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageContractReport)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            targetProject: "api",
            task,
        });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageContract)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            targetProject: "api",
            task,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_contract"],
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            targetProject: "api",
            task,
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_contract") || {};
        const typedLedger = readGroupTypedMemoryDistillationLedger(typedScopeId);
        const archive = typedLedger.providerRankingProvenanceCompactRepairReceiptConsumptionArchive || {};
        const group = report.groups?.[0] || {};
        const checks = {
            distillationCreatedArchive: distillation.archivedCount === 1
                && archive.archived_count === 1,
            reportProvesContractInjection: report.overall?.status === "ok"
                && Number(report.overall?.contractActiveCount || 0) === 1
                && group.contractActive === true
                && group.acceptanceRequiresUsage === true
                && group.renderedContractCovered === true,
            reportProvesUsageCategory: Number(group.contextUsageTokens || 0) > 0,
            reportProvesReceiptValidator: group.goodReceiptCoverage?.pass === true
                && group.badReceiptCoverage?.pass === false
                && Number(report.overall?.validatorCoveredCount || 0) === 1,
            qualityCheckRegisteredAndPasses: quality.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_contract"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            group: {
                status: group.status || "",
                contractActive: group.contractActive === true,
                acceptanceRequiresUsage: group.acceptanceRequiresUsage === true,
                renderedContractCovered: group.renderedContractCovered === true,
                contextUsageTokens: group.contextUsageTokens || 0,
                goodReceiptPass: group.goodReceiptCoverage?.pass === true,
                badReceiptPass: group.badReceiptCoverage?.pass === true,
            },
        };
    }
    finally {
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-memory-usage-receipt-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt",
        status: "ok",
        total_tokens: 120,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 48, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const goodEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase168-memory-usage-receipt",
        assignment_id: "assignment-phase168-memory-usage-receipt",
        groupId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt",
            project: "api",
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified; ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
            ],
            memoryIgnored: [],
        },
    };
    const badEntry = {
        ...goodEntry,
        binding_id: "replay-repair-assignment-binding:phase168-memory-usage-receipt-bad",
        assignment_id: "assignment-phase168-memory-usage-receipt-bad",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-bad",
        worker_context_packet: {
            ...goodEntry.worker_context_packet,
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-bad",
            context_usage: {
                ...contextUsage,
                packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-bad",
            },
        },
        worker_context_packet_context_usage: {
            ...contextUsage,
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-bad",
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-bad",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified",
            ],
            memoryIgnored: [],
        },
    };
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T18:45:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [goodEntry],
        });
        const report = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptReport)({
            groupIds: [groupId],
            tasks: [],
        });
        const quality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceipt)({
            groupIds: [groupId],
            tasks: [],
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt"],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt") || {};
        const group = report.groups?.[0] || {};
        const goodReceipt = group.receipts?.[0] || {};
        const badRow = (0, memory_control_center_1.workerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRow)(groupId, badEntry, { tasks: [] });
        const checks = {
            reportProvesReceiptCoverage: report.overall?.status === "ok"
                && Number(report.overall?.receiptContractCount || 0) === 1
                && Number(report.overall?.coveredReceiptCount || 0) === 1
                && Number(report.overall?.missingReceiptCoverageCount || 0) === 0,
            reportPreservesAuthorizationBoundary: goodReceipt.compliant === true
                && goodReceipt.memoryUsed?.some((item) => /ranking evidence only, not authorization/i.test(item))
                && goodReceipt.memoryUsed?.some((item) => /fresh valid provider switch decision receipt/i.test(item)),
            badReceiptRejected: badRow.compliant === false
                && badRow.coverage?.pass === false
                && badRow.gaps.includes("receipt_authorization_boundary"),
            qualityCheckRegisteredAndPasses: quality.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            group: {
                status: group.status || "",
                receiptContractCount: group.receiptContractCount || 0,
                compliantReceiptCount: group.compliantReceiptCount || 0,
                missingReceiptCoverageCount: group.missingReceiptCoverageCount || 0,
            },
            badRow: {
                compliant: badRow.compliant === true,
                gaps: badRow.gaps || [],
            },
        };
    }
    finally {
        try {
            if (fs.existsSync(bindingFile))
                fs.rmSync(bindingFile, { force: true });
        }
        catch { }
        try {
            if (fs.existsSync(workFile))
                fs.rmSync(workFile, { force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-memory-usage-receipt-repair-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair",
        status: "ok",
        total_tokens: 120,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 48, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const badEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase169-memory-usage-receipt-repair",
        assignment_id: "assignment-phase169-memory-usage-receipt-repair",
        dispatch_key: "dispatch-phase169-memory-usage-receipt-repair",
        groupId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair",
            project: "api",
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified",
            ],
            memoryIgnored: [],
        },
    };
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T19:05:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [badEntry],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            tasks: [],
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            repairWorkItemReport: repairReport,
        });
        const repairQuality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItems)({
            groupIds: [groupId],
            tasks: [],
        });
        const candidateQuality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchCandidates)({
            groupIds: [groupId],
            tasks: [],
            repairWorkItemReport: repairReport,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_work_items",
                "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_candidates",
            ],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const repairCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_work_items") || {};
        const candidateCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_candidates") || {};
        const repairGroup = repairReport.groups?.[0] || {};
        const candidateGroup = candidateReport.groups?.[0] || {};
        const repairItem = repairGroup.items?.[0] || {};
        const candidate = candidateGroup.candidates?.[0] || {};
        const checks = {
            repairWorkItemCreated: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.expectedRepairItemCount || 0) === 1
                && Number(repairReport.overall?.openRepairItemCount || 0) === 1
                && repairItem.status === "pending"
                && repairItem.docRelPath === "provider-ranking-provenance-compact-repair-receipt-memory.md"
                && repairItem.gaps?.includes("receipt_authorization_boundary"),
            repairDispatchCandidateCreated: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) === 1
                && Number(candidateReport.overall?.coveredCandidateCount || 0) === 1
                && candidate.shouldCreateRealTask === false
                && candidate.worker_context_packet_id === "wcp-provider-ranking-repair-memory-usage-receipt-repair"
                && String(candidate.prompt_patch || "").includes("memoryUsed")
                && String(candidate.prompt_patch || "").includes("memoryIgnored")
                && String(candidate.prompt_patch || "").includes("ranking evidence only, not authorization"),
            qualityChecksRegisteredAndPass: repairQuality.status === "ok"
                && candidateQuality.status === "ok"
                && repairCheck.status === "ok"
                && candidateCheck.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repairReport: repairReport.overall,
            candidateReport: candidateReport.overall,
            qualityChecks: {
                repair: {
                    id: repairCheck.id || "",
                    status: repairCheck.status || "",
                    checked: repairCheck.checked || 0,
                    passed: repairCheck.passed || 0,
                },
                candidate: {
                    id: candidateCheck.id || "",
                    status: candidateCheck.status || "",
                    checked: candidateCheck.checked || 0,
                    passed: candidateCheck.passed || 0,
                },
            },
            repairItem,
            candidate: {
                work_item_id: candidate.work_item_id || "",
                source: candidate.source || "",
                worker_context_packet_id: candidate.worker_context_packet_id || "",
                shouldCreateRealTask: candidate.shouldCreateRealTask,
            },
        };
    }
    finally {
        try {
            if (fs.existsSync(bindingFile))
                fs.rmSync(bindingFile, { force: true });
        }
        catch { }
        try {
            if (fs.existsSync(workFile))
                fs.rmSync(workFile, { force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefSelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-memory-usage-receipt-repair-brief-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const planFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-brief",
        status: "ok",
        total_tokens: 120,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 48, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const badEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase170-memory-usage-receipt-repair-brief",
        assignment_id: "assignment-phase170-memory-usage-receipt-repair-brief",
        dispatch_key: "dispatch-phase170-memory-usage-receipt-repair-brief",
        groupId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-brief",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-brief",
            project: "api",
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-brief",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified",
            ],
            memoryIgnored: [],
        },
    };
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T19:20:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [badEntry],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            tasks: [],
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            repairWorkItemReport: repairReport,
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            tasks: [],
            candidateReport,
            at: "2026-07-10T19:20:01.000Z",
        });
        const briefQuality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefs)({
            groupIds: [groupId],
            tasks: [],
            candidateReport,
            at: "2026-07-10T19:20:02.000Z",
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_briefs"],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_briefs") || {};
        const group = briefReport.groups?.[0] || {};
        const readyBrief = group.briefs?.[0] || {};
        const workerTask = String(readyBrief.worker_task || "");
        const checks = {
            briefCreatedAndRegistered: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) === 1
                && Number(briefReport.overall?.coveredBriefCount || 0) === 1
                && Number(group.metadataGapCount || 0) === 0,
            briefIsSelfContained: workerTask.includes("memoryUsed")
                && workerTask.includes("memoryIgnored")
                && workerTask.includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && /usageState|usage_state/i.test(workerTask)
                && workerTask.includes("ranking evidence only, not authorization")
                && workerTask.includes("fresh valid provider switch decision receipt")
                && workerTask.includes("wcp-provider-ranking-repair-memory-usage-receipt-repair-brief")
                && workerTask.includes("CCM_AGENT_RECEIPT"),
            qualityCheckRegisteredAndPasses: briefQuality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(briefQuality.checked || 0) === 1
                && Number(briefQuality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            briefReport: briefReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            brief: {
                brief_id: readyBrief.brief_id || "",
                work_item_id: readyBrief.work_item_id || "",
                source: readyBrief.source || "",
                worker_context_packet_id: readyBrief.worker_context_packet_id || "",
                worker_task: (0, memory_control_center_1.compactMemoryCenterText)(workerTask, 1000),
            },
        };
    }
    finally {
        try {
            if (fs.existsSync(bindingFile))
                fs.rmSync(bindingFile, { force: true });
        }
        catch { }
        try {
            if (fs.existsSync(workFile))
                fs.rmSync(workFile, { force: true });
        }
        catch { }
        try {
            if (fs.existsSync(planFile))
                fs.rmSync(planFile, { force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairTypedMemorySelfTest() {
    const groupId = `memory-center-provider-ranking-provenance-compact-repair-receipt-memory-usage-receipt-repair-typed-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const planFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-typed",
        status: "ok",
        total_tokens: 120,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 48, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const badEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase171-memory-usage-receipt-repair-typed",
        assignment_id: "assignment-phase171-memory-usage-receipt-repair-typed",
        dispatch_key: "dispatch-phase171-memory-usage-receipt-repair-typed",
        groupId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-typed",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-typed",
            project: "api",
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-repair-typed",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified",
            ],
            memoryIgnored: [],
        },
    };
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T19:35:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [badEntry],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            tasks: [],
            generatedAt: "2026-07-10T19:35:01.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-10T19:35:02.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            tasks: [],
            candidateReport,
            generatedAt: "2026-07-10T19:35:03.000Z",
        });
        const typedReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairTypedMemoryReport)({
            groupIds: [groupId],
            tasks: [],
            repairWorkItemReport: repairReport,
            candidateReport,
            briefReport,
            generatedAt: "2026-07-10T19:35:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_typed_memory"],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_typed_memory") || {};
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, buildGroupTypedMemoryRecall, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = ledger.providerRankingMemoryUsageReceiptRepairArchive || {};
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const doc = (docs || []).find((item) => item.source === "auto:provider-ranking-memory-usage-receipt-repair-distillation") || {};
        const docBody = String(doc.body || "");
        const recall = buildGroupTypedMemoryRecall(groupId, "provider ranking memory usage receipt memoryUsed memoryIgnored usageState fresh valid provider switch decision receipt ranking evidence only not authorization", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = [
            ...(Array.isArray(recall.recalled) ? recall.recalled : []),
            ...(Array.isArray(recall.entries) ? recall.entries : []),
            ...(Array.isArray(recall.selected) ? recall.selected : []),
            ...(Array.isArray(recall.docs) ? recall.docs : []),
        ].map((item) => `${item.relPath || item.rel_path || ""}\n${item.name || ""}\n${item.body || ""}\n${item.snippet || ""}\n${item.text || ""}`).join("\n");
        const checks = {
            repairDispatchChainReady: repairReport.overall?.status === "ok"
                && candidateReport.overall?.status === "ok"
                && briefReport.overall?.status === "ok",
            typedMemoryReportPasses: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.typedMemoryDocCount || 0) >= 1
                && Number(typedReport.overall?.archivedCount || 0) >= 1
                && Number(typedReport.overall?.recallMatchCount || 0) >= 1,
            qualityCheckExposesTypedMemory: qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
            ledgerArchivesProviderRankingReceiptRows: archive.schema === "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1"
                && Number(archive.archived_count || 0) >= 1
                && Number(archive.corrected_prompt_count || 0) >= 1
                && Number(archive.usage_state_prompt_count || 0) >= 1
                && Number(archive.authorization_boundary_prompt_count || 0) >= 1
                && Number(archive.fresh_receipt_prompt_count || 0) >= 1
                && (archive.doc_rel_paths || []).includes("provider-ranking-provenance-compact-repair-receipt-memory.md"),
            typedDocContainsReceiptDiscipline: doc.source === "auto:provider-ranking-memory-usage-receipt-repair-distillation"
                && doc.relPath === "provider-ranking-memory-usage-receipt-discipline.md"
                && docBody.includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && docBody.includes("memoryUsed")
                && docBody.includes("memoryIgnored")
                && /usageState|usage_state/i.test(docBody)
                && docBody.includes("ranking evidence only, not authorization")
                && docBody.includes("fresh valid provider switch decision receipt"),
            recallFindsProviderRankingReceiptDiscipline: /provider-ranking-memory-usage-receipt-discipline\.md|memoryUsed|memoryIgnored|usageState|fresh valid provider switch decision receipt|ranking evidence only, not authorization/i.test(recallText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repairReport: repairReport.overall,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            typedReport: typedReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            archive: {
                archived_count: archive.archived_count || 0,
                corrected_prompt_count: archive.corrected_prompt_count || 0,
                usage_state_prompt_count: archive.usage_state_prompt_count || 0,
                authorization_boundary_prompt_count: archive.authorization_boundary_prompt_count || 0,
                fresh_receipt_prompt_count: archive.fresh_receipt_prompt_count || 0,
                doc_rel_paths: archive.doc_rel_paths || [],
            },
            doc: {
                relPath: doc.relPath || "",
                source: doc.source || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workFile, `${workFile}.bak`, planFile, `${planFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkerContextInjectionSelfTest() {
    const groupId = `memory-center-provider-ranking-memory-usage-receipt-worker-context-injection-selftest-${process.pid}-${Date.now()}`;
    const groupSessionId = "gcs_phase172_worker_context_injection";
    const typedScopeId = `${groupId}--${groupSessionId}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId, groupSessionId);
    const planFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId, groupSessionId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(typedScopeId));
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-worker-context-injection",
        status: "ok",
        total_tokens: 120,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 48, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const badEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase172-memory-usage-receipt-worker-context-injection",
        assignment_id: "assignment-phase172-memory-usage-receipt-worker-context-injection",
        dispatch_key: "dispatch-phase172-memory-usage-receipt-worker-context-injection",
        groupId,
        groupSessionId,
        group_session_id: groupSessionId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-worker-context-injection",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-worker-context-injection",
            project: "api",
            group_session_id: groupSessionId,
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-worker-context-injection",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified",
            ],
            memoryIgnored: [],
        },
    };
    try {
        const { distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory, } = require("../collaboration/group-memory-index");
        distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(typedScopeId, {
            rows: [{
                    schema: "ccm-replay-repair-main-agent-dispatch-brief-timeline-binding-v1",
                    timeline_binding_id: "replay-repair-brief-timeline:phase172-worker-context-injection",
                    groupId,
                    groupSessionId,
                    task_id: "task-provider-ranking-repair-worker-context-injection",
                    project: "api",
                    brief_id: "replay-repair-dispatch-brief:phase172-worker-context-injection",
                    work_item_id: "provider-ranking-provenance-compact-repair:phase172-worker-context-injection",
                    source: "worker_context_provider_ranking_provenance_compact_repair",
                    assignment_id: "assignment-provider-ranking-repair-worker-context-injection",
                    dispatch_key: "dispatch-provider-ranking-repair-worker-context-injection",
                    worker_context_packet_id: "wcp-provider-ranking-repair-worker-context-injection",
                    receipt_status: "completed",
                    replay_repair_consumption_status: "verified",
                    replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
                    replay_repair_consumption_reason: "PHASE172_PROVIDER_RANKING_WORKER_CONTEXT_INJECTION_SENTINEL verified compact repair preserved provider-switch-execution:phase172; ranking evidence only, not authorization.",
                    provider_switch_decision_receipt_id: "provider-switch-decision:phase172-worker-context-injection",
                    provider_switch_decision_receipt_checksum: "provider-switch-receipt-checksum-phase172-worker-context-injection",
                    provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
                    provider_ranking_provenance_row_ids: ["provider-switch-execution:phase172"],
                    provider_ranking_provenance_preserved: true,
                    provider_ranking_provenance_required: true,
                    provider_ranking_provenance_repair_status: "completed",
                    provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
                    provider_ranking_provenance_receipt_consumption_verified: true,
                    at: "2026-07-10T19:50:00.000Z",
                    updated_at: "2026-07-10T19:50:00.000Z",
                }],
        }, {
            sourceGroupId: groupId,
            groupSessionId,
            reason: "memory-center-provider-ranking-memory-usage-receipt-worker-context-injection-selftest",
            updatedAt: "2026-07-10T19:50:01.000Z",
        });
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T19:50:02.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [badEntry],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            tasks: [],
            generatedAt: "2026-07-10T19:50:03.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            tasks: [],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-10T19:50:04.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            tasks: [],
            candidateReport,
            generatedAt: "2026-07-10T19:50:05.000Z",
        });
        const typedMemoryReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairTypedMemoryReport)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            tasks: [],
            repairWorkItemReport: repairReport,
            candidateReport,
            briefReport,
            generatedAt: "2026-07-10T19:50:06.000Z",
        });
        const injectionReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkerContextInjectionReport)({
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            tasks: [],
            typedMemoryReport,
            targetProject: "api",
            task: "PHASE172_PROVIDER_RANKING_WORKER_CONTEXT_INJECTION_SENTINEL provider ranking memory usage receipt discipline memoryUsed memoryIgnored usageState fresh valid provider switch decision receipt ranking evidence only not authorization",
            generatedAt: "2026-07-10T19:50:07.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_worker_context_injection"],
            groupIds: [groupId],
            groupSessionIds: [groupSessionId],
            tasks: [],
            targetProject: "api",
            task: "PHASE172_PROVIDER_RANKING_WORKER_CONTEXT_INJECTION_SENTINEL provider ranking memory usage receipt discipline memoryUsed memoryIgnored usageState fresh valid provider switch decision receipt ranking evidence only not authorization",
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_worker_context_injection") || {};
        const group = injectionReport.groups?.[0] || {};
        const checks = {
            typedMemoryReportReady: typedMemoryReport.overall?.status === "ok"
                && Number(typedMemoryReport.overall?.typedMemoryDocCount || 0) >= 1
                && Number(typedMemoryReport.overall?.archivedCount || 0) >= 1,
            workerContextInjectionReportPasses: injectionReport.overall?.status === "ok"
                && Number(injectionReport.overall?.workerContextPacketCoveredCount || 0) === 1
                && Number(injectionReport.overall?.renderedContextCoveredCount || 0) === 1
                && Number(injectionReport.overall?.recallSurfacedDisciplineCount || 0) === 1,
            contractRequiresDisciplineDoc: group.contract?.memory_usage_receipt_discipline_required === true
                && (group.contract?.memory_usage_receipt_discipline_rel_paths || []).includes("provider-ranking-memory-usage-receipt-discipline.md")
                && (group.contract?.memory_receipt_required_doc_rel_paths || []).includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && (group.contract?.memory_receipt_required_doc_rel_paths || []).includes("provider-ranking-memory-usage-receipt-discipline.md"),
            qualityCheckRegisteredAndPasses: qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            typedMemoryReport: typedMemoryReport.overall,
            injectionReport: injectionReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            group: {
                status: group.status || "",
                recallSurfacedDiscipline: group.recallSurfacedDiscipline === true,
                renderedContextCovered: group.renderedContextCovered === true,
                workerContextPacketCovered: group.workerContextPacketCovered === true,
                contract: group.contract || {},
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workFile, `${workFile}.bak`, planFile, `${planFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocsSelfTest() {
    const groupId = `memory-center-provider-ranking-memory-usage-receipt-required-docs-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const planFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const requiredDocs = [
        "provider-ranking-provenance-compact-repair-receipt-memory.md",
        "provider-ranking-memory-usage-receipt-discipline.md",
    ];
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        memory_usage_receipt_discipline_rel_paths: ["provider-ranking-memory-usage-receipt-discipline.md"],
        memory_usage_receipt_discipline_required: true,
        memory_receipt_required_doc_rel_paths: requiredDocs,
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs",
        status: "ok",
        total_tokens: 144,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 72, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const goodEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase173-memory-usage-receipt-required-docs",
        assignment_id: "assignment-phase173-memory-usage-receipt-required-docs",
        dispatch_key: "dispatch-phase173-memory-usage-receipt-required-docs",
        groupId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs",
            project: "api",
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
                provider_ranking_memory_usage_receipt_discipline_required: true,
                provider_ranking_memory_receipt_required_doc_rel_paths: requiredDocs,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified; ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
                "provider-ranking-memory-usage-receipt-discipline.md; usageState=verified; ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
            ],
            memoryIgnored: [],
        },
    };
    const badEntry = {
        ...goodEntry,
        binding_id: "replay-repair-assignment-binding:phase173-memory-usage-receipt-required-docs-bad",
        assignment_id: "assignment-phase173-memory-usage-receipt-required-docs-bad",
        dispatch_key: "dispatch-phase173-memory-usage-receipt-required-docs-bad",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs-bad",
        worker_context_packet_context_usage: {
            ...contextUsage,
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs-bad",
        },
        worker_context_packet: {
            ...goodEntry.worker_context_packet,
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs-bad",
            context_usage: {
                ...contextUsage,
                packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs-bad",
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-required-docs-bad",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified; ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
            ],
            memoryIgnored: [],
        },
    };
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T20:05:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [goodEntry],
        });
        const receiptReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptReport)({
            groupIds: [groupId],
            tasks: [],
            generatedAt: "2026-07-10T20:05:01.000Z",
        });
        const requiredDocsReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocsReport)({
            groupIds: [groupId],
            tasks: [],
            receiptReport,
            generatedAt: "2026-07-10T20:05:02.000Z",
        });
        const requiredDocsQuality = (0, memory_control_center_1.evaluateWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocs)({
            groupIds: [groupId],
            tasks: [],
            receiptReport,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_required_docs"],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_required_docs") || {};
        const receiptGroup = receiptReport.groups?.[0] || {};
        const requiredGroup = requiredDocsReport.groups?.[0] || {};
        const goodReceipt = receiptGroup.receipts?.[0] || {};
        const badRow = (0, memory_control_center_1.workerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRow)(groupId, badEntry, { tasks: [] });
        const badRepairItem = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItem)(groupId, badRow, 0, {}, "2026-07-10T20:05:03.000Z");
        const checks = {
            baseReceiptReportAcceptsAllRequiredDocs: receiptReport.overall?.status === "ok"
                && Number(receiptReport.overall?.receiptContractCount || 0) === 1
                && Number(receiptReport.overall?.coveredReceiptCount || 0) === 1
                && Number(receiptReport.overall?.missingReceiptCoverageCount || 0) === 0,
            requiredDocsReportAcceptsAllRequiredDocs: requiredDocsReport.overall?.status === "ok"
                && Number(requiredDocsReport.overall?.requiredDocReceiptCount || 0) === 1
                && Number(requiredDocsReport.overall?.coveredRequiredDocReceiptCount || 0) === 1
                && Number(requiredDocsReport.overall?.disciplineDocReceiptCount || 0) === 1
                && Number(requiredDocsReport.overall?.missingRequiredDocCount || 0) === 0,
            qualityCheckRegisteredAndPasses: requiredDocsQuality.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_required_docs"
                && requiredDocsQuality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
            goodReceiptCoversBothDocs: requiredDocs.every(relPath => (goodReceipt.requiredDocRelPaths || []).includes(relPath))
                && requiredDocs.every(relPath => (goodReceipt.coveredDocRelPaths || []).includes(relPath))
                && (goodReceipt.missingDocRelPaths || []).length === 0
                && (goodReceipt.missingUsageStateDocRelPaths || []).length === 0,
            badReceiptRejectedForMissingDisciplineDoc: badRow.compliant === false
                && badRow.coverage?.pass === false
                && (badRow.missingDocRelPaths || []).includes("provider-ranking-memory-usage-receipt-discipline.md")
                && (badRow.gaps || []).includes("receipt_memoryUsed_memoryIgnored_doc"),
            repairItemCarriesRequiredAndMissingDocs: (badRepairItem.provider_ranking_memory_receipt_required_doc_rel_paths || []).includes("provider-ranking-provenance-compact-repair-receipt-memory.md")
                && (badRepairItem.provider_ranking_memory_receipt_required_doc_rel_paths || []).includes("provider-ranking-memory-usage-receipt-discipline.md")
                && (badRepairItem.provider_ranking_memory_receipt_missing_doc_rel_paths || []).includes("provider-ranking-memory-usage-receipt-discipline.md")
                && String(badRepairItem.prompt_patch || "").includes("provider-ranking-memory-usage-receipt-discipline.md"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receiptReport: receiptReport.overall,
            requiredDocsReport: requiredDocsReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            group: {
                status: requiredGroup.status || "",
                requiredDocRelPaths: requiredGroup.requiredDocRelPaths || [],
                disciplineDocReceiptCount: requiredGroup.disciplineDocReceiptCount || 0,
            },
            goodReceipt: {
                requiredDocRelPaths: goodReceipt.requiredDocRelPaths || [],
                coveredDocRelPaths: goodReceipt.coveredDocRelPaths || [],
                missingDocRelPaths: goodReceipt.missingDocRelPaths || [],
                missingUsageStateDocRelPaths: goodReceipt.missingUsageStateDocRelPaths || [],
            },
            badRow: {
                compliant: badRow.compliant === true,
                missingDocRelPaths: badRow.missingDocRelPaths || [],
                missingUsageStateDocRelPaths: badRow.missingUsageStateDocRelPaths || [],
                gaps: badRow.gaps || [],
            },
            badRepairItem: {
                requiredDocRelPaths: badRepairItem.provider_ranking_memory_receipt_required_doc_rel_paths || [],
                missingDocRelPaths: badRepairItem.provider_ranking_memory_receipt_missing_doc_rel_paths || [],
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workFile, `${workFile}.bak`, planFile, `${planFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefRequiredDocsSelfTest() {
    const groupId = `memory-center-provider-ranking-memory-usage-receipt-brief-required-docs-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const planFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const requiredDocs = [
        "provider-ranking-provenance-compact-repair-receipt-memory.md",
        "provider-ranking-memory-usage-receipt-discipline.md",
    ];
    const contract = {
        schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
        active: true,
        doc_rel_path: "provider-ranking-provenance-compact-repair-receipt-memory.md",
        required_receipt_fields: ["memoryUsed", "memoryIgnored"],
        memory_usage_receipt_discipline_rel_paths: ["provider-ranking-memory-usage-receipt-discipline.md"],
        memory_usage_receipt_discipline_required: true,
        memory_receipt_required_doc_rel_paths: requiredDocs,
        authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
    };
    const contextUsage = {
        schema: "ccm-worker-context-usage-v1",
        packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-brief-required-docs",
        status: "ok",
        total_tokens: 144,
        max_tokens: 90000,
        categories: [
            { id: "provider_ranking_compact_repair_receipt_memory_contract", label: "Provider ranking compact repair receipt memory contract", tokens: 72, required: true },
            { id: "task_goal", label: "Task goal", tokens: 24, required: true },
            { id: "verification_and_acceptance", label: "Verification and acceptance", tokens: 24, required: true },
            { id: "free_space", label: "Free space", tokens: 24, required: false },
        ],
    };
    const badEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
        binding_id: "replay-repair-assignment-binding:phase174-memory-usage-receipt-brief-required-docs",
        assignment_id: "assignment-phase174-memory-usage-receipt-brief-required-docs",
        dispatch_key: "dispatch-phase174-memory-usage-receipt-brief-required-docs",
        groupId,
        project: "api",
        worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-brief-required-docs",
        provider_ranking_compact_repair_receipt_memory_contract: contract,
        worker_context_packet_context_usage: contextUsage,
        worker_context_packet: {
            packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-brief-required-docs",
            project: "api",
            provider_ranking_compact_repair_receipt_memory_contract: contract,
            context_usage: contextUsage,
            acceptance: {
                provider_ranking_compact_repair_receipt_memory_usage_required: true,
                provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
                provider_ranking_memory_usage_receipt_discipline_required: true,
                provider_ranking_memory_receipt_required_doc_rel_paths: requiredDocs,
            },
        },
        worker_context_packet_receipt: {
            worker_context_packet_id: "wcp-provider-ranking-repair-memory-usage-receipt-brief-required-docs",
            project: "api",
            status: "completed",
            memoryUsed: [
                "provider-ranking-provenance-compact-repair-receipt-memory.md; usageState=verified; ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
            ],
            memoryIgnored: [],
        },
    };
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T20:20:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 1,
            entries: [badEntry],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            tasks: [],
            generatedAt: "2026-07-10T20:20:01.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            tasks: [],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-10T20:20:02.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            tasks: [],
            candidateReport,
            at: "2026-07-10T20:20:03.000Z",
        });
        const requiredDocsReport = (0, memory_control_center_1.buildWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefRequiredDocsReport)({
            groupIds: [groupId],
            tasks: [],
            briefReport,
            generatedAt: "2026-07-10T20:20:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_brief_required_docs"],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_brief_required_docs") || {};
        const candidateGroup = candidateReport.groups?.[0] || {};
        const briefGroup = briefReport.groups?.[0] || {};
        const requiredGroup = requiredDocsReport.groups?.[0] || {};
        const candidate = candidateGroup.candidates?.[0] || {};
        const readyBrief = briefGroup.briefs?.[0] || {};
        const workerTask = String(readyBrief.worker_task || "");
        const checks = {
            repairCandidateAndBriefReportsPass: repairReport.overall?.status === "ok"
                && candidateReport.overall?.status === "ok"
                && briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.requiredDocBriefCount || 0) === 1
                && Number(briefReport.overall?.disciplineRequiredDocBriefCount || 0) === 1,
            candidateCarriesRequiredAndMissingDocs: requiredDocs.every(relPath => (candidate.provider_ranking_memory_receipt_required_doc_rel_paths || []).includes(relPath))
                && (candidate.provider_ranking_memory_receipt_missing_doc_rel_paths || []).includes("provider-ranking-memory-usage-receipt-discipline.md")
                && requiredDocs.every(relPath => (candidate.provider_ranking_provenance_rel_paths || []).includes(relPath)),
            briefCarriesRequiredAndMissingDocs: requiredDocs.every(relPath => (readyBrief.provider_ranking_memory_receipt_required_doc_rel_paths || []).includes(relPath))
                && (readyBrief.provider_ranking_memory_receipt_missing_doc_rel_paths || []).includes("provider-ranking-memory-usage-receipt-discipline.md")
                && requiredDocs.every(relPath => (readyBrief.provider_ranking_provenance_rel_paths || []).includes(relPath)),
            briefWorkerTaskIsSelfContained: requiredDocs.every(relPath => workerTask.includes(relPath))
                && workerTask.includes("memoryUsed")
                && workerTask.includes("memoryIgnored")
                && /usageState|usage_state/i.test(workerTask)
                && workerTask.includes("ranking evidence only, not authorization")
                && workerTask.includes("fresh valid provider switch decision receipt")
                && workerTask.includes("CCM_AGENT_RECEIPT"),
            requiredDocsQualityPasses: requiredDocsReport.overall?.status === "ok"
                && Number(requiredDocsReport.overall?.requiredDocBriefCount || 0) === 1
                && Number(requiredDocsReport.overall?.coveredRequiredDocBriefCount || 0) === 1
                && Number(requiredDocsReport.overall?.disciplineDocBriefCount || 0) === 1
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repairReport: repairReport.overall,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            requiredDocsReport: requiredDocsReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            candidate: {
                requiredDocRelPaths: candidate.provider_ranking_memory_receipt_required_doc_rel_paths || [],
                missingDocRelPaths: candidate.provider_ranking_memory_receipt_missing_doc_rel_paths || [],
                provenanceRelPaths: candidate.provider_ranking_provenance_rel_paths || [],
            },
            brief: {
                status: requiredGroup.status || "",
                requiredDocRelPaths: readyBrief.provider_ranking_memory_receipt_required_doc_rel_paths || [],
                missingDocRelPaths: readyBrief.provider_ranking_memory_receipt_missing_doc_rel_paths || [],
                provenanceRelPaths: readyBrief.provider_ranking_provenance_rel_paths || [],
                worker_task: (0, memory_control_center_1.compactMemoryCenterText)(workerTask, 1200),
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workFile, `${workFile}.bak`, planFile, `${planFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest() {
    const groupId = `memory-center-worker-context-compact-strategy-memory-selftest-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const strategyFile = (0, memory_control_center_1.getGroupWorkerContextCompactStrategyMemoryFile)(groupId);
    try {
        const dependencyPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["dependencies"],
            skipped_categories: ["constraints_and_documents"],
            max_categories: 1,
            fallback_used: false,
        };
        const constraintsPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T15:20:02.000Z",
            entries: [
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-center-strategy-dependency",
                    group_id: groupId,
                    assignment_id: "assignment-center-strategy-dependency",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_total_tokens: 7800,
                    retry_total_tokens: 2600,
                    from_free_tokens: -4100,
                    retry_free_tokens: 1100,
                    token_delta: 5200,
                    free_token_delta: 5200,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["dependencies"],
                    partial_compact_policy: dependencyPolicy,
                    partial_omitted_chars: 19000,
                    distillation_candidate: true,
                    at: "2026-07-09T15:20:01.000Z",
                },
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-center-strategy-constraints",
                    group_id: groupId,
                    assignment_id: "assignment-center-strategy-constraints",
                    method: "metadata_partial_compact",
                    status: "blocked",
                    dispatch_ready: false,
                    from_total_tokens: 7600,
                    retry_total_tokens: 7500,
                    from_free_tokens: -3900,
                    retry_free_tokens: -3800,
                    token_delta: 100,
                    free_token_delta: 100,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["constraints_and_documents"],
                    partial_compact_policy: constraintsPolicy,
                    partial_omitted_chars: 700,
                    distillation_candidate: true,
                    at: "2026-07-09T15:20:02.000Z",
                },
            ],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactStrategyMemoryReport)({ groupIds: [groupId], generatedAt: "2026-07-09T15:20:03.000Z" });
        const strategy = (0, memory_control_center_1.readGroupWorkerContextCompactStrategyMemory)(groupId);
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactStrategyMemory)({ groupIds: [groupId], generatedAt: "2026-07-09T15:20:03.000Z" });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compact_strategy_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compact_strategy_memory") || {};
        const groupRow = report.groups?.[0] || {};
        const dependencyStats = (strategy.categories || []).find((item) => item.category === "dependencies") || {};
        const checks = {
            reportDistillsStrategyMemory: report.overall?.status === "ok"
                && Number(report.overall?.strategyMemoryCount || 0) === 1
                && Number(report.overall?.distilledOutcomeCount || 0) === 2
                && Number(report.overall?.metadataGapCount || 0) === 0,
            strategySidecarCreated: fs.existsSync(strategyFile)
                && strategy.schema === "ccm-worker-context-compact-strategy-memory-v1"
                && strategy.source_ledger_file === outcomeFile,
            preferredCategoryFromRecovery: strategy.preferred_categories?.[0] === "dependencies"
                && Number(dependencyStats.avg_free_token_delta || 0) === 5200,
            qualityCheckCoversStrategyMemory: quality.id === "worker_context_packet_compact_strategy_memory"
                && quality.status === "ok"
                && qualityCheck.status === "ok",
            reportRowCarriesStrategy: groupRow.preferredCategories?.[0] === "dependencies"
                && Number(groupRow.sampleCount || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            strategy: {
                preferred_categories: strategy.preferred_categories || [],
                sample_count: strategy.sample_count || 0,
                source_ledger_file: strategy.source_ledger_file || "",
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [outcomeFile, `${outcomeFile}.bak`, strategyFile, `${strategyFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest() {
    const groupId = `memory-center-worker-context-compact-strategy-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const strategyFile = (0, memory_control_center_1.getGroupWorkerContextCompactStrategyMemoryFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const dependencyPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["dependencies"],
            skipped_categories: ["constraints_and_documents"],
            max_categories: 1,
            fallback_used: false,
        };
        const constraintsPolicy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T20:50:02.000Z",
            entries: [
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-center-strategy-typed-dependency",
                    group_id: groupId,
                    assignment_id: "assignment-center-strategy-typed-dependency",
                    retry_id: "retry-center-strategy-typed-dependency",
                    hook_run_id: "hook-center-strategy-typed-dependency",
                    project: "api",
                    method: "metadata_partial_compact",
                    status: "recovered",
                    dispatch_ready: true,
                    from_total_tokens: 7800,
                    retry_total_tokens: 2500,
                    from_free_tokens: -4200,
                    retry_free_tokens: 1200,
                    token_delta: 5300,
                    free_token_delta: 5400,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["dependencies"],
                    partial_compact_policy: dependencyPolicy,
                    partial_omitted_chars: 19000,
                    distillation_candidate: true,
                    at: "2026-07-09T20:50:01.000Z",
                },
                {
                    schema: "ccm-worker-context-compact-outcome-entry-v1",
                    outcome_id: "wcco-center-strategy-typed-constraints",
                    group_id: groupId,
                    assignment_id: "assignment-center-strategy-typed-constraints",
                    retry_id: "retry-center-strategy-typed-constraints",
                    hook_run_id: "hook-center-strategy-typed-constraints",
                    project: "api",
                    method: "metadata_partial_compact",
                    status: "blocked",
                    dispatch_ready: false,
                    from_total_tokens: 7600,
                    retry_total_tokens: 7500,
                    from_free_tokens: -3900,
                    retry_free_tokens: -3800,
                    token_delta: 100,
                    free_token_delta: 100,
                    partial_compact: true,
                    task_compacted: false,
                    task_hash_unchanged: true,
                    partial_compaction_categories: ["constraints_and_documents"],
                    partial_compact_policy: constraintsPolicy,
                    partial_omitted_chars: 700,
                    distillation_candidate: true,
                    at: "2026-07-09T20:50:02.000Z",
                },
            ],
        });
        const strategyReport = (0, memory_control_center_1.buildWorkerContextPacketCompactStrategyMemoryReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T20:50:03.000Z",
        });
        const typedReport = (0, memory_control_center_1.buildWorkerContextPacketCompactStrategyTypedMemoryReport)({
            groupIds: [groupId],
            strategyReport,
            generatedAt: "2026-07-09T20:50:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compact_strategy_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_compact_strategy_typed_memory") || {};
        const { buildGroupTypedMemoryRecall, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const referenceDoc = (docs || []).find((item) => item.relPath === "worker-context-compact-strategy-memory.md") || {};
        const cautionDoc = (docs || []).find((item) => item.relPath === "worker-context-compact-strategy-cautions.md") || {};
        const recall = buildGroupTypedMemoryRecall(groupId, "COMPACT_STRATEGY_TYPED_MEMORY metadata_partial_compact dependencies free_token_delta task_hash_unchanged constraints_and_documents", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = [
            ...(Array.isArray(recall.recalled) ? recall.recalled : []),
            ...(Array.isArray(recall.entries) ? recall.entries : []),
            ...(Array.isArray(recall.selected) ? recall.selected : []),
            ...(Array.isArray(recall.docs) ? recall.docs : []),
        ].map((item) => `${item.relPath || ""}\n${item.name || ""}\n${item.body || ""}\n${item.snippet || ""}\n${item.text || ""}`).join("\n");
        const archive = ledger.compactStrategyArchive || {};
        const referenceText = String(referenceDoc.body || "");
        const cautionText = String(cautionDoc.body || "");
        const checks = {
            strategyReportReady: strategyReport.overall?.status === "ok"
                && Number(strategyReport.overall?.distilledOutcomeCount || 0) === 2
                && Number(strategyReport.overall?.strategyMemoryCount || 0) === 1,
            typedMemoryReportPasses: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.typedDocCount || 0) >= 2
                && Number(typedReport.overall?.archivedOutcomeCount || 0) === 2
                && Number(typedReport.overall?.recallMatchCount || 0) >= 1,
            qualityCheckExposesTypedMemory: qualityCheck.status === "ok"
                && Number(qualityCheck.passed || 0) === 1,
            ledgerArchivesCompactStrategy: archive.schema === "ccm-compact-strategy-typed-memory-distillation-v1"
                && Number(archive.outcome_count || 0) === 2
                && Number(archive.category_count || 0) >= 2
                && (archive.preferred_categories || []).includes("dependencies")
                && Number(archive.blocked_outcome_count || 0) === 1,
            referenceDocContainsStrategy: referenceText.includes("WorkerContextPacket Compact Strategy Memory")
                && referenceText.includes("dependencies")
                && referenceText.includes("free_token_delta")
                && referenceText.includes("task_hash_unchanged"),
            cautionDocContainsBlockedCategory: cautionText.includes("WorkerContextPacket Compact Strategy Cautions")
                && cautionText.includes("constraints_and_documents")
                && cautionText.includes("blocked"),
            recallFindsCompactStrategyMemory: /worker-context-compact-strategy-memory\.md|metadata_partial_compact|free_token_delta|task_hash_unchanged/i.test(recallText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: typedReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            docs: [referenceDoc, cautionDoc].filter((item) => item.relPath).map((item) => ({ relPath: item.relPath, source: item.source, type: item.type })),
        };
    }
    finally {
        for (const file of [outcomeFile, `${outcomeFile}.bak`, strategyFile, `${strategyFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest() {
    const groupId = `memory-center-worker-context-ptl-emergency-downgrade-selftest-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const strategyFile = (0, memory_control_center_1.getGroupWorkerContextCompactStrategyMemoryFile)(groupId);
    const ptlFile = (0, memory_control_center_1.getGroupWorkerContextPtlEmergencyHintFile)(groupId);
    try {
        const policy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T16:30:03.000Z",
            entries: [0, 1, 2].map((index) => ({
                schema: "ccm-worker-context-compact-outcome-entry-v1",
                outcome_id: `wcco-center-ptl-blocked-${index}`,
                group_id: groupId,
                assignment_id: `assignment-center-ptl-blocked-${index}`,
                method: "metadata_partial_compact_then_deterministic_head_tail_critical_lines",
                status: "blocked",
                dispatch_ready: false,
                from_total_tokens: 8800 + index,
                retry_total_tokens: 7600 + index,
                from_free_tokens: -5200,
                retry_free_tokens: -4000,
                token_delta: 1200,
                free_token_delta: 1200,
                partial_compact: true,
                task_compacted: index === 2,
                task_hash_unchanged: index !== 2,
                partial_compaction_categories: ["constraints_and_documents"],
                partial_compact_policy: policy,
                partial_omitted_chars: 1500,
                distillation_candidate: true,
                at: `2026-07-09T16:30:0${index}.000Z`,
            })),
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPtlEmergencyDowngradeReport)({ groupIds: [groupId], generatedAt: "2026-07-09T16:30:04.000Z" });
        const hint = (0, memory_control_center_1.readGroupWorkerContextPtlEmergencyHint)(groupId);
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketPtlEmergencyDowngrade)({ groupIds: [groupId], generatedAt: "2026-07-09T16:30:04.000Z" });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_ptl_emergency_downgrade"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_ptl_emergency_downgrade") || {};
        const groupRow = report.groups?.[0] || {};
        const checks = {
            reportEngagesPtlEmergency: report.overall?.status === "ok"
                && Number(report.overall?.engagedCount || 0) === 1
                && Number(report.overall?.criticalCount || 0) === 1
                && Number(report.overall?.blockedOutcomeCount || 0) === 3,
            hintSidecarCreated: fs.existsSync(ptlFile)
                && hint.schema === "ccm-worker-context-ptl-emergency-hint-v1"
                && hint.engaged === true
                && hint.emergency_level === "critical",
            hintCarriesDowngradeBudgets: Number(hint.recommended_retry_options?.maxTaskChars || 0) === 1400
                && Number(hint.recommended_retry_options?.metadata?.maxStringChars || 0) === 100,
            qualityCheckCoversPtlEmergency: quality.id === "worker_context_packet_ptl_emergency_downgrade"
                && quality.status === "ok"
                && qualityCheck.status === "ok",
            reportRowCarriesPtl: groupRow.engaged === true
                && groupRow.emergencyLevel === "critical"
                && Number(groupRow.taskCompactedBlockedCount || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            hint: {
                engaged: hint.engaged,
                emergency_level: hint.emergency_level,
                blocked_outcome_count: hint.blocked_outcome_count,
                maxTaskChars: hint.recommended_retry_options?.maxTaskChars || 0,
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [outcomeFile, `${outcomeFile}.bak`, strategyFile, `${strategyFile}.bak`, ptlFile, `${ptlFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest() {
    const groupId = `memory-center-worker-context-ptl-emergency-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const strategyFile = (0, memory_control_center_1.getGroupWorkerContextCompactStrategyMemoryFile)(groupId);
    const ptlFile = (0, memory_control_center_1.getGroupWorkerContextPtlEmergencyHintFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const policy = {
            schema: "ccm-worker-context-partial-compact-policy-v1",
            method: "usage_top_category_pressure",
            selected_categories: ["constraints_and_documents"],
            skipped_categories: ["dependencies"],
            max_categories: 1,
            fallback_used: false,
        };
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            updatedAt: "2026-07-09T21:30:03.000Z",
            entries: [0, 1, 2].map((index) => ({
                schema: "ccm-worker-context-compact-outcome-entry-v1",
                outcome_id: `wcco-center-ptl-typed-blocked-${index}`,
                group_id: groupId,
                assignment_id: `assignment-center-ptl-typed-blocked-${index}`,
                method: "metadata_partial_compact_then_deterministic_head_tail_critical_lines",
                status: "blocked",
                dispatch_ready: false,
                from_total_tokens: 8800 + index,
                retry_total_tokens: 7600 + index,
                from_free_tokens: -5200,
                retry_free_tokens: -4000,
                token_delta: 1200,
                free_token_delta: 1200,
                partial_compact: true,
                task_compacted: index === 2,
                task_hash_unchanged: index !== 2,
                partial_compaction_categories: ["constraints_and_documents"],
                partial_compact_policy: policy,
                partial_omitted_chars: 1500,
                distillation_candidate: true,
                at: `2026-07-09T21:30:0${index}.000Z`,
            })),
        });
        const ptlReport = (0, memory_control_center_1.buildWorkerContextPacketPtlEmergencyDowngradeReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T21:30:04.000Z",
        });
        const typedReport = (0, memory_control_center_1.buildWorkerContextPacketPtlEmergencyTypedMemoryReport)({
            groupIds: [groupId],
            ptlReport,
            generatedAt: "2026-07-09T21:30:05.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_ptl_emergency_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_ptl_emergency_typed_memory") || {};
        const { buildGroupTypedMemoryRecall, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const doc = (docs || []).find((item) => item.relPath === "worker-context-ptl-emergency-downgrade.md") || {};
        const recall = buildGroupTypedMemoryRecall(groupId, "PTL_EMERGENCY_TYPED_MEMORY maxTaskChars maxRenderedChars repeated compact failure task_compacted blocked outcomes", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = [
            ...(Array.isArray(recall.recalled) ? recall.recalled : []),
            ...(Array.isArray(recall.entries) ? recall.entries : []),
            ...(Array.isArray(recall.selected) ? recall.selected : []),
            ...(Array.isArray(recall.docs) ? recall.docs : []),
        ].map((item) => `${item.relPath || ""}\n${item.name || ""}\n${item.body || ""}\n${item.snippet || ""}\n${item.text || ""}`).join("\n");
        const archive = ledger.ptlEmergencyArchive || {};
        const docText = String(doc.body || "");
        const checks = {
            ptlReportReady: ptlReport.overall?.status === "ok"
                && Number(ptlReport.overall?.engagedCount || 0) === 1
                && Number(ptlReport.overall?.criticalCount || 0) === 1
                && Number(ptlReport.overall?.blockedOutcomeCount || 0) === 3,
            typedMemoryReportPasses: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.typedDocCount || 0) === 1
                && Number(typedReport.overall?.blockedOutcomeCount || 0) >= 3
                && Number(typedReport.overall?.recallMatchCount || 0) >= 1,
            qualityCheckExposesTypedMemory: qualityCheck.status === "ok"
                && Number(qualityCheck.passed || 0) === 1,
            ledgerArchivesPtlEmergency: archive.schema === "ccm-ptl-emergency-typed-memory-distillation-v1"
                && archive.engaged === true
                && archive.emergency_level === "critical"
                && Number(archive.blocked_outcome_count || 0) >= 3
                && Number(archive.task_compacted_blocked_count || 0) >= 1,
            typedDocContainsEmergencyBudgets: docText.includes("PTL Emergency Downgrade")
                && docText.includes("maxTaskChars=1400")
                && docText.includes("memory.maxRenderedChars=900")
                && docText.includes("metadata.maxCategories=1"),
            typedDocContainsFailureSignals: docText.includes("Blocked outcomes")
                && docText.includes("task_compacted=true")
                && docText.includes("constraints_and_documents"),
            recallFindsPtlEmergencyDiscipline: /worker-context-ptl-emergency-downgrade\.md|PTL emergency|maxTaskChars|maxRenderedChars|task_compacted/i.test(recallText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: typedReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            doc: {
                relPath: doc.relPath || "",
                source: doc.source || "",
                type: doc.type || "",
            },
        };
    }
    finally {
        for (const file of [outcomeFile, `${outcomeFile}.bak`, strategyFile, `${strategyFile}.bak`, ptlFile, `${ptlFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest() {
    const groupId = `memory-center-worker-context-ignore-memory-policy-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const memoryPolicy = {
            schema: "ccm-worker-context-memory-policy-v1",
            ignored: true,
            use: "must_not_use_group_memory",
            reason: "user_requested_ignore_memory",
            priority: "user_ignore_memory_request_over_platform_memory",
            boundary: "current_worker_context_packet",
            receipt_required: true,
        };
        const acceptance = {
            ack_required_before_implementation: true,
            receipt_required: true,
            actual_diff_required: true,
            verification_required: true,
            memory_ignored_receipt_required: true,
            contract_injection_receipt_required: false,
            replay_repair_dispatch_brief_receipt_required: false,
        };
        const memoryProof = {
            schema: "ccm-worker-context-memory-reinjection-proof-v1",
            packet_id: "wcp-ignore-memory-policy-selftest",
            project: "frontend",
            memory_present: false,
            memory_ignored: true,
            memory_policy_reason: "user_requested_ignore_memory",
            rendered_memory_present: false,
            source_schema: "",
            group_id: groupId,
            target_project: "frontend",
            packet_memory_hash: "",
            packet_memory_chars: 0,
            rendered_memory_hash: "",
            rendered_memory_chars: 0,
            memory_first: false,
            status: "ignored_by_policy",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-ignore-memory-policy-selftest",
            project: "frontend",
            task_id: "ignore-memory-policy-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 820,
            total_chars: 2460,
            free_tokens: 2880,
            pressure: 20.5,
            status: "ok",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 120, chars: 360, required: true, included: true },
                { id: "memory_policy", name: "Memory policy", tokens: 160, chars: 480, source: "memory-policy", required: true, included: true },
                { id: "memory_reinjection_proof", name: "Memory reinjection proof", tokens: 100, chars: 300, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 140, chars: 420, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 2880, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "memory_policy", name: "Memory policy", tokens: 160, chars: 480 },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 140, chars: 420 },
            ],
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T17:10:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:ignore-memory-policy-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "frontend",
                    assignment_id: "assignment-ignore-memory-policy-selftest",
                    dispatch_key: "dispatch-ignore-memory-policy-selftest",
                    task_fingerprint: "ignore-memory-policy-selftest",
                    worker_context_packet_id: "wcp-ignore-memory-policy-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_memory_policy: memoryPolicy,
                    worker_context_packet_acceptance: acceptance,
                    worker_context_packet_memory_reinjection_proof: memoryProof,
                    worker_context_pre_dispatch_gate: {
                        schema: "ccm-worker-context-pre-dispatch-gate-v1",
                        gate_id: "worker-context-pre-dispatch:ignore-memory-policy-selftest",
                        assignment_id: "assignment-ignore-memory-policy-selftest",
                        dispatch_key: "dispatch-ignore-memory-policy-selftest",
                        project: "frontend",
                        worker_context_packet_id: "wcp-ignore-memory-policy-selftest",
                        usage_status: "ok",
                        pressure_status: "ok",
                        dispatch_ready: true,
                        dispatchReady: true,
                        blocked: false,
                        compact_recommended: false,
                        must_repair_before_dispatch: false,
                        next_step: "dispatch_child_agent",
                        total_tokens: 820,
                        max_tokens: 4000,
                        free_tokens: 2880,
                        pressure: 20.5,
                        autocompact_buffer_tokens: 300,
                        generated_at: "2026-07-09T17:10:00.000Z",
                    },
                    worker_context_packet_render_probe: {
                        packet_id: "wcp-ignore-memory-policy-selftest",
                        rendered_flags: {
                            has_context_usage_budget: true,
                            has_worker_context_packet: true,
                            has_platform_memory: false,
                            has_memory_policy: true,
                            has_memory_ignored_policy: true,
                            has_memory_reinjection_proof: true,
                            has_memory_compaction_hash: false,
                            has_memory_context_compact_marker: false,
                            has_partial_compaction: false,
                        },
                        rendered_excerpt: "WorkerContextPacket: wcp-ignore-memory-policy-selftest\nMemory policy：ignored；reason=user_requested_ignore_memory；use=must_not_use_group_memory\nCCM_AGENT_RECEIPT.memoryIgnored must be present\nMemory reinjection proof：ignored_by_policy",
                    },
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T17:10:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryPolicyReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketIgnoreMemoryPolicy)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_ignore_memory_policy"],
            groupIds: [groupId],
            refresh: true,
        });
        const proofReport = (0, memory_control_center_1.buildWorkerContextPacketMemoryReinjectionProofReport)({ groupIds: [groupId] });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_ignore_memory_policy") || {};
        const policyRow = (report.groups?.[0]?.policies || [])[0] || {};
        const checks = {
            reportCoversIgnorePolicy: report.overall?.status === "ok"
                && Number(report.overall?.ignoredPolicyBindingCount || 0) === 1
                && Number(report.overall?.validIgnoredPolicyCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            reportRequiresReceiptAndProof: Number(report.overall?.receiptRequiredCount || 0) === 1
                && Number(report.overall?.ignoredProofCount || 0) === 1
                && Number(report.overall?.usagePolicyCategoryCount || 0) === 1
                && Number(report.overall?.renderedIgnoredPolicyCount || 0) === 1,
            qualityCheckExposesIgnorePolicy: quality.id === "worker_context_packet_ignore_memory_policy"
                && quality.status === "ok"
                && qualityCheck.status === "ok",
            reinjectionProofAcceptsIgnoredByPolicy: proofReport.overall?.status === "ok"
                && Number(proofReport.overall?.ignoredByPolicyCount || 0) === 1
                && Number(proofReport.overall?.metadataGapCount || 0) === 0,
            policyRowCarriesReason: policyRow.ignored === true
                && policyRow.use === "must_not_use_group_memory"
                && policyRow.reason === "user_requested_ignore_memory"
                && policyRow.receipt_required === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            proofReport: proofReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest() {
    const groupId = `memory-center-worker-context-ignore-memory-receipt-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    try {
        const memoryPolicy = {
            schema: "ccm-worker-context-memory-policy-v1",
            ignored: true,
            use: "must_not_use_group_memory",
            reason: "user_requested_ignore_memory",
            priority: "user_ignore_memory_request_over_platform_memory",
            boundary: "current_worker_context_packet",
            receipt_required: true,
        };
        const acceptance = {
            ack_required_before_implementation: true,
            receipt_required: true,
            actual_diff_required: true,
            verification_required: true,
            memory_ignored_receipt_required: true,
            contract_injection_receipt_required: false,
            replay_repair_dispatch_brief_receipt_required: false,
        };
        const proof = {
            schema: "ccm-worker-context-memory-reinjection-proof-v1",
            packet_id: "wcp-ignore-memory-receipt-selftest",
            project: "frontend",
            memory_present: false,
            memory_ignored: true,
            memory_policy_reason: "user_requested_ignore_memory",
            rendered_memory_present: false,
            group_id: groupId,
            target_project: "frontend",
            packet_memory_hash: "",
            packet_memory_chars: 0,
            rendered_memory_hash: "",
            rendered_memory_chars: 0,
            status: "ignored_by_policy",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-ignore-memory-receipt-selftest",
            project: "frontend",
            task_id: "ignore-memory-receipt-task",
            max_tokens: 4000,
            autocompact_buffer_tokens: 300,
            total_tokens: 760,
            free_tokens: 2940,
            pressure: 19,
            status: "ok",
            categories: [
                { id: "task_goal", tokens: 120, chars: 360, required: true, included: true },
                { id: "memory_policy", tokens: 160, chars: 480, source: "memory-policy", required: true, included: true },
                { id: "memory_reinjection_proof", tokens: 100, chars: 300, required: true, included: true },
                { id: "verification_and_acceptance", tokens: 140, chars: 420, required: true, included: true },
                { id: "free_space", tokens: 2940, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
        };
        const baseEntry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "worker-context-packet-assignment:ignore-memory-receipt-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "frontend",
            assignment_id: "assignment-ignore-memory-receipt-selftest",
            dispatch_key: "dispatch-ignore-memory-receipt-selftest",
            task_fingerprint: "ignore-memory-receipt-selftest",
            worker_context_packet_id: "wcp-ignore-memory-receipt-selftest",
            worker_context_packet_context_usage: usage,
            worker_context_packet_memory_policy: memoryPolicy,
            worker_context_packet_acceptance: acceptance,
            worker_context_packet_memory_reinjection_proof: proof,
            worker_context_packet_render_probe: {
                packet_id: "wcp-ignore-memory-receipt-selftest",
                rendered_flags: {
                    has_context_usage_budget: true,
                    has_worker_context_packet: true,
                    has_memory_policy: true,
                    has_memory_ignored_policy: true,
                    has_memory_reinjection_proof: true,
                },
            },
            dispatch_ready: true,
            dispatchReady: true,
            should_create_real_task: true,
            at: "2026-07-09T17:40:00.000Z",
        };
        const writeLedger = (entry) => (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T17:40:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            entries: [entry],
        });
        writeLedger(baseEntry);
        const missingComplianceReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptComplianceReport)({ groupIds: [groupId] });
        const missingRepairReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T17:40:01.000Z",
        });
        const missingRepairQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_ignore_memory_receipt_repair_work_items"],
            groupIds: [groupId],
            refresh: true,
        });
        const missingRepairQualityCheck = (missingRepairQuality.checks || []).find((item) => item.id === "worker_context_packet_ignore_memory_receipt_repair_work_items") || {};
        const missingLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const openRepairItem = (missingLedger.items || []).find((item) => item.source === "worker_context_ignore_memory_receipt_repair" && (0, memory_control_center_1.replayRepairWorkItemOpen)(item.status)) || {};
        writeLedger({
            ...baseEntry,
            worker_context_packet_receipt: {
                agent: "frontend",
                status: "done",
                worker_context_packet_id: "wcp-ignore-memory-receipt-selftest",
                memoryIgnored: ["user_requested_ignore_memory; must_not_use_group_memory; platform/group/typed/global memory treated as empty"],
                memoryUsed: [],
                summary: "只使用当前任务文本和实时检查证据。",
            },
            receipt_status: "done",
        });
        const resolvedComplianceReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptComplianceReport)({ groupIds: [groupId] });
        const resolvedRepairReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T17:40:02.000Z",
        });
        const resolvedComplianceQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_ignore_memory_receipt_compliance"],
            groupIds: [groupId],
            refresh: true,
        });
        const resolvedComplianceQualityCheck = (resolvedComplianceQuality.checks || []).find((item) => item.id === "worker_context_packet_ignore_memory_receipt_compliance") || {};
        const resolvedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedRepairItem = (resolvedLedger.items || []).find((item) => item.source === "worker_context_ignore_memory_receipt_repair") || {};
        const checks = {
            missingComplianceDetectsGap: missingComplianceReport.overall?.status === "fail"
                && (Number(missingComplianceReport.overall?.missingReceiptCount || 0) + Number(missingComplianceReport.overall?.missingMemoryIgnoredCount || 0)) >= 1
                && Number(missingComplianceReport.overall?.metadataGapCount || 0) === 1,
            missingGapCreatesRepairItem: missingRepairReport.overall?.status === "ok"
                && Number(missingRepairReport.overall?.requiredActionCount || 0) === 1
                && Number(missingRepairReport.overall?.currentOpenItemCount || 0) === 1
                && openRepairItem.source === "worker_context_ignore_memory_receipt_repair"
                && openRepairItem.component === "worker_context_ignore_memory_receipt_contract",
            repairQualityCheckCoversGap: missingRepairQualityCheck.status === "ok"
                && Number(missingRepairQualityCheck.checked || 0) === 1
                && Number(missingRepairQualityCheck.passed || 0) === 1,
            resolvedCompliancePasses: resolvedComplianceReport.overall?.status === "ok"
                && Number(resolvedComplianceReport.overall?.compliantReceiptCount || 0) === 1
                && Number(resolvedComplianceReport.overall?.metadataGapCount || 0) === 0
                && resolvedComplianceQualityCheck.status === "ok",
            resolvedRepairItemClosed: resolvedRepairReport.overall?.status === "ok"
                && Number(resolvedRepairReport.overall?.requiredActionCount || 0) === 0
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(completedRepairItem.status) === "completed"
                && completedRepairItem.resolutionReason === "worker_context_ignore_memory_receipt_compliant",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            missingComplianceReport: missingComplianceReport.overall,
            missingRepairReport: missingRepairReport.overall,
            resolvedComplianceReport: resolvedComplianceReport.overall,
            resolvedRepairReport: resolvedRepairReport.overall,
            repairItem: {
                id: completedRepairItem.id || openRepairItem.id || "",
                status: completedRepairItem.status || openRepairItem.status || "",
                source: completedRepairItem.source || openRepairItem.source || "",
                component: completedRepairItem.component || openRepairItem.component || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest() {
    const groupId = `memory-center-worker-context-ignore-memory-receipt-dispatch-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    try {
        const entry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "worker-context-packet-assignment:ignore-memory-receipt-dispatch-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "frontend",
            assignment_id: "assignment-ignore-memory-receipt-dispatch-selftest",
            dispatch_key: "dispatch-ignore-memory-receipt-dispatch-selftest",
            task_fingerprint: "ignore-memory-receipt-dispatch-selftest",
            worker_context_packet_id: "wcp-ignore-memory-receipt-dispatch-selftest",
            worker_context_packet_memory_policy: {
                schema: "ccm-worker-context-memory-policy-v1",
                ignored: true,
                use: "must_not_use_group_memory",
                reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_platform_memory",
                receipt_required: true,
            },
            worker_context_packet_acceptance: {
                ack_required_before_implementation: true,
                receipt_required: true,
                actual_diff_required: true,
                verification_required: true,
                memory_ignored_receipt_required: true,
            },
            worker_context_packet_memory_reinjection_proof: {
                schema: "ccm-worker-context-memory-reinjection-proof-v1",
                packet_id: "wcp-ignore-memory-receipt-dispatch-selftest",
                project: "frontend",
                memory_present: false,
                memory_ignored: true,
                memory_policy_reason: "user_requested_ignore_memory",
                status: "ignored_by_policy",
            },
            worker_context_packet_render_probe: {
                packet_id: "wcp-ignore-memory-receipt-dispatch-selftest",
                rendered_flags: {
                    has_memory_policy: true,
                    has_memory_ignored_policy: true,
                    has_memory_reinjection_proof: true,
                },
            },
            dispatch_ready: true,
            should_create_real_task: true,
            at: "2026-07-09T18:10:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T18:10:00.000Z",
            bindingCount: 1,
            entries: [entry],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T18:10:01.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-09T18:10:02.000Z",
        });
        const candidateQuality = (0, memory_control_center_1.evaluateWorkerContextPacketIgnoreMemoryReceiptRepairDispatchCandidates)({
            groupIds: [groupId],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-09T18:10:03.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-09T18:10:04.000Z",
        });
        const briefQuality = (0, memory_control_center_1.evaluateWorkerContextPacketIgnoreMemoryReceiptRepairDispatchBriefs)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-09T18:10:05.000Z",
        });
        const candidate = candidateReport.groups?.[0]?.candidates?.[0] || {};
        const dispatchPlanLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const brief = (dispatchPlanLedger.briefs || []).find((item) => (0, memory_control_center_1.isWorkerContextIgnoreMemoryReceiptRepairSource)(item.source)) || briefReport.groups?.[0]?.briefs?.[0] || {};
        const workerTask = String(brief.worker_task || "");
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "frontend",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: "ignore-memory receipt repair dispatch selftest", currentPhase: "test" },
                    compaction: {
                        replayRepairDispatchCandidates: {
                            schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
                            candidateCount: 1,
                            readyCount: 1,
                            dispatchMarkedCount: 0,
                            shouldCreateRealTask: false,
                            file: workItemsFile,
                            candidates: [candidate],
                        },
                    },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const checks = {
            repairItemCreated: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.requiredActionCount || 0) === 1
                && Number(repairReport.overall?.currentOpenItemCount || 0) === 1,
            repairItemBecomesDispatchCandidate: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) === 1
                && Number(candidateReport.overall?.coveredCandidateCount || 0) === 1
                && candidate.source === "worker_context_ignore_memory_receipt_repair"
                && candidate.worker_context_packet_id === "wcp-ignore-memory-receipt-dispatch-selftest"
                && /memoryIgnored/i.test(String(candidate.prompt_patch || "")),
            candidateQualityCheckPasses: candidateQuality.id === "worker_context_packet_ignore_memory_receipt_repair_dispatch_candidates"
                && candidateQuality.status === "ok"
                && Number(candidateQuality.passed || 0) === 1,
            correctedReceiptBriefCreated: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) === 1
                && Number(briefReport.overall?.coveredBriefCount || 0) === 1
                && brief.source === "worker_context_ignore_memory_receipt_repair"
                && brief.worker_context_packet_id === "wcp-ignore-memory-receipt-dispatch-selftest"
                && /CCM_AGENT_RECEIPT/i.test(workerTask)
                && /memoryIgnored/i.test(workerTask)
                && /user_requested_ignore_memory|must_not_use_group_memory/i.test(workerTask),
            briefQualityCheckPasses: briefQuality.id === "worker_context_packet_ignore_memory_receipt_repair_dispatch_briefs"
                && briefQuality.status === "ok"
                && Number(briefQuality.passed || 0) === 1,
            renderedContextMentionsIgnoreMemoryCandidate: rendered.includes("Main Agent replay repair dispatch candidates")
                && rendered.includes("wcp-ignore-memory-receipt-dispatch-selftest")
                && rendered.includes("memoryPolicy=user_requested_ignore_memory"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repairReport: repairReport.overall,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            candidate: {
                work_item_id: candidate.work_item_id || "",
                source: candidate.source || "",
                worker_context_packet_id: candidate.worker_context_packet_id || "",
                memory_policy_reason: candidate.worker_context_packet_memory_policy_reason || "",
            },
            brief: {
                brief_id: brief.brief_id || "",
                source: brief.source || "",
                worker_context_packet_id: brief.worker_context_packet_id || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`, dispatchPlanFile, `${dispatchPlanFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest() {
    const groupId = `memory-center-worker-context-ignore-memory-receipt-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T18:40:00.000Z",
            bindingCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:ignore-memory-receipt-typed-memory-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "frontend",
                    assignment_id: "assignment-ignore-memory-receipt-typed-memory-selftest",
                    dispatch_key: "dispatch-ignore-memory-receipt-typed-memory-selftest",
                    task_fingerprint: "ignore-memory-receipt-typed-memory-selftest",
                    worker_context_packet_id: "wcp-ignore-memory-receipt-typed-memory-selftest",
                    worker_context_packet_memory_policy: {
                        schema: "ccm-worker-context-memory-policy-v1",
                        ignored: true,
                        use: "must_not_use_group_memory",
                        reason: "user_requested_ignore_memory",
                        receipt_required: true,
                    },
                    worker_context_packet_acceptance: {
                        receipt_required: true,
                        memory_ignored_receipt_required: true,
                    },
                    worker_context_packet_memory_reinjection_proof: {
                        schema: "ccm-worker-context-memory-reinjection-proof-v1",
                        packet_id: "wcp-ignore-memory-receipt-typed-memory-selftest",
                        project: "frontend",
                        memory_present: false,
                        memory_ignored: true,
                        memory_policy_reason: "user_requested_ignore_memory",
                        status: "ignored_by_policy",
                    },
                    worker_context_packet_render_probe: {
                        packet_id: "wcp-ignore-memory-receipt-typed-memory-selftest",
                        rendered_flags: {
                            has_memory_policy: true,
                            has_memory_ignored_policy: true,
                            has_memory_reinjection_proof: true,
                        },
                    },
                    dispatch_ready: true,
                    should_create_real_task: true,
                    at: "2026-07-09T18:40:00.000Z",
                }],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T18:40:01.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-09T18:40:02.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-09T18:40:03.000Z",
        });
        const typedReport = (0, memory_control_center_1.buildWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemoryReport)({
            groupIds: [groupId],
            repairWorkItemReport: repairReport,
            candidateReport,
            briefReport,
            generatedAt: "2026-07-09T18:40:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_ignore_memory_receipt_repair_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_ignore_memory_receipt_repair_typed_memory") || {};
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, buildGroupTypedMemoryRecall, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const doc = (docs || []).find((item) => item.source === "auto:ignore-memory-receipt-repair-distillation") || {};
        const recall = buildGroupTypedMemoryRecall(groupId, "IGNORE_MEMORY_RECEIPT_TYPED_MEMORY user_requested_ignore_memory memoryIgnored memoryUsed must_not_use_group_memory", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const recallText = [
            ...(Array.isArray(recall.recalled) ? recall.recalled : []),
            ...(Array.isArray(recall.entries) ? recall.entries : []),
            ...(Array.isArray(recall.selected) ? recall.selected : []),
            ...(Array.isArray(recall.docs) ? recall.docs : []),
        ].map((item) => `${item.name || ""}\n${item.body || ""}\n${item.snippet || ""}\n${item.text || ""}`).join("\n");
        const checks = {
            repairDispatchChainReady: repairReport.overall?.status === "ok"
                && candidateReport.overall?.status === "ok"
                && briefReport.overall?.status === "ok",
            typedMemoryReportPasses: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.typedMemoryDocCount || 0) >= 1
                && Number(typedReport.overall?.archivedCount || 0) >= 1
                && Number(typedReport.overall?.recallMatchCount || 0) >= 1,
            qualityCheckExposesTypedMemory: qualityCheck.status === "ok"
                && Number(qualityCheck.passed || 0) === 1,
            ledgerArchivesIgnoreMemoryRows: ledger.ignoreMemoryReceiptRepairArchive?.schema === "ccm-ignore-memory-receipt-repair-distillation-v1"
                && Number(ledger.ignoreMemoryReceiptRepairArchive?.archived_count || 0) >= 1
                && Number(ledger.ignoreMemoryReceiptRepairArchive?.corrected_prompt_count || 0) >= 1,
            typedDocContainsReceiptDiscipline: String(doc.body || "").includes("memoryIgnored")
                && String(doc.body || "").includes("memoryUsed")
                && /user_requested_ignore_memory|must_not_use_group_memory/i.test(String(doc.body || "")),
            recallFindsIgnoreMemoryDiscipline: /memoryIgnored|user_requested_ignore_memory|must_not_use_group_memory/i.test(recallText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: typedReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            doc: {
                relPath: doc.relPath || "",
                source: doc.source || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`, dispatchPlanFile, `${dispatchPlanFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketCompactHookLedgerSelfTest() {
    const groupId = `memory-center-worker-context-compact-hook-ledger-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const hookFile = (0, memory_control_center_1.getGroupWorkerContextCompactHookLedgerFile)(groupId);
    try {
        const hookRunId = "wcch-memory-center-selftest";
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:compact-hook-ledger-selftest",
            method: "memory_first_deterministic_context_compaction",
            status: "recovered",
            from_packet_id: "wcp-hook-before-selftest",
            retry_packet_id: "wcp-hook-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 6200,
            from_max_tokens: 4000,
            from_free_tokens: -2500,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 4000,
            retry_free_tokens: 1100,
            compact_hook_run_id: hookRunId,
            memory_first: true,
            memory_compaction: {
                schema: "ccm-worker-context-memory-first-compaction-v1",
                method: "memory_fields_head_tail_and_recall_limit",
                status: "compacted",
                original_memory_hash: "original-memory-hook-selftest",
                compacted_memory_hash: "compacted-memory-hook-selftest",
                original_memory_chars: 24000,
                compacted_memory_chars: 3200,
                omitted_chars: 20800,
            },
            original_task_hash: "same-task-hash-selftest",
            compacted_task_hash: "same-task-hash-selftest",
            original_task_chars: 420,
            compacted_task_chars: 420,
            omitted_chars: 20800,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T12:30:00.000Z",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-hook-after-selftest",
            project: "api",
            task_id: "compact-hook-ledger-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 2600,
            total_chars: 7800,
            free_tokens: 1100,
            pressure: 65,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 140, chars: 420, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 1100, chars: 3200, required: true, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 180, chars: 540, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1100, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:compact-hook-ledger-selftest",
            assignment_id: "assignment-compact-hook-ledger-selftest",
            dispatch_key: "dispatch-compact-hook-ledger-selftest",
            project: "api",
            worker_context_packet_id: "wcp-hook-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            compact_recommended: false,
            must_repair_before_dispatch: false,
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2600,
            max_tokens: 4000,
            free_tokens: 1100,
            pressure: 65,
            autocompact_buffer_tokens: 300,
            generated_at: "2026-07-09T12:30:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T12:30:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:compact-hook-ledger-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-compact-hook-ledger-selftest",
                    dispatch_key: "dispatch-compact-hook-ledger-selftest",
                    task_fingerprint: "compact-hook-ledger-selftest",
                    worker_context_packet_id: "wcp-hook-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_compact_hook_run_id: hookRunId,
                    worker_context_pre_dispatch_gate: gate,
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T12:30:00.000Z",
                }],
        });
        (0, memory_control_center_1.writeJsonAtomic)(hookFile, {
            schema: "ccm-worker-context-compact-hook-ledger-v1",
            version: 1,
            groupId,
            file: hookFile,
            updatedAt: "2026-07-09T12:30:01.000Z",
            entries: [
                {
                    schema: "ccm-worker-context-compact-hook-entry-v1",
                    entry_id: "wcch-pre-selftest",
                    hook_run_id: hookRunId,
                    group_id: groupId,
                    phase: "pre",
                    ok: true,
                    status: "ok",
                    assignment_id: "assignment-compact-hook-ledger-selftest",
                    dispatch_key: "dispatch-compact-hook-ledger-selftest",
                    project: "api",
                    from_packet_id: "wcp-hook-before-selftest",
                    retry_packet_id: "",
                    method: "worker_context_memory_first_retry",
                    memory_first: true,
                    initial_usage_status: "over_budget",
                    final_usage_status: "",
                    dispatch_ready: false,
                    result_summary: { total_tokens: 6200, max_tokens: 4000, memory_present: true },
                    at: "2026-07-09T12:30:00.000Z",
                },
                {
                    schema: "ccm-worker-context-compact-hook-entry-v1",
                    entry_id: "wcch-post-selftest",
                    hook_run_id: hookRunId,
                    group_id: groupId,
                    phase: "post",
                    ok: true,
                    status: "ok",
                    assignment_id: "assignment-compact-hook-ledger-selftest",
                    dispatch_key: "dispatch-compact-hook-ledger-selftest",
                    project: "api",
                    from_packet_id: "wcp-hook-before-selftest",
                    retry_packet_id: "wcp-hook-after-selftest",
                    method: "memory_first_deterministic_context_compaction",
                    memory_first: true,
                    initial_usage_status: "over_budget",
                    final_usage_status: "warn",
                    dispatch_ready: true,
                    result_summary: { retry_status: "recovered", memory_reinjection_status: "compacted_reinjected", omitted_chars: 20800 },
                    at: "2026-07-09T12:30:01.000Z",
                },
            ],
            stats: { total: 2, ok: 2, failed: 0, pre: { total: 1, ok: 1, failed: 0 }, post: { total: 1, ok: 1, failed: 0 } },
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCompactHookLedgerReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketCompactHookLedger)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_compact_hook_ledger"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_compact_hook_ledger") || {};
        const hookRow = (report.groups?.[0]?.hooks || [])[0] || {};
        const checks = {
            reportAcceptsPrePostHookLedger: report.overall?.status === "ok"
                && Number(report.overall?.retryBindingCount || 0) === 1
                && Number(report.overall?.hookRunCount || 0) === 1
                && Number(report.overall?.preHookCount || 0) === 1
                && Number(report.overall?.postHookCount || 0) === 1
                && Number(report.overall?.memoryFirstHookCount || 0) === 1
                && Number(report.overall?.recoveredHookCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversCompactHookLedger: quality.id === "worker_context_packet_compact_hook_ledger"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok",
            hookRowBindsRetryToPrePost: hookRow.hook_run_id === hookRunId
                && Number(hookRow.pre_count || 0) === 1
                && Number(hookRow.post_count || 0) === 1
                && hookRow.post_dispatch_ready === true
                && hookRow.memory_first === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            hook: {
                hook_run_id: hookRow.hook_run_id || "",
                pre_count: hookRow.pre_count || 0,
                post_count: hookRow.post_count || 0,
                post_dispatch_ready: hookRow.post_dispatch_ready === true,
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, hookFile, `${hookFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketMemoryReinjectionProofSelfTest() {
    const groupId = `memory-center-worker-context-memory-reinjection-proof-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const memoryCompaction = {
            schema: "ccm-worker-context-memory-first-compaction-v1",
            method: "memory_fields_head_tail_and_recall_limit",
            status: "compacted",
            original_memory_hash: "original-memory-hash-selftest",
            compacted_memory_hash: "compacted-memory-hash-selftest",
            original_memory_chars: 24000,
            compacted_memory_chars: 3200,
            omitted_chars: 20800,
            max_rendered_chars: 900,
            max_recall_items: 3,
            preserves_schema: true,
        };
        const retry = {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: "worker-context-retry:memory-reinjection-proof-selftest",
            method: "memory_first_deterministic_context_compaction",
            status: "recovered",
            from_packet_id: "wcp-memory-reinjection-before-selftest",
            retry_packet_id: "wcp-memory-reinjection-after-selftest",
            from_usage_status: "over_budget",
            from_total_tokens: 6200,
            from_max_tokens: 4000,
            from_free_tokens: -2500,
            retry_usage_status: "warn",
            retry_total_tokens: 2600,
            retry_max_tokens: 4000,
            retry_free_tokens: 1100,
            memory_first: true,
            memory_compaction: memoryCompaction,
            original_task_hash: "same-task-hash-selftest",
            compacted_task_hash: "same-task-hash-selftest",
            original_task_chars: 420,
            compacted_task_chars: 420,
            omitted_chars: 20800,
            critical_line_count: 0,
            preserved_receipt_contract: true,
            recovered_dispatch_ready: true,
            generated_at: "2026-07-09T12:00:00.000Z",
        };
        const memoryProof = {
            schema: "ccm-worker-context-memory-reinjection-proof-v1",
            packet_id: "wcp-memory-reinjection-after-selftest",
            project: "api",
            memory_present: true,
            rendered_memory_present: true,
            source_schema: "ccm-group-memory-context-v1",
            group_id: groupId,
            target_project: "api",
            packet_memory_hash: "compacted-memory-hash-selftest",
            packet_memory_chars: 3200,
            rendered_memory_hash: "rendered-memory-hash-selftest",
            rendered_memory_chars: 1800,
            memory_first: true,
            compaction_retry_id: "worker-context-retry:memory-reinjection-proof-selftest",
            memory_compaction_schema: "ccm-worker-context-memory-first-compaction-v1",
            expected_compacted_memory_hash: "compacted-memory-hash-selftest",
            hash_matches_compaction: true,
            status: "compacted_reinjected",
        };
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-memory-reinjection-after-selftest",
            project: "api",
            task_id: "memory-reinjection-proof-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 4000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 300,
            total_tokens: 2600,
            total_chars: 7800,
            free_tokens: 1100,
            pressure: 65,
            status: "warn",
            compact_recommended: false,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 140, chars: 420, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 1100, chars: 3200, required: true, included: true },
                { id: "memory_reinjection_proof", name: "Memory reinjection proof", tokens: 120, chars: 360, required: true, included: true },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660, required: true, included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 180, chars: 540, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 1100, chars: 0, source: "budget", included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 300, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 1100, chars: 3200 },
                { id: "context_compaction_retry", name: "Context compaction retry", tokens: 220, chars: 660 },
            ],
        };
        const gate = {
            schema: "ccm-worker-context-pre-dispatch-gate-v1",
            gate_id: "worker-context-pre-dispatch:memory-reinjection-proof-selftest",
            assignment_id: "assignment-memory-reinjection-proof-selftest",
            dispatch_key: "dispatch-memory-reinjection-proof-selftest",
            project: "api",
            worker_context_packet_id: "wcp-memory-reinjection-after-selftest",
            usage_status: "warn",
            pressure_status: "warn",
            dispatch_ready: true,
            dispatchReady: true,
            blocked: false,
            compact_recommended: false,
            must_repair_before_dispatch: false,
            reason: "WorkerContextPacket recovered after memory-first deterministic retry.",
            repair_source: "",
            context_compaction_retry: retry,
            auto_retry_status: "recovered",
            next_step: "dispatch_child_agent",
            total_tokens: 2600,
            max_tokens: 4000,
            free_tokens: 1100,
            pressure: 65,
            autocompact_buffer_tokens: 300,
            generated_at: "2026-07-09T12:00:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T12:00:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            workerContextPacketBindingCount: 1,
            preDispatchGateCount: 1,
            blockedPreDispatchGateCount: 0,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "worker-context-packet-assignment:memory-reinjection-proof-selftest",
                    groupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: "api",
                    assignment_id: "assignment-memory-reinjection-proof-selftest",
                    dispatch_key: "dispatch-memory-reinjection-proof-selftest",
                    task_fingerprint: "memory-reinjection-proof-selftest",
                    worker_context_packet_id: "wcp-memory-reinjection-after-selftest",
                    worker_context_packet_context_usage: usage,
                    worker_context_packet_compaction_retry: retry,
                    worker_context_packet_memory_reinjection_proof: memoryProof,
                    worker_context_pre_dispatch_gate: gate,
                    worker_context_packet_render_probe: {
                        packet_id: "wcp-memory-reinjection-after-selftest",
                        rendered_flags: {
                            has_context_usage_budget: true,
                            has_worker_context_packet: true,
                            has_platform_memory: true,
                            has_memory_reinjection_proof: true,
                            has_memory_compaction_hash: true,
                            has_memory_context_compact_marker: true,
                        },
                        rendered_excerpt: "平台记忆\nMemory reinjection proof：compacted_reinjected；memory_hash=compacted-memory-hash-selftest",
                    },
                    dispatch_ready: true,
                    dispatchReady: true,
                    should_create_real_task: true,
                    at: "2026-07-09T12:00:00.000Z",
                }],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketMemoryReinjectionProofReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketMemoryReinjectionProof)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_memory_reinjection_proof"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_memory_reinjection_proof") || {};
        const proofRow = (report.groups?.[0]?.proofs || [])[0] || {};
        const checks = {
            reportAcceptsMemoryReinjectionProof: report.overall?.status === "ok"
                && Number(report.overall?.reinjectionBindingCount || 0) === 1
                && Number(report.overall?.memoryFirstCount || 0) === 1
                && Number(report.overall?.compactedReinjectionCount || 0) === 1
                && Number(report.overall?.hashMatchCount || 0) === 1
                && Number(report.overall?.renderedProofCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckCoversMemoryReinjectionProof: quality.id === "worker_context_packet_memory_reinjection_proof"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok",
            proofBindsRetryHashToRenderedPacket: proofRow.memory_first === true
                && proofRow.status === "compacted_reinjected"
                && proofRow.packet_memory_hash === "compacted-memory-hash-selftest"
                && proofRow.expected_compacted_memory_hash === "compacted-memory-hash-selftest"
                && proofRow.hash_matches_compaction === true
                && proofRow.rendered_memory_reinjection_proof === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            proof: {
                status: proofRow.status || "",
                memory_first: proofRow.memory_first === true,
                hash_matches_compaction: proofRow.hash_matches_compaction === true,
                rendered_memory_reinjection_proof: proofRow.rendered_memory_reinjection_proof === true,
            },
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineBindingSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-timeline-selftest-${process.pid}-${Date.now()}`;
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const assignmentBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    try {
        const { syncReplayRepairDispatchPlansForCoordinator, runCodedGroupOrchestrator, recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchTimelineBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const candidateSummary = {
            schema: "ccm-replay-repair-main-agent-dispatch-candidates-v1",
            groupId,
            file: "selftest-native-proof-repair-timeline",
            candidateCount: 1,
            openItemCount: 1,
            readyCount: 1,
            dispatchMarkedCount: 1,
            shouldCreateRealTask: false,
            candidates: [{
                    schema: "ccm-replay-repair-main-agent-dispatch-candidate-v1",
                    candidate_id: "replay-repair-dispatch:selftest-native-timeline",
                    work_item_id: "api-native-proof-repair:timeline-binding",
                    groupId,
                    status: "pending",
                    owner: "group-main-agent",
                    priority: "critical",
                    component: "api_microcompact_native_timeline_binding",
                    source: "api_microcompact_native_apply_binding_repair",
                    subject: "修复 native apply timeline binding",
                    targetProject: "api",
                    dispatch_target: "api",
                    repair_target: "request-timeline-binding",
                    instruction: "修复 API microcompact native_applied 强证明链，并把 brief 绑定到真实 task timeline、session、snapshot、execution、receipt。",
                    expected: "timelineBinding=true; taskSessionBound=true; memorySnapshotBound=true; executionBound=true; receiptBound=true",
                    proof_entry_id: "api_microcompact_native_apply_proof_timeline_binding",
                    plan_checksum: "plan-timeline-binding",
                    request_patch_checksum: "request-timeline-binding",
                    request_telemetry_status: "weak",
                    request_telemetry_source: "native_request_adapter",
                    request_telemetry_session_status: "missing_session",
                    request_telemetry_dispatch_status: "missing_execution",
                    runner_request_id: "runner-timeline-binding",
                    execution_id: "execution-timeline-binding",
                    recommendedAction: "main_agent_review_and_dispatch_to_child_agent",
                    shouldCreateRealTask: false,
                }],
        };
        const planLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, candidateSummary, { at: "2026-07-08T09:10:00.000Z" });
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_binding_repair") || {};
        const group = {
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
                { project: "api", agent: "claude-code" },
            ],
        };
        const result = runCodedGroupOrchestrator({
            group,
            message: [
                "请让 api 项目执行 native proof replay repair，并绑定真实执行时间线。",
                `必须使用 brief ${readyBrief.brief_id}，work item ${readyBrief.work_item_id}。`,
                "修复 request-timeline-binding 和 runner-timeline-binding 的 session/dispatch 绑定，并回写 CCM_AGENT_RECEIPT。",
            ].join("\n"),
            context: "Phase 94 selftest：验证 dispatch brief 到 timeline/session/snapshot/execution/receipt 的绑定。",
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const brief = assignment.replay_repair_dispatch_brief || readyBrief;
        const taskId = "task-timeline-binding";
        const sessionId = "tas-timeline-binding";
        const snapshotId = "tams-timeline-binding";
        const executionId = "execution-timeline-binding";
        for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
            recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                brief,
                task_id: taskId,
                project: "api",
                assignment_id: assignment.assignmentId || assignment.assignment_id || "",
                dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "",
                worker_context_packet_id: assignment.worker_context_packet?.packet_id || "",
                worker_handoff_id: "handoff-timeline-binding",
                memory_context_snapshot_id: snapshotId,
                memory_context_snapshot_checksum: "snapshot-checksum-timeline-binding",
                task_agent_session_id: sessionId,
                native_session_id: "native-timeline-binding",
                execution_id: executionId,
                receipt_status: "done",
                timeline_event: {
                    id: `tl-${eventType}`,
                    type: eventType,
                    at: "2026-07-08T09:11:00.000Z",
                },
            }, { at: "2026-07-08T09:11:00.000Z" });
        }
        const ledger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const binding = (ledger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const eventTypes = new Set((binding.event_types || []).map((item) => String(item || "")));
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairTimelineBindingReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairTimelineBindings)({ groupIds: [groupId] });
        const checks = {
            dispatchBriefReady: planLedger.readyCount === 1
                && readyBrief.request_patch_checksum === "request-timeline-binding"
                && readyBrief.runner_request_id === "runner-timeline-binding",
            assignmentCarriesBriefBinding: assignment.replay_repair_dispatch_brief?.brief_id === readyBrief.brief_id
                && assignment.worker_context_packet?.replay_repair_dispatch_briefs?.[0]?.brief_id === readyBrief.brief_id,
            timelineLedgerMergesRequiredEvents: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS.every(type => eventTypes.has(type))
                && (binding.event_refs || []).length >= memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS.length,
            timelineLedgerCarriesExecutionProof: binding.task_id === taskId
                && binding.task_agent_session_id === sessionId
                && binding.memory_context_snapshot_id === snapshotId
                && binding.execution_id === executionId
                && binding.runner_request_id === "runner-timeline-binding"
                && binding.receipt_status === "done",
            qualityCoversTimelineBinding: report.overall?.status === "ok"
                && Number(report.overall?.bindingCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0
                && Number(report.overall?.requiredEventCoverageCount || 0) === 1
                && quality.id === "api_microcompact_native_apply_proof_repair_timeline_bindings"
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            binding: {
                timeline_binding_id: binding.timeline_binding_id || "",
                brief_id: binding.brief_id || "",
                task_id: binding.task_id || "",
                assignment_id: binding.assignment_id || "",
                worker_context_packet_id: binding.worker_context_packet_id || "",
                task_agent_session_id: binding.task_agent_session_id || "",
                memory_context_snapshot_id: binding.memory_context_snapshot_id || "",
                execution_id: binding.execution_id || "",
                event_types: binding.event_types || [],
            },
        };
    }
    finally {
        for (const file of [
            dispatchPlanFile,
            `${dispatchPlanFile}.bak`,
            assignmentBindingFile,
            `${assignmentBindingFile}.bak`,
            timelineBindingFile,
            `${timelineBindingFile}.bak`,
        ]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
//# sourceMappingURL=memory-control-compaction-self-tests.js.map