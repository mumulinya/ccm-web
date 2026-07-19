"use strict";
// Behavior-freeze split from group-orchestrator-provider-self-tests.ts (part 3/3).
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
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest;
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest;
const fs = __importStar(require("fs"));
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_1 = require("./group-orchestrator");
function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest() {
    const groupId = `worker-context-pressure-provenance-provider-dispatch-override-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override.md";
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: targetProject, agent: agentType },
            ],
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase147-initial-missing-usage",
                    binding_id: "binding-phase147-initial-missing-usage",
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
                    packet_id: "wcp-phase147-initial-current-source-gap",
                    binding_id: "binding-phase147-initial-current-source-gap",
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
            updatedAt: "2026-07-10T03:40:00.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase147-recovery-1",
                    binding_id: "binding-phase147-recovery-1",
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
                    packet_id: "wcp-phase147-recovery-2",
                    binding_id: "binding-phase147-recovery-2",
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
            updatedAt: "2026-07-10T03:40:01.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase147-relapse-missing-usage",
                    binding_id: "binding-phase147-relapse-missing-usage",
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
            updatedAt: "2026-07-10T03:40:02.000Z",
        });
        const invalidOverride = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
            approved: true,
            approved_by: "local-user",
            reason: "Phase 147 invalid override is missing risk acceptance.",
            project: targetProject,
            agent_type: agentType,
            override_action: "allow_once",
        };
        const invalidAssignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证无效 provider dispatch override 不会绕过 hold。", "selftest invalid provider override", "", {
            group,
            providerDispatchOverride: invalidOverride,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const validOverride = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
            approved: true,
            approved_by: "local-user",
            risk_accepted: true,
            acknowledges_repair_required: true,
            reason: "Phase 147 selftest explicitly accepts temporary provider risk and requires follow-up repair.",
            project: targetProject,
            agent_type: agentType,
            override_action: "allow_once",
            approved_at: "2026-07-10T03:40:03.000Z",
        };
        const validAssignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证有效 provider dispatch override receipt 可以一次性放行。", "selftest valid provider override", "", {
            group,
            providerDispatchOverride: validOverride,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const invalidBinding = (ledger.entries || []).find((entry) => entry.assignment_id === invalidAssignment.assignmentId) || {};
        const validBinding = (ledger.entries || []).find((entry) => entry.assignment_id === validAssignment.assignmentId) || {};
        const invalidDecision = invalidBinding.worker_context_provider_dispatch_decision || {};
        const validDecision = validBinding.worker_context_provider_dispatch_decision || {};
        const checks = {
            invalidOverrideDoesNotBypassHold: invalidAssignment.dispatch_ready === false
                && invalidAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold === true
                && invalidAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold_overridden !== true
                && invalidDecision.action === "hold_until_repair"
                && invalidDecision.provider_dispatch_override_receipt?.valid === false,
            validOverrideDispatchesOnce: validAssignment.dispatch_ready === true
                && validAssignment.status === "pending"
                && validAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold === true
                && validAssignment.worker_context_pre_dispatch_gate?.provider_dispatch_hold_overridden === true
                && validAssignment.worker_context_pre_dispatch_gate?.next_step === "dispatch_child_agent_with_provider_override_receipt",
            validDecisionCarriesOverrideReceipt: validDecision.action === "dispatch_with_provider_override"
                && validDecision.dispatch_ready === true
                && validDecision.should_create_real_task === true
                && validDecision.provider_dispatch_hold === true
                && validDecision.provider_dispatch_hold_overridden === true
                && validDecision.requires_repair_followup === true
                && validDecision.provider_dispatch_override_receipt?.valid === true,
            bindingLedgerPersistsOverride: validBinding.worker_context_provider_dispatch_override_receipt?.valid === true
                && validBinding.worker_context_provider_dispatch_decision?.provider_dispatch_override_receipt?.approved_by === "local-user",
            ledgerCountersTrackOverride: Number(ledger.providerDispatchDecisionCount || 0) >= 2
                && Number(ledger.providerDispatchHoldDecisionCount || 0) >= 1
                && Number(ledger.providerDispatchOverrideDecisionCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            invalid: {
                action: invalidDecision.action || "",
                dispatch_ready: invalidDecision.dispatch_ready,
                override_valid: invalidDecision.provider_dispatch_override_receipt?.valid === true,
                gaps: invalidDecision.provider_dispatch_override_receipt?.gaps || [],
            },
            valid: {
                action: validDecision.action || "",
                dispatch_ready: validDecision.dispatch_ready,
                override_valid: validDecision.provider_dispatch_override_receipt?.valid === true,
                next_step: validAssignment.worker_context_pre_dispatch_gate?.next_step || "",
            },
            ledger: {
                providerDispatchDecisionCount: ledger.providerDispatchDecisionCount || 0,
                providerDispatchHoldDecisionCount: ledger.providerDispatchHoldDecisionCount || 0,
                providerDispatchOverrideDecisionCount: ledger.providerDispatchOverrideDecisionCount || 0,
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
            if (typedDir && fs.existsSync(typedDir))
                fs.rmSync(typedDir, { recursive: true, force: true });
        }
        catch { }
    }
}
function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest() {
    const groupId = `worker-context-pressure-provenance-provider-dispatch-override-completion-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const workItemsFile = (0, group_orchestrator_1.getReplayRepairWorkItemsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-completion.md";
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: targetProject, agent: agentType },
            ],
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase148-initial-missing-usage",
                    binding_id: "binding-phase148-initial-missing-usage",
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
                    packet_id: "wcp-phase148-initial-current-source-gap",
                    binding_id: "binding-phase148-initial-current-source-gap",
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
            updatedAt: "2026-07-10T04:00:00.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase148-recovery-1",
                    binding_id: "binding-phase148-recovery-1",
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
                    packet_id: "wcp-phase148-recovery-2",
                    binding_id: "binding-phase148-recovery-2",
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
            updatedAt: "2026-07-10T04:00:01.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [
                {
                    groupId,
                    packet_id: "wcp-phase148-relapse-missing-usage",
                    binding_id: "binding-phase148-relapse-missing-usage",
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
            updatedAt: "2026-07-10T04:00:02.000Z",
        });
        const validOverride = {
            schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
            approved: true,
            approved_by: "local-user",
            risk_accepted: true,
            acknowledges_repair_required: true,
            reason: "Phase 148 selftest accepts one provider override and requires completion follow-up.",
            project: targetProject,
            agent_type: agentType,
            override_action: "allow_once",
            approved_at: "2026-07-10T04:00:03.000Z",
        };
        const assignment = (0, group_orchestrator_1.buildAssignment)({ project: targetProject, agent: agentType }, "验证 provider dispatch override completion 会关闭 follow-up repair work item。", "selftest provider override completion", "", {
            group,
            providerDispatchOverride: validOverride,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const initialLedger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const initialBinding = (initialLedger.entries || []).find((entry) => entry.assignment_id === assignment.assignmentId) || {};
        const followupRef = initialBinding.worker_context_provider_dispatch_override_followup_repair || {};
        const workItemLedgerBefore = (0, group_orchestrator_1.readReplayRepairWorkItemLedgerForCoordinator)(groupId);
        const workItemBefore = (workItemLedgerBefore.items || []).find((item) => (item.work_item_id || item.id) === followupRef.work_item_id) || {};
        const receipt = {
            status: "done",
            summary: "provider override completion supplied verified pressure provenance follow-up",
            memoryProvenanceUsage: [{
                    relPath,
                    usageState: "verified",
                    repairStatus: "completed",
                    repairGapType: "provider_dispatch_override_followup",
                    currentSourceVerified: true,
                    reason: "Phase 148 selftest verified current source after override dispatch.",
                }],
        };
        const completion = (0, group_orchestrator_1.recordWorkerContextProviderDispatchOverrideCompletionForCoordinator)(groupId, {
            assignment_id: assignment.assignmentId,
            dispatch_key: assignment.dispatchKey,
            worker_context_packet_id: assignment.worker_context_packet?.packet_id || "",
            task_id: "task-phase148-provider-override-completion",
            worker_handoff_id: "handoff-phase148-provider-override-completion",
            task_agent_session_id: "tas-phase148-provider-override-completion",
            native_session_id: "native-phase148-provider-override-completion",
            execution_id: "execution-phase148-provider-override-completion",
            memory_context_snapshot_id: "snapshot-phase148-provider-override-completion",
            memory_context_snapshot_checksum: "snapshot-checksum-phase148-provider-override-completion",
            receipt_status: "done",
            receipt,
        }, { at: "2026-07-10T04:00:04.000Z" }) || {};
        const finalLedger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const finalBinding = (finalLedger.entries || []).find((entry) => entry.assignment_id === assignment.assignmentId) || {};
        const workItemLedgerAfter = (0, group_orchestrator_1.readReplayRepairWorkItemLedgerForCoordinator)(groupId);
        const workItemAfter = (workItemLedgerAfter.items || []).find((item) => (item.work_item_id || item.id) === followupRef.work_item_id) || {};
        const checks = {
            overrideDispatchCreatesFollowupWorkItem: assignment.dispatch_ready === true
                && initialBinding.worker_context_provider_dispatch_decision?.action === "dispatch_with_provider_override"
                && followupRef.work_item_id
                && (0, group_orchestrator_1.replayRepairWorkItemOpenForCoordinator)(workItemBefore.status),
            completionRequiresVerifiedMemoryProvenanceUsage: completion.completion_ok === true
                && completion.memory_provenance_usage_count === 1
                && completion.current_source_verified_count === 1
                && completion.followup_repair_work_item_completion?.closed === 1,
            bindingLedgerPersistsCompletion: finalBinding.worker_context_provider_dispatch_override_completion?.completion_ok === true
                && finalBinding.worker_context_provider_dispatch_override_completion?.task_agent_session_id === "tas-phase148-provider-override-completion"
                && Number(finalLedger.providerDispatchOverrideCompletionCount || 0) >= 1,
            followupRepairWorkItemClosed: (0, group_orchestrator_1.replayRepairWorkItemStatusForCoordinator)(workItemAfter.status) === "completed"
                && workItemAfter.completion_source === "provider_dispatch_override_completion_receipt"
                && workItemAfter.provider_dispatch_override_completion?.completion_id === completion.completion_id,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            followup: {
                work_item_id: followupRef.work_item_id || "",
                before_status: (0, group_orchestrator_1.replayRepairWorkItemStatusForCoordinator)(workItemBefore.status),
                after_status: (0, group_orchestrator_1.replayRepairWorkItemStatusForCoordinator)(workItemAfter.status),
            },
            completion: {
                status: completion.status || "",
                completion_ok: completion.completion_ok === true,
                memory_provenance_usage_count: completion.memory_provenance_usage_count || 0,
                current_source_verified_count: completion.current_source_verified_count || 0,
            },
            ledger: {
                providerDispatchOverrideCompletionCount: finalLedger.providerDispatchOverrideCompletionCount || 0,
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
//# sourceMappingURL=group-orchestrator-provider-self-tests-part-03.js.map