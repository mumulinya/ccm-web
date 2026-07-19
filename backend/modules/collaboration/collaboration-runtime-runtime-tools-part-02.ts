// Behavior-freeze split from collaboration-runtime-runtime-tools.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 8/9).
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
  appendTaskGroupReport,
  buildContinuationUserDecision,
  buildUserContinuationStatus,
  compactRuntimeToolAudit,
  configuredProjectWorkDir,
  getTaskById,
  hasStrongTaskAcceptanceEvidence,
  isAgentExecutionBlockedPendingTask,
  isTaskPaused,
  runningTaskIds,
  runtimeToolSnapshotFromAudit,
  syncTaskBacklogStatus,
  updateGroupTaskInlineStatus,
} from "./collaboration-runtime-task-queue";

import {
  buildDeliverySummary,
  isAdvisoryNeed,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  taskRequiresAgentQa,
  writeSse,
} from "./collaboration-runtime-daily-dev";

import {
  enqueueTask,
  finalizeTaskKernel,
  getQueueStatus,
  isTaskQueuedInMemory,
} from "./collaboration-runtime-coordinator-review";

import {
  CollabCtx,
  getProjectExtraConfig,
} from "./collaboration-runtime-plan-tools";

import {
  buildTaskContinuationBlock,
  canAutoContinueTaskGaps,
  canCompleteDailyDevFromDeliverySummary,
  classifyTaskContinuation,
  compactFormText,
  getTaskGapFingerprint,
  getTaskGapItems,
  isAutomaticGapContinuationSource,
  updateTask,
} from "./collaboration-runtime-runtime-tools-part-01";

export function hasDailyDevContinuationGaps(task: any) {
  if (!task || task.workflow_type !== "daily_dev") return false;
  if (task.status === "done" && hasStrongTaskAcceptanceEvidence(task, [], task?.delivery_summary || {})) return false;
  if (isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id)) return false;
  const summary = task.delivery_summary || {};
  const hasSummaryGaps = [
    summary.blockers,
    summary.needs,
    summary.verification_required_missing,
    summary.verification_suggested,
    summary.verification_failed,
  ].some((items: any) => Array.isArray(items) && items.length > 0);
  const hasReceiptGaps = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ].some((item: any) => item?.status && item.status !== "done");
  const hasWorkerNotificationGaps = (Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [])
    .some((item: any) => {
      const status = String(item?.status || "").trim();
      const receiptStatus = String(item?.receipt_status || "").trim();
      return ["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status)
        || (!!receiptStatus && receiptStatus !== "done");
    });
  const hasCoordinationEvidenceGaps = Number(summary.coordination_plan_count || 0) <= 0
    || Number(summary.assignment_count || 0) <= 0
    || Number(summary.worker_notification_count || 0) <= 0;
  const hasAgentQaGap = summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true;
  const hasIndependentReviewGap = summary.independent_review_required === true && summary.independent_review_gate_passed !== true;
  const hasPostReviewSpotCheckGap = summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true;
  const hasWeakAcceptanceGap = summary.acceptance_gate_passed === true && !hasStrongTaskAcceptanceEvidence(task, [], summary);
  const hasAckGateGap = (taskRequiresCodeChanges(task) || taskRequiresVerification(task))
    && (summary.ack_gate_passed === false || getTaskAckRewriteRows(task).length > 0);
  const contractInjection = getTaskContractInjectionRows(task);
  const contractGate = evaluateContractInjectionGate(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
  const hasContractInjectionGap = contractGate.required && !contractGate.pass;
  return hasSummaryGaps || hasReceiptGaps || hasWorkerNotificationGaps || hasCoordinationEvidenceGaps || hasAgentQaGap || hasIndependentReviewGap || hasPostReviewSpotCheckGap || hasWeakAcceptanceGap || hasAckGateGap || hasContractInjectionGap;
}

export function taskNeedsUserIntervention(task: any) {
  const summary = task?.delivery_summary || {};
  return task?.status === "failed"
    || isAgentExecutionBlockedPendingTask(task)
    || [
      summary.blockers,
      summary.needs,
      summary.verification_failed,
      summary.verification_required_missing,
      summary.project_policy_violations,
      summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? [summary.independent_review_gate?.reason || "复杂变更缺少独立复核"] : [],
      summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true ? [summary.post_review_spot_check_gate?.reason || "TestAgent 通过后主 Agent 抽查尚未通过"] : [],
    ].some((items: any) => Array.isArray(items) && items.length > 0)
    || [
      ...(Array.isArray(summary.receipts) ? summary.receipts : []),
      ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].some((item: any) => ["failed", "blocked", "partial", "needs_info", "missing_receipt"].includes(String(item?.status || "")));
}

export function getTaskExecutionPhase(task: any) {
  if (task?.status === "done") return hasStrongTaskAcceptanceEvidence(task, [], task?.delivery_summary || {}) ? "done" : "reviewing";
  if (runningTaskIds.has(task?.id) || task?.status === "in_progress") return "running";
  if (taskNeedsUserIntervention(task)) return "blocked";
  if (isTaskQueuedInMemory(task?.id)) return "queued";
  if (task?.status === "pending") return "pending";
  return task?.status || "unknown";
}

function getDashboardWorkerRows(task: any) {
  return require("./collaboration-task-card").getDashboardWorkerRows.apply(null, arguments as any);
}

function getTaskDashboardActions(task: any, phase: string) {
  const actions: any[] = [];
  if (isTaskPaused(task)) {
    actions.push({ id: "resume", label: "继续执行", kind: "resume", tone: "primary" });
  } else if (!["done", "cancelled"].includes(String(task?.status || ""))) {
    actions.push({ id: "pause", label: "暂停", kind: "pause", tone: "outline" });
  }
  if (task?.status !== "done") {
    actions.push({ id: "supplement", label: "补充说明", kind: "continue", tone: "primary" });
    actions.push({ id: "replan", label: "重新规划", kind: "continue", tone: "outline" });
    actions.push({ id: "redispatch", label: "重派", kind: "retry", tone: "outline" });
    actions.push({ id: "switch_executor", label: "换执行器", kind: "switch_executor", tone: "outline" });
  }
  if (hasDailyDevContinuationGaps(task)) {
    actions.push({ id: "gap_continue", label: "按缺口返工", kind: "gap_continue", tone: "warning" });
  }
  if (task?.status === "pending" && !isTaskQueuedInMemory(task?.id) && !isAgentExecutionBlockedPendingTask(task)) {
    actions.push({ id: "queue", label: "加入队列", kind: "queue", tone: "primary" });
  }
  if (task?.delivery_summary) actions.push({ id: "pipeline", label: "协作看板", kind: "view_pipeline", tone: "outline" });
  if (task?.delivery_summary || task?.final_report || task?.result || task?.receipt || task?.review) {
    actions.push({ id: "report", label: "执行报告", kind: "view_report", tone: "outline" });
  }
  if (task?.status !== "done" && canCompleteDailyDevFromDeliverySummary(task, {}, task?.delivery_summary)) {
    actions.push({ id: "confirm_done", label: "人工确认完成", kind: "confirm_done", tone: "success" });
  }
  if (phase === "blocked" && isAgentExecutionBlockedPendingTask(task)) {
    actions.unshift({ id: "probe", label: "复检执行通道", kind: "probe", tone: "warning" });
  }
  if (!["done", "cancelled"].includes(String(task?.status || ""))) {
    actions.push({ id: "cancel", label: "取消任务", kind: "cancel", tone: "danger" });
  }
  return actions;
}

export function buildExecutionDashboard(limit = 12) {
  const tasks = loadTasks()
    .filter((task: any) => !task.archived && !task.deleted_at)
    .slice()
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
  const queueStatus = getQueueStatus();
  const phaseCounts: any = { pending: 0, queued: 0, running: 0, blocked: 0, done: 0, failed: 0, unknown: 0 };
  const rows = tasks.map((task: any) => {
    const summary = task.delivery_summary || {};
    const phase = getTaskExecutionPhase(task);
    phaseCounts[phase] = Number(phaseCounts[phase] || 0) + 1;
    const latestPlan = summary.latest_coordination_plan || {};
    const blockers = [
      ...(Array.isArray(summary.blockers) ? summary.blockers : []),
      ...(Array.isArray(summary.needs) ? summary.needs : []),
      ...(Array.isArray(summary.verification_failed) ? summary.verification_failed.map((item: any) => `验证失败：${String(item)}`) : []),
      ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item: any) => `${item?.agent || "未知 Agent"} 缺验证：${Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置命令"}`) : []),
      ...(Array.isArray(summary.project_policy_violations) ? summary.project_policy_violations : []),
      summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? `复杂变更缺少独立复核：${summary.independent_review_gate?.reason || "需要另一个 Agent 复核"}` : "",
    ].filter(Boolean);
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      phase,
      priority: task.priority || "normal",
      workflow_type: task.workflow_type || "",
      assign_type: task.assign_type || "",
      target_project: task.target_project || "",
      group_id: task.group_id || "",
      created_at: task.created_at,
      updated_at: task.updated_at,
      status_detail: task.status_detail || "",
      headline: summary.headline || task.final_report || task.result || "",
      execution_readiness: task.execution_readiness || null,
      main_plan: {
        count: Number(summary.coordination_plan_count || (Array.isArray(summary.coordination_plans) ? summary.coordination_plans.length : 0) || (latestPlan?.phases?.length ? 1 : 0)),
        strategy: latestPlan.strategy || "",
        phases: Array.isArray(latestPlan.phases) ? latestPlan.phases.slice(0, 8) : [],
      },
      assignments: Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.slice(0, 12) : [],
      workers: getDashboardWorkerRows(task),
      evidence: {
        actual_file_change_count: Number(summary.actual_file_change_count || task.file_changes?.count || 0),
        actual_file_changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 12) : [],
        verification_executed: Array.isArray(summary.verification_executed) ? summary.verification_executed.slice(0, 12) : [],
        verification_failed: Array.isArray(summary.verification_failed) ? summary.verification_failed.slice(0, 12) : [],
        verification_required_missing: Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.slice(0, 12) : [],
        has_final_review: !!summary.has_final_review || !!task.review,
        receipt_count: Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0)),
      },
      rework_records: [
        ...(Array.isArray(summary.rework_evidence) ? summary.rework_evidence : []),
        ...(Array.isArray(task.followups) ? task.followups.map((item: any) => ({
          time: item.time,
          source: item.source || "user",
          summary: item.message || item.summary || "用户补充说明",
        })) : []),
      ].slice(0, 12),
      blockers: blockers.slice(0, 12),
      recent_logs: getTaskLogs(task.id, 5),
      actions: getTaskDashboardActions(task, phase),
      raw_task: task,
    };
  });
  const activeRows = rows.filter((item: any) => item.phase !== "done").slice(0, limit);
  const recentDoneRows = rows.filter((item: any) => item.phase === "done").slice(0, Math.max(0, limit - activeRows.length));
  return {
    success: true,
    generated_at: new Date().toISOString(),
    queue_status: queueStatus,
    summary: {
      total: tasks.length,
      active: activeRows.length,
      queued: Number(phaseCounts.queued || 0),
      running: Number(phaseCounts.running || 0),
      blocked: Number(phaseCounts.blocked || 0),
      pending: Number(phaseCounts.pending || 0),
      done: Number(phaseCounts.done || 0),
    },
    phase_counts: phaseCounts,
    items: [...activeRows, ...recentDoneRows],
  };
}

export function continueDailyDevTasksFromGaps(ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-task-service").continueDailyDevTasksFromGaps(ctx, options);
}

export function continueTaskWithMessage(taskId: string, message: string, ctx: CollabCtx, options: any = {}) {
  if (!taskId) return { success: false, status: 400, error: "缺少任务 ID" };
  if (!compactFormText(message, "")) return { success: false, status: 400, error: "请输入补充说明" };

  const tasks = loadTasks();
  const current = tasks.find(t => t.id === taskId);
  if (!current) return { success: false, status: 404, error: "任务不存在" };
  const continuationKind = String(options.continuation_kind || options.continuationKind || "auto") === "auto"
    ? classifyTaskContinuation(message)
    : String(options.continuation_kind || options.continuationKind);
  if (continuationKind === "new_task") {
    return { success: false, status: 409, new_task_suggested: true, error: "这条要求看起来是一个独立新任务，请直接在群聊发送，不会混入当前任务。" };
  }
  const currentlyRunning = runningTaskIds.has(taskId);
  const source = String(options.source || "user");
  const automaticGapContinuation = isAutomaticGapContinuationSource(source);
  const internalContinuation = options.internal === true || options.internalContinuation === true || /dependency_unlocked_next_work_item/i.test(source);
  const gapFingerprint = automaticGapContinuation ? getTaskGapFingerprint(current) : "";
  const gapItems = automaticGapContinuation ? getTaskGapItems(current) : [];
  if (automaticGapContinuation && !canAutoContinueTaskGaps(current)) {
    return {
      success: false,
      status: 409,
      needs_user: true,
      error: "相同交付缺口已经自动返工过一次，但没有出现新的验收证据；请补充业务信息、调整方案或人工选择重试。",
      gap_fingerprint: gapFingerprint,
      gap_items: gapItems,
    };
  }
  const explicitOperationKey = String(options.idempotency_key || options.idempotencyKey || options.request_id || options.requestId || "").trim();
  const automaticOperationKey = automaticGapContinuation && gapFingerprint ? `auto-gap:${gapFingerprint}` : "";
  const operationKey = explicitOperationKey || automaticOperationKey;
  const operation = operationKey ? acquireIdempotency({ scope: "task-continue", key: `${taskId}:${operationKey}`, traceId: current.trace_id, leaseMs: 60_000 }) : null;
  if (operation && !operation.acquired) {
    return { success: true, duplicate: true, task: loadTasks().find((item: any) => item.id === taskId) || current, ...(operation.record?.result || {}), trace_id: operation.traceId };
  }

  const resolvesWaitingUser = options.resolve_waiting_user === true
    || options.resolveWaitingUser === true
    || /waiting[_-]?user[_-]?resolution/i.test(source);
  const continuationMeta = {
    rework_kind: compactFormText(options.rework_kind || options.reworkKind || options.continuation_rework_kind || "", ""),
    target: compactFormText(options.target || options.agent || options.project || "", ""),
    reason: compactFormText(options.reason || options.detail || "", ""),
    title: compactFormText(options.title || options.label || "", ""),
    work_item_id: compactFormText(options.work_item_id || options.workItemId || "", ""),
    resolves_waiting_user: resolvesWaitingUser,
  };
  const shouldInterruptCurrentRun = currentlyRunning
    && continuationKind === "revise_goal"
    && options.interrupt_current_run !== false
    && options.interruptCurrentRun !== false;
  const isNextWorkItemContinuation = continuationMeta.rework_kind === "next_claimable_work_item"
    || /next_work_item|user_next_work_item/i.test(`${source} ${continuationMeta.rework_kind}`);
  const continuationDecision = buildContinuationUserDecision({
    source,
    kind: continuationKind,
    meta: { ...continuationMeta, interrupt_current_run: shouldInterruptCurrentRun },
    deferred: currentlyRunning,
  });
  const continuationTitle = continuationDecision.title;
  const continuationDetail = continuationDecision.timeline_detail || continuationDecision.reason || (continuationMeta.target ? `目标：${continuationMeta.target}` : "");
  const followup = {
    time: new Date().toISOString(),
    message: compactFormText(message, ""),
    source,
    kind: continuationKind,
    status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupt_requested" : "queued_for_current_task") : "accepted",
    continuation: {
      ...continuationMeta,
      strategy: continuationDecision.strategy,
      route_label: continuationDecision.route_label,
      replan_required: continuationDecision.replan_required,
      interrupt_current_run: shouldInterruptCurrentRun,
    },
    user_visible: {
      schema: "ccm-main-agent-continuation-status-v1",
      title: continuationDecision.title,
      headline: continuationDecision.headline,
      route_label: continuationDecision.route_label,
      kind_label: continuationDecision.kind_label,
      next_action: continuationDecision.next_action,
    },
  };
  const nextDescription = `${current.description || ""}${buildTaskContinuationBlock(followup.message)}`;
  const previousGap = current.collaboration_state?.gap || {};
  const autoAttempts = automaticGapContinuation
    ? (previousGap.fingerprint === gapFingerprint ? Number(previousGap.auto_attempts || 0) : 0) + 1
    : Number(previousGap.auto_attempts || 0);
  const nextCollaborationState = {
    ...(current.collaboration_state || {}),
    phase: "reworking",
    needs_user: false,
    gap: automaticGapContinuation ? {
      ...previousGap,
      fingerprint: gapFingerprint,
      items: gapItems,
      auto_attempts: autoAttempts,
      last_auto_continue_at: followup.time,
    } : resolvesWaitingUser && Object.keys(previousGap).length ? {
      ...previousGap,
      resolved_at: followup.time,
      resolved_by: source,
    } : previousGap,
    waiting_user_resolution: resolvesWaitingUser ? {
      resolved_at: followup.time,
      source,
      summary: "用户已补充任务所需条件",
    } : current.collaboration_state?.waiting_user_resolution || null,
    last_continuation: {
      source,
      at: followup.time,
      automatic: automaticGapContinuation || internalContinuation,
      kind: continuationKind,
      status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
      strategy: continuationDecision.strategy,
      route_label: continuationDecision.route_label,
      replan_required: continuationDecision.replan_required,
      interrupt_current_run: shouldInterruptCurrentRun,
      ...continuationMeta,
    },
    continuation_events: [
      ...(Array.isArray(current.collaboration_state?.continuation_events) ? current.collaboration_state.continuation_events : []),
      {
        source,
        at: followup.time,
        automatic: automaticGapContinuation || internalContinuation,
        kind: continuationKind,
        status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
        title: continuationTitle,
        detail: continuationDetail,
        strategy: continuationDecision.strategy,
        route_label: continuationDecision.route_label,
        replan_required: continuationDecision.replan_required,
        interrupt_current_run: shouldInterruptCurrentRun,
        ...continuationMeta,
      },
    ].slice(-20),
    goal_revision_interruption: shouldInterruptCurrentRun ? {
      requested: true,
      requested_at: followup.time,
      reason: followup.message,
      source,
      followup_revision: Number(current.followup_revision || 0) + 1,
    } : current.collaboration_state?.goal_revision_interruption || null,
  };
  const updates: any = {
    description: nextDescription,
    followups: automaticGapContinuation || internalContinuation ? (Array.isArray(current.followups) ? current.followups : []) : [...(Array.isArray(current.followups) ? current.followups : []), followup],
    internal_continuations: automaticGapContinuation || internalContinuation ? [...(Array.isArray(current.internal_continuations) ? current.internal_continuations : []), followup].slice(-20) : (Array.isArray(current.internal_continuations) ? current.internal_continuations : []),
    status: currentlyRunning ? "in_progress" : "pending",
    is_paused: false,
    paused: false,
    ...(currentlyRunning ? {} : { result: "", final_report: "" }),
    followup_revision: Number(current.followup_revision || 0) + 1,
    pending_followups: [...(Array.isArray(current.pending_followups) ? current.pending_followups : []), followup].slice(-20),
    status_detail: options.status_detail || (automaticGapContinuation
      ? `已按 ${gapItems.length} 个交付缺口自动返工，等待主 Agent 继续执行`
      : continuationDecision.status_detail),
    collaboration_state: nextCollaborationState,
    last_continue_at: followup.time,
    last_continue_source: followup.source,
    ...(resolvesWaitingUser ? {
      recovery_pending: false,
      waiting_user_resolved_at: followup.time,
      waiting_user_resolution_source: source,
    } : {}),
    ...(internalContinuation ? { last_internal_continue_at: followup.time } : {}),
  };
  if (continuationKind === "revise_goal") {
    updates.business_goal = `${current.business_goal || current.title || ""}\n目标调整：${followup.message}`.trim();
    updates.plan_revision_required = true;
    updates.last_goal_revision_at = followup.time;
  }
  if (current.status === "done") {
    const reopened = reopenTaskAgentSessions(taskId, "用户在同一任务中继续修改，恢复已验收会话");
    updates.reopened_session_count = reopened.length;
  }
  if (automaticGapContinuation) {
    updates.auto_gap_continue_count = Number(current.auto_gap_continue_count || 0) + 1;
    updates.last_auto_gap_continue_at = followup.time;
  }
  const task = updateTask(taskId, updates);
  let interruptionResult: any = null;
  if (shouldInterruptCurrentRun) {
    try {
      interruptionResult = requestTaskCancellation(taskId, "用户调整了目标，先停止当前执行轮以重新核对计划", "main-agent-goal-revision");
      addTaskLog(taskId, "warning", "目标调整触发当前执行轮停止；主 Agent 将保留上下文并按新目标重核计划");
      appendTaskTimelineEvent(taskId, {
        type: "task_goal_revision_interrupt",
        title: "已停止当前执行轮以重核计划",
        detail: "用户调整了目标边界，主 Agent 正在停止可能跑偏的执行轮。",
        status: "warn",
        phase: "rework",
        agent: continuationMeta.target || "coordinator",
        data: { source, kind: continuationKind, interruption: interruptionResult },
      });
    } catch (error: any) {
      interruptionResult = { success: false, error: String(error?.message || error || "停止当前执行轮失败") };
      addTaskLog(taskId, "warning", `目标调整尝试停止当前执行轮失败：${interruptionResult.error}`);
    }
  }
  addTaskLog(taskId, "info", automaticGapContinuation
    ? `按交付缺口自动继续（${gapFingerprint}）：${gapItems.join("、").slice(0, 300)}`
    : internalContinuation
      ? `前置完成后自动接上下一步工作项：${followup.message.slice(0, 300)}`
      : `任务补充说明并继续执行：${followup.message.slice(0, 300)}`);
  appendTaskTimelineEvent(taskId, {
    type: automaticGapContinuation ? "auto_gap_rework" : continuationDecision.timeline_type || (isNextWorkItemContinuation ? "next_work_item_dispatch" : /targeted|gap_rework|rework/i.test(source) ? "targeted_rework" : "task_continuation"),
    title: continuationTitle,
    detail: compactMemoryText(continuationDetail || "我已复用同一任务上下文继续处理。", 260),
    status: "active",
    phase: "rework",
    agent: continuationMeta.target || "",
    data: { source, kind: continuationKind, rework_kind: continuationMeta.rework_kind, work_item_id: continuationMeta.work_item_id },
  });

  if (task?.assign_type === "group" && task.group_id && !automaticGapContinuation && !internalContinuation && options.append_group_message !== false && options.appendGroupMessage !== false) {
    const group = loadGroups().find(g => g.id === task.group_id);
    const target = group ? getCoordinatorMember(group).project : "coordinator";
    appendGroupMessage(task.group_id, {
      id: "m" + Date.now().toString(36) + "cont" + crypto.randomBytes(2).toString("hex"),
      role: "user",
      target,
      content: `任务补充说明：${followup.message}`,
      timestamp: followup.time,
      task_id: taskId,
    });
    safeAddGroupLog(task.group_id, "info", "task", `任务收到补充说明并继续执行: ${task.title}`, { task_id: taskId });
  } else if (task?.assign_type === "group" && task.group_id && automaticGapContinuation) {
    updateGroupTaskInlineStatus(task, "pending", `已自动按 ${gapItems.length} 个交付缺口返工，不新增重复消息`);
    safeAddGroupLog(task.group_id, "info", "task", `任务按相同卡片继续返工: ${task.title}`, { task_id: taskId, gap_fingerprint: gapFingerprint, gap_items: gapItems });
  } else if (task?.assign_type === "group" && task.group_id && internalContinuation) {
    updateGroupTaskInlineStatus(task, "pending", "前置工作已完成，我已自动接上下一步派发");
    safeAddGroupLog(task.group_id, "info", "task", `任务前置完成后自动接续下一步: ${task.title}`, { task_id: taskId, work_item_id: continuationMeta.work_item_id });
  }

  let queueResult = null;
  if (!currentlyRunning && options.auto_execute !== false && options.autoExecute !== false) {
    queueResult = enqueueTask(taskId, ctx);
  }
  if (operationKey) completeIdempotency("task-continue", `${taskId}:${operationKey}`, { task_id: taskId, queued: !!queueResult?.queued, followup_time: followup.time });
  const userStatus = buildUserContinuationStatus(task, task?.status || "");
  return {
    success: true,
    task,
    message: followup.message,
    friendly_text: userStatus?.headline || continuationDecision.headline,
    next_action: userStatus?.next_action || continuationDecision.next_action,
    user_status: userStatus,
    interruption: interruptionResult,
    queued: !!queueResult?.queued,
    deferred: currentlyRunning,
    interrupted_current_run: shouldInterruptCurrentRun,
    same_task_trace: true,
    continuation_kind: continuationKind,
    trace_id: task?.trace_id || current.trace_id || "",
    queue_result: queueResult,
    queue_status: getQueueStatus(),
  };
}

export function retryTask(id: string, ctx: CollabCtx, reason = "", autoExecute = true) {
  return require("./collaboration-task-service").retryTask(id, ctx, reason, autoExecute);
}
