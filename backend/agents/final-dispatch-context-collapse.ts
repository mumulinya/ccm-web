import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { CCM_DIR } from "../core/utils";
import { estimateTextTokens } from "../system/context-budget";
import {
  ensureGroupSessionLifecycleHead,
  readGroupSessionLifecycleHead,
  withGroupSessionLifecycleCommitFence,
} from "../modules/collaboration/group-session-lifecycle-head";

export const FINAL_DISPATCH_CONTEXT_COLLAPSE_LEDGER_SCHEMA = "ccm-final-dispatch-context-collapse-ledger-v1";
export const FINAL_DISPATCH_CONTEXT_COLLAPSE_RECEIPT_SCHEMA = "ccm-final-dispatch-context-collapse-receipt-v1";
export const FINAL_DISPATCH_CONTEXT_COLLAPSE_DIR = path.join(CCM_DIR, "final-dispatch-context-collapse");
export const FINAL_DISPATCH_CONTEXT_COLLAPSE_MAX_ENTRIES = 24;
export const FINAL_DISPATCH_CONTEXT_COLLAPSE_MAX_PROJECTION_TOKENS = 2_000;

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function hash(value: any, length = 64) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value || {}))).digest("hex").slice(0, length);
}

function clean(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180) || "unknown";
}

function withoutRuntimeFields(value: any) {
  const payload = { ...(value || {}) };
  delete payload.file;
  delete payload.blocked;
  delete payload.issues;
  delete payload.checksum_valid;
  delete payload.recovered_from_backup;
  delete payload.state;
  delete payload.totals;
  delete payload.latest_entry;
  delete payload.lifecycle;
  return payload;
}

function ledgerChecksum(ledger: any) {
  const payload = withoutRuntimeFields(ledger);
  delete payload.ledger_checksum;
  return hash(payload);
}

function entryChecksum(entry: any) {
  const payload = { ...(entry || {}) };
  delete payload.entry_checksum;
  return hash(payload);
}

function receiptChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.receipt_checksum;
  return hash(payload);
}

function compactLongLine(line: string, maxChars: number) {
  const value = String(line || "");
  if (value.length <= maxChars) return value;
  const side = Math.max(40, Math.floor((maxChars - 90) / 2));
  return `${value.slice(0, side)}\n[... line compacted; sha256=${hash(value, 16)}; omitted=${Math.max(0, value.length - side * 2)} chars ...]\n${value.slice(-side)}`;
}

export function projectFinalDispatchRecentContext(context: string, tokenBudget: number) {
  const source = String(context || "");
  const budget = Math.max(0, Math.floor(Number(tokenBudget || 0)));
  const originalTokens = estimateTextTokens(source);
  if (!source || originalTokens <= budget) {
    return {
      text: source,
      compacted: false,
      original_tokens: originalTokens,
      projected_tokens: originalTokens,
      original_chars: source.length,
      projected_chars: source.length,
      omitted_lines: 0,
      source_checksum: hash(source),
      projection_checksum: hash(source),
    };
  }
  if (budget <= 0) {
    const marker = `[群聊近期上下文已从最终派发 prompt 移除；原文仍保存在当前群聊会话；sha256=${hash(source, 16)}]`;
    return {
      text: marker,
      compacted: true,
      original_tokens: originalTokens,
      projected_tokens: estimateTextTokens(marker),
      original_chars: source.length,
      projected_chars: marker.length,
      omitted_lines: source.split(/\r?\n/).length,
      source_checksum: hash(source),
      projection_checksum: hash(marker),
    };
  }

  const lines = source.split(/\r?\n/);
  const important = /(?:必须|不得|禁止|验收|目标|约束|决策|结论|失败|错误|阻塞|风险|继续|task|session|gcs_|tas_|acceptance|requirement|decision|constraint|error|failed|blocked)/i;
  const selected = new Set<number>();
  for (let index = 0; index < Math.min(10, lines.length); index += 1) selected.add(index);
  for (let index = 0; index < lines.length; index += 1) if (important.test(lines[index])) selected.add(index);
  for (let index = Math.max(0, lines.length - 80); index < lines.length; index += 1) selected.add(index);

  const render = (indexes: number[]) => {
    const rows: string[] = [];
    let previous = -1;
    for (const index of indexes) {
      if (previous >= 0 && index > previous + 1) rows.push(`[... ${index - previous - 1} older context lines omitted ...]`);
      rows.push(compactLongLine(lines[index], 1800));
      previous = index;
    }
    return rows.join("\n");
  };

  let indexes = Array.from(selected).sort((left, right) => left - right);
  let projected = render(indexes);
  while (indexes.length > 4 && estimateTextTokens(projected) > budget) {
    const removable = indexes.findIndex(index => index >= 10 && index < lines.length - 24 && !important.test(lines[index]));
    if (removable >= 0) indexes.splice(removable, 1);
    else indexes.splice(Math.min(10, indexes.length - 2), 1);
    projected = render(indexes);
  }
  if (estimateTextTokens(projected) > budget) {
    const maxChars = Math.max(160, budget * 3);
    const headChars = Math.min(Math.floor(maxChars * 0.35), projected.length);
    const tailChars = Math.max(80, maxChars - headChars - 100);
    projected = `${projected.slice(0, headChars)}\n[... context projection tightened; sha256=${hash(source, 16)} ...]\n${projected.slice(-tailChars)}`;
  }
  return {
    text: projected,
    compacted: true,
    original_tokens: originalTokens,
    projected_tokens: estimateTextTokens(projected),
    original_chars: source.length,
    projected_chars: projected.length,
    omitted_lines: Math.max(0, lines.length - indexes.length),
    source_checksum: hash(source),
    projection_checksum: hash(projected),
  };
}

export function getFinalDispatchContextCollapseFile(groupId: string, groupSessionId: string) {
  return path.join(FINAL_DISPATCH_CONTEXT_COLLAPSE_DIR, clean(groupId), `${clean(groupSessionId)}.json`);
}

function emptyLedger(groupId: string, groupSessionId: string, file: string) {
  return {
    schema: FINAL_DISPATCH_CONTEXT_COLLAPSE_LEDGER_SCHEMA,
    version: 1,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    revision: 0,
    entries: [] as any[],
    updated_at: "",
    ledger_checksum: "",
    checksum_valid: true,
    file,
  };
}

export function verifyFinalDispatchContextCollapseLedger(ledger: any, expected: any = {}) {
  const issues: string[] = [];
  if (ledger?.schema !== FINAL_DISPATCH_CONTEXT_COLLAPSE_LEDGER_SCHEMA || Number(ledger?.version || 0) !== 1) issues.push("final_dispatch_context_collapse_schema_invalid");
  if (!String(ledger?.group_id || "")) issues.push("final_dispatch_context_collapse_group_missing");
  if (!String(ledger?.group_session_id || "").startsWith("gcs_")) issues.push("final_dispatch_context_collapse_exact_session_missing");
  if (String(ledger?.scope_id || "") !== `${String(ledger?.group_id || "")}::${String(ledger?.group_session_id || "")}`) issues.push("final_dispatch_context_collapse_scope_invalid");
  if (!Array.isArray(ledger?.entries)) issues.push("final_dispatch_context_collapse_entries_invalid");
  if (!Number.isInteger(Number(ledger?.revision || 0)) || Number(ledger?.revision || 0) < 0) issues.push("final_dispatch_context_collapse_revision_invalid");
  const ids = new Set<string>();
  for (const entry of Array.isArray(ledger?.entries) ? ledger.entries : []) {
    const id = String(entry?.entry_id || "");
    if (!id || ids.has(id)) issues.push(!id ? "final_dispatch_context_collapse_entry_id_missing" : "final_dispatch_context_collapse_entry_duplicate");
    ids.add(id);
    if (entry?.schema !== "ccm-final-dispatch-context-collapse-entry-v1" || entry?.state !== "committed") issues.push("final_dispatch_context_collapse_entry_schema_invalid");
    if (!Number.isInteger(Number(entry?.source_prefix_line_count || 0)) || Number(entry?.source_prefix_line_count || 0) < 1) issues.push("final_dispatch_context_collapse_prefix_lines_invalid");
    if (!String(entry?.projection_text || "")) issues.push("final_dispatch_context_collapse_projection_missing");
    if (hash(String(entry?.projection_text || "")) !== String(entry?.projection_checksum || "")) issues.push("final_dispatch_context_collapse_projection_checksum_invalid");
    if (Number(entry?.lifecycle_generation || 0) < 1 || String(entry?.lifecycle_status || "") !== "active") issues.push("final_dispatch_context_collapse_lifecycle_generation_invalid");
    if (!String(entry?.lifecycle_head_id || "") || !String(entry?.lifecycle_head_checksum || "")) issues.push("final_dispatch_context_collapse_lifecycle_binding_missing");
    if (entryChecksum(entry) !== String(entry?.entry_checksum || "")) issues.push("final_dispatch_context_collapse_entry_checksum_invalid");
  }
  if (expected.groupId && String(ledger?.group_id || "") !== String(expected.groupId)) issues.push("final_dispatch_context_collapse_group_mismatch");
  if (expected.groupSessionId && String(ledger?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("final_dispatch_context_collapse_group_session_mismatch");
  if (String(ledger?.ledger_checksum || "") !== ledgerChecksum(ledger)) issues.push("final_dispatch_context_collapse_ledger_checksum_invalid");
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

function readCandidate(file: string, groupId: string, groupSessionId: string) {
  try {
    if (!fs.existsSync(file)) return null;
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { ledger, verification: verifyFinalDispatchContextCollapseLedger(ledger, { groupId, groupSessionId }) };
  } catch (error: any) {
    return { ledger: null, verification: { valid: false, issues: [String(error?.message || error).slice(0, 160)] } };
  }
}

function summarizeLedger(ledger: any) {
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const lifecycleHead = String(ledger?.group_session_id || "").startsWith("gcs_")
    ? readGroupSessionLifecycleHead(String(ledger?.group_id || ""), String(ledger?.group_session_id || ""))
    : null;
  return {
    ...ledger,
    lifecycle: lifecycleHead ? {
      status: String(lifecycleHead.status || ""),
      generation: Number(lifecycleHead.generation || 0),
      lifecycle_head_id: String(lifecycleHead.lifecycle_head_id || ""),
      lifecycle_head_checksum: String(lifecycleHead.head_checksum || ""),
    } : null,
    totals: {
      committed: entries.length,
      original_tokens: entries.reduce((sum: number, entry: any) => sum + Number(entry.original_tokens || 0), 0),
      projected_tokens: entries.reduce((sum: number, entry: any) => sum + Number(entry.projected_tokens || 0), 0),
      omitted_lines: entries.reduce((sum: number, entry: any) => sum + Number(entry.omitted_lines || 0), 0),
    },
    latest_entry: entries.at(-1) || null,
  };
}

export function readFinalDispatchContextCollapse(groupId: string, groupSessionId: string) {
  const id = String(groupId || "").trim();
  const sessionId = String(groupSessionId || "").trim();
  const file = getFinalDispatchContextCollapseFile(id, sessionId);
  if (!id || !sessionId.startsWith("gcs_")) {
    return summarizeLedger({ ...emptyLedger(id, sessionId, file), state: "fail_closed", blocked: true, checksum_valid: false, issues: ["exact_group_session_required"] });
  }
  const primary = readCandidate(file, id, sessionId);
  if (primary?.verification.valid) return summarizeLedger({ ...primary.ledger, checksum_valid: true, blocked: false, issues: [], file, recovered_from_backup: false });
  const backup = readCandidate(`${file}.bak`, id, sessionId);
  if (backup?.verification.valid) {
    return summarizeLedger({
      ...backup.ledger,
      state: "fail_closed",
      blocked: true,
      checksum_valid: true,
      issues: [...new Set(["final_dispatch_context_collapse_primary_unavailable", ...(primary?.verification.issues || [])])],
      file,
      recovered_from_backup: true,
    });
  }
  if (fs.existsSync(file) || fs.existsSync(`${file}.bak`)) {
    return summarizeLedger({
      ...emptyLedger(id, sessionId, file),
      state: "fail_closed",
      blocked: true,
      checksum_valid: false,
      issues: [...new Set([...(primary?.verification.issues || []), ...(backup?.verification.issues || []), "final_dispatch_context_collapse_unreadable"])],
    });
  }
  return summarizeLedger({ ...emptyLedger(id, sessionId, file), blocked: false, issues: [] });
}

function saveLedger(file: string, current: any, entries: any[], at: string) {
  const core: any = {
    schema: FINAL_DISPATCH_CONTEXT_COLLAPSE_LEDGER_SCHEMA,
    version: 1,
    group_id: current.group_id,
    group_session_id: current.group_session_id,
    scope_id: current.scope_id,
    revision: Number(current.revision || 0) + 1,
    entries: entries.slice(-FINAL_DISPATCH_CONTEXT_COLLAPSE_MAX_ENTRIES),
    updated_at: at,
  };
  const saved = { ...core, ledger_checksum: ledgerChecksum(core) };
  writeJsonAtomic(file, saved);
  return summarizeLedger({ ...saved, checksum_valid: true, blocked: false, issues: [], file });
}

function applyEntry(source: string, entry: any, lifecycleHead: any = null) {
  const lines = source.split(/\r?\n/);
  const count = Number(entry?.source_prefix_line_count || 0);
  if (!count || count > lines.length) return null;
  if (lifecycleHead && (
    String(lifecycleHead.status || "") !== "active"
    || Number(entry?.lifecycle_generation || 0) !== Number(lifecycleHead.generation || 0)
    || String(entry?.lifecycle_head_id || "") !== String(lifecycleHead.lifecycle_head_id || "")
    || String(entry?.lifecycle_head_checksum || "") !== String(lifecycleHead.head_checksum || "")
  )) return null;
  const prefix = lines.slice(0, count).join("\n");
  if (hash(prefix) !== String(entry?.source_prefix_checksum || "")) return null;
  const tail = lines.slice(count).join("\n");
  const text = [String(entry.projection_text || ""), tail].filter(Boolean).join("\n");
  return { text, prefix, tail, entry };
}

function buildReceipt(input: any, mode: "committed" | "reused", entry: any, ledger: any, source: string, projected: string) {
  const core: any = {
    schema: FINAL_DISPATCH_CONTEXT_COLLAPSE_RECEIPT_SCHEMA,
    version: 1,
    receipt_id: `fdccr_${hash([entry.entry_id, mode, hash(source), hash(projected)], 24)}`,
    mode,
    status: "applied",
    group_id: String(input.groupId || input.group_id || ""),
    group_session_id: String(input.groupSessionId || input.group_session_id || ""),
    task_id: String(input.taskId || input.task_id || ""),
    task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || ""),
    worker_context_packet_id: String(input.workerContextPacketId || input.worker_context_packet_id || ""),
    entry_id: String(entry.entry_id || ""),
    entry_checksum: String(entry.entry_checksum || ""),
    source_context_checksum: hash(source),
    projected_context_checksum: hash(projected),
    source_prefix_checksum: String(entry.source_prefix_checksum || ""),
    source_prefix_line_count: Number(entry.source_prefix_line_count || 0),
    original_tokens: estimateTextTokens(source),
    projected_tokens: estimateTextTokens(projected),
    omitted_lines: Number(entry.omitted_lines || 0),
    projection_token_budget: Number(entry.projection_token_budget || 0),
    trigger: String(input.trigger || entry.trigger || "preflight_threshold"),
    lifecycle_generation: Number(entry.lifecycle_generation || 0),
    lifecycle_status: String(entry.lifecycle_status || ""),
    lifecycle_head_id: String(entry.lifecycle_head_id || ""),
    lifecycle_head_checksum: String(entry.lifecycle_head_checksum || ""),
    lifecycle_validation_status: "current_active",
    ledger_revision: Number(ledger.revision || 0),
    ledger_checksum: String(ledger.ledger_checksum || ""),
    created_at: String(input.at || new Date().toISOString()),
  };
  return { ...core, receipt_checksum: receiptChecksum(core) };
}

export function verifyFinalDispatchContextCollapseReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== FINAL_DISPATCH_CONTEXT_COLLAPSE_RECEIPT_SCHEMA || Number(receipt?.version || 0) !== 1) issues.push("final_dispatch_context_collapse_receipt_schema_invalid");
  if (!String(receipt?.receipt_id || "") || receipt?.status !== "applied" || !["committed", "reused"].includes(String(receipt?.mode || ""))) issues.push("final_dispatch_context_collapse_receipt_state_invalid");
  if (receiptChecksum(receipt) !== String(receipt?.receipt_checksum || "")) issues.push("final_dispatch_context_collapse_receipt_checksum_invalid");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("final_dispatch_context_collapse_receipt_exact_session_missing");
  if (Number(receipt?.projected_tokens || 0) >= Number(receipt?.original_tokens || 0)) issues.push("final_dispatch_context_collapse_receipt_not_reduced");
  if (Number(receipt?.lifecycle_generation || 0) < 1 || String(receipt?.lifecycle_status || "") !== "active" || receipt?.lifecycle_validation_status !== "current_active") issues.push("final_dispatch_context_collapse_receipt_lifecycle_invalid");
  if (!String(receipt?.lifecycle_head_id || "") || !String(receipt?.lifecycle_head_checksum || "")) issues.push("final_dispatch_context_collapse_receipt_lifecycle_binding_missing");
  for (const [field, value] of [
    ["group_id", expected.groupId || expected.group_id],
    ["group_session_id", expected.groupSessionId || expected.group_session_id],
    ["task_id", expected.taskId || expected.task_id],
    ["task_agent_session_id", expected.taskAgentSessionId || expected.task_agent_session_id],
    ["worker_context_packet_id", expected.workerContextPacketId || expected.worker_context_packet_id],
  ]) if (value && String(receipt?.[field] || "") !== String(value)) issues.push(`final_dispatch_context_collapse_receipt_${field}_mismatch`);
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}

export function projectFinalDispatchContextCollapse(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const source = String(input.sourceContext || input.source_context || "");
  const ledger = readFinalDispatchContextCollapse(groupId, groupSessionId);
  if (!source || ledger.blocked) return { applied: false, reason: ledger.blocked ? "context_collapse_fail_closed" : "context_empty", context: source, receipt: null, ledger };
  const lifecycleHead = readGroupSessionLifecycleHead(groupId, groupSessionId);
  if (!lifecycleHead || lifecycleHead.status !== "active") return { applied: false, reason: `session_lifecycle_${String(lifecycleHead?.status || "missing")}`, context: source, receipt: null, ledger, lifecycleHead };
  const entries = [...(ledger.entries || [])].reverse();
  for (const entry of entries) {
    const applied = applyEntry(source, entry, lifecycleHead);
    if (!applied || estimateTextTokens(applied.text) >= estimateTextTokens(source)) continue;
    return { applied: true, reason: "durable_context_collapse_reused", context: applied.text, receipt: buildReceipt(input, "reused", entry, ledger, source, applied.text), entry, ledger };
  }
  return { applied: false, reason: "no_matching_context_prefix", context: source, receipt: null, ledger };
}

export function commitFinalDispatchContextCollapse(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const source = String(input.sourceContext || input.source_context || "");
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("final dispatch context collapse requires groupId + gcs_* identity");
  if (!source) return { applied: false, reason: "context_empty", context: source, receipt: null };
  const file = getFinalDispatchContextCollapseFile(groupId, groupSessionId);
  try {
    const lifecycleHead = ensureGroupSessionLifecycleHead(groupId, groupSessionId, { reason: "final_dispatch_context_collapse_lazy_adopt" }).head;
    const lifecycleFence = {
      groupId,
      groupSessionId,
      lifecycleGeneration: Number(lifecycleHead?.generation || 0),
      lifecycleStatus: String(lifecycleHead?.status || ""),
      lifecycleHeadId: String(lifecycleHead?.lifecycle_head_id || ""),
      lifecycleHeadChecksum: String(lifecycleHead?.head_checksum || ""),
    };
    return withGroupSessionLifecycleCommitFence(lifecycleFence, ({ validation, head }) => withFileLock(file, () => {
    const current = readFinalDispatchContextCollapse(groupId, groupSessionId);
    if (current.blocked) return { applied: false, reason: "context_collapse_fail_closed", context: source, receipt: null, ledger: current };
    const requestedBudget = Math.max(128, Math.floor(Number(input.tokenBudget || input.token_budget || Math.max(256, estimateTextTokens(source) * 0.5))));
    if (input.forceNew !== true && input.force_new !== true) {
      for (const existing of [...(current.entries || [])].reverse()) {
        const reused = applyEntry(source, existing, head);
        if (!reused || Number(existing.projection_token_budget || 0) > requestedBudget || estimateTextTokens(reused.text) >= estimateTextTokens(source)) continue;
        return { applied: true, reason: "durable_context_collapse_reused", context: reused.text, receipt: buildReceipt(input, "reused", existing, current, source, reused.text), entry: existing, ledger: current };
      }
    }

    const lines = source.split(/\r?\n/);
    const preserveTailLines = Math.min(32, Math.max(6, Math.floor(lines.length * 0.3)));
    let prefixLineCount = Math.max(0, lines.length - preserveTailLines);
    if (prefixLineCount < 8 && lines.length >= 8) prefixLineCount = lines.length;
    if (prefixLineCount < 1) return { applied: false, reason: "context_too_small", context: source, receipt: null, ledger: current };
    const prefix = lines.slice(0, prefixLineCount).join("\n");
    const tail = lines.slice(prefixLineCount).join("\n");
    const tailTokens = estimateTextTokens(tail);
    const prefixBudget = Math.max(96, Math.min(FINAL_DISPATCH_CONTEXT_COLLAPSE_MAX_PROJECTION_TOKENS, requestedBudget - tailTokens - 48));
    const projection = projectFinalDispatchRecentContext(prefix, prefixBudget);
    if (!projection.compacted) return { applied: false, reason: "prefix_within_budget", context: source, receipt: null, ledger: current };
    const marker = `[... durable context collapse: ${prefixLineCount} historical lines projected; source_sha256=${hash(prefix, 16)}; original transcript preserved ...]`;
    const projectionText = `${projection.text}\n${marker}`;
    const projectedContext = [projectionText, tail].filter(Boolean).join("\n");
    if (estimateTextTokens(projectedContext) >= estimateTextTokens(source)) return { applied: false, reason: "collapse_did_not_reduce_context", context: source, receipt: null, ledger: current };
    const at = String(input.at || new Date().toISOString());
    const core: any = {
      schema: "ccm-final-dispatch-context-collapse-entry-v1",
      version: 1,
      entry_id: `fdcc_${hash([groupId, groupSessionId, hash(prefix), hash(projectionText), prefixBudget], 24)}`,
      state: "committed",
      trigger: String(input.trigger || "preflight_threshold"),
      source_prefix_line_count: prefixLineCount,
      source_prefix_checksum: hash(prefix),
      source_context_checksum: hash(source),
      projection_text: projectionText,
      projection_checksum: hash(projectionText),
      projection_token_budget: prefixBudget,
      original_tokens: estimateTextTokens(source),
      projected_tokens: estimateTextTokens(projectedContext),
      original_chars: source.length,
      projected_chars: projectedContext.length,
      omitted_lines: Number(projection.omitted_lines || 0),
      task_id: String(input.taskId || input.task_id || ""),
      task_agent_session_id: String(input.taskAgentSessionId || input.task_agent_session_id || ""),
      worker_context_packet_id: String(input.workerContextPacketId || input.worker_context_packet_id || ""),
      lifecycle_generation: Number(head?.generation || 0),
      lifecycle_status: String(head?.status || ""),
      lifecycle_head_id: String(head?.lifecycle_head_id || ""),
      lifecycle_head_checksum: String(head?.head_checksum || ""),
      lifecycle_validation_status: String(validation?.status || "current_active"),
      committed_at: at,
    };
    const entry = { ...core, entry_checksum: entryChecksum(core) };
    const entries = [...(current.entries || []).filter((row: any) => row.entry_id !== entry.entry_id), entry];
    const ledger = saveLedger(file, current, entries, at);
    return { applied: true, reason: "durable_context_collapse_committed", context: projectedContext, receipt: buildReceipt(input, "committed", entry, ledger, source, projectedContext), entry, ledger };
    }));
  } catch (error: any) {
    return {
      applied: false,
      reason: error?.code === "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE" ? "session_lifecycle_stale" : "session_lifecycle_fail_closed",
      context: source,
      receipt: null,
      lifecycleValidation: error?.lifecycleValidation || null,
      errorCode: String(error?.code || "SESSION_LIFECYCLE_FENCE_FAILED"),
    };
  }
}

export function deleteFinalDispatchContextCollapse(groupId: string, groupSessionId: string) {
  const file = getFinalDispatchContextCollapseFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    let deleted = 0;
    for (const candidate of [file, `${file}.bak`]) {
      try { if (fs.existsSync(candidate)) { fs.unlinkSync(candidate); deleted += 1; } } catch {}
    }
    return { deleted, groupId, groupSessionId, file };
  });
}
