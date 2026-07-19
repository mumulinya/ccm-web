// Behavior-freeze split from collaboration-task-card-part-02.ts (part 1/2).
// Behavior-freeze split from collaboration-task-card.ts (part 2/3).

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
  buildMainAgentRecoverySummary,
  buildUserAgentProgressSummary,
  hasStrongTaskAcceptanceEvidence,
  pushUserChangeFiles,
  sanitizeUserAgentProgressText,
  taskCardGapLabel,
  taskCardPhase,
  uniqueUserChangeFiles,
  userAgentProgress,
  userAgentRole,
} from "./collaboration-task-card-part-01";

import {
  buildLiveMainAgentDecisionForTask,
  buildLiveMainAgentTodoPlan,
  buildUserAcceptanceReview,
  buildUserHandoffSummary,
  buildUserPlanAlignmentReview,
  getDashboardWorkerRows,
} from "./collaboration-task-card-part-03";

import {
  buildUserCompletionReadinessSummary,
  buildUserExecutionStory,
  buildUserWorkOrderPreview,
} from "./collaboration-task-card-part-02-part-02";

export function buildUserChangeSummary(task: any, summary: any = {}, workers: any[] = [], workItems: any[] = []) {
  const fallbackProject = task?.target_project || task?.mission_target?.name || task?.mission_target?.project || "";
  const rawFiles: any[] = [];
  pushUserChangeFiles(rawFiles, summary.actual_file_changes, { project: fallbackProject });
  pushUserChangeFiles(rawFiles, summary.file_changes, { project: fallbackProject });
  pushUserChangeFiles(rawFiles, summary.files_changed, { project: fallbackProject });
  pushUserChangeFiles(rawFiles, task?.file_changes, { project: fallbackProject });
  pushUserChangeFiles(rawFiles, summary.delivery_report?.files, { project: fallbackProject });
  for (const item of workItems) pushUserChangeFiles(rawFiles, item.filesChanged || item.files_changed || item.files, { project: item.target || item.owner || fallbackProject, agent: item.owner || item.target || "" });
  for (const worker of workers) pushUserChangeFiles(rawFiles, worker.files_changed || worker.filesChanged || worker.files, { project: worker.agent || fallbackProject, agent: worker.agent || "" });

  const files = uniqueUserChangeFiles(rawFiles);
  if (!files.length) return null;

  const agentNames = uniqueStrings(files.map(file => file.agent || file.project).filter(Boolean));
  const agents = agentNames.map((agent: string) => {
    const agentFiles = files.filter(file => (file.agent || file.project || "") === agent);
    return {
      agent,
      role: userAgentRole(agent),
      file_count: agentFiles.length,
      additions: agentFiles.reduce((sum, file) => sum + Number(file.additions || 0), 0),
      deletions: agentFiles.reduce((sum, file) => sum + Number(file.deletions || 0), 0),
      files: agentFiles.slice(0, 8),
    };
  });
  const additions = files.reduce((sum, file) => sum + Number(file.additions || 0), 0);
  const deletions = files.reduce((sum, file) => sum + Number(file.deletions || 0), 0);
  return {
    schema: "ccm-main-agent-change-summary-v1",
    title: "改动明细",
    status: hasStrongTaskAcceptanceEvidence(task, [], summary) ? "ready" : "tracking",
    status_label: `${files.length} 个文件`,
    headline: agentNames.length
      ? `${agentNames.length} 个子 Agent/项目产生了 ${files.length} 个文件改动。`
      : `本轮捕获到 ${files.length} 个文件改动。`,
    file_count: files.length,
    additions,
    deletions,
    files,
    agents,
    next_action: "可以点开查看具体文件 diff；原始执行记录仍在技术详情里。",
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  };
}

export function buildUserTaskActions(task: any, phase: string, executions: any[]) {
  const actions: any[] = [];
  const completed = String(task?.status || "") === "done" && hasStrongTaskAcceptanceEvidence(task, executions, task?.delivery_summary || {});
  const terminal = completed || String(task?.status || "") === "cancelled";
  if (task?.intake_state === "awaiting_confirmation") {
    actions.push({ id: "confirm_plan", label: "确认执行", kind: "confirm_plan", tone: "primary" });
    actions.push({ id: "revise_plan", label: "调整计划", kind: "revise_plan", tone: "warning" });
    actions.push({ id: "cancel", label: "取消任务", kind: "cancel", tone: "danger" });
    return actions;
  }
  if (task?.workflow_type === "requirement_epic" && task?.status === "awaiting_change_review") {
    actions.push({ id: "changes", label: "查看整批改动", kind: "view_changes", tone: "outline" });
    actions.push({ id: "approve_epic", label: "批准 Epic 交付", kind: "approve_epic", tone: "primary" });
    actions.push({ id: "targeted_rework", label: "退回子任务返工", kind: "targeted_rework", tone: "warning", requirement_epic: true });
    return actions;
  }
  if (task?.delivery_summary || task?.file_changes) actions.push({ id: "changes", label: "查看改动", kind: "view_changes", tone: "outline" });
  if (completed) actions.push({ id: "continue", label: "继续修改", kind: "continue", tone: "primary" });
  else if (!terminal) actions.push({ id: "supplement", label: "追加要求", kind: "continue", tone: "primary" });
  if (["failed", "blocked"].includes(String(task?.status || "")) || phase === "blocked") actions.push({ id: "retry", label: "重新执行", kind: "retry", tone: "warning" });
  const checkpointIds = executions.flatMap((item: any) => Array.isArray(item.checkpointIds) ? item.checkpointIds : []).filter(Boolean);
  if (completed && checkpointIds.length) actions.push({ id: "rollback", label: "安全撤销", kind: "rollback", tone: "danger", checkpoint_ids: checkpointIds });
  if (!terminal) actions.push({ id: "cancel", label: "停止", kind: "cancel", tone: "danger" });
  return actions;
}

export function getTaskWorkItems(task: any, executions: any[] = []) {
  return buildMainAgentWorkItems(task, { executions: executions.length ? executions : listExecutions({ taskId: task?.id || "" }) });
}

export function stableTaskEntityId(prefix: string, value: any) {
  return `${prefix}_${crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, 20)}`;
}

export function groupSessionIdForTask(task: any) {
  return String(task?.group_session_id || task?.groupSessionId || "default");
}

export function buildTaskEntityChain(taskId: string) {
  const task = loadTasks().find((item: any) => item.id === taskId);
  if (!task) return null;
  const messages = task.group_id
    ? getGroupMessages(task.group_id, groupSessionIdForTask(task)).filter((message: any) => String(message?.task_id || message?.task?.id || "") === taskId)
    : [];
  const messageEntities = messages.map((message: any, index: number) => ({
    id: String(message.id || stableTaskEntityId("message", { taskId, index, timestamp: message.timestamp, content: message.content })),
    task_id: taskId,
    group_id: task.group_id || "",
    role: message.role || "",
    agent: message.agent || message.target || "",
    type: message.type || "message",
    timestamp: message.timestamp || "",
    summary: compactMemoryText(message.content, 240),
  }));
  const summary = task.delivery_summary || {};
  const rawAssignments = [
    ...(Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []),
    ...messages.flatMap((message: any) => Array.isArray(message.assignments) ? message.assignments : []),
  ];
  const assignments = normalizeDispatchBatch(rawAssignments, { scopeId: task.group_id || taskId, taskId, sourceProject: "coordinator" });
  const receiptRows = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ...(task.receipt ? [task.receipt] : []),
  ];
  const receiptEntities = receiptRows.map((receipt: any) => ({
    id: stableTaskEntityId("receipt", { taskId, agent: receipt.agent || receipt.project, status: receipt.status, summary: receipt.summary, files: receipt.filesChanged || receipt.files_changed || [] }),
    task_id: taskId,
    agent: receipt.agent || receipt.project || task.target_project || "",
    status: receipt.status || "unknown",
    summary: compactMemoryText(receipt.summary || receipt.message, 500),
    files_changed: receipt.filesChanged || receipt.files_changed || receipt.files || [],
    verification: receipt.verification || receipt.tests || [],
    blockers: receipt.blockers || [],
    needs: receipt.needs || [],
  }));
  const dispatchEntities = assignments.map((assignment: any) => {
    const receipt = receiptRows.find((item: any) => String(item.agent || item.project || "").toLowerCase() === String(assignment.project || "").toLowerCase()) || null;
    return createDispatchRecord({
      assignment,
      status: assignment.status === "done" ? "completed" : assignment.status || "pending",
      statusText: assignment.statusText,
      receipt,
      summary: receipt?.summary || assignment.reason || "",
      blockers: receipt?.blockers || [],
      needs: receipt?.needs || [],
    });
  });
  const executionEntities = listExecutions({ taskId }).map((execution: any) => ({
    id: execution.id,
    task_id: execution.taskId,
    project: execution.project,
    state: execution.state,
    runtime: execution.runtime || execution.packet?.agentType || "",
    workspace: execution.workspace,
    process_ids: execution.processIds || [],
    green: execution.green,
    failure: execution.failure || null,
    updated_at: execution.updatedAt || "",
  }));
  const workItemEntities = buildMainAgentWorkItems(task, { executions: executionEntities });
  const sessionEntities = listTaskAgentSessions({ taskId }).map((session: any) => ({
    id: session.id,
    task_id: session.taskId,
    group_id: session.groupId || "",
    project: session.project,
    executor: session.agentType,
    native_session_id: session.nativeSessionId || "",
    resume_mode: session.resumeMode,
    turn_count: session.turnCount,
    status: session.status,
    continuity: getTaskAgentSessionContinuity(session),
  }));
  const trace = task.trace_id ? getTrace(task.trace_id) : null;
  const acceptance = summary.acceptance_gate || null;
  const acceptancePassed = hasStrongTaskAcceptanceEvidence(task, executionEntities, summary);
  const acceptanceEntity = acceptance ? {
    id: stableTaskEntityId("acceptance", { taskId, pass: summary.acceptance_gate_passed, checks: acceptance.checks || acceptance.items || acceptance }),
    task_id: taskId,
    pass: acceptancePassed,
    gate: acceptance,
    reviewed_at: summary.generated_at || task.updated_at || "",
  } : null;
  const reportContent = task.final_report || summary.user_report || task.result || "";
  const reportEntity = reportContent ? {
    id: stableTaskEntityId("report", { taskId, reportContent }),
    task_id: taskId,
    status: task.status,
    content: reportContent,
    generated_at: summary.generated_at || task.completed_at || task.updated_at || "",
  } : null;
  const checks = {
    task_has_trace: !!task.trace_id,
    messages_reference_task: messageEntities.every((message: any) => message.task_id === taskId),
    dispatches_reference_task: dispatchEntities.every((dispatch: any) => dispatch.identity.taskId === taskId),
    executions_reference_task: executionEntities.every((execution: any) => execution.task_id === taskId),
    sessions_reference_task: sessionEntities.every((session: any) => session.task_id === taskId),
    work_items_reference_task: workItemEntities.every((item: any) => item.taskId === taskId),
    completed_task_has_acceptance: task.status !== "done" || acceptanceEntity?.pass === true,
    completed_task_has_report: task.status !== "done" || !!reportEntity,
  };
  return {
    version: 1,
    task: { id: task.id, trace_id: task.trace_id || "", group_id: task.group_id || "", title: task.title, status: task.status, workflow_type: task.workflow_type || "general", collaboration_state: task.collaboration_state || null, created_at: task.created_at, updated_at: task.updated_at },
    messages: messageEntities,
    dispatches: dispatchEntities,
    work_items: workItemEntities,
    executions: executionEntities,
    sessions: sessionEntities,
    trace: trace ? { trace_id: trace.trace_id, created_at: trace.created_at, events: (trace.events || []).slice(-200) } : null,
    receipts: receiptEntities,
    acceptance: acceptanceEntity,
    report: reportEntity,
    links: {
      message_ids: messageEntities.map((item: any) => item.id),
      dispatch_ids: dispatchEntities.map((item: any) => item.identity.assignmentId),
      work_item_ids: workItemEntities.map((item: any) => item.id),
      execution_ids: executionEntities.map((item: any) => item.id),
      session_ids: sessionEntities.map((item: any) => item.id),
      receipt_ids: receiptEntities.map((item: any) => item.id),
      acceptance_id: acceptanceEntity?.id || "",
      report_id: reportEntity?.id || "",
    },
    consistency: { pass: Object.values(checks).every(Boolean), checks },
    generated_at: new Date().toISOString(),
  };
}

export function buildTaskCardView(task: any, executions: any[], sessions: any[]) {
  const summary = task?.delivery_summary || {};
  const planMode = task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
  const phase = taskCardPhase(task, executions);
  const latestContinuation = task?.collaboration_state?.last_continuation || {};
  const waitingUserResolved = latestContinuation.resolves_waiting_user === true
    || latestContinuation.resolvesWaitingUser === true
    || /waiting[_-]?user[_-]?resolution/i.test(String(latestContinuation.source || task?.last_continue_source || ""));
  const deliveryAccepted = hasStrongTaskAcceptanceEvidence(task, executions, summary);
  const visible = shouldShowUserTaskCard(task, summary, executions);
  const hasPlanForPresentation = !!(planMode && (
    (Array.isArray(planMode.steps) && planMode.steps.length)
    || String(planMode.title || planMode.content || planMode.summary || planMode.next_step || "").trim()
    || (Array.isArray(planMode.clarification_questions) && planMode.clarification_questions.length)
  ));
  const hasDeliveryForPresentation = Number(summary.assignment_count || 0) > 0
    || Number(summary.actual_file_change_count || 0) > 0
    || Number(summary.receipt_count || 0) > 0
    || (Array.isArray(executions) && executions.some((item: any) => ["running", "reviewing", "succeeded", "failed"].includes(String(item.state || ""))))
    || !!(summary.delivery_report?.files?.length || summary.delivery_report?.verification?.length || summary.acceptance_gate_passed === true);
  // 无计划也无交付证据时按 reply，避免简单业务误挂「任务交付完成」卡
  const presentation = !visible
    ? "reply"
    : hasDeliveryForPresentation
      ? "delivery"
      : hasPlanForPresentation
        ? "plan"
        : "reply";
  const phaseLabels: any = {
    planning: "正在分析",
    queued: "准备开始",
    dispatching: "正在安排工作",
    executing: "正在修改",
    reworking: "正在修复问题",
    reviewing: "正在运行测试",
    needs_user: "需要你确认",
    change_review: "等待你审阅",
    blocked: "正在恢复",
    completed: "已完成",
    cancelled: "已取消",
    reverted: "已安全撤销",
  };
  const progressByPhase: any = { planning: 10, queued: 20, dispatching: 30, executing: 55, reworking: 65, reviewing: 85, needs_user: 70, change_review: 95, blocked: 60, completed: 100, cancelled: 0, reverted: 100 };
  const terminalPhase = phase === "completed" || phase === "cancelled" || phase === "reverted";
  const gapItems = terminalPhase ? [] : getTaskGapItems(task);
  const dashboardWorkers = getDashboardWorkerRows(task);
  const workItems = buildMainAgentWorkItems(task, { executions });
  const workItemSummary = buildMainAgentWorkItemSummary(workItems);
  const workItemClaimSummary = task?.work_item_runtime?.last_claim_summary || task?.work_item_claim_summary || null;
  const workItemUnlockSummary = task?.work_item_runtime?.last_unlock_summary || task?.work_item_unlock_summary || null;
  const completionReadinessSummary = buildUserCompletionReadinessSummary(task, summary, workItems, phase);
  const laneNames = uniqueStrings([
    ...executions.map((item: any) => item.project),
    ...sessions.map((item: any) => item.project),
  ].filter(Boolean));
  const workers: any[] = [...dashboardWorkers];
  for (const name of laneNames) {
    if (workers.some((item: any) => item.agent === name)) continue;
    const execution = [...executions].reverse().find((item: any) => item.project === name);
    const session = [...sessions].reverse().find((item: any) => item.project === name);
    workers.push({ agent: name, task: "", status: execution?.state === "succeeded" ? "done" : execution?.state === "failed" ? "failed" : session?.status === "open" ? "running" : "pending", summary: "", files_changed: [], verification: [], blockers: [] });
  }
  for (const item of workItems) {
    const agentName = item.owner || item.target;
    if (!agentName || workers.some((worker: any) => worker.agent === agentName)) continue;
    workers.push({
      agent: agentName,
      task: item.subject,
      status: item.status === "completed" ? "done" : item.status,
      summary: item.evidence[0] || item.description || "",
      files_changed: item.filesChanged,
      verification: item.verification,
      blockers: item.blockers,
      work_item_id: item.id,
    });
  }
  if (waitingUserResolved && phase === "reworking") {
    for (const worker of workers) {
      if (!["blocked", "needs_user", "needs_info", "waiting_user"].includes(String(worker.status || "").toLowerCase())) continue;
      worker.status = "pending";
      worker.summary = "任务条件已收到，等待重新复核。";
      worker.blockers = [];
    }
  }
  const activeAgents = terminalPhase ? [] : uniqueStrings([
    ...executions.filter(item => ["spawning", "ready", "prompt_accepted", "running", "reviewing"].includes(item.state)).map(item => item.project),
    ...workers.filter((item: any) => ["running", "in_progress", "pending", "partial", "blocked"].includes(String(item.status || ""))).map((item: any) => item.agent),
  ].filter(Boolean));
  const files = uniqueStrings([
    ...(Array.isArray(summary.files_changed) ? summary.files_changed : []),
    ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item: any) => item?.path || item) : []),
  ].filter(Boolean));
  const verification = uniqueStrings(Array.isArray(summary.verification_executed) ? summary.verification_executed : []);
  const workflowTimeline = buildUserWorkflowTimeline(task, summary, phase);
  const rawWorkflowEvents = Array.isArray(summary?.timeline) && summary.timeline.length
    ? summary.timeline
    : (Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []);
  const agentQuestions = buildUserAgentQuestionRows(summary);
  const conflictWarnings = buildUserConflictWarnings(summary);
  const workOrderPreview = buildUserWorkOrderPreview(task, summary, planMode);
  const executionStory = buildUserExecutionStory(task, summary, executions, phase, workOrderPreview);
  const acceptanceReview = buildUserAcceptanceReview(task, summary, executions, phase);
  const planAlignment = buildUserPlanAlignmentReview(task, summary, phase, planMode, workOrderPreview, acceptanceReview);
  const agentCoordination = buildUserAgentCoordinationProtocol(task, summary, executions, workOrderPreview, acceptanceReview);
  const agentProgressSummary = buildUserAgentProgressSummary(task, summary, workers, executions, sessions, workItems, phase);
  const changeSummary = buildUserChangeSummary(task, summary, workers, workItems);
  const receiptReworkSummary = buildUserReceiptReworkSummary(task, summary, agentCoordination);
  const runtimeKernel = summary.runtime_kernel || agentCoordination.runtime_kernel || buildRuntimeKernelSnapshot(task, summary);
  const recoverySummary = buildMainAgentRecoverySummary(task, phase, sessions, workItems, gapItems);
  const continuationStatus = buildUserContinuationStatus(task, phase);
  const liveTodoPlan = buildLiveMainAgentTodoPlan(task, phase, workers, executions, summary);
  const liveMainAgentDecision = buildLiveMainAgentDecisionForTask(task, phase, liveTodoPlan, summary);
  const completed: string[] = [];
  const completedWorkers = workers.filter((item: any) => item.status === "done");
  if (completedWorkers.length) completed.push(`${completedWorkers.length} 个项目已完成修改`);
  if (files.length) completed.push(`修改了 ${files.length} 个文件`);
  if (verification.length) completed.push(`${verification.length} 项检查已执行`);
  const blockers = uniqueStrings([
    ...(task?.intake_state === "awaiting_confirmation" && planMode?.risk?.summary ? [planMode.risk.summary] : []),
    ...gapItems.map(taskCardGapLabel).filter(Boolean),
  ]).slice(0, 6);
  let nextAction = "正在理解你的需求";
  if (phase === "queued") nextAction = "即将开始修改";
  else if (phase === "executing") nextAction = "完成修改后会自动运行检查";
  else if (phase === "reworking") nextAction = waitingUserResolved ? "正在沿用原任务继续复核和验收" : "修复后会重新运行检查";
  else if (phase === "reviewing") nextAction = "检查通过后自动交付";
  else if (phase === "change_review") nextAction = "请审阅整批变更后批准交付，或退回指定子任务返工";
  else if (phase === "needs_user") nextAction = task?.intake_state === "awaiting_confirmation" ? "请确认执行前计划，确认后才会派发子 Agent" : "请补充卡片中列出的信息";
  else if (phase === "blocked") nextAction = "系统正在重试或切换执行器";
  else if (phase === "completed") nextAction = "可以查看改动、继续修改或安全撤销";
  else if (phase === "cancelled") nextAction = "任务已停止，不会继续执行";
  else if (phase === "reverted") nextAction = "最近一轮改动已恢复到任务开始前";
  const userHandoff = buildUserHandoffSummary(task, summary, phase, nextAction, blockers, acceptanceReview, planAlignment, changeSummary);
  const displayStream = buildMainAgentDisplayStream({
    surface: "group",
    mode: phase === "reworking" ? "followup" : "delegation",
    status: task?.status || phase,
    phase,
    userText: summary.headline || task?.status_detail || nextAction,
    goal: task?.business_goal || task?.goal || task?.title || "",
    actionIds: liveMainAgentDecision?.decision?.selected_actions || [],
    steps: liveTodoPlan?.steps || [],
    permissions: liveMainAgentDecision?.permissions || [],
    observations: liveMainAgentDecision?.observation || {},
    traceId: task?.trace_id || "",
    technical: { execution_ids: executions.map(item => item.id), session_ids: sessions.map(item => item.id), failed_gates: summary.failed_gates || [], blockers, recovery_summary: recoverySummary },
    workers: workItems.length ? workItems.map((item: any) => ({ agent: item.owner || item.target, status: item.status, summary: item.evidence?.[0] || item.description, files_changed: item.filesChanged || [], verification: item.verification || [], blockers: item.blockers || [] })) : workers,
    executions,
    summary,
    rawEvents: rawWorkflowEvents,
    taskId: task?.id || "",
  });
  const progressCheckpoints = displayStream.progress_checkpoints || displayStream.workchain?.progress_checkpoints || null;
  return {
    version: 1,
    visible: visible && presentation !== "reply",
    presentation,
    task_id: task?.id || "",
    title: task?.title || "开发任务",
    goal: task?.business_goal || task?.goal || task?.title || "",
    phase,
    phase_label: waitingUserResolved && phase === "reworking" ? "正在继续" : phaseLabels[phase] || phase,
    status: task?.status || "pending",
    progress: progressByPhase[phase] ?? 0,
    active_agents: activeAgents.map((name: string) => `${userAgentRole(name)} · ${name} 正在处理`),
    agents: workers.map((item: any) => ({ name: `${userAgentRole(item.agent)} · ${item.agent}`, status: item.status, summary: userAgentProgress(item), blockers: item.blockers.slice(0, 3) })),
    live_todo_plan: liveTodoPlan,
    work_items: workItems,
    work_item_summary: workItemSummary,
    work_item_claim_summary: workItemClaimSummary,
    workItemClaimSummary,
    work_item_unlock_summary: workItemUnlockSummary,
    workItemUnlockSummary,
    completion_readiness_summary: completionReadinessSummary,
    completionReadinessSummary,
    display_stream: displayStream,
    displayStream,
    progress_checkpoints: progressCheckpoints,
    progressCheckpoints,
    mainAgentDecision: liveMainAgentDecision,
    main_agent_decision: liveMainAgentDecision,
    workflow_timeline: workflowTimeline,
    agent_questions: agentQuestions,
    conflict_warnings: conflictWarnings,
    work_order_preview: workOrderPreview,
    execution_story: executionStory,
    acceptance_review: acceptanceReview,
    plan_alignment: planAlignment,
    planAlignment,
    agent_coordination: agentCoordination,
    agentCoordination,
    agent_progress_summary: agentProgressSummary,
    agentProgressSummary,
    change_summary: changeSummary,
    changeSummary,
    receipt_rework_summary: receiptReworkSummary,
    receiptReworkSummary,
    user_handoff: userHandoff,
    userHandoff,
    runtime_kernel: runtimeKernel,
    runtimeKernel,
    recovery_summary: recoverySummary,
    recoverySummary,
    continuation_status: continuationStatus,
    continuationStatus,
    requirement_epic: task?.workflow_type === "requirement_epic" ? {
      schema: task?.decomposition_plan?.schema || task?.requirement_decomposition?.schema || "ccm-requirement-decomposition-v1",
      content_hash: task?.requirement_content_hash || task?.decomposition_plan?.content_hash || "",
      version: Number(task?.requirement_version || task?.decomposition_plan?.version || 1),
      title: task?.decomposition_plan?.epic_title || task?.title || "需求 Epic",
      items: Array.isArray(task?.decomposition_plan?.items)
        ? task.decomposition_plan.items.slice(0, 50).map((item: any) => ({
            item_key: item.item_key,
            title: compactMemoryText(item.title || item.business_goal || "子任务", 120),
            target_type: item.target_type || "auto",
            target_id: item.target_id || "",
            depends_on: Array.isArray(item.depends_on) ? item.depends_on.slice(0, 20) : [],
            acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria.slice(0, 8) : [],
            parallelizable: item.parallelizable !== false,
          }))
        : [],
      child_task_ids: Array.isArray(task?.child_task_ids) ? task.child_task_ids : [],
      summary: task?.mission_summary || null,
    } : null,
    plan_mode: planMode ? {
      title: planMode.title || "执行前计划",
      mode: planMode.mode || "",
      requires_confirmation: planMode.requires_confirmation === true,
      auto_continue: planMode.auto_continue === true,
      confirmation_status: planMode.confirmation_status || "",
      accepted_at: planMode.accepted_at || planMode.confirmed_at || "",
      accepted_feedback: compactMemoryText(planMode.accepted_feedback || planMode.last_accept_feedback || "", 520),
      next_step: planMode.next_step || "",
      steps: Array.isArray(planMode.steps) ? planMode.steps.slice(0, 8).map((item: any, index: number) => ({
        id: item?.id || `plan-step-${index + 1}`,
        label: compactMemoryText(item?.label || item?.content || item?.message || item || `计划步骤 ${index + 1}`, 180),
        content: compactMemoryText(item?.content || item?.label || item?.message || item || `计划步骤 ${index + 1}`, 180),
        detail: compactMemoryText(item?.detail || item?.reason || item?.evidence || "", 220),
        activeForm: compactMemoryText(item?.activeForm || item?.active_form || item?.label || item?.content || "", 180),
        status: item?.status || "pending",
      })) : [],
      risk: planMode.risk ? { level: planMode.risk.level || "low", summary: planMode.risk.summary || "", reasons: Array.isArray(planMode.risk.reasons) ? planMode.risk.reasons.slice(0, 6) : [] } : null,
      impact_scope: planMode.impact_scope ? { areas: Array.isArray(planMode.impact_scope.areas) ? planMode.impact_scope.areas.slice(0, 6) : [], projects: Array.isArray(planMode.impact_scope.projects) ? planMode.impact_scope.projects.slice(0, 8) : [], multi_agent: planMode.impact_scope.multi_agent === true } : null,
      read_only_exploration: planMode.read_only_exploration ? { summary: compactMemoryText(planMode.read_only_exploration.summary || "", 520), projects: Array.isArray(planMode.read_only_exploration.projects) ? planMode.read_only_exploration.projects.slice(0, 8) : [], knowledge_used: planMode.read_only_exploration.knowledge_used === true, code_snapshot_used: planMode.read_only_exploration.code_snapshot_used === true } : null,
      acceptance: Array.isArray(planMode.acceptance) ? planMode.acceptance.slice(0, 6) : [],
      clarification_questions: Array.isArray(planMode.clarification_questions) ? planMode.clarification_questions.slice(0, 5).map((item: any) => ({
        id: item.id || "",
        question: compactMemoryText(item.question || "", 220),
        reason: compactMemoryText(item.reason || "", 220),
        examples: Array.isArray(item.examples) ? item.examples.slice(0, 3) : [],
        status: item.status || "open",
        answer: compactMemoryText(item.answer || "", 220),
      })) : [],
      needs_clarification: planMode.needs_clarification === true,
      permission_boundaries: Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries.slice(0, 6) : [],
      session_strategy: planMode.session_strategy || null,
      revision: planMode.revision_status || planMode.last_revision_feedback ? {
        status: planMode.revision_status || "revision_requested",
        count: Number(planMode.revision_count || 0),
        feedback: compactMemoryText(planMode.last_revision_feedback || "", 420),
        revised_at: planMode.revised_at || "",
        next_step: planMode.next_step || "请重新确认调整后的执行前计划。",
      } : null,
    } : null,
    completed: completed.slice(0, 6),
    blockers,
    next_action: nextAction,
    delivery_report: summary.delivery_report || null,
    deliveryReport: summary.delivery_report || null,
    post_review_spot_check_summary: summary.post_review_spot_check_summary || summary.delivery_report?.post_review_spot_check_summary || null,
    postReviewSpotCheckSummary: summary.post_review_spot_check_summary || summary.delivery_report?.postReviewSpotCheckSummary || null,
    completion_card: summary.delivery_report?.completion_card || summary.completion_card || null,
    completionCard: summary.delivery_report?.completion_card || summary.completionCard || null,
    pickup_summary: summary.delivery_report?.pickup_summary || summary.pickup_summary || null,
    pickupSummary: summary.delivery_report?.pickup_summary || summary.pickupSummary || null,
    delivery: { headline: summary.headline || task?.status_detail || "", files: files.slice(0, 30), changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 30) : [], verification: verification.slice(0, 20), risks: uniqueStrings([...(summary.risks || []), ...(summary.remaining_items || []), ...(summary.advisory_needs || [])]).slice(0, 10), acceptance_passed: deliveryAccepted },
    actions: buildUserTaskActions(task, phase, executions),
    technical: { trace_id: task?.trace_id || "", execution_ids: executions.map(item => item.id), session_ids: sessions.map(item => item.id), source_ingestion: task?.source_ingestion || task?.sourceIngestion || null, requirement_extraction: task?.requirement_extraction || task?.requirementExtraction || null, work_item_ids: workItems.map((item: any) => item.id), work_item_summary: workItemSummary, work_item_claim_summary: workItemClaimSummary, work_item_unlock_summary: workItemUnlockSummary, completion_readiness_summary: completionReadinessSummary, recovery_summary: recoverySummary, continuation_state: task?.collaboration_state?.last_continuation || null, receipt_rework_summary: receiptReworkSummary, agent_progress_summary: agentProgressSummary, change_summary: changeSummary, plan_alignment: planAlignment, user_handoff: userHandoff, post_review_spot_check: summary.post_review_spot_check || null, gap_fingerprint: terminalPhase ? "" : getTaskGapFingerprint(task), entity_chain_endpoint: `/api/tasks/entity-chain?id=${encodeURIComponent(task?.id || "")}`, mainAgentDecision: liveMainAgentDecision, main_agent_decision: liveMainAgentDecision, runtime_kernel: runtimeKernel, display_stream: displayStream },
    updated_at: task?.updated_at || new Date().toISOString(),
  };
}

export function normalizeContinuationKind(kind: string) {
  const value = String(kind || "").trim();
  return ["supplement", "revise_goal", "new_task"].includes(value) ? value : "supplement";
}

export function buildContinuationUserDecision(input: any = {}) {
  const source = String(input.source || "").trim();
  const kind = normalizeContinuationKind(input.kind || input.continuation_kind || input.continuationKind);
  const meta = input.meta || input.continuation || {};
  const reworkKind = String(meta.rework_kind || meta.reworkKind || "").trim();
  const target = compactMemoryText(meta.target || meta.agent || meta.project || input.target || "", 80);
  const reason = compactMemoryText(meta.reason || meta.detail || meta.title || meta.label || input.reason || "", 180);
  const resolvesWaitingUser = meta.resolves_waiting_user === true
    || meta.resolvesWaitingUser === true
    || input.resolve_waiting_user === true
    || input.resolveWaitingUser === true
    || /waiting[_-]?user[_-]?resolution/i.test(source);
  const isNextWorkItem = reworkKind === "next_claimable_work_item" || /next_work_item|user_next_work_item/i.test(`${source} ${reworkKind}`);
  const isQualityFollowup = /quality[_-]?followup/i.test(`${source} ${reworkKind}`);
  const isTargeted = isNextWorkItem || /targeted|gap_rework|rework|ack_rewrite|missing_|contract_|weak_receipt/i.test(`${source} ${reworkKind}`);
  const replanRequired = kind === "revise_goal" || meta.replan_required === true || input.replan_required === true;
  const interruptCurrentRun = replanRequired && (meta.interrupt_current_run === true || meta.interruptCurrentRun === true || input.interrupt_current_run === true || input.interruptCurrentRun === true);
  const deferred = input.deferred === true || String(input.status || "") === "deferred";
  const strategy = isNextWorkItem
    ? "continue_next_work_item"
    : isQualityFollowup
      ? "complete_quality_followup"
    : isTargeted
      ? "targeted_rework"
      : replanRequired
        ? "replan_same_task"
        : "continue_same_task";
  const kindLabel: any = {
    supplement: resolvesWaitingUser ? "任务条件" : "补充要求",
    revise_goal: "目标调整",
    new_task: "独立新任务",
  };
  const routeLabel = deferred
    ? interruptCurrentRun
      ? "先停止当前轮再重核计划"
      : "本轮结束后接续"
    : replanRequired
      ? "先重核计划再继续"
      : isNextWorkItem
        ? "继续派发已解锁工作项"
        : isQualityFollowup
          ? "补齐交付总结"
        : isTargeted
          ? "定向返工"
          : "并入同一任务";
  const title = resolvesWaitingUser
    ? "任务条件已补充"
    : isNextWorkItem
    ? "下一步派发已接上"
    : isQualityFollowup
      ? "交付总结补齐已接上"
    : isTargeted
      ? "精准返工已接上"
      : replanRequired
        ? "目标调整已接收"
        : "补充要求已接收";
  const targetText = target ? `${target} 的` : "";
  const headline = resolvesWaitingUser
    ? "我已收到任务所需条件，会在同一任务里继续处理。"
    : isNextWorkItem
    ? `我已接收${targetText}已解锁工作项，只推进这一小步。`
    : isQualityFollowup
      ? "我已接上交付总结补齐，会补齐交付证据、验证结果和验收结论。"
    : isTargeted
      ? `我已接收${targetText}返工缺口，会复用当前任务上下文继续处理。`
      : replanRequired && interruptCurrentRun
        ? "我已收到新的目标边界，会先停止可能跑偏的当前执行轮，再重新核对计划。"
        : replanRequired
        ? "我已收到新的目标边界，会先重新核对计划，再在同一任务里继续推进。"
        : "我已收到你的补充要求，会在同一任务里继续处理。";
  const nextAction = deferred
    ? replanRequired && interruptCurrentRun
      ? "我正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。"
      : replanRequired
      ? "当前执行轮结束后，我会先重新核对目标、影响范围和验收条件，再决定是否继续派发或返工。"
      : "当前执行轮结束后，我会自动接着处理这条补充。"
    : replanRequired
      ? "我会复用原任务上下文重新核对计划，必要时重新派发执行成员，完成后重新验收并总结。"
      : isQualityFollowup
      ? "我会复用已有执行结果和复核证据，补齐最终总结缺口，完成后重新给你一份可验收总结。"
      : "我会复用原任务证据继续执行，完成后重新验收并总结。";
  const statusDetail = resolvesWaitingUser
    ? deferred
      ? "补充信息已收到，本轮结束后会沿用原任务继续复核和验收"
      : "补充信息已收到，正在沿用原任务继续复核和验收"
    : deferred
    ? replanRequired && interruptCurrentRun
      ? "已收到目标调整，正在停止当前执行轮并准备重核计划"
      : replanRequired
      ? "已收到目标调整，本轮结束后会先重新核对计划再继续"
      : "已收到追加要求，本轮结束后将在同一任务中继续"
    : replanRequired
      ? "已收到目标调整，等待我重新核对计划并继续执行"
      : isQualityFollowup
      ? "已接上交付总结补齐，等待我补齐证据、验证和验收结论"
      : "已收到补充说明，等待我继续执行";
  const steps = [
    {
      id: "capture",
      label: resolvesWaitingUser ? "已收到任务所需条件" : replanRequired ? "已记录新的目标边界" : isQualityFollowup ? "已记录总结补齐要求" : "已记录补充要求",
      detail: resolvesWaitingUser ? "用户补充已写入当前任务上下文，具体内容只保留在用户消息和执行上下文中。" : reason || "补充内容已写入当前任务上下文。",
    },
    {
      id: "preserve_context",
      label: "保留已有上下文",
      detail: "已完成的文件、验证和执行成员结果说明会继续作为判断依据。",
    },
    {
      id: replanRequired ? (interruptCurrentRun ? "interrupt_and_replan" : "replan") : deferred ? "defer" : "continue",
      label: replanRequired ? (interruptCurrentRun ? "停止当前轮并重核计划" : "重新核对计划") : deferred ? "等待当前轮结束" : isQualityFollowup ? "补齐交付总结" : "继续同一任务",
      detail: nextAction,
    },
  ];
  return {
    kind,
    kind_label: kindLabel[kind] || "补充要求",
    strategy,
    route_label: routeLabel,
    title,
    headline,
    reason,
    target,
    replan_required: replanRequired,
    interrupt_current_run: interruptCurrentRun,
    next_action: nextAction,
    status_detail: statusDetail,
    steps,
    timeline_type: resolvesWaitingUser ? "waiting_user_resolution" : replanRequired ? "task_goal_revision" : isNextWorkItem ? "next_work_item_dispatch" : isQualityFollowup ? "quality_followup_continuation" : isTargeted ? "targeted_rework" : "task_continuation",
    timeline_detail: resolvesWaitingUser ? "用户已补充任务所需条件，我将复用同一任务上下文继续处理。" : reason || (replanRequired ? "用户调整了目标边界，我将重新核对计划。" : "我已复用同一任务上下文继续处理。"),
  };
}

export function buildUserContinuationStatus(task: any, phase = "") {
  const terminal = ["completed", "cancelled", "reverted"].includes(String(phase || ""))
    || ["done", "cancelled"].includes(String(task?.status || ""));
  if (terminal) return null;
  const last = task?.collaboration_state?.last_continuation || task?.last_continuation || null;
  if (!last?.at) return null;
  const source = String(last.source || task?.last_continue_source || "").trim();
  const kind = String(last.rework_kind || last.reworkKind || last.kind || "").trim();
  const target = compactMemoryText(last.target || last.agent || last.project || "", 80);
  const reason = compactMemoryText(last.reason || last.detail || "", 180);
  const titleText = compactMemoryText(last.title || last.label || "", 120);
  const workItemId = compactMemoryText(last.work_item_id || last.workItemId || "", 80);
  const status = String(task?.status || "") === "in_progress" && last.status === "deferred"
    ? "deferred"
    : String(task?.status || "") === "in_progress" && last.status === "interrupting"
      ? "interrupting"
    : ["pending", "queued"].includes(String(task?.status || "")) ? "queued"
      : phase === "reworking" ? "active" : String(last.status || "accepted");
  const statusLabel: any = {
    queued: "已入队",
    accepted: "已接收",
    active: "处理中",
    deferred: "本轮后继续",
    interrupting: "正在停止当前轮",
  };
  const detail = reason || titleText || (workItemId ? `工作项 ${workItemId}` : "");
  const decision = buildContinuationUserDecision({
    source,
    kind: last.kind,
    meta: { ...last, reason: detail },
    status,
    deferred: status === "deferred" || status === "interrupting",
  });
  return {
    schema: "ccm-main-agent-continuation-status-v1",
    title: decision.title,
    status,
    status_label: statusLabel[status] || "已接收",
    headline: decision.headline,
    kind: decision.kind,
    kind_label: decision.kind_label,
    strategy: decision.strategy,
    route_label: decision.route_label,
    replan_required: decision.replan_required,
    interrupt_current_run: decision.interrupt_current_run,
    target,
    reason: detail,
    handoff_steps: decision.steps,
    next_action: decision.next_action,
    at: last.at,
    technical: { source, kind, work_item_id: workItemId },
  };
}

export function shouldResumeAfterGoalRevisionInterruption(task: any, executionFollowupRevision = 0) {
  if (!task?.id) return false;
  const state = task.collaboration_state || {};
  const interruption = state.goal_revision_interruption || {};
  const pending = Array.isArray(task.pending_followups) ? task.pending_followups : [];
  const hasGoalRevision = pending.some((item: any) => item?.kind === "revise_goal" || item?.continuation?.replan_required === true);
  return interruption.requested === true
    && hasGoalRevision
    && Number(task.followup_revision || 0) > Number(executionFollowupRevision || 0);
}

export function buildGoalRevisionInterruptedStatus(pending: any[] = []) {
  const count = Math.max(1, pending.filter((item: any) => item?.status !== "accepted").length);
  const hasGoalRevision = pending.some((item: any) => item?.kind === "revise_goal" || item?.continuation?.replan_required === true);
  return hasGoalRevision
    ? "已按目标调整停止当前执行轮；我会重新核对计划并继续"
    : `已接收 ${count} 条追加要求，继续使用当前任务上下文`;
}

export function shouldShowUserTaskCard(task: any, summary: any = {}, executions: any[] = []) {
  const explicit = task?.workflow_meta?.intake?.task_intent || task?.workflowMeta?.intake?.task_intent;
  if (explicit?.executable === false) return false;
  if (explicit?.executable === true) return true;
  const hasWorkEvidence = Number(summary.assignment_count || 0) > 0
    || Number(summary.actual_file_change_count || 0) > 0
    || Number(summary.worker_notification_count || 0) > 0
    || Number(summary.receipt_count || 0) > 0
    || (Array.isArray(summary.receipts) && summary.receipts.length > 0)
    || (Array.isArray(summary.receipt_statuses) && summary.receipt_statuses.length > 0)
    || (Array.isArray(executions) && executions.length > 0 && executions.some((item: any) => ["running", "reviewing", "succeeded", "failed"].includes(String(item.state || ""))));
  if (hasWorkEvidence) return true;
  const intent = classifyGroupProjectTaskIntent(String(task?.business_goal || task?.title || ""));
  return intent.executable;
}

export function timelineStatusForUser(item: any) {
  const status = String(item?.status || "").toLowerCase();
  if (["ok", "done", "success", "succeeded", "completed"].includes(status)) return "done";
  if (["fail", "failed", "error"].includes(status)) return "failed";
  if (["warn", "warning", "blocked"].includes(status)) return "warning";
  if (["active", "running", "in_progress"].includes(status)) return "active";
  return "pending";
}

export function timelineLabelForUser(item: any) {
  const type = String(item?.type || "");
  const agent = item?.agent ? `${item.agent}：` : "";
  const title = String(item?.title || "").trim();
  if (type === "queued_group_task") return "我已接收任务";
  if (type === "coordinator_plan") return "我已制定协作计划";
  if (type === "reasoning_plan" || type === "reasoning_preflight") return "我已复核目标";
  if (type === "sandbox_rehearsal") return "已完成任务前预演";
  if (type === "conflict_plan") return "已预判潜在修改冲突";
  if (type === "global_mission_handoff_ready") return "我已补齐子任务交接";
  if (type === "worker_handoff_ready") return `${agent}工作单已补齐`;
  if (type === "global_mission_plan") return "我已制定跨项目计划";
  if (type === "dispatch") return "已派发给执行成员";
  if (type === "direct_task") return "已派发给项目执行成员";
  if (type === "child_agent_start") return `${agent}开始处理`;
  if (type === "child_agent_rework") return `${agent}开始返工`;
  if (type === "child_agent_failed") return `${agent}执行遇到问题`;
  if (type === "child_agent_receipt") return `${agent}提交结果`;
  if (type === "agent_qa_question") return `${agent}向其他执行成员确认问题`;
  if (type === "agent_qa_waiting") return `${agent}等待依赖回答`;
  if (type === "agent_qa_accepted") return "我已采纳协作回答";
  if (type === "agent_qa_resume") return `${agent}拿到回答并继续执行`;
  if (type === "plan_mode_confirmed") return "执行前计划已确认";
  if (type === "plan_mode_revision_requested") return "执行前计划已按反馈调整";
  if (type === "next_work_item_dispatch") return "我已接上下一步派发";
  if (type === "targeted_rework") return "我已接上精准返工";
  if (type === "auto_gap_rework") return "我已按缺口继续";
  if (type === "waiting_user_resolution") return "任务条件已补充";
  if (type === "task_continuation") return "我已收到补充要求";
  if (type === "coordinator_review") return "我正在验收";
  if (type === "acceptance_gate") return "已检查交付质量";
  if (type === "reasoning_recovery_check" || type === "startup_manual_recovery") return "我已接上恢复任务";
  if (type === "native_session_retry") return `${agent}恢复会话继续执行`;
  if (type === "runtime_fallback" || type === "runtime_switch") return agent ? `${agent}切换执行通道` : "执行通道已切换";
  if (type === "permission_drift") return agent ? `${agent}权限状态已校正` : "权限状态已校正";
  if (type === "runtime_debt_cleanup") return "运行通道已清理";
  if (type === "task_rollback") return "已安全撤销改动";
  if (type === "global_supervisor_cycle") return "我已检查子任务";
  if (type === "global_supervisor_rework") return "我已安排返工";
  if (type === "global_supervisor_waiting_user") return "等待你处理阻塞";
  if (type === "global_supervisor_completed") return "全局任务已通过交付验收";
  if (type === "global_direct_dispatch_continuation_synced") return "全局会话已同步接续状态";
  if (type === "global_direct_dispatch_completion_synced") return "全局会话已同步最终总结";
  if (type === "global_direct_dispatch_rollback_synced") return "全局会话已同步撤销结果";
  if (type === "global_agent.supervising") return "全局任务已进入持续跟踪";
  if (type === "global_agent.run_completed") return "我已完成总结";
  return title || "协作状态更新";
}

export function buildUserWorkflowTimeline(task: any, summary: any, phase: string) {
  const timeline = Array.isArray(summary?.timeline) && summary.timeline.length
    ? summary.timeline
    : (Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []);
  const visible = timeline
    .filter((item: any) => !/CCM_AGENT_RECEIPT|scratchpad|Trace|session|原始提示词/i.test(`${item?.title || ""}\n${item?.detail || ""}`))
    .map((item: any) => ({
      id: item.id || `${item.at || ""}:${item.type || ""}:${item.title || ""}`,
      at: item.at || "",
      label: timelineLabelForUser(item),
      detail: compactMemoryText(item.detail || "", 140),
      agent: item.agent || "",
      status: timelineStatusForUser(item),
      phase: item.phase || "",
    }))
    .filter((item: any) => item.label)
    .slice(-8);
  if (visible.length) return visible;
  const fallback: any[] = [
    { id: "understand", label: "主 Agent 正在理解需求", status: ["planning", "queued", "dispatching", "executing", "reviewing", "completed"].includes(phase) ? "done" : "active" },
    { id: "dispatch", label: "安排合适的项目 Agent", status: ["dispatching", "executing", "reviewing", "completed"].includes(phase) ? "done" : phase === "planning" ? "pending" : "active" },
    { id: "execute", label: "子 Agent 修改并验证", status: ["reviewing", "completed"].includes(phase) ? "done" : phase === "executing" ? "active" : "pending" },
    { id: "review", label: "主 Agent 验收交付", status: phase === "completed" ? "done" : phase === "reviewing" ? "active" : "pending" },
  ];
  return fallback;
}

export function buildUserAgentQuestionRows(summary: any) {
  const items = Array.isArray(summary?.agent_qa) ? summary.agent_qa : [];
  return items.slice(-6).map((item: any) => {
    const accepted = item.acceptance?.accepted === true || item.status === "resumed" || item.resumed_at;
    const waiting = ["waiting", "asking", "queued", "timeout", "manual"].includes(String(item.status || ""));
    const preview = buildAgentQaUserPreview(item, accepted ? "resume" : item.answer ? "answer" : "question");
    return {
      id: item.id || `${item.from_agent || ""}:${item.to_agent || ""}:${item.question || ""}`,
      schema: preview.schema,
      from: preview.from || item.from_agent || "子 Agent",
      to: preview.to || item.to_agent || "目标 Agent",
      summary: preview.summary,
      question: preview.question || sanitizeUserAgentProgressText(item.question || "", "问题原文已收进技术详情。", 160),
      answer: preview.answer || (item.answer ? sanitizeUserAgentProgressText(item.answer || "", "回答详情已收进技术详情。", 160) : ""),
      status: accepted ? "accepted" : waiting ? "waiting" : item.status || "answered",
      label: preview.label || (accepted ? "已采纳并继续" : waiting ? "等待回答" : item.answer ? "已回答" : "已记录"),
      next_action: preview.next_action,
      badges: preview.badges || [],
      display_policy: preview.display_policy,
    };
  });
}

export function buildUserConflictWarnings(summary: any) {
  const timeline = Array.isArray(summary?.timeline) ? summary.timeline : [];
  const plans = timeline.filter((item: any) => item.type === "conflict_plan" && item.data);
  return plans.flatMap((item: any) => {
    const conflicts = Array.isArray(item.data?.conflicts) ? item.data.conflicts : [];
    if (!conflicts.length && item.detail) return [{ id: item.id || "conflict", title: "已启用冲突保护", detail: compactMemoryText(item.detail, 160), agents: [] }];
    return conflicts.map((conflict: any, index: number) => ({
      id: `${item.id || "conflict"}:${index}`,
      title: `${(conflict.projects || []).join(" 与 ") || "多个 Agent"} 可能修改同一范围`,
      detail: compactMemoryText(conflict.reason || "系统已改为更安全的执行顺序", 160),
      agents: conflict.projects || [],
      scopes: conflict.scopes || [],
    }));
  }).slice(-4);
}

export function splitUserAcceptanceText(value: any) {
  if (Array.isArray(value)) return value.map((item: any) => compactMemoryText(item, 160)).filter(Boolean);
  return String(value || "")
    .split(/(?:\n|；|;|。|\d+[、.]\s*)+/)
    .map(item => compactMemoryText(item, 160))
    .filter(Boolean)
    .slice(0, 8);
}

export function getTaskPlanMode(task: any) {
  return require("./collaboration-task-intake").getTaskPlanMode(task);
}
