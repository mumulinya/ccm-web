// Behavior-freeze split from group-memory-distillation.ts (part 2/3).
// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
  GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
  GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
  GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
  GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
  GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
  GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
  GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
  GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE,
  GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_LEDGER,
  GROUP_TYPED_MEMORY_DISTILLATION_LOCK,
  GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE,
  GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
  GroupTypedMemoryType,
  acquireGroupTypedMemoryDistillationLock,
  activeGroupTypedMemoryDistillationMutations,
  addDistillationQualityCheck,
  buildGroupSessionModelExtractionTypedMemoryTopics,
  buildGroupTypedMemoryDistillationWorkState,
  buildGroupTypedMemoryIndex,
  checksum,
  collectDistilledFacts,
  commitGroupTypedMemoryArtifactMutation,
  compactStrategyInputOutcomes,
  compactStrategyInputStrategy,
  compactStrategyTypedArchive,
  compactText,
  contextUsageRepairArchive,
  distillGroupMessagesToTypedMemoryUnlocked,
  distillationQualityPenalty,
  extractPathClaims,
  extractTaskStateSignal,
  getGroupTypedMemoryDir,
  groupLogDistillationAdmission,
  groupTypedMemoryDistillationLockChecksum,
  groupTypedMemoryDistillationStateChecksum,
  ignoreMemoryReceiptRepairArchive,
  loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows,
  mergeContextUsageRepairRows,
  mergeIgnoreMemoryReceiptRepairRows,
  mergePostCompactCompletionMemoryPreservationRepairClosureRows,
  mergePostCompactReceiptMemoryUsageRepairCompletionRows,
  mergePostCompactReinjectionRepairReceiptConsumptionRows,
  mergePressureMemoryProvenanceReceiptRepairRows,
  mergePressureProvenancePreDispatchComplianceRecoveryRows,
  mergePressureProvenancePreDispatchComplianceRows,
  mergeProviderDispatchOverrideFollowupReceiptValidationRows,
  mergeProviderDispatchOverrideFollowupRows,
  mergeProviderRankingMemoryUsageReceiptRepairRows,
  mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows,
  mergeProviderReproofReceiptConsumptionRows,
  mergeProviderSwitchExecutionRows,
  modelExtractionEvidenceComparable,
  modelExtractionTypedArchiveChecksum,
  normalizeContextUsageRepairRows,
  normalizeIgnoreMemoryReceiptRepairRows,
  normalizeMemoryType,
  normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows,
  normalizePostCompactCompletionMemoryPreservationRepairClosureRows,
  normalizePostCompactReceiptMemoryUsageRepairCompletionRows,
  normalizePostCompactReinjectionRepairReceiptConsumptionRows,
  normalizePressureMemoryProvenanceReceiptRepairRows,
  normalizePressureProvenancePreDispatchComplianceRecoveryRows,
  normalizePressureProvenancePreDispatchComplianceRows,
  normalizeProviderDispatchOverrideFollowupReceiptValidationRows,
  normalizeProviderDispatchOverrideFollowupRows,
  normalizeProviderRankingMemoryUsageReceiptRepairRows,
  normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows,
  normalizeProviderReproofReceiptConsumptionRows,
  normalizeProviderSwitchExecutionRows,
  now,
  positiveFeedbackLifecycleEventChecksum,
  postCompactReceiptMemoryUsageRepairCompletionArchive,
  pressureMemoryProvenanceReceiptRepairArchive,
  pressureProvenancePreDispatchComplianceArchive,
  pressureProvenancePreDispatchComplianceRecoveryArchive,
  pressureProvenanceProviderDispatchOverrideFollowupArchive,
  pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive,
  providerRankingMemoryUsageReceiptRepairArchive,
  providerSwitchExecutionArchive,
  ptlEmergencyTypedArchive,
  readJson,
  recoverGroupTypedMemoryArtifactTransaction,
  releaseGroupTypedMemoryDistillationLock,
  renderCompactStrategyCautionBody,
  renderCompactStrategyReferenceBody,
  renderContextUsageRepairBody,
  renderIgnoreMemoryReceiptRepairBody,
  renderModelExtractionTypedMemoryBody,
  renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody,
  renderPostCompactCompletionMemoryPreservationRepairClosureBody,
  renderPostCompactReceiptMemoryUsageRepairCompletionBody,
  renderPostCompactReinjectionRepairReceiptConsumptionBody,
  renderPressureMemoryProvenanceReceiptRepairBody,
  renderPressureProvenancePreDispatchComplianceBody,
  renderPressureProvenancePreDispatchComplianceRecoveryBody,
  renderPressureProvenanceProviderDispatchOverrideFollowupBody,
  renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody,
  renderProviderRankingMemoryUsageReceiptRepairBody,
  renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody,
  renderProviderReproofReceiptConsumptionBody,
  renderProviderSwitchExecutionBody,
  renderPtlEmergencyTypedBody,
  resolveClaimPath,
  scanGroupTypedMemoryDocuments,
  scanGroupTypedMemoryDocumentsRaw,
  stageGroupTypedMemoryArtifactRemoval,
  typedMemoryDistillationProcessAlive,
  typedMemoryDistillationWait,
  typedMemorySessionScopeIdentity,
  uniqueStrings,
  upsertGroupTypedMemoryDocument,
  validateModelExtractionTypedMemoryInput,
  verifyGroupTypedMemoryDistillationLock,
  writeGroupTypedMemoryDistillationTransactionState,
  writeJsonAtomic,
  writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive,
} from "./group-memory-index";

import {
  postCompactCompletionMemoryPreservationRepairClosureArchive,
  readGroupTypedMemoryDistillationLedger,
  runGroupTypedMemoryDistillationMutation,
} from "./group-memory-distillation-part-01";

export function distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_completion_memory_preservation_closure", options, () => distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
      version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, ledger);
  const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const incomingRows = normalizePostCompactCompletionMemoryPreservationRepairClosureRows(input, {
    ...options,
    groupId: sourceGroupId,
    groupSessionId,
    updatedAt,
  });
  const previousArchive = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive || {};
  const merged = mergePostCompactCompletionMemoryPreservationRepairClosureRows(
    Array.isArray(previousArchive.rows) ? previousArchive.rows : [],
    incomingRows,
    { ...options, updatedAt }
  );
  const archive = {
    ...postCompactCompletionMemoryPreservationRepairClosureArchive(merged.rows, { updatedAt }),
    sourceGroupId,
    groupSessionId,
    exactSession: !!groupSessionId,
  };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-completion-memory-preservation-repair-closures",
      name: "Post-compact completion memory preservation repair closures",
      description: "Verified newer compact outcomes that restored corrected-receipt completion identity and session authority, with mandatory future current-source reverification.",
      source: "auto:post-compact-completion-memory-preservation-repair-closure-distillation",
      updatedAt,
      body: renderPostCompactCompletionMemoryPreservationRepairClosureBody(archive, { updatedAt, sourceGroupId, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    postCompactCompletionMemoryPreservationRepairClosureArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    verifiedCount: archive.verified_count,
    failedOutcomeCount: archive.failed_outcome_count,
    correctedOutcomeCount: archive.corrected_outcome_count,
    completionDocCount: archive.completion_doc_count,
    completionWorkItemCount: archive.completion_work_item_count,
    timelineBindingCount: archive.timeline_binding_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId: string, options: any = {}) {
  return require("./group-memory-maintenance").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options);
}

export function lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId: string, query: any = {}, options: any = {}) {
  return require("./group-memory-maintenance").lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, query, options);
}

export function distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "post_compact_completion_conflict_resolution", options, () => distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, ledger);
  const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const incomingRows = normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows(groupId, input, {
    ...options,
    sourceGroupId,
    groupSessionId,
    updatedAt,
  });
  const previousArchive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
  const previousColdRows = loadPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupId);
  const merged = new Map<string, any>();
  for (const row of previousColdRows) merged.set(row.row_id, row);
  for (const row of Array.isArray(previousArchive.rows) ? previousArchive.rows : []) merged.set(row.row_id, row);
  const previousIds = new Set(merged.keys());
  for (const row of incomingRows) {
    const previous = merged.get(row.row_id);
    merged.set(row.row_id, {
      ...(previous || {}),
      ...row,
      first_seen_at: previous?.first_seen_at || row.resolved_at,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const rows = [...merged.values()].sort((a: any, b: any) => String(a.resolved_at || "").localeCompare(String(b.resolved_at || "")));
  const hotRowLimit = Math.max(20, Number(options.hotRowLimit || options.hot_row_limit || GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT));
  const hotRows = rows.slice(-hotRowLimit);
  const coldManifest = writePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, rows, { ...options, updatedAt, hotRowLimit });
  const archive = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
    sourceGroupId,
    groupSessionId,
    exactSession: !!groupSessionId,
    archived_count: rows.length,
    resolved_used_or_verified_count: rows.filter((row: any) => ["used", "verified"].includes(row.resolution_usage_state)).length,
    resolved_ignored_count: rows.filter((row: any) => row.resolution_usage_state === "ignored").length,
    task_family_count: uniqueStrings(rows.map((row: any) => row.task_family_key), 320).length,
    task_session_count: uniqueStrings(rows.map((row: any) => row.task_agent_session_id), 320).length,
    native_session_count: uniqueStrings(rows.map((row: any) => row.native_session_id), 320).length,
    immutable_branch_count: rows.length,
    retention_policy: "checksum_addressed_cold_shards_bounded_hot_index_render_latest_100",
    retention_pruned_count: 0,
    hot_row_limit: hotRowLimit,
    hot_row_count: hotRows.length,
    cold_archive_row_count: Number(coldManifest.row_count || 0),
    cold_archive_shard_count: Number(coldManifest.shard_count || 0),
    cold_archive_manifest_rel_path: path.relative(getGroupTypedMemoryDir(groupId), coldManifest.file).split(path.sep).join("/"),
    cold_archive_manifest_checksum: coldManifest.manifest_checksum,
    cold_archive_rows_checksum: coldManifest.rows_checksum,
    rows: hotRows,
    updatedAt,
  };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "post-compact-completion-memory-preservation-closure-conflict-resolutions",
      name: "Post-compact completion memory preservation closure conflict resolutions",
      description: "Session-bound, reversible current-source decisions resolving contradictory closure-memory feedback without erasing historical branches.",
      source: "auto:post-compact-completion-memory-preservation-closure-conflict-resolution-distillation",
      updatedAt,
      body: renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody(archive, { updatedAt, sourceGroupId, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    postCompactCompletionMemoryPreservationClosureConflictResolutionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-v1",
    version: GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incomingRows.some((incoming: any) => incoming.row_id === row.row_id)).length,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_ranking_memory_usage_repair", options, () => distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
      version: GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, {
    groupId,
    sourceGroupId: options.sourceGroupId || options.source_group_id || "",
    groupSessionId: options.groupSessionId || options.group_session_id || "",
  });
  const sourceGroupId = scopeIdentity.rootGroupId || groupId;
  const groupSessionId = scopeIdentity.groupSessionId;
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderRankingMemoryUsageReceiptRepairRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.providerRankingMemoryUsageReceiptRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderRankingMemoryUsageReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = { ...providerRankingMemoryUsageReceiptRepairArchive(merged.rows, { updatedAt }), sourceGroupId, groupSessionId, exactSession: !!groupSessionId };
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-ranking-memory-usage-receipt-discipline",
      name: "Provider ranking memory usage receipt discipline",
      description: "Child Agent receipt discipline for provider ranking compact repair typed memory usage.",
      source: "auto:provider-ranking-memory-usage-receipt-repair-distillation",
      updatedAt,
      body: renderProviderRankingMemoryUsageReceiptRepairBody(archive, { updatedAt, groupSessionId }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    providerRankingMemoryUsageReceiptRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
    version: GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    openCount: archive.open_count,
    completedCount: archive.completed_count,
    packetBoundCount: archive.packet_bound_count,
    docRelPathCount: archive.doc_rel_path_count,
    correctedPromptCount: archive.corrected_prompt_count,
    usageStatePromptCount: archive.usage_state_prompt_count,
    authorizationBoundaryPromptCount: archive.authorization_boundary_prompt_count,
    freshReceiptPromptCount: archive.fresh_receipt_prompt_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillProviderDispatchOverrideFollowupToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_dispatch_override_followup", options, () => distillProviderDispatchOverrideFollowupToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderDispatchOverrideFollowupRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderDispatchOverrideFollowupRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenanceProviderDispatchOverrideFollowupArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-dispatch-override-followup-recall",
      name: "Provider dispatch override follow-up repair history",
      description: "Completed pressure provenance provider dispatch overrides whose follow-up repair was verified by child Agent memoryProvenanceUsage receipts.",
      source: "auto:pressure-provenance-provider-dispatch-override-followup-distillation",
      updatedAt,
      body: renderPressureProvenanceProviderDispatchOverrideFollowupBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    pressureProvenanceProviderDispatchOverrideFollowupArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-override-followup-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    completedCount: archive.completed_count,
    attributionCount: archive.attribution_count,
    relPathCount: archive.rel_path_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillProviderSwitchExecutionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_switch_execution", options, () => distillProviderSwitchExecutionToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-provider-switch-execution-distillation-v1",
      version: GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderSwitchExecutionRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.providerSwitchExecutionArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderSwitchExecutionRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = providerSwitchExecutionArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-switch-execution-memory",
      name: "Provider switch execution memory",
      description: "System-attested provider switch executions and mismatch feedback from child Agent completion receipts.",
      source: "auto:provider-switch-execution-distillation",
      updatedAt,
      body: renderProviderSwitchExecutionBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    providerSwitchExecutionArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-provider-switch-execution-distillation-v1",
    version: GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    approvedCount: archive.approved_count,
    executedCount: archive.executed_count,
    passedCount: archive.passed_count,
    failedCount: archive.failed_count,
    mismatchCount: archive.mismatch_count,
    attributionCount: archive.attribution_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "provider_dispatch_override_followup_validation", options, () => distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, {
    groupId,
    sourceGroupId: options.sourceGroupId || options.source_group_id || "",
    groupSessionId: options.groupSessionId || options.group_session_id || "",
  });
  const sourceGroupId = scopeIdentity.rootGroupId || groupId;
  const groupSessionId = scopeIdentity.groupSessionId;
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeProviderDispatchOverrideFollowupReceiptValidationRows(input, { ...options, groupId: sourceGroupId, groupSessionId, updatedAt });
  const previousArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeProviderDispatchOverrideFollowupReceiptValidationRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive(merged.rows, { ...options, sourceGroupId, groupSessionId, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "provider-dispatch-override-followup-receipt-validation-history",
      name: "Provider dispatch override follow-up receipt validation history",
      description: "Append-only failed and repaired corrected-receipt validation attempts used by provider-specific pre-dispatch policy.",
      source: "auto:pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation",
      updatedAt,
      body: renderPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 24_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    facts: ledger.facts || {},
    pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION,
    groupId,
    sourceGroupId,
    groupSessionId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    attemptCount: archive.attempt_count,
    failedCount: archive.failed_count,
    passedCount: archive.passed_count,
    attributionCount: archive.attribution_count,
    escalatedAttributionCount: archive.escalated_attribution_count,
    repairedAttributionCount: archive.repaired_attribution_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillIgnoreMemoryReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "ignore_memory_receipt_repair", options, () => distillIgnoreMemoryReceiptRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
      version: GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeIgnoreMemoryReceiptRepairRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.ignoreMemoryReceiptRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeIgnoreMemoryReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = ignoreMemoryReceiptRepairArchive(merged.rows, { updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "ignore-memory-receipt-discipline",
      name: "Ignore-memory receipt discipline",
      description: "Child Agent receipt discipline for WorkerContextPacket ignore-memory policy.",
      source: "auto:ignore-memory-receipt-repair-distillation",
      updatedAt,
      body: renderIgnoreMemoryReceiptRepairBody(archive.rows, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    ignoreMemoryReceiptRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-ignore-memory-receipt-repair-distillation-v1",
    version: GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    openCount: archive.open_count,
    completedCount: archive.completed_count,
    packetBoundCount: archive.packet_bound_count,
    correctedPromptCount: archive.corrected_prompt_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "pressure_memory_provenance_repair", options, () => distillPressureMemoryProvenanceReceiptRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
      version: GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePressureMemoryProvenanceReceiptRepairRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureMemoryProvenanceReceiptRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePressureMemoryProvenanceReceiptRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureMemoryProvenanceReceiptRepairArchive(merged.rows, { updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "pressure-memory-provenance-receipt-discipline",
      name: "Pressure memory provenance receipt discipline",
      description: "Child Agent receipt discipline for WorkerContextPacket pressure repair MEMORY.md provenance.",
      source: "auto:pressure-memory-provenance-receipt-repair-distillation",
      updatedAt,
      body: renderPressureMemoryProvenanceReceiptRepairBody(archive.rows, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    pressureMemoryProvenanceReceiptRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-memory-provenance-receipt-repair-distillation-v1",
    version: GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    openCount: archive.open_count,
    completedCount: archive.completed_count,
    packetBoundCount: archive.packet_bound_count,
    relPathCount: archive.rel_path_count,
    repairWorkItemCount: archive.repair_work_item_count,
    correctedPromptCount: archive.corrected_prompt_count,
    currentSourceVerifiedPromptCount: archive.current_source_verified_prompt_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "pressure_provenance_pre_dispatch_compliance", options, () => distillPressureProvenancePreDispatchComplianceToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePressureProvenancePreDispatchComplianceRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePressureProvenancePreDispatchComplianceRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenancePreDispatchComplianceArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "pressure-provenance-pre-dispatch-compliance",
      name: "Pressure provenance pre-dispatch compliance",
      description: "Executor/project attribution for pressure provenance receipt failures after pre-dispatch discipline was shown.",
      source: "auto:pressure-provenance-pre-dispatch-compliance-distillation",
      updatedAt,
      body: renderPressureProvenancePreDispatchComplianceBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    pressureProvenancePreDispatchComplianceArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    attributionCount: archive.attribution_count,
    frequentAttributionCount: archive.frequent_attribution_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "pressure_provenance_compliance_recovery", options, () => distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizePressureProvenancePreDispatchComplianceRecoveryRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergePressureProvenancePreDispatchComplianceRecoveryRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = pressureProvenancePreDispatchComplianceRecoveryArchive(merged.rows, { ...options, updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "pressure-provenance-compliance-recovery",
      name: "Pressure provenance compliance recovery",
      description: "Executor/project recovery evidence for compliant pressure provenance receipts after feedback policy.",
      source: "auto:pressure-provenance-compliance-recovery-distillation",
      updatedAt,
      body: renderPressureProvenancePreDispatchComplianceRecoveryBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    pressureProvenancePreDispatchComplianceRecoveryArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    attributionCount: archive.attribution_count,
    compliantCount: archive.compliant_count,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillContextUsageRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "context_usage_repair", options, () => distillContextUsageRepairToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-context-usage-repair-distillation-v1",
      version: GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const incomingRows = normalizeContextUsageRepairRows(input, { ...options, groupId, updatedAt });
  const previousArchive = ledger.contextUsageRepairArchive || {};
  const previousRows = Array.isArray(previousArchive.rows) ? previousArchive.rows : [];
  const merged = mergeContextUsageRepairRows(previousRows, incomingRows, { ...options, updatedAt });
  const archive = contextUsageRepairArchive(merged.rows, { updatedAt });
  const writes: any[] = [];
  if (archive.rows.length) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-usage-pressure-discipline",
      name: "WorkerContextPacket context usage pressure discipline",
      description: "Reactive compact/crop discipline for WorkerContextPacket context pressure before child Agent dispatch.",
      source: "auto:context-usage-repair-distillation",
      updatedAt,
      body: renderContextUsageRepairBody(archive.rows, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: ledger.facts || {},
    contextUsageRepairArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-context-usage-repair-distillation-v1",
    version: GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    incomingRowCount: incomingRows.length,
    archivedCount: archive.archived_count,
    overBudgetCount: archive.over_budget_count,
    criticalCount: archive.critical_count,
    compactRecommendedCount: archive.compact_recommended_count,
    openCount: archive.open_count,
    packetBoundCount: archive.packet_bound_count,
    maxPressure: archive.max_pressure,
    newRowCount: merged.newRowCount,
    updatedRowCount: merged.updatedRowCount,
    prunedRowCount: merged.prunedRowCount,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}

export function distillCompactStrategyToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  if (options.__distillationMutationCoordinator !== true) return runGroupTypedMemoryDistillationMutation(groupId, "compact_strategy", options, () => distillCompactStrategyToTypedMemory(groupId, input, { ...options, __distillationMutationCoordinator: true }));
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return {
      schema: "ccm-compact-strategy-typed-memory-distillation-v1",
      version: GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
      groupId,
      skipped: true,
      reason: "disabled",
    };
  }
  const updatedAt = String(options.updatedAt || options.updated_at || now());
  const strategy = compactStrategyInputStrategy(input);
  const outcomes = compactStrategyInputOutcomes(input);
  const archive = compactStrategyTypedArchive({ ...strategy, groupId: strategy.groupId || strategy.group_id || groupId }, outcomes, { ...options, groupId, updatedAt });
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const writes: any[] = [];
  if (archive.category_count > 0 || archive.outcome_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "worker-context-compact-strategy-memory",
      name: "WorkerContextPacket compact strategy memory",
      description: "Reusable compact strategy outcomes for WorkerContextPacket budget recovery.",
      source: "auto:compact-strategy-memory-distillation",
      updatedAt,
      body: renderCompactStrategyReferenceBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 20_000),
    }));
  }
  if (archive.avoid_count > 0 || archive.blocked_outcome_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "worker-context-compact-strategy-cautions",
      name: "WorkerContextPacket compact strategy cautions",
      description: "Compact strategy categories and outcomes that blocked dispatch or need review before reuse.",
      source: "auto:compact-strategy-memory-distillation",
      updatedAt,
      body: renderCompactStrategyCautionBody(archive, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 16_000),
    }));
  }
  const ledgerState = { ...ledger };
  delete ledgerState.file;
  writeJsonAtomic(ledger.file, {
    ...ledgerState,
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    facts: ledger.facts || {},
    compactStrategyArchive: archive,
    updatedAt,
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-compact-strategy-typed-memory-distillation-v1",
    version: GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    groupSessionId: archive.groupSessionId || "",
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    archivedCount: archive.outcome_count,
    categoryCount: archive.category_count,
    preferredCount: archive.preferred_count,
    avoidCount: archive.avoid_count,
    recoveredOutcomeCount: archive.recovered_outcome_count,
    blockedOutcomeCount: archive.blocked_outcome_count,
    writeCount: writes.length,
    writes,
    index,
    archive,
    distilledAt: updatedAt,
  };
}
