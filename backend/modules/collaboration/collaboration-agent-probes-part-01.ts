// Behavior-freeze split from collaboration-agent-probes.ts (part 1/2).

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

export function hasFreshSuccessfulAgentProbe(readiness: any) {
  return readiness?.probe?.success === true
    && Number(readiness?.probe?.age_ms || Infinity) < AGENT_PROBE_SUCCESS_FRESH_MS;
}

export function taskMatchesAgentProbeTarget(task: any, target: any = null) {
  return require("./collaboration-task-runtime").taskMatchesAgentProbeTarget(task, target);
}

export function getAgentProbeTargetStatusKey(target: any) {
  const normalized = normalizeAgentProbeTarget(target);
  if (!normalized.groupId && !normalized.project && !normalized.agentType) return "";
  const clean = (value: string, fallback: string) => String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "") || fallback;
  return [
    clean(normalized.groupId, "any-group"),
    clean(normalized.project, "any-project"),
    clean(normalized.agentType, "any-agent"),
  ].join("__");
}

export function readAgentProbeStatus(requiredTarget: any = null) {
  const required = normalizeAgentProbeTarget(requiredTarget || {});
  const hasRequired = !!(required.groupId || required.project || required.agentType);
  if (hasRequired) {
    const exactFile = getAgentProbeTargetStatusFile(required);
    const exact = readAgentProbeStatusFile(exactFile);
    if (exact) return exact;
    const matched = listAgentProbeTargetStatuses(required)[0];
    if (matched) return matched;
  }

  const latest = readAgentProbeStatusFile(AGENT_PROBE_STATUS_FILE);
  if (!hasRequired) return latest;
  return latest && doesProbeTargetMatchRequired(latest?.target, required) ? latest : null;
}

export function getAgentProbeHealth(probe: any) {
  if (!probe) {
    return {
      status: "missing",
      successFresh: false,
      failureRecent: false,
      message: "尚未运行 Agent CLI 探针",
    };
  }
  const age = Number(probe.age_ms ?? Infinity);
  if (probe.success === true && age < AGENT_PROBE_SUCCESS_FRESH_MS) {
    return {
      status: "ok",
      successFresh: true,
      failureRecent: false,
      message: "Agent CLI 探针最近通过",
    };
  }
  if (probe.success === false && age < AGENT_PROBE_FAILURE_BLOCK_MS) {
    return {
      status: "failed",
      successFresh: false,
      failureRecent: true,
      message: probe.message || probe.error || "Agent CLI 探针最近失败",
    };
  }
  return {
    status: probe.success === true ? "stale_ok" : "stale_failed",
    successFresh: false,
    failureRecent: false,
    message: probe.success === true ? "Agent CLI 探针已过期，建议复检" : "Agent CLI 失败探针已过期，建议复检",
  };
}

export function getAgentProbeOutputFailure(output: any) {
  const text = String(output || "").trim();
  if (!text) {
    return {
      message: "Agent CLI 已返回空输出，未包含预期探针标记",
      error: "empty_output",
    };
  }
  if (checkTaskFailure(text) || /Agent Runner 错误|Agent 错误|响应超时|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text)) {
    return {
      message: `Agent CLI 探针失败：${compactMemoryText(text, 500)}`,
      error: compactMemoryText(text, 1000),
    };
  }
  return {
    message: "Agent CLI 已返回，但未包含预期探针标记",
    error: compactMemoryText(text, 1000),
  };
}

export function getAgentExecutionReadiness(probeTarget: any = null) {
  const childProcess = getChildProcessCapability();
  const probe = readAgentProbeStatus(probeTarget);
  const probeHealth = getAgentProbeHealth(probe);
  if (probeHealth.failureRecent) {
    const externalRunner = getExternalAgentRunnerStatus();
    const message = `Agent CLI 探针最近失败：${probeHealth.message}`;
    return {
      ready: false,
      mode: "agent-cli-probe-failed",
      message,
      fix_actions: buildAgentExecutionFixActions({
        error: message,
        childProcess,
        externalRunner,
        probe,
      }),
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  if (childProcess.ok) {
    return {
      ready: true,
      mode: "node-child-process",
      message: probeHealth.successFresh
        ? `Node 可启动子进程，且 Agent CLI 探针最近通过：${childProcess.stdout || "ok"}`
        : `Node 可启动子进程，Agent CLI 调用底座可用但模型 CLI 连通性未复检：${childProcess.stdout || "ok"}`,
      fix_actions: [],
      childProcess,
      probe,
      probeHealth,
    };
  }

  const externalRunner = getExternalAgentRunnerStatus();
  const lastResult = externalRunner.last_result || null;
  const lastFailure = lastResult?.success === false;
  const recentFailure = lastFailure && Number(lastResult?.age_ms || 0) < 15 * 60 * 1000;
  if (externalRunner.active && (!recentFailure || probeHealth.successFresh)) {
    return {
      ready: true,
      mode: "external-runner",
      message: recentFailure && probeHealth.successFresh
        ? "Node 直接启动子进程受限，外部 Agent Runner 最近有失败记录，但 Agent CLI 探针已新鲜通过，允许继续通过 Runner 执行"
        : "Node 直接启动子进程受限，但外部 Agent Runner 在线，子 Agent CLI 将通过 Runner 执行",
      fix_actions: [],
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }

  const message = lastFailure
    ? `外部 Agent Runner 最近执行 ${lastResult.command || "Agent CLI"} 失败：${lastResult.error || lastResult.output || "未知错误"}；${lastResult.hint || "请检查子 Agent CLI"}`
    : `Node 无法启动子进程，项目 Agent 无法调用 CLI：${childProcess.error || childProcess.stderr || "未知错误"}；可运行 npm run agent-runner:ps 启用外部执行通道`;
  return {
    ready: false,
    mode: externalRunner.active ? "external-runner-blocked" : "blocked",
    message,
    fix_actions: buildAgentExecutionFixActions({
      error: message,
      childProcess,
      externalRunner,
      probe,
    }),
    childProcess,
    externalRunner,
    probe,
    probeHealth,
  };
}

export function enforceAgentProbeExecutionReadiness(capability: any = {}) {
  const childProcess = capability.childProcess || { ok: false };
  const externalRunner = capability.externalRunner || { active: false };
  const probe = capability.probe || null;
  const probeHealth = capability.probeHealth || getAgentProbeHealth(probe);
  const claudeGateway = getClaudeLocalGatewayReadiness(capability.probeTarget || probe?.target || null);
  if (claudeGateway) {
    return {
      ...claudeGateway,
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  if (childProcess.ok) {
    return {
      ready: true,
      mode: "node-child-process-probe",
      message: `Node 可启动子进程，可重新运行 Agent CLI 探针：${childProcess.stdout || "ok"}`,
      fix_actions: [],
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  if (externalRunner.active) {
    return {
      ready: true,
      mode: "external-runner-probe",
      message: "Node 直接启动子进程受限，但外部 Agent Runner 在线，可重新运行 Agent CLI 探针",
      fix_actions: [],
      childProcess,
      externalRunner,
      probe,
      probeHealth,
    };
  }
  const message = `无法运行 Agent CLI 探针：Node 无法启动子进程，且外部 Agent Runner 未在线；${childProcess.error || childProcess.stderr || "请启用执行通道"}`;
  return {
    ready: false,
    mode: "probe-runner-blocked",
    message,
    fix_actions: buildAgentExecutionFixActions({
      error: message,
      childProcess,
      externalRunner,
      probe,
    }),
    childProcess,
    externalRunner,
    probe,
    probeHealth,
  };
}
