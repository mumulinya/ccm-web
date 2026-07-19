// Behavior-freeze split from group-memory-context.ts (part 5/5).
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
  buildGroupMemoryContext,
  prepareGroupMemoryResumeProjection } from "./group-memory-context-part-01";

export function buildGroupContextPacket(groupId: string, options: any = {}) {
  const groupSessionId = String(options.groupSessionId || options.group_session_id || getActiveGroupChatSessionId(groupId));
  const recentLimit = Math.max(4, Number(options.recentLimit || options.recent_limit || 12));
  const olderLimit = Math.max(6, Number(options.olderLimit || options.older_limit || 30));
  const fullCount = Math.max(3, Number(options.fullCount || options.full_count || 5));
  const allMessages = getGroupMessages(groupId, groupSessionId).filter((message: any) => !String(message?.content || "").startsWith("📤"));
  const resumePreparation = prepareGroupMemoryResumeProjection(groupId, groupSessionId, allMessages, loadGroupMemory(groupId, groupSessionId), {
    groupSessionId,
    recentLimit,
    olderLimit });
  const snapshotMemory = resumePreparation.memory;
  const resumeProjection = resumePreparation.projection || {};
  const rawRecentMessages = resumeProjection.useProjection === true
    ? (resumeProjection.projectedMessages || [])
    : allMessages.slice(-recentLimit);
  const timeBasedMicrocompactConfig = loadGroupMemoryCompactionConfig(options.compactionConfig || options.compaction_config || {});
  const timeBasedToolResultProjection = buildGroupTimeBasedToolResultProjection(rawRecentMessages, {
    groupId,
    groupSessionId,
    querySource: "group_main_thread:context_packet",
    enabled: options.timeBasedMicrocompactEnabled ?? options.time_based_microcompact_enabled ?? timeBasedMicrocompactConfig.timeBasedMicrocompactEnabled,
    gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
    keepRecent: options.timeBasedMicrocompactKeepRecent || options.time_based_microcompact_keep_recent || timeBasedMicrocompactConfig.timeBasedMicrocompactKeepRecent,
    now: options.now });
  const mainCompactEpoch = buildGroupCompactEpoch(String(
    snapshotMemory.compactBoundary?.boundaryId
      || snapshotMemory.compactBoundary?.boundary_id
      || snapshotMemory.compaction?.boundaryId
      || snapshotMemory.compaction?.boundary_id
      || ""
  ));
  const timeBasedThinkingProjection = buildGroupTimeBasedThinkingProjection(timeBasedToolResultProjection.messages, {
    groupId,
    groupSessionId,
    compactEpoch: mainCompactEpoch,
    querySource: "group_main_thread:context_packet",
    enabled: options.timeBasedThinkingClearEnabled ?? options.time_based_thinking_clear_enabled ?? timeBasedMicrocompactConfig.timeBasedThinkingClearEnabled,
    gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
    priorReceipt: snapshotMemory.compaction?.timeBasedThinkingProjection || snapshotMemory.messageCompression?.timeBasedThinkingProjection || null,
    isRedactThinkingActive: options.isRedactThinkingActive === true || options.is_redact_thinking_active === true,
    now: options.now });
  const recentMessages = timeBasedThinkingProjection.messages;
  const olderMessages = resumeProjection.useProjection === true
    ? allMessages.slice(0, Number(resumeProjection.omittedMessageCount || 0))
    : allMessages.slice(0, Math.max(0, allMessages.length - recentLimit));
  const fallbackDigest = buildCompressedGroupMessageDigest(olderMessages, olderLimit);
  const digest = snapshotMemory.messageDigest || fallbackDigest;
  const compression = {
    enabled: true,
    strategy: snapshotMemory.messageCompression?.strategy || "cc-session-memory-v3-sync",
    recentLimit,
    olderLimit,
    totalMessages: allMessages.length,
    compressedMessages: snapshotMemory.messageCompression?.compressedMessages ?? olderMessages.length,
    recentMessages: recentMessages.length,
    preCompactTokenCount: snapshotMemory.messageCompression?.preCompactTokenCount || 0,
    postCompactTokenCount: snapshotMemory.messageCompression?.postCompactTokenCount || 0,
    lastCompressedAt: new Date().toISOString() };
  const memory = saveGroupMemory(groupId, {
    ...snapshotMemory,
    messageDigest: digest,
    compaction: {
      ...(snapshotMemory.compaction || {}),
      ...(timeBasedToolResultProjection.applied ? { timeBasedToolResultProjection: timeBasedToolResultProjection.receipt } : {}),
      ...(timeBasedThinkingProjection.shouldPersist ? { timeBasedThinkingProjection: timeBasedThinkingProjection.receipt } : {}) },
    messageCompression: {
      ...compression,
      ...(timeBasedToolResultProjection.applied ? { timeBasedToolResultProjection: timeBasedToolResultProjection.receipt } : {}),
      ...(timeBasedThinkingProjection.shouldPersist ? { timeBasedThinkingProjection: timeBasedThinkingProjection.receipt } : {}) } }, groupSessionId, {
    sessionMemoryCadenceDecision: snapshotMemory.sessionMemory?.updateCadence || null });
  const sections = [buildGroupMemoryContext(memory)];
  if (resumeProjection.schema) {
    const resumeBaseline = resumePreparation.resumeBaseline || snapshotMemory.compaction?.resumeEffectiveTokenBaseline || null;
    sections.push([
      "会话恢复投影：",
      `- status=${resumeProjection.status || "unknown"}; verified=${resumeProjection.verified === true}; recovered=${resumePreparation.recovered === true}; raw=${allMessages.length}; prefix_omitted=${resumeProjection.omittedMessageCount || 0}; snip_omitted=${resumeProjection.snipOmittedMessageCount || 0}; projected=${resumeProjection.projectedMessageCount || recentMessages.length}`,
      `- boundary=${resumeProjection.boundary?.boundaryId || "none"}; journal=${resumeProjection.journal?.file || "none"}; proof=${resumePreparation.proof?.proofId || "none"}`,
      resumeProjection.roundTripConsistency?.schema
        ? `- round_trip status=${resumeProjection.roundTripConsistency.status || "unknown"}; expected=${resumeProjection.roundTripConsistency.expectedActiveMessageCount || 0}; actual=${resumeProjection.roundTripConsistency.actualActiveMessageCount || 0}; delta=${resumeProjection.roundTripConsistency.delta || 0}; checksum=${resumeProjection.roundTripConsistency.checksum || "none"}`
        : "",
      resumePreparation.compactHeadRecovery?.schema
        ? `- compact_head_recovery status=${resumePreparation.compactHeadRecovery.status || "unknown"}; recovered=${resumePreparation.compactHeadRecovery.recovered === true}; prior_generation=${resumePreparation.compactHeadRecovery.priorHeadGeneration || 0}; current_generation=${resumePreparation.compactHeadRecovery.head?.generation || 0}`
        : "",
      resumeBaseline?.schema
        ? `- tokens raw=${resumeBaseline.rawTranscriptTokens || 0}; prefix_omitted=${resumeBaseline.omittedRawTokens || 0}; snip_removed=${resumeBaseline.snipRemovedMessageCount || 0}/${resumeBaseline.snipRemovedTokenEstimate || 0}; summary=${resumeBaseline.summaryTokens || 0}; projected=${resumeBaseline.projectedMessageTokens || 0}; effective=${resumeBaseline.effectiveContextTokens || 0}; stale_usage_excluded=${resumeBaseline.staleProviderUsageTokensExcluded || 0}; baseline=${resumeBaseline.baselineId || "none"}`
        : "",
    ].join("\n"));
  }
  if (digest) {
    sections.push([
      "群聊旧消息压缩摘要（旧消息不直接塞满上下文；需要回溯时按 message id 查原始记录）：",
      digest,
    ].join("\n"));
  }
  if (recentMessages.length) {
    sections.push([
      `群聊近期原文窗口（最近 ${recentMessages.length}/${allMessages.length} 条，最后 ${Math.min(fullCount, recentMessages.length)} 条保留全文）：`,
      buildBoundedRecentGroupContext(recentMessages, fullCount),
    ].join("\n"));
  }
  if (timeBasedToolResultProjection.receipt.enabled) {
    const receipt = timeBasedToolResultProjection.receipt;
    sections.push(`时间触发 microcompact：status=${receipt.status}; gap=${receipt.gap_minutes}/${receipt.gap_threshold_minutes}min; tool_results cleared=${receipt.cleared_tool_result_count}, kept=${receipt.kept_tool_count}; tokens_saved=${receipt.tokens_saved}; raw_transcript_preserved=true。`);
  }
  if (timeBasedThinkingProjection.receipt.enabled) {
    const receipt = timeBasedThinkingProjection.receipt;
    sections.push(`时间触发 thinking clear：status=${receipt.status}; latched=${receipt.latched === true}; compact_epoch=${receipt.compact_epoch}; thinking_turns cleared=${receipt.cleared_thinking_turn_count}, kept=${receipt.kept_thinking_turn_count}; tokens_saved=${receipt.tokens_saved}; raw_transcript_preserved=true。`);
  }
  const rendered = sections.filter(Boolean).join("\n\n");
  const postCompactPayloadGate = memory.compaction?.postCompactPayloadGate
    || memory.messageCompression?.postCompactPayloadGate
    || memory.compactBoundary?.postCompactPayloadGate
    || memory.compactBoundary?.post_compact_restore?.postCompactPayloadGate
    || null;
  if (postCompactPayloadGate?.status !== "recompact_required") return rendered;
  return compactPreserveLines(rendered, Math.max(4000, Number(postCompactPayloadGate.safe_render_chars || 6000)));
}
