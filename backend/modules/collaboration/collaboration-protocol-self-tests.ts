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
  runCoordinatorReworkProtocolSelfTest,
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

export function runCollaborationProtocolSelfTest() {
  const reworkProtocol = runCoordinatorReworkProtocolSelfTest();
  const agentCollaborationProtocol = runAgentCollaborationProtocolSelfTest();
  const startupTaskRecovery = runStartupTaskRecoveryDecisionSelfTest();
  const testAgentRunner = runTestAgentRunnerSelfTest();
  const coordinatorVisibleMessageSelfTest = getCoordinatorVisibleMessageSelfTest();
  const assignmentGroup = {
    members: [
      { project: "coordinator", role: "coordinator" },
      { project: "backend-service" },
      { project: "web-app" },
    ],
  };
  const structuredMentions = getCoordinatorActionMentions({
    content: "我已经形成计划，下面按结构化 assignments 派发。",
    assignments: [
      {
        project: "backend-service",
        task: "主 Agent 工作单：实现退款审核接口 POST /api/refunds/:id/audit，并返回 CCM_AGENT_RECEIPT。",
        reason: "后端负责接口契约",
      },
      {
        project: "web-app",
        task: "主 Agent 工作单：对接退款审核接口并补充页面验证，返回 CCM_AGENT_RECEIPT。",
        reason: "前端负责页面入口",
        dependsOn: "backend-service",
        rework: true,
        attempt: 2,
        continuationOf: "web-app",
        continuationStrategy: "same_worker_scratchpad",
      },
    ],
  }, assignmentGroup, "coordinator");
  const taskDocumentContext = buildTaskSourceDocumentsContext({
    business_goal: "实现订单退款审核功能",
    acceptance_criteria: "后端校验权限，前端展示审核结果，主 Agent 输出交付报告。",
    source_documents: "接口：POST /api/refunds/:id/audit\n字段：approved(boolean), reason(string)\n验收：子 Agent 结果说明和已执行验证。",
  });
  const mergedDocumentContext = mergeCoordinatorDocumentContexts("", taskDocumentContext);
  const taskDocumentChecks = {
    hasBusinessGoal: taskDocumentContext.includes("业务目标"),
    hasAcceptance: taskDocumentContext.includes("验收标准"),
    hasSourceDocument: taskDocumentContext.includes("/api/refunds/:id/audit"),
    mergeKeepsTaskDocument: String(mergedDocumentContext || "").includes("approved(boolean)"),
  };
  const structuredAssignmentChecks = {
    hasTwoMentions: structuredMentions.length === 2,
    preservesTarget: structuredMentions.some((item: any) => item.targetName === "backend-service"),
    preservesTask: structuredMentions.some((item: any) => String(item.message || "").includes("/api/refunds/:id/audit")),
    preservesDependency: structuredMentions.some((item: any) => item.targetName === "web-app" && item.dependsOn === "backend-service"),
    preservesContinuation: structuredMentions.some((item: any) => item.targetName === "web-app" && item.rework === true && item.attempt === 2 && item.continuationStrategy === "same_worker_scratchpad"),
  };
  const executionFixActions = buildAgentExecutionFixActions({
    error: "API Error: Unable to connect to API (ConnectionRefused)",
    agentType: "claudecode",
  });
  const executionFixChecks = {
    hasCliCheck: executionFixActions.some((item: string) => item.includes("claude --permission-mode auto -p") || item.includes("claude --permission-mode acceptEdits -p") || item.includes("claude -p")),
    hasApiNetworkHint: executionFixActions.some((item: string) => item.includes("代理环境变量") || item.includes("API Base URL")),
    hasRetryAction: executionFixActions.some((item: string) => item.includes("复检执行通道") || item.includes("立即恢复自动任务")),
  };
  const recentFailedProbeHealth = getAgentProbeHealth({
    success: false,
    message: "API Error: Unable to connect to API (ConnectionRefused)",
    checked_at: new Date().toISOString(),
    age_ms: 1000,
  });
  const freshOkProbeHealth = getAgentProbeHealth({
    success: true,
    message: "Agent CLI 探针通过",
    checked_at: new Date().toISOString(),
    age_ms: 1000,
  });
  const readyWithoutProbe = {
    ready: true,
    mode: "node-child-process",
    message: "Node 可启动子进程",
    probeHealth: { status: "missing", successFresh: false, message: "尚未运行 Agent CLI 探针" },
  };
  const readyWithFreshProbe = {
    ...readyWithoutProbe,
    probeHealth: freshOkProbeHealth,
    probe: { success: true, age_ms: 1000, target: { group_id: "g-dev", project: "backend-service", agent_type: "claudecode" }, capabilities: { write: { pass: true } } },
  };
  const backendProbeKey = getAgentProbeTargetStatusKey({ group_id: "g-dev", project: "backend-service", agent_type: "claudecode" });
  const webProbeKey = getAgentProbeTargetStatusKey({ group_id: "g-dev", project: "web-app", agent_type: "codex" });
  const targetMatchPartial = doesProbeTargetMatchRequired(
    { group_id: "g-dev", project: "web-app", agent_type: "codex" },
    { groupId: "g-dev", project: "web-app" }
  );
  const groupProbeTargets = [
    { group_id: "g-dev", group_name: "Dev", project: "backend-service", agent_type: "claudecode" },
    { group_id: "g-dev", group_name: "Dev", project: "web-app", agent_type: "codex" },
  ];
  const groupProbeOneMissing = summarizeAgentProbeTargets(groupProbeTargets, (target: any) => {
    if (target.project === "backend-service") return { success: true, age_ms: 1000, target, capabilities: { write: { pass: true } } };
    return null;
  });
  const groupProbeAllFresh = summarizeAgentProbeTargets(groupProbeTargets, (target: any) => ({
    success: true,
    age_ms: 1000,
    target,
    capabilities: { write: { pass: true } },
  }));
  const explicitProjectDoesNotNeedGroupProbe = taskNeedsGroupWideAgentProbe({
    workflow_type: "daily_dev",
    assign_type: "project",
    group_id: "g-dev",
    workflow_meta: { target_member: "backend-service" },
  }) === false;
  const recoveryProbeGroups = buildAgentRecoveryProbeGroups([
    {
      id: "t-blocked-backend",
      auto_execute: true,
      status: "pending",
      last_queue_blocked_at: new Date().toISOString(),
      workflow_type: "daily_dev",
      group_id: "g-dev",
      workflow_meta: { target_member: "backend-service", agent_type: "claudecode" },
    },
    {
      id: "t-runtime-web",
      auto_execute: true,
      status: "failed",
      status_detail: "Agent Runner 错误: ConnectionRefused",
      workflow_type: "daily_dev",
      group_id: "g-dev",
      workflow_meta: { target_member: "web-app", agent_type: "codex" },
    },
  ]);
  const backendRecoveryGroup = recoveryProbeGroups.find((group: any) => group.probe_target?.project === "backend-service");
  const webRecoveryGroup = recoveryProbeGroups.find((group: any) => group.probe_target?.project === "web-app");
  const targetRecoveryMatch = taskMatchesAgentProbeTarget(
    { workflow_type: "daily_dev", group_id: "g-dev", workflow_meta: { target_member: "web-app" } },
    { groupId: "g-dev", project: "web-app" }
  );
  const retryProbeAfterRecentFailure = enforceAgentProbeExecutionReadiness({
    childProcess: { ok: true, stdout: "ok" },
    externalRunner: { active: false },
    probeHealth: recentFailedProbeHealth,
  });
  const runnerProbeFailure = getAgentProbeOutputFailure("[web-app] Agent Runner 错误: API Error: Unable to connect to API (ConnectionRefused)");
  const freshProbeRecoveryGate = hasFreshSuccessfulAgentProbe({ probe: { success: true, age_ms: 1000 } });
  const staleProbeRecoveryGate = hasFreshSuccessfulAgentProbe({ probe: { success: true, age_ms: AGENT_PROBE_SUCCESS_FRESH_MS + 1000 } });
  const dailyDevProbeRequired = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithoutProbe);
  const dailyDevWatchdogGapGate = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithoutProbe);
  const dailyDevProbePassed = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, readyWithFreshProbe);
  const dailyDevProbeTargetMismatch = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev", workflow_meta: { target_member: "web-app" } }, readyWithFreshProbe);
  const generalProbeNotRequired = enforceTaskAgentProbeReadiness({ workflow_type: "general" }, readyWithoutProbe);
  const probeHealthChecks = {
    recentFailureBlocks: recentFailedProbeHealth.failureRecent === true && recentFailedProbeHealth.status === "failed",
    freshSuccessPasses: freshOkProbeHealth.successFresh === true && freshOkProbeHealth.status === "ok",
    probeCanRetryAfterRecentFailure: retryProbeAfterRecentFailure.ready === true && retryProbeAfterRecentFailure.mode === "node-child-process-probe",
    probeFailureKeepsRunnerError: String(runnerProbeFailure.message || "").includes("ConnectionRefused") && String(runnerProbeFailure.error || "").includes("Agent Runner 错误"),
    freshProbeEnablesImmediateRecovery: freshProbeRecoveryGate === true,
    staleProbeDoesNotEnableImmediateRecovery: staleProbeRecoveryGate === false,
    dailyDevRequiresFreshProbe: dailyDevProbeRequired.ready === false && dailyDevProbeRequired.mode === "agent-cli-probe-required",
    dailyDevWatchdogGapsRequireFreshProbe: dailyDevWatchdogGapGate.ready === false && dailyDevWatchdogGapGate.mode === "agent-cli-probe-required",
    dailyDevFreshProbePasses: dailyDevProbePassed.ready === true,
    dailyDevFreshProbeMustMatchTarget: dailyDevProbeTargetMismatch.ready === false && String(dailyDevProbeTargetMismatch.message || "").includes("目标不匹配"),
    groupProbeRequiresAllMembers: groupProbeOneMissing.allReady === false && groupProbeOneMissing.ready === 1 && groupProbeOneMissing.total === 2,
    groupProbeAllMembersPass: groupProbeAllFresh.allReady === true && groupProbeAllFresh.ready === 2,
    explicitProjectBypassesGroupWideProbe: explicitProjectDoesNotNeedGroupProbe === true,
    targetProbeKeysAreIsolated: !!backendProbeKey && !!webProbeKey && backendProbeKey !== webProbeKey,
    targetProbePartialMatchWorks: targetMatchPartial === true,
    recoveryProbeGroupsAreTargeted: recoveryProbeGroups.length === 2 && !!backendRecoveryGroup && !!webRecoveryGroup,
    recoveryProbePayloadKeepsTarget: webRecoveryGroup?.probe_payload?.group_id === "g-dev" && webRecoveryGroup?.probe_payload?.target_member === "web-app",
    recoveryTargetMatchWorks: targetRecoveryMatch === true,
    generalTaskDoesNotRequireProbe: generalProbeNotRequired.ready === true,
  };
  const notifiedOutput = formatCollectedAgentOutput("backend-service", "已实现退款审核接口并运行 npm test。", {
    agent: "backend-service",
    status: "done",
    summary: "完成退款审核接口",
    actions: ["实现 POST /api/refunds/:id/audit"],
    filesChanged: ["src/refunds/audit.ts"],
    verification: ["npm test passed"],
    blockers: [],
    needs: [],
  });
  const missingReceiptOutput = formatCollectedAgentOutput("web-app", "已处理页面入口，但未提交结果说明。", null);
  const notificationFollowUps = buildEvidenceGateFollowUps(assignmentGroup, [missingReceiptOutput]);
  const taskNotificationDisplay = runTaskNotificationDisplaySelfTest();
  const parsedMissingNotification: any = parseTaskNotificationsFromText(missingReceiptOutput)[0] || {};
  const taskNotificationChecks = {
    hasXmlEnvelope: notifiedOutput.includes("<task-notification>") && notifiedOutput.includes("</task-notification>"),
    hasTaskId: getCollectedOutputAgent(notifiedOutput) === "backend-service",
    hasCompletedStatus: extractTaskNotificationTag(notifiedOutput, "status") === "completed",
    detectsMissingReceipt: notificationFollowUps.some((item: any) => item.targetName === "web-app" && String(item.reason || "").includes("缺少结构化结果说明")),
    missingReceiptFollowUpHasUserPreview: notificationFollowUps.some((item: any) => item.targetName === "web-app" && String(item.summary || "").includes("补齐可验收结果说明")),
    missingReceiptSummaryFriendly: String(parsedMissingNotification.summary || "").includes("结构化结果说明"),
    missingReceiptSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|Worker completed|trace_id|session_id/i.test(JSON.stringify({ summary: parsedMissingNotification.summary, result: parsedMissingNotification.result })),
    displaySelfTestPasses: taskNotificationDisplay.pass === true,
  };
  const blockedDependencyOutput = formatCollectedAgentOutput("backend-service", "后端接口字段未确认，无法继续。", {
    agent: "backend-service",
    status: "blocked",
    summary: "接口字段未确认",
    actions: ["检查接口文档"],
    filesChanged: [],
    verification: [],
    blockers: ["approved 字段语义缺失"],
    needs: ["用户或后端确认字段契约"],
  });
  const doneDependencyState = getAgentDependencyStateFromOutputs("backend-service", [notifiedOutput]);
  const blockedDependencyState = getAgentDependencyStateFromOutputs("backend-service", [blockedDependencyOutput]);
  const recoveredDependencyState = getAgentDependencyStateFromOutputs("backend-service", [blockedDependencyOutput, notifiedOutput]);
  const dependencyGateChecks = {
    doneDependencyPasses: doneDependencyState.ok === true,
    blockedDependencyStopsDownstream: blockedDependencyState.ok === false && blockedDependencyState.status === "blocked",
    blockedDependencyExplainsReason: String(blockedDependencyState.reason || "").includes("接口字段未确认"),
    latestRecoveredReceiptUnblocksDownstream: recoveredDependencyState.ok === true && recoveredDependencyState.status === "done",
  };
  const notificationDeliverySummary = buildDeliverySummary({
    title: "通知摘要自测",
    workflow_type: "daily_dev",
    requires_verification: false,
  }, {
    report: notifiedOutput,
    review: { status: "complete", content: "主 Agent 已复盘通知" },
  }, "waiting");
  const notificationDeliveryChecks = {
    summaryHasWorkerNotification: notificationDeliverySummary.worker_notification_count === 1,
    summaryKeepsNotificationTaskId: notificationDeliverySummary.worker_notifications?.[0]?.task_id === "backend-service",
    summaryUsesNotificationAgent: notificationDeliverySummary.agents?.includes("backend-service"),
    userReportHidesNotificationProtocol: !String(notificationDeliverySummary.user_report || "").includes("Worker 通知"),
  };
  const failedNotificationSummary = buildDeliverySummary({
    id: "task-gap",
    title: "通知缺口续跑自测",
    workflow_type: "daily_dev",
    requires_verification: false,
  }, {
    report: formatCollectedAgentOutput("web-app", "页面入口处理失败，缺少接口字段。", {
      agent: "web-app",
      status: "blocked",
      summary: "缺少退款审核接口字段",
      actions: ["检查订单详情页入口"],
      filesChanged: [],
      verification: [],
      blockers: ["approved 字段含义未确认"],
      needs: ["后端确认字段契约"],
    }),
    review: { status: "needs_followup", content: "主 Agent 需要 web-app 继续返工" },
  }, "waiting");
  const gapTask = {
    id: "task-gap",
    title: "退款审核入口",
    workflow_type: "daily_dev",
    status: "in_progress",
    delivery_summary: failedNotificationSummary,
  };
  const gapDraft = buildTaskGapContinuationDraft(gapTask);
  const missingCoordinationTask = {
    id: "task-missing-coordination",
    title: "缺协作证据续跑自测",
    workflow_type: "daily_dev",
    status: "in_progress",
    delivery_summary: {
      status: "waiting",
      detail: "业务开发任务缺少主 Agent 协调计划证据，不能判定完成",
      coordination_plan_count: 0,
      assignment_count: 0,
      worker_notification_count: 0,
      receipt_statuses: [{ agent: "web-app", status: "done", summary: "已完成页面改动" }],
      has_final_review: true,
      actual_file_change_count: 1,
      verification_executed: ["npm test"],
    },
  };
  const missingCoordinationDraft = buildTaskGapContinuationDraft(missingCoordinationTask);
  const gapFingerprint = getTaskGapFingerprint(gapTask);
  const attemptedGapTask = {
    ...gapTask,
    collaboration_state: { gap: { fingerprint: gapFingerprint, items: getTaskGapItems(gapTask), auto_attempts: 1 } },
  };
  const changedGapTask = {
    ...attemptedGapTask,
    delivery_summary: {
      ...failedNotificationSummary,
      blockers: [...(failedNotificationSummary.blockers || []), "新增：支付权限规则需要用户确认"],
    },
  };
  const exhaustedGapState = reconcileTaskCollaborationState(attemptedGapTask, attemptedGapTask.collaboration_state);
  const userTaskCard = buildTaskCardView({ ...attemptedGapTask, collaboration_state: exhaustedGapState }, [], []);
  const continuationGapChecks = {
    workerNotificationTriggersGap: hasDailyDevContinuationGaps(gapTask),
    draftIncludesWorkerNotification: gapDraft.includes("上一轮子 Agent 执行结果") && gapDraft.includes("web-app"),
    draftIncludesSameWorkerStrategy: gapDraft.includes("same_worker_scratchpad") && gapDraft.includes("同一子 Agent 续跑目标"),
    missingCoordinationTriggersGap: hasDailyDevContinuationGaps(missingCoordinationTask),
    draftIncludesCoordinationEvidenceGap: missingCoordinationDraft.includes("需要补齐的主 Agent 协作证据")
      && missingCoordinationDraft.includes("协调计划")
      && missingCoordinationDraft.includes("派发证据")
      && missingCoordinationDraft.includes("子 Agent 执行结果"),
    firstGapCanAutoContinue: canAutoContinueTaskGaps(gapTask) === true,
    unchangedGapDoesNotLoop: canAutoContinueTaskGaps(attemptedGapTask) === false,
    changedGapAllowsNewTargetedAttempt: getTaskGapFingerprint(changedGapTask) !== gapFingerprint && canAutoContinueTaskGaps(changedGapTask) === true,
    exhaustedGapNeedsUserDecision: exhaustedGapState.phase === "needs_user" && exhaustedGapState.needs_user === true,
    automaticContinuationIsInternal: isAutomaticGapContinuationSource("watchdog_gap_rework") && !isAutomaticGapContinuationSource("user"),
    userTaskCardExplainsNextAction: userTaskCard.phase === "needs_user" && userTaskCard.blockers.length > 0 && /补充|确认/.test(String(userTaskCard.next_action)),
    userTaskCardHidesProtocolTerms: !JSON.stringify({ completed: userTaskCard.completed, blockers: userTaskCard.blockers, next_action: userTaskCard.next_action }).includes("CCM_AGENT_RECEIPT"),
  };
  const scratchpadMemory = appendWorkerLedger(createEmptyGroupMemory("selftest"), {
    taskId: "task-refund",
    project: "backend-service",
    status: "completed",
    receiptStatus: "done",
    summary: "后端确认 POST /api/refunds/:id/audit 契约",
    verification: ["npm test passed"],
  });
  const scratchpadContext = buildGroupMemoryContext(scratchpadMemory);
  const scratchpadChecks = {
    storesWorkerLedger: Array.isArray(scratchpadMemory.workerLedger) && scratchpadMemory.workerLedger.length === 1,
    contextIncludesScratchpad: scratchpadContext.includes("Worker scratchpad"),
    contextIncludesWorkerSummary: scratchpadContext.includes("/api/refunds/:id/audit"),
  };
  const qaRequiredTask = { workflow_type: "daily_dev", assign_type: "group", description: "前端必须通过 ask_agent 向后端询问接口后续跑" };
  const qaGateCheck = buildAcceptanceGate(qaRequiredTask, null, {
    coordination_plan_count: 1,
    assignment_count: 2,
    receipt_statuses: [{ status: "done" }],
    has_final_review: true,
    actual_file_change_count: 1,
    verification_executed: ["npm test"],
    verification_required_gate_passed: true,
    verification_source_gate_passed: true,
    external_runner_verification_count: 1,
    blockers: [],
    needs: [],
    agent_qa_count: 0,
    agent_qa_accepted_count: 0,
    agent_qa_resumed_count: 0,
    agent_qa_gate_passed: false,
    project_policy_gate_passed: true,
  }, "waiting");
  const agentQaRequirementChecks = {
    infersExplicitAskAgentRequirement: taskRequiresAgentQa(qaRequiredTask),
    explicitFalseDisablesRequirement: taskRequiresAgentQa({ ...qaRequiredTask, requires_agent_qa: false }) === false,
    missingQaBlocksAcceptance: qaGateCheck.checks.find((item: any) => item.id === "agent_qa")?.ok === false && qaGateCheck.pass === false,
  };
  const defaultCodeRequirements = normalizeGlobalMissionTargetRequirements({}, {});
  const explicitNonCodeRequirements = normalizeGlobalMissionTargetRequirements({
    requires_code_changes: false,
    requires_verification: false,
    requires_independent_review: false,
  }, {});
  const targetOverrideRequirements = normalizeGlobalMissionTargetRequirements({
    requires_code_changes: false,
    requires_independent_review: false,
  }, {
    requiresCodeChanges: true,
    requiresIndependentReview: true,
  });
  const globalMissionRequirementChecks = {
    codeTaskDefaultsToIndependentReview: defaultCodeRequirements.requires_code_changes === true
      && defaultCodeRequirements.requires_verification === true
      && defaultCodeRequirements.requires_independent_review === true,
    explicitNonCodeTaskCanDisableReview: explicitNonCodeRequirements.requires_code_changes === false
      && explicitNonCodeRequirements.requires_verification === false
      && explicitNonCodeRequirements.requires_independent_review === false,
    targetRequirementOverridesMissionDefault: targetOverrideRequirements.requires_code_changes === true
      && targetOverrideRequirements.requires_independent_review === true,
  };
  return {
    pass: reworkProtocol.pass
      && agentCollaborationProtocol.pass
      && startupTaskRecovery.pass
      && testAgentRunner.pass
      && Object.values(taskDocumentChecks).every(Boolean)
      && Object.values(structuredAssignmentChecks).every(Boolean)
      && Object.values(executionFixChecks).every(Boolean)
      && Object.values(probeHealthChecks).every(Boolean)
      && Object.values(taskNotificationChecks).every(Boolean)
      && Object.values(dependencyGateChecks).every(Boolean)
      && Object.values(notificationDeliveryChecks).every(Boolean)
      && Object.values(continuationGapChecks).every(Boolean)
      && Object.values(scratchpadChecks).every(Boolean)
      && coordinatorVisibleMessageSelfTest.pass
      && Object.values(agentQaRequirementChecks).every(Boolean)
      && Object.values(globalMissionRequirementChecks).every(Boolean),
    reworkProtocol,
    agentCollaborationProtocol,
    startupTaskRecovery,
    testAgentRunner,
    taskDocumentContextPreview: taskDocumentContext.slice(0, 600),
    taskDocumentChecks,
    structuredAssignmentChecks,
    executionFixChecks,
    executionFixActions,
    probeHealthChecks,
    taskNotificationChecks,
    taskNotificationDisplay,
    dependencyGateChecks,
    notificationDeliveryChecks,
    continuationGapChecks,
    scratchpadChecks,
    coordinatorVisibleMessageSelfTest,
    agentQaRequirementChecks,
    globalMissionRequirementChecks,
  };
}