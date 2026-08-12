// collaboration-runtime-runtime-tools.ts — merged from 2 part files (behavior-freeze merge).

import { buildReviewCycleResetUpdate } from "./rework-policy";
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
import { resolveRuntimeEditCapability } from "../../agents/runtime-edit-capability";
import { readAgentProbeStatus } from "./collaboration-agent-probes";
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
  getAgentRuntime,
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
  appendTaskGroupReport,
  buildContinuationUserDecision,
  buildUserContinuationStatus,
  compactRuntimeToolAudit,
  configuredProjectWorkDir,
  getTaskById,
  hasStrongTaskAcceptanceEvidence,
  isAgentExecutionBlockedPendingTask,
  isTaskPaused,
  runningTaskIds,
  runtimeToolSnapshotFromAudit,
  syncTaskBacklogStatus,
  updateGroupTaskInlineStatus,
} from "./collaboration-runtime-task-queue";
import {
  buildDeliverySummary,
  isAdvisoryNeed,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";
import {
  taskRequiresAgentQa,
  writeSse,
} from "./collaboration-runtime-daily-dev";
import {
  enqueueTask,
  finalizeTaskKernel,
  getQueueStatus,
  isTaskQueuedInMemory,
} from "./collaboration-runtime-coordinator-review";
import {
  CollabCtx,
  getProjectExtraConfig,
} from "./collaboration-runtime-plan-tools";
import {
  buildPlanRevisionTaskUpdates,
  mergeFollowupIntoPlanMode,
  readTaskPlanMode,
  summarizePlanRevisionForUser,
} from "./main-agent-plan-core";

// ===== merged from collaboration-runtime-runtime-tools-part-01.ts =====

function mergeRuntimeToolManagerAudit(audit: any, toolAudit: any) {
  if (!audit || !toolAudit) return audit;
  const rows = Array.isArray(toolAudit.mcp) ? toolAudit.mcp : [];
  for (const row of rows) {
    if (row.state !== "missing_tool") continue;
    const serverName = `ccm__${String(row.server || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "tool"}`;
    const existing = (audit.mcp_statuses || []).find((item: any) => item.name === row.server);
    if (existing) {
      existing.state = "missing_tool";
      existing.availableTools = row.availableTools || existing.availableTools || [];
      existing.missingTools = row.missingTools || [];
      existing.error = `授权的 MCP tool 不存在或未注册：${(row.missingTools || []).join(", ")}`;
    } else {
      audit.mcp_statuses = audit.mcp_statuses || [];
      audit.mcp_statuses.push({
        name: row.server,
        serverName,
        state: "missing_tool",
        grants: [row.raw],
        tools: row.tool ? [row.tool] : [],
        availableTools: row.availableTools || [],
        missingTools: row.missingTools || [],
        error: `授权的 MCP tool 不存在或未注册：${(row.missingTools || []).join(", ")}`,
      });
    }
    audit.warnings = audit.warnings || [];
    audit.warnings.push(`MCP ${row.server} 缺少授权工具：${(row.missingTools || []).join(", ")}`);
  }
  for (const row of rows.filter((item: any) => ["failed", "disconnected", "missing_server"].includes(String(item.state || "")))) {
    const existing = (audit.mcp_statuses || []).find((item: any) => item.name === row.server);
    if (existing && existing.state === "synced") {
      existing.state = "config_error";
      existing.error = row.serverStatus?.error || `MCP server 当前状态：${row.state}`;
    }
  }
  return audit;
}

function getRuntimeAuthorizationReadiness(allowedTools: any, options: any = {}) {
  if (options.authorizationReadiness?.schema === "ccm-tool-authorization-readiness-v1") return options.authorizationReadiness;
  if (options.toolAudit) return buildAuthorizationReadiness(options.toolAudit, normalizeToolAuthorization(allowedTools));
  return buildToolAuthorizationPayload(allowedTools).authorization_readiness;
}

function summarizeRuntimeAuthorizationReadiness(readiness: any) {
  if (!readiness || readiness.dispatchReady !== false) return "";
  const missing = readiness.missing || {};
  const parts: string[] = [];
  if (missing.missing_mcp_servers) parts.push(`MCP server ${missing.missing_mcp_servers}`);
  if (missing.missing_mcp_tools) parts.push(`MCP tool ${missing.missing_mcp_tools}`);
  if (missing.missing_skills) parts.push(`Skill ${missing.missing_skills}`);
  if (readiness.invalid_mcp_grants) parts.push(`无效 MCP 授权 ${readiness.invalid_mcp_grants}`);
  return parts.length ? parts.join("、") : "存在不可用授权项";
}

export function runtimeToolDispatchBlockedMessage(projectName: string, runtimeToolContext: any = {}) {
  const gate = runtimeToolContext.dispatchGate || runtimeToolContext.audit?.dispatch_gate || {};
  return `${projectName} MCP/Skill 授权未就绪，已阻止派发子 Agent：${gate.reason || "存在不可用授权项"}`;
}

export function runtimeToolDispatchBlockedReceipt(projectName: string, runtimeToolContext: any = {}) {
  return require("./collaboration-acceptance").runtimeToolDispatchBlockedReceipt(projectName, runtimeToolContext);
}

export function assertRuntimeToolDispatchReady(projectName: string, runtimeToolContext: any = {}) {
  if (runtimeToolContext.dispatchBlocked || runtimeToolContext.dispatchGate?.dispatchReady === false) {
    throw new Error(runtimeToolDispatchBlockedMessage(projectName, runtimeToolContext));
  }
}

export function prepareAgentRuntimeTools(
  groupId: string,
  projectName: string,
  workDir: string,
  agentType: string,
  allowedTools: any,
  streamRes: any = null,
  options: any = {}
) {
  const authorizationReadiness = getRuntimeAuthorizationReadiness(allowedTools, options);
  const sourceTask = options.task || getTaskById(options.taskId || "");
  const group = groupId ? loadGroups().find((item: any) => String(item?.id || "") === String(groupId)) || null : null;
  const coordinatorProject = group ? String(getCoordinatorMember(group)?.project || group?.orchestrator?.coordinatorProject || "") : "";
  const internalAgentRole = options.internalAgentRole
    || (projectName && coordinatorProject && projectName === coordinatorProject ? "group-main-agent" : "project-child-agent");
  const internalProjects = group
    ? (group.members || []).filter((member: any) => member?.project && member.project !== coordinatorProject).map((member: any) => {
      const project = String(member.project);
      const extra = getProjectExtraConfig(project);
      return {
        name: project,
        workDir: configuredProjectWorkDir(project),
        verificationCommands: Array.isArray(extra?.verification_commands) ? extra.verification_commands : [],
        targetUrl: String(extra?.target_url || extra?.targetUrl || ""),
      };
    }).filter((project: any) => project.workDir)
    : [];
  const runtimeEditCapability = resolveRuntimeEditCapability({
    runtimeDeclared: getAgentRuntime(agentType).capabilities.nativeWorkspaceEditing,
    probe: readAgentProbeStatus({ groupId, project: projectName, agentType }),
  });
  const taskBoundInternalMcpServers = !options.disableTaskBoundInternalMcp && sourceTask?.id && workDir
    ? buildTaskBoundInternalMcpServers({
      taskId: String(sourceTask.id),
      groupId: String(groupId || sourceTask.group_id || ""),
      groupSessionId: String(options.groupSessionId || sourceTask.group_session_id || sourceTask.groupSessionId || ""),
      project: projectName,
      role: internalAgentRole,
      agentType,
      taskAgentSessionId: String(options.taskAgentSessionId || ""),
      nativeSessionId: String(options.nativeSessionId || ""),
      workDir,
      baseWorkDir: configuredProjectWorkDir(projectName) || workDir,
      projects: internalProjects,
      memoryReceiptChallenge: options.memoryReceiptChallenge || null,
      memoryReceiptFile: options.memoryReceiptFile || "",
      memorySnapshotId: options.memorySnapshotId || "",
      memorySnapshotChecksum: options.memorySnapshotChecksum || "",
      boundaryGeneration: Number(options.boundaryGeneration || 0),
      nativeGeneration: Number(options.nativeGeneration || 0),
      communicationMessageId: String(options.communicationMessageId || ""),
      communicationGeneration: Number(options.communicationGeneration || 0),
      communicationAttempt: Number(options.communicationAttempt || 0),
      communicationLeaseId: String(options.communicationLeaseId || ""),
      anchorMessageId: String(options.anchorMessageId || ""),
      originMessageId: String(options.originMessageId || ""),
      requestText: options.requestText || "",
      memoryReadBudgetTokens: Number(options.memoryReadBudgetTokens || 0),
      nativeWorkspaceEditing: runtimeEditCapability.nativeWorkspaceEditing,
    })
    : {};
  const audit = syncRuntimeTools(workDir, agentType, allowedTools, {
    authorizationReadiness,
    internalMcpServers: { ...taskBoundInternalMcpServers, ...(options.internalMcpServers || {}) },
  });
  audit.authorization_readiness = authorizationReadiness;
  (audit as any).workspace_edit_capability = runtimeEditCapability;
  mergeRuntimeToolManagerAudit(audit, options.toolAudit);
  audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
  const dispatchBlocked = audit.dispatch_gate.dispatchReady === false;
  const authorizationBlocked = authorizationReadiness?.dispatchReady === false;
  const level = audit.mode === "failed" || audit.missing.mcp.length || audit.missing.skill.length || dispatchBlocked ? "warning" : "info";
  const missingNames = [...audit.missing.mcp.map(name => `MCP:${name}`), ...audit.missing.skill.map(name => `Skill:${name}`)];
  const missingSuffix = missingNames.length ? `；未找到或未启用：${missingNames.join("、")}` : "";
  const authorizationSuffix = authorizationBlocked ? `；授权需处理缺失项：${summarizeRuntimeAuthorizationReadiness(authorizationReadiness)}` : "";
  const warningSuffix = audit.warnings?.length ? `；${audit.warnings.join("；")}` : "";
  const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
  const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item: any) => item.state === "synced").length : audit.synced.mcp.length;
  const proxyMcpCount = mcpStatuses.filter((item: any) => item.state === "proxy_only").length;
  const summary = audit.mode === "native-and-proxy"
    ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已交付工具：原生 MCP ${nativeMcpCount}，代理 MCP ${proxyMcpCount}，Skill ${audit.synced.skill.length}${missingSuffix}${authorizationSuffix}${warningSuffix}`
    : audit.mode === "ccm-proxy-only"
      ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式${authorizationSuffix}`
      : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`;
  const traceId = options.traceId || sourceTask?.trace_id || "";
  if (traceId) {
    recordAgentRuntimeLifecycle({
      scope: "worker",
      traceId,
      taskId: sourceTask?.id || options.taskId || "",
      groupId,
      agent: projectName,
      action: "runtime_tool_sync",
      phase: "prepare",
      risk: "read",
      target: projectName,
      status: audit.mode === "failed" ? "error" : (dispatchBlocked ? "blocked" : "ok"),
      message: summary,
      data: { runtime_tool_sync: compactRuntimeToolAudit(audit), snapshot: runtimeToolSnapshotFromAudit(audit, allowedTools) },
    });
  }
  recordRuntimeToolSyncAudit(audit, projectName, groupId);
  if (groupId) safeAddGroupLog(groupId, level, "runtime-tool-sync", summary, audit);
  const workEvent = {
    id: "we" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex"),
    time: new Date().toISOString(),
    agent: projectName,
    kind: audit.mode === "failed" || dispatchBlocked ? "error" : "tool",
    text: summary,
    runtimeToolSync: audit,
  };
  if (streamRes) {
    writeSse(streamRes, { type: "agent_work_event", agent: projectName, event: workEvent });
    if (audit.mode === "failed" || dispatchBlocked) writeSse(streamRes, { type: "status", text: `工具同步提示：${summary}` });
  }
  return { audit, workEvent, prompt: buildRuntimeToolSyncPrompt(audit), dispatchGate: audit.dispatch_gate, dispatchBlocked };
}

function normalizeVerificationCommands(value: any) {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map(item => item.trim()).filter(Boolean);
}

function readPackageJsonScripts(workDir: string) {
  try {
    const file = path.join(workDir, "package.json");
    if (!fs.existsSync(file)) return {};
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
  } catch {
    return {};
  }
}

export function getConfiguredProjectVerificationCommands(projectName: string) {
  const projectConfig = getProjectExtraConfig(projectName);
  return normalizeVerificationCommands(
    projectConfig.verification_commands
      || projectConfig.verificationCommands
      || projectConfig.test_commands
      || projectConfig.testCommands
      || projectConfig.check_commands
      || projectConfig.checkCommands
  );
}

function inferProjectVerificationCommands(workDir = "") {
  const dir = String(workDir || "").trim();
  if (!dir || !fs.existsSync(dir)) return [];
  const hints: string[] = [];
  const scripts = readPackageJsonScripts(dir);
  const scriptNames = Object.keys(scripts);
  const addNpmScript = (name: string) => {
    if (scriptNames.includes(name)) hints.push(`npm run ${name}`);
  };
  addNpmScript("check");
  addNpmScript("typecheck");
  addNpmScript("lint");
  addNpmScript("test");
  addNpmScript("build");
  if (fs.existsSync(path.join(dir, "pom.xml"))) hints.push("mvn test");
  if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts"))) hints.push("gradle test");
  if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml"))) hints.push("pytest");
  if (fs.existsSync(path.join(dir, "go.mod"))) hints.push("go test ./...");
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) hints.push("cargo test");
  return uniqueStrings(hints).slice(0, 6);
}

export function getAgentRuntimeConsistencyStatus() {
  const runtimes = getPublicAgentRuntimes();
  const runtimeKeys = new Set<string>();
  for (const runtime of runtimes) {
    runtimeKeys.add(String(runtime.id || "").toLowerCase());
    for (const alias of runtime.aliases || []) runtimeKeys.add(String(alias || "").toLowerCase());
  }
  const agents = (AGENTS || []).map((agent: any) => ({
    type: String(agent.type || "").trim(),
    name: String(agent.name || agent.type || "").trim(),
  })).filter((agent: any) => agent.type);
  const missing = agents.filter((agent: any) => !runtimeKeys.has(agent.type.toLowerCase()));
  return {
    pass: missing.length === 0 && agents.length > 0,
    agents,
    runtimes: runtimes.map((runtime: any) => ({ id: runtime.id, aliases: runtime.aliases, commandLabel: runtime.commandLabel })),
    missing,
  };
}

export function getProjectVerificationHintDetail(projectName: string, workDir = "") {
  const configured = getConfiguredProjectVerificationCommands(projectName);
  if (configured.length > 0) {
    return { source: "configured", commands: configured.slice(0, 6) };
  }
  const inferred = inferProjectVerificationCommands(workDir);
  return {
    source: inferred.length > 0 ? "inferred" : "missing",
    commands: inferred,
  };
}

export function buildProjectVerificationHints(projectName: string, workDir = "") {
  return getProjectVerificationHintDetail(projectName, workDir).commands;
}

export function compactFormText(value: any, fallback = "未填写") {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  return text || fallback;
}

export function buildTaskContinuationBlock(message: string) {
  return [
    "",
    "---",
    "",
    `用户补充说明（${new Date().toISOString()}）：`,
    compactFormText(message),
    "",
    "继续执行要求：",
    "- 主 Agent 必须结合原始任务和本次补充说明继续推进。",
    "- 如果此前有阻塞、缺口或返工项，优先用补充说明消解后再派发子 Agent。",
    "- 不要丢弃已有任务上下文、回执和验收标准；最终报告需要覆盖完整任务。"
  ].join("\n");
}

export function createTask(task: any) {
  return require("./collaboration-task-service").createTask(task);
}

export function createRequirementEpicWithChildren(payload: any) {
  return require("./collaboration-task-service").createRequirementEpicWithChildren(payload);
}

export function updateRequirementEpicFromPlan(payload: any) {
  return require("./collaboration-task-service").updateRequirementEpicFromPlan(payload);
}

export function classifyTaskContinuation(message: string) {
  return require("./collaboration-task-service").classifyTaskContinuation(message);
}

export function looksLikeTaskContinuation(message: string) {
  return require("./collaboration-task-service").looksLikeTaskContinuation(message);
}

function getGlobalMissionDeps() {
  return {
    listExecutions,
    taskRequiresCodeChanges,
    taskRequiresVerification,
    listPermissionRequests: (filters: any = {}) => require("./task-permission-broker").listTaskPermissionRequests(filters),
  };
}

export function getGlobalMissionChildDeliveryEvidence(task: any) {
  return getGlobalMissionChildDeliveryEvidenceBase(task, getGlobalMissionDeps());
}

export function globalMissionChildGatePassed(task: any) {
  return globalMissionChildGatePassedBase(task, getGlobalMissionDeps());
}

export function refreshGlobalMissionParentInTaskList(tasks: any[], parentId: string) {
  return refreshGlobalMissionParentInTaskListBase(tasks, parentId, getGlobalMissionDeps());
}

const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");

function normalizeGlobalDispatchHistoryMessages(messages: any[] = []) {
  return messages
    .filter((item: any) => item && ["user", "assistant"].includes(String(item.role || "")) && String(item.content || "").trim())
    .map((item: any) => ({
      role: String(item.role),
      content: String(item.content || "").slice(0, 8000),
      timestamp: item.timestamp || new Date().toISOString(),
    }))
    .slice(-80);
}

function loadGlobalDispatchHistoryStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) return { sessions: [], ...JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8")) };
  } catch {}
  try {
    if (fs.existsSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`)) return { sessions: [], ...JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8")) };
  } catch {}
  return { current_session_id: "", sessions: [] };
}

function writeGlobalDispatchHistoryStore(store: any) {
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  store.sessions = sessions
    .map((session: any) => ({
      ...session,
      messages: normalizeGlobalDispatchHistoryMessages(session.messages || []),
      updatedAt: session.updatedAt || new Date().toISOString(),
    }))
    .filter((session: any) => session.id && session.messages.length > 0)
    .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, 30);
  fs.mkdirSync(path.dirname(GLOBAL_AGENT_HISTORY_FILE), { recursive: true });
  const temp = `${GLOBAL_AGENT_HISTORY_FILE}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
    try { fs.copyFileSync(GLOBAL_AGENT_HISTORY_FILE, `${GLOBAL_AGENT_HISTORY_FILE}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf-8");
  fs.renameSync(temp, GLOBAL_AGENT_HISTORY_FILE);
}

export function getGlobalDirectDispatchMeta(task: any) {
  const meta = task?.workflow_meta?.global_direct_dispatch || task?.workflowMeta?.global_direct_dispatch || null;
  if (!meta || typeof meta !== "object") return null;
  if (String(meta.schema || "") !== "ccm-global-direct-dispatch-v1") return null;
  return meta;
}

export function getGlobalDirectDispatchContinuationKey(task: any) {
  return require("./collaboration-global-missions").getGlobalDirectDispatchContinuationKey(task);
}

export function shouldNotifyGlobalDirectDispatchContinuation(task: any, previousStatus = "") {
  return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus);
}

export function buildGlobalDirectDispatchContinuationMessage(task: any) {
  return require("./collaboration-global-missions").buildGlobalDirectDispatchContinuationMessage(task);
}

export function shouldNotifyGlobalDirectDispatchCompletion(task: any, previousStatus = "") {
  return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus);
}

export function buildGlobalDirectDispatchCompletionMessage(task: any) {
  return require("./collaboration-global-missions").buildGlobalDirectDispatchCompletionMessage(task);
}

export function shouldNotifyGlobalDirectDispatchRollback(task: any, previousStatus = "") {
  return require("./collaboration-global-missions").shouldNotifyGlobalDirectDispatchRollback(task, previousStatus);
}

export function buildGlobalDirectDispatchRollbackMessage(task: any) {
  return require("./collaboration-global-missions").buildGlobalDirectDispatchRollbackMessage(task);
}

function recordGlobalDirectDispatchCompletionMemory(task: any, meta: any, content: string) {
  try {
    const item = recordGlobalDirectDispatchMemory({
      dispatchId: task?.id || meta?.global_run_id || "",
      sessionId: meta?.session_id || "",
      source: "global-agent-direct-dispatch",
      traceId: task?.trace_id || meta?.trace_id || "",
      userGoal: meta?.user_goal || meta?.original_text || task?.business_goal || task?.title || "",
      groupId: task?.group_id || meta?.group_id || "",
      targetProject: task?.target_project || "",
      task,
      report: task?.delivery_summary || {},
      messageId: `global-direct-completion:${task?.id || meta?.global_run_id || crypto.randomBytes(4).toString("hex")}`,
      at: new Date().toISOString(),
    });
    return { ok: true, item, content_preview: compactMemoryText(content, 240) };
  } catch (error: any) {
    appendTraceEvent(task?.trace_id, {
      type: "global_direct_dispatch.memory_writeback_failed",
      status: "warning",
      task_id: task?.id || "",
      group_id: task?.group_id || "",
      agent: "global-agent",
      message: "全局直派完成总结写入全局记忆失败",
      data: { error: error?.message || String(error) },
    });
    return { ok: false, error: error?.message || String(error) };
  }
}

function recordGlobalDirectDispatchRollbackMemoryFromTask(task: any, meta: any, content: string) {
  try {
    const item = recordGlobalDirectDispatchRollbackMemory({
      dispatchId: task?.id || meta?.global_run_id || "",
      sessionId: meta?.session_id || "",
      source: "global-agent-direct-dispatch",
      traceId: task?.trace_id || meta?.trace_id || "",
      userGoal: meta?.user_goal || meta?.original_text || task?.business_goal || task?.title || "",
      groupId: task?.group_id || meta?.group_id || "",
      task,
      report: task?.delivery_summary || {},
      messageId: `global-direct-rollback:${task?.id || meta?.global_run_id || crypto.randomBytes(4).toString("hex")}`,
      at: new Date().toISOString(),
      reason: task?.rollback_reason || "",
    });
    return { ok: true, item, content_preview: compactMemoryText(content, 240) };
  } catch (error: any) {
    appendTraceEvent(task?.trace_id, {
      type: "global_direct_dispatch.rollback_memory_writeback_failed",
      status: "warning",
      task_id: task?.id || "",
      group_id: task?.group_id || "",
      agent: "global-agent",
      message: "全局直派撤销总结写入全局记忆失败",
      data: { error: error?.message || String(error) },
    });
    return { ok: false, error: error?.message || String(error) };
  }
}

export function appendGlobalDirectDispatchContinuationToHistory(task: any, previousStatus = "") {
  if (!shouldNotifyGlobalDirectDispatchContinuation(task, previousStatus)) return false;
  const meta = getGlobalDirectDispatchMeta(task);
  const sessionId = String(meta?.session_id || "").trim();
  const key = getGlobalDirectDispatchContinuationKey(task);
  const content = buildGlobalDirectDispatchContinuationMessage(task);
  const store = loadGlobalDispatchHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: "全局 Agent 会话",
      source: "web",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    sessions.unshift(session);
  }
  session.messages = normalizeGlobalDispatchHistoryMessages([
    ...(session.messages || []),
    { role: "assistant", content, timestamp: new Date().toISOString() },
  ]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  if (!store.current_session_id) store.current_session_id = sessionId;
  writeGlobalDispatchHistoryStore(store);
  task.workflow_meta = {
    ...(task.workflow_meta || {}),
    global_direct_dispatch: {
      ...meta,
      continuation_notified_at: session.updatedAt,
      continuation_notified_key: key,
      continuation_message_preview: compactMemoryText(content, 320),
    },
  };
  const timelineEvent = {
    id: `tl_global_direct_continuation_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    at: session.updatedAt,
    type: "global_direct_dispatch_continuation_synced",
    title: "全局 Agent 会话已同步接续状态",
    detail: "群聊任务收到补充要求后，接续状态已回写到全局 Agent 会话",
    status: "active",
    phase: "rework",
    agent: "global-agent",
    data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", continuation_key: key },
  };
  task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
  appendTraceEvent(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_continuation_synced", status: "active", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
  return true;
}

export function appendGlobalDirectDispatchCompletionToHistory(task: any, previousStatus = "") {
  if (!shouldNotifyGlobalDirectDispatchCompletion(task, previousStatus)) return false;
  const meta = getGlobalDirectDispatchMeta(task);
  const sessionId = String(meta?.session_id || "").trim();
  const content = buildGlobalDirectDispatchCompletionMessage(task);
  const memoryWriteback = recordGlobalDirectDispatchCompletionMemory(task, meta, content);
  const store = loadGlobalDispatchHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: "全局 Agent 会话",
      source: "web",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    sessions.unshift(session);
  }
  session.messages = normalizeGlobalDispatchHistoryMessages([
    ...(session.messages || []),
    { role: "assistant", content, timestamp: new Date().toISOString() },
  ]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  if (!store.current_session_id) store.current_session_id = sessionId;
  writeGlobalDispatchHistoryStore(store);
  task.workflow_meta = {
    ...(task.workflow_meta || {}),
    global_direct_dispatch: {
      ...meta,
      completion_notified_at: session.updatedAt,
      completion_message_preview: compactMemoryText(content, 320),
      memory_writeback_at: memoryWriteback.ok ? session.updatedAt : meta?.memory_writeback_at || "",
      memory_writeback_item_id: memoryWriteback.ok ? memoryWriteback.item?.id || "" : meta?.memory_writeback_item_id || "",
      memory_writeback_error: memoryWriteback.ok ? "" : memoryWriteback.error || "",
    },
  };
  const timelineEvent = {
    id: `tl_global_direct_completion_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    at: session.updatedAt,
    type: "global_direct_dispatch_completion_synced",
    title: "全局 Agent 会话已同步最终总结",
    detail: "群聊任务通过验收后，最终总结已回写到全局 Agent 会话",
    status: "ok",
    phase: "completed",
    agent: "global-agent",
    data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", memory_writeback_ok: memoryWriteback.ok },
  };
  task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
  appendTraceEvent(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_completion_synced", status: "ok", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
  return true;
}

export function appendGlobalDirectDispatchRollbackToHistory(task: any, previousStatus = "") {
  if (!shouldNotifyGlobalDirectDispatchRollback(task, previousStatus)) return false;
  const meta = getGlobalDirectDispatchMeta(task);
  const sessionId = String(meta?.session_id || "").trim();
  const content = buildGlobalDirectDispatchRollbackMessage(task);
  const memoryWriteback = recordGlobalDirectDispatchRollbackMemoryFromTask(task, meta, content);
  const store = loadGlobalDispatchHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: "全局 Agent 会话",
      source: "web",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    sessions.unshift(session);
  }
  session.messages = normalizeGlobalDispatchHistoryMessages([
    ...(session.messages || []),
    { role: "assistant", content, timestamp: new Date().toISOString() },
  ]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  if (!store.current_session_id) store.current_session_id = sessionId;
  writeGlobalDispatchHistoryStore(store);
  task.workflow_meta = {
    ...(task.workflow_meta || {}),
    global_direct_dispatch: {
      ...meta,
      rollback_notified_at: session.updatedAt,
      rollback_message_preview: compactMemoryText(content, 320),
      rollback_memory_writeback_at: memoryWriteback.ok ? session.updatedAt : meta?.rollback_memory_writeback_at || "",
      rollback_memory_writeback_item_id: memoryWriteback.ok ? memoryWriteback.item?.id || "" : meta?.rollback_memory_writeback_item_id || "",
      rollback_memory_writeback_error: memoryWriteback.ok ? "" : memoryWriteback.error || "",
    },
  };
  const timelineEvent = {
    id: `tl_global_direct_rollback_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
    at: session.updatedAt,
    type: "global_direct_dispatch_rollback_synced",
    title: "全局 Agent 会话已同步撤销结果",
    detail: "群聊任务安全撤销后，撤销总结已回写到全局 Agent 会话",
    status: "warn",
    phase: "cancelled",
    agent: "global-agent",
    data: { session_id: sessionId, global_run_id: meta?.global_run_id || "", memory_writeback_ok: memoryWriteback.ok },
  };
  task.workflow_timeline = [...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []), timelineEvent].slice(-160);
  appendTraceEvent(task.trace_id, { id: `timeline:${task.id}:${timelineEvent.id}`, type: "timeline.global_direct_dispatch_rollback_synced", status: "warning", task_id: task.id, group_id: task.group_id || "", agent: "global-agent", message: timelineEvent.detail, data: timelineEvent.data });
  return true;
}

export function updateTask(id: string, updates: any) {
  return require("./collaboration-task-service").updateTask(id, updates);
}

export function normalizeTaskTerminalStateView(task: any) {
  return require("./collaboration-task-service").normalizeTaskTerminalStateView(task);
}

export function refreshGlobalDevelopmentMissions() {
  return require("./collaboration-global-missions").refreshGlobalDevelopmentMissions();
}

export function getGlobalDevelopmentMission(id: string) {
  return require("./collaboration-global-missions").getGlobalDevelopmentMission(id);
}

export function getMissionDependencyRefs(task: any) {
  const value = task?.mission_dependencies || task?.mission_target?.depends_on || task?.mission_target?.dependsOn || [];
  return (Array.isArray(value) ? value : [value]).map((item: any) => String(item || "").trim()).filter(Boolean);
}

export function missionChildMatchesRef(task: any, ref: string) {
  const target = task?.mission_target || {};
  return [task?.id, target.name, target.project, target.group_id, task?.target_project, task?.group_id]
    .filter(Boolean)
    .some(value => String(value).toLowerCase() === String(ref).toLowerCase());
}

export function removeTaskFromQueues(taskId: string) {
  return require("./collaboration-task-service").removeTaskFromQueues(taskId);
}

export function appendGlobalMissionSupervisorTimeline(mission: any, actions: any[] = [], waitingUser: any[] = [], terminal = false) {
  if (!mission?.id) return null;
  const actionTypes = uniqueStrings((actions || []).map((item: any) => item?.type).filter(Boolean));
  const waitingReasons = uniqueStrings((waitingUser || []).map((item: any) => item?.reason).filter(Boolean)).slice(0, 3);
  const reworkCount = actionTypes.filter((type: string) => /rework|recovery|retry|merge_conflict|failure/i.test(type)).length;
  const fingerprint = crypto.createHash("sha1").update(JSON.stringify({
    terminal: !!terminal,
    actionTypes,
    waitingReasons,
    allPassed: mission?.mission_summary?.all_passed === true,
  })).digest("hex").slice(0, 12);
  const recent = Array.isArray(mission.workflow_timeline) ? mission.workflow_timeline.slice(-8) : [];
  if (recent.some((event: any) => /^global_supervisor_/.test(String(event?.type || "")) && event?.data?.fingerprint === fingerprint)) return null;
  const type = terminal
    ? "global_supervisor_completed"
    : waitingUser.length
      ? "global_supervisor_waiting_user"
      : reworkCount
        ? "global_supervisor_rework"
        : "global_supervisor_cycle";
  const title = terminal
    ? "我已确认全部子任务通过"
    : waitingUser.length
      ? "我发现有阻塞需要你处理"
      : reworkCount
        ? "我已安排子任务返工"
        : "我已检查子任务进展";
  const detail = terminal
    ? "所有子任务交付验收已通过，正在整理全局总结。"
    : waitingUser.length
      ? waitingReasons.join("；") || "有子任务需要人工确认后才能继续。"
      : actionTypes.length
        ? `已执行 ${actions.length} 个跟进动作：${actionTypes.slice(0, 4).join("、")}`
        : "子任务仍在推进，暂无需要你处理的事项。";
  return appendTaskTimelineEvent(mission.id, {
    type,
    title,
    detail,
    status: terminal ? "ok" : waitingUser.length ? "warn" : reworkCount ? "active" : "active",
    phase: terminal ? "completed" : waitingUser.length ? "needs_user" : reworkCount ? "rework" : "supervising",
    agent: "global-agent",
    data: {
      fingerprint,
      action_types: actionTypes.slice(0, 8),
      action_count: actions.length,
      waiting_user_count: waitingUser.length,
      waiting_reasons: waitingReasons,
    },
  });
}

export function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-global-missions").superviseGlobalDevelopmentMissionCycle(id, ctx, options);
}

export async function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload: any = {}) {
  return require("./collaboration-global-missions").controlGlobalDevelopmentMission(id, operation, ctx, payload);
}

export function targetProjectForMissionTarget(target: any) {
  return String(target?.type === "group" ? target?.coordinator : (target?.project || target?.name || "")).trim();
}

export function buildGlobalMissionTargetHandoff(input: {
  parent: any;
  target: any;
  group?: any;
  businessGoal: string;
  childGoal: string;
  acceptance: string;
  sourceDocuments?: string;
  traceId: string;
  priority?: string;
}) {
  return require("./collaboration-global-missions").buildGlobalMissionTargetHandoff(input);
}

export function buildGlobalGroupTestAgentOwnership() {
  return require("./collaboration-test-agent-runtime").buildGlobalGroupTestAgentOwnership();
}

export function normalizeGlobalMissionTargetRequirements(payload: any, target: any) {
  return require("./collaboration-global-missions").normalizeGlobalMissionTargetRequirements(payload, target);
}

export function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx) {
  return require("./collaboration-global-missions").createGlobalDevelopmentMission(payload, ctx);
}

export function canCompleteDailyDevFromDeliverySummary(task: any, execution: any, summary: any) {
  return require("./collaboration-task-service").canCompleteDailyDevFromDeliverySummary(task, execution, summary);
}

export function reconcileTaskDeliveryEvidence(taskId: string) {
  const task = loadTasks().find((item: any) => item.id === taskId);
  if (!task) return { success: false, status: 404, error: "任务不存在" };
  const execution = {
    status: "waiting",
    detail: task.status_detail || "重新核对持久化交付证据",
    report: task.final_report || task.result || "",
    result: task.result || "",
    receipt: task.receipt || null,
    review: task.review || null,
    fileChanges: task.file_changes || null,
  };
  const summary = buildDeliverySummary(task, execution, "waiting");
  const eligible = canCompleteDailyDevFromDeliverySummary(task, execution, summary);
  if (!eligible) {
    const updated = updateTask(taskId, { delivery_summary: summary, reasoning_loop: summary.reasoning_loop });
    addTaskLog(taskId, "info", `交付证据复核完成：仍有 ${summary.acceptance_gate?.failed_count || 0} 项门禁未通过`);
    return { success: true, completed: false, task: updated, delivery_summary: summary };
  }
  const completedExecution = { ...execution, status: "done", detail: "持久化交付证据复核通过，系统自动完成" };
  const completedSummary = buildDeliverySummary(task, completedExecution, "waiting");
  const closedSessions = closeTaskAgentSessions({ taskId, groupId: task.group_id || undefined }, "持久化交付证据复核通过");
  const finalizedExecution = { ...completedExecution, team_shutdown: { completed: true, closed_session_ids: closedSessions.map((item: any) => item.id) } };
  const finalizedSummary = buildDeliverySummary(task, finalizedExecution, "done");
  if (!finalizedSummary.acceptance_gate_passed) {
    const updated = updateTask(taskId, { status: "in_progress", status_detail: "最终收尾门禁未通过，任务保持进行中", delivery_summary: finalizedSummary, reasoning_loop: finalizedSummary.reasoning_loop });
    addTaskLog(taskId, "warning", `持久化交付证据复核后仍未完成团队收尾：${finalizedSummary.acceptance_gate?.failed_checks?.map((item: any) => item.label).join("、") || "未知缺口"}`);
    return { success: true, completed: false, task: updated, delivery_summary: finalizedSummary };
  }
  const completedTask = updateTask(taskId, {
    status: "done",
    status_detail: completedExecution.detail,
    delivery_summary: finalizedSummary,
    reasoning_loop: finalizedSummary.reasoning_loop,
    execution_readiness: null,
    daily_dev_execution_readiness: null,
    completed_at: new Date().toISOString(),
  }) || task;
  updateGroupTaskInlineStatus(completedTask, "done", completedExecution.detail);
  finalizeTaskKernel(task, finalizedExecution, finalizedSummary, "succeeded", completedExecution.detail);
  syncTaskBacklogStatus(completedTask, "done", completedExecution.detail);
  appendTaskGroupReport(completedTask, "done", completedExecution.detail);
  addTaskLog(taskId, "success", `✅ ${completedExecution.detail}`);
  return { success: true, completed: true, task: completedTask, delivery_summary: finalizedSummary };
}
export function validateTaskManualStatusUpdate(current: any, updates: any) {
  if (updates?.status !== "done") return null;
  const terminalError = require("./collaboration-task-service").validateTaskTerminalTransition(current, {
    ...updates,
    terminal_actor: updates.terminal_actor || "user",
  });
  if (terminalError) return terminalError;
  if (current?.workflow_type !== "daily_dev") return null;
  const summary = updates.delivery_summary || current.delivery_summary || null;
  const missing: string[] = [];
  const review = updates.review || current.review || null;
  const receiptStatuses = Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : [];
  const hasDoneReceipt = receiptStatuses.some((item: any) => item?.status === "done")
    || current.receipt?.status === "done"
    || updates.receipt?.status === "done";
  const requiresCodeChanges = taskRequiresCodeChanges(current);
  const requiresVerification = taskRequiresVerification(current);
  const actualChangeCount = Number(summary?.actual_file_change_count || current.file_changes?.count || 0);
  const executedVerificationCount = Number(summary?.verification_executed?.length || 0);
  const coordinationPlanCount = Number(summary?.coordination_plan_count || 0);
  const assignmentCount = Number(summary?.assignment_count || 0);
  const workerNotificationCount = Number(summary?.worker_notification_count || 0);

  if (!summary) missing.push("交付摘要");
  if (coordinationPlanCount <= 0) missing.push("主 Agent 协调计划");
  if (assignmentCount <= 0) missing.push("主 Agent 派发证据");
  if (workerNotificationCount <= 0) missing.push("子 Agent 执行结果");
  if (!hasDoneReceipt) missing.push("子 Agent 完成结果说明");
  if (!summary?.has_final_review && !review) missing.push("主 Agent 最终复盘");
  if (requiresCodeChanges && actualChangeCount <= 0) missing.push("系统实际捕获的代码变更");
  if (requiresVerification && executedVerificationCount <= 0) missing.push("已执行验证记录");
  if (Array.isArray(summary?.blockers) && summary.blockers.length > 0) missing.push("未解决阻塞项");
  const blockingNeeds = Array.isArray(summary?.blocking_needs)
    ? summary.blocking_needs
    : (Array.isArray(summary?.needs) ? summary.needs.filter((item: any) => !isAdvisoryNeed(item, current)) : []);
  if (blockingNeeds.length > 0) missing.push("仍需补充事项");
  if (Array.isArray(summary?.verification_failed) && summary.verification_failed.length > 0) missing.push("失败验证记录");
  if (Array.isArray(summary?.verification_suggested) && summary.verification_suggested.length > 0) missing.push("仅建议/未执行验证记录");
  if (requiresVerification && summary?.verification_required_gate_passed === false) missing.push("项目配置验证命令执行证据");
  if (requiresVerification && summary?.verification_source_gate_passed !== true) missing.push("独立外部 Runner 验证来源");
  if (summary?.independent_review_required === true && summary?.independent_review_gate_passed !== true) missing.push("复杂变更独立复核通过");
  if (summary?.post_review_spot_check_required === true && summary?.post_review_spot_check_gate_passed !== true) missing.push("TestAgent 通过后主 Agent 完成前抽查");
  if ((requiresCodeChanges || requiresVerification) && summary?.ack_gate_passed !== true) missing.push("ACK 前置审核通过");
  if ((requiresCodeChanges || requiresVerification) && summary?.receipt_quality_gate_passed !== true) missing.push("高质量子 Agent 结果说明（ACK/动作/文件/验证/契约/记忆声明）");
  if (summary?.contract_injection_gate_passed === false) missing.push("contractChanges 已注入依赖 Agent");
  if (taskRequiresAgentQa(current) && summary?.agent_qa_gate_passed !== true) missing.push("已采纳并完成原会话续跑的 Agent 协作问答");
  if (summary?.work_item_summary?.total && summary.work_item_summary.all_completed !== true) missing.push("执行队列所有工作项完成");
  if (summary?.team_shutdown?.required && summary.team_shutdown.pass !== true) missing.push("团队收尾完成");
  if (summary?.acceptance_gate && summary.acceptance_gate.pass !== true) missing.push("主 Agent 硬验收检查通过");

  if (missing.length === 0) return null;
  return `业务开发任务不能手动标记完成，缺少验收证据：${missing.join("、")}。请通过队列让主 Agent 继续执行，或在任务报告中补齐证据后由系统完成。`;
}

export function buildTaskGapContinuationDraft(task: any) {
  return require("./collaboration-acceptance").buildTaskGapContinuationDraft(task);
}

export function buildTargetedReworkContinuationDraft(task: any, payload: any = {}) {
  const base = buildTaskGapContinuationDraft(task);
  const kind = compactFormText(payload.rework_kind || payload.reworkKind || payload.kind, "targeted_rework");
  const target = compactFormText(payload.target || payload.agent || payload.project, "");
  const reason = compactFormText(payload.reason || payload.detail || payload.message, "");
  const title = compactFormText(payload.title || payload.label, "");
  const workItems = buildMainAgentWorkItems(task, { executions: listExecutions({ taskId: task?.id || "" }) });
  const relatedWorkItems = workItems.filter((item: any) => {
    if (target) return [item.target, item.owner, item.id].some(value => String(value || "").toLowerCase() === target.toLowerCase());
    return ["failed", "blocked", "in_progress"].includes(String(item.status || ""));
  }).slice(0, 6);
  const workItemLines = relatedWorkItems.length ? [
    "",
    "相关执行队列工作项：",
    ...relatedWorkItems.flatMap((item: any) => [
      `- ${item.target || item.owner || item.id}：${item.subject || "未命名工作项"}；状态=${item.status}；attempt=${item.attempt || 1}${item.blockedBy?.length ? `；等待=${item.blockedBy.join("、")}` : ""}`,
      ...(item.evidence?.length ? [`  - 现有证据：${item.evidence.slice(0, 3).join("；")}`] : []),
      ...(item.blockers?.length ? [`  - 阻塞：${item.blockers.slice(0, 3).join("；")}`] : []),
    ]),
  ] : [];
  const kindLabel: any = {
    missing_diff: "缺少真实文件 Diff：只派实现返工",
    missing_verification: "缺少已执行验证：只派验证返工",
    missing_receipt: "缺少子 Agent 结果说明：要求补结构化结果说明",
    missing_goal_review: "目标覆盖不足：主 Agent 重新复盘",
    failed_verification: "验证失败：只修失败点",
    weak_receipt: "结果说明质量不足：要求补接单确认、动作、文件、验证、契约或记忆声明",
    contract_sync: "契约未同步：补结构化 contractChanges",
    contract_inject: "注入契约给依赖 Agent：按 contractChanges 续跑",
    ack_rewrite: "ACK 不合格：先重写接单确认",
  };
  return [
    "【精准返工指令】",
    `返工类型：${kindLabel[kind] || title || kind}`,
    target ? `目标 Agent：${target}` : "",
    reason ? `触发原因：${reason}` : "",
    ...workItemLines,
    "",
    "执行方式：",
    "- 只处理本条精准返工缺口，不要整轮重跑。",
    "- 优先复用原任务、原 Trace、原 native session / scratchpad。",
    "- 如果目标 Agent 明确，优先让同一个 Agent 续跑；如果缺口属于主 Agent 复盘，则主 Agent 先重新规划。",
    "- 完成后必须提交新的 CCM_AGENT_RECEIPT；若涉及接口/字段/schema/类型变化，必须补 contractChanges。",
    "",
    base,
  ].filter(Boolean).join("\n");
}

export function getTaskGapItems(task: any) {
  return require("./collaboration-acceptance").getTaskGapItems(task);
}

export function getTaskGapFingerprint(task: any) {
  return require("./collaboration-acceptance").getTaskGapFingerprint(task);
}

export function isAutomaticGapContinuationSource(source: any) {
  return /(gap_rework|autopilot_gap|watchdog_gap|automatic_gap)/i.test(String(source || ""));
}

export function canAutoContinueTaskGaps(task: any) {
  return require("./collaboration-acceptance").canAutoContinueTaskGaps(task);
}

export function reconcileTaskCollaborationState(task: any, previous: any = {}) {
  return require("./collaboration-task-service").reconcileTaskCollaborationState(task, previous);
}

// ===== merged from collaboration-runtime-runtime-tools-part-02.ts =====

export function hasDailyDevContinuationGaps(task: any) {
  if (!task || task.workflow_type !== "daily_dev") return false;
  if (task.status === "done" && hasStrongTaskAcceptanceEvidence(task, [], task?.delivery_summary || {})) return false;
  if (isTaskPaused(task) || runningTaskIds.has(task.id) || isTaskQueuedInMemory(task.id)) return false;
  const summary = task.delivery_summary || {};
  const hasSummaryGaps = [
    summary.blockers,
    summary.needs,
    summary.verification_required_missing,
    summary.verification_suggested,
    summary.verification_failed,
  ].some((items: any) => Array.isArray(items) && items.length > 0);
  const hasReceiptGaps = [
    ...(Array.isArray(summary.receipts) ? summary.receipts : []),
    ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
  ].some((item: any) => item?.status && item.status !== "done");
  const hasWorkerNotificationGaps = (Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [])
    .some((item: any) => {
      const status = String(item?.status || "").trim();
      const receiptStatus = String(item?.receipt_status || "").trim();
      return ["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status)
        || (!!receiptStatus && receiptStatus !== "done");
    });
  const hasCoordinationEvidenceGaps = Number(summary.coordination_plan_count || 0) <= 0
    || Number(summary.assignment_count || 0) <= 0
    || Number(summary.worker_notification_count || 0) <= 0;
  const hasAgentQaGap = summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true;
  const hasIndependentReviewGap = summary.independent_review_required === true && summary.independent_review_gate_passed !== true;
  const hasPostReviewSpotCheckGap = summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true;
  const hasWeakAcceptanceGap = summary.acceptance_gate_passed === true && !hasStrongTaskAcceptanceEvidence(task, [], summary);
  const hasAckGateGap = (taskRequiresCodeChanges(task) || taskRequiresVerification(task))
    && (summary.ack_gate_passed === false || getTaskAckRewriteRows(task).length > 0);
  const contractInjection = getTaskContractInjectionRows(task);
  const contractGate = evaluateContractInjectionGate(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
  const hasContractInjectionGap = contractGate.required && !contractGate.pass;
  return hasSummaryGaps || hasReceiptGaps || hasWorkerNotificationGaps || hasCoordinationEvidenceGaps || hasAgentQaGap || hasIndependentReviewGap || hasPostReviewSpotCheckGap || hasWeakAcceptanceGap || hasAckGateGap || hasContractInjectionGap;
}

export function taskNeedsUserIntervention(task: any) {
  const summary = task?.delivery_summary || {};
  return task?.status === "failed"
    || isAgentExecutionBlockedPendingTask(task)
    || [
      summary.blockers,
      summary.needs,
      summary.verification_failed,
      summary.verification_required_missing,
      summary.project_policy_violations,
      summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? [summary.independent_review_gate?.reason || "复杂变更缺少独立复核"] : [],
      summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true ? [summary.post_review_spot_check_gate?.reason || "TestAgent 通过后主 Agent 抽查尚未通过"] : [],
    ].some((items: any) => Array.isArray(items) && items.length > 0)
    || [
      ...(Array.isArray(summary.receipts) ? summary.receipts : []),
      ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].some((item: any) => ["failed", "blocked", "partial", "needs_info", "missing_receipt"].includes(String(item?.status || "")));
}

export function getTaskExecutionPhase(task: any) {
  if (task?.status === "done") return hasStrongTaskAcceptanceEvidence(task, [], task?.delivery_summary || {}) ? "done" : "reviewing";
  if (runningTaskIds.has(task?.id) || task?.status === "in_progress") return "running";
  if (taskNeedsUserIntervention(task)) return "blocked";
  if (isTaskQueuedInMemory(task?.id)) return "queued";
  if (task?.status === "pending") return "pending";
  return task?.status || "unknown";
}

function getDashboardWorkerRows(task: any) {
  return require("./collaboration-task-card").getDashboardWorkerRows.apply(null, arguments as any);
}

function getTaskDashboardActions(task: any, phase: string) {
  const actions: any[] = [];
  const recovery = task?.recovery || task?.interruption_receipt?.recovery || {};
  const interruptionReason = String(task?.interruption_receipt?.reason_code || "");
  const transientModelRecovery = task?.acceptance_state === "recovery_required"
    && ["temporary_network", "provider_overload", "provider_unavailable", "model_stream_interrupted"].includes(interruptionReason)
    && task?.interruption_receipt?.recoverable === true;
  if (transientModelRecovery) {
    const safeAutoRecovery = recovery.mode === "safe_auto"
      && ["waiting_provider", "validating", "queued"].includes(String(recovery.state || ""));
    return [
      { id: "resume_interrupted", label: safeAutoRecovery ? "立即重试" : "恢复任务", kind: "resume_interrupted", tone: "primary" },
      { id: "cancel", label: "停止任务", kind: "cancel", tone: "danger" },
    ];
  }
  if (isTaskPaused(task)) {
    actions.push({ id: "resume", label: "继续执行", kind: "resume", tone: "primary" });
  } else if (!["done", "cancelled"].includes(String(task?.status || ""))) {
    actions.push({ id: "pause", label: "暂停", kind: "pause", tone: "outline" });
  }
  if (task?.status !== "done") {
    actions.push({ id: "supplement", label: "补充说明", kind: "continue", tone: "primary" });
    actions.push({ id: "replan", label: "重新规划", kind: "continue", tone: "outline" });
    actions.push({ id: "redispatch", label: "重派", kind: "retry", tone: "outline" });
    actions.push({ id: "switch_executor", label: "换执行器", kind: "switch_executor", tone: "outline" });
  }
  if (hasDailyDevContinuationGaps(task)) {
    actions.push({ id: "gap_continue", label: "按缺口返工", kind: "gap_continue", tone: "warning" });
  }
  if (task?.status === "pending" && !isTaskQueuedInMemory(task?.id) && !isAgentExecutionBlockedPendingTask(task)) {
    actions.push({ id: "queue", label: "加入队列", kind: "queue", tone: "primary" });
  }
  if (task?.delivery_summary) actions.push({ id: "pipeline", label: "协作看板", kind: "view_pipeline", tone: "outline" });
  if (task?.delivery_summary || task?.final_report || task?.result || task?.receipt || task?.review) {
    actions.push({ id: "report", label: "执行报告", kind: "view_report", tone: "outline" });
  }
  if (task?.status !== "done" && canCompleteDailyDevFromDeliverySummary(task, {}, task?.delivery_summary)) {
    actions.push({ id: "confirm_done", label: "人工确认完成", kind: "confirm_done", tone: "success" });
  }
  if (phase === "blocked" && isAgentExecutionBlockedPendingTask(task)) {
    actions.unshift({ id: "probe", label: "复检执行通道", kind: "probe", tone: "warning" });
  }
  if (!["done", "cancelled"].includes(String(task?.status || ""))) {
    actions.push({ id: "cancel", label: "停止任务", kind: "cancel", tone: "danger" });
  }
  return actions;
}

export function buildExecutionDashboard(limit = 12) {
  const tasks = loadTasks()
    .filter((task: any) => !task.archived && !task.deleted_at)
    .slice()
    .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
  const queueStatus = getQueueStatus();
  const phaseCounts: any = { pending: 0, queued: 0, running: 0, blocked: 0, done: 0, failed: 0, unknown: 0 };
  const rows = tasks.map((task: any) => {
    const summary = task.delivery_summary || {};
    const phase = getTaskExecutionPhase(task);
    phaseCounts[phase] = Number(phaseCounts[phase] || 0) + 1;
    const latestPlan = summary.latest_coordination_plan || {};
    const blockers = [
      ...(Array.isArray(summary.blockers) ? summary.blockers : []),
      ...(Array.isArray(summary.needs) ? summary.needs : []),
      ...(Array.isArray(summary.verification_failed) ? summary.verification_failed.map((item: any) => `验证失败：${String(item)}`) : []),
      ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item: any) => `${item?.agent || "未知 Agent"} 缺验证：${Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置命令"}`) : []),
      ...(Array.isArray(summary.project_policy_violations) ? summary.project_policy_violations : []),
      summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? `复杂变更缺少独立复核：${summary.independent_review_gate?.reason || "需要另一个 Agent 复核"}` : "",
    ].filter(Boolean);
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      phase,
      priority: task.priority || "normal",
      workflow_type: task.workflow_type || "",
      assign_type: task.assign_type || "",
      target_project: task.target_project || "",
      group_id: task.group_id || "",
      created_at: task.created_at,
      updated_at: task.updated_at,
      status_detail: task.status_detail || "",
      headline: summary.headline || task.final_report || task.result || "",
      execution_readiness: task.execution_readiness || null,
      main_plan: {
        count: Number(summary.coordination_plan_count || (Array.isArray(summary.coordination_plans) ? summary.coordination_plans.length : 0) || (latestPlan?.phases?.length ? 1 : 0)),
        strategy: latestPlan.strategy || "",
        phases: Array.isArray(latestPlan.phases) ? latestPlan.phases.slice(0, 8) : [],
      },
      assignments: Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.slice(0, 12) : [],
      workers: getDashboardWorkerRows(task),
      evidence: {
        actual_file_change_count: Number(summary.actual_file_change_count || task.file_changes?.count || 0),
        actual_file_changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 12) : [],
        verification_executed: Array.isArray(summary.verification_executed) ? summary.verification_executed.slice(0, 12) : [],
        verification_failed: Array.isArray(summary.verification_failed) ? summary.verification_failed.slice(0, 12) : [],
        verification_required_missing: Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.slice(0, 12) : [],
        has_final_review: !!summary.has_final_review || !!task.review,
        receipt_count: Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0)),
      },
      rework_records: [
        ...(Array.isArray(summary.rework_evidence) ? summary.rework_evidence : []),
        ...(Array.isArray(task.followups) ? task.followups.map((item: any) => ({
          time: item.time,
          source: item.source || "user",
          summary: item.message || item.summary || "用户补充说明",
        })) : []),
      ].slice(0, 12),
      blockers: blockers.slice(0, 12),
      recent_logs: getTaskLogs(task.id, 5),
      actions: getTaskDashboardActions(task, phase),
      raw_task: task,
    };
  });
  const activeRows = rows.filter((item: any) => item.phase !== "done").slice(0, limit);
  const recentDoneRows = rows.filter((item: any) => item.phase === "done").slice(0, Math.max(0, limit - activeRows.length));
  return {
    success: true,
    generated_at: new Date().toISOString(),
    queue_status: queueStatus,
    summary: {
      total: tasks.length,
      active: activeRows.length,
      queued: Number(phaseCounts.queued || 0),
      running: Number(phaseCounts.running || 0),
      blocked: Number(phaseCounts.blocked || 0),
      pending: Number(phaseCounts.pending || 0),
      done: Number(phaseCounts.done || 0),
    },
    phase_counts: phaseCounts,
    items: [...activeRows, ...recentDoneRows],
  };
}

export function continueDailyDevTasksFromGaps(ctx: CollabCtx, options: any = {}) {
  return require("./collaboration-task-service").continueDailyDevTasksFromGaps(ctx, options);
}

export function continueTaskWithMessage(taskId: string, message: string, ctx: CollabCtx, options: any = {}) {
  if (!taskId) return { success: false, status: 400, error: "缺少任务 ID" };
  if (!compactFormText(message, "")) return { success: false, status: 400, error: "请输入补充说明" };

  const tasks = loadTasks();
  const current = tasks.find(t => t.id === taskId);
  if (!current) return { success: false, status: 404, error: "任务不存在" };
  const requestedContinuationKind = String(options.continuation_kind || options.continuationKind || "auto");
  const machineGeneratedContinuation = options.internal === true
    || options.internalContinuation === true
    || /(?:gap_rework|dependency_unlocked|watchdog|autopilot|supervisor|targeted_rework)/i.test(String(options.source || ""));
  const continuationKind = requestedContinuationKind === "auto"
    ? machineGeneratedContinuation ? "supplement" : "new_task"
    : requestedContinuationKind;
  if (continuationKind === "new_task") {
    return { success: false, status: 409, new_task_suggested: true, error: "这条要求看起来是一个独立新任务，请直接在群聊发送，不会混入当前任务。" };
  }
  // 需求 Epic 的执行前计划等待确认时，追加要求必须走「调整计划」重新拆解：
  // 只把文字并入计划书的话，确认时子任务仍按旧的 decomposition_plan 生成，追加内容会被静默丢弃。
  if (current.workflow_type === "requirement_epic" && current.intake_state === "awaiting_confirmation") {
    return {
      success: false,
      status: 409,
      needs_plan_revision: true,
      error: "这个需求 Epic 的执行前计划还在等待确认；请使用确认卡上的「调整计划」提交这条要求，我会带着它重新拆解子任务后再请你确认。",
    };
  }
  const currentlyRunning = runningTaskIds.has(taskId);
  const source = String(options.source || "user");
  const automaticGapContinuation = isAutomaticGapContinuationSource(source);
  const internalContinuation = options.internal === true || options.internalContinuation === true || /dependency_unlocked_next_work_item/i.test(source);
  const gapFingerprint = automaticGapContinuation ? getTaskGapFingerprint(current) : "";
  const gapItems = automaticGapContinuation ? getTaskGapItems(current) : [];
  if (automaticGapContinuation && !canAutoContinueTaskGaps(current)) {
    return {
      success: false,
      status: 409,
      needs_user: true,
      error: "相同交付缺口已经自动返工过一次，但没有出现新的验收证据；请补充业务信息、调整方案或人工选择重试。",
      gap_fingerprint: gapFingerprint,
      gap_items: gapItems,
    };
  }
  const explicitOperationKey = String(options.idempotency_key || options.idempotencyKey || options.request_id || options.requestId || "").trim();
  const automaticOperationKey = automaticGapContinuation && gapFingerprint ? `auto-gap:${gapFingerprint}` : "";
  // 用户追加缺省用消息内容哈希兜底：前端不传幂等键时，双击/HTTP 重试不会重复并入同一条补充。
  const userFollowupOperationKey = !automaticGapContinuation && !internalContinuation
    ? `user-followup:${crypto.createHash("sha1").update(`${continuationKind}:${compactFormText(message, "")}`).digest("hex").slice(0, 16)}`
    : "";
  const operationKey = explicitOperationKey || automaticOperationKey || userFollowupOperationKey;
  const operation = operationKey ? acquireIdempotency({ scope: "task-continue", key: `${taskId}:${operationKey}`, traceId: current.trace_id, leaseMs: 60_000 }) : null;
  if (operation && !operation.acquired) {
    return { success: true, duplicate: true, task: loadTasks().find((item: any) => item.id === taskId) || current, ...(operation.record?.result || {}), trace_id: operation.traceId };
  }

  const resolvesWaitingUser = options.resolve_waiting_user === true
    || options.resolveWaitingUser === true
    || /waiting[_-]?user[_-]?resolution/i.test(source);
  const continuationMeta = {
    rework_kind: compactFormText(options.rework_kind || options.reworkKind || options.continuation_rework_kind || "", ""),
    target: compactFormText(options.target || options.agent || options.project || "", ""),
    reason: compactFormText(options.reason || options.detail || "", ""),
    title: compactFormText(options.title || options.label || "", ""),
    work_item_id: compactFormText(options.work_item_id || options.workItemId || "", ""),
    resolves_waiting_user: resolvesWaitingUser,
  };
  const shouldInterruptCurrentRun = currentlyRunning
    && continuationKind === "revise_goal"
    && options.interrupt_current_run !== false
    && options.interruptCurrentRun !== false;
  const isNextWorkItemContinuation = continuationMeta.rework_kind === "next_claimable_work_item"
    || /next_work_item|user_next_work_item/i.test(`${source} ${continuationMeta.rework_kind}`);
  const continuationDecision = buildContinuationUserDecision({
    source,
    kind: continuationKind,
    meta: { ...continuationMeta, interrupt_current_run: shouldInterruptCurrentRun },
    deferred: currentlyRunning,
  });
  const continuationTitle = continuationDecision.title;
  const continuationDetail = continuationDecision.timeline_detail || continuationDecision.reason || (continuationMeta.target ? `目标：${continuationMeta.target}` : "");
  const followup = {
    time: new Date().toISOString(),
    message: compactFormText(message, ""),
    source,
    kind: continuationKind,
    status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupt_requested" : "queued_for_current_task") : "accepted",
    continuation: {
      ...continuationMeta,
      strategy: continuationDecision.strategy,
      route_label: continuationDecision.route_label,
      replan_required: continuationDecision.replan_required,
      interrupt_current_run: shouldInterruptCurrentRun,
    },
    user_visible: {
      schema: "ccm-main-agent-continuation-status-v1",
      title: continuationDecision.title,
      headline: continuationDecision.headline,
      route_label: continuationDecision.route_label,
      kind_label: continuationDecision.kind_label,
      next_action: continuationDecision.next_action,
    },
  };
  const nextDescription = `${current.description || ""}${buildTaskContinuationBlock(followup.message)}`;
  const previousGap = current.collaboration_state?.gap || {};
  const autoAttempts = automaticGapContinuation
    ? (previousGap.fingerprint === gapFingerprint ? Number(previousGap.auto_attempts || 0) : 0) + 1
    : Number(previousGap.auto_attempts || 0);
  const nextCollaborationState = {
    ...(current.collaboration_state || {}),
    phase: "reworking",
    needs_user: false,
    gap: automaticGapContinuation ? {
      ...previousGap,
      fingerprint: gapFingerprint,
      items: gapItems,
      auto_attempts: autoAttempts,
      last_auto_continue_at: followup.time,
    } : resolvesWaitingUser && Object.keys(previousGap).length ? {
      ...previousGap,
      resolved_at: followup.time,
      resolved_by: source,
    } : previousGap,
    waiting_user_resolution: resolvesWaitingUser ? {
      resolved_at: followup.time,
      source,
      summary: "用户已补充任务所需条件",
    } : current.collaboration_state?.waiting_user_resolution || null,
    last_continuation: {
      source,
      at: followup.time,
      automatic: automaticGapContinuation || internalContinuation,
      kind: continuationKind,
      status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
      strategy: continuationDecision.strategy,
      route_label: continuationDecision.route_label,
      replan_required: continuationDecision.replan_required,
      interrupt_current_run: shouldInterruptCurrentRun,
      ...continuationMeta,
    },
    continuation_events: [
      ...(Array.isArray(current.collaboration_state?.continuation_events) ? current.collaboration_state.continuation_events : []),
      {
        source,
        at: followup.time,
        automatic: automaticGapContinuation || internalContinuation,
        kind: continuationKind,
        status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
        title: continuationTitle,
        detail: continuationDetail,
        strategy: continuationDecision.strategy,
        route_label: continuationDecision.route_label,
        replan_required: continuationDecision.replan_required,
        interrupt_current_run: shouldInterruptCurrentRun,
        ...continuationMeta,
      },
    ].slice(-20),
    goal_revision_interruption: shouldInterruptCurrentRun ? {
      requested: true,
      requested_at: followup.time,
      reason: followup.message,
      source,
      followup_revision: Number(current.followup_revision || 0) + 1,
    } : current.collaboration_state?.goal_revision_interruption || null,
  };
  const updates: any = {
    description: nextDescription,
    followups: automaticGapContinuation || internalContinuation ? (Array.isArray(current.followups) ? current.followups : []) : [...(Array.isArray(current.followups) ? current.followups : []), followup],
    internal_continuations: automaticGapContinuation || internalContinuation ? [...(Array.isArray(current.internal_continuations) ? current.internal_continuations : []), followup].slice(-20) : (Array.isArray(current.internal_continuations) ? current.internal_continuations : []),
    status: currentlyRunning ? "in_progress" : "pending",
    is_paused: false,
    paused: false,
    ...(currentlyRunning ? {} : { result: "", final_report: "" }),
    followup_revision: Number(current.followup_revision || 0) + 1,
    pending_followups: [...(Array.isArray(current.pending_followups) ? current.pending_followups : []), followup].slice(-20),
    status_detail: options.status_detail || (automaticGapContinuation
      ? `已按 ${gapItems.length} 个交付缺口自动返工，等待主 Agent 继续执行`
      : continuationDecision.status_detail),
    collaboration_state: nextCollaborationState,
    last_continue_at: followup.time,
    last_continue_source: followup.source,
    ...(resolvesWaitingUser ? {
      recovery_pending: false,
      waiting_user_resolved_at: followup.time,
      waiting_user_resolution_source: source,
    } : {}),
    ...(internalContinuation ? { last_internal_continue_at: followup.time } : {}),
  };
  if (continuationKind === "revise_goal") {
    updates.business_goal = `${current.business_goal || current.title || ""}\n目标调整：${followup.message}`.trim();
    updates.plan_revision_required = true;
    updates.last_goal_revision_at = followup.time;
  }
  if (current.status === "done") {
    const reopened = reopenTaskAgentSessions(taskId, "用户在同一任务中继续修改，恢复已验收会话");
    updates.reopened_session_count = reopened.length;
  }
  if (automaticGapContinuation) {
    updates.auto_gap_continue_count = Number(current.auto_gap_continue_count || 0) + 1;
    updates.last_auto_gap_continue_at = followup.time;
  }
  // 任何形式的继续/返工都开启新的验收周期：清零本周期轮次，保留累计值。
  // 不清零的话，监工的 gate_gap_rework 重发会让新一轮从上限起步，TestAgent 一失败即 blocked。
  Object.assign(updates, buildReviewCycleResetUpdate(current, `继续任务：${source}`));
  // 用户在计划书给出后继续追加要求：把追加内容并入计划书（新增步骤 + 修订历史）。
  // 等待确认阶段的计划要求重新确认；已执行中的任务并入后继续，不打断执行。
  const awaitingPlanConfirmation = current.intake_state === "awaiting_confirmation";
  const currentPlanMode = automaticGapContinuation || internalContinuation ? null : readTaskPlanMode(current);
  let revisedPlanMode: any = null;
  if (currentPlanMode) {
    const mergedPlanMode = mergeFollowupIntoPlanMode(currentPlanMode, {
      message: followup.message,
      kind: continuationKind,
      source,
      at: followup.time,
      executing: !awaitingPlanConfirmation,
    });
    // 幂等短路时返回原对象，说明同一条反馈已并入过，不再重写计划字段、不再发修订事件。
    if (mergedPlanMode !== currentPlanMode) {
      revisedPlanMode = mergedPlanMode;
      Object.assign(updates, buildPlanRevisionTaskUpdates(current, revisedPlanMode));
      if (awaitingPlanConfirmation) {
        updates.status = "pending";
        updates.auto_execute = false;
        updates.status_detail = "执行前计划已并入你的追加要求，等待你重新确认";
      }
    }
  }
  const task = updateTask(taskId, updates);
  let interruptionResult: any = null;
  if (shouldInterruptCurrentRun) {
    try {
      interruptionResult = requestTaskCancellation(taskId, "用户调整了目标，先停止当前执行轮以重新核对计划", "main-agent-goal-revision");
      addTaskLog(taskId, "warning", "目标调整触发当前执行轮停止；主 Agent 将保留上下文并按新目标重核计划");
      appendTaskTimelineEvent(taskId, {
        type: "task_goal_revision_interrupt",
        title: "已停止当前执行轮以重核计划",
        detail: "用户调整了目标边界，主 Agent 正在停止可能跑偏的执行轮。",
        status: "warn",
        phase: "rework",
        agent: continuationMeta.target || "coordinator",
        data: { source, kind: continuationKind, interruption: interruptionResult },
      });
    } catch (error: any) {
      interruptionResult = { success: false, error: String(error?.message || error || "停止当前执行轮失败") };
      addTaskLog(taskId, "warning", `目标调整尝试停止当前执行轮失败：${interruptionResult.error}`);
    }
  }
  addTaskLog(taskId, "info", automaticGapContinuation
    ? `按交付缺口自动继续（${gapFingerprint}）：${gapItems.join("、").slice(0, 300)}`
    : internalContinuation
      ? `前置完成后自动接上下一步工作项：${followup.message.slice(0, 300)}`
      : `任务补充说明并继续执行：${followup.message.slice(0, 300)}`);
  appendTaskTimelineEvent(taskId, {
    type: automaticGapContinuation ? "auto_gap_rework" : continuationDecision.timeline_type || (isNextWorkItemContinuation ? "next_work_item_dispatch" : /targeted|gap_rework|rework/i.test(source) ? "targeted_rework" : "task_continuation"),
    title: continuationTitle,
    detail: compactMemoryText(continuationDetail || "我已复用同一任务上下文继续处理。", 260),
    status: "active",
    phase: "rework",
    agent: continuationMeta.target || "",
    data: { source, kind: continuationKind, rework_kind: continuationMeta.rework_kind, work_item_id: continuationMeta.work_item_id },
  });
  if (revisedPlanMode) {
    const revisionSummary = summarizePlanRevisionForUser(revisedPlanMode, { executing: !awaitingPlanConfirmation });
    addTaskLog(taskId, "info", revisionSummary);
    appendTaskTimelineEvent(taskId, {
      type: "plan_mode_followup_merged",
      title: awaitingPlanConfirmation ? "追加要求已并入执行前计划，等待重新确认" : "追加要求已并入计划书",
      detail: compactMemoryText(revisionSummary, 260),
      status: awaitingPlanConfirmation ? "warning" : "active",
      phase: "planning",
      agent: continuationMeta.target || "coordinator",
      data: { revision_count: revisedPlanMode.revision_count, step_id: revisedPlanMode.plan_revisions?.[revisedPlanMode.plan_revisions.length - 1]?.step_id || "", same_task_trace: true },
    });
  }

  // 补充说明已落盘；后续消息广播/入队若抛错，必须结算幂等记录再上抛，
  // 否则重试在租约期内会拿到 duplicate:true 的假成功，掩盖真实失败。
  try {
    if (task?.assign_type === "group" && task.group_id && !automaticGapContinuation && !internalContinuation && options.append_group_message !== false && options.appendGroupMessage !== false) {
      const group = loadGroups().find(g => g.id === task.group_id);
      const target = group ? getCoordinatorMember(group).project : "coordinator";
      appendGroupMessage(task.group_id, {
        id: "m" + Date.now().toString(36) + "cont" + crypto.randomBytes(2).toString("hex"),
        role: "user",
        target,
        content: `任务补充说明：${followup.message}`,
        timestamp: followup.time,
        task_id: taskId,
      });
      safeAddGroupLog(task.group_id, "info", "task", `任务收到补充说明并继续执行: ${task.title}`, { task_id: taskId });
    } else if (task?.assign_type === "group" && task.group_id && automaticGapContinuation) {
      updateGroupTaskInlineStatus(task, "pending", `已自动按 ${gapItems.length} 个交付缺口返工，不新增重复消息`);
      safeAddGroupLog(task.group_id, "info", "task", `任务按相同卡片继续返工: ${task.title}`, { task_id: taskId, gap_fingerprint: gapFingerprint, gap_items: gapItems });
    } else if (task?.assign_type === "group" && task.group_id && internalContinuation) {
      updateGroupTaskInlineStatus(task, "pending", "前置工作已完成，我已自动接上下一步派发");
      safeAddGroupLog(task.group_id, "info", "task", `任务前置完成后自动接续下一步: ${task.title}`, { task_id: taskId, work_item_id: continuationMeta.work_item_id });
    }

    let queueResult = null;
    // 计划仍在等待确认时，追加要求只修订计划书，不得启动执行；确认门槛保留给用户。
    if (!currentlyRunning && !awaitingPlanConfirmation && options.auto_execute !== false && options.autoExecute !== false) {
      queueResult = enqueueTask(taskId, ctx);
    }
    const userStatus = buildUserContinuationStatus(task, task?.status || "");
    const planRevisionText = revisedPlanMode ? summarizePlanRevisionForUser(revisedPlanMode, { executing: !awaitingPlanConfirmation }) : "";
    const result = {
      success: true,
      task,
      message: followup.message,
      friendly_text: awaitingPlanConfirmation && planRevisionText ? planRevisionText : userStatus?.headline || continuationDecision.headline,
      next_action: awaitingPlanConfirmation && revisedPlanMode ? "请在任务卡上重新确认调整后的执行前计划" : userStatus?.next_action || continuationDecision.next_action,
      plan_revision: revisedPlanMode ? {
        revision_count: revisedPlanMode.revision_count,
        revision_status: revisedPlanMode.revision_status,
        summary: planRevisionText,
        awaiting_reconfirmation: awaitingPlanConfirmation,
      } : null,
      user_status: userStatus,
      interruption: interruptionResult,
      queued: !!queueResult?.queued,
      deferred: currentlyRunning,
      interrupted_current_run: shouldInterruptCurrentRun,
      same_task_trace: true,
      continuation_kind: continuationKind,
      trace_id: task?.trace_id || current.trace_id || "",
      queue_result: queueResult,
      queue_status: getQueueStatus(),
    };
    // 幂等结果存下用户可见字段，重放响应与首次响应形状一致（不存整个 task，重放时重新加载）。
    if (operationKey) completeIdempotency("task-continue", `${taskId}:${operationKey}`, {
      task_id: taskId,
      queued: result.queued,
      followup_time: followup.time,
      friendly_text: result.friendly_text,
      next_action: result.next_action,
      plan_revision: result.plan_revision,
      deferred: result.deferred,
      continuation_kind: continuationKind,
    });
    return result;
  } catch (error: any) {
    if (operationKey) failIdempotency("task-continue", `${taskId}:${operationKey}`, error);
    throw error;
  }
}

export function retryTask(id: string, ctx: CollabCtx, reason = "", autoExecute = true) {
  return require("./collaboration-task-service").retryTask(id, ctx, reason, autoExecute);
}
