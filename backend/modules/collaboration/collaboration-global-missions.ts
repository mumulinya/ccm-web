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
  CollabCtx,
  TASK_WATCHDOG_STALE_MS,
  appendGlobalMissionSupervisorTimeline,
  buildGlobalGroupTestAgentOwnership,
  buildTaskGapContinuationDraft,
  classifyTaskContinuation,
  compactFormText,
  continueTaskWithMessage,
  createTask,
  enqueueTask,
  getGlobalDirectDispatchMeta,
  getGlobalMissionChildDeliveryEvidence,
  getMissionDependencyRefs,
  getTaskAgeMs,
  globalMissionChildGatePassed,
  hasStrongTaskAcceptanceEvidence,
  isRecoverableRuntimeFailure,
  isTaskQueuedInMemory,
  missionChildMatchesRef,
  normalizeContinuationKind,
  refreshGlobalMissionParentInTaskList,
  removeTaskFromQueues,
  retryTask,
  runningTaskIds,
  splitUserAcceptanceText,
  targetProjectForMissionTarget,
  updateTask,
  validateDailyDevGroupReady,
} from "./collaboration";

export function getGlobalDirectDispatchContinuationKey(task: any) {
  const state = task?.collaboration_state || {};
  const last = state.last_continuation || task?.last_continuation || null;
  const interruption = state.goal_revision_interruption || {};
  const kind = normalizeContinuationKind(last?.kind || last?.rework_kind || "");
  const replanRequired = kind === "revise_goal"
    || last?.replan_required === true
    || task?.plan_revision_required === true
    || interruption.requested === true;
  if (!replanRequired && !last?.at && !interruption.requested_at) return "";
  const reason = compactMemoryText(last?.reason || interruption.reason || task?.status_detail || "", 220);
  return [
    task?.id || "",
    kind || "continuation",
    Number(task?.followup_revision || 0),
    last?.at || "",
    interruption.requested_at || "",
    reason,
  ].filter(Boolean).join("|");
}

export function shouldNotifyGlobalDirectDispatchContinuation(task: any, previousStatus = "") {
  const meta = getGlobalDirectDispatchMeta(task);
  if (!meta) return false;
  if (!String(meta.session_id || "").trim()) return false;
  if (["done", "cancelled", "failed"].includes(String(task?.status || "").toLowerCase())) return false;
  if (["done", "cancelled"].includes(String(previousStatus || "").toLowerCase())) return false;
  const key = getGlobalDirectDispatchContinuationKey(task);
  if (!key) return false;
  if (String(meta.continuation_notified_key || "") === key) return false;
  return true;
}

export function buildGlobalDirectDispatchContinuationMessage(task: any) {
  const state = task?.collaboration_state || {};
  const last = state.last_continuation || task?.last_continuation || {};
  const interruption = state.goal_revision_interruption || {};
  const kind = normalizeContinuationKind(last?.kind || last?.rework_kind || "");
  const reason = compactMemoryText(last?.reason || interruption.reason || task?.status_detail || "用户补充了新的要求，我会重新核对计划。", 360);
  const route = interruption.requested && !interruption.resolved_at
    ? "正在停止当前执行轮，避免子 Agent 继续旧方向。"
    : kind === "revise_goal" || last?.replan_required === true || task?.plan_revision_required === true
      ? "会先按最新要求重新核对目标、范围和验收标准，再继续派发或验收。"
      : "会把补充要求接到同一个任务里继续处理。";
  return [
    "你派发到群聊主 Agent 的任务收到新的补充要求。",
    "",
    reason ? `- 最新要求：${reason}` : "",
    `- 当前处理：${route}`,
    "- 结果口径：这还不是完成结果；最终仍以群聊任务卡的计划、执行、验收和最终总结为准。",
    "",
    "底层执行记录、子 Agent 工作包和排障信息仍保留在群聊任务卡的技术详情里。",
  ].filter(Boolean).join("\n");
}

export function shouldNotifyGlobalDirectDispatchCompletion(task: any, previousStatus = "") {
  const meta = getGlobalDirectDispatchMeta(task);
  if (!meta) return false;
  if (meta.completion_notified_at) return false;
  if (!String(meta.session_id || "").trim()) return false;
  if (previousStatus === "done") return false;
  if (String(task?.status || "") !== "done") return false;
  if (!hasStrongTaskAcceptanceEvidence(task, [], task?.delivery_summary || {})) return false;
  return true;
}

export function buildGlobalDirectDispatchCompletionMessage(task: any) {
  const report = buildTaskDeliveryReport(task, task?.delivery_summary || {}, "done", task?.status_detail || "任务已完成");
  return [
    "你派发到群聊主 Agent 的任务已经通过验收。",
    "",
    report.markdown,
    "",
    "我已把这份最终总结同步回全局 Agent 会话。底层执行记录和排障信息仍保留在群聊任务卡的技术详情里。",
  ].join("\n");
}

export function shouldNotifyGlobalDirectDispatchRollback(task: any, previousStatus = "") {
  const meta = getGlobalDirectDispatchMeta(task);
  if (!meta) return false;
  if (meta.rollback_notified_at) return false;
  if (!String(meta.session_id || "").trim()) return false;
  if (String(task?.status || "") !== "cancelled") return false;
  if (!task?.rolled_back_at && task?.delivery_summary?.reverted !== true) return false;
  if (previousStatus === "cancelled" && task?.delivery_summary?.reverted !== true) return false;
  return true;
}

export function buildGlobalDirectDispatchRollbackMessage(task: any) {
  const summary = task?.delivery_summary || {};
  const rollbackCount = Array.isArray(task?.rollback_results) ? task.rollback_results.length : 0;
  const reason = compactMemoryText(task?.rollback_reason || summary.rollback_reason || "用户发起安全撤销", 280);
  return [
    "你派发到群聊主 Agent 的任务已安全撤销。",
    "",
    rollbackCount ? `- 撤销结果：已恢复 ${rollbackCount} 个任务检查点，最近一轮改动不再视为已交付。` : "- 撤销结果：最近一轮改动不再视为已交付。",
    reason ? `- 撤销原因：${reason}` : "",
    "- 后续处理：如果你还要继续这个需求，我会重新读取当前代码状态，再重新规划、派发和验收。",
    "",
    "技术执行记录仍保留在群聊任务卡的技术详情里，用户可见区只保留这份结论。",
  ].filter(Boolean).join("\n");
}

export function refreshGlobalDevelopmentMissions() {
  const tasks = loadTasks();
  const parents = tasks.filter((item: any) => item.workflow_type === "global_mission");
  for (const parent of parents) refreshGlobalMissionParentInTaskList(tasks, parent.id);
  saveTasks(tasks);
  return parents.map((parent: any) => tasks.find((item: any) => item.id === parent.id));
}

export function getGlobalDevelopmentMission(id: string) {
  refreshGlobalDevelopmentMissions();
  const tasks = loadTasks();
  const mission = tasks.find((item: any) => item.id === id && item.workflow_type === "global_mission");
  if (!mission) return null;
  return {
    mission,
    children: tasks.filter((item: any) => item.parent_task_id === id),
  };
}

export function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options: any = {}) {
  const initial = getGlobalDevelopmentMission(id);
  if (!initial) return { success: false, error: "全局任务不存在", terminal: true };
  const maxAttempts = Math.max(1, Math.min(20, Number(options.max_attempts || options.maxAttempts || 3)));
  const staleMs = Math.max(30_000, Number(options.stale_ms || options.staleMs || TASK_WATCHDOG_STALE_MS));
  const autoMerge = options.auto_merge !== false && options.autoMerge !== false;
  const actions: any[] = [];
  const waitingUser: any[] = [];
  const childByRef = (ref: string) => initial.children.find((item: any) => missionChildMatchesRef(item, ref));
  const dependencyGraph = new Map(initial.children.map((child: any) => [child.id, getMissionDependencyRefs(child).map(ref => childByRef(ref)?.id).filter(Boolean)]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();
  const visit = (taskId: string, stack: string[] = []) => {
    if (visiting.has(taskId)) {
      const start = stack.indexOf(taskId);
      for (const idInCycle of stack.slice(Math.max(0, start))) cyclic.add(idInCycle);
      cyclic.add(taskId);
      return;
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependencyId of dependencyGraph.get(taskId) || []) visit(dependencyId, [...stack, taskId]);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const child of initial.children) visit(child.id);

  for (const child of initial.children) {
    if (cyclic.has(child.id)) {
      waitingUser.push({ task_id: child.id, reason: "检测到循环依赖，需要用户修改目标依赖或人工接管" });
      actions.push({ type: "dependency_cycle", task_id: child.id, dependencies: dependencyGraph.get(child.id) || [] });
      continue;
    }
    const dependencyRefs = getMissionDependencyRefs(child);
    const dependencies = dependencyRefs.map(ref => ({ ref, task: childByRef(ref) }));
    const unknownDependencies = dependencies.filter(item => !item.task).map(item => item.ref);
    const blockingDependencies = dependencies.filter(item => item.task && !globalMissionChildGatePassed(item.task));
    if (unknownDependencies.length > 0) {
      waitingUser.push({ task_id: child.id, reason: `找不到前置依赖：${unknownDependencies.join("、")}` });
      actions.push({ type: "dependency_invalid", task_id: child.id, dependencies: unknownDependencies });
      continue;
    }
    if (blockingDependencies.length > 0) {
      actions.push({ type: "dependency_wait", task_id: child.id, dependencies: blockingDependencies.map(item => item.task.id) });
      continue;
    }

    const attempts = Math.max(
      Number(child.retry_count || 0),
      Number(child.auto_gap_continue_count || 0),
    );
    if (child.status === "done") {
      const evidence = getGlobalMissionChildDeliveryEvidence(child);
      if (evidence.merge_required && !evidence.merge_passed && autoMerge) {
        for (const executionId of evidence.merge_pending_execution_ids) {
          try {
            const result = mergeExecutionWorktree(executionId, {
              commit: true,
              message: `chore: 合并全局任务 ${id} 的交付变更`,
            });
            actions.push({ type: "worktree_merged", task_id: child.id, execution_id: executionId, result });
          } catch (error: any) {
            if (attempts >= maxAttempts) {
              waitingUser.push({ task_id: child.id, reason: `自动合并失败且已达到返工上限：${error?.message || error}` });
              actions.push({ type: "merge_failed", task_id: child.id, execution_id: executionId, error: error?.message || String(error) });
            } else {
              const message = `全局 Agent 最终合并失败：${error?.message || error}。请调查跨 Agent 冲突，在原任务会话中解决冲突、重新运行验证并提交完整结构化回执。`;
              const result = continueTaskWithMessage(child.id, message, ctx, {
                source: "mission_supervisor_gap_rework",
                auto_execute: true,
                idempotency_key: `${id}:merge:${executionId}:${attempts + 1}`,
                status_detail: "全局 Agent 检测到合并冲突，已按缺口返工",
              });
              actions.push({ type: "merge_conflict_rework", task_id: child.id, execution_id: executionId, result: { success: result.success, queued: result.queued }, error: error?.message || String(error) });
            }
          }
        }
      } else if (!globalMissionChildGatePassed(child)) {
        if (attempts >= maxAttempts) {
          waitingUser.push({ task_id: child.id, reason: "交付验收未通过且已达到自动返工上限" });
        } else {
          const result = continueTaskWithMessage(child.id, buildTaskGapContinuationDraft(child), ctx, {
            source: "mission_supervisor_gap_rework",
            auto_execute: true,
            idempotency_key: `${id}:gate:${child.id}:${attempts + 1}`,
            status_detail: "全局 Agent 检测到交付证据缺口，已自动返工",
          });
          actions.push({ type: "gate_gap_rework", task_id: child.id, result: { success: result.success, queued: result.queued } });
        }
      }
      continue;
    }

    if (child.status === "failed") {
      if (attempts >= maxAttempts) {
        waitingUser.push({ task_id: child.id, reason: child.status_detail || child.result || "子任务失败且已达到自动重试上限" });
      } else {
        const runtimeFailure = isRecoverableRuntimeFailure(child);
        const result = runtimeFailure
          ? retryTask(child.id, ctx, `全局任务 ${id} 持续跟进检测到执行器异常，恢复原生会话或切换执行器后重试`, true)
          : continueTaskWithMessage(child.id, `全局 Agent 检测到本轮失败：${child.status_detail || child.result || "未知失败"}。请先调查根因，只针对失败缺口返工，保留已完成成果，重新运行相关验证并提交结构化回执。`, ctx, {
              source: "mission_supervisor_failure_rework",
              auto_execute: true,
              idempotency_key: `${id}:failure:${child.id}:${attempts + 1}`,
              status_detail: "全局 Agent 已按失败根因要求自动返工",
            });
        actions.push({ type: runtimeFailure ? "runtime_recovery" : "failure_rework", task_id: child.id, result: { success: result.success, queued: result.queued } });
      }
      continue;
    }

    if (child.status === "cancelled") {
      waitingUser.push({ task_id: child.id, reason: "子任务已取消" });
      continue;
    }

    if (child.status === "pending" && !isTaskQueuedInMemory(child.id) && !runningTaskIds.has(child.id)) {
      if (child.auto_execute === false) {
        waitingUser.push({ task_id: child.id, reason: "子任务配置为手动启动，等待用户确认派发" });
        actions.push({ type: "manual_dispatch_required", task_id: child.id });
        continue;
      }
      const result = enqueueTask(child.id, ctx);
      actions.push({ type: dependencyRefs.length ? "dependency_released" : "queue_recovered", task_id: child.id, result });
      continue;
    }

    if (child.status === "in_progress" && !runningTaskIds.has(child.id) && getTaskAgeMs(child) >= staleMs) {
      if (attempts >= maxAttempts) {
        waitingUser.push({ task_id: child.id, reason: "子任务执行超时且已达到恢复上限" });
      } else {
        const result = retryTask(child.id, ctx, `全局任务 ${id} 持续跟进检测到执行中断或超时`, true);
        actions.push({ type: "stalled_recovery", task_id: child.id, result: { success: result.success, queued: result.queued } });
      }
    }
  }

  const current = getGlobalDevelopmentMission(id)!;
  const summary = current.mission.mission_summary || {};
  const terminal = summary.all_passed === true;
  if (actions.length > 0 || terminal || waitingUser.length > 0) {
    appendTraceEvent(current.mission.trace_id, {
      id: `mission:${id}:supervisor:${Date.now()}`,
      type: terminal ? "mission.delivery_completed" : "mission.supervisor_cycle",
      status: terminal ? "ok" : waitingUser.length ? "warning" : "info",
      task_id: id,
      message: terminal ? "全局任务全部交付验收通过" : `持续跟进执行 ${actions.length} 个动作，${waitingUser.length} 项需要人工处理`,
      data: { actions, waiting_user: waitingUser, summary },
    });
    appendGlobalMissionSupervisorTimeline(current.mission, actions, waitingUser, terminal);
  }
  return {
    success: true,
    mission: current.mission,
    children: current.children,
    terminal,
    waiting_user: waitingUser,
    actions,
  };
}

export async function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload: any = {}) {
  const current = getGlobalDevelopmentMission(id);
  if (!current) return { success: false, status: 404, error: "全局任务不存在" };
  const op = String(operation || "").toLowerCase();
  const now = new Date().toISOString();
  if (!["pause", "resume", "cancel", "takeover", "update_goal"].includes(op)) {
    return { success: false, status: 400, error: `不支持的全局任务操作：${operation}` };
  }

  if (op === "update_goal") {
    const previousGoal = compactFormText(current.mission.business_goal || current.mission.description || current.mission.title, "");
    const requestedGoal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal, "");
    const acceptance = compactFormText(payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria, current.mission.acceptance_criteria || "");
    const continuation = payload.continuation && typeof payload.continuation === "object" ? payload.continuation : null;
    const source = compactFormText(continuation?.source || payload.source || "mission_supervisor_goal_update", "mission_supervisor_goal_update");
    const continuationMessage = compactFormText(
      payload.message
        || payload.followup
        || continuation?.message
        || continuation?.reason
        || continuation?.detail
        || payload.reason,
      "",
    );
    const reworkKind = compactFormText(continuation?.rework_kind || continuation?.reworkKind || "", "");
    const requestedKind = String(
      payload.continuation_kind
        || payload.continuationKind
        || continuation?.kind
        || continuation?.continuation_kind
        || "",
    ).trim();
    const isNextWorkItem = reworkKind === "next_claimable_work_item"
      || /next_work_item|user_next_work_item/i.test(`${source} ${reworkKind}`);
    const inferredKind = requestedKind && requestedKind !== "auto"
      ? normalizeContinuationKind(requestedKind)
      : isNextWorkItem
        ? "supplement"
        : classifyTaskContinuation(continuationMessage || (requestedGoal ? `目标调整为：${requestedGoal}` : "补充当前全局任务"));
    if (inferredKind === "new_task") {
      return { success: false, status: 409, error: "这条要求看起来是独立新任务，请新建全局任务，不会混入当前持续跟进。" };
    }
    const continuationKind = normalizeContinuationKind(inferredKind);
    const goal = requestedGoal || [
      previousGoal,
      continuationMessage ? `${continuationKind === "revise_goal" ? "目标调整" : "补充要求"}：${continuationMessage}` : "",
    ].filter(Boolean).join("\n");
    const followup = [
      continuationKind === "revise_goal" ? "全局目标已调整，请停止旧方向并重新核对计划。" : "全局任务收到补充要求，请并入当前任务继续处理。",
      continuationMessage ? `用户最新要求：${continuationMessage}` : "",
      goal ? `当前全局目标：${goal}` : "",
      `验收标准：${acceptance || "沿用原标准"}`,
    ].filter(Boolean).join("\n");
    const continuationResults: any[] = [];
    for (const child of current.children) {
      if (["cancelled"].includes(child.status)) continue;
      const result = continueTaskWithMessage(child.id, followup, ctx, {
        source,
        continuationKind,
        interrupt_current_run: continuationKind === "revise_goal",
        rework_kind: reworkKind,
        target: continuation?.target || continuation?.agent || continuation?.project || child.target_project || "",
        reason: continuationMessage || continuation?.reason || payload.reason || "",
        title: continuation?.title || continuation?.label || (continuationKind === "revise_goal" ? "全局目标调整" : "全局任务补充"),
        work_item_id: continuation?.work_item_id || continuation?.workItemId || "",
        status_detail: continuationKind === "revise_goal"
          ? "目标调整已接收；旧执行轮正在停止，随后会按新目标重新规划"
          : "补充要求已接收；继续当前任务链路",
        idempotencyKey: payload.request_id || payload.requestId
          ? `${payload.request_id || payload.requestId}:${child.id}`
          : "",
      });
      if (result.success) {
        updateTask(child.id, {
          business_goal: goal,
          acceptance_criteria: acceptance,
          global_mission_goal_updated_at: now,
          global_mission_continuation_kind: continuationKind,
        });
      }
      continuationResults.push({
        task_id: child.id,
        target: child.target_project || child.mission_target?.name || "",
        success: result.success === true,
        queued: result.queued === true,
        deferred: result.deferred === true,
        interrupted_current_run: result.interrupted_current_run === true,
        interruption_success: result.interruption?.success !== false,
        continuation_kind: result.continuation_kind || continuationKind,
        error: result.error || result.interruption?.error || "",
      });
    }
    const continuationSummary = {
      schema: "ccm-global-mission-continuation-summary-v1",
      kind: continuationKind,
      source,
      replan_required: continuationKind === "revise_goal",
      interrupt_current_run: continuationKind === "revise_goal",
      affected_task_count: continuationResults.filter(item => item.success).length,
      queued_task_count: continuationResults.filter(item => item.queued).length,
      deferred_task_count: continuationResults.filter(item => item.deferred).length,
      interruption_requested_count: continuationResults.filter(item => item.interrupted_current_run).length,
      interrupted_task_count: continuationResults.filter(item => item.interrupted_current_run && item.interruption_success).length,
      interruption_failed_count: continuationResults.filter(item => item.interrupted_current_run && !item.interruption_success).length,
      failed_task_count: continuationResults.filter(item => !item.success).length,
      results: continuationResults,
      at: now,
    };
    const statusDetail = isNextWorkItem
      ? "已接上全局任务的下一步派发，我会继续跟进"
      : continuationKind === "revise_goal"
        ? continuationSummary.interruption_requested_count > 0
          ? `目标调整已接收；已停止 ${continuationSummary.interruption_requested_count} 个旧执行轮，正在按新目标重新规划`
          : "目标调整已接收；正在按新目标重新规划"
        : `补充要求已接收；已同步 ${continuationSummary.affected_task_count} 个子任务，继续当前任务链路`;
    const continuationState = {
      ...(current.mission.collaboration_state || {}),
      phase: "reworking",
      needs_user: false,
      last_continuation: {
        source,
        at: now,
        automatic: false,
        kind: continuationKind,
        status: continuationSummary.interruption_requested_count > 0 ? "interrupting" : "accepted",
        replan_required: continuationSummary.replan_required,
        interrupt_current_run: continuationSummary.interrupt_current_run,
        rework_kind: reworkKind,
        target: compactFormText(continuation?.target || continuation?.agent || continuation?.project || "", ""),
        reason: continuationMessage,
        title: compactFormText(continuation?.title || continuation?.label || "", ""),
        work_item_id: compactFormText(continuation?.work_item_id || continuation?.workItemId || "", ""),
        affected_task_count: continuationSummary.affected_task_count,
        queued_task_count: continuationSummary.queued_task_count,
        deferred_task_count: continuationSummary.deferred_task_count,
        interrupted_task_count: continuationSummary.interrupted_task_count,
        failed_task_count: continuationSummary.failed_task_count,
      },
      continuation_events: [
        ...(Array.isArray(current.mission.collaboration_state?.continuation_events) ? current.mission.collaboration_state.continuation_events : []),
        {
          source,
          at: now,
          kind: continuationKind,
          status: continuationSummary.interruption_requested_count > 0 ? "interrupting" : "accepted",
          replan_required: continuationSummary.replan_required,
          interrupt_current_run: continuationSummary.interrupt_current_run,
          rework_kind: reworkKind,
          target: compactFormText(continuation?.target || continuation?.agent || continuation?.project || "", ""),
          reason: continuationMessage,
          title: compactFormText(continuation?.title || continuation?.label || "", ""),
          work_item_id: compactFormText(continuation?.work_item_id || continuation?.workItemId || "", ""),
          affected_task_count: continuationSummary.affected_task_count,
          queued_task_count: continuationSummary.queued_task_count,
          deferred_task_count: continuationSummary.deferred_task_count,
          interrupted_task_count: continuationSummary.interrupted_task_count,
          failed_task_count: continuationSummary.failed_task_count,
        },
      ].slice(-20),
      continuation_summary: continuationSummary,
      updated_at: now,
    };
    updateTask(id, {
      business_goal: goal,
      description: goal,
      acceptance_criteria: acceptance,
      status_detail: statusDetail,
      collaboration_state: continuationState,
      plan_revision_required: continuationKind === "revise_goal",
      last_goal_revision_at: continuationKind === "revise_goal" ? now : current.mission.last_goal_revision_at,
      followup_revision: Number(current.mission.followup_revision || 0) + 1,
    });
    appendTaskTimelineEvent(id, {
      type: isNextWorkItem ? "next_work_item_dispatch" : continuationKind === "revise_goal" ? "global_mission_goal_revision" : "global_mission_supplement",
      title: isNextWorkItem ? "全局任务下一步派发已接上" : continuationKind === "revise_goal" ? "目标调整已接收" : "补充要求已接收",
      detail: compactMemoryText(statusDetail, 260),
      status: continuationSummary.failed_task_count > 0 ? "warn" : "active",
      phase: "rework",
      agent: compactFormText(continuation?.target || "", ""),
      data: {
        source,
        kind: continuationKind,
        work_item_id: continuation?.work_item_id || continuation?.workItemId || "",
        continuation_summary: continuationSummary,
      },
    });
    appendTraceEvent(current.mission.trace_id, {
      id: `mission:${id}:continuation:${Date.now()}`,
      type: continuationKind === "revise_goal" ? "mission.goal_revised" : "mission.requirement_supplemented",
      status: continuationSummary.failed_task_count > 0 ? "warning" : "ok",
      task_id: id,
      message: statusDetail,
      data: continuationSummary,
    });
    return {
      success: true,
      operation: op,
      continuation_kind: continuationKind,
      continuation_summary: continuationSummary,
      ...getGlobalDevelopmentMission(id),
    };
  } else if (op === "cancel") {
    for (const child of current.children) {
      if (["done", "cancelled"].includes(child.status)) continue;
      removeTaskFromQueues(child.id);
      const reason = compactFormText(payload.reason, "用户取消全局任务");
      requestTaskCancellation(child.id, reason, String(payload.actor || "global-agent"));
      cancelTestAgentRunsForTask(child.id, reason);
      const running = runningTaskIds.has(child.id);
      updateTask(child.id, { status: running ? "in_progress" : "cancelled", status_detail: running ? "全局任务取消请求已发送，正在终止执行" : "随全局任务取消", cancellation_requested_at: now, cancellation_reason: reason });
      await ctx.onTaskStatusChange?.(child, running ? "cancelling" : "cancelled", reason);
    }
    updateTask(id, { status: "cancelled", status_detail: compactFormText(payload.reason, "全局任务已取消"), cancelled_at: now });
  } else {
    const paused = op === "pause" || op === "takeover";
    for (const child of current.children) {
      if (["done", "cancelled"].includes(child.status)) continue;
      updateTask(child.id, { is_paused: paused, paused, status_detail: paused ? (op === "takeover" ? "已转为人工接管" : "我已暂停后续调度") : "我已恢复后续调度" });
      if (paused) removeTaskFromQueues(child.id);
    }
    updateTask(id, {
      is_paused: paused,
      paused,
      supervisor_control: { mode: op === "takeover" ? "manual" : paused ? "paused" : "automatic", updated_at: now, actor: payload.actor || "user" },
      status_detail: op === "takeover" ? "用户已人工接管，自动跟进停止操作" : paused ? "全局任务跟进已暂停" : "全局任务跟进已恢复",
    });
  }
  return { success: true, operation: op, ...getGlobalDevelopmentMission(id) };
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
  const target = input.target || {};
  const targetProject = target.type === "group" ? target.coordinator : target.project;
  const dependencyRefs = Array.isArray(target.depends_on || target.dependsOn)
    ? (target.depends_on || target.dependsOn)
    : (target.depends_on || target.dependsOn ? [target.depends_on || target.dependsOn] : []);
  const handoff = buildSelfContainedWorkerHandoff({
    group: target.type === "group" ? input.group : null,
    project: targetProject || target.name || "target-agent",
    task: [
      `全局任务：${input.businessGoal}`,
      `本目标任务：${input.childGoal}`,
      target.type === "group"
        ? `目标群聊：${target.name || target.group_id}；由群聊主 Agent ${target.coordinator || "coordinator"} 继续拆分、派发和验收。`
        : `目标项目：${target.project || target.name}；由项目 Agent 直接执行、验证并回执。`,
      dependencyRefs.length ? `前置依赖：${dependencyRefs.join("、")}` : "",
    ].filter(Boolean).join("\n"),
    userGoal: input.businessGoal,
    source: "全局主 Agent",
    reason: target.reason || "全局主 Agent 根据用户目标和目标职责分派",
    traceId: input.traceId,
    taskId: input.parent?.id || "",
    analysis: {
      summary: input.businessGoal,
      documentFindings: splitUserAcceptanceText(input.sourceDocuments || ""),
      constraints: [
        `这是全局任务 ${input.parent?.id || ""} 的子任务；必须向全局 Agent 提供可审计交付证据。`,
        "最终完成不能只靠口头说明，必须有实际产出、验证和主 Agent 复盘证据。",
      ],
    },
    dependencies: dependencyRefs.map((ref: any) => ({ project: ref, reason: "全局任务前置依赖" })),
    verificationHints: [],
    acceptance: splitUserAcceptanceText(input.acceptance),
    requiresCodeChanges: target.requires_code_changes !== false,
    allowedScope: [
      target.type === "group"
        ? `只在 ${target.name || target.group_id} 群聊及其成员项目职责范围内推进`
        : `只在 ${target.project || target.name} 项目职责范围内推进`,
      "围绕本目标任务完成实现、验证和交付证据",
      "如发现依赖其他目标，写入 blockers/needs，由全局 Agent 协调",
    ],
    forbiddenScope: [
      "不要修改与本目标无关的项目或模块",
      "不要绕过全局任务依赖顺序",
      "不要把已派发/正在执行说成已完成",
    ],
    doneCriteria: [
      "目标覆盖：说明本目标如何满足全局任务的一部分",
      "交付证据：列出实际文件/配置/文档变更或说明无需变更的依据",
      "验证证据：列出已执行验证，失败时先修复或明确阻塞",
      "全局汇总：回执里保留风险、待确认事项和依赖消费情况，方便全局 Agent 最终总结",
    ],
  });
  return {
    ...handoff,
    global_mission: {
      mission_id: input.parent?.id || "",
      target_type: target.type,
      target_name: target.name || target.project || target.group_id || "",
      priority: input.priority || "normal",
      depends_on: dependencyRefs,
    },
  };
}

export function normalizeGlobalMissionTargetRequirements(payload: any, target: any) {
  const requiresCodeChanges = target?.requires_code_changes
    ?? target?.requiresCodeChanges
    ?? payload?.requires_code_changes
    ?? payload?.requiresCodeChanges
    ?? true;
  const requiresVerification = target?.requires_verification
    ?? target?.requiresVerification
    ?? payload?.requires_verification
    ?? payload?.requiresVerification
    ?? true;
  const requiresIndependentReview = target?.requires_independent_review
    ?? target?.requiresIndependentReview
    ?? payload?.requires_independent_review
    ?? payload?.requiresIndependentReview
    ?? (requiresCodeChanges !== false);
  return {
    requires_code_changes: requiresCodeChanges !== false,
    requires_verification: requiresVerification !== false,
    requires_independent_review: requiresIndependentReview !== false,
  };
}

export function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx) {
  const missionIdempotencyKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
  if (missionIdempotencyKey) {
    const existingParent = loadTasks().find((item: any) => item.workflow_type === "global_mission" && item.idempotency_key === missionIdempotencyKey);
    if (existingParent) {
      const taskMap = new Map(loadTasks().map((item: any) => [item.id, item]));
      return { success: true, duplicate: true, mission: existingParent, children: (existingParent.child_task_ids || []).map((id: string) => ({ task: taskMap.get(id) })).filter((item: any) => item.task), rejected: [] };
    }
  }
  const missionTraceId = ensureTraceId(payload.trace_id || payload.traceId, "mission");
  const groups = loadGroups();
  const configs = getConfigs();
  const requestedTargets = Array.isArray(payload.targets) ? payload.targets : [];
  const fallbackTarget = groups[0]
    ? [{ type: "group", group_id: groups[0].id, reason: "未明确目标，交由默认开发群聊主 Agent分析" }]
    : [];
  const targets = (requestedTargets.length > 0 ? requestedTargets : fallbackTarget)
    .map((item: any) => ({
      ...item,
      ...normalizeGlobalMissionTargetRequirements(payload, item),
      type: String(item.type || item.target_type || (item.group_id || item.groupId ? "group" : "project")).toLowerCase(),
      group_id: item.group_id || item.groupId || "",
      project: item.project || item.project_name || item.projectName || "",
      task: item.task || item.instructions || item.message || "",
      reason: item.reason || "",
    }));

  const resolved: any[] = [];
  const rejected: any[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (target.type === "group") {
      const group = groups.find((item: any) => item.id === target.group_id || item.name === target.group_id);
      if (!group) {
        rejected.push({ target, reason: "群聊不存在" });
        continue;
      }
      let readiness: any;
      try {
        readiness = validateDailyDevGroupReady(group);
      } catch (error: any) {
        rejected.push({ target, reason: error.message });
        continue;
      }
      const key = `group:${group.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push({
        ...target,
        type: "group",
        group_id: group.id,
        name: group.name || group.id,
        coordinator: readiness.coordinator.project,
        ownership_chain: buildGlobalGroupTestAgentOwnership(),
      });
      continue;
    }
    const config = configs.find((item: any) => item.name === target.project);
    if (!config) {
      rejected.push({ target, reason: "项目不存在" });
      continue;
    }
    const candidateGroups = groups.filter((group: any) =>
      (group.members || []).some((member: any) => String(member?.project || "").trim() === config.name)
    );
    const requestedGroupId = String(target.group_id || target.groupId || "").trim();
    const orderedGroups = requestedGroupId
      ? [
          ...candidateGroups.filter((group: any) => group.id === requestedGroupId || group.name === requestedGroupId),
          ...candidateGroups.filter((group: any) => group.id !== requestedGroupId && group.name !== requestedGroupId),
        ]
      : candidateGroups;
    let selectedGroup: any = null;
    let selectedReadiness: any = null;
    for (const group of orderedGroups) {
      try {
        selectedReadiness = validateDailyDevGroupReady(group);
        selectedGroup = group;
        break;
      } catch {}
    }
    if (!selectedGroup || !selectedReadiness) {
      rejected.push({
        target,
        reason: `项目 ${config.name} 尚未加入可执行的协作群，无法交给群聊主 Agent 完成计划、验收和 TestAgent 复核`,
      });
      continue;
    }
    const key = `group:${selectedGroup.id}:project:${config.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push({
      ...target,
      type: "group",
      group_id: selectedGroup.id,
      name: selectedGroup.name || selectedGroup.id,
      coordinator: selectedReadiness.coordinator.project,
      requested_target_type: "project",
      requested_project: config.name,
      project: config.name,
      ownership_chain: buildGlobalGroupTestAgentOwnership(),
    });
  }
  if (resolved.length === 0) {
    throw new Error(rejected[0]?.reason || "没有可分派的群聊主 Agent或项目 Agent");
  }

  const title = compactFormText(payload.title, compactFormText(payload.business_goal || payload.businessGoal, "全局开发任务").slice(0, 80));
  const businessGoal = compactFormText(payload.business_goal || payload.businessGoal || payload.goal || title, title);
  const acceptance = compactFormText(
    payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria,
    "所有子任务必须完成实际代码变更和已执行验证；群聊主 Agent与项目 Agent交付验收全部通过后，全局 Agent才能报告完成。"
  );
  const sourceDocuments = compactFormText(payload.documents || payload.source_documents || payload.sourceDocuments, "");
  const sourceAttachments = Array.isArray(payload.source_attachments || payload.sourceAttachments)
    ? (payload.source_attachments || payload.sourceAttachments)
    : [];
  const requirementExtraction = payload.requirement_extraction || payload.requirementExtraction || null;
  const sourceIngestion = payload.source_ingestion || payload.sourceIngestion || null;
  const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
  const parent = createTask({
    title,
    description: businessGoal,
    target_project: "global-agent",
    assign_type: "global",
    priority: payload.priority || "normal",
    auto_execute: false,
    workflow_type: "global_mission",
    business_goal: businessGoal,
    acceptance_criteria: acceptance,
    source_documents: sourceDocuments,
    source_attachments: sourceAttachments,
    requirement_extraction: requirementExtraction,
    source_ingestion: sourceIngestion,
    requires_code_changes: resolved.some((item: any) => item.requires_code_changes !== false),
    requires_verification: true,
    requires_independent_review: resolved.some((item: any) => item.requires_independent_review === true),
    mission_plan: {
      execution_order: payload.execution_order || payload.executionOrder || "parallel",
      targets: resolved,
      rejected,
      created_at: new Date().toISOString(),
    },
    workflow_meta: {
      intake: {
        source: payload.source || "global-agent",
        created_at: new Date().toISOString(),
        attachment_count: sourceAttachments.length,
        requirement_extraction: requirementExtraction,
        source_ingestion: sourceIngestion,
      },
      global_control: {
        owner_agent: "global-agent",
        state: "dispatching",
      },
    },
    trace_id: missionTraceId,
    idempotency_key: missionIdempotencyKey || null,
  });
  appendTaskTimelineEvent(parent.id, {
    type: "global_mission_plan",
    title: "全局 Agent生成跨项目总计划",
    detail: `已识别 ${resolved.length} 个执行目标`,
    status: "active",
    phase: "planning",
    agent: "global-agent",
    data: { targets: resolved, rejected },
  });

  const children: any[] = [];
  const targetHandoffs: any[] = [];
  for (const target of resolved) {
    const childGoal = compactFormText(target.task, businessGoal);
    const childTitle = compactMemoryText(`${title} - ${target.name}`, 100);
    const targetGroup = target.type === "group" ? groups.find((item: any) => item.id === target.group_id) : null;
    const missionHandoff = buildGlobalMissionTargetHandoff({
      parent,
      target,
      group: targetGroup,
      businessGoal,
      childGoal,
      acceptance,
      sourceDocuments,
      traceId: missionTraceId,
      priority: payload.priority || "normal",
    });
    const missionHandoffSummary = summarizeWorkerHandoffForUser(missionHandoff);
    const child = createTask({
      title: childTitle,
      description: buildDailyDevTaskDescription({
        title: childTitle,
        business_goal: childGoal,
        scope: target.reason || payload.scope || "由目标 Agent根据总任务识别负责范围",
        documents: sourceDocuments,
        acceptance,
        constraints: `这是全局任务 ${parent.id} 的子任务；必须向全局 Agent提供可审计交付证据。`,
      }),
      target_project: target.type === "group" ? target.coordinator : target.project,
      group_id: target.type === "group" ? target.group_id : null,
      assign_type: target.type === "group" ? "group" : "project",
      priority: payload.priority || "normal",
      auto_execute: autoExecute,
      workflow_type: "daily_dev",
      business_goal: childGoal,
      acceptance_criteria: acceptance,
      source_documents: sourceDocuments,
      source_attachments: sourceAttachments,
      requirement_extraction: requirementExtraction,
      source_ingestion: sourceIngestion,
      requires_code_changes: target.requires_code_changes,
      requires_verification: target.requires_verification,
      requires_independent_review: target.requires_independent_review,
      parent_task_id: parent.id,
      global_mission_id: parent.id,
      mission_target: target,
      mission_handoff: missionHandoff,
      mission_dependencies: Array.isArray(target.depends_on || target.dependsOn)
        ? (target.depends_on || target.dependsOn)
        : (target.depends_on || target.dependsOn ? [target.depends_on || target.dependsOn] : []),
      workflow_meta: {
        global_mission: {
          parent_task_id: parent.id,
          owner_agent: "global-agent",
          target_type: target.type,
          target_name: target.name,
          handoff: missionHandoffSummary,
          requirement_extraction: requirementExtraction,
          source_ingestion: sourceIngestion,
        },
      },
      trace_id: missionTraceId,
      idempotency_key: missionIdempotencyKey ? `${missionIdempotencyKey}:target:${target.type}:${target.group_id || target.project}` : null,
    });
    targetHandoffs.push({ ...missionHandoffSummary, child_task_id: child.id, target_type: target.type, target_name: target.name || target.project || target.group_id || "" });
    recordAgentRuntimeLifecycle({
      scope: target.type === "group" ? "group" : "worker",
      traceId: missionTraceId,
      taskId: child.id,
      groupId: target.type === "group" ? target.group_id : "",
      agent: "global-agent",
      action: "dispatch_worker",
      phase: "global_mission_handoff",
      risk: "agent",
      target: targetProjectForMissionTarget(target),
      status: "planned",
      message: `我已为 ${target.name || target.project || target.group_id} 生成子任务交接包`,
      data: { worker_handoff: missionHandoffSummary, worker_context_packet: missionHandoff.worker_context_packet, global_mission_id: parent.id },
    });
    appendTaskTimelineEvent(child.id, {
      type: "global_mission_handoff_ready",
      title: "我已补齐子任务交接",
      detail: target.reason || "目标、范围、依赖、验收和全局汇总要求已打包",
      status: autoExecute ? "active" : "pending",
      phase: "dispatching",
      agent: "global-agent",
      data: { parent_task_id: parent.id, target, mission_handoff: missionHandoffSummary, worker_context_packet: missionHandoff.worker_context_packet },
    });
    const hasDependencies = Array.isArray(child.mission_dependencies) && child.mission_dependencies.length > 0;
    const queueResult = autoExecute && !hasDependencies
      ? enqueueTask(child.id, ctx)
      : { queued: false, message: hasDependencies ? "子任务已创建，等待前置依赖通过交付验收" : "子任务已创建，等待手动启动" };
    children.push({ task: child, target, queue_result: queueResult });
  }

  const updatedParent = updateTask(parent.id, {
    status: "in_progress",
    child_task_ids: children.map((item: any) => item.task.id),
    status_detail: `全局 Agent已向 ${children.length} 个目标派发子任务`,
    mission_plan: {
      ...(parent.mission_plan || {}),
      target_handoffs: targetHandoffs,
      handoff_schema: "ccm-self-contained-worker-handoff-v1",
    },
  }) || parent;
  refreshGlobalDevelopmentMissions();
  return {
    success: true,
    mission: getGlobalDevelopmentMission(updatedParent.id)?.mission || updatedParent,
    children,
    rejected,
  };
}