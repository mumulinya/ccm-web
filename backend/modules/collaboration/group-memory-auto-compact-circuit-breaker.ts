import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR } from "../../core/utils";

export const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA = "ccm-group-memory-auto-compact-circuit-breaker-v1";
export const GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES = 3;
export const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_DIR = path.join(CCM_DIR, "group-memory-auto-compact-circuit-breakers");

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function checksum(value: any, length = 64) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}

function clean(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}

function ledgerChecksum(ledger: any) {
  const payload = { ...(ledger || {}) };
  delete payload.ledger_checksum;
  delete payload.checksum_valid;
  delete payload.file;
  delete payload.recovered_from_backup;
  return checksum(payload);
}

export function getGroupMemoryAutoCompactCircuitBreakerFile(groupId: string, groupSessionId: string) {
  return path.join(GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_DIR, clean(groupId), `${clean(groupSessionId)}.json`);
}

function emptyLedger(groupId: string, groupSessionId: string, file: string) {
  return {
    schema: GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA,
    version: 1,
    group_id: groupId,
    group_session_id: groupSessionId,
    scope_id: `${groupId}::${groupSessionId}`,
    state: "closed",
    consecutive_failures: 0,
    max_consecutive_failures: GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES,
    revision: 0,
    opened_at: "",
    last_failure_at: "",
    last_success_at: "",
    last_attempt_id: "",
    recent_events: [] as any[],
    updated_at: "",
    ledger_checksum: "",
    checksum_valid: true,
    file,
  };
}

export function verifyGroupMemoryAutoCompactCircuitBreaker(ledger: any, expected: any = {}) {
  const issues: string[] = [];
  if (ledger?.schema !== GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA || Number(ledger?.version || 0) !== 1) issues.push("auto_compact_circuit_schema_invalid");
  if (!String(ledger?.group_id || "")) issues.push("auto_compact_circuit_group_missing");
  if (!String(ledger?.group_session_id || "").startsWith("gcs_")) issues.push("auto_compact_circuit_exact_session_missing");
  if (String(ledger?.scope_id || "") !== `${String(ledger?.group_id || "")}::${String(ledger?.group_session_id || "")}`) issues.push("auto_compact_circuit_scope_invalid");
  if (!["closed", "open"].includes(String(ledger?.state || ""))) issues.push("auto_compact_circuit_state_invalid");
  const failures = Number(ledger?.consecutive_failures || 0);
  if (!Number.isInteger(failures) || failures < 0 || failures > GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES) issues.push("auto_compact_circuit_failure_count_invalid");
  if ((failures >= GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES) !== (ledger?.state === "open")) issues.push("auto_compact_circuit_state_count_mismatch");
  if (expected.groupId && String(ledger?.group_id || "") !== String(expected.groupId)) issues.push("auto_compact_circuit_group_mismatch");
  if (expected.groupSessionId && String(ledger?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("auto_compact_circuit_group_session_mismatch");
  if (String(ledger?.ledger_checksum || "") !== ledgerChecksum(ledger)) issues.push("auto_compact_circuit_checksum_invalid");
  return { valid: issues.length === 0, issues };
}

function readCandidate(file: string, groupId: string, groupSessionId: string) {
  try {
    if (!fs.existsSync(file)) return null;
    const ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
    const verification = verifyGroupMemoryAutoCompactCircuitBreaker(ledger, { groupId, groupSessionId });
    return { ledger, verification };
  } catch (error: any) {
    return { ledger: null, verification: { valid: false, issues: [String(error?.message || error).slice(0, 160)] } };
  }
}

export function readGroupMemoryAutoCompactCircuitBreaker(groupId: string, groupSessionId: string) {
  const id = String(groupId || "").trim();
  const sessionId = String(groupSessionId || "").trim();
  const file = getGroupMemoryAutoCompactCircuitBreakerFile(id, sessionId);
  if (!id || !sessionId.startsWith("gcs_")) {
    return {
      ...emptyLedger(id, sessionId, file),
      state: "fail_closed",
      blocked: true,
      checksum_valid: false,
      issues: ["exact_group_session_required"],
    };
  }
  const primary = readCandidate(file, id, sessionId);
  if (primary?.verification.valid) {
    return {
      ...primary.ledger,
      checksum_valid: true,
      blocked: primary.ledger.state === "open",
      issues: [],
      file,
      recovered_from_backup: false,
    };
  }
  const backup = readCandidate(`${file}.bak`, id, sessionId);
  if (backup?.verification.valid) {
    return {
      ...backup.ledger,
      state: "fail_closed",
      recovery_state: String(backup.ledger.state || ""),
      blocked: true,
      checksum_valid: true,
      issues: [...new Set(["auto_compact_circuit_primary_unavailable", ...(primary?.verification.issues || [])])],
      file,
      recovered_from_backup: true,
    };
  }
  const invalidIssues = [
    ...(primary?.verification.issues || []),
    ...(backup?.verification.issues || []),
  ];
  if (fs.existsSync(file) || fs.existsSync(`${file}.bak`)) {
    return {
      ...emptyLedger(id, sessionId, file),
      state: "fail_closed",
      blocked: true,
      checksum_valid: false,
      issues: [...new Set(invalidIssues.length ? invalidIssues : ["auto_compact_circuit_unreadable"])],
    };
  }
  return { ...emptyLedger(id, sessionId, file), blocked: false, issues: [] };
}

export function recordGroupMemoryAutoCompactCircuitBreakerOutcome(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const outcome = String(input.outcome || "").trim();
  const attemptId = String(input.attemptId || input.attempt_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("auto compact circuit breaker requires groupId + gcs_* identity");
  if (!attemptId) throw new Error("auto compact circuit breaker requires attemptId");
  if (!["failure", "success"].includes(outcome)) throw new Error("auto compact circuit breaker outcome must be failure or success");
  const file = getGroupMemoryAutoCompactCircuitBreakerFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const current = readGroupMemoryAutoCompactCircuitBreaker(groupId, groupSessionId);
    const now = String(input.at || input.recordedAt || input.recorded_at || new Date().toISOString());
    if (current.last_attempt_id === attemptId) return { ...current, idempotent: true, recorded: false };
    if (current.state === "fail_closed" && outcome !== "success") return { ...current, idempotent: false, recorded: false };
    const previousFailures = current.state === "fail_closed" ? GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES : Number(current.consecutive_failures || 0);
    const consecutiveFailures = outcome === "success"
      ? 0
      : Math.min(GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES, previousFailures + 1);
    const state = consecutiveFailures >= GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES ? "open" : "closed";
    const eventCore = {
      attempt_id: attemptId,
      outcome,
      reason: String(input.reason || (outcome === "success" ? "compact_succeeded" : "compact_failed")).replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 120),
      error_class: String(input.errorClass || input.error_class || "").replace(/[^a-zA-Z0-9._:-]+/g, "_").slice(0, 100),
      error_fingerprint: input.error ? checksum(String(input.error), 24) : "",
      consecutive_failures: consecutiveFailures,
      state,
      recorded_at: now,
    };
    const event = { event_id: `acbe_${checksum([groupId, groupSessionId, eventCore], 24)}`, ...eventCore };
    const payload: any = {
      schema: GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA,
      version: 1,
      group_id: groupId,
      group_session_id: groupSessionId,
      scope_id: `${groupId}::${groupSessionId}`,
      state,
      consecutive_failures: consecutiveFailures,
      max_consecutive_failures: GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES,
      revision: Number(current.revision || 0) + 1,
      opened_at: state === "open" ? String(current.opened_at || now) : "",
      last_failure_at: outcome === "failure" ? now : String(current.last_failure_at || ""),
      last_success_at: outcome === "success" ? now : String(current.last_success_at || ""),
      last_attempt_id: attemptId,
      recent_events: [...(Array.isArray(current.recent_events) ? current.recent_events : []), event].slice(-80),
      updated_at: now,
    };
    const saved = { ...payload, ledger_checksum: ledgerChecksum(payload) };
    writeJsonAtomic(file, saved);
    return { ...saved, checksum_valid: true, blocked: state === "open", issues: [], file, idempotent: false, recorded: true };
  });
}

export function deleteGroupMemoryAutoCompactCircuitBreaker(groupId: string, groupSessionId: string) {
  const file = getGroupMemoryAutoCompactCircuitBreakerFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    let deleted = 0;
    for (const candidate of [file, `${file}.bak`]) {
      try { if (fs.existsSync(candidate)) { fs.unlinkSync(candidate); deleted += 1; } } catch {}
    }
    return { deleted, groupId, groupSessionId, file };
  });
}
