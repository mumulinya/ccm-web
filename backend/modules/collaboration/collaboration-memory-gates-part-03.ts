// Behavior-freeze split from collaboration-memory-gates.ts (part 3/3).
/** Task memory gate collection, receipt evaluation, and visible summaries. Behavior-preserving extraction from the collaboration facade. */
import { normalizeStringArray, uniqueStrings } from "./collaboration";

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

export function buildPostCompactReinjectionGateVisibleSummary(summary: any = {}) {
  const gates = Array.isArray(summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
    ? (summary.post_compact_reinjection_gates || summary.postCompactReinjectionGates)
    : [];
  const rows = Array.isArray(summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows)
    ? (summary.post_compact_reinjection_gate_receipt_rows || summary.postCompactReinjectionGateReceiptRows)
    : [];
  const gateIds = uniqueStrings(...gates.map((gate: any) => gate.gate_id || gate.reinjection_gate_id || gate.reinjectionGateId || gate.id || ""));
  const visibleRows = rows.map((row: any) => {
    const gate = row.post_compact_reinjection_gate || row.postCompactReinjectionGate || row;
    const missingGateIds = uniqueStrings(...normalizeStringArray(gate.missing_gate_ids || gate.missingGateIds || row.missing_gate_ids || row.missingGateIds));
    const missingCandidateGateIds = uniqueStrings(...normalizeStringArray(gate.missing_candidate_reference_gate_ids || gate.missingCandidateReferenceGateIds || row.missing_candidate_reference_gate_ids || row.missingCandidateReferenceGateIds));
    const missingCandidateUsageGateIds = uniqueStrings(...normalizeStringArray(gate.missing_candidate_usage_gate_ids || gate.missingCandidateUsageGateIds || row.missing_candidate_usage_gate_ids || row.missingCandidateUsageGateIds));
    const missingCandidateUsageCandidateIds = uniqueStrings(...normalizeStringArray(gate.missing_candidate_usage_candidate_ids || gate.missingCandidateUsageCandidateIds || row.missing_candidate_usage_candidate_ids || row.missingCandidateUsageCandidateIds));
    const rowGateIds = uniqueStrings(...normalizeStringArray(gate.gate_ids || gate.gateIds || row.gate_ids || row.gateIds), ...missingGateIds);
    const candidateReferencePassed = gate.candidate_reference_passed !== false && row.candidate_reference_passed !== false && missingCandidateGateIds.length === 0;
    const candidateUsagePassed = gate.candidate_usage_declared_passed !== false
      && row.candidate_usage_declared_passed !== false
      && gate.candidate_usage_strict_passed !== false
      && row.candidate_usage_strict_passed !== false
      && missingCandidateUsageGateIds.length === 0
      && missingCandidateUsageCandidateIds.length === 0;
    const pass = (gate.pass === true || row.pass === true || (missingGateIds.length === 0 && gate.required === true)) && candidateReferencePassed && candidateUsagePassed;
    const required = gate.required === true || row.required === true || rowGateIds.length > 0 || missingGateIds.length > 0 || missingCandidateGateIds.length > 0 || missingCandidateUsageGateIds.length > 0 || missingCandidateUsageCandidateIds.length > 0;
    const status = !required
      ? "not_required"
      : missingGateIds.length
        ? "missing_receipt_reference"
        : !candidateReferencePassed
          ? "missing_candidate_reference"
          : !candidateUsagePassed
            ? "missing_candidate_usage"
            : pass ? "passed" : "missing_receipt_reference";
    const usageCounts = gate.candidate_usage_counts || gate.candidateUsageCounts || row.candidate_usage_counts || row.candidateUsageCounts || {};
    return {
      agent: row.agent || row.project || row.target || "",
      status,
      status_label: status === "passed" ? "已声明" : status === "missing_candidate_usage" ? "缺使用状态" : status === "missing_candidate_reference" ? "缺候选声明" : status === "missing_receipt_reference" ? "缺重注入声明" : "未触发",
      gate_ids: rowGateIds.slice(0, 12),
      missing_gate_ids: missingGateIds.slice(0, 12),
      missing_candidate_reference_gate_ids: missingCandidateGateIds.slice(0, 12),
      missing_candidate_usage_gate_ids: missingCandidateUsageGateIds.slice(0, 12),
      missing_candidate_usage_candidate_ids: missingCandidateUsageCandidateIds.slice(0, 24),
      candidate_count: Number(gate.candidate_count || row.candidate_count || 0),
      candidate_reference_required: gate.candidate_reference_required === true || row.candidate_reference_required === true,
      candidate_reference_passed: candidateReferencePassed,
      candidate_usage_required: gate.candidate_usage_required === true || row.candidate_usage_required === true,
      candidate_usage_declared_passed: candidateUsagePassed,
      candidate_usage_strict_required: gate.candidate_usage_strict_required === true || row.candidate_usage_strict_required === true,
      candidate_usage_strict_passed: candidateUsagePassed,
      candidate_usage_counts: {
        used: Number(usageCounts.used || 0),
        ignored: Number(usageCounts.ignored || 0),
        verified: Number(usageCounts.verified || 0),
        mentioned: Number(usageCounts.mentioned || 0),
        unreferenced: Number(usageCounts.unreferenced || 0),
      },
      candidate_usage_rows: Array.isArray(gate.candidate_usage_rows || gate.candidateUsageRows || row.candidate_usage_rows || row.candidateUsageRows)
        ? (gate.candidate_usage_rows || gate.candidateUsageRows || row.candidate_usage_rows || row.candidateUsageRows).slice(0, 24)
        : [],
      referenced_candidate_ids: uniqueStrings(gate.referenced_candidate_ids || gate.referencedCandidateIds || row.referenced_candidate_ids || row.referencedCandidateIds || []).slice(0, 24),
      used_candidate_ids: uniqueStrings(gate.used_candidate_ids || gate.usedCandidateIds || row.used_candidate_ids || row.usedCandidateIds || []).slice(0, 24),
      ignored_candidate_ids: uniqueStrings(gate.ignored_candidate_ids || gate.ignoredCandidateIds || row.ignored_candidate_ids || row.ignoredCandidateIds || []).slice(0, 24),
      verified_candidate_ids: uniqueStrings(gate.verified_candidate_ids || gate.verifiedCandidateIds || row.verified_candidate_ids || row.verifiedCandidateIds || []).slice(0, 24),
      mentioned_only_candidate_ids: uniqueStrings(gate.mentioned_only_candidate_ids || gate.mentionedOnlyCandidateIds || row.mentioned_only_candidate_ids || row.mentionedOnlyCandidateIds || []).slice(0, 24),
      unreferenced_candidate_ids: uniqueStrings(gate.unreferenced_candidate_ids || gate.unreferencedCandidateIds || row.unreferenced_candidate_ids || row.unreferencedCandidateIds || []).slice(0, 24),
      all_candidates_declared: gate.all_candidates_declared === true || row.all_candidates_declared === true,
      declared: gate.declared === true,
      reason: status === "missing_candidate_usage"
        ? `结果说明已引用候选，但缺少 used / ignored / verified 使用状态声明：${missingCandidateUsageCandidateIds.join("、") || missingCandidateUsageGateIds.join("、") || rowGateIds.join("、") || "本轮重注入候选"}`
        : status === "missing_candidate_reference"
        ? `结果说明已引用 gate，但缺少具体 candidate_id / 候选值 / 全部候选声明：${missingCandidateGateIds.join("、") || rowGateIds.join("、") || "本轮重注入 gate"}`
        : status === "missing_receipt_reference"
        ? `结果说明缺少压缩后重注入 gate 引用：${missingGateIds.join("、") || rowGateIds.join("、") || "本轮重注入 gate"}`
        : status === "passed"
          ? "结果说明已声明压缩前重注入候选的使用情况"
          : "本轮未触发压缩后重注入 gate",
    };
  });
  const missingGateIds = uniqueStrings(...visibleRows.map((row: any) => row.missing_gate_ids || []));
  const missingCandidateGateIds = uniqueStrings(...visibleRows.map((row: any) => row.missing_candidate_reference_gate_ids || []));
  const missingCandidateUsageGateIds = uniqueStrings(...visibleRows.map((row: any) => row.missing_candidate_usage_gate_ids || []));
  const missingCandidateUsageCandidateIds = uniqueStrings(...visibleRows.map((row: any) => row.missing_candidate_usage_candidate_ids || []));
  const required = gates.length > 0 || visibleRows.some((row: any) => row.status !== "not_required") || Number(summary.post_compact_reinjection_gate_count || summary.postCompactReinjectionGateCount || 0) > 0;
  const pass = !required
    || summary.post_compact_reinjection_gate_receipt_passed === true
    || summary.postCompactReinjectionGateReceiptPassed === true
    || (visibleRows.length > 0 && visibleRows.every((row: any) => row.status !== "missing_receipt_reference" && row.status !== "missing_candidate_reference" && row.status !== "missing_candidate_usage"));
  const status = !required
    ? "not_required"
    : pass
      ? "passed"
      : missingGateIds.length
        ? "missing_receipt_reference"
        : missingCandidateGateIds.length
          ? "missing_candidate_reference"
          : "missing_candidate_usage";
  const candidateCount = gates.reduce((sum: number, gate: any) => sum + Number(gate.candidate_count || gate.candidateCount || 0), 0);
  const usageCounts = visibleRows.reduce((acc: any, row: any) => {
    const counts = row.candidate_usage_counts || {};
    acc.used += Number(counts.used || 0);
    acc.ignored += Number(counts.ignored || 0);
    acc.verified += Number(counts.verified || 0);
    acc.mentioned += Number(counts.mentioned || 0);
    acc.unreferenced += Number(counts.unreferenced || 0);
    return acc;
  }, { used: 0, ignored: 0, verified: 0, mentioned: 0, unreferenced: 0 });
  return {
    schema: "ccm-post-compact-reinjection-gate-visible-summary-v1",
    required,
    pass,
    status,
    status_label: status === "passed" ? "已通过" : status === "missing_candidate_usage" ? "缺使用状态" : status === "missing_candidate_reference" ? "缺候选声明" : status === "missing_receipt_reference" ? "缺重注入声明" : "未触发",
    summary: !required
      ? "本轮未触发压缩后重注入校验"
      : pass
        ? `子 Agent 已声明压缩后重注入 gate（${gateIds.length || Number(summary.post_compact_reinjection_gate_count || 0)} 个，候选 ${candidateCount} 条）`
        : missingGateIds.length
          ? `还有 ${missingGateIds.length || visibleRows.filter((row: any) => row.status === "missing_receipt_reference").length} 个压缩后重注入 gate 未被结果说明引用`
        : missingCandidateGateIds.length
          ? `还有 ${missingCandidateGateIds.length} 个压缩后重注入 gate 缺少候选级声明`
          : `还有 ${missingCandidateUsageGateIds.length} 个压缩后重注入 gate 缺少候选 used / ignored / verified 声明`,
    gate_count: gateIds.length || Number(summary.post_compact_reinjection_gate_count || summary.postCompactReinjectionGateCount || 0),
    candidate_count: candidateCount,
    candidate_usage_counts: usageCounts,
    gate_ids: gateIds.slice(0, 20),
    missing_gate_ids: missingGateIds.slice(0, 20),
    missing_candidate_reference_gate_ids: missingCandidateGateIds.slice(0, 20),
    missing_candidate_usage_gate_ids: missingCandidateUsageGateIds.slice(0, 20),
    missing_candidate_usage_candidate_ids: missingCandidateUsageCandidateIds.slice(0, 40),
    missing_count: missingGateIds.length + missingCandidateGateIds.length + missingCandidateUsageGateIds.length + missingCandidateUsageCandidateIds.length,
    rows: visibleRows.slice(0, 20),
  };
}

export function buildApiMicrocompactReceiptVisibleSummary(summary: any = {}) {
  const plans = Array.isArray(summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
    ? (summary.api_microcompact_edit_plans || summary.apiMicrocompactEditPlans)
    : [];
  const rows = Array.isArray(summary.api_microcompact_receipt_rows || summary.apiMicrocompactReceiptRows)
    ? (summary.api_microcompact_receipt_rows || summary.apiMicrocompactReceiptRows)
    : [];
  const planChecksums = uniqueStrings(...plans.map((plan: any) => plan.plan_checksum || plan.planChecksum || plan.checksum || ""));
  const visibleRows = rows.map((row: any) => {
    const gate = row.api_microcompact || row.apiMicrocompact || row.api_microcompact_receipt || row.apiMicrocompactReceipt || row;
    const missing = uniqueStrings(...normalizeStringArray(gate.missing_plan_checksums || gate.missingPlanChecksums || row.missing_plan_checksums || row.missingPlanChecksums));
    const unsafe = uniqueStrings(...normalizeStringArray(gate.unsafe_native_applied_plan_checksums || gate.unsafeNativeAppliedPlanChecksums || row.unsafe_native_applied_plan_checksums || row.unsafeNativeAppliedPlanChecksums));
    const sessionMismatch = uniqueStrings(...normalizeStringArray(gate.session_mismatch_plan_checksums || gate.sessionMismatchPlanChecksums || row.session_mismatch_plan_checksums || row.sessionMismatchPlanChecksums));
    const checksums = uniqueStrings(...normalizeStringArray(gate.plan_checksums || gate.planChecksums || row.plan_checksums || row.planChecksums), ...missing, ...unsafe, ...sessionMismatch);
    const required = gate.required === true || row.required === true || checksums.length > 0;
    const pass = gate.pass === true || row.pass === true || (required && !missing.length && !unsafe.length && !sessionMismatch.length);
    const status = !required
      ? "not_required"
      : unsafe.length
        ? "unsafe_native_applied"
        : sessionMismatch.length
          ? "session_mismatch"
          : missing.length
          ? "missing_usage_declaration"
          : pass ? "passed" : "missing_usage_declaration";
    return {
      agent: row.agent || row.project || row.target || "",
      status,
      status_label: status === "passed" ? "已声明" : status === "unsafe_native_applied" ? "误报原生应用" : status === "session_mismatch" ? "会话不匹配" : status === "missing_usage_declaration" ? "缺使用声明" : "未触发",
      plan_checksums: checksums.slice(0, 12),
      missing_plan_checksums: missing.slice(0, 12),
      unsafe_native_applied_plan_checksums: unsafe.slice(0, 12),
      session_mismatch_plan_checksums: sessionMismatch.slice(0, 12),
      native_applied_count: Number(gate.native_applied_count || row.native_applied_count || 0),
      advisory_count: Number(gate.advisory_count || row.advisory_count || 0),
      ignored_count: Number(gate.ignored_count || row.ignored_count || 0),
      rows: Array.isArray(gate.rows || row.rows) ? (gate.rows || row.rows).slice(0, 12) : [],
      reason: status === "passed"
        ? "结果说明已声明 API microcompact edit plan 的 native/advisory/ignored 使用状态"
        : status === "unsafe_native_applied"
          ? `第三方 CLI 场景不得声称已原生应用 API context-management：${unsafe.join("、")}`
          : status === "session_mismatch"
            ? `API microcompact 使用声明来自错误或缺失的子 Agent 会话：${sessionMismatch.join("、")}`
          : status === "missing_usage_declaration"
            ? `结果说明缺少 API microcompact edit plan 使用状态：${missing.join("、") || checksums.join("、") || "本轮计划"}`
            : "本轮未触发 API microcompact 回执校验",
    };
  });
  const missing = uniqueStrings(...visibleRows.map((row: any) => row.missing_plan_checksums || []));
  const unsafe = uniqueStrings(...visibleRows.map((row: any) => row.unsafe_native_applied_plan_checksums || []));
  const sessionMismatch = uniqueStrings(...visibleRows.map((row: any) => row.session_mismatch_plan_checksums || []));
  const required = plans.length > 0 || visibleRows.some((row: any) => row.status !== "not_required") || Number(summary.api_microcompact_edit_plan_count || summary.apiMicrocompactEditPlanCount || 0) > 0;
  const pass = !required
    || ((summary.api_microcompact_receipt_passed === true || summary.apiMicrocompactReceiptPassed === true) && !missing.length && !unsafe.length && !sessionMismatch.length)
    || (visibleRows.length > 0 && visibleRows.every((row: any) => row.status === "passed"));
  const status = !required ? "not_required" : pass ? "passed" : unsafe.length ? "unsafe_native_applied" : sessionMismatch.length ? "session_mismatch" : "missing_usage_declaration";
  return {
    schema: "ccm-api-microcompact-receipt-visible-summary-v1",
    required,
    pass,
    status,
    status_label: status === "passed" ? "已通过" : status === "unsafe_native_applied" ? "误报原生应用" : status === "session_mismatch" ? "会话不匹配" : status === "missing_usage_declaration" ? "缺使用声明" : "未触发",
    summary: !required
      ? "本轮未触发 API microcompact edit plan 回执校验"
      : pass
        ? `子 Agent 已声明 API microcompact edit plan（${planChecksums.length || Number(summary.api_microcompact_edit_plan_count || 0)} 个）`
        : unsafe.length
          ? `还有 ${unsafe.length} 个计划在不支持 native apply 时被声明为原生应用`
        : sessionMismatch.length
          ? `还有 ${sessionMismatch.length} 个 API microcompact 使用声明没有匹配本轮子 Agent 会话或记忆快照`
          : `还有 ${missing.length || visibleRows.filter((row: any) => row.status === "missing_usage_declaration").length} 个 API microcompact edit plan 缺少使用状态声明`,
    plan_count: planChecksums.length || Number(summary.api_microcompact_edit_plan_count || summary.apiMicrocompactEditPlanCount || 0),
    plan_checksums: planChecksums.slice(0, 20),
    missing_plan_checksums: missing.slice(0, 20),
    unsafe_native_applied_plan_checksums: unsafe.slice(0, 20),
    session_mismatch_plan_checksums: sessionMismatch.slice(0, 20),
    native_applied_count: visibleRows.reduce((sum: number, row: any) => sum + Number(row.native_applied_count || 0), 0),
    advisory_count: visibleRows.reduce((sum: number, row: any) => sum + Number(row.advisory_count || 0), 0),
    ignored_count: visibleRows.reduce((sum: number, row: any) => sum + Number(row.ignored_count || 0), 0),
    missing_count: missing.length + unsafe.length + sessionMismatch.length,
    rows: visibleRows.slice(0, 20),
  };
}

export function buildPostCompactDispatchMarkerVisibleSummary(summary: any = {}) {
  const markers = Array.isArray(summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
    ? (summary.post_compact_dispatch_markers || summary.postCompactDispatchMarkers)
    : [];
  const rows = markers.map((marker: any) => {
    const first = marker.first_dispatch_after_compact === true || marker.firstDispatchAfterCompact === true;
    const sequence = Number(marker.dispatch_sequence || marker.dispatchSequence || 0);
    const status = first ? "first_dispatch_after_compact" : sequence > 0 ? "followup_dispatch_after_compact" : "recorded";
    return {
      agent: marker.target_project || marker.targetProject || marker.agent || marker.project || "",
      status,
      status_label: first ? "压缩后首次派发" : sequence > 0 ? `第 ${sequence} 次派发` : "已记录",
      marker_id: marker.marker_id || marker.markerId || "",
      boundary_id: marker.boundary_id || marker.boundaryId || "",
      summary_checksum: marker.summary_checksum || marker.summaryChecksum || "",
      dispatch_sequence: sequence,
      first_dispatch_after_compact: first,
      reinjection_gate_id: marker.reinjection_gate_id || marker.reinjectionGateId || "",
      candidate_count: Number(marker.candidate_count || marker.candidateCount || 0),
      source: marker.source || "",
      reason: first
        ? "该子 Agent 收到压缩恢复后的第一跳记忆包"
        : sequence > 0
          ? `该子 Agent 已是同一压缩边界后的第 ${sequence} 次派发`
          : "已记录压缩后派发 marker",
    };
  });
  const markerIds = uniqueStrings(...rows.map((row: any) => row.marker_id || ""));
  const boundaryIds = uniqueStrings(...rows.map((row: any) => row.boundary_id || ""));
  const firstRows = rows.filter((row: any) => row.first_dispatch_after_compact);
  const required = markers.length > 0 || Number(summary.post_compact_dispatch_marker_count || summary.postCompactDispatchMarkerCount || 0) > 0;
  const status = !required ? "not_required" : firstRows.length ? "first_dispatch_after_compact" : "followup_dispatch_after_compact";
  return {
    schema: "ccm-post-compact-dispatch-marker-visible-summary-v1",
    required,
    pass: true,
    status,
    status_label: !required ? "未触发" : firstRows.length ? "压缩后首次派发" : "压缩后后续派发",
    summary: !required
      ? "本轮未记录压缩后派发 marker"
      : firstRows.length
        ? `已记录 ${firstRows.length} 个子 Agent 收到压缩恢复后的第一跳记忆包`
        : `已记录 ${rows.length} 个压缩后后续派发 marker`,
    marker_count: markerIds.length || Number(summary.post_compact_dispatch_marker_count || summary.postCompactDispatchMarkerCount || 0),
    first_dispatch_count: firstRows.length,
    marker_ids: markerIds.slice(0, 20),
    boundary_ids: boundaryIds.slice(0, 20),
    rows: rows.slice(0, 20),
  };
}

export function normalizeReplayRepairDispatchBriefRef(item: any = {}, fallback: any = {}) {
  if (!item || typeof item !== "object") return null;
  const briefId = String(item.brief_id || item.briefId || "").trim();
  if (!briefId) return null;
  return {
    brief_id: briefId,
    work_item_id: String(item.work_item_id || item.workItemId || "").trim(),
    source: String(item.source || "").trim(),
    target_project: String(item.target_project || item.targetProject || fallback.project || "").trim(),
    proof_entry_id: String(item.proof_entry_id || item.proofEntryId || "").trim(),
    request_patch_checksum: String(item.request_patch_checksum || item.requestPatchChecksum || "").trim(),
    provider_reproof_status: String(item.provider_reproof_status || item.providerReproofStatus || "").trim(),
    provider_reproof_reason: String(item.provider_reproof_reason || item.providerReproofReason || "").trim(),
    reproof_candidate_id: String(item.reproof_candidate_id || item.reproofCandidateId || "").trim(),
    timeline_binding_id: String(item.timeline_binding_id || item.timelineBindingId || "").trim(),
    original_work_item_id: String(item.original_work_item_id || item.originalWorkItemId || "").trim(),
    request_telemetry_session_status: String(item.request_telemetry_session_status || item.requestTelemetrySessionStatus || "").trim(),
    request_telemetry_dispatch_status: String(item.request_telemetry_dispatch_status || item.requestTelemetryDispatchStatus || "").trim(),
    runner_request_id: String(item.runner_request_id || item.runnerRequestId || "").trim(),
    execution_id: String(item.execution_id || item.executionId || fallback.executionId || fallback.execution_id || "").trim(),
    should_create_real_task: item.should_create_real_task === false || item.shouldCreateRealTask === false ? false : false,
  };
}

export function collectReplayRepairDispatchBriefRefs(value: any, fallback: any = {}, out: any[] = [], seen = new Set<string>()) {
  if (!value || typeof value !== "object") return out;
  const push = (item: any) => {
    const normalized = normalizeReplayRepairDispatchBriefRef(item, fallback);
    if (!normalized) return;
    const key = normalized.brief_id;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };
  push(value.replay_repair_dispatch_brief || value.replayRepairDispatchBrief || null);
  if (Array.isArray(value.replay_repair_dispatch_briefs || value.replayRepairDispatchBriefs)) {
    for (const item of value.replay_repair_dispatch_briefs || value.replayRepairDispatchBriefs) push(item);
  }
  const packet = value.worker_context_packet || value.workerContextPacket || null;
  if (packet && packet !== value) {
    if (Array.isArray(packet.replay_repair_dispatch_briefs || packet.replayRepairDispatchBriefs)) {
      for (const item of packet.replay_repair_dispatch_briefs || packet.replayRepairDispatchBriefs) push(item);
    }
  }
  const receipt = value.receipt || null;
  if (receipt && receipt !== value) collectReplayRepairDispatchBriefRefs(receipt, fallback, out, seen);
  return out;
}

export function replayRepairDispatchBriefRefsForMention(mention: any, context: any = {}) {
  const packet = context.workerContextPacket || mention?.worker_context_packet || mention?.workerContextPacket || context.workerHandoff?.worker_context_packet || null;
  return collectReplayRepairDispatchBriefRefs({
    replay_repair_dispatch_brief: mention?.replay_repair_dispatch_brief || mention?.replayRepairDispatchBrief || null,
    replay_repair_dispatch_briefs: [
      ...(Array.isArray(mention?.replay_repair_dispatch_briefs || mention?.replayRepairDispatchBriefs) ? (mention.replay_repair_dispatch_briefs || mention.replayRepairDispatchBriefs) : []),
      ...(Array.isArray(packet?.replay_repair_dispatch_briefs || packet?.replayRepairDispatchBriefs) ? (packet.replay_repair_dispatch_briefs || packet.replayRepairDispatchBriefs) : []),
    ],
    worker_context_packet: packet,
    receipt: context.receipt || null,
  }, { project: context.targetName || mention?.targetName || mention?.project || "", executionId: context.executionId || context.execution_id || "" });
}
