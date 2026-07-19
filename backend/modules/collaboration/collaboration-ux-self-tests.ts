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
  AGENT_PROBE_SUCCESS_FRESH_MS,
  COORDINATOR_REVIEW_MAX_ROUNDS,
  TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS,
  TASK_WATCHDOG_GAP_REWORK_MAX,
  buildAcceptanceGate,
  buildAcceptedPlanModeDraft,
  buildAgentExecutionFixActions,
  buildAgentRecoveryProbeGroups,
  buildChildAgentWorkerHandoff,
  buildContinuationUserDecision,
  buildCoordinatorReworkContinuationFallback,
  buildCoordinatorReworkFollowUp,
  buildCoordinatorReworkRoutingDecision,
  buildCoordinatorReworkTask,
  buildCoordinatorTestAgentHandoff,
  buildDeliverySummary,
  buildDispatchLaunchSummary,
  buildEvidenceGateFollowUps,
  buildFailedIndependentReviewReworkFollowUps,
  buildGlobalDirectDispatchCompletionMessage,
  buildGlobalDirectDispatchContinuationMessage,
  buildGlobalDirectDispatchRollbackMessage,
  buildGlobalMissionTargetHandoff,
  buildIndependentReviewGate,
  buildIndependentReviewGateFollowUps,
  buildNativeTestAgentPlanBlockedReceipt,
  buildNativeTestAgentReceipt,
  buildNativeTestAgentReviewSummary,
  buildNativeTestAgentRuntimeToolContext,
  buildPlanModeClarificationQuestions,
  buildProjectCodeReadOnlySnapshot,
  buildQueuedGroupTaskMessage,
  buildRevisedPlanModeDraft,
  buildTargetedReworkContinuationDraft,
  buildTaskCardView,
  buildTaskGapContinuationDraft,
  buildTaskPreflightReasoning,
  buildTaskSourceDocumentsContext,
  buildUserAcceptanceReview,
  buildUserCompletionReadinessSummary,
  buildUserCoordinationAcknowledgement,
  buildWorkerContinuationHandoff,
  canAutoContinueTaskGaps,
  canCompleteDailyDevFromDeliverySummary,
  classifyGroupProjectTaskIntent,
  classifyPlanModeRisk,
  classifyTaskContinuation,
  collectTaskTypedMemoryPressureRecallUsageRows,
  collectTestAgentBrowserEvidenceSummaryLines,
  deriveTaskLifecycle,
  doesProbeTargetMatchRequired,
  enforceAgentProbeExecutionReadiness,
  enforceTaskAgentProbeReadiness,
  evaluateReceiptReadPlanRevalidationGate,
  filterCoordinatorLlmFollowUpsAgainstHardRoutes,
  formatNativeTestAgentOutput,
  formatNativeTestAgentPlanBlockedOutput,
  getAgentDependencyStateFromOutputs,
  getAgentProbeHealth,
  getAgentProbeOutputFailure,
  getAgentProbeTargetStatusKey,
  getCoordinatorActionMentions,
  getCoordinatorVisibleMessageSelfTest,
  getGlobalDirectDispatchContinuationKey,
  getTaskGapFingerprint,
  getTaskGapItems,
  getTaskWatchdogStatus,
  hasConfiguredTestAgentMultiSessionBrowserCheck,
  hasDailyDevContinuationGaps,
  hasFreshSuccessfulAgentProbe,
  isAdvisoryNeed,
  isAutomaticGapContinuationSource,
  looksLikeTaskContinuation,
  mergeCoordinatorDocumentContexts,
  normalizeGlobalMissionTargetRequirements,
  normalizeGroupAgentGatewayTaskIntent,
  reconcileTaskCollaborationState,
  runGlobalMemoryHealthGateReceiptValidationSelfTest,
  runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest,
  scheduleTestAgentRecheckAfterFollowUps,
  scoreChildAgentReceipt,
  selectCoordinatorIndependentVerifier,
  selectLatestDurableReceipts,
  shouldCreatePersistentGroupTask,
  shouldNotifyGlobalDirectDispatchCompletion,
  shouldNotifyGlobalDirectDispatchContinuation,
  shouldNotifyGlobalDirectDispatchRollback,
  shouldUseProjectAnalysisMode,
  summarizeAgentProbeTargets,
  summarizeNativeTestAgentExecutionPlan,
  summarizeTaskAgentMemoryContextSnapshot,
  taskMatchesAgentProbeTarget,
  taskNeedsGroupWideAgentProbe,
  taskRequiresAgentQa,
} from "./collaboration";
import {
  buildUxSelfTestTask,
  buildUxSelfTestReinjectionGateGapDelivery,
  buildUxSelfTestReinjectionUsageGapDelivery,
  buildUxSelfTestChecks
} from "./collaboration-ux-self-tests-fixtures";


export function runCollaborationUxSelfTest() {
  const task = buildUxSelfTestTask();
  const card = buildTaskCardView(task, [{ id: "exec-ux", project: "collab-web", state: "succeeded", checkpointIds: ["checkpoint-ux"] }], []);
  const failedCard = buildTaskCardView({ ...task, status: "failed", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
  const missingEvidenceCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: { headline: "等待证据", assignment_count: 1, assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选" }], receipt_statuses: [] } }, [], []);
  const weakAcceptanceOnlyTask = {
    ...task,
    status: "done",
    status_detail: "旧摘要声称任务完成",
    delivery_summary: {
      headline: "旧摘要声称已完成",
      acceptance_gate_passed: true,
      acceptance: ["验收结论：已通过"],
      delivery_report: {
        schema: "ccm-main-agent-delivery-report-v1",
        status: "done",
        headline: "旧摘要声称已完成",
        acceptance: ["验收结论：已通过"],
        verification_evidence: { status: "ready", items: [] },
      },
    },
  };
  const weakAcceptanceOnlyLifecycle = deriveTaskLifecycle(weakAcceptanceOnlyTask, []);
  const weakAcceptanceOnlyCard = buildTaskCardView(weakAcceptanceOnlyTask, [], []);
  const sessionProgressCard = buildTaskCardView({
    ...task,
    status: "in_progress",
    delivery_summary: {
      headline: "等待执行成员执行中",
      assignment_count: 1,
      assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选" }],
      receipt_statuses: [],
    },
  }, [], [{
    id: "tas-visible-should-stay-technical",
    taskId: "ux-task",
    groupId: "ux-group",
    project: "collab-web",
    agentType: "cursor",
    nativeSessionId: "cursor-session-should-not-show",
    resumeMode: "native",
    status: "open",
    turnCount: 2,
    lastTurnSucceeded: true,
    createdAt: "2026-07-07T00:00:00.000Z",
    lastUsedAt: "2026-07-07T00:02:00.000Z",
  }]);
  const memoryGateGapDelivery = {
    ...task.delivery_summary,
    acceptance_gate_passed: false,
    memory_dispatch_gates: [{
      gate_id: "gmd_ux_gate",
      schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
      group_id: "ux-group",
      target_project: "collab-web",
      status: "fresh",
      action: "use_or_ignore",
    }],
    memory_dispatch_gate_count: 1,
    memory_gate_receipt_passed: false,
    memory_gate_receipt_rows: [{
      agent: "collab-web",
      status: "done",
      score: 70,
      grade: "partial",
      pass: false,
      missing: ["引用记忆派发 gate"],
      memory_gate: {
        required: true,
        pass: false,
        gate_ids: ["gmd_ux_gate"],
        missing_gate_ids: ["gmd_ux_gate"],
        declared: false,
        used: [],
        ignored: [],
      },
    }],
    receipts: [{
      ...task.delivery_summary.receipts[0],
      memoryUsed: ["项目记忆：筛选页面结构"],
      memoryIgnored: [],
    }],
  };
  const memoryGateGapCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: memoryGateGapDelivery }, [], []);
  const reinjectionGateGapDelivery = buildUxSelfTestReinjectionGateGapDelivery({ task });
  const reinjectionGateGapCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: reinjectionGateGapDelivery }, [], []);
  const reinjectionUsageGapDelivery = buildUxSelfTestReinjectionUsageGapDelivery({ task });
  const reinjectionUsageGapCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: reinjectionUsageGapDelivery }, [], []);
  const handoffOnlyDelivery = {
    ...task.delivery_summary,
    headline: "子 Agent 只提交了建议",
    acceptance_gate_passed: false,
    actual_file_change_count: 0,
    actual_file_changes: [],
    verification_executed: [],
    external_runner_verification_count: 0,
    verification_source_gate_passed: false,
    worker_notifications: [{ task_id: "collab-web", status: "completed", summary: "建议主 Agent 修改 LoginStore.vue，未实际修改文件" }],
    receipt_statuses: [{ agent: "collab-web", status: "done", summary: "建议主 Agent 修改 LoginStore.vue，未实际修改文件，也未执行验证。" }],
    receipts: [{
      agent: "collab-web",
      status: "done",
      summary: "建议主 Agent 修改 LoginStore.vue，未实际修改文件，也未执行验证。",
      actions: ["只整理实现方案，建议主 Agent 修改 LoginStore.vue"],
      filesChanged: ["未实际修改文件"],
      verification: ["建议运行 npm test，未执行"],
      ack: {
        understoodGoal: "给工单页面增加负责人筛选",
        plannedScope: ["frontend/app.js"],
        forbiddenScope: ["不改无关页面"],
        verificationPlan: ["npm test"],
        unclear: [],
      },
      blockers: [],
      needs: ["需要主 Agent 实际修改并验证"],
      memoryUsed: ["项目记忆：筛选页面结构"],
    }],
  };
  const handoffOnlyCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: handoffOnlyDelivery }, [], []);
  const activeCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
  const reviewingCard = buildTaskCardView({ ...task, status: "in_progress", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [{ id: "exec-review", project: "collab-web", state: "reviewing" }], []);
  const reworkingCard = buildTaskCardView({ ...task, status: "in_progress", collaboration_state: { phase: "reworking" }, delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
  const receiptResolvedCard = buildTaskCardView({
    ...task,
    status: "in_progress",
    collaboration_state: {
      phase: "reviewing",
      last_continuation: {
        source: "user_targeted_rework",
        at: new Date().toISOString(),
        rework_kind: "weak_receipt",
        target: "collab-web",
        reason: "缺少已执行验证，要求补充高质量结果说明",
        status: "accepted",
      },
    },
    delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false },
  }, [], []);
  const continuationCard = buildTaskCardView({
    ...task,
    status: "pending",
    collaboration_state: {
      phase: "reworking",
      last_continuation: {
        source: "user_next_work_item",
        at: new Date().toISOString(),
        rework_kind: "next_claimable_work_item",
        target: "collab-web",
        reason: "补齐负责人筛选验证",
        status: "accepted",
      },
    },
    delivery_summary: {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      timeline: [
        ...(Array.isArray(task.delivery_summary.timeline) ? task.delivery_summary.timeline : []),
        { id: "tl-next-work-item", type: "next_work_item_dispatch", title: "下一步派发已接上", detail: "补齐负责人筛选验证", status: "active", phase: "rework", agent: "collab-web" },
      ],
    },
  }, [], []);
  const goalRevisionContinuationCard = buildTaskCardView({
    ...task,
    status: "in_progress",
    collaboration_state: {
      phase: "reworking",
      last_continuation: {
        source: "group_chat_followup",
        at: new Date().toISOString(),
        kind: "revise_goal",
        reason: "先保留旧支付表，只新增兼容字段。",
        status: "interrupting",
        replan_required: true,
        interrupt_current_run: true,
      },
      goal_revision_interruption: {
        requested: true,
        requested_at: new Date().toISOString(),
        reason: "先保留旧支付表，只新增兼容字段。",
        source: "group_chat_followup",
        followup_revision: 1,
      },
    },
    delivery_summary: {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      timeline: [
        ...(Array.isArray(task.delivery_summary.timeline) ? task.delivery_summary.timeline : []),
        { id: "tl-goal-revision", type: "task_goal_revision", title: "目标调整已接收", detail: "先保留旧支付表，只新增兼容字段。", status: "active", phase: "rework", agent: "coordinator" },
      ],
    },
  }, [], []);
  const revertedCard = buildTaskCardView({ ...task, status: "cancelled", rolled_back_at: new Date().toISOString() }, [], []);
  const recoveryBaseTask = {
    ...task,
    id: "recovery-task",
    status: "pending",
    acceptance_criteria: "负责人筛选完成后必须有文件变更、npm test 和主 Agent 验收",
    recovery: {
      revalidated_at: new Date().toISOString(),
      previous_status: "in_progress",
      mode: "startup_auto_recovery",
      lease_recovery_count: 1,
      decision_code: "authorized_incomplete_task",
      decision_reason: "已确认并入队的未完成任务",
      authorization_preserved: true,
      authorization_evidence: ["intake_confirmed", "queued_at", "started_at"],
      requires_user: false,
      user_headline: "服务重启后，我已自动接上这轮任务，并重新核对目标、当前状态和验收条件。",
      user_next_action: "我会沿用原计划和执行上下文继续推进，完成后再给你最终总结。",
    },
    execution_lease: { recovery_count: 1 },
    delivery_summary: {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      acceptance_gate: { failed_checks: [{ id: "verification", label: "已执行验证" }] },
    },
    work_items: [{
      id: "wi-recovery-web",
      target: "collab-web",
      owner: "collab-web",
      subject: "恢复后继续补齐负责人筛选验证",
      status: "pending",
      attempt: 2,
    }],
  };
  const recoveryReasoning = buildTaskPreflightReasoning(recoveryBaseTask, "服务启动恢复：重新核对原始目标、当前代码状态、剩余缺口与验收条件", true);
  const recoveryCard = buildTaskCardView({ ...recoveryBaseTask, reasoning_loop: recoveryReasoning }, [], []);
  const liveCheckpointStageCard = buildTaskCardView({
    ...task,
    status: "in_progress",
    delivery_summary: {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      timeline: [
        { id: "tl-live-revision", type: "plan_mode_revision_requested", title: "用户要求调整执行前计划", detail: "先保留旧接口兼容", status: "warn", phase: "planning", agent: "coordinator" },
        { id: "tl-live-recovery", type: "reasoning_recovery_check", title: "恢复前已重新核对任务", detail: "目标、状态与验收条件已重新核对", status: "ok", phase: "planning", agent: "coordinator" },
        { id: "tl-live-receipt", type: "child_agent_receipt", title: "collab-web 提交结果说明", detail: "已完成页面改动并运行验证", status: "ok", phase: "executing", agent: "collab-web" },
        { id: "tl-live-rework", type: "targeted_rework", title: "精准返工已接上", detail: "补齐 npm test 证据", status: "active", phase: "rework", agent: "collab-web" },
        { id: "tl-live-gate", type: "acceptance_gate", title: "代码变更验收门禁", detail: "1 项未通过，等待补齐验证", status: "warn", phase: "reviewing", agent: "coordinator" },
        { id: "tl-live-supervisor", type: "global_supervisor_rework", title: "我已安排子任务返工", detail: "已按交付缺口重派 collab-web", status: "active", phase: "rework", agent: "global-agent" },
      ],
    },
  }, [], []);
  const liveCheckpointCompletedCard = buildTaskCardView({
    ...task,
    status: "in_progress",
    workflow_type: "global_mission",
    delivery_summary: {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      timeline: [
        { id: "tl-live-supervisor-cycle", type: "global_supervisor_cycle", title: "我已检查子任务进展", detail: "已检查 2 个子任务", status: "active", phase: "supervising", agent: "global-agent" },
        { id: "tl-live-supervisor-done", type: "global_supervisor_completed", title: "我已确认全部子任务通过", detail: "所有子任务交付验收已通过", status: "ok", phase: "completed", agent: "global-agent" },
      ],
    },
  }, [], []);
  const greetingCard = buildTaskCardView({ id: "hello-task", title: "你好", business_goal: "你好", status: "pending", workflow_meta: { intake: { task_intent: { executable: false } } } }, [], []);
  const highRiskPlan = classifyPlanModeRisk("删除旧订单表并上线新的支付权限", { members: [{ role: "coordinator", project: "api" }, { role: "member", project: "web" }] }, { executable: true }, 0);
  const lowRiskPlan = classifyPlanModeRisk("给设置页按钮文案改成保存", { members: [{ role: "coordinator", project: "web" }] }, { executable: true }, 0);
  const planClarificationQuestions = buildPlanModeClarificationQuestions("调整支付流程", highRiskPlan, ["api", "web"]);
  const awaitingPlanCard = buildTaskCardView({
    id: "plan-task",
    title: "调整支付流程",
    business_goal: "调整支付流程",
    status: "pending",
    intake_state: "awaiting_confirmation",
    intake_draft: {
      title: "执行前计划",
      mode: "cc-style-plan-mode",
      requires_confirmation: true,
      risk: highRiskPlan,
      impact_scope: { projects: ["api", "web"], areas: ["后端接口与数据契约", "前端页面与交互"], multi_agent: true },
      read_only_exploration: { summary: "只读代码快照和本地知识库召回已用于评估。", projects: ["api", "web"], knowledge_used: true, code_snapshot_used: true },
      steps: [
        { id: "understand_goal", label: "理解需求与验收目标", detail: "支付流程调整需要先明确兼容边界。", status: "completed" },
        { id: "read_only_explore", label: "只读探索影响范围", detail: "已使用只读代码快照和本地知识库。", status: "completed" },
        { id: "confirm_boundary", label: "确认执行边界", detail: "等待用户确认后再派发子 Agent。", status: "needs_confirmation" },
        { id: "dispatch_sub_agents", label: "派发子 Agent 工作单", detail: "确认后拆给 api 和 web。", status: "pending" },
        { id: "verify_and_summarize", label: "验收结果并总结给用户", detail: "完成后核对变更、验证和风险。", status: "pending" },
      ],
      clarification_questions: planClarificationQuestions,
      needs_clarification: true,
      acceptance: ["必须有结构化结果说明", "必须有文件变更和验证证据"],
      permission_boundaries: ["确认前不得修改文件", "删除和部署必须等待用户确认"],
    },
    workflow_meta: { intake: { task_intent: { executable: true } } },
  }, [], []);
  const revisedPlanDraft = buildRevisedPlanModeDraft(awaitingPlanCard.plan_mode, "先保留旧支付表，只新增兼容字段。");
  const acceptedPlanDraft = buildAcceptedPlanModeDraft(awaitingPlanCard.plan_mode, "同时更新 README 中的支付兼容说明。", "2026-07-07T00:00:00.000Z");
  const revisedPlanCard = buildTaskCardView({
    id: "plan-task-revised",
    title: "调整支付流程",
    business_goal: "调整支付流程",
    status: "pending",
    intake_state: "awaiting_confirmation",
    intake_draft: revisedPlanDraft,
    workflow_meta: { plan_mode: revisedPlanDraft, intake: { task_intent: { executable: true }, plan_mode: revisedPlanDraft } },
  }, [], []);
  const acceptedPlanCard = buildTaskCardView({
    id: "plan-task-accepted",
    title: "调整支付流程",
    business_goal: "调整支付流程",
    status: "pending",
    intake_state: "confirmed",
    intake_draft: acceptedPlanDraft,
    acceptance_criteria: acceptedPlanDraft.acceptance.join("\n"),
    source_documents: `用户确认执行前计划时补充要求：${acceptedPlanDraft.accepted_feedback}`,
    workflow_meta: { plan_mode: acceptedPlanDraft, intake: { task_intent: { executable: true }, plan_mode: acceptedPlanDraft, accepted_feedback: acceptedPlanDraft.accepted_feedback } },
  }, [], []);
  const report = buildUserDeliveryReport(task, task.delivery_summary, "done", "负责人筛选已完成");
  const groupReport = buildTaskGroupReportMessage(task, "done", "负责人筛选已完成");
  const acknowledgement = buildUserCoordinationAcknowledgement({ ...task, business_goal: "增加负责人筛选。" }, [{ project: "collab-web" }]);
  const dispatchLaunchSummary = buildDispatchLaunchSummary({
    goal: "增加负责人筛选。",
    assignments: [{
      project: "collab-web",
      task: "实现负责人筛选 UI，并返回 CCM_AGENT_RECEIPT。",
      reason: "前端负责筛选入口和交互。",
      status: "dispatched",
    }],
    dispatchPolicy: { action: "delegate", reason: "用户明确要求开发任务" },
    mode: "project_task",
    taskId: "dispatch-launch-selftest",
  });
  const completedTargetDispatchLaunchSummary = buildDispatchLaunchSummary({
    goal: "增加负责人筛选。",
    assignments: [{
      project: "collab-web",
      task: "负责人筛选实现已回传，等待主 Agent 验收。",
      reason: "执行成员已经返回结果，但还没有通过主 Agent 验收。",
      status: "done",
    }],
    dispatchPolicy: { action: "delegate", reason: "用户明确要求开发任务" },
    mode: "project_task",
    taskId: "dispatch-launch-completed-target-selftest",
  });
  const ackGapTask = {
    ...task,
    status: "in_progress",
    delivery_summary: {
      ...task.delivery_summary,
      ack_gate_passed: false,
      ack_review: {
        status: "needs_review",
        rejected: [{ agent: "collab-web", status: "weak", reason: "ACK 缺少目标或计划范围" }],
        rows: [{ agent: "collab-web", status: "weak", reason: "ACK 缺少目标或计划范围", planned_scope: [], unclear: [] }],
      },
      acceptance_gate_passed: false,
    },
  };
  const ackGapCard = buildTaskCardView(ackGapTask, [], []);
  const ackGapDraft = buildTaskGapContinuationDraft(ackGapTask);
  const contractGapTask = {
    ...task,
    status: "in_progress",
    delivery_summary: {
      ...task.delivery_summary,
      assignment_evidence: [{ project: "collab-api", task: "修改负责人 API", reason: "后端契约提供方" }],
      receipts: [{
        agent: "collab-api",
        status: "done",
        summary: "新增 GET /api/users?role=owner",
        actions: ["更新接口"],
        filesChanged: ["backend/server.ts"],
        verification: ["npm test passed by external runner (exit 0)"],
        ack: { understoodGoal: "修改负责人 API", plannedScope: ["backend/server.ts"], verificationPlan: ["npm test"], unclear: [] },
        contractChanges: [{ type: "api", endpoint: "GET /api/users?role=owner", summary: "返回负责人列表", consumers: ["collab-web"] }],
        blockers: [],
        needs: [],
        memoryUsed: [],
        memoryIgnored: ["自测样例"],
      }],
      contract_injection_gate_passed: false,
    },
  };
  const contractGapDraft = buildTaskGapContinuationDraft(contractGapTask);
  const recoveredTestAgentNotificationTask = {
    delivery_summary: {
      needs: ["等待主 Agent 重新运行 TestAgent 复核本轮返工修复"],
      blocking_needs: [],
      worker_notifications: [
        { task_id: "test-agent", status: "failed", receipt_status: "failed", summary: "首次复核要求返工" },
        { task_id: "test-agent", status: "completed", receipt_status: "done", summary: "返工后复测通过" },
      ],
    },
  };
  const sameSessionReworkReceipts = selectLatestDurableReceipts([
    { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-rework", summary: "返工完成" },
    { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-rework", ack: { understoodGoal: "完成目标", plannedScope: ["src/feature.js"], unclear: [] } },
  ]);
  const differentSessionReworkReceipts = selectLatestDurableReceipts([
    { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-new", summary: "新会话返工" },
    { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-old", ack: { understoodGoal: "旧目标", plannedScope: ["src/old.js"], unclear: [] } },
  ]);
  const workItemReworkDraft = buildTargetedReworkContinuationDraft({
    ...task,
    delivery_summary: {},
    work_items: [{
      id: "wi-collab-web",
      target: "collab-web",
      owner: "collab-web",
      subject: "补齐负责人筛选验证",
      status: "failed",
      attempt: 2,
      evidence: ["上一轮修改了 frontend/app.js"],
      blockers: ["缺少 npm test 执行结果"],
      updatedAt: "2020-01-01T00:00:00.000Z",
    }],
  }, { target: "collab-web", rework_kind: "missing_verification", reason: "缺少已执行验证" });
  const workItemWatchdogStatus = getTaskWatchdogStatus(1000, TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, TASK_WATCHDOG_GAP_REWORK_MAX, [{
    id: "work-item-stall-task",
    title: "工作项卡住自测",
    status: "in_progress",
    auto_execute: true,
    updated_at: "2020-01-01T00:00:00.000Z",
    work_items: [{
      id: "wi-stalled",
      target: "collab-web",
      owner: "collab-web",
      subject: "执行队列卡住项",
      status: "in_progress",
      updatedAt: "2020-01-01T00:00:00.000Z",
    }],
  }]);
  const contractRows = getTaskContractInjectionRows(contractGapTask).rows;
  const contractInjectionId = contractRows[0]?.injection_id || "";
  const contractDispatchedUnconsumedGate = evaluateContractInjectionGate(
    contractRows,
    [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }]
  );
  const contractConsumedGate = evaluateContractInjectionGate(
    contractRows,
    [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }],
    [{ agent: "collab-web", status: "done", consumedInjectionIds: [contractInjectionId], contractConsumption: [{ injection_id: contractInjectionId, status: "adapted", evidence: ["frontend/app.js", "npm test"] }], filesChanged: ["frontend/app.js"], verification: ["npm test passed by external runner (exit 0)"] }]
  );
  const contractWeakConsumptionGate = evaluateContractInjectionGate(
    contractRows,
    [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }],
    [{ agent: "collab-web", status: "done", consumedInjectionIds: [contractInjectionId] }]
  );
  const contractGenericApiGate = evaluateContractInjectionGate(
    contractRows,
    [{ project: "collab-web", task: "改前端 API 调用", message_id: "m-original" }]
  );
  const runtimeKernelCard = buildTaskCardView({
    ...task,
    delivery_summary: {
      ...task.delivery_summary,
      runtime_kernel: {
        trace_id: "trace-ux",
        lifecycle_count: 2,
        latest_lifecycle: [],
        blocked_count: 0,
        ack_only: { active: true, count: 1, latest: { action: "ack_preflight_dispatch", status: "blocked" } },
        dispatch_worker_count: 1,
        worker_context_packet_ids: ["wcp_selftest"],
        contract_injections: [],
        injection_ids: ["ci_selftest"],
        context_budget: { max_pressure: 18.5, compact_recommended: false },
      },
    },
  }, [], []);
  const codeSnapshotSelfTest = (() => {
    const tempRoot = fs.mkdtempSync(path.join(process.env.TEMP || CCM_DIR, "ccm-project-analysis-"));
    try {
      fs.mkdirSync(path.join(tempRoot, "src"), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, "node_modules"), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, "package.json"), JSON.stringify({ scripts: { dev: "vite" }, dependencies: { vue: "^3.0.0" } }), "utf-8");
      fs.writeFileSync(path.join(tempRoot, "src", "payment.ts"), "export function createPayment() { return 'ok' }\n", "utf-8");
      fs.writeFileSync(path.join(tempRoot, ".env"), "SECRET_SHOULD_NOT_APPEAR=1\n", "utf-8");
      fs.writeFileSync(path.join(tempRoot, "node_modules", "ignored.js"), "SHOULD_NOT_APPEAR\n", "utf-8");
      const snapshot = buildProjectCodeReadOnlySnapshot("demo", tempRoot, "支付功能在哪里");
      return {
        pass: snapshot.includes("src/payment.ts") && snapshot.includes("createPayment") && !snapshot.includes("SECRET_SHOULD_NOT_APPEAR") && !snapshot.includes("SHOULD_NOT_APPEAR"),
        hasSourceFile: snapshot.includes("src/payment.ts"),
        hidesSecret: !snapshot.includes("SECRET_SHOULD_NOT_APPEAR"),
        hidesDependencies: !snapshot.includes("SHOULD_NOT_APPEAR"),
      };
    } catch (error: any) {
      return { pass: false, error: compactMemoryText(error?.message || error, 240) };
    } finally {
      try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
    }
  })();
  const gatewayFallbackBlocked = normalizeGroupAgentGatewayTaskIntent(
    classifyGroupProjectTaskIntent("帮我给项目A新增支付接口并改前端页面"),
    { runtime: "coded-fallback", dispatchPolicy: { action: "delegate", reason: "规则猜测需要派发" }, assignments: [{ project: "collab-web" }] },
    "project_task"
  );
  const gatewayLlmDelegates = normalizeGroupAgentGatewayTaskIntent(
    classifyGroupProjectTaskIntent("帮我给项目A新增支付接口并改前端页面"),
    {
      runtime: "llm-api",
      workflowDecision: { mode: "execute_direct", reason: "用户要求开发任务", confidence: 0.95, actionRequired: true, needsPlanning: false, needsEpicDecomposition: false },
      dispatchPolicy: { action: "delegate", reason: "用户要求开发任务" },
      assignments: [{ project: "collab-web" }],
    },
    "project_task"
  );
  const gatewayLlmDirectAnswer = normalizeGroupAgentGatewayTaskIntent(
    classifyGroupProjectTaskIntent("这个项目架构是什么"),
    {
      runtime: "llm-api",
      workflowDecision: { mode: "project_analysis", reason: "只读项目分析即可", confidence: 0.95, actionRequired: false, needsPlanning: false, needsEpicDecomposition: false },
      dispatchPolicy: { action: "direct_answer", reason: "只读项目分析即可" },
      assignments: [],
    },
    "project_task"
  );
  const globalMissionHandoff = buildGlobalMissionTargetHandoff({
    parent: { id: "gm-selftest" },
    target: { type: "group", group_id: "g-selftest", name: "开发群", coordinator: "coordinator", reason: "全局任务需要群聊协作", dependsOn: ["backend-api"] },
    group: { id: "g-selftest", name: "开发群", members: [{ project: "coordinator" }, { project: "collab-web" }] },
    businessGoal: "完成跨项目负责人筛选",
    childGoal: "群聊负责前端联调和验收",
    acceptance: "必须有文件变更、已执行验证和主 Agent 总结",
    sourceDocuments: "接口：GET /api/users?role=owner",
    traceId: "trace-global-handoff",
  });
  const globalQueuedMessage = buildQueuedGroupTaskMessage({
    ...task,
    global_mission_id: "gm-selftest",
    mission_handoff: globalMissionHandoff,
  });
  const globalDirectCompletionTask = {
    ...task,
    workflow_meta: {
      global_direct_dispatch: {
        schema: "ccm-global-direct-dispatch-v1",
        session_id: "web-global-session",
        global_run_id: "gar-selftest",
        trace_id: "trace-should-stay-technical",
      },
    },
  };
  const globalDirectCompletionMessage = buildGlobalDirectDispatchCompletionMessage(globalDirectCompletionTask);
  const globalDirectWeakCompletionTask = {
    ...globalDirectCompletionTask,
    delivery_summary: weakAcceptanceOnlyTask.delivery_summary,
  };
  const globalDirectBlockedTask = {
    ...globalDirectCompletionTask,
    status: "in_progress",
    delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false },
  };
  const globalDirectContinuationTask = {
    ...globalDirectCompletionTask,
    status: "in_progress",
    followup_revision: 3,
    plan_revision_required: true,
    collaboration_state: {
      phase: "reworking",
      last_continuation: {
        source: "group_chat_followup",
        at: "2026-07-07T00:00:00.000Z",
        kind: "revise_goal",
        reason: "先保留旧支付表，只新增兼容字段。",
        status: "interrupting",
        replan_required: true,
        interrupt_current_run: true,
      },
      goal_revision_interruption: {
        requested: true,
        requested_at: "2026-07-07T00:00:00.000Z",
        reason: "先保留旧支付表，只新增兼容字段。",
      },
    },
    delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false },
  };
  const globalDirectContinuationMessage = buildGlobalDirectDispatchContinuationMessage(globalDirectContinuationTask);
  const globalDirectContinuationAlreadyNotifiedTask = {
    ...globalDirectContinuationTask,
    workflow_meta: {
      global_direct_dispatch: {
        ...globalDirectContinuationTask.workflow_meta.global_direct_dispatch,
        continuation_notified_key: getGlobalDirectDispatchContinuationKey(globalDirectContinuationTask),
      },
    },
  };
  const globalDirectRollbackTask = {
    ...globalDirectCompletionTask,
    status: "cancelled",
    rolled_back_at: new Date().toISOString(),
    rollback_reason: "用户检查后撤销最近一轮改动",
    rollback_results: [{ checkpointId: "checkpoint-ux" }],
    delivery_summary: { ...task.delivery_summary, headline: "最近一轮改动已安全撤销", acceptance_gate_passed: false, reverted: true },
  };
  const globalDirectRollbackAlreadyNotifiedTask = {
    ...globalDirectRollbackTask,
    workflow_meta: {
      global_direct_dispatch: {
        ...globalDirectRollbackTask.workflow_meta.global_direct_dispatch,
        rollback_notified_at: new Date().toISOString(),
      },
    },
  };
  const globalDirectRollbackMessage = buildGlobalDirectDispatchRollbackMessage(globalDirectRollbackTask);
  const teamShutdownTaskId = `team-shutdown-selftest-${process.pid}-${Date.now().toString(36)}`;
  const teamShutdownTask = {
    ...task,
    id: teamShutdownTaskId,
    status: "in_progress",
    group_id: "team-shutdown-group",
    delivery_summary: task.delivery_summary,
  };
  const teamShutdownExecution = {
    status: "done",
    detail: "团队收尾门禁自测",
    report: "负责人筛选已完成",
    receipt: task.delivery_summary.receipts[0],
    review: { status: "complete", summary: "已完成最终验收" },
  };
  openTaskAgentSession({
    scopeId: teamShutdownTaskId,
    taskId: teamShutdownTaskId,
    groupId: "team-shutdown-group",
    project: "collab-web",
    agentType: "claudecode",
  });
  const openTeamSummary = buildDeliverySummary(teamShutdownTask, teamShutdownExecution, "done");
  closeTaskAgentSessions({ taskId: teamShutdownTaskId, groupId: "team-shutdown-group" }, "团队收尾门禁自测关闭会话");
  const closedTeamSummary = buildDeliverySummary(teamShutdownTask, teamShutdownExecution, "done");
  purgeTaskAgentSessions(teamShutdownTaskId);
  const independentReviewTask = {
    id: `independent-review-selftest-${process.pid}`,
    title: "调整后端订单 API",
    business_goal: "修改订单 API 并同步验证",
    workflow_type: "daily_dev",
    assign_type: "group",
    target_project: "api-service",
    group_id: "independent-review-group",
    requires_code_changes: true,
    requires_verification: true,
    status: "in_progress",
    file_changes: {
      count: 3,
      files: [
        { path: "backend/server.ts", statusText: "修改", statusKind: "modified", diff: { additions: 12, deletions: 2 } },
        { path: "backend/routes/orders.ts", statusText: "修改", statusKind: "modified", diff: { additions: 16, deletions: 1 } },
        { path: "package.json", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 1 } },
      ],
    },
  };
  const independentReviewReceipt = {
    agent: "api-service",
    status: "done",
    summary: "已调整订单 API",
    actions: ["修改订单 API", "更新路由校验"],
    filesChanged: ["backend/server.ts", "backend/routes/orders.ts", "package.json"],
    verification: ["npm run check passed by external runner (exit 0)"],
    ack: {
      understoodGoal: "修改订单 API",
      plannedScope: ["backend/server.ts", "backend/routes/orders.ts"],
      forbiddenScope: ["不改无关模块"],
      verificationPlan: ["npm run check"],
      unclear: [],
    },
    blockers: [],
    needs: [],
  };
  const independentReviewExecution = {
    status: "done",
    detail: "复杂变更独立复核自测",
    coordinationPlan: { strategy: "research_synthesis_implementation_verification", phases: ["实现", "验证", "复核"], targets: ["api-service"] },
    assignments: [{ project: "api-service", task: "修改订单 API 并提交结果说明", status: "done" }],
    report: formatCollectedAgentOutput("api-service", "已调整订单 API", independentReviewReceipt),
    receipt: independentReviewReceipt,
    review: { status: "complete", summary: "已完成最终验收" },
  };
  const missingIndependentReviewSummary = buildDeliverySummary(independentReviewTask, independentReviewExecution, "done");
  const reviewedReceipt = {
    ...independentReviewReceipt,
    independentReview: [{
      reviewer: "qa-agent",
      verdict: "passed",
      summary: "已复核后端 API 改动、路由校验和验证记录，未发现阻塞风险。",
      evidence: ["backend/server.ts", "backend/routes/orders.ts", "npm run check passed by external runner (exit 0)"],
    }],
  };
  const reviewedIndependentSummary = buildDeliverySummary(independentReviewTask, {
    ...independentReviewExecution,
    report: formatCollectedAgentOutput("api-service", "已调整订单 API，并由 qa-agent 复核通过", reviewedReceipt),
    receipt: reviewedReceipt,
  }, "done");
  const failedReviewedReceipt = {
    ...independentReviewReceipt,
    independentReview: [{
      reviewer: "test-agent",
      verdict: "failed",
      summary: "订单 API 变更复核未通过，npm run check 仍有失败。",
      evidence: ["npm run check failed", "backend/routes/orders.ts 仍需修复"],
      reviewSubject: "api-service",
    }],
  };
  const failedReviewedIndependentSummary = buildDeliverySummary(independentReviewTask, {
    ...independentReviewExecution,
    report: formatCollectedAgentOutput("test-agent", "订单 API 复核未通过，需要返工", failedReviewedReceipt),
    receipt: failedReviewedReceipt,
  }, "done");
  const independentReviewGapDraft = buildTaskGapContinuationDraft({
    ...independentReviewTask,
    delivery_summary: missingIndependentReviewSummary,
  });
  const failedIndependentReviewGapDraft = buildTaskGapContinuationDraft({
    ...independentReviewTask,
    delivery_summary: failedReviewedIndependentSummary,
  });
  const workItemSelfTest = runMainAgentWorkItemSelfTest();
  const workerHandoffSelfTest = runWorkerHandoffSelfTest();
  const globalMemoryHealthGateReceiptSelfTest = runGlobalMemoryHealthGateReceiptValidationSelfTest();
  const taskAgentMemoryContextSnapshotReceiptSelfTest = runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest();
  const workerContinuationRuntimeTask = {
    ...task,
    title: "旧目标：重构支付流程",
    business_goal: "新目标：保留旧支付表，只新增兼容字段",
    status: "in_progress",
    followup_revision: 2,
    consumed_followup_revision: 1,
    pending_followups: [{
      kind: "revise_goal",
      message: "先保留旧支付表，只新增兼容字段。",
      continuation: { route_label: "先停止当前轮再重核计划", replan_required: true },
    }],
    collaboration_state: {
      phase: "reworking",
      last_continuation: {
        source: "group_chat_followup",
        at: "2026-07-07T00:00:00.000Z",
        kind: "revise_goal",
        reason: "先保留旧支付表，只新增兼容字段。",
        status: "accepted",
        replan_required: true,
        interrupt_current_run: true,
      },
      goal_revision_interruption: {
        requested: true,
        requested_at: "2026-07-07T00:00:00.000Z",
        resolved_at: "2026-07-07T00:01:00.000Z",
        reason: "先保留旧支付表，只新增兼容字段。",
        source: "group_chat_followup",
      },
    },
    delivery_summary: {
      ...task.delivery_summary,
      headline: "上一轮已按旧支付方案改动，等待按新目标重核",
      actual_file_changes: [{ path: "backend/payment.ts" }],
      verification_executed: ["npm run check passed by external runner (exit 0)"],
    },
  };
  const workerContinuationRuntime = buildWorkerContinuationHandoff(workerContinuationRuntimeTask, "api-service", { previous_goal: "旧目标：重构支付流程" });
  const workerContinuationRuntimeHandoff = buildChildAgentWorkerHandoff("api-service", "按最新目标处理支付兼容字段", {
    task: workerContinuationRuntimeTask,
    source: "群聊主 Agent 目标调整续跑",
    reason: "用户中途调整了支付改造范围",
    continuation: workerContinuationRuntime,
    acceptance: "保留旧支付表\n新增兼容字段\n必须真实验证",
    verification_hints: ["npm run check"],
    allowed_scope: ["支付兼容字段"],
    forbidden_scope: ["删除旧支付表"],
  });
  const workerContinuationRuntimeRendered = renderSelfContainedWorkerHandoff(workerContinuationRuntimeHandoff);
  const blockedCompletionReadiness = buildUserCompletionReadinessSummary(
    { ...task, status: "in_progress" },
    {
      ...task.delivery_summary,
      team_shutdown: {
        required: true,
        pass: false,
        open_session_count: 1,
        open_sessions: [{ id: "session-hidden", project: "collab-web" }],
        unresolved_work_item_count: 1,
      },
    },
    [
      { id: "wi-api", target: "api", subject: "接口完成", status: "completed" },
      { id: "wi-web", target: "web", subject: "接入筛选 UI", status: "in_progress" },
    ],
    "reviewing",
  );
  const blockedCompletionAcceptance = buildUserAcceptanceReview(
    { ...task, status: "in_progress" },
    {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      work_item_summary: { total: 2, all_completed: false },
      team_shutdown: { required: true, pass: false, open_session_count: 1, unresolved_work_item_count: 1 },
      acceptance_gate: {
        pass: false,
        checks: [
          { id: "work_items", ok: false, detail: "raw work item detail" },
          { id: "team_shutdown", ok: false, detail: "raw team shutdown detail" },
        ],
      },
    },
    [],
    "reviewing",
  );
  const blockedCompletionVisibleText = JSON.stringify({
    title: blockedCompletionReadiness?.title,
    status_label: blockedCompletionReadiness?.status_label,
    headline: blockedCompletionReadiness?.headline,
    rows: blockedCompletionReadiness?.rows,
    next_action: blockedCompletionReadiness?.next_action,
  });
  const blockedCompletionAcceptanceVisibleText = JSON.stringify({
    title: blockedCompletionAcceptance.title,
    headline: blockedCompletionAcceptance.headline,
    missing: blockedCompletionAcceptance.missing,
    checks: blockedCompletionAcceptance.checks.map((item: any) => ({ label: item.label, detail: item.detail })),
    next_action: blockedCompletionAcceptance.next_action,
  });
  const jargonAcceptance = buildUserAcceptanceReview(
    { ...task, status: "in_progress" },
    {
      ...task.delivery_summary,
      acceptance_gate_passed: false,
      ack_gate_passed: false,
      ack_review: { rejected: [{ agent: "web", reason: "ACK raw reason" }] },
      receipt_quality_gate_passed: false,
      weak_receipt_quality: [{ agent: "web", reason: "weak receipt raw reason" }],
      memory_dispatch_gates: [{ gate_id: "memory-gate-hidden" }],
      memory_gate_receipt_rows: [{ agent: "web", memory_gate: { required: true, pass: false, missing_gate_ids: ["memory-gate-hidden"] } }],
      api_microcompact_edit_plans: [{ plan_checksum: "api-microcompact-hidden" }],
      api_microcompact_receipt_rows: [{ agent: "web", api_microcompact: { required: true, pass: false, missing_plan_checksums: ["api-microcompact-hidden"] } }],
      acceptance_gate: {
        pass: false,
        checks: [
          { id: "ack_gate", ok: false, detail: "ACK raw detail" },
          { id: "memory_gate_receipt", ok: false, detail: "记忆 gate raw detail" },
          { id: "api_microcompact_receipt", ok: false, detail: "API microcompact edit plan raw detail" },
        ],
      },
    },
    [],
    "reviewing",
  );
  const jargonAcceptanceVisibleText = JSON.stringify({
    title: jargonAcceptance.title,
    headline: jargonAcceptance.headline,
    missing: jargonAcceptance.missing,
    checks: jargonAcceptance.checks.map((item: any) => ({ label: item.label, detail: item.detail })),
    next_action: jargonAcceptance.next_action,
  });
  const collectVisibleTextValues = (value: any, blockedKeys = new Set(["schema", "id", "kind", "type", "source", "status", "tone", "rework_kind", "reworkKind"])): string[] => {
    if (Array.isArray(value)) return value.flatMap(item => collectVisibleTextValues(item, blockedKeys));
    if (!value || typeof value !== "object") return typeof value === "string" ? [value] : [];
    return Object.entries(value).flatMap(([key, item]) => blockedKeys.has(key) ? [] : collectVisibleTextValues(item, blockedKeys));
  };
  const visibleInternalTermPattern = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_id|raw receipt|raw payload|原始回执|回执/i;
  const receiptReworkVisibleText = collectVisibleTextValues({
    title: missingEvidenceCard.receipt_rework_summary?.title,
    status_label: missingEvidenceCard.receipt_rework_summary?.status_label,
    headline: missingEvidenceCard.receipt_rework_summary?.headline,
    next_action: missingEvidenceCard.receipt_rework_summary?.next_action,
    gaps: missingEvidenceCard.receipt_rework_summary?.gaps?.map((item: any) => ({
      title: item.title,
      reason: item.reason,
      missing: item.missing,
      action: { title: item.action?.title, label: item.action?.label, reason: item.action?.reason },
    })),
    active_rework: missingEvidenceCard.receipt_rework_summary?.active_rework,
    resolved: receiptResolvedCard.receipt_rework_summary?.resolved,
  }).join("\n");
  const coordinationVisibleText = collectVisibleTextValues({
    events: missingEvidenceCard.agent_coordination?.coordination_events?.map((item: any) => ({ label: item.label, detail: item.detail })),
    targeted_rework: missingEvidenceCard.agent_coordination?.targeted_rework?.map((item: any) => ({ title: item.title, reason: item.reason, label: item.label })),
    next_action: missingEvidenceCard.agent_coordination?.next_action,
  }).join("\n");
  const continuationVisibleText = collectVisibleTextValues({
    title: goalRevisionContinuationCard.continuation_status?.title,
    status_label: goalRevisionContinuationCard.continuation_status?.status_label,
    headline: goalRevisionContinuationCard.continuation_status?.headline,
    kind_label: goalRevisionContinuationCard.continuation_status?.kind_label,
    route_label: goalRevisionContinuationCard.continuation_status?.route_label,
    reason: goalRevisionContinuationCard.continuation_status?.reason,
    next_action: goalRevisionContinuationCard.continuation_status?.next_action,
    handoff_steps: goalRevisionContinuationCard.continuation_status?.handoff_steps?.map((item: any) => ({ label: item.label, detail: item.detail })),
  }).join("\n");
  const checks = buildUxSelfTestChecks({ acceptedPlanCard, acceptedPlanDraft, ackGapCard, ackGapDraft, ackGapTask, acknowledgement, activeCard, awaitingPlanCard, blockedCompletionAcceptance, blockedCompletionAcceptanceVisibleText, blockedCompletionReadiness, blockedCompletionVisibleText, card, closedTeamSummary, codeSnapshotSelfTest, collectVisibleTextValues, completedTargetDispatchLaunchSummary, continuationCard, continuationVisibleText, contractConsumedGate, contractDispatchedUnconsumedGate, contractGapDraft, contractGapTask, contractGenericApiGate, contractInjectionId, contractWeakConsumptionGate, coordinationVisibleText, differentSessionReworkReceipts, dispatchLaunchSummary, failedCard, failedIndependentReviewGapDraft, gatewayFallbackBlocked, gatewayLlmDelegates, gatewayLlmDirectAnswer, globalDirectBlockedTask, globalDirectCompletionMessage, globalDirectCompletionTask, globalDirectContinuationAlreadyNotifiedTask, globalDirectContinuationMessage, globalDirectContinuationTask, globalDirectRollbackAlreadyNotifiedTask, globalDirectRollbackMessage, globalDirectRollbackTask, globalDirectWeakCompletionTask, globalMemoryHealthGateReceiptSelfTest, globalMissionHandoff, globalQueuedMessage, goalRevisionContinuationCard, greetingCard, groupReport, handoffOnlyCard, highRiskPlan, independentReviewGapDraft, jargonAcceptance, jargonAcceptanceVisibleText, liveCheckpointCompletedCard, liveCheckpointStageCard, lowRiskPlan, memoryGateGapCard, missingEvidenceCard, missingIndependentReviewSummary, openTeamSummary, receiptResolvedCard, receiptReworkVisibleText, recoveredTestAgentNotificationTask, recoveryCard, reinjectionGateGapCard, reinjectionUsageGapCard, report, revertedCard, reviewedIndependentSummary, reviewingCard, revisedPlanCard, reworkingCard, runtimeKernelCard, sameSessionReworkReceipts, sessionProgressCard, task, taskAgentMemoryContextSnapshotReceiptSelfTest, visibleInternalTermPattern, weakAcceptanceOnlyCard, weakAcceptanceOnlyLifecycle, workItemReworkDraft, workItemSelfTest, workItemWatchdogStatus, workerContinuationRuntime, workerContinuationRuntimeHandoff, workerContinuationRuntimeRendered, workerHandoffSelfTest });
  return { pass: Object.values(checks).every(Boolean), checks, card, report };
}
