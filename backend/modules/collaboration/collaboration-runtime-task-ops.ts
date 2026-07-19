// Behavior-freeze split from collaboration-runtime.ts (part 9/9).
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
  getTaskFailureText,
  isRecoverableRuntimeFailure,
  runningTaskIds,
  updateGroupTaskInlineStatus,
} from "./collaboration-runtime-task-queue";

import {
  getReadyDailyDevMembers,
  validateDailyDevGroupReady,
} from "./collaboration-runtime-status-helpers";

import {
  enqueueTask,
  getQueueStatus,
  isTaskQueuedInMemory,
  taskMatchesAgentProbeTarget,
} from "./collaboration-runtime-coordinator-review";

import {
  CollabCtx,
  buildDailyDevAgentDiagnostics,
  getAgentExecutionReadiness,
} from "./collaboration-runtime-plan-tools";

import {
  compactFormText,
  continueDailyDevTasksFromGaps,
  createTask,
  getTaskExecutionPhase,
  hasDailyDevContinuationGaps,
  removeTaskFromQueues,
  retryTask,
  taskNeedsUserIntervention,
  updateTask,
} from "./collaboration-runtime-runtime-tools";

export function switchTaskExecutor(id: string, requestedRuntime: string, ctx: CollabCtx, options: any = {}) {
  if (runningTaskIds.has(id)) return { success: false, status: 409, error: "任务正在执行中，请先暂停或等待本轮结束后再切换执行器" };
  const current = loadTasks().find((task: any) => task.id === id);
  if (!current) return { success: false, status: 404, error: "任务不存在" };
  if (current.archived || current.deleted_at) return { success: false, status: 409, error: "归档任务不能切换执行器，请先恢复" };
  if (["done", "cancelled"].includes(String(current.status || ""))) return { success: false, status: 409, error: "已结束任务不能切换执行器" };

  const requested = String(requestedRuntime || "").trim().toLowerCase();
  const descriptor = getPublicAgentRuntimes().find((runtime: any) => runtime.id === requested || runtime.aliases?.includes(requested));
  if (!descriptor) return { success: false, status: 400, error: `不支持的执行器：${requested || "未指定"}` };
  if (!isRuntimeCommandAvailable(descriptor.id)) return { success: false, status: 409, error: `${descriptor.label} 当前不可用，请先安装或登录对应 CLI` };

  const project = String(options.project || options.target_project || options.targetProject || "").trim();
  const overrideKey = project || "*";
  const previousRuntime = String(current.runtime_overrides?.[overrideKey] || current.runtime_override || "").trim();
  const now = new Date().toISOString();
  const historyItem = {
    from: previousRuntime || "project_default",
    to: descriptor.id,
    project: project || "all",
    reason: compactFormText(options.reason, "用户手动切换执行器"),
    switched_at: now,
  };
  const sessions = closeTaskAgentSessions({ taskId: id }, `执行器切换为 ${descriptor.label}，旧原生会话已关闭`);
  const task = updateTask(id, {
    runtime_override: project ? current.runtime_override || "" : descriptor.id,
    runtime_overrides: { ...(current.runtime_overrides || {}), [overrideKey]: descriptor.id },
    runtime_switch_history: [...(Array.isArray(current.runtime_switch_history) ? current.runtime_switch_history : []), historyItem].slice(-20),
    status: "pending",
    is_paused: false,
    paused: false,
    queued_at: null,
    status_detail: `已切换到 ${descriptor.label}，等待从现有工作区和证据继续执行`,
    collaboration_state: { ...(current.collaboration_state || {}), phase: "reworking", needs_user: false, updated_at: now },
    last_runtime_switch_at: now,
  });
  if (!task) return { success: false, status: 500, error: "切换执行器后保存任务失败" };
  addTaskLog(id, "warning", `执行器切换：${historyItem.from} → ${descriptor.id}${project ? `（${project}）` : "（全部项目 Agent）"}；关闭 ${sessions.length} 个旧会话`);
  appendTaskTimelineEvent(id, { type: "runtime_switch", title: "用户切换执行器", detail: `${historyItem.from} → ${descriptor.id}`, status: "warn", phase: "reworking", agent: project || "all", data: { ...historyItem, sessions_closed: sessions.length } });
  appendTraceEvent(current.trace_id, { type: "task.runtime_switched", status: "warning", task_id: id, group_id: current.group_id || "", agent: project || "all", message: `${historyItem.from} → ${descriptor.id}`, data: { ...historyItem, sessions_closed: sessions.length } });
  updateGroupTaskInlineStatus(task, "pending", task.status_detail);
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const queueResult = autoExecute ? enqueueTask(id, ctx) : null;
  return { success: true, task, runtime: descriptor, previous_runtime: historyItem.from, project: project || null, sessions_closed: sessions.length, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() };
}

export function retryRuntimeFailedTasks(ctx: CollabCtx, options: any = {}) {
  const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
  const dryRun = !!(options.dry_run || options.dryRun);
  const limit = Math.max(1, Math.min(100, Number(options.limit || 100)));
  const probeTarget = options.probeTarget || options.probe_target || null;
  const candidates = loadTasks()
    .filter(isRecoverableRuntimeFailure)
    .filter((task: any) => taskMatchesAgentProbeTarget(task, probeTarget))
    .sort((a: any, b: any) => Date.parse(a.updated_at || a.created_at || "") - Date.parse(b.updated_at || b.created_at || ""))
    .slice(0, limit);
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      total_recoverable: candidates.length,
      retried: 0,
      queued: 0,
      auto_execute: autoExecute,
      results: candidates.map((task: any) => ({
        task_id: task.id,
        title: task.title,
        status: task.status,
        retry_count: Number(task.retry_count || 0),
        previous_failure: getTaskFailureText(task).slice(0, 500),
      })),
      queue_status: getQueueStatus(),
    };
  }
  const results = candidates.map((task: any) => {
    const reason = options.reason || "执行通道恢复后批量重试";
    const result = retryTask(task.id, ctx, reason, autoExecute);
    return {
      task_id: task.id,
      title: task.title,
      previous_failure: getTaskFailureText(task).slice(0, 500),
      ...result,
    };
  });
  return {
    success: true,
    total_recoverable: candidates.length,
    retried: results.filter((item: any) => item.success).length,
    queued: results.filter((item: any) => item.queued).length,
    auto_execute: autoExecute,
    results,
    queue_status: getQueueStatus(),
  };
}

export function archiveTask(id: string, reason = "用户删除任务") {
  const tasks = loadTasks();
  const index = tasks.findIndex(task => task.id === id);
  if (index < 0) return null;
  const current = tasks[index];
  if (current.archived || current.deleted_at) return current;
  removeTaskFromQueues(id);
  const running = runningTaskIds.has(id);
  let cancellation: any = null;
  if (!['done', 'cancelled'].includes(String(current.status || ''))) {
    try { cancellation = requestTaskCancellation(id, reason, "task-governance"); } catch {}
    try { cancelTestAgentRunsForTask(id, reason); } catch {}
  }
  const sessions = closeTaskAgentSessions({ taskId: id }, `${reason}，关闭任务级原生会话`);
  const leaseReleased = releaseTaskLease(id, "archived");
  const idempotencySettled = current.trace_id ? settleIdempotencyByTrace(current.trace_id, "failed", { archived: true, task_id: id, reason }) : [];
  const worktrees: any[] = [];
  for (const execution of listExecutions({ taskId: id })) {
    if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt) continue;
    try { worktrees.push({ execution_id: execution.id, ...cleanupExecutionWorktree(execution.id, true) }); }
    catch (error: any) { worktrees.push({ execution_id: execution.id, success: false, error: error.message }); }
  }
  const now = new Date().toISOString();
  const cleanup = {
    queue_removed: true,
    cancellation,
    sessions_closed: sessions.length,
    lease_released: leaseReleased,
    idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0),
    worktrees,
    running_at_request: running,
    completed_at: now,
  };
  tasks[index] = {
    ...current,
    previous_status: current.status,
    status: "archived",
    status_detail: reason,
    archived: true,
    archived_at: now,
    deleted_at: now,
    auto_execute_before_archive: current.auto_execute !== false,
    auto_execute: false,
    cleanup,
    collaboration_state: { ...(current.collaboration_state || {}), phase: "cancelled", needs_user: false, updated_at: now },
    updated_at: now,
  };
  saveTasks(tasks);
  updateGroupTaskInlineStatus(tasks[index], "cancelled", "任务已删除并归档");
  appendTraceEvent(current.trace_id, { type: "task.archived", status: "warning", task_id: id, group_id: current.group_id || "", message: reason, data: cleanup });
  return tasks[index];
}

export function restoreArchivedTask(id: string) {
  const tasks = loadTasks();
  const index = tasks.findIndex(task => task.id === id);
  if (index < 0) return null;
  const current = tasks[index];
  if (!current.archived && !current.deleted_at) return current;
  clearTaskCancellation(id);
  const now = new Date().toISOString();
  const restoredStatus = current.previous_status === "done" ? "done" : "pending";
  tasks[index] = {
    ...current,
    status: restoredStatus,
    status_detail: restoredStatus === "done" ? "已从归档恢复" : "已从归档恢复，等待重新执行",
    archived: false,
    archived_at: null,
    deleted_at: null,
    restored_at: now,
    auto_execute: restoredStatus !== "done" ? current.auto_execute_before_archive !== false : false,
    collaboration_state: { ...(current.collaboration_state || {}), phase: restoredStatus === "done" ? "completed" : "planning", needs_user: false, updated_at: now },
    updated_at: now,
  };
  saveTasks(tasks);
  updateGroupTaskInlineStatus(tasks[index], restoredStatus, tasks[index].status_detail);
  appendTraceEvent(current.trace_id, { type: "task.restored", status: "info", task_id: id, group_id: current.group_id || "", message: "任务已从归档恢复" });
  return tasks[index];
}

export function purgeArchivedTask(id: string) {
  return require("./collaboration-task-service").purgeArchivedTask(id);
}

configureDailyDevBacklogRuntime({
  validateDailyDevGroupReady,
  getReadyDailyDevMembers,
  getTaskExecutionPhase,
  taskNeedsUserIntervention,
  isTaskQueuedInMemory,
  createTask,
  enqueueTask,
  getQueueStatus,
  getAgentExecutionReadiness,
  continueDailyDevTasksFromGaps,
  buildDailyDevAgentDiagnostics,
  hasDailyDevContinuationGaps,
});

export function handleCollaborationApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  return require("./collaboration-routes").handleCollaborationApi(pathname, req, res, parsed, ctx);
}
