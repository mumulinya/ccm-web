// Behavior-freeze split from typed-memory-recall.ts (part 2/3).
// Behavior-freeze module extracted mechanically from the former facade.

import * as crypto from "crypto";

import * as fs from "fs";

import * as os from "os";

import * as path from "path";

import { CCM_DIR } from "../../core/utils";

import { readJsonWithBackup, withFileLock, writeJsonAtomic as writeJsonAtomicWithBackup } from "../../core/atomic-json-file";

import { buildCrossGroupProviderDispatchReliabilitySignal, getGroupTypedMemoryDistillationLedgerFile, pressureProvenanceProviderDispatchOverrideFollowupArchive, pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive, providerDispatchReliabilityRound, providerSwitchExecutionArchive, readGroupTypedMemoryDistillationLedger, scoreProviderDispatchReliabilityRows, scoreProviderSwitchExecutionRows, summarizeProviderDispatchOverrideFollowupPolicyAttributions, summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions, summarizeProviderSwitchExecutionPolicyAttributions } from "./typed-memory-distillation-receipts";
import { buildGroupTypedMemoryIndex, scanGroupTypedMemoryDocuments, scanGroupTypedMemoryDocumentsRaw, upsertGroupTypedMemoryDocument } from "./typed-memory-index-build";
import { readGroupTypedMemoryRecallLedger, readGroupTypedMemoryStaleCandidateLedger, writeGroupTypedMemoryStaleCandidateLedger } from "./typed-memory-ledgers";
import { GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION, GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS, GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS, GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE, GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES, SEMANTIC_RECALL_CONCEPTS, checksum, compactText, firstFiniteNumber, isExactGroupTypedMemorySessionScope, normalizeMemoryType, now, safeSegment, tokens, typedMemoryDeliveryLeaseChecksum, typedMemoryStaleRejectionChecksum, typedMemoryStaleResolutionChecksum, uniqueStrings, writeJsonAtomic } from "./typed-memory-shared";

export function pressureMemoryProvenanceStringList(...values: any[]) {
  return uniqueStrings(values.flatMap(value => {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  }).map((item: any) => String(item || "").trim()).filter(Boolean), 24);
}

export function pressureMemoryProvenanceRowsFromRawRecovery(entry: any = {}) {
  const recovery = entry.raw_recovery || entry.rawRecovery || {};
  const docs = Array.isArray(recovery.requiredDocs || recovery.required_docs) ? (recovery.requiredDocs || recovery.required_docs) : [];
  return docs.map((doc: any) => ({
    rel_path: doc.rel_path || doc.relPath || "",
    name: doc.name || "",
    provenance_status: doc.provenance_status || doc.provenanceStatus || "",
    repair_work_item_id: doc.repair_work_item_id || doc.repairWorkItemId || "",
    repair_status: doc.repair_status || doc.repairStatus || "",
    repair_gap_type: doc.repair_gap_type || doc.repairGapType || "",
  }));
}

export function pressureProvenancePreDispatchComplianceInputRows(input: any = {}) {
  if (Array.isArray(input)) return input;
  const rows = [
    ...(Array.isArray(input.rows) ? input.rows : []),
    ...(Array.isArray(input.packets) ? input.packets : []),
    ...(Array.isArray(input.violations) ? input.violations : []),
    ...(Array.isArray(input.failures) ? input.failures : []),
    ...(Array.isArray(input.gaps) ? input.gaps : []),
  ];
  if (rows.length) return rows;
  const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
  return groups.flatMap((group: any) => [
    ...(Array.isArray(group.packets) ? group.packets : []),
    ...(Array.isArray(group.violations) ? group.violations : []),
    ...(Array.isArray(group.failures) ? group.failures : []),
    ...(Array.isArray(group.gaps) ? group.gaps : []),
  ].map((row: any) => ({ ...row, groupId: row.groupId || row.group_id || group.groupId || group.group_id || "" })));
}

export function pressureProvenancePreDispatchComplianceRowId(row: any = {}) {
  return `pressure-provenance-pre-dispatch-compliance:${checksum([
    row.groupId,
    row.packet_id,
    row.binding_id,
    row.project,
    row.agent_type,
    row.status,
    row.gap_signature,
    row.rel_paths,
    row.repair_work_item_ids,
  ], 24)}`;
}

export function normalizePressureProvenancePreDispatchComplianceRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  return pressureProvenancePreDispatchComplianceInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.packet || raw?.violation || raw || {};
    const gaps = [
      ...(Array.isArray(entry.gaps) ? entry.gaps : []),
      ...(Array.isArray(raw?.gaps) ? raw.gaps : []),
    ];
    const gapCodes = uniqueStrings(gaps.map((gap: any) => typeof gap === "string" ? gap : gap?.code || gap?.reason || gap?.type || gap?.severity || "").filter(Boolean), 24);
    const docs = [
      ...(Array.isArray(entry.docs) ? entry.docs : []),
      ...(Array.isArray(entry.requiredDocs) ? entry.requiredDocs : []),
      ...(Array.isArray(entry.required_docs) ? entry.required_docs : []),
    ];
    const relPaths = uniqueStrings([
      ...(Array.isArray(entry.rel_paths) ? entry.rel_paths : []),
      ...(Array.isArray(entry.relPaths) ? entry.relPaths : []),
      ...docs.map((doc: any) => doc.rel_path || doc.relPath || doc.relPath || doc.name || ""),
    ], 40);
    const repairIds = uniqueStrings([
      ...(Array.isArray(entry.repair_work_item_ids) ? entry.repair_work_item_ids : []),
      ...(Array.isArray(entry.repairWorkItemIds) ? entry.repairWorkItemIds : []),
      ...docs.map((doc: any) => doc.repair_work_item_id || doc.repairWorkItemId || ""),
    ], 40);
    const status = String(entry.status || raw?.status || (gapCodes.length ? "non_compliant" : "compliant")).trim().toLowerCase();
    const row = {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-distilled-row-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
      packet_id: String(entry.packet_id || entry.packetId || entry.worker_context_packet_id || entry.workerContextPacketId || raw?.packet_id || "").trim(),
      binding_id: String(entry.binding_id || entry.bindingId || entry.worker_context_packet_binding_id || raw?.binding_id || "").trim(),
      assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      agent_type: String(entry.agent_type || entry.agentType || entry.executor || raw?.agent_type || raw?.agentType || options.agentType || options.agent_type || "unknown").trim() || "unknown",
      status,
      pre_dispatch_prompted: entry.pre_dispatch_prompted !== false && entry.preDispatchPrompted !== false,
      required_doc_count: Number(entry.required_doc_count || entry.requiredDocCount || docs.length || 0),
      discipline_doc_count: Number(entry.discipline_doc_count || entry.disciplineDocCount || 0),
      receipt_row_count: Number(entry.receipt_row_count || entry.receiptRowCount || 0),
      missing_receipt: entry.missing_receipt === true || gapCodes.some((code: string) => /child_agent_receipt|missing.*receipt/i.test(code)),
      missing_memory_provenance_usage: entry.missing_memory_provenance_usage === true || gapCodes.some((code: string) => /memoryProvenanceUsage|receipt_memoryProvenanceUsage/i.test(code)),
      current_source_verified_gap: entry.current_source_verified_gap === true || gapCodes.some((code: string) => /currentSourceVerified|current_source_verified/i.test(code)),
      rel_paths: relPaths,
      repair_work_item_ids: repairIds,
      gap_codes: gapCodes,
      gap_signature: gapCodes.join("|"),
      reason: compactText(entry.reason || raw?.reason || gapCodes.join("; ") || "pressure provenance pre-dispatch compliance gap", 1000),
      first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: pressureProvenancePreDispatchComplianceRowId(row) };
  })
    .filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.pre_dispatch_prompted === true && (row.status !== "compliant" || row.gap_codes.length || row.missing_receipt || row.missing_memory_provenance_usage || row.current_source_verified_gap));
}

export function mergePressureProvenancePreDispatchComplianceRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  for (const row of incoming || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRowId(row));
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
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incoming.some((item: any) => String(item.row_id || "") === row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - rows.length),
  };
}

export function pressureProvenancePreDispatchComplianceArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const threshold = Math.max(1, Number(options.frequentThreshold || options.frequent_threshold || 2));
  const attributionMap = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.agent_type || "unknown"}|${row.project || "unknown"}`;
    const current = attributionMap.get(key) || {
      agent_type: row.agent_type || "unknown",
      project: row.project || "unknown",
      violation_count: 0,
      packet_count: 0,
      missing_receipt_count: 0,
      missing_memory_provenance_usage_count: 0,
      current_source_verified_gap_count: 0,
      rel_paths: new Set<string>(),
      repair_work_item_ids: new Set<string>(),
      gap_codes: new Set<string>(),
      first_violation_at: "",
      last_violation_at: "",
    };
    current.violation_count += Number(row.seen_count || 1);
    current.packet_count += row.packet_id ? 1 : 0;
    if (row.missing_receipt) current.missing_receipt_count += 1;
    if (row.missing_memory_provenance_usage) current.missing_memory_provenance_usage_count += 1;
    if (row.current_source_verified_gap) current.current_source_verified_gap_count += 1;
    for (const item of row.rel_paths || []) current.rel_paths.add(String(item));
    for (const item of row.repair_work_item_ids || []) current.repair_work_item_ids.add(String(item));
    for (const item of row.gap_codes || []) current.gap_codes.add(String(item));
    current.first_violation_at = current.first_violation_at
      ? [current.first_violation_at, row.first_seen_at || row.last_seen_at || updatedAt].filter(Boolean).sort()[0]
      : String(row.first_seen_at || row.last_seen_at || updatedAt);
    current.last_violation_at = [current.last_violation_at, row.last_seen_at || row.first_seen_at || updatedAt].filter(Boolean).sort().slice(-1)[0] || "";
    attributionMap.set(key, current);
  }
  const attributions = [...attributionMap.values()].map((row: any) => ({
    ...row,
    frequent: Number(row.violation_count || 0) >= threshold,
    rel_paths: [...row.rel_paths].slice(0, 24),
    repair_work_item_ids: [...row.repair_work_item_ids].slice(0, 24),
    gap_codes: [...row.gap_codes].slice(0, 24),
  })).sort((a: any, b: any) => Number(b.violation_count || 0) - Number(a.violation_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    archived_count: rows.length,
    frequent_threshold: threshold,
    attribution_count: attributions.length,
    frequent_attribution_count: attributions.filter((row: any) => row.frequent).length,
    missing_receipt_count: rows.filter((row: any) => row.missing_receipt).length,
    missing_memory_provenance_usage_count: rows.filter((row: any) => row.missing_memory_provenance_usage).length,
    current_source_verified_gap_count: rows.filter((row: any) => row.current_source_verified_gap).length,
    attributions,
    rows,
    updatedAt,
  };
}

export function renderPressureProvenancePreDispatchComplianceBody(archive: any = {}, options: any = {}) {
  const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
  const frequent = attributions.filter((row: any) => row.frequent).length ? attributions.filter((row: any) => row.frequent) : attributions;
  const lines = [
    "# Pressure Provenance Pre-Dispatch Compliance",
    "",
    `Generated by CCM pressure provenance pre-dispatch compliance distillation at ${options.updatedAt || now()}.`,
    "This feedback memory records child Agent executors/projects that received pre-dispatch pressure provenance discipline but still failed the final CCM_AGENT_RECEIPT.memoryProvenanceUsage contract.",
    "Dispatch policy: when these executor/project pairs receive disputed_under_repair or stale_evidence_under_repair pressure MEMORY.md, keep the memoryProvenanceUsage example in the worker prompt, require ACK of the receipt contract, and verify final receipts before closing the task.",
    "",
    "## Executor / Project Attribution",
  ];
  for (const row of frequent.slice(0, 20)) {
    lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; violations=${row.violation_count || 0}; missingReceipt=${row.missing_receipt_count || 0}; missingMemoryProvenanceUsage=${row.missing_memory_provenance_usage_count || 0}; currentSourceVerifiedGap=${row.current_source_verified_gap_count || 0}.`);
    if (row.gap_codes?.length) lines.push(`  Gaps: ${row.gap_codes.slice(0, 8).join(", ")}.`);
    if (row.rel_paths?.length) lines.push(`  Pressure docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
    if (row.repair_work_item_ids?.length) lines.push(`  Repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
  }
  lines.push("");
  lines.push("## Stable Rule");
  lines.push("- Pre-dispatch prompting is not sufficient evidence. A task can close only after the child Agent receipt includes memoryProvenanceUsage rows covering every pressure repair memory, including repairStatus, repairGapType, and currentSourceVerified=true for used/verified disputed or stale-under-repair memory.");
  return lines.join("\n").trim() + "\n";
}

export function pressureProvenancePreDispatchComplianceRecoveryRowId(row: any = {}) {
  return `pressure-provenance-compliance-recovery:${checksum([
    row.groupId,
    row.packet_id,
    row.binding_id,
    row.project,
    row.agent_type,
    row.rel_paths,
    row.repair_work_item_ids,
  ], 24)}`;
}

export function normalizePressureProvenancePreDispatchComplianceRecoveryRows(input: any = {}, options: any = {}) {
  const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
  return pressureProvenancePreDispatchComplianceInputRows(input).map((raw: any, index: number) => {
    const entry = raw?.entry || raw?.packet || raw?.recovery || raw || {};
    const docs = [
      ...(Array.isArray(entry.docs) ? entry.docs : []),
      ...(Array.isArray(entry.requiredDocs) ? entry.requiredDocs : []),
      ...(Array.isArray(entry.required_docs) ? entry.required_docs : []),
    ];
    const relPaths = uniqueStrings([
      ...(Array.isArray(entry.rel_paths) ? entry.rel_paths : []),
      ...(Array.isArray(entry.relPaths) ? entry.relPaths : []),
      ...docs.map((doc: any) => doc.rel_path || doc.relPath || doc.name || ""),
    ], 40);
    const repairIds = uniqueStrings([
      ...(Array.isArray(entry.repair_work_item_ids) ? entry.repair_work_item_ids : []),
      ...(Array.isArray(entry.repairWorkItemIds) ? entry.repairWorkItemIds : []),
      ...docs.map((doc: any) => doc.repair_work_item_id || doc.repairWorkItemId || ""),
    ], 40);
    const status = String(entry.status || raw?.status || "compliant").trim().toLowerCase();
    const row = {
      schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-row-v1",
      version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
      groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
      packet_id: String(entry.packet_id || entry.packetId || entry.worker_context_packet_id || entry.workerContextPacketId || raw?.packet_id || "").trim(),
      binding_id: String(entry.binding_id || entry.bindingId || entry.worker_context_packet_binding_id || raw?.binding_id || "").trim(),
      assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
      dispatch_key: String(entry.dispatch_key || entry.dispatchKey || raw?.dispatch_key || "").trim(),
      project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
      agent_type: String(entry.agent_type || entry.agentType || entry.executor || raw?.agent_type || raw?.agentType || options.agentType || options.agent_type || "unknown").trim() || "unknown",
      status,
      pre_dispatch_prompted: entry.pre_dispatch_prompted !== false && entry.preDispatchPrompted !== false,
      required_doc_count: Number(entry.required_doc_count || entry.requiredDocCount || docs.length || 0),
      receipt_row_count: Number(entry.receipt_row_count || entry.receiptRowCount || entry.receipt_count || entry.receiptCount || 0),
      compliant_doc_count: Number(entry.compliant_doc_count || entry.compliantDocCount || docs.length || 0),
      current_source_verified_count: Number(entry.current_source_verified_count || entry.currentSourceVerifiedCount || 0),
      rel_paths: relPaths,
      repair_work_item_ids: repairIds,
      reason: compactText(entry.reason || raw?.reason || "pressure provenance receipt compliant after prior feedback policy", 1000),
      first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || now()),
      last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || now()),
      source_index: Number(raw?.source_index || raw?.sourceIndex || index),
    };
    return { ...row, row_id: pressureProvenancePreDispatchComplianceRecoveryRowId(row) };
  })
    .filter((row: any) => row.groupId || fallbackGroupId)
    .filter((row: any) => row.pre_dispatch_prompted === true && row.status === "compliant" && Number(row.required_doc_count || 0) > 0);
}

export function mergePressureProvenancePreDispatchComplianceRecoveryRows(existing: any[] = [], incoming: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const merged = new Map<string, any>();
  for (const row of existing || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRecoveryRowId(row));
    merged.set(id, { ...row, row_id: id });
  }
  const previousIds = new Set(merged.keys());
  for (const row of incoming || []) {
    const id = String(row.row_id || pressureProvenancePreDispatchComplianceRecoveryRowId(row));
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
  return {
    rows,
    newRowCount: rows.filter((row: any) => !previousIds.has(row.row_id)).length,
    updatedRowCount: rows.filter((row: any) => previousIds.has(row.row_id) && incoming.some((item: any) => String(item.row_id || "") === row.row_id)).length,
    prunedRowCount: Math.max(0, merged.size - rows.length),
  };
}

export function pressureProvenancePreDispatchComplianceRecoveryArchive(rows: any[] = [], options: any = {}) {
  const updatedAt = String(options.updatedAt || now());
  const attributionMap = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.agent_type || "unknown"}|${row.project || "unknown"}`;
    const current = attributionMap.get(key) || {
      agent_type: row.agent_type || "unknown",
      project: row.project || "unknown",
      compliant_count: 0,
      packet_count: 0,
      receipt_row_count: 0,
      compliant_doc_count: 0,
      current_source_verified_count: 0,
      rel_paths: new Set<string>(),
      repair_work_item_ids: new Set<string>(),
      first_compliant_at: "",
      last_compliant_at: "",
    };
    const seenCount = Number(row.seen_count || 1);
    current.compliant_count += seenCount;
    current.packet_count += row.packet_id ? 1 : 0;
    current.receipt_row_count += Number(row.receipt_row_count || 0);
    current.compliant_doc_count += Number(row.compliant_doc_count || 0);
    current.current_source_verified_count += Number(row.current_source_verified_count || 0);
    current.first_compliant_at = current.first_compliant_at
      ? [current.first_compliant_at, row.first_seen_at || row.last_seen_at || updatedAt].filter(Boolean).sort()[0]
      : String(row.first_seen_at || row.last_seen_at || updatedAt);
    current.last_compliant_at = [current.last_compliant_at, row.last_seen_at || row.first_seen_at || updatedAt].filter(Boolean).sort().slice(-1)[0] || "";
    for (const item of row.rel_paths || []) current.rel_paths.add(String(item));
    for (const item of row.repair_work_item_ids || []) current.repair_work_item_ids.add(String(item));
    attributionMap.set(key, current);
  }
  const attributions = [...attributionMap.values()].map((row: any) => ({
    ...row,
    rel_paths: [...row.rel_paths].slice(0, 24),
    repair_work_item_ids: [...row.repair_work_item_ids].slice(0, 24),
  })).sort((a: any, b: any) => Number(b.compliant_count || 0) - Number(a.compliant_count || 0) || String(a.agent_type || "").localeCompare(String(b.agent_type || "")));
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-recovery-distillation-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    archived_count: rows.length,
    attribution_count: attributions.length,
    compliant_count: rows.reduce((sum: number, row: any) => sum + Number(row.seen_count || 1), 0),
    receipt_row_count: rows.reduce((sum: number, row: any) => sum + Number(row.receipt_row_count || 0), 0),
    compliant_doc_count: rows.reduce((sum: number, row: any) => sum + Number(row.compliant_doc_count || 0), 0),
    attributions,
    rows,
    updatedAt,
  };
}

export function renderPressureProvenancePreDispatchComplianceRecoveryBody(archive: any = {}, options: any = {}) {
  const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
  const lines = [
    "# Pressure Provenance Compliance Recovery",
    "",
    `Generated by CCM pressure provenance compliance recovery distillation at ${options.updatedAt || now()}.`,
    "This feedback memory records executor/project pairs that later produced compliant memoryProvenanceUsage receipts after receiving pressure provenance discipline.",
    "Recovery policy: compliant receipts do not delete historical violations, but they reduce effective violation pressure so old executor/project mistakes can recover after sustained correct behavior.",
    "",
    "## Executor / Project Recovery",
  ];
  for (const row of attributions.slice(0, 20)) {
    lines.push(`- agentType=${row.agent_type || "unknown"}; project=${row.project || "unknown"}; compliant=${row.compliant_count || 0}; packets=${row.packet_count || 0}; receiptRows=${row.receipt_row_count || 0}; lastCompliantAt=${row.last_compliant_at || ""}.`);
    if (row.rel_paths?.length) lines.push(`  Pressure docs: ${row.rel_paths.slice(0, 8).join(", ")}.`);
    if (row.repair_work_item_ids?.length) lines.push(`  Repair work items: ${row.repair_work_item_ids.slice(0, 8).join(", ")}.`);
  }
  lines.push("");
  lines.push("## Stable Rule");
  lines.push("- Recovery evidence can reduce dispatch feedback policy severity only when it comes from compliant pressure provenance receipts. Historical violation rows remain archived for audit and can become active again if new violations outnumber recovery credits.");
  return lines.join("\n").trim() + "\n";
}

export function normalizePressureProvenanceDispatchPolicyKey(value: any) {
  return String(value || "").trim().toLowerCase();
}

export function pressureProvenanceDispatchPolicyAttributionMatches(row: any = {}, options: any = {}) {
  const targetProject = normalizePressureProvenanceDispatchPolicyKey(options.targetProject || options.target_project || options.project);
  const agentType = normalizePressureProvenanceDispatchPolicyKey(options.agentType || options.agent_type || options.executor || options.runner);
  const rowProject = normalizePressureProvenanceDispatchPolicyKey(row.project || row.target_project || row.targetProject);
  const rowAgentType = normalizePressureProvenanceDispatchPolicyKey(row.agent_type || row.agentType || row.executor || row.runner);
  const projectMatches = !targetProject || !rowProject || rowProject === targetProject || rowProject === "unknown" || rowProject === "*";
  const agentMatches = !agentType || !rowAgentType || rowAgentType === agentType || rowAgentType === "unknown" || rowAgentType === "*";
  return projectMatches && agentMatches;
}

export function pressureProvenanceDispatchPolicyAttributionKey(row: any = {}) {
  return `${normalizePressureProvenanceDispatchPolicyKey(row.agent_type || row.agentType || row.executor || row.runner || "unknown")}|${normalizePressureProvenanceDispatchPolicyKey(row.project || row.target_project || row.targetProject || "unknown")}`;
}

export function buildPressureProvenancePreDispatchComplianceDispatchPolicy(groupId: string, options: any = {}) {
  const disabled = options.disabled === true
    || options.disablePolicy === true
    || options.disable_policy === true
    || options.disablePressureProvenanceFeedbackDispatchPolicy === true
    || options.disable_pressure_provenance_feedback_dispatch_policy === true;
  const targetProject = String(options.targetProject || options.target_project || options.project || "").trim();
  const agentType = String(options.agentType || options.agent_type || options.executor || options.runner || "unknown").trim() || "unknown";
  const generatedAt = String(options.generatedAt || options.generated_at || now());
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const archive = ledger.pressureProvenancePreDispatchComplianceArchive || {};
  const recoveryArchive = ledger.pressureProvenancePreDispatchComplianceRecoveryArchive || {};
  const providerOverrideFollowupArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupArchive || {};
  const providerOverrideFollowupReceiptValidationArchive = ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
  const providerSwitchExecutionArchive = ledger.providerSwitchExecutionArchive || {};
  const providerOverrideFollowupReceiptValidationRows = Array.isArray(providerOverrideFollowupReceiptValidationArchive.rows)
    ? providerOverrideFollowupReceiptValidationArchive.rows
    : [];
  const attributions = Array.isArray(archive.attributions) ? archive.attributions : [];
  const violationRows = Array.isArray(archive.rows) ? archive.rows : [];
  const recoveryAttributions = Array.isArray(recoveryArchive.attributions) ? recoveryArchive.attributions : [];
  const providerOverrideFollowupDisabled = options.disableProviderDispatchOverrideFollowupHistory === true
    || options.disable_provider_dispatch_override_followup_history === true
    || options.disableProviderOverrideFollowupHistory === true
    || options.disable_provider_override_followup_history === true;
  const providerOverrideFollowupAttributions = providerOverrideFollowupDisabled
    ? []
    : Array.isArray(providerOverrideFollowupArchive.attributions)
      ? providerOverrideFollowupArchive.attributions
      : [];
  const matchingProviderOverrideFollowupAttributions = providerOverrideFollowupAttributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
  const threshold = Math.max(1, Number(options.frequentThreshold || options.frequent_threshold || archive.frequent_threshold || 2));
  const providerOverrideFollowupReceiptValidationDisabled = options.disableProviderDispatchOverrideFollowupReceiptValidationHistory === true
    || options.disable_provider_dispatch_override_followup_receipt_validation_history === true;
  const providerOverrideFollowupReceiptValidationAttributions = providerOverrideFollowupReceiptValidationDisabled
    ? []
    : Array.isArray(providerOverrideFollowupReceiptValidationArchive.attributions)
      ? providerOverrideFollowupReceiptValidationArchive.attributions
      : [];
  const matchingProviderOverrideFollowupReceiptValidationAttributions = providerOverrideFollowupReceiptValidationAttributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
  const providerSwitchExecutionDisabled = options.disableProviderSwitchExecutionHistory === true
    || options.disable_provider_switch_execution_history === true;
  const providerSwitchExecutionAttributions = providerSwitchExecutionDisabled
    ? []
    : Array.isArray(providerSwitchExecutionArchive.attributions)
      ? providerSwitchExecutionArchive.attributions
      : [];
  const providerSwitchExecutionRows = providerSwitchExecutionDisabled
    ? []
    : Array.isArray(providerSwitchExecutionArchive.rows)
      ? providerSwitchExecutionArchive.rows
      : [];
  const matchingProviderSwitchExecutionAttributions = providerSwitchExecutionAttributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }));
  const providerSwitchExecutionMismatchThreshold = Math.max(1, Number(
    options.providerSwitchExecutionMismatchThreshold
      || options.provider_switch_execution_mismatch_threshold
      || 2
  ));
  const providerOverrideFollowupReceiptValidationFailureThreshold = Math.max(1, Number(
    options.providerOverrideFollowupReceiptValidationFailureThreshold
      || options.provider_override_followup_receipt_validation_failure_threshold
      || 2
  ));
  const crossGroupProviderReliabilityDisabled = disabled
    || options.disableCrossGroupProviderReliability === true
    || options.disable_cross_group_provider_reliability === true
    || options.crossGroupProviderReliability === false
    || options.cross_group_provider_reliability === false;
  const crossGroupProviderReliabilitySignal = crossGroupProviderReliabilityDisabled
    ? null
    : buildCrossGroupProviderDispatchReliabilitySignal(groupId, {
      ...options,
      agentType,
      generatedAt,
      failureThreshold: providerOverrideFollowupReceiptValidationFailureThreshold,
    });
  const recoveryDisabled = options.disablePressureProvenanceFeedbackRecovery === true
    || options.disable_pressure_provenance_feedback_recovery === true
    || options.disableRecovery === true
    || options.disable_recovery === true;
  const recoveryCreditPerCompliant = Math.max(0, Number(options.recoveryCreditPerCompliant || options.recovery_credit_per_compliant || 1));
  const violationPolicyRows = attributions
    .filter((row: any) => pressureProvenanceDispatchPolicyAttributionMatches(row, { targetProject, agentType }))
    .map((row: any) => {
      const recoveryMatches = recoveryDisabled ? [] : recoveryAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const recoveryCount = recoveryMatches.reduce((sum: number, candidate: any) => sum + Number(candidate.compliant_count || 0), 0);
      const recoveryCredit = Math.floor(recoveryCount * recoveryCreditPerCompliant);
      const violationCount = Number(row.violation_count || 0);
      const recoveryLastCompliantAt = recoveryMatches.map((candidate: any) => candidate.last_compliant_at || "").filter(Boolean).sort().slice(-1)[0] || "";
      const matchingViolationRows = violationRows.filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
        targetProject: row.project || row.target_project || row.targetProject || targetProject,
        agentType: row.agent_type || row.agentType || agentType,
      }));
      const postRecoveryViolations = recoveryLastCompliantAt
        ? matchingViolationRows.filter((candidate: any) => String(candidate.last_seen_at || candidate.first_seen_at || "").localeCompare(recoveryLastCompliantAt) > 0)
        : [];
      const postRecoveryViolationCount = postRecoveryViolations.reduce((sum: number, candidate: any) => sum + Number(candidate.seen_count || 1), 0);
      const relapsed = !recoveryDisabled && recoveryCredit > 0 && postRecoveryViolationCount > 0;
      const effectiveViolationCount = Math.max(
        0,
        relapsed ? Math.max(postRecoveryViolationCount, violationCount - recoveryCredit) : violationCount - recoveryCredit
      );
      const providerOverrideFollowupMatches = matchingProviderOverrideFollowupAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const providerOverrideFollowup = summarizeProviderDispatchOverrideFollowupPolicyAttributions(providerOverrideFollowupMatches);
      const providerOverrideFollowupFreshAfterLastViolation = !!providerOverrideFollowup.lastCompletedAt
        && !!String(row.last_violation_at || "")
        && providerOverrideFollowup.lastCompletedAt.localeCompare(String(row.last_violation_at || "")) >= 0;
      return {
        agent_type: row.agent_type || "unknown",
        project: row.project || "unknown",
        violation_count: violationCount,
        effective_violation_count: effectiveViolationCount,
        recovered_violation_count: Math.min(violationCount, recoveryCredit),
        recovery_compliant_count: recoveryCount,
        recovery_credit: recoveryCredit,
        recovery_last_compliant_at: recoveryLastCompliantAt,
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: postRecoveryViolationCount,
        recovery_streak_broken_at: postRecoveryViolations.map((candidate: any) => candidate.last_seen_at || candidate.first_seen_at || "").filter(Boolean).sort().slice(-1)[0] || "",
        relapsed,
        recovered: !relapsed && violationCount >= threshold && effectiveViolationCount < threshold && recoveryCredit > 0,
        packet_count: Number(row.packet_count || 0),
        missing_receipt_count: Number(row.missing_receipt_count || 0),
        missing_memory_provenance_usage_count: Number(row.missing_memory_provenance_usage_count || 0),
        current_source_verified_gap_count: Number(row.current_source_verified_gap_count || 0),
        frequent: effectiveViolationCount >= threshold || relapsed,
        raw_frequent: row.frequent === true || violationCount >= threshold,
        first_violation_at: row.first_violation_at || "",
        last_violation_at: row.last_violation_at || "",
        rel_paths: uniqueStrings(Array.isArray(row.rel_paths) ? row.rel_paths : [], 12),
        repair_work_item_ids: uniqueStrings(Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : [], 12),
        gap_codes: uniqueStrings(Array.isArray(row.gap_codes) ? row.gap_codes : [], 12),
        provider_override_followup_repaired: providerOverrideFollowup.completedCount > 0,
        provider_override_followup_repaired_count: providerOverrideFollowup.completedCount,
        provider_override_followup_memory_provenance_usage_count: providerOverrideFollowup.memoryUsageCount,
        provider_override_followup_current_source_verified_count: providerOverrideFollowup.verifiedCount,
        provider_override_followup_last_completed_at: providerOverrideFollowup.lastCompletedAt,
        provider_override_followup_fresh_after_last_violation: providerOverrideFollowupFreshAfterLastViolation,
        provider_override_followup_rel_paths: providerOverrideFollowup.relPaths,
        provider_override_followup_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
        provider_override_followup_override_ids: providerOverrideFollowup.overrideIds,
      };
    });
  const violationKeys = new Set(violationPolicyRows.map((row: any) => pressureProvenanceDispatchPolicyAttributionKey(row)));
  const providerOverrideFollowupOnlyRows = matchingProviderOverrideFollowupAttributions
    .filter((row: any) => !violationKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
    .map((row: any) => {
      const providerOverrideFollowup = summarizeProviderDispatchOverrideFollowupPolicyAttributions([row]);
      return {
        agent_type: row.agent_type || row.agentType || "unknown",
        project: row.project || row.target_project || row.targetProject || "unknown",
        violation_count: 0,
        effective_violation_count: 0,
        recovered_violation_count: 0,
        recovery_compliant_count: 0,
        recovery_credit: 0,
        recovery_last_compliant_at: "",
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: 0,
        recovery_streak_broken_at: "",
        relapsed: false,
        recovered: true,
        provider_override_followup_only: true,
        provider_override_followup_repaired: providerOverrideFollowup.completedCount > 0,
        provider_override_followup_repaired_count: providerOverrideFollowup.completedCount,
        provider_override_followup_memory_provenance_usage_count: providerOverrideFollowup.memoryUsageCount,
        provider_override_followup_current_source_verified_count: providerOverrideFollowup.verifiedCount,
        provider_override_followup_last_completed_at: providerOverrideFollowup.lastCompletedAt,
        provider_override_followup_fresh_after_last_violation: true,
        provider_override_followup_rel_paths: providerOverrideFollowup.relPaths,
        provider_override_followup_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
        provider_override_followup_override_ids: providerOverrideFollowup.overrideIds,
        packet_count: 0,
        missing_receipt_count: 0,
        missing_memory_provenance_usage_count: 0,
        current_source_verified_gap_count: 0,
        frequent: false,
        raw_frequent: false,
        first_violation_at: "",
        last_violation_at: "",
        rel_paths: providerOverrideFollowup.relPaths,
        repair_work_item_ids: providerOverrideFollowup.followupWorkItemIds,
        gap_codes: ["provider_dispatch_override_followup_repaired"],
      };
    });
  const basePolicyRows = [...violationPolicyRows, ...providerOverrideFollowupOnlyRows];
  const basePolicyKeys = new Set(basePolicyRows.map((row: any) => pressureProvenanceDispatchPolicyAttributionKey(row)));
  const providerOverrideFollowupReceiptValidationOnlyRows = matchingProviderOverrideFollowupReceiptValidationAttributions
    .filter((row: any) => !basePolicyKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
    .map((row: any) => ({
      agent_type: row.agent_type || row.agentType || "unknown",
      project: row.project || row.target_project || row.targetProject || "unknown",
      violation_count: 0,
      effective_violation_count: 0,
      recovered_violation_count: 0,
      recovery_compliant_count: 0,
      recovery_credit: 0,
      recovery_last_compliant_at: "",
      recovery_disabled: recoveryDisabled,
      post_recovery_violation_count: 0,
      recovery_streak_broken_at: "",
      relapsed: false,
      recovered: false,
      provider_override_followup_only: true,
      provider_override_followup_repaired: false,
      provider_override_followup_repaired_count: 0,
      provider_override_followup_memory_provenance_usage_count: 0,
      provider_override_followup_current_source_verified_count: 0,
      provider_override_followup_last_completed_at: "",
      provider_override_followup_fresh_after_last_violation: false,
      provider_override_followup_rel_paths: [],
      provider_override_followup_work_item_ids: [],
      provider_override_followup_override_ids: [],
      packet_count: 0,
      missing_receipt_count: 0,
      missing_memory_provenance_usage_count: 0,
      current_source_verified_gap_count: 0,
      frequent: false,
      raw_frequent: false,
      first_violation_at: "",
      last_violation_at: "",
      rel_paths: [],
      repair_work_item_ids: [],
      gap_codes: [],
    }));
  const validationPolicyRows = [...basePolicyRows, ...providerOverrideFollowupReceiptValidationOnlyRows];
  const validationPolicyKeys = new Set(validationPolicyRows.map((row: any) => pressureProvenanceDispatchPolicyAttributionKey(row)));
  const providerSwitchExecutionOnlyRows = matchingProviderSwitchExecutionAttributions
    .filter((row: any) => !validationPolicyKeys.has(pressureProvenanceDispatchPolicyAttributionKey(row)))
    .map((row: any) => {
      const execution = summarizeProviderSwitchExecutionPolicyAttributions([row]);
      return {
        agent_type: row.agent_type || row.agentType || row.expected_provider || row.expectedProvider || "unknown",
        project: row.project || row.target_project || row.targetProject || "unknown",
        violation_count: 0,
        effective_violation_count: 0,
        recovered_violation_count: 0,
        recovery_compliant_count: 0,
        recovery_credit: 0,
        recovery_last_compliant_at: "",
        recovery_disabled: recoveryDisabled,
        post_recovery_violation_count: 0,
        recovery_streak_broken_at: "",
        relapsed: false,
        recovered: false,
        provider_switch_execution_only: true,
        packet_count: 0,
        missing_receipt_count: 0,
        missing_memory_provenance_usage_count: 0,
        current_source_verified_gap_count: 0,
        frequent: execution.mismatchCount >= providerSwitchExecutionMismatchThreshold,
        raw_frequent: execution.mismatchCount >= providerSwitchExecutionMismatchThreshold,
        first_violation_at: "",
        last_violation_at: "",
        rel_paths: [],
        repair_work_item_ids: [],
        gap_codes: execution.gapCodes,
      };
    });
  const localPolicyRows = [...validationPolicyRows, ...providerSwitchExecutionOnlyRows];
  const crossGroupProviderReliabilityOnlyRows = !localPolicyRows.length && crossGroupProviderReliabilitySignal?.actionable === true
    ? [{
      agent_type: agentType,
      project: targetProject || "unknown",
      violation_count: 0,
      effective_violation_count: 0,
      recovered_violation_count: 0,
      recovery_compliant_count: 0,
      recovery_credit: 0,
      recovery_last_compliant_at: "",
      recovery_disabled: recoveryDisabled,
      post_recovery_violation_count: 0,
      recovery_streak_broken_at: "",
      relapsed: false,
      recovered: false,
      cross_group_provider_reliability_only: true,
      provider_override_followup_only: false,
      provider_override_followup_repaired: false,
      provider_override_followup_repaired_count: 0,
      provider_override_followup_memory_provenance_usage_count: 0,
      provider_override_followup_current_source_verified_count: 0,
      provider_override_followup_last_completed_at: "",
      provider_override_followup_fresh_after_last_violation: false,
      provider_override_followup_rel_paths: [],
      provider_override_followup_work_item_ids: [],
      provider_override_followup_override_ids: [],
      packet_count: 0,
      missing_receipt_count: 0,
      missing_memory_provenance_usage_count: 0,
      current_source_verified_gap_count: 0,
      frequent: false,
      raw_frequent: false,
      first_violation_at: "",
      last_violation_at: "",
      rel_paths: [],
      repair_work_item_ids: [],
      gap_codes: [],
    }]
    : [];
  const matching = [...localPolicyRows, ...crossGroupProviderReliabilityOnlyRows]
    .map((row: any) => {
      const validationMatches = matchingProviderOverrideFollowupReceiptValidationAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const validation = summarizeProviderDispatchOverrideFollowupReceiptValidationPolicyAttributions(validationMatches);
      const validationEscalated = validation.consecutiveFailureCount >= providerOverrideFollowupReceiptValidationFailureThreshold;
      const validationRepairVerified = !validationEscalated && validation.repairVerified;
      const localValidationRisk = scoreProviderDispatchReliabilityRows(providerOverrideFollowupReceiptValidationRows.filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
        targetProject: row.project || row.target_project || row.targetProject || targetProject,
        agentType: row.agent_type || row.agentType || agentType,
      })), {
        ...options,
        generatedAt,
      });
      const providerSwitchExecutionMatches = matchingProviderSwitchExecutionAttributions
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const providerSwitchExecution = summarizeProviderSwitchExecutionPolicyAttributions(providerSwitchExecutionMatches);
      const providerSwitchExecutionEvidenceRows = providerSwitchExecutionRows
        .filter((candidate: any) => pressureProvenanceDispatchPolicyAttributionMatches(candidate, {
          targetProject: row.project || row.target_project || row.targetProject || targetProject,
          agentType: row.agent_type || row.agentType || agentType,
        }));
      const providerSwitchExecutionRisk = scoreProviderSwitchExecutionRows(providerSwitchExecutionEvidenceRows, {
        ...options,
        generatedAt,
      });
      const providerSwitchExecutionRowIds = uniqueStrings([
        ...providerSwitchExecution.rowIds,
        ...providerSwitchExecutionEvidenceRows.map((candidate: any) => candidate.row_id || candidate.rowId || "").filter(Boolean),
      ], 32);
      const providerSwitchExecutionMemoryRelPaths = providerSwitchExecution.executedCount > 0 || providerSwitchExecutionEvidenceRows.length
        ? uniqueStrings([
          ...providerSwitchExecution.memoryRelPaths,
          "provider-switch-execution-memory.md",
        ], 8)
        : [];
      const providerSwitchExecutionEscalated = providerSwitchExecution.mismatchCount >= providerSwitchExecutionMismatchThreshold;
      return {
        ...row,
        frequent: row.frequent === true || validationEscalated || providerSwitchExecutionEscalated,
        recovered: row.relapsed !== true && (row.recovered === true || validationRepairVerified),
        provider_override_followup_repaired: row.provider_override_followup_repaired === true || validationRepairVerified,
        provider_override_followup_repaired_count: Math.max(Number(row.provider_override_followup_repaired_count || 0), validationRepairVerified ? validation.passedCount : 0),
        provider_override_followup_last_completed_at: validationRepairVerified ? validation.lastPassedAt : row.provider_override_followup_last_completed_at || "",
        provider_override_followup_fresh_after_last_violation: validationRepairVerified || row.provider_override_followup_fresh_after_last_violation === true,
        provider_override_followup_rel_paths: uniqueStrings([
          ...(Array.isArray(row.provider_override_followup_rel_paths) ? row.provider_override_followup_rel_paths : []),
          ...validation.relPaths,
        ], 16),
        provider_override_followup_work_item_ids: uniqueStrings([
          ...(Array.isArray(row.provider_override_followup_work_item_ids) ? row.provider_override_followup_work_item_ids : []),
          ...validation.followupWorkItemIds,
        ], 16),
        provider_override_followup_override_ids: uniqueStrings([
          ...(Array.isArray(row.provider_override_followup_override_ids) ? row.provider_override_followup_override_ids : []),
          ...validation.overrideIds,
        ], 16),
        provider_override_followup_receipt_validation_attempt_count: validation.attemptCount,
        provider_override_followup_receipt_validation_failed_count: validation.failedCount,
        provider_override_followup_receipt_validation_passed_count: validation.passedCount,
        provider_override_followup_receipt_validation_consecutive_failure_count: validation.consecutiveFailureCount,
        provider_override_followup_receipt_validation_latest_status: validation.latestStatus,
        provider_override_followup_receipt_validation_escalated: validationEscalated,
        provider_override_followup_receipt_validation_repair_verified: validationRepairVerified,
        provider_override_followup_receipt_validation_last_attempt_at: validation.lastAttemptAt,
        provider_override_followup_receipt_validation_last_failed_at: validation.lastFailedAt,
        provider_override_followup_receipt_validation_last_passed_at: validation.lastPassedAt,
        provider_override_followup_receipt_validation_ids: validation.validationIds,
        provider_override_followup_receipt_validation_repair_work_item_ids: validation.repairWorkItemIds,
        provider_override_followup_receipt_validation_rel_paths: validation.relPaths,
        provider_override_followup_receipt_validation_followup_work_item_ids: validation.followupWorkItemIds,
        provider_override_followup_receipt_validation_override_ids: validation.overrideIds,
        provider_override_followup_receipt_validation_gap_codes: validation.gapCodes,
        provider_override_followup_receipt_validation_decayed_failure_score: localValidationRisk.weightedFailureScore,
        provider_override_followup_receipt_validation_decayed_passed_score: localValidationRisk.weightedPassedScore,
        provider_override_followup_receipt_validation_risk_score: localValidationRisk.riskScore,
        provider_override_followup_receipt_validation_risk_confidence: localValidationRisk.confidence,
        provider_override_followup_receipt_validation_half_life_days: localValidationRisk.halfLifeDays,
        provider_switch_execution_history_present: providerSwitchExecution.executedCount > 0,
        provider_switch_execution_executed_count: providerSwitchExecution.executedCount,
        provider_switch_execution_approved_count: providerSwitchExecution.approvedCount,
        provider_switch_execution_passed_count: providerSwitchExecution.passedCount,
        provider_switch_execution_failed_count: providerSwitchExecution.failedCount,
        provider_switch_execution_mismatch_count: providerSwitchExecution.mismatchCount,
        provider_switch_execution_mismatch_escalated: providerSwitchExecutionEscalated,
        provider_switch_execution_mismatch_threshold: providerSwitchExecutionMismatchThreshold,
        provider_switch_execution_expected_provider: providerSwitchExecution.expectedProvider,
        provider_switch_execution_actual_providers: providerSwitchExecution.actualProviders,
        provider_switch_execution_last_executed_at: providerSwitchExecution.lastExecutedAt,
        provider_switch_execution_last_failed_at: providerSwitchExecution.lastFailedAt,
        provider_switch_execution_last_passed_at: providerSwitchExecution.lastPassedAt,
        provider_switch_execution_receipt_ids: providerSwitchExecution.executionReceiptIds,
        provider_switch_execution_decision_receipt_ids: providerSwitchExecution.decisionReceiptIds,
        provider_switch_execution_task_agent_session_ids: providerSwitchExecution.taskAgentSessionIds,
        provider_switch_execution_row_ids: providerSwitchExecutionRowIds,
        provider_switch_execution_memory_rel_paths: providerSwitchExecutionMemoryRelPaths,
        provider_switch_execution_gap_codes: providerSwitchExecution.gapCodes,
        provider_switch_execution_decayed_mismatch_score: providerSwitchExecutionRisk.weightedMismatchScore,
        provider_switch_execution_decayed_failed_score: providerSwitchExecutionRisk.weightedFailedScore,
        provider_switch_execution_decayed_passed_score: providerSwitchExecutionRisk.weightedPassedScore,
        provider_switch_execution_weighted_risk_score: providerSwitchExecutionRisk.weightedRiskScore,
        provider_switch_execution_risk_score: providerSwitchExecutionRisk.riskScore,
        provider_switch_execution_risk_confidence: providerSwitchExecutionRisk.confidence,
        provider_switch_execution_half_life_days: providerSwitchExecutionRisk.halfLifeDays,
        provider_switch_execution_passed_credit: providerSwitchExecutionRisk.passedCredit,
        provider_switch_execution_mismatch_penalty: providerSwitchExecutionRisk.mismatchPenalty,
        cross_group_provider_reliability_guidance: crossGroupProviderReliabilitySignal?.schema ? crossGroupProviderReliabilitySignal : null,
        cross_group_provider_reliability_actionable: crossGroupProviderReliabilitySignal?.actionable === true,
        cross_group_provider_reliability_risk_status: crossGroupProviderReliabilitySignal?.risk_status || "empty",
        cross_group_provider_reliability_risk_score: Number(crossGroupProviderReliabilitySignal?.risk_score || 0),
        cross_group_provider_reliability_confidence: Number(crossGroupProviderReliabilitySignal?.confidence || 0),
        cross_group_provider_reliability_source_group_count: Number(crossGroupProviderReliabilitySignal?.source_group_count || 0),
      };
    })
    .sort((a: any, b: any) => Number(b.effective_violation_count || 0) - Number(a.effective_violation_count || 0) || Number(b.violation_count || 0) - Number(a.violation_count || 0));
  const frequent = matching.filter((row: any) => row.frequent);
  const recovered = matching.filter((row: any) => row.recovered);
  const relapsed = matching.filter((row: any) => row.relapsed);
  const active = !disabled && frequent.length > 0;
  const pressureDiscipline = options.pressureMemoryProvenanceReceiptDiscipline
    || options.pressure_memory_provenance_receipt_discipline
    || null;
  const pressureDisciplineActive = pressureDiscipline?.active === true
    || Number(pressureDiscipline?.docCount || pressureDiscipline?.doc_count || 0) > 0
    || (Array.isArray(pressureDiscipline?.rows) && pressureDiscipline.rows.length > 0);
  const top = frequent[0] || matching[0] || {};
  const policyRows = (active ? frequent : matching).slice(0, Math.max(1, Number(options.maxRows || options.max_rows || 6)));
  return {
    schema: "ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1",
    version: GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION,
    groupId,
    targetProject,
    agentType,
    active,
    disabled,
    generatedAt,
    source: "typed-feedback:pressure-provenance-pre-dispatch-compliance",
    sourceArchiveSchema: archive.schema || "",
    sourceArchiveUpdatedAt: archive.updatedAt || "",
    recoveryArchiveSchema: recoveryArchive.schema || "",
    recoveryArchiveUpdatedAt: recoveryArchive.updatedAt || "",
    providerOverrideFollowupArchiveSchema: providerOverrideFollowupArchive.schema || "",
    providerOverrideFollowupArchiveUpdatedAt: providerOverrideFollowupArchive.updatedAt || "",
    providerOverrideFollowupReceiptValidationArchiveSchema: providerOverrideFollowupReceiptValidationArchive.schema || "",
    providerOverrideFollowupReceiptValidationArchiveUpdatedAt: providerOverrideFollowupReceiptValidationArchive.updatedAt || "",
    providerSwitchExecutionArchiveSchema: providerSwitchExecutionArchive.schema || "",
    providerSwitchExecutionArchiveUpdatedAt: providerSwitchExecutionArchive.updatedAt || "",
    sourceLedgerFile: ledger.file || getGroupTypedMemoryDistillationLedgerFile(groupId),
    frequentThreshold: threshold,
    recoveryEnabled: !recoveryDisabled,
    recoveryCreditPerCompliant,
    attributionCount: attributions.length,
    matchingAttributionCount: matching.length,
    rawFrequentViolationAttributionCount: matching.filter((row: any) => row.raw_frequent).length,
    frequentViolationAttributionCount: frequent.length,
    recoveredAttributionCount: recovered.length,
    relapsedAttributionCount: relapsed.length,
    recoveryAttributionCount: recoveryAttributions.length,
    providerOverrideFollowupHistoryEnabled: !providerOverrideFollowupDisabled,
    providerOverrideFollowupAttributionCount: providerOverrideFollowupAttributions.length,
    matchingProviderOverrideFollowupAttributionCount: matchingProviderOverrideFollowupAttributions.length,
    providerOverrideFollowupRepairedAttributionCount: matching.filter((row: any) => row.provider_override_followup_repaired === true).length,
    providerOverrideFollowupReceiptValidationHistoryEnabled: !providerOverrideFollowupReceiptValidationDisabled,
    providerOverrideFollowupReceiptValidationFailureThreshold,
    providerOverrideFollowupReceiptValidationAttributionCount: providerOverrideFollowupReceiptValidationAttributions.length,
    matchingProviderOverrideFollowupReceiptValidationAttributionCount: matchingProviderOverrideFollowupReceiptValidationAttributions.length,
    providerOverrideFollowupReceiptValidationEscalatedAttributionCount: matching.filter((row: any) => row.provider_override_followup_receipt_validation_escalated === true).length,
    providerOverrideFollowupReceiptValidationRepairedAttributionCount: matching.filter((row: any) => row.provider_override_followup_receipt_validation_repair_verified === true).length,
    providerSwitchExecutionHistoryEnabled: !providerSwitchExecutionDisabled,
    providerSwitchExecutionMismatchThreshold,
    providerSwitchExecutionAttributionCount: providerSwitchExecutionAttributions.length,
    matchingProviderSwitchExecutionAttributionCount: matchingProviderSwitchExecutionAttributions.length,
    providerSwitchExecutionMismatchAttributionCount: matching.filter((row: any) => Number(row.provider_switch_execution_mismatch_count || 0) > 0).length,
    providerSwitchExecutionEscalatedAttributionCount: matching.filter((row: any) => row.provider_switch_execution_mismatch_escalated === true).length,
    providerSwitchExecutionPassedCount: matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_passed_count || 0), 0),
    providerSwitchExecutionFailedCount: matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_failed_count || 0), 0),
    providerSwitchExecutionMismatchCount: matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_mismatch_count || 0), 0),
    providerSwitchExecutionDecayedMismatchScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_decayed_mismatch_score || 0), 0)),
    providerSwitchExecutionDecayedFailedScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_decayed_failed_score || 0), 0)),
    providerSwitchExecutionDecayedPassedScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_decayed_passed_score || 0), 0)),
    providerSwitchExecutionWeightedRiskScore: providerDispatchReliabilityRound(matching.reduce((sum: number, row: any) => sum + Number(row.provider_switch_execution_weighted_risk_score || 0), 0)),
    crossGroupProviderReliabilityEnabled: !crossGroupProviderReliabilityDisabled,
    crossGroupProviderReliabilityActionable: crossGroupProviderReliabilitySignal?.actionable === true,
    crossGroupProviderReliabilityRiskStatus: crossGroupProviderReliabilitySignal?.risk_status || "empty",
    crossGroupProviderReliabilityRiskScore: Number(crossGroupProviderReliabilitySignal?.risk_score || 0),
    crossGroupProviderReliabilityConfidence: Number(crossGroupProviderReliabilitySignal?.confidence || 0),
    crossGroupProviderReliabilitySourceGroupCount: Number(crossGroupProviderReliabilitySignal?.source_group_count || 0),
    crossGroupProviderReliabilityGuidance: crossGroupProviderReliabilitySignal?.schema ? crossGroupProviderReliabilitySignal : null,
    pressureMemoryProvenanceDisciplineActive: pressureDisciplineActive,
    action: active
      ? matching.some((row: any) => row.provider_switch_execution_mismatch_escalated === true)
        ? "hold_provider_after_repeated_provider_switch_execution_mismatches"
        : matching.some((row: any) => row.provider_override_followup_receipt_validation_escalated === true)
        ? "hold_provider_after_repeated_override_followup_receipt_validation_failures"
        : relapsed.length
        ? "reactivate_pressure_memory_provenance_receipt_contract_after_recovery_relapse"
        : "strengthen_pressure_memory_provenance_receipt_contract"
      : recovered.length
        ? matching.some((row: any) => row.provider_override_followup_receipt_validation_repair_verified === true)
          ? "monitor_repaired_provider_override_followup_receipt_validation"
          : "monitor_recovered_pressure_memory_provenance_receipt_contract"
        : matching.some((row: any) => Number(row.provider_switch_execution_mismatch_count || 0) > 0)
          ? "monitor_provider_switch_execution_mismatch_history"
        : crossGroupProviderReliabilitySignal?.actionable === true
          ? "monitor_cross_group_provider_reliability_guidance"
          : "monitor_pressure_memory_provenance_receipt_contract",
    severity: active && (
      Number(top.effective_violation_count || top.violation_count || 0) >= threshold * 2
      || Number(top.provider_switch_execution_mismatch_count || 0) >= providerSwitchExecutionMismatchThreshold * 2
    ) ? "high" : active ? "medium" : "none",
    receiptContractMode: pressureDisciplineActive ? "strict_required_for_pressure_memory" : active ? "preemptive_ack_and_empty_usage_allowed" : "default",
    ackRequired: active,
    finalReceiptVerificationRequired: active,
    memoryProvenanceUsageRequiredWhenPressureMemoryPresent: active,
    currentSourceVerificationRequiredWhenUsed: active,
    closeGate: active ? "do_not_close_until_memoryProvenanceUsage_is_present_or_explicitly_empty_with_reason" : "default_receipt_review",
    requiredReceiptFields: active
      ? ["memoryProvenanceUsage", "relPath", "usageState", "provenanceStatus", "repairWorkItemId", "repairStatus", "repairGapType", "currentSourceVerified"]
      : [],
    policyRows,
    relPaths: uniqueStrings(policyRows.flatMap((row: any) => [
      ...(Array.isArray(row.rel_paths) ? row.rel_paths : []),
      ...(Array.isArray(row.provider_override_followup_rel_paths) ? row.provider_override_followup_rel_paths : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_rel_paths) ? row.provider_override_followup_receipt_validation_rel_paths : []),
      ...(Array.isArray(row.provider_switch_execution_memory_rel_paths) ? row.provider_switch_execution_memory_rel_paths : []),
    ]), 16),
    repairWorkItemIds: uniqueStrings(policyRows.flatMap((row: any) => [
      ...(Array.isArray(row.repair_work_item_ids) ? row.repair_work_item_ids : []),
      ...(Array.isArray(row.provider_override_followup_work_item_ids) ? row.provider_override_followup_work_item_ids : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_repair_work_item_ids) ? row.provider_override_followup_receipt_validation_repair_work_item_ids : []),
    ]), 16),
    gapCodes: uniqueStrings(policyRows.flatMap((row: any) => [
      ...(Array.isArray(row.gap_codes) ? row.gap_codes : []),
      ...(Array.isArray(row.provider_override_followup_receipt_validation_gap_codes) ? row.provider_override_followup_receipt_validation_gap_codes : []),
      ...(Array.isArray(row.provider_switch_execution_gap_codes) ? row.provider_switch_execution_gap_codes : []),
    ]), 16),
    reason: active
      ? top.provider_switch_execution_mismatch_escalated === true
        ? compactText(`Provider switch execution typed memory found ${top.provider_switch_execution_mismatch_count || 0} mismatch(es) for expected provider=${agentType} project=${targetProject || "unknown"}; hold new approved switches for this provider/project until runner/session binding repair is verified.`, 700)
        : top.provider_override_followup_receipt_validation_escalated === true
        ? compactText(`Corrected provider override follow-up receipts failed ${top.provider_override_followup_receipt_validation_consecutive_failure_count || 0} consecutive validation attempt(s) for agentType=${agentType} project=${targetProject || "unknown"}; hold new child Agent dispatch until a receipt satisfies the full relPath/work-item/override-id/current-source contract.`, 700)
        : compactText(`Phase 137 feedback memory found repeated pressure provenance receipt violations for agentType=${agentType} project=${targetProject || "unknown"}; effective violations=${top.effective_violation_count ?? top.violation_count ?? 0} after recovery credits${top.relapsed ? `; recovered attribution relapsed with ${top.post_recovery_violation_count || 0} post-recovery violation(s)` : ""}; require stricter ACK and final receipt verification before child Agent closure.`, 700)
      : disabled
        ? "pressure provenance feedback dispatch policy disabled"
        : recovered.length
          ? matching.some((row: any) => row.provider_override_followup_receipt_validation_repair_verified === true)
            ? "corrected provider override follow-up receipt passed after prior failures; clear the active failure streak, retain audit history, and allow monitored receipt sampling"
            : matching.some((row: any) => row.provider_override_followup_repaired === true)
            ? "matching attribution has verified provider dispatch override follow-up repair history; allow only with receipt sampling and current evidence checks"
            : "matching attribution recovered below frequent violation threshold after compliant pressure provenance receipts"
        : matching.some((row: any) => Number(row.provider_switch_execution_mismatch_count || 0) > 0)
          ? "provider switch execution mismatch history exists; keep future switches under receipt sampling and do not treat past passed switch executions as authorization"
        : crossGroupProviderReliabilitySignal?.actionable === true
          ? `privacy-redacted cross-group provider reliability is ${crossGroupProviderReliabilitySignal.risk_status || "unknown"} for agentType=${agentType}; this is receipt-sampling guidance only and cannot override this group's local hold/allow policy`
        : matching.length
          ? "matching attribution exists but has not reached frequent violation threshold"
          : "no matching pressure provenance pre-dispatch compliance feedback attribution",
  };
}

export function normalizeRecallScope(value: any) {
  return safeSegment(value || "global", "global");
}

export function getGroupTypedMemoryRecallScopeStats(groupId: string, scope = "global") {
  const ledger = readGroupTypedMemoryRecallLedger(groupId);
  const key = normalizeRecallScope(scope);
  const scoped = ledger.scopes?.[key] || {};
  return {
    schema: "ccm-group-typed-memory-recall-scope-stats-v1",
    version: 1,
    groupId,
    scope: key,
    deliveredBytes: Math.max(0, Number(scoped.deliveredBytes || scoped.delivered_bytes || 0)),
    deliveredTokens: Math.max(0, Number(scoped.deliveredTokens || scoped.delivered_tokens || 0)),
    deliveryCount: Math.max(0, Number(scoped.deliveryCount || scoped.delivery_count || 0)),
    deliveredDocumentCount: Math.max(0, Number(scoped.deliveredDocumentCount || scoped.delivered_document_count || 0)),
    compactEpoch: String(scoped.compactEpoch || scoped.compact_epoch || ""),
    taskAgentSessionId: String(scoped.taskAgentSessionId || scoped.task_agent_session_id || ""),
    updatedAt: String(scoped.updatedAt || ""),
    file: ledger.file,
  };
}

export function recordGroupTypedMemoryRecallUnlocked(groupId: string, scope: string, recall: any, query = "", options: any = {}) {
  if (options.disableLedger === true || options.disable_ledger === true || recall?.ignored) return readGroupTypedMemoryRecallLedger(groupId);
  const deliveryCapsule = options.deliveryCapsule || options.delivery_capsule || null;
  const deliveryLease = options.deliveryLease || options.delivery_lease || null;
  const capsuleDeliveredRelPaths = Array.isArray(deliveryCapsule?.delivered_rel_paths || deliveryCapsule?.deliveredRelPaths)
    ? (deliveryCapsule.delivered_rel_paths || deliveryCapsule.deliveredRelPaths).filter(Boolean)
    : null;
  const surfaced = capsuleDeliveredRelPaths !== null
    ? capsuleDeliveredRelPaths
    : Array.isArray(recall?.surfaced) ? recall.surfaced.filter(Boolean) : [];
  if (!surfaced.length) return readGroupTypedMemoryRecallLedger(groupId);
  const ledger = readGroupTypedMemoryRecallLedger(groupId);
  const key = normalizeRecallScope(scope);
  const scoped = ledger.scopes[key] || { docs: {}, updatedAt: "" };
  const at = now();
  if (deliveryLease) {
    const leaseId = String(deliveryLease.lease_id || deliveryLease.leaseId || "");
    const leaseChecksum = String(deliveryLease.lease_checksum || deliveryLease.leaseChecksum || "");
    const leaseGroupId = String(deliveryLease.group_id || deliveryLease.groupId || "");
    const leaseGroupSessionId = String(deliveryLease.group_session_id || deliveryLease.groupSessionId || "");
    const leaseTypedScopeId = leaseGroupSessionId === "default" ? leaseGroupId : `${leaseGroupId}--${leaseGroupSessionId}`;
    const leaseRelPaths = Array.isArray(deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths)
      ? (deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths).map(String).filter(Boolean)
      : [];
    const capsuleRelPaths = Array.isArray(deliveryCapsule?.delivered_rel_paths || deliveryCapsule?.deliveredRelPaths)
      ? (deliveryCapsule.delivered_rel_paths || deliveryCapsule.deliveredRelPaths).map(String).filter(Boolean)
      : [];
    const leaseValid = deliveryLease.schema === "ccm-child-typed-memory-delivery-lease-v1"
      && Number(deliveryLease.version || 0) === 1
      && String(deliveryLease.status || "") === "pending"
      && !!leaseId
      && !!leaseChecksum
      && leaseChecksum === typedMemoryDeliveryLeaseChecksum(deliveryLease)
      && leaseTypedScopeId === groupId
      && normalizeRecallScope(deliveryLease.recall_scope || deliveryLease.recallScope || "") === key
      && String(deliveryLease.task_agent_session_id || deliveryLease.taskAgentSessionId || "").startsWith("tas_")
      && String(deliveryLease.capsule_checksum || deliveryLease.capsuleChecksum || "") === String(deliveryCapsule?.capsule_checksum || deliveryCapsule?.capsuleChecksum || "")
      && Number(deliveryLease.delivered_bytes || deliveryLease.deliveredBytes || 0) === Number(deliveryCapsule?.delivered_bytes || deliveryCapsule?.deliveredBytes || 0)
      && Number(deliveryLease.delivered_tokens || deliveryLease.deliveredTokens || 0) === Number(deliveryCapsule?.delivered_tokens || deliveryCapsule?.deliveredTokens || 0)
      && JSON.stringify(leaseRelPaths) === JSON.stringify(capsuleRelPaths)
      && JSON.stringify(leaseRelPaths) === JSON.stringify(surfaced.map(String));
    if (!leaseValid) return ledger;
    const existingLease = scoped.deliveryLeases?.[leaseId] || null;
    if (existingLease?.status === "committed") {
      if (String(existingLease.leaseChecksum || "") !== leaseChecksum) return ledger;
      scoped.deliveryLeases = scoped.deliveryLeases || {};
      scoped.deliveryLeases[leaseId] = {
        ...existingLease,
        duplicateCount: Math.max(0, Number(existingLease.duplicateCount || 0)) + 1,
        lastDuplicateAt: at,
        lastCommitDuplicate: true,
      };
      scoped.updatedAt = at;
      ledger.scopes[key] = scoped;
      ledger.updatedAt = at;
      writeJsonAtomic(ledger.file, {
        schema: "ccm-group-typed-memory-recall-ledger-v1",
        version: 3,
        scopes: ledger.scopes,
        updatedAt: at,
      });
      return readGroupTypedMemoryRecallLedger(groupId);
    }
  }
  const recalledChecksums = new Map((Array.isArray(recall?.recalled) ? recall.recalled : [])
    .map((doc: any) => [String(doc.relPath || doc.rel_path || "").toLowerCase(), String(doc.checksum || doc.document_checksum || "")])
    .filter(([relPath, documentChecksum]: any) => relPath && documentChecksum));
  const currentChecksums = new Map(scanGroupTypedMemoryDocuments(groupId)
    .map((doc: any) => [String(doc.relPath || "").toLowerCase(), String(doc.checksum || "")]));
  for (const relPath of surfaced) {
    const docKey = String(relPath || "");
    const prev = scoped.docs?.[docKey] || {};
    const documentChecksum = recalledChecksums.get(docKey.toLowerCase()) || currentChecksums.get(docKey.toLowerCase()) || "";
    scoped.docs = scoped.docs || {};
    scoped.docs[docKey] = {
      relPath: docKey,
      documentChecksum,
      firstAt: prev.firstAt || at,
      lastAt: at,
      count: Number(prev.count || 0) + 1,
      lastQueryHash: checksum(String(query || ""), 16),
    };
  }
  const entries = Object.entries(scoped.docs || {}).sort((a: any, b: any) => String(a[1].lastAt || "").localeCompare(String(b[1].lastAt || ""))).slice(-200);
  scoped.docs = Object.fromEntries(entries);
  scoped.updatedAt = at;
  const scopeMetadata = options.scopeMetadata || options.scope_metadata || {};
  scoped.scope = key;
  scoped.scopeKind = String(scopeMetadata.scopeKind || scopeMetadata.scope_kind || scoped.scopeKind || "");
  scoped.targetProject = String(scopeMetadata.targetProject || scopeMetadata.target_project || scoped.targetProject || "");
  scoped.taskId = String(scopeMetadata.taskId || scopeMetadata.task_id || scoped.taskId || "");
  scoped.taskAgentSessionId = String(scopeMetadata.taskAgentSessionId || scopeMetadata.task_agent_session_id || scoped.taskAgentSessionId || "");
  scoped.compactEpoch = String(scopeMetadata.compactEpoch || scopeMetadata.compact_epoch || scoped.compactEpoch || "");
  if (deliveryCapsule?.schema === "ccm-child-typed-memory-delivery-capsule-v1") {
    scoped.deliveredBytes = Math.max(0, Number(scoped.deliveredBytes || 0)) + Math.max(0, Number(deliveryCapsule.delivered_bytes || deliveryCapsule.deliveredBytes || 0));
    scoped.deliveredTokens = Math.max(0, Number(scoped.deliveredTokens || 0)) + Math.max(0, Number(deliveryCapsule.delivered_tokens || deliveryCapsule.deliveredTokens || 0));
    scoped.deliveryCount = Math.max(0, Number(scoped.deliveryCount || 0)) + 1;
    scoped.deliveredDocumentCount = Math.max(0, Number(scoped.deliveredDocumentCount || 0)) + surfaced.length;
    scoped.lastDeliveryCapsuleChecksum = String(deliveryCapsule.capsule_checksum || deliveryCapsule.capsuleChecksum || "");
  }
  if (deliveryLease) {
    const leaseId = String(deliveryLease.lease_id || deliveryLease.leaseId || "");
    scoped.deliveryLeases = scoped.deliveryLeases || {};
    scoped.deliveryLeases[leaseId] = {
      schema: "ccm-child-typed-memory-delivery-lease-commit-v1",
      leaseId,
      leaseChecksum: String(deliveryLease.lease_checksum || deliveryLease.leaseChecksum || ""),
      capsuleChecksum: String(deliveryLease.capsule_checksum || deliveryLease.capsuleChecksum || ""),
      status: "committed",
      commitCount: 1,
      duplicateCount: 0,
      lastCommitDuplicate: false,
      committedAt: at,
      deliveredRelPaths: Array.isArray(deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths) ? (deliveryLease.delivered_rel_paths || deliveryLease.deliveredRelPaths).map(String) : [],
      deliveredBytes: Math.max(0, Number(deliveryLease.delivered_bytes || deliveryLease.deliveredBytes || 0)),
      deliveredTokens: Math.max(0, Number(deliveryLease.delivered_tokens || deliveryLease.deliveredTokens || 0)),
      queryChecksum: String(deliveryLease.query_checksum || deliveryLease.queryChecksum || ""),
      attemptSequence: Math.max(0, Number(deliveryLease.attempt_sequence || deliveryLease.attemptSequence || 0)),
    };
    scoped.deliveryLeases = Object.fromEntries(Object.entries(scoped.deliveryLeases)
      .sort((a: any, b: any) => String(a[1]?.committedAt || "").localeCompare(String(b[1]?.committedAt || "")))
      .slice(-GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE));
  }
  ledger.scopes[key] = scoped;
  ledger.scopes = Object.fromEntries(Object.entries(ledger.scopes)
    .sort((a: any, b: any) => String(a[1]?.updatedAt || "").localeCompare(String(b[1]?.updatedAt || "")))
    .slice(-GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES));
  ledger.updatedAt = at;
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-recall-ledger-v1",
    version: 3,
    scopes: ledger.scopes,
    updatedAt: at,
  });
  return readGroupTypedMemoryRecallLedger(groupId);
}

export function recordGroupTypedMemoryRecall(groupId: string, scope: string, recall: any, query = "", options: any = {}) {
  return require("./group-memory-loading").recordGroupTypedMemoryRecall(groupId, scope, recall, query, options);
}

export function typedMemoryStaleCandidateChecksum(candidate: any) {
  return checksum([
    candidate.schema,
    candidate.version,
    candidate.candidate_id,
    candidate.scope_id,
    candidate.target_project,
    candidate.task_id,
    candidate.execution_id,
    candidate.task_agent_session_id,
    candidate.memory_context_snapshot_id,
    candidate.memory_context_snapshot_checksum,
    candidate.delivery_receipt_checksum,
    candidate.rel_path,
    candidate.document_checksum,
    candidate.conflict_kind,
    candidate.recommended_action,
    candidate.conflict_reason,
    candidate.replacement_memory,
    candidate.current_source_relative_path,
    candidate.current_source_observed_checksum,
    candidate.current_source_proof_id,
    candidate.receipt_evidence_checksum,
    candidate.generated_at,
  ], 64);
}
