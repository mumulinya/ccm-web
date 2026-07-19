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
import {
  buildCoordinationSelfTestFakeNativeReport,
  buildCoordinationSelfTestFakeFailedNativeReport,
  buildCoordinationSelfTestFakeNeedsRecheckReport,
  buildCoordinationSelfTestChecks
} from "./collaboration-coordination-self-tests-fixtures";


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
  const fakeNativeReport: any = buildCoordinationSelfTestFakeNativeReport({ fakeVerdictPath, independentHandoff });
  const nativeTestAgentReceipt = buildNativeTestAgentReceipt("test-agent", fakeNativeReport, independentHandoff, independentHandoff);
  const nativeTestAgentReviewSummary = buildNativeTestAgentReviewSummary("test-agent", fakeNativeReport, nativeTestAgentReceipt);
  const nativeTestAgentOutput = formatNativeTestAgentOutput("test-agent", fakeNativeReport, nativeTestAgentReceipt, independentHandoff);
  const nativeTestAgentVisibleOutput = nativeTestAgentOutput.split("CCM_AGENT_RECEIPT")[0] || "";
  const fakeFailedNativeReport: any = buildCoordinationSelfTestFakeFailedNativeReport({ fakeFailedVerdictPath, fakeNativeReport });
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
  const fakeNeedsRecheckReport: any = buildCoordinationSelfTestFakeNeedsRecheckReport({ fakeNativeReport });
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
      browserResults: [{
        name: "登录恢复",
        status: "blocked",
        error: 'Browser action fill requires environment variable "TEST_EMAIL", but it is not defined.',
        authentication: { credentialEnvNames: ["TEST_EMAIL", "TEST_PASSWORD"] },
        steps: [],
        screenshots: [],
      }],
      verdict: {
        status: "partial",
        recommendation: "need_human",
        canAccept: false,
        needsRework: false,
        needsHuman: true,
        needsRecheck: false,
        needsEnvironment: true,
        reviewRoute: "environment",
        browserAuthenticationSummary: { blockedChecks: 1, pendingChecks: 0, configuredChecks: 1, passedChecks: 0, failedChecks: 0 },
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
  const checks = buildCoordinationSelfTestChecks({ blockedAuthenticationReceipt, blockedAuthenticationReviewSummary, blockedIndependentFollowUp, commandOnlyAcceptanceCriteria, commandOnlyCompletedTasks, commandOnlyHandoff, commandOnlyVerificationCommands, environmentReviewFollowUps, environmentRoutedFollowUp, failedAuthenticationReceipt, failedAuthenticationReviewSummary, failedNativeTestAgentOutput, failedNativeTestAgentReceipt, failedNativeTestAgentReviewSummary, failedNativeTestAgentVisibleOutput, failedReviewReworkFollowUps, failedReviewRoutedFollowUp, failedRoute, failedTableEvidenceSummary, hardRouteFilteredLlmFollowUps, independentFollowUp, independentGateFollowUps, independentGateRoutedFollowUp, independentHandoff, independentHandoffAcceptance, independentHandoffProject, independentHandoffReviewInstructions, independentRoute, latestReviewWinsGate, nativePlanBlockedOutput, nativePlanBlockedReceipt, nativePlanSummary, nativeTestAgentOutput, nativeTestAgentReceipt, nativeTestAgentReviewSummary, nativeTestAgentRuntimeContext, nativeTestAgentVisibleOutput, nativeVerifierSelection, needsRecheckReceipt, needsRecheckReviewFollowUps, needsRecheckReviewSummary, needsRecheckRoutedFollowUp, needsRecheckVisibleOutput, noVerifierSelection, notVerifiedCoverageTestAgentReceipt, notVerifiedCoverageTestAgentVisibleOutput, postReviewSpotCheckContract, postReviewSpotCheckRoutedFollowUp, scheduledRecheckRoutedFollowUp, scheduledRechecks, structuredTestAgentEvidenceFollowUps, task, unknownCoverageTestAgentReceipt, unknownCoverageTestAgentVisibleOutput, verifierSelection, wrongDirectionContinuation, wrongDirectionRoute });
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
