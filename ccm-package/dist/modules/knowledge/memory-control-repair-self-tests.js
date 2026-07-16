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
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineCompletionSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineCompletionSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofWorkItemSelfTest = runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofWorkItemSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest = runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest = runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionSelfTest = runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionSelfTest;
exports.runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemorySelfTest = runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemorySelfTest;
exports.runMemoryCenterCompactionHookLedgerSelfTest = runMemoryCenterCompactionHookLedgerSelfTest;
exports.runMemoryCenterCompactBoundaryReplayGateSelfTest = runMemoryCenterCompactBoundaryReplayGateSelfTest;
exports.runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest = runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest;
exports.runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest = runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest;
exports.runMemoryCenterReplayRepairPendingWorkItemsSelfTest = runMemoryCenterReplayRepairPendingWorkItemsSelfTest;
exports.runMemoryCenterReplayRepairWorkItemClaimSelfTest = runMemoryCenterReplayRepairWorkItemClaimSelfTest;
exports.runMemoryCenterReplayRepairDispatchCandidateSelfTest = runMemoryCenterReplayRepairDispatchCandidateSelfTest;
exports.runMemoryCenterGroupSessionMemorySnapshotSelfTest = runMemoryCenterGroupSessionMemorySnapshotSelfTest;
exports.runMemoryCenterGroupToolContinuitySnapshotSelfTest = runMemoryCenterGroupToolContinuitySnapshotSelfTest;
exports.runMemoryCenterTaskAgentMemoryContextSnapshotSelfTest = runMemoryCenterTaskAgentMemoryContextSnapshotSelfTest;
exports.runMemoryCenterCompactFileReferenceSelfTest = runMemoryCenterCompactFileReferenceSelfTest;
exports.runMemoryCenterCompactFileReferenceReadPlanSelfTest = runMemoryCenterCompactFileReferenceReadPlanSelfTest;
exports.runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest = runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest;
exports.runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest = runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest;
exports.runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest = runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest;
exports.runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest = runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest;
exports.runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairDispatchSelfTest = runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairDispatchSelfTest;
exports.runMemoryCenterPostCompactReinjectionRepairDispatchSelfTest = runMemoryCenterPostCompactReinjectionRepairDispatchSelfTest;
exports.runMemoryCenterPostCompactReinjectionRepairReceiptConsumptionSelfTest = runMemoryCenterPostCompactReinjectionRepairReceiptConsumptionSelfTest;
exports.runMemoryCenterPostCompactReinjectionRepairReceiptTypedMemorySelfTest = runMemoryCenterPostCompactReinjectionRepairReceiptTypedMemorySelfTest;
exports.runMemoryCenterPostCompactReinjectionRepairReceiptWorkerContextUsageSelfTest = runMemoryCenterPostCompactReinjectionRepairReceiptWorkerContextUsageSelfTest;
exports.runMemoryCenterPostCompactReinjectionRepairReceiptMemoryUsageRepairSelfTest = runMemoryCenterPostCompactReinjectionRepairReceiptMemoryUsageRepairSelfTest;
exports.runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionTypedMemorySelfTest = runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionTypedMemorySelfTest;
exports.runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionWorkerContextSelfTest = runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionWorkerContextSelfTest;
exports.runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationSelfTest = runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationSelfTest;
exports.runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationRepairSelfTest = runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationRepairSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const memory_control_center_1 = require("./memory-control-center");
function runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineCompletionSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-timeline-completion-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    try {
        const { recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchTimelineBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const proof = {
            schema: "ccm-api-microcompact-native-apply-proof-group-v1",
            groupId,
            status: "fail",
            score: 42,
            checked: 1,
            passed: 0,
            requestTelemetryStrongCount: 0,
            requestTelemetrySessionMismatchCount: 1,
            requestTelemetryDispatchUnboundCount: 1,
            gaps: [{
                    severity: "high",
                    reason: "native_applied request telemetry session/snapshot and execution/runner binding missing",
                    taskId: "task-timeline-completion",
                    agent: "api",
                    planChecksum: "plan-timeline-completion",
                    requestPatchChecksum: "request-timeline-completion",
                }],
            rows: [{
                    entryId: "api_microcompact_native_apply_proof_timeline_completion",
                    taskId: "task-timeline-completion",
                    targetProject: "api",
                    agent: "api",
                    planChecksum: "plan-timeline-completion",
                    applyPlanChecksum: "apply-timeline-completion",
                    requestPatchChecksum: "request-timeline-completion",
                    taskAgentSessionId: "tas-timeline-completion",
                    nativeSessionId: "native-timeline-completion",
                    memoryContextSnapshotId: "snapshot-timeline-completion",
                    memoryContextSnapshotChecksum: "snapshot-checksum-timeline-completion",
                    executionId: "execution-timeline-completion",
                    requestTelemetryStatus: "weak",
                    requestTelemetrySource: "native_request_adapter",
                    requestTelemetrySessionStatus: "missing_session",
                    requestTelemetryDispatchStatus: "missing_execution",
                    requestTelemetryRunnerRequestId: "runner-timeline-completion",
                    runnerRequestId: "runner-timeline-completion",
                    requestTelemetryWeakReason: "selftest weak native proof before timeline closure",
                }],
        };
        const first = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(groupId, proof, { at: "2026-07-08T09:20:00.000Z" });
        const firstLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const repairItem = (firstLedger.items || []).find((item) => item.source === "api_microcompact_native_apply_binding_repair") || {};
        const brief = {
            brief_id: "replay-repair-dispatch-brief:timeline-completion",
            work_item_id: repairItem.work_item_id || repairItem.id || "",
            source: "api_microcompact_native_apply_binding_repair",
            target_project: "api",
            proof_entry_id: repairItem.proof_entry_id || "api_microcompact_native_apply_proof_timeline_completion",
            request_patch_checksum: repairItem.request_patch_checksum || "request-timeline-completion",
            request_telemetry_session_status: repairItem.request_telemetry_session_status || "missing_session",
            request_telemetry_dispatch_status: repairItem.request_telemetry_dispatch_status || "missing_execution",
            runner_request_id: repairItem.runner_request_id || "runner-timeline-completion",
            execution_id: repairItem.execution_id || "execution-timeline-completion",
            should_create_real_task: false,
        };
        let lastBinding = null;
        for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
            lastBinding = recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                brief,
                task_id: "task-timeline-completion",
                project: "api",
                assignment_id: "assignment-timeline-completion",
                dispatch_key: "dispatch-key-timeline-completion",
                worker_context_packet_id: "wcp-timeline-completion",
                worker_handoff_id: "handoff-timeline-completion",
                memory_context_snapshot_id: "snapshot-timeline-completion",
                memory_context_snapshot_checksum: "snapshot-checksum-timeline-completion",
                task_agent_session_id: "tas-timeline-completion",
                native_session_id: "native-timeline-completion",
                execution_id: "execution-timeline-completion",
                receipt_status: "done",
                timeline_event: {
                    id: `tl-completion-${eventType}`,
                    type: eventType,
                    at: "2026-07-08T09:21:00.000Z",
                },
            }, { at: "2026-07-08T09:21:00.000Z" });
        }
        const timelineLedger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const binding = (timelineLedger.entries || []).find((entry) => entry.brief_id === brief.brief_id) || {};
        const completedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedItem = (completedLedger.items || []).find((item) => (item.work_item_id || item.id) === brief.work_item_id) || {};
        const completionReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairTimelineCompletionReport)({ groupIds: [groupId], generatedAt: "2026-07-08T09:22:00.000Z" });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairTimelineCompletions)({ groupIds: [groupId], generatedAt: "2026-07-08T09:22:00.000Z" });
        const checks = {
            weakProofCreatesOpenRepairItem: first.openItemCount >= 1
                && repairItem.source === "api_microcompact_native_apply_binding_repair"
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(repairItem.status),
            timelineBindingCarriesRequiredEvents: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS.every(type => (binding.event_types || []).includes(type)),
            liveTimelineBindingClosesRepairItem: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedItem.status) === "completed"
                && completedItem.completion_source === "replay_repair_timeline_binding"
                && completedItem.replay_repair_timeline_binding?.timeline_binding_id === binding.timeline_binding_id
                && lastBinding?.repair_work_item_completion?.closed >= 1,
            completionReportCoversClosure: completionReport.overall?.status === "ok"
                && Number(completionReport.overall?.completeBindingCount || 0) === 1
                && Number(completionReport.overall?.completedBindingCount || 0) === 1
                && Number(completionReport.overall?.openMatchedRepairItemCount || 0) === 0
                && quality.id === "api_microcompact_native_apply_proof_repair_timeline_completions"
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            first: { openItemCount: first.openItemCount, total: first.total },
            binding: {
                timeline_binding_id: binding.timeline_binding_id || "",
                brief_id: binding.brief_id || "",
                work_item_id: binding.work_item_id || "",
                event_types: binding.event_types || [],
            },
            completedItem: {
                id: completedItem.id || completedItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedItem.status),
                completion_source: completedItem.completion_source || "",
                resolutionReason: completedItem.resolutionReason || "",
            },
            report: completionReport.overall,
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
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofSelfTest() {
    const baseId = `memory-center-api-microcompact-native-proof-repair-closure-reproof-selftest-${process.pid}-${Date.now()}`;
    const weakGroupId = `${baseId}-weak`;
    const strongGroupId = `${baseId}-strong`;
    const groupIds = [weakGroupId, strongGroupId];
    const taskIds = [];
    const executionFiles = [];
    const files = groupIds.flatMap(groupId => {
        const proofFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId);
        const telemetryFile = (0, memory_control_center_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId);
        const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
        const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
        return [
            proofFile,
            `${proofFile}.bak`,
            telemetryFile,
            `${telemetryFile}.bak`,
            workItemsFile,
            `${workItemsFile}.bak`,
            timelineBindingFile,
            `${timelineBindingFile}.bak`,
        ];
    });
    try {
        const { recordGroupApiMicrocompactNativeApplyProofLedger, recordGroupApiMicrocompactNativeApplyAdapterTelemetry, } = require("../collaboration/memory");
        const { recordReplayRepairDispatchBriefTimelineBinding } = require("../collaboration/group-orchestrator");
        const { openTaskAgentSession, recordTaskAgentSessionTurn, bindTaskAgentMemoryContextSnapshot, } = require("../../tasks/agent-sessions");
        const { ensureExecution, registerExternalRunnerRequest } = require("../../agents/execution-kernel");
        const createBoundIds = (groupId, suffix) => {
            const idSeed = (0, memory_control_center_1.hash)([groupId, suffix], 10);
            const taskId = `task-closure-reproof-${suffix}-${idSeed}`;
            const executionId = `execution-closure-reproof-${suffix}-${idSeed}`;
            const runnerRequestId = `runner-closure-reproof-${suffix}-${idSeed}`;
            const nativeSessionId = `native-closure-reproof-${suffix}-${idSeed}`;
            const session = openTaskAgentSession({
                scopeId: taskId,
                taskId,
                groupId,
                project: "api",
                agentType: "claudecode",
            });
            taskIds.push(taskId);
            recordTaskAgentSessionTurn(session.id, { nativeSessionId, success: true });
            const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
                taskId,
                groupId,
                project: "api",
                agentType: "claudecode",
                nativeSessionId,
                executionId,
                turn: 1,
                workerContextPacket: {
                    packet_id: `wcp-${suffix}`,
                    memory: { schema: "ccm-group-memory-context-v1", target_project: "api" },
                },
                renderedPrompt: `closure reproof prompt ${suffix}`,
            });
            ensureExecution({
                task: { id: taskId, title: `closure reproof ${suffix}`, target_project: "api" },
                project: "api",
                agent: "api",
                workDir: process.cwd(),
                executionId,
            });
            executionFiles.push((0, memory_control_center_1.getExecutionKernelRecordFileForCenter)(executionId));
            registerExternalRunnerRequest(executionId, runnerRequestId);
            return {
                groupId,
                suffix,
                taskId,
                executionId,
                runnerRequestId,
                nativeSessionId,
                taskAgentSessionId: session.id,
                memoryContextSnapshotId: bound?.snapshot?.snapshot_id || bound?.session?.memoryContextSnapshotId || "",
                memoryContextSnapshotChecksum: bound?.snapshot?.checksum || bound?.session?.memoryContextSnapshotChecksum || "",
                planChecksum: `plan-closure-reproof-${suffix}`,
                applyPlanChecksum: `apply-closure-reproof-${suffix}`,
                requestPatchChecksum: `request-closure-reproof-${suffix}`,
            };
        };
        const recordProof = (ids) => recordGroupApiMicrocompactNativeApplyProofLedger(ids.groupId, {
            targetProject: "api",
            taskId: ids.taskId,
            executionId: ids.executionId,
            runnerRequestId: ids.runnerRequestId,
            externalRunnerRequestId: ids.runnerRequestId,
            finalStatus: "done",
            receiptRows: [{
                    agent: "api",
                    status: "done",
                    runner_request_id: ids.runnerRequestId,
                    external_runner_request_id: ids.runnerRequestId,
                    api_microcompact: {
                        required: true,
                        pass: true,
                        rows: [{
                                plan_checksum: ids.planChecksum,
                                usage_state: "native_applied",
                                native_applied: true,
                                native_apply_ready: true,
                                apply_plan_checksum: ids.applyPlanChecksum,
                                request_patch_checksum: ids.requestPatchChecksum,
                                receipt_apply_plan_checksum: ids.applyPlanChecksum,
                                receipt_request_patch_checksum: ids.requestPatchChecksum,
                                apply_plan_checksum_matched: true,
                                request_patch_checksum_matched: true,
                                session_binding_required: true,
                                session_matched: true,
                                expected_task_agent_session_id: ids.taskAgentSessionId,
                                receipt_task_agent_session_id: ids.taskAgentSessionId,
                                expected_native_session_id: ids.nativeSessionId,
                                receipt_native_session_id: ids.nativeSessionId,
                                expected_memory_context_snapshot_id: ids.memoryContextSnapshotId,
                                receipt_memory_context_snapshot_id: ids.memoryContextSnapshotId,
                                expected_memory_context_snapshot_checksum: ids.memoryContextSnapshotChecksum,
                                receipt_memory_context_snapshot_checksum: ids.memoryContextSnapshotChecksum,
                                runner_request_id: ids.runnerRequestId,
                                external_runner_request_id: ids.runnerRequestId,
                                unsafe_native_applied: false,
                                pass: true,
                                reason: "closure reproof selftest verified receipt before native adapter re-proof",
                            }],
                    },
                }],
            generatedAt: "2026-07-08T10:00:00.000Z",
        });
        const closeRepairByTimeline = (ids) => {
            const proofReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofReport)({
                groupIds: [ids.groupId],
                nowMs: Date.parse("2026-07-08T10:05:00.000Z"),
            });
            const proof = (proofReport.groups || []).find((row) => row.groupId === ids.groupId) || {};
            (0, memory_control_center_1.syncApiMicrocompactNativeApplyProofRepairWorkItems)(ids.groupId, proof, { at: "2026-07-08T10:06:00.000Z" });
            const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(ids.groupId);
            const repairItem = (ledger.items || []).find((item) => item.source === "api_microcompact_native_apply_binding_repair") || {};
            const brief = {
                brief_id: `replay-repair-dispatch-brief:closure-reproof:${ids.suffix}`,
                work_item_id: repairItem.work_item_id || repairItem.id || "",
                source: "api_microcompact_native_apply_binding_repair",
                target_project: "api",
                proof_entry_id: repairItem.proof_entry_id || "",
                request_patch_checksum: repairItem.request_patch_checksum || ids.requestPatchChecksum,
                request_telemetry_session_status: repairItem.request_telemetry_session_status || "bound",
                request_telemetry_dispatch_status: repairItem.request_telemetry_dispatch_status || "runner_bound",
                runner_request_id: repairItem.runner_request_id || ids.runnerRequestId,
                execution_id: repairItem.execution_id || ids.executionId,
                should_create_real_task: false,
            };
            let lastBinding = null;
            for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
                lastBinding = recordReplayRepairDispatchBriefTimelineBinding(ids.groupId, {
                    brief,
                    task_id: ids.taskId,
                    project: "api",
                    assignment_id: `assignment-closure-reproof-${ids.suffix}`,
                    dispatch_key: `dispatch-key-closure-reproof-${ids.suffix}`,
                    worker_context_packet_id: `wcp-closure-reproof-${ids.suffix}`,
                    worker_handoff_id: `handoff-closure-reproof-${ids.suffix}`,
                    memory_context_snapshot_id: ids.memoryContextSnapshotId,
                    memory_context_snapshot_checksum: ids.memoryContextSnapshotChecksum,
                    task_agent_session_id: ids.taskAgentSessionId,
                    native_session_id: ids.nativeSessionId,
                    execution_id: ids.executionId,
                    receipt_status: "done",
                    timeline_event: {
                        id: `tl-closure-reproof-${ids.suffix}-${eventType}`,
                        type: eventType,
                        at: "2026-07-08T10:07:00.000Z",
                    },
                }, { at: "2026-07-08T10:07:00.000Z" });
            }
            return { repairItem, lastBinding };
        };
        const recordStrongTelemetry = (ids) => recordGroupApiMicrocompactNativeApplyAdapterTelemetry({
            groupId: ids.groupId,
            targetProject: "api",
            taskId: ids.taskId,
            executionId: ids.executionId,
            runnerRequestId: ids.runnerRequestId,
            externalRunnerRequestId: ids.runnerRequestId,
            apiMicrocompactNativeApplyPlan: {
                groupId: ids.groupId,
                group_id: ids.groupId,
                targetProject: "api",
                target_project: "api",
                apiEditPlanChecksum: ids.planChecksum,
                api_edit_plan_checksum: ids.planChecksum,
                applyPlanChecksum: ids.applyPlanChecksum,
                apply_plan_checksum: ids.applyPlanChecksum,
                requestPatchChecksum: ids.requestPatchChecksum,
                request_patch_checksum: ids.requestPatchChecksum,
                taskAgentSessionId: ids.taskAgentSessionId,
                task_agent_session_id: ids.taskAgentSessionId,
                nativeSessionId: ids.nativeSessionId,
                native_session_id: ids.nativeSessionId,
                memoryContextSnapshotId: ids.memoryContextSnapshotId,
                memory_context_snapshot_id: ids.memoryContextSnapshotId,
                memoryContextSnapshotChecksum: ids.memoryContextSnapshotChecksum,
                memory_context_snapshot_checksum: ids.memoryContextSnapshotChecksum,
                requestPatch: {
                    body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: `tool-${ids.suffix}` } }] } },
                    beta_headers: ["context-management-2025-06-27"],
                },
            },
            requestPatch: {
                body: { context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: `tool-${ids.suffix}` } }] } },
                beta_headers: ["context-management-2025-06-27"],
            },
            requestBody: {
                model: "claude-selftest",
                messages: [{ role: "user", content: "closure reproof native adapter telemetry selftest" }],
                context_management: { edits: [{ type: "clear_tool_uses_20250919", keep: { type: "tool_use_id", value: `tool-${ids.suffix}` } }] },
            },
            headers: { "anthropic-beta": "context-management-2025-06-27" },
            provider: "anthropic",
            model: "claude-selftest",
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            responseStatus: 200,
            requestId: `req-closure-reproof-${ids.suffix}`,
            sentAt: "2026-07-08T10:08:00.000Z",
        });
        const weakIds = createBoundIds(weakGroupId, "weak");
        const strongIds = createBoundIds(strongGroupId, "strong");
        recordProof(weakIds);
        recordProof(strongIds);
        const weakClosure = closeRepairByTimeline(weakIds);
        const strongClosure = closeRepairByTimeline(strongIds);
        recordStrongTelemetry(strongIds);
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairClosureReproofReport)({
            groupIds,
            generatedAt: "2026-07-08T10:10:00.000Z",
            nowMs: Date.parse("2026-07-08T10:10:00.000Z"),
        });
        const quality = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairClosureReproof)({
            groupIds,
            generatedAt: "2026-07-08T10:10:00.000Z",
            nowMs: Date.parse("2026-07-08T10:10:00.000Z"),
        });
        const weak = (report.groups || []).find((row) => row.groupId === weakGroupId) || {};
        const strong = (report.groups || []).find((row) => row.groupId === strongGroupId) || {};
        const weakCandidate = weak.reproofCandidates?.[0] || {};
        const checks = {
            weakTimelineClosureDoesNotBecomeProviderStrong: Number(weak.timelineProvedRepairCount || 0) === 1
                && Number(weak.providerStrongProofCount || 0) === 0
                && Number(weak.providerStrongReproofNeededCount || 0) === 1
                && weakCandidate.repair_closure_status === "timeline_proved"
                && weakCandidate.provider_reproof_status === "needed"
                && weakCandidate.nativeApplyStrongProof !== true,
            weakCandidateCarriesPreciseReproofKeys: weakCandidate.task_id === weakIds.taskId
                && weakCandidate.request_patch_checksum === weakIds.requestPatchChecksum
                && weakCandidate.runner_request_id === weakIds.runnerRequestId
                && weakCandidate.execution_id === weakIds.executionId
                && weakCandidate.task_agent_session_id === weakIds.taskAgentSessionId
                && weakCandidate.memory_context_snapshot_id === weakIds.memoryContextSnapshotId,
            strongNativeTelemetrySatisfiesReproof: Number(strong.timelineProvedRepairCount || 0) === 1
                && Number(strong.providerStrongProofCount || 0) === 1
                && Number(strong.providerStrongReproofNeededCount || 0) === 0
                && Number(strong.reproofCandidates?.length || 0) === 0,
            qualitySeparatesTimelineAndProviderProof: quality.id === "api_microcompact_native_apply_proof_repair_closure_reproof"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 1
                && Number(quality.failed || 0) === 1
                && quality.status === "fail",
            liveTimelineClosuresHappened: weakClosure.lastBinding?.repair_work_item_completion?.closed >= 1
                && strongClosure.lastBinding?.repair_work_item_completion?.closed >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            weak: {
                timelineProvedRepairCount: weak.timelineProvedRepairCount,
                providerStrongProofCount: weak.providerStrongProofCount,
                providerStrongReproofNeededCount: weak.providerStrongReproofNeededCount,
                candidate: weakCandidate,
            },
            strong: {
                timelineProvedRepairCount: strong.timelineProvedRepairCount,
                providerStrongProofCount: strong.providerStrongProofCount,
                providerStrongReproofNeededCount: strong.providerStrongReproofNeededCount,
            },
            report: report.overall,
            quality: {
                checked: quality.checked,
                passed: quality.passed,
                failed: quality.failed,
                status: quality.status,
            },
        };
    }
    finally {
        for (const taskId of taskIds) {
            try {
                const { purgeTaskAgentSessions } = require("../../tasks/agent-sessions");
                purgeTaskAgentSessions(taskId);
            }
            catch { }
        }
        for (const file of [...files, ...executionFiles]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofWorkItemSelfTest() {
    const groupId = `memory-center-api-microcompact-native-proof-repair-closure-reproof-work-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const timelineBindingId = "timeline-binding-provider-reproof-work";
    const originalWorkItemId = "api-native-proof-repair:provider-reproof-work";
    try {
        const at = "2026-07-08T10:30:00.000Z";
        const originalRepairItem = {
            id: originalWorkItemId,
            work_item_id: originalWorkItemId,
            taskId: "task-provider-reproof-work",
            group_id: groupId,
            source: "api_microcompact_native_apply_binding_repair",
            status: "completed",
            priority: "critical",
            component: "api_microcompact_native_dispatch_binding",
            completion_source: "replay_repair_timeline_binding",
            resolutionReason: "timeline_binding_child_receipt_proved_native_repair",
            target_project: "api",
            proof_entry_id: "proof-provider-reproof-work",
            plan_checksum: "plan-provider-reproof-work",
            apply_plan_checksum: "apply-provider-reproof-work",
            request_patch_checksum: "request-provider-reproof-work",
            runner_request_id: "runner-provider-reproof-work",
            request_telemetry_runner_request_id: "runner-provider-reproof-work",
            execution_id: "execution-provider-reproof-work",
            task_agent_session_id: "tas-provider-reproof-work",
            native_session_id: "native-provider-reproof-work",
            memory_context_snapshot_id: "snapshot-provider-reproof-work",
            memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-work",
            request_telemetry_status: "missing",
            request_telemetry_source: "",
            request_telemetry_session_status: "bound",
            request_telemetry_dispatch_status: "runner_bound",
            replay_repair_timeline_binding: {
                timeline_binding_id: timelineBindingId,
                brief_id: "brief-provider-reproof-work",
                task_id: "task-provider-reproof-work",
                assignment_id: "assignment-provider-reproof-work",
                worker_context_packet_id: "wcp-provider-reproof-work",
                task_agent_session_id: "tas-provider-reproof-work",
                native_session_id: "native-provider-reproof-work",
                memory_context_snapshot_id: "snapshot-provider-reproof-work",
                memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-work",
                execution_id: "execution-provider-reproof-work",
                runner_request_id: "runner-provider-reproof-work",
                receipt_status: "done",
                event_types: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS,
                completed_at: at,
            },
            createdAt: at,
            updatedAt: at,
            completedAt: at,
        };
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            items: [originalRepairItem],
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)([originalRepairItem]),
            updatedAt: at,
        });
        const closureReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairClosureReproofReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-08T10:31:00.000Z",
            nowMs: Date.parse("2026-07-08T10:31:00.000Z"),
        });
        const closureGroup = (closureReport.groups || []).find((row) => row.groupId === groupId) || {};
        const firstWorkItemReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairClosureReproofWorkItemReport)({
            closureReproofReport: closureReport,
            generatedAt: "2026-07-08T10:32:00.000Z",
        });
        const firstGroup = (firstWorkItemReport.groups || []).find((row) => row.groupId === groupId) || {};
        const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const providerItem = (ledger.items || []).find(memory_control_center_1.isApiMicrocompactNativeApplyProviderReproofWorkItem) || {};
        const candidates = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { ledger, limit: 20 });
        const providerCandidate = (candidates.candidates || []).find((candidate) => candidate.source === "api_microcompact_native_apply_provider_reproof") || {};
        const resolvedSummary = (0, memory_control_center_1.syncApiMicrocompactNativeApplyProviderReproofWorkItems)(groupId, {
            schema: "ccm-api-microcompact-native-apply-proof-repair-closure-reproof-group-v1",
            groupId,
            status: "ok",
            timelineProvedRepairCount: 1,
            providerStrongProofCount: 1,
            providerStrongReproofNeededCount: 0,
            reproofCandidates: [],
        }, { at: "2026-07-08T10:33:00.000Z" });
        const resolvedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const resolvedProviderItem = (resolvedLedger.items || []).find(memory_control_center_1.isApiMicrocompactNativeApplyProviderReproofWorkItem) || {};
        const checks = {
            closureReproofProducesCandidate: Number(closureGroup.providerStrongReproofNeededCount || 0) === 1
                && closureGroup.reproofCandidates?.[0]?.provider_reproof_status === "needed"
                && closureGroup.reproofCandidates?.[0]?.request_patch_checksum === "request-provider-reproof-work",
            candidateMaterializesProviderReproofWorkItem: firstWorkItemReport.overall?.status === "ok"
                && Number(firstWorkItemReport.overall?.expectedWorkItemCount || 0) === 1
                && Number(firstWorkItemReport.overall?.coveredWorkItemCount || 0) === 1
                && providerItem.source === "api_microcompact_native_apply_provider_reproof"
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(providerItem.status),
            workItemCarriesPreciseReproofKeys: providerItem.original_work_item_id === originalWorkItemId
                && providerItem.timeline_binding_id === timelineBindingId
                && providerItem.request_patch_checksum === "request-provider-reproof-work"
                && providerItem.runner_request_id === "runner-provider-reproof-work"
                && providerItem.execution_id === "execution-provider-reproof-work"
                && providerItem.task_agent_session_id === "tas-provider-reproof-work"
                && providerItem.memory_context_snapshot_id === "snapshot-provider-reproof-work",
            genericDispatchCandidateSurfacesProviderReproof: providerCandidate.source === "api_microcompact_native_apply_provider_reproof"
                && providerCandidate.provider_reproof_status === "needed"
                && providerCandidate.provider_reproof_reason === "missing_native_apply_proof_entry"
                && providerCandidate.request_patch_checksum === "request-provider-reproof-work"
                && providerCandidate.runner_request_id === "runner-provider-reproof-work",
            strongClosureClosesProviderReproofWorkItem: (0, memory_control_center_1.replayRepairWorkItemStatus)(resolvedProviderItem.status) === "completed"
                && resolvedProviderItem.provider_reproof_status === "strong"
                && resolvedProviderItem.resolutionReason === "native_provider_reproof_strong"
                && Number(resolvedSummary.completedCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            closure: closureReport.overall,
            workItemReport: firstWorkItemReport.overall,
            providerItem: {
                id: providerItem.id || providerItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(providerItem.status),
                source: providerItem.source || "",
                provider_reproof_status: providerItem.provider_reproof_status || "",
                provider_reproof_reason: providerItem.provider_reproof_reason || "",
                request_patch_checksum: providerItem.request_patch_checksum || "",
                runner_request_id: providerItem.runner_request_id || "",
            },
            providerCandidate: {
                candidate_id: providerCandidate.candidate_id || "",
                source: providerCandidate.source || "",
                provider_reproof_status: providerCandidate.provider_reproof_status || "",
                request_patch_checksum: providerCandidate.request_patch_checksum || "",
            },
            resolvedProviderItem: {
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(resolvedProviderItem.status),
                provider_reproof_status: resolvedProviderItem.provider_reproof_status || "",
                resolutionReason: resolvedProviderItem.resolutionReason || "",
            },
        };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest() {
    const groupId = `memory-center-api-microcompact-native-provider-reproof-dispatch-timeline-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const assignmentBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    try {
        const { syncReplayRepairDispatchPlansForCoordinator, runCodedGroupOrchestrator, recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchTimelineBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const providerWorkItem = {
            id: "api-native-provider-reproof:dispatch-timeline",
            work_item_id: "api-native-provider-reproof:dispatch-timeline",
            taskId: "task-provider-reproof-dispatch",
            group_id: groupId,
            source: "api_microcompact_native_apply_provider_reproof",
            status: "pending",
            priority: "critical",
            component: "api_microcompact_native_provider_reproof",
            owner: "group-main-agent",
            target_project: "api",
            dispatch_target: "api",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            reproof_candidate_id: "api-native-proof-closure-reproof:dispatch-timeline",
            timeline_binding_id: "timeline-original-provider-reproof",
            original_work_item_id: "api-native-proof-repair:original-dispatch-timeline",
            proof_entry_id: "proof-provider-reproof-dispatch-timeline",
            plan_checksum: "plan-provider-reproof-dispatch-timeline",
            apply_plan_checksum: "apply-provider-reproof-dispatch-timeline",
            request_patch_checksum: "request-provider-reproof-dispatch-timeline",
            runner_request_id: "runner-provider-reproof-dispatch-timeline",
            execution_id: "execution-provider-reproof-dispatch-timeline",
            task_agent_session_id: "tas-provider-reproof-dispatch-timeline",
            native_session_id: "native-provider-reproof-dispatch-timeline",
            memory_context_snapshot_id: "snapshot-provider-reproof-dispatch-timeline",
            memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-dispatch-timeline",
            request_telemetry_status: "missing",
            request_telemetry_source: "",
            request_telemetry_session_status: "bound",
            request_telemetry_dispatch_status: "runner_bound",
            instruction: "补齐 provider native_request_adapter telemetry re-proof，不能把 timeline closure 当成 provider strong proof。",
            expected: "providerReproofStatus=strong; nativeApplyStrongProof=true; requestTelemetrySessionBound=true; requestTelemetryDispatchBound=true",
            prompt_patch: "只重跑 request-provider-reproof-dispatch-timeline 的 provider telemetry re-proof。",
            createdAt: "2026-07-08T10:40:00.000Z",
            updatedAt: "2026-07-08T10:40:00.000Z",
        };
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            items: [providerWorkItem],
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)([providerWorkItem]),
            updatedAt: "2026-07-08T10:40:00.000Z",
        });
        const candidateSummary = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { limit: 8 });
        const providerCandidate = (candidateSummary.candidates || []).find((candidate) => candidate.source === "api_microcompact_native_apply_provider_reproof") || {};
        const planLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, candidateSummary, { at: "2026-07-08T10:41:00.000Z" });
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_provider_reproof") || {};
        const briefReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairDispatchBriefReport)({
            candidateReport: {
                schema: "ccm-api-microcompact-native-apply-proof-repair-dispatch-candidate-report-v1",
                groups: [{
                        groupId,
                        file: candidateSummary.file,
                        nativeOpenItemCount: 1,
                        readyCount: 1,
                        dispatchMarkedCount: 1,
                        candidates: [providerCandidate],
                    }],
            },
            generatedAt: "2026-07-08T10:41:30.000Z",
        });
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
                "请让 api 项目执行 provider re-proof repair。",
                `必须使用 brief ${readyBrief.brief_id}，work item ${readyBrief.work_item_id}。`,
                "只补齐 request-provider-reproof-dispatch-timeline 的 native_request_adapter telemetry；不要把 timeline closure 当成 provider strong proof。",
            ].join("\n"),
            context: "Phase 98 selftest：验证 provider re-proof dispatch brief 到 assignment/timeline 的绑定。",
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const assignmentReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairAssignmentBindingReport)({ groupIds: [groupId] });
        const taskId = "task-provider-reproof-dispatch";
        const sessionId = "tas-provider-reproof-dispatch-timeline";
        const snapshotId = "snapshot-provider-reproof-dispatch-timeline";
        const executionId = "execution-provider-reproof-dispatch-timeline";
        let lastBinding = null;
        for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
            lastBinding = recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                brief: assignment.replay_repair_dispatch_brief || readyBrief,
                task_id: taskId,
                project: "api",
                assignment_id: assignment.assignmentId || assignment.assignment_id || "assignment-provider-reproof-dispatch-timeline",
                dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "dispatch-key-provider-reproof-dispatch-timeline",
                worker_context_packet_id: assignment.worker_context_packet?.packet_id || "wcp-provider-reproof-dispatch-timeline",
                worker_handoff_id: "handoff-provider-reproof-dispatch-timeline",
                memory_context_snapshot_id: snapshotId,
                memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-dispatch-timeline",
                task_agent_session_id: sessionId,
                native_session_id: "native-provider-reproof-dispatch-timeline",
                execution_id: executionId,
                receipt_status: "done",
                timeline_event: {
                    id: `tl-provider-reproof-${eventType}`,
                    type: eventType,
                    at: "2026-07-08T10:42:00.000Z",
                },
            }, { at: "2026-07-08T10:42:00.000Z" });
        }
        const timelineLedger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const binding = (timelineLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const timelineReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairTimelineBindingReport)({ groupIds: [groupId] });
        const postTimelineLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const stillOpenProviderItem = (postTimelineLedger.items || []).find((item) => item.source === "api_microcompact_native_apply_provider_reproof") || {};
        const eventTypes = new Set((binding.event_types || []).map((item) => String(item || "")));
        const checks = {
            providerCandidateCarriesReproofMetadata: providerCandidate.source === "api_microcompact_native_apply_provider_reproof"
                && providerCandidate.provider_reproof_status === "needed"
                && providerCandidate.provider_reproof_reason === "missing_native_request_adapter_telemetry"
                && providerCandidate.original_work_item_id === "api-native-proof-repair:original-dispatch-timeline",
            providerBriefUsesNativeProofContract: readyBrief.source === "api_microcompact_native_apply_provider_reproof"
                && readyBrief.provider_reproof_status === "needed"
                && readyBrief.provider_reproof_reason === "missing_native_request_adapter_telemetry"
                && /nativeApplyStrongProof=true/.test(readyBrief.worker_task || "")
                && /provider_reproof=needed|providerReproofStatus=strong/.test(readyBrief.worker_task || ""),
            providerBriefReportCoversMetadata: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.readyBriefCount || 0) === 1
                && Number(briefReport.overall?.metadataGapCount || 0) === 0,
            assignmentBindingIncludesProviderReproof: assignmentReport.overall?.status === "ok"
                && Number(assignmentReport.overall?.bindingCount || 0) === 1
                && (assignmentReport.groups?.[0]?.bindings || [])[0]?.provider_reproof_status === "needed",
            timelineBindingIncludesProviderReproof: timelineReport.overall?.status === "ok"
                && Number(timelineReport.overall?.bindingCount || 0) === 1
                && memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS.every(type => eventTypes.has(type))
                && binding.provider_reproof_status === "needed"
                && binding.original_work_item_id === "api-native-proof-repair:original-dispatch-timeline",
            timelineDoesNotPrematurelyCloseProviderReproof: (0, memory_control_center_1.replayRepairWorkItemOpen)(stillOpenProviderItem.status)
                && !lastBinding?.repair_work_item_completion
                && stillOpenProviderItem.provider_reproof_status === "needed",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            briefReport: briefReport.overall,
            assignmentReport: assignmentReport.overall,
            timelineReport: timelineReport.overall,
            providerBrief: {
                brief_id: readyBrief.brief_id || "",
                source: readyBrief.source || "",
                provider_reproof_status: readyBrief.provider_reproof_status || "",
                original_work_item_id: readyBrief.original_work_item_id || "",
            },
            timelineBinding: {
                timeline_binding_id: binding.timeline_binding_id || "",
                source: binding.source || "",
                provider_reproof_status: binding.provider_reproof_status || "",
                original_work_item_id: binding.original_work_item_id || "",
                event_types: binding.event_types || [],
            },
            providerWorkItem: {
                id: stillOpenProviderItem.id || stillOpenProviderItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(stillOpenProviderItem.status),
                provider_reproof_status: stillOpenProviderItem.provider_reproof_status || "",
            },
        };
    }
    finally {
        for (const file of [
            workItemsFile,
            `${workItemsFile}.bak`,
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
function runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest() {
    const groupId = `memory-center-api-microcompact-native-provider-reproof-worker-context-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const assignmentBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    try {
        const { syncReplayRepairDispatchPlansForCoordinator, runCodedGroupOrchestrator, } = require("../collaboration/group-orchestrator");
        const { renderWorkerContextPacket } = require("../../agents/runtime-kernel");
        const providerWorkItem = {
            id: "api-native-provider-reproof:worker-context",
            work_item_id: "api-native-provider-reproof:worker-context",
            taskId: "task-provider-reproof-worker-context",
            group_id: groupId,
            source: "api_microcompact_native_apply_provider_reproof",
            status: "pending",
            priority: "critical",
            component: "api_microcompact_native_provider_reproof",
            owner: "group-main-agent",
            target_project: "api",
            dispatch_target: "api",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            reproof_candidate_id: "api-native-proof-closure-reproof:worker-context",
            timeline_binding_id: "timeline-original-provider-worker-context",
            original_work_item_id: "api-native-proof-repair:original-worker-context",
            proof_entry_id: "proof-provider-reproof-worker-context",
            plan_checksum: "plan-provider-reproof-worker-context",
            apply_plan_checksum: "apply-provider-reproof-worker-context",
            request_patch_checksum: "request-provider-reproof-worker-context",
            runner_request_id: "runner-provider-reproof-worker-context",
            execution_id: "execution-provider-reproof-worker-context",
            task_agent_session_id: "tas-provider-reproof-worker-context",
            native_session_id: "native-provider-reproof-worker-context",
            memory_context_snapshot_id: "snapshot-provider-reproof-worker-context",
            memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-worker-context",
            request_telemetry_status: "missing",
            request_telemetry_source: "",
            request_telemetry_session_status: "bound",
            request_telemetry_dispatch_status: "runner_bound",
            instruction: "补齐 provider native_request_adapter telemetry re-proof，并把 provider re-proof 元数据稳定注入 WorkerContextPacket。",
            expected: "providerReproofStatus=strong; nativeApplyStrongProof=true; requestTelemetrySessionBound=true; requestTelemetryDispatchBound=true",
            prompt_patch: "只重跑 request-provider-reproof-worker-context 的 provider telemetry re-proof。",
            createdAt: "2026-07-08T10:50:00.000Z",
            updatedAt: "2026-07-08T10:50:00.000Z",
        };
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            items: [providerWorkItem],
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)([providerWorkItem]),
            updatedAt: "2026-07-08T10:50:00.000Z",
        });
        const candidateSummary = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { limit: 8 });
        const planLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, candidateSummary, { at: "2026-07-08T10:51:00.000Z" });
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_provider_reproof") || {};
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
                "请让 api 项目执行 provider re-proof worker context injection repair。",
                `必须使用 brief ${readyBrief.brief_id}，work item ${readyBrief.work_item_id}。`,
                "检查 request-provider-reproof-worker-context 的 native_request_adapter telemetry，并确认 WorkerContextPacket 中携带 provider re-proof 元数据。",
            ].join("\n"),
            context: "Phase 99 selftest：验证 provider re-proof brief 进入 WorkerContextPacket 结构化包和渲染文本。",
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const packet = assignment.worker_context_packet || {};
        const packetBrief = (packet.replay_repair_dispatch_briefs || []).find((item) => item.brief_id === readyBrief.brief_id) || {};
        const renderedPacket = renderWorkerContextPacket(packet);
        const bindingLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchBindingLedger)(groupId);
        const binding = (bindingLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const bindingPacketBrief = (binding.worker_context_packet_replay_briefs || []).find((item) => item.brief_id === readyBrief.brief_id) || {};
        const renderFlags = binding.worker_context_packet_render_probe?.rendered_flags || {};
        const injectionReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairWorkerContextPacketInjectionReport)({ groupIds: [groupId] });
        const injectionCheck = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairWorkerContextPacketInjection)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["api_microcompact_native_apply_proof_repair_worker_context_packet_injection"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((check) => check.id === "api_microcompact_native_apply_proof_repair_worker_context_packet_injection") || {};
        const checks = {
            assignmentPacketCarriesProviderReproofBrief: packetBrief.source === "api_microcompact_native_apply_provider_reproof"
                && packetBrief.provider_reproof_status === "needed"
                && packetBrief.provider_reproof_reason === "missing_native_request_adapter_telemetry"
                && packetBrief.reproof_candidate_id === "api-native-proof-closure-reproof:worker-context"
                && packetBrief.original_work_item_id === "api-native-proof-repair:original-worker-context"
                && packetBrief.request_patch_checksum === "request-provider-reproof-worker-context"
                && packetBrief.runner_request_id === "runner-provider-reproof-worker-context"
                && packetBrief.should_create_real_task === false
                && packetBrief.required_receipt_reference === true,
            renderedWorkerContextCarriesProviderReproofBrief: renderedPacket.includes("provider_reproof=needed")
                && renderedPacket.includes("provider_reason=missing_native_request_adapter_telemetry")
                && renderedPacket.includes("reproof_candidate=api-native-proof-closure-reproof:worker-context")
                && renderedPacket.includes("original_work_item=api-native-proof-repair:original-worker-context")
                && renderedPacket.includes("request-provider-reproof-worker-context")
                && renderedPacket.includes("runner-provider-reproof-worker-context")
                && renderedPacket.includes("shouldCreateRealTask=false"),
            bindingPersistsInjectedPacketSnapshot: bindingPacketBrief.brief_id === readyBrief.brief_id
                && bindingPacketBrief.provider_reproof_status === "needed"
                && bindingPacketBrief.provider_reproof_reason === "missing_native_request_adapter_telemetry"
                && bindingPacketBrief.reproof_candidate_id === "api-native-proof-closure-reproof:worker-context"
                && renderFlags.has_provider_reproof_status === true
                && renderFlags.has_provider_reproof_reason === true
                && renderFlags.has_original_work_item_id === true,
            injectionReportCoversProviderReproofPacket: injectionReport.overall?.status === "ok"
                && Number(injectionReport.overall?.bindingCount || 0) === 1
                && Number(injectionReport.overall?.providerReproofBindingCount || 0) === 1
                && Number(injectionReport.overall?.providerReproofPacketCount || 0) === 1
                && Number(injectionReport.overall?.renderedProviderReproofCount || 0) === 1,
            qualityCheckExposesWorkerContextInjection: injectionCheck.id === "api_microcompact_native_apply_proof_repair_worker_context_packet_injection"
                && injectionCheck.status === "ok"
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            injectionReport: injectionReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            packetBrief: {
                brief_id: packetBrief.brief_id || "",
                source: packetBrief.source || "",
                provider_reproof_status: packetBrief.provider_reproof_status || "",
                provider_reproof_reason: packetBrief.provider_reproof_reason || "",
                reproof_candidate_id: packetBrief.reproof_candidate_id || "",
                original_work_item_id: packetBrief.original_work_item_id || "",
            },
            binding: {
                binding_id: binding.binding_id || "",
                worker_context_packet_id: binding.worker_context_packet_id || "",
                rendered_flags: renderFlags,
            },
        };
    }
    finally {
        for (const file of [
            workItemsFile,
            `${workItemsFile}.bak`,
            dispatchPlanFile,
            `${dispatchPlanFile}.bak`,
            assignmentBindingFile,
            `${assignmentBindingFile}.bak`,
        ]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionSelfTest() {
    const groupId = `memory-center-api-microcompact-native-provider-reproof-receipt-consumption-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const assignmentBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    try {
        const { syncReplayRepairDispatchPlansForCoordinator, runCodedGroupOrchestrator, recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchTimelineBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const providerWorkItem = {
            id: "api-native-provider-reproof:receipt-consumption",
            work_item_id: "api-native-provider-reproof:receipt-consumption",
            taskId: "task-provider-reproof-receipt-consumption",
            group_id: groupId,
            source: "api_microcompact_native_apply_provider_reproof",
            status: "pending",
            priority: "critical",
            component: "api_microcompact_native_provider_reproof",
            owner: "group-main-agent",
            target_project: "api",
            dispatch_target: "api",
            provider_reproof_status: "needed",
            provider_reproof_reason: "missing_native_request_adapter_telemetry",
            reproof_candidate_id: "api-native-proof-closure-reproof:receipt-consumption",
            timeline_binding_id: "timeline-original-provider-receipt-consumption",
            original_work_item_id: "api-native-proof-repair:original-receipt-consumption",
            proof_entry_id: "proof-provider-reproof-receipt-consumption",
            plan_checksum: "plan-provider-reproof-receipt-consumption",
            apply_plan_checksum: "apply-provider-reproof-receipt-consumption",
            request_patch_checksum: "request-provider-reproof-receipt-consumption",
            runner_request_id: "runner-provider-reproof-receipt-consumption",
            execution_id: "execution-provider-reproof-receipt-consumption",
            task_agent_session_id: "tas-provider-reproof-receipt-consumption",
            native_session_id: "native-provider-reproof-receipt-consumption",
            memory_context_snapshot_id: "snapshot-provider-reproof-receipt-consumption",
            memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-receipt-consumption",
            request_telemetry_status: "missing",
            request_telemetry_source: "",
            request_telemetry_session_status: "bound",
            request_telemetry_dispatch_status: "runner_bound",
            instruction: "补齐 provider native_request_adapter telemetry re-proof，并在回执中声明 replay repair brief usage。",
            expected: "replayRepairDispatchBriefUsage=used; providerReproofStatus=needed; nativeApplyStrongProof 仍由 provider proof ledger 证明",
            prompt_patch: "只重跑 request-provider-reproof-receipt-consumption 的 provider telemetry re-proof。",
            createdAt: "2026-07-08T11:00:00.000Z",
            updatedAt: "2026-07-08T11:00:00.000Z",
        };
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            items: [providerWorkItem],
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)([providerWorkItem]),
            updatedAt: "2026-07-08T11:00:00.000Z",
        });
        const candidateSummary = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId, { limit: 8 });
        const planLedger = syncReplayRepairDispatchPlansForCoordinator(groupId, candidateSummary, { at: "2026-07-08T11:01:00.000Z" });
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && brief.source === "api_microcompact_native_apply_provider_reproof") || {};
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
                "请让 api 项目执行 provider re-proof receipt consumption repair。",
                `必须使用 brief ${readyBrief.brief_id}，work item ${readyBrief.work_item_id}。`,
                "完成后回执必须声明 replayRepairDispatchBriefUsage。",
            ].join("\n"),
            context: "Phase 100 selftest：验证 provider re-proof brief 注入后的 receipt consumption 审计。",
        });
        const assignment = (result.assignments || []).find((item) => item.project === "api") || {};
        const receipt = {
            status: "done",
            summary: "已使用 provider re-proof brief 定位待补 request telemetry；provider strong proof 仍等待 native proof ledger。",
            replayRepairDispatchBriefUsage: [{
                    briefId: readyBrief.brief_id,
                    workItemId: readyBrief.work_item_id,
                    usageState: "used",
                    providerReproofStatus: "needed",
                    requestPatchChecksum: "request-provider-reproof-receipt-consumption",
                    runnerRequestId: "runner-provider-reproof-receipt-consumption",
                    reason: "使用 WorkerContextPacket 中的 provider re-proof brief 执行精确 telemetry re-proof。",
                }],
            memoryUsed: [`replay repair brief ${readyBrief.brief_id}；work_item_id=${readyBrief.work_item_id}；request-provider-reproof-receipt-consumption`],
            memoryIgnored: [],
            blockers: [],
            needs: [],
        };
        const taskId = "task-provider-reproof-receipt-consumption";
        const sessionId = "tas-provider-reproof-receipt-consumption";
        const snapshotId = "snapshot-provider-reproof-receipt-consumption";
        const executionId = "execution-provider-reproof-receipt-consumption";
        for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
            recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                brief: assignment.replay_repair_dispatch_brief || readyBrief,
                task_id: taskId,
                project: "api",
                assignment_id: assignment.assignmentId || assignment.assignment_id || "assignment-provider-reproof-receipt-consumption",
                dispatch_key: assignment.dispatchKey || assignment.dispatch_key || "dispatch-key-provider-reproof-receipt-consumption",
                worker_context_packet_id: assignment.worker_context_packet?.packet_id || "wcp-provider-reproof-receipt-consumption",
                worker_handoff_id: "handoff-provider-reproof-receipt-consumption",
                memory_context_snapshot_id: snapshotId,
                memory_context_snapshot_checksum: "snapshot-checksum-provider-reproof-receipt-consumption",
                task_agent_session_id: sessionId,
                native_session_id: "native-provider-reproof-receipt-consumption",
                execution_id: executionId,
                receipt_status: eventType === "child_agent_receipt" ? "done" : "",
                receipt: eventType === "child_agent_receipt" ? receipt : null,
                timeline_event: {
                    id: `tl-provider-reproof-consumption-${eventType}`,
                    type: eventType,
                    at: "2026-07-08T11:02:00.000Z",
                },
            }, { at: "2026-07-08T11:02:00.000Z" });
        }
        const timelineLedger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const binding = (timelineLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const consumptionReport = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProofRepairReceiptConsumptionReport)({ groupIds: [groupId] });
        const consumptionCheck = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProofRepairReceiptConsumption)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["api_microcompact_native_apply_proof_repair_receipt_consumption"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((check) => check.id === "api_microcompact_native_apply_proof_repair_receipt_consumption") || {};
        const postTimelineLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const stillOpenProviderItem = (postTimelineLedger.items || []).find((item) => item.source === "api_microcompact_native_apply_provider_reproof") || {};
        const checks = {
            timelineBindingRecordsReceiptConsumption: binding.replay_repair_consumption_status === "used"
                && binding.replay_repair_consumption_source === "receipt.replayRepairDispatchBriefUsage"
                && /provider re-proof brief/.test(binding.replay_repair_consumption_reason || "")
                && binding.provider_reproof_status === "needed"
                && binding.original_work_item_id === "api-native-proof-repair:original-receipt-consumption",
            consumptionReportCoversProviderReproofReceipt: consumptionReport.overall?.status === "ok"
                && Number(consumptionReport.overall?.receiptBindingCount || 0) === 1
                && Number(consumptionReport.overall?.providerReproofReceiptCount || 0) === 1
                && Number(consumptionReport.overall?.providerReproofConsumedCount || 0) === 1
                && Number(consumptionReport.overall?.metadataGapCount || 0) === 0,
            qualityCheckExposesReceiptConsumption: consumptionCheck.id === "api_microcompact_native_apply_proof_repair_receipt_consumption"
                && consumptionCheck.status === "ok"
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
            receiptConsumptionDoesNotCloseProviderReproof: (0, memory_control_center_1.replayRepairWorkItemOpen)(stillOpenProviderItem.status)
                && stillOpenProviderItem.provider_reproof_status === "needed",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            consumptionReport: consumptionReport.overall,
            qualityCheck: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            timelineBinding: {
                timeline_binding_id: binding.timeline_binding_id || "",
                replay_repair_consumption_status: binding.replay_repair_consumption_status || "",
                replay_repair_consumption_source: binding.replay_repair_consumption_source || "",
                provider_reproof_status: binding.provider_reproof_status || "",
            },
            providerWorkItem: {
                id: stillOpenProviderItem.id || stillOpenProviderItem.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(stillOpenProviderItem.status),
                provider_reproof_status: stillOpenProviderItem.provider_reproof_status || "",
            },
        };
    }
    finally {
        for (const file of [
            workItemsFile,
            `${workItemsFile}.bak`,
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
function runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemorySelfTest() {
    const groupId = `memory-center-api-microcompact-native-provider-reproof-receipt-typed-memory-selftest-${process.pid}-${Date.now()}`;
    const timelineBindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    let typedDir = "";
    try {
        const { buildGroupTypedMemoryRecall, getGroupTypedMemoryDir, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const { recordReplayRepairDispatchBriefTimelineBinding } = require("../collaboration/group-orchestrator");
        typedDir = getGroupTypedMemoryDir(groupId);
        const providerBriefs = [
            {
                brief_id: "brief-provider-reproof-typed-memory-used",
                work_item_id: "work-provider-reproof-typed-memory-used",
                source: "api_microcompact_native_apply_provider_reproof",
                target_project: "api",
                provider_reproof_status: "needed",
                provider_reproof_reason: "missing_native_request_adapter_telemetry",
                reproof_candidate_id: "candidate-provider-reproof-typed-memory-used",
                original_work_item_id: "original-provider-reproof-typed-memory-used",
                request_patch_checksum: "request-provider-reproof-typed-memory-used",
                runner_request_id: "runner-provider-reproof-typed-memory-used",
            },
            {
                brief_id: "brief-provider-reproof-typed-memory-strong",
                work_item_id: "work-provider-reproof-typed-memory-strong",
                source: "api_microcompact_native_apply_provider_reproof",
                target_project: "api",
                provider_reproof_status: "needed",
                provider_reproof_reason: "missing_native_request_adapter_telemetry",
                reproof_candidate_id: "candidate-provider-reproof-typed-memory-strong",
                original_work_item_id: "original-provider-reproof-typed-memory-strong",
                request_patch_checksum: "request-provider-reproof-typed-memory-strong",
                runner_request_id: "runner-provider-reproof-typed-memory-strong",
            },
            {
                brief_id: "brief-provider-reproof-typed-memory-ignored",
                work_item_id: "work-provider-reproof-typed-memory-ignored",
                source: "api_microcompact_native_apply_provider_reproof",
                target_project: "api",
                provider_reproof_status: "needed",
                provider_reproof_reason: "superseded_candidate",
                reproof_candidate_id: "candidate-provider-reproof-typed-memory-ignored",
                original_work_item_id: "original-provider-reproof-typed-memory-ignored",
                request_patch_checksum: "request-provider-reproof-typed-memory-ignored",
                runner_request_id: "runner-provider-reproof-typed-memory-ignored",
            },
        ];
        const receiptRows = [
            {
                briefId: "brief-provider-reproof-typed-memory-used",
                workItemId: "work-provider-reproof-typed-memory-used",
                usageState: "used",
                providerReproofStatus: "needed",
                requestPatchChecksum: "request-provider-reproof-typed-memory-used",
                runnerRequestId: "runner-provider-reproof-typed-memory-used",
                reason: "PROVIDER_REPROOF_TYPED_MEMORY_USED_SENTINEL 已使用 provider re-proof brief 作为下一轮修复上下文。",
            },
            {
                briefId: "brief-provider-reproof-typed-memory-strong",
                workItemId: "work-provider-reproof-typed-memory-strong",
                usageState: "strong",
                providerReproofStatus: "needed",
                requestPatchChecksum: "request-provider-reproof-typed-memory-strong",
                runnerRequestId: "runner-provider-reproof-typed-memory-strong",
                reason: "PROVIDER_REPROOF_TYPED_MEMORY_STRONG_SENTINEL 子 Agent 声称 strong，但仍需 native provider proof ledger。",
            },
            {
                briefId: "brief-provider-reproof-typed-memory-ignored",
                workItemId: "work-provider-reproof-typed-memory-ignored",
                usageState: "ignored",
                providerReproofStatus: "needed",
                requestPatchChecksum: "request-provider-reproof-typed-memory-ignored",
                runnerRequestId: "runner-provider-reproof-typed-memory-ignored",
                reason: "PROVIDER_REPROOF_TYPED_MEMORY_IGNORED_SENTINEL 旧 provider re-proof brief 被忽略，应进入 caution memory。",
            },
        ];
        const receipt = {
            status: "done",
            summary: "provider re-proof typed memory receipt consumption selftest",
            replayRepairDispatchBriefUsage: receiptRows,
            memoryUsed: ["brief-provider-reproof-typed-memory-used", "brief-provider-reproof-typed-memory-strong"],
            memoryIgnored: ["brief-provider-reproof-typed-memory-ignored"],
            blockers: [],
            needs: [],
        };
        providerBriefs.forEach((brief, index) => {
            recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                brief,
                task_id: `task-provider-reproof-typed-memory-${index}`,
                project: "api",
                assignment_id: `assignment-provider-reproof-typed-memory-${index}`,
                dispatch_key: `dispatch-provider-reproof-typed-memory-${index}`,
                worker_context_packet_id: `wcp-provider-reproof-typed-memory-${index}`,
                worker_handoff_id: `handoff-provider-reproof-typed-memory-${index}`,
                memory_context_snapshot_id: `snapshot-provider-reproof-typed-memory-${index}`,
                memory_context_snapshot_checksum: `snapshot-checksum-provider-reproof-typed-memory-${index}`,
                task_agent_session_id: `tas-provider-reproof-typed-memory-${index}`,
                native_session_id: `native-provider-reproof-typed-memory-${index}`,
                execution_id: `execution-provider-reproof-typed-memory-${index}`,
                receipt_status: "done",
                receipt,
                timeline_event: {
                    id: `tl-provider-reproof-typed-memory-${index}`,
                    type: "child_agent_receipt",
                    at: "2026-07-08T12:20:00.000Z",
                },
            }, { at: "2026-07-08T12:20:00.000Z" });
        });
        const ledger = readGroupTypedMemoryDistillationLedger(groupId);
        const docs = scanGroupTypedMemoryDocuments(groupId);
        const recall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_REPROOF_TYPED_MEMORY_USED_SENTINEL request-provider-reproof-typed-memory-used", { disableLedger: true, forceMemory: true, max: 8 });
        const cautionRecall = buildGroupTypedMemoryRecall(groupId, "PROVIDER_REPROOF_TYPED_MEMORY_IGNORED_SENTINEL request-provider-reproof-typed-memory-ignored", { disableLedger: true, forceMemory: true, max: 8 });
        const report = (0, memory_control_center_1.buildApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemoryReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemory)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["api_microcompact_native_apply_provider_reproof_receipt_consumption_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "api_microcompact_native_apply_provider_reproof_receipt_consumption_typed_memory") || {};
        const archiveRows = ledger.providerReproofReceiptConsumptionArchive?.rows || [];
        const recallDoc = docs.find((doc) => doc.relPath === "provider-reproof-receipt-consumption-recall.md");
        const cautionDoc = docs.find((doc) => doc.relPath === "provider-reproof-receipt-consumption-cautions.md");
        const recallDocText = recallDoc?.file ? fs.readFileSync(recallDoc.file, "utf-8") : "";
        const checks = {
            timelineReceiptAutoDistillsTypedArchive: ledger.providerReproofReceiptConsumptionArchive?.archived_count === 3
                && ledger.providerReproofReceiptConsumptionArchive?.promoted_count === 2
                && ledger.providerReproofReceiptConsumptionArchive?.caution_count === 1,
            archiveClassifiesStrongAsClaimOnly: archiveRows.some((row) => row.status === "strong" && row.strong_receipt_claim_only === true)
                && recallDocText.includes("receipt strong is a consumption claim only"),
            typedDocsSplitPromotedAndCaution: recallDoc?.type === "reference"
                && cautionDoc?.type === "feedback",
            recallProbeFindsPromotedProviderMemory: JSON.stringify(recall.recalled || []).includes("PROVIDER_REPROOF_TYPED_MEMORY_USED_SENTINEL")
                && JSON.stringify(recall.recalled || []).includes("provider-reproof-receipt-consumption-recall.md"),
            cautionProbeFindsFeedbackMemory: cautionRecall.recalled.some((item) => item.relPath === "provider-reproof-receipt-consumption-cautions.md" && item.type === "feedback")
                && JSON.stringify(cautionRecall.recalled || []).includes("PROVIDER_REPROOF_TYPED_MEMORY_IGNORED_SENTINEL"),
            reportCoversTypedMemoryDistillation: report.overall?.status === "ok"
                && Number(report.overall?.providerReproofReceiptCount || 0) === 3
                && Number(report.overall?.archivedReceiptCount || 0) === 3
                && Number(report.overall?.promotedReceiptCount || 0) === 2
                && Number(report.overall?.cautionReceiptCount || 0) === 1
                && Number(report.overall?.strongReceiptClaimCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            qualityCheckExposesTypedMemoryCoverage: check.id === "api_microcompact_native_apply_provider_reproof_receipt_consumption_typed_memory"
                && check.status === "ok"
                && qualityCheck.status === "ok"
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
            docs: docs.filter((doc) => String(doc.relPath || "").includes("provider-reproof-receipt-consumption")).map((doc) => ({ relPath: doc.relPath, type: doc.type })),
            recalled: recall.recalled.map((item) => item.relPath),
            cautionRecalled: cautionRecall.recalled.map((item) => `${item.type}:${item.relPath}`),
        };
    }
    finally {
        for (const file of [
            timelineBindingFile,
            `${timelineBindingFile}.bak`,
        ]) {
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
function runMemoryCenterCompactionHookLedgerSelfTest() {
    const groupId = `memory-center-hook-ledger-selftest-${process.pid}-${Date.now()}`;
    const groupSessionId = "gcs_memory_center_hook_ledger_selftest";
    let groupFile = "";
    let messageFile = "";
    const reloadFile = (0, memory_control_center_1.groupSessionSidecarFile)(path.join(utils_1.CCM_DIR, "group-memory-reload"), groupId, groupSessionId);
    const replayRepairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId, groupSessionId);
    let hookLedgerFile = "";
    try {
        const { getGroupMemoryCompactionHookLedgerFile, } = require("../collaboration/group-memory-compaction");
        const { saveGroupMemory, getGroupMemoryFile } = require("../collaboration/memory");
        const { saveGroupMessages, getGroupChatSessionMessagesFile } = require("../collaboration/storage");
        groupFile = getGroupMemoryFile(groupId, groupSessionId);
        messageFile = getGroupChatSessionMessagesFile(groupId, groupSessionId);
        hookLedgerFile = getGroupMemoryCompactionHookLedgerFile(groupId, groupSessionId);
        const hookRunId = `gmch-selftest-${Date.now().toString(36)}`;
        saveGroupMessages(groupId, Array.from({ length: 10 }, (_, index) => ({
            id: `hook-ledger-${index}`,
            group_session_id: groupSessionId,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            content: index === 0
                ? "必须保留 HOOK_LEDGER_SENTINEL。"
                : `hook ledger 自测 ${index}，涉及 src/hook-ledger.ts。`,
            timestamp: "2026-07-07T03:00:00.000Z",
        })), groupSessionId);
        saveGroupMemory(groupId, {
            groupId,
            groupSessionId,
            goal: "压缩 hook ledger 自测",
            persistentRequirements: [{ messageId: "hook-ledger-0", text: "必须保留 HOOK_LEDGER_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 6,
                preservedRecentMessages: 4,
                preCompactTokenCount: 6000,
                postCompactTokenCount: 1600,
                lastCompactedAt: "2026-07-07T03:00:00.000Z",
                summaryChecksum: "hook-ledger-summary",
                hookLedger: {
                    schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
                    hookRunId,
                    file: hookLedgerFile,
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    checkCount: 2,
                    passedChecks: 2,
                    failedChecks: [],
                },
            },
            compactBoundary: {
                id: "boundary-hook-ledger-selftest",
                summarizedThroughMessageId: "hook-ledger-5",
                summarizedMessageCount: 6,
                summaryChecksum: "hook-ledger-summary",
                preCompactTokenCount: 6000,
                postCompactTokenCount: 1600,
            },
        }, groupSessionId);
        const entries = [
            {
                entry_id: "hook-ledger-pre",
                hook_run_id: hookRunId,
                group_id: groupId,
                group_session_id: groupSessionId,
                phase: "pre",
                hook_index: 0,
                ok: true,
                status: "ok",
                duration_ms: 3,
                error: "",
                result_summary: { keys: ["mustKeep", "factAnchors"], persistentRequirementCount: 1, factAnchorCount: 1 },
                at: "2026-07-07T03:00:00.000Z",
                boundary_id: "",
                summarized_through_message_id: "",
                summary_checksum: "",
            },
            {
                entry_id: "hook-ledger-post",
                hook_run_id: hookRunId,
                group_id: groupId,
                group_session_id: groupSessionId,
                phase: "post",
                hook_index: 0,
                ok: true,
                status: "ok",
                duration_ms: 5,
                error: "",
                result_summary: { keys: ["checked", "microRecords"], checked: true },
                at: "2026-07-07T03:00:01.000Z",
                boundary_id: "boundary-hook-ledger-selftest",
                summarized_through_message_id: "hook-ledger-5",
                summary_checksum: "hook-ledger-summary",
            },
        ];
        fs.mkdirSync(path.dirname(hookLedgerFile), { recursive: true });
        fs.writeFileSync(hookLedgerFile, JSON.stringify({
            schema: "ccm-group-memory-compaction-hook-ledger-v2",
            version: 2,
            groupId,
            groupSessionId,
            scopeId: `${groupId}::${groupSessionId}`,
            scopeValid: true,
            scopeIssues: [],
            rejectedEntryCount: 0,
            entries,
            stats: { total: 2, ok: 2, failed: 0, pre: { total: 1, ok: 1, failed: 0 }, post: { total: 1, ok: 1, failed: 0 } },
            updatedAt: "2026-07-07T03:00:01.000Z",
        }, null, 2), "utf-8");
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", `${groupId}::${groupSessionId}`);
        const hooks = detail.postCompactUsage?.compactionHooks || {};
        const report = (0, memory_control_center_1.buildCompactionHookLedgerReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateCompactionHookLedger)({ groupIds: [groupId] });
        const overview = (0, memory_control_center_1.buildMemoryCenterOverview)();
        const overviewHookReport = overview.compactionHookLedgerReport || {};
        const checks = {
            detailExposesHookLedger: hooks.schema === "ccm-group-compaction-hook-ledger-summary-v1"
                && hooks.status === "ok"
                && hooks.preCount === 1
                && hooks.postCount === 1
                && hooks.failedCount === 0
                && hooks.recentEntries?.some((entry) => entry.phase === "post"),
            reportAggregatesHookLedger: report.schema === "ccm-compaction-hook-ledger-report-v1"
                && report.overall?.status === "ok"
                && report.groups?.some((row) => row.groupId === groupId && row.status === "ok"),
            qualityCheckPassesHookLedger: check.id === "compaction_hook_ledger"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            overviewExposesHookReport: overviewHookReport.schema === "ccm-compaction-hook-ledger-report-v1"
                && overviewHookReport.overall
                && Array.isArray(overviewHookReport.groups),
        };
        return { pass: Object.values(checks).every(Boolean), checks, hooks };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, hookLedgerFile, replayRepairLedgerFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactBoundaryReplayGateSelfTest() {
    const groupId = `memory-center-replay-gate-selftest-${process.pid}-${Date.now()}`;
    const groupSessionId = "gcs_memory_center_replay_gate_selftest";
    let groupFile = "";
    let messageFile = "";
    const reloadFile = (0, memory_control_center_1.groupSessionSidecarFile)(path.join(utils_1.CCM_DIR, "group-memory-reload"), groupId, groupSessionId);
    let hookLedgerFile = "";
    try {
        const { getGroupMemoryCompactionHookLedgerFile } = require("../collaboration/group-memory-compaction");
        const { saveGroupMemory, getGroupMemoryFile } = require("../collaboration/memory");
        const { saveGroupMessages, getGroupChatSessionMessagesFile } = require("../collaboration/storage");
        groupFile = getGroupMemoryFile(groupId, groupSessionId);
        messageFile = getGroupChatSessionMessagesFile(groupId, groupSessionId);
        hookLedgerFile = getGroupMemoryCompactionHookLedgerFile(groupId, groupSessionId);
        const hookRunId = `gmch-replay-${Date.now().toString(36)}`;
        saveGroupMessages(groupId, Array.from({ length: 12 }, (_, index) => ({
            id: `replay-gate-${index}`,
            group_session_id: groupSessionId,
            role: index % 2 ? "assistant" : "user",
            agent: index % 2 ? "api" : undefined,
            content: index === 0
                ? "必须保留 REPLAY_GATE_HOOK_SENTINEL。"
                : `Replay gate 自测 ${index}，涉及 src/replay-gate.ts 和 npm run test:replay。`,
            timestamp: "2026-07-07T04:00:00.000Z",
        })), groupSessionId);
        saveGroupMemory(groupId, {
            groupId,
            groupSessionId,
            goal: "验证压缩边界 replay gate 能恢复子 Agent 上下文",
            persistentRequirements: [{ messageId: "hook-pre", text: "必须保留 REPLAY_GATE_HOOK_SENTINEL。" }],
            nextActions: [{ action: "继续核对 replay gate 验收线索" }],
            compaction: {
                version: 1,
                compactedMessageCount: 8,
                preservedRecentMessages: 4,
                preCompactTokenCount: 7600,
                postCompactTokenCount: 1700,
                lastCompactedAt: "2026-07-07T04:00:00.000Z",
                summaryChecksum: "replay-gate-summary",
                postCompactReinject: {
                    schema: "ccm-post-compact-reinjection-v1",
                    hasCandidates: true,
                    files: [{ candidate_id: "replay_file", value: "src/replay-gate.ts", sourceMessageId: "replay-gate-2" }],
                    verification: [{ candidate_id: "replay_check", value: "npm run test:replay", sourceMessageId: "replay-gate-3" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    summaryChecksum: "replay-gate-summary",
                    checkCount: 3,
                    passedChecks: 3,
                    failedChecks: [],
                },
                hookLedger: {
                    schema: "ccm-group-memory-compaction-hook-ledger-summary-v1",
                    hookRunId,
                    file: hookLedgerFile,
                    stats: {
                        failed: 0,
                        pre: { total: 1, ok: 1, failed: 0 },
                        post: { total: 1, ok: 1, failed: 0 },
                    },
                    recentEntries: [
                        {
                            entry_id: "replay-hook-pre",
                            hook_run_id: hookRunId,
                            phase: "pre",
                            ok: true,
                            status: "ok",
                            duration_ms: 2,
                            result_summary: { keys: ["mustKeep"], persistentRequirementCount: 1, text: "REPLAY_GATE_HOOK_SENTINEL" },
                            at: "2026-07-07T04:00:00.000Z",
                        },
                        {
                            entry_id: "replay-hook-post",
                            hook_run_id: hookRunId,
                            phase: "post",
                            ok: true,
                            status: "ok",
                            duration_ms: 3,
                            result_summary: { keys: ["checked"], checked: true },
                            at: "2026-07-07T04:00:01.000Z",
                        },
                    ],
                },
            },
            compactBoundary: {
                id: "boundary-replay-gate-selftest",
                summarizedThroughMessageId: "replay-gate-7",
                summarizedMessageCount: 8,
                summaryChecksum: "replay-gate-summary",
                preCompactTokenCount: 7600,
                postCompactTokenCount: 1700,
            },
            agentMemories: { api: { project: "api", recentReceipts: [], frequentFiles: ["src/replay-gate.ts"] } },
        }, groupSessionId);
        fs.mkdirSync(path.dirname(hookLedgerFile), { recursive: true });
        fs.writeFileSync(hookLedgerFile, JSON.stringify({
            schema: "ccm-group-memory-compaction-hook-ledger-v2",
            version: 2,
            groupId,
            groupSessionId,
            scopeId: `${groupId}::${groupSessionId}`,
            scopeValid: true,
            scopeIssues: [],
            rejectedEntryCount: 0,
            entries: [
                {
                    entry_id: "replay-hook-pre",
                    hook_run_id: hookRunId,
                    group_id: groupId,
                    group_session_id: groupSessionId,
                    phase: "pre",
                    hook_index: 0,
                    ok: true,
                    status: "ok",
                    duration_ms: 2,
                    result_summary: { keys: ["mustKeep"], persistentRequirementCount: 1, text: "REPLAY_GATE_HOOK_SENTINEL" },
                    at: "2026-07-07T04:00:00.000Z",
                },
                {
                    entry_id: "replay-hook-post",
                    hook_run_id: hookRunId,
                    group_id: groupId,
                    group_session_id: groupSessionId,
                    phase: "post",
                    hook_index: 0,
                    ok: true,
                    status: "ok",
                    duration_ms: 3,
                    result_summary: { keys: ["checked"], checked: true },
                    at: "2026-07-07T04:00:01.000Z",
                },
            ],
            stats: { total: 2, ok: 2, failed: 0, pre: { total: 1, ok: 1, failed: 0 }, post: { total: 1, ok: 1, failed: 0 } },
            updatedAt: "2026-07-07T04:00:01.000Z",
        }, null, 2), "utf-8");
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", `${groupId}::${groupSessionId}`);
        const replay = detail.postCompactUsage?.boundaryReplay || {};
        const report = (0, memory_control_center_1.buildCompactBoundaryReplayReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateCompactBoundaryReplayGate)({ groupIds: [groupId] });
        const needleText = JSON.stringify(replay.needles || []);
        const checks = {
            detailExposesReplayGate: replay.schema === "ccm-compact-boundary-replay-gate-v1"
                && replay.status === "ok"
                && Number(replay.score || 0) >= 95
                && replay.receiptContractVisible === true
                && replay.candidateContractVisible === true,
            replayMatchesHookConstraint: needleText.includes("REPLAY_GATE_HOOK_SENTINEL")
                && replay.needles?.some((needle) => needle.type === "constraint" && needle.matched === true),
            replayMatchesFileAndVerification: replay.needles?.some((needle) => needle.type === "file" && needle.value.includes("src/replay-gate.ts") && needle.matched === true)
                && replay.needles?.some((needle) => needle.type === "verification" && needle.value.includes("npm run test:replay") && needle.matched === true),
            replayMatchesBoundaryAndHook: replay.needles?.some((needle) => needle.type === "boundary" && needle.value.includes("replay-gate-summary") && needle.matched === true)
                && replay.needles?.some((needle) => needle.type === "hook" && needle.value.includes(hookRunId) && needle.matched === true),
            replayRepairPlanIdleWhenHealthy: replay.repairPlan?.schema === "ccm-compact-boundary-replay-repair-plan-v1"
                && replay.repairPlan?.status === "ok"
                && Number(replay.repairPlan?.requiredActionCount || 0) === 0,
            reportAggregatesReplayGate: report.schema === "ccm-compact-boundary-replay-report-v1"
                && report.overall?.status === "ok"
                && report.groups?.some((row) => row.groupId === groupId && row.status === "ok"),
            qualityCheckPassesReplayGate: check.id === "compact_boundary_replay_gate"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, replay };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`, hookLedgerFile]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest() {
    const groupId = `memory-center-replay-repair-selftest-${process.pid}-${Date.now()}`;
    const memory = {
        groupId,
        goal: "验证 replay repair plan 能把失败 replay 变成可执行修复动作",
        compaction: {
            summaryChecksum: "repair-plan-summary",
            compactedMessageCount: 9,
            preservedRecentMessages: 3,
            postCompactReinject: {
                schema: "ccm-post-compact-reinjection-v1",
                files: [{ candidate_id: "lost_file", value: "src/lost-context.ts", sourceMessageId: "m2" }],
            },
        },
        compactBoundary: {
            summarizedThroughMessageId: "m9",
            summaryChecksum: "repair-plan-summary",
        },
    };
    const gaps = [
        {
            type: "receipt_contract",
            label: "memoryUsed/memoryIgnored",
            value: "memoryUsed/memoryIgnored",
            reason: "回执契约未进入子 Agent replay 上下文",
        },
        {
            type: "file",
            label: "lost_file",
            value: "src/lost-context.ts",
            reason: "压缩后文件候选未进入子 Agent replay 上下文",
        },
    ];
    const plan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
        status: "fail",
        score: 50,
        targetProject: "api",
        renderedHash: "repair-plan-rendered",
        gaps,
        candidates: memory.compaction.postCompactReinject.files,
        boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
    });
    const checks = {
        exposesRepairPlanSchema: plan.schema === "ccm-compact-boundary-replay-repair-plan-v1"
            && plan.status === "rework_required"
            && plan.action === "refresh_and_replay_child_agent_memory",
        prioritizesReceiptContract: plan.actions?.[0]?.component === "child_agent_receipt_contract"
            && plan.actions?.[0]?.priority === "critical",
        carriesCandidateReinjectionAction: plan.actions?.some((action) => action.component === "post_compact_reinject" && String(action.expected || "").includes("src/lost-context.ts")),
        emitsChildAgentPromptPatch: String(plan.promptPatch || "").includes("memoryUsed/memoryIgnored")
            && String(plan.promptPatch || "").includes("src/lost-context.ts"),
        keepsRawRecoveryPointers: String(plan.rawRecovery?.groupMemoryFile || "").endsWith(`${groupId}.json`)
            && String(plan.rawRecovery?.groupMessagesFile || "").endsWith(`${groupId}.json`),
    };
    return { pass: Object.values(checks).every(Boolean), checks, plan };
}
function runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest() {
    const groupId = `memory-center-replay-repair-ledger-selftest-${process.pid}-${Date.now()}`;
    const ledgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    try {
        const memory = {
            groupId,
            goal: "验证 replay repair ledger 能记录 attempt history",
            compaction: { summaryChecksum: "repair-ledger-summary", compactedMessageCount: 8 },
            compactBoundary: { summarizedThroughMessageId: "ledger-m8", summaryChecksum: "repair-ledger-summary" },
        };
        const plan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
            status: "fail",
            score: 50,
            targetProject: "api",
            renderedHash: "repair-ledger-fail",
            boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
            gaps: [
                { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", reason: "回执契约缺失" },
                { type: "file", label: "lost_file", value: "src/lost-ledger.ts", reason: "候选文件缺失" },
            ],
            candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-ledger.ts" }],
        });
        const failReplay = {
            schema: "ccm-compact-boundary-replay-gate-v1",
            groupId,
            targetProject: "api",
            status: "fail",
            score: 50,
            renderedHash: "repair-ledger-fail",
            renderedChars: 1200,
            checked: 4,
            passed: 2,
            candidateCount: 1,
            boundary: plan.boundary,
            gaps: [{ type: "receipt_contract" }, { type: "file" }],
            repairPlan: plan,
        };
        const first = (0, memory_control_center_1.recordCompactBoundaryReplayRepairAttempt)(groupId, failReplay, { at: "2026-07-07T05:00:00.000Z" });
        const duplicate = (0, memory_control_center_1.recordCompactBoundaryReplayRepairAttempt)(groupId, failReplay, { at: "2026-07-07T05:00:01.000Z" });
        const okReplay = {
            ...failReplay,
            status: "ok",
            score: 100,
            renderedHash: "repair-ledger-ok",
            checked: 4,
            passed: 4,
            gaps: [],
            repairPlan: (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
                status: "ok",
                score: 100,
                targetProject: "api",
                renderedHash: "repair-ledger-ok",
                boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
                gaps: [],
                candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-ledger.ts" }],
            }),
        };
        const resolved = (0, memory_control_center_1.recordCompactBoundaryReplayRepairAttempt)(groupId, okReplay, { at: "2026-07-07T05:00:02.000Z" });
        const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairLedger)(groupId);
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    group_state: { goal: memory.goal, currentPhase: "test" },
                    memory_policy: { use: "must_consider" },
                    compaction: { replayRepairLedger: resolved },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const checks = {
            firstAttemptCreatesLedger: first.schema === "ccm-compact-boundary-replay-repair-ledger-summary-v1"
                && first.attemptCount === 1
                && first.openActionCount === 2,
            duplicateDoesNotCreateSecondAttempt: duplicate.attemptCount === 1
                && duplicate.recentAttempts?.[0]?.seen_count === 2,
            resolvedAttemptAppendsHistory: resolved.attemptCount === 2
                && resolved.latestStatus === "ok"
                && resolved.openActionCount === 0
                && resolved.recentAttempts?.some((attempt) => attempt.status === "fail" && attempt.required_action_count === 2),
            ledgerPersistsSidecar: fs.existsSync(ledgerFile)
                && ledger.entries?.length === 2
                && ledger.stats?.latestStatus === "ok",
            childAgentRendererMentionsAttemptLedger: rendered.includes("Replay Gate attempt ledger")
                && rendered.includes("attempts=2")
                && rendered.includes("openActions=0"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, ledger: resolved };
    }
    finally {
        for (const file of [ledgerFile, `${ledgerFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterReplayRepairPendingWorkItemsSelfTest() {
    const groupId = `memory-center-replay-repair-work-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const repairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    try {
        const memory = {
            groupId,
            goal: "验证 replay repair pending work items 能被主 Agent 读取",
            compaction: { summaryChecksum: "repair-work-summary", compactedMessageCount: 8 },
            compactBoundary: { summarizedThroughMessageId: "work-m8", summaryChecksum: "repair-work-summary" },
        };
        const failPlan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
            status: "fail",
            score: 50,
            targetProject: "api",
            renderedHash: "repair-work-fail",
            boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
            gaps: [
                { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", reason: "回执契约缺失" },
                { type: "file", label: "lost_file", value: "src/lost-work.ts", reason: "候选文件缺失" },
            ],
            candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-work.ts" }],
        });
        const failReplay = {
            schema: "ccm-compact-boundary-replay-gate-v1",
            groupId,
            targetProject: "api",
            status: "fail",
            score: 50,
            renderedHash: "repair-work-fail",
            renderedChars: 1200,
            checked: 4,
            passed: 2,
            candidateCount: 1,
            boundary: failPlan.boundary,
            gaps: [{ type: "receipt_contract" }, { type: "file" }],
            repairPlan: failPlan,
            repairLedger: { latestAttemptId: "replay-attempt:repair-work-fail" },
        };
        const first = (0, memory_control_center_1.syncCompactBoundaryReplayRepairPendingWorkItems)(groupId, failReplay, { at: "2026-07-07T08:00:00.000Z" });
        const duplicate = (0, memory_control_center_1.syncCompactBoundaryReplayRepairPendingWorkItems)(groupId, failReplay, { at: "2026-07-07T08:00:01.000Z" });
        const report = (0, memory_control_center_1.buildReplayRepairPendingWorkItemReport)({ groupIds: [groupId], replays: [failReplay], generatedAt: "2026-07-07T08:00:02.000Z" });
        const check = (0, memory_control_center_1.evaluateReplayRepairPendingWorkItems)({ groupIds: [groupId], replays: [failReplay], generatedAt: "2026-07-07T08:00:03.000Z" });
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: memory.goal, currentPhase: "test" },
                    compaction: { replayRepairWorkItems: first },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const okPlan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
            status: "ok",
            score: 100,
            targetProject: "api",
            renderedHash: "repair-work-ok",
            boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
            gaps: [],
            candidates: [{ candidate_id: "lost_file", kind: "file", value: "src/lost-work.ts" }],
        });
        const resolved = (0, memory_control_center_1.syncCompactBoundaryReplayRepairPendingWorkItems)(groupId, {
            ...failReplay,
            status: "ok",
            score: 100,
            renderedHash: "repair-work-ok",
            checked: 4,
            passed: 4,
            gaps: [],
            repairPlan: okPlan,
            repairLedger: { latestAttemptId: "replay-attempt:repair-work-ok" },
        }, { at: "2026-07-07T08:00:04.000Z" });
        const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const checks = {
            firstMaterializesOpenItems: first.schema === "ccm-compact-boundary-replay-repair-work-items-summary-v1"
                && first.openItemCount === 2
                && first.pendingCount === 2
                && first.items?.some((item) => item.priority === "critical"),
            duplicateDoesNotAppend: duplicate.total === 2
                && duplicate.openItemCount === 2
                && (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId).items.length === 2,
            reportCoversRequiredActions: report.schema === "ccm-replay-repair-pending-work-item-report-v1"
                && report.overall?.status === "ok"
                && report.overall?.coverageRate === 100
                && report.overall?.requiredActionCount === 2,
            qualityCheckPassesWorkItems: check.id === "replay_repair_pending_work_items"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            childAgentRendererMentionsPendingWork: rendered.includes("Replay Repair pending work")
                && rendered.includes("open=2")
                && rendered.includes("group-main-agent"),
            resolvedReplayClosesOpenItems: resolved.openItemCount === 0
                && resolved.completedCount === 2
                && ledger.items?.every((item) => item.status === "completed"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, first, resolved };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterReplayRepairWorkItemClaimSelfTest() {
    const groupId = `memory-center-replay-repair-claim-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const repairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    try {
        const memory = {
            groupId,
            goal: "验证 replay repair work item claim/dispatch 状态机",
            compaction: { summaryChecksum: "repair-claim-summary", compactedMessageCount: 8 },
            compactBoundary: { summarizedThroughMessageId: "claim-m8", summaryChecksum: "repair-claim-summary" },
        };
        const plan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
            status: "fail",
            score: 50,
            targetProject: "api",
            renderedHash: "repair-claim-fail",
            boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
            gaps: [
                { type: "receipt_contract", label: "memoryUsed/memoryIgnored", value: "memoryUsed/memoryIgnored", reason: "回执契约缺失" },
            ],
            candidates: [],
        });
        const failReplay = {
            schema: "ccm-compact-boundary-replay-gate-v1",
            groupId,
            targetProject: "api",
            status: "fail",
            score: 50,
            renderedHash: "repair-claim-fail",
            checked: 2,
            passed: 1,
            boundary: plan.boundary,
            gaps: [{ type: "receipt_contract" }],
            repairPlan: plan,
            repairLedger: { latestAttemptId: "replay-attempt:repair-claim-fail" },
        };
        const synced = (0, memory_control_center_1.syncCompactBoundaryReplayRepairPendingWorkItems)(groupId, failReplay, { at: "2026-07-07T09:00:00.000Z" });
        const itemId = synced.items?.[0]?.id;
        const claim = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "claim",
            owner: "group-main-agent",
            reason: "主 Agent 认领 replay 修复",
            at: "2026-07-07T09:00:01.000Z",
        });
        let alreadyClaimed = "";
        try {
            (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
                groupId,
                itemId,
                action: "claim",
                owner: "other-agent",
                at: "2026-07-07T09:00:02.000Z",
            });
        }
        catch (error) {
            alreadyClaimed = error?.message || String(error);
        }
        const dispatch = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "dispatch",
            owner: "group-main-agent",
            dispatchTarget: "api",
            reason: "主 Agent 标记准备派发给 api",
            at: "2026-07-07T09:00:03.000Z",
        });
        const blocked = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "block",
            owner: "group-main-agent",
            reason: "等待 typed MEMORY.md 回溯",
            at: "2026-07-07T09:00:04.000Z",
        });
        const completed = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "complete",
            owner: "group-main-agent",
            reason: "已补齐回执契约并等待 replay 验证",
            at: "2026-07-07T09:00:05.000Z",
        });
        const reopened = (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "reopen",
            owner: "group-main-agent",
            reason: "replay 仍失败，重开修复项",
            at: "2026-07-07T09:00:06.000Z",
        });
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: memory.goal, currentPhase: "test" },
                    compaction: { replayRepairWorkItems: reopened.workItems },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const ledger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const item = ledger.items?.find((entry) => entry.id === itemId) || {};
        const checks = {
            claimMovesToInProgress: claim.item?.status === "in_progress"
                && claim.item?.owner === "group-main-agent"
                && !!claim.item?.startedAt,
            alreadyClaimedGuard: alreadyClaimed.includes("已由 group-main-agent 认领"),
            dispatchKeepsInProgressAndRecordsTarget: dispatch.item?.status === "in_progress"
                && dispatch.item?.dispatch_target === "api",
            blockRecordsReason: blocked.item?.status === "blocked"
                && String(blocked.item?.blockedReason || "").includes("typed MEMORY"),
            completeClosesItem: completed.item?.status === "completed"
                && completed.workItems.completedCount === 1
                && completed.workItems.openItemCount === 0,
            reopenReturnsPending: reopened.item?.status === "pending"
                && reopened.workItems.openItemCount === 1
                && Number(reopened.item?.attempt || 0) >= 2,
            historyPersistsStateTransitions: Array.isArray(item.history)
                && ["claim", "dispatch", "block", "complete", "reopen"].every(action => item.history.some((entry) => entry.action === action)),
            childAgentRendererSeesReopenedWork: rendered.includes("Replay Repair pending work")
                && rendered.includes("open=1")
                && rendered.includes("group-main-agent"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, item };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterReplayRepairDispatchCandidateSelfTest() {
    const groupId = `memory-center-replay-repair-dispatch-candidate-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const repairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    try {
        const memory = {
            groupId,
            goal: "验证 replay repair work item 能进入主 Agent 派发候选上下文",
            compaction: { summaryChecksum: "repair-dispatch-summary", compactedMessageCount: 8 },
            compactBoundary: { summarizedThroughMessageId: "dispatch-m8", summaryChecksum: "repair-dispatch-summary" },
        };
        const plan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, memory, {
            status: "fail",
            score: 42,
            targetProject: "api",
            renderedHash: "repair-dispatch-fail",
            boundary: (0, memory_control_center_1.compactMemoryHasPostCompactBoundary)(memory),
            gaps: [
                { type: "file", label: "src/lost-memory.ts", value: "src/lost-memory.ts", reason: "压缩后文件候选未进入子 Agent 记忆包" },
            ],
            candidates: [{ candidate_id: "lost-memory-file", kind: "file", value: "src/lost-memory.ts" }],
        });
        const failReplay = {
            schema: "ccm-compact-boundary-replay-gate-v1",
            groupId,
            targetProject: "api",
            status: "fail",
            score: 42,
            renderedHash: "repair-dispatch-fail",
            checked: 3,
            passed: 1,
            candidateCount: 1,
            boundary: plan.boundary,
            gaps: [{ type: "file" }],
            repairPlan: plan,
            repairLedger: { latestAttemptId: "replay-attempt:repair-dispatch-fail" },
        };
        const synced = (0, memory_control_center_1.syncCompactBoundaryReplayRepairPendingWorkItems)(groupId, failReplay, { at: "2026-07-07T10:00:00.000Z" });
        const itemId = synced.items?.[0]?.id || synced.items?.[0]?.work_item_id;
        (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "claim",
            owner: "group-main-agent",
            reason: "主 Agent 认领 replay dispatch candidate",
            at: "2026-07-07T10:00:01.000Z",
        });
        (0, memory_control_center_1.updateCompactBoundaryReplayRepairWorkItem)({
            groupId,
            itemId,
            action: "dispatch",
            owner: "group-main-agent",
            dispatchTarget: "api",
            reason: "主 Agent 准备把 replay 修复派发给 api",
            at: "2026-07-07T10:00:02.000Z",
        });
        const candidates = (0, memory_control_center_1.buildReplayRepairMainAgentDispatchCandidates)(groupId);
        const candidate = candidates.candidates?.[0] || {};
        const report = (0, memory_control_center_1.buildReplayRepairDispatchCandidateReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateReplayRepairDispatchCandidates)({ groupIds: [groupId] });
        const rendered = (() => {
            try {
                const { renderGroupMemoryContextBundle } = require("../collaboration/memory");
                return renderGroupMemoryContextBundle({
                    schema: "ccm-group-memory-context-v1",
                    target_project: "api",
                    memory_policy: { use: "must_consider" },
                    group_state: { goal: memory.goal, currentPhase: "test" },
                    compaction: {
                        replayRepairWorkItems: (0, memory_control_center_1.summarizeReplayRepairPendingWorkItems)(groupId),
                        replayRepairDispatchCandidates: candidates,
                    },
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const coordinatorPrompt = (() => {
            try {
                const { buildCoordinatorPrompt } = require("../collaboration/group-orchestrator");
                return buildCoordinatorPrompt({
                    group: {
                        id: groupId,
                        members: [
                            { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
                            { project: "api", agent: "claude-code" },
                        ],
                    },
                    context: "用户要求继续修复记忆 replay 缺口",
                    message: "继续处理记忆 replay 修复候选",
                });
            }
            catch (error) {
                return String(error?.message || error);
            }
        })();
        const checks = {
            candidateSummaryIncludesDispatchItem: candidates.schema === "ccm-replay-repair-main-agent-dispatch-candidates-v1"
                && candidates.candidateCount === 1
                && candidates.dispatchMarkedCount === 1
                && candidate.dispatch_target === "api"
                && candidate.shouldCreateRealTask === false,
            candidateCarriesRepairPayload: String(candidate.prompt_patch || "").includes("Replay")
                && !!candidate.raw_recovery?.rule
                && String(candidate.expected || "").includes("src/lost-memory.ts"),
            qualityCheckCoversCandidate: report.overall?.status === "ok"
                && report.overall?.candidateCount === 1
                && check.id === "replay_repair_dispatch_candidates"
                && Number(check.passed || 0) === 1,
            childAgentRendererMentionsDispatchCandidate: rendered.includes("Main Agent replay repair dispatch candidates")
                && rendered.includes("shouldCreateRealTask=false")
                && rendered.includes("api"),
            coordinatorPromptReceivesCandidate: coordinatorPrompt.includes("群聊记忆 Replay 修复派发候选")
                && coordinatorPrompt.includes("shouldCreateRealTask=false")
                && coordinatorPrompt.includes("main_agent_review_and_dispatch_to_child_agent"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, candidates };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterGroupSessionMemorySnapshotSelfTest() {
    const groupId = `memory-center-session-memory-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const snapshotFile = (0, memory_control_center_1.getGroupSessionMemorySnapshotFile)(groupId);
    const summaryFile = (0, memory_control_center_1.getGroupSessionMemoryMarkdownFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages, } = require("../collaboration/storage");
        const { buildGroupContextPacket, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle, loadGroupMemory, saveGroupMemory, readGroupSessionMemorySnapshotSummary, } = require("../collaboration/memory");
        const messages = Array.from({ length: 80 }, (_, index) => ({
            id: `gsm-${index}`,
            role: index % 2 === 0 ? "user" : "assistant",
            target: index % 2 === 0 ? "coordinator" : undefined,
            agent: index % 2 === 1 ? "api" : undefined,
            timestamp: `2026-07-07T11:${String(index).padStart(2, "0")}:00.000Z`,
            content: index === 0
                ? "必须保留 GROUP_SESSION_MEMORY_SENTINEL，所有子 Agent 新会话都要收到群聊会话摘要。"
                : `Session Memory 自测消息 ${index}，涉及 src/session-memory-${index}.ts，需要压缩后仍可恢复。${"上下文证据".repeat(12)}`,
        }));
        saveGroupMessages(groupId, messages);
        const context = buildGroupContextPacket(groupId, { recentLimit: 4, olderLimit: 8, fullCount: 2 });
        let memory = loadGroupMemory(groupId);
        memory = saveGroupMemory(groupId, {
            ...memory,
            messageDigest: "GROUP_SESSION_MEMORY_SENTINEL：所有子 Agent 新会话都要收到当前群聊会话摘要。",
            persistentRequirements: [
                ...(Array.isArray(memory.persistentRequirements) ? memory.persistentRequirements : []),
                "必须保留 GROUP_SESSION_MEMORY_SENTINEL，并限制在当前群聊会话及其项目子 Agent 上下文中。",
            ],
        });
        const snapshot = readGroupSessionMemorySnapshotSummary(groupId);
        const markdown = fs.readFileSync(summaryFile, "utf-8");
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续处理 GROUP_SESSION_MEMORY_SENTINEL");
        const childRendered = renderGroupMemoryContextBundle(childBundle);
        const { buildAgenticContext } = require("../global/global-agent");
        const globalContext = buildAgenticContext("GROUP_SESSION_MEMORY_SENTINEL", "", {
            groups: [{ id: groupId, name: "Session Memory Selftest", members: [{ project: "api", agent: "claude-code" }] }],
            recordDelivery: false,
        });
        const globalRendered = JSON.stringify(globalContext);
        const report = (0, memory_control_center_1.buildGroupSessionMemorySnapshotReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateGroupSessionMemorySnapshots)({ groupIds: [groupId] });
        const checks = {
            contextDefersAutomaticSessionMemoryBelowInitializationThreshold: !context.includes("CC 风格 Session Memory")
                && Number(memory.sessionMemory?.updateCadence?.currentContextTokens || 0) < 10_000,
            memoryCarriesSessionSnapshot: memory.sessionMemory?.schema === "ccm-group-session-memory-snapshot-v1"
                && memory.sessionMemory?.summaryFile === summaryFile,
            sidecarFilesExist: fs.existsSync(snapshotFile)
                && fs.existsSync(summaryFile),
            markdownPreservesSentinel: markdown.includes("GROUP_SESSION_MEMORY_SENTINEL")
                && markdown.includes("CCM Group Session Memory"),
            checksumMatches: snapshot.markdownChecksumMatches === true
                && snapshot.markdownExists === true,
            childAgentContextSeesSessionMemory: childRendered.includes("CC 风格 Session Memory")
                && childRendered.includes("GROUP_SESSION_MEMORY_SENTINEL"),
            globalAgentExcludesGroupSessionMemory: !globalRendered.includes("GROUP_SESSION_MEMORY_SENTINEL")
                && !Object.prototype.hasOwnProperty.call(globalContext, "group_memory_context")
                && globalContext.memory_context_boundary?.policy === "global_memory_only_group_session_content_excluded"
                && globalContext.memory_context_boundary?.group_session_context_included === false,
            qualityCheckCoversSnapshot: report.overall?.status === "ok"
                && check.id === "group_session_memory_snapshot"
                && Number(check.passed || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, snapshot, report, qualityCheck: check };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [path.dirname(snapshotFile), typedDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterGroupToolContinuitySnapshotSelfTest() {
    const groupId = `memory-center-tool-continuity-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const snapshotFile = (0, memory_control_center_1.getGroupToolContinuitySnapshotFile)(groupId);
    const summaryFile = (0, memory_control_center_1.getGroupToolContinuityMarkdownFile)(groupId);
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.dirname(snapshotFile);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMemory, loadGroupMemory, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle, buildGlobalGroupMemoryContext, renderGlobalGroupMemoryContextBundle, readGroupToolContinuitySnapshotSummary, } = require("../collaboration/memory");
        const memory = saveGroupMemory(groupId, {
            groupId,
            goal: "验证工具/技能连续性快照能像 Claude Code 一样跨压缩保留 discovered tools 与 invoked skills",
            currentPhase: "tool-continuity-selftest",
            messageDigest: "TOOL_CONTINUITY_SENTINEL：payments/createInvoice 和 release-notes Skill 必须作为上下文传给新的子 Agent 会话。",
            tools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
            workerLedger: [{
                    time: "2026-07-07T12:00:00.000Z",
                    taskId: "tool-continuity-task",
                    project: "api",
                    status: "completed",
                    summary: "已使用 payments/createInvoice 并调用 release-notes Skill。",
                    runtimeToolSnapshot: {
                        snapshotId: "tool-continuity-snapshot",
                        snapshotPath: "C:/tmp/tool-continuity-snapshot.json",
                        mcpConfigPath: "C:/tmp/mcp.json",
                        allowedTools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
                        dispatchGate: { dispatch_gate_id: "tool-continuity-gate", dispatchReady: true, blockers: [] },
                    },
                    runtimeToolSync: {
                        runtime: "claude-code",
                        mode: "ready",
                        requested: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
                        synced: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
                        missing: { mcp: ["payments/refund"], skill: ["legacy-skill"] },
                        mcp_statuses: [{ name: "payments", state: "connected", availableTools: ["createInvoice"] }],
                        skill_statuses: [{ name: "release-notes", state: "available", contentHash: "abc123" }],
                        permission_rules: [{ rule: "allow", value: "payments/createInvoice" }],
                        invoked_skills: [{ name: "release-notes", contentHash: "abc123" }],
                        dispatch_gate: { dispatch_gate_id: "tool-continuity-gate", dispatchReady: true, blockers: [] },
                        timestamp: "2026-07-07T12:00:00.000Z",
                    },
                    invokedSkills: [{ name: "release-notes", contentHash: "abc123" }],
                }],
        });
        const snapshot = readGroupToolContinuitySnapshotSummary(groupId);
        const markdown = fs.readFileSync(summaryFile, "utf-8");
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续处理 TOOL_CONTINUITY_SENTINEL，需要发票工具和 release notes 技能");
        const childRendered = renderGroupMemoryContextBundle(childBundle);
        const globalBundle = buildGlobalGroupMemoryContext("TOOL_CONTINUITY_SENTINEL", {
            groups: [{ id: groupId, name: "Tool Continuity Selftest", members: [{ project: "api", agent: "claude-code" }] }],
            disableLedger: true,
            maxGroups: 1,
        });
        const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
        const report = (0, memory_control_center_1.buildGroupToolContinuitySnapshotReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateGroupToolContinuitySnapshots)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const continuity = detail.postCompactUsage?.toolContinuity || {};
        const checks = {
            memoryCarriesToolContinuitySnapshot: memory.toolContinuity?.schema === "ccm-group-tool-continuity-snapshot-v1"
                && memory.toolContinuity?.summaryFile === summaryFile,
            sidecarFilesExist: fs.existsSync(snapshotFile)
                && fs.existsSync(summaryFile),
            snapshotPreservesAllowedTools: (snapshot.allowedTools?.mcp || []).includes("payments/createInvoice")
                && (snapshot.allowedTools?.skill || []).includes("release-notes"),
            snapshotPreservesRuntimeEvidence: (snapshot.synced?.mcp || []).includes("payments/createInvoice")
                && (snapshot.missing?.mcp || []).includes("payments/refund")
                && (snapshot.invokedSkills || []).some((item) => item.name === "release-notes" && item.contentHash === "abc123"),
            markdownStatesContextOnlyPolicy: markdown.includes("never bypasses CCM runtime authorization")
                && markdown.includes("TOOL_CONTINUITY") === false
                && snapshot.shouldBypassAuthorization === false
                && snapshot.shouldReuseAsContext === true,
            childAgentContextSeesToolContinuity: childRendered.includes("CC 风格工具/技能连续性")
                && childRendered.includes("payments/createInvoice")
                && childRendered.includes("release-notes")
                && childRendered.includes("不扩大授权"),
            globalAgentContextSeesToolContinuity: globalRendered.includes("CC 风格工具/技能连续性")
                && globalRendered.includes("不扩大授权"),
            memoryCenterExposesToolContinuity: continuity.schema === "ccm-group-tool-continuity-snapshot-v1"
                && (continuity.allowedTools?.mcp || []).includes("payments/createInvoice"),
            qualityCheckCoversToolContinuity: report.overall?.status === "ok"
                && check.id === "group_tool_continuity_snapshot"
                && Number(check.passed || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, snapshot };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [sessionDir, toolDir, typedDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterTaskAgentMemoryContextSnapshotSelfTest() {
    const groupId = `memory-center-task-agent-snapshot-selftest-${process.pid}-${Date.now()}`;
    const groupSessionId = `gcs_${Date.now().toString(36)}_memory_center_snapshot`;
    const taskId = `memory-center-task-agent-snapshot-task-${process.pid}-${Date.now()}`;
    let messageFile = "";
    try {
        const { openTaskAgentSession, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentMemoryContextSnapshot, buildTaskAgentMemoryContextSnapshotInventory, pruneTaskAgentMemoryContextSnapshots, recordTaskAgentMemoryContextDelivery, } = require("../../tasks/agent-sessions");
        const { saveGroupMemory, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle } = require("../collaboration/memory");
        const { saveGroupMessages, getGroupChatSessionMessagesFile } = require("../collaboration/storage");
        const { buildGroupCompactTransactionReceipt } = require("../collaboration/group-memory-compaction");
        const { commitGroupCompactHead } = require("../collaboration/group-compact-head");
        const compactCreatedAt = new Date().toISOString();
        const messageDigest = "TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SENTINEL：每次第三方子 Agent 会话都必须绑定群聊记忆快照。";
        const summaryChecksum = (0, memory_control_center_1.hash)(messageDigest, 24);
        messageFile = getGroupChatSessionMessagesFile(groupId, groupSessionId);
        saveGroupMessages(groupId, [
            { id: "memory-center-snapshot-message-1", role: "user", content: "请给项目子 Agent 注入当前群聊会话记忆。", timestamp: compactCreatedAt },
            { id: "memory-center-snapshot-message-2", role: "assistant", agent: "coordinator", content: messageDigest, timestamp: compactCreatedAt },
            { id: "memory-center-snapshot-message-3", role: "user", content: "继续验证压缩后的记忆送达。", timestamp: compactCreatedAt },
        ], groupSessionId);
        const compactBoundary = {
            id: `compact-${Date.now().toString(36)}-memory-center-snapshot`,
            type: "selftest",
            summarizedFromMessageId: "memory-center-snapshot-message-1",
            summarizedThroughMessageId: "memory-center-snapshot-message-2",
            summarizedMessageCount: 2,
            preservedSegment: {
                schema: "ccm-group-preserved-segment-v1",
                version: 1,
                summarizedThroughMessageId: "memory-center-snapshot-message-2",
                firstPreservedMessageId: "memory-center-snapshot-message-3",
                lastPreservedMessageId: "memory-center-snapshot-message-3",
                preservedMessageCount: 1,
                preservedMessageIds: ["memory-center-snapshot-message-3"],
            },
            post_compact_restore: {
                summaryChecksum,
                transcriptPath: "memory-center-task-agent-snapshot-transcript.json",
                recoveryAudit: { pass: true },
                cleanupAudit: { pass: true, audit_checksum: (0, memory_control_center_1.hash)(`${groupId}\0${groupSessionId}\0memory-center-task-agent-snapshot-cleanup`, 32) },
            },
            createdAt: compactCreatedAt,
        };
        const compactTransactionReceipt = buildGroupCompactTransactionReceipt({
            groupId,
            groupSessionId,
            boundary: compactBoundary,
            summaryChecksum,
            hookRunId: "memory-center-task-agent-snapshot-hook",
            transcriptPath: "memory-center-task-agent-snapshot-transcript.json",
            createdAt: compactCreatedAt,
        });
        saveGroupMemory(groupId, {
            groupId,
            groupSessionId,
            goal: "验证 Memory Center 能治理项目子 Agent 记忆上下文快照",
            messageDigest,
            compactBoundary: { ...compactBoundary, compactTransactionReceipt },
            compaction: {
                health: "healthy",
                compactedMessageCount: 2,
                lastCompactedMessageId: "memory-center-snapshot-message-2",
                summaryChecksum,
                compactTransactionReceipt,
            },
        }, groupSessionId);
        const compactHeadCommit = commitGroupCompactHead({ groupId, groupSessionId, compactTransactionReceipt });
        const session = openTaskAgentSession({
            scopeId: taskId,
            taskId,
            groupId,
            project: "api",
            agentType: "codex",
        });
        const memoryContext = buildAgentMemoryContextBundle(groupId, "api", "验证项目子 Agent 记忆送达", {
            groupSessionId,
            taskId,
            taskAgentSessionId: session.id,
            nativeSessionId: "codex-native-memory-center-snapshot",
            agentType: "codex",
        });
        const renderedPrompt = `prompt contains TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SENTINEL memory packet\n${renderGroupMemoryContextBundle(memoryContext)}`;
        const workerContextPacket = {
            packet_id: "wcp_memory_center_task_agent_snapshot",
            group_session_id: groupSessionId,
            task_id: taskId,
            memory: memoryContext,
        };
        const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
            taskId,
            groupId,
            project: "api",
            agentType: "codex",
            nativeSessionId: "codex-native-memory-center-snapshot",
            turn: 1,
            executionId: "exec-memory-center-task-agent-snapshot",
            traceId: "trace-memory-center-task-agent-snapshot",
            workerContextPacket,
            memoryContext,
            renderedPrompt,
        });
        const { buildFinalWorkerDispatchPayloadGate } = require("../../agents/final-dispatch-payload-gate");
        const finalDispatchPayloadGate = buildFinalWorkerDispatchPayloadGate({
            renderedPrompt,
            workerContextPacket,
            provider: "codex",
            model: "phase315-memory-center-selftest",
            groupId,
            groupSessionId,
            taskId,
            taskAgentSessionId: session.id,
        });
        const finalGateBinding = attachTaskAgentFinalDispatchPayloadGate(session.id, {
            snapshotId: bound.snapshot.snapshot_id,
            finalDispatchPayloadGate,
            renderedPrompt,
        });
        if (finalGateBinding.updated) {
            bound.snapshot = finalGateBinding.snapshot;
            bound.session = finalGateBinding.session;
        }
        const delivery = recordTaskAgentMemoryContextDelivery(session.id, {
            snapshotId: bound.snapshot.snapshot_id,
            renderedPrompt,
            snapshotRenderedPrompt: renderedPrompt,
            executionId: "exec-memory-center-task-agent-snapshot",
            traceId: "trace-memory-center-task-agent-snapshot",
            runtime: "codex",
            nativeSessionId: "codex-native-memory-center-snapshot",
            dispatched: true,
            executionSucceeded: true,
            output: "TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SENTINEL delivered",
        });
        const inventory = buildTaskAgentMemoryContextSnapshotInventory({ groupId });
        const report = (0, memory_control_center_1.buildTaskAgentMemoryContextSnapshotReport)({ groupId });
        const check = (0, memory_control_center_1.evaluateTaskAgentMemoryContextSnapshots)({ groupId });
        const groupOverview = (0, memory_control_center_1.buildGroupTaskAgentMemoryContextSnapshotOverview)(groupId);
        const retention = pruneTaskAgentMemoryContextSnapshots({ groupId, dryRun: true });
        const checks = {
            snapshotBoundToSession: !!bound?.session?.memoryContextSnapshotId
                && bound.session.memoryContextSnapshotId === bound.snapshot.snapshot_id
                && fs.existsSync(bound.snapshot.snapshot_file),
            inventoryFindsSnapshot: inventory.schema === "ccm-task-agent-memory-context-snapshot-inventory-v1"
                && inventory.summary?.snapshotCount === 1
                && inventory.rows?.[0]?.workerContextPacketId === "wcp_memory_center_task_agent_snapshot"
                && inventory.rows?.[0]?.groupSessionId === groupSessionId
                && inventory.rows?.[0]?.finalDispatchStatus === "ready"
                && inventory.rows?.[0]?.finalDispatchPayloadGateValid === true
                && inventory.rows?.[0]?.finalDispatchPromptBound === true
                && inventory.summary?.finalDispatchGateReadyCount === 1
                && inventory.summary?.finalDispatchGateMissingCount === 0
                && inventory.rows?.[0]?.memoryContextDelivered === true
                && delivery?.receipt?.status === "delivered"
                && delivery?.receipt?.compactHeadGeneration === compactHeadCommit.head.generation
                && delivery?.receipt?.compactHeadFenceValid === true
                && delivery?.receipt?.sessionLifecycleGeneration === 1
                && delivery?.receipt?.sessionLifecycleFenceValid === true,
            reportScoresSnapshotOk: report.schema === "ccm-task-agent-memory-context-snapshot-quality-report-v1"
                && report.overall?.status === "ok"
                && Number(report.overall?.passed || 0) === 1,
            qualityCheckCoversSnapshot: check.id === "task_agent_memory_context_snapshots"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            groupOverviewExposesSnapshot: groupOverview?.schema === "ccm-group-task-agent-memory-context-snapshot-overview-v1"
                && groupOverview.status === "ok"
                && groupOverview.finalDispatchGateReadyCount === 1
                && groupOverview.finalDispatchPromptBoundCount === 1
                && groupOverview.rows?.some((row) => row.snapshotId === bound.snapshot.snapshot_id),
            retentionDryRunIsSafe: retention.schema === "ccm-task-agent-memory-context-snapshot-retention-result-v1"
                && retention.dryRun === true
                && retention.candidateCount === 0
                && fs.existsSync(bound.snapshot.snapshot_file),
        };
        return { pass: Object.values(checks).every(Boolean), checks, inventory, report };
    }
    finally {
        try {
            const { purgeTaskAgentSessions } = require("../../tasks/agent-sessions");
            purgeTaskAgentSessions(taskId);
        }
        catch { }
        try {
            const { deleteGroupSessionMemoryArtifacts } = require("../collaboration/memory");
            deleteGroupSessionMemoryArtifacts(groupId, groupSessionId);
        }
        catch { }
        for (const file of [messageFile, messageFile ? `${messageFile}.bak` : ""]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        try {
            const { getGroupSessionLifecycleHeadFile } = require("../collaboration/group-session-lifecycle-head");
            const lifecycleFile = getGroupSessionLifecycleHeadFile(groupId, groupSessionId);
            for (const file of [lifecycleFile, `${lifecycleFile}.bak`, `${lifecycleFile}.lock`]) {
                try {
                    if (fs.existsSync(file))
                        fs.unlinkSync(file);
                }
                catch { }
            }
        }
        catch { }
    }
}
function runMemoryCenterCompactFileReferenceSelfTest() {
    const groupId = `memory-center-compact-file-reference-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle, buildGlobalGroupMemoryContext, renderGlobalGroupMemoryContextBundle, buildGroupCompactFileReferences, summarizeGroupCompactFileReferenceAccess, } = require("../collaboration/memory");
        saveGroupMessages(groupId, [
            { id: "cfr-1", role: "user", target: "coordinator", timestamp: "2026-07-07T13:00:00.000Z", content: "必须保留 COMPACT_FILE_REFERENCE_SENTINEL，并让子 Agent 能按 raw messages 和 summary.md 回溯。" },
            { id: "cfr-2", role: "assistant", agent: "api", timestamp: "2026-07-07T13:01:00.000Z", content: "api 处理 src/compact-file-reference.ts，验证 npm run check passed。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact file references 能作为压缩后记忆文件引用恢复",
            messageDigest: "COMPACT_FILE_REFERENCE_SENTINEL：raw messages 和 Session Memory summary.md 是压缩后回溯来源。",
            persistentRequirements: [{ messageId: "cfr-1", text: "必须保留 COMPACT_FILE_REFERENCE_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-file-reference-summary",
                lastCompactedMessageId: "cfr-2",
            },
        });
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 COMPACT_FILE_REFERENCE_SENTINEL src/compact-file-reference.ts", {
            disableLedger: true,
            minKeepTokens: 1,
        });
        const rendered = renderGroupMemoryContextBundle(childBundle);
        const refs = childBundle.compact_file_references || buildGroupCompactFileReferences(groupId, childBundle);
        const access = summarizeGroupCompactFileReferenceAccess(groupId, refs, {
            groupId,
            workerLedger: [{
                    project: "api",
                    taskId: "compact-file-reference-task",
                    summary: `已读取 ${refs.references?.[0]?.reference_id || "compact-file-reference"} 并核对 raw messages。`,
                    memoryUsed: [refs.references?.[0]?.reference_id || ""],
                }],
        });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const report = (0, memory_control_center_1.buildCompactFileReferenceReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateCompactFileReferences)({ groupIds: [groupId] });
        const globalBundle = buildGlobalGroupMemoryContext("COMPACT_FILE_REFERENCE_SENTINEL", {
            groups: [{ id: groupId, name: "Compact File Reference Selftest", members: [{ project: "api", agent: "claude-code" }] }],
            disableLedger: true,
            maxGroups: 1,
        });
        const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
        const detailRefs = detail.postCompactUsage?.compactFileReferences || {};
        const checks = {
            childBundleBuildsReferences: refs.schema === "ccm-group-compact-file-references-v1"
                && Number(refs.referenceCount || 0) >= 3
                && (refs.references || []).some((item) => item.type === "raw_group_messages_json")
                && (refs.references || []).some((item) => item.type === "group_session_memory"),
            childRenderedMentionsReferences: rendered.includes("CC 风格 compact file references")
                && rendered.includes("reference_id=")
                && rendered.includes("raw_group_messages_json"),
            surfacingLedgerPersisted: fs.existsSync(ledgerFile)
                && JSON.stringify((0, memory_control_center_1.readJson)(ledgerFile, {})).includes("compact-file"),
            accessSummaryDetectsReferenceUse: access.schema === "ccm-group-compact-file-reference-access-summary-v1"
                && Number(access.mentioned_count || 0) >= 1,
            memoryCenterExposesReferences: detailRefs.schema === "ccm-group-compact-file-references-v1"
                && Number(detailRefs.referenceCount || 0) >= 3,
            globalAgentSeesReferences: globalRendered.includes("compact file references")
                && globalRendered.includes("raw messages"),
            qualityCheckCoversReferences: report.overall?.status === "ok"
                && check.id === "compact_file_references"
                && Number(check.passed || 0) === 1,
        };
        return { pass: Object.values(checks).every(Boolean), checks, refs: { referenceCount: refs.referenceCount, missingCount: refs.missingCount } };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactFileReferenceReadPlanSelfTest() {
    const groupId = `memory-center-compact-file-reference-read-plan-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle, buildGlobalGroupMemoryContext, renderGlobalGroupMemoryContextBundle, buildGroupCompactFileReferenceReadPlan, } = require("../collaboration/memory");
        saveGroupMessages(groupId, [
            { id: "cfrp-mc-1", role: "user", target: "coordinator", timestamp: "2026-07-07T15:30:00.000Z", content: "MEMORY_CENTER_READ_PLAN_SENTINEL：Memory Center 要展示 compact file reference read plan。" },
            { id: "cfrp-mc-2", role: "assistant", agent: "api", timestamp: "2026-07-07T15:31:00.000Z", content: "api 需要按 read_plan_id 声明读取或忽略。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 Memory Center 暴露 compact file reference read plan",
            messageDigest: "MEMORY_CENTER_READ_PLAN_SENTINEL：read plan 应进入子 Agent 记忆包、全局上下文和质量报告。",
            persistentRequirements: [{ messageId: "cfrp-mc-1", text: "Memory Center 必须展示 compact file reference read plan。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "memory-center-compact-reference-read-plan",
                lastCompactedMessageId: "cfrp-mc-2",
            },
        });
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 MEMORY_CENTER_READ_PLAN_SENTINEL src/read-plan.ts");
        const rendered = renderGroupMemoryContextBundle(childBundle);
        const refs = childBundle.compact_file_references || {};
        const readPlan = childBundle.compact_file_reference_read_plan || buildGroupCompactFileReferenceReadPlan(groupId, refs);
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailReadPlan = detail.postCompactUsage?.compactFileReferenceReadPlan || {};
        const report = (0, memory_control_center_1.buildCompactFileReferenceReadPlanReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlan)({ groupIds: [groupId] });
        const globalBundle = buildGlobalGroupMemoryContext("MEMORY_CENTER_READ_PLAN_SENTINEL", {
            groups: [{ id: groupId, name: "Compact Read Plan Selftest", members: [{ project: "api", agent: "claude-code" }] }],
            disableLedger: true,
            maxGroups: 1,
        });
        const globalRendered = renderGlobalGroupMemoryContextBundle(globalBundle);
        const entries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
        const checks = {
            childBundleBuildsReadPlan: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
                && Number(readPlan.plannedCount || 0) >= 3
                && entries.some((entry) => entry.type === "raw_group_messages_json")
                && entries.some((entry) => entry.type === "group_session_memory"),
            childRenderedMentionsReadPlan: rendered.includes("compact file reference read plan")
                && rendered.includes("read_plan_id=")
                && rendered.includes("memoryUsed/memoryIgnored"),
            memoryCenterExposesReadPlan: detailReadPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
                && Number(detailReadPlan.plannedCount || 0) >= 3,
            globalAgentSeesReadPlan: globalRendered.includes("compact file reference read plan")
                && globalRendered.includes("sourceOfTruth=true"),
            qualityCheckCoversReadPlan: report.overall?.status === "ok"
                && check.id === "compact_file_reference_read_plan"
                && Number(check.passed || 0) === 1,
            readPlanKeepsOnDemandPolicy: readPlan.policy?.doNotReadAll === true
                && readPlan.policy?.mode === "read_on_demand_after_compact",
        };
        return { pass: Object.values(checks).every(Boolean), checks, readPlan: { plannedCount: readPlan.plannedCount, hasSourceOfTruth: readPlan.hasSourceOfTruth, hasCompactSummary: readPlan.hasCompactSummary } };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest() {
    const groupId = `memory-center-compact-file-reference-read-plan-discipline-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, summarizeGroupCompactFileReferenceReadPlanAccess, } = require("../collaboration/memory");
        saveGroupMessages(groupId, [
            { id: "cfrpd-1", role: "user", target: "coordinator", timestamp: "2026-07-07T16:00:00.000Z", content: "READ_PLAN_DISCIPLINE_SENTINEL：子 Agent 回执必须声明 read_plan_id。" },
            { id: "cfrpd-2", role: "assistant", agent: "api", timestamp: "2026-07-07T16:01:00.000Z", content: "api 将按 read_plan_id 记录读取计划使用。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact read plan 下发后的 read_plan_id 回执纪律",
            messageDigest: "READ_PLAN_DISCIPLINE_SENTINEL：read plan 使用应可被 Memory Center 审计。",
            persistentRequirements: [{ messageId: "cfrpd-1", text: "子 Agent 回执必须声明 read_plan_id。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-discipline-summary",
                lastCompactedMessageId: "cfrpd-2",
            },
        });
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 READ_PLAN_DISCIPLINE_SENTINEL src/read-plan-discipline.ts");
        const readPlan = childBundle.compact_file_reference_read_plan || {};
        const entries = Array.isArray(readPlan.entries) ? readPlan.entries : [];
        const usedEntry = entries.find((entry) => entry.type === "raw_group_messages_json") || entries[0] || {};
        const unmentionedEntry = entries.find((entry) => entry.read_plan_id && entry.read_plan_id !== usedEntry.read_plan_id) || {};
        const memory = saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact read plan 下发后的 read_plan_id 回执纪律",
            messageDigest: "READ_PLAN_DISCIPLINE_SENTINEL：read plan 使用应可被 Memory Center 审计。",
            persistentRequirements: [{ messageId: "cfrpd-1", text: "子 Agent 回执必须声明 read_plan_id。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-discipline-summary",
                lastCompactedMessageId: "cfrpd-2",
            },
            workerLedger: [{
                    time: "2026-07-07T16:02:00.000Z",
                    taskId: "compact-read-plan-discipline-task",
                    project: "api",
                    status: "completed",
                    summary: `已按读取计划 ${usedEntry.read_plan_id || "cfr-read"} 核对原始来源。`,
                    memoryUsed: [`read_plan_id=${usedEntry.read_plan_id || ""}；reference_id=${usedEntry.reference_id || ""}；action=${usedEntry.action || ""}`],
                    memoryIgnored: [],
                }],
        });
        const access = summarizeGroupCompactFileReferenceReadPlanAccess(groupId, readPlan, memory);
        const report = (0, memory_control_center_1.buildCompactFileReferenceReadPlanUsageDisciplineReport)({ groupIds: [groupId] });
        const group = report.groups?.[0] || {};
        const check = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanUsageDiscipline)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailDiscipline = detail.postCompactUsage?.compactFileReferenceReadPlanDiscipline || {};
        const detailAccess = detail.postCompactUsage?.compactFileReferenceReadPlanAccess || {};
        const checks = {
            childBundleSurfacesReadPlan: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
                && Number(readPlan.plannedCount || 0) >= 3
                && !!usedEntry.read_plan_id
                && !!unmentionedEntry.read_plan_id,
            surfacingLedgerStoresReadPlan: fs.existsSync(ledgerFile)
                && JSON.stringify((0, memory_control_center_1.readJson)(ledgerFile, {})).includes("read_plan_entries"),
            accessSummaryFindsReadPlanId: access.schema === "ccm-group-compact-file-reference-read-plan-access-summary-v1"
                && (access.rows || []).some((row) => row.read_plan_id === usedEntry.read_plan_id && row.read_plan_id_mentioned === true),
            disciplineReportChecksSurfacedPlans: report.schema === "ccm-compact-file-reference-read-plan-usage-discipline-report-v1"
                && Number(group.checked || 0) >= 3
                && Number(group.passed || 0) >= 1,
            unmentionedPlansBecomeGaps: (group.gaps || []).some((gap) => gap.read_plan_id === unmentionedEntry.read_plan_id)
                && Number(group.missing || 0) >= 1,
            qualityCheckCoversReadPlanDiscipline: check.id === "compact_file_reference_read_plan_usage_discipline"
                && Number(check.checked || 0) === Number(group.checked || 0)
                && Number(check.passed || 0) === Number(group.passed || 0),
            memoryCenterDetailExposesReadPlanDiscipline: detailDiscipline.schema === "ccm-compact-file-reference-read-plan-usage-discipline-group-v1"
                && Number(detailDiscipline.checked || 0) === Number(group.checked || 0)
                && detailAccess.schema === "ccm-group-compact-file-reference-read-plan-access-summary-v1",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            discipline: {
                checked: group.checked,
                passed: group.passed,
                missing: group.missing,
                status: group.status,
                usedReadPlan: usedEntry.read_plan_id,
                unmentionedReadPlan: unmentionedEntry.read_plan_id,
            },
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest() {
    const groupId = `memory-center-compact-file-reference-read-plan-freshness-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, summarizeGroupCompactFileReferenceReadPlanFreshness, } = require("../collaboration/memory");
        const initialMessages = [
            { id: "cfrpf-1", role: "user", target: "coordinator", timestamp: "2026-07-07T16:30:00.000Z", content: "READ_PLAN_FRESHNESS_SENTINEL：read plan 下发后必须能发现 raw messages 是否变化。" },
            { id: "cfrpf-2", role: "assistant", agent: "api", timestamp: "2026-07-07T16:31:00.000Z", content: "api 将使用 raw messages 作为 source-of-truth。" },
        ];
        saveGroupMessages(groupId, initialMessages);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact read plan 源文件新鲜度",
            messageDigest: "READ_PLAN_FRESHNESS_SENTINEL：Memory Center 应检测历史 read plan 指向的源是否变化。",
            persistentRequirements: [{ messageId: "cfrpf-1", text: "read plan source freshness 必须可审计。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-freshness-summary",
                lastCompactedMessageId: "cfrpf-2",
            },
        });
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续 READ_PLAN_FRESHNESS_SENTINEL src/read-plan-freshness.ts");
        const readPlan = childBundle.compact_file_reference_read_plan || {};
        const rawEntry = (readPlan.entries || []).find((entry) => entry.type === "raw_group_messages_json") || {};
        fs.writeFileSync(messageFile, JSON.stringify([
            ...initialMessages,
            { id: "cfrpf-3", role: "assistant", agent: "api", timestamp: "2026-07-07T16:32:00.000Z", content: "raw messages changed after read plan surfacing。" },
        ], null, 2), "utf-8");
        const directFreshness = summarizeGroupCompactFileReferenceReadPlanFreshness(groupId, {
            ...readPlan,
            entries: [rawEntry],
            plannedCount: 1,
            sourceReferenceCount: 1,
        });
        const report = (0, memory_control_center_1.buildCompactFileReferenceReadPlanFreshnessReport)({ groupIds: [groupId] });
        const group = report.groups?.[0] || {};
        const check = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanFreshness)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailFreshness = detail.postCompactUsage?.compactFileReferenceReadPlanFreshness || {};
        const checks = {
            childBundleSurfacesFingerprintedReadPlan: readPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
                && !!rawEntry.read_plan_id
                && !!rawEntry.sourceChecksum
                && Number(rawEntry.sourceMtimeMs || 0) > 0,
            surfacingLedgerStoresSourceFingerprint: fs.existsSync(ledgerFile)
                && JSON.stringify((0, memory_control_center_1.readJson)(ledgerFile, {})).includes("sourceChecksum"),
            directFreshnessDetectsChangedRawMessages: directFreshness.schema === "ccm-group-compact-file-reference-read-plan-freshness-v1"
                && Number(directFreshness.changedCount || 0) >= 1
                && (directFreshness.staleRows || []).some((row) => row.read_plan_id === rawEntry.read_plan_id),
            memoryCenterReportUsesSurfacedSnapshot: report.schema === "ccm-compact-file-reference-read-plan-freshness-report-v1"
                && Number(group.changedCount || 0) >= 1
                && group.status === "fail",
            qualityCheckCoversFreshness: check.id === "compact_file_reference_read_plan_freshness"
                && check.status === "fail",
            memoryCenterDetailExposesFreshness: detailFreshness.schema === "ccm-group-compact-file-reference-read-plan-freshness-v1"
                && Number(detailFreshness.changedCount || 0) >= 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            freshness: {
                status: group.status,
                checked: group.checked,
                changedCount: group.changedCount,
                rawReadPlan: rawEntry.read_plan_id,
            },
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest() {
    const groupId = `memory-center-compact-file-reference-read-plan-revalidation-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle, } = require("../collaboration/memory");
        const initialMessages = [
            { id: "cfrpr-1", role: "user", target: "coordinator", timestamp: "2026-07-07T17:00:00.000Z", content: "READ_PLAN_REVALIDATION_SENTINEL：stale read plan 必须重读当前源。" },
            { id: "cfrpr-2", role: "assistant", agent: "api", timestamp: "2026-07-07T17:01:00.000Z", content: "api 将验证 current source 后再使用压缩记忆。" },
        ];
        saveGroupMessages(groupId, initialMessages);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact read plan stale source revalidation gate",
            messageDigest: "READ_PLAN_REVALIDATION_SENTINEL：如果历史 read plan 源变化，下一次子 Agent bundle 必须要求 re-read/current source verified。",
            persistentRequirements: [{ messageId: "cfrpr-1", text: "stale read plan 必须重读当前源。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-revalidation-summary",
                lastCompactedMessageId: "cfrpr-2",
            },
        });
        const sessionOptions = {
            taskId: "compact-read-plan-revalidation-task",
            traceId: "trace-compact-read-plan-revalidation",
            executionId: "exec-compact-read-plan-revalidation",
            taskAgentSessionId: "tas-compact-read-plan-revalidation",
            nativeSessionId: "native-compact-read-plan-revalidation",
            taskAgentSessionTurn: 2,
            agentType: "codex",
        };
        const firstBundle = buildAgentMemoryContextBundle(groupId, "api", "首次下发 READ_PLAN_REVALIDATION_SENTINEL src/revalidation.ts", sessionOptions);
        const firstReadPlan = firstBundle.compact_file_reference_read_plan || {};
        const rawEntry = (firstReadPlan.entries || []).find((entry) => entry.type === "raw_group_messages_json") || {};
        fs.writeFileSync(messageFile, JSON.stringify([
            ...initialMessages,
            { id: "cfrpr-3", role: "assistant", agent: "api", timestamp: "2026-07-07T17:02:00.000Z", content: "raw messages changed after first read plan surfacing。" },
        ], null, 2), "utf-8");
        const secondBundle = buildAgentMemoryContextBundle(groupId, "api", "再次下发 READ_PLAN_REVALIDATION_SENTINEL src/revalidation.ts", sessionOptions);
        const rendered = renderGroupMemoryContextBundle(secondBundle);
        const gate = secondBundle.compact_file_reference_read_plan_revalidation_gate || {};
        const failingReport = (0, memory_control_center_1.buildCompactFileReferenceReadPlanRevalidationGateReport)({ groupIds: [groupId] });
        const failingGroup = failingReport.groups?.[0] || {};
        const requiredReadPlanIds = (gate.required_entries || []).map((entry) => entry.read_plan_id).filter(Boolean);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact read plan stale source revalidation gate",
            messageDigest: "READ_PLAN_REVALIDATION_SENTINEL：如果历史 read plan 源变化，下一次子 Agent bundle 必须要求 re-read/current source verified。",
            persistentRequirements: [{ messageId: "cfrpr-1", text: "stale read plan 必须重读当前源。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-revalidation-summary",
                lastCompactedMessageId: "cfrpr-2",
            },
            workerLedger: [{
                    time: "2026-07-07T17:02:30.000Z",
                    taskId: "compact-read-plan-revalidation-task",
                    project: "api",
                    status: "completed",
                    taskAgentSessionId: "tas-wrong-compact-read-plan-revalidation",
                    nativeSessionId: "native-compact-read-plan-revalidation",
                    traceId: "trace-compact-read-plan-revalidation",
                    executionId: "exec-compact-read-plan-revalidation",
                    agentType: "codex",
                    summary: `错误会话声称已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
                    memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
                    memoryIgnored: [],
                }],
        });
        const wrongSessionReport = (0, memory_control_center_1.buildCompactFileReferenceReadPlanRevalidationGateReport)({ groupIds: [groupId] });
        const wrongSessionGroup = wrongSessionReport.groups?.[0] || {};
        const memoryWithReceipt = saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact read plan stale source revalidation gate",
            messageDigest: "READ_PLAN_REVALIDATION_SENTINEL：如果历史 read plan 源变化，下一次子 Agent bundle 必须要求 re-read/current source verified。",
            persistentRequirements: [{ messageId: "cfrpr-1", text: "stale read plan 必须重读当前源。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-revalidation-summary",
                lastCompactedMessageId: "cfrpr-2",
            },
            workerLedger: [{
                    time: "2026-07-07T17:03:00.000Z",
                    taskId: "compact-read-plan-revalidation-task",
                    project: "api",
                    status: "completed",
                    taskAgentSessionId: "tas-compact-read-plan-revalidation",
                    nativeSessionId: "native-compact-read-plan-revalidation",
                    traceId: "trace-compact-read-plan-revalidation",
                    executionId: "exec-compact-read-plan-revalidation",
                    agentType: "codex",
                    summary: `已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
                    memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
                    memoryIgnored: [],
                }],
        });
        const passingReport = (0, memory_control_center_1.buildCompactFileReferenceReadPlanRevalidationGateReport)({ groupIds: [groupId] });
        const passingGroup = passingReport.groups?.[0] || {};
        const check = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanRevalidationGate)({ groupIds: [groupId] });
        const sessionCheck = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanRevalidationSessionBinding)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailGate = detail.postCompactUsage?.compactFileReferenceReadPlanRevalidationGate || {};
        const detailDiscipline = detail.postCompactUsage?.compactFileReferenceReadPlanRevalidationDiscipline || {};
        const detailSessionBinding = detail.postCompactUsage?.compactFileReferenceReadPlanRevalidationSessionBinding || {};
        const checks = {
            firstBundleSurfacesReadPlan: firstReadPlan.schema === "ccm-group-compact-file-reference-read-plan-v1"
                && !!rawEntry.read_plan_id
                && !!rawEntry.sourceChecksum,
            secondBundleRequiresRevalidation: gate.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
                && gate.status === "required"
                && (gate.required_entries || []).some((entry) => entry.read_plan_id === rawEntry.read_plan_id),
            secondBundleCarriesSessionBinding: gate.session_binding?.task_agent_session_id === "tas-compact-read-plan-revalidation"
                && gate.session_binding?.native_session_id === "native-compact-read-plan-revalidation",
            childPromptPromotesMustReRead: rendered.includes("compact read plan revalidation gate")
                && rendered.includes("must re-read")
                && rendered.includes(rawEntry.read_plan_id || "missing-read-plan"),
            surfacingLedgerStoresGate: fs.existsSync(ledgerFile)
                && JSON.stringify((0, memory_control_center_1.readJson)(ledgerFile, {})).includes("read_plan_revalidation_gate"),
            reportFailsBeforeReceipt: failingReport.schema === "ccm-compact-file-reference-read-plan-revalidation-gate-report-v1"
                && Number(failingGroup.checked || 0) >= 1
                && failingGroup.status === "fail",
            reportRejectsWrongSessionReceipt: wrongSessionGroup.status === "fail"
                && Number(wrongSessionGroup.sessionMismatch || 0) >= 1
                && wrongSessionGroup.gaps?.some((gap) => gap.session_mismatch === true),
            reportPassesAfterCurrentSourceReceipt: passingGroup.status === "ok"
                && Number(passingGroup.passed || 0) >= 1
                && (passingGroup.rows || []).some((row) => row.read_plan_id === rawEntry.read_plan_id && row.current_source_verified === true && row.session_matched === true),
            qualityCheckCoversRevalidationGate: check.id === "compact_file_reference_read_plan_revalidation_gate"
                && Number(check.passed || 0) === Number(passingGroup.passed || 0),
            qualityCheckCoversSessionBinding: sessionCheck.id === "compact_file_reference_read_plan_revalidation_session_binding"
                && Number(sessionCheck.passed || 0) >= 1
                && !(sessionCheck.gaps || []).some((gap) => gap.read_plan_id === rawEntry.read_plan_id),
            memoryCenterDetailExposesRevalidation: detailGate.schema === "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1"
                && detailDiscipline.schema === "ccm-compact-file-reference-read-plan-revalidation-gate-group-v1",
            memoryCenterDetailExposesSessionBinding: detailSessionBinding.schema === "ccm-compact-file-reference-read-plan-revalidation-session-binding-group-v1"
                && detailSessionBinding.status === "ok"
                && Number(detailSessionBinding.passed || 0) >= 1,
            receiptSavedToMemory: Array.isArray(memoryWithReceipt.workerLedger)
                && memoryWithReceipt.workerLedger.some((row) => String(row.memoryUsed || "").includes(rawEntry.read_plan_id || "missing")),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            revalidation: {
                gateId: gate.revalidation_gate_id,
                requiredCount: gate.required_count,
                failingStatus: failingGroup.status,
                wrongSessionStatus: wrongSessionGroup.status,
                passingStatus: passingGroup.status,
                readPlanId: rawEntry.read_plan_id,
            },
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest() {
    const groupId = `memory-center-compact-read-plan-revalidation-repair-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const repairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, renderGroupMemoryContextBundle, } = require("../collaboration/memory");
        const sessionOptions = {
            taskId: "compact-read-plan-revalidation-repair-task",
            traceId: "trace-compact-read-plan-revalidation-repair",
            executionId: "exec-compact-read-plan-revalidation-repair",
            taskAgentSessionId: "tas-compact-read-plan-revalidation-repair",
            nativeSessionId: "native-compact-read-plan-revalidation-repair",
            taskAgentSessionTurn: 3,
            agentType: "claudecode",
        };
        const initialMessages = [
            { id: "cfrprw-1", role: "user", target: "coordinator", timestamp: "2026-07-07T18:00:00.000Z", content: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执必须转成修复待办。" },
            { id: "cfrprw-2", role: "assistant", agent: "api", timestamp: "2026-07-07T18:01:00.000Z", content: "api 将在绑定会话中重读当前源。" },
        ];
        saveGroupMessages(groupId, initialMessages);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 read plan revalidation repair work items",
            messageDigest: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执需要进入 repair work item。",
            persistentRequirements: [{ messageId: "cfrprw-1", text: "错会话回执必须转成修复待办。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-revalidation-repair-summary",
                lastCompactedMessageId: "cfrprw-2",
            },
        });
        const firstBundle = buildAgentMemoryContextBundle(groupId, "api", "首次下发 READ_PLAN_REVALIDATION_REPAIR_SENTINEL", sessionOptions);
        const firstReadPlan = firstBundle.compact_file_reference_read_plan || {};
        const rawEntry = (firstReadPlan.entries || []).find((entry) => entry.type === "raw_group_messages_json") || {};
        fs.writeFileSync(messageFile, JSON.stringify([
            ...initialMessages,
            { id: "cfrprw-3", role: "assistant", agent: "api", timestamp: "2026-07-07T18:02:00.000Z", content: "raw messages changed before repair work item。" },
        ], null, 2), "utf-8");
        const secondBundle = buildAgentMemoryContextBundle(groupId, "api", "再次下发 READ_PLAN_REVALIDATION_REPAIR_SENTINEL", sessionOptions);
        const gate = secondBundle.compact_file_reference_read_plan_revalidation_gate || {};
        const requiredReadPlanIds = (gate.required_entries || []).map((entry) => entry.read_plan_id).filter(Boolean);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 read plan revalidation repair work items",
            messageDigest: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执需要进入 repair work item。",
            persistentRequirements: [{ messageId: "cfrprw-1", text: "错会话回执必须转成修复待办。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-revalidation-repair-summary",
                lastCompactedMessageId: "cfrprw-2",
            },
            workerLedger: [{
                    time: "2026-07-07T18:03:00.000Z",
                    taskId: "compact-read-plan-revalidation-repair-task",
                    project: "api",
                    status: "completed",
                    taskAgentSessionId: "tas-wrong-compact-read-plan-revalidation-repair",
                    nativeSessionId: "native-compact-read-plan-revalidation-repair",
                    traceId: "trace-compact-read-plan-revalidation-repair",
                    executionId: "exec-compact-read-plan-revalidation-repair",
                    agentType: "claudecode",
                    summary: `错误会话声称已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
                    memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
                    memoryIgnored: [],
                }],
        });
        const failingDetail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const failingWorkItems = failingDetail.postCompactUsage?.readPlanRevalidationRepairWorkItems || failingDetail.postCompactUsage?.replayRepairWorkItems || {};
        const failingCandidates = failingDetail.postCompactUsage?.replayRepairDispatchCandidates || {};
        const repairReport = (0, memory_control_center_1.buildCompactFileReferenceReadPlanRevalidationRepairWorkItemReport)({ groupIds: [groupId] });
        const repairCheck = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanRevalidationRepairWorkItems)({ groupIds: [groupId] });
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: "repair work item selftest", currentPhase: "test" },
            compaction: {
                replayRepairWorkItems: failingWorkItems,
                replayRepairDispatchCandidates: failingCandidates,
            },
        });
        const expectedReadPlanIds = (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id])
            .map((id) => String(id || "").trim())
            .filter(Boolean);
        const matchesExpectedReadPlan = (value) => {
            const text = String(value || "");
            return expectedReadPlanIds.length
                ? expectedReadPlanIds.some(id => text.includes(id))
                : !!text.trim();
        };
        const repairItem = (failingWorkItems.openItems || failingWorkItems.items || []).find((item) => item.source === "compact_read_plan_revalidation_repair" || item.component === "compact_read_plan_revalidation") || {};
        const candidate = (failingCandidates.candidates || []).find((item) => item.source === "compact_read_plan_revalidation_repair" || item.component === "compact_read_plan_revalidation") || {};
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 read plan revalidation repair work items",
            messageDigest: "READ_PLAN_REVALIDATION_REPAIR_SENTINEL：错会话回执需要进入 repair work item。",
            persistentRequirements: [{ messageId: "cfrprw-1", text: "错会话回执必须转成修复待办。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-read-plan-revalidation-repair-summary",
                lastCompactedMessageId: "cfrprw-2",
            },
            workerLedger: [{
                    time: "2026-07-07T18:04:00.000Z",
                    taskId: "compact-read-plan-revalidation-repair-task",
                    project: "api",
                    status: "completed",
                    taskAgentSessionId: "tas-compact-read-plan-revalidation-repair",
                    nativeSessionId: "native-compact-read-plan-revalidation-repair",
                    traceId: "trace-compact-read-plan-revalidation-repair",
                    executionId: "exec-compact-read-plan-revalidation-repair",
                    agentType: "claudecode",
                    summary: `已按 ${gate.revalidation_gate_id || "cfr-rvg"} 重新读取当前源并验证 ${requiredReadPlanIds.join("、") || rawEntry.read_plan_id || "cfr-read"}。`,
                    memoryUsed: (requiredReadPlanIds.length ? requiredReadPlanIds : [rawEntry.read_plan_id]).filter(Boolean).map((id) => `gate=${gate.revalidation_gate_id || ""}；read_plan_id=${id}；re-read current source verified；path=${rawEntry.path || ""}`),
                    memoryIgnored: [],
                }],
        });
        const resolvedDetail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const resolvedWorkItems = resolvedDetail.postCompactUsage?.readPlanRevalidationRepairWorkItems || resolvedDetail.postCompactUsage?.replayRepairWorkItems || {};
        const resolvedLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const resolvedReadPlanRepairItems = (Array.isArray(resolvedLedger.items) ? resolvedLedger.items : [])
            .filter((item) => item.source === "compact_read_plan_revalidation_repair" || item.component === "compact_read_plan_revalidation");
        const checks = {
            failingDetailCreatesRepairWorkItem: failingWorkItems.schema === "ccm-compact-boundary-replay-repair-work-items-summary-v1"
                && Number(failingWorkItems.openItemCount || 0) >= 1
                && repairItem.component === "compact_read_plan_revalidation"
                && repairItem.session_mismatch === true
                && matchesExpectedReadPlan(repairItem.read_plan_id || repairItem.repair_target),
            dispatchCandidateCreated: failingCandidates.schema === "ccm-replay-repair-main-agent-dispatch-candidates-v1"
                && Number(failingCandidates.candidateCount || 0) >= 1
                && candidate.component === "compact_read_plan_revalidation"
                && candidate.shouldCreateRealTask === false
                && matchesExpectedReadPlan(candidate.read_plan_id || candidate.repair_target || candidate.prompt_patch),
            repairQualityCheckCoversWorkItem: repairReport.overall?.status === "ok"
                && repairCheck.id === "compact_file_reference_read_plan_revalidation_repair_work_items"
                && Number(repairCheck.passed || 0) === 1,
            renderedContextCarriesRepairCandidate: rendered.includes("Replay Repair pending work")
                && rendered.includes("compact_read_plan_revalidation")
                && rendered.includes("Main Agent replay repair dispatch candidates"),
            correctSessionClosesRepairWorkItem: resolvedReadPlanRepairItems.length >= 1
                && !resolvedReadPlanRepairItems.some((item) => (0, memory_control_center_1.replayRepairWorkItemOpen)(item.status))
                && resolvedReadPlanRepairItems.some((item) => item.component === "compact_read_plan_revalidation" && (0, memory_control_center_1.replayRepairWorkItemStatus)(item.status) === "completed"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            repairItem,
            candidate,
            resolvedReadPlanRepairItems: resolvedReadPlanRepairItems.map((item) => ({
                id: item.id || item.work_item_id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(item.status),
                component: item.component || "",
                source: item.source || "",
                read_plan_id: item.read_plan_id || "",
                revalidation_gate_id: item.revalidation_gate_id || "",
                session_mismatch: item.session_mismatch === true,
                resolutionReason: item.resolutionReason || item.resolution_reason || "",
            })),
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, workItemsFile, `${workItemsFile}.bak`, repairLedgerFile, `${repairLedgerFile}.bak`, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairDispatchSelfTest() {
    const groupId = `memory-center-compact-read-plan-revalidation-repair-dispatch-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    try {
        const at = "2026-07-10T21:00:00.000Z";
        const gateId = "cfr-rvg-phase176-shared-gate";
        const expectedTaskSessionId = "tas-phase176-bound";
        const expectedNativeSessionId = "native-phase176-bound";
        const discipline = {
            schema: "ccm-compact-file-reference-read-plan-revalidation-gate-group-v1",
            groupId,
            status: "fail",
            score: 0,
            gateId,
            gate: {
                schema: "ccm-group-compact-file-reference-read-plan-revalidation-gate-v1",
                revalidation_gate_id: gateId,
                target_project: "api",
                session_binding: {
                    task_agent_session_id: expectedTaskSessionId,
                    native_session_id: expectedNativeSessionId,
                },
            },
        };
        const gaps = [
            {
                gateId,
                read_plan_id: "cfr-read-phase176-a",
                reference_id: "cfr-ref-phase176-a",
                target_project: "api",
                expected_task_agent_session_id: expectedTaskSessionId,
                expected_native_session_id: expectedNativeSessionId,
                receipt_task_agent_session_id: "tas-phase176-wrong",
                receipt_native_session_id: "native-phase176-wrong",
                session_mismatch: true,
                reason: "Phase 176 wrong-session receipt must become a bound dispatch brief.",
            },
            {
                gateId,
                read_plan_id: "cfr-read-phase176-b",
                reference_id: "cfr-ref-phase176-b",
                target_project: "api",
                expected_task_agent_session_id: expectedTaskSessionId,
                expected_native_session_id: expectedNativeSessionId,
                receipt_task_agent_session_id: expectedTaskSessionId,
                receipt_native_session_id: expectedNativeSessionId,
                session_mismatch: false,
                reason: "Phase 176 current source verification receipt is still missing.",
            },
        ];
        const workItems = gaps.map((gap, index) => (0, memory_control_center_1.buildReadPlanRevalidationRepairWorkItem)(groupId, discipline, gap, index, {}, at));
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            items: workItems,
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)(workItems),
            updatedAt: at,
        });
        const candidateReport = (0, memory_control_center_1.buildCompactFileReferenceReadPlanRevalidationRepairDispatchCandidateReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T21:00:01.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildCompactFileReferenceReadPlanRevalidationRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-10T21:00:02.000Z",
        });
        const candidateQuality = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanRevalidationRepairDispatchCandidates)({
            groupIds: [groupId],
        });
        const briefQuality = (0, memory_control_center_1.evaluateCompactFileReferenceReadPlanRevalidationRepairDispatchBriefs)({
            groupIds: [groupId],
            candidateReport,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "compact_file_reference_read_plan_revalidation_repair_dispatch_candidates",
                "compact_file_reference_read_plan_revalidation_repair_dispatch_briefs",
            ],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityById = new Map((qualityReport.checks || []).map((check) => [String(check.id || ""), check]));
        const candidateGroup = candidateReport.groups?.[0] || {};
        const briefGroup = briefReport.groups?.[0] || {};
        const candidates = Array.isArray(candidateGroup.candidates) ? candidateGroup.candidates : [];
        const briefs = Array.isArray(briefGroup.briefs) ? briefGroup.briefs : [];
        const candidateByReadPlan = new Map(candidates.map((candidate) => [String(candidate.read_plan_id || ""), candidate]));
        const briefByReadPlan = new Map(briefs.map((brief) => [String(brief.read_plan_id || ""), brief]));
        const preservesStructuredFields = gaps.every((gap) => {
            const candidate = candidateByReadPlan.get(gap.read_plan_id) || {};
            const brief = briefByReadPlan.get(gap.read_plan_id) || {};
            return candidate.revalidation_gate_id === gateId
                && candidate.reference_id === gap.reference_id
                && candidate.expected_task_agent_session_id === expectedTaskSessionId
                && candidate.expected_native_session_id === expectedNativeSessionId
                && candidate.receipt_task_agent_session_id === gap.receipt_task_agent_session_id
                && candidate.receipt_native_session_id === gap.receipt_native_session_id
                && candidate.session_mismatch === gap.session_mismatch
                && brief.revalidation_gate_id === gateId
                && brief.reference_id === gap.reference_id
                && brief.expected_task_agent_session_id === expectedTaskSessionId
                && brief.expected_native_session_id === expectedNativeSessionId
                && brief.receipt_task_agent_session_id === gap.receipt_task_agent_session_id
                && brief.receipt_native_session_id === gap.receipt_native_session_id
                && brief.session_mismatch === gap.session_mismatch;
        });
        const briefsAreSelfContained = gaps.every((gap) => {
            const workerTask = String(briefByReadPlan.get(gap.read_plan_id)?.worker_task || "");
            return workerTask.includes(gateId)
                && workerTask.includes(gap.read_plan_id)
                && workerTask.includes(gap.reference_id)
                && workerTask.includes(expectedTaskSessionId)
                && workerTask.includes(expectedNativeSessionId)
                && workerTask.includes(gap.receipt_task_agent_session_id)
                && workerTask.includes(gap.receipt_native_session_id)
                && /CCM_AGENT_RECEIPT/i.test(workerTask)
                && /readPlanRevalidationUsage|memoryUsed|memoryIgnored/i.test(workerTask)
                && /currentSourceVerified|current source verified|current_source_verified/i.test(workerTask);
        });
        const candidateQualityFromReport = qualityById.get("compact_file_reference_read_plan_revalidation_repair_dispatch_candidates") || {};
        const briefQualityFromReport = qualityById.get("compact_file_reference_read_plan_revalidation_repair_dispatch_briefs") || {};
        const checks = {
            twoReadPlansRemainDistinct: workItems.length === 2
                && new Set(workItems.map((item) => item.work_item_id)).size === 2
                && new Set(candidates.map((candidate) => candidate.work_item_id)).size === 2
                && new Set(briefs.map((brief) => brief.work_item_id)).size === 2,
            candidatesCoverBothReadPlans: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) === 2
                && Number(candidateReport.overall?.coveredCandidateCount || 0) === 2
                && Number(candidateReport.overall?.metadataGapCount || 0) === 0
                && gaps.every((gap) => candidateByReadPlan.has(gap.read_plan_id)),
            briefsCoverBothReadPlans: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) === 2
                && Number(briefReport.overall?.coveredBriefCount || 0) === 2
                && Number(briefReport.overall?.metadataGapCount || 0) === 0
                && gaps.every((gap) => briefByReadPlan.has(gap.read_plan_id)),
            structuredGateReferenceAndSessionsPreserved: preservesStructuredFields,
            dispatchBriefsAreSelfContained: briefsAreSelfContained,
            sessionMismatchSurvivesDispatchCompilation: candidates.some((candidate) => candidate.session_mismatch === true)
                && briefs.some((brief) => brief.session_mismatch === true),
            directQualityChecksPass: candidateQuality.status === "ok"
                && Number(candidateQuality.checked || 0) === 1
                && Number(candidateQuality.passed || 0) === 1
                && briefQuality.status === "ok"
                && Number(briefQuality.checked || 0) === 1
                && Number(briefQuality.passed || 0) === 1,
            memoryQualityReportIncludesBothChecks: qualityReport.status === "ok"
                && candidateQualityFromReport.status === "ok"
                && Number(candidateQualityFromReport.checked || 0) === 1
                && Number(candidateQualityFromReport.passed || 0) === 1
                && briefQualityFromReport.status === "ok"
                && Number(briefQualityFromReport.checked || 0) === 1
                && Number(briefQualityFromReport.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            quality: {
                status: qualityReport.status,
                checks: (qualityReport.checks || []).map((check) => ({
                    id: check.id || "",
                    status: check.status || "",
                    checked: check.checked || 0,
                    passed: check.passed || 0,
                })),
            },
            candidates: candidates.map((candidate) => ({
                candidate_id: candidate.candidate_id || "",
                work_item_id: candidate.work_item_id || "",
                revalidation_gate_id: candidate.revalidation_gate_id || "",
                read_plan_id: candidate.read_plan_id || "",
                reference_id: candidate.reference_id || "",
                session_mismatch: candidate.session_mismatch === true,
            })),
            briefs: briefs.map((brief) => ({
                brief_id: brief.brief_id || "",
                work_item_id: brief.work_item_id || "",
                revalidation_gate_id: brief.revalidation_gate_id || "",
                read_plan_id: brief.read_plan_id || "",
                reference_id: brief.reference_id || "",
                session_mismatch: brief.session_mismatch === true,
            })),
        };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`, dispatchPlanFile, `${dispatchPlanFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactReinjectionRepairDispatchSelfTest() {
    const groupId = `memory-center-post-compact-reinjection-repair-dispatch-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    try {
        const gateId = "pcrg-phase177-repair";
        const boundary = {
            hasBoundary: true,
            summaryChecksum: "phase177-post-compact-summary",
            summarizedThroughMessageId: "phase177-message-17",
        };
        const gaps = [
            {
                type: "file",
                label: "pcrc-phase177-file",
                value: "src/phase177-recovered-memory.ts",
                reason: "Phase 177 file reinjection candidate was missing from replay context.",
                reinjection_gate_id: gateId,
                post_compact_candidate_id: "pcrc-phase177-file",
                post_compact_candidate_kind: "file",
                post_compact_candidate_value: "src/phase177-recovered-memory.ts",
                post_compact_candidate_source_message_id: "phase177-source-file",
            },
            {
                type: "verification",
                label: "pcrc-phase177-verification",
                value: "npm run test:phase177-memory",
                reason: "Phase 177 verification reinjection candidate was missing from replay context.",
                reinjection_gate_id: gateId,
                post_compact_candidate_id: "pcrc-phase177-verification",
                post_compact_candidate_kind: "verification",
                post_compact_candidate_value: "npm run test:phase177-memory",
                post_compact_candidate_source_message_id: "phase177-source-verification",
            },
        ];
        const plan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, {
            groupId,
            compaction: {
                summaryChecksum: boundary.summaryChecksum,
                compactedMessageCount: 17,
            },
            compactBoundary: boundary,
        }, {
            status: "fail",
            score: 50,
            targetProject: "api",
            renderedHash: "phase177-replay-rendered",
            gaps,
            candidates: gaps.map((gap) => ({
                candidate_id: gap.post_compact_candidate_id,
                kind: gap.post_compact_candidate_kind,
                value: gap.post_compact_candidate_value,
                sourceMessageId: gap.post_compact_candidate_source_message_id,
            })),
            boundary,
            reinjectionGateId: gateId,
        });
        const replay = {
            schema: "ccm-compact-boundary-replay-gate-v1",
            groupId,
            targetProject: "api",
            status: "fail",
            score: 50,
            renderedHash: "phase177-replay-rendered",
            boundary,
            repairPlan: plan,
            repairLedger: {
                latestAttemptId: "replay-attempt-phase177",
            },
        };
        const actions = (plan.actions || []).filter((action) => action.component === "post_compact_reinject");
        const workItems = actions.map((action, index) => (0, memory_control_center_1.buildReplayRepairPendingWorkItem)(groupId, replay, action, index, {}, "2026-07-10T22:00:00.000Z"));
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            latestReplay: {
                status: replay.status,
                score: replay.score,
                renderedHash: replay.renderedHash,
            },
            items: workItems,
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)(workItems),
            updatedAt: "2026-07-10T22:00:00.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairDispatchCandidateReport)({
            groupIds: [groupId],
            generatedAt: "2026-07-10T22:00:01.000Z",
        });
        const briefReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-10T22:00:02.000Z",
        });
        const candidateQuality = (0, memory_control_center_1.evaluatePostCompactReinjectionRepairDispatchCandidates)({ groupIds: [groupId] });
        const briefQuality = (0, memory_control_center_1.evaluatePostCompactReinjectionRepairDispatchBriefs)({ groupIds: [groupId], candidateReport });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "post_compact_reinjection_repair_dispatch_candidates",
                "post_compact_reinjection_repair_dispatch_briefs",
            ],
            groupIds: [groupId],
            refresh: true,
        });
        const candidateGroup = candidateReport.groups?.[0] || {};
        const briefGroup = briefReport.groups?.[0] || {};
        const candidates = Array.isArray(candidateGroup.candidates) ? candidateGroup.candidates : [];
        const briefs = Array.isArray(briefGroup.briefs) ? briefGroup.briefs : [];
        const candidateByMemoryId = new Map(candidates.map((candidate) => [String(candidate.post_compact_candidate_id || ""), candidate]));
        const briefByMemoryId = new Map(briefs.map((brief) => [String(brief.post_compact_candidate_id || ""), brief]));
        const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
        const packet = buildWorkerContextPacket({
            group: {
                id: groupId,
                members: [{ project: "api" }],
            },
            project: "api",
            task: "Phase 177 post-compact reinjection repair dispatch",
            taskId: "phase177-task",
            traceId: "phase177-trace",
            agentType: "codex",
            analysis: { summary: "Recover both post-compact reinjection candidates." },
            replayRepairDispatchBriefs: briefs,
        });
        const renderedPacket = renderWorkerContextPacket(packet);
        const packetBriefByMemoryId = new Map((packet.replay_repair_dispatch_briefs || []).map((brief) => [
            String(brief.post_compact_candidate_id || ""),
            brief,
        ]));
        const preservesStructuredFields = gaps.every((gap) => {
            const candidate = candidateByMemoryId.get(gap.post_compact_candidate_id) || {};
            const brief = briefByMemoryId.get(gap.post_compact_candidate_id) || {};
            const packetBrief = packetBriefByMemoryId.get(gap.post_compact_candidate_id) || {};
            return candidate.reinjection_gate_id === gateId
                && candidate.post_compact_candidate_kind === gap.post_compact_candidate_kind
                && candidate.post_compact_candidate_value === gap.post_compact_candidate_value
                && candidate.post_compact_candidate_source_message_id === gap.post_compact_candidate_source_message_id
                && candidate.targetProject === "api"
                && brief.reinjection_gate_id === gateId
                && brief.post_compact_candidate_kind === gap.post_compact_candidate_kind
                && brief.post_compact_candidate_value === gap.post_compact_candidate_value
                && brief.post_compact_candidate_source_message_id === gap.post_compact_candidate_source_message_id
                && packetBrief.reinjection_gate_id === gateId
                && packetBrief.post_compact_candidate_kind === gap.post_compact_candidate_kind
                && packetBrief.post_compact_candidate_value === gap.post_compact_candidate_value
                && packetBrief.post_compact_candidate_source_message_id === gap.post_compact_candidate_source_message_id;
        });
        const briefsAreSelfContained = gaps.every((gap) => {
            const workerTask = String(briefByMemoryId.get(gap.post_compact_candidate_id)?.worker_task || "");
            return workerTask.includes(gateId)
                && workerTask.includes(gap.post_compact_candidate_id)
                && workerTask.includes(gap.post_compact_candidate_kind)
                && workerTask.includes(gap.post_compact_candidate_value)
                && workerTask.includes(gap.post_compact_candidate_source_message_id)
                && /CCM_AGENT_RECEIPT/i.test(workerTask)
                && /postCompactCandidateUsage/i.test(workerTask)
                && /memoryUsed|memoryIgnored/i.test(workerTask)
                && /currentSourceVerified|current source verified|current_source_verified/i.test(workerTask)
                && /task_agent_session_id/i.test(workerTask)
                && /native_session_id/i.test(workerTask);
        });
        const renderedPacketCarriesAllCandidates = gaps.every((gap) => renderedPacket.includes(gateId)
            && renderedPacket.includes(gap.post_compact_candidate_id)
            && renderedPacket.includes(gap.post_compact_candidate_kind)
            && renderedPacket.includes(gap.post_compact_candidate_value)
            && renderedPacket.includes(gap.post_compact_candidate_source_message_id));
        const qualityById = new Map((qualityReport.checks || []).map((check) => [String(check.id || ""), check]));
        const candidateQualityFromReport = qualityById.get("post_compact_reinjection_repair_dispatch_candidates") || {};
        const briefQualityFromReport = qualityById.get("post_compact_reinjection_repair_dispatch_briefs") || {};
        const checks = {
            repairPlanCarriesTwoCandidateActions: actions.length === 2
                && actions.every((action) => action.priority === "high")
                && new Set(actions.map((action) => action.post_compact_candidate_id)).size === 2,
            workItemsPreserveCandidateIdentity: workItems.length === 2
                && workItems.every((item) => item.reinjection_gate_id === gateId
                    && !!item.post_compact_candidate_id
                    && !!item.post_compact_candidate_kind
                    && !!item.post_compact_candidate_value),
            candidatesCoverBothMemoryObjects: candidateReport.overall?.status === "ok"
                && Number(candidateReport.overall?.expectedCandidateCount || 0) === 2
                && Number(candidateReport.overall?.coveredCandidateCount || 0) === 2
                && Number(candidateReport.overall?.metadataGapCount || 0) === 0
                && gaps.every((gap) => candidateByMemoryId.has(gap.post_compact_candidate_id)),
            briefsCoverBothMemoryObjects: briefReport.overall?.status === "ok"
                && Number(briefReport.overall?.expectedBriefCount || 0) === 2
                && Number(briefReport.overall?.coveredBriefCount || 0) === 2
                && Number(briefReport.overall?.metadataGapCount || 0) === 0
                && gaps.every((gap) => briefByMemoryId.has(gap.post_compact_candidate_id)),
            structuredMetadataSurvivesWorkerContext: preservesStructuredFields,
            dispatchBriefsAreSelfContained: briefsAreSelfContained,
            renderedWorkerContextCarriesCandidateIdentity: renderedPacketCarriesAllCandidates
                && renderedPacket.includes("Replay repair dispatch brief")
                && renderedPacket.includes("shouldCreateRealTask=false"),
            directQualityChecksPass: candidateQuality.status === "ok"
                && Number(candidateQuality.checked || 0) === 1
                && Number(candidateQuality.passed || 0) === 1
                && briefQuality.status === "ok"
                && Number(briefQuality.checked || 0) === 1
                && Number(briefQuality.passed || 0) === 1,
            memoryQualityReportIncludesBothChecks: qualityReport.status === "ok"
                && candidateQualityFromReport.status === "ok"
                && Number(candidateQualityFromReport.checked || 0) === 1
                && Number(candidateQualityFromReport.passed || 0) === 1
                && briefQualityFromReport.status === "ok"
                && Number(briefQualityFromReport.checked || 0) === 1
                && Number(briefQualityFromReport.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            quality: {
                status: qualityReport.status,
                checks: (qualityReport.checks || []).map((check) => ({
                    id: check.id || "",
                    status: check.status || "",
                    checked: check.checked || 0,
                    passed: check.passed || 0,
                })),
            },
            candidates: candidates.map((candidate) => ({
                candidate_id: candidate.candidate_id || "",
                work_item_id: candidate.work_item_id || "",
                reinjection_gate_id: candidate.reinjection_gate_id || "",
                post_compact_candidate_id: candidate.post_compact_candidate_id || "",
                post_compact_candidate_kind: candidate.post_compact_candidate_kind || "",
                post_compact_candidate_value: candidate.post_compact_candidate_value || "",
            })),
            briefs: briefs.map((brief) => ({
                brief_id: brief.brief_id || "",
                work_item_id: brief.work_item_id || "",
                reinjection_gate_id: brief.reinjection_gate_id || "",
                post_compact_candidate_id: brief.post_compact_candidate_id || "",
                post_compact_candidate_kind: brief.post_compact_candidate_kind || "",
                post_compact_candidate_value: brief.post_compact_candidate_value || "",
            })),
        };
    }
    finally {
        for (const file of [workItemsFile, `${workItemsFile}.bak`, dispatchPlanFile, `${dispatchPlanFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactReinjectionRepairReceiptConsumptionSelfTest() {
    const groupId = `memory-center-post-compact-reinjection-repair-receipt-selftest-${process.pid}-${Date.now()}`;
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const timelineFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const gateId = "pcrg-phase178-receipt";
        const memoryCandidateId = "pcrc-phase178-file";
        const boundary = {
            hasBoundary: true,
            summaryChecksum: "phase178-post-compact-summary",
            summarizedThroughMessageId: "phase178-message-18",
        };
        const gap = {
            type: "file",
            label: memoryCandidateId,
            value: "src/phase178-receipt-memory.ts",
            reason: "Phase 178 candidate needs exact bound-session receipt consumption.",
            reinjection_gate_id: gateId,
            post_compact_candidate_id: memoryCandidateId,
            post_compact_candidate_kind: "file",
            post_compact_candidate_value: "src/phase178-receipt-memory.ts",
            post_compact_candidate_source_message_id: "phase178-source-file",
        };
        const plan = (0, memory_control_center_1.buildCompactBoundaryReplayRepairPlan)(groupId, {
            groupId,
            compaction: {
                summaryChecksum: boundary.summaryChecksum,
                compactedMessageCount: 18,
            },
            compactBoundary: boundary,
        }, {
            status: "fail",
            score: 50,
            targetProject: "api",
            renderedHash: "phase178-replay-rendered",
            gaps: [gap],
            candidates: [{
                    candidate_id: memoryCandidateId,
                    kind: "file",
                    value: gap.post_compact_candidate_value,
                    sourceMessageId: gap.post_compact_candidate_source_message_id,
                }],
            boundary,
            reinjectionGateId: gateId,
        });
        const replay = {
            schema: "ccm-compact-boundary-replay-gate-v1",
            groupId,
            targetProject: "api",
            status: "fail",
            score: 50,
            renderedHash: "phase178-replay-rendered",
            boundary,
            repairPlan: plan,
            repairLedger: {
                latestAttemptId: "replay-attempt-phase178",
            },
        };
        const action = (plan.actions || []).find((item) => item.component === "post_compact_reinject") || {};
        const workItem = (0, memory_control_center_1.buildReplayRepairPendingWorkItem)(groupId, replay, action, 0, {}, "2026-07-10T23:00:00.000Z");
        (0, memory_control_center_1.writeGroupCompactBoundaryReplayRepairWorkItems)(groupId, {
            groupId,
            items: [workItem],
            stats: (0, memory_control_center_1.replayRepairWorkItemStats)([workItem]),
            updatedAt: "2026-07-10T23:00:00.000Z",
        });
        const candidateReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairDispatchCandidateReport)({ groupIds: [groupId] });
        (0, memory_control_center_1.buildPostCompactReinjectionRepairDispatchBriefReport)({
            groupIds: [groupId],
            candidateReport,
            generatedAt: "2026-07-10T23:00:01.000Z",
        });
        const planLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && (0, memory_control_center_1.isPostCompactReinjectionRepairItem)(brief)) || {};
        const { recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchTimelineBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const taskId = "phase178-task";
        const assignmentId = "phase178-assignment";
        const dispatchKey = "phase178-dispatch";
        const packetId = "wcp-phase178";
        const handoffId = "handoff-phase178";
        const snapshotId = "snapshot-phase178";
        const taskAgentSessionId = "tas-phase178";
        const nativeSessionId = "native-phase178";
        const executionId = "execution-phase178";
        const baseTimelineInput = {
            brief: readyBrief,
            task_id: taskId,
            project: "api",
            assignment_id: assignmentId,
            dispatch_key: dispatchKey,
            worker_context_packet_id: packetId,
            worker_handoff_id: handoffId,
            memory_context_snapshot_id: snapshotId,
            memory_context_snapshot_checksum: "snapshot-checksum-phase178",
            task_agent_session_id: taskAgentSessionId,
            native_session_id: nativeSessionId,
            execution_id: executionId,
        };
        const invalidReceipt = {
            status: "done",
            task_agent_session_id: "tas-phase178-wrong",
            native_session_id: "native-phase178-wrong",
            replayRepairDispatchBriefUsage: [{
                    briefId: readyBrief.brief_id,
                    workItemId: readyBrief.work_item_id,
                    usageState: "verified",
                    reason: "Claimed the replay repair brief but referenced the wrong reinjection candidate and session.",
                }],
            postCompactCandidateUsage: [{
                    gateId,
                    candidateId: "pcrc-phase178-wrong",
                    usageState: "verified",
                    currentSourceVerified: true,
                    reason: "Wrong candidate proof.",
                }],
            memoryUsed: [`reinjection_gate_id=${gateId}; candidate_id=pcrc-phase178-wrong; currentSourceVerified=true`],
            memoryIgnored: [],
            blockers: [],
            needs: [],
        };
        for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
            recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                ...baseTimelineInput,
                receipt_status: eventType === "child_agent_receipt" ? "done" : "",
                receipt: eventType === "child_agent_receipt" ? invalidReceipt : null,
                timeline_event: {
                    id: `phase178-invalid-${eventType}`,
                    type: eventType,
                    at: "2026-07-10T23:00:02.000Z",
                },
            }, { at: "2026-07-10T23:00:02.000Z" });
        }
        const invalidTimelineLedger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const invalidBinding = (invalidTimelineLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const invalidWorkLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const invalidWorkItem = (invalidWorkLedger.items || []).find((item) => (0, memory_control_center_1.replayRepairWorkItemId)(item) === (0, memory_control_center_1.replayRepairWorkItemId)(workItem)) || {};
        const validReceipt = {
            status: "done",
            task_agent_session_id: taskAgentSessionId,
            native_session_id: nativeSessionId,
            replayRepairDispatchBriefUsage: [{
                    briefId: readyBrief.brief_id,
                    workItemId: readyBrief.work_item_id,
                    usageState: "verified",
                    reason: "Used the exact replay repair brief to restore and verify the candidate.",
                }],
            postCompactCandidateUsage: [{
                    gateId,
                    candidateId: memoryCandidateId,
                    usageState: "verified",
                    currentSourceVerified: true,
                    reason: "Re-read the current repository file before accepting the recovered candidate.",
                }],
            memoryUsed: [`reinjection_gate_id=${gateId}; candidate_id=${memoryCandidateId}; currentSourceVerified=true`],
            memoryIgnored: [],
            blockers: [],
            needs: [],
        };
        const validBindingResult = recordReplayRepairDispatchBriefTimelineBinding(groupId, {
            ...baseTimelineInput,
            receipt_status: "done",
            receipt: validReceipt,
            timeline_event: {
                id: "phase178-valid-child_agent_receipt",
                type: "child_agent_receipt",
                at: "2026-07-10T23:00:03.000Z",
            },
        }, { at: "2026-07-10T23:00:03.000Z" });
        const finalTimelineLedger = readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId);
        const finalBinding = (finalTimelineLedger.entries || []).find((entry) => entry.brief_id === readyBrief.brief_id) || {};
        const finalWorkLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedWorkItem = (finalWorkLedger.items || []).find((item) => (0, memory_control_center_1.replayRepairWorkItemId)(item) === (0, memory_control_center_1.replayRepairWorkItemId)(workItem)) || {};
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const automaticTypedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const automaticTypedArchive = automaticTypedLedger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
        const automaticTypedRows = Array.isArray(automaticTypedArchive.rows) ? automaticTypedArchive.rows : [];
        const automaticTypedDocs = scanGroupTypedMemoryDocuments(groupId);
        const automaticTypedDoc = automaticTypedDocs.find((doc) => doc.relPath === "post-compact-reinjection-repair-receipt-memory.md");
        const automaticTypedDocText = (() => {
            try {
                return automaticTypedDoc?.file ? fs.readFileSync(automaticTypedDoc.file, "utf-8") : "";
            }
            catch {
                return "";
            }
        })();
        const report = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptConsumptionReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluatePostCompactReinjectionRepairReceiptConsumption)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_reinjection_repair_receipt_consumption"],
            groupIds: [groupId],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((check) => check.id === "post_compact_reinjection_repair_receipt_consumption") || {};
        const typedMemoryReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptTypedMemoryReport)({ groupIds: [groupId] });
        const typedMemoryQuality = (0, memory_control_center_1.evaluatePostCompactReinjectionRepairReceiptTypedMemory)({ groupIds: [groupId] });
        const typedMemoryQualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_reinjection_repair_receipt_typed_memory"],
            groupIds: [groupId],
            refresh: true,
        });
        const typedMemoryQualityCheck = (typedMemoryQualityReport.checks || []).find((check) => check.id === "post_compact_reinjection_repair_receipt_typed_memory") || {};
        const receiptProof = completedWorkItem.post_compact_reinjection_repair_receipt || {};
        const checks = {
            dispatchBriefAvailable: readyBrief.source === "compact_boundary_replay_repair"
                && readyBrief.component === "post_compact_reinject"
                && readyBrief.reinjection_gate_id === gateId
                && readyBrief.post_compact_candidate_id === memoryCandidateId,
            invalidCandidateOrSessionDoesNotClose: invalidBinding.post_compact_reinjection_receipt_verified !== true
                && (invalidBinding.post_compact_reinjection_receipt_gaps || []).length >= 1
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(invalidWorkItem.status),
            validReceiptBindsExactCandidateAndSession: finalBinding.post_compact_reinjection_receipt_verified === true
                && finalBinding.post_compact_reinjection_receipt_usage_state === "verified"
                && finalBinding.post_compact_reinjection_current_source_verified === true
                && finalBinding.post_compact_reinjection_memory_receipt_matched === true
                && finalBinding.post_compact_reinjection_task_session_matched === true
                && finalBinding.post_compact_reinjection_native_session_matched === true
                && finalBinding.reinjection_gate_id === gateId
                && finalBinding.post_compact_candidate_id === memoryCandidateId,
            fullTimelineRequiredBeforeClosure: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS.every((eventType) => (finalBinding.event_types || []).includes(eventType))
                && finalBinding.worker_context_packet_id === packetId
                && finalBinding.worker_handoff_id === handoffId
                && finalBinding.memory_context_snapshot_id === snapshotId
                && finalBinding.task_agent_session_id === taskAgentSessionId
                && finalBinding.native_session_id === nativeSessionId
                && finalBinding.execution_id === executionId,
            validReceiptClosesRepairWorkItem: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedWorkItem.status) === "completed"
                && completedWorkItem.completion_source === "post_compact_reinjection_replay_repair_receipt_consumption"
                && completedWorkItem.resolutionReason === "post_compact_reinjection_repair_receipt_verified"
                && validBindingResult?.repair_work_item_completion?.closed === 1,
            completionPersistsReceiptProof: receiptProof.reinjection_gate_id === gateId
                && receiptProof.post_compact_candidate_id === memoryCandidateId
                && receiptProof.usage_state === "verified"
                && receiptProof.current_source_verified === true
                && receiptProof.memory_receipt_matched === true
                && receiptProof.task_agent_session_id === taskAgentSessionId
                && receiptProof.native_session_id === nativeSessionId,
            receiptConsumptionReportPasses: report.overall?.status === "ok"
                && Number(report.overall?.expectedReceiptCount || 0) === 1
                && Number(report.overall?.coveredReceiptCount || 0) === 1
                && Number(report.overall?.receiptVerifiedCount || 0) === 1
                && Number(report.overall?.completedRepairCount || 0) === 1
                && Number(report.overall?.metadataGapCount || 0) === 0,
            memoryQualityCheckPasses: quality.id === "post_compact_reinjection_repair_receipt_consumption"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 1
                && Number(qualityCheck.passed || 0) === 1,
            automaticTypedMemoryDistillationRunsOnClosure: Number(automaticTypedArchive.archived_count || 0) === 1
                && automaticTypedRows.some((row) => row.reinjection_gate_id === gateId
                    && row.post_compact_candidate_id === memoryCandidateId
                    && row.task_agent_session_id === taskAgentSessionId
                    && row.native_session_id === nativeSessionId
                    && row.completion_source === "post_compact_reinjection_replay_repair_receipt_consumption"
                    && row.resolution_reason === "post_compact_reinjection_repair_receipt_verified"),
            automaticTypedMemoryDocumentPreservesExactCompletion: automaticTypedDoc?.type === "reference"
                && automaticTypedDocText.includes(gateId)
                && automaticTypedDocText.includes(memoryCandidateId)
                && automaticTypedDocText.includes(taskAgentSessionId)
                && automaticTypedDocText.includes(nativeSessionId)
                && automaticTypedDocText.includes("post_compact_reinjection_replay_repair_receipt_consumption")
                && automaticTypedDocText.includes("post_compact_reinjection_repair_receipt_verified"),
            typedMemoryFreshnessBoundaryPreserved: /historical repair completion is recovery evidence, not permanent repository truth/i.test(automaticTypedDocText)
                && /Future use must reverify the current source/i.test(automaticTypedDocText),
            typedMemoryReportPasses: typedMemoryReport.overall?.status === "ok"
                && Number(typedMemoryReport.overall?.checkedVerifiedCompletionCount || 0) === 1
                && Number(typedMemoryReport.overall?.archivedCompletionCount || 0) === 1
                && Number(typedMemoryReport.overall?.documentedCompletionCount || 0) === 1
                && Number(typedMemoryReport.overall?.metadataGapCount || 0) === 0,
            typedMemoryQualityCheckPasses: typedMemoryQuality.id === "post_compact_reinjection_repair_receipt_typed_memory"
                && typedMemoryQuality.status === "ok"
                && Number(typedMemoryQuality.checked || 0) === 1
                && Number(typedMemoryQuality.passed || 0) === 1
                && typedMemoryQualityCheck.status === "ok"
                && Number(typedMemoryQualityCheck.checked || 0) === 1
                && Number(typedMemoryQualityCheck.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            quality: {
                id: qualityCheck.id || "",
                status: qualityCheck.status || "",
                checked: qualityCheck.checked || 0,
                passed: qualityCheck.passed || 0,
            },
            typedMemory: {
                report: typedMemoryReport.overall,
                quality: {
                    id: typedMemoryQualityCheck.id || "",
                    status: typedMemoryQualityCheck.status || "",
                    checked: typedMemoryQualityCheck.checked || 0,
                    passed: typedMemoryQualityCheck.passed || 0,
                },
                docs: automaticTypedDocs.map((doc) => doc.relPath),
            },
            invalidBinding: {
                receipt_verified: invalidBinding.post_compact_reinjection_receipt_verified === true,
                gaps: invalidBinding.post_compact_reinjection_receipt_gaps || [],
                repair_status: (0, memory_control_center_1.replayRepairWorkItemStatus)(invalidWorkItem.status),
            },
            finalBinding: {
                timeline_binding_id: finalBinding.timeline_binding_id || "",
                receipt_verified: finalBinding.post_compact_reinjection_receipt_verified === true,
                usage_state: finalBinding.post_compact_reinjection_receipt_usage_state || "",
                event_types: finalBinding.event_types || [],
                task_agent_session_id: finalBinding.task_agent_session_id || "",
                native_session_id: finalBinding.native_session_id || "",
            },
            completedWorkItem: {
                work_item_id: (0, memory_control_center_1.replayRepairWorkItemId)(completedWorkItem),
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedWorkItem.status),
                completion_source: completedWorkItem.completion_source || "",
                resolutionReason: completedWorkItem.resolutionReason || "",
            },
        };
    }
    finally {
        for (const file of [
            workItemsFile,
            `${workItemsFile}.bak`,
            dispatchPlanFile,
            `${dispatchPlanFile}.bak`,
            timelineFile,
            `${timelineFile}.bak`,
        ]) {
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
function runMemoryCenterPostCompactReinjectionRepairReceiptTypedMemorySelfTest() {
    return runMemoryCenterPostCompactReinjectionRepairReceiptConsumptionSelfTest();
}
function runMemoryCenterPostCompactReinjectionRepairReceiptWorkerContextUsageSelfTest() {
    const groupId = `memory-center-post-compact-reinjection-repair-receipt-worker-context-usage-selftest-${process.pid}-${Date.now()}`;
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const timelineFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    try {
        const { distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory, readGroupTypedMemoryDistillationLedger, } = require("../collaboration/group-memory-index");
        const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
        const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
        const { recordReplayRepairDispatchBriefAssignmentBinding, recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
        const gateId = "pcrg-phase180-worker-context";
        const candidateId = "pcrc-phase180-worker-context";
        const historicalTaskSessionId = "task-agent-session-phase180-historical";
        const historicalNativeSessionId = "native-session-phase180-historical";
        const row = {
            groupId,
            timeline_binding_id: "replay-repair-brief-timeline:phase180-historical",
            brief_id: "replay-repair-dispatch-brief:phase180-historical",
            work_item_id: "post-compact-reinjection-repair:phase180-historical",
            source: "compact_boundary_replay_repair",
            component: "post_compact_reinject",
            project: "api",
            task_id: "task-phase180-historical",
            assignment_id: "assignment-phase180-historical",
            dispatch_key: "dispatch-phase180-historical",
            reinjection_gate_id: gateId,
            post_compact_candidate_id: candidateId,
            post_compact_candidate_kind: "file",
            post_compact_candidate_value: "src/phase180-worker-context-memory.ts",
            post_compact_candidate_source_message_id: "message-phase180-worker-context",
            post_compact_reinjection_receipt_usage_state: "verified",
            post_compact_reinjection_receipt_reason: "PHASE180_POST_COMPACT_WORKER_CONTEXT_SENTINEL verified the current source in the historical repair session.",
            post_compact_reinjection_current_source_verified: true,
            post_compact_reinjection_memory_receipt_matched: true,
            post_compact_reinjection_task_session_matched: true,
            post_compact_reinjection_native_session_matched: true,
            post_compact_reinjection_receipt_verified: true,
            receipt_status: "done",
            replay_repair_consumption_status: "verified",
            replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
            worker_context_packet_id: "wcp-phase180-historical",
            worker_handoff_id: "handoff-phase180-historical",
            memory_context_snapshot_id: "snapshot-phase180-historical",
            memory_context_snapshot_checksum: "snapshot-checksum-phase180-historical",
            task_agent_session_id: historicalTaskSessionId,
            native_session_id: historicalNativeSessionId,
            execution_id: "execution-phase180-historical",
            event_types: memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS,
            completion_source: "post_compact_reinjection_replay_repair_receipt_consumption",
            resolution_reason: "post_compact_reinjection_repair_receipt_verified",
            completed_at: "2026-07-10T23:40:00.000Z",
        };
        const distillation = distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, { rows: [row] }, {
            reason: "phase180-worker-context-usage-selftest",
            updatedAt: "2026-07-10T23:40:00.000Z",
        });
        const task = "继续 PHASE180_POST_COMPACT_WORKER_CONTEXT_SENTINEL src/phase180-worker-context-memory.ts post-compact reinjection repair receipt；使用前重新核验 current source";
        const recallReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptWorkerContextRecallReport)({
            groupIds: [groupId],
            targetProject: "api",
            task,
            firstTaskAgentSessionId: "task-agent-session-phase180-fresh-a",
            firstNativeSessionId: "native-session-phase180-fresh-a",
            secondTaskAgentSessionId: "task-agent-session-phase180-fresh-b",
            secondNativeSessionId: "native-session-phase180-fresh-b",
        });
        const recallQuality = (0, memory_control_center_1.evaluatePostCompactReinjectionRepairReceiptWorkerContextRecall)({
            groupIds: [groupId],
            targetProject: "api",
            task,
        });
        const freshTaskSessionId = "task-agent-session-phase180-receipt";
        const freshNativeSessionId = "native-session-phase180-receipt";
        const bundle = buildAgentMemoryContextBundle(groupId, "api", task, {
            includeGlobalClaudeMemory: false,
            includeProjectMemory: false,
            maxTypedMemory: 8,
            maxRenderedChars: 14000,
            taskAgentSessionId: freshTaskSessionId,
            nativeSessionId: freshNativeSessionId,
            executionId: "execution-phase180-receipt",
            forcePostCompactReinjectionRepairReceiptRecall: true,
        });
        const packet = buildWorkerContextPacket({
            group: { id: groupId, name: "Phase 180 Receipt", members: [{ project: "api" }] },
            project: "api",
            task,
            taskId: "task-phase180-receipt",
            traceId: "trace-phase180-receipt",
            agentType: "codex",
            memory: bundle,
            contextUsageOptions: { maxTokens: 90000 },
        });
        const contract = (0, memory_control_center_1.workerContextPacketPostCompactReinjectionRepairReceiptMemoryContract)(packet) || {};
        const requiredDocs = (0, memory_control_center_1.normalizeQualityStringList)(contract.memory_receipt_required_doc_rel_paths || contract.doc_rel_paths || []);
        const brief = {
            brief_id: "replay-repair-dispatch-brief:phase180-receipt",
            work_item_id: "post-compact-reinjection-repair:phase180-receipt",
            source: "compact_boundary_replay_repair",
            component: "post_compact_reinject",
            target_project: "api",
            reinjection_gate_id: gateId,
            post_compact_candidate_id: candidateId,
            post_compact_candidate_kind: "file",
            post_compact_candidate_value: "src/phase180-worker-context-memory.ts",
            post_compact_candidate_source_message_id: "message-phase180-worker-context",
        };
        const assignment = {
            project: "api",
            assignmentId: "assignment-phase180-receipt",
            dispatchKey: "dispatch-phase180-receipt",
            taskFingerprint: "task-phase180-receipt",
            worker_context_packet: packet,
        };
        const binding = recordReplayRepairDispatchBriefAssignmentBinding(groupId, assignment, { brief });
        const receipt = {
            status: "done",
            worker_context_packet_id: packet.packet_id,
            task_agent_session_id: freshTaskSessionId,
            native_session_id: freshNativeSessionId,
            memoryUsed: requiredDocs.map((relPath) => `${relPath}; usageState=verified; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`),
            memoryIgnored: [],
            replayRepairDispatchBriefUsage: [{
                    briefId: brief.brief_id,
                    workItemId: brief.work_item_id,
                    usageState: "verified",
                    reason: "Used the bound replay repair brief and reverified current source.",
                }],
            postCompactCandidateUsage: [{
                    gateId,
                    candidateId,
                    usageState: "verified",
                    currentSourceVerified: true,
                    reason: "Re-read src/phase180-worker-context-memory.ts in the fresh child session.",
                }],
            blockers: [],
            needs: [],
        };
        recordReplayRepairDispatchBriefTimelineBinding(groupId, {
            brief,
            task_id: "task-phase180-receipt",
            project: "api",
            assignment_id: "assignment-phase180-receipt",
            dispatch_key: "dispatch-phase180-receipt",
            worker_context_packet_id: packet.packet_id,
            worker_handoff_id: "handoff-phase180-receipt",
            memory_context_snapshot_id: "snapshot-phase180-receipt",
            memory_context_snapshot_checksum: "snapshot-checksum-phase180-receipt",
            task_agent_session_id: freshTaskSessionId,
            native_session_id: freshNativeSessionId,
            execution_id: "execution-phase180-receipt",
            receipt_status: "done",
            receipt,
            timeline_event: {
                id: "phase180-child-agent-receipt",
                type: "child_agent_receipt",
                at: "2026-07-10T23:41:00.000Z",
            },
        }, { at: "2026-07-10T23:41:00.000Z" });
        const assignmentLedger = readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
        const persistedBinding = (assignmentLedger.entries || []).find((entry) => entry.binding_id === binding?.binding_id) || {};
        const receiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({
            groupIds: [groupId],
            tasks: [],
        });
        const receiptQuality = (0, memory_control_center_1.evaluatePostCompactReinjectionRepairReceiptMemoryUsageReceipt)({
            groupIds: [groupId],
            tasks: [],
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "post_compact_reinjection_repair_receipt_worker_context_recall",
                "post_compact_reinjection_repair_receipt_memory_usage_receipt",
            ],
            groupIds: [groupId],
            targetProject: "api",
            task,
            tasks: [],
            refresh: true,
        });
        const recallQualityCheck = (qualityReport.checks || []).find((item) => item.id === "post_compact_reinjection_repair_receipt_worker_context_recall") || {};
        const receiptQualityCheck = (qualityReport.checks || []).find((item) => item.id === "post_compact_reinjection_repair_receipt_memory_usage_receipt") || {};
        const archive = readGroupTypedMemoryDistillationLedger(groupId).postCompactReinjectionRepairReceiptConsumptionArchive || {};
        const recallGroup = recallReport.groups?.[0] || {};
        const receiptGroup = receiptReport.groups?.[0] || {};
        const badCoverage = (0, memory_control_center_1.postCompactReinjectionRepairReceiptMemoryUsageCoverage)(contract, {
            task_agent_session_id: "wrong-task-session",
            native_session_id: freshNativeSessionId,
            memoryUsed: requiredDocs.map((relPath) => `${relPath}; usageState=verified`),
            memoryIgnored: [],
        });
        const renderedPacket = renderWorkerContextPacket(packet);
        const checks = {
            distillationCreatesRecallArchive: distillation.archivedCount === 1
                && archive.archived_count === 1
                && archive.rows?.[0]?.post_compact_candidate_id === candidateId,
            twoFreshSessionsRecallMemory: recallReport.overall?.status === "ok"
                && recallGroup.firstSessionRecalled === true
                && recallGroup.secondSessionRecalled === true
                && recallGroup.distinctSessionBindings === true,
            workerContextPacketCarriesBoundContract: contract.schema === "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1"
                && contract.current_task_agent_session_id === freshTaskSessionId
                && contract.current_native_session_id === freshNativeSessionId
                && requiredDocs.includes("post-compact-reinjection-repair-receipt-memory.md")
                && renderedPacket.includes("currentSourceVerified=true"),
            assignmentLedgerPersistsContractAndReceipt: persistedBinding.post_compact_reinjection_repair_receipt_memory_contract?.active === true
                && persistedBinding.worker_context_packet_receipt?.worker_context_packet_id === packet.packet_id
                && persistedBinding.worker_context_packet_receipt?.task_agent_session_id === freshTaskSessionId,
            receiptReportAcceptsFreshVerifiedUse: receiptReport.overall?.status === "ok"
                && Number(receiptReport.overall?.receiptContractCount || 0) === 1
                && Number(receiptReport.overall?.coveredReceiptCount || 0) === 1
                && receiptGroup.receipts?.[0]?.compliant === true,
            staleOrWrongSessionReceiptRejected: badCoverage.pass === false
                && badCoverage.gaps.includes("current_source_verified_missing")
                && badCoverage.gaps.includes("task_agent_session_mismatch"),
            qualityChecksRegisteredAndPass: recallQuality.id === "post_compact_reinjection_repair_receipt_worker_context_recall"
                && recallQuality.status === "ok"
                && receiptQuality.id === "post_compact_reinjection_repair_receipt_memory_usage_receipt"
                && receiptQuality.status === "ok"
                && recallQualityCheck.status === "ok"
                && receiptQualityCheck.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            recallReport: recallReport.overall,
            receiptReport: receiptReport.overall,
            quality: {
                recall: {
                    id: recallQualityCheck.id || "",
                    status: recallQualityCheck.status || "",
                    checked: recallQualityCheck.checked || 0,
                    passed: recallQualityCheck.passed || 0,
                },
                receipt: {
                    id: receiptQualityCheck.id || "",
                    status: receiptQualityCheck.status || "",
                    checked: receiptQualityCheck.checked || 0,
                    passed: receiptQualityCheck.passed || 0,
                },
            },
            packet: {
                packet_id: packet.packet_id || "",
                requiredDocs,
                current_task_agent_session_id: contract.current_task_agent_session_id || "",
                current_native_session_id: contract.current_native_session_id || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, timelineFile, `${timelineFile}.bak`]) {
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
function runMemoryCenterPostCompactReinjectionRepairReceiptMemoryUsageRepairSelfTest() {
    const groupId = `memory-center-post-compact-receipt-memory-usage-repair-selftest-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const timelineFile = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const originalPacketId = "wcp-phase181-original";
    const originalBindingId = "binding-phase181-original";
    const originalTaskSessionId = "task-agent-session-phase181-original";
    const originalNativeSessionId = "native-session-phase181-original";
    const requiredDoc = "post-compact-reinjection-repair-receipt-memory.md";
    try {
        const contract = {
            schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1",
            active: true,
            memory_receipt_required_doc_rel_paths: [requiredDoc],
            doc_rel_paths: [requiredDoc],
            current_task_agent_session_id: originalTaskSessionId,
            current_native_session_id: originalNativeSessionId,
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
            freshness_boundary: "historical repair completion is recovery evidence, not permanent repository truth",
        };
        const badEntry = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
            binding_id: originalBindingId,
            assignment_id: "assignment-phase181-original",
            dispatch_key: "dispatch-phase181-original",
            groupId,
            project: "api",
            worker_context_packet_id: originalPacketId,
            post_compact_reinjection_repair_receipt_memory_contract: contract,
            worker_context_packet_post_compact_reinjection_repair_receipt_memory_contract: contract,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: originalPacketId,
                categories: [{ id: "post_compact_reinjection_repair_receipt_memory_contract", required: true, tokens: 80 }],
            },
            worker_context_packet_receipt: {
                status: "done",
                worker_context_packet_id: originalPacketId,
                task_agent_session_id: originalTaskSessionId,
                native_session_id: originalNativeSessionId,
                memoryUsed: [`${requiredDoc}; usageState=verified`],
                memoryIgnored: [],
            },
        };
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            updatedAt: "2026-07-10T23:50:00.000Z",
            bindingCount: 1,
            entries: [badEntry],
        });
        const firstReceiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds: [groupId], tasks: [], generatedAt: "2026-07-10T23:50:01.000Z" });
        const secondReceiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds: [groupId], tasks: [], generatedAt: "2026-07-10T23:50:02.000Z" });
        const workLedgerBefore = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const repairItemsBefore = (workLedgerBefore.items || []).filter(memory_control_center_1.isPostCompactReinjectionRepairReceiptMemoryUsageReceiptRepairWorkItem);
        const workItemReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageRepairWorkItemReport)({ groupIds: [groupId], tasks: [] });
        const candidateReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageRepairDispatchCandidateReport)({ groupIds: [groupId], tasks: [], workItemReport });
        const briefReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageRepairDispatchBriefReport)({ groupIds: [groupId], tasks: [], candidateReport, generatedAt: "2026-07-10T23:50:03.000Z" });
        const planLedger = (0, memory_control_center_1.readGroupReplayRepairDispatchPlanLedger)(groupId);
        const readyBrief = (planLedger.briefs || []).find((brief) => brief.status === "ready" && (0, memory_control_center_1.isPostCompactReinjectionRepairReceiptMemoryUsageReceiptRepairSource)(brief.source)) || {};
        const beforeQualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "post_compact_reinjection_repair_receipt_memory_usage_repair_work_items",
                "post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_candidates",
                "post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_briefs",
            ],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const beforeChecks = new Map((beforeQualityReport.checks || []).map((check) => [check.id, check]));
        const { recordReplayRepairDispatchBriefTimelineBinding, } = require("../collaboration/group-orchestrator");
        const repairTaskSessionId = "task-agent-session-phase181-repair";
        const repairNativeSessionId = "native-session-phase181-repair";
        const baseTimeline = {
            brief: readyBrief,
            task_id: "task-phase181-repair",
            project: "api",
            assignment_id: "assignment-phase181-repair",
            dispatch_key: "dispatch-phase181-repair",
            worker_context_packet_id: "wcp-phase181-repair",
            worker_handoff_id: "handoff-phase181-repair",
            memory_context_snapshot_id: "snapshot-phase181-repair",
            memory_context_snapshot_checksum: "snapshot-checksum-phase181-repair",
            task_agent_session_id: repairTaskSessionId,
            native_session_id: repairNativeSessionId,
            execution_id: "execution-phase181-repair",
        };
        const invalidCorrectedReceipt = {
            status: "done",
            task_agent_session_id: originalTaskSessionId,
            native_session_id: originalNativeSessionId,
            replayRepairDispatchBriefUsage: [{
                    briefId: readyBrief.brief_id,
                    workItemId: readyBrief.work_item_id,
                    usageState: "verified",
                    reason: "Incorrectly reused the original session and omitted current-source verification.",
                }],
            memoryUsed: [`${requiredDoc}; usageState=verified`],
            memoryIgnored: [],
        };
        for (const eventType of memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS) {
            recordReplayRepairDispatchBriefTimelineBinding(groupId, {
                ...baseTimeline,
                receipt_status: eventType === "child_agent_receipt" ? "done" : "",
                receipt: eventType === "child_agent_receipt" ? invalidCorrectedReceipt : null,
                timeline_event: { id: `phase181-invalid-${eventType}`, type: eventType, at: "2026-07-10T23:50:04.000Z" },
            }, { at: "2026-07-10T23:50:04.000Z" });
        }
        const workLedgerAfterInvalid = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const itemAfterInvalid = (workLedgerAfterInvalid.items || []).find((item) => (item.work_item_id || item.id) === readyBrief.work_item_id) || {};
        const validCorrectedReceipt = {
            status: "done",
            task_agent_session_id: repairTaskSessionId,
            native_session_id: repairNativeSessionId,
            replayRepairDispatchBriefUsage: [{
                    briefId: readyBrief.brief_id,
                    workItemId: readyBrief.work_item_id,
                    usageState: "verified",
                    reason: "Returned a corrected receipt after re-reading current source in the new repair session.",
                }],
            memoryUsed: [`${requiredDoc}; usageState=verified; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`],
            memoryIgnored: [],
        };
        const validBindingResult = recordReplayRepairDispatchBriefTimelineBinding(groupId, {
            ...baseTimeline,
            receipt_status: "done",
            receipt: validCorrectedReceipt,
            timeline_event: { id: "phase181-valid-child_agent_receipt", type: "child_agent_receipt", at: "2026-07-10T23:50:05.000Z" },
        }, { at: "2026-07-10T23:50:05.000Z" });
        const workLedgerAfterValid = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const completedItem = (workLedgerAfterValid.items || []).find((item) => (item.work_item_id || item.id) === readyBrief.work_item_id) || {};
        const closureReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageRepairReceiptConsumptionReport)({ groupIds: [groupId] });
        const typedMemoryReport = (0, memory_control_center_1.buildPostCompactReceiptMemoryUsageRepairCompletionTypedMemoryReport)({ groupIds: [groupId], generatedAt: "2026-07-10T23:50:05.000Z" });
        const typedMemoryGroup = typedMemoryReport.groups?.[0] || {};
        const { readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
        const typedLedger = readGroupTypedMemoryDistillationLedger(groupId);
        const typedArchive = typedLedger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
        const typedRows = Array.isArray(typedArchive.rows) ? typedArchive.rows : [];
        const typedDocs = scanGroupTypedMemoryDocuments(groupId);
        const typedDoc = typedDocs.find((doc) => doc.relPath === "post-compact-receipt-memory-usage-repair-completions.md");
        const typedDocText = (() => {
            try {
                return typedDoc?.file ? fs.readFileSync(typedDoc.file, "utf-8") : "";
            }
            catch {
                return "";
            }
        })();
        const repairedReceiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds: [groupId], tasks: [], generatedAt: "2026-07-10T23:50:06.000Z" });
        const finalWorkLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const finalRepairItems = (finalWorkLedger.items || []).filter(memory_control_center_1.isPostCompactReinjectionRepairReceiptMemoryUsageReceiptRepairWorkItem);
        const afterQualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "post_compact_reinjection_repair_receipt_memory_usage_receipt",
                "post_compact_reinjection_repair_receipt_memory_usage_repair_receipt_consumption",
                "post_compact_reinjection_repair_receipt_memory_usage_repair_completion_typed_memory",
            ],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const afterChecks = new Map((afterQualityReport.checks || []).map((check) => [check.id, check]));
        const proof = completedItem.post_compact_receipt_memory_usage_repair_receipt || {};
        const checks = {
            badReceiptCreatesSingleIdempotentWorkItem: firstReceiptReport.overall?.status === "fail"
                && secondReceiptReport.overall?.status === "fail"
                && repairItemsBefore.length === 1
                && Number(repairItemsBefore[0]?.seenCount || 0) === 1,
            workItemPreservesOriginalEvidenceAndRequiredDocs: workItemReport.overall?.status === "ok"
                && repairItemsBefore[0]?.original_worker_context_packet_id === originalPacketId
                && repairItemsBefore[0]?.original_task_agent_session_id === originalTaskSessionId
                && (repairItemsBefore[0]?.post_compact_receipt_memory_required_doc_rel_paths || []).includes(requiredDoc),
            candidateAndBriefAreComplete: candidateReport.overall?.status === "ok"
                && briefReport.overall?.status === "ok"
                && readyBrief.source === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair"
                && readyBrief.worker_task?.includes(requiredDoc)
                && readyBrief.worker_task?.includes("currentSourceVerified=true")
                && readyBrief.worker_task?.includes("replayRepairDispatchBriefUsage"),
            planningDoesNotCreateRealTask: candidateReport.groups?.[0]?.candidates?.[0]?.shouldCreateRealTask === false
                && briefReport.groups?.[0]?.shouldCreateRealTask === true,
            invalidCorrectedReceiptDoesNotClose: (0, memory_control_center_1.replayRepairWorkItemOpen)(itemAfterInvalid.status),
            validNewSessionReceiptCloses: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedItem.status) === "completed"
                && completedItem.completion_source === "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption"
                && completedItem.resolutionReason === "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified"
                && validBindingResult?.repair_work_item_completion?.closed === 1,
            completionPersistsExactProof: proof.verified === true
                && proof.required_doc_rel_paths?.includes(requiredDoc)
                && proof.covered_doc_rel_paths?.includes(requiredDoc)
                && proof.coverage_rows?.some((row) => row.relPath === requiredDoc && row.usageState === "verified" && row.currentSourceVerified === true && row.compliant === true)
                && proof.all_docs_compliant === true
                && proof.task_session_matched === true
                && proof.native_session_matched === true
                && proof.task_agent_session_id === repairTaskSessionId
                && proof.native_session_id === repairNativeSessionId
                && proof.task_agent_session_id !== originalTaskSessionId
                && proof.native_session_id !== originalNativeSessionId,
            correctedReceiptSatisfiesOriginalGapWithoutReopen: repairedReceiptReport.overall?.status === "ok"
                && Number(repairedReceiptReport.overall?.repairedReceiptCount || 0) === 1
                && finalRepairItems.length === 1
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(finalRepairItems[0]?.status) === "completed",
            closureReportPasses: closureReport.overall?.status === "ok"
                && Number(closureReport.overall?.completedReceiptRepairCount || 0) === 1
                && Number(closureReport.overall?.verifiedCompletionCount || 0) === 1,
            validCompletionAutomaticallyDistillsTypedMemory: typedMemoryReport.overall?.status === "ok"
                && typedMemoryGroup.recallProbeCovered === true
                && typedRows.length === 1
                && typedRows[0]?.work_item_id === readyBrief.work_item_id
                && typedRows[0]?.repair_task_agent_session_id === repairTaskSessionId
                && typedRows[0]?.repair_native_session_id === repairNativeSessionId
                && typedDocText.includes(requiredDoc)
                && typedDocText.includes("historical repair completion is recovery evidence, not permanent repository truth"),
            qualityChecksRegisteredAndPass: [
                "post_compact_reinjection_repair_receipt_memory_usage_repair_work_items",
                "post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_candidates",
                "post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_briefs",
            ].every(id => beforeChecks.get(id)?.status === "ok")
                && afterChecks.get("post_compact_reinjection_repair_receipt_memory_usage_receipt")?.status === "ok"
                && afterChecks.get("post_compact_reinjection_repair_receipt_memory_usage_repair_receipt_consumption")?.status === "ok"
                && afterChecks.get("post_compact_reinjection_repair_receipt_memory_usage_repair_completion_typed_memory")?.status === "ok",
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receiptReportBefore: firstReceiptReport.overall,
            workItemReport: workItemReport.overall,
            candidateReport: candidateReport.overall,
            briefReport: briefReport.overall,
            closureReport: closureReport.overall,
            receiptReportAfter: repairedReceiptReport.overall,
            completedItem: {
                work_item_id: completedItem.work_item_id || completedItem.id || "",
                status: (0, memory_control_center_1.replayRepairWorkItemStatus)(completedItem.status),
                completion_source: completedItem.completion_source || "",
                resolutionReason: completedItem.resolutionReason || "",
            },
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, workItemsFile, `${workItemsFile}.bak`, dispatchPlanFile, `${dispatchPlanFile}.bak`, timelineFile, `${timelineFile}.bak`]) {
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
function runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionTypedMemorySelfTest() {
    const integration = runMemoryCenterPostCompactReinjectionRepairReceiptMemoryUsageRepairSelfTest();
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-post-compact-receipt-memory-usage-repair-typed-a-${suffix}`;
    const groupB = `memory-center-post-compact-receipt-memory-usage-repair-typed-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const requiredDoc = "post-compact-reinjection-repair-receipt-memory.md";
    const { buildGroupTypedMemoryRecall, distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory, readGroupTypedMemoryDistillationLedger, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
    const makeRow = (groupId, marker) => ({
        groupId,
        source: "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair",
        project: "api",
        task_id: `task-${marker}`,
        work_item_id: `post-compact-receipt-memory-usage-repair:${marker}`,
        brief_id: `replay-repair-dispatch-brief:${marker}`,
        timeline_binding_id: `replay-repair-brief-timeline:${marker}`,
        assignment_id: `assignment-repair-${marker}`,
        dispatch_key: `dispatch-repair-${marker}`,
        original_worker_context_packet_id: `original-packet-${marker}`,
        original_binding_id: `original-binding-${marker}`,
        original_assignment_id: `original-assignment-${marker}`,
        original_dispatch_key: `original-dispatch-${marker}`,
        original_task_agent_session_id: `original-task-session-${marker}`,
        original_native_session_id: `original-native-session-${marker}`,
        task_agent_session_id: `repair-task-session-${marker}`,
        native_session_id: `repair-native-session-${marker}`,
        execution_id: `repair-execution-${marker}`,
        post_compact_receipt_memory_gap_codes: ["receipt_usage_state_or_reverify", "receipt_historical_boundary"],
        post_compact_receipt_memory_usage_repair_required_doc_rel_paths: [requiredDoc],
        post_compact_receipt_memory_usage_repair_covered_doc_rel_paths: [requiredDoc],
        post_compact_receipt_memory_usage_repair_coverage_rows: [{
                relPath: requiredDoc,
                usageState: "verified",
                covered: true,
                compliant: true,
                currentSourceVerified: true,
                ignoredReasonCovered: false,
                reason: "",
            }],
        post_compact_receipt_memory_usage_repair_all_docs_compliant: true,
        post_compact_receipt_memory_usage_repair_historical_boundary_covered: true,
        post_compact_receipt_memory_usage_repair_task_session_matched: true,
        post_compact_receipt_memory_usage_repair_native_session_matched: true,
        post_compact_receipt_memory_usage_repair_verified: true,
        receipt_status: "done",
        replay_repair_consumption_status: "verified",
        replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
        event_types: [...memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS],
        completion_source: "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption",
        resolution_reason: "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified",
        completed_at: "2026-07-11T00:20:00.000Z",
    });
    try {
        const rowA = makeRow(groupA, "PHASE182_GROUP_A_SENTINEL");
        const rowB = makeRow(groupB, "PHASE182_GROUP_B_SENTINEL");
        const firstA = distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupA, { rows: [rowA] }, { reason: "phase182-selftest-a", updatedAt: "2026-07-11T00:20:00.000Z" });
        const secondA = distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupA, { rows: [rowA] }, { reason: "phase182-selftest-a-repeat", updatedAt: "2026-07-11T00:20:01.000Z" });
        const firstB = distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupB, { rows: [rowB] }, { reason: "phase182-selftest-b", updatedAt: "2026-07-11T00:20:00.000Z" });
        const ledgerA = readGroupTypedMemoryDistillationLedger(groupA);
        const ledgerB = readGroupTypedMemoryDistillationLedger(groupB);
        const archiveA = ledgerA.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
        const archiveB = ledgerB.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
        const rowsA = Array.isArray(archiveA.rows) ? archiveA.rows : [];
        const rowsB = Array.isArray(archiveB.rows) ? archiveB.rows : [];
        const docA = scanGroupTypedMemoryDocuments(groupA).find((doc) => doc.relPath === "post-compact-receipt-memory-usage-repair-completions.md");
        const docB = scanGroupTypedMemoryDocuments(groupB).find((doc) => doc.relPath === "post-compact-receipt-memory-usage-repair-completions.md");
        const textA = (() => { try {
            return docA?.file ? fs.readFileSync(docA.file, "utf-8") : "";
        }
        catch {
            return "";
        } })();
        const textB = (() => { try {
            return docB?.file ? fs.readFileSync(docB.file, "utf-8") : "";
        }
        catch {
            return "";
        } })();
        const recallA = buildGroupTypedMemoryRecall(groupA, "PHASE182_GROUP_A_SENTINEL corrected receipt currentSourceVerified", { max: 8, disableLedger: true, forceMemory: true, snippetChars: 420 });
        const recallB = buildGroupTypedMemoryRecall(groupB, "PHASE182_GROUP_B_SENTINEL corrected receipt currentSourceVerified", { max: 8, disableLedger: true, forceMemory: true, snippetChars: 420 });
        const recallTextA = JSON.stringify(recallA.recalled || []);
        const recallTextB = JSON.stringify(recallB.recalled || []);
        const checks = {
            strictTimelineCompletionAutomaticallyDistills: integration.pass === true
                && integration.checks?.validCompletionAutomaticallyDistillsTypedMemory === true,
            directDistillationArchivesVerifiedRows: firstA.archivedCount === 1
                && firstA.verifiedCount === 1
                && firstB.archivedCount === 1
                && rowsA.length === 1
                && rowsB.length === 1,
            repeatDistillationIsIdempotent: secondA.archivedCount === 1
                && secondA.newRowCount === 0
                && secondA.updatedRowCount === 1,
            exactOriginalAndRepairSessionsPersist: rowsA[0]?.original_task_agent_session_id === "original-task-session-PHASE182_GROUP_A_SENTINEL"
                && rowsA[0]?.original_native_session_id === "original-native-session-PHASE182_GROUP_A_SENTINEL"
                && rowsA[0]?.repair_task_agent_session_id === "repair-task-session-PHASE182_GROUP_A_SENTINEL"
                && rowsA[0]?.repair_native_session_id === "repair-native-session-PHASE182_GROUP_A_SENTINEL",
            perDocumentUsageProofPersists: rowsA[0]?.coverage_rows?.some((coverage) => coverage.rel_path === requiredDoc
                && coverage.usage_state === "verified"
                && coverage.current_source_verified === true
                && coverage.compliant === true)
                && textA.includes(requiredDoc)
                && textA.includes("currentSourceVerified=true"),
            futureSessionFreshnessBoundaryPersists: /historical repair completion is recovery evidence, not permanent repository truth/i.test(textA)
                && /Every future child Agent session must independently classify recalled memory/i.test(textA)
                && /Historical task\/native session ids are evidence only and never authorize a future session/i.test(textA),
            typedMemoryIsRecallableAndGroupIsolated: recallTextA.includes("post-compact-receipt-memory-usage-repair-completions.md")
                && recallTextA.includes("PHASE182_GROUP_A_SENTINEL")
                && !textA.includes("PHASE182_GROUP_B_SENTINEL")
                && recallTextB.includes("post-compact-receipt-memory-usage-repair-completions.md")
                && recallTextB.includes("PHASE182_GROUP_B_SENTINEL")
                && !textB.includes("PHASE182_GROUP_A_SENTINEL"),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            integrationChecks: integration.checks,
            groupA: { archivedCount: archiveA.archived_count || 0, recalled: (recallA.recalled || []).map((item) => item.relPath) },
            groupB: { archivedCount: archiveB.archived_count || 0, recalled: (recallB.recalled || []).map((item) => item.relPath) },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionWorkerContextSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-post-compact-receipt-memory-usage-repair-worker-context-a-${suffix}`;
    const groupB = `memory-center-post-compact-receipt-memory-usage-repair-worker-context-b-${suffix}`;
    const groupSessionId = "gcs_phase183_worker_context";
    const typedScopeA = `${groupA}--${groupSessionId}`;
    const typedScopeB = `${groupB}--${groupSessionId}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(typedScopeA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(typedScopeB));
    const bindingFileA = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupA);
    const timelineFileA = (0, memory_control_center_1.getGroupReplayRepairDispatchTimelineBindingLedgerFile)(groupA);
    const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
    const sourceMemoryDoc = "post-compact-reinjection-repair-receipt-memory.md";
    const { distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory, } = require("../collaboration/group-memory-index");
    const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
    const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
    const { buildSelfContainedWorkerHandoff, renderSelfContainedWorkerHandoff } = require("../../agents/worker-handoff");
    const { recordReplayRepairDispatchBriefAssignmentBinding, recordReplayRepairDispatchBriefTimelineBinding, readReplayRepairDispatchBindingLedgerForCoordinator, } = require("../collaboration/group-orchestrator");
    const makeRow = (groupId, marker) => ({
        groupId,
        groupSessionId,
        source: "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair",
        project: "api",
        task_id: `task-${marker}`,
        work_item_id: `post-compact-receipt-memory-usage-repair:${marker}`,
        brief_id: `replay-repair-dispatch-brief:${marker}`,
        timeline_binding_id: `replay-repair-brief-timeline:${marker}`,
        assignment_id: `assignment-repair-${marker}`,
        dispatch_key: `dispatch-repair-${marker}`,
        original_worker_context_packet_id: `original-packet-${marker}`,
        original_binding_id: `original-binding-${marker}`,
        original_assignment_id: `original-assignment-${marker}`,
        original_dispatch_key: `original-dispatch-${marker}`,
        original_task_agent_session_id: `original-task-session-${marker}`,
        original_native_session_id: `original-native-session-${marker}`,
        task_agent_session_id: `repair-task-session-${marker}`,
        native_session_id: `repair-native-session-${marker}`,
        execution_id: `repair-execution-${marker}`,
        post_compact_receipt_memory_gap_codes: ["receipt_usage_state_or_reverify", "receipt_historical_boundary"],
        post_compact_receipt_memory_usage_repair_required_doc_rel_paths: [sourceMemoryDoc],
        post_compact_receipt_memory_usage_repair_covered_doc_rel_paths: [sourceMemoryDoc],
        post_compact_receipt_memory_usage_repair_coverage_rows: [{
                relPath: sourceMemoryDoc,
                usageState: "verified",
                covered: true,
                compliant: true,
                currentSourceVerified: true,
                ignoredReasonCovered: false,
                reason: "",
            }],
        post_compact_receipt_memory_usage_repair_all_docs_compliant: true,
        post_compact_receipt_memory_usage_repair_historical_boundary_covered: true,
        post_compact_receipt_memory_usage_repair_task_session_matched: true,
        post_compact_receipt_memory_usage_repair_native_session_matched: true,
        post_compact_receipt_memory_usage_repair_verified: true,
        receipt_status: "done",
        replay_repair_consumption_status: "verified",
        replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
        event_types: [...memory_control_center_1.REPLAY_REPAIR_TIMELINE_REQUIRED_EVENTS],
        completion_source: "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption",
        resolution_reason: "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified",
        completed_at: "2026-07-11T00:40:00.000Z",
    });
    try {
        const rowA = makeRow(groupA, "PHASE183_GROUP_A_SENTINEL");
        const rowB = makeRow(groupB, "PHASE183_GROUP_B_SENTINEL");
        distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(typedScopeA, { rows: [rowA] }, { sourceGroupId: groupA, groupSessionId, reason: "phase183-worker-context-a", updatedAt: "2026-07-11T00:40:00.000Z" });
        distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(typedScopeB, { rows: [rowB] }, { sourceGroupId: groupB, groupSessionId, reason: "phase183-worker-context-b", updatedAt: "2026-07-11T00:40:00.000Z" });
        const task = "继续 corrected receipt memory usage repair PHASE183_GROUP_A_SENTINEL PHASE183_GROUP_B_SENTINEL；重新核验 current source 并声明 memoryUsed memoryIgnored";
        const report = (0, memory_control_center_1.buildPostCompactReceiptMemoryUsageRepairCompletionWorkerContextReport)({ groupIds: [groupA, groupB], groupSessionIds: [groupSessionId], targetProject: "api", task });
        const quality = (0, memory_control_center_1.evaluatePostCompactReceiptMemoryUsageRepairCompletionWorkerContext)({ groupIds: [groupA, groupB], groupSessionIds: [groupSessionId], targetProject: "api", task });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_reinjection_repair_receipt_memory_usage_repair_completion_worker_context_usage"],
            groupIds: [groupA, groupB],
            groupSessionIds: [groupSessionId],
            targetProject: "api",
            task,
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "post_compact_reinjection_repair_receipt_memory_usage_repair_completion_worker_context_usage") || {};
        const currentTaskSession = "task-agent-session-phase183-current";
        const currentNativeSession = "native-session-phase183-current";
        const bundle = buildAgentMemoryContextBundle(groupA, "api", task, {
            includeGlobalClaudeMemory: false,
            includeProjectMemory: false,
            maxTypedMemory: 8,
            maxRenderedChars: 16000,
            taskAgentSessionId: currentTaskSession,
            nativeSessionId: currentNativeSession,
            executionId: "execution-phase183-current",
            groupSessionId,
            forcePostCompactReceiptMemoryUsageRepairCompletionRecall: true,
        });
        const packet = buildWorkerContextPacket({
            group: { id: groupA, name: "Phase 183 Completion Memory", members: [{ project: "api" }] },
            project: "api",
            task,
            taskId: "task-phase183-current",
            traceId: "trace-phase183-current",
            agentType: "codex",
            memory: bundle,
            contextUsageOptions: { maxTokens: 90000 },
        });
        const contract = (0, memory_control_center_1.workerContextPacketPostCompactReinjectionRepairReceiptMemoryContract)(packet) || {};
        const requiredDocs = (0, memory_control_center_1.normalizeQualityStringList)(contract.memory_receipt_required_doc_rel_paths || []);
        const handoff = buildSelfContainedWorkerHandoff({
            group: { id: groupA, name: "Phase 183 Completion Memory", members: [{ project: "api", agent: "codex" }] },
            project: "api",
            task,
            agentType: "codex",
            memory: bundle,
            workerContextPacket: packet,
            traceId: "trace-phase183-current",
            taskId: "task-phase183-current",
        });
        const handoffText = renderSelfContainedWorkerHandoff(handoff);
        const brief = {
            brief_id: "replay-repair-dispatch-brief:phase183-current",
            work_item_id: "post-compact-reinjection-repair:phase183-current",
            source: "compact_boundary_replay_repair",
            component: "post_compact_reinject",
            target_project: "api",
        };
        const assignment = {
            project: "api",
            groupSessionId,
            assignmentId: "assignment-phase183-current",
            dispatchKey: "dispatch-phase183-current",
            taskFingerprint: "task-phase183-current",
            worker_context_packet: packet,
        };
        const binding = recordReplayRepairDispatchBriefAssignmentBinding(groupA, assignment, { brief });
        const receipt = {
            status: "done",
            worker_context_packet_id: packet.packet_id,
            task_agent_session_id: currentTaskSession,
            native_session_id: currentNativeSession,
            memoryUsed: requiredDocs.map((relPath) => `${relPath}; usageState=verified; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`),
            memoryIgnored: [],
            replayRepairDispatchBriefUsage: [{ briefId: brief.brief_id, workItemId: brief.work_item_id, usageState: "verified", reason: "Used the bound brief and independently reverified current source." }],
            blockers: [],
            needs: [],
        };
        recordReplayRepairDispatchBriefTimelineBinding(groupA, {
            brief,
            task_id: "task-phase183-current",
            project: "api",
            group_session_id: groupSessionId,
            assignment_id: "assignment-phase183-current",
            dispatch_key: "dispatch-phase183-current",
            worker_context_packet_id: packet.packet_id,
            worker_handoff_id: handoff.handoff_id || "handoff-phase183-current",
            memory_context_snapshot_id: "snapshot-phase183-current",
            memory_context_snapshot_checksum: "snapshot-checksum-phase183-current",
            task_agent_session_id: currentTaskSession,
            native_session_id: currentNativeSession,
            execution_id: "execution-phase183-current",
            receipt_status: "done",
            receipt,
            timeline_event: { id: "phase183-child-agent-receipt", type: "child_agent_receipt", at: "2026-07-11T00:41:00.000Z" },
        }, { at: "2026-07-11T00:41:00.000Z" });
        const assignmentLedger = readReplayRepairDispatchBindingLedgerForCoordinator(groupA);
        const persistedBinding = (assignmentLedger.entries || []).find((entry) => entry.binding_id === binding?.binding_id) || {};
        const receiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds: [groupA], tasks: [] });
        const groupAReport = (report.groups || []).find((row) => row.groupId === groupA) || {};
        const groupBReport = (report.groups || []).find((row) => row.groupId === groupB) || {};
        const renderedPacket = renderWorkerContextPacket(packet);
        const historicalTaskSessions = (0, memory_control_center_1.normalizeQualityStringList)(contract.historical_task_agent_session_ids || []);
        const historicalNativeSessions = (0, memory_control_center_1.normalizeQualityStringList)(contract.historical_native_session_ids || []);
        const checks = {
            twoGroupsAndTwoFreshSessionsPass: report.overall?.status === "ok"
                && Number(report.overall?.checkedGroupCount || 0) === 2
                && Number(report.overall?.groupsCovered || 0) === 2
                && Number(report.overall?.firstSessionRecallCount || 0) === 2
                && Number(report.overall?.secondSessionRecallCount || 0) === 2
                && Number(report.overall?.distinctSessionBindingCount || 0) === 2,
            groupRecallIdentityIsIsolated: (groupAReport.completionWorkItemIds || []).includes(rowA.work_item_id)
                && !(groupAReport.completionWorkItemIds || []).includes(rowB.work_item_id)
                && (groupBReport.completionWorkItemIds || []).includes(rowB.work_item_id)
                && !(groupBReport.completionWorkItemIds || []).includes(rowA.work_item_id),
            packetCarriesCompletionMemoryContract: contract.corrected_receipt_completion_memory_active === true
                && requiredDocs.includes(completionDoc)
                && (contract.corrected_receipt_completion_work_item_ids || []).includes(rowA.work_item_id)
                && (contract.corrected_receipt_completion_timeline_binding_ids || []).includes(rowA.timeline_binding_id)
                && contract.current_task_agent_session_id === currentTaskSession
                && contract.current_native_session_id === currentNativeSession
                && packet.acceptance?.post_compact_receipt_memory_usage_repair_completion_memory_usage_required === true,
            historicalSessionsRemainEvidenceOnly: historicalTaskSessions.includes(rowA.original_task_agent_session_id)
                && historicalTaskSessions.includes(rowA.task_agent_session_id)
                && historicalNativeSessions.includes(rowA.original_native_session_id)
                && historicalNativeSessions.includes(rowA.native_session_id)
                && !historicalTaskSessions.includes(currentTaskSession)
                && !historicalNativeSessions.includes(currentNativeSession)
                && renderedPacket.includes("Historical original/repair sessions never authorize this child Agent session"),
            handoffRendersPerSessionReceiptContract: handoffText.includes(completionDoc)
                && handoffText.includes("不能替代当前会话")
                && handoffText.includes("memoryUsed")
                && handoffText.includes("memoryIgnored"),
            assignmentPersistsContractAndReceipt: persistedBinding.post_compact_reinjection_repair_receipt_memory_contract?.corrected_receipt_completion_memory_active === true
                && persistedBinding.worker_context_packet_receipt?.worker_context_packet_id === packet.packet_id
                && persistedBinding.worker_context_packet_receipt?.task_agent_session_id === currentTaskSession
                && persistedBinding.worker_context_packet_receipt?.native_session_id === currentNativeSession,
            realFreshReceiptPassesExistingValidator: receiptReport.overall?.status === "ok"
                && Number(receiptReport.overall?.receiptContractCount || 0) === 1
                && Number(receiptReport.overall?.coveredReceiptCount || 0) === 1,
            staleAndHistoricalSessionReceiptsRejected: groupAReport.staleCoverage?.pass === false
                && groupAReport.staleCoverage?.gaps?.includes("current_source_verified_missing")
                && groupAReport.historicalSessionCoverage?.pass === false
                && groupAReport.historicalSessionCoverage?.gaps?.includes("task_agent_session_mismatch")
                && groupAReport.historicalSessionCoverage?.gaps?.includes("native_session_mismatch"),
            qualityCheckRegisteredAndPasses: quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 2
                && Number(qualityCheck.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            receiptReport: receiptReport.overall,
            quality: { status: qualityCheck.status || "", checked: qualityCheck.checked || 0, passed: qualityCheck.passed || 0 },
            groupA: { workItemIds: groupAReport.completionWorkItemIds || [], requiredDocs: groupAReport.requiredDocRelPaths || [] },
            groupB: { workItemIds: groupBReport.completionWorkItemIds || [], requiredDocs: groupBReport.requiredDocRelPaths || [] },
        };
    }
    finally {
        for (const file of [bindingFileA, `${bindingFileA}.bak`, timelineFileA, `${timelineFileA}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationSelfTest() {
    const groupId = `memory-center-completion-memory-compaction-preservation-${process.pid}-${Date.now()}`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
    const workItemId = "post-compact-receipt-memory-usage-repair:PHASE184_MEMORY_CENTER";
    const timelineId = "replay-repair-brief-timeline:PHASE184_MEMORY_CENTER";
    const currentTaskSession = "task-agent-session-phase184-memory-center-current";
    const currentNativeSession = "native-session-phase184-memory-center-current";
    const historicalTaskSessions = ["task-agent-session-phase184-memory-center-original", "task-agent-session-phase184-memory-center-repair"];
    const historicalNativeSessions = ["native-session-phase184-memory-center-original", "native-session-phase184-memory-center-repair"];
    const methods = [
        "memory_first_deterministic_context_compaction",
        "replay_brief_partial_compact",
        "metadata_partial_compact",
        "deterministic_head_tail_critical_lines",
    ];
    const summary = {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
        present: true,
        completion_doc_rel_paths: [completionDoc],
        required_doc_rel_paths: [completionDoc],
        work_item_ids: [workItemId],
        timeline_binding_ids: [timelineId],
        historical_task_agent_session_ids: historicalTaskSessions,
        historical_native_session_ids: historicalNativeSessions,
        current_session_binding_id: "binding-phase184-memory-center-current",
        current_task_agent_session_id: currentTaskSession,
        current_native_session_id: currentNativeSession,
        usage_acceptance_required: true,
        current_session_acceptance_required: true,
        authority_boundary_valid: true,
    };
    const preservation = {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
        required: true,
        preserved: true,
        source: "worker_context_packet_compaction_retry",
        before: summary,
        after: summary,
        missing_completion_doc_rel_paths: [],
        missing_required_doc_rel_paths: [],
        missing_work_item_ids: [],
        missing_timeline_binding_ids: [],
        missing_historical_task_agent_session_ids: [],
        missing_historical_native_session_ids: [],
        gaps: [],
    };
    try {
        const orchestratorSelfTest = require("../collaboration/group-orchestrator").runWorkerContextCompletionMemoryCompactionPreservationSelfTest();
        const bindingEntries = methods.map((method, index) => {
            const retryId = `phase184-memory-center-retry-${index}`;
            const hookRunId = `phase184-memory-center-hook-${index}`;
            const recovered = index > 0;
            return {
                schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
                binding_id: `phase184-memory-center-binding-${index}`,
                assignment_id: `phase184-memory-center-assignment-${index}`,
                dispatch_key: `phase184-memory-center-dispatch-${index}`,
                groupId,
                project: "api",
                worker_context_packet_id: `phase184-memory-center-packet-${index}`,
                dispatch_ready: recovered,
                worker_context_packet_compact_hook_run_id: hookRunId,
                worker_context_packet_context_usage: { status: recovered ? "ok" : "over_budget" },
                worker_context_pre_dispatch_gate: { dispatch_ready: recovered, context_compaction_retry: null },
                worker_context_packet_compaction_retry: {
                    schema: "ccm-worker-context-compaction-retry-v1",
                    retry_id: retryId,
                    method,
                    status: recovered ? "recovered" : "blocked",
                    from_packet_id: `phase184-memory-center-from-packet-${index}`,
                    retry_packet_id: `phase184-memory-center-packet-${index}`,
                    from_usage_status: "over_budget",
                    retry_usage_status: recovered ? "ok" : "over_budget",
                    from_total_tokens: 9000,
                    retry_total_tokens: recovered ? 4200 : 5200,
                    from_free_tokens: -3000,
                    retry_free_tokens: recovered ? 800 : -200,
                    compact_hook_run_id: hookRunId,
                    memory_first: index === 0,
                    memory_compaction: index === 0 ? {
                        schema: "ccm-worker-context-memory-first-compaction-v1",
                        status: "compacted",
                        original_memory_chars: 12000,
                        compacted_memory_chars: 3000,
                        omitted_chars: 9000,
                        original_memory_hash: "phase184-original-memory-hash",
                        compacted_memory_hash: "phase184-compacted-memory-hash",
                    } : null,
                    partial_compact: index === 1 || index === 2,
                    partial_compaction: index === 1 ? {
                        schema: "ccm-worker-context-replay-brief-partial-compaction-v1",
                        category: "replay_repair_dispatch_briefs",
                        omitted_chars: 4000,
                        preserved_fields: ["brief_id", "work_item_id"],
                    } : index === 2 ? {
                        schema: "ccm-worker-context-metadata-partial-compaction-v1",
                        category: "worker_context_metadata",
                        categories: ["constraints_and_documents"],
                        omitted_chars: 5000,
                        preserved_fields: ["contract_injections.injection_id"],
                    } : null,
                    ptl_emergency_hint: index === 3 ? { schema: "ccm-worker-context-ptl-emergency-hint-v1", engaged: true, emergency_level: "critical" } : null,
                    original_task_hash: `phase184-task-hash-${index}`,
                    compacted_task_hash: index === 3 ? `phase184-compacted-task-hash-${index}` : `phase184-task-hash-${index}`,
                    original_task_chars: 8000,
                    compacted_task_chars: index === 3 ? 2200 : 8000,
                    omitted_chars: index === 3 ? 5800 : 4000,
                    preserved_receipt_contract: true,
                    post_compact_receipt_memory_usage_repair_completion_preservation: { ...preservation, retry_id: retryId },
                    post_compact_receipt_memory_usage_repair_completion_preserved: true,
                },
            };
        });
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            entries: bindingEntries,
            bindingCount: bindingEntries.length,
            updatedAt: "2026-07-11T01:20:00.000Z",
        });
        const outcomeEntries = bindingEntries.map((entry, index) => {
            const retry = entry.worker_context_packet_compaction_retry;
            return {
                schema: "ccm-worker-context-compact-outcome-entry-v1",
                outcome_id: `phase184-memory-center-outcome-${index}`,
                group_id: groupId,
                assignment_id: entry.assignment_id,
                dispatch_key: entry.dispatch_key,
                project: "api",
                hook_run_id: entry.worker_context_packet_compact_hook_run_id,
                retry_id: retry.retry_id,
                method: retry.method,
                status: retry.status,
                dispatch_ready: entry.dispatch_ready,
                from_packet_id: retry.from_packet_id,
                retry_packet_id: retry.retry_packet_id,
                from_total_tokens: retry.from_total_tokens,
                retry_total_tokens: retry.retry_total_tokens,
                from_free_tokens: retry.from_free_tokens,
                retry_free_tokens: retry.retry_free_tokens,
                token_delta: retry.from_total_tokens - retry.retry_total_tokens,
                free_token_delta: retry.retry_free_tokens - retry.from_free_tokens,
                memory_first: retry.memory_first,
                partial_compact: retry.partial_compact,
                task_compacted: index === 3,
                task_hash_unchanged: index !== 3,
                partial_compaction_categories: index === 1 ? ["replay_repair_dispatch_briefs"] : index === 2 ? ["constraints_and_documents"] : [],
                ptl_emergency_hint: retry.ptl_emergency_hint,
                post_compact_receipt_memory_usage_repair_completion_preservation: { ...preservation, retry_id: retry.retry_id },
                post_compact_receipt_memory_usage_repair_completion_preserved: true,
                at: `2026-07-11T01:20:0${index}.000Z`,
            };
        });
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            entries: outcomeEntries,
            updatedAt: "2026-07-11T01:20:04.000Z",
        });
        const report = (0, memory_control_center_1.buildPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationReport)({ groupIds: [groupId] });
        const quality = (0, memory_control_center_1.evaluatePostCompactReceiptMemoryUsageRepairCompletionCompactionPreservation)({ groupIds: [groupId] });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_reinjection_repair_receipt_memory_usage_repair_completion_compaction_preservation"],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityCheck = (qualityReport.checks || []).find((item) => item.id === "post_compact_reinjection_repair_receipt_memory_usage_repair_completion_compaction_preservation") || {};
        const group = report.groups?.[0] || {};
        const checks = {
            orchestratorFourStrategySelfTestPasses: orchestratorSelfTest.pass === true,
            reportCoversAllPersistedStrategies: report.overall?.status === "ok"
                && Number(report.overall?.requiredOutcomeCount || 0) === 4
                && Number(report.overall?.preservedOutcomeCount || 0) === 4
                && Number(report.overall?.memoryFirstCount || 0) === 1
                && Number(report.overall?.replayPartialCount || 0) === 1
                && Number(report.overall?.metadataPartialCount || 0) === 1
                && Number(report.overall?.ptlEmergencyCount || 0) === 1,
            persistedProofKeepsExactIdentityAndAuthority: (group.outcomes || []).every((outcome) => (outcome.completion_doc_rel_paths || []).includes(completionDoc)
                && (outcome.completion_work_item_ids || []).includes(workItemId)
                && (outcome.completion_timeline_binding_ids || []).includes(timelineId)
                && outcome.completion_current_task_agent_session_id === currentTaskSession
                && outcome.completion_current_native_session_id === currentNativeSession
                && outcome.completion_authority_boundary_valid === true),
            qualityCheckRegisteredAndPasses: quality.status === "ok"
                && Number(quality.checked || 0) === 4
                && Number(quality.passed || 0) === 4
                && qualityCheck.status === "ok"
                && Number(qualityCheck.checked || 0) === 4
                && Number(qualityCheck.passed || 0) === 4,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            report: report.overall,
            quality: { status: qualityCheck.status || "", checked: qualityCheck.checked || 0, passed: qualityCheck.passed || 0 },
            orchestrator: orchestratorSelfTest.scenarios || [],
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
function runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationRepairSelfTest() {
    const groupId = `memory-center-completion-preservation-repair-${process.pid}-${Date.now()}`;
    const decoyGroupId = `${groupId}-other-group`;
    const bindingFile = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
    const outcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId);
    const decoyOutcomeFile = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(decoyGroupId);
    const workItemsFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId);
    const dispatchPlanFile = (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId);
    const typedDir = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
    const completionWorkItemId = "post-compact-receipt-memory-usage-repair:PHASE185";
    const completionTimelineId = "replay-repair-brief-timeline:PHASE185";
    const currentBindingId = "phase185-current-session-binding";
    const currentTaskSession = "phase185-current-task-session";
    const currentNativeSession = "phase185-current-native-session";
    const historicalTaskSession = "phase185-historical-task-session";
    const historicalNativeSession = "phase185-historical-native-session";
    const failedRetryId = "phase185-failed-retry";
    const failedOutcomeId = "phase185-failed-outcome";
    const assignmentId = "phase185-assignment";
    const summary = {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
        present: true,
        completion_doc_rel_paths: [completionDoc],
        required_doc_rel_paths: [completionDoc],
        work_item_ids: [completionWorkItemId],
        timeline_binding_ids: [completionTimelineId],
        historical_task_agent_session_ids: [historicalTaskSession],
        historical_native_session_ids: [historicalNativeSession],
        current_session_binding_id: currentBindingId,
        current_task_agent_session_id: currentTaskSession,
        current_native_session_id: currentNativeSession,
        usage_acceptance_required: true,
        current_session_acceptance_required: true,
        authority_boundary_valid: true,
    };
    const failedAfter = {
        ...summary,
        completion_doc_rel_paths: [],
        work_item_ids: [],
        timeline_binding_ids: [],
        current_task_agent_session_id: historicalTaskSession,
        authority_boundary_valid: false,
    };
    const failedPreservation = {
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
        required: true,
        preserved: false,
        source: "worker_context_packet_compaction_retry",
        retry_id: failedRetryId,
        before: summary,
        after: failedAfter,
        missing_completion_doc_rel_paths: [completionDoc],
        missing_required_doc_rel_paths: [],
        missing_work_item_ids: [completionWorkItemId],
        missing_timeline_binding_ids: [completionTimelineId],
        missing_historical_task_agent_session_ids: [],
        missing_historical_native_session_ids: [],
        gaps: [
            "completion_doc_rel_paths_missing_after_compact",
            "completion_work_item_ids_missing_after_compact",
            "completion_timeline_binding_ids_missing_after_compact",
            "current_task_agent_session_changed_after_compact",
            "historical_session_promoted_to_current_authority",
        ],
    };
    const bindingEntry = {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
        binding_id: "phase185-failed-binding",
        assignment_id: assignmentId,
        dispatch_key: "phase185-dispatch",
        groupId,
        project: "api",
        worker_context_packet_id: "phase185-failed-packet",
        dispatch_ready: false,
        worker_context_packet_compact_hook_run_id: "phase185-failed-hook",
        worker_context_packet_compaction_retry: {
            schema: "ccm-worker-context-compaction-retry-v1",
            retry_id: failedRetryId,
            method: "memory_first_deterministic_context_compaction",
            status: "blocked",
            from_packet_id: "phase185-from-packet",
            retry_packet_id: "phase185-failed-packet",
            post_compact_receipt_memory_usage_repair_completion_preservation: failedPreservation,
            post_compact_receipt_memory_usage_repair_completion_preserved: false,
        },
        updatedAt: "2026-07-12T01:00:00.000Z",
    };
    const failedOutcome = {
        schema: "ccm-worker-context-compact-outcome-entry-v1",
        outcome_id: failedOutcomeId,
        group_id: groupId,
        assignment_id: assignmentId,
        dispatch_key: "phase185-dispatch",
        project: "api",
        hook_run_id: "phase185-failed-hook",
        retry_id: failedRetryId,
        method: "memory_first_deterministic_context_compaction",
        status: "blocked",
        dispatch_ready: false,
        post_compact_receipt_memory_usage_repair_completion_preservation: failedPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: false,
        at: "2026-07-12T01:00:01.000Z",
    };
    const tasksBefore = (0, db_1.loadTasks)().length;
    try {
        (0, memory_control_center_1.writeJsonAtomic)(bindingFile, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file: bindingFile,
            entries: [bindingEntry],
            updatedAt: "2026-07-12T01:00:01.000Z",
        });
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            entries: [failedOutcome],
            updatedAt: "2026-07-12T01:00:01.000Z",
        });
        const firstWorkReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-12T01:00:02.000Z" });
        const firstLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const firstItems = (firstLedger.items || []).filter((item) => (0, memory_control_center_1.isPostCompactCompletionPreservationRepairSource)(item.source));
        const secondWorkReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-12T01:00:03.000Z" });
        const secondLedger = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupId);
        const secondItems = (secondLedger.items || []).filter((item) => (0, memory_control_center_1.isPostCompactCompletionPreservationRepairSource)(item.source));
        const candidateReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairDispatchCandidateReport)({ groupIds: [groupId], workItemReport: secondWorkReport });
        const briefReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairDispatchBriefReport)({ groupIds: [groupId], candidateReport, generatedAt: "2026-07-12T01:00:04.000Z" });
        const candidate = candidateReport.groups?.[0]?.candidates?.[0] || {};
        const brief = briefReport.groups?.[0]?.briefs?.[0] || {};
        const wrongSummary = {
            ...summary,
            current_task_agent_session_id: historicalTaskSession,
            authority_boundary_valid: false,
        };
        const wrongPreservation = {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
            required: true,
            preserved: true,
            source: "worker_context_packet_compaction_retry",
            retry_id: "phase185-wrong-retry",
            before: summary,
            after: wrongSummary,
            gaps: [],
        };
        const wrongOutcome = {
            ...failedOutcome,
            outcome_id: "phase185-wrong-outcome",
            retry_id: "phase185-wrong-retry",
            hook_run_id: "phase185-wrong-hook",
            status: "recovered",
            dispatch_ready: true,
            post_compact_receipt_memory_usage_repair_completion_preservation: wrongPreservation,
            post_compact_receipt_memory_usage_repair_completion_preserved: true,
            at: "2026-07-12T01:00:05.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            entries: [failedOutcome, wrongOutcome],
            updatedAt: "2026-07-12T01:00:05.000Z",
        });
        const wrongReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-12T01:00:06.000Z" });
        const wrongItem = wrongReport.groups?.[0]?.items?.[0] || {};
        const correctedPreservation = {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
            required: true,
            preserved: true,
            source: "worker_context_packet_compaction_retry",
            retry_id: "phase185-corrected-retry",
            before: summary,
            after: summary,
            missing_completion_doc_rel_paths: [],
            missing_required_doc_rel_paths: [],
            missing_work_item_ids: [],
            missing_timeline_binding_ids: [],
            missing_historical_task_agent_session_ids: [],
            missing_historical_native_session_ids: [],
            gaps: [],
        };
        const correctedOutcome = {
            ...failedOutcome,
            outcome_id: "phase185-corrected-outcome",
            retry_id: "phase185-corrected-retry",
            hook_run_id: "phase185-corrected-hook",
            status: "recovered",
            dispatch_ready: true,
            post_compact_receipt_memory_usage_repair_completion_preservation: correctedPreservation,
            post_compact_receipt_memory_usage_repair_completion_preserved: true,
            at: "2026-07-12T01:00:07.000Z",
        };
        (0, memory_control_center_1.writeJsonAtomic)(decoyOutcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId: decoyGroupId,
            file: decoyOutcomeFile,
            entries: [{ ...correctedOutcome, group_id: decoyGroupId }],
            updatedAt: "2026-07-12T01:00:07.000Z",
        });
        const crossGroupReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-12T01:00:07.500Z" });
        const crossGroupItem = crossGroupReport.groups?.[0]?.items?.[0] || {};
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFile, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            file: outcomeFile,
            entries: [failedOutcome, wrongOutcome, correctedOutcome],
            updatedAt: "2026-07-12T01:00:07.000Z",
        });
        const correctedWorkReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds: [groupId], generatedAt: "2026-07-12T01:00:08.000Z" });
        const correctedItem = correctedWorkReport.groups?.[0]?.items?.[0] || {};
        const closedCandidateReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairDispatchCandidateReport)({ groupIds: [groupId], workItemReport: correctedWorkReport });
        const closedBriefReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairDispatchBriefReport)({ groupIds: [groupId], candidateReport: closedCandidateReport, generatedAt: "2026-07-12T01:00:09.000Z" });
        const closureReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairClosureReport)({ groupIds: [groupId], workItemReport: correctedWorkReport });
        const closureTypedLedger = (0, memory_control_center_1.readJson)(path.join(typedDir, ".distillation-ledger.json"), {});
        const closureTypedRows = closureTypedLedger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_work_items",
                "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure",
            ],
            groupIds: [groupId],
            tasks: [],
            refresh: true,
        });
        const qualityChecks = qualityReport.checks || [];
        const checks = {
            idempotentWorkItem: firstWorkReport.overall?.status === "ok"
                && firstItems.length === 1
                && secondItems.length === 1
                && firstItems[0]?.id === secondItems[0]?.id
                && Number(secondItems[0]?.seenCount || 0) === Number(firstItems[0]?.seenCount || 0),
            candidateExactAndNoRealTask: candidateReport.overall?.status === "ok"
                && candidate.shouldCreateRealTask === false
                && candidate.completion_preservation_completion_doc_rel_paths?.includes(completionDoc)
                && candidate.completion_preservation_work_item_ids?.includes(completionWorkItemId)
                && candidate.completion_preservation_timeline_binding_ids?.includes(completionTimelineId)
                && candidate.completion_preservation_current_task_agent_session_id === currentTaskSession,
            briefSelfContainedAndNoRealTask: briefReport.overall?.status === "ok"
                && brief.should_create_real_task === false
                && String(brief.worker_task || "").includes(failedRetryId)
                && String(brief.worker_task || "").includes(completionWorkItemId)
                && String(brief.worker_task || "").includes(currentNativeSession),
            wrongHistoricalAuthorityCannotClose: (0, memory_control_center_1.replayRepairWorkItemOpen)(wrongItem.status)
                && !wrongItem.corrected_compact_outcome_id,
            crossGroupCorrectedOutcomeCannotClose: (0, memory_control_center_1.replayRepairWorkItemOpen)(crossGroupItem.status)
                && !crossGroupItem.corrected_compact_outcome_id,
            correctedOutcomeStrictlyCloses: correctedItem.status === "completed"
                && correctedItem.resolutionReason === "completion_memory_compaction_preservation_corrected_retry_verified"
                && correctedItem.completion_source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry"
                && correctedItem.corrected_compact_outcome_id === correctedOutcome.outcome_id
                && correctedItem.corrected_retry_proof?.exact_identity_restored === true
                && correctedItem.corrected_retry_proof?.current_session_boundary_restored === true,
            readyDispatchRetiredAfterClosure: Number(closedCandidateReport.overall?.expectedCandidateCount || 0) === 0
                && Number(closedBriefReport.overall?.expectedBriefCount || 0) === 0
                && !(closedBriefReport.groups?.[0]?.briefs || []).some((item) => item.status === "ready"),
            closureQualityPasses: closureReport.overall?.status === "ok"
                && Number(closureReport.overall?.verifiedClosureCount || 0) === 1
                && qualityChecks.every((item) => ["ok", "empty"].includes(String(item.status || ""))),
            correctedClosureAutomaticallyDistilled: closureTypedRows.length === 1
                && closureTypedRows[0]?.failed_outcome_id === failedOutcomeId
                && closureTypedRows[0]?.corrected_outcome_id === correctedOutcome.outcome_id
                && fs.existsSync(path.join(typedDir, "post-compact-completion-memory-preservation-repair-closures.md")),
            memoryCenterCreatedNoTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            workItems: correctedWorkReport.overall,
            candidates: candidateReport.overall,
            briefs: briefReport.overall,
            closure: closureReport.overall,
            quality: qualityChecks.map((item) => ({ id: item.id, status: item.status, checked: item.checked, passed: item.passed })),
        };
    }
    finally {
        for (const file of [bindingFile, `${bindingFile}.bak`, outcomeFile, `${outcomeFile}.bak`, decoyOutcomeFile, `${decoyOutcomeFile}.bak`, workItemsFile, `${workItemsFile}.bak`, dispatchPlanFile, `${dispatchPlanFile}.bak`]) {
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
//# sourceMappingURL=memory-control-repair-self-tests.js.map