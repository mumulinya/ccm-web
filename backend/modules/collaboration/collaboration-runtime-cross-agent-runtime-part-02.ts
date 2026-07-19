// Behavior-freeze split from collaboration-runtime-cross-agent-runtime.ts (part 2/2).
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
  coordinationAuditHas,
  evaluateCoordinationImplementationReceipt,
  evaluateCoordinationTaskEvidence,
  getCoordinationQaForRequest,
  getCoordinationRequestForTask,
  handleAgentQaRequests,
  resumeAgentQaFromStoredContinuation,
} from "./collaboration-runtime-cross-agent-runtime-part-01";

export function markGroupCoordinationDependencyStarted(task: any, workspace: any, session: any) {
  if (task?.workflow_type !== "agent_coordination_dependency") return null;
  const request = getCoordinationRequestForTask(task);
  if (!request || ["resumed", "failed", "cancelled", "timeout"].includes(request.status)) return request;
  const qa = getCoordinationQaForRequest(request.id);
  const execution = {
    mode: "parallel_isolated_native_session",
    target_project: task.target_project || request.target_hint || "",
    work_item_task_id: task.id,
    task_agent_session_id: session?.id || "",
    native_session_id: session?.nativeSessionId || "",
    agent_type: session?.agentType || "",
    workspace_mode: workspace?.mode || "",
    worktree_path: workspace?.worktreePath || "",
    worktree_branch: workspace?.worktreeBranch || "",
    original_work_dir: workspace?.originalWorkDir || "",
    started_at: new Date().toISOString(),
  };
  updateGroupCoordinationRequest(request.id, {
    status: "executing",
    resolution: { ...(request.resolution || {}), execution },
    auditType: coordinationAuditHas(request, "parallel_session_started") ? "parallel_session_heartbeat" : "parallel_session_started",
    auditDetail: `${task.target_project} 已在独立第三方 Agent 会话和 worktree 中并行执行`,
  });
  if (!coordinationAuditHas(request, "parallel_session_started")) {
    const runningQa = qa ? upsertAgentQaItem({
      ...qa,
      status: "executing",
      execution_mode: execution.mode,
      coordination_execution: execution,
      work_item_task_id: task.id,
      audit: [...(Array.isArray(qa.audit) ? qa.audit : []), { at: execution.started_at, type: "parallel_session_started", detail: `${task.target_project} 已在独立会话开始实现` }].slice(-30),
    }) : null;
    if (runningQa) appendGroupMessage(task.group_id, buildAgentQaMessage("progress", runningQa, `${task.target_project} 已在独立会话并行处理`));
    if (task.parent_task_id) appendTaskTimelineEvent(task.parent_task_id, {
      type: "coordination_parallel_session_started",
      title: `${task.target_project} 已在独立会话开始处理`,
      detail: "该协作工作项与目标 Agent 的原有会话并行运行，完成后由主 Agent 验收和合并",
      status: "active",
      phase: "waiting_dependency",
      agent: task.target_project,
      data: { coordination_request_id: request.id, execution },
    });
    appendTaskTimelineEvent(task.id, {
      type: "coordination_isolated_workspace_ready",
      title: "独立会话和工作区已准备",
      detail: `${session?.agentType || "第三方 Agent"} 已启动，代码修改已与其他会话隔离`,
      status: "ok",
      phase: "executing",
      agent: task.target_project,
      data: execution,
    });
    safeAddGroupLog(task.group_id, "info", "agent_coordination", `${task.target_project} 已在独立会话并行处理协作依赖`, { coordination_request_id: request.id, execution });
  }
  return execution;
}

export function buildRejectedCoordinationAcceptance(task: any, request: any, receipt: any, reason: string) {
  const base = evaluateCoordinationImplementationReceipt(receipt, request);
  const gaps = uniqueStrings([...(base.gaps || []), reason]).filter(Boolean);
  return {
    ...base,
    status: "needs_evidence",
    accepted: false,
    score: Math.min(Number(base.score || 0), 50),
    gaps,
    reason: `正式工作项尚未通过验收：${gaps.join("；")}`,
  };
}

export async function settleGroupCoordinationDependency(task: any, ctx: CollabCtx, streamRes: any = null) {
  if (task?.workflow_type !== "agent_coordination_dependency") return { handled: false, reason: "not_coordination_dependency" };
  const request = getCoordinationRequestForTask(task);
  if (!request) return { handled: false, reason: "coordination_request_missing" };
  if (request.status === "resumed") return { handled: true, duplicate: true, status: "resumed" };
  if (request.status === "merge_conflict" && task.status === "failed") {
    return { handled: true, pending: true, status: "merge_conflict", reason: task.status_detail || "等待处理代码合并冲突" };
  }
  if (coordinationSettlementInFlight.has(request.id)) return { handled: true, duplicate: true, status: "settling" };
  coordinationSettlementInFlight.add(request.id);
  try {
    const qa = getCoordinationQaForRequest(request.id);
    if (!qa) return { handled: false, reason: "coordination_qa_missing" };
    if (request.status === "resolved" && qa.status === "resumed") {
      updateGroupCoordinationRequest(request.id, { status: "resumed", auditType: "source_agent_resume_reconciled", auditDetail: "重启恢复时已确认原 Agent 会话此前完成续跑" });
      return { handled: true, duplicate: true, accepted: true, resumed: true, status: "resumed" };
    }
    if (request.status === "resolved" && qa.acceptance?.accepted) {
      const group = loadGroups().find((item: any) => item.id === task.group_id);
      if (!group) return { handled: true, accepted: true, resumed: false, reason: "group_missing" };
      const wakeup = await resumeAgentQaFromStoredContinuation(qa, group, ctx, streamRes);
      updateGroupCoordinationRequest(request.id, {
        status: wakeup.resumed ? "resumed" : "resolved",
        auditType: wakeup.resumed ? "source_agent_resumed_after_restart" : "source_agent_resume_waiting",
        auditDetail: wakeup.resumed ? "服务恢复后，原 Agent 已收到合并结果并继续原任务" : wakeup.reason || "原 Agent 暂未恢复，等待自动重试",
      });
      return { handled: true, accepted: true, resumed: wakeup.resumed, wakeup, reason: wakeup.reason };
    }
    const execution = loadExecution(task.id);
    const receipt = task.receipt || execution?.receipt || null;
    const hasReturned = ["done", "failed", "cancelled"].includes(String(task.status || ""))
      || (!!receipt && !runningTaskIds.has(task.id) && !isTaskQueuedInMemory(task.id));
    if (!hasReturned) return { handled: true, pending: true, status: task.status };

    let acceptance: any = evaluateCoordinationTaskEvidence(task, request, receipt, execution);
    if (task.status !== "done") {
      acceptance = buildRejectedCoordinationAcceptance(task, request, receipt, `执行状态为 ${task.status || "unknown"}`);
    }
    updateGroupCoordinationRequest(request.id, {
      status: "evidence_review",
      resolution: { ...(request.resolution || {}), target_project: task.target_project, work_item_task_id: task.id, receipt, acceptance },
      auditType: "evidence_review",
      auditDetail: acceptance.reason,
    });
    if (task.parent_task_id) appendTaskTimelineEvent(task.parent_task_id, {
      type: "coordination_evidence_review",
      title: `主 Agent 正在验收 ${task.target_project} 的协作结果`,
      detail: acceptance.accepted ? "代码变更和验证证据已齐全，准备安全合并" : acceptance.reason,
      status: acceptance.accepted ? "active" : "warn",
      phase: "reviewing",
      agent: "coordinator",
      data: { coordination_request_id: request.id, work_item_task_id: task.id, acceptance },
    });

    let mergeResult: any = { required: false, success: true };
    if (acceptance.accepted && execution?.workspace?.mode === "worktree") {
      const mergingQa = upsertAgentQaItem({
        ...qa,
        status: "merging",
        work_item_task_id: task.id,
        acceptance,
        coordination_execution: { ...(qa.coordination_execution || {}), workspace: execution.workspace },
      });
      updateGroupCoordinationRequest(request.id, {
        status: "merging",
        auditType: "worktree_merge_started",
        auditDetail: `主 Agent 开始把 ${task.target_project} 的已验证变更安全合并回项目`,
      });
      if (!coordinationAuditHas(request, "worktree_merge_started")) {
        appendGroupMessage(task.group_id, buildAgentQaMessage("progress", mergingQa, "实现和验证已完成，正在安全合并代码"));
      }
      try {
        mergeResult = mergeExecutionWorktree(task.id, {
          message: `feat: complete coordination dependency ${task.id}`,
          mergeMessage: `merge: coordination dependency ${task.id}`,
        });
        if (!loadExecution(task.id)?.workspace?.cleanedAt) {
          try { cleanupExecutionWorktree(task.id); } catch (cleanupError: any) {
            addTaskLog(task.id, "warning", `协作 worktree 已合并但清理失败：${cleanupError?.message || cleanupError}`);
          }
        }
      } catch (error: any) {
        mergeResult = { required: true, success: false, error: error?.message || String(error) };
        acceptance = buildRejectedCoordinationAcceptance(task, request, receipt, `代码安全合并失败：${mergeResult.error}`);
        updateTask(task.id, { status: "failed", status_detail: acceptance.reason, merge_result: mergeResult });
        updateGroupCoordinationRequest(request.id, {
          status: "merge_conflict",
          resolution: { ...(request.resolution || {}), receipt, acceptance, merge: mergeResult },
          auditType: "worktree_merge_failed",
          auditDetail: acceptance.reason,
        });
      }
    }

    const latestQa = getCoordinationQaForRequest(request.id) || qa;
    const completedQa = upsertAgentQaItem({
      ...latestQa,
      status: acceptance.accepted ? "answered" : "rejected",
      answer: compactMemoryText(receipt?.summary || acceptance.reason, 4000),
      answer_evidence: acceptance.evidence,
      acceptance: { ...acceptance, merge: mergeResult },
      work_item_task_id: task.id,
      answered_at: new Date().toISOString(),
      audit: [...(Array.isArray(latestQa.audit) ? latestQa.audit : []), { at: new Date().toISOString(), type: acceptance.accepted ? "work_item_accepted" : "work_item_rejected", detail: acceptance.reason }].slice(-30),
    });
    appendGroupMessage(task.group_id, buildAgentQaMessage("answer", completedQa, completedQa.answer));
    emitAgentQaEvent(streamRes, "answer", completedQa, completedQa.answer);
    appendAgentQaTrace(task.parent_task_id || "", "agent.coordination.work_item_review", completedQa, acceptance.reason, acceptance.accepted ? "ok" : "warn", { coordination_request_id: request.id, work_item_task_id: task.id, acceptance, merge: mergeResult });

    const sourceTask = getTaskById(task.parent_task_id || "");
    if (sourceTask) updateTask(sourceTask.id, {
      collaboration_state: {
        ...(sourceTask.collaboration_state || {}),
        phase: acceptance.accepted ? "executing" : "waiting_dependency",
        dependency_status: acceptance.accepted ? "accepted" : "rejected",
        dependency_task_id: task.id,
        coordination_request_id: request.id,
        merge_result: mergeResult,
        updated_at: new Date().toISOString(),
      },
      status_detail: acceptance.accepted ? `${task.target_project} 的协作代码已验收并合并，正在恢复原任务` : acceptance.reason,
    });
    if (task.parent_task_id) appendTaskTimelineEvent(task.parent_task_id, {
      type: acceptance.accepted ? "coordination_dependency_merged" : "coordination_dependency_rejected",
      title: acceptance.accepted ? `${task.target_project} 的协作代码已验收并合并` : `${task.target_project} 的协作结果需要处理`,
      detail: acceptance.reason,
      status: acceptance.accepted ? "ok" : "warn",
      phase: acceptance.accepted ? "executing" : "waiting_dependency",
      agent: "coordinator",
      data: { coordination_request_id: request.id, work_item_task_id: task.id, acceptance, merge: mergeResult },
    });
    if (!acceptance.accepted) {
      const mergeConflict = mergeResult?.required === true && mergeResult?.success === false;
      updateGroupCoordinationRequest(request.id, { status: mergeConflict ? "merge_conflict" : "failed", auditType: mergeConflict ? "merge_conflict_waiting_rework" : "acceptance_failed", auditDetail: acceptance.reason });
      return { handled: true, accepted: false, acceptance, merge: mergeResult };
    }

    updateGroupCoordinationRequest(request.id, {
      status: "resolved",
      resolution: { ...(request.resolution || {}), receipt, acceptance, merge: mergeResult },
      auditType: "resolved",
      auditDetail: "正式工作项已通过主 Agent 验收并安全合并，准备恢复原 Agent",
    });
    const group = loadGroups().find((item: any) => item.id === task.group_id);
    if (!group) return { handled: true, accepted: true, resumed: false, reason: "group_missing" };
    const wakeup = await resumeAgentQaFromStoredContinuation(completedQa, group, ctx, streamRes);
    if (wakeup.resumed) {
      updateGroupCoordinationRequest(request.id, { status: "resumed", auditType: "source_agent_resumed", auditDetail: "原 Agent 已收到合并后的依赖结果并从原任务会话继续" });
      return { handled: true, accepted: true, resumed: true, wakeup, merge: mergeResult };
    }
    updateGroupCoordinationRequest(request.id, { status: "resolved", auditType: "source_agent_resume_waiting", auditDetail: wakeup.reason || "原 Agent 暂未恢复，等待自动重试" });
    return { handled: true, accepted: true, resumed: false, reason: wakeup.reason, merge: mergeResult };
  } finally {
    coordinationSettlementInFlight.delete(request.id);
  }
}

export async function recoverGroupCoordinationDependencies(ctx: CollabCtx) {
  const requests = listGroupCoordinationRequests({}).filter((item: any) => ["work_item_created", "executing", "evidence_review", "merging", "merge_conflict", "resolved"].includes(item.status));
  const results: any[] = [];
  for (const request of requests) {
    const task = getTaskById(request.work_item_task_id || "");
    if (!task) {
      results.push({ request_id: request.id, recovered: false, reason: "work_item_missing" });
      continue;
    }
    if (["pending", "queued"].includes(task.status) && task.auto_execute !== false && !isTaskQueuedInMemory(task.id) && !runningTaskIds.has(task.id)) {
      results.push({ request_id: request.id, task_id: task.id, ...enqueueTask(task.id, ctx) });
      continue;
    }
    const settled = await settleGroupCoordinationDependency(task, ctx);
    results.push({ request_id: request.id, task_id: task.id, ...settled });
  }
  return { total: requests.length, results };
}

export async function runGroupCoordinationBusinessChainTestTurn(input: any) {
  return handleAgentQaRequests(input);
}

function buildCoordinatorVisibleMessageContent(content: any, fallback = "我已整理这次协作进展，技术细节已放入技术详情。", maxLength = 4000) {
  const polish = (value: string) => String(value || "")
    .replace(/\bcompleted\b/gi, "已完成")
    .replace(/\bfailed\b/gi, "失败")
    .replace(/\bblocked\b/gi, "阻塞")
    .replace(/\bpartial\b/gi, "部分完成")
    .replace(/\bmissing_receipt\b/gi, "缺少结果说明")
    .replace(/\bdone\b/gi, "完成")
    .replace(/的\s+表示\s+/g, "：")
    .replace(/\s*，\s*。/g, "。")
    .replace(/\s+/g, " ")
    .trim();
  const raw = String(content || "").trim();
  if (!raw) return fallback;
  const hasInternalSignals = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|task-id|WorkerContextPacket|trace_id|session_id|native_session|scratchpad|raw\s+receipt|raw\s+payload|runtime kernel|workflow_timeline/i.test(raw);
  if (hasInternalSignals) {
    return polish(sanitizeCoordinatorUserText(raw, fallback, Math.min(maxLength, 1200)));
  }
  const lines = raw.split(/\r?\n/).map((line: string) => {
    if (!line.trim()) return "";
    return polish(sanitizeCoordinatorUserText(line, "", 900));
  });
  const visible = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return visible ? compactMemoryText(visible, maxLength) : fallback;
}

export function getCoordinatorVisibleMessageSelfTest() {
  const raw = [
    "📋 **协调复盘**",
    "",
    "web-app 的 <task-notification> 表示 completed，trace_id=abc123。",
    "CCM_AGENT_RECEIPT: {\"status\":\"done\"}",
  ].join("\n");
  const visible = buildCoordinatorVisibleMessageContent(raw, "我已整理执行成员的结果。", 1200);
  const friendly = buildCoordinatorVisibleMessageContent("📋 **协调复盘**\n\n- web-app：已完成页面入口。", "", 1200);
  return {
    pass: !/CCM_AGENT_RECEIPT|task-notification|trace_id|session_id|WorkerContextPacket/i.test(visible)
      && visible.includes("web-app")
      && /结果|主 Agent|技术详情|完成/i.test(visible)
      && friendly.includes("web-app")
      && friendly.includes("已完成页面入口"),
    visible,
    friendly,
  };
}

export async function appendCoordinatorMessage(
  groupId: string,
  agent: string,
  content: string,
  streamRes: any = null,
  suffix = "review",
  metadata: any = {}
) {
  const messageId = "m" + Date.now().toString(36) + suffix + crypto.randomBytes(2).toString("hex");
  const rawContent = String(content || "");
  const visibleContent = buildCoordinatorVisibleMessageContent(rawContent);
  const messageMetadata = { ...metadata };
  if (visibleContent !== rawContent && !messageMetadata.technical_content && !messageMetadata.technicalContent) {
    messageMetadata.technical_content = rawContent;
  }
  appendGroupMessage(groupId, {
    id: messageId,
    role: "assistant",
    agent,
    content: visibleContent,
    timestamp: new Date().toISOString(),
    ...messageMetadata,
  });
  writeSse(streamRes, {
    type: "agent_done",
    agent,
    text: visibleContent,
    messageId,
    ...messageMetadata,
  });
  return messageId;
}

export function buildCoordinatorReworkRoutingDecision(item: any, input: { previousLedger?: any; userMessage?: string; coordinatorOutput?: string } = {}) {
  return require("./collaboration-test-agent-runtime").buildCoordinatorReworkRoutingDecision(item, input);
}

export function getMentionReworkRoute(mention: any) {
  if (!mention || typeof mention === "string") return null;
  const route = mention.reworkRoute || mention.rework_route || mention.routing || null;
  return route && typeof route === "object" ? route : null;
}

export function coordinatorReworkRouteRequiresStop(route: any) {
  if (!route || typeof route !== "object") return false;
  return route.requires_stop === true || /stop_wrong_direction/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}

export function coordinatorReworkRouteNeedsFreshVerifier(route: any) {
  if (!route || typeof route !== "object") return false;
  return route.requires_fresh_verifier === true
    || /fresh_verification|fresh_verifier|independent/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}

export function coordinatorReworkRouteUsesVerifier(route: any) {
  if (!route || typeof route !== "object") return false;
  return coordinatorReworkRouteNeedsFreshVerifier(route)
    || /resume_verifier|same_verifier|test_agent_recheck/i.test(String(route.strategy || route.continuationStrategy || route.continuation_strategy || ""));
}

export function selectCoordinatorIndependentVerifier(group: any, originalTarget = "") {
  return require("./collaboration-test-agent-runtime").selectCoordinatorIndependentVerifier(group, originalTarget);
}

export function isCoordinatorTestAgentName(value: any) {
  return /^(?:test[-_\s]*agent|测试\s*agent)$/i.test(String(value || "").trim());
}

export function resolveProjectRuntimeForTestAgentHandoff(group: any, project: string) {
  const name = String(project || "").trim();
  if (!name) return { workDir: "", agentType: "", source: "missing" };
  const directMember = (group?.members || []).find((member: any) => String(member?.project || "").trim() === name);
  const directWorkDir = String(directMember?.workDir || directMember?.work_dir || "").trim();
  if (directWorkDir) {
    return { workDir: directWorkDir, agentType: String(directMember?.agentType || directMember?.agent || ""), source: "group_member" };
  }
  try {
    const runtime = resolveMemberRuntime(name, group, getConfigs());
    if (runtime?.workDir) return { workDir: String(runtime.workDir || ""), agentType: String(runtime.agentType || ""), source: "member_runtime" };
  } catch {}
  try {
    for (const config of getConfigs()) {
      for (const info of getConfigInfo(config.path)) {
        if (String(info.name || "").trim() === name) {
          return { workDir: String(info.workDir || ""), agentType: String(info.agent || ""), source: "project_config" };
        }
      }
    }
  } catch {}
  return { workDir: "", agentType: "", source: "missing" };
}

function fileEntryMatchesProject(item: any, project: string) {
  if (!project || typeof item === "string") return true;
  const owner = String(item?.project || item?.agent || item?.target_project || item?.targetProject || "").trim();
  return !owner || owner === project;
}

export function collectCoordinatorChangedFiles(value: any, project = ""): string[] {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.files)
      ? value.files
      : Array.isArray(value?.changes)
        ? value.changes
        : value ? [value] : [];
  return uniqueStrings(source
    .filter((item: any) => fileEntryMatchesProject(item, project))
    .map((item: any) => typeof item === "string" ? item : item?.path || item?.file || item?.name || item?.relative_path || item?.relativePath || "")
    .filter(Boolean)).slice(0, 40);
}

function normalizeCoordinatorVerificationEvidenceCommand(value: any) {
  let source = String(value || "").trim();
  if (!source) return "";
  source = source
    .replace(/^[-*+]\s+/, "")
    .replace(/^`+|`+$/g, "")
    .split(/\r?\n/, 1)[0]
    .trim();
  if (!source || /[;&|<>]/.test(source)) return "";

  const packageCommand = source.match(/^(npm|pnpm|yarn|bun)\s+(?:run\s+)?([a-zA-Z0-9][a-zA-Z0-9:._-]*)\b/i);
  if (packageCommand) {
    const manager = packageCommand[1].toLowerCase();
    const script = packageCommand[2];
    return `${manager} run ${script}`;
  }

  const command = source
    .split(/\s+(?:→|=>|passed\b|failed\b|verified\b|succeeded\b|exit(?:\s+code)?\s*[=:])/i, 1)[0]
    .replace(/:\s+(?=(?:node|python|pytest|jest|vitest|verified|passed|failed|built|compiled|exit)\b).*$/i, "")
    .trim();
  if (!command || !/^(?:npx\s+(?:tsc|jest|vitest|eslint)|pytest\b|python\s+-m\s+pytest\b|jest\b|vitest\b|tsc\b|go\s+test\b|cargo\s+test\b|mvn(?:w|\.cmd)?\s+test\b|gradle(?:w|\.bat)?\s+test\b)/i.test(command)) return "";
  return /^[a-zA-Z0-9_./:@%+=,\-\s]+$/.test(command) ? command : "";
}

export function collectCoordinatorVerificationCommands(project: string, workDir = "", previousLedger: any = null) {
  const fromLedger = Array.isArray(previousLedger?.verification) ? previousLedger.verification : [];
  const commands = uniqueStrings([
    ...buildProjectVerificationHints(project, workDir),
    ...fromLedger.map(normalizeCoordinatorVerificationEvidenceCommand).filter(Boolean),
  ]);
  return commands.slice(0, 8);
}

function isCoordinatorOnlyAcceptanceCriterion(value: any) {
  const criterion = String(value || "").trim();
  if (!criterion) return true;
  const namesCoordinator = /(?:主\s*Agent|主智能体|协调(?:者|Agent)|coordinator|global\s+agent)/i.test(criterion);
  const describesCoordinatorDuty = /(?:总结|汇报|协调|分派|派发|调度|计划|todo|验收|复盘|审核|最终答复|最终回复|用户可见|技术详情)/i.test(criterion);
  if (namesCoordinator && describesCoordinatorDuty) return true;
  if (/(?:最终报告|最终总结|交付总结|完成报告).*(?:说明|包含|覆盖|变更文件|验证结果|风险|用户)/i.test(criterion)) return true;
  if (/(?:涉及代码|代码任务|代码变更).*(?:实际文件变更|变更文件).*(?:构建|测试|验证).*证据/i.test(criterion)) return true;
  if (/(?:TestAgent|测试\s*Agent|独立复核|独立验证|主\s*Agent.*抽查)/i.test(criterion)) return true;
  if (/(?:项目执行成员|子\s*Agent|原实现(?:成员|Agent)?).*(?:说明|汇报|返回|回传).*(?:实际动作|文件变(?:化|更)|验证|风险)/i.test(criterion)) return true;
  if (/(?:复核|验证).*(?:失败|未通过).*(?:返工|修复).*(?:复验|重跑|重新(?:复核|验证))/i.test(criterion)) return true;
  return false;
}

export function isCoordinatorReviewInstruction(value: any) {
  const text = String(value || "").trim();
  if (!text) return true;
  return /^(?:请)?基于最新(?:项目)?状态(?:核对|复核|检查)|^(?:请)?独立复核|不得只复述原实现者结论/i.test(text);
}

export function buildCoordinatorTestAgentAcceptanceCriteria(task: any, verificationCommands: string[]) {
  const projectCriteria = splitUserAcceptanceText(task.acceptance_criteria || task.acceptanceCriteria)
    .filter((criterion: string) => !isCoordinatorOnlyAcceptanceCriterion(criterion));
  const commandCriteria = verificationCommands.map(command => `命令 ${command} 必须成功执行。`);
  return uniqueStrings([...projectCriteria, ...commandCriteria]).slice(0, 10);
}

export function buildTestAgentHandoffId(taskId = "", originalTarget = "") {
  const base = [taskId || "test-agent-handoff", originalTarget || "project"].join("-");
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || `test-agent-handoff-${Date.now().toString(36)}`;
}

export function getTestAgentHandoffReviewSubject(handoff: any = null) {
  return String(
    handoff?.review_subject
    || handoff?.reviewSubject
    || handoff?.metadata?.reviewSubject
    || handoff?.metadata?.review_subject
    || handoff?.projects?.[0]?.name
    || handoff?.project?.name
    || ""
  ).trim();
}
