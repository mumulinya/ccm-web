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
  buildGroupProjectAnalysisContext,
  compactFormText,
  isVisibleChildAgentName,
  normalizeGroupDispatchLaunchRowStatus,
  sanitizeDispatchLaunchText,
  splitUserAcceptanceText,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
  userAgentRole,
} from "./collaboration";

export function getTaskPlanMode(task: any) {
  return task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
}

export function buildDispatchLaunchSummary(input: {
  task?: any;
  goal?: any;
  assignments?: any[];
  dispatchPolicy?: any;
  mode?: string;
  taskId?: string;
}) {
  const assignments = Array.isArray(input.assignments) ? input.assignments : [];
  const visibleRows = assignments
    .map((item: any, index: number) => {
      const agent = compactMemoryText(item?.project || item?.agent || item?.target_project || item?.targetName || "", 90);
      if (!isVisibleChildAgentName(agent)) return null;
      const taskText = sanitizeDispatchLaunchText(
        item?.task || item?.message || item?.summary || input.goal || input.task?.business_goal || input.task?.title,
        "已生成自包含工作单，技术协议已放入技术详情。",
        240,
      );
      const reason = sanitizeDispatchLaunchText(
        item?.reason || input.dispatchPolicy?.reason || "我根据目标和影响范围分派。",
        "我根据目标和影响范围分派。",
        180,
      );
      const dependsOn = Array.isArray(item?.dependsOn || item?.depends_on)
        ? (item.dependsOn || item.depends_on)
        : (item?.dependsOn || item?.depends_on ? [item.dependsOn || item.depends_on] : []);
      const rowStatus = normalizeGroupDispatchLaunchRowStatus(item?.status);
      return {
        id: item?.assignment_id || item?.id || `dispatch_launch_${index + 1}`,
        agent,
        role: userAgentRole(agent),
        task: taskText,
        reason,
        depends_on: dependsOn.map((value: any) => compactMemoryText(value, 80)).filter(Boolean).slice(0, 4),
        status: rowStatus.status,
        status_label: rowStatus.label,
      };
    })
    .filter(Boolean)
    .slice(0, 8);
  if (!visibleRows.length) return null;
  const goal = sanitizeDispatchLaunchText(input.goal || input.task?.business_goal || input.task?.title || "这项需求", "这项需求", 180).replace(/[。！？!?；;，,]+$/u, "");
  const agents = visibleRows.map((row: any) => row.agent).join("、");
  return {
    schema: "ccm-main-agent-dispatch-launch-summary-v1",
    title: "已派发的工作",
    mode: input.mode || "",
    task_id: input.taskId || input.task?.id || "",
    headline: `我已把「${goal}」拆给 ${visibleRows.length} 个执行成员：${agents}。`,
    rows: visibleRows,
    acceptance: [
      "每个执行成员都需要提交结构化结果说明。",
      "我会统一核对文件、验证和阻塞情况。",
      "通过验收后再给你最终交付总结。",
    ],
    next_action: "等待执行成员返回结果说明；有缺口时我会定向补充或请你确认。",
    technical_hint: "执行成员的完整工作单、Trace 和底层执行记录默认收在技术详情里。",
    display_policy: {
      user_visible: true,
      hide_for_ordinary_conversation: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

export function buildRevisedPlanModeDraft(planMode: any = {}, feedback = "") {
  const now = new Date().toISOString();
  const text = compactMemoryText(feedback || "请调整执行前计划。", 520);
  const revisionCount = Number(planMode.revision_count || planMode.revisionCount || 0) + 1;
  const revision = { count: revisionCount, feedback: text, at: now, status: "revision_requested" };
  const answeredQuestions = (Array.isArray(planMode.clarification_questions) ? planMode.clarification_questions : [])
    .map((item: any) => ({
      ...item,
      status: "answered_by_revision",
      answer: text,
      answered_at: now,
    }));
  return {
    ...planMode,
    title: planMode.title || "执行前计划",
    requires_confirmation: true,
    auto_continue: false,
    revision_status: "revision_requested",
    revision_count: revisionCount,
    last_revision_feedback: text,
    revised_at: now,
    plan_revisions: [
      ...(Array.isArray(planMode.plan_revisions) ? planMode.plan_revisions : []),
      revision,
    ].slice(-10),
    clarification_questions: answeredQuestions,
    needs_clarification: false,
    acceptance: uniqueStrings([
      ...(Array.isArray(planMode.acceptance) ? planMode.acceptance : []),
      `已纳入用户调整意见：${text}`,
    ]).slice(0, 8),
    permission_boundaries: uniqueStrings([
      ...(Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries : []),
      "调整后的计划重新确认前不得派发执行成员或修改文件",
    ]).slice(0, 8),
    next_step: "请重新确认调整后的执行前计划；确认后才会派发执行成员。",
  };
}

export function buildAcceptedPlanModeDraft(planMode: any = {}, feedback = "", acceptedAt = new Date().toISOString()) {
  const text = compactMemoryText(feedback || "", 720);
  const acceptance = Array.isArray(planMode.acceptance) ? planMode.acceptance : [];
  const acceptedFeedbackHistory = [
    ...(Array.isArray(planMode.accepted_feedback_history) ? planMode.accepted_feedback_history : []),
    ...(text ? [{ feedback: text, at: acceptedAt, status: "accepted" }] : []),
  ].slice(-10);
  return {
    ...planMode,
    title: planMode.title || "执行前计划",
    requires_confirmation: false,
    auto_continue: true,
    confirmation_status: "confirmed",
    accepted_at: acceptedAt,
    confirmed_at: acceptedAt,
    accepted_feedback: text,
    last_accept_feedback: text,
    accepted_feedback_history: acceptedFeedbackHistory,
    revision_status: planMode.revision_status === "revision_requested" ? "confirmed_after_revision" : (planMode.revision_status || "confirmed"),
    needs_clarification: false,
    acceptance: text
      ? uniqueStrings([...acceptance, `执行时纳入用户补充要求：${text}`]).slice(0, 8)
      : acceptance.slice(0, 8),
    plan_execution_followup: {
      schema: "ccm-main-agent-plan-execution-followup-v1",
      status: "confirmed_tracking",
      title: "计划已确认，正在按计划执行",
      headline: text
        ? "我会带着你的补充要求推进执行，并在最终总结前逐项核对验收标准。"
        : "我会按这份计划推进执行，并在最终总结前逐项核对验收标准。",
      accepted_at: acceptedAt,
      accepted_feedback: text,
      next_action: "等待执行成员结果说明、文件改动和验证证据；如有偏离，我会先返工再总结。",
      display_policy: {
        user_text_first: true,
        technical_default_collapsed: true,
        hide_internal_protocols: true,
        show_for_ordinary_conversation: false,
      },
    },
    next_step: text
      ? "已确认执行，我会带着补充要求派发执行成员。"
      : "已确认执行，我会派发执行成员。",
  };
}

export function classifyGroupProjectTaskIntent(message: string, uploadedFiles: any[] = []) {
  const text = String(message || "").trim();
  const compact = text.replace(/\s+/g, "");
  const hasAttachment = Array.isArray(uploadedFiles) && uploadedFiles.length > 0;
  const greetingOnly = /^(你好|您好|hi|hello|hey|在吗|在不在|早上好|下午好|晚上好|谢谢|感谢|ok|好的|嗯|哦|哈喽)[。.!！?？\s]*$/i.test(compact);
  const questionOnly = /^(这个|那个|你|我|项目|知识库|群聊|全局Agent|主Agent|子Agent).{0,40}(是什么|是啥|什么意思|怎么用|能用吗|可以用吗|怎么样|有问题吗|需要吗)[。.!！?？\s]*$/i.test(compact);
  const projectAnalysisSignals = /项目|代码|仓库|架构|技术栈|目录|文件|模块|接口|页面|组件|数据库|配置|依赖|知识库|主\s*Agent|子\s*Agent|agent|Agent|这个.*项目|什么项目/i.test(text);
  const actionSignals = [
    /(?:帮我|给我|请|麻烦|需要|开始|继续).{0,24}(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|跑|改|加|做|写)/i,
    /(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|跑).{0,40}(?:功能|接口|页面|组件|代码|项目|文件|数据库|服务|测试|配置|bug|Bug|API|api)/i,
    /(?:把|将).{1,80}(?:改成|修改为|接入|迁移|重构|删掉|删除|加上|加入|换成|拆成|合并)/i,
    /(?:报错|错误|bug|Bug|失败|不能用|崩溃|异常).{0,40}(?:修|修复|看一下|排查|解决|处理)/i,
    /(?:PR|提交|发布|上线|构建|编译|单测|测试|接口|页面|组件|schema|数据库|路由|权限|登录|支付|订单|表单|样式|前端|后端).{0,40}(?:实现|新增|修改|修复|优化|检查|补充|接入|部署)/i,
  ];
  const executable = hasAttachment || (!greetingOnly && !questionOnly && actionSignals.some(pattern => pattern.test(text)));
  const analysisEligible = !executable && !greetingOnly && projectAnalysisSignals;
  return {
    executable,
    analysisEligible,
    kind: executable ? "task" : analysisEligible ? "project_analysis" : greetingOnly ? "greeting" : questionOnly ? "question" : "conversation",
    reason: executable
      ? (hasAttachment ? "包含附件，按项目任务处理" : "包含明确开发/修改/执行意图")
      : greetingOnly
        ? "普通问候，不创建任务卡"
        : analysisEligible
          ? "项目/知识库相关只读询问，进入项目分析但不创建任务卡"
        : questionOnly
          ? "普通询问，不创建任务卡"
          : "未发现明确项目执行动作",
  };
}

export function normalizeGroupAgentGatewayTaskIntent(fallback: any, coordinatorResult: any, messageMode = "conversation") {
  const runtime = String(coordinatorResult?.runtime || "");
  const dispatchPolicy = coordinatorResult?.dispatchPolicy || {};
  const action = String(dispatchPolicy.action || "").trim();
  const assignments = Array.isArray(coordinatorResult?.assignments) ? coordinatorResult.assignments : [];
  const llmBacked = runtime === "llm-api";
  if (!llmBacked) {
    return {
      ...fallback,
      executable: false,
      analysisEligible: fallback.analysisEligible === true,
      kind: fallback.analysisEligible ? "project_analysis" : fallback.kind === "greeting" ? "greeting" : fallback.kind === "question" ? "question" : "conversation",
      reason: `Agent intent gateway 未获得大模型决策（${runtime || "unknown"}），规则兜底不创建任务卡`,
      agent_gateway: { runtime, dispatchPolicy, llm_backed: false, fallback_kind: fallback.kind },
    };
  }
  const delegates = action === "delegate" && dispatchPolicy.requiresConfirmation !== true && assignments.length > 0;
  const analysisEligible = !delegates && (fallback.analysisEligible === true || action === "direct_answer" || action === "ask_user");
  return {
    executable: delegates,
    analysisEligible,
    kind: delegates ? "task" : analysisEligible ? "project_analysis" : fallback.kind,
    reason: delegates
      ? `Agent intent gateway 允许创建任务卡：${dispatchPolicy.reason || "主 Agent 判定需要派发"}`
      : `Agent intent gateway 不创建任务卡：${dispatchPolicy.reason || "主 Agent 判定无需派发"}`,
    agent_gateway: { runtime, dispatchPolicy, llm_backed: true, assignments: assignments.map((item: any) => item.project).filter(Boolean) },
  };
}

export async function classifyGroupProjectTaskIntentWithAgent(input: {
  group: any;
  message: string;
  uploadedFiles?: any[];
  isOrchestrated?: boolean;
  messageMode?: string;
  forceProjectTask?: boolean;
  sharedFilesContext?: string;
  groupSessionId?: string;
  group_session_id?: string;
}) {
  const fallback = classifyGroupProjectTaskIntent(input.message, input.uploadedFiles || []);
  const mode = String(input.messageMode || "conversation").trim().toLowerCase();
  if (!input.isOrchestrated || input.forceProjectTask || !["project_task", "daily_dev", "mission", "project_analysis"].includes(mode)) {
    return { ...fallback, agent_gateway: { runtime: "not-required", llm_backed: false, fallback_kind: fallback.kind } };
  }
  try {
    const coordinatorResult = await runGroupOrchestrator({
      group: input.group,
      message: input.message,
      source: "intent-gateway",
      sharedFilesContext: input.sharedFilesContext || "",
      groupSessionId: input.groupSessionId || input.group_session_id || "",
    });
    return normalizeGroupAgentGatewayTaskIntent(fallback, coordinatorResult, mode);
  } catch (error: any) {
    return {
      ...fallback,
      executable: false,
      analysisEligible: fallback.analysisEligible === true,
      kind: fallback.analysisEligible ? "project_analysis" : fallback.kind === "greeting" ? "greeting" : fallback.kind === "question" ? "question" : "conversation",
      reason: `Agent intent gateway 调用失败，规则兜底不创建任务卡：${error?.message || error}`,
      agent_gateway: { runtime: "error", llm_backed: false, error: error?.message || String(error), fallback_kind: fallback.kind },
    };
  }
}

export function shouldUseProjectAnalysisMode(input: { isOrchestrated?: boolean; messageMode?: string; taskIntent?: any }) {
  const mode = String(input.messageMode || "conversation").trim().toLowerCase();
  if (!input.isOrchestrated) return false;
  if (mode === "project_analysis") return input.taskIntent?.kind !== "greeting";
  if (["project_task", "daily_dev", "mission"].includes(mode) && input.taskIntent?.analysisEligible === true) return true;
  return false;
}

export function shouldCreatePersistentGroupTask(input: { isOrchestrated?: boolean; messageMode?: string; taskIntent?: any; forceProjectTask?: boolean }) {
  const mode = String(input.messageMode || "conversation").trim().toLowerCase();
  return !!input.isOrchestrated
    && ["project_task", "daily_dev", "mission"].includes(mode)
    && (!!input.forceProjectTask || input.taskIntent?.executable === true);
}

export function classifyPlanModeRisk(message: string, group: any, taskIntent: any = {}, attachmentCount = 0) {
  const text = String(message || "");
  const routableCount = getRoutableMembers(group || {}).length;
  const lower = text.toLowerCase();
  const signals = {
    destructive: /删除|清空|清理|移除|drop\s+table|truncate|purge|永久|销毁|撤销|覆盖/i.test(text),
    migration: /迁移|重构|拆分|合并|数据库|schema|权限|登录|支付|订单|部署|上线|生产|线上|配置|环境变量/i.test(text),
    crossProject: /跨项目|多项目|所有项目|全部项目|前后端|全栈|多个 Agent|多个项目/i.test(text) || routableCount > 1 && /前端|后端|接口|页面|数据库|全栈/i.test(text),
    vague: taskIntent?.executable === true && text.replace(/\s+/g, "").length < 18 && /优化|修复|改一下|处理|看一下|做一下/i.test(text),
    attachment: attachmentCount > 0,
  };
  const reasons = [
    signals.destructive ? "包含删除、清理、覆盖或不可逆操作" : "",
    signals.migration ? "涉及迁移、重构、数据库、权限、支付、部署或配置边界" : "",
    signals.crossProject ? "可能涉及多个项目或前后端契约" : "",
    signals.vague ? "需求较短或范围模糊，需要先确认影响范围" : "",
    signals.attachment ? "包含附件，需要先只读解析需求文档" : "",
  ].filter(Boolean);
  const requiresConfirmation = signals.destructive || signals.migration || signals.crossProject || signals.vague || signals.attachment;
  const level = signals.destructive || signals.migration ? "high" : requiresConfirmation ? "medium" : "low";
  return {
    level,
    requiresConfirmation,
    reasons,
    signals,
    summary: reasons.length ? reasons.join("；") : "低风险明确开发需求，可自动进入执行队列",
    lower,
  };
}

export function buildPlanModeClarificationQuestions(message: string, risk: any = {}, selectedProjects: string[] = []) {
  const text = String(message || "");
  const signals = risk?.signals || {};
  const questions: any[] = [];
  const add = (id: string, question: string, reason: string, examples: string[] = []) => {
    if (questions.some(item => item.id === id)) return;
    questions.push({ id, question, reason, examples: examples.slice(0, 3), status: "open" });
  };
  if (signals.vague) {
    add(
      "scope_priority",
      "你希望主 Agent 优先处理哪个页面、接口或模块？",
      "需求比较短或范围不够具体，先确认重点可以减少返工。",
      ["只改登录页", "优先后端接口", "先修最影响用户的路径"],
    );
  }
  if (signals.crossProject || selectedProjects.length > 1) {
    add(
      "project_boundary",
      "这些项目都需要一起修改吗？如果有主次顺序，请告诉我。",
      "多项目协作需要先确认边界和依赖顺序。",
      selectedProjects.length ? selectedProjects : ["先后端契约，再前端接入"],
    );
  }
  if (signals.migration) {
    add(
      "compatibility_boundary",
      "是否需要兼容旧数据、旧接口或现有配置？",
      "迁移、权限、支付、订单、部署等改动需要明确兼容策略。",
      ["必须兼容旧接口", "可以只做新逻辑", "上线前保留回滚路径"],
    );
  }
  if (signals.destructive) {
    add(
      "destructive_permission",
      "是否允许删除、清理、覆盖或执行不可逆操作？",
      "破坏性操作必须由用户明确授权。",
      ["不允许删除，只标记废弃", "允许删除测试数据", "需要先备份"],
    );
  }
  if (/支付|权限|登录|订单|生产|线上|部署/i.test(text)) {
    add(
      "acceptance_focus",
      "你最关心的验收结果是什么？",
      "关键业务流程需要明确成功标准，避免只改代码但没覆盖真实目标。",
      ["登录刷新后保持状态", "支付退款完整闭环", "订单状态可回滚"],
    );
  }
  return questions.slice(0, 5);
}

export function buildGroupPlanModePreflight(input: { group: any; message: string; ctx: CollabCtx; configs?: any[]; taskIntent?: any; attachmentCount?: number; coordinatorProject?: string }) {
  const group = normalizeGroupOrchestrator(input.group);
  const configs = input.configs || getConfigs();
  const message = String(input.message || "");
  const risk = classifyPlanModeRisk(message, group, input.taskIntent, input.attachmentCount || 0);
  const members = getRoutableMembers(group);
  const coordinatorProject = input.coordinatorProject || getCoordinatorMember(group).project;
  const projectNames = members.map((member: any) => member.project).filter(Boolean);
  const relevantProjects = projectNames.filter((name: string) => message.toLowerCase().includes(String(name).toLowerCase())).slice(0, 6);
  const selectedProjects = relevantProjects.length ? relevantProjects : projectNames.slice(0, Math.min(3, projectNames.length));
  const areas = [
    /页面|前端|ui|组件|样式/i.test(message) ? "前端页面与交互" : "",
    /接口|后端|服务|数据库|api/i.test(message) ? "后端接口与数据契约" : "",
    /权限|登录|支付|订单/i.test(message) ? "业务权限与关键流程" : "",
    /测试|验证|bug|报错|修复/i.test(message) ? "测试、回归与缺陷修复" : "",
  ].filter(Boolean);
  if (!areas.length) areas.push("由主 Agent 只读探索后收敛影响范围");
  let readOnlyContext = "";
  try {
    readOnlyContext = compactMemoryText(buildGroupProjectAnalysisContext(group, message, input.ctx, configs), 2600);
  } catch (error: any) {
    readOnlyContext = `只读探索失败：${compactMemoryText(error?.message || error, 240)}`;
  }
  const acceptance = [
    "必须有主 Agent 计划、派发证据和子 Agent 结构化结果说明",
    "涉及代码时必须有系统实际捕获的文件变更",
    "必须有已执行验证记录，不能只写建议验证",
    "最终报告必须列出完成内容、变更文件、验证结果、风险和待确认事项",
  ];
  const permissionBoundaries = [
    "执行前只读探索不得修改文件、不得运行破坏性命令",
    "删除、清理、迁移、部署、跨项目契约变更必须等待用户确认",
    "子 Agent 只能在对应项目工作区和工作单范围内修改",
    "任务完成前必须保留 native session / scratchpad 续跑上下文",
  ];
  const clarificationQuestions = buildPlanModeClarificationQuestions(message, risk, selectedProjects);
  const steps = [
    {
      id: "understand_goal",
      label: "理解需求与验收目标",
      detail: selectedProjects.length ? `已锁定相关项目：${selectedProjects.join("、")}` : "从群聊消息和项目上下文中整理目标。",
      status: "completed",
    },
    {
      id: "read_only_explore",
      label: "只读探索影响范围",
      detail: compactMemoryText(readOnlyContext || "已完成只读探索。", 220),
      status: "completed",
    },
    {
      id: "confirm_boundary",
      label: "确认执行边界",
      detail: clarificationQuestions.length
        ? "需要先补充关键问题，再进入派发。"
        : risk.requiresConfirmation ? "涉及高风险或写入边界，等待你确认后执行。" : "当前边界清晰，可自动继续。",
      status: clarificationQuestions.length || risk.requiresConfirmation ? "needs_confirmation" : "completed",
    },
    {
      id: "dispatch_sub_agents",
      label: "派发子 Agent 工作单",
      detail: "每个子 Agent 会收到目标、允许范围、禁止事项和验收标准。",
      status: clarificationQuestions.length || risk.requiresConfirmation ? "pending" : "in_progress",
    },
    {
      id: "verify_and_summarize",
      label: "验收结果并总结给用户",
      detail: "完成后主 Agent 必须核对文件变更、验证结果、风险和下一步。",
      status: "pending",
    },
  ];
  return {
    title: "执行前计划",
    mode: "cc-style-plan-mode",
    source: "group-main-agent-plan-mode-4.0",
    coordinator: coordinatorProject,
    group_id: group?.id || "",
    requirement: compactFormText(message, ""),
    read_only_exploration: {
      summary: readOnlyContext,
      projects: selectedProjects,
      knowledge_used: readOnlyContext.includes("本地知识库召回"),
      code_snapshot_used: readOnlyContext.includes("只读代码快照"),
    },
    steps,
    impact_scope: {
      areas,
      projects: selectedProjects,
      multi_agent: selectedProjects.length > 1 || risk.signals.crossProject,
    },
    risk,
    acceptance,
    clarification_questions: clarificationQuestions,
    needs_clarification: clarificationQuestions.length > 0,
    permission_boundaries: permissionBoundaries,
    sub_agent_work_order_requirements: [
      "每个工作单必须包含目标、背景、允许修改范围、禁止事项、验收标准和回执格式",
      "子 Agent 必须返回修改文件、执行动作、验证命令/结果、阻塞点和是否需要主 Agent 返工",
      "返工必须复用原任务上下文和原生会话，不能重新开一个失忆任务",
    ],
    session_strategy: {
      native_resume_first: true,
      keep_task_session_until_final_review: true,
      fallback: "native 不可用时使用 scratchpad 续跑，并注入上轮回执、未完成 Todo 和验收缺口",
    },
    requires_confirmation: risk.requiresConfirmation,
    auto_continue: !risk.requiresConfirmation,
    next_step: clarificationQuestions.length
      ? "请先确认或补充上面的问题；确认后才会派发子 Agent"
      : risk.requiresConfirmation ? "等待用户确认后创建执行队列并派发子 Agent" : "低风险明确任务，自动进入执行队列",
    generated_at: new Date().toISOString(),
  };
}

export function buildProjectCodeReadOnlySnapshot(project: string, workDir: string, message: string) {
  return buildProjectCodeReadOnlySnapshotBase(project, workDir, message, { compactMemoryText });
}

export function buildChildAgentWorkerHandoff(targetProject: string, taskText = "", options: any = {}) {
  const requiresCodeChanges = options.requires_code_changes !== false && options.requiresCodeChanges !== false;
  const acceptance = options.acceptance || options.acceptance_criteria || options.acceptanceCriteria || "";
  const verificationHints = Array.isArray(options.verification_hints || options.verificationHints)
    ? (options.verification_hints || options.verificationHints).map((item: any) => String(item || "").trim()).filter(Boolean)
    : [];
  const dependencies = [
    ...(Array.isArray(options.dependencies) ? options.dependencies : []),
    ...(options.dependsOn || options.depends_on ? [{ project: options.dependsOn || options.depends_on, reason: "前置依赖" }] : []),
  ];
  const sourceTask = options.task || options.source_task || options.sourceTask || null;
  const analysis = {
    ...(options.analysis || {}),
    summary: options.user_goal || options.userGoal || options.business_goal || options.businessGoal || sourceTask?.business_goal || sourceTask?.businessGoal || sourceTask?.title || taskText,
    documentFindings: options.document_findings || options.documentFindings || splitUserAcceptanceText(sourceTask?.source_documents || sourceTask?.sourceDocuments || ""),
    constraints: options.constraints || [],
  };
  return buildSelfContainedWorkerHandoff({
    group: options.group || null,
    project: targetProject,
    task: taskText,
    userGoal: analysis.summary,
    source: options.source || "主 Agent 派发",
    reason: options.reason || "主 Agent 根据项目职责分派",
    workDir: options.work_dir || options.workDir || "",
    agentType: options.agent_type || options.agentType || "",
    model: options.model || options.model_id || options.modelId || "",
    traceId: options.trace_id || options.traceId || sourceTask?.trace_id || sourceTask?.traceId || "",
    taskId: options.task_id || options.taskId || sourceTask?.id || "",
    taskAgentSessionId: options.task_agent_session_id || options.taskAgentSessionId || "",
    analysis,
    workerContextPacket: options.worker_context_packet || options.workerContextPacket || options.handoff?.worker_context_packet || null,
    dependencies,
    contractInjections: options.contract_injections || options.contractInjections || options.handoff?.worker_context_packet?.contract_injections || [],
    memory: options.memory || options.memory_packet || options.memoryPacket || null,
    verificationHints,
    acceptance: splitUserAcceptanceText(acceptance),
    requiresCodeChanges,
    advisoryOnly: options.advisoryOnly === true || options.advisory_only === true,
    continuation: options.continuation || null,
    allowedScope: options.allowed_scope || options.allowedScope || [],
    forbiddenScope: options.forbidden_scope || options.forbiddenScope || [],
    expectedFiles: options.expected_files || options.expectedFiles || [],
    doneCriteria: options.done_criteria || options.doneCriteria || [],
  });
}

export function buildQueuedGroupTaskMessage(task: any) {
  const base = [
    `📋 执行任务：${task.title}`,
    task.description || "",
  ].filter(Boolean).join("\n");
  if (task?.workflow_type !== "daily_dev") {
    return `${base}\n\n请完成此任务并回复 "✅ 任务完成"。`;
  }

  const requiresCodeChanges = taskRequiresCodeChanges(task);
  const requiresVerification = taskRequiresVerification(task);
  const missionHandoff = task.mission_handoff || task.missionHandoff || null;
  const missionContext = missionHandoff ? [
    "全局任务交接：",
    task.global_mission_id ? `- 全局任务 ID：${task.global_mission_id}` : "",
    missionHandoff.user_goal ? `- 全局目标：${compactMemoryText(missionHandoff.user_goal, 500)}` : "",
    missionHandoff.reason ? `- 派发原因：${compactMemoryText(missionHandoff.reason, 300)}` : "",
    Array.isArray(missionHandoff.global_mission?.depends_on) && missionHandoff.global_mission.depends_on.length
      ? `- 前置依赖：${missionHandoff.global_mission.depends_on.join("、")}`
      : "",
    Array.isArray(missionHandoff.done_criteria) && missionHandoff.done_criteria.length
      ? `- 给全局 Agent 的交付要求：${missionHandoff.done_criteria.slice(0, 4).join("；")}`
      : "- 给全局 Agent 的交付要求：完成内容、涉及范围、验证结果、风险和仍需确认事项必须可追踪。",
    "",
  ].filter(Boolean) : [];
  return [
    "【主 Agent 业务开发工作单】",
    `任务标题：${task.title || "未命名任务"}`,
    `业务目标：${compactMemoryText(task.business_goal || task.businessGoal || task.title || "", 900)}`,
    task.acceptance_criteria || task.acceptanceCriteria
      ? `验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 900)}`
      : "",
    task.source_documents || task.sourceDocuments
      ? `关联文档：${compactMemoryText(task.source_documents || task.sourceDocuments, 1200)}`
      : "",
    ...missionContext,
    "",
    "完整任务说明：",
    task.description || "无",
    "",
    "执行要求：",
    "- 先根据业务目标、文档和验收标准判断影响范围，再派发给对应项目子 Agent。",
    "- 每个被派发的子 Agent 必须拿到明确的实现范围、文件/模块方向、验收标准和风险提示。",
    "- 子 Agent 必须返回 CCM_AGENT_RECEIPT；缺回执、缺证据或状态不是 done 时不能判定完成。",
    requiresCodeChanges
      ? "- 完成门禁：必须有系统实际捕获的代码/配置/文档文件变更。"
      : "- 本任务允许无代码变更，但最终报告必须说明可验收产出和依据。",
    requiresVerification
      ? "- 验证门禁：必须有可采信的已执行验证记录；只写建议运行、未运行或失败验证不能完成。"
      : "- 本任务不强制验证门禁，但仍建议记录实际检查依据。",
    "- 主 Agent 必须等待子 Agent 完成并复盘；发现缺口时继续返工或向用户明确索要信息。",
    "- 最终报告必须说明完成内容、涉及项目/文件、已执行验证、风险、阻塞和仍需用户确认的事项。",
  ].filter(line => line !== "").join("\n");
}
