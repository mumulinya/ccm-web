// Behavior-freeze facade — implementation split into focused modules.
import * as path from "path";
import * as crypto from "crypto";
import {
  getMentionTargetName,
  rememberMentionOutputs,
  getBlockingDependency,
  skipMentionDueToDependency,
} from "./collaboration-cross-agents-helpers";
import { executeMentionJob as executeMentionJobImpl, type CrossAgentEnv } from "./collaboration-cross-agents-part-01";

type CollabCtx = any;

export async function processCrossAgents(
  groupId: string,
  group: any,
  sourceProject: string,
  output: string,
  atMentions: any[],
  configs: any[],
  ctx: CollabCtx,
  streamRes: any = null,
  depth = 0,
  seenMentions = new Set<string>(),
  executionOrder = "parallel",
  planMessageId = "",
  taskId = "",
  deps: any
): Promise<string[]> {
  const {
    addGroupLog, addTaskLog, admitChildTypedMemoryDelivery, appendAgentQaTrace,
    appendGroupMessage, appendTaskTimelineEvent, attachExecutionWorkspace, attachInvokedSkillsToReceipt,
    attachMemoryContextConsumptionChallenge, attachTaskAgentFinalDispatchPayloadGate, bindTaskAgentInvocationContext, bindTaskAgentInvocationMemoryDelivery,
    bindTaskAgentInvocationRunnerRequest, bindTaskAgentMemoryContextSnapshot, buildAckPreflightReview, buildAgentMemoryContextBundleWithManifestSelection,
    buildAgentMemoryPacket, buildAgentQaProtocolInstructions, buildAgentToolContext, buildChildAgentDevelopmentContract,
    buildChildAgentTaskText, buildChildAgentWorkerHandoff, buildChildAgentWorktreeNotice, buildCollaborationConflictPlan,
    orderMentionsForConflictPlan,
    buildCoordinatorCollaborationInstructions, buildCoordinatorReworkContinuationFallback, buildCoordinatorSharedFilesContext, buildFinalWorkerDispatchPayloadGate,
    buildGroupContextPacket, buildMemberCollaborationInstructions, buildNativeTestAgentPlanBlockedReceipt, buildNativeTestAgentReceipt,
    buildNativeTestAgentReviewSummary, buildNativeTestAgentRuntimeToolContext, buildPostReviewSpotCheckSummary, buildProjectExecutionBrief,
    buildProjectVerificationHints, buildRuntimeRecoveryCandidates, buildRuntimeRecoveryPrompt, buildTaskPreflightReasoning,
    buildTaskProviderSwitchRequests, buildWorkerContinuationHandoff, buildWorkflowMeta, checkTaskFailure,
    claimTaskWorkItemForAgent, commitChildTypedMemoryDelivery, commitTaskAgentSessionCapacityRevalidation, compactMemoryText,
    compactRuntimeToolAudit, completeTaskAgentInvocationEdge, coordinatorReworkRouteNeedsFreshVerifier, coordinatorReworkRouteRequiresStop,
    coordinatorReworkRouteUsesVerifier, createChildTypedMemoryDispatchWal, createExecutionCheckpoint, createMemoryContextConsumptionChallenge,
    dispatchTaskAgentInvocationEdge, emitAssignmentStatus, ensureExecution, escapeRegExp,
    evaluateAdvisoryPermissionBoundary, evaluateGreenContract, extractActionableMentions, extractAgentReceipt,
    extractRunnerVerificationEvidence, formatCollectedAgentOutput, formatNativeTestAgentOutput, formatNativeTestAgentPlanBlockedOutput,
    getAgentDependencyStateFromOutputs, getChildAgentIsolationMode, getCoordinatorActionMentions, getCoordinatorMember,
    getInitialWorkflowMeta, getMentionReworkRoute, getProjectAgentCapabilityProfile, getProjectExtraConfig,
    getReceiptAssignmentStatus, getRoutableMembers, getTaskAgentSessionOptions, getTaskById,
    getTestAgentHandoffPayload, getTestAgentHandoffProjectWorkDir, getTestAgentHandoffReviewSubject, getTestAgentHandoffWarnings,
    getWorkDirState, handleAgentQaRequests, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, isCoordinatorTestAgentName,
    isProviderPromptTooLongFailure, loadExecution, markChildTypedMemoryDispatchCommitted, markChildTypedMemoryDispatchStarted,
    markChildTypedMemoryRunnerReturned, memoryContextConsumptionReceiptFile, normalizeAgentRuntimeId, normalizeMentionTask,
    normalizePlanAssignments, openTaskAgentSession, prepareAgentRuntimeTools, prepareChildAgentWorkDir,
    prepareTaskAgentInvocationEdge, prepareTaskAgentSessionCapacityRevalidation, recordAgentRuntimeLifecycle, recordReplayRepairTimelineBindingsForMention,
    recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, recordTaskAgentMemoryContextDelivery, recordTaskAgentSessionTurn, recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
    recordWorkerContextProviderSwitchSessionBindingForCoordinator, recoverFinalWorkerDispatchPayload, renderGroupPostCompactDynamicContextDelta, renderGroupPostCompactInvokedSkillAttachments,
    renderGroupPostCompactPlanAttachment, renderMemoryContextForWorker, resolveMemberRuntime, runGroupOrchestrator,
    runMainAgentPostReviewSpotCheck, runTestAgentCliJob, runtimeToolDispatchBlockedMessage, runtimeToolDispatchBlockedReceipt,
    runtimeToolSnapshotFromAudit, shouldSwitchRuntime, stopWrongDirectionWorkerForCoordinatorRoute, stripAgentQaProtocolBlocks,
    summarizeNativeTestAgentExecutionPlan, summarizeReplayRepairTimelineBindingsForEvent, summarizeTaskAgentMemoryContextSnapshot, summarizeWorkerHandoffForUser,
    taskAgentInvocationMemoryOptions, taskAgentSessionLifecycleRunnerOptions, taskRequiresCodeChanges, taskRequiresVerification,
    transitionExecution, uniqueStrings, updateGroupMemory, updateGroupTaskInlineStatus,
    updateTask, updateTaskWorkItemFromReceipt, validateTestAgentHandoffRegisteredWorkDirs, verifyFinalWorkerDispatchPayloadGate,
    writeSse
  } = deps;
  const collectedOutputs: string[] = [];
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

  const conflictInputs = uniqueMentions.map((mention: any, index: number) => {
    const project = getMentionTargetName(mention);
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
  uniqueMentions = uniqueMentions.map((mention: any, index: number) => {
    const lane = conflictPlan.lanes[index];
    const base = typeof mention === "string"
      ? { mention, targetName: getMentionTargetName(mention), message: output, structured: false }
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
    const writeVerify = (conflictPlan.conflicts || []).some((item: any) => item.writeVerifyOverlap);
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
  const completedOutputsByAgent = new Map<string, string[]>();
  const dependencyStates = new Map<string, any>();
  const rememberMentionOutputsFn = (mention: any, outputs: string[]) => rememberMentionOutputs(mention, outputs, completedOutputsByAgent, dependencyStates, getAgentDependencyStateFromOutputs);
  const getBlockingDependencyFn = (mention: any) => getBlockingDependency(mention, uniqueMentions, dependencyStates);
  const skipMentionDueToDependencyFn = (mention: any, dependency: any) => skipMentionDueToDependency(mention, dependency, { groupId, planMessageId, taskId, streamRes, formatCollectedAgentOutput, updateTaskWorkItemFromReceipt, emitAssignmentStatus, addTaskLog, updateGroupMemory, appendGroupMessage, writeSse });
  const crossEnv: CrossAgentEnv = { deps, groupId, group, sourceProject, output, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId, sourceTask, completedOutputsByAgent, processCrossAgents };
  const executeMentionJob = (mention: any) => executeMentionJobImpl(mention, crossEnv);
  const hasExplicitDependencies = uniqueMentions.some((mention: any) => typeof mention !== "string" && String(mention.dependsOn || "").trim());

  if (hasExplicitDependencies) {
    const pending = [...uniqueMentions];
    const completed = new Set<string>();
    let guard = 0;
    while (pending.length > 0 && guard < 20) {
      guard++;
      const readyIndex = pending.findIndex((mention: any) => {
        if (typeof mention === "string") return true;
        const dependsOn = String(mention.dependsOn || "").trim();
        const dependencyInBatch = uniqueMentions.some((item: any) => getMentionTargetName(item) === dependsOn);
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
      completed.add(getMentionTargetName(mention));
    }
  } else if (conflictPlan.effectiveOrder === "sequential" || conflictPlan.effectiveOrder === "backend_first") {
    const backendMentions: any[] = [];
    const frontendMentions: any[] = [];
    const otherMentions: any[] = [];

    for (const mention of uniqueMentions) {
      const targetName = getMentionTargetName(mention);
      const targetMember = group.members.find((m: any) => m.project === targetName);
      const kind = targetMember ? (/cloud|api|server|backend|service|后端/i.test(targetName) ? "backend" : /app|web|front|frontend|前端/i.test(targetName) ? "frontend" : "other") : "other";
      if (kind === "backend") backendMentions.push(mention);
      else if (kind === "frontend") frontendMentions.push(mention);
      else otherMentions.push(mention);
    }

    for (const mention of backendMentions) {
      const outputs = await executeMentionJob(mention);
      collectedOutputs.push(...outputs);
      rememberMentionOutputsFn(mention, outputs);
    }
    for (const mention of frontendMentions) {
      const failedBackend = backendMentions
        .map((item: any) => ({ name: getMentionTargetName(item), state: dependencyStates.get(getMentionTargetName(item)) }))
        .find((item: any) => item.name && item.state && !item.state.ok);
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
  } else {
    const settledOutputs = await Promise.all(uniqueMentions.map(mention => executeMentionJob(mention)));
    settledOutputs.forEach((outputs, index) => {
      collectedOutputs.push(...outputs);
      rememberMentionOutputsFn(uniqueMentions[index], outputs);
    });
  }
  return collectedOutputs;
}
