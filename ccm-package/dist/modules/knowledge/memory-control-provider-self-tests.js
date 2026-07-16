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
exports.runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest = runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest;
exports.runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest = runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest = runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest = runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest = runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefRequiredDocsSelfTest = runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefRequiredDocsSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest = runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest = runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest = runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupTypedMemorySelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupPreDispatchPolicySelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupPreDispatchPolicySelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairSelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairSelfTest;
exports.runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicySelfTest = runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicySelfTest;
exports.runMemoryCenterWorkerContextPacketCrossGroupProviderReliabilityGuidanceSelfTest = runMemoryCenterWorkerContextPacketCrossGroupProviderReliabilityGuidanceSelfTest;
exports.runMemoryCenterWorkerContextPacketProviderReliabilitySnapshotRankingSelfTest = runMemoryCenterWorkerContextPacketProviderReliabilitySnapshotRankingSelfTest;
exports.runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest = runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest;
exports.runMemoryCenterWorkerContextPacketProviderSwitchExecutionTypedMemorySelfTest = runMemoryCenterWorkerContextPacketProviderSwitchExecutionTypedMemorySelfTest;
exports.runMemoryCenterWorkerContextPacketProviderSwitchExecutionRankingSelfTest = runMemoryCenterWorkerContextPacketProviderSwitchExecutionRankingSelfTest;
exports.runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest = runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const memory_control_center_1 = require("./memory-control-center");
function runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest() {
    const groupId = `memory-center-worker-context-usage-repair-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    try {
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-context-pressure-selftest",
            project: "api",
            task_id: "context-pressure-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 1000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 120,
            total_tokens: 1120,
            total_chars: 4480,
            free_tokens: -240,
            pressure: 112,
            status: "over_budget",
            compact_recommended: true,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 70, chars: 280, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 720, chars: 2880, source: "ccm-group-memory-context-v1", required: true, included: true },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 170, chars: 680, source: "typed-memory", included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 160, chars: 640, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 0, chars: 0, source: "budget", included: false },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 120, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 720, chars: 2880 },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 170, chars: 680 },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 160, chars: 640 },
            ],
            suggested_reductions: [
                {
                    category_id: "group_memory_rendered",
                    name: "Group memory rendered context",
                    tokens: 720,
                    suggestion: "用最新 compact summary 与 typed MEMORY.md reference 替换完整渲染记忆。",
                },
                {
                    category_id: "typed_memory_recall",
                    name: "Typed MEMORY.md recall",
                    tokens: 170,
                    suggestion: "去重 typed MEMORY.md 召回，只保留本任务相关条目。",
                },
            ],
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T09:00:00.000Z",
            bindingCount: 1,
            nativeBindingCount: 0,
            entries: [{
                    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
                    binding_id: "binding-context-pressure-selftest",
                    groupId,
                    brief_id: "brief-context-pressure-selftest",
                    work_item_id: "provider-reproof-context-pressure-selftest",
                    source: "api_microcompact_native_apply_provider_reproof",
                    project: "api",
                    assignment_id: "assignment-context-pressure-selftest",
                    dispatch_key: "dispatch-context-pressure-selftest",
                    worker_context_packet_id: "wcp-context-pressure-selftest",
                    worker_context_packet_context_usage: usage,
                    proof_entry_id: "proof-context-pressure-selftest",
                    request_patch_checksum: "request-context-pressure-selftest",
                    provider_reproof_status: "needed",
                    provider_reproof_reason: "missing_native_request_adapter_telemetry",
                    runner_request_id: "runner-context-pressure-selftest",
                    execution_id: "execution-context-pressure-selftest",
                    should_create_real_task: false,
                    worker_context_packet_replay_briefs: [{
                            brief_id: "brief-context-pressure-selftest",
                            work_item_id: "provider-reproof-context-pressure-selftest",
                            source: "api_microcompact_native_apply_provider_reproof",
                            target_project: "api",
                        }],
                    worker_context_packet_render_probe: {
                        packet_id: "wcp-context-pressure-selftest",
                        rendered_flags: { has_context_usage_budget: true },
                    },
                    at: "2026-07-09T09:00:00.000Z",
                }],
        });
        const usageReport = (0, memory_control_center_1.buildWorkerContextPacketContextUsageReport)({ groupIds: [groupId] });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketContextUsageRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T09:01:00.000Z",
        });
        const workLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const repairItem = (workLedger.items || []).find((item) => item.source === "worker_context_packet_context_usage_repair") || {};
        const candidates = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { limit: 6 });
        const quality = (0, memory_control_center_1.evaluateWorkerContextPacketContextUsageRepairWorkItems)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_context_usage_repair_work_items"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "worker_context_packet_context_usage_repair_work_items") || {};
        const candidate = (candidates.candidates || []).find((item) => item.work_item_id === repairItem.work_item_id) || {};
        const checks = {
            usageReportSeesOverBudget: Number(usageReport.overall?.overBudgetCount || 0) === 1
                && Number(usageReport.overall?.compactRecommendedCount || 0) === 1,
            repairReportCreatesOpenWorkItem: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.requiredActionCount || 0) === 1
                && Number(repairReport.overall?.currentOpenItemCount || 0) === 1,
            repairItemCarriesPressureMetadata: repairItem.source === "worker_context_packet_context_usage_repair"
                && repairItem.priority === "critical"
                && repairItem.worker_context_packet_id === "wcp-context-pressure-selftest"
                && repairItem.worker_context_packet_usage_status === "over_budget"
                && (repairItem.worker_context_packet_suggested_reductions || []).some((item) => item.category_id === "group_memory_rendered")
                && String(repairItem.instruction || "").includes("Context usage budget"),
            dispatchCandidateSurfacesRepair: candidates.candidateCount >= 1
                && candidate.source === "worker_context_packet_context_usage_repair"
                && ["main_agent_claim_or_triage_before_next_child_dispatch", "main_agent_review_and_dispatch_to_child_agent"].includes(candidate.recommendedAction),
            qualityCheckCoversReactiveRepair: quality.id === "worker_context_packet_context_usage_repair_work_items"
                && quality.status === "ok"
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            usageReport: usageReport.overall,
            repairReport: repairReport.overall,
            repairItem: {
                id: repairItem.id || "",
                status: repairItem.status || "",
                priority: repairItem.priority || "",
                packet_id: repairItem.worker_context_packet_id || "",
                usage_status: repairItem.worker_context_packet_usage_status || "",
                top_categories: repairItem.worker_context_packet_top_categories || [],
            },
            candidate: {
                candidate_id: candidate.candidate_id || "",
                work_item_id: candidate.work_item_id || "",
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
    }
}
function runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest() {
    const groupId = `memory-center-worker-context-usage-repair-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: "wcp-context-pressure-typed-memory-selftest",
            project: "api",
            task_id: "context-pressure-typed-memory-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 1000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 120,
            total_tokens: 1160,
            total_chars: 4640,
            free_tokens: -280,
            pressure: 116,
            status: "over_budget",
            compact_recommended: true,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 70, chars: 280, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 720, chars: 2880, source: "ccm-group-memory-context-v1", required: true, included: true },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 210, chars: 840, source: "typed-memory", included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 160, chars: 640, required: true, included: true },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 120, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 720, chars: 2880 },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 210, chars: 840 },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 160, chars: 640 },
            ],
            suggested_reductions: [
                {
                    category_id: "group_memory_rendered",
                    name: "Group memory rendered context",
                    tokens: 720,
                    suggestion: "用最新 compact summary 与 typed MEMORY.md reference 替换完整渲染记忆。",
                },
                {
                    category_id: "typed_memory_recall",
                    name: "Typed MEMORY.md recall",
                    tokens: 210,
                    suggestion: "去重 typed MEMORY.md 召回，只保留本任务相关条目。",
                },
            ],
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T20:10:00.000Z",
            bindingCount: 1,
            entries: [{
                    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
                    binding_id: "binding-context-pressure-typed-memory-selftest",
                    groupId,
                    brief_id: "brief-context-pressure-typed-memory-selftest",
                    work_item_id: "provider-reproof-context-pressure-typed-memory-selftest",
                    source: "api_microcompact_native_apply_provider_reproof",
                    project: "api",
                    assignment_id: "assignment-context-pressure-typed-memory-selftest",
                    dispatch_key: "dispatch-context-pressure-typed-memory-selftest",
                    worker_context_packet_id: "wcp-context-pressure-typed-memory-selftest",
                    worker_context_packet_context_usage: usage,
                    proof_entry_id: "proof-context-pressure-typed-memory-selftest",
                    request_patch_checksum: "request-context-pressure-typed-memory-selftest",
                    provider_reproof_status: "needed",
                    provider_reproof_reason: "missing_native_request_adapter_telemetry",
                    runner_request_id: "runner-context-pressure-typed-memory-selftest",
                    execution_id: "execution-context-pressure-typed-memory-selftest",
                    should_create_real_task: false,
                    worker_context_packet_render_probe: {
                        packet_id: "wcp-context-pressure-typed-memory-selftest",
                        rendered_flags: { has_context_usage_budget: true },
                    },
                    at: "2026-07-09T20:10:00.000Z",
                }],
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketContextUsageRepairWorkItemReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T20:10:01.000Z",
        });
        const typedReport = (0, memory_control_center_1.buildWorkerContextPacketContextUsageRepairTypedMemoryReport)({
            groupIds: [groupId],
            repairWorkItemReport: repairReport,
            generatedAt: "2026-07-09T20:10:02.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_context_usage_repair_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_context_usage_repair_typed_memory") || {};
        const { buildGroupTypedMemoryRecall, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const doc = (docs || []).find((item) => item.source === "auto:context-usage-repair-distillation") || {};
        const recall = buildGroupTypedMemoryRecall(groupId, "CONTEXT_USAGE_REPAIR_TYPED_MEMORY context_usage free_tokens autocompact_buffer Context usage budget typed_memory_recall", {
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
        const checks = {
            repairReportCreatesPressureItem: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.requiredActionCount || 0) === 1
                && Number(repairReport.overall?.currentOpenItemCount || 0) === 1,
            typedMemoryReportPasses: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.typedMemoryDocCount || 0) >= 1
                && Number(typedReport.overall?.archivedCount || 0) >= 1
                && Number(typedReport.overall?.recallMatchCount || 0) >= 1,
            qualityCheckExposesTypedMemory: qualityCheck.status === "ok"
                && Number(qualityCheck.passed || 0) === 1,
            ledgerArchivesContextUsageRows: ledger.contextUsageRepairArchive?.schema === "ccm-context-usage-repair-distillation-v1"
                && Number(ledger.contextUsageRepairArchive?.archived_count || 0) >= 1
                && Number(ledger.contextUsageRepairArchive?.over_budget_count || 0) >= 1,
            typedDocContainsBudgetDiscipline: String(doc.body || "").includes("context_usage.status")
                && String(doc.body || "").includes("free_tokens")
                && String(doc.body || "").includes("autocompact_buffer")
                && String(doc.body || "").includes("Context usage budget"),
            recallFindsContextUsageDiscipline: /worker-context-usage-pressure-discipline\.md|context_usage|autocompact_buffer|Context usage budget/i.test(recallText),
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
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
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
function runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest() {
    const groupId = `memory-center-worker-context-pressure-recall-typed-memory-usage-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const packetId = "wcp-pressure-recall-typed-memory-usage-selftest";
        const usage = {
            schema: "ccm-worker-context-usage-v1",
            version: 1,
            packet_id: packetId,
            project: "api",
            task_id: "pressure-recall-typed-memory-usage-task",
            model_context_policy: "cc-style-api-view-after-memory-render",
            max_tokens: 1000,
            reserved_output_tokens: 120,
            autocompact_buffer_tokens: 120,
            total_tokens: 1210,
            total_chars: 4840,
            free_tokens: -330,
            pressure: 121,
            status: "over_budget",
            compact_recommended: true,
            categories: [
                { id: "task_goal", name: "Task and goal", tokens: 80, chars: 320, required: true, included: true },
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 760, chars: 3040, source: "ccm-group-memory-context-v1", required: true, included: true },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 230, chars: 920, source: "typed-memory", included: true },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 140, chars: 560, required: true, included: true },
                { id: "free_space", name: "Free space", tokens: 0, chars: 0, source: "budget", included: false },
                { id: "autocompact_buffer", name: "Autocompact buffer", tokens: 120, chars: 0, source: "budget", required: true, included: true },
            ],
            top_categories: [
                { id: "group_memory_rendered", name: "Group memory rendered context", tokens: 760, chars: 3040 },
                { id: "typed_memory_recall", name: "Typed MEMORY.md recall", tokens: 230, chars: 920 },
                { id: "verification_and_acceptance", name: "Verification and acceptance", tokens: 140, chars: 560 },
            ],
        };
        const entry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "binding-pressure-recall-typed-memory-usage-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            assignment_id: "assignment-pressure-recall-typed-memory-usage-selftest",
            dispatch_key: "dispatch-pressure-recall-typed-memory-usage-selftest",
            worker_context_packet_id: packetId,
            worker_context_packet_context_usage: usage,
            worker_context_packet_render_probe: {
                packet_id: packetId,
                rendered_flags: { has_context_usage_budget: true },
            },
            should_create_real_task: false,
            at: "2026-07-09T21:45:00.000Z",
        };
        const writeBinding = (nextEntry) => (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T21:45:00.000Z",
            bindingCount: 1,
            entries: [nextEntry],
        });
        writeBinding(entry);
        const missingRecallReport = (0, memory_control_center_1.buildWorkerContextPacketPressureRecallTypedMemoryUsageReport)({ groupIds: [groupId] });
        const missingRecallQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_recall_typed_memory_usage"],
            groupIds: [groupId],
            refresh: true,
        });
        const missingRecallCheck = (missingRecallQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_recall_typed_memory_usage") || {};
        const pressureRecall = {
            schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
            active: true,
            pressure_status: "over_budget",
            boosted_count: 2,
            recalled_count: 2,
            docs: [
                {
                    rel_path: "worker-context-usage-pressure-discipline.md",
                    name: "WorkerContextPacket Context Usage Pressure Discipline",
                    type: "reference",
                    score: 96,
                    pressure_adjustment: 12,
                    pressure_status: "over_budget",
                    kinds: ["context_usage"],
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    score: 82,
                    pressure_adjustment: 8,
                    pressure_status: "over_budget",
                    kinds: ["compact_strategy"],
                },
            ],
        };
        writeBinding({
            ...entry,
            worker_context_packet_typed_memory_pressure_recall: pressureRecall,
        });
        const missingUsageReport = (0, memory_control_center_1.buildWorkerContextPacketPressureRecallTypedMemoryUsageReport)({ groupIds: [groupId] });
        const { recordGroupTypedMemoryPressureRecallUsageLedger, readGroupTypedMemoryPressureRecallUsageLedger, } = require("../collaboration/group-memory-index");
        const usageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject: "api",
            taskId: "pressure-recall-typed-memory-usage-task",
            executionId: "execution-pressure-recall-typed-memory-usage-selftest",
            agent: "api",
            generatedAt: "2026-07-09T21:45:02.000Z",
            rows: [
                {
                    rel_path: "worker-context-usage-pressure-discipline.md",
                    name: "WorkerContextPacket Context Usage Pressure Discipline",
                    type: "reference",
                    worker_context_packet_id: packetId,
                    pressure_status: "over_budget",
                    pressure_adjustment: 12,
                    usage_state: "used",
                    direct_reference: true,
                    reason: "selftest: child agent receipt referenced pressure context usage discipline",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: packetId,
                    pressure_status: "over_budget",
                    pressure_adjustment: 8,
                    usage_state: "ignored",
                    reason: "selftest: compact strategy was surfaced but not needed for this packet",
                },
            ],
        });
        const staleUsageRecord = recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject: "api",
            taskId: "pressure-recall-stale-typed-memory-usage-task",
            executionId: "execution-pressure-recall-stale-typed-memory-usage-selftest",
            agent: "api",
            generatedAt: "2026-03-01T00:00:00.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-pressure-recall-stale-typed-memory-usage-selftest",
                    pressure_status: "over_budget",
                    pressure_adjustment: 8,
                    usage_state: "ignored",
                    reason: "selftest: stale ignored receipt should decay in MCC pressure recall usage health",
                },
            ],
        });
        const usageLedger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
        const okReport = (0, memory_control_center_1.buildWorkerContextPacketPressureRecallTypedMemoryUsageReport)({
            groupIds: [groupId],
            nowMs: Date.parse("2026-07-09T21:45:03.000Z"),
        });
        const okQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_recall_typed_memory_usage"],
            groupIds: [groupId],
            nowMs: Date.parse("2026-07-09T21:45:03.000Z"),
            refresh: true,
        });
        const okQualityCheck = (okQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_recall_typed_memory_usage") || {};
        const missingRecallGap = missingRecallReport.weakGroups?.[0]?.gaps?.[0]?.reason || "";
        const missingUsageGap = missingUsageReport.weakGroups?.[0]?.gaps?.[0]?.reason || "";
        const checks = {
            highPressureWithoutRecallFails: missingRecallReport.overall?.status === "fail"
                && Number(missingRecallReport.overall?.pressurePacketCount || 0) === 1
                && /未记录 pressure typed MEMORY\.md recall/.test(missingRecallGap)
                && missingRecallCheck.status === "fail",
            recallWithoutReceiptWarns: missingUsageReport.overall?.status === "warn"
                && Number(missingUsageReport.overall?.pressureRecallPacketCount || 0) === 1
                && Number(missingUsageReport.overall?.usageLedgerPacketCount || 0) === 0
                && /缺少 memoryUsed\/memoryIgnored usage ledger 回执/.test(missingUsageGap),
            receiptLedgerClosesLoop: okReport.overall?.status === "ok"
                && Number(okReport.overall?.pressurePacketCount || 0) === 1
                && Number(okReport.overall?.pressureRecallPacketCount || 0) === 1
                && Number(okReport.overall?.usageLedgerPacketCount || 0) === 1
                && Number(okReport.overall?.usageEntryCount || 0) >= 2
                && okQualityCheck.status === "ok",
            usageLedgerPersistsUsedAndIgnored: usageRecord?.recorded_count === 2
                && staleUsageRecord?.recorded_count === 1
                && usageLedger.totals?.used === 1
                && usageLedger.totals?.ignored === 2,
            usageAgingHealthExposed: Number(okReport.overall?.staleUsageEntryCount || 0) >= 1
                && Number(okReport.overall?.freshUsageEntryCount || 0) >= 2
                && Number(okReport.groups?.[0]?.usageWeightedTotals?.ignored || 0) < Number(okReport.groups?.[0]?.usageRawTotals?.ignored || 0),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            reports: {
                missingRecall: missingRecallReport.overall,
                missingUsage: missingUsageReport.overall,
                ok: okReport.overall,
            },
            qualityCheck: {
                id: okQualityCheck.id || "",
                status: okQualityCheck.status || "",
                checked: okQualityCheck.checked || 0,
                passed: okQualityCheck.passed || 0,
            },
            usageRecord: {
                recorded_count: usageRecord?.recorded_count || 0,
                stale_recorded_count: staleUsageRecord?.recorded_count || 0,
                duplicate_count: usageRecord?.duplicate_count || 0,
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
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest() {
    const groupId = `memory-center-pressure-memory-provenance-receipt-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    try {
        const packetId = "wcp-pressure-memory-provenance-receipt-selftest";
        const relPath = "worker-context-usage-pressure-discipline.md";
        const repairWorkItemId = "cgpru-phase133-provenance-receipt-selftest";
        const entry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "binding-pressure-memory-provenance-receipt-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            assignment_id: "assignment-pressure-memory-provenance-receipt-selftest",
            dispatch_key: "dispatch-pressure-memory-provenance-receipt-selftest",
            worker_context_packet_id: packetId,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: packetId,
                project: "api",
                status: "over_budget",
                pressure: 119,
                total_tokens: 1190,
                max_tokens: 1000,
                free_tokens: -310,
                autocompact_buffer_tokens: 120,
            },
            worker_context_packet_typed_memory_pressure_recall: {
                schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
                active: true,
                pressure_status: "over_budget",
                boosted_count: 1,
                recalled_count: 1,
                docs: [{
                        rel_path: relPath,
                        name: "WorkerContextPacket Context Usage Pressure Discipline",
                        type: "reference",
                        score: 98,
                        pressure_adjustment: 12,
                        pressure_status: "over_budget",
                        kinds: ["context_usage", "pressure_repair"],
                        pressure_usage_adjustment: 8,
                        pressure_usage_recommendation: "promote_pressure_recall",
                        pressure_usage_matches: [{
                                rel_path: relPath,
                                name: "WorkerContextPacket Context Usage Pressure Discipline",
                                target_project: "api",
                                recommendation: "promote_pressure_recall",
                                hint_scope: "cross_group_project",
                                provenance_status: "disputed_under_repair",
                                repair_work_item_id: repairWorkItemId,
                                repair_status: "pending",
                                repair_gap_type: "recommendation_conflict",
                                repair_open: true,
                            }],
                        provenance_status: "disputed_under_repair",
                        repair_work_item_id: repairWorkItemId,
                        repair_status: "pending",
                        repair_gap_type: "recommendation_conflict",
                        requires_memory_provenance_usage: true,
                    }],
            },
            should_create_real_task: false,
            at: "2026-07-09T23:59:40.000Z",
        };
        const writeBinding = (nextEntry) => (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T23:59:40.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [nextEntry],
        });
        writeBinding(entry);
        const missingReceiptReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T23:59:41.000Z",
        });
        const missingReceiptQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_memory_provenance_receipts"],
            groupIds: [groupId],
            refresh: true,
        });
        const missingReceiptCheck = (missingReceiptQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_memory_provenance_receipts") || {};
        const missingLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const openMissingItem = (missingLedger.items || []).find((item) => item.source === "worker_context_pressure_memory_provenance_receipt_repair" && (0, memory_control_center_1.replayRepairWorkItemOpen)(item.status)) || {};
        writeBinding({
            ...entry,
            worker_context_packet_receipt: {
                agent: "api",
                project: "api",
                status: "done",
                worker_context_packet_id: packetId,
                memoryUsed: [`${relPath}; provenance=disputed_under_repair; work_item=${repairWorkItemId}`],
                memoryIgnored: [],
                summary: "泛化声明使用 pressure memory，但未提供 memoryProvenanceUsage。",
            },
        });
        const missingStructuredReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T23:59:42.000Z",
        });
        writeBinding({
            ...entry,
            worker_context_packet_receipt: {
                agent: "api",
                project: "api",
                status: "done",
                worker_context_packet_id: packetId,
                memoryUsed: [`${relPath}; provenance=disputed_under_repair; work_item=${repairWorkItemId}`],
                memoryIgnored: [],
                memoryProvenanceUsage: [{
                        relPath,
                        name: "WorkerContextPacket Context Usage Pressure Discipline",
                        usageState: "used",
                        provenanceStatus: "disputed_under_repair",
                        repairWorkItemId,
                        repairStatus: "pending",
                        repairGapType: "recommendation_conflict",
                        currentSourceVerified: false,
                        reason: "selftest unsafe use before current source verification",
                    }],
                summary: "结构化声明存在，但未声明 currentSourceVerified=true。",
            },
        });
        const unsafeReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T23:59:43.000Z",
        });
        writeBinding({
            ...entry,
            worker_context_packet_receipt: {
                agent: "api",
                project: "api",
                status: "done",
                worker_context_packet_id: packetId,
                memoryUsed: [`${relPath}; provenance=disputed_under_repair; work_item=${repairWorkItemId}; current source verified`],
                memoryIgnored: [],
                memoryProvenanceUsage: [{
                        relPath,
                        name: "WorkerContextPacket Context Usage Pressure Discipline",
                        usageState: "used",
                        provenanceStatus: "disputed_under_repair",
                        repairWorkItemId,
                        repairStatus: "pending",
                        repairGapType: "recommendation_conflict",
                        currentSourceVerified: true,
                        reason: "disputed pressure memory used only after current source verification",
                    }],
                summary: "使用 disputed pressure memory 前已重读当前源。",
            },
        });
        const resolvedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T23:59:44.000Z",
        });
        const resolvedQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_memory_provenance_receipts"],
            groupIds: [groupId],
            refresh: true,
        });
        const resolvedCheck = (resolvedQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_memory_provenance_receipts") || {};
        const resolvedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedRepairItem = (resolvedLedger.items || []).find((item) => item.source === "worker_context_pressure_memory_provenance_receipt_repair") || {};
        const checks = {
            missingReceiptFailsAndCreatesRepair: missingReceiptReport.overall?.status === "fail"
                && (Number(missingReceiptReport.overall?.missingReceiptCount || 0) + Number(missingReceiptReport.overall?.missingMemoryProvenanceUsageCount || 0)) >= 1
                && missingReceiptCheck.status === "fail"
                && openMissingItem.source === "worker_context_pressure_memory_provenance_receipt_repair"
                && openMissingItem.component === "worker_context_pressure_memory_provenance_receipt_contract",
            genericMemoryUsedStillFails: missingStructuredReport.overall?.status === "fail"
                && Number(missingStructuredReport.overall?.missingMemoryProvenanceUsageCount || 0) === 1,
            unsafeStructuredUseWarns: unsafeReport.overall?.status === "warn"
                && Number(unsafeReport.overall?.unsafeDisputedUseCount || 0) === 1,
            structuredVerifiedReceiptPassesAndClosesRepair: resolvedReport.overall?.status === "ok"
                && Number(resolvedReport.overall?.verifiedUnderRepairCount || 0) === 1
                && resolvedCheck.status === "ok"
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(completedRepairItem.status) === "completed"
                && completedRepairItem.resolutionReason === "worker_context_pressure_memory_provenance_receipt_compliant",
            projectStatsExposeTrustedDisputedVerifiedCounts: resolvedReport.groups?.[0]?.projects?.[0]?.project === "api"
                && Number(resolvedReport.groups?.[0]?.projects?.[0]?.disputedCount || 0) === 1
                && Number(resolvedReport.groups?.[0]?.projects?.[0]?.verifiedUnderRepairCount || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            reports: {
                missingReceipt: missingReceiptReport.overall,
                missingStructured: missingStructuredReport.overall,
                unsafe: unsafeReport.overall,
                resolved: resolvedReport.overall,
            },
            repairItem: {
                id: completedRepairItem.id || openMissingItem.id || "",
                status: completedRepairItem.status || openMissingItem.status || "",
                source: completedRepairItem.source || openMissingItem.source || "",
                component: completedRepairItem.component || openMissingItem.component || "",
            },
            project: resolvedReport.groups?.[0]?.projects?.[0] || null,
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
function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest() {
    const groupId = `memory-center-pressure-memory-provenance-receipt-dispatch-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    try {
        const packetId = "wcp-pressure-memory-provenance-receipt-dispatch-selftest";
        const relPath = "worker-context-usage-pressure-discipline.md";
        const repairWorkItemId = "cgpru-phase134-provenance-dispatch-selftest";
        const entry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "binding-pressure-memory-provenance-receipt-dispatch-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            assignment_id: "assignment-pressure-memory-provenance-receipt-dispatch-selftest",
            dispatch_key: "dispatch-pressure-memory-provenance-receipt-dispatch-selftest",
            worker_context_packet_id: packetId,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: packetId,
                project: "api",
                status: "over_budget",
                pressure: 120,
                total_tokens: 1200,
                max_tokens: 1000,
                free_tokens: -320,
                autocompact_buffer_tokens: 120,
            },
            worker_context_packet_typed_memory_pressure_recall: {
                schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
                active: true,
                pressure_status: "over_budget",
                boosted_count: 1,
                recalled_count: 1,
                docs: [{
                        rel_path: relPath,
                        name: "WorkerContextPacket Context Usage Pressure Discipline",
                        type: "reference",
                        score: 98,
                        pressure_adjustment: 12,
                        pressure_status: "over_budget",
                        kinds: ["context_usage", "pressure_repair"],
                        pressure_usage_adjustment: 8,
                        pressure_usage_recommendation: "promote_pressure_recall",
                        pressure_usage_matches: [{
                                rel_path: relPath,
                                name: "WorkerContextPacket Context Usage Pressure Discipline",
                                target_project: "api",
                                recommendation: "promote_pressure_recall",
                                hint_scope: "cross_group_project",
                                provenance_status: "disputed_under_repair",
                                repair_work_item_id: repairWorkItemId,
                                repair_status: "pending",
                                repair_gap_type: "recommendation_conflict",
                                repair_open: true,
                            }],
                        provenance_status: "disputed_under_repair",
                        repair_work_item_id: repairWorkItemId,
                        repair_status: "pending",
                        repair_gap_type: "recommendation_conflict",
                        requires_memory_provenance_usage: true,
                    }],
            },
            should_create_real_task: false,
            at: "2026-07-09T23:59:50.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T23:59:50.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [entry],
        });
        const receiptReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T23:59:51.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            receiptReport,
            generatedAt: "2026-07-09T23:59:52.000Z",
        });
        const candidateQuality = (0, memory_control_center_1.evaluateWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchCandidates)({
            groupIds: [groupId],
            receiptReport,
            generatedAt: "2026-07-09T23:59:53.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-09T23:59:54.000Z",
        });
        const briefQuality = (0, memory_control_center_1.evaluateWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefs)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-09T23:59:55.000Z",
        });
        const candidate = candidateReport.groups?.[0]?.candidates?.[0] || {};
        const dispatchPlanLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const brief = (dispatchPlanLedger.briefs || []).find((item) => (0, memory_control_center_1.isWorkerContextPressureMemoryProvenanceReceiptRepairSource)(item.source)) || briefReport.groups?.[0]?.briefs?.[0] || {};
        const workerTask = String(brief.worker_task || "");
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: "pressure provenance receipt repair dispatch selftest", currentPhase: "test" },
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
            receiptGapCreatesRepairItem: receiptReport.overall?.status === "fail"
                && Number(receiptReport.overall?.missingMemoryProvenanceUsageCount || 0) === 1
                && Number(receiptReport.overall?.openRepairWorkItemCount || 0) === 1,
            repairItemBecomesDispatchCandidate: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) === 1
                && Number(candidateReport.overall?.coveredCandidateCount || 0) === 1
                && candidate.source === "worker_context_pressure_memory_provenance_receipt_repair"
                && candidate.component === "worker_context_pressure_memory_provenance_receipt_contract"
                && candidate.worker_context_packet_id === packetId
                && (candidate.pressure_memory_provenance_rel_paths || []).includes(relPath)
                && (candidate.pressure_memory_provenance_repair_work_item_ids || []).includes(repairWorkItemId)
                && /memoryProvenanceUsage/i.test(String(candidate.prompt_patch || "")),
            candidateQualityCheckPasses: candidateQuality.id === "worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_candidates"
                && candidateQuality.status === "ok"
                && Number(candidateQuality.passed || 0) === 1,
            correctedReceiptBriefCreated: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) === 1
                && Number(briefReport.overall?.coveredBriefCount || 0) === 1
                && brief.source === "worker_context_pressure_memory_provenance_receipt_repair"
                && brief.worker_context_packet_id === packetId
                && (brief.pressure_memory_provenance_rel_paths || []).includes(relPath)
                && /CCM_AGENT_RECEIPT/i.test(workerTask)
                && /memoryProvenanceUsage/i.test(workerTask)
                && /repairWorkItemId|repair_work_item_id/i.test(workerTask)
                && /currentSourceVerified|current_source_verified/i.test(workerTask),
            briefQualityCheckPasses: briefQuality.id === "worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_briefs"
                && briefQuality.status === "ok"
                && Number(briefQuality.passed || 0) === 1,
            renderedContextMentionsPressureProvenanceCandidate: rendered.includes("Main Agent replay repair dispatch candidates")
                && rendered.includes(packetId)
                && rendered.includes("pressureDocs=")
                && rendered.includes("pressureRepair=")
                && rendered.includes("memoryProvenanceUsage"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receiptReport: receiptReport.overall,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            candidate: {
                work_item_id: candidate.work_item_id || "",
                source: candidate.source || "",
                worker_context_packet_id: candidate.worker_context_packet_id || "",
                rel_paths: candidate.pressure_memory_provenance_rel_paths || [],
                repair_ids: candidate.pressure_memory_provenance_repair_work_item_ids || [],
            },
            brief: {
                brief_id: brief.brief_id || "",
                source: brief.source || "",
                worker_context_packet_id: brief.worker_context_packet_id || "",
                rel_paths: brief.pressure_memory_provenance_rel_paths || [],
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
function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefRequiredDocsSelfTest() {
    const groupId = `memory-center-pressure-memory-provenance-receipt-brief-required-docs-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    try {
        const packetId = "wcp-pressure-memory-provenance-receipt-brief-required-docs-selftest";
        const pressureDocs = [
            {
                relPath: "worker-context-usage-pressure-discipline.md",
                name: "WorkerContextPacket Context Usage Pressure Discipline",
                repairWorkItemId: "cgpru-phase175-provenance-required-docs-a",
                repairGapType: "recommendation_conflict",
            },
            {
                relPath: "worker-context-pressure-recall-risk.md",
                name: "WorkerContextPacket Pressure Recall Risk",
                repairWorkItemId: "cgpru-phase175-provenance-required-docs-b",
                repairGapType: "stale_pressure_recall",
            },
        ];
        const entry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "binding-pressure-memory-provenance-receipt-brief-required-docs-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            assignment_id: "assignment-pressure-memory-provenance-receipt-brief-required-docs-selftest",
            dispatch_key: "dispatch-pressure-memory-provenance-receipt-brief-required-docs-selftest",
            worker_context_packet_id: packetId,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: packetId,
                project: "api",
                status: "over_budget",
                pressure: 122,
                total_tokens: 1200,
                max_tokens: 1000,
                free_tokens: -320,
                autocompact_buffer_tokens: 120,
            },
            worker_context_packet_typed_memory_pressure_recall: {
                schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
                active: true,
                pressure_status: "over_budget",
                boosted_count: pressureDocs.length,
                recalled_count: pressureDocs.length,
                docs: pressureDocs.map(doc => ({
                    rel_path: doc.relPath,
                    name: doc.name,
                    type: "reference",
                    score: 98,
                    pressure_adjustment: 12,
                    pressure_status: "over_budget",
                    kinds: ["context_usage", "pressure_repair"],
                    pressure_usage_adjustment: 8,
                    pressure_usage_recommendation: "promote_pressure_recall",
                    pressure_usage_matches: [{
                            rel_path: doc.relPath,
                            name: doc.name,
                            target_project: "api",
                            recommendation: "promote_pressure_recall",
                            hint_scope: "cross_group_project",
                            provenance_status: "disputed_under_repair",
                            repair_work_item_id: doc.repairWorkItemId,
                            repair_status: "pending",
                            repair_gap_type: doc.repairGapType,
                            repair_open: true,
                        }],
                    provenance_status: "disputed_under_repair",
                    repair_work_item_id: doc.repairWorkItemId,
                    repair_status: "pending",
                    repair_gap_type: doc.repairGapType,
                    requires_memory_provenance_usage: true,
                })),
            },
            should_create_real_task: false,
            at: "2026-07-10T20:35:00.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T20:35:00.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [entry],
        });
        const receiptReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T20:35:01.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            receiptReport,
            generatedAt: "2026-07-10T20:35:02.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-10T20:35:03.000Z",
        });
        const requiredDocsReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefRequiredDocsReport)({
            groupIds: [groupId],
            briefReport,
            generatedAt: "2026-07-10T20:35:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_brief_required_docs"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_brief_required_docs") || {};
        const candidate = candidateReport.groups?.[0]?.candidates?.[0] || {};
        const brief = briefReport.groups?.[0]?.briefs?.[0] || {};
        const workerTask = String(brief.worker_task || "");
        const relPaths = pressureDocs.map(doc => doc.relPath);
        const repairIds = pressureDocs.map(doc => doc.repairWorkItemId);
        const checks = {
            missingReceiptCreatesRepairChain: receiptReport.overall?.status === "fail"
                && Number(receiptReport.overall?.requiredProvenanceDocCount || 0) === pressureDocs.length
                && Number(receiptReport.overall?.openRepairWorkItemCount || 0) === 1
                && candidateReport.overall?.status === "ok"
                && briefReport.overall?.status === "ok",
            candidateCarriesAllPressureDocs: relPaths.every(relPath => (candidate.pressure_memory_provenance_rel_paths || []).includes(relPath))
                && repairIds.every(repairId => (candidate.pressure_memory_provenance_repair_work_item_ids || []).includes(repairId))
                && String(candidate.prompt_patch || "").includes("memoryProvenanceUsage"),
            briefCarriesAllPressureDocs: relPaths.every(relPath => (brief.pressure_memory_provenance_rel_paths || []).includes(relPath))
                && repairIds.every(repairId => (brief.pressure_memory_provenance_repair_work_item_ids || []).includes(repairId)),
            briefWorkerTaskIsSelfContained: relPaths.every(relPath => workerTask.includes(relPath))
                && repairIds.every(repairId => workerTask.includes(repairId))
                && /CCM_AGENT_RECEIPT/i.test(workerTask)
                && /memoryProvenanceUsage/i.test(workerTask)
                && /provenanceStatus|provenance_status/i.test(workerTask)
                && /repairWorkItemId|repair_work_item_id/i.test(workerTask)
                && /currentSourceVerified|current_source_verified/i.test(workerTask),
            requiredDocsQualityPasses: requiredDocsReport.overall?.status === "ok"
                && Number(requiredDocsReport.overall?.requiredDocBriefCount || 0) === 1
                && Number(requiredDocsReport.overall?.coveredRequiredDocBriefCount || 0) === 1
                && Number(requiredDocsReport.overall?.requiredRelPathCount || 0) === pressureDocs.length
                && Number(requiredDocsReport.overall?.requiredRepairWorkItemIdCount || 0) === pressureDocs.length
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receiptReport: receiptReport.overall,
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
                rel_paths: candidate.pressure_memory_provenance_rel_paths || [],
                repair_ids: candidate.pressure_memory_provenance_repair_work_item_ids || [],
            },
            brief: {
                rel_paths: brief.pressure_memory_provenance_rel_paths || [],
                repair_ids: brief.pressure_memory_provenance_repair_work_item_ids || [],
                worker_task: (0, memory_control_center_1.compactMemoryCenterText)(workerTask, 1200),
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
function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest() {
    const groupId = `memory-center-pressure-memory-provenance-receipt-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const packetId = "wcp-pressure-memory-provenance-receipt-typed-memory-selftest";
        const relPath = "worker-context-usage-pressure-discipline.md";
        const repairWorkItemId = "cgpru-phase135-provenance-typed-selftest";
        const entry = {
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: "binding-pressure-memory-provenance-receipt-typed-memory-selftest",
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            assignment_id: "assignment-pressure-memory-provenance-receipt-typed-memory-selftest",
            dispatch_key: "dispatch-pressure-memory-provenance-receipt-typed-memory-selftest",
            worker_context_packet_id: packetId,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: packetId,
                project: "api",
                status: "over_budget",
                pressure: 121,
                total_tokens: 1210,
                max_tokens: 1000,
                free_tokens: -330,
                autocompact_buffer_tokens: 120,
            },
            worker_context_packet_typed_memory_pressure_recall: {
                schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
                active: true,
                pressure_status: "over_budget",
                boosted_count: 1,
                recalled_count: 1,
                docs: [{
                        rel_path: relPath,
                        name: "WorkerContextPacket Context Usage Pressure Discipline",
                        type: "reference",
                        score: 98,
                        pressure_adjustment: 12,
                        pressure_status: "over_budget",
                        kinds: ["context_usage", "pressure_repair"],
                        pressure_usage_adjustment: 8,
                        pressure_usage_recommendation: "promote_pressure_recall",
                        pressure_usage_matches: [{
                                rel_path: relPath,
                                name: "WorkerContextPacket Context Usage Pressure Discipline",
                                target_project: "api",
                                recommendation: "promote_pressure_recall",
                                hint_scope: "cross_group_project",
                                provenance_status: "disputed_under_repair",
                                repair_work_item_id: repairWorkItemId,
                                repair_status: "pending",
                                repair_gap_type: "recommendation_conflict",
                                repair_open: true,
                            }],
                        provenance_status: "disputed_under_repair",
                        repair_work_item_id: repairWorkItemId,
                        repair_status: "pending",
                        repair_gap_type: "recommendation_conflict",
                        requires_memory_provenance_usage: true,
                    }],
            },
            worker_context_packet_receipt: {
                agent: "api",
                project: "api",
                status: "done",
                worker_context_packet_id: packetId,
                memoryUsed: [`${relPath}; provenance=disputed_under_repair; work_item=${repairWorkItemId}`],
                memoryIgnored: [],
                summary: "使用 pressure memory 但缺少结构化 memoryProvenanceUsage。",
            },
            should_create_real_task: false,
            at: "2026-07-09T23:59:56.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-09T23:59:56.000Z",
            bindingCount: 1,
            workerContextPacketBindingCount: 1,
            entries: [entry],
        });
        const receiptReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-09T23:59:57.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchCandidateReport)({
            groupIds: [groupId],
            receiptReport,
            generatedAt: "2026-07-09T23:59:58.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-09T23:59:59.000Z",
        });
        const typedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemoryReport)({
            groupIds: [groupId],
            receiptReport,
            candidateReport,
            briefReport,
            generatedAt: "2026-07-10T00:00:00.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_memory_provenance_receipt_repair_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_memory_provenance_receipt_repair_typed_memory") || {};
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, buildGroupTypedMemoryRecall, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = ledger.pressureMemoryProvenanceReceiptRepairArchive || {};
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const doc = (docs || []).find((item) => item.source === "auto:pressure-memory-provenance-receipt-repair-distillation") || {};
        const docBody = String(doc.body || "");
        const recall = buildGroupTypedMemoryRecall(groupId, "pressure memory provenance receipt memoryProvenanceUsage repairWorkItemId currentSourceVerified disputed_under_repair", {
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
            repairDispatchChainReady: receiptReport.overall?.status === "fail"
                && Number(receiptReport.overall?.missingMemoryProvenanceUsageCount || 0) === 1
                && Number(receiptReport.overall?.openRepairWorkItemCount || 0) === 1
                && candidateReport.overall?.status === "ok"
                && briefReport.overall?.status === "ok",
            typedMemoryReportPasses: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.typedMemoryDocCount || 0) >= 1
                && Number(typedReport.overall?.archivedCount || 0) >= 1
                && Number(typedReport.overall?.recallMatchCount || 0) >= 1,
            qualityCheckExposesTypedMemory: qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
            ledgerArchivesPressureProvenanceRows: archive.schema === "ccm-pressure-memory-provenance-receipt-repair-distillation-v1"
                && Number(archive.archived_count || 0) >= 1
                && Number(archive.corrected_prompt_count || 0) >= 1
                && Number(archive.current_source_verified_prompt_count || 0) >= 1
                && (archive.rel_paths || []).includes(relPath)
                && (archive.repair_work_item_ids || []).includes(repairWorkItemId),
            typedDocContainsReceiptDiscipline: doc.source === "auto:pressure-memory-provenance-receipt-repair-distillation"
                && doc.relPath === "pressure-memory-provenance-receipt-discipline.md"
                && docBody.includes("memoryProvenanceUsage")
                && docBody.includes("repairWorkItemId")
                && docBody.includes("provenanceStatus")
                && docBody.includes("currentSourceVerified")
                && docBody.includes("disputed_under_repair")
                && docBody.includes(relPath),
            recallFindsPressureProvenanceDiscipline: /memoryProvenanceUsage|repairWorkItemId|currentSourceVerified|disputed_under_repair/i.test(recallText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receiptReport: receiptReport.overall,
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
                current_source_verified_prompt_count: archive.current_source_verified_prompt_count || 0,
                rel_paths: archive.rel_paths || [],
                repair_work_item_ids: archive.repair_work_item_ids || [],
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
function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest() {
    const groupId = `memory-center-pressure-provenance-pre-dispatch-discipline-selftest-${process.pid}-${Date.now()}`;
    const targetProject = "phase136-pressure-project";
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    let groupFile = "";
    try {
        const { buildAgentMemoryContextBundle, getGroupMemoryFile, saveGroupMemory, } = require("../collaboration/memory");
        const { saveGroupMessages } = require("../collaboration/storage");
        const { recordGroupTypedMemoryPressureRecallUsageLedger, upsertGroupTypedMemoryDocument, } = require("../collaboration/group-memory-index");
        const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator } = require("../collaboration/group-orchestrator");
        groupFile = getGroupMemoryFile(groupId);
        saveGroupMessages(groupId, [{
                id: "phase136-1",
                role: "user",
                target: "coordinator",
                timestamp: "2026-07-10T00:10:00.000Z",
                content: "继续 pressure provenance pre-dispatch discipline 自测。",
            }]);
        saveGroupMemory(groupId, {
            goal: "验证 pressure provenance receipt discipline 首派发前进入 WorkerContextPacket",
            currentPhase: "phase136",
            persistentRequirements: [{ messageId: "phase136-1", text: "pre-dispatch WorkerContextPacket 必须携带 memoryProvenanceUsage discipline。" }],
            compaction: {},
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "feedback",
            slug: "worker-context-usage-pressure-discipline",
            name: "WorkerContextPacket context usage pressure discipline",
            source: "selftest:phase136-pressure-provenance-pre-dispatch",
            body: [
                "PHASE136_PRESSURE_PROVENANCE_PRE_DISPATCH_SENTINEL",
                "When this pressure memory is under repair, the child Agent receipt must include memoryProvenanceUsage.",
            ].join("\n"),
        });
        recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject,
            taskId: "phase136-pressure-pre-dispatch-task",
            executionId: "phase136-pressure-pre-dispatch-execution",
            agent: targetProject,
            generatedAt: "2026-07-10T00:10:00.000Z",
            rows: [
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-phase136-pre-dispatch-ignored-1" },
                { rel_path: "worker-context-usage-pressure-discipline.md", name: "WorkerContextPacket context usage pressure discipline", usage_state: "ignored", pressure_status: "over_budget", worker_context_packet_id: "wcp-phase136-pre-dispatch-ignored-2" },
            ],
        });
        (0, memory_control_center_1.writeJsonAtomic)(workItemsFile, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId,
            file: workItemsFile,
            items: [{
                    id: "cgpru-phase136-pre-dispatch-discipline",
                    work_item_id: "cgpru-phase136-pre-dispatch-discipline",
                    source: "cross_group_pressure_recall_usage_repair",
                    component: "cross_group_pressure_recall_usage",
                    status: "pending",
                    priority: "high",
                    target_project: targetProject,
                    repair_target: "worker-context-usage-pressure-discipline.md",
                    cross_group_pressure_recall_usage_gap_type: "recommendation_conflict",
                    cross_group_pressure_recall_usage_rel_path: "worker-context-usage-pressure-discipline.md",
                    cross_group_pressure_recall_usage_reason: "selftest: pressure provenance must be disciplined before dispatch",
                    local_recommendation: "deprioritize_pressure_recall",
                    cross_group_recommendation: "promote_pressure_recall",
                    source_group_count: 1,
                    source_groups: [{ groupId: "phase136-source-group", entry_count: 2 }],
                    shouldCreateRealTask: false,
                    updatedAt: "2026-07-10T00:10:01.000Z",
                }],
            stats: { total: 1, openItemCount: 1, pendingCount: 1 },
            updatedAt: "2026-07-10T00:10:01.000Z",
        });
        const bundle = buildAgentMemoryContextBundle(groupId, targetProject, "继续 PHASE136_PRESSURE_PROVENANCE_PRE_DISPATCH_SENTINEL over_budget", {
            workerContextPacketContextUsage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: "wcp-phase136-pre-dispatch",
                project: targetProject,
                status: "over_budget",
                pressure: 116,
                total_tokens: 104_400,
                max_tokens: 90_000,
                free_tokens: -27_400,
                autocompact_buffer_tokens: 13_000,
            },
            maxTypedMemory: 8,
            minKeepTokens: 1,
            generatedAt: "2026-07-10T00:10:02.000Z",
        });
        const packet = buildWorkerContextPacket({
            group: { id: groupId, name: "phase136-pressure-provenance", members: [{ project: targetProject }] },
            project: targetProject,
            task: "继续 PHASE136_PRESSURE_PROVENANCE_PRE_DISPATCH_SENTINEL over_budget",
            memory: bundle,
            contextUsageOptions: { maxTokens: 90_000 },
        });
        const rendered = renderWorkerContextPacket(packet);
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            task: "继续 PHASE136_PRESSURE_PROVENANCE_PRE_DISPATCH_SENTINEL over_budget",
            assignmentId: "assignment-phase136-pre-dispatch",
            dispatchKey: "dispatch-phase136-pre-dispatch",
            taskFingerprint: "phase136-pressure-provenance-pre-dispatch",
            worker_context_packet: packet,
        }, { at: "2026-07-10T00:10:03.000Z" }) || {};
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T00:10:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_memory_provenance_receipt_pre_dispatch_discipline"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_memory_provenance_receipt_pre_dispatch_discipline") || {};
        const discipline = bundle.pressure_memory_provenance_receipt_discipline || {};
        const packetDiscipline = packet.pressure_memory_provenance_receipt_discipline || {};
        const checks = {
            bundleBuildsDiscipline: discipline.schema === "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1"
                && discipline.active === true
                && Number(discipline.docCount || 0) >= 1
                && JSON.stringify(discipline.exampleRows || []).includes("currentSourceVerified"),
            packetCarriesDisciplineAndAcceptance: packetDiscipline.schema === "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1"
                && packet.acceptance?.memory_provenance_usage_required === true
                && packet.acceptance?.pressure_memory_provenance_receipt_required === true
                && packet.context_usage?.categories?.some((item) => item.id === "pressure_memory_provenance_receipt_discipline" && item.required === true && Number(item.tokens || 0) > 0),
            renderedPacketContainsCopyableReceiptExample: rendered.includes("Pressure memory provenance receipt discipline")
                && rendered.includes("Example CCM_AGENT_RECEIPT.memoryProvenanceUsage")
                && rendered.includes("repairStatus")
                && rendered.includes("repairGapType")
                && rendered.includes("currentSourceVerified"),
            bindingRecordsPreDispatchDiscipline: binding.worker_context_packet_pressure_memory_provenance_receipt_discipline?.schema === "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1"
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_pressure_memory_provenance_receipt_discipline === true
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_memory_provenance_usage_example === true,
            reportPassesPreDispatchDiscipline: report.overall?.status === "ok"
                && Number(report.overall?.checkedPacketCount || 0) === 1
                && Number(report.overall?.passedPacketCount || 0) === 1
                && Number(report.overall?.requiredDocCount || 0) >= 1
                && Number(report.overall?.renderedCoveredCount || 0) === 1,
            qualityCheckExposesPreDispatchDiscipline: qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
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
            discipline: {
                docCount: discipline.docCount || 0,
                requiredFields: discipline.requiredFields || [],
            },
            binding: {
                binding_id: binding.binding_id || "",
                packet_id: binding.worker_context_packet_id || "",
            },
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`]) {
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
function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest() {
    const groupId = `memory-center-pressure-provenance-post-dispatch-compliance-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const relPath = "worker-context-usage-pressure-discipline.md";
        const repairWorkItemId = "cgpru-phase137-post-dispatch-compliance";
        const pressureDoc = {
            rel_path: relPath,
            name: "WorkerContextPacket context usage pressure discipline",
            type: "feedback",
            pressure_status: "over_budget",
            provenance_status: "disputed_under_repair",
            repair_work_item_id: repairWorkItemId,
            repair_status: "pending",
            repair_gap_type: "recommendation_conflict",
            requires_memory_provenance_usage: true,
            pressure_usage_matches: [{
                    rel_path: relPath,
                    name: "WorkerContextPacket context usage pressure discipline",
                    target_project: "api",
                    recommendation: "promote_pressure_recall",
                    provenance_status: "disputed_under_repair",
                    repair_work_item_id: repairWorkItemId,
                    repair_status: "pending",
                    repair_gap_type: "recommendation_conflict",
                    repair_open: true,
                }],
        };
        const discipline = {
            schema: "ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1",
            version: 1,
            active: true,
            source: "typed_memory_pressure_repair_provenance",
            targetProject: "api",
            docCount: 1,
            requiredFields: ["relPath", "usageState", "provenanceStatus", "repairWorkItemId", "repairStatus", "repairGapType", "currentSourceVerified"],
            rows: [{
                    relPath,
                    rel_path: relPath,
                    name: "WorkerContextPacket context usage pressure discipline",
                    provenanceStatus: "disputed_under_repair",
                    provenance_status: "disputed_under_repair",
                    repairWorkItemId,
                    repair_work_item_id: repairWorkItemId,
                    repairStatus: "pending",
                    repair_status: "pending",
                    repairGapType: "recommendation_conflict",
                    repair_gap_type: "recommendation_conflict",
                }],
            exampleRows: [{
                    relPath,
                    usageState: "used",
                    provenanceStatus: "disputed_under_repair",
                    repairWorkItemId,
                    repairStatus: "pending",
                    repairGapType: "recommendation_conflict",
                    currentSourceVerified: true,
                }],
        };
        const baseEntry = (suffix, receipt = {}) => ({
            schema: "ccm-worker-context-packet-assignment-binding-v1",
            binding_id: `binding-phase137-${suffix}`,
            groupId,
            source: "worker_context_packet_pre_dispatch_gate",
            project: "api",
            agent_type: "codex",
            assignment_id: `assignment-phase137-${suffix}`,
            dispatch_key: `dispatch-phase137-${suffix}`,
            task_fingerprint: `phase137-${suffix}`,
            worker_context_packet_id: `wcp-phase137-${suffix}`,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: `wcp-phase137-${suffix}`,
                project: "api",
                status: "over_budget",
                pressure: 116,
                total_tokens: 104_000,
                max_tokens: 90_000,
                free_tokens: -27_000,
                autocompact_buffer_tokens: 13_000,
                categories: [
                    { id: "pressure_memory_provenance_receipt_discipline", name: "Pressure memory provenance receipt discipline", required: true, included: true, tokens: 120, chars: 360, source: "typed-memory-pressure-provenance" },
                    { id: "verification_and_acceptance", name: "Verification and acceptance", required: true, included: true, tokens: 100, chars: 300 },
                ],
            },
            worker_context_packet_acceptance: {
                receipt_required: true,
                memory_provenance_usage_required: true,
                pressure_memory_provenance_receipt_required: true,
            },
            worker_context_packet_pressure_memory_provenance_receipt_discipline: discipline,
            worker_context_packet_typed_memory_pressure_recall: {
                schema: "ccm-worker-context-packet-typed-memory-pressure-recall-v1",
                active: true,
                pressure_status: "over_budget",
                boosted_count: 1,
                recalled_count: 1,
                docs: [pressureDoc],
            },
            worker_context_packet_render_probe: {
                packet_id: `wcp-phase137-${suffix}`,
                rendered_flags: {
                    has_pressure_memory_provenance_receipt_discipline: true,
                    has_memory_provenance_usage_example: true,
                },
                rendered_excerpt: "Pressure memory provenance receipt discipline\nExample CCM_AGENT_RECEIPT.memoryProvenanceUsage currentSourceVerified repairStatus repairGapType",
            },
            worker_context_packet_receipt: receipt,
            dispatch_ready: true,
            should_create_real_task: true,
            at: "2026-07-10T00:20:00.000Z",
        });
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T00:20:00.000Z",
            bindingCount: 3,
            workerContextPacketBindingCount: 3,
            entries: [
                baseEntry("ok", {
                    agent: "api",
                    project: "api",
                    status: "done",
                    worker_context_packet_id: "wcp-phase137-ok",
                    memoryUsed: [`${relPath}; current source verified`],
                    memoryProvenanceUsage: [{
                            relPath,
                            usageState: "used",
                            provenanceStatus: "disputed_under_repair",
                            repairWorkItemId,
                            repairStatus: "pending",
                            repairGapType: "recommendation_conflict",
                            currentSourceVerified: true,
                        }],
                    summary: "Compliant pressure provenance receipt.",
                }),
                baseEntry("missing-usage", {
                    agent: "api",
                    project: "api",
                    status: "done",
                    worker_context_packet_id: "wcp-phase137-missing-usage",
                    memoryUsed: [`${relPath}; used pressure memory`],
                    summary: "Used pressure memory but omitted structured memoryProvenanceUsage.",
                }),
                baseEntry("current-source-gap", {
                    agent: "api",
                    project: "api",
                    status: "done",
                    worker_context_packet_id: "wcp-phase137-current-source-gap",
                    memoryUsed: [`${relPath}; used pressure memory`],
                    memoryProvenanceUsage: [{
                            relPath,
                            usageState: "used",
                            provenanceStatus: "disputed_under_repair",
                            repairWorkItemId,
                            repairStatus: "pending",
                            repairGapType: "recommendation_conflict",
                            currentSourceVerified: false,
                        }],
                    summary: "Structured receipt present but currentSourceVerified=false.",
                }),
            ],
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T00:20:01.000Z",
            frequentThreshold: 2,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_memory_provenance_receipt_post_dispatch_compliance"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_memory_provenance_receipt_post_dispatch_compliance") || {};
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, buildGroupTypedMemoryRecall, } = require("../collaboration/group-memory-index");
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const doc = (docs || []).find((item) => item.source === "auto:pressure-provenance-pre-dispatch-compliance-distillation") || {};
        const recall = buildGroupTypedMemoryRecall(groupId, "pressure provenance pre-dispatch compliance codex api memoryProvenanceUsage currentSourceVerified", {
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
        const attribution = report.groups?.[0]?.attributions?.[0] || {};
        const checks = {
            reportAttributesPostDispatchFailures: report.overall?.status === "fail"
                && Number(report.overall?.checkedPacketCount || 0) === 3
                && Number(report.overall?.compliantPacketCount || 0) === 1
                && Number(report.overall?.violationPacketCount || 0) === 2
                && attribution.agent_type === "codex"
                && attribution.project === "api"
                && Number(attribution.violation_count || 0) === 2
                && attribution.frequent_violation === true,
            qualityCheckFailsWithActionableGaps: qualityCheck.status === "fail"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 0
                && (qualityCheck.gaps || []).some((gap) => /memoryProvenanceUsage|currentSourceVerified|pressure repair provenance/i.test(String(gap.reason || ""))),
            typedMemoryArchivesFrequentAttribution: archive.schema === "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1"
                && Number(archive.archived_count || 0) >= 2
                && Number(archive.frequent_attribution_count || 0) >= 1
                && (archive.attributions || []).some((row) => row.agent_type === "codex" && row.project === "api" && row.frequent === true),
            typedDocContainsExecutorPolicy: doc.source === "auto:pressure-provenance-pre-dispatch-compliance-distillation"
                && String(doc.body || "").includes("agentType=codex")
                && String(doc.body || "").includes("project=api")
                && String(doc.body || "").includes("memoryProvenanceUsage")
                && String(doc.body || "").includes("currentSourceVerified"),
            recallFindsPostDispatchComplianceMemory: /codex|api|memoryProvenanceUsage|currentSourceVerified/i.test(recallText),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            attribution,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            archive: {
                archived_count: archive.archived_count || 0,
                frequent_attribution_count: archive.frequent_attribution_count || 0,
            },
            doc: {
                relPath: doc.relPath || "",
                source: doc.source || "",
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
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-dispatch-policy-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { distillPressureProvenancePreDispatchComplianceToTypedMemory, readGroupTypedMemoryDistillationLedger, getGroupTypedMemoryDir, } = require("../collaboration/group-memory-index");
        const { buildAgentMemoryContextBundle, } = require("../collaboration/memory");
        const { buildSelfContainedWorkerHandoff, renderSelfContainedWorkerHandoff, } = require("../../agents/worker-handoff");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, } = require("../collaboration/group-orchestrator");
        const relPath = "pressure-provenance-feedback-policy.md";
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase138-missing-usage",
                    binding_id: "binding-phase138-missing-usage",
                    project: "api",
                    agent_type: "codex",
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase138-current-source-gap",
                    binding_id: "binding-phase138-current-source-gap",
                    project: "api",
                    agent_type: "codex",
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T00:40:00.000Z",
        });
        const bundle = buildAgentMemoryContextBundle(groupId, "api", "验证 pressure provenance feedback dispatch policy 会注入 WorkerContextPacket", {
            agentType: "codex",
            maxTypedMemory: 8,
        });
        const handoff = buildSelfContainedWorkerHandoff({
            group: { id: groupId, name: "Phase 138 Feedback Policy", members: [{ project: "api", agent: "codex" }] },
            project: "api",
            task: "验证 pressure provenance feedback dispatch policy 会注入 WorkerContextPacket",
            agentType: "codex",
            memory: bundle,
            traceId: "trace-phase138-feedback-policy",
            taskId: "task-phase138-feedback-policy",
        });
        const rendered = renderSelfContainedWorkerHandoff(handoff);
        const packet = handoff.worker_context_packet || {};
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            project: "api",
            agentType: "codex",
            assignmentId: "assignment-phase138-feedback-policy",
            dispatchKey: "dispatch-phase138-feedback-policy",
            taskFingerprint: "phase138 feedback policy",
            worker_context_packet: packet,
        }) || {};
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackDispatchPolicyReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_dispatch_policy"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_dispatch_policy") || {};
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
        const policy = packet.pressure_provenance_dispatch_feedback_policy || {};
        const category = (packet.context_usage?.categories || []).find((item) => item.id === "pressure_provenance_dispatch_feedback_policy") || {};
        const bindingPolicy = binding.worker_context_packet_pressure_provenance_dispatch_feedback_policy || {};
        const checks = {
            archiveSurvivesContextBundleDistillation: archive.schema === "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1"
                && Number(archive.frequent_attribution_count || 0) >= 1,
            bundleCarriesFeedbackPolicy: bundle.pressure_provenance_dispatch_feedback_policy?.active === true
                && String(bundle.rendered_text || "").includes("pressure provenance dispatch feedback policy"),
            workerPacketCarriesFeedbackPolicy: policy.schema === "ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1"
                && policy.active === true
                && packet.acceptance?.pressure_provenance_feedback_ack_required === true
                && packet.acceptance?.pressure_provenance_feedback_final_receipt_review_required === true,
            contextUsageAccountsFeedbackPolicy: category.required === true
                && category.included === true
                && String(category.source || "") === "typed-feedback-memory",
            renderedHandoffShowsFeedbackPolicy: rendered.includes("Pressure provenance dispatch feedback policy")
                && rendered.includes("memoryProvenanceUsage"),
            bindingPersistsFeedbackPolicy: bindingPolicy.schema === "ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1"
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_pressure_provenance_dispatch_feedback_policy === true,
            memoryCenterQualityPasses: report.overall?.status === "ok"
                && Number(report.overall?.frequentAttributionCount || 0) === 1
                && Number(report.overall?.coveredAttributionCount || 0) === 1
                && qualityCheck.status === "ok",
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
            policy: {
                active: policy.active === true,
                action: policy.action || "",
                agentType: policy.agentType || policy.agent_type || "",
                targetProject: policy.targetProject || policy.target_project || "",
            },
            binding: {
                binding_id: binding.binding_id || "",
                packet_id: binding.worker_context_packet_id || "",
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
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
        try {
            const { getGroupMemoryFile } = require("../collaboration/memory");
            const groupFile = getGroupMemoryFile(groupId);
            if (groupFile && fs.existsSync(groupFile))
                fs.unlinkSync(groupFile);
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-recall-risk-gating-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const targetProject = "api";
    const agentType = "codex";
    const riskRelPath = "worker-context-pressure-risk-under-repair.md";
    const normalRelPath = "worker-context-pressure-normal.md";
    const repairHints = [{
            source: "cross_group_pressure_recall_usage_repair",
            component: "cross_group_pressure_recall_usage",
            work_item_id: "phase139-pressure-feedback-risk-repair",
            status: "pending",
            priority: "high",
            cross_group_pressure_recall_usage_gap_type: "recommendation_conflict",
            cross_group_pressure_recall_usage_rel_path: riskRelPath,
            target_project: targetProject,
            reason: "selftest disputed pressure memory must be repair-first or downranked when feedback policy is active",
        }];
    try {
        const { buildGroupTypedMemoryRecall, buildPressureProvenancePreDispatchComplianceDispatchPolicy, distillPressureProvenancePreDispatchComplianceToTypedMemory, recordGroupTypedMemoryPressureRecallUsageLedger, renderGroupTypedMemoryRecall, upsertGroupTypedMemoryDocument, } = require("../collaboration/group-memory-index");
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase139-missing-usage",
                    binding_id: "binding-phase139-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [riskRelPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase139-current-source-gap",
                    binding_id: "binding-phase139-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [riskRelPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T00:55:00.000Z",
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "worker-context-pressure-risk-under-repair",
            name: "WorkerContextPacket pressure risk under repair",
            description: "Pressure MEMORY.md with disputed_under_repair provenance requires current-source verification.",
            source: "selftest:phase139-pressure-feedback-risk-gating",
            body: [
                "WorkerContextPacket context_usage pressure memory.",
                "PHASE139_PRESSURE_RISK_SENTINEL disputed_under_repair repair_work_item_id=phase139-pressure-feedback-risk-repair.",
                "memoryProvenanceUsage currentSourceVerified must be required before using this risky pressure memory.",
            ].join("\n"),
        });
        upsertGroupTypedMemoryDocument(groupId, {
            type: "reference",
            slug: "worker-context-pressure-normal",
            name: "WorkerContextPacket pressure normal guidance",
            description: "Normal pressure MEMORY.md without under-repair provenance remains available.",
            source: "selftest:phase139-pressure-feedback-risk-gating",
            body: [
                "WorkerContextPacket context_usage pressure memory.",
                "PHASE139_PRESSURE_NORMAL_SENTINEL compact_recommended free_tokens autocompact_buffer.",
                "This normal pressure memory has local_group_evidence and no repair_open marker.",
            ].join("\n"),
        });
        recordGroupTypedMemoryPressureRecallUsageLedger(groupId, {
            targetProject,
            taskId: "phase139-pressure-feedback-recall-risk-gating",
            executionId: "phase139-pressure-feedback-recall-risk-gating",
            agent: targetProject,
            generatedAt: "2026-07-10T00:55:01.000Z",
            rows: [
                {
                    rel_path: riskRelPath,
                    name: "WorkerContextPacket pressure risk under repair",
                    type: "reference",
                    worker_context_packet_id: "wcp-phase139-risk",
                    pressure_status: "over_budget",
                    usage_state: "used",
                    provenance_status: "disputed_under_repair",
                    repair_work_item_id: "phase139-pressure-feedback-risk-repair",
                    repair_status: "pending",
                    repair_gap_type: "recommendation_conflict",
                    reason: "selftest risky pressure memory was previously surfaced",
                },
                {
                    rel_path: normalRelPath,
                    name: "WorkerContextPacket pressure normal guidance",
                    type: "reference",
                    worker_context_packet_id: "wcp-phase139-normal",
                    pressure_status: "over_budget",
                    usage_state: "verified",
                    reason: "selftest normal pressure memory stays useful",
                },
            ],
        });
        const policy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T00:55:02.000Z",
        });
        const recall = buildGroupTypedMemoryRecall(groupId, "WorkerContextPacket context_usage pressure free_tokens 普通实现任务", {
            targetProject,
            forceWorkerContextPressureRecall: true,
            pressureProvenanceDispatchFeedbackPolicy: policy,
            workerContextPressureRecallUsageRepairHints: repairHints,
            workerContextPressure: {
                status: "over_budget",
                pressure: 103,
                reason: "phase139 selftest pressure recall",
            },
            max: 8,
            snippetChars: 320,
        });
        const rendered = renderGroupTypedMemoryRecall(recall);
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            workerContextPressureRecallUsageRepairHints: repairHints,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_recall_risk_gating"],
            groupIds: [groupId],
            refresh: true,
            frequentThreshold: 2,
            workerContextPressureRecallUsageRepairHints: repairHints,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_recall_risk_gating") || {};
        const recalled = Array.isArray(recall.recalled) ? recall.recalled : [];
        const diagnostics = Array.isArray(recall.diagnostics) ? recall.diagnostics : [];
        const normalDoc = recalled.find((doc) => doc.relPath === normalRelPath || doc.rel_path === normalRelPath) || {};
        const riskDoc = recalled.find((doc) => doc.relPath === riskRelPath || doc.rel_path === riskRelPath) || {};
        const riskDiagnostic = diagnostics.find((doc) => doc.relPath === riskRelPath || doc.rel_path === riskRelPath) || {};
        const riskEvidence = riskDoc.relPath ? riskDoc : riskDiagnostic;
        const riskFeedback = riskEvidence.workerContextPressureFeedbackPolicy || riskEvidence.worker_context_pressure_feedback_policy || {};
        const scoring = recall.workerContextPressureFeedbackPolicyScoring || {};
        const checks = {
            policyActivatesFromFrequentAttribution: policy.active === true
                && policy.agentType === agentType
                && policy.targetProject === targetProject,
            recallScoresFeedbackRisk: scoring.active === true
                && Number(scoring.risk_doc_count || 0) >= 1
                && Number(scoring.deprioritized_count || 0) >= 1,
            riskyPressureMemoryDownranked: riskFeedback.risk_doc === true
                && Number(riskFeedback.adjustment || 0) < 0
                && (!!normalDoc.relPath && (!riskDoc.relPath || Number(normalDoc.score || 0) > Number(riskDoc.score || 0))),
            normalPressureMemoryRemainsAvailable: normalDoc.relPath === normalRelPath
                && !(normalDoc.workerContextPressureFeedbackPolicy || {}).risk_doc,
            renderedMentionsFeedbackPolicyGating: rendered.includes("pressure feedback policy gating"),
            memoryCenterQualityPasses: report.overall?.status === "ok"
                && Number(report.overall?.riskAttributionCount || 0) === 1
                && Number(report.overall?.coveredRiskAttributionCount || 0) === 1
                && qualityCheck.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            scoring,
            report: report.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            risk: {
                relPath: riskEvidence.relPath || riskEvidence.rel_path || "",
                score: riskEvidence.score,
                reason: riskEvidence.reason || "",
                adjustment: riskFeedback.adjustment || 0,
                action: riskFeedback.action || "",
            },
            normal: {
                relPath: normalDoc.relPath || "",
                score: normalDoc.score,
            },
        };
    }
    finally {
        try {
            const { getGroupTypedMemoryDir, getGroupTypedMemoryPressureRecallUsageLedgerFile, } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
            const usageFile = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
            if (usageFile && fs.existsSync(usageFile))
                fs.unlinkSync(usageFile);
        }
        catch { }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-policy-recovery-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provenance-feedback-recovery.md";
    try {
        const { buildPressureProvenancePreDispatchComplianceDispatchPolicy, distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory, distillPressureProvenancePreDispatchComplianceToTypedMemory, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const { buildAgentMemoryContextBundle, } = require("../collaboration/memory");
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase140-missing-usage",
                    binding_id: "binding-phase140-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase140-current-source-gap",
                    binding_id: "binding-phase140-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T01:10:00.000Z",
        });
        const activePolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:10:01.000Z",
        });
        const recovery = distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase140-recovery-1",
                    binding_id: "binding-phase140-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase140-recovery-2",
                    binding_id: "binding-phase140-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T01:10:02.000Z",
        });
        const recoveredPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:10:03.000Z",
        });
        const bundle = buildAgentMemoryContextBundle(groupId, targetProject, "验证 pressure provenance feedback policy recovery 不再永久惩罚", {
            agentType,
            maxTypedMemory: 8,
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackPolicyRecoveryReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_policy_recovery"],
            groupIds: [groupId],
            refresh: true,
            frequentThreshold: 2,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_policy_recovery") || {};
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const recoveryArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const recoveryDoc = (docs || []).find((doc) => doc.source === "auto:pressure-provenance-compliance-recovery-distillation") || {};
        const recoveredRow = (recoveredPolicy.policyRows || [])[0] || {};
        const checks = {
            policyActiveBeforeRecovery: activePolicy.active === true
                && Number(activePolicy.frequentViolationAttributionCount || 0) === 1,
            recoveryArchiveWritten: recoveryArchive.schema === "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1"
                && Number(recoveryArchive.compliant_count || 0) >= 2
                && Number(recovery.compliantCount || 0) >= 2,
            typedRecoveryDocWritten: recoveryDoc.source === "auto:pressure-provenance-compliance-recovery-distillation"
                && String(recoveryDoc.body || "").includes("compliant")
                && String(recoveryDoc.body || "").includes("Recovery policy"),
            policyRecoveredBelowThreshold: recoveredPolicy.active === false
                && recoveredPolicy.action === "monitor_recovered_pressure_memory_provenance_receipt_contract"
                && Number(recoveredPolicy.recoveredAttributionCount || 0) === 1
                && recoveredRow.recovered === true
                && Number(recoveredRow.effective_violation_count || 0) === 0
                && Number(recoveredRow.recovery_credit || 0) >= 2,
            bundleDoesNotInjectRecoveredActivePolicy: !bundle.pressure_provenance_dispatch_feedback_policy
                && !String(bundle.rendered_text || "").includes("pressure provenance dispatch feedback policy：agentType=codex"),
            memoryCenterQualityPasses: report.overall?.status === "ok"
                && Number(report.overall?.recoveredAttributionCount || 0) === 1
                && qualityCheck.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            activePolicy: {
                active: activePolicy.active,
                action: activePolicy.action,
                frequentViolationAttributionCount: activePolicy.frequentViolationAttributionCount,
            },
            recoveredPolicy: {
                active: recoveredPolicy.active,
                action: recoveredPolicy.action,
                recoveredAttributionCount: recoveredPolicy.recoveredAttributionCount,
                row: recoveredRow,
            },
            recovery: {
                archivedCount: recovery.archivedCount || 0,
                compliantCount: recovery.compliantCount || 0,
            },
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
        try {
            const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            const { getGroupMemoryFile } = require("../collaboration/memory");
            const groupFile = getGroupMemoryFile(groupId);
            if (groupFile && fs.existsSync(groupFile))
                fs.unlinkSync(groupFile);
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-policy-relapse-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provenance-feedback-relapse.md";
    try {
        const { buildPressureProvenancePreDispatchComplianceDispatchPolicy, distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory, distillPressureProvenancePreDispatchComplianceToTypedMemory, readGroupTypedMemoryDistillationLedger, } = require("../collaboration/group-memory-index");
        const { buildAgentMemoryContextBundle, getGroupMemoryFile, } = require("../collaboration/memory");
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase141-initial-missing-usage",
                    binding_id: "binding-phase141-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase141-initial-current-source-gap",
                    binding_id: "binding-phase141-initial-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T01:20:00.000Z",
        });
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase141-recovery-1",
                    binding_id: "binding-phase141-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase141-recovery-2",
                    binding_id: "binding-phase141-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T01:20:01.000Z",
        });
        const recoveredPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:20:02.000Z",
        });
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase141-relapse-missing-usage",
                    binding_id: "binding-phase141-relapse-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T01:20:03.000Z",
        });
        const relapsedPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:20:04.000Z",
        });
        const bundle = buildAgentMemoryContextBundle(groupId, targetProject, "验证 recovered pressure provenance attribution relapse 会重新激活 policy", {
            agentType,
            maxTypedMemory: 8,
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_policy_relapse"],
            groupIds: [groupId],
            refresh: true,
            frequentThreshold: 2,
        });
        const qualityCheck = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_policy_relapse") || {};
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const relapseRow = (relapsedPolicy.policyRows || [])[0] || {};
        const checks = {
            recoveredBeforeRelapse: recoveredPolicy.active === false
                && Number(recoveredPolicy.recoveredAttributionCount || 0) === 1,
            relapsedPolicyReactivates: relapsedPolicy.active === true
                && relapsedPolicy.action === "reactivate_pressure_memory_provenance_receipt_contract_after_recovery_relapse"
                && Number(relapsedPolicy.relapsedAttributionCount || 0) === 1,
            relapsedRowCarriesPostRecoveryEvidence: relapseRow.relapsed === true
                && Number(relapseRow.post_recovery_violation_count || 0) === 1
                && String(relapseRow.recovery_streak_broken_at || "").includes("2026-07-10T01:20:03"),
            bundleInjectsRelapsedPolicy: bundle.pressure_provenance_dispatch_feedback_policy?.active === true
                && String(bundle.rendered_text || "").includes("恢复后复发=1"),
            memoryCenterQualityPasses: report.overall?.status === "ok"
                && Number(report.overall?.relapseAttributionCount || 0) === 1
                && Number(report.overall?.activeRelapseAttributionCount || 0) === 1
                && qualityCheck.status === "ok",
            archivesPreserveRecoveryAndViolationFacts: !!ledger.pressureProvenancePreDispatchComplianceArchive?.schema
                && !!ledger.pressureProvenancePreDispatchComplianceRecoveryArchive?.schema,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            recoveredPolicy: {
                active: recoveredPolicy.active,
                action: recoveredPolicy.action,
                recoveredAttributionCount: recoveredPolicy.recoveredAttributionCount,
            },
            relapsedPolicy: {
                active: relapsedPolicy.active,
                action: relapsedPolicy.action,
                relapsedAttributionCount: relapsedPolicy.relapsedAttributionCount,
                row: relapseRow,
            },
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
        try {
            const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            const { getGroupMemoryFile } = require("../collaboration/memory");
            const groupFile = getGroupMemoryFile(groupId);
            if (groupFile && fs.existsSync(groupFile))
                fs.unlinkSync(groupFile);
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-policy-repair-work-items-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provenance-feedback-repair-work-item.md";
    try {
        const { buildPressureProvenancePreDispatchComplianceDispatchPolicy, distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory, distillPressureProvenancePreDispatchComplianceToTypedMemory, } = require("../collaboration/group-memory-index");
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase142-initial-missing-usage",
                    binding_id: "binding-phase142-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase142-initial-current-source-gap",
                    binding_id: "binding-phase142-initial-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T01:30:00.000Z",
        });
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase142-recovery-1",
                    binding_id: "binding-phase142-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase142-recovery-2",
                    binding_id: "binding-phase142-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T01:30:01.000Z",
        });
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase142-relapse-missing-usage",
                    binding_id: "binding-phase142-relapse-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T01:30:02.000Z",
        });
        const relapsedPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:30:03.000Z",
        });
        const repairReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:30:03.000Z",
        });
        const repairQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_policy_repair_work_items"],
            groupIds: [groupId],
            refresh: true,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:30:03.000Z",
        });
        const repairCheck = (repairQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_policy_repair_work_items") || {};
        const openLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const openRepairItem = (openLedger.items || []).find((item) => item.source === "worker_context_pressure_provenance_feedback_policy_repair" && (0, memory_control_center_1.replayRepairWorkItemOpen)(item.status)) || {};
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase142-post-relapse-recovery",
                    binding_id: "binding-phase142-post-relapse-recovery",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T01:30:04.000Z",
        });
        const recoveredPolicy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:30:05.000Z",
        });
        const resolvedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            generatedAt: "2026-07-10T01:30:05.000Z",
        });
        const resolvedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedRepairItem = (resolvedLedger.items || []).find((item) => (item.id || item.work_item_id) === (openRepairItem.id || openRepairItem.work_item_id)) || {};
        const checks = {
            relapsedPolicyIsActionable: relapsedPolicy.active === true
                && Number(relapsedPolicy.relapsedAttributionCount || 0) === 1,
            repairReportCreatesOpenItem: repairReport.overall?.status === "ok"
                && Number(repairReport.overall?.requiredActionCount || 0) === 1
                && Number(repairReport.overall?.coveredItemCount || 0) === 1
                && repairCheck.status === "ok",
            openItemCarriesPressurePolicyMetadata: openRepairItem.source === "worker_context_pressure_provenance_feedback_policy_repair"
                && openRepairItem.pressure_provenance_relapsed === true
                && openRepairItem.pressure_provenance_feedback_agent_type === agentType
                && openRepairItem.target_project === targetProject
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(openRepairItem.status),
            postRelapseRecoveryDisarmsPolicy: recoveredPolicy.active === false
                && recoveredPolicy.action === "monitor_recovered_pressure_memory_provenance_receipt_contract",
            resolvedReportCompletesItem: resolvedReport.overall?.status === "empty"
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(completedRepairItem.status) === "completed"
                && completedRepairItem.resolutionReason === "pressure_provenance_feedback_policy_recovered_or_no_longer_active",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repairReport: repairReport.overall,
            resolvedReport: resolvedReport.overall,
            repairCheck: {
                id: repairCheck.id || "",
                status: repairCheck.status || "",
                checked: repairCheck.checked || 0,
                passed: repairCheck.passed || 0,
            },
            openRepairItem: {
                id: openRepairItem.id || openRepairItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(openRepairItem.status),
                priority: openRepairItem.priority || "",
                relapsed: openRepairItem.pressure_provenance_relapsed === true,
            },
            completedRepairItem: {
                id: completedRepairItem.id || completedRepairItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedRepairItem.status),
                resolutionReason: completedRepairItem.resolutionReason || "",
            },
        };
    }
    finally {
        try {
            const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (workItemsFile && fs.existsSync(workItemsFile))
                fs.unlinkSync(workItemsFile);
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-compliance-health-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const targetProject = "api";
    const agentType = "cursor";
    const relPath = "pressure-provenance-feedback-compliance-health.md";
    try {
        const { distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory, distillPressureProvenancePreDispatchComplianceToTypedMemory, } = require("../collaboration/group-memory-index");
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase143-initial-missing-usage",
                    binding_id: "binding-phase143-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase143-initial-current-source-gap",
                    binding_id: "binding-phase143-initial-current-source-gap",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T02:00:00.000Z",
        });
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase143-recovery-1",
                    binding_id: "binding-phase143-recovery-1",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase143-recovery-2",
                    binding_id: "binding-phase143-recovery-2",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T02:00:01.000Z",
        });
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase143-relapse-missing-usage",
                    binding_id: "binding-phase143-relapse-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T02:00:02.000Z",
        });
        const activeReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackComplianceHealthReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            generatedAt: "2026-07-10T02:00:03.000Z",
        });
        const activeQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_compliance_health"],
            groupIds: [groupId],
            refresh: true,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T02:00:03.000Z",
        });
        const activeCheck = (activeQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_compliance_health") || {};
        const activeGroup = activeReport.groups?.[0] || {};
        const activeRow = (activeGroup.rows || [])[0] || {};
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase143-post-relapse-recovery",
                    binding_id: "binding-phase143-post-relapse-recovery",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T02:00:04.000Z",
        });
        const recoveredReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackComplianceHealthReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            generatedAt: "2026-07-10T02:00:05.000Z",
        });
        const recoveredQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_compliance_health"],
            groupIds: [groupId],
            refresh: true,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T02:00:05.000Z",
        });
        const recoveredCheck = (recoveredQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_compliance_health") || {};
        const recoveredGroup = recoveredReport.groups?.[0] || {};
        const recoveredRow = (recoveredGroup.rows || [])[0] || {};
        const checks = {
            activeHealthIsCritical: activeReport.overall?.status === "ok"
                && activeReport.overall?.riskStatus === "critical"
                && activeRow.health_status === "critical"
                && activeRow.relapsed === true,
            activeHealthCarriesDispatchRecommendation: activeRow.dispatch_recommendation === "hold_child_dispatch_until_pressure_provenance_repair",
            activeHealthCarriesOpenRepairBacklog: Number(activeRow.open_repair_item_count || 0) >= 1
                && activeRow.repair_backlog_state === "open"
                && activeCheck.status === "ok",
            recoveredHealthMonitors: recoveredReport.overall?.status === "ok"
                && recoveredReport.overall?.riskStatus === "monitor"
                && recoveredRow.health_status === "monitor"
                && recoveredRow.recovered === true,
            recoveredHealthShowsRepairResolved: Number(recoveredRow.open_repair_item_count || 0) === 0
                && Number(recoveredRow.completed_repair_item_count || 0) >= 1
                && recoveredRow.repair_backlog_state === "resolved"
                && recoveredCheck.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            active: {
                overall: activeReport.overall,
                row: {
                    agent_type: activeRow.agent_type || "",
                    project: activeRow.project || "",
                    health_status: activeRow.health_status || "",
                    dispatch_recommendation: activeRow.dispatch_recommendation || "",
                    open_repair_item_count: activeRow.open_repair_item_count || 0,
                    repair_backlog_state: activeRow.repair_backlog_state || "",
                },
                check: {
                    id: activeCheck.id || "",
                    status: activeCheck.status || "",
                    checked: activeCheck.checked || 0,
                    passed: activeCheck.passed || 0,
                },
            },
            recovered: {
                overall: recoveredReport.overall,
                row: {
                    agent_type: recoveredRow.agent_type || "",
                    project: recoveredRow.project || "",
                    health_status: recoveredRow.health_status || "",
                    dispatch_recommendation: recoveredRow.dispatch_recommendation || "",
                    open_repair_item_count: recoveredRow.open_repair_item_count || 0,
                    completed_repair_item_count: recoveredRow.completed_repair_item_count || 0,
                    repair_backlog_state: recoveredRow.repair_backlog_state || "",
                },
                check: {
                    id: recoveredCheck.id || "",
                    status: recoveredCheck.status || "",
                    checked: recoveredCheck.checked || 0,
                    passed: recoveredCheck.passed || 0,
                },
            },
        };
    }
    finally {
        try {
            const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (workItemsFile && fs.existsSync(workItemsFile))
                fs.unlinkSync(workItemsFile);
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest() {
    const groupId = `memory-center-pressure-provenance-feedback-provider-dispatch-advisory-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const targetProject = "api";
    const riskyAgentType = "codex";
    const saferAgentType = "cursor";
    const relPath = "pressure-provenance-provider-dispatch-advisory.md";
    const providerCandidates = [
        { groupId, project: targetProject, agent_type: riskyAgentType, configured: true, current: true, source: "selftest-current-config" },
        { groupId, project: targetProject, agent_type: saferAgentType, configured: false, source: "selftest-alternative-runner" },
    ];
    try {
        const { distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory, distillPressureProvenancePreDispatchComplianceToTypedMemory, } = require("../collaboration/group-memory-index");
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase144-initial-missing-usage",
                    binding_id: "binding-phase144-initial-missing-usage",
                    project: targetProject,
                    agent_type: riskyAgentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase144-initial-current-source-gap",
                    binding_id: "binding-phase144-initial-current-source-gap",
                    project: targetProject,
                    agent_type: riskyAgentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    current_source_verified_gap: true,
                    gaps: [{ code: "receipt_currentSourceVerified", reason: "currentSourceVerified=false" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T02:30:00.000Z",
        });
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase144-recovery-1",
                    binding_id: "binding-phase144-recovery-1",
                    project: targetProject,
                    agent_type: riskyAgentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
                {
                    groupId,
                    packet_id: "wcp-phase144-recovery-2",
                    binding_id: "binding-phase144-recovery-2",
                    project: targetProject,
                    agent_type: riskyAgentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T02:30:01.000Z",
        });
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase144-relapse-missing-usage",
                    binding_id: "binding-phase144-relapse-missing-usage",
                    project: targetProject,
                    agent_type: riskyAgentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                },
            ],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T02:30:02.000Z",
        });
        const activeHealthReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackComplianceHealthReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            generatedAt: "2026-07-10T02:30:03.000Z",
        });
        const activeAdvisoryReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisoryReport)({
            groupIds: [groupId],
            providerCandidates,
            complianceHealthReport: activeHealthReport,
            generatedAt: "2026-07-10T02:30:03.000Z",
        });
        const activeQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_feedback_provider_dispatch_advisory"],
            groupIds: [groupId],
            refresh: true,
            providerCandidates,
            complianceHealthReport: activeHealthReport,
            generatedAt: "2026-07-10T02:30:03.000Z",
        });
        const activeCheck = (activeQuality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_feedback_provider_dispatch_advisory") || {};
        const activeGroup = activeAdvisoryReport.groups?.[0] || {};
        const activeProject = activeGroup.projects?.[0] || {};
        const activeRiskyCandidate = (activeProject.candidates || []).find((item) => item.agent_type === riskyAgentType) || {};
        const activeSaferCandidate = (activeProject.candidates || []).find((item) => item.agent_type === saferAgentType) || {};
        distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase144-post-relapse-recovery",
                    binding_id: "binding-phase144-post-relapse-recovery",
                    project: targetProject,
                    agent_type: riskyAgentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                },
            ],
        }, {
            updatedAt: "2026-07-10T02:30:04.000Z",
        });
        const recoveredHealthReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackComplianceHealthReport)({
            groupIds: [groupId],
            frequentThreshold: 2,
            generatedAt: "2026-07-10T02:30:05.000Z",
        });
        const recoveredAdvisoryReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisoryReport)({
            groupIds: [groupId],
            providerCandidates,
            complianceHealthReport: recoveredHealthReport,
            generatedAt: "2026-07-10T02:30:05.000Z",
        });
        const recoveredGroup = recoveredAdvisoryReport.groups?.[0] || {};
        const recoveredProject = recoveredGroup.projects?.[0] || {};
        const recoveredRiskyCandidate = (recoveredProject.candidates || []).find((item) => item.agent_type === riskyAgentType) || {};
        const checks = {
            activeAdvisoryWarnsButDoesNotFailWithSaferAlternative: activeAdvisoryReport.overall?.status === "warn"
                && activeGroup.status === "warn"
                && activeProject.status === "warn",
            criticalConfiguredRunnerIsHeld: activeRiskyCandidate.health_status === "critical"
                && activeRiskyCandidate.dispatch_policy === "hold_until_repair"
                && activeProject.should_hold_configured_dispatch === true,
            saferRunnerPreferred: activeProject.preferred_agent_type === saferAgentType
                && activeSaferCandidate.dispatch_policy === "preferred"
                && Number(activeProject.safer_alternative_count || 0) >= 1,
            qualityCheckPassesAdvisoryCoverage: activeCheck.status === "ok"
                && Number(activeCheck.checked || 0) === 1
                && Number(activeCheck.passed || 0) === 1,
            recoveredAdvisoryReturnsToOk: recoveredAdvisoryReport.overall?.status === "ok"
                && recoveredGroup.status === "ok"
                && recoveredRiskyCandidate.health_status === "monitor"
                && recoveredRiskyCandidate.dispatch_policy === "allow_with_receipt_sampling",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            active: {
                overall: activeAdvisoryReport.overall,
                project: {
                    project: activeProject.project || "",
                    status: activeProject.status || "",
                    preferred_agent_type: activeProject.preferred_agent_type || "",
                    safer_alternative_count: activeProject.safer_alternative_count || 0,
                    recommendation: activeProject.recommendation || "",
                },
                riskyCandidate: {
                    agent_type: activeRiskyCandidate.agent_type || "",
                    health_status: activeRiskyCandidate.health_status || "",
                    dispatch_policy: activeRiskyCandidate.dispatch_policy || "",
                    open_repair_item_count: activeRiskyCandidate.open_repair_item_count || 0,
                },
                saferCandidate: {
                    agent_type: activeSaferCandidate.agent_type || "",
                    health_status: activeSaferCandidate.health_status || "",
                    dispatch_policy: activeSaferCandidate.dispatch_policy || "",
                },
                check: {
                    id: activeCheck.id || "",
                    status: activeCheck.status || "",
                    checked: activeCheck.checked || 0,
                    passed: activeCheck.passed || 0,
                },
            },
            recovered: {
                overall: recoveredAdvisoryReport.overall,
                project: {
                    project: recoveredProject.project || "",
                    status: recoveredProject.status || "",
                    preferred_agent_type: recoveredProject.preferred_agent_type || "",
                    recommendation: recoveredProject.recommendation || "",
                },
                riskyCandidate: {
                    agent_type: recoveredRiskyCandidate.agent_type || "",
                    health_status: recoveredRiskyCandidate.health_status || "",
                    dispatch_policy: recoveredRiskyCandidate.dispatch_policy || "",
                    completed_repair_item_count: recoveredRiskyCandidate.completed_repair_item_count || 0,
                },
            },
        };
    }
    finally {
        try {
            const { getGroupTypedMemoryDir } = require("../collaboration/group-memory-index");
            const dir = getGroupTypedMemoryDir(groupId);
            if (dir && fs.existsSync(dir))
                fs.rmSync(dir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        try {
            if (workItemsFile && fs.existsSync(workItemsFile))
                fs.unlinkSync(workItemsFile);
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest() {
    const groupId = `memory-center-pressure-provenance-provider-dispatch-decision-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const activeAdvisory = {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "critical",
        dispatch_policy: "hold_until_repair",
        should_hold_dispatch: true,
        selected_candidate: {
            schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "critical",
            dispatch_policy: "hold_until_repair",
            should_hold_dispatch: true,
            current_open_repair_item_ids: ["phase146-pressure-provider-repair"],
        },
        recommendation: "hold codex/api child-agent dispatch until pressure provenance repair closes",
    };
    const recoveredAdvisory = {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "monitor",
        dispatch_policy: "allow_with_receipt_sampling",
        should_hold_dispatch: false,
        selected_candidate: {
            schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
        },
        recommendation: "allow dispatch with receipt sampling after pressure provenance recovery",
    };
    const packetFor = (id, advisory) => ({
        schema: "ccm-worker-context-packet-v1",
        packet_id: id,
        groupId,
        project: targetProject,
        agent_type: agentType,
        task: `phase146 provider dispatch decision ${id}`,
        memory: {},
        context_usage: {
            schema: "ccm-worker-context-usage-v1",
            packet_id: id,
            project: targetProject,
            status: "ok",
            pressure: 20,
            total_tokens: 200,
            max_tokens: 2000,
            free_tokens: 1680,
            autocompact_buffer_tokens: 120,
            categories: [],
        },
        pressure_provenance_provider_dispatch_advisory: advisory,
        acceptance: {
            pressure_provenance_provider_dispatch_advisory_ack_required: true,
            pressure_provenance_provider_dispatch_hold_required: advisory.should_hold_dispatch === true,
        },
    });
    const gateFor = (packet, advisory, blocked) => ({
        schema: "ccm-worker-context-pre-dispatch-gate-v1",
        gate_id: `worker-context-pre-dispatch:${packet.packet_id}`,
        groupId,
        project: targetProject,
        worker_context_packet_id: packet.packet_id,
        pressure_status: "ok",
        dispatch_ready: !blocked,
        dispatchReady: !blocked,
        blocked,
        provider_dispatch_hold: blocked,
        pressure_provenance_provider_dispatch_advisory: advisory,
        repair_source: blocked ? "worker_context_pressure_provenance_feedback_provider_dispatch_advisory" : "",
        next_step: blocked ? "repair_pressure_provenance_provider_before_child_dispatch" : "dispatch_child_agent",
        reason: blocked ? "Pressure provenance provider dispatch hold for phase146 selftest." : "Provider recovered; dispatch with receipt sampling.",
    });
    try {
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, } = require("../collaboration/group-orchestrator");
        const activePacket = packetFor("wcp-phase146-decision-active", activeAdvisory);
        const activeGate = gateFor(activePacket, activeAdvisory, true);
        recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase146-decision-active",
            dispatchKey: "dispatch-phase146-decision-active",
            taskFingerprint: "phase146 provider decision active",
            worker_context_packet: activePacket,
            worker_context_pre_dispatch_gate: activeGate,
            dispatch_ready: false,
        });
        const recoveredPacket = packetFor("wcp-phase146-decision-recovered", recoveredAdvisory);
        const recoveredGate = gateFor(recoveredPacket, recoveredAdvisory, false);
        recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase146-decision-recovered",
            dispatchKey: "dispatch-phase146-decision-recovered",
            taskFingerprint: "phase146 provider decision recovered",
            worker_context_packet: recoveredPacket,
            worker_context_pre_dispatch_gate: recoveredGate,
            dispatch_ready: true,
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerReport)({
            groupIds: [groupId],
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_decision_ledger"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_decision_ledger") || {};
        const group = report.groups?.[0] || {};
        const activeCheck = (group.checks || []).find((item) => item.assignment_id === "assignment-phase146-decision-active") || {};
        const recoveredCheck = (group.checks || []).find((item) => item.assignment_id === "assignment-phase146-decision-recovered") || {};
        const checks = {
            reportCoversBothDecisions: report.overall?.status === "ok"
                && Number(report.overall.checkedDecisionCount || 0) === 2
                && Number(report.overall.coveredDecisionCount || 0) === 2,
            activeDecisionRequiresHold: activeCheck.action === "hold_until_repair"
                && activeCheck.expected_action === "hold_until_repair"
                && activeCheck.provider_dispatch_hold === true
                && activeCheck.covered === true,
            recoveredDecisionRequiresReceiptSampling: recoveredCheck.action === "dispatch_with_receipt_sampling"
                && recoveredCheck.expected_action === "dispatch_with_receipt_sampling"
                && recoveredCheck.covered === true,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 2
                && Number(check.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            active: {
                action: activeCheck.action || "",
                expected_action: activeCheck.expected_action || "",
                covered: activeCheck.covered === true,
            },
            recovered: {
                action: recoveredCheck.action || "",
                expected_action: recoveredCheck.expected_action || "",
                covered: recoveredCheck.covered === true,
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
    const groupId = `memory-center-pressure-provenance-provider-dispatch-override-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const advisory = {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "critical",
        dispatch_policy: "hold_until_repair",
        should_hold_dispatch: true,
        selected_candidate: {
            schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "critical",
            dispatch_policy: "hold_until_repair",
            should_hold_dispatch: true,
            current_open_repair_item_ids: ["phase147-pressure-provider-repair"],
        },
        recommendation: "hold codex/api child-agent dispatch until pressure provenance repair closes",
    };
    const overrideReceipt = {
        schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
        override_id: "provider-dispatch-override:phase147-selftest",
        valid: true,
        approved: true,
        approved_by: "local-user",
        risk_accepted: true,
        acknowledges_repair_required: true,
        reason: "Phase 147 Memory Center selftest accepts temporary provider risk and requires follow-up repair.",
        project: targetProject,
        agent_type: agentType,
        override_action: "allow_once",
        approved_at: "2026-07-10T03:50:00.000Z",
    };
    const packet = {
        schema: "ccm-worker-context-packet-v1",
        packet_id: "wcp-phase147-override",
        groupId,
        project: targetProject,
        agent_type: agentType,
        task: "phase147 provider dispatch override receipt",
        memory: {},
        context_usage: {
            schema: "ccm-worker-context-usage-v1",
            packet_id: "wcp-phase147-override",
            project: targetProject,
            status: "ok",
            pressure: 20,
            total_tokens: 200,
            max_tokens: 2000,
            free_tokens: 1680,
            autocompact_buffer_tokens: 120,
            categories: [],
        },
        pressure_provenance_provider_dispatch_advisory: advisory,
        acceptance: {
            pressure_provenance_provider_dispatch_advisory_ack_required: true,
            pressure_provenance_provider_dispatch_hold_required: true,
        },
    };
    const gate = {
        schema: "ccm-worker-context-pre-dispatch-gate-v1",
        gate_id: "worker-context-pre-dispatch:phase147-override",
        groupId,
        project: targetProject,
        worker_context_packet_id: packet.packet_id,
        pressure_status: "ok",
        dispatch_ready: true,
        dispatchReady: true,
        blocked: false,
        provider_dispatch_hold: true,
        provider_dispatch_hold_blocked: false,
        provider_dispatch_hold_overridden: true,
        provider_dispatch_override_receipt: overrideReceipt,
        provider_dispatch_override_required_followup_repair: true,
        pressure_provenance_provider_dispatch_advisory: advisory,
        repair_source: "",
        next_step: "dispatch_child_agent_with_provider_override_receipt",
        reason: "Pressure provenance provider dispatch hold overridden by approved receipt provider-dispatch-override:phase147-selftest; follow-up repair/recovery remains required.",
    };
    try {
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, } = require("../collaboration/group-orchestrator");
        recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase147-override",
            dispatchKey: "dispatch-phase147-override",
            taskFingerprint: "phase147 provider override",
            provider_dispatch_override: overrideReceipt,
            worker_context_packet: packet,
            worker_context_pre_dispatch_gate: gate,
            dispatch_ready: true,
        });
        const overrideReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptReport)({
            groupIds: [groupId],
        });
        const decisionReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerReport)({
            groupIds: [groupId],
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_receipts"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_receipts") || {};
        const overrideGroup = overrideReport.groups?.[0] || {};
        const overrideCheck = overrideGroup.checks?.[0] || {};
        const decisionGroup = decisionReport.groups?.[0] || {};
        const decisionCheck = decisionGroup.checks?.[0] || {};
        const checks = {
            overrideReportPasses: overrideReport.overall?.status === "ok"
                && Number(overrideReport.overall.checkedOverrideCount || 0) === 1
                && Number(overrideReport.overall.coveredOverrideCount || 0) === 1,
            overrideCheckRequiresUserRiskReceipt: overrideCheck.covered === true
                && overrideCheck.receipt_valid === true
                && overrideCheck.approved_by === "local-user",
            decisionLedgerTreatsOverrideAsDispatch: decisionReport.overall?.status === "ok"
                && decisionCheck.expected_action === "dispatch_with_provider_override"
                && decisionCheck.action === "dispatch_with_provider_override"
                && decisionCheck.override_receipt_valid === true,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: overrideReport.overall,
            decision: {
                action: decisionCheck.action || "",
                expected_action: decisionCheck.expected_action || "",
                override_receipt_valid: decisionCheck.override_receipt_valid === true,
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupSelfTest() {
    const groupId = `memory-center-pressure-provenance-provider-dispatch-override-followup-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const advisory = {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "critical",
        dispatch_policy: "hold_until_repair",
        should_hold_dispatch: true,
        selected_candidate: {
            schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "critical",
            dispatch_policy: "hold_until_repair",
            should_hold_dispatch: true,
            current_open_repair_item_ids: ["phase148-pressure-provider-repair"],
        },
    };
    const overrideReceipt = {
        schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
        override_id: "provider-dispatch-override:phase148-selftest",
        valid: true,
        approved: true,
        approved_by: "local-user",
        risk_accepted: true,
        acknowledges_repair_required: true,
        reason: "Phase 148 Memory Center selftest accepts temporary provider risk and requires completion follow-up.",
        project: targetProject,
        agent_type: agentType,
        override_action: "allow_once",
        approved_at: "2026-07-10T04:10:00.000Z",
    };
    const packet = {
        schema: "ccm-worker-context-packet-v1",
        packet_id: "wcp-phase148-override-followup",
        groupId,
        project: targetProject,
        agent_type: agentType,
        task: "phase148 provider dispatch override follow-up",
        memory: {},
        context_usage: {
            schema: "ccm-worker-context-usage-v1",
            packet_id: "wcp-phase148-override-followup",
            project: targetProject,
            status: "ok",
            pressure: 20,
            total_tokens: 200,
            max_tokens: 2000,
            free_tokens: 1680,
            autocompact_buffer_tokens: 120,
            categories: [],
        },
        pressure_provenance_provider_dispatch_advisory: advisory,
        acceptance: {
            pressure_provenance_provider_dispatch_advisory_ack_required: true,
            pressure_provenance_provider_dispatch_hold_required: true,
        },
    };
    const gate = {
        schema: "ccm-worker-context-pre-dispatch-gate-v1",
        gate_id: "worker-context-pre-dispatch:phase148-override-followup",
        groupId,
        project: targetProject,
        worker_context_packet_id: packet.packet_id,
        pressure_status: "ok",
        dispatch_ready: true,
        dispatchReady: true,
        blocked: false,
        provider_dispatch_hold: true,
        provider_dispatch_hold_blocked: false,
        provider_dispatch_hold_overridden: true,
        provider_dispatch_override_receipt: overrideReceipt,
        provider_dispatch_override_required_followup_repair: true,
        pressure_provenance_provider_dispatch_advisory: advisory,
        repair_source: "",
        next_step: "dispatch_child_agent_with_provider_override_receipt",
        reason: "Pressure provenance provider dispatch hold overridden by approved receipt provider-dispatch-override:phase148-selftest; follow-up repair/recovery remains required.",
    };
    try {
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, recordWorkerContextProviderDispatchOverrideCompletionForCoordinator, } = require("../collaboration/group-orchestrator");
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase148-override-followup",
            dispatchKey: "dispatch-phase148-override-followup",
            taskFingerprint: "phase148 provider override followup",
            provider_dispatch_override: overrideReceipt,
            worker_context_packet: packet,
            worker_context_pre_dispatch_gate: gate,
            dispatch_ready: true,
        });
        const receipt = {
            status: "done",
            summary: "phase148 Memory Center override follow-up receipt",
            memoryProvenanceUsage: [{
                    relPath: "pressure-provider-dispatch-override-followup.md",
                    usageState: "verified",
                    repairStatus: "completed",
                    repairGapType: "provider_dispatch_override_followup",
                    currentSourceVerified: true,
                    reason: "selftest verified current source after provider override dispatch",
                }],
        };
        const completion = recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId, {
            assignment_id: "assignment-phase148-override-followup",
            dispatch_key: "dispatch-phase148-override-followup",
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase148-override-followup",
            worker_handoff_id: "handoff-phase148-override-followup",
            task_agent_session_id: "tas-phase148-override-followup",
            native_session_id: "native-phase148-override-followup",
            execution_id: "execution-phase148-override-followup",
            memory_context_snapshot_id: "snapshot-phase148-override-followup",
            memory_context_snapshot_checksum: "snapshot-checksum-phase148-override-followup",
            receipt_status: "done",
            receipt,
        }, { at: "2026-07-10T04:11:00.000Z" });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReport)({
            groupIds: [groupId],
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followups"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followups") || {};
        const group = report.groups?.[0] || {};
        const row = group.checks?.[0] || {};
        const workItemLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const workItem = (workItemLedger.items || []).find((item) => (item.work_item_id || item.id) === binding?.worker_context_provider_dispatch_override_followup_repair?.work_item_id) || {};
        const checks = {
            bindingCreatedFollowupWorkItem: !!binding?.worker_context_provider_dispatch_override_followup_repair?.work_item_id
                && workItem.source === "worker_context_pressure_provenance_provider_dispatch_override_followup",
            completionClosesFollowup: completion?.completion_ok === true
                && completion?.followup_repair_work_item_completion?.closed === 1
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(workItem.status) === "completed",
            followupReportPasses: report.overall?.status === "ok"
                && Number(report.overall.checkedOverrideDispatchCount || 0) === 1
                && Number(report.overall.coveredOverrideDispatchCount || 0) === 1,
            reportRowShowsVerifiedCompletion: row.covered === true
                && row.completionOk === true
                && row.workItemClosed === true
                && row.memory_provenance_usage_count === 1
                && row.current_source_verified_count === 1,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            row: {
                followup_work_item_id: row.followup_work_item_id || "",
                completion_id: row.completion_id || "",
                covered: row.covered === true,
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupTypedMemorySelfTest() {
    const groupId = `memory-center-pressure-provenance-provider-dispatch-override-followup-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    let typedDir = "";
    const advisory = {
        schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
        groupId,
        project: targetProject,
        agent_type: agentType,
        health_status: "critical",
        dispatch_policy: "hold_until_repair",
        should_hold_dispatch: true,
        selected_candidate: {
            schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "critical",
            dispatch_policy: "hold_until_repair",
            should_hold_dispatch: true,
            current_open_repair_item_ids: ["phase149-pressure-provider-repair"],
        },
    };
    const overrideReceipt = {
        schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
        override_id: "provider-dispatch-override:phase149-selftest",
        valid: true,
        approved: true,
        approved_by: "local-user",
        risk_accepted: true,
        acknowledges_repair_required: true,
        reason: "Phase 149 typed memory selftest accepts temporary provider risk and requires verified follow-up memory.",
        project: targetProject,
        agent_type: agentType,
        override_action: "allow_once",
        approved_at: "2026-07-10T04:20:00.000Z",
    };
    const packet = {
        schema: "ccm-worker-context-packet-v1",
        packet_id: "wcp-phase149-override-followup-typed-memory",
        groupId,
        project: targetProject,
        agent_type: agentType,
        task: "phase149 provider dispatch override follow-up typed memory",
        memory: {},
        context_usage: {
            schema: "ccm-worker-context-usage-v1",
            packet_id: "wcp-phase149-override-followup-typed-memory",
            project: targetProject,
            status: "ok",
            pressure: 20,
            total_tokens: 200,
            max_tokens: 2000,
            free_tokens: 1680,
            autocompact_buffer_tokens: 120,
            categories: [],
        },
        pressure_provenance_provider_dispatch_advisory: advisory,
        acceptance: {
            pressure_provenance_provider_dispatch_advisory_ack_required: true,
            pressure_provenance_provider_dispatch_hold_required: true,
        },
    };
    const gate = {
        schema: "ccm-worker-context-pre-dispatch-gate-v1",
        gate_id: "worker-context-pre-dispatch:phase149-override-followup-typed-memory",
        groupId,
        project: targetProject,
        worker_context_packet_id: packet.packet_id,
        pressure_status: "ok",
        dispatch_ready: true,
        dispatchReady: true,
        blocked: false,
        provider_dispatch_hold: true,
        provider_dispatch_hold_blocked: false,
        provider_dispatch_hold_overridden: true,
        provider_dispatch_override_receipt: overrideReceipt,
        provider_dispatch_override_required_followup_repair: true,
        pressure_provenance_provider_dispatch_advisory: advisory,
        repair_source: "",
        next_step: "dispatch_child_agent_with_provider_override_receipt",
        reason: "Pressure provenance provider dispatch hold overridden by approved receipt provider-dispatch-override:phase149-selftest; follow-up typed memory remains required.",
    };
    try {
        const { buildGroupTypedMemoryRecall, getGroupTypedMemoryDir, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, recordWorkerContextProviderDispatchOverrideCompletionForCoordinator, } = require("../collaboration/group-orchestrator");
        typedDir = getGroupTypedMemoryDir(groupId);
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase149-override-followup-typed-memory",
            dispatchKey: "dispatch-phase149-override-followup-typed-memory",
            taskFingerprint: "phase149 provider override followup typed memory",
            provider_dispatch_override: overrideReceipt,
            worker_context_packet: packet,
            worker_context_pre_dispatch_gate: gate,
            dispatch_ready: true,
        });
        const receipt = {
            status: "done",
            summary: "phase149 Memory Center override follow-up typed memory receipt",
            memoryProvenanceUsage: [{
                    relPath: "pressure-provider-dispatch-override-followup-typed-memory.md",
                    usageState: "verified",
                    repairStatus: "completed",
                    repairGapType: "provider_dispatch_override_followup",
                    currentSourceVerified: true,
                    reason: "PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_TYPED_MEMORY_SENTINEL verified current source after provider override dispatch.",
                }],
        };
        const completion = recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId, {
            assignment_id: "assignment-phase149-override-followup-typed-memory",
            dispatch_key: "dispatch-phase149-override-followup-typed-memory",
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase149-override-followup-typed-memory",
            worker_handoff_id: "handoff-phase149-override-followup-typed-memory",
            task_agent_session_id: "tas-phase149-override-followup-typed-memory",
            native_session_id: "native-phase149-override-followup-typed-memory",
            execution_id: "execution-phase149-override-followup-typed-memory",
            memory_context_snapshot_id: "snapshot-phase149-override-followup-typed-memory",
            memory_context_snapshot_checksum: "snapshot-checksum-phase149-override-followup-typed-memory",
            receipt_status: "done",
            receipt,
        }, { at: "2026-07-10T04:21:00.000Z" });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupTypedMemoryReport)({
            groupIds: [groupId],
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followup_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followup_typed_memory") || {};
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const recall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_TYPED_MEMORY_SENTINEL pressure-provider-dispatch-override-followup-typed-memory.md", {
            disableLedger: true,
            forceMemory: true,
            max: 8,
        });
        const archiveRows = typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.rows || [];
        const recallText = JSON.stringify(recall.recalled || []);
        const group = report.groups?.[0] || {};
        const checks = {
            completionRecordedVerifiedFollowup: completion?.completion_ok === true
                && completion?.memory_provenance_usage_count === 1
                && completion?.current_source_verified_count === 1,
            typedArchiveCapturesCompletedOverride: typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.archived_count === 1
                && typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.completed_count === 1
                && archiveRows.some((row) => row.all_current_source_verified === true
                    && row.followup_work_item_id === binding?.worker_context_provider_dispatch_override_followup_repair?.work_item_id),
            typedFeedbackDocWritten: docs.some((doc) => doc.relPath === "provider-dispatch-override-followup-recall.md" && doc.type === "feedback"),
            recallProbeFindsTypedRepairMemory: recallText.includes("PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_TYPED_MEMORY_SENTINEL")
                && recallText.includes("provider-dispatch-override-followup-recall.md"),
            reportCoversTypedMemoryDistillation: report.overall?.status === "ok"
                && Number(report.overall.completedOverrideFollowupCount || 0) === 1
                && Number(report.overall.archivedOverrideFollowupCount || 0) === 1
                && group.recallProbeCovered === true,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            typedArchive: {
                archived_count: typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.archived_count || 0,
                completed_count: typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.completed_count || 0,
                attribution_count: typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.attribution_count || 0,
            },
            recalled: recall.recalled.map((item) => item.relPath),
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
        try {
            if (typedDir)
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupPreDispatchPolicySelfTest() {
    const groupId = `memory-center-pressure-provider-override-followup-pre-dispatch-policy-selftest-${process.pid}-${Date.now()}`;
    let typedDir = "";
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-pre-dispatch-policy.md";
    try {
        const { buildPressureProvenancePreDispatchComplianceDispatchPolicy, distillPressureProvenancePreDispatchComplianceToTypedMemory, distillProviderDispatchOverrideFollowupToTypedMemory, getGroupTypedMemoryDir, readGroupTypedMemoryDistillationLedger, } = require("../collaboration/group-memory-index");
        typedDir = getGroupTypedMemoryDir(groupId);
        distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, {
            packets: [{
                    groupId,
                    packet_id: "wcp-phase150-mcc-initial-missing-usage",
                    binding_id: "binding-phase150-mcc-initial-missing-usage",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "initial missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                }],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T04:40:00.000Z",
        });
        distillProviderDispatchOverrideFollowupToTypedMemory(groupId, {
            rows: [{
                    groupId,
                    project: targetProject,
                    agent_type: agentType,
                    binding_id: "binding-phase150-mcc-provider-override-followup",
                    assignment_id: "assignment-phase150-mcc-provider-override-followup",
                    dispatch_key: "dispatch-phase150-mcc-provider-override-followup",
                    worker_context_packet_id: "wcp-phase150-mcc-provider-override-followup",
                    worker_context_provider_dispatch_decision: {
                        schema: "ccm-worker-context-provider-dispatch-decision-v1",
                        action: "dispatch_with_provider_override",
                        decision_id: "decision-phase150-mcc-provider-override-followup",
                        project: targetProject,
                        agent_type: agentType,
                    },
                    worker_context_provider_dispatch_override_receipt: {
                        schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
                        override_id: "provider-dispatch-override:phase150-mcc-pre-dispatch-policy",
                        valid: true,
                        approved: true,
                        approved_by: "local-user",
                        risk_accepted: true,
                        acknowledges_repair_required: true,
                        reason: "Phase 150 Memory Center policy selftest repaired provider override history.",
                    },
                    worker_context_provider_dispatch_override_followup_repair: {
                        work_item_id: "work-phase150-mcc-provider-override-followup",
                    },
                    worker_context_provider_dispatch_override_completion: {
                        schema: "ccm-worker-context-provider-dispatch-override-completion-v1",
                        completion_id: "completion-phase150-mcc-provider-override-followup",
                        status: "completed",
                        completion_ok: true,
                        project: targetProject,
                        agent_type: agentType,
                        binding_id: "binding-phase150-mcc-provider-override-followup",
                        assignment_id: "assignment-phase150-mcc-provider-override-followup",
                        dispatch_key: "dispatch-phase150-mcc-provider-override-followup",
                        worker_context_packet_id: "wcp-phase150-mcc-provider-override-followup",
                        decision_id: "decision-phase150-mcc-provider-override-followup",
                        override_id: "provider-dispatch-override:phase150-mcc-pre-dispatch-policy",
                        followup_work_item_id: "work-phase150-mcc-provider-override-followup",
                        task_id: "task-phase150-mcc-provider-override-followup",
                        task_agent_session_id: "tas-phase150-mcc-provider-override-followup",
                        execution_id: "execution-phase150-mcc-provider-override-followup",
                        receipt_status: "done",
                        memory_provenance_usage_count: 1,
                        current_source_verified_count: 1,
                        receipt: {
                            status: "done",
                            memoryProvenanceUsage: [{
                                    relPath,
                                    usageState: "verified",
                                    repairStatus: "completed",
                                    repairGapType: "provider_dispatch_override_followup",
                                    currentSourceVerified: true,
                                    reason: "PROVIDER_OVERRIDE_FOLLOWUP_PRE_DISPATCH_POLICY_SENTINEL repaired provider override history.",
                                }],
                        },
                        reason: "verified provider override follow-up completion",
                        at: "2026-07-10T04:41:00.000Z",
                    },
                }],
        }, {
            reason: "phase150-mcc-provider-override-followup-pre-dispatch-policy",
            updatedAt: "2026-07-10T04:41:00.000Z",
        });
        const policy = buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId, {
            targetProject,
            agentType,
            frequentThreshold: 2,
            generatedAt: "2026-07-10T04:41:30.000Z",
        });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupPreDispatchPolicyReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T04:41:30.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followup_pre_dispatch_policy"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followup_pre_dispatch_policy") || {};
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const policyRow = (policy.policyRows || [])[0] || {};
        const probe = report.groups?.[0]?.probes?.[0] || {};
        const checks = {
            typedArchiveHasOverrideFollowupAttribution: typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.attribution_count === 1
                && typedLedger.pressureProvenanceProviderDispatchOverrideFollowupArchive?.attributions?.[0]?.completed_count === 1,
            policyConsumesOverrideFollowupArchive: policy.providerOverrideFollowupRepairedAttributionCount === 1
                && policyRow.provider_override_followup_repaired === true
                && Number(policyRow.provider_override_followup_repaired_count || 0) === 1
                && policyRow.provider_override_followup_last_completed_at === "2026-07-10T04:41:00.000Z",
            reportCoversPreDispatchPolicyConsumption: report.overall?.status === "ok"
                && Number(report.overall.providerOverrideFollowupAttributionCount || 0) === 1
                && Number(report.overall.coveredProviderOverrideFollowupAttributionCount || 0) === 1
                && probe.covered === true,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            policy: {
                action: policy.action || "",
                providerOverrideFollowupRepairedAttributionCount: policy.providerOverrideFollowupRepairedAttributionCount || 0,
                rowProviderOverrideFollowupRepaired: policyRow.provider_override_followup_repaired === true,
            },
            report: report.overall,
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
            },
        };
    }
    finally {
        try {
            if (typedDir)
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractSelfTest() {
    const groupId = `memory-center-pressure-provider-override-followup-receipt-contract-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    try {
        const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator } = require("../collaboration/group-orchestrator");
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
                groupId,
                project: targetProject,
                agent_type: agentType,
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
                provider_override_followup_repaired: true,
                provider_override_followup_repaired_count: 1,
                provider_override_followup_memory_provenance_usage_count: 1,
                provider_override_followup_current_source_verified_count: 1,
                provider_override_followup_last_completed_at: "2026-07-10T04:51:00.000Z",
                provider_override_followup_fresh_after_last_violation: true,
                provider_override_followup_rel_paths: ["pressure-provider-dispatch-override-followup-receipt-contract.md"],
                provider_override_followup_work_item_ids: ["work-phase151-provider-override-followup"],
                provider_override_followup_override_ids: ["provider-dispatch-override:phase151-mcc"],
            },
        };
        const packet = buildWorkerContextPacket({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 151 provider override follow-up receipt contract selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const rendered = renderWorkerContextPacket(packet);
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase151-provider-override-followup-contract",
            dispatchKey: "dispatch-phase151-provider-override-followup-contract",
            taskFingerprint: "phase151 provider override followup receipt contract",
            worker_context_packet: packet,
            dispatch_ready: true,
        }, { at: "2026-07-10T04:52:00.000Z" }) || {};
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T04:52:01.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract") || {};
        const contract = packet.pressure_provenance_provider_dispatch_override_followup_receipt_contract || {};
        const category = (packet.context_usage?.categories || []).find((item) => item.id === "pressure_provenance_provider_dispatch_override_followup_receipt_contract") || {};
        const checks = {
            packetCarriesReceiptContract: contract.schema === "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1"
                && contract.active === true
                && contract.rel_paths?.includes("pressure-provider-dispatch-override-followup-receipt-contract.md"),
            packetAcceptanceRequiresSamplingReceipt: packet.acceptance?.pressure_provenance_provider_dispatch_override_followup_sampling_required === true
                && packet.acceptance?.pressure_provenance_provider_dispatch_override_followup_receipt_required === true
                && packet.acceptance?.provider_dispatch_override_followup_history_reverification_required === true
                && packet.acceptance?.memory_provenance_usage_required === true,
            packetUsageAndRenderExposeContract: category.required === true
                && Number(category.tokens || 0) > 0
                && rendered.includes("Provider dispatch override follow-up receipt contract")
                && rendered.includes("providerDispatchOverrideFollowupHistoryReverified"),
            bindingPersistsContractProbe: binding.worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true
                && binding.worker_context_packet_render_probe?.rendered_flags?.has_pressure_provenance_provider_dispatch_override_followup_receipt_contract === true,
            reportCoversReceiptContract: report.overall?.status === "ok"
                && Number(report.overall.checkedPacketCount || 0) === 1
                && Number(report.overall.coveredPacketCount || 0) === 1
                && Number(report.overall.failedPacketCount || 0) === 0,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
            },
            contract: {
                active: contract.active === true,
                rel_paths: contract.rel_paths || [],
                followup_work_item_ids: contract.followup_work_item_ids || [],
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
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
    const groupId = `memory-center-pressure-provider-override-followup-receipt-contract-validation-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-receipt-validation.md";
    const followupWorkItemId = "work-phase152-mcc-provider-override-followup";
    const overrideId = "provider-dispatch-override:phase152-mcc";
    try {
        const { buildWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator, } = require("../collaboration/group-orchestrator");
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
                groupId,
                project: targetProject,
                agent_type: agentType,
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
                provider_override_followup_repaired: true,
                provider_override_followup_repaired_count: 1,
                provider_override_followup_memory_provenance_usage_count: 1,
                provider_override_followup_current_source_verified_count: 1,
                provider_override_followup_last_completed_at: "2026-07-10T05:10:00.000Z",
                provider_override_followup_fresh_after_last_violation: true,
                provider_override_followup_rel_paths: [relPath],
                provider_override_followup_work_item_ids: [followupWorkItemId],
                provider_override_followup_override_ids: [overrideId],
            },
        };
        const packet = buildWorkerContextPacket({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 152 Memory Center provider override follow-up receipt contract validation selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase152-mcc-provider-override-followup-validation",
            dispatchKey: "dispatch-phase152-mcc-provider-override-followup-validation",
            taskFingerprint: "phase152 mcc provider override followup receipt validation",
            worker_context_packet: packet,
            dispatch_ready: true,
        }, { at: "2026-07-10T05:10:01.000Z" }) || {};
        const failedValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
            binding_id: binding.binding_id,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase152-mcc-provider-override-followup-validation",
            task_agent_session_id: "tas-phase152-mcc-provider-override-followup-validation",
            execution_id: "execution-phase152-mcc-provider-override-followup-validation-failed",
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "used",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        currentSourceVerified: true,
                        reason: "missing provider override id and history reverified flag",
                    }],
            },
        }, { at: "2026-07-10T05:10:02.000Z" });
        const failedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T05:10:02.500Z",
        });
        const passedValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
            binding_id: binding.binding_id,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase152-mcc-provider-override-followup-validation",
            task_agent_session_id: "tas-phase152-mcc-provider-override-followup-validation",
            execution_id: "execution-phase152-mcc-provider-override-followup-validation-passed",
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "verified",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        repairWorkItemId: followupWorkItemId,
                        providerDispatchOverrideId: overrideId,
                        currentSourceVerified: true,
                        providerDispatchOverrideFollowupHistoryReverified: true,
                        reason: "Phase 152 Memory Center selftest reverified provider override follow-up repaired history.",
                    }],
            },
        }, { at: "2026-07-10T05:10:03.000Z" });
        const report = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T05:10:04.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract_validation"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract_validation") || {};
        const checks = {
            failedReceiptIsDetected: failedValidation?.status === "failed"
                && failedReport.overall?.status === "fail"
                && Number(failedReport.overall.failedValidationCount || 0) === 1,
            passedReceiptSatisfiesContract: passedValidation?.status === "passed"
                && passedValidation?.contract_satisfied === true
                && passedValidation?.covered_rel_path_count === 1
                && passedValidation?.covered_followup_work_item_count === 1
                && passedValidation?.covered_override_id_count === 1,
            reportCoversValidation: report.overall?.status === "ok"
                && Number(report.overall.checkedPacketCount || 0) === 1
                && Number(report.overall.passedValidationCount || 0) === 1
                && Number(report.overall.failedValidationCount || 0) === 0,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            failedReport: failedReport.overall,
            report: report.overall,
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairSelfTest() {
    const groupId = `memory-center-provider-override-followup-receipt-validation-repair-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-retry-brief.md";
    const followupWorkItemId = "work-phase153-provider-override-followup";
    const overrideId = "provider-dispatch-override:phase153-repair";
    try {
        const { buildWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator, } = require("../collaboration/group-orchestrator");
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
                groupId,
                project: targetProject,
                agent_type: agentType,
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
                provider_override_followup_repaired: true,
                provider_override_followup_repaired_count: 1,
                provider_override_followup_last_completed_at: "2026-07-10T05:20:00.000Z",
                provider_override_followup_fresh_after_last_violation: true,
                provider_override_followup_rel_paths: [relPath],
                provider_override_followup_work_item_ids: [followupWorkItemId],
                provider_override_followup_override_ids: [overrideId],
            },
        };
        const packet = buildWorkerContextPacket({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 153 provider override follow-up receipt validation repair selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase153-provider-override-followup-repair",
            dispatchKey: "dispatch-phase153-provider-override-followup-repair",
            taskFingerprint: "phase153 provider override followup receipt validation repair",
            worker_context_packet: packet,
            dispatch_ready: true,
        }, { at: "2026-07-10T05:20:01.000Z" }) || {};
        const failedValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
            binding_id: binding.binding_id,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase153-provider-override-followup-repair",
            task_agent_session_id: "tas-phase153-provider-override-followup-repair",
            execution_id: "execution-phase153-provider-override-followup-repair-failed",
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "used",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        currentSourceVerified: true,
                        reason: "missing corrected provider override follow-up receipt evidence",
                    }],
            },
        }, { at: "2026-07-10T05:20:02.000Z" });
        const failedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T05:20:03.000Z",
        });
        const failedWorkLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const failedPlanLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const repairWorkItem = (failedWorkLedger.items || []).find((item) => (0, memory_control_center_1.isProviderDispatchOverrideFollowupReceiptValidationRepairSource)(item.source)) || {};
        const readyBrief = (failedPlanLedger.briefs || []).find((brief) => (0, memory_control_center_1.isProviderDispatchOverrideFollowupReceiptValidationRepairSource)(brief.source) && brief.status === "ready") || {};
        const passedValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
            binding_id: binding.binding_id,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase153-provider-override-followup-repair",
            task_agent_session_id: "tas-phase153-provider-override-followup-repair",
            execution_id: "execution-phase153-provider-override-followup-repair-passed",
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "verified",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        repairWorkItemId: followupWorkItemId,
                        providerDispatchOverrideId: overrideId,
                        currentSourceVerified: true,
                        providerDispatchOverrideFollowupHistoryReverified: true,
                        reason: "Phase 153 corrected receipt reverified provider override follow-up history.",
                    }],
            },
        }, { at: "2026-07-10T05:20:04.000Z" });
        const resolvedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T05:20:05.000Z",
        });
        const resolvedWorkLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const resolvedItem = (resolvedWorkLedger.items || []).find((item) => String(item.work_item_id || item.id || "") === repairWorkItem.work_item_id) || {};
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_validation_repair"],
            groupIds: [groupId],
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_validation_repair") || {};
        const checks = {
            failedValidationCreatesOpenRepairItem: failedValidation?.status === "failed"
                && failedValidation?.repair_work_item_status === "pending"
                && repairWorkItem.source === "worker_context_provider_dispatch_override_followup_receipt_contract_validation_repair"
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(repairWorkItem.status),
            failedValidationCreatesCandidateAndBrief: failedReport.overall?.status === "ok"
                && Number(failedReport.overall.openRepairItemCount || 0) === 1
                && Number(failedReport.overall.readyCandidateCount || 0) === 1
                && Number(failedReport.overall.readyBriefCount || 0) === 1
                && !!readyBrief.brief_id,
            retryBriefIsSelfContained: readyBrief.should_create_real_task === false
                && readyBrief.worker_task?.includes(relPath)
                && readyBrief.worker_task?.includes(followupWorkItemId)
                && readyBrief.worker_task?.includes(overrideId)
                && readyBrief.worker_task?.includes("providerDispatchOverrideFollowupHistoryReverified=true")
                && readyBrief.worker_task?.includes("providerDispatchOverrideId"),
            passedValidationClosesSameWorkItem: passedValidation?.contract_satisfied === true
                && passedValidation?.repair_work_item_id === repairWorkItem.work_item_id
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(resolvedItem.status) === "completed"
                && resolvedItem.completion_source === "provider_dispatch_override_followup_receipt_contract_validation",
            resolvedReportRetiresReadyBrief: resolvedReport.overall?.status === "ok"
                && Number(resolvedReport.overall.completedRepairItemCount || 0) === 1
                && Number(resolvedReport.overall.readyCandidateCount || 0) === 0
                && Number(resolvedReport.overall.readyBriefCount || 0) === 0,
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            failedReport: failedReport.overall,
            resolvedReport: resolvedReport.overall,
            repairWorkItem: {
                id: repairWorkItem.work_item_id || "",
                initialStatus: repairWorkItem.status || "",
                finalStatus: resolvedItem.status || "",
            },
            brief: {
                brief_id: readyBrief.brief_id || "",
                source: readyBrief.source || "",
                target_project: readyBrief.target_project || "",
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicySelfTest() {
    const groupId = `memory-center-provider-override-followup-receipt-validation-typed-policy-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-receipt-validation-typed-policy.md";
    const followupWorkItemId = "work-phase154-mcc-provider-override-followup";
    const overrideId = "provider-dispatch-override:phase154-mcc-typed-policy";
    try {
        const { buildWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator, recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator, } = require("../collaboration/group-orchestrator");
        const { buildGroupTypedMemoryRecall, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            groupId,
            project: targetProject,
            agent_type: agentType,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                groupId,
                project: targetProject,
                agent_type: agentType,
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
                provider_override_followup_repaired: true,
                provider_override_followup_repaired_count: 1,
                provider_override_followup_last_completed_at: "2026-07-10T06:10:00.000Z",
                provider_override_followup_fresh_after_last_violation: true,
                provider_override_followup_rel_paths: [relPath],
                provider_override_followup_work_item_ids: [followupWorkItemId],
                provider_override_followup_override_ids: [overrideId],
            },
        };
        const packet = buildWorkerContextPacket({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 154 Memory Center typed validation policy selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const binding = recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase154-mcc-validation-typed-policy",
            dispatchKey: "dispatch-phase154-mcc-validation-typed-policy",
            taskFingerprint: "phase154 mcc provider override followup validation typed policy",
            worker_context_packet: packet,
            dispatch_ready: true,
        }, { at: "2026-07-10T06:10:01.000Z" }) || {};
        const recordFailedAttempt = (executionId, at) => recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
            binding_id: binding.binding_id,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase154-mcc-validation-typed-policy",
            task_agent_session_id: `tas-${executionId}`,
            execution_id: executionId,
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "used",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        currentSourceVerified: true,
                        reason: "PROVIDER_OVERRIDE_FOLLOWUP_VALIDATION_POLICY_FAILURE missing corrected receipt evidence",
                    }],
            },
        }, { at });
        recordFailedAttempt("execution-phase154-mcc-validation-failed-1", "2026-07-10T06:10:02.000Z");
        recordFailedAttempt("execution-phase154-mcc-validation-failed-2", "2026-07-10T06:10:03.000Z");
        const escalatedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicyReport)({
            groupIds: [groupId],
            providerOverrideFollowupReceiptValidationFailureThreshold: 2,
            generatedAt: "2026-07-10T06:10:04.000Z",
        });
        const passedValidation = recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId, {
            binding_id: binding.binding_id,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase154-mcc-validation-typed-policy",
            task_agent_session_id: "tas-execution-phase154-mcc-validation-passed",
            execution_id: "execution-phase154-mcc-validation-passed",
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "verified",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        repairWorkItemId: followupWorkItemId,
                        providerDispatchOverrideId: overrideId,
                        currentSourceVerified: true,
                        providerDispatchOverrideFollowupHistoryReverified: true,
                        reason: "PROVIDER_OVERRIDE_FOLLOWUP_VALIDATION_POLICY_REPAIRED current source and full receipt contract verified",
                    }],
            },
        }, { at: "2026-07-10T06:10:05.000Z" });
        const repairedReport = (0, memory_control_center_1.buildWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicyReport)({
            groupIds: [groupId],
            providerOverrideFollowupReceiptValidationFailureThreshold: 2,
            generatedAt: "2026-07-10T06:10:06.000Z",
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_validation_typed_memory_policy"],
            groupIds: [groupId],
            providerOverrideFollowupReceiptValidationFailureThreshold: 2,
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_validation_typed_memory_policy") || {};
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = typedLedger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
        const attribution = archive.attributions?.[0] || {};
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const recall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_OVERRIDE_FOLLOWUP_VALIDATION_POLICY_FAILURE PROVIDER_OVERRIDE_FOLLOWUP_VALIDATION_POLICY_REPAIRED", {
            max: 8,
            disableLedger: true,
            forceMemory: true,
        });
        const escalatedProbe = escalatedReport.groups?.[0]?.probes?.[0] || {};
        const repairedProbe = repairedReport.groups?.[0]?.probes?.[0] || {};
        const recallText = JSON.stringify(recall.recalled || []);
        const checks = {
            appendOnlyArchivePreservesAttempts: Number(archive.attempt_count || 0) === 3
                && Number(archive.failed_count || 0) === 2
                && Number(archive.passed_count || 0) === 1,
            escalatedPolicyIsCovered: escalatedReport.overall?.status === "ok"
                && Number(escalatedReport.overall.escalatedAttributionCount || 0) === 1
                && escalatedProbe.policyActive === true
                && escalatedProbe.policyAction === "hold_provider_after_repeated_override_followup_receipt_validation_failures"
                && escalatedProbe.policyEscalated === true,
            repairedPolicyIsCovered: passedValidation?.contract_satisfied === true
                && repairedReport.overall?.status === "ok"
                && Number(repairedReport.overall.repairedAttributionCount || 0) === 1
                && repairedProbe.policyRepairVerified === true
                && repairedProbe.policyProviderFollowupRepaired === true,
            repairClearsStreakWithoutDeletingAudit: attribution.consecutive_failure_count === 0
                && attribution.repair_verified === true
                && attribution.failed_count === 2
                && attribution.passed_count === 1,
            typedMemoryDocumentAndRecallWork: docs.some((doc) => doc.relPath === "provider-dispatch-override-followup-receipt-validation-history.md" && doc.type === "feedback")
                && recallText.includes("provider-dispatch-override-followup-receipt-validation-history.md")
                && recallText.includes("PROVIDER_OVERRIDE_FOLLOWUP_VALIDATION_POLICY_REPAIRED"),
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            escalatedReport: escalatedReport.overall,
            repairedReport: repairedReport.overall,
            archive: {
                attempt_count: archive.attempt_count || 0,
                failed_count: archive.failed_count || 0,
                passed_count: archive.passed_count || 0,
                consecutive_failure_count: attribution.consecutive_failure_count || 0,
                repair_verified: attribution.repair_verified === true,
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
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
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runMemoryCenterWorkerContextPacketCrossGroupProviderReliabilityGuidanceSelfTest() {
    const sourceGroupA = `memory-center-provider-reliability-source-a-${process.pid}-${Date.now()}`;
    const sourceGroupB = `memory-center-provider-reliability-source-b-${process.pid}-${Date.now()}`;
    const typedDirA = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(sourceGroupA));
    const typedDirB = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(sourceGroupB));
    const snapshotFile = path.join(utils_1.CCM_DIR, "global-provider-reliability", `phase155-selftest-${process.pid}-${Date.now()}.json`);
    const nowAt = "2026-07-10T07:20:00.000Z";
    try {
        const { buildGlobalProviderDispatchReliabilitySignals, distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory, } = require("../collaboration/group-memory-index");
        const validation = (groupId, project, id, status, at) => ({
            schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
            validation_id: id,
            groupId,
            project,
            agent_type: "codex",
            binding_id: `binding-${id}`,
            execution_id: `execution-${id}`,
            receipt_status: "done",
            status,
            contract_satisfied: status === "passed",
            repair_work_item_id: `private-repair-${id}`,
            contract: {
                rel_paths: [`private-${project}-memory.md`],
                followup_work_item_ids: [`private-${project}-followup`],
                override_ids: [`private-${project}-override`],
            },
            gaps: status === "failed" ? [{ code: "private_gap", reason: `private ${project} evidence` }] : [],
            receipt: { memoryProvenanceUsage: [{ reason: `private ${project} receipt evidence` }] },
            at,
        });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupA, {
            rows: [
                { validation: validation(sourceGroupA, "secret-alpha", "phase155-mcc-alpha-old-failed", "failed", "2026-01-10T07:20:00.000Z") },
                { validation: validation(sourceGroupA, "secret-alpha", "phase155-mcc-alpha-recent-passed", "passed", "2026-07-10T07:00:00.000Z") },
            ],
        }, { updatedAt: "2026-07-10T07:00:00.000Z" });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupB, {
            rows: [
                { validation: validation(sourceGroupB, "secret-beta", "phase155-mcc-beta-recent-failed-1", "failed", "2026-07-10T07:05:00.000Z") },
                { validation: validation(sourceGroupB, "secret-beta", "phase155-mcc-beta-recent-failed-2", "failed", "2026-07-10T07:10:00.000Z") },
            ],
        }, { updatedAt: "2026-07-10T07:10:00.000Z" });
        const report = (0, memory_control_center_1.buildWorkerContextPacketCrossGroupProviderReliabilityGuidanceReport)({
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_cross_group_provider_reliability_guidance"],
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_cross_group_provider_reliability_guidance") || {};
        const globalSignals = buildGlobalProviderDispatchReliabilitySignals({
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
        });
        const { buildGlobalGroupMemoryContext } = require("../collaboration/memory");
        const globalAgentContext = buildGlobalGroupMemoryContext("检查 provider reliability 并规划下一次全局派发", {
            groups: [],
            sessionId: "phase155-global-provider-reliability",
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            crossGroupProviderReliabilityMinSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            providerReliabilitySnapshotFile: snapshotFile,
            enableProviderReliabilitySnapshot: true,
            disableLedger: true,
        });
        const ignoredGlobalAgentContext = buildGlobalGroupMemoryContext("本轮忽略记忆，只看当前消息", {
            groups: [],
            sessionId: "phase155-global-provider-reliability-ignore",
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            providerReliabilitySnapshotFile: snapshotFile,
            enableProviderReliabilitySnapshot: true,
            disableLedger: true,
        });
        const signal = report.signals?.[0] || {};
        const serialized = JSON.stringify(globalSignals);
        const checks = {
            reportBuildsDecayedGlobalSignal: report.overall?.status === "ok"
                && Number(report.overall.signalCount || 0) === 1
                && Number(report.overall.coveredSignalCount || 0) === 1
                && Number(signal.half_life_days || 0) === 14
                && Number(signal.source_group_count || 0) === 2
                && signal.actionable === true,
            reportEnforcesGuidanceOnlyLocalFirst: report.guidance?.guidance_only === true
                && report.guidance?.local_policy_override_allowed === false
                && report.guidance?.contains_private_memory === false
                && Number(report.overall.privacyGapCount || 0) === 0,
            serializedGlobalSignalIsPrivate: !serialized.includes(sourceGroupA)
                && !serialized.includes(sourceGroupB)
                && !serialized.includes("secret-alpha")
                && !serialized.includes("secret-beta")
                && !serialized.includes("private-secret-alpha-memory.md")
                && !serialized.includes("phase155-mcc-beta-recent-failed-2"),
            highRiskIsGlobalGuidanceNotGroupPolicy: ["high", "medium"].includes(signal.risk_status)
                && signal.guidanceSafe === true
                && signal.privacySafe === true
                && signal.actionableSafe === true,
            globalAgentContextReceivesOnlySanitizedGuidance: globalAgentContext.provider_reliability_guidance?.schema === "ccm-global-provider-dispatch-reliability-signals-v1"
                && globalAgentContext.provider_reliability_guidance?.signals?.[0]?.actionable === true
                && String(globalAgentContext.rendered_text || "").includes("全局 provider reliability（脱敏聚合）")
                && !String(globalAgentContext.rendered_text || "").includes("secret-alpha")
                && !String(globalAgentContext.rendered_text || "").includes(sourceGroupA),
            ignoreMemorySuppressesGlobalReliabilityGuidance: ignoredGlobalAgentContext.memory_policy?.ignored === true
                && !ignoredGlobalAgentContext.provider_reliability_guidance
                && !String(ignoredGlobalAgentContext.rendered_text || "").includes("provider reliability（脱敏聚合）"),
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            signal: {
                agent_type: signal.agent_type || "",
                risk_status: signal.risk_status || "",
                risk_score: signal.risk_score || 0,
                confidence: signal.confidence || 0,
                source_group_count: signal.source_group_count || 0,
                half_life_days: signal.half_life_days || 0,
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
            },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        for (const file of [snapshotFile, `${snapshotFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketProviderReliabilitySnapshotRankingSelfTest() {
    const sourceGroupA = `memory-center-provider-snapshot-source-a-${process.pid}-${Date.now()}`;
    const sourceGroupB = `memory-center-provider-snapshot-source-b-${process.pid}-${Date.now()}`;
    const targetGroup = `memory-center-provider-snapshot-target-${process.pid}-${Date.now()}`;
    const typedDirA = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(sourceGroupA));
    const typedDirB = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(sourceGroupB));
    const snapshotFile = path.join(utils_1.CCM_DIR, "global-provider-reliability", `phase156-mcc-selftest-${process.pid}-${Date.now()}.json`);
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(targetGroup);
    const nowAt = "2026-07-10T08:20:00.000Z";
    const nowMs = Date.parse(nowAt);
    const targetProject = "api";
    try {
        const { buildWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordWorkerContextPacketAssignmentBindingForCoordinator } = require("../collaboration/group-orchestrator");
        const { distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory, writeGlobalProviderDispatchReliabilitySnapshot, } = require("../collaboration/group-memory-index");
        const validation = (groupId, project, agentType, id, status, at) => ({
            schema: "ccm-worker-context-provider-dispatch-override-followup-receipt-contract-validation-v1",
            validation_id: id,
            groupId,
            project,
            agent_type: agentType,
            binding_id: `binding-${id}`,
            execution_id: `execution-${id}`,
            receipt_status: "done",
            status,
            contract_satisfied: status === "passed",
            contract: { rel_paths: [`private-${project}-${agentType}.md`] },
            gaps: status === "failed" ? [{ code: "private_gap", reason: "private receipt evidence" }] : [],
            at,
        });
        for (const [groupId, project, offset] of [[sourceGroupA, "private-a", 10], [sourceGroupB, "private-b", 5]]) {
            distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, {
                rows: [
                    { validation: validation(groupId, project, "codex", `${project}-codex-failed`, "failed", new Date(nowMs - offset * 60_000).toISOString()) },
                    { validation: validation(groupId, project, "cursor", `${project}-cursor-passed`, "passed", new Date(nowMs - (offset - 1) * 60_000).toISOString()) },
                ],
            }, { updatedAt: new Date(nowMs - (offset - 1) * 60_000).toISOString() });
        }
        const snapshot = writeGlobalProviderDispatchReliabilitySnapshot({
            snapshotFile,
            ttlMs: 5 * 60_000,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            nowMs,
            generatedAt: nowAt,
        });
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            version: 1,
            groupId: targetGroup,
            project: targetProject,
            agent_type: "codex",
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                schema: "ccm-pressure-provenance-feedback-provider-dispatch-selected-candidate-v1",
                groupId: targetGroup,
                project: targetProject,
                agent_type: "codex",
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
                cross_group_provider_reliability_actionable: true,
                provider_reliability_snapshot_id: snapshot.snapshot_id,
                provider_reliability_snapshot_checksum: snapshot.snapshot_checksum,
                provider_reliability_snapshot_status: "fresh",
                provider_reliability_snapshot_generation_id: snapshot.generation_id,
            },
            provider_reliability_snapshot: {
                schema: "ccm-provider-dispatch-reliability-snapshot-ref-v1",
                snapshot_id: snapshot.snapshot_id,
                generation_id: snapshot.generation_id,
                snapshot_checksum: snapshot.snapshot_checksum,
                payload_checksum: snapshot.payload_checksum,
                status: "fresh",
                usable: true,
                generated_at: snapshot.generated_at,
                expires_at: snapshot.expires_at,
                source_generation_checksum: snapshot.source_provenance?.generation_checksum,
                source_ledger_count: snapshot.source_provenance?.source_ledger_count,
                guidance_only: true,
                local_policy_override_allowed: false,
                contains_private_memory: false,
            },
            safer_alternative_count: 1,
            safer_alternatives: [{
                    schema: "ccm-provider-dispatch-safer-alternative-v1",
                    agent_type: "cursor",
                    project: targetProject,
                    configured: true,
                    local_health_status: "watch",
                    local_dispatch_policy: "allow_with_monitoring",
                    local_policy_active: false,
                    global_risk_status: "low",
                    global_risk_score: 0,
                    global_confidence: 0.4,
                    global_source_group_count: 2,
                    composite_rank: 10,
                    selected_composite_rank: 22,
                    safer_than_selected: true,
                    snapshot_id: snapshot.snapshot_id,
                    snapshot_checksum: snapshot.snapshot_checksum,
                    snapshot_status: "fresh",
                }],
            recommendation: "keep current assignment unchanged; review configured safer cursor candidate for next dispatch",
        };
        const packet = buildWorkerContextPacket({
            group: { id: targetGroup, members: [{ project: targetProject }] },
            project: targetProject,
            agentType: "codex",
            task: "Phase 156 Memory Center provider snapshot ranking selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        recordWorkerContextPacketAssignmentBindingForCoordinator(targetGroup, {
            scopeId: targetGroup,
            project: targetProject,
            agentType: "codex",
            assignmentId: "assignment-phase156-mcc-provider-ranking",
            dispatchKey: "dispatch-phase156-mcc-provider-ranking",
            taskFingerprint: "phase156 mcc provider snapshot ranking",
            worker_context_packet: packet,
            dispatch_ready: true,
        }, { at: nowAt });
        const report = (0, memory_control_center_1.buildWorkerContextPacketProviderReliabilitySnapshotRankingReport)({
            groupIds: [targetGroup],
            providerReliabilitySnapshotFile: snapshotFile,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            nowMs,
            generatedAt: nowAt,
        });
        const quality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_provider_reliability_snapshot_ranking"],
            groupIds: [targetGroup],
            providerReliabilitySnapshotFile: snapshotFile,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            nowMs,
            generatedAt: nowAt,
            refresh: true,
        });
        const check = (quality.checks || []).find((item) => item.id === "worker_context_packet_provider_reliability_snapshot_ranking") || {};
        const originalText = fs.readFileSync(snapshotFile, "utf-8");
        const tamperedPayload = JSON.parse(originalText);
        tamperedPayload.expires_at = "2099-01-01T00:00:00.000Z";
        fs.writeFileSync(snapshotFile, JSON.stringify(tamperedPayload, null, 2), "utf-8");
        const tamperedReport = (0, memory_control_center_1.buildWorkerContextPacketProviderReliabilitySnapshotRankingReport)({
            groupIds: [targetGroup],
            providerReliabilitySnapshotFile: snapshotFile,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            nowMs,
            generatedAt: nowAt,
        });
        fs.writeFileSync(snapshotFile, originalText, "utf-8");
        const group = report.groups?.[0] || {};
        const bindingCheck = group.checks?.[0] || {};
        const checks = {
            freshSnapshotAndBindingAreCovered: report.overall?.status === "ok"
                && report.overall?.snapshotStatus === "fresh"
                && report.overall?.snapshotCovered === true
                && Number(report.overall.checkedBindingCount || 0) === 1
                && Number(report.overall.coveredBindingCount || 0) === 1,
            rankingIsConfiguredSameProjectAndNoAutoSwitch: bindingCheck.alternativesSafe === true
                && bindingCheck.assignmentUnchanged === true
                && bindingCheck.safer_alternative_agent_types?.includes("cursor"),
            qualityCheckPasses: check.status === "ok"
                && Number(check.checked || 0) === 2
                && Number(check.passed || 0) === 2,
            tamperedSnapshotFailsQualityReport: tamperedReport.overall?.status === "warn"
                || tamperedReport.overall?.status === "fail",
            tamperedSnapshotIsNotCovered: tamperedReport.overall?.snapshotCovered === false
                && tamperedReport.overall?.snapshotStatus === "tampered",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            tamperedReport: tamperedReport.overall,
            snapshot: report.snapshot,
            binding: {
                selected_agent_type: bindingCheck.selected_agent_type || "",
                safer_alternative_agent_types: bindingCheck.safer_alternative_agent_types || [],
                assignmentUnchanged: bindingCheck.assignmentUnchanged === true,
            },
            check: {
                id: check.id || "",
                status: check.status || "",
                checked: check.checked || 0,
                passed: check.passed || 0,
            },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        for (const file of [snapshotFile, `${snapshotFile}.bak`, bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest() {
    const groupId = `memory-center-provider-switch-receipt-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const project = "api";
    const oldProvider = "codex";
    const newProvider = "cursor";
    const nowAt = "2026-07-10T09:30:00.000Z";
    const nowMs = Date.parse(nowAt);
    try {
        const { buildWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { buildProviderSwitchDecisionReceiptForCoordinator, recordWorkerContextPacketAssignmentBindingForCoordinator, recordWorkerContextProviderSwitchSessionBindingForCoordinator, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator, } = require("../collaboration/group-orchestrator");
        const snapshotRef = {
            schema: "ccm-provider-dispatch-reliability-snapshot-ref-v1",
            snapshot_id: "provider-reliability-snapshot:phase157-memory-center",
            generation_id: "provider-reliability-generation:phase157-memory-center",
            snapshot_checksum: "phase157-memory-center-snapshot-checksum",
            payload_checksum: "phase157-memory-center-payload-checksum",
            status: "fresh",
            usable: true,
            generated_at: nowAt,
            expires_at: "2026-07-10T09:35:00.000Z",
            source_generation_checksum: "phase157-memory-center-generation-checksum",
            guidance_only: true,
            local_policy_override_allowed: false,
            contains_private_memory: false,
        };
        const advisory = {
            schema: "ccm-pressure-provenance-provider-dispatch-advisory-selection-v1",
            version: 1,
            groupId,
            project,
            agent_type: oldProvider,
            health_status: "monitor",
            dispatch_policy: "allow_with_receipt_sampling",
            should_hold_dispatch: false,
            selected_candidate: {
                project,
                agent_type: oldProvider,
                health_status: "monitor",
                dispatch_policy: "allow_with_receipt_sampling",
                should_hold_dispatch: false,
            },
            provider_reliability_snapshot: snapshotRef,
            safer_alternative_count: 1,
            safer_alternatives: [{
                    agent_type: newProvider,
                    project,
                    configured: true,
                    local_health_status: "healthy",
                    local_dispatch_policy: "preferred",
                    global_risk_status: "low",
                    global_risk_score: 0,
                    composite_rank: 7,
                    selected_composite_rank: 18,
                    safer_than_selected: true,
                    snapshot_id: snapshotRef.snapshot_id,
                    snapshot_checksum: snapshotRef.snapshot_checksum,
                    snapshot_status: "fresh",
                }],
        };
        const request = {
            requested_agent_type: newProvider,
            compatibility_confirmed: true,
            compatibility_evidence: ["cursor is configured for the api project and supports this task"],
            reason: "Memory Center provider switch receipt selftest",
            authority: {
                kind: "local_user",
                authority_id: "phase157-memory-center-local-authority",
                approved: true,
                local_policy_authority: true,
                allow_switch_away_from_held_provider: true,
            },
        };
        const makeAssignment = (suffix) => {
            const packet = buildWorkerContextPacket({
                group: { id: groupId, members: [{ project }] },
                project,
                agentType: oldProvider,
                task: `Phase 157 Memory Center provider switch ${suffix}.`,
                pressureProvenanceProviderDispatchAdvisory: advisory,
                contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
            });
            return {
                scopeId: groupId,
                project,
                agentType: oldProvider,
                agent_type: oldProvider,
                assignmentId: `assignment-phase157-memory-center-${suffix}`,
                dispatchKey: `dispatch-phase157-memory-center-${suffix}`,
                taskFingerprint: `phase157 memory center ${suffix}`,
                task: `Phase 157 Memory Center provider switch ${suffix}.`,
                worker_context_packet: packet,
            };
        };
        const matchedBase = makeAssignment("matched");
        const matchedReceipt = buildProviderSwitchDecisionReceiptForCoordinator(groupId, matchedBase, request, {
            verifySnapshot: false,
            nowMs,
            at: nowAt,
        });
        const matchedPacket = buildWorkerContextPacket({
            group: { id: groupId, members: [{ project }] },
            project,
            agentType: newProvider,
            task: matchedBase.task,
            pressureProvenanceProviderDispatchAdvisory: advisory,
            providerSwitchDecisionReceipt: matchedReceipt,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const matchedAssignment = {
            ...matchedBase,
            original_agent_type: oldProvider,
            agentType: newProvider,
            agent_type: newProvider,
            provider_switch_decision_receipt: matchedReceipt,
            worker_context_packet: matchedPacket,
        };
        recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, matchedAssignment, { at: nowAt });
        const matchedSession = recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
            assignment_id: matchedAssignment.assignmentId,
            dispatch_key: matchedAssignment.dispatchKey,
            provider_switch_decision_receipt: matchedReceipt,
            project,
            agent_type: newProvider,
            task_agent_session_id: "tas-phase157-memory-center-matched",
            native_session_id: "native-phase157-memory-center-matched",
            execution_id: "execution-phase157-memory-center-matched",
        }, { verifySnapshot: false, nowMs });
        const matchedExecution = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, {
            assignment_id: matchedAssignment.assignmentId,
            dispatch_key: matchedAssignment.dispatchKey,
            project,
            executed_provider: newProvider,
            task_agent_session_id: "tas-phase157-memory-center-matched",
            native_session_id: "native-phase157-memory-center-matched",
            execution_id: "execution-phase157-memory-center-matched",
            receipt_status: "done",
            receipt: {
                status: "done",
                providerSwitchExecution: {
                    decisionReceiptId: matchedReceipt.receipt_id,
                    expectedProvider: newProvider,
                    executedProvider: newProvider,
                    taskAgentSessionId: "tas-phase157-memory-center-matched",
                    nativeSessionId: "native-phase157-memory-center-matched",
                    executionId: "execution-phase157-memory-center-matched",
                    usageState: "executed",
                },
            },
        }, { verifySnapshot: false, nowMs });
        const advisedOnly = makeAssignment("advised-only");
        recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, advisedOnly, { at: nowAt });
        const healthyReport = (0, memory_control_center_1.buildWorkerContextPacketProviderSwitchDecisionReceiptReport)({ groupIds: [groupId] });
        const healthyQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_provider_switch_decision_receipt"],
            groupIds: [groupId],
            refresh: true,
        });
        const healthyCheck = (healthyQuality.checks || []).find((item) => item.id === "worker_context_packet_provider_switch_decision_receipt") || {};
        const mismatchBase = makeAssignment("mismatch");
        const mismatchReceipt = buildProviderSwitchDecisionReceiptForCoordinator(groupId, mismatchBase, request, {
            verifySnapshot: false,
            nowMs,
            at: nowAt,
        });
        const mismatchPacket = buildWorkerContextPacket({
            group: { id: groupId, members: [{ project }] },
            project,
            agentType: newProvider,
            task: mismatchBase.task,
            pressureProvenanceProviderDispatchAdvisory: advisory,
            providerSwitchDecisionReceipt: mismatchReceipt,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const mismatchAssignment = {
            ...mismatchBase,
            original_agent_type: oldProvider,
            agentType: newProvider,
            agent_type: newProvider,
            provider_switch_decision_receipt: mismatchReceipt,
            worker_context_packet: mismatchPacket,
        };
        recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, mismatchAssignment, { at: nowAt });
        recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
            assignment_id: mismatchAssignment.assignmentId,
            dispatch_key: mismatchAssignment.dispatchKey,
            provider_switch_decision_receipt: mismatchReceipt,
            project,
            agent_type: newProvider,
            task_agent_session_id: "tas-phase157-memory-center-mismatch",
            native_session_id: "native-phase157-memory-center-mismatch",
            execution_id: "execution-phase157-memory-center-mismatch",
        }, { verifySnapshot: false, nowMs });
        const mismatchExecution = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, {
            assignment_id: mismatchAssignment.assignmentId,
            dispatch_key: mismatchAssignment.dispatchKey,
            project,
            executed_provider: oldProvider,
            task_agent_session_id: "tas-phase157-memory-center-mismatch",
            native_session_id: "native-phase157-memory-center-mismatch",
            execution_id: "execution-phase157-memory-center-mismatch",
            receipt_status: "done",
            receipt: {
                status: "done",
                providerSwitchExecution: {
                    decisionReceiptId: mismatchReceipt.receipt_id,
                    expectedProvider: newProvider,
                    executedProvider: oldProvider,
                    taskAgentSessionId: "tas-phase157-memory-center-mismatch",
                    nativeSessionId: "native-phase157-memory-center-mismatch",
                    executionId: "execution-phase157-memory-center-mismatch",
                    usageState: "mismatch",
                },
            },
        }, { verifySnapshot: false, nowMs });
        const mismatchReport = (0, memory_control_center_1.buildWorkerContextPacketProviderSwitchDecisionReceiptReport)({ groupIds: [groupId] });
        const typedMemoryReport = (0, memory_control_center_1.buildWorkerContextPacketProviderSwitchExecutionTypedMemoryReport)({
            groupIds: [groupId],
            providerSwitchExecutionMismatchThreshold: 1,
            generatedAt: "2026-07-10T09:31:00.000Z",
        });
        const typedMemoryQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_provider_switch_execution_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const typedMemoryCheck = (typedMemoryQuality.checks || []).find((item) => item.id === "worker_context_packet_provider_switch_execution_typed_memory") || {};
        const typedMemoryGroup = typedMemoryReport.groups?.[0] || {};
        const typedMemoryProbe = (typedMemoryGroup.probes || []).find((row) => row.mismatchCount > 0) || {};
        const healthyRows = healthyReport.groups?.[0]?.checks || [];
        const mismatchRows = mismatchReport.groups?.[0]?.checks || [];
        const advisedRow = healthyRows.find((row) => row.lifecycle === "advised_only") || {};
        const matchedRow = healthyRows.find((row) => row.actually_executed_provider === newProvider) || {};
        const mismatchRow = mismatchRows.find((row) => row.actually_executed_provider === oldProvider && row.lifecycle === "executed") || {};
        const checks = {
            advisedOnlyAndMatchedExecutionAreHealthy: healthyReport.overall?.status === "ok"
                && Number(healthyReport.overall?.checkedBindingCount || 0) === 2
                && Number(healthyReport.overall?.coveredBindingCount || 0) === 2
                && advisedRow.covered === true
                && advisedRow.approved_switch === false
                && matchedRow.covered === true,
            matchedSessionAndExecutionAreBound: matchedSession?.status === "bound"
                && matchedExecution?.status === "passed"
                && matchedExecution?.system_attested === true
                && matchedExecution?.child_declared === true,
            targetedQualityCheckPasses: healthyCheck.status === "ok"
                && Number(healthyCheck.checked || 0) === 2
                && Number(healthyCheck.passed || 0) === 2
                && healthyQuality.availableCheckIds?.includes("worker_context_packet_provider_switch_decision_receipt"),
            mismatchExecutionDegradesReport: mismatchExecution?.status === "failed"
                && mismatchReport.overall?.status === "warn"
                && Number(mismatchReport.overall?.checkedBindingCount || 0) === 3
                && Number(mismatchReport.overall?.coveredBindingCount || 0) === 2,
            mismatchGapNamesActualRunnerFailure: mismatchRow.covered === false
                && mismatchRow.gaps?.includes("execution_receipt_not_passed")
                && mismatchRow.gaps?.includes("execution_provider_mismatch")
                && mismatchRow.actually_executed_provider === oldProvider,
            reportKeepsThreeLifecycleStatesDistinct: Number(mismatchReport.overall?.advisedAlternativeCount || 0) === 3
                && Number(mismatchReport.overall?.approvedSwitchCount || 0) === 2
                && Number(mismatchReport.overall?.executedProviderCount || 0) === 2
                && Number(mismatchReport.overall?.executionPassedCount || 0) === 1,
            providerSwitchExecutionTypedMemoryQualityPasses: typedMemoryReport.overall?.status === "ok"
                && typedMemoryCheck.status === "ok"
                && Number(typedMemoryReport.overall?.executionReceiptCount || 0) === 2
                && Number(typedMemoryReport.overall?.archivedExecutionReceiptCount || 0) === 2
                && Number(typedMemoryReport.overall?.typedMismatchCount || 0) === 1
                && Number(typedMemoryReport.overall?.policyCoveredAttributionCount || 0) >= 1
                && Number(typedMemoryReport.overall?.policyRankingSignalCoveredCount || 0) >= 1
                && Number(typedMemoryReport.overall?.policyProvenanceCoveredCount || 0) >= 1
                && typedMemoryQuality.availableCheckIds?.includes("worker_context_packet_provider_switch_execution_typed_memory"),
            providerSwitchExecutionTypedPolicyHoldsMismatch: typedMemoryProbe.covered === true
                && typedMemoryProbe.rankingSignalCovered === true
                && typedMemoryProbe.provenanceCovered === true
                && Number(typedMemoryProbe.rowWeightedRiskScore || 0) > 0
                && typedMemoryProbe.rowMismatchEscalated === true
                && typedMemoryProbe.policyActive === true
                && typedMemoryProbe.policyAction === "hold_provider_after_repeated_provider_switch_execution_mismatches",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            healthyReport: healthyReport.overall,
            mismatchReport: mismatchReport.overall,
            healthyCheck: {
                id: healthyCheck.id || "",
                status: healthyCheck.status || "",
                checked: healthyCheck.checked || 0,
                passed: healthyCheck.passed || 0,
            },
            typedMemoryReport: typedMemoryReport.overall,
            typedMemoryCheck: {
                id: typedMemoryCheck.id || "",
                status: typedMemoryCheck.status || "",
                checked: typedMemoryCheck.checked || 0,
                passed: typedMemoryCheck.passed || 0,
            },
            matchedExecution,
            mismatchExecution,
            mismatchRow,
        };
    }
    finally {
        try {
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
        for (const file of [bindingFile, `${bindingFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterWorkerContextPacketProviderSwitchExecutionTypedMemorySelfTest() {
    const result = runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest();
    return {
        ...result,
        pass: result.pass === true
            && result.checks?.providerSwitchExecutionTypedMemoryQualityPasses === true
            && result.checks?.providerSwitchExecutionTypedPolicyHoldsMismatch === true,
        focus: "worker_context_packet_provider_switch_execution_typed_memory",
    };
}
function runMemoryCenterWorkerContextPacketProviderSwitchExecutionRankingSelfTest() {
    const { runWorkerContextProviderSwitchExecutionRankingSelfTest } = require("../collaboration/group-orchestrator");
    const result = runWorkerContextProviderSwitchExecutionRankingSelfTest();
    return {
        ...result,
        pass: result.pass === true
            && result.checks?.policyCarriesDecayedExecutionRisk === true
            && result.checks?.policyCarriesTypedMemoryProvenance === true
            && result.checks?.rankingUsesExecutionDecayForSaferAlternative === true
            && result.checks?.advisoryCarriesCompactSafeRankingProvenance === true
            && result.checks?.rankingDoesNotAutoSwitchCurrentAssignment === true,
        focus: "worker_context_packet_provider_switch_execution_ranking",
    };
}
function runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest() {
    const sourceGroupId = `memory-center-cross-pressure-source-${process.pid}-${Date.now()}`;
    const targetGroupId = `memory-center-cross-pressure-target-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(targetGroupId);
    const sourceTypedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(sourceGroupId));
    const targetTypedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(targetGroupId));
    const targetProject = "phase129-pressure-project";
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId: targetGroupId,
            file: bindingFile,
            updatedAt: "2026-07-09T23:40:00.000Z",
            bindingCount: 1,
            entries: [{
                    schema: "ccm-worker-context-packet-assignment-binding-v1",
                    binding_id: "binding-cross-pressure-usage-selftest",
                    groupId: targetGroupId,
                    source: "worker_context_packet_pre_dispatch_gate",
                    project: targetProject,
                    assignment_id: "assignment-cross-pressure-usage-selftest",
                    dispatch_key: "dispatch-cross-pressure-usage-selftest",
                    worker_context_packet_id: "wcp-cross-pressure-usage-selftest",
                    worker_context_packet_context_usage: {
                        schema: "ccm-worker-context-usage-v1",
                        packet_id: "wcp-cross-pressure-usage-selftest",
                        project: targetProject,
                        status: "over_budget",
                        pressure: 116,
                        total_tokens: 1160,
                        max_tokens: 1000,
                        free_tokens: -280,
                        autocompact_buffer_tokens: 120,
                    },
                    should_create_real_task: false,
                    at: "2026-07-09T23:40:00.000Z",
                }],
        });
        const { recordGroupTypedMemoryPressureRecallUsageLedger, } = require("../collaboration/group-memory-index");
        const sourceRecord = recordGroupTypedMemoryPressureRecallUsageLedger(sourceGroupId, {
            targetProject,
            taskId: "cross-pressure-usage-mcc-source-task",
            executionId: "cross-pressure-usage-mcc-source-execution",
            agent: "frontend",
            generatedAt: "2026-07-09T23:40:01.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-source-used",
                    pressure_status: "over_budget",
                    usage_state: "used",
                    reason: "selftest: another group used compact strategy pressure memory for target project",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-source-verified",
                    pressure_status: "over_budget",
                    usage_state: "verified",
                    reason: "selftest: another group verified compact strategy pressure memory for target project",
                },
            ],
        });
        const assistReport = (0, memory_control_center_1.buildWorkerContextPacketCrossGroupPressureRecallUsageReport)({
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            nowMs: Date.parse("2026-07-09T23:40:02.000Z"),
        });
        const assistQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_cross_group_pressure_recall_usage"],
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            nowMs: Date.parse("2026-07-09T23:40:02.000Z"),
            refresh: true,
        });
        const assistCheck = (assistQuality.checks || []).find((item) => item.id === "worker_context_packet_cross_group_pressure_recall_usage") || {};
        const assistGroup = (assistReport.groups || []).find((row) => row.groupId === targetGroupId) || {};
        const assistProject = (assistGroup.projects || []).find((row) => row.targetProject === targetProject) || {};
        const localRecord = recordGroupTypedMemoryPressureRecallUsageLedger(targetGroupId, {
            targetProject,
            taskId: "cross-pressure-usage-mcc-local-task",
            executionId: "cross-pressure-usage-mcc-local-execution",
            agent: "frontend",
            generatedAt: "2026-07-09T23:40:03.000Z",
            rows: [
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-local-ignored-1",
                    pressure_status: "over_budget",
                    usage_state: "ignored",
                    reason: "selftest: local group ignored compact strategy pressure memory",
                },
                {
                    rel_path: "worker-context-compact-strategy-memory.md",
                    name: "WorkerContextPacket Compact Strategy Memory",
                    type: "reference",
                    worker_context_packet_id: "wcp-cross-pressure-local-ignored-2",
                    pressure_status: "over_budget",
                    usage_state: "ignored",
                    reason: "selftest: local group ignored compact strategy pressure memory again",
                },
            ],
        });
        const conflictReport = (0, memory_control_center_1.buildWorkerContextPacketCrossGroupPressureRecallUsageReport)({
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            nowMs: Date.parse("2026-07-09T23:40:04.000Z"),
        });
        const conflictQuality = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["worker_context_packet_cross_group_pressure_recall_usage"],
            groupIds: [targetGroupId],
            crossGroupPressureRecallUsageGroupIds: [sourceGroupId],
            nowMs: Date.parse("2026-07-09T23:40:04.000Z"),
            refresh: true,
        });
        const conflictCheck = (conflictQuality.checks || []).find((item) => item.id === "worker_context_packet_cross_group_pressure_recall_usage") || {};
        const conflictGroup = (conflictReport.groups || []).find((row) => row.groupId === targetGroupId) || {};
        const conflictProject = (conflictGroup.projects || []).find((row) => row.targetProject === targetProject) || {};
        const checks = {
            sourceLedgerCreatesCrossGroupEvidence: sourceRecord?.recorded_count === 2,
            targetWithoutLocalLedgerUsesCrossGroupAssist: assistReport.overall?.status === "ok"
                && assistCheck.status === "ok"
                && assistProject.mode === "cross_group_project_assist"
                && Number(assistProject.crossGroupSupplementCount || 0) >= 1
                && Number(assistProject.sourceGroupCount || 0) === 1
                && assistProject.supplementRows?.some((row) => row.rel_path === "worker-context-compact-strategy-memory.md" && row.recommendation === "promote_pressure_recall"),
            localConflictIsAudited: localRecord?.recorded_count === 2
                && conflictReport.overall?.status === "warn"
                && Number(conflictReport.overall?.conflictCount || 0) >= 1
                && conflictProject.mode === "local_first"
                && Number(conflictProject.conflictCount || 0) >= 1
                && conflictCheck.status === "fail"
                && (conflictCheck.gaps || []).some((gap) => /local deprioritize_pressure_recall but cross-group promote_pressure_recall/.test(gap.reason || "")),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            assist: {
                overall: assistReport.overall,
                project: assistProject,
                quality: { status: assistCheck.status || "", checked: assistCheck.checked || 0, passed: assistCheck.passed || 0 },
            },
            conflict: {
                overall: conflictReport.overall,
                project: conflictProject,
                quality: { status: conflictCheck.status || "", checked: conflictCheck.checked || 0, passed: conflictCheck.passed || 0, gaps: conflictCheck.gaps || [] },
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
        for (const dir of [sourceTypedDir, targetTypedDir]) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
//# sourceMappingURL=memory-control-provider-self-tests.js.map