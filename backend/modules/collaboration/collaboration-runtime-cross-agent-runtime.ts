// collaboration-runtime-cross-agent-runtime.ts — merged from 2 part files (behavior-freeze merge).

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  spawnSync,
} from "child_process";
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
import {
  ingestRequirementSources,
  requirementToIntakeDraft,
} from "../requirements/source-ingestion";
import {
  loadCronJobs,
  saveCronJobs,
  loadTasks,
  saveTasks,
  getConfigs,
  getConfigInfo,
  loadProjectConfigs,
  AGENTS,
} from "../../core/db";
import {
  buildSelectedSkillUsageDirective,
  selectRoleSkills,
} from "../../skills/role-skills";
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
import {
  buildMainAgentDisplayStream,
  sanitizeMainAgentUserText,
} from "./display";
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
import {
  hasFeishuTaskBinding,
} from "./feishu-channel";
import {
  handleFeishuRoutes,
} from "./feishu-routes";
import {
  handleAgentQaRoutes,
} from "./agent-qa-routes";
import {
  GROUP_COORDINATION_MCP_SERVER_NAME,
} from "../../integrations/group-coordination-mcp";
import {
  buildTaskBoundInternalMcpServers,
} from "../../integrations/agent-internal-mcp";
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
import {
  handleGroupLiveRoutes,
} from "./group-live-routes";
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
import {
  buildTestAgentVerdict,
} from "../../test-agent/verdict";
import type {
  TestAgentReport,
  TestAgentVerdict,
} from "../../test-agent/types";
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
import {
  handleBasicGroupRoutes,
} from "./group-routes";
import {
  handleOrchestratorRoutes,
} from "./orchestrator-routes";
import {
  handleTaskGovernanceRoutes,
} from "./task-governance-routes";
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
import {
  purgeTestAgentArtifactsForTask,
} from "../../test-agent/artifact-retention";
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
  latestPresentedPlanFromGroupSession,
  mergePresentedPlanAcceptanceCriteria,
  presentedPlanFromTask,
} from "./group-presented-plan";
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
import {
  getAgentCommandLabel,
  getPublicAgentRuntimes,
  normalizeAgentRuntimeId,
} from "../../agents/runtime";
import {
  buildRuntimeToolDispatchGate,
  buildRuntimeToolSyncPrompt,
  detectInvokedSkillsFromText,
  recordRuntimeToolSyncAudit,
  syncRuntimeTools,
} from "../../tools/runtime-tool-sync";
import {
  buildAuthorizationReadiness,
  buildToolAuthorizationPayload,
  normalizeToolAuthorization,
} from "../../tools/tool-authorization";
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
  orderMentionsForConflictPlan,
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
import {
  getReliabilityDrillStatus,
  runScheduledProductionReliabilityDrill,
} from "../../system/reliability-drills";
import {
  getSoakReport,
  getSoakTestStatus,
  inspectReliabilityDebt,
  reconcileStabilityDebt,
  runSoakTestSelfTest,
  sampleSoakTestNow,
  startSoakTest,
  stopSoakTest,
} from "../../system/soak-test";
import {
  getProcessLifecycleSnapshot,
  registerRestartIntent,
  runProcessLifecycleSelfTest,
} from "../../system/process-lifecycle";
import {
  purgeTaskReplayJournalForTask,
} from "../../system/task-replay-journal";
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
import {
  buildProjectExecutionBrief,
  buildProjectMemoryPacket,
} from "../../projects/memory";
import {
  recordGlobalDirectDispatchMemory,
  recordGlobalDirectDispatchRollbackMemory,
} from "../../agents/global/memory";
import {
  createDispatchRecord,
  normalizeDispatchBatch,
} from "./dispatch-records";
import {
  buildCollaborationQuestionContract,
  evaluateAdvisoryPermissionBoundary,
  evaluateCollaborationAnswer,
  evaluateCollaborationQuestionAdmission,
  runAgentCollaborationProtocolSelfTest,
} from "../../agents/collaboration-protocol";
import {
  buildExplicitSemanticDecisionReceipt,
  normalizeCollaborationRouteDecision,
  runSemanticDecision,
} from "../../system/semantic-decision-runtime";
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
  attachInvokedSkillsToReceipt,
  buildAgentQaProtocolInstructions,
  buildChildAgentDevelopmentContract,
  buildChildAgentTaskText,
  buildChildAgentWorkerHandoff,
  buildTaskPreflightReasoning,
  buildTaskProviderSwitchRequests,
  buildWorkerContinuationHandoff,
  buildWorkflowMeta,
  claimTaskWorkItemForAgent,
  compactRuntimeToolAudit,
  coordinationSettlementInFlight,
  escapeRegExp,
  extractActionableMentions,
  getChildAgentIsolationMode,
  getInitialWorkflowMeta,
  getTaskById,
  normalizeMentionTask,
  normalizePlanAssignments,
  runningTaskIds,
  runtimeToolSnapshotFromAudit,
  splitUserAcceptanceText,
  summarizeTaskAgentMemoryContextSnapshot,
  taskAgentInvocationMemoryOptions,
  taskAgentSessionLifecycleRunnerOptions,
  updateGroupTaskInlineStatus,
  updateTaskWorkItemFromReceipt,
} from "./collaboration-runtime-task-queue";
import {
  extractAgentQaReplies,
  extractAgentQaRequests,
  getAgentDependencyStateFromOutputs,
  getCoordinatorActionMentions,
  parseFormattedReceiptsFromText,
  recordReplayRepairTimelineBindingsForMention,
  stripAgentQaProtocolBlocks,
  summarizeReplayRepairTimelineBindingsForEvent,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";
import {
  emitAssignmentStatus,
  writeSse,
} from "./collaboration-runtime-daily-dev";
import {
  buildCoordinatorReworkContinuationFallback,
  buildNativeTestAgentPlanBlockedReceipt,
  buildNativeTestAgentReceipt,
  buildNativeTestAgentReviewSummary,
  buildNativeTestAgentRuntimeToolContext,
  formatNativeTestAgentOutput,
  formatNativeTestAgentPlanBlockedOutput,
  getTestAgentHandoffPayload,
  getTestAgentHandoffProjectWorkDir,
  getTestAgentHandoffWarnings,
  stopWrongDirectionWorkerForCoordinatorRoute,
  summarizeNativeTestAgentExecutionPlan,
  validateTestAgentHandoffRegisteredWorkDirs,
} from "./collaboration-runtime-test-agent-handoff";
import {
  enqueueTask,
  isTaskQueuedInMemory,
} from "./collaboration-runtime-coordinator-review";
import {
  CollabCtx,
  buildAgentToolContext,
  buildCoordinatorSharedFilesContext,
  getProjectAgentCapabilityProfile,
  getProjectExtraConfig,
  getWorkDirState,
} from "./collaboration-runtime-plan-tools";
import {
  buildProjectVerificationHints,
  createTask,
  prepareAgentRuntimeTools,
  runtimeToolDispatchBlockedMessage,
  runtimeToolDispatchBlockedReceipt,
  updateTask,
} from "./collaboration-runtime-runtime-tools";

// ===== merged from collaboration-runtime-cross-agent-runtime-part-01.ts =====

// === 跨 Agent 并行与递归协作（核心）===


export async function processCrossAgents(
  groupId: string,
  group: any,
  sourceProject: string,
  output: string,
  atMentions: any[],
  configs: any[],
  ctx: CollabCtx,
  streamRes: any = null,
  depth = 0,
  seenMentions = new Set<string>(),
  executionOrder = "parallel",
  planMessageId = "",
  taskId = ""
): Promise<string[]> {
  return require("./collaboration-cross-agents").processCrossAgents(
    groupId, group, sourceProject, output, atMentions, configs, ctx, streamRes, depth, seenMentions, executionOrder, planMessageId, taskId,
    {
      addGroupLog,
      addTaskLog,
      admitChildTypedMemoryDelivery,
      appendAgentQaTrace,
      appendGroupMessage,
      appendTaskTimelineEvent,
      attachExecutionWorkspace,
      attachInvokedSkillsToReceipt,
      attachMemoryContextConsumptionChallenge,
      attachTaskAgentFinalDispatchPayloadGate,
      bindTaskAgentInvocationContext,
      bindTaskAgentInvocationMemoryDelivery,
      bindTaskAgentInvocationRunnerRequest,
      bindTaskAgentMemoryContextSnapshot,
      buildAckPreflightReview,
      buildAgentMemoryContextBundleWithManifestSelection,
      buildAgentMemoryPacket,
      buildAgentQaProtocolInstructions,
      buildAgentToolContext,
      buildChildAgentDevelopmentContract,
      buildChildAgentTaskText,
      buildChildAgentWorkerHandoff,
      buildChildAgentWorktreeNotice,
      buildCollaborationConflictPlan,
      orderMentionsForConflictPlan,
      buildCoordinatorCollaborationInstructions,
      buildCoordinatorReworkContinuationFallback,
      buildCoordinatorSharedFilesContext,
      buildFinalWorkerDispatchPayloadGate,
      buildGroupContextPacket,
      buildMemberCollaborationInstructions,
      buildNativeTestAgentPlanBlockedReceipt,
      buildNativeTestAgentReceipt,
      buildNativeTestAgentReviewSummary,
      buildNativeTestAgentRuntimeToolContext,
      buildPostReviewSpotCheckSummary,
      buildProjectExecutionBrief,
      buildProjectVerificationHints,
      buildRuntimeRecoveryCandidates,
      buildRuntimeRecoveryPrompt,
      buildTaskPreflightReasoning,
      buildTaskProviderSwitchRequests,
      buildWorkerContinuationHandoff,
      buildWorkflowMeta,
      checkTaskFailure,
      claimTaskWorkItemForAgent,
      commitChildTypedMemoryDelivery,
      commitTaskAgentSessionCapacityRevalidation,
      compactMemoryText,
      compactRuntimeToolAudit,
      completeTaskAgentInvocationEdge,
      coordinatorReworkRouteNeedsFreshVerifier,
      coordinatorReworkRouteRequiresStop,
      coordinatorReworkRouteUsesVerifier,
      createChildTypedMemoryDispatchWal,
      createExecutionCheckpoint,
      createMemoryContextConsumptionChallenge,
      dispatchTaskAgentInvocationEdge,
      emitAssignmentStatus,
      ensureExecution,
      escapeRegExp,
      evaluateAdvisoryPermissionBoundary,
      evaluateGreenContract,
      extractActionableMentions,
      extractAgentReceipt,
      extractRunnerVerificationEvidence,
      formatCollectedAgentOutput,
      formatNativeTestAgentOutput,
      formatNativeTestAgentPlanBlockedOutput,
      getAgentDependencyStateFromOutputs,
      getChildAgentIsolationMode,
      getCoordinatorActionMentions,
      getCoordinatorMember,
      getInitialWorkflowMeta,
      getMentionReworkRoute,
      getProjectAgentCapabilityProfile,
      getProjectExtraConfig,
      getReceiptAssignmentStatus,
      getRoutableMembers,
      getTaskAgentSessionOptions,
      getTaskById,
      getTestAgentHandoffPayload,
      getTestAgentHandoffProjectWorkDir,
      getTestAgentHandoffReviewSubject,
      getTestAgentHandoffWarnings,
      getWorkDirState,
      handleAgentQaRequests,
      inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker,
      isCoordinatorTestAgentName,
      isProviderPromptTooLongFailure,
      loadExecution,
      markChildTypedMemoryDispatchCommitted,
      markChildTypedMemoryDispatchStarted,
      markChildTypedMemoryRunnerReturned,
      memoryContextConsumptionReceiptFile,
      normalizeAgentRuntimeId,
      normalizeMentionTask,
      normalizePlanAssignments,
      openTaskAgentSession,
      prepareAgentRuntimeTools,
      prepareChildAgentWorkDir,
      prepareTaskAgentInvocationEdge,
      prepareTaskAgentSessionCapacityRevalidation,
      recordAgentRuntimeLifecycle,
      recordReplayRepairTimelineBindingsForMention,
      recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome,
      recordTaskAgentMemoryContextDelivery,
      recordTaskAgentSessionTurn,
      recordWorkerContextProviderSwitchExecutionReceiptForCoordinator,
      recordWorkerContextProviderSwitchSessionBindingForCoordinator,
      recoverFinalWorkerDispatchPayload,
      renderGroupPostCompactDynamicContextDelta,
      renderGroupPostCompactInvokedSkillAttachments,
      renderGroupPostCompactPlanAttachment,
      renderMemoryContextForWorker,
      resolveMemberRuntime,
      runGroupOrchestrator,
      runMainAgentPostReviewSpotCheck,
      runTestAgentCliJob,
      runtimeToolDispatchBlockedMessage,
      runtimeToolDispatchBlockedReceipt,
      runtimeToolSnapshotFromAudit,
      shouldSwitchRuntime,
      stopWrongDirectionWorkerForCoordinatorRoute,
      stripAgentQaProtocolBlocks,
      summarizeNativeTestAgentExecutionPlan,
      summarizeReplayRepairTimelineBindingsForEvent,
      summarizeTaskAgentMemoryContextSnapshot,
      summarizeWorkerHandoffForUser,
      taskAgentInvocationMemoryOptions,
      taskAgentSessionLifecycleRunnerOptions,
      taskRequiresCodeChanges,
      taskRequiresVerification,
      transitionExecution,
      uniqueStrings,
      updateGroupMemory,
      updateGroupTaskInlineStatus,
      updateTask,
      updateTaskWorkItemFromReceipt,
      validateTestAgentHandoffRegisteredWorkDirs,
      verifyFinalWorkerDispatchPayloadGate,
      writeSse
    }
  );
}

function arbitrateAgentQaRequest(request: any, group: any, sourceProject = "", routeDecision: any = null) {
  const members = new Set((group.members || []).map((m: any) => String(m.project || "").trim()).filter(Boolean));
  if (routeDecision?.action === "ask_user") return { decision: "ask_user", reason: routeDecision.reason || "群聊主 Agent 需要用户确认协作目标" };
  if (routeDecision?.action === "reject") return { decision: "reject", reason: routeDecision.reason || "群聊主 Agent 拒绝了该协作请求" };
  if (!members.has(request.targetName)) {
    return { decision: "reject", reason: `目标 Agent 不在当前群聊成员中：${request.targetName}` };
  }
  if (request.targetName === sourceProject) {
    return { decision: "reject", reason: "不能把问题发回给自己" };
  }
  if (request.kind === "risk") {
    return { decision: "ask_user", reason: "结构化协作请求声明需要用户确认" };
  }
  return { decision: "ask_agent", reason: request.reason || "目标 Agent 具备该问题的上下文" };
}

async function resolveAgentQaSemanticRoute(input: {
  request: any;
  group: any;
  sourceProject: string;
  profiles: Record<string, any>;
  openItems: any[];
  groupId: string;
  groupSessionId: string;
  taskId?: string;
}) {
  const members = (input.group?.members || [])
    .map((member: any) => String(member?.project || "").trim())
    .filter((project: string) => project && project !== input.sourceProject);
  const explicit = String(input.request?.targetName || input.request?.target || "").trim();
  const identity = {
    scope: "group" as const,
    scopeId: input.groupId,
    sessionId: input.groupSessionId || `conversation:${input.groupId}`,
    ...(input.taskId ? { taskId: input.taskId } : {}),
  };
  if (explicit && explicit.toLowerCase() !== "auto") {
    if (!members.includes(explicit)) throw new Error(`目标 Agent 不在当前群聊成员中：${explicit}`);
    const value = normalizeCollaborationRouteDecision({ action: "ask_agent", targetProject: explicit, reason: "协作请求显式指定目标项目", confidence: 1 }, members);
    return { value, receipt: buildExplicitSemanticDecisionReceipt("agent_collaboration_route", identity, input.request, value) };
  }
  const candidateProfiles = members.map(project => {
    const profile = input.profiles?.[project] || {};
    const load = input.openItems.filter(item => item?.to_agent === project && ["waiting", "asking", "queued"].includes(String(item?.status || ""))).length;
    return {
      project,
      responsibility: String(profile.responsibility || "").slice(0, 800),
      capabilities: Array.isArray(profile.capabilities) ? profile.capabilities.map(String).slice(0, 20) : [],
      activeCoordinationLoad: load,
    };
  });
  return runSemanticDecision({
    kind: "agent_collaboration_route",
    identity,
    system: [
      "你是 CCM 群聊主 Agent 的跨项目协作路由器。必须理解完整问题语义，不能按关键词、正则或项目名称猜测。",
      "只从 candidateProjects 中选择确实负责该问题且能提供所需证据的项目。若需要业务或产品决定、候选不明确或没有合适项目，action=ask_user；请求无效则 action=reject。",
      "只输出 JSON：{\"action\":\"ask_agent|ask_user|reject\",\"targetProject\":\"ask_agent 时填写\",\"reason\":\"依据\",\"confidence\":0.0}",
    ].join("\n"),
    input: {
      sourceProject: input.sourceProject,
      question: String(input.request?.question || ""),
      reason: String(input.request?.reason || ""),
      requiredCapabilities: input.request?.required_capabilities || input.request?.requiredCapabilities || [],
      evidence: input.request?.evidence || [],
      acceptanceCriteria: input.request?.acceptance_criteria || [],
      requestKind: input.request?.kind || "information",
      candidateProjects: candidateProfiles,
    },
    validate: value => {
      const normalized = normalizeCollaborationRouteDecision(value, members);
      if (normalized.action === "ask_agent" && normalized.confidence < 0.55) throw new Error("collaboration_route_confidence_insufficient");
      return normalized;
    },
    confidence: value => value.confidence,
    maxTokens: 700,
  });
}

export async function resumeAgentQaFromStoredContinuation(qa: any, group: any, ctx: CollabCtx, streamRes: any = null) {
  if (!qa?.acceptance?.accepted || qa.blocking === false) return { resumed: false, reason: "回答未采纳或不是阻塞问题" };
  const continuation = qa.continuation || {};
  const runtime = resolveMemberRuntime(qa.from_agent, group, getConfigs());
  const workDir = String(continuation.source_work_dir || runtime?.workDir || "").trim();
  const agentType = String(continuation.source_agent_type || runtime?.agentType || "claudecode").trim();
  if (!workDir) return { resumed: false, reason: "缺少原 Agent 工作目录，无法安全续跑" };
  let session = openTaskAgentSession({ scopeId: qa.task_id, taskId: qa.task_id, groupId: qa.group_id, project: qa.from_agent, agentType });
  const sourceTask = getTaskById(qa.task_id);
  const groupSessionId = String(sourceTask?.group_session_id || sourceTask?.groupSessionId || qa.group_session_id || "");
  const toolContext = buildAgentToolContext(ctx, group, qa.from_agent, `${continuation.original_prompt || ""}\n${qa.question || ""}\n${qa.answer || ""}`);
  const resumedAllowedTools = continuation.allowed_tools || toolContext.allowedTools;
  const resumedToolOptions = continuation.allowed_tools
    ? { taskId: qa.task_id, task: sourceTask, groupSessionId, taskAgentSessionId: session?.id || "", nativeSessionId: session?.nativeSessionId || "" }
    : { taskId: qa.task_id, task: sourceTask, groupSessionId, taskAgentSessionId: session?.id || "", nativeSessionId: session?.nativeSessionId || "", toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness };
  const runtimeTools = prepareAgentRuntimeTools(qa.group_id, qa.from_agent, workDir, agentType, resumedAllowedTools, streamRes, resumedToolOptions);
  if (runtimeTools.dispatchBlocked) {
    const reason = runtimeToolDispatchBlockedMessage(qa.from_agent, runtimeTools);
    appendAgentQaTrace(qa.task_id, "agent.qa.runtime_tool_dispatch_blocked", qa, reason, "warn", { runtime_tool_dispatch_gate: runtimeTools.dispatchGate });
    if (qa.task_id) appendTaskTimelineEvent(qa.task_id, { type: "runtime_tool_dispatch_blocked", title: `${qa.from_agent} 工具授权派发被阻断`, detail: reason, status: "warn", phase: "waiting_dependency", agent: qa.from_agent, data: { runtime_tool_dispatch_gate: runtimeTools.dispatchGate } });
    return { resumed: false, reason, runtimeToolDispatchGate: runtimeTools.dispatchGate };
  }
  let nativeSessionId = "";
  let nativeContinuationEvidence: any = null;
  let succeeded = true;
  let error = "";
  const prompt = [
    "CCM Agent 协作协议已收到一个先前阻塞问题的合格回答。请从同一任务会话继续，不要从零重做。",
    `问题 ID：${qa.id}`,
    `原任务：${compactMemoryText(continuation.original_prompt || "", 2400)}`,
    `问题：${qa.question}`,
    `回答：${compactMemoryText(qa.answer || "", 3000)}`,
    qa.answer_evidence?.length ? `证据：${qa.answer_evidence.join("；")}` : "",
    "只处理回答解除后的剩余缺口；完成后提交新的 CCM_AGENT_RECEIPT。",
  ].filter(Boolean).join("\n\n");
  const messageId = "m" + Date.now().toString(36) + "qawake" + crypto.randomBytes(2).toString("hex");
  const output = await ctx.callAgentForGroupStream(qa.from_agent, prompt, workDir, agentType, {
    res: streamRes,
    groupId: qa.group_id,
    timeoutMs: 300000,
    messageId,
    allowedTools: resumedAllowedTools,
    mcpConfigPath: runtimeTools.audit.mcpConfigPath || continuation.mcp_config_path || "",
    taskId: qa.task_id,
    executionId: qa.execution_id || qa.task_id,
    agentSession: session ? getTaskAgentSessionOptions(session) : null,
    onDone: (opts: any) => {
      nativeSessionId = String(opts?.nativeSessionId || "");
      nativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
      succeeded = opts?.isError !== true;
      error = String(opts?.error || opts?.message || "");
    },
  });
  if (session) session = recordTaskAgentSessionTurn(session.id, {
    nativeSessionId,
    nativeContinuationEvidence,
    nativeContinuationUnverified: nativeContinuationEvidence?.nativeResumeRequested === true
      && nativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
    success: succeeded,
    error: error || (!succeeded ? output : ""),
    runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeTools.audit, resumedAllowedTools),
  }) || session;
  const at = new Date().toISOString();
  const resumed = upsertAgentQaItem({
    ...qa,
    status: "resumed",
    injected_at: qa.injected_at || at,
    resumed_at: at,
    resume_message_id: messageId,
    audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at, type: "event_wakeup", detail: "回答到达后自动唤醒原 Agent 任务会话" }].slice(-30),
  });
  appendGroupMessage(qa.group_id, { id: messageId, role: "assistant", agent: qa.from_agent, type: "agent_qa_resume", content: output, timestamp: at, task_id: qa.task_id, qa: { ...resumed, kind: "resume", status: "resumed" } });
  emitAgentQaEvent(streamRes, "resume", resumed, output);
  appendAgentQaTrace(qa.task_id, "agent.qa.event_wakeup", resumed, `${qa.from_agent} 已在回答到达后自动续跑`, succeeded ? "ok" : "warn", { session_id: session?.id || "", native_session_id: session?.nativeSessionId || "", resume_mode: session?.resumeMode || "" });
  if (qa.task_id) appendTaskTimelineEvent(qa.task_id, { type: "agent_qa_resume", title: `${qa.from_agent} 已由回答事件唤醒`, detail: compactMemoryText(output, 500), status: succeeded ? "ok" : "warn", phase: "executing", agent: qa.from_agent, data: { qa_id: qa.id, session_id: session?.id || "", native_session_id: session?.nativeSessionId || "", resume_mode: session?.resumeMode || "" } });
  if (qa.task_id) updateGroupTaskInlineStatus(getTaskById(qa.task_id) || { id: qa.task_id, group_id: qa.group_id }, "in_progress", `${qa.from_agent} 已收到回答并自动续跑`);
  return { resumed: true, item: resumed, output, session };
}

export async function retryAgentQaItem(id: string, ctx: CollabCtx, streamRes: any = null) {
  markExpiredAgentQaItems();
  const current = loadAgentQaItems().find((item: any) => item.id === id);
  if (!current) return { success: false, error: "问答记录不存在" };
  if (Number(current.retry_count || 0) >= 2) return { success: false, error: "该问答已达到最大重试次数，请换 Agent 或人工接管" };
  const group = loadGroups().find((item: any) => item.id === current.group_id);
  if (!group) return { success: false, error: "群聊不存在" };
  const request = {
    type: current.type || "ask_agent",
    targetName: current.to_agent,
    question: current.question,
    reason: current.reason || "用户触发重试",
    blocking: current.blocking !== false,
  };
  const retryStartedAt = new Date().toISOString();
  const qa = upsertAgentQaItem({
    ...current,
    status: "asking",
    retry_count: Number(current.retry_count || 0) + 1,
    timeout_at: new Date(Date.now() + AGENT_QA_TIMEOUT_MS).toISOString(),
    retry_started_at: retryStartedAt,
    manual_takeover: false,
    audit: [...(Array.isArray(current.audit) ? current.audit : []), { at: retryStartedAt, type: "retry", detail: "用户触发重试目标 Agent 回答" }].slice(-30),
  });
  appendGroupMessage(current.group_id, buildAgentQaMessage("question", qa, qa.question));
  emitAgentQaEvent(streamRes, "question", qa, qa.question);
  const mention = {
    mention: `@${request.targetName}`,
    targetName: request.targetName,
    message: [
      `【Agent-to-Agent ${request.type === "request_review" ? "评审请求重试" : "询问重试"}】`,
      `来自：${current.from_agent}`,
      request.reason ? `原因：${request.reason}` : "",
      `问题：${request.question}`,
      "请直接回答该 Agent 的问题；可以自然语言回答，也可以输出 reply_agent 工具调用。",
    ].filter(Boolean).join("\n"),
    requestId: qa.id,
    advisoryOnly: true,
    permissionContract: qa.permission_contract || { mode: "advisory_read_only", write_scope_expanded: false, mcp_scope_expanded: false },
    structured: true,
  };
  const outputs = await processCrossAgents(current.group_id, group, current.from_agent, current.question, [mention], getConfigs(), ctx, streamRes || null, 1, new Set<string>(), "sequential", "", current.task_id || "");
  const joined = outputs.join("\n\n---\n\n");
  const reply = extractAgentQaReplies(joined, qa.id).pop();
  const answerText = reply?.answer || stripAgentQaProtocolBlocks(joined);
  const acceptance = evaluateCollaborationAnswer({ answer: answerText, evidence: reply?.evidence || qa.evidence || [] }, qa, loadAgentQaItems().filter((item: any) => item.task_id === qa.task_id && item.id !== qa.id && item.acceptance));
  const completed = upsertAgentQaItem({
    ...qa,
    status: answerText && acceptance.accepted ? "answered" : answerText ? "rejected" : "failed",
    answer: compactMemoryText(answerText || "目标 Agent 重试后仍未返回可用回答", 4000),
    answer_evidence: acceptance.evidence,
    acceptance,
    answered_at: new Date().toISOString(),
    audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: answerText && acceptance.accepted ? "accepted" : answerText ? "rejected" : "failed", detail: acceptance.reason || "重试已完成" }].slice(-30),
  });
  appendGroupMessage(current.group_id, buildAgentQaMessage("answer", completed, completed.answer));
  emitAgentQaEvent(streamRes, "answer", completed, completed.answer);
  if (completed.acceptance?.accepted) writeAcceptedAgentQaToProjectMemory(completed);
  appendAgentQaTrace(current.task_id || "", "agent.qa.retry_answer", completed, acceptance.reason, acceptance.accepted ? "ok" : "warn", { acceptance });
  const wakeup = acceptance.accepted ? await resumeAgentQaFromStoredContinuation(completed, group, ctx, streamRes) : { resumed: false, reason: acceptance.reason };
  return { success: true, item: wakeup.resumed ? wakeup.item : completed, wakeup };
}

function normalizedCoordinationWritePaths(value: any): string[] {
  const values = Array.isArray(value) ? value : [];
  const paths = values
    .map(item => String(typeof item === "string" ? item : item?.path || "").replace(/\\\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/").trim())
    .filter(Boolean);
  // A repository-wide or omitted scope is deliberately treated as unknown. It
  // must not be used to justify concurrent writes from a second worktree.
  if (!paths.length || paths.some(item => item === "." || item === "*")) return [];
  return uniqueStrings(paths).slice(0, 80);
}

function coordinationWriteScopesOverlap(left: string[], right: string[]) {
  return left.some(leftPath => right.some(rightPath =>
    leftPath === rightPath || leftPath.startsWith(`${rightPath}/`) || rightPath.startsWith(`${leftPath}/`)
  ));
}

function getCoordinationProjectWorktreeReadiness(targetProject: string) {
  const config = getConfigs().find((item: any) => String(item?.name || "") === String(targetProject || ""));
  const workDir = config ? String(getConfigInfo(config.path)?.[0]?.workDir || "").trim() : "";
  if (!workDir || !fs.existsSync(workDir)) return { ready: false, code: "project_workdir_unavailable" };
  const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: workDir, encoding: "utf-8", windowsHide: true });
  if (inside.status !== 0 || String(inside.stdout || "").trim() !== "true") return { ready: false, code: "worktree_not_supported" };
  const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: workDir, encoding: "utf-8", windowsHide: true });
  if (status.status !== 0) return { ready: false, code: "repository_status_unavailable" };
  if (String(status.stdout || "").trim()) return { ready: false, code: "repository_dirty" };
  const supported = spawnSync("git", ["worktree", "list", "--porcelain"], { cwd: workDir, encoding: "utf-8", windowsHide: true });
  return supported.status === 0 ? { ready: true, code: "ready" } : { ready: false, code: "worktree_not_supported" };
}

export function decideCoordinationDependencyDispatch(input: {
  targetProject: string;
  requestedWritePaths?: any[];
  parentTaskId?: string;
  groupId?: string;
}) {
  const requestedPaths = normalizedCoordinationWritePaths(input.requestedWritePaths);
  const activeStatuses = new Set(["pending", "queued", "in_progress", "reviewing", "reworking", "waiting"]);
  const activeWriters = loadTasks().filter((task: any) =>
    String(task?.id || "") !== String(input.parentTaskId || "")
    && String(task?.target_project || "") === String(input.targetProject || "")
    && activeStatuses.has(String(task?.status || "").toLowerCase())
    && task?.requires_code_changes !== false
  );
  if (!activeWriters.length) {
    return {
      queueScope: "project_serial",
      childAgentIsolation: "shared",
      executionMode: "serial_continuation",
      safeProjection: { decision: "serial", reason: "no_active_writer", active_writer_count: 0, content_stored: false },
      statusDetail: `正在为 ${input.targetProject} 准备协作工作项`,
      progressText: `${input.targetProject} 将在可用执行通道中处理依赖`,
    };
  }
  const activeScopes = activeWriters.map((task: any) => normalizedCoordinationWritePaths(
    task?.allowed_paths || task?.workflow_meta?.requested_write_paths || task?.workflow_meta?.requestedWritePaths
  ));
  const scopesKnownAndDisjoint = requestedPaths.length > 0
    && activeScopes.every(scope => scope.length > 0 && !coordinationWriteScopesOverlap(requestedPaths, scope));
  const worktree = scopesKnownAndDisjoint ? getCoordinationProjectWorktreeReadiness(input.targetProject) : { ready: false, code: "write_scope_conflict_or_unknown" };
  if (scopesKnownAndDisjoint && worktree.ready) {
    return {
      queueScope: "isolated_parallel",
      childAgentIsolation: "worktree",
      executionMode: "isolated_dependency_branch",
      safeProjection: { decision: "isolated_parallel", reason: "disjoint_verified_scopes", active_writer_count: activeWriters.length, content_stored: false },
      statusDetail: `正在为 ${input.targetProject} 准备独立工作区`,
      progressText: `${input.targetProject} 将在独立工作区处理依赖，不会打断当前任务`,
    };
  }
  return {
    queueScope: "project_serial",
    childAgentIsolation: "shared",
    executionMode: "queued_continuation",
    safeProjection: { decision: "serial", reason: worktree.code, active_writer_count: activeWriters.length, content_stored: false },
    statusDetail: `等待 ${input.targetProject} 当前任务完成后处理依赖`,
    progressText: `等待 ${input.targetProject} 当前任务完成后处理依赖`,
  };
}

export async function handleAgentQaRequests(input: {
  groupId: string;
  group: any;
  sourceProject: string;
  sourceOutput: string;
  originalPrompt: string;
  sourceWorkDir: string;
  sourceAgentType: string;
  allowedTools: any;
  mcpConfigPath?: string;
  runtimeToolSnapshot?: any;
  configs: any[];
  ctx: CollabCtx;
  streamRes?: any;
  taskId?: string;
  sourceTaskAgentSessionId?: string;
  sourceNativeSessionId?: string;
  qaDepth?: number;
}) {
  markExpiredAgentQaItems(input.groupId);
  const qaDepth = Number(input.qaDepth || 0);
  const coordinationContext = {
    groupId: input.groupId,
    taskId: input.taskId || `conversation:${input.groupId}`,
    groupSessionId: getTaskById(input.taskId || "")?.group_session_id || "",
    sourceProject: input.sourceProject,
    sourceAgentType: input.sourceAgentType,
    sourceTaskAgentSessionId: input.sourceTaskAgentSessionId || "",
    sourceNativeSessionId: input.sourceNativeSessionId || "",
    sourceWorkDir: input.sourceWorkDir,
  };
  if (qaDepth === 0) {
    for (const legacy of extractAgentQaRequests(input.sourceOutput, input.group, input.sourceProject)) {
      submitGroupCoordinationRequest(coordinationContext, {
        kind: legacy.kind,
        summary: legacy.question,
        question: legacy.question,
        reason: legacy.reason,
        blocking: legacy.blocking,
        requiredCapabilities: legacy.required_capabilities,
        targetHint: legacy.targetName === "auto" ? "" : legacy.targetName,
        evidence: legacy.evidence,
        acceptanceCriteria: legacy.acceptance_criteria,
        requestedWritePaths: legacy.requested_write_paths,
        idempotencyKey: legacy.coordination_request_id || undefined,
        metadata: { legacy_protocol: true, legacy_type: legacy.type },
      });
    }
  }
  const claimId = `group-main:${input.groupId}:${input.taskId || "conversation"}:${Date.now().toString(36)}`;
  const claimedCoordination = qaDepth > 0 ? [] : claimSubmittedGroupCoordinationRequests(coordinationContext, claimId);
  const requests = claimedCoordination.map((row: any) => ({
    type: row.kind === "review" ? "request_review" : "ask_agent",
    kind: row.kind,
    targetName: row.target_hint || "auto",
    question: row.question || row.summary,
    reason: row.reason,
    evidence: row.evidence || [],
    required_capabilities: row.required_capabilities || [],
    blocking: row.blocking !== false,
    acceptance_criteria: row.acceptance_criteria || [],
    requested_write_paths: row.requested_write_paths || [],
    coordination_request_id: row.id,
    coordination_record: row,
  }));
  if (!requests.length) return { outputs: [], resumedOutput: "" };

  const outputs: string[] = [];
  const answers: any[] = [];
  let coordinationResumedOutput = "";
  for (const rawRequest of requests.slice(0, 5)) {
    const now = new Date().toISOString();
    const openItems = loadAgentQaItems();
    const profiles = Object.fromEntries((input.group?.members || []).map((member: any) => {
      const project = String(member?.project || "").trim();
      const runtime = resolveMemberRuntime(project, input.group, input.configs);
      return [project, getProjectAgentCapabilityProfile(project, runtime?.workDir || "")];
    }).filter((entry: any[]) => entry[0]));
    const sourceTask = input.taskId ? getTaskById(input.taskId) : null;
    let routeResult: any = null;
    let routeError = "";
    let routeFailureReceipt: any = null;
    try {
      routeResult = await resolveAgentQaSemanticRoute({
        request: rawRequest,
        group: input.group,
        sourceProject: input.sourceProject,
        profiles,
        openItems,
        groupId: input.groupId,
        groupSessionId: String(sourceTask?.group_session_id || coordinationContext.groupSessionId || ""),
        taskId: input.taskId,
      });
    } catch (error: any) {
      routeError = compactMemoryText(error?.message || error || "群聊主 Agent 无法形成可靠协作路由", 600);
      routeFailureReceipt = error?.semanticDecisionReceipt || null;
    }
    const routeDecision = routeResult?.value || {
      schema: "ccm-agent-collaboration-route-decision-v1",
      targetProject: "",
      action: "ask_user",
      reason: `协作目标无法可靠确定：${routeError || "模型决策失败"}`,
      confidence: 0,
      candidateProjects: Object.keys(profiles).filter(project => project !== input.sourceProject),
    };
    const routing = {
      targetName: routeDecision.targetProject || "",
      strategy: routeResult ? (routeResult.receipt?.provider === "explicit-structured-input" ? "explicit" : "model_semantic") : "semantic_blocked",
      action: routeDecision.action,
      reason: routeDecision.reason,
      candidates: routeDecision.candidateProjects.map((project: string) => ({ project, load: openItems.filter(item => item?.to_agent === project && ["waiting", "asking", "queued"].includes(String(item?.status || ""))).length })),
      semanticDecisionReceipt: routeResult?.receipt || routeFailureReceipt || null,
    };
    const request = { ...rawRequest, targetName: routing.targetName || "用户确认" };
    const contract = buildCollaborationQuestionContract({
      ...request,
      group_id: input.groupId,
      task_id: input.taskId || `conversation:${input.groupId}`,
      execution_id: sourceTask?.execution_id || sourceTask?.active_execution_id || input.taskId || "",
      from_agent: input.sourceProject,
      to_agent: request.targetName,
    });
    if (request.kind === "implementation") {
      contract.permission_contract = {
        mode: "formal_work_item_write",
        inherited_from: "group_main_agent",
        target_project: request.targetName,
        write_scope_expanded: true,
        mcp_scope_expanded: false,
        tool_scope_expanded: false,
        requested_write_paths: request.requested_write_paths || [],
        rule: "写权限仅由群聊主 Agent 通过正式项目工作项授予；原子 Agent 的请求本身不授予写权限。",
      };
    }
    const admission = routeDecision.action === "ask_agent"
      ? evaluateCollaborationQuestionAdmission(contract, openItems)
      : { allowed: true, code: "semantic_route_terminal", reason: routeDecision.reason };
    const arbitration = arbitrateAgentQaRequest(request, input.group, input.sourceProject, routeDecision);
    if (!admission.allowed) {
      arbitration.decision = "reject";
      arbitration.reason = admission.reason;
    }
    const qaBase = {
      ...contract,
      id: contract.question_id,
      coordination_request_id: request.coordination_request_id || "",
      coordination_kind: request.kind || "information",
      status: arbitration.decision === "ask_agent" ? "waiting" : arbitration.decision,
      timeout_at: contract.deadline_at,
      routing,
      route_decision: routeDecision,
      candidate_projects: routeDecision.candidateProjects,
      escalation: routeDecision.action === "ask_user" ? "needs_user" : "none",
      route_checksum: routeResult?.receipt?.resultChecksum || "",
      semantic_decision_receipt: routeResult?.receipt || routeFailureReceipt || null,
      admission,
      arbitration,
      continuation: {
        source_work_dir: input.sourceWorkDir,
        source_agent_type: input.sourceAgentType,
        original_prompt: compactMemoryText(input.originalPrompt, 4000),
        allowed_tools: input.allowedTools || { mcp: [], skill: [] },
        mcp_config_path: input.mcpConfigPath || "",
        runtime_tool_snapshot: input.runtimeToolSnapshot || null,
        source_task_agent_session_id: input.sourceTaskAgentSessionId || "",
        source_native_session_id: input.sourceNativeSessionId || "",
      },
      retry_count: 0,
      manual_takeover: false,
      created_at: now,
      updated_at: now,
      audit: [{ at: now, type: "created", detail: arbitration.reason || "主 Agent 已仲裁" }],
    };
    const qa = upsertAgentQaItem(qaBase);
    updateGroupCoordinationRequest(request.coordination_request_id, {
      route_decision: routeDecision,
      candidate_projects: routeDecision.candidateProjects,
      escalation: routeDecision.action === "ask_user" ? "needs_user" : "none",
      route_checksum: routeResult?.receipt?.resultChecksum || "",
      semantic_decision_receipt: routeResult?.receipt || routeFailureReceipt || null,
      auditType: routeResult ? "semantic_route_confirmed" : "semantic_route_blocked",
      auditDetail: routeDecision.reason,
    });
    appendGroupMessage(input.groupId, buildAgentQaMessage("question", qa, request.question));
    emitAgentQaEvent(input.streamRes, "question", qa, request.question);
    safeAddGroupLog(input.groupId, "info", "agent_qa", `${input.sourceProject} 向 ${request.targetName} 提问`, {
      qa_id: qa.id,
      from: input.sourceProject,
      to: request.targetName,
      question: request.question,
      arbitration,
    });
    if (input.taskId) addTaskLog(input.taskId, "info", `Agent 问答：${input.sourceProject} -> ${request.targetName}；${request.question.slice(0, 220)}`);
    if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: "agent_qa_question", title: routeDecision.action === "ask_agent" ? `${input.sourceProject} 向 ${request.targetName} 提问` : `${input.sourceProject} 的协作请求已由主 Agent 仲裁`, detail: request.question, status: routeDecision.action === "ask_agent" ? "active" : "warn", phase: routeDecision.action === "ask_agent" ? "executing" : "waiting_dependency", agent: input.sourceProject, data: { qa_id: qa.id, request, arbitration, route_decision: routeDecision, semantic_decision_receipt: routeResult?.receipt || routeFailureReceipt || null } });
    appendAgentQaTrace(input.taskId || "", "agent.qa.question", qa, request.question, "active", { routing, admission, permission_contract: qa.permission_contract });
    if (input.taskId && qa.blocking && arbitration.decision === "ask_agent") {
      updateGroupTaskInlineStatus(sourceTask || { id: input.taskId, group_id: input.groupId }, "in_progress", `等待 ${request.targetName} 回答：${compactMemoryText(request.question, 180)}`);
      appendTaskTimelineEvent(input.taskId, { type: "agent_qa_waiting", title: `${input.sourceProject} 等待 ${request.targetName}`, detail: `问题 ${qa.id} 已进入等待；回答到达后自动唤醒原会话`, status: "active", phase: "waiting_dependency", agent: input.sourceProject, data: { qa_id: qa.id, deadline_at: qa.deadline_at } });
    }

    if (request.kind === "implementation" && arbitration.decision === "ask_agent") {
      const coordinator = getCoordinatorMember(input.group)?.project || "coordinator";
      const dependencyDispatch = decideCoordinationDependencyDispatch({
        targetProject: request.targetName,
        requestedWritePaths: request.requested_write_paths || [],
        parentTaskId: input.taskId || "",
        groupId: input.groupId,
      });
      const dependencyTask = createTask({
        title: `协作依赖：${compactMemoryText(request.question || request.reason, 80)}`,
        description: [
          "【群聊主 Agent 正式协作工作项】",
          `业务目标：${request.question}`,
          request.reason ? `背景：${request.reason}` : "",
          request.requested_write_paths?.length ? `授权修改范围：${request.requested_write_paths.join("；")}` : "",
          request.acceptance_criteria?.length ? `验收标准：${request.acceptance_criteria.join("；")}` : "",
          request.evidence?.length ? `已有证据：${request.evidence.join("；")}` : "",
          "这是由群聊主 Agent 授权的正式可写工作项。只在授权范围内实现，并提交真实 filesChanged 和 verification 结果说明。",
        ].filter(Boolean).join("\n"),
        business_goal: request.question,
        acceptance_criteria: (request.acceptance_criteria || []).join("\n"),
        target_project: request.targetName,
        group_id: input.groupId,
        group_session_id: sourceTask?.group_session_id || "",
        assign_type: "project",
        workflow_type: "agent_coordination_dependency",
        parent_task_id: input.taskId || null,
        priority: sourceTask?.priority || "normal",
        auto_execute: true,
        queue_scope: dependencyDispatch.queueScope,
        child_agent_isolation: dependencyDispatch.childAgentIsolation,
        branch_policy: dependencyDispatch.childAgentIsolation === "worktree" ? "worktree" : "shared",
        commit_policy: "verified_commit",
        allowed_paths: request.requested_write_paths?.length ? request.requested_write_paths : ["."],
        requires_code_changes: true,
        semantic_decision_receipt: routeResult?.receipt || null,
        route_decision: routeDecision,
        requires_verification: true,
        requires_independent_review: false,
        acceptance_mode: "main_agent_self_verification",
        test_agent_enabled: false,
        idempotency_key: `group-coordination:${request.coordination_request_id || qa.id}`,
        workflow_meta: {
          coordination_request_id: request.coordination_request_id || "",
          requested_by_agent: input.sourceProject,
          dispatched_by: "group_main_agent",
          requested_write_paths: request.requested_write_paths || [],
          required_capabilities: request.required_capabilities || [],
          execution_mode: dependencyDispatch.executionMode,
          dependency_dispatch: dependencyDispatch.safeProjection,
          source_task_agent_session_id: input.sourceTaskAgentSessionId || "",
          source_native_session_id: input.sourceNativeSessionId || "",
        },
      });
      updateTask(dependencyTask.id, { status: "pending", status_detail: dependencyDispatch.statusDetail });
      if (sourceTask) updateTask(sourceTask.id, {
        child_task_ids: uniqueStrings([...(Array.isArray(sourceTask.child_task_ids) ? sourceTask.child_task_ids : []), dependencyTask.id]),
        collaboration_state: {
          ...(sourceTask.collaboration_state || {}),
          phase: "waiting_dependency",
          coordination_request_id: request.coordination_request_id,
          dependency_task_id: dependencyTask.id,
          dependency_project: request.targetName,
          updated_at: new Date().toISOString(),
        },
        status_detail: `等待 ${request.targetName} 完成协作工作项`,
      });
      updateGroupCoordinationRequest(request.coordination_request_id, {
        status: "work_item_created",
        work_item_task_id: dependencyTask.id,
        auditType: "formal_work_item_created",
        auditDetail: `群聊主 Agent 已创建正式可写工作项并派发给 ${request.targetName}`,
      });
      if (input.taskId) appendTaskTimelineEvent(input.taskId, {
        type: "coordination_work_item_created",
        title: `主 Agent 已安排 ${request.targetName} 处理依赖`,
        detail: request.question,
        status: "active",
        phase: "waiting_dependency",
        agent: coordinator,
        data: { coordination_request_id: request.coordination_request_id, work_item_task_id: dependencyTask.id, target_project: request.targetName },
      });
      const queuedQa = upsertAgentQaItem({
        ...qa,
        status: "queued",
        work_item_task_id: dependencyTask.id,
        execution_mode: dependencyDispatch.executionMode,
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: dependencyDispatch.queueScope === "isolated_parallel" ? "parallel_work_item_queued" : "serial_work_item_queued", detail: dependencyDispatch.progressText }].slice(-30),
      });
      const queueResult = enqueueTask(dependencyTask.id, input.ctx);
      updateGroupCoordinationRequest(request.coordination_request_id, {
        status: queueResult.queued ? "work_item_created" : "waiting_agent",
        resolution: {
          target_project: request.targetName,
          work_item_task_id: dependencyTask.id,
          execution_mode: dependencyDispatch.executionMode,
          dispatch: dependencyDispatch.safeProjection,
          queue: queueResult,
        },
        auditType: queueResult.queued
          ? dependencyDispatch.queueScope === "isolated_parallel" ? "parallel_work_item_queued" : "serial_work_item_queued"
          : "work_item_waiting",
        auditDetail: queueResult.queued
          ? dependencyDispatch.progressText
          : queueResult.message || `等待 ${request.targetName} 执行通道就绪`,
      });
      emitAgentQaEvent(input.streamRes, "progress", queuedQa, queueResult.queued ? dependencyDispatch.progressText : queueResult.message || "协作会话等待启动");
      if (input.taskId) appendTaskTimelineEvent(input.taskId, {
        type: queueResult.queued
          ? dependencyDispatch.queueScope === "isolated_parallel" ? "coordination_parallel_session_queued" : "coordination_serial_session_queued"
          : "coordination_session_waiting",
        title: queueResult.queued ? dependencyDispatch.progressText : `${request.targetName} 的执行通道暂未就绪`,
        detail: queueResult.queued
          ? dependencyDispatch.queueScope === "isolated_parallel"
            ? "该工作项使用独立工作区并行执行，不会打断正在工作的任务"
            : "当前修改范围或仓库状态不适合并行写入，主 Agent 将在当前任务结束后继续处理"
          : queueResult.message || "等待执行通道恢复",
        status: queueResult.queued ? "active" : "warn",
        phase: "waiting_dependency",
        agent: coordinator,
        data: { coordination_request_id: request.coordination_request_id, work_item_task_id: dependencyTask.id, target_project: request.targetName, execution_mode: dependencyDispatch.executionMode, dispatch: dependencyDispatch.safeProjection, queue: queueResult },
      });
      continue;
    }

    if (arbitration.decision === "ask_user") {
      const needsUser = upsertAgentQaItem({
        ...qa,
        status: "needs_user",
        needs_user_at: new Date().toISOString(),
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "needs_user", detail: arbitration.reason }].slice(-30),
      });
      appendGroupMessage(input.groupId, buildAgentQaMessage("answer", needsUser, `主 Agent 仲裁：${arbitration.reason}\n需要用户确认后再继续。`));
      emitAgentQaEvent(input.streamRes, "answer", needsUser, `主 Agent 仲裁：${arbitration.reason}\n需要用户确认后再继续。`);
      updateGroupCoordinationRequest(request.coordination_request_id, { status: "needs_user", auditType: "needs_user", auditDetail: arbitration.reason });
      if (sourceTask?.id) {
        updateTask(sourceTask.id, {
          status: "blocked",
          status_detail: arbitration.reason,
          terminal_actor: "group-main-agent",
          collaboration_state: {
            ...(sourceTask.collaboration_state || {}),
            phase: "needs_user",
            coordination_request_id: request.coordination_request_id || "",
            route_decision: routeDecision,
            semantic_decision_receipt: routeResult?.receipt || routeFailureReceipt || null,
            updated_at: new Date().toISOString(),
          },
        });
        updateGroupTaskInlineStatus(sourceTask, "blocked", arbitration.reason);
        appendTaskTimelineEvent(sourceTask.id, {
          type: "semantic_route_needs_user",
          title: "协作目标需要用户确认",
          detail: arbitration.reason,
          status: "warn",
          phase: "needs_user",
          agent: "group-main-agent",
          data: {
            route_decision: routeDecision,
            semantic_decision_receipt: routeResult?.receipt || routeFailureReceipt || null,
          },
        });
      }
      continue;
    }
    if (arbitration.decision !== "ask_agent") {
      const rejected = upsertAgentQaItem({
        ...qa,
        status: "rejected",
        failed_at: new Date().toISOString(),
        answer: arbitration.reason,
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "rejected", detail: arbitration.reason }].slice(-30),
      });
      appendGroupMessage(input.groupId, buildAgentQaMessage("answer", rejected, arbitration.reason));
      emitAgentQaEvent(input.streamRes, "answer", rejected, arbitration.reason);
      updateGroupCoordinationRequest(request.coordination_request_id, { status: "failed", auditType: "rejected", auditDetail: arbitration.reason });
      continue;
    }

    const askingQa = upsertAgentQaItem({ ...qa, status: "asking", asked_at: new Date().toISOString() });
    const mention = {
      mention: `@${request.targetName}`,
      targetName: request.targetName,
      message: [
        `【Agent-to-Agent ${request.type === "request_review" ? "评审请求" : "询问"}】`,
        `问题 ID：${qa.id}；任务：${qa.task_id}；Execution：${qa.execution_id || "未绑定"}`,
        `来自：${input.sourceProject}`,
        request.reason ? `原因：${request.reason}` : "",
        qa.evidence?.length ? `已有证据：${qa.evidence.join("；")}` : "",
        `问题：${request.question}`,
        "权限契约：advisory_read_only。只允许读取和回答，不得修改文件、扩大工具/MCP 权限、跨项目执行或代替用户批准高风险操作。",
        "请直接回答该 Agent 的问题；如果涉及接口/字段/文件/验证，请给出可执行、可引用的证据。建议使用 reply_agent 并分别提供 answer 与 evidence。",
      ].filter(Boolean).join("\n"),
      requestId: qa.id,
      advisoryOnly: true,
      permissionContract: qa.permission_contract,
      structured: true,
    };
    const answerOutputs = await processCrossAgents(input.groupId, input.group, input.sourceProject, input.sourceOutput, [mention], input.configs, input.ctx, input.streamRes || null, 1, new Set<string>(), "sequential", "", input.taskId || "");
    const joinedAnswerText = answerOutputs.join("\n\n---\n\n");
    const reply = extractAgentQaReplies(joinedAnswerText, qa.id).pop();
    const answerText = reply?.answer || stripAgentQaProtocolBlocks(joinedAnswerText);
    const answerReceipt = parseFormattedReceiptsFromText(joinedAnswerText).find((item: any) => item.agent === request.targetName) || null;
    const boundary = answerReceipt?.permission_boundary || evaluateAdvisoryPermissionBoundary(
      (answerReceipt?.filesChanged || []).map((item: any) => typeof item === "string" ? { path: item } : item),
      { mcp: [], skill: [] },
      { mcp: [], skill: [] }
    );
    const siblingAnswers = loadAgentQaItems().filter((item: any) => item.task_id === qa.task_id && item.id !== qa.id && item.acceptance);
    const acceptance = evaluateCollaborationAnswer({ answer: answerText, evidence: reply?.evidence || qa.evidence || [] }, qa, siblingAnswers);
    if (!boundary.pass) {
      acceptance.status = "rejected";
      acceptance.accepted = false;
      acceptance.reason = boundary.reason;
    }
    const completedQa = upsertAgentQaItem({
      ...askingQa,
      status: answerText && acceptance.accepted ? "answered" : answerText ? "rejected" : "failed",
      answer: compactMemoryText(answerText || "目标 Agent 未返回可用回答", 4000),
      answer_evidence: acceptance.evidence,
      acceptance,
      permission_boundary: boundary,
      answered_at: new Date().toISOString(),
      audit: [...(Array.isArray(askingQa.audit) ? askingQa.audit : []), { at: new Date().toISOString(), type: answerText && acceptance.accepted ? "accepted" : answerText ? "rejected" : "failed", detail: acceptance.reason || (answerText ? "目标 Agent 已回答" : "目标 Agent 未返回可用回答") }].slice(-30),
    });
    updateGroupCoordinationRequest(request.coordination_request_id, {
      status: acceptance.accepted ? "resolved" : "failed",
      resolution: { target_project: request.targetName, answer: completedQa.answer, acceptance },
      auditType: acceptance.accepted ? "read_only_answer_accepted" : "read_only_answer_rejected",
      auditDetail: acceptance.reason,
    });
    appendGroupMessage(input.groupId, buildAgentQaMessage("answer", completedQa, completedQa.answer));
    emitAgentQaEvent(input.streamRes, "answer", completedQa, completedQa.answer);
    if (completedQa.acceptance?.accepted) writeAcceptedAgentQaToProjectMemory(completedQa);
    appendAgentQaTrace(input.taskId || "", "agent.qa.answer", completedQa, acceptance.reason, acceptance.accepted ? "ok" : "warn", { acceptance, permission_boundary: boundary });
    if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: acceptance.accepted ? "agent_qa_accepted" : "agent_qa_rejected", title: `${request.targetName} 回答${acceptance.accepted ? "已采纳" : "未采纳"}`, detail: acceptance.reason, status: acceptance.accepted ? "ok" : "warn", phase: acceptance.accepted ? "executing" : "waiting_dependency", agent: request.targetName, data: { qa_id: qa.id, acceptance, permission_boundary: boundary } });
    if (completedQa.status === "answered") answers.push(completedQa);
    outputs.push(...answerOutputs);
  }

  const blockingAnswers = answers.filter(item => item.blocking !== false && item.status === "answered");
  if (!blockingAnswers.length) return { outputs, resumedOutput: coordinationResumedOutput };

  const injectedAt = new Date().toISOString();
  const injectedAnswers = blockingAnswers.map((item: any) => upsertAgentQaItem({
    ...item,
    status: "injected",
    injected_at: injectedAt,
    audit: [...(Array.isArray(item.audit) ? item.audit : []), { at: injectedAt, type: "injected", detail: "回答已注入回原 Agent 续跑上下文" }].slice(-30),
  }));
  const resumePrompt = [
    "你正在 CCM 群聊中继续执行同一轮子 Agent 工作。系统刚刚帮你向其他子 Agent 提问并收到回答。",
    "请基于这些回答继续原任务，不要重复已经完成的工作；如果答案解除阻塞，请继续实现/验证；如果仍阻塞，请明确写入 CCM_AGENT_RECEIPT.blockers/needs。",
    "",
    "【你上一轮原始任务】",
    compactMemoryText(input.originalPrompt, 1800),
    "",
    "【你上一轮输出】",
    compactMemoryText(stripAgentQaProtocolBlocks(input.sourceOutput), 1800),
    "",
    "【其他 Agent 回答】",
    injectedAnswers.map((item, index) => `#${index + 1} ${item.to_agent} 回答 ${item.from_agent}\n问题：${item.question}\n回答：${compactMemoryText(item.answer, 1800)}`).join("\n\n"),
    "",
    "请继续完成你的工作，并在末尾提交新的 CCM_AGENT_RECEIPT。若还需要继续问其他 Agent，可以再次输出 ask_agent/request_review，但本轮系统只会记录，避免无限循环。",
  ].join("\n");

  const resumeMessageId = "m" + Date.now().toString(36) + "qar" + crypto.randomBytes(2).toString("hex");
  let resumeSession = input.taskId ? openTaskAgentSession({
    scopeId: input.taskId,
    taskId: input.taskId,
    groupId: input.groupId,
    project: input.sourceProject,
    agentType: input.sourceAgentType,
  }) : null;
  let resumedNativeSessionId = "";
  let resumedNativeContinuationEvidence: any = null;
  let resumeSucceeded = true;
  let resumeError = "";
  const resumedOutput = await input.ctx.callAgentForGroupStream(input.sourceProject, resumePrompt, input.sourceWorkDir, input.sourceAgentType, {
    res: input.streamRes || null,
    groupId: input.groupId,
    timeoutMs: 300000,
    messageId: resumeMessageId,
    allowedTools: input.allowedTools,
    mcpConfigPath: input.mcpConfigPath || "",
    taskId: input.taskId || "",
    executionId: input.taskId || "",
    agentSession: resumeSession ? getTaskAgentSessionOptions(resumeSession) : null,
    onDone: (opts: any) => {
      resumedNativeSessionId = String(opts?.nativeSessionId || "");
      resumedNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
      resumeSucceeded = opts?.isError !== true;
      resumeError = String(opts?.error || opts?.message || "");
    },
  });
  if (resumeSession) {
    resumeSession = recordTaskAgentSessionTurn(resumeSession.id, {
      nativeSessionId: resumedNativeSessionId,
      nativeContinuationEvidence: resumedNativeContinuationEvidence,
      nativeContinuationUnverified: resumedNativeContinuationEvidence?.nativeResumeRequested === true
        && resumedNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
      success: resumeSucceeded,
      error: resumeError || (!resumeSucceeded ? resumedOutput : ""),
    }) || resumeSession;
  }
  const resumedAt = new Date().toISOString();
  const resumedAnswerIds = injectedAnswers.map((item: any) => {
    const updated = upsertAgentQaItem({
      ...item,
      status: "resumed",
      resumed_at: resumedAt,
      resume_message_id: resumeMessageId,
      audit: [...(Array.isArray(item.audit) ? item.audit : []), { at: resumedAt, type: "resumed", detail: "原 Agent 已拿到回答并续跑" }].slice(-30),
    });
    if (updated.coordination_request_id) updateGroupCoordinationRequest(updated.coordination_request_id, { status: "resumed", auditType: "source_agent_resumed", auditDetail: "只读协作结论已注入原 Agent 会话" });
    return updated.id;
  });
  appendGroupMessage(input.groupId, {
    id: resumeMessageId,
    role: "assistant",
    agent: input.sourceProject,
    type: "agent_qa_resume",
    content: resumedOutput,
    timestamp: new Date().toISOString(),
    task_id: input.taskId || undefined,
    qa: {
      kind: "resume",
      from_agent: input.sourceProject,
      answers: resumedAnswerIds,
      status: "resumed",
      injected_at: injectedAt,
      resumed_at: resumedAt,
    },
  });
  const resumeQa = {
    id: "qa_resume_" + Date.now().toString(36) + "_" + crypto.randomBytes(2).toString("hex"),
    group_id: input.groupId,
    task_id: input.taskId || "",
    from_agent: input.sourceProject,
    to_agent: input.sourceProject,
    status: "resumed",
    answer: compactMemoryText(resumedOutput, 2000),
    injected_at: injectedAt,
    resumed_at: resumedAt,
  };
  emitAgentQaEvent(input.streamRes, "resume", resumeQa, resumedOutput);
  outputs.push(formatCollectedAgentOutput(input.sourceProject, resumedOutput, extractAgentReceipt(resumedOutput, input.sourceProject)));
  if (input.taskId) addTaskLog(input.taskId, "info", `Agent 问答完成后已续跑：${input.sourceProject}`);
  if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: "agent_qa_resume", title: `${input.sourceProject} 拿到回答并续跑`, detail: compactMemoryText(resumedOutput, 500), status: resumeSucceeded ? "ok" : "warn", phase: "executing", agent: input.sourceProject, data: { answers: resumedAnswerIds, session_id: resumeSession?.id || "", native_session_id: resumeSession?.nativeSessionId || "", resume_mode: resumeSession?.resumeMode || "" } });
  appendAgentQaTrace(input.taskId || "", "agent.qa.resumed", resumeQa, `${input.sourceProject} 已被回答事件唤醒并续跑`, resumeSucceeded ? "ok" : "warn", { answers: resumedAnswerIds, session_id: resumeSession?.id || "", native_session_id: resumeSession?.nativeSessionId || "", resume_mode: resumeSession?.resumeMode || "" });
  if (input.taskId) updateGroupTaskInlineStatus(getTaskById(input.taskId) || { id: input.taskId, group_id: input.groupId }, "in_progress", `${input.sourceProject} 已收到回答并从${resumeSession?.resumeMode === "native" ? "原生会话" : "任务会话"}续跑`);
  updateGroupMemory(input.groupId, {
    currentPhase: "executing",
    decisions: {
      type: "agent_qa_acceptance",
      taskId: input.taskId || "",
      project: input.sourceProject,
      summary: `${input.sourceProject} 已采纳 ${injectedAnswers.length} 条 Agent 回答并续跑`,
      qa_ids: resumedAnswerIds,
      evidence: injectedAnswers.flatMap((item: any) => item.answer_evidence || []).slice(0, 20),
    },
    nextAction: `主 Agent 等待 ${input.sourceProject} 续跑结果说明并进行最终验收`,
  });
  return { outputs, resumedOutput: resumedOutput || coordinationResumedOutput };
}

export function evaluateCoordinationImplementationReceipt(receipt: any, request: any) {
  const status = String(receipt?.status || "").toLowerCase();
  const filesChanged = uniqueStrings((receipt?.filesChanged || receipt?.files_changed || []).map((item: any) => typeof item === "string" ? item : item?.path)).slice(0, 80);
  const verification = uniqueStrings(receipt?.verification || receipt?.tests || []).slice(0, 60);
  const blockers = uniqueStrings(receipt?.blockers || []).slice(0, 30);
  const requiresFiles = Array.isArray(request.requested_write_paths) && request.requested_write_paths.length > 0;
  const accepted = status === "done" && blockers.length === 0 && (!requiresFiles || filesChanged.length > 0) && verification.length > 0;
  const gaps = [
    status !== "done" ? `结果状态为 ${status || "missing"}` : "",
    blockers.length ? `仍有阻塞：${blockers.join("；")}` : "",
    requiresFiles && !filesChanged.length ? "未提供实际代码变更证据" : "",
    !verification.length ? "未提供验证证据" : "",
  ].filter(Boolean);
  return {
    status: accepted ? "accepted" : "needs_evidence",
    accepted,
    score: accepted ? 100 : Math.max(0, 100 - gaps.length * 25),
    evidence: [...filesChanged, ...verification].slice(0, 100),
    files_changed: filesChanged,
    verification,
    gaps,
    reason: accepted ? "正式工作项已完成，代码变更和验证证据均通过群聊主 Agent 验收" : `正式工作项尚未通过验收：${gaps.join("；")}`,
    arbitrated_by: "group_main_agent_work_item_gate",
    arbitrated_at: new Date().toISOString(),
  };
}

function inspectCoordinationWorkspaceChanges(execution: any) {
  const workDir = String(execution?.workspace?.worktreePath || execution?.packet?.workDir || "").trim();
  if (!workDir || !fs.existsSync(workDir)) return [];
  const result = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all", "-z"], { cwd: workDir, encoding: "utf-8", windowsHide: true });
  if (result.status !== 0) return [];
  const entries = String(result.stdout || "").split("\0").filter(Boolean);
  const files: any[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const status = entry.slice(0, 2).trim() || "modified";
    const filePath = entry.slice(3).replace(/\\/g, "/").trim();
    if (!filePath) continue;
    files.push({ path: filePath, status, source: "git_worktree" });
    if (/R|C/.test(entry.slice(0, 2)) && entries[index + 1]) index++;
  }
  return files;
}

function inspectCoordinationBranchFreshness(execution: any) {
  const workspace = execution?.workspace || {};
  if (workspace?.mode !== "worktree") return { fresh: true, reason: "serial_workspace" };
  const originalWorkDir = String(workspace?.originalWorkDir || "").trim();
  const baseBranch = String(workspace?.baseBranch || "").trim();
  const baseHead = String(workspace?.baseHead || "").trim();
  if (!originalWorkDir || !baseBranch || !baseHead || !fs.existsSync(originalWorkDir)) return { fresh: false, reason: "base_identity_missing" };
  const current = spawnSync("git", ["rev-parse", baseBranch], { cwd: originalWorkDir, encoding: "utf-8", windowsHide: true });
  if (current.status !== 0) return { fresh: false, reason: "base_identity_unavailable" };
  return String(current.stdout || "").trim() === baseHead
    ? { fresh: true, reason: "base_unchanged" }
    : { fresh: false, reason: "base_repo_drifted" };
}

export function evaluateCoordinationTaskEvidence(task: any, request: any, receipt: any, execution: any) {
  const base = evaluateCoordinationImplementationReceipt(receipt, request);
  const mainAgentVerification = task?.main_agent_self_verification
    || execution?.data?.main_agent_self_verification
    || execution?.mainAgentSelfVerification
    || execution?.main_agent_self_verification
    || null;
  const mainAgentVerificationPassed = mainAgentVerification?.canAccept === true
    && mainAgentVerification?.deterministic_gate?.pass === true;
  const branchFreshness = inspectCoordinationBranchFreshness(execution);
  const mainAgentVerificationCommands = uniqueStrings((Array.isArray(mainAgentVerification?.verification_results)
    ? mainAgentVerification.verification_results
    : [])
    .filter((item: any) => item?.status === "passed" && Number(item?.exit_code ?? 0) === 0)
    .map((item: any) => item.command || item.id)).slice(0, 40);
  const inspectedWorkspaceFiles = inspectCoordinationWorkspaceChanges(execution);
  const persistedAcceptance = task?.coordination_acceptance || request?.resolution?.acceptance || execution?.data?.coordination_acceptance || {};
  const workspaceFiles = inspectedWorkspaceFiles.length
    ? inspectedWorkspaceFiles
    : execution?.workspace?.mergedAt && execution?.workspace?.mergeCommit && Array.isArray(persistedAcceptance.workspace_files)
      ? persistedAcceptance.workspace_files
      : [];
  const declaredFiles = uniqueStrings(base.files_changed || []);
  const actualFiles = uniqueStrings(workspaceFiles.map((item: any) => item.path));
  const requiresFiles = Array.isArray(request?.requested_write_paths) && request.requested_write_paths.length > 0;
  const declaredMatch = !requiresFiles || declaredFiles.some((file: string) => actualFiles.includes(file));
  const gaps = uniqueStrings([
    ...(base.gaps || []),
    !mainAgentVerification ? "缺少群聊主 Agent 验收回执" : "",
    mainAgentVerification && !mainAgentVerificationPassed ? "群聊主 Agent 验收未通过确定性门禁" : "",
    !branchFreshness.fresh ? "权威项目状态已漂移，不能安全合并" : "",
    requiresFiles && !actualFiles.length ? "独立 worktree 未检测到真实代码差异" : "",
    requiresFiles && actualFiles.length > 0 && !declaredMatch ? "结果说明中的文件与 worktree 实际差异不一致" : "",
  ]).filter(Boolean);
  const accepted = base.accepted && mainAgentVerificationPassed && branchFreshness.fresh && gaps.length === 0;
  return {
    ...base,
    status: accepted ? "accepted" : "needs_evidence",
    accepted,
    score: accepted ? 100 : Math.min(Number(base.score || 0), Math.max(0, 100 - gaps.length * 25)),
    gaps,
    workspace_files: workspaceFiles,
    main_agent_verification: mainAgentVerification ? {
      accepted: mainAgentVerificationPassed,
      checksum: String(mainAgentVerification?.checksum || ""),
      verification: mainAgentVerificationCommands,
      content_stored: false,
    } : null,
    branch_fresh: branchFreshness.fresh,
    branch_freshness: { fresh: branchFreshness.fresh, reason: branchFreshness.reason, content_stored: false },
    evidence: uniqueStrings([...(base.evidence || []), ...actualFiles, ...mainAgentVerificationCommands]).slice(0, 120),
    reason: accepted
      ? "正式工作项已完成，真实代码差异和验证证据均通过群聊主 Agent 验收"
      : `正式工作项尚未通过验收：${gaps.join("；")}`,
  };
}

export function getCoordinationRequestForTask(task: any) {
  const requestId = String(task?.workflow_meta?.coordination_request_id || "").trim();
  if (!requestId) return null;
  return listGroupCoordinationRequests({ groupId: task.group_id || "", taskId: task.parent_task_id || "" })
    .find((item: any) => item.id === requestId)
    || listGroupCoordinationRequests({ groupId: task.group_id || "" }).find((item: any) => item.id === requestId)
    || null;
}

export function getCoordinationQaForRequest(requestId: string) {
  return loadAgentQaItems().find((item: any) => String(item.coordination_request_id || "") === String(requestId || "")) || null;
}

export function coordinationAuditHas(request: any, type: string) {
  return Array.isArray(request?.audit) && request.audit.some((item: any) => item?.type === type);
}

// ===== merged from collaboration-runtime-cross-agent-runtime-part-02.ts =====

// === 跨 Agent 并行与递归协作（核心）===


export function markGroupCoordinationDependencyStarted(task: any, workspace: any, session: any) {
  if (task?.workflow_type !== "agent_coordination_dependency") return null;
  const request = getCoordinationRequestForTask(task);
  if (!request || ["resumed", "failed", "cancelled", "timeout"].includes(request.status)) return request;
  const qa = getCoordinationQaForRequest(request.id);
  const isolatedWorktree = workspace?.mode === "worktree" && task?.queue_scope === "isolated_parallel";
  const startAuditType = isolatedWorktree ? "parallel_session_started" : "serial_session_started";
  const execution = {
    mode: isolatedWorktree ? "isolated_dependency_branch" : "queued_continuation",
    target_project: task.target_project || request.target_hint || "",
    work_item_task_id: task.id,
    task_agent_session_id: session?.id || "",
    native_session_id: session?.nativeSessionId || "",
    agent_type: session?.agentType || "",
    workspace_mode: workspace?.mode || "",
    worktree_path: workspace?.worktreePath || "",
    worktree_branch: workspace?.worktreeBranch || "",
    original_work_dir: workspace?.originalWorkDir || "",
    started_at: new Date().toISOString(),
  };
  updateGroupCoordinationRequest(request.id, {
    status: "executing",
    resolution: { ...(request.resolution || {}), execution },
    auditType: coordinationAuditHas(request, startAuditType) ? `${startAuditType}_heartbeat` : startAuditType,
    auditDetail: isolatedWorktree
      ? `${task.target_project} 已在独立工作区中并行执行协作依赖`
      : `${task.target_project} 已在原有执行通道中开始处理已排队的协作依赖`,
  });
  if (!coordinationAuditHas(request, startAuditType)) {
    const runningQa = qa ? upsertAgentQaItem({
      ...qa,
      status: "executing",
      execution_mode: execution.mode,
      coordination_execution: execution,
      work_item_task_id: task.id,
      audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: execution.started_at, type: isolatedWorktree ? "parallel_session_started" : "serial_session_started", detail: isolatedWorktree ? `${task.target_project} 已在独立工作区开始实现` : `${task.target_project} 已开始处理排队的协作依赖` }].slice(-30),
    }) : null;
    if (runningQa) appendGroupMessage(task.group_id, buildAgentQaMessage("progress", runningQa, isolatedWorktree ? `${task.target_project} 正在独立工作区执行` : `${task.target_project} 已开始处理协作依赖`));
    if (task.parent_task_id) appendTaskTimelineEvent(task.parent_task_id, {
      type: isolatedWorktree ? "coordination_parallel_session_started" : "coordination_serial_session_started",
      title: isolatedWorktree ? `${task.target_project} 已在独立工作区开始处理` : `${task.target_project} 已开始处理协作依赖`,
      detail: isolatedWorktree ? "该协作工作项与目标 Agent 的原有任务并行运行，完成后由群聊主 Agent 验收和合并" : "当前任务已结束，协作依赖现在由目标 Agent 串行处理",
      status: "active",
      phase: "waiting_dependency",
      agent: task.target_project,
      data: { coordination_request_id: request.id, execution },
    });
    appendTaskTimelineEvent(task.id, {
      type: "coordination_isolated_workspace_ready",
      title: isolatedWorktree ? "独立工作区已准备" : "协作任务已开始",
      detail: isolatedWorktree ? `${session?.agentType || "第三方 Agent"} 已启动，代码修改已与其他会话隔离` : `${session?.agentType || "第三方 Agent"} 已在安全串行通道开始处理`,
      status: "ok",
      phase: "executing",
      agent: task.target_project,
      data: execution,
    });
    safeAddGroupLog(task.group_id, "info", "agent_coordination", isolatedWorktree ? `${task.target_project} 已在独立工作区并行处理协作依赖` : `${task.target_project} 已开始串行处理协作依赖`, { coordination_request_id: request.id, execution });
  }
  return execution;
}

export function buildRejectedCoordinationAcceptance(task: any, request: any, receipt: any, reason: string) {
  const base = evaluateCoordinationImplementationReceipt(receipt, request);
  const gaps = uniqueStrings([...(base.gaps || []), reason]).filter(Boolean);
  return {
    ...base,
    status: "needs_evidence",
    accepted: false,
    score: Math.min(Number(base.score || 0), 50),
    gaps,
    reason: `正式工作项尚未通过验收：${gaps.join("；")}`,
  };
}

export async function settleGroupCoordinationDependency(task: any, ctx: CollabCtx, streamRes: any = null) {
  if (task?.workflow_type !== "agent_coordination_dependency") return { handled: false, reason: "not_coordination_dependency" };
  const request = getCoordinationRequestForTask(task);
  if (!request) return { handled: false, reason: "coordination_request_missing" };
  if (request.status === "resumed") return { handled: true, duplicate: true, status: "resumed" };
  if (request.status === "merge_conflict" && task.status === "failed") {
    return { handled: true, pending: true, status: "merge_conflict", reason: task.status_detail || "等待处理代码合并冲突" };
  }
  if (coordinationSettlementInFlight.has(request.id)) return { handled: true, duplicate: true, status: "settling" };
  coordinationSettlementInFlight.add(request.id);
  try {
    const qa = getCoordinationQaForRequest(request.id);
    if (!qa) return { handled: false, reason: "coordination_qa_missing" };
    if (request.status === "resolved" && qa.status === "resumed") {
      updateGroupCoordinationRequest(request.id, { status: "resumed", auditType: "source_agent_resume_reconciled", auditDetail: "重启恢复时已确认原 Agent 会话此前完成续跑" });
      return { handled: true, duplicate: true, accepted: true, resumed: true, status: "resumed" };
    }
    if (request.status === "resolved" && qa.acceptance?.accepted) {
      const group = loadGroups().find((item: any) => item.id === task.group_id);
      if (!group) return { handled: true, accepted: true, resumed: false, reason: "group_missing" };
      const wakeup = await resumeAgentQaFromStoredContinuation(qa, group, ctx, streamRes);
      updateGroupCoordinationRequest(request.id, {
        status: wakeup.resumed ? "resumed" : "resolved",
        auditType: wakeup.resumed ? "source_agent_resumed_after_restart" : "source_agent_resume_waiting",
        auditDetail: wakeup.resumed ? "服务恢复后，原 Agent 已收到合并结果并继续原任务" : wakeup.reason || "原 Agent 暂未恢复，等待自动重试",
      });
      return { handled: true, accepted: true, resumed: wakeup.resumed, wakeup, reason: wakeup.reason };
    }
    const execution = loadExecution(task.id);
    const receipt = task.receipt || execution?.receipt || null;
    const hasReturned = ["done", "failed", "cancelled"].includes(String(task.status || ""))
      || (!!receipt && !runningTaskIds.has(task.id) && !isTaskQueuedInMemory(task.id));
    if (!hasReturned) return { handled: true, pending: true, status: task.status };

    let acceptance: any = evaluateCoordinationTaskEvidence(task, request, receipt, execution);
    if (task.status !== "done") {
      acceptance = buildRejectedCoordinationAcceptance(task, request, receipt, `执行状态为 ${task.status || "unknown"}`);
    }
    updateGroupCoordinationRequest(request.id, {
      status: "evidence_review",
      resolution: { ...(request.resolution || {}), target_project: task.target_project, work_item_task_id: task.id, receipt, acceptance },
      auditType: "evidence_review",
      auditDetail: acceptance.reason,
    });
    if (task.parent_task_id) appendTaskTimelineEvent(task.parent_task_id, {
      type: "coordination_evidence_review",
      title: `主 Agent 正在验收 ${task.target_project} 的协作结果`,
      detail: acceptance.accepted ? "代码变更和验证证据已齐全，准备安全合并" : acceptance.reason,
      status: acceptance.accepted ? "active" : "warn",
      phase: "reviewing",
      agent: "coordinator",
      data: { coordination_request_id: request.id, work_item_task_id: task.id, acceptance },
    });

    let mergeResult: any = { required: false, success: true };
    if (acceptance.accepted && execution?.workspace?.mode === "worktree") {
      const mergingQa = upsertAgentQaItem({
        ...qa,
        status: "merging",
        work_item_task_id: task.id,
        acceptance,
        coordination_execution: { ...(qa.coordination_execution || {}), workspace: execution.workspace },
      });
      updateGroupCoordinationRequest(request.id, {
        status: "merging",
        auditType: "worktree_merge_started",
        auditDetail: `主 Agent 开始把 ${task.target_project} 的已验证变更安全合并回项目`,
      });
      if (!coordinationAuditHas(request, "worktree_merge_started")) {
        appendGroupMessage(task.group_id, buildAgentQaMessage("progress", mergingQa, "实现和验证已完成，正在安全合并代码"));
      }
      try {
        mergeResult = mergeExecutionWorktree(task.id, {
          message: `feat: complete coordination dependency ${task.id}`,
          mergeMessage: `merge: coordination dependency ${task.id}`,
        });
        if (!loadExecution(task.id)?.workspace?.cleanedAt) {
          try { cleanupExecutionWorktree(task.id); } catch (cleanupError: any) {
            addTaskLog(task.id, "warning", `协作 worktree 已合并但清理失败：${cleanupError?.message || cleanupError}`);
          }
        }
      } catch (error: any) {
        mergeResult = { required: true, success: false, error: error?.message || String(error) };
        acceptance = buildRejectedCoordinationAcceptance(task, request, receipt, `代码安全合并失败：${mergeResult.error}`);
        updateTask(task.id, { status: "failed", status_detail: acceptance.reason, merge_result: mergeResult });
        updateGroupCoordinationRequest(request.id, {
          status: "merge_conflict",
          resolution: { ...(request.resolution || {}), receipt, acceptance, merge: mergeResult },
          auditType: "worktree_merge_failed",
          auditDetail: acceptance.reason,
        });
      }
    }

    const latestQa = getCoordinationQaForRequest(request.id) || qa;
    const completedQa = upsertAgentQaItem({
      ...latestQa,
      status: acceptance.accepted ? "answered" : "rejected",
      answer: compactMemoryText(receipt?.summary || acceptance.reason, 4000),
      answer_evidence: acceptance.evidence,
      acceptance: { ...acceptance, merge: mergeResult },
      work_item_task_id: task.id,
      answered_at: new Date().toISOString(),
      audit: [...(Array.isArray(latestQa.audit) ? latestQa.audit : []), { at: new Date().toISOString(), type: acceptance.accepted ? "work_item_accepted" : "work_item_rejected", detail: acceptance.reason }].slice(-30),
    });
    appendGroupMessage(task.group_id, buildAgentQaMessage("answer", completedQa, completedQa.answer));
    emitAgentQaEvent(streamRes, "answer", completedQa, completedQa.answer);
    appendAgentQaTrace(task.parent_task_id || "", "agent.coordination.work_item_review", completedQa, acceptance.reason, acceptance.accepted ? "ok" : "warn", { coordination_request_id: request.id, work_item_task_id: task.id, acceptance, merge: mergeResult });

    const sourceTask = getTaskById(task.parent_task_id || "");
    if (sourceTask) updateTask(sourceTask.id, {
      collaboration_state: {
        ...(sourceTask.collaboration_state || {}),
        phase: acceptance.accepted ? "executing" : "waiting_dependency",
        dependency_status: acceptance.accepted ? "accepted" : "rejected",
        dependency_task_id: task.id,
        coordination_request_id: request.id,
        merge_result: mergeResult,
        updated_at: new Date().toISOString(),
      },
      status_detail: acceptance.accepted ? `${task.target_project} 的协作代码已验收并合并，正在恢复原任务` : acceptance.reason,
    });
    if (task.parent_task_id) appendTaskTimelineEvent(task.parent_task_id, {
      type: acceptance.accepted ? "coordination_dependency_merged" : "coordination_dependency_rejected",
      title: acceptance.accepted ? `${task.target_project} 的协作代码已验收并合并` : `${task.target_project} 的协作结果需要处理`,
      detail: acceptance.reason,
      status: acceptance.accepted ? "ok" : "warn",
      phase: acceptance.accepted ? "executing" : "waiting_dependency",
      agent: "coordinator",
      data: { coordination_request_id: request.id, work_item_task_id: task.id, acceptance, merge: mergeResult },
    });
    if (!acceptance.accepted) {
      const mergeConflict = mergeResult?.required === true && mergeResult?.success === false;
      updateGroupCoordinationRequest(request.id, { status: mergeConflict ? "merge_conflict" : "failed", auditType: mergeConflict ? "merge_conflict_waiting_rework" : "acceptance_failed", auditDetail: acceptance.reason });
      return { handled: true, accepted: false, acceptance, merge: mergeResult };
    }

    updateGroupCoordinationRequest(request.id, {
      status: "resolved",
      resolution: { ...(request.resolution || {}), receipt, acceptance, merge: mergeResult },
      auditType: "resolved",
      auditDetail: "正式工作项已通过主 Agent 验收并安全合并，准备恢复原 Agent",
    });
    const group = loadGroups().find((item: any) => item.id === task.group_id);
    if (!group) return { handled: true, accepted: true, resumed: false, reason: "group_missing" };
    const wakeup = await resumeAgentQaFromStoredContinuation(completedQa, group, ctx, streamRes);
    if (wakeup.resumed) {
      updateGroupCoordinationRequest(request.id, { status: "resumed", auditType: "source_agent_resumed", auditDetail: "原 Agent 已收到合并后的依赖结果并从原任务会话继续" });
      return { handled: true, accepted: true, resumed: true, wakeup, merge: mergeResult };
    }
    updateGroupCoordinationRequest(request.id, { status: "resolved", auditType: "source_agent_resume_waiting", auditDetail: wakeup.reason || "原 Agent 暂未恢复，等待自动重试" });
    return { handled: true, accepted: true, resumed: false, reason: wakeup.reason, merge: mergeResult };
  } finally {
    coordinationSettlementInFlight.delete(request.id);
  }
}

export async function recoverGroupCoordinationDependencies(ctx: CollabCtx) {
  const requests = listGroupCoordinationRequests({}).filter((item: any) => ["work_item_created", "executing", "evidence_review", "merging", "merge_conflict", "resolved"].includes(item.status));
  const results: any[] = [];
  for (const request of requests) {
    const task = getTaskById(request.work_item_task_id || "");
    if (!task) {
      results.push({ request_id: request.id, recovered: false, reason: "work_item_missing" });
      continue;
    }
    if (["pending", "queued"].includes(task.status) && task.auto_execute !== false && !isTaskQueuedInMemory(task.id) && !runningTaskIds.has(task.id)) {
      results.push({ request_id: request.id, task_id: task.id, ...enqueueTask(task.id, ctx) });
      continue;
    }
    const settled = await settleGroupCoordinationDependency(task, ctx);
    results.push({ request_id: request.id, task_id: task.id, ...settled });
  }
  return { total: requests.length, results };
}

export async function runGroupCoordinationBusinessChainTestTurn(input: any) {
  return handleAgentQaRequests(input);
}

function buildCoordinatorVisibleMessageContent(content: any, fallback = "我已整理这次协作进展，技术细节已放入技术详情。", maxLength = 4000) {
  const polish = (value: string) => String(value || "")
    .replace(/\bcompleted\b/gi, "已完成")
    .replace(/\bfailed\b/gi, "失败")
    .replace(/\bblocked\b/gi, "阻塞")
    .replace(/\bpartial\b/gi, "部分完成")
    .replace(/\bmissing_receipt\b/gi, "缺少结果说明")
    .replace(/\bdone\b/gi, "完成")
    .replace(/的\s+表示\s+/g, "：")
    .replace(/\s*，\s*。/g, "。")
    .replace(/\s+/g, " ")
    .trim();
  const raw = String(content || "").trim();
  if (!raw) return fallback;
  const hasInternalSignals = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|task-id|WorkerContextPacket|trace_id|session_id|native_session|scratchpad|raw\s+receipt|raw\s+payload|runtime kernel|workflow_timeline/i.test(raw);
  if (hasInternalSignals) {
    return polish(sanitizeCoordinatorUserText(raw, fallback, Math.min(maxLength, 1200)));
  }
  const lines = raw.split(/\r?\n/).map((line: string) => {
    if (!line.trim()) return "";
    return polish(sanitizeCoordinatorUserText(line, "", 900));
  });
  const visible = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return visible ? compactMemoryText(visible, maxLength) : fallback;
}

export function getCoordinatorVisibleMessageSelfTest() {
  const raw = [
    "📋 **协调复盘**",
    "",
    "web-app 的 <task-notification> 表示 completed，trace_id=abc123。",
    "CCM_AGENT_RECEIPT: {\"status\":\"done\"}",
  ].join("\n");
  const visible = buildCoordinatorVisibleMessageContent(raw, "我已整理执行成员的结果。", 1200);
  const friendly = buildCoordinatorVisibleMessageContent("📋 **协调复盘**\n\n- web-app：已完成页面入口。", "", 1200);
  return {
    pass: !/CCM_AGENT_RECEIPT|task-notification|trace_id|session_id|WorkerContextPacket/i.test(visible)
      && visible.includes("web-app")
      && /结果|主 Agent|技术详情|完成/i.test(visible)
      && friendly.includes("web-app")
      && friendly.includes("已完成页面入口"),
    visible,
    friendly,
  };
}

export async function appendCoordinatorMessage(
  groupId: string,
  agent: string,
  content: string,
  streamRes: any = null,
  suffix = "review",
  metadata: any = {}
) {
  const messageId = "m" + Date.now().toString(36) + suffix + crypto.randomBytes(2).toString("hex");
  const rawContent = String(content || "");
  const visibleContent = buildCoordinatorVisibleMessageContent(rawContent);
  const messageMetadata = { ...metadata };
  if (visibleContent !== rawContent && !messageMetadata.technical_content && !messageMetadata.technicalContent) {
    messageMetadata.technical_content = rawContent;
  }
  appendGroupMessage(groupId, {
    id: messageId,
    role: "assistant",
    agent,
    content: visibleContent,
    timestamp: new Date().toISOString(),
    ...messageMetadata,
  });
  writeSse(streamRes, {
    type: "agent_done",
    agent,
    text: visibleContent,
    messageId,
    ...messageMetadata,
  });
  return messageId;
}

export function buildCoordinatorReworkRoutingDecision(item: any, input: { previousLedger?: any; userMessage?: string; coordinatorOutput?: string } = {}) {
  return require("./collaboration-test-agent-runtime").buildCoordinatorReworkRoutingDecision(item, input);
}

export function getMentionReworkRoute(mention: any) {
  if (!mention || typeof mention === "string") return null;
  const route = mention.reworkRoute || mention.rework_route || mention.routing || null;
  return route && typeof route === "object" ? route : null;
}

export function coordinatorReworkRouteRequiresStop(route: any) {
  if (!route || typeof route !== "object") return false;
  return route.requires_stop === true || /stop_wrong_direction/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}

export function coordinatorReworkRouteNeedsFreshVerifier(route: any) {
  if (!route || typeof route !== "object") return false;
  return route.requires_fresh_verifier === true
    || /fresh_verification|fresh_verifier|independent/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}

export function coordinatorReworkRouteUsesVerifier(route: any) {
  if (!route || typeof route !== "object") return false;
  return coordinatorReworkRouteNeedsFreshVerifier(route)
    || /resume_verifier|same_verifier|test_agent_recheck/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}

export function selectCoordinatorIndependentVerifier(group: any, originalTarget = "") {
  return require("./collaboration-test-agent-runtime").selectCoordinatorIndependentVerifier(group, originalTarget);
}

export function isCoordinatorTestAgentName(value: any) {
  return /^(?:test[-_\s]*agent|测试\s*agent)$/i.test(String(value || "").trim());
}

export function resolveProjectRuntimeForTestAgentHandoff(group: any, project: string) {
  const name = String(project || "").trim();
  if (!name) return { workDir: "", agentType: "", source: "missing" };
  const directMember = (group?.members || []).find((member: any) => String(member?.project || "").trim() === name);
  const directWorkDir = String(directMember?.workDir || directMember?.work_dir || "").trim();
  if (directWorkDir) {
    return { workDir: directWorkDir, agentType: String(directMember?.agentType || directMember?.agent || ""), source: "group_member" };
  }
  try {
    const runtime = resolveMemberRuntime(name, group, getConfigs());
    if (runtime?.workDir) return { workDir: String(runtime.workDir || ""), agentType: String(runtime.agentType || ""), source: "member_runtime" };
  } catch {}
  try {
    for (const config of getConfigs()) {
      for (const info of getConfigInfo(config.path)) {
        if (String(info.name || "").trim() === name) {
          return { workDir: String(info.workDir || ""), agentType: String(info.agent || ""), source: "project_config" };
        }
      }
    }
  } catch {}
  return { workDir: "", agentType: "", source: "missing" };
}

function fileEntryMatchesProject(item: any, project: string) {
  if (!project || typeof item === "string") return true;
  const owner = String(item?.project || item?.agent || item?.target_project || item?.targetProject || "").trim();
  return !owner || owner === project;
}

export function collectCoordinatorChangedFiles(value: any, project = ""): string[] {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.files)
      ? value.files
      : Array.isArray(value?.changes)
        ? value.changes
        : value ? [value] : [];
  return uniqueStrings(source
    .filter((item: any) => fileEntryMatchesProject(item, project))
    .map((item: any) => typeof item === "string" ? item : item?.path || item?.file || item?.name || item?.relative_path || item?.relativePath || "")
    .filter(Boolean)).slice(0, 40);
}

function normalizeCoordinatorVerificationEvidenceCommand(value: any) {
  let source = String(value || "").trim();
  if (!source) return "";
  source = source
    .replace(/^[-*+]\s+/, "")
    .replace(/^`+|`+$/g, "")
    .split(/\r?\n/, 1)[0]
    .trim();
  if (!source || /[;&|<>]/.test(source)) return "";

  const packageCommand = source.match(/^(npm|pnpm|yarn|bun)\s+(?:run\s+)?([a-zA-Z0-9][a-zA-Z0-9:._-]*)\b/i);
  if (packageCommand) {
    const manager = packageCommand[1].toLowerCase();
    const script = packageCommand[2];
    return `${manager} run ${script}`;
  }

  const command = source
    .split(/\s+(?:→|=>|passed\b|failed\b|verified\b|succeeded\b|exit(?:\s+code)?\s*[=:])/i, 1)[0]
    .replace(/:\s+(?=(?:node|python|pytest|jest|vitest|verified|passed|failed|built|compiled|exit)\b).*$/i, "")
    .trim();
  if (!command || !/^(?:npx\s+(?:tsc|jest|vitest|eslint)|pytest\b|python\s+-m\s+pytest\b|jest\b|vitest\b|tsc\b|go\s+test\b|cargo\s+test\b|mvn(?:w|\.cmd)?\s+test\b|gradle(?:w|\.bat)?\s+test\b)/i.test(command)) return "";
  return /^[a-zA-Z0-9_./:@%+=,\-\s]+$/.test(command) ? command : "";
}

export function collectCoordinatorVerificationCommands(project: string, workDir = "", previousLedger: any = null) {
  const fromLedger = Array.isArray(previousLedger?.verification) ? previousLedger.verification : [];
  const commands = uniqueStrings([
    ...buildProjectVerificationHints(project, workDir),
    ...fromLedger.map(normalizeCoordinatorVerificationEvidenceCommand).filter(Boolean),
  ]);
  return commands.slice(0, 8);
}

function isCoordinatorOnlyAcceptanceCriterion(value: any) {
  const criterion = String(value || "").trim();
  if (!criterion) return true;
  const namesCoordinator = /(?:主\s*Agent|主智能体|协调(?:者|Agent)|coordinator|global\s+agent)/i.test(criterion);
  const describesCoordinatorDuty = /(?:总结|汇报|协调|分派|派发|调度|计划|todo|验收|复盘|审核|最终答复|最终回复|用户可见|技术详情)/i.test(criterion);
  if (namesCoordinator && describesCoordinatorDuty) return true;
  if (/(?:最终报告|最终总结|交付总结|完成报告).*(?:说明|包含|覆盖|变更文件|验证结果|风险|用户)/i.test(criterion)) return true;
  if (/(?:涉及代码|代码任务|代码变更).*(?:实际文件变更|变更文件).*(?:构建|测试|验证).*证据/i.test(criterion)) return true;
  if (/(?:TestAgent|测试\s*Agent|独立复核|独立验证|主\s*Agent.*抽查)/i.test(criterion)) return true;
  if (/(?:项目执行成员|子\s*Agent|原实现(?:成员|Agent)?).*(?:说明|汇报|返回|回传).*(?:实际动作|文件变(?:化|更)|验证|风险)/i.test(criterion)) return true;
  if (/(?:复核|验证).*(?:失败|未通过).*(?:返工|修复).*(?:复验|重跑|重新(?:复核|验证))/i.test(criterion)) return true;
  return false;
}

export function isCoordinatorReviewInstruction(value: any) {
  const text = String(value || "").trim();
  if (!text) return true;
  return /^(?:请)?基于最新(?:项目)?状态(?:核对|复核|检查)|^(?:请)?独立复核|不得只复述原实现者结论/i.test(text);
}

export function buildCoordinatorTestAgentAcceptanceCriteria(task: any, verificationCommands: string[]) {
  const projectCriteria = splitUserAcceptanceText(task.acceptance_criteria || task.acceptanceCriteria)
    .filter((criterion: string) => !isCoordinatorOnlyAcceptanceCriterion(criterion));
  const commandCriteria = verificationCommands.map(command => `命令 ${command} 必须成功执行。`);
  const plan = presentedPlanFromTask(task)
    || latestPresentedPlanFromGroupSession(task?.group_id || task?.groupId, task?.group_session_id || task?.groupSessionId);
  return mergePresentedPlanAcceptanceCriteria([...projectCriteria, ...commandCriteria], plan, 10);
}

export function buildTestAgentHandoffId(taskId = "", originalTarget = "") {
  const base = [taskId || "test-agent-handoff", originalTarget || "project"].join("-");
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || `test-agent-handoff-${Date.now().toString(36)}`;
}

export function getTestAgentHandoffReviewSubject(handoff: any = null) {
  return String(
    handoff?.review_subject
    || handoff?.reviewSubject
    || handoff?.metadata?.reviewSubject
    || handoff?.metadata?.review_subject
    || handoff?.projects?.[0]?.name
    || handoff?.project?.name
    || ""
  ).trim();
}
