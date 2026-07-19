// Behavior-freeze split from collaboration-runtime-coordinator-review.ts (part 2/2).
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

import {
  enqueueTask,
  getQueueStatus,
  getTaskAgeMs,
  getTaskTargetKeyFromTask,
  isTaskQueuedInMemory,
  resumeTaskQueues,
} from "./collaboration-runtime-coordinator-review-part-01";

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
    .filter((task: any) => taskMatchesAgentProbeTarget(task, probeTarget));
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
    permissionMode: "auto_read_in_project_analysis",
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
