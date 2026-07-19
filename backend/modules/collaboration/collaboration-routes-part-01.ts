// Behavior-freeze split from collaboration-routes.ts (part 1/4).
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

import { decomposeRequirementToTaskPlan, ingestRequirementSources, requirementToIntakeDraft } from "../requirements/source-ingestion";
import { runRequirementEpicSelfTest } from "../requirements/requirement-epic-self-tests";
import { startGlobalMissionSupervisor } from "../../agents/global/mission-supervisor";

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
): boolean {  if (pathname === "/api/tasks/replay/artifact" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "").trim();
    const runId = String(parsed.query.run_id || parsed.query.runId || "").trim();
    const artifactId = String(parsed.query.artifact_id || parsed.query.artifactId || "").trim();
    if (!taskId || !runId || !artifactId) { sendJson(res, { error: "缺少任务、运行或证据 ID" }, 400); return true; }
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

  if (pathname === "/api/tasks/replay" && req.method === "GET") {
    const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "").trim();
    if (!taskId) {
      const limit = Math.max(1, Math.min(100, Number(parsed.query.limit || 40)));
      sendJson(res, { success: true, index: buildTaskReplayIndex(limit) });
      return true;
    }
    const replay = buildCompleteTaskReplay(taskId);
    if (!replay) { sendJson(res, { error: "任务不存在" }, 404); return true; }
    sendJson(res, { success: true, replay });
    return true;
  }

  if (pathname === "/api/tasks/replay/self-test" && req.method === "GET") {
    sendJson(res, { success: true, self_test: runTaskReplayContractSelfTest() });
    return true;
  }

  if (pathname === "/api/tasks/entity-chain" && req.method === "GET") {
    const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
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

  if (pathname === "/api/tasks/executions" && req.method === "GET") {
    const executionId = String(parsed.query.execution_id || parsed.query.executionId || "");
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    sendJson(res, { success: true, execution: executionId ? loadExecution(executionId) : null, executions: executionId ? [] : listExecutions(taskId ? { taskId } : {}) });
    return true;
  }

  if (pathname === "/api/tasks/native-sessions" && req.method === "GET") {
    const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
    if (!taskId) { sendJson(res, { error: "缺少任务 ID" }, 400); return true; }
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
      const trace = getTrace(traceId);
      if (!trace) return sendJson(res, { success: false, error: "Trace 不存在" }, 404);
      sendJson(res, { success: true, trace });
      return true;
    }
    const traces = listTraces(Number(parsed.query.limit || 50)).filter((trace: any) => !taskId || trace.task_id === taskId || trace.events?.some((event: any) => event.task_id === taskId));
    sendJson(res, { success: true, traces });
    return true;
  }

  if (pathname === "/api/reliability/self-test" && req.method === "GET") {
    sendJson(res, { success: true, result: runReliabilityLedgerSelfTest() });
    return true;
  }

  if (pathname === "/api/reliability/drills/run" && req.method === "POST") {
    try {
      const outcome = runScheduledProductionReliabilityDrill({ force: true });
      const result = outcome.result;
      sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    } catch (error: any) {
      sendJson(res, { success: false, error: error.message || String(error) }, 500);
    }
    return true;
  }

  if (pathname === "/api/reliability/drills/status" && req.method === "GET") {
    sendJson(res, { success: true, status: getReliabilityDrillStatus() });
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
        const task = loadTasks().find((item: any) => item.id === taskId);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
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

  if (pathname === "/api/tasks/cancel" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.taskId || payload.id || "");
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = loadTasks().find((item: any) => item.id === taskId);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        if (task.status === "done") return sendJson(res, { error: "已完成任务不能取消" }, 409);
        for (const queue of taskQueues.values()) {
          let index = queue.indexOf(taskId);
          while (index >= 0) { queue.splice(index, 1); index = queue.indexOf(taskId); }
        }
        const reason = compactFormText(payload.reason, "用户主动停止任务");
        const cancellation = requestTaskCancellation(taskId, reason, String(payload.actor || "local-user"));
        const testAgentRunsCancelled = cancelTestAgentRunsForTask(taskId, reason);
        const isRunning = runningTaskIds.has(taskId);
        const sessions = closeTaskAgentSessions({ taskId }, "用户取消任务，关闭任务级原生会话");
        const idempotencySettled = task.trace_id ? settleIdempotencyByTrace(task.trace_id, "failed", { cancelled: true, task_id: taskId, reason }) : [];
        const worktrees: any[] = [];
        for (const execution of listExecutions({ taskId })) {
          if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt) continue;
          try { worktrees.push({ execution_id: execution.id, ...cleanupExecutionWorktree(execution.id, true) }); }
          catch (error: any) { worktrees.push({ execution_id: execution.id, success: false, error: error.message }); }
        }
        const updated = updateTask(taskId, { status: isRunning ? "in_progress" : "cancelled", auto_execute: false, is_paused: true, paused: true, status_detail: isRunning ? "取消请求已发送，正在终止 Agent 进程" : "任务已取消", cancellation_requested_at: new Date().toISOString(), cancellation_reason: reason, cancellation_cleanup: { sessions_closed: sessions.length, test_agent_runs_cancelled: testAgentRunsCancelled.length, idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0), worktrees }, ...(isRunning ? {} : { cancelled_at: new Date().toISOString() }) });
        if (!isRunning) {
          releaseTaskLease(taskId, "cancelled");
          clearTaskCancellation(taskId);
        }
        updateGroupTaskInlineStatus(updated || task, isRunning ? "in_progress" : "cancelled", isRunning ? "正在终止 Agent 进程" : "任务已取消");
        addTaskLog(taskId, "warning", isRunning ? "已发送取消请求，正在终止 Agent 进程树" : "已从队列移除并取消任务");
        await ctx.onTaskStatusChange?.(updated || task, isRunning ? "cancelling" : "cancelled", reason);
        sendJson(res, { success: true, task: updated, running: isRunning, cancellation, cleanup: updated?.cancellation_cleanup, queue_status: getQueueStatus() });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (["/api/tasks/execution/rollback", "/api/tasks/execution/merge", "/api/tasks/execution/cleanup"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        let result: any;
        if (pathname.endsWith("/rollback")) result = rollbackExecutionCheckpoint(String(payload.checkpoint_id || payload.checkpointId || ""), String(payload.reason || ""), { allowShared: payload.allow_shared === true || payload.allowShared === true });
        else if (pathname.endsWith("/merge")) result = mergeExecutionWorktree(String(payload.execution_id || payload.executionId || ""), { force: !!payload.force, commit: payload.commit !== false, message: payload.message || "" });
        else result = cleanupExecutionWorktree(String(payload.execution_id || payload.executionId || ""), !!payload.force);
        const executionId = String(payload.execution_id || payload.executionId || result?.executionId || "");
        const executionRecord = executionId ? loadExecution(executionId) : null;
        const task = executionRecord?.taskId ? loadTasks().find((item: any) => item.id === executionRecord.taskId) : null;
        if (task?.trace_id) {
          const action = pathname.endsWith("/merge") ? "merge" : pathname.endsWith("/rollback") ? "rollback" : "cleanup";
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
    const tasks = onlyArchived
      ? allTasks.filter((task: any) => task.archived || task.deleted_at)
      : includeArchived ? allTasks : allTasks.filter((task: any) => !task.archived && !task.deleted_at);
    sendJson(res, { tasks, archived_count: allTasks.filter((task: any) => task.archived || task.deleted_at).length });
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
