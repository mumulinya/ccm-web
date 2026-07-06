import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { listTaskLeases } from "./reliability-ledger";

const ROOT = path.join(CCM_DIR, "reliability", "process-lifecycle");
const CURRENT_FILE = path.join(ROOT, "current.json");
const EVENTS_FILE = path.join(ROOT, "events.jsonl");
const INTENT_FILE = path.join(ROOT, "restart-intent.json");
const BOOT_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(4).toString("hex")}`;
let initialized = false;
let shutdownRecorded = false;

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

function readJson(file: string, fallback: any = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function writeJsonAtomic(file: string, value: any) {
  ensureRoot();
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function appendEvent(event: any) {
  ensureRoot();
  const next = {
    id: event.id || `ple_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    at: event.at || new Date().toISOString(),
    boot_id: event.boot_id || BOOT_ID,
    pid: Number(event.pid || process.pid),
    type: String(event.type || "process.event"),
    category: String(event.category || "unknown"),
    reason: String(event.reason || "").slice(0, 1200),
    signal: String(event.signal || ""),
    exit_code: event.exit_code === null || event.exit_code === undefined ? null : Number(event.exit_code),
    previous_boot_id: String(event.previous_boot_id || ""),
    previous_pid: Number(event.previous_pid || 0),
    task_id: String(event.task_id || ""),
    trace_id: String(event.trace_id || ""),
    data: event.data && typeof event.data === "object" ? event.data : {},
  };
  fs.appendFileSync(EVENTS_FILE, `${JSON.stringify(next)}\n`, "utf-8");
  return next;
}

function processAlive(pid: number) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function activeExecutionContext() {
  try {
    const now = Date.now();
    const leases = listTaskLeases().filter((lease: any) => lease.status === "active"
      && Number(lease.owner_pid || 0) === process.pid
      && Date.parse(lease.expires_at || 0) > now);
    return {
      task_id: String(leases[0]?.task_id || ""),
      trace_id: String(leases[0]?.trace_id || ""),
      task_ids: leases.map((lease: any) => String(lease.task_id || "")).filter(Boolean),
      trace_ids: Array.from(new Set(leases.map((lease: any) => String(lease.trace_id || "")).filter(Boolean))),
      captured_at: new Date().toISOString(),
    };
  } catch {
    return { task_id: "", trace_id: "", task_ids: [], trace_ids: [], captured_at: new Date().toISOString() };
  }
}

function normalizeCategory(value: any) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["manual", "manual_restart", "user_restart"].includes(raw)) return "manual_restart";
  if (["reload", "code_reload", "deploy", "deployment"].includes(raw)) return "code_reload";
  if (["system", "system_shutdown", "shutdown", "service_stop"].includes(raw)) return "system_shutdown";
  if (["crash", "unexpected_crash", "fatal"].includes(raw)) return "unexpected_crash";
  return raw || "planned_restart";
}

function readEvents(limit = 5000) {
  if (!fs.existsSync(EVENTS_FILE)) return [];
  const lines = fs.readFileSync(EVENTS_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-Math.max(1, limit));
  return lines.map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
}

function consumeRestartIntent() {
  const envReason = String(process.env.CCM_RESTART_REASON || "").trim();
  const envDetail = String(process.env.CCM_RESTART_DETAIL || "").trim();
  const persisted = readJson(INTENT_FILE, null);
  const validPersisted = persisted && Date.parse(persisted.expires_at || 0) > Date.now();
  try { if (fs.existsSync(INTENT_FILE)) fs.unlinkSync(INTENT_FILE); } catch {}
  if (envReason) return { category: normalizeCategory(envReason), reason: envDetail || envReason, source: "environment" };
  if (validPersisted) return { ...persisted, category: normalizeCategory(persisted.category), source: "intent_file" };
  return null;
}

export function getProcessBootId() {
  return BOOT_ID;
}

export function registerRestartIntent(input: any = {}) {
  const now = Date.now();
  const intent = {
    version: 1,
    category: normalizeCategory(input.category || input.reason || "manual_restart"),
    reason: String(input.reason || input.detail || "受控重启").slice(0, 1200),
    requested_at: new Date(now).toISOString(),
    expires_at: new Date(now + Math.max(30_000, Math.min(30 * 60_000, Number(input.ttl_ms || input.ttlMs || 10 * 60_000)))).toISOString(),
    requested_by_pid: process.pid,
    task_id: String(input.task_id || input.taskId || ""),
    trace_id: String(input.trace_id || input.traceId || ""),
  };
  writeJsonAtomic(INTENT_FILE, intent);
  appendEvent({ type: "process.restart_intent", category: intent.category, reason: intent.reason, task_id: intent.task_id, trace_id: intent.trace_id, data: { expires_at: intent.expires_at } });
  return intent;
}

export function initializeProcessLifecycle() {
  if (initialized) return readJson(CURRENT_FILE, null);
  initialized = true;
  ensureRoot();
  const previous = readJson(CURRENT_FILE, null);
  const intent = consumeRestartIntent();
  const previousExecution = previous?.last_fault?.execution_context || previous?.active_execution || {};
  let restart: any = { category: "initial_start", expected: true, reason: "首次记录的 CCM 进程启动" };
  if (previous) {
    if (intent) restart = { category: intent.category, expected: true, reason: intent.reason, source: intent.source, task_id: intent.task_id || "", trace_id: intent.trace_id || "" };
    else if (["stopped", "graceful_shutdown"].includes(String(previous.status || ""))) {
      const category = normalizeCategory(previous.shutdown_category || "system_shutdown");
      restart = { category, expected: category !== "unexpected_crash", reason: previous.shutdown_reason || "上一进程已正常退出", task_id: previous.shutdown_task_id || previousExecution.task_id || "", trace_id: previous.shutdown_trace_id || previousExecution.trace_id || "" };
    }
    else if (processAlive(Number(previous.pid || 0))) restart = { category: "parallel_instance", expected: false, reason: "检测到上一 CCM 实例仍存活" };
    else restart = { category: "unexpected_crash", expected: false, reason: "上一进程没有留下正常退出记录", task_id: previousExecution.task_id || "", trace_id: previousExecution.trace_id || "" };
    appendEvent({
      boot_id: previous.boot_id,
      pid: previous.pid,
      type: restart.expected ? "process.restart_classified" : "process.unexpected_exit_inferred",
      category: restart.category,
      reason: restart.reason,
      exit_code: previous.exit_code ?? null,
      previous_boot_id: previous.boot_id,
      previous_pid: previous.pid,
      task_id: restart.task_id,
      trace_id: restart.trace_id,
      data: { previous_started_at: previous.started_at || "", previous_last_seen_at: previous.last_seen_at || "", execution_context: previousExecution },
    });
  }
  const current = {
    version: 1,
    boot_id: BOOT_ID,
    pid: process.pid,
    hostname: os.hostname(),
    status: "running",
    started_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    restart,
    previous_boot_id: previous?.boot_id || "",
    previous_pid: Number(previous?.pid || 0),
    active_execution: activeExecutionContext(),
  };
  writeJsonAtomic(CURRENT_FILE, current);
  appendEvent({ type: "process.started", category: restart.category, reason: restart.reason, previous_boot_id: previous?.boot_id, previous_pid: previous?.pid, task_id: restart.task_id, trace_id: restart.trace_id, data: { expected: restart.expected, source: restart.source || "" } });
  return current;
}

export function touchProcessLifecycle() {
  const current = readJson(CURRENT_FILE, null);
  if (!current || current.boot_id !== BOOT_ID) return false;
  current.last_seen_at = new Date().toISOString();
  current.active_execution = activeExecutionContext();
  writeJsonAtomic(CURRENT_FILE, current);
  return true;
}

export function markProcessShutdown(input: any = {}) {
  if (shutdownRecorded) return readJson(CURRENT_FILE, null);
  shutdownRecorded = true;
  const category = normalizeCategory(input.category || (input.signal ? "system_shutdown" : "manual_restart"));
  const reason = String(input.reason || input.signal || "进程正常退出").slice(0, 1200);
  const execution = activeExecutionContext();
  const taskId = String(input.task_id || input.taskId || execution.task_id || "");
  const traceId = String(input.trace_id || input.traceId || execution.trace_id || "");
  const current = readJson(CURRENT_FILE, { boot_id: BOOT_ID, pid: process.pid, started_at: new Date().toISOString() });
  if (current.boot_id === BOOT_ID) {
    current.status = "graceful_shutdown";
    current.shutdown_at = new Date().toISOString();
    current.last_seen_at = current.shutdown_at;
    current.shutdown_category = category;
    current.shutdown_reason = reason;
    current.signal = String(input.signal || "");
    current.exit_code = input.exit_code === undefined ? 0 : input.exit_code;
    current.shutdown_task_id = taskId;
    current.shutdown_trace_id = traceId;
    current.active_execution = execution;
    writeJsonAtomic(CURRENT_FILE, current);
  }
  appendEvent({ type: "process.shutdown", category, reason, signal: input.signal, exit_code: input.exit_code === undefined ? 0 : input.exit_code, task_id: taskId, trace_id: traceId, data: { execution_context: execution } });
  return current;
}

export function recordProcessFault(error: any, type = "uncaught_exception") {
  const message = String(error?.stack || error?.message || error || "unknown process fault").slice(0, 4000);
  const execution = activeExecutionContext();
  appendEvent({ type: `process.${type}`, category: "unexpected_crash", reason: message, exit_code: 1, task_id: execution.task_id, trace_id: execution.trace_id, data: { execution_context: execution } });
  const current = readJson(CURRENT_FILE, null);
  if (current?.boot_id === BOOT_ID) {
    current.last_fault = { type, message, at: new Date().toISOString(), task_id: execution.task_id, trace_id: execution.trace_id, execution_context: execution };
    current.active_execution = execution;
    current.last_seen_at = current.last_fault.at;
    writeJsonAtomic(CURRENT_FILE, current);
  }
}

export function installProcessLifecycleFaultHandlers() {
  process.on("uncaughtExceptionMonitor", error => recordProcessFault(error, "uncaught_exception"));
  process.on("unhandledRejection", reason => recordProcessFault(reason, "unhandled_rejection"));
}

export function getProcessLifecycleSnapshot(options: any = {}) {
  const since = Date.parse(String(options.since || options.since_at || 0));
  const all = readEvents(Number(options.limit || 5000));
  const events = Number.isFinite(since) && since > 0 ? all.filter((event: any) => Date.parse(event.at || 0) >= since) : all;
  const starts = events.filter((event: any) => event.type === "process.started");
  const unexpected = starts.filter((event: any) => ["unexpected_crash", "parallel_instance"].includes(event.category));
  const planned = starts.filter((event: any) => ["manual_restart", "code_reload", "system_shutdown", "planned_restart"].includes(event.category));
  return {
    current: readJson(CURRENT_FILE, null),
    events: events.slice(-Math.max(1, Math.min(1000, Number(options.event_limit || options.eventLimit || 100)))),
    counts: { events: events.length, starts: starts.length, planned_restarts: planned.length, unexpected_restarts: unexpected.length },
    last_restart: starts[starts.length - 1] || null,
  };
}

export function runProcessLifecycleSelfTest() {
  const categories = ["manual", "reload", "shutdown", "crash"].map(normalizeCategory);
  const checks = {
    categoryNormalization: JSON.stringify(categories) === JSON.stringify(["manual_restart", "code_reload", "system_shutdown", "unexpected_crash"]),
    bootIdentityExists: !!BOOT_ID && BOOT_ID.includes(String(process.pid)),
    snapshotShape: typeof getProcessLifecycleSnapshot().counts?.unexpected_restarts === "number",
    executionContextShape: Array.isArray(activeExecutionContext().task_ids) && Array.isArray(activeExecutionContext().trace_ids),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
