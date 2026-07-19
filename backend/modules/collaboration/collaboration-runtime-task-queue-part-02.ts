// Behavior-freeze split from collaboration-runtime-task-queue.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 1/9).
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
  CollabCtx,
  getProjectExtraConfig,
} from "./collaboration-runtime-plan-tools";

import {
  buildTargetedReworkContinuationDraft,
  continueTaskWithMessage,
  updateTask,
} from "./collaboration-runtime-runtime-tools";

import {
  buildTaskCardView,
  deriveTaskLifecycle,
  groupSessionIdForTask,
} from "./collaboration-runtime-task-queue-part-01";

export function buildPlanModeClarificationQuestions(message: string, risk: any = {}, selectedProjects: string[] = []) {
  return require("./collaboration-task-intake").buildPlanModeClarificationQuestions(message, risk, selectedProjects);
}

export function buildGroupPlanModePreflight(input: { group: any; message: string; ctx: CollabCtx; configs?: any[]; taskIntent?: any; attachmentCount?: number; coordinatorProject?: string }) {
  return require("./collaboration-task-intake").buildGroupPlanModePreflight(input);
}

export function buildGroupProjectAnalysisContext(group: any, message: string, ctx: CollabCtx, configs = getConfigs()) {
  return buildGroupProjectAnalysisContextBase(group, message, ctx, configs, {
    compactMemoryText,
    compactPreserveLines,
    getProjectExtraConfig,
    buildProjectMemoryPacket,
  });
}

export function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string) {
  return require("./collaboration-task-intake").buildProjectCodeReadOnlySnapshot(project, workDir, message);
}

export function runCollaborationUxSelfTest() {
  return require("./collaboration-ux-self-tests").runCollaborationUxSelfTest();
}

export function buildInlineTaskRuntime(task: any) {
  const executions = listExecutions({ taskId: task.id });
  const sessions = listTaskAgentSessions({ taskId: task.id });
  const running = executions.filter(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state));
  const failed = executions.filter(item => item.state === "failed");
  const reviewing = executions.filter(item => item.state === "reviewing");
  const mergeReady = executions.filter(item => item.green?.level === "merge_ready");
  return {
    taskId: task.id,
    status: task.status,
    statusText: task.status_detail || "",
    updatedAt: task.updated_at || new Date().toISOString(),
    lifecycle: deriveTaskLifecycle(task, executions),
    reasoning: task.reasoning_loop ? {
      planVersion: Number(task.reasoning_loop.plan_version || 0),
      openAssertions: (task.reasoning_loop.assertions || []).filter((item: any) => item.status !== "passed").length,
      deviations: (task.reasoning_loop.deviations || []).length,
      recoveryChecks: (task.reasoning_loop.recovery_checks || []).length,
      lastDecision: task.reasoning_loop.explanations?.[task.reasoning_loop.explanations.length - 1] || null,
    } : null,
    counts: { total: executions.length, running: running.length, reviewing: reviewing.length, failed: failed.length, mergeReady: mergeReady.length },
    agents: executions.map(item => ({
      project: item.project,
      state: item.state,
      green: item.green?.level || "none",
      failureClass: item.failure?.failureClass || "",
      runtimeFallbacks: (item.events || []).filter((event: any) => event.name === "runtime.fallback").length,
      conflictGroup: item.workspace?.conflictGroup || "",
    })),
    sessions: sessions.map(session => ({
      project: session.project,
      agentType: session.agentType,
      status: session.status,
      nativeSessionId: session.nativeSessionId || "",
      ...getTaskAgentSessionContinuity(session),
    })),
    taskCard: buildTaskCardView(task, executions, sessions),
    task_card: buildTaskCardView(task, executions, sessions),
  };
}

export function updateGroupTaskInlineStatus(task: any, status: string, detail = "") {
  if (!task?.group_id || !task?.id) return null;
  const sessionId = groupSessionIdForTask(task);
  const messages = getGroupMessages(task.group_id, sessionId);
  const runtime = buildInlineTaskRuntime({ ...task, status, status_detail: detail || task.status_detail });
  let changed = false;
  const next = messages.map((message: any) => {
    if (message?.task_id !== task.id) return message;
    changed = true;
    const {
      taskRuntime: _storedTaskRuntime,
      task_runtime: _storedTaskRuntimeSnake,
      taskCard: _storedTaskCard,
      task_card: _storedTaskCardSnake,
      ...messageWithoutStoredRuntime
    } = message;
    return {
      ...messageWithoutStoredRuntime,
      task: message.task ? { ...message.task, status, status_detail: detail || task.status_detail || "" } : message.task,
      workflow: { ...(message.workflow || {}), phase: status === "done" ? "complete" : status === "failed" || status === "cancelled" ? "needs_rework" : status === "in_progress" ? "executing" : (message.workflow?.phase || "dispatching"), updated_at: new Date().toISOString() },
    };
  });
  if (changed) saveGroupMessages(task.group_id, next, sessionId);
  return runtime;
}

export function buildChildAgentWorkerHandoff(targetProject: string, taskText = "", options: any = {}) {
  return require("./collaboration-task-intake").buildChildAgentWorkerHandoff(targetProject, taskText, options);
}

export function taskAgentInvocationMemoryOptions(edge: any) {
  return require("./collaboration-coordination-ux").taskAgentInvocationMemoryOptions.apply(null, arguments as any);
}

export function taskAgentSessionLifecycleRunnerOptions(snapshot: any) {
  return require("./collaboration-coordination-ux").taskAgentSessionLifecycleRunnerOptions.apply(null, arguments as any);
}

export function buildWorkerContinuationHandoff(task: any, targetProject = "", options: any = {}) {
  return require("./collaboration-coordination-ux").buildWorkerContinuationHandoff.apply(null, arguments as any);
}

function extractMemoryDispatchFreshnessGate(memory: any): any {
  return require("./collaboration-coordination-ux").extractMemoryDispatchFreshnessGate.apply(null, arguments as any);
}

function renderMemoryDispatchFreshnessGateForContract(memory: any, handoff: any = null) {
  return require("./collaboration-coordination-ux").renderMemoryDispatchFreshnessGateForContract.apply(null, arguments as any);
}

export function buildChildAgentDevelopmentContract(targetProject: string, taskText = "", options: any = {}) {
  return require("./collaboration-coordination-ux").buildChildAgentDevelopmentContract.apply(null, arguments as any);
}

export function getTaskById(taskId: string) {
  if (!taskId) return null;
  return loadTasks().find((task: any) => task.id === taskId) || null;
}

export function buildChildAgentTaskText(childTaskText: string, task: any = null) {
  if (!task || task.workflow_type !== "daily_dev") return childTaskText;
  return [
    "原始业务开发任务上下文：",
    `- 任务：${task.title || "未命名任务"}`,
    task.business_goal || task.businessGoal ? `- 业务目标：${compactMemoryText(task.business_goal || task.businessGoal, 700)}` : "",
    task.acceptance_criteria || task.acceptanceCriteria ? `- 全局验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 700)}` : "",
    task.source_documents || task.sourceDocuments ? `- 关联文档摘要：${compactMemoryText(task.source_documents || task.sourceDocuments, 900)}` : "",
    "",
    "主 Agent 指派给你的子任务：",
    childTaskText || "请根据原始业务开发任务上下文完成你负责的实现与验证。",
  ].filter(line => line !== "").join("\n");
}

export function buildQueuedGroupTaskMessage(task: any) {
  return require("./collaboration-task-intake").buildQueuedGroupTaskMessage(task);
}

export function normalizePlanAssignments(assignments: any[]) {
  return (assignments || []).map((item: any) => ({
    ...item,
    status: item.status || "pending",
    statusText: item.statusText || "待处理",
    attempt: Number(item.attempt || 1),
    rework: !!item.rework,
    continuationOf: String(item.continuationOf || item.continuation_of || "").trim(),
    continuationStrategy: String(item.continuationStrategy || item.continuation_strategy || "").trim(),
  }));
}

function getWorkflowPhaseFromAssignments(assignments: any[] = []) {
  const items = assignments || [];
  if (items.length === 0) return "understanding";
  const statuses = items.map((item: any) => String(item.status || "pending"));
  if (statuses.some(s => ["failed", "blocked", "needs_info", "partial"].includes(s))) return "needs_rework";
  if (statuses.some(s => s === "running")) return "executing";
  if (statuses.every(s => s === "done")) return "reviewing";
  return "dispatching";
}

export function buildWorkflowMeta(phase: string, label = "") {
  return {
    phase,
    label: label || phase,
    updated_at: new Date().toISOString(),
  };
}

export function getInitialWorkflowMeta(assignments: any[], dispatchPolicy: any, label = "主 Agent 初始计划") {
  const action = String(dispatchPolicy?.action || "");
  if (action === "ask_user") return buildWorkflowMeta("needs_user", "等待用户补充");
  if (action === "hold") return buildWorkflowMeta("hold", "暂不执行");
  if (action === "direct_answer") return buildWorkflowMeta("complete", "直接回复");
  if (dispatchPolicy?.requiresConfirmation) return buildWorkflowMeta("needs_user", "等待用户确认");
  return buildWorkflowMeta((assignments || []).length ? "dispatching" : "understanding", label);
}

export function updateGroupMessageAssignmentStatus(
  groupId: string,
  messageId: string,
  project: string,
  status: string,
  statusText = ""
) {
  if (!messageId || !project) return null;
  const located = findGroupChatSessionContainingMessage(groupId, messageId);
  const sessionId = located?.session?.id || "";
  const messages = located?.messages || getGroupMessages(groupId);
  let changed = false;
  let workflow: any = null;
  for (const msg of messages) {
    if (msg.id !== messageId || !Array.isArray(msg.assignments)) continue;
    msg.assignments = msg.assignments.map((item: any) => {
      if (item.project !== project) return item;
      changed = true;
      return {
        ...item,
        status,
        statusText: statusText || status,
        updated_at: new Date().toISOString(),
      };
    });
    const phase = getWorkflowPhaseFromAssignments(msg.assignments);
    msg.workflow = {
      ...(msg.workflow || {}),
      ...buildWorkflowMeta(phase),
      phase,
    };
    workflow = msg.workflow;
  }
  if (changed) saveGroupMessages(groupId, messages, sessionId);
  return workflow;
}

export async function sendTaskCompletionNotification(task: any, result: string) {
  // Tasks bound to Feishu are already delivered to their originating chat by
  // the task status hook. Preserve the fixed webhook as a legacy fallback.
  if (hasFeishuTaskBinding({ taskId: task?.id, missionId: task?.parent_task_id || task?.root_task_id })) return;
  const summary = task?.delivery_summary || {};
  const sourceReport = String(summary.user_report || result || "");
  const resultSummary = sourceReport.substring(0, 900) + (sourceReport.length > 900 ? "..." : "");
  const fileCount = summary.actual_file_change_count ?? summary.files_changed?.length ?? 0;
  const verificationCount = summary.verification?.length || 0;
  const missingVerificationCount = summary.verification_required_missing?.length || 0;
  const reviewStatus = summary.has_final_review ? (summary.review_status || "complete") : "无";
  const priority = task.priority === "high" ? "高" : task.priority === "normal" ? "中" : "低";
  const markdown = [
    `**任务标题**：${task.title || "未命名任务"}`,
    `**目标项目**：${task.target_project || "群聊"}`,
    `**优先级**：${priority}`,
    `**完成时间**：${new Date().toLocaleString("zh-CN")}`,
    `**实际文件变更**：${fileCount} 个`,
    `**验证记录**：${verificationCount} 条`,
    `**缺命令验证**：${missingVerificationCount} 项`,
    `**主 Agent 复盘**：${reviewStatus}`,
    "",
    `**用户交付报告**：\n${resultSummary || "无"}`,
  ].join("\n");
  const notification = await sendFeishuReportMessage({
    title: "任务完成通知",
    markdown,
  });
  if (!notification.success) console.warn("[飞书通知] 任务完成通知发送失败:", notification.error || "未知错误");
}

export async function sendTaskFailureNotification(task: any, errorMsg: string) {
  if (hasFeishuTaskBinding({ taskId: task?.id, missionId: task?.parent_task_id || task?.root_task_id })) return;
  const markdown = [
    `**任务标题**：${task.title || "未命名任务"}`,
    `**目标项目**：${task.target_project || "群聊"}`,
    `**失败时间**：${new Date().toLocaleString("zh-CN")}`,
    "",
    `**错误信息**：\n${String(errorMsg || "未知错误").substring(0, 900)}`,
  ].join("\n");
  const notification = await sendFeishuReportMessage({
    title: "任务执行失败",
    markdown,
  });
  if (!notification.success) console.warn("[飞书通知] 任务失败通知发送失败:", notification.error || "未知错误");
}

export function appendTaskGroupReport(task: any, status: "done" | "waiting" | "failed", detail = "") {
  if (!task?.group_id) return;
  const deliveryReport = buildTaskDeliveryReport(task, task?.delivery_summary || {}, status, detail);
  appendGroupMessage(task.group_id, {
    id: "m" + Date.now().toString(36) + "delivery" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: "system",
    content: deliveryReport.user_text || buildTaskGroupReportMessage(task, status, detail),
    timestamp: new Date().toISOString(),
    task_id: task.id,
    delivery_summary: task.delivery_summary || null,
    delivery_report: deliveryReport,
  });
}

export function buildTaskProviderSwitchRequests(task: any = {}) {
  const overrides = task?.runtime_overrides && typeof task.runtime_overrides === "object"
    ? task.runtime_overrides
    : {};
  const requests: Record<string, any> = {};
  for (const [project, provider] of Object.entries(overrides)) {
    const requestedAgentType = String(provider || "").trim();
    if (!requestedAgentType) continue;
    requests[String(project || "*")] = {
      requested_agent_type: requestedAgentType,
      compatibility_confirmed: true,
      compatibility_evidence: [
        `task-local runtime override targets provider ${requestedAgentType}`,
        `project scope ${project || "*"} remains unchanged`,
        "existing project workDir and configured provider candidate must pass the provider-switch gate",
      ],
      reason: "task-local runtime override selected for this child-agent dispatch",
      authority: {
        kind: "task_runtime_override",
        authority_id: String(task.id || task.task_id || ""),
        approved: true,
        local_policy_authority: true,
        allow_switch_away_from_held_provider: true,
      },
    };
  }
  const wildcard = String(task?.runtime_override || "").trim();
  if (wildcard && !requests["*"]) {
    requests["*"] = {
      requested_agent_type: wildcard,
      compatibility_confirmed: true,
      compatibility_evidence: [
        `task-local runtime override targets provider ${wildcard}`,
        "project scope remains unchanged",
        "existing project workDir and configured provider candidate must pass the provider-switch gate",
      ],
      reason: "task-local wildcard runtime override selected for this child-agent dispatch",
      authority: {
        kind: "task_runtime_override",
        authority_id: String(task.id || task.task_id || ""),
        approved: true,
        local_policy_authority: true,
        allow_switch_away_from_held_provider: true,
      },
    };
  }
  return requests;
}

export function appendLegacyTaskExecutionGroupReport(input: {
  groupId: string;
  task: any;
  status: "done" | "waiting" | "failed";
  detail?: string;
  rawResult?: string;
  fileChanges?: any;
}) {
  if (!input.groupId || !input.task) return;
  const deliveryReport = buildTaskDeliveryReport(input.task, input.task?.delivery_summary || {}, input.status, input.detail || "");
  appendGroupMessage(input.groupId, {
    id: "m" + Date.now().toString(36) + "legacyexec" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: "system",
    type: "task_execution_result",
    content: deliveryReport.user_text || buildTaskGroupReportMessage(input.task, input.status, input.detail || ""),
    timestamp: new Date().toISOString(),
    task_id: input.task.id,
    delivery_summary: input.task.delivery_summary || null,
    delivery_report: deliveryReport,
    fileChanges: input.fileChanges || null,
    file_changes: input.fileChanges || null,
    technical_content: String(input.rawResult || ""),
    raw_result: String(input.rawResult || ""),
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  });
}

function parseLegacyReviewSummary(value: any) {
  const text = String(value || "").trim();
  if (!text) return "";
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || "";
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      const overall = sanitizeMainAgentUserText(parsed.overall || parsed.summary || "", "", 180);
      const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
      const high = issues.filter((item: any) => String(item?.severity || "").toLowerCase() === "high").length;
      const medium = issues.filter((item: any) => String(item?.severity || "").toLowerCase() === "medium").length;
      const low = issues.filter((item: any) => String(item?.severity || "").toLowerCase() === "low").length;
      const issueText = issues.length ? `发现 ${issues.length} 个建议（高 ${high} / 中 ${medium} / 低 ${low}）` : "暂未发现明确问题";
      return [issueText, overall].filter(Boolean).join("；");
    } catch {}
  }
  return sanitizeMainAgentUserText(text, "审查结果已整理，技术细节已放入技术详情。", 220);
}

export function appendLegacyCodeReviewGroupReport(input: {
  groupId: string;
  project: string;
  coordinator: string;
  reviewResults: any[];
}) {
  if (!input.groupId) return;
  const rows = (input.reviewResults || []).map((row: any) => {
    const reviewer = sanitizeMainAgentUserText(row?.reviewer || "Reviewer", "Reviewer", 80);
    if (row?.error) return `- ${reviewer}：审查失败，排障信息已放入技术详情。`;
    return `- ${reviewer}：${parseLegacyReviewSummary(row?.result) || "审查结果已整理。"}`;
  });
  const failed = (input.reviewResults || []).filter((row: any) => row?.error).length;
  const content = [
    `代码审查完成：${sanitizeMainAgentUserText(input.project, "当前项目", 120)}`,
    rows.length ? rows.join("\n") : "暂未收到可展示的审查结论。",
    failed ? `有 ${failed} 个审查 Agent 遇到问题，详细原因已放入技术详情。` : "原始审查输出默认收在技术详情里。",
  ].join("\n");
  appendGroupMessage(input.groupId, {
    id: "m" + Date.now().toString(36) + "review" + crypto.randomBytes(2).toString("hex"),
    role: "assistant",
    agent: input.coordinator || "coordinator",
    type: "code_review_result",
    content,
    timestamp: new Date().toISOString(),
    review_results: input.reviewResults || [],
    technical_content: JSON.stringify(input.reviewResults || [], null, 2),
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  });
}

export function syncTaskBacklogStatus(task: any, status: "queued" | "in_progress" | "done" | "blocked" | "failed", result = "") {
  const backlogFile = task?.workflow_meta?.intake?.backlog_file;
  if (!task?.group_id || !backlogFile) return null;
  return markDailyDevBacklogStatus(task.group_id, backlogFile, status, {
    task_id: task.id,
    result: result || task.status_detail || task.result || status,
  });
}

// === 协作与辅助规则 ===
export function getTaskTargetKey(task: any) {
  if (task?.queue_scope === "isolated_parallel" && task?.id) {
    return `isolated:${task.target_project || "unknown"}:${task.id}`;
  }
  if (task.assign_type === "group" && task.group_id) {
    return `group:${task.group_id}`;
  }
  return `project:${task.target_project}`;
}

export function isActionableMentionText(text: string) {
  const value = String(text || "").trim();
  if (value.length < 4) return false;
  if (/^(收到|好的|了解|谢谢|辛苦了|已完成|完成了|确认收到|ok|OK)[。！!,.，\s]*$/.test(value)) return false;
  return true;
}

export function normalizeMentionTask(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 240);
}

function stripMessageListPrefix(line: string) {
  return String(line || "").trim().replace(/^([>*-]|\d+[.)、]|[（(]\d+[）)])\s*/, "").trim();
}

export function escapeRegExp(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractActionableMentions(text: string, group: any, sourceProject = "") {
  const memberNames = (group.members || [])
    .map((m: any) => String(m.project || "").trim())
    .filter(Boolean)
    .sort((a: string, b: string) => b.length - a.length);
  const members = new Set(memberNames);
  const results: any[] = [];
  const seen = new Set<string>();
  for (const line of String(text || "").split(/\r?\n/)) {
    const normalized = stripMessageListPrefix(line);
    let targetName = "";
    let message = "";
    for (const name of memberNames) {
      const token = `@${name}`;
      if (!normalized.startsWith(token)) continue;
      const rest = normalized.slice(token.length);
      if (rest && !/^[\s：:，,、\-—]/.test(rest)) continue;
      targetName = name;
      message = rest.replace(/^[\s：:，,、\-—]+/, "").trim();
      break;
    }

    if (!targetName) {
      const match = normalized.match(/^@([^\s：:，,、\-—]+)(?:\s+|[：:，,、\-—]+)([\s\S]+)$/);
      if (!match) continue;
      targetName = match[1];
      message = match[2].trim();
    }

    if (!members.has(targetName) || targetName === sourceProject) continue;
    if (!isActionableMentionText(message)) continue;
    const key = `${targetName}\n${normalizeMentionTask(message)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ mention: `@${targetName}`, targetName, message });
  }
  return results;
}

export function buildAgentQaProtocolInstructions(currentAgent: string, memberList: string) {
  const members = memberList || "暂无可询问成员";
  return [
    "",
    "[群聊主 Agent 协调协议]",
    `- 你是 ${currentAgent || "当前子 Agent"}。可协作成员仅用于了解团队能力：${members}。你不能直接给其他子 Agent 派活，也不能私下扩大其他 Agent 的写权限。`,
    `- 需要跨 Agent 信息、实现、评审或风险确认时，必须调用内部 MCP ${GROUP_COORDINATION_MCP_SERVER_NAME} 的 request_coordination、request_review 或 report_blocker。只描述需求、证据、能力和验收标准，由群聊主 Agent 选择执行者、建立依赖并验收。`,
    "- 前端需要后端新增接口等写依赖时，kind 必须填 implementation，并给出 acceptance_criteria/requested_write_paths；主 Agent 会创建正式工作项，完成验收后再恢复你的原任务会话。",
    "- 只需要接口解释、字段确认或代码评审时，使用 information/review；目标 Agent 只能只读回答。涉及账号、密钥、生产数据、业务方向或高风险权限时使用 risk/report_blocker，由主 Agent 询问用户。",
    "- target_hint 只是能力建议，不是派发命令；主 Agent 可以改派。回答或实现结果必须尽量附文件、接口、文档、命令或截图证据。",
    "- 如果你正在回答其他 Agent 的问题，可以直接自然语言回答；也可以用 reply_agent：<tool_call>{\"name\":\"reply_agent\",\"arguments\":{\"answer\":\"结论...\",\"evidence\":\"接口/文件/验证证据...\"}}</tool_call>",
    "- 兼容旧运行时的降级格式：CCM_COORDINATION_REQUESTS [{\"kind\":\"information\",\"summary\":\"确认订单接口契约\",\"question\":\"...\",\"required_capabilities\":[\"api\"],\"blocking\":true}]。旧 ask_agent 会被平台转换为主 Agent 协调请求，不再视为直接派发。",
    "- 如果没有真实依赖或阻塞，不要调用协调 MCP，也不要输出协调标记。",
    "",
  ].join("\n");
}
