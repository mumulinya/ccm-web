// Behavior-freeze split from group-memory-context.ts (part 2/5).
// Behavior-freeze module extracted mechanically from the former facade.

import * as fs from "fs";

import * as path from "path";

import * as crypto from "crypto";

import { loadProjectConfigs, loadTasks } from "../../core/db";

import { CCM_DIR, getWorkDirForProject } from "../../core/utils";

import { buildContextBudget, estimateTextTokens } from "../../system/context-budget";

import { buildToolAuthorizationPayload, normalizeToolAuthorization } from "../../tools/tool-authorization";

import { toolManager } from "../../tools/tool-manager";

import { getPublicAgentRuntimes, normalizeAgentRuntimeId } from "../../agents/runtime";

import {
  buildBoundedRecentGroupContext,
  buildDeterministicConversationSummary,
  buildGroupApiMicroCompactEditPlan,
  buildGroupApiMicrocompactNativeApplyPlan,
  buildGroupTimeBasedThinkingProjection,
  buildGroupTimeBasedToolResultProjection,
  buildGroupCompactStrategyDecision,
  buildGroupCompactEpoch,
  buildGroupPostCompactCleanupAudit,
  buildGroupPostCompactSessionStateResetReceipt,
  buildGroupPostCompactRecoveryAudit,
  buildGroupPostCompactTaskStatusProjection,
  buildGroupPostCompactDynamicContextDeltaProjection,
  verifyGroupPostCompactMessageOrderReceipt,
  verifyGroupCompactLineage,
  verifyGroupCompactionModelUsageReceipt,
  verifyGroupPostCompactSessionStateResetReceipt,
  buildGroupPreservedSegment,
  buildGroupMicroCompactPlan,
  buildGroupPtlRecoveryPlan,
  buildPostCompactReinjectionPlan,
  calculateGroupCompactWarningState,
  calculateGroupMessagesToKeepIndex,
  buildRelevantHistoricalGroupContext,
  compactGroupConversationMemory,
  estimateGroupMessageTokens,
  estimateGroupTextTokens,
  GROUP_COMPACT_MAX_KEEP_TOKENS,
  GROUP_COMPACT_MIN_KEEP_MESSAGES,
  GROUP_COMPACT_MIN_KEEP_TOKENS,
  GROUP_MEMORY_COMPACTION_VERSION,
  renderConversationSummary } from "./group-memory-compaction";

import {
  buildGroupTypedMemoryLoadPlan,
  buildGroupTypedMemoryIndex,
  buildGroupTypedMemoryRecall,
  getOrRefreshGlobalProviderDispatchReliabilitySnapshot,
  buildPressureProvenancePreDispatchComplianceDispatchPolicy,
  buildPostCompactCompletionMemoryPreservationClosureUsageSummary,
  deriveGroupTypedMemoryTargetPaths,
  distillGroupMessagesToTypedMemory,
  distillGroupMessagesToTypedMemoryUntilCaughtUp,
  evaluateGroupTypedMemoryDistillationQuality,
  getAlreadySurfacedGroupTypedMemory,
  getGroupTypedMemoryRecallScopeStats,
  getGroupTypedMemoryDir,
  importGlobalClaudeMemoryToGroupTypedMemory,
  importProjectMemoryFilesToGroupTypedMemory,
  recordGroupTypedMemoryRecall,
  recordGroupTypedMemoryManifestSelectorOutcome,
  selectGroupTypedMemoryManifest,
  readGroupTypedMemoryRecallLedger,
  recordGroupTypedMemoryPressureRecallUsageLedger,
  readGroupTypedMemoryDistillationLedger,
  renderGroupTypedMemoryLoadPlan,
  renderGroupTypedMemoryRecall,
  runGroupTypedMemoryIndexSelfTest,
  shouldIgnoreGroupMemoryRequest,
  syncGroupTypedMemoryFromGroupMemory,
  upsertGroupTypedMemoryDocument } from "./group-memory-index";

import {
  buildWorkerTypedMemoryDeliveryLease,
  buildWorkerTypedMemoryDispatchTicket,
  buildWorkerTypedMemoryDeliveryExpectedBinding,
  validateWorkerTypedMemoryDeliveryCapsule,
  validateWorkerTypedMemoryDeliveryLease,
  validateWorkerTypedMemoryDispatchTicket } from "../../agents/runtime-kernel";

import {
  appendGroupMessage,
  getActiveGroupChatSessionId,
  getGroupChatSessionMessagesFile,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  registerGroupMessageAppendHook,
  saveGroupMessages } from "./storage";

import {
  buildGroupMemorySnipBoundaryMarker,
  buildGroupMemoryResumeProjection,
  commitGroupMemoryCompactBoundary,
  deleteGroupMemoryBoundaryArtifacts,
  getGroupMemoryBoundaryJournalFile,
  getGroupMemoryResumeProofFile,
  quarantineInvalidGroupMemoryBoundaryJournal,
  recordGroupMemoryResumeProjectionProof,
  retireGroupMemoryBoundaryJournal } from "./group-memory-boundary-journal";

import {
  runGroupSessionMemoryExtractionTransaction } from "./group-session-memory-extraction";

import {
  GLOBAL_AGENT_MEMORY_FILE,
  acquireGlobalAgentMemorySelfTestLock,
  recallGlobalAgentMemory,
  scanGlobalAgentMemorySelfTestContamination } from "../../agents/global/memory";

import { loadExecution } from "../../agents/execution-kernel";

import { DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA, pruneDirectAgentDispatchSpool, validateDirectAgentDispatchPair } from "../../agents/direct-dispatch-spool";

import {
  commitTaskAgentSessionCapacityRevalidation,
  recordTaskAgentMemoryContextDelivery,
  verifyMemoryContextDeliveryReceiptChecksum } from "../../tasks/agent-sessions";

import {
  createTypedMemoryDispatchWal,
  getTypedMemoryDispatchWalScopeDir,
  listTypedMemoryDispatchWal,
  pruneTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  transitionTypedMemoryDispatchWal,
  verifyTypedMemoryDispatchWal } from "./typed-memory-dispatch-wal";

import {
  backfillGroupPostTurnSummaries,
  buildGroupPostTurnSummaryDeliveryCapsule,
  extractGroupPostTurnSummaryDeliveryCapsule,
  getGroupPostTurnSummaryLedgerFile,
  readGroupPostTurnSummaries,
  recordGroupPostTurnSummary,
  validateGroupPostTurnSummaryDeliveryCapsule } from "./group-post-turn-summary";

import { deleteTaskAgentInvocationLineageArtifacts } from "../../tasks/task-agent-invocation-lineage";

import { deleteTaskAgentContinuationSoakArtifacts } from "../../tasks/task-agent-continuation-soak";

import {
  commitGroupCompactHead,
  deleteGroupCompactHead,
  readGroupCompactHead,
  reconcileGroupCompactHeadFromMemory } from "./group-compact-head";

import {
  buildProviderNativeCompactExecutionReceiptSummary,
  getProviderNativeCompactExecutionReceiptLedgerFile } from "./provider-native-compact-execution-receipt";

import {
  consumeProviderNativeCompactSessionCapacity,
  deleteProviderNativeCompactSessionCapacity,
  getProviderNativeCompactSessionGenerationFence,
  reconcileProviderNativeCompactSessionCapacityReset,
  resetProviderNativeCompactSessionCapacity } from "./provider-native-compact-session-capacity";

import {
  deleteGroupMemoryAutoCompactCircuitBreaker,
  readGroupMemoryAutoCompactCircuitBreaker,
  recordGroupMemoryAutoCompactCircuitBreakerOutcome } from "./group-memory-auto-compact-circuit-breaker";

import { deleteGroupReactiveCompactRetryOwnership } from "./group-reactive-compact-retry-ownership";

import {
  deleteGroupPromptCacheBreakDetection,
  notifyGroupPromptCacheCompaction,
  readGroupPromptCacheBreakDetection,
  verifyGroupPromptCacheCompactionNotification } from "./group-prompt-cache-break-detection";

import { deleteWorkerContextCompactSessionArtifactsForCoordinator } from "./group-orchestrator";

import { buildChildTypedMemoryDeliveryCapsule, buildChildTypedMemoryRecallLedgerScope, verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext } from "./group-agent-memory-packet";
import { buildGroupApiMicrocompactNativeApplyProofSummary, buildGroupCompactFileReferenceReadPlan, buildGroupCompactFileReferenceReadPlanRevalidationGate, buildGroupCompactFileReferences, buildGroupMemoryDispatchFreshnessGate, buildGroupMemorySourceManifest, buildGroupPostCompactCandidateUsageSummary, getGroupApiMicrocompactNativeApplyProofLedgerFile, getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile, getGroupPostCompactCandidateUsageLedgerFile, latestGroupCompactFileReferenceReadPlanRows, recordGroupCompactFileReferenceSurfacing, recordGroupMemoryReloadAudit, recordGroupPostCompactFirstDispatchMarker, summarizeGroupCompactFileReferenceAccess, summarizeGroupCompactFileReferenceReadPlanAccess, summarizeGroupCompactFileReferenceReadPlanFreshness } from "./group-compact-file-references";
import { buildChildGlobalAgentMemoryContext, distillGroupGlobalMemoryArbitrationToTypedMemory, getGroupGlobalMemoryArbitrationLedgerFile, recordGroupGlobalMemoryArbitrationLedger } from "./group-global-memory-arbitration";
import { GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, GROUP_MEMORY_AUTO_COMPACT_DEBOUNCE_MS, GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION, POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH, POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH, POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH, POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH, POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH, PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH, PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH, buildBackgroundCompactionState, buildCompressedGroupMessageDigest, buildGroupCompactBoundaryHistorySummary, buildGroupMemoryResumeEffectiveTokenBaseline, clearUntrustedGroupCompactionState, compactMemoryText, compactPreserveLines, createEmptyAgentMemory, formatAgentMemoryReceipt, getCompactBoundaryIndex, getGroupMessagesFileHint, groupMemoryAutoCompactPending, groupMemoryAutoCompactRunning, groupMemoryAutoCompactTimers, hasToolGrantSet, hashSessionMemoryText, importGroupProjectMemoriesForMembers, isGroupModelCompactionEnabled, isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery, isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery, isProviderRankingProvenanceCompactRepairReceiptRecallQuery, latestGroupMessageTimestamp, loadGroupMemoryCompactionConfig, normalizeAgentMemoryProject, normalizeGlobalGroupMemoryMembers, resolveGroupProjectMemoryRoot, scoreGlobalGroupMemoryCandidate, uniqueProviderRankingCompactRepairRecallStrings, validateGroupMemoryResumeEffectiveTokenBaseline } from "./group-memory-shared";
import { groupMemoryAutoCompactHookRegistered, markGroupMemoryAutoCompactHookRegistered } from "./group-memory-auto-compact-hook-state";

import { getGroupMemoryFile, getGroupPostCompactDispatchLedgerFile, getGroupReplayRepairLedgerFile, getGroupReplayRepairWorkItemsFile, getGroupSessionMemoryMarkdownFile, loadGroupMemory, persistGroupMemoryResumeEffectiveTokenBaseline, readGroupReplayRepairDispatchCandidatesSummary, readGroupReplayRepairLedgerSummary, readGroupReplayRepairWorkItemsSummary, saveGroupMemory } from "./group-memory-storage";
import { getGroupSessionMemorySnapshotFile, readGroupSessionMemorySnapshotSummary, refreshGroupConversationMemorySnapshot } from "./group-session-memory-snapshot";
import { getGroupToolContinuityMarkdownFile, getGroupToolContinuitySnapshotFile, readGroupToolContinuitySnapshotSummary } from "./group-tool-continuity";

import {
  isPostCompactReinjectionRepairReceiptRecallQuery } from "./group-memory-context-part-01";

export function buildPostCompactReinjectionRepairReceiptWorkerContextRecall(groupId: string, task = "", memory: any = {}, options: any = {}) {
  const disabled = options.disablePostCompactReinjectionRepairReceiptRecall === true
    || options.disable_post_compact_reinjection_repair_receipt_recall === true;
  const empty = {
    schema: "ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1",
    version: 1,
    active: false,
    disabled,
    reason: disabled ? "disabled" : "no_verified_archive",
    archivedCount: 0,
    restoredCount: 0,
    cautionCount: 0,
    usedCount: 0,
    verifiedCount: 0,
    ignoredCount: 0,
    completionArchivedCount: 0,
    completionVerifiedCount: 0,
    preservationClosureArchivedCount: 0,
    preservationClosureVerifiedCount: 0,
    preservationClosureFeedbackConflict: null,
    preservationClosureFeedbackConflictActive: false,
    taskMatched: false,
    recalledThisTurn: false,
    docRelPaths: [],
    repeatableRelPaths: [],
    targetPaths: [],
    gateIds: [],
    candidateIds: [],
    completionWorkItemIds: [],
    completionTimelineBindingIds: [],
    completionOriginalWorkerContextPacketIds: [],
    preservationRepairWorkItemIds: [],
    preservationFailedRetryIds: [],
    preservationFailedOutcomeIds: [],
    preservationCorrectedRetryIds: [],
    preservationCorrectedOutcomeIds: [],
    taskAgentSessionIds: [],
    nativeSessionIds: [],
    originalTaskAgentSessionIds: [],
    originalNativeSessionIds: [],
    repairTaskAgentSessionIds: [],
    repairNativeSessionIds: [],
    queryAppend: "",
    freshnessBoundary: "historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source",
    requiredReceiptFields: ["memoryUsed", "memoryIgnored"],
    rows: [] };
  if (disabled) return empty;
  let archive: any = {};
  let completionArchive: any = {};
  let preservationClosureArchive: any = {};
  let preservationClosureConflictResolutionArchive: any = {};
  let archiveReadError = "";
  try {
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    archive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
    completionArchive = ledger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
    preservationClosureArchive = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive || {};
    preservationClosureConflictResolutionArchive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
  } catch (error: any) {
    archive = {};
    completionArchive = {};
    preservationClosureArchive = {};
    preservationClosureConflictResolutionArchive = {};
    archiveReadError = compactMemoryText(error?.message || error || "typed memory distillation ledger read failed", 500);
  }
  const rows = Array.isArray(archive.rows) ? archive.rows : [];
  const completionRows = Array.isArray(completionArchive.rows) ? completionArchive.rows : [];
  const preservationClosureRows = Array.isArray(preservationClosureArchive.rows) ? preservationClosureArchive.rows : [];
  const preservationClosureConflictResolutionRows = Array.isArray(preservationClosureConflictResolutionArchive.rows) ? preservationClosureConflictResolutionArchive.rows : [];
  const repairArchivedCount = Number(archive.archived_count || rows.length || 0);
  const completionArchivedCount = Number(completionArchive.archived_count || completionRows.length || 0);
  const preservationClosureArchivedCount = Number(preservationClosureArchive.archived_count || preservationClosureRows.length || 0);
  const preservationClosureConflictResolutionArchivedCount = Number(preservationClosureConflictResolutionArchive.archived_count || preservationClosureConflictResolutionRows.length || 0);
  const archivedCount = repairArchivedCount + completionArchivedCount + preservationClosureArchivedCount + preservationClosureConflictResolutionArchivedCount;
  if (archivedCount <= 0) return archiveReadError ? { ...empty, reason: "archive_read_failed", archiveReadError } : empty;
  const recentRows = rows.slice(-12);
  const recentCompletionRows = completionRows.slice(-12);
  const recentPreservationClosureRows = preservationClosureRows.slice(-12);
  const taskText = [
    task,
    memory.goal,
    memory.currentPhase,
    memory.messageDigest,
    options.targetPaths,
    options.target_paths,
  ].map((item: any) => typeof item === "string" ? item : JSON.stringify(item || "")).join("\n");
  const preservationClosureUsageFeedback = buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, {
    targetProject: options.targetProject || options.target_project || "",
    task,
    ignoredThreshold: options.postCompactClosureIgnoredThreshold || options.post_compact_closure_ignored_threshold || 2,
    postCompactClosureUsageHalfLifeDays: options.postCompactClosureUsageHalfLifeDays || options.post_compact_closure_usage_half_life_days,
    postCompactClosureUsageStaleAfterDays: options.postCompactClosureUsageStaleAfterDays || options.post_compact_closure_usage_stale_after_days,
    taskFamilyRelevanceThreshold: options.postCompactClosureTaskFamilyRelevanceThreshold || options.post_compact_closure_task_family_relevance_threshold,
    now: options.now || options.generatedAt || options.generated_at });
  const preservationClosureFeedbackConflict = preservationClosureUsageFeedback.feedbackConflict || null;
  const preservationClosureConflictResolution = preservationClosureUsageFeedback.feedbackConflictResolution || null;
  const preservationClosureConflictResolutionEntryId = String(preservationClosureConflictResolution?.resolution_entry_id || "");
  const recalledPreservationClosureConflictResolutionRows = preservationClosureConflictResolutionEntryId
    ? preservationClosureConflictResolutionRows.filter((row: any) => row.resolution_entry_id === preservationClosureConflictResolutionEntryId).slice(-4)
    : [];
  const effectivePreservationClosureConflictResolutionArchivedCount = recalledPreservationClosureConflictResolutionRows.length;
  const exactPreservationClosureIdentityMatched = recentPreservationClosureRows.some((row: any) => [
    row.work_item_id,
    row.failed_retry_id,
    row.failed_outcome_id,
    row.corrected_retry_id,
    row.corrected_outcome_id,
  ].some((token: any) => {
    const normalized = String(token || "").trim().toLowerCase();
    return normalized.length >= 4 && taskText.toLowerCase().includes(normalized);
  }));
  const preservationClosureRecallSuppressed = [
    "deprioritize_closure_recall",
    "require_receipt_repair_before_reuse",
  ].includes(String(preservationClosureUsageFeedback.recommendation || "")) && !exactPreservationClosureIdentityMatched;
  const recalledPreservationClosureRows = preservationClosureRecallSuppressed ? [] : recentPreservationClosureRows;
  const effectivePreservationClosureArchivedCount = preservationClosureRecallSuppressed ? 0 : preservationClosureArchivedCount;
  const taskMatched = options.forcePostCompactReinjectionRepairReceiptRecall === true
    || options.force_post_compact_reinjection_repair_receipt_recall === true
    || options.forcePostCompactReceiptMemoryUsageRepairCompletionRecall === true
    || options.force_post_compact_receipt_memory_usage_repair_completion_recall === true
    || options.forcePostCompactCompletionMemoryPreservationRepairClosureRecall === true
    || options.force_post_compact_completion_memory_preservation_repair_closure_recall === true
    || isPostCompactReinjectionRepairReceiptRecallQuery(taskText, recentRows)
    || isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery(taskText, recentCompletionRows)
    || isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery(taskText, recalledPreservationClosureRows);
  const restoredCount = Number(archive.restored_count || rows.filter((row: any) => row.category !== "caution").length || 0);
  const cautionCount = Number(archive.caution_count || rows.filter((row: any) => row.category === "caution").length || 0);
  const docRelPaths = uniqueProviderRankingCompactRepairRecallStrings([
    restoredCount > 0 ? POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH : "",
    cautionCount > 0 ? POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH : "",
    completionArchivedCount > 0 ? POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH : "",
    effectivePreservationClosureArchivedCount > 0 ? POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH : "",
    effectivePreservationClosureConflictResolutionArchivedCount > 0 ? POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH : "",
  ], 5);
  if (repairArchivedCount + completionArchivedCount + effectivePreservationClosureArchivedCount + effectivePreservationClosureConflictResolutionArchivedCount <= 0) {
    return {
      ...empty,
      reason: preservationClosureRecallSuppressed ? "closure_recall_deprioritized_by_usage_feedback" : "no_recallable_verified_archive",
      archivedCount,
      preservationClosureArchivedCount,
      preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
      preservationClosureRecallSuppressed,
      exactPreservationClosureIdentityMatched,
      preservationClosureUsageFeedback,
      preservationClosureFeedbackConflict,
      preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
      preservationClosureConflictResolution,
      preservationClosureConflictResolutionArchivedCount,
      immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0 };
  }
  if (!taskMatched) {
    return {
      ...empty,
      reason: "verified_archive_available_but_task_not_matched",
      archivedCount,
      restoredCount,
      cautionCount,
      usedCount: Number(archive.used_count || 0),
      verifiedCount: Number(archive.verified_count || 0),
      ignoredCount: Number(archive.ignored_count || 0),
      completionArchivedCount,
      completionVerifiedCount: Number(completionArchive.verified_count || 0),
      preservationClosureArchivedCount,
      preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
      preservationClosureRecallSuppressed,
      exactPreservationClosureIdentityMatched,
      preservationClosureUsageFeedback,
      preservationClosureFeedbackConflict,
      preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
      preservationClosureConflictResolution,
      preservationClosureConflictResolutionArchivedCount,
      immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0,
      taskMatched: false,
      docRelPaths };
  }
  const gateIds = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.reinjection_gate_id), 16);
  const candidateIds = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.post_compact_candidate_id), 16);
  const candidateValues = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.post_compact_candidate_value), 16);
  const sourceMessageIds = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.post_compact_candidate_source_message_id), 16);
  const taskAgentSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.task_agent_session_id), 16);
  const nativeSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recentRows.map((row: any) => row.native_session_id), 16);
  const completionWorkItemIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.work_item_id), 16);
  const completionTimelineBindingIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.timeline_binding_id), 16);
  const completionOriginalWorkerContextPacketIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.original_worker_context_packet_id), 16);
  const preservationRepairWorkItemIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.map((row: any) => row.work_item_id), 16);
  const preservationFailedRetryIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.map((row: any) => row.failed_retry_id), 16);
  const preservationFailedOutcomeIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.map((row: any) => row.failed_outcome_id), 16);
  const preservationCorrectedRetryIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.map((row: any) => row.corrected_retry_id), 16);
  const preservationCorrectedOutcomeIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.map((row: any) => row.corrected_outcome_id), 16);
  const preservationCompletionDocRelPaths = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.flatMap((row: any) => row.completion_doc_rel_paths || []), 16);
  const preservationCompletionWorkItemIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.flatMap((row: any) => row.completion_work_item_ids || []), 24);
  const preservationCompletionTimelineBindingIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.flatMap((row: any) => row.completion_timeline_binding_ids || []), 24);
  const originalTaskAgentSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.original_task_agent_session_id), 16);
  const originalNativeSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.original_native_session_id), 16);
  const repairTaskAgentSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.repair_task_agent_session_id), 16);
  const repairNativeSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recentCompletionRows.map((row: any) => row.repair_native_session_id), 16);
  const preservationHistoricalTaskAgentSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.flatMap((row: any) => [
    ...(Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids : []),
    row.current_task_agent_session_id,
  ]), 24);
  const preservationHistoricalNativeSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureRows.flatMap((row: any) => [
    ...(Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids : []),
    row.current_native_session_id,
  ]), 24);
  const preservationConflictResolutionEntryIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureConflictResolutionRows.map((row: any) => row.resolution_entry_id), 16);
  const preservationConflictResolutionTaskAgentSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureConflictResolutionRows.map((row: any) => row.task_agent_session_id), 16);
  const preservationConflictResolutionNativeSessionIds = uniqueProviderRankingCompactRepairRecallStrings(recalledPreservationClosureConflictResolutionRows.map((row: any) => row.native_session_id), 16);
  const rowIds = uniqueProviderRankingCompactRepairRecallStrings([
    recentRows.map((row: any) => row.row_id),
    recentCompletionRows.map((row: any) => row.row_id),
    recalledPreservationClosureRows.map((row: any) => row.row_id),
    recalledPreservationClosureConflictResolutionRows.map((row: any) => row.row_id),
  ], 24);
  const queryAppend = [
    "post-compact reinjection repair receipt typed MEMORY.md",
    ...docRelPaths,
    "postCompactCandidateUsage memoryUsed memoryIgnored currentSourceVerified",
    "historical repair completion is recovery evidence, not permanent repository truth",
    "future use must reverify the current source",
    completionArchivedCount > 0 ? "corrected receipt completion memory per-session memoryUsed memoryIgnored" : "",
    preservationClosureArchivedCount > 0 ? "post-compact completion memory preservation repair closure newer corrected retry outcome exact identity current-session authority" : "",
    ...gateIds,
    ...candidateIds,
    ...candidateValues,
    ...sourceMessageIds,
    ...completionWorkItemIds,
    ...completionTimelineBindingIds,
    ...completionOriginalWorkerContextPacketIds,
    ...preservationRepairWorkItemIds,
    ...preservationFailedRetryIds,
    ...preservationFailedOutcomeIds,
    ...preservationCorrectedRetryIds,
    ...preservationCorrectedOutcomeIds,
    ...preservationCompletionWorkItemIds,
    ...preservationCompletionTimelineBindingIds,
    ...preservationConflictResolutionEntryIds,
    ...rowIds,
  ].filter(Boolean).join("\n");
  return {
    ...empty,
    active: true,
    reason: "task_matched_verified_archive",
    archivedCount,
    restoredCount,
    cautionCount,
    usedCount: Number(archive.used_count || 0),
    verifiedCount: Number(archive.verified_count || 0),
    ignoredCount: Number(archive.ignored_count || 0),
    completionArchivedCount,
    completionVerifiedCount: Number(completionArchive.verified_count || 0),
    preservationClosureArchivedCount,
    preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
    preservationClosureRecallSuppressed,
    exactPreservationClosureIdentityMatched,
    preservationClosureUsageFeedback,
    preservationClosureFeedbackConflict,
    preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
    preservationClosureConflictResolution,
    preservationClosureConflictResolutionArchivedCount,
    preservationClosureConflictResolutionEntryIds: preservationConflictResolutionEntryIds,
    immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0,
    currentSourceVerifiedCount: Number(archive.current_source_verified_count || 0),
    taskMatched: true,
    docRelPaths,
    repeatableRelPaths: docRelPaths,
    targetPaths: uniqueProviderRankingCompactRepairRecallStrings([
      ...docRelPaths,
      ...candidateValues,
    ], 24),
    gateIds,
    candidateIds,
    candidateValues,
    sourceMessageIds,
    completionWorkItemIds: uniqueProviderRankingCompactRepairRecallStrings([completionWorkItemIds, preservationRepairWorkItemIds, preservationCompletionWorkItemIds], 32),
    completionTimelineBindingIds: uniqueProviderRankingCompactRepairRecallStrings([completionTimelineBindingIds, preservationCompletionTimelineBindingIds], 32),
    completionOriginalWorkerContextPacketIds,
    completionDocRelPaths: uniqueProviderRankingCompactRepairRecallStrings([
      completionArchivedCount > 0 ? POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH : "",
      preservationClosureArchivedCount > 0 ? POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH : "",
      effectivePreservationClosureConflictResolutionArchivedCount > 0 ? POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH : "",
      preservationCompletionDocRelPaths,
    ], 24),
    preservationRepairWorkItemIds,
    preservationFailedRetryIds,
    preservationFailedOutcomeIds,
    preservationCorrectedRetryIds,
    preservationCorrectedOutcomeIds,
    taskAgentSessionIds: uniqueProviderRankingCompactRepairRecallStrings([taskAgentSessionIds, originalTaskAgentSessionIds, repairTaskAgentSessionIds, preservationHistoricalTaskAgentSessionIds, preservationConflictResolutionTaskAgentSessionIds], 32),
    nativeSessionIds: uniqueProviderRankingCompactRepairRecallStrings([nativeSessionIds, originalNativeSessionIds, repairNativeSessionIds, preservationHistoricalNativeSessionIds, preservationConflictResolutionNativeSessionIds], 32),
    originalTaskAgentSessionIds,
    originalNativeSessionIds,
    repairTaskAgentSessionIds,
    repairNativeSessionIds,
    preservationHistoricalTaskAgentSessionIds,
    preservationHistoricalNativeSessionIds,
    rowIds,
    queryAppend: compactMemoryText(queryAppend, 4200),
    rows: [
      ...recentRows.map((row: any) => ({
      row_kind: "reinjection_repair_receipt",
      row_id: row.row_id || "",
      timeline_binding_id: row.timeline_binding_id || "",
      brief_id: row.brief_id || "",
      work_item_id: row.work_item_id || "",
      reinjection_gate_id: row.reinjection_gate_id || "",
      post_compact_candidate_id: row.post_compact_candidate_id || "",
      post_compact_candidate_kind: row.post_compact_candidate_kind || "",
      post_compact_candidate_value: row.post_compact_candidate_value || "",
      post_compact_candidate_source_message_id: row.post_compact_candidate_source_message_id || "",
      usage_state: row.usage_state || "",
      current_source_verified: row.current_source_verified === true,
      historical_task_agent_session_id: row.task_agent_session_id || "",
      historical_native_session_id: row.native_session_id || "",
      completion_source: row.completion_source || "",
      resolution_reason: row.resolution_reason || "" })),
      ...recentCompletionRows.map((row: any) => ({
        row_kind: "receipt_memory_usage_repair_completion",
        row_id: row.row_id || "",
        timeline_binding_id: row.timeline_binding_id || "",
        brief_id: row.brief_id || "",
        work_item_id: row.work_item_id || "",
        original_worker_context_packet_id: row.original_worker_context_packet_id || "",
        required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
        coverage_rows: Array.isArray(row.coverage_rows) ? row.coverage_rows.slice(0, 8) : [],
        historical_task_agent_session_id: row.original_task_agent_session_id || "",
        historical_native_session_id: row.original_native_session_id || "",
        repair_task_agent_session_id: row.repair_task_agent_session_id || "",
        repair_native_session_id: row.repair_native_session_id || "",
        completion_source: row.completion_source || "",
        resolution_reason: row.resolution_reason || "" })),
      ...recalledPreservationClosureRows.map((row: any) => ({
        row_kind: "completion_memory_preservation_repair_closure",
        row_id: row.row_id || "",
        work_item_id: row.work_item_id || "",
        failed_retry_id: row.failed_retry_id || "",
        failed_outcome_id: row.failed_outcome_id || "",
        corrected_retry_id: row.corrected_retry_id || "",
        corrected_outcome_id: row.corrected_outcome_id || "",
        completion_doc_rel_paths: Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths.slice(0, 8) : [],
        required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
        completion_work_item_ids: Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids.slice(0, 12) : [],
        completion_timeline_binding_ids: Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids.slice(0, 12) : [],
        historical_task_agent_session_ids: Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids.slice(0, 12) : [],
        historical_native_session_ids: Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids.slice(0, 12) : [],
        historical_task_agent_session_id: row.current_task_agent_session_id || "",
        historical_native_session_id: row.current_native_session_id || "",
        exact_identity_restored: row.exact_identity_restored === true,
        current_session_boundary_restored: row.current_session_boundary_restored === true,
        historical_sessions_remain_evidence_only: row.historical_sessions_remain_evidence_only === true,
        completion_source: row.completion_source || "",
        resolution_reason: row.resolution_reason || "" })),
      ...recalledPreservationClosureConflictResolutionRows.map((row: any) => ({
        row_kind: "completion_memory_preservation_closure_conflict_resolution",
        row_id: row.row_id || "",
        resolution_entry_id: row.resolution_entry_id || "",
        task_family_key: row.task_family_key || "",
        resolution_usage_state: row.resolution_usage_state || "",
        current_source_verified: row.current_source_verified === true,
        reason: row.reason || "",
        historical_task_agent_session_id: row.task_agent_session_id || "",
        historical_native_session_id: row.native_session_id || "",
        parent_conflict_fingerprint: row.parent_conflict_fingerprint || "",
        reversible: row.reversible === true,
        historical_branches_preserved: row.historical_branches_preserved === true,
        historical_majority_authorization_allowed: false })),
    ].slice(-28) };
}
