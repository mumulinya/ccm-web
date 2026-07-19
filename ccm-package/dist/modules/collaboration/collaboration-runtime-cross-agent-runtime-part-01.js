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
exports.processCrossAgents = processCrossAgents;
exports.resumeAgentQaFromStoredContinuation = resumeAgentQaFromStoredContinuation;
exports.retryAgentQaItem = retryAgentQaItem;
exports.handleAgentQaRequests = handleAgentQaRequests;
exports.evaluateCoordinationImplementationReceipt = evaluateCoordinationImplementationReceipt;
exports.evaluateCoordinationTaskEvidence = evaluateCoordinationTaskEvidence;
exports.getCoordinationRequestForTask = getCoordinationRequestForTask;
exports.getCoordinationQaForRequest = getCoordinationQaForRequest;
exports.coordinationAuditHas = coordinationAuditHas;
// Behavior-freeze split from collaboration-runtime-cross-agent-runtime.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 4/9).
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const memory_context_consumption_receipt_1 = require("../../integrations/memory-context-consumption-receipt");
const group_coordination_store_1 = require("./group-coordination-store");
const agent_qa_service_1 = require("./agent-qa-service");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const agent_receipts_1 = require("./agent-receipts");
const agent_notifications_1 = require("./agent-notifications");
const logs_1 = require("./logs");
const test_agent_runner_1 = require("./test-agent-runner");
const storage_1 = require("./storage");
const runtime_1 = require("../../agents/runtime");
const worktree_1 = require("../../agents/worktree");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const task_agent_invocation_lineage_1 = require("../../tasks/task-agent-invocation-lineage");
const collaboration_resilience_1 = require("./collaboration-resilience");
const memory_2 = require("../../projects/memory");
const collaboration_protocol_1 = require("../../agents/collaboration-protocol");
const protocol_gates_1 = require("./protocol-gates");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const worker_handoff_1 = require("../../agents/worker-handoff");
const final_dispatch_payload_gate_1 = require("../../agents/final-dispatch-payload-gate");
const final_dispatch_reactive_compact_1 = require("../../agents/final-dispatch-reactive-compact");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_test_agent_handoff_1 = require("./collaboration-runtime-test-agent-handoff");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
// === 跨 Agent 并行与递归协作（核心）===
const collaboration_runtime_cross_agent_runtime_part_02_1 = require("./collaboration-runtime-cross-agent-runtime-part-02");
async function processCrossAgents(groupId, group, sourceProject, output, atMentions, configs, ctx, streamRes = null, depth = 0, seenMentions = new Set(), executionOrder = "parallel", planMessageId = "", taskId = "") {
    return require("./collaboration-cross-agents").processCrossAgents(groupId, group, sourceProject, output, atMentions, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, {
        addGroupLog: logs_1.addGroupLog,
        addTaskLog: logs_1.addTaskLog,
        admitChildTypedMemoryDelivery: memory_1.admitChildTypedMemoryDelivery,
        appendAgentQaTrace: agent_qa_service_1.appendAgentQaTrace,
        appendGroupMessage: storage_1.appendGroupMessage,
        appendTaskTimelineEvent: logs_1.appendTaskTimelineEvent,
        attachExecutionWorkspace: execution_kernel_1.attachExecutionWorkspace,
        attachInvokedSkillsToReceipt: collaboration_runtime_task_queue_1.attachInvokedSkillsToReceipt,
        attachMemoryContextConsumptionChallenge: memory_context_consumption_receipt_1.attachMemoryContextConsumptionChallenge,
        attachTaskAgentFinalDispatchPayloadGate: agent_sessions_1.attachTaskAgentFinalDispatchPayloadGate,
        bindTaskAgentInvocationContext: task_agent_invocation_lineage_1.bindTaskAgentInvocationContext,
        bindTaskAgentInvocationMemoryDelivery: task_agent_invocation_lineage_1.bindTaskAgentInvocationMemoryDelivery,
        bindTaskAgentInvocationRunnerRequest: task_agent_invocation_lineage_1.bindTaskAgentInvocationRunnerRequest,
        bindTaskAgentMemoryContextSnapshot: agent_sessions_1.bindTaskAgentMemoryContextSnapshot,
        buildAckPreflightReview: protocol_gates_1.buildAckPreflightReview,
        buildAgentMemoryContextBundleWithManifestSelection: memory_1.buildAgentMemoryContextBundleWithManifestSelection,
        buildAgentMemoryPacket: memory_1.buildAgentMemoryPacket,
        buildAgentQaProtocolInstructions: collaboration_runtime_task_queue_1.buildAgentQaProtocolInstructions,
        buildAgentToolContext: collaboration_runtime_plan_tools_1.buildAgentToolContext,
        buildChildAgentDevelopmentContract: collaboration_runtime_task_queue_1.buildChildAgentDevelopmentContract,
        buildChildAgentTaskText: collaboration_runtime_task_queue_1.buildChildAgentTaskText,
        buildChildAgentWorkerHandoff: collaboration_runtime_task_queue_1.buildChildAgentWorkerHandoff,
        buildChildAgentWorktreeNotice: worktree_1.buildChildAgentWorktreeNotice,
        buildCollaborationConflictPlan: collaboration_resilience_1.buildCollaborationConflictPlan,
        orderMentionsForConflictPlan: collaboration_resilience_1.orderMentionsForConflictPlan,
        buildCoordinatorCollaborationInstructions: group_orchestrator_1.buildCoordinatorCollaborationInstructions,
        buildCoordinatorReworkContinuationFallback: collaboration_runtime_test_agent_handoff_1.buildCoordinatorReworkContinuationFallback,
        buildCoordinatorSharedFilesContext: collaboration_runtime_plan_tools_1.buildCoordinatorSharedFilesContext,
        buildFinalWorkerDispatchPayloadGate: final_dispatch_payload_gate_1.buildFinalWorkerDispatchPayloadGate,
        buildGroupContextPacket: memory_1.buildGroupContextPacket,
        buildMemberCollaborationInstructions: group_orchestrator_1.buildMemberCollaborationInstructions,
        buildNativeTestAgentPlanBlockedReceipt: collaboration_runtime_test_agent_handoff_1.buildNativeTestAgentPlanBlockedReceipt,
        buildNativeTestAgentReceipt: collaboration_runtime_test_agent_handoff_1.buildNativeTestAgentReceipt,
        buildNativeTestAgentReviewSummary: collaboration_runtime_test_agent_handoff_1.buildNativeTestAgentReviewSummary,
        buildNativeTestAgentRuntimeToolContext: collaboration_runtime_test_agent_handoff_1.buildNativeTestAgentRuntimeToolContext,
        buildPostReviewSpotCheckSummary: post_review_spot_check_1.buildPostReviewSpotCheckSummary,
        buildProjectExecutionBrief: memory_2.buildProjectExecutionBrief,
        buildProjectVerificationHints: collaboration_runtime_runtime_tools_1.buildProjectVerificationHints,
        buildRuntimeRecoveryCandidates: collaboration_resilience_1.buildRuntimeRecoveryCandidates,
        buildRuntimeRecoveryPrompt: collaboration_resilience_1.buildRuntimeRecoveryPrompt,
        buildTaskPreflightReasoning: collaboration_runtime_task_queue_1.buildTaskPreflightReasoning,
        buildTaskProviderSwitchRequests: collaboration_runtime_task_queue_1.buildTaskProviderSwitchRequests,
        buildWorkerContinuationHandoff: collaboration_runtime_task_queue_1.buildWorkerContinuationHandoff,
        buildWorkflowMeta: collaboration_runtime_task_queue_1.buildWorkflowMeta,
        checkTaskFailure: agent_receipts_1.checkTaskFailure,
        claimTaskWorkItemForAgent: collaboration_runtime_task_queue_1.claimTaskWorkItemForAgent,
        commitChildTypedMemoryDelivery: memory_1.commitChildTypedMemoryDelivery,
        commitTaskAgentSessionCapacityRevalidation: agent_sessions_1.commitTaskAgentSessionCapacityRevalidation,
        compactMemoryText: memory_1.compactMemoryText,
        compactRuntimeToolAudit: collaboration_runtime_task_queue_1.compactRuntimeToolAudit,
        completeTaskAgentInvocationEdge: task_agent_invocation_lineage_1.completeTaskAgentInvocationEdge,
        coordinatorReworkRouteNeedsFreshVerifier: collaboration_runtime_cross_agent_runtime_part_02_1.coordinatorReworkRouteNeedsFreshVerifier,
        coordinatorReworkRouteRequiresStop: collaboration_runtime_cross_agent_runtime_part_02_1.coordinatorReworkRouteRequiresStop,
        coordinatorReworkRouteUsesVerifier: collaboration_runtime_cross_agent_runtime_part_02_1.coordinatorReworkRouteUsesVerifier,
        createChildTypedMemoryDispatchWal: memory_1.createChildTypedMemoryDispatchWal,
        createExecutionCheckpoint: execution_kernel_1.createExecutionCheckpoint,
        createMemoryContextConsumptionChallenge: memory_context_consumption_receipt_1.createMemoryContextConsumptionChallenge,
        dispatchTaskAgentInvocationEdge: task_agent_invocation_lineage_1.dispatchTaskAgentInvocationEdge,
        emitAssignmentStatus: collaboration_runtime_daily_dev_1.emitAssignmentStatus,
        ensureExecution: execution_kernel_1.ensureExecution,
        escapeRegExp: collaboration_runtime_task_queue_1.escapeRegExp,
        evaluateAdvisoryPermissionBoundary: collaboration_protocol_1.evaluateAdvisoryPermissionBoundary,
        evaluateGreenContract: execution_kernel_1.evaluateGreenContract,
        extractActionableMentions: collaboration_runtime_task_queue_1.extractActionableMentions,
        extractAgentReceipt: agent_receipts_1.extractAgentReceipt,
        extractRunnerVerificationEvidence: agent_receipts_1.extractRunnerVerificationEvidence,
        formatCollectedAgentOutput: agent_notifications_1.formatCollectedAgentOutput,
        formatNativeTestAgentOutput: collaboration_runtime_test_agent_handoff_1.formatNativeTestAgentOutput,
        formatNativeTestAgentPlanBlockedOutput: collaboration_runtime_test_agent_handoff_1.formatNativeTestAgentPlanBlockedOutput,
        getAgentDependencyStateFromOutputs: collaboration_runtime_status_helpers_1.getAgentDependencyStateFromOutputs,
        getChildAgentIsolationMode: collaboration_runtime_task_queue_1.getChildAgentIsolationMode,
        getCoordinatorActionMentions: collaboration_runtime_status_helpers_1.getCoordinatorActionMentions,
        getCoordinatorMember: group_orchestrator_1.getCoordinatorMember,
        getInitialWorkflowMeta: collaboration_runtime_task_queue_1.getInitialWorkflowMeta,
        getMentionReworkRoute: collaboration_runtime_cross_agent_runtime_part_02_1.getMentionReworkRoute,
        getProjectAgentCapabilityProfile: collaboration_runtime_plan_tools_1.getProjectAgentCapabilityProfile,
        getProjectExtraConfig: collaboration_runtime_plan_tools_1.getProjectExtraConfig,
        getReceiptAssignmentStatus: agent_receipts_1.getReceiptAssignmentStatus,
        getRoutableMembers: group_orchestrator_1.getRoutableMembers,
        getTaskAgentSessionOptions: agent_sessions_1.getTaskAgentSessionOptions,
        getTaskById: collaboration_runtime_task_queue_1.getTaskById,
        getTestAgentHandoffPayload: collaboration_runtime_test_agent_handoff_1.getTestAgentHandoffPayload,
        getTestAgentHandoffProjectWorkDir: collaboration_runtime_test_agent_handoff_1.getTestAgentHandoffProjectWorkDir,
        getTestAgentHandoffReviewSubject: collaboration_runtime_cross_agent_runtime_part_02_1.getTestAgentHandoffReviewSubject,
        getTestAgentHandoffWarnings: collaboration_runtime_test_agent_handoff_1.getTestAgentHandoffWarnings,
        getWorkDirState: collaboration_runtime_plan_tools_1.getWorkDirState,
        handleAgentQaRequests,
        inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker: agent_sessions_1.inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker,
        isCoordinatorTestAgentName: collaboration_runtime_cross_agent_runtime_part_02_1.isCoordinatorTestAgentName,
        isProviderPromptTooLongFailure: final_dispatch_reactive_compact_1.isProviderPromptTooLongFailure,
        loadExecution: execution_kernel_1.loadExecution,
        markChildTypedMemoryDispatchCommitted: memory_1.markChildTypedMemoryDispatchCommitted,
        markChildTypedMemoryDispatchStarted: memory_1.markChildTypedMemoryDispatchStarted,
        markChildTypedMemoryRunnerReturned: memory_1.markChildTypedMemoryRunnerReturned,
        memoryContextConsumptionReceiptFile: memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile,
        normalizeAgentRuntimeId: runtime_1.normalizeAgentRuntimeId,
        normalizeMentionTask: collaboration_runtime_task_queue_1.normalizeMentionTask,
        normalizePlanAssignments: collaboration_runtime_task_queue_1.normalizePlanAssignments,
        openTaskAgentSession: agent_sessions_1.openTaskAgentSession,
        prepareAgentRuntimeTools: collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools,
        prepareChildAgentWorkDir: worktree_1.prepareChildAgentWorkDir,
        prepareTaskAgentInvocationEdge: task_agent_invocation_lineage_1.prepareTaskAgentInvocationEdge,
        prepareTaskAgentSessionCapacityRevalidation: agent_sessions_1.prepareTaskAgentSessionCapacityRevalidation,
        recordAgentRuntimeLifecycle: runtime_kernel_1.recordAgentRuntimeLifecycle,
        recordReplayRepairTimelineBindingsForMention: collaboration_runtime_status_helpers_1.recordReplayRepairTimelineBindingsForMention,
        recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome: agent_sessions_1.recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome,
        recordTaskAgentMemoryContextDelivery: agent_sessions_1.recordTaskAgentMemoryContextDelivery,
        recordTaskAgentSessionTurn: agent_sessions_1.recordTaskAgentSessionTurn,
        recordWorkerContextProviderSwitchExecutionReceiptForCoordinator: group_orchestrator_1.recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
        recordWorkerContextProviderSwitchSessionBindingForCoordinator: group_orchestrator_1.recordWorkerContextProviderSwitchSessionBindingForCoordinator,
        recoverFinalWorkerDispatchPayload: final_dispatch_reactive_compact_1.recoverFinalWorkerDispatchPayload,
        renderGroupPostCompactDynamicContextDelta: memory_1.renderGroupPostCompactDynamicContextDelta,
        renderGroupPostCompactInvokedSkillAttachments: memory_1.renderGroupPostCompactInvokedSkillAttachments,
        renderGroupPostCompactPlanAttachment: memory_1.renderGroupPostCompactPlanAttachment,
        renderMemoryContextForWorker: worker_handoff_1.renderMemoryContextForWorker,
        resolveMemberRuntime: group_orchestrator_1.resolveMemberRuntime,
        runGroupOrchestrator: group_orchestrator_1.runGroupOrchestrator,
        runMainAgentPostReviewSpotCheck: post_review_spot_check_1.runMainAgentPostReviewSpotCheck,
        runTestAgentCliJob: test_agent_runner_1.runTestAgentCliJob,
        runtimeToolDispatchBlockedMessage: collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedMessage,
        runtimeToolDispatchBlockedReceipt: collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedReceipt,
        runtimeToolSnapshotFromAudit: collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit,
        shouldSwitchRuntime: collaboration_resilience_1.shouldSwitchRuntime,
        stopWrongDirectionWorkerForCoordinatorRoute: collaboration_runtime_test_agent_handoff_1.stopWrongDirectionWorkerForCoordinatorRoute,
        stripAgentQaProtocolBlocks: collaboration_runtime_status_helpers_1.stripAgentQaProtocolBlocks,
        summarizeNativeTestAgentExecutionPlan: collaboration_runtime_test_agent_handoff_1.summarizeNativeTestAgentExecutionPlan,
        summarizeReplayRepairTimelineBindingsForEvent: collaboration_runtime_status_helpers_1.summarizeReplayRepairTimelineBindingsForEvent,
        summarizeTaskAgentMemoryContextSnapshot: collaboration_runtime_task_queue_1.summarizeTaskAgentMemoryContextSnapshot,
        summarizeWorkerHandoffForUser: worker_handoff_1.summarizeWorkerHandoffForUser,
        taskAgentInvocationMemoryOptions: collaboration_runtime_task_queue_1.taskAgentInvocationMemoryOptions,
        taskAgentSessionLifecycleRunnerOptions: collaboration_runtime_task_queue_1.taskAgentSessionLifecycleRunnerOptions,
        taskRequiresCodeChanges: collaboration_runtime_status_helpers_1.taskRequiresCodeChanges,
        taskRequiresVerification: collaboration_runtime_status_helpers_1.taskRequiresVerification,
        transitionExecution: execution_kernel_1.transitionExecution,
        uniqueStrings: collaboration_runtime_status_helpers_1.uniqueStrings,
        updateGroupMemory: memory_1.updateGroupMemory,
        updateGroupTaskInlineStatus: collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus,
        updateTask: collaboration_runtime_runtime_tools_1.updateTask,
        updateTaskWorkItemFromReceipt: collaboration_runtime_task_queue_1.updateTaskWorkItemFromReceipt,
        validateTestAgentHandoffRegisteredWorkDirs: collaboration_runtime_test_agent_handoff_1.validateTestAgentHandoffRegisteredWorkDirs,
        verifyFinalWorkerDispatchPayloadGate: final_dispatch_payload_gate_1.verifyFinalWorkerDispatchPayloadGate,
        writeSse: collaboration_runtime_daily_dev_1.writeSse
    });
}
function arbitrateAgentQaRequest(request, group, sourceProject = "") {
    const text = `${request.question || ""}\n${request.reason || ""}`;
    const members = new Set((group.members || []).map((m) => String(m.project || "").trim()).filter(Boolean));
    if (!members.has(request.targetName)) {
        return { decision: "reject", reason: `目标 Agent 不在当前群聊成员中：${request.targetName}` };
    }
    if (request.targetName === sourceProject) {
        return { decision: "reject", reason: "不能把问题发回给自己" };
    }
    if (request.kind === "risk" || /用户确认|业务方确认|产品确认|人工确认|生产数据|密钥|token|密码|支付|扣款|删除生产|合规|隐私/i.test(text)) {
        return { decision: "ask_user", reason: "问题涉及用户/业务/高风险确认，需要主 Agent 暂停并让用户拍板" };
    }
    return { decision: "ask_agent", reason: request.reason || "目标 Agent 具备该问题的上下文" };
}
async function resumeAgentQaFromStoredContinuation(qa, group, ctx, streamRes = null) {
    if (!qa?.acceptance?.accepted || qa.blocking === false)
        return { resumed: false, reason: "回答未采纳或不是阻塞问题" };
    const continuation = qa.continuation || {};
    const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(qa.from_agent, group, (0, db_1.getConfigs)());
    const workDir = String(continuation.source_work_dir || runtime?.workDir || "").trim();
    const agentType = String(continuation.source_agent_type || runtime?.agentType || "claudecode").trim();
    if (!workDir)
        return { resumed: false, reason: "缺少原 Agent 工作目录，无法安全续跑" };
    const toolContext = (0, collaboration_runtime_plan_tools_1.buildAgentToolContext)(ctx, group, qa.from_agent, `${continuation.original_prompt || ""}\n${qa.question || ""}\n${qa.answer || ""}`);
    const resumedAllowedTools = continuation.allowed_tools || toolContext.allowedTools;
    const resumedToolOptions = continuation.allowed_tools
        ? { taskId: qa.task_id }
        : { taskId: qa.task_id, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness };
    const runtimeTools = (0, collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools)(qa.group_id, qa.from_agent, workDir, agentType, resumedAllowedTools, streamRes, resumedToolOptions);
    if (runtimeTools.dispatchBlocked) {
        const reason = (0, collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedMessage)(qa.from_agent, runtimeTools);
        (0, agent_qa_service_1.appendAgentQaTrace)(qa.task_id, "agent.qa.runtime_tool_dispatch_blocked", qa, reason, "warn", { runtime_tool_dispatch_gate: runtimeTools.dispatchGate });
        if (qa.task_id)
            (0, logs_1.appendTaskTimelineEvent)(qa.task_id, { type: "runtime_tool_dispatch_blocked", title: `${qa.from_agent} 工具授权派发被阻断`, detail: reason, status: "warn", phase: "waiting_dependency", agent: qa.from_agent, data: { runtime_tool_dispatch_gate: runtimeTools.dispatchGate } });
        return { resumed: false, reason, runtimeToolDispatchGate: runtimeTools.dispatchGate };
    }
    let session = (0, agent_sessions_1.openTaskAgentSession)({ scopeId: qa.task_id, taskId: qa.task_id, groupId: qa.group_id, project: qa.from_agent, agentType });
    let nativeSessionId = "";
    let nativeContinuationEvidence = null;
    let succeeded = true;
    let error = "";
    const prompt = [
        "CCM Agent 协作协议已收到一个先前阻塞问题的合格回答。请从同一任务会话继续，不要从零重做。",
        `问题 ID：${qa.id}`,
        `原任务：${(0, memory_1.compactMemoryText)(continuation.original_prompt || "", 2400)}`,
        `问题：${qa.question}`,
        `回答：${(0, memory_1.compactMemoryText)(qa.answer || "", 3000)}`,
        qa.answer_evidence?.length ? `证据：${qa.answer_evidence.join("；")}` : "",
        "只处理回答解除后的剩余缺口；完成后提交新的 CCM_AGENT_RECEIPT。",
    ].filter(Boolean).join("\n\n");
    const messageId = "m" + Date.now().toString(36) + "qawake" + crypto.randomBytes(2).toString("hex");
    const output = await ctx.callAgentForGroupStream(qa.from_agent, prompt, workDir, agentType, {
        res: streamRes,
        groupId: qa.group_id,
        timeoutMs: 300000,
        messageId,
        allowedTools: resumedAllowedTools,
        mcpConfigPath: continuation.mcp_config_path || runtimeTools.audit.mcpConfigPath,
        taskId: qa.task_id,
        executionId: qa.execution_id || qa.task_id,
        agentSession: session ? (0, agent_sessions_1.getTaskAgentSessionOptions)(session) : null,
        onDone: (opts) => {
            nativeSessionId = String(opts?.nativeSessionId || "");
            nativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
            succeeded = opts?.isError !== true;
            error = String(opts?.error || opts?.message || "");
        },
    });
    if (session)
        session = (0, agent_sessions_1.recordTaskAgentSessionTurn)(session.id, {
            nativeSessionId,
            nativeContinuationEvidence,
            nativeContinuationUnverified: nativeContinuationEvidence?.nativeResumeRequested === true
                && nativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
            success: succeeded,
            error: error || (!succeeded ? output : ""),
            runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeTools.audit, resumedAllowedTools),
        }) || session;
    const at = new Date().toISOString();
    const resumed = (0, agent_qa_service_1.upsertAgentQaItem)({
        ...qa,
        status: "resumed",
        injected_at: qa.injected_at || at,
        resumed_at: at,
        resume_message_id: messageId,
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at, type: "event_wakeup", detail: "回答到达后自动唤醒原 Agent 任务会话" }].slice(-30),
    });
    (0, storage_1.appendGroupMessage)(qa.group_id, { id: messageId, role: "assistant", agent: qa.from_agent, type: "agent_qa_resume", content: output, timestamp: at, task_id: qa.task_id, qa: { ...resumed, kind: "resume", status: "resumed" } });
    (0, agent_qa_service_1.emitAgentQaEvent)(streamRes, "resume", resumed, output);
    (0, agent_qa_service_1.appendAgentQaTrace)(qa.task_id, "agent.qa.event_wakeup", resumed, `${qa.from_agent} 已在回答到达后自动续跑`, succeeded ? "ok" : "warn", { session_id: session?.id || "", native_session_id: session?.nativeSessionId || "", resume_mode: session?.resumeMode || "" });
    if (qa.task_id)
        (0, logs_1.appendTaskTimelineEvent)(qa.task_id, { type: "agent_qa_resume", title: `${qa.from_agent} 已由回答事件唤醒`, detail: (0, memory_1.compactMemoryText)(output, 500), status: succeeded ? "ok" : "warn", phase: "executing", agent: qa.from_agent, data: { qa_id: qa.id, session_id: session?.id || "", native_session_id: session?.nativeSessionId || "", resume_mode: session?.resumeMode || "" } });
    if (qa.task_id)
        (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)((0, collaboration_runtime_task_queue_1.getTaskById)(qa.task_id) || { id: qa.task_id, group_id: qa.group_id }, "in_progress", `${qa.from_agent} 已收到回答并自动续跑`);
    return { resumed: true, item: resumed, output, session };
}
async function retryAgentQaItem(id, ctx, streamRes = null) {
    (0, agent_qa_service_1.markExpiredAgentQaItems)();
    const current = (0, agent_qa_service_1.loadAgentQaItems)().find((item) => item.id === id);
    if (!current)
        return { success: false, error: "问答记录不存在" };
    if (Number(current.retry_count || 0) >= 2)
        return { success: false, error: "该问答已达到最大重试次数，请换 Agent 或人工接管" };
    const group = (0, storage_1.loadGroups)().find((item) => item.id === current.group_id);
    if (!group)
        return { success: false, error: "群聊不存在" };
    const request = {
        type: current.type || "ask_agent",
        targetName: current.to_agent,
        question: current.question,
        reason: current.reason || "用户触发重试",
        blocking: current.blocking !== false,
    };
    const retryStartedAt = new Date().toISOString();
    const qa = (0, agent_qa_service_1.upsertAgentQaItem)({
        ...current,
        status: "asking",
        retry_count: Number(current.retry_count || 0) + 1,
        timeout_at: new Date(Date.now() + agent_qa_service_1.AGENT_QA_TIMEOUT_MS).toISOString(),
        retry_started_at: retryStartedAt,
        manual_takeover: false,
        audit: [...(Array.isArray(current.audit) ? current.audit : []), { at: retryStartedAt, type: "retry", detail: "用户触发重试目标 Agent 回答" }].slice(-30),
    });
    (0, storage_1.appendGroupMessage)(current.group_id, (0, agent_qa_service_1.buildAgentQaMessage)("question", qa, qa.question));
    (0, agent_qa_service_1.emitAgentQaEvent)(streamRes, "question", qa, qa.question);
    const mention = {
        mention: `@${request.targetName}`,
        targetName: request.targetName,
        message: [
            `【Agent-to-Agent ${request.type === "request_review" ? "评审请求重试" : "询问重试"}】`,
            `来自：${current.from_agent}`,
            request.reason ? `原因：${request.reason}` : "",
            `问题：${request.question}`,
            "请直接回答该 Agent 的问题；可以自然语言回答，也可以输出 reply_agent 工具调用。",
        ].filter(Boolean).join("\n"),
        requestId: qa.id,
        advisoryOnly: true,
        permissionContract: qa.permission_contract || { mode: "advisory_read_only", write_scope_expanded: false, mcp_scope_expanded: false },
        structured: true,
    };
    const outputs = await processCrossAgents(current.group_id, group, current.from_agent, current.question, [mention], (0, db_1.getConfigs)(), ctx, streamRes || null, 1, new Set(), "sequential", "", current.task_id || "");
    const joined = outputs.join("\n\n---\n\n");
    const reply = (0, collaboration_runtime_status_helpers_1.extractAgentQaReplies)(joined, qa.id).pop();
    const answerText = reply?.answer || (0, collaboration_runtime_status_helpers_1.stripAgentQaProtocolBlocks)(joined);
    const acceptance = (0, collaboration_protocol_1.evaluateCollaborationAnswer)({ answer: answerText, evidence: reply?.evidence || qa.evidence || [] }, qa, (0, agent_qa_service_1.loadAgentQaItems)().filter((item) => item.task_id === qa.task_id && item.id !== qa.id && item.acceptance));
    const completed = (0, agent_qa_service_1.upsertAgentQaItem)({
        ...qa,
        status: answerText && acceptance.accepted ? "answered" : answerText ? "rejected" : "failed",
        answer: (0, memory_1.compactMemoryText)(answerText || "目标 Agent 重试后仍未返回可用回答", 4000),
        answer_evidence: acceptance.evidence,
        acceptance,
        answered_at: new Date().toISOString(),
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: answerText && acceptance.accepted ? "accepted" : answerText ? "rejected" : "failed", detail: acceptance.reason || "重试已完成" }].slice(-30),
    });
    (0, storage_1.appendGroupMessage)(current.group_id, (0, agent_qa_service_1.buildAgentQaMessage)("answer", completed, completed.answer));
    (0, agent_qa_service_1.emitAgentQaEvent)(streamRes, "answer", completed, completed.answer);
    if (completed.acceptance?.accepted)
        (0, agent_qa_service_1.writeAcceptedAgentQaToProjectMemory)(completed);
    (0, agent_qa_service_1.appendAgentQaTrace)(current.task_id || "", "agent.qa.retry_answer", completed, acceptance.reason, acceptance.accepted ? "ok" : "warn", { acceptance });
    const wakeup = acceptance.accepted ? await resumeAgentQaFromStoredContinuation(completed, group, ctx, streamRes) : { resumed: false, reason: acceptance.reason };
    return { success: true, item: wakeup.resumed ? wakeup.item : completed, wakeup };
}
async function handleAgentQaRequests(input) {
    (0, agent_qa_service_1.markExpiredAgentQaItems)(input.groupId);
    const qaDepth = Number(input.qaDepth || 0);
    const coordinationContext = {
        groupId: input.groupId,
        taskId: input.taskId || `conversation:${input.groupId}`,
        groupSessionId: (0, collaboration_runtime_task_queue_1.getTaskById)(input.taskId || "")?.group_session_id || "",
        sourceProject: input.sourceProject,
        sourceAgentType: input.sourceAgentType,
        sourceTaskAgentSessionId: input.sourceTaskAgentSessionId || "",
        sourceNativeSessionId: input.sourceNativeSessionId || "",
        sourceWorkDir: input.sourceWorkDir,
    };
    if (qaDepth === 0) {
        for (const legacy of (0, collaboration_runtime_status_helpers_1.extractAgentQaRequests)(input.sourceOutput, input.group, input.sourceProject)) {
            (0, group_coordination_store_1.submitGroupCoordinationRequest)(coordinationContext, {
                kind: legacy.kind,
                summary: legacy.question,
                question: legacy.question,
                reason: legacy.reason,
                blocking: legacy.blocking,
                requiredCapabilities: legacy.required_capabilities,
                targetHint: legacy.targetName === "auto" ? "" : legacy.targetName,
                evidence: legacy.evidence,
                acceptanceCriteria: legacy.acceptance_criteria,
                requestedWritePaths: legacy.requested_write_paths,
                idempotencyKey: legacy.coordination_request_id || undefined,
                metadata: { legacy_protocol: true, legacy_type: legacy.type },
            });
        }
    }
    const claimId = `group-main:${input.groupId}:${input.taskId || "conversation"}:${Date.now().toString(36)}`;
    const claimedCoordination = qaDepth > 0 ? [] : (0, group_coordination_store_1.claimSubmittedGroupCoordinationRequests)(coordinationContext, claimId);
    const requests = claimedCoordination.map((row) => ({
        type: row.kind === "review" ? "request_review" : "ask_agent",
        kind: row.kind,
        targetName: row.target_hint || "auto",
        question: row.question || row.summary,
        reason: row.reason,
        evidence: row.evidence || [],
        required_capabilities: row.required_capabilities || [],
        blocking: row.blocking !== false,
        acceptance_criteria: row.acceptance_criteria || [],
        requested_write_paths: row.requested_write_paths || [],
        coordination_request_id: row.id,
        coordination_record: row,
    }));
    if (!requests.length)
        return { outputs: [], resumedOutput: "" };
    const outputs = [];
    const answers = [];
    let coordinationResumedOutput = "";
    for (const rawRequest of requests.slice(0, 5)) {
        const now = new Date().toISOString();
        const openItems = (0, agent_qa_service_1.loadAgentQaItems)();
        const profiles = Object.fromEntries((input.group?.members || []).map((member) => {
            const project = String(member?.project || "").trim();
            const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(project, input.group, input.configs);
            return [project, (0, collaboration_runtime_plan_tools_1.getProjectAgentCapabilityProfile)(project, runtime?.workDir || "")];
        }).filter((entry) => entry[0]));
        const routing = (0, collaboration_protocol_1.selectCollaborationTarget)({ request: rawRequest, group: input.group, sourceProject: input.sourceProject, profiles, openItems });
        const request = { ...rawRequest, targetName: routing.targetName };
        const sourceTask = input.taskId ? (0, collaboration_runtime_task_queue_1.getTaskById)(input.taskId) : null;
        const contract = (0, collaboration_protocol_1.buildCollaborationQuestionContract)({
            ...request,
            group_id: input.groupId,
            task_id: input.taskId || `conversation:${input.groupId}`,
            execution_id: sourceTask?.execution_id || sourceTask?.active_execution_id || input.taskId || "",
            from_agent: input.sourceProject,
            to_agent: request.targetName,
        });
        if (request.kind === "implementation") {
            contract.permission_contract = {
                mode: "formal_work_item_write",
                inherited_from: "group_main_agent",
                target_project: request.targetName,
                write_scope_expanded: true,
                mcp_scope_expanded: false,
                tool_scope_expanded: false,
                requested_write_paths: request.requested_write_paths || [],
                rule: "写权限仅由群聊主 Agent 通过正式项目工作项授予；原子 Agent 的请求本身不授予写权限。",
            };
        }
        const admission = (0, collaboration_protocol_1.evaluateCollaborationQuestionAdmission)(contract, openItems);
        const arbitration = arbitrateAgentQaRequest(request, input.group, input.sourceProject);
        if (!admission.allowed) {
            arbitration.decision = "reject";
            arbitration.reason = admission.reason;
        }
        const qaBase = {
            ...contract,
            id: contract.question_id,
            coordination_request_id: request.coordination_request_id || "",
            coordination_kind: request.kind || "information",
            status: arbitration.decision === "ask_agent" ? "waiting" : arbitration.decision,
            timeout_at: contract.deadline_at,
            routing,
            admission,
            arbitration,
            continuation: {
                source_work_dir: input.sourceWorkDir,
                source_agent_type: input.sourceAgentType,
                original_prompt: (0, memory_1.compactMemoryText)(input.originalPrompt, 4000),
                allowed_tools: input.allowedTools || { mcp: [], skill: [] },
                mcp_config_path: input.mcpConfigPath || "",
                runtime_tool_snapshot: input.runtimeToolSnapshot || null,
                source_task_agent_session_id: input.sourceTaskAgentSessionId || "",
                source_native_session_id: input.sourceNativeSessionId || "",
            },
            retry_count: 0,
            manual_takeover: false,
            created_at: now,
            updated_at: now,
            audit: [{ at: now, type: "created", detail: arbitration.reason || "主 Agent 已仲裁" }],
        };
        const qa = (0, agent_qa_service_1.upsertAgentQaItem)(qaBase);
        (0, storage_1.appendGroupMessage)(input.groupId, (0, agent_qa_service_1.buildAgentQaMessage)("question", qa, request.question));
        (0, agent_qa_service_1.emitAgentQaEvent)(input.streamRes, "question", qa, request.question);
        (0, logs_1.safeAddGroupLog)(input.groupId, "info", "agent_qa", `${input.sourceProject} 向 ${request.targetName} 提问`, {
            qa_id: qa.id,
            from: input.sourceProject,
            to: request.targetName,
            question: request.question,
            arbitration,
        });
        if (input.taskId)
            (0, logs_1.addTaskLog)(input.taskId, "info", `Agent 问答：${input.sourceProject} -> ${request.targetName}；${request.question.slice(0, 220)}`);
        if (input.taskId)
            (0, logs_1.appendTaskTimelineEvent)(input.taskId, { type: "agent_qa_question", title: `${input.sourceProject} 向 ${request.targetName} 提问`, detail: request.question, status: "active", phase: "executing", agent: input.sourceProject, data: { qa_id: qa.id, request, arbitration } });
        (0, agent_qa_service_1.appendAgentQaTrace)(input.taskId || "", "agent.qa.question", qa, request.question, "active", { routing, admission, permission_contract: qa.permission_contract });
        if (input.taskId && qa.blocking && arbitration.decision === "ask_agent") {
            (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(sourceTask || { id: input.taskId, group_id: input.groupId }, "in_progress", `等待 ${request.targetName} 回答：${(0, memory_1.compactMemoryText)(request.question, 180)}`);
            (0, logs_1.appendTaskTimelineEvent)(input.taskId, { type: "agent_qa_waiting", title: `${input.sourceProject} 等待 ${request.targetName}`, detail: `问题 ${qa.id} 已进入等待；回答到达后自动唤醒原会话`, status: "active", phase: "waiting_dependency", agent: input.sourceProject, data: { qa_id: qa.id, deadline_at: qa.deadline_at } });
        }
        if (request.kind === "implementation" && arbitration.decision === "ask_agent") {
            const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(input.group)?.project || "coordinator";
            const dependencyTask = (0, collaboration_runtime_runtime_tools_1.createTask)({
                title: `协作依赖：${(0, memory_1.compactMemoryText)(request.question || request.reason, 80)}`,
                description: [
                    "【群聊主 Agent 正式协作工作项】",
                    `业务目标：${request.question}`,
                    request.reason ? `背景：${request.reason}` : "",
                    request.requested_write_paths?.length ? `授权修改范围：${request.requested_write_paths.join("；")}` : "",
                    request.acceptance_criteria?.length ? `验收标准：${request.acceptance_criteria.join("；")}` : "",
                    request.evidence?.length ? `已有证据：${request.evidence.join("；")}` : "",
                    "这是由群聊主 Agent 授权的正式可写工作项。只在授权范围内实现，并提交真实 filesChanged 和 verification 结果说明。",
                ].filter(Boolean).join("\n"),
                business_goal: request.question,
                acceptance_criteria: (request.acceptance_criteria || []).join("\n"),
                target_project: request.targetName,
                group_id: input.groupId,
                group_session_id: sourceTask?.group_session_id || "",
                assign_type: "project",
                workflow_type: "agent_coordination_dependency",
                parent_task_id: input.taskId || null,
                priority: sourceTask?.priority || "normal",
                auto_execute: true,
                queue_scope: "isolated_parallel",
                child_agent_isolation: "worktree",
                branch_policy: "worktree",
                commit_policy: "verified_commit",
                allowed_paths: request.requested_write_paths?.length ? request.requested_write_paths : ["."],
                requires_code_changes: true,
                requires_verification: true,
                requires_independent_review: false,
                idempotency_key: `group-coordination:${request.coordination_request_id || qa.id}`,
                workflow_meta: {
                    coordination_request_id: request.coordination_request_id || "",
                    requested_by_agent: input.sourceProject,
                    dispatched_by: "group_main_agent",
                    requested_write_paths: request.requested_write_paths || [],
                    required_capabilities: request.required_capabilities || [],
                    execution_mode: "parallel_isolated_native_session",
                    source_task_agent_session_id: input.sourceTaskAgentSessionId || "",
                    source_native_session_id: input.sourceNativeSessionId || "",
                },
            });
            (0, collaboration_runtime_runtime_tools_1.updateTask)(dependencyTask.id, { status: "pending", status_detail: `正在为 ${request.targetName} 准备独立会话和工作区` });
            if (sourceTask)
                (0, collaboration_runtime_runtime_tools_1.updateTask)(sourceTask.id, {
                    child_task_ids: (0, collaboration_runtime_status_helpers_1.uniqueStrings)([...(Array.isArray(sourceTask.child_task_ids) ? sourceTask.child_task_ids : []), dependencyTask.id]),
                    collaboration_state: {
                        ...(sourceTask.collaboration_state || {}),
                        phase: "waiting_dependency",
                        coordination_request_id: request.coordination_request_id,
                        dependency_task_id: dependencyTask.id,
                        dependency_project: request.targetName,
                        updated_at: new Date().toISOString(),
                    },
                    status_detail: `等待 ${request.targetName} 完成协作工作项`,
                });
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.coordination_request_id, {
                status: "work_item_created",
                work_item_task_id: dependencyTask.id,
                auditType: "formal_work_item_created",
                auditDetail: `群聊主 Agent 已创建正式可写工作项并派发给 ${request.targetName}`,
            });
            if (input.taskId)
                (0, logs_1.appendTaskTimelineEvent)(input.taskId, {
                    type: "coordination_work_item_created",
                    title: `主 Agent 已安排 ${request.targetName} 处理依赖`,
                    detail: request.question,
                    status: "active",
                    phase: "waiting_dependency",
                    agent: coordinator,
                    data: { coordination_request_id: request.coordination_request_id, work_item_task_id: dependencyTask.id, target_project: request.targetName },
                });
            const queuedQa = (0, agent_qa_service_1.upsertAgentQaItem)({
                ...qa,
                status: "queued",
                work_item_task_id: dependencyTask.id,
                execution_mode: "parallel_isolated_native_session",
                audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "parallel_work_item_queued", detail: `已为 ${request.targetName} 准备独立会话执行通道` }].slice(-30),
            });
            const queueResult = (0, collaboration_runtime_coordinator_review_1.enqueueTask)(dependencyTask.id, input.ctx);
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.coordination_request_id, {
                status: queueResult.queued ? "work_item_created" : "waiting_agent",
                resolution: {
                    target_project: request.targetName,
                    work_item_task_id: dependencyTask.id,
                    execution_mode: "parallel_isolated_native_session",
                    queue: queueResult,
                },
                auditType: queueResult.queued ? "parallel_work_item_queued" : "parallel_work_item_waiting",
                auditDetail: queueResult.queued
                    ? `已为 ${request.targetName} 创建独立第三方 Agent 会话执行通道，不等待其现有会话结束`
                    : queueResult.message || `等待 ${request.targetName} 执行通道就绪`,
            });
            (0, agent_qa_service_1.emitAgentQaEvent)(input.streamRes, "progress", queuedQa, queueResult.queued ? `${request.targetName} 的独立协作会话正在启动` : queueResult.message || "协作会话等待启动");
            if (input.taskId)
                (0, logs_1.appendTaskTimelineEvent)(input.taskId, {
                    type: queueResult.queued ? "coordination_parallel_session_queued" : "coordination_parallel_session_waiting",
                    title: queueResult.queued ? `${request.targetName} 的独立协作会话正在启动` : `${request.targetName} 的执行通道暂未就绪`,
                    detail: queueResult.queued ? "该工作项使用独立 worktree 和原生会话并行执行，不会打断正在工作的会话" : queueResult.message || "等待执行通道恢复",
                    status: queueResult.queued ? "active" : "warn",
                    phase: "waiting_dependency",
                    agent: coordinator,
                    data: { coordination_request_id: request.coordination_request_id, work_item_task_id: dependencyTask.id, target_project: request.targetName, execution_mode: "parallel_isolated_native_session", queue: queueResult },
                });
            continue;
        }
        if (arbitration.decision === "ask_user") {
            const needsUser = (0, agent_qa_service_1.upsertAgentQaItem)({
                ...qa,
                status: "needs_user",
                needs_user_at: new Date().toISOString(),
                audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "needs_user", detail: arbitration.reason }].slice(-30),
            });
            (0, storage_1.appendGroupMessage)(input.groupId, (0, agent_qa_service_1.buildAgentQaMessage)("answer", needsUser, `主 Agent 仲裁：${arbitration.reason}\n需要用户确认后再继续。`));
            (0, agent_qa_service_1.emitAgentQaEvent)(input.streamRes, "answer", needsUser, `主 Agent 仲裁：${arbitration.reason}\n需要用户确认后再继续。`);
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.coordination_request_id, { status: "needs_user", auditType: "needs_user", auditDetail: arbitration.reason });
            continue;
        }
        if (arbitration.decision !== "ask_agent") {
            const rejected = (0, agent_qa_service_1.upsertAgentQaItem)({
                ...qa,
                status: "rejected",
                failed_at: new Date().toISOString(),
                answer: arbitration.reason,
                audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "rejected", detail: arbitration.reason }].slice(-30),
            });
            (0, storage_1.appendGroupMessage)(input.groupId, (0, agent_qa_service_1.buildAgentQaMessage)("answer", rejected, arbitration.reason));
            (0, agent_qa_service_1.emitAgentQaEvent)(input.streamRes, "answer", rejected, arbitration.reason);
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.coordination_request_id, { status: "failed", auditType: "rejected", auditDetail: arbitration.reason });
            continue;
        }
        const askingQa = (0, agent_qa_service_1.upsertAgentQaItem)({ ...qa, status: "asking", asked_at: new Date().toISOString() });
        const mention = {
            mention: `@${request.targetName}`,
            targetName: request.targetName,
            message: [
                `【Agent-to-Agent ${request.type === "request_review" ? "评审请求" : "询问"}】`,
                `问题 ID：${qa.id}；任务：${qa.task_id}；Execution：${qa.execution_id || "未绑定"}`,
                `来自：${input.sourceProject}`,
                request.reason ? `原因：${request.reason}` : "",
                qa.evidence?.length ? `已有证据：${qa.evidence.join("；")}` : "",
                `问题：${request.question}`,
                "权限契约：advisory_read_only。只允许读取和回答，不得修改文件、扩大工具/MCP 权限、跨项目执行或代替用户批准高风险操作。",
                "请直接回答该 Agent 的问题；如果涉及接口/字段/文件/验证，请给出可执行、可引用的证据。建议使用 reply_agent 并分别提供 answer 与 evidence。",
            ].filter(Boolean).join("\n"),
            requestId: qa.id,
            advisoryOnly: true,
            permissionContract: qa.permission_contract,
            structured: true,
        };
        const answerOutputs = await processCrossAgents(input.groupId, input.group, input.sourceProject, input.sourceOutput, [mention], input.configs, input.ctx, input.streamRes || null, 1, new Set(), "sequential", "", input.taskId || "");
        const joinedAnswerText = answerOutputs.join("\n\n---\n\n");
        const reply = (0, collaboration_runtime_status_helpers_1.extractAgentQaReplies)(joinedAnswerText, qa.id).pop();
        const answerText = reply?.answer || (0, collaboration_runtime_status_helpers_1.stripAgentQaProtocolBlocks)(joinedAnswerText);
        const answerReceipt = (0, collaboration_runtime_status_helpers_1.parseFormattedReceiptsFromText)(joinedAnswerText).find((item) => item.agent === request.targetName) || null;
        const boundary = answerReceipt?.permission_boundary || (0, collaboration_protocol_1.evaluateAdvisoryPermissionBoundary)((answerReceipt?.filesChanged || []).map((item) => typeof item === "string" ? { path: item } : item), { mcp: [], skill: [] }, { mcp: [], skill: [] });
        const siblingAnswers = (0, agent_qa_service_1.loadAgentQaItems)().filter((item) => item.task_id === qa.task_id && item.id !== qa.id && item.acceptance);
        const acceptance = (0, collaboration_protocol_1.evaluateCollaborationAnswer)({ answer: answerText, evidence: reply?.evidence || qa.evidence || [] }, qa, siblingAnswers);
        if (!boundary.pass) {
            acceptance.status = "rejected";
            acceptance.accepted = false;
            acceptance.reason = boundary.reason;
        }
        const completedQa = (0, agent_qa_service_1.upsertAgentQaItem)({
            ...askingQa,
            status: answerText && acceptance.accepted ? "answered" : answerText ? "rejected" : "failed",
            answer: (0, memory_1.compactMemoryText)(answerText || "目标 Agent 未返回可用回答", 4000),
            answer_evidence: acceptance.evidence,
            acceptance,
            permission_boundary: boundary,
            answered_at: new Date().toISOString(),
            audit: [...(Array.isArray(askingQa.audit) ? askingQa.audit : []), { at: new Date().toISOString(), type: answerText && acceptance.accepted ? "accepted" : answerText ? "rejected" : "failed", detail: acceptance.reason || (answerText ? "目标 Agent 已回答" : "目标 Agent 未返回可用回答") }].slice(-30),
        });
        (0, group_coordination_store_1.updateGroupCoordinationRequest)(request.coordination_request_id, {
            status: acceptance.accepted ? "resolved" : "failed",
            resolution: { target_project: request.targetName, answer: completedQa.answer, acceptance },
            auditType: acceptance.accepted ? "read_only_answer_accepted" : "read_only_answer_rejected",
            auditDetail: acceptance.reason,
        });
        (0, storage_1.appendGroupMessage)(input.groupId, (0, agent_qa_service_1.buildAgentQaMessage)("answer", completedQa, completedQa.answer));
        (0, agent_qa_service_1.emitAgentQaEvent)(input.streamRes, "answer", completedQa, completedQa.answer);
        if (completedQa.acceptance?.accepted)
            (0, agent_qa_service_1.writeAcceptedAgentQaToProjectMemory)(completedQa);
        (0, agent_qa_service_1.appendAgentQaTrace)(input.taskId || "", "agent.qa.answer", completedQa, acceptance.reason, acceptance.accepted ? "ok" : "warn", { acceptance, permission_boundary: boundary });
        if (input.taskId)
            (0, logs_1.appendTaskTimelineEvent)(input.taskId, { type: acceptance.accepted ? "agent_qa_accepted" : "agent_qa_rejected", title: `${request.targetName} 回答${acceptance.accepted ? "已采纳" : "未采纳"}`, detail: acceptance.reason, status: acceptance.accepted ? "ok" : "warn", phase: acceptance.accepted ? "executing" : "waiting_dependency", agent: request.targetName, data: { qa_id: qa.id, acceptance, permission_boundary: boundary } });
        if (completedQa.status === "answered")
            answers.push(completedQa);
        outputs.push(...answerOutputs);
    }
    const blockingAnswers = answers.filter(item => item.blocking !== false && item.status === "answered");
    if (!blockingAnswers.length)
        return { outputs, resumedOutput: coordinationResumedOutput };
    const injectedAt = new Date().toISOString();
    const injectedAnswers = blockingAnswers.map((item) => (0, agent_qa_service_1.upsertAgentQaItem)({
        ...item,
        status: "injected",
        injected_at: injectedAt,
        audit: [...(Array.isArray(item.audit) ? item.audit : []), { at: injectedAt, type: "injected", detail: "回答已注入回原 Agent 续跑上下文" }].slice(-30),
    }));
    const resumePrompt = [
        "你正在 CCM 群聊中继续执行同一轮子 Agent 工作。系统刚刚帮你向其他子 Agent 提问并收到回答。",
        "请基于这些回答继续原任务，不要重复已经完成的工作；如果答案解除阻塞，请继续实现/验证；如果仍阻塞，请明确写入 CCM_AGENT_RECEIPT.blockers/needs。",
        "",
        "【你上一轮原始任务】",
        (0, memory_1.compactMemoryText)(input.originalPrompt, 1800),
        "",
        "【你上一轮输出】",
        (0, memory_1.compactMemoryText)((0, collaboration_runtime_status_helpers_1.stripAgentQaProtocolBlocks)(input.sourceOutput), 1800),
        "",
        "【其他 Agent 回答】",
        injectedAnswers.map((item, index) => `#${index + 1} ${item.to_agent} 回答 ${item.from_agent}\n问题：${item.question}\n回答：${(0, memory_1.compactMemoryText)(item.answer, 1800)}`).join("\n\n"),
        "",
        "请继续完成你的工作，并在末尾提交新的 CCM_AGENT_RECEIPT。若还需要继续问其他 Agent，可以再次输出 ask_agent/request_review，但本轮系统只会记录，避免无限循环。",
    ].join("\n");
    const resumeMessageId = "m" + Date.now().toString(36) + "qar" + crypto.randomBytes(2).toString("hex");
    let resumeSession = input.taskId ? (0, agent_sessions_1.openTaskAgentSession)({
        scopeId: input.taskId,
        taskId: input.taskId,
        groupId: input.groupId,
        project: input.sourceProject,
        agentType: input.sourceAgentType,
    }) : null;
    let resumedNativeSessionId = "";
    let resumedNativeContinuationEvidence = null;
    let resumeSucceeded = true;
    let resumeError = "";
    const resumedOutput = await input.ctx.callAgentForGroupStream(input.sourceProject, resumePrompt, input.sourceWorkDir, input.sourceAgentType, {
        res: input.streamRes || null,
        groupId: input.groupId,
        timeoutMs: 300000,
        messageId: resumeMessageId,
        allowedTools: input.allowedTools,
        mcpConfigPath: input.mcpConfigPath || "",
        taskId: input.taskId || "",
        executionId: input.taskId || "",
        agentSession: resumeSession ? (0, agent_sessions_1.getTaskAgentSessionOptions)(resumeSession) : null,
        onDone: (opts) => {
            resumedNativeSessionId = String(opts?.nativeSessionId || "");
            resumedNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
            resumeSucceeded = opts?.isError !== true;
            resumeError = String(opts?.error || opts?.message || "");
        },
    });
    if (resumeSession) {
        resumeSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(resumeSession.id, {
            nativeSessionId: resumedNativeSessionId,
            nativeContinuationEvidence: resumedNativeContinuationEvidence,
            nativeContinuationUnverified: resumedNativeContinuationEvidence?.nativeResumeRequested === true
                && resumedNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
            success: resumeSucceeded,
            error: resumeError || (!resumeSucceeded ? resumedOutput : ""),
        }) || resumeSession;
    }
    const resumedAt = new Date().toISOString();
    const resumedAnswerIds = injectedAnswers.map((item) => {
        const updated = (0, agent_qa_service_1.upsertAgentQaItem)({
            ...item,
            status: "resumed",
            resumed_at: resumedAt,
            resume_message_id: resumeMessageId,
            audit: [...(Array.isArray(item.audit) ? item.audit : []), { at: resumedAt, type: "resumed", detail: "原 Agent 已拿到回答并续跑" }].slice(-30),
        });
        if (updated.coordination_request_id)
            (0, group_coordination_store_1.updateGroupCoordinationRequest)(updated.coordination_request_id, { status: "resumed", auditType: "source_agent_resumed", auditDetail: "只读协作结论已注入原 Agent 会话" });
        return updated.id;
    });
    (0, storage_1.appendGroupMessage)(input.groupId, {
        id: resumeMessageId,
        role: "assistant",
        agent: input.sourceProject,
        type: "agent_qa_resume",
        content: resumedOutput,
        timestamp: new Date().toISOString(),
        task_id: input.taskId || undefined,
        qa: {
            kind: "resume",
            from_agent: input.sourceProject,
            answers: resumedAnswerIds,
            status: "resumed",
            injected_at: injectedAt,
            resumed_at: resumedAt,
        },
    });
    const resumeQa = {
        id: "qa_resume_" + Date.now().toString(36) + "_" + crypto.randomBytes(2).toString("hex"),
        group_id: input.groupId,
        task_id: input.taskId || "",
        from_agent: input.sourceProject,
        to_agent: input.sourceProject,
        status: "resumed",
        answer: (0, memory_1.compactMemoryText)(resumedOutput, 2000),
        injected_at: injectedAt,
        resumed_at: resumedAt,
    };
    (0, agent_qa_service_1.emitAgentQaEvent)(input.streamRes, "resume", resumeQa, resumedOutput);
    outputs.push((0, agent_notifications_1.formatCollectedAgentOutput)(input.sourceProject, resumedOutput, (0, agent_receipts_1.extractAgentReceipt)(resumedOutput, input.sourceProject)));
    if (input.taskId)
        (0, logs_1.addTaskLog)(input.taskId, "info", `Agent 问答完成后已续跑：${input.sourceProject}`);
    if (input.taskId)
        (0, logs_1.appendTaskTimelineEvent)(input.taskId, { type: "agent_qa_resume", title: `${input.sourceProject} 拿到回答并续跑`, detail: (0, memory_1.compactMemoryText)(resumedOutput, 500), status: resumeSucceeded ? "ok" : "warn", phase: "executing", agent: input.sourceProject, data: { answers: resumedAnswerIds, session_id: resumeSession?.id || "", native_session_id: resumeSession?.nativeSessionId || "", resume_mode: resumeSession?.resumeMode || "" } });
    (0, agent_qa_service_1.appendAgentQaTrace)(input.taskId || "", "agent.qa.resumed", resumeQa, `${input.sourceProject} 已被回答事件唤醒并续跑`, resumeSucceeded ? "ok" : "warn", { answers: resumedAnswerIds, session_id: resumeSession?.id || "", native_session_id: resumeSession?.nativeSessionId || "", resume_mode: resumeSession?.resumeMode || "" });
    if (input.taskId)
        (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)((0, collaboration_runtime_task_queue_1.getTaskById)(input.taskId) || { id: input.taskId, group_id: input.groupId }, "in_progress", `${input.sourceProject} 已收到回答并从${resumeSession?.resumeMode === "native" ? "原生会话" : "任务会话"}续跑`);
    (0, memory_1.updateGroupMemory)(input.groupId, {
        currentPhase: "executing",
        decisions: {
            type: "agent_qa_acceptance",
            taskId: input.taskId || "",
            project: input.sourceProject,
            summary: `${input.sourceProject} 已采纳 ${injectedAnswers.length} 条 Agent 回答并续跑`,
            qa_ids: resumedAnswerIds,
            evidence: injectedAnswers.flatMap((item) => item.answer_evidence || []).slice(0, 20),
        },
        nextAction: `主 Agent 等待 ${input.sourceProject} 续跑结果说明并进行最终验收`,
    });
    return { outputs, resumedOutput: resumedOutput || coordinationResumedOutput };
}
function evaluateCoordinationImplementationReceipt(receipt, request) {
    const status = String(receipt?.status || "").toLowerCase();
    const filesChanged = (0, collaboration_runtime_status_helpers_1.uniqueStrings)((receipt?.filesChanged || receipt?.files_changed || []).map((item) => typeof item === "string" ? item : item?.path)).slice(0, 80);
    const verification = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(receipt?.verification || receipt?.tests || []).slice(0, 60);
    const blockers = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(receipt?.blockers || []).slice(0, 30);
    const requiresFiles = Array.isArray(request.requested_write_paths) && request.requested_write_paths.length > 0;
    const accepted = status === "done" && blockers.length === 0 && (!requiresFiles || filesChanged.length > 0) && verification.length > 0;
    const gaps = [
        status !== "done" ? `结果状态为 ${status || "missing"}` : "",
        blockers.length ? `仍有阻塞：${blockers.join("；")}` : "",
        requiresFiles && !filesChanged.length ? "未提供实际代码变更证据" : "",
        !verification.length ? "未提供验证证据" : "",
    ].filter(Boolean);
    return {
        status: accepted ? "accepted" : "needs_evidence",
        accepted,
        score: accepted ? 100 : Math.max(0, 100 - gaps.length * 25),
        evidence: [...filesChanged, ...verification].slice(0, 100),
        files_changed: filesChanged,
        verification,
        gaps,
        reason: accepted ? "正式工作项已完成，代码变更和验证证据均通过群聊主 Agent 验收" : `正式工作项尚未通过验收：${gaps.join("；")}`,
        arbitrated_by: "group_main_agent_work_item_gate",
        arbitrated_at: new Date().toISOString(),
    };
}
function inspectCoordinationWorkspaceChanges(execution) {
    const workDir = String(execution?.workspace?.worktreePath || execution?.packet?.workDir || "").trim();
    if (!workDir || !fs.existsSync(workDir))
        return [];
    const result = (0, child_process_1.spawnSync)("git", ["status", "--porcelain=v1", "--untracked-files=all", "-z"], { cwd: workDir, encoding: "utf-8", windowsHide: true });
    if (result.status !== 0)
        return [];
    const entries = String(result.stdout || "").split("\0").filter(Boolean);
    const files = [];
    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const status = entry.slice(0, 2).trim() || "modified";
        const filePath = entry.slice(3).replace(/\\/g, "/").trim();
        if (!filePath)
            continue;
        files.push({ path: filePath, status, source: "git_worktree" });
        if (/R|C/.test(entry.slice(0, 2)) && entries[index + 1])
            index++;
    }
    return files;
}
function evaluateCoordinationTaskEvidence(task, request, receipt, execution) {
    const base = evaluateCoordinationImplementationReceipt(receipt, request);
    const inspectedWorkspaceFiles = inspectCoordinationWorkspaceChanges(execution);
    const persistedAcceptance = task?.coordination_acceptance || request?.resolution?.acceptance || execution?.data?.coordination_acceptance || {};
    const workspaceFiles = inspectedWorkspaceFiles.length
        ? inspectedWorkspaceFiles
        : execution?.workspace?.mergedAt && execution?.workspace?.mergeCommit && Array.isArray(persistedAcceptance.workspace_files)
            ? persistedAcceptance.workspace_files
            : [];
    const declaredFiles = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(base.files_changed || []);
    const actualFiles = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(workspaceFiles.map((item) => item.path));
    const requiresFiles = Array.isArray(request?.requested_write_paths) && request.requested_write_paths.length > 0;
    const declaredMatch = !requiresFiles || declaredFiles.some((file) => actualFiles.includes(file));
    const gaps = (0, collaboration_runtime_status_helpers_1.uniqueStrings)([
        ...(base.gaps || []),
        requiresFiles && !actualFiles.length ? "独立 worktree 未检测到真实代码差异" : "",
        requiresFiles && actualFiles.length > 0 && !declaredMatch ? "结果说明中的文件与 worktree 实际差异不一致" : "",
    ]).filter(Boolean);
    const accepted = base.accepted && gaps.length === 0;
    return {
        ...base,
        status: accepted ? "accepted" : "needs_evidence",
        accepted,
        score: accepted ? 100 : Math.min(Number(base.score || 0), Math.max(0, 100 - gaps.length * 25)),
        gaps,
        workspace_files: workspaceFiles,
        evidence: (0, collaboration_runtime_status_helpers_1.uniqueStrings)([...(base.evidence || []), ...actualFiles]).slice(0, 120),
        reason: accepted
            ? "正式工作项已完成，真实代码差异和验证证据均通过群聊主 Agent 验收"
            : `正式工作项尚未通过验收：${gaps.join("；")}`,
    };
}
function getCoordinationRequestForTask(task) {
    const requestId = String(task?.workflow_meta?.coordination_request_id || "").trim();
    if (!requestId)
        return null;
    return (0, group_coordination_store_1.listGroupCoordinationRequests)({ groupId: task.group_id || "", taskId: task.parent_task_id || "" })
        .find((item) => item.id === requestId)
        || (0, group_coordination_store_1.listGroupCoordinationRequests)({ groupId: task.group_id || "" }).find((item) => item.id === requestId)
        || null;
}
function getCoordinationQaForRequest(requestId) {
    return (0, agent_qa_service_1.loadAgentQaItems)().find((item) => String(item.coordination_request_id || "") === String(requestId || "")) || null;
}
function coordinationAuditHas(request, type) {
    return Array.isArray(request?.audit) && request.audit.some((item) => item?.type === type);
}
//# sourceMappingURL=collaboration-runtime-cross-agent-runtime-part-01.js.map