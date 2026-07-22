import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { verifyProviderNativeCompactExecutionReceipt } from "./provider-native-compact-execution-receipt";

const ROOT = path.join(os.homedir(), ".cc-connect", "group-prompt-cache-break-detection");
const SCHEMA = "ccm-group-prompt-cache-break-ledger-v1";
const NOTIFICATION_SCHEMA = "ccm-group-prompt-cache-compaction-notification-v1";
const CACHE_DELETION_NOTIFICATION_SCHEMA = "ccm-group-prompt-cache-deletion-notification-v1";
const VERSION = 1;
const MIN_CACHE_MISS_TOKENS = 2_000;
const CACHE_TTL_5MIN_MS = 5 * 60 * 1000;
const CACHE_TTL_1HOUR_MS = 60 * 60 * 1000;
const MAX_EVENTS = 64;

function clean(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}

function sha(value: any, length = 64) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}

function finite(value: any) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function ledgerChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.file;
  delete payload.ledger_checksum;
  delete payload.checksum_valid;
  delete payload.recovered_from_backup;
  return sha(payload);
}

function receiptChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.receipt_checksum;
  delete payload.checksum_valid;
  return sha(payload);
}

function eventChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.event_checksum;
  return sha(payload);
}

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function stripCacheControl(value: any): any {
  if (Array.isArray(value)) return value.map(stripCacheControl);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort()
    .filter(key => key !== "cache_control" && key !== "cacheControl")
    .map(key => [key, stripCacheControl(value[key])]));
}

function collectCacheControl(value: any, pathParts: string[] = [], output: any[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCacheControl(item, [...pathParts, String(index)], output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const key of Object.keys(value).sort()) {
    if (key === "cache_control" || key === "cacheControl") output.push({ path: [...pathParts, key].join("."), value: stableValue(value[key]) });
    else collectCacheControl(value[key], [...pathParts, key], output);
  }
  return output;
}

function textLength(value: any): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + textLength(item), 0);
  if (!value || typeof value !== "object") return 0;
  return Object.entries(value).reduce((sum, [key, item]) => sum + (["text", "content", "thinking"].includes(key) ? textLength(item) : 0), 0);
}

function sanitizeToolName(value: any) {
  const name = String(value || "unknown");
  return name.startsWith("mcp__") ? "mcp" : clean(name).slice(0, 80);
}

function promptStateChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.snapshot_checksum;
  delete payload.checksum_valid;
  return sha(stableValue(payload));
}

function promptChangeChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.changes_checksum;
  return sha(stableValue(payload));
}

export function getGroupPromptCacheBreakDetectionFile(groupId: string, groupSessionId: string) {
  return path.join(ROOT, clean(groupId), `${clean(groupSessionId)}.json`);
}

function emptyLedger(groupId: string, groupSessionId: string) {
  return {
    schema: SCHEMA,
    version: VERSION,
    group_id: String(groupId || ""),
    group_session_id: String(groupSessionId || ""),
    scope_id: `${String(groupId || "")}--${String(groupSessionId || "")}`,
    status: "empty",
    revision: 0,
    call_count: 0,
    cache_break_count: 0,
    baseline_generation: 0,
    previous_cache_read_tokens: null as number | null,
    pending_post_compaction: null as any,
    pending_cache_deletion: null as any,
    cache_deletion_notification_count: 0,
    cache_deletion_consumed_count: 0,
    recent_cache_deletion_notifications: [] as any[],
    prompt_state_call_count: 0,
    prompt_state_baseline: null as any,
    pending_prompt_changes: null as any,
    last_prompt_state_event: null as any,
    recent_prompt_state_events: [] as any[],
    last_api_success_at: "",
    last_event: null as any,
    last_group_main_context_usage_event: null as any,
    recent_events: [] as any[],
    updated_at: "",
  };
}

function validateLedger(value: any, groupId: string, groupSessionId: string) {
  const issues: string[] = [];
  if (value?.schema !== SCHEMA || Number(value?.version || 0) !== VERSION) issues.push("schema_invalid");
  if (String(value?.group_id || "") !== groupId) issues.push("group_mismatch");
  if (String(value?.group_session_id || "") !== groupSessionId) issues.push("session_mismatch");
  if (String(value?.scope_id || "") !== `${groupId}--${groupSessionId}`) issues.push("scope_mismatch");
  if (String(value?.ledger_checksum || "") !== ledgerChecksum(value)) issues.push("checksum_invalid");
  return { valid: issues.length === 0, issues };
}

function parseLedgerFile(file: string, groupId: string, groupSessionId: string) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf-8"));
    const verification = validateLedger(value, groupId, groupSessionId);
    return { present: true, value, ...verification };
  } catch (error: any) {
    return { present: fs.existsSync(file), value: null, valid: false, issues: [error?.message || "parse_failed"] };
  }
}

function persistLedger(file: string, value: any) {
  const core = {
    ...value,
    recent_events: (Array.isArray(value?.recent_events) ? value.recent_events : []).slice(-MAX_EVENTS),
    recent_prompt_state_events: (Array.isArray(value?.recent_prompt_state_events) ? value.recent_prompt_state_events : []).slice(-MAX_EVENTS),
    recent_cache_deletion_notifications: (Array.isArray(value?.recent_cache_deletion_notifications) ? value.recent_cache_deletion_notifications : []).slice(-MAX_EVENTS),
  };
  const stored = { ...core, ledger_checksum: ledgerChecksum(core) };
  writeJsonAtomic(file, stored);
  return { ...stored, file, checksum_valid: true };
}

export function verifyGroupPromptCacheStateSnapshot(snapshot: any, expected: any = {}) {
  const issues: string[] = [];
  if (snapshot?.schema !== "ccm-group-prompt-cache-state-snapshot-v1" || Number(snapshot?.version || 0) !== VERSION) issues.push("prompt_state_schema_invalid");
  if (!String(snapshot?.group_id || "")) issues.push("prompt_state_group_missing");
  if (!String(snapshot?.group_session_id || "").startsWith("gcs_")) issues.push("prompt_state_exact_session_missing");
  if (String(snapshot?.scope_id || "") !== `${String(snapshot?.group_id || "")}--${String(snapshot?.group_session_id || "")}`) issues.push("prompt_state_scope_invalid");
  if (!String(snapshot?.snapshot_id || "") || !String(snapshot?.system_hash || "") || !String(snapshot?.tool_schemas_hash || "")) issues.push("prompt_state_identity_missing");
  if (snapshot?.body_free !== true) issues.push("prompt_state_body_free_missing");
  if (String(snapshot?.snapshot_checksum || "") !== promptStateChecksum(snapshot)) issues.push("prompt_state_checksum_invalid");
  if (expected.groupId && String(snapshot?.group_id || "") !== String(expected.groupId)) issues.push("prompt_state_group_mismatch");
  if (expected.groupSessionId && String(snapshot?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("prompt_state_session_mismatch");
  return { valid: issues.length === 0, issues };
}

export function recordGroupPromptCacheState(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) return { recorded: false, reason: "exact_group_session_required" };
  const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
    if (current.checksum_valid !== true) return { recorded: false, reason: "prompt_cache_ledger_fail_closed", ledger: current };
    const system = input.system ?? input.systemPrompt ?? input.system_prompt ?? [];
    const tools = Array.isArray(input.toolSchemas || input.tool_schemas || input.tools) ? (input.toolSchemas || input.tool_schemas || input.tools) : [];
    const toolRows = tools.map((tool: any, index: number) => ({
      name: sanitizeToolName(tool?.name || `tool_${index}`),
      hash: sha(stableValue(stripCacheControl(tool)), 24),
    })).sort((a: any, b: any) => `${a.name}:${a.hash}`.localeCompare(`${b.name}:${b.hash}`));
    const betas = (Array.isArray(input.betas || input.betaHeaders || input.beta_headers) ? (input.betas || input.betaHeaders || input.beta_headers) : [])
      .map((value: any) => clean(value).slice(0, 120)).filter(Boolean).sort();
    const at = String(input.at || input.recordedAt || input.recorded_at || new Date().toISOString());
    const callNumber = Math.max(0, Number(current.prompt_state_call_count || 0)) + 1;
    const core: any = {
      schema: "ccm-group-prompt-cache-state-snapshot-v1",
      version: VERSION,
      snapshot_id: `gpcs_${sha(`${groupId}\0${groupSessionId}\0${callNumber}\0${at}`, 24)}`,
      group_id: groupId,
      group_session_id: groupSessionId,
      scope_id: `${groupId}--${groupSessionId}`,
      source: String(input.source || "group_main"),
      provider: String(input.provider || "anthropic").toLowerCase(),
      model: String(input.model || ""),
      system_hash: sha(stableValue(stripCacheControl(system)), 24),
      cache_control_hash: sha(stableValue(collectCacheControl(system)), 24),
      tool_schemas_hash: sha(stableValue(toolRows), 24),
      tool_schema_hashes: toolRows,
      tool_names: toolRows.map((row: any) => row.name),
      system_char_count: textLength(system),
      fast_mode: input.fastMode === true || input.fast_mode === true,
      global_cache_strategy: String(input.globalCacheStrategy || input.global_cache_strategy || ""),
      betas,
      cached_microcompact_enabled: input.cachedMicrocompactEnabled === true || input.cached_microcompact_enabled === true,
      effort_value: String(input.effortValue ?? input.effort_value ?? ""),
      extra_body_hash: sha(stableValue(input.extraBodyParams ?? input.extra_body_params ?? {}), 24),
      body_free: true,
      recorded_at: at,
    };
    const snapshot = { ...core, snapshot_checksum: promptStateChecksum(core) };
    const previous = current.prompt_state_baseline || null;
    const flags: any = previous ? {
      system_prompt_changed: snapshot.system_hash !== previous.system_hash,
      tool_schemas_changed: snapshot.tool_schemas_hash !== previous.tool_schemas_hash,
      model_changed: snapshot.model !== previous.model,
      provider_changed: snapshot.provider !== previous.provider,
      fast_mode_changed: snapshot.fast_mode !== previous.fast_mode,
      cache_control_changed: snapshot.cache_control_hash !== previous.cache_control_hash,
      global_cache_strategy_changed: snapshot.global_cache_strategy !== previous.global_cache_strategy,
      betas_changed: JSON.stringify(snapshot.betas) !== JSON.stringify(previous.betas || []),
      cached_microcompact_changed: snapshot.cached_microcompact_enabled !== previous.cached_microcompact_enabled,
      effort_changed: snapshot.effort_value !== previous.effort_value,
      extra_body_changed: snapshot.extra_body_hash !== previous.extra_body_hash,
    } : {};
    const causes = Object.entries(flags).filter(([, changed]) => changed === true).map(([key]) => key);
    const previousTools = Array.isArray(previous?.tool_schema_hashes) ? previous.tool_schema_hashes : [];
    const previousNames = new Set(previousTools.map((row: any) => row.name));
    const currentNames = new Set(toolRows.map((row: any) => row.name));
    const changesCore: any = previous && causes.length ? {
      schema: "ccm-group-prompt-cache-pending-changes-v1",
      version: VERSION,
      previous_snapshot_id: String(previous.snapshot_id || ""),
      current_snapshot_id: snapshot.snapshot_id,
      causes,
      flags,
      previous_model: String(previous.model || ""),
      new_model: snapshot.model,
      system_char_delta: Number(snapshot.system_char_count || 0) - Number(previous.system_char_count || 0),
      added_tools: [...currentNames].filter(name => !previousNames.has(name)).slice(0, 32),
      removed_tools: [...previousNames].filter(name => !currentNames.has(name)).slice(0, 32),
      changed_tool_schemas: toolRows.filter((row: any, index: number) => previousTools[index]?.name === row.name && previousTools[index]?.hash !== row.hash).map((row: any) => row.name).slice(0, 32),
      added_betas: snapshot.betas.filter((value: string) => !(previous.betas || []).includes(value)).slice(0, 16),
      removed_betas: (previous.betas || []).filter((value: string) => !snapshot.betas.includes(value)).slice(0, 16),
      body_free: true,
      recorded_at: at,
    } : null;
    const changes = changesCore ? { ...changesCore, changes_checksum: promptChangeChecksum(changesCore) } : null;
    const eventCore: any = {
      schema: "ccm-group-prompt-cache-state-event-v1",
      version: VERSION,
      event_id: `gpcse_${sha(`${snapshot.snapshot_id}\0${callNumber}`, 24)}`,
      group_id: groupId,
      group_session_id: groupSessionId,
      source: snapshot.source,
      snapshot_id: snapshot.snapshot_id,
      snapshot_checksum: snapshot.snapshot_checksum,
      call_number: callNumber,
      changed: causes.length > 0,
      causes,
      body_free: true,
      recorded_at: at,
    };
    const event = { ...eventCore, event_checksum: eventChecksum(eventCore) };
    const stored = persistLedger(file, {
      ...current,
      status: "prompt_state_recorded",
      revision: Math.max(0, Number(current.revision || 0)) + 1,
      prompt_state_call_count: callNumber,
      prompt_state_baseline: snapshot,
      pending_prompt_changes: changes,
      last_prompt_state_event: event,
      recent_prompt_state_events: [...(Array.isArray(current.recent_prompt_state_events) ? current.recent_prompt_state_events : []), event],
      updated_at: at,
    });
    return { recorded: true, snapshot, changes, event, ledger: stored };
  });
}

export function readGroupPromptCacheBreakDetection(groupId: string, groupSessionId: string) {
  const id = String(groupId || "").trim();
  const sessionId = String(groupSessionId || "").trim();
  const file = getGroupPromptCacheBreakDetectionFile(id, sessionId);
  const primary = parseLedgerFile(file, id, sessionId);
  if (primary.present && primary.valid) return { ...primary.value, file, checksum_valid: true, recovered_from_backup: false };
  const backup = parseLedgerFile(`${file}.bak`, id, sessionId);
  if (backup.present && backup.valid) return { ...backup.value, file, checksum_valid: true, recovered_from_backup: true };
  if (!primary.present && !backup.present) {
    const value = emptyLedger(id, sessionId);
    return { ...value, file, ledger_checksum: ledgerChecksum(value), checksum_valid: true, recovered_from_backup: false };
  }
  const value = emptyLedger(id, sessionId);
  return {
    ...value,
    status: "fail_closed",
    file,
    checksum_valid: false,
    recovered_from_backup: false,
    issues: [...primary.issues, ...backup.issues].slice(0, 8),
  };
}

export function verifyGroupPromptCacheCompactionNotification(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== NOTIFICATION_SCHEMA || Number(receipt?.version || 0) !== VERSION) issues.push("prompt_cache_compaction_notification_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("prompt_cache_compaction_notification_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("prompt_cache_compaction_notification_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`) issues.push("prompt_cache_compaction_notification_scope_invalid");
  if (!String(receipt?.boundary_id || "")) issues.push("prompt_cache_compaction_notification_boundary_missing");
  if (!String(receipt?.post_compact_session_state_reset_checksum || "")) issues.push("prompt_cache_compaction_notification_reset_receipt_missing");
  if (Number(receipt?.baseline_generation || 0) < 1) issues.push("prompt_cache_compaction_notification_generation_invalid");
  if (receipt?.baseline_status !== "reset_pending_next_api_success") issues.push("prompt_cache_compaction_notification_status_invalid");
  if (receipt?.body_free !== true) issues.push("prompt_cache_compaction_notification_body_free_missing");
  if (String(receipt?.receipt_checksum || "") !== receiptChecksum(receipt)) issues.push("prompt_cache_compaction_notification_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("prompt_cache_compaction_notification_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("prompt_cache_compaction_notification_session_mismatch");
  if (expected.boundaryId && String(receipt?.boundary_id || "") !== String(expected.boundaryId)) issues.push("prompt_cache_compaction_notification_boundary_mismatch");
  if (expected.resetReceiptChecksum && String(receipt?.post_compact_session_state_reset_checksum || "") !== String(expected.resetReceiptChecksum)) issues.push("prompt_cache_compaction_notification_reset_receipt_mismatch");
  return { valid: issues.length === 0, issues };
}

export function notifyGroupPromptCacheCompaction(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_prompt_cache_compaction_notification");
  const boundaryId = String(input.boundaryId || input.boundary_id || "").trim();
  const resetReceiptChecksum = String(input.resetReceiptChecksum || input.reset_receipt_checksum || "").trim();
  const generation = Math.max(1, Number(input.generation || input.baseline_generation || 1));
  if (!boundaryId || !resetReceiptChecksum) throw new Error("compact_boundary_and_reset_receipt_required_for_prompt_cache_notification");
  const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
    if (current.pending_post_compaction?.boundary_id === boundaryId
      && current.pending_post_compaction?.post_compact_session_state_reset_checksum === resetReceiptChecksum) {
      return current.pending_post_compaction.notification;
    }
    const notifiedAt = String(input.notifiedAt || input.notified_at || new Date().toISOString());
    const core: any = {
      schema: NOTIFICATION_SCHEMA,
      version: VERSION,
      group_id: groupId,
      group_session_id: groupSessionId,
      scope_id: `${groupId}--${groupSessionId}`,
      boundary_id: boundaryId,
      post_compact_session_state_reset_checksum: resetReceiptChecksum,
      previous_cache_read_tokens: current.checksum_valid === true ? current.previous_cache_read_tokens : null,
      previous_baseline_generation: current.checksum_valid === true ? Number(current.baseline_generation || 0) : 0,
      baseline_generation: generation,
      baseline_status: "reset_pending_next_api_success",
      body_free: true,
      notified_at: notifiedAt,
    };
    const notification = { ...core, receipt_checksum: receiptChecksum(core) };
    persistLedger(file, {
      ...(current.checksum_valid === true ? current : emptyLedger(groupId, groupSessionId)),
      status: "post_compaction_pending",
      revision: Math.max(0, Number(current.revision || 0)) + 1,
      baseline_generation: generation,
      previous_cache_read_tokens: null,
      last_group_main_context_usage_event: null,
      pending_post_compaction: {
        boundary_id: boundaryId,
        generation,
        post_compact_session_state_reset_checksum: resetReceiptChecksum,
        notification,
      },
      updated_at: notifiedAt,
    });
    return notification;
  });
}

export function verifyGroupPromptCacheDeletionNotification(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== CACHE_DELETION_NOTIFICATION_SCHEMA || Number(receipt?.version || 0) !== VERSION) issues.push("prompt_cache_deletion_notification_schema_invalid");
  if (!String(receipt?.group_id || "")) issues.push("prompt_cache_deletion_notification_group_missing");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("prompt_cache_deletion_notification_exact_session_missing");
  if (String(receipt?.scope_id || "") !== `${String(receipt?.group_id || "")}--${String(receipt?.group_session_id || "")}`) issues.push("prompt_cache_deletion_notification_scope_invalid");
  if (!String(receipt?.execution_receipt_id || "")) issues.push("prompt_cache_deletion_notification_execution_receipt_missing");
  if (!String(receipt?.execution_receipt_checksum || "")) issues.push("prompt_cache_deletion_notification_execution_checksum_missing");
  if (!String(receipt?.plan_checksum || "") || !String(receipt?.apply_plan_checksum || "")) issues.push("prompt_cache_deletion_notification_plan_binding_missing");
  if (Number(receipt?.applied_edit_count || 0) < 1 || Number(receipt?.cleared_input_tokens || 0) < 1) issues.push("prompt_cache_deletion_notification_applied_edit_missing");
  if (receipt?.cache_deletion_status !== "pending_next_api_usage") issues.push("prompt_cache_deletion_notification_status_invalid");
  if (receipt?.body_free !== true) issues.push("prompt_cache_deletion_notification_body_free_missing");
  if (String(receipt?.receipt_checksum || "") !== receiptChecksum(receipt)) issues.push("prompt_cache_deletion_notification_checksum_invalid");
  if (expected.groupId && String(receipt?.group_id || "") !== String(expected.groupId)) issues.push("prompt_cache_deletion_notification_group_mismatch");
  if (expected.groupSessionId && String(receipt?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("prompt_cache_deletion_notification_session_mismatch");
  if (expected.executionReceiptId && String(receipt?.execution_receipt_id || "") !== String(expected.executionReceiptId)) issues.push("prompt_cache_deletion_notification_execution_receipt_mismatch");
  if (expected.executionReceiptChecksum && String(receipt?.execution_receipt_checksum || "") !== String(expected.executionReceiptChecksum)) issues.push("prompt_cache_deletion_notification_execution_checksum_mismatch");
  return { valid: issues.length === 0, issues };
}

export function notifyGroupPromptCacheDeletion(input: any = {}) {
  const executionReceipt = input.executionReceipt?.receipt || input.execution_receipt?.receipt
    || input.executionReceipt || input.execution_receipt || input.receipt || {};
  const groupId = String(input.groupId || input.group_id || executionReceipt.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || executionReceipt.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("exact_group_session_required_for_prompt_cache_deletion_notification");
  const executionVerification = verifyProviderNativeCompactExecutionReceipt(executionReceipt, { groupId, groupSessionId });
  const strongOutcome = executionVerification.valid
    && executionReceipt.status === "native_applied"
    && executionReceipt.strong_proof === true
    && executionReceipt.provider_outcome_verified === true
    && Number(executionReceipt.applied_edit_count || 0) >= 1
    && Number(executionReceipt.cleared_input_tokens || 0) > 0;
  if (!strongOutcome) throw new Error(`strong_native_microcompact_receipt_required:${executionVerification.issues.join(",") || executionReceipt.status || "unverified"}`);
  const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
    if (current.checksum_valid !== true) throw new Error("prompt_cache_ledger_fail_closed");
    const executionReceiptId = String(executionReceipt.receipt_id || "");
    const known = (Array.isArray(current.recent_cache_deletion_notifications) ? current.recent_cache_deletion_notifications : [])
      .find((entry: any) => entry.execution_receipt_id === executionReceiptId
        && entry.execution_receipt_checksum === executionReceipt.receipt_checksum);
    if (known) return known;
    const notifiedAt = String(input.notifiedAt || input.notified_at || new Date().toISOString());
    const core: any = {
      schema: CACHE_DELETION_NOTIFICATION_SCHEMA,
      version: VERSION,
      group_id: groupId,
      group_session_id: groupSessionId,
      scope_id: `${groupId}--${groupSessionId}`,
      execution_receipt_id: executionReceiptId,
      execution_receipt_checksum: String(executionReceipt.receipt_checksum || ""),
      plan_checksum: String(executionReceipt.plan_checksum || ""),
      apply_plan_checksum: String(executionReceipt.apply_plan_checksum || ""),
      provider_request_id: String(executionReceipt.provider_request_id || ""),
      applied_edit_count: Number(executionReceipt.applied_edit_count || 0),
      cleared_input_tokens: Number(executionReceipt.cleared_input_tokens || 0),
      baseline_generation: Math.max(0, Number(current.baseline_generation || 0)),
      boundary_generation: Math.max(0, Number(input.boundaryGeneration ?? input.boundary_generation ?? current.baseline_generation ?? 0)),
      previous_cache_read_tokens: current.previous_cache_read_tokens,
      cache_deletion_status: "pending_next_api_usage",
      body_free: true,
      notified_at: notifiedAt,
    };
    const notification = { ...core, receipt_checksum: receiptChecksum(core) };
    persistLedger(file, {
      ...current,
      status: "cache_deletion_pending",
      revision: Math.max(0, Number(current.revision || 0)) + 1,
      pending_cache_deletion: { notification, execution_receipt_id: executionReceiptId },
      cache_deletion_notification_count: Math.max(0, Number(current.cache_deletion_notification_count || 0)) + 1,
      recent_cache_deletion_notifications: [
        ...(Array.isArray(current.recent_cache_deletion_notifications) ? current.recent_cache_deletion_notifications : []),
        notification,
      ].slice(-MAX_EVENTS),
      updated_at: notifiedAt,
    });
    return notification;
  });
}

export function recordGroupPromptCacheUsage(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) return { recorded: false, reason: "exact_group_session_required" };
  const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const current = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
    if (current.checksum_valid !== true) return { recorded: false, reason: "prompt_cache_ledger_fail_closed", ledger: current };
    const usage = input.usage || {};
    const provider = String(input.provider || "unknown").toLowerCase();
    const cacheRead = finite(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens);
    const cacheCreation = finite(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens);
    const directInput = finite(usage.directInputTokens ?? usage.direct_input_tokens);
    const output = finite(usage.outputTokens ?? usage.output_tokens);
    const estimatedContext = finite(input.estimatedContextTokens ?? input.estimated_context_tokens);
    const estimatedPayload = finite(input.estimatedPayloadTokens ?? input.estimated_payload_tokens ?? estimatedContext);
    const estimatedFixed = finite(input.estimatedFixedTokens ?? input.estimated_fixed_tokens);
    const modelVisiblePayload = input.modelVisiblePayload || input.model_visible_payload || null;
    const observedContext = directInput + cacheCreation + cacheRead + output;
    const previous = current.previous_cache_read_tokens === null || current.previous_cache_read_tokens === undefined
      ? null
      : finite(current.previous_cache_read_tokens);
    const pending = current.pending_post_compaction || null;
    const deletionPending = current.pending_cache_deletion || null;
    const deletionNotification = deletionPending?.notification || null;
    const isPostCompaction = !!pending?.boundary_id;
    const isCacheDeletion = !!deletionNotification?.execution_receipt_id;
    const promptChanges = current.pending_prompt_changes || null;
    const promptSnapshot = current.prompt_state_baseline || null;
    const model = String(input.model || promptSnapshot?.model || "");
    const excludedModel = provider === "anthropic" && model.toLowerCase().includes("haiku");
    const previousSuccessAtMs = Date.parse(String(current.last_api_success_at || "")) || 0;
    const at = String(input.at || new Date().toISOString());
    const atMs = Date.parse(at) || Date.now();
    const timeSinceLastApiSuccessMs = previousSuccessAtMs > 0 ? Math.max(0, atMs - previousSuccessAtMs) : null;
    const over5Minutes = timeSinceLastApiSuccessMs !== null && timeSinceLastApiSuccessMs > CACHE_TTL_5MIN_MS;
    const over1Hour = timeSinceLastApiSuccessMs !== null && timeSinceLastApiSuccessMs > CACHE_TTL_1HOUR_MS;
    const tokenDrop = previous === null ? 0 : Math.max(0, previous - cacheRead);
    const dropRatio = previous && tokenDrop > 0 ? tokenDrop / previous : 0;
    const cacheBreak = provider === "anthropic"
      && !excludedModel
      && !isPostCompaction
      && !isCacheDeletion
      && previous !== null
      && cacheRead < previous * 0.95
      && tokenDrop >= MIN_CACHE_MISS_TOKENS;
    const classification = provider !== "anthropic"
      ? "unsupported_provider"
      : excludedModel
        ? "excluded_model"
      : isPostCompaction
        ? "post_compaction_baseline_reset"
        : isCacheDeletion
          ? "expected_microcompact_cache_deletion"
        : previous === null
          ? "baseline_initialized"
          : cacheBreak ? "cache_break" : "cache_stable";
    const cacheBreakReason = !cacheBreak
      ? isPostCompaction ? "post_compaction"
        : isCacheDeletion ? "expected_cache_deletion"
          : excludedModel ? "model_excluded"
            : ""
      : Array.isArray(promptChanges?.causes) && promptChanges.causes.length
        ? "client_prompt_changed"
        : over1Hour
          ? "possible_1h_ttl_expiry"
          : over5Minutes
            ? "possible_5min_ttl_expiry"
            : timeSinceLastApiSuccessMs !== null
              ? "likely_server_side"
              : "unknown_cause";
    const eventCore: any = {
      schema: "ccm-group-prompt-cache-usage-event-v1",
      version: VERSION,
      event_id: `gpcu_${sha(`${groupId}\0${groupSessionId}\0${Number(current.call_count || 0) + 1}\0${at}`, 24)}`,
      group_id: groupId,
      group_session_id: groupSessionId,
      source: String(input.source || "group_main"),
      provider,
      model,
      call_number: Number(current.call_count || 0) + 1,
      baseline_generation: Math.max(0, Number(current.baseline_generation || 0)),
      previous_cache_read_tokens: previous,
      cache_read_input_tokens: cacheRead,
      cache_creation_input_tokens: cacheCreation,
      direct_input_tokens: directInput,
      output_tokens: output,
      estimated_context_tokens: estimatedContext,
      estimated_payload_tokens: estimatedPayload,
      estimated_fixed_tokens: estimatedFixed,
      payload_checksum: String(input.payloadChecksum || input.payload_checksum || ""),
      fixed_context_checksum: String(input.fixedContextChecksum || input.fixed_context_checksum || ""),
      token_breakdown: modelVisiblePayload?.tokenBreakdown && typeof modelVisiblePayload.tokenBreakdown === "object"
        ? Object.fromEntries(Object.entries(modelVisiblePayload.tokenBreakdown).map(([key, value]) => [key, finite(value)]))
        : null,
      accounting_total_tokens: finite(modelVisiblePayload?.totalTokens || estimatedPayload),
      provider_observed_context_tokens: observedContext,
      positive_estimation_drift_tokens: Math.max(0, observedContext - estimatedContext),
      token_drop: tokenDrop,
      drop_ratio: Math.round(dropRatio * 10_000) / 10_000,
      classification,
      cache_break: cacheBreak,
      is_post_compaction: isPostCompaction,
      post_compact_boundary_id: String(pending?.boundary_id || ""),
      post_compact_notification_checksum: String(pending?.notification?.receipt_checksum || ""),
      cache_deletion_applied: isCacheDeletion,
      cache_deletion_notification_checksum: String(deletionNotification?.receipt_checksum || ""),
      microcompact_execution_receipt_id: String(deletionNotification?.execution_receipt_id || ""),
      microcompact_execution_receipt_checksum: String(deletionNotification?.execution_receipt_checksum || ""),
      microcompact_cleared_input_tokens: Number(deletionNotification?.cleared_input_tokens || 0),
      prompt_state_snapshot_id: String(promptSnapshot?.snapshot_id || ""),
      prompt_state_snapshot_checksum: String(promptSnapshot?.snapshot_checksum || ""),
      prompt_changed: Array.isArray(promptChanges?.causes) && promptChanges.causes.length > 0,
      prompt_change_causes: Array.isArray(promptChanges?.causes) ? promptChanges.causes.slice(0, 16) : [],
      prompt_changes_checksum: String(promptChanges?.changes_checksum || ""),
      cache_break_reason: cacheBreakReason,
      time_since_last_api_success_ms: timeSinceLastApiSuccessMs,
      last_api_success_over_5min: over5Minutes,
      last_api_success_over_1h: over1Hour,
      excluded_model: excludedModel,
      request_id: String(input.requestId || input.request_id || ""),
      body_free: true,
      recorded_at: at,
    };
    const event = { ...eventCore, event_checksum: eventChecksum(eventCore) };
    const isGroupMainContextUsage = event.source === "group_main_planning"
      && event.provider_observed_context_tokens > 0
      && event.estimated_context_tokens > 0;
    const stored = persistLedger(file, {
      ...current,
      status: cacheBreak ? "cache_break_detected" : "tracking",
      revision: Math.max(0, Number(current.revision || 0)) + 1,
      call_count: event.call_number,
      cache_break_count: Math.max(0, Number(current.cache_break_count || 0)) + (cacheBreak ? 1 : 0),
      previous_cache_read_tokens: provider === "anthropic" && !excludedModel ? cacheRead : current.previous_cache_read_tokens,
      pending_post_compaction: null,
      pending_cache_deletion: null,
      pending_prompt_changes: excludedModel ? current.pending_prompt_changes : null,
      cache_deletion_consumed_count: Math.max(0, Number(current.cache_deletion_consumed_count || 0)) + (isCacheDeletion ? 1 : 0),
      last_api_success_at: provider === "anthropic" && !excludedModel ? at : current.last_api_success_at,
      last_event: event,
      last_group_main_context_usage_event: isGroupMainContextUsage
        ? event
        : current.last_group_main_context_usage_event,
      recent_events: [...(Array.isArray(current.recent_events) ? current.recent_events : []), event],
      updated_at: at,
    });
    return { recorded: true, event, ledger: stored };
  });
}

export function readGroupMainContextUsageBaseline(groupId: string, groupSessionId: string, expected: any = {}) {
  const ledger = readGroupPromptCacheBreakDetection(groupId, groupSessionId);
  const event = ledger.last_group_main_context_usage_event || null;
  const issues: string[] = [];
  if (ledger.checksum_valid !== true) issues.push("usage_ledger_invalid");
  if (!event) issues.push("usage_baseline_missing");
  if (event && String(event.event_checksum || "") !== eventChecksum(event)) issues.push("usage_event_checksum_invalid");
  if (event && String(event.group_id || "") !== String(groupId || "")) issues.push("usage_group_mismatch");
  if (event && String(event.group_session_id || "") !== String(groupSessionId || "")) issues.push("usage_session_mismatch");
  if (event && event.source !== "group_main_planning") issues.push("usage_source_invalid");
  if (event && Number(event.baseline_generation || 0) !== Number(ledger.baseline_generation || 0)) issues.push("usage_generation_stale");
  if (ledger.pending_post_compaction) issues.push("usage_post_compaction_reset_pending");
  if (expected.provider && event && String(event.provider || "") !== String(expected.provider || "").toLowerCase()) issues.push("usage_provider_mismatch");
  if (expected.model && event && String(event.model || "") !== String(expected.model || "")) issues.push("usage_model_mismatch");
  if (event && Number(event.provider_observed_context_tokens || 0) <= 0) issues.push("usage_observed_tokens_missing");
  if (event && Number(event.estimated_context_tokens || 0) <= 0) issues.push("usage_estimated_tokens_missing");
  return {
    valid: issues.length === 0,
    issues,
    event: issues.length === 0 ? event : null,
    ledger,
  };
}

export function deleteGroupPromptCacheBreakDetection(groupId: string, groupSessionId: string) {
  const file = getGroupPromptCacheBreakDetectionFile(groupId, groupSessionId);
  let deleted = 0;
  for (const target of [file, `${file}.bak`, `${file}.lock`]) {
    try { if (fs.existsSync(target)) { fs.unlinkSync(target); deleted += 1; } } catch {}
  }
  return { file, deleted };
}
