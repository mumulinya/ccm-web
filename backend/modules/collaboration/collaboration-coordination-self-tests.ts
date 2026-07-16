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
  AGENT_PROBE_SUCCESS_FRESH_MS,
  COORDINATOR_REVIEW_MAX_ROUNDS,
  TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS,
  TASK_WATCHDOG_GAP_REWORK_MAX,
  buildAcceptanceGate,
  buildAcceptedPlanModeDraft,
  buildAgentExecutionFixActions,
  buildAgentRecoveryProbeGroups,
  buildChildAgentWorkerHandoff,
  buildContinuationUserDecision,
  buildCoordinatorReworkContinuationFallback,
  buildCoordinatorReworkFollowUp,
  buildCoordinatorReworkRoutingDecision,
  buildCoordinatorReworkTask,
  buildCoordinatorTestAgentHandoff,
  buildDeliverySummary,
  buildDispatchLaunchSummary,
  buildEvidenceGateFollowUps,
  buildFailedIndependentReviewReworkFollowUps,
  buildGlobalDirectDispatchCompletionMessage,
  buildGlobalDirectDispatchContinuationMessage,
  buildGlobalDirectDispatchRollbackMessage,
  buildGlobalMissionTargetHandoff,
  buildIndependentReviewGate,
  buildIndependentReviewGateFollowUps,
  buildNativeTestAgentPlanBlockedReceipt,
  buildNativeTestAgentReceipt,
  buildNativeTestAgentReviewSummary,
  buildNativeTestAgentRuntimeToolContext,
  buildPlanModeClarificationQuestions,
  buildProjectCodeReadOnlySnapshot,
  buildQueuedGroupTaskMessage,
  buildRevisedPlanModeDraft,
  buildTargetedReworkContinuationDraft,
  buildTaskCardView,
  buildTaskGapContinuationDraft,
  buildTaskPreflightReasoning,
  buildTaskSourceDocumentsContext,
  buildUserAcceptanceReview,
  buildUserCompletionReadinessSummary,
  buildUserCoordinationAcknowledgement,
  buildWorkerContinuationHandoff,
  canAutoContinueTaskGaps,
  canCompleteDailyDevFromDeliverySummary,
  classifyGroupProjectTaskIntent,
  classifyPlanModeRisk,
  classifyTaskContinuation,
  collectTaskTypedMemoryPressureRecallUsageRows,
  collectTestAgentBrowserEvidenceSummaryLines,
  deriveTaskLifecycle,
  doesProbeTargetMatchRequired,
  enforceAgentProbeExecutionReadiness,
  enforceTaskAgentProbeReadiness,
  evaluateReceiptReadPlanRevalidationGate,
  filterCoordinatorLlmFollowUpsAgainstHardRoutes,
  formatNativeTestAgentOutput,
  formatNativeTestAgentPlanBlockedOutput,
  getAgentDependencyStateFromOutputs,
  getAgentProbeHealth,
  getAgentProbeOutputFailure,
  getAgentProbeTargetStatusKey,
  getCoordinatorActionMentions,
  getCoordinatorVisibleMessageSelfTest,
  getGlobalDirectDispatchContinuationKey,
  getTaskGapFingerprint,
  getTaskGapItems,
  getTaskWatchdogStatus,
  hasConfiguredTestAgentMultiSessionBrowserCheck,
  hasDailyDevContinuationGaps,
  hasFreshSuccessfulAgentProbe,
  isAdvisoryNeed,
  isAutomaticGapContinuationSource,
  looksLikeTaskContinuation,
  mergeCoordinatorDocumentContexts,
  normalizeGlobalMissionTargetRequirements,
  normalizeGroupAgentGatewayTaskIntent,
  reconcileTaskCollaborationState,
  scheduleTestAgentRecheckAfterFollowUps,
  scoreChildAgentReceipt,
  selectCoordinatorIndependentVerifier,
  selectLatestDurableReceipts,
  shouldCreatePersistentGroupTask,
  shouldNotifyGlobalDirectDispatchCompletion,
  shouldNotifyGlobalDirectDispatchContinuation,
  shouldNotifyGlobalDirectDispatchRollback,
  shouldUseProjectAnalysisMode,
  summarizeAgentProbeTargets,
  summarizeNativeTestAgentExecutionPlan,
  summarizeTaskAgentMemoryContextSnapshot,
  taskMatchesAgentProbeTarget,
  taskNeedsGroupWideAgentProbe,
  taskRequiresAgentQa,
} from "./collaboration";

export function runCoordinatorReworkProtocolSelfTest() {
  const failedRoute = buildCoordinatorReworkRoutingDecision({
    project: "web-app",
    message: "npm test 在 validate.test.ts:58 失败，请修复失败点后重新验证。",
    reason: "验证失败，需要原子 Agent 带着错误上下文继续处理",
  }, {
    previousLedger: { project: "web-app", status: "failed", blockers: ["npm test failed"], verification: ["npm test failed"] },
  });
  const independentRoute = buildCoordinatorReworkRoutingDecision({
    project: "reviewer",
    message: "请让非原实现者做独立复核，只读检查 OrderDetail.vue 的验收覆盖和风险。",
    reason: "复杂变更需要独立验证",
  });
  const wrongDirectionRoute = buildCoordinatorReworkRoutingDecision({
    project: "backend-service",
    message: "用户改成保持 session，不要继续 JWT refactor；请停止旧方向，改为修复 src/auth/validate.ts:42 空指针。",
    reason: "用户调整目标，旧方案不再适用",
  }, {
    previousLedger: { project: "backend-service", status: "running" },
  });
  const wrongDirectionContinuation = buildCoordinatorReworkContinuationFallback({
    reworkRoute: wrongDirectionRoute,
    mention: {
      project: "backend-service",
      message: "停止 JWT refactor，改为修复 src/auth/validate.ts:42 空指针。",
      reason: "用户调整目标，旧方案不再适用",
      previousLedger: { summary: "上一轮准备把认证改成 JWT", verification: ["尚未验证"] },
    },
    sourceTask: { title: "修复 auth 空指针", business_goal: "保持 session，只修空指针" },
    targetName: "backend-service",
    stopResult: { success: true, matched: 1, killed: 1 },
  });
  const verifierGroup = {
    members: [
      { project: "coordinator", role: "coordinator" },
      { project: "web-app", role: "frontend" },
      { project: "test-agent", role: "测试 agent", description: "负责只读复核、测试和验收检查" },
    ],
  };
  const verifierSelection = selectCoordinatorIndependentVerifier(verifierGroup, "web-app");
  const noVerifierSelection = selectCoordinatorIndependentVerifier({
    members: [
      { project: "coordinator", role: "coordinator" },
      { project: "web-app", role: "frontend" },
    ],
  }, "web-app");
  const nativeVerifierSelection = selectCoordinatorIndependentVerifier({
    members: [
      { project: "coordinator", role: "coordinator" },
      { project: "runtime-project", role: "implementation", workDir: os.tmpdir(), agent: "claudecode" },
    ],
  }, "runtime-project");
  const independentFollowUp = buildCoordinatorReworkFollowUp({
    project: "web-app",
    targetName: "web-app",
    message: "请让非原实现者做独立复核，只读检查 OrderDetail.vue 的验收覆盖和风险。",
    reason: "复杂变更需要独立验证",
    summary: "复核订单详情变更",
  }, {
    group: verifierGroup,
    memorySnapshot: {
      workerLedger: [{
        project: "web-app",
        status: "done",
        receiptStatus: "done",
        summary: "已修改 OrderDetail.vue",
        filesChanged: ["src/views/OrderDetail.vue"],
        verification: ["npm run test:unit passed"],
      }],
    },
    userMessage: "完善订单详情页。",
    coordinatorOutput: "主 Agent 计划：web-app 修改页面，test-agent 独立复核。",
    round: 1,
    maxRounds: 2,
    taskId: "test-agent-work-order-selftest",
    sourceTask: {
      id: "test-agent-work-order-selftest",
      group_id: "test-agent-work-order-group",
      title: "完善订单详情页",
      business_goal: "完善订单详情页并确保复杂变更经过独立复核",
      acceptance_criteria: "订单详情变更覆盖用户目标；复杂变更必须有独立复核结论",
      file_changes: {
        files: [{ project: "web-app", path: "src/views/OrderDetail.vue" }],
      },
    },
  });
  const independentHandoff = independentFollowUp.test_agent_handoff || independentFollowUp.testAgentHandoff || null;
  const independentHandoffProject = independentHandoff?.projects?.[0] || null;
  const independentHandoffAcceptance = Array.isArray(independentHandoff?.acceptanceCriteria)
    ? independentHandoff.acceptanceCriteria.join("\n")
    : "";
  const independentHandoffReviewInstructions = Array.isArray(independentHandoff?.metadata?.reviewInstructions)
    ? independentHandoff.metadata.reviewInstructions.join("\n")
    : "";
  const commandOnlyHandoff = buildCoordinatorTestAgentHandoff({
    targetName: "test-agent",
    originalTarget: "runtime-command-only-selftest",
    reviewSubject: "runtime-command-only-selftest",
    reason: "主 Agent 必须协调 TestAgent 并在完成后给用户最终总结",
    message: "基于最新项目状态核对用户目标、改动文件、验证结果和边界风险。",
  }, {
    group: {
      id: "runtime-command-only-group",
      members: [{ project: "runtime-command-only-selftest", role: "implementation", workDir: os.tmpdir() }],
    },
    taskId: "runtime-command-only-task",
    sourceTask: {
      id: "runtime-command-only-task",
      group_id: "runtime-command-only-group",
      business_goal: "新增静态常量并验证构建结果",
      acceptance_criteria: "导出的静态常量值符合需求；涉及代码的任务必须提供实际文件变更和已执行的构建或测试证据；完成后必须经过 TestAgent 独立复核；群聊主 Agent 必须验收项目子 Agent 的实际变更和验证证据；主 Agent 必须完成最终总结；项目执行成员必须说明实际动作、文件变化、已执行验证和剩余风险；复核失败先返工再复验",
    },
    previousLedger: {
      project: "runtime-command-only-selftest",
      verification: [
        "npm test: node scripts/test.mjs → verified:feature-ok",
        "npm run build: node scripts/build.mjs → built:feature-output",
        "主 Agent 已完成协调和总结",
      ],
    },
  });
  const commandOnlyProject = commandOnlyHandoff?.projects?.[0] || null;
  const commandOnlyVerificationCommands = Array.isArray(commandOnlyProject?.verificationCommands)
    ? commandOnlyProject.verificationCommands
    : [];
  const commandOnlyAcceptanceCriteria = Array.isArray(commandOnlyHandoff?.acceptanceCriteria)
    ? commandOnlyHandoff.acceptanceCriteria
    : [];
  const commandOnlyCompletedTasks = Array.isArray(commandOnlyHandoff?.completedTasks)
    ? commandOnlyHandoff.completedTasks
    : [];
  const fakeVerdictDir = path.join(os.tmpdir(), `ccm-main-agent-test-agent-verdict-selftest-${process.pid}`);
  const fakeVerdictPath = path.join(fakeVerdictDir, "verdict.json");
  const fakeFailedVerdictDir = path.join(os.tmpdir(), `ccm-main-agent-test-agent-failed-verdict-selftest-${process.pid}`);
  const fakeFailedVerdictPath = path.join(fakeFailedVerdictDir, "verdict.json");
  const fakeUnknownCoverageDir = path.join(os.tmpdir(), `ccm-main-agent-test-agent-unknown-coverage-selftest-${process.pid}`);
  const fakeNotVerifiedCoverageDir = path.join(os.tmpdir(), `ccm-main-agent-test-agent-not-verified-coverage-selftest-${process.pid}`);
  try {
    fs.mkdirSync(fakeVerdictDir, { recursive: true });
    fs.writeFileSync(fakeVerdictPath, `${JSON.stringify({
      schema: "ccm-test-agent-verdict-v1",
      agent: "test-agent",
      reportId: "test-agent-report-selftest",
      workOrderId: independentHandoff?.id || "work-order-selftest",
      taskId: "test-agent-work-order-selftest",
      groupId: "test-agent-work-order-group",
      status: "passed",
      recommendation: "accept",
      canAccept: true,
      needsRework: false,
      needsHuman: false,
      summary: "TestAgent verdict accepts the delivery.",
      failedRequiredChecks: [],
      unknownRequiredChecks: [],
      failedAcceptanceCriteria: [],
      unknownAcceptanceCriteria: [],
      blockedReasons: [],
      risks: [],
      nextActions: [
        "Accept the delivery if it matches the user-facing goal.",
        "Keep the TestAgent report and artifact manifest with the task record.",
      ],
      evidenceSummary: {
        commands: { passed: 1 },
        devServers: {},
        httpChecks: {},
        browserChecks: {},
        browserToolCalls: {},
        browserNetworkErrors: 0,
        browserActions: 3,
        browserFailedActions: 0,
        browserAssertions: 7,
        browserFailedAssertions: 0,
        artifacts: 5,
      },
      browserNetworkSummary: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "passed",
        url: "http://127.0.0.1:5173/login",
        requestCount: 4,
        responseCount: 4,
        failedRequestCount: 0,
        failedResponseCount: 0,
        errorCount: 0,
        statusCodes: { "200": 4 },
        resourceTypes: { document: 1, fetch: 1, script: 2 },
        failureKinds: {},
        failedUrls: [],
        errors: [],
        networkLogPath: "C:/tmp/test-agent-artifacts/selftest/network.log",
      }],
      browserInteractionSummary: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "passed",
        url: "http://127.0.0.1:5173/login",
        actionCount: 3,
        assertionCount: 7,
        passedActions: 3,
        failedActions: 0,
        passedAssertions: 7,
        failedAssertions: 0,
        actionTypes: { goto: 1, uploadFile: 1, reload: 1 },
        assertionTypes: {
          pageNotBlank: 1,
          downloadedFile: 1,
          consoleNoErrors: 1,
          networkNoErrors: 1,
          tableRowIncludes: 1,
          tableCellTextEquals: 1,
          tableCellTextIncludes: 1,
        },
        actionSteps: [{ kind: "action", name: "action:uploadFile", status: "passed", detail: "label=附件; file=notes.txt, meta.json" }],
        failedSteps: [],
      }],
      keyEvidence: [{ type: "command", project: "web-app", title: "npm test", status: "passed", detail: "exit=0" }],
      artifacts: {
        artifactDir: "C:/tmp/test-agent-artifacts/selftest",
        reportJsonPath: "C:/tmp/test-agent-artifacts/selftest/report.json",
        reportMarkdownPath: "C:/tmp/test-agent-artifacts/selftest/report.md",
        verdictJsonPath: fakeVerdictPath,
        manifestPath: "C:/tmp/test-agent-artifacts/selftest/artifact-manifest.json",
      },
      metadata: {},
    }, null, 2)}\n`, "utf-8");
    fs.mkdirSync(fakeFailedVerdictDir, { recursive: true });
    fs.writeFileSync(fakeFailedVerdictPath, `${JSON.stringify({
      schema: "ccm-test-agent-verdict-v1",
      agent: "test-agent",
      reportId: "test-agent-report-failed-selftest",
      workOrderId: independentHandoff?.id || "work-order-selftest",
      taskId: "test-agent-work-order-selftest",
      groupId: "test-agent-work-order-group",
      status: "failed",
      recommendation: "rework",
      canAccept: false,
      needsRework: true,
      needsHuman: false,
      summary: "TestAgent verdict requires rework.",
      failedRequiredChecks: [{ check: "commands", status: "failed", missingReason: "npm test 未通过" }],
      unknownRequiredChecks: [],
      failedAcceptanceCriteria: [{ criterion: "登录恢复验证必须通过", status: "failed", evidence: ["npm test 未通过"] }],
      unknownAcceptanceCriteria: [],
      blockedReasons: [],
      risks: ["命令验证未通过，不能进入最终验收"],
      nextActions: [
        "Route the task back to the implementation agent with failed evidence.",
        "Use failed command, HTTP, browser, and acceptance evidence to guide the fix.",
        "Run TestAgent again after rework.",
      ],
      evidenceSummary: {
        commands: { failed: 1 },
        devServers: {},
        httpChecks: {},
        browserChecks: { failed: 1 },
        browserToolCalls: {},
        browserNetworkErrors: 1,
        browserActions: 2,
        browserFailedActions: 0,
        browserAssertions: 3,
        browserFailedAssertions: 1,
        artifacts: 4,
      },
      browserNetworkSummary: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "failed",
        url: "http://127.0.0.1:5173/login",
        requestCount: 4,
        responseCount: 3,
        failedRequestCount: 1,
        failedResponseCount: 0,
        errorCount: 0,
        statusCodes: { "200": 3 },
        resourceTypes: { document: 1, fetch: 1, script: 2 },
        failureKinds: { requestfailed: 1 },
        failedUrls: ["http://127.0.0.1:5173/api/session"],
        errors: [],
        networkLogPath: "C:/tmp/test-agent-artifacts/failed-selftest/network.log",
      }],
      browserInteractionSummary: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "failed",
        url: "http://127.0.0.1:5173/login",
        actionCount: 2,
        assertionCount: 3,
        passedActions: 2,
        failedActions: 0,
        passedAssertions: 2,
        failedAssertions: 1,
        actionTypes: { goto: 1, reload: 1 },
        assertionTypes: { pageNotBlank: 1, networkNoErrors: 1, tableCellTextEquals: 1 },
        actionSteps: [],
        failedSteps: [{ kind: "assertion", name: "assert:tableCellTextEquals", status: "failed", detail: "table=#orders; row=B-200; column=Status", error: "登录状态未恢复" }],
      }],
      failureSummary: [{
        type: "browser",
        project: "web-app",
        title: "登录恢复浏览器复核",
        status: "failed",
        reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/failed-selftest/screenshots/login.failure.png。",
        evidence: ["C:/tmp/test-agent-artifacts/failed-selftest/screenshots/login.failure.png"],
        nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
        diagnostics: [
          "打开失败截图核对页面是否仍停留在登录态。",
          "检查浏览器网络日志中的 /api/session 请求。",
        ],
      }],
      keyEvidence: [{ type: "command", project: "web-app", title: "npm test", status: "failed", detail: "exit=1" }],
      artifacts: {
        artifactDir: "C:/tmp/test-agent-artifacts/failed-selftest",
        reportJsonPath: "C:/tmp/test-agent-artifacts/failed-selftest/report.json",
        reportMarkdownPath: "C:/tmp/test-agent-artifacts/failed-selftest/report.md",
        verdictJsonPath: fakeFailedVerdictPath,
        manifestPath: "C:/tmp/test-agent-artifacts/failed-selftest/artifact-manifest.json",
      },
      metadata: {},
    }, null, 2)}\n`, "utf-8");
  } catch {}
  const fakeNativeReport: any = {
    schema: "ccm-test-agent-report-v1",
    agent: "test-agent",
    id: "test-agent-report-selftest",
    workOrderId: independentHandoff?.id || "work-order-selftest",
    taskId: "test-agent-work-order-selftest",
    groupId: "test-agent-work-order-group",
    status: "passed",
    recommendation: "accept",
    summary: "TestAgent verified command checks and reviewed evidence.",
    startedAt: "2026-07-08T00:00:00.000Z",
    finishedAt: "2026-07-08T00:00:01.000Z",
    durationMs: 1000,
    artifactDir: "C:/tmp/test-agent-artifacts/selftest",
    requiredChecks: ["commands"],
    commandResults: [{
      project: "web-app",
      command: "npm test",
      cwd: "C:/repo/web-app",
      status: "passed",
      exitCode: 0,
      startedAt: "2026-07-08T00:00:00.000Z",
      finishedAt: "2026-07-08T00:00:01.000Z",
      durationMs: 1000,
      stdout: "",
      stderr: "",
      output: "",
    }],
    devServerResults: [],
    httpResults: [],
    browserResults: [{
      provider: "playwright",
      project: "web-app",
      name: "登录恢复浏览器复核",
      url: "http://127.0.0.1:5173/login",
      finalUrl: "http://127.0.0.1:5173/dashboard",
      status: "passed",
      startedAt: "2026-07-08T00:00:00.000Z",
      finishedAt: "2026-07-08T00:00:01.000Z",
      durationMs: 1000,
      steps: [
        { kind: "action", name: "action:goto", status: "passed", detail: "url=/login" },
        { kind: "action", name: "action:uploadFile", status: "passed", detail: "label=附件; file=notes.txt, meta.json" },
        { kind: "action", name: "action:reload", status: "passed", detail: "url=/dashboard" },
        { kind: "assertion", name: "assert:pageNotBlank", status: "passed", detail: "page has visible content" },
        { kind: "assertion", name: "assert:downloadedFile", status: "passed", detail: "filename=tasks.csv; contentIncludes=Ship TestAgent; minBytes=20" },
        { kind: "assertion", name: "assert:consoleNoErrors", status: "passed", detail: "console clean" },
        { kind: "assertion", name: "assert:networkNoErrors", status: "passed", detail: "network clean" },
        { kind: "assertion", name: "assert:tableRowIncludes", status: "passed", detail: "table=#orders; row=A-100; expected text count=2" },
        { kind: "assertion", name: "assert:tableCellTextEquals", status: "passed", detail: "table=#orders; row=B-200; column=Status" },
        { kind: "assertion", name: "assert:tableCellTextIncludes", status: "passed", detail: "table=#orders; row=B-200; column=Total" },
      ],
      screenshots: [],
      consoleErrors: [],
      pageErrors: [],
      networkRequests: [],
      networkErrors: [],
      browserArtifacts: [{
        type: "download",
        title: "Download: tasks.csv",
        path: "C:/tmp/test-agent-artifacts/selftest/browser-artifacts/downloads/tasks.csv",
        source: "playwright:download",
        mediaType: "text/csv",
      }],
    }],
    browserToolCalls: [],
    browserNetworkSummary: [{
      project: "web-app",
      name: "登录恢复浏览器复核",
      provider: "playwright",
      status: "passed",
      url: "http://127.0.0.1:5173/login",
      finalUrl: "http://127.0.0.1:5173/dashboard",
      requestCount: 4,
      responseCount: 4,
      failedRequestCount: 0,
      failedResponseCount: 0,
      errorCount: 0,
      statusCodes: { "200": 4 },
      resourceTypes: { document: 1, fetch: 1, script: 2 },
      failureKinds: {},
      failedUrls: [],
      errors: [],
      networkLogPath: "C:/tmp/test-agent-artifacts/selftest/network.log",
    }],
    browserInteractionSummary: [{
      project: "web-app",
      name: "登录恢复浏览器复核",
      provider: "playwright",
      status: "passed",
      url: "http://127.0.0.1:5173/login",
      finalUrl: "http://127.0.0.1:5173/dashboard",
      actionCount: 3,
      assertionCount: 7,
      passedActions: 3,
      failedActions: 0,
      passedAssertions: 7,
      failedAssertions: 0,
      actionTypes: { goto: 1, uploadFile: 1, reload: 1 },
      assertionTypes: {
        pageNotBlank: 1,
        downloadedFile: 1,
        consoleNoErrors: 1,
        networkNoErrors: 1,
        tableRowIncludes: 1,
        tableCellTextEquals: 1,
        tableCellTextIncludes: 1,
      },
      actionSteps: [{ kind: "action", name: "action:uploadFile", status: "passed", detail: "label=附件; file=notes.txt, meta.json" }],
      failedSteps: [],
    }],
    browserFlowSummary: {
      total: 1,
      statusCounts: { passed: 1, failed: 0, blocked: 0, skipped: 0 },
      flowTypeCount: 1,
      criteriaCount: 1,
      actionCount: 3,
      assertionCount: 7,
      failedStepCount: 0,
      items: [{
        flowType: "acceptance_form_flow",
        total: 1,
        statusCounts: { passed: 1, failed: 0, blocked: 0, skipped: 0 },
        criteriaCount: 1,
        criteria: ["登录恢复后进入工作台"],
        projects: ["web-app"],
        providers: ["playwright"],
        actionCount: 3,
        assertionCount: 7,
        failedStepCount: 0,
        failures: [],
      }],
    },
    browserMultiSessionSummary: {
      total: 2,
      statusCounts: { passed: 2, failed: 0, blocked: 0, skipped: 0 },
      sessionCount: 4,
      uniqueSessionCount: 4,
      sessionNames: ["sender", "receiver", "author", "observer"],
      parallelGroupCount: 2,
      comparisonCount: 2,
      failedComparisonCount: 0,
      actionCount: 7,
      assertionCount: 8,
      failedStepCount: 0,
      items: [{
        check: "发送消息后接收方实时看到",
        status: "passed",
        sessionNames: ["sender", "receiver"],
        failedSessionNames: [],
        failedSteps: [],
      }, {
        check: "作者更新后观察方同步刷新",
        status: "passed",
        sessionNames: ["author", "observer"],
        failedSessionNames: [],
        failedSteps: [],
      }],
    },
    browserActionEffectSummary: {
      checks: 1,
      actions: 1,
      changed: 1,
      unchanged: 0,
      unavailable: 0,
      failed: 0,
      detailSuppressed: 0,
      crossSession: 0,
      actionTypes: { click: 1 },
      changedSignals: { url: 0, title: 0, page_text: 1, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
      items: [{
        project: "web-app",
        name: "保存登录设置",
        provider: "playwright",
        status: "passed",
        actions: 1,
        changed: 1,
        unchanged: 0,
        unavailable: 0,
        failed: 0,
        detailSuppressed: 0,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 1, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
      }],
    },
    browserRecoverySummary: {
      checks: 1,
      attempted: 1,
      recovered: 1,
      failed: 0,
      notRetried: 0,
      items: [{
        project: "web-app",
        name: "登录恢复浏览器复核",
        provider: "playwright",
        status: "passed",
        attempted: 1,
        recovered: 1,
        failed: 0,
        notRetried: 0,
        events: [],
      }],
    },
    adversarialEvidenceSummary: {
      required: true,
      waived: false,
      status: "verified",
      total: 1,
      passed: 1,
      failed: 0,
      blocked: 0,
      skipped: 0,
      http: 0,
      browser: 1,
      relevant: 1,
      unlinked: 0,
      passedRelevant: 1,
      goalLinked: 1,
      criteriaCovered: ["登录恢复后重复提交不会产生重复副作用"],
      probeTypes: ["duplicate_submit"],
      items: [{
        project: "web-app",
        surface: "browser",
        name: "重复提交保护",
        target: "http://127.0.0.1:5173/login",
        status: "passed",
        probeType: "duplicate_submit",
        provider: "playwright",
        relevance: "explicit",
        linkedCriteria: ["登录恢复后重复提交不会产生重复副作用"],
        goalLinked: true,
        matchScore: 100,
      }],
    },
    requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
    acceptanceCoverage: [{ criterion: "独立复核 web-app 的交付证据", status: "verified", evidence: ["npm test"] }],
    evidence: [{ type: "command", project: "web-app", title: "npm test", status: "passed", detail: "exit=0" }],
    risks: [],
    blockedReasons: [],
    issues: [],
    metadata: {
      reviewSubject: "web-app",
      browserAuthenticationSummary: {
        configuredChecks: 2,
        passedChecks: 2,
        failedChecks: 0,
        blockedChecks: 0,
        authenticatedSessions: 2,
        credentialEnvNames: ["TEST_EMAIL", "TEST_PASSWORD"],
        storageStateCount: 2,
        sensitiveArtifactSuppressionCount: 2,
      },
      artifactFiles: {
        reportJsonPath: "C:/tmp/test-agent-artifacts/selftest/report.json",
        reportMarkdownPath: "C:/tmp/test-agent-artifacts/selftest/report.md",
        verdictJsonPath: fakeVerdictPath,
        manifestPath: "C:/tmp/test-agent-artifacts/selftest/artifact-manifest.json",
      },
      previousLedger: { filesChanged: ["src/views/OrderDetail.vue"] },
    },
  };
  const nativeTestAgentReceipt = buildNativeTestAgentReceipt("test-agent", fakeNativeReport, independentHandoff, independentHandoff);
  const nativeTestAgentReviewSummary = buildNativeTestAgentReviewSummary("test-agent", fakeNativeReport, nativeTestAgentReceipt);
  const nativeTestAgentOutput = formatNativeTestAgentOutput("test-agent", fakeNativeReport, nativeTestAgentReceipt, independentHandoff);
  const nativeTestAgentVisibleOutput = nativeTestAgentOutput.split("CCM_AGENT_RECEIPT")[0] || "";
  const fakeFailedNativeReport: any = {
    ...fakeNativeReport,
    id: "test-agent-report-failed-selftest",
    status: "failed",
    recommendation: "rework",
    summary: "TestAgent found failed checks and requires rework.",
    artifactDir: "C:/tmp/test-agent-artifacts/failed-selftest",
    commandResults: [{
      ...(fakeNativeReport.commandResults?.[0] || {}),
      status: "failed",
      exitCode: 1,
      stderr: "登录恢复测试未通过",
      output: "登录恢复测试未通过",
    }],
    browserResults: [{
      ...(fakeNativeReport.browserResults?.[0] || {}),
      status: "failed",
      steps: [
        { kind: "action", name: "action:goto", status: "passed", detail: "url=/login" },
        { kind: "action", name: "action:reload", status: "passed", detail: "url=/dashboard" },
        { kind: "assertion", name: "assert:pageNotBlank", status: "passed", detail: "page has visible content" },
        { kind: "assertion", name: "assert:networkNoErrors", status: "failed", detail: "发现网络请求异常", error: "会话请求未成功" },
        { kind: "assertion", name: "assert:tableCellTextEquals", status: "failed", detail: "table=#orders; row=B-200; column=Status", error: "登录状态未恢复" },
      ],
      browserArtifacts: [],
    }],
    browserNetworkSummary: [{
      ...(fakeNativeReport.browserNetworkSummary?.[0] || {}),
      status: "failed",
      failedRequestCount: 1,
      errorCount: 0,
      networkLogPath: "C:/tmp/test-agent-artifacts/failed-selftest/network.log",
    }],
    browserInteractionSummary: [{
      ...(fakeNativeReport.browserInteractionSummary?.[0] || {}),
      status: "failed",
      actionCount: 2,
      assertionCount: 3,
      passedActions: 2,
      failedActions: 0,
      passedAssertions: 1,
      failedAssertions: 2,
      actionTypes: { goto: 1, reload: 1 },
      assertionTypes: { pageNotBlank: 1, networkNoErrors: 1, tableCellTextEquals: 1 },
      actionSteps: [],
      failedSteps: [
        { kind: "assertion", name: "assert:networkNoErrors", status: "failed", detail: "发现网络请求异常", error: "会话请求未成功" },
        { kind: "assertion", name: "assert:tableCellTextEquals", status: "failed", detail: "table=#orders; row=B-200; column=Status", error: "登录状态未恢复" },
      ],
    }],
    browserFlowSummary: {
      total: 1,
      statusCounts: { passed: 0, failed: 1, blocked: 0, skipped: 0 },
      flowTypeCount: 1,
      criteriaCount: 1,
      actionCount: 2,
      assertionCount: 3,
      failedStepCount: 2,
      items: [{
        flowType: "acceptance_form_flow",
        total: 1,
        statusCounts: { passed: 0, failed: 1, blocked: 0, skipped: 0 },
        criteriaCount: 1,
        criteria: ["登录恢复后进入工作台"],
        projects: ["web-app"],
        providers: ["playwright"],
        actionCount: 2,
        assertionCount: 3,
        failedStepCount: 2,
        failures: [{
          project: "web-app",
          name: "登录恢复浏览器复核",
          status: "failed",
          error: "会话请求未成功",
          failedSteps: ["assert:networkNoErrors: 会话请求未成功"],
        }],
      }],
    },
    browserMultiSessionSummary: {
      total: 2,
      statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
      sessionCount: 4,
      uniqueSessionCount: 4,
      sessionNames: ["sender", "receiver", "author", "observer"],
      parallelGroupCount: 2,
      comparisonCount: 2,
      failedComparisonCount: 1,
      actionCount: 7,
      assertionCount: 8,
      failedStepCount: 1,
      items: [{
        check: "发送消息后接收方实时看到",
        status: "passed",
        sessionNames: ["sender", "receiver"],
        failedSessionNames: [],
        failedSteps: [],
      }, {
        check: "作者更新后观察方同步刷新",
        status: "failed",
        sessionNames: ["author", "observer"],
        failedSessionNames: ["observer"],
        failedComparisonCount: 1,
        failedSteps: [{ name: "session:observer:assert:visible", error: "locator=#raw-observer" }],
      }],
    },
    browserActionEffectSummary: {
      checks: 1,
      actions: 1,
      changed: 0,
      unchanged: 1,
      unavailable: 0,
      failed: 1,
      detailSuppressed: 0,
      crossSession: 0,
      actionTypes: { click: 1 },
      changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
      items: [{
        project: "web-app",
        name: "保存登录设置",
        provider: "playwright",
        status: "failed",
        actions: 1,
        changed: 0,
        unchanged: 1,
        unavailable: 0,
        failed: 1,
        detailSuppressed: 0,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
      }],
    },
    adversarialEvidenceSummary: {
      required: true,
      waived: false,
      status: "failed",
      total: 1,
      passed: 0,
      failed: 1,
      blocked: 0,
      skipped: 0,
      http: 0,
      browser: 1,
      relevant: 1,
      unlinked: 0,
      passedRelevant: 0,
      goalLinked: 1,
      criteriaCovered: ["重复提交不能创建重复会话"],
      probeTypes: ["duplicate_submit"],
      items: [{
        project: "web-app",
        surface: "browser",
        name: "重复提交登录",
        target: "http://127.0.0.1:5173/login?token=hidden",
        status: "failed",
        probeType: "duplicate_submit",
        provider: "playwright",
        relevance: "explicit",
        linkedCriteria: ["重复提交不能创建重复会话"],
        goalLinked: true,
        matchScore: 100,
      }],
    },
    requiredCheckCoverage: [{ check: "commands", status: "not_verified", missingReason: "npm test 未通过" }],
    acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "not_verified", evidence: ["npm test 未通过"] }],
    failureSummary: [{
      type: "browser",
      project: "web-app",
      title: "登录恢复浏览器复核",
      status: "failed",
      reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/failed-selftest/screenshots/login.failure.png。",
      evidence: ["C:/tmp/test-agent-artifacts/failed-selftest/screenshots/login.failure.png"],
      nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
      diagnostics: [
        "打开失败截图核对页面是否仍停留在登录态。",
        "检查浏览器网络日志中的 /api/session 请求。",
      ],
    }],
    evidence: [{ type: "command", project: "web-app", title: "npm test", status: "failed", detail: "exit=1" }],
    risks: ["命令验证未通过，不能进入最终验收"],
    metadata: {
      reviewSubject: "web-app",
      browserAuthenticationSummary: {
        configuredChecks: 2,
        passedChecks: 1,
        failedChecks: 1,
        blockedChecks: 0,
        authenticatedSessions: 2,
        credentialEnvNames: ["TEST_EMAIL", "TEST_PASSWORD"],
        storageStateCount: 2,
        sensitiveArtifactSuppressionCount: 2,
      },
      artifactFiles: {
        reportJsonPath: "C:/tmp/test-agent-artifacts/failed-selftest/report.json",
        reportMarkdownPath: "C:/tmp/test-agent-artifacts/failed-selftest/report.md",
        verdictJsonPath: fakeFailedVerdictPath,
        manifestPath: "C:/tmp/test-agent-artifacts/failed-selftest/artifact-manifest.json",
      },
      previousLedger: { filesChanged: ["src/views/OrderDetail.vue"] },
    },
  };
  const failedNativeTestAgentReceipt = buildNativeTestAgentReceipt("test-agent", fakeFailedNativeReport, independentHandoff, independentHandoff);
  const failedNativeTestAgentReviewSummary = buildNativeTestAgentReviewSummary("test-agent", fakeFailedNativeReport, failedNativeTestAgentReceipt);
  const failedNativeTestAgentOutput = formatNativeTestAgentOutput("test-agent", fakeFailedNativeReport, failedNativeTestAgentReceipt, independentHandoff);
  const failedNativeTestAgentReceiptWithHandoff = {
    ...failedNativeTestAgentReceipt,
    testAgentHandoff: independentHandoff,
    test_agent_handoff: independentHandoff,
  };
  const failedNativeTestAgentOutputWithHandoff = formatNativeTestAgentOutput(
    "test-agent",
    fakeFailedNativeReport,
    failedNativeTestAgentReceiptWithHandoff,
    independentHandoff
  );
  const failedNativeTestAgentVisibleOutput = failedNativeTestAgentOutput.split("CCM_AGENT_RECEIPT")[0] || "";
  const fakeNeedsRecheckReport: any = {
    ...fakeNativeReport,
    id: "test-agent-report-needs-recheck-selftest",
    status: "passed",
    recommendation: "accept",
    summary: "Legacy result says pass, but browser recovery and adversarial evidence are incomplete.",
    browserActionEffectSummary: {
      checks: 1,
      actions: 1,
      changed: 0,
      unchanged: 0,
      unavailable: 1,
      failed: 1,
      detailSuppressed: 1,
      crossSession: 0,
      actionTypes: { click: 1 },
      changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
      items: [{
        project: "web-app",
        name: "提交登录表单",
        provider: "playwright",
        status: "blocked",
        actions: 1,
        changed: 0,
        unchanged: 0,
        unavailable: 1,
        failed: 1,
        detailSuppressed: 1,
        crossSession: 0,
        actionTypes: { click: 1 },
        changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
      }],
    },
    browserRecoverySummary: {
      checks: 1,
      attempted: 1,
      recovered: 0,
      failed: 0,
      notRetried: 1,
      items: [{
        project: "web-app",
        name: "提交登录表单",
        provider: "playwright",
        status: "blocked",
        attempted: 1,
        recovered: 0,
        failed: 0,
        notRetried: 1,
        events: [{ operation: "click", reason: "unsafe duplicate side effect", rawSessionId: "hidden-session" }],
      }],
    },
    adversarialEvidenceSummary: {
      required: true,
      waived: false,
      status: "missing",
      total: 0,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      http: 0,
      browser: 0,
      relevant: 0,
      unlinked: 0,
      passedRelevant: 0,
      goalLinked: 0,
      criteriaCovered: [],
      probeTypes: [],
      items: [],
    },
  };
  const needsRecheckReceipt = buildNativeTestAgentReceipt(
    "test-agent",
    fakeNeedsRecheckReport,
    independentHandoff,
    independentHandoff
  );
  const needsRecheckReviewSummary = buildNativeTestAgentReviewSummary(
    "test-agent",
    fakeNeedsRecheckReport,
    needsRecheckReceipt
  );
  const needsRecheckOutput = formatNativeTestAgentOutput(
    "test-agent",
    fakeNeedsRecheckReport,
    needsRecheckReceipt,
    independentHandoff
  );
  const needsRecheckReceiptWithHandoff = {
    ...needsRecheckReceipt,
    testAgentHandoff: independentHandoff,
    test_agent_handoff: independentHandoff,
  };
  const needsRecheckOutputWithHandoff = formatNativeTestAgentOutput(
    "test-agent",
    fakeNeedsRecheckReport,
    needsRecheckReceiptWithHandoff,
    independentHandoff
  );
  const needsRecheckVisibleOutput = needsRecheckOutput.split("CCM_AGENT_RECEIPT")[0] || "";
  const fakeBlockedAuthenticationReport: any = {
    ...fakeNativeReport,
    id: "test-agent-report-authentication-blocked-selftest",
    status: "passed",
    recommendation: "accept",
    summary: "Legacy report says pass, but authenticated browser verification is blocked.",
    metadata: {
      ...fakeNativeReport.metadata,
      browserAuthenticationSummary: {
        configuredChecks: 1,
        passedChecks: 0,
        failedChecks: 0,
        blockedChecks: 1,
        authenticatedSessions: 0,
        credentialEnvNames: ["PRIVATE_TEST_LOGIN", "PRIVATE_TEST_PASSWORD"],
        storageStateCount: 1,
        sensitiveArtifactSuppressionCount: 1,
      },
    },
  };
  const blockedAuthenticationReceipt = buildNativeTestAgentReceipt(
    "test-agent",
    fakeBlockedAuthenticationReport,
    independentHandoff,
    independentHandoff
  );
  const blockedAuthenticationReviewSummary = buildNativeTestAgentReviewSummary(
    "test-agent",
    fakeBlockedAuthenticationReport,
    blockedAuthenticationReceipt
  );
  const fakeFailedAuthenticationReport: any = {
    ...fakeNativeReport,
    id: "test-agent-report-authentication-failed-selftest",
    status: "passed",
    recommendation: "accept",
    summary: "Legacy report says pass, but authenticated browser verification failed.",
    metadata: {
      ...fakeNativeReport.metadata,
      browserAuthenticationSummary: {
        configuredChecks: 2,
        passedChecks: 1,
        failedChecks: 1,
        blockedChecks: 0,
        authenticatedSessions: 2,
        credentialEnvNames: ["PRIVATE_TEST_LOGIN", "PRIVATE_TEST_PASSWORD"],
        storageStateCount: 2,
        sensitiveArtifactSuppressionCount: 2,
      },
    },
  };
  const failedAuthenticationReceipt = buildNativeTestAgentReceipt(
    "test-agent",
    fakeFailedAuthenticationReport,
    independentHandoff,
    independentHandoff
  );
  const failedAuthenticationReviewSummary = buildNativeTestAgentReviewSummary(
    "test-agent",
    fakeFailedAuthenticationReport,
    failedAuthenticationReceipt
  );
  const fakeUnknownCoverageReport: any = {
    ...fakeNativeReport,
    id: "test-agent-report-unknown-coverage-selftest",
    status: "passed",
    recommendation: "accept",
    summary: "TestAgent command checks passed, but one acceptance criterion has no direct evidence.",
    artifactDir: fakeUnknownCoverageDir,
    requiredCheckCoverage: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
    acceptanceCoverage: [{ criterion: "登录恢复验收需要真实浏览器证据", status: "unknown", evidence: [] }],
    risks: [],
    blockedReasons: [],
    metadata: {
      reviewSubject: "web-app",
      artifactFiles: {
        reportJsonPath: path.join(fakeUnknownCoverageDir, "report.json"),
        reportMarkdownPath: path.join(fakeUnknownCoverageDir, "report.md"),
        manifestPath: path.join(fakeUnknownCoverageDir, "artifact-manifest.json"),
      },
      previousLedger: { filesChanged: ["src/views/OrderDetail.vue"] },
    },
  };
  const unknownCoverageTestAgentReceipt = buildNativeTestAgentReceipt("test-agent", fakeUnknownCoverageReport, independentHandoff, independentHandoff);
  const unknownCoverageTestAgentOutput = formatNativeTestAgentOutput("test-agent", fakeUnknownCoverageReport, unknownCoverageTestAgentReceipt, independentHandoff);
  const unknownCoverageTestAgentVisibleOutput = unknownCoverageTestAgentOutput.split("CCM_AGENT_RECEIPT")[0] || "";
  const fakeNotVerifiedCoverageReport: any = {
    ...fakeNativeReport,
    id: "test-agent-report-not-verified-coverage-selftest",
    status: "passed",
    recommendation: "accept",
    summary: "TestAgent report claims pass, but required and acceptance coverage include not_verified gaps.",
    artifactDir: fakeNotVerifiedCoverageDir,
    requiredCheckCoverage: [{ check: "browser_e2e", status: "not_verified", evidence: [], missingReason: "浏览器流程没有实际执行证据" }],
    acceptanceCoverage: [{ criterion: "登录恢复验证必须通过", status: "not_verified", evidence: [] }],
    risks: [],
    blockedReasons: [],
    metadata: {
      reviewSubject: "web-app",
      artifactFiles: {
        reportJsonPath: path.join(fakeNotVerifiedCoverageDir, "report.json"),
        reportMarkdownPath: path.join(fakeNotVerifiedCoverageDir, "report.md"),
        manifestPath: path.join(fakeNotVerifiedCoverageDir, "artifact-manifest.json"),
      },
      previousLedger: { filesChanged: ["src/views/OrderDetail.vue"] },
    },
  };
  const notVerifiedCoverageTestAgentReceipt = buildNativeTestAgentReceipt("test-agent", fakeNotVerifiedCoverageReport, independentHandoff, independentHandoff);
  const notVerifiedCoverageTestAgentOutput = formatNativeTestAgentOutput("test-agent", fakeNotVerifiedCoverageReport, notVerifiedCoverageTestAgentReceipt, independentHandoff);
  const notVerifiedCoverageTestAgentVisibleOutput = notVerifiedCoverageTestAgentOutput.split("CCM_AGENT_RECEIPT")[0] || "";
  const failedTableStep = {
    kind: "assertion",
    name: "assert:tableCellTextEquals",
    status: "failed",
    detail: "table=#orders; row=B-200; column=Status",
    error: "table=#orders; row=B-200; column=Status; actual=Draft",
  };
  const failedTableEvidenceSummary = collectTestAgentBrowserEvidenceSummaryLines({
    ...fakeNativeReport,
    browserResults: [{
      ...(fakeNativeReport.browserResults?.[0] || {}),
      status: "failed",
      steps: [failedTableStep],
    }],
    browserInteractionSummary: [{
      ...(fakeNativeReport.browserInteractionSummary?.[0] || {}),
      status: "failed",
      actionCount: 0,
      assertionCount: 1,
      passedActions: 0,
      failedActions: 0,
      passedAssertions: 0,
      failedAssertions: 1,
      actionTypes: {},
      assertionTypes: { tableCellTextEquals: 1 },
      actionSteps: [],
      failedSteps: [failedTableStep],
    }],
  } as any, null).join("；");
  const fakeExecutionPlan: any = {
    schema: "ccm-test-agent-execution-plan-v1",
    valid: true,
    workOrderId: independentHandoff?.id || "work-order-selftest",
    taskId: "test-agent-work-order-selftest",
    groupId: "test-agent-work-order-group",
    issuedBy: "group-main-agent",
    artifactDir: "C:/tmp/test-agent-artifacts/selftest",
    browserProvider: "none",
    requiredChecks: ["commands"],
    acceptanceCriteria: ["独立复核 web-app 的交付证据"],
    summary: {
      projects: 1,
      commands: 1,
      autoDiscoveredCommands: 0,
      devServers: 0,
      httpChecks: 0,
      adversarialHttpChecks: 0,
      browserChecks: 0,
      autoBrowserChecks: 0,
      adversarialBrowserChecks: 0,
      browserSessionSteps: 6,
      browserParallelGroups: 2,
      expectedArtifactTypes: ["report_json", "report_markdown", "artifact_manifest", "browser_har"],
    },
    projects: [],
    issues: [],
    metadata: { normalizedWorkOrder: independentHandoff },
  };
  const fakeInvalidExecutionPlan = {
    ...fakeExecutionPlan,
    valid: false,
    issues: [{ severity: "error", code: "missing_work_dir", message: "Project workDir is required.", project: "web-app" }],
  };
  const nativePlanSummary = summarizeNativeTestAgentExecutionPlan(fakeExecutionPlan);
  const nativePlanBlockedReceipt = buildNativeTestAgentPlanBlockedReceipt("test-agent", fakeInvalidExecutionPlan, { stderr: "", error: "" }, independentHandoff);
  const nativePlanBlockedOutput = formatNativeTestAgentPlanBlockedOutput("test-agent", fakeInvalidExecutionPlan, nativePlanBlockedReceipt, independentHandoff);
  const nativeTestAgentRuntimeContext = buildNativeTestAgentRuntimeToolContext("test-agent", "C:/repo/web-app");
  const independentGateFollowUps = buildIndependentReviewGateFollowUps({
    group: verifierGroup,
    task: {
      id: "independent-review-gate-selftest",
      group_id: "independent-review-gate-group",
      assign_type: "group",
      workflow_type: "daily_dev",
      title: "完善订单详情接口与页面",
      business_goal: "订单详情改动需要真实验证和独立复核",
      file_changes: {
        files: [{
          project: "web-app",
          path: "backend/routes/order-detail.ts",
          statusKind: "modified",
          statusText: "修改",
          diff: { additions: 8, deletions: 2 },
        }],
      },
    },
    outputs: [formatCollectedAgentOutput("web-app", "已修改订单详情接口并运行验证。", {
      agent: "web-app",
      status: "done",
      summary: "完成订单详情改动",
      actions: ["修改 backend/routes/order-detail.ts"],
      filesChanged: ["backend/routes/order-detail.ts"],
      verification: ["npm test passed"],
      blockers: [],
      needs: [],
    })],
    existingFollowUps: [],
  });
  const independentGateRoutedFollowUp = independentGateFollowUps[0]
    ? buildCoordinatorReworkFollowUp(independentGateFollowUps[0], {
        group: verifierGroup,
        memorySnapshot: { workerLedger: [{ project: "web-app", status: "done", receiptStatus: "done", summary: "完成订单详情改动" }] },
        userMessage: "完善订单详情接口与页面。",
        coordinatorOutput: "主 Agent 计划：web-app 修改，test-agent 独立复核。",
        round: 1,
        maxRounds: 2,
      })
    : null;
  const failedReviewReworkFollowUps = buildFailedIndependentReviewReworkFollowUps({
    group: verifierGroup,
    task: {
      id: "failed-independent-review-rework-selftest",
      group_id: "failed-independent-review-rework-group",
      assign_type: "group",
      workflow_type: "daily_dev",
      target_project: "web-app",
      title: "修复登录恢复体验",
      business_goal: "登录恢复修复必须通过 TestAgent 复核",
      requires_independent_review: true,
      file_changes: {
        files: [{
          project: "web-app",
          path: "backend/routes/session.ts",
          statusKind: "modified",
          statusText: "修改",
          diff: { additions: 12, deletions: 3 },
        }],
      },
    },
    outputs: [formatCollectedAgentOutput("test-agent", failedNativeTestAgentOutputWithHandoff, failedNativeTestAgentReceiptWithHandoff)],
    existingFollowUps: [],
  });
  const failedReviewRoutedFollowUp = failedReviewReworkFollowUps[0]
    ? buildCoordinatorReworkFollowUp(failedReviewReworkFollowUps[0], {
        group: verifierGroup,
        memorySnapshot: {
          workerLedger: [{
            project: "web-app",
            status: "done",
            receiptStatus: "done",
            summary: "已修复登录恢复流程",
            filesChanged: ["backend/routes/session.ts"],
            verification: ["npm test failed"],
          }],
        },
        userMessage: "修复登录恢复体验。",
        coordinatorOutput: "主 Agent 计划：web-app 实现修复，test-agent 独立复核。",
        round: 1,
        maxRounds: 2,
      })
    : null;
  const needsRecheckReviewFollowUps = buildIndependentReviewGateFollowUps({
    group: verifierGroup,
    task: {
      id: "needs-recheck-independent-review-selftest",
      group_id: "needs-recheck-independent-review-group",
      assign_type: "group",
      workflow_type: "daily_dev",
      target_project: "web-app",
      title: "重新核对登录恢复体验",
      business_goal: "登录恢复必须完成 TestAgent 复验",
      requires_independent_review: true,
      file_changes: {
        files: [{
          project: "web-app",
          path: "backend/routes/session.ts",
          statusKind: "modified",
          statusText: "修改",
          diff: { additions: 12, deletions: 3 },
        }],
      },
    },
    outputs: [formatCollectedAgentOutput("test-agent", needsRecheckOutputWithHandoff, needsRecheckReceiptWithHandoff)],
    existingFollowUps: [],
  });
  const needsRecheckRoutedFollowUp = needsRecheckReviewFollowUps[0]
    ? buildCoordinatorReworkFollowUp(needsRecheckReviewFollowUps[0], {
        group: verifierGroup,
        memorySnapshot: { workerLedger: [{ project: "test-agent", status: "blocked", receiptStatus: "blocked", summary: "上一轮复核证据未闭环" }] },
        userMessage: "重新核对登录恢复体验。",
        coordinatorOutput: "TestAgent 需要重新复验。",
        round: 1,
        maxRounds: COORDINATOR_REVIEW_MAX_ROUNDS,
      })
    : null;
  const environmentReviewReceipt = {
    agent: "test-agent",
    reviewer: "test-agent",
    role: "independent_verifier",
    status: "blocked",
    summary: "独立复核受环境或登录条件阻塞，需要先补齐条件。",
    actions: [],
    filesChanged: [],
    verification: [],
    blockers: ["测试登录账号不可用"],
    needs: ["补齐登录或运行条件"],
    testAgentHandoff: independentHandoff,
    test_agent_handoff: independentHandoff,
    testAgentReport: {
      verdict: {
        status: "partial",
        recommendation: "need_human",
        canAccept: false,
        needsRework: false,
        needsHuman: true,
        needsRecheck: false,
        needsEnvironment: true,
        reviewRoute: "environment",
      },
    },
    independentReview: [{
      reviewer: "test-agent",
      reviewSubject: "web-app",
      verdict: "needs_environment",
      summary: "登录条件不足，当前无法完成真实浏览器验收。",
      evidence: ["需要补齐测试登录账号"],
    }],
  };
  const environmentReviewOutput = [
    "TestAgent 复核受环境条件阻塞。",
    "",
    "CCM_AGENT_RECEIPT",
    "```json",
    JSON.stringify(environmentReviewReceipt, null, 2),
    "```",
  ].join("\n");
  const environmentReviewFollowUps = buildIndependentReviewGateFollowUps({
    group: verifierGroup,
    task: {
      id: "needs-environment-independent-review-selftest",
      group_id: "needs-environment-independent-review-group",
      assign_type: "group",
      workflow_type: "daily_dev",
      target_project: "web-app",
      title: "补齐登录恢复复核条件",
      business_goal: "登录恢复必须在可用登录条件下完成验收",
      requires_independent_review: true,
      file_changes: {
        files: [{
          project: "web-app",
          path: "backend/routes/session.ts",
          statusKind: "modified",
          statusText: "修改",
          diff: { additions: 12, deletions: 3 },
        }],
      },
    },
    outputs: [formatCollectedAgentOutput("test-agent", environmentReviewOutput, environmentReviewReceipt)],
    existingFollowUps: [],
  });
  const environmentRoutedFollowUp = environmentReviewFollowUps[0]
    ? buildCoordinatorReworkFollowUp(environmentReviewFollowUps[0], {
        group: verifierGroup,
        memorySnapshot: { workerLedger: [{ project: "web-app", status: "done", receiptStatus: "done", summary: "登录恢复实现已完成" }] },
        userMessage: "补齐登录恢复复核条件。",
        coordinatorOutput: "TestAgent 等待登录条件。",
        round: 1,
        maxRounds: COORDINATOR_REVIEW_MAX_ROUNDS,
      })
    : null;
  const scheduledRechecks = scheduleTestAgentRecheckAfterFollowUps(
    failedReviewRoutedFollowUp ? [failedReviewRoutedFollowUp] : [],
    [formatCollectedAgentOutput("web-app", "已修复复核失败点并重新运行最小验证。", {
      agent: "web-app",
      status: "done",
      summary: "已修复登录恢复复核失败点",
      actions: ["修复登录恢复交互"],
      filesChanged: ["backend/routes/session.ts"],
      verification: ["npm test passed"],
      blockers: [],
      needs: [],
    })]
  );
  const scheduledRecheckRoutedFollowUp = scheduledRechecks[0]
    ? buildCoordinatorReworkFollowUp(scheduledRechecks[0], {
        group: verifierGroup,
        memorySnapshot: { workerLedger: [{ project: "test-agent", status: "failed", receiptStatus: "failed", summary: "上一轮复核未通过" }] },
        userMessage: "修复登录恢复体验。",
        coordinatorOutput: "web-app 已返工，准备重新运行 TestAgent。",
        round: 2,
        maxRounds: COORDINATOR_REVIEW_MAX_ROUNDS,
      })
    : null;
  const latestReviewWinsGate = buildIndependentReviewGate(
    {
      requires_independent_review: true,
      workflow_type: "daily_dev",
    },
    [{
      project: "web-app",
      path: "backend/routes/session.ts",
      statusKind: "modified",
    }],
    [
      {
        ...failedNativeTestAgentReceipt,
        independentReview: [{
          reviewer: "test-agent",
          reviewSubject: "web-app",
          verdict: "failed",
          summary: "上一轮复核未通过。",
          evidence: ["旧失败证据"],
        }],
      },
      {
        ...nativeTestAgentReceipt,
        independentReview: [{
          reviewer: "test-agent",
          reviewSubject: "web-app",
          verdict: "passed",
          summary: "返工后的最新复核已通过。",
          evidence: ["最新通过证据"],
        }],
      },
    ],
    []
  );
  const structuredTestAgentEvidenceFollowUps = buildEvidenceGateFollowUps(verifierGroup, [
    formatCollectedAgentOutput("test-agent", needsRecheckOutputWithHandoff, needsRecheckReceiptWithHandoff),
  ]);
  const hardRouteFilteredLlmFollowUps = filterCoordinatorLlmFollowUpsAgainstHardRoutes([
    { targetName: "web-app", project: "web-app", summary: "再让原实现成员泛化返工" },
    { targetName: "test-agent", project: "test-agent", reviewSubject: "web-app", summary: "另起一份泛化复核" },
    { targetName: "docs-agent", project: "docs-agent", summary: "补充独立文档" },
  ], scheduledRechecks, true);
  const postReviewSpotCheckContract = runPostReviewSpotCheckContractSelfTest();
  const postReviewSpotCheckRoutedFollowUp = buildCoordinatorReworkFollowUp({
    mention: "@test-agent",
    targetName: "test-agent",
    project: "test-agent",
    summary: "完成前抽查需要 TestAgent 重新复验",
    message: "完成前抽查发现结果不一致，请沿用原工作单重新执行并重新判断。",
    reason: "主 Agent 抽查 2 项验证，其中 1 项不一致",
    rework_kind: "post_review_spot_check_reverify",
    postReviewSpotCheckReverify: true,
    reviewSubject: "web-app",
    originalTarget: "web-app",
    testAgentHandoff: independentHandoff,
  }, {
    group: verifierGroup,
    memorySnapshot: { workerLedger: [{ project: "test-agent", status: "done", receiptStatus: "done", summary: "上一轮复核通过" }] },
    userMessage: "完善订单详情页。",
    coordinatorOutput: "TestAgent 已通过，主 Agent 正在完成前抽查。",
    round: 1,
    maxRounds: 2,
  });
  const blockedIndependentFollowUp = buildCoordinatorReworkFollowUp({
    project: "web-app",
    targetName: "web-app",
    message: "请让非原实现者做独立复核，只读检查 OrderDetail.vue 的验收覆盖和风险。",
    reason: "复杂变更需要独立验证",
  }, {
    group: { members: [{ project: "coordinator", role: "coordinator" }, { project: "web-app", role: "frontend" }] },
    memorySnapshot: { workerLedger: [] },
    userMessage: "完善订单详情页。",
    coordinatorOutput: "主 Agent 计划：web-app 修改页面。",
    round: 1,
    maxRounds: 2,
  });
  const task = buildCoordinatorReworkTask(
    {
      project: "web-app",
      message: "补充订单退款审核入口的实际验证记录，并说明修改文件。",
      reason: "done 回执缺少可采信的已执行验证证据",
      summary: "补齐前端验证证据",
    },
    {
      userMessage: "按接口文档实现订单退款审核功能。",
      coordinatorOutput: "主 Agent 计划：先后端接口，再前端对接，最后验收回执。",
      round: 1,
      maxRounds: 3,
      reworkRoute: failedRoute,
    }
  );
  const checks = {
    hasReworkPacket: task.includes("主 Agent 返工工作单"),
    hasVisibleSummary: task.includes("用户可见返工摘要") && task.includes("补齐前端验证证据"),
    hasRound: task.includes("第 2/3 轮执行"),
    hasRoutePacket: task.includes("返工路由") && task.includes("继续同一子 Agent 修复"),
    hasContinuationSemantics: task.includes("续跑语义") && task.includes("同一个子 Agent"),
    hasScratchpadContext: task.includes("上一轮完成通知") && task.includes("上下文摘要"),
    hasOriginalRequirement: task.includes("原始需求"),
    hasCoordinatorPlan: task.includes("初始协调计划摘要"),
    hasReason: task.includes("返工原因"),
    hasVerification: task.includes("验证要求"),
    hasReceipt: task.includes("CCM_AGENT_RECEIPT"),
    failedRouteKeepsSameWorker: failedRoute.strategy === "continue_same_worker" && failedRoute.continuationStrategy === "same_worker_scratchpad",
    independentRouteUsesFreshVerifier: independentRoute.strategy === "fresh_verification_worker" && independentRoute.requires_fresh_verifier === true,
    independentVerifierSelectsTestAgent: verifierSelection.available === true && verifierSelection.targetName === "test-agent" && verifierSelection.originalTarget === "web-app",
    independentVerifierExcludesOriginalTarget: verifierSelection.candidates.every((item: any) => item.project !== "web-app"),
    independentVerifierReportsMissingCandidate: noVerifierSelection.available === false && noVerifierSelection.targetName === "",
    nativeTestAgentDoesNotRequireGroupMembership: nativeVerifierSelection.available === true
      && nativeVerifierSelection.targetName === "test-agent"
      && nativeVerifierSelection.nativeTestAgent?.available === true,
    postReviewSpotCheckContractPasses: postReviewSpotCheckContract.pass === true,
    postReviewSpotCheckReusesSameVerifierAndHandoff: postReviewSpotCheckRoutedFollowUp.targetName === "test-agent"
      && postReviewSpotCheckRoutedFollowUp.reworkRoute?.strategy === "resume_verifier"
      && postReviewSpotCheckRoutedFollowUp.continuationStrategy === "same_verifier_context"
      && postReviewSpotCheckRoutedFollowUp.testAgentHandoff?.id === independentHandoff?.id
      && postReviewSpotCheckRoutedFollowUp.reviewSubject === "web-app",
    coordinatorReviewLoopAllowsRepairRecheckAndFinalAcceptance: COORDINATOR_REVIEW_MAX_ROUNDS === 5,
    structuredTestAgentReceiptSkipsGenericWorkerFollowUp: structuredTestAgentEvidenceFollowUps.length === 0,
    hardReviewRouteSuppressesConflictingLlmFollowUps: hardRouteFilteredLlmFollowUps.length === 1
      && hardRouteFilteredLlmFollowUps[0].targetName === "docs-agent",
    needsRecheckCreatesSameTestAgentWorkOrderContinuation: needsRecheckReviewFollowUps.length === 1
      && needsRecheckReviewFollowUps[0].targetName === "test-agent"
      && needsRecheckReviewFollowUps[0].rework_kind === "test_agent_review_recheck"
      && needsRecheckRoutedFollowUp?.targetName === "test-agent"
      && needsRecheckRoutedFollowUp?.reworkRoute?.strategy === "resume_verifier"
      && needsRecheckRoutedFollowUp?.continuationStrategy === "same_verifier_context"
      && needsRecheckRoutedFollowUp?.testAgentHandoff?.id === independentHandoff?.id
      && needsRecheckRoutedFollowUp?.message.includes("不能复用上一轮结论"),
    needsEnvironmentPreparesConditionsBeforeRecheck: environmentReviewFollowUps.length === 1
      && environmentReviewFollowUps[0].targetName === "web-app"
      && environmentReviewFollowUps[0].rework_kind === "test_agent_environment_prepare"
      && environmentReviewFollowUps[0].rerunTestAgentAfterCompletion === true
      && environmentRoutedFollowUp?.reworkRoute?.strategy === "prepare_verification_environment"
      && environmentRoutedFollowUp?.reworkRoute?.user_label === "补齐复核条件后自动复验"
      && environmentRoutedFollowUp?.message.includes("主 Agent 收到可用结果后会自动沿用原复核工作单重新运行 TestAgent"),
    implementationReworkSchedulesTestAgentRecheck: failedReviewReworkFollowUps[0]?.rerunTestAgentAfterCompletion === true
      && failedReviewReworkFollowUps[0]?.testAgentRecheckHandoff?.id === independentHandoff?.id
      && scheduledRechecks.length === 1
      && scheduledRechecks[0].targetName === "test-agent"
      && scheduledRecheckRoutedFollowUp?.reworkRoute?.strategy === "resume_verifier"
      && scheduledRecheckRoutedFollowUp?.continuationStrategy === "same_verifier_context"
      && scheduledRecheckRoutedFollowUp?.testAgentHandoff?.id === independentHandoff?.id,
    coordinatorReviewBudgetCoversRepairRecheckAndAcceptance: COORDINATOR_REVIEW_MAX_ROUNDS >= 4,
    latestTestAgentReviewSupersedesStaleFailure: latestReviewWinsGate.pass === true
      && latestReviewWinsGate.status === "passed"
      && latestReviewWinsGate.evidence_count === 1
      && latestReviewWinsGate.passed_count === 1
      && latestReviewWinsGate.failed_count === 0
      && latestReviewWinsGate.evidence?.[0]?.summary.includes("最新复核已通过"),
    independentReworkDispatchesToVerifier: independentFollowUp.targetName === "test-agent"
      && independentFollowUp.project === "test-agent"
      && independentFollowUp.continuationOf === "web-app"
      && independentFollowUp.reviewSubject === "web-app"
      && independentFollowUp.verifierSelection?.targetName === "test-agent",
    independentReworkTaskNamesReviewSubject: independentFollowUp.message.includes("主 Agent 返工工作单：test-agent")
      && independentFollowUp.message.includes("独立复核对象：web-app")
      && independentFollowUp.userTaskPreview.includes("复核 web-app"),
    independentReworkBuildsNativeTestAgentHandoff: independentHandoff?.schema === "ccm-test-agent-handoff-v1"
      && independentHandoffProject?.name === "web-app"
      && independentHandoff?.metadata?.reviewSubject === "web-app"
      && independentHandoff?.metadata?.verifier === "test-agent"
      && independentHandoffReviewInstructions.includes("独立复核")
      && independentHandoffReviewInstructions.includes("不得只复述原实现者结论")
      && independentHandoff?.originalUserGoal.includes("完善订单详情页")
      && independentHandoff?.review_subject === "web-app"
      && !independentHandoff?.work_order,
    descriptiveVerificationEvidenceIsNotExecutedAsShell: commandOnlyVerificationCommands.length === 2
      && commandOnlyVerificationCommands[0] === "npm run test"
      && commandOnlyVerificationCommands[1] === "npm run build"
      && commandOnlyVerificationCommands.every((command: string) => !command.includes("node scripts/") && !command.includes("→")),
    commandOnlyHandoffCarriesAdversarialWaiver: commandOnlyHandoff?.options?.requireAdversarialProbe === false
      && String(commandOnlyHandoff?.options?.adversarialProbeWaiver || "").includes("没有已配置的 HTTP、浏览器或用户输入攻击面"),
    testAgentAcceptanceExcludesCoordinatorResponsibilities: independentHandoffAcceptance.includes("订单详情变更覆盖用户目标")
      && commandOnlyAcceptanceCriteria.some((criterion: string) => criterion.includes("导出的静态常量值符合需求"))
      && commandOnlyAcceptanceCriteria.some((criterion: string) => criterion.includes("命令 npm run test 必须成功执行"))
      && commandOnlyAcceptanceCriteria.every((criterion: string) => !criterion.includes("主 Agent")
        && !criterion.includes("最终总结")
        && !criterion.includes("实际文件变更")
        && !criterion.includes("验收项目子 Agent")
        && !criterion.includes("TestAgent")
        && !criterion.includes("项目执行成员必须说明")
        && !criterion.includes("返工再复验"))
      && commandOnlyCompletedTasks.every((item: string) => !item.includes("基于最新项目状态核对")),
    independentReworkKeepsNativeHandoffOutOfVisibleText: independentFollowUp.message.includes("TestAgent 原生复核交接单")
      && !independentFollowUp.message.includes("```json")
      && !independentFollowUp.message.includes("ccm-test-agent-handoff-v1"),
    nativeTestAgentReportBecomesIndependentReviewReceipt: nativeTestAgentReceipt.status === "done"
      && nativeTestAgentReceipt.filesChanged.length === 0
      && nativeTestAgentReceipt.independentReview?.[0]?.reviewSubject === "web-app"
      && nativeTestAgentReceipt.independentReview?.[0]?.verdict === "passed"
      && nativeTestAgentReceipt.verification.some((item: string) => item.includes("npm test")),
    nativeTestAgentReceiptConsumesVerdictArtifact: nativeTestAgentReceipt.testAgentReport?.verdict?.schema === "ccm-test-agent-verdict-v1"
      && nativeTestAgentReceipt.testAgentReport?.verdict?.canAccept === true
      && nativeTestAgentReceipt.testAgentReport?.verdict?.needsRework === false
      && nativeTestAgentReceipt.summary.includes("可以接受")
      && nativeTestAgentReceipt.actions.some((item: string) => item.includes("保留 TestAgent 报告和证据清单")),
    nativeFailedTestAgentReceiptRequestsRework: failedNativeTestAgentReceipt.status === "failed"
      && failedNativeTestAgentReceipt.independentReview?.[0]?.verdict === "failed"
      && failedNativeTestAgentReceipt.summary.includes("需要返工")
      && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("浏览器检查") && item.includes("登录恢复浏览器复核"))
      && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("必检项 命令验证未覆盖"))
      && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("验收条件未通过"))
      && failedNativeTestAgentReceipt.needs.some((item: string) => item.includes("打开失败截图核对页面"))
      && failedNativeTestAgentReceipt.needs.some((item: string) => item.includes("把失败检查项带回给原实现成员返工"))
      && failedNativeTestAgentReceipt.needs.some((item: string) => item.includes("自动重新运行 TestAgent 复核"))
      && failedNativeTestAgentReceipt.actions.some((item: string) => item.includes("读取 TestAgent 裁决：需要返工")),
    nativeTestAgentUnknownCoverageReportBlocksWithoutVerdictArtifact: unknownCoverageTestAgentReceipt.status === "blocked"
      && unknownCoverageTestAgentReceipt.independentReview?.[0]?.verdict === "blocked"
      && unknownCoverageTestAgentReceipt.summary.includes("需要人工确认")
      && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.schema === "ccm-test-agent-verdict-v1"
      && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
      && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.needsHuman === true
      && unknownCoverageTestAgentReceipt.testAgentReport?.verdict?.unknownAcceptanceCriteria?.length === 1
      && unknownCoverageTestAgentReceipt.blockers.some((item: string) => item.includes("验收条件待确认"))
      && unknownCoverageTestAgentReceipt.needs.some((item: string) => item.includes("补齐未覆盖的验证证据"))
      && unknownCoverageTestAgentReceipt.needs.every((item: string) => !item.includes("可以接受"))
      && unknownCoverageTestAgentReceipt.actions.some((item: string) => item.includes("根据报告形成 TestAgent 裁决：需要人工确认")),
    nativeTestAgentUnknownCoverageVisibleOutputDoesNotAccept: unknownCoverageTestAgentVisibleOutput.includes("独立复核需要人工确认")
      && unknownCoverageTestAgentVisibleOutput.includes("结论：部分通过；建议：需要人工确认")
      && unknownCoverageTestAgentVisibleOutput.includes("复核裁决：需要人工确认")
      && unknownCoverageTestAgentVisibleOutput.includes("验收条件待确认")
      && !unknownCoverageTestAgentVisibleOutput.includes("独立复核通过")
      && !unknownCoverageTestAgentVisibleOutput.includes("复核裁决：可以接受")
      && !/verdict\.json|C:\/tmp|ccm-test-agent-verdict-v1/i.test(unknownCoverageTestAgentVisibleOutput),
    nativeTestAgentNotVerifiedCoverageReportRequestsReworkWithoutVerdictArtifact: notVerifiedCoverageTestAgentReceipt.status === "failed"
      && notVerifiedCoverageTestAgentReceipt.independentReview?.[0]?.verdict === "failed"
      && notVerifiedCoverageTestAgentReceipt.summary.includes("需要返工")
      && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.schema === "ccm-test-agent-verdict-v1"
      && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
      && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.needsRework === true
      && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.failedRequiredChecks?.length === 1
      && notVerifiedCoverageTestAgentReceipt.testAgentReport?.verdict?.failedAcceptanceCriteria?.length === 1
      && notVerifiedCoverageTestAgentReceipt.blockers.some((item: string) => item.includes("必检项 浏览器流程未覆盖"))
      && notVerifiedCoverageTestAgentReceipt.blockers.some((item: string) => item.includes("验收条件未通过"))
      && notVerifiedCoverageTestAgentReceipt.needs.some((item: string) => item.includes("自动重新运行 TestAgent 复核"))
      && notVerifiedCoverageTestAgentReceipt.actions.some((item: string) => item.includes("根据报告形成 TestAgent 裁决：需要返工")),
    nativeTestAgentNotVerifiedCoverageVisibleOutputShowsRework: notVerifiedCoverageTestAgentVisibleOutput.includes("独立复核要求返工")
      && notVerifiedCoverageTestAgentVisibleOutput.includes("结论：未通过；建议：需要返工")
      && notVerifiedCoverageTestAgentVisibleOutput.includes("复核裁决：需要返工")
      && notVerifiedCoverageTestAgentVisibleOutput.includes("必检项 浏览器流程未覆盖")
      && notVerifiedCoverageTestAgentVisibleOutput.includes("验收条件未通过")
      && !notVerifiedCoverageTestAgentVisibleOutput.includes("复核裁决：可以接受")
      && !/verdict\.json|C:\/tmp|ccm-test-agent-verdict-v1/i.test(notVerifiedCoverageTestAgentVisibleOutput),
    nativeFailedTestAgentVisibleOutputShowsReworkPath: failedNativeTestAgentVisibleOutput.includes("独立复核要求返工")
      && failedNativeTestAgentVisibleOutput.includes("结论：未通过；建议：需要返工")
      && failedNativeTestAgentVisibleOutput.includes("复核裁决：需要返工")
      && failedNativeTestAgentVisibleOutput.includes("返工重点")
      && failedNativeTestAgentVisibleOutput.includes("浏览器检查")
      && failedNativeTestAgentVisibleOutput.includes("排查建议")
      && failedNativeTestAgentVisibleOutput.includes("打开失败截图核对页面")
      && failedNativeTestAgentVisibleOutput.includes("待补齐项")
      && failedNativeTestAgentVisibleOutput.includes("必检项 命令验证未覆盖")
      && failedNativeTestAgentVisibleOutput.includes("验收条件未通过")
      && failedNativeTestAgentVisibleOutput.includes("把失败检查项带回给原实现成员返工")
      && failedNativeTestAgentVisibleOutput.includes("自动重新运行 TestAgent 复核"),
    nativeFailedTestAgentVisibleOutputHidesRawVerdict: failedNativeTestAgentOutput.includes("CCM_AGENT_RECEIPT")
      && !/needsRework|failedRequiredChecks|report_json|verdict\.json|artifact-manifest\.json|browser-artifacts|C:\/tmp|\bfailed\b|\brework\b|networkLogPath/i.test(failedNativeTestAgentVisibleOutput),
    nativeTestAgentOutputCarriesReceiptAndArtifacts: nativeTestAgentOutput.includes("CCM_AGENT_RECEIPT")
      && nativeTestAgentReceipt.testAgentReport?.artifactFiles?.reportMarkdownPath?.includes("report.md")
      && nativeTestAgentReceipt.testAgentReport?.artifactFiles?.manifestPath?.includes("artifact-manifest.json")
      && nativeTestAgentVisibleOutput.includes("证据归档")
      && nativeTestAgentVisibleOutput.includes("技术详情")
      && nativeTestAgentVisibleOutput.includes("TestAgent 独立复核完成")
      && !/C:\/tmp|artifact-manifest\.json|report\.md|verdict\.json/i.test(nativeTestAgentVisibleOutput),
    nativeTestAgentVisibleOutputUsesFriendlyLabels: nativeTestAgentVisibleOutput.includes("独立复核通过")
      && nativeTestAgentVisibleOutput.includes("结论：通过；建议：可以接受")
      && nativeTestAgentVisibleOutput.includes("复核裁决：可以接受")
      && nativeTestAgentVisibleOutput.includes("命令 npm test 通过")
      && !/\bpassed\b|\baccept\b|verified command|blocked\/needs|exit=0/i.test(nativeTestAgentVisibleOutput),
    nativeTestAgentReceiptIncludesBrowserEvidenceSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("浏览器交互"))
      && nativeTestAgentReceipt.verification.some((item: string) => item.includes("浏览器网络"))
      && nativeTestAgentReceipt.testAgentReport?.verdict?.browserInteractionSummary?.length === 1
      && nativeTestAgentReceipt.testAgentReport?.verdict?.browserNetworkSummary?.length === 1,
    nativeTestAgentReceiptIncludesBrowserFlowSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("真实浏览器验收") && item.includes("1 个通过"))
      && nativeTestAgentReceipt.testAgentReport?.verdict?.browserFlowSummary?.total === 1
      && nativeTestAgentReceipt.testAgentReport?.browserFlowSummary?.criteriaCount === 1
      && nativeTestAgentReceipt.testAgentReport?.verdict?.requiredCheckSummary
      && nativeTestAgentReceipt.testAgentReport?.verdict?.acceptanceSummary,
    nativeTestAgentReceiptIncludesSafeAuthenticationSummary: nativeTestAgentReceipt.verification.some((item: string) =>
      item.includes("登录态浏览器验收") && item.includes("2 项通过") && item.includes("2 个已登录会话")
    )
      && nativeTestAgentReceipt.testAgentReport?.browserAuthenticationSummary?.configuredChecks === 2
      && nativeTestAgentReceipt.testAgentReport?.verdict?.browserAuthenticationSummary?.passedChecks === 2
      && !/credentialEnvNames|TEST_EMAIL|TEST_PASSWORD|storageState|cookie|token|sha/i.test(JSON.stringify({
        report: nativeTestAgentReceipt.testAgentReport?.browserAuthenticationSummary,
        verdict: nativeTestAgentReceipt.testAgentReport?.verdict?.browserAuthenticationSummary,
        summary: nativeTestAgentReviewSummary,
        visible: nativeTestAgentVisibleOutput,
      })),
    nativeTestAgentReceiptIncludesActionEffectAndAdversarialEvidence: nativeTestAgentReceipt.verification.some((item: string) =>
      item.includes("操作结果验证") && item.includes("产生预期变化")
    )
      && nativeTestAgentReceipt.verification.some((item: string) =>
        item.includes("边界与异常验证") && item.includes("与当前目标相关并通过")
      )
      && nativeTestAgentReceipt.testAgentReport?.verdict?.browserActionEffectSummary?.changed === 1
      && nativeTestAgentReceipt.testAgentReport?.verdict?.adversarialEvidenceSummary?.status === "verified",
    failedActionEffectAndAdversarialEvidenceOverridePass: failedNativeTestAgentReceipt.status === "failed"
      && failedNativeTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
      && failedNativeTestAgentReceipt.testAgentReport?.verdict?.needsRework === true
      && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("没有产生可见效果"))
      && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("边界检查") && item.includes("未通过"))
      && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("操作结果验证"))
      && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("边界与异常验证"))
      && !/token=hidden|duplicate_submit|playwright|changedSignals/i.test(JSON.stringify(failedNativeTestAgentReviewSummary)),
    incompleteActionRecoveryAndAdversarialEvidenceRequireRecheck: needsRecheckReceipt.status === "blocked"
      && needsRecheckReceipt.independentReview?.[0]?.verdict === "needs_recheck"
      && needsRecheckReceipt.testAgentReport?.verdict?.canAccept === false
      && needsRecheckReceipt.testAgentReport?.verdict?.needsRework === false
      && needsRecheckReceipt.testAgentReport?.verdict?.needsRecheck === true
      && needsRecheckReviewSummary.status === "needs_recheck"
      && needsRecheckReviewSummary.status_label === "需复验"
      && needsRecheckReviewSummary.rows.some((item: string) => item.includes("暂时无法确认页面效果"))
      && needsRecheckReviewSummary.rows.some((item: string) => item.includes("不代表实现失败"))
      && needsRecheckReviewSummary.rows.some((item: string) => item.includes("TestAgent 工作单"))
      && needsRecheckReviewSummary.next_action.includes("重新运行 TestAgent")
      && !needsRecheckReviewSummary.headline.includes("原实现成员返工")
      && needsRecheckReceipt.needs.every((item: string) => !item.includes("决定是否返工原实现成员")),
    needsRecheckVisibleOutputAvoidsImplementationRework: needsRecheckVisibleOutput.includes("独立复核还没有闭环")
      && needsRecheckVisibleOutput.includes("建议：重新复验")
      && needsRecheckVisibleOutput.includes("不代表实现失败")
      && needsRecheckVisibleOutput.includes("TestAgent 工作单")
      && !needsRecheckVisibleOutput.includes("复核裁决：需要返工")
      && !/hidden-session|unsafe duplicate side effect|rawSessionId|token=|duplicate_submit|playwright/i.test(needsRecheckVisibleOutput),
    failedAuthenticationOverridesLegacyPass: failedAuthenticationReceipt.status === "failed"
      && failedAuthenticationReceipt.testAgentReport?.verdict?.canAccept === false
      && failedAuthenticationReceipt.testAgentReport?.verdict?.needsRework === true
      && failedAuthenticationReviewSummary.status === "needs_rework"
      && failedAuthenticationReviewSummary.rows.some((item: string) => item.includes("登录态浏览器验收") && item.includes("1 项未通过"))
      && !/PRIVATE_TEST_LOGIN|PRIVATE_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify(failedAuthenticationReviewSummary)),
    blockedAuthenticationNeedsUserWithoutLeakingCredentials: blockedAuthenticationReceipt.status === "blocked"
      && blockedAuthenticationReceipt.testAgentReport?.verdict?.canAccept === false
      && blockedAuthenticationReceipt.testAgentReport?.verdict?.needsHuman === true
      && blockedAuthenticationReviewSummary.status === "needs_user"
      && blockedAuthenticationReviewSummary.rows.some((item: string) => item.includes("测试账号或登录条件"))
      && !/PRIVATE_TEST_LOGIN|PRIVATE_TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify(blockedAuthenticationReviewSummary)),
    nativeTestAgentReceiptIncludesMultiSessionBrowserSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("多人协作浏览器验收") && item.includes("2 个通过"))
      && nativeTestAgentReceipt.testAgentReport?.verdict?.browserMultiSessionSummary?.total === 2
      && nativeTestAgentReceipt.testAgentReport?.browserMultiSessionSummary?.parallelGroupCount === 2
      && failedNativeTestAgentReceipt.status === "failed"
      && failedNativeTestAgentReceipt.testAgentReport?.verdict?.canAccept === false
      && failedNativeTestAgentReceipt.testAgentReport?.verdict?.needsRework === true
      && failedNativeTestAgentReceipt.blockers.some((item: string) => item.includes("观察方") && item.includes("未通过")),
    nativeTestAgentReviewSummaryReadyForGroupCard: nativeTestAgentReviewSummary.status === "passed"
      && nativeTestAgentReviewSummary.rows.some((item: string) => item.includes("登录态浏览器验收"))
      && nativeTestAgentReviewSummary.rows.some((item: string) => item.includes("真实浏览器验收"))
      && nativeTestAgentReviewSummary.rows.some((item: string) => item.includes("多人协作浏览器验收"))
      && failedNativeTestAgentReviewSummary.status === "needs_rework"
      && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("表单流程") && item.includes("未通过"))
      && failedNativeTestAgentReviewSummary.rows.some((item: string) => item.includes("观察方") && item.includes("未通过"))
      && !/acceptance_form_flow|assert:networkNoErrors|session:observer|#raw-observer|locator|browserMultiSessionSummary|ccm-test-agent/i.test(JSON.stringify(failedNativeTestAgentReviewSummary.rows)),
    configuredMultiSessionBrowserCheckAddsRequiredCoverage: hasConfiguredTestAgentMultiSessionBrowserCheck([{
      sessions: [{ name: "sender" }, { name: "receiver" }],
      sessionSteps: [{ session: "sender", action: "click" }],
    }]) && !hasConfiguredTestAgentMultiSessionBrowserCheck([{
      sessions: [{ name: "single" }],
      sessionSteps: [{ session: "single", action: "click" }],
    }]),
    nativeTestAgentPlanSummaryShowsMultiSessionWork: nativePlanSummary.includes("6 个跨会话步骤")
      && nativePlanSummary.includes("2 组并行动作"),
    nativeTestAgentReceiptIncludesUploadDownloadEvidenceSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("文件上传") && item.includes("notes.txt") && item.includes("meta.json"))
      && nativeTestAgentReceipt.verification.some((item: string) => item.includes("文件下载") && item.includes("tasks.csv")),
    nativeTestAgentReceiptIncludesTableEvidenceSummary: nativeTestAgentReceipt.verification.some((item: string) => item.includes("表格验证") && item.includes("3 项表格")),
    nativeTestAgentVisibleOutputIncludesBrowserEvidenceSummary: nativeTestAgentVisibleOutput.includes("浏览器证据")
      && nativeTestAgentVisibleOutput.includes("多人协作浏览器验收")
      && nativeTestAgentVisibleOutput.includes("浏览器交互")
      && nativeTestAgentVisibleOutput.includes("浏览器网络")
      && !/session:observer|#raw-observer|locator|browserMultiSessionSummary|networkLogPath|network\.log|127\.0\.0\.1:5173|C:\/tmp/i.test(nativeTestAgentVisibleOutput),
    nativeTestAgentVisibleOutputIncludesUploadDownloadEvidenceSummary: nativeTestAgentVisibleOutput.includes("文件上传")
      && nativeTestAgentVisibleOutput.includes("notes.txt")
      && nativeTestAgentVisibleOutput.includes("meta.json")
      && nativeTestAgentVisibleOutput.includes("文件下载")
      && nativeTestAgentVisibleOutput.includes("tasks.csv")
      && !/browser-artifacts|downloads|C:\/tmp/i.test(nativeTestAgentVisibleOutput),
    nativeTestAgentVisibleOutputIncludesTableEvidenceSummary: nativeTestAgentVisibleOutput.includes("表格验证")
      && nativeTestAgentVisibleOutput.includes("3 项表格")
      && !/#orders|A-100|B-200|column=Status|column=Total/i.test(nativeTestAgentVisibleOutput),
    nativeTestAgentTableFailureSummaryHidesLocatorDetails: failedTableEvidenceSummary.includes("表格验证")
      && failedTableEvidenceSummary.includes("表格断言未通过")
      && failedTableEvidenceSummary.includes("技术详情")
      && !/#orders|B-200|column=Status|actual=Draft/i.test(failedTableEvidenceSummary),
    nativeTestAgentPlanSummaryIsUserReadable: nativePlanSummary.includes("TestAgent 复核计划")
      && nativePlanSummary.includes("1 个命令")
      && !/ccm-test-agent-execution-plan-v1|raw payload|trace_id/i.test(nativePlanSummary),
    nativeTestAgentPlanSummaryUsesFriendlyArtifactLabels: nativePlanSummary.includes("结构化报告")
      && nativePlanSummary.includes("报告文档")
      && nativePlanSummary.includes("证据清单")
      && nativePlanSummary.includes("网络记录")
      && !/report_json|report_markdown|artifact_manifest|browser_har/i.test(nativePlanSummary),
    nativeTestAgentInvalidPlanBlocksBeforeExecution: nativePlanBlockedReceipt.status === "blocked"
      && nativePlanBlockedReceipt.filesChanged.length === 0
      && nativePlanBlockedReceipt.blockers.some((item: string) => item.includes("missing_work_dir"))
      && nativePlanBlockedOutput.includes("CCM_AGENT_RECEIPT")
      && nativePlanBlockedOutput.includes("复核计划未通过"),
    nativeTestAgentRunnerBypassesThirdPartyToolSync: nativeTestAgentRuntimeContext.dispatchBlocked === false
      && nativeTestAgentRuntimeContext.audit.runtime === "test-agent-native"
      && nativeTestAgentRuntimeContext.audit.mode === "native-test-agent-runner",
    independentReviewGateCreatesFollowUp: independentGateFollowUps.length === 1
      && independentGateFollowUps[0].targetName === "web-app"
      && independentGateFollowUps[0].rework_kind === "independent_review_gate"
      && independentGateFollowUps[0].message.includes("非原实现者")
      && independentGateFollowUps[0].independentReviewGate?.required === true,
    independentReviewGateRoutesToTestAgent: independentGateRoutedFollowUp?.targetName === "test-agent"
      && independentGateRoutedFollowUp?.reviewSubject === "web-app"
      && independentGateRoutedFollowUp?.message.includes("独立复核对象：web-app"),
    failedIndependentReviewCreatesImplementationRework: failedReviewReworkFollowUps.length === 1
      && failedReviewReworkFollowUps[0].targetName === "web-app"
      && failedReviewReworkFollowUps[0].rework_kind === "test_agent_failed_review_rework"
      && failedReviewReworkFollowUps[0].reviewFailed === true
      && failedReviewReworkFollowUps[0].message.includes("修复后重新提交")
      && failedReviewReworkFollowUps[0].message.includes("重新运行 TestAgent 复核"),
    failedIndependentReviewRoutesBackToImplementationWorker: failedReviewRoutedFollowUp?.targetName === "web-app"
      && failedReviewRoutedFollowUp?.project === "web-app"
      && failedReviewRoutedFollowUp?.continuationOf === "web-app"
      && failedReviewRoutedFollowUp?.reworkRoute?.strategy === "continue_same_worker"
      && failedReviewRoutedFollowUp?.continuationStrategy === "same_worker_scratchpad",
    failedIndependentReviewDoesNotSpawnVerifierAgain: failedReviewRoutedFollowUp?.targetName !== "test-agent"
      && !failedReviewRoutedFollowUp?.testAgentHandoff
      && !failedReviewRoutedFollowUp?.test_agent_handoff
      && failedReviewRoutedFollowUp?.userTaskPreview.includes("返工 web-app"),
    independentReworkBlocksWithoutVerifier: blockedIndependentFollowUp.dispatchBlocked === true
      && blockedIndependentFollowUp.verifierSelection?.available === false
      && !blockedIndependentFollowUp.message
      && blockedIndependentFollowUp.userTaskPreview.includes("缺少独立验证 Agent"),
    wrongDirectionRequestsStop: wrongDirectionRoute.strategy === "stop_wrong_direction_then_continue" && wrongDirectionRoute.requires_stop === true,
    wrongDirectionContinuationInterruptsOldRun: wrongDirectionContinuation?.interrupt_current_run === true
      && wrongDirectionContinuation.replan_required === true
      && wrongDirectionContinuation.instructions?.some((item: string) => item.includes("旧方向"))
      && wrongDirectionContinuation.avoid?.some((item: string) => item.includes("旧方向"))
      && wrongDirectionContinuation.preserved_context?.some((item: string) => item.includes("终止 1 个进程")),
    routeLabelsAreUserFriendly: [failedRoute, independentRoute, wrongDirectionRoute].every((route: any) => /子 Agent|验证|方向|继续|复核/.test(String(route.user_label || "")) && !/scratchpad|trace_id|session_id|CCM_AGENT_RECEIPT/i.test(String(route.user_label || ""))),
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    routes: { failedRoute, independentRoute, wrongDirectionRoute },
    independent_verifier: { verifierSelection, noVerifierSelection, independentFollowUp, independentGateFollowUps, independentGateRoutedFollowUp, failedReviewReworkFollowUps, failedReviewRoutedFollowUp, blockedIndependentFollowUp },
    staged_review: {
      needsRecheckReviewFollowUps,
      needsRecheckRoutedFollowUp,
      environmentReviewFollowUps,
      environmentRoutedFollowUp,
      scheduledRechecks,
      scheduledRecheckRoutedFollowUp,
      latestReviewWinsGate,
    },
  };
}