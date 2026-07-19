// Behavior-freeze split from typed-memory-distillation-receipts.ts (part 2/5).
// Behavior-freeze module extracted mechanically from the former facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import { applyGroupDirectMemoryRequests, buildGroupTypedMemoryIndex, filterFactsByDirectMemoryTombstones, getGroupTypedMemoryArtifactTransactionStageRoot, inspectGroupTypedMemoryArtifactTransaction, normalizeGroupDirectMemoryRequest, upsertGroupTypedMemoryDocument } from "./typed-memory-index-build";
import { cleanupGroupLedgerLockHeld, conflictResolutionMaintenanceScopeMetadata, conflictResolutionMaintenanceState, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile, pruneCleanupMetadataArchives, withCleanupGroupLedgerLock } from "./typed-memory-ledgers";
import { pressureMemoryProvenanceRowsFromRawRecovery, pressureMemoryProvenanceStringList, roundPressureRecallUsageWeight } from "./typed-memory-recall";
import { GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR, GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS, GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION, GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION, GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION, GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION, GROUP_LOG_ACTIVITY_NOISE_PATTERN, GROUP_LOG_DURABLE_PATTERN, GROUP_LOG_EPHEMERAL_PATTERN, GROUP_LOG_EXTERNAL_RESOURCE_PATTERN, GROUP_LOG_NON_OBVIOUS_PATTERN, GROUP_LOG_POSITIVE_REVOCATION_PATTERN, GROUP_LOG_RATIONALE_PATTERN, GROUP_LOG_RESOURCE_PURPOSE_PATTERN, GROUP_LOG_USER_CORRECTION_PATTERN, GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION, GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION, GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION, GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION, GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION, GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION, GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS, GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS, GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION, GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION, GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION, GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION, GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION, GROUP_SESSION_MODEL_EXTRACTION_MAX_TOPICS_PER_CATEGORY, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_MERGE_MIN_SIMILARITY, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY, GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION, GROUP_TYPED_MEMORY_DIR, GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT, GROUP_TYPED_MEMORY_DISTILLATION_LEDGER, GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES, GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION, GROUP_TYPED_MEMORY_DISTILLATION_VERSION, GROUP_TYPED_MEMORY_WRITE_ADMISSION_VERSION, GroupTypedMemoryType, MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS, MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS, activeGroupTypedMemoryDistillationMutations, buildGroupLogPositiveConfirmationCandidate, buildPostCompactCandidateUsageArchive, checksum, compactText, extractMessageFiles, extractMessageSkills, extractMessageVerification, getGroupTypedMemoryDir, isExactGroupTypedMemorySessionScope, messageActor, messageContent, messageIdentity, normalizeGroupLogMemoryAdmission, normalizeGroupLogMemoryRevocation, normalizeMemoryType, now, readJson, safeSegment, stageGroupTypedMemoryArtifactRemoval, tokens, typedMemorySessionScopeIdentity, uniqueStrings, verifyGroupLogLifecycleCurrentSourceEvidence, writeJsonAtomic } from "./typed-memory-shared";

import {
  normalizeProviderReproofReceiptConsumptionStatus,
  providerReproofReceiptConsumptionCategory,
  providerReproofReceiptConsumptionRecommendation,
} from "./typed-memory-distillation-receipts-part-01";

export function providerReproofReceiptConsumptionRowId(row: any = {}) {
  return `provider-reproof-receipt:${checksum([
    row.groupId,
    row.groupSessionId,
    row.timeline_binding_id,
    row.brief_id,
    row.work_item_id,
    row.task_id,
    row.project,
    row.request_patch_checksum,
    row.status,
  ], 24)}`;
}

export function providerReproofReceiptConsumptionInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.entries) ? input.entries : []),
    ...(Array.isArray(input.bindings) ? input.bindings : []),
  ];
  if (rows.length) return rows;
  const reportGroups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return reportGroups.flatMap((group: any) => Array.isArray(group.bindings) ? group.bindings : []);
}

export function normalizeProviderReproofReceiptConsumptionRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
  return providerReproofReceiptConsumptionInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.binding || raw || {};
    const dispatchSource = String(entry.source || entry.dispatch_source || raw?.source || "").trim();
    const status = normalizeProviderReproofReceiptConsumptionStatus(
      entry.replay_repair_consumption_status
        || entry.replayRepairConsumptionStatus
        || entry.usage_state
        || entry.usageState
        || raw?.status
    );
    const row = {
      schema: "ccm-provider-reproof-receipt-consumption-distilled-row-v1",
      version: GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
      groupId: String(fallbackGroupId || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
      groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
      timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || raw?.timelineBindingId || "").trim(),
      brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
      work_item_id: String(entry.work_item_id || entry.workItemId || raw?.work_item_id || raw?.workItemId || "").trim(),
      task_id: String(entry.task_id || entry.taskId || raw?.task_id || raw?.taskId || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      dispatch_source: dispatchSource,
      status,
      category: providerReproofReceiptConsumptionCategory(status),
      recommendation: "",
      consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.replay_repair_consumption_source || raw?.consumption_source || "").trim(),
      consumption_state: String(entry.replay_repair_consumption_state || entry.replayRepairConsumptionState || raw?.replay_repair_consumption_state || raw?.usage_state || raw?.usageState || "").trim(),
      reason: compactText(entry.replay_repair_consumption_reason || entry.replayRepairConsumptionReason || raw?.replay_repair_consumption_reason || raw?.reason || raw?.summary || "", 700),
      receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim(),
      provider_reproof_status: String(entry.provider_reproof_status || entry.providerReproofStatus || raw?.provider_reproof_status || "").trim(),
      provider_reproof_reason: compactText(entry.provider_reproof_reason || entry.providerReproofReason || raw?.provider_reproof_reason || "", 500),
      reproof_candidate_id: String(entry.reproof_candidate_id || entry.reproofCandidateId || raw?.reproof_candidate_id || "").trim(),
      original_work_item_id: String(entry.original_work_item_id || entry.originalWorkItemId || raw?.original_work_item_id || "").trim(),
      original_timeline_binding_id: String(entry.original_timeline_binding_id || entry.originalTimelineBindingId || raw?.original_timeline_binding_id || "").trim(),
      request_patch_checksum: String(entry.request_patch_checksum || entry.requestPatchChecksum || raw?.request_patch_checksum || "").trim(),
      runner_request_id: String(entry.runner_request_id || entry.runnerRequestId || raw?.runner_request_id || "").trim(),
      task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
      memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
      execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
      first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    row.recommendation = providerReproofReceiptConsumptionRecommendation(row);
    return { ...row, row_id: providerReproofReceiptConsumptionRowId(row), strong_receipt_claim_only: status === "strong" };
  }).filter((row: any) => row.dispatch_source === "api_microcompact_native_apply_provider_reproof")
    .filter((row: any) => ["strong", "used", "verified", "ignored", "blocked"].includes(row.status));
}

export function mergeProviderReproofReceiptConsumptionRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const normalized = { ...row };
    const id = String(normalized.row_id || providerReproofReceiptConsumptionRowId(normalized));
    merged.set(id, { ...normalized, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  for (const row of incoming || []) {
    const id = String(row.row_id || providerReproofReceiptConsumptionRowId(row));
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  const currentIds = new Set(rows.map((row: any) => row.row_id));
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incoming.some((item: any) => String(item.row_id || "") === row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - currentIds.size),
  };
}

export function renderProviderReproofReceiptConsumptionBody(title: string, rows: any[] = [], options: any = {}) {
  const lines = [
    `# ${title}`,
    "",
    `Generated by CCM provider re-proof receipt consumption distillation at ${options.updatedAt || now()}.`,
    options.groupSessionId ? `Exact group-chat session: ${options.groupSessionId}.` : "Legacy unscoped provider re-proof feedback.",
    "Each row came from a child Agent receipt after a provider re-proof dispatch brief was injected into its WorkerContextPacket.",
    "A receipt strong claim is not native provider strong proof; future agents must still verify the native proof/request telemetry ledger before closing provider re-proof.",
    "",
    "## Receipt Consumption Rows",
  ];
  for (const row of rows) {
    const ids = [
      row.project ? `project=${row.project}` : "",
      row.task_id ? `task=${row.task_id}` : "",
      row.brief_id ? `brief=${row.brief_id}` : "",
      row.work_item_id ? `work_item=${row.work_item_id}` : "",
      row.request_patch_checksum ? `request=${row.request_patch_checksum}` : "",
      row.runner_request_id ? `runner=${row.runner_request_id}` : "",
    ].filter(Boolean).join("; ");
    lines.push(`- [${row.status}] ${ids || row.row_id}; recommendation=${row.recommendation}; provider_reproof_status=${row.provider_reproof_status || "unknown"}.`);
    if (row.reason) lines.push(`  Reason: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
    if (row.provider_reproof_reason) lines.push(`  Provider re-proof reason: ${compactText(row.provider_reproof_reason, 400).replace(/\n/g, " ")}`);
    if (row.strong_receipt_claim_only) lines.push("  Note: receipt strong is a consumption claim only; require native provider proof ledger before closure.");
  }
  return lines.join("\n").trim() + "\n";
}

export function providerReproofReceiptConsumptionArchive(rows: any[] = [], options: any = {}) {
  return require("./group-memory-distillation").providerReproofReceiptConsumptionArchive(rows, options);
}

export function distillProviderReproofReceiptConsumptionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillProviderReproofReceiptConsumptionToTypedMemory(groupId, input, options);
}

export function providerRankingProvenanceCompactRepairReceiptConsumptionInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.entries) ? input.entries : []),
    ...(Array.isArray(input.bindings) ? input.bindings : []),
  ];
  if (rows.length) return rows;
  const reportGroups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return reportGroups.flatMap((group: any) => Array.isArray(group.bindings) ? group.bindings : []);
}

export function providerRankingProvenanceStringList(...values: any[]) {
  return uniqueStrings(values.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  }).map((item: any) => String(item || "").trim()).filter(Boolean), 48);
}

export function providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row: any = {}) {
  return `provider-ranking-compact-repair-receipt:${checksum([
    row.groupId,
    row.groupSessionId,
    row.timeline_binding_id,
    row.brief_id,
    row.work_item_id,
    row.task_id,
    row.project,
    row.provider_switch_decision_receipt_id,
    row.provider_switch_decision_receipt_checksum,
    row.typed_memory_rel_paths,
    row.typed_memory_row_ids,
  ], 24)}`;
}

export function normalizeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
  return providerRankingProvenanceCompactRepairReceiptConsumptionInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.binding || raw || {};
    const source = String(entry.source || entry.dispatch_source || raw?.source || "").trim();
    const status = normalizeProviderReproofReceiptConsumptionStatus(
      entry.replay_repair_consumption_status
        || entry.replayRepairConsumptionStatus
        || entry.usage_state
        || entry.usageState
        || raw?.status
    );
    const relPaths = providerRankingProvenanceStringList(
      entry.provider_ranking_provenance_rel_paths,
      entry.providerRankingProvenanceRelPaths,
      entry.typed_memory_rel_paths,
      entry.typedMemoryRelPaths,
      raw?.provider_ranking_provenance_rel_paths,
      raw?.typed_memory_rel_paths,
    );
    const rowIds = providerRankingProvenanceStringList(
      entry.provider_ranking_provenance_row_ids,
      entry.providerRankingProvenanceRowIds,
      entry.typed_memory_row_ids,
      entry.typedMemoryRowIds,
      raw?.provider_ranking_provenance_row_ids,
      raw?.typed_memory_row_ids,
    );
    const preserved = entry.provider_ranking_provenance_preserved === true
      || entry.providerRankingProvenancePreserved === true
      || raw?.provider_ranking_provenance_preserved === true
      || raw?.providerRankingProvenancePreserved === true;
    const verified = entry.provider_ranking_provenance_receipt_consumption_verified === true
      || entry.providerRankingProvenanceReceiptConsumptionVerified === true
      || raw?.provider_ranking_provenance_receipt_consumption_verified === true;
    const repairStatus = String(entry.provider_ranking_provenance_repair_status || entry.repairStatus || entry.repair_status || raw?.provider_ranking_provenance_repair_status || "").trim().toLowerCase();
    const repairGapType = String(entry.provider_ranking_provenance_repair_gap_type || entry.repairGapType || entry.repair_gap_type || raw?.provider_ranking_provenance_repair_gap_type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const row = {
      schema: "ccm-provider-ranking-provenance-compact-repair-receipt-consumption-distilled-row-v1",
      version: GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
      groupId: String(fallbackGroupId || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
      groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
      timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || "").trim(),
      brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || "").trim(),
      work_item_id: String(entry.work_item_id || entry.workItemId || raw?.work_item_id || "").trim(),
      task_id: String(entry.task_id || entry.taskId || raw?.task_id || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      dispatch_source: source,
      status,
      consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.replay_repair_consumption_source || raw?.consumption_source || "").trim(),
      consumption_state: String(entry.replay_repair_consumption_state || entry.replayRepairConsumptionState || raw?.replay_repair_consumption_state || raw?.usage_state || raw?.usageState || "").trim(),
      reason: compactText(entry.replay_repair_consumption_reason || entry.replayRepairConsumptionReason || raw?.reason || raw?.summary || "", 900),
      receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim().toLowerCase(),
      provider_switch_decision_receipt_id: String(entry.provider_switch_decision_receipt_id || entry.providerSwitchDecisionReceiptId || raw?.provider_switch_decision_receipt_id || "").trim(),
      provider_switch_decision_receipt_checksum: String(entry.provider_switch_decision_receipt_checksum || entry.providerSwitchDecisionReceiptChecksum || raw?.provider_switch_decision_receipt_checksum || "").trim(),
      typed_memory_rel_paths: relPaths,
      typed_memory_row_ids: rowIds,
      provider_ranking_provenance_preserved: preserved,
      provider_ranking_provenance_receipt_consumption_verified: verified,
      provider_ranking_provenance_repair_status: repairStatus,
      provider_ranking_provenance_repair_gap_type: repairGapType,
      worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || raw?.worker_context_packet_id || "").trim(),
      task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
      memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
      execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
      first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row) };
  }).filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.dispatch_source === "worker_context_provider_ranking_provenance_compact_repair")
    .filter((row: any) => row.status === "verified")
    .filter((row: any) => row.provider_ranking_provenance_receipt_consumption_verified === true)
    .filter((row: any) => row.provider_ranking_provenance_preserved === true)
    .filter((row: any) => row.provider_ranking_provenance_repair_status === "completed")
    .filter((row: any) => row.provider_ranking_provenance_repair_gap_type === "provider_ranking_provenance_compact")
    .filter((row: any) => row.provider_switch_decision_receipt_id && row.provider_switch_decision_receipt_checksum)
    .filter((row: any) => row.typed_memory_rel_paths.length > 0 && row.typed_memory_row_ids.length > 0);
}

export function mergeProviderRankingProvenanceCompactRepairReceiptConsumptionRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  const incomingIds = new Set<string>();
  for (const row of incoming || []) {
    const id = String(row.row_id || providerRankingProvenanceCompactRepairReceiptConsumptionRowId(row));
    incomingIds.add(id);
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 120)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  const currentIds = new Set(rows.map((row: any) => row.row_id));
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - currentIds.size),
  };
}

export function providerRankingProvenanceCompactRepairReceiptConsumptionArchive(rows: any[] = [], options: any = {}) {
  return require("./group-memory-distillation").providerRankingProvenanceCompactRepairReceiptConsumptionArchive(rows, options);
}

export function renderProviderRankingProvenanceCompactRepairReceiptConsumptionBody(archive: any = {}, options: any = {}) {
  const rows = Array.isArray(archive.rows) ? archive.rows : [];
  const lines = [
    "# Provider Ranking Provenance Compact Repair Receipt Memory",
    "",
    `Generated by CCM provider ranking provenance compact repair receipt distillation at ${options.updatedAt || now()}.`,
    archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped provider ranking repair feedback.",
    "Each row came from a verified replayRepairDispatchBriefUsage receipt after a provider ranking provenance compact repair brief was injected into a child Agent WorkerContextPacket.",
    "Stable rule: provider switch execution history is ranking evidence only, not authorization. These rows help future Agents recall how to preserve typed MEMORY.md provider ranking provenance through compact retry; they do not authorize provider switches.",
    "",
    "## Verified Repair Receipts",
  ];
  for (const row of rows.slice(-80).reverse()) {
    const ids = [
      row.project ? `project=${row.project}` : "",
      row.task_id ? `task=${row.task_id}` : "",
      row.brief_id ? `brief=${row.brief_id}` : "",
      row.work_item_id ? `work_item=${row.work_item_id}` : "",
      row.provider_switch_decision_receipt_id ? `providerReceipt=${row.provider_switch_decision_receipt_id}` : "",
      row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
    ].filter(Boolean).join("; ");
    lines.push(`- [verified] ${ids || row.row_id}; preserved=${row.provider_ranking_provenance_preserved === true}; repair=${row.provider_ranking_provenance_repair_gap_type || "provider_ranking_provenance_compact"}.`);
    if (row.typed_memory_rel_paths?.length) lines.push(`  Typed MEMORY.md relPaths: ${row.typed_memory_rel_paths.slice(0, 8).join(", ")}.`);
    if (row.typed_memory_row_ids?.length) lines.push(`  Typed MEMORY.md rowIds: ${row.typed_memory_row_ids.slice(0, 10).join(", ")}.`);
    if (row.provider_switch_decision_receipt_checksum) lines.push(`  Provider switch receipt checksum: ${row.provider_switch_decision_receipt_checksum}.`);
    if (row.reason) lines.push(`  Receipt reason: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
  }
  lines.push("");
  lines.push("## Dispatch Reminder");
  lines.push("- For future compact retries, keep provider ranking provenance compact-safe by preserving typed MEMORY.md rel paths, row ids, and the matching provider switch decision receipt checksum in the WorkerContextPacket and compact outcome ledger.");
  lines.push("- Never use this memory as provider-switch authority; require a fresh valid provider switch decision receipt for each explicit switch.");
  return lines.join("\n").trim() + "\n";
}

export function distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(groupId, input, options);
}

export function postCompactReinjectionRepairReceiptConsumptionInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.entries) ? input.entries : []),
    ...(Array.isArray(input.bindings) ? input.bindings : []),
  ];
  if (rows.length) return rows;
  const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return groups.flatMap((group: any) => [
    ...(Array.isArray(group.rows) ? group.rows : []),
    ...(Array.isArray(group.bindings) ? group.bindings : []),
  ].map((row: any) => ({
    ...row,
    groupId: row.groupId || row.group_id || group.groupId || group.group_id || "",
    groupSessionId: row.groupSessionId || row.group_session_id || group.groupSessionId || group.group_session_id || "",
  })));
}

export function normalizePostCompactReinjectionRepairReceiptUsageState(value: any) {
  const state = String(value || "").trim().toLowerCase();
  if (["used", "consumed", "applied"].includes(state)) return "used";
  if (["verified", "checked", "rechecked", "reviewed", "validated", "confirmed"].includes(state)) return "verified";
  if (["ignored", "skipped", "unused", "not_used", "not-used", "not used"].includes(state)) return "ignored";
  return "";
}

export function postCompactReinjectionRepairReceiptConsumptionRowId(row: any = {}) {
  return `post-compact-reinjection-repair-receipt:${checksum([
    row.groupId,
    row.groupSessionId,
    row.groupSessionId,
    row.timeline_binding_id,
    row.brief_id,
    row.work_item_id,
    row.reinjection_gate_id,
    row.post_compact_candidate_id,
    row.task_agent_session_id,
    row.native_session_id,
    row.completion_source,
    row.resolution_reason,
  ], 24)}`;
}

export function normalizePostCompactReinjectionRepairReceiptConsumptionRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
  return postCompactReinjectionRepairReceiptConsumptionInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.binding || raw || {};
    const workItem = raw?.work_item || raw?.workItem || {};
    const usageState = normalizePostCompactReinjectionRepairReceiptUsageState(
      entry.post_compact_reinjection_receipt_usage_state
        || entry.postCompactReinjectionReceiptUsageState
        || raw?.usage_state
        || raw?.usageState
    );
    const completionSource = String(
      raw?.completion_source
        || raw?.completionSource
        || workItem.completion_source
        || workItem.completionSource
        || entry.completion_source
        || entry.completionSource
        || ""
    ).trim();
    const resolutionReason = String(
      raw?.resolution_reason
        || raw?.resolutionReason
        || workItem.resolution_reason
        || workItem.resolutionReason
        || entry.resolution_reason
        || entry.resolutionReason
        || ""
    ).trim();
    const row = {
      schema: "ccm-post-compact-reinjection-repair-receipt-consumption-distilled-row-v1",
      version: GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION,
      groupId: String(fallbackGroupId || entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || "").trim(),
      groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || "").trim(),
      timeline_binding_id: String(entry.timeline_binding_id || entry.timelineBindingId || raw?.timeline_binding_id || "").trim(),
      brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || "").trim(),
      work_item_id: String(entry.work_item_id || entry.workItemId || workItem.work_item_id || workItem.id || raw?.work_item_id || "").trim(),
      task_id: String(entry.task_id || entry.taskId || raw?.task_id || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      dispatch_source: String(entry.source || entry.dispatch_source || raw?.source || "").trim(),
      component: String(entry.component || raw?.component || "").trim(),
      assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
      reinjection_gate_id: String(entry.reinjection_gate_id || entry.reinjectionGateId || raw?.reinjection_gate_id || workItem.reinjection_gate_id || "").trim(),
      post_compact_candidate_id: String(entry.post_compact_candidate_id || entry.postCompactCandidateId || raw?.post_compact_candidate_id || workItem.post_compact_candidate_id || "").trim(),
      post_compact_candidate_kind: String(entry.post_compact_candidate_kind || entry.postCompactCandidateKind || raw?.post_compact_candidate_kind || workItem.post_compact_candidate_kind || "").trim(),
      post_compact_candidate_value: compactText(entry.post_compact_candidate_value || entry.postCompactCandidateValue || raw?.post_compact_candidate_value || workItem.post_compact_candidate_value || "", 1200),
      post_compact_candidate_source_message_id: String(entry.post_compact_candidate_source_message_id || entry.postCompactCandidateSourceMessageId || raw?.post_compact_candidate_source_message_id || workItem.post_compact_candidate_source_message_id || "").trim(),
      usage_state: usageState,
      category: usageState === "ignored" ? "caution" : "restored",
      current_source_verified: entry.post_compact_reinjection_current_source_verified === true
        || entry.postCompactReinjectionCurrentSourceVerified === true
        || raw?.current_source_verified === true
        || raw?.currentSourceVerified === true,
      receipt_reason: compactText(entry.post_compact_reinjection_receipt_reason || entry.postCompactReinjectionReceiptReason || raw?.receipt_reason || raw?.reason || "", 900),
      memory_receipt_matched: entry.post_compact_reinjection_memory_receipt_matched === true
        || entry.postCompactReinjectionMemoryReceiptMatched === true
        || raw?.memory_receipt_matched === true,
      task_session_matched: entry.post_compact_reinjection_task_session_matched === true
        || entry.postCompactReinjectionTaskSessionMatched === true
        || raw?.task_session_matched === true,
      native_session_matched: entry.post_compact_reinjection_native_session_matched === true
        || entry.postCompactReinjectionNativeSessionMatched === true
        || raw?.native_session_matched === true,
      receipt_verified: entry.post_compact_reinjection_receipt_verified === true
        || entry.postCompactReinjectionReceiptVerified === true
        || raw?.receipt_verified === true,
      receipt_status: String(entry.receipt_status || entry.receiptStatus || raw?.receipt_status || "").trim().toLowerCase(),
      consumption_status: String(entry.replay_repair_consumption_status || entry.replayRepairConsumptionStatus || raw?.consumption_status || "").trim().toLowerCase(),
      consumption_source: String(entry.replay_repair_consumption_source || entry.replayRepairConsumptionSource || raw?.consumption_source || "").trim(),
      worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || raw?.worker_context_packet_id || "").trim(),
      worker_handoff_id: String(entry.worker_handoff_id || entry.workerHandoffId || raw?.worker_handoff_id || "").trim(),
      memory_context_snapshot_id: String(entry.memory_context_snapshot_id || entry.memoryContextSnapshotId || raw?.memory_context_snapshot_id || "").trim(),
      memory_context_snapshot_checksum: String(entry.memory_context_snapshot_checksum || entry.memoryContextSnapshotChecksum || raw?.memory_context_snapshot_checksum || "").trim(),
      task_agent_session_id: String(entry.task_agent_session_id || entry.taskAgentSessionId || raw?.task_agent_session_id || "").trim(),
      native_session_id: String(entry.native_session_id || entry.nativeSessionId || raw?.native_session_id || "").trim(),
      execution_id: String(entry.execution_id || entry.executionId || raw?.execution_id || "").trim(),
      event_types: uniqueStrings(Array.isArray(entry.event_types) ? entry.event_types : Array.isArray(raw?.event_types) ? raw.event_types : [], 24),
      completion_source: completionSource,
      resolution_reason: resolutionReason,
      completed_at: String(raw?.completed_at || raw?.completedAt || workItem.completedAt || workItem.completed_at || entry.completed_at || entry.updated_at || options.updatedAt || now()),
      first_seen_at: String(entry.first_seen_at || entry.firstSeenAt || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      reuse_policy: "historical_repair_evidence_requires_current_source_reverification",
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: postCompactReinjectionRepairReceiptConsumptionRowId(row) };
  }).filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.dispatch_source === "compact_boundary_replay_repair")
    .filter((row: any) => row.component === "post_compact_reinject")
    .filter((row: any) => ["used", "verified", "ignored"].includes(row.usage_state))
    .filter((row: any) => row.receipt_verified === true)
    .filter((row: any) => row.memory_receipt_matched === true)
    .filter((row: any) => row.task_session_matched === true && row.native_session_matched === true)
    .filter((row: any) => row.reinjection_gate_id && row.post_compact_candidate_id && row.post_compact_candidate_kind)
    .filter((row: any) => row.brief_id && row.work_item_id && row.task_agent_session_id && row.native_session_id)
    .filter((row: any) => row.usage_state === "ignored" ? !!row.receipt_reason : row.current_source_verified === true)
    .filter((row: any) => row.completion_source === "post_compact_reinjection_replay_repair_receipt_consumption")
    .filter((row: any) => row.resolution_reason === "post_compact_reinjection_repair_receipt_verified");
}

export function mergePostCompactReinjectionRepairReceiptConsumptionRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || postCompactReinjectionRepairReceiptConsumptionRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  const incomingIds = new Set<string>();
  for (const row of incoming || []) {
    const id = String(row.row_id || postCompactReinjectionRepairReceiptConsumptionRowId(row));
    incomingIds.add(id);
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  const currentIds = new Set(rows.map((row: any) => row.row_id));
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - currentIds.size),
  };
}

export function postCompactReinjectionRepairReceiptConsumptionArchive(rows: any[] = [], options: any = {}) {
  return require("./group-memory-distillation").postCompactReinjectionRepairReceiptConsumptionArchive(rows, options);
}

export function renderPostCompactReinjectionRepairReceiptConsumptionBody(title: string, rows: any[] = [], options: any = {}) {
  const lines = [
    `# ${title}`,
    "",
    `Generated by CCM post-compact reinjection repair receipt distillation at ${options.updatedAt || now()}.`,
    options.groupSessionId ? `Exact group-chat session: ${options.groupSessionId}.` : "Legacy unscoped post-compact reinjection feedback.",
    "Each row is a verified completion from the exact bound child Agent task/native session after the exact reinjection gate and candidate were classified with postCompactCandidateUsage plus matching memoryUsed or memoryIgnored evidence.",
    "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Future use must reverify the current source before treating the recovered candidate as fresh task context.",
    "",
    "## Verified Completion Rows",
  ];
  for (const row of rows.slice(-100).reverse()) {
    const ids = [
      row.project ? `project=${row.project}` : "",
      row.task_id ? `task=${row.task_id}` : "",
      row.work_item_id ? `work_item=${row.work_item_id}` : "",
      row.brief_id ? `brief=${row.brief_id}` : "",
      row.timeline_binding_id ? `timeline=${row.timeline_binding_id}` : "",
    ].filter(Boolean).join("; ");
    lines.push(`- [${row.usage_state}] ${ids || row.row_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
    lines.push(`  Candidate: gate=${row.reinjection_gate_id}; id=${row.post_compact_candidate_id}; kind=${row.post_compact_candidate_kind}; value=${row.post_compact_candidate_value || ""}; source_message=${row.post_compact_candidate_source_message_id || ""}.`);
    lines.push(`  Bound session: task_agent_session=${row.task_agent_session_id}; native_session=${row.native_session_id}; execution=${row.execution_id || ""}; packet=${row.worker_context_packet_id || ""}; handoff=${row.worker_handoff_id || ""}; snapshot=${row.memory_context_snapshot_id || ""}.`);
    lines.push(`  Receipt: currentSourceVerified=${row.current_source_verified === true}; memoryReceiptMatched=${row.memory_receipt_matched === true}; taskSessionMatched=${row.task_session_matched === true}; nativeSessionMatched=${row.native_session_matched === true}.`);
    if (row.receipt_reason) lines.push(`  Receipt reason: ${compactText(row.receipt_reason, 900).replace(/\n/g, " ")}`);
  }
  lines.push("");
  lines.push("## Reuse Rule");
  lines.push("- Recall this memory to avoid reopening an already-proven identical repair without evidence.");
  lines.push("- Before injecting the candidate into a future child Agent session, re-read or revalidate the current repository/source state and obtain a new usage receipt for that session.");
  return lines.join("\n").trim() + "\n";
}

export function distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(groupId, input, options);
}

export function postCompactReceiptMemoryUsageRepairCompletionInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.items) ? input.items : []),
    ...(Array.isArray(input.entries) ? input.entries : []),
  ];
  return rows.length ? rows : input && typeof input === "object" ? [input] : [];
}

export function postCompactReceiptMemoryUsageRepairCompletionRowId(row: any = {}) {
  return `post-compact-receipt-memory-usage-repair-completion:${checksum([
    row.groupId,
    row.groupSessionId,
    row.work_item_id,
    row.brief_id,
    row.timeline_binding_id,
    row.original_worker_context_packet_id,
    row.repair_task_agent_session_id,
    row.repair_native_session_id,
    row.required_doc_rel_paths,
    row.completion_source,
  ], 24)}`;
}

export function normalizePostCompactReceiptMemoryUsageRepairCompletionRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
  const requiredEvents = ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot", "child_agent_receipt"];
  return postCompactReceiptMemoryUsageRepairCompletionInputRows(input).map((raw: any, index: number) => {
    const item = raw?.work_item || raw?.workItem || raw?.item || raw || {};
    const entry = raw?.entry || raw?.binding || raw?.timeline_binding || item.replay_repair_timeline_binding || raw || {};
    const proof = raw?.proof || item.post_compact_receipt_memory_usage_repair_receipt || entry.post_compact_receipt_memory_usage_repair_receipt || {};
    const requiredDocRelPaths = uniqueStrings([
      ...(Array.isArray(proof.required_doc_rel_paths) ? proof.required_doc_rel_paths : []),
      ...(Array.isArray(proof.requiredDocRelPaths) ? proof.requiredDocRelPaths : []),
      ...(Array.isArray(entry.post_compact_receipt_memory_usage_repair_required_doc_rel_paths) ? entry.post_compact_receipt_memory_usage_repair_required_doc_rel_paths : []),
      ...(Array.isArray(item.post_compact_receipt_memory_required_doc_rel_paths) ? item.post_compact_receipt_memory_required_doc_rel_paths : []),
    ], 40);
    const coveredDocRelPaths = uniqueStrings([
      ...(Array.isArray(proof.covered_doc_rel_paths) ? proof.covered_doc_rel_paths : []),
      ...(Array.isArray(proof.coveredDocRelPaths) ? proof.coveredDocRelPaths : []),
      ...(Array.isArray(entry.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths) ? entry.post_compact_receipt_memory_usage_repair_covered_doc_rel_paths : []),
    ], 40);
    const rawCoverageRows = Array.isArray(proof.coverage_rows)
      ? proof.coverage_rows
      : Array.isArray(proof.coverageRows)
      ? proof.coverageRows
      : Array.isArray(entry.post_compact_receipt_memory_usage_repair_coverage_rows)
      ? entry.post_compact_receipt_memory_usage_repair_coverage_rows
      : [];
    const coverageRows = rawCoverageRows.map((coverage: any) => ({
      rel_path: String(coverage.rel_path || coverage.relPath || "").trim(),
      usage_state: String(coverage.usage_state || coverage.usageState || (coverage.ignoredCovered === true || coverage.ignored_covered === true ? "ignored" : coverage.usedCovered === true || coverage.used_covered === true ? "verified" : "missing")).trim().toLowerCase(),
      covered: coverage.covered === true,
      compliant: coverage.compliant === true,
      current_source_verified: coverage.current_source_verified === true || coverage.currentSourceVerified === true,
      ignored_reason_covered: coverage.ignored_reason_covered === true || coverage.ignoredReasonCovered === true,
      reason: compactText(coverage.reason || coverage.ignored_reason || coverage.ignoredReason || "", 700),
    })).filter((coverage: any) => coverage.rel_path);
    const eventTypes = uniqueStrings([
      ...(Array.isArray(entry.event_types) ? entry.event_types : []),
      ...(Array.isArray(proof.event_types) ? proof.event_types : []),
    ], 24);
    const originalTaskAgentSessionId = String(entry.original_task_agent_session_id || item.original_task_agent_session_id || proof.original_task_agent_session_id || proof.originalTaskAgentSessionId || "").trim();
    const originalNativeSessionId = String(entry.original_native_session_id || item.original_native_session_id || proof.original_native_session_id || proof.originalNativeSessionId || "").trim();
    const repairTaskAgentSessionId = String(proof.task_agent_session_id || proof.taskAgentSessionId || entry.task_agent_session_id || "").trim();
    const repairNativeSessionId = String(proof.native_session_id || proof.nativeSessionId || entry.native_session_id || "").trim();
    const completionSource = String(raw?.completion_source || item.completion_source || entry.completion_source || "").trim();
    const resolutionReason = String(raw?.resolution_reason || raw?.resolutionReason || item.resolutionReason || item.resolution_reason || entry.resolution_reason || "").trim();
    const row = {
      schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distilled-row-v1",
      version: GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
      groupId: String(fallbackGroupId || entry.groupId || entry.group_id || item.groupId || item.group_id || "").trim(),
      groupSessionId: String(fallbackGroupSessionId || entry.groupSessionId || entry.group_session_id || item.groupSessionId || item.group_session_id || "").trim(),
      source: String(entry.source || item.source || "").trim(),
      project: String(entry.project || item.target_project || item.project || "").trim(),
      task_id: String(entry.task_id || "").trim(),
      work_item_id: String(entry.work_item_id || item.work_item_id || item.id || proof.work_item_id || "").trim(),
      brief_id: String(entry.brief_id || proof.brief_id || "").trim(),
      timeline_binding_id: String(entry.timeline_binding_id || proof.timeline_binding_id || "").trim(),
      assignment_id: String(entry.assignment_id || item.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || item.dispatch_key || "").trim(),
      original_worker_context_packet_id: String(entry.original_worker_context_packet_id || item.original_worker_context_packet_id || proof.original_worker_context_packet_id || "").trim(),
      original_binding_id: String(entry.original_binding_id || item.original_binding_id || proof.original_binding_id || "").trim(),
      original_assignment_id: String(entry.original_assignment_id || item.original_assignment_id || proof.original_assignment_id || "").trim(),
      original_dispatch_key: String(entry.original_dispatch_key || item.original_dispatch_key || proof.original_dispatch_key || "").trim(),
      original_task_agent_session_id: originalTaskAgentSessionId,
      original_native_session_id: originalNativeSessionId,
      repair_task_agent_session_id: repairTaskAgentSessionId,
      repair_native_session_id: repairNativeSessionId,
      repair_execution_id: String(proof.execution_id || entry.execution_id || "").trim(),
      required_doc_rel_paths: requiredDocRelPaths,
      covered_doc_rel_paths: coveredDocRelPaths,
      coverage_rows: coverageRows,
      original_gap_codes: uniqueStrings([
        ...(Array.isArray(entry.post_compact_receipt_memory_gap_codes) ? entry.post_compact_receipt_memory_gap_codes : []),
        ...(Array.isArray(item.post_compact_receipt_memory_gap_codes) ? item.post_compact_receipt_memory_gap_codes : []),
      ], 24),
      all_docs_compliant: proof.all_docs_compliant === true || proof.allDocsCompliant === true || entry.post_compact_receipt_memory_usage_repair_all_docs_compliant === true,
      historical_boundary_covered: proof.historical_boundary_covered === true || proof.historicalBoundaryCovered === true || entry.post_compact_receipt_memory_usage_repair_historical_boundary_covered === true,
      task_session_matched: proof.task_session_matched === true || entry.post_compact_receipt_memory_usage_repair_task_session_matched === true,
      native_session_matched: proof.native_session_matched === true || entry.post_compact_receipt_memory_usage_repair_native_session_matched === true,
      receipt_verified: proof.verified === true || entry.post_compact_receipt_memory_usage_repair_verified === true,
      receipt_status: String(entry.receipt_status || "").trim().toLowerCase(),
      consumption_status: String(entry.replay_repair_consumption_status || "").trim().toLowerCase(),
      consumption_source: String(entry.replay_repair_consumption_source || "").trim(),
      event_types: eventTypes,
      completion_source: completionSource,
      resolution_reason: resolutionReason,
      completed_at: String(proof.completed_at || item.completedAt || item.completed_at || raw?.completed_at || options.updatedAt || now()),
      reuse_policy: "historical_corrected_receipt_evidence_requires_new_session_current_source_reverification",
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: postCompactReceiptMemoryUsageRepairCompletionRowId(row) };
  }).filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.source === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair")
    .filter((row: any) => row.completion_source === "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption")
    .filter((row: any) => row.resolution_reason === "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified")
    .filter((row: any) => row.receipt_verified === true && row.all_docs_compliant === true && row.historical_boundary_covered === true)
    .filter((row: any) => row.task_session_matched === true && row.native_session_matched === true)
    .filter((row: any) => row.work_item_id && row.brief_id && row.timeline_binding_id)
    .filter((row: any) => row.original_worker_context_packet_id && row.original_binding_id)
    .filter((row: any) => row.repair_task_agent_session_id && row.repair_native_session_id)
    .filter((row: any) => row.repair_task_agent_session_id !== row.original_task_agent_session_id && row.repair_native_session_id !== row.original_native_session_id)
    .filter((row: any) => row.required_doc_rel_paths.length > 0 && row.required_doc_rel_paths.every((relPath: string) => row.covered_doc_rel_paths.includes(relPath)))
    .filter((row: any) => row.required_doc_rel_paths.every((relPath: string) => row.coverage_rows.some((coverage: any) => coverage.rel_path === relPath && coverage.covered === true && coverage.compliant === true)))
    .filter((row: any) => requiredEvents.every(eventType => row.event_types.includes(eventType)));
}

export function mergePostCompactReceiptMemoryUsageRepairCompletionRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || postCompactReceiptMemoryUsageRepairCompletionRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  const incomingIds = new Set<string>();
  for (const row of incoming || []) {
    const id = String(row.row_id || postCompactReceiptMemoryUsageRepairCompletionRowId(row));
    incomingIds.add(id);
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.completed_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - rows.length),
  };
}

export function postCompactReceiptMemoryUsageRepairCompletionArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  return {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-distillation-v1",
    version: GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION,
    archived_count: rows.length,
    verified_count: rows.filter((row: any) => row.receipt_verified === true).length,
    original_session_count: uniqueStrings(rows.flatMap((row: any) => [row.original_task_agent_session_id, row.original_native_session_id]).filter(Boolean), 480).length,
    repair_session_count: uniqueStrings(rows.flatMap((row: any) => [row.repair_task_agent_session_id, row.repair_native_session_id]).filter(Boolean), 480).length,
    required_doc_count: uniqueStrings(rows.flatMap((row: any) => row.required_doc_rel_paths || []), 240).length,
    rows,
    updatedAt,
  };
}

export function renderPostCompactReceiptMemoryUsageRepairCompletionBody(archive: any = {}, options: any = {}) {
  const rows = Array.isArray(archive.rows) ? archive.rows : [];
  const lines = [
    "# Post-Compact Receipt Memory Usage Repair Completions",
    "",
    `Generated by CCM corrected-receipt completion distillation at ${options.updatedAt || now()}.`,
    archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped corrected-receipt completion feedback.",
    "Each row proves that a child Agent receipt-memory usage gap was corrected in a newly bound repair task/native session after the complete dispatch timeline was observed.",
    "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Every future child Agent session must independently classify recalled memory in memoryUsed or memoryIgnored and reverify the current source before used/verified memory is accepted.",
    "Historical task/native session ids are evidence only and never authorize a future session.",
    "",
    "## Verified Corrected-Receipt Rows",
  ];
  for (const row of rows.slice(-100).reverse()) {
    lines.push(`- [verified] work_item=${row.work_item_id}; brief=${row.brief_id}; timeline=${row.timeline_binding_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
    lines.push(`  Original evidence: packet=${row.original_worker_context_packet_id}; binding=${row.original_binding_id}; assignment=${row.original_assignment_id || ""}; dispatch=${row.original_dispatch_key || ""}; task_agent_session=${row.original_task_agent_session_id || ""}; native_session=${row.original_native_session_id || ""}.`);
    lines.push(`  Corrected receipt session: task_agent_session=${row.repair_task_agent_session_id}; native_session=${row.repair_native_session_id}; execution=${row.repair_execution_id || ""}; allDocsCompliant=${row.all_docs_compliant === true}; historicalBoundaryCovered=${row.historical_boundary_covered === true}.`);
    for (const coverage of row.coverage_rows || []) {
      lines.push(`  Memory doc: ${coverage.rel_path}; usageState=${coverage.usage_state}; currentSourceVerified=${coverage.current_source_verified === true}; ignoredReasonCovered=${coverage.ignored_reason_covered === true}; compliant=${coverage.compliant === true}${coverage.reason ? `; reason=${compactText(coverage.reason, 500).replace(/\n/g, " ")}` : ""}.`);
    }
    if (row.original_gap_codes?.length) lines.push(`  Original gaps: ${row.original_gap_codes.join(", ")}.`);
  }
  lines.push("");
  lines.push("## Reuse Rule");
  lines.push("- Use this memory to avoid reopening an identical corrected-receipt repair when the exact completion proof still applies.");
  lines.push("- Do not reuse the historical repair session as current authority; bind any future use to the new task/native session and produce a new memory usage receipt.");
  return lines.join("\n").trim() + "\n";
}

export function distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(groupId, input, options);
}

export function distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, input, options);
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId: string) {
  return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId);
}

export function conflictResolutionMaintenanceNotificationReceiptChecksum(receipt: any = {}) {
  return checksum({
    receipt_id: receipt.receipt_id || "",
    receipt_kind: receipt.receipt_kind || "",
    group_id: receipt.group_id || "",
    audience: receipt.audience || "",
    notification_id: receipt.notification_id || "",
    state_fingerprint: receipt.state_fingerprint || "",
    current_manifest_checksum: receipt.current_manifest_checksum || "",
    previous_manifest_checksum: receipt.previous_manifest_checksum || "",
    quarantine_checksum: receipt.quarantine_checksum || "",
    actor_role: receipt.actor_role || "",
    actor_id: receipt.actor_id || "",
    session_id: receipt.session_id || "",
    reason: receipt.reason || "",
    issued_at: receipt.issued_at || "",
    expires_at: receipt.expires_at || "",
    advisory_visibility_only: receipt.advisory_visibility_only === true,
  }, 48);
}

export function readConflictResolutionMaintenanceNotificationReceiptLedger(groupId: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId);
  const ledger = readJson(file, {});
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-ledger-v1",
    version: 1,
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    entries: Array.isArray(ledger.entries) ? ledger.entries : [],
    file,
    updated_at: ledger.updated_at || "",
  };
}

export function writeConflictResolutionMaintenanceNotificationReceiptLedger(groupId: string, entries: any[], at: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(groupId);
  const value = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-ledger-v1",
    version: 1,
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    entries: entries.slice(-320),
    receipt_count: Math.min(entries.length, 320),
    updated_at: at,
  };
  writeJsonAtomic(file, value);
  return { ...value, file };
}

export function createConflictResolutionMaintenanceNotificationReceipt(groupId: string, kind: "acknowledged" | "suppressed", input: any = {}) {
  const at = String(input.at || input.issuedAt || input.issued_at || now());
  const audience = String(input.audience || "").trim().toLowerCase();
  const notificationId = String(input.notificationId || input.notification_id || "").trim();
  const actorRole = String(input.actorRole || input.actor_role || audience).trim().toLowerCase();
  const actorId = String(input.actorId || input.actor_id || input.actor || "").trim();
  const sessionId = String(input.sessionId || input.session_id || "").trim();
  const reason = String(input.reason || "").trim();
  const requestedGroupId = String(input.groupId || input.group_id || groupId).trim();
  if (requestedGroupId !== groupId) throw new Error("maintenance notification receipt group mismatch");
  if (!new Set(["group-main-agent", "global-agent"]).has(audience)) throw new Error("maintenance notification receipt audience is invalid");
  if (actorRole !== audience) throw new Error("maintenance notification receipt actor must match audience");
  if (!notificationId) throw new Error("maintenance notification receipt requires notificationId");
  if (!actorId || !sessionId) throw new Error("maintenance notification receipt requires actorId and sessionId");
  if (kind === "suppressed" && !reason) throw new Error("maintenance notification suppression requires reason");
  const notificationLedger = readJson(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId), {});
  const notification = (Array.isArray(notificationLedger.entries) ? notificationLedger.entries : [])
    .find((entry: any) => String(entry.notification_id || "") === notificationId) || null;
  if (!notification) throw new Error("maintenance notification not found");
  if (String(notification.group_id || "") !== groupId) throw new Error("maintenance notification group mismatch");
  if (String(notification.audience || "") !== audience) throw new Error("maintenance notification audience mismatch");
  const state = conflictResolutionMaintenanceState(groupId, {
    at: notification.state_observed_at || notification.first_seen_at || at,
    gracePeriodMs: notification.grace_period_ms,
  });
  if (!state.revalidated) throw new Error("maintenance notification current archive state cannot be revalidated");
  if (String(notification.state_fingerprint || "") !== state.state_fingerprint) throw new Error("maintenance notification state is stale");
  const expiresInMs = Math.max(60_000, Math.min(30 * 24 * 60 * 60 * 1000, Number(input.expiresInMs || input.expires_in_ms || 7 * 24 * 60 * 60 * 1000)));
  const receipt: any = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-receipt-v1",
    version: 1,
    receipt_id: `conflict-resolution-maintenance-notification-${kind}:${checksum([groupId, audience, notificationId, state.state_fingerprint, actorId, sessionId, at], 24)}`,
    receipt_kind: kind,
    group_id: groupId,
    ...conflictResolutionMaintenanceScopeMetadata(groupId),
    audience,
    notification_id: notificationId,
    state_fingerprint: state.state_fingerprint,
    current_manifest_checksum: state.current_manifest_checksum,
    previous_manifest_checksum: state.previous_manifest_checksum,
    quarantine_checksum: state.quarantine_checksum,
    actor_role: actorRole,
    actor_id: actorId,
    session_id: sessionId,
    reason: reason || "notification acknowledged",
    issued_at: at,
    expires_at: new Date(Date.parse(at) + expiresInMs).toISOString(),
    advisory_visibility_only: true,
    destructive_action_authorized: false,
    should_create_real_task: false,
    cross_group_authorization_allowed: false,
  };
  receipt.receipt_checksum = conflictResolutionMaintenanceNotificationReceiptChecksum(receipt);
  const ledger = readConflictResolutionMaintenanceNotificationReceiptLedger(groupId);
  writeConflictResolutionMaintenanceNotificationReceiptLedger(groupId, [
    ...ledger.entries.filter((entry: any) => entry.receipt_id !== receipt.receipt_id),
    receipt,
  ], at);
  return receipt;
}

export function inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId: string, options: any = {}) {
  return require("./group-memory-maintenance").inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts(groupId, options);
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId: string) {
  return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
}

export function conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptChecksum(receipt: any = {}) {
  return checksum({
    receipt_id: receipt.receipt_id || "",
    group_id: receipt.group_id || "",
    actor_role: receipt.actor_role || "",
    actor_id: receipt.actor_id || "",
    reason: receipt.reason || "",
    quarantine_checksum: receipt.quarantine_checksum || "",
    current_ledger_checksum: receipt.current_ledger_checksum || "",
    previous_ledger_checksum: receipt.previous_ledger_checksum || "",
    candidates: (receipt.candidates || []).map((candidate: any) => ({
      quarantine_id: candidate.quarantine_id || "",
      target_path: candidate.target_path || "",
      target_kind: candidate.target_kind || "",
      target_content_checksum: candidate.target_content_checksum || "",
    })),
    issued_at: receipt.issued_at || "",
    expires_at: receipt.expires_at || "",
    single_use: receipt.single_use === true,
  }, 48);
}

export function conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum(value: any = {}) {
  return checksum({
    group_id: value.group_id || "",
    revision: Number(value.revision || 0),
    previous_ledger_checksum: value.previous_ledger_checksum || "",
    entries: (value.entries || []).map((entry: any) => ({
      receipt_id: entry.receipt_id || "",
      receipt_checksum: entry.receipt_checksum || "",
      consumed: entry.consumed === true,
      consumed_at: entry.consumed_at || "",
      revoked: entry.revoked === true,
      revoked_at: entry.revoked_at || "",
      execution_id: entry.execution_id || "",
      execution_checksum: entry.execution_checksum || "",
      execution_fencing_token: Number(entry.execution_fencing_token || 0),
    })),
  }, 48);
}

export function readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId: string) {
  const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
  const ledger = readJson(file, {});
  const revision = Number(ledger.revision || 0);
  const ledgerChecksum = String(ledger.ledger_checksum || "");
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-ledger-v1",
    version: 1,
    group_id: groupId,
    entries: Array.isArray(ledger.entries) ? ledger.entries : [],
    revision,
    previous_ledger_checksum: String(ledger.previous_ledger_checksum || ""),
    ledger_checksum: ledgerChecksum,
    ledger_checksum_valid: (!ledgerChecksum && revision === 0) || (!!ledgerChecksum && ledgerChecksum === conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum(ledger)),
    file,
  };
}

export function writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId: string, entries: any[], at: string, options: any = {}) {
  return withCleanupGroupLedgerLock(groupId, at, options, groupLedgerLockHandle => {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupId);
    const current = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    if (!current.ledger_checksum_valid) throw new Error("cleanup_receipt_ledger_checksum_invalid");
    if (options.expectedRevision !== undefined && Number(options.expectedRevision) !== Number(current.revision || 0)) throw new Error("cleanup_receipt_ledger_revision_conflict");
    if (options.expectedLedgerChecksum !== undefined && String(options.expectedLedgerChecksum || "") !== String(current.ledger_checksum || "")) throw new Error("cleanup_receipt_ledger_revision_conflict");
    const open = entries.filter((entry: any) => entry.consumed !== true && entry.revoked !== true);
    const terminal = entries.filter((entry: any) => entry.consumed === true || entry.revoked === true).slice(-160);
    const value: any = {
      schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-receipt-ledger-v1",
      version: 1,
      group_id: groupId,
      revision: Number(current.revision || 0) + 1,
      previous_ledger_checksum: current.ledger_checksum || "",
      entries: [...open, ...terminal],
      open_receipt_count: open.length,
      consumed_receipt_count: terminal.filter((entry: any) => entry.consumed === true).length,
      updated_at: at,
    };
    value.ledger_checksum = conflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedgerChecksum(value);
    if (!cleanupGroupLedgerLockHeld(groupId, groupLedgerLockHandle)) throw new Error("cleanup_group_ledger_lock_lost");
    writeJsonAtomic(file, value);
    return { ...value, file };
  });
}

export function mutateConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId: string, at: string, mutate: (entries: any[], ledger: any) => any[], options: any = {}) {
  return withCleanupGroupLedgerLock(groupId, at, options, groupLedgerLockHandle => {
    const current = readConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId);
    if (!current.ledger_checksum_valid) throw new Error("cleanup_receipt_ledger_checksum_invalid");
    const entries = mutate([...current.entries], current);
    return writeConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptLedger(groupId, entries, at, {
      ...options,
      groupLedgerLockHandle,
      expectedRevision: current.revision,
      expectedLedgerChecksum: current.ledger_checksum,
    });
  });
}

export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId: string) {
  return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceiptFile(groupId);
}

export function cleanupCommitRepairResolutionReceiptChecksum(receipt: any = {}) {
  return checksum({
    receipt_id: receipt.receipt_id || "", group_id: receipt.group_id || "", work_item_id: receipt.work_item_id || "", transaction_id: receipt.transaction_id || "",
    work_item_checksum: receipt.work_item_checksum || "", quarantine_evidence_checksum: receipt.quarantine_evidence_checksum || "", resolution_action: receipt.resolution_action || "",
    actor_role: receipt.actor_role || "", actor_id: receipt.actor_id || "", reason: receipt.reason || "", issued_at: receipt.issued_at || "", expires_at: receipt.expires_at || "", single_use: receipt.single_use === true,
  }, 48);
}

export function cleanupCommitRepairResolutionReceiptStateChecksum(receipt: any = {}) {
  return checksum({
    receipt_checksum: receipt.receipt_checksum || "",
    consumed: receipt.consumed === true,
    consumed_at: receipt.consumed_at || "",
  }, 48);
}

export function writeCleanupCommitRepairResolutionReceipts(groupId: string, entries: any[], at: string) {
  return require("./group-memory-maintenance").writeCleanupCommitRepairResolutionReceipts(groupId, entries, at);
}

export function cleanupCommitRepairResolutionReceiptLedgerValid(ledger: any, groupId: string) {
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  return String(ledger?.group_id || "") === groupId
    && entries.every((entry: any) => entry.receipt_checksum === cleanupCommitRepairResolutionReceiptChecksum(entry)
      && entry.receipt_state_checksum === cleanupCommitRepairResolutionReceiptStateChecksum(entry))
    && ledger?.ledger_checksum === checksum(entries.map((entry: any) => entry.receipt_state_checksum || ""), 48);
}

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input);
}

export function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionReceipt(groupId, input);
}

export function revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input);
}

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input);
}

export function executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, input);
}

export function conflictResolutionGcApprovalReceiptChecksum(receipt: any = {}) {
  return checksum({
    receipt_id: receipt.receipt_id || "",
    group_id: receipt.group_id || "",
    approved: receipt.approved === true,
    allow_delete: receipt.allow_delete === true,
    actor_role: receipt.actor_role || "",
    actor_id: receipt.actor_id || "",
    reason: receipt.reason || "",
    current_manifest_checksum: receipt.current_manifest_checksum || "",
    previous_manifest_checksum: receipt.previous_manifest_checksum || "",
    quarantine_checksum: receipt.quarantine_checksum || "",
    candidates: (receipt.candidates || []).map((candidate: any) => ({
      rel_path: candidate.rel_path || "",
      content_checksum: candidate.content_checksum || "",
      row_ids_checksum: candidate.row_ids_checksum || "",
    })),
    issued_at: receipt.issued_at || "",
    expires_at: receipt.expires_at || "",
    single_use: receipt.single_use === true,
  }, 48);
}

export function createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input);
}

export function executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId: string, input: any = {}) {
  return require("./group-memory-maintenance").executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupId, input);
}

export function distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, input, options);
}

export function providerRankingMemoryUsageReceiptRepairInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.items) ? input.items : []),
    ...(Array.isArray(input.candidates) ? input.candidates : []),
    ...(Array.isArray(input.briefs) ? input.briefs : []),
    ...(Array.isArray(input.gaps) ? input.gaps : []),
  ];
  if (rows.length) return rows;
  const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return groups.flatMap((group: any) => [
    ...(Array.isArray(group.items) ? group.items : []),
    ...(Array.isArray(group.candidates) ? group.candidates : []),
    ...(Array.isArray(group.briefs) ? group.briefs : []),
    ...(Array.isArray(group.gaps) ? group.gaps : []),
  ].map((row: any) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}

export function providerRankingMemoryUsageReceiptRepairRowId(row: any = {}) {
  return `provider-ranking-memory-usage-receipt-repair:${checksum([
    row.groupId,
    row.work_item_id,
    row.brief_id,
    row.worker_context_packet_id,
    row.binding_id,
    row.project,
    row.doc_rel_paths,
    row.gap_signature,
  ], 24)}`;
}

export function normalizeProviderRankingMemoryUsageReceiptRepairRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  const forcedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
  return providerRankingMemoryUsageReceiptRepairInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.item || raw?.candidate || raw?.brief || raw || {};
    const source = String(entry.source || raw?.source || "").trim();
    const docRelPaths = providerRankingProvenanceStringList(
      entry.provider_ranking_provenance_rel_paths,
      entry.providerRankingProvenanceRelPaths,
      entry.provider_ranking_compact_repair_receipt_memory_usage_doc_rel_path,
      entry.providerRankingCompactRepairReceiptMemoryUsageDocRelPath,
      entry.docRelPath,
      entry.doc_rel_path,
      raw?.provider_ranking_provenance_rel_paths,
      raw?.docRelPath,
      raw?.doc_rel_path,
    );
    const gapCodes = providerRankingProvenanceStringList(
      entry.provider_ranking_provenance_gap_codes,
      entry.providerRankingProvenanceGapCodes,
      Array.isArray(entry.gaps) ? entry.gaps.map((gap: any) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : [],
      Array.isArray(raw?.gaps) ? raw.gaps.map((gap: any) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || JSON.stringify(gap)) : [],
    );
    const text = [
      entry.reason,
      entry.source_reason,
      entry.description,
      entry.instruction,
      entry.expected,
      entry.prompt_patch,
      entry.promptPatch,
      entry.worker_task,
      entry.workerTask,
      raw?.reason,
    ].filter(Boolean).join("\n");
    const row = {
      schema: "ccm-provider-ranking-memory-usage-receipt-repair-distilled-row-v1",
      version: GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
      groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
      groupSessionId: String(entry.groupSessionId || entry.group_session_id || raw?.groupSessionId || raw?.group_session_id || forcedGroupSessionId || "").trim(),
      work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
      brief_id: String(entry.brief_id || entry.briefId || raw?.brief_id || raw?.briefId || "").trim(),
      candidate_id: String(entry.candidate_id || entry.candidateId || raw?.candidate_id || raw?.candidateId || "").trim(),
      worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.worker_context_packet_id || "").trim(),
      binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
      assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      source,
      status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
      priority: String(entry.priority || raw?.priority || "").trim(),
      component: String(entry.component || raw?.component || "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_contract").trim(),
      doc_rel_paths: docRelPaths,
      gap_codes: gapCodes,
      gap_signature: gapCodes.join("|"),
      reason: compactText(entry.reason || entry.source_reason || entry.description || entry.instruction || raw?.reason || gapCodes.join("; ") || "provider ranking memory usage receipt repair required", 1000),
      expected: compactText(entry.expected || raw?.expected || "Corrected CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored cites provider-ranking-provenance-compact-repair-receipt-memory.md and preserves the authorization boundary.", 900),
      prompt_patch: compactText(entry.prompt_patch || entry.promptPatch || raw?.prompt_patch || "", 1500),
      worker_task: compactText(entry.worker_task || entry.workerTask || raw?.worker_task || "", 1800),
      has_memory_used_prompt: /memoryUsed/i.test(text),
      has_memory_ignored_prompt: /memoryIgnored/i.test(text),
      has_usage_state_prompt: /usageState|usage_state/i.test(text),
      has_authorization_boundary_prompt: /ranking evidence only, not authorization/i.test(text),
      has_fresh_receipt_prompt: /fresh valid provider switch decision receipt/i.test(text),
      first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: providerRankingMemoryUsageReceiptRepairRowId(row) };
  })
    .filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => !forcedGroupSessionId || row.groupSessionId === forcedGroupSessionId)
    .filter((row: any) => row.source === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair"
      || row.component === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_contract"
      || /provider ranking.*memory usage|memoryUsed|memoryIgnored|fresh valid provider switch decision receipt|ranking evidence only, not authorization/i.test(`${row.reason}\n${row.expected}\n${row.prompt_patch}\n${row.worker_task}`));
}

export function mergeProviderRankingMemoryUsageReceiptRepairRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || providerRankingMemoryUsageReceiptRepairRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  for (const row of incoming || []) {
    const id = String(row.row_id || providerRankingMemoryUsageReceiptRepairRowId(row));
    const previous = merged.get(id);
    merged.set(id, {
      ...(previous || {}),
      ...row,
      row_id: id,
      first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
      last_seen_at: updatedAt,
      seen_count: Number(previous?.seen_count || 0) + 1,
    });
  }
  const limit = Math.max(1, Math.min(260, Number(options.limit || options.maxRows || options.max_rows || 100)));
  const rows = [...merged.values()]
    .sort((a: any, b: any) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
    .slice(-limit);
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incoming.some((item: any) => String(item.row_id || "") === row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - rows.length),
  };
}

export function providerRankingMemoryUsageReceiptRepairArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const docRelPaths = uniqueStrings(rows.flatMap((row: any) => Array.isArray(row.doc_rel_paths) ? row.doc_rel_paths : []), 80);
  return {
    schema: "ccm-provider-ranking-memory-usage-receipt-repair-distillation-v1",
    version: GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION,
    archived_count: rows.length,
    open_count: rows.filter((row: any) => ["pending", "in_progress", "blocked", "warn", "fail", "ready"].includes(String(row.status || ""))).length,
    completed_count: rows.filter((row: any) => ["completed", "done", "ok"].includes(String(row.status || ""))).length,
    packet_bound_count: rows.filter((row: any) => row.worker_context_packet_id).length,
    doc_rel_path_count: docRelPaths.length,
    corrected_prompt_count: rows.filter((row: any) => row.has_memory_used_prompt === true && row.has_memory_ignored_prompt === true).length,
    usage_state_prompt_count: rows.filter((row: any) => row.has_usage_state_prompt === true).length,
    authorization_boundary_prompt_count: rows.filter((row: any) => row.has_authorization_boundary_prompt === true).length,
    fresh_receipt_prompt_count: rows.filter((row: any) => row.has_fresh_receipt_prompt === true).length,
    doc_rel_paths: docRelPaths,
    rows,
    updatedAt,
  };
}

export function renderProviderRankingMemoryUsageReceiptRepairBody(archive: any = {}, options: any = {}) {
  const rows = Array.isArray(archive.rows) ? archive.rows : [];
  const lines = [
    "# Provider Ranking Memory Usage Receipt Discipline",
    "",
    `Generated by CCM provider ranking memory usage receipt repair distillation at ${options.updatedAt || now()}.`,
    options.groupSessionId ? `Exact group-chat session: ${options.groupSessionId}.` : "Legacy unscoped provider ranking receipt-discipline feedback.",
    "This feedback memory records corrected-receipt repair briefs for child Agents that received provider ranking compact repair typed memory but failed to cite it in CCM_AGENT_RECEIPT.memoryUsed or memoryIgnored.",
    "Stable rule: if provider-ranking-provenance-compact-repair-receipt-memory.md is present in WorkerContextPacket, the final receipt must explicitly mention it in memoryUsed or memoryIgnored, declare usageState, and restate that provider ranking history is ranking evidence only, not authorization.",
    "Any explicit provider switch still requires a fresh valid provider switch decision receipt.",
    "",
    "## Corrected Receipt Rows",
  ];
  for (const row of rows.slice(-80).reverse()) {
    const ids = [
      row.project ? `project=${row.project}` : "",
      row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
      row.binding_id ? `binding=${row.binding_id}` : "",
      row.work_item_id ? `work_item=${row.work_item_id}` : "",
      row.brief_id ? `brief=${row.brief_id}` : "",
    ].filter(Boolean).join("; ");
    const docs = Array.isArray(row.doc_rel_paths) && row.doc_rel_paths.length ? row.doc_rel_paths.slice(0, 6).join(", ") : "provider-ranking-provenance-compact-repair-receipt-memory.md";
    lines.push(`- [${row.status || "pending"}] ${ids || row.row_id}; memory_doc=${docs}.`);
    lines.push("  Rule: corrected CCM_AGENT_RECEIPT must include memoryUsed or memoryIgnored for this doc, include usageState, include ranking evidence only, not authorization, and require a fresh valid provider switch decision receipt for explicit switches.");
    if (row.gap_codes?.length) lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
    if (row.reason) lines.push(`  Evidence: ${compactText(row.reason, 700).replace(/\n/g, " ")}`);
  }
  return lines.join("\n").trim() + "\n";
}

export function distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId: string, input: any = {}, options: any = {}) {
  return require("./group-memory-distillation").distillProviderRankingMemoryUsageReceiptRepairToTypedMemory(groupId, input, options);
}

export function providerDispatchOverrideFollowupInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.entries) ? input.entries : []),
    ...(Array.isArray(input.bindings) ? input.bindings : []),
    ...(Array.isArray(input.bindingLedger?.entries) ? input.bindingLedger.entries : []),
    ...(Array.isArray(input.binding_ledger?.entries) ? input.binding_ledger.entries : []),
  ];
  if (rows.length) return rows;
  const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return groups.flatMap((group: any) => [
    ...(Array.isArray(group.entries) ? group.entries : []),
    ...(Array.isArray(group.bindings) ? group.bindings : []),
    ...(Array.isArray(group.checks) ? group.checks : []),
  ].map((row: any) => ({ ...row, groupId: row.groupId || row.group_id || group.groupId || group.group_id || "" })));
}

export function providerDispatchOverrideFollowupDecision(entry: any = {}, raw: any = {}) {
  return entry.worker_context_provider_dispatch_decision
    || entry.workerContextProviderDispatchDecision
    || entry.provider_dispatch_decision
    || entry.providerDispatchDecision
    || raw.decision
    || {};
}

export function providerDispatchOverrideFollowupReceipt(entry: any = {}, decision: any = {}, raw: any = {}) {
  return entry.worker_context_provider_dispatch_override_receipt
    || entry.workerContextProviderDispatchOverrideReceipt
    || entry.provider_dispatch_override_receipt
    || entry.providerDispatchOverrideReceipt
    || decision.provider_dispatch_override_receipt
    || decision.providerDispatchOverrideReceipt
    || decision.override
    || raw.override
    || raw.overrideReceipt
    || raw.override_receipt
    || {};
}
