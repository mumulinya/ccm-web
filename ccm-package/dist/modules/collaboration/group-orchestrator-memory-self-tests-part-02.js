"use strict";
// Behavior-freeze split from group-orchestrator-memory-self-tests.ts (part 2/2).
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
exports.runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest = runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest;
exports.runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest = runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest;
exports.runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest = runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest;
const fs = __importStar(require("fs"));
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_1 = require("./group-orchestrator");
function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest() {
    const groupId = `worker-context-pressure-provider-override-followup-pre-dispatch-memory-selftest-${process.pid}-${Date.now()}`;
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-pre-dispatch-memory.md";
    try {
        const group = (0, group_orchestrator_1.normalizeGroupOrchestrator)({
            id: groupId,
            members: [
                { project: "coordinator", role: "coordinator" },
                { project: targetProject, agent: agentType },
            ],
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [{
                    groupId,
                    packet_id: "wcp-phase150-initial-missing-usage",
                    binding_id: "binding-phase150-initial-missing-usage",
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
            updatedAt: "2026-07-10T04:30:00.000Z",
        });
        (0, group_memory_index_1.distillProviderDispatchOverrideFollowupToTypedMemory)(groupId, {
            rows: [{
                    groupId,
                    project: targetProject,
                    agent_type: agentType,
                    binding_id: "binding-phase150-provider-override-followup",
                    assignment_id: "assignment-phase150-provider-override-followup",
                    dispatch_key: "dispatch-phase150-provider-override-followup",
                    worker_context_packet_id: "wcp-phase150-provider-override-followup",
                    worker_context_provider_dispatch_decision: {
                        schema: "ccm-worker-context-provider-dispatch-decision-v1",
                        action: "dispatch_with_provider_override",
                        decision_id: "decision-phase150-provider-override-followup",
                        project: targetProject,
                        agent_type: agentType,
                    },
                    worker_context_provider_dispatch_override_receipt: {
                        schema: "ccm-pressure-provenance-provider-dispatch-override-receipt-v1",
                        override_id: "provider-dispatch-override:phase150-pre-dispatch-memory",
                        valid: true,
                        approved: true,
                        approved_by: "local-user",
                        risk_accepted: true,
                        acknowledges_repair_required: true,
                        reason: "Phase 150 pre-dispatch memory repaired history selftest.",
                    },
                    worker_context_provider_dispatch_override_followup_repair: {
                        work_item_id: "work-phase150-provider-override-followup",
                    },
                    worker_context_provider_dispatch_override_completion: {
                        schema: "ccm-worker-context-provider-dispatch-override-completion-v1",
                        completion_id: "completion-phase150-provider-override-followup",
                        status: "completed",
                        completion_ok: true,
                        project: targetProject,
                        agent_type: agentType,
                        binding_id: "binding-phase150-provider-override-followup",
                        assignment_id: "assignment-phase150-provider-override-followup",
                        dispatch_key: "dispatch-phase150-provider-override-followup",
                        worker_context_packet_id: "wcp-phase150-provider-override-followup",
                        decision_id: "decision-phase150-provider-override-followup",
                        override_id: "provider-dispatch-override:phase150-pre-dispatch-memory",
                        followup_work_item_id: "work-phase150-provider-override-followup",
                        task_id: "task-phase150-provider-override-followup",
                        task_agent_session_id: "tas-phase150-provider-override-followup",
                        execution_id: "execution-phase150-provider-override-followup",
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
                                    reason: "PROVIDER_OVERRIDE_FOLLOWUP_PRE_DISPATCH_MEMORY_SENTINEL repaired provider override history.",
                                }],
                        },
                        reason: "override child-agent completion receipt supplied verified memoryProvenanceUsage follow-up evidence",
                        at: "2026-07-10T04:31:00.000Z",
                    },
                }],
        }, {
            reason: "phase150-pre-dispatch-provider-override-followup-memory",
            updatedAt: "2026-07-10T04:31:00.000Z",
        });
        const baseAssignment = {
            project: targetProject,
            agentType,
            task: "验证 provider override follow-up typed memory 会参与 pre-dispatch provider selection。",
            reason: "selftest provider override follow-up pre-dispatch memory",
            dependsOn: "",
            taskFingerprint: "provider-override-followup-pre-dispatch-memory-selftest",
            dispatchKey: `${groupId}|coordinator|${targetProject}|provider-override-followup-pre-dispatch-memory-selftest`,
            assignmentId: `${targetProject}::${groupId}|coordinator|${targetProject}|provider-override-followup-pre-dispatch-memory-selftest::initial::1`,
            attempt: 1,
            sourceProject: "coordinator",
            scopeId: groupId,
        };
        const repairedPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(baseAssignment, "", [], {
            group,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const repairedGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, repairedPacket);
        const repairedDecision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(baseAssignment, repairedPacket, repairedGate, {
            at: "2026-07-10T04:31:30.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory)(groupId, {
            packets: [{
                    groupId,
                    packet_id: "wcp-phase150-post-override-compliant-recovery",
                    binding_id: "binding-phase150-post-override-compliant-recovery",
                    project: targetProject,
                    agent_type: agentType,
                    status: "compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    receipt_row_count: 1,
                    compliant_doc_count: 1,
                    current_source_verified_count: 1,
                    rel_paths: [relPath],
                }],
        }, {
            updatedAt: "2026-07-10T04:32:00.000Z",
        });
        (0, group_memory_index_1.distillPressureProvenancePreDispatchComplianceToTypedMemory)(groupId, {
            packets: [{
                    groupId,
                    packet_id: "wcp-phase150-post-repair-relapse",
                    binding_id: "binding-phase150-post-repair-relapse",
                    project: targetProject,
                    agent_type: agentType,
                    status: "non_compliant",
                    pre_dispatch_prompted: true,
                    required_doc_count: 1,
                    missing_memory_provenance_usage: true,
                    gaps: [{ code: "receipt_memoryProvenanceUsage", reason: "post-repair relapse missing memoryProvenanceUsage" }],
                    rel_paths: [relPath],
                }],
        }, {
            frequentThreshold: 2,
            updatedAt: "2026-07-10T04:33:00.000Z",
        });
        const relapsedPacket = (0, group_orchestrator_1.buildWorkerContextPacketForAssignment)(baseAssignment, "", [], {
            group,
            workerContextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const relapsedGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(baseAssignment, relapsedPacket);
        const relapsedDecision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(baseAssignment, relapsedPacket, relapsedGate, {
            at: "2026-07-10T04:33:30.000Z",
        });
        const repairedCandidate = repairedPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate || {};
        const relapsedCandidate = relapsedPacket.pressure_provenance_provider_dispatch_advisory?.selected_candidate || {};
        const checks = {
            repairedHistoryFeedsProviderAdvisory: repairedCandidate.provider_override_followup_repaired === true
                && Number(repairedCandidate.provider_override_followup_repaired_count || 0) === 1
                && repairedCandidate.provider_override_followup_last_completed_at === "2026-07-10T04:31:00.000Z",
            repairedHistoryAllowsSamplingNotHold: repairedCandidate.health_status === "monitor"
                && repairedCandidate.dispatch_policy === "allow_with_receipt_sampling"
                && repairedPacket.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === false
                && repairedGate.dispatch_ready === true
                && repairedGate.provider_dispatch_hold === false
                && repairedDecision.action === "dispatch_with_receipt_sampling"
                && repairedDecision.requires_receipt_sampling === true,
            preDispatchGateCarriesRepairedHistory: repairedGate.provider_dispatch_override_followup_history?.repaired === true
                && repairedGate.provider_dispatch_override_followup_history?.followup_work_item_ids?.includes("work-phase150-provider-override-followup"),
            activeRelapseStillWinsOverHistory: relapsedCandidate.provider_override_followup_repaired === true
                && relapsedCandidate.provider_override_followup_fresh_after_last_violation === false
                && relapsedCandidate.health_status === "critical"
                && relapsedCandidate.dispatch_policy === "hold_until_repair"
                && relapsedPacket.pressure_provenance_provider_dispatch_advisory?.should_hold_dispatch === true
                && relapsedGate.dispatch_ready === false
                && relapsedGate.provider_dispatch_hold_blocked === true
                && relapsedDecision.action === "hold_until_repair",
            holdDecisionStillRequiresRepair: relapsedDecision.requires_repair_before_dispatch === true
                && relapsedDecision.dispatch_ready === false
                && relapsedDecision.evidence?.provider_override_followup_repaired === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repaired: {
                health_status: repairedCandidate.health_status || "",
                dispatch_policy: repairedCandidate.dispatch_policy || "",
                provider_override_followup_repaired: repairedCandidate.provider_override_followup_repaired === true,
                action: repairedDecision.action || "",
                dispatch_ready: repairedGate.dispatch_ready,
            },
            relapsed: {
                health_status: relapsedCandidate.health_status || "",
                dispatch_policy: relapsedCandidate.dispatch_policy || "",
                provider_override_followup_repaired: relapsedCandidate.provider_override_followup_repaired === true,
                provider_override_followup_fresh_after_last_violation: relapsedCandidate.provider_override_followup_fresh_after_last_violation === true,
                action: relapsedDecision.action || "",
                dispatch_ready: relapsedGate.dispatch_ready,
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
function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest() {
    const groupId = `worker-context-provider-override-followup-receipt-contract-validation-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const workItemsFile = (0, group_orchestrator_1.getReplayRepairWorkItemsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-validation.md";
    const followupWorkItemId = "work-phase152-provider-override-followup";
    const overrideId = "provider-dispatch-override:phase152-validation";
    try {
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
                provider_override_followup_last_completed_at: "2026-07-10T05:00:00.000Z",
                provider_override_followup_fresh_after_last_violation: true,
                provider_override_followup_rel_paths: [relPath],
                provider_override_followup_work_item_ids: [followupWorkItemId],
                provider_override_followup_override_ids: [overrideId],
            },
        };
        const packet = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 152 provider override follow-up receipt contract validation selftest.",
            pressureProvenanceProviderDispatchAdvisory: advisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const assignment = {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase152-provider-override-followup-validation",
            dispatchKey: "dispatch-phase152-provider-override-followup-validation",
            taskFingerprint: "phase152 provider override followup receipt contract validation",
            worker_context_packet: packet,
            dispatch_ready: true,
        };
        const binding = (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment, { at: "2026-07-10T05:00:01.000Z" }) || {};
        const invalidValidation = (0, group_orchestrator_1.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator)(groupId, {
            binding_id: binding.binding_id,
            assignment_id: assignment.assignmentId,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase152-provider-override-followup-validation",
            task_agent_session_id: "tas-phase152-provider-override-followup-validation",
            execution_id: "execution-phase152-provider-override-followup-validation-invalid",
            receipt_status: "done",
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{
                        relPath,
                        usageState: "used",
                        repairStatus: "completed",
                        repairGapType: "provider_dispatch_override_followup",
                        currentSourceVerified: true,
                        reason: "missing providerDispatchOverrideFollowupHistoryReverified and override id",
                    }],
            },
        }, { at: "2026-07-10T05:00:02.000Z" });
        const validValidation = (0, group_orchestrator_1.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator)(groupId, {
            binding_id: binding.binding_id,
            assignment_id: assignment.assignmentId,
            worker_context_packet_id: packet.packet_id,
            task_id: "task-phase152-provider-override-followup-validation",
            task_agent_session_id: "tas-phase152-provider-override-followup-validation",
            execution_id: "execution-phase152-provider-override-followup-validation-valid",
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
                        reason: "Phase 152 selftest reverified current source for provider override follow-up repaired history.",
                    }],
            },
        }, { at: "2026-07-10T05:00:03.000Z" });
        const ledger = (0, group_orchestrator_1.readReplayRepairDispatchBindingLedgerForCoordinator)(groupId);
        const finalBinding = (ledger.entries || []).find((entry) => entry.binding_id === binding.binding_id) || {};
        const checks = {
            invalidReceiptFailsContract: invalidValidation?.status === "failed"
                && invalidValidation?.contract_satisfied === false
                && (invalidValidation?.gaps || []).some((gap) => gap.code === "missing_override_id_coverage" || gap.code === "missing_provider_override_followup_reverified_rows"),
            validReceiptPassesContract: validValidation?.status === "passed"
                && validValidation?.contract_satisfied === true
                && validValidation?.covered_rel_path_count === 1
                && validValidation?.covered_followup_work_item_count === 1
                && validValidation?.covered_override_id_count === 1,
            ledgerPersistsFinalValidation: finalBinding.worker_context_provider_dispatch_override_followup_receipt_contract_validation?.contract_satisfied === true
                && finalBinding.provider_dispatch_override_followup_receipt_contract_validation_status === "passed"
                && finalBinding.execution_id === "execution-phase152-provider-override-followup-validation-valid",
            ledgerCountersTrackValidation: Number(ledger.providerDispatchOverrideFollowupReceiptContractValidationCount || 0) >= 1
                && Number(ledger.providerDispatchOverrideFollowupReceiptContractValidationPassedCount || 0) >= 1
                && Number(ledger.providerDispatchOverrideFollowupReceiptContractValidationFailedCount || 0) === 0,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            invalid: {
                status: invalidValidation?.status || "",
                gaps: (invalidValidation?.gaps || []).map((gap) => gap.code || gap.reason),
            },
            valid: {
                status: validValidation?.status || "",
                contract_satisfied: validValidation?.contract_satisfied === true,
                covered_rel_path_count: validValidation?.covered_rel_path_count || 0,
                covered_followup_work_item_count: validValidation?.covered_followup_work_item_count || 0,
                covered_override_id_count: validValidation?.covered_override_id_count || 0,
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
function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest() {
    const groupId = `worker-context-provider-override-followup-receipt-validation-policy-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, group_orchestrator_1.getReplayRepairDispatchBindingsFileForCoordinator)(groupId);
    const workItemsFile = (0, group_orchestrator_1.getReplayRepairWorkItemsFileForCoordinator)(groupId);
    const typedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(groupId);
    const targetProject = "api";
    const agentType = "codex";
    const relPath = "pressure-provider-dispatch-override-followup-receipt-validation-policy.md";
    const followupWorkItemId = "work-phase154-provider-override-followup";
    const overrideId = "provider-dispatch-override:phase154-validation-policy";
    try {
        const initialAdvisory = {
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
                provider_override_followup_last_completed_at: "2026-07-10T06:00:00.000Z",
                provider_override_followup_fresh_after_last_violation: true,
                provider_override_followup_rel_paths: [relPath],
                provider_override_followup_work_item_ids: [followupWorkItemId],
                provider_override_followup_override_ids: [overrideId],
            },
        };
        const initialPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 154 corrected receipt validation policy selftest.",
            pressureProvenanceProviderDispatchAdvisory: initialAdvisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const assignment = {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase154-provider-override-followup-validation-policy",
            dispatchKey: "dispatch-phase154-provider-override-followup-validation-policy",
            taskFingerprint: "phase154 provider override followup receipt validation policy",
            worker_context_packet: initialPacket,
            dispatch_ready: true,
        };
        const binding = (0, group_orchestrator_1.recordWorkerContextPacketAssignmentBindingForCoordinator)(groupId, assignment, { at: "2026-07-10T06:00:01.000Z" }) || {};
        const recordFailedAttempt = (executionId, at) => (0, group_orchestrator_1.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator)(groupId, {
            binding_id: binding.binding_id,
            assignment_id: assignment.assignmentId,
            worker_context_packet_id: initialPacket.packet_id,
            task_id: "task-phase154-provider-override-followup-validation-policy",
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
                        reason: "corrected receipt still misses work-item, override-id, and reverified history evidence",
                    }],
            },
        }, { at });
        const failedOne = recordFailedAttempt("execution-phase154-validation-failed-1", "2026-07-10T06:00:02.000Z");
        const failedTwo = recordFailedAttempt("execution-phase154-validation-failed-2", "2026-07-10T06:00:03.000Z");
        const escalatedPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
            targetProject,
            agentType,
            providerOverrideFollowupReceiptValidationFailureThreshold: 2,
            generatedAt: "2026-07-10T06:00:04.000Z",
        });
        const escalatedAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(groupId, targetProject, agentType, escalatedPolicy) || {};
        const escalatedPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 154 dispatch must hold after repeated corrected receipt failures.",
            pressureProvenanceDispatchFeedbackPolicy: escalatedPolicy,
            pressureProvenanceProviderDispatchAdvisory: escalatedAdvisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const escalatedAssignment = {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase154-escalated-provider",
            dispatchKey: "dispatch-phase154-escalated-provider",
        };
        const escalatedGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(escalatedAssignment, escalatedPacket);
        const escalatedDecision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(escalatedAssignment, escalatedPacket, escalatedGate, { at: "2026-07-10T06:00:04.000Z" });
        const passed = (0, group_orchestrator_1.recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator)(groupId, {
            binding_id: binding.binding_id,
            assignment_id: assignment.assignmentId,
            worker_context_packet_id: initialPacket.packet_id,
            task_id: "task-phase154-provider-override-followup-validation-policy",
            task_agent_session_id: "tas-execution-phase154-validation-passed",
            execution_id: "execution-phase154-validation-passed",
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
                        reason: "Phase 154 corrected receipt satisfies the complete provider override follow-up contract.",
                    }],
            },
        }, { at: "2026-07-10T06:00:05.000Z" });
        const repairedPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
            targetProject,
            agentType,
            providerOverrideFollowupReceiptValidationFailureThreshold: 2,
            generatedAt: "2026-07-10T06:00:06.000Z",
        });
        const repairedAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(groupId, targetProject, agentType, repairedPolicy) || {};
        const repairedPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: groupId, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 154 dispatch returns to monitored receipt sampling after verified repair.",
            pressureProvenanceDispatchFeedbackPolicy: repairedPolicy,
            pressureProvenanceProviderDispatchAdvisory: repairedAdvisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const repairedAssignment = {
            scopeId: groupId,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase154-repaired-provider",
            dispatchKey: "dispatch-phase154-repaired-provider",
        };
        const repairedGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(repairedAssignment, repairedPacket);
        const repairedDecision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(repairedAssignment, repairedPacket, repairedGate, { at: "2026-07-10T06:00:06.000Z" });
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments } = require("./group-memory-index");
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const archive = typedLedger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
        const attribution = archive.attributions?.[0] || {};
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const escalatedCandidate = escalatedAdvisory.selected_candidate || {};
        const repairedCandidate = repairedAdvisory.selected_candidate || {};
        const checks = {
            everyAttemptIsArchived: failedOne?.status === "failed"
                && failedTwo?.status === "failed"
                && passed?.status === "passed"
                && Number(archive.attempt_count || 0) === 3
                && Number(archive.failed_count || 0) === 2
                && Number(archive.passed_count || 0) === 1,
            typedFeedbackDocumentWritten: docs.some((doc) => doc.relPath === "provider-dispatch-override-followup-receipt-validation-history.md" && doc.type === "feedback"),
            repeatedFailuresEscalatePolicy: escalatedPolicy.active === true
                && escalatedPolicy.action === "hold_provider_after_repeated_override_followup_receipt_validation_failures"
                && Number(escalatedCandidate.provider_override_followup_receipt_validation_consecutive_failure_count || 0) === 2
                && escalatedCandidate.provider_override_followup_receipt_validation_escalated === true,
            repeatedFailuresBlockDispatch: escalatedAdvisory.health_status === "critical"
                && escalatedAdvisory.dispatch_policy === "hold_until_repair"
                && escalatedGate.dispatch_ready === false
                && escalatedGate.provider_dispatch_hold === true
                && escalatedDecision.action === "hold_until_repair",
            verifiedRepairClearsOnlyActiveStreak: attribution.attempt_count === 3
                && attribution.failed_count === 2
                && attribution.passed_count === 1
                && attribution.consecutive_failure_count === 0
                && attribution.repair_verified === true,
            repairedProviderReturnsToSampling: repairedPolicy.active === false
                && repairedPolicy.action === "monitor_repaired_provider_override_followup_receipt_validation"
                && repairedCandidate.provider_override_followup_receipt_validation_repair_verified === true
                && repairedAdvisory.health_status === "monitor"
                && repairedAdvisory.dispatch_policy === "allow_with_receipt_sampling"
                && repairedGate.dispatch_ready === true
                && repairedDecision.action === "dispatch_with_receipt_sampling",
            repairedPacketCarriesSamplingContract: repairedPacket.pressure_provenance_provider_dispatch_override_followup_receipt_contract?.active === true
                && repairedPacket.pressure_provenance_provider_dispatch_override_followup_receipt_contract?.rel_paths?.includes(relPath)
                && (0, runtime_kernel_1.renderWorkerContextPacket)(repairedPacket).includes("Corrected receipt validation history"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            archive: {
                attempt_count: archive.attempt_count || 0,
                failed_count: archive.failed_count || 0,
                passed_count: archive.passed_count || 0,
                consecutive_failure_count: attribution.consecutive_failure_count || 0,
                repair_verified: attribution.repair_verified === true,
            },
            escalated: {
                action: escalatedPolicy.action || "",
                health_status: escalatedAdvisory.health_status || "",
                dispatch_policy: escalatedAdvisory.dispatch_policy || "",
                dispatch_ready: escalatedGate.dispatch_ready,
            },
            repaired: {
                action: repairedPolicy.action || "",
                health_status: repairedAdvisory.health_status || "",
                dispatch_policy: repairedAdvisory.dispatch_policy || "",
                dispatch_ready: repairedGate.dispatch_ready,
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
function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest() {
    const sourceGroupA = `worker-context-provider-reliability-source-a-${process.pid}-${Date.now()}`;
    const sourceGroupB = `worker-context-provider-reliability-source-b-${process.pid}-${Date.now()}`;
    const targetGroup = `worker-context-provider-reliability-target-${process.pid}-${Date.now()}`;
    const sourceTypedDirA = (0, group_memory_index_1.getGroupTypedMemoryDir)(sourceGroupA);
    const sourceTypedDirB = (0, group_memory_index_1.getGroupTypedMemoryDir)(sourceGroupB);
    const targetTypedDir = (0, group_memory_index_1.getGroupTypedMemoryDir)(targetGroup);
    const agentType = "codex";
    const targetProject = "api";
    const nowAt = "2026-07-10T07:00:00.000Z";
    try {
        const { buildCrossGroupProviderDispatchReliabilitySignal, buildGlobalProviderDispatchReliabilitySignals, distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory, } = require("./group-memory-index");
        const validation = (groupId, project, id, status, at) => ({
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
            repair_work_item_id: `repair-${id}`,
            repair_work_item_status: status === "passed" ? "completed" : "pending",
            contract: {
                rel_paths: [`private-${project}-evidence.md`],
                followup_work_item_ids: [`private-${project}-followup`],
                override_ids: [`private-${project}-override`],
            },
            gaps: status === "failed" ? [{ code: "private_missing_override", reason: `private ${project} receipt evidence missing` }] : [],
            receipt: {
                status: "done",
                memoryProvenanceUsage: [{ reason: `private ${project} receipt detail`, currentSourceVerified: status === "passed" }],
            },
            at,
        });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupA, {
            rows: [
                { validation: validation(sourceGroupA, "private-alpha-project", "source-a-old-failed-1", "failed", "2026-01-10T07:00:00.000Z") },
                { validation: validation(sourceGroupA, "private-alpha-project", "source-a-old-failed-2", "failed", "2026-01-11T07:00:00.000Z") },
                { validation: validation(sourceGroupA, "private-alpha-project", "source-a-recent-passed", "passed", "2026-07-10T06:50:00.000Z") },
            ],
        }, { updatedAt: "2026-07-10T06:50:00.000Z" });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(sourceGroupB, {
            rows: [
                { validation: validation(sourceGroupB, "private-beta-project", "source-b-recent-failed-1", "failed", "2026-07-10T06:40:00.000Z") },
                { validation: validation(sourceGroupB, "private-beta-project", "source-b-recent-failed-2", "failed", "2026-07-10T06:45:00.000Z") },
            ],
        }, { updatedAt: "2026-07-10T06:45:00.000Z" });
        const oldRepairedSignal = buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
            agentType,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA],
            minSourceGroups: 1,
            halfLifeDays: 14,
            generatedAt: nowAt,
        });
        const recentFailureSignal = buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
            agentType,
            crossGroupProviderReliabilityGroupIds: [sourceGroupB],
            minSourceGroups: 1,
            halfLifeDays: 14,
            generatedAt: nowAt,
        });
        const crossSignal = buildCrossGroupProviderDispatchReliabilitySignal(targetGroup, {
            agentType,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            halfLifeDays: 14,
            generatedAt: nowAt,
        });
        const globalSignals = buildGlobalProviderDispatchReliabilitySignals({
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            halfLifeDays: 14,
            generatedAt: nowAt,
        });
        const crossPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(targetGroup, {
            targetProject,
            agentType,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
        });
        const disabledCrossPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(targetGroup, {
            targetProject,
            agentType,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            disablePressureProvenanceFeedbackDispatchPolicy: true,
            generatedAt: nowAt,
        });
        const disabledCrossAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(targetGroup, targetProject, agentType, disabledCrossPolicy);
        const crossAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(targetGroup, targetProject, agentType, crossPolicy) || {};
        const crossPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 155 privacy-redacted cross-group provider reliability guidance selftest.",
            pressureProvenanceDispatchFeedbackPolicy: crossPolicy,
            pressureProvenanceProviderDispatchAdvisory: crossAdvisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const crossAssignment = {
            scopeId: targetGroup,
            project: targetProject,
            agentType,
            assignmentId: "assignment-phase155-cross-provider-guidance",
            dispatchKey: "dispatch-phase155-cross-provider-guidance",
        };
        const crossGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)(crossAssignment, crossPacket);
        const crossDecision = (0, group_orchestrator_1.buildWorkerContextProviderDispatchDecisionForCoordinator)(crossAssignment, crossPacket, crossGate, { at: nowAt });
        distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(targetGroup, {
            rows: [
                { validation: validation(targetGroup, targetProject, "target-local-failed-1", "failed", "2026-07-10T06:55:00.000Z") },
                { validation: validation(targetGroup, targetProject, "target-local-failed-2", "failed", "2026-07-10T06:56:00.000Z") },
            ],
        }, { updatedAt: "2026-07-10T06:56:00.000Z" });
        const localPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(targetGroup, {
            targetProject,
            agentType,
            crossGroupProviderReliabilityGroupIds: [sourceGroupA, sourceGroupB],
            minSourceGroups: 2,
            providerReliabilityHalfLifeDays: 14,
            generatedAt: nowAt,
        });
        const localAdvisory = (0, group_orchestrator_1.buildPressureProvenanceProviderDispatchAdvisoryForCoordinator)(targetGroup, targetProject, agentType, localPolicy) || {};
        const localPacket = (0, runtime_kernel_1.buildWorkerContextPacket)({
            group: { id: targetGroup, members: [{ project: targetProject }] },
            project: targetProject,
            agentType,
            task: "Phase 155 local provider failure must remain authoritative.",
            pressureProvenanceDispatchFeedbackPolicy: localPolicy,
            pressureProvenanceProviderDispatchAdvisory: localAdvisory,
            contextUsageOptions: { maxTokens: 5000, autoCompactBufferTokens: 120 },
        });
        const localGate = (0, group_orchestrator_1.buildWorkerContextPreDispatchGateForCoordinator)({
            ...crossAssignment,
            assignmentId: "assignment-phase155-local-provider-hold",
            dispatchKey: "dispatch-phase155-local-provider-hold",
        }, localPacket);
        const serializedSignals = JSON.stringify({ crossSignal, globalSignals });
        const checks = {
            recentEvidenceOutweighsOldRepairedHistory: Number(recentFailureSignal.risk_score || 0) > Number(oldRepairedSignal.risk_score || 0)
                && Number(recentFailureSignal.weighted_failure_score || 0) > Number(oldRepairedSignal.weighted_failure_score || 0)
                && oldRepairedSignal.risk_status === "low",
            crossGroupSignalIsActionableAndDecayed: crossSignal.actionable === true
                && Number(crossSignal.source_group_count || 0) === 2
                && Number(crossSignal.half_life_days || 0) === 14
                && ["high", "medium"].includes(crossSignal.risk_status),
            privacyBoundaryRemovesGroupContent: crossSignal.guidance_only === true
                && crossSignal.local_policy_override_allowed === false
                && crossSignal.contains_private_memory === false
                && globalSignals.contains_private_memory === false
                && !serializedSignals.includes(sourceGroupA)
                && !serializedSignals.includes(sourceGroupB)
                && !serializedSignals.includes("private-alpha-project")
                && !serializedSignals.includes("private-beta-project")
                && !serializedSignals.includes("private-alpha-project-evidence.md")
                && !serializedSignals.includes("source-b-recent-failed-2"),
            crossGroupGuidanceOnlyAddsSampling: crossPolicy.active === false
                && crossPolicy.action === "monitor_cross_group_provider_reliability_guidance"
                && crossAdvisory.health_status === "monitor"
                && crossAdvisory.dispatch_policy === "allow_with_receipt_sampling"
                && crossAdvisory.should_hold_dispatch === false
                && crossGate.dispatch_ready === true
                && crossGate.provider_dispatch_hold !== true
                && crossDecision.action === "dispatch_with_receipt_sampling"
                && crossPacket.acceptance?.cross_group_provider_reliability_sampling_required === true,
            explicitPolicyDisableSuppressesCrossGuidance: disabledCrossPolicy.disabled === true
                && disabledCrossPolicy.crossGroupProviderReliabilityEnabled === false
                && disabledCrossPolicy.crossGroupProviderReliabilityActionable === false
                && disabledCrossAdvisory === null,
            workerPacketCarriesOnlySanitizedGuidance: crossGate.cross_group_provider_reliability_guidance?.guidance_only === true
                && crossGate.cross_group_provider_reliability_guidance?.local_policy_override_allowed === false
                && !(0, runtime_kernel_1.renderWorkerContextPacket)(crossPacket).includes("private-alpha-project")
                && (0, runtime_kernel_1.renderWorkerContextPacket)(crossPacket).includes("Cross-group provider reliability guidance"),
            localPolicyRemainsAuthoritative: localPolicy.active === true
                && localPolicy.action === "hold_provider_after_repeated_override_followup_receipt_validation_failures"
                && localAdvisory.health_status === "critical"
                && localAdvisory.dispatch_policy === "hold_until_repair"
                && localGate.dispatch_ready === false
                && localGate.provider_dispatch_hold === true,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            oldRepaired: {
                risk_status: oldRepairedSignal.risk_status,
                risk_score: oldRepairedSignal.risk_score,
                weighted_failure_score: oldRepairedSignal.weighted_failure_score,
            },
            recentFailure: {
                risk_status: recentFailureSignal.risk_status,
                risk_score: recentFailureSignal.risk_score,
                weighted_failure_score: recentFailureSignal.weighted_failure_score,
            },
            cross: {
                risk_status: crossSignal.risk_status,
                source_group_count: crossSignal.source_group_count,
                action: crossPolicy.action,
                dispatch_policy: crossAdvisory.dispatch_policy,
                dispatch_ready: crossGate.dispatch_ready,
            },
            local: {
                action: localPolicy.action,
                dispatch_policy: localAdvisory.dispatch_policy,
                dispatch_ready: localGate.dispatch_ready,
            },
        };
    }
    finally {
        for (const dir of [sourceTypedDirA, sourceTypedDirB, targetTypedDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
//# sourceMappingURL=group-orchestrator-memory-self-tests-part-02.js.map