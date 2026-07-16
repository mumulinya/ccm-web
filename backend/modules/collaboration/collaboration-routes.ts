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
  updateTask,
  validateDailyDevGroupReady,
  validateTaskManualStatusUpdate,
  writeSse,
} from "./collaboration";

export function handleCollaborationApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
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
  if (pathname === "/api/tasks/replay/artifact" && req.method === "GET") {
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

  if (pathname === "/api/usability/intake/preview" && req.method === "POST") {
    const handleIntakePreview = async (payload: any, files: any[] = []) => {
      try {
        const userRequirement = compactFormText(payload.requirement || payload.goal || payload.message, "");
        const sourceIngestion = await ingestRequirementSources({ files, userText: userRequirement, extractRequirement: true });
        const extractedRequirement = sourceIngestion.requirement;
        const requirement = compactFormText(extractedRequirement?.business_goal || userRequirement, "");
        if (!requirement && sourceIngestion.sources.length === 0) return sendJson(res, { error: "请先说说你想完成什么，或者上传需求资料" }, 400);
        const groups = loadGroups();
        const group = groups.find((item: any) => item.id === (payload.group_id || payload.groupId)) || null;
        const requestedProject = compactFormText(payload.target_project || payload.targetProject, "");
        const coordinator = group?.members?.find((member: any) => member.role === "coordinator")?.project || group?.members?.[0]?.project || "";
        const targetProject = requestedProject || coordinator || getConfigs()[0]?.name || "";
        if (!targetProject && !group) return sendJson(res, { error: "还没有可执行项目，请先添加项目或开发群聊" }, 409);
        const lower = `${requirement}\n${sourceIngestion.source_documents}`.toLowerCase();
        const areas = [
          /(页面|前端|ui|组件|样式)/i.test(lower) ? "前端页面与交互" : "",
          /(接口|后端|服务|数据库|api)/i.test(lower) ? "后端接口与数据" : "",
          /(测试|修复|bug|报错)/i.test(lower) ? "测试与回归验证" : "",
        ].filter(Boolean);
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
          source_summary: sourceIngestion.user_summary,
          source_ingestion: sourceIngestion.technical,
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
          source_ingestion: sourceIngestion.technical,
          target_project: targetProject,
          group_id: group?.id || null,
          assign_type: group ? "group" : "project",
          workflow_type: group ? "daily_dev" : "general",
          requires_code_changes: payload.requires_code_changes !== false,
          requires_verification: true,
          auto_execute: false,
          intake_state: "awaiting_confirmation",
          intake_draft: intakeDraft,
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
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
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

  if (pathname === "/api/usability/intake/confirm" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const acceptFeedback = compactFormText(payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "", "");
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (current.intake_state === "confirmed") return sendJson(res, { success: true, duplicate: true, task: current, trace_id: current.trace_id });
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效" }, 409);
        const confirmedAt = new Date().toISOString();
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
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = String(payload.task_id || payload.id || "").trim();
        const feedback = compactFormText(payload.feedback || payload.message || payload.reason || "", "");
        const current = loadTasks().find((item: any) => item.id === taskId);
        if (!current) return sendJson(res, { error: "确认卡对应的任务不存在" }, 404);
        if (current.intake_state !== "awaiting_confirmation") return sendJson(res, { error: "这张确认卡已经失效，不能调整计划" }, 409);
        if (!feedback) return sendJson(res, { error: "请填写希望主 Agent 调整的地方" }, 400);
        const basePlan = getTaskPlanMode(current) || current.intake_draft || {};
        const revisedPlan = buildRevisedPlanModeDraft(basePlan, feedback);
        const meta = current.workflow_meta || {};
        const task = updateTask(taskId, {
          intake_state: "awaiting_confirmation",
          intake_draft: revisedPlan,
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

  if (pathname === "/api/tasks/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const task = createTask(payload);
        let queueResult = null;
        if (payload.auto_execute || payload.autoExecute) {
          queueResult = enqueueTask(task.id, ctx);
        }
        sendJson(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      let operationKey = "";
      try {
        const payload = body ? JSON.parse(body) : {};
        operationKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
        const traceId = ensureTraceId(payload.trace_id || payload.traceId, "daily-dev");
        const groupId = payload.group_id || payload.groupId;
        if (!groupId) return sendJson(res, { error: "请选择目标开发群聊" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return sendJson(res, { error: "开发群聊不存在" }, 404);
        const groupReadiness = validateDailyDevGroupReady(group);
        const goal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
        if (!goal) return sendJson(res, { error: "请输入业务目标" }, 400);
        const quality = evaluateDailyDevIntakeQuality(payload, goal);
        const forceQualityGate = !!(payload.force_quality_gate || payload.forceQualityGate || payload.force);
        if (!quality.pass && !forceQualityGate) {
          return sendJson(res, {
            success: false,
            needs_confirmation: true,
            error: quality.message,
            quality,
          }, 422);
        }
        const operation = operationKey ? acquireIdempotency({ scope: "create-daily-dev", key: operationKey, traceId, leaseMs: 60_000 }) : null;
        if (operation && !operation.acquired) {
          const existingTask = operation.record?.result?.task_id ? loadTasks().find((item: any) => item.id === operation.record.result.task_id) : null;
          sendJson(res, { success: true, duplicate: true, task: existingTask, trace_id: operation.traceId });
          return;
        }
        const title = compactFormText(payload.title, goal.slice(0, 60));
        const backlogFile = persistDailyDevBacklogFile(groups, group, payload, title, goal);
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
          assign_type: "group",
          priority: payload.priority || "normal",
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          workflow_type: "daily_dev",
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
          requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
          business_goal: goal,
          acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
          source_documents: sourceDocuments,
          workflow_meta: {
            ...(payload.workflow_meta || payload.workflowMeta || {}),
            intake_quality: quality,
            intake: backlogFile ? {
              backlog_file: backlogFile.name,
              persisted_at: new Date().toISOString(),
              source: "create-daily-dev",
            } : null,
          },
          trace_id: traceId,
          idempotency_key: operationKey || null,
        });
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
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
    const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
    const items = listDailyDevBacklogs(groupId);
    const counts = items.reduce((acc: any, item: any) => {
      acc[item.status] = Number(acc[item.status] || 0) + 1;
      return acc;
    }, {});
    sendJson(res, { success: true, items, counts });
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

  if (pathname === "/api/tasks/update" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, ...updates } = JSON.parse(body);
        const current = loadTasks().find(t => t.id === id);
        if (!current) return sendJson(res, { error: "任务不存在" }, 404);
        const validationError = validateTaskManualStatusUpdate(current, updates);
        if (validationError) return sendJson(res, { error: validationError }, 409);
        const task = updateTask(id, updates);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        updateGroupTaskInlineStatus(task, task.status, task.status_detail || "任务状态已更新");
        sendJson(res, { success: true, task });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
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
        const result = reconcileTaskDeliveryEvidence(taskId);
        sendJson(res, result, result.success ? 200 : (result.status || 400));
      } catch (e: any) { sendJson(res, { success: false, error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/tasks/continue" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const taskId = payload.task_id || payload.id;
        const message = compactFormText(payload.message || payload.followup || payload.note, "");
        const result = continueTaskWithMessage(taskId, message, ctx, {
          source: payload.source || "user",
          auto_execute: payload.auto_execute,
          autoExecute: payload.autoExecute,
          continuationKind: payload.continuation_kind || payload.continuationKind || "auto",
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
          queued: true,
          work_item_claim_summary: claimResult?.summary || null,
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

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
        const toolContext = buildAgentToolContext(ctx, group, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`);
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
          const autoAssignFailed = !autoAssignSucceeded || checkTaskFailure(taskResult);
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
