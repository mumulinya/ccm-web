"use strict";
// Behavior-freeze split from collaboration-cross-agents-part-02.ts (part 2/2); native-test branch extracted.
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
exports.executeMentionJobTryA = executeMentionJobTryA;
const crypto = __importStar(require("crypto"));
const collaboration_cross_agents_part_03_1 = require("./collaboration-cross-agents-part-03");
const collaboration_cross_agents_part_02_part_02_native_test_1 = require("./collaboration-cross-agents-part-02-part-02-native-test");
async function executeMentionJobTryA(mention, env) {
    const { deps, groupId, group, sourceProject, output, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, sourceTask, completedOutputsByAgent, processCrossAgents } = env;
    const { addGroupLog, addTaskLog, admitChildTypedMemoryDelivery, appendAgentQaTrace, appendGroupMessage, appendTaskTimelineEvent, attachExecutionWorkspace, attachInvokedSkillsToReceipt, attachMemoryContextConsumptionChallenge, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery, bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAckPreflightReview, buildAgentMemoryContextBundleWithManifestSelection, buildAgentMemoryPacket, buildAgentQaProtocolInstructions, buildAgentToolContext, buildChildAgentDevelopmentContract, buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCollaborationConflictPlan, buildCoordinatorCollaborationInstructions, buildCoordinatorReworkContinuationFallback, buildCoordinatorSharedFilesContext, buildFinalWorkerDispatchPayloadGate, buildGroupContextPacket, buildMemberCollaborationInstructions, buildNativeTestAgentPlanBlockedReceipt, buildNativeTestAgentReceipt, buildNativeTestAgentReviewSummary, buildNativeTestAgentRuntimeToolContext, buildPostReviewSpotCheckSummary, buildProjectExecutionBrief, buildProjectVerificationHints, buildRuntimeRecoveryCandidates, buildRuntimeRecoveryPrompt, buildTaskPreflightReasoning, buildTaskProviderSwitchRequests, buildWorkerContinuationHandoff, buildWorkflowMeta, checkTaskFailure, claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText, compactRuntimeToolAudit, completeTaskAgentInvocationEdge, coordinatorReworkRouteNeedsFreshVerifier, coordinatorReworkRouteRequiresStop, coordinatorReworkRouteUsesVerifier, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge, dispatchTaskAgentInvocationEdge, emitAssignmentStatus, ensureExecution, escapeRegExp, evaluateAdvisoryPermissionBoundary, evaluateGreenContract, extractActionableMentions, extractAgentReceipt, extractRunnerVerificationEvidence, formatCollectedAgentOutput, formatNativeTestAgentOutput, formatNativeTestAgentPlanBlockedOutput, getAgentDependencyStateFromOutputs, getChildAgentIsolationMode, getCoordinatorActionMentions, getCoordinatorMember, getInitialWorkflowMeta, getMentionReworkRoute, getProjectAgentCapabilityProfile, getProjectExtraConfig, getReceiptAssignmentStatus, getRoutableMembers, getTaskAgentSessionOptions, getTaskById, getTestAgentHandoffPayload, getTestAgentHandoffProjectWorkDir, getTestAgentHandoffReviewSubject, getTestAgentHandoffWarnings, getWorkDirState, handleAgentQaRequests, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, isCoordinatorTestAgentName, isProviderPromptTooLongFailure, loadExecution, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted, markChildTypedMemoryRunnerReturned, memoryContextConsumptionReceiptFile, normalizeAgentRuntimeId, normalizeMentionTask, normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir, prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, recordAgentRuntimeLifecycle, recordReplayRepairTimelineBindingsForMention, recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator, recordWorkerContextProviderSwitchSessionBindingForCoordinator, recoverFinalWorkerDispatchPayload, renderGroupPostCompactDynamicContextDelta, renderGroupPostCompactInvokedSkillAttachments, renderGroupPostCompactPlanAttachment, renderMemoryContextForWorker, resolveMemberRuntime, runGroupOrchestrator, runMainAgentPostReviewSpotCheck, runTestAgentCliJob, runtimeToolDispatchBlockedMessage, runtimeToolDispatchBlockedReceipt, runtimeToolSnapshotFromAudit, shouldSwitchRuntime, stopWrongDirectionWorkerForCoordinatorRoute, stripAgentQaProtocolBlocks, summarizeNativeTestAgentExecutionPlan, summarizeReplayRepairTimelineBindingsForEvent, summarizeTaskAgentMemoryContextSnapshot, summarizeWorkerHandoffForUser, taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, taskRequiresVerification, transitionExecution, uniqueStrings, updateGroupMemory, updateGroupTaskInlineStatus, updateTask, updateTaskWorkItemFromReceipt, validateTestAgentHandoffRegisteredWorkDirs, verifyFinalWorkerDispatchPayloadGate, writeSse } = deps;
    const L = env._locals || {};
    let outputs = L.outputs || [];
    let targetName = L.targetName || "";
    let coordinatorProject = L.coordinatorProject || "";
    const failChildDispatch = L.failChildDispatch || (() => outputs);
    let tWorkDir = L.tWorkDir || process.cwd();
    let tAgentType = L.tAgentType || "claudecode";
    let activeTaskSession = L.activeTaskSession || null;
    let laneExecutionId = L.laneExecutionId || "";
    let childTaskText = L.childTaskText || "";
    let workerHandoff = L.workerHandoff || null;
    let developmentContract = L.developmentContract || "";
    const renderCrossAgentPrompt = L.renderCrossAgentPrompt || (() => "");
    let tPrompt = L.tPrompt || "";
    let advisoryOnly = L.advisoryOnly || false;
    const nativeTestAgentDispatch = L.nativeTestAgentDispatch || false;
    const testAgentHandoffPayload = L.testAgentHandoffPayload || null;
    let toolContext = L.toolContext || { prompt: "", allowedTools: { mcp: [], skill: [] }, toolAudit: null, authorizationReadiness: null };
    let runtimeToolContext = L.runtimeToolContext || toolContext;
    let activeGroupSessionId = L.activeGroupSessionId || "";
    let activeInvocationEdge = L.activeInvocationEdge || null;
    let groupMemoryBundle = L.groupMemoryBundle || null;
    let workerMemoryContext = L.workerMemoryContext || null;
    let workerMemoryPacket = L.workerMemoryPacket || "";
    const dependencyOutputPacket = L.dependencyOutputPacket || "";
    const continuationNotice = L.continuationNotice || "";
    const testAgentHandoffPacket = L.testAgentHandoffPacket || "";
    const projectExecutionBrief = L.projectExecutionBrief || "";
    const worktreeNotice = L.worktreeNotice || "";
    let atMessage = L.atMessage || "";
    const implementationMessage = L.implementationMessage || "";
    const requiresAckPreflight = L.requiresAckPreflight || false;
    const testAgentWorkDirPolicy = L.testAgentWorkDirPolicy || { valid: true, allowedWorkDirs: [], invalid: [] };
    const memoryDeliveryAttemptSequence = L.memoryDeliveryAttemptSequence || 0;
    const globalMissionHandoff = L.globalMissionHandoff || null;
    const globalMissionMemory = L.globalMissionMemory || "";
    const workerContinuation = L.workerContinuation || null;
    let capacityRevalidationPreparation = L.capacityRevalidationPreparation || null;
    let capacityRevalidationCommitted = L.capacityRevalidationCommitted !== false;
    let workerHandoffSummary = L.workerHandoffSummary || null;
    let activeMemoryContextSnapshot = L.activeMemoryContextSnapshot || null;
    let activeMemoryContextDelivery = L.activeMemoryContextDelivery || null;
    let memoryConsumptionChallenge = L.memoryConsumptionChallenge || null;
    const projectResourcesConfig = L.projectResourcesConfig || {};
    const collaborationInstructions = L.collaborationInstructions || "";
    const memberList = L.memberList || "";
    const isContinuation = L.isContinuation || false;
    const continuationUserLabel = L.continuationUserLabel || "";
    const isVerifierContinuation = L.isVerifierContinuation || false;
    const isFreshVerifierContinuation = L.isFreshVerifierContinuation || false;
    const continuationOf = L.continuationOf || "";
    const reworkRoute = L.reworkRoute || null;
    const routeStopResult = L.routeStopResult || null;
    const providerSwitchDecisionReceipt = L.providerSwitchDecisionReceipt || null;
    let tContext = L.tContext || "";
    const preparedWorkDir = L.preparedWorkDir || null;
    const testAgentHandoffWarnings = L.testAgentHandoffWarnings || [];
    const continuationStrategy = L.continuationStrategy || "";
    const mentionStr = L.mentionStr || "";
    const nativeTestAgentMention = L.nativeTestAgentMention || false;
    const targetMember = L.targetMember || null;
    const atRegex = L.atRegex || null;
    const atMatch = L.atMatch || null;
    const taskKey = L.taskKey || "";
    const testAgentHandoff = L.testAgentHandoff || null;
    const legacyTestAgentWorkOrder = L.legacyTestAgentWorkOrder || null;
    const runtime = L.runtime || null;
    const testAgentProjectWorkDir = L.testAgentProjectWorkDir || "";
    const workDirState = L.workDirState || null;
    const taskRuntimeOverride = L.taskRuntimeOverride || "";
    const providerSwitchAttempted = L.providerSwitchAttempted || false;
    const approvedSwitchAgentType = L.approvedSwitchAgentType || "";
    let providerSwitchSessionBinding = L.providerSwitchSessionBinding || null;
    const routeContinuationFallback = L.routeContinuationFallback || null;
    const pendingCapacityDowngradeGate = L.pendingCapacityDowngradeGate || null;
    let memoryPacket = L.memoryPacket || "";
    let targetReceipt = L.targetReceipt || null;
    let tOutput = L.tOutput || "";
    let activeRuntime = L.activeRuntime || tAgentType;
    let targetFileChanges = L.targetFileChanges || null;
    let targetWorkEvents = L.targetWorkEvents || [];
    let targetNativeSessionId = L.targetNativeSessionId || "";
    let targetInvokedSkills = L.targetInvokedSkills || [];
    let testAgentNativeReport = L.testAgentNativeReport || null;
    let testAgentExecutionPlan = L.testAgentExecutionPlan || null;
    let testAgentPlanDispatch = L.testAgentPlanDispatch || null;
    let testAgentCliDispatch = L.testAgentCliDispatch || null;
    let responseMessageId = L.responseMessageId || "";
    let providerSwitchExecutionReceipt = L.providerSwitchExecutionReceipt || null;
    let targetProviderToolAccessEvidence = L.targetProviderToolAccessEvidence || null;
    try {
        const responseMessageId = "m" + Date.now().toString(36) + "cross" + crypto.randomBytes(2).toString("hex");
        let targetFileChanges = null;
        let targetWorkEvents = [];
        let targetNativeSessionId = "";
        let targetNativeContinuationEvidence = null;
        let targetNativeModelCapabilityReceipt = null;
        let targetNativeModelCapabilityRecord = null;
        let targetModelCapabilityRefreshOutcome = null;
        let targetProviderToolAccessEvidence = null;
        let targetProviderMemoryChannelEvidence = null;
        let targetMemoryContextConsumptionReceipt = null;
        let targetMemoryContextConsumptionRecovery = null;
        let targetProviderUsage = null;
        let lastTypedMemoryDispatchAdmission = { required: false };
        let targetSessionSucceeded = true;
        let targetSessionError = "";
        const laneChangeSnapshot = tWorkDir ? ctx.createFileChangeSnapshot(tWorkDir) : null;
        const fallbackConfig = projectResourcesConfig;
        const defaultAttemptTimeout = sourceTask?.workflow_type === "daily_dev" ? 300000 : 120000;
        const configuredAttemptTimeout = Number(sourceTask?.runtime_attempt_timeout_ms
            || sourceTask?.runtimeAttemptTimeoutMs
            || fallbackConfig.runtime_attempt_timeout_ms
            || fallbackConfig.runtimeAttemptTimeoutMs
            || defaultAttemptTimeout);
        const runtimeAttemptTimeoutMs = Math.max(30000, Math.min(300000, Number.isFinite(configuredAttemptTimeout) ? configuredAttemptTimeout : defaultAttemptTimeout));
        const baseRuntimeCandidates = buildRuntimeRecoveryCandidates(tAgentType, fallbackConfig.fallback_agents || fallbackConfig.fallbackAgents || fallbackConfig.runtime_fallbacks || fallbackConfig.runtimeFallbacks || []);
        const runtimeCandidates = activeTaskSession?.resumeMode === "native" && activeTaskSession.nativeSessionId
            ? [baseRuntimeCandidates[0], baseRuntimeCandidates[0], ...baseRuntimeCandidates.slice(1)]
            : baseRuntimeCandidates;
        let activeRuntime = tAgentType;
        let tOutput = "";
        let previousOutput = "";
        let previousReceipt = null;
        let providerPromptTooLongReactiveRetryAttempted = false;
        let forceProviderPromptTooLongReactiveCompact = false;
        let targetReceipt = null;
        let targetInvokedSkills = [];
        let testAgentNativeReport = null;
        let testAgentExecutionPlan = null;
        let testAgentReviewSummary = null;
        let testAgentPlanDispatch = null;
        let testAgentCliDispatch = null;
        let testAgentInvocationResult = null;
        if (nativeTestAgentDispatch) {
            const nativeState = {
                testAgentPlanDispatch,
                testAgentExecutionPlan,
                targetReceipt,
                tOutput,
                targetSessionSucceeded,
                targetSessionError,
                testAgentInvocationResult,
                testAgentCliDispatch,
                testAgentNativeReport,
                testAgentReviewSummary,
                targetWorkEvents,
            };
            await (0, collaboration_cross_agents_part_02_part_02_native_test_1.runNativeTestAgentDispatchBranch)({
                mention, deps, ctx, targetName, groupId, taskId, streamRes,
                testAgentHandoffPayload, testAgentWorkDirPolicy, runtimeAttemptTimeoutMs,
                laneExecutionId, sourceTask, executionOrder, activeTaskSession,
                testAgentProjectWorkDir, tWorkDir, state: nativeState,
            });
            testAgentPlanDispatch = nativeState.testAgentPlanDispatch;
            testAgentExecutionPlan = nativeState.testAgentExecutionPlan;
            targetReceipt = nativeState.targetReceipt;
            tOutput = nativeState.tOutput;
            targetSessionSucceeded = nativeState.targetSessionSucceeded;
            targetSessionError = nativeState.targetSessionError;
            testAgentInvocationResult = nativeState.testAgentInvocationResult;
            testAgentCliDispatch = nativeState.testAgentCliDispatch;
            testAgentNativeReport = nativeState.testAgentNativeReport;
            testAgentReviewSummary = nativeState.testAgentReviewSummary;
            targetWorkEvents = nativeState.targetWorkEvents;
        }
        else {
            for (let attemptIndex = 0; attemptIndex < runtimeCandidates.length; attemptIndex++) {
                activeRuntime = runtimeCandidates[attemptIndex];
                const forceReactiveCompactThisAttempt = forceProviderPromptTooLongReactiveCompact;
                forceProviderPromptTooLongReactiveCompact = false;
                if (attemptIndex > 0) {
                    const previousRuntime = runtimeCandidates[attemptIndex - 1];
                    const sameRuntimeResume = activeRuntime === previousRuntime;
                    if (!sameRuntimeResume) {
                        activeTaskSession = taskId ? openTaskAgentSession({ scopeId: taskId, taskId, groupId, project: targetName, agentType: activeRuntime }) : null;
                    }
                    const retryAttemptSequence = activeTaskSession ? activeTaskSession.turnCount + 1 : memoryDeliveryAttemptSequence;
                    memoryConsumptionChallenge = activeTaskSession && !advisoryOnly
                        ? createMemoryContextConsumptionChallenge({
                            groupId,
                            groupSessionId: activeGroupSessionId,
                            taskId,
                            executionId: laneExecutionId,
                            project: targetName,
                            taskAgentSessionId: activeTaskSession.id,
                            attempt: retryAttemptSequence,
                        })
                        : null;
                    runtimeToolContext = prepareAgentRuntimeTools(groupId, targetName, tWorkDir, activeRuntime, toolContext.allowedTools, streamRes, {
                        taskId,
                        task: sourceTask,
                        toolAudit: toolContext.toolAudit,
                        authorizationReadiness: toolContext.authorizationReadiness,
                        groupSessionId: activeGroupSessionId,
                        taskAgentSessionId: activeTaskSession?.id || "",
                        nativeSessionId: activeTaskSession?.nativeSessionId || "",
                        memoryReceiptChallenge: memoryConsumptionChallenge,
                        memoryReceiptFile: memoryContextConsumptionReceiptFile(memoryConsumptionChallenge?.challenge_id),
                    });
                    if (runtimeToolContext.dispatchBlocked) {
                        tOutput = runtimeToolDispatchBlockedMessage(targetName, runtimeToolContext);
                        previousOutput = tOutput;
                        break;
                    }
                    const previousInvocationEdge = activeInvocationEdge;
                    activeInvocationEdge = activeTaskSession && activeGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
                        groupId,
                        groupSessionId: activeGroupSessionId,
                        taskId,
                        targetProject: targetName,
                        taskAgentSessionId: activeTaskSession.id,
                        nativeSessionId: activeTaskSession.nativeSessionId || "",
                        executionId: laneExecutionId,
                        attemptSequence: retryAttemptSequence,
                        providerAttempt: attemptIndex + 1,
                        invocationKind: retryAttemptSequence > 1 ? "resume" : "spawn",
                        branchKind: sameRuntimeResume ? "native_recovery" : "provider_switch",
                        parentInvocationEdge: previousInvocationEdge,
                        retryOfInvocationEdgeId: previousInvocationEdge?.invocation_edge_id || "",
                        forkReason: sameRuntimeResume ? "native_session_recovery" : `${previousRuntime}_to_${activeRuntime}`,
                    }) : null;
                    groupMemoryBundle = await buildAgentMemoryContextBundleWithManifestSelection(groupId, targetName, childTaskText, {
                        taskId,
                        traceId: sourceTask?.trace_id || "",
                        executionId: laneExecutionId,
                        taskAgentSessionId: activeTaskSession?.id || "",
                        nativeSessionId: activeTaskSession?.nativeSessionId || "",
                        taskAgentSessionTurn: retryAttemptSequence,
                        agentType: activeRuntime,
                        modelContextWindow: activeTaskSession?.modelContextWindow || 0,
                        groupSessionId: activeGroupSessionId,
                        requireExactGroupSession: true,
                        parentRunId: sourceTask?.parent_run_id || sourceTask?.global_mission_id || "",
                        task: sourceTask,
                        ...taskAgentInvocationMemoryOptions(activeInvocationEdge),
                    });
                    memoryPacket = groupMemoryBundle.rendered_text || buildAgentMemoryPacket(groupId, targetName, childTaskText, { groupSessionId: activeGroupSessionId });
                    const resumedInvokedSkillAttachmentText = String(groupMemoryBundle.invoked_skill_attachment_text || renderGroupPostCompactInvokedSkillAttachments(groupMemoryBundle)).trim();
                    if (resumedInvokedSkillAttachmentText && !memoryPacket.includes(resumedInvokedSkillAttachmentText)) {
                        memoryPacket = `${resumedInvokedSkillAttachmentText}\n\n${memoryPacket}`;
                    }
                    const resumedPlanAttachmentText = String(groupMemoryBundle.plan_attachment_text || renderGroupPostCompactPlanAttachment(groupMemoryBundle)).trim();
                    if (resumedPlanAttachmentText && !memoryPacket.includes(resumedPlanAttachmentText)) {
                        memoryPacket = `${resumedPlanAttachmentText}\n\n${memoryPacket}`;
                    }
                    const resumedDynamicContextDeltaText = String(groupMemoryBundle.dynamic_context_delta_text || renderGroupPostCompactDynamicContextDelta(groupMemoryBundle)).trim();
                    if (resumedDynamicContextDeltaText && !memoryPacket.includes(resumedDynamicContextDeltaText)) {
                        memoryPacket = `${resumedDynamicContextDeltaText}\n\n${memoryPacket}`;
                    }
                    workerMemoryPacket = [memoryPacket, globalMissionMemory].filter(Boolean).join("\n\n");
                    workerMemoryContext = globalMissionMemory
                        ? { schema: "ccm-worker-memory-context-v1", group_memory: groupMemoryBundle, global_mission_memory: globalMissionMemory }
                        : groupMemoryBundle;
                    if (memoryConsumptionChallenge)
                        workerMemoryContext = attachMemoryContextConsumptionChallenge(workerMemoryContext, memoryConsumptionChallenge);
                    workerHandoff = buildChildAgentWorkerHandoff(targetName, childTaskText, {
                        source: `${sourceProject} @ 协作`,
                        reason: typeof mention === "string" ? "" : String(mention.reason || "").trim(),
                        acceptance: sourceTask?.acceptance_criteria || "",
                        requires_code_changes: nativeTestAgentDispatch ? false : (advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true)),
                        verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
                        work_dir: tWorkDir,
                        agent_type: activeRuntime,
                        model: activeTaskSession?.modelId || "",
                        task_id: taskId,
                        task_agent_session_id: activeTaskSession?.id || "",
                        trace_id: sourceTask?.trace_id || "",
                        task: sourceTask,
                        group,
                        dependsOn: typeof mention === "string" ? "" : String(mention.dependsOn || "").trim(),
                        worker_context_packet: null,
                        memory: workerMemoryContext,
                        analysis: globalMissionHandoff ? {
                            constraints: Array.isArray(globalMissionHandoff.done_criteria) ? globalMissionHandoff.done_criteria : [],
                            documentFindings: Array.isArray(globalMissionHandoff.references?.document_findings) ? globalMissionHandoff.references.document_findings : [],
                        } : undefined,
                        advisoryOnly,
                        continuation: workerContinuation,
                    });
                    workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
                    workerHandoffSummary = summarizeWorkerHandoffForUser(workerHandoff);
                    developmentContract = buildChildAgentDevelopmentContract(targetName, childTaskText, {
                        source: `${sourceProject} @ 协作`,
                        reason: typeof mention === "string" ? "" : String(mention.reason || "").trim(),
                        acceptance: sourceTask?.acceptance_criteria || "",
                        requires_code_changes: nativeTestAgentDispatch ? false : (advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true)),
                        verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
                        work_dir: tWorkDir,
                        agent_type: activeRuntime,
                        task_id: taskId,
                        trace_id: sourceTask?.trace_id || "",
                        task: sourceTask,
                        group,
                        dependsOn: typeof mention === "string" ? "" : String(mention.dependsOn || "").trim(),
                        worker_context_packet: workerHandoff.worker_context_packet,
                        memory: workerMemoryContext,
                        advisoryOnly,
                        continuation: workerContinuation,
                        handoff: workerHandoff,
                    });
                    tPrompt = renderCrossAgentPrompt();
                    activeMemoryContextDelivery = null;
                    activeMemoryContextSnapshot = null;
                    if (activeTaskSession) {
                        const reboundMemorySnapshot = bindTaskAgentMemoryContextSnapshot(activeTaskSession.id, {
                            taskId,
                            groupId,
                            project: targetName,
                            agentType: activeRuntime,
                            nativeSessionId: activeTaskSession.nativeSessionId || "",
                            turn: activeTaskSession.turnCount + 1,
                            executionId: laneExecutionId,
                            traceId: sourceTask?.trace_id || "",
                            workerContextPacket: workerHandoff.worker_context_packet,
                            workerHandoff,
                            workerHandoffSummary,
                            memoryContext: workerMemoryContext,
                            renderedHandoff: developmentContract,
                            renderedPrompt: tPrompt,
                            renderedMemoryContext: String(groupMemoryBundle?.rendered_text || ""),
                            requireMemoryPromptInjectionProof: true,
                            requireTrustedMemoryPromptEnvelope: true,
                            requireProviderMemoryChannelAcknowledgement: true,
                            requireMemoryContextConsumptionReceipt: !!memoryConsumptionChallenge,
                            memoryContextConsumptionChallenge: memoryConsumptionChallenge,
                            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                            invocationLineage: activeInvocationEdge,
                        });
                        if (reboundMemorySnapshot) {
                            const reboundEvidenceBinding = reboundMemorySnapshot.snapshot?.context?.group_session_memory_binding || {};
                            if (reboundEvidenceBinding.deliveryReady === false) {
                                if (reboundEvidenceBinding.sessionLifecycleFenceValid === false) {
                                    return failChildDispatch("所属群聊会话已归档、删除或生命周期代次已变化", [
                                        `scope=${reboundEvidenceBinding.scopeId || "unknown"}`,
                                        `status=${reboundEvidenceBinding.sessionLifecycleFenceStatus || reboundEvidenceBinding.sessionLifecycleStatus || "stale"}`,
                                        `generation=${reboundEvidenceBinding.sessionLifecycleGeneration || 0}`,
                                        "请在当前有效群聊会话中重新创建任务并生成新的记忆快照",
                                    ]);
                                }
                                return failChildDispatch("Session Memory 模型提取交付证据未通过", [
                                    `scope=${reboundEvidenceBinding.scopeId || "unknown"}`,
                                    `execution=${reboundEvidenceBinding.modelExtractionExecutionId || "missing"}`,
                                    `replay=${reboundEvidenceBinding.modelExtractionReplayStatus || "missing"}`,
                                    "重新执行所属群聊会话的 Session Memory 模型提取与 artifact replay 后再派发",
                                ]);
                            }
                            activeTaskSession = reboundMemorySnapshot.session || activeTaskSession;
                            activeMemoryContextSnapshot = summarizeTaskAgentMemoryContextSnapshot(reboundMemorySnapshot.snapshot);
                            if (taskId) {
                                const fallbackSnapshotReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
                                    targetName,
                                    taskId,
                                    workerContextPacket: workerHandoff.worker_context_packet,
                                    workerHandoff,
                                    memoryContextSnapshot: activeMemoryContextSnapshot,
                                    taskAgentSession: activeTaskSession,
                                    taskAgentSessionId: activeTaskSession.id,
                                    nativeSessionId: activeTaskSession.nativeSessionId || "",
                                    executionId: laneExecutionId,
                                });
                                const fallbackSnapshotTimelineEvent = appendTaskTimelineEvent(taskId, {
                                    type: "task_agent_memory_context_snapshot",
                                    title: `${targetName} fallback 记忆上下文快照已绑定`,
                                    detail: `session=${activeTaskSession.id}；snapshot=${activeMemoryContextSnapshot.snapshot_id}`,
                                    status: "ok",
                                    phase: "dispatching",
                                    agent: targetName,
                                    data: {
                                        task_agent_memory_context_snapshot: activeMemoryContextSnapshot,
                                        replay_repair_dispatch_bindings: fallbackSnapshotReplayRepairBindings,
                                    },
                                });
                                recordReplayRepairTimelineBindingsForMention(groupId, mention, {
                                    targetName,
                                    taskId,
                                    workerContextPacket: workerHandoff.worker_context_packet,
                                    workerHandoff,
                                    memoryContextSnapshot: activeMemoryContextSnapshot,
                                    memoryContextSnapshotChecksum: activeMemoryContextSnapshot.checksum || "",
                                    taskAgentSession: activeTaskSession,
                                    taskAgentSessionId: activeTaskSession.id,
                                    nativeSessionId: activeTaskSession.nativeSessionId || "",
                                    executionId: laneExecutionId,
                                    timelineEvent: fallbackSnapshotTimelineEvent,
                                    timelineEventType: "task_agent_memory_context_snapshot",
                                });
                            }
                        }
                        if (providerSwitchDecisionReceipt?.valid === true && !sameRuntimeResume) {
                            const reboundProviderSwitch = recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
                                assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
                                dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
                                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                                provider_switch_decision_receipt: providerSwitchDecisionReceipt,
                                project: targetName,
                                agent_type: activeRuntime,
                                task_agent_session_id: activeTaskSession.id,
                                native_session_id: activeTaskSession.nativeSessionId || "",
                                execution_id: laneExecutionId,
                            });
                            if (typeof mention !== "string") {
                                mention.provider_switch_session_binding = reboundProviderSwitch;
                                mention.providerSwitchSessionBinding = reboundProviderSwitch;
                            }
                        }
                    }
                    const recoveryText = sameRuntimeResume
                        ? `${targetName} 正在恢复同一个 ${activeRuntime} 原生会话，从失败点继续`
                        : `${targetName} 执行器自动切换：${previousRuntime} → ${activeRuntime}，从已有工作区和回执继续`;
                    if (taskId) {
                        addTaskLog(taskId, "warning", recoveryText);
                        appendTaskTimelineEvent(taskId, { type: sameRuntimeResume ? "native_session_retry" : "runtime_fallback", title: sameRuntimeResume ? `${targetName} 恢复原生会话` : `${targetName} 切换执行器`, detail: recoveryText, status: "warn", phase: "executing", agent: targetName, data: { from: previousRuntime, to: activeRuntime, attempt: attemptIndex + 1 } });
                        if (sourceTask) {
                            const recoveredReasoning = buildTaskPreflightReasoning(sourceTask, recoveryText, true);
                            updateTask(taskId, { reasoning_loop: recoveredReasoning });
                            appendTaskTimelineEvent(taskId, { type: "reasoning_recovery_check", title: `${targetName} 切换/续跑前重新核对目标`, detail: `原始目标、当前工作区和验收条件已重新注入；计划 v${recoveredReasoning.plan_version}`, status: "ok", phase: "planning", agent: targetName, data: recoveredReasoning.recovery_checks[recoveredReasoning.recovery_checks.length - 1] || {} });
                        }
                    }
                    writeSse(streamRes, { type: sameRuntimeResume ? "native_session" : "runtime_fallback", agent: targetName, taskId, fromRuntime: previousRuntime, toRuntime: activeRuntime, attempt: attemptIndex + 1, text: recoveryText, session: sameRuntimeResume ? { project: targetName, agentType: activeRuntime, mode: "native", turn: activeTaskSession?.turnCount + 1, resumed: true } : undefined });
                    if (laneExecutionId)
                        transitionExecution(laneExecutionId, "spawning", recoveryText, { name: sameRuntimeResume ? "session.native_retry" : "runtime.fallback", status: "warning", data: { from: previousRuntime, to: activeRuntime, attempt: attemptIndex + 1 } });
                    if (sourceTask)
                        updateGroupTaskInlineStatus(sourceTask, "in_progress", recoveryText);
                }
                const recoveryAuditPacket = sourceTask ? [
                    "【恢复前强制复核】",
                    `原始业务目标：${sourceTask.business_goal || sourceTask.title || "未记录"}`,
                    `当前任务状态：${sourceTask.status || "unknown"}；不得沿用旧回执假设当前代码状态。`,
                    `验收条件：${sourceTask.acceptance_criteria || "未记录；缺失时不得宣告完成"}`,
                    `剩余门禁缺口：${(sourceTask.delivery_summary?.acceptance_gate?.failed_checks || []).map((item) => item.label || item.id).join("、") || "以当前真实检查结果为准"}`,
                    "继续前必须重新读取当前文件/分支状态，只处理仍未满足的缺口，并在回执中说明目标是否仍一致。",
                ].join("\n") : "";
                const currentMemoryAttemptSequence = activeTaskSession ? activeTaskSession.turnCount + 1 : memoryDeliveryAttemptSequence;
                const renderAttemptPrompt = (recentGroupContext) => attemptIndex === 0
                    ? renderCrossAgentPrompt({ recentGroupContext })
                    : `${buildRuntimeRecoveryPrompt({
                        originalPrompt: renderCrossAgentPrompt({ recentGroupContext }),
                        previousOutput,
                        previousReceipt,
                        failure: previousOutput,
                        fromRuntime: runtimeCandidates[attemptIndex - 1],
                        toRuntime: activeRuntime,
                        attempt: attemptIndex + 1,
                    })}\n\n${recoveryAuditPacket}`;
                let attemptPrompt = renderAttemptPrompt(tContext);
                targetNativeSessionId = "";
                targetNativeContinuationEvidence = null;
                targetNativeModelCapabilityReceipt = null;
                targetSessionSucceeded = true;
                targetSessionError = "";
                targetMemoryContextConsumptionRecovery = null;
                targetProviderUsage = null;
                let targetRunnerStarted = false;
                const activeProviderModel = String(activeTaskSession?.modelId || "").trim();
                const activeProviderContractId = String(activeTaskSession?.providerContractId || "").trim();
                const activeProviderRuntimeVersion = String(activeTaskSession?.providerRuntimeVersion || "").trim();
                const activeMemoryBinding = activeMemoryContextSnapshot?.context?.group_session_memory_binding || {};
                const providerContextUsageBaseline = activeTaskSession?.providerContextUsageBaseline
                    && activeProviderModel
                    && normalizeAgentRuntimeId(activeTaskSession.providerContextUsageBaseline.provider || "") === normalizeAgentRuntimeId(activeRuntime)
                    && String(activeTaskSession.providerContextUsageBaseline.model || "").trim() === activeProviderModel
                    && String(activeTaskSession.providerContextUsageBaseline.provider_contract_id || "").trim() === activeProviderContractId
                    && String(activeTaskSession.providerContextUsageBaseline.provider_runtime_version || "").trim() === activeProviderRuntimeVersion
                    && String(activeTaskSession.providerContextUsageBaseline.source_compact_epoch || "").trim() === String(activeMemoryBinding.compactEpoch || "precompact").trim()
                    && String(activeTaskSession.providerContextUsageBaseline.source_compact_head_id || "").trim() === String(activeMemoryBinding.compactHeadId || "").trim()
                    && Number(activeTaskSession.providerContextUsageBaseline.source_compact_head_generation || 0) === Number(activeMemoryBinding.compactHeadGeneration || 0)
                    && String(activeTaskSession.providerContextUsageBaseline.source_compact_head_checksum || "").trim() === String(activeMemoryBinding.compactHeadChecksum || "").trim()
                    ? activeTaskSession.providerContextUsageBaseline
                    : null;
                let finalDispatchPayloadGate = buildFinalWorkerDispatchPayloadGate({
                    renderedPrompt: attemptPrompt,
                    workerHandoff,
                    provider: activeRuntime,
                    model: activeProviderModel,
                    providerContractId: activeProviderContractId,
                    providerRuntimeVersion: activeProviderRuntimeVersion,
                    groupSessionMemoryBinding: activeMemoryBinding,
                    groupId,
                    groupSessionId: activeGroupSessionId,
                    taskId,
                    taskAgentSessionId: activeTaskSession?.id || "",
                    providerUsageBaseline: providerContextUsageBaseline,
                });
                let finalDispatchPayloadGateVerification = verifyFinalWorkerDispatchPayloadGate(finalDispatchPayloadGate, {
                    renderedPrompt: attemptPrompt,
                    groupId,
                    groupSessionId: activeGroupSessionId,
                    taskId,
                    taskAgentSessionId: activeTaskSession?.id || "",
                    workerContextPacketId: workerHandoff.worker_context_packet?.packet_id || "",
                });
                let finalDispatchReactiveCompactReceipt = null;
                let finalDispatchReactiveCompactCircuitBreaker = activeTaskSession && activeGroupSessionId.startsWith("gcs_")
                    ? inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(activeTaskSession.id, {
                        groupId,
                        groupSessionId: activeGroupSessionId,
                        taskId,
                    })
                    : null;
                // Production tas_* dispatch never creates a second local summary or
                // character-projected prompt. Oversized canonical parent continuity is
                // blocked; Provider PTL retries use a fresh native generation below.
                const finalDispatchRecoveryRequested = false;
                if (finalDispatchRecoveryRequested && finalDispatchReactiveCompactCircuitBreaker?.blocked !== true) {
                    const finalDispatchRecovery = recoverFinalWorkerDispatchPayload({
                        renderedPrompt: attemptPrompt,
                        recentContext: tContext,
                        renderPrompt: renderAttemptPrompt,
                        workerHandoff,
                        provider: activeRuntime,
                        model: activeProviderModel,
                        providerContractId: activeProviderContractId,
                        providerRuntimeVersion: activeProviderRuntimeVersion,
                        groupSessionMemoryBinding: activeMemoryBinding,
                        groupId,
                        groupSessionId: activeGroupSessionId,
                        taskId,
                        taskAgentSessionId: activeTaskSession?.id || "",
                        forceReactiveCompact: forceReactiveCompactThisAttempt,
                        providerUsageBaseline: providerContextUsageBaseline,
                    });
                    finalDispatchReactiveCompactReceipt = finalDispatchRecovery.receipt || null;
                    if (finalDispatchRecovery.recovered === true) {
                        attemptPrompt = finalDispatchRecovery.prompt;
                        finalDispatchPayloadGate = finalDispatchRecovery.gate;
                        finalDispatchPayloadGateVerification = verifyFinalWorkerDispatchPayloadGate(finalDispatchPayloadGate, {
                            renderedPrompt: attemptPrompt,
                            groupId,
                            groupSessionId: activeGroupSessionId,
                            taskId,
                            taskAgentSessionId: activeTaskSession?.id || "",
                            workerContextPacketId: workerHandoff.worker_context_packet?.packet_id || "",
                        });
                        if (taskId)
                            appendTaskTimelineEvent(taskId, {
                                type: "final_worker_dispatch_reactive_compact_recovered",
                                title: `${targetName} 最终上下文已自动重压缩`,
                                detail: `${finalDispatchReactiveCompactReceipt.original_prompt_tokens || 0} -> ${finalDispatchReactiveCompactReceipt.recovered_prompt_tokens || 0} tokens`,
                                status: "ok",
                                phase: "dispatching",
                                agent: targetName,
                                data: { final_dispatch_reactive_compact: finalDispatchReactiveCompactReceipt },
                            });
                    }
                }
                if (finalDispatchReactiveCompactReceipt?.status === "blocked" && activeTaskSession && activeGroupSessionId.startsWith("gcs_")) {
                    finalDispatchReactiveCompactCircuitBreaker = recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                        groupId,
                        groupSessionId: activeGroupSessionId,
                        taskId,
                        attemptId: finalDispatchReactiveCompactReceipt.receipt_id,
                        outcome: "failure",
                        reason: "final_prompt_recovery_failed_before_provider",
                        error: finalDispatchReactiveCompactReceipt.action,
                    });
                }
                workerHandoff = {
                    ...workerHandoff,
                    worker_context_packet: {
                        ...(workerHandoff.worker_context_packet || {}),
                        final_dispatch_payload_gate: finalDispatchPayloadGate,
                        ...(finalDispatchReactiveCompactReceipt ? { final_dispatch_reactive_compact: finalDispatchReactiveCompactReceipt } : {}),
                    },
                };
                workerHandoffSummary = summarizeWorkerHandoffForUser(workerHandoff);
                if (activeTaskSession && activeMemoryContextSnapshot?.snapshot_id) {
                    const finalGateBinding = attachTaskAgentFinalDispatchPayloadGate(activeTaskSession.id, {
                        snapshotId: activeMemoryContextSnapshot.snapshot_id,
                        finalDispatchPayloadGate,
                        finalDispatchReactiveCompact: finalDispatchReactiveCompactReceipt,
                        renderedPrompt: attemptPrompt,
                    });
                    if (finalGateBinding?.updated !== true) {
                        const error = new Error(`FINAL_WORKER_DISPATCH_SNAPSHOT_BINDING_FAILED:${finalGateBinding?.reason || "unknown"}`);
                        error.code = "FINAL_WORKER_DISPATCH_SNAPSHOT_BINDING_FAILED";
                        error.finalDispatchPayloadGate = finalDispatchPayloadGate;
                        error.binding = finalGateBinding;
                        throw error;
                    }
                    activeTaskSession = finalGateBinding.session || activeTaskSession;
                    activeMemoryContextSnapshot = summarizeTaskAgentMemoryContextSnapshot(finalGateBinding.snapshot);
                    if (typeof mention !== "string")
                        mention.task_agent_memory_context_snapshot = activeMemoryContextSnapshot;
                }
                if (!finalDispatchPayloadGateVerification.valid || finalDispatchPayloadGate.provider_call_allowed !== true) {
                    if (activeTaskSession && activeGroupSessionId.startsWith("gcs_") && finalDispatchPayloadGate.status === "recompact_required") {
                        finalDispatchReactiveCompactCircuitBreaker = recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                            groupId,
                            groupSessionId: activeGroupSessionId,
                            taskId,
                            attemptId: `${finalDispatchPayloadGate.gate_id}:canonical_payload_blocked`,
                            outcome: "failure",
                            reason: "canonical_parent_continuity_exceeds_threshold",
                            error: `prompt_tokens=${finalDispatchPayloadGate.estimated_total_input_tokens};threshold=${finalDispatchPayloadGate.auto_compact_threshold}`,
                        });
                    }
                    const reason = !finalDispatchPayloadGateVerification.valid
                        ? `gate_invalid:${finalDispatchPayloadGateVerification.issues.join(",")}`
                        : finalDispatchRecoveryRequested && finalDispatchReactiveCompactCircuitBreaker?.blocked === true && !finalDispatchReactiveCompactReceipt
                            ? `reactive_compact_circuit_open:failures=${finalDispatchReactiveCompactCircuitBreaker.consecutive_failures || 0}`
                            : `prompt_tokens=${finalDispatchPayloadGate.estimated_total_input_tokens};threshold=${finalDispatchPayloadGate.auto_compact_threshold}`;
                    if (taskId) {
                        addTaskLog(taskId, "error", `${targetName} 最终派发上下文超过模型自动压缩触发线，已在 Provider 调用前拦截：${reason}`);
                        appendTaskTimelineEvent(taskId, {
                            type: "final_worker_dispatch_payload_blocked",
                            title: `${targetName} 最终上下文派发已拦截`,
                            detail: reason,
                            status: "fail",
                            phase: "dispatching",
                            agent: targetName,
                            data: { final_dispatch_payload_gate: finalDispatchPayloadGate },
                        });
                    }
                    const error = new Error(`FINAL_WORKER_DISPATCH_PAYLOAD_BLOCKED:${reason}`);
                    error.code = "FINAL_WORKER_DISPATCH_PAYLOAD_BLOCKED";
                    error.finalDispatchPayloadGate = finalDispatchPayloadGate;
                    throw error;
                }
                const typedMemoryDispatchAdmission = admitChildTypedMemoryDelivery(groupMemoryBundle, {
                    workerContextPacket: workerHandoff.worker_context_packet,
                    renderedPrompt: attemptPrompt,
                    attemptSequence: currentMemoryAttemptSequence,
                });
                lastTypedMemoryDispatchAdmission = typedMemoryDispatchAdmission;
                if (typedMemoryDispatchAdmission.admitted !== true) {
                    throw new Error(`类型化记忆 dispatch-time consume 门禁未通过：${typedMemoryDispatchAdmission.reason || "unknown"}`);
                }
                const typedMemoryDispatchStartedAt = new Date().toISOString();
                const typedMemoryDispatchWal = createChildTypedMemoryDispatchWal(typedMemoryDispatchAdmission, {
                    memoryBundle: groupMemoryBundle,
                    workerContextPacket: workerHandoff.worker_context_packet,
                    renderedPrompt: attemptPrompt,
                    snapshotRenderedPrompt: attemptPrompt,
                    executionId: laneExecutionId,
                    capacityRevalidationProof: capacityRevalidationPreparation?.proof || null,
                });
                let typedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted(typedMemoryDispatchWal, {
                    dispatchStartedAt: typedMemoryDispatchStartedAt,
                    transport: activeRuntime,
                });
                if (!capacityRevalidationCommitted && activeTaskSession && capacityRevalidationPreparation?.proof && typedMemoryDispatchWalRecord) {
                    const capacityCommit = commitTaskAgentSessionCapacityRevalidation(activeTaskSession.id, capacityRevalidationPreparation.proof, {
                        typedMemoryDispatchWalRecordChecksum: typedMemoryDispatchWalRecord.record_checksum,
                        typedMemoryDispatchWalState: typedMemoryDispatchWalRecord.state,
                    });
                    if (capacityCommit?.acknowledged !== true)
                        throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
                    activeTaskSession = capacityCommit.session || activeTaskSession;
                    capacityRevalidationCommitted = true;
                    if (pendingCapacityDowngradeGate && taskId) {
                        addTaskLog(taskId, "info", `${targetName} 已按下降后的模型容量重建并压缩上下文包，且已绑定 durable dispatch`);
                        appendTaskTimelineEvent(taskId, {
                            type: "task_agent_capacity_revalidated",
                            title: `${targetName} 容量降级上下文已重建`,
                            detail: `${pendingCapacityDowngradeGate.previous_context_window || 0} -> ${pendingCapacityDowngradeGate.current_context_window || 0} token`,
                            status: "ok",
                            phase: "dispatching",
                            agent: targetName,
                            data: {
                                capacity_downgrade_gate: pendingCapacityDowngradeGate,
                                capacity_revalidation_proof: capacityRevalidationPreparation.proof,
                                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                            },
                        });
                    }
                }
                if (activeInvocationEdge) {
                    activeInvocationEdge = bindTaskAgentInvocationContext(activeInvocationEdge, {
                        workerContextPacketId: workerHandoff.worker_context_packet?.packet_id || "",
                        memoryContextSnapshotId: activeMemoryContextSnapshot?.snapshot_id || "",
                        memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || "",
                        groupSessionMemoryBinding: activeMemoryContextSnapshot?.context?.group_session_memory_binding || null,
                        summaryCapsuleChecksum: workerHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.capsule_checksum || "",
                        typedMemoryDeliveryCapsule: workerHandoff.worker_context_packet?.typed_memory_delivery_capsule || null,
                        finalDispatchPayloadGate,
                        renderedPrompt: attemptPrompt,
                        compact_epoch: workerHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.compact_epoch || "",
                    });
                    activeInvocationEdge = dispatchTaskAgentInvocationEdge(activeInvocationEdge, {
                        transport: activeRuntime,
                        dispatchedAt: typedMemoryDispatchStartedAt,
                        dispatchTicketId: typedMemoryDispatchAdmission.ticket?.ticket_id || "",
                        dispatchTicketChecksum: typedMemoryDispatchAdmission.ticket?.ticket_checksum || "",
                        typedMemoryDispatchWalFile: typedMemoryDispatchWalRecord?.file || "",
                        typedMemoryDispatchWalRecordChecksum: typedMemoryDispatchWalRecord?.record_checksum || "",
                        typedMemoryDispatchWalState: typedMemoryDispatchWalRecord?.state || "",
                        platformDispatchId: typedMemoryDispatchWalRecord?.platform_dispatch_id || "",
                    });
                }
                let targetRunnerRequestId = "";
                const attemptOutput = await ctx.callAgentForGroupStream(targetName, attemptPrompt, tWorkDir, activeRuntime, {
                    res: streamRes,
                    groupId,
                    timeoutMs: runtimeAttemptTimeoutMs,
                    messageId: responseMessageId,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    taskId,
                    executionId: laneExecutionId,
                    model: activeTaskSession?.modelId || "",
                    taskAgentSessionId: activeTaskSession?.id || "",
                    trustedMemoryProviderChannelRequired: activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    trustedMemoryProviderAcknowledgementRequired: activeMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
                    memoryContextConsumptionReceiptRequired: activeMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
                    memoryContextConsumptionChallenge: activeMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
                    trustedMemoryEnvelopeChecksum: activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
                    trustedMemoryEnvelopeSourceChecksum: activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
                    ...taskAgentSessionLifecycleRunnerOptions(activeMemoryContextSnapshot),
                    agentSession: activeTaskSession ? getTaskAgentSessionOptions(activeTaskSession) : null,
                    durableDispatch: typedMemoryDispatchAdmission.required === true
                        || capacityRevalidationPreparation?.required === true
                        || activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    initialWorkEvents: [runtimeToolContext.workEvent],
                    onRunnerRequestCreated: (requestId) => {
                        targetRunnerRequestId = String(requestId || "");
                        if (typedMemoryDispatchWalRecord && targetRunnerRequestId) {
                            typedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted({ required: true, record: typedMemoryDispatchWalRecord }, {
                                dispatchStartedAt: typedMemoryDispatchStartedAt,
                                transport: targetRunnerRequestId.startsWith("adr_") ? "server_direct_cli" : "external_runner",
                                runnerRequestId: targetRunnerRequestId,
                            });
                        }
                        if (activeInvocationEdge && targetRunnerRequestId) {
                            activeInvocationEdge = bindTaskAgentInvocationRunnerRequest(activeInvocationEdge, targetRunnerRequestId, {
                                typedMemoryDispatchWalRecordChecksum: typedMemoryDispatchWalRecord?.record_checksum || "",
                                typedMemoryDispatchWalState: typedMemoryDispatchWalRecord?.state || "",
                            });
                        }
                    },
                    onDone: (opts) => {
                        targetFileChanges = opts.fileChanges;
                        targetWorkEvents = [...targetWorkEvents, ...(Array.isArray(opts.workEvents) ? opts.workEvents : [])].slice(-80);
                        targetNativeSessionId = String(opts.nativeSessionId || "");
                        targetNativeContinuationEvidence = opts.nativeContinuationEvidence || null;
                        targetNativeModelCapabilityReceipt = opts.nativeModelCapabilityReceipt || null;
                        targetNativeModelCapabilityRecord = opts.nativeModelCapabilityRecord || targetNativeModelCapabilityRecord;
                        targetModelCapabilityRefreshOutcome = opts.modelCapabilityRefreshOutcome || targetModelCapabilityRefreshOutcome;
                        targetProviderToolAccessEvidence = opts.providerToolAccessEvidence || targetProviderToolAccessEvidence;
                        if (opts.providerMemoryChannelEvidence?.required === true)
                            targetProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
                        if (opts.memoryContextConsumptionReceipt)
                            targetMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
                        if (opts.memoryContextConsumptionRecovery)
                            targetMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
                        targetProviderUsage = opts.usage || null;
                        targetSessionSucceeded = opts.isError !== true;
                        targetSessionError = String(opts.error || opts.message || "");
                        targetRunnerRequestId = String(opts.runnerRequestId || targetRunnerRequestId || "");
                        targetRunnerStarted = opts.runnerStarted === true;
                    }
                });
                if (!capacityRevalidationCommitted && activeTaskSession && capacityRevalidationPreparation?.proof) {
                    const capacityCommit = commitTaskAgentSessionCapacityRevalidation(activeTaskSession.id, capacityRevalidationPreparation.proof, {
                        runnerRequestId: targetRunnerRequestId,
                        runnerStarted: targetRunnerStarted,
                    });
                    if (capacityCommit?.acknowledged !== true)
                        throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
                    activeTaskSession = capacityCommit.session || activeTaskSession;
                    capacityRevalidationCommitted = true;
                    if (pendingCapacityDowngradeGate && taskId) {
                        addTaskLog(taskId, "info", `${targetName} 已按下降后的模型容量重建并压缩上下文包，且已绑定 runner return`);
                        appendTaskTimelineEvent(taskId, {
                            type: "task_agent_capacity_revalidated",
                            title: `${targetName} 容量降级上下文已重建`,
                            detail: `${pendingCapacityDowngradeGate.previous_context_window || 0} -> ${pendingCapacityDowngradeGate.current_context_window || 0} token`,
                            status: "ok",
                            phase: "executing",
                            agent: targetName,
                            data: {
                                capacity_downgrade_gate: pendingCapacityDowngradeGate,
                                capacity_revalidation_proof: capacityRevalidationPreparation.proof,
                                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                            },
                        });
                    }
                }
                if (typedMemoryDispatchWalRecord && targetRunnerStarted) {
                    typedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(typedMemoryDispatchWalRecord, {
                        runnerRequestId: targetRunnerRequestId,
                        runnerSucceeded: targetSessionSucceeded,
                        output: attemptOutput,
                    });
                }
                const attemptFailureText = targetSessionSucceeded ? attemptOutput : `Agent 进程退出：${targetSessionError || attemptOutput}`;
                const attemptRecoveryDecision = shouldSwitchRuntime(attemptFailureText);
                const permissionDrift = !!sourceTask && taskRequiresCodeChanges(sourceTask) && attemptRecoveryDecision.permissionDrift === true;
                if (activeTaskSession) {
                    activeTaskSession = recordTaskAgentSessionTurn(activeTaskSession.id, {
                        nativeSessionId: targetNativeSessionId,
                        nativeContinuationEvidence: targetNativeContinuationEvidence,
                        nativeContinuationUnverified: targetNativeContinuationEvidence?.nativeResumeRequested === true
                            && targetNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
                        success: targetSessionSucceeded && !permissionDrift,
                        error: targetSessionError || (permissionDrift || !targetSessionSucceeded ? attemptOutput : ""),
                        nativeSessionInvalid: isProviderPromptTooLongFailure(targetSessionError || attemptOutput),
                        permissionDrift,
                        nativeModelCapabilityRecord: targetNativeModelCapabilityRecord,
                        runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                    }) || activeTaskSession;
                    if (taskId)
                        addTaskLog(taskId, targetSessionSucceeded ? "info" : "warning", `${targetName} 会话轮次已记录：${activeTaskSession.agentType} turn=${activeTaskSession.turnCount}${activeTaskSession.nativeSessionId ? "，已捕获原生 session ID" : "，使用 scratchpad 续跑保护"}`);
                    const delivery = recordTaskAgentMemoryContextDelivery(activeTaskSession.id, {
                        snapshotId: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                        renderedPrompt: attemptPrompt,
                        snapshotRenderedPrompt: attemptPrompt,
                        executionId: laneExecutionId,
                        traceId: sourceTask?.trace_id || "",
                        runtime: activeRuntime,
                        attempt: attemptIndex + 1,
                        nativeSessionId: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                        runnerRequestId: targetRunnerRequestId,
                        dispatched: targetRunnerStarted,
                        executionSucceeded: targetSessionSucceeded,
                        output: attemptOutput,
                        fileChanges: targetFileChanges,
                        nativeContinuationEvidence: targetNativeContinuationEvidence,
                        providerMemoryChannelEvidence: targetProviderMemoryChannelEvidence,
                        memoryContextConsumptionReceipt: targetMemoryContextConsumptionReceipt,
                        memoryContextConsumptionRecovery: targetMemoryContextConsumptionRecovery,
                        providerUsage: targetProviderUsage,
                        runnerStarted: targetRunnerStarted,
                        invocationEdgeId: activeInvocationEdge?.invocation_edge_id || "",
                        recoveryOutcome: attemptIndex > 0
                            ? (activeRuntime === runtimeCandidates[attemptIndex - 1] ? "native_resume_recovery" : "provider_switch_recovery")
                            : "",
                    });
                    if (delivery) {
                        activeTaskSession = delivery.session || activeTaskSession;
                        activeMemoryContextDelivery = delivery.receipt || null;
                        if (typedMemoryDispatchWalRecord && activeMemoryContextDelivery?.delivered === true) {
                            typedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(typedMemoryDispatchWalRecord, {
                                runnerRequestId: targetRunnerRequestId,
                                runnerSucceeded: targetSessionSucceeded,
                                output: attemptOutput,
                                deliveryReceipt: activeMemoryContextDelivery,
                            });
                        }
                        if (activeMemoryContextSnapshot)
                            activeMemoryContextSnapshot.delivery_receipt = activeMemoryContextDelivery;
                        if (taskId) {
                            addTaskLog(taskId, activeMemoryContextDelivery?.delivered === true ? "success" : "warning", `${targetName} 记忆上下文送达回执：${activeMemoryContextDelivery?.status || "unknown"} / ${activeMemoryContextDelivery?.promptBindingMode || "unknown"}`);
                            appendTaskTimelineEvent(taskId, {
                                type: "task_agent_memory_context_delivery",
                                title: `${targetName} 记忆上下文已送入执行器`,
                                detail: `session=${activeTaskSession.id}；snapshot=${activeMemoryContextSnapshot?.snapshot_id || "unknown"}；binding=${activeMemoryContextDelivery?.promptBindingMode || "unknown"}`,
                                status: activeMemoryContextDelivery?.delivered === true ? "ok" : "fail",
                                phase: "executing",
                                agent: targetName,
                                data: {
                                    task_agent_memory_context_snapshot: activeMemoryContextSnapshot,
                                    memory_context_delivery_receipt: activeMemoryContextDelivery,
                                    provider_tool_access_evidence: targetProviderToolAccessEvidence,
                                },
                            });
                        }
                        const typedMemoryDeliveryCommit = commitChildTypedMemoryDelivery(groupMemoryBundle, {
                            workerContextPacket: workerHandoff.worker_context_packet,
                            dispatchEvidence: {
                                deliveryReceipt: activeMemoryContextDelivery,
                                renderedPrompt: attemptPrompt,
                                dispatchTicket: typedMemoryDispatchAdmission.ticket,
                                dispatchStartedAt: typedMemoryDispatchStartedAt,
                                dispatched: targetRunnerStarted,
                                executionReturned: targetRunnerStarted,
                            },
                        });
                        if (taskId && typedMemoryDeliveryCommit.committed === true) {
                            addTaskLog(taskId, "info", `${targetName} 类型化记忆投递租约已提交：${typedMemoryDeliveryCommit.lease?.leaseId || "unknown"}`);
                        }
                        if (typedMemoryDispatchWalRecord && targetRunnerStarted && activeMemoryContextDelivery?.delivered === true) {
                            typedMemoryDispatchWalRecord = markChildTypedMemoryDispatchCommitted(typedMemoryDispatchWalRecord, typedMemoryDeliveryCommit);
                        }
                    }
                }
                if (permissionDrift && taskId) {
                    const detail = `${targetName} 声明需要项目写入，但执行器实际为只读；旧 native session 已隔离，将自动重建或切换执行器`;
                    addTaskLog(taskId, "warning", detail);
                    appendTaskTimelineEvent(taskId, { type: "permission_drift", title: `${targetName} 权限漂移已自动恢复`, detail, status: "warn", phase: "reworking", agent: targetName, data: { runtime: activeRuntime, session_id: activeTaskSession?.id || "", native_session_id: targetNativeSessionId || "" } });
                    if (laneExecutionId)
                        transitionExecution(laneExecutionId, "spawning", detail, { name: "permission.drift", status: "warning", failureClass: "permission", data: { runtime: activeRuntime } });
                }
                const failedAttempt = !targetSessionSucceeded || checkTaskFailure(attemptOutput);
                const effectiveFailedAttempt = failedAttempt || permissionDrift;
                if (activeInvocationEdge) {
                    activeInvocationEdge = completeTaskAgentInvocationEdge(activeInvocationEdge, {
                        success: !effectiveFailedAttempt,
                        nativeSessionId: targetNativeSessionId || activeTaskSession?.nativeSessionId || "",
                        nativeContinuationEvidence: targetNativeContinuationEvidence,
                        nativeModelCapabilityReceipt: targetNativeModelCapabilityReceipt,
                        nativeModelCapabilityRecord: targetNativeModelCapabilityRecord,
                        provider: activeRuntime,
                        runnerRequestId: targetRunnerRequestId,
                        output: attemptOutput,
                        error: targetSessionError,
                        reason: permissionDrift ? "permission_drift" : effectiveFailedAttempt ? "execution_failed" : "execution_completed",
                    });
                    activeInvocationEdge = bindTaskAgentInvocationMemoryDelivery(activeInvocationEdge, {
                        deliveryReceipt: activeMemoryContextDelivery,
                    });
                }
                if (!effectiveFailedAttempt) {
                    if (activeTaskSession && activeGroupSessionId.startsWith("gcs_")
                        && (finalDispatchReactiveCompactReceipt || Number(finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0) > 0)) {
                        finalDispatchReactiveCompactCircuitBreaker = recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                            groupId,
                            groupSessionId: activeGroupSessionId,
                            taskId,
                            attemptId: `${finalDispatchReactiveCompactReceipt?.receipt_id || finalDispatchPayloadGate.gate_id}:provider_accepted`,
                            outcome: "success",
                            reason: "provider_accepted_final_prompt",
                        });
                    }
                    tOutput = attemptOutput;
                    break;
                }
                if (targetMemoryContextConsumptionRecovery?.suppress_task_replay === true) {
                    if (taskId) {
                        const detail = `${targetName} 已完成 Provider 工作，但模型加载回执补救未通过；为避免重复改码，已禁止自动整任务重放`;
                        addTaskLog(taskId, "warning", detail);
                        appendTaskTimelineEvent(taskId, {
                            type: "memory_context_consumption_recovery_blocked",
                            title: `${targetName} 记忆加载回执补救失败`,
                            detail,
                            status: "fail",
                            phase: "blocked",
                            agent: targetName,
                            data: { memory_context_consumption_recovery: targetMemoryContextConsumptionRecovery },
                        });
                    }
                    tOutput = attemptOutput;
                    break;
                }
                previousOutput = attemptOutput;
                previousReceipt = extractAgentReceipt(attemptOutput, targetName);
                const providerPromptTooLong = isProviderPromptTooLongFailure(targetSessionError || attemptOutput);
                if (activeTaskSession && activeGroupSessionId.startsWith("gcs_") && forceReactiveCompactThisAttempt && providerPromptTooLong) {
                    finalDispatchReactiveCompactCircuitBreaker = recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                        groupId,
                        groupSessionId: activeGroupSessionId,
                        taskId,
                        attemptId: `${finalDispatchReactiveCompactReceipt?.receipt_id || finalDispatchPayloadGate.gate_id}:provider_ptl`,
                        outcome: "failure",
                        reason: "provider_prompt_too_long_after_reactive_compact",
                        error: targetSessionError || attemptOutput,
                    });
                }
                if (providerPromptTooLong && !providerPromptTooLongReactiveRetryAttempted) {
                    const retryCircuit = activeTaskSession && activeGroupSessionId.startsWith("gcs_")
                        ? inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(activeTaskSession.id, { groupId, groupSessionId: activeGroupSessionId, taskId })
                        : null;
                    if (retryCircuit?.blocked === true) {
                        if (taskId)
                            addTaskLog(taskId, "error", `${targetName} 最终上下文自动恢复断路器已打开，本会话不再重复 Provider PTL 重试`);
                    }
                    else {
                        providerPromptTooLongReactiveRetryAttempted = true;
                        forceProviderPromptTooLongReactiveCompact = true;
                        runtimeCandidates.splice(attemptIndex + 1, 0, normalizeAgentRuntimeId(activeRuntime));
                        if (taskId)
                            appendTaskTimelineEvent(taskId, {
                                type: "final_worker_provider_prompt_too_long_recovery_scheduled",
                                title: `${targetName} Provider 上下文超限，正在自动恢复`,
                                detail: `provider=${activeRuntime}；同一任务会话仅重试一次`,
                                status: "warn",
                                phase: "reworking",
                                agent: targetName,
                                data: { provider: activeRuntime, task_agent_session_id: activeTaskSession?.id || "", group_session_id: activeGroupSessionId },
                            });
                        continue;
                    }
                }
                const fallbackDecision = attemptRecoveryDecision;
                if (!fallbackDecision.switchRuntime || attemptIndex >= runtimeCandidates.length - 1) {
                    tOutput = attemptOutput;
                    break;
                }
            }
            if (targetNativeModelCapabilityRecord?.recorded === true && taskId) {
                const capabilityEntry = targetNativeModelCapabilityRecord.entry || {};
                addTaskLog(taskId, "info", `${targetName} 原生模型容量已验证：${capabilityEntry.provider || activeRuntime}/${capabilityEntry.model || "default"} context=${capabilityEntry.contextWindow || 0}`);
                appendTaskTimelineEvent(taskId, {
                    type: "native_model_capability_recorded",
                    title: `${targetName} 模型容量回执已记录`,
                    detail: `${capabilityEntry.provider || activeRuntime}/${capabilityEntry.model || "default"} · ${capabilityEntry.contextWindow || 0} token`,
                    status: "ok",
                    phase: "executing",
                    agent: targetName,
                    data: { model_capability_entry: capabilityEntry, validation: targetNativeModelCapabilityRecord.validation || null },
                });
            }
            if (targetModelCapabilityRefreshOutcome?.recorded === true && taskId) {
                appendTaskTimelineEvent(taskId, {
                    type: "model_capability_refresh_outcome",
                    title: `${targetName} 模型容量刷新结果`,
                    detail: String(targetModelCapabilityRefreshOutcome.outcome || "unknown"),
                    status: targetModelCapabilityRefreshOutcome.outcome === "refreshed" ? "ok" : "warn",
                    phase: "executing",
                    agent: targetName,
                    data: { model_capability_refresh_outcome: targetModelCapabilityRefreshOutcome },
                });
            }
            if (laneChangeSnapshot)
                targetFileChanges = ctx.getFileChanges(targetName, laneChangeSnapshot);
            targetReceipt = extractAgentReceipt(tOutput, targetName);
            if (requiresAckPreflight && targetReceipt) {
                const ackReceipt = targetReceipt;
                const ackReview = buildAckPreflightReview(sourceTask, [ackReceipt], [{ project: targetName, objective: implementationMessage }]);
                if (ackReview.status === "approved" && ackReview.rejected.length === 0) {
                    const currentTask = taskId ? (getTaskById(taskId) || sourceTask) : sourceTask;
                    const nextDeliverySummary = {
                        ...(currentTask?.delivery_summary || {}),
                        ack_gate_passed: true,
                        ack_review: ackReview,
                    };
                    if (taskId) {
                        updateTask(taskId, {
                            delivery_summary: nextDeliverySummary,
                            workflow_meta: {
                                ...(currentTask?.workflow_meta || {}),
                                ack_preflight: {
                                    status: "approved",
                                    approved_at: new Date().toISOString(),
                                    agent: targetName,
                                    review: ackReview,
                                },
                            },
                        });
                        addTaskLog(taskId, "success", `${targetName} ACK 前置审核通过，立即复用同一原生会话进入实现阶段`);
                        appendTaskTimelineEvent(taskId, {
                            type: "ack_preflight_approved",
                            title: `${targetName} 接单确认通过`,
                            detail: "目标、范围和验证计划已确认，正在进入实现阶段",
                            status: "ok",
                            phase: "dispatching",
                            agent: targetName,
                            data: { ack_review: ackReview, task_agent_session_id: activeTaskSession?.id || "" },
                        });
                    }
                    sourceTask.delivery_summary = nextDeliverySummary;
                    writeSse(streamRes, {
                        type: "status",
                        text: `${targetName} 已确认目标和范围，正在进入实现阶段...`,
                        agent: targetName,
                        taskId,
                    });
                    const implementationPrompt = [
                        "ACK 前置审核已通过。现在进入同一工作单的实现阶段，不要再次只回复 ACK。",
                        "请从当前工作区继续，实际完成下面的原始工作单：",
                        implementationMessage,
                        "完成后必须返回新的 CCM_AGENT_RECEIPT，包含真实修改文件、实际执行的验证命令及结果、阻塞和待确认事项。",
                    ].join("\n\n");
                    targetNativeSessionId = "";
                    targetSessionSucceeded = true;
                    targetSessionError = "";
                    const implementationOutput = await ctx.callAgentForGroupStream(targetName, implementationPrompt, tWorkDir, activeRuntime, {
                        res: streamRes,
                        groupId,
                        timeoutMs: runtimeAttemptTimeoutMs,
                        messageId: `${responseMessageId}-implementation`,
                        allowedTools: toolContext.allowedTools,
                        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                        taskId,
                        executionId: laneExecutionId,
                        model: activeTaskSession?.modelId || "",
                        taskAgentSessionId: activeTaskSession?.id || "",
                        ...taskAgentSessionLifecycleRunnerOptions(activeMemoryContextSnapshot),
                        agentSession: activeTaskSession ? getTaskAgentSessionOptions(activeTaskSession) : null,
                        durableDispatch: lastTypedMemoryDispatchAdmission.required === true || capacityRevalidationPreparation?.required === true,
                        initialWorkEvents: [runtimeToolContext.workEvent],
                        onDone: (opts) => {
                            targetFileChanges = opts.fileChanges;
                            targetWorkEvents = [...targetWorkEvents, ...(Array.isArray(opts.workEvents) ? opts.workEvents : [])].slice(-80);
                            targetNativeSessionId = String(opts.nativeSessionId || "");
                            targetNativeModelCapabilityRecord = opts.nativeModelCapabilityRecord || targetNativeModelCapabilityRecord;
                            targetModelCapabilityRefreshOutcome = opts.modelCapabilityRefreshOutcome || targetModelCapabilityRefreshOutcome;
                            targetProviderToolAccessEvidence = opts.providerToolAccessEvidence || targetProviderToolAccessEvidence;
                            if (opts.providerMemoryChannelEvidence?.required === true)
                                targetProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
                            if (opts.memoryContextConsumptionReceipt)
                                targetMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
                            if (opts.memoryContextConsumptionRecovery)
                                targetMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
                            targetSessionSucceeded = opts.isError !== true;
                            targetSessionError = String(opts.error || opts.message || "");
                        },
                    });
                    if (activeTaskSession) {
                        activeTaskSession = recordTaskAgentSessionTurn(activeTaskSession.id, {
                            nativeSessionId: targetNativeSessionId,
                            nativeContinuationEvidence: targetNativeContinuationEvidence,
                            nativeContinuationUnverified: targetNativeContinuationEvidence?.nativeResumeRequested === true
                                && targetNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
                            success: targetSessionSucceeded,
                            error: targetSessionError || (!targetSessionSucceeded ? implementationOutput : ""),
                            nativeModelCapabilityRecord: targetNativeModelCapabilityRecord,
                            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                        }) || activeTaskSession;
                    }
                    tOutput = implementationOutput;
                    const implementationReceipt = extractAgentReceipt(implementationOutput, targetName);
                    targetReceipt = implementationReceipt
                        ? {
                            ...implementationReceipt,
                            ack: implementationReceipt.ack || ackReceipt.ack,
                            ack_preflight: { status: "approved", review: ackReview },
                        }
                        : {
                            ...ackReceipt,
                            status: "partial",
                            summary: "ACK 已通过，但实现阶段缺少结构化结果说明",
                            blockers: uniqueStrings([...(ackReceipt.blockers || []), "实现阶段缺少 CCM_AGENT_RECEIPT"]),
                            needs: uniqueStrings([...(ackReceipt.needs || []), "补充实现结果、文件变更和验证证据"]),
                            ack_preflight: { status: "approved", review: ackReview },
                        };
                    if (laneChangeSnapshot)
                        targetFileChanges = ctx.getFileChanges(targetName, laneChangeSnapshot);
                }
            }
            const detectedSkillUse = attachInvokedSkillsToReceipt(targetReceipt, tOutput, toolContext.allowedTools, runtimeToolContext.audit);
            targetReceipt = detectedSkillUse.receipt;
            targetInvokedSkills = detectedSkillUse.invoked;
        }
        env._locals = { ...env._locals, outputs, targetName, tWorkDir, tAgentType, activeTaskSession, laneExecutionId, childTaskText, workerHandoff, developmentContract, tPrompt, advisoryOnly, toolContext, runtimeToolContext, activeGroupSessionId, activeInvocationEdge, groupMemoryBundle, workerMemoryContext, workerMemoryPacket, activeMemoryContextSnapshot, activeMemoryContextDelivery, memoryConsumptionChallenge, capacityRevalidationPreparation, capacityRevalidationCommitted, memoryPacket, tContext, providerSwitchSessionBinding, workerHandoffSummary, targetReceipt, tOutput, activeRuntime, targetFileChanges, targetWorkEvents, targetNativeSessionId, targetInvokedSkills, testAgentNativeReport, testAgentExecutionPlan, testAgentPlanDispatch, testAgentCliDispatch, responseMessageId, targetProviderToolAccessEvidence };
        return (0, collaboration_cross_agents_part_03_1.executeMentionJobTryB)(mention, env);
    }
    catch (error) {
        return (0, collaboration_cross_agents_part_03_1.handleExecuteMentionJobCatch)(error, { outputs, targetName, groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, addTaskLog, updateGroupMemory, appendGroupMessage, emitAssignmentStatus });
    }
}
//# sourceMappingURL=collaboration-cross-agents-part-02-part-02.js.map