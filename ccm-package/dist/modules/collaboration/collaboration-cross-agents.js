"use strict";
// collaboration-cross-agents.ts — merged from 5 part files (behavior-freeze merge).
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
exports.executeMentionJob = executeMentionJob;
exports.executeMentionJobTryA = executeMentionJobTryA;
exports.handleExecuteMentionJobCatch = handleExecuteMentionJobCatch;
exports.executeMentionJobTryB = executeMentionJobTryB;
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const collaboration_cross_agents_helpers_1 = require("./collaboration-cross-agents-helpers");
const group_memory_context_1 = require("./group-memory-context");
const group_session_model_context_1 = require("./group-session-model-context");
const storage_1 = require("./storage");
const group_memory_storage_1 = require("./group-memory-storage");
const memory_1 = require("../../projects/memory");
const third_party_memory_snapshot_1 = require("../../integrations/third-party-memory-snapshot");
const agent_sessions_shared_1 = require("../../tasks/agent-sessions-shared");
const collaboration_cross_agents_part_02_part_02_native_test_1 = require("./collaboration-cross-agents-part-02-part-02-native-test");
const execution_kernel_1 = require("../../agents/execution-kernel");
const collaboration_agent_parallel_dispatch_1 = require("./collaboration-agent-parallel-dispatch");
const agent_communication_v2_1 = require("../../system/agent-communication-v2");
const agent_communication_mcp_1 = require("../../integrations/agent-communication-mcp");
const conversation_permission_policy_1 = require("../tools/conversation-permission-policy");
const task_conversation_links_1 = require("../../system/task-conversation-links");
async function processCrossAgents(groupId, group, sourceProject, output, atMentions, configs, ctx, streamRes = null, depth = 0, seenMentions = new Set(), executionOrder = "parallel", planMessageId = "", taskId = "", deps) {
    const { addGroupLog, addTaskLog, admitChildTypedMemoryDelivery, appendAgentQaTrace, appendGroupMessage, appendTaskTimelineEvent, attachExecutionWorkspace, attachInvokedSkillsToReceipt, attachMemoryContextConsumptionChallenge, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery, bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAckPreflightReview, buildAgentMemoryContextBundleWithManifestSelection, buildAgentMemoryPacket, buildAgentQaProtocolInstructions, buildAgentToolContext, buildChildAgentDevelopmentContract, buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCollaborationConflictPlan, orderMentionsForConflictPlan, buildCoordinatorCollaborationInstructions, buildCoordinatorReworkContinuationFallback, buildCoordinatorSharedFilesContext, buildFinalWorkerDispatchPayloadGate, buildGroupContextPacket, buildMemberCollaborationInstructions, buildNativeTestAgentPlanBlockedReceipt, buildNativeTestAgentReceipt, buildNativeTestAgentReviewSummary, buildNativeTestAgentRuntimeToolContext, buildPostReviewSpotCheckSummary, buildProjectExecutionBrief, buildProjectVerificationHints, buildRuntimeRecoveryCandidates, buildRuntimeRecoveryPrompt, buildTaskPreflightReasoning, buildTaskProviderSwitchRequests, buildWorkerContinuationHandoff, buildWorkflowMeta, checkTaskFailure, claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText, compactRuntimeToolAudit, completeTaskAgentInvocationEdge, coordinatorReworkRouteNeedsFreshVerifier, coordinatorReworkRouteRequiresStop, coordinatorReworkRouteUsesVerifier, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge, dispatchTaskAgentInvocationEdge, emitAssignmentStatus, ensureExecution, escapeRegExp, evaluateAdvisoryPermissionBoundary, evaluateGreenContract, extractActionableMentions, extractAgentReceipt, extractRunnerVerificationEvidence, formatCollectedAgentOutput, formatNativeTestAgentOutput, formatNativeTestAgentPlanBlockedOutput, getAgentDependencyStateFromOutputs, getChildAgentIsolationMode, getCoordinatorActionMentions, getCoordinatorMember, getInitialWorkflowMeta, getMentionReworkRoute, getProjectAgentCapabilityProfile, getProjectExtraConfig, getReceiptAssignmentStatus, getRoutableMembers, getTaskAgentSessionOptions, getTaskById, getTestAgentHandoffPayload, getTestAgentHandoffProjectWorkDir, getTestAgentHandoffReviewSubject, getTestAgentHandoffWarnings, getWorkDirState, handleAgentQaRequests, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, isCoordinatorTestAgentName, isProviderPromptTooLongFailure, loadExecution, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted, markChildTypedMemoryRunnerReturned, memoryContextConsumptionReceiptFile, normalizeAgentRuntimeId, normalizeMentionTask, normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir, prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, recordAgentRuntimeLifecycle, recordReplayRepairTimelineBindingsForMention, recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator, recordWorkerContextProviderSwitchSessionBindingForCoordinator, recoverFinalWorkerDispatchPayload, renderGroupPostCompactDynamicContextDelta, renderGroupPostCompactInvokedSkillAttachments, renderGroupPostCompactPlanAttachment, renderMemoryContextForWorker, resolveMemberRuntime, runGroupOrchestrator, runMainAgentPostReviewSpotCheck, runTestAgentCliJob, runtimeToolDispatchBlockedMessage, runtimeToolDispatchBlockedReceipt, runtimeToolSnapshotFromAudit, shouldSwitchRuntime, stopWrongDirectionWorkerForCoordinatorRoute, stripAgentQaProtocolBlocks, summarizeNativeTestAgentExecutionPlan, summarizeReplayRepairTimelineBindingsForEvent, summarizeTaskAgentMemoryContextSnapshot, summarizeWorkerHandoffForUser, taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, taskRequiresVerification, transitionExecution, uniqueStrings, updateGroupMemory, updateGroupTaskInlineStatus, updateTask, updateTaskWorkItemFromReceipt, validateTestAgentHandoffRegisteredWorkDirs, verifyFinalWorkerDispatchPayloadGate, writeSse } = deps;
    const collectedOutputs = [];
    if (depth > 3) {
        console.log("[跨Agent协作] 达到最大递归深度，停止继续转发");
        return collectedOutputs;
    }
    const sourceTask = getTaskById(taskId);
    const mentionLabels = atMentions.map(m => typeof m === "string" ? m : m.mention).filter(Boolean);
    console.log(`[跨Agent协作] 源: ${sourceProject}, 检测到 @mentions: ${mentionLabels.join(", ")}`);
    let uniqueMentions = atMentions.filter((m, idx, arr) => {
        const key = typeof m === "string" ? m : `${m.targetName}:${m.message}`;
        return arr.findIndex(item => (typeof item === "string" ? item : `${item.targetName}:${item.message}`) === key) === idx;
    });
    const conflictInputs = uniqueMentions.map((mention, index) => {
        const project = (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(mention);
        const runtime = resolveMemberRuntime(project, group, configs);
        const profile = getProjectAgentCapabilityProfile(project, runtime?.workDir || "");
        const handoff = typeof mention === "string"
            ? null
            : (mention?.testAgentHandoff || mention?.test_agent_handoff || getTestAgentHandoffPayload?.(mention) || null);
        const verificationOnly = isCoordinatorTestAgentName(project)
            || !!(handoff && (mention?.testAgentReviewRecheck || mention?.test_agent_review_recheck || mention?.rework_kind === "test_agent_review_recheck"));
        const testAgentWorkDir = verificationOnly
            ? (getTestAgentHandoffProjectWorkDir?.(handoff) || handoff?.projects?.[0]?.workDir || "")
            : "";
        return {
            key: `${project}:${index}`,
            project,
            task: typeof mention === "string" ? output : String(mention.message || mention.task || output || ""),
            workDir: testAgentWorkDir || runtime?.workDir || path.join(process.cwd(), `.ccm-missing-${project}`),
            writablePaths: verificationOnly ? [] : (profile.writable_paths || []),
            verificationOnly,
        };
    });
    const conflictPlan = buildCollaborationConflictPlan(conflictInputs, executionOrder);
    uniqueMentions = uniqueMentions.map((mention, index) => {
        const lane = conflictPlan.lanes[index];
        const base = typeof mention === "string"
            ? { mention, targetName: (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(mention), message: output, structured: false }
            : mention;
        return {
            ...base,
            conflictWorkspaceKey: lane?.conflictWorkspaceKey || "",
            conflictGroup: lane?.conflictGroup || "",
            mergeOwner: lane?.mergeOwner !== false,
            verificationOnly: lane?.verificationOnly === true,
            runAfterWriters: lane?.runAfterWriters === true,
        };
    });
    if (typeof orderMentionsForConflictPlan === "function") {
        uniqueMentions = orderMentionsForConflictPlan(uniqueMentions, conflictPlan);
    }
    if (conflictPlan.protected) {
        const writeVerify = (conflictPlan.conflicts || []).some((item) => item.writeVerifyOverlap);
        const conflictText = writeVerify
            ? `主 Agent 检测到 ${conflictPlan.conflicts.length} 组潜在修改冲突（含同仓库写验），已自动改为先写后验串行；实现 Agent 复用隔离 worktree，TestAgent 在写完成后验证。`
            : `主 Agent 检测到 ${conflictPlan.conflicts.length} 组潜在修改冲突，已自动改为串行执行并让冲突 Agent 复用同一隔离 worktree。`;
        if (taskId) {
            addTaskLog(taskId, "warning", conflictText);
            appendTaskTimelineEvent(taskId, { type: "conflict_plan", title: "跨 Agent 冲突保护", detail: conflictText, status: "warn", phase: "planning", agent: sourceProject, data: conflictPlan });
        }
        appendGroupMessage(groupId, {
            id: "m" + Date.now().toString(36) + "conflict" + crypto.randomBytes(2).toString("hex"),
            role: "assistant",
            agent: "system",
            type: "conflict_plan",
            content: conflictText,
            timestamp: new Date().toISOString(),
            task_id: taskId || undefined,
            conflictPlan,
            workflow: buildWorkflowMeta("planning", "冲突保护计划"),
        });
        writeSse(streamRes, { type: "conflict_plan", text: conflictText, taskId, conflictPlan });
    }
    const completedOutputsByAgent = new Map();
    const dependencyStates = new Map();
    const rememberMentionOutputsFn = (mention, outputs) => (0, collaboration_cross_agents_helpers_1.rememberMentionOutputs)(mention, outputs, completedOutputsByAgent, dependencyStates, getAgentDependencyStateFromOutputs);
    const getBlockingDependencyFn = (mention) => (0, collaboration_cross_agents_helpers_1.getBlockingDependency)(mention, uniqueMentions, dependencyStates);
    const skipMentionDueToDependencyFn = (mention, dependency) => (0, collaboration_cross_agents_helpers_1.skipMentionDueToDependency)(mention, dependency, { groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, updateTaskWorkItemFromReceipt, emitAssignmentStatus, addTaskLog, updateGroupMemory, appendGroupMessage, writeSse });
    const crossEnv = { deps, groupId, group, sourceProject, output, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, sourceTask, completedOutputsByAgent, processCrossAgents };
    // 取消守卫：requestTaskCancellation 只能杀死"当前"子 Agent 进程；
    // 串行/依赖派发循环若不在迭代边界检查取消标记，会在被杀进程返回后继续派发剩余成员。
    // 包在 executeMentionJob 上让三个派发分支（依赖拓扑、串行分层、并行）统一止血。
    let cancellationNoticed = false;
    const executeMentionJob = async (mention) => {
        if (taskId && (0, execution_kernel_1.isTaskCancellationRequested)(taskId)) {
            const targetName = (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(mention) || "";
            if (!cancellationNoticed) {
                cancellationNoticed = true;
                addTaskLog(taskId, "warning", `任务已被取消，停止派发剩余子 Agent（首个跳过：${targetName}）`);
                appendTaskTimelineEvent(taskId, {
                    type: "dispatch_cancelled",
                    title: "取消后停止派发",
                    detail: "用户已取消任务，剩余子 Agent 不再派发",
                    status: "warn",
                    phase: "dispatching",
                    agent: sourceProject,
                });
            }
            return [`【${targetName}】\n- 状态：cancelled\n- 摘要: 任务已被用户取消，本子 Agent 未派发`];
        }
        return executeMentionJobImpl(mention, crossEnv);
    };
    const hasExplicitDependencies = uniqueMentions.some((mention) => typeof mention !== "string" && String(mention.dependsOn || "").trim());
    if (hasExplicitDependencies) {
        const pending = [...uniqueMentions];
        const completed = new Set();
        let guard = 0;
        while (pending.length > 0 && guard < 20) {
            guard++;
            const readyIndex = pending.findIndex((mention) => {
                if (typeof mention === "string")
                    return true;
                const dependsOn = String(mention.dependsOn || "").trim();
                const dependencyInBatch = uniqueMentions.some((item) => (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(item) === dependsOn);
                return !dependsOn || !dependencyInBatch || completed.has(dependsOn) || dependencyStates.has(dependsOn);
            });
            const index = readyIndex >= 0 ? readyIndex : 0;
            const [mention] = pending.splice(index, 1);
            const dependencyIssue = getBlockingDependencyFn(mention);
            const outputs = dependencyIssue
                ? skipMentionDueToDependencyFn(mention, dependencyIssue)
                : await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputsFn(mention, outputs);
            completed.add((0, collaboration_cross_agents_helpers_1.getMentionTargetName)(mention));
        }
    }
    else if (conflictPlan.effectiveOrder === "sequential" || conflictPlan.effectiveOrder === "backend_first") {
        const backendMentions = [];
        const frontendMentions = [];
        const otherMentions = [];
        for (const mention of uniqueMentions) {
            const targetName = (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(mention);
            const targetMember = group.members.find((m) => m.project === targetName);
            const declaredLayer = String(mention?.executionLayer || mention?.execution_layer || mention?.layer
                || targetMember?.executionLayer || targetMember?.execution_layer || targetMember?.layer || "").trim().toLowerCase();
            const kind = ["backend", "server", "service", "api"].includes(declaredLayer)
                ? "backend"
                : ["frontend", "web", "app", "client"].includes(declaredLayer)
                    ? "frontend"
                    : "other";
            if (kind === "backend")
                backendMentions.push(mention);
            else if (kind === "frontend")
                frontendMentions.push(mention);
            else
                otherMentions.push(mention);
        }
        for (const mention of backendMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputsFn(mention, outputs);
        }
        for (const mention of frontendMentions) {
            const failedBackend = backendMentions
                .map((item) => ({ name: (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(item), state: dependencyStates.get((0, collaboration_cross_agents_helpers_1.getMentionTargetName)(item)) }))
                .find((item) => item.name && item.state && !item.state.ok);
            const outputs = failedBackend
                ? skipMentionDueToDependencyFn(mention, { dependsOn: failedBackend.name, state: failedBackend.state })
                : await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputsFn(mention, outputs);
        }
        for (const mention of otherMentions) {
            const outputs = await executeMentionJob(mention);
            collectedOutputs.push(...outputs);
            rememberMentionOutputsFn(mention, outputs);
        }
    }
    else {
        const parallelGroupId = uniqueMentions.length > 1
            ? (0, collaboration_agent_parallel_dispatch_1.createAgentParallelGroupId)({
                groupId,
                taskId,
                planMessageId,
                depth,
                targets: uniqueMentions.map(collaboration_cross_agents_helpers_1.getMentionTargetName),
            })
            : "";
        const parallelMentions = uniqueMentions.map((mention) => ({
            ...mention,
            parallelGroupId,
        }));
        const settledOutputs = await (0, collaboration_agent_parallel_dispatch_1.settleParallelAgentJobs)(parallelMentions, executeMentionJob);
        settledOutputs.forEach(({ mention, outputs, error }) => {
            if (error) {
                const targetName = (0, collaboration_cross_agents_helpers_1.getMentionTargetName)(mention);
                const summary = String(error?.message || error || "项目子 Agent 执行失败").slice(0, 500);
                const receipt = { agent: targetName, status: "failed", summary, actions: [], filesChanged: [], verification: [], blockers: [summary], needs: [] };
                outputs = [formatCollectedAgentOutput(targetName, `❌ 项目子 Agent 执行失败：${summary}`, receipt)];
                emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", summary);
                if (taskId) {
                    addTaskLog(taskId, "error", `${targetName} 并行执行失败：${summary}`);
                    appendTaskTimelineEvent(taskId, { type: "child_agent_failed", title: `子 Agent 执行失败：${targetName}`, detail: summary, status: "fail", phase: "executing", agent: targetName });
                    updateTaskWorkItemFromReceipt(taskId, targetName, receipt, null, summary);
                }
            }
            collectedOutputs.push(...outputs);
            rememberMentionOutputsFn(mention, outputs);
        });
    }
    return collectedOutputs;
}
async function executeMentionJob(mention, env) {
    const { deps, groupId, group, sourceProject, output, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, sourceTask, completedOutputsByAgent, processCrossAgents } = env;
    const { addGroupLog, addTaskLog, admitChildTypedMemoryDelivery, appendAgentQaTrace, appendGroupMessage, appendTaskTimelineEvent, attachExecutionWorkspace, attachInvokedSkillsToReceipt, attachMemoryContextConsumptionChallenge, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery, bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAckPreflightReview, buildAgentMemoryContextBundleWithManifestSelection, buildAgentMemoryPacket, buildAgentQaProtocolInstructions, buildAgentToolContext, buildChildAgentDevelopmentContract, buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCollaborationConflictPlan, buildCoordinatorCollaborationInstructions, buildCoordinatorReworkContinuationFallback, buildCoordinatorSharedFilesContext, buildFinalWorkerDispatchPayloadGate, buildGroupContextPacket, buildMemberCollaborationInstructions, buildNativeTestAgentPlanBlockedReceipt, buildNativeTestAgentReceipt, buildNativeTestAgentReviewSummary, buildNativeTestAgentRuntimeToolContext, buildPostReviewSpotCheckSummary, buildProjectExecutionBrief, buildProjectVerificationHints, buildRuntimeRecoveryCandidates, buildRuntimeRecoveryPrompt, buildTaskPreflightReasoning, buildTaskProviderSwitchRequests, buildWorkerContinuationHandoff, buildWorkflowMeta, checkTaskFailure, claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText, compactRuntimeToolAudit, completeTaskAgentInvocationEdge, coordinatorReworkRouteNeedsFreshVerifier, coordinatorReworkRouteRequiresStop, coordinatorReworkRouteUsesVerifier, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge, dispatchTaskAgentInvocationEdge, emitAssignmentStatus, ensureExecution, escapeRegExp, evaluateAdvisoryPermissionBoundary, evaluateGreenContract, extractActionableMentions, extractAgentReceipt, extractRunnerVerificationEvidence, formatCollectedAgentOutput, formatNativeTestAgentOutput, formatNativeTestAgentPlanBlockedOutput, getAgentDependencyStateFromOutputs, getChildAgentIsolationMode, getCoordinatorActionMentions, getCoordinatorMember, getInitialWorkflowMeta, getMentionReworkRoute, getProjectAgentCapabilityProfile, getProjectExtraConfig, getReceiptAssignmentStatus, getRoutableMembers, getTaskAgentSessionOptions, getTaskById, getTestAgentHandoffPayload, getTestAgentHandoffProjectWorkDir, getTestAgentHandoffReviewSubject, getTestAgentHandoffWarnings, getWorkDirState, handleAgentQaRequests, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, isCoordinatorTestAgentName, isProviderPromptTooLongFailure, loadExecution, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted, markChildTypedMemoryRunnerReturned, memoryContextConsumptionReceiptFile, normalizeAgentRuntimeId, normalizeMentionTask, normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir, prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, recordAgentRuntimeLifecycle, recordReplayRepairTimelineBindingsForMention, recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator, recordWorkerContextProviderSwitchSessionBindingForCoordinator, recoverFinalWorkerDispatchPayload, renderGroupPostCompactDynamicContextDelta, renderGroupPostCompactInvokedSkillAttachments, renderGroupPostCompactPlanAttachment, renderMemoryContextForWorker, resolveMemberRuntime, runGroupOrchestrator, runMainAgentPostReviewSpotCheck, runTestAgentCliJob, runtimeToolDispatchBlockedMessage, runtimeToolDispatchBlockedReceipt, runtimeToolSnapshotFromAudit, shouldSwitchRuntime, stopWrongDirectionWorkerForCoordinatorRoute, stripAgentQaProtocolBlocks, summarizeNativeTestAgentExecutionPlan, summarizeReplayRepairTimelineBindingsForEvent, summarizeTaskAgentMemoryContextSnapshot, summarizeWorkerHandoffForUser, taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, taskRequiresVerification, transitionExecution, uniqueStrings, updateGroupMemory, updateGroupTaskInlineStatus, updateTask, updateTaskWorkItemFromReceipt, validateTestAgentHandoffRegisteredWorkDirs, verifyFinalWorkerDispatchPayloadGate, writeSse } = deps;
    const outputs = [];
    const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
    const targetName = typeof mention === "string" ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr) : mention.targetName;
    const coordinatorProject = getCoordinatorMember(group).project;
    if (targetName === sourceProject || targetName === coordinatorProject) {
        if (taskId)
            addTaskLog(taskId, "info", `忽略不可执行的自派发目标：${sourceProject} -> ${targetName}`);
        return outputs;
    }
    const failChildDispatch = (reason, needs = []) => {
        const summary = String(reason || "子 Agent 派发失败");
        const content = `❌ 子 Agent 派发失败：@${targetName}\n${summary}`;
        const receipt = {
            agent: targetName,
            status: "failed",
            summary,
            actions: [],
            filesChanged: [],
            verification: [],
            blockers: [summary],
            needs,
        };
        emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", summary);
        if (taskId)
            addTaskLog(taskId, "error", `子 Agent 派发失败：${targetName}；${summary}`);
        if (taskId)
            appendTaskTimelineEvent(taskId, { type: "child_agent_failed", title: `子 Agent 派发失败：${targetName}`, detail: summary, status: "fail", phase: "dispatching", agent: targetName, data: { needs } });
        if (taskId)
            updateTaskWorkItemFromReceipt(taskId, targetName, receipt, null, summary);
        outputs.push(formatCollectedAgentOutput(targetName, content, receipt));
        updateGroupMemory(groupId, {
            currentPhase: "needs_rework",
            blocked: { project: targetName, reason: summary, needs },
            workerLedger: {
                taskId,
                project: targetName,
                status: "failed",
                receiptStatus: "failed",
                summary,
                blockers: [summary],
                needs,
            },
            nextAction: `主 Agent 复盘 ${targetName} 派发阻塞并决定是否调整配置或询问用户`,
        });
        appendGroupMessage(groupId, {
            id: "m" + Date.now().toString(36) + "preflight" + crypto.randomBytes(2).toString("hex"),
            role: "assistant",
            agent: "system",
            content,
            timestamp: new Date().toISOString(),
            task_id: taskId || undefined,
        });
        writeSse(streamRes, { type: "status", text: content, agent: targetName });
        return outputs;
    };
    const nativeTestAgentMention = typeof mention !== "string"
        && isCoordinatorTestAgentName(targetName)
        && !!(mention.testAgentHandoff || mention.test_agent_handoff || mention.testAgentWorkOrder || mention.test_agent_work_order);
    const targetMember = group.members.find((m) => m.project === targetName && m.project !== sourceProject);
    if (!targetMember && !nativeTestAgentMention) {
        return failChildDispatch("未找到群聊成员", ["检查主 Agent 生成的目标 Agent 名称是否已加入当前开发群聊"]);
    }
    const atRegex = new RegExp(`@${escapeRegExp(targetName)}\\s+([^@]+?)(?=\\s*@|$)`, "is");
    const atMatch = output.match(atRegex);
    let atMessage = typeof mention === "string" ? (atMatch ? atMatch[1].trim() : "") : mention.message;
    if (!atMessage || atMessage.length < 5) {
        const lines = output.split("\n");
        const relevantLines = [];
        let found = false;
        for (const line of lines) {
            if (line.includes(`@${targetName}`)) {
                found = true;
                relevantLines.push(line.replace(`@${targetName}`, "").trim());
            }
            else if (found && line.trim() && !line.startsWith("@")) {
                relevantLines.push(line.trim());
            }
            else if (found && line.includes("@")) {
                break;
            }
        }
        atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
    }
    const implementationMessage = atMessage;
    const requiresAckPreflight = !!sourceTask
        && sourceTask.workflow_type === "daily_dev"
        && (taskRequiresCodeChanges(sourceTask) || taskRequiresVerification(sourceTask))
        && sourceTask.delivery_summary?.ack_gate_passed !== true
        && !/^【ACK-only 前置接单确认】/.test(atMessage.trim());
    if (requiresAckPreflight) {
        atMessage = [
            "【ACK-only 前置接单确认】",
            "主 Agent 当前只要求你先返回接单 ACK，不允许开始实现、编辑文件、运行破坏性命令或宣称完成。",
            "",
            "原始工作单如下，先理解但不要执行：",
            atMessage,
            "",
            "请只回复 CCM_AGENT_RECEIPT，并在 receipt.ack 中包含：",
            "- understoodGoal：你理解的业务目标",
            "- plannedScope：你计划负责的项目范围",
            "- forbiddenScope：你不会越权触碰的范围",
            "- verificationPlan：ACK 通过后你会执行的验证计划",
            "- unclear：仍需澄清的问题；没有则空数组",
            "",
            "ACK gate 通过后，主 Agent 会复用原任务、原 Trace、原 native session / scratchpad 续跑实现阶段。",
        ].join("\n");
        if (taskId) {
            addTaskLog(taskId, "info", `${targetName} 进入 ACK-only 前置接单确认；ACK 未通过前不派发实现阶段`);
            appendTaskTimelineEvent(taskId, {
                type: "ack_preflight_dispatch",
                title: `${targetName} ACK 前置接单`,
                detail: "ACK gate 未通过，本轮只允许返回接单确认",
                status: "active",
                phase: "intake",
                agent: targetName,
                data: { ack_gate_passed: false, original_message_preview: compactMemoryText(typeof mention === "string" ? output : mention.message, 600) },
            });
        }
        recordAgentRuntimeLifecycle({
            scope: "group",
            traceId: sourceTask?.trace_id || "",
            taskId,
            groupId,
            agent: sourceProject,
            action: "ack_preflight_dispatch",
            phase: "pre_dispatch",
            risk: "agent",
            target: targetName,
            status: "blocked",
            message: "ACK gate 未通过，本轮只派发 ACK-only 接单确认",
            data: { targetName, ack_only: true },
        });
    }
    const taskKey = `${sourceProject}->${targetName}:${normalizeMentionTask(atMessage)}`;
    if (seenMentions.has(taskKey)) {
        addGroupLog(groupId, "info", "collaboration", `跳过重复协作: ${sourceProject} -> ${targetName}`, { task: atMessage.substring(0, 160) });
        return outputs;
    }
    seenMentions.add(taskKey);
    let tWorkDir = process.cwd();
    let tAgentType = "claudecode";
    const testAgentHandoff = typeof mention === "string" ? null : mention.testAgentHandoff || mention.test_agent_handoff || null;
    const legacyTestAgentWorkOrder = typeof mention === "string" ? null : mention.testAgentWorkOrder || mention.test_agent_work_order || testAgentHandoff?.work_order || null;
    const testAgentHandoffPayload = getTestAgentHandoffPayload(testAgentHandoff, legacyTestAgentWorkOrder);
    const testAgentHandoffWarnings = getTestAgentHandoffWarnings(testAgentHandoffPayload);
    const nativeTestAgentDispatch = !!testAgentHandoffPayload && isCoordinatorTestAgentName(targetName);
    const testAgentWorkDirPolicy = nativeTestAgentDispatch
        ? validateTestAgentHandoffRegisteredWorkDirs(testAgentHandoffPayload, group, configs)
        : { valid: true, allowedWorkDirs: [], invalid: [] };
    const runtime = nativeTestAgentDispatch ? null : resolveMemberRuntime(targetName, group, configs);
    const testAgentProjectWorkDir = nativeTestAgentDispatch
        ? getTestAgentHandoffProjectWorkDir(testAgentHandoffPayload)
        : "";
    if (!nativeTestAgentDispatch && !runtime?.workDir) {
        return failChildDispatch("项目配置不存在或未绑定运行时", [
            `在项目管理中为 ${targetName} 配置项目路径和 Agent 类型`,
        ]);
    }
    if (nativeTestAgentDispatch && !testAgentProjectWorkDir) {
        return failChildDispatch("TestAgent 交接单缺少被复核项目目录", [
            "确认原实现 Agent 已配置项目路径",
            "重新派发独立复核，让主 Agent 生成带 workDir 的 TestAgent 交接单",
        ]);
    }
    if (nativeTestAgentDispatch && !testAgentWorkDirPolicy.valid) {
        return failChildDispatch("TestAgent 交接单项目目录未通过登记路径校验", [
            ...testAgentWorkDirPolicy.invalid,
            "重新读取群聊项目配置后生成 TestAgent 交接单",
        ]);
    }
    const workDirState = getWorkDirState(nativeTestAgentDispatch ? testAgentProjectWorkDir : (runtime?.workDir || ""));
    if (!workDirState.exists || !workDirState.writable) {
        const reason = `工作目录不可用：${workDirState.path || runtime.workDir}（${!workDirState.exists ? "不存在或不是目录" : "不可读写"}）`;
        return failChildDispatch(reason, [
            "检查项目路径是否存在",
            "确认 Web 服务或外部 Runner 对该目录有读写权限",
        ]);
    }
    tWorkDir = workDirState.path || (nativeTestAgentDispatch ? testAgentProjectWorkDir : (runtime?.workDir || ""));
    const taskRuntimeOverride = String(sourceTask?.runtime_overrides?.[targetName]
        || sourceTask?.runtime_overrides?.["*"]
        || sourceTask?.runtime_override
        || "").trim();
    const providerSwitchDecisionReceipt = typeof mention === "string"
        ? null
        : mention.provider_switch_decision_receipt
            || mention.providerSwitchDecisionReceipt
            || mention.worker_context_packet?.provider_switch_decision_receipt
            || mention.workerContextPacket?.providerSwitchDecisionReceipt
            || null;
    const approvedSwitchAgentType = providerSwitchDecisionReceipt?.schema === "ccm-provider-switch-decision-receipt-v1"
        && providerSwitchDecisionReceipt.valid === true
        && providerSwitchDecisionReceipt.status === "approved"
        ? String(providerSwitchDecisionReceipt.new_provider?.agent_type || providerSwitchDecisionReceipt.newProvider?.agentType || "").trim()
        : "";
    const providerSwitchAttempted = providerSwitchDecisionReceipt?.schema === "ccm-provider-switch-decision-receipt-v1";
    tAgentType = nativeTestAgentDispatch
        ? "test-agent-native"
        : (approvedSwitchAgentType || (!providerSwitchAttempted ? taskRuntimeOverride : "") || runtime?.agentType || targetMember.agent || "claudecode");
    const reworkRoute = getMentionReworkRoute(mention);
    const routeStopResult = coordinatorReworkRouteRequiresStop(reworkRoute)
        ? stopWrongDirectionWorkerForCoordinatorRoute({
            taskId,
            groupId,
            targetName,
            sourceProject,
            route: reworkRoute,
            mention,
            streamRes,
        })
        : null;
    const requestedContinuitySessionId = String(sourceTask?.group_session_id || sourceTask?.groupSessionId || "");
    const taskContinuity = requestedContinuitySessionId.startsWith("gcs_")
        ? (0, agent_sessions_shared_1.buildTaskAgentContinuityBinding)({
            scope: "group",
            scopeId: groupId,
            exactSessionId: requestedContinuitySessionId,
            project: targetName,
            agentType: tAgentType,
        })
        : null;
    let activeTaskSession = taskId && !nativeTestAgentDispatch ? openTaskAgentSession({
        scopeId: taskId,
        taskId,
        groupId,
        project: targetName,
        agentType: tAgentType,
        continuity: taskContinuity,
    }) : null;
    const providerSwitchSessionBinding = approvedSwitchAgentType
        ? recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
            assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
            dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
            worker_context_packet_id: typeof mention === "string" ? "" : mention.worker_context_packet?.packet_id || mention.workerContextPacket?.packet_id || "",
            provider_switch_decision_receipt: providerSwitchDecisionReceipt,
            project: targetName,
            agent_type: tAgentType,
            task_agent_session_id: activeTaskSession?.id || "",
            native_session_id: activeTaskSession?.nativeSessionId || "",
            execution_id: taskId ? `${taskId}--${targetName}` : "",
        })
        : null;
    if (approvedSwitchAgentType && providerSwitchSessionBinding?.status !== "bound") {
        return failChildDispatch("Provider switch child session binding failed", [
            ...(Array.isArray(providerSwitchSessionBinding?.gaps) ? providerSwitchSessionBinding.gaps : ["provider switch session binding missing"]),
            "重新生成 fresh provider reliability snapshot 和 provider switch decision receipt 后再派发",
        ]);
    }
    if (providerSwitchSessionBinding && typeof mention !== "string") {
        mention.provider_switch_session_binding = providerSwitchSessionBinding;
        mention.providerSwitchSessionBinding = providerSwitchSessionBinding;
    }
    if (activeTaskSession) {
        addTaskLog(taskId, "info", `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复" : "创建"}任务级原生会话（${activeTaskSession.agentType}，第 ${activeTaskSession.turnCount + 1} 轮）`);
        appendTaskTimelineEvent(taskId, {
            type: activeTaskSession.turnCount > 0 ? "native_session_resume" : "native_session_open",
            title: `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复原生会话" : "创建原生会话"}`,
            detail: `${activeTaskSession.agentType} / ${activeTaskSession.resumeMode}`,
            status: "active",
            phase: "executing",
            agent: targetName,
            data: { sessionRecordId: activeTaskSession.id, nativeSessionId: activeTaskSession.nativeSessionId, turn: activeTaskSession.turnCount + 1 },
        });
        writeSse(streamRes, { type: "native_session", taskId, agent: targetName, session: { project: targetName, agentType: activeTaskSession.agentType, mode: activeTaskSession.resumeMode, turn: activeTaskSession.turnCount + 1, resumed: activeTaskSession.turnCount > 0 } });
        if (sourceTask)
            updateGroupTaskInlineStatus(sourceTask, "in_progress", `${targetName} ${activeTaskSession.turnCount > 0 ? "恢复原生会话" : "创建原生会话"}`);
    }
    if (!nativeTestAgentDispatch && sourceTask && taskRequiresCodeChanges(sourceTask)) {
        const permission = await (0, conversation_permission_policy_1.authorizeProjectChildAgentStart)({ task: sourceTask, project: targetName, workDir: tWorkDir, agentType: tAgentType });
        if (!permission.allowed) {
            const detail = permission.message || "当前会话权限不允许启动代码修改 Agent";
            updateTask(taskId, {
                status: "blocked",
                status_detail: detail,
                conversation_permission_snapshot: permission.snapshot,
                conversation_permission_mode: permission.mode,
                permission_policy_revision: permission.snapshot?.revision || 0,
                edit_approval_id: permission.editApprovalId || null,
            });
            appendTaskTimelineEvent(taskId, {
                type: "conversation_permission.required",
                title: permission.mode === "main_agent_only" ? "主 Agent 权限审核结果" : "等待代码修改授权",
                detail,
                status: "blocked",
                phase: "dispatching",
                agent: targetName,
                data: { permission_request_id: permission.permissionRequest?.id || "", permission_mode: permission.mode },
            });
            return failChildDispatch(detail, [permission.mode === "main_agent_only" ? "处理主 Agent 的审核结果后继续" : "批准当前任务的代码修改权限后自动继续"]);
        }
    }
    const preparedWorkDir = nativeTestAgentDispatch
        ? { mode: "shared", requestedMode: "shared", workDir: tWorkDir, originalWorkDir: tWorkDir }
        : prepareChildAgentWorkDir(tWorkDir, {
            mode: getChildAgentIsolationMode(group, sourceTask),
            taskId: taskId || "",
            agentName: mention.conflictWorkspaceKey || targetName,
            sourceProject,
            reuseKey: mention.conflictWorkspaceKey ? `${taskId || planMessageId}-${mention.conflictWorkspaceKey}` : "",
            failClosed: true,
        });
    tWorkDir = preparedWorkDir.workDir;
    const laneExecutionId = taskId ? `${taskId}--${targetName}` : "";
    if (laneExecutionId) {
        ensureExecution({ task: sourceTask || { id: taskId, title: atMessage, target_project: targetName }, project: targetName, agent: targetName, workDir: tWorkDir, executionId: laneExecutionId });
        attachExecutionWorkspace(laneExecutionId, {
            ...preparedWorkDir,
            project: targetName,
            mode: preparedWorkDir.mode,
            conflictGroup: mention.conflictGroup || "",
            conflictWorkspaceKey: mention.conflictWorkspaceKey || "",
            mergeOwner: mention.mergeOwner !== false,
        });
        if (!loadExecution(laneExecutionId)?.checkpointIds?.length) {
            try {
                createExecutionCheckpoint({ executionId: laneExecutionId, taskId, workDir: tWorkDir, mode: preparedWorkDir.mode, label: `${targetName} 开始执行前` });
            }
            catch (error) {
                addTaskLog(taskId, "warning", `无法创建 ${targetName} 文件检查点：${error.message}`);
            }
        }
        transitionExecution(laneExecutionId, "spawning", `${targetName} 执行通道准备中`);
    }
    const worktreeNotice = buildChildAgentWorktreeNotice(preparedWorkDir);
    if (preparedWorkDir.mode === "worktree") {
        const text = `子 Agent ${targetName} 已启用 worktree 隔离：${preparedWorkDir.worktreePath}（${preparedWorkDir.worktreeBranch || "branch unknown"}）`;
        if (taskId)
            addTaskLog(taskId, "info", text);
        addGroupLog(groupId, "info", "worktree", text, {
            agent: targetName,
            worktreePath: preparedWorkDir.worktreePath,
            worktreeBranch: preparedWorkDir.worktreeBranch,
        });
    }
    else if (preparedWorkDir.requestedMode === "worktree" && preparedWorkDir.warning) {
        const text = `子 Agent ${targetName} 请求 worktree 隔离但已降级共享目录：${preparedWorkDir.warning}`;
        if (taskId)
            addTaskLog(taskId, "warning", text);
        addGroupLog(groupId, "warn", "worktree", text, {
            agent: targetName,
            originalWorkDir: preparedWorkDir.originalWorkDir,
        });
    }
    const continuationStrategy = typeof mention === "string" ? "" : String(mention.continuationStrategy || mention.continuation_strategy || "").trim();
    const continuationOf = typeof mention === "string" ? "" : String(mention.continuationOf || mention.continuation_of || "").trim();
    const isContinuation = !!continuationStrategy || (typeof mention !== "string" && !!mention.rework);
    const continuationUserLabel = reworkRoute?.user_label || reworkRoute?.userLabel || (coordinatorReworkRouteRequiresStop(reworkRoute) ? "停止旧方向后继续" : "同 Worker 续跑");
    const isFreshVerifierContinuation = coordinatorReworkRouteNeedsFreshVerifier(reworkRoute);
    const isVerifierContinuation = coordinatorReworkRouteUsesVerifier(reworkRoute);
    if (taskId)
        claimTaskWorkItemForAgent(taskId, targetName, `${targetName} 已开始执行：${compactMemoryText(atMessage, 180)}`);
    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "running", "执行中");
    if (taskId)
        addTaskLog(taskId, "info", `子 Agent 开始执行：${sourceProject} -> ${targetName}${isContinuation ? `（${continuationUserLabel}）` : ""}；工作单：${compactMemoryText(atMessage, 220)}`);
    if (taskId) {
        const startReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
            targetName,
            taskId,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession?.id || "",
            nativeSessionId: activeTaskSession?.nativeSessionId || "",
            executionId: laneExecutionId,
        });
        const startTimelineEvent = appendTaskTimelineEvent(taskId, {
            type: isContinuation ? "child_agent_rework" : "child_agent_start",
            title: `${targetName} 开始执行`,
            detail: compactMemoryText(atMessage, 500),
            status: "active",
            phase: isContinuation ? "rework" : "executing",
            agent: targetName,
            data: { sourceProject, continuationStrategy, continuationOf, reworkRoute, routeStopResult, replay_repair_dispatch_bindings: startReplayRepairBindings },
        });
        recordReplayRepairTimelineBindingsForMention(groupId, mention, {
            targetName,
            taskId,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession?.id || "",
            nativeSessionId: activeTaskSession?.nativeSessionId || "",
            executionId: laneExecutionId,
            timelineEvent: startTimelineEvent,
            timelineEventType: isContinuation ? "child_agent_rework" : "child_agent_start",
        });
    }
    appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "fwd",
        role: "assistant", agent: sourceProject,
        content: `📤 → @${targetName}\n${atMessage}`,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
    });
    writeSse(streamRes, { type: "status", text: `📨 ${sourceProject} 已 @${targetName}，等待 ${targetName} 回复...`, agent: targetName });
    ctx.setAgentActivity(targetName, "working", `被 ${sourceProject} @ 协作`, { tab: "groups", groupId }, 330000);
    ctx.broadcastPetSpeech(targetName, { role: "status", text: `${sourceProject} @ 我协作，正在处理...`, source: "group" });
    const requestedGroupSessionId = String(sourceTask?.group_session_id || sourceTask?.groupSessionId || "");
    let parentSessionContext = (0, group_session_model_context_1.buildChildParentSessionContextPacket)(groupId, { groupSessionId: requestedGroupSessionId });
    let tContext = parentSessionContext.rendered;
    const childTaskText = buildChildAgentTaskText(atMessage, sourceTask);
    const memoryDeliveryAttemptSequence = activeTaskSession ? activeTaskSession.turnCount + 1 : 0;
    const activeGroupSessionId = String(parentSessionContext.groupSessionId || "");
    let activeInvocationEdge = activeTaskSession && activeGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
        groupId,
        groupSessionId: activeGroupSessionId,
        taskId,
        targetProject: targetName,
        taskAgentSessionId: activeTaskSession.id,
        nativeSessionId: activeTaskSession.nativeSessionId || "",
        executionId: laneExecutionId,
        attemptSequence: memoryDeliveryAttemptSequence,
        providerAttempt: 1,
        invocationKind: memoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
        branchKind: "main",
    }) : null;
    const buildCurrentGroupMemoryBundle = () => buildAgentMemoryContextBundleWithManifestSelection(groupId, targetName, childTaskText, {
        taskId,
        traceId: sourceTask?.trace_id || "",
        executionId: laneExecutionId,
        taskAgentSessionId: activeTaskSession?.id || "",
        nativeSessionId: activeTaskSession?.nativeSessionId || "",
        taskAgentSessionTurn: memoryDeliveryAttemptSequence,
        agentType: activeTaskSession?.agentType || tAgentType,
        modelContextWindow: activeTaskSession?.modelContextWindow || 0,
        groupSessionId: activeGroupSessionId,
        requireExactGroupSession: true,
        dedicatedParentSessionContext: true,
        parentRunId: sourceTask?.parent_run_id || sourceTask?.global_mission_id || "",
        task: sourceTask,
        ...taskAgentInvocationMemoryOptions(activeInvocationEdge),
    });
    const renderCurrentMemoryPacket = (bundle) => {
        let packet = bundle.rendered_text || buildAgentMemoryPacket(groupId, targetName, childTaskText, { groupSessionId: activeGroupSessionId });
        for (const attachment of [
            bundle.invoked_skill_attachment_text || renderGroupPostCompactInvokedSkillAttachments(bundle),
            bundle.plan_attachment_text || renderGroupPostCompactPlanAttachment(bundle),
            bundle.dynamic_context_delta_text || renderGroupPostCompactDynamicContextDelta(bundle),
        ]) {
            const text = String(attachment || "").trim();
            if (text && !packet.includes(text))
                packet = `${text}\n\n${packet}`;
        }
        return packet;
    };
    let groupMemoryBundle = await buildCurrentGroupMemoryBundle();
    let memoryPacket = renderCurrentMemoryPacket(groupMemoryBundle);
    const globalMissionHandoff = sourceTask?.mission_handoff || sourceTask?.missionHandoff || null;
    const globalMissionMemory = globalMissionHandoff ? [
        "[全局任务交接摘要]",
        globalMissionHandoff.global_mission?.mission_id ? `- 全局任务 ID：${globalMissionHandoff.global_mission.mission_id}` : "",
        globalMissionHandoff.user_goal ? `- 全局目标：${compactMemoryText(globalMissionHandoff.user_goal, 500)}` : "",
        Array.isArray(globalMissionHandoff.done_criteria) && globalMissionHandoff.done_criteria.length
            ? `- 全局完成判定：${globalMissionHandoff.done_criteria.slice(0, 4).join("；")}`
            : "",
        "- 你的回执将被群聊主 Agent 汇总后交给全局 Agent；必须保留文件、验证、风险和待确认事项。",
    ].filter(Boolean).join("\n") : "";
    let workerMemoryPacket = [memoryPacket, globalMissionMemory].filter(Boolean).join("\n\n");
    let authoritativeWorkerMemoryPacket = workerMemoryPacket;
    let workerMemoryContext = globalMissionMemory
        ? { schema: "ccm-worker-memory-context-v1", group_memory: groupMemoryBundle, global_mission_memory: globalMissionMemory }
        : groupMemoryBundle;
    const dependencyOutputPacket = (0, collaboration_cross_agents_helpers_1.buildDependencyOutputPacket)(mention, targetName, executionOrder, completedOutputsByAgent, compactMemoryText);
    const continuationNotice = isContinuation ? [
        isVerifierContinuation ? "独立复验提示：" : "Worker 续跑提示：",
        isVerifierContinuation
            ? `- 本次任务是主 Agent 验收后的独立复验，执行 Agent：${targetName}；复核对象：${continuationOf || targetName}。`
            : `- 本次任务是主 Agent 验收后的同 Worker 续跑/返工，目标 Worker：${continuationOf || targetName}。`,
        `- 处理方式：${continuationUserLabel}。`,
        isVerifierContinuation
            ? isFreshVerifierContinuation
                ? "- 你需要用新的验证视角核对原实现者的交付证据、实际文件变化、验证记录和剩余风险；不要只复述原实现者结论。"
                : "- 你需要沿用原复核边界，但必须重新执行并核对最新证据；不要复用上一轮通过、失败或受阻结论。"
            : coordinatorReworkRouteRequiresStop(reworkRoute)
                ? "- 主 Agent 已检查并停止可能跑偏的旧方向；本轮必须以新工作单为准，不要继续旧方案。"
                : "- 你必须优先参考上方“协作上下文 / 你自己的 Worker 通知”，承接上一轮结果补齐缺口；不要重复已完成且有证据的工作。",
        "- 如果上一轮状态是 blocked/needs_info/failed，先处理阻塞或明确 needs；不能把未解决阻塞写成 done。",
    ].join("\n") : "";
    if (targetName === coordinatorProject) {
        const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
        const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group, { groupSessionId: activeGroupSessionId, message: atMessage });
        const result = await runGroupOrchestrator({
            group,
            message: atMessage,
            context: tContext,
            source: sourceProject,
            sharedFilesContext,
            groupSessionId: activeGroupSessionId,
            providerSwitchRequests: buildTaskProviderSwitchRequests(sourceTask),
        });
        const planAssignments = normalizePlanAssignments(result.assignments || []);
        const dispatchPolicy = result.dispatchPolicy || null;
        const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "二级协调计划");
        outputs.push(formatCollectedAgentOutput(coordinatorProject, result.content, {
            agent: coordinatorProject,
            status: "done",
            summary: "主 Agent 已完成二级协调计划",
            actions: ["生成二级协作计划"],
            filesChanged: [],
            verification: ["已返回结构化 assignments"],
            blockers: [],
            needs: [],
        }));
        appendGroupMessage(groupId, {
            id: responseMessageId,
            role: "assistant",
            agent: coordinatorProject,
            content: result.content,
            timestamp: new Date().toISOString(),
            assignments: planAssignments,
            executionOrder: result.executionOrder || "parallel",
            runtime: result.runtime || "",
            providerFailure: result.providerFailure || null,
            providerFailureTechnical: result.providerFailureTechnical || null,
            dispatchPolicy,
            coordinationPlan: result.coordinationPlan || null,
            workflow: workflowMeta,
            task_id: taskId || undefined,
        });
        writeSse(streamRes, {
            type: "agent_done",
            agent: coordinatorProject,
            text: result.content,
            messageId: responseMessageId,
            assignments: planAssignments,
            executionOrder: result.executionOrder || "parallel",
            runtime: result.runtime || "",
            providerFailure: result.providerFailure || null,
            providerFailureTechnical: result.providerFailureTechnical || null,
            dispatchPolicy,
            coordinationPlan: result.coordinationPlan || null,
            workflow: workflowMeta,
        });
        emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "done", "已完成");
        const nestedMentions = getCoordinatorActionMentions(result, group, coordinatorProject);
        if (nestedMentions.length > 0) {
            const nestedOutputs = await processCrossAgents(groupId, group, coordinatorProject, result.content, nestedMentions, configs, ctx, streamRes, depth + 1, seenMentions, result.executionOrder || "parallel", responseMessageId, taskId, deps);
            outputs.push(...nestedOutputs);
        }
        return outputs;
    }
    const memberList = group.members.map((m) => m.project).filter((p) => p !== targetName).join(", ");
    const collaborationInstructions = targetName === coordinatorProject
        ? buildCoordinatorCollaborationInstructions(getRoutableMembers(group).map((m) => m.project).join(", "))
        : buildMemberCollaborationInstructions(targetName, memberList);
    const advisoryOnly = !!mention.advisoryOnly;
    const communicationAttempt = Math.max(1, memoryDeliveryAttemptSequence || 1);
    const communicationGeneration = Math.max(0, Number(sourceTask?.agent_communication_generation || sourceTask?.generation || 0));
    const communicationPolicy = (0, agent_communication_v2_1.readAgentCommunicationPolicy)(sourceTask?.contextPolicy?.effective || sourceTask?.context_policy?.effective || sourceTask?.context_policy_effective || {});
    const targetAnchorMessageId = (0, task_conversation_links_1.taskConversationAnchorMessageId)(sourceTask, `task-message:${taskId}:${targetName}`);
    const originMessageId = String(sourceTask?.origin_message_id || sourceTask?.originMessageId || sourceTask?.source_message_id || sourceTask?.sourceMessageId || "");
    const communicationDispatchInput = {
        taskId,
        workItemId: laneExecutionId || `${taskId}--${targetName}`,
        scope: "group",
        scopeId: groupId,
        exactSessionId: activeGroupSessionId || taskId,
        generation: communicationGeneration,
        attempt: communicationAttempt,
        senderAgentId: "ccm-group-main-agent",
        receiverAgentId: targetName,
        ownerId: `group-worker:${laneExecutionId || targetName}`,
        idempotencyKey: `group-worker-dispatch-v2:${laneExecutionId || taskId}:${communicationGeneration}:${communicationAttempt}`,
        payload: {
            sourceProject,
            authorizedProject: targetName,
            projectName: targetName,
            runtimeId: activeTaskSession?.agentType || tAgentType,
            workItemTitle: String(mention?.workItemTitle || mention?.work_item_title || mention?.title || sourceTask?.title || atMessage || "").replace(/\s+/g, " ").trim().slice(0, 300),
            parallelGroupId: String(mention?.parallelGroupId || mention?.parallel_group_id || ""),
            workspaceMode: preparedWorkDir.mode,
            worktreeRef: preparedWorkDir.mode === "worktree" ? preparedWorkDir.worktreePath || preparedWorkDir.workDir : "",
            advisoryOnly,
            verificationOnly: nativeTestAgentDispatch,
            anchorMessageId: targetAnchorMessageId,
            originMessageId,
            strictPreExecutionAck: communicationPolicy.strictPreExecutionAckEnabled === true,
        },
        policy: sourceTask?.contextPolicy?.effective || sourceTask?.context_policy?.effective || sourceTask?.context_policy_effective || {},
    };
    let communicationDispatch = taskId
        ? (0, agent_communication_v2_1.startAgentCommunicationDispatch)(communicationDispatchInput)
        : { enabled: false, acquired: true, envelope: null };
    if (communicationDispatch.enabled !== false && communicationDispatch.acquired !== true && communicationDispatch.capacity === true) {
        communicationDispatch = await (0, agent_communication_v2_1.waitForAgentCommunicationDispatch)(communicationDispatchInput, {
            initialDispatch: communicationDispatch,
            shouldCancel: () => !!taskId && (0, execution_kernel_1.isTaskCancellationRequested)(taskId),
        });
    }
    if (communicationDispatch.cancelled) {
        const cancelled = `【${targetName}】\n- 状态：cancelled\n- 摘要：等待执行容量期间任务已取消`;
        outputs.push(cancelled);
        return outputs;
    }
    if (communicationDispatch.enabled !== false && communicationDispatch.acquired !== true) {
        return failChildDispatch(`第三方 Agent 无法领取执行租约：${communicationDispatch.reason || "lease_unavailable"}`, [
            `queue_position=${communicationDispatch.position || 1}`,
            "CCM 已保留结构化队列与租约原因，本轮不会越过全局或项目并发上限",
        ]);
    }
    const communicationEnvelope = communicationDispatch.envelope || null;
    if (communicationEnvelope?.messageId && typeof mention !== "string")
        mention.agent_communication_message_id = communicationEnvelope.messageId;
    const projectMemoryForMcp = (0, memory_1.buildProjectMemoryPacket)(targetName, { workDir: tWorkDir, query: childTaskText });
    const buildGroupThirdPartyMemorySnapshot = () => {
        if (!activeTaskSession || advisoryOnly || nativeTestAgentDispatch)
            return null;
        const sessionMessages = (0, storage_1.getGroupMessages)(groupId, activeGroupSessionId)
            .filter((message) => !String(message?.content || "").startsWith("📤"));
        const visibleIds = new Set(parentSessionContext.visibleMessageIds || []);
        const visibleMessages = parentSessionContext.canonicalSummary
            ? sessionMessages.filter((message) => visibleIds.has(String(message?.id || message?.uuid || message?.messageId || "")))
            : sessionMessages;
        const archiveMessages = parentSessionContext.canonicalSummary
            ? sessionMessages.filter((message) => !visibleIds.has(String(message?.id || message?.uuid || message?.messageId || "")))
            : [];
        const groupMemory = (0, group_memory_storage_1.loadGroupMemory)(groupId, activeGroupSessionId);
        const nativeCompactCapacity = groupMemoryBundle?.providerNativeCompactSessionCapacity
            || groupMemoryBundle?.provider_native_compact_session_capacity
            || groupMemoryBundle?.compaction?.providerNativeCompactSessionCapacity
            || groupMemoryBundle?.compaction?.provider_native_compact_session_capacity
            || null;
        return (0, third_party_memory_snapshot_1.createThirdPartyMemorySnapshot)({
            bindingKind: "task",
            role: "project-child-agent",
            project: targetName,
            groupId,
            groupSessionId: activeGroupSessionId,
            taskId,
            taskAgentSessionId: activeTaskSession.id,
            provider: activeTaskSession.agentType || tAgentType,
            model: activeTaskSession.modelId || "",
            nativeSessionId: activeTaskSession.nativeSessionId || "",
            nativeGeneration: Number(nativeCompactCapacity?.generation || activeTaskSession.providerNativeCompactGeneration || activeTaskSession.provider_native_compact_generation || 1),
            boundaryGeneration: Number(parentSessionContext.boundaryGeneration || 0),
            mode: parentSessionContext.mode,
            summary: parentSessionContext.canonicalSummary ? groupMemory.conversationSummary : null,
            summarySource: parentSessionContext.summarySource || "",
            messages: visibleMessages,
            archiveMessages,
            memoryItems: [
                { kind: "group_memory", source: `${groupId}:${activeGroupSessionId}`, required: true, content: authoritativeWorkerMemoryPacket },
                { kind: "project_memory", source: targetName, required: true, content: projectMemoryForMcp },
            ],
            modelContextWindow: activeTaskSession.modelContextWindow || 0,
            autoCompactThreshold: activeTaskSession.autoCompactThreshold || 0,
            requestText: childTaskText,
        });
    };
    let thirdPartyMemorySnapshot = buildGroupThirdPartyMemorySnapshot();
    let memoryConsumptionChallenge = activeTaskSession && workerMemoryContext && !advisoryOnly && !nativeTestAgentDispatch
        ? createMemoryContextConsumptionChallenge({
            groupId,
            groupSessionId: activeGroupSessionId,
            taskId,
            executionId: laneExecutionId,
            project: targetName,
            taskAgentSessionId: activeTaskSession.id,
            attempt: memoryDeliveryAttemptSequence,
        })
        : null;
    if (memoryConsumptionChallenge)
        workerMemoryContext = attachMemoryContextConsumptionChallenge(workerMemoryContext, memoryConsumptionChallenge);
    const projectResourcesConfig = getProjectExtraConfig(targetName);
    const toolContext = nativeTestAgentDispatch
        ? { prompt: "\n[Native TestAgent verification]\n- This request runs in the CCM TestAgent runner. Read only the work order and run verification; do not inject third-party Agent tools.\n", allowedTools: { mcp: [], skill: [] }, toolAudit: null, authorizationReadiness: null }
        : advisoryOnly
            ? { prompt: "\n[Advisory-only Agent boundary]\n- This request may provide read-only advice only. Do not inject additional MCP servers or Skills.\n", allowedTools: { mcp: [], skill: [] }, toolAudit: null, authorizationReadiness: null }
            : buildAgentToolContext(ctx, group, targetName, childTaskText, sourceTask?.selected_skill_names || []);
    let runtimeToolContext = nativeTestAgentDispatch
        ? buildNativeTestAgentRuntimeToolContext(targetName, tWorkDir)
        : prepareAgentRuntimeTools(groupId, targetName, tWorkDir, tAgentType, toolContext.allowedTools, streamRes, {
            taskId,
            task: sourceTask,
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
            disableTaskBoundInternalMcp: advisoryOnly,
            internalAgentRole: targetName === coordinatorProject ? "group-main-agent" : "project-child-agent",
            groupSessionId: activeGroupSessionId,
            taskAgentSessionId: activeTaskSession?.id || "",
            nativeSessionId: activeTaskSession?.nativeSessionId || "",
            memoryReceiptChallenge: memoryConsumptionChallenge,
            memoryReceiptFile: memoryContextConsumptionReceiptFile(memoryConsumptionChallenge?.challenge_id),
            memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
            memorySnapshotChecksum: thirdPartyMemorySnapshot?.checksum || "",
            boundaryGeneration: thirdPartyMemorySnapshot?.boundaryGeneration || 0,
            nativeGeneration: thirdPartyMemorySnapshot?.nativeGeneration || 0,
            communicationMessageId: communicationEnvelope?.messageId || "",
            communicationGeneration: communicationEnvelope?.generation || 0,
            communicationAttempt: communicationEnvelope?.attempt || 0,
            communicationLeaseId: communicationEnvelope?.leaseId || "",
            anchorMessageId: targetAnchorMessageId,
            originMessageId,
            requestText: childTaskText,
            memoryReadBudgetTokens: thirdPartyMemorySnapshot?.autoCompactThreshold || 0,
        });
    let thirdPartyMemoryMcpEnabled = !!thirdPartyMemorySnapshot
        && (runtimeToolContext.audit?.internal_mcp || []).some((item) => item.name === "ccm__knowledge_context" && item.state === "synced");
    const buildMemoryMcpReference = () => ({
        schema: "ccm-third-party-memory-mcp-reference-v1",
        snapshot_id: thirdPartyMemorySnapshot?.id || "",
        snapshot_checksum: thirdPartyMemorySnapshot?.checksum || "",
        mode: thirdPartyMemorySnapshot?.mode || "",
        delivery_mode: thirdPartyMemorySnapshot?.deliveryMode || "",
        required_hydration_tokens: Number(thirdPartyMemorySnapshot?.requiredHydrationTokens || 0),
        group_session_memory_binding: (0, agent_sessions_shared_1.extractGroupSessionMemoryBinding)(groupMemoryBundle),
        memory_consumption_challenge: memoryConsumptionChallenge,
        rendered_text: "父会话的授权上下文可通过签名 ccm__knowledge_context MCP 按需读取；不要假设其正文已注入当前 Prompt。",
    });
    if (thirdPartyMemoryMcpEnabled)
        workerMemoryContext = buildMemoryMcpReference();
    if (runtimeToolContext.dispatchBlocked) {
        const blockedReceipt = runtimeToolDispatchBlockedReceipt(targetName, runtimeToolContext);
        const blockedOutput = blockedReceipt.summary;
        outputs.push(formatCollectedAgentOutput(targetName, blockedOutput, blockedReceipt));
        if (taskId) {
            addTaskLog(taskId, "warning", blockedReceipt.summary);
            appendTaskTimelineEvent(taskId, {
                type: "runtime_tool_dispatch_blocked",
                title: `${targetName} 工具授权派发被阻断`,
                detail: blockedReceipt.summary,
                status: "warn",
                phase: "dispatching",
                agent: targetName,
                data: { receipt: blockedReceipt, runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit) },
            });
            updateTaskWorkItemFromReceipt(taskId, targetName, blockedReceipt, null, blockedOutput);
        }
        writeSse(streamRes, { type: "agent_done", agent: targetName, text: blockedOutput, blocked: true, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
        return outputs;
    }
    const routeContinuationFallback = buildCoordinatorReworkContinuationFallback({ reworkRoute, mention, sourceTask, targetName, stopResult: routeStopResult });
    const workerContinuation = buildWorkerContinuationHandoff(sourceTask, targetName, {
        fallback: routeContinuationFallback || (isContinuation ? { continuationStrategy, continuationOf: continuationOf || targetName } : null),
    });
    const buildCurrentWorkerHandoff = (memoryContext) => buildChildAgentWorkerHandoff(targetName, childTaskText, {
        source: `${sourceProject} @ 协作`,
        reason: typeof mention === "string" ? "" : String(mention.reason || "").trim(),
        acceptance: sourceTask?.acceptance_criteria || "",
        requires_code_changes: nativeTestAgentDispatch ? false : (advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true)),
        verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
        work_dir: tWorkDir,
        agent_type: tAgentType,
        model: activeTaskSession?.modelId || "",
        task_id: taskId,
        task_agent_session_id: activeTaskSession?.id || "",
        trace_id: sourceTask?.trace_id || "",
        task: sourceTask,
        group,
        dependsOn: typeof mention === "string" ? "" : String(mention.dependsOn || "").trim(),
        worker_context_packet: typeof mention === "string" ? null : mention.worker_context_packet || null,
        memory: memoryContext,
        analysis: globalMissionHandoff ? {
            constraints: Array.isArray(globalMissionHandoff.done_criteria) ? globalMissionHandoff.done_criteria : [],
            documentFindings: Array.isArray(globalMissionHandoff.references?.document_findings) ? globalMissionHandoff.references.document_findings : [],
        } : undefined,
        advisoryOnly,
        continuation: workerContinuation,
        communication_envelope: communicationEnvelope,
    });
    let workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
    workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
    const pendingCapacityDowngradeGate = activeTaskSession?.capacityDowngradeGate || null;
    let capacityRevalidationPreparation = activeTaskSession
        ? prepareTaskAgentSessionCapacityRevalidation(activeTaskSession.id, workerHandoff.worker_context_packet)
        : null;
    if (activeTaskSession?.capacityRevalidationRequired === true && capacityRevalidationPreparation?.prepared !== true) {
        return failChildDispatch("模型容量下降后的上下文重建未通过", [
            capacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated",
            "重新按当前可信模型窗口构建并压缩 WorkerContextPacket",
        ]);
    }
    if (capacityRevalidationPreparation?.session)
        activeTaskSession = capacityRevalidationPreparation.session;
    let capacityRevalidationCommitted = capacityRevalidationPreparation?.required !== true;
    if (typeof mention !== "string") {
        mention.worker_context_packet = workerHandoff.worker_context_packet;
    }
    let workerHandoffSummary = summarizeWorkerHandoffForUser(workerHandoff);
    const testAgentHandoffPacket = testAgentHandoffPayload ? [
        "[TestAgent 原生独立复核交接单]",
        "- 这是主 Agent 为独立验证 Agent 生成的 ccm-test-agent-handoff-v1。",
        "- TestAgent CLI 会在进程边界内把 handoff 转成自己的 work order，主 Agent 不直接依赖 TestAgent 内部 builder。",
        "- 按 handoff 的 projects、acceptanceCriteria、requiredChecks 执行，只读复核原实现 Agent 的交付证据。",
        "- 若工作目录、命令或浏览器条件不可用，必须写 blocked/needs，不能把未执行验证写成 passed。",
        "```json",
        JSON.stringify(testAgentHandoffPayload, null, 2),
        "```",
        Array.isArray(testAgentHandoffWarnings) && testAgentHandoffWarnings.length ? `交接单提示：${testAgentHandoffWarnings.join("；")}` : "",
    ].filter(Boolean).join("\n") : "";
    const buildCurrentDevelopmentContract = () => buildChildAgentDevelopmentContract(targetName, childTaskText, {
        source: `${sourceProject} @ 协作`,
        reason: typeof mention === "string" ? "" : String(mention.reason || "").trim(),
        acceptance: sourceTask?.acceptance_criteria || "",
        requires_code_changes: nativeTestAgentDispatch ? false : (advisoryOnly ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true)),
        verification_hints: buildProjectVerificationHints(targetName, tWorkDir),
        work_dir: tWorkDir,
        agent_type: tAgentType,
        task_id: taskId,
        trace_id: sourceTask?.trace_id || "",
        task: sourceTask,
        group,
        dependsOn: typeof mention === "string" ? "" : String(mention.dependsOn || "").trim(),
        worker_context_packet: workerHandoff.worker_context_packet,
        memory: workerMemoryContext,
        analysis: globalMissionHandoff ? {
            constraints: Array.isArray(globalMissionHandoff.done_criteria) ? globalMissionHandoff.done_criteria : [],
            documentFindings: Array.isArray(globalMissionHandoff.references?.document_findings) ? globalMissionHandoff.references.document_findings : [],
        } : undefined,
        advisoryOnly,
        continuation: workerContinuation,
        handoff: workerHandoff,
    });
    let developmentContract = buildCurrentDevelopmentContract();
    let projectExecutionBrief = buildProjectExecutionBrief(targetName, childTaskText, {
        workDir: tWorkDir,
        resources: projectResourcesConfig,
        query: childTaskText,
        verificationHints: buildProjectVerificationHints(targetName, tWorkDir),
        memoryDeliveryMode: thirdPartyMemoryMcpEnabled ? "mcp" : "prompt",
        memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
    });
    const renderCrossAgentPrompt = (renderOptions = {}) => {
        const recentGroupContext = renderOptions.recentGroupContext ?? (thirdPartyMemoryMcpEnabled
            ? "当前精确群聊会话通过签名 ccm__knowledge_context MCP 加载，不在 bootstrap Prompt 中重复正文。"
            : tContext);
        const renderedRuntimeToolContext = renderOptions.runtimeToolContext ?? runtimeToolContext;
        const renderedDevelopmentContract = renderOptions.developmentContract ?? developmentContract;
        const renderedWorkerMemoryPacket = renderOptions.workerMemoryPacket ?? (thirdPartyMemoryMcpEnabled
            ? "[父会话记忆]\n请在确有需要时通过签名 ccm__knowledge_context MCP 读取相关摘要、已验证决策或任务状态。"
            : workerMemoryPacket);
        const renderedTaskSession = renderOptions.activeTaskSession ?? activeTaskSession;
        return `你正在 CCM 群聊中被 @ 请求协作。${collaborationInstructions}${buildAgentQaProtocolInstructions(targetName, memberList)}${toolContext.prompt}${renderedRuntimeToolContext.prompt}

${renderedDevelopmentContract}

${advisoryOnly ? `[只读协作契约]
- 这是任务内问答，不是新的开发工作单。
- 只读取必要上下文并回答问题；不得编辑、创建、删除或格式化任何文件。
- 不得安装依赖、切换权限、调用写入型 MCP，也不得扩大原任务项目边界。
- 回答需包含结论、证据和不确定项；如需实际修改，返回 needs 交由主 Agent 另行派发。` : ""}

${worktreeNotice}

${mention.conflictWorkspaceKey ? `[跨 Agent 冲突保护]
- 本任务与同仓库其他 Agent 的修改范围可能重叠。
- 主 Agent 已将相关工作单改为串行，并让它们复用隔离工作区 ${mention.conflictWorkspaceKey}。
- 执行前先检查工作区已有修改，承接前一个 Agent 的结果；不得覆盖或回退已有正确变更。` : ""}

${renderedWorkerMemoryPacket}

${projectExecutionBrief}

${continuationNotice}

${testAgentHandoffPacket}

${dependencyOutputPacket}

${renderedTaskSession ? `[任务级原生会话]
- 会话记录：${renderedTaskSession.id}
- 当前轮次：${renderedTaskSession.turnCount + 1}
- 续跑模式：${renderedTaskSession.resumeMode === "native" ? "恢复同一个 CLI 原生会话" : "平台 scratchpad 续跑"}
- 本任务记录在最终验收后结束；同一父会话后续任务会按连续性策略复用原生会话。返工必须承接上一轮结论，不得从零重做。` : ""}

${thirdPartyMemoryMcpEnabled
            ? "父会话上下文未重复注入；如需历史需求、已验证决策或任务状态，请通过签名 ccm__knowledge_context MCP 按需读取。"
            : "以下是当前精确群聊会话连续性（压缩前为完整原文，压缩后为正式摘要与动态近期完整原文）："}
${recentGroupContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${childTaskText}

请直接回复本次请求：给出结论、必要的执行/修改说明、风险、汇总意见，或需要继续 @ 的成员。`;
    };
    let tPrompt = renderCrossAgentPrompt();
    const buildParentSessionCapacityGate = () => buildFinalWorkerDispatchPayloadGate({
        renderedPrompt: tPrompt,
        workerHandoff,
        provider: activeTaskSession?.agentType || tAgentType,
        model: activeTaskSession?.modelId || "",
        providerContractId: activeTaskSession?.providerContractId || "",
        providerRuntimeVersion: activeTaskSession?.providerRuntimeVersion || "",
        groupId,
        groupSessionId: activeGroupSessionId,
        taskId,
        taskAgentSessionId: activeTaskSession?.id || "",
        requiredHydrationTokens: thirdPartyMemoryMcpEnabled ? Number(thirdPartyMemorySnapshot?.requiredHydrationTokens || 0) : 0,
        maxBootstrapTokens: thirdPartyMemorySnapshot?.maxBootstrapTokens || 32_000,
        enforceBootstrapLimit: thirdPartyMemoryMcpEnabled,
    });
    let parentSessionCapacityGate = buildParentSessionCapacityGate();
    if (parentSessionCapacityGate.status === "recompact_required") {
        const circuit = activeTaskSession
            ? inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(activeTaskSession.id, {
                groupId,
                groupSessionId: activeGroupSessionId,
                taskId,
            })
            : null;
        if (circuit?.blocked === true) {
            return failChildDispatch("项目子 Agent 父会话压缩熔断已开启", [
                `scope=${groupId}::${activeGroupSessionId}`,
                `failures=${circuit.consecutive_failures || 0}`,
                "请先修复当前会话的模型压缩配置；其他群聊会话不受影响",
            ]);
        }
        const compactAttemptId = `${parentSessionCapacityGate.gate_id}:formal_parent_compact`;
        try {
            const fixedPrompt = tPrompt.includes(tContext) ? tPrompt.replace(tContext, "") : tPrompt;
            const compactResult = await (0, group_memory_context_1.runGroupMemoryAutoCompactionNow)(groupId, {
                sessionId: activeGroupSessionId,
                force: true,
                reason: "child_agent_final_payload_capacity",
                config: {
                    memoryCompactionUseModel: true,
                    memoryCompactionMode: "model-required",
                    modelContextWindow: parentSessionCapacityGate.model_context_window,
                    modelMaxOutputTokens: parentSessionCapacityGate.reserved_output_tokens,
                    modelAutoCompactTokenLimit: parentSessionCapacityGate.auto_compact_threshold,
                    modelVisibleSystemContext: fixedPrompt,
                },
            });
            if (compactResult?.success !== true || compactResult?.compacted !== true) {
                throw new Error(compactResult?.error || compactResult?.reason || "formal_parent_compaction_not_committed");
            }
            parentSessionContext = (0, group_session_model_context_1.buildChildParentSessionContextPacket)(groupId, { groupSessionId: activeGroupSessionId });
            if (parentSessionContext.canonicalSummary !== true || parentSessionContext.mode !== "canonical_summary_recent_raw") {
                throw new Error("formal_parent_compaction_missing_canonical_summary");
            }
            tContext = parentSessionContext.rendered;
            activeInvocationEdge = activeTaskSession ? prepareTaskAgentInvocationEdge({
                groupId,
                groupSessionId: activeGroupSessionId,
                taskId,
                targetProject: targetName,
                taskAgentSessionId: activeTaskSession.id,
                nativeSessionId: activeTaskSession.nativeSessionId || "",
                executionId: laneExecutionId,
                attemptSequence: memoryDeliveryAttemptSequence,
                providerAttempt: 1,
                invocationKind: memoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
                branchKind: "main",
            }) : null;
            groupMemoryBundle = await buildCurrentGroupMemoryBundle();
            memoryPacket = renderCurrentMemoryPacket(groupMemoryBundle);
            workerMemoryContext = globalMissionMemory
                ? { schema: "ccm-worker-memory-context-v1", group_memory: groupMemoryBundle, global_mission_memory: globalMissionMemory }
                : groupMemoryBundle;
            workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
            workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
            authoritativeWorkerMemoryPacket = workerMemoryPacket;
            thirdPartyMemorySnapshot = buildGroupThirdPartyMemorySnapshot();
            memoryConsumptionChallenge = thirdPartyMemorySnapshot ? createMemoryContextConsumptionChallenge({
                groupId,
                groupSessionId: activeGroupSessionId,
                taskId,
                executionId: laneExecutionId,
                project: targetName,
                taskAgentSessionId: activeTaskSession?.id || "",
                attempt: memoryDeliveryAttemptSequence,
            }) : null;
            if (memoryConsumptionChallenge) {
                workerMemoryContext = attachMemoryContextConsumptionChallenge(workerMemoryContext, memoryConsumptionChallenge);
                workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
                workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
            }
            runtimeToolContext = prepareAgentRuntimeTools(groupId, targetName, tWorkDir, tAgentType, toolContext.allowedTools, streamRes, {
                taskId,
                task: sourceTask,
                toolAudit: toolContext.toolAudit,
                authorizationReadiness: toolContext.authorizationReadiness,
                internalAgentRole: "project-child-agent",
                groupSessionId: activeGroupSessionId,
                taskAgentSessionId: activeTaskSession?.id || "",
                nativeSessionId: activeTaskSession?.nativeSessionId || "",
                memoryReceiptChallenge: memoryConsumptionChallenge,
                memoryReceiptFile: memoryContextConsumptionReceiptFile(memoryConsumptionChallenge?.challenge_id),
                memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
                memorySnapshotChecksum: thirdPartyMemorySnapshot?.checksum || "",
                boundaryGeneration: thirdPartyMemorySnapshot?.boundaryGeneration || 0,
                nativeGeneration: thirdPartyMemorySnapshot?.nativeGeneration || 0,
                requestText: childTaskText,
                memoryReadBudgetTokens: thirdPartyMemorySnapshot?.autoCompactThreshold || 0,
            });
            thirdPartyMemoryMcpEnabled = !!thirdPartyMemorySnapshot
                && (runtimeToolContext.audit?.internal_mcp || []).some((item) => item.name === "ccm__knowledge_context" && item.state === "synced");
            if (thirdPartyMemoryMcpEnabled) {
                workerMemoryContext = buildMemoryMcpReference();
                workerHandoff = buildCurrentWorkerHandoff(workerMemoryContext);
                workerMemoryPacket = renderMemoryContextForWorker(workerHandoff?.worker_context_packet?.memory || workerMemoryContext);
            }
            projectExecutionBrief = buildProjectExecutionBrief(targetName, childTaskText, {
                workDir: tWorkDir,
                resources: projectResourcesConfig,
                query: childTaskText,
                verificationHints: buildProjectVerificationHints(targetName, tWorkDir),
                memoryDeliveryMode: thirdPartyMemoryMcpEnabled ? "mcp" : "prompt",
                memorySnapshotId: thirdPartyMemorySnapshot?.id || "",
            });
            capacityRevalidationPreparation = activeTaskSession
                ? prepareTaskAgentSessionCapacityRevalidation(activeTaskSession.id, workerHandoff.worker_context_packet)
                : null;
            if (activeTaskSession?.capacityRevalidationRequired === true && capacityRevalidationPreparation?.prepared !== true) {
                throw new Error(capacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated_after_compact");
            }
            if (capacityRevalidationPreparation?.session)
                activeTaskSession = capacityRevalidationPreparation.session;
            capacityRevalidationCommitted = capacityRevalidationPreparation?.required !== true;
            if (typeof mention !== "string")
                mention.worker_context_packet = workerHandoff.worker_context_packet;
            workerHandoffSummary = summarizeWorkerHandoffForUser(workerHandoff);
            developmentContract = buildCurrentDevelopmentContract();
            tPrompt = renderCrossAgentPrompt();
            parentSessionCapacityGate = buildParentSessionCapacityGate();
            if (parentSessionCapacityGate.provider_call_allowed !== true) {
                throw new Error(`post_compact_payload_over_threshold:${parentSessionCapacityGate.model_visible_input_tokens}/${parentSessionCapacityGate.auto_compact_threshold}`);
            }
            if (activeTaskSession) {
                recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                    groupId,
                    groupSessionId: activeGroupSessionId,
                    taskId,
                    attemptId: compactAttemptId,
                    outcome: "success",
                    reason: "formal_parent_compaction_committed",
                });
            }
            if (taskId) {
                addTaskLog(taskId, "info", `${targetName} 父会话已按模型容量正式压缩：${parentSessionCapacityGate.model_visible_input_tokens}/${parentSessionCapacityGate.auto_compact_threshold} tokens`);
                appendTaskTimelineEvent(taskId, {
                    type: "child_parent_session_formal_compact",
                    title: `${targetName} 父会话已正式压缩`,
                    detail: `已重建为模型摘要 + 动态近期完整原文；boundary=${parentSessionContext.boundaryGeneration || 0}`,
                    status: "ok",
                    phase: "dispatching",
                    agent: targetName,
                    data: { parent_session_context: parentSessionContext, final_dispatch_payload_gate: parentSessionCapacityGate },
                });
            }
        }
        catch (error) {
            if (activeTaskSession) {
                recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                    groupId,
                    groupSessionId: activeGroupSessionId,
                    taskId,
                    attemptId: compactAttemptId,
                    outcome: "failure",
                    reason: "formal_parent_compaction_failed",
                    error: error?.message || String(error),
                });
            }
            return failChildDispatch("项目子 Agent 父会话正式模型压缩失败，已阻止 Provider 调用", [
                `scope=${groupId}::${activeGroupSessionId}`,
                error?.message || String(error),
                "原始 transcript 和旧 compact head 均保留，不使用本地摘要或字符截断继续派发",
            ]);
        }
    }
    if (thirdPartyMemoryMcpEnabled && thirdPartyMemorySnapshot && parentSessionCapacityGate.provider_call_allowed === true) {
        const memoryReadBudgetTokens = Number(thirdPartyMemorySnapshot.requiredHydrationTokens || 0)
            + Math.max(0, Number(parentSessionCapacityGate.remaining_tokens_before_auto_compact || 0));
        runtimeToolContext = prepareAgentRuntimeTools(groupId, targetName, tWorkDir, tAgentType, toolContext.allowedTools, streamRes, {
            taskId,
            task: sourceTask,
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
            disableTaskBoundInternalMcp: advisoryOnly,
            internalAgentRole: targetName === coordinatorProject ? "group-main-agent" : "project-child-agent",
            groupSessionId: activeGroupSessionId,
            taskAgentSessionId: activeTaskSession?.id || "",
            nativeSessionId: activeTaskSession?.nativeSessionId || "",
            memoryReceiptChallenge: memoryConsumptionChallenge,
            memoryReceiptFile: memoryContextConsumptionReceiptFile(memoryConsumptionChallenge?.challenge_id),
            memorySnapshotId: thirdPartyMemorySnapshot.id,
            memorySnapshotChecksum: thirdPartyMemorySnapshot.checksum,
            boundaryGeneration: thirdPartyMemorySnapshot.boundaryGeneration || 0,
            nativeGeneration: thirdPartyMemorySnapshot.nativeGeneration || 0,
            requestText: childTaskText,
            memoryReadBudgetTokens,
        });
        thirdPartyMemoryMcpEnabled = (runtimeToolContext.audit?.internal_mcp || [])
            .some((item) => item.name === "ccm__knowledge_context" && item.state === "synced");
        if (!thirdPartyMemoryMcpEnabled) {
            return failChildDispatch("项目子 Agent 记忆 MCP 无法绑定最终累计 Token 预算", [
                `scope=${groupId}::${activeGroupSessionId}`,
                `budget=${memoryReadBudgetTokens}`,
            ]);
        }
        tPrompt = renderCrossAgentPrompt();
        parentSessionCapacityGate = buildParentSessionCapacityGate();
        if (parentSessionCapacityGate.provider_call_allowed !== true) {
            return failChildDispatch("项目子 Agent 记忆 MCP 预算绑定后的最终 Payload 超过模型容量", [
                `tokens=${parentSessionCapacityGate.model_visible_input_tokens}/${parentSessionCapacityGate.auto_compact_threshold}`,
            ]);
        }
    }
    if (taskId) {
        addTaskLog(taskId, "info", `${targetName} 自包含工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
        const handoffReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
            targetName,
            taskId,
            workerContextPacket: workerHandoff.worker_context_packet,
            workerHandoff,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession?.id || "",
            nativeSessionId: activeTaskSession?.nativeSessionId || "",
            executionId: laneExecutionId,
        });
        const handoffTimelineEvent = appendTaskTimelineEvent(taskId, {
            type: "worker_handoff_ready",
            title: `${targetName} 工作单已补齐`,
            detail: "目标、范围、边界、验收、ACK 和回执要求已打包给子 Agent",
            status: "ok",
            phase: "dispatching",
            agent: targetName,
            data: {
                worker_handoff: workerHandoffSummary,
                worker_context_packet: workerHandoff.worker_context_packet,
                replay_repair_dispatch_bindings: handoffReplayRepairBindings,
            },
        });
        const handoffTimelineBindings = recordReplayRepairTimelineBindingsForMention(groupId, mention, {
            targetName,
            taskId,
            workerContextPacket: workerHandoff.worker_context_packet,
            workerHandoff,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession?.id || "",
            nativeSessionId: activeTaskSession?.nativeSessionId || "",
            executionId: laneExecutionId,
            timelineEvent: handoffTimelineEvent,
            timelineEventType: "worker_handoff_ready",
        });
        if (handoffTimelineBindings.length && typeof mention !== "string")
            mention.replay_repair_timeline_bindings = handoffTimelineBindings;
        recordAgentRuntimeLifecycle({
            scope: "group",
            traceId: sourceTask?.trace_id || "",
            taskId,
            groupId,
            agent: sourceProject,
            action: "dispatch_worker",
            phase: "handoff",
            risk: "agent",
            target: targetName,
            status: "planned",
            message: `${targetName} 自包含工作单已生成`,
            data: {
                worker_handoff: workerHandoffSummary,
                worker_context_packet: workerHandoff.worker_context_packet,
                execution_order: executionOrder,
                advisory_only: advisoryOnly,
            },
        });
        if (testAgentHandoffPayload) {
            addTaskLog(taskId, "info", `${targetName} TestAgent 原生复核交接单已生成，复核对象：${getTestAgentHandoffReviewSubject(testAgentHandoffPayload) || continuationOf || targetName}`);
            appendTaskTimelineEvent(taskId, {
                type: "test_agent_handoff_ready",
                title: `${targetName} 原生复核交接单已生成`,
                detail: `复核对象：${getTestAgentHandoffReviewSubject(testAgentHandoffPayload) || continuationOf || targetName}`,
                status: "ok",
                phase: "dispatching",
                agent: targetName,
                data: {
                    test_agent_handoff: testAgentHandoffPayload,
                    warnings: testAgentHandoffWarnings,
                },
            });
        }
    }
    let activeMemoryContextSnapshot = null;
    let activeMemoryContextDelivery = null;
    if (activeTaskSession) {
        const boundMemorySnapshot = bindTaskAgentMemoryContextSnapshot(activeTaskSession.id, {
            taskId,
            groupId,
            project: targetName,
            agentType: tAgentType,
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
        if (boundMemorySnapshot) {
            const memoryEvidenceBinding = boundMemorySnapshot.snapshot?.context?.group_session_memory_binding || {};
            if (memoryEvidenceBinding.deliveryReady === false) {
                if (memoryEvidenceBinding.sessionLifecycleFenceValid === false) {
                    return failChildDispatch("所属群聊会话已归档、删除或生命周期代次已变化", [
                        `scope=${memoryEvidenceBinding.scopeId || "unknown"}`,
                        `status=${memoryEvidenceBinding.sessionLifecycleFenceStatus || memoryEvidenceBinding.sessionLifecycleStatus || "stale"}`,
                        `generation=${memoryEvidenceBinding.sessionLifecycleGeneration || 0}`,
                        "请在当前有效群聊会话中重新创建任务并生成新的记忆快照",
                    ]);
                }
                return failChildDispatch("Session Memory 模型提取交付证据未通过", [
                    `scope=${memoryEvidenceBinding.scopeId || "unknown"}`,
                    `execution=${memoryEvidenceBinding.modelExtractionExecutionId || "missing"}`,
                    `replay=${memoryEvidenceBinding.modelExtractionReplayStatus || "missing"}`,
                    "重新执行所属群聊会话的 Session Memory 模型提取与 artifact replay 后再派发",
                ]);
            }
            activeTaskSession = boundMemorySnapshot.session || activeTaskSession;
            activeMemoryContextSnapshot = summarizeTaskAgentMemoryContextSnapshot(boundMemorySnapshot.snapshot);
            if (typeof mention !== "string") {
                mention.task_agent_memory_context_snapshot = activeMemoryContextSnapshot;
            }
            if (taskId) {
                addTaskLog(taskId, "info", `${targetName} 任务会话记忆快照已绑定：${activeMemoryContextSnapshot.snapshot_id} / packet=${activeMemoryContextSnapshot.worker_context_packet_id || "none"}`);
                const snapshotReplayRepairBindings = summarizeReplayRepairTimelineBindingsForEvent(mention, {
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
                const snapshotTimelineEvent = appendTaskTimelineEvent(taskId, {
                    type: "task_agent_memory_context_snapshot",
                    title: `${targetName} 记忆上下文快照已绑定`,
                    detail: `session=${activeTaskSession.id}；snapshot=${activeMemoryContextSnapshot.snapshot_id}`,
                    status: "ok",
                    phase: "dispatching",
                    agent: targetName,
                    data: {
                        task_agent_memory_context_snapshot: activeMemoryContextSnapshot,
                        replay_repair_dispatch_bindings: snapshotReplayRepairBindings,
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
                    timelineEvent: snapshotTimelineEvent,
                    timelineEventType: "task_agent_memory_context_snapshot",
                });
            }
        }
    }
    env._locals = {
        outputs, targetName, coordinatorProject, failChildDispatch, tWorkDir, tAgentType, activeTaskSession,
        laneExecutionId, childTaskText, workerHandoff, developmentContract, renderCrossAgentPrompt, tPrompt,
        advisoryOnly, nativeTestAgentDispatch, testAgentHandoffPayload, toolContext, runtimeToolContext,
        activeGroupSessionId, activeInvocationEdge, groupMemoryBundle, workerMemoryContext, workerMemoryPacket,
        dependencyOutputPacket, continuationNotice, testAgentHandoffPacket, projectExecutionBrief, worktreeNotice,
        atMessage, implementationMessage, requiresAckPreflight, testAgentWorkDirPolicy, memoryDeliveryAttemptSequence,
        globalMissionHandoff, globalMissionMemory, workerContinuation, capacityRevalidationPreparation,
        capacityRevalidationCommitted, workerHandoffSummary, activeMemoryContextSnapshot, activeMemoryContextDelivery,
        memoryConsumptionChallenge, projectResourcesConfig, collaborationInstructions, memberList, isContinuation,
        continuationUserLabel, isVerifierContinuation, isFreshVerifierContinuation, continuationOf, reworkRoute,
        routeStopResult, providerSwitchDecisionReceipt, tContext, preparedWorkDir, testAgentHandoffWarnings, continuationStrategy,
        mentionStr, nativeTestAgentMention, targetMember, atRegex, atMatch, taskKey, testAgentHandoff, legacyTestAgentWorkOrder,
        runtime, testAgentProjectWorkDir, workDirState, taskRuntimeOverride, providerSwitchAttempted,
        approvedSwitchAgentType, providerSwitchSessionBinding, routeContinuationFallback, pendingCapacityDowngradeGate,
        memoryPacket, parentSessionContext,
        thirdPartyMemorySnapshot, thirdPartyMemoryMcpEnabled,
        communicationEnvelope,
    };
    return executeMentionJobTryA(mention, env);
}
// ===== merged from collaboration-cross-agents-part-02-part-01.ts =====
// ===== merged from collaboration-cross-agents-part-02-part-02.ts =====
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
    const communicationEnvelope = L.communicationEnvelope || null;
    let groupMemoryBundle = L.groupMemoryBundle || null;
    let workerMemoryContext = L.workerMemoryContext || null;
    let workerMemoryPacket = L.workerMemoryPacket || "";
    let thirdPartyMemorySnapshot = L.thirdPartyMemorySnapshot || null;
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
    const renderCurrentCrossAgentPrompt = (options = {}) => renderCrossAgentPrompt({
        ...options,
        developmentContract,
        workerMemoryPacket,
        runtimeToolContext,
        activeTaskSession,
    });
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
                        activeTaskSession = taskId ? openTaskAgentSession({
                            scopeId: taskId,
                            taskId,
                            groupId,
                            project: targetName,
                            agentType: activeRuntime,
                            continuity: activeGroupSessionId.startsWith("gcs_")
                                ? (0, agent_sessions_shared_1.buildTaskAgentContinuityBinding)({ scope: "group", scopeId: groupId, exactSessionId: activeGroupSessionId, project: targetName, agentType: activeRuntime })
                                : null,
                        }) : null;
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
                    let fallbackContextReady = false;
                    for (let contextBuildPass = 0; contextBuildPass < 2; contextBuildPass++) {
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
                            dedicatedParentSessionContext: true,
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
                            communication_envelope: communicationEnvelope,
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
                        tPrompt = renderCurrentCrossAgentPrompt();
                        const fallbackCapacityGate = buildFinalWorkerDispatchPayloadGate({
                            renderedPrompt: tPrompt,
                            workerHandoff,
                            provider: activeRuntime,
                            model: activeTaskSession?.modelId || "",
                            providerContractId: activeTaskSession?.providerContractId || "",
                            providerRuntimeVersion: activeTaskSession?.providerRuntimeVersion || "",
                            groupId,
                            groupSessionId: activeGroupSessionId,
                            taskId,
                            taskAgentSessionId: activeTaskSession?.id || "",
                        });
                        if (fallbackCapacityGate.provider_call_allowed === true) {
                            fallbackContextReady = true;
                            break;
                        }
                        if (contextBuildPass > 0 || fallbackCapacityGate.status !== "recompact_required") {
                            if (activeTaskSession && fallbackCapacityGate.status === "recompact_required") {
                                recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                                    groupId,
                                    groupSessionId: activeGroupSessionId,
                                    taskId,
                                    attemptId: `${fallbackCapacityGate.gate_id}:fallback_post_compact_blocked`,
                                    outcome: "failure",
                                    reason: "fallback_post_compact_payload_over_threshold",
                                    error: `prompt_tokens=${fallbackCapacityGate.model_visible_input_tokens};threshold=${fallbackCapacityGate.auto_compact_threshold}`,
                                });
                            }
                            return failChildDispatch("切换项目子 Agent 后的上下文仍超过模型容量，已阻止 Provider 调用", [
                                `scope=${groupId}::${activeGroupSessionId}`,
                                `tokens=${fallbackCapacityGate.model_visible_input_tokens}/${fallbackCapacityGate.auto_compact_threshold}`,
                                "原始 transcript 保持不变，不使用字符截断绕过门禁",
                            ]);
                        }
                        const fallbackCircuit = activeTaskSession
                            ? inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(activeTaskSession.id, { groupId, groupSessionId: activeGroupSessionId, taskId })
                            : null;
                        if (fallbackCircuit?.blocked === true) {
                            return failChildDispatch("切换项目子 Agent 后的父会话压缩熔断已开启", [
                                `scope=${groupId}::${activeGroupSessionId}`,
                                `failures=${fallbackCircuit.consecutive_failures || 0}`,
                            ]);
                        }
                        const fallbackCompactAttemptId = `${fallbackCapacityGate.gate_id}:fallback_formal_parent_compact`;
                        const fixedPrompt = tPrompt.includes(tContext) ? tPrompt.replace(tContext, "") : tPrompt;
                        let fallbackCompactResult = null;
                        try {
                            fallbackCompactResult = await (0, group_memory_context_1.runGroupMemoryAutoCompactionNow)(groupId, {
                                sessionId: activeGroupSessionId,
                                force: true,
                                reason: "child_agent_fallback_model_capacity",
                                config: {
                                    memoryCompactionUseModel: true,
                                    memoryCompactionMode: "model-required",
                                    modelContextWindow: fallbackCapacityGate.model_context_window,
                                    modelMaxOutputTokens: fallbackCapacityGate.reserved_output_tokens,
                                    modelAutoCompactTokenLimit: fallbackCapacityGate.auto_compact_threshold,
                                    modelVisibleSystemContext: fixedPrompt,
                                },
                            });
                        }
                        catch (error) {
                            fallbackCompactResult = { success: false, compacted: false, error: error?.message || String(error) };
                        }
                        if (fallbackCompactResult?.success !== true || fallbackCompactResult?.compacted !== true) {
                            if (activeTaskSession) {
                                recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                                    groupId,
                                    groupSessionId: activeGroupSessionId,
                                    taskId,
                                    attemptId: fallbackCompactAttemptId,
                                    outcome: "failure",
                                    reason: "fallback_formal_parent_compaction_failed",
                                    error: fallbackCompactResult?.error || fallbackCompactResult?.reason || "formal_parent_compaction_not_committed",
                                });
                            }
                            return failChildDispatch("切换项目子 Agent 后的父会话正式模型压缩失败，已阻止 Provider 调用", [
                                `scope=${groupId}::${activeGroupSessionId}`,
                                fallbackCompactResult?.error || fallbackCompactResult?.reason || "formal_parent_compaction_not_committed",
                            ]);
                        }
                        const fallbackParentSessionContext = (0, group_session_model_context_1.buildChildParentSessionContextPacket)(groupId, { groupSessionId: activeGroupSessionId });
                        if (fallbackParentSessionContext.canonicalSummary !== true) {
                            return failChildDispatch("切换项目子 Agent 后未生成可信正式摘要，已阻止 Provider 调用", [
                                `scope=${groupId}::${activeGroupSessionId}`,
                            ]);
                        }
                        tContext = fallbackParentSessionContext.rendered;
                        activeInvocationEdge = activeTaskSession ? prepareTaskAgentInvocationEdge({
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
                            forkReason: "fallback_parent_compaction_rebuild",
                        }) : null;
                        if (activeTaskSession) {
                            recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(activeTaskSession.id, {
                                groupId,
                                groupSessionId: activeGroupSessionId,
                                taskId,
                                attemptId: fallbackCompactAttemptId,
                                outcome: "success",
                                reason: "fallback_formal_parent_compaction_committed",
                            });
                        }
                    }
                    if (!fallbackContextReady) {
                        return failChildDispatch("切换项目子 Agent 后无法构建容量内上下文，已阻止 Provider 调用", [
                            `scope=${groupId}::${activeGroupSessionId}`,
                        ]);
                    }
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
                    ? renderCurrentCrossAgentPrompt({ recentGroupContext })
                    : `${buildRuntimeRecoveryPrompt({
                        originalPrompt: renderCurrentCrossAgentPrompt({ recentGroupContext }),
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
                let communicationHeartbeat = null;
                const communicationIdentity = communicationEnvelope ? {
                    taskId: communicationEnvelope.taskId,
                    workItemId: communicationEnvelope.workItemId,
                    exactSessionId: communicationEnvelope.exactSessionId,
                    generation: communicationEnvelope.generation,
                    attempt: communicationEnvelope.attempt,
                    leaseId: communicationEnvelope.leaseId,
                    senderAgentId: communicationEnvelope.receiverAgentId,
                    receiverAgentId: communicationEnvelope.senderAgentId,
                } : null;
                const currentCommunication = communicationEnvelope?.messageId
                    ? (0, agent_communication_v2_1.getAgentCommunication)(communicationEnvelope.messageId, { includeEvents: false, includeReceipts: false })
                    : null;
                const communicationPolicy = (0, agent_communication_v2_1.readAgentCommunicationPolicy)(sourceTask?.contextPolicy?.effective || sourceTask?.context_policy?.effective || sourceTask?.context_policy_effective || {});
                const targetAnchorMessageId = String(currentCommunication?.payload?.anchorMessageId || currentCommunication?.payload?.anchor_message_id || responseMessageId || `task-message:${taskId}:${targetName}`);
                const originMessageId = String(currentCommunication?.payload?.originMessageId || currentCommunication?.payload?.origin_message_id || "");
                if (communicationEnvelope?.messageId && communicationPolicy.strictPreExecutionAckEnabled === true) {
                    (0, agent_communication_v2_1.markAgentCommunicationRunnerStarted)(communicationEnvelope.messageId, { runtime: activeRuntime, runnerKind: "ack_preflight", summary: "正在进行执行前ACK预检" });
                    const preflightSnapshot = tWorkDir ? ctx.createFileChangeSnapshot(tWorkDir) : null;
                    await ctx.callAgent(targetName, [
                        "[CCM执行前ACK预检]",
                        `通信message_id：${communicationEnvelope.messageId}`,
                        `任务目标：${String(childTaskText || "").slice(0, 500)}`,
                        "禁止修改文件、运行构建、测试或执行其他业务工具。只能调用 ccm__agent_communication.acknowledge_assignment，成功后立即结束。",
                    ].join("\n"), tWorkDir, activeRuntime, communicationPolicy.agentAckTimeoutMs, {
                        groupId,
                        allowedTools: toolContext.allowedTools,
                        cliAllowedTools: agent_communication_mcp_1.AGENT_COMMUNICATION_ACK_MCP_TOOL_ALIASES,
                        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                        taskId,
                        executionId: `${laneExecutionId}:ack-preflight`,
                        taskAgentSessionId: activeTaskSession?.id || "",
                        skipIndependentVerification: true,
                        background: true,
                        durableDispatch: false,
                    });
                    const preflightChanges = tWorkDir ? ctx.getFileChanges(targetName, preflightSnapshot) : null;
                    if (Number(preflightChanges?.count || 0) > 0) {
                        (0, agent_communication_v2_1.transitionAgentCommunication)(communicationEnvelope.messageId, "recovery_required", { eventType: "ack_preflight_side_effect", detail: { fileCount: preflightChanges.count, contentStored: false } });
                        throw new Error("ACK预检产生了未授权文件副作用，已停止正式执行");
                    }
                    const acknowledged = (0, agent_communication_v2_1.getAgentCommunication)(communicationEnvelope.messageId, { includeEvents: false, includeReceipts: false });
                    if (!acknowledged || !["acknowledged", "executing"].includes(String(acknowledged.state))) {
                        if (acknowledged?.state === "runner_started")
                            (0, agent_communication_v2_1.transitionAgentCommunication)(communicationEnvelope.messageId, "ack_timeout", { eventType: "ack_timeout", detail: { timeoutMs: communicationPolicy.agentAckTimeoutMs } });
                        throw new Error("第三方 Agent 未在执行前完成真实ACK，正式Runner未启动");
                    }
                }
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
                    runtimeProgressContext: communicationEnvelope ? {
                        taskId: communicationEnvelope.taskId,
                        workItemId: communicationEnvelope.workItemId,
                        scope: communicationEnvelope.scope,
                        scopeId: communicationEnvelope.scopeId,
                        exactSessionId: communicationEnvelope.exactSessionId,
                        anchorMessageId: targetAnchorMessageId,
                        ...(originMessageId ? { originMessageId } : {}),
                        agentRunId: communicationEnvelope.messageId,
                        generation: communicationEnvelope.generation,
                        attempt: communicationEnvelope.attempt,
                        leaseId: communicationEnvelope.leaseId,
                        project: targetName,
                    } : null,
                    agentRuntimeStructuredProgressEnabled: communicationPolicy.agentRuntimeStructuredProgressEnabled,
                    agentProgressFallbackTimeoutMs: communicationPolicy.agentProgressFallbackTimeoutMs,
                    trustedMemoryProviderChannelRequired: activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    trustedMemoryProviderAcknowledgementRequired: activeMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
                    memoryContextConsumptionReceiptRequired: activeMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
                    memoryContextConsumptionChallenge: activeMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
                    trustedMemoryEnvelopeChecksum: activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
                    trustedMemoryEnvelopeSourceChecksum: activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
                    ...taskAgentSessionLifecycleRunnerOptions(activeMemoryContextSnapshot),
                    agentSession: activeTaskSession
                        ? { ...getTaskAgentSessionOptions(activeTaskSession), conversationPermissionMode: sourceTask?.conversation_permission_mode || "full_access" }
                        : { conversationPermissionMode: sourceTask?.conversation_permission_mode || "full_access" },
                    durableDispatch: typedMemoryDispatchAdmission.required === true
                        || capacityRevalidationPreparation?.required === true
                        || activeMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    initialWorkEvents: [runtimeToolContext.workEvent],
                    onRunnerRequestCreated: (requestId) => {
                        targetRunnerRequestId = String(requestId || "");
                        if (communicationEnvelope?.messageId && communicationIdentity) {
                            (0, agent_communication_v2_1.markAgentCommunicationRunnerStarted)(communicationEnvelope.messageId, { runnerRequestId: targetRunnerRequestId, runtime: activeRuntime, worktreeRef: preparedWorkDir.mode === "worktree" ? preparedWorkDir.worktreePath || preparedWorkDir.workDir : "" });
                            communicationHeartbeat = setInterval(() => {
                                try {
                                    (0, agent_communication_v2_1.heartbeatAgentCommunication)(communicationEnvelope.messageId, communicationIdentity, { phase: "executing" });
                                }
                                catch (error) {
                                    if (taskId)
                                        addTaskLog(taskId, "warning", `Agent Communication心跳写入失败：${String(error?.message || error).slice(0, 240)}`);
                                }
                            }, (0, agent_communication_v2_1.readAgentCommunicationPolicy)().agentHeartbeatIntervalMs);
                            communicationHeartbeat.unref?.();
                        }
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
                        if (communicationHeartbeat)
                            clearInterval(communicationHeartbeat);
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
                if (communicationHeartbeat)
                    clearInterval(communicationHeartbeat);
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
                const failedAttempt = !targetSessionSucceeded;
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
            if (communicationEnvelope?.messageId) {
                const communicationResult = (0, agent_communication_v2_1.submitAgentCommunicationResult)(communicationEnvelope.messageId, {
                    ...(targetReceipt || {}),
                    status: targetReceipt?.status || (targetSessionSucceeded ? "submitted" : "failed"),
                    summary: targetReceipt?.summary || (targetSessionSucceeded ? `${targetName} 已返回执行结果` : targetSessionError || `${targetName} 执行失败`),
                    filesChanged: targetReceipt?.filesChanged || targetFileChanges?.files || [],
                    verificationResults: targetReceipt?.verificationResults || [],
                    sideEffectState: (targetReceipt?.filesChanged?.length || targetFileChanges?.files?.length) ? "known" : "none",
                });
                if (taskId)
                    appendTaskTimelineEvent(taskId, {
                        type: "agent_communication_result",
                        title: `${targetName} 已提交通信 V2 结果`,
                        detail: communicationEnvelope.messageId,
                        status: communicationResult.accepted === true ? "ok" : "warn",
                        phase: "reviewing",
                        agent: targetName,
                        data: { message_id: communicationEnvelope.messageId, receipt_checksum: communicationResult.receiptChecksum || "", content_stored: false },
                    });
            }
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
                        agentSession: activeTaskSession
                            ? { ...getTaskAgentSessionOptions(activeTaskSession), conversationPermissionMode: sourceTask?.conversation_permission_mode || "full_access" }
                            : { conversationPermissionMode: sourceTask?.conversation_permission_mode || "full_access" },
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
            targetReceipt = (0, third_party_memory_snapshot_1.mergeThirdPartyMemoryUsageIntoReceipt)(detectedSkillUse.receipt, thirdPartyMemorySnapshot?.id || "", thirdPartyMemorySnapshot?.checksum || "");
            targetInvokedSkills = detectedSkillUse.invoked;
        }
        env._locals = { ...env._locals, outputs, targetName, tWorkDir, tAgentType, activeTaskSession, laneExecutionId, childTaskText, workerHandoff, developmentContract, tPrompt, advisoryOnly, toolContext, runtimeToolContext, activeGroupSessionId, activeInvocationEdge, groupMemoryBundle, workerMemoryContext, workerMemoryPacket, activeMemoryContextSnapshot, activeMemoryContextDelivery, memoryConsumptionChallenge, capacityRevalidationPreparation, capacityRevalidationCommitted, memoryPacket, tContext, providerSwitchSessionBinding, workerHandoffSummary, targetReceipt, tOutput, activeRuntime, targetFileChanges, targetWorkEvents, targetNativeSessionId, targetInvokedSkills, testAgentNativeReport, testAgentExecutionPlan, testAgentPlanDispatch, testAgentCliDispatch, responseMessageId, targetProviderToolAccessEvidence, thirdPartyMemorySnapshot };
        return executeMentionJobTryB(mention, env);
    }
    catch (error) {
        return handleExecuteMentionJobCatch(error, { outputs, targetName, groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, addTaskLog, updateGroupMemory, appendGroupMessage, emitAssignmentStatus });
    }
}
// ===== merged from collaboration-cross-agents-part-03.ts =====
function handleExecuteMentionJobCatch(error, ctx) {
    const { outputs, targetName, groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, addTaskLog, updateGroupMemory, appendGroupMessage, emitAssignmentStatus } = ctx;
    console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
    emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, "failed", error.message || "执行失败");
    if (taskId)
        addTaskLog(taskId, "error", `子 Agent 执行失败：${targetName}；${error.message || "未知错误"}`);
    outputs.push(formatCollectedAgentOutput(targetName, `❌ 转发失败: ${error.message}`, {
        agent: targetName,
        status: "failed",
        summary: `转发失败: ${error.message}`,
        actions: [],
        filesChanged: [],
        verification: [],
        blockers: [String(error.message || "执行失败")],
        needs: [],
    }));
    updateGroupMemory(groupId, {
        currentPhase: "needs_rework",
        blocked: {
            project: targetName,
            reason: `转发失败: ${error.message || "执行失败"}`,
            needs: [],
        },
        workerLedger: {
            taskId,
            project: targetName,
            status: "failed",
            receiptStatus: "failed",
            summary: `转发失败: ${error.message || "执行失败"}`,
            blockers: [String(error.message || "执行失败")],
            needs: [],
        },
        nextAction: `主 Agent 复盘 ${targetName} 执行失败并决定是否重试`,
    });
    appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "err",
        role: "assistant", agent: "system",
        content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        task_id: taskId || undefined,
    });
    return outputs;
}
async function executeMentionJobTryB(mention, env) {
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
        if (targetReceipt) {
            const agentMemoryContextUsage = targetReceipt.agentMemoryContextUsage
                || targetReceipt.agent_memory_context_usage
                || targetReceipt.memoryContextUsage
                || targetReceipt.memory_context_usage
                || null;
            targetReceipt = {
                ...targetReceipt,
                agentMemoryContextUsage,
                agent_memory_context_usage: agentMemoryContextUsage,
            };
        }
        if (targetReceipt && activeTaskSession) {
            targetReceipt = {
                ...targetReceipt,
                taskAgentSessionId: activeTaskSession.id,
                task_agent_session_id: activeTaskSession.id,
                nativeSessionId: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                native_session_id: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                taskAgentSessionTurn: activeTaskSession.turnCount,
                task_agent_session_turn: activeTaskSession.turnCount,
                memoryContextSnapshotId: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memory_context_snapshot_id: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                memory_context_snapshot_checksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                workerContextPacketId: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                worker_context_packet_id: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                agentType: activeTaskSession.agentType || activeRuntime,
                agent_type: activeTaskSession.agentType || activeRuntime,
                executionId: laneExecutionId,
                execution_id: laneExecutionId,
                traceId: sourceTask?.trace_id || "",
                trace_id: sourceTask?.trace_id || "",
            };
        }
        if (advisoryOnly) {
            const advisoryChanges = Array.isArray(targetFileChanges?.files) ? targetFileChanges.files : Array.isArray(targetFileChanges) ? targetFileChanges : [];
            const boundary = evaluateAdvisoryPermissionBoundary(advisoryChanges, { mcp: [], skill: [] }, toolContext.allowedTools);
            if (!boundary.pass) {
                targetReceipt = {
                    agent: targetName,
                    status: "failed",
                    summary: "Agent 问答违反 advisory_read_only 权限契约，回答已隔离",
                    actions: [],
                    filesChanged: advisoryChanges.map((item) => item?.path || item).filter(Boolean),
                    verification: [],
                    blockers: [boundary.reason],
                    needs: ["由主 Agent 重新派发正式开发工作单后才能修改文件"],
                    permission_boundary: boundary,
                };
                tOutput = `${stripAgentQaProtocolBlocks(tOutput)}\n\n权限门禁：${boundary.reason}`;
                if (taskId)
                    appendTaskTimelineEvent(taskId, { type: "agent_qa_permission_violation", title: `${targetName} 问答越权已隔离`, detail: boundary.reason, status: "fail", phase: "waiting_dependency", agent: targetName, data: boundary });
                appendAgentQaTrace(taskId, "agent.qa.permission_violation", { id: mention.requestId, group_id: groupId, from_agent: sourceProject, to_agent: targetName }, boundary.reason, "fail", boundary);
            }
        }
        if (targetReceipt && activeTaskSession && !targetReceipt.task_agent_session_id) {
            targetReceipt = {
                ...targetReceipt,
                taskAgentSessionId: activeTaskSession.id,
                task_agent_session_id: activeTaskSession.id,
                nativeSessionId: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                native_session_id: targetNativeSessionId || activeTaskSession.nativeSessionId || "",
                taskAgentSessionTurn: activeTaskSession.turnCount,
                task_agent_session_turn: activeTaskSession.turnCount,
                memoryContextSnapshotId: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memory_context_snapshot_id: activeMemoryContextSnapshot?.snapshot_id || activeTaskSession.memoryContextSnapshotId || "",
                memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                memory_context_snapshot_checksum: activeMemoryContextSnapshot?.checksum || activeTaskSession.memoryContextSnapshotChecksum || "",
                workerContextPacketId: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                worker_context_packet_id: activeMemoryContextSnapshot?.worker_context_packet_id || activeTaskSession.memoryContextPacketId || "",
                agentType: activeTaskSession.agentType || activeRuntime,
                agent_type: activeTaskSession.agentType || activeRuntime,
                executionId: laneExecutionId,
                execution_id: laneExecutionId,
                traceId: sourceTask?.trace_id || "",
                trace_id: sourceTask?.trace_id || "",
            };
        }
        let providerSwitchExecutionReceipt = null;
        if (targetReceipt && providerSwitchDecisionReceipt?.valid === true) {
            recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId, {
                assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
                dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                provider_switch_decision_receipt: providerSwitchDecisionReceipt,
                project: targetName,
                agent_type: activeRuntime,
                task_agent_session_id: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
                native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || targetNativeSessionId || activeTaskSession?.nativeSessionId || "",
                execution_id: laneExecutionId,
            });
            providerSwitchExecutionReceipt = recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId, {
                assignment_id: typeof mention === "string" ? "" : mention.assignmentId || mention.assignment_id || "",
                dispatch_key: typeof mention === "string" ? "" : mention.dispatchKey || mention.dispatch_key || "",
                worker_context_packet_id: workerHandoff.worker_context_packet?.packet_id || "",
                provider_switch_decision_receipt: providerSwitchDecisionReceipt,
                project: targetName,
                executed_provider: activeRuntime,
                task_agent_session_id: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
                native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || targetNativeSessionId || activeTaskSession?.nativeSessionId || "",
                execution_id: laneExecutionId,
                receipt_status: targetReceipt.status || "",
                receipt: targetReceipt,
            });
            if (providerSwitchExecutionReceipt) {
                targetReceipt = {
                    ...targetReceipt,
                    providerSwitchExecution: providerSwitchExecutionReceipt,
                    provider_switch_execution: providerSwitchExecutionReceipt,
                    providerSwitchDecisionReceiptId: providerSwitchExecutionReceipt.provider_switch_decision_receipt_id || "",
                    provider_switch_decision_receipt_id: providerSwitchExecutionReceipt.provider_switch_decision_receipt_id || "",
                    executedProvider: providerSwitchExecutionReceipt.actually_executed_provider || activeRuntime,
                    executed_provider: providerSwitchExecutionReceipt.actually_executed_provider || activeRuntime,
                };
                if (providerSwitchExecutionReceipt.status !== "passed" && targetReceipt.status === "done") {
                    targetReceipt = {
                        ...targetReceipt,
                        status: "partial",
                        blockers: uniqueStrings([
                            ...(Array.isArray(targetReceipt.blockers) ? targetReceipt.blockers : []),
                            `provider switch execution proof failed: ${(providerSwitchExecutionReceipt.gaps || []).join(", ") || "unknown"}`,
                        ]),
                        needs: uniqueStrings([
                            ...(Array.isArray(targetReceipt.needs) ? targetReceipt.needs : []),
                            "重新派发并确保实际 runner、task Agent session 与 approved provider switch receipt 一致",
                        ]),
                    };
                }
            }
        }
        const receiptReplayRepairBindings = targetReceipt ? summarizeReplayRepairTimelineBindingsForEvent(mention, {
            targetName,
            taskId,
            workerContextPacket: workerHandoff.worker_context_packet,
            workerHandoff,
            memoryContextSnapshot: activeMemoryContextSnapshot,
            taskAgentSession: activeTaskSession,
            taskAgentSessionId: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
            nativeSessionId: targetReceipt.native_session_id || targetReceipt.nativeSessionId || activeTaskSession?.nativeSessionId || "",
            executionId: laneExecutionId,
            receipt: targetReceipt,
        }) : [];
        if (targetReceipt && receiptReplayRepairBindings.length) {
            targetReceipt = {
                ...targetReceipt,
                replayRepairDispatchBriefs: receiptReplayRepairBindings,
                replay_repair_dispatch_briefs: receiptReplayRepairBindings,
            };
        }
        outputs.push(formatCollectedAgentOutput(targetName, tOutput, targetReceipt));
        if (taskId && targetReceipt) {
            const verificationCount = Array.isArray(targetReceipt.verification) ? targetReceipt.verification.length : 0;
            const fileCount = Array.isArray(targetReceipt.filesChanged) ? targetReceipt.filesChanged.length : 0;
            addTaskLog(taskId, targetReceipt.status === "done" ? "success" : "warning", `子 Agent 结果说明：${targetName} status=${targetReceipt.status}，文件 ${fileCount} 个，验证 ${verificationCount} 条；${targetReceipt.summary || "无摘要"}`);
            const receiptTimelineEvent = appendTaskTimelineEvent(taskId, {
                type: "child_agent_receipt",
                title: `${targetName} 提交结果说明`,
                detail: targetReceipt.summary || "无摘要",
                status: targetReceipt.status === "done" ? "ok" : "warn",
                phase: "executing",
                agent: targetName,
                data: { receipt: targetReceipt, fileCount, verificationCount, replay_repair_dispatch_bindings: receiptReplayRepairBindings },
            });
            recordReplayRepairTimelineBindingsForMention(groupId, mention, {
                targetName,
                taskId,
                workerContextPacket: workerHandoff.worker_context_packet,
                workerHandoff,
                memoryContextSnapshot: activeMemoryContextSnapshot,
                memoryContextSnapshotChecksum: activeMemoryContextSnapshot?.checksum || "",
                taskAgentSession: activeTaskSession,
                taskAgentSessionId: activeTaskSession?.id || targetReceipt.task_agent_session_id || "",
                nativeSessionId: targetReceipt.native_session_id || targetReceipt.nativeSessionId || activeTaskSession?.nativeSessionId || "",
                executionId: laneExecutionId,
                receipt: targetReceipt,
                receiptStatus: targetReceipt.status || "",
                timelineEvent: receiptTimelineEvent,
                timelineEventType: "child_agent_receipt",
            });
        }
        if (targetReceipt) {
            if (taskId)
                updateTaskWorkItemFromReceipt(taskId, targetName, targetReceipt, targetFileChanges, tOutput, { ctx });
            if (laneExecutionId) {
                const green = evaluateGreenContract({ receipt: targetReceipt, fileChanges: targetFileChanges, requiresChanges: nativeTestAgentDispatch ? false : (sourceTask ? taskRequiresCodeChanges(sourceTask) : true), requiresVerification: sourceTask?.requires_verification !== false, requiredLevel: "project" });
                transitionExecution(laneExecutionId, targetReceipt.status === "failed" ? "failed" : "reviewing", targetReceipt.status === "done" ? "子 Agent 已交付，等待主 Agent 验收" : (targetReceipt.summary || "子 Agent 结果说明未完成"), {
                    green,
                    receipt: targetReceipt,
                    fileChanges: targetFileChanges,
                    runnerVerification: extractRunnerVerificationEvidence(tOutput),
                    outputPreview: tOutput,
                    data: {
                        runtime_tool_sync: compactRuntimeToolAudit(runtimeToolContext.audit),
                        invoked_skills: targetInvokedSkills,
                        replay_repair_dispatch_bindings: receiptReplayRepairBindings,
                        test_agent_execution_plan: testAgentExecutionPlan,
                        test_agent_plan_dispatch: testAgentPlanDispatch ? {
                            cliPath: testAgentPlanDispatch.cliPath,
                            handoffPath: testAgentPlanDispatch.handoffPath,
                            exitCode: testAgentPlanDispatch.exitCode,
                            signal: testAgentPlanDispatch.signal,
                            stderrReference: testAgentPlanDispatch.stderrReference,
                            stdoutReference: testAgentPlanDispatch.stdoutReference,
                        } : null,
                        test_agent_report: testAgentNativeReport,
                        test_agent_cli_dispatch: testAgentCliDispatch ? {
                            cliPath: testAgentCliDispatch.cliPath,
                            handoffPath: testAgentCliDispatch.handoffPath,
                            exitCode: testAgentCliDispatch.exitCode,
                            signal: testAgentCliDispatch.signal,
                            stderrReference: testAgentCliDispatch.stderrReference,
                            stdoutReference: testAgentCliDispatch.stdoutReference,
                        } : null,
                    },
                });
            }
            if (targetReceipt.status === "done" || targetReceipt.status === "partial") {
                updateGroupMemory(groupId, {
                    currentPhase: targetReceipt.status === "done" ? "executing" : "needs_rework",
                    completed: {
                        project: targetName,
                        summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                        filesChanged: targetReceipt.filesChanged || [],
                        verification: targetReceipt.verification || [],
                        memoryUsed: targetReceipt.memoryUsed || [],
                        memoryIgnored: targetReceipt.memoryIgnored || [],
                        taskAgentSessionId: targetReceipt.taskAgentSessionId || targetReceipt.task_agent_session_id || "",
                        nativeSessionId: targetReceipt.nativeSessionId || targetReceipt.native_session_id || "",
                        agentType: targetReceipt.agentType || targetReceipt.agent_type || "",
                    },
                    workerLedger: {
                        taskId,
                        project: targetName,
                        status: targetReceipt.status === "done" ? "completed" : "partial",
                        receiptStatus: targetReceipt.status,
                        summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                        filesChanged: targetReceipt.filesChanged || [],
                        verification: targetReceipt.verification || [],
                        blockers: targetReceipt.blockers || [],
                        needs: targetReceipt.needs || [],
                        memoryUsed: targetReceipt.memoryUsed || [],
                        memoryIgnored: targetReceipt.memoryIgnored || [],
                        taskAgentSessionId: targetReceipt.taskAgentSessionId || targetReceipt.task_agent_session_id || "",
                        task_agent_session_id: targetReceipt.task_agent_session_id || targetReceipt.taskAgentSessionId || "",
                        nativeSessionId: targetReceipt.nativeSessionId || targetReceipt.native_session_id || "",
                        native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || "",
                        agentType: targetReceipt.agentType || targetReceipt.agent_type || "",
                        agent_type: targetReceipt.agent_type || targetReceipt.agentType || "",
                        executionId: targetReceipt.executionId || targetReceipt.execution_id || laneExecutionId,
                        execution_id: targetReceipt.execution_id || targetReceipt.executionId || laneExecutionId,
                    },
                    nextAction: targetReceipt.status === "done" ? `等待主 Agent 验收 ${targetName} 结果说明` : `主 Agent 复盘 ${targetName} 的部分完成结果说明`,
                });
            }
            else {
                updateGroupMemory(groupId, {
                    currentPhase: "needs_rework",
                    blocked: {
                        project: targetName,
                        reason: targetReceipt.blockers?.join("；") || targetReceipt.summary || targetReceipt.status,
                        needs: targetReceipt.needs || [],
                    },
                    workerLedger: {
                        taskId,
                        project: targetName,
                        status: targetReceipt.status || "blocked",
                        receiptStatus: targetReceipt.status,
                        summary: targetReceipt.summary || compactMemoryText(tOutput, 220),
                        filesChanged: targetReceipt.filesChanged || [],
                        verification: targetReceipt.verification || [],
                        blockers: targetReceipt.blockers || [],
                        needs: targetReceipt.needs || [],
                        memoryUsed: targetReceipt.memoryUsed || [],
                        memoryIgnored: targetReceipt.memoryIgnored || [],
                        taskAgentSessionId: targetReceipt.taskAgentSessionId || targetReceipt.task_agent_session_id || "",
                        task_agent_session_id: targetReceipt.task_agent_session_id || targetReceipt.taskAgentSessionId || "",
                        nativeSessionId: targetReceipt.nativeSessionId || targetReceipt.native_session_id || "",
                        native_session_id: targetReceipt.native_session_id || targetReceipt.nativeSessionId || "",
                        agentType: targetReceipt.agentType || targetReceipt.agent_type || "",
                        agent_type: targetReceipt.agent_type || targetReceipt.agentType || "",
                        executionId: targetReceipt.executionId || targetReceipt.execution_id || laneExecutionId,
                        execution_id: targetReceipt.execution_id || targetReceipt.executionId || laneExecutionId,
                    },
                    nextAction: `主 Agent 复盘 ${targetName} 阻塞并决定是否返工或询问用户`,
                });
            }
        }
        else {
            if (taskId)
                addTaskLog(taskId, "warning", `子 Agent 未提供结构化回执：${targetName}；主 Agent 后续验收会要求补充 CCM_AGENT_RECEIPT`);
            updateGroupMemory(groupId, {
                currentPhase: "reviewing",
                blocked: {
                    project: targetName,
                    reason: "子 Agent 未提供结构化回执，主 Agent 需要验收时确认是否补充",
                    needs: ["补充 CCM_AGENT_RECEIPT"],
                },
                workerLedger: {
                    taskId,
                    project: targetName,
                    status: "missing_receipt",
                    receiptStatus: "missing",
                    summary: compactMemoryText(tOutput, 220),
                    blockers: ["缺少 CCM_AGENT_RECEIPT"],
                    needs: ["补充 CCM_AGENT_RECEIPT"],
                },
                nextAction: `主 Agent 验收 ${targetName} 自然语言回复`,
            });
        }
        appendGroupMessage(groupId, {
            id: responseMessageId,
            role: "assistant", agent: targetName,
            content: tOutput,
            timestamp: new Date().toISOString(),
            task_id: taskId || undefined,
            task_agent_session_id: activeTaskSession?.id || targetReceipt?.task_agent_session_id || undefined,
            native_session_id: targetNativeSessionId || activeTaskSession?.nativeSessionId || targetReceipt?.native_session_id || undefined,
            agent_type: activeTaskSession?.agentType || activeRuntime || undefined,
            execution_id: laneExecutionId || undefined,
            receipt: targetReceipt || undefined,
            fileChanges: targetFileChanges,
            workEvents: targetWorkEvents,
            runtimeToolSync: compactRuntimeToolAudit(runtimeToolContext.audit),
            providerToolAccessEvidence: targetProviderToolAccessEvidence || undefined,
            provider_tool_access_evidence: targetProviderToolAccessEvidence || undefined,
            invokedSkills: targetInvokedSkills,
            testAgentHandoff: testAgentHandoffPayload || undefined,
            test_agent_handoff: testAgentHandoffPayload || undefined,
            testAgentExecutionPlan: testAgentExecutionPlan || undefined,
            test_agent_execution_plan: testAgentExecutionPlan || undefined,
            testAgentPlanDispatch: testAgentPlanDispatch ? {
                cliPath: testAgentPlanDispatch.cliPath,
                handoffPath: testAgentPlanDispatch.handoffPath,
                exitCode: testAgentPlanDispatch.exitCode,
                signal: testAgentPlanDispatch.signal,
                stderrReference: testAgentPlanDispatch.stderrReference,
                stdoutReference: testAgentPlanDispatch.stdoutReference,
            } : undefined,
            test_agent_plan_dispatch: testAgentPlanDispatch ? {
                cliPath: testAgentPlanDispatch.cliPath,
                handoffPath: testAgentPlanDispatch.handoffPath,
                exitCode: testAgentPlanDispatch.exitCode,
                signal: testAgentPlanDispatch.signal,
                stderrReference: testAgentPlanDispatch.stderrReference,
                stdoutReference: testAgentPlanDispatch.stdoutReference,
            } : undefined,
            testAgentReport: testAgentNativeReport || undefined,
            test_agent_report: testAgentNativeReport || undefined,
            testAgentCliDispatch: testAgentCliDispatch ? {
                cliPath: testAgentCliDispatch.cliPath,
                handoffPath: testAgentCliDispatch.handoffPath,
                exitCode: testAgentCliDispatch.exitCode,
                signal: testAgentCliDispatch.signal,
                stderrReference: testAgentCliDispatch.stderrReference,
                stdoutReference: testAgentCliDispatch.stdoutReference,
            } : undefined,
            test_agent_cli_dispatch: testAgentCliDispatch ? {
                cliPath: testAgentCliDispatch.cliPath,
                handoffPath: testAgentCliDispatch.handoffPath,
                exitCode: testAgentCliDispatch.exitCode,
                signal: testAgentCliDispatch.signal,
                stderrReference: testAgentCliDispatch.stderrReference,
                stdoutReference: testAgentCliDispatch.stdoutReference,
            } : undefined,
        });
        const qaResult = await handleAgentQaRequests({
            groupId,
            group,
            sourceProject: targetName,
            sourceOutput: tOutput,
            originalPrompt: tPrompt,
            sourceWorkDir: tWorkDir,
            sourceAgentType: tAgentType,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            configs,
            ctx,
            streamRes,
            taskId,
            sourceTaskAgentSessionId: activeTaskSession?.id || targetReceipt?.task_agent_session_id || "",
            sourceNativeSessionId: targetNativeSessionId || activeTaskSession?.nativeSessionId || targetReceipt?.native_session_id || "",
            qaDepth: depth,
        });
        if (qaResult.outputs.length)
            outputs.push(...qaResult.outputs);
        const downstreamOutput = qaResult.resumedOutput || tOutput;
        const assignmentStatus = getReceiptAssignmentStatus(downstreamOutput, extractAgentReceipt(downstreamOutput, targetName) || targetReceipt);
        emitAssignmentStatus(streamRes, groupId, planMessageId, targetName, assignmentStatus.status, assignmentStatus.text);
        const nestedMentions = extractActionableMentions(downstreamOutput, group, targetName);
        if (nestedMentions.length > 0) {
            const newMentions = nestedMentions.filter(m => m.targetName !== targetName);
            if (newMentions.length > 0) {
                const nestedOutputs = await processCrossAgents(groupId, group, targetName, downstreamOutput, newMentions, configs, ctx, streamRes, depth + 1, seenMentions, "parallel", "", taskId, deps);
                outputs.push(...nestedOutputs);
            }
        }
    }
    catch (error) {
        return handleExecuteMentionJobCatch(error, { outputs, targetName, groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, addTaskLog, updateGroupMemory, appendGroupMessage, emitAssignmentStatus });
    }
    return outputs;
}
// behavior-freeze alias bridges (原族内别名导入/转发)
const executeMentionJobImpl = executeMentionJob;
//# sourceMappingURL=collaboration-cross-agents.js.map