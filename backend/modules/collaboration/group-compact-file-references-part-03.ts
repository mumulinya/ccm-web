// Behavior-freeze split from group-compact-file-references.ts (part 3/3).
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
  renderConversationSummary,
} from "./group-memory-compaction";

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
  upsertGroupTypedMemoryDocument,
} from "./group-memory-index";

import {
  buildWorkerTypedMemoryDeliveryLease,
  buildWorkerTypedMemoryDispatchTicket,
  buildWorkerTypedMemoryDeliveryExpectedBinding,
  validateWorkerTypedMemoryDeliveryCapsule,
  validateWorkerTypedMemoryDeliveryLease,
  validateWorkerTypedMemoryDispatchTicket,
} from "../../agents/runtime-kernel";

import {
  appendGroupMessage,
  getActiveGroupChatSessionId,
  getGroupChatSessionMessagesFile,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  registerGroupMessageAppendHook,
  saveGroupMessages,
} from "./storage";

import {
  buildGroupMemorySnipBoundaryMarker,
  buildGroupMemoryResumeProjection,
  commitGroupMemoryCompactBoundary,
  deleteGroupMemoryBoundaryArtifacts,
  getGroupMemoryBoundaryJournalFile,
  getGroupMemoryResumeProofFile,
  quarantineInvalidGroupMemoryBoundaryJournal,
  recordGroupMemoryResumeProjectionProof,
  retireGroupMemoryBoundaryJournal,
} from "./group-memory-boundary-journal";

import {
  runGroupSessionMemoryExtractionTransaction,
} from "./group-session-memory-extraction";

import {
  GLOBAL_AGENT_MEMORY_FILE,
  acquireGlobalAgentMemorySelfTestLock,
  recallGlobalAgentMemory,
  scanGlobalAgentMemorySelfTestContamination,
} from "../../agents/global/memory";

import { loadExecution } from "../../agents/execution-kernel";

import { DIRECT_AGENT_DISPATCH_REQUEST_SCHEMA, pruneDirectAgentDispatchSpool, validateDirectAgentDispatchPair } from "../../agents/direct-dispatch-spool";

import {
  commitTaskAgentSessionCapacityRevalidation,
  recordTaskAgentMemoryContextDelivery,
  verifyMemoryContextDeliveryReceiptChecksum,
} from "../../tasks/agent-sessions";

import {
  createTypedMemoryDispatchWal,
  getTypedMemoryDispatchWalScopeDir,
  listTypedMemoryDispatchWal,
  pruneTypedMemoryDispatchWal,
  TYPED_MEMORY_DISPATCH_WAL_DIR,
  transitionTypedMemoryDispatchWal,
  verifyTypedMemoryDispatchWal,
} from "./typed-memory-dispatch-wal";

import {
  backfillGroupPostTurnSummaries,
  buildGroupPostTurnSummaryDeliveryCapsule,
  extractGroupPostTurnSummaryDeliveryCapsule,
  getGroupPostTurnSummaryLedgerFile,
  readGroupPostTurnSummaries,
  recordGroupPostTurnSummary,
  validateGroupPostTurnSummaryDeliveryCapsule,
} from "./group-post-turn-summary";

import { deleteTaskAgentInvocationLineageArtifacts } from "../../tasks/task-agent-invocation-lineage";

import { deleteTaskAgentContinuationSoakArtifacts } from "../../tasks/task-agent-continuation-soak";

import {
  commitGroupCompactHead,
  deleteGroupCompactHead,
  readGroupCompactHead,
  reconcileGroupCompactHeadFromMemory,
} from "./group-compact-head";

import {
  buildProviderNativeCompactExecutionReceiptSummary,
  getProviderNativeCompactExecutionReceiptLedgerFile,
} from "./provider-native-compact-execution-receipt";

import {
  consumeProviderNativeCompactSessionCapacity,
  deleteProviderNativeCompactSessionCapacity,
  getProviderNativeCompactSessionGenerationFence,
  reconcileProviderNativeCompactSessionCapacityReset,
  resetProviderNativeCompactSessionCapacity,
} from "./provider-native-compact-session-capacity";

import {
  deleteGroupMemoryAutoCompactCircuitBreaker,
  readGroupMemoryAutoCompactCircuitBreaker,
  recordGroupMemoryAutoCompactCircuitBreakerOutcome,
} from "./group-memory-auto-compact-circuit-breaker";

import { deleteGroupReactiveCompactRetryOwnership } from "./group-reactive-compact-retry-ownership";

import {
  deleteGroupPromptCacheBreakDetection,
  notifyGroupPromptCacheCompaction,
  readGroupPromptCacheBreakDetection,
  verifyGroupPromptCacheCompactionNotification,
} from "./group-prompt-cache-break-detection";

import { deleteWorkerContextCompactSessionArtifactsForCoordinator } from "./group-orchestrator";

import { GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_DIR, GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION, GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_DIR, GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION, GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS, GROUP_COMPACT_FILE_REFERENCE_DIR, GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION, GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION, GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION, GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_DIR, GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION, GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION, GROUP_MEMORY_RELOAD_AUDIT_VERSION, GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION, GROUP_MEMORY_SOURCE_MANIFEST_VERSION, apiMicrocompactBetaHeadersFromHeaders, buildGroupMemorySourceEntry, buildStableSourceFingerprint, compactMemoryText, compactReferenceFingerprint, getGroupMessagesFileHint, hashSessionMemoryText, normalizePostCompactUsageState, readGroupMemoryReloadLedger, readGroupPostCompactDispatchLedger, resolvePostCompactBoundaryMarkerParts, stableApiMicrocompactChecksum, uniqueApiMicrocompactStrings, uniqueByKey, usageRecommendationForStats, writeGroupMemoryReloadLedger, writeGroupPostCompactDispatchLedger } from "./group-memory-shared";
import { getGroupMemoryFile, getGroupMemoryReloadLedgerFile, getGroupPostCompactDispatchLedgerFile, getGroupSessionSidecarFile } from "./group-memory-storage";

export function buildGroupMemoryDispatchFreshnessGate(input: any = {}) {
  const sourceManifest = input.sourceManifest || input.source_manifest || {};
  const reloadAudit = input.reloadAudit || input.reload_audit || {};
  const memoryIgnored = input.memoryIgnored === true || input.memory_ignored === true;
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const scope = String(input.scope || reloadAudit.scope || "default");
  const sourceChecksum = String(sourceManifest.manifestChecksum || "");
  const reloadReason = String(reloadAudit.reason || (memoryIgnored ? "ignore_memory" : "context_bundle"));
  const sourceStatus = String(sourceManifest.status || (memoryIgnored ? "ignored" : "unknown"));
  const missingRequired = Array.isArray(sourceManifest.missingRequired) ? sourceManifest.missingRequired : [];
  const dispatchId = `gmd_${crypto.createHash("sha256").update(JSON.stringify([
    input.groupId || input.group_id || "",
    input.targetProject || input.target_project || "",
    scope,
    generatedAt,
    sourceChecksum,
    reloadReason,
    memoryIgnored,
  ])).digest("hex").slice(0, 18)}`;
  const status = memoryIgnored
    ? "memory_ignored"
    : sourceStatus === "fail" || missingRequired.length
      ? "source_incomplete"
      : reloadAudit.shouldReload === false
        ? "fresh_reused_stable_sources"
        : "fresh_reloaded";
  const gate = {
    schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
    version: GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION,
    dispatch_gate_id: dispatchId,
    group_id: String(input.groupId || input.group_id || ""),
    target_project: String(input.targetProject || input.target_project || ""),
    scope,
    generated_at: generatedAt,
    status,
    memory_ignored: memoryIgnored,
    action: memoryIgnored
      ? "do_not_use_platform_memory"
      : status === "source_incomplete"
        ? "use_current_context_but_verify_missing_sources"
        : reloadAudit.shouldReload === false
          ? "reuse_stable_context_sources"
          : "use_reloaded_context",
    source_manifest: {
      checksum: sourceChecksum,
      status: sourceStatus,
      entry_count: Number(sourceManifest.entryCount || 0),
      typed_doc_count: Number(sourceManifest.typedDocCount || 0),
      latest_mtime: sourceManifest.latestMtime || "",
      missing_required: missingRequired,
    },
    reload_audit: {
      reason: reloadReason,
      original_reason: reloadAudit.originalReason || reloadReason,
      should_reload: reloadAudit.shouldReload !== false,
      cache_action: reloadAudit.cacheAction || "",
      hook_event: reloadAudit.hookEvent || "",
      previous_audit_at: reloadAudit.previousAuditAt || "",
      source_changed: reloadAudit.sourceManifestChanged === true || reloadAudit.sourceChangeTrigger?.triggered === true,
      load_plan_changed: reloadAudit.loadPlanChanged === true,
      source_change_trigger: reloadAudit.sourceChangeTrigger || null,
    },
    receipt_contract: {
      memory_used_should_reference_gate: !memoryIgnored,
      memory_ignored_should_reference_gate: memoryIgnored,
      required_receipt_fields: ["memoryUsed", "memoryIgnored"],
    },
  };
  return {
    ...gate,
    context_budget: buildContextBudget({ context: gate, maxChars: 8000, maxTokens: 20_000 }),
  };
}

export function recordGroupPostCompactFirstDispatchMarker(groupId: string, input: any = {}) {
  const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "default");
  const targetProject = String(input.targetProject || input.target_project || "").trim();
  const scope = String(input.scope || (targetProject ? `child:${targetProject}` : "child"));
  const parts = resolvePostCompactBoundaryMarkerParts(groupId, input);
  if (!parts) return null;
  const ledgerFile = getGroupPostCompactDispatchLedgerFile(groupId, groupSessionId);
  const ledgerDisabled = input.disableLedger === true
    || input.disable_ledger === true
    || input.disablePostCompactDispatchLedger === true
    || input.disable_post_compact_dispatch_ledger === true;
  const ledger = ledgerDisabled ? { scopes: {}, entries: [] } : readGroupPostCompactDispatchLedger(groupId, groupSessionId);
  const scopeKey = `${scope}|${parts.boundaryId}`;
  const previous = ledger.scopes?.[scopeKey] || null;
  const dispatchSequence = Number(previous?.dispatchSequence || previous?.dispatch_sequence || 0) + 1;
  const firstDispatchAfterCompact = dispatchSequence === 1;
  const gate = input.postCompactReinjectionGate || input.post_compact_reinjection_gate || {};
  const markerCore: any = {
    schema: "ccm-post-compact-first-dispatch-marker-v1",
    version: GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION,
    marker_id: `pcfd_${crypto.createHash("sha256").update(JSON.stringify([
      groupId,
      targetProject,
      scope,
      parts.boundaryId,
      dispatchSequence,
    ])).digest("hex").slice(0, 18)}`,
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: targetProject,
    scope,
    generated_at: generatedAt,
    boundary_id: parts.boundaryId,
    raw_boundary_id: parts.rawBoundaryId,
    summarized_through_message_id: parts.summarizedThroughMessageId,
    summary_checksum: parts.summaryChecksum,
    compacted_message_count: parts.compactedMessageCount,
    first_dispatch_after_compact: firstDispatchAfterCompact,
    dispatch_sequence: dispatchSequence,
    previous_dispatch_at: previous?.generatedAt || previous?.generated_at || "",
    status: firstDispatchAfterCompact ? "first_dispatch_after_compact" : "post_compact_followup_dispatch",
    action: firstDispatchAfterCompact
      ? "treat_reinjected_memory_as_fresh_recovered_context"
      : "reuse_recovered_context_with_sequence_awareness",
    reinjection_gate_id: gate.reinjection_gate_id || gate.reinjectionGateId || "",
    candidate_count: Number(gate.candidate_count || gate.candidateCount || 0),
    ledger_file: ledgerFile,
    cc_parity_reference: {
      source: "Claude Code pendingPostCompaction / consumePostCompaction",
      semantics: "mark once per compact boundary and target child Agent dispatch sequence",
    },
    receipt_contract: {
      memory_used_or_ignored_may_reference_marker: true,
      required_receipt_fields: ["memoryUsed", "memoryIgnored"],
      note: "该 marker 是压缩后派发遥测；first_dispatch_after_compact=true 时，子 Agent 应把本轮记忆包视为压缩恢复后的第一跳上下文。",
    },
  };
  const marker = {
    ...markerCore,
    context_budget: buildContextBudget({ context: markerCore, maxChars: 5000, maxTokens: 12_000 }),
  };
  if (!ledgerDisabled) {
    ledger.scopes = ledger.scopes || {};
    ledger.scopes[scopeKey] = {
      groupId,
      groupSessionId,
      targetProject,
      scope,
      boundaryId: parts.boundaryId,
      rawBoundaryId: parts.rawBoundaryId,
      summarizedThroughMessageId: parts.summarizedThroughMessageId,
      summaryChecksum: parts.summaryChecksum,
      dispatchSequence,
      firstDispatchAt: previous?.firstDispatchAt || previous?.first_dispatch_at || generatedAt,
      generatedAt,
      latestMarkerId: marker.marker_id,
      reinjectionGateId: marker.reinjection_gate_id,
      candidateCount: marker.candidate_count,
    };
    ledger.entries = [...(ledger.entries || []), markerCore].slice(-160);
    ledger.updatedAt = generatedAt;
    writeGroupPostCompactDispatchLedger(groupId, ledger, groupSessionId);
  }
  return marker;
}
