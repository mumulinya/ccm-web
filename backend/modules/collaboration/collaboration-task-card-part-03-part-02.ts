// Behavior-freeze split from collaboration-task-card-part-03.ts (part 2/2).

// Behavior-freeze split from collaboration-task-card.ts (part 3/3).

import {
  buildDispatchLaunchSummary,
  classifyGroupProjectTaskIntent,
  getGroupMainAgentActionRegistry,
  getTaskGapFingerprint,
  getTaskGapItems,
  isTaskQueuedInMemory,
  runningTaskIds,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration";

import {
  buildRuntimeKernelSnapshot,
  buildUserAgentCoordinationProtocol,
  buildUserReceiptReworkSummary,
  isFailedVerification,
  isSuggestedOnlyVerification,
} from "./collaboration-coordination-ux";

import {
  buildApiMicrocompactReceiptVisibleSummary,
  buildGlobalMemoryHealthGateVisibleSummary,
  buildMemoryGateVisibleSummary,
  buildPostCompactReinjectionGateVisibleSummary,
  buildReadPlanRevalidationGateVisibleSummary,
} from "./collaboration-memory-gates";

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
  getTaskRecoveryChecks,
  hasStrongTaskAcceptanceEvidence,
  hasTaskRecoveryEvidence,
} from "./collaboration-task-card-part-01";

import {
  getTaskPlanMode,
  normalizeUserAcceptanceCheck,
  splitUserAcceptanceText,
} from "./collaboration-task-card-part-02";
export function buildLiveMainAgentTodoPlan(task: any, phase: string, workers: any[], executions: any[], summary: any = {}) {
  const assignmentCount = Number(summary.assignment_count || (Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.length : 0) || 0);
  const receiptCount = Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0) || 0);
  const workerNotificationCount = Number(summary.worker_notification_count || (Array.isArray(summary.worker_notifications) ? summary.worker_notifications.length : 0) || 0);
  const hasDispatchEvidence = assignmentCount > 0 || workerNotificationCount > 0 || workers.length > 0 || executions.length > 0;
  const terminal = ["completed", "cancelled", "reverted"].includes(phase);
  const recoveryVisible = hasTaskRecoveryEvidence(task);
  const failed = task?.status === "failed" || phase === "blocked" || workers.some((item: any) => ["failed", "blocked", "partial", "needs_info"].includes(String(item.status || "")));
  const reworking = phase === "reworking" || executions.some((item: any) => /rework|retry|recover/i.test(String(item.state || item.phase || "")));
  const allWorkersDone = workers.length > 0 && workers.every((item: any) => ["done", "completed", "succeeded"].includes(String(item.status || "")));
  const activeWorkers = uniqueStrings(workers
    .filter((item: any) => ["running", "in_progress", "pending", "partial", "blocked", "reviewing"].includes(String(item.status || "")))
    .map((item: any) => item.agent)
    .filter(Boolean));
  const verificationCount = Number((Array.isArray(summary.verification_executed) ? summary.verification_executed.length : 0) || 0);
  const acceptancePassed = hasStrongTaskAcceptanceEvidence(task, executions, summary);
  const steps: any[] = [];
  const add = (id: string, content: string, status: string, activeForm: string, detail = "") => {
    const normalizedStatus = normalizeLiveTodoStatus(status);
    steps.push(buildUserVisiblePlanStep({
      id,
      content,
      status: normalizedStatus,
      activeForm,
      detail,
      evidence: buildTodoStepEvidence({ task, summary, workers, executions, stepId: id, phase }),
      actions: buildTodoStepActions({ task, stepId: id, status: normalizedStatus, phase, summary }),
    }));
  };

  add("understand_intent", "确认需求目标和涉及范围", "completed", "正在确认需求目标", task?.business_goal || task?.title || "");
  add("read_group_context", "读取群聊上下文和任务历史", "completed", "正在读取群聊上下文");
  if (recoveryVisible) add(
    "restore_task_context",
    task?.recovery_pending === true ? "恢复上次任务上下文，等待确认继续" : "恢复上次任务上下文和未完成 Todo",
    task?.recovery_pending === true ? "needs_confirmation" : "completed",
    "正在恢复上次任务上下文",
    task?.recovery?.previous_status ? `上次状态：${task.recovery.previous_status}` : ""
  );
  add("create_project_task", "创建可跟踪的项目任务卡", task?.id ? "completed" : "pending", "正在创建项目任务卡", task?.id ? `任务 ${task.id}` : "");

  let dispatchStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) dispatchStatus = "cancelled";
  else if (hasDispatchEvidence || ["dispatching", "executing", "reviewing", "reworking", "completed"].includes(phase)) dispatchStatus = "completed";
  else if (["queued", "planning"].includes(phase)) dispatchStatus = "in_progress";
  add(
    "dispatch_child_agent",
    hasDispatchEvidence ? `派发给 ${Math.max(assignmentCount, workers.length, executions.length, 1)} 个执行成员或执行通道` : "判断是否需要派发执行成员",
    dispatchStatus,
    "正在派发执行成员"
  );

  let workerStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) workerStatus = "cancelled";
  else if (failed) workerStatus = "failed";
  else if (reworking) workerStatus = "reworking";
  else if (allWorkersDone || (receiptCount > 0 && ["reviewing", "completed"].includes(phase))) workerStatus = "completed";
  else if (activeWorkers.length || phase === "executing") workerStatus = "in_progress";
  add(
    "child_agent_execution",
    activeWorkers.length ? `${activeWorkers.join("、")} 正在执行` : workers.length ? "执行成员执行并提交结果" : "等待执行成员开始执行",
    workerStatus,
    "执行成员正在执行",
    workers.map((item: any) => `${item.agent}:${item.status || "pending"}`).join("；")
  );

  let receiptStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) receiptStatus = "cancelled";
  else if (failed) receiptStatus = "needs_confirmation";
  else if (receiptCount > 0 && (allWorkersDone || ["reviewing", "completed"].includes(phase))) receiptStatus = "completed";
  else if (hasDispatchEvidence) receiptStatus = "in_progress";
  add(
    "read_child_agent_receipts",
    receiptCount > 0 ? `读取 ${receiptCount} 条执行成员结果说明` : "等待执行成员结果说明",
    receiptStatus,
    "正在等待和读取结果说明"
  );

  let reviewStatus = "pending";
  if (["cancelled", "reverted"].includes(phase)) reviewStatus = "cancelled";
  else if (failed) reviewStatus = reworking ? "reworking" : "needs_confirmation";
  else if (phase === "reviewing") reviewStatus = "reviewing";
  else if (phase === "completed") reviewStatus = "completed";
  else if (receiptCount > 0 || allWorkersDone) reviewStatus = "reviewing";
  add(
    "coordinator_review",
    verificationCount > 0 ? `最终验收并检查 ${verificationCount} 项验证` : "最终验收执行成员结果",
    reviewStatus,
    "我正在验收",
    acceptancePassed ? "验收已通过" : ""
  );

  let finalStatus = "pending";
  if (phase === "completed") finalStatus = "completed";
  else if (["cancelled", "reverted"].includes(phase)) finalStatus = "cancelled";
  else if (task?.status === "failed") finalStatus = "failed";
  add(
    "final_delivery_report",
    phase === "completed" ? "生成最终交付报告，说明改动、验证和风险" : "等待验收完成后生成交付报告",
    finalStatus,
    "正在生成交付报告",
    summary.headline || task?.status_detail || ""
  );
  const verificationReminder = buildMainAgentPlanVerificationReminder({
    mode: "delegation",
    phase,
    steps,
    summary,
    task,
    verified: acceptancePassed,
  });

  return {
    title: "我正在这样处理",
    source: "ccm-live-task-todo",
    schema: "cc-style-todo-v2",
    display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true },
    phase,
    task_id: task?.id || "",
    updated_at: task?.updated_at || new Date().toISOString(),
    verification_nudge: Boolean(verificationReminder),
    verification_reminder: verificationReminder,
    steps,
  };
}

export function buildLiveMainAgentDecisionForTask(task: any, phase: string, liveTodoPlan: any, summary: any = {}) {
  const steps = Array.isArray(liveTodoPlan?.steps) ? liveTodoPlan.steps : [];
  const liveAssignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const dispatchLaunchSummary = buildDispatchLaunchSummary({
    task,
    goal: task?.business_goal || task?.goal || task?.title || "",
    assignments: liveAssignments,
    dispatchPolicy: { action: "live_task_followup", reason: "根据任务真实执行状态展示已派发工作" },
    mode: phase === "reworking" ? "followup" : "delegation",
    taskId: task?.id || "",
  });
  const hasRecoveryStep = steps.some((step: any) => step.id === "restore_task_context");
  const selectedActions = normalizeMainAgentActionIds([
    "read_group_context",
    "inspect_task_status",
    ...(hasRecoveryStep ? ["restore_task_context"] : []),
    "dispatch_child_agent",
    "read_child_agent_receipts",
    ...(phase === "reworking" ? ["replan_from_observation"] : []),
    "generate_final_reply",
  ]);
  const blockedActions = steps.some((step: any) => step.status === "needs_confirmation" || step.status === "failed") ? ["generate_final_reply"] : [];
  const passed = hasStrongTaskAcceptanceEvidence(task, [], summary);
  const permissions = selectedActions.map((id: string) => ({ action_id: id, risk: ["dispatch_child_agent"].includes(id) ? "write" : "safe", allowed: !blockedActions.includes(id), reason: blockedActions.includes(id) ? "仍有执行缺口，等待返工或用户确认" : "来自任务生命周期的状态更新" }));
  const observation = {
    live_task_phase: phase,
    receipt_count: Number(summary.receipt_count || 0),
    acceptance_gate_passed: passed,
    needs_replan: phase === "reworking" || summary.acceptance_gate_passed === false || !passed && (phase === "reviewing" || task?.status === "done"),
  };
  const internalLoop = buildGroupMainAgentInternalLoop({
    mode: phase === "reworking" ? "followup" : "delegation",
    actionIds: selectedActions,
    permissions,
    taskIntent: { kind: "task", executable: true, reason: "根据任务真实执行状态刷新内部循环" },
    dispatchPolicy: { action: "live_task_followup", reason: "根据任务真实执行状态刷新 Todo/Plan", nextStep: steps.find((step: any) => ["in_progress", "reviewing", "reworking", "needs_confirmation", "failed"].includes(step.status))?.content || "等待下一次任务状态更新" },
    assignments: liveAssignments,
    observations: observation,
    verified: passed,
  });
  const displayStream = buildMainAgentDisplayStream({
    surface: "group",
    mode: phase === "reworking" ? "followup" : "delegation",
    status: task?.status || phase,
    phase,
    userText: task?.status_detail || summary.headline || "",
    goal: task?.business_goal || task?.goal || task?.title || "",
    actionIds: selectedActions,
    steps,
    permissions,
    observations: observation,
    traceId: task?.trace_id || "",
    technical: { blockers: summary.blockers || summary.needs || [] },
    workers: liveAssignments,
    executions: [],
    summary: { ...summary, dispatch_launch_summary: dispatchLaunchSummary },
    rawEvents: Array.isArray(summary.timeline) ? summary.timeline : [],
    taskId: task?.id || "",
  });
  return {
    version: 2,
    trace_id: task?.trace_id || "",
    group_id: task?.group_id || "",
    task_id: task?.id || "",
    message_id: "",
    coordinator: task?.target_project || "coordinator",
    mode: phase === "reworking" ? "followup" : "delegation",
    decision: {
      selected_actions: selectedActions,
      dispatch_policy: { action: "live_task_followup", reason: "根据任务真实执行状态刷新 Todo/Plan", nextStep: steps.find((step: any) => ["in_progress", "reviewing", "reworking", "needs_confirmation", "failed"].includes(step.status))?.content || "等待下一次任务状态更新" },
      reason: "任务执行状态实时闭环",
    },
    internal_loop: internalLoop,
    loop: internalLoop,
    user_plan_steps: steps,
    dispatch_launch_summary: dispatchLaunchSummary,
    dispatchLaunchSummary: dispatchLaunchSummary,
    display_stream: displayStream,
    displayStream,
    todo_plan: liveTodoPlan,
    verification_reminder: liveTodoPlan?.verification_reminder || null,
    verificationReminder: liveTodoPlan?.verification_reminder || null,
    permissions,
    observation,
    verify: {
      passed,
      blocked_actions: blockedActions,
      conclusion: passed ? "任务 Todo 已闭环并通过验收" : "任务仍在执行、验收或返工中",
    },
    reply: {
      kind: "task_card",
      message_id: "",
      preview: task?.status_detail || summary.headline || "",
    },
    created_at: new Date().toISOString(),
  };
}

export function getDashboardWorkerRows(task: any) {
  const summary = task?.delivery_summary || {};
  const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const receipts = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const names = uniqueStrings([
    ...assignments.map((item: any) => item.project || item.agent || item.target_project),
    ...receipts.map((item: any) => item.agent || item.project || item.target_project),
    ...notifications.map((item: any) => item.task_id || item.agent || item.project),
  ].filter(Boolean)).slice(0, 12);

  return names.map((name: string) => {
    const matchName = (item: any) => String(item?.project || item?.agent || item?.target_project || item?.task_id || "").toLowerCase() === name.toLowerCase();
    const assignment = assignments.find(matchName) || {};
    const receipt = receipts.find(matchName) || {};
    const notification = notifications.find(matchName) || {};
    return {
      agent: name,
      task: assignment.task || assignment.summary || notification.task || "",
      status: receipt.status || notification.receipt_status || notification.status || assignment.status || (task?.status === "in_progress" ? "running" : "pending"),
      summary: receipt.summary || notification.summary || assignment.reason || "",
      files_changed: Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) ? (receipt.filesChanged || receipt.files_changed || receipt.files) : [],
      verification: Array.isArray(receipt.verification || receipt.tests) ? (receipt.verification || receipt.tests) : [],
      blockers: [
        ...(Array.isArray(receipt.blockers) ? receipt.blockers : []),
        ...(Array.isArray(receipt.needs) ? receipt.needs : []),
      ].filter(Boolean),
    };
  });
}

export function normalizeMainAgentActionIds(ids: any[]) {
  const known = new Set<string>(getGroupMainAgentActionRegistry().map(action => action.id));
  const result: string[] = [];
  for (const raw of ids || []) {
    const id = String(raw || "").trim();
    if (!id || !known.has(id) || result.includes(id)) continue;
    result.push(id);
  }
  return result;
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
  const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const blockedActions = permissions.filter((item: any) => item.allowed === false).map((item: any) => item.action_id);
  const observations = input.observations || {};
  const toolChoiceReason = (stage: any, stageActions: string[]) => {
    if (stage.id === "observe") {
      if (input.mode === "conversation") return "普通对话只读群聊上下文，不读取项目代码。";
      if (input.mode === "project_analysis") return "项目分析只读项目快照和知识库，不创建任务。";
      return "开发/续跑任务需要读取任务状态、项目上下文和历史证据。";
    }
    if (stage.id === "think") return input.taskIntent?.reason || input.dispatchPolicy?.reason || "根据消息模式、意图分类和风险信号判断下一步。";
    if (stage.id === "plan") return observations.requires_confirmation ? "风险或范围需要用户确认，先形成计划卡。" : "形成 Todo、工作单边界和验收标准。";
    if (stage.id === "act") return blockedActions.some((id: string) => stageActions.includes(id)) ? "存在未授权动作，暂停执行。" : "当前消息授权允许执行对应动作。";
    if (stage.id === "monitor") return "读取子 Agent 结果说明、执行状态、Diff 和验证证据。";
    if (stage.id === "reflect") return observations.acceptance_gate_passed === false || observations.needs_replan ? "验收或执行存在缺口，需要返工/重规划。" : "暂无返工证据。";
    return input.verified ? "证据边界通过，生成回复。" : "仍需说明等待确认、继续执行或缺口。";
  };
  const stages = GROUP_MAIN_AGENT_LOOP_STAGES.map(stage => {
    const stageActions = (stage.actions || []).filter((id: string) => actionIds.includes(id));
    const status = loopStageStatus(stage, { mode: input.mode, actionIds, blockedActions, observations, verified: input.verified });
    return {
      id: stage.id,
      label: stage.label,
      title: stage.title,
      status,
      purpose: stage.purpose,
      actions: stageActions,
      tool_choice: toolChoiceReason(stage, stageActions),
      evidence: [
        stage.id === "think" && input.taskIntent?.kind ? `intent=${input.taskIntent.kind}` : "",
        stage.id === "plan" && Array.isArray(input.assignments) ? `assignments=${input.assignments.length}` : "",
        stage.id === "act" && input.dispatchPolicy?.action ? `dispatch=${input.dispatchPolicy.action}` : "",
        stage.id === "monitor" && observations.receipt_count !== undefined ? `receipts=${observations.receipt_count}` : "",
        stage.id === "reflect" && observations.acceptance_gate_passed !== undefined ? `acceptance=${observations.acceptance_gate_passed}` : "",
      ].filter(Boolean),
    };
  });
  const current = stages.find((stage: any) => ["needs_confirmation", "failed", "in_progress", "reviewing", "reworking"].includes(stage.status))
    || [...stages].reverse().find((stage: any) => stage.status === "completed")
    || stages[0];
  const completedCount = stages.filter((stage: any) => ["completed", "skipped"].includes(stage.status)).length;
  return {
    version: 1,
    source: "group-main-agent-loop-5.0",
    pattern: "observe-think-plan-act-monitor-reflect-respond",
    current_stage: current?.id || "observe",
    current_label: current?.title || "观察上下文",
    progress: { completed: completedCount, total: stages.length },
    stages,
    next_action: current?.status === "needs_confirmation"
      ? "等待用户确认后继续"
      : current?.id === "respond"
        ? "生成或更新用户回复"
        : current?.purpose || "",
  };
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
  const status = normalizeLiveTodoStatus(input.status || "pending");
  const activeForm = input.activeForm || input.content;
  return {
    id: input.id,
    content: input.content,
    subject: input.content,
    activeForm,
    active_form: activeForm,
    summary: ["in_progress", "reviewing", "reworking"].includes(status) ? activeForm : input.content,
    status,
    detail: compactMemoryText(input.detail || "", 220),
    user_visible: true,
    technical: false,
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    actions: Array.isArray(input.actions) ? input.actions : [],
  };
}

export function buildMainAgentPlanVerificationReminder(input: {
  mode?: string;
  phase?: string;
  steps?: any[];
  summary?: any;
  task?: any;
  verified?: boolean;
}) {
  const mode = String(input.mode || "");
  if (mode === "conversation" || mode === "project_analysis") return null;
  const steps = Array.isArray(input.steps) ? input.steps : [];
  if (steps.length < 3) return null;
  if (steps.some(planStepHasVerificationSignal)) return null;
  if (summaryHasExecutedVerification(input.summary)) return null;
  const strongAcceptance = hasStrongTaskAcceptanceEvidence(input.task, [], input.summary || input.task?.delivery_summary || {});
  if (input.verified === true || input.phase === "completed" && strongAcceptance || input.task?.status === "done" && strongAcceptance) return null;
  return {
    schema: "ccm-main-agent-plan-verification-reminder-v1",
    status: "needs_verification_step",
    title: "还缺验收步骤",
    headline: "完成前需要补一项真实验证，或者说明为什么当前不能验证。",
    reason: "计划已有 3 项以上，但没有显式的真实验证、测试或检查步骤。",
    next_action: "我会把验收补进计划，再继续交付总结。",
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  };
}

export function normalizeLiveTodoStatus(status: string) {
  const value = String(status || "pending");
  if (["done", "completed", "success", "succeeded"].includes(value)) return "completed";
  if (["running", "active", "in_progress", "executing"].includes(value)) return "in_progress";
  if (["review", "reviewing", "testing"].includes(value)) return "reviewing";
  if (["rework", "reworking", "retrying"].includes(value)) return "reworking";
  if (["blocked", "warning", "needs_info", "partial"].includes(value)) return "needs_confirmation";
  if (["failed", "error"].includes(value)) return "failed";
  if (["cancelled", "canceled"].includes(value)) return "cancelled";
  if (["skipped", "skip"].includes(value)) return "skipped";
  return value || "pending";
}

export function buildTodoStepEvidence(input: { task: any; summary: any; workers: any[]; executions: any[]; stepId: string; phase: string }) {
  const { task, summary, workers, executions, stepId, phase } = input;
  const timeline = Array.isArray(summary?.timeline) ? summary.timeline : [];
  const receipts = [
    ...(Array.isArray(summary?.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : []),
  ];
  const files = uniqueStrings([
    ...(Array.isArray(summary?.files_changed) ? summary.files_changed : []),
    ...(Array.isArray(summary?.actual_file_changes) ? summary.actual_file_changes.map((item: any) => item?.path || item?.file || item) : []),
  ].filter(Boolean)).slice(0, 8);
  const verification = uniqueStrings(Array.isArray(summary?.verification_executed) ? summary.verification_executed : []).slice(0, 8);
  const blockers = uniqueStrings([
    ...(Array.isArray(summary?.blockers) ? summary.blockers : []),
    ...(Array.isArray(summary?.needs) ? summary.needs : []),
    ...(Array.isArray(summary?.verification_failed) ? summary.verification_failed.map((item: any) => `验证失败：${String(item)}`) : []),
  ].filter(Boolean)).slice(0, 8);
  const evidence: any[] = [];
  const add = (type: string, title: string, detail = "", data: any = null) => {
    evidence.push({ type, title, detail: compactMemoryText(detail || "", 220), data });
  };
  if (stepId === "understand_intent") add("task", "需求目标", task?.business_goal || task?.title || "", { task_id: task?.id || "" });
  if (stepId === "read_group_context") add("trace", "Trace", task?.trace_id ? `Trace ${task.trace_id}` : "当前任务没有 Trace ID", { trace_id: task?.trace_id || "" });
  if (stepId === "create_project_task") add("task", "任务卡", `任务 ${task?.id || ""} · ${task?.status || ""}`, { task_id: task?.id || "", status: task?.status || "" });
  if (stepId === "restore_task_context") {
    const checks = getTaskRecoveryChecks(task);
    const latest = checks[checks.length - 1] || {};
    if (checks.length) add("recovery", "恢复复核", latest.reason || "已重新核对任务上下文", latest);
    if (task?.recovery?.previous_status) add("state", "上次状态", task.recovery.previous_status, task.recovery);
    if (task?.execution_lease?.recovery_count) add("lease", "恢复次数", String(task.execution_lease.recovery_count), task.execution_lease);
    if (!checks.length && task?.recovery_pending) add("recovery", "恢复等待确认", "服务启动后检测到未完成任务，已暂停等待确认", task.recovery || {});
  }
  if (stepId === "dispatch_child_agent") {
    const dispatchEvents = timeline.filter((item: any) => ["dispatch", "coordinator_plan", "sandbox_rehearsal", "conflict_plan"].includes(String(item?.type || ""))).slice(-4);
    for (const item of dispatchEvents) add("trace", item.title || "派发证据", item.detail || item.phase || "", { id: item.id || "", type: item.type || "" });
    if (!dispatchEvents.length) add("trace", "派发状态", phase === "planning" ? "主 Agent 仍在形成派发计划" : "已进入任务执行链路");
  }
  if (stepId === "child_agent_execution") {
    for (const worker of workers.slice(0, 8)) add("agent", worker.agent || "子 Agent", `${worker.status || "pending"} · ${worker.summary || worker.task || ""}`, { agent: worker.agent, status: worker.status });
    for (const execution of executions.slice(-4)) add("execution", execution.project || "执行器", `${execution.state || ""} · ${execution.id || ""}`, { execution_id: execution.id || "", project: execution.project || "" });
    if (!workers.length && !executions.length) add("agent", "子 Agent", "等待执行通道开始处理");
  }
  if (stepId === "read_child_agent_receipts") {
    for (const receipt of receipts.slice(0, 8)) add("receipt", receipt.agent || receipt.project || "子 Agent 结果说明", `${receipt.status || receipt.receipt_status || ""} · ${receipt.summary || ""}`, receipt);
    if (!receipts.length) add("receipt", "结果说明", "尚未收到可验收结果说明");
  }
  if (stepId === "coordinator_review") {
    if (verification.length) add("verification", "已执行验证", verification.join("；"), { verification });
    if (summary?.acceptance_gate) add("acceptance", "验收门禁", hasStrongTaskAcceptanceEvidence(task, executions, summary) ? "已通过" : "未通过或等待中", summary.acceptance_gate);
    if (blockers.length) add("blocker", "阻塞/失败原因", blockers.join("；"), { blockers });
    if (!verification.length && !summary?.acceptance_gate && !blockers.length) add("acceptance", "验收", "等待我汇总结果说明并验收");
  }
  if (stepId === "final_delivery_report") {
    if (summary?.headline || task?.status_detail) add("report", "交付摘要", summary.headline || task.status_detail || "");
    if (files.length) add("files", "修改文件", files.join("；"), { files });
    if (verification.length) add("verification", "验证结果", verification.join("；"), { verification });
    if (blockers.length) add("blocker", "遗留风险", blockers.join("；"), { blockers });
  }
  return evidence.slice(0, 10);
}

export function buildTodoStepActions(input: { task: any; stepId: string; status: string; phase: string; summary: any }) {
  const { task, stepId, status, phase, summary } = input;
  const taskId = task?.id || "";
  if (!taskId) return [];
  const actions: any[] = [];
  const add = (id: string, label: string, kind: string, tone = "outline") => actions.push({ id, label, kind, tone, task_id: taskId, step_id: stepId });
  if (["failed", "needs_confirmation"].includes(status)) {
    if (stepId === "dispatch_child_agent") add("retry", "重新派发", "retry", "primary");
    if (["child_agent_execution", "read_child_agent_receipts", "coordinator_review"].includes(stepId)) add("gap_continue", "按缺口返工", "gap_continue", "warning");
    if (["child_agent_execution", "coordinator_review"].includes(stepId)) add("switch_executor", "切换执行器", "switch_executor", "outline");
    add("cancel", "取消任务", "cancel", "danger");
  }
  if (status === "reworking") add("view_pipeline", "查看协作看板", "view_pipeline", "outline");
  if (status === "reviewing" && stepId === "coordinator_review") {
    add("gap_continue", "按缺口返工", "gap_continue", "warning");
    if (hasStrongTaskAcceptanceEvidence(task, [], summary)) add("confirm_done", "标记已处理", "confirm_done", "success");
  }
  if (status === "completed" && stepId === "final_delivery_report") add("view_pipeline", "查看交付证据", "view_pipeline", "outline");
  if (["in_progress", "reviewing", "reworking"].includes(status) && !["completed", "cancelled"].includes(phase)) add("cancel", "取消任务", "cancel", "danger");
  return actions.slice(0, 4);
}

export function loopStageStatus(stage: any, input: { mode: string; actionIds: string[]; blockedActions: string[]; observations: any; verified?: boolean }) {
  const actionIds = input.actionIds || [];
  const blockedActions = input.blockedActions || [];
  const stageActions = stage.actions || [];
  const hasAction = stageActions.some((id: string) => actionIds.includes(id));
  const blocked = stageActions.some((id: string) => blockedActions.includes(id));
  if (blocked) return "needs_confirmation";
  if (stage.id === "think") return "completed";
  if (stage.id === "reflect") {
    if (actionIds.includes("replan_from_observation") || input.observations?.needs_replan || input.observations?.acceptance_gate_passed === false) return "in_progress";
    if (input.verified) return "completed";
    return input.mode === "conversation" || input.mode === "project_analysis" ? "skipped" : "pending";
  }
  if (stage.id === "respond") return actionIds.includes("generate_final_reply") ? (input.verified ? "completed" : "in_progress") : "pending";
  if (stage.id === "monitor") {
    if (actionIds.includes("read_child_agent_receipts") || input.observations?.receipt_count || input.observations?.queued) return input.verified ? "completed" : "in_progress";
    return input.mode === "conversation" || input.mode === "project_analysis" ? "skipped" : "pending";
  }
  if (stage.id === "act") {
    if (hasAction) return input.verified ? "completed" : "in_progress";
    return ["conversation", "project_analysis"].includes(input.mode) ? "skipped" : "pending";
  }
  if (stage.id === "plan") {
    if (hasAction || ["project_task", "delegation", "followup", "governance"].includes(input.mode)) return "completed";
    return input.mode === "conversation" ? "skipped" : "completed";
  }
  if (stage.id === "observe") return hasAction ? "completed" : "pending";
  return hasAction ? "completed" : "pending";
}

export function planStepHasVerificationSignal(step: any) {
  const text = [
    step?.content,
    step?.title,
    step?.subject,
    step?.summary,
    step?.activeForm,
    step?.active_form,
    step?.detail,
  ].filter(Boolean).join(" ");
  return MAIN_AGENT_VERIFICATION_STEP_PATTERN.test(text);
}

export function summaryHasExecutedVerification(summary: any = {}) {
  const fields = [
    summary?.verification_executed,
    summary?.executed_verification,
    summary?.verification_results,
    summary?.verification,
    summary?.runner_verification?.verification,
    summary?.external_runner_verification?.verification,
  ];
  return fields.some((value: any) => Array.isArray(value) ? value.length > 0 : Boolean(value));
}

export const GROUP_MAIN_AGENT_LOOP_STAGES = [
  { id: "observe", label: "Observe", title: "观察上下文", actions: ["read_group_context", "read_project_code_snapshot", "query_knowledge_base", "inspect_task_status"], purpose: "先看群聊、项目、知识库和任务状态，避免盲目派发。" },
  { id: "think", label: "Think", title: "判断意图", actions: [], purpose: "判断普通问答、项目分析、开发任务、治理动作或续跑。" },
  { id: "plan", label: "Plan", title: "形成计划", actions: ["create_project_task", "ask_user_clarification"], purpose: "形成用户可读计划、Todo、风险和工作单边界。" },
  { id: "act", label: "Act", title: "执行动作", actions: ["dispatch_child_agent", "govern_task_lifecycle"], purpose: "只在授权后创建任务、派发子 Agent 或执行治理动作。" },
  { id: "monitor", label: "Monitor", title: "跟踪执行", actions: ["read_child_agent_receipts", "inspect_task_status"], purpose: "持续读取子 Agent 结果说明、任务状态、文件变更和验证结果。" },
  { id: "reflect", label: "Reflect", title: "复盘返工", actions: ["replan_from_observation"], purpose: "发现缺口时重规划、返工、追问或切换执行器。" },
  { id: "respond", label: "Respond", title: "回复用户", actions: ["generate_final_reply"], purpose: "只在证据足够或需要用户决定时，给出清晰回复。" },
];

export const MAIN_AGENT_VERIFICATION_STEP_PATTERN = /验证|测试|运行检查|执行检查|检查(?:命令|结果|通过|失败)|verify|verification|test|qa|typecheck|lint|build|check/i;
