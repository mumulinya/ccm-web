// Extracted functional module. The original entry remains a compatibility facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import {
  GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT,
  GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD,
  GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER,
  arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict,
  buildWorkerContextPressureRecallUsageEntry,
  buildWorkerContextPressureRecallUsageStatsRowsFromEntries,
  buildWorkerContextPressureRecallUsageSummaryFromRows,
  checksum,
  compactText,
  distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory,
  filterWorkerContextPressureRecallUsageRows,
  getGroupTypedMemoryDir,
  getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile,
  listGroupTypedMemoryPressureRecallUsageLedgers,
  normalizePostCompactCompletionMemoryPreservationClosureTaskFamily,
  normalizePostCompactCompletionMemoryPreservationClosureUsageAging,
  normalizePostCompactCompletionMemoryPreservationClosureUsageState,
  normalizeWorkerContextPressureRecallUsageAging,
  normalizeWorkerContextPressureRecallUsageState,
  normalizeWorkerContextPressureRecallUsageStatsRow,
  now,
  postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance,
  postCompactCompletionMemoryPreservationClosureUsageRecommendation,
  readJson,
  roundPressureRecallUsageWeight,
  safeSegment,
  scorePostCompactCompletionMemoryPreservationClosureEvidence,
  tokens,
  typedMemorySessionScopeIdentity,
  uniqueStrings,
  workerContextPressureRecallStatsKey,
  workerContextPressureRecallUsageAgeDays,
  workerContextPressureRecallUsageDecayWeight,
  workerContextPressureRecallUsageRecommendation,
  writeGroupTypedMemoryPressureRecallUsageLedger,
  writeJsonAtomic,
} from "./group-memory-index";

export function readGroupTypedMemoryPressureRecallUsageLedger(groupId: string) {
  const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return {
      ...parsed,
      file,
      stats: parsed?.stats && typeof parsed.stats === "object" ? parsed.stats : {},
      entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
      totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
    };
  } catch {
    return {
      schema: "ccm-group-typed-memory-pressure-recall-usage-ledger-v1",
      version: 1,
      groupId,
      file,
      stats: {},
      entries: [],
      totals: { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
      updatedAt: "",
    };
  }
}

export function getGroupPressureRecallUsageRepairWorkItemsFile(groupId: string) {
  return path.join(GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${safeSegment(groupId)}.json`);
}

export function recordGroupTypedMemoryPressureRecallUsageLedger(groupId: string, input: any = {}) {
  groupId = String(groupId || "").trim();
  if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true) return null;
  const rows = Array.isArray(input.rows)
    ? input.rows
    : Array.isArray(input.pressureRecallUsageRows || input.pressure_recall_usage_rows)
      ? (input.pressureRecallUsageRows || input.pressure_recall_usage_rows)
      : [];
  const entries = rows
    .map((row: any) => buildWorkerContextPressureRecallUsageEntry(groupId, input, row))
    .filter(Boolean);
  const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
  if (!entries.length) {
    const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
    return {
      schema: "ccm-group-typed-memory-pressure-recall-usage-record-v1",
      groupId,
      file,
      skipped: true,
      reason: "no_pressure_recall_usage_rows",
      recorded_count: 0,
      totals: ledger.totals || {},
    };
  }
  const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
  const seen = new Set((ledger.entries || []).map((entry: any) => entry.entry_id));
  const newEntries = entries.filter((entry: any) => !seen.has(entry.entry_id));
  const stats = ledger.stats || {};
  for (const entry of newEntries) {
    const key = workerContextPressureRecallStatsKey(entry, entry.target_project);
    const current = stats[key] || {
      rel_path: entry.rel_path,
      name: entry.name,
      type: entry.type,
      source: entry.source,
      target_project: entry.target_project,
      kinds: entry.kinds || [],
      used_count: 0,
      ignored_count: 0,
      verified_count: 0,
      mentioned_count: 0,
      total_count: 0,
      agents: [],
      task_ids: [],
      packet_ids: [],
      provenance_statuses: [],
      repair_work_item_ids: [],
      repair_statuses: [],
      repair_gap_types: [],
      first_seen_at: entry.generated_at,
    };
    current.rel_path = current.rel_path || entry.rel_path;
    current.name = current.name || entry.name;
    current.type = current.type || entry.type;
    current.source = current.source || entry.source;
    current.target_project = current.target_project || entry.target_project;
    current.kinds = uniqueStrings([...(Array.isArray(current.kinds) ? current.kinds : []), ...(entry.kinds || [])], 12);
    current[`${entry.usage_state}_count`] = Number(current[`${entry.usage_state}_count`] || 0) + 1;
    current.total_count = Number(current.total_count || 0) + 1;
    current.last_usage_state = entry.usage_state;
    current.last_agent = entry.agent;
    current.last_task_id = entry.task_id;
    current.last_worker_context_packet_id = entry.worker_context_packet_id;
    current.last_pressure_status = entry.pressure_status || current.last_pressure_status || "";
    current.last_provenance_status = entry.provenance_status || current.last_provenance_status || "";
    current.last_repair_status = entry.repair_status || current.last_repair_status || "";
    current.last_repair_work_item_id = entry.repair_work_item_id || current.last_repair_work_item_id || "";
    current.last_repair_gap_type = entry.repair_gap_type || current.last_repair_gap_type || "";
    current.current_source_verified_count = Number(current.current_source_verified_count || 0) + (entry.current_source_verified === true ? 1 : 0);
    current.last_seen_at = entry.generated_at;
    current.agents = uniqueStrings([...(Array.isArray(current.agents) ? current.agents : []), entry.agent].filter(Boolean), 12);
    current.task_ids = uniqueStrings([...(Array.isArray(current.task_ids) ? current.task_ids : []), entry.task_id].filter(Boolean), 12);
    current.packet_ids = uniqueStrings([...(Array.isArray(current.packet_ids) ? current.packet_ids : []), entry.worker_context_packet_id].filter(Boolean), 12);
    current.provenance_statuses = uniqueStrings([...(Array.isArray(current.provenance_statuses) ? current.provenance_statuses : []), entry.provenance_status].filter(Boolean), 12);
    current.repair_work_item_ids = uniqueStrings([...(Array.isArray(current.repair_work_item_ids) ? current.repair_work_item_ids : []), entry.repair_work_item_id].filter(Boolean), 12);
    current.repair_statuses = uniqueStrings([...(Array.isArray(current.repair_statuses) ? current.repair_statuses : []), entry.repair_status].filter(Boolean), 12);
    current.repair_gap_types = uniqueStrings([...(Array.isArray(current.repair_gap_types) ? current.repair_gap_types : []), entry.repair_gap_type].filter(Boolean), 12);
    current.recommendation = workerContextPressureRecallUsageRecommendation(current);
    stats[key] = current;
  }
  const allEntries = [...(ledger.entries || []), ...newEntries].slice(-260);
  const totals = allEntries.reduce((acc: any, entry: any) => {
    const state = normalizeWorkerContextPressureRecallUsageState(entry.usage_state);
    if (state) acc[state] = Number(acc[state] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 });
  const updatedAt = String(input.generatedAt || input.generated_at || now());
  writeGroupTypedMemoryPressureRecallUsageLedger(groupId, {
    stats,
    entries: allEntries,
    totals,
    updatedAt,
  });
  return {
    schema: "ccm-group-typed-memory-pressure-recall-usage-record-v1",
    groupId,
    file,
    recorded_count: newEntries.length,
    duplicate_count: entries.length - newEntries.length,
    totals,
    updatedAt,
  };
}

export function readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId: string, options: any = {}) {
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, options);
  const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const typedScopeId = groupSessionId ? `${sourceGroupId}--${groupSessionId}` : String(groupId || sourceGroupId).trim();
  const file = getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile(typedScopeId);
  const parsed = readJson(file, null);
  if (parsed?.schema === "ccm-post-compact-completion-memory-preservation-closure-usage-ledger-v1") {
    return {
      ...parsed,
      groupId: sourceGroupId,
      sourceGroupId,
      groupSessionId,
      typedScopeId,
      exactSession: !!groupSessionId,
      file,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : {},
      totals: parsed.totals && typeof parsed.totals === "object" ? parsed.totals : {},
    };
  }
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-usage-ledger-v1",
    version: 1,
    groupId: sourceGroupId,
    sourceGroupId,
    groupSessionId,
    typedScopeId,
    exactSession: !!groupSessionId,
    file,
    entries: [],
    stats: {},
    totals: { used: 0, verified: 0, ignored: 0, mentioned: 0, stale: 0, compliant: 0, noncompliant: 0, total: 0 },
    updatedAt: "",
  };
}

export function recordPostCompactCompletionMemoryPreservationClosureUsage(groupId: string, input: any = {}) {
  groupId = String(groupId || "").trim();
  const closureRelPath = "post-compact-completion-memory-preservation-repair-closures.md";
  if (!groupId || input.disabled === true || input.disableLedger === true || input.disable_ledger === true) return null;
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, input);
  const sourceGroupId = String(input.sourceGroupId || input.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const typedScopeId = groupSessionId ? `${sourceGroupId}--${groupSessionId}` : groupId;
  const generatedAt = String(input.generatedAt || input.generated_at || now());
  const rows = (Array.isArray(input.rows) ? input.rows : [])
    .map((raw: any) => {
      const relPath = String(raw.rel_path || raw.relPath || "").trim();
      const usageState = normalizePostCompactCompletionMemoryPreservationClosureUsageState(raw.usage_state || raw.usageState);
      if (relPath !== closureRelPath || !usageState) return null;
      const currentSourceVerified = raw.current_source_verified === true || raw.currentSourceVerified === true;
      const reason = compactText(raw.reason || "", 500);
      const semanticCompliance = usageState === "ignored" ? !!reason : ["used", "verified"].includes(usageState) && currentSourceVerified;
      const compliant = typeof raw.compliant === "boolean" ? raw.compliant : semanticCompliance;
      const taskText = compactText(raw.task_text || raw.taskText || raw.task || input.taskText || input.task_text || input.task || "", 900);
      const taskFamily = normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(
        taskText,
        raw.task_family_key || raw.taskFamilyKey || input.taskFamilyKey || input.task_family_key
      );
      const conflictResolutionRequested = raw.conflict_resolution === true || raw.conflictResolution === true;
      const conflictResolution = conflictResolutionRequested
        && compliant
        && !!String(raw.task_agent_session_id || raw.taskAgentSessionId || input.taskAgentSessionId || input.task_agent_session_id || "").trim()
        && !!String(raw.native_session_id || raw.nativeSessionId || input.nativeSessionId || input.native_session_id || "").trim();
      const entryCore = {
        group_id: sourceGroupId,
        source_group_id: sourceGroupId,
        group_session_id: groupSessionId,
        typed_scope_id: typedScopeId,
        target_project: String(raw.target_project || raw.targetProject || input.targetProject || input.target_project || "").trim(),
        agent: String(raw.agent || raw.agent_type || raw.agentType || input.agent || input.agentType || input.agent_type || "").trim(),
        task_id: String(raw.task_id || raw.taskId || input.taskId || input.task_id || "").trim(),
        task_text: taskText,
        task_family_key: taskFamily.key,
        task_family_tokens: taskFamily.tokens,
        execution_id: String(raw.execution_id || raw.executionId || input.executionId || input.execution_id || "").trim(),
        worker_context_packet_id: String(raw.worker_context_packet_id || raw.workerContextPacketId || input.workerContextPacketId || input.worker_context_packet_id || "").trim(),
        binding_id: String(raw.binding_id || raw.bindingId || input.bindingId || input.binding_id || "").trim(),
        task_agent_session_id: String(raw.task_agent_session_id || raw.taskAgentSessionId || input.taskAgentSessionId || input.task_agent_session_id || "").trim(),
        native_session_id: String(raw.native_session_id || raw.nativeSessionId || input.nativeSessionId || input.native_session_id || "").trim(),
        receipt_source: String(raw.receipt_source || raw.receiptSource || input.receiptSource || input.receipt_source || "").trim(),
        receipt_status: String(raw.receipt_status || raw.receiptStatus || input.receiptStatus || input.receipt_status || "").trim(),
        rel_path: relPath,
        usage_state: usageState,
        current_source_verified: currentSourceVerified,
        compliant,
        stale: ["used", "verified"].includes(usageState) && !currentSourceVerified,
        reason,
        repair_work_item_id: String(raw.repair_work_item_id || raw.repairWorkItemId || "").trim(),
        conflict_resolution: conflictResolution,
        conflict_resolution_state: conflictResolution ? usageState : "",
        conflict_parent_arbitration_state: String(raw.conflict_parent_arbitration_state || raw.conflictParentArbitrationState || "").trim(),
        conflict_parent_fingerprint: String(raw.conflict_parent_fingerprint || raw.conflictParentFingerprint || "").trim(),
        conflict_parent_ratio: Number(raw.conflict_parent_ratio || raw.conflictParentRatio || 0),
        conflict_parent_positive_weight: Number(raw.conflict_parent_positive_weight || raw.conflictParentPositiveWeight || 0),
        conflict_parent_ignored_weight: Number(raw.conflict_parent_ignored_weight || raw.conflictParentIgnoredWeight || 0),
        conflict_resolution_reversible: conflictResolution,
        generated_at: generatedAt,
      };
      return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-usage-entry-v1",
        entry_id: `pccmpu_${checksum([
          entryCore.group_id,
          entryCore.group_session_id,
          entryCore.typed_scope_id,
          entryCore.target_project,
          entryCore.task_id,
          entryCore.task_family_key,
          entryCore.execution_id,
          entryCore.worker_context_packet_id,
          entryCore.binding_id,
          entryCore.task_agent_session_id,
          entryCore.native_session_id,
          entryCore.rel_path,
          entryCore.usage_state,
          entryCore.current_source_verified,
          entryCore.compliant,
          entryCore.reason,
          entryCore.repair_work_item_id,
          entryCore.conflict_resolution,
          entryCore.conflict_parent_fingerprint,
        ], 20)}`,
        ...entryCore,
      };
    })
    .filter(Boolean);
  const ledger = readPostCompactCompletionMemoryPreservationClosureUsageLedger(typedScopeId, {
    sourceGroupId,
    groupSessionId,
  });
  if (!rows.length) return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-usage-record-v1",
    groupId: sourceGroupId,
    sourceGroupId,
    groupSessionId,
    typedScopeId,
    exactSession: !!groupSessionId,
    file: ledger.file,
    skipped: true,
    reason: "no_closure_usage_rows",
    recordedCount: 0,
    totals: ledger.totals || {},
  };
  const existingIds = new Set((ledger.entries || []).map((entry: any) => entry.entry_id));
  const newEntries = rows.filter((entry: any) => !existingIds.has(entry.entry_id));
  const stats = { ...(ledger.stats || {}) };
  for (const entry of newEntries) {
    const key = `${String(entry.target_project || "").toLowerCase()}|${entry.rel_path}`;
    const current: any = stats[key] || {
      target_project: entry.target_project,
      rel_path: entry.rel_path,
      used_count: 0,
      verified_count: 0,
      ignored_count: 0,
      mentioned_count: 0,
      stale_count: 0,
      compliant_count: 0,
      noncompliant_count: 0,
      total_count: 0,
      task_agent_session_ids: [],
      native_session_ids: [],
      packet_ids: [],
      first_seen_at: entry.generated_at,
    };
    current[`${entry.usage_state}_count`] = Number(current[`${entry.usage_state}_count`] || 0) + 1;
    current.stale_count = Number(current.stale_count || 0) + (entry.stale ? 1 : 0);
    current[entry.compliant ? "compliant_count" : "noncompliant_count"] = Number(current[entry.compliant ? "compliant_count" : "noncompliant_count"] || 0) + 1;
    current.total_count = Number(current.total_count || 0) + 1;
    current.last_usage_state = entry.usage_state;
    current.last_compliant = entry.compliant === true;
    current.active_receipt_repair_required = entry.compliant !== true;
    current.last_current_source_verified = entry.current_source_verified === true;
    current.last_reason = entry.reason;
    current.last_repair_work_item_id = entry.repair_work_item_id;
    current.last_seen_at = entry.generated_at;
    current.task_agent_session_ids = uniqueStrings([...(current.task_agent_session_ids || []), entry.task_agent_session_id].filter(Boolean), 24);
    current.native_session_ids = uniqueStrings([...(current.native_session_ids || []), entry.native_session_id].filter(Boolean), 24);
    current.packet_ids = uniqueStrings([...(current.packet_ids || []), entry.worker_context_packet_id].filter(Boolean), 24);
    current.recommendation = postCompactCompletionMemoryPreservationClosureUsageRecommendation(current, input);
    stats[key] = current;
  }
  const entries = [...(ledger.entries || []), ...newEntries].slice(-320);
  const totals = entries.reduce((acc: any, entry: any) => {
    acc[entry.usage_state] = Number(acc[entry.usage_state] || 0) + 1;
    acc.stale += entry.stale ? 1 : 0;
    acc[entry.compliant ? "compliant" : "noncompliant"] += 1;
    acc.total += 1;
    return acc;
  }, { used: 0, verified: 0, ignored: 0, mentioned: 0, stale: 0, compliant: 0, noncompliant: 0, total: 0 });
  writeJsonAtomic(ledger.file, {
    schema: "ccm-post-compact-completion-memory-preservation-closure-usage-ledger-v1",
    version: 1,
    groupId: sourceGroupId,
    sourceGroupId,
    groupSessionId,
    typedScopeId,
    exactSession: !!groupSessionId,
    entries,
    stats,
    totals,
    updatedAt: generatedAt,
  });
  const conflictResolutionRows = rows.filter((entry: any) => entry.conflict_resolution === true);
  let conflictResolutionDistillation: any = null;
  if (conflictResolutionRows.length) {
    try {
      conflictResolutionDistillation = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(typedScopeId, {
        rows: conflictResolutionRows,
      }, {
        sourceGroupId,
        groupSessionId,
        reason: "closure-feedback-conflict-current-session-resolution",
        updatedAt: generatedAt,
      });
    } catch (error: any) {
      conflictResolutionDistillation = {
        schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-distillation-error-v1",
        error: compactText(error?.message || error || "conflict resolution distillation failed", 500),
      };
    }
  }
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-usage-record-v1",
    groupId: sourceGroupId,
    sourceGroupId,
    groupSessionId,
    typedScopeId,
    exactSession: !!groupSessionId,
    file: ledger.file,
    recordedCount: newEntries.length,
    duplicateCount: rows.length - newEntries.length,
    totals,
    conflictResolutionDistillation,
    updatedAt: generatedAt,
  };
}

export function buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId: string, options: any = {}) {
  const scopeIdentity = typedMemorySessionScopeIdentity(groupId, options);
  const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
  const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
  const typedScopeId = groupSessionId ? `${sourceGroupId}--${groupSessionId}` : groupId;
  const ledger = readPostCompactCompletionMemoryPreservationClosureUsageLedger(typedScopeId, { sourceGroupId, groupSessionId });
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const closureRelPath = "post-compact-completion-memory-preservation-repair-closures.md";
  const taskText = compactText(options.task || options.taskText || options.task_text || options.taskQuery || options.task_query || "", 1200);
  const queryFamily = normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(
    taskText,
    options.taskFamilyKey || options.task_family_key
  );
  const aging = normalizePostCompactCompletionMemoryPreservationClosureUsageAging(options);
  const sourceEntries = (Array.isArray(ledger.entries) ? ledger.entries : []).filter((entry: any) => {
    const projectMatches = !targetProject || !entry.target_project || String(entry.target_project).toLowerCase() === targetProject;
    return projectMatches && entry.rel_path === closureRelPath;
  });
  const scoredEntries = sourceEntries.map((entry: any) => {
    const relevance = postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance(entry, queryFamily, options);
    const ageDays = workerContextPressureRecallUsageAgeDays(entry, aging);
    const decayWeight = workerContextPressureRecallUsageDecayWeight(ageDays, aging);
    const relevanceWeight = relevance.matched ? Math.max(0.75, Number(relevance.score || 0)) : 0;
    return {
      ...entry,
      task_family_relevance: relevance,
      age_days: roundPressureRecallUsageWeight(ageDays, 3),
      decay_weight: decayWeight,
      effective_weight: roundPressureRecallUsageWeight(decayWeight * relevanceWeight, 4),
    };
  });
  const relevantEntries = scoredEntries.filter((entry: any) => entry.task_family_relevance?.matched === true);
  const evidence = scorePostCompactCompletionMemoryPreservationClosureEvidence(relevantEntries, options);
  const independentEntries = evidence.independentEntries || [];
  const conflict = arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict(independentEntries, options);
  const resolutionEntries = independentEntries.filter((entry: any) => entry.conflict_resolution === true && entry.compliant === true);
  const latestResolution = [...resolutionEntries].sort((a: any, b: any) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0] || null;
  const resolutionState = String(latestResolution?.conflict_resolution_state || latestResolution?.usage_state || "");
  const resolutionAt = String(latestResolution?.generated_at || "");
  const laterOpposingEntries = latestResolution ? independentEntries.filter((entry: any) => {
    if (String(entry.generated_at || "").localeCompare(resolutionAt) <= 0 || entry.compliant !== true) return false;
    const state = String(entry.usage_state || "");
    return ["used", "verified"].includes(resolutionState) ? state === "ignored" : ["used", "verified"].includes(state);
  }) : [];
  const laterOpposingWeight = laterOpposingEntries.reduce((sum: number, entry: any) => sum + Number(entry.independent_effective_weight || 0), 0);
  const resolutionReopened = !!latestResolution && laterOpposingWeight >= Number(conflict.min_branch_weight || GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT);
  const resolutionActive = !!latestResolution && !resolutionReopened;
  const conflictResolution = {
    schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-resolution-v1",
    active: resolutionActive,
    reopened: resolutionReopened,
    state: latestResolution
      ? resolutionReopened
        ? "reopened_by_later_reliable_opposition"
        : ["used", "verified"].includes(resolutionState)
          ? "resolved_used_or_verified_reverify_future_session"
          : "resolved_ignored_reverify_future_session"
      : "unresolved",
    resolution_entry_id: latestResolution?.entry_id || "",
    resolution_usage_state: resolutionState,
    task_agent_session_id: latestResolution?.task_agent_session_id || "",
    native_session_id: latestResolution?.native_session_id || "",
    worker_context_packet_id: latestResolution?.worker_context_packet_id || "",
    current_source_verified: latestResolution?.current_source_verified === true,
    reason: latestResolution?.reason || "",
    parent_conflict_fingerprint: latestResolution?.conflict_parent_fingerprint || "",
    resolved_at: resolutionAt,
    later_opposing_entry_ids: uniqueStrings(laterOpposingEntries.map((entry: any) => entry.entry_id), 32),
    later_opposing_weight: roundPressureRecallUsageWeight(laterOpposingWeight, 4),
    reversible: true,
    historical_branches_preserved: true,
    historical_majority_authorization_allowed: false,
  };
  const effectiveConflict = {
    ...conflict,
    active: resolutionReopened ? true : conflict.active === true && !resolutionActive,
    historical_conflict_detected: conflict.active === true,
    resolution: conflictResolution,
    arbitration_state: resolutionActive ? conflictResolution.state : resolutionReopened ? "contradictory_reverify_current_session" : conflict.arbitration_state,
    current_session_verification_required: resolutionReopened ? true : conflict.active === true && !resolutionActive,
  };
  const latest = [...independentEntries].sort((a: any, b: any) => String(b.generated_at || "").localeCompare(String(a.generated_at || "")))[0] || null;
  const primary: any = independentEntries.reduce((acc: any, entry: any) => {
    const state = normalizePostCompactCompletionMemoryPreservationClosureUsageState(entry.usage_state);
    if (!state) return acc;
    acc[`${state}_count`] = Number(acc[`${state}_count`] || 0) + 1;
    acc[`weighted_${state}_count`] = Number(acc[`weighted_${state}_count`] || 0) + Number(entry.independent_effective_weight || 0);
    acc.total_count = Number(acc.total_count || 0) + 1;
    acc.weighted_total_count = Number(acc.weighted_total_count || 0) + Number(entry.independent_effective_weight || 0);
    acc.stale_count = Number(acc.stale_count || 0) + (Number(entry.age_days || 0) >= Number(aging.stale_after_days || 45) ? 1 : 0);
    acc.fresh_count = Number(acc.fresh_count || 0) + (Number(entry.age_days || 0) < Number(aging.stale_after_days || 45) ? 1 : 0);
    acc[entry.compliant === true ? "compliant_count" : "noncompliant_count"] = Number(acc[entry.compliant === true ? "compliant_count" : "noncompliant_count"] || 0) + 1;
    acc.task_family_keys = uniqueStrings([...(acc.task_family_keys || []), entry.task_family_key].filter(Boolean), 24);
    return acc;
  }, {
    target_project: String(options.targetProject || options.target_project || ""),
    rel_path: closureRelPath,
    used_count: 0,
    verified_count: 0,
    ignored_count: 0,
    mentioned_count: 0,
    weighted_used_count: 0,
    weighted_verified_count: 0,
    weighted_ignored_count: 0,
    weighted_mentioned_count: 0,
    total_count: 0,
    weighted_total_count: 0,
    stale_count: 0,
    fresh_count: 0,
    compliant_count: 0,
    noncompliant_count: 0,
    task_family_keys: [],
  });
  for (const state of ["used", "verified", "ignored", "mentioned"]) {
    primary[`weighted_${state}_count`] = roundPressureRecallUsageWeight(primary[`weighted_${state}_count`] || 0, 4);
  }
  primary.weighted_total_count = roundPressureRecallUsageWeight(primary.weighted_total_count || 0, 4);
  primary.last_usage_state = latest?.usage_state || "";
  primary.last_compliant = latest ? latest.compliant === true : null;
  primary.last_current_source_verified = latest?.current_source_verified === true;
  primary.last_feedback_age_days = Number(latest?.age_days || 0);
  primary.last_feedback_fresh = !!latest && Number(latest.age_days || 0) < Number(aging.stale_after_days || 45);
  primary.active_receipt_repair_required = !!latest && latest.compliant !== true && primary.last_feedback_fresh;
  primary.evidence_confidence = evidence.confidence;
  primary.evidence_confidence_threshold = evidence.confidenceThreshold;
  primary.independent_evidence_count = evidence.independentEvidenceCount;
  primary.independent_session_count = evidence.independentSessionCount;
  primary.independent_packet_count = evidence.independentPacketCount;
  primary.correlated_duplicate_count = evidence.correlatedDuplicateCount;
  primary.distinct_provider_count = evidence.distinctProviderCount;
  primary.distinct_receipt_source_count = evidence.distinctReceiptSourceCount;
  primary.feedback_conflict_active = effectiveConflict.active === true;
  primary.feedback_conflict_ratio = effectiveConflict.conflict_ratio;
  primary.conflict_resolution_active = conflictResolution.active === true;
  primary.conflict_resolution_usage_state = conflictResolution.resolution_usage_state;
  primary.recommendation = postCompactCompletionMemoryPreservationClosureUsageRecommendation(primary, options);
  const rows = primary.total_count > 0 ? [primary] : [];
  return {
    schema: "ccm-post-compact-completion-memory-preservation-closure-usage-summary-v1",
    version: 2,
    groupId: sourceGroupId,
    sourceGroupId,
    groupSessionId,
    typedScopeId,
    exactSession: !!groupSessionId,
    targetProject: String(options.targetProject || options.target_project || ""),
    file: ledger.file,
    entryCount: sourceEntries.length,
    rawMatchedEntryCount: relevantEntries.length,
    matchedEntryCount: independentEntries.length,
    unrelatedEntryCount: scoredEntries.length - relevantEntries.length,
    correlatedDuplicateCount: evidence.correlatedDuplicateCount,
    rowCount: rows.length,
    recommendation: primary.recommendation || "neutral_reverify_current_source",
    activeReceiptRepairRequired: primary.active_receipt_repair_required === true,
    usedCount: Number(primary.used_count || 0),
    verifiedCount: Number(primary.verified_count || 0),
    ignoredCount: Number(primary.ignored_count || 0),
    staleCount: Number(primary.stale_count || 0),
    compliantCount: Number(primary.compliant_count || 0),
    noncompliantCount: Number(primary.noncompliant_count || 0),
    weightedUsedCount: Number(primary.weighted_used_count || 0),
    weightedVerifiedCount: Number(primary.weighted_verified_count || 0),
    weightedIgnoredCount: Number(primary.weighted_ignored_count || 0),
    weightedTotalCount: Number(primary.weighted_total_count || 0),
    evidenceConfidence: Number(evidence.confidence || 0),
    evidenceConfidenceThreshold: Number(evidence.confidenceThreshold || 0),
    independentEvidenceCount: Number(evidence.independentEvidenceCount || 0),
    independentSessionCount: Number(evidence.independentSessionCount || 0),
    independentPacketCount: Number(evidence.independentPacketCount || 0),
    distinctProviderCount: Number(evidence.distinctProviderCount || 0),
    distinctReceiptSourceCount: Number(evidence.distinctReceiptSourceCount || 0),
    averageSourceReliability: Number(evidence.averageSourceReliability || 0),
    evidenceProviders: evidence.providers || [],
    evidenceReceiptSources: evidence.receiptSources || [],
    feedbackConflict: effectiveConflict,
    historicalFeedbackConflict: conflict,
    feedbackConflictResolution: conflictResolution,
    feedbackConflictActive: effectiveConflict.active === true,
    feedbackArbitrationState: effectiveConflict.arbitration_state,
    currentSessionConflictVerificationRequired: effectiveConflict.current_session_verification_required === true,
    historicalMajorityAuthorizationAllowed: false,
    taskFamily: queryFamily,
    taskFamilyRelevant: relevantEntries.length > 0,
    taskFamilyRelevanceThreshold: Number(options.taskFamilyRelevanceThreshold
      ?? options.task_family_relevance_threshold
      ?? GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD),
    aging,
    feedbackEntries: independentEntries.slice(-24),
    rawFeedbackEntries: scoredEntries.slice(-24),
    rows,
    immutableClosureHistoryPreserved: true,
    updatedAt: ledger.updatedAt || "",
  };
}

export function buildGroupTypedMemoryPressureRecallUsageSummary(groupId: string, options: any = {}) {
  groupId = String(groupId || "").trim();
  const ledger = readGroupTypedMemoryPressureRecallUsageLedger(groupId);
  const aging = normalizeWorkerContextPressureRecallUsageAging(options);
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const sourceRows = Array.isArray(ledger.entries) && ledger.entries.length
    ? buildWorkerContextPressureRecallUsageStatsRowsFromEntries(ledger.entries, aging)
    : Object.values(ledger.stats || {}).map((row: any) => normalizeWorkerContextPressureRecallUsageStatsRow(row, aging));
  const statsRows = filterWorkerContextPressureRecallUsageRows(sourceRows, options);
  return buildWorkerContextPressureRecallUsageSummaryFromRows(groupId, statsRows, {
    ...options,
    targetProject,
    aging,
    ledgerFile: ledger.file,
    recentEntries: (ledger.entries || [])
      .filter((entry: any) => !targetProject || String(entry.target_project || "").toLowerCase() === targetProject)
      .slice(-16),
    updatedAt: ledger.updatedAt || "",
  });
}

export function buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId: string, options: any = {}) {
  groupId = String(groupId || "").trim();
  const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
  const includeCurrent = options.includeCurrentGroup === true || options.include_current_group === true;
  const currentIds = new Set([groupId, safeSegment(groupId)].map(item => String(item || "").trim().toLowerCase()).filter(Boolean));
  const aging = normalizeWorkerContextPressureRecallUsageAging(options);
  const ledgers = listGroupTypedMemoryPressureRecallUsageLedgers({
    ...options,
    excludeGroupIds: includeCurrent ? options.excludeGroupIds || options.exclude_group_ids || [] : [
      ...(Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : []),
      ...Array.from(currentIds),
    ],
  });
  const entries: any[] = [];
  const sourceGroups: any[] = [];
  for (const item of ledgers) {
    try {
      const parsed = JSON.parse(fs.readFileSync(item.file, "utf-8"));
      const ledgerGroupId = String(parsed.groupId || parsed.group_id || item.groupId || "").trim();
      if (!includeCurrent && currentIds.has(ledgerGroupId.toLowerCase())) continue;
      const ledgerEntries = (Array.isArray(parsed.entries) ? parsed.entries : [])
        .filter((entry: any) => !targetProject || String(entry.target_project || entry.targetProject || "").trim().toLowerCase() === targetProject)
        .map((entry: any) => ({ ...entry, group_id: entry.group_id || entry.groupId || ledgerGroupId || item.groupId }));
      if (!ledgerEntries.length) continue;
      entries.push(...ledgerEntries);
      sourceGroups.push({
        groupId: ledgerGroupId || item.groupId,
        file: item.file,
        entry_count: ledgerEntries.length,
        updatedAt: parsed.updatedAt || parsed.updated_at || "",
      });
    } catch {}
  }
  const sourceRows = buildWorkerContextPressureRecallUsageStatsRowsFromEntries(entries, aging);
  const statsRows = filterWorkerContextPressureRecallUsageRows(sourceRows, options);
  const recentEntries = entries
    .sort((a: any, b: any) => String(b.generated_at || b.generatedAt || "").localeCompare(String(a.generated_at || a.generatedAt || "")))
    .slice(0, 16)
    .reverse();
  return {
    ...buildWorkerContextPressureRecallUsageSummaryFromRows(groupId, statsRows, {
      ...options,
      schema: "ccm-group-typed-memory-pressure-recall-usage-project-summary-v1",
      targetProject,
      aging,
      ledgerFile: "",
      recentEntries,
      updatedAt: sourceGroups.map((item: any) => item.updatedAt).filter(Boolean).sort().slice(-1)[0] || "",
    }),
    source: "cross_group_project_pressure_recall_usage",
    include_current_group: includeCurrent,
    source_group_count: sourceGroups.length,
    source_groups: sourceGroups.slice(0, 24),
    entry_count: entries.length,
  };
}

export function getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER);
}