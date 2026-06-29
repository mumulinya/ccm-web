import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "./utils";

const ROOT = path.join(CCM_DIR, "reliability");
const TRACE_DIR = path.join(ROOT, "traces");
const IDEMPOTENCY_DIR = path.join(ROOT, "idempotency");
const LEASE_DIR = path.join(ROOT, "leases");
const INSTANCE_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(4).toString("hex")}`;

function ensureDirectories() {
  for (const dir of [ROOT, TRACE_DIR, IDEMPOTENCY_DIR, LEASE_DIR]) fs.mkdirSync(dir, { recursive: true });
}

function safeName(value: string) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 160) || "unknown";
}

function digest(value: string) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function readJson(file: string, fallback: any = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
  try {
    const recovered = JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8"));
    return { ...recovered, storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() } };
  } catch {}
  return fallback;
}

function writeJsonAtomic(file: string, value: any) {
  ensureDirectories();
  const temp = `${file}.${process.pid}.${crypto.randomBytes(3).toString("hex")}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function processAlive(pid: number) {
  if (!pid || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function createTraceId(prefix = "trace") {
  return `${safeName(prefix)}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

export function ensureTraceId(value: any, prefix = "trace") {
  const existing = String(value || "").trim();
  return existing ? safeName(existing) : createTraceId(prefix);
}

function traceFile(traceId: string) {
  return path.join(TRACE_DIR, `${safeName(traceId)}.json`);
}

export function getTrace(traceId: string) {
  return readJson(traceFile(traceId), null);
}

export function appendTraceEvent(traceId: string, event: any) {
  const id = ensureTraceId(traceId);
  const file = traceFile(id);
  const current = readJson(file, { version: 1, trace_id: id, created_at: new Date().toISOString(), events: [] });
  const events = Array.isArray(current.events) ? current.events : [];
  const eventId = String(event?.id || event?.event_id || "").trim() || `evt_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  if (events.some((item: any) => item.id === eventId)) return events.find((item: any) => item.id === eventId);
  const next = {
    id: eventId,
    at: event?.at || new Date().toISOString(),
    type: String(event?.type || "event"),
    status: String(event?.status || "info"),
    task_id: String(event?.task_id || event?.taskId || ""),
    group_id: String(event?.group_id || event?.groupId || ""),
    agent: String(event?.agent || ""),
    runtime: String(event?.runtime || ""),
    message: String(event?.message || event?.detail || "").slice(0, 2400),
    data: event?.data && typeof event.data === "object" ? event.data : {},
  };
  current.events = [...events, next].slice(-1200);
  current.updated_at = next.at;
  if (next.task_id) current.task_id = next.task_id;
  if (next.group_id) current.group_id = next.group_id;
  writeJsonAtomic(file, current);
  return next;
}

export function listTraces(limit = 50) {
  ensureDirectories();
  return fs.readdirSync(TRACE_DIR)
    .filter(name => name.endsWith(".json") && !name.endsWith(".bak"))
    .map(name => readJson(path.join(TRACE_DIR, name), null))
    .filter(Boolean)
    .sort((a: any, b: any) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0))
    .slice(0, Math.max(1, Math.min(500, Number(limit || 50))));
}

function operationFile(scope: string, key: string) {
  return path.join(IDEMPOTENCY_DIR, `${safeName(scope)}-${digest(`${scope}:${key}`)}.json`);
}

export function getIdempotencyRecord(scope: string, key: string) {
  return readJson(operationFile(scope, key), null);
}

export function acquireIdempotency(input: { scope: string; key: string; traceId?: string; leaseMs?: number; metadata?: any; retryFailed?: boolean }) {
  const scope = safeName(input.scope);
  const key = String(input.key || "").trim();
  if (!key) throw new Error(`幂等操作 ${scope} 缺少 key`);
  const file = operationFile(scope, key);
  const now = Date.now();
  const leaseMs = Math.max(5_000, Math.min(24 * 60 * 60 * 1000, Number(input.leaseMs || 60_000)));
  const existing = readJson(file, null);
  const existingLeaseActive = existing?.status === "in_progress"
    && Date.parse(existing.lease_expires_at || 0) > now
    && processAlive(Number(existing.owner_pid || 0));
  if (existing?.status === "completed" || existingLeaseActive || (existing?.status === "failed" && input.retryFailed === false)) {
    existing.duplicate_count = Number(existing.duplicate_count || 0) + 1;
    existing.last_duplicate_at = new Date(now).toISOString();
    writeJsonAtomic(file, existing);
    if (existing.trace_id) appendTraceEvent(existing.trace_id, { id: `${existing.operation_id}:duplicate:${existing.duplicate_count}`, type: "idempotency.duplicate_suppressed", status: "warning", message: `${scope} 重复操作已抑制`, data: { scope, duplicate_count: existing.duplicate_count, in_progress: existingLeaseActive } });
    return { acquired: false, duplicate: true, inProgress: existingLeaseActive, record: existing, traceId: existing.trace_id };
  }
  const traceId = ensureTraceId(existing?.trace_id || input.traceId, scope);
  const record = {
    version: 1,
    operation_id: existing?.operation_id || `op_${crypto.randomBytes(8).toString("hex")}`,
    scope,
    key_hash: digest(key),
    trace_id: traceId,
    status: "in_progress",
    owner_id: INSTANCE_ID,
    owner_pid: process.pid,
    attempt: Number(existing?.attempt || 0) + 1,
    created_at: existing?.created_at || new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    lease_expires_at: new Date(now + leaseMs).toISOString(),
    recovered_from_stale: !!existing && !existingLeaseActive && existing.status === "in_progress",
    metadata: { ...(existing?.metadata || {}), ...(input.metadata || {}) },
  };
  writeJsonAtomic(file, record);
  appendTraceEvent(traceId, { id: `${record.operation_id}:attempt:${record.attempt}`, type: "idempotency.acquired", status: record.recovered_from_stale ? "warning" : "info", message: `${scope} 操作已认领`, data: { scope, attempt: record.attempt, recovered_from_stale: record.recovered_from_stale } });
  return { acquired: true, duplicate: false, inProgress: false, record, traceId };
}

function finishIdempotency(scope: string, key: string, status: "completed" | "failed", result: any) {
  const file = operationFile(scope, key);
  const current = readJson(file, null);
  if (!current) throw new Error(`幂等操作不存在：${scope}`);
  if (current.status === "completed") return current;
  current.status = status;
  current.updated_at = new Date().toISOString();
  current.completed_at = status === "completed" ? current.updated_at : undefined;
  current.failed_at = status === "failed" ? current.updated_at : undefined;
  current.result = result;
  delete current.lease_expires_at;
  writeJsonAtomic(file, current);
  appendTraceEvent(current.trace_id, { id: `${current.operation_id}:${status}:${current.attempt}`, type: `idempotency.${status}`, status: status === "completed" ? "ok" : "error", message: `${scope} 操作${status === "completed" ? "完成" : "失败"}`, data: { scope, attempt: current.attempt } });
  return current;
}

export function completeIdempotency(scope: string, key: string, result: any = {}) {
  return finishIdempotency(scope, key, "completed", result);
}

export function failIdempotency(scope: string, key: string, error: any) {
  return finishIdempotency(scope, key, "failed", { error: String(error?.message || error || "unknown error").slice(0, 2000) });
}

export function settleIdempotencyByTrace(traceId: string, status: "completed" | "failed", result: any = {}, scopes: string[] = []) {
  ensureDirectories();
  const wantedTrace = String(traceId || "").trim();
  const wantedScopes = new Set(scopes.map(safeName));
  if (!wantedTrace) return [];
  const settled: any[] = [];
  for (const name of fs.readdirSync(IDEMPOTENCY_DIR).filter(item => item.endsWith(".json") && !item.endsWith(".bak"))) {
    const file = path.join(IDEMPOTENCY_DIR, name);
    const current = readJson(file, null);
    if (!current || current.trace_id !== wantedTrace || current.status !== "in_progress") continue;
    if (wantedScopes.size > 0 && !wantedScopes.has(String(current.scope || ""))) continue;
    current.status = status;
    current.updated_at = new Date().toISOString();
    current.completed_at = status === "completed" ? current.updated_at : undefined;
    current.failed_at = status === "failed" ? current.updated_at : undefined;
    current.result = result;
    delete current.lease_expires_at;
    writeJsonAtomic(file, current);
    appendTraceEvent(current.trace_id, {
      id: `${current.operation_id}:${status}:recovered:${current.attempt}`,
      type: `idempotency.${status}_after_recovery`,
      status: status === "completed" ? "ok" : "error",
      message: `${current.scope} 在持久运行恢复后完成账本结算`,
      data: { scope: current.scope, attempt: current.attempt },
    });
    settled.push(current);
  }
  return settled;
}

function leaseFile(taskId: string) {
  return path.join(LEASE_DIR, `${safeName(taskId)}.json`);
}

export function getTaskLease(taskId: string) {
  return readJson(leaseFile(taskId), null);
}

export function listTaskLeases() {
  ensureDirectories();
  return fs.readdirSync(LEASE_DIR)
    .filter(name => name.endsWith(".json") && !name.endsWith(".bak"))
    .map(name => readJson(path.join(LEASE_DIR, name), null))
    .filter(Boolean);
}

export function getReliabilityLedgerStats() {
  ensureDirectories();
  const operationRecords = fs.readdirSync(IDEMPOTENCY_DIR)
    .filter(name => name.endsWith(".json") && !name.endsWith(".bak"))
    .map(name => readJson(path.join(IDEMPOTENCY_DIR, name), null))
    .filter(Boolean);
  const leases = listTaskLeases();
  const traceFiles = fs.readdirSync(TRACE_DIR).filter(name => name.endsWith(".json") && !name.endsWith(".bak"));
  const now = Date.now();
  return {
    operations: {
      total: operationRecords.length,
      in_progress: operationRecords.filter((item: any) => item.status === "in_progress").length,
      completed: operationRecords.filter((item: any) => item.status === "completed").length,
      failed: operationRecords.filter((item: any) => item.status === "failed").length,
      duplicate_suppressed: operationRecords.reduce((sum: number, item: any) => sum + Number(item.duplicate_count || 0), 0),
      stale_in_progress: operationRecords.filter((item: any) => item.status === "in_progress" && (Date.parse(item.lease_expires_at || 0) <= now || !processAlive(Number(item.owner_pid || 0)))).length,
    },
    leases: {
      total: leases.length,
      active: leases.filter((item: any) => item.status === "active" && Date.parse(item.expires_at || 0) > now && processAlive(Number(item.owner_pid || 0))).length,
      stale: leases.filter((item: any) => item.status === "active" && (Date.parse(item.expires_at || 0) <= now || !processAlive(Number(item.owner_pid || 0)))).length,
      recoveries: leases.reduce((sum: number, item: any) => sum + Number(item.recovery_count || 0), 0),
    },
    traces: {
      total: traceFiles.length,
      bytes: traceFiles.reduce((sum, name) => {
        try { return sum + fs.statSync(path.join(TRACE_DIR, name)).size; } catch { return sum; }
      }, 0),
    },
  };
}

export function acquireTaskLease(taskId: string, traceId: string, ttlMs = 45_000) {
  const file = leaseFile(taskId);
  const now = Date.now();
  const ttl = Math.max(10_000, Math.min(10 * 60 * 1000, Number(ttlMs || 45_000)));
  const existing = readJson(file, null);
  const active = existing?.status === "active" && Date.parse(existing.expires_at || 0) > now && processAlive(Number(existing.owner_pid || 0));
  if (active && existing.owner_id !== INSTANCE_ID) return { acquired: false, lease: existing };
  const lease = {
    version: 1,
    task_id: taskId,
    trace_id: ensureTraceId(existing?.trace_id || traceId, "task"),
    status: "active",
    owner_id: INSTANCE_ID,
    owner_pid: process.pid,
    acquired_at: existing?.acquired_at || new Date(now).toISOString(),
    renewed_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttl).toISOString(),
    recovery_count: Number(existing?.recovery_count || 0) + (existing && !active && existing.status === "active" ? 1 : 0),
  };
  writeJsonAtomic(file, lease);
  appendTraceEvent(lease.trace_id, { id: `lease:${taskId}:${lease.recovery_count}:${lease.acquired_at}`, type: lease.recovery_count ? "task.lease_recovered" : "task.lease_acquired", status: lease.recovery_count ? "warning" : "info", task_id: taskId, message: lease.recovery_count ? "旧执行租约已失效，任务由新实例接管" : "任务执行租约已获取", data: { owner_id: INSTANCE_ID, recovery_count: lease.recovery_count } });
  return { acquired: true, lease };
}

export function renewTaskLease(taskId: string, ttlMs = 45_000) {
  const file = leaseFile(taskId);
  const current = readJson(file, null);
  if (!current || current.status !== "active" || current.owner_id !== INSTANCE_ID) return false;
  const now = Date.now();
  current.renewed_at = new Date(now).toISOString();
  current.expires_at = new Date(now + Math.max(10_000, Number(ttlMs || 45_000))).toISOString();
  writeJsonAtomic(file, current);
  return true;
}

export function releaseTaskLease(taskId: string, finalStatus = "released") {
  const file = leaseFile(taskId);
  const current = readJson(file, null);
  if (!current || current.owner_id !== INSTANCE_ID) return false;
  current.status = "released";
  current.final_status = finalStatus;
  current.released_at = new Date().toISOString();
  current.updated_at = current.released_at;
  delete current.expires_at;
  writeJsonAtomic(file, current);
  appendTraceEvent(current.trace_id, { id: `lease:${taskId}:released:${current.released_at}`, type: "task.lease_released", status: "ok", task_id: taskId, message: `任务执行租约已释放：${finalStatus}` });
  return true;
}

export function runReliabilityLedgerSelfTest() {
  const suffix = `${process.pid}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const scope = `selftest-${suffix}`;
  const key = `message-${suffix}`;
  const recoveryScope = `selftest-recovery-${suffix}`;
  const recoveryKey = `recovery-${suffix}`;
  const taskId = `task-${suffix}`;
  const traceId = createTraceId("selftest");
  const first = acquireIdempotency({ scope, key, traceId });
  const duplicateRunning = acquireIdempotency({ scope, key, traceId });
  completeIdempotency(scope, key, { task_id: taskId });
  const duplicateComplete = acquireIdempotency({ scope, key, traceId });
  const lease = acquireTaskLease(taskId, traceId, 20_000);
  const renewed = renewTaskLease(taskId, 20_000);
  const released = releaseTaskLease(taskId, "done");
  const previousLease = getTaskLease(taskId);
  writeJsonAtomic(leaseFile(taskId), { ...previousLease, status: "active", owner_id: "dead-instance", owner_pid: 2147483000, expires_at: new Date(Date.now() + 60_000).toISOString() });
  const recoveredLease = acquireTaskLease(taskId, traceId, 20_000);
  releaseTaskLease(taskId, "recovered");
  acquireIdempotency({ scope: recoveryScope, key: recoveryKey, traceId });
  const settledByTrace = settleIdempotencyByTrace(traceId, "completed", { recovered: true }, [recoveryScope]);
  const settledRecord = getIdempotencyRecord(recoveryScope, recoveryKey);
  const trace = getTrace(traceId);
  const checks = {
    firstAttemptAcquired: first.acquired === true,
    duplicateRunningSuppressed: duplicateRunning.acquired === false && duplicateRunning.inProgress === true,
    completedResultReplayed: duplicateComplete.acquired === false && duplicateComplete.record?.result?.task_id === taskId,
    taskLeaseLifecycleWorks: lease.acquired === true && renewed === true && released === true,
    deadOwnerLeaseIsRecovered: recoveredLease.acquired === true && Number(recoveredLease.lease?.recovery_count || 0) >= 1,
    recoveredRunSettlesIdempotency: settledByTrace.length === 1 && settledRecord?.status === "completed" && settledRecord?.result?.recovered === true,
    traceEventsPersist: Array.isArray(trace?.events) && trace.events.length >= 4,
  };
  for (const file of [operationFile(scope, key), operationFile(recoveryScope, recoveryKey), leaseFile(taskId), traceFile(traceId)]) {
    try { fs.unlinkSync(file); } catch {}
    try { fs.unlinkSync(`${file}.bak`); } catch {}
  }
  return { pass: Object.values(checks).every(Boolean), checks };
}
