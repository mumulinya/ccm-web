// Behavior-freeze split from collaboration-runtime-plan-tools.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 7/9).
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
  AGENT_PROBE_STATUS_FILE,
  AGENT_PROBE_TARGET_STATUS_DIR,
  AGENT_RUNNER_DIR,
  buildDispatchLaunchSummary,
  classifyGroupProjectTaskIntent,
} from "./collaboration-runtime-task-queue";

import {
  taskRequiresCodeChanges,
  uniqueStrings,
} from "./collaboration-runtime-status-helpers";

import {
  runAgentCliProbe,
} from "./collaboration-runtime-daily-dev";

import {
  buildGroupMainAgentInternalLoop,
  buildMainAgentPermissionJudgement,
  buildMainAgentPlanVerificationReminder,
  buildUserVisiblePlanStep,
  mainAgentPlanStepStatus,
  normalizeMainAgentActionIds,
} from "./collaboration-runtime-coordinator-review";

import {
  getProjectVerificationHintDetail,
} from "./collaboration-runtime-runtime-tools";

import {
  buildRunnerFixHint,
  getAgentProbeHealth,
  getAgentProbeTargetStatusKey,
  getExecutableProbeTargetsFromDevGroup,
  readRunnerJson,
  summarizeAgentProbeTargets,
} from "./collaboration-runtime-plan-tools-part-01";

export function getTaskAgentExecutionReadiness(task: any) {
  return require("./collaboration-agent-probes").getTaskAgentExecutionReadiness(task);
}

export function getExternalAgentRunnerStatus() {
  const runnerDir = path.join(CCM_DIR, "agent-runner");
  const heartbeatFile = path.join(runnerDir, "heartbeat.json");
  const requestsDir = path.join(runnerDir, "requests");
  const resultsDir = path.join(runnerDir, "results");
  let heartbeat: any = null;
  try {
    if (fs.existsSync(heartbeatFile)) heartbeat = readRunnerJson(heartbeatFile);
  } catch {}
  const updatedAt = heartbeat?.updated_at ? Date.parse(heartbeat.updated_at) : 0;
  const ageMs = updatedAt ? Date.now() - updatedAt : null;
  const pid = heartbeat?.pid ? Number(heartbeat.pid) : 0;
  let processAlive = false;
  if (pid > 0) {
    try {
      process.kill(pid, 0);
      processAlive = true;
    } catch {
      processAlive = false;
    }
  }
  const activeWindowMs = heartbeat?.status === "running" ? 10 * 60 * 1000 : 15000;
  const active = !!heartbeat && processAlive && ageMs !== null && ageMs < activeWindowMs && heartbeat.status !== "error";
  const listJsonFiles = (dir: string) => {
    try { return fs.existsSync(dir) ? fs.readdirSync(dir).filter(file => file.endsWith(".json")) : []; } catch { return []; }
  };
  const requestFiles = listJsonFiles(requestsDir);
  const resultFiles = listJsonFiles(resultsDir);
  const resultIds = new Set(resultFiles.map(file => file.replace(/\.json$/, "")));
  const pendingRequests = requestFiles.filter(file => !resultIds.has(file.replace(/\.json$/, ""))).length;
  let lastResult: any = null;
  try {
    if (fs.existsSync(resultsDir)) {
      const latest = resultFiles
        .map(file => {
          const full = path.join(resultsDir, file);
          const stat = fs.statSync(full);
          return { file, full, mtimeMs: stat.mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
      if (latest) {
        const data = readRunnerJson(latest.full);
        lastResult = {
          id: data?.id || latest.file.replace(/\.json$/, ""),
          success: data?.success !== false,
          error: String(data?.error || "").slice(0, 500),
          output: String(data?.output || "").slice(0, 500),
          agentType: data?.agentType || "",
          command: data?.command || getAgentCommandLabel(data?.agentType || ""),
          exitCode: data?.exitCode ?? null,
          runner: data?.runner || "",
          completed_at: data?.completed_at || new Date(latest.mtimeMs).toISOString(),
          age_ms: Date.now() - latest.mtimeMs,
        };
        lastResult.hint = buildRunnerFixHint(lastResult.error || lastResult.output, lastResult.agentType || "");
      }
    }
  } catch {}
  return {
    active,
    status: heartbeat?.status || "missing",
    detail: heartbeat?.detail || "",
    pid: pid || null,
    process_alive: processAlive,
    updated_at: heartbeat?.updated_at || "",
    age_ms: ageMs,
    pending_requests: pendingRequests,
    requests: requestFiles.length,
    results: resultFiles.length,
    last_result: lastResult,
  };
}

export function buildAgentProbeMatrix(devGroups: any[]) {
  const targets = devGroups.flatMap((group: any) => (group.members || []).map((member: any) => {
    const target = {
      group_id: group.id,
      group_name: group.name || group.id,
      project: member.project,
      agent_type: member.agentType || member.agent || "claudecode",
      work_dir: member.workDir || "",
    };
    const fallbackRow = member.configured && member.workDirExists && member.workDirWritable
      ? summarizeAgentProbeTargets([{ ...target, requires_write: true }]).rows[0]
      : null;
    const probe = fallbackRow?.probe || null;
    const probeHealth = fallbackRow?.probeHealth || getAgentProbeHealth(probe);
    const taskReadiness = member.configured && member.workDirExists && member.workDirWritable
      ? {
        ready: fallbackRow?.ready === true,
        mode: fallbackRow?.fallback_active ? "fallback-agent-cli-probe" : "agent-cli-probe",
        message: fallbackRow?.ready
          ? (fallbackRow?.fallback_active
            ? `默认执行器不可用，备用执行器 ${fallbackRow.effective_agent_type} 已通过真实写入探针`
            : "目标执行器已通过真实写入探针")
          : (probeHealth.message || "目标项目 Agent 尚未通过探针"),
        fix_actions: [],
      }
      : {
        ready: false,
        mode: "member-not-executable",
        message: !member.configured
          ? "项目 Agent 未配置执行器或工作目录"
          : (!member.workDirExists ? "项目 Agent 工作目录不存在" : "项目 Agent 工作目录不可写"),
      };
    const status = taskReadiness.ready === true
      ? "ok"
      : (member.configured && member.workDirExists && member.workDirWritable ? "warn" : "fail");
    return {
      key: getAgentProbeTargetStatusKey(target),
      status,
      ready: taskReadiness.ready === true,
      group_id: group.id,
      group_name: group.name || group.id,
      project: member.project,
      role: member.role || "member",
      agent_type: target.agent_type,
      effective_agent_type: fallbackRow?.effective_agent_type || target.agent_type,
      fallback_active: fallbackRow?.fallback_active === true,
      runtime_candidates: fallbackRow?.runtime_candidates || [],
      command: getAgentCommandLabel(fallbackRow?.effective_agent_type || target.agent_type),
      configured: !!member.configured,
      workDir: member.workDir || "",
      workDirExists: !!member.workDirExists,
      workDirWritable: !!member.workDirWritable,
      probe,
      probeHealth,
      readiness: {
        ready: taskReadiness.ready === true,
        mode: taskReadiness.mode || "",
        message: taskReadiness.message || probeHealth.message || "",
        fix_actions: Array.isArray(taskReadiness.fix_actions) ? taskReadiness.fix_actions : [],
      },
      checked_at: probe?.checked_at || "",
      age_ms: probe?.age_ms ?? null,
      message: taskReadiness.ready === true
        ? "目标项目 Agent 可执行 daily_dev"
        : (taskReadiness.message || probeHealth.message || "目标项目 Agent 尚未通过探针"),
    };
  }));
  const executable = targets.filter((target: any) => target.configured && target.workDirExists && target.workDirWritable);
  const ready = executable.filter((target: any) => target.ready);
  const stale = executable.filter((target: any) => target.probeHealth?.status === "stale_ok" || target.probeHealth?.status === "stale_failed");
  const missing = executable.filter((target: any) => target.probeHealth?.status === "missing");
  const failedRecent = executable.filter((target: any) => target.probeHealth?.failureRecent);
  const groupSummaries = devGroups.map((group: any) => {
    const groupTargets = getExecutableProbeTargetsFromDevGroup(group);
    const summary = summarizeAgentProbeTargets(groupTargets);
    return {
      group_id: group.id,
      group_name: group.name || group.id,
      orchestratorEnabled: group.orchestratorEnabled !== false,
      executable: summary.total,
      ready: summary.ready,
      missing: summary.missing,
      stale: summary.stale,
      failed_recent: summary.failed_recent,
      all_ready: summary.allReady,
      targets: summary.rows.map((row: any) => ({
        project: row.project,
        agent_type: row.agent_type,
        effective_agent_type: row.effective_agent_type || row.agent_type,
        fallback_active: row.fallback_active === true,
        ready: row.ready,
        probe_status: row.probeHealth?.status || "missing",
      })),
    };
  });
  const fullyReadyGroups = groupSummaries.filter((group: any) => group.orchestratorEnabled && group.executable > 0 && group.all_ready);
  return {
    total: targets.length,
    executable: executable.length,
    ready: ready.length,
    blocked: targets.filter((target: any) => !target.ready).length,
    missing: missing.length,
    stale: stale.length,
    failed_recent: failedRecent.length,
    group_total: groupSummaries.length,
    group_ready: fullyReadyGroups.length,
    groups: groupSummaries,
    targets,
  };
}

export function buildDailyDevAgentDiagnostics() {
  return require("./collaboration-agent-probes").buildDailyDevAgentDiagnostics();
}

function getAgentProbeBatchTargets(payload: any = {}) {
  const diagnostics = buildDailyDevAgentDiagnostics();
  const includeReady = !!(payload.include_ready || payload.includeReady);
  const onlyMissing = !!(payload.only_missing || payload.onlyMissing);
  const groupId = String(payload.group_id || payload.groupId || "").trim();
  const requestedTargets = Array.isArray(payload.targets) ? payload.targets : [];
  const requestedKeys = new Set(requestedTargets.map((target: any) => [
    String(target.group_id || target.groupId || "").trim(),
    String(target.target_member || target.targetMember || target.project || "").trim(),
  ].filter(Boolean).join("::")).filter(Boolean));
  const limit = Math.max(1, Math.min(20, Number(payload.limit || requestedTargets.length || 3)));
  const targets = (diagnostics.agent_probe_matrix?.targets || [])
    .filter((target: any) => target.configured && target.workDirExists && target.workDirWritable)
    .filter((target: any) => !groupId || target.group_id === groupId)
    .filter((target: any) => {
      if (requestedKeys.size === 0) return true;
      return requestedKeys.has(`${target.group_id}::${target.project}`) || requestedKeys.has(target.group_id) || requestedKeys.has(target.project);
    })
    .filter((target: any) => includeReady || !target.ready)
    .filter((target: any) => !onlyMissing || target.probeHealth?.status === "missing")
    .slice(0, limit);
  return { targets, diagnostics, limit, includeReady, onlyMissing };
}

export async function runAgentCliProbeBatch(payload: any, ctx: CollabCtx) {
  const selection = getAgentProbeBatchTargets(payload);
  const timeoutMs = Number(payload.timeout_ms || payload.timeoutMs || 120000);
  const dryRun = !!(payload.dry_run || payload.dryRun);
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      total: selection.targets.length,
      passed: 0,
      failed: 0,
      skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
      limit: selection.limit,
      include_ready: selection.includeReady,
      only_missing: selection.onlyMissing,
      auto_resume: false,
      resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
      targets: selection.targets.map((target: any) => ({
        group_id: target.group_id,
        group_name: target.group_name,
        project: target.project,
        agent_type: target.agent_type,
        command: target.command,
        probe_status: target.probeHealth?.status || "missing",
      })),
      probe_matrix: selection.diagnostics.agent_probe_matrix,
      message: selection.targets.length === 0 ? "没有需要批量复检的可执行项目 Agent" : `将复检 ${selection.targets.length} 个项目 Agent`,
    };
  }
  const results: any[] = [];
  for (const target of selection.targets) {
    const result = await runAgentCliProbe({
      ...payload,
      group_id: target.group_id,
      target_member: target.project,
      timeout_ms: timeoutMs,
      source: "agent-cli-probe-batch",
    }, ctx);
    results.push({
      group_id: target.group_id,
      group_name: target.group_name,
      project: target.project,
      agent_type: target.agent_type,
      success: !!result?.success,
      blocked: !!result?.blocked,
      message: result?.message || result?.error || "",
      result,
    });
  }
  const after = buildDailyDevAgentDiagnostics();
  return {
    success: results.some((item: any) => item.success),
    total: selection.targets.length,
    passed: results.filter((item: any) => item.success).length,
    failed: results.filter((item: any) => !item.success).length,
    skipped: Math.max(0, (selection.diagnostics.agent_probe_matrix?.targets || []).length - selection.targets.length),
    limit: selection.limit,
    include_ready: selection.includeReady,
    only_missing: selection.onlyMissing,
    timeout_ms: timeoutMs,
    auto_resume: false,
    resume_hint: "本接口只检查 Agent CLI 执行通道；如需恢复等待任务，请单独调用恢复自动任务入口。",
    results,
    probe_matrix: after.agent_probe_matrix,
    message: results.length === 0
      ? "没有需要批量复检的可执行项目 Agent"
      : `批量复检完成：通过 ${results.filter((item: any) => item.success).length}/${results.length}`,
  };
}

export interface CollabCtx {
  PORT: number;
  callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<string>;
  callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
  setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number, metadata?: any) => void;
  broadcastPetSpeech: (agent: string, payload: any) => void;
  createFileChangeSnapshot: (workDir: string) => any;
  getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
  recordMetric: (agent: string, data: any) => void;
  toolManager: any;
  buildUploadedFilesContext: (files: any[], title?: string) => string;
  summarizeUploadedFiles: (files: any[]) => string;
  buildFilesContext: (files: any[], title?: string) => string;
  collectRequestBuffer: (req: any) => Promise<Buffer>;
  getMultipartBoundary: (contentType: string) => string;
  parseMultipart: (buffer: Buffer, boundary: string) => any;
  getSharedFilePath: (name: string) => string;
  createSharedFileRecord: (name: string, source?: string) => any;
  normalizeSharedFileList: (files: any[]) => any[];
  onTaskStatusChange?: (task: any, status: string, result?: string) => void | Promise<void>;
}

export function buildCoordinatorSharedFilesContext(ctx: CollabCtx, group: any) {
  const content = ctx.buildFilesContext(
    group?.shared_files || [],
    "以下是群聊共享文档/文件（主 Agent 拆分任务时必须读取，并在子 Agent 工作单中引用相关文档、接口、字段、业务规则或验收要求）："
  );
  return content.trim() ? content : undefined;
}

export function buildTaskSourceDocumentsContext(task: any) {
  const lines = [
    "[任务级业务/接口文档]",
    task?.business_goal || task?.businessGoal ? `业务目标：${compactMemoryText(task.business_goal || task.businessGoal, 600)}` : "",
    task?.acceptance_criteria || task?.acceptanceCriteria ? `验收标准：${compactMemoryText(task.acceptance_criteria || task.acceptanceCriteria, 800)}` : "",
    task?.source_documents || task?.sourceDocuments ? `关联文档：${compactMemoryText(task.source_documents || task.sourceDocuments, 1800)}` : "",
  ].filter(Boolean);
  return lines.length > 1 ? lines.join("\n") : "";
}

export function mergeCoordinatorDocumentContexts(...contexts: any[]) {
  const text = contexts
    .map((item: any) => String(item || "").trim())
    .filter(Boolean)
    .join("\n\n");
  return text || undefined;
}

export function runCollaborationProtocolSelfTest() {
  return require("./collaboration-protocol-self-tests").runCollaborationProtocolSelfTest();
}

function normalizeToolSelection(tools: any = {}) {
  return {
    mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x: any) => String(x || "").trim()).filter(Boolean) : [],
    skill: Array.isArray(tools.skill) ? tools.skill.map((x: any) => String(x || "").trim()).filter(Boolean) : [],
  };
}

function mergeToolSelections(...items: any[]) {
  const merged = { mcp: new Set<string>(), skill: new Set<string>() };
  for (const item of items) {
    const normalized = normalizeToolSelection(item);
    for (const name of normalized.mcp) merged.mcp.add(name);
    for (const name of normalized.skill) merged.skill.add(name);
  }
  return {
    mcp: Array.from(merged.mcp),
    skill: Array.from(merged.skill),
  };
}

function getProjectToolSelection(projectName: string) {
  const configs = loadProjectConfigs();
  return normalizeToolSelection(configs?.[projectName]?.tools || {});
}

export function getProjectExtraConfig(projectName: string) {
  const configs = loadProjectConfigs();
  return configs?.[projectName] || {};
}

export function normalizeProjectConfigList(value: any): string[] {
  if (Array.isArray(value)) return value.map((item: any) => String(item || "").trim()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}

export function getProjectAgentCapabilityProfile(projectName: string, workDir = "") {
  const config = getProjectExtraConfig(projectName);
  const verification = getProjectVerificationHintDetail(projectName, workDir);
  const responsibility = String(config.responsibility || config.role_scope || config.roleScope || "").trim();
  const capabilities = normalizeProjectConfigList(config.capabilities || config.capability_tags || config.capabilityTags);
  const writablePaths = normalizeProjectConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths);
  const forbiddenPaths = normalizeProjectConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths);
  const deliveryContract = String(config.delivery_contract || config.deliveryContract || "").trim();
  return {
    project: projectName,
    configured: !!(responsibility || capabilities.length || writablePaths.length || forbiddenPaths.length || deliveryContract || verification.commands.length),
    responsibility,
    capabilities,
    writable_paths: writablePaths,
    forbidden_paths: forbiddenPaths,
    delivery_contract: deliveryContract,
    verification_source: verification.source,
    verification_commands: verification.commands,
    work_dir: workDir || "",
  };
}

function buildProjectAgentProfileContractLines(profile: any) {
  return require("./collaboration-coordination-ux").buildProjectAgentProfileContractLines.apply(null, arguments as any);
}

function normalizePolicyPath(value: any) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function policyPathMatches(filePath: string, pattern: string) {
  const file = normalizePolicyPath(filePath);
  const raw = normalizePolicyPath(pattern);
  if (!raw || raw === "**" || raw === "**/*" || raw === "*") return true;
  const prefix = raw.replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
  return file === prefix || file.startsWith(`${prefix}/`);
}

export function collectProjectPolicyViolations(actualFileChanges: any[] = [], evidenceExclusions: any[] = []) {
  const violations: any[] = [];
  const excludedPaths = new Set((evidenceExclusions || []).map((item: any) => normalizePolicyPath(typeof item === "string" ? item : item?.path)).filter(Boolean));
  for (const change of actualFileChanges || []) {
    const agent = String(change?.agent || "").trim();
    const filePath = normalizePolicyPath(change?.path);
    if (!agent || !filePath) continue;
    if (excludedPaths.has(filePath)) continue;
    const profile = getProjectAgentCapabilityProfile(agent);
    const writable = Array.isArray(profile.writable_paths) ? profile.writable_paths : [];
    const forbidden = Array.isArray(profile.forbidden_paths) ? profile.forbidden_paths : [];
    // These directories are generated by CCM while preparing native runtimes.
    // They are orchestration metadata, not an agent-authored project deliverable.
    if ([".claude", ".cursor", ".codex"].some(prefix => filePath === prefix || filePath.startsWith(`${prefix}/`))) continue;
    // Older evidence produced before the porcelain parser fix may be missing the
    // first character of a tracked path (for example `ackend/` -> `backend/`).
    // Reconcile only when it unambiguously matches a configured writable prefix.
    const repairedPath = writable.reduce((current: string, pattern: string) => {
      if (current !== filePath) return current;
      const prefix = normalizePolicyPath(pattern).replace(/\/\*\*?$/g, "").replace(/\*+$/g, "");
      if (prefix.length > 1 && (filePath === prefix.slice(1) || filePath.startsWith(`${prefix.slice(1)}/`))) {
        return `${prefix[0]}${filePath}`;
      }
      return current;
    }, filePath);
    const forbiddenMatch = forbidden.find((pattern: string) => policyPathMatches(repairedPath, pattern));
    if (forbiddenMatch) {
      violations.push({ agent, path: repairedPath, rule: "forbidden_paths", pattern: forbiddenMatch, message: `${agent} 修改了禁止范围 ${forbiddenMatch}: ${repairedPath}` });
      continue;
    }
    const hasStrictWritable = writable.length > 0 && !writable.some((pattern: string) => ["**", "**/*", "*"].includes(normalizePolicyPath(pattern)));
    if (hasStrictWritable && !writable.some((pattern: string) => policyPathMatches(repairedPath, pattern))) {
      violations.push({ agent, path: repairedPath, rule: "writable_paths", pattern: writable.join("; "), message: `${agent} 文件变更不在允许写入范围: ${repairedPath}` });
    }
  }
  return violations;
}

export function buildAgentToolContext(ctx: CollabCtx, group: any, projectName: string, taskText = "") {
  const selectedRoleSkills = selectRoleSkills("project-child-agent", taskText, { forceWork: true, phase: "execution" });
  const allowedTools = normalizeToolAuthorization(mergeToolSelections(
    group?.tools || {},
    getProjectToolSelection(projectName),
    { skill: selectedRoleSkills.map(skill => skill.name) },
  ));
  const prompt = [
    buildSelectedSkillUsageDirective(selectedRoleSkills),
    ctx.toolManager.buildToolPrompt(allowedTools),
  ].filter(Boolean).join("\n\n");
  const toolAudit = typeof ctx.toolManager.buildScopeAudit === "function" ? ctx.toolManager.buildScopeAudit(allowedTools) : null;
  const authorizationReadiness = buildAuthorizationReadiness(toolAudit, allowedTools);
  return {
    prompt,
    allowedTools,
    toolAudit,
    authorizationReadiness,
    selectedRoleSkills: selectedRoleSkills.map(skill => ({ name: skill.name, kind: skill.kind, reason: skill.reason })),
  };
}
