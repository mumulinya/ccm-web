// Behavior-freeze split from collaboration-routes.ts (part 4/4).
// Extracted functional module. The original entry remains a compatibility facade.

import * as fs from "fs";

import * as path from "path";

import * as crypto from "crypto";

import { spawnSync } from "child_process";

import * as os from "os";

import {
  sendJson,
  calculateTokensAndCost,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  UPLOAD_DIR,
  SHARED_DIR,
  CCM_DIR,
} from "../../core/utils";

import { decomposeRequirementToTaskPlan, ingestRequirementSources, requirementToIntakeDraft } from "../requirements/source-ingestion";
import { runRequirementEpicSelfTest } from "../requirements/requirement-epic-self-tests";
import { startGlobalMissionSupervisor } from "../../agents/global/mission-supervisor";

import {
  loadCronJobs,
  saveCronJobs,
  loadTasks,
  saveTasks,
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  AGENTS
} from "../../core/db";

import { buildSelectedSkillUsageDirective, selectRoleSkills } from "../../skills/role-skills";

import {
  buildCodedCoordinatorSummary,
  buildCoordinatorCollaborationInstructions,
  buildMemberCollaborationInstructions,
  decomposeRequirementWithCodedCoordinator,
  getCoordinatorMember,
  getRoutableMembers,
  loadOrchestratorConfig,
  normalizeGroupOrchestrator,
  publicOrchestratorConfig,
  resolveMemberRuntime,
  runCodedGroupOrchestrator,
  runCoordinatorProtocolSelfTest,
  runGroupOrchestrator,
  runLlmCoordinatorReview,
  runLlmCoordinatorSummary,
  sanitizeCoordinatorUserText,
  saveOrchestratorConfig,
  selectGroupTargets,
  recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
  recordWorkerContextProviderSwitchSessionBindingForCoordinator,
  recordReplayRepairDispatchBriefTimelineBinding,
} from "./group-orchestrator";

import { buildMainAgentDisplayStream, sanitizeMainAgentUserText } from "./display";

import {
  buildProjectCodeReadOnlySnapshot as buildProjectCodeReadOnlySnapshotBase,
  buildGroupProjectAnalysisContext as buildGroupProjectAnalysisContextBase,
} from "./project-analysis";

import {
  appendWorkerLedger,
  buildAgentMemoryContextBundle,
  buildAgentMemoryContextBundleWithManifestSelection,
  buildAgentMemoryPacket,
  buildGroupContextPacket,
  buildGroupMemoryContext,
  admitChildTypedMemoryDelivery,
  commitChildTypedMemoryDelivery,
  createChildTypedMemoryDispatchWal,
  compactMemoryText,
  compactPreserveLines,
  createEmptyGroupMemory,
  deleteGroupSessionMemoryArtifacts,
  findLatestWorkerLedger,
  getGroupMemoryFile,
  getGroupSessionMemoryScopeId,
  loadGroupMemory,
  markChildTypedMemoryDispatchCommitted,
  markChildTypedMemoryDispatchStarted,
  markChildTypedMemoryRunnerReturned,
  recordGroupApiMicrocompactNativeApplyProofLedger,
  recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger,
  recordGroupPostCompactCandidateUsageLedger,
  renderGroupPostCompactInvokedSkillAttachments,
  renderGroupPostCompactPlanAttachment,
  renderGroupPostCompactDynamicContextDelta,
  saveGroupMemory,
  uniqueByKey,
  updateGroupMemory,
} from "./memory";

import {
  configureGroupSessionMemoryModelExecutor,
} from "./group-session-memory-model-extraction";

import {
  configureGroupTypedMemoryManifestSelector,
  recordGroupTypedMemoryManifestSelectorConsumptionOutcomes,
  recordGroupTypedMemoryConsumptionLedger,
  recordGroupTypedMemoryStaleCandidates,
  readGroupTypedMemoryPressureRecallUsageLedger,
  recordGroupTypedMemoryPressureRecallUsageLedger,
} from "./group-memory-index";

import {
  sendFeishuReportMessage,
} from "./feishu";

import { hasFeishuTaskBinding } from "./feishu-channel";

import { handleFeishuRoutes } from "./feishu-routes";

import { handleAgentQaRoutes } from "./agent-qa-routes";

import { GROUP_COORDINATION_MCP_SERVER_NAME } from "../../integrations/group-coordination-mcp";

import { buildTaskBoundInternalMcpServers } from "../../integrations/agent-internal-mcp";
import {
  attachMemoryContextConsumptionChallenge,
  createMemoryContextConsumptionChallenge,
  memoryContextConsumptionReceiptFile,
} from "../../integrations/memory-context-consumption-receipt";

import {
  claimSubmittedGroupCoordinationRequests,
  listGroupCoordinationRequests,
  submitGroupCoordinationRequest,
  updateGroupCoordinationRequest,
} from "./group-coordination-store";

import { handleGroupLiveRoutes } from "./group-live-routes";

import {
  AGENT_QA_TIMEOUT_MS,
  appendAgentQaTrace,
  buildAgentQaMessage,
  buildAgentQaUserPreview,
  configureAgentQaService,
  emitAgentQaEvent,
  getAgentQaItemsForGroup,
  loadAgentQaItems,
  markExpiredAgentQaItems,
  setAgentQaArbitration,
  setAgentQaManualTakeover,
  upsertAgentQaItem,
  writeAcceptedAgentQaToProjectMemory,
} from "./agent-qa-service";

import {
  buildTaskDeliveryReport,
  buildTaskGroupReportMessage,
  buildUserDeliveryReport,
} from "./task-delivery-report";

import { buildTestAgentVerdict } from "../../test-agent/verdict";

import type { TestAgentReport, TestAgentVerdict } from "../../test-agent/types";

import {
  compactTestAgentBrowserAuthenticationSummary,
  summarizeTestAgentAdversarialEvidence,
  summarizeTestAgentBrowserActionEffects,
  summarizeTestAgentBrowserAuthentication,
  summarizeTestAgentBrowserFlows,
  summarizeTestAgentBrowserRecovery,
  summarizeTestAgentMultiSessionBrowser,
} from "../../agents/test-agent-review-bridge";

import {
  buildPostReviewSpotCheckGate,
  buildPostReviewSpotCheckSummary,
  runMainAgentPostReviewSpotCheck,
  runPostReviewSpotCheckContractSelfTest,
} from "../../agents/post-review-spot-check";

import {
  checkTaskCompletion,
  checkTaskFailure,
  extractAgentReceipt,
  extractRunnerVerificationEvidence,
  getReceiptAssignmentStatus,
} from "./agent-receipts";

import {
  extractTaskNotificationTag,
  formatCollectedAgentOutput,
  getCollectedOutputAgent,
  getCollectedOutputReceiptStatus,
  parseTaskNotificationsFromText,
  runTaskNotificationDisplaySelfTest,
} from "./agent-notifications";

import {
  getGlobalMissionChildDeliveryEvidence as getGlobalMissionChildDeliveryEvidenceBase,
  globalMissionChildGatePassed as globalMissionChildGatePassedBase,
  refreshGlobalMissionParentInTaskList as refreshGlobalMissionParentInTaskListBase,
} from "./global-mission";

import {
  addGroupLog,
  addTaskLog,
  appendTaskTimelineEvent,
  clearTaskLogs,
  getTaskLogs,
  getTaskTimeline,
  safeAddGroupLog,
} from "./logs";

import { handleBasicGroupRoutes } from "./group-routes";

import { handleOrchestratorRoutes } from "./orchestrator-routes";

import { handleTaskGovernanceRoutes } from "./task-governance-routes";

import {
  buildStartupTaskRecoveryPlan,
  runStartupTaskRecoveryDecisionSelfTest,
} from "./startup-task-recovery";

import {
  cancelTestAgentRunsForTask,
  purgeTestAgentRunnerRecordsForTask,
  reconcileTestAgentRunnerRecords,
  runTestAgentCliJob,
  runTestAgentRunnerSelfTest,
} from "./test-agent-runner";

import { purgeTestAgentArtifactsForTask } from "../../test-agent/artifact-retention";

import {
  buildCompleteTaskReplay,
  buildTaskReplayIndex,
  resolveTaskReplayArtifact,
  runTaskReplayContractSelfTest,
} from "./task-replay";

import {
  appendGroupMessage,
  findGroupChatSessionContainingMessage,
  getGroupMessages,
  loadGroups,
  resolveWritableGroupChatSession,
  saveGroupMessages,
  saveGroups,
} from "./storage";

import {
  buildDailyDevTaskDescription,
  claimReadyDailyDevBacklog,
  configureDailyDevBacklogRuntime,
  dispatchDailyDevBacklog,
  dispatchReadyDailyDevBacklogs,
  ensureDailyDevAutopilotCronJobs,
  evaluateDailyDevIntakeQuality,
  importSharedDocsToDailyDevBacklog,
  isDailyDevBacklogFile,
  listDailyDevBacklogs,
  markDailyDevBacklogStatus,
  persistDailyDevBacklogFile,
  readDailyDevBacklogStatus,
  runDailyDevAutopilotOnce,
} from "./daily-dev-backlog";

import { getAgentCommandLabel, getPublicAgentRuntimes, normalizeAgentRuntimeId } from "../../agents/runtime";

import { buildRuntimeToolDispatchGate, buildRuntimeToolSyncPrompt, detectInvokedSkillsFromText, recordRuntimeToolSyncAudit, syncRuntimeTools } from "../../tools/runtime-tool-sync";

import { buildAuthorizationReadiness, buildToolAuthorizationPayload, normalizeToolAuthorization } from "../../tools/tool-authorization";

import {
  buildChildAgentWorktreeNotice,
  normalizeChildAgentIsolationMode,
  prepareChildAgentWorkDir,
} from "../../agents/worktree";

import {
  attachExecutionWorkspace,
  cancelActiveAgentRun,
  classifyExecutionFailure,
  cleanupExecutionWorktree,
  clearTaskCancellation,
  createExecutionCheckpoint,
  ensureExecution,
  evaluateGreenContract,
  inspectBranchFreshness,
  isTaskCancellationRequested,
  listExecutions,
  loadExecution,
  mergeExecutionWorktree,
  purgeTaskExecutionArtifacts,
  requestTaskCancellation,
  rollbackExecutionCheckpoint,
  runExecutionKernelSelfTest,
  transitionExecution,
} from "../../agents/execution-kernel";

import {
  attachTaskAgentFinalDispatchPayloadGate,
  commitTaskAgentSessionCapacityRevalidation,
  bindTaskAgentMemoryContextSnapshot,
  closeTaskAgentSessions,
  getTaskAgentSessionOptions,
  getTaskAgentSessionContinuity,
  inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker,
  listTaskAgentMemoryContextSnapshots,
  listTaskAgentSessions,
  openTaskAgentSession,
  prepareTaskAgentSessionCapacityRevalidation,
  purgeTaskAgentSessions,
  recordTaskAgentMemoryContextDelivery,
  recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome,
  recordTaskAgentSessionTurn,
  reopenTaskAgentSessions,
} from "../../tasks/agent-sessions";

import {
  bindTaskAgentInvocationContext,
  bindTaskAgentInvocationMemoryDelivery,
  bindTaskAgentInvocationRunnerRequest,
  completeTaskAgentInvocationEdge,
  dispatchTaskAgentInvocationEdge,
  prepareTaskAgentInvocationEdge,
} from "../../tasks/task-agent-invocation-lineage";

import {
  buildCollaborationConflictPlan,
  buildRuntimeRecoveryCandidates,
  buildRuntimeRecoveryPrompt,
  isRuntimeCommandAvailable,
  runCollaborationResilienceSelfTest,
  shouldSwitchRuntime,
} from "./collaboration-resilience";

import {
  acquireIdempotency,
  acquireTaskLease,
  appendTraceEvent,
  completeIdempotency,
  createTraceId,
  ensureTraceId,
  failIdempotency,
  getTrace,
  listTraces,
  releaseTaskLease,
  renewTaskLease,
  runReliabilityLedgerSelfTest,
  settleIdempotencyByTrace,
} from "../../system/reliability-ledger";

import { getReliabilityDrillStatus, runScheduledProductionReliabilityDrill } from "../../system/reliability-drills";

import { getSoakReport, getSoakTestStatus, inspectReliabilityDebt, reconcileStabilityDebt, runSoakTestSelfTest, sampleSoakTestNow, startSoakTest, stopSoakTest } from "../../system/soak-test";

import { getProcessLifecycleSnapshot, registerRestartIntent, runProcessLifecycleSelfTest } from "../../system/process-lifecycle";

import { purgeTaskReplayJournalForTask } from "../../system/task-replay-journal";

import {
  buildTaskReasoningState,
  captureReasoningFacts,
  createAgentReasoningState,
  explainReasoningDecision,
  normalizeAgentReasoningState,
  recordReasoningDeviation,
  recordReasoningRecoveryCheck,
  setReasoningAssertion,
  updateReasoningPlan,
} from "../../agents/reasoning-loop";

import { buildProjectExecutionBrief, buildProjectMemoryPacket, recordAcceptedProjectDeliveryMemory } from "../../projects/memory";

import { recordGlobalDirectDispatchMemory, recordGlobalDirectDispatchRollbackMemory } from "../../agents/global/memory";

import { createDispatchRecord, normalizeDispatchBatch } from "./dispatch-records";

import {
  buildCollaborationQuestionContract,
  evaluateAdvisoryPermissionBoundary,
  evaluateCollaborationAnswer,
  evaluateCollaborationQuestionAdmission,
  runAgentCollaborationProtocolSelfTest,
  selectCollaborationTarget,
} from "../../agents/collaboration-protocol";

import {
  buildAckPreflightReview,
  buildContractTransferPlan,
  evaluateContractInjectionGate,
  extractContractSyncHints,
  getTaskAckRewriteRows,
  getTaskContractInjectionRows,
} from "./protocol-gates";

import {
  buildContractInjectionEvent,
  buildTraceReplaySuite,
  recordAgentRuntimeLifecycle,
  replayAgentTrace,
  runAgentRuntimeKernelSelfTest,
} from "../../agents/runtime-kernel";

import {
  buildSelfContainedWorkerHandoff,
  renderSelfContainedWorkerHandoff,
  runWorkerHandoffSelfTest,
  summarizeWorkerHandoffForUser,
} from "../../agents/worker-handoff";

import {
  buildFinalWorkerDispatchPayloadGate,
  verifyFinalWorkerDispatchPayloadGate,
} from "../../agents/final-dispatch-payload-gate";

import {
  isProviderPromptTooLongFailure,
  recoverFinalWorkerDispatchPayload,
} from "../../agents/final-dispatch-reactive-compact";

import {
  buildMainAgentWorkItems,
  buildMainAgentWorkItemClaimSummary,
  buildMainAgentWorkItemSummary,
  buildMainAgentWorkItemUnlockSummary,
  claimMainAgentWorkItem,
  normalizeMainAgentWorkItemStatus,
  requeueStaleMainAgentWorkItems,
  runMainAgentWorkItemSelfTest,
  updateMainAgentWorkItem,
} from "../../agents/work-items";

import {
  CollabCtx,
  TASK_WATCHDOG_STALE_MS,
  appendLegacyCodeReviewGroupReport,
  appendLegacyTaskExecutionGroupReport,
  appendMainAgentDecisionTrace,
  applyMainAgentDecisionPetState,
  applyRuntimeMonitorControl,
  archiveTask,
  assertRuntimeToolDispatchReady,
  buildAcceptedPlanModeDraft,
  buildAgentQaProtocolInstructions,
  buildAgentToolContext,
  buildChildAgentDevelopmentContract,
  buildChildAgentTaskText,
  buildChildAgentWorkerHandoff,
  buildCoordinatorSharedFilesContext,
  buildDailyDevAgentDiagnostics,
  buildDailyDevWorkflowRehearsal,
  buildDeliverySummary,
  buildExecutionDashboard,
  buildGroupPlanModePreflight,
  buildGroupProjectAnalysisContext,
  buildInlineTaskRuntime,
  buildProjectVerificationHints,
  buildRevisedPlanModeDraft,
  buildTargetedReworkContinuationDraft,
  buildTaskEntityChain,
  buildTaskGapContinuationDraft,
  buildWorkerContinuationHandoff,
  buildWorkflowMeta,
  claimTaskWorkItemForAgent,
  classifyGroupProjectTaskIntentWithAgent,
  classifyTaskContinuation,
  cleanupRuntimeDebt,
  compactFormText,
  continueTaskWithMessage,
  createDailyDevSmokeTask,
  createRequirementEpicWithChildren,
  createTask,
  enqueueTask,
  extractActionableMentions,
  getCoordinatorActionMentions,
  getDailyDevSmokeStatus,
  getGroupMainAgentActionRegistry,
  getInitialWorkflowMeta,
  getProjectExtraConfig,
  getQueueStatus,
  getTaskById,
  getTaskExecutionFromReceipt,
  getTaskPlanMode,
  getTaskWatchdogStatus,
  getTaskWorkItems,
  handleAgentQaRequests,
  looksLikeTaskContinuation,
  normalizePlanAssignments,
  persistTaskWorkItems,
  prepareAgentRuntimeTools,
  processCrossAgents,
  purgeArchivedTask,
  reconcileTaskDeliveryEvidence,
  removeTaskFromQueues,
  restoreArchivedTask,
  resumeAgentQaFromStoredContinuation,
  resumeTaskQueues,
  retryAgentQaItem,
  retryRuntimeFailedTasks,
  retryTask,
  runAgentCliProbe,
  runAgentCliProbeBatch,
  runAgentRecoveryMonitorOnce,
  runCoordinatorReviewLoop,
  runGroupMainAgentActionRegistrySelfTest,
  runGroupMainAgentToolLoopSelfTest,
  runRuntimeFallbackProbe,
  runTaskWatchdog,
  runningTaskIds,
  runtimeToolDispatchBlockedReceipt,
  runtimeToolSnapshotFromAudit,
  shouldCreatePersistentGroupTask,
  shouldUseProjectAnalysisMode,
  splitUserAcceptanceText,
  switchTaskExecutor,
  taskAgentInvocationMemoryOptions,
  taskAgentSessionLifecycleRunnerOptions,
  taskQueues,
  uniqueStrings,
  updateGroupTaskInlineStatus,
  updateRequirementEpicFromPlan,
  updateTask,
  validateDailyDevGroupReady,
  validateTaskManualStatusUpdate,
  writeSse,
} from "./collaboration";

import { configureCollaborationRouteExecutors } from "./collaboration-routes-part-01";
import { handleCollaborationApiReplayAndExecutionRoutes } from "./collaboration-routes-part-01";
import { handleCollaborationApiIntakeRoutes } from "./collaboration-routes-part-02";
import { handleCollaborationApiTaskLifecycleRoutes } from "./collaboration-routes-part-03";

export function handleCollaborationApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  configureCollaborationRouteExecutors(ctx);
  if (handleCollaborationApiReplayAndExecutionRoutes(pathname, req, res, parsed, ctx)) return true;
  if (handleCollaborationApiIntakeRoutes(pathname, req, res, parsed, ctx)) return true;
  if (handleCollaborationApiTaskLifecycleRoutes(pathname, req, res, parsed, ctx)) return true;
  if (handleTaskGovernanceRoutes(req, res, parsed, ctx, {
    compactFormText,
    uniqueStrings,
    archiveTask,
    restoreArchivedTask,
    purgeArchivedTask,
    removeTaskFromQueues,
    updateTask,
    enqueueTask,
    retryTask,
    retryRuntimeFailedTasks,
    getQueueStatus,
    getTaskWatchdogStatus,
    runTaskWatchdog,
    cleanupRuntimeDebt,
    resumeTaskQueues,
    clearTaskQueues: () => taskQueues.clear(),
    taskWatchdogStaleMs: TASK_WATCHDOG_STALE_MS,
  })) return true;

  // === 群聊主 Agent / Orchestrator API ===
  if (handleOrchestratorRoutes(req, res, parsed, ctx, {
    buildCoordinatorSharedFilesContext,
    runGroupOrchestrator,
    buildDailyDevAgentDiagnostics,
    replayAgentTrace,
    buildTraceReplaySuite,
    runAgentRuntimeKernelSelfTest,
    runWorkerHandoffSelfTest,
    runGroupMainAgentActionRegistrySelfTest,
    runGroupMainAgentToolLoopSelfTest,
    getGroupMainAgentActionRegistry,
    applyRuntimeMonitorControl,
    buildDailyDevWorkflowRehearsal,
    createDailyDevSmokeTask,
    getDailyDevSmokeStatus,
    runAgentCliProbeBatch,
    runAgentCliProbe,
    switchTaskExecutor,
    runRuntimeFallbackProbe,
    runAgentRecoveryMonitorOnce,
  })) return true;

  if (handleBasicGroupRoutes(req, res, parsed, ctx, {
    getGroupMemoryFile,
    loadGroupMemory,
    saveGroupMemory,
    buildGroupMemoryContext,
    buildAgentMemoryPacket,
    buildInlineTaskRuntime,
    getAgentQaItemsForGroup,
    deleteGroupSessionMemoryArtifacts,
  })) return true;

  // === Agent 间问答 API ===
  if (handleAgentQaRoutes(req, res, parsed, ctx, {
    getAgentQaItemsForGroup,
    runAgentCollaborationProtocolSelfTest,
    setAgentQaArbitration,
    resumeAgentQaFromStoredContinuation,
    setAgentQaManualTakeover,
    retryAgentQaItem,
    listGroupCoordinationRequests,
  })) return true;

  if (handleGroupLiveRoutes(req, res, parsed, ctx, {
    writeSse,
    ensureTraceId,
    classifyGroupProjectTaskIntentWithAgent,
    shouldCreatePersistentGroupTask,
    shouldUseProjectAnalysisMode,
    classifyTaskContinuation,
    looksLikeTaskContinuation,
    continueTaskWithMessage,
    appendMainAgentDecisionTrace,
    applyMainAgentDecisionPetState,
    validateDailyDevGroupReady,
    compactMemoryText,
    buildGroupPlanModePreflight,
    createTask,
    updateTask,
    appendTaskTimelineEvent,
    buildWorkflowMeta,
    buildInlineTaskRuntime,
    updateGroupMemory,
    enqueueTask,
    buildCoordinatorSharedFilesContext,
    buildGroupProjectAnalysisContext,
    normalizePlanAssignments,
    getInitialWorkflowMeta,
    getCoordinatorActionMentions,
    processCrossAgents,
    runCoordinatorReviewLoop,
    buildGroupContextPacket,
    buildAgentToolContext,
    prepareAgentRuntimeTools,
    getProjectExtraConfig,
    buildAgentMemoryContextBundle,
    buildAgentMemoryContextBundleWithManifestSelection,
    buildAgentMemoryPacket,
    buildChildAgentDevelopmentContract,
    buildProjectVerificationHints,
    buildAgentQaProtocolInstructions,
    getAgentQaItemsForGroup,
    handleAgentQaRequests,
    runtimeToolSnapshotFromAudit,
    extractActionableMentions,
    extractAgentReceipt,
  })) return true;


  if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { task_id, group_id } = JSON.parse(body);
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === task_id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);

        const configs = getConfigs();
        const config = configs.find(c => c.name === task.target_project);
        if (!config) return sendJson(res, { error: "项目配置不存在" }, 400);

        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";

        updateTask(task_id, { status: "in_progress" });

        const autoAssignGroupId = String(group_id || task.group_id || "");
        const group = autoAssignGroupId ? loadGroups().find(g => g.id === autoAssignGroupId) : null;
        const toolContext = buildAgentToolContext(ctx, group, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`);
        let runtimeToolContext = prepareAgentRuntimeTools(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, { taskId: task.id, task, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness });
        if (runtimeToolContext.dispatchBlocked) {
          const blockedReceipt = runtimeToolDispatchBlockedReceipt(task.target_project, runtimeToolContext);
          updateTask(task_id, { status: "blocked", status_detail: blockedReceipt.summary });
          addTaskLog(task_id, "warning", blockedReceipt.summary);
          appendTaskTimelineEvent(task_id, { type: "runtime_tool_dispatch_blocked", title: `${task.target_project} 工具授权派发被阻断`, detail: blockedReceipt.summary, status: "warn", phase: "dispatching", agent: task.target_project, data: { runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate } });
          return sendJson(res, { success: false, error: blockedReceipt.summary, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate }, 409);
        }
        const directTaskText = buildChildAgentTaskText(`${task.title}\n${task.description || ""}`, task);
        let autoAssignTaskSession = openTaskAgentSession({
          scopeId: task.id,
          taskId: task.id,
          groupId: autoAssignGroupId,
          project: task.target_project,
          agentType,
        });
        const autoAssignMemoryDeliveryAttemptSequence = autoAssignTaskSession ? autoAssignTaskSession.turnCount + 1 : 0;
        const autoAssignGroupSessionId = String(task.group_session_id || task.groupSessionId || "");
        let autoAssignInvocationEdge: any = autoAssignGroupId && autoAssignTaskSession && autoAssignGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
          groupId: autoAssignGroupId,
          groupSessionId: autoAssignGroupSessionId,
          taskId: task.id,
          targetProject: task.target_project,
          taskAgentSessionId: autoAssignTaskSession.id,
          nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
          executionId: task.id,
          attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
          providerAttempt: 1,
          invocationKind: autoAssignMemoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
          branchKind: "main",
        }) : null;
        let autoAssignGroupMemoryContext = autoAssignGroupId
          ? await buildAgentMemoryContextBundleWithManifestSelection(autoAssignGroupId, task.target_project, directTaskText, {
            taskId: task.id,
            traceId: task.trace_id || "",
            agentType,
            taskAgentSessionId: autoAssignTaskSession?.id || "",
            nativeSessionId: autoAssignTaskSession?.nativeSessionId || "",
            taskAgentSessionTurn: autoAssignMemoryDeliveryAttemptSequence,
            modelContextWindow: autoAssignTaskSession?.modelContextWindow || 0,
            groupSessionId: task.group_session_id || task.groupSessionId || "",
            requireExactGroupSession: true,
            task,
            ...taskAgentInvocationMemoryOptions(autoAssignInvocationEdge),
          })
          : null;
        const autoAssignCoordinatorProject = group ? String(getCoordinatorMember(group)?.project || "") : "";
        const autoAssignMemoryConsumptionChallenge = autoAssignGroupMemoryContext
          && autoAssignTaskSession
          && task.target_project !== autoAssignCoordinatorProject
          ? createMemoryContextConsumptionChallenge({
              groupId: autoAssignGroupId,
              groupSessionId: autoAssignGroupSessionId,
              taskId: task.id,
              executionId: task.id,
              project: task.target_project,
              taskAgentSessionId: autoAssignTaskSession.id,
              attempt: autoAssignMemoryDeliveryAttemptSequence,
            })
          : null;
        if (autoAssignMemoryConsumptionChallenge) {
          autoAssignGroupMemoryContext = attachMemoryContextConsumptionChallenge(autoAssignGroupMemoryContext, autoAssignMemoryConsumptionChallenge);
          runtimeToolContext = prepareAgentRuntimeTools(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, {
            taskId: task.id,
            task,
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
            groupSessionId: autoAssignGroupSessionId,
            taskAgentSessionId: autoAssignTaskSession.id,
            nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
            memoryReceiptChallenge: autoAssignMemoryConsumptionChallenge,
            memoryReceiptFile: memoryContextConsumptionReceiptFile(autoAssignMemoryConsumptionChallenge.challenge_id),
          });
          assertRuntimeToolDispatchReady(task.target_project, runtimeToolContext);
        }
        const autoAssignContinuation = buildWorkerContinuationHandoff(task, task.target_project);
        const autoAssignHandoff = buildChildAgentWorkerHandoff(task.target_project, directTaskText, {
          source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
          reason: task.mission_target?.reason || "",
          acceptance: task.acceptance_criteria || "",
          requires_code_changes: task.requires_code_changes,
          verification_hints: buildProjectVerificationHints(task.target_project, workDir),
          work_dir: workDir,
          agent_type: agentType,
          model: autoAssignTaskSession?.modelId || "",
          task_id: task.id,
          task_agent_session_id: autoAssignTaskSession?.id || "",
          trace_id: task.trace_id || "",
          task,
          group,
          worker_context_packet: task.mission_handoff?.worker_context_packet || null,
          dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
            ? task.mission_handoff.global_mission.depends_on.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" }))
            : [],
          analysis: {
            constraints: Array.isArray(task.mission_handoff?.done_criteria) ? task.mission_handoff.done_criteria : [],
          },
          memory: autoAssignGroupMemoryContext,
          continuation: autoAssignContinuation,
        });
        const autoAssignPendingCapacityGate = autoAssignTaskSession?.capacityDowngradeGate || null;
        const autoAssignCapacityRevalidationPreparation = autoAssignTaskSession
          ? prepareTaskAgentSessionCapacityRevalidation(autoAssignTaskSession.id, autoAssignHandoff.worker_context_packet)
          : null;
        if (autoAssignTaskSession?.capacityRevalidationRequired === true && autoAssignCapacityRevalidationPreparation?.prepared !== true) {
          throw new Error(`模型容量下降后的上下文重建未通过：${autoAssignCapacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated"}`);
        }
        if (autoAssignCapacityRevalidationPreparation?.session) autoAssignTaskSession = autoAssignCapacityRevalidationPreparation.session;
        let autoAssignCapacityRevalidationCommitted = autoAssignCapacityRevalidationPreparation?.required !== true;
        addTaskLog(task.id, "info", `${task.target_project} 自动派发工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
        appendTaskTimelineEvent(task.id, {
          type: "worker_handoff_ready",
          title: `${task.target_project} 工作单已补齐`,
          detail: "自动派发已补齐目标、范围、边界、验收、ACK 和回执要求",
          status: "ok",
          phase: "dispatching",
          agent: task.target_project,
          data: { worker_handoff: summarizeWorkerHandoffForUser(autoAssignHandoff), worker_context_packet: autoAssignHandoff.worker_context_packet },
        });
        recordAgentRuntimeLifecycle({
          scope: autoAssignGroupId ? "group" : "worker",
          traceId: task.trace_id || "",
          taskId: task.id,
          groupId: autoAssignGroupId,
          agent: "auto-assign",
          action: "dispatch_worker",
          phase: "handoff",
          risk: "agent",
          target: task.target_project,
          status: "planned",
          message: `${task.target_project} 自动派发自包含工作单已生成`,
          data: {
            worker_handoff: summarizeWorkerHandoffForUser(autoAssignHandoff),
            worker_context_packet: autoAssignHandoff.worker_context_packet,
            source: "auto-assign",
          },
        });
        const developmentContract = buildChildAgentDevelopmentContract(task.target_project, directTaskText, {
          source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
          reason: task.mission_target?.reason || "",
          acceptance: task.acceptance_criteria || "",
          requires_code_changes: task.requires_code_changes,
          verification_hints: buildProjectVerificationHints(task.target_project, workDir),
          work_dir: workDir,
          agent_type: agentType,
          task_id: task.id,
          trace_id: task.trace_id || "",
          task,
          group,
          worker_context_packet: task.mission_handoff?.worker_context_packet || null,
          dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
            ? task.mission_handoff.global_mission.depends_on.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" }))
            : [],
          memory: autoAssignGroupMemoryContext,
          continuation: autoAssignContinuation,
          handoff: autoAssignHandoff,
        });
        const executePrompt = `${developmentContract}\n\n📋 执行任务：${task.title}\n${directTaskText}\n\n请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执。`;
        const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
        let autoAssignNativeSessionId = "";
        let autoAssignNativeContinuationEvidence: any = null;
        let autoAssignNativeModelCapabilityReceipt: any = null;
        let autoAssignModelCapabilityRecord: any = null;
        let autoAssignProviderMemoryChannelEvidence: any = null;
        let autoAssignMemoryContextConsumptionReceipt: any = null;
        let autoAssignMemoryContextConsumptionRecovery: any = null;
        let autoAssignProviderUsage: any = null;
        let autoAssignSucceeded = true;
        let autoAssignError = "";
        let autoAssignRunnerRequestId = "";
        let autoAssignRunnerStarted = false;
        const autoAssignRenderedPrompt = `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${executePrompt}`;
        let autoAssignMemoryContextSnapshot: any = null;
        if (autoAssignTaskSession) {
          const bound = bindTaskAgentMemoryContextSnapshot(autoAssignTaskSession.id, {
            taskId: task.id,
            groupId: autoAssignGroupId,
            project: task.target_project,
            agentType,
            nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
            turn: autoAssignMemoryDeliveryAttemptSequence,
            executionId: task.id,
            traceId: task.trace_id || "",
            workerContextPacket: autoAssignHandoff.worker_context_packet,
            workerHandoff: autoAssignHandoff,
            memoryContext: autoAssignGroupMemoryContext,
            renderedHandoff: developmentContract,
            renderedPrompt: autoAssignRenderedPrompt,
            renderedMemoryContext: String(autoAssignGroupMemoryContext?.rendered_text || ""),
            requireMemoryPromptInjectionProof: true,
            requireTrustedMemoryPromptEnvelope: true,
            requireProviderMemoryChannelAcknowledgement: true,
            requireMemoryContextConsumptionReceipt: !!autoAssignMemoryConsumptionChallenge,
            memoryContextConsumptionChallenge: autoAssignMemoryConsumptionChallenge,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            invocationLineage: autoAssignInvocationEdge,
          });
          autoAssignMemoryContextSnapshot = bound?.snapshot || null;
        }
        const autoAssignTypedMemoryDispatchAdmission = admitChildTypedMemoryDelivery(autoAssignGroupMemoryContext, {
          workerContextPacket: autoAssignHandoff.worker_context_packet,
          renderedPrompt: autoAssignRenderedPrompt,
          attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
        });
        if (autoAssignTypedMemoryDispatchAdmission.admitted !== true) {
          throw new Error(`类型化记忆 dispatch-time consume 门禁未通过：${autoAssignTypedMemoryDispatchAdmission.reason || "unknown"}`);
        }
        const autoAssignTypedMemoryDispatchStartedAt = new Date().toISOString();
        const autoAssignTypedMemoryDispatchWal = createChildTypedMemoryDispatchWal(autoAssignTypedMemoryDispatchAdmission, {
          memoryBundle: autoAssignGroupMemoryContext,
          workerContextPacket: autoAssignHandoff.worker_context_packet,
          renderedPrompt: autoAssignRenderedPrompt,
          snapshotRenderedPrompt: autoAssignRenderedPrompt,
          executionId: task.id,
          capacityRevalidationProof: autoAssignCapacityRevalidationPreparation?.proof || null,
        });
        let autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted(autoAssignTypedMemoryDispatchWal, {
          dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
          transport: agentType,
        });
        if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof && autoAssignTypedMemoryDispatchWalRecord) {
          const capacityCommit = commitTaskAgentSessionCapacityRevalidation(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
            typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord.record_checksum,
            typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord.state,
          });
          if (capacityCommit?.acknowledged !== true) throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
          autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
          autoAssignCapacityRevalidationCommitted = true;
          if (autoAssignPendingCapacityGate) {
            addTaskLog(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 durable dispatch`);
            appendTaskTimelineEvent(task.id, {
              type: "task_agent_capacity_revalidated",
              title: `${task.target_project} 容量降级上下文已重建`,
              detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
              status: "ok",
              phase: "dispatching",
              agent: task.target_project,
              data: {
                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
              },
            });
          }
        }
        if (autoAssignInvocationEdge) {
          autoAssignInvocationEdge = bindTaskAgentInvocationContext(autoAssignInvocationEdge, {
            workerContextPacketId: autoAssignHandoff.worker_context_packet?.packet_id || "",
            memoryContextSnapshotId: autoAssignMemoryContextSnapshot?.snapshot_id || "",
            memoryContextSnapshotChecksum: autoAssignMemoryContextSnapshot?.checksum || "",
            groupSessionMemoryBinding: autoAssignMemoryContextSnapshot?.context?.group_session_memory_binding || null,
            summaryCapsuleChecksum: autoAssignHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.capsule_checksum || "",
            typedMemoryDeliveryCapsule: autoAssignHandoff.worker_context_packet?.typed_memory_delivery_capsule || null,
            renderedPrompt: autoAssignRenderedPrompt,
          });
          autoAssignInvocationEdge = dispatchTaskAgentInvocationEdge(autoAssignInvocationEdge, {
            transport: agentType,
            dispatchedAt: autoAssignTypedMemoryDispatchStartedAt,
            dispatchTicketId: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_id || "",
            dispatchTicketChecksum: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_checksum || "",
            typedMemoryDispatchWalFile: autoAssignTypedMemoryDispatchWalRecord?.file || "",
            typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
            typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
            platformDispatchId: autoAssignTypedMemoryDispatchWalRecord?.platform_dispatch_id || "",
          });
        }
        const taskResult = await ctx.callAgent(
          task.target_project,
          autoAssignRenderedPrompt,
          workDir,
          agentType,
          300000,
          {
            tab: autoAssignGroupId ? "groups" : "projects",
            groupId: autoAssignGroupId,
            project: task.target_project,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
            taskId: task.id,
            executionId: task.id,
            model: autoAssignTaskSession?.modelId || "",
            taskAgentSessionId: autoAssignTaskSession?.id || "",
            trustedMemoryProviderChannelRequired: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
            trustedMemoryProviderAcknowledgementRequired: autoAssignMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
            memoryContextConsumptionReceiptRequired: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
            memoryContextConsumptionChallenge: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
            trustedMemoryEnvelopeChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
            trustedMemoryEnvelopeSourceChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
            ...taskAgentSessionLifecycleRunnerOptions(autoAssignMemoryContextSnapshot),
            agentSession: autoAssignTaskSession ? getTaskAgentSessionOptions(autoAssignTaskSession) : null,
            durableDispatch: autoAssignTypedMemoryDispatchAdmission.required === true
              || autoAssignCapacityRevalidationPreparation?.required === true
              || autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
            onRunnerRequestCreated: (requestId: string) => {
              autoAssignRunnerRequestId = String(requestId || "");
              if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerRequestId) {
                autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted({ required: true, record: autoAssignTypedMemoryDispatchWalRecord }, {
                  dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                  transport: autoAssignRunnerRequestId.startsWith("adr_") ? "server_direct_cli" : "external_runner",
                  runnerRequestId: autoAssignRunnerRequestId,
                });
              }
              if (autoAssignInvocationEdge && autoAssignRunnerRequestId) {
                autoAssignInvocationEdge = bindTaskAgentInvocationRunnerRequest(autoAssignInvocationEdge, autoAssignRunnerRequestId, {
                  typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
                  typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
                });
              }
            },
            onDone: (opts: any) => {
              autoAssignNativeSessionId = String(opts?.nativeSessionId || "");
              autoAssignNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
              autoAssignNativeModelCapabilityReceipt = opts?.nativeModelCapabilityReceipt || null;
              autoAssignModelCapabilityRecord = opts?.nativeModelCapabilityRecord || null;
              if (opts?.providerMemoryChannelEvidence?.required === true) autoAssignProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
              if (opts?.memoryContextConsumptionReceipt) autoAssignMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
              if (opts?.memoryContextConsumptionRecovery) autoAssignMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
              autoAssignProviderUsage = opts?.usage || null;
              autoAssignSucceeded = opts?.isError !== true;
              autoAssignError = String(opts?.error || opts?.message || "");
              autoAssignRunnerRequestId = String(opts?.runnerRequestId || autoAssignRunnerRequestId || "");
              autoAssignRunnerStarted = opts?.runnerStarted === true;
            },
          }
        );
        if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof) {
          const capacityCommit = commitTaskAgentSessionCapacityRevalidation(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
            runnerRequestId: autoAssignRunnerRequestId,
            runnerStarted: autoAssignRunnerStarted,
          });
          if (capacityCommit?.acknowledged !== true) throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
          autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
          autoAssignCapacityRevalidationCommitted = true;
          if (autoAssignPendingCapacityGate) {
            addTaskLog(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 runner return`);
            appendTaskTimelineEvent(task.id, {
              type: "task_agent_capacity_revalidated",
              title: `${task.target_project} 容量降级上下文已重建`,
              detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
              status: "ok",
              phase: "executing",
              agent: task.target_project,
              data: {
                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
              },
            });
          }
        }
        if (autoAssignInvocationEdge) {
          const autoAssignFailed = !autoAssignSucceeded || checkTaskFailure(taskResult);
          autoAssignInvocationEdge = completeTaskAgentInvocationEdge(autoAssignInvocationEdge, {
            success: !autoAssignFailed,
            nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession?.nativeSessionId || "",
            nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
            nativeModelCapabilityReceipt: autoAssignNativeModelCapabilityReceipt,
            nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
            provider: agentType,
            runnerRequestId: autoAssignRunnerRequestId,
            output: taskResult,
            error: autoAssignError,
            reason: autoAssignFailed ? "execution_failed" : "execution_completed",
          });
        }
        let autoAssignMemoryContextDelivery: any = null;
        if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted) {
          autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(autoAssignTypedMemoryDispatchWalRecord, {
            runnerRequestId: autoAssignRunnerRequestId,
            runnerSucceeded: autoAssignSucceeded,
            output: taskResult,
          });
        }
        const autoAssignFileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
        if (autoAssignTaskSession && autoAssignMemoryContextSnapshot) {
          const delivery = recordTaskAgentMemoryContextDelivery(autoAssignTaskSession.id, {
            snapshotId: autoAssignMemoryContextSnapshot.snapshot_id || autoAssignTaskSession.memoryContextSnapshotId || "",
            renderedPrompt: autoAssignRenderedPrompt,
            snapshotRenderedPrompt: autoAssignRenderedPrompt,
            executionId: task.id,
            traceId: task.trace_id || "",
            runtime: agentType,
            attempt: autoAssignMemoryDeliveryAttemptSequence,
            nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession.nativeSessionId || "",
            runnerRequestId: autoAssignRunnerRequestId,
            dispatched: autoAssignRunnerStarted,
            executionSucceeded: autoAssignSucceeded,
            output: taskResult,
            fileChanges: autoAssignFileChanges,
            nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
            providerMemoryChannelEvidence: autoAssignProviderMemoryChannelEvidence,
            memoryContextConsumptionReceipt: autoAssignMemoryContextConsumptionReceipt,
            memoryContextConsumptionRecovery: autoAssignMemoryContextConsumptionRecovery,
            providerUsage: autoAssignProviderUsage,
            runnerStarted: autoAssignRunnerStarted,
            invocationEdgeId: autoAssignInvocationEdge?.invocation_edge_id || "",
          });
          autoAssignMemoryContextDelivery = delivery?.receipt || null;
          if (autoAssignTypedMemoryDispatchWalRecord && autoAssignMemoryContextDelivery?.delivered === true) {
            autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(autoAssignTypedMemoryDispatchWalRecord, {
              runnerRequestId: autoAssignRunnerRequestId,
              runnerSucceeded: autoAssignSucceeded,
              output: taskResult,
              deliveryReceipt: autoAssignMemoryContextDelivery,
            });
          }
        }
        if (autoAssignInvocationEdge) {
          autoAssignInvocationEdge = bindTaskAgentInvocationMemoryDelivery(autoAssignInvocationEdge, {
            deliveryReceipt: autoAssignMemoryContextDelivery,
          });
        }
        const autoAssignTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery(autoAssignGroupMemoryContext, {
          workerContextPacket: autoAssignHandoff.worker_context_packet,
          dispatchEvidence: {
            renderedPrompt: autoAssignRenderedPrompt,
            deliveryReceipt: autoAssignMemoryContextDelivery,
            dispatchTicket: autoAssignTypedMemoryDispatchAdmission.ticket,
            dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
            dispatched: autoAssignRunnerStarted,
            executionReturned: autoAssignRunnerStarted,
          },
        });
        if (autoAssignTypedMemoryDeliveryCommit.committed === true) {
          addTaskLog(task.id, "info", `${task.target_project} 自动派发类型化记忆投递租约已提交：${autoAssignTypedMemoryDeliveryCommit.lease?.leaseId || "unknown"}`);
        }
        if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted && autoAssignMemoryContextDelivery?.delivered === true) {
          autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchCommitted(autoAssignTypedMemoryDispatchWalRecord, autoAssignTypedMemoryDeliveryCommit);
        }
        if (autoAssignTaskSession) {
          autoAssignTaskSession = recordTaskAgentSessionTurn(autoAssignTaskSession.id, {
            nativeSessionId: autoAssignNativeSessionId,
            nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
            nativeContinuationUnverified: autoAssignNativeContinuationEvidence?.nativeResumeRequested === true
              && autoAssignNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
            success: autoAssignSucceeded,
            error: autoAssignError || (!autoAssignSucceeded ? taskResult : ""),
            nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
          }) || autoAssignTaskSession;
        }
        const fileChanges = autoAssignFileChanges;
        const execution = getTaskExecutionFromReceipt(taskResult, extractAgentReceipt(taskResult, task.target_project), { fileChanges });
        const isCompleted = execution.status === "done";

        const legacyDeliverySummary = buildDeliverySummary(task, execution, isCompleted ? "done" : "waiting");
        const updatedTask = updateTask(task_id, {
          status: isCompleted ? "done" : "in_progress",
          result: taskResult.substring(0, 500),
          final_report: execution.report || taskResult,
          status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
          receipt: execution.receipt || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: legacyDeliverySummary,
        }) || { ...task, status: isCompleted ? "done" : "in_progress", delivery_summary: legacyDeliverySummary, status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工") };
        if (isCompleted && legacyDeliverySummary.acceptance_gate_passed === true) {
          const projectMemoryResult = recordAcceptedProjectDeliveryMemory({ task: updatedTask, deliverySummary: legacyDeliverySummary });
          if (projectMemoryResult.committed) addTaskLog(task_id, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.durableCandidateCount} 条长期记录`);
        }

        if (autoAssignGroupId) {
          appendLegacyTaskExecutionGroupReport({
            groupId: autoAssignGroupId,
            task: updatedTask,
            status: isCompleted ? "done" : "waiting",
            detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
            rawResult: taskResult,
            fileChanges,
          });
        }

        sendJson(res, { success: true, task, completed: isCompleted, result: taskResult });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const tasks = loadTasks().filter(t => t.status === "pending");

        if (tasks.length === 0) {
          return sendJson(res, { success: true, message: "没有待执行的任务" });
        }

        const results = tasks.map(task => ({
          task_id: task.id,
          title: task.title,
          ...enqueueTask(task.id, ctx)
        }));
        const queuedCount = results.filter(r => r.queued).length;

        sendJson(res, {
          success: true,
          message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
          results,
          queue_status: getQueueStatus()
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/review" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, project, diff, reviewers } = JSON.parse(body);
        if (!diff) return sendJson(res, { error: "请提供代码变更内容" }, 400);

        const configs = getConfigs();
        const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;

        const reviewResults = [];
        const reviewGroup = group_id ? loadGroups().find(g => g.id === group_id) : null;
        for (const reviewer of (reviewers || [])) {
          const config = configs.find(c => c.name === reviewer);
          if (!config) continue;

          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          try {
            const toolContext = buildAgentToolContext(ctx, reviewGroup, reviewer, reviewPrompt);
            const runtimeToolContext = prepareAgentRuntimeTools(group_id || "", reviewer, workDir, agentType, toolContext.allowedTools, null, {
              toolAudit: toolContext.toolAudit,
              authorizationReadiness: toolContext.authorizationReadiness,
            });
            assertRuntimeToolDispatchReady(reviewer, runtimeToolContext);
            const result = await ctx.callAgent(
              reviewer,
              `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${reviewPrompt}`,
              workDir,
              agentType,
              120000,
              {
                tab: group_id ? "groups" : "projects",
                groupId: group_id,
                project: reviewer,
                allowedTools: toolContext.allowedTools,
                mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
              }
            );
            reviewResults.push({ reviewer, result });
          } catch (e: any) {
            reviewResults.push({ reviewer, error: e.message });
          }
        }

        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          const coordinator = group ? getCoordinatorMember(group) : { project: "coordinator" };
          appendLegacyCodeReviewGroupReport({
            groupId: group_id,
            project,
            coordinator: coordinator.project,
            reviewResults,
          });
        }

        sendJson(res, { success: true, reviews: reviewResults });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/collaboration/stats" && req.method === "GET") {
    const tasks = loadTasks();
    const groups = loadGroups();

    const stats = {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter((t: any) => t.status === "pending").length,
      in_progress_tasks: tasks.filter((t: any) => t.status === "in_progress").length,
      done_tasks: tasks.filter((t: any) => t.status === "done").length,
      failed_tasks: tasks.filter((t: any) => t.status === "failed").length,
      completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t: any) => t.status === "done").length / tasks.length * 100) : 0,
      groups_count: groups.length,
      recent_activities: [] as any[]
    };

    for (const group of groups.slice(0, 3)) {
      const messages = getGroupMessages(group.id).slice(-5);
      for (const msg of messages) {
        stats.recent_activities.push({
          group: group.name,
          agent: msg.agent || "user",
          content: msg.content?.substring(0, 100),
          timestamp: msg.timestamp
        });
      }
    }

    stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    stats.recent_activities = stats.recent_activities.slice(0, 10);

    sendJson(res, stats);
    return true;
  }

  if (pathname === "/api/test/mentions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { text, group_id } = JSON.parse(body);
        let validMentions: any[] = [];
        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          if (group) {
            validMentions = extractActionableMentions(text, group, "");
          }
        }
        sendJson(res, {
          success: true,
          input: text,
          valid_mentions: validMentions.map(m => m.mention),
          extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (handleFeishuRoutes(req, res, parsed)) return true;
  return false;
}
