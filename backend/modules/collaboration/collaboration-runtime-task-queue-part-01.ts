// Behavior-freeze split from collaboration-runtime-task-queue.ts (part 1/2).
// Behavior-freeze split from collaboration-runtime.ts (part 1/9).
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
  CollabCtx,
  getProjectExtraConfig,
} from "./collaboration-runtime-plan-tools";

import {
  buildTargetedReworkContinuationDraft,
  continueTaskWithMessage,
  updateTask,
} from "./collaboration-runtime-runtime-tools";

import {
  getTaskById,
} from "./collaboration-runtime-task-queue-part-02";

export { FEISHU_SCOPES, sendFeishuReportMessage } from "./feishu";
export { loadGroups } from "./storage";
export { runGroupMemoryStorageRecoverySelfTest } from "./memory";
export {
  claimReadyDailyDevBacklog,
  importSharedDocsToDailyDevBacklog,
  markDailyDevBacklogStatus,
} from "./daily-dev-backlog";

// === 任务队列系统（支持并行执行）===
export const taskQueues = new Map<string, string[]>(); // 每个目标（群聊/Agent）独立队列
export const runningTasks = new Map<string, boolean>(); // 正在运行的任务目标
export const runningTaskIds = new Set<string>(); // 正在运行的任务 ID
export const coordinationSettlementInFlight = new Set<string>();
export const TASK_WATCHDOG_INTERVAL_MS = 60 * 1000;
export const TASK_WATCHDOG_STALE_MS = 15 * 60 * 1000;
export const TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS = 60 * 1000;
export const TASK_WATCHDOG_GAP_REWORK_MAX = 3;
export const AGENT_RECOVERY_PROBE_INTERVAL_MS = 5 * 60 * 1000;
export const AGENT_RECOVERY_PROBE_TIMEOUT_MS = 45 * 1000;
export const AGENT_PROBE_SUCCESS_FRESH_MS = 30 * 60 * 1000;
export const AGENT_PROBE_FAILURE_BLOCK_MS = 15 * 60 * 1000;
export const AGENT_QUEUE_BLOCK_LOG_COOLDOWN_MS = 5 * 60 * 1000;
export const AGENT_RUNNER_DIR = path.join(CCM_DIR, "agent-runner");
export const AGENT_PROBE_STATUS_FILE = path.join(AGENT_RUNNER_DIR, "probe-status.json");
export const AGENT_PROBE_TARGET_STATUS_DIR = path.join(AGENT_RUNNER_DIR, "probe-targets");
export let taskWatchdogTimer: NodeJS.Timeout | null = null;
export let agentRecoveryMonitorTimer: NodeJS.Timeout | null = null;
export let agentRecoveryProbeInFlight = false;

export function setTaskWatchdogTimer(value: NodeJS.Timeout | null) {
  taskWatchdogTimer = value;
}

export function setAgentRecoveryMonitorTimer(value: NodeJS.Timeout | null) {
  agentRecoveryMonitorTimer = value;
}

export function setAgentRecoveryProbeInFlight(value: boolean) {
  agentRecoveryProbeInFlight = value;
}

export function runCronDailyDevProtocolSelfTestSafe() {
  try {
    const cronModule = require("../scheduling/cron");
    if (typeof cronModule.runCronDailyDevProtocolSelfTest === "function") {
      return cronModule.runCronDailyDevProtocolSelfTest();
    }
    return {
      pass: false,
      error: "cron 模块未导出 runCronDailyDevProtocolSelfTest",
    };
  } catch (error: any) {
    return {
      pass: false,
      error: error?.message || String(error || "cron 协议自测加载失败"),
    };
  }
}

// 优先级权重
export const PRIORITY_WEIGHT: Record<string, number> = { high: 3, normal: 2, low: 1 };

export function isTaskPaused(task: any) {
  return require("./collaboration-task-card").isTaskPaused.apply(null, arguments as any);
}

export function getTaskFailureText(task: any) {
  return require("./collaboration-task-card").getTaskFailureText.apply(null, arguments as any);
}

export function getChildAgentIsolationMode(group: any = null, task: any = null) {
  return require("./collaboration-task-card").getChildAgentIsolationMode.apply(null, arguments as any);
}

export function isRecoverableRuntimeFailure(task: any) {
  return require("./collaboration-task-card").isRecoverableRuntimeFailure.apply(null, arguments as any);
}

export function isAgentExecutionBlockedPendingTask(task: any) {
  return require("./collaboration-task-card").isAgentExecutionBlockedPendingTask.apply(null, arguments as any);
}

function isPositiveAcceptanceEvidenceText(value: any) {
  return require("./collaboration-task-card").isPositiveAcceptanceEvidenceText.apply(null, arguments as any);
}

function isBareAcceptanceMarker(value: any) {
  return require("./collaboration-task-card").isBareAcceptanceMarker.apply(null, arguments as any);
}

function isStrongExecutedVerificationText(value: any) {
  return require("./collaboration-task-card").isStrongExecutedVerificationText.apply(null, arguments as any);
}

function flattenAcceptanceEvidenceRows(...values: any[]) {
  return require("./collaboration-task-card").flattenAcceptanceEvidenceRows.apply(null, arguments as any);
}

function evidenceRowText(row: any) {
  return require("./collaboration-task-card").evidenceRowText.apply(null, arguments as any);
}

function rowEvidenceCount(row: any) {
  return require("./collaboration-task-card").rowEvidenceCount.apply(null, arguments as any);
}

function isStrongPositiveReviewRow(row: any) {
  return require("./collaboration-task-card").isStrongPositiveReviewRow.apply(null, arguments as any);
}

export function hasStrongTaskAcceptanceEvidence(task: any, executions: any[] = [], explicitSummary: any = null) {
  return require("./collaboration-task-card").hasStrongTaskAcceptanceEvidence.apply(null, arguments as any);
}

export function deriveTaskLifecycle(task: any, executions: any[] = []) {
  return require("./collaboration-task-card").deriveTaskLifecycle.apply(null, arguments as any);
}

export function buildTaskPreflightReasoning(task: any, reason = "任务执行前复核", recovery = false) {
  return require("./collaboration-task-card").buildTaskPreflightReasoning.apply(null, arguments as any);
}

function getTaskRecoveryChecks(task: any) {
  return require("./collaboration-task-card").getTaskRecoveryChecks.apply(null, arguments as any);
}

function hasTaskRecoveryEvidence(task: any) {
  return require("./collaboration-task-card").hasTaskRecoveryEvidence.apply(null, arguments as any);
}

function buildMainAgentRecoverySummary(task: any, phase: string, sessions: any[] = [], workItems: any[] = [], gapItems: any[] = []) {
  return require("./collaboration-task-card").buildMainAgentRecoverySummary.apply(null, arguments as any);
}

function taskCardPhase(task: any, executions: any[]) {
  return require("./collaboration-task-card").taskCardPhase.apply(null, arguments as any);
}

function taskCardGapLabel(item: any) {
  return require("./collaboration-task-card").taskCardGapLabel.apply(null, arguments as any);
}

export function userAgentRole(project: string) {
  return require("./collaboration-task-card").userAgentRole.apply(null, arguments as any);
}

function userAgentProgress(worker: any) {
  return require("./collaboration-task-card").userAgentProgress.apply(null, arguments as any);
}

function sanitizeUserAgentProgressText(value: any, fallback = "", max = 180) {
  return require("./collaboration-task-card").sanitizeUserAgentProgressText.apply(null, arguments as any);
}

function normalizeUserAgentProgressStatus(status: any, phase = "") {
  return require("./collaboration-task-card").normalizeUserAgentProgressStatus.apply(null, arguments as any);
}

function userAgentProgressStatusLabel(status: any) {
  return require("./collaboration-task-card").userAgentProgressStatusLabel.apply(null, arguments as any);
}

function userAgentProgressDefaultSummary(agent: string, status: string, currentFocus = "", blockers: string[] = []) {
  return require("./collaboration-task-card").userAgentProgressDefaultSummary.apply(null, arguments as any);
}

function userAgentProgressNextAction(status: string, currentFocus = "") {
  return require("./collaboration-task-card").userAgentProgressNextAction.apply(null, arguments as any);
}

function userAgentSessionStatus(session: any) {
  return require("./collaboration-task-card").userAgentSessionStatus.apply(null, arguments as any);
}

function userAgentSessionSummary(session: any, status: string) {
  return require("./collaboration-task-card").userAgentSessionSummary.apply(null, arguments as any);
}

function userAgentSessionEvidence(session: any, status: string) {
  return require("./collaboration-task-card").userAgentSessionEvidence.apply(null, arguments as any);
}

function agentNameMatches(value: any, name: string) {
  return require("./collaboration-task-card").agentNameMatches.apply(null, arguments as any);
}

function latestAgentMatch(rows: any[], name: string, picker: (item: any) => any) {
  return require("./collaboration-task-card").latestAgentMatch.apply(null, arguments as any);
}

export function isVisibleChildAgentName(name: string) {
  return require("./collaboration-task-card").isVisibleChildAgentName.apply(null, arguments as any);
}

function buildUserAgentProgressSummary(task: any, summary: any = {}, workers: any[] = [], executions: any[] = [], sessions: any[] = [], workItems: any[] = [], phase = "") {
  return require("./collaboration-task-card").buildUserAgentProgressSummary.apply(null, arguments as any);
}

function normalizeUserChangeFile(item: any, fallback: any = {}) {
  return require("./collaboration-task-card").normalizeUserChangeFile.apply(null, arguments as any);
}

function pushUserChangeFiles(target: any[], value: any, fallback: any = {}) {
  return require("./collaboration-task-card").pushUserChangeFiles.apply(null, arguments as any);
}

function userChangeFileKey(file: any) {
  return require("./collaboration-task-card").userChangeFileKey.apply(null, arguments as any);
}

function isGenericChangeOwner(value: any) {
  return require("./collaboration-task-card").isGenericChangeOwner.apply(null, arguments as any);
}

function pickChangeOwner(current: any, incoming: any) {
  return require("./collaboration-task-card").pickChangeOwner.apply(null, arguments as any);
}

function mergeUserChangeFile(current: any, incoming: any) {
  return require("./collaboration-task-card").mergeUserChangeFile.apply(null, arguments as any);
}

function uniqueUserChangeFiles(rawFiles: any[]) {
  return require("./collaboration-task-card").uniqueUserChangeFiles.apply(null, arguments as any);
}

function buildUserChangeSummary(task: any, summary: any = {}, workers: any[] = [], workItems: any[] = []) {
  return require("./collaboration-task-card").buildUserChangeSummary.apply(null, arguments as any);
}

function buildUserTaskActions(task: any, phase: string, executions: any[]) {
  return require("./collaboration-task-card").buildUserTaskActions.apply(null, arguments as any);
}

export function getTaskWorkItems(task: any, executions: any[] = []) {
  return require("./collaboration-task-card").getTaskWorkItems.apply(null, arguments as any);
}

export function persistTaskWorkItems(taskId: string, items: any[], meta: any = {}) {
  if (!taskId || !Array.isArray(items)) return null;
  return updateTask(taskId, {
    work_items: items,
    work_item_summary: buildMainAgentWorkItemSummary(items),
    work_item_runtime: {
      ...(getTaskById(taskId)?.work_item_runtime || {}),
      ...meta,
      updated_at: new Date().toISOString(),
    },
  });
}

export function claimTaskWorkItemForAgent(taskId: string, agent: string, detail = "", options: any = {}) {
  const task = getTaskById(taskId);
  const target = String(agent || "").trim();
  if (!task || !target) {
    const claim = { ok: false, reason: "task_not_found" as const, items: [] };
    return { ...claim, summary: buildMainAgentWorkItemClaimSummary(claim, target, options.itemRef || target) };
  }
  const items = getTaskWorkItems(task);
  const claim = claimMainAgentWorkItem(items, options.itemRef || target, target, {
    checkOwnerBusy: options.checkOwnerBusy === true,
    now: new Date().toISOString(),
  });
  const at = new Date().toISOString();
  const claimSummary = buildMainAgentWorkItemClaimSummary(claim, target, options.itemRef || target);
  const runtimeMeta: any = {
    last_claim_summary: claimSummary,
    last_claim_attempt: {
      agent: target,
      item_id: claim.item?.id || "",
      result: claim.ok ? "claimed" : "waiting",
      reason: claim.reason || "",
      at,
    },
  };
  if (claim.ok) {
    runtimeMeta.last_claim = { agent: target, item_id: claim.item?.id || "", at, detail: detail || claimSummary.headline };
  } else if (claim.reason === "blocked") {
    runtimeMeta.last_claim_blocked = { agent: target, blocking: claim.blocking || [], at };
  }
  persistTaskWorkItems(taskId, claim.items, runtimeMeta);
  addTaskLog(taskId, claim.ok ? "info" : "warning", claimSummary.headline);
  appendTaskTimelineEvent(taskId, {
    type: claim.ok ? "work_item_claimed" : "work_item_claim_waiting",
    title: claim.ok ? `${target} 已接下工作项` : "工作项暂未派发",
    detail: claimSummary.headline,
    status: claim.ok ? "active" : "warn",
    phase: claim.ok ? "executing" : claim.reason === "blocked" ? "waiting_dependency" : "waiting_dispatch",
    agent: target,
    data: {
      work_item_id: claim.item?.id || "",
      reason: claim.reason || "",
      blocking: claim.blocking || [],
      busy_work_item_id: claim.busy?.id || "",
    },
  });
  return { ...claim, summary: claimSummary };
}

export function updateTaskWorkItemFromReceipt(taskId: string, agent: string, receipt: any = null, fileChanges: any = null, detail = "", options: any = {}) {
  const task = getTaskById(taskId);
  const target = String(agent || receipt?.agent || receipt?.project || "").trim();
  if (!task || !target) return null;
  const rawFiles = Array.isArray(receipt?.filesChanged || receipt?.files_changed || receipt?.files)
    ? (receipt.filesChanged || receipt.files_changed || receipt.files)
    : Array.isArray(fileChanges?.files)
      ? fileChanges.files.map((item: any) => item?.path || item?.file || item).filter(Boolean)
      : [];
  const patch = {
    status: normalizeMainAgentWorkItemStatus(receipt?.status || receipt?.receipt_status || "blocked"),
    lastReceipt: receipt || null,
    evidence: [receipt?.summary || detail].filter(Boolean),
    filesChanged: rawFiles,
    verification: Array.isArray(receipt?.verification || receipt?.tests) ? (receipt.verification || receipt.tests) : [],
    blockers: Array.isArray(receipt?.blockers) ? receipt.blockers : [],
    needs: Array.isArray(receipt?.needs) ? receipt.needs : [],
    completedAt: normalizeMainAgentWorkItemStatus(receipt?.status || "") === "completed" ? new Date().toISOString() : "",
  };
  const previousItems = getTaskWorkItems(task);
  const nextItems = updateMainAgentWorkItem(previousItems, target, patch);
  let unlockSummary = patch.status === "completed"
    ? buildMainAgentWorkItemUnlockSummary(previousItems, nextItems, { completedAgent: target })
    : null;
  const updated = persistTaskWorkItems(taskId, nextItems, {
    last_receipt: { agent: target, status: receipt?.status || "", at: new Date().toISOString() },
    ...(unlockSummary ? { last_unlock_summary: unlockSummary } : {}),
  });
  if (unlockSummary) {
    addTaskLog(taskId, "info", unlockSummary.headline);
    appendTaskTimelineEvent(taskId, {
      type: "work_item_dependency_unlocked",
      title: unlockSummary.title,
      detail: unlockSummary.headline,
      status: "ok",
      phase: "dispatching",
      agent: target,
      data: { unlocked_work_item_ids: unlockSummary.technical.unlocked_work_item_ids },
    });
    const next = unlockSummary.next_claimable[0];
    const canAutoContinue = options.ctx
      && options.autoContinueUnlocked !== false
      && task.auto_execute !== false
      && task.status !== "done"
      && !isTaskPaused(task)
      && next?.id;
    if (canAutoContinue) {
      const latestTask = getTaskById(taskId) || updated || task;
      const message = buildTargetedReworkContinuationDraft(latestTask, {
        rework_kind: "next_claimable_work_item",
        work_item_id: next.id,
        target: next.target || next.owner || "",
        reason: next.subject || "继续处理已解锁工作项",
        title: "自动派发已解锁工作项",
      });
      const autoResult = continueTaskWithMessage(taskId, message, options.ctx, {
        source: "dependency_unlocked_next_work_item",
        internal: true,
        auto_execute: true,
        rework_kind: "next_claimable_work_item",
        work_item_id: next.id,
        target: next.target || next.owner || "",
        reason: next.subject || "继续处理已解锁工作项",
        title: "自动派发已解锁工作项",
        status_detail: sanitizeUserAgentProgressText(`${target} 前置工作已完成，我已自动接上 ${next.target || next.owner || "后续执行成员"} 的下一步`, "前置工作已完成，我已自动接上下一步。", 220),
        idempotency_key: `dependency-unlock:${taskId}:${next.id}:${target}`,
      });
      const autoStatus = autoResult.success
        ? autoResult.deferred
          ? "auto_dispatch_deferred"
          : autoResult.queued
            ? "auto_dispatch_queued"
            : "ready_to_dispatch"
        : "auto_dispatch_blocked";
      unlockSummary = buildMainAgentWorkItemUnlockSummary(previousItems, nextItems, {
        completedAgent: target,
        status: autoStatus,
        headline: autoResult.success
          ? `${target} 完成后，“${next.subject || "后续工作项"}”已经解锁，我已自动接上派发。`
          : `${target} 完成后，“${next.subject || "后续工作项"}”已经解锁，但自动接续暂未开始。`,
        next_action: autoResult.success
          ? autoResult.deferred
            ? "当前执行轮结束后，我会继续派发这个已解锁工作项。"
            : autoResult.queued
              ? "任务已加入执行队列，我会继续跟踪执行成员结果。"
              : "我已记录接续请求，会继续跟踪派发状态。"
          : "执行通道暂时不可用，我会保留已解锁工作项并稍后重试。",
        auto_dispatch: { success: autoResult.success, queued: autoResult.queued, deferred: autoResult.deferred, error: autoResult.error || "" },
      }) || unlockSummary;
      persistTaskWorkItems(taskId, getTaskWorkItems(getTaskById(taskId) || latestTask), { last_unlock_summary: unlockSummary });
      addTaskLog(taskId, autoResult.success ? "info" : "warning", unlockSummary.headline);
    }
  }
  appendTaskTimelineEvent(taskId, {
    type: "work_item_receipt",
    title: `${target} 工作项结果说明`,
    detail: receipt?.summary || detail || `状态 ${receipt?.status || "unknown"}`,
    status: patch.status === "completed" ? "ok" : patch.status === "failed" ? "fail" : "warn",
    phase: patch.status === "completed" ? "reviewing" : "rework",
    agent: target,
    data: { receipt, files: rawFiles },
  });
  return updated;
}

export function requeueTaskWorkItemsForWatchdog(task: any, staleMs: number, reason: string, nowMs = Date.now()) {
  const currentItems = getTaskWorkItems(task);
  const result = requeueStaleMainAgentWorkItems(currentItems, { staleMs, nowMs, reason });
  if (!result.requeued.length) return result;
  persistTaskWorkItems(task.id, result.items, {
    last_requeue: {
      at: new Date(nowMs).toISOString(),
      reason,
      item_ids: result.requeued.map((item: any) => item.id),
    },
  });
  addTaskLog(task.id, "warning", `看门狗释放 ${result.requeued.length} 个卡住的子 Agent 工作项：${reason}`);
  appendTaskTimelineEvent(task.id, {
    type: "work_item_requeued",
    title: "看门狗已释放卡住的工作项",
    detail: result.requeued.map((item: any) => `${item.target || item.owner}:${item.subject}`).join("；").slice(0, 500),
    status: "warn",
    phase: "reworking",
    data: { item_ids: result.requeued.map((item: any) => item.id), reason },
  });
  return result;
}

function stableTaskEntityId(prefix: string, value: any) {
  return require("./collaboration-task-card").stableTaskEntityId.apply(null, arguments as any);
}

export function groupSessionIdForTask(task: any) {
  return require("./collaboration-task-card").groupSessionIdForTask.apply(null, arguments as any);
}

export function buildTaskEntityChain(taskId: string) {
  return require("./collaboration-task-card").buildTaskEntityChain.apply(null, arguments as any);
}

export function buildTaskCardView(task: any, executions: any[], sessions: any[]) {
  return require("./collaboration-task-card").buildTaskCardView.apply(null, arguments as any);
}

export function normalizeContinuationKind(kind: string) {
  return require("./collaboration-task-card").normalizeContinuationKind.apply(null, arguments as any);
}

export function buildContinuationUserDecision(input: any = {}) {
  return require("./collaboration-task-card").buildContinuationUserDecision.apply(null, arguments as any);
}

export function buildUserContinuationStatus(task: any, phase = "") {
  return require("./collaboration-task-card").buildUserContinuationStatus.apply(null, arguments as any);
}

export function shouldResumeAfterGoalRevisionInterruption(task: any, executionFollowupRevision = 0) {
  return require("./collaboration-task-card").shouldResumeAfterGoalRevisionInterruption.apply(null, arguments as any);
}

export function buildGoalRevisionInterruptedStatus(pending: any[] = []) {
  return require("./collaboration-task-card").buildGoalRevisionInterruptedStatus.apply(null, arguments as any);
}

function shouldShowUserTaskCard(task: any, summary: any = {}, executions: any[] = []) {
  return require("./collaboration-task-card").shouldShowUserTaskCard.apply(null, arguments as any);
}

function timelineStatusForUser(item: any) {
  return require("./collaboration-task-card").timelineStatusForUser.apply(null, arguments as any);
}

function timelineLabelForUser(item: any) {
  return require("./collaboration-task-card").timelineLabelForUser.apply(null, arguments as any);
}

function buildUserWorkflowTimeline(task: any, summary: any, phase: string) {
  return require("./collaboration-task-card").buildUserWorkflowTimeline.apply(null, arguments as any);
}

export function buildUserAgentQuestionRows(summary: any) {
  return require("./collaboration-task-card").buildUserAgentQuestionRows.apply(null, arguments as any);
}

function buildUserConflictWarnings(summary: any) {
  return require("./collaboration-task-card").buildUserConflictWarnings.apply(null, arguments as any);
}

export function splitUserAcceptanceText(value: any) {
  return require("./collaboration-task-card").splitUserAcceptanceText.apply(null, arguments as any);
}

export function getTaskPlanMode(task: any) {
  return require("./collaboration-task-card").getTaskPlanMode.apply(null, arguments as any);
}

function buildUserWorkOrderPreview(task: any, summary: any = {}, planMode: any = null) {
  return require("./collaboration-task-card").buildUserWorkOrderPreview.apply(null, arguments as any);
}

function executionStoryStatus(conditionDone: boolean, conditionActive: boolean, phase: string) {
  return require("./collaboration-task-card").executionStoryStatus.apply(null, arguments as any);
}

function buildUserExecutionStory(task: any, summary: any = {}, executions: any[] = [], phase = "planning", workOrderPreview: any = null) {
  return require("./collaboration-task-card").buildUserExecutionStory.apply(null, arguments as any);
}

export function buildUserCompletionReadinessSummary(task: any, summary: any = {}, workItems: any[] = [], phase = "planning") {
  return require("./collaboration-task-card").buildUserCompletionReadinessSummary.apply(null, arguments as any);
}

function sanitizeAcceptanceVisibleText(value: any, fallback = "验收检查已整理。", max = 220) {
  return require("./collaboration-task-card").sanitizeAcceptanceVisibleText.apply(null, arguments as any);
}

function normalizeUserAcceptanceCheck(item: any, context: any = {}) {
  return require("./collaboration-task-card").normalizeUserAcceptanceCheck.apply(null, arguments as any);
}

export function buildUserAcceptanceReview(task: any, summary: any = {}, executions: any[] = [], phase = "planning") {
  return require("./collaboration-task-card").buildUserAcceptanceReview.apply(null, arguments as any);
}

function planAlignmentEvidenceLabels(summary: any = {}, task: any = {}) {
  return require("./collaboration-task-card").planAlignmentEvidenceLabels.apply(null, arguments as any);
}

function planCriterionStatus(criterion: string, summary: any = {}, task: any = {}, acceptanceReview: any = null) {
  return require("./collaboration-task-card").planCriterionStatus.apply(null, arguments as any);
}

function buildUserPlanAlignmentReview(task: any, summary: any = {}, phase = "planning", planMode: any = null, workOrderPreview: any = null, acceptanceReview: any = null) {
  return require("./collaboration-task-card").buildUserPlanAlignmentReview.apply(null, arguments as any);
}

function buildUserHandoffSummary(
  task: any,
  summary: any = {},
  phase = "planning",
  nextAction = "",
  blockers: string[] = [],
  acceptanceReview: any = null,
  planAlignment: any = null,
  changeSummary: any = null,
) {
  return require("./collaboration-task-card").buildUserHandoffSummary.apply(null, arguments as any);
}

function extractMemoryDispatchFreshnessGateFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractMemoryDispatchFreshnessGateFromValue.apply(null, arguments as any);
}

export function normalizeMemoryGateAgent(value: any) {
  return require("./collaboration-memory-gates").normalizeMemoryGateAgent.apply(null, arguments as any);
}

export function getTaskAgentMemoryContextSnapshotSources(context: any = {}) {
  return require("./collaboration-memory-gates").getTaskAgentMemoryContextSnapshotSources.apply(null, arguments as any);
}

function forEachTaskAgentMemoryContextSnapshotSource(context: any = {}, visit: (value: any, source: string, fallbackAgent: string) => void) {
  return require("./collaboration-memory-gates").forEachTaskAgentMemoryContextSnapshotSource.apply(null, arguments as any);
}

export function summarizeTaskAgentMemoryContextSnapshot(snapshot: any = {}) {
  return require("./collaboration-memory-gates").summarizeTaskAgentMemoryContextSnapshot.apply(null, arguments as any);
}

export function evaluateReceiptTaskAgentMemoryContextSnapshot(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptTaskAgentMemoryContextSnapshot.apply(null, arguments as any);
}

export function collectTaskMemoryDispatchFreshnessGates(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskMemoryDispatchFreshnessGates.apply(null, arguments as any);
}

export function evaluateReceiptMemoryDispatchGate(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptMemoryDispatchGate.apply(null, arguments as any);
}

function extractReadPlanRevalidationGateFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractReadPlanRevalidationGateFromValue.apply(null, arguments as any);
}

export function collectTaskReadPlanRevalidationGates(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskReadPlanRevalidationGates.apply(null, arguments as any);
}

export function evaluateReceiptReadPlanRevalidationGate(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptReadPlanRevalidationGate.apply(null, arguments as any);
}

function extractPostCompactReinjectionGateFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractPostCompactReinjectionGateFromValue.apply(null, arguments as any);
}

export function collectTaskPostCompactReinjectionGates(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskPostCompactReinjectionGates.apply(null, arguments as any);
}

function extractPostCompactDispatchMarkerFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractPostCompactDispatchMarkerFromValue.apply(null, arguments as any);
}

export function collectTaskPostCompactDispatchMarkers(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskPostCompactDispatchMarkers.apply(null, arguments as any);
}

function normalizePostCompactCandidateUsageState(value: any) {
  return require("./collaboration-memory-gates").normalizePostCompactCandidateUsageState.apply(null, arguments as any);
}

function collectReceiptPostCompactCandidateUsageRows(receipt: any = {}) {
  return require("./collaboration-memory-gates").collectReceiptPostCompactCandidateUsageRows.apply(null, arguments as any);
}

function structuredUsageMatchesCandidate(row: any, gate: any, candidate: any) {
  return require("./collaboration-memory-gates").structuredUsageMatchesCandidate.apply(null, arguments as any);
}

function evaluatePostCompactReinjectionCandidateReference(gate: any, declarationText = "", structuredUsageRows: any[] = []) {
  return require("./collaboration-memory-gates").evaluatePostCompactReinjectionCandidateReference.apply(null, arguments as any);
}

export function evaluateReceiptPostCompactReinjectionGate(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptPostCompactReinjectionGate.apply(null, arguments as any);
}

function extractApiMicrocompactEditPlanFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractApiMicrocompactEditPlanFromValue.apply(null, arguments as any);
}

function extractApiMicrocompactNativeApplyPlanFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractApiMicrocompactNativeApplyPlanFromValue.apply(null, arguments as any);
}

function extractApiMicrocompactSessionBindingFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractApiMicrocompactSessionBindingFromValue.apply(null, arguments as any);
}

export function collectTaskApiMicrocompactEditPlans(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskApiMicrocompactEditPlans.apply(null, arguments as any);
}

function normalizeApiMicrocompactUsageState(value: any) {
  return require("./collaboration-memory-gates").normalizeApiMicrocompactUsageState.apply(null, arguments as any);
}

function collectReceiptApiMicrocompactUsageRows(receipt: any = {}) {
  return require("./collaboration-memory-gates").collectReceiptApiMicrocompactUsageRows.apply(null, arguments as any);
}

export function evaluateReceiptApiMicrocompactEditPlan(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptApiMicrocompactEditPlan.apply(null, arguments as any);
}

function extractGlobalAgentMemoryRecallFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractGlobalAgentMemoryRecallFromValue.apply(null, arguments as any);
}

export function collectTaskGlobalMemoryReceiptGates(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskGlobalMemoryReceiptGates.apply(null, arguments as any);
}

function extractGlobalMemoryHealthGateFromValue(value: any): any {
  return require("./collaboration-memory-gates").extractGlobalMemoryHealthGateFromValue.apply(null, arguments as any);
}

export function collectTaskGlobalMemoryHealthGates(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskGlobalMemoryHealthGates.apply(null, arguments as any);
}

function extractTypedMemoryRecallFromValue(value: any, depth = 0): any {
  return require("./collaboration-memory-gates").extractTypedMemoryRecallFromValue.apply(null, arguments as any);
}

function collectTaskTypedMemoryPressureRecallDocs(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskTypedMemoryPressureRecallDocs.apply(null, arguments as any);
}

function collectTaskTypedMemoryRecallDocs(task: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskTypedMemoryRecallDocs.apply(null, arguments as any);
}

function collectReceiptTypedMemoryUsageRows(receipt: any = {}) {
  return require("./collaboration-memory-gates").collectReceiptTypedMemoryUsageRows.apply(null, arguments as any);
}

export function configuredProjectWorkDir(project: string) {
  return require("./collaboration-memory-gates").configuredProjectWorkDir.apply(null, arguments as any);
}

function verifyTypedMemoryCurrentSourceEvidence(evidence: any = null, project = "", context: any = {}) {
  return require("./collaboration-memory-gates").verifyTypedMemoryCurrentSourceEvidence.apply(null, arguments as any);
}

function typedMemoryUsageStateFromReceipt(doc: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").typedMemoryUsageStateFromReceipt.apply(null, arguments as any);
}

export function collectTaskTypedMemoryConsumptionRows(task: any = {}, receipts: any[] = [], context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskTypedMemoryConsumptionRows.apply(null, arguments as any);
}

function typedMemoryPressureRecallDocRefs(doc: any = {}) {
  return require("./collaboration-memory-gates").typedMemoryPressureRecallDocRefs.apply(null, arguments as any);
}

function normalizeTypedMemoryPressureUsageState(value: any) {
  return require("./collaboration-memory-gates").normalizeTypedMemoryPressureUsageState.apply(null, arguments as any);
}

function collectReceiptMemoryProvenanceUsageRows(receipt: any = {}) {
  return require("./collaboration-memory-gates").collectReceiptMemoryProvenanceUsageRows.apply(null, arguments as any);
}

function pressureRecallUsageStateFromReceipt(doc: any = {}, receipt: any = {}) {
  return require("./collaboration-memory-gates").pressureRecallUsageStateFromReceipt.apply(null, arguments as any);
}

export function collectTaskTypedMemoryPressureRecallUsageRows(task: any = {}, receipts: any[] = [], context: any = {}) {
  return require("./collaboration-memory-gates").collectTaskTypedMemoryPressureRecallUsageRows.apply(null, arguments as any);
}

function normalizeGlobalMemoryUsageState(value: any) {
  return require("./collaboration-memory-gates").normalizeGlobalMemoryUsageState.apply(null, arguments as any);
}

function globalMemoryUsageSnippet(text: string, id: string) {
  return require("./collaboration-memory-gates").globalMemoryUsageSnippet.apply(null, arguments as any);
}

function collectReceiptGlobalMemoryUsageRows(receipt: any = {}) {
  return require("./collaboration-memory-gates").collectReceiptGlobalMemoryUsageRows.apply(null, arguments as any);
}

export function evaluateReceiptGlobalMemoryUsageGate(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptGlobalMemoryUsageGate.apply(null, arguments as any);
}

export function evaluateReceiptGlobalMemoryHealthGate(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-memory-gates").evaluateReceiptGlobalMemoryHealthGate.apply(null, arguments as any);
}

export function buildMemoryGateVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildMemoryGateVisibleSummary.apply(null, arguments as any);
}

export function buildGlobalMemoryReceiptVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildGlobalMemoryReceiptVisibleSummary.apply(null, arguments as any);
}

export function buildGlobalMemoryHealthGateVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildGlobalMemoryHealthGateVisibleSummary.apply(null, arguments as any);
}

export function buildReadPlanRevalidationGateVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildReadPlanRevalidationGateVisibleSummary.apply(null, arguments as any);
}

export function buildPostCompactReinjectionGateVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildPostCompactReinjectionGateVisibleSummary.apply(null, arguments as any);
}

export function buildApiMicrocompactReceiptVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildApiMicrocompactReceiptVisibleSummary.apply(null, arguments as any);
}

export function buildPostCompactDispatchMarkerVisibleSummary(summary: any = {}) {
  return require("./collaboration-memory-gates").buildPostCompactDispatchMarkerVisibleSummary.apply(null, arguments as any);
}

function receiptEvidenceStrings(...values: any[]) {
  return require("./collaboration-coordination-ux").receiptEvidenceStrings.apply(null, arguments as any);
}

function isConcreteReceiptFileEvidence(value: any) {
  return require("./collaboration-coordination-ux").isConcreteReceiptFileEvidence.apply(null, arguments as any);
}

function isConcreteReceiptActionEvidence(value: any) {
  return require("./collaboration-coordination-ux").isConcreteReceiptActionEvidence.apply(null, arguments as any);
}

export function evaluateChildAgentHandoffQuality(task: any, receipt: any = {}) {
  return require("./collaboration-coordination-ux").evaluateChildAgentHandoffQuality.apply(null, arguments as any);
}

export function scoreChildAgentReceipt(task: any, receipt: any = {}, context: any = {}) {
  return require("./collaboration-coordination-ux").scoreChildAgentReceipt.apply(null, arguments as any);
}

function buildCoordinationEventStream(task: any, summary: any = {}, executions: any[] = [], ackReview: any = null, contractTransfer: any = null, receiptRows: any[] = [], targetedRework: any[] = []) {
  return require("./collaboration-coordination-ux").buildCoordinationEventStream.apply(null, arguments as any);
}

export function compactRuntimeToolAudit(audit: any = {}) {
  return require("./collaboration-coordination-ux").compactRuntimeToolAudit.apply(null, arguments as any);
}

export function runtimeToolSnapshotFromAudit(audit: any = {}, allowedTools: any = {}) {
  return require("./collaboration-coordination-ux").runtimeToolSnapshotFromAudit.apply(null, arguments as any);
}

export function attachInvokedSkillsToReceipt(receipt: any, text: string, allowedTools: any = {}, audit: any = null) {
  return require("./collaboration-coordination-ux").attachInvokedSkillsToReceipt.apply(null, arguments as any);
}

export function collectRuntimeToolingFromSources(task: any = {}, execution: any = {}, lifecycle: any[] = [], receipts: any[] = []) {
  return require("./collaboration-coordination-ux").collectRuntimeToolingFromSources.apply(null, arguments as any);
}

export function buildRuntimeKernelSnapshot(task: any = {}, summary: any = {}) {
  return require("./collaboration-coordination-ux").buildRuntimeKernelSnapshot.apply(null, arguments as any);
}

function buildTargetedReworkSuggestions(task: any, summary: any = {}, acceptanceReview: any = null, receiptQualityRows: any[] = []) {
  return require("./collaboration-coordination-ux").buildTargetedReworkSuggestions.apply(null, arguments as any);
}

function buildChildAgentPlanReviewSummary(ackReview: any = {}, orders: any[] = []) {
  return require("./collaboration-coordination-ux").buildChildAgentPlanReviewSummary.apply(null, arguments as any);
}

function buildUserAgentCoordinationProtocol(task: any, summary: any = {}, executions: any[] = [], workOrderPreview: any = null, acceptanceReview: any = null) {
  return require("./collaboration-coordination-ux").buildUserAgentCoordinationProtocol.apply(null, arguments as any);
}

function buildUserReceiptReworkSummary(task: any, summary: any = {}, agentCoordination: any = null) {
  return require("./collaboration-coordination-ux").buildUserReceiptReworkSummary.apply(null, arguments as any);
}

export function buildUserCoordinationAcknowledgement(task: any, assignments: any[] = []) {
  return require("./collaboration-coordination-ux").buildUserCoordinationAcknowledgement.apply(null, arguments as any);
}

export function sanitizeDispatchLaunchText(value: any, fallback = "", max = 220) {
  return require("./collaboration-coordination-ux").sanitizeDispatchLaunchText.apply(null, arguments as any);
}

export function normalizeGroupDispatchLaunchRowStatus(rawValue: any = "dispatched") {
  return require("./collaboration-coordination-ux").normalizeGroupDispatchLaunchRowStatus.apply(null, arguments as any);
}

export function buildDispatchLaunchSummary(input: {
  task?: any;
  goal?: any;
  assignments?: any[];
  dispatchPolicy?: any;
  mode?: string;
  taskId?: string;
}) {
  return require("./collaboration-task-intake").buildDispatchLaunchSummary(input);
}

export function buildRevisedPlanModeDraft(planMode: any = {}, feedback = "") {
  return require("./collaboration-task-intake").buildRevisedPlanModeDraft(planMode, feedback);
}

export function buildAcceptedPlanModeDraft(planMode: any = {}, feedback = "", acceptedAt = new Date().toISOString()) {
  return require("./collaboration-task-intake").buildAcceptedPlanModeDraft(planMode, feedback, acceptedAt);
}

export function classifyGroupProjectTaskIntent(message: string, uploadedFiles: any[] = []) {
  return require("./collaboration-task-intake").classifyGroupProjectTaskIntent(message, uploadedFiles);
}

export function normalizeGroupAgentGatewayTaskIntent(fallback: any, coordinatorResult: any, messageMode = "conversation") {
  return require("./collaboration-task-intake").normalizeGroupAgentGatewayTaskIntent(fallback, coordinatorResult, messageMode);
}

export async function classifyGroupProjectTaskIntentWithAgent(input: {
  group: any;
  message: string;
  uploadedFiles?: any[];
  isOrchestrated?: boolean;
  messageMode?: string;
  forceProjectTask?: boolean;
  sharedFilesContext?: string;
  groupSessionId?: string;
  group_session_id?: string;
}) {
  return require("./collaboration-task-intake").classifyGroupProjectTaskIntentWithAgent(input);
}

export function shouldUseProjectAnalysisMode(input: { isOrchestrated?: boolean; messageMode?: string; taskIntent?: any }) {
  return require("./collaboration-task-intake").shouldUseProjectAnalysisMode(input);
}

export function shouldCreatePersistentGroupTask(input: { isOrchestrated?: boolean; messageMode?: string; taskIntent?: any; forceProjectTask?: boolean }) {
  return require("./collaboration-task-intake").shouldCreatePersistentGroupTask(input);
}

export function classifyPlanModeRisk(message: string, group: any, taskIntent: any = {}, attachmentCount = 0) {
  return require("./collaboration-task-intake").classifyPlanModeRisk(message, group, taskIntent, attachmentCount);
}
