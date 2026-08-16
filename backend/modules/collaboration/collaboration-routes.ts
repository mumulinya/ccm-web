// collaboration-routes.ts — merged from 6 part files (behavior-freeze merge).

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
  getWorkDirForProject,
} from "../../core/utils";
import { parseSecureMultipartRequest } from "../../system/secure-multipart";
import {
  normalizeAutomationTaskSource,
  resolveAutomationSessionBinding,
} from "../../system/automation-session-bindings";
import { buildTaskConversationLinks, validateTaskMutationGuard } from "../../system/task-conversation-links";
import { appendUserVisibleAgentEvent, appendUserVisibleRequirementPlan, listUserVisibleAgentEvents } from "../../system/user-visible-agent-events";
import { inspectProjectGit } from "../projects/project-git";
import { hasResourceAccess, hasTaskResourceAccess } from "../system/access-policy";
import { confirmProjectMainTask } from "../projects/project-main-agent";
import { exitConversationPlanModeForTask } from "../../system/conversation-plan-mode-gate";
import { buildTaskPlanDetail, buildTaskPlanPatch } from "./task-plan-detail";
import { handleTaskPauseRoutes } from "./task-pause-routes";
import { taskPauseStatusProjection } from "../../tasks/task-pause-control";
import { buildTaskPreflight } from "./task-intake-preflight";
import {
  decomposeRequirementToTaskPlan,
  ingestRequirementSources,
  requirementToIntakeDraft,
  validateRequirementDecomposition,
} from "../requirements/source-ingestion";
import { assertRequirementPlanEvidence } from "../requirements/source-evidence-v2";
import {
  runRequirementEpicSelfTest,
} from "../requirements/requirement-epic-self-tests";
import {
  startGlobalMissionSupervisor,
} from "../../agents/global/mission-supervisor";
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

function rejectTaskMutationConflict(res: any, task: any, payload: any, requireTarget = false) {
  const guard = validateTaskMutationGuard(task, payload, { requireTarget });
  if (!("error" in guard)) return false;
  sendJson(res, { success: false, error: guard.error, code: guard.code, ...guard.details }, guard.status);
  return true;
}
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
  buildTaskReplayAuditExport,
  buildTaskReplayFreshness,
  buildTaskReplayIndexFromRecords,
  buildTaskReplayUserReport,
  projectTaskReplayForAccess,
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
  decideDailyDevIntakeQuality,
  evaluateDailyDevIntakeQuality,
  importSharedDocsToDailyDevBacklog,
  isDailyDevBacklogFile,
  listDailyDevBacklogs,
  listRequirementBacklogCollections,
  markDailyDevBacklogStatus,
  persistDailyDevBacklogFile,
  readDailyDevBacklogStatus,
  recoverExpiredDailyDevBacklogClaims,
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
  listActiveAgentRuns,
  listExecutions,
  loadExecution,
  mergeExecutionWorktree,
  previewExecutionCheckpointRecovery,
  purgeTaskExecutionArtifacts,
  requestActiveAgentRunPause,
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
  suspendTaskAgentSessions,
} from "../../tasks/agent-sessions";
import { interruptTaskExecution, resumeInterruptedTaskExecution } from "../../tasks/task-interruption";
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
    getTracePage,
  listTraces,
  releaseTaskLease,
  renewTaskLease,
  runReliabilityLedgerSelfTest,
  settleIdempotencyByTrace,
} from "../../system/reliability-ledger";
import {
  cancelReliabilityDrillRun,
  getReliabilityDrillRun,
  getReliabilityDrillStatus,
  listReliabilityDrillRuns,
  startReliabilityDrillRun,
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
  recordAcceptedProjectDeliveryMemory,
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
  TASK_WATCHDOG_STALE_MS,
  appendLegacyCodeReviewGroupReport,
  appendLegacyTaskExecutionGroupReport,
  appendMainAgentDecisionTrace,
  applyMainAgentDecisionPetState,
  applyRuntimeMonitorControl,
  archiveTask,
  assertRuntimeToolDispatchReady,
  buildAcceptedPlanModeDraft,
  buildAgentQaProtocolInstructions,
  buildAgentToolContext,
  buildChildAgentDevelopmentContract,
  buildChildAgentTaskText,
  buildChildAgentWorkerHandoff,
  buildCoordinatorSharedFilesContext,
  buildDailyDevAgentDiagnostics,
  buildDailyDevWorkflowRehearsal,
  buildDeliverySummary,
  buildExecutionDashboard,
  buildGroupPlanModePreflight,
  buildGroupProjectAnalysisContext,
  buildInlineTaskRuntime,
  buildProjectVerificationHints,
  buildRevisedPlanModeDraft,
  buildTargetedReworkContinuationDraft,
  buildTaskEntityChain,
  buildTaskGapContinuationDraft,
  buildWorkerContinuationHandoff,
  buildWorkflowMeta,
  claimTaskWorkItemForAgent,
  classifyGroupProjectTaskIntentWithAgent,
  classifyTaskContinuation,
  cleanupRuntimeDebt,
  compactFormText,
  continueTaskWithMessage,
  createDailyDevSmokeTask,
  createRequirementEpicWithChildren,
  createTask,
  enqueueTask,
  extractActionableMentions,
  getCoordinatorActionMentions,
  getDailyDevSmokeStatus,
  getGroupMainAgentActionRegistry,
  getInitialWorkflowMeta,
  getProjectExtraConfig,
  getQueueStatus,
  getTaskById,
  getTaskExecutionFromReceipt,
  getTaskPlanMode,
  getTaskWatchdogStatus,
  getTaskWorkItems,
  handleAgentQaRequests,
  looksLikeTaskContinuation,
  normalizePlanAssignments,
  persistTaskWorkItems,
  prepareAgentRuntimeTools,
  processCrossAgents,
  purgeArchivedTask,
  reconcileTaskDeliveryEvidence,
  removeTaskFromQueues,
  restoreArchivedTask,
  resumeAgentQaFromStoredContinuation,
  resumeTaskQueues,
  retryAgentQaItem,
  retryRuntimeFailedTasks,
  retryTask,
  runAgentCliProbe,
  runAgentCliProbeBatch,
  runAgentRecoveryMonitorOnce,
  runCoordinatorReviewLoop,
  runGroupMainAgentActionRegistrySelfTest,
  runGroupMainAgentToolLoopSelfTest,
  runRuntimeFallbackProbe,
  runTaskWatchdog,
  runningTaskIds,
  runtimeToolDispatchBlockedReceipt,
  runtimeToolSnapshotFromAudit,
  shouldCreatePersistentGroupTask,
  shouldUseProjectAnalysisMode,
  splitUserAcceptanceText,
  switchTaskExecutor,
  taskAgentInvocationMemoryOptions,
  taskAgentSessionLifecycleRunnerOptions,
  taskQueues,
  uniqueStrings,
  updateGroupTaskInlineStatus,
  updateRequirementEpicFromPlan,
  updateTask,
  validateDailyDevGroupReady,
  validateTaskManualStatusUpdate,
  writeSse,
} from "./collaboration";
import {
  decideWorkflowWithModel,
} from "../../agents/workflow-decision";
import {
  appendProjectSessionTaskMessage,
  ensureProjectAutomationSession,
} from "../projects/sessions";
import {
  buildTaskAttachmentMutation,
  removeUploadedFiles,
  parseRetainedAttachmentIds,
} from "../../system/task-attachments";

// ===== merged from collaboration-routes-part-01.ts =====

// Extracted functional module. The original entry remains a compatibility facade.


export function configureCollaborationRouteExecutors(ctx: CollabCtx) {
    configureGroupSessionMemoryModelExecutor(async (request: any) => {
      const group = loadGroups().find((item: any) => String(item?.id || "") === String(request.groupId || ""));
      if (!group) throw new Error("session_memory_model_group_not_found");
      const coordinator = getCoordinatorMember(group);
      const candidates = [coordinator, ...getRoutableMembers(group)].filter(Boolean);
      const configs = getConfigs();
      let selected: any = null;
      let config: any = null;
      for (const candidate of candidates) {
        const match = configs.find((item: any) => item.name === candidate.project);
        if (match) {
          selected = candidate;
          config = match;
          break;
        }
      }
      if (!selected || !config) throw new Error("session_memory_model_executor_not_configured");
      const info = getConfigInfo(config.path);
      const agentType = String(info[0]?.agent || selected.agent || "claudecode");
      const sandbox = path.join(
        CCM_DIR,
        "session-memory-extractor-sandbox",
        String(request.scopeId || "session").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180)
      );
      fs.mkdirSync(sandbox, { recursive: true });
      let executionMetadata: any = {};
      const output = await ctx.callAgent(
        selected.project,
        request.prompt,
        sandbox,
        agentType,
        120_000,
        {
          tab: "groups",
          groupId: request.groupId,
          group_session_id: request.groupSessionId,
          taskId: request.executionId,
          executionId: request.executionId,
          title: "Session Memory background extraction",
          background: true,
          skipIndependentVerification: true,
          allowedTools: [],
          maxOutputBytes: 1024 * 1024,
          maxContextOutputBytes: 512 * 1024,
          onDone: (metadata: any) => { executionMetadata = metadata || {}; },
        }
      );
      if (/^\[[^\]]+\]\s+Agent(?:\s+Runner)?\s+(?:错误|响应超时)/i.test(String(output || "").trim())) {
        throw new Error(`session_memory_model_executor_failed:${String(output || "").slice(0, 300)}`);
      }
      if (executionMetadata?.fileChanges?.count > 0) {
        throw new Error("session_memory_model_executor_modified_sandbox");
      }
      return {
        output,
        project: selected.project,
        agentType,
        nativeSessionId: String(executionMetadata.nativeSessionId || ""),
        model: String(executionMetadata.nativeModelCapabilityReceipt?.model || executionMetadata.nativeModelCapabilityRecord?.entry?.model || ""),
      };
    });
    configureGroupTypedMemoryManifestSelector(async (request: any) => {
      const group = loadGroups().find((item: any) => String(item?.id || "") === String(request.groupId || ""));
      if (!group) throw new Error("typed_memory_manifest_selector_group_not_found");
      const coordinator = getCoordinatorMember(group);
      const candidates = [coordinator, ...getRoutableMembers(group)].filter(Boolean);
      const configs = getConfigs();
      let selected: any = null;
      let config: any = null;
      for (const candidate of candidates) {
        const match = configs.find((item: any) => item.name === candidate.project);
        if (!match) continue;
        selected = candidate;
        config = match;
        break;
      }
      if (!selected || !config) throw new Error("typed_memory_manifest_selector_executor_not_configured");
      const info = getConfigInfo(config.path);
      const agentType = String(info[0]?.agent || selected.agent || "claudecode");
      const sandbox = path.join(
        CCM_DIR,
        "memory-manifest-selector-sandbox",
        String(request.scopeId || "session").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180)
      );
      fs.mkdirSync(sandbox, { recursive: true });
      let executionMetadata: any = {};
      const prompt = [
        String(request.systemPrompt || ""),
        "",
        String(request.userPrompt || ""),
        "",
        "Return only one JSON object matching this schema: {\"selected_memories\":[\"filename.md\"]}. Do not use tools, inspect files, or modify the workspace.",
      ].join("\n");
      const output = await ctx.callAgent(
        selected.project,
        prompt,
        sandbox,
        agentType,
        120_000,
        {
          tab: "groups",
          groupId: request.groupId,
          group_session_id: request.groupSessionId,
          taskId: request.requestId,
          executionId: request.requestId,
          title: "Typed Memory manifest selection",
          background: true,
          skipIndependentVerification: true,
          allowedTools: [],
          maxOutputBytes: 64 * 1024,
          maxContextOutputBytes: 64 * 1024,
          onDone: (metadata: any) => { executionMetadata = metadata || {}; },
        }
      );
      if (/^\[[^\]]+\]\s+Agent(?:\s+Runner)?\s+(?:错误|响应超时)/i.test(String(output || "").trim())) {
        throw new Error(`typed_memory_manifest_selector_failed:${String(output || "").slice(0, 300)}`);
      }
      if (executionMetadata?.fileChanges?.count > 0) throw new Error("typed_memory_manifest_selector_modified_sandbox");
      return {
        output,
        project: selected.project,
        agentType,
        nativeSessionId: String(executionMetadata.nativeSessionId || ""),
        model: String(executionMetadata.nativeModelCapabilityReceipt?.model || executionMetadata.nativeModelCapabilityRecord?.entry?.model || ""),
      };
    });
}

export function handleCollaborationApiReplayAndExecutionRoutes(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx,
): boolean {
  if (handleTaskPauseRoutes(req, res, parsed, ctx, {
    sendJson,
    loadTasks,
    updateTask,
    enqueueTask,
    listActiveAgentRuns,
    requestActiveAgentRunPause,
    listExecutions,
    transitionExecution,
    listTaskAgentSessions,
    suspendTaskAgentSessions,
    reopenTaskAgentSessions,
    runningTaskIds,
    appendTaskTimelineEvent,
    appendUserVisibleAgentEvent,
    buildTaskConversationLinks,
    updateGroupTaskInlineStatus,
  })) return true;
  const taskForRead = (taskId: string, required: "use" | "manage" = "use") => {
    const task = loadTasks().find((item: any) => String(item?.id || "") === String(taskId || ""));
    if (!task) return { task: null, allowed: false };
    return { task, allowed: hasTaskResourceAccess(task, (req as any).ccmAuth, required) };
  };
  const rejectTaskRead = (taskId: string, required: "use" | "manage" = "use") => {
    const access = taskForRead(taskId, required);
    if (!access.task) { sendJson(res, { success: false, error: "任务不存在" }, 404); return null; }
    if (!access.allowed) { sendJson(res, { success: false, error: "当前账户没有该任务的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403); return null; }
    return access.task;
  };
  const planDetailMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/plan-detail(?:\/confirm)?$/);
  if (planDetailMatch && ["GET", "PATCH", "POST"].includes(req.method)) {
    const taskId = decodeURIComponent(planDetailMatch[1]);
    const task = rejectTaskRead(taskId, "use");
    if (!task) return true;
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method === "GET") {
      sendJson(res, { success: true, plan: buildTaskPlanDetail(task) });
      return true;
    }
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const current = buildTaskPlanDetail(task);
        if (Number(payload?.revision) !== current.revision
          || Number(payload?.generation) !== current.generation
          || String(payload?.bindingChecksum || "") !== current.bindingChecksum) {
          return sendJson(res, {
            success: false,
            error: "计划已经更新，请刷新后重试",
            code: "TASK_PLAN_REVISION_CONFLICT",
            current: current,
          }, 409);
        }
        if (pathname.endsWith("/confirm")) {
          if (task.workflow_type === "requirement_epic") {
            return sendJson(res, { success: false, error: "需求 Epic 请使用原确认入口，以保留拆单和任务图校验", code: "SPECIALIZED_PLAN_CONFIRM_REQUIRED" }, 409);
          }
          if (task.orchestration_scope === "project_session") {
            const confirmed = confirmProjectMainTask(task.id, task.target_project, task.project_session_id);
            exitConversationPlanModeForTask(confirmed);
            return sendJson(res, {
              success: true,
              task: confirmed,
              plan: buildTaskPlanDetail(confirmed),
              resume_required: true,
              resume_parent_run_id: confirmed.id,
            });
          }
          const planMode = task.workflow_meta?.plan_mode || task.workflow_meta?.intake?.plan_mode || task.intake_draft || {};
          const acceptedAt = new Date().toISOString();
          const acceptedPlan = {
            ...planMode,
            requires_confirmation: false,
            auto_continue: true,
            confirmation_status: "confirmed",
            accepted_at: acceptedAt,
          };
          const confirmed = updateTask(task.id, {
            intake_state: "confirmed",
            status: "pending",
            auto_execute: true,
            status_detail: "详细计划已确认，正在进入会话执行队列",
            intake_draft: acceptedPlan,
            workflow_meta: {
              ...(task.workflow_meta || {}),
              plan_mode: acceptedPlan,
              intake: { ...(task.workflow_meta?.intake || {}), plan_mode: acceptedPlan },
            },
          }) || task;
          exitConversationPlanModeForTask(confirmed);
          const queue = enqueueTask(task.id, ctx);
          return sendJson(res, { success: true, task: confirmed, plan: buildTaskPlanDetail(confirmed), queue });
        }

        const principal = (req as any).ccmAuth;
        const projects = Array.from(new Set<string>((Array.isArray(payload?.workItems) ? payload.workItems : [])
          .map((item: any) => String(item?.project || "").trim()).filter(Boolean)));
        if (principal?.kind === "browser" && principal?.role !== "admin") {
          for (const project of projects) {
            if (!hasResourceAccess(String(principal.userId || ""), principal.role, "project", project, "use")) {
              return sendJson(res, { success: false, error: `当前账户没有项目 ${project} 的访问权限`, code: "RESOURCE_ACCESS_DENIED" }, 403);
            }
          }
        }
        const patch = buildTaskPlanPatch(task, payload);
        const updated = updateTask(task.id, patch.updates) || task;
        const detail = buildTaskPlanDetail(updated);
        appendTaskTimelineEvent(task.id, {
          type: "structured_plan_revision",
          title: "用户调整了详细计划",
          detail: String(payload?.summary || payload?.feedback || `执行清单更新为 ${detail.workItems.length} 项`),
          status: "ok",
          phase: "planning",
          agent: "user",
          data: { revision: detail.revision, work_item_ids: detail.workItems.map((item: any) => item.id) },
        });
        const links = buildTaskConversationLinks(updated, [updated])?.links || [];
        const link = links.find((item: any) => item.relation === "target" && item.available)
          || links.find((item: any) => item.available);
        if (link?.scope && link?.scopeId && link?.exactSessionId && link?.messageId) {
          appendUserVisibleRequirementPlan({
            eventId: `task:${task.id}:requirement-plan:${detail.revision}:structured-edit`,
            scope: link.scope,
            scopeId: link.scopeId,
            exactSessionId: link.exactSessionId,
            anchorMessageId: link.messageId,
            generation: detail.generation,
            taskId: task.id,
            plan: {
              planId: task.id,
              revision: detail.revision,
              title: detail.title,
              goal: detail.goal,
              steps: detail.workItems.map((item: any) => ({
                id: item.planStepId || item.id,
                workItemId: item.id,
                title: item.title,
                description: item.objective,
                project: item.project,
                dependsOn: item.dependsOn,
                outcome: item.acceptanceCriteria[0] || "完成后进入下一步",
                status: item.status,
              })),
              scope: detail.assignments.map((item: any) => item.project).filter(Boolean),
              expectedResults: detail.acceptanceCriteria,
              exclusions: detail.permissionBoundaries,
              status: detail.status === "blocked" ? "blocked" : detail.status === "completed" ? "completed" : detail.status === "ready" || detail.status === "awaiting_confirmation" ? "ready" : "executing",
              createdAt: task.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          });
        }
        return sendJson(res, { success: true, task: updated, plan: detail, revision: patch.revision });
      } catch (error: any) {
        const status = Number(error?.status || (/版本|更新|冲突/.test(String(error?.message || "")) ? 409 : 400));
        sendJson(res, { success: false, error: error?.message || String(error), code: error?.code || "TASK_PLAN_UPDATE_FAILED", current: error?.current }, status);
      }
    });
    return true;
  }
  const appendSafeRecoveryMilestone = (task: any, decision: any) => {
    if (!task || decision?.resumed === false) return;
    const links = buildTaskConversationLinks(task, [task])?.links || [];
    const link = links.find((item: any) => item.relation === "target" && item.available) || links.find((item: any) => item.available);
    if (!link) return;
    const checkpoint = task?.resume_checkpoint || task?.interruption_receipt?.resume_checkpoint || {};
    const phase = String(checkpoint?.phase || "");
    const phaseLabel = /accept|verify|review|summary|deliver/i.test(phase) ? "验证与交付" : /dispatch|queue|dependency/i.test(phase) ? "协调与分派" : phase ? "实施处理" : "";
    const skippedWorkItemCount = Array.isArray(checkpoint?.completedWorkItemIds) ? checkpoint.completedWorkItemIds.length : Number(checkpoint?.completedWorkItemCount || 0);
    appendUserVisibleAgentEvent({
      eventId: `task:${task.id}:recovery:${Math.max(1, Number(task.generation || task.workflow_generation || 1))}`,
      scope: link.scope,
      scopeId: link.scopeId,
      exactSessionId: link.exactSessionId,
      ...(link.messageId ? { anchorMessageId: link.messageId } : {}),
      generation: Math.max(1, Number(task.generation || task.workflow_generation || 1)),
      taskId: String(task.id || ""),
      eventType: "agent_progress",
      display: { title: "恢复接续", summary: "已重新核验后继续", status: "success" },
      detail: {
        executionStage: { kind: phaseLabel === "验证与交付" ? "verification_delivery" : phaseLabel === "协调与分派" ? "coordination_dispatch" : "project_execution" },
        recoveryMilestone: { safe: true, phaseLabel, skippedWorkItemCount: Math.max(0, skippedWorkItemCount), revalidated: true },
      },
    });
  };
  const taskStopTerminal = (task: any) => ["done", "failed", "cancelled", "canceled", "reverted", "archived"]
    .includes(String(task?.status || "").toLowerCase());
  const taskStopQueued = (taskId: string) => Array.from(taskQueues.values()).some((queue: any) => Array.isArray(queue) && queue.includes(taskId));
  const taskStopDescendants = (root: any, tasks = loadTasks()) => {
    const byParent = new Map<string, any[]>();
    for (const candidate of tasks) {
      const parents = new Set([
        String(candidate?.parent_task_id || candidate?.parentTaskId || ""),
        String(candidate?.global_mission_id || candidate?.globalMissionId || ""),
      ].filter(Boolean));
      for (const parentId of parents) byParent.set(parentId, [...(byParent.get(parentId) || []), candidate]);
    }
    const explicit = new Map(tasks.map((item: any) => [String(item?.id || ""), item]));
    const result: any[] = [];
    const seen = new Set<string>([String(root?.id || "")]);
    const queue = [
      ...(byParent.get(String(root?.id || "")) || []),
      ...(Array.isArray(root?.child_task_ids) ? root.child_task_ids.map((id: any) => explicit.get(String(id))).filter(Boolean) : []),
    ];
    while (queue.length) {
      const current = queue.shift();
      const id = String(current?.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push(current);
      queue.push(...(byParent.get(id) || []));
      if (Array.isArray(current?.child_task_ids)) queue.push(...current.child_task_ids.map((childId: any) => explicit.get(String(childId))).filter(Boolean));
    }
    return result;
  };
  const taskStopTargets = (task: any, cascade: string) => {
    const descendants = taskStopDescendants(task).filter(item => !taskStopTerminal(item));
    return cascade === "task_only" ? [task] : [task, ...descendants];
  };
  const taskStopPreviewToken = (task: any, cascade: string, targets: any[]) => crypto.createHash("sha256").update(JSON.stringify({
    schema: "ccm-task-stop-preview-v1",
    task_id: task?.id || "",
    revision: Math.max(0, Number(task?.revision || 0)),
    generation: Math.max(1, Number(task?.generation || task?.workflow_generation || 1)),
    cascade,
    targets: targets.map(item => [item?.id || "", Math.max(0, Number(item?.revision || 0)), String(item?.status || "")]),
  })).digest("hex");
  const buildTaskStopPreview = (task: any, requestedCascade = "") => {
    const descendants = taskStopDescendants(task).filter(item => !taskStopTerminal(item));
    const cascade = requestedCascade === "task_only" ? "task_only" : descendants.length ? "descendants" : "task_only";
    const targets = taskStopTargets(task, cascade);
    const executions = targets.flatMap(target => listExecutions({ taskId: String(target.id || "") }));
    const liveExecutions = executions.filter((execution: any) => !["succeeded", "failed", "cancelled"].includes(String(execution?.state || "")));
    const agentRuns = targets.flatMap(target => listActiveAgentRuns({ taskId: String(target.id || "") }));
    const queuedTargets = targets.filter(target => taskStopQueued(String(target.id || "")));
    const activeSessions = targets.flatMap(target => listTaskAgentSessions({ taskId: String(target.id || "") }))
      .filter((session: any) => !["closed", "cancelled", "failed", "completed"].includes(String(session?.status || session?.state || "").toLowerCase()));
    const worktrees = executions.filter((execution: any) => execution?.workspace?.mode === "worktree" && !execution?.workspace?.cleanedAt);
    const canUndo = targets.every(target => ["pending", "paused", "blocked", "needs_user"].includes(String(target?.status || "").toLowerCase()))
      && agentRuns.length === 0 && liveExecutions.length === 0 && !targets.some(target => runningTaskIds.has(String(target?.id || "")));
    return {
      schema: "ccm-task-stop-preview-v1",
      taskId: String(task?.id || ""),
      title: compactFormText(task?.title, "任务"),
      cascade,
      recommendedCascade: descendants.length ? "descendants" : "task_only",
      descendants: descendants.map(item => ({ taskId: String(item.id || ""), title: compactFormText(item.title, "子任务"), status: String(item.status || "") })),
      impact: {
        targetTaskCount: targets.length,
        childTaskCount: Math.max(0, targets.length - 1),
        activeAgentCount: agentRuns.length,
        activeExecutionCount: liveExecutions.length,
        activeSessionCount: activeSessions.length,
        queuedTaskCount: queuedTargets.length,
        worktreeCount: worktrees.length,
        checkpointsPreserved: true,
        replayPreserved: true,
      },
      canUndo,
      undoWindowSeconds: canUndo ? 10 : 0,
      previewToken: taskStopPreviewToken(task, cascade, targets),
      revision: Math.max(0, Number(task?.revision || 0)),
      generation: Math.max(1, Number(task?.generation || task?.workflow_generation || 1)),
      contentStored: false,
    };
  };
  const conversationLinksMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/conversation-links$/);
  if (conversationLinksMatch && req.method === "GET") {
    const taskId = decodeURIComponent(conversationLinksMatch[1] || "").trim();
    if (!rejectTaskRead(taskId)) return true;
    const projection = buildTaskConversationLinks(taskId);
    if (!projection) { sendJson(res, { success: false, error: "任务不存在" }, 404); return true; }
    sendJson(res, { success: true, ...projection });
    return true;
  }
  if (pathname === "/api/tasks/replay/artifact" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "").trim();
    const runId = String(parsed.query.run_id || parsed.query.runId || "").trim();
    const artifactId = String(parsed.query.artifact_id || parsed.query.artifactId || "").trim();
    if (!taskId || !runId || !artifactId) { sendJson(res, { error: "缺少任务、运行或证据 ID" }, 400); return true; }
    if (!rejectTaskRead(taskId)) return true;
    const artifact = resolveTaskReplayArtifact({ taskId, runId, artifactId });
    if (!artifact) { sendJson(res, { error: "证据不存在、已过期或不属于该任务" }, 404); return true; }
    try {
      const stat = fs.statSync(artifact.file_path);
      const disposition = artifact.preview_kind === "download" ? "attachment" : "inline";
      const fileName = path.basename(artifact.file_name).replace(/[\r\n"\\]/g, "_");
      res.writeHead(200, {
        "Content-Type": artifact.mime_type,
        "Content-Length": stat.size,
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      const stream = fs.createReadStream(artifact.file_path);
      stream.on("error", () => { if (!res.writableEnded) res.end(); });
      stream.pipe(res);
    } catch {
      if (!res.headersSent) sendJson(res, { error: "证据暂时无法读取" }, 500);
      else if (!res.writableEnded) res.end();
    }
    return true;
  }

  if (pathname === "/api/tasks/replay/freshness" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "").trim();
    if (!taskId) { sendJson(res, { success: false, error: "缺少任务 ID" }, 400); return true; }
    if (!rejectTaskRead(taskId)) return true;
    const freshness = buildTaskReplayFreshness(taskId);
    if (!freshness) { sendJson(res, { success: false, error: "任务不存在" }, 404); return true; }
    res.setHeader("Cache-Control", "private, no-store");
    sendJson(res, { success: true, freshness });
    return true;
  }

  if (pathname === "/api/tasks/replay/export" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "").trim();
    const format = String(parsed.query.format || "user_report").trim();
    if (!taskId) { sendJson(res, { success: false, error: "缺少任务 ID" }, 400); return true; }
    const required = format === "audit_json" ? "manage" : "use";
    if (!rejectTaskRead(taskId, required)) return true;
    if (!['user_report', 'audit_json'].includes(format)) { sendJson(res, { success: false, error: "不支持的导出格式" }, 400); return true; }
    const payload = format === "audit_json" ? buildTaskReplayAuditExport(taskId) : buildTaskReplayUserReport(taskId);
    if (!payload) { sendJson(res, { success: false, error: "任务不存在" }, 404); return true; }
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": format === "audit_json" ? `attachment; filename="ccm-task-audit-${encodeURIComponent(taskId)}.json"` : "inline",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify({ success: true, report: payload }));
    return true;
  }

  if ((pathname === "/api/tasks/replay" || pathname === "/api/tasks/replay/events") && req.method === "GET") {
    const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "").trim();
    if (!taskId) {
      const requestedLimit = Number(parsed.query.limit || 40);
      const requestedPage = Number(parsed.query.page || 1);
      const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 40;
      const principal = (req as any).ccmAuth;
      const sourceTasks = loadTasks();
      const visibleTasks = principal?.kind === "browser" && principal.role !== "admin"
        ? sourceTasks.filter((task: any) => hasTaskResourceAccess(task, principal, "use"))
        : sourceTasks;
      const index = buildTaskReplayIndexFromRecords(visibleTasks, loadGroups(), {
        page: Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1,
        limit,
        query: String(parsed.query.q || parsed.query.query || ""),
        project: String(parsed.query.project || ""),
        groupId: String(parsed.query.group_id || parsed.query.groupId || ""),
        status: String(parsed.query.status || ""),
        dateFrom: String(parsed.query.date_from || parsed.query.dateFrom || ""),
        dateTo: String(parsed.query.date_to || parsed.query.dateTo || ""),
      });
      sendJson(res, { success: true, index });
      return true;
    }
    if (!rejectTaskRead(taskId)) return true;
    const canManage = taskForRead(taskId, "manage").allowed;
    const hasEventPage = parsed.query.event_limit != null || parsed.query.eventLimit != null;
    const requestedEventOffset = Number(parsed.query.event_offset || parsed.query.eventOffset || 0);
    const requestedEventLimit = Number(parsed.query.event_limit || parsed.query.eventLimit || 160);
    const replay = buildCompleteTaskReplay(taskId, hasEventPage || pathname.endsWith("/events") ? {
      eventOffset: Number.isFinite(requestedEventOffset) ? Math.max(0, requestedEventOffset) : 0,
      eventLimit: Number.isFinite(requestedEventLimit) ? Math.max(1, Math.min(500, requestedEventLimit)) : 160,
      eventTail: ["1", "true", "yes"].includes(String(parsed.query.event_tail || parsed.query.eventTail || "").toLowerCase()),
      afterEventAt: String(parsed.query.after_event_at || parsed.query.afterEventAt || ""),
      afterEventId: String(parsed.query.after_event_id || parsed.query.afterEventId || ""),
      stage: String(parsed.query.stage || ""),
      status: String(parsed.query.event_status || parsed.query.eventStatus || ""),
      actor: String(parsed.query.actor || ""),
      task: String(parsed.query.event_task_id || parsed.query.eventTaskId || ""),
      query: String(parsed.query.event_query || parsed.query.eventQuery || ""),
      preset: String(parsed.query.preset || ""),
      includeSystemEvents: canManage && ["1", "true", "yes"].includes(String(parsed.query.include_system_events || parsed.query.includeSystemEvents || "").toLowerCase()),
      includeDetails: pathname !== "/api/tasks/replay/events",
    } : {});
    if (!replay) { sendJson(res, { error: "任务不存在" }, 404); return true; }
    sendJson(res, { success: true, replay: projectTaskReplayForAccess(replay, canManage) });
    return true;
  }

  if (pathname === "/api/tasks/replay/self-test" && req.method === "GET") {
    sendJson(res, { success: true, self_test: runTaskReplayContractSelfTest() });
    return true;
  }

  if (pathname === "/api/tasks/entity-chain" && req.method === "GET") {
    const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
    if (!rejectTaskRead(taskId)) return true;
    const chain = buildTaskEntityChain(taskId);
    if (!chain) { sendJson(res, { error: "任务不存在" }, 404); return true; }
    sendJson(res, { success: true, chain });
    return true;
  }

  if (pathname === "/api/tasks/execution-dashboard" && req.method === "GET") {
    const limit = Math.max(1, Math.min(50, Number(parsed.query.limit || 12)));
    sendJson(res, buildExecutionDashboard(limit));
    return true;
  }

  if (pathname === "/api/conversations/runtime-status" && req.method === "GET") {
    const scope = String(parsed.query.scope || "").trim();
    const scopeId = String(parsed.query.scope_id || parsed.query.scopeId || (scope === "global" ? "global" : "")).trim();
    const exactSessionId = String(parsed.query.exact_session_id || parsed.query.exactSessionId || "").trim();
    if (!["global", "project", "group"].includes(scope) || !scopeId || !exactSessionId) {
      sendJson(res, { success: false, error: "缺少有效的会话范围" }, 400);
      return true;
    }
    const principal = (req as any).ccmAuth;
    if (scope !== "global" && !hasResourceAccess(String(principal?.userId || ""), principal?.role, scope as "project" | "group", scopeId, "use")) {
      sendJson(res, { success: false, error: "无权读取该会话状态" }, 403);
      return true;
    }
    const allTasks = loadTasks().filter((task: any) => hasTaskResourceAccess(task, principal, "use"));
    const taskMatchesSession = (task: any) => {
      const candidates = [
        task?.exact_session_id, task?.exactSessionId, task?.session_id, task?.sessionId,
        task?.automation_session_binding_snapshot?.exactSessionId,
        task?.automation_session_binding_snapshot?.exact_session_id,
        task?.conversation_link?.exactSessionId,
      ].filter(Boolean).map(String);
      if (!candidates.includes(exactSessionId)) return false;
      if (scope === "project") return String(task?.target_project || task?.project || "") === scopeId || candidates.includes(exactSessionId);
      if (scope === "group") return String(task?.group_id || task?.groupId || "") === scopeId;
      return true;
    };
    const matchingTasks = allTasks.filter(taskMatchesSession).sort((left: any, right: any) => String(right?.updated_at || right?.created_at || "").localeCompare(String(left?.updated_at || left?.created_at || "")));
    const activeTask = matchingTasks.find((task: any) => !["done", "failed", "cancelled", "canceled", "reverted"].includes(String(task?.status || "").toLowerCase())) || matchingTasks[0] || null;
    const stageFor = (task: any) => {
      const state = String(task?.acceptance_state || task?.collaboration_state?.phase || task?.status || "").toLowerCase();
      if (/dispatch|queue|dependency|merge|wake/.test(state)) return "协调与分派";
      if (/verify|review|accept|test|summary|deliver|complete|done/.test(state)) return "验证与交付";
      if (/execut|rework|work_item|running|progress/.test(state)) return "实施处理";
      return "了解情况";
    };
    let events: any[] = [];
    try {
      events = listUserVisibleAgentEvents({ scope, scopeId, exactSessionId, limit: 500 }).events || [];
    } catch {}
    const eventTaskId = String([...events].reverse().find((event: any) => event?.taskId)?.taskId || "");
    const runtimeTask = activeTask || (eventTaskId ? allTasks.find((task: any) => String(task?.id || "") === eventTaskId) : null);
    const latestUsageEvent = [...events].reverse().find((event: any) => event?.detail?.usage && typeof event.detail.usage === "object");
    const rawUsage = latestUsageEvent?.detail?.usage || runtimeTask?.metrics?.usage || runtimeTask?.usage || null;
    const numeric = (value: any) => Number.isFinite(Number(value)) ? Number(value) : undefined;
    const usage = rawUsage ? {
      inputTokens: numeric(rawUsage.inputTokens ?? rawUsage.input_tokens),
      outputTokens: numeric(rawUsage.outputTokens ?? rawUsage.output_tokens),
      cacheReadInputTokens: numeric(rawUsage.cacheReadInputTokens ?? rawUsage.cache_read_input_tokens),
      totalCostUsd: numeric(rawUsage.totalCostUsd ?? rawUsage.total_cost_usd ?? rawUsage.costUsd ?? rawUsage.cost_usd),
      source: String(rawUsage.source || "").includes("provider") || numeric(rawUsage.inputTokens ?? rawUsage.input_tokens) !== undefined ? "provider_reported" : "unreported",
      missingReason: rawUsage.missingReason || rawUsage.missing_reason,
    } : { source: "unreported", missingReason: "runtime_unreported" };
    const projectNames = new Set<string>();
    if (scope === "project") projectNames.add(scopeId);
    if (scope === "group") {
      const group = loadGroups().find((item: any) => String(item?.id || "") === scopeId);
      for (const member of group?.members || []) if (member?.project && member?.project !== "coordinator") projectNames.add(String(member.project));
    }
    if (scope === "global") {
      for (const task of matchingTasks.slice(0, 20)) {
        for (const value of [task?.target_project, task?.project, task?.mission_target?.project]) if (value && value !== "coordinator") projectNames.add(String(value));
        for (const value of task?.target_projects || task?.projects || []) {
          const name = typeof value === "string" ? value : value?.id || value?.project || value?.name;
          if (name && name !== "coordinator") projectNames.add(String(name));
        }
      }
      for (const value of [runtimeTask?.target_project, runtimeTask?.project, runtimeTask?.mission_target?.project]) if (value && value !== "coordinator") projectNames.add(String(value));
    }
    const projects = [...projectNames].filter(project => hasResourceAccess(String(principal?.userId || ""), principal?.role, "project", project, "use")).slice(0, 20).map(project => {
      const workDir = getWorkDirForProject(project);
      if (!workDir) return { id: project, name: project, dirty: false, changedFiles: 0, risk: "unavailable" };
      try {
        const git = inspectProjectGit(workDir);
        const risk = !git.git_available || !git.is_repository ? "unavailable" : Number(git.behind || 0) > 0 && Number(git.ahead || 0) > 0 ? "conflict" : git.dirty ? "changed" : "normal";
        return { id: project, name: project, branch: git.branch || undefined, dirty: git.dirty === true, changedFiles: Math.max(0, Number(git.changed_files || 0)), ahead: Math.max(0, Number(git.ahead || 0)), behind: Math.max(0, Number(git.behind || 0)), risk };
      } catch {
        return { id: project, name: project, dirty: false, changedFiles: 0, risk: "unavailable" };
      }
    });
    const configuredModel = runtimeTask?.model_display_name || runtimeTask?.model || runtimeTask?.provider_model || runtimeTask?.runtime_model;
    const runtimeTaskTerminal = runtimeTask && ["done", "failed", "cancelled", "canceled", "reverted"].includes(String(runtimeTask?.status || "").toLowerCase());
    const model = configuredModel ? { displayName: String(configuredModel).slice(0, 120), effort: runtimeTask?.reasoning_effort ? String(runtimeTask.reasoning_effort).slice(0, 40) : undefined, source: runtimeTaskTerminal ? "latest_run" : runtimeTask ? "active_run" : "configured" } : undefined;
    const task = runtimeTask ? { title: String(runtimeTask?.title || "当前任务").replace(/[\r\n]+/g, " ").slice(0, 160), state: String(runtimeTask?.status || "running"), stage: stageFor(runtimeTask) } : undefined;
    res.setHeader("Cache-Control", "private, no-store");
    sendJson(res, { success: true, status: { schema: "ccm-conversation-runtime-status-v1", model, usage, task, projects, contentStored: false } });
    return true;
  }

  if (pathname === "/api/tasks/active-runs" && req.method === "GET") {
    const principal = (req as any).ccmAuth;
    const now = Date.now();
    const safeText = (value: any, max = 180) => {
      const text = String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
      if (!text || /```|-----begin|(?:api[_ -]?key|password|secret|authorization|bearer)\s*[:=]/i.test(text)) return "";
      return text.slice(0, max);
    };
    const isTerminal = (task: any) => ["done", "failed", "cancelled", "canceled", "reverted"].includes(String(task?.status || "").toLowerCase());
    const modelRecoveryFor = (task: any) => {
      const receipt = task?.interruption_receipt || {};
      const recovery = receipt?.recovery || {};
      const reasonCode = String(receipt?.reason_code || receipt?.reasonCode || "");
      const transient = ["temporary_network", "provider_overload", "provider_unavailable", "model_stream_interrupted"].includes(reasonCode);
      const recoverable = receipt?.recoverable === true;
      const autoRetry = recovery?.mode === "safe_auto" && ["waiting_provider", "validating", "queued"].includes(String(recovery?.state || ""));
      return {
        visible: transient && recoverable,
        reasonCode,
        autoRetry,
        state: String(recovery?.state || ""),
        nextRetryAt: String(recovery?.nextRetryAt || recovery?.next_retry_at || ""),
        attempt: Math.max(0, Number(recovery?.attempt || 0)),
        maxAttempts: Math.max(0, Number(recovery?.maxAttempts || recovery?.max_attempts || 0)),
      };
    };
    const needsUser = (task: any) => task?.recovery_pending === true
      || task?.acceptance_state === "recovery_required"
      || ["blocked", "needs_user", "awaiting_confirmation"].includes(String(task?.status || "").toLowerCase())
      || task?.collaboration_state?.needs_user === true
      || String(task?.pause_control?.state || "") === "blocked";
    const stageFor = (task: any) => {
      const state = String(task?.acceptance_state || task?.collaboration_state?.phase || "").toLowerCase();
      if (/dispatch|queue|dependency|merge|wake/.test(state) || task?.workflow_type === "global_mission") return "协调与分派";
      if (/verify|review|accept|test|summary|deliver|complete/.test(state) || task?.status === "done") return "验证与交付";
      if (/execut|rework|work_item|running|progress/.test(state) || task?.status === "in_progress") return "实施处理";
      return "了解情况";
    };
    const stateFor = (task: any) => {
      if (isTerminal(task)) return String(task?.status || "").toLowerCase() === "done" ? "completed" : String(task?.status || "").toLowerCase();
      const pauseState = String(task?.pause_control?.state || "");
      if (["requested", "quiescing"].includes(pauseState)) return "pausing";
      if (pauseState === "paused") return "paused";
      if (task?.cancellation_requested_at) return "stopping";
      const modelRecovery = modelRecoveryFor(task);
      if (modelRecovery.visible && modelRecovery.autoRetry) return "waiting";
      if (needsUser(task)) return "needs_user";
      if (["pending", "queued"].includes(String(task?.status || "").toLowerCase())) return "waiting";
      return "running";
    };
    const sourceFor = (task: any) => {
      if (task?.group_id) return { type: "group", label: safeText(task?.group_name || task?.mission_target?.name || "群聊协作", 80) || "群聊协作" };
      if (task?.target_project) return { type: "project", label: safeText(task?.target_project, 80) || "项目会话" };
      return { type: "global", label: "全局 Agent" };
    };
    const project = (task: any) => {
      const source = sourceFor(task);
      const checkpoint = task?.resume_checkpoint || task?.interruption_receipt?.resume_checkpoint || {};
      const skipped = Array.isArray(checkpoint?.completedWorkItemIds) ? checkpoint.completedWorkItemIds.length : Number(checkpoint?.completedWorkItemCount || 0);
      const updatedAt = String(task?.updated_at || task?.resumed_at || task?.created_at || "");
      const updatedMs = Date.parse(updatedAt);
      const progress = safeText(task?.delivery_summary?.headline || task?.status_detail || task?.final_report || task?.result, 180)
        || (needsUser(task) ? "需要继续处理后才能完成" : stateFor(task) === "waiting" ? "等待执行" : "正在处理任务");
      const canStop = !isTerminal(task) && hasTaskResourceAccess(task, principal, "manage");
      const undoExpiresAt = String(task?.cancellation_undo?.expires_at || "");
      const undoAvailable = String(task?.status || "").toLowerCase() === "cancelled" && !!undoExpiresAt && Date.parse(undoExpiresAt) > now;
      const stoppingElapsedMs = task?.cancellation_requested_at ? Math.max(0, now - Date.parse(String(task.cancellation_requested_at))) : 0;
      const stopStuck = stateFor(task) === "stopping" && stoppingElapsedMs >= 30_000;
      const modelRecovery = modelRecoveryFor(task);
      const pauseStatus = taskPauseStatusProjection(task, { activeWriterCount: listActiveAgentRuns({ taskId: String(task?.id || "") }).length });
      const availableActions: any[] = [];
      if (pauseStatus.state === "paused" && canStop) {
        availableActions.push({ id: "resume_paused", kind: "resume_paused", label: "继续", enabled: true });
      } else if (["requested", "quiescing"].includes(pauseStatus.state) && canStop) {
        if (pauseStatus.stuck) availableActions.push({ id: "force_interrupt", kind: "force_interrupt", label: "强制中断", enabled: true });
      } else if (pauseStatus.state === "blocked" && canStop) {
        availableActions.push(
          { id: "recheck", kind: "recheck", label: "重新核验", enabled: true },
          { id: "takeover", kind: "takeover", label: "人工接管", enabled: true },
        );
      } else if (modelRecovery.visible && canStop) {
        availableActions.push({ id: "resume_interrupted", kind: "resume_interrupted", label: modelRecovery.autoRetry ? "立即重试" : "恢复任务", enabled: true });
        if (stateFor(task) !== "stopping") availableActions.push({ id: "cancel", kind: "cancel", label: "停止任务", enabled: true });
      } else if (canStop && stateFor(task) !== "stopping") {
        availableActions.push({ id: "pause", kind: "pause", label: "暂停", enabled: true });
        availableActions.push({ id: "cancel", kind: "cancel", label: "停止任务", enabled: true });
      }
      if (!modelRecovery.visible && stopStuck && canStop) availableActions.push(
        { id: "recheck", kind: "recheck", label: "重新检查", enabled: true },
        { id: "takeover", kind: "takeover", label: "人工接管", enabled: true },
      );
      if (undoAvailable && hasTaskResourceAccess(task, principal, "manage")) availableActions.push({ id: "undo_stop", kind: "undo_stop", label: "撤销停止", enabled: true });
      return {
        taskId: String(task?.id || ""),
        title: safeText(task?.title, 140) || "未命名任务",
        source,
        state: stateFor(task),
        stage: stageFor(task),
        progress,
        updatedAt,
        createdAt: String(task?.created_at || ""),
        elapsedMs: Number.isFinite(updatedMs) ? Math.max(0, now - updatedMs) : 0,
        recovery: modelRecovery.visible ? {
          reasonCode: modelRecovery.reasonCode,
          autoRetry: modelRecovery.autoRetry,
          state: modelRecovery.state,
          nextRetryAt: modelRecovery.nextRetryAt,
          attempt: modelRecovery.attempt,
          maxAttempts: modelRecovery.maxAttempts,
        } : task?.resumed_at ? {
          mode: task?.recovery_decision?.user_requested === true ? "manual" : "automatic",
          stage: safeText(checkpoint?.phase, 80),
          skippedWorkItemCount: Math.max(0, skipped),
          revalidated: task?.recovery_decision?.revalidated === true || task?.recovery_decision?.state_revalidated === true,
        } : null,
        pauseStatus,
        availableActions,
        stopProgress: task?.cancellation_progress ? {
          stage: safeText(task.cancellation_progress.stage, 40),
          requestedAt: String(task.cancellation_progress.requested_at || task.cancellation_requested_at || ""),
          stuck: stopStuck,
        } : null,
        undoExpiresAt: undoAvailable ? undoExpiresAt : "",
        revision: Math.max(0, Number(task?.revision || 0)),
        generation: Math.max(1, Number(task?.generation || task?.workflow_generation || 1)),
        bindingChecksum: safeText(task?.automation_session_binding_snapshot?.bindingChecksum || task?.automation_session_binding_snapshot?.binding_checksum, 128),
        contentStored: false,
      };
    };
    const visible = loadTasks()
      .filter((task: any) => !task?.archived && !task?.deleted_at)
      .filter((task: any) => hasTaskResourceAccess(task, principal, "use"))
      .sort((a: any, b: any) => String(b?.updated_at || b?.created_at || "").localeCompare(String(a?.updated_at || a?.created_at || "")));
    const active = visible.filter((task: any) => !isTerminal(task)).map(project);
    const recent = visible
      .filter((task: any) => isTerminal(task) && (now - Date.parse(String(task?.updated_at || task?.completed_at || task?.created_at || 0))) <= 24 * 60 * 60 * 1000)
      .slice(0, 10)
      .map(project);
    res.setHeader("Cache-Control", "private, no-store");
    sendJson(res, { success: true, active, recent, generatedAt: new Date().toISOString(), contentStored: false });
    return true;
  }

  if (pathname === "/api/tasks/executions" && req.method === "GET") {
    const executionId = String(parsed.query.execution_id || parsed.query.executionId || "");
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    if (taskId && !rejectTaskRead(taskId)) return true;
    const execution = executionId ? loadExecution(executionId) : null;
    if (execution?.taskId && !rejectTaskRead(String(execution.taskId))) return true;
    sendJson(res, { success: true, execution, executions: executionId ? [] : listExecutions(taskId ? { taskId } : {}) });
    return true;
  }

  if (pathname === "/api/tasks/native-sessions" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
    if (!rejectTaskRead(taskId, "manage")) return true;
    const sessions = listTaskAgentSessions({ taskId }).map(session => ({ ...session, continuity: getTaskAgentSessionContinuity(session) }));
    sendJson(res, { success: true, task_id: taskId, sessions });
    return true;
  }

  if (pathname === "/api/orchestrator/resilience" && req.method === "GET") {
    const runtimes = getPublicAgentRuntimes().map(runtime => ({ id: runtime.id, label: runtime.label, available: isRuntimeCommandAvailable(runtime.id), sessionResume: runtime.capabilities.sessionResume }));
    sendJson(res, { success: true, self_test: runCollaborationResilienceSelfTest(), runtimes });
    return true;
  }

  if (pathname === "/api/reliability/traces" && req.method === "GET") {
    const traceId = String(parsed.query.id || parsed.query.trace_id || "").trim();
    const taskId = String(parsed.query.task_id || "").trim();
    if (traceId) {
      const trace = getTracePage(traceId, { offset: parsed.query.offset, limit: parsed.query.limit });
      if (!trace) return sendJson(res, { success: false, error: "Trace 不存在" }, 404);
      sendJson(res, { success: true, trace });
      return true;
    }
    const traces = listTraces(Number(parsed.query.limit || 50)).filter((trace: any) => !taskId || trace.task_id === taskId);
    sendJson(res, { success: true, traces });
    return true;
  }

  if (pathname === "/api/reliability/diagnostics/run" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk;
      if (body.length > 64 * 1024) req.destroy(new Error("诊断请求过大"));
    });
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const kind = String(payload.kind || "reliability_ledger").trim();
        const runners: Record<string, () => any> = {
          reliability_ledger: runReliabilityLedgerSelfTest,
          process_lifecycle: runProcessLifecycleSelfTest,
          soak: runSoakTestSelfTest,
          task_replay: runTaskReplayContractSelfTest,
        };
        const runner = runners[kind];
        if (!runner) return sendJson(res, { success: false, error: "不支持的诊断类型", allowed: Object.keys(runners) }, 400);
        const result = runner();
        sendJson(res, {
          success: result?.pass !== false,
          schema: "ccm-reliability-diagnostic-receipt-v2",
          kind,
          executed_at: new Date().toISOString(),
          result,
        }, result?.pass === false ? 500 : 200);
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/reliability/self-test" && req.method === "GET") {
    sendJson(res, { success: true, result: runReliabilityLedgerSelfTest() });
    return true;
  }

  if (pathname === "/api/reliability/drills/run" && req.method === "POST") {
    const auth = (req as any).auth || (req as any).ccmAuth || {};
    const outcome = startReliabilityDrillRun({ requestedBy: auth.username || auth.userId || "admin" });
    sendJson(res, { success: true, ...outcome }, outcome.accepted ? 202 : 200);
    return true;
  }

  if (pathname === "/api/reliability/drills/status" && req.method === "GET") {
    const runId = String(parsed.query.run_id || "").trim();
    if (runId) {
      const run = getReliabilityDrillRun(runId);
      if (!run) return sendJson(res, { success: false, error: "演练不存在" }, 404);
      sendJson(res, { success: true, run });
      return true;
    }
    sendJson(res, { success: true, status: getReliabilityDrillStatus(), runs: listReliabilityDrillRuns(Number(parsed.query.limit || 20)) });
    return true;
  }

  if (pathname === "/api/reliability/drills/cancel" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await cancelReliabilityDrillRun(String(payload.run_id || ""));
        sendJson(res, result, result.success ? 200 : 404);
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/reliability/drills/events" && req.method === "GET") {
    const runId = String(parsed.query.run_id || "").trim();
    if (!runId || !getReliabilityDrillRun(runId)) return sendJson(res, { success: false, error: "演练不存在" }, 404);
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    let last = "";
    const publish = () => {
      const run = getReliabilityDrillRun(runId);
      if (!run) return;
      const checksum = JSON.stringify([run.status, run.checkpoint, run.updated_at]);
      if (checksum !== last) {
        last = checksum;
        res.write(`event: drill\ndata: ${JSON.stringify(run)}\n\n`);
      }
      if (["completed", "failed", "cancelled", "blocked"].includes(run.status)) {
        clearInterval(timer);
        res.end();
      }
    };
    const timer = setInterval(publish, 1_000);
    timer.unref?.();
    req.once("close", () => clearInterval(timer));
    publish();
    return true;
  }

  if (pathname === "/api/reliability/soak/status" && req.method === "GET") {
    sendJson(res, { success: true, state: getSoakTestStatus(), report: getSoakReport() });
    return true;
  }

  if (pathname === "/api/reliability/process-lifecycle" && req.method === "GET") {
    sendJson(res, { success: true, ...getProcessLifecycleSnapshot({ limit: Number(parsed.query?.limit || 5000), event_limit: Number(parsed.query?.event_limit || 100) }) });
    return true;
  }

  if (pathname === "/api/reliability/process-lifecycle/self-test" && req.method === "GET") {
    sendJson(res, { success: true, self_test: runProcessLifecycleSelfTest() });
    return true;
  }

  if (pathname === "/api/reliability/debt" && req.method === "GET") {
    sendJson(res, { success: true, debt: inspectReliabilityDebt() });
    return true;
  }

  if (pathname === "/api/reliability/debt/reconcile" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = reconcileStabilityDebt(payload.reason || "用户启动生产级稳定性验收前清理历史债务");
        sendJson(res, { success: result.pass, result }, result.pass ? 200 : 409);
      } catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/reliability/restart-intent" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try { sendJson(res, { success: true, intent: registerRestartIntent(body ? JSON.parse(body) : {}) }); }
      catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/reliability/soak/self-test" && req.method === "GET") {
    sendJson(res, { success: true, result: runSoakTestSelfTest() });
    return true;
  }

  if (["/api/reliability/soak/start", "/api/reliability/soak/stop", "/api/reliability/soak/sample"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if (pathname.endsWith("/start")) sendJson(res, { success: true, ...(await startSoakTest(payload)) });
        else if (pathname.endsWith("/stop")) sendJson(res, { success: true, state: stopSoakTest(payload.reason || "用户停止浸泡测试") });
        else sendJson(res, { success: true, state: await sampleSoakTestNow() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error.message || String(error) }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/execution-kernel/self-test" && req.method === "GET") {
    try { sendJson(res, { success: true, ...runExecutionKernelSelfTest() }); }
    catch (e: any) { sendJson(res, { success: false, error: e.message }, 500); }
    return true;
  }

  if (pathname === "/api/tasks/rollback" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = rejectTaskRead(taskId, "manage");
        if (!task) return;
        if (runningTaskIds.has(taskId)) return sendJson(res, { error: "任务仍在执行，请先停止后再撤销" }, 409);
        const checkpointIds = uniqueStrings(listExecutions({ taskId }).flatMap((item: any) => item.checkpointIds || [])).reverse();
        if (!checkpointIds.length) return sendJson(res, { error: "该任务没有可用的安全检查点" }, 409);
        const reason = compactFormText(payload.reason, "用户安全撤销任务改动");
        const rollbacks = checkpointIds.map((checkpointId: string) => rollbackExecutionCheckpoint(checkpointId, reason, { allowShared: true }));
        const now = new Date().toISOString();
        const summary = { ...(task.delivery_summary || {}), headline: "最近一轮改动已安全撤销", acceptance_gate_passed: false, reverted: true, reverted_at: now };
        const updated = updateTask(taskId, { status: "cancelled", auto_execute: false, rolled_back_at: now, rollback_reason: reason, rollback_results: rollbacks, status_detail: "已安全撤销到任务开始前", delivery_summary: summary });
        closeTaskAgentSessions({ taskId }, "用户安全撤销任务改动");
        updateGroupTaskInlineStatus(updated || task, "cancelled", "已安全撤销到任务开始前");
        appendTaskTimelineEvent(taskId, { type: "task_rollback", title: "安全撤销完成", detail: `已恢复 ${rollbacks.length} 个检查点`, status: "ok", phase: "cancelled", data: { checkpoint_ids: checkpointIds } });
        addTaskLog(taskId, "warning", `安全撤销完成：恢复 ${rollbacks.length} 个检查点`);
        sendJson(res, { success: true, task: updated, rollbacks });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (["/api/tasks/interrupt", "/api/tasks/resume-interrupted"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        const task = loadTasks().find((item: any) => item.id === taskId);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        if (rejectTaskMutationConflict(res, task, payload, pathname.endsWith("/resume-interrupted"))) return;
        if (pathname.endsWith("/interrupt")) {
          for (const queue of taskQueues.values()) {
            let index = queue.indexOf(taskId);
            while (index >= 0) { queue.splice(index, 1); index = queue.indexOf(taskId); }
          }
          const reason = compactFormText(payload.reason, "用户停止当前执行");
          const interruption = interruptTaskExecution({ task, reasonCode: "user_interrupt", reason, actor: String(payload.actor || "local-user"), checkpoint: String(task.acceptance_state || task.status || "unknown"), sideEffectState: "uncertain" });
          cancelTestAgentRunsForTask(taskId, reason);
          const updated = updateTask(taskId, { status: "blocked", acceptance_state: "recovery_required", auto_execute: false, is_paused: true, paused: true, recovery_pending: true, interrupted_at: interruption.receipt.interrupted_at, interruption_receipt: interruption.receipt, status_detail: "当前执行已停止，任务和子 Agent 会话已保留" });
          releaseTaskLease(taskId, "interrupted");
          updateGroupTaskInlineStatus(updated || task, "blocked", "当前执行已停止，可恢复原任务");
          appendTaskTimelineEvent(taskId, { type: "task_interrupted", title: "当前执行已停止，可恢复", detail: reason, status: "warn", phase: "blocked", data: { receipt_checksum: interruption.receipt.checksum } });
          await ctx.onTaskStatusChange?.(updated || task, "interrupted", reason);
          return sendJson(res, { success: true, task: updated, interruption_receipt: interruption.receipt, queue_status: getQueueStatus() });
        }
        if (runningTaskIds.has(taskId)) return sendJson(res, { error: "旧执行仍在终止，请稍后再恢复" }, 409);
        const recovery = resumeInterruptedTaskExecution(task, { userRequested: true, authorizationValid: true, runtimeValid: true });
        if (!recovery.resumed) return sendJson(res, { error: recovery.decision.reason, recovery_decision: recovery.decision }, 409);
        const updated = updateTask(taskId, { status: "pending", acceptance_state: task.interruption_receipt?.checkpoint || "planned", auto_execute: true, is_paused: false, paused: false, recovery_pending: false, recovery_decision: recovery.decision, execution_attempt: Math.max(0, Number(task.execution_attempt || 0)) + 1, resumed_at: new Date().toISOString(), status_detail: "已恢复原任务和子 Agent 会话，等待继续执行" });
        appendSafeRecoveryMilestone(updated || task, recovery);
        appendTaskTimelineEvent(taskId, { type: "task_recovered", title: "已恢复原任务和子 Agent 会话", detail: recovery.decision.reason, status: "ok", phase: "queued", data: { reopened_session_ids: recovery.reopenedSessions.map((item: any) => item.id), recovery_checksum: recovery.decision.checksum } });
        const queued = enqueueTask(taskId, ctx);
        return sendJson(res, { success: true, task: updated, recovery_decision: recovery.decision, queue_result: queued });
      } catch (e: any) { return sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/cancel/preview" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = rejectTaskRead(taskId, "manage");
        if (!task) return;
        if (rejectTaskMutationConflict(res, task, payload, false)) return;
        if (taskStopTerminal(task)) return sendJson(res, { error: "任务已经结束，无法停止" }, 409);
        res.setHeader("Cache-Control", "private, no-store");
        sendJson(res, { success: true, preview: buildTaskStopPreview(task, String(payload.cascade || "")) });
      } catch (error: any) { sendJson(res, { error: error.message || "无法生成停止预览" }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/cancel/status" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
    const task = rejectTaskRead(taskId, "manage");
    if (!task) return true;
    const scopeIds = Array.isArray(task?.cancellation_scope?.target_ids) && task.cancellation_scope.target_ids.length
      ? task.cancellation_scope.target_ids.map(String)
      : [taskId];
    const rows = loadTasks().filter((item: any) => scopeIds.includes(String(item?.id || "")));
    const activeRuns = rows.flatMap((item: any) => listActiveAgentRuns({ taskId: String(item.id || "") }));
    const liveExecutions = rows.flatMap((item: any) => listExecutions({ taskId: String(item.id || "") }))
      .filter((execution: any) => !["succeeded", "failed", "cancelled"].includes(String(execution?.state || "")));
    const stillRunning = rows.some((item: any) => runningTaskIds.has(String(item.id || ""))) || activeRuns.length > 0 || liveExecutions.length > 0;
    const requestedAt = String(task?.cancellation_requested_at || task?.cancellation_progress?.requested_at || "");
    const elapsedMs = requestedAt ? Math.max(0, Date.now() - Date.parse(requestedAt)) : 0;
    const stuck = stillRunning && elapsedMs >= 30_000;
    let current = task;
    if (!stillRunning && task?.cancellation_requested_at && String(task?.status || "") !== "cancelled") {
      for (const row of rows) {
        if (taskStopTerminal(row) && String(row?.status || "") !== "in_progress") continue;
        updateTask(row.id, {
          status: "cancelled", status_detail: "任务已安全停止", cancelled_at: new Date().toISOString(),
          cancellation_progress: { ...(row.cancellation_progress || {}), stage: "cancelled", completed_at: new Date().toISOString() },
        });
        clearTaskCancellation(row.id);
      }
      current = loadTasks().find((item: any) => String(item?.id || "") === taskId) || task;
    }
    const stage = !stillRunning ? "cancelled" : stuck ? "needs_attention" : "stopping";
    res.setHeader("Cache-Control", "private, no-store");
    sendJson(res, {
      success: true,
      status: {
        taskId, stage, stillRunning, stuck, elapsedMs,
        activeAgentCount: activeRuns.length,
        activeExecutionCount: liveExecutions.length,
        steps: [
          { id: "request", label: "停止请求已接收", status: "completed" },
          { id: "agents", label: "停止 Agent 与验证进程", status: stillRunning ? "running" : "completed" },
          { id: "workspace", label: "保留检查点并收口工作区", status: stillRunning ? "pending" : "completed" },
          { id: "done", label: "任务已停止", status: stillRunning ? "pending" : "completed" },
        ],
        availableActions: stuck ? [
          { id: "recheck", kind: "recheck", label: "重新检查" },
          { id: "takeover", kind: "takeover", label: "人工接管" },
        ] : [],
        revision: Math.max(0, Number(current?.revision || 0)),
        generation: Math.max(1, Number(current?.generation || current?.workflow_generation || 1)),
        contentStored: false,
      },
    });
    return true;
  }

  if (pathname === "/api/tasks/cancel/recheck" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        const task = rejectTaskRead(taskId, "manage");
        if (!task) return;
        if (rejectTaskMutationConflict(res, task, payload, false)) return;
        const action = String(payload.action || "recheck");
        const ids = Array.isArray(task?.cancellation_scope?.target_ids) ? task.cancellation_scope.target_ids.map(String) : [taskId];
        for (const id of ids) requestTaskCancellation(id, action === "takeover" ? "用户人工接管未退出的任务进程" : "用户重新检查任务停止状态", "task-stop-governance");
        if (action === "takeover") {
          const updated = updateTask(taskId, {
            status: "manual_takeover", recovery_pending: true, acceptance_state: "recovery_required",
            status_detail: "自动停止未能确认，已转为人工接管并保留现场",
            cancellation_progress: { ...(task.cancellation_progress || {}), stage: "needs_attention", takeover_at: new Date().toISOString() },
          });
          addTaskLog(taskId, "warning", "自动停止超时，用户已人工接管");
          await ctx.onTaskStatusChange?.(updated || task, "needs_user", "自动停止超时，已人工接管");
          return sendJson(res, { success: true, task: updated, takeover: true });
        }
        addTaskLog(taskId, "info", "用户重新检查并再次发送停止请求");
        sendJson(res, { success: true, rechecked: true });
      } catch (error: any) { sendJson(res, { error: error.message || "重新检查失败" }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/cancel/undo" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        const task = rejectTaskRead(taskId, "manage");
        if (!task) return;
        if (rejectTaskMutationConflict(res, task, payload, false)) return;
        const undo = task?.cancellation_undo;
        if (!undo?.expires_at || Date.parse(String(undo.expires_at)) <= Date.now()) return sendJson(res, { error: "撤销停止已过期" }, 409);
        const targets = Array.isArray(undo.targets) ? undo.targets : [];
        const currentTasks = loadTasks();
        for (const snapshot of targets) {
          const current = currentTasks.find((item: any) => String(item?.id || "") === String(snapshot?.task_id || ""));
          if (!current || String(current.status || "") !== "cancelled" || listActiveAgentRuns({ taskId: current.id }).length) {
            return sendJson(res, { error: "任务状态已变化，不能撤销停止" }, 409);
          }
        }
        const restored: any[] = [];
        for (const snapshot of targets) {
          clearTaskCancellation(String(snapshot.task_id || ""));
          const updated = updateTask(String(snapshot.task_id || ""), {
            status: snapshot.status || "pending", auto_execute: snapshot.auto_execute !== false,
            is_paused: snapshot.is_paused === true, paused: snapshot.paused === true,
            status_detail: "已撤销停止，恢复原任务状态", acceptance_state: snapshot.acceptance_state || "planned",
            terminal_state_receipt: null, terminal_decision: null, terminal_gate: null,
            cancellation_requested_at: null,
            cancellation_reason: null, cancelled_at: null, cancellation_scope: null,
            cancellation_progress: null, cancellation_undo: null,
          });
          if (snapshot.was_queued || (snapshot.status === "pending" && snapshot.auto_execute !== false)) enqueueTask(String(snapshot.task_id || ""), ctx);
          if (updated) restored.push(updated);
        }
        addTaskLog(taskId, "info", "用户在安全窗口内撤销停止，任务已恢复原状态");
        appendTaskTimelineEvent(taskId, { type: "task_stop_undone", title: "已撤销停止", detail: "任务已恢复到停止前状态", status: "ok", phase: "queued" });
        const current = loadTasks().find((item: any) => String(item?.id || "") === taskId) || restored[0] || task;
        await ctx.onTaskStatusChange?.(current, "restored", "用户撤销停止");
        sendJson(res, { success: true, task: current, restored });
      } catch (error: any) { sendJson(res, { error: error.message || "撤销停止失败" }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/cancel" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = rejectTaskRead(taskId, "manage");
        if (!task) return;
        if (rejectTaskMutationConflict(res, task, payload, false)) return;
        if (taskStopTerminal(task)) return sendJson(res, { error: "已经结束的任务不能停止" }, 409);
        const cascade = String(payload.cascade || "") === "task_only" ? "task_only" : taskStopDescendants(task).some(item => !taskStopTerminal(item)) ? "descendants" : "task_only";
        const preview = buildTaskStopPreview(task, cascade);
        const suppliedPreviewToken = String(payload.preview_token || payload.previewToken || "");
        if (suppliedPreviewToken && suppliedPreviewToken !== preview.previewToken) {
          return sendJson(res, { success: false, error: "任务影响范围已变化，请重新确认", code: "TASK_STOP_PREVIEW_CONFLICT" }, 409);
        }
        const targets = taskStopTargets(task, cascade).filter(item => !taskStopTerminal(item));
        const reason = compactFormText(payload.reason, "用户主动停止任务");
        const requestedAt = new Date().toISOString();
        const batchId = `stop_${crypto.randomBytes(8).toString("hex")}`;
        const undoTargets = preview.canUndo ? targets.map(item => ({
          task_id: String(item.id || ""), status: String(item.status || "pending"), auto_execute: item.auto_execute !== false,
          is_paused: item.is_paused === true, paused: item.paused === true, was_queued: taskStopQueued(String(item.id || "")),
          acceptance_state: item.acceptance_state || "planned",
        })) : [];
        const results: any[] = [];
        let anyRunning = false;
        for (const target of targets) {
          const targetId = String(target.id || "");
          removeTaskFromQueues(targetId);
          const cancellation = requestTaskCancellation(targetId, reason, String(payload.actor || "local-user"));
          const testAgentRunsCancelled = cancelTestAgentRunsForTask(targetId, reason);
          const isRunning = runningTaskIds.has(targetId) || listActiveAgentRuns({ taskId: targetId }).length > 0;
          anyRunning = anyRunning || isRunning;
          const sessions = closeTaskAgentSessions({ taskId: targetId }, "用户停止任务，关闭任务级原生会话");
          const idempotencySettled = target.trace_id ? settleIdempotencyByTrace(target.trace_id, "failed", { cancelled: true, task_id: targetId, reason }) : [];
          const worktrees: any[] = [];
          for (const execution of listExecutions({ taskId: targetId })) {
            if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt) continue;
            try { worktrees.push({ execution_id: execution.id, ...cleanupExecutionWorktree(execution.id, true) }); }
            catch (error: any) { worktrees.push({ execution_id: execution.id, success: false, error: error.message }); }
          }
          const updatedTarget = updateTask(targetId, {
            status: isRunning ? "in_progress" : "cancelled", auto_execute: false, is_paused: true, paused: true,
            status_detail: isRunning ? "正在安全停止 Agent 并收口工作区" : "任务已停止",
            cancellation_requested_at: requestedAt, cancellation_reason: reason, cancellation_actor: String(payload.actor || "local-user"),
            cancellation_audit: { schema: "ccm-task-stop-audit-v1", batch_id: batchId, actor: String(payload.actor || "local-user"), reason, requested_at: requestedAt, cascade, root_task_id: taskId, contentStored: false },
            cancellation_scope: { batch_id: batchId, root_task_id: taskId, cascade, target_ids: targets.map(item => String(item.id || "")) },
            cancellation_progress: { schema: "ccm-task-stop-progress-v1", batch_id: batchId, stage: isRunning ? "stopping" : "cancelled", requested_at: requestedAt, ...(isRunning ? {} : { completed_at: requestedAt }) },
            cancellation_cleanup: { sessions_closed: sessions.length, test_agent_runs_cancelled: testAgentRunsCancelled.length, idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0), worktrees },
            ...(isRunning ? {} : { cancelled_at: requestedAt }),
          });
          if (!isRunning) { releaseTaskLease(targetId, "cancelled"); clearTaskCancellation(targetId); }
          updateGroupTaskInlineStatus(updatedTarget || target, isRunning ? "in_progress" : "cancelled", isRunning ? "正在安全停止" : "任务已停止");
          addTaskLog(targetId, "warning", isRunning ? "已发送停止请求，正在终止 Agent 进程并收口工作区" : "已从队列移除并停止任务");
          appendTaskTimelineEvent(targetId, { type: "task_stop_requested", title: isRunning ? "正在停止任务" : "任务已停止", detail: reason, status: isRunning ? "active" : "warning", phase: "cancelled", data: { batch_id: batchId, root_task_id: taskId, cascade } });
          await ctx.onTaskStatusChange?.(updatedTarget || target, isRunning ? "cancelling" : "cancelled", reason);
          results.push({ taskId: targetId, task: updatedTarget, running: isRunning, cancellation });
        }
        let updated = loadTasks().find((item: any) => String(item?.id || "") === taskId) || task;
        if (preview.canUndo && !anyRunning) {
          const expiresAt = new Date(Date.now() + 10_000).toISOString();
          updated = updateTask(taskId, { cancellation_undo: { schema: "ccm-task-stop-undo-v1", batch_id: batchId, expires_at: expiresAt, targets: undoTargets } }) || updated;
        }
        sendJson(res, {
          success: true, task: updated, running: anyRunning, targets: results,
          progress: { taskId, stage: anyRunning ? "stopping" : "cancelled", batchId, targetTaskCount: targets.length },
          undoAvailable: preview.canUndo && !anyRunning,
          undoExpiresAt: updated?.cancellation_undo?.expires_at || "",
          queue_status: getQueueStatus(),
        });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (["/api/tasks/execution/rollback", "/api/tasks/execution/rewind", "/api/tasks/execution/merge", "/api/tasks/execution/cleanup"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if ((pathname.endsWith("/rollback") || pathname.endsWith("/rewind")) && payload.preview_only === true) {
          return sendJson(res, previewExecutionCheckpointRecovery(String(payload.checkpoint_id || payload.checkpointId || ""), { paths: payload.paths }));
        }
        if (payload.confirmed !== true) return sendJson(res, { error: "该操作需要服务端确认回执" }, 409);
        let result: any;
        if (pathname.endsWith("/rollback") || pathname.endsWith("/rewind")) result = rollbackExecutionCheckpoint(String(payload.checkpoint_id || payload.checkpointId || ""), String(payload.reason || ""), {
          allowShared: payload.allow_shared === true || payload.allowShared === true,
          paths: pathname.endsWith("/rewind") ? payload.paths : undefined,
          cancelExecution: pathname.endsWith("/rollback"),
          previewToken: payload.preview_token || payload.previewToken || "",
          authoritative: payload.authoritative === true,
        });
        else if (pathname.endsWith("/merge")) result = mergeExecutionWorktree(String(payload.execution_id || payload.executionId || ""), { force: !!payload.force, commit: payload.commit !== false, message: payload.message || "" });
        else result = cleanupExecutionWorktree(String(payload.execution_id || payload.executionId || ""), !!payload.force);
        const executionId = String(payload.execution_id || payload.executionId || result?.executionId || "");
        const executionRecord = executionId ? loadExecution(executionId) : null;
        const task = executionRecord?.taskId ? loadTasks().find((item: any) => item.id === executionRecord.taskId) : null;
        if (task?.trace_id) {
          const action = pathname.endsWith("/merge") ? "merge" : pathname.endsWith("/rewind") ? "rewind" : pathname.endsWith("/rollback") ? "rollback" : "cleanup";
          appendTraceEvent(task.trace_id, { id: `execution:${executionId}:${action}:${result?.mergeCommit || result?.rolledBackAt || result?.cleanedAt || "done"}`, type: `execution.${action}`, status: "ok", task_id: task.id, group_id: task.group_id || "", agent: executionRecord?.project || "", message: result?.duplicate ? `${action} 重复请求已复用原结果` : `${action} 操作完成`, data: result });
        }
        sendJson(res, result);
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (pathname === "/api/tasks/execution/checkpoint" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const executionId = String(payload.execution_id || payload.executionId || "").trim();
        if (!executionId) return sendJson(res, { error: "缺少 Execution ID" }, 400);
        const execution = loadExecution(executionId);
        if (!execution) return sendJson(res, { error: "执行记录不存在" }, 404);
        const workDir = String(execution.workspace?.worktreePath || execution.workspace?.workDir || execution.packet?.workDir || "").trim();
        if (!workDir || !fs.existsSync(workDir)) return sendJson(res, { error: "执行工作目录不存在" }, 409);
        const checkpoint = createExecutionCheckpoint({ executionId, taskId: execution.taskId, workDir, mode: execution.workspace?.mode || execution.packet?.isolation?.mode || "shared", label: String(payload.label || "用户检查点") });
        if (execution.taskId) {
          const task = loadTasks().find((item: any) => item.id === execution.taskId);
          if (task?.trace_id) appendTraceEvent(task.trace_id, { type: "execution.checkpoint", status: "ok", task_id: task.id, agent: execution.project, message: `已创建检查点 ${checkpoint.id}`, data: { execution_id: executionId, checkpoint_id: checkpoint.id } });
        }
        sendJson(res, { success: true, checkpoint });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    });
    return true;
  }

  if (pathname === "/api/tasks" && req.method === "GET") {
    const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
    const onlyArchived = String(parsed.query.archived || "") === "true";
    const allTasks = loadTasks();
    const principal = (req as any).ccmAuth;
    const accessibleTasks = principal?.kind === "browser" && principal.role !== "admin"
      ? allTasks.filter((task: any) => hasTaskResourceAccess(task, principal, "use"))
      : allTasks;
    const isArchivedTask = (task: any) => !!(task.archived || task.deleted_at || task.status === "archived");
    const tasks = onlyArchived
      ? accessibleTasks.filter(isArchivedTask)
      : includeArchived ? accessibleTasks : accessibleTasks.filter((task: any) => !isArchivedTask(task));
    sendJson(res, { tasks, archived_count: accessibleTasks.filter(isArchivedTask).length });
    return true;
  }

  if (pathname === "/api/tasks/requirement-epic/self-test" && req.method === "GET") {
    try {
      sendJson(res, runRequirementEpicSelfTest());
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || String(error) }, 500);
    }
    return true;
  }

  if (pathname === "/api/tasks/requirement-epic/metrics" && req.method === "GET") {
    const tasks = loadTasks();
    const epics = tasks.filter((task: any) => task.workflow_type === "requirement_epic");
    const epicIds = new Set(epics.map((task: any) => task.id));
    const children = tasks.filter((task: any) => epicIds.has(task.parent_task_id));
    const durations = epics
      .filter((task: any) => task.completed_at && task.created_at)
      .map((task: any) => Math.max(0, Date.parse(task.completed_at) - Date.parse(task.created_at)))
      .filter(Number.isFinite);
    const byStatus = (rows: any[]) => rows.reduce((result: any, row: any) => {
      const status = String(row.status || "unknown");
      result[status] = Number(result[status] || 0) + 1;
      return result;
    }, {});
    sendJson(res, {
      success: true,
      schema: "ccm-requirement-epic-metrics-v1",
      generated_at: new Date().toISOString(),
      epics: {
        total: epics.length,
        by_status: byStatus(epics),
        awaiting_confirmation: epics.filter((task: any) => task.intake_state === "awaiting_confirmation").length,
        awaiting_change_review: epics.filter((task: any) => task.status === "awaiting_change_review").length,
        versioned: epics.filter((task: any) => Number(task.requirement_version || 1) > 1).length,
        average_completion_ms: durations.length ? Math.round(durations.reduce((sum: number, value: number) => sum + value, 0) / durations.length) : 0,
      },
      children: {
        total: children.length,
        by_status: byStatus(children),
        dependency_waiting: children.filter((task: any) => task.status === "pending" && Array.isArray(task.mission_dependencies) && task.mission_dependencies.length > 0).length,
        reworked: children.filter((task: any) => Number(task.retry_count || 0) > 0 || Number(task.requirement_version || 1) > 1).length,
      },
    });
    return true;
  }

  return false;
}

// ===== merged from collaboration-routes-part-02.ts =====

export function handleCollaborationApiIntakeRoutes(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: any,
): boolean {
  if (handleCollaborationApiIntakeRoutesPartA(pathname, req, res, parsed, ctx)) return true;
  return handleCollaborationApiIntakeRoutesPartB(pathname, req, res, parsed, ctx);
}

// ===== merged from collaboration-routes-part-02-part-01.ts =====

// Extracted functional module. The original entry remains a compatibility facade.

function bindRequirementPlanTargetSessions(plan: any, input: {
  groups: any[];
  configs: any[];
  defaultGroup?: any;
  defaultProject?: string;
  taskSource?: string;
}) {
  if (!plan || !Array.isArray(plan.items)) return plan;
  const defaultGroupId = String(input.defaultGroup?.id || "");
  const defaultProject = String(input.defaultProject || "");
  const items = plan.items.map((item: any) => {
    const targetType = String(item.target_type || "auto");
    const targetId = String(item.target_id || "").trim();
    if (targetType === "group" || (targetType === "auto" && defaultGroupId)) {
      const group = targetType === "group"
        ? input.groups.find((candidate: any) => candidate.id === targetId || candidate.name === targetId)
        : input.defaultGroup;
      if (!group) return item;
      const resolution = resolveAutomationSessionBinding({
        scope: "group",
        scopeId: group.id,
        source: input.taskSource || "workbench",
        title: compactFormText(item.title || plan.epic_title, "需求子任务").slice(0, 80),
        actor: "requirement_plan_target_resolution",
      });
      return { ...item, target_session_id: resolution.snapshot.exactSessionId, automation_session_binding_snapshot: resolution.snapshot };
    }
    const projectName = targetType === "project" ? targetId : defaultProject;
    if (!projectName || !input.configs.some((config: any) => config.name === projectName)) return item;
    const resolution = resolveAutomationSessionBinding({
      scope: "project",
      scopeId: projectName,
      source: input.taskSource || "workbench",
      title: compactFormText(item.title || plan.epic_title, "需求子任务").slice(0, 80),
      actor: "requirement_plan_target_resolution",
    });
    return { ...item, target_session_id: resolution.snapshot.exactSessionId, automation_session_binding_snapshot: resolution.snapshot };
  });
  return { ...plan, items };
}


export function handleCollaborationApiIntakeRoutesPartA(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx,
): boolean {
  if (pathname === "/api/usability/intake/preview" && req.method === "POST") {
    const handleIntakePreview = async (payload: any, files: any[] = []) => {
      try {
        const userRequirement = compactFormText(payload.requirement || payload.goal || payload.message, "");
        const groups = loadGroups();
        const configs = getConfigs();
        const availableTargets = [
          ...groups.map((group: any) => ({
            type: "group",
            id: group.id,
            name: group.name || group.id,
            capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
          })),
          ...configs.map((config: any) => ({ type: "project", id: config.name, name: config.name })),
        ];
        const sourceIngestion = await ingestRequirementSources({
          files,
          userText: userRequirement,
          extractRequirement: true,
          decomposeRequirement: true,
          availableTargets,
        });
        const extractedRequirement = sourceIngestion.requirement;
        if (sourceIngestion.coverage_receipt?.complete === false) {
          removeUploadedFiles(files);
          return sendJson(res, {
            error: "仍有必需资料未完整读取，请重试、移除或改为非必需后再生成计划",
            code: "requirement_source_coverage_incomplete",
            source_ingestion: sourceIngestion.technical,
            coverage_receipt: sourceIngestion.coverage_receipt,
          }, 422);
        }
        if (!extractedRequirement) {
          removeUploadedFiles(files);
          return sendJson(res, {
            error: sourceIngestion.warnings?.[0] || "统一大模型未能形成可靠需求结构，本轮未创建任务",
            code: "requirement_model_decision_required",
            source_ingestion: sourceIngestion.technical,
          }, 503);
        }
        const requirement = compactFormText(extractedRequirement?.business_goal || userRequirement, "");
        if (!requirement && sourceIngestion.sources.length === 0) return sendJson(res, { error: "请先说说你想完成什么，或者上传需求资料" }, 400);
        const group = groups.find((item: any) => item.id === (payload.group_id || payload.groupId)) || null;
        const requestedProject = compactFormText(payload.target_project || payload.targetProject, "");
        const coordinator = group?.members?.find((member: any) => member.role === "coordinator")?.project || group?.members?.[0]?.project || "";
        const targetProject = requestedProject || coordinator || configs[0]?.name || "";
        if (!targetProject && !group) return sendJson(res, { error: "还没有可执行项目，请先添加项目或开发群聊" }, 409);
        const requestOrigin = compactFormText(payload.source || payload.request_origin || payload.requestOrigin, "workbench");
        const automationSource = normalizeAutomationTaskSource(requestOrigin) || "workbench";
        const resolvedAutomationSession = resolveAutomationSessionBinding({
          scope: group ? "group" : "project",
          scopeId: group?.id || targetProject,
          source: automationSource,
          title: compactFormText(payload.title || requirement, "自动开发任务").slice(0, 80),
          actor: requestOrigin,
        });
        const groupSession = group ? { id: resolvedAutomationSession.snapshot.exactSessionId } : null;
        const projectSession = !group ? { sessionId: resolvedAutomationSession.snapshot.exactSessionId } : null;
        sourceIngestion.decomposition = bindRequirementPlanTargetSessions(sourceIngestion.decomposition, {
          groups,
          configs,
          defaultGroup: group,
          defaultProject: targetProject,
          taskSource: automationSource,
        });
        const clientMessageId = compactFormText(payload.client_message_id || payload.clientMessageId, "")
          || `intake_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
        const workflowDecision = await decideWorkflowWithModel({
          message: requirement,
          scope: group ? "group" : "project",
          sourceCount: sourceIngestion.sources.length,
          context: {
            explicit_intake_preview: true,
            target_project: targetProject,
            group_id: group?.id || "",
            extracted_requirement: extractedRequirement,
          },
        });
        const areas = Array.isArray(extractedRequirement.scope)
          ? extractedRequirement.scope.map((item: any) => compactFormText(item, "")).filter(Boolean)
          : [];
        if (!areas.length) areas.push(group ? "群聊内相关项目" : "目标项目");
        const acceptanceFallback = compactFormText(payload.acceptance_criteria || payload.acceptanceCriteria, "") || [
          "目标功能按描述完成，并覆盖主要正常流程",
          "相关项目通过现有构建或测试命令",
          "交付报告列出实际修改文件、验证结果和剩余风险",
        ].join("；");
        const fallbackRisks = [
          group ? "多个项目之间的接口或数据契约需要保持一致" : "实现范围可能需要根据现有代码进一步收敛",
          "涉及既有行为时需要回归验证，避免影响当前功能",
        ];
        const extractedAcceptance = extractedRequirement?.acceptance_criteria || [];
        const acceptance = extractedAcceptance.length ? extractedAcceptance.join("；") : acceptanceFallback;
        const title = compactFormText(payload.title, "") || extractedRequirement?.title || requirement.replace(/\s+/g, " ").slice(0, 48) || "处理提交的需求资料";
        const intakeDraft = {
          ...requirementToIntakeDraft(extractedRequirement, {
            requirement,
            scope: areas,
            acceptance: acceptance.split("；").filter(Boolean),
            risks: fallbackRisks,
          }),
          project: targetProject,
          group_id: group?.id || "",
          group_name: group?.name || "",
          project_session_id: projectSession?.sessionId || "",
          group_session_id: groupSession?.id || "",
          source_summary: sourceIngestion.user_summary,
          source_ingestion: sourceIngestion.technical,
          decomposition_plan: sourceIngestion.decomposition,
          requirement_content_hash: sourceIngestion.content_hash,
          workflow_decision: workflowDecision,
        };
        const sourceDocuments = [
          userRequirement ? `用户输入：\n${userRequirement}` : "",
          sourceIngestion.source_documents,
          extractedRequirement ? `结构化需求：\n${JSON.stringify(extractedRequirement, null, 2)}` : "",
        ].filter(Boolean).join("\n\n");
        const task = createTask({
          title,
          description: requirement,
          business_goal: requirement,
          acceptance_criteria: acceptance,
          source_documents: sourceDocuments,
          source_attachments: sourceIngestion.attachments,
          requirement_extraction: extractedRequirement,
          requirement_decomposition: sourceIngestion.decomposition,
          decomposition_plan: sourceIngestion.decomposition,
          requirement_content_hash: sourceIngestion.content_hash,
          source_ingestion: sourceIngestion.technical,
          target_project: targetProject,
          priority: payload.priority || "normal",
          group_id: group?.id || null,
          group_session_id: groupSession?.id || null,
          project_session_id: projectSession?.sessionId || null,
          assign_type: group ? "group" : "project",
          orchestration_scope: group ? "group_session" : "project_session",
          queue_scope: payload.queue_scope || payload.queueScope || "conversation_serial",
          request_origin: requestOrigin,
          automation_task_source: automationSource,
          source_channel: payload.source_channel || payload.sourceChannel || requestOrigin,
          target_scope: group ? "group_session" : "project_session",
          target_id: group?.id || targetProject,
          exact_session_id: groupSession?.id || projectSession?.sessionId || "",
          client_message_id: clientMessageId,
          workflow_type: "requirement_epic",
          requires_code_changes: typeof payload.requires_code_changes === "boolean" ? payload.requires_code_changes : workflowDecision.requiresCodeChanges,
          requires_verification: Array.isArray(workflowDecision.verificationModes) && workflowDecision.verificationModes.length > 0,
          auto_execute: false,
          intake_state: "awaiting_confirmation",
          intake_draft: intakeDraft,
          workflow_decision: workflowDecision,
          workflow_meta: {
            intake: {
              source: requestOrigin,
              channel: payload.channel || "web",
              project_session_id: projectSession?.sessionId || "",
              group_session_id: groupSession?.id || "",
              client_message_id: clientMessageId,
              source_ingestion: sourceIngestion.technical,
            },
            requirement_epic: {
              version_of_epic_id: payload.epic_id || payload.epicId || "",
              content_hash: sourceIngestion.content_hash,
            },
          },
          trace_id: payload.trace_id || payload.traceId,
          idempotency_key: payload.idempotency_key || payload.idempotencyKey || "",
        });
        const updated = updateTask(task.id, { status: "pending", auto_execute: false, intake_state: "awaiting_confirmation", intake_draft: intakeDraft, status_detail: "执行计划已准备好，等待你确认" }) || task;
        appendTraceEvent(updated.trace_id, { type: "intake.previewed", status: "ok", task_id: updated.id, group_id: updated.group_id || "", agent: targetProject, message: "已生成执行前确认卡，尚未开始执行", data: intakeDraft });
        appendTaskTimelineEvent(updated.id, {
          type: "requirement_sources_ingested",
          title: "需求资料已读取",
          detail: sourceIngestion.user_summary || "已根据用户文字整理需求",
          status: sourceIngestion.warnings.length ? "warning" : "completed",
          data: sourceIngestion.technical,
        });
        sendJson(res, { success: true, task: updated, confirmation: intakeDraft, source_ingestion: sourceIngestion.technical, same_task_trace: true });
      } catch (e: any) {
        removeUploadedFiles(files);
        sendJson(res, { error: e.message }, 400);
      }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      parseSecureMultipartRequest(req).then(({ fields, files }) => {
        return handleIntakePreview(fields || {}, files || []);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { handleIntakePreview(body ? JSON.parse(body) : {}); }
      catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (["/api/requirements/sources/retry", "/api/requirements/sources/refresh"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || "").trim();
        const current = loadTasks().find((item: any) => String(item.id || "") === taskId);
        if (!current) return sendJson(res, { error: "需求草稿或任务不存在" }, 404);
        const attachments = Array.isArray(current.source_attachments) ? current.source_attachments : [];
        if (!attachments.length) return sendJson(res, { error: "当前任务没有可重新读取的来源" }, 409);
        const requestedIds = new Set((Array.isArray(payload.source_ids || payload.sourceIds) ? (payload.source_ids || payload.sourceIds) : [])
          .map((value: any) => String(value || "")).filter(Boolean));
        const selected = requestedIds.size ? attachments.filter((item: any) => requestedIds.has(String(item.id || ""))) : attachments;
        if (!selected.length) return sendJson(res, { error: "没有找到指定来源" }, 404);
        if (pathname.endsWith("/refresh") && !selected.some((item: any) => item.url)) {
          return sendJson(res, { error: "刷新仅适用于在线文档快照" }, 409);
        }
        const requirementBySource: Record<string, boolean> = {};
        for (const item of attachments) {
          requirementBySource[String(item.id || "")] = item.required !== false;
          if (item.url) requirementBySource[String(item.url)] = item.required !== false;
        }
        if (typeof payload.required === "boolean") {
          for (const item of selected) {
            item.required = payload.required;
            requirementBySource[String(item.id || "")] = payload.required;
            if (item.url) requirementBySource[String(item.url)] = payload.required;
          }
        }
        const files = attachments.filter((item: any) => item.path).map((item: any) => ({
          filename: item.name,
          savedPath: item.path,
          size: item.size,
          required: item.required !== false,
        }));
        const urls = attachments.map((item: any) => String(item.url || "")).filter(Boolean);
        const groups = loadGroups();
        const availableTargets = [
          ...groups.map((group: any) => ({ type: "group", id: group.id, name: group.name || group.id, capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []) })),
          ...getConfigs().map((config: any) => ({ type: "project", id: config.name, name: config.display_name || config.name })),
        ];
        const ingestion = await ingestRequirementSources({
          files,
          urls,
          userText: current.business_goal || current.description || current.title || "",
          extractRequirement: true,
          decomposeRequirement: true,
          availableTargets,
          sourceRequirements: requirementBySource,
        });
        const refreshedAt = new Date().toISOString();
        const history = [...(Array.isArray(current.source_refresh_history) ? current.source_refresh_history : []), {
          action: pathname.endsWith("/refresh") ? "refresh" : "retry",
          source_ids: selected.map((item: any) => item.id),
          old_content_hash: current.requirement_content_hash || "",
          new_content_hash: ingestion.content_hash,
          coverage_checksum: ingestion.coverage_receipt?.checksum || "",
          at: refreshedAt,
        }].slice(-30);
        const updated = updateTask(taskId, {
          source_attachments: ingestion.attachments,
          source_documents: ingestion.source_documents,
          source_ingestion: ingestion.technical,
          requirement_extraction: ingestion.requirement,
          requirement_decomposition: ingestion.decomposition,
          decomposition_plan: ingestion.decomposition,
          requirement_content_hash: ingestion.content_hash,
          source_refresh_history: history,
          intake_state: "awaiting_confirmation",
          auto_execute: false,
          status: "pending",
          status_detail: ingestion.coverage_receipt?.complete && ingestion.decomposition
            ? "资料已重新读取，计划已更新，等待重新确认"
            : "资料重新读取后仍不完整，已阻止自动派发",
        });
        appendTaskTimelineEvent(taskId, {
          type: pathname.endsWith("/refresh") ? "requirement_sources_refreshed" : "requirement_sources_retried",
          title: pathname.endsWith("/refresh") ? "在线文档快照已刷新" : "需求资料已重新读取",
          detail: ingestion.user_summary || "已重新核验需求来源",
          status: ingestion.coverage_receipt?.complete && ingestion.decomposition ? "completed" : "warning",
          phase: "planning",
          agent: "system",
          data: { coverage_receipt: ingestion.coverage_receipt, content_hash: ingestion.content_hash, source_ids: selected.map((item: any) => item.id) },
        });
        const success = ingestion.coverage_receipt?.complete === true && !!ingestion.requirement && !!ingestion.decomposition;
        return sendJson(res, {
          success,
          task: updated,
          source_ingestion: ingestion.technical,
          coverage_receipt: ingestion.coverage_receipt,
          retryable: !success,
          error: success ? undefined : "仍有资料未完整读取或模型未能生成可靠计划",
        }, success ? 200 : 422);
      } catch (error: any) {
        sendJson(res, { success: false, retryable: true, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/usability/intake/confirm" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const acceptFeedback = compactFormText(payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "", "");
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (rejectTaskMutationConflict(res, current, payload, true)) return;
        if (current.intake_state === "confirmed") return sendJson(res, { success: true, duplicate: true, task: current, trace_id: current.trace_id });
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效" }, 409);
        const requestedExactSessionId = String(
          payload.exact_session_id
          || payload.exactSessionId
          || payload.group_session_id
          || payload.groupSessionId
          || payload.project_session_id
          || payload.projectSessionId
          || "",
        ).trim();
        if (requestedExactSessionId) {
          return sendJson(res, { error: "任务确认不再接受具体会话；请只选择目标项目或群聊，系统会使用其来源绑定的自动化会话" }, 409);
        }
        const previousTargetSessionId = String(current.exact_session_id || current.group_session_id || current.project_session_id || "");
        const confirmedAt = new Date().toISOString();
        const submittedPlan = payload.decomposition_plan || payload.decompositionPlan || null;
        let confirmedPlan = submittedPlan
          ? validateRequirementDecomposition(submittedPlan, {
              contentHash: current.requirement_content_hash || submittedPlan.content_hash,
              requirement: current.requirement_extraction,
              extractionMethod: submittedPlan.extraction_method,
            })
          : (current.decomposition_plan || current.requirement_decomposition);
        const effectiveTargetSessionId = String(current.exact_session_id || current.group_session_id || current.project_session_id || "");
        if (confirmedPlan && effectiveTargetSessionId && effectiveTargetSessionId !== previousTargetSessionId) {
          const defaultTargetType = current.group_id ? "group" : "project";
          const defaultTargetId = String(current.group_id || current.target_project || "");
          confirmedPlan = {
            ...confirmedPlan,
            items: (confirmedPlan.items || []).map((item: any) => {
              const itemType = String(item.target_type || "auto");
              const itemTargetId = String(item.target_id || "");
              const followsDefault = itemType === "auto"
                || (itemType === defaultTargetType && (!itemTargetId || itemTargetId === defaultTargetId));
              const followedPrevious = String(item.target_session_id || "") === previousTargetSessionId;
              return followsDefault || followedPrevious ? { ...item, target_session_id: effectiveTargetSessionId } : item;
            }),
          };
        }
        const sourceIngestion = current.source_ingestion || current.workflow_meta?.intake?.source_ingestion || {};
        assertRequirementPlanEvidence(confirmedPlan || {}, sourceIngestion.manifest || [], sourceIngestion.coverage_receipt || {
          complete: !(sourceIngestion.blocking_sources || []).length,
        });
        if (submittedPlan) {
          appendTaskTimelineEvent(current.id, {
            type: "requirement_plan_edited",
            title: "用户调整了任务拆分",
            detail: `确认前保留 ${confirmedPlan?.items?.length || 0} 个可执行任务，依赖关系已重新校验`,
            status: "completed",
            phase: "planning",
            agent: "user",
            data: { decomposition_plan: confirmedPlan },
          });
        }
        if (current.workflow_type === "requirement_epic" && confirmedPlan) {
          const versionOfEpicId = String(current.workflow_meta?.requirement_epic?.version_of_epic_id || "").trim();
          if (versionOfEpicId) {
            const versionResult = updateRequirementEpicFromPlan({
              epic_id: versionOfEpicId,
              decomposition_plan: confirmedPlan,
              requirement_extraction: current.requirement_extraction,
              requirement_content_hash: current.requirement_content_hash,
              source_documents: current.source_documents,
              source_attachments: current.source_attachments,
              source_ingestion: current.source_ingestion,
              confirmed: true,
              auto_execute: true,
              owner_agent: current.target_project || "global-agent",
            });
            const supervisor = startGlobalMissionSupervisor({
              mission_id: versionResult.epic.id,
              trace_id: versionResult.epic.trace_id,
              session_id: versionResult.epic.group_session_id || versionResult.epic.group_id || "web",
              source: current.workflow_meta?.intake?.source || "requirement-epic-version",
              business_goal: versionResult.epic.business_goal,
              acceptance: versionResult.epic.acceptance_criteria,
              max_attempts: 3,
              restart: true,
            });
            updateTask(current.id, {
              status: "cancelled",
              intake_state: "superseded",
              status_detail: `该确认卡已应用到需求 Epic ${versionOfEpicId} 的新版本`,
              superseded_by_task_id: versionOfEpicId,
            });
            const queueResults = (versionResult.children || [])
              .filter((child: any) => child.status === "pending" && (!child.mission_dependencies || child.mission_dependencies.length === 0))
              .map((child: any) => ({ task_id: child.id, ...enqueueTask(child.id, ctx) }));
            return sendJson(res, {
              success: true,
              task: versionResult.epic,
              epic: versionResult.epic,
              children: versionResult.children,
              retired_children: versionResult.retired_children,
              diff: versionResult.diff,
              queue_results: queueResults,
              supervisor,
              trace_id: versionResult.epic.trace_id,
              same_task_trace: true,
            });
          }
          const epicResult = createRequirementEpicWithChildren({
            draft_task_id: current.id,
            decomposition_plan: confirmedPlan,
            requirement_extraction: current.requirement_extraction,
            requirement_content_hash: current.requirement_content_hash,
            source_documents: current.source_documents,
            source_attachments: current.source_attachments,
            source_ingestion: current.source_ingestion,
            group_id: current.group_id,
            group_session_id: current.group_session_id,
            project_session_id: current.project_session_id,
            queue_scope: current.queue_scope || "conversation_serial",
            orchestration_scope: current.orchestration_scope || (current.group_id ? "group_session" : "project_session"),
            request_origin: current.request_origin || current.workflow_meta?.intake?.source || "usability-intake",
            origin_session_id: current.origin_session_id || current.group_session_id || current.project_session_id,
            target_project: current.target_project,
            priority: current.priority,
            source: current.workflow_meta?.intake?.source || "usability-intake",
            channel: current.workflow_meta?.intake?.channel || "web",
            conversation_id: current.group_session_id || current.project_session_id || current.group_id || current.target_project || "global",
            client_message_id: current.workflow_meta?.intake?.client_message_id || current.id,
            intake_identity: current.intake_identity || null,
            intake_identity_checksum: current.intake_identity_checksum || "",
            source_channel: current.source_channel || current.request_origin || "usability-intake",
            target_scope: current.target_scope || current.orchestration_scope || (current.group_id ? "group_session" : "project_session"),
            target_id: current.target_id || current.group_id || current.target_project || "",
            exact_session_id: current.exact_session_id || current.group_session_id || current.project_session_id || "",
            trace_id: current.trace_id,
            idempotency_key: current.idempotency_key,
            owner_agent: current.target_project || "global-agent",
            confirmed: true,
            clarifications_resolved: !confirmedPlan?.clarification_questions?.length || !!acceptFeedback,
            auto_execute: true,
            requires_independent_review: true,
          });
          if (!epicResult.success) {
            return sendJson(res, {
              ...epicResult,
              error: epicResult.needs_clarification
                ? "仍有阻断问题，请先在“调整计划”中补充答案后再确认"
                : "请先确认完整的 Epic 任务图",
              trace_id: current.trace_id,
            }, 409);
          }
          const supervisor = startGlobalMissionSupervisor({
            mission_id: epicResult.epic.id,
            global_run_id: current.workflow_meta?.global_run_id || "",
            trace_id: epicResult.epic.trace_id,
            session_id: current.group_session_id || current.project_session_id || current.group_id || "web",
            source: current.workflow_meta?.intake?.source || "usability-intake",
            business_goal: epicResult.epic.business_goal,
            acceptance: epicResult.epic.acceptance_criteria,
            max_attempts: 3,
          });
          const queueResults = epicResult.children.map((child: any) => {
            if (Array.isArray(child.mission_dependencies) && child.mission_dependencies.length > 0) {
              return { task_id: child.id, queued: false, message: "等待前置子任务通过验收" };
            }
            const result = enqueueTask(child.id, ctx);
            return { task_id: child.id, ...result };
          });
          for (const child of epicResult.children.filter((item: any) => item.assign_type === "project" && item.project_session_id)) {
            appendProjectSessionTaskMessage(child.target_project, child.project_session_id, {
              id: `task-intake-${child.id}`,
              role: "user",
              content: child.business_goal || child.description || child.title,
              timestamp: child.created_at || confirmedAt,
              task_id: child.id,
              type: "task_dispatch_intake",
            });
            appendProjectSessionTaskMessage(child.target_project, child.project_session_id, {
              id: `task-queued-${child.id}`,
              role: "assistant",
              agent: "project-main-agent",
              content: `已创建分派任务“${child.title}”，将按当前项目会话队列顺序执行；完成开发后进入 TestAgent 独立验收。`,
              timestamp: confirmedAt,
              task_id: child.id,
              type: "task_dispatch_queued",
            });
          }
          const updatedEpic = updateTask(epicResult.epic.id, {
            intake_state: "confirmed",
            confirmed_at: confirmedAt,
            status: "in_progress",
            status_detail: `已确认任务图，${queueResults.filter((item: any) => item.queued).length}/${epicResult.children.length} 个子任务已进入队列`,
            plan_accept_feedback: acceptFeedback,
            workflow_meta: {
              ...(epicResult.epic.workflow_meta || {}),
              plan_mode: {
                ...(current.intake_draft || {}),
                requires_confirmation: false,
                accepted_at: confirmedAt,
                accepted_feedback: acceptFeedback,
              },
              requirement_epic: {
                ...((epicResult.epic.workflow_meta || {}).requirement_epic || {}),
                confirmed_at: confirmedAt,
                accepted_feedback: acceptFeedback,
              },
            },
          }) || epicResult.epic;
          exitConversationPlanModeForTask(updatedEpic);
          updateGroupTaskInlineStatus(updatedEpic, updatedEpic.status, updatedEpic.status_detail);
          return sendJson(res, {
            success: true,
            task: updatedEpic,
            epic: updatedEpic,
            children: epicResult.children,
            queue_results: queueResults,
            supervisor,
            decomposition_plan: epicResult.decomposition_plan,
            trace_id: updatedEpic.trace_id,
            same_task_trace: true,
          });
        }
        const basePlan = getTaskPlanMode(current) || current.intake_draft || {};
        const acceptedPlan = buildAcceptedPlanModeDraft(basePlan, acceptFeedback, confirmedAt);
        const meta = current.workflow_meta || {};
        const acceptanceText = current.acceptance_criteria || current.acceptanceCriteria || "";
        const nextAcceptance = acceptFeedback
          ? uniqueStrings([...splitUserAcceptanceText(acceptanceText), `执行时纳入用户补充要求：${acceptFeedback}`]).join("\n")
          : acceptanceText;
        const nextSourceDocuments = acceptFeedback
          ? [
              current.source_documents || current.sourceDocuments || "",
              `用户确认执行前计划时补充要求（${confirmedAt}）：${acceptFeedback}`,
            ].filter(Boolean).join("\n\n")
          : (current.source_documents || current.sourceDocuments || "");
        const task = updateTask(taskId, {
          intake_state: "confirmed",
          confirmed_at: confirmedAt,
          auto_execute: true,
          status: "pending",
          status_detail: acceptFeedback ? "你已确认执行计划，并补充了执行要求，正在进入执行队列" : "你已确认执行计划，正在进入执行队列",
          intake_draft: acceptedPlan,
          plan_accept_feedback: acceptFeedback,
          last_plan_accept_feedback: acceptFeedback,
          last_plan_accept_feedback_at: acceptFeedback ? confirmedAt : "",
          ...(acceptFeedback ? { acceptance_criteria: nextAcceptance, source_documents: nextSourceDocuments } : {}),
          workflow_meta: {
            ...meta,
            plan_mode: acceptedPlan,
            intake: {
              ...(meta.intake || {}),
              plan_mode: acceptedPlan,
              accepted_feedback: acceptFeedback,
              accepted_at: confirmedAt,
            },
            project_mission: {
              ...(meta.project_mission || {}),
              control_state: "confirmed",
            },
          },
        }) || current;
        exitConversationPlanModeForTask(task);
        appendTraceEvent(task.trace_id, {
          type: "intake.confirmed",
          status: "ok",
          task_id: task.id,
          group_id: task.group_id || "",
          agent: task.target_project || "",
          message: acceptFeedback ? "用户确认执行，并补充执行要求" : "用户确认执行，复用原 Task/Trace 开始工作",
          data: { same_task_trace: true, has_accept_feedback: !!acceptFeedback, accept_feedback: acceptFeedback || undefined },
        });
        appendTaskTimelineEvent(task.id, {
          type: "plan_mode_confirmed",
          title: "用户已确认执行前计划",
          detail: acceptFeedback ? `带着补充要求进入执行队列：${compactMemoryText(acceptFeedback, 180)}` : "复用同一任务和 Trace 进入执行队列",
          status: "ok",
          phase: "queued",
          agent: task.target_project || "",
          data: { same_task_trace: true, has_accept_feedback: !!acceptFeedback },
        });
        if (acceptFeedback) addTaskLog(task.id, "info", `确认执行前计划时补充要求：${acceptFeedback}`);
        const queueResult = enqueueTask(task.id, ctx);
        const updated = updateTask(task.id, {
          status_detail: queueResult.message || "已进入执行队列",
          workflow_meta: {
            ...(task.workflow_meta || {}),
            project_mission: {
              ...((task.workflow_meta || {}).project_mission || {}),
              control_state: "queued",
            },
          },
        }) || task;
        updateGroupTaskInlineStatus(updated, updated.status, updated.status_detail || "已进入执行队列");
        sendJson(res, { success: true, task: updated, queued: !!queueResult.queued, queue_result: queueResult, trace_id: task.trace_id, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/usability/intake/revise" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const feedback = compactFormText(payload.feedback || payload.message || payload.reason || "", "");
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (rejectTaskMutationConflict(res, current, payload, true)) return;
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效，不能调整计划" }, 409);
        if (!feedback) return sendJson(res, { error: "请填写希望主 Agent 调整的地方" }, 400);
        const basePlan = getTaskPlanMode(current) || current.intake_draft || {};
        let revisedDecomposition = current.decomposition_plan || current.requirement_decomposition || null;
        let revisedRequirement = current.requirement_extraction || null;
        if (current.workflow_type === "requirement_epic" && revisedDecomposition) {
          const groups = loadGroups();
          const configs = getConfigs();
          const availableTargets = [
            ...groups.map((group: any) => ({
              type: "group",
              id: group.id,
              name: group.name || group.id,
              capabilities: (group.members || []).flatMap((member: any) => member.skills || member.capabilities || []),
            })),
            ...configs.map((config: any) => ({ type: "project", id: config.name, name: config.name })),
          ];
          revisedRequirement = {
            ...(revisedRequirement || {}),
            schema: revisedRequirement?.schema || "ccm-business-requirement-v1",
            business_goal: `${revisedRequirement?.business_goal || current.business_goal || current.description || current.title}\n用户修订意见：${feedback}`,
            scope: revisedRequirement?.scope || revisedDecomposition.items.flatMap((item: any) => item.scope || []),
            acceptance_criteria: revisedRequirement?.acceptance_criteria || revisedDecomposition.global_acceptance_criteria || [],
            dependencies: revisedRequirement?.dependencies || [],
            risks: revisedRequirement?.risks || revisedDecomposition.items.flatMap((item: any) => item.risks || []),
            clarification_questions: [],
            source_evidence: revisedRequirement?.source_evidence || revisedDecomposition.source_evidence || [],
            extraction_method: revisedRequirement?.extraction_method || "model",
          };
          revisedDecomposition = await decomposeRequirementToTaskPlan({
            requirement: revisedRequirement,
            availableTargets,
          });
        }
        const revisedPlan = buildRevisedPlanModeDraft({
          ...basePlan,
          ...(revisedDecomposition ? {
            decomposition_plan: revisedDecomposition,
            requirement_epic: {
              ...(basePlan.requirement_epic || {}),
              schema: revisedDecomposition.schema,
              content_hash: revisedDecomposition.content_hash,
              epic_title: revisedDecomposition.epic_title,
              global_acceptance_criteria: revisedDecomposition.global_acceptance_criteria,
              clarification_questions: revisedDecomposition.clarification_questions,
              items: revisedDecomposition.items,
              version: revisedDecomposition.version,
            },
          } : {}),
        }, feedback);
        const meta = current.workflow_meta || {};
        const task = updateTask(taskId, {
          intake_state: "awaiting_confirmation",
          intake_draft: revisedPlan,
          requirement_extraction: revisedRequirement,
          requirement_decomposition: revisedDecomposition,
          decomposition_plan: revisedDecomposition,
          requirement_content_hash: revisedDecomposition?.content_hash || current.requirement_content_hash,
          auto_execute: false,
          status: "pending",
          status_detail: "执行前计划已按你的反馈调整，等待你重新确认",
          plan_revision_count: revisedPlan.revision_count,
          last_plan_revision_feedback: revisedPlan.last_revision_feedback,
          last_plan_revision_at: revisedPlan.revised_at,
          workflow_meta: {
            ...meta,
            plan_mode: revisedPlan,
            intake: { ...(meta.intake || {}), plan_mode: revisedPlan },
            project_mission: {
              ...(meta.project_mission || {}),
              control_state: "plan_revision_requested",
            },
          },
        }) || current;
        appendTraceEvent(task.trace_id, {
          type: "intake.revision_requested",
          status: "ok",
          task_id: task.id,
          group_id: task.group_id || "",
          agent: task.target_project || "",
          message: "用户退回执行前计划并要求调整",
          data: { feedback: revisedPlan.last_revision_feedback, revision_count: revisedPlan.revision_count, same_task_trace: true },
        });
        appendTaskTimelineEvent(task.id, {
          type: "plan_mode_revision_requested",
          title: "用户要求调整执行前计划",
          detail: revisedPlan.last_revision_feedback,
          status: "warn",
          phase: "planning",
          agent: task.target_project || "",
          data: { revision_count: revisedPlan.revision_count, same_task_trace: true },
        });
        addTaskLog(task.id, "info", `执行前计划退回调整：${revisedPlan.last_revision_feedback}`);
        updateGroupTaskInlineStatus(task, "pending", task.status_detail || "执行前计划已调整，等待重新确认");
        sendJson(res, { success: true, task, plan_mode: revisedPlan, trace_id: task.trace_id, same_task_trace: true });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  return false;
}

// ===== merged from collaboration-routes-part-02-part-02.ts =====

// Extracted functional module. The original entry remains a compatibility facade.


export function handleCollaborationApiIntakeRoutesPartB(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx,
): boolean {
  if (pathname === "/api/tasks/create" && req.method === "POST") {
    const handleCreate = async (payload: any, files: any[] = []) => {
      let persistedTask: any = null;
      try {
        let taskPayload = payload || {};
        const preflight = buildTaskPreflight(taskPayload, req);
        if (!preflight.allowed) {
          removeUploadedFiles(files);
          return sendJson(res, { success: false, error: preflight.errors[0]?.message || "任务预检未通过", code: preflight.errors[0]?.code || "TASK_PREFLIGHT_FAILED", preflight }, 422);
        }
        if (preflight.requiresConfirmation && taskPayload.preflight_confirmed !== true && taskPayload.preflightConfirmed !== true) {
          removeUploadedFiles(files);
          return sendJson(res, { success: false, needs_confirmation: true, error: "任务存在重复或工作区风险，请确认后再提交", code: "TASK_PREFLIGHT_CONFIRMATION_REQUIRED", preflight }, 409);
        }
        taskPayload = {
          ...taskPayload,
          title: preflight.finalTask.title,
          description: preflight.finalTask.instructions,
          priority: preflight.finalTask.priority,
          deadline_at: preflight.finalTask.deadlineAt,
          mission_dependencies: preflight.finalTask.dependencyIds,
          task_template_id: preflight.template?.id || null,
          task_template_revision: preflight.template?.revision || null,
          template_variables: preflight.template?.rendered?.values || null,
          intake_preflight: {
            schema: preflight.schema,
            checked_at: preflight.checkedAt,
            target: preflight.target,
            automation_session: preflight.automationSession,
            agent: preflight.agent,
            test_agent: preflight.testAgent,
            warning_codes: preflight.warnings.map((item: any) => item.code),
            contentStored: false,
          },
        };
        if (files.length) {
          const attachments = await buildTaskAttachmentMutation({
            files,
            retainedIds: [],
            userText: [taskPayload.title, taskPayload.description].filter(Boolean).join("\n"),
          });
          taskPayload = {
            ...taskPayload,
            source_attachments: attachments.attachments,
            source_attachment_contexts: attachments.contexts,
            source_attachment_context: attachments.context,
            source_attachment_warnings: attachments.warnings,
            source_ingestion: attachments.technical,
          };
        }
        const autoExecute = taskPayload.auto_execute === true || taskPayload.autoExecute === true;
        const assignType = String(taskPayload.assign_type || taskPayload.assignType || "project").trim().toLowerCase();
        if (autoExecute) {
          const targetScope = assignType === "group" ? "group_session" : "project_session";
          taskPayload = {
            ...taskPayload,
            orchestration_scope: taskPayload.orchestration_scope || taskPayload.orchestrationScope || targetScope,
            queue_scope: taskPayload.queue_scope || taskPayload.queueScope || "conversation_serial",
            request_origin: taskPayload.request_origin || taskPayload.requestOrigin || "task-dispatch",
            source_channel: taskPayload.source_channel || taskPayload.sourceChannel || "task-dispatch",
            target_scope: taskPayload.target_scope || taskPayload.targetScope || targetScope,
            target_id: taskPayload.target_id || taskPayload.targetId || (assignType === "group" ? taskPayload.group_id || taskPayload.groupId : taskPayload.target_project || taskPayload.targetProject),
            exact_session_id: taskPayload.exact_session_id || taskPayload.exactSessionId || (assignType === "group" ? taskPayload.group_session_id || taskPayload.groupSessionId : taskPayload.project_session_id || taskPayload.projectSessionId) || "",
            client_message_id: taskPayload.client_message_id || taskPayload.clientMessageId || `standard_${crypto.randomUUID()}`,
          };
        }
        const principal = req.ccmAuth;
        if (principal?.kind === "browser" && principal.role !== "admin") {
          const isGroup = assignType === "group";
          const targetId = String(isGroup ? taskPayload.group_id || taskPayload.groupId || taskPayload.target_id || taskPayload.targetId : taskPayload.target_project || taskPayload.targetProject || taskPayload.target_id || taskPayload.targetId || "").trim();
          if (!targetId || !hasResourceAccess(principal.userId, principal.role, isGroup ? "group" : "project", targetId, "use")) {
            throw new Error("当前账户没有所选项目或群聊的任务派发权限");
          }
        }
        const task = createTask(taskPayload);
        persistedTask = task;
        if (task?.deduplicated === true) removeUploadedFiles(files);
        let queueResult = null;
        if (taskPayload.auto_execute || taskPayload.autoExecute) {
          queueResult = enqueueTask(task.id, ctx);
        }
        sendJson(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        if (!persistedTask) removeUploadedFiles(files);
        sendJson(res, { error: e.message }, 400);
      }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      parseSecureMultipartRequest(req).then(({ fields, files }) => {
        const payload = (fields as any).payload ? JSON.parse((fields as any).payload) : fields;
        return handleCreate(payload, files || []);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { void handleCreate(body ? JSON.parse(body) : {}); }
      catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
    const handleDailyDevCreate = async (payload: any, files: any[] = []) => {
      let operationKey = "";
      let keepUploadedFiles = false;
      try {
        const clientMessageId = String(payload.client_message_id || payload.clientMessageId || payload.idempotency_key || payload.idempotencyKey || "").trim()
          || `daily_${crypto.randomUUID()}`;
        const traceId = ensureTraceId(payload.trace_id || payload.traceId, "daily-dev");
        const groupId = payload.group_id || payload.groupId;
        if (!groupId) return sendJson(res, { error: "请选择目标开发群聊" }, 400);
        operationKey = `${groupId}:requirement_pool:${clientMessageId}`;
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return sendJson(res, { error: "开发群聊不存在" }, 404);
        const groupReadiness = validateDailyDevGroupReady(group);
        const goal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
        if (!goal) return sendJson(res, { error: "请输入业务目标" }, 400);
        const attachmentBundle = files.length
          ? await buildTaskAttachmentMutation({
            files,
            retainedIds: [],
            userText: [payload.title, goal, payload.scope, payload.documents, payload.acceptance, payload.constraints].filter(Boolean).join("\n"),
          })
          : { attachments: [], contexts: [], context: "", warnings: [], technical: null };
        if (attachmentBundle.technical?.coverage_receipt?.complete === false) {
          return sendJson(res, { success: false, error: "必需附件尚未完整读取", code: "requirement_source_coverage_incomplete", source_ingestion: attachmentBundle.technical }, 422);
        }
        const qualityPayload = {
          ...payload,
          documents: [payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "", attachmentBundle.context].filter(Boolean).join("\n\n"),
          source_ingestion: attachmentBundle.technical,
        };
        const quality = await decideDailyDevIntakeQuality(qualityPayload, goal, {
          groupId,
          sessionId: payload.group_session_id || payload.groupSessionId || `daily-dev:${groupId}`,
        });
        if (!quality.pass) {
          return sendJson(res, { success: false, needs_confirmation: quality.state === "needs_user", error: quality.message, quality }, 422);
        }
        const operation = operationKey ? acquireIdempotency({ scope: "create-daily-dev", key: operationKey, traceId, leaseMs: 60_000 }) : null;
        if (operation && !operation.acquired) {
          const existingTask = operation.record?.result?.task_id ? loadTasks().find((item: any) => item.id === operation.record.result.task_id) : null;
          sendJson(res, { success: true, duplicate: true, task: existingTask, trace_id: operation.traceId });
          return;
        }
        const title = compactFormText(payload.title, goal.slice(0, 60));
        const backlogPayload = {
          ...payload,
          documents: [payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "", attachmentBundle.context].filter(Boolean).join("\n\n"),
          quality_decision: quality,
          idempotency_key: operationKey,
        };
        const backlogFile = persistDailyDevBacklogFile(groups, group, backlogPayload, title, goal);
        const sourceDocuments = [
          payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "",
          backlogFile ? `群聊需求池文件：${backlogFile.name}` : "",
        ].filter(Boolean).join("\n\n");
        const taskPayload = { ...payload, documents: sourceDocuments, source_documents: sourceDocuments };

        const task = createTask({
          title,
          description: buildDailyDevTaskDescription(taskPayload),
          target_project: groupReadiness.coordinator.project,
          group_id: groupId,
          group_session_id: backlogFile?.target_session_id || payload.group_session_id || payload.groupSessionId || null,
          assign_type: "group",
          orchestration_scope: "group_session",
          queue_scope: payload.queue_scope || payload.queueScope || "conversation_serial",
          request_origin: payload.request_origin || payload.requestOrigin || "task-dispatch-daily-dev",
          source_channel: payload.source_channel || payload.sourceChannel || "task-dispatch-daily-dev",
          automation_task_source: "requirement_pool",
          target_scope: "group_session",
          target_id: groupId,
          exact_session_id: backlogFile?.target_session_id || payload.group_session_id || payload.groupSessionId || "",
          client_message_id: clientMessageId,
          priority: payload.priority || "normal",
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          workflow_type: "daily_dev",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
          requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
          business_goal: goal,
          acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
          source_documents: sourceDocuments,
          source_attachments: attachmentBundle.attachments,
          source_attachment_contexts: attachmentBundle.contexts,
          source_attachment_context: attachmentBundle.context,
          source_attachment_warnings: attachmentBundle.warnings,
          source_ingestion: attachmentBundle.technical,
          workflow_meta: {
            ...(payload.workflow_meta || payload.workflowMeta || {}),
            intake_quality: quality,
            intake: {
              ...(backlogFile ? {
                backlog_file: backlogFile.name,
                persisted_at: new Date().toISOString(),
                target_scope: "group_session",
                target_id: groupId,
                target_session_id: backlogFile.target_session_id,
              } : {}),
              source: "create-daily-dev",
              attachment_count: attachmentBundle.attachments.length,
              attachment_warning_count: attachmentBundle.warnings.length,
            },
          },
          trace_id: traceId,
          idempotency_key: operationKey || null,
        });
        keepUploadedFiles = true;
        if (backlogFile) {
          markDailyDevBacklogStatus(groupId, backlogFile.name, "dispatched", {
            task_id: task.id,
            result: "业务开发任务已创建并关联此需求池条目",
          });
        }
        let queueResult = null;
        if (task.auto_execute) {
          queueResult = enqueueTask(task.id, ctx);
          if (backlogFile && queueResult?.blocked) {
            markDailyDevBacklogStatus(groupId, backlogFile.name, "dispatched", {
              task_id: task.id,
              result: queueResult.message || "任务已创建，等待执行通道恢复",
            });
          }
        }
        if (operationKey) completeIdempotency("create-daily-dev", operationKey, { task_id: task.id, queued: !!queueResult?.queued });
        sendJson(res, { success: true, task, backlog_file: backlogFile?.name || null, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        if (operationKey) {
          try { failIdempotency("create-daily-dev", operationKey, e); } catch {}
        }
        sendJson(res, { error: e.message }, 400);
      } finally {
        if (!keepUploadedFiles) removeUploadedFiles(files);
      }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      parseSecureMultipartRequest(req).then(({ fields, files }) => {
        const payload = (fields as any).payload ? JSON.parse((fields as any).payload) : fields;
        return handleDailyDevCreate(payload, files || []);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { void handleDailyDevCreate(body ? JSON.parse(body) : {}); }
      catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
    recoverExpiredDailyDevBacklogClaims();
    const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
    const items = listDailyDevBacklogs(groupId);
    const collections = listRequirementBacklogCollections(groupId);
    const counts = items.reduce((acc: any, item: any) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1;
      return acc;
    }, {});
    sendJson(res, {
      success: true,
      items,
      collections,
      counts,
      collection_counts: collections.reduce((acc: any, item: any) => {
        acc[item.state] = Number(acc[item.state] || 0) + 1;
        return acc;
      }, {}),
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/status" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groupId = payload.group_id || payload.groupId;
        const name = payload.name || payload.file || payload.fileName;
        const status = String(payload.status || "").trim();
        if (!groupId || !name || !status) return sendJson(res, { error: "缺少 group_id、name 或 status" }, 400);
        if (!["draft", "needs_user", "ready", "planned", "dispatched", "queued", "in_progress", "running", "reviewing", "blocked", "done", "failed"].includes(status)) {
          return sendJson(res, { error: "不支持的需求池状态" }, 400);
        }
        const file = markDailyDevBacklogStatus(groupId, name, status, {
          result: payload.reason || `用户手动设置为 ${status}`,
        });
        if (!file) return sendJson(res, { error: "需求池文件不存在" }, 404);
        const items = listDailyDevBacklogs(groupId);
        sendJson(res, { success: true, file, items });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/import-shared" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = importSharedDocsToDailyDevBacklog({
          group_id: payload.group_id || payload.groupId || "",
          group_session_id: payload.group_session_id || payload.groupSessionId || payload.exact_session_id || payload.exactSessionId || "",
          limit: payload.limit || 20,
          force: !!payload.force,
          priority: payload.priority || "normal",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/dispatch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const groupId = payload.group_id || payload.groupId;
        const name = payload.name || payload.file || payload.fileName;
        if (!groupId || !name) return sendJson(res, { error: "缺少 group_id 或 name" }, 400);
        const result = dispatchDailyDevBacklog(groupId, name, ctx, {
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          force: !!payload.force,
          group_session_id: payload.group_session_id || payload.groupSessionId || payload.exact_session_id || payload.exactSessionId || "",
          source: payload.source || "manual-backlog-dispatch",
        });
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog/dispatch-ready" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = dispatchReadyDailyDevBacklogs(ctx, {
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/requirement-epic/version" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = updateRequirementEpicFromPlan(payload);
        if (result.needs_confirmation) return sendJson(res, result, 409);
        const supervisor = result.epic ? startGlobalMissionSupervisor({
          mission_id: result.epic.id,
          trace_id: result.epic.trace_id,
          session_id: result.epic.group_session_id || result.epic.group_id || "web",
          source: payload.source || "requirement-epic-version",
          business_goal: result.epic.business_goal,
          acceptance: result.epic.acceptance_criteria,
          max_attempts: payload.max_attempts || payload.maxAttempts || 3,
          restart: true,
        }) : null;
        const queueResults = (result.children || [])
          .filter((child: any) => child.status === "pending" && (!child.mission_dependencies || child.mission_dependencies.length === 0))
          .map((child: any) => ({ task_id: child.id, ...enqueueTask(child.id, ctx) }));
        sendJson(res, { ...result, queue_results: queueResults, supervisor });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/requirement-epic/review" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.id || payload.task_id || payload.taskId || "").trim();
        const operation = String(payload.operation || "approve").trim().toLowerCase();
        const tasks = loadTasks();
        const epic = tasks.find((task: any) => task.id === taskId && task.workflow_type === "requirement_epic");
        if (!epic) return sendJson(res, { success: false, error: "需求 Epic 不存在" }, 404);
        const plan = epic.decomposition_plan || epic.requirement_decomposition || {};
        const children = tasks.filter((task: any) => task.parent_task_id === epic.id);
        if (operation === "approve") {
          if (epic.status === "done" && epic.epic_review?.status === "approved") {
            return sendJson(res, { success: true, duplicate: true, task: epic, evidence_matrix: epic.epic_review?.evidence_matrix || [] });
          }
          const summary = epic.mission_summary || {};
          if (summary.all_passed !== true || children.length === 0) {
            return sendJson(res, { success: false, error: "仍有子任务未通过交付验收，不能批准 Epic" }, 409);
          }
          const statusByTaskId = new Map((summary.children || []).map((row: any) => [String(row.task_id || ""), row]));
          const childByKey = new Map(children.map((child: any) => [String(child.requirement_item_key || ""), child]));
          const evidenceMatrix = (plan.items || []).map((item: any) => {
            const child = childByKey.get(String(item.item_key || "")) as any;
            const status = child ? statusByTaskId.get(String(child.id)) as any : null;
            return {
              item_key: item.item_key,
              title: item.title,
              task_id: child?.id || "",
              acceptance_criteria: item.acceptance_criteria || [],
              source_evidence: item.source_evidence || [],
              gate_passed: status?.gate_passed === true,
              verification_count: Number(status?.verification_count || 0),
              actual_file_change_count: Number(status?.actual_file_change_count || 0),
            };
          });
          const approvedAt = new Date().toISOString();
          const acceptanceDecisionBase = {
            schema: "ccm-epic-acceptance-decision-v1",
            task_id: epic.id,
            mode: "explicit_user_approval",
            status: "approved",
            actor: payload.reviewer || "user",
            risk_level: String(epic.workflow_decision?.riskLevel || epic.workflow_decision?.risk_level || epic.intake_draft?.risk?.level || "unknown"),
            gate_passed: true,
            source_evidence_ready: true,
            pending_permission_count: 0,
            blockers: [],
            evidence_checksum: crypto.createHash("sha256").update(JSON.stringify(evidenceMatrix)).digest("hex"),
            decided_at: approvedAt,
          };
          const acceptanceDecision = {
            ...acceptanceDecisionBase,
            checksum: crypto.createHash("sha256").update(JSON.stringify(acceptanceDecisionBase)).digest("hex"),
          };
          const epicDeliverySummary = {
            ...(epic.delivery_summary || {}),
            headline: "需求 Epic 已通过整批变更审阅并完成交付",
            requirement_epic: true,
            acceptance_gate_passed: true,
            evidence_matrix: evidenceMatrix,
            global_acceptance_criteria: plan.global_acceptance_criteria || [],
            requirement_content_hash: epic.requirement_content_hash || plan.content_hash || "",
            plan_version: epic.requirement_version || plan.version || 1,
            child_task_count: children.length,
            approved_at: approvedAt,
          };
          const deliveryReport = buildTaskDeliveryReport(
            { ...epic, status: "done", status_detail: "用户已审阅整批变更并批准需求 Epic 交付" },
            epicDeliverySummary,
            "done",
            "全部子任务、集成验收证据与原始需求验收矩阵已归档"
          );
          const updated = updateTask(epic.id, {
            status: "done",
            status_detail: "用户已审阅整批变更并批准需求 Epic 交付",
            completed_at: approvedAt,
            acceptance_decision: acceptanceDecision,
            terminal_actor: payload.reviewer || "user",
            epic_review: {
              status: "approved",
              approved_at: approvedAt,
              reviewer: payload.reviewer || "user",
              comment: payload.comment || payload.feedback || "",
              evidence_matrix: evidenceMatrix,
            },
            delivery_summary: {
              ...epicDeliverySummary,
              delivery_report: deliveryReport,
            },
            collaboration_state: { ...(epic.collaboration_state || {}), phase: "completed", needs_user: false, completed_at: approvedAt },
          }) || epic;
          appendTaskTimelineEvent(epic.id, {
            type: "requirement_epic_approved",
            title: "用户已批准 Epic 整批交付",
            detail: `${children.length} 个子任务和原始验收标准证据矩阵已归档`,
            status: "ok",
            phase: "completed",
            data: { evidence_matrix: evidenceMatrix },
          });
          return sendJson(res, { success: true, task: updated, evidence_matrix: evidenceMatrix });
        }
        if (operation === "rework") {
          const itemKey = String(payload.item_key || payload.itemKey || "").trim();
          const feedback = compactFormText(payload.feedback || payload.reason || payload.message, "");
          if (!itemKey || !feedback) return sendJson(res, { success: false, error: "退回返工需要 item_key 和反馈说明" }, 400);
          const child = children.find((task: any) => String(task.requirement_item_key || "") === itemKey || String(task.id) === itemKey);
          if (!child) return sendJson(res, { success: false, error: "没有找到要返工的 Epic 子任务" }, 404);
          const reworkKey = `${epic.id}:review-rework:${child.id}:${crypto.createHash("sha256").update(feedback).digest("hex").slice(0, 12)}`;
          if (epic.epic_review?.status === "rework_requested" && epic.epic_review?.idempotency_key === reworkKey) {
            return sendJson(res, { success: true, duplicate: true, task: epic, child });
          }
          const continuation = continueTaskWithMessage(child.id, `需求 Epic 整批审阅退回返工：${feedback}`, ctx, {
            source: "requirement_epic_targeted_rework",
            auto_execute: true,
            idempotency_key: reworkKey,
            status_detail: "用户在 Epic 整批审阅中退回该子任务返工",
          });
          const affectedDescendantIds = new Set<string>();
          let expanded = true;
          while (expanded) {
            expanded = false;
            for (const candidate of children) {
              if (candidate.id === child.id || affectedDescendantIds.has(candidate.id)) continue;
              const dependencies = Array.isArray(candidate.mission_dependencies) ? candidate.mission_dependencies.map(String) : [];
              if (dependencies.includes(child.id) || dependencies.some((dependencyId: string) => affectedDescendantIds.has(dependencyId))) {
                affectedDescendantIds.add(candidate.id);
                expanded = true;
              }
            }
          }
          const reopenedDescendants = children
            .filter((candidate: any) => affectedDescendantIds.has(candidate.id))
            .map((candidate: any) => updateTask(candidate.id, {
              status: "pending",
              status_detail: `上游子任务 ${child.title} 已退回返工，等待上游重新验收后重跑`,
              completed_at: null,
              acceptance: null,
              delivery_summary: null,
              receipt: null,
              global_mission_gate_passed: false,
              dependency_blocked: true,
              delivery_history: [
                ...(Array.isArray(candidate.delivery_history) ? candidate.delivery_history : []),
                {
                  archived_at: new Date().toISOString(),
                  reason: `上游 ${child.requirement_item_key || child.id} 定向返工`,
                  status: candidate.status,
                  delivery_summary: candidate.delivery_summary || null,
                  receipt: candidate.receipt || null,
                },
              ].slice(-20),
            })).filter(Boolean);
          const updatedEpic = updateTask(epic.id, {
            status: "in_progress",
            status_detail: `子任务 ${child.title} 已退回返工，后继依赖将继续等待`,
            epic_review: {
              status: "rework_requested",
              item_key: itemKey,
              child_task_id: child.id,
              feedback,
              idempotency_key: reworkKey,
              requested_at: new Date().toISOString(),
            },
            collaboration_state: { ...(epic.collaboration_state || {}), phase: "reworking", needs_user: false },
          }) || epic;
          appendTaskTimelineEvent(epic.id, {
            type: "requirement_epic_targeted_rework",
            title: `已退回子任务：${child.title}`,
            detail: feedback,
            status: "active",
            phase: "reworking",
            data: { item_key: itemKey, child_task_id: child.id, reopened_descendant_ids: [...affectedDescendantIds] },
          });
          const supervisor = startGlobalMissionSupervisor({
            mission_id: epic.id,
            trace_id: epic.trace_id,
            session_id: epic.group_session_id || epic.group_id || "web",
            source: "requirement-epic-targeted-rework",
            business_goal: epic.business_goal,
            acceptance: epic.acceptance_criteria,
            max_attempts: 3,
            restart: true,
          });
          return sendJson(res, { success: true, task: updatedEpic, child, continuation, reopened_descendants: reopenedDescendants, supervisor });
        }
        return sendJson(res, { success: false, error: "不支持的 Epic 审阅操作" }, 400);
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  return false;
}

// ===== merged from collaboration-routes-part-03.ts =====

// Extracted functional module. The original entry remains a compatibility facade.


export function handleCollaborationApiTaskLifecycleRoutes(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx,
): boolean {
  if (pathname === "/api/tasks/acceptance" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "").trim();
        const current = loadTasks().find((task: any) => String(task.id) === taskId);
        if (!current) return sendJson(res, { error: "任务不存在" }, 404);
        const decidedAt = new Date().toISOString();
        const updates = {
          status: "done",
          status_detail: compactFormText(payload.reason, "用户已核对现有结构化验收证据并批准交付"),
          terminal_actor: "user",
          acceptance_decision: {
            schema: "ccm-user-task-acceptance-decision-v1",
            actor: "user",
            status: "approved",
            decided_at: decidedAt,
            reason: compactFormText(payload.reason, "用户批准"),
          },
        };
        const validationError = validateTaskManualStatusUpdate(current, updates);
        if (validationError) return sendJson(res, { error: validationError }, 409);
        const task = updateTask(taskId, updates);
        appendTaskTimelineEvent(taskId, {
          type: "user_final_acceptance",
          title: "用户已批准最终交付",
          detail: updates.status_detail,
          status: "ok",
          phase: "completion",
          agent: "user",
          data: { terminal_decision: task?.terminal_decision || null },
        });
        updateGroupTaskInlineStatus(task, "done", updates.status_detail);
        sendJson(res, { success: true, task, terminal_decision: task?.terminal_decision || null });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/update" && req.method === "POST") {
    const handleUpdate = async (payload: any, files: any[] = [], multipart = false) => {
      try {
        const { id, retained_attachment_ids, retainedAttachmentIds, ...incomingUpdates } = payload || {};
        let updates = incomingUpdates;
        const current = loadTasks().find(t => t.id === id);
        if (!current) return sendJson(res, { error: "任务不存在" }, 404);
        const requestsDirectPause = incomingUpdates.status === "paused" || incomingUpdates.is_paused === true || incomingUpdates.paused === true;
        const requestsDirectResume = current?.pause_control && (incomingUpdates.status === "pending" || incomingUpdates.is_paused === false || incomingUpdates.paused === false);
        if (requestsDirectPause || requestsDirectResume) {
          return sendJson(res, {
            success: false,
            code: "SAFE_PAUSE_API_REQUIRED",
            error: requestsDirectPause
              ? "运行中任务必须通过安全暂停接口，在最近安全检查点停止写入"
              : "已安全暂停的任务必须通过原位继续接口重新核验现场",
          }, 409);
        }
        if (rejectTaskMutationConflict(res, current, payload, incomingUpdates.status === "pending" || incomingUpdates.is_paused === false)) return;
        if (multipart) {
          const attachments = await buildTaskAttachmentMutation({
            files,
            currentAttachments: current.source_attachments,
            currentContexts: current.source_attachment_contexts,
            retainedIds: retained_attachment_ids === undefined && retainedAttachmentIds === undefined
              ? undefined
              : parseRetainedAttachmentIds(retained_attachment_ids ?? retainedAttachmentIds),
            userText: [updates.title || current.title, updates.description || current.description].filter(Boolean).join("\n"),
          });
          updates = {
            ...updates,
            source_attachments: attachments.attachments,
            source_attachment_contexts: attachments.contexts,
            source_attachment_context: attachments.context,
            source_attachment_warnings: attachments.warnings,
            source_ingestion: attachments.technical || current.source_ingestion || null,
          };
        }
        if (updates.status === "done") updates = { ...updates, terminal_actor: "user" };
        const validationError = validateTaskManualStatusUpdate(current, updates);
        if (validationError) return sendJson(res, { error: validationError }, 409);
        const priorityChanged = updates.priority && updates.priority !== current.priority;
        const task = updateTask(id, updates);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        let queueResult: any = null;
        if (priorityChanged && !runningTaskIds.has(id)) {
          const removed = removeTaskFromQueues(id);
          if (removed > 0) {
            queueResult = enqueueTask(id, ctx);
            appendTaskTimelineEvent(id, {
              type: "task_queue_reprioritized",
              title: updates.priority === "high" ? "任务已插队" : "任务优先级已调整",
              detail: `优先级 ${current.priority || "normal"} -> ${updates.priority}，队列位置 ${queueResult.position || "待定"}`,
              status: "ok",
              phase: "dispatching",
              agent: "user",
            });
          }
        }
        updateGroupTaskInlineStatus(task, task.status, task.status_detail || "任务状态已更新");
        sendJson(res, { success: true, task, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        removeUploadedFiles(files);
        sendJson(res, { error: e.message }, 400);
      }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      parseSecureMultipartRequest(req).then(({ fields, files }) => {
        const payload = (fields as any).payload ? JSON.parse((fields as any).payload) : fields;
        return handleUpdate(payload, files || [], true);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try { void handleUpdate(body ? JSON.parse(body) : {}); }
      catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/reconcile-delivery" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const current = loadTasks().find((task: any) => String(task?.id || "") === taskId);
        if (!current) return sendJson(res, { success: false, error: "任务不存在" }, 404);
        if (rejectTaskMutationConflict(res, current, payload, true)) return;
        const result = reconcileTaskDeliveryEvidence(taskId);
        sendJson(res, result, result.success ? 200 : (result.status || 400));
      } catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/continue" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = payload.task_id || payload.id;
        const message = compactFormText(payload.message || payload.followup || payload.note, "");
        const currentTask = loadTasks().find((task: any) => task.id === taskId);
        if (!currentTask) return sendJson(res, { error: "任务不存在" }, 404);
        if (rejectTaskMutationConflict(res, currentTask, payload, true)) return;
        const requestedKind = String(payload.continuation_kind || payload.continuationKind || "auto");
        const continuationKind = requestedKind === "auto"
          ? (await decideWorkflowWithModel({
              message,
              scope: "group",
              context: {
                current_goal: currentTask.business_goal || currentTask.title || "",
                current_status: currentTask.status || "",
                task_id: currentTask.id,
              },
            })).continuationKind
          : requestedKind;
        const result = continueTaskWithMessage(taskId, message, ctx, {
          source: payload.source || "user",
          auto_execute: payload.auto_execute,
          autoExecute: payload.autoExecute,
          continuationKind,
          idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
        });
        if (!result.success) return sendJson(res, { error: result.error, new_task_suggested: result.new_task_suggested === true, continuation_kind: result.new_task_suggested ? "new_task" : undefined }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/continue-from-gaps" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = payload.task_id || payload.id;
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const current = loadTasks().find(t => t.id === taskId);
        if (!current) return sendJson(res, { error: "任务不存在" }, 404);
        if (rejectTaskMutationConflict(res, current, payload, true)) return;
        if (current.status === "done") return sendJson(res, { error: "已完成任务不需要按缺口继续" }, 409);

        const targeted = payload.rework_kind || payload.reworkKind || payload.work_item_id || payload.workItemId || payload.target || payload.agent || payload.project || payload.reason;
        const message = compactFormText(payload.message, "") || (targeted ? buildTargetedReworkContinuationDraft(current, payload) : buildTaskGapContinuationDraft(current));
        const reworkKind = compactFormText(payload.rework_kind || payload.reworkKind || "", "");
        const target = compactFormText(payload.target || payload.agent || payload.project || "", "");
        const reason = compactFormText(payload.reason || payload.detail || "", "");
        const title = compactFormText(payload.title || payload.label || "", "");
        const workItemId = compactFormText(payload.work_item_id || payload.workItemId || "", "");
        const isNextWorkItem = reworkKind === "next_claimable_work_item" || /user_next_work_item|next_work_item/i.test(String(payload.source || ""));
        const friendlyStatus = targeted
          ? isNextWorkItem
            ? `已接上${target ? ` ${target} 的` : ""}下一步工作项，等待主 Agent 继续派发`
            : `已接上${target ? ` ${target} 的` : ""}精准返工，等待主 Agent 继续执行`
          : "已按交付缺口生成返工说明，等待主 Agent 继续执行";
        let claimOwner = target;
        let claimRef = workItemId || target;
        if (isNextWorkItem) {
          const currentItems = getTaskWorkItems(current);
          const requestedItem = currentItems.find((item: any) => [item.id, item.target, item.owner, item.subject].some(value => String(value || "").toLowerCase() === String(claimRef || "").toLowerCase()));
          claimRef = claimRef || requestedItem?.id || "";
          claimOwner = claimOwner || requestedItem?.owner || requestedItem?.target || "";
          const preflight = claimMainAgentWorkItem(currentItems, claimRef, claimOwner, { checkOwnerBusy: true });
          if (!preflight.ok) {
            const claimSummary = buildMainAgentWorkItemClaimSummary(preflight, claimOwner, claimRef);
            persistTaskWorkItems(taskId, preflight.items, {
              last_claim_summary: claimSummary,
              last_claim_attempt: { agent: claimOwner, item_id: preflight.item?.id || "", result: "waiting", reason: preflight.reason || "", at: new Date().toISOString() },
            });
            addTaskLog(taskId, "warning", claimSummary.headline);
            return sendJson(res, {
              success: true,
              waiting: true,
              queued: false,
              work_item_claim_summary: claimSummary,
              task: getTaskById(taskId),
            });
          }
        }
        const result = continueTaskWithMessage(taskId, message, ctx, {
          source: payload.source || (targeted ? "targeted_gap_rework" : "auto_gap_rework"),
          auto_execute: payload.auto_execute,
          autoExecute: payload.autoExecute,
          status_detail: friendlyStatus,
          rework_kind: reworkKind,
          target,
          reason,
          title,
          work_item_id: workItemId,
          idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
        });
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        const claimResult = isNextWorkItem
          ? claimTaskWorkItemForAgent(taskId, claimOwner, reason || title, { itemRef: claimRef, checkOwnerBusy: true })
          : null;
        sendJson(res, {
          ...result,
          continuation_message: message,
          queued: result.queued === true,
          work_item_claim_summary: claimResult?.summary || null,
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  return false;
}

// ===== merged from collaboration-routes-part-04.ts =====

// Extracted functional module. The original entry remains a compatibility facade.


export function handleCollaborationApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  configureCollaborationRouteExecutors(ctx);
  if (handleCollaborationApiReplayAndExecutionRoutes(pathname, req, res, parsed, ctx)) return true;
  if (handleCollaborationApiIntakeRoutes(pathname, req, res, parsed, ctx)) return true;
  if (handleCollaborationApiTaskLifecycleRoutes(pathname, req, res, parsed, ctx)) return true;
  if (handleTaskGovernanceRoutes(req, res, parsed, ctx, {
    compactFormText,
    uniqueStrings,
    archiveTask,
    restoreArchivedTask,
    purgeArchivedTask,
    removeTaskFromQueues,
    updateTask,
    enqueueTask,
    retryTask,
    retryRuntimeFailedTasks,
    getQueueStatus,
    getTaskWatchdogStatus,
    runTaskWatchdog,
    cleanupRuntimeDebt,
    resumeTaskQueues,
    clearTaskQueues: () => taskQueues.clear(),
    taskWatchdogStaleMs: TASK_WATCHDOG_STALE_MS,
  })) return true;

  // === 群聊主 Agent / Orchestrator API ===
  if (handleOrchestratorRoutes(req, res, parsed, ctx, {
    buildCoordinatorSharedFilesContext,
    runGroupOrchestrator,
    buildDailyDevAgentDiagnostics,
    replayAgentTrace,
    buildTraceReplaySuite,
    runAgentRuntimeKernelSelfTest,
    runWorkerHandoffSelfTest,
    runGroupMainAgentActionRegistrySelfTest,
    runGroupMainAgentToolLoopSelfTest,
    getGroupMainAgentActionRegistry,
    applyRuntimeMonitorControl,
    buildDailyDevWorkflowRehearsal,
    createDailyDevSmokeTask,
    getDailyDevSmokeStatus,
    runAgentCliProbeBatch,
    runAgentCliProbe,
    switchTaskExecutor,
    runRuntimeFallbackProbe,
    runAgentRecoveryMonitorOnce,
  })) return true;

  if (handleBasicGroupRoutes(req, res, parsed, ctx, {
    getGroupMemoryFile,
    loadGroupMemory,
    saveGroupMemory,
    buildGroupMemoryContext,
    buildAgentMemoryPacket,
    buildInlineTaskRuntime,
    getAgentQaItemsForGroup,
    deleteGroupSessionMemoryArtifacts,
  })) return true;

  // === Agent 间问答 API ===
  if (handleAgentQaRoutes(req, res, parsed, ctx, {
    getAgentQaItemsForGroup,
    runAgentCollaborationProtocolSelfTest,
    setAgentQaArbitration,
    resumeAgentQaFromStoredContinuation,
    setAgentQaManualTakeover,
    retryAgentQaItem,
    listGroupCoordinationRequests,
  })) return true;

  if (handleGroupLiveRoutes(req, res, parsed, ctx, {
    writeSse,
    ensureTraceId,
    classifyGroupProjectTaskIntentWithAgent,
    shouldCreatePersistentGroupTask,
    shouldUseProjectAnalysisMode,
    classifyTaskContinuation,
    looksLikeTaskContinuation,
    continueTaskWithMessage,
    appendMainAgentDecisionTrace,
    applyMainAgentDecisionPetState,
    validateDailyDevGroupReady,
    compactMemoryText,
    buildGroupPlanModePreflight,
    createTask,
    updateTask,
    appendTaskTimelineEvent,
    buildWorkflowMeta,
    buildInlineTaskRuntime,
    updateGroupMemory,
    enqueueTask,
    buildCoordinatorSharedFilesContext,
    buildGroupProjectAnalysisContext,
    normalizePlanAssignments,
    getInitialWorkflowMeta,
    getCoordinatorActionMentions,
    processCrossAgents,
    runCoordinatorReviewLoop,
    buildGroupContextPacket,
    buildAgentToolContext,
    prepareAgentRuntimeTools,
    getProjectExtraConfig,
    buildAgentMemoryContextBundle,
    buildAgentMemoryContextBundleWithManifestSelection,
    buildAgentMemoryPacket,
    buildChildAgentDevelopmentContract,
    buildProjectVerificationHints,
    buildAgentQaProtocolInstructions,
    getAgentQaItemsForGroup,
    handleAgentQaRequests,
    runtimeToolSnapshotFromAudit,
    extractActionableMentions,
    extractAgentReceipt,
  })) return true;


  if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { task_id, group_id } = JSON.parse(body);
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === task_id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);

        const configs = getConfigs();
        const config = configs.find(c => c.name === task.target_project);
        if (!config) return sendJson(res, { error: "项目配置不存在" }, 400);

        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";

        updateTask(task_id, { status: "in_progress" });

        const autoAssignGroupId = String(group_id || task.group_id || "");
        const group = autoAssignGroupId ? loadGroups().find(g => g.id === autoAssignGroupId) : null;
        const toolContext = buildAgentToolContext(ctx, group, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`, task.selected_skill_names || []);
        let runtimeToolContext = prepareAgentRuntimeTools(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, { taskId: task.id, task, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness });
        if (runtimeToolContext.dispatchBlocked) {
          const blockedReceipt = runtimeToolDispatchBlockedReceipt(task.target_project, runtimeToolContext);
          updateTask(task_id, { status: "blocked", status_detail: blockedReceipt.summary });
          addTaskLog(task_id, "warning", blockedReceipt.summary);
          appendTaskTimelineEvent(task_id, { type: "runtime_tool_dispatch_blocked", title: `${task.target_project} 工具授权派发被阻断`, detail: blockedReceipt.summary, status: "warn", phase: "dispatching", agent: task.target_project, data: { runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate } });
          return sendJson(res, { success: false, error: blockedReceipt.summary, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate }, 409);
        }
        const directTaskText = buildChildAgentTaskText(`${task.title}\n${task.description || ""}`, task);
        let autoAssignTaskSession = openTaskAgentSession({
          scopeId: task.id,
          taskId: task.id,
          groupId: autoAssignGroupId,
          project: task.target_project,
          agentType,
        });
        const autoAssignMemoryDeliveryAttemptSequence = autoAssignTaskSession ? autoAssignTaskSession.turnCount + 1 : 0;
        const autoAssignGroupSessionId = String(task.group_session_id || task.groupSessionId || "");
        let autoAssignInvocationEdge: any = autoAssignGroupId && autoAssignTaskSession && autoAssignGroupSessionId.startsWith("gcs_") ? prepareTaskAgentInvocationEdge({
          groupId: autoAssignGroupId,
          groupSessionId: autoAssignGroupSessionId,
          taskId: task.id,
          targetProject: task.target_project,
          taskAgentSessionId: autoAssignTaskSession.id,
          nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
          executionId: task.id,
          attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
          providerAttempt: 1,
          invocationKind: autoAssignMemoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
          branchKind: "main",
        }) : null;
        let autoAssignGroupMemoryContext = autoAssignGroupId
          ? await buildAgentMemoryContextBundleWithManifestSelection(autoAssignGroupId, task.target_project, directTaskText, {
            taskId: task.id,
            traceId: task.trace_id || "",
            agentType,
            taskAgentSessionId: autoAssignTaskSession?.id || "",
            nativeSessionId: autoAssignTaskSession?.nativeSessionId || "",
            taskAgentSessionTurn: autoAssignMemoryDeliveryAttemptSequence,
            modelContextWindow: autoAssignTaskSession?.modelContextWindow || 0,
            groupSessionId: task.group_session_id || task.groupSessionId || "",
            requireExactGroupSession: true,
            task,
            ...taskAgentInvocationMemoryOptions(autoAssignInvocationEdge),
          })
          : null;
        const autoAssignCoordinatorProject = group ? String(getCoordinatorMember(group)?.project || "") : "";
        const autoAssignMemoryConsumptionChallenge = autoAssignGroupMemoryContext
          && autoAssignTaskSession
          && task.target_project !== autoAssignCoordinatorProject
          ? createMemoryContextConsumptionChallenge({
              groupId: autoAssignGroupId,
              groupSessionId: autoAssignGroupSessionId,
              taskId: task.id,
              executionId: task.id,
              project: task.target_project,
              taskAgentSessionId: autoAssignTaskSession.id,
              attempt: autoAssignMemoryDeliveryAttemptSequence,
            })
          : null;
        if (autoAssignMemoryConsumptionChallenge) {
          autoAssignGroupMemoryContext = attachMemoryContextConsumptionChallenge(autoAssignGroupMemoryContext, autoAssignMemoryConsumptionChallenge);
          runtimeToolContext = prepareAgentRuntimeTools(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, {
            taskId: task.id,
            task,
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
            groupSessionId: autoAssignGroupSessionId,
            taskAgentSessionId: autoAssignTaskSession.id,
            nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
            memoryReceiptChallenge: autoAssignMemoryConsumptionChallenge,
            memoryReceiptFile: memoryContextConsumptionReceiptFile(autoAssignMemoryConsumptionChallenge.challenge_id),
          });
          assertRuntimeToolDispatchReady(task.target_project, runtimeToolContext);
        }
        const autoAssignContinuation = buildWorkerContinuationHandoff(task, task.target_project);
        const autoAssignHandoff = buildChildAgentWorkerHandoff(task.target_project, directTaskText, {
          source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
          reason: task.mission_target?.reason || "",
          acceptance: task.acceptance_criteria || "",
          requires_code_changes: task.requires_code_changes,
          verification_hints: buildProjectVerificationHints(task.target_project, workDir),
          work_dir: workDir,
          agent_type: agentType,
          model: autoAssignTaskSession?.modelId || "",
          task_id: task.id,
          task_agent_session_id: autoAssignTaskSession?.id || "",
          trace_id: task.trace_id || "",
          task,
          group,
          worker_context_packet: task.mission_handoff?.worker_context_packet || null,
          dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
            ? task.mission_handoff.global_mission.depends_on.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" }))
            : [],
          analysis: {
            constraints: Array.isArray(task.mission_handoff?.done_criteria) ? task.mission_handoff.done_criteria : [],
          },
          memory: autoAssignGroupMemoryContext,
          continuation: autoAssignContinuation,
        });
        const autoAssignPendingCapacityGate = autoAssignTaskSession?.capacityDowngradeGate || null;
        const autoAssignCapacityRevalidationPreparation = autoAssignTaskSession
          ? prepareTaskAgentSessionCapacityRevalidation(autoAssignTaskSession.id, autoAssignHandoff.worker_context_packet)
          : null;
        if (autoAssignTaskSession?.capacityRevalidationRequired === true && autoAssignCapacityRevalidationPreparation?.prepared !== true) {
          throw new Error(`模型容量下降后的上下文重建未通过：${autoAssignCapacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated"}`);
        }
        if (autoAssignCapacityRevalidationPreparation?.session) autoAssignTaskSession = autoAssignCapacityRevalidationPreparation.session;
        let autoAssignCapacityRevalidationCommitted = autoAssignCapacityRevalidationPreparation?.required !== true;
        addTaskLog(task.id, "info", `${task.target_project} 自动派发工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
        appendTaskTimelineEvent(task.id, {
          type: "worker_handoff_ready",
          title: `${task.target_project} 工作单已补齐`,
          detail: "自动派发已补齐目标、范围、边界、验收、ACK 和回执要求",
          status: "ok",
          phase: "dispatching",
          agent: task.target_project,
          data: { worker_handoff: summarizeWorkerHandoffForUser(autoAssignHandoff), worker_context_packet: autoAssignHandoff.worker_context_packet },
        });
        recordAgentRuntimeLifecycle({
          scope: autoAssignGroupId ? "group" : "worker",
          traceId: task.trace_id || "",
          taskId: task.id,
          groupId: autoAssignGroupId,
          agent: "auto-assign",
          action: "dispatch_worker",
          phase: "handoff",
          risk: "agent",
          target: task.target_project,
          status: "planned",
          message: `${task.target_project} 自动派发自包含工作单已生成`,
          data: {
            worker_handoff: summarizeWorkerHandoffForUser(autoAssignHandoff),
            worker_context_packet: autoAssignHandoff.worker_context_packet,
            source: "auto-assign",
          },
        });
        const developmentContract = buildChildAgentDevelopmentContract(task.target_project, directTaskText, {
          source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
          reason: task.mission_target?.reason || "",
          acceptance: task.acceptance_criteria || "",
          requires_code_changes: task.requires_code_changes,
          verification_hints: buildProjectVerificationHints(task.target_project, workDir),
          work_dir: workDir,
          agent_type: agentType,
          task_id: task.id,
          trace_id: task.trace_id || "",
          task,
          group,
          worker_context_packet: task.mission_handoff?.worker_context_packet || null,
          dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
            ? task.mission_handoff.global_mission.depends_on.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" }))
            : [],
          memory: autoAssignGroupMemoryContext,
          continuation: autoAssignContinuation,
          handoff: autoAssignHandoff,
        });
        const executePrompt = `${developmentContract}\n\n📋 执行任务：${task.title}\n${directTaskText}\n\n请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执。`;
        const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
        let autoAssignNativeSessionId = "";
        let autoAssignNativeContinuationEvidence: any = null;
        let autoAssignNativeModelCapabilityReceipt: any = null;
        let autoAssignModelCapabilityRecord: any = null;
        let autoAssignProviderMemoryChannelEvidence: any = null;
        let autoAssignMemoryContextConsumptionReceipt: any = null;
        let autoAssignMemoryContextConsumptionRecovery: any = null;
        let autoAssignProviderUsage: any = null;
        let autoAssignSucceeded = true;
        let autoAssignError = "";
        let autoAssignRunnerRequestId = "";
        let autoAssignRunnerStarted = false;
        const autoAssignRenderedPrompt = `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${executePrompt}`;
        let autoAssignMemoryContextSnapshot: any = null;
        if (autoAssignTaskSession) {
          const bound = bindTaskAgentMemoryContextSnapshot(autoAssignTaskSession.id, {
            taskId: task.id,
            groupId: autoAssignGroupId,
            project: task.target_project,
            agentType,
            nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
            turn: autoAssignMemoryDeliveryAttemptSequence,
            executionId: task.id,
            traceId: task.trace_id || "",
            workerContextPacket: autoAssignHandoff.worker_context_packet,
            workerHandoff: autoAssignHandoff,
            memoryContext: autoAssignGroupMemoryContext,
            renderedHandoff: developmentContract,
            renderedPrompt: autoAssignRenderedPrompt,
            renderedMemoryContext: String(autoAssignGroupMemoryContext?.rendered_text || ""),
            requireMemoryPromptInjectionProof: true,
            requireTrustedMemoryPromptEnvelope: true,
            requireProviderMemoryChannelAcknowledgement: true,
            requireMemoryContextConsumptionReceipt: !!autoAssignMemoryConsumptionChallenge,
            memoryContextConsumptionChallenge: autoAssignMemoryConsumptionChallenge,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            invocationLineage: autoAssignInvocationEdge,
          });
          autoAssignMemoryContextSnapshot = bound?.snapshot || null;
        }
        const autoAssignTypedMemoryDispatchAdmission = admitChildTypedMemoryDelivery(autoAssignGroupMemoryContext, {
          workerContextPacket: autoAssignHandoff.worker_context_packet,
          renderedPrompt: autoAssignRenderedPrompt,
          attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
        });
        if (autoAssignTypedMemoryDispatchAdmission.admitted !== true) {
          throw new Error(`类型化记忆 dispatch-time consume 门禁未通过：${autoAssignTypedMemoryDispatchAdmission.reason || "unknown"}`);
        }
        const autoAssignTypedMemoryDispatchStartedAt = new Date().toISOString();
        const autoAssignTypedMemoryDispatchWal = createChildTypedMemoryDispatchWal(autoAssignTypedMemoryDispatchAdmission, {
          memoryBundle: autoAssignGroupMemoryContext,
          workerContextPacket: autoAssignHandoff.worker_context_packet,
          renderedPrompt: autoAssignRenderedPrompt,
          snapshotRenderedPrompt: autoAssignRenderedPrompt,
          executionId: task.id,
          capacityRevalidationProof: autoAssignCapacityRevalidationPreparation?.proof || null,
        });
        let autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted(autoAssignTypedMemoryDispatchWal, {
          dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
          transport: agentType,
        });
        if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof && autoAssignTypedMemoryDispatchWalRecord) {
          const capacityCommit = commitTaskAgentSessionCapacityRevalidation(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
            typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord.record_checksum,
            typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord.state,
          });
          if (capacityCommit?.acknowledged !== true) throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
          autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
          autoAssignCapacityRevalidationCommitted = true;
          if (autoAssignPendingCapacityGate) {
            addTaskLog(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 durable dispatch`);
            appendTaskTimelineEvent(task.id, {
              type: "task_agent_capacity_revalidated",
              title: `${task.target_project} 容量降级上下文已重建`,
              detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
              status: "ok",
              phase: "dispatching",
              agent: task.target_project,
              data: {
                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
              },
            });
          }
        }
        if (autoAssignInvocationEdge) {
          autoAssignInvocationEdge = bindTaskAgentInvocationContext(autoAssignInvocationEdge, {
            workerContextPacketId: autoAssignHandoff.worker_context_packet?.packet_id || "",
            memoryContextSnapshotId: autoAssignMemoryContextSnapshot?.snapshot_id || "",
            memoryContextSnapshotChecksum: autoAssignMemoryContextSnapshot?.checksum || "",
            groupSessionMemoryBinding: autoAssignMemoryContextSnapshot?.context?.group_session_memory_binding || null,
            summaryCapsuleChecksum: autoAssignHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.capsule_checksum || "",
            typedMemoryDeliveryCapsule: autoAssignHandoff.worker_context_packet?.typed_memory_delivery_capsule || null,
            renderedPrompt: autoAssignRenderedPrompt,
          });
          autoAssignInvocationEdge = dispatchTaskAgentInvocationEdge(autoAssignInvocationEdge, {
            transport: agentType,
            dispatchedAt: autoAssignTypedMemoryDispatchStartedAt,
            dispatchTicketId: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_id || "",
            dispatchTicketChecksum: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_checksum || "",
            typedMemoryDispatchWalFile: autoAssignTypedMemoryDispatchWalRecord?.file || "",
            typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
            typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
            platformDispatchId: autoAssignTypedMemoryDispatchWalRecord?.platform_dispatch_id || "",
          });
        }
        const taskResult = await ctx.callAgent(
          task.target_project,
          autoAssignRenderedPrompt,
          workDir,
          agentType,
          300000,
          {
            tab: autoAssignGroupId ? "groups" : "projects",
            groupId: autoAssignGroupId,
            project: task.target_project,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
            taskId: task.id,
            executionId: task.id,
            model: autoAssignTaskSession?.modelId || "",
            taskAgentSessionId: autoAssignTaskSession?.id || "",
            trustedMemoryProviderChannelRequired: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
            trustedMemoryProviderAcknowledgementRequired: autoAssignMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
            memoryContextConsumptionReceiptRequired: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
            memoryContextConsumptionChallenge: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
            trustedMemoryEnvelopeChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
            trustedMemoryEnvelopeSourceChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
            ...taskAgentSessionLifecycleRunnerOptions(autoAssignMemoryContextSnapshot),
            agentSession: autoAssignTaskSession ? getTaskAgentSessionOptions(autoAssignTaskSession) : null,
            durableDispatch: autoAssignTypedMemoryDispatchAdmission.required === true
              || autoAssignCapacityRevalidationPreparation?.required === true
              || autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
            onRunnerRequestCreated: (requestId: string) => {
              autoAssignRunnerRequestId = String(requestId || "");
              if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerRequestId) {
                autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchStarted({ required: true, record: autoAssignTypedMemoryDispatchWalRecord }, {
                  dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                  transport: autoAssignRunnerRequestId.startsWith("adr_") ? "server_direct_cli" : "external_runner",
                  runnerRequestId: autoAssignRunnerRequestId,
                });
              }
              if (autoAssignInvocationEdge && autoAssignRunnerRequestId) {
                autoAssignInvocationEdge = bindTaskAgentInvocationRunnerRequest(autoAssignInvocationEdge, autoAssignRunnerRequestId, {
                  typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
                  typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
                });
              }
            },
            onDone: (opts: any) => {
              autoAssignNativeSessionId = String(opts?.nativeSessionId || "");
              autoAssignNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
              autoAssignNativeModelCapabilityReceipt = opts?.nativeModelCapabilityReceipt || null;
              autoAssignModelCapabilityRecord = opts?.nativeModelCapabilityRecord || null;
              if (opts?.providerMemoryChannelEvidence?.required === true) autoAssignProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
              if (opts?.memoryContextConsumptionReceipt) autoAssignMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
              if (opts?.memoryContextConsumptionRecovery) autoAssignMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
              autoAssignProviderUsage = opts?.usage || null;
              autoAssignSucceeded = opts?.isError !== true;
              autoAssignError = String(opts?.error || opts?.message || "");
              autoAssignRunnerRequestId = String(opts?.runnerRequestId || autoAssignRunnerRequestId || "");
              autoAssignRunnerStarted = opts?.runnerStarted === true;
            },
          }
        );
        if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof) {
          const capacityCommit = commitTaskAgentSessionCapacityRevalidation(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
            runnerRequestId: autoAssignRunnerRequestId,
            runnerStarted: autoAssignRunnerStarted,
          });
          if (capacityCommit?.acknowledged !== true) throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
          autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
          autoAssignCapacityRevalidationCommitted = true;
          if (autoAssignPendingCapacityGate) {
            addTaskLog(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 runner return`);
            appendTaskTimelineEvent(task.id, {
              type: "task_agent_capacity_revalidated",
              title: `${task.target_project} 容量降级上下文已重建`,
              detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
              status: "ok",
              phase: "executing",
              agent: task.target_project,
              data: {
                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
              },
            });
          }
        }
        if (autoAssignInvocationEdge) {
          const autoAssignFailed = !autoAssignSucceeded;
          autoAssignInvocationEdge = completeTaskAgentInvocationEdge(autoAssignInvocationEdge, {
            success: !autoAssignFailed,
            nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession?.nativeSessionId || "",
            nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
            nativeModelCapabilityReceipt: autoAssignNativeModelCapabilityReceipt,
            nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
            provider: agentType,
            runnerRequestId: autoAssignRunnerRequestId,
            output: taskResult,
            error: autoAssignError,
            reason: autoAssignFailed ? "execution_failed" : "execution_completed",
          });
        }
        let autoAssignMemoryContextDelivery: any = null;
        if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted) {
          autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(autoAssignTypedMemoryDispatchWalRecord, {
            runnerRequestId: autoAssignRunnerRequestId,
            runnerSucceeded: autoAssignSucceeded,
            output: taskResult,
          });
        }
        const autoAssignFileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
        if (autoAssignTaskSession && autoAssignMemoryContextSnapshot) {
          const delivery = recordTaskAgentMemoryContextDelivery(autoAssignTaskSession.id, {
            snapshotId: autoAssignMemoryContextSnapshot.snapshot_id || autoAssignTaskSession.memoryContextSnapshotId || "",
            renderedPrompt: autoAssignRenderedPrompt,
            snapshotRenderedPrompt: autoAssignRenderedPrompt,
            executionId: task.id,
            traceId: task.trace_id || "",
            runtime: agentType,
            attempt: autoAssignMemoryDeliveryAttemptSequence,
            nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession.nativeSessionId || "",
            runnerRequestId: autoAssignRunnerRequestId,
            dispatched: autoAssignRunnerStarted,
            executionSucceeded: autoAssignSucceeded,
            output: taskResult,
            fileChanges: autoAssignFileChanges,
            nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
            providerMemoryChannelEvidence: autoAssignProviderMemoryChannelEvidence,
            memoryContextConsumptionReceipt: autoAssignMemoryContextConsumptionReceipt,
            memoryContextConsumptionRecovery: autoAssignMemoryContextConsumptionRecovery,
            providerUsage: autoAssignProviderUsage,
            runnerStarted: autoAssignRunnerStarted,
            invocationEdgeId: autoAssignInvocationEdge?.invocation_edge_id || "",
          });
          autoAssignMemoryContextDelivery = delivery?.receipt || null;
          if (autoAssignTypedMemoryDispatchWalRecord && autoAssignMemoryContextDelivery?.delivered === true) {
            autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryRunnerReturned(autoAssignTypedMemoryDispatchWalRecord, {
              runnerRequestId: autoAssignRunnerRequestId,
              runnerSucceeded: autoAssignSucceeded,
              output: taskResult,
              deliveryReceipt: autoAssignMemoryContextDelivery,
            });
          }
        }
        if (autoAssignInvocationEdge) {
          autoAssignInvocationEdge = bindTaskAgentInvocationMemoryDelivery(autoAssignInvocationEdge, {
            deliveryReceipt: autoAssignMemoryContextDelivery,
          });
        }
        const autoAssignTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery(autoAssignGroupMemoryContext, {
          workerContextPacket: autoAssignHandoff.worker_context_packet,
          dispatchEvidence: {
            renderedPrompt: autoAssignRenderedPrompt,
            deliveryReceipt: autoAssignMemoryContextDelivery,
            dispatchTicket: autoAssignTypedMemoryDispatchAdmission.ticket,
            dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
            dispatched: autoAssignRunnerStarted,
            executionReturned: autoAssignRunnerStarted,
          },
        });
        if (autoAssignTypedMemoryDeliveryCommit.committed === true) {
          addTaskLog(task.id, "info", `${task.target_project} 自动派发类型化记忆投递租约已提交：${autoAssignTypedMemoryDeliveryCommit.lease?.leaseId || "unknown"}`);
        }
        if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted && autoAssignMemoryContextDelivery?.delivered === true) {
          autoAssignTypedMemoryDispatchWalRecord = markChildTypedMemoryDispatchCommitted(autoAssignTypedMemoryDispatchWalRecord, autoAssignTypedMemoryDeliveryCommit);
        }
        if (autoAssignTaskSession) {
          autoAssignTaskSession = recordTaskAgentSessionTurn(autoAssignTaskSession.id, {
            nativeSessionId: autoAssignNativeSessionId,
            nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
            nativeContinuationUnverified: autoAssignNativeContinuationEvidence?.nativeResumeRequested === true
              && autoAssignNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
            success: autoAssignSucceeded,
            error: autoAssignError || (!autoAssignSucceeded ? taskResult : ""),
            nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
          }) || autoAssignTaskSession;
        }
        const fileChanges = autoAssignFileChanges;
        const execution = getTaskExecutionFromReceipt(taskResult, extractAgentReceipt(taskResult, task.target_project), { fileChanges });
        const isCompleted = execution.status === "done";

        const legacyDeliverySummary = buildDeliverySummary(task, execution, isCompleted ? "done" : "waiting");
        const updatedTask = updateTask(task_id, {
          status: isCompleted ? "done" : "in_progress",
          result: taskResult.substring(0, 500),
          final_report: execution.report || taskResult,
          status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
          receipt: execution.receipt || null,
          file_changes: execution.fileChanges || null,
          delivery_summary: legacyDeliverySummary,
        }) || { ...task, status: isCompleted ? "done" : "in_progress", delivery_summary: legacyDeliverySummary, status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工") };
        if (isCompleted && legacyDeliverySummary.acceptance_gate_passed === true) {
          const projectMemoryResult = recordAcceptedProjectDeliveryMemory({ task: updatedTask, deliverySummary: legacyDeliverySummary });
          if (projectMemoryResult.committed) addTaskLog(task_id, "info", `项目长期记忆已完成验收后提交：${projectMemoryResult.durableCandidateCount} 条长期记录`);
        }

        if (autoAssignGroupId) {
          appendLegacyTaskExecutionGroupReport({
            groupId: autoAssignGroupId,
            task: updatedTask,
            status: isCompleted ? "done" : "waiting",
            detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
            rawResult: taskResult,
            fileChanges,
          });
        }

        sendJson(res, { success: true, task, completed: isCompleted, result: taskResult });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const tasks = loadTasks().filter(t => t.status === "pending");

        if (tasks.length === 0) {
          return sendJson(res, { success: true, message: "没有待执行的任务" });
        }

        const results = tasks.map(task => ({
          task_id: task.id,
          title: task.title,
          ...enqueueTask(task.id, ctx)
        }));
        const queuedCount = results.filter(r => r.queued).length;

        sendJson(res, {
          success: true,
          message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
          results,
          queue_status: getQueueStatus()
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/review" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, project, diff, reviewers } = JSON.parse(body);
        if (!diff) return sendJson(res, { error: "请提供代码变更内容" }, 400);

        const configs = getConfigs();
        const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;

        const reviewResults = [];
        const reviewGroup = group_id ? loadGroups().find(g => g.id === group_id) : null;
        for (const reviewer of (reviewers || [])) {
          const config = configs.find(c => c.name === reviewer);
          if (!config) continue;

          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          try {
            const toolContext = buildAgentToolContext(ctx, reviewGroup, reviewer, reviewPrompt);
            const runtimeToolContext = prepareAgentRuntimeTools(group_id || "", reviewer, workDir, agentType, toolContext.allowedTools, null, {
              toolAudit: toolContext.toolAudit,
              authorizationReadiness: toolContext.authorizationReadiness,
            });
            assertRuntimeToolDispatchReady(reviewer, runtimeToolContext);
            const result = await ctx.callAgent(
              reviewer,
              `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${reviewPrompt}`,
              workDir,
              agentType,
              120000,
              {
                tab: group_id ? "groups" : "projects",
                groupId: group_id,
                project: reviewer,
                allowedTools: toolContext.allowedTools,
                mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
              }
            );
            reviewResults.push({ reviewer, result });
          } catch (e: any) {
            reviewResults.push({ reviewer, error: e.message });
          }
        }

        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          const coordinator = group ? getCoordinatorMember(group) : { project: "coordinator" };
          appendLegacyCodeReviewGroupReport({
            groupId: group_id,
            project,
            coordinator: coordinator.project,
            reviewResults,
          });
        }

        sendJson(res, { success: true, reviews: reviewResults });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/collaboration/stats" && req.method === "GET") {
    const tasks = loadTasks();
    const groups = loadGroups();

    const stats = {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter((t: any) => t.status === "pending").length,
      in_progress_tasks: tasks.filter((t: any) => t.status === "in_progress").length,
      done_tasks: tasks.filter((t: any) => t.status === "done").length,
      failed_tasks: tasks.filter((t: any) => t.status === "failed").length,
      completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t: any) => t.status === "done").length / tasks.length * 100) : 0,
      groups_count: groups.length,
      recent_activities: [] as any[]
    };

    for (const group of groups.slice(0, 3)) {
      const messages = getGroupMessages(group.id).slice(-5);
      for (const msg of messages) {
        stats.recent_activities.push({
          group: group.name,
          agent: msg.agent || "user",
          content: msg.content?.substring(0, 100),
          timestamp: msg.timestamp
        });
      }
    }

    stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    stats.recent_activities = stats.recent_activities.slice(0, 10);

    sendJson(res, stats);
    return true;
  }

  if (pathname === "/api/test/mentions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { text, group_id } = JSON.parse(body);
        let validMentions: any[] = [];
        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          if (group) {
            validMentions = extractActionableMentions(text, group, "");
          }
        }
        sendJson(res, {
          success: true,
          input: text,
          valid_mentions: validMentions.map(m => m.mention),
          extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (handleFeishuRoutes(req, res, parsed)) return true;
  return false;
}
