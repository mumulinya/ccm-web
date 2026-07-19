// Behavior-freeze split from collaboration-agent-probes.ts (part 2/2).

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
  AGENT_PROBE_FAILURE_BLOCK_MS,
  AGENT_PROBE_STATUS_FILE,
  AGENT_PROBE_SUCCESS_FRESH_MS,
  AGENT_RECOVERY_PROBE_INTERVAL_MS,
  agentRecoveryMonitorTimer,
  agentRecoveryProbeInFlight,
  buildAgentExecutionFixActions,
  buildAgentProbeMatrix,
  buildDailyDevWorkflowRehearsal,
  createDiagnosticCheck,
  doesProbeMatchTaskTarget,
  doesProbeTargetMatchRequired,
  getAgentProbeTargetStatusFile,
  getAgentRecoveryWorkSummary,
  getAgentRuntimeConsistencyStatus,
  getChildProcessCapability,
  getClaudeLocalGatewayReadiness,
  getDailyDevCompletionGateSelfTest,
  getDailyDevSmokeStatus,
  getExternalAgentRunnerStatus,
  getProbeTargetLabel,
  getProjectAgentCapabilityProfile,
  getProjectVerificationHintDetail,
  getQueueStatus,
  getTaskGroupAgentProbeReadiness,
  getTaskRequiredProbeTarget,
  getTaskWatchdogStatus,
  getWorkDirState,
  hasDailyDevContinuationGaps,
  listAgentProbeTargetStatuses,
  normalizeAgentProbeTarget,
  readAgentProbeStatusFile,
  runCollaborationProtocolSelfTest,
  runCollaborationUxSelfTest,
  runCoordinatorReworkProtocolSelfTest,
  runCronDailyDevProtocolSelfTestSafe,
  runGroupMainAgentActionRegistrySelfTest,
  runGroupMainAgentToolLoopSelfTest,
  taskRequiresFreshAgentProbe,
  uniqueStrings,
} from "./collaboration";

import {
  readAgentProbeStatus,
  getAgentProbeHealth,
  getAgentExecutionReadiness,
} from "./collaboration-agent-probes-part-01";

export function taskNeedsGroupWideAgentProbe(task: any) {
  if (!taskRequiresFreshAgentProbe(task)) return false;
  const required = getTaskRequiredProbeTarget(task);
  const assignType = String(task?.assign_type || task?.assignType || "").trim();
  return !!required.groupId && !required.project && (!assignType || assignType === "group");
}

export function summarizeAgentProbeTargets(targets: any[], probeResolver: any = readAgentProbeStatus) {
  const rows = (targets || []).map((target: any) => {
    const runtimeCandidates = buildRuntimeRecoveryCandidates(target.agent_type || "claudecode");
    const candidates = runtimeCandidates.map((agentType: any) => {
      const candidateTarget = { ...target, agent_type: agentType };
      const candidateProbe = probeResolver(candidateTarget);
      const candidateHealth = getAgentProbeHealth(candidateProbe);
      const candidateWriteReady = target.requires_write === false || candidateProbe?.capabilities?.write?.pass === true;
      return { agentType, probe: candidateProbe, probeHealth: candidateHealth, writeReady: candidateWriteReady, ready: candidateHealth.successFresh === true && doesProbeTargetMatchRequired(candidateProbe?.target, candidateTarget) && candidateWriteReady };
    });
    const selected = candidates.find((item: any) => item.ready) || candidates[0];
    const probe = selected?.probe;
    const probeHealth = selected?.probeHealth || getAgentProbeHealth(probe);
    const writeReady = selected?.writeReady === true;
    return {
      ...target,
      effective_agent_type: selected?.agentType || target.agent_type,
      fallback_active: !!selected?.ready && selected?.agentType !== target.agent_type,
      runtime_candidates: candidates.map((item: any) => ({ agent_type: item.agentType, ready: item.ready, probe_status: item.probeHealth?.status || "missing" })),
      probe,
      probeHealth,
      writeReady,
      ready: selected?.ready === true,
    };
  });
  const readyRows = rows.filter((row: any) => row.ready);
  const missingRows = rows.filter((row: any) => row.probeHealth?.status === "missing");
  const staleRows = rows.filter((row: any) => row.probeHealth?.status === "stale_ok" || row.probeHealth?.status === "stale_failed");
  const failedRows = rows.filter((row: any) => row.probeHealth?.failureRecent);
  return {
    total: rows.length,
    ready: readyRows.length,
    missing: missingRows.length,
    stale: staleRows.length,
    failed_recent: failedRows.length,
    allReady: rows.length > 0 && readyRows.length === rows.length,
    rows,
  };
}

export function enforceTaskAgentProbeReadiness(task: any, readiness: any) {
  if (!taskRequiresFreshAgentProbe(task)) return readiness;
  const groupReadiness = getTaskGroupAgentProbeReadiness(task);
  if (groupReadiness) {
    return {
      ...readiness,
      ready: groupReadiness.ready,
      mode: groupReadiness.ready ? readiness.mode : "agent-cli-probe-required",
      message: groupReadiness.message,
      fix_actions: groupReadiness.ready ? [] : uniqueStrings([
        ...groupReadiness.fix_actions,
        ...(Array.isArray(readiness.fix_actions) ? readiness.fix_actions : []),
      ]).slice(0, 6),
      groupProbeReadiness: groupReadiness,
    };
  }
  if (!readiness.ready) return readiness;
  const probeHealth = readiness.probeHealth || getAgentProbeHealth(readiness.probe);
  const probeMatchesTarget = doesProbeMatchTaskTarget(readiness.probe, task);
  if (probeHealth?.successFresh && probeMatchesTarget) return readiness;
  const requiredTarget = getTaskRequiredProbeTarget(task);
  const targetHint = requiredTarget.groupId || requiredTarget.project || requiredTarget.agentType
    ? `目标：${[requiredTarget.groupId, requiredTarget.project, requiredTarget.agentType].filter(Boolean).join(" / ")}；当前探针：${getProbeTargetLabel(readiness.probe)}；`
    : "";
  const mismatchHint = probeHealth?.successFresh && !probeMatchesTarget ? "已有新鲜探针但目标不匹配；" : "";
  const message = `daily_dev 任务需要先通过目标项目 Agent CLI 真实探针：${targetHint}${mismatchHint}${probeHealth?.message || "尚未复检模型 CLI/API 连通性"}`;
  return {
    ...readiness,
    ready: false,
    mode: "agent-cli-probe-required",
    message,
    fix_actions: uniqueStrings([
      "在设置页点击“复检执行通道”，让系统实际调用目标子 Agent CLI 并确认模型 API 可用",
      ...(Array.isArray(readiness.fix_actions) ? readiness.fix_actions : []),
      "探针通过后再创建真实试运行任务或恢复 daily_dev 队列",
    ]).slice(0, 6),
    probeHealth,
  };
}

export function getTaskAgentExecutionReadiness(task: any) {
  return enforceTaskAgentProbeReadiness(task, getAgentExecutionReadiness(getTaskRequiredProbeTarget(task)));
}

export function buildDailyDevAgentDiagnostics() {
  const checks: any[] = [];
  const config = loadOrchestratorConfig();
  const publicConfig = publicOrchestratorConfig(config);
  const groups = loadGroups();
  const configs = getConfigs();
  const tasks = loadTasks();
  const cronJobs = loadCronJobs();
  const enabledCronJobs = cronJobs.filter((job: any) => job?.enabled !== false);
  const autoTasks = tasks.filter((task: any) => task?.auto_execute);
  const devGroups = groups.map((group: any) => {
    const normalized = normalizeGroupOrchestrator(group);
    const coordinator = getCoordinatorMember(normalized);
    const routableMembers = getRoutableMembers(normalized);
    const backlogFiles = Array.isArray(normalized.shared_files)
      ? normalized.shared_files.filter((file: any) => isDailyDevBacklogFile(file))
      : [];
    const backlogCounts = backlogFiles.reduce((acc: any, file: any) => {
      const status = readDailyDevBacklogStatus(file) || "unknown";
      acc[status] = Number(acc[status] || 0) + 1;
      return acc;
    }, {});
    const members = routableMembers.map((member: any) => {
      const runtime = resolveMemberRuntime(member.project, normalized, configs);
      const workDirState = runtime?.workDir ? getWorkDirState(runtime.workDir) : null;
      const verification = getProjectVerificationHintDetail(member.project, workDirState?.path || runtime?.workDir || "");
      return {
        project: member.project,
        role: member.role || "member",
        configured: !!runtime,
        agentType: runtime?.agentType || member.agent || "",
        workDir: runtime?.workDir || "",
        workDirExists: !!workDirState?.exists,
        workDirWritable: !!workDirState?.writable,
        verification,
      };
    });
    const readyMembers = members.filter((member: any) => member.configured && member.workDirExists && member.workDirWritable);
    return {
      id: normalized.id,
      name: normalized.name || normalized.id,
      orchestratorEnabled: normalized.orchestrator?.enabled !== false,
      coordinator: coordinator.project,
      sharedFiles: Array.isArray(normalized.shared_files) ? normalized.shared_files.length : 0,
      backlogFiles: backlogFiles.length,
      readyBacklogs: Number(backlogCounts.ready || 0),
      backlogCounts,
      memberCount: members.length,
      readyMemberCount: readyMembers.length,
      members,
    };
  });
  const groupsWithReadyMembers = devGroups.filter((group: any) => group.orchestratorEnabled && group.readyMemberCount > 0);
  const agentProbeMatrix = buildAgentProbeMatrix(devGroups);
  const dailyDevCronJobs = enabledCronJobs.filter((job: any) => job?.workflow_type === "daily_dev" || job?.workflowType === "daily_dev" || job?.daily_dev || job?.dailyDev);

  const llmConfigured = !!(config.enabled && String(config.apiUrl || "").trim() && String(config.apiKey || "").trim() && String(config.model || "").trim());
  checks.push(createDiagnosticCheck(
    "orchestrator-config",
    "主 Agent 大模型",
    llmConfigured ? "ok" : (config.fallbackToRules ? "warn" : "fail"),
    llmConfigured
      ? `已配置 ${publicConfig.model}，可由 LLM 主 Agent 理解业务描述并拆分任务`
      : (config.fallbackToRules ? "LLM 配置不完整，会降级到规则主 Agent；可工作但理解复杂业务会变弱" : "LLM 配置不完整，主 Agent 不会自动分派子 Agent"),
    { enabled: publicConfig.enabled, apiUrl: publicConfig.apiUrl, model: publicConfig.model, hasKey: publicConfig.hasKey, fallbackToRules: publicConfig.fallbackToRules }
  ));

  const coordinatorProtocol = runCoordinatorProtocolSelfTest();
  checks.push(createDiagnosticCheck(
    "coordinator-protocol",
    "主 Agent 协调协议",
    coordinatorProtocol.pass ? "ok" : "fail",
    coordinatorProtocol.pass
      ? `规则主 Agent 可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划，按 ${coordinatorProtocol.executionOrder || "parallel"} 派发 ${coordinatorProtocol.assignmentCount} 个自包含子 Agent 工作单；策略：${coordinatorProtocol.coordinationStrategy || coordinatorProtocol.coordinationPlan?.strategy || "未声明"}`
      : "规则主 Agent 未能稳定生成计划、派发和自包含子 Agent 工作单",
    coordinatorProtocol
  ));

  const runtimeKernel = runAgentRuntimeKernelSelfTest();
  checks.push(createDiagnosticCheck(
    "agent-runtime-kernel",
    "Agent 运行时内核",
    runtimeKernel.pass ? "ok" : "fail",
    runtimeKernel.pass
      ? "统一 lifecycle、权限规则、上下文预算、WorkerContextPacket、contract injection 和 Trace Replay 自测通过"
      : "Agent 运行时内核自测未通过，需检查 lifecycle/packet/replay 输出",
    runtimeKernel
  ));

  const workerHandoff = runWorkerHandoffSelfTest();
  checks.push(createDiagnosticCheck(
    "worker-handoff-packet",
    "子 Agent 自包含工作单",
    workerHandoff.pass ? "ok" : "fail",
    workerHandoff.pass
      ? "子 Agent 工作单会包含用户目标、允许/禁止范围、依赖、验证、ACK 和结构化回执要求"
      : "子 Agent 自包含工作单缺少目标、范围、验证、ACK 或回执要求",
    workerHandoff
  ));

  const reworkProtocol = runCoordinatorReworkProtocolSelfTest();
  checks.push(createDiagnosticCheck(
    "coordinator-rework-protocol",
    "主 Agent 返工协议",
    reworkProtocol.pass ? "ok" : "fail",
    reworkProtocol.pass
      ? "主 Agent 验收发现缺口时，会生成自包含返工工作单并要求子 Agent 再次回执"
      : "主 Agent 返工工作单缺少轮次、原始需求、初始计划、验证或回执要求",
    reworkProtocol
  ));

  const collaborationProtocol = runCollaborationProtocolSelfTest();
  const workerProtocolPass = !!(
    collaborationProtocol.pass
    && Object.values(collaborationProtocol.taskNotificationChecks || {}).every(Boolean)
    && Object.values(collaborationProtocol.scratchpadChecks || {}).every(Boolean)
  );
  checks.push(createDiagnosticCheck(
    "worker-notification-scratchpad",
    "Worker 通知与协作 scratchpad",
    workerProtocolPass ? "ok" : "fail",
    workerProtocolPass
      ? "子 Agent 输出会封装为 task-notification，缺回执可触发返工，并写入协作 scratchpad 供后续 Worker 复用"
      : "Worker 通知、缺回执门禁或协作 scratchpad 自测未通过",
    {
      taskNotificationChecks: collaborationProtocol.taskNotificationChecks || {},
      scratchpadChecks: collaborationProtocol.scratchpadChecks || {},
      structuredAssignmentChecks: collaborationProtocol.structuredAssignmentChecks || {},
    }
  ));

  checks.push(createDiagnosticCheck(
    "project-configs",
    "项目 Agent 配置",
    configs.length > 0 ? "ok" : "fail",
    configs.length > 0 ? `已发现 ${configs.length} 个项目配置` : "未发现项目配置，子 Agent 没有可执行仓库",
    configs.map((configItem: any) => ({ name: configItem.name, file: configItem.file }))
  ));

  checks.push(createDiagnosticCheck(
    "groups",
    "开发群聊",
    groupsWithReadyMembers.length > 0 ? "ok" : "fail",
    groupsWithReadyMembers.length > 0
      ? `已有 ${groupsWithReadyMembers.length} 个群聊可由主 Agent 派发给子 Agent`
      : "没有可用的开发群聊；需要创建群聊并加入至少一个已配置项目 Agent",
    devGroups
  ));

  const invalidMembers = devGroups.flatMap((group: any) =>
    group.members
      .filter((member: any) => !member.configured || !member.workDirExists || !member.workDirWritable)
      .map((member: any) => ({ group: group.name, ...member }))
  );
  checks.push(createDiagnosticCheck(
    "member-runtime",
    "子 Agent 可执行目录",
    invalidMembers.length === 0 && groupsWithReadyMembers.length > 0 ? "ok" : (groupsWithReadyMembers.length > 0 ? "warn" : "fail"),
    invalidMembers.length === 0 && groupsWithReadyMembers.length > 0
      ? "所有群聊子 Agent 都能解析到可读写工作目录"
      : (groupsWithReadyMembers.length > 0 ? `${invalidMembers.length} 个子 Agent 的项目配置或工作目录需要检查` : "还没有可验证的子 Agent 工作目录"),
    invalidMembers
  ));

  const readyMembersForVerification = devGroups.flatMap((group: any) =>
    group.members
      .filter((member: any) => member.configured && member.workDirExists && member.workDirWritable)
      .map((member: any) => ({ group: group.name, ...member }))
  );
  const projectAgentProfiles = readyMembersForVerification.map((member: any) => ({
    group: member.group,
    project: member.project,
    profile: getProjectAgentCapabilityProfile(member.project, member.workDir || ""),
  }));
  const incompleteProjectAgentProfiles = projectAgentProfiles.filter((item: any) => {
    const profile = item.profile || {};
    return !profile.responsibility || !profile.capabilities?.length || !profile.delivery_contract;
  });
  checks.push(createDiagnosticCheck(
    "project-agent-capabilities",
    "项目 Agent 能力边界",
    incompleteProjectAgentProfiles.length === 0 && projectAgentProfiles.length > 0 ? "ok" : (projectAgentProfiles.length > 0 ? "warn" : "fail"),
    projectAgentProfiles.length === 0
      ? "还没有可检查能力边界的可执行子 Agent"
      : incompleteProjectAgentProfiles.length === 0
        ? "可执行子 Agent 均配置了职责、能力标签和交付规范；路径门禁按项目配置启用"
        : `${incompleteProjectAgentProfiles.length} 个可执行子 Agent 缺少职责、能力标签或交付规范；可在项目管理 -> 项目工具配置中填写`,
    {
      total: projectAgentProfiles.length,
      incomplete: incompleteProjectAgentProfiles.length,
      members: projectAgentProfiles.map((item: any) => ({
        group: item.group,
        project: item.project,
        responsibility: item.profile.responsibility,
        capabilities: item.profile.capabilities,
        writable_paths: item.profile.writable_paths,
        forbidden_paths: item.profile.forbidden_paths,
        has_delivery_contract: !!item.profile.delivery_contract,
      })),
    }
  ));

  const missingVerificationMembers = readyMembersForVerification.filter((member: any) => member.verification?.source === "missing");
  const configuredVerificationMembers = readyMembersForVerification.filter((member: any) => member.verification?.source === "configured");
  const inferredVerificationMembers = readyMembersForVerification.filter((member: any) => member.verification?.source === "inferred");
  checks.push(createDiagnosticCheck(
    "project-verification",
    "项目验证命令",
    missingVerificationMembers.length === 0 && readyMembersForVerification.length > 0 ? "ok" : (readyMembersForVerification.length > 0 ? "warn" : "fail"),
    readyMembersForVerification.length === 0
      ? "还没有可检查验证命令的可执行子 Agent"
      : missingVerificationMembers.length === 0
        ? `可执行子 Agent 均有验证命令：${configuredVerificationMembers.length} 个手动配置，${inferredVerificationMembers.length} 个自动推断`
        : `${missingVerificationMembers.length} 个可执行子 Agent 缺少验证命令；可在项目管理 -> 项目工具配置中填写`,
    {
      total: readyMembersForVerification.length,
      configured: configuredVerificationMembers.length,
      inferred: inferredVerificationMembers.length,
      missing: missingVerificationMembers.length,
      members: readyMembersForVerification.map((member: any) => ({
        group: member.group,
        project: member.project,
        source: member.verification?.source || "missing",
        commands: member.verification?.commands || [],
      })),
    }
  ));

  const runtimeConsistency = getAgentRuntimeConsistencyStatus();
  checks.push(createDiagnosticCheck(
    "agent-runtime-consistency",
    "项目 Agent 执行器映射",
    runtimeConsistency.pass ? "ok" : "fail",
    runtimeConsistency.pass
      ? `所有可配置项目 Agent 都有对应执行器：${runtimeConsistency.agents.map((agent: any) => agent.type).join("、")}`
      : `存在可配置但不可执行的项目 Agent：${runtimeConsistency.missing.map((agent: any) => agent.type).join("、")}`,
    runtimeConsistency
  ));

  const childProcessCapability = getChildProcessCapability();
  const externalRunnerStatus = getExternalAgentRunnerStatus();
  const probeStatus = readAgentProbeStatus();
  const probeHealth = getAgentProbeHealth(probeStatus);
  const executionReadiness = getAgentExecutionReadiness();
  const runnerLastFailure = externalRunnerStatus.last_result?.success === false;
  const runnerRecentFailure = runnerLastFailure
    && Number(externalRunnerStatus.last_result?.age_ms || 0) < 15 * 60 * 1000;
  const runnerFailureBlocks = runnerLastFailure && (!externalRunnerStatus.active || runnerRecentFailure);
  const agentProcessReady = executionReadiness.ready === true;
  const dailyDevExecutionReady = Number(agentProbeMatrix.group_ready || 0) > 0;
  const matrixReadinessMessage = agentProbeMatrix.executable > 0
    ? `daily_dev 群聊接单需要至少一个开发群聊的所有可执行项目 Agent 通过真实 CLI 探针：当前全员通过 ${agentProbeMatrix.group_ready}/${agentProbeMatrix.group_total} 个群聊，项目探针通过 ${agentProbeMatrix.ready}/${agentProbeMatrix.executable}，未复检 ${agentProbeMatrix.missing}，过期 ${agentProbeMatrix.stale}，最近失败 ${agentProbeMatrix.failed_recent}`
    : "daily_dev 需要先配置至少一个具备可写工作目录的项目 Agent";
  const baseDailyDevReadiness = enforceTaskAgentProbeReadiness({ workflow_type: "daily_dev" }, executionReadiness);
  const dailyDevExecutionReadiness = dailyDevExecutionReady
    ? {
      ready: true,
      mode: "group-target-agent-cli-probe",
      message: `已有 ${agentProbeMatrix.group_ready}/${agentProbeMatrix.group_total} 个开发群聊的可执行项目 Agent 全员通过真实 CLI 探针`,
      probe_matrix: agentProbeMatrix,
    }
    : {
      ...baseDailyDevReadiness,
      message: matrixReadinessMessage,
      probe_matrix: agentProbeMatrix,
    };
  const executionFixActions = agentProcessReady ? [] : (executionReadiness.fix_actions || buildAgentExecutionFixActions({
    error: externalRunnerStatus.last_result?.error || externalRunnerStatus.last_result?.output || probeStatus?.message || childProcessCapability.error || childProcessCapability.stderr || "",
    childProcess: childProcessCapability,
    externalRunner: externalRunnerStatus,
    probe: probeStatus,
  }));
  checks.push(createDiagnosticCheck(
    "agent-process",
    "Agent CLI 进程能力",
    agentProcessReady ? "ok" : "fail",
    executionReadiness.mode === "agent-cli-probe-failed"
      ? executionReadiness.message
      : childProcessCapability.ok
      ? executionReadiness.message
      : (runnerFailureBlocks
        ? `外部 Agent Runner 最近执行 ${externalRunnerStatus.last_result?.command || "Agent CLI"} 失败：${externalRunnerStatus.last_result?.error || "未知错误"}；${externalRunnerStatus.last_result?.hint || "请检查子 Agent CLI"}`
        : (externalRunnerStatus.active
        ? `Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行`
        : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcessCapability.error || childProcessCapability.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`)),
    { childProcess: childProcessCapability, externalRunner: externalRunnerStatus, probe: probeStatus, probeHealth, readiness: executionReadiness, fix_actions: executionFixActions, runtimes: getPublicAgentRuntimes() }
  ));

  checks.push(createDiagnosticCheck(
    "agent-cli-probe",
    "Agent CLI 连通探针",
    agentProbeMatrix.ready > 0 ? "ok" : (agentProbeMatrix.executable > 0 ? "warn" : "fail"),
    agentProbeMatrix.ready > 0
      ? `已有 ${agentProbeMatrix.ready}/${agentProbeMatrix.executable} 个项目 Agent 探针新鲜通过`
      : (agentProbeMatrix.executable > 0 ? `尚无项目 Agent 探针新鲜通过：${probeHealth.message}` : "没有可执行的项目 Agent 可运行探针"),
    {
      probe: probeStatus,
      probeHealth,
      probeMatrix: agentProbeMatrix,
      fresh_success_ms: AGENT_PROBE_SUCCESS_FRESH_MS,
      failure_block_ms: AGENT_PROBE_FAILURE_BLOCK_MS,
      fix_actions: probeHealth.failureRecent ? executionFixActions : [],
    }
  ));

  checks.push(createDiagnosticCheck(
    "daily-dev-execution-readiness",
    "daily_dev 执行准入",
    dailyDevExecutionReady ? "ok" : "fail",
    dailyDevExecutionReady
      ? "daily_dev 任务已具备真实执行准入：至少一个开发群聊的可执行项目 Agent 已全员通过真实 CLI 探针"
      : matrixReadinessMessage,
    {
      readiness: dailyDevExecutionReadiness,
      required: ["fresh_target_agent_cli_probe"],
      probeMatrix: agentProbeMatrix,
      fix_actions: dailyDevExecutionReadiness.fix_actions || [],
    }
  ));

  const queueStatus = getQueueStatus();
  checks.push(createDiagnosticCheck(
    "task-queue",
    "任务队列",
    "ok",
    `队列接口可用：${queueStatus.total_queued} 个排队，${queueStatus.running_targets} 个目标执行中`,
    queueStatus
  ));

  const watchdogStatus = getTaskWatchdogStatus();
  const watchdogRecoverable = watchdogStatus.stale_pending.length + watchdogStatus.stalled_in_progress.length;
  const runtimeRecoverable = watchdogStatus.runtime_failed.length;
  const gapReworkRecoverable = watchdogStatus.gap_rework.length;
  checks.push(createDiagnosticCheck(
    "task-watchdog",
    "任务看门狗",
    watchdogRecoverable > 0 || runtimeRecoverable > 0 || gapReworkRecoverable > 0 ? "warn" : "ok",
    watchdogRecoverable > 0 || runtimeRecoverable > 0 || gapReworkRecoverable > 0
      ? `发现 ${watchdogRecoverable} 个卡住自动任务、${runtimeRecoverable} 个执行通道失败任务、${gapReworkRecoverable} 个可按缺口续跑任务；当前为手动恢复模式`
      : "自动任务看门狗可用，当前没有检测到卡住的可恢复任务",
    { ...watchdogStatus, auto_recovery: /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_TASK_WATCHDOG_RECOVERY || "")) }
  ));

  const recoveryWork = getAgentRecoveryWorkSummary();
  checks.push(createDiagnosticCheck(
    "agent-recovery-monitor",
    "执行通道恢复监控",
    recoveryWork.total > 0 ? "warn" : "ok",
    recoveryWork.total > 0
      ? `${agentRecoveryMonitorTimer ? "自动恢复监控已启动" : "手动复检模式"}：发现 ${recoveryWork.blocked_pending.length} 个等待执行通道的任务、${recoveryWork.runtime_failed.length} 个可重试失败任务`
      : `${agentRecoveryMonitorTimer ? "自动恢复监控已启动" : "手动复检模式"}，当前没有等待执行通道恢复的自动任务`,
    {
      active: !!agentRecoveryMonitorTimer,
      probe_in_flight: agentRecoveryProbeInFlight,
      interval_ms: AGENT_RECOVERY_PROBE_INTERVAL_MS,
      work: recoveryWork,
    }
  ));

  checks.push(createDiagnosticCheck(
    "cron-dispatch",
    "定时派发",
    enabledCronJobs.length > 0 ? "ok" : "warn",
    enabledCronJobs.length > 0
      ? `已启用 ${enabledCronJobs.length} 个定时任务，可自动创建开发任务`
      : "暂无启用中的定时任务；需要自动接活时可在定时任务页创建",
    { total: cronJobs.length, enabled: enabledCronJobs.length }
  ));

  const cronDailyDevProtocol = runCronDailyDevProtocolSelfTestSafe();
  checks.push(createDiagnosticCheck(
    "cron-daily-dev-protocol",
    "定时业务开发协议",
    cronDailyDevProtocol.pass ? "ok" : "fail",
    cronDailyDevProtocol.pass
      ? "daily_dev 定时任务会创建群聊主 Agent 任务，并把定时提示词写入任务级业务/接口文档"
      : "daily_dev 定时任务未能稳定生成主 Agent 闭环任务或缺少任务级文档",
    cronDailyDevProtocol
  ));

  checks.push(createDiagnosticCheck(
    "receipt-gate",
    "完成结果说明验收",
    "ok",
    "子 Agent 输出必须包含结构化结果说明，队列会按结构化结果说明和主 Agent 复盘判定完成",
    { autoTaskCount: autoTasks.length }
  ));

  const dailyDevGateSelfTest = getDailyDevCompletionGateSelfTest();
  checks.push(createDiagnosticCheck(
    "daily-dev-completion-gate",
    "业务开发完成门禁",
    dailyDevGateSelfTest.pass ? "ok" : "fail",
    dailyDevGateSelfTest.pass
      ? "daily_dev 任务必须具备主 Agent 协调计划、派发证据、Worker 通知、子 Agent 结果说明、主 Agent 最终复盘、实际代码变更证据和已执行验证记录，不能把建议性回复误判为完成"
      : "daily_dev 完成门禁自检失败，需要检查任务验收逻辑",
    { requiredEvidence: ["coordinator_plan", "assignment_evidence", "worker_notification", "child_agent_receipt", "coordinator_final_review", "actual_file_changes", "executed_verification"], selfTest: dailyDevGateSelfTest }
  ));

  const collaborationUx = runCollaborationUxSelfTest();
  checks.push(createDiagnosticCheck(
    "group-collaboration-ux",
    "群聊 AI 编程体验",
    collaborationUx.pass ? "ok" : "fail",
    collaborationUx.pass
      ? "群聊使用对话/项目分析/项目任务三态、任务意图门禁和单任务卡；普通问候不展示任务卡，项目询问可只读分析，内部协议默认进入技术详情"
      : "群聊协作体验自检失败，需要检查任务卡、交付摘要或追加要求分类",
    collaborationUx
  ));

  const mainAgentActions = runGroupMainAgentActionRegistrySelfTest();
  checks.push(createDiagnosticCheck(
    "group-main-agent-action-registry",
    "群聊主 Agent 动作注册表",
    mainAgentActions.pass ? "ok" : "fail",
    mainAgentActions.pass
      ? `群聊主 Agent 已登记 ${mainAgentActions.total} 个可治理动作：只读观察、任务创建、子 Agent 派发、追问、任务治理、结果读取、重规划和最终回复均有权限边界与完成证据`
      : "群聊主 Agent 动作注册表不完整，需要补齐动作、权限门禁或完成证据",
    mainAgentActions
  ));

  const mainAgentToolLoop = runGroupMainAgentToolLoopSelfTest();
  checks.push(createDiagnosticCheck(
    "group-main-agent-tool-loop",
    "群聊主 Agent 多步工作循环",
    mainAgentToolLoop.pass ? "ok" : "fail",
    mainAgentToolLoop.pass
      ? "群聊主 Agent 已具备 decision -> action -> observation -> verify -> reply 链路模型；普通对话不派发，项目分析只读，明确任务才创建/派发，高风险治理必须显式授权"
      : "群聊主 Agent 多步工作循环自检失败，需要检查动作选择、权限判断或验收链路",
    mainAgentToolLoop
  ));

  const rehearsal = buildDailyDevWorkflowRehearsal();
  checks.push(createDiagnosticCheck(
    "daily-dev-rehearsal",
    "闭环演练",
    rehearsal.pass ? "ok" : "fail",
    rehearsal.pass
      ? "日常开发闭环演练通过：任务模板、子 Agent 结果说明、主 Agent 复盘、实际变更门禁、验证门禁和交付摘要均可闭合"
      : "日常开发闭环演练未通过，请先检查开发群聊、子 Agent 工作目录或完成门禁",
    {
      group: rehearsal.group,
      steps: rehearsal.steps,
      taskDocumentContext: rehearsal.task_document_context,
      noChangeResult: rehearsal.no_change_result,
      doneResult: rehearsal.done_result,
      propagatedAssignmentSummary: rehearsal.propagated_assignment_summary,
      workerNotification: rehearsal.worker_notification,
      scratchpadContext: rehearsal.scratchpad_context,
      reworkProtocol: rehearsal.rework_protocol,
      deliverySummary: rehearsal.delivery_summary,
    }
  ));

  const smokeStatus = getDailyDevSmokeStatus();
  const mainAgentCapabilityEvidence = [
    { id: "business_intake", label: "接收业务描述/文档", ok: cronDailyDevProtocol.pass, evidence: cronDailyDevProtocol.pass ? "任务级业务/接口文档会进入 daily_dev 任务" : "定时/任务入口未稳定写入业务文档" },
    { id: "configurable_project_agents", label: "读取可配置项目 Agent", ok: configs.length > 0 && groupsWithReadyMembers.length > 0, evidence: `项目配置 ${configs.length} 个，可执行开发群聊 ${groupsWithReadyMembers.length} 个` },
    { id: "coordinator_plan", label: "主 Agent 计划", ok: coordinatorProtocol.pass, evidence: coordinatorProtocol.pass ? `可生成 ${coordinatorProtocol.coordinationPlan?.phases?.length || 0} 阶段计划` : "协调计划自测失败" },
    { id: "structured_dispatch", label: "结构化派发", ok: Object.values(collaborationProtocol.structuredAssignmentChecks || {}).every(Boolean), evidence: "assignments 会保留目标、任务、依赖和续跑语义" },
    { id: "worker_execution_receipt", label: "子 Agent 执行与结果说明", ok: workerProtocolPass, evidence: workerProtocolPass ? "task-notification、CCM_AGENT_RECEIPT 和 scratchpad 自测通过" : "Worker 通知/结果说明协议自测失败" },
    { id: "review_rework", label: "主 Agent 复盘返工", ok: reworkProtocol.pass, evidence: reworkProtocol.pass ? "发现缺口会生成同 Worker 续跑返工工作单" : "返工协议自测失败" },
    { id: "completion_gate", label: "完成门禁", ok: dailyDevGateSelfTest.pass, evidence: dailyDevGateSelfTest.pass ? "必须有计划、派发、Worker 通知、结果说明、复盘、实际变更和已执行验证" : "完成门禁自测失败" },
    { id: "workflow_rehearsal", label: "闭环演练", ok: rehearsal.pass, evidence: rehearsal.pass ? "模拟闭环可闭合" : "闭环演练失败" },
    { id: "live_execution_probe", label: "真实执行准入", ok: dailyDevExecutionReady, evidence: dailyDevExecutionReady ? `全员探针通过群聊 ${agentProbeMatrix.group_ready}/${agentProbeMatrix.group_total}` : matrixReadinessMessage, liveGate: true },
  ];
  const mainAgentCoreReady = mainAgentCapabilityEvidence.filter((item: any) => !item.liveGate).every((item: any) => item.ok);
  checks.push(createDiagnosticCheck(
    "main-agent-capability",
    "群聊主 Agent 实用性",
    !mainAgentCoreReady ? "fail" : (dailyDevExecutionReady ? "ok" : "warn"),
    !mainAgentCoreReady
      ? "主 Agent 日常开发闭环仍有核心协议缺口，暂不能稳定替你接开发任务"
      : (dailyDevExecutionReady
        ? "主 Agent 已具备接收业务任务、计划、派发、验收返工和总结交付的真实执行准入"
        : "主 Agent 协议闭环已具备，但真实替你干活前还需要目标开发群的项目 Agent 全员 CLI 探针通过"),
    {
      core_ready: mainAgentCoreReady,
      live_ready: dailyDevExecutionReady,
      evidence: mainAgentCapabilityEvidence,
    }
  ));

  checks.push(createDiagnosticCheck(
    "daily-dev-smoke-status",
    "真实试运行",
    smokeStatus.pass ? "ok" : (smokeStatus.status === "blocked" || smokeStatus.status === "failed" ? "warn" : "warn"),
    smokeStatus.message,
    smokeStatus
  ));

  checks.push(createDiagnosticCheck(
    "shared-docs",
    "业务文档入口",
    devGroups.some((group: any) => group.readyBacklogs > 0 || group.sharedFiles > 0) ? "ok" : "warn",
    devGroups.some((group: any) => group.readyBacklogs > 0)
      ? "已有 ready 状态的业务需求池文件，定时 daily_dev 可自动认领并派发"
      : devGroups.some((group: any) => group.sharedFiles > 0)
      ? "已有群聊共享文件，主 Agent 拆分任务时会带入文档上下文；可通过业务开发任务入口沉淀 ready 需求池"
      : "尚未上传群聊共享文件；也可以先把业务文档直接写进任务描述",
    devGroups.map((group: any) => ({
      id: group.id,
      name: group.name,
      sharedFiles: group.sharedFiles,
      backlogFiles: group.backlogFiles,
      readyBacklogs: group.readyBacklogs,
      backlogCounts: group.backlogCounts,
    }))
  ));

  const failCount = checks.filter(check => check.status === "fail").length;
  const warnCount = checks.filter(check => check.status === "warn").length;
  const readiness = failCount > 0 ? "blocked" : (warnCount > 0 ? "partial" : "ready");
  const totalReadyBacklogs = devGroups.reduce((sum: number, group: any) => sum + Number(group.readyBacklogs || 0), 0);
  const totalSharedFiles = devGroups.reduce((sum: number, group: any) => sum + Number(group.sharedFiles || 0), 0);
  const executableGroups = groupsWithReadyMembers.length;
  const continuationGapTasks = tasks.filter((task: any) => hasDailyDevContinuationGaps(task));
  const autopilotNextActions: string[] = [];
  if (!dailyDevExecutionReady) autopilotNextActions.push("先在设置页对目标开发群点击“复检全部”，至少让一个开发群聊的所有可执行项目 Agent 全员通过真实 CLI 探针");
  if (executableGroups === 0) autopilotNextActions.push("创建开发群聊，并加入至少一个具备可写工作目录的项目子 Agent");
  if (missingVerificationMembers.length > 0) autopilotNextActions.push("为缺少验证命令的项目子 Agent 配置项目验证命令，提升自动验收可靠性");
  if (continuationGapTasks.length > 0 && dailyDevExecutionReady) autopilotNextActions.push("运行一次自动开发或等待 daily_dev 定时任务，系统会优先续跑已有交付缺口任务");
  if (!smokeStatus.pass) autopilotNextActions.push(smokeStatus.status === "no_task" ? "创建真实试运行任务，验证主 Agent 到子 Agent 写文件的端到端闭环" : "查看真实试运行状态，按缺口续跑或修复执行通道后再复检");
  if (continuationGapTasks.length === 0 && totalReadyBacklogs === 0 && totalSharedFiles === 0) autopilotNextActions.push("上传 PRD、接口说明或业务描述到开发群聊，或在任务派发页创建业务开发任务");
  if (totalSharedFiles > 0 && totalReadyBacklogs === 0) autopilotNextActions.push("等待 daily_dev 定时任务自动导入共享文档，或在需求池里点击“导入共享文档”");
  if (dailyDevCronJobs.length === 0) autopilotNextActions.push("创建并启用 daily_dev 定时任务，让系统定时认领 ready 需求");
  if (totalReadyBacklogs > 0 && dailyDevExecutionReady) autopilotNextActions.push("可以批量派发可接活需求，主 Agent 会拆分给子 Agent 执行");
  if (recoveryWork.total > 0) autopilotNextActions.push("执行通道恢复后运行恢复监控，自动重试等待中的开发任务");
  if (autopilotNextActions.length === 0) autopilotNextActions.push("自动开发链路已具备接单条件：继续补充业务文档或等待定时任务触发");
  const autopilotMode = !dailyDevExecutionReady || executableGroups === 0
    ? "blocked"
    : continuationGapTasks.length > 0
      ? "ready_to_continue"
      : totalReadyBacklogs > 0
        ? "ready_to_dispatch"
        : totalSharedFiles > 0
          ? "ready_to_import"
          : "waiting_input";
  const autopilot = {
    mode: autopilotMode,
    ready: autopilotMode === "ready_to_dispatch" && dailyDevExecutionReady,
    headline: autopilotMode === "blocked"
      ? "自动开发暂不可用"
      : autopilotMode === "ready_to_continue"
        ? "已有任务可续跑"
        : autopilotMode === "ready_to_dispatch"
          ? "已有需求可派发"
          : autopilotMode === "ready_to_import"
            ? "已有业务文档待导入"
            : "等待业务输入",
    counts: {
      executableGroups,
      readyBacklogs: totalReadyBacklogs,
      sharedFiles: totalSharedFiles,
      continuationGaps: continuationGapTasks.length,
      dailyDevCronJobs: dailyDevCronJobs.length,
      queuedTasks: queueStatus.total_queued,
      recoveryWork: recoveryWork.total,
      verificationConfigured: configuredVerificationMembers.length,
      verificationInferred: inferredVerificationMembers.length,
      verificationMissing: missingVerificationMembers.length,
      agentProbeReady: agentProbeMatrix.ready,
      agentProbeExecutable: agentProbeMatrix.executable,
    },
    next_actions: autopilotNextActions.slice(0, 5),
    recent_cron: dailyDevCronJobs
      .filter((job: any) => job.last_run || job.last_result)
      .slice(0, 5)
      .map((job: any) => ({
        id: job.id,
        name: job.name,
        last_status: job.last_status || "never",
        last_result: job.last_result || "",
        last_run: job.last_run || "",
        last_run_meta: job.last_run_meta || null,
      })),
  };
  const summary = readiness === "ready"
    ? "主 Agent 日常开发闭环已具备接单条件"
    : readiness === "partial"
      ? "主 Agent 已可接单，但仍有建议完善项"
      : "主 Agent 暂不能稳定替你执行开发任务，请先处理失败项";

  return {
    success: true,
    generated_at: new Date().toISOString(),
    readiness,
    ready: readiness !== "blocked",
    summary,
    counts: {
      checks: checks.length,
      ok: checks.filter(check => check.status === "ok").length,
      warn: warnCount,
      fail: failCount,
      groups: groups.length,
      readyGroups: groupsWithReadyMembers.length,
      projectConfigs: configs.length,
      cronJobs: cronJobs.length,
      enabledCronJobs: enabledCronJobs.length,
      autoTasks: autoTasks.length,
    },
    autopilot,
    agent_probe_matrix: agentProbeMatrix,
    checks,
    groups: devGroups,
    queue_status: queueStatus,
  };
}
