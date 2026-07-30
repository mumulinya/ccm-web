"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTraceId = createTraceId;
exports.ensureTraceId = ensureTraceId;
exports.getTrace = getTrace;
exports.getTracePage = getTracePage;
exports.appendTraceEvent = appendTraceEvent;
exports.listTraces = listTraces;
exports.getIdempotencyRecord = getIdempotencyRecord;
exports.acquireIdempotency = acquireIdempotency;
exports.completeIdempotency = completeIdempotency;
exports.failIdempotency = failIdempotency;
exports.settleIdempotencyByTrace = settleIdempotencyByTrace;
exports.getTaskLease = getTaskLease;
exports.listTaskLeases = listTaskLeases;
exports.acquireTaskLease = acquireTaskLease;
exports.renewTaskLease = renewTaskLease;
exports.releaseTaskLease = releaseTaskLease;
exports.getReliabilityLedgerStats = getReliabilityLedgerStats;
exports.reconcileReliabilityLedgerDebt = reconcileReliabilityLedgerDebt;
exports.runReliabilityLedgerSelfTest = runReliabilityLedgerSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const task_replay_journal_1 = require("./task-replay-journal");
const observability_database_1 = require("./observability-database");
const trace_sanitizer_1 = require("./trace-sanitizer");
const ROOT = path.join(utils_1.CCM_DIR, "reliability");
const TRACE_DIR = path.join(ROOT, "traces");
const IDEMPOTENCY_DIR = path.join(ROOT, "idempotency");
const LEASE_DIR = path.join(ROOT, "leases");
const HOSTNAME = os.hostname();
const INSTANCE_ID = `${HOSTNAME}:${process.pid}:${crypto.randomBytes(4).toString("hex")}`;
const heldTaskLeaseTokens = new Map();
function ensureDirectories() {
    for (const dir of [ROOT, TRACE_DIR, IDEMPOTENCY_DIR, LEASE_DIR])
        fs.mkdirSync(dir, { recursive: true });
}
function safeName(value) {
    return String(value || "unknown").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 160) || "unknown";
}
function digest(value) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function parseJson(value, fallback = {}) {
    try {
        return JSON.parse(String(value || ""));
    }
    catch {
        return fallback;
    }
}
function readJson(file, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    try {
        const recovered = JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8"));
        return { ...recovered, storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() } };
    }
    catch { }
    return fallback;
}
function processAlive(pid) {
    if (!pid || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function ownerStillAlive(row) {
    if (String(row?.owner_host || "") !== HOSTNAME)
        return true;
    return processAlive(Number(row?.owner_pid || 0));
}
function traceFile(traceId) {
    return path.join(TRACE_DIR, `${safeName(traceId)}.json`);
}
function operationFile(scope, key) {
    return path.join(IDEMPOTENCY_DIR, `${safeName(scope)}-${digest(`${scope}:${key}`)}.json`);
}
function leaseFile(taskId) {
    return path.join(LEASE_DIR, `${safeName(taskId)}.json`);
}
function traceEventRow(row) {
    return {
        id: String(row.event_id || ""),
        sequence: Number(row.sequence || 0),
        at: String(row.at || ""),
        type: String(row.type || "event"),
        status: String(row.status || "info"),
        task_id: String(row.task_id || ""),
        group_id: String(row.group_id || ""),
        agent: String(row.agent || ""),
        runtime: String(row.runtime || ""),
        message: String(row.message || ""),
        data: parseJson(row.data_json, {}),
        data_checksum: String(row.data_checksum || ""),
    };
}
function operationRow(row) {
    if (!row)
        return null;
    return {
        version: 2,
        schema: "ccm-reliability-idempotency-v2",
        operation_id: row.operation_id,
        scope: row.scope,
        key_hash: row.key_checksum,
        trace_id: row.trace_id,
        status: row.status,
        owner_id: row.owner_id,
        owner_pid: Number(row.owner_pid || 0),
        owner_host: row.owner_host,
        attempt: Number(row.attempt || 0),
        fencing_token: Number(row.fencing_token || 0),
        duplicate_count: Number(row.duplicate_count || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
        lease_expires_at: row.lease_expires_at || undefined,
        completed_at: row.completed_at || undefined,
        failed_at: row.failed_at || undefined,
        last_duplicate_at: row.last_duplicate_at || undefined,
        metadata: parseJson(row.metadata_json, {}),
        result: parseJson(row.result_json, {}),
    };
}
function leaseRow(row) {
    if (!row)
        return null;
    return {
        version: 2,
        schema: "ccm-reliability-lease-v2",
        task_id: row.task_id,
        lease_id: row.lease_id,
        fencing_token: Number(row.fencing_token || 0),
        trace_id: row.trace_id,
        status: row.status,
        owner_id: row.owner_id,
        owner_pid: Number(row.owner_pid || 0),
        owner_host: row.owner_host,
        acquired_at: row.acquired_at,
        renewed_at: row.renewed_at,
        expires_at: row.expires_at || undefined,
        released_at: row.released_at || undefined,
        final_status: row.final_status || "",
        recovery_count: Number(row.recovery_count || 0),
        updated_at: row.updated_at,
    };
}
function createTraceId(prefix = "trace") {
    return `${safeName(prefix)}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}
function ensureTraceId(value, prefix = "trace") {
    const existing = String(value || "").trim();
    return existing ? safeName(existing) : createTraceId(prefix);
}
function getTrace(traceId) {
    const id = ensureTraceId(traceId);
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const trace = db.prepare("SELECT * FROM reliability_traces_v2 WHERE trace_id = ?").get(id);
    if (!trace)
        return (0, trace_sanitizer_1.sanitizeLegacyTrace)(readJson(traceFile(id), null));
    const rows = db.prepare("SELECT * FROM reliability_trace_events_v2 WHERE trace_id = ? ORDER BY sequence DESC LIMIT 1200").all(id);
    return {
        version: 2,
        schema: "ccm-reliability-trace-v2",
        trace_id: id,
        task_id: trace.task_id || "",
        group_id: trace.group_id || "",
        created_at: trace.created_at,
        updated_at: trace.updated_at,
        event_count: Number(trace.event_count || 0),
        events: rows.reverse().map(traceEventRow),
    };
}
function getTracePage(traceId, options = {}) {
    const id = ensureTraceId(traceId);
    const offset = Math.max(0, Math.floor(Number(options.offset || 0)));
    const limit = Math.max(1, Math.min(500, Math.floor(Number(options.limit || 100))));
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const trace = db.prepare("SELECT * FROM reliability_traces_v2 WHERE trace_id = ?").get(id);
    if (!trace) {
        const legacy = (0, trace_sanitizer_1.sanitizeLegacyTrace)(readJson(traceFile(id), null));
        if (!legacy)
            return null;
        const events = (legacy.events || []).slice(offset, offset + limit);
        const eventPage = { offset, limit, returned: events.length, total: legacy.events.length, has_more: offset + events.length < legacy.events.length };
        return { ...legacy, events, page: eventPage, event_page: eventPage };
    }
    const rows = db.prepare("SELECT * FROM reliability_trace_events_v2 WHERE trace_id = ? ORDER BY sequence LIMIT ? OFFSET ?").all(id, limit, offset);
    const eventPage = { offset, limit, returned: rows.length, total: Number(trace.event_count || 0), has_more: offset + rows.length < Number(trace.event_count || 0) };
    return {
        version: 2,
        schema: "ccm-reliability-trace-v2",
        trace_id: id,
        task_id: trace.task_id || "",
        group_id: trace.group_id || "",
        created_at: trace.created_at,
        updated_at: trace.updated_at,
        event_count: Number(trace.event_count || 0),
        events: rows.map(traceEventRow),
        page: eventPage,
        event_page: eventPage,
    };
}
function appendTraceEvent(traceId, input) {
    const id = ensureTraceId(traceId);
    const sanitized = (0, trace_sanitizer_1.sanitizeTraceEvent)(input);
    const eventId = sanitized.event.id || `evt_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const next = (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const at = sanitized.event.at || new Date().toISOString();
        db.prepare(`INSERT OR IGNORE INTO reliability_traces_v2(trace_id, task_id, group_id, created_at, updated_at, event_count, last_sequence)
      VALUES (?, ?, ?, ?, ?, 0, 0)`).run(id, sanitized.event.task_id, sanitized.event.group_id, at, at);
        const duplicate = db.prepare("SELECT * FROM reliability_trace_events_v2 WHERE trace_id = ? AND event_id = ?").get(id, eventId);
        if (duplicate)
            return traceEventRow(duplicate);
        const trace = db.prepare("SELECT last_sequence FROM reliability_traces_v2 WHERE trace_id = ?").get(id);
        const sequence = Number(trace?.last_sequence || 0) + 1;
        db.prepare(`INSERT INTO reliability_trace_events_v2(
      trace_id, event_id, sequence, at, type, status, task_id, group_id, agent, runtime, message, data_json, data_checksum
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, eventId, sequence, at, sanitized.event.type, sanitized.event.status, sanitized.event.task_id, sanitized.event.group_id, sanitized.event.agent, sanitized.event.runtime, sanitized.event.message, JSON.stringify(sanitized.event.data), sanitized.dataChecksum);
        db.prepare(`UPDATE reliability_traces_v2 SET
      task_id = CASE WHEN ? <> '' THEN ? ELSE task_id END,
      group_id = CASE WHEN ? <> '' THEN ? ELSE group_id END,
      updated_at = ?, event_count = event_count + 1, last_sequence = ?
      WHERE trace_id = ?`).run(sanitized.event.task_id, sanitized.event.task_id, sanitized.event.group_id, sanitized.event.group_id, at, sequence, id);
        return { ...sanitized.event, id: eventId, sequence, data_checksum: sanitized.dataChecksum };
    });
    if (next.task_id) {
        try {
            (0, task_replay_journal_1.appendTaskReplayJournalEvent)(next.task_id, { ...next, trace_id: id });
        }
        catch { }
    }
    return next;
}
function listTraces(limit = 50) {
    const size = Math.max(1, Math.min(500, Number(limit || 50)));
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const rows = db.prepare("SELECT * FROM reliability_traces_v2 ORDER BY updated_at DESC LIMIT ?").all(size);
    const result = rows.map(row => ({
        version: 2,
        schema: "ccm-reliability-trace-summary-v2",
        trace_id: row.trace_id,
        task_id: row.task_id,
        group_id: row.group_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        event_count: Number(row.event_count || 0),
    }));
    if (result.length >= size)
        return result;
    ensureDirectories();
    const seen = new Set(result.map(item => item.trace_id));
    const legacy = fs.readdirSync(TRACE_DIR)
        .filter(name => name.endsWith(".json") && !name.endsWith(".bak"))
        .map(name => (0, trace_sanitizer_1.sanitizeLegacyTrace)(readJson(path.join(TRACE_DIR, name), null)))
        .filter((item) => item && !seen.has(item.trace_id))
        .sort((a, b) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0));
    return [...result, ...legacy].slice(0, size);
}
function getIdempotencyRecord(scopeInput, key) {
    const scope = safeName(scopeInput);
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope = ? AND key_checksum = ?").get(scope, digest(key));
    return operationRow(row) || readJson(operationFile(scope, key), null);
}
function acquireIdempotency(input) {
    const scope = safeName(input.scope);
    const key = String(input.key || "").trim();
    if (!key)
        throw new Error(`幂等操作 ${scope} 缺少 key`);
    const keyHash = digest(key);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const leaseMs = Math.max(5_000, Math.min(24 * 60 * 60_000, Number(input.leaseMs || 60_000)));
    const outcome = (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const existing = db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope = ? AND key_checksum = ?").get(scope, keyHash);
        // A contender cannot steal a lease merely because the owner process has exited.
        // Recovery owns that decision after expiry; otherwise an abrupt exit can cause
        // a second process to repeat a side effect before the first result is reconciled.
        const active = existing?.status === "in_progress" && Date.parse(existing.lease_expires_at || 0) > now;
        if (existing?.status === "completed" || active || (existing?.status === "failed" && input.retryFailed === false)) {
            db.prepare("UPDATE reliability_idempotency_v2 SET duplicate_count = duplicate_count + 1, last_duplicate_at = ?, updated_at = ? WHERE scope = ? AND key_checksum = ?").run(nowIso, nowIso, scope, keyHash);
            const duplicate = db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope = ? AND key_checksum = ?").get(scope, keyHash);
            return { acquired: false, active, record: operationRow(duplicate) };
        }
        const traceId = ensureTraceId(existing?.trace_id || input.traceId, scope);
        const attempt = Number(existing?.attempt || 0) + 1;
        const fencingToken = Number(existing?.fencing_token || 0) + 1;
        const operationId = existing?.operation_id || `op_${crypto.randomBytes(8).toString("hex")}`;
        const metadata = (0, trace_sanitizer_1.sanitizeTraceValue)({ ...parseJson(existing?.metadata_json, {}), ...(input.metadata || {}) });
        db.prepare(`INSERT INTO reliability_idempotency_v2(
      scope, key_checksum, operation_id, trace_id, status, owner_id, owner_pid, owner_host, attempt, fencing_token,
      duplicate_count, created_at, updated_at, lease_expires_at, completed_at, failed_at, last_duplicate_at, metadata_json, result_json
    ) VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, '{}')
    ON CONFLICT(scope, key_checksum) DO UPDATE SET
      trace_id=excluded.trace_id, status='in_progress', owner_id=excluded.owner_id, owner_pid=excluded.owner_pid,
      owner_host=excluded.owner_host, attempt=excluded.attempt, fencing_token=excluded.fencing_token,
      updated_at=excluded.updated_at, lease_expires_at=excluded.lease_expires_at, completed_at=NULL, failed_at=NULL,
      metadata_json=excluded.metadata_json, result_json='{}'`).run(scope, keyHash, operationId, traceId, INSTANCE_ID, process.pid, HOSTNAME, attempt, fencingToken, Number(existing?.duplicate_count || 0), existing?.created_at || nowIso, nowIso, new Date(now + leaseMs).toISOString(), existing?.last_duplicate_at || null, JSON.stringify(metadata));
        const record = db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope = ? AND key_checksum = ?").get(scope, keyHash);
        return { acquired: true, active: false, recovered: !!existing && existing.status === "in_progress", record: operationRow(record) };
    });
    if (!outcome.acquired) {
        appendTraceEvent(outcome.record.trace_id, { id: `${outcome.record.operation_id}:duplicate:${outcome.record.duplicate_count}`, type: "idempotency.duplicate_suppressed", status: "warning", message: `${scope} 重复操作已抑制`, data: { scope, duplicate_count: outcome.record.duplicate_count, in_progress: outcome.active } });
        return { acquired: false, duplicate: true, inProgress: outcome.active, record: outcome.record, traceId: outcome.record.trace_id };
    }
    appendTraceEvent(outcome.record.trace_id, { id: `${outcome.record.operation_id}:attempt:${outcome.record.attempt}`, type: "idempotency.acquired", status: outcome.recovered ? "warning" : "info", message: `${scope} 操作已认领`, data: { scope, attempt: outcome.record.attempt, fencing_token: outcome.record.fencing_token, recovered_from_stale: outcome.recovered } });
    return { acquired: true, duplicate: false, inProgress: false, record: outcome.record, traceId: outcome.record.trace_id };
}
function finishIdempotency(scopeInput, key, status, result) {
    const scope = safeName(scopeInput);
    const keyHash = digest(key);
    const current = (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const row = db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope = ? AND key_checksum = ?").get(scope, keyHash);
        if (!row)
            throw new Error(`幂等操作不存在：${scope}`);
        if (row.status === "completed")
            return operationRow(row);
        if (row.status === "in_progress" && row.owner_id !== INSTANCE_ID)
            throw new Error(`幂等操作所有权已变化：${scope}`);
        const at = new Date().toISOString();
        db.prepare(`UPDATE reliability_idempotency_v2 SET status = ?, updated_at = ?, completed_at = ?, failed_at = ?,
      lease_expires_at = NULL, result_json = ? WHERE scope = ? AND key_checksum = ? AND fencing_token = ?`).run(status, at, status === "completed" ? at : null, status === "failed" ? at : null, JSON.stringify((0, trace_sanitizer_1.sanitizeTraceValue)(result)), scope, keyHash, row.fencing_token);
        return operationRow(db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope = ? AND key_checksum = ?").get(scope, keyHash));
    });
    appendTraceEvent(current.trace_id, { id: `${current.operation_id}:${status}:${current.attempt}`, type: `idempotency.${status}`, status: status === "completed" ? "ok" : "error", message: `${scope} 操作${status === "completed" ? "完成" : "失败"}`, data: { scope, attempt: current.attempt, fencing_token: current.fencing_token } });
    return current;
}
function completeIdempotency(scope, key, result = {}) {
    return finishIdempotency(scope, key, "completed", result);
}
function failIdempotency(scope, key, error) {
    return finishIdempotency(scope, key, "failed", { error: String(error?.message || error || "unknown error").slice(0, 2000) });
}
function settleIdempotencyByTrace(traceId, status, result = {}, scopes = []) {
    const wanted = String(traceId || "").trim();
    if (!wanted)
        return [];
    const wantedScopes = new Set(scopes.map(safeName));
    const settled = (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const rows = db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE trace_id = ? AND status = 'in_progress'").all(wanted);
        const selected = rows.filter(row => wantedScopes.size === 0 || wantedScopes.has(row.scope));
        const at = new Date().toISOString();
        for (const row of selected)
            db.prepare(`UPDATE reliability_idempotency_v2 SET status=?, updated_at=?, completed_at=?, failed_at=?, lease_expires_at=NULL, result_json=? WHERE scope=? AND key_checksum=? AND fencing_token=?`).run(status, at, status === "completed" ? at : null, status === "failed" ? at : null, JSON.stringify((0, trace_sanitizer_1.sanitizeTraceValue)(result)), row.scope, row.key_checksum, row.fencing_token);
        return selected.map(row => operationRow(db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE scope=? AND key_checksum=?").get(row.scope, row.key_checksum)));
    });
    for (const row of settled)
        appendTraceEvent(row.trace_id, { id: `${row.operation_id}:${status}:recovered:${row.attempt}`, type: `idempotency.${status}_after_recovery`, status: status === "completed" ? "ok" : "error", message: `${row.scope} 在持久运行恢复后完成账本结算`, data: { scope: row.scope, attempt: row.attempt, fencing_token: row.fencing_token } });
    return settled;
}
function getTaskLease(taskId) {
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM reliability_task_leases_v2 WHERE task_id = ?").get(String(taskId || ""));
    return leaseRow(row) || readJson(leaseFile(taskId), null);
}
function listTaskLeases() {
    return (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT * FROM reliability_task_leases_v2 ORDER BY updated_at DESC").all().map(leaseRow);
}
function acquireTaskLease(taskIdInput, traceId, ttlMs = 45_000) {
    const taskId = String(taskIdInput || "").trim();
    if (!taskId)
        throw new Error("任务租约缺少taskId");
    const now = Date.now();
    const at = new Date(now).toISOString();
    const ttl = Math.max(10_000, Math.min(10 * 60_000, Number(ttlMs || 45_000)));
    const outcome = (0, observability_database_1.withImmediateObservabilityTransaction)(db => {
        const existing = db.prepare("SELECT * FROM reliability_task_leases_v2 WHERE task_id = ?").get(taskId);
        const active = existing?.status === "active" && Date.parse(existing.expires_at || 0) > now;
        if (active && existing.owner_id !== INSTANCE_ID)
            return { acquired: false, lease: leaseRow(existing), recovered: false };
        if (active && existing.owner_id === INSTANCE_ID)
            return { acquired: true, lease: leaseRow(existing), recovered: false };
        const fencingToken = Number(existing?.fencing_token || 0) + 1;
        const leaseId = `lease_${crypto.randomBytes(10).toString("hex")}`;
        const recoveryCount = Number(existing?.recovery_count || 0) + (existing?.status === "active" ? 1 : 0);
        db.prepare(`INSERT INTO reliability_task_leases_v2(task_id, lease_id, fencing_token, trace_id, status, owner_id, owner_pid, owner_host, acquired_at, renewed_at, expires_at, released_at, final_status, recovery_count, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, NULL, '', ?, ?)
      ON CONFLICT(task_id) DO UPDATE SET lease_id=excluded.lease_id, fencing_token=excluded.fencing_token,
      trace_id=excluded.trace_id, status='active', owner_id=excluded.owner_id, owner_pid=excluded.owner_pid,
      owner_host=excluded.owner_host, acquired_at=excluded.acquired_at, renewed_at=excluded.renewed_at,
      expires_at=excluded.expires_at, released_at=NULL, final_status='', recovery_count=excluded.recovery_count, updated_at=excluded.updated_at`).run(taskId, leaseId, fencingToken, ensureTraceId(existing?.trace_id || traceId, "task"), INSTANCE_ID, process.pid, HOSTNAME, at, at, new Date(now + ttl).toISOString(), recoveryCount, at);
        return { acquired: true, lease: leaseRow(db.prepare("SELECT * FROM reliability_task_leases_v2 WHERE task_id = ?").get(taskId)), recovered: existing?.status === "active" };
    });
    if (outcome.acquired) {
        heldTaskLeaseTokens.set(taskId, { leaseId: outcome.lease.lease_id, fencingToken: outcome.lease.fencing_token });
        appendTraceEvent(outcome.lease.trace_id, { id: `lease:${taskId}:${outcome.lease.fencing_token}:acquired`, type: outcome.recovered ? "task.lease_recovered" : "task.lease_acquired", status: outcome.recovered ? "warning" : "info", task_id: taskId, message: outcome.recovered ? "旧执行租约已失效，任务由新实例接管" : "任务执行租约已获取", data: { lease_id: outcome.lease.lease_id, fencing_token: outcome.lease.fencing_token, recovery_count: outcome.lease.recovery_count } });
    }
    return { acquired: outcome.acquired, lease: outcome.lease };
}
function renewTaskLease(taskIdInput, ttlMs = 45_000) {
    const taskId = String(taskIdInput || "").trim();
    const held = heldTaskLeaseTokens.get(taskId);
    if (!held)
        return false;
    const now = Date.now();
    const result = (0, observability_database_1.getObservabilityDatabase)().prepare(`UPDATE reliability_task_leases_v2 SET renewed_at=?, expires_at=?, updated_at=?
    WHERE task_id=? AND status='active' AND owner_id=? AND lease_id=? AND fencing_token=?`).run(new Date(now).toISOString(), new Date(now + Math.max(10_000, Number(ttlMs || 45_000))).toISOString(), new Date(now).toISOString(), taskId, INSTANCE_ID, held.leaseId, held.fencingToken);
    return result.changes === 1;
}
function releaseTaskLease(taskIdInput, finalStatus = "released") {
    const taskId = String(taskIdInput || "").trim();
    const held = heldTaskLeaseTokens.get(taskId);
    if (!held)
        return false;
    const at = new Date().toISOString();
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const before = db.prepare("SELECT * FROM reliability_task_leases_v2 WHERE task_id=?").get(taskId);
    const result = db.prepare(`UPDATE reliability_task_leases_v2 SET status='released', final_status=?, released_at=?, updated_at=?, expires_at=NULL
    WHERE task_id=? AND status='active' AND owner_id=? AND lease_id=? AND fencing_token=?`).run(finalStatus, at, at, taskId, INSTANCE_ID, held.leaseId, held.fencingToken);
    if (result.changes !== 1)
        return false;
    heldTaskLeaseTokens.delete(taskId);
    appendTraceEvent(before.trace_id, { id: `lease:${taskId}:${held.fencingToken}:released`, type: "task.lease_released", status: "ok", task_id: taskId, message: `任务执行租约已释放：${finalStatus}`, data: { lease_id: held.leaseId, fencing_token: held.fencingToken } });
    return true;
}
function getReliabilityLedgerStats() {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const operations = db.prepare("SELECT * FROM reliability_idempotency_v2").all();
    const leases = db.prepare("SELECT * FROM reliability_task_leases_v2").all();
    const traces = db.prepare("SELECT COUNT(*) total, COALESCE(SUM(event_count), 0) events FROM reliability_traces_v2").get();
    const now = Date.now();
    const staleOperations = operations.filter(row => row.status === "in_progress" && (Date.parse(row.lease_expires_at || 0) <= now || !ownerStillAlive(row)));
    const staleLeases = leases.filter(row => row.status === "active" && (Date.parse(row.expires_at || 0) <= now || !ownerStillAlive(row)));
    return {
        schema: "ccm-reliability-ledger-stats-v2",
        operations: { total: operations.length, in_progress: operations.filter(row => row.status === "in_progress").length, completed: operations.filter(row => row.status === "completed").length, failed: operations.filter(row => row.status === "failed").length, duplicate_suppressed: operations.reduce((sum, row) => sum + Number(row.duplicate_count || 0), 0), stale_in_progress: staleOperations.length, stale_items: staleOperations.slice(0, 50).map(operationRow) },
        leases: { total: leases.length, active: leases.filter(row => row.status === "active" && Date.parse(row.expires_at || 0) > now && ownerStillAlive(row)).length, stale: staleLeases.length, stale_items: staleLeases.slice(0, 50).map(leaseRow), recoveries: leases.reduce((sum, row) => sum + Number(row.recovery_count || 0), 0) },
        traces: { total: Number(traces?.total || 0), events: Number(traces?.events || 0), legacy_files: fs.existsSync(TRACE_DIR) ? fs.readdirSync(TRACE_DIR).filter(name => name.endsWith(".json") && !name.endsWith(".bak")).length : 0 },
    };
}
function reconcileReliabilityLedgerDebt(reason = "稳定性验收前清理失效账本") {
    const at = new Date().toISOString();
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const operationRows = db.prepare("SELECT * FROM reliability_idempotency_v2 WHERE status='in_progress'").all().filter(row => Date.parse(row.lease_expires_at || 0) <= Date.now() || !ownerStillAlive(row));
    const leaseRows = db.prepare("SELECT * FROM reliability_task_leases_v2 WHERE status='active'").all().filter(row => Date.parse(row.expires_at || 0) <= Date.now() || !ownerStillAlive(row));
    (0, observability_database_1.withImmediateObservabilityTransaction)(tx => {
        for (const row of operationRows)
            tx.prepare("UPDATE reliability_idempotency_v2 SET status='failed', updated_at=?, failed_at=?, lease_expires_at=NULL, result_json=? WHERE scope=? AND key_checksum=? AND fencing_token=?").run(at, at, JSON.stringify({ error: reason, reconciled: true, previous_owner_pid: row.owner_pid }), row.scope, row.key_checksum, row.fencing_token);
        for (const row of leaseRows)
            tx.prepare("UPDATE reliability_task_leases_v2 SET status='released', final_status='orphaned_reconciled', released_at=?, updated_at=?, expires_at=NULL WHERE task_id=? AND fencing_token=?").run(at, at, row.task_id, row.fencing_token);
    });
    for (const row of operationRows)
        appendTraceEvent(row.trace_id, { type: "idempotency.stale_reconciled", status: "warning", message: reason, data: { operation_id: row.operation_id, scope: row.scope, previous_owner_pid: row.owner_pid, fencing_token: row.fencing_token } });
    for (const row of leaseRows)
        appendTraceEvent(row.trace_id, { type: "task.lease_stale_reconciled", status: "warning", task_id: row.task_id, message: reason, data: { previous_owner_pid: row.owner_pid, fencing_token: row.fencing_token } });
    return { reconciled_at: at, reason, operations: operationRows.map(operationRow), leases: leaseRows.map(leaseRow), operation_count: operationRows.length, lease_count: leaseRows.length };
}
function runReliabilityLedgerSelfTest() {
    const suffix = `${process.pid}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const scope = `selftest-${suffix}`;
    const key = `message-${suffix}`;
    const recoveryScope = `selftest-recovery-${suffix}`;
    const recoveryKey = `recovery-${suffix}`;
    const taskId = `task-${suffix}`;
    const traceId = createTraceId("selftest");
    const first = acquireIdempotency({ scope, key, traceId, metadata: { api_key: "must-not-leak" } });
    const duplicateRunning = acquireIdempotency({ scope, key, traceId });
    completeIdempotency(scope, key, { task_id: taskId });
    const duplicateComplete = acquireIdempotency({ scope, key, traceId });
    const lease = acquireTaskLease(taskId, traceId, 20_000);
    const renewed = renewTaskLease(taskId, 20_000);
    const released = releaseTaskLease(taskId, "done");
    const db = (0, observability_database_1.getObservabilityDatabase)();
    db.prepare("UPDATE reliability_task_leases_v2 SET status='active', owner_id='dead-instance', owner_pid=2147483000, owner_host=?, expires_at=? WHERE task_id=?").run(HOSTNAME, new Date(Date.now() + 60_000).toISOString(), taskId);
    const recovery = reconcileReliabilityLedgerDebt("selftest dead owner recovery");
    const recoveredLease = acquireTaskLease(taskId, traceId, 20_000);
    releaseTaskLease(taskId, "recovered");
    acquireIdempotency({ scope: recoveryScope, key: recoveryKey, traceId });
    const settledByTrace = settleIdempotencyByTrace(traceId, "completed", { recovered: true }, [recoveryScope]);
    const settledRecord = getIdempotencyRecord(recoveryScope, recoveryKey);
    const trace = getTrace(traceId);
    const serialized = JSON.stringify(trace);
    const checks = {
        firstAttemptAcquired: first.acquired === true,
        duplicateRunningSuppressed: duplicateRunning.acquired === false && duplicateRunning.inProgress === true,
        completedResultReplayed: duplicateComplete.acquired === false && duplicateComplete.record?.result?.task_id === taskId,
        taskLeaseLifecycleWorks: lease.acquired === true && renewed === true && released === true,
        fencingTokenIssued: Number(lease.lease?.fencing_token || 0) > 0 && !!lease.lease?.lease_id,
        deadOwnerLeaseIsRecovered: recovery.lease_count === 1 && recoveredLease.acquired === true && Number(recoveredLease.lease?.fencing_token || 0) > Number(lease.lease?.fencing_token || 0),
        recoveredRunSettlesIdempotency: settledByTrace.length === 1 && settledRecord?.status === "completed" && settledRecord?.result?.recovered === true,
        traceEventsPersist: Array.isArray(trace?.events) && trace.events.length >= 4,
        traceSecretsRedacted: !serialized.includes("must-not-leak"),
    };
    (0, observability_database_1.withImmediateObservabilityTransaction)(tx => {
        tx.prepare("DELETE FROM reliability_idempotency_v2 WHERE scope IN (?, ?)").run(scope, recoveryScope);
        tx.prepare("DELETE FROM reliability_task_leases_v2 WHERE task_id = ?").run(taskId);
        tx.prepare("DELETE FROM reliability_traces_v2 WHERE trace_id = ?").run(traceId);
    });
    heldTaskLeaseTokens.delete(taskId);
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=reliability-ledger.js.map