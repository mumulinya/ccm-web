// Behavior-freeze split from collaboration-runtime-coordinator-review.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 6/9).
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
import { ingestRequirementSources, requirementToIntakeDraft } from "../requirements/source-ingestion";
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
import { buildProjectExecutionBrief, buildProjectMemoryPacket } from "../../projects/memory";
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

  let lastReview: any = null;

  for (let round = 1; round <= maxReviewRounds; round++) {
    const allowFollowUps = round < maxReviewRounds;
    const scheduledBudget = applyTestAgentRecheckBudget(
      pendingTestAgentRechecks.splice(0, pendingTestAgentRechecks.length),
      testAgentRecheckCountsBySubject,
    );
    const scheduledTestAgentRechecks = scheduledBudget.kept;
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
    const gateReasons = [...gateFollowUps, ...failedIndependentReviewFollowUps, ...postReviewSpotCheckFollowUps, ...independentReviewGateFollowUps]
      .map((item: any) => String(item.reason || "").trim())
      .filter(Boolean);
    if (blockedVerifierFollowUps.length && dispatchableReworkFollowUps.length === 0) {
      (review as any).status = "needs_user";
    }
    if (!allowFollowUps && gateReasons.length) {
      (review as any).status = "needs_user";
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
export async function processTargetQueue(targetKey: string, ctx: CollabCtx) {
  if (runningTasks.has(targetKey)) {
    console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
    return;
  }

  const queue = taskQueues.get(targetKey);
  if (!queue || queue.length === 0) return;

  runningTasks.set(targetKey, true);
  console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);

  while (queue.length > 0) {
    const taskId = queue.shift();
    if (!taskId) continue;
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
    const leaseResult = acquireTaskLease(taskId, traceId, 45_000);
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
      transitionExecution(taskId, "spawning", "任务队列正在启动开发执行内核");
      const reasoningLoop = buildTaskPreflightReasoning(task, "主 Agent 执行前重新核对目标、当前状态和验收条件", Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery);
      const startedTask = updateTask(taskId, { status: "in_progress", trace_id: traceId, started_at: new Date().toISOString(), reasoning_loop: reasoningLoop, execution_lease: { owner_id: leaseResult.lease.owner_id, acquired_at: leaseResult.lease.acquired_at, recovery_count: leaseResult.lease.recovery_count } }) || task;
      appendTaskTimelineEvent(taskId, { type: "reasoning_preflight", title: "我已复核目标与验收", detail: `计划版本 v${reasoningLoop.plan_version} · 待证明 ${reasoningLoop.assertions.filter(item => item.status !== "passed").length} 项`, status: "ok", phase: "planning", data: { plan_version: reasoningLoop.plan_version, fact_hash: reasoningLoop.fact_snapshots[reasoningLoop.fact_snapshots.length - 1]?.hash || "", recovery: Number(leaseResult.lease.recovery_count || 0) > 0 || !!task.recovery } });
      updateGroupTaskInlineStatus(startedTask, "in_progress", "我已开始协调执行");
      addTaskLog(taskId, "info", `任务状态更新为: 进行中`);
      syncTaskBacklogStatus(startedTask, "in_progress", "任务已进入执行阶段");
      await ctx.onTaskStatusChange?.(startedTask, "in_progress");

      addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
      const execution: any = await executeTask(startedTask, ctx);
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
        const coordinationRequest = getCoordinationRequestForTask(task);
        const coordinationReceipt = execution.receipt || null;
        const coordinationKernel = loadExecution(task.id);
        const coordinationAcceptance: any = coordinationRequest
          ? evaluateCoordinationTaskEvidence(task, coordinationRequest, coordinationReceipt, coordinationKernel)
          : buildRejectedCoordinationAcceptance(task, {}, coordinationReceipt, "找不到协调请求记录");
        const workspaceFiles = coordinationAcceptance.workspace_files || [];
        const green = evaluateGreenContract({
          receipt: coordinationReceipt,
          fileChanges: workspaceFiles,
          requiresChanges: taskRequiresCodeChanges(task),
          requiresVerification: task.requires_verification !== false,
          workspacePassed: coordinationAcceptance.accepted,
          branchFresh: true,
          reviewPassed: coordinationAcceptance.accepted,
          requiredLevel: coordinationKernel?.workspace?.mode === "worktree" ? "merge_ready" : "project",
        });
        const completedAt = new Date().toISOString();
        transitionExecution(task.id, coordinationAcceptance.accepted ? "succeeded" : "failed", coordinationAcceptance.reason, {
          green,
          receipt: coordinationReceipt,
          fileChanges: { files: workspaceFiles },
          runnerVerification: { status: coordinationAcceptance.accepted ? "passed" : "failed", verification: coordinationAcceptance.verification || [] },
          outputPreview: result,
          data: { coordination_acceptance: coordinationAcceptance },
        });
        const settledTask = updateTask(task.id, {
          status: coordinationAcceptance.accepted ? "done" : "failed",
          result: result.substring(0, 500),
          final_report: execution.report || result,
          status_detail: coordinationAcceptance.reason,
          receipt: coordinationReceipt,
          file_changes: { files: workspaceFiles },
          coordination_acceptance: coordinationAcceptance,
          completed_at: coordinationAcceptance.accepted ? completedAt : undefined,
          failed_at: coordinationAcceptance.accepted ? undefined : completedAt,
          execution_kernel: { execution_id: task.id, state: coordinationAcceptance.accepted ? "succeeded" : "failed", green, updated_at: completedAt },
        }) || task;
        closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, coordinationAcceptance.accepted ? "协作工作项已交付，等待主 Agent 合并" : "协作工作项未通过证据门禁");
        updateGroupTaskInlineStatus(settledTask, coordinationAcceptance.accepted ? "done" : "failed", coordinationAcceptance.reason);
        addTaskLog(task.id, coordinationAcceptance.accepted ? "success" : "warning", coordinationAcceptance.reason);
        await ctx.onTaskStatusChange?.(settledTask, coordinationAcceptance.accepted ? "done" : "failed", coordinationAcceptance.reason);
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
        updateGroupTaskInlineStatus(failedTask, "failed", execution.detail || "Agent 回执失败");
        finalizeTaskKernel(task, execution, deliverySummary, "failed", execution.detail || "Agent 回执失败");
        addTaskLog(taskId, "error", `❌ 任务执行失败：${execution.detail || "Agent 回执失败"}`);
        syncTaskBacklogStatus(failedTask, "blocked", execution.detail || result.substring(0, 500));
        await ctx.onTaskStatusChange?.(failedTask, "failed", result.substring(0, 500));
        appendTaskGroupReport(failedTask, "failed", execution.detail || result.substring(0, 500));
        await sendTaskFailureNotification(failedTask, execution.detail || result.substring(0, 500));
        continue;
      }

      if (checkTaskFailure(result)) {
        throw new Error(result.substring(0, 500));
      }

      const isCompleted = execution.status === "done";

      if (isCompleted) {
        const deliverySummary = buildDeliverySummary(task, execution, "waiting");
        appendTaskTimelineEvent(taskId, { type: "acceptance_gate", title: "代码变更验收检查", detail: deliverySummary.acceptance_gate_passed ? "验收通过" : `${deliverySummary.acceptance_gate?.failed_count || 0} 项未通过`, status: deliverySummary.acceptance_gate_passed ? "ok" : "warn", phase: "reviewing", data: deliverySummary.acceptance_gate || {} });
        if (!deliverySummary.acceptance_gate_passed) {
          const detail = `验收检查未通过：${deliverySummary.acceptance_gate?.failed_count || 1} 项缺口，任务保持进行中`;
          const waitingTask = updateTask(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: deliverySummary, reasoning_loop: deliverySummary.reasoning_loop }) || task;
          updateGroupTaskInlineStatus(waitingTask, "in_progress", detail);
          finalizeTaskKernel(task, execution, deliverySummary, "reviewing", detail);
          addTaskLog(taskId, "warning", detail);
          await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
          continue;
        }
        const closedSessions = closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "主 Agent 最终验收完成");
        const finalizedExecution = { ...execution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item: any) => item.id) } };
        const finalizedDeliverySummary = buildDeliverySummary(task, finalizedExecution, "done");
        if (!finalizedDeliverySummary.acceptance_gate_passed) {
          const detail = `最终收尾门禁未通过：${finalizedDeliverySummary.acceptance_gate?.failed_checks?.map((item: any) => item.label).join("、") || "团队仍未完全收尾"}`;
          const waitingTask = updateTask(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: finalizedDeliverySummary, reasoning_loop: finalizedDeliverySummary.reasoning_loop }) || task;
          updateGroupTaskInlineStatus(waitingTask, "in_progress", detail);
          finalizeTaskKernel(task, finalizedExecution, finalizedDeliverySummary, "reviewing", detail);
          addTaskLog(taskId, "warning", detail);
          await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
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
            const waitingTask = updateTask(taskId, { status: "in_progress", result: result.substring(0, 500), final_report: execution.report || result, status_detail: detail, receipt: execution.receipt || null, review: execution.review || null, file_changes: execution.fileChanges || null, delivery_summary: finalizedPromotedSummary, reasoning_loop: finalizedPromotedSummary.reasoning_loop }) || task;
            updateGroupTaskInlineStatus(waitingTask, "in_progress", detail);
            finalizeTaskKernel(task, finalizedPromotedExecution, finalizedPromotedSummary, "reviewing", detail);
            addTaskLog(taskId, "warning", detail);
            await ctx.onTaskStatusChange?.(waitingTask, "waiting", detail);
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
          updateGroupTaskInlineStatus(completedTask, "done", promotedExecution.detail);
          finalizeTaskKernel(task, promotedExecution, finalizedPromotedSummary, "succeeded", promotedExecution.detail);
          addTaskLog(taskId, "success", `✅ 任务完成：${promotedExecution.detail}`);
          syncTaskBacklogStatus(completedTask, "done", promotedExecution.detail);
          await ctx.onTaskStatusChange?.(completedTask, "done", result.substring(0, 500));
          appendTaskGroupReport(completedTask, "done", promotedExecution.detail);
          await sendTaskCompletionNotification(completedTask, result);
        } else {
          const waitingTask = updateTask(taskId, {
            status: "in_progress",
            result: result.substring(0, 500),
            final_report: execution.report || result,
            status_detail: execution.detail || "等待补充信息或返工",
            receipt: execution.receipt || null,
            review: execution.review || null,
            file_changes: execution.fileChanges || null,
            delivery_summary: deliverySummary,
            reasoning_loop: deliverySummary.reasoning_loop,
          }) || { ...task, status: "in_progress", result: result.substring(0, 500) };
          updateGroupTaskInlineStatus(waitingTask, "in_progress", execution.detail || "等待补充信息或返工");
          finalizeTaskKernel(task, execution, deliverySummary, "reviewing", execution.detail || "等待补充信息或返工");
          addTaskLog(taskId, "warning", `任务仍需继续：${execution.detail || "验收未完成"}`);
          syncTaskBacklogStatus(waitingTask, "blocked", execution.detail || result.substring(0, 500));
          await ctx.onTaskStatusChange?.(waitingTask, "waiting", result.substring(0, 500));
          appendTaskGroupReport(waitingTask, "waiting", execution.detail || result.substring(0, 500));
        }
      }
    } catch (error: any) {
      console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
      const failure = classifyExecutionFailure(error);
      const cancelled = failure.failureClass === "cancelled" || isTaskCancellationRequested(taskId);
      const latestWithFollowups = loadTasks().find((item: any) => item.id === taskId) || task;
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
      if (finalTask?.workflow_type === "agent_coordination_dependency") {
        try { await settleGroupCoordinationDependency(finalTask, ctx); }
        catch (error: any) { addTaskLog(taskId, "error", `协作工作项收口失败：${error?.message || error}`); }
      }
      releaseTaskLease(taskId, finalTask?.status || "unknown");
      if (enqueueFollowupAfterRound && finalTask && finalTask.status !== "cancelled") enqueueTask(taskId, ctx);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  runningTasks.delete(targetKey);
  console.log(`[任务队列] [${targetKey}] 队列处理完成`);
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
  return {
    total_queued: totalQueued,
    running_targets: runningTasks.size,
    target_status: targetStatus,
    pending_tasks: tasks.filter(t => t.status === "pending").length,
    in_progress_tasks: tasks.filter(t => t.status === "in_progress").length,
    failed_tasks: tasks.filter(t => t.status === "failed").length,
    running_task_ids: Array.from(runningTaskIds)
  };
}

export function getTaskTargetKeyFromTask(task: any) {
  if (task?.queue_scope === "isolated_parallel" && task?.id) return `isolated:${task.target_project || "unknown"}:${task.id}`;
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
