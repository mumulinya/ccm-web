// Behavior-freeze split from collaboration-runtime-daily-dev.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 3/9).
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
  getTaskById,
  runtimeToolSnapshotFromAudit,
  updateGroupMessageAssignmentStatus,
} from "./collaboration-runtime-task-queue";

import {
  buildDeliverySummary,
  buildIndependentReviewGate,
  changeLooksHighRiskForIndependentReview,
  collectTaskActualFileChanges,
  collectTaskAssignmentEvidence,
  getGroupTaskExecutionStatus,
  getReadyDailyDevMembers,
  getVerificationEvidenceGate,
  independentReviewVerdictState,
  isAdvisoryNeed,
  parseFormattedReceiptsFromText,
  receiptHasOpenNeeds,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  getTestAgentHandoffReviewSubject,
  isCoordinatorTestAgentName,
} from "./collaboration-runtime-cross-agent-runtime";

import {
  runCoordinatorReworkProtocolSelfTest,
} from "./collaboration-runtime-test-agent-handoff";

import {
  enqueueTask,
  getQueueStatus,
} from "./collaboration-runtime-coordinator-review";

import {
  CollabCtx,
  buildAgentExecutionFixActions,
  buildAgentToolContext,
  buildTaskSourceDocumentsContext,
  getAgentExecutionReadiness,
  getAgentProbeExecutionReadiness,
  getAgentProbeOutputFailure,
  getTaskAgentExecutionReadiness,
  writeAgentProbeStatus,
} from "./collaboration-runtime-plan-tools";

import {
  canCompleteDailyDevFromDeliverySummary,
  compactFormText,
  createTask,
  getConfiguredProjectVerificationCommands,
  prepareAgentRuntimeTools,
  runtimeToolDispatchBlockedMessage,
  updateTask,
} from "./collaboration-runtime-runtime-tools";

export function getDailyDevCompletionGateSelfTest() {
  const task = { workflow_type: "daily_dev", title: "self-test", requires_code_changes: true };
  const taskWithActualChanges = {
    ...task,
    file_changes: {
      files: [{ path: "src/App.vue", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 0 } }],
      count: 1,
    },
  };
  const coordinatorResult = { agent: "coordinator", assignments: [], dispatchPolicy: {} };
  const plannedCoordinatorResult = {
    agent: "coordinator",
    assignments: [{ project: "frontend", task: "修改页面并提交结果说明" }],
    coordinationPlan: {
      strategy: "research_synthesis_implementation_verification",
      phases: ["理解需求", "分配任务", "协同执行", "复盘验收"],
      targets: ["frontend"],
    },
    dispatchPolicy: {},
  };
  const doneReceipt = {
    agent: "frontend",
    status: "done",
    summary: "完成测试改动",
    actions: ["修改页面"],
    filesChanged: ["src/App.vue"],
    verification: ["npm test"],
    blockers: [],
    needs: [],
  };
  const doneReceiptText = [
    "完成了页面改动",
    "",
    "结构化回执：",
    "- 状态：done",
    "- 摘要：完成测试改动",
    "- 动作：修改页面",
    "- 文件：src/App.vue",
    "- 验证：npm test",
    "- 阻塞：无",
    "- 需要补充：无",
  ].join("\n");
  const doneWorkerOutput = formatCollectedAgentOutput("frontend", doneReceiptText, doneReceipt);
  const staleAckThenDoneReceipts = parseFormattedReceiptsFromText([
    formatCollectedAgentOutput("frontend", "ACK 完成，等待进入实现阶段", {
      ...doneReceipt,
      status: "needs_info",
      summary: "ACK-only 前置确认完成，等待进入实现阶段",
      filesChanged: [],
      verification: [],
    }),
    doneWorkerOutput,
  ].join("\n"));
  const latestDoneReceiptSupersedesStaleAck = staleAckThenDoneReceipts.length === 1
    && staleAckThenDoneReceipts[0]?.agent === "frontend"
    && staleAckThenDoneReceipts[0]?.status === "done";
  const embeddedFenceReceipt = {
    ...doneReceipt,
    agent: "test-agent",
    postReviewSpotCheck: { required: true, pass: true, status: "passed" },
    testAgentHandoff: {
      metadata: {
        coordinatorOutputPreview: "技术上下文包含协议字样 CCM_AGENT_RECEIPT 和围栏：```ts\nexport const sample = true\n```",
      },
    },
  };
  const embeddedFenceReceiptOutput = formatCollectedAgentOutput("test-agent", [
    "TestAgent 已通过，主 Agent 抽查也已通过。",
    "CCM_AGENT_RECEIPT",
    "```json",
    JSON.stringify(embeddedFenceReceipt, null, 2),
    "```",
  ].join("\n"), embeddedFenceReceipt);
  const parsedEmbeddedFenceReceipt = parseFormattedReceiptsFromText(embeddedFenceReceiptOutput)[0] || null;
  const embeddedMarkdownFenceDoesNotTruncateReceipt = parsedEmbeddedFenceReceipt?.postReviewSpotCheck?.pass === true;
  const noChild = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    coordinatorResult,
    "主 Agent 自己说已经完成",
    task
  );
  const withChild = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    coordinatorResult,
    [
      "【frontend】",
      "完成了页面改动",
      "",
      "结构化回执：",
      "- 状态：done",
      "- 摘要：完成测试改动",
      "- 动作：修改页面",
      "- 文件：src/App.vue",
      "- 验证：npm test",
      "- 阻塞：无",
      "- 需要补充：无",
    ].join("\n"),
    task
  );
  const withFailedChild = getGroupTaskExecutionStatus(
    { status: "needs_user", content: "主 Agent 复盘发现子 Agent 运行失败" },
    coordinatorResult,
    [
      "【frontend】",
      "执行失败",
      "",
      "结构化回执：",
      "- 状态：failed",
      "- 摘要：spawn EPERM",
      "- 动作：未填写",
      "- 文件：无",
      "- 验证：未提供",
      "- 阻塞：spawn EPERM",
      "- 需要补充：检查运行环境",
    ].join("\n"),
    task
  );
  const withActualChange = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    plannedCoordinatorResult,
    doneWorkerOutput,
    taskWithActualChanges
  );
  const withActualChangeNoCoordinationEvidence = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    coordinatorResult,
    doneWorkerOutput,
    taskWithActualChanges
  );
  const waitingExecutionWithCompleteEvidence = { ...withActualChange, status: "waiting", detail: "" };
  const waitingSummaryWithCompleteEvidence = buildDeliverySummary(taskWithActualChanges, waitingExecutionWithCompleteEvidence, "waiting");
  const waitingEvidencePromotesToDone = canCompleteDailyDevFromDeliverySummary(taskWithActualChanges, waitingExecutionWithCompleteEvidence, waitingSummaryWithCompleteEvidence);
  const blockedVerificationReceipt = { ...doneReceipt, verification: ["mvn test -B -q → 仍需交互审批，命令被沙箱拦截"], blockers: ["mvn test 被沙箱拦截"], needs: ["用户本地补充 mvn test 输出"] };
  const optionalRecommendationDoesNotBlock = !receiptHasOpenNeeds({ ...doneReceipt, blockers: [], needs: ["建议用户 npm start 后人工确认页面样式"] });
  const coordinatorOwnedReviewFollowUpDoesNotBlock = !receiptHasOpenNeeds({
    ...doneReceipt,
    blockers: [],
    needs: [
      "等待主 Agent 安排 TestAgent 独立复核",
      "等待主 Agent 最终抽查并总结",
      "主 Agent 最终抽查",
      "TestAgent 独立复核",
      "请 @coordinator 安排 TestAgent 独立复核，或主 Agent 直接抽查验收",
      "等待 TestAgent 独立复核",
      "需要主 Agent 抽查后总结",
      "等待主 Agent 逐项验收修改证据和验证结果；主 Agent 后续可安排独立复核",
      "主 Agent 调用 TestAgent 重新执行独立复核，确认 CCM_TEST_AGENT_REVIEW=1 路径通过",
    ],
  });
  const blockedVerificationOutput = formatCollectedAgentOutput("frontend", "验证被沙箱拦截", blockedVerificationReceipt);
  const blockedVerificationGate = getVerificationEvidenceGate([blockedVerificationReceipt]);
  const zeroFailureVerificationGate = getVerificationEvidenceGate([{ verification: ["npm test — 11/11 通过，0 failed（exit code 0）"] }]);
  const withDoneReceiptButOpenNeeds = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    plannedCoordinatorResult,
    blockedVerificationOutput,
    taskWithActualChanges
  );
  const blockedSummary = buildDeliverySummary(taskWithActualChanges, withDoneReceiptButOpenNeeds, "waiting");
  const blockedEvidenceDoesNotPromote = !canCompleteDailyDevFromDeliverySummary(taskWithActualChanges, withDoneReceiptButOpenNeeds, blockedSummary);
  const withActualChangeNoExecutedVerification = getGroupTaskExecutionStatus(
    { status: "complete", content: "主 Agent 复盘完成" },
    plannedCoordinatorResult,
    formatCollectedAgentOutput("frontend", [
      "完成了页面改动",
      "",
      "结构化回执：",
      "- 状态：done",
      "- 摘要：完成测试改动",
      "- 动作：修改页面",
      "- 文件：src/App.vue",
      "- 验证：建议运行 npm test",
      "- 阻塞：无",
      "- 需要补充：无",
    ].join("\n"), {
      ...doneReceipt,
      verification: ["建议运行 npm test"],
    }),
    taskWithActualChanges
  );
  const runnerMergedReceipt = extractAgentReceipt([
    "```json",
    "{\"ccm_receipt\":true,\"status\":\"done\",\"summary\":\"完成测试改动\",\"actions\":[\"修改页面\"],\"filesChanged\":[\"src/App.vue\"],\"verification\":[\"等待外部 runner 验证\"],\"blockers\":[],\"needs\":[]}",
    "```",
    "CCM_RUNNER_VERIFICATION",
    "```json",
    "{\"ccm_runner_verification\":true,\"status\":\"passed\",\"verification\":[\"npm run check passed by external runner (exit 0)\",\"npm run build passed by external runner (exit 0)\"],\"failed\":[]}",
    "```",
  ].join("\n"), "frontend");
  const runnerVerificationMerged = !!runnerMergedReceipt
    && runnerMergedReceipt.verification.includes("npm run check passed by external runner (exit 0)")
    && runnerMergedReceipt.verification.includes("npm run build passed by external runner (exit 0)");
  return {
    noChildReceiptStatus: noChild.status,
    noChildReceiptDetail: noChild.detail,
    withChildReceiptStatus: withChild.status,
    withChildReceiptDetail: withChild.detail,
    withFailedChildStatus: withFailedChild.status,
    withFailedChildDetail: withFailedChild.detail,
    withActualChangeStatus: withActualChange.status,
    withActualChangeNoCoordinationEvidenceStatus: withActualChangeNoCoordinationEvidence.status,
    withActualChangeNoCoordinationEvidenceDetail: withActualChangeNoCoordinationEvidence.detail,
    waitingEvidencePromotesToDone,
    blockedVerificationFailsGate: blockedVerificationGate.pass === false && blockedVerificationGate.failed.length > 0,
    zeroFailuresCountAsPass: zeroFailureVerificationGate.pass === true && zeroFailureVerificationGate.failed.length === 0,
    optionalRecommendationDoesNotBlock,
    coordinatorOwnedReviewFollowUpDoesNotBlock,
    latestDoneReceiptSupersedesStaleAck,
    embeddedMarkdownFenceDoesNotTruncateReceipt,
    doneReceiptWithOpenNeedsStatus: withDoneReceiptButOpenNeeds.status,
    blockedEvidenceDoesNotPromote,
    withActualChangeNoExecutedVerificationStatus: withActualChangeNoExecutedVerification.status,
    withActualChangeNoExecutedVerificationDetail: withActualChangeNoExecutedVerification.detail,
    runnerVerificationMerged,
    pass: noChild.status === "waiting"
      && withChild.status === "waiting"
      && withFailedChild.status === "failed"
      && withActualChange.status === "done"
      && waitingEvidencePromotesToDone
      && blockedVerificationGate.pass === false
      && zeroFailureVerificationGate.pass === true
      && optionalRecommendationDoesNotBlock
      && coordinatorOwnedReviewFollowUpDoesNotBlock
      && latestDoneReceiptSupersedesStaleAck
      && embeddedMarkdownFenceDoesNotTruncateReceipt
      && withDoneReceiptButOpenNeeds.status === "waiting"
      && blockedEvidenceDoesNotPromote
      && withActualChangeNoCoordinationEvidence.status === "waiting"
      && withActualChangeNoExecutedVerification.status === "waiting"
      && runnerVerificationMerged,
  };
}

export function runMemoryDispatchGateReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runMemoryDispatchGateReceiptValidationSelfTest();
}

export function runPressureMemoryProvenanceReceiptUsageSelfTest() {
  return require("./collaboration-receipt-self-tests").runPressureMemoryProvenanceReceiptUsageSelfTest();
}

export function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest();
}

export function runGlobalMemoryUsageReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runGlobalMemoryUsageReceiptValidationSelfTest();
}

export function runGlobalMemoryHealthGateReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runGlobalMemoryHealthGateReceiptValidationSelfTest();
}

export function runReadPlanRevalidationGateReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runReadPlanRevalidationGateReceiptValidationSelfTest();
}

export function runApiMicrocompactReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runApiMicrocompactReceiptValidationSelfTest();
}

export function runPostCompactReinjectionGateReceiptValidationSelfTest() {
  return require("./collaboration-receipt-self-tests").runPostCompactReinjectionGateReceiptValidationSelfTest();
}

export function runPostCompactDispatchMarkerVisibleSelfTest() {
  return require("./collaboration-receipt-self-tests").runPostCompactDispatchMarkerVisibleSelfTest();
}

export function buildDailyDevWorkflowRehearsal(payload: any = {}) {
  const groups = loadGroups();
  const configs = getConfigs();
  const groupId = payload.group_id || payload.groupId || groups[0]?.id || "";
  const group = groups.find((item: any) => item.id === groupId) || groups[0] || null;
  const { normalizedGroup, coordinator, routableMembers, readyMembers } = getReadyDailyDevMembers(group, configs);

  const selectedMember = readyMembers[0] || routableMembers[0] || { project: "demo-agent" };
  const verificationCommands = getConfiguredProjectVerificationCommands(selectedMember.project);
  const verificationText = verificationCommands[0] || "npm run check";
  const businessGoal = compactFormText(payload.business_goal || payload.businessGoal || "演练：给设置页增加一个业务开发闭环状态提示", "演练：给设置页增加一个业务开发闭环状态提示");
  const description = buildDailyDevTaskDescription({
    business_goal: businessGoal,
    scope: payload.scope || "由主 Agent 拆给一个子 Agent，子 Agent 返回结构化结果说明，主 Agent 完成复盘。",
    documents: payload.documents || "演练不读取真实业务文档，仅验证任务模板和完成门禁。",
    acceptance: payload.acceptance || "必须有子 Agent 结果说明、主 Agent 复盘、实际文件变更证据和交付摘要。",
    constraints: payload.constraints || "不创建真实任务，不修改业务仓库。",
    requires_code_changes: true,
  });
  const rehearsalReceipt = {
    agent: selectedMember.project,
    status: "done",
    summary: "完成演练改动",
    actions: ["修改演练文件"],
    filesChanged: ["src/daily-dev-rehearsal.ts"],
    verification: [verificationText],
    blockers: [],
    needs: [],
  };
  const receiptText = [
    `【${selectedMember.project}】`,
    "已完成演练改动。",
    "",
    "结构化回执：",
    "- 状态：done",
    "- 摘要：完成演练改动",
    "- 动作：修改演练文件",
    "- 文件：src/daily-dev-rehearsal.ts",
    `- 验证：${verificationText}`,
    "- 阻塞：无",
    "- 需要补充：无",
  ].join("\n");
  const workerNotificationOutput = formatCollectedAgentOutput(selectedMember.project, receiptText, rehearsalReceipt);
  const rehearsalMemory = appendWorkerLedger(createEmptyGroupMemory("daily-dev-rehearsal"), {
    taskId: "daily-dev-rehearsal",
    project: selectedMember.project,
    status: "completed",
    receiptStatus: "done",
    summary: rehearsalReceipt.summary,
    filesChanged: rehearsalReceipt.filesChanged,
    verification: rehearsalReceipt.verification,
    blockers: [],
    needs: [],
  });
  const rehearsalScratchpadContext = buildGroupMemoryContext(rehearsalMemory);
  const review = { status: "complete", content: "主 Agent 复盘完成，演练满足验收证据。" };
  const coordinatorResult = {
    agent: coordinator.project,
    assignments: [{ project: selectedMember.project, task: "执行演练改动" }],
    coordinationPlan: {
      mode: "cc-style-coordinator",
      strategy: "research_synthesis_implementation_verification",
      executionOrder: "parallel",
      phases: ["理解需求", "研究与综合", "分配任务", "协同执行", "复盘验收"],
      targets: [selectedMember.project],
      missingInfo: [],
    },
    dispatchPolicy: {},
    runtime: "rehearsal",
  };
  const baseTask = {
    id: "daily-dev-rehearsal",
    title: businessGoal,
    description,
    group_id: normalizedGroup?.id || "",
    workflow_type: "daily_dev",
    requires_code_changes: true,
    requires_verification: true,
    business_goal: businessGoal,
    acceptance_criteria: "演练验收：必须记录主 Agent 计划、返工证据和已执行验证。",
    source_documents: "接口：POST /api/rehearsal/check\n字段：enabled(boolean), message(string)\n验收：报告展示主 Agent 计划和返工证据。",
  };
  const taskDocumentContext = buildTaskSourceDocumentsContext(baseTask);
  const noChangeExecution = getGroupTaskExecutionStatus(review, coordinatorResult, workerNotificationOutput, baseTask);
  const taskWithChanges = {
    ...baseTask,
    file_changes: {
      files: [{
        path: "src/daily-dev-rehearsal.ts",
        statusText: "修改",
        statusKind: "modified",
        diff: { additions: 3, deletions: 1 },
      }],
      count: 1,
    },
  };
  const doneExecution = getGroupTaskExecutionStatus(review, coordinatorResult, workerNotificationOutput, taskWithChanges);
  const propagatedAssignmentSummary = buildDeliverySummary(
    taskWithChanges,
    doneExecution,
    doneExecution.status === "done" ? "done" : "waiting"
  );
  const deliverySummary = buildDeliverySummary(taskWithChanges, {
    ...doneExecution,
    assignments: [...(doneExecution.assignments || []), {
      project: selectedMember.project,
      task: "主 Agent 返工工作单：补齐演练验证证据",
      reason: "演练模拟：首次回执缺少验证证据",
      rework: true,
      attempt: 2,
      continuationOf: selectedMember.project,
      continuationStrategy: "same_worker_scratchpad",
    }],
  }, doneExecution.status === "done" ? "done" : "waiting");
  const coordinatorProtocol = runCoordinatorProtocolSelfTest();
  const reworkProtocol = runCoordinatorReworkProtocolSelfTest();
  const notificationPass = workerNotificationOutput.includes("<task-notification>")
    && extractTaskNotificationTag(workerNotificationOutput, "task-id") === selectedMember.project
    && extractTaskNotificationTag(workerNotificationOutput, "status") === "completed";
  const scratchpadPass = rehearsalScratchpadContext.includes("Worker scratchpad")
    && rehearsalScratchpadContext.includes("完成演练改动")
    && rehearsalScratchpadContext.includes(verificationText);
  const pass = !!normalizedGroup
    && readyMembers.length > 0
    && coordinatorProtocol.pass
    && reworkProtocol.pass
    && notificationPass
    && scratchpadPass
    && taskDocumentContext.includes("/api/rehearsal/check")
    && noChangeExecution.status === "waiting"
    && doneExecution.status === "done"
    && (doneExecution.assignments || []).length > 0
    && propagatedAssignmentSummary.assignment_count > 0
    && deliverySummary.actual_file_change_count > 0
    && deliverySummary.has_final_review
    && deliverySummary.assignment_count > 0
    && deliverySummary.continuation_count > 0
    && deliverySummary.rework_count > 0
    && deliverySummary.verification_gate_passed;

  return {
    success: true,
    pass,
    status: pass ? "ok" : "fail",
    generated_at: new Date().toISOString(),
    group: normalizedGroup ? {
      id: normalizedGroup.id,
      name: normalizedGroup.name || normalizedGroup.id,
      coordinator: coordinator.project,
      readyMemberCount: readyMembers.length,
      selectedMember: selectedMember.project,
    } : null,
    steps: [
      { id: "business-description", status: businessGoal ? "ok" : "fail", message: "业务描述已生成主 Agent 工作单" },
      { id: "task-document-context", status: taskDocumentContext.includes("/api/rehearsal/check") ? "ok" : "fail", message: taskDocumentContext.includes("/api/rehearsal/check") ? "任务表单里的业务/接口文档会进入主 Agent 文档上下文" : "任务级文档未进入主 Agent 文档上下文" },
      { id: "coordinator-protocol", status: coordinatorProtocol.pass ? "ok" : "fail", message: coordinatorProtocol.pass ? `主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 生成 ${coordinatorProtocol.assignmentCount} 个自包含子任务` : "主 Agent 协调协议自测失败" },
      { id: "coordinator-rework-protocol", status: reworkProtocol.pass ? "ok" : "fail", message: reworkProtocol.pass ? "主 Agent 验收发现缺口时会生成自包含返工工作单" : "主 Agent 返工协议自测失败" },
      { id: "worker-notification", status: notificationPass ? "ok" : "fail", message: notificationPass ? "子 Agent 演练输出已封装为 task-notification 并可被主 Agent 识别" : "子 Agent 演练输出未形成有效 task-notification" },
      { id: "worker-scratchpad", status: scratchpadPass ? "ok" : "fail", message: scratchpadPass ? "Worker 通知已写入协作 scratchpad，可进入后续上下文" : "Worker 通知未进入协作 scratchpad 上下文" },
      { id: "group-ready", status: normalizedGroup && readyMembers.length > 0 ? "ok" : "fail", message: normalizedGroup ? `可用子 Agent ${readyMembers.length} 个` : "没有可用开发群聊" },
      { id: "receipt-gate", status: noChangeExecution.status === "waiting" ? "ok" : "fail", message: "只有子 Agent 结果说明但没有实际变更时不会误判完成" },
      { id: "file-change-gate", status: doneExecution.status === "done" ? "ok" : "fail", message: "补齐实际文件变更证据后允许完成" },
      { id: "execution-assignment-propagation", status: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "ok" : "fail", message: (doneExecution.assignments || []).length > 0 && propagatedAssignmentSummary.assignment_count > 0 ? "执行结果会携带主 Agent 派发证据，交付摘要可直接验收" : "执行结果缺少主 Agent 派发证据" },
      { id: "assignment-evidence", status: deliverySummary.assignment_count > 0 ? "ok" : "fail", message: deliverySummary.assignment_count > 0 ? `交付摘要捕获 ${deliverySummary.assignment_count} 条主 Agent 派发证据` : "交付摘要未捕获主 Agent 派发证据" },
      { id: "continuation-evidence", status: deliverySummary.continuation_count > 0 ? "ok" : "fail", message: deliverySummary.continuation_count > 0 ? `交付摘要捕获 ${deliverySummary.continuation_count} 条续跑证据` : "交付摘要未捕获续跑证据" },
      { id: "rework-evidence", status: deliverySummary.rework_count > 0 ? "ok" : "fail", message: deliverySummary.rework_count > 0 ? `交付摘要捕获 ${deliverySummary.rework_count} 条返工证据` : "交付摘要未捕获主 Agent 返工证据" },
      { id: "verification-gate", status: deliverySummary.verification_gate_passed ? "ok" : "fail", message: "已执行验证记录会进入交付摘要并作为完成门禁" },
      { id: "delivery-summary", status: deliverySummary.actual_file_change_count > 0 ? "ok" : "fail", message: `交付摘要捕获 ${deliverySummary.actual_file_change_count} 个实际文件变更` },
    ],
    task_description: description,
    task_document_context: taskDocumentContext,
    no_change_result: { status: noChangeExecution.status, detail: noChangeExecution.detail },
    done_result: { status: doneExecution.status, detail: doneExecution.detail },
    propagated_assignment_summary: {
      assignment_count: propagatedAssignmentSummary.assignment_count,
      assignments: propagatedAssignmentSummary.assignment_evidence,
    },
    worker_notification: {
      status: extractTaskNotificationTag(workerNotificationOutput, "status"),
      task_id: extractTaskNotificationTag(workerNotificationOutput, "task-id"),
      receipt_status: extractTaskNotificationTag(workerNotificationOutput, "receipt-status"),
    },
    scratchpad_context: rehearsalScratchpadContext,
    coordinator_protocol: coordinatorProtocol,
    rework_protocol: reworkProtocol,
    delivery_summary: deliverySummary,
  };
}

function normalizeSmokeFilePath(value: any) {
  const raw = String(value || "ccm-daily-dev-smoke.md").trim().replace(/\\/g, "/");
  const file = raw || "ccm-daily-dev-smoke.md";
  if (path.isAbsolute(file) || file.startsWith("~/") || file.includes("\0")) {
    throw new Error("试运行文件必须是项目内相对路径");
  }
  const segments = file.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some(segment => segment === "." || segment === "..")) {
    throw new Error("试运行文件路径不能包含 . 或 ..");
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(file)) {
    throw new Error("试运行文件路径只能包含字母、数字、点、下划线、短横线和斜杠");
  }
  return file;
}

export function selectDailyDevSmokeTarget(payload: any = {}) {
  const groups = loadGroups();
  const configs = getConfigs();
  const groupId = payload.group_id || payload.groupId || "";
  const candidates = groupId
    ? groups.filter((group: any) => group.id === groupId)
    : groups;

  for (const group of candidates) {
    const readiness = getReadyDailyDevMembers(group, configs);
    if (readiness.normalizedGroup && readiness.readyMembers.length > 0) {
      const requestedMember = payload.target_member || payload.targetMember || "";
      const selectedMember = readiness.readyMembers.find((member: any) => member.project === requestedMember)
        || readiness.readyMembers[0];
      return {
        group: readiness.normalizedGroup,
        coordinator: readiness.coordinator,
        selectedMember,
        readyMembers: readiness.readyMembers,
      };
    }
  }

  if (groupId) throw new Error("所选开发群聊没有可写工作目录的子 Agent");
  throw new Error("没有可用于真实试运行的开发群聊，请先配置群聊和可写的项目子 Agent");
}

export function createDailyDevSmokeTask(payload: any, ctx: CollabCtx) {
  const smokeFile = normalizeSmokeFilePath(payload.smoke_file || payload.smokeFile);
  const target = selectDailyDevSmokeTarget(payload);
  const selectedProject = target.selectedMember.project;
  const groupName = target.group.name || target.group.id;
  const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
  const businessGoal = compactFormText(
    payload.business_goal || payload.businessGoal,
    `真实试运行：验证主 Agent 能派发 ${selectedProject} 子 Agent 完成可验收文件修改`
  );
  const description = buildDailyDevTaskDescription({
    business_goal: businessGoal,
    scope: [
      `主 Agent 必须把本任务派发给 @${selectedProject}。`,
      `${selectedProject} 子 Agent 只允许在自己的项目工作目录内新增或更新 ${smokeFile}。`,
      "文件内容写入本次试运行时间、群聊名称、目标 Agent、执行摘要和验证命令。",
      "不修改业务源码、依赖配置或其他无关文件。"
    ].join("\n"),
    documents: [
      "这是真实日常开发闭环 smoke 任务，用来验证：业务描述 -> 主 Agent 拆分 -> 子 Agent 改文件 -> 回执 -> 主 Agent 复盘 -> 系统捕获实际变更。",
      `目标群聊：${groupName}`,
      `目标子 Agent：${selectedProject}`,
      `目标文件：${smokeFile}`
    ].join("\n"),
    acceptance: [
      `主 Agent 需要明确派发给 @${selectedProject}，不能只给方案。`,
      `${selectedProject} 必须实际新增或更新 ${smokeFile}。`,
      "子 Agent 回复末尾必须追加 CCM_AGENT_RECEIPT，status=done，filesChanged 包含目标文件。",
      "主 Agent 必须完成最终复盘，说明实际文件变更、已执行验证和风险。",
      "系统必须捕获到实际文件变更和已执行验证记录后，任务才允许变为已完成。"
    ].join("\n"),
    constraints: [
      "这是受控试运行任务，目标是验证自动开发闭环。",
      "不要手动标记完成；必须通过队列执行和系统验收完成。",
      "如果无法写入目标文件或无法运行验证，回执 status 不能写 done，必须说明阻塞点。",
      payload.constraints || ""
    ].filter(Boolean).join("\n"),
    requires_code_changes: true,
  });

  const task = createTask({
    title: compactFormText(payload.title, `真实日常开发闭环试运行 - ${selectedProject}`),
    description,
    target_project: target.coordinator?.project || selectedProject,
    group_id: target.group.id,
    assign_type: "group",
    priority: payload.priority || "normal",
    auto_execute: autoExecute,
    workflow_type: "daily_dev",
    requires_code_changes: true,
    requires_verification: true,
    business_goal: businessGoal,
    acceptance_criteria: `修改 ${smokeFile}，子 Agent 结果说明 done，主 Agent 复盘 complete，系统捕获实际变更和已执行验证记录。`,
    source_documents: `daily-dev smoke target=${selectedProject}; file=${smokeFile}`,
    workflow_meta: {
      smoke_test: true,
      smoke_file: smokeFile,
      target_member: selectedProject,
      group_name: groupName,
    },
  });

  addTaskLog(task.id, "info", `创建真实日常开发闭环试运行任务：${selectedProject} -> ${smokeFile}`);
  let queueResult = null;
  if (autoExecute) queueResult = enqueueTask(task.id, ctx);

  return {
    success: true,
    task,
    group: { id: target.group.id, name: groupName, coordinator: target.coordinator?.project || "" },
    target_member: selectedProject,
    smoke_file: smokeFile,
    queued: !!queueResult?.queued,
    queue_result: queueResult,
    queue_status: getQueueStatus(),
  };
}

export function getDailyDevSmokeStatus(payload: any = {}) {
  const tasks = loadTasks();
  const taskId = String(payload.task_id || payload.taskId || "").trim();
  const smokeTasks = tasks
    .filter((task: any) => task?.workflow_type === "daily_dev" && task?.workflow_meta?.smoke_test)
    .sort((a: any, b: any) => String(b.created_at || b.updated_at || "").localeCompare(String(a.created_at || a.updated_at || "")));
  const task = taskId
    ? tasks.find((item: any) => item.id === taskId)
    : smokeTasks[0];
  if (!task || !task.workflow_meta?.smoke_test) {
    return {
      success: true,
      pass: false,
      status: "no_task",
      message: taskId ? "未找到指定真实试运行任务" : "还没有创建真实日常开发闭环试运行任务",
      latest_task_id: smokeTasks[0]?.id || null,
      execution_readiness: getAgentExecutionReadiness(),
    };
  }

  const smokeFile = normalizeSmokeFilePath(task.workflow_meta.smoke_file || payload.smoke_file || payload.smokeFile);
  const group = loadGroups().find((item: any) => item.id === task.group_id) || null;
  const targetMember = task.workflow_meta.target_member || "";
  const runtime = targetMember && group ? resolveMemberRuntime(targetMember, group, getConfigs()) : null;
  const workDir = runtime?.workDir || "";
  const resolvedWorkDir = workDir ? path.resolve(workDir) : "";
  const resolvedSmokePath = resolvedWorkDir ? path.resolve(resolvedWorkDir, smokeFile) : "";
  const insideWorkDir = !!resolvedWorkDir && (resolvedSmokePath === resolvedWorkDir || resolvedSmokePath.startsWith(resolvedWorkDir + path.sep));
  const fileExists = insideWorkDir && fs.existsSync(resolvedSmokePath);
  const stat = fileExists ? fs.statSync(resolvedSmokePath) : null;
  const summary = task.delivery_summary || {};
  const receiptStatuses = Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : [];
  const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
  const workerNotifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
  const targetAssignment = assignmentEvidence.find((item: any) => item?.project === targetMember);
  const hasTargetAssignment = !!targetAssignment;
  const hasTargetWorkerNotification = workerNotifications.some((item: any) => item?.task_id === targetMember || item?.agent === targetMember);
  const coordinationPlanCount = Number(summary.coordination_plan_count || 0);
  const hasDoneReceipt = receiptStatuses.some((item: any) => item?.status === "done")
    || task.receipt?.status === "done";
  const hasFinalReview = !!(summary.has_final_review || task.review);
  const actualChangeCount = Number(summary.actual_file_change_count || task.file_changes?.count || 0);
  const executedVerificationCount = Number(summary.verification_executed?.length || 0);
  const requiredVerificationPassed = summary.verification_required_gate_passed !== false;
  const openSmokeGaps = [
    ...(Array.isArray(summary.blockers) ? summary.blockers : []),
    ...(Array.isArray(summary.blocking_needs)
      ? summary.blocking_needs
      : (Array.isArray(summary.needs) ? summary.needs.filter((item: any) => !isAdvisoryNeed(item, task)) : [])),
    ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
    ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
  ].filter(Boolean);
  const pass = task.status === "done"
    && fileExists
    && coordinationPlanCount > 0
    && hasTargetAssignment
    && hasTargetWorkerNotification
    && actualChangeCount > 0
    && hasDoneReceipt
    && hasFinalReview
    && executedVerificationCount > 0
    && requiredVerificationPassed
    && openSmokeGaps.length === 0;
  const missing = [
    task.status === "done" ? "" : "任务尚未完成",
    fileExists ? "" : "目标 smoke 文件不存在",
    coordinationPlanCount > 0 ? "" : "缺少主 Agent 协调计划证据",
    hasTargetAssignment ? "" : "缺少主 Agent 派发给目标子 Agent 的证据",
    hasTargetWorkerNotification ? "" : "缺少目标子 Agent 的 Worker 通知",
    actualChangeCount > 0 ? "" : "未捕获实际文件变更",
    hasDoneReceipt ? "" : "缺少子 Agent done 回执",
    hasFinalReview ? "" : "缺少主 Agent 最终复盘",
    executedVerificationCount > 0 ? "" : "缺少已执行验证记录",
    requiredVerificationPassed ? "" : "缺少项目配置验证命令证据",
    openSmokeGaps.length ? `仍有未解决阻塞/补充/失败验证：${openSmokeGaps.slice(0, 3).join("；")}` : "",
  ].filter(Boolean);
  const readiness = getTaskAgentExecutionReadiness(task);
  const status = pass
    ? "passed"
    : readiness.ready === false
      ? "blocked"
      : (task.status === "failed" ? "failed" : "waiting");

  return {
    success: true,
    pass,
    status,
    message: pass
      ? "真实日常开发闭环试运行已通过"
      : (status === "blocked" ? readiness.message : `真实试运行尚未通过：${missing.join("、") || task.status_detail || "等待执行结果"}`),
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      status_detail: task.status_detail || "",
      created_at: task.created_at,
      updated_at: task.updated_at,
      completed_at: task.completed_at || null,
    },
    target: {
      group_id: task.group_id || "",
      group_name: group?.name || task.workflow_meta.group_name || "",
      member: targetMember,
      work_dir: workDir,
      smoke_file: smokeFile,
      smoke_path: insideWorkDir ? resolvedSmokePath : "",
      file_exists: fileExists,
      file_size: stat?.size || 0,
      file_modified_at: stat ? stat.mtime.toISOString() : "",
    },
    evidence: {
      task_done: task.status === "done",
      file_exists: fileExists,
      assignment_count: assignmentEvidence.length,
      has_target_assignment: hasTargetAssignment,
      target_assignment: targetAssignment || null,
      worker_notification_count: workerNotifications.length,
      has_target_worker_notification: hasTargetWorkerNotification,
      coordination_plan_count: coordinationPlanCount,
      actual_file_change_count: actualChangeCount,
      has_done_receipt: hasDoneReceipt,
      has_final_review: hasFinalReview,
      executed_verification_count: executedVerificationCount,
      required_verification_passed: requiredVerificationPassed,
      missing,
      delivery_summary: summary,
    },
    execution_readiness: readiness,
  };
}
