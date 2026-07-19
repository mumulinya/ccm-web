// Behavior-freeze split from collaboration-runtime-plan-tools.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 7/9).
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
  AGENT_PROBE_STATUS_FILE,
  AGENT_PROBE_TARGET_STATUS_DIR,
  AGENT_RUNNER_DIR,
  buildDispatchLaunchSummary,
  classifyGroupProjectTaskIntent,
} from "./collaboration-runtime-task-queue";

import {
  taskRequiresCodeChanges,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  runAgentCliProbe,
} from "./collaboration-runtime-daily-dev";

import {
  buildGroupMainAgentInternalLoop,
  buildMainAgentPermissionJudgement,
  buildMainAgentPlanVerificationReminder,
  buildUserVisiblePlanStep,
  mainAgentPlanStepStatus,
  normalizeMainAgentActionIds,
} from "./collaboration-runtime-coordinator-review";

import {
  getProjectVerificationHintDetail,
} from "./collaboration-runtime-runtime-tools";

import {
  getExternalAgentRunnerStatus,
} from "./collaboration-runtime-plan-tools-part-02";

function buildMainAgentUserPlanSteps(input: {
  mode: string;
  actionIds: string[];
  permissions: any[];
  taskIntent?: any;
  dispatchPolicy?: any;
  assignments?: any[];
  taskId?: string;
}) {
  const mode = String(input.mode || "conversation");
  const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
  const blockedActions = (input.permissions || []).filter((item: any) => item.allowed === false).map((item: any) => item.action_id);
  const hasDispatch = actionIds.includes("dispatch_child_agent");
  const assignmentCount = Array.isArray(input.assignments) ? input.assignments.length : 0;
  const steps: any[] = [];
  const add = (id: string, content: string, status: string, activeForm = content, detail = "") => {
    steps.push(buildUserVisiblePlanStep({ id, content, activeForm, status, detail }));
  };

  add(
    "understand_intent",
    "确认用户这句话是普通询问、项目分析还是开发任务",
    "completed",
    "正在判断用户意图",
    input.taskIntent?.reason || input.dispatchPolicy?.reason || ""
  );
  add(
    "read_group_context",
    "读取当前群聊上下文，避免脱离前文判断",
    mainAgentPlanStepStatus(actionIds, blockedActions, "read_group_context"),
    "正在读取群聊上下文"
  );

  if (mode === "project_analysis") {
    add(
      "read_project_code_snapshot",
      "只读读取绑定项目的结构和相关代码快照",
      mainAgentPlanStepStatus(actionIds, blockedActions, "read_project_code_snapshot"),
      "正在只读查看项目结构和代码"
    );
    add(
      "query_knowledge_base",
      "查询知识库，补充项目背景和历史结论",
      mainAgentPlanStepStatus(actionIds, blockedActions, "query_knowledge_base", "skipped"),
      "正在查询知识库"
    );
    add(
      "decide_dispatch",
      "判断是否需要派发子 Agent：本轮是只读分析，不创建任务",
      "skipped",
      "正在判断是否派发子 Agent"
    );
    add(
      "generate_final_reply",
      "把分析结果整理成用户能看懂的回复",
      mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply"),
      "正在生成回复"
    );
    return steps;
  }

  if (mode === "project_task" || mode === "delegation") {
    add(
      "read_project_code_snapshot",
      "确认涉及的项目、范围和可能影响的代码位置",
      actionIds.includes("read_project_code_snapshot") ? mainAgentPlanStepStatus(actionIds, blockedActions, "read_project_code_snapshot") : "pending",
      "正在确认项目和代码范围"
    );
    add(
      "create_project_task",
      "把明确需求创建成可跟踪的项目任务卡",
      mainAgentPlanStepStatus(actionIds, blockedActions, "create_project_task", input.taskId ? "completed" : "pending"),
      "正在创建项目任务卡",
      input.taskId ? `任务 ${input.taskId}` : ""
    );
    add(
      "dispatch_child_agent",
      assignmentCount > 0 ? `派发给 ${assignmentCount} 个子 Agent 执行` : "判断是否需要派发子 Agent，并生成工作单",
      blockedActions.includes("dispatch_child_agent") ? "needs_confirmation" : hasDispatch ? "in_progress" : "pending",
      "正在派发子 Agent"
    );
    add(
      "read_child_agent_receipts",
      "等待执行成员结果说明，再由我验收",
      hasDispatch ? "pending" : "skipped",
      "正在等待执行成员结果说明"
    );
    add(
      "verify_and_reply",
      "汇总修改、验证结果和风险，生成最终回复",
      "pending",
      "正在验收并生成最终回复",
      "参考 Claude Code TodoWrite 的验证推动：复杂任务必须保留验收步骤。"
    );
    return steps;
  }

  if (mode === "followup") {
    add(
      "inspect_task_status",
      "查看原任务当前状态和子 Agent 进度",
      mainAgentPlanStepStatus(actionIds, blockedActions, "inspect_task_status"),
      "正在查看任务状态"
    );
    add(
      "replan_from_observation",
      "把追加要求合并进原计划，必要时重新安排",
      mainAgentPlanStepStatus(actionIds, blockedActions, "replan_from_observation"),
      "正在重新规划"
    );
    add(
      "generate_final_reply",
      "告诉用户追加要求如何并入当前任务",
      mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply"),
      "正在生成回复"
    );
    return steps;
  }

  if (mode === "governance") {
    add(
      "inspect_task_status",
      "读取任务状态，确认要操作的是哪一个任务",
      mainAgentPlanStepStatus(actionIds, blockedActions, "inspect_task_status"),
      "正在查看任务状态"
    );
    add(
      "govern_task_lifecycle",
      "执行停止、取消、归档或删除前等待用户明确确认",
      blockedActions.includes("govern_task_lifecycle") ? "needs_confirmation" : mainAgentPlanStepStatus(actionIds, blockedActions, "govern_task_lifecycle"),
      "正在等待治理确认"
    );
    add(
      "generate_final_reply",
      "说明本轮治理动作是否已执行",
      mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply", blockedActions.length ? "pending" : "completed"),
      "正在生成回复"
    );
    return steps;
  }

  add(
    "decide_dispatch",
    "判断是否需要派发子 Agent：本轮不需要创建任务",
    "skipped",
    "正在判断是否派发子 Agent"
  );
  if (actionIds.includes("ask_user_clarification")) {
    add(
      "ask_user_clarification",
      "信息不足时先追问用户，不擅自开任务",
      mainAgentPlanStepStatus(actionIds, blockedActions, "ask_user_clarification"),
      "正在追问用户"
    );
  }
  add(
    "generate_final_reply",
    "直接回答用户的问题",
    mainAgentPlanStepStatus(actionIds, blockedActions, "generate_final_reply"),
    "正在生成回复"
  );
  return steps;
}

function normalizeLiveTodoStatus(status: string) {
  return require("./collaboration-task-card").normalizeLiveTodoStatus.apply(null, arguments as any);
}

function buildTodoStepEvidence(input: { task: any; summary: any; workers: any[]; executions: any[]; stepId: string; phase: string }) {
  return require("./collaboration-task-card").buildTodoStepEvidence.apply(null, arguments as any);
}

function buildTodoStepActions(input: { task: any; stepId: string; status: string; phase: string; summary: any }) {
  return require("./collaboration-task-card").buildTodoStepActions.apply(null, arguments as any);
}

function buildLiveMainAgentTodoPlan(task: any, phase: string, workers: any[], executions: any[], summary: any = {}) {
  return require("./collaboration-task-card").buildLiveMainAgentTodoPlan.apply(null, arguments as any);
}

function buildLiveMainAgentDecisionForTask(task: any, phase: string, liveTodoPlan: any, summary: any = {}) {
  return require("./collaboration-task-card").buildLiveMainAgentDecisionForTask.apply(null, arguments as any);
}

function buildMainAgentDecisionChain(input: {
  groupId: string;
  traceId: string;
  messageId?: string;
  taskId?: string;
  coordinator?: string;
  mode?: "conversation" | "project_analysis" | "project_task" | "delegation" | "followup" | "governance";
  messageMode?: string;
  taskIntent?: any;
  dispatchPolicy?: any;
  assignments?: any[];
  observations?: any;
  reply?: any;
  explicitGovernance?: boolean;
}) {
  const mode = input.mode || "conversation";
  const policyAction = String(input.dispatchPolicy?.action || "").trim();
  const actionIds = normalizeMainAgentActionIds([
    "read_group_context",
    ...(mode === "project_analysis" ? ["read_project_code_snapshot", "query_knowledge_base"] : []),
    ...(mode === "project_task" ? ["create_project_task", "dispatch_child_agent", "inspect_task_status"] : []),
    ...(mode === "followup" ? ["inspect_task_status", "replan_from_observation"] : []),
    ...(mode === "governance" ? ["govern_task_lifecycle", "inspect_task_status"] : []),
    ...(policyAction === "ask_user" ? ["ask_user_clarification"] : []),
    ...(policyAction === "delegate" || (input.assignments || []).length ? ["dispatch_child_agent", "read_child_agent_receipts"] : []),
    ...(mode === "delegation" ? ["inspect_task_status"] : []),
    "generate_final_reply",
  ]);
  const permissions = buildMainAgentPermissionJudgement(actionIds, {
    taskIntent: input.taskIntent,
    messageMode: input.messageMode,
    explicitGovernance: input.explicitGovernance,
  });
  const blocked = permissions.filter(item => !item.allowed);
  const userPlanSteps = buildMainAgentUserPlanSteps({
    mode,
    actionIds,
    permissions,
    taskIntent: input.taskIntent,
    dispatchPolicy: input.dispatchPolicy,
    assignments: input.assignments,
    taskId: input.taskId,
  });
  const observations = {
    message_mode: input.messageMode || "",
    intent_kind: input.taskIntent?.kind || "",
    executable: input.taskIntent?.executable === true,
    analysis_eligible: input.taskIntent?.analysisEligible === true,
    dispatch_action: policyAction || (mode === "project_task" ? "create_task" : "direct_reply"),
    assignment_count: (input.assignments || []).length,
    ...(input.observations || {}),
  };
  const dispatchLaunchSummary = buildDispatchLaunchSummary({
    goal: input.taskIntent?.goal || input.reply?.text || input.dispatchPolicy?.reason || "",
    assignments: input.assignments || [],
    dispatchPolicy: input.dispatchPolicy,
    mode,
    taskId: input.taskId || "",
  });
  const verified = blocked.length === 0
    && (mode !== "project_task" || input.taskId)
    && (mode !== "project_analysis" || actionIds.includes("read_project_code_snapshot"))
    && actionIds.includes("generate_final_reply");
  const internalLoop = buildGroupMainAgentInternalLoop({
    mode,
    actionIds,
    permissions,
    taskIntent: input.taskIntent,
    dispatchPolicy: input.dispatchPolicy,
    assignments: input.assignments || [],
    observations,
    verified,
  });
  const displayStream = buildMainAgentDisplayStream({
    surface: "group",
    mode,
    status: verified ? "completed" : blocked.length ? "waiting_confirmation" : "running",
    phase: mode,
    userText: input.reply?.text || input.dispatchPolicy?.nextStep || input.dispatchPolicy?.reason || input.taskIntent?.reason || "",
    goal: input.taskIntent?.goal || input.reply?.text || "",
    actionIds,
    steps: userPlanSteps,
    permissions,
    observations,
    traceId: input.traceId,
    technical: { blockers: blocked.map((item: any) => item.reason || item.action_id) },
    workers: input.assignments || [],
    executions: [],
    summary: { assignment_count: (input.assignments || []).length, dispatch_launch_summary: dispatchLaunchSummary },
    rawEvents: [],
    taskId: input.taskId || "",
  });
  const verificationReminder = buildMainAgentPlanVerificationReminder({
    mode,
    steps: userPlanSteps,
    summary: observations,
    verified,
  });
  const chain = {
    version: 2,
    trace_id: input.traceId,
    group_id: input.groupId,
    task_id: input.taskId || "",
    message_id: input.messageId || "",
    coordinator: input.coordinator || "coordinator",
    mode,
    decision: {
      selected_actions: actionIds,
      dispatch_policy: input.dispatchPolicy || null,
      reason: input.dispatchPolicy?.reason || input.taskIntent?.reason || "",
    },
    internal_loop: internalLoop,
    loop: internalLoop,
    user_plan_steps: userPlanSteps,
    dispatch_launch_summary: dispatchLaunchSummary,
    dispatchLaunchSummary: dispatchLaunchSummary,
    display_stream: displayStream,
    displayStream,
    todo_plan: {
      title: "我准备这样处理",
      source: "cc-style-todo",
      schema: "cc-style-todo-v2",
      display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true, user_visible: mode !== "conversation" || blocked.length > 0 || policyAction === "ask_user", hide_for_simple_conversation: mode === "conversation" && blocked.length === 0 && policyAction !== "ask_user" },
      strategy: "完整列表替换；普通用户看计划步骤，内部 Action/Trace 折叠",
      verification_nudge: Boolean(verificationReminder),
      verification_reminder: verificationReminder,
      steps: userPlanSteps,
    },
    verification_reminder: verificationReminder,
    verificationReminder,
    permissions,
    observation: observations,
    verify: {
      passed: verified,
      blocked_actions: blocked.map(item => item.action_id),
      conclusion: verified ? "主 Agent 本轮动作链路满足权限和证据边界" : "主 Agent 本轮存在未授权或证据不足的动作",
    },
    reply: {
      kind: input.reply?.kind || (mode === "project_task" ? "task_card" : "assistant_message"),
      message_id: input.reply?.messageId || input.messageId || "",
      preview: compactMemoryText(input.reply?.text || "", 240),
    },
    created_at: new Date().toISOString(),
  };
  return chain;
}

export function appendMainAgentDecisionTrace(input: Parameters<typeof buildMainAgentDecisionChain>[0]) {
  const chain = buildMainAgentDecisionChain(input);
  appendTraceEvent(input.traceId, {
    id: `main-agent-decision:${input.messageId || input.taskId || Date.now()}:${chain.mode}`,
    type: "main_agent_decision",
    status: chain.verify.passed ? "ok" : "warning",
    task_id: input.taskId || "",
    group_id: input.groupId,
    agent: input.coordinator || "coordinator",
    message: `${chain.mode}：${chain.decision.selected_actions.join(" -> ")}`,
    data: chain,
  });
  return chain;
}

function mainAgentPetStateFromDecision(decision: any) {
  if (!decision?.verify?.passed) return { state: "waiting", text: "这个操作需要确认一下。" };
  const mode = String(decision?.mode || "");
  if (mode === "project_analysis") return { state: "thinking", text: "我在只读查看项目上下文。" };
  if (mode === "project_task") return { state: "planning", text: "我已创建任务，正在安排执行。" };
  if (mode === "delegation") return { state: "building", text: "我正在派发子 Agent 协作。" };
  if (mode === "followup") return { state: "working", text: "我把追加要求并入原任务了。" };
  if (mode === "governance") return { state: "waiting", text: "任务治理动作需要明确确认。" };
  return { state: "thinking", text: "我在组织这次回复。" };
}

export function applyMainAgentDecisionPetState(ctx: any, decision: any) {
  if (!ctx || !decision?.coordinator) return;
  const pet = mainAgentPetStateFromDecision(decision);
  const groupTarget = { tab: "groups", groupId: decision.group_id || "" };
  const globalDetail = decision.coordinator && decision.coordinator !== "global-agent"
    ? `${decision.coordinator}：${pet.text}`
    : pet.text;
  try {
    ctx.setAgentActivity?.(decision.coordinator, pet.state, pet.text, groupTarget, 90 * 1000);
    ctx.broadcastPetSpeech?.(decision.coordinator, { role: decision.verify?.passed ? "status" : "attention", text: pet.text, source: "group", mode: "replace" });
    if (decision.coordinator !== "global-agent") {
      ctx.setAgentActivity?.("global-agent", pet.state, globalDetail, groupTarget, 90 * 1000);
      ctx.broadcastPetSpeech?.("global-agent", { role: decision.verify?.passed ? "status" : "attention", text: globalDetail, source: "workspace-group", mode: "replace" });
    }
  } catch {}
}

export function runGroupMainAgentToolLoopSelfTest() {
  const conversation = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-conversation",
    messageId: "m1",
    coordinator: "coordinator",
    mode: "conversation",
    messageMode: "conversation",
    taskIntent: classifyGroupProjectTaskIntent("你好"),
    dispatchPolicy: { action: "answer", reason: "普通问候" },
    reply: { text: "你好，我在。" },
  });
  const analysis = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-analysis",
    messageId: "m2",
    coordinator: "coordinator",
    mode: "project_analysis",
    messageMode: "project_analysis",
    taskIntent: classifyGroupProjectTaskIntent("这个项目架构是什么"),
    dispatchPolicy: { action: "project_analysis", reason: "只读项目分析" },
    observations: { code_snapshot: true, knowledge_recall: true },
    reply: { text: "这是只读分析。" },
  });
  const projectTask = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-task",
    messageId: "m3",
    taskId: "task-loop",
    coordinator: "coordinator",
    mode: "project_task",
    messageMode: "project_task",
    taskIntent: classifyGroupProjectTaskIntent("帮我修复登录 bug 并跑测试"),
    dispatchPolicy: { action: "delegate", reason: "明确修复请求" },
    assignments: [{ project: "demo" }],
    observations: { task_created: true, queued: true },
    reply: { kind: "task_card", text: "任务已创建。" },
  });
  const unsafeGovernance = buildMainAgentDecisionChain({
    groupId: "g-loop",
    traceId: "trace-loop-governance",
    messageId: "m4",
    coordinator: "coordinator",
    mode: "governance",
    messageMode: "conversation",
    taskIntent: classifyGroupProjectTaskIntent("你好"),
    dispatchPolicy: { action: "hold", reason: "没有显式治理授权" },
    explicitGovernance: false,
    reply: { text: "需要确认。" },
  });
  const manualMissingVerificationReminder = buildMainAgentPlanVerificationReminder({
    mode: "project_task",
    steps: [
      buildUserVisiblePlanStep({ id: "scope", content: "确认需求范围", status: "completed" }),
      buildUserVisiblePlanStep({ id: "change", content: "修改相关代码", status: "in_progress" }),
      buildUserVisiblePlanStep({ id: "reply", content: "整理交付说明", status: "pending" }),
    ],
  });
  const reviewOnlyMissingVerificationReminder = buildMainAgentPlanVerificationReminder({
    mode: "project_task",
    steps: [
      buildUserVisiblePlanStep({ id: "scope", content: "确认需求范围", status: "completed" }),
      buildUserVisiblePlanStep({ id: "change", content: "修改相关代码", status: "completed" }),
      buildUserVisiblePlanStep({ id: "coordinator_review", content: "主 Agent 验收子 Agent 结果", status: "completed" }),
      buildUserVisiblePlanStep({ id: "final_delivery_report", content: "生成最终交付报告", status: "pending" }),
    ],
  });
  const manualConversationReminder = buildMainAgentPlanVerificationReminder({
    mode: "conversation",
    steps: [
      buildUserVisiblePlanStep({ id: "understand", content: "理解问题", status: "completed" }),
      buildUserVisiblePlanStep({ id: "answer", content: "直接回答", status: "completed" }),
      buildUserVisiblePlanStep({ id: "close", content: "收尾", status: "completed" }),
    ],
  });
  const checks = {
    conversationDoesNotCreateTask: !conversation.decision.selected_actions.includes("create_project_task") && !conversation.decision.selected_actions.includes("dispatch_child_agent"),
    projectAnalysisIsReadOnly: analysis.decision.selected_actions.includes("read_project_code_snapshot") && !analysis.decision.selected_actions.includes("create_project_task"),
    explicitTaskCreatesAndDispatches: projectTask.decision.selected_actions.includes("create_project_task") && projectTask.decision.selected_actions.includes("dispatch_child_agent") && projectTask.verify.passed,
    highRiskGovernanceBlockedWithoutExplicitCommand: unsafeGovernance.decision.selected_actions.includes("govern_task_lifecycle") && unsafeGovernance.verify.passed === false,
    allHaveTraceShape: [conversation, analysis, projectTask, unsafeGovernance].every(item => item.decision && item.observation && item.verify && item.reply),
    allHaveUserTodoPlan: [conversation, analysis, projectTask, unsafeGovernance].every(item => Array.isArray(item.user_plan_steps) && item.user_plan_steps.length >= 3 && item.todo_plan?.source === "cc-style-todo"),
    conversationTodoSkipsDispatch: conversation.user_plan_steps.some((step: any) => step.id === "decide_dispatch" && step.status === "skipped"),
    projectTaskTodoTracksExecution: projectTask.user_plan_steps.some((step: any) => step.id === "create_project_task" && step.status === "completed") && projectTask.user_plan_steps.some((step: any) => step.id === "dispatch_child_agent" && step.status === "in_progress"),
    governanceTodoNeedsConfirmation: unsafeGovernance.user_plan_steps.some((step: any) => step.status === "needs_confirmation"),
    planVerificationReminderVisibleWhenTaskPlanMissesVerification: manualMissingVerificationReminder?.schema === "ccm-main-agent-plan-verification-reminder-v1" && manualMissingVerificationReminder?.title === "还缺验收步骤",
    planVerificationReminderNotSuppressedByReviewOnlyStep: reviewOnlyMissingVerificationReminder?.schema === "ccm-main-agent-plan-verification-reminder-v1" && /真实验证/.test(reviewOnlyMissingVerificationReminder?.reason || ""),
    planVerificationReminderHiddenForOrdinaryConversation: manualConversationReminder === null,
    projectTaskTodoHasVerificationStepNoReminder: projectTask.todo_plan?.verification_reminder === null && projectTask.todo_plan?.verification_nudge === false,
    allHaveInternalLoop: [conversation, analysis, projectTask, unsafeGovernance].every(item => item.internal_loop?.pattern === "observe-think-plan-act-monitor-reflect-respond" && item.internal_loop.stages?.length === 7),
    conversationLoopSkipsAct: conversation.internal_loop?.stages?.some((stage: any) => stage.id === "act" && stage.status === "skipped"),
    projectAnalysisLoopReadOnly: analysis.internal_loop?.stages?.some((stage: any) => stage.id === "observe" && stage.actions.includes("read_project_code_snapshot")) && analysis.internal_loop?.stages?.some((stage: any) => stage.id === "act" && stage.status === "skipped"),
    projectTaskLoopActsAndMonitors: projectTask.internal_loop?.stages?.some((stage: any) => stage.id === "act" && ["completed", "in_progress"].includes(stage.status)) && projectTask.internal_loop?.stages?.some((stage: any) => stage.id === "monitor" && ["completed", "in_progress"].includes(stage.status)),
    governanceLoopBlocksUnauthorizedAct: unsafeGovernance.internal_loop?.stages?.some((stage: any) => stage.id === "act" && stage.status === "needs_confirmation"),
  };
  return { pass: Object.values(checks).every(Boolean), checks, samples: { conversation, analysis, projectTask, unsafeGovernance } };
}

export function getWorkDirState(workDir: string) {
  const resolved = path.resolve(String(workDir || ""));
  if (!resolved) return { exists: false, writable: false, path: "" };
  try {
    const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
    if (!stat?.isDirectory()) return { exists: false, writable: false, path: resolved };
    try {
      fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
      return { exists: true, writable: true, path: resolved };
    } catch {
      return { exists: true, writable: false, path: resolved };
    }
  } catch {
    return { exists: false, writable: false, path: resolved };
  }
}

let childProcessCapabilityCache: any = null;
const claudeLocalGatewayProbeCache = new Map<string, { checkedAt: number; result: any }>();

function readClaudeSettingsEnv() {
  try {
    const file = path.join(os.homedir(), ".claude", "settings.json");
    if (!fs.existsSync(file)) return {};
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return parsed?.env && typeof parsed.env === "object" && !Array.isArray(parsed.env) ? parsed.env : {};
  } catch {
    return {};
  }
}

function parseLocalHttpUrl(value: any) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (!["127.0.0.1", "localhost", "::1"].includes(host)) return null;
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    if (!Number.isFinite(port) || port <= 0) return null;
    return { protocol: url.protocol, host, port, href: `${url.protocol}//${url.host}` };
  } catch {
    return null;
  }
}

function probeLocalTcpSync(host: string, port: number, timeoutMs = 1200) {
  const key = `${host}:${port}`;
  const cached = claudeLocalGatewayProbeCache.get(key);
  if (cached && Date.now() - cached.checkedAt < 30 * 1000) return cached.result;
  const script = [
    "const net=require('net');",
    "const host=process.argv[1];",
    "const port=Number(process.argv[2]);",
    "const timeout=Number(process.argv[3]||1200);",
    "const socket=net.createConnection({host,port});",
    "let done=false;",
    "function finish(ok,error){if(done)return;done=true;try{socket.destroy();}catch{};console.log(JSON.stringify({ok,error:error||''}));process.exit(ok?0:1);}",
    "socket.setTimeout(timeout,()=>finish(false,'timeout'));",
    "socket.on('connect',()=>finish(true,''));",
    "socket.on('error',err=>finish(false,err.code||err.message||String(err)));",
  ].join("");
  const result = spawnSync(process.execPath, ["-e", script, host, String(port), String(timeoutMs)], {
    encoding: "utf-8",
    timeout: Math.max(2000, timeoutMs + 1000),
    windowsHide: true,
  });
  let parsed: any = null;
  try { parsed = JSON.parse(String(result.stdout || "{}")); } catch {}
  const normalized = parsed && typeof parsed === "object"
    ? { ok: parsed.ok === true, error: String(parsed.error || "") }
    : { ok: false, error: result.error?.message || result.stderr || "tcp_probe_failed" };
  claudeLocalGatewayProbeCache.set(key, { checkedAt: Date.now(), result: normalized });
  return normalized;
}

export function getClaudeLocalGatewayReadiness(probeTarget: any = null) {
  const rawAgentType = String(probeTarget?.agent_type || probeTarget?.agentType || "").trim();
  if (!rawAgentType) return null;
  const agentType = normalizeAgentRuntimeId(rawAgentType);
  if (agentType !== "claudecode" && agentType !== "claude") return null;
  const env = readClaudeSettingsEnv();
  const local = parseLocalHttpUrl(env.ANTHROPIC_BASE_URL);
  if (!local) return null;
  const probe = probeLocalTcpSync(local.host, local.port);
  if (probe.ok) return null;
  const message = `Claude Code 本地模型网关不可达：ANTHROPIC_BASE_URL=${local.href}，端口 ${local.port} 未连接（${probe.error || "connection_failed"}）`;
  return {
    ready: false,
    mode: "claude-local-gateway-unreachable",
    message,
    fix_actions: [
      `启动或恢复 ${local.href} 对应的 Claude/Anthropic 本地代理服务`,
      "或在 Claude Code 设置中移除/更新 ANTHROPIC_BASE_URL，改用可用的模型 API",
      "修复后在设置页点击“复检执行通道”或“立即恢复自动任务”",
    ],
    gateway: { baseUrl: local.href, host: local.host, port: local.port, ok: false, error: probe.error || "" },
  };
}

export function getChildProcessCapability() {
  if (childProcessCapabilityCache) return childProcessCapabilityCache;
  try {
    const result = spawnSync(process.execPath, ["--version"], {
      encoding: "utf-8",
      timeout: 5000,
      windowsHide: true,
    });
    childProcessCapabilityCache = {
      ok: !result.error && result.status === 0,
      status: result.status,
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || "").trim(),
      error: result.error ? `${(result.error as any).code || ""} ${result.error.message || result.error}`.trim() : "",
    };
    return childProcessCapabilityCache;
  } catch (e: any) {
    childProcessCapabilityCache = { ok: false, status: null, stdout: "", stderr: "", error: e.message || String(e) };
    return childProcessCapabilityCache;
  }
}

export function readRunnerJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
}

export function normalizeAgentProbeTarget(target: any = {}) {
  return {
    groupId: String(target.group_id || target.groupId || "").trim(),
    project: String(target.project || target.target_member || target.targetMember || "").trim(),
    agentType: String(target.agent_type || target.agentType || "").trim(),
  };
}

export function getAgentProbeTargetStatusKey(target: any) {
  return require("./collaboration-agent-probes").getAgentProbeTargetStatusKey(target);
}

export function getAgentProbeTargetStatusFile(target: any) {
  const key = getAgentProbeTargetStatusKey(target);
  return key ? path.join(AGENT_PROBE_TARGET_STATUS_DIR, `${key}.json`) : "";
}

function attachAgentProbeAge(data: any) {
  if (!data) return null;
  const checkedAt = data?.checked_at ? Date.parse(data.checked_at) : 0;
  return {
    ...data,
    age_ms: checkedAt ? Date.now() - checkedAt : null,
  };
}

export function readAgentProbeStatusFile(file: string) {
  try {
    if (!file || !fs.existsSync(file)) return null;
    return attachAgentProbeAge(readRunnerJson(file));
  } catch {
    return null;
  }
}

export function doesProbeTargetMatchRequired(probeTarget: any, requiredTarget: any) {
  const required = normalizeAgentProbeTarget(requiredTarget);
  if (!required.groupId && !required.project && !required.agentType) return true;
  const target = normalizeAgentProbeTarget(probeTarget);
  return (!required.groupId || target.groupId === required.groupId)
    && (!required.project || target.project === required.project)
    && (!required.agentType || target.agentType === required.agentType);
}

export function listAgentProbeTargetStatuses(requiredTarget: any = null) {
  try {
    if (!fs.existsSync(AGENT_PROBE_TARGET_STATUS_DIR)) return [];
    return fs.readdirSync(AGENT_PROBE_TARGET_STATUS_DIR)
      .filter(file => file.endsWith(".json"))
      .map(file => readAgentProbeStatusFile(path.join(AGENT_PROBE_TARGET_STATUS_DIR, file)))
      .filter(Boolean)
      .filter((probe: any) => !requiredTarget || doesProbeTargetMatchRequired(probe?.target, requiredTarget))
      .sort((a: any, b: any) => Date.parse(b?.checked_at || "") - Date.parse(a?.checked_at || ""));
  } catch {
    return [];
  }
}

export function readAgentProbeStatus(requiredTarget: any = null) {
  return require("./collaboration-agent-probes").readAgentProbeStatus(requiredTarget);
}

export function getAgentProbeHealth(probe: any) {
  return require("./collaboration-agent-probes").getAgentProbeHealth(probe);
}

export function writeAgentProbeStatus(data: any) {
  try {
    if (!fs.existsSync(AGENT_RUNNER_DIR)) fs.mkdirSync(AGENT_RUNNER_DIR, { recursive: true });
    const target = data?.target || null;
    const fixActions = Array.isArray(data?.fix_actions) && data.fix_actions.length
      ? data.fix_actions
      : (data?.readiness?.fix_actions || buildAgentExecutionFixActions({
        error: data?.message || data?.error || data?.output || "",
        agentType: target?.agent_type || data?.readiness?.probe?.target?.agent_type || "",
        probe: data,
      }));
    const payload = {
      success: !!data?.success,
      blocked: !!data?.blocked,
      message: String(data?.message || data?.error || "").slice(0, 1000),
      error: String(data?.error || "").slice(0, 1000),
      fix_actions: uniqueStrings(fixActions).slice(0, 6),
      target: target ? {
        group_id: target.group_id || "",
        group_name: target.group_name || "",
        project: target.project || "",
        agent_type: target.agent_type || "",
        work_dir: target.work_dir || "",
      } : null,
      execution_path: data?.execution_path || data?.readiness?.mode || "",
      expected_marker: data?.expected_marker || "CCM_AGENT_PROBE_OK",
      output_preview: String(data?.output || "").slice(0, 1000),
      duration_ms: Number(data?.duration_ms || 0),
      capabilities: data?.capabilities && typeof data.capabilities === "object" ? data.capabilities : null,
      native_session: data?.native_session && typeof data.native_session === "object" ? data.native_session : null,
      readiness_mode: data?.readiness?.mode || "",
      checked_at: new Date().toISOString(),
    };
    const writeJsonAtomic = (file: string) => {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf-8");
      fs.renameSync(tmp, file);
    };
    writeJsonAtomic(AGENT_PROBE_STATUS_FILE);
    const targetFile = getAgentProbeTargetStatusFile(target);
    if (targetFile) writeJsonAtomic(targetFile);
  } catch {}
}

export function buildRunnerFixHint(error: string, agentType: string) {
  const command = getAgentCommandLabel(agentType);
  const text = String(error || "");
  if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
    return `请先在同一台机器上确认 ${command} 可以连接模型 API；当前 Runner 能启动命令，但底层 CLI/API 连接被拒绝`;
  }
  if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
    return `请安装或加入 PATH：${command}`;
  }
  if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
    return `请检查 ${command} 的登录状态或 API Key 权限`;
  }
  return `请在子 Agent 工作目录中手动运行 ${command} 验证 CLI 是否可用`;
}

export function buildAgentExecutionFixActions(input: {
  error?: string;
  agentType?: string;
  childProcess?: any;
  externalRunner?: any;
  probe?: any;
} = {}) {
  const text = [input.error, input.probe?.message, input.probe?.error, input.externalRunner?.last_result?.error, input.externalRunner?.last_result?.output]
    .filter(Boolean)
    .join("\n");
  const agentType = input.agentType || input.externalRunner?.last_result?.agentType || input.probe?.target?.agent_type || "claudecode";
  const command = getAgentCommandLabel(agentType);
  const actions: string[] = [];

  if (/ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
    actions.push(`在同一台机器的普通终端里运行 ${command}，确认它能连接模型 API`);
    actions.push("检查 Claude/Codex 等 CLI 的登录状态、代理环境变量、网络出口和模型 API Base URL");
    actions.push("如果使用本地代理或转发服务，先确认服务端口正在监听且没有被防火墙拦截");
  } else if (/not recognized|not found|无法将.*识别|不是内部或外部命令/i.test(text)) {
    actions.push(`安装对应 CLI，或把 ${command} 所在目录加入 PATH`);
  } else if (/authentication|unauthorized|api key|login|401|403/i.test(text)) {
    actions.push(`重新登录或刷新 ${command} 的 API Key/Token 权限`);
  } else if (/spawn\s+EPERM|spawnSync .* EPERM/i.test(text) || input.childProcess?.ok === false) {
    actions.push("当前 Node 进程不能直接启动子 Agent CLI；在独立 PowerShell 里运行 npm run agent-runner:ps");
    actions.push("确认外部 Agent Runner 在线后，再点击“复检执行通道”或“立即恢复自动任务”");
  } else {
    actions.push(`在子 Agent 工作目录中手动运行 ${command}，确认 CLI 能正常返回`);
  }

  actions.push("修复后在设置页点击“复检执行通道”或“立即恢复自动任务”，系统会自动重试等待中的开发任务");
  return uniqueStrings(actions).slice(0, 6);
}

export function getAgentProbeOutputFailure(output: any) {
  return require("./collaboration-agent-probes").getAgentProbeOutputFailure(output);
}

export function getAgentExecutionReadiness(probeTarget: any = null) {
  return require("./collaboration-agent-probes").getAgentExecutionReadiness(probeTarget);
}

export function enforceAgentProbeExecutionReadiness(capability: any = {}) {
  return require("./collaboration-agent-probes").enforceAgentProbeExecutionReadiness(capability);
}

export function getAgentProbeExecutionReadiness(probeTarget: any = null) {
  return enforceAgentProbeExecutionReadiness({
    childProcess: getChildProcessCapability(),
    externalRunner: getExternalAgentRunnerStatus(),
    probe: readAgentProbeStatus(probeTarget),
    probeTarget,
  });
}

export function taskRequiresFreshAgentProbe(task: any) {
  return task?.workflow_type === "daily_dev";
}

export function getTaskRequiredProbeTarget(task: any) {
  const meta = task?.workflow_meta || task?.workflowMeta || {};
  const groupId = String(task?.group_id || task?.groupId || meta.group_id || meta.groupId || "").trim();
  const targetMember = String(meta.target_member || meta.targetMember || meta.probe_target_project || meta.probeTargetProject || "").trim();
  const targetProject = String(task?.target_project || task?.targetProject || "").trim();
  const project = targetMember || (task?.assign_type === "project" || !task?.assign_type ? targetProject : "");
  const taskRuntime = String(
    task?.runtime_overrides?.[project]
    || task?.runtime_overrides?.["*"]
    || task?.runtime_override
    || ""
  ).trim();
  const agentType = String(meta.agent_type || meta.agentType || meta.probe_agent_type || meta.probeAgentType || taskRuntime || "").trim();
  return { groupId, project, agentType };
}

export function getProbeTargetLabel(probe: any) {
  const target = probe?.target || {};
  const project = String(target.project || "").trim();
  const agentType = String(target.agent_type || target.agentType || "").trim();
  return [project, agentType].filter(Boolean).join(" / ") || "未知目标";
}

export function doesProbeMatchTaskTarget(probe: any, task: any) {
  const required = getTaskRequiredProbeTarget(task);
  if (!required.groupId && !required.project && !required.agentType) return true;
  return doesProbeTargetMatchRequired(probe?.target, required);
}

export function taskNeedsGroupWideAgentProbe(task: any) {
  return require("./collaboration-agent-probes").taskNeedsGroupWideAgentProbe(task);
}

export function getExecutableProbeTargetsFromDevGroup(group: any) {
  return (group?.members || [])
    .filter((member: any) => member.configured && member.workDirExists && member.workDirWritable)
    .map((member: any) => ({
      group_id: group.id,
      group_name: group.name || group.id,
      project: member.project,
      agent_type: member.agentType || member.agent || "claudecode",
      work_dir: member.workDir || "",
      requires_write: member.requiresWrite !== false,
    }));
}

function getExecutableProbeTargetsForTaskGroup(task: any) {
  if (!taskNeedsGroupWideAgentProbe(task)) return null;
  const required = getTaskRequiredProbeTarget(task);
  const groups = loadGroups();
  const configs = getConfigs();
  const group = groups
    .map((item: any) => normalizeGroupOrchestrator(item))
    .find((item: any) => String(item.id || "").trim() === required.groupId);
  if (!group) return [];
  const routableMembers = getRoutableMembers(group);
  const members = routableMembers.map((member: any) => {
    const runtime = resolveMemberRuntime(member.project, group, configs);
    const taskRuntime = String(
      task?.runtime_overrides?.[member.project]
      || task?.runtime_overrides?.["*"]
      || task?.runtime_override
      || ""
    ).trim();
    const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
    return {
      project: member.project,
      configured: !!runtime,
      // A user-selected task executor is the authoritative probe target for
      // this task.  Otherwise a healthy fallback could never pass admission
      // when the project's static primary runtime is down.
      agentType: taskRuntime || runtime?.agentType || member.agent || "",
      workDir: runtime?.workDir || "",
      workDirExists: !!workDirState?.exists,
      workDirWritable: !!workDirState?.writable,
    };
  });
  return getExecutableProbeTargetsFromDevGroup({
    id: group.id,
    name: group.name || group.id,
    members,
  });
}

export function summarizeAgentProbeTargets(targets: any[], probeResolver: any = readAgentProbeStatus) {
  return require("./collaboration-agent-probes").summarizeAgentProbeTargets(targets, probeResolver);
}

export function getTaskGroupAgentProbeReadiness(task: any) {
  const rawTargets = getExecutableProbeTargetsForTaskGroup(task);
  const targets = rawTargets?.map((target: any) => ({ ...target, requires_write: taskRequiresCodeChanges(task) }));
  if (!targets) return null;
  const summary = summarizeAgentProbeTargets(targets);
  const failed = summary.rows.filter((row: any) => !row.ready);
  const failedLabels = failed
    .slice(0, 5)
    .map((row: any) => `${row.project || "unknown"}(${row.agent_type || "agent"}:${row.probeHealth?.status || "missing"})`)
    .join("、");
  const groupLabel = String(targets[0]?.group_name || getTaskRequiredProbeTarget(task).groupId || "目标群聊").trim();
  return {
    ready: summary.allReady,
    mode: "group-target-agent-cli-probe",
    message: summary.allReady
      ? `daily_dev 群聊任务已具备真实执行准入：${groupLabel} 的 ${summary.ready}/${summary.total} 个可执行项目 Agent 探针近期成功`
      : `daily_dev 群聊任务需要所有可执行项目 Agent 通过真实 CLI 探针：${groupLabel} 当前通过 ${summary.ready}/${summary.total}，未复检 ${summary.missing}，过期 ${summary.stale}，最近失败 ${summary.failed_recent}${failedLabels ? `；未通过：${failedLabels}` : ""}`,
    summary,
    fix_actions: [
      "在设置页的“项目 Agent 执行探针”中点击“复检全部”，让系统实际调用该群聊下每个可执行项目 Agent CLI",
      "也可以逐个选择项目 Agent 复检；全部通过后再恢复 daily_dev 群聊任务",
    ],
  };
}

export function enforceTaskAgentProbeReadiness(task: any, readiness: any) {
  return require("./collaboration-agent-probes").enforceTaskAgentProbeReadiness(task, readiness);
}
