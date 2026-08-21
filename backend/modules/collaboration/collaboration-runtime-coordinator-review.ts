// collaboration-runtime-coordinator-review.ts — merged from 2 part files (behavior-freeze merge).

import { buildReworkExhaustedUpdate } from "./rework-policy";
import { runMainAgentSelfVerification } from "./main-agent-self-verification";
import { resolveTaskAcceptancePolicy } from "./task-acceptance-policy";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  spawnSync,
} from "child_process";
import * as os from "os";
import {
  sendJson,
  calculateTokensAndCost,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  getWorkDirForProject,
  UPLOAD_DIR,
  SHARED_DIR,
  CCM_DIR,
} from "../../core/utils";
import {
  canonicalWorkspaceMutationLane,
  getUnifiedTaskSchedulerStatus,
  withUnifiedWorkspaceMutationLane,
} from "../../system/unified-task-scheduler";
import { buildTaskConversationLinks } from "../../system/task-conversation-links";
import { appendUserVisibleAgentEvent } from "../../system/user-visible-agent-events";
import {
  finalizeAgentCommunication,
  getAgentCommunication,
  listAgentCommunications,
} from "../../system/agent-communication-v2";
import {
  ingestRequirementSources,
  requirementToIntakeDraft,
} from "../requirements/source-ingestion";
import {
  loadCronJobs,
  saveCronJobs,
  loadTasks,
  saveTasks,
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  AGENTS,
} from "../../core/db";
import {
  buildSelectedSkillUsageDirective,
  selectRoleSkills,
} from "../../skills/role-skills";
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
import {
  buildMainAgentDisplayStream,
  sanitizeMainAgentUserText,
} from "./display";
import {
  buildProjectCodeReadOnlySnapshot as buildProjectCodeReadOnlySnapshotBase,
  buildGroupProjectAnalysisContext as buildGroupProjectAnalysisContextBase,
  buildModelDrivenGroupPlanningSourceContext as buildGroupMainPlanningSourceContext,
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
import {
  hasFeishuTaskBinding,
} from "./feishu-channel";
import {
  handleFeishuRoutes,
} from "./feishu-routes";
import {
  handleAgentQaRoutes,
} from "./agent-qa-routes";
import {
  GROUP_COORDINATION_MCP_SERVER_NAME,
} from "../../integrations/group-coordination-mcp";
import {
  buildTaskBoundInternalMcpServers,
} from "../../integrations/agent-internal-mcp";
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
import {
  handleGroupLiveRoutes,
} from "./group-live-routes";
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
import {
  buildTestAgentVerdict,
} from "../../test-agent/verdict";
import type {
  TestAgentReport,
  TestAgentVerdict,
} from "../../test-agent/types";
import {
  matchProviderToolAccessEvidence,
  verifyProviderToolAccessEvidence,
} from "../../agents/provider-tool-access-evidence";
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
import {
  handleBasicGroupRoutes,
} from "./group-routes";
import {
  handleOrchestratorRoutes,
} from "./orchestrator-routes";
import {
  handleTaskGovernanceRoutes,
} from "./task-governance-routes";
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
import {
  purgeTestAgentArtifactsForTask,
} from "../../test-agent/artifact-retention";
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
import {
  getAgentCommandLabel,
  getPublicAgentRuntimes,
  normalizeAgentRuntimeId,
} from "../../agents/runtime";
import {
  buildRuntimeToolDispatchGate,
  buildRuntimeToolSyncPrompt,
  detectInvokedSkillsFromText,
  recordRuntimeToolSyncAudit,
  syncRuntimeTools,
} from "../../tools/runtime-tool-sync";
import {
  buildAuthorizationReadiness,
  buildToolAuthorizationPayload,
  normalizeToolAuthorization,
} from "../../tools/tool-authorization";
import {
  buildChildAgentWorktreeNotice,
  normalizeChildAgentIsolationMode,
  prepareChildAgentWorkDir,
} from "../../agents/worktree";
import {
  attachExecutionWorkspace,
  beginExecutionAttempt,
  cancelActiveAgentRun,
  classifyExecutionFailure,
  cleanupExecutionWorktree,
  clearTaskCancellation,
  createExecutionCheckpoint,
  ensureExecution,
  evaluateGreenContract,
  inspectBranchFreshness,
  isTaskCancellationRequested,
  listActiveAgentRuns,
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
  suspendTaskAgentSessions,
} from "../../tasks/agent-sessions";
import { isTaskPauseRequested, isTaskSafelyPaused } from "../../tasks/task-pause-control";
import { finalizeTaskPauseAtSafeBoundary, reconcileTaskPauseTree } from "./task-pause-routes";
import {
  interruptTaskExecution,
} from "../../tasks/task-interruption";
import { captureTaskRecoveryWorkspace } from "../../tasks/task-recovery-orchestrator";
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
import {
  getReliabilityDrillStatus,
  runScheduledProductionReliabilityDrill,
} from "../../system/reliability-drills";
import {
  getSoakReport,
  getSoakTestStatus,
  inspectReliabilityDebt,
  reconcileStabilityDebt,
  runSoakTestSelfTest,
  sampleSoakTestNow,
  startSoakTest,
  stopSoakTest,
} from "../../system/soak-test";
import {
  getProcessLifecycleSnapshot,
  registerRestartIntent,
  runProcessLifecycleSelfTest,
} from "../../system/process-lifecycle";
import {
  purgeTaskReplayJournalForTask,
} from "../../system/task-replay-journal";
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
import {
  buildProjectExecutionBrief,
  buildProjectMemoryPacket,
  recordAcceptedProjectDeliveryMemory,
} from "../../projects/memory";
import {
  recordGlobalDirectDispatchMemory,
  recordGlobalDirectDispatchRollbackMemory,
} from "../../agents/global/memory";
import {
  createDispatchRecord,
  normalizeDispatchBatch,
} from "./dispatch-records";
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
  renderMemoryContextForWorker,
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
  TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS,
  TASK_WATCHDOG_GAP_REWORK_MAX,
  TASK_WATCHDOG_STALE_MS,
  agentRecoveryMonitorTimer,
  agentRecoveryProbeInFlight,
  appendTaskGroupReport,
  attachInvokedSkillsToReceipt,
  buildChildAgentDevelopmentContract,
  buildChildAgentTaskText,
  buildChildAgentWorkerHandoff,
  buildGoalRevisionInterruptedStatus,
  buildGroupProjectAnalysisContext,
  buildInlineTaskRuntime,
  buildProjectCodeReadOnlySnapshot,
  buildQueuedGroupTaskMessage,
  buildTaskPreflightReasoning,
  buildTaskProviderSwitchRequests,
  buildUserAgentQuestionRows,
  buildUserCoordinationAcknowledgement,
  buildWorkerContinuationHandoff,
  buildWorkflowMeta,
  claimTaskWorkItemForAgent,
  compactRuntimeToolAudit,
  getChildAgentIsolationMode,
  getInitialWorkflowMeta,
  getTaskFailureText,
  groupSessionIdForTask,
  hasStrongTaskAcceptanceEvidence,
  isAgentExecutionBlockedPendingTask,
  isRecoverableRuntimeFailure,
  isTaskPaused,
  normalizeMentionTask,
  normalizePlanAssignments,
  runningTaskIds,
  runningTasks,
  runtimeToolSnapshotFromAudit,
  sendTaskCompletionNotification,
  sendTaskFailureNotification,
  shouldCreatePersistentGroupTask,
  shouldResumeAfterGoalRevisionInterruption,
  syncTaskBacklogStatus,
  taskAgentInvocationMemoryOptions,
  taskAgentSessionLifecycleRunnerOptions,
  taskQueues,
  taskWatchdogTimer,
  updateGroupTaskInlineStatus,
  updateTaskWorkItemFromReceipt,
} from "./collaboration-runtime-task-queue";
import {
  buildDeliverySummary,
  buildTaskExecutionResult,
  buildTaskSandboxRehearsal,
  extractActualFileChanges,
  getCoordinatorActionMentions,
  getGroupTaskExecutionStatus,
  getTaskExecutionFromReceipt,
  recordReplayRepairTimelineBindingsForMention,
  summarizeReplayRepairTimelineBindingsForEvent,
  taskRequiresCodeChanges,
} from "./collaboration-runtime-status-helpers";
import {
  buildCodedCoordinatorReview,
  buildEvidenceGateFollowUps,
  buildFailedIndependentReviewReworkFollowUps,
  buildIndependentReviewGateFollowUps,
  buildPostReviewSpotCheckFollowUps,
  writeSse,
} from "./collaboration-runtime-daily-dev";
import {
  appendCoordinatorMessage,
  buildRejectedCoordinationAcceptance,
  evaluateCoordinationTaskEvidence,
  getCoordinationRequestForTask,
  isCoordinatorTestAgentName,
  markGroupCoordinationDependencyStarted,
  processCrossAgents,
  settleGroupCoordinationDependency,
} from "./collaboration-runtime-cross-agent-runtime";
import {
  COORDINATOR_REVIEW_MAX_ROUNDS,
  applyTestAgentRecheckBudget,
  buildCoordinatorReworkFollowUp,
  filterCoordinatorLlmFollowUpsAgainstHardRoutes,
  getTestAgentRecheckSubjectKey,
  scheduleTestAgentRecheckAfterFollowUps,
} from "./collaboration-runtime-test-agent-handoff";
import {
  CollabCtx,
  buildAgentToolContext,
  buildCoordinatorSharedFilesContext,
  buildTaskSourceDocumentsContext,
  getTaskAgentExecutionReadiness,
  mergeCoordinatorDocumentContexts,
  normalizeAgentProbeTarget,
} from "./collaboration-runtime-plan-tools";
import {
  assertRuntimeToolDispatchReady,
  buildProjectVerificationHints,
  canAutoContinueTaskGaps,
  canCompleteDailyDevFromDeliverySummary,
  createTask,
  hasDailyDevContinuationGaps,
  prepareAgentRuntimeTools,
  removeTaskFromQueues,
  runtimeToolDispatchBlockedReceipt,
  updateTask,
} from "./collaboration-runtime-runtime-tools";
import {
  archiveTask,
  purgeArchivedTask,
  restoreArchivedTask,
} from "./collaboration-runtime-task-ops";

// ===== merged from collaboration-runtime-coordinator-review-part-01.ts =====

export async function runCoordinatorReviewLoop(input: {
  groupId: string;
  group: any;
  userMessage: string;
  coordinatorOutput: string;
  crossOutputs: string[];
  configs: any[];
  ctx: CollabCtx;
  streamRes?: any;
  executionOrder?: string;
  taskId?: string;
  groupSessionId?: string;
  acceptancePolicy?: any;
}) {
  const coordinator = getCoordinatorMember(input.group);
  const seenMentions = new Set<string>();
  const allOutputs = [...(input.crossOutputs || [])];
  const pendingTestAgentRechecks: any[] = [];
  const testAgentRecheckCountsBySubject = new Map<string, number>();
  // A bounded five-stage loop supports initial review -> repair/preparation ->
  // TestAgent recheck -> optional spot-check repair -> final acceptance.
  const maxReviewRounds = COORDINATOR_REVIEW_MAX_ROUNDS;
  if (allOutputs.length === 0) return null;

  const independentTestAgentEnabled = input.acceptancePolicy?.mode === "test_agent";
  if (!input.acceptancePolicy || input.acceptancePolicy?.checksum === "") throw new Error("群聊验收缺少任务级策略快照");
  if (!independentTestAgentEnabled) {
    if (input.taskId) {
      updateTask(input.taskId, {
        test_agent_enabled: false,
        acceptance_mode: "main_agent_self_verification",
        acceptance_state: "main_agent_self_verifying",
        status_detail: "TestAgent 已关闭，群聊主 Agent 正在执行一次自验",
      });
      appendTaskTimelineEvent(input.taskId, {
        type: "group_main_self_verification_started",
        title: "群聊主 Agent 开始自验",
        detail: "TestAgent 已关闭，本轮不产生独立验收结论",
        status: "active",
        phase: "reviewing",
        agent: coordinator.project,
      });
    }
    const currentTask = input.taskId ? loadTasks().find((item: any) => item.id === input.taskId) : null;
    if (!currentTask) throw new Error("群聊主 Agent 自验缺少权威任务记录");
    const actualFileChanges = require("./collaboration-runtime-status-helpers").collectTaskActualFileChanges(currentTask, {});
    const projectConfigs = loadProjectConfigs() || {};
    const projectNames = [...new Set([
      ...actualFileChanges.map((item: any) => String(item?.project || "").trim()),
      ...(Array.isArray(input.group?.members) ? input.group.members.map((item: any) => String(item?.project || item?.name || "").trim()) : []),
    ].filter(Boolean))];
    const verificationProjects = projectNames.map(name => {
      const config = input.configs.find((item: any) => item.name === name);
      const projectInfo = config ? getConfigInfo(config.path).find((item: any) => item.name === name) || getConfigInfo(config.path)[0] : null;
      return {
        name,
        workDir: String(projectInfo?.workDir || ""),
        verificationCommands: Array.isArray(projectConfigs?.[name]?.verification_commands) ? projectConfigs[name].verification_commands : [],
      };
    }).filter(item => item.workDir);
    const selfReceipt = await runMainAgentSelfVerification({
      task: currentTask,
      policy: input.acceptancePolicy,
      acceptanceCriteria: String(currentTask.acceptance_criteria || "").split(/\r?\n|；/).filter(Boolean),
      changedFiles: actualFileChanges,
      projects: verificationProjects,
      workerOutputs: allOutputs,
      sourceSnapshotChecksum: String(currentTask?.planning_source_evidence?.checksum || ""),
    });
    const review: any = {
      ...selfReceipt,
      mode: "main_agent_self_verification",
      followUps: [],
      follow_ups: [],
      status: selfReceipt.canAccept ? "complete" : "needs_user",
      content: selfReceipt.report.summary,
      summary: selfReceipt.report.summary,
    };
    const content = [
      "主 Agent 自验结果（TestAgent 已关闭）：",
      String(review?.content || review?.summary || "已核对子 Agent 结果和现有验证证据。"),
      "本结论不是独立 TestAgent 验收。",
    ].join("\n\n");
    review.content = content;
    await appendCoordinatorMessage(input.groupId, coordinator.project, content, input.streamRes, "selfverify", {
      runtime: "main-agent-self-verification",
      workflow: buildWorkflowMeta(review.status === "complete" ? "complete" : "needs_user", "主 Agent 单轮自验"),
    });
    if (input.taskId) {
      updateTask(input.taskId, {
        main_agent_self_verification: selfReceipt,
        main_agent_final_acceptance: {
          schema: "ccm-main-agent-final-acceptance-v1",
          accepted: review.status === "complete",
          mode: "main_agent_self_verification",
          acceptance_policy_checksum: input.acceptancePolicy.checksum,
          review_checksum: selfReceipt.checksum,
          decided_at: new Date().toISOString(),
        },
        acceptance_state: review.status === "complete" ? "main_agent_self_verified" : "main_agent_self_verification_failed",
      });
      appendTaskTimelineEvent(input.taskId, {
        type: "group_main_self_verification_finished",
        title: review.status === "complete" ? "群聊主 Agent 自验通过" : "群聊主 Agent 自验未通过",
        detail: String(review?.summary || review?.content || ""),
        status: review.status === "complete" ? "ok" : "warn",
        phase: "reviewing",
        agent: coordinator.project,
        data: { review },
      });
    }
    updateGroupMemory(input.groupId, {
      currentPhase: review.status === "complete" ? "complete" : "needs_user",
      decision: review.status === "complete" ? "主 Agent 单轮自验通过" : "主 Agent 单轮自验需要用户处理",
      reason: compactMemoryText(review.content, 300),
      nextAction: review.status === "complete" ? "进入最终交付" : "等待用户确认或补充证据",
    });
    input.crossOutputs.splice(0, input.crossOutputs.length, ...allOutputs);
    return review;
  }

  if (input.taskId && input.acceptancePolicy.mode !== "test_agent") throw new Error("群聊任务验收策略与独立 TestAgent 链路不一致");

  let lastReview: any = null;

  for (let round = 1; round <= maxReviewRounds; round++) {
    // 用户取消后不再烧验收轮次：不再调用 LLM 复盘、不再派发返工。终态由取消路由负责写入。
    if (input.taskId && isTaskCancellationRequested(input.taskId)) {
      addTaskLog(input.taskId, "warning", `任务已被取消，主 Agent 验收循环在第 ${round} 轮前停止`);
      appendTaskTimelineEvent(input.taskId, {
        type: "review_loop_cancelled",
        title: "取消后停止验收循环",
        detail: `用户已取消任务，第 ${round}/${maxReviewRounds} 轮验收不再执行`,
        status: "warn",
        phase: "reviewing",
        agent: coordinator.project,
      });
      return lastReview;
    }
    const allowFollowUps = round < maxReviewRounds;
    const pendingRechecksForRound = pendingTestAgentRechecks.splice(0, pendingTestAgentRechecks.length);
    // 末轮不再派发任何 follow-up，因此这里不能消耗复验预算（否则预算被永远用不上的复验吃掉），
    // 未执行的复验必须原样保留下来，走下面的"未执行复验"路径显式暴露给用户，禁止静默丢弃。
    const scheduledBudget = allowFollowUps
      ? applyTestAgentRecheckBudget(pendingRechecksForRound, testAgentRecheckCountsBySubject)
      : { kept: [] as any[], blocked: [] as any[], counts: testAgentRecheckCountsBySubject };
    const scheduledTestAgentRechecks = scheduledBudget.kept;
    const skippedTestAgentRechecks = allowFollowUps ? [] : pendingRechecksForRound;
    if (scheduledBudget.blocked.length && input.streamRes) {
      writeSse(input.streamRes, {
        type: "status",
        text: scheduledBudget.blocked.map((item: any) => item.reason).slice(0, 2).join("；"),
        agent: coordinator.project,
      });
    }
    const scheduledReviewSubjects = new Set(
      scheduledTestAgentRechecks
        .map((item: any) => String(item?.reviewSubject || item?.originalTarget || "").trim())
        .filter(Boolean)
    );
    let review: any = await runLlmCoordinatorReview(
      input.group,
      input.userMessage,
      input.coordinatorOutput,
      allOutputs,
      { allowFollowUps, round, maxRounds: maxReviewRounds, taskId: input.taskId || "", executionId: input.taskId || "", groupSessionId: input.groupSessionId || "" }
    );

    if (!review) {
      review = buildCodedCoordinatorReview(input.group, allOutputs, {
        allowFollowUps,
        round,
        maxRounds: maxReviewRounds,
      });
    }

    lastReview = review;
    const proposedLlmFollowUps = Array.isArray((review as any).followUps) ? (review as any).followUps : [];
    const gateFollowUps = buildEvidenceGateFollowUps(input.group, allOutputs)
      .filter((item: any) => !(scheduledTestAgentRechecks.length && isCoordinatorTestAgentName(item?.targetName || item?.project)));
    const failedIndependentReviewFollowUps = buildFailedIndependentReviewReworkFollowUps({
      group: input.group,
      taskId: input.taskId || "",
      outputs: allOutputs,
      existingFollowUps: [...scheduledTestAgentRechecks, ...gateFollowUps],
    }).filter((item: any) => !scheduledReviewSubjects.has(String(item?.reviewSubject || item?.targetName || item?.project || "").trim()));
    const postReviewSpotCheckFollowUps = buildPostReviewSpotCheckFollowUps({
      group: input.group,
      taskId: input.taskId || "",
      outputs: allOutputs,
      existingFollowUps: [...scheduledTestAgentRechecks, ...gateFollowUps, ...failedIndependentReviewFollowUps],
    });
    const independentReviewGateFollowUpsRaw = buildIndependentReviewGateFollowUps({
      group: input.group,
      taskId: input.taskId || "",
      outputs: allOutputs,
      existingFollowUps: [...scheduledTestAgentRechecks, ...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps],
    }).filter((item: any) => !scheduledReviewSubjects.has(String(item?.reviewSubject || item?.targetName || item?.project || "").trim()));
    const independentReviewBudget = applyTestAgentRecheckBudget(
      independentReviewGateFollowUpsRaw,
      testAgentRecheckCountsBySubject,
    );
    const independentReviewGateFollowUps = independentReviewBudget.kept;
    if (independentReviewBudget.blocked.length) {
      (review as any).test_agent_recheck_budget_blocked = [
        ...((review as any).test_agent_recheck_budget_blocked || []),
        ...independentReviewBudget.blocked,
        ...scheduledBudget.blocked,
      ];
      if (input.streamRes) {
        writeSse(input.streamRes, {
          type: "status",
          text: independentReviewBudget.blocked.map((item: any) => item.reason).slice(0, 2).join("；"),
          agent: coordinator.project,
        });
      }
    }
    const hardReviewFollowUps = [
      ...scheduledTestAgentRechecks,
      ...failedIndependentReviewFollowUps,
      ...postReviewSpotCheckFollowUps,
      ...independentReviewGateFollowUps,
    ];
    const llmFollowUps = filterCoordinatorLlmFollowUpsAgainstHardRoutes(
      proposedLlmFollowUps,
      hardReviewFollowUps,
      scheduledTestAgentRechecks.length > 0
    );
    // Never dispatch another Worker from the final review round.  Previously
    // LLM-proposed follow-ups bypassed `allowFollowUps`, so the last round could
    // start one more execution even though the loop was already exhausted.
    const followUps = allowFollowUps
      ? uniqueByKey(
          [...scheduledTestAgentRechecks, ...llmFollowUps, ...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps, ...independentReviewGateFollowUps],
          (item: any) => `${String(item?.targetName || item?.project || "").trim()}|${normalizeMentionTask(String(item?.message || item?.task || ""))}`,
          20
        )
      : [];
    const reviewTask = input.taskId ? loadTasks().find((item: any) => item.id === input.taskId) : null;
    const memorySnapshot = loadGroupMemory(input.groupId, reviewTask ? groupSessionIdForTask(reviewTask) : "");
    const reworkFollowUps = followUps.map((item: any) => buildCoordinatorReworkFollowUp(item, {
      group: input.group,
      memorySnapshot,
      userMessage: input.userMessage,
      coordinatorOutput: input.coordinatorOutput,
      round,
      maxRounds: maxReviewRounds,
      taskId: input.taskId || "",
    }));
    const dispatchableReworkFollowUps = reworkFollowUps.filter((item: any) =>
      !item.dispatchBlocked
      && String(item?.targetName || item?.project || "").trim()
      && String(item?.message || item?.task || "").trim()
    );
    const blockedVerifierFollowUps = reworkFollowUps.filter((item: any) => item.dispatchBlocked);
    if (reworkFollowUps.length) {
      (review as any).rework_routes = reworkFollowUps.map((item: any) => item.reworkRoute).filter(Boolean);
      if ((review as any).structured_review && typeof (review as any).structured_review === "object") {
        (review as any).structured_review.rework_routes = (review as any).rework_routes;
        if (Array.isArray((review as any).structured_review.follow_ups)) {
          (review as any).structured_review.follow_ups = (review as any).structured_review.follow_ups.map((followUp: any, index: number) => ({
            ...followUp,
            route: reworkFollowUps[index]?.reworkRoute || null,
          }));
        }
      }
    }
    // 末轮未执行的 TestAgent 复验必须转成显式门禁原因：这些复验是"返工已完成、等待独立复验"的凭据，
    // 丢掉它们而不留痕会让主 Agent 看起来完成了验收，实际上最后一次改动从未被独立复核过。
    const skippedRecheckReasons = skippedTestAgentRechecks.map((item: any) => {
      const subject = getTestAgentRecheckSubjectKey(item) || "test-agent";
      return `已达验收轮次上限（${maxReviewRounds} 轮），${subject} 返工后的 TestAgent 复验未执行，需人工确认后再验收`;
    });
    if (skippedRecheckReasons.length) {
      (review as any).skipped_test_agent_rechecks = skippedTestAgentRechecks.map((item: any) => ({
        subject: getTestAgentRecheckSubjectKey(item) || "test-agent",
        reason: item?.reason || "",
        rework_kind: item?.rework_kind || "",
      }));
    }
    const gateReasons = [
      ...[...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps, ...independentReviewGateFollowUps]
        .map((item: any) => String(item.reason || "").trim()),
      ...skippedRecheckReasons,
      ...(scheduledBudget.blocked || []).map((item: any) => String(item?.reason || "").trim()),
    ].filter(Boolean);
    if (blockedVerifierFollowUps.length && dispatchableReworkFollowUps.length === 0) {
      (review as any).status = "needs_user";
    }
    if (!allowFollowUps && gateReasons.length) {
      (review as any).status = "needs_user";
      // 与项目直派路径统一：返工轮次耗尽写入同一个结构化终态标记。
      if (input.taskId) {
        updateTask(input.taskId, buildReworkExhaustedUpdate(gateReasons.join("；"), { path: "group_review" }));
      }
    }
    if (skippedRecheckReasons.length && input.taskId) {
      appendTaskTimelineEvent(input.taskId, {
        type: "test_agent_recheck_skipped",
        title: "TestAgent 复验未执行",
        detail: skippedRecheckReasons.join("；"),
        status: "warn",
        phase: "reviewing",
        agent: coordinator.project,
        data: { round, max_rounds: maxReviewRounds, skipped: (review as any).skipped_test_agent_rechecks },
      });
    }
    let reviewContent = gateReasons.length
      ? `${review.content}\n\n系统验收门禁：${gateReasons.join("；")}${allowFollowUps ? "" : "\n已达到自动返工上限，需要用户确认是否继续派发或人工介入。"}`
      : review.content;
    if (reworkFollowUps.length) {
      reviewContent = [
        reviewContent,
        "",
        "主 Agent 返工工作单：",
        ...reworkFollowUps.map((item: any) => {
          const preview = item.summary ? `${sanitizeMainAgentUserText(item.summary, "补齐结果说明和验证证据", 80)}：` : "";
          const routeLabel = item.reworkRoute?.user_label || "继续补齐缺口";
          const reason = sanitizeMainAgentUserText(item.reason || item.task || item.message || "", "补齐可验收证据", 140);
          if (item.dispatchBlocked) {
            return `需要配置独立验证 Agent：${item.userTaskPreview || reason}`;
          }
          return `@${item.targetName || item.project} ${routeLabel}：${preview}${reason}`;
        }),
      ].join("\n");
    }
    const followUpAssignments = normalizePlanAssignments(dispatchableReworkFollowUps.map((item: any) => ({
      project: String(item?.targetName || item?.project || "").trim(),
      task: String(item?.message || item?.task || "").trim(),
      reason: String(item?.reason || "主 Agent 复盘后发现仍有缺口，需要补充处理").trim(),
      summary: String(item?.summary || item?.reason || "").trim(),
      dependsOn: String(item?.dependsOn || "").trim(),
      rework: true,
      continuationOf: String(item?.continuationOf || item?.targetName || item?.project || "").trim(),
      continuationStrategy: String(item?.continuationStrategy || "same_worker_scratchpad").trim(),
      reworkRoute: item?.reworkRoute || null,
      originalTarget: String(item?.originalTarget || item?.reviewSubject || "").trim(),
      reviewSubject: String(item?.reviewSubject || item?.originalTarget || "").trim(),
      verifierSelection: item?.verifierSelection || null,
      testAgentHandoff: item?.testAgentHandoff || item?.test_agent_handoff || null,
      test_agent_handoff: item?.testAgentHandoff || item?.test_agent_handoff || null,
      testAgentHandoffWarnings: item?.testAgentHandoffWarnings || item?.test_agent_handoff_warnings || item?.testAgentHandoff?.warnings || item?.test_agent_handoff?.warnings || [],
      test_agent_handoff_warnings: item?.testAgentHandoffWarnings || item?.test_agent_handoff_warnings || item?.testAgentHandoff?.warnings || item?.test_agent_handoff?.warnings || [],
      testAgentWorkOrder: item?.testAgentWorkOrder || item?.test_agent_work_order || null,
      test_agent_work_order: item?.testAgentWorkOrder || item?.test_agent_work_order || null,
      userTaskPreview: String(item?.userTaskPreview || item?.summary || item?.reason || "").trim(),
      attempt: round + 1,
    })).filter((item: any) => item.project && item.task));

    const reviewMessageId = await appendCoordinatorMessage(
      input.groupId,
      coordinator.project,
      reviewContent,
      input.streamRes,
      `review${round}`,
      followUpAssignments.length > 0
        ? {
            assignments: followUpAssignments,
            executionOrder: input.executionOrder || "parallel",
            runtime: "llm-review",
            workflow: buildWorkflowMeta("rework", `第 ${round} 轮验收后返工`),
            rework_routes: reworkFollowUps.map((item: any) => item.reworkRoute).filter(Boolean),
            blocked_rework_followups: blockedVerifierFollowUps,
          }
        : {
            runtime: "llm-review",
            workflow: buildWorkflowMeta((review as any).status === "needs_user" ? "needs_user" : "reviewing", `第 ${round} 轮主 Agent 验收`),
            blocked_rework_followups: blockedVerifierFollowUps,
        }
    );
    updateGroupMemory(input.groupId, {
      currentPhase: followUpAssignments.length > 0 ? "rework" : ((review as any).status === "needs_user" ? "needs_user" : "reviewing"),
      decision: `主 Agent 第 ${round} 轮验收：${(review as any).status || "review"}`,
      reason: gateReasons.join("；") || ((review as any).gaps || []).join("；") || ((review as any).conflicts || []).join("；"),
      openQuestion: (review as any).content?.includes("需要你确认") ? (review as any).content : "",
      nextAction: followUpAssignments.length > 0 ? `执行第 ${round} 轮返工计划` : "等待用户确认或进入最终总结",
    });

    if (dispatchableReworkFollowUps.length === 0) {
      if (input.taskId && String((review as any).status || "") === "complete") {
        updateTask(input.taskId, {
          main_agent_final_acceptance: {
            schema: "ccm-main-agent-final-acceptance-v1",
            accepted: true,
            mode: "test_agent",
            acceptance_policy_checksum: input.acceptancePolicy.checksum,
            review_checksum: crypto.createHash("sha256").update(JSON.stringify({ review: (review as any).structured_review || review, round })).digest("hex"),
            decided_at: new Date().toISOString(),
          },
        });
      }
      input.crossOutputs.splice(0, input.crossOutputs.length, ...allOutputs);
      return review;
    }

    const followUpPreview = dispatchableReworkFollowUps
      .map((item: any) => `${item.targetName || item.project}${item.summary ? `：${sanitizeMainAgentUserText(item.summary, "补齐结果说明和验证证据", 48)}` : ""}`)
      .filter(Boolean)
      .slice(0, 3)
      .join("、");
    writeSse(input.streamRes, {
      type: "status",
      text: followUpPreview
        ? `🔎 主 Agent 第 ${round} 轮验收发现缺口，正在继续追问：${followUpPreview}`
        : `🔎 主 Agent 第 ${round} 轮验收发现缺口，正在继续追问相关子 Agent...`,
      agent: coordinator.project,
    });
    const followOutputs = await processCrossAgents(
      input.groupId,
      input.group,
      coordinator.project,
      reviewContent,
      dispatchableReworkFollowUps,
      input.configs,
      input.ctx,
      input.streamRes,
      round,
      seenMentions,
      input.executionOrder || "parallel",
      reviewMessageId,
      input.taskId || ""
    );
    allOutputs.push(...followOutputs);
    pendingTestAgentRechecks.push(...scheduleTestAgentRecheckAfterFollowUps(dispatchableReworkFollowUps, followOutputs));
  }

  const finalSummary = lastReview
    || await runLlmCoordinatorSummary(input.group, input.userMessage, allOutputs, { groupSessionId: input.groupSessionId || "" })
    || buildCodedCoordinatorSummary(input.group, allOutputs);

  if (finalSummary) {
    await appendCoordinatorMessage(
      input.groupId,
      finalSummary.agent || coordinator.project,
      finalSummary.content,
      input.streamRes,
      "final",
      { workflow: buildWorkflowMeta((finalSummary as any).status === "needs_user" ? "needs_user" : "complete", "最终验收") }
    );
    updateGroupMemory(input.groupId, {
      currentPhase: (finalSummary as any).status === "needs_user" ? "needs_user" : "complete",
      decision: "主 Agent 完成最终验收",
      reason: compactMemoryText(finalSummary.content || "", 300),
      nextAction: (finalSummary as any).status === "needs_user" ? "等待用户补充信息" : "本轮协作已完成",
    });
  }
  input.crossOutputs.splice(0, input.crossOutputs.length, ...allOutputs);
  return finalSummary;
}

function requirementEpicExecutionBoundary(task: any) {
  const item = task?.requirement_item;
  if (task?.parent_workflow_type !== "requirement_epic" || !item) return "";
  return [
    "【已确认的 Requirement Epic 子任务边界】",
    `item_key：${item.item_key || task.requirement_item_key || ""}`,
    `标题：${item.title || task.title || ""}`,
    `业务目标：${item.business_goal || task.business_goal || ""}`,
    `范围：${(item.scope || []).join("；") || "仅限本子任务"}`,
    `验收标准：${(item.acceptance_criteria || []).join("；") || task.acceptance_criteria || ""}`,
    `依赖：${(item.depends_on || []).join("、") || "无"}`,
    "这是用户已确认的范围。主 Agent 和子 Agent不得静默扩大、删减或替换；发现冲突或需要跨项变更时暂停并请求用户调整 Epic 计划。",
  ].join("\n");
}

function alignRequirementEpicAssignments(task: any, assignments: any[]) {
  const boundary = requirementEpicExecutionBoundary(task);
  if (!boundary) return assignments;
  return assignments.map((assignment: any) => ({
    ...assignment,
    task: [assignment.task || task.description || task.title, boundary].filter(Boolean).join("\n\n"),
    requirement_item_key: task.requirement_item_key || task.requirement_item?.item_key || "",
    confirmed_scope_locked: true,
  }));
}

// === 执行任务核心 ===
async function executeTask(task: any, ctx: CollabCtx) {
  return require("./collaboration-task-executor").executeTask(task, ctx, {
    addTaskLog,
    admitChildTypedMemoryDelivery,
    alignRequirementEpicAssignments,
    appendGroupMessage,
    appendTaskTimelineEvent,
    assertRuntimeToolDispatchReady,
    attachExecutionWorkspace,
    attachInvokedSkillsToReceipt,
    attachMemoryContextConsumptionChallenge,
    bindTaskAgentInvocationContext,
    bindTaskAgentInvocationMemoryDelivery,
    bindTaskAgentInvocationRunnerRequest,
    bindTaskAgentMemoryContextSnapshot,
    buildAgentMemoryContextBundleWithManifestSelection,
    buildAgentToolContext,
    buildChildAgentDevelopmentContract,
    buildChildAgentTaskText,
    buildChildAgentWorkerHandoff,
    buildChildAgentWorktreeNotice,
    buildCoordinatorSharedFilesContext,
    buildGroupContextPacket,
    buildGroupMainPlanningSourceContext,
    buildProjectVerificationHints,
    buildQueuedGroupTaskMessage,
    buildTaskProviderSwitchRequests,
    buildTaskSandboxRehearsal,
    buildTaskSourceDocumentsContext,
    buildUserCoordinationAcknowledgement,
    buildWorkerContinuationHandoff,
    buildWorkflowMeta,
    captureReasoningFacts,
    checkTaskFailure,
    claimTaskWorkItemForAgent,
    commitChildTypedMemoryDelivery,
    commitTaskAgentSessionCapacityRevalidation,
    compactMemoryText,
    compactRuntimeToolAudit,
    completeTaskAgentInvocationEdge,
    createChildTypedMemoryDispatchWal,
    createExecutionCheckpoint,
    createMemoryContextConsumptionChallenge,
    dispatchTaskAgentInvocationEdge,
    ensureExecution,
    evaluateGreenContract,
    explainReasoningDecision,
    extractAgentReceipt,
    extractRunnerVerificationEvidence,
    getChildAgentIsolationMode,
    getConfigInfo,
    getConfigs,
    getCoordinatorActionMentions,
    getCoordinatorMember,
    getGroupTaskExecutionStatus,
    getInitialWorkflowMeta,
    getRoutableMembers,
    getTaskAgentSessionOptions,
    getTaskExecutionFromReceipt,
    groupSessionIdForTask,
    loadExecution,
    loadGroups,
    loadTasks,
    markChildTypedMemoryDispatchCommitted,
    markChildTypedMemoryDispatchStarted,
    markChildTypedMemoryRunnerReturned,
    markGroupCoordinationDependencyStarted,
    memoryContextConsumptionReceiptFile,
    mergeCoordinatorDocumentContexts,
    normalizeAgentReasoningState,
    normalizePlanAssignments,
    openTaskAgentSession,
    prepareAgentRuntimeTools,
    prepareChildAgentWorkDir,
    prepareTaskAgentInvocationEdge,
    prepareTaskAgentSessionCapacityRevalidation,
    processCrossAgents,
    recordAgentRuntimeLifecycle,
    recordReasoningDeviation,
    recordReplayRepairTimelineBindingsForMention,
    recordTaskAgentMemoryContextDelivery,
    recordTaskAgentSessionTurn,
    requirementEpicExecutionBoundary,
    runCodedGroupOrchestrator,
    runCoordinatorReviewLoop,
    runGroupOrchestrator,
    runtimeToolDispatchBlockedReceipt,
    runtimeToolSnapshotFromAudit,
    safeAddGroupLog,
    saveTasks,
    setReasoningAssertion,
    summarizeReplayRepairTimelineBindingsForEvent,
    summarizeWorkerHandoffForUser,
    taskAgentInvocationMemoryOptions,
    taskAgentSessionLifecycleRunnerOptions,
    taskRequiresCodeChanges,
    transitionExecution,
    updateGroupMemory,
    updateReasoningPlan,
    updateTask,
    updateTaskWorkItemFromReceipt
  });
}

function ensureTaskKernelExecution(task: any) {
  if (!task?.id) return null;
  if (loadExecution(task.id)) return loadExecution(task.id);
  let project = String(task.target_project || "");
  if (task.assign_type === "group" && task.group_id) {
    const group = loadGroups().find((item: any) => item.id === task.group_id);
    if (group) project = getCoordinatorMember(group).project;
  }
  const config = getConfigs().find((item: any) => item.name === project);
  const workDir = config ? String(getConfigInfo(config.path)?.[0]?.workDir || "") : "";
  if (!project || !workDir || !fs.existsSync(workDir)) return null;
  return ensureExecution({ task, project, agent: project, workDir, executionId: task.id });
}

export function finalizeTaskKernel(task: any, execution: any, deliverySummary: any, state: "succeeded" | "failed" | "reviewing" | "cancelled", message: string) {
  ensureTaskKernelExecution(task);
  const boundaryViolations = Array.isArray(deliverySummary?.project_policy_violations)
    ? deliverySummary.project_policy_violations
    : [];
  if (boundaryViolations.length) {
    const { enforceNativeWorkspaceBoundary } = require("../../agents/native-workspace-boundary");
    const boundary = enforceNativeWorkspaceBoundary(task.id, boundaryViolations);
    deliverySummary.native_workspace_boundary = boundary;
    deliverySummary.native_workspace_boundary_passed = false;
    state = "failed";
    message = boundary.quarantined?.length
      ? `检测到 ${boundaryViolations.length} 项越界写入，违规文件已在隔离工作区恢复，任务未交付`
      : `检测到 ${boundaryViolations.length} 项越界写入，任务已阻止交付并等待用户处理`;
  }
  const records = listExecutions({ taskId: task.id });
  let rootGreen: any = null;
  for (const record of records) {
    if (state === "cancelled") { transitionExecution(record.id, "cancelled", message); continue; }
    if (state === "failed") {
      const failure = classifyExecutionFailure(message);
      transitionExecution(record.id, "failed", message, { failure, failureClass: failure.failureClass });
      continue;
    }
    let branchFresh = true;
    if (record.workspace?.mode === "worktree" && record.workspace?.worktreePath) {
      try { branchFresh = inspectBranchFreshness(record.workspace.worktreePath, record.workspace.baseBranch || "").fresh; } catch { branchFresh = false; }
    }
    const acceptancePassed = state === "succeeded" && hasStrongTaskAcceptanceEvidence(task, records, deliverySummary || {});
    let green = record.green || { level: "none", pass: false };
    if (record.id === task.id) {
      green = evaluateGreenContract({
        receipt: execution?.receipt || { status: execution?.status, verification: deliverySummary?.verification_executed || [] },
        fileChanges: extractActualFileChanges(execution?.fileChanges, task.target_project || record.project),
        requiresChanges: taskRequiresCodeChanges(task),
        requiresVerification: task.requires_verification !== false,
        workspacePassed: acceptancePassed,
        branchFresh,
        reviewPassed: state === "succeeded",
        requiredLevel: record.workspace?.mode === "worktree" ? "merge_ready" : "project",
      });
      rootGreen = green;
    } else if (state === "succeeded" && acceptancePassed && branchFresh && ["project", "workspace", "merge_ready"].includes(String(green.level))) {
      green = { ...green, level: record.workspace?.mode === "worktree" ? "merge_ready" : green.level, pass: true, reviewedAt: new Date().toISOString() };
    }
    transitionExecution(record.id, state, message, { green });
  }
  if (records.length) updateTask(task.id, { execution_kernel: { execution_id: task.id, state, green: rootGreen, updated_at: new Date().toISOString() } });
  return rootGreen;
}

// 队列处理
function scheduleTaskPauseFinalization(taskId: string) {
  setTimeout(() => {
    try {
      const tasks = loadTasks();
      const task = tasks.find((item: any) => String(item?.id || "") === String(taskId || ""));
      if (!task || !isTaskPauseRequested(task)) return;
      const deps = {
        loadTasks,
        listActiveAgentRuns,
        listExecutions,
        transitionExecution,
        listTaskAgentSessions,
        suspendTaskAgentSessions,
        runningTaskIds,
        updateTask,
        appendTaskTimelineEvent,
        appendUserVisibleAgentEvent,
        buildTaskConversationLinks,
        updateGroupTaskInlineStatus,
      };
      finalizeTaskPauseAtSafeBoundary(task, deps);
      const byId = new Map(loadTasks().map((item: any) => [String(item?.id || ""), item]));
      let root: any = byId.get(String(taskId || "")) || task;
      while (root?.parent_task_id && byId.has(String(root.parent_task_id))) root = byId.get(String(root.parent_task_id));
      if (root && String(root.id || "") !== String(taskId || "") && isTaskPauseRequested(root)) reconcileTaskPauseTree(root, deps);
    } catch (error: any) {
      addTaskLog(taskId, "warning", `暂停现场收口失败，等待重新检查：${String(error?.message || error).slice(0, 300)}`);
    }
  }, 0);
}

function settleTaskAgentCommunication(taskId: string, outcome: "accepted" | "rejected" | "cancelled" | "failed", evidence: any = {}) {
  const latest: any = loadTasks().find((item: any) => item.id === taskId);
  const ids = Array.from(new Set([
    String(latest?.agent_communication_message_id || ""),
    ...listAgentCommunications({ taskId, limit: 100 })
      .filter((item: any) => item.messageType === "task_dispatch")
      .map((item: any) => String(item.messageId || "")),
  ].filter(Boolean)));
  const settledRows: any[] = [];
  for (const messageId of ids) {
    try {
      const directIdentity = messageId === String(latest?.agent_communication_message_id || "") ? {
        expectedAttempt: Number(latest?.agent_communication_attempt || 0),
        expectedLeaseId: String(latest?.agent_communication_lease_id || ""),
      } : {};
      const settled: any = finalizeAgentCommunication(messageId, outcome, { ...evidence, ...directIdentity });
      const envelope = settled?.envelope || getAgentCommunication(messageId, { includeEvents: false, includeReceipts: false });
      settledRows.push({ messageId, state: envelope?.state || outcome });
    } catch (error: any) {
      addTaskLog(taskId, "warning", `Agent Communication验收状态写入失败，可通过reconcile重试：${String(error?.message || error).slice(0, 300)}`);
    }
  }
  if (!settledRows.length) return null;
  updateTask(taskId, { agent_communication_state: settledRows.every(row => row.state === "completed") ? "completed" : settledRows[0].state });
  appendTaskTimelineEvent(taskId, {
    type: "agent_communication_terminal",
    title: outcome === "accepted" ? "CCM 已生成最终验收回执" : "CCM 已记录通信验收结果",
    detail: `${settledRows.length} 条通信 · ${settledRows.map(row => row.state).join("/")}`,
    status: outcome === "accepted" ? "ok" : "warn",
    phase: outcome === "accepted" ? "done" : "reviewing",
    data: { messages: settledRows, content_stored: false },
  });
  return settledRows;
}

export async function processTargetQueue(targetKey: string, ctx: CollabCtx, testHooks: { acquireTaskLease?: typeof acquireTaskLease; executeTask?: typeof executeTask } = {}) {
  if (runningTasks.has(targetKey)) {
    console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
    return;
  }

  const queue = taskQueues.get(targetKey);
  if (!queue || queue.length === 0) return;

  runningTasks.set(targetKey, true);
  console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);

  try {
  while (queue.length > 0) {
    const taskId = queue.shift();
    if (!taskId) continue;
    queue.forEach((queuedId, index) => updateTask(queuedId, { queue_position: index + 1, queue_state: "queued" }));
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task || task.status === "done" || task.status === "cancelled" || task.status === "archived" || task.archived || task.deleted_at) {
      addTaskLog(taskId, "info", `跳过任务（不存在或已完成）`);
      continue;
    }
    if (isTaskPaused(task)) {
      addTaskLog(taskId, "info", `任务已暂停，跳过本次队列执行`);
      continue;
    }

    const traceId = ensureTraceId(task.trace_id, "task");
    let leaseResult: any;
    try {
      leaseResult = (testHooks.acquireTaskLease || acquireTaskLease)(taskId, traceId, 45_000);
    } catch (error: any) {
      const recoveryAttempts = Number(task.queue_runtime_recovery_attempts || 0) + 1;
      const detail = `任务租约获取失败：${String(error?.message || error).slice(0, 300)}`;
      if (recoveryAttempts >= 3) {
        const blockedTask = updateTask(taskId, {
          status: "blocked",
          acceptance_state: "blocked",
          auto_execute: false,
          is_paused: true,
          paused: true,
          status_detail: `${detail}；已停止自动重试，请检查任务存储后继续`,
          queue_runtime_recovery_attempts: recoveryAttempts,
          queue_runtime_last_error_at: new Date().toISOString(),
          collaboration_state: { ...(task.collaboration_state || {}), phase: "needs_user", needs_user: true, updated_at: new Date().toISOString() },
        }) || task;
        appendTaskTimelineEvent(taskId, { type: "queue_recovery_exhausted", title: "队列恢复已停止", detail: blockedTask.status_detail, status: "fail", phase: "needs_user", data: { target_key: targetKey, attempts: recoveryAttempts } });
        addTaskLog(taskId, "error", blockedTask.status_detail);
        await ctx.onTaskStatusChange?.(blockedTask, "blocked", blockedTask.status_detail);
        continue;
      }
      updateTask(taskId, {
        status: "pending",
        status_detail: `${detail}；队列将在短暂等待后自动重试`,
        queue_runtime_recovery_attempts: recoveryAttempts,
        queue_runtime_last_error_at: new Date().toISOString(),
      });
      queue.unshift(taskId);
      appendTaskTimelineEvent(taskId, { type: "queue_recovery_scheduled", title: "队列准备自动恢复", detail, status: "warn", phase: "queued", data: { target_key: targetKey, attempts: recoveryAttempts } });
      addTaskLog(taskId, "warning", `${detail}；已保留队首位置`);
      throw error;
    }
    if (!leaseResult.acquired) {
      addTaskLog(taskId, "warning", `任务已有存活 Worker 租约，本实例跳过重复执行（owner=${leaseResult.lease?.owner_id || "unknown"}）`);
      appendTraceEvent(traceId, { type: "task.duplicate_execution_suppressed", status: "warning", task_id: taskId, group_id: task.group_id || "", message: "检测到有效执行租约，阻止重复执行" });
      continue;
    }
    let leaseHeartbeat: any = null;
    let enqueueFollowupAfterRound = false;
    const executionFollowupRevision = Number(task.followup_revision || 0);

    addTaskLog(taskId, "info", `开始执行任务: ${task.title}`);

    try {
      runningTaskIds.add(taskId);
      leaseHeartbeat = setInterval(() => renewTaskLease(taskId, 45_000), 10_000);
      ensureTaskKernelExecution(task);
      const resumingFromPause = task?.pause_control?.state === "resuming";
      if (!resumingFromPause) beginExecutionAttempt(taskId, "任务队列正在启动新的开发执行轮次");
      const reasoningLoop = buildTaskPreflightReasoning(task, "主 Agent 执行前重新核对目标、当前状态和验收条件", Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery);
      const startedTask = updateTask(taskId, {
        status: "in_progress",
        trace_id: traceId,
        started_at: new Date().toISOString(),
        queue_position: 0,
        queue_state: "running",
        reasoning_loop: reasoningLoop,
        execution_lease: { owner_id: leaseResult.lease.owner_id, acquired_at: leaseResult.lease.acquired_at, recovery_count: leaseResult.lease.recovery_count },
        ...(task?.pause_control?.state === "resuming" ? {
          last_pause_control: task.pause_control,
          pause_control: null,
          pause_previous_status: null,
          pause_previous_auto_execute: null,
          collaboration_state: { ...(task.collaboration_state || {}), phase: "executing", needs_user: false, updated_at: new Date().toISOString() },
        } : {}),
      }) || task;
      appendTaskTimelineEvent(taskId, { type: "reasoning_preflight", title: "我已复核目标与验收", detail: `计划版本 v${reasoningLoop.plan_version} · 待证明 ${reasoningLoop.assertions.filter(item => item.status !== "passed").length} 项`, status: "ok", phase: "planning", data: { plan_version: reasoningLoop.plan_version, fact_hash: reasoningLoop.fact_snapshots[reasoningLoop.fact_snapshots.length - 1]?.hash || "", recovery: Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery } });
      updateGroupTaskInlineStatus(startedTask, "in_progress", "我已开始协调执行");
      addTaskLog(taskId, "info", `任务状态更新为: 进行中`);
      syncTaskBacklogStatus(startedTask, "in_progress", "任务已进入执行阶段");
      await ctx.onTaskStatusChange?.(startedTask, "in_progress");

      addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
      const executeCurrentTask = () => (testHooks.executeTask || executeTask)(startedTask, ctx);
      const workspaceMutationLane = startedTask.queue_scope === "isolated_parallel"
        ? `worktree:${String(startedTask.execution_workspace?.worktree_path || startedTask.worktree_path || startedTask.id)}`
        : canonicalWorkspaceMutationLane(
            getWorkDirForProject(startedTask.target_project),
            `workspace:project:${startedTask.target_project || "unknown"}`,
          );
      const execution: any = taskRequiresCodeChanges(startedTask)
        ? await withUnifiedWorkspaceMutationLane(
            workspaceMutationLane,
            executeCurrentTask,
          )
        : await executeCurrentTask();
      const result = execution.result || execution.report || "";
      const latestWithFollowups = loadTasks().find((item: any) => item.id === taskId) || startedTask;
      const resumeAfterGoalRevisionInterruption = isTaskCancellationRequested(taskId)
        && shouldResumeAfterGoalRevisionInterruption(latestWithFollowups, executionFollowupRevision);

      if (isTaskCancellationRequested(taskId) && !resumeAfterGoalRevisionInterruption) {
        const cancelledTask = updateTask(taskId, { status: "cancelled", result: "任务已取消", status_detail: "任务已由用户取消", cancelled_at: new Date().toISOString() }) || { ...task, status: "cancelled" };
        updateGroupTaskInlineStatus(cancelledTask, "cancelled", "任务已由用户取消");
        finalizeTaskKernel(task, execution, null, "cancelled", "任务已由用户取消");
        closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "任务已取消，关闭任务级原生会话");
        addTaskLog(taskId, "warning", "任务执行进程已终止，状态更新为已取消");
        await ctx.onTaskStatusChange?.(cancelledTask, "cancelled", "任务已由用户取消");
        continue;
      }

      if (Number(latestWithFollowups.followup_revision || 0) > executionFollowupRevision) {
        const pending = Array.isArray(latestWithFollowups.pending_followups) ? latestWithFollowups.pending_followups : [];
        const deliverySummary = buildDeliverySummary(latestWithFollowups, execution, "waiting");
        const hasGoalRevision = pending.some((item: any) => item?.kind === "revise_goal" || item?.continuation?.replan_required === true);
        const acceptedAt = new Date().toISOString();
        const latestCollaborationState = latestWithFollowups.collaboration_state || {};
        const lastContinuation = latestCollaborationState.last_continuation
          ? { ...latestCollaborationState.last_continuation, status: "accepted", resumed_at: acceptedAt }
          : latestCollaborationState.last_continuation;
        const resumedTask = updateTask(taskId, {
          status: "pending",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          receipt: execution.receipt || null,
          review: execution.review || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: deliverySummary,
          reasoning_loop: deliverySummary.reasoning_loop,
          consumed_followup_revision: Number(latestWithFollowups.followup_revision || 0),
          pending_followups: pending.map((item: any) => ({ ...item, status: "accepted", accepted_at: acceptedAt })),
          status_detail: resumeAfterGoalRevisionInterruption
            ? buildGoalRevisionInterruptedStatus(pending)
            : hasGoalRevision
              ? `已接收目标调整，当前轮已结束；我会重新核对计划并继续`
              : `已接收 ${Math.max(1, pending.filter((item: any) => item.status !== "accepted").length)} 条追加要求，继续使用当前任务上下文`,
          plan_revision_required: latestWithFollowups.plan_revision_required || hasGoalRevision || undefined,
          collaboration_state: {
            ...latestCollaborationState,
            phase: "reworking",
            needs_user: false,
            last_continuation: lastContinuation,
            continuation_resumed_at: acceptedAt,
            goal_revision_interruption: resumeAfterGoalRevisionInterruption
              ? { ...(latestCollaborationState.goal_revision_interruption || {}), resolved_at: acceptedAt, resumed: true }
              : latestCollaborationState.goal_revision_interruption || null,
          },
        }) || latestWithFollowups;
        if (resumeAfterGoalRevisionInterruption) clearTaskCancellation(taskId);
        updateGroupTaskInlineStatus(resumedTask, "pending", resumedTask.status_detail);
        finalizeTaskKernel(task, execution, deliverySummary, "reviewing", resumeAfterGoalRevisionInterruption ? "当前轮次已停止，正在按新目标重核计划" : "当前轮次已完成，正在承接用户追加要求");
        addTaskLog(taskId, "info", resumeAfterGoalRevisionInterruption ? "当前执行轮次已停止，目标调整将在同一任务上下文中重新规划" : "当前执行轮次结束，用户追加要求将在同一任务上下文中继续");
        enqueueFollowupAfterRound = true;
        continue;
      }

      addTaskLog(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);

      if (task.workflow_type === "agent_coordination_dependency") {
        // executeTask persists the group-main verification receipt. Reloading
        // avoids accepting a stale task object before the dependency merge.
        const currentCoordinationTask = loadTasks().find((item: any) => item.id === task.id) || task;
        const coordinationRequest = getCoordinationRequestForTask(currentCoordinationTask);
        const coordinationReceipt = currentCoordinationTask.receipt || execution.receipt || null;
        const coordinationKernel = loadExecution(currentCoordinationTask.id);
        const coordinationAcceptance: any = coordinationRequest
          ? evaluateCoordinationTaskEvidence(currentCoordinationTask, coordinationRequest, coordinationReceipt, coordinationKernel)
          : buildRejectedCoordinationAcceptance(currentCoordinationTask, {}, coordinationReceipt, "找不到协调请求记录");
        const workspaceFiles = coordinationAcceptance.workspace_files || [];
        const green = evaluateGreenContract({
          receipt: coordinationReceipt,
          fileChanges: workspaceFiles,
          requiresChanges: taskRequiresCodeChanges(currentCoordinationTask),
          requiresVerification: currentCoordinationTask.requires_verification !== false,
          workspacePassed: coordinationAcceptance.accepted,
          branchFresh: coordinationAcceptance.branch_fresh === true,
          reviewPassed: coordinationAcceptance.accepted,
          requiredLevel: coordinationKernel?.workspace?.mode === "worktree" ? "merge_ready" : "project",
        });
        const priorRework = currentCoordinationTask?.workflow_meta?.coordination_dependency_rework || {};
        const reworkRound = Math.max(0, Number(priorRework.round || 0));
        const maxReworkRounds = Math.min(5, Math.max(0, Number(priorRework.max_rounds ?? process.env.CCM_COORDINATION_DEPENDENCY_REWORK_MAX ?? 2)));
        const shouldRework = !coordinationAcceptance.accepted
          && !!currentCoordinationTask?.main_agent_self_verification
          && reworkRound < maxReworkRounds;
        if (shouldRework) {
          const nextRound = reworkRound + 1;
          const reworkDetail = `群聊主 Agent 验收未通过，已返回 ${currentCoordinationTask.target_project} 进行第 ${nextRound}/${maxReworkRounds} 轮增量返工`;
          const reworkTask = updateTask(currentCoordinationTask.id, {
            status: "pending",
            acceptance_state: "reworking",
            status_detail: reworkDetail,
            test_agent_enabled: false,
            workflow_meta: {
              ...(currentCoordinationTask.workflow_meta || {}),
              coordination_dependency_rework: {
                round: nextRound,
                max_rounds: maxReworkRounds,
                instruction: coordinationAcceptance.reason,
                requested_at: new Date().toISOString(),
                verifier: "group_main_agent",
              },
            },
          }) || currentCoordinationTask;
          transitionExecution(currentCoordinationTask.id, "reviewing", reworkDetail, {
            green,
            receipt: coordinationReceipt,
            fileChanges: { files: workspaceFiles },
            runnerVerification: { status: "failed", verification: coordinationAcceptance.verification || [] },
            outputPreview: result,
            data: { coordination_acceptance: coordinationAcceptance, rework: { round: nextRound, max_rounds: maxReworkRounds } },
          });
          appendTaskTimelineEvent(currentCoordinationTask.id, {
            type: "group_main_dependency_rework_queued",
            title: `群聊主 Agent 验收未通过，${currentCoordinationTask.target_project} 正在返工`,
            detail: coordinationAcceptance.reason,
            status: "warn",
            phase: "reworking",
            agent: "group-main-agent",
            data: { round: nextRound, max_rounds: maxReworkRounds, test_agent_created: false },
          });
          updateGroupTaskInlineStatus(reworkTask, "pending", reworkDetail);
          settleTaskAgentCommunication(currentCoordinationTask.id, "rejected", {
            summary: reworkDetail,
            verificationResults: coordinationAcceptance.verification || [],
            result: { ...(coordinationReceipt || {}), filesChanged: workspaceFiles },
          });
          await ctx.onTaskStatusChange?.(reworkTask, "waiting", reworkDetail);
          enqueueFollowupAfterRound = true;
          continue;
        }
        const completedAt = new Date().toISOString();
        transitionExecution(currentCoordinationTask.id, coordinationAcceptance.accepted ? "succeeded" : "failed", coordinationAcceptance.reason, {
          green,
          receipt: coordinationReceipt,
          fileChanges: { files: workspaceFiles },
          runnerVerification: { status: coordinationAcceptance.accepted ? "passed" : "failed", verification: coordinationAcceptance.verification || [] },
          outputPreview: result,
          data: { coordination_acceptance: coordinationAcceptance },
        });
        const settledTask = updateTask(currentCoordinationTask.id, {
          status: coordinationAcceptance.accepted ? "done" : "failed",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: coordinationAcceptance.reason,
          receipt: coordinationReceipt,
          file_changes: { files: workspaceFiles },
          coordination_acceptance: coordinationAcceptance,
          completed_at: coordinationAcceptance.accepted ? completedAt : undefined,
          failed_at: coordinationAcceptance.accepted ? undefined : completedAt,
          execution_kernel: { execution_id: currentCoordinationTask.id, state: coordinationAcceptance.accepted ? "succeeded" : "failed", green, updated_at: completedAt },
        }) || currentCoordinationTask;
        settleTaskAgentCommunication(currentCoordinationTask.id, coordinationAcceptance.accepted ? "accepted" : "failed", {
          summary: coordinationAcceptance.reason,
          verificationResults: coordinationAcceptance.verification || [],
          result: { ...(execution.receipt || {}), filesChanged: workspaceFiles },
        });
        closeTaskAgentSessions({ taskId, groupId: currentCoordinationTask.group_id || undefined }, coordinationAcceptance.accepted ? "协作工作项已交付，等待群聊主 Agent 合并" : "协作工作项未通过群聊主 Agent 验收");
        updateGroupTaskInlineStatus(settledTask, coordinationAcceptance.accepted ? "done" : "failed", coordinationAcceptance.reason);
        addTaskLog(currentCoordinationTask.id, coordinationAcceptance.accepted ? "success" : "warning", coordinationAcceptance.reason);
        await ctx.onTaskStatusChange?.(settledTask, coordinationAcceptance.accepted ? "done" : "failed", coordinationAcceptance.reason);
        continue;
      }

      if (execution.status === "blocked") {
        const deliverySummary = buildDeliverySummary(task, execution, "failed");
        const detail = execution.detail || "独立验收三轮后仍未通过，等待用户处理";
        const blockedTask = updateTask(taskId, {
          status: "blocked",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: detail,
          receipt: execution.receipt || null,
          review: execution.review || execution.testAgent || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: deliverySummary,
          reasoning_loop: deliverySummary.reasoning_loop,
          acceptance_state: "blocked",
        }) || { ...task, status: "blocked", result: result.substring(0, 500) };
        settleTaskAgentCommunication(taskId, "failed", { summary: detail, result: execution.receipt || execution });
        updateGroupTaskInlineStatus(blockedTask, "failed", detail);
        finalizeTaskKernel(task, execution, deliverySummary, "failed", detail);
        addTaskLog(taskId, "warning", `任务已阻塞：${detail}`);
        syncTaskBacklogStatus(blockedTask, "blocked", detail);
        await ctx.onTaskStatusChange?.(blockedTask, "blocked", detail);
        appendTaskGroupReport(blockedTask, "waiting", detail);
        continue;
      }

      if (execution.status === "failed") {
        const deliverySummary = buildDeliverySummary(task, execution, "failed");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收门禁", detail: `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: "fail", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        const failedTask = updateTask(taskId, {
          status: "failed",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: execution.detail || "Agent 回执失败",
          receipt: execution.receipt || null,
          review: execution.review || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: deliverySummary,
          reasoning_loop: deliverySummary.reasoning_loop,
        }) || { ...task, status: "failed", result: result.substring(0, 500) };
        settleTaskAgentCommunication(taskId, "failed", { summary: execution.detail || "Agent 回执失败", result: execution.receipt || execution });
        updateGroupTaskInlineStatus(failedTask, "failed", execution.detail || "Agent 回执失败");
        finalizeTaskKernel(task, execution, deliverySummary, "failed", execution.detail || "Agent 回执失败");
        addTaskLog(taskId, "error", `❌ 任务执行失败：${execution.detail || "Agent 回执失败"}`);
        syncTaskBacklogStatus(failedTask, "blocked", execution.detail || result.substring(0, 500));
        await ctx.onTaskStatusChange?.(failedTask, "failed", result.substring(0, 500));
        appendTaskGroupReport(failedTask, "failed", execution.detail || result.substring(0, 500));
        await sendTaskFailureNotification(failedTask, execution.detail || result.substring(0, 500));
        continue;
      }

      const isCompleted = execution.status === "done";

      if (isCompleted) {
        updateTask(taskId, {
          status: "reviewing",
          acceptance_state: "main_agent_accepting",
          status_detail: "项目 Agent 与独立验收已结束，群聊主 Agent 正在执行最终验收与交付总结",
        });
        const deliverySummary = buildDeliverySummary(task, execution, "waiting");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: deliverySummary.acceptance_gate_passed ? "验收通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        if (!deliverySummary.acceptance_gate_passed) {
          const detail = `验收检查未通过：${deliverySummary.acceptance_gate?.failed_count || 1} 项缺口；自动返工已收口，等待用户检查后继续`;
          const blockedTask = updateTask(taskId, {
            status: "blocked",
            acceptance_state: "blocked",
            auto_execute: false,
            is_paused: true,
            paused: true,
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: detail,
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: deliverySummary,
            reasoning_loop: deliverySummary.reasoning_loop,
            ...buildReworkExhaustedUpdate(detail, { path: "group_review" }),
          }) || task;
          settleTaskAgentCommunication(taskId, "failed", { summary: detail, result: execution.receipt || execution });
          updateGroupTaskInlineStatus(blockedTask, "failed", detail);
          finalizeTaskKernel(task, execution, deliverySummary, "failed", detail);
          addTaskLog(taskId, "warning", detail);
          syncTaskBacklogStatus(blockedTask, "blocked", detail);
          await ctx.onTaskStatusChange?.(blockedTask, "blocked", detail);
          appendTaskGroupReport(blockedTask, "waiting", detail);
          continue;
        }
        const closedSessions = closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
        const finalizedExecution = { ...execution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item: any) => item.id) } };
        const finalizedDeliverySummary = buildDeliverySummary(task, finalizedExecution, "done");
        if (!finalizedDeliverySummary.acceptance_gate_passed) {
          const detail = `最终收尾门禁未通过：${finalizedDeliverySummary.acceptance_gate?.failed_checks?.map((item: any) => item.label).join("、") || "团队仍未完全收尾"}`;
          const blockedTask = updateTask(taskId, {
            status: "blocked",
            acceptance_state: "blocked",
            auto_execute: false,
            is_paused: true,
            paused: true,
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: detail,
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: finalizedDeliverySummary,
            reasoning_loop: finalizedDeliverySummary.reasoning_loop,
            ...buildReworkExhaustedUpdate(detail, { path: "group_review" }),
          }) || task;
          settleTaskAgentCommunication(taskId, "failed", { summary: detail, result: execution.receipt || execution });
          updateGroupTaskInlineStatus(blockedTask, "failed", detail);
          finalizeTaskKernel(task, finalizedExecution, finalizedDeliverySummary, "failed", detail);
          addTaskLog(taskId, "warning", detail);
          syncTaskBacklogStatus(blockedTask, "blocked", detail);
          await ctx.onTaskStatusChange?.(blockedTask, "blocked", detail);
          appendTaskGroupReport(blockedTask, "waiting", detail);
          continue;
        }
        const completedTask = updateTask(taskId, {
          status: "done",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: execution.detail || "验收通过",
          receipt: execution.receipt || null,
          review: execution.review || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: finalizedDeliverySummary,
          reasoning_loop: finalizedDeliverySummary.reasoning_loop,
          execution_readiness: null,
          daily_dev_execution_readiness: null,
          completed_at: new Date().toISOString()
        }) || { ...task, status: "done", result: result.substring(0, 500) };
        settleTaskAgentCommunication(taskId, "accepted", {
          summary: execution.detail || "验收通过",
          verificationResults: finalizedDeliverySummary?.verification_executed || [],
          result: execution.receipt || execution,
        });
        const projectMemoryResult = recordAcceptedProjectDeliveryMemory({ task: completedTask, deliverySummary: finalizedDeliverySummary });
        if (projectMemoryResult.committed) addTaskLog(taskId, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.projects.length} 个项目，${projectMemoryResult.durableCandidateCount} 条长期记录`);
        updateGroupTaskInlineStatus(completedTask, "done", execution.detail || "验收通过");
        finalizeTaskKernel(task, execution, finalizedDeliverySummary, "succeeded", execution.detail || "验收通过");
        addTaskLog(taskId, "success", `✅ 任务完成：${execution.detail || "验收通过"}`);
        syncTaskBacklogStatus(completedTask, "done", execution.detail || result.substring(0, 500));
        await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
        appendTaskGroupReport(completedTask, "done", execution.detail || result.substring(0, 500));
        await sendTaskCompletionNotification(completedTask, result);
      } else {
        const deliverySummary = buildDeliverySummary(task, execution, "waiting");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: deliverySummary.acceptance_gate_passed ? "验收通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过，任务继续推进`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        if (canCompleteDailyDevFromDeliverySummary(task, execution, deliverySummary)) {
          updateTask(taskId, {
            status: "reviewing",
            acceptance_state: "main_agent_accepting",
            status_detail: "执行证据已齐全，群聊主 Agent 正在执行最终验收与交付总结",
          });
          const promotedExecution = {
            ...execution,
            status: "done",
            detail: "daily_dev 验收证据齐全，系统自动完成",
          };
          const promotedSummary = buildDeliverySummary(task, promotedExecution, "waiting");
          appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: promotedSummary.acceptance_gate_passed ? "验收通过并自动完成" : `${promotedSummary.acceptance_gate?.failed_count || 0} 项未通过`, status: promotedSummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: promotedSummary.acceptance_gate || {} });
          const closedSessions = closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
          const finalizedPromotedExecution = { ...promotedExecution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item: any) => item.id) } };
          const finalizedPromotedSummary = buildDeliverySummary(task, finalizedPromotedExecution, "done");
          if (!finalizedPromotedSummary.acceptance_gate_passed) {
            const detail = `最终收尾门禁未通过：${finalizedPromotedSummary.acceptance_gate?.failed_checks?.map((item: any) => item.label).join("、") || "团队仍未完全收尾"}`;
            const blockedTask = updateTask(taskId, {
              status: "blocked",
              acceptance_state: "blocked",
              auto_execute: false,
              is_paused: true,
              paused: true,
              result: result.substring(0, 500),
              final_report: execution.report || result,
              status_detail: detail,
              receipt: execution.receipt || null,
              review: execution.review || null,
              file_changes: execution.fileChanges || null,
              delivery_summary: finalizedPromotedSummary,
              reasoning_loop: finalizedPromotedSummary.reasoning_loop,
              ...buildReworkExhaustedUpdate(detail, { path: "group_review" }),
            }) || task;
            settleTaskAgentCommunication(taskId, "failed", { summary: detail, result: execution.receipt || execution });
            updateGroupTaskInlineStatus(blockedTask, "failed", detail);
            finalizeTaskKernel(task, finalizedPromotedExecution, finalizedPromotedSummary, "failed", detail);
            addTaskLog(taskId, "warning", detail);
            syncTaskBacklogStatus(blockedTask, "blocked", detail);
            await ctx.onTaskStatusChange?.(blockedTask, "blocked", detail);
            appendTaskGroupReport(blockedTask, "waiting", detail);
            continue;
          }
          const completedTask = updateTask(taskId, {
            status: "done",
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: promotedExecution.detail,
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: finalizedPromotedSummary,
            reasoning_loop: finalizedPromotedSummary.reasoning_loop,
            execution_readiness: null,
            daily_dev_execution_readiness: null,
            completed_at: new Date().toISOString()
          }) || { ...task, status: "done", result: result.substring(0, 500) };
          settleTaskAgentCommunication(taskId, "accepted", {
            summary: promotedExecution.detail,
            verificationResults: finalizedPromotedSummary?.verification_executed || [],
            result: execution.receipt || execution,
          });
          const projectMemoryResult = recordAcceptedProjectDeliveryMemory({ task: completedTask, deliverySummary: finalizedPromotedSummary });
          if (projectMemoryResult.committed) addTaskLog(taskId, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.projects.length} 个项目，${projectMemoryResult.durableCandidateCount} 条长期记录`);
          updateGroupTaskInlineStatus(completedTask, "done", promotedExecution.detail);
          finalizeTaskKernel(task, promotedExecution, finalizedPromotedSummary, "succeeded", promotedExecution.detail);
          addTaskLog(taskId, "success", `✅ 任务完成：${promotedExecution.detail}`);
          syncTaskBacklogStatus(completedTask, "done", promotedExecution.detail);
          await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
          appendTaskGroupReport(completedTask, "done", promotedExecution.detail);
          await sendTaskCompletionNotification(completedTask, result);
        } else {
          const shouldRequeue = execution.requeue === true;
          const waitingTask = updateTask(taskId, {
            status: shouldRequeue ? "pending" : "blocked",
            acceptance_state: shouldRequeue ? (task.acceptance_state || "pending") : "blocked",
            auto_execute: shouldRequeue ? task.auto_execute !== false : false,
            is_paused: shouldRequeue ? false : true,
            paused: shouldRequeue ? false : true,
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: execution.detail || "等待补充信息或返工",
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: deliverySummary,
            reasoning_loop: deliverySummary.reasoning_loop,
            collaboration_state: shouldRequeue
              ? { ...(task.collaboration_state || {}), phase: "reworking", needs_user: false, updated_at: new Date().toISOString() }
              : { ...(task.collaboration_state || {}), phase: "needs_user", needs_user: true, updated_at: new Date().toISOString() },
          }) || { ...task, status: shouldRequeue ? "pending" : "blocked", result: result.substring(0, 500) };
          settleTaskAgentCommunication(taskId, shouldRequeue ? "rejected" : "failed", {
            summary: execution.detail || "等待补充信息或返工",
            result: execution.receipt || execution,
          });
          updateGroupTaskInlineStatus(waitingTask, shouldRequeue ? "pending" : "failed", execution.detail || "等待补充信息或返工");
          finalizeTaskKernel(task, execution, deliverySummary, shouldRequeue ? "reviewing" : "failed", execution.detail || "等待补充信息或返工");
          addTaskLog(taskId, "warning", `任务仍需继续：${execution.detail || "验收未完成"}`);
          syncTaskBacklogStatus(waitingTask, shouldRequeue ? "queued" : "blocked", execution.detail || result.substring(0, 500));
          await ctx.onTaskStatusChange?.(waitingTask, "waiting", result.substring(0, 500));
          appendTaskGroupReport(waitingTask, "waiting", execution.detail || result.substring(0, 500));
          if (!shouldRequeue) appendTaskTimelineEvent(taskId, { type: "queue_task_blocked", title: "任务已暂停并释放队列", detail: execution.detail || "等待用户补充信息后继续", status: "warn", phase: "needs_user", data: { target_key: targetKey, queue_released: true } });
          if (shouldRequeue) enqueueFollowupAfterRound = true;
        }
      }
    } catch (error: any) {
      console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
      if (String(error?.code || "") === "CCM_TASK_PAUSE_SAFE_BOUNDARY") {
        const pausedTask = loadTasks().find((item: any) => item.id === taskId) || task;
        updateTask(taskId, {
          status_detail: "已到达安全暂停点，正在确认所有写入均已停止",
          acceptance_state: pausedTask.acceptance_state || "executing",
        });
        updateGroupTaskInlineStatus(pausedTask, "paused", "正在收口并保留代码现场");
        addTaskLog(taskId, "info", `已在“${String(error?.phase || pausedTask.acceptance_state || "当前") }”阶段到达安全暂停点`);
        scheduleTaskPauseFinalization(taskId);
        continue;
      }
      if (String(error?.code || "") === "CCM_AGENT_COMMUNICATION_CAPACITY_WAIT") {
        const capacity = error?.capacity || {};
        const waitingTask = updateTask(taskId, {
          status: "pending",
          queue_state: "capacity_wait",
          queue_capacity_reason: capacity.reason || "capacity_limit",
          queue_position: capacity.position || 1,
          status_detail: `第三方 Agent 并发容量已满，保留队列等待（${capacity.reason || "capacity_limit"}）`,
        }) || task;
        addTaskLog(taskId, "info", waitingTask.status_detail);
        appendTaskTimelineEvent(taskId, { type: "agent_capacity_wait", title: "等待第三方 Agent 并发容量", detail: waitingTask.status_detail, status: "active", phase: "queued", data: { reason: capacity.reason || "capacity_limit", position: capacity.position || 1 } });
        await ctx.onTaskStatusChange?.(waitingTask, "waiting", waitingTask.status_detail);
        enqueueFollowupAfterRound = true;
        continue;
      }
      const failure = classifyExecutionFailure(error);
      const latestWithFollowups = loadTasks().find((item: any) => item.id === taskId) || task;
      const alreadyInterrupted = latestWithFollowups?.interruption_receipt?.schema === "ccm-task-interruption-receipt-v1"
        && latestWithFollowups?.acceptance_state === "recovery_required";
      if (alreadyInterrupted) {
        updateGroupTaskInlineStatus(latestWithFollowups, "blocked", latestWithFollowups.status_detail || "当前执行已停止，可恢复原任务");
        finalizeTaskKernel(task, buildTaskExecutionResult("waiting", "当前执行已停止，可恢复原任务", { detail: latestWithFollowups.status_detail || "当前执行已停止" }), latestWithFollowups.delivery_summary || null, "cancelled", "当前执行已停止，子 Agent 会话已挂起");
        addTaskLog(taskId, "warning", "当前执行已停止；任务、计划和子 Agent 会话已保留，未转换为永久取消");
        await ctx.onTaskStatusChange?.(latestWithFollowups, "blocked", latestWithFollowups.status_detail || "等待恢复任务");
        appendTaskGroupReport(latestWithFollowups, "waiting", latestWithFollowups.status_detail || "当前执行已停止，等待恢复");
        continue;
      }
      const cancelled = failure.failureClass === "cancelled" || isTaskCancellationRequested(taskId);
      if (cancelled && shouldResumeAfterGoalRevisionInterruption(latestWithFollowups, executionFollowupRevision)) {
        const pending = Array.isArray(latestWithFollowups.pending_followups) ? latestWithFollowups.pending_followups : [];
        const acceptedAt = new Date().toISOString();
        const interruptedExecution = buildTaskExecutionResult("waiting", "当前执行轮已按目标调整停止，等待重新核对计划", { detail: "目标调整触发当前执行轮停止" });
        const interruptedDeliverySummary = buildDeliverySummary(latestWithFollowups, interruptedExecution, "waiting");
        const latestCollaborationState = latestWithFollowups.collaboration_state || {};
        const lastContinuation = latestCollaborationState.last_continuation
          ? { ...latestCollaborationState.last_continuation, status: "accepted", resumed_at: acceptedAt }
          : latestCollaborationState.last_continuation;
        const resumedTask = updateTask(taskId, {
          status: "pending",
          result: "当前执行轮已停止，等待主 Agent 重新核对计划",
          final_report: "",
          delivery_summary: interruptedDeliverySummary,
          reasoning_loop: interruptedDeliverySummary.reasoning_loop,
          consumed_followup_revision: Number(latestWithFollowups.followup_revision || 0),
          pending_followups: pending.map((item: any) => ({ ...item, status: "accepted", accepted_at: acceptedAt })),
          status_detail: buildGoalRevisionInterruptedStatus(pending),
          plan_revision_required: true,
          collaboration_state: {
            ...latestCollaborationState,
            phase: "reworking",
            needs_user: false,
            last_continuation: lastContinuation,
            continuation_resumed_at: acceptedAt,
            goal_revision_interruption: { ...(latestCollaborationState.goal_revision_interruption || {}), resolved_at: acceptedAt, resumed: true },
          },
        }) || latestWithFollowups;
        clearTaskCancellation(taskId);
        updateGroupTaskInlineStatus(resumedTask, "pending", resumedTask.status_detail);
        finalizeTaskKernel(task, interruptedExecution, interruptedDeliverySummary, "reviewing", "当前轮次已停止，正在按新目标重核计划");
        addTaskLog(taskId, "warning", "目标调整已停止当前执行轮，任务保持同一上下文并重新入队");
        syncTaskBacklogStatus(resumedTask, "in_progress", resumedTask.status_detail);
        await ctx.onTaskStatusChange?.(resumedTask, "waiting", resumedTask.status_detail);
        enqueueFollowupAfterRound = true;
        continue;
      }
      const retryExhausted = String(error?.code || "") === "CCM_MODEL_RETRY_EXHAUSTED";
      const streamInterrupted = String(error?.code || "") === "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA";
      const temporaryInterruption = retryExhausted || streamInterrupted
        || ["network", "gateway_routing", "timeout", "provider", "infra", "lease_lost"].includes(String(failure.failureClass || ""));
      if (!cancelled && temporaryInterruption) {
        const reasonCode = String(failure.failureClass || "") === "lease_lost"
          ? "lease_lost"
          : streamInterrupted
            ? "model_stream_interrupted"
            : String(failure.failureClass || "") === "infra"
              ? "agent_runtime_unavailable"
          : retryExhausted
            ? "provider_unavailable"
            : ["network", "gateway_routing", "timeout"].includes(String(failure.failureClass || ""))
              ? "temporary_network"
              : "provider_overload";
        const resumeCheckpoint = latestWithFollowups.resume_checkpoint || latestWithFollowups.interruption_receipt?.resume_checkpoint || undefined;
        const interruptionWorkspace = captureTaskRecoveryWorkspace(latestWithFollowups);
        const interruption = interruptTaskExecution({
          task: latestWithFollowups,
          reasonCode: reasonCode as any,
          reason: String(error?.message || "模型或网络暂时不可用，当前执行已安全中断").slice(0, 500),
          actor: "group-task-runtime",
          checkpoint: latestWithFollowups.acceptance_state || "executing",
          workspaceChecksum: interruptionWorkspace.checksum,
          changedFileCount: interruptionWorkspace.changedFileCount,
          resumeCheckpoint,
          sideEffectState: resumeCheckpoint?.workspaceChecksum && resumeCheckpoint.workspaceChecksum === interruptionWorkspace.checksum ? "committed" : "uncertain",
        });
        const recovery = interruption.receipt.recovery;
        const interruptedTask = updateTask(taskId, {
          status: "blocked",
          acceptance_state: "recovery_required",
          auto_execute: interruption.receipt.auto_resume_allowed,
          is_paused: !interruption.receipt.auto_resume_allowed,
          paused: !interruption.receipt.auto_resume_allowed,
          recovery_pending: true,
          recovery,
          interruption_receipt: interruption.receipt,
          interrupted_at: interruption.receipt.interrupted_at,
          status_detail: interruption.receipt.auto_resume_allowed
            ? `${reasonCode === "agent_runtime_unavailable" ? "项目 Agent 执行通道暂时不可用" : "模型或网络暂时不可用"}，任务现场已保留；将在安全退避后从“${resumeCheckpoint?.phase || latestWithFollowups.acceptance_state || "当前"}”阶段继续`
            : "当前执行已中断，任务现场和子 Agent 会话已保留；需要重新核验或人工接管",
        }) || latestWithFollowups;
        updateGroupTaskInlineStatus(interruptedTask, "blocked", interruptedTask.status_detail);
        finalizeTaskKernel(task, buildTaskExecutionResult("waiting", interruptedTask.status_detail, { detail: interruptedTask.status_detail }), interruptedTask.delivery_summary || null, "cancelled", interruptedTask.status_detail);
        addTaskLog(taskId, "warning", interruptedTask.status_detail);
        appendTaskTimelineEvent(taskId, { type: "task_interrupted", title: "当前执行已中断", detail: interruptedTask.status_detail, status: "warn", phase: "recovery_required", data: { reason_code: interruption.receipt.reason_code, receipt_checksum: interruption.receipt.checksum } });
        syncTaskBacklogStatus(interruptedTask, "blocked", interruptedTask.status_detail);
        await ctx.onTaskStatusChange?.(interruptedTask, "blocked", interruptedTask.status_detail);
        appendTaskGroupReport(interruptedTask, "waiting", interruptedTask.status_detail);
        continue;
      }
      const failedExecution = buildTaskExecutionResult("failed", `执行失败: ${error.message}`, { detail: String(error.message || "执行失败") });
      const failedDeliverySummary = buildDeliverySummary(task, failedExecution, "failed");
      const failedTask = updateTask(taskId, {
        status: cancelled ? "cancelled" : "failed",
        result: cancelled ? "任务已取消" : `执行失败: ${error.message}`,
        status_detail: String(error.message || "执行失败").slice(0, 500),
        failure_class: failure.failureClass,
        delivery_summary: failedDeliverySummary,
        reasoning_loop: failedDeliverySummary.reasoning_loop,
      }) || { ...task, status: cancelled ? "cancelled" : "failed", result: cancelled ? "任务已取消" : `执行失败: ${error.message}` };
      settleTaskAgentCommunication(taskId, cancelled ? "cancelled" : "failed", {
        summary: cancelled ? "任务已由用户取消" : String(error.message || "执行失败"),
        sideEffectState: failedTask.git_commit_receipt || failedTask.deployment_receipt ? "uncertain" : "none",
      });
      updateGroupTaskInlineStatus(failedTask, cancelled ? "cancelled" : "failed", cancelled ? "任务已由用户取消" : String(error.message || "执行失败"));
      finalizeTaskKernel(task, failedExecution, failedTask.delivery_summary, cancelled ? "cancelled" : "failed", cancelled ? "任务已由用户取消" : error.message);
      if (cancelled) {
        closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "任务已取消，关闭任务级原生会话");
        clearTaskCancellation(taskId);
      }
      addTaskLog(taskId, cancelled ? "warning" : "error", cancelled ? "任务已取消，运行中的 Agent 进程已终止" : `❌ 任务执行失败: ${error.message}`);
      syncTaskBacklogStatus(failedTask, "blocked", error.message);
      await ctx.onTaskStatusChange?.(failedTask, cancelled ? "cancelled" : "failed", String(error.message || ""));
      appendTaskGroupReport(failedTask, cancelled ? "waiting" : "failed", cancelled ? "任务已取消" : error.message);
      if (!cancelled) await sendTaskFailureNotification(failedTask, error.message);
    } finally {
      if (leaseHeartbeat) clearInterval(leaseHeartbeat);
      runningTaskIds.delete(taskId);
      const finalTask = loadTasks().find((item: any) => item.id === taskId);
      if (finalTask?.workflow_type === "agent_coordination_dependency" && !isTaskPauseRequested(finalTask) && !isTaskSafelyPaused(finalTask)) {
        try { await settleGroupCoordinationDependency(finalTask, ctx); }
        catch (error: any) { addTaskLog(taskId, "error", `协作工作项收口失败：${error?.message || error}`); }
      }
      releaseTaskLease(taskId, finalTask?.status || "unknown");
      if (enqueueFollowupAfterRound && finalTask && finalTask.status !== "cancelled") enqueueTask(taskId, ctx);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
  } finally {
    runningTasks.delete(targetKey);
    console.log(`[任务队列] [${targetKey}] 队列处理完成`);
  }
}

export function enqueueTask(taskId: string, ctx: CollabCtx) {
  return require("./collaboration-task-runtime").enqueueTask(taskId, ctx);
}

export function createAndQueueTask(task: any, ctx: CollabCtx) {
  return require("./collaboration-task-runtime").createAndQueueTask(task, ctx);
}

export function backfillTaskTraceIds() {
  const tasks = loadTasks();
  let changed = 0;
  for (const task of tasks) {
    if (task.trace_id) continue;
    task.trace_id = createTraceId("task");
    task.updated_at = task.updated_at || new Date().toISOString();
    appendTraceEvent(task.trace_id, { id: `task:${task.id}:trace-backfill`, type: "task.trace_backfilled", status: "info", task_id: task.id, group_id: task.group_id || "", agent: task.target_project || "", message: "历史任务已补齐统一 Trace ID", data: { original_created_at: task.created_at || "" } });
    changed++;
  }
  if (changed) saveTasks(tasks);
  return changed;
}

export function resumeTaskQueues(ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-task-runtime").resumeTaskQueues(ctx, options);
}

export function getQueueStatus(taskSnapshot?: any[]) {
  let totalQueued = 0;
  const targetStatus: any = {};

  for (const [targetKey, queue] of taskQueues.entries()) {
    totalQueued += queue.length;
    targetStatus[targetKey] = {
      queued: queue.length,
      running: runningTasks.has(targetKey)
    };
  }

  const tasks = Array.isArray(taskSnapshot) ? taskSnapshot : loadTasks();
  const unifiedScheduler = getUnifiedTaskSchedulerStatus();
  return {
    total_queued: totalQueued,
    running_targets: runningTasks.size,
    target_status: targetStatus,
    pending_tasks: tasks.filter(t => t.status === "pending").length,
    in_progress_tasks: tasks.filter(t => t.status === "in_progress").length,
    failed_tasks: tasks.filter(t => t.status === "failed").length,
    running_task_ids: Array.from(runningTaskIds),
    unified_scheduler: unifiedScheduler,
    unified_queued: unifiedScheduler.queued,
    unified_running_lanes: unifiedScheduler.running_lanes.length,
    workspace_mutation_lanes: unifiedScheduler.workspace_lanes,
  };
}

export function getTaskTargetKeyFromTask(task: any) {
  if (task?.queue_scope === "isolated_parallel" && task?.id) return `isolated:${task.target_project || "unknown"}:${task.id}`;
  if (task?.queue_scope === "conversation_serial") {
    const projectSessionId = String(task.project_session_id || task.projectSessionId || "").trim();
    const groupSessionId = String(task.group_session_id || task.groupSessionId || "").trim();
    if (task?.assign_type === "group" && task?.group_id && groupSessionId) return `conversation:group:${task.group_id}:${groupSessionId}`;
    if (task?.target_project && projectSessionId) return `conversation:project:${task.target_project}:${projectSessionId}`;
  }
  if (task?.assign_type === "group" && task?.group_id) return `group:${task.group_id}`;
  return `project:${task?.target_project || "unknown"}`;
}

export function isTaskQueuedInMemory(taskId: string) {
  for (const queue of taskQueues.values()) {
    if (queue.includes(taskId)) return true;
  }
  return false;
}

export function getTaskAgeMs(task: any, now = Date.now()) {
  const time = Date.parse(task?.updated_at || task?.started_at || task?.queued_at || task?.created_at || "");
  return Number.isFinite(time) ? Math.max(0, now - time) : 0;
}

// ===== merged from collaboration-runtime-coordinator-review-part-02.ts =====

export function isWatchdogGapReworkCandidate(task: any, now = Date.now(), cooldownMs = TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, maxCount = TASK_WATCHDOG_GAP_REWORK_MAX) {
  if (!task?.auto_execute || task.status === "done" || isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id)) return false;
  if (!hasDailyDevContinuationGaps(task)) return false;
  if (!canAutoContinueTaskGaps(task)) return false;
  if (Number(task.auto_gap_continue_count || 0) >= maxCount) return false;
  return getTaskAgeMs(task, now) >= cooldownMs;
}

export function hasFreshSuccessfulAgentProbe(readiness: any) {
  return require("./collaboration-agent-probes").hasFreshSuccessfulAgentProbe(readiness);
}

export function getTaskWatchdogStatus(staleMs = TASK_WATCHDOG_STALE_MS, gapCooldownMs = TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, gapMaxCount = TASK_WATCHDOG_GAP_REWORK_MAX, taskSnapshot?: any[]) {
  return require("./collaboration-task-runtime").getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount, taskSnapshot);
}

export function runTaskWatchdog(ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-task-runtime").runTaskWatchdog(ctx, options);
}

export function cleanupRuntimeDebt(options: any = {}) {
  const dryRun = options.dry_run === true || options.dryRun === true;
  const includePending = options.include_pending !== false && options.includePending !== false;
  const includeInProgress = options.include_in_progress !== false && options.includeInProgress !== false;
  const status = getTaskWatchdogStatus(Number(options.stale_ms || options.staleMs || TASK_WATCHDOG_STALE_MS));
  const candidates = [
    ...(includePending ? status.stale_pending.map((item: any) => ({ ...item, debt_type: "stale_pending" })) : []),
    ...(includeInProgress ? status.stalled_in_progress.map((item: any) => ({ ...item, debt_type: "stalled_in_progress" })) : []),
  ];
  const results: any[] = [];
  for (const item of candidates) {
    const task = loadTasks().find((entry: any) => entry.id === item.id);
    if (!task || task.status === "done" || task.status === "cancelled" || task.status === "archived") continue;
    const detail = item.debt_type === "stalled_in_progress"
      ? "运行治理中心清理：任务长时间处于执行中但没有活跃运行，已暂停等待用户处理"
      : "运行治理中心清理：任务长时间待执行但未入队，已暂停等待用户处理";
    if (!dryRun) {
      const removedFromQueue = removeTaskFromQueues(task.id);
      releaseTaskLease(task.id, "runtime_debt_cleanup");
      clearTaskCancellation(task.id);
      const updated = updateTask(task.id, {
        status: "needs_user",
        auto_execute: false,
        is_paused: true,
        paused: true,
        recovery_pending: true,
        status_detail: detail,
        runtime_debt_cleanup: {
          cleaned_at: new Date().toISOString(),
          debt_type: item.debt_type,
          previous_status: task.status,
          removed_from_queue: removedFromQueue,
        },
      });
      addTaskLog(task.id, "warning", detail);
      appendTaskTimelineEvent(task.id, { type: "runtime_debt_cleanup", title: "运行债务已暂停", detail, status: "warn", phase: "needs_user", data: { debt_type: item.debt_type, removed_from_queue: removedFromQueue } });
      results.push({ task_id: task.id, debt_type: item.debt_type, cleaned: true, removed_from_queue: removedFromQueue, status: updated?.status || "needs_user" });
    } else {
      results.push({ task_id: task.id, debt_type: item.debt_type, cleaned: false, dry_run: true, status: task.status, title: task.title });
    }
  }
  return {
    success: true,
    dry_run: dryRun,
    total: candidates.length,
    cleaned: results.filter(item => item.cleaned).length,
    results,
    status: dryRun ? status : getTaskWatchdogStatus(),
  };
}

export function getAgentRecoveryWorkSummary() {
  const tasks = loadTasks();
  const blockedPending = tasks
    .filter(isAgentExecutionBlockedPendingTask)
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      target_key: getTaskTargetKeyFromTask(task),
      blocked_at: task.last_queue_blocked_at || null,
      status_detail: String(task.status_detail || "").slice(0, 300),
    }));
  const runtimeFailed = tasks
    .filter(isRecoverableRuntimeFailure)
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      target_key: getTaskTargetKeyFromTask(task),
      retry_count: Number(task.retry_count || 0),
      reason: getTaskFailureText(task).slice(0, 300),
    }));
  return {
    blocked_pending: blockedPending,
    runtime_failed: runtimeFailed,
    total: blockedPending.length + runtimeFailed.length,
  };
}

export function getAgentRecoveryProbePayload(target: any = {}) {
  const normalized = normalizeAgentProbeTarget(target);
  const payload: any = {};
  if (normalized.groupId) payload.group_id = normalized.groupId;
  if (normalized.project) payload.target_member = normalized.project;
  return payload;
}

export function taskMatchesAgentProbeTarget(task: any, target: any = null) {
  return require("./collaboration-agent-probes").taskMatchesAgentProbeTarget(task, target);
}

export function buildAgentRecoveryProbeGroups(tasks: any[]) {
  return require("./collaboration-task-runtime").buildAgentRecoveryProbeGroups(tasks);
}

export function getAgentRecoveryProbeGroups(taskSnapshot?: any[]) {
  const tasks = (Array.isArray(taskSnapshot) ? taskSnapshot : loadTasks()).filter((task: any) => isAgentExecutionBlockedPendingTask(task) || isRecoverableRuntimeFailure(task));
  return buildAgentRecoveryProbeGroups(tasks);
}

export function aggregateBlockedRecovery(results: any[]) {
  const flattened = results.flatMap((item: any) => Array.isArray(item?.results) ? item.results : []);
  return {
    total_blocked: results.reduce((sum: number, item: any) => sum + Number(item?.total_blocked || 0), 0),
    recovered: results.reduce((sum: number, item: any) => sum + Number(item?.recovered || 0), 0),
    results: flattened,
  };
}

export function aggregateRuntimeRecovery(results: any[]) {
  const flattened = results.flatMap((item: any) => Array.isArray(item?.results) ? item.results : []);
  return {
    success: true,
    total_recoverable: results.reduce((sum: number, item: any) => sum + Number(item?.total_recoverable || 0), 0),
    retried: results.reduce((sum: number, item: any) => sum + Number(item?.retried || 0), 0),
    queued: results.reduce((sum: number, item: any) => sum + Number(item?.queued || 0), 0),
    auto_execute: results.some((item: any) => item?.auto_execute !== false),
    results: flattened,
    queue_status: getQueueStatus(),
  };
}

export function recoverAgentExecutionBlockedTasks(ctx: CollabCtx, reason = "执行通道恢复后自动重新入队", options: any = {}) {
  const probeTarget = options.probeTarget || options.probe_target || null;
  const candidates = (Array.isArray(options.taskSnapshot) ? options.taskSnapshot : loadTasks())
    .filter(isAgentExecutionBlockedPendingTask)
    .filter((task: any) => taskMatchesAgentProbeTarget(task, probeTarget))
    .filter((task: any) => {
      const recovery = task?.recovery || task?.interruption_receipt?.recovery || {};
      if (recovery.mode === "manual" || recovery.state === "needs_user") return false;
      return !recovery.nextRetryAt || Date.parse(recovery.nextRetryAt) <= Date.now();
    });
  const results: any[] = [];
  for (const task of candidates) {
    const readiness = getTaskAgentExecutionReadiness(task);
    if (!readiness.ready) {
      results.push({ task_id: task.id, queued: false, skipped: true, reason: "task_readiness_not_satisfied", message: readiness.message, readiness });
      continue;
    }
    updateTask(task.id, {
      status: "pending",
      status_detail: reason,
      execution_readiness: null,
      recovery_pending: false,
      recovery: {
        ...(task.recovery || task.interruption_receipt?.recovery || {}),
        mode: "safe_auto",
        state: "queued",
        attempt: Math.max(0, Number(task?.recovery?.attempt || task?.interruption_receipt?.recovery?.attempt || 0)) + 1,
        recovered_at: new Date().toISOString(),
        nextRetryAt: undefined,
      },
      recovered_after_agent_probe_at: new Date().toISOString(),
    });
    addTaskLog(task.id, "info", reason);
    results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
  }
  return {
    total_blocked: candidates.length,
    recovered: results.filter(item => item.queued).length,
    results,
  };
}

export function runAgentRecoveryMonitorOnce(ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-task-runtime").runAgentRecoveryMonitorOnce(ctx, options);
}

export function startAgentRecoveryMonitor(ctx: CollabCtx) {
  return require("./collaboration-task-runtime").startAgentRecoveryMonitor(ctx);
}

export function stopAgentRecoveryMonitor() {
  return require("./collaboration-task-runtime").stopAgentRecoveryMonitor();
}

export function startTaskWatchdog(ctx: CollabCtx) {
  return require("./collaboration-task-runtime").startTaskWatchdog(ctx);
}

export function stopTaskWatchdog() {
  return require("./collaboration-task-runtime").stopTaskWatchdog();
}

function getRuntimeMonitorControlStatus() {
  return {
    task_watchdog_active: !!taskWatchdogTimer,
    agent_recovery_monitor_active: !!agentRecoveryMonitorTimer,
    agent_recovery_probe_in_flight: agentRecoveryProbeInFlight,
  };
}

export function applyRuntimeMonitorControl(action: string, ctx: CollabCtx) {
  const normalized = String(action || "status").trim().toLowerCase();
  if (normalized === "stop" || normalized === "pause") {
    stopTaskWatchdog();
    stopAgentRecoveryMonitor();
    return { success: true, action: "stop", ...getRuntimeMonitorControlStatus() };
  }
  if (normalized === "start" || normalized === "resume") {
    startTaskWatchdog(ctx);
    startAgentRecoveryMonitor(ctx);
    return { success: true, action: "start", ...getRuntimeMonitorControlStatus() };
  }
  return { success: true, action: "status", ...getRuntimeMonitorControlStatus() };
}

export function createDiagnosticCheck(id: string, label: string, status: "ok" | "warn" | "fail", message: string, detail: any = undefined) {
  return { id, label, status, message, ...(detail !== undefined ? { detail } : {}) };
}

const GROUP_MAIN_AGENT_ACTIONS = [
  {
    id: "read_group_context",
    label: "读取群聊上下文",
    category: "context",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: false,
    backend: ["buildGroupContextPacket", "buildRecentGroupContext", "buildGroupMemoryContext"],
    evidence: ["recent_messages", "group_memory", "active_goal"],
    description: "读取当前群聊最近消息、压缩摘要、当前目标和协作记忆，作为主 Agent 判断的第一层上下文。",
  },
  {
    id: "read_project_code_snapshot",
    label: "读取项目代码快照",
    category: "context",
    risk: "read",
    permissionMode: "auto_read_in_conversation",
    userVisible: false,
    backend: ["buildGroupProjectAnalysisContext", "buildProjectCodeReadOnlySnapshot"],
    evidence: ["safe_file_snippets", "project_memory", "work_dir"],
    description: "只读读取群聊绑定项目的有限代码片段，过滤密钥、依赖和构建产物，用于项目分析和任务前理解。",
  },
  {
    id: "query_knowledge_base",
    label: "查询知识库",
    category: "context",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: false,
    backend: ["queryKnowledgeBase"],
    evidence: ["rag_citations", "matched_documents"],
    description: "检索本地知识库，为回答、计划或子 Agent 工作单提供依据；知识库内容不等于执行授权。",
  },
  {
    id: "inspect_task_status",
    label: "查看任务状态",
    category: "observe",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: true,
    backend: ["loadTasks", "buildInlineTaskRuntime", "listExecutions", "listTaskAgentSessions"],
    evidence: ["task_status", "execution_state", "session_state"],
    description: "查看任务、执行器、会话、时间线和验收状态，用于判断继续、等待、返工还是回复用户。",
  },
  {
    id: "restore_task_context",
    label: "恢复任务上下文",
    category: "context",
    risk: "read",
    permissionMode: "auto_on_recovery",
    userVisible: true,
    backend: ["buildTaskPreflightReasoning", "recordReasoningRecoveryCheck", "resumeTaskQueues", "reopenTaskAgentSessions"],
    evidence: ["recovery_checks", "task_recovery", "work_items", "session_state"],
    description: "服务重启、执行器重试或用户继续旧任务时，重新灌回原始目标、未完成 Todo、执行队列和可恢复会话。",
  },
  {
    id: "create_project_task",
    label: "创建项目任务",
    category: "act",
    risk: "write",
    permissionMode: "requires_current_execution_intent",
    userVisible: true,
    backend: ["createTask", "shouldCreatePersistentGroupTask", "getInitialWorkflowMeta"],
    evidence: ["task_id", "task_card", "workflow_meta"],
    description: "只有当前用户消息明确要求实现/修改/修复/执行时，才创建持久任务卡。",
  },
  {
    id: "dispatch_child_agent",
    label: "派发子 Agent",
    category: "act",
    risk: "write",
    permissionMode: "requires_current_execution_intent",
    userVisible: true,
    backend: ["runGroupOrchestrator", "prepareAgentRuntimeTools", "ctx.callAgent", "queueTaskExecution"],
    evidence: ["dispatch_policy", "assignments", "execution_id"],
    description: "把自包含工作单派发给绑定项目 Agent，要求子 Agent 读取真实项目、执行、验证并提交结构化回执。",
  },
  {
    id: "ask_user_clarification",
    label: "追问用户",
    category: "decide",
    risk: "safe",
    permissionMode: "auto_when_missing_required_info",
    userVisible: true,
    backend: ["dispatchPolicy.action=ask_user", "questionForUser", "appendGroupMessage"],
    evidence: ["missing_info", "clarification_question"],
    description: "当目标、项目、授权或高风险范围不清时，主 Agent 先问一个最关键问题，不派发子 Agent。",
  },
  {
    id: "govern_task_lifecycle",
    label: "停止/取消/归档任务",
    category: "govern",
    risk: "high",
    permissionMode: "requires_explicit_user_command",
    userVisible: true,
    backend: ["requestTaskCancellation", "archiveTask", "restoreArchivedTask", "purgeArchivedTask", "releaseTaskLease"],
    evidence: ["cancellation_record", "archive_record", "cleanup_result"],
    description: "停止、取消、归档和永久清除任务属于治理动作，必须来自用户明确指令或按钮操作。",
  },
  {
    id: "read_child_agent_receipts",
    label: "读取子 Agent 结果说明",
    category: "observe",
    risk: "read",
    permissionMode: "auto_read",
    userVisible: false,
    backend: ["extractAgentReceipt", "buildUserAgentQuestionRows", "runLlmCoordinatorReview"],
    evidence: ["CCM_AGENT_RECEIPT", "receipt_statuses", "verification"],
    description: "读取子 Agent 的结构化回执、文件变更、验证结果和阻塞原因，供主 Agent 验收。",
  },
  {
    id: "replan_from_observation",
    label: "重新规划",
    category: "decide",
    risk: "safe",
    permissionMode: "auto_after_failed_assertion",
    userVisible: true,
    backend: ["recordReasoningDeviation", "recordReasoningRecoveryCheck", "updateReasoningPlan", "createReworkTask"],
    evidence: ["failed_assertions", "gap_fingerprint", "rework_plan"],
    description: "当回执缺证据、验证失败、目标偏离或依赖事实变化时，主 Agent 重新规划并决定返工、等待或停止。",
  },
  {
    id: "generate_final_reply",
    label: "生成最终回复",
    category: "reply",
    risk: "safe",
    permissionMode: "auto_after_verification",
    userVisible: true,
    backend: ["buildUserDeliveryReport", "buildTaskGroupReportMessage", "appendGroupMessage"],
    evidence: ["acceptance_gate", "files_changed", "verification_executed", "risks"],
    description: "只有完成验收或明确说明未完成/风险后，主 Agent 才生成给用户看的最终回复。",
  },
] as const;

export function getGroupMainAgentActionRegistry() {
  return GROUP_MAIN_AGENT_ACTIONS.map(action => ({ ...action, backend: [...action.backend], evidence: [...action.evidence] }));
}

function buildGroupMainAgentActionContext() {
  return [
    "【CCM 群聊主 Agent 可用动作注册表】",
    "原则：先理解和观察，再决定是否行动；只读动作可自动执行，写入/治理动作必须有当前用户消息授权或显式按钮操作。",
    ...GROUP_MAIN_AGENT_ACTIONS.map(action =>
      `- ${action.id}｜${action.label}｜类别=${action.category}｜风险=${action.risk}｜权限=${action.permissionMode}｜证据=${action.evidence.join("、")}`
    ),
  ].join("\n");
}

export function runGroupMainAgentActionRegistrySelfTest() {
  const required = [
    "read_group_context",
    "read_project_code_snapshot",
    "query_knowledge_base",
    "inspect_task_status",
    "restore_task_context",
    "create_project_task",
    "dispatch_child_agent",
    "ask_user_clarification",
    "govern_task_lifecycle",
    "read_child_agent_receipts",
    "replan_from_observation",
    "generate_final_reply",
  ];
  const registry = getGroupMainAgentActionRegistry();
  const ids = new Set<string>(registry.map(action => action.id));
  const missing = required.filter(id => !ids.has(id));
  const duplicateIds = registry
    .map(action => action.id)
    .filter((id, index, arr) => arr.indexOf(id) !== index);
  const highRiskRequiresExplicit = registry
    .filter(action => action.risk === "high")
    .every(action => String(action.permissionMode).includes("explicit"));
  const writeRequiresExecutionIntent = registry
    .filter(action => action.risk === "write")
    .every(action => /execution_intent|explicit/i.test(String(action.permissionMode)));
  const readActionsHaveEvidence = registry
    .filter(action => action.risk === "read")
    .every(action => action.evidence.length > 0 && action.backend.length > 0);
  const finalReplyRequiresVerification = registry
    .find(action => action.id === "generate_final_reply")?.evidence.includes("acceptance_gate") === true;
  const context = buildGroupMainAgentActionContext();
  const checks = {
    coversRequiredActions: missing.length === 0,
    noDuplicateIds: duplicateIds.length === 0,
    highRiskRequiresExplicit,
    writeRequiresExecutionIntent,
    readActionsHaveEvidence,
    finalReplyRequiresVerification,
    contextMentionsAllActions: required.every(id => context.includes(id)),
  };
  return { pass: Object.values(checks).every(Boolean), checks, missing, duplicateIds, total: registry.length, actions: registry, context };
}

function getGroupMainAgentAction(id: string) {
  return getGroupMainAgentActionRegistry().find(action => action.id === id) || null;
}

export function normalizeMainAgentActionIds(ids: any[]) {
  return require("./collaboration-task-card").normalizeMainAgentActionIds.apply(null, arguments as any);
}

export function buildMainAgentPermissionJudgement(actionIds: string[], input: { taskIntent?: any; messageMode?: string; explicitGovernance?: boolean } = {}) {
  return actionIds.map(id => {
    const action = getGroupMainAgentAction(id);
    const risk = String(action?.risk || "safe");
    const executable = input.taskIntent?.executable === true;
    const explicitGovernance = input.explicitGovernance === true;
    const allowed = risk === "read" || risk === "safe"
      ? true
      : risk === "write"
        ? executable
        : explicitGovernance;
    return {
      action_id: id,
      risk,
      allowed,
      permission_mode: action?.permissionMode || "",
      reason: allowed
        ? (risk === "write" ? "当前用户消息包含明确执行意图" : risk === "high" ? "用户显式触发治理动作" : "只读或安全决策动作")
        : (risk === "write" ? "当前消息不是明确执行请求" : "高风险治理动作需要用户显式指令或按钮操作"),
    };
  });
}

function loopStageStatus(stage: any, input: { mode: string; actionIds: string[]; blockedActions: string[]; observations: any; verified?: boolean }) {
  return require("./collaboration-task-card").loopStageStatus.apply(null, arguments as any);
}

export function buildGroupMainAgentInternalLoop(input: {
  mode: string;
  actionIds: string[];
  permissions: any[];
  taskIntent?: any;
  dispatchPolicy?: any;
  assignments?: any[];
  observations?: any;
  verified?: boolean;
}) {
  return require("./collaboration-task-card").buildGroupMainAgentInternalLoop.apply(null, arguments as any);
}

export function mainAgentPlanStepStatus(actionIds: string[], blockedActions: string[], actionId: string, fallback: string = "pending") {
  if (blockedActions.includes(actionId)) return "needs_confirmation";
  return actionIds.includes(actionId) ? "completed" : fallback;
}

export function buildUserVisiblePlanStep(input: {
  id: string;
  content: string;
  status: string;
  activeForm?: string;
  detail?: string;
  evidence?: any[];
  actions?: any[];
}) {
  return require("./collaboration-task-card").buildUserVisiblePlanStep.apply(null, arguments as any);
}

function planStepHasVerificationSignal(step: any) {
  return require("./collaboration-task-card").planStepHasVerificationSignal.apply(null, arguments as any);
}

function summaryHasExecutedVerification(summary: any = {}) {
  return require("./collaboration-task-card").summaryHasExecutedVerification.apply(null, arguments as any);
}

export function buildMainAgentPlanVerificationReminder(input: {
  mode?: string;
  phase?: string;
  steps?: any[];
  summary?: any;
  task?: any;
  verified?: boolean;
}) {
  return require("./collaboration-task-card").buildMainAgentPlanVerificationReminder.apply(null, arguments as any);
}
