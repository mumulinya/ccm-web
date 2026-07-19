// Behavior-freeze split from group-memory-context-part-04.ts (part 1/2).
// Behavior-freeze split from group-memory-context.ts (part 4/5).
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
import { isCanonicalGroupSessionMemory } from "./group-runtime-memory-admission";

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
  buildPressureMemoryProvenanceReceiptDiscipline,
  renderGroupPostCompactDynamicContextDelta,
  renderGroupPostCompactInvokedSkillAttachments,
  renderGroupPostCompactPlanAttachment } from "./group-memory-context-part-01";

export function renderGroupMemoryContextBundle(bundle: any) {
  if (!bundle) return "";
  if (typeof bundle === "string") return bundle;
  const agentMemory = bundle.target_agent_memory || {};
  const groupState = bundle.group_state || {};
  const postTurnSummaries = groupState.postTurnSummaries || groupState.post_turn_summaries || {};
  const postTurnSummaryDeliveryCapsule = bundle.post_turn_summary_delivery_capsule
    || bundle.postTurnSummaryDeliveryCapsule
    || extractGroupPostTurnSummaryDeliveryCapsule(postTurnSummaries)
    || null;
  const taskAgentInvocationLineage = bundle.task_agent_invocation_lineage || bundle.taskAgentInvocationLineage || null;
  const compaction = bundle.compaction || {};
  const resumeProjection = compaction.resumeProjection || compaction.resume_projection || {};
  const resumeContext = bundle.resume_context || bundle.resumeContext || {};
  const parentSessionDelivery = bundle.parent_session_delivery || bundle.parentSessionDelivery || {};
  const related = bundle.related_work || {};
  const typedMemory = groupState.typedMemory || {};
  const providerRankingCompactRepairReceiptRecall = typedMemory.providerRankingCompactRepairReceiptRecall
    || typedMemory.provider_ranking_compact_repair_receipt_recall
    || bundle.provider_ranking_compact_repair_receipt_recall
    || bundle.providerRankingCompactRepairReceiptRecall
    || {};
  const postCompactReinjectionRepairReceiptRecall = typedMemory.postCompactReinjectionRepairReceiptRecall
    || typedMemory.post_compact_reinjection_repair_receipt_recall
    || bundle.post_compact_reinjection_repair_receipt_recall
    || bundle.postCompactReinjectionRepairReceiptRecall
    || {};
  const globalAgentMemory = bundle.global_agent_memory || bundle.globalAgentMemory || {};
  const globalMemoryHealthGate = bundle.global_memory_health_gate || bundle.globalMemoryHealthGate || globalAgentMemory.memory_health_gate || globalAgentMemory.memoryHealthGate || {};
  const globalMemoryArbitrationLedger = bundle.global_memory_arbitration_ledger || bundle.globalMemoryArbitrationLedger || {};
  const sessionBinding = bundle.session_binding || bundle.sessionBinding || {};
  const sourceManifest = bundle.source_manifest || {};
  const reloadAudit = bundle.memory_reload_audit || {};
  const dispatchGate = bundle.dispatch_freshness_gate || {};
  const reinjectionGate = bundle.post_compact_reinjection_gate || {};
  const postCompactDispatchMarker = bundle.post_compact_dispatch_marker || bundle.postCompactDispatchMarker || {};
  const postCompactCandidateUsage = bundle.post_compact_candidate_usage || bundle.postCompactCandidateUsage || {};
  const replayRepairPlan = bundle.replay_repair_plan || bundle.replayRepairPlan || compaction.replayRepairPlan || compaction.replay_repair_plan || {};
  const replayRepairLedger = bundle.replay_repair_ledger || bundle.replayRepairLedger || compaction.replayRepairLedger || compaction.replay_repair_ledger || {};
  const replayRepairWorkItems = bundle.replay_repair_work_items || bundle.replayRepairWorkItems || compaction.replayRepairWorkItems || compaction.replay_repair_work_items || {};
  const replayRepairDispatchCandidates = bundle.replay_repair_dispatch_candidates || bundle.replayRepairDispatchCandidates || compaction.replayRepairDispatchCandidates || compaction.replay_repair_dispatch_candidates || {};
  const pressureProvenanceDispatchFeedbackPolicy = bundle.pressure_provenance_dispatch_feedback_policy
    || bundle.pressureProvenanceDispatchFeedbackPolicy
    || typedMemory.pressureProvenanceDispatchFeedbackPolicy
    || typedMemory.pressure_provenance_dispatch_feedback_policy
    || {};
  const sessionMemory = bundle.session_memory || bundle.sessionMemory || compaction.sessionMemory || compaction.session_memory || {};
  const toolContinuity = bundle.tool_continuity || bundle.toolContinuity || compaction.toolContinuity || compaction.tool_continuity || {};
  const compactStrategyDecision = compaction.compactStrategyDecision
    || compaction.compact_strategy_decision
    || compaction.boundary?.compactStrategyDecision
    || compaction.boundary?.post_compact_restore?.strategyDecision
    || {};
  const apiMicroCompactEditPlan = compaction.apiMicroCompactEditPlan
    || compaction.api_microcompact_edit_plan
    || compaction.boundary?.apiMicroCompactEditPlan
    || compaction.boundary?.post_compact_restore?.apiMicroCompactEditPlan
    || {};
  const apiMicrocompactNativeApplyPlan = compaction.apiMicrocompactNativeApplyPlan
    || compaction.api_microcompact_native_apply_plan
    || apiMicroCompactEditPlan.nativeApplyPlan
    || apiMicroCompactEditPlan.native_apply_plan
    || {};
  const apiMicrocompactNativeApplyProofLedger = compaction.apiMicrocompactNativeApplyProofLedger
    || compaction.api_microcompact_native_apply_proof_ledger
    || bundle.api_microcompact_native_apply_proof_ledger
    || bundle.apiMicrocompactNativeApplyProofLedger
    || {};
  const providerNativeCompactSessionCapacity = compaction.providerNativeCompactSessionCapacity
    || compaction.provider_native_compact_session_capacity
    || bundle.providerNativeCompactSessionCapacity
    || bundle.provider_native_compact_session_capacity
    || {};
  const providerNativeCompactSessionGenerationFence = compaction.providerNativeCompactSessionGenerationFence
    || compaction.provider_native_compact_session_generation_fence
    || bundle.providerNativeCompactSessionGenerationFence
    || bundle.provider_native_compact_session_generation_fence
    || {};
  const providerNativeCompactSessionCapacityReconciliation = compaction.providerNativeCompactSessionCapacityReconciliation
    || compaction.provider_native_compact_session_capacity_reconciliation
    || bundle.providerNativeCompactSessionCapacityReconciliation
    || bundle.provider_native_compact_session_capacity_reconciliation
    || {};
  const truePostCompactPayloadBudget = compaction.truePostCompactPayloadBudget
    || compaction.true_post_compact_payload_budget
    || bundle.truePostCompactPayloadBudget
    || bundle.true_post_compact_payload_budget
    || {};
  const postCompactPayloadGate = compaction.postCompactPayloadGate
    || compaction.post_compact_payload_gate
    || bundle.postCompactPayloadGate
    || bundle.post_compact_payload_gate
    || {};
  const postCompactMessageOrderReceipt = compaction.postCompactMessageOrderReceipt
    || compaction.post_compact_message_order_receipt
    || compaction.boundary?.postCompactMessageOrderReceipt
    || compaction.boundary?.post_compact_restore?.messageOrderReceipt
    || {};
  const postCompactMessageOrderVerification = postCompactMessageOrderReceipt.schema
    ? verifyGroupPostCompactMessageOrderReceipt(postCompactMessageOrderReceipt, {
      groupId: bundle.group_id,
      groupSessionId: bundle.group_session_id,
      boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "",
      summaryChecksum: compaction.summaryChecksum || "" })
    : null;
  const compactLineage = compaction.compactLineage
    || compaction.compact_lineage
    || compaction.boundary?.compactLineage
    || compaction.boundary?.compactMetadata?.compactLineage
    || compaction.boundary?.post_compact_restore?.compactLineage
    || {};
  const compactLineageVerification = compactLineage.schema
    ? verifyGroupCompactLineage(compactLineage, {
      groupId: bundle.group_id,
      groupSessionId: bundle.group_session_id,
      boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "" })
    : null;
  const compactionUsage = compaction.compactionUsage
    || compaction.compaction_usage
    || compaction.boundary?.compactionUsage
    || compaction.boundary?.compactMetadata?.compactionUsage
    || compaction.boundary?.post_compact_restore?.compactionUsage
    || {};
  const compactionUsageVerification = compactionUsage.schema
    ? verifyGroupCompactionModelUsageReceipt(compactionUsage, {
      groupId: bundle.group_id,
      groupSessionId: bundle.group_session_id })
    : null;
  const postCompactSessionStateReset = compaction.postCompactSessionStateReset
    || compaction.post_compact_session_state_reset
    || compaction.boundary?.postCompactSessionStateReset
    || compaction.boundary?.compactMetadata?.postCompactSessionStateReset
    || compaction.boundary?.post_compact_restore?.postCompactSessionStateReset
    || {};
  const postCompactSessionStateResetVerification = postCompactSessionStateReset.schema
    ? verifyGroupPostCompactSessionStateResetReceipt(postCompactSessionStateReset, {
      groupId: bundle.group_id,
      groupSessionId: bundle.group_session_id,
      boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "",
      summaryChecksum: compaction.summaryChecksum || "" })
    : null;
  const promptCacheCompactionNotification = compaction.promptCacheCompactionNotification
    || compaction.prompt_cache_compaction_notification
    || compaction.boundary?.promptCacheCompactionNotification
    || compaction.boundary?.post_compact_restore?.promptCacheCompactionNotification
    || {};
  const promptCacheCompactionNotificationVerification = promptCacheCompactionNotification.schema
    ? verifyGroupPromptCacheCompactionNotification(promptCacheCompactionNotification, {
      groupId: bundle.group_id,
      groupSessionId: bundle.group_session_id,
      boundaryId: compaction.boundary?.id || resumeProjection.boundary?.boundaryId || "",
      resetReceiptChecksum: postCompactSessionStateReset.receipt_checksum || "" })
    : null;
  const promptCacheBreakDetection = compaction.promptCacheBreakDetection
    || compaction.prompt_cache_break_detection
    || {};
  const compactFileReferences = bundle.compact_file_references || bundle.compactFileReferences || {};
  const compactFileReferenceReadPlan = bundle.compact_file_reference_read_plan || bundle.compactFileReferenceReadPlan || {};
  const compactFileReferenceReadPlanAccess = bundle.compact_file_reference_read_plan_access || bundle.compactFileReferenceReadPlanAccess || {};
  const compactFileReferenceReadPlanFreshness = bundle.compact_file_reference_read_plan_freshness || bundle.compactFileReferenceReadPlanFreshness || {};
  const compactFileReferenceReadPlanRevalidationGate = bundle.compact_file_reference_read_plan_revalidation_gate || bundle.compactFileReferenceReadPlanRevalidationGate || {};
  const compactFileReferenceAccess = bundle.compact_file_reference_access || bundle.compactFileReferenceAccess || {};
  const pressureMemoryProvenanceReceiptDiscipline = bundle.pressure_memory_provenance_receipt_discipline
    || bundle.pressureMemoryProvenanceReceiptDiscipline
    || typedMemory.pressureProvenanceReceiptDiscipline
    || typedMemory.pressure_provenance_receipt_discipline
    || buildPressureMemoryProvenanceReceiptDiscipline({ recall: typedMemory.recall || {} }, { targetProject: bundle.target_project || "" });
  const typedPressureRepairMatches = Array.isArray(pressureMemoryProvenanceReceiptDiscipline.rows)
    ? pressureMemoryProvenanceReceiptDiscipline.rows.slice(0, 4).map((row: any) => ({
      relPath: row.relPath || row.rel_path || "",
      status: row.repairStatus || row.repair_status || "pending",
      gapType: row.repairGapType || row.repair_gap_type || "gap",
      workItemId: row.repairWorkItemId || row.repair_work_item_id || "",
      provenanceStatus: row.provenanceStatus || row.provenance_status || "" }))
    : [];
  if (bundle.memory_policy?.ignored === true) {
    return [
      "子 Agent 受控记忆包（平台生成，本轮用户要求忽略记忆）：",
      `- 目标子 Agent：${bundle.target_project || "unknown"}`,
      `- 群聊会话：group_id=${bundle.group_id || "unknown"}；group_session_id=${bundle.group_session_id || "unknown"}；binding=${sessionBinding.binding_id || "unbound"}。`,
      "- 记忆使用：本轮按空 MEMORY.md / 空群聊记忆处理；不要引用、比较、应用或提及任何历史记忆内容。",
      "- 上下文边界：只使用本轮任务文本、用户本轮显式提供的内容、当前仓库实时检查结果和你本轮实际执行得到的证据。",
      dispatchGate.schema ? `- 记忆派发门禁：gate=${dispatchGate.dispatch_gate_id || ""}；status=${dispatchGate.status || "memory_ignored"}；action=${dispatchGate.action || "do_not_use_platform_memory"}；回执 memoryIgnored 必须声明该 gate 被用户忽略。` : "",
      bundle.task_query ? `- 你本次任务：${bundle.task_query}` : "",
      "- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；memoryIgnored 必须声明 user_requested_ignore_memory；memoryContextUsage 必须回传 bindingId/groupSessionId 并写 usageState=ignored；不能编造未执行的验证或文件修改。",
    ].filter(Boolean).join("\n");
  }
  const lines = [
    "子 Agent 受控记忆包（平台生成，优先级高于第三方 CLI 自带历史）：",
    `- 目标子 Agent：${bundle.target_project || "unknown"}`,
    `- 群聊会话：group_id=${bundle.group_id || "unknown"}；group_session_id=${bundle.group_session_id || "unknown"}；binding=${sessionBinding.binding_id || "unbound"}。`,
    `- 群聊目标：${groupState.goal || "未记录"}`,
    `- 当前阶段：${groupState.currentPhase || "idle"}`,
    "- 记忆边界：你每轮执行都可能是新的第三方 CLI 会话；必须把本包当作当前任务上下文，不要假定 Claude Code/Cursor/Codex 内部 session 记得旧群聊。",
    "- 上下文策略：旧消息已被 CCM 压缩为摘要；近期消息保留原文窗口；本包如附带“压缩前原文证据”，该证据优先于摘要。",
  ];
  const invokedSkillAttachmentText = String(bundle.invoked_skill_attachment_text || bundle.invokedSkillAttachmentText || renderGroupPostCompactInvokedSkillAttachments(compaction.postCompactReinject || {})).trim();
  const planAttachmentText = String(bundle.plan_attachment_text || bundle.planAttachmentText || renderGroupPostCompactPlanAttachment(compaction.postCompactReinject || {})).trim();
  const dynamicContextDeltaText = String(bundle.dynamic_context_delta_text || bundle.dynamicContextDeltaText || renderGroupPostCompactDynamicContextDelta(compaction.postCompactReinject || {})).trim();
  const deferredPostCompactHookLines: string[] = [];
  if (postCompactMessageOrderVerification) {
    lines.push(`- 压缩后消息顺序凭证：status=${postCompactMessageOrderVerification.valid ? "verified" : "fail_closed"}；order=${(postCompactMessageOrderReceipt.order || []).join(" -> ") || "missing"}；receipt=${postCompactMessageOrderReceipt.receipt_checksum || "missing"}。`);
    if (!postCompactMessageOrderVerification.valid) {
      lines.push(`- 压缩后消息顺序门禁：${postCompactMessageOrderVerification.issues.join(",") || "verification_failed"}；不得把附件或 Hook 结果视为已验证的压缩恢复上下文。`);
    }
  }
  if (compactLineageVerification) {
    lines.push(`- Compact lineage：status=${compactLineageVerification.valid ? "verified" : "fail_closed"}；trigger=${compactLineage.trigger || "unknown"}；epoch=${compactLineage.compact_epoch || "unknown"}；turn=${compactLineage.compact_turn_id || "unknown"}；previous=${compactLineage.previous_compact_turn_id || "none"}；turnsSincePrevious=${compactLineage.turns_since_previous_compact ?? -1}；recompact=${compactLineage.is_recompaction_in_chain === true}。`);
    if (!compactLineageVerification.valid) {
      lines.push(`- Compact lineage 门禁：${compactLineageVerification.issues.join(",") || "verification_failed"}；不得依据该 lineage 判断重压缩代际或容量信用。`);
    }
  }
  if (compactionUsageVerification) {
    lines.push(`- Compaction model usage：status=${compactionUsageVerification.valid ? compactionUsage.status || "verified" : "fail_closed"}；provider=${compactionUsage.provider || "unknown"}；model=${compactionUsage.model || "unknown"}；input=${compactionUsage.input_tokens || 0}；output=${compactionUsage.output_tokens || 0}；cacheRead=${compactionUsage.cache_read_input_tokens || 0}；cacheCreate=${compactionUsage.cache_creation_input_tokens || 0}；total=${compactionUsage.accounted_total_tokens || 0}；estimatedInput=${compactionUsage.estimated_input_tokens || 0}。`);
    if (!compactionUsageVerification.valid) {
      lines.push(`- Compaction usage 门禁：${compactionUsageVerification.issues.join(",") || "verification_failed"}；不得把该用量作为模型容量、成本或 provider 可靠性证据。`);
    }
  }
  if (postCompactSessionStateResetVerification) {
    const reset = postCompactSessionStateReset;
    lines.push(`- 压缩后会话状态重置：status=${postCompactSessionStateResetVerification.valid ? "verified" : "fail_closed"}；path=${reset.compact_path || "unknown"}；generation=${reset.post_compact_mark?.generation || 0}；durableCursor=${reset.durable_boundary_cursor?.message_id || "missing"}；providerCursor=${reset.provider_active_cursor?.status || "missing"}；cache=${reset.cache_read_baseline?.status || "missing"}；warning=${reset.compact_warning?.status || "missing"}；failures=${reset.auto_compact_failure_state?.consecutive_failures ?? "unknown"}。`);
    if (!postCompactSessionStateResetVerification.valid) {
      lines.push(`- 压缩后会话状态门禁：${postCompactSessionStateResetVerification.issues.join(",") || "verification_failed"}；不得沿用旧 provider cursor 或旧 cache baseline。`);
    }
  }
  if (promptCacheCompactionNotificationVerification) {
    lines.push(`- Prompt cache 压缩通知：status=${promptCacheCompactionNotificationVerification.valid ? "verified" : "fail_closed"}；generation=${promptCacheCompactionNotification.baseline_generation || 0}；baseline=${promptCacheCompactionNotification.baseline_status || "unknown"}；receipt=${promptCacheCompactionNotification.receipt_checksum || "missing"}。`);
  }
  if (promptCacheBreakDetection.schema) {
    const event = promptCacheBreakDetection.last_event || {};
    const deletion = promptCacheBreakDetection.pending_cache_deletion?.notification || {};
    lines.push(`- Prompt cache 运行时：status=${promptCacheBreakDetection.status || "unknown"}；calls=${promptCacheBreakDetection.call_count || 0}；breaks=${promptCacheBreakDetection.cache_break_count || 0}；promptStates=${promptCacheBreakDetection.prompt_state_call_count || 0}；generation=${promptCacheBreakDetection.baseline_generation || 0}；last=${event.classification || (promptCacheBreakDetection.pending_post_compaction ? "post_compaction_pending" : deletion.schema ? "cache_deletion_pending" : "none")}；reason=${event.cache_break_reason || "none"}；promptChanged=${event.prompt_changed === true}；promptCauses=${Array.isArray(event.prompt_change_causes) && event.prompt_change_causes.length ? event.prompt_change_causes.join(",") : "none"}；postCompact=${event.is_post_compaction === true}；microcompactDeletion=${deletion.schema ? "pending" : event.cache_deletion_applied === true ? "consumed" : "none"}；executionReceipt=${deletion.execution_receipt_id || event.microcompact_execution_receipt_id || "none"}。`);
  }
  const criticalPostCompactTaskStatuses = (Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates : [])
    .filter((candidate: any) => candidate.kind === "task_status")
    .slice(0, 12);
  if (criticalPostCompactTaskStatuses.length) {
    lines.push("- 压缩后子任务状态（避免重复派发；执行前按 task_id 核对当前状态）：");
    for (const candidate of criticalPostCompactTaskStatuses) {
      lines.push(`  - candidate_id=${candidate.candidate_id || ""}；${candidate.value || ""}`);
    }
  }
  const criticalPostCompactFiles = (Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates : [])
    .filter((candidate: any) => candidate.kind === "file")
    .slice(0, 5);
  if (criticalPostCompactFiles.length) {
    lines.push("- 压缩后文件恢复候选（已与 preserved tail 完整 Read 去重；使用前读取当前文件）：");
    for (const candidate of criticalPostCompactFiles) {
      lines.push(`  - candidate_id=${candidate.candidate_id || ""}；file=${candidate.value || ""}`);
    }
  }
  if (truePostCompactPayloadBudget.schema) {
    const components = truePostCompactPayloadBudget.components || {};
    lines.push(`- True post-compact payload：tokens=${truePostCompactPayloadBudget.true_post_compact_token_count || 0}/${truePostCompactPayloadBudget.trigger_tokens || 0}；summary=${components.summary || 0}；recent=${components.recent_window || 0}；reinjection=${components.reinjection || 0}；session/tool=${Number(components.session_memory_restore || 0) + Number(components.tool_continuity_restore || 0)}；nextTurnRetrigger=${truePostCompactPayloadBudget.will_retrigger_next_turn === true}。`);
  }
  if (postCompactPayloadGate.schema) {
    lines.push(`- 压缩后 payload 门禁：status=${postCompactPayloadGate.status || "unknown"}；action=${postCompactPayloadGate.action || "unknown"}；prePTL=${postCompactPayloadGate.pre_ptl_token_count || 0}；final=${postCompactPayloadGate.true_post_compact_token_count || 0}；ptl=${postCompactPayloadGate.ptl_applied === true}。`);
  }
  if (providerNativeCompactSessionCapacityReconciliation.schema) {
    lines.push(`- Provider compact generation 对账：status=${providerNativeCompactSessionCapacityReconciliation.status || "unknown"}；boundary=${providerNativeCompactSessionCapacityReconciliation.boundary_id || "none"}；compactHeadGeneration=${providerNativeCompactSessionCapacityReconciliation.compact_head_generation || 0}；capacityGeneration=${providerNativeCompactSessionCapacityReconciliation.generation || 0}；recovered=${providerNativeCompactSessionCapacityReconciliation.recovered === true}。`);
    if (["failed", "fail_closed"].includes(String(providerNativeCompactSessionCapacityReconciliation.status || ""))) {
      lines.push("- Provider compact 安全门禁：generation 对账未通过，本轮不得应用 provider-native context_management；只能按 advisory 执行并等待下一次有效对账。");
    }
  }
  if (providerNativeCompactSessionGenerationFence.schema) {
    lines.push(`- Provider compact generation fence：generation=${providerNativeCompactSessionGenerationFence.generation || 1}；lastReset=${providerNativeCompactSessionGenerationFence.last_reset_id || "none"}；旧 generation 的晚到 Provider outcome 不得恢复容量信用或 sticky beta。`);
  }
  if (postTurnSummaries.schema) {
    if (postTurnSummaries.valid !== true) {
      lines.push("- 最近逐轮摘要账本：完整性校验失败，本轮不得使用该账本；仅使用原始会话窗口、Session Memory 和当前源码证据。");
    } else {
      const turnRows = Array.isArray(postTurnSummaries.latest) ? postTurnSummaries.latest.slice(-6) : [];
      if (turnRows.length) {
        if (postTurnSummaryDeliveryCapsule?.capsule_checksum) {
          lines.push(`- 逐轮摘要交付凭证：capsule_checksum=${postTurnSummaryDeliveryCapsule.capsule_checksum}；task_agent_session_id=${postTurnSummaryDeliveryCapsule.task_agent_session_id || ""}；attempt=${postTurnSummaryDeliveryCapsule.attempt_sequence || 0}；invocation=${postTurnSummaryDeliveryCapsule.invocation_kind || ""}；invocation_edge=${postTurnSummaryDeliveryCapsule.invocation_edge_id || ""}；parent_edge=${postTurnSummaryDeliveryCapsule.parent_invocation_edge_id || ""}；branch=${postTurnSummaryDeliveryCapsule.branch_id || ""}/${postTurnSummaryDeliveryCapsule.branch_kind || ""}；lineage_head=${postTurnSummaryDeliveryCapsule.expected_lineage_head_checksum || ""}；compact_epoch=${postTurnSummaryDeliveryCapsule.compact_epoch || ""}；ledger_head=${postTurnSummaryDeliveryCapsule.ledger_head_checksum || ""}。`);
          lines.push("- 逐轮摘要回执：最终 CCM_AGENT_RECEIPT 必须引用上述 capsule_checksum；不得把该凭证用于其他群聊、gcs_* 会话或 tas_* 会话。");
        }
        lines.push("- 最近逐轮摘要（绑定原始 assistant message，不替代当前源码）：");
        for (const row of turnRows) {
          const details = [
            row.title ? compactMemoryText(row.title, 140) : "",
            row.recentAction ? `recent_action=${compactMemoryText(row.recentAction, 220)}` : "",
            row.needsAction ? `needs_action=${compactMemoryText(row.needsAction, 220)}` : "",
            Array.isArray(row.artifactUrls) && row.artifactUrls.length ? `artifacts=${row.artifactUrls.slice(0, 4).join(",")}` : "",
          ].filter(Boolean).join("；");
          lines.push(`  - [${row.statusCategory || "completed"}] ${row.agent || "group-main-agent"} / ${row.summarizesMessageId || "unknown"}：${details || "该轮无额外摘要"}`);
        }
      }
    }
  }
  if (taskAgentInvocationLineage?.invocation_edge_id) {
    lines.push(`- Task Agent invocation lineage：edge=${taskAgentInvocationLineage.invocation_edge_id}；parent=${taskAgentInvocationLineage.parent_invocation_edge_id || "root"}；root=${taskAgentInvocationLineage.root_invocation_edge_id || taskAgentInvocationLineage.invocation_edge_id}；branch=${taskAgentInvocationLineage.branch_id || ""}/${taskAgentInvocationLineage.branch_kind || "main"}；expected_head=${taskAgentInvocationLineage.expected_lineage_head_checksum || "root"}。`);
    lines.push("- 本轮回执与 runner request 只能提交到上述 invocation edge；不得跨 group、gcs_*、tas_* 或 branch 复用。 ");
  }
  if (resumeProjection.schema) {
    lines.push(`- durable resume projection：status=${resumeProjection.status || "unknown"}；verified=${resumeProjection.verified === true}；recovered=${resumeProjection.recovered === true}；raw=${resumeProjection.rawMessageCount || 0}；prefix_omitted=${resumeProjection.omittedMessageCount || 0}；snip_omitted=${resumeProjection.snipOmittedMessageCount || 0}；projected=${resumeProjection.projectedMessageCount || 0}；boundary=${resumeProjection.boundary?.boundaryId || "none"}；proof=${resumeProjection.proof?.proofId || "none"}。`);
    if (resumeProjection.snipReplay?.applied) {
      lines.push(`- durable snip replay：markers=${resumeProjection.snipReplay.markerCount || 0}；removed=${resumeProjection.snipReplay.removedMessageCount || 0}；relinked=${resumeProjection.snipReplay.relinkedMessageCount || 0}；tokens_freed~${resumeProjection.snipReplay.removedTokenEstimate || 0}；checksum=${resumeProjection.snipReplay.removalChecksum || "none"}；原始 transcript 未修改。`);
    }
    if (resumeProjection.roundTripConsistency?.schema) {
      lines.push(`- resume round-trip consistency：status=${resumeProjection.roundTripConsistency.status || "unknown"}；expected=${resumeProjection.roundTripConsistency.expectedActiveMessageCount || 0}；actual=${resumeProjection.roundTripConsistency.actualActiveMessageCount || 0}；delta=${resumeProjection.roundTripConsistency.delta || 0}；checksum=${resumeProjection.roundTripConsistency.checksum || "none"}。`);
    }
    if (resumeProjection.compactHeadRecovery?.schema) {
      lines.push(`- compact-head restart recovery：status=${resumeProjection.compactHeadRecovery.status || "unknown"}；recovered=${resumeProjection.compactHeadRecovery.recovered === true}；prior_generation=${resumeProjection.compactHeadRecovery.priorHeadGeneration || 0}；current_generation=${resumeProjection.compactHeadRecovery.head?.generation || 0}。`);
    }
    if (resumeProjection.status === "fail_closed_rebuild_required") {
      lines.push("- 恢复门禁：压缩边界未通过验证，本轮只能使用当前会话完整 raw transcript 重建结果；不得按可疑旧边界剪枝。 ");
    }
  }
  if (bundle.task_query) lines.push(`- 你本次任务：${bundle.task_query}`);
  if (typedPressureRepairMatches.length) {
    const primary = typedPressureRepairMatches[0];
    lines.push(`- pressure repair ${primary.gapType}:${primary.status}：typed MEMORY.md pressure provenance under repair；docs=${typedPressureRepairMatches.map((item: any) => item.relPath).filter(Boolean).join(",") || "unknown"}；work_item=${primary.workItemId || "unknown"}；provenance=${primary.provenanceStatus || "under_repair"}。`);
    lines.push("- pressure provenance pre-dispatch discipline：CCM_AGENT_RECEIPT.memoryProvenanceUsage 必须逐条声明 relPath、usageState、provenanceStatus、repairWorkItemId、repairStatus、repairGapType、currentSourceVerified；使用 disputed/stale-under-repair 记忆时必须先重读/核验当前源并声明 currentSourceVerified=true。");
    const examples = Array.isArray(pressureMemoryProvenanceReceiptDiscipline.exampleRows) ? pressureMemoryProvenanceReceiptDiscipline.exampleRows : [];
    if (examples.length) {
      lines.push(`- memoryProvenanceUsage 示例：${compactMemoryText(JSON.stringify(examples.slice(0, 2)), 900)}`);
    }
  }
  if (providerRankingCompactRepairReceiptRecall.active === true) {
    const relPaths = Array.isArray(providerRankingCompactRepairReceiptRecall.typedMemoryRelPaths || providerRankingCompactRepairReceiptRecall.typed_memory_rel_paths)
      ? (providerRankingCompactRepairReceiptRecall.typedMemoryRelPaths || providerRankingCompactRepairReceiptRecall.typed_memory_rel_paths).slice(0, 6)
      : [];
    const rowIds = Array.isArray(providerRankingCompactRepairReceiptRecall.typedMemoryRowIds || providerRankingCompactRepairReceiptRecall.typed_memory_row_ids)
      ? (providerRankingCompactRepairReceiptRecall.typedMemoryRowIds || providerRankingCompactRepairReceiptRecall.typed_memory_row_ids).slice(0, 6)
      : [];
    const receiptDisciplineRelPaths = uniqueProviderRankingCompactRepairRecallStrings([
      providerRankingCompactRepairReceiptRecall.memoryUsageReceiptDisciplineRelPaths,
      providerRankingCompactRepairReceiptRecall.memory_usage_receipt_discipline_rel_paths,
      providerRankingCompactRepairReceiptRecall.targetPaths,
      providerRankingCompactRepairReceiptRecall.target_paths,
    ], 12).filter((item: string) => item === PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH);
    lines.push(`- provider ranking compact repair receipt memory：doc=${providerRankingCompactRepairReceiptRecall.docRelPath || PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH}；archived=${providerRankingCompactRepairReceiptRecall.archivedCount || providerRankingCompactRepairReceiptRecall.archived_count || 0}；recalled=${providerRankingCompactRepairReceiptRecall.recalledThisTurn === true}；reason=${providerRankingCompactRepairReceiptRecall.reason || "verified_archive_available"}。`);
    lines.push("- provider switch boundary：provider switch execution history is ranking evidence only, not authorization；future explicit provider switches still require a fresh valid provider switch decision receipt/checksum/local authority/task compatibility.");
    if (receiptDisciplineRelPaths.length) {
      lines.push(`- provider ranking memory usage receipt discipline：docs=${receiptDisciplineRelPaths.join("、")}；最终 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 必须引用已浮现的 receipt discipline doc，声明 usageState，并继续写明 ranking evidence only, not authorization 与 fresh valid provider switch decision receipt 要求。`);
    }
    if (relPaths.length || rowIds.length) {
      lines.push(`  - compact-safe provenance anchors：relPaths=${relPaths.join("、") || "none"}；rowIds=${rowIds.join("、") || "none"}。`);
    }
  }
  if (postCompactReinjectionRepairReceiptRecall.active === true) {
    const docRelPaths = uniqueProviderRankingCompactRepairRecallStrings([
      postCompactReinjectionRepairReceiptRecall.surfacedRelPaths,
      postCompactReinjectionRepairReceiptRecall.docRelPaths,
      postCompactReinjectionRepairReceiptRecall.doc_rel_paths,
    ], 6);
    const gateIds = uniqueProviderRankingCompactRepairRecallStrings([
      postCompactReinjectionRepairReceiptRecall.gateIds,
      postCompactReinjectionRepairReceiptRecall.gate_ids,
    ], 6);
    const candidateIds = uniqueProviderRankingCompactRepairRecallStrings([
      postCompactReinjectionRepairReceiptRecall.candidateIds,
      postCompactReinjectionRepairReceiptRecall.candidate_ids,
    ], 6);
    const failedOutcomeIds = uniqueProviderRankingCompactRepairRecallStrings([
      postCompactReinjectionRepairReceiptRecall.preservationFailedOutcomeIds,
      postCompactReinjectionRepairReceiptRecall.preservation_failed_outcome_ids,
    ], 6);
    const correctedOutcomeIds = uniqueProviderRankingCompactRepairRecallStrings([
      postCompactReinjectionRepairReceiptRecall.preservationCorrectedOutcomeIds,
      postCompactReinjectionRepairReceiptRecall.preservation_corrected_outcome_ids,
    ], 6);
    lines.push(`- post-compact reinjection repair receipt memory：docs=${docRelPaths.join("、") || POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH}；archived=${postCompactReinjectionRepairReceiptRecall.archivedCount || postCompactReinjectionRepairReceiptRecall.archived_count || 0}；recalled=${postCompactReinjectionRepairReceiptRecall.recalledThisTurn === true}；reason=${postCompactReinjectionRepairReceiptRecall.reason || "task_matched_verified_archive"}。`);
    if (postCompactReinjectionRepairReceiptRecall.preservationClosureUsageFeedback?.schema) {
      const feedback = postCompactReinjectionRepairReceiptRecall.preservationClosureUsageFeedback;
      lines.push(`- closure memory usage feedback：recommendation=${feedback.recommendation || "neutral_reverify_current_source"}；used=${feedback.usedCount || 0}；verified=${feedback.verifiedCount || 0}；ignored=${feedback.ignoredCount || 0}；weightedIgnored=${feedback.weightedIgnoredCount || 0}；confidence=${feedback.evidenceConfidence || 0}/${feedback.evidenceConfidenceThreshold || 0}；independentSessions=${feedback.independentSessionCount || 0}；correlatedDuplicates=${feedback.correlatedDuplicateCount || 0}；providers=${feedback.distinctProviderCount || 0}；receiptSources=${feedback.distinctReceiptSourceCount || 0}；matchedTaskFamilyEntries=${feedback.matchedEntryCount || 0}；unrelatedEntries=${feedback.unrelatedEntryCount || 0}；halfLifeDays=${feedback.aging?.half_life_days || 0}；stale=${feedback.staleCount || 0}；immutableClosureHistoryPreserved=${feedback.immutableClosureHistoryPreserved === true}。`);
      if (feedback.feedbackConflict?.active === true) {
        const conflict = feedback.feedbackConflict;
        lines.push(`- closure feedback conflict：state=${conflict.arbitration_state || "contradictory_reverify_current_session"}；positiveWeight=${conflict.positive?.weighted_evidence || 0}；ignoredWeight=${conflict.ignored?.weighted_evidence || 0}；ratio=${conflict.conflict_ratio || 0}；historicalMajorityAuthorizationAllowed=false。本次新会话必须重新读取当前源码并独立判断 memoryUsed/memoryIgnored，不能按历史多数自动升权或降权。`);
      }
      if (feedback.feedbackConflictResolution?.active === true) {
        const resolution = feedback.feedbackConflictResolution;
        lines.push(`- closure conflict resolution：state=${resolution.state || "resolved"}；usageState=${resolution.resolution_usage_state || ""}；resolutionEntry=${resolution.resolution_entry_id || ""}；historicalSession=${resolution.task_agent_session_id || ""}/${resolution.native_session_id || ""}；reversible=${resolution.reversible === true}；historicalBranchesPreserved=${resolution.historical_branches_preserved === true}。该结果仅是同任务族排序证据，本次新会话仍须重新核验当前源码。`);
      }
    }
    lines.push("- freshness boundary：historical repair completion is recovery evidence, not permanent repository truth；future use must reverify the current source before accepting a recovered candidate.");
    lines.push("- receipt requirement：最终 CCM_AGENT_RECEIPT.memoryUsed 或 memoryIgnored 必须引用每个 surfaced receipt MEMORY.md；verified 必须同时提交 typedMemoryUsage.currentSourceEvidence（file_read、项目内 sourcePath、当前文件完整 SHA-256），只有平台复算匹配后才成立；无证明的 verified 会降为 used，ignored 必须写 reason。");
    if (gateIds.length || candidateIds.length) {
      lines.push(`  - historical repair identities：reinjection_gate_ids=${gateIds.join("、") || "none"}；candidate_ids=${candidateIds.join("、") || "none"}。`);
    }
    if (failedOutcomeIds.length || correctedOutcomeIds.length) {
      lines.push(`  - completion-memory preservation closure：failed_outcomes=${failedOutcomeIds.join("、") || "none"}；corrected_outcomes=${correctedOutcomeIds.join("、") || "none"}；该历史只用于恢复与去重，不能替代当前仓库核验。`);
    }
  }
  if (pressureProvenanceDispatchFeedbackPolicy?.active === true) {
    const rows = Array.isArray(pressureProvenanceDispatchFeedbackPolicy.policyRows) ? pressureProvenanceDispatchFeedbackPolicy.policyRows : [];
    const primary = rows[0] || {};
    const recoveryHint = Number(primary.recovery_credit || 0) > 0
      ? `；恢复抵扣=${primary.recovery_credit || 0}；有效违约=${primary.effective_violation_count ?? primary.violation_count ?? 0}`
      : "";
    const relapseHint = primary.relapsed ? `；恢复后复发=${primary.post_recovery_violation_count || 0}` : "";
    lines.push(`- pressure provenance dispatch feedback policy：agentType=${pressureProvenanceDispatchFeedbackPolicy.agentType || "unknown"}；project=${pressureProvenanceDispatchFeedbackPolicy.targetProject || bundle.target_project || "unknown"}；severity=${pressureProvenanceDispatchFeedbackPolicy.severity || "medium"}；历史违约=${primary.violation_count || 0}${recoveryHint}${relapseHint}；action=${pressureProvenanceDispatchFeedbackPolicy.action || "strengthen_pressure_memory_provenance_receipt_contract"}。`);
    lines.push("- 派发反馈要求：该执行器/项目历史上收到 pre-dispatch pressure provenance discipline 后仍遗漏过 memoryProvenanceUsage 或 currentSourceVerified；本轮 ACK 必须确认回执合同，最终 CCM_AGENT_RECEIPT 必须包含 memoryProvenanceUsage（无 pressure 记忆也要说明为空/未使用原因），主 Agent 关闭前必须复核。");
    if (Array.isArray(pressureProvenanceDispatchFeedbackPolicy.gapCodes) && pressureProvenanceDispatchFeedbackPolicy.gapCodes.length) {
      lines.push(`- 历史来源回执缺口：${pressureProvenanceDispatchFeedbackPolicy.gapCodes.slice(0, 6).join("、")}。`);
    }
  }
  if (sessionBinding.schema) {
    lines.push(`- 子 Agent 会话绑定：binding=${sessionBinding.binding_id || ""}；task=${sessionBinding.task_id || "unknown"}；session=${sessionBinding.task_agent_session_id || "unbound"}；native=${sessionBinding.native_session_id || "pending"}；turn=${sessionBinding.turn || 0}；executor=${sessionBinding.agent_type || "unknown"}；回执中的记忆使用声明应绑定本任务会话。`);
  }
  if (globalMemoryHealthGate.schema) {
    lines.push(`- Global Agent memory health gate：gate=${globalMemoryHealthGate.gate_id || ""}；status=${globalMemoryHealthGate.status || "unknown"}；active=${globalMemoryHealthGate.active_contamination_count || 0}；residue=${globalMemoryHealthGate.residue_contamination_count || 0}；action=${globalMemoryHealthGate.action || "unknown"}。`);
    if (globalMemoryHealthGate.status === "fail") {
      lines.push("- 全局记忆健康门阻断：active Global Agent memory 含自测污染或扫描失败；本轮不得使用 global_agent_memory 内容，只能使用当前群聊记忆、typed MEMORY.md、当前任务文本和实时仓库检查。回执 memoryIgnored 必须引用该 gate。");
    } else if (globalMemoryHealthGate.status === "warn") {
      lines.push("- 全局记忆健康门提示：active Global Agent memory 干净，但目录仍有历史自测残留；可使用 active 记忆，涉及文件/状态/授权时仍必须读取当前源并在 globalMemoryUsage 说明核验。");
    } else {
      lines.push("- 全局记忆健康门通过：active Global Agent memory 未发现自测污染；仍按历史上下文处理，当前源优先。");
    }
  }
  if (globalAgentMemory.schema && Number(globalAgentMemory.itemCount || 0) > 0) {
    const arbitration = globalAgentMemory.arbitration || {};
    const crossGroupSuppression = globalAgentMemory.crossGroupSuppression || {};
    lines.push(`- 全局 Agent 长期记忆召回：${globalAgentMemory.itemCount || 0} 条；source=${globalAgentMemory.file || "global-agent-memory"}；arbitration=${arbitration.status || "unknown"}；demoted=${arbitration.demotedCount || 0}；conflict=${arbitration.conflictCount || 0}；cross_group_suppressed=${arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0}；这些是跨群聊/跨会话约束或历史结论，只能作为当前任务上下文，涉及文件、任务状态、授权边界时必须读取当前真实状态复核。`);
    if (Number(arbitration.demotedCount || 0) > 0 || Number(arbitration.conflictCount || 0) > 0) {
      lines.push("- 全局记忆仲裁规则：如果下方 global_memory_id 标记为 demoted/conflict，必须以本群聊更新证据或 typed MEMORY.md 为准；该全局记忆只作背景线索，不能直接应用。");
    }
    lines.push("- 全局记忆回执规则：回复 CCM_AGENT_RECEIPT 时必须填写 globalMemoryUsage，逐条声明本轮看到的 global_memory_id 是 used / ignored / verified / background / advisory；带 semantic_risk、demoted/conflict 或 cross_group_suppression 的记忆若被使用，必须声明 currentSourceVerified=true 和 semanticRiskAcknowledged/crossGroupSuppression。");
    if (Number(arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0) > 0) {
      lines.push(`- 跨群聊全局记忆抑制：${arbitration.crossGroupSuppressedCount || crossGroupSuppression.suppressedCount || 0} 条全局记忆已在其他群聊仲裁账本中被降权/冲突；source=${crossGroupSuppression.sourceDir || "group-global-memory-arbitration"}；这些条目只能作为 background，必须按当前群聊证据、typed MEMORY.md 和实时仓库状态复核后再行动。`);
    }
    if (Number(crossGroupSuppression.advisoryCount || 0) > 0) {
      lines.push(`- 跨群聊抑制新鲜度：${crossGroupSuppression.advisoryCount || 0} 条跨群聊抑制已降级为 advisory；superseded=${crossGroupSuppression.supersededCount || 0}；decayed=${crossGroupSuppression.decayedCount || 0}；新 Global Agent 记忆或过旧 ledger 不应继续阻断当前上下文，但仍可作为排查线索。`);
    }
    if (globalAgentMemory.boundary?.archiveId) {
      const boundary = globalAgentMemory.boundary || {};
      const budget = boundary.context_budget || {};
      lines.push(`  - 全局记忆压缩边界：archive=${boundary.archiveId || ""}；recent=${boundary.preservedMessageCount || 0}；pressure=${budget.pressure ?? "unknown"}%。`);
    }
    for (const item of Array.isArray(globalAgentMemory.items) ? globalAgentMemory.items.slice(0, 5) : []) {
      const source = item.source || {};
      const itemArbitration = item.arbitration || {};
      const cross = item.crossGroupSuppression || itemArbitration.crossGroupSuppression || {};
      const messageIds = Array.isArray(source.messageIds) && source.messageIds.length ? `；messages=${source.messageIds.join(",")}` : "";
      const mission = source.missionId ? `；mission=${source.missionId}` : "";
      const semanticRisk = itemArbitration.semanticRisk || {};
      const semanticRiskText = Number(itemArbitration.semanticRiskScore || semanticRisk.score || 0) > 0
        ? ` semantic_risk=${itemArbitration.semanticRiskScore || semanticRisk.score};semantic=${semanticRisk.level || "unknown"};reasons=${(itemArbitration.semanticReasons || semanticRisk.reasons || []).slice(0, 4).join(",")}`
        : "";
      lines.push(`  - global_memory_id=${item.id || ""}；[${item.type || "memory"} score ${item.score ?? "?"} ${itemArbitration.status || "active"}${semanticRiskText}] ${item.text || ""}${item.howToApply ? `；apply=${item.howToApply}` : ""}；session=${source.sessionId || ""}${mission}${messageIds}`);
      if (cross.suppressed === true) {
        lines.push(`    - cross_group_suppression=background_only；groups=${cross.groupCount || 0}；conflict_groups=${cross.conflictGroupCount || 0}；occurrences=${cross.totalOccurrenceCount || 0}；action=${cross.action || "verify_current_group_before_use"}`);
      } else if (cross.advisory === true) {
        const freshness = cross.freshness || {};
        lines.push(`    - cross_group_suppression=advisory；reason=${cross.reason || ""}；superseded=${freshness.supersededByNewerGlobalMemory === true}；decayed=${freshness.decayedToAdvisory === true}；global_updated=${freshness.globalUpdatedAt || ""}；latest_cross_group_evidence=${freshness.latestEvidenceAt || ""}`);
      }
      for (const evidence of Array.isArray(itemArbitration.decisiveEvidence) ? itemArbitration.decisiveEvidence.slice(0, 2) : []) {
        const evidenceLabel = String(evidence.source || "").startsWith("cross_group") ? "cross_group_evidence" : "local_evidence";
        const evidenceSemantic = Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0) > 0
          ? `；semantic_risk=${evidence.semanticRiskScore || evidence.semanticRisk?.score}；semantic_reasons=${(evidence.semanticReasons || evidence.semanticRisk?.reasons || []).slice(0, 4).join(",")}`
          : "";
        lines.push(`    - ${evidenceLabel}=${evidence.source || "group"}${evidence.messageId ? `#${evidence.messageId}` : ""}；${evidence.conflict ? "conflict" : "newer"}${evidenceSemantic}；${evidence.text || ""}`);
      }
    }
  }
  if (globalMemoryArbitrationLedger.schema && Number(globalMemoryArbitrationLedger.entryCount || 0) > 0) {
    lines.push(`- 全局/群聊记忆仲裁账本：file=${globalMemoryArbitrationLedger.file || ""}；entries=${globalMemoryArbitrationLedger.entryCount || 0}；conflicts=${globalMemoryArbitrationLedger.conflictCount || 0}；repeated=${globalMemoryArbitrationLedger.repeatedConflictCount || 0}；若本轮任务涉及被降权全局记忆，应以本群聊证据和 typed MEMORY.md 为准，并可将重复冲突蒸馏为 typed memory。`);
  }
  if (typedMemory.arbitrationDistillation?.schema && typedMemory.arbitrationDistillation.skipped !== true) {
    const write = typedMemory.arbitrationDistillation.write || {};
    lines.push(`- 全局记忆仲裁蒸馏：candidate=${typedMemory.arbitrationDistillation.candidateCount || 0}；typed=${write.file || "typed-memory"}；changed=${write.changed === true}；重复全局冲突已沉淀为 typed MEMORY.md，后续子 Agent 应优先按该本群聊规则召回。`);
  }
  if (compaction.compactedMessageCount) {
    lines.push(`- 压缩边界：已压缩 ${compaction.compactedMessageCount} 条，保留近期 ${compaction.preservedRecentMessages || 0} 条；策略 ${compaction.strategy || "unknown"}；健康状态 ${compaction.health || "unknown"}。`);
    if (compaction.lastCompactedMessageId) lines.push(`- 最近压缩至 message id：${compaction.lastCompactedMessageId}${compaction.summaryChecksum ? `；摘要校验 ${compaction.summaryChecksum}` : ""}`);
  }
  if (compaction.boundary?.preservedSegment?.schema) {
    const segment = compaction.boundary.preservedSegment;
    lines.push(`- CC 风格保留窗口：preservedSegment 保留 ${segment.preservedMessageCount || 0} 条原文、约 ${segment.preservedTokenEstimate || 0} tokens、${segment.preservedTextBlockMessageCount || 0} 条文本消息；首尾 ${segment.firstPreservedMessageId || "unknown"} -> ${segment.lastPreservedMessageId || "unknown"}。`);
  }
  if (compaction.boundaryHistory?.schema) {
    const history = compaction.boundaryHistory;
    const latest = history.latest || {};
    lines.push(`- 历史压缩边界：保留 ${history.boundaryCount || 0} 个 compact boundaries；最新 ${latest.summaryChecksum || latest.summarizedThroughMessageId || latest.id || "unknown"}；历史边界用于 Memory Center 多边界 replay，必要时可按 raw messages 回溯旧摘要。`);
  }
  if (isCanonicalGroupSessionMemory(sessionMemory)) {
    lines.push(`- CC 风格 Session Memory：summary=${sessionMemory.summaryFile || "未记录"}；snapshot=${sessionMemory.snapshotFile || "未记录"}；checksum=${sessionMemory.markdownChecksum || "unknown"}；last=${sessionMemory.lastSummarizedMessageId || "recent-window"}；hasSummary=${sessionMemory.hasSummary !== false}。`);
    const cadence = sessionMemory.updateCadence || sessionMemory.update_cadence || {};
    if (cadence.schema) {
      lines.push(`- Session Memory 更新节奏：${cadence.status || "unknown"}；lastExtractionCursor=${cadence.lastExtractionCursorStatus || "legacy"}；advance=${cadence.cursorAdvanceStatus || "legacy"}；delta=${cadence.tokensSinceLastExtraction || 0} tokens；toolCalls=${cadence.toolCallsSinceLastExtraction || 0}；扫描消息=${cadence.toolCallScanMessageCount || 0}。游标缺失时不得把整段历史工具调用误算为新增量。`);
      if (cadence.cursorAdvanceStatus === "held_tool_use_boundary") lines.push(`- 本轮 Session Memory 已完成更新，但游标因最后一个 assistant turn 含工具调用而保持在 ${cadence.cursorAfter || cadence.cursorBefore || "session-start"}；项目子 Agent 继续接收完整工具调用边界。`);
    }
    if (sessionMemory.markdownExcerpt) {
      lines.push(`  - Session Memory 摘要片段：${compactMemoryText(sessionMemory.markdownExcerpt, 620)}`);
    }
    const activeFactProjection = sessionMemory.factSupersession || sessionMemory.fact_supersession || {};
    const activeReplacementFacts = (Array.isArray(activeFactProjection.activeFacts) ? activeFactProjection.activeFacts : [])
      .filter((fact: any) => fact.source === "explicit_replacement")
      .slice(0, 12);
    if (activeFactProjection.schema) {
      lines.push(`- Session Memory 事实替代图：graph=${activeFactProjection.graphChecksum || ""}；valid=${activeFactProjection.graphValid === true}；active=${activeFactProjection.activeFactCount || 0}；superseded=${activeFactProjection.supersededFactCount || 0}；unjustified_lost=${activeFactProjection.unjustifiedLostFactCount || 0}。子 Agent 只能使用 active facts，不得恢复已替代旧事实。`);
    }
    const modelReplayEvidence = sessionMemory.modelExtractionReplayEvidence || sessionMemory.model_extraction_replay_evidence || {};
    if (modelReplayEvidence.schema) {
      lines.push(`- Session Memory 模型提取交付证据：execution=${modelReplayEvidence.executionId || ""}；receipt=${modelReplayEvidence.receiptChecksum || ""}；history_head=${modelReplayEvidence.historyHeadChecksum || ""}；replay=${modelReplayEvidence.replayStatus || ""}；replay_execution=${modelReplayEvidence.replayExecutionId || ""}；valid=${modelReplayEvidence.checksumValid === true && modelReplayEvidence.historyIntegrityValid === true && modelReplayEvidence.replayPass === true}。memoryContextUsage 必须原样回传 execution、replay 和 fact graph checksum。`);
    }
    if (activeReplacementFacts.length) {
      lines.push(`  - 当前有效替代事实：${activeReplacementFacts.map((fact: any) => `${fact.factId}:${fact.factChecksum}:message=${fact.sourceMessageId}:${compactMemoryText(fact.text, 240)}`).join("；")}`);
    }
    lines.push(`- Session Memory 回执绑定：memoryContextUsage.bindingId=${sessionBinding.binding_id || ""}；groupSessionId=${bundle.group_session_id || ""}；sessionMemoryChecksum=${sessionMemory.markdownChecksum || ""}；modelExtractionExecutionId=${modelReplayEvidence.executionId || ""}；modelExtractionReplayStatus=${modelReplayEvidence.replayStatus || ""}；factSupersessionGraphChecksum=${activeFactProjection.graphChecksum || ""}；必须由子 Agent 原样回传并声明 used/verified/ignored。`);
    const sectionEvidence = sessionMemory.sectionEvidence || sessionMemory.section_evidence || {};
    const evidenceRows = Array.isArray(sectionEvidence.sections) ? sectionEvidence.sections.slice(0, 12) : [];
    if (evidenceRows.length) {
      lines.push(`- Session Memory 章节证据（used/verified 时 memoryFactCitations 必须引用）：${evidenceRows.map((item: any) => `${item.evidenceId || item.evidence_id}:${item.section || "section"}:${item.sectionChecksum || item.section_checksum}:${item.sourceTranscriptChecksum || item.source_transcript_checksum || sectionEvidence.sourceTranscriptChecksum || ""}:messages=${(item.sourceMessageIds || item.source_message_ids || sectionEvidence.sourceMessageIds || []).slice(0, 12).join(",")}`).join("；")}`);
    }
  } else {
    lines.push(`- Session Memory 尚未达到初始化阈值：memoryContextUsage.bindingId=${sessionBinding.binding_id || ""}；groupSessionId=${bundle.group_session_id || ""}；sessionMemoryChecksum 留空；仍需声明近期原文窗口是 used/verified/ignored。`);
  }
  if (toolContinuity.schema) {
    const allowed = toolContinuity.allowedTools || {};
    const requested = toolContinuity.requested || {};
    const synced = toolContinuity.synced || {};
    const missing = toolContinuity.missing || {};
    lines.push(`- CC 风格工具/技能连续性：summary=${toolContinuity.summaryFile || "未记录"}；snapshot=${toolContinuity.snapshotFile || "未记录"}；status=${toolContinuity.status || "empty"}；allowed MCP ${(allowed.mcp || []).length}/Skill ${(allowed.skill || []).length}；requested MCP ${(requested.mcp || []).length}/Skill ${(requested.skill || []).length}；synced MCP ${(synced.mcp || []).length}/Skill ${(synced.skill || []).length}；missing MCP ${(missing.mcp || []).length}/Skill ${(missing.skill || []).length}。`);
    lines.push("- 工具/技能连续性使用边界：这里只恢复上下文和上次运行证据，不扩大授权；真实工具派发仍必须通过当前 runtime tool gate、MCP sync 和 authorization readiness。");
    if ((allowed.mcp || []).length || (allowed.skill || []).length) {
      lines.push(`  - 连续性工具线索：MCP ${(allowed.mcp || []).slice(0, 8).join("、") || "无"}；Skill ${(allowed.skill || []).slice(0, 8).join("、") || "无"}。`);
    }
    if (Array.isArray(toolContinuity.invokedSkills) && toolContinuity.invokedSkills.length) {
      lines.push(`  - 历史已调用 Skill：${toolContinuity.invokedSkills.slice(0, 8).map((item: any) => `${item.name || "unknown"}${item.contentHash ? `#${item.contentHash}` : ""}`).join("、")}`);
    }
    if ((missing.mcp || []).length || (missing.skill || []).length) {
      lines.push(`  - 工具缺口：MCP ${(missing.mcp || []).slice(0, 8).join("、") || "无"}；Skill ${(missing.skill || []).slice(0, 8).join("、") || "无"}；本轮不能假定缺失工具可用。`);
    }
  }
  if (compaction.childAgentTypes?.schema) {
    const types = compaction.childAgentTypes;
    lines.push(`- 子 Agent 类型矩阵：${types.agentTypeCount || 0} 类 / ${types.targetCount || 0} 个目标；Memory Center 会按 Claude Code / Cursor / Codex 等类型分别 replay，确保每种第三方新会话都收到群聊记忆上下文。`);
    for (const row of Array.isArray(types.rows) ? types.rows.slice(0, 5) : []) {
      lines.push(`  - ${row.agentType || "unknown"}：${row.targetCount || 0} 个目标（${(row.targets || []).slice(0, 4).map((item: any) => item.targetProject).filter(Boolean).join("、") || "unknown"}）`);
    }
  }
  if (compaction.contextPressureWarning?.schema) {
    const warning = compaction.contextPressureWarning;
    const thresholds = warning.thresholds || {};
    lines.push(`- 上下文压力预警：${warning.level || "unknown"}；使用约 ${warning.tokenUsage || 0} tokens，距 auto-compact 约 ${warning.percentLeft ?? "unknown"}%；建议 ${warning.recommendation || "continue"}；阈值 warning=${thresholds.warningThreshold || 0}, auto=${thresholds.autoCompactThreshold || 0}, blocking=${thresholds.blockingThreshold || 0}${warning.suppressed ? "；压缩后预警暂时抑制" : ""}。`);
  }
  if (sourceManifest.schema) {
    lines.push(`- 记忆源 manifest：${sourceManifest.status || "unknown"}；源 ${sourceManifest.entryCount || 0} 个，typed docs ${sourceManifest.typedDocCount || 0} 个；最新源 ${sourceManifest.latestMtime || "unknown"}；manifest ${sourceManifest.manifestChecksum || ""}。`);
    if (Array.isArray(sourceManifest.missingRequired) && sourceManifest.missingRequired.length) {
      lines.push(`- 记忆源缺失：${sourceManifest.missingRequired.join("、")}；本轮必须按当前任务和实时检查补证据，不能假定缺失记忆存在。`);
    }
    if (Array.isArray(sourceManifest.changedAfterManifest) && sourceManifest.changedAfterManifest.length) {
      lines.push(`- 记忆源变化：${sourceManifest.changedAfterManifest.join("、")} 在 manifest 生成后变化；使用前需要重新读取对应源。`);
    }
  }
  if (compactFileReferences.schema && Array.isArray(compactFileReferences.references) && compactFileReferences.references.length) {
    lines.push(`- CC 风格 compact file references：${compactFileReferences.referenceCount || compactFileReferences.references.length} 个；missing=${compactFileReferences.missingCount || 0}；这些文件/目录在上次压缩或记忆构建前已作为上下文来源引用，但内容不会全部塞入本包。`);
    lines.push("- 文件引用使用规则：需要更多原文时，优先读取 raw_group_messages_json 或 typed MEMORY.md；读取前按当前任务判断相关性，读取后在回执 memoryUsed/memoryIgnored 中声明 reference_id 或路径。");
    for (const reference of compactFileReferences.references.slice(0, 10)) {
      lines.push(`  - reference_id=${reference.reference_id || ""}；${reference.type || "memory_source"}；${reference.displayPath || reference.path || ""}；exists=${reference.exists === true}；${reference.reason || ""}`);
    }
  }
  if (compactFileReferenceReadPlan.schema && Array.isArray(compactFileReferenceReadPlan.entries) && compactFileReferenceReadPlan.entries.length) {
    lines.push(`- compact file reference read plan：planned=${compactFileReferenceReadPlan.plannedCount || 0}/${compactFileReferenceReadPlan.sourceReferenceCount || 0}；sourceOfTruth=${compactFileReferenceReadPlan.hasSourceOfTruth === true}；summary=${compactFileReferenceReadPlan.hasCompactSummary === true}；mode=${compactFileReferenceReadPlan.policy?.mode || "read_on_demand"}。`);
    lines.push("- 读取计划规则：不要全量读取所有引用；只在当前任务需要更多原文、摘要冲突或需要核对 message id/typed MEMORY.md 时读取；读取或决定不读都要在 memoryUsed/memoryIgnored 引用 read_plan_id 或 reference_id。");
    for (const entry of compactFileReferenceReadPlan.entries.slice(0, 8)) {
      lines.push(`  - read_plan_id=${entry.read_plan_id || ""}；priority=${entry.priority || 0}；${entry.action || "read_if_needed"}；reference_id=${entry.reference_id || ""}；${entry.type || "memory_source"}；${entry.displayPath || entry.path || ""}；${entry.reason || ""}`);
    }
  }
  if (compactFileReferenceReadPlanAccess.schema) {
    lines.push(`- compact read plan access ledger：surfaced=${compactFileReferenceReadPlanAccess.ledger_entry_count || 0}；mentioned=${compactFileReferenceReadPlanAccess.mentioned_count || 0}/${compactFileReferenceReadPlanAccess.read_plan_entry_count || 0}；read_plan_id=${compactFileReferenceReadPlanAccess.read_plan_id_mentioned_count || 0}/${compactFileReferenceReadPlanAccess.read_plan_entry_count || 0}；ledger=${compactFileReferenceReadPlanAccess.ledger_file || "未记录"}。`);
  }
  if (compactFileReferenceReadPlanFreshness.schema) {
    lines.push(`- compact read plan source freshness：status=${compactFileReferenceReadPlanFreshness.status || "unknown"}；fresh=${compactFileReferenceReadPlanFreshness.freshCount || 0}/${compactFileReferenceReadPlanFreshness.checked || 0}；changed=${compactFileReferenceReadPlanFreshness.changedCount || 0}；unverifiable=${compactFileReferenceReadPlanFreshness.unverifiableCount || 0}。`);
    for (const row of Array.isArray(compactFileReferenceReadPlanFreshness.staleRows) ? compactFileReferenceReadPlanFreshness.staleRows.slice(0, 5) : []) {
      lines.push(`  - stale read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；changes=${(row.changes || []).join(",") || "unknown"}；${row.path || ""}；使用前必须重新读取当前源并在 memoryUsed/memoryIgnored 声明。`);
    }
  }
  if (compactFileReferenceReadPlanRevalidationGate.schema && (Number(compactFileReferenceReadPlanRevalidationGate.required_count || 0) > 0 || Number(compactFileReferenceReadPlanRevalidationGate.verification_count || 0) > 0)) {
    const gateSession = compactFileReferenceReadPlanRevalidationGate.session_binding || {};
    lines.push(`- compact read plan revalidation gate：gate=${compactFileReferenceReadPlanRevalidationGate.revalidation_gate_id || ""}；status=${compactFileReferenceReadPlanRevalidationGate.status || "unknown"}；required=${compactFileReferenceReadPlanRevalidationGate.required_count || 0}；verify=${compactFileReferenceReadPlanRevalidationGate.verification_count || 0}；session=${gateSession.task_agent_session_id || compactFileReferenceReadPlanRevalidationGate.task_agent_session_id || "unbound"}；action=${compactFileReferenceReadPlanRevalidationGate.action || "unknown"}。`);
    for (const row of Array.isArray(compactFileReferenceReadPlanRevalidationGate.required_entries) ? compactFileReferenceReadPlanRevalidationGate.required_entries.slice(0, 5) : []) {
      lines.push(`  - must re-read read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；changes=${(row.changes || []).join(",") || row.freshness_status || "changed"}；${row.displayPath || row.path || ""}；使用任何旧摘要/记忆前先读取当前源，回执 memoryUsed/memoryIgnored 必须同时写 gate、read_plan_id 和 current source verified/re-read。`);
    }
    for (const row of Array.isArray(compactFileReferenceReadPlanRevalidationGate.verification_entries) ? compactFileReferenceReadPlanRevalidationGate.verification_entries.slice(0, 3) : []) {
      lines.push(`  - verify read_plan_id=${row.read_plan_id || ""}；${row.type || "source"}；fingerprint missing；${row.displayPath || row.path || ""}；使用前先核验当前源或在 memoryIgnored 说明不使用。`);
    }
  }
  if (compactFileReferenceAccess.schema) {
    lines.push(`- compact file reference access ledger：surfaced=${compactFileReferenceAccess.ledger_entry_count || 0}；mentioned=${compactFileReferenceAccess.mentioned_count || 0}/${compactFileReferenceAccess.reference_count || 0}；ledger=${compactFileReferenceAccess.ledger_file || "未记录"}；该指标用于 Memory Center 检查子 Agent 是否真的声明使用了压缩后文件引用。`);
  }
  if (reloadAudit.schema) {
    lines.push(`- 记忆 reload 审计：reason=${reloadAudit.reason || "unknown"}；action=${reloadAudit.cacheAction || "unknown"}；sourceChanged=${reloadAudit.sourceManifestChanged === true}；loadPlanChanged=${reloadAudit.loadPlanChanged === true}；scope=${reloadAudit.scope || "default"}。`);
    if (reloadAudit.sourceChangeTrigger?.triggered) {
      lines.push(`- 记忆源变更触发 reload：changed=${reloadAudit.sourceChangeTrigger.changedCount || 0} added=${reloadAudit.sourceChangeTrigger.addedCount || 0} removed=${reloadAudit.sourceChangeTrigger.removedCount || 0}；ids=${(reloadAudit.sourceChangeTrigger.changedIds || []).slice(0, 6).join("、") || "unknown"}。`);
    }
  }
  if (dispatchGate.schema) {
    const gateSource = dispatchGate.source_manifest || {};
    const gateReload = dispatchGate.reload_audit || {};
    lines.push(`- 子 Agent 记忆派发新鲜度：gate=${dispatchGate.dispatch_gate_id || ""}；status=${dispatchGate.status || "unknown"}；action=${dispatchGate.action || "unknown"}；source=${gateSource.checksum || "unknown"}；reload=${gateReload.reason || "unknown"}；回执 memoryUsed/memoryIgnored 必须声明是否使用该 gate 的记忆包。`);
  }
  if (reinjectionGate.schema) {
    const audit = reinjectionGate.post_compact_recovery_audit || {};
    lines.push(`- 压缩后重注入门禁：gate=${reinjectionGate.reinjection_gate_id || ""}；status=${reinjectionGate.status || "required"}；候选 ${reinjectionGate.candidate_count || 0} 条；summary=${audit.summary_checksum || "unknown"}；回执 memoryUsed/memoryIgnored 必须引用该 gate，postCompactCandidateUsage 必须逐条声明每个候选 used / ignored / verified。`);
    for (const candidate of Array.isArray(reinjectionGate.candidates) ? reinjectionGate.candidates.slice(0, 8) : []) {
      lines.push(`  - candidate_id=${candidate.candidate_id || ""}；${candidate.kind || "candidate"}：${candidate.value || ""}${candidate.sourceMessageId ? `（#${candidate.sourceMessageId}）` : ""}`);
    }
  }
  if (postCompactDispatchMarker.schema) {
    lines.push(`- 压缩后派发标记：marker=${postCompactDispatchMarker.marker_id || ""}；boundary=${postCompactDispatchMarker.boundary_id || ""}；sequence=${postCompactDispatchMarker.dispatch_sequence || 0}；first=${postCompactDispatchMarker.first_dispatch_after_compact === true}；summary=${postCompactDispatchMarker.summary_checksum || "unknown"}；这是对齐 Claude Code pendingPostCompaction 的群聊子 Agent 派发遥测。`);
    if (postCompactDispatchMarker.first_dispatch_after_compact === true) {
      lines.push("- 压缩后首次派发要求：本轮子 Agent 应把上方群聊记忆包视为压缩恢复后的第一跳上下文，优先核对重注入候选、摘要边界和近期原文窗口。");
    }
  }
  if (postCompactCandidateUsage.schema && postCompactCandidateUsage.has_history) {
    const totals = postCompactCandidateUsage.totals || {};
    lines.push(`- 压缩重注入候选使用账本：候选 ${postCompactCandidateUsage.candidate_count || 0} 条；used=${totals.used || 0} ignored=${totals.ignored || 0} verified=${totals.verified || 0} mentioned=${totals.mentioned || 0}；ledger=${postCompactCandidateUsage.ledger_file || "未记录"}。`);
    for (const row of Array.isArray(postCompactCandidateUsage.useful_candidates) ? postCompactCandidateUsage.useful_candidates.slice(0, 4) : []) {
      lines.push(`  - 历史有效候选 candidate_id=${row.candidate_id || ""}；${row.kind || "candidate"}：${row.value || ""}；used=${row.used_count || 0} verified=${row.verified_count || 0} ignored=${row.ignored_count || 0}；建议=${row.recommendation || "neutral_verify_current_context"}。`);
    }
    for (const row of Array.isArray(postCompactCandidateUsage.ignored_candidates) ? postCompactCandidateUsage.ignored_candidates.slice(0, 3) : []) {
      lines.push(`  - 历史多次忽略候选 candidate_id=${row.candidate_id || ""}；${row.value || ""}；ignored=${row.ignored_count || 0} used=${row.used_count || 0} verified=${row.verified_count || 0}；本轮仍需按当前任务核验，不要盲目采用。`);
    }
    if (Array.isArray(postCompactCandidateUsage.missing_usage_candidates) && postCompactCandidateUsage.missing_usage_candidates.length) {
      lines.push(`  - 历史缺使用状态候选：${postCompactCandidateUsage.missing_usage_candidates.slice(0, 4).map((row: any) => row.candidate_id || row.value).filter(Boolean).join("、")}；本轮回执必须明确 used / ignored / verified。`);
    }
  }
  if (compaction.postCompactRecoveryAudit?.schema) {
    const audit = compaction.postCompactRecoveryAudit;
    const failed = Array.isArray(audit.failedChecks) ? audit.failedChecks : [];
    const candidates = audit.candidateCounts || {};
    const candidateCount = Number(candidates.files || 0) + Number(candidates.skills || 0) + Number(candidates.verification || 0) + Number(candidates.blockers || 0) + Number(candidates.taskStatuses || candidates.task_statuses || 0);
    lines.push(`- 压缩后恢复审计：${audit.status || "unknown"}；通过 ${audit.passedChecks || 0}/${audit.checkCount || 0}；重注入候选 ${candidateCount} 条；raw transcript ${audit.transcriptPath || "未记录"}；动作 ${audit.action || "unknown"}。`);
    if (failed.length) lines.push(`- 压缩后恢复风险：${failed.slice(0, 5).join("、")}；需要优先按 raw transcript / typed MEMORY.md 回溯后再执行。`);
  }
  if (compaction.postCompactCleanupAudit?.schema) {
    const cleanup = compaction.postCompactCleanupAudit;
    const failed = Array.isArray(cleanup.failedChecks) ? cleanup.failedChecks : [];
    lines.push(`- 压缩后清理审计：${cleanup.status || "unknown"}；通过 ${cleanup.passedChecks || 0}/${cleanup.checkCount || 0}；mode=${cleanup.mode || "unknown"}；动作 ${cleanup.action || "unknown"}。`);
    lines.push(`- 清理边界：派生 microcompact/context packet 状态必须重建；invoked skills/tool continuity 不清除；candidate/replay/hook ledger 保留；raw=${cleanup.transcriptPath || "未记录"}。`);
    if (failed.length) lines.push(`- 压缩后清理风险：${failed.slice(0, 5).join("、")}；本轮子 Agent 需要先按 source manifest / raw transcript / typed MEMORY.md 重建上下文。`);
  }
  if (apiMicroCompactEditPlan.schema) {
    const counts = apiMicroCompactEditPlan.signalCounts || {};
    lines.push(`- API microcompact edit plan：planChecksum=${apiMicroCompactEditPlan.planChecksum || ""}；edits=${apiMicroCompactEditPlan.editCount || 0}；advisory=${apiMicroCompactEditPlan.advisoryOnly !== false}；tokens=${apiMicroCompactEditPlan.activeTokens || 0}/${apiMicroCompactEditPlan.trigger?.value || apiMicroCompactEditPlan.maxInputTokens || 0}；thinking=${counts.thinkingBlocks || 0}；tool_use=${counts.toolUses || 0}；tool_result=${counts.toolResults || 0}。`);
    if (apiMicroCompactEditPlan.editCount > 0) {
      lines.push("- 支持 native API context management 的子 Agent 执行器可按该计划清理旧 thinking/tool result；不支持时只作为上下文压力提示，不得删除 CCM 群聊原文或 typed MEMORY.md。");
      lines.push("- API microcompact 回执规则：CCM_AGENT_RECEIPT.apiMicrocompactUsage 或 memoryUsed/memoryIgnored 必须引用 planChecksum，并声明 usageState=native_applied/advisory/ignored/not_supported；apiMicrocompactUsage 应绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；第三方 CLI 未实际调用 native API context-management 时不得写 native_applied。");
    }
  }
  if (apiMicrocompactNativeApplyPlan.schema) {
    const executor = apiMicrocompactNativeApplyPlan.executor || {};
    lines.push(`- API microcompact native apply：mode=${apiMicrocompactNativeApplyPlan.mode || "advisory_only"}；ready=${apiMicrocompactNativeApplyPlan.nativeApplyReady === true}；executor=${executor.agentType || "unknown"}/${executor.transport || "unknown"}；applyPlan=${apiMicrocompactNativeApplyPlan.applyPlanChecksum || ""}；session=${apiMicrocompactNativeApplyPlan.task_agent_session_id || "unbound"}。`);
    if (apiMicrocompactNativeApplyPlan.nativeApplyReady === true) {
      lines.push(`- Native request adapter 已就绪：把 requestPatch.body.context_management 合并到 provider API 请求，并携带 beta=${apiMicrocompactNativeApplyPlan.capability?.requiredBetaHeader || "context-management-2025-06-27"}；只有真实合并并发出请求后，回执才能声明 native_applied。`);
      lines.push("- Native apply 强证明规则：native_applied 还必须绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId，并在存在 runnerRequestId/externalRunnerRequestId 时能回查 execution.externalRunnerRequestIds；缺 session/snapshot/dispatch 绑定只能算弱证据。");
    } else {
      lines.push(`- Native apply 未就绪：${apiMicrocompactNativeApplyPlan.reason || "executor does not expose provider request body"}；本轮只能声明 advisory/ignored/not_supported，不能声称 native_applied。`);
    }
  }
  if (providerNativeCompactSessionCapacity.schema) {
    lines.push(`- Provider compact 会话容量：generation=${providerNativeCompactSessionCapacity.generation || 1}；taskSession=${providerNativeCompactSessionCapacity.task_agent_session_id || ""}；nativeSession=${providerNativeCompactSessionCapacity.native_session_id || ""}；basis=${providerNativeCompactSessionCapacity.token_basis || "unknown"}；raw=${providerNativeCompactSessionCapacity.raw_active_tokens || 0}；providerInput=${providerNativeCompactSessionCapacity.provider_response_input_tokens || 0}；latestCleared=${providerNativeCompactSessionCapacity.provider_cleared_input_tokens || 0}；effective=${providerNativeCompactSessionCapacity.effective_context_tokens || 0}；stickyBeta=${providerNativeCompactSessionCapacity.sticky_beta_latched === true}。`);
    lines.push("- 容量反馈边界：只采用该精确 Provider 子会话最新一次强回执，不跨群聊/子会话累加 cleared_input_tokens，也不修改 CCM 原始 transcript 或 typed MEMORY.md。");
  }
  if (apiMicrocompactNativeApplyProofLedger.schema && apiMicrocompactNativeApplyProofLedger.has_history) {
    const totals = apiMicrocompactNativeApplyProofLedger.totals || {};
    const telemetry = apiMicrocompactNativeApplyProofLedger.request_telemetry || {};
    const providerOutcomes = apiMicrocompactNativeApplyProofLedger.platform_execution_receipts?.totals || {};
    lines.push(`- API microcompact native apply proof ledger：status=${apiMicrocompactNativeApplyProofLedger.status || "unknown"}；verified=${totals.verified || 0} failed=${totals.failed || 0} advisory=${totals.advisory || 0} not_supported=${totals.not_supported || 0}；coverage=${apiMicrocompactNativeApplyProofLedger.proof_coverage_rate ?? "n/a"}%；telemetry strong=${telemetry.strong_verified_count || 0} matched=${telemetry.matched_verified_count || 0} adapter=${telemetry.adapter_matched_verified_count || 0} receipt=${telemetry.receipt_matched_verified_count || 0} receiptOnly=${telemetry.receipt_only_verified_count || 0} missing=${telemetry.missing_verified_count || 0} stale=${telemetry.stale_verified_count || 0} sessionBound=${telemetry.session_bound_verified_count || telemetry.session_bound_count || 0} dispatchBound=${telemetry.dispatch_bound_verified_count || telemetry.dispatch_bound_count || 0} runnerBound=${telemetry.runner_bound_verified_count || telemetry.runner_bound_count || 0}；ledger=${apiMicrocompactNativeApplyProofLedger.ledger_file || "未记录"}；requestTelemetry=${telemetry.ledger_file || "未记录"}。`);
    lines.push(`- Provider compact outcome：applied=${providerOutcomes.native_applied || 0} requestAcceptedOnly=${providerOutcomes.request_accepted || 0} noEdits=${providerOutcomes.no_edits_applied || 0} failed=${providerOutcomes.request_failed || 0} unverified=${providerOutcomes.unverified || 0}；只有 response.context_management.applied_edits 非空时才算 native_applied。`);
    for (const row of Array.isArray(apiMicrocompactNativeApplyProofLedger.verified_entries) ? apiMicrocompactNativeApplyProofLedger.verified_entries.slice(0, 3) : []) {
      lines.push(`  - verified native_applied plan=${row.plan_checksum || ""}；requestPatch=${row.request_patch_checksum || row.receipt_request_patch_checksum || ""}；session=${row.task_agent_session_id || "unbound"}；snapshot=${row.memory_context_snapshot_id || "unknown"}；requestTelemetry=${row.request_telemetry_status || "unknown"}；该证明只说明历史 provider request 已带 context_management，本轮仍需按当前执行器真实发送情况重新落账。`);
    }
    for (const row of Array.isArray(apiMicrocompactNativeApplyProofLedger.failed_entries) ? apiMicrocompactNativeApplyProofLedger.failed_entries.slice(0, 3) : []) {
      lines.push(`  - failed native_applied proof plan=${row.plan_checksum || ""}；requestPatch=${row.receipt_request_patch_checksum || row.request_patch_checksum || "missing"}；session=${row.receipt_task_agent_session_id || row.task_agent_session_id || "unbound"}；reason=${row.reason || "checksum/session/snapshot mismatch"}；不得把这类回执当作强 native apply 证明。`);
    }
  }
  if (compactStrategyDecision.schema) {
    const invariants = compactStrategyDecision.invariants || {};
    const failedInvariants = Object.entries(invariants)
      .filter(([, value]) => typeof value === "boolean" && value === false)
      .map(([key]) => key);
    lines.push(`- 压缩策略决策：mode=${compactStrategyDecision.mode || "unknown"}；summary=${compactStrategyDecision.summaryChecksum || "none"}；窗口 ${compactStrategyDecision.messagesToSummarize || 0} 条压缩 / ${compactStrategyDecision.keptMessages || 0} 条保留；token ${compactStrategyDecision.preCompactTokenCount || 0} -> ${compactStrategyDecision.postCompactTokenEstimate || 0}；原因 ${compactStrategyDecision.reason || "未记录"}。`);
    if (compactStrategyDecision.transcriptPath) lines.push(`- 压缩策略原文恢复：raw transcript=${compactStrategyDecision.transcriptPath}；如摘要与当前任务冲突，按 message id 回溯原文。`);
    if (failedInvariants.length) {
      lines.push(`- 压缩策略风险：${failedInvariants.slice(0, 5).join("、")} 未通过；执行前优先读取 raw transcript / 近期窗口核验。`);
    } else if (compactStrategyDecision.invariantPass === true) {
      lines.push("- 压缩策略 invariants：任务事务、工具结果对/思考块边界和保留窗口检查通过。");
    }
  }
  if (replayRepairPlan.schema && Number(replayRepairPlan.requiredActionCount || 0) > 0) {
    lines.push(`- Replay Gate 修复计划：status=${replayRepairPlan.status || "unknown"}；action=${replayRepairPlan.action || "unknown"}；待修复 ${replayRepairPlan.requiredActionCount || 0} 项；score=${replayRepairPlan.sourceReplay?.score ?? "unknown"}；下一轮执行前必须先补齐缺失记忆包字段并重新 replay。`);
    for (const action of Array.isArray(replayRepairPlan.actions) ? replayRepairPlan.actions.slice(0, 5) : []) {
      lines.push(`  - repair ${action.priority || "medium"}:${action.component || "replay"}；${action.title || "修复 replay 缺口"}；${action.instruction || ""}${action.expected ? `；expected=${action.expected}` : ""}`);
    }
  }
  if (replayRepairLedger.schema && Number(replayRepairLedger.attemptCount || 0) > 0) {
    lines.push(`- Replay Gate attempt ledger：attempts=${replayRepairLedger.attemptCount || 0}；openActions=${replayRepairLedger.openActionCount || 0}；latest=${replayRepairLedger.latestStatus || "unknown"}/${replayRepairLedger.latestScore ?? "unknown"}；ledger=${replayRepairLedger.file || "未记录"}。`);
    for (const attempt of Array.isArray(replayRepairLedger.recentAttempts) ? replayRepairLedger.recentAttempts.slice(0, 3) : []) {
      lines.push(`  - attempt ${attempt.status || "unknown"} score=${attempt.score ?? "unknown"} target=${attempt.target_project || "unknown"} actions=${attempt.required_action_count || 0} hash=${attempt.rendered_hash || attempt.attempt_id || ""}`);
    }
  }
  if (replayRepairWorkItems.schema && Number(replayRepairWorkItems.total || 0) > 0) {
    lines.push(`- Replay Repair pending work：open=${replayRepairWorkItems.openItemCount || 0}；pending=${replayRepairWorkItems.pendingCount || 0}；inProgress=${replayRepairWorkItems.inProgressCount || 0}；completed=${replayRepairWorkItems.completedCount || 0}；owner=group-main-agent；ledger=${replayRepairWorkItems.file || "未记录"}。`);
    for (const item of Array.isArray(replayRepairWorkItems.openItems) ? replayRepairWorkItems.openItems.slice(0, 5) : []) {
      const nativeProofBinding = [
        item.request_patch_checksum ? `request=${item.request_patch_checksum}` : "",
        item.request_telemetry_session_status ? `session=${item.request_telemetry_session_status}` : "",
        item.request_telemetry_dispatch_status ? `dispatch=${item.request_telemetry_dispatch_status}` : "",
        item.runner_request_id ? `runner=${item.runner_request_id}` : "",
      ].filter(Boolean).join("；");
      lines.push(`  - work ${item.priority || "medium"}:${item.component || "replay"}；${item.subject || "修复 replay 缺口"}；target=${item.repair_target || item.target_project || item.target || "memory-context"}${nativeProofBinding ? `；${nativeProofBinding}` : ""}；${item.instruction || ""}${item.expected ? `；expected=${item.expected}` : ""}`);
    }
  }
  if (replayRepairDispatchCandidates.schema && Number(replayRepairDispatchCandidates.candidateCount || 0) > 0) {
    lines.push(`- Main Agent replay repair dispatch candidates：候选 ${replayRepairDispatchCandidates.candidateCount || 0} 条；ready=${replayRepairDispatchCandidates.readyCount || 0}；dispatchMarked=${replayRepairDispatchCandidates.dispatchMarkedCount || 0}；shouldCreateRealTask=false；ledger=${replayRepairDispatchCandidates.file || "未记录"}。`);
    lines.push("  - 这些候选只说明主 Agent 可将 replay 修复整理成后续工作单；子 Agent 只有在本轮任务明确要求时才执行，不得自行创建额外任务。");
    for (const candidate of Array.isArray(replayRepairDispatchCandidates.candidates) ? replayRepairDispatchCandidates.candidates.slice(0, 5) : []) {
      const targetMatches = !candidate.targetProject || candidate.targetProject === bundle.target_project || candidate.dispatch_target === bundle.target_project;
      const nativeProofBinding = [
        candidate.proof_entry_id ? `proof=${candidate.proof_entry_id}` : "",
        candidate.request_patch_checksum ? `request=${candidate.request_patch_checksum}` : "",
        candidate.worker_context_packet_id ? `packet=${candidate.worker_context_packet_id}` : "",
        candidate.worker_context_packet_binding_id ? `packetBinding=${candidate.worker_context_packet_binding_id}` : "",
        candidate.worker_context_packet_memory_policy_reason ? `memoryPolicy=${candidate.worker_context_packet_memory_policy_reason}` : "",
        Array.isArray(candidate.pressure_memory_provenance_rel_paths) && candidate.pressure_memory_provenance_rel_paths.length ? `pressureDocs=${candidate.pressure_memory_provenance_rel_paths.slice(0, 4).join(",")}` : "",
        Array.isArray(candidate.pressure_memory_provenance_repair_work_item_ids) && candidate.pressure_memory_provenance_repair_work_item_ids.length ? `pressureRepair=${candidate.pressure_memory_provenance_repair_work_item_ids.slice(0, 4).join(",")}` : "",
        candidate.request_telemetry_source ? `source=${candidate.request_telemetry_source}` : "",
        candidate.request_telemetry_session_status ? `session=${candidate.request_telemetry_session_status}` : "",
        candidate.request_telemetry_dispatch_status ? `dispatch=${candidate.request_telemetry_dispatch_status}` : "",
        candidate.runner_request_id ? `runner=${candidate.runner_request_id}` : "",
      ].filter(Boolean).join("；");
      lines.push(`  - candidate=${candidate.candidate_id || ""}；${candidate.priority || "medium"}:${candidate.component || "replay"}；target=${candidate.dispatch_target || candidate.targetProject || candidate.repair_target || "memory-context"}${targetMatches ? "" : "（非本 Agent 目标，仅供主 Agent 协调参考）"}${nativeProofBinding ? `；${nativeProofBinding}` : ""}；action=${candidate.recommendedAction || "review"}；${candidate.instruction || candidate.expected || ""}`);
    }
  }
  if (compaction.hookLedger?.schema) {
    const hookLedger = compaction.hookLedger;
    const stats = hookLedger.stats || {};
    const pre = stats.pre || {};
    const post = stats.post || {};
    deferredPostCompactHookLines.push(`- 压缩 Hook Ledger：run=${hookLedger.hookRunId || "unknown"}；pre ${pre.ok || 0}/${pre.total || 0}；post ${post.ok || 0}/${post.total || 0}；failed=${stats.failed || 0}；ledger=${hookLedger.file || "未记录"}。`);
    for (const entry of Array.isArray(hookLedger.recentEntries) ? hookLedger.recentEntries.slice(-4) : []) {
      const summary = entry.result_summary || entry.resultSummary || {};
      const keys = Array.isArray(summary.keys) ? summary.keys.slice(0, 5).join(",") : "";
      const phase = entry.phase || "hook";
      const status = entry.ok === false || entry.status === "fail" ? "fail" : "ok";
      deferredPostCompactHookLines.push(`  - hook ${phase} ${status}；${entry.duration_ms || entry.durationMs || 0}ms${keys ? `；keys=${keys}` : ""}${entry.error ? `；error=${entry.error}` : ""}`);
    }
  }
  if (compaction.quality || compaction.qualityStatus || compaction.driftDetected || compaction.downgradedByQualityGate) {
    const rawScore = Number(compaction.qualityScore ?? compaction.quality?.score);
    const score = Number.isFinite(rawScore) ? `${rawScore}` : "未评分";
    const drift = compaction.driftDetected ? "发现漂移" : "未发现漂移";
    const downgrade = compaction.downgradedByQualityGate ? `；已降级：${compaction.qualityDowngradeReason || "quality_gate_failed"}` : "";
    lines.push(`- 记忆质量：${score}/${compaction.qualityStatus || "unknown"}；${drift}${downgrade}。`);
  }
  if (compaction.microCompact?.recordCount || compaction.microCompact?.compactedMessageCount) {
    lines.push(`- 局部压缩：micro-compact 记录 ${compaction.microCompact.recordCount || 0} 条，实际压缩 ${compaction.microCompact.compactedMessageCount || 0} 条，释放约 ${compaction.microCompact.tokensFreed || 0} tokens；原文仍在群聊消息 JSON，可按 message id 回溯。`);
    if (compaction.microCompact.timeBased?.triggered) {
      const timeBased = compaction.microCompact.timeBased;
      lines.push(`- 时间触发 micro-compact：距离最近 Agent 输出 ${timeBased.gapMinutes || 0} 分钟，超过阈值 ${timeBased.gapThresholdMinutes || 0} 分钟；清理旧输出 ${timeBased.clearedCount || 0} 条，保留最近 ${timeBased.keptCount || timeBased.keepRecent || 0} 条。`);
    }
  }
  if (compaction.partialCompact?.requested) {
    const state = compaction.partialCompact.enabled ? "已启用" : "已跳过";
    lines.push(`- 选择性压缩：partial compact ${state}；方向 ${compaction.partialCompact.direction || "unknown"}；边界 ${compaction.partialCompact.summarizedThroughMessageId || compaction.partialCompact.selectedMessageId || "未命中"}；后续原文仍保留。`);
  }
  if (Array.isArray(compaction.partialSegments) && compaction.partialSegments.length) {
    lines.push(`- 选择性压缩 sidecar：已记录 ${compaction.partialSegments.length} 个中段/后段摘要；这些摘要不推进主压缩边界，原文仍可按 message id 回溯。`);
    for (const segment of compaction.partialSegments.slice(-3)) {
      const range = segment.range || {};
      const quality = segment.quality?.score != null ? `；质量 ${segment.quality.score}/${segment.quality.status || "unknown"}` : "";
      lines.push(`  - ${segment.direction || "range"} #${range.fromMessageId || ""} -> #${range.throughMessageId || ""}，${range.messageCount || 0} 条${quality}${segment.summaryChecksum ? `；摘要校验 ${segment.summaryChecksum}` : ""}`);
    }
  }
  if (compaction.ptlEmergency?.engaged) {
    lines.push(`- PTL 紧急降级：${compaction.ptlEmergency.emergencyLevel || "unknown"}；原因 ${compaction.ptlEmergency.reason || "unknown"}；本轮使用更短摘要，原文仍可从 ${compaction.ptlEmergency.rawTranscriptPath || "群聊 transcript"} 和 message id 恢复。`);
  }
  if (compaction.ptlRecovery?.recovered) {
    lines.push(`- PTL 自动恢复：已恢复普通摘要预算；原因 ${compaction.ptlRecovery.reason || "unknown"}；恢复后摘要预算 ${compaction.ptlRecovery.restoredMessageDigestMaxChars || 14000} 字符，压力 ${compaction.ptlRecovery.contextBudgetPressure ?? "unknown"}%。`);
  }
  const reinject = compaction.postCompactReinject || {};
  const reinjectParts = [
    Array.isArray(reinject.files) && reinject.files.length ? `文件 ${reinject.files.length}` : "",
    Array.isArray(reinject.skills) && reinject.skills.length ? `技能 ${reinject.skills.length}` : "",
    Array.isArray(reinject.verification) && reinject.verification.length ? `验证 ${reinject.verification.length}` : "",
    Array.isArray(reinject.blockers) && reinject.blockers.length ? `阻塞 ${reinject.blockers.length}` : "",
    Array.isArray(reinject.taskStatuses) && reinject.taskStatuses.length ? `子任务状态 ${reinject.taskStatuses.length}` : "",
  ].filter(Boolean);
  if (reinjectParts.length) {
    lines.push(`- 压缩后重注入候选：${reinjectParts.join("、")}；这些是旧消息压缩后仍建议优先恢复到本轮任务上下文的线索。`);
  }
  if (typedMemory.globalClaudeMemoryImport?.schema) {
    const imported = typedMemory.globalClaudeMemoryImport;
    if (Number(imported.importedCount || 0) > 0 || (Array.isArray(imported.issues) && imported.issues.length)) {
      const includeAudit = imported.includeAudit || {};
      const externalApproval = includeAudit.externalIncludeApproval || {};
      const settingPolicy = imported.settingSourcePolicy || {};
      const includeText = includeAudit.schema
        ? `；include 导入 ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0} 个，跳过 ${includeAudit.skippedCount || 0} 个`
        : "";
      const sourceText = settingPolicy.schema
        ? `；setting sources=${(settingPolicy.enabled || []).join(",") || "none"}${settingPolicy.isolationMode ? "（isolation）" : ""}`
        : "";
      lines.push(`- 全局 Claude 记忆导入：${imported.status || "unknown"}；user=${imported.includeUser !== false} managed=${imported.includeManaged !== false}；发现 ${imported.discoveredCount || 0} 个，导入 ${imported.importedCount || 0} 个 typed docs${includeText}${sourceText}。`);
      if (externalApproval.shouldShowWarning || Number(externalApproval.pendingCount || 0) > 0) {
        lines.push(`- 全局 Claude 外部 include 审批：pending=${externalApproval.pendingCount || 0} approved=${externalApproval.approvedCount || 0}；ledger=${externalApproval.ledgerFile || "未记录"}。`);
      }
      if (imported.instructionsLoadedHooks?.schema) {
        lines.push(`- 全局 Claude InstructionsLoaded hooks：events=${imported.instructionsLoadedHooks.eventCount || 0} fired=${imported.instructionsLoadedHooks.firedCount || 0} failed=${imported.instructionsLoadedHooks.failureCount || 0}；ledger=${imported.instructionsLoadedHooks.ledgerFile || "未记录"}。`);
      }
      if (Array.isArray(imported.issues) && imported.issues.length) {
        lines.push(`- 全局 Claude 记忆导入警告：${imported.issues.slice(0, 4).map((issue: any) => issue.type || issue.error || "issue").join("、")}。`);
      }
    }
  }
  if (typedMemory.projectMemoryImport?.schema) {
    const imported = typedMemory.projectMemoryImport;
    const includeAudit = imported.includeAudit || {};
    const externalApproval = includeAudit.externalIncludeApproval || {};
    const settingPolicy = imported.settingSourcePolicy || {};
    const includeText = includeAudit.schema
      ? `；include 导入 ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0} 个，跳过 ${includeAudit.skippedCount || 0} 个`
      : "";
    const sourceText = settingPolicy.schema
      ? `；setting sources=${(settingPolicy.enabled || []).join(",") || "none"}${settingPolicy.isolationMode ? "（isolation）" : ""}`
      : "";
    lines.push(`- 项目记忆导入：${imported.status || "unknown"}；从 ${imported.projectRoot || "未配置项目根"} 发现 ${imported.discoveredCount || 0} 个 Claude/规则记忆文件，导入 ${imported.importedCount || 0} 个 typed docs${includeText}${sourceText}。`);
    if (externalApproval.shouldShowWarning || Number(externalApproval.pendingCount || 0) > 0) {
      lines.push(`- 项目 Claude 外部 include 审批：pending=${externalApproval.pendingCount || 0} approved=${externalApproval.approvedCount || 0}；ledger=${externalApproval.ledgerFile || "未记录"}。`);
    }
    if (imported.instructionsLoadedHooks?.schema) {
      lines.push(`- 项目 Claude InstructionsLoaded hooks：events=${imported.instructionsLoadedHooks.eventCount || 0} fired=${imported.instructionsLoadedHooks.firedCount || 0} failed=${imported.instructionsLoadedHooks.failureCount || 0}；ledger=${imported.instructionsLoadedHooks.ledgerFile || "未记录"}。`);
    }
    if (Array.isArray(imported.issues) && imported.issues.length) {
      lines.push(`- 项目记忆导入警告：${imported.issues.slice(0, 4).map((issue: any) => issue.type || issue.error || "issue").join("、")}。`);
    }
  }
  const typedLoadPlanText = renderGroupTypedMemoryLoadPlan(typedMemory.loadPlan);
  if (typedLoadPlanText) lines.push(typedLoadPlanText);
  if (typedMemory.sync?.indexFile) {
    lines.push(`- 类型化记忆索引：${typedMemory.sync.docs || 0} 条 Markdown 记忆，入口 ${typedMemory.sync.indexFile}。`);
  }
  if (typedMemory.ledger?.file) {
    const ledgerBoundary = typedMemory.ledger.scope
      ? `；scope=${typedMemory.ledger.scope}；sessionBound=${typedMemory.ledger.sessionBound === true}；compactEpoch=${typedMemory.ledger.compactEpoch || "precompact"}；只在同 task Agent session、同 compact epoch、同文档 checksum 内去重`
      : "";
    lines.push(`- 类型化记忆召回账本：本轮已记录 ${typedMemory.ledger.recordedThisTurn?.length || 0} 条 surfaced，历史去重候选 ${typedMemory.ledger.alreadySurfaced?.length || 0} 条${ledgerBoundary}。`);
  }
  if (typedMemory.distillation?.schema) {
    const admission = typedMemory.distillation.admission || {};
    lines.push(`- 长期日志蒸馏：原始候选 ${typedMemory.distillation.extractedCandidateCount ?? typedMemory.distillation.candidateCount ?? 0} 条，准入 ${typedMemory.distillation.candidateCount || 0} 条，拒绝 ${typedMemory.distillation.rejectedCandidateCount || 0} 条，清退旧噪声 ${typedMemory.distillation.evictedExistingFactCount || 0} 条；本轮新增 ${typedMemory.distillation.newFactCount || 0} 条，写入 ${typedMemory.distillation.writeCount || 0} 个 Markdown 记忆；ledger ${typedMemory.distillation.ledgerFile || "未记录"}。`);
    if (admission.schema) {
      lines.push(`- 长期记忆写入准入：${admission.admittedThisRun || 0}/${admission.evaluatedThisRun || 0} 通过；hard exclusion ${admission.hardExclusionThisRun || 0}；拒绝审计只保存 candidate/message/type/reason 元数据，不注入被拒绝正文。`);
      lines.push(`  - 正向确认：候选 ${admission.positiveConfirmationCandidateCount || 0}；准入 ${admission.positiveConfirmationAdmittedCount || 0}；拒绝 ${admission.positiveConfirmationRejectedCount || 0}；无效绑定 ${admission.positiveConfirmationInvalidBindingCount || 0}。只有绑定当前群聊会话内非显然 Assistant 做法并通过 checksum 的确认才可写入。`);
      lines.push(`  - 正向记忆生命周期：active ${admission.positiveFeedbackActiveCount || 0}；revoked ${admission.positiveFeedbackRevokedCount || 0}；superseded ${admission.positiveFeedbackSupersededCount || 0}；当前源证明 ${admission.positiveFeedbackCurrentSourceProofCount || 0}；本轮无效撤回 ${admission.positiveFeedbackLifecycleInvalidBindingThisRun || 0}。已撤回/替代做法不得恢复到子 Agent 上下文。`);
    }
    const quality = typedMemory.distillation.quality || {};
    if (quality.schema) {
      lines.push(`- 长期日志蒸馏质量：${quality.score ?? "未评分"}/${quality.status || "unknown"}；stale path ${quality.stalePathCount || 0}，状态矛盾 ${quality.contradictionCount || 0}；涉及文件/函数/flag 的记忆使用前必须核验当前仓库。`);
    }
  }
  const typedMemoryText = renderGroupTypedMemoryRecall(typedMemory.recall);
  if (typedMemoryText) lines.push(typedMemoryText);
  if (typedMemory.recall?.workerContextPressureScoring?.active && Number(typedMemory.recall?.workerContextPressureScoring?.boosted_count || 0) > 0) {
    lines.push("- 上下文压力召回回执：本轮如使用或忽略 pressure recall typed MEMORY.md，CCM_AGENT_RECEIPT.memoryUsed/memoryIgnored 必须引用对应 relPath 或说明未使用原因。");
  }
  if (groupState.summaryText && parentSessionDelivery.suppress_local_digest !== true) lines.push(`- 群聊压缩摘要：\n${compactPreserveLines(groupState.summaryText, 3200)}`);
  if (resumeContext.text && parentSessionDelivery.suppress_bounded_resume_context !== true) lines.push(`- 已验证的会话恢复原文窗口：\n${resumeContext.text}`);
  const addList = (title: string, items: any[], mapper: (item: any) => string, limit = 6) => {
    const list = (items || []).filter(Boolean).slice(-limit);
    if (!list.length) return;
    lines.push(`- ${title}：`);
    for (const item of list) lines.push(`  - ${mapper(item)}`);
  };
  addList("持久用户要求/验收约束", groupState.persistentRequirements || [], (item: any) => `#${item.messageId || ""} ${item.text || item}`, 6);
  addList("关键事实锚点", groupState.factAnchors || [], (item: any) => `#${item.messageId || ""} [${item.actor || item.type || ""}] ${item.text || item}`, 5);
  addList("关键决策", groupState.decisions || [], (item: any) => `${item.decision}${item.reason ? `（${item.reason}）` : ""}`, 6);
  addList("开放问题", groupState.openQuestions || [], (item: any) => String(item.question || item), 4);
  addList("下一步", groupState.nextActions || [], (item: any) => String(item.action || item), 4);
  if (agentMemory.stats?.totalReceipts) {
    lines.push(`- 子 Agent 记忆统计：总回执 ${agentMemory.stats.totalReceipts}，压缩 ${agentMemory.stats.compressedReceipts || 0}，近期保留 ${agentMemory.stats.recentReceipts || 0}。`);
  }
  if (agentMemory.summary) lines.push(`- 你的长期压缩摘要：${compactMemoryText(agentMemory.summary, 900)}`);
  addList("你的近期结构化回执", agentMemory.recentReceipts || [], (item: any) => formatAgentMemoryReceipt(item), 8);
  addList("你常涉及的文件", agentMemory.frequentFiles || [], (item: any) => String(item), 10);
  addList("你已有验证线索", agentMemory.verificationHints || [], (item: any) => String(item), 8);
  addList("你仍需处理的阻塞", [...(agentMemory.blockers || []), ...(agentMemory.needs || [])], (item: any) => String(item), 8);
  addList("你之前的完成记录", related.ownCompleted || [], (item: any) => `${item.summary || ""}${item.verification?.length ? `；验证：${item.verification.join("、")}` : ""}`, 4);
  addList("其他 Agent 已完成", related.otherCompleted || [], (item: any) => `${item.project || "unknown"}：${item.summary || ""}`, 4);
  addList("其他 Agent 近期回执", related.relatedLedger || [], (item: any) => `${item.project || "unknown"} [${item.status || "unknown"}]：${item.summary || ""}${item.blockers?.length ? `；阻塞：${item.blockers.join("、")}` : ""}`, 5);
  addList("与你相关的阻塞", related.ownBlocked || [], (item: any) => `${item.reason || ""}${item.needs?.length ? `；需要：${item.needs.join("、")}` : ""}`, 4);
  addList("全局阻塞", related.globalBlocked || [], (item: any) => `${item.project || "unknown"}：${item.reason || ""}`, 3);
  addList("应重注入的旧文件线索", reinject.files || [], (item: any) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 5);
  addList("应重注入的旧技能/工具线索", reinject.skills || [], (item: any) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 5);
  addList("应重注入的旧验证线索", reinject.verification || [], (item: any) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 6);
  addList("应重注入的旧阻塞线索", reinject.blockers || [], (item: any) => `${item.value || item}${item.sourceMessageId ? `（#${item.sourceMessageId}）` : ""}`, 6);
  addList("压缩后子任务状态", reinject.taskStatuses || reinject.task_statuses || [], (item: any) => item.value || `${item.task_id || item.taskId || "unknown"} [${item.status || "unknown"}] ${item.description || item.delta_summary || ""}`, 12);
  if (bundle.relevant_historical_evidence) lines.push(bundle.relevant_historical_evidence);
  if (!postCompactMessageOrderVerification || postCompactMessageOrderVerification.valid) {
    if (invokedSkillAttachmentText) lines.push(invokedSkillAttachmentText);
    if (planAttachmentText) lines.push(planAttachmentText);
    if (dynamicContextDeltaText) lines.push(dynamicContextDeltaText);
    lines.push(...deferredPostCompactHookLines);
  }
  if (bundle.task_query) lines.push(`- 你本次任务：${bundle.task_query}`);
  lines.push("- 回执要求：回复末尾必须包含 CCM_AGENT_RECEIPT；不能编造未执行的验证或文件修改；必须用 memoryUsed / memoryIgnored 声明本轮是否使用了本记忆包、项目记忆、历史结论、共享文档或知识库；如本轮 surfaced MEMORY.md，必须用 typedMemoryUsage 覆盖每个 relPath 并逐项声明 used / ignored / verified 和 reason，不能声明未下发路径；verified 必须附可复算的 currentSourceEvidence；如存在 global_memory_id，必须用 globalMemoryUsage 逐条声明 used / ignored / verified / background / advisory；如存在 API microcompact edit plan，必须用 apiMicrocompactUsage 或 memoryUsed/memoryIgnored 声明 planChecksum 和 native_applied/advisory/ignored/not_supported，并绑定本轮 taskAgentSessionId/nativeSessionId/memoryContextSnapshotId；如存在 compact read plan revalidation gate，必须声明 gate/read_plan_id 以及是否已 re-read/current source verified；如存在压缩重注入候选，必须用 postCompactCandidateUsage 逐条声明 used / ignored / verified。");
  return lines.join("\n");
}
