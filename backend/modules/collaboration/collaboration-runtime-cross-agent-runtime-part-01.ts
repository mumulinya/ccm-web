// Behavior-freeze split from collaboration-runtime-cross-agent-runtime.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 4/9).
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

// === 跨 Agent 并行与递归协作（核心）===

import {
  coordinatorReworkRouteNeedsFreshVerifier,
  coordinatorReworkRouteRequiresStop,
  coordinatorReworkRouteUsesVerifier,
  getMentionReworkRoute,
  getTestAgentHandoffReviewSubject,
  isCoordinatorTestAgentName,
} from "./collaboration-runtime-cross-agent-runtime-part-02";

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

function arbitrateAgentQaRequest(request: any, group: any, sourceProject = "") {
  const text = `${request.question || ""}\n${request.reason || ""}`;
  const members = new Set((group.members || []).map((m: any) => String(m.project || "").trim()).filter(Boolean));
  if (!members.has(request.targetName)) {
    return { decision: "reject", reason: `目标 Agent 不在当前群聊成员中：${request.targetName}` };
  }
  if (request.targetName === sourceProject) {
    return { decision: "reject", reason: "不能把问题发回给自己" };
  }
  if (request.kind === "risk" || /用户确认|业务方确认|产品确认|人工确认|生产数据|密钥|token|密码|支付|扣款|删除生产|合规|隐私/i.test(text)) {
    return { decision: "ask_user", reason: "问题涉及用户/业务/高风险确认，需要主 Agent 暂停并让用户拍板" };
  }
  return { decision: "ask_agent", reason: request.reason || "目标 Agent 具备该问题的上下文" };
}

export async function resumeAgentQaFromStoredContinuation(qa: any, group: any, ctx: CollabCtx, streamRes: any = null) {
  if (!qa?.acceptance?.accepted || qa.blocking === false) return { resumed: false, reason: "回答未采纳或不是阻塞问题" };
  const continuation = qa.continuation || {};
  const runtime = resolveMemberRuntime(qa.from_agent, group, getConfigs());
  const workDir = String(continuation.source_work_dir || runtime?.workDir || "").trim();
  const agentType = String(continuation.source_agent_type || runtime?.agentType || "claudecode").trim();
  if (!workDir) return { resumed: false, reason: "缺少原 Agent 工作目录，无法安全续跑" };
    const toolContext = buildAgentToolContext(ctx, group, qa.from_agent, `${continuation.original_prompt || ""}\n${qa.question || ""}\n${qa.answer || ""}`);
  const resumedAllowedTools = continuation.allowed_tools || toolContext.allowedTools;
  const resumedToolOptions = continuation.allowed_tools
    ? { taskId: qa.task_id }
    : { taskId: qa.task_id, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness };
  const runtimeTools = prepareAgentRuntimeTools(qa.group_id, qa.from_agent, workDir, agentType, resumedAllowedTools, streamRes, resumedToolOptions);
  if (runtimeTools.dispatchBlocked) {
    const reason = runtimeToolDispatchBlockedMessage(qa.from_agent, runtimeTools);
    appendAgentQaTrace(qa.task_id, "agent.qa.runtime_tool_dispatch_blocked", qa, reason, "warn", { runtime_tool_dispatch_gate: runtimeTools.dispatchGate });
    if (qa.task_id) appendTaskTimelineEvent(qa.task_id, { type: "runtime_tool_dispatch_blocked", title: `${qa.from_agent} 工具授权派发被阻断`, detail: reason, status: "warn", phase: "waiting_dependency", agent: qa.from_agent, data: { runtime_tool_dispatch_gate: runtimeTools.dispatchGate } });
    return { resumed: false, reason, runtimeToolDispatchGate: runtimeTools.dispatchGate };
  }
  let session = openTaskAgentSession({ scopeId: qa.task_id, taskId: qa.task_id, groupId: qa.group_id, project: qa.from_agent, agentType });
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
    mcpConfigPath: continuation.mcp_config_path || runtimeTools.audit.mcpConfigPath,
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
    const routing = selectCollaborationTarget({ request: rawRequest, group: input.group, sourceProject: input.sourceProject, profiles, openItems });
    const request = { ...rawRequest, targetName: routing.targetName };
    const sourceTask = input.taskId ? getTaskById(input.taskId) : null;
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
    const admission = evaluateCollaborationQuestionAdmission(contract, openItems);
    const arbitration = arbitrateAgentQaRequest(request, input.group, input.sourceProject);
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
    if (input.taskId) appendTaskTimelineEvent(input.taskId, { type: "agent_qa_question", title: `${input.sourceProject} 向 ${request.targetName} 提问`, detail: request.question, status: "active", phase: "executing", agent: input.sourceProject, data: { qa_id: qa.id, request, arbitration } });
    appendAgentQaTrace(input.taskId || "", "agent.qa.question", qa, request.question, "active", { routing, admission, permission_contract: qa.permission_contract });
    if (input.taskId && qa.blocking && arbitration.decision === "ask_agent") {
      updateGroupTaskInlineStatus(sourceTask || { id: input.taskId, group_id: input.groupId }, "in_progress", `等待 ${request.targetName} 回答：${compactMemoryText(request.question, 180)}`);
      appendTaskTimelineEvent(input.taskId, { type: "agent_qa_waiting", title: `${input.sourceProject} 等待 ${request.targetName}`, detail: `问题 ${qa.id} 已进入等待；回答到达后自动唤醒原会话`, status: "active", phase: "waiting_dependency", agent: input.sourceProject, data: { qa_id: qa.id, deadline_at: qa.deadline_at } });
    }

    if (request.kind === "implementation" && arbitration.decision === "ask_agent") {
      const coordinator = getCoordinatorMember(input.group)?.project || "coordinator";
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
        queue_scope: "isolated_parallel",
        child_agent_isolation: "worktree",
        branch_policy: "worktree",
        commit_policy: "verified_commit",
        allowed_paths: request.requested_write_paths?.length ? request.requested_write_paths : ["."],
        requires_code_changes: true,
        requires_verification: true,
        requires_independent_review: false,
        idempotency_key: `group-coordination:${request.coordination_request_id || qa.id}`,
        workflow_meta: {
          coordination_request_id: request.coordination_request_id || "",
          requested_by_agent: input.sourceProject,
          dispatched_by: "group_main_agent",
          requested_write_paths: request.requested_write_paths || [],
          required_capabilities: request.required_capabilities || [],
          execution_mode: "parallel_isolated_native_session",
          source_task_agent_session_id: input.sourceTaskAgentSessionId || "",
          source_native_session_id: input.sourceNativeSessionId || "",
        },
      });
      updateTask(dependencyTask.id, { status: "pending", status_detail: `正在为 ${request.targetName} 准备独立会话和工作区` });
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
        execution_mode: "parallel_isolated_native_session",
        audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: new Date().toISOString(), type: "parallel_work_item_queued", detail: `已为 ${request.targetName} 准备独立会话执行通道` }].slice(-30),
      });
      const queueResult = enqueueTask(dependencyTask.id, input.ctx);
      updateGroupCoordinationRequest(request.coordination_request_id, {
        status: queueResult.queued ? "work_item_created" : "waiting_agent",
        resolution: {
          target_project: request.targetName,
          work_item_task_id: dependencyTask.id,
          execution_mode: "parallel_isolated_native_session",
          queue: queueResult,
        },
        auditType: queueResult.queued ? "parallel_work_item_queued" : "parallel_work_item_waiting",
        auditDetail: queueResult.queued
          ? `已为 ${request.targetName} 创建独立第三方 Agent 会话执行通道，不等待其现有会话结束`
          : queueResult.message || `等待 ${request.targetName} 执行通道就绪`,
      });
      emitAgentQaEvent(input.streamRes, "progress", queuedQa, queueResult.queued ? `${request.targetName} 的独立协作会话正在启动` : queueResult.message || "协作会话等待启动");
      if (input.taskId) appendTaskTimelineEvent(input.taskId, {
        type: queueResult.queued ? "coordination_parallel_session_queued" : "coordination_parallel_session_waiting",
        title: queueResult.queued ? `${request.targetName} 的独立协作会话正在启动` : `${request.targetName} 的执行通道暂未就绪`,
        detail: queueResult.queued ? "该工作项使用独立 worktree 和原生会话并行执行，不会打断正在工作的会话" : queueResult.message || "等待执行通道恢复",
        status: queueResult.queued ? "active" : "warn",
        phase: "waiting_dependency",
        agent: coordinator,
        data: { coordination_request_id: request.coordination_request_id, work_item_task_id: dependencyTask.id, target_project: request.targetName, execution_mode: "parallel_isolated_native_session", queue: queueResult },
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

export function evaluateCoordinationTaskEvidence(task: any, request: any, receipt: any, execution: any) {
  const base = evaluateCoordinationImplementationReceipt(receipt, request);
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
    requiresFiles && !actualFiles.length ? "独立 worktree 未检测到真实代码差异" : "",
    requiresFiles && actualFiles.length > 0 && !declaredMatch ? "结果说明中的文件与 worktree 实际差异不一致" : "",
  ]).filter(Boolean);
  const accepted = base.accepted && gaps.length === 0;
  return {
    ...base,
    status: accepted ? "accepted" : "needs_evidence",
    accepted,
    score: accepted ? 100 : Math.min(Number(base.score || 0), Math.max(0, 100 - gaps.length * 25)),
    gaps,
    workspace_files: workspaceFiles,
    evidence: uniqueStrings([...(base.evidence || []), ...actualFiles]).slice(0, 120),
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
