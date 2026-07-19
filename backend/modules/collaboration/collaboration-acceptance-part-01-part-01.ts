// Behavior-freeze split from collaboration-acceptance-part-01.ts (part 1/2).
// Behavior-freeze split from collaboration-acceptance.ts (part 1/2).
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
  buildApiMicrocompactReceiptVisibleSummary,
  buildGlobalMemoryHealthGateVisibleSummary,
  buildGlobalMemoryReceiptVisibleSummary,
  buildMemoryGateVisibleSummary,
  buildPostCompactDispatchMarkerVisibleSummary,
  buildPostCompactReinjectionGateVisibleSummary,
  buildReadPlanRevalidationGateVisibleSummary,
  buildRuntimeKernelSnapshot,
  buildTaskExecutionResult,
  buildTeamShutdownGate,
  buildTestAgentReviewRecheckFollowUp,
  changeLooksHighRiskForIndependentReview,
  collectIndependentReviewEvidence,
  collectProjectPolicyViolations,
  collectRuntimeToolingFromSources,
  collectTaskActualFileChanges,
  collectTaskApiMicrocompactEditPlans,
  collectTaskAssignmentEvidence,
  collectTaskCoordinationPlans,
  collectTaskGlobalMemoryHealthGates,
  collectTaskGlobalMemoryReceiptGates,
  collectTaskMemoryDispatchFreshnessGates,
  collectTaskPostCompactDispatchMarkers,
  collectTaskPostCompactReinjectionGates,
  collectTaskReadPlanRevalidationGates,
  collectTaskReworkEvidence,
  collectTaskTypedMemoryConsumptionRows,
  collectTaskTypedMemoryPressureRecallUsageRows,
  evaluateChildAgentHandoffQuality,
  evaluateReceiptApiMicrocompactEditPlan,
  evaluateReceiptGlobalMemoryHealthGate,
  evaluateReceiptGlobalMemoryUsageGate,
  evaluateReceiptMemoryDispatchGate,
  evaluateReceiptPostCompactReinjectionGate,
  findLatestTestAgentReviewReceipt,
  getProjectAgentCapabilityProfile,
  getReceiptIndependentReviewSubject,
  getReceiptTestAgentHandoff,
  getRequiredVerificationCoverage,
  getTaskAgentMemoryContextSnapshotSources,
  getTaskById,
  getVerificationEvidenceGate,
  hasDailyDevContinuationGaps,
  hasStrongTaskAcceptanceEvidence,
  inferIndependentReviewSubject,
  isAdvisoryNeed,
  isCoordinatorTestAgentName,
  isReviewLikeAgentName,
  normalizeMemoryGateAgent,
  normalizeStringArray,
  parseFormattedReceiptsFromText,
  runtimeToolDispatchBlockedMessage,
  summarizeTaskAgentMemoryContextSnapshot,
  taskChangeNeedsIndependentReview,
  taskRequiresAgentQa,
  taskRequiresCodeChanges,
  taskRequiresVerification,
  testAgentStatusToReceiptStatus,
  uniqueStrings,
} from "./collaboration";

export function evaluateReceiptTaskAgentMemoryContextSnapshot(task: any, receipt: any = {}, context: any = {}) {
  const snapshots = getTaskAgentMemoryContextSnapshotSources(context).map(summarizeTaskAgentMemoryContextSnapshot);
  const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
  const receiptTaskSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || "").trim();
  const receiptSnapshotId = String(receipt.memory_context_snapshot_id || receipt.memoryContextSnapshotId || "").trim();
  const receiptSnapshotChecksum = String(receipt.memory_context_snapshot_checksum || receipt.memoryContextSnapshotChecksum || "").trim();
  const declaredUsage = receipt.agentMemoryContextUsage
    || receipt.agent_memory_context_usage
    || receipt.memoryContextUsage
    || receipt.memory_context_usage
    || null;
  const declaredBindingId = String(declaredUsage?.bindingId || declaredUsage?.binding_id || "").trim();
  const declaredGroupSessionId = String(declaredUsage?.groupSessionId || declaredUsage?.group_session_id || "").trim();
  const declaredSessionMemoryChecksum = String(declaredUsage?.sessionMemoryChecksum || declaredUsage?.session_memory_checksum || "").trim();
  const declaredModelExtractionExecutionId = String(declaredUsage?.modelExtractionExecutionId || declaredUsage?.model_extraction_execution_id || "").trim();
  const declaredModelExtractionReplayStatus = String(declaredUsage?.modelExtractionReplayStatus || declaredUsage?.model_extraction_replay_status || "").trim();
  const declaredFactSupersessionGraphChecksum = String(declaredUsage?.factSupersessionGraphChecksum || declaredUsage?.fact_supersession_graph_checksum || "").trim();
  const declaredUsageState = String(declaredUsage?.usageState || declaredUsage?.usage_state || "").trim().toLowerCase();
  const declaredReason = String(declaredUsage?.reason || "").trim();
  const declaredFactCitations = Array.isArray(receipt.memoryFactCitations || receipt.memory_fact_citations)
    ? (receipt.memoryFactCitations || receipt.memory_fact_citations)
    : [];
  const matchingAgent = snapshots.filter((snapshot: any) => {
    const target = normalizeMemoryGateAgent(snapshot.project);
    return !target || !agent || target === agent;
  });
  const evaluated = matchingAgent.map((snapshot: any) => {
    const sessionId = String(snapshot.task_agent_session_id || "").trim();
    const binding = snapshot.group_session_memory_binding || {};
    const delivery = snapshot.delivery_receipt || {};
    const systemSessionBound = !!receiptTaskSessionId && sessionId === receiptTaskSessionId;
    const systemSnapshotBound = !!receiptSnapshotId && snapshot.snapshot_id === receiptSnapshotId;
    const systemChecksumBound = !!receiptSnapshotChecksum && snapshot.checksum === receiptSnapshotChecksum;
    const deliveryBound = delivery?.delivered === true
      && delivery?.status === "delivered"
      && snapshot.delivery_receipt_checksum_valid === true
      && String(delivery.taskAgentSessionId || "") === sessionId
      && String(delivery.memoryContextSnapshotId || "") === String(snapshot.snapshot_id || "")
      && String(delivery.memoryContextSnapshotChecksum || "") === String(snapshot.checksum || "")
      && String(delivery.groupSessionMemoryBinding?.scopeId || "") === String(snapshot.group_session_scope_id || binding.scopeId || "")
      && String(delivery.groupSessionMemoryBinding?.checksum || "") === String(binding.checksum || "")
      && String(delivery.groupSessionMemoryBindingChecksum || "") === String(binding.checksum || "")
      && delivery.modelExtractionEvidenceValid !== false;
    const bindingIdMatches = !!declaredBindingId && declaredBindingId === String(snapshot.memory_binding_id || binding.memoryBindingId || "");
    const groupSessionMatches = !!declaredGroupSessionId && declaredGroupSessionId === String(snapshot.group_session_id || binding.groupSessionId || "");
    const expectedSessionMemoryChecksum = String(snapshot.session_memory_checksum || binding.sessionMemoryChecksum || "");
    const sessionMemoryChecksumMatches = expectedSessionMemoryChecksum
      ? declaredSessionMemoryChecksum === expectedSessionMemoryChecksum
      : declaredSessionMemoryChecksum === "";
    const expectedModelExtractionExecutionId = String(binding.modelExtractionExecutionId || binding.model_extraction_execution_id || "").trim();
    const expectedModelExtractionReplayStatus = String(binding.modelExtractionReplayStatus || binding.model_extraction_replay_status || "").trim();
    const expectedFactSupersessionGraphChecksum = String(binding.factSupersessionGraphChecksum || binding.fact_supersession_graph_checksum || "").trim();
    const modelExtractionExecutionMatches = declaredModelExtractionExecutionId === expectedModelExtractionExecutionId;
    const modelExtractionReplayStatusMatches = declaredModelExtractionReplayStatus === expectedModelExtractionReplayStatus;
    const factSupersessionGraphChecksumMatches = declaredFactSupersessionGraphChecksum === expectedFactSupersessionGraphChecksum;
    const modelExtractionEvidencePass = binding.modelExtractionEvidenceRequired !== true || (
      binding.modelExtractionEvidenceValid === true
      && binding.deliveryReady !== false
      && String(binding.modelExtractionReplayExecutionId || binding.model_extraction_replay_execution_id || "") === expectedModelExtractionExecutionId
      && expectedModelExtractionReplayStatus === "verified"
      && modelExtractionExecutionMatches
      && modelExtractionReplayStatusMatches
      && factSupersessionGraphChecksumMatches
    );
    const usageStateValid = ["used", "verified", "ignored"].includes(declaredUsageState);
    const declarationCoherent = declaredUsageState === "ignored"
      ? Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) && (receipt.memoryIgnored || receipt.memory_ignored).length > 0
      : Array.isArray(receipt.memoryUsed || receipt.memory_used) && (receipt.memoryUsed || receipt.memory_used).length > 0;
    const expectedSectionEvidence = Array.isArray(binding.sessionMemorySectionEvidence || binding.session_memory_section_evidence)
      ? (binding.sessionMemorySectionEvidence || binding.session_memory_section_evidence)
      : [];
    const expectedEvidenceById = new Map(expectedSectionEvidence.map((item: any) => [
      String(item?.evidenceId || item?.evidence_id || "").trim(),
      item,
    ]).filter(([id]: any) => !!id));
    const expectedActiveFacts = Array.isArray(binding.activeFacts || binding.active_facts)
      ? (binding.activeFacts || binding.active_facts)
      : [];
    const expectedActiveFactById = new Map(expectedActiveFacts.map((fact: any) => [
      String(fact?.factId || fact?.fact_id || "").trim(),
      fact,
    ]).filter(([id]: any) => !!id));
    const activeFactMessageIds = new Set(uniqueStrings(expectedActiveFacts.map((fact: any) => fact?.sourceMessageId || fact?.source_message_id || "")));
    const evaluatedFactCitations = declaredFactCitations.map((citation: any) => {
      const evidenceId = String(citation?.evidenceId || citation?.evidence_id || "").trim();
      const expected: any = expectedEvidenceById.get(evidenceId) || null;
      const section = String(citation?.section || "").trim();
      const sectionChecksum = String(citation?.sectionChecksum || citation?.section_checksum || "").trim();
      const sourceTranscriptChecksum = String(citation?.sourceTranscriptChecksum || citation?.source_transcript_checksum || "").trim();
      const sourceMessageIds = uniqueStrings(citation?.sourceMessageIds || citation?.source_message_ids || []).slice(0, 40);
      const usage = String(citation?.usage || citation?.reason || "").trim();
      const factId = String(citation?.factId || citation?.fact_id || "").trim();
      const factChecksum = String(citation?.factChecksum || citation?.fact_checksum || "").trim();
      const expectedActiveFact: any = expectedActiveFactById.get(factId) || null;
      const sectionMatches = !!expected && section === String(expected.section || "").trim();
      const sectionChecksumMatches = !!expected && sectionChecksum === String(expected.sectionChecksum || expected.section_checksum || "").trim();
      const expectedSourceChecksum = String(expected?.sourceTranscriptChecksum || expected?.source_transcript_checksum || "").trim();
      const sourceTranscriptChecksumMatches = !!expected && (!expectedSourceChecksum || sourceTranscriptChecksum === expectedSourceChecksum);
      const expectedSourceMessageIds = new Set(uniqueStrings(expected?.sourceMessageIds || expected?.source_message_ids || []));
      const sourceMessageIdsRequired = expectedSourceMessageIds.size > 0;
      const sourceMessageIdsMatch = !sourceMessageIdsRequired
        || (sourceMessageIds.length > 0 && sourceMessageIds.every((messageId: string) => expectedSourceMessageIds.has(messageId)));
      const referencesActiveFactSource = sourceMessageIds.some((messageId: string) => activeFactMessageIds.has(messageId));
      const activeFactBindingRequired = !!factId || !!factChecksum || referencesActiveFactSource;
      const activeFactBindingMatches = !activeFactBindingRequired || (
        !!expectedActiveFact
        && factId === String(expectedActiveFact.factId || expectedActiveFact.fact_id || "")
        && factChecksum === String(expectedActiveFact.factChecksum || expectedActiveFact.fact_checksum || "")
      );
      return {
        evidence_id: evidenceId,
        section,
        section_checksum: sectionChecksum,
        source_transcript_checksum: sourceTranscriptChecksum,
        source_message_ids: sourceMessageIds,
        usage,
        fact_id: factId,
        fact_checksum: factChecksum,
        active_fact_binding_required: activeFactBindingRequired,
        active_fact_binding_matches: activeFactBindingMatches,
        known_evidence: !!expected,
        section_matches: sectionMatches,
        section_checksum_matches: sectionChecksumMatches,
        source_transcript_checksum_matches: sourceTranscriptChecksumMatches,
        source_message_ids_required: sourceMessageIdsRequired,
        source_message_ids_match: sourceMessageIdsMatch,
        pass: !!expected && sectionMatches && sectionChecksumMatches && sourceTranscriptChecksumMatches && sourceMessageIdsMatch && activeFactBindingMatches && !!usage,
      };
    });
    const citationsRequired = expectedSectionEvidence.length > 0 && ["used", "verified"].includes(declaredUsageState);
    const factCitationsPass = declaredUsageState === "ignored"
      ? declaredFactCitations.length === 0
      : !citationsRequired || (evaluatedFactCitations.length > 0 && evaluatedFactCitations.every((item: any) => item.pass));
    const pass = systemSessionBound
      && systemSnapshotBound
      && systemChecksumBound
      && deliveryBound
      && bindingIdMatches
      && groupSessionMatches
      && sessionMemoryChecksumMatches
      && modelExtractionExecutionMatches
      && modelExtractionReplayStatusMatches
      && factSupersessionGraphChecksumMatches
      && modelExtractionEvidencePass
      && usageStateValid
      && declarationCoherent
      && factCitationsPass
      && !!declaredReason;
    return {
      ...snapshot,
      pass,
      system_session_bound: systemSessionBound,
      system_snapshot_bound: systemSnapshotBound,
      system_checksum_bound: systemChecksumBound,
      delivery_bound: deliveryBound,
      binding_id_matches: bindingIdMatches,
      group_session_matches: groupSessionMatches,
      session_memory_checksum_matches: sessionMemoryChecksumMatches,
      model_extraction_execution_matches: modelExtractionExecutionMatches,
      model_extraction_replay_status_matches: modelExtractionReplayStatusMatches,
      fact_supersession_graph_checksum_matches: factSupersessionGraphChecksumMatches,
      model_extraction_evidence_passed: modelExtractionEvidencePass,
      usage_state_valid: usageStateValid,
      declaration_coherent: declarationCoherent,
      memory_fact_citations_required: citationsRequired,
      memory_fact_citations_passed: factCitationsPass,
      memory_fact_citations: evaluatedFactCitations,
      available_memory_section_evidence_count: expectedSectionEvidence.length,
    };
  });
  const bound = evaluated.filter((snapshot: any) => snapshot.pass === true);
  const required = matchingAgent.length > 0;
  const pass = !required || bound.length > 0;
  return {
    schema: "ccm-task-agent-memory-context-consumption-validation-v4",
    required,
    pass,
    snapshot_ids: matchingAgent.map((snapshot: any) => snapshot.snapshot_id).filter(Boolean),
    matched_snapshot_ids: bound.map((snapshot: any) => snapshot.snapshot_id).filter(Boolean),
    missing_snapshot_ids: pass ? [] : matchingAgent.map((snapshot: any) => snapshot.snapshot_id).filter(Boolean),
    task_agent_session_ids: matchingAgent.map((snapshot: any) => snapshot.task_agent_session_id).filter(Boolean),
    receipt_task_agent_session_id: receiptTaskSessionId,
    receipt_memory_context_snapshot_id: receiptSnapshotId,
    receipt_memory_context_snapshot_checksum: receiptSnapshotChecksum,
    declared_usage: declaredUsage,
    declared_binding_id: declaredBindingId,
    declared_group_session_id: declaredGroupSessionId,
    declared_session_memory_checksum: declaredSessionMemoryChecksum,
    declared_model_extraction_execution_id: declaredModelExtractionExecutionId,
    declared_model_extraction_replay_status: declaredModelExtractionReplayStatus,
    declared_fact_supersession_graph_checksum: declaredFactSupersessionGraphChecksum,
    declared_usage_state: declaredUsageState,
    declared_memory_fact_citations: declaredFactCitations,
    memory_fact_citations_required: evaluated.some((snapshot: any) => snapshot.memory_fact_citations_required === true),
    memory_fact_citations_passed: !required || evaluated.some((snapshot: any) => snapshot.pass === true && snapshot.memory_fact_citations_passed === true),
    system_delivery_required: required,
    system_delivery_passed: evaluated.some((snapshot: any) => snapshot.delivery_bound === true
      && snapshot.system_session_bound === true
      && snapshot.system_snapshot_bound === true
      && snapshot.system_checksum_bound === true),
    agent_declaration_required: required,
    agent_declaration_passed: evaluated.some((snapshot: any) => snapshot.binding_id_matches === true
      && snapshot.group_session_matches === true
      && snapshot.session_memory_checksum_matches === true
      && snapshot.model_extraction_execution_matches === true
      && snapshot.model_extraction_replay_status_matches === true
      && snapshot.fact_supersession_graph_checksum_matches === true
      && snapshot.model_extraction_evidence_passed === true
      && snapshot.usage_state_valid === true
      && snapshot.declaration_coherent === true
      && snapshot.memory_fact_citations_passed === true
      && !!declaredReason),
    gate_ids: uniqueStrings(...matchingAgent.map((snapshot: any) => snapshot.gate_ids || [])).slice(0, 80),
    matched_gate_ids: uniqueStrings(...bound.map((snapshot: any) => snapshot.gate_ids || [])).slice(0, 80),
    rows: evaluated,
  };
}

export function evaluateReceiptReadPlanRevalidationGate(task: any, receipt: any = {}, context: any = {}) {
  const allGates = Array.isArray(context.readPlanRevalidationGates || context.read_plan_revalidation_gates)
    ? (context.readPlanRevalidationGates || context.read_plan_revalidation_gates)
    : collectTaskReadPlanRevalidationGates(task, context);
  const agent = normalizeMemoryGateAgent(receipt.agent || receipt.project || task?.target_project);
  const matchingCandidates = allGates.filter((gate: any) => {
    const target = normalizeMemoryGateAgent(gate.target_project);
    return (!target || !agent || target === agent) && (Number(gate.required_count || 0) > 0 || Number(gate.verification_count || 0) > 0);
  });
  const used = Array.isArray(receipt.memoryUsed || receipt.memory_used) ? (receipt.memoryUsed || receipt.memory_used) : [];
  const ignored = Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) ? (receipt.memoryIgnored || receipt.memory_ignored) : [];
  const structuredUsageRows = Array.isArray(receipt.readPlanRevalidationUsage || receipt.read_plan_revalidation_usage)
    ? (receipt.readPlanRevalidationUsage || receipt.read_plan_revalidation_usage)
    : [];
  const structuredUsageText = structuredUsageRows.map((row: any) => [
    row.gateId || row.gate_id || row.revalidationGateId || row.revalidation_gate_id ? `revalidation_gate_id=${row.gateId || row.gate_id || row.revalidationGateId || row.revalidation_gate_id}` : "",
    row.readPlanId || row.read_plan_id ? `read_plan_id=${row.readPlanId || row.read_plan_id}` : "",
    row.referenceId || row.reference_id ? `reference_id=${row.referenceId || row.reference_id}` : "",
    row.currentSourceVerified === true || row.current_source_verified === true ? "current source verified" : "",
    row.ignored === true || row.ignored_with_reason === true || row.usageState === "ignored" || row.usage_state === "ignored" ? `ignored ${row.reason || ""}` : "",
  ].filter(Boolean).join("; ")).join("\n");
  const usedText = used.map((item: any) => String(item || "")).join("\n");
  const ignoredText = ignored.map((item: any) => String(item || "")).join("\n");
  const receiptActions = Array.isArray(receipt.actions) ? receipt.actions.map((item: any) => String(item || "")) : [];
  const actionText = receiptActions.join("\n");
  const declarationText = [usedText, ignoredText, structuredUsageText, receipt.summary, actionText, ...(Array.isArray(receipt.verification) ? receipt.verification : [])].map((item: any) => String(item || "")).join("\n");
  const receiptTaskSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || structuredUsageRows.find((row: any) => row.task_agent_session_id || row.taskAgentSessionId)?.task_agent_session_id || structuredUsageRows.find((row: any) => row.task_agent_session_id || row.taskAgentSessionId)?.taskAgentSessionId || "").trim();
  const receiptNativeSessionId = String(receipt.native_session_id || receipt.nativeSessionId || structuredUsageRows.find((row: any) => row.native_session_id || row.nativeSessionId)?.native_session_id || structuredUsageRows.find((row: any) => row.native_session_id || row.nativeSessionId)?.nativeSessionId || "").trim();
  const boundSessionCandidates = receiptTaskSessionId
    ? matchingCandidates.filter((gate: any) => !gate.task_agent_session_id || String(gate.task_agent_session_id) === receiptTaskSessionId)
    : [];
  const sessionCandidates = receiptTaskSessionId && boundSessionCandidates.length
    ? boundSessionCandidates
    : matchingCandidates;
  const latestTurn = Math.max(0, ...sessionCandidates.map((gate: any) => Number(gate.turn || 0)));
  const matching = latestTurn > 0
    ? sessionCandidates.filter((gate: any) => Number(gate.turn || 0) === latestTurn)
    : sessionCandidates;
  const hasVerifiedSignal = /(re[\s_-]?read|reread|current source verified|verified current source|current source|source verified|latest source|current file|current checksum|重新读取|重读|当前源|当前文件|最新源|重新核验|重新核对|已核验|已验证|校验当前)/i.test(declarationText);
  const hasIgnoredSignal = /(memoryignored|memory ignored|ignored|ignore|skip|not used|not needed|unused|不使用|未使用|忽略|跳过|无需使用|缺失|不存在|missing)/i.test(ignoredText || declarationText);
  const hasBoundRevalidationShorthand = /(?:readPlanRevalidation|read_plan_revalidation|读取计划重读|读取计划复核)\s*[:=：]/i.test(declarationText);
  const hasConcreteCurrentSourceReadAction = receiptActions.some((action: string) =>
    /(?:re[\s_-]?read|reread|重新读取|重读|读取)/i.test(action)
    && /(?:确认|核验|核对|验证|当前|最终|current|latest|verify|confirm)/i.test(action)
    && /(?:[\w@./\\-]+\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|vue|json|yaml|yml|md|py|java|go|rs|cs|sql|prisma)|当前(?:源|文件)|source|file)/i.test(action)
  );
  const changedFiles = Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files)
    ? (receipt.filesChanged || receipt.files_changed || receipt.files).map((item: any) => String(typeof item === "string" ? item : item?.path || item?.file || "")).filter(Boolean)
    : [];
  const hasConcreteCurrentSourceDiffEvidence = changedFiles.length > 0
    && receiptActions.some((action: string) => /git\s+diff/i.test(action) && /(?:确认|核验|核对|检查|verify|confirm|check)/i.test(action));
  const rows = matching.map((gate: any) => {
    const gateId = String(gate.gate_id || "").trim();
    const requiredIds = Array.isArray(gate.required_read_plan_ids) ? gate.required_read_plan_ids.filter(Boolean) : [];
    const expectedTaskSessionId = String(gate.task_agent_session_id || "").trim();
    const expectedNativeSessionId = String(gate.native_session_id || "").trim();
    const sessionRequired = !!(expectedTaskSessionId || expectedNativeSessionId);
    const taskSessionMatched = !expectedTaskSessionId || receiptTaskSessionId === expectedTaskSessionId;
    const nativeSessionMatched = !expectedNativeSessionId || receiptNativeSessionId === expectedNativeSessionId || !receiptNativeSessionId;
    const sessionMatched = taskSessionMatched && nativeSessionMatched;
    const boundShorthand = matching.length === 1 && structuredUsageRows.length === 0 && sessionMatched && hasBoundRevalidationShorthand;
    const boundActionEvidence = matching.length === 1
      && structuredUsageRows.length === 0
      && sessionMatched
      && (hasConcreteCurrentSourceReadAction || hasConcreteCurrentSourceDiffEvidence);
    const boundEvidence = boundShorthand || boundActionEvidence;
    const gateMentioned = (!!gateId && declarationText.includes(gateId)) || boundEvidence;
    const missingReadPlanIds = boundEvidence ? [] : requiredIds.filter((id: string) => !declarationText.includes(String(id || "")));
    const currentSourceVerified = gateMentioned
      && missingReadPlanIds.length === 0
      && (hasVerifiedSignal || boundActionEvidence);
    const ignoredWithReason = gateMentioned && missingReadPlanIds.length === 0 && hasIgnoredSignal;
    const pass = gateMentioned && missingReadPlanIds.length === 0 && sessionMatched && (currentSourceVerified || ignoredWithReason);
    return {
      gate_id: gateId,
      status: gate.status || "",
      required_read_plan_ids: requiredIds,
      missing_read_plan_ids: missingReadPlanIds,
      gate_mentioned: gateMentioned,
      current_source_verified: currentSourceVerified,
      ignored_with_reason: ignoredWithReason,
      session_required: sessionRequired,
      session_matched: sessionMatched,
      expected_task_agent_session_id: expectedTaskSessionId,
      receipt_task_agent_session_id: receiptTaskSessionId,
      expected_native_session_id: expectedNativeSessionId,
      receipt_native_session_id: receiptNativeSessionId,
      declaration_binding: boundShorthand
        ? "unique_gate_session_bound_shorthand"
        : boundActionEvidence
          ? "unique_gate_session_bound_current_source_action"
          : "explicit_ids",
      pass,
    };
  });
  const missing = rows.filter((row: any) => !row.pass);
  return {
    schema: "ccm-child-agent-read-plan-revalidation-gate-receipt-validation-v1",
    required: matching.length > 0,
    pass: matching.length === 0 || missing.length === 0,
    gate_ids: matching.map((gate: any) => gate.gate_id),
    missing_gate_ids: rows.filter((row: any) => !row.gate_mentioned).map((row: any) => row.gate_id),
    missing_read_plan_ids: uniqueStrings(...rows.map((row: any) => row.missing_read_plan_ids || [])).slice(0, 40),
    session_required: rows.some((row: any) => row.session_required),
    session_matched: rows.every((row: any) => !row.session_required || row.session_matched),
    session_mismatch_gate_ids: rows.filter((row: any) => row.session_required && !row.session_matched).map((row: any) => row.gate_id),
    current_source_verified: rows.some((row: any) => row.current_source_verified),
    ignored_with_reason: rows.some((row: any) => row.ignored_with_reason),
    rows,
    declared: used.length > 0 || ignored.length > 0,
    structured_usage_rows: structuredUsageRows.slice(0, 24),
    used,
    ignored,
  };
}

export function scoreChildAgentReceipt(task: any, receipt: any = {}, context: any = {}) {
  const receiptText = [
    receipt.summary,
    ...(Array.isArray(receipt.actions) ? receipt.actions : []),
    ...(Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) ? (receipt.filesChanged || receipt.files_changed || receipt.files) : []),
  ].filter(Boolean).join("\n");
  const contractLikely = /接口|API|api|schema|DTO|类型|字段|契约|路由|endpoint|request|response/i.test(receiptText);
  const ack = receipt.ack || null;
  const contractChanges = Array.isArray(receipt.contractChanges || receipt.contract_changes) ? (receipt.contractChanges || receipt.contract_changes) : [];
  const memoryGate = evaluateReceiptMemoryDispatchGate(task, receipt, context);
  const globalMemoryGate = evaluateReceiptGlobalMemoryUsageGate(task, receipt, context);
  const globalMemoryHealthGate = evaluateReceiptGlobalMemoryHealthGate(task, receipt, context);
  const readPlanRevalidationGate = evaluateReceiptReadPlanRevalidationGate(task, receipt, context);
  const postCompactReinjectionGate = evaluateReceiptPostCompactReinjectionGate(task, receipt, context);
  const apiMicrocompactPlan = evaluateReceiptApiMicrocompactEditPlan(task, receipt, context);
  const taskAgentMemorySnapshot = evaluateReceiptTaskAgentMemoryContextSnapshot(task, receipt, context);
  const snapshotMatchedGateIds = new Set(taskAgentMemorySnapshot.matched_gate_ids || []);
  const memoryGateProvenBySnapshot = memoryGate.required
    && memoryGate.declared
    && taskAgentMemorySnapshot.pass === true
    && (memoryGate.missing_gate_ids || []).every((gateId: string) => snapshotMatchedGateIds.has(gateId));
  const effectiveMemoryGate = memoryGateProvenBySnapshot
    ? { ...memoryGate, pass: true, missing_gate_ids: [], proven_by_memory_context_snapshot: true }
    : memoryGate;
  const globalMemoryHealthProvenBySnapshot = globalMemoryHealthGate.required
    && globalMemoryHealthGate.declared
    && taskAgentMemorySnapshot.pass === true
    && (globalMemoryHealthGate.missing_gate_ids || []).every((gateId: string) => snapshotMatchedGateIds.has(gateId))
    && (globalMemoryHealthGate.rows || []).every((row: any) => row.status === "ok" && row.blocked_global_memory_used !== true);
  const effectiveGlobalMemoryHealthGate = globalMemoryHealthProvenBySnapshot
    ? {
        ...globalMemoryHealthGate,
        pass: true,
        missing_gate_ids: [],
        proven_by_memory_context_snapshot: true,
        rows: (globalMemoryHealthGate.rows || []).map((row: any) => ({ ...row, pass: true, proven_by_memory_context_snapshot: true })),
      }
    : globalMemoryHealthGate;
  const handoffQuality = evaluateChildAgentHandoffQuality(task, receipt);
  const checks = [
    { id: "status_done", label: "状态明确", ok: String(receipt.status || "") === "done" },
    { id: "structured_ack", label: "结构化 ACK", ok: !!ack && (!!ack.understoodGoal || !!ack.goal || (Array.isArray(ack.plannedScope) && ack.plannedScope.length > 0)) },
    { id: "summary", label: "说明完成内容", ok: String(receipt.summary || "").trim().length >= 8 },
    { id: "actions", label: "列出执行动作", ok: Array.isArray(receipt.actions) && receipt.actions.length > 0 },
    { id: "files", label: "列出文件变更", ok: !taskRequiresCodeChanges(task) || (Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) && (receipt.filesChanged || receipt.files_changed || receipt.files).length > 0) },
    { id: "verification", label: "列出已执行验证", ok: !taskRequiresVerification(task) || (Array.isArray(receipt.verification || receipt.tests) && (receipt.verification || receipt.tests).length > 0) },
    { id: "not_handoff_only", label: "完成执行而非仅建议", ok: handoffQuality.pass, detail: handoffQuality.reason },
    { id: "contract_changes", label: "结构化契约变化", ok: !contractLikely || contractChanges.length > 0 },
    { id: "no_open_blockers", label: "无开放阻塞", ok: !(Array.isArray(receipt.blockers) && receipt.blockers.length) && !(Array.isArray(receipt.needs) && receipt.needs.some((item: any) => !isAdvisoryNeed(item, task))) },
    { id: "memory_declared", label: "声明记忆使用", ok: Array.isArray(receipt.memoryUsed || receipt.memory_used) || Array.isArray(receipt.memoryIgnored || receipt.memory_ignored) },
    { id: "task_agent_memory_snapshot", label: "匹配本轮记忆快照", ok: !taskAgentMemorySnapshot.required || taskAgentMemorySnapshot.pass, detail: taskAgentMemorySnapshot.required ? `snapshot=${taskAgentMemorySnapshot.matched_snapshot_ids.join(",") || "missing"} session=${taskAgentMemorySnapshot.receipt_task_agent_session_id || "missing"}` : "not_required" },
    { id: "memory_gate", label: "引用记忆派发 gate", ok: !effectiveMemoryGate.required || effectiveMemoryGate.pass, detail: effectiveMemoryGate.required ? `gate=${effectiveMemoryGate.gate_ids.join(",") || "unknown"}` : "not_required" },
    { id: "global_memory_usage", label: "声明全局记忆使用状态", ok: !globalMemoryGate.required || globalMemoryGate.pass, detail: globalMemoryGate.required ? `global_memory=${globalMemoryGate.global_memory_ids.join(",") || "unknown"}` : "not_required" },
    { id: "global_memory_health_gate", label: "声明全局记忆健康门禁", ok: !effectiveGlobalMemoryHealthGate.required || effectiveGlobalMemoryHealthGate.pass, detail: effectiveGlobalMemoryHealthGate.required ? `gate=${effectiveGlobalMemoryHealthGate.gate_ids.join(",") || "unknown"}` : "not_required" },
    { id: "read_plan_revalidation_gate", label: "重读 stale read plan", ok: !readPlanRevalidationGate.required || readPlanRevalidationGate.pass, detail: readPlanRevalidationGate.required ? `gate=${readPlanRevalidationGate.gate_ids.join(",") || "unknown"} session=${readPlanRevalidationGate.session_matched !== false}` : "not_required" },
    { id: "post_compact_reinjection_gate", label: "引用压缩后重注入 gate", ok: !postCompactReinjectionGate.required || !(postCompactReinjectionGate.missing_gate_ids || []).length, detail: postCompactReinjectionGate.required ? `gate=${postCompactReinjectionGate.gate_ids.join(",") || "unknown"}` : "not_required" },
    { id: "post_compact_reinjection_candidate", label: "声明压缩重注入候选", ok: !postCompactReinjectionGate.candidate_reference_required || postCompactReinjectionGate.candidate_reference_passed, detail: postCompactReinjectionGate.candidate_reference_required ? `candidate=${postCompactReinjectionGate.referenced_candidate_ids?.join(",") || (postCompactReinjectionGate.all_candidates_declared ? "all" : "missing")}` : "not_required" },
    { id: "post_compact_reinjection_candidate_usage", label: "声明候选使用状态", ok: !postCompactReinjectionGate.candidate_usage_required || postCompactReinjectionGate.candidate_usage_declared_passed, detail: postCompactReinjectionGate.candidate_usage_required ? `used=${postCompactReinjectionGate.used_candidate_ids?.join(",") || "0"} ignored=${postCompactReinjectionGate.ignored_candidate_ids?.join(",") || "0"} verified=${postCompactReinjectionGate.verified_candidate_ids?.join(",") || "0"}` : "not_required" },
    { id: "api_microcompact_receipt", label: "声明 API microcompact 使用状态", ok: !apiMicrocompactPlan.required || apiMicrocompactPlan.pass, detail: apiMicrocompactPlan.required ? `plans=${apiMicrocompactPlan.plan_checksums.join(",") || "unknown"}` : "not_required" },
  ];
  const passed = checks.filter(item => item.ok).length;
  const rawScore = Math.round((passed / checks.length) * 100);
  const hardFail = (effectiveMemoryGate.required && !effectiveMemoryGate.pass)
    || (taskAgentMemorySnapshot.required && !taskAgentMemorySnapshot.pass)
    || (globalMemoryGate.required && !globalMemoryGate.pass)
    || (effectiveGlobalMemoryHealthGate.required && !effectiveGlobalMemoryHealthGate.pass)
    || (readPlanRevalidationGate.required && !readPlanRevalidationGate.pass)
    || (postCompactReinjectionGate.required && !postCompactReinjectionGate.pass)
    || (postCompactReinjectionGate.candidate_usage_required && !postCompactReinjectionGate.candidate_usage_declared_passed)
    || (apiMicrocompactPlan.required && !apiMicrocompactPlan.pass)
    || !handoffQuality.pass;
  const score = hardFail ? Math.min(rawScore, 70) : rawScore;
  return {
    score,
    grade: hardFail ? "partial" : score >= 85 ? "good" : score >= 60 ? "partial" : "weak",
    pass: !hardFail && score >= 85,
    checks,
    task_agent_memory_snapshot: taskAgentMemorySnapshot,
    memory_gate: effectiveMemoryGate,
    global_memory_gate: globalMemoryGate,
    global_memory_health_gate: effectiveGlobalMemoryHealthGate,
    read_plan_revalidation_gate: readPlanRevalidationGate,
    post_compact_reinjection_gate: postCompactReinjectionGate,
    api_microcompact: apiMicrocompactPlan,
    handoff_quality: handoffQuality,
    missing: checks.filter(item => !item.ok).map(item => item.label),
  };
}

export function buildIndependentReviewGate(task: any, actualFileChanges: any[] = [], receipts: any[] = [], agentQa: any[] = []) {
  const {
    explainIndependentReviewTriggerDecision,
    formatIndependentReviewGateUserDetail,
  } = require("./collaboration-runtime-status-helpers");
  const decision = explainIndependentReviewTriggerDecision(task, actualFileChanges);
  const highRiskFiles = decision.highRiskFiles || (actualFileChanges || []).filter(changeLooksHighRiskForIndependentReview);
  const required = decision.required === true;
  const evidence = collectIndependentReviewEvidence(receipts, agentQa);
  const failedEvidence = evidence.filter((item: any) => item.status === "failed");
  const passedEvidence = evidence.filter((item: any) => item.status === "passed");
  const recheckEvidence = evidence.filter((item: any) => item.status === "needs_recheck");
  const environmentEvidence = evidence.filter((item: any) => item.status === "needs_environment");
  const needsUserEvidence = evidence.filter((item: any) => item.status === "needs_user");
  const hasPendingEvidence = recheckEvidence.length > 0 || environmentEvidence.length > 0 || needsUserEvidence.length > 0;
  const gate = {
    required,
    pass: !required || (passedEvidence.length > 0 && failedEvidence.length === 0 && !hasPendingEvidence),
    status: !required
      ? "not_required"
      : failedEvidence.length
        ? "failed"
        : recheckEvidence.length
          ? "needs_recheck"
          : environmentEvidence.length
            ? "needs_environment"
            : needsUserEvidence.length
              ? "needs_user"
              : passedEvidence.length
                ? "passed"
                : "missing",
    reason: required
      ? (decision.triggerReasons.join("；") || "复杂代码变更需要另一个 Agent 复核")
      : (decision.skipReasons.join("；") || "本次变更不强制独立复核"),
    decision_detail: decision.decisionDetail,
    decisionDetail: decision.decisionDetail,
    trigger_reasons: decision.triggerReasons,
    triggerReasons: decision.triggerReasons,
    skip_reasons: decision.skipReasons,
    skipReasons: decision.skipReasons,
    file_change_count: decision.fileChangeCount,
    high_risk_files: highRiskFiles.map((item: any) => ({ project: item.project || item.agent || "", path: item.path || "" })).slice(0, 12),
    evidence_count: evidence.length,
    passed_count: passedEvidence.length,
    failed_count: failedEvidence.length,
    needs_recheck_count: recheckEvidence.length,
    needs_environment_count: environmentEvidence.length,
    needs_user_count: needsUserEvidence.length,
    evidence,
    failed_evidence: failedEvidence,
    recheck_evidence: recheckEvidence,
    environment_evidence: environmentEvidence,
    needs_user_evidence: needsUserEvidence,
  };
  return {
    ...gate,
    user_detail: formatIndependentReviewGateUserDetail(gate),
    userDetail: formatIndependentReviewGateUserDetail(gate),
  };
}

export function buildAcceptanceGate(task: any, execution: any, summary: any, finalStatus: string) {
  const memoryGateSummary = buildMemoryGateVisibleSummary(summary);
  const globalMemoryReceiptSummary = buildGlobalMemoryReceiptVisibleSummary(summary);
  const globalMemoryHealthGateSummary = buildGlobalMemoryHealthGateVisibleSummary(summary);
  const readPlanRevalidationGateSummary = buildReadPlanRevalidationGateVisibleSummary(summary);
  const reinjectionGateSummary = buildPostCompactReinjectionGateVisibleSummary(summary);
  const apiMicrocompactSummary = buildApiMicrocompactReceiptVisibleSummary(summary);
  const taskAgentMemorySnapshotRequired = Number(summary.task_agent_memory_context_snapshot_count || summary.taskAgentMemoryContextSnapshotCount || 0) > 0;
  const checks = [
    { id: "coordinator_plan", label: "主 Agent 计划", ok: Number(summary.coordination_plan_count || 0) > 0, detail: `计划 ${summary.coordination_plan_count || 0} 条` },
    { id: "assignment", label: "子 Agent 派发", ok: Number(summary.assignment_count || 0) > 0 || task?.assign_type !== "group", detail: `派发 ${summary.assignment_count || 0} 条` },
    { id: "worker_receipt", label: "子 Agent 结果说明", ok: (summary.receipt_statuses || []).some((item: any) => item.status === "done") || task?.assign_type !== "group", detail: `结果说明 ${(summary.receipt_statuses || []).length} 条` },
    { id: "work_items", label: "执行队列收敛", ok: !summary.work_item_summary?.total || summary.work_item_summary?.all_completed === true, detail: summary.work_item_summary?.total ? `未完成 ${summary.team_shutdown?.unresolved_work_item_count || 0}/${summary.work_item_summary.total}` : "无独立工作项" },
    { id: "ack_gate", label: "ACK 前置审核", ok: !(taskRequiresCodeChanges(task) || taskRequiresVerification(task)) || summary.ack_gate_passed === true, detail: summary.ack_review?.rejected?.length ? `需重写 ACK ${summary.ack_review.rejected.length} 条` : "通过" },
    { id: "receipt_quality", label: "结果说明质量", ok: !taskRequiresCodeChanges(task) && !taskRequiresVerification(task) || summary.receipt_quality_gate_passed === true, detail: summary.weak_receipt_quality?.length ? `待补结果说明 ${summary.weak_receipt_quality.length} 条` : "通过" },
    { id: "task_agent_memory_snapshot_receipt", label: "子 Agent 记忆快照匹配", ok: !taskAgentMemorySnapshotRequired || summary.task_agent_memory_snapshot_receipt_passed === true, detail: taskAgentMemorySnapshotRequired ? `快照 ${summary.task_agent_memory_context_snapshot_count || 0} 个` : "未触发" },
    { id: "memory_gate_receipt", label: "记忆使用声明", ok: !memoryGateSummary.required || memoryGateSummary.pass === true, detail: memoryGateSummary.summary },
    { id: "global_memory_receipt", label: "全局记忆使用声明", ok: !globalMemoryReceiptSummary.required || globalMemoryReceiptSummary.pass === true, detail: globalMemoryReceiptSummary.summary },
    { id: "global_memory_health_gate_receipt", label: "全局记忆健康门禁声明", ok: !globalMemoryHealthGateSummary.required || globalMemoryHealthGateSummary.pass === true, detail: globalMemoryHealthGateSummary.summary },
    { id: "read_plan_revalidation_gate_receipt", label: "读取计划重读声明", ok: !readPlanRevalidationGateSummary.required || readPlanRevalidationGateSummary.pass === true, detail: readPlanRevalidationGateSummary.summary },
    { id: "post_compact_reinjection_gate_receipt", label: "压缩重注入声明", ok: !reinjectionGateSummary.required || reinjectionGateSummary.pass === true, detail: reinjectionGateSummary.summary },
    { id: "api_microcompact_receipt", label: "API microcompact 使用声明", ok: !apiMicrocompactSummary.required || apiMicrocompactSummary.pass === true, detail: apiMicrocompactSummary.summary },
    { id: "contract_injection", label: "契约注入依赖 Agent", ok: summary.contract_injection_gate_passed !== false, detail: summary.contract_injection_gate?.missing?.length ? `待注入 ${summary.contract_injection_gate.missing.length} 个 Agent` : summary.contract_injection_gate?.unconsumed?.length ? `待消费结果说明 ${summary.contract_injection_gate.unconsumed.length} 个 Agent` : "通过" },
    { id: "final_review", label: "主 Agent 验收", ok: !!summary.has_final_review || finalStatus === "failed" || task?.assign_type !== "group", detail: summary.review_status || "" },
    { id: "actual_changes", label: "真实文件变更", ok: !taskRequiresCodeChanges(task) || Number(summary.actual_file_change_count || 0) > 0, detail: `变更 ${summary.actual_file_change_count || 0} 个文件` },
    { id: "verification", label: "已执行验证", ok: !taskRequiresVerification(task) || Number(summary.verification_executed?.length || 0) > 0, detail: `已执行 ${summary.verification_executed?.length || 0} 条` },
    { id: "required_verification", label: "项目验证命令覆盖", ok: !taskRequiresVerification(task) || summary.verification_required_gate_passed !== false, detail: summary.verification_required_missing?.length ? `缺 ${summary.verification_required_missing.length} 项` : "已覆盖" },
    { id: "verification_source", label: "独立验证来源", ok: !taskRequiresVerification(task) || summary.verification_source_gate_passed === true, detail: (summary.verification_sources || []).includes("test_agent_and_main_agent_spot_check") ? "TestAgent 与主 Agent 抽查已交叉验证" : `外部 Runner ${summary.external_runner_verification_count || 0} 条` },
    {
      id: "independent_review",
      label: "复杂变更独立复核",
      ok: summary.independent_review_required !== true || summary.independent_review_gate_passed === true,
      detail: (summary.independent_review_gate?.user_detail
        || summary.independent_review_gate?.userDetail
        || (summary.independent_review_required
          ? `${summary.independent_review_gate?.status || "missing"}；${summary.independent_review_gate?.reason || "需要独立复核"}；证据 ${summary.independent_review_gate?.evidence_count || 0} 条`
          : (summary.independent_review_gate?.decision_detail
            || summary.independent_review_gate?.reason
            || "未触发：本次变更不强制独立复核"))),
    },
    { id: "post_review_spot_check", label: "TestAgent 通过后抽查", ok: summary.post_review_spot_check_required !== true || summary.post_review_spot_check_gate_passed === true, detail: summary.post_review_spot_check_required ? `${summary.post_review_spot_check_gate?.status || "missing"}；抽查 ${summary.post_review_spot_check?.executed_count || 0} 项` : "未触发" },
    { id: "agent_qa", label: "Agent 协作问答", ok: !taskRequiresAgentQa(task) || summary.agent_qa_gate_passed === true, detail: taskRequiresAgentQa(task) ? `问答 ${summary.agent_qa_count || 0}，采纳 ${summary.agent_qa_accepted_count || 0}，续跑 ${summary.agent_qa_resumed_count || 0}` : "未要求" },
    { id: "team_shutdown", label: "团队收尾", ok: finalStatus !== "done" || summary.team_shutdown?.pass === true, detail: finalStatus === "done" ? `开放会话 ${summary.team_shutdown?.open_session_count || 0}，未完成工作项 ${summary.team_shutdown?.unresolved_work_item_count || 0}` : "最终交付前检查" },
    { id: "goal_coverage", label: "目标覆盖", ok: finalStatus === "failed" || task?.assign_type !== "group" || (!!summary.has_final_review && !(summary.blockers || []).length && !(summary.blocking_needs || []).length), detail: summary.has_final_review ? "已完成主 Agent 最终复盘" : "等待主 Agent 最终复盘确认目标覆盖" },
    { id: "no_blockers", label: "无开放阻塞", ok: !(summary.blockers || []).length && !(summary.blocking_needs || []).length && !(summary.agent_qa_has_open_items), detail: `阻塞 ${(summary.blockers || []).length}，待补 ${(summary.blocking_needs || []).length}` },
    { id: "policy", label: "项目边界", ok: summary.project_policy_gate_passed !== false, detail: summary.project_policy_violations?.length ? `违规 ${summary.project_policy_violations.length} 项` : "通过" },
  ];
  const failed = checks.filter(item => !item.ok);
  return {
    pass: failed.length === 0,
    status: failed.length === 0 ? "passed" : finalStatus === "failed" ? "failed" : "blocked",
    failed_count: failed.length,
    checks,
    failed_checks: failed,
    generated_at: new Date().toISOString(),
  };
}

export function selectLatestDurableReceipts(receiptCandidates: any[] = []) {
  const receiptAgents = new Set<string>();
  return receiptCandidates.filter(Boolean).flatMap((receipt: any, index: number) => {
    const agent = String(receipt?.agent || "").trim().toLowerCase();
    if (!agent) return [receipt];
    if (receiptAgents.has(agent)) return [];
    receiptAgents.add(agent);
    if (receipt.ack) return [receipt];
    const taskSessionId = String(receipt.task_agent_session_id || receipt.taskAgentSessionId || "").trim();
    const nativeSessionId = String(receipt.native_session_id || receipt.nativeSessionId || "").trim();
    const priorWithBoundAck = receiptCandidates.slice(index + 1).find((candidate: any) => {
      if (String(candidate?.agent || "").trim().toLowerCase() !== agent || !candidate?.ack) return false;
      const candidateTaskSessionId = String(candidate.task_agent_session_id || candidate.taskAgentSessionId || "").trim();
      const candidateNativeSessionId = String(candidate.native_session_id || candidate.nativeSessionId || "").trim();
      return (!!taskSessionId && !!candidateTaskSessionId && taskSessionId === candidateTaskSessionId)
        || (!!nativeSessionId && !!candidateNativeSessionId && nativeSessionId === candidateNativeSessionId);
    });
    return priorWithBoundAck
      ? [{ ...receipt, ack: priorWithBoundAck.ack }]
      : [receipt];
  });
}
