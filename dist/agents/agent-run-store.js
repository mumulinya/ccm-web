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
exports.getAgentRunInTransaction = getAgentRunInTransaction;
exports.getAgentRun = getAgentRun;
exports.getAgentRunByIdempotencyKey = getAgentRunByIdempotencyKey;
exports.listAgentRuns = listAgentRuns;
exports.listAgentRunEvents = listAgentRunEvents;
exports.verifyAgentRunEventLedger = verifyAgentRunEventLedger;
exports.createAgentRunInTransaction = createAgentRunInTransaction;
exports.createAgentRun = createAgentRun;
exports.ensureAgentRun = ensureAgentRun;
exports.transitionAgentRunInTransaction = transitionAgentRunInTransaction;
exports.transitionAgentRun = transitionAgentRun;
exports.claimAgentRunLeaseInTransaction = claimAgentRunLeaseInTransaction;
exports.claimAgentRunLease = claimAgentRunLease;
exports.appendAgentRunEvent = appendAgentRunEvent;
exports.touchAgentRunLease = touchAgentRunLease;
exports.updateAgentRunBindings = updateAgentRunBindings;
exports.heartbeatAgentRunLease = heartbeatAgentRunLease;
exports.releaseAgentRunLease = releaseAgentRunLease;
exports.expireAgentRunLeases = expireAgentRunLeases;
exports.recoverAgentRun = recoverAgentRun;
exports.recordAgentRunUsage = recordAgentRunUsage;
exports.listAgentRunUsage = listAgentRunUsage;
exports.reconcileLegacyAgentRuns = reconcileLegacyAgentRuns;
exports.reconcileAgentRunLeases = reconcileAgentRunLeases;
exports.buildAgentRunProjection = buildAgentRunProjection;
exports.buildTaskAgentRunProjection = buildTaskAgentRunProjection;
exports.getAgentRunMetrics = getAgentRunMetrics;
const crypto = __importStar(require("crypto"));
const task_store_1 = require("../core/task-store");
const agent_run_lifecycle_1 = require("./agent-run-lifecycle");
const agent_run_types_1 = require("./agent-run-types");
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`; }
function json(value, fallback = {}) {
    try {
        return JSON.stringify(value ?? fallback);
    }
    catch {
        return JSON.stringify(fallback);
    }
}
function parse(value, fallback = {}) {
    try {
        return JSON.parse(String(value || ""));
    }
    catch {
        return fallback;
    }
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function text(value) { return String(value ?? "").trim(); }
function sanitizeStoredValue(value, key = "", depth = 0) {
    const normalizedKey = String(key || "").toLowerCase();
    if (/(prompt|stdout|stderr|(^|_)output($|_)|raw.?output|hidden.?reasoning|secret|api.?key|authorization|password|credential)/i.test(normalizedKey)) {
        return { redacted: true };
    }
    if (depth > 4)
        return "[truncated]";
    if (typeof value === "string")
        return value.slice(0, 1000);
    if (value === null || value === undefined || typeof value !== "object")
        return value;
    if (Array.isArray(value))
        return value.slice(0, 50).map(item => sanitizeStoredValue(item, key, depth + 1));
    return Object.fromEntries(Object.entries(value).slice(0, 80).map(([childKey, childValue]) => [childKey, sanitizeStoredValue(childValue, childKey, depth + 1)]));
}
function rowToRun(row) {
    return {
        runId: text(row.run_id),
        traceId: text(row.trace_id),
        taskId: text(row.task_id),
        attemptId: text(row.attempt_id),
        parentRunId: text(row.parent_run_id),
        scope: (0, agent_run_types_1.normalizeAgentRunScope)(row.scope),
        scopeId: text(row.scope_id),
        agentId: text(row.agent_id),
        runtimeId: text(row.runtime_id),
        runtimeVersionSnapshot: parse(row.runtime_version_snapshot_json),
        taskAgentSessionId: text(row.task_agent_session_id),
        nativeSessionId: text(row.native_session_id),
        executionId: text(row.execution_id),
        workspacePath: text(row.workspace_path),
        worktreeId: text(row.worktree_id),
        workspaceEvidence: parse(row.workspace_evidence_json, null),
        triggerType: (0, agent_run_types_1.normalizeAgentRunTrigger)(row.trigger_type),
        status: text(row.status),
        leaseId: text(row.lease_id),
        leaseOwnerId: text(row.lease_owner_id),
        leaseExpiresAt: text(row.lease_expires_at),
        leaseVersion: Number(row.lease_version || 0),
        idempotencyKey: text(row.idempotency_key),
        source: text(row.source) || "ccm",
        startedAt: text(row.started_at),
        lastHeartbeatAt: text(row.last_heartbeat_at),
        finishedAt: text(row.finished_at),
        result: parse(row.result_json),
        error: parse(row.error_json),
        createdAt: text(row.created_at),
        updatedAt: text(row.updated_at),
    };
}
function rowToEvent(row) {
    return {
        eventId: text(row.event_id),
        runId: text(row.run_id),
        sequence: Number(row.sequence || 0),
        eventType: text(row.event_type),
        status: text(row.status),
        message: text(row.message),
        payload: parse(row.payload_json),
        payloadRef: text(row.payload_ref),
        idempotencyKey: text(row.idempotency_key),
        previousChecksum: text(row.previous_checksum),
        checksum: text(row.checksum),
        createdAt: text(row.created_at),
    };
}
function insertEvent(db, run, event) {
    const requestedKey = text(event.idempotencyKey);
    if (requestedKey) {
        const existing = db.prepare("SELECT * FROM agent_run_events WHERE idempotency_key = ?").get(requestedKey);
        if (existing)
            return rowToEvent(existing);
    }
    const last = db.prepare("SELECT sequence, checksum FROM agent_run_events WHERE run_id = ? ORDER BY sequence DESC LIMIT 1").get(run.runId);
    const sequence = Number(last?.sequence || 0) + 1;
    const createdAt = now();
    const eventId = id("are");
    const eventKey = requestedKey || `${run.runId}:${sequence}:${event.eventType}`;
    const body = {
        eventId,
        runId: run.runId,
        sequence,
        eventType: text(event.eventType) || "run.updated",
        status: text(event.status),
        message: text(event.message),
        payload: sanitizeStoredValue(event.payload ?? {}),
        payloadRef: text(event.payloadRef),
        idempotencyKey: eventKey,
        previousChecksum: text(last?.checksum),
        createdAt,
    };
    const eventChecksum = checksum(body);
    db.prepare(`
    INSERT INTO agent_run_events(
      event_id, run_id, sequence, event_type, status, message, payload_json,
      payload_ref, idempotency_key, previous_checksum, checksum, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(idempotency_key) DO NOTHING
  `).run(eventId, run.runId, sequence, body.eventType, body.status, body.message, json(body.payload), body.payloadRef, eventKey, body.previousChecksum, eventChecksum, createdAt);
    return { ...body, checksum: eventChecksum };
}
function resolveRun(db, runId) {
    const row = db.prepare("SELECT * FROM agent_runs WHERE run_id = ?").get(text(runId));
    return row ? rowToRun(row) : null;
}
function getAgentRunInTransaction(db, runId) {
    return resolveRun(db, runId);
}
function getAgentRun(runId) {
    return (0, task_store_1.withSqliteTaskStore)(db => resolveRun(db, runId));
}
function getAgentRunByIdempotencyKey(key) {
    const value = text(key);
    if (!value)
        return null;
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const row = db.prepare("SELECT * FROM agent_runs WHERE idempotency_key = ?").get(value);
        return row ? rowToRun(row) : null;
    });
}
function listAgentRuns(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const clauses = [];
        const values = [];
        const add = (column, value) => { if (text(value)) {
            clauses.push(`${column} = ?`);
            values.push(text(value));
        } };
        add("task_id", filters.taskId || filters.task_id);
        add("trace_id", filters.traceId || filters.trace_id);
        add("execution_id", filters.executionId || filters.execution_id);
        add("runtime_id", filters.runtimeId || filters.runtime_id);
        add("status", filters.status);
        const limit = Math.min(500, Math.max(1, Number(filters.limit || 100)));
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        return db.prepare(`SELECT * FROM agent_runs ${where} ORDER BY created_at DESC LIMIT ?`).all(...values, limit).map(rowToRun);
    });
}
function listAgentRunEvents(runId, limit = 500) {
    return (0, task_store_1.withSqliteTaskStore)(db => db.prepare("SELECT * FROM agent_run_events WHERE run_id = ? ORDER BY sequence ASC LIMIT ?").all(text(runId), Math.min(1000, Math.max(1, Number(limit || 500)))).map(rowToEvent));
}
function verifyAgentRunEventLedger(runId) {
    const events = listAgentRunEvents(runId, 1000);
    let previousChecksum = "";
    const issues = [];
    events.forEach((event, index) => {
        if (event.sequence !== index + 1)
            issues.push(`sequence_gap:${event.sequence}`);
        if (event.previousChecksum !== previousChecksum)
            issues.push(`previous_checksum_mismatch:${event.sequence}`);
        const body = {
            eventId: event.eventId,
            runId: event.runId,
            sequence: event.sequence,
            eventType: event.eventType,
            status: event.status,
            message: event.message,
            payload: event.payload ?? {},
            payloadRef: event.payloadRef,
            idempotencyKey: event.idempotencyKey,
            previousChecksum: event.previousChecksum,
            createdAt: event.createdAt,
        };
        if (checksum(body) !== event.checksum)
            issues.push(`checksum_mismatch:${event.sequence}`);
        previousChecksum = event.checksum;
    });
    return { valid: issues.length === 0, count: events.length, issues };
}
/**
 * Transaction-local Run creation. Callers that already own an IMMEDIATE
 * transaction (Heartbeat coordination, recovery, etc.) use this function so
 * the Run row and its first ledger event commit with the caller's records.
 */
function createAgentRunInTransaction(db, input) {
    const taskId = text(input.taskId);
    const executionId = text(input.executionId);
    const runtimeId = text(input.runtimeId) || "unknown";
    const attemptId = text(input.attemptId) || "attempt-1";
    const requestedRunId = text(input.runId);
    const parentRunId = text(input.parentRunId);
    if (requestedRunId && parentRunId && requestedRunId === parentRunId) {
        throw new Error("AgentRun 不能把自身作为 parent_run_id");
    }
    const idempotencyKey = text(input.idempotencyKey) || `run:${taskId || "standalone"}:${attemptId}:${executionId}:${runtimeId}`;
    const existing = db.prepare("SELECT * FROM agent_runs WHERE idempotency_key = ?").get(idempotencyKey);
    if (existing)
        return { run: rowToRun(existing), created: false };
    // Explicit Run IDs are used when materializing legacy/external records. A
    // repeated materialization must be idempotent even when the caller chose a
    // different compatibility idempotency key.
    if (requestedRunId) {
        const existingById = db.prepare("SELECT * FROM agent_runs WHERE run_id = ?").get(requestedRunId);
        if (existingById) {
            const current = rowToRun(existingById);
            const conflicts = [
                ["trace_id", text(input.traceId), current.traceId],
                ["task_id", taskId, current.taskId],
                ["attempt_id", attemptId, current.attemptId],
                ["runtime_id", runtimeId, current.runtimeId],
            ].filter(([, supplied, stored]) => supplied && stored && supplied !== stored);
            if (conflicts.length) {
                throw Object.assign(new Error(`AgentRun 身份绑定冲突：${conflicts.map(item => item[0]).join(", ")}`), {
                    code: "CCM_RUN_IDENTITY_CONFLICT",
                    runId: requestedRunId,
                });
            }
            return { run: current, created: false };
        }
    }
    const createdAt = now();
    const run = {
        runId: requestedRunId || id("run"),
        traceId: text(input.traceId) || id("trace"),
        taskId,
        attemptId,
        parentRunId,
        scope: (0, agent_run_types_1.normalizeAgentRunScope)(input.scope),
        scopeId: text(input.scopeId) || taskId,
        agentId: text(input.agentId) || runtimeId,
        runtimeId,
        runtimeVersionSnapshot: input.runtimeVersionSnapshot || {},
        taskAgentSessionId: text(input.taskAgentSessionId),
        nativeSessionId: text(input.nativeSessionId),
        executionId,
        workspacePath: text(input.workspacePath),
        worktreeId: text(input.worktreeId),
        workspaceEvidence: input.workspaceEvidence || null,
        triggerType: (0, agent_run_types_1.normalizeAgentRunTrigger)(input.triggerType),
        status: "created",
        leaseId: text(input.leaseId),
        leaseOwnerId: text(input.leaseOwnerId || input.lease_owner_id),
        leaseExpiresAt: text(input.leaseExpiresAt || input.lease_expires_at),
        leaseVersion: Number(input.leaseVersion || input.lease_version || 0),
        idempotencyKey,
        source: text(input.source) || "ccm",
        startedAt: "",
        lastHeartbeatAt: "",
        finishedAt: "",
        result: {},
        error: {},
        createdAt,
        updatedAt: createdAt,
    };
    db.prepare(`
    INSERT INTO agent_runs(
      run_id, trace_id, task_id, attempt_id, parent_run_id, scope, scope_id,
      agent_id, runtime_id, runtime_version_snapshot_json, task_agent_session_id,
      native_session_id, execution_id, workspace_path, worktree_id, workspace_evidence_json, trigger_type,
      status, lease_id, lease_owner_id, lease_expires_at, lease_version, idempotency_key, source, started_at, last_heartbeat_at,
      finished_at, result_json, error_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(run.runId, run.traceId, run.taskId, run.attemptId, run.parentRunId, run.scope, run.scopeId, run.agentId, run.runtimeId, json(run.runtimeVersionSnapshot), run.taskAgentSessionId, run.nativeSessionId, run.executionId, run.workspacePath, run.worktreeId, json(run.workspaceEvidence), run.triggerType, run.status, run.leaseId, run.leaseOwnerId, run.leaseExpiresAt, run.leaseVersion, run.idempotencyKey, run.source, run.startedAt, run.lastHeartbeatAt, run.finishedAt, json(run.result), json(run.error), run.createdAt, run.updatedAt);
    insertEvent(db, run, { eventType: "run.created", status: run.status, message: "AgentRun 已创建" });
    return { run, created: true };
}
function createAgentRun(input) {
    const taskId = text(input.taskId);
    const runtimeId = text(input.runtimeId) || "unknown";
    try {
        return (0, task_store_1.withImmediateTaskStoreTransaction)(db => createAgentRunInTransaction(db, input));
    }
    catch (error) {
        if (!String(error?.code || "").includes("SQLITE_CONSTRAINT"))
            throw error;
        const winner = listAgentRuns({ taskId, limit: 100 }).find(candidate => !(0, agent_run_lifecycle_1.isAgentRunTerminal)(candidate.status)
            && candidate.status !== "recovery_required"
            && candidate.agentId === (text(input.agentId) || runtimeId)
            && candidate.scopeId === (text(input.scopeId) || taskId));
        if (winner)
            return { run: winner, created: false };
        throw error;
    }
}
function ensureAgentRun(input) {
    return createAgentRun(input).run;
}
function transitionAgentRunInTransaction(db, runId, status, message = "", extra = {}) {
    const current = resolveRun(db, runId);
    if (!current)
        return null;
    if ((0, agent_run_lifecycle_1.isAgentRunTerminal)(current.status))
        return current;
    (0, agent_run_lifecycle_1.assertAgentRunTransition)(current.status, status);
    const at = now();
    const startedAt = current.startedAt || (["starting", "running"].includes(status) ? at : "");
    const finishedAt = (0, agent_run_lifecycle_1.isAgentRunTerminal)(status) ? (current.finishedAt || at) : current.finishedAt;
    const result = sanitizeStoredValue(extra.result !== undefined ? extra.result : current.result, "result");
    const error = sanitizeStoredValue(extra.error !== undefined ? extra.error : current.error, "error");
    db.prepare(`
    UPDATE agent_runs SET status = ?, lease_id = ?, started_at = ?, last_heartbeat_at = ?,
      finished_at = ?, result_json = ?, error_json = ?, updated_at = ? WHERE run_id = ?
  `).run(status, text(extra.leaseId || extra.lease_id || current.leaseId), startedAt, at, finishedAt, json(result), json(error), at, current.runId);
    insertEvent(db, { ...current, status, startedAt, finishedAt }, {
        eventType: extra.eventType || `run.${status}`,
        status,
        message: message || `AgentRun 状态变更为 ${status}`,
        payload: extra.payload || {},
        payloadRef: extra.payloadRef || "",
        idempotencyKey: extra.idempotencyKey || `${current.runId}:${status}:${at}`,
    });
    return resolveRun(db, runId);
}
function transitionAgentRun(runId, status, message = "", extra = {}) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => transitionAgentRunInTransaction(db, runId, status, message, extra));
}
/** Transaction-local lease acquisition for Heartbeat and recovery coordinators. */
function claimAgentRunLeaseInTransaction(db, runId, ownerId, ttlMs = 120_000, requestedLeaseId = "") {
    const owner = text(ownerId);
    if (!owner)
        return { acquired: false, reason: "owner_required", run: resolveRun(db, runId) };
    const run = resolveRun(db, runId);
    if (!run)
        return { acquired: false, reason: "run_not_found", run: null };
    if ((0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
        return { acquired: false, reason: "terminal", run };
    const at = now();
    const expiresMs = Date.now() + Math.max(5_000, Number(ttlMs || 120_000));
    const activeOtherOwner = run.leaseOwnerId && run.leaseOwnerId !== owner && Date.parse(run.leaseExpiresAt || "") > Date.now();
    if (activeOtherOwner)
        return { acquired: false, reason: "lease_held", run };
    const leaseId = text(requestedLeaseId) || run.leaseId || id("lease");
    const nextVersion = run.leaseVersion + 1;
    const nextStatus = ["created", "queued"].includes(run.status) ? "leased" : run.status;
    const expiresAt = new Date(expiresMs).toISOString();
    db.prepare(`UPDATE agent_runs SET status = ?, lease_id = ?, lease_owner_id = ?, lease_expires_at = ?,
    lease_version = ?, last_heartbeat_at = ?, updated_at = ? WHERE run_id = ?`).run(nextStatus, leaseId, owner, expiresAt, nextVersion, at, at, runId);
    insertEvent(db, { ...run, status: nextStatus }, {
        eventType: "run.lease_claimed", status: nextStatus, message: "AgentRun 租约已获取",
        payload: { ownerId: owner, leaseId, leaseVersion: nextVersion, expiresAt },
        idempotencyKey: `lease-claim:${runId}:${nextVersion}`,
    });
    return { acquired: true, reason: "claimed", run: resolveRun(db, runId) };
}
function claimAgentRunLease(runId, ownerId, ttlMs = 120_000, requestedLeaseId = "") {
    const owner = text(ownerId);
    if (!owner)
        return { acquired: false, reason: "owner_required", run: getAgentRun(runId) };
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => claimAgentRunLeaseInTransaction(db, runId, owner, ttlMs, requestedLeaseId));
}
function appendAgentRunEvent(runId, event) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const run = resolveRun(db, runId);
        if (!run)
            return null;
        return insertEvent(db, run, event);
    });
}
function touchAgentRunLease(runId, leaseId = "") {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const run = resolveRun(db, runId);
        if (!run || (0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
            return run;
        const at = now();
        db.prepare("UPDATE agent_runs SET lease_id = ?, last_heartbeat_at = ?, updated_at = ? WHERE run_id = ?")
            .run(text(leaseId) || run.leaseId, at, at, run.runId);
        return resolveRun(db, run.runId);
    });
}
/** Persist provider/session bindings discovered after a Runtime starts. */
function updateAgentRunBindings(runId, patch) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const run = resolveRun(db, runId);
        if (!run)
            return null;
        const next = {
            taskAgentSessionId: text(patch.taskAgentSessionId) || run.taskAgentSessionId,
            nativeSessionId: text(patch.nativeSessionId) || run.nativeSessionId,
            workspacePath: text(patch.workspacePath) || run.workspacePath,
            worktreeId: text(patch.worktreeId) || run.worktreeId,
            workspaceEvidence: patch.workspaceEvidence || run.workspaceEvidence,
            executionId: text(patch.executionId) || run.executionId,
            runtimeVersionSnapshot: patch.runtimeVersionSnapshot !== undefined ? patch.runtimeVersionSnapshot : run.runtimeVersionSnapshot,
        };
        const at = now();
        db.prepare(`UPDATE agent_runs SET task_agent_session_id = ?, native_session_id = ?, workspace_path = ?,
      worktree_id = ?, workspace_evidence_json = ?, execution_id = ?, runtime_version_snapshot_json = ?, updated_at = ? WHERE run_id = ?`).run(next.taskAgentSessionId, next.nativeSessionId, next.workspacePath, next.worktreeId, json(next.workspaceEvidence), next.executionId, json(next.runtimeVersionSnapshot), at, runId);
        insertEvent(db, { ...run, ...next, updatedAt: at }, {
            eventType: "run.binding_updated", status: run.status,
            message: "AgentRun 执行身份已更新",
            payload: {
                taskAgentSessionId: !!next.taskAgentSessionId,
                nativeSessionId: !!next.nativeSessionId,
                workspacePath: !!next.workspacePath,
                worktreeId: !!next.worktreeId,
            },
            idempotencyKey: `binding:${runId}:${next.taskAgentSessionId}:${next.nativeSessionId}:${next.workspacePath}:${next.worktreeId}`,
        });
        return resolveRun(db, runId);
    });
}
function heartbeatAgentRunLease(runId, ownerId, leaseId = "", ttlMs = 120_000) {
    const owner = text(ownerId);
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const run = resolveRun(db, runId);
        if (!run || (0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
            return { renewed: false, reason: "inactive", run };
        if (run.leaseOwnerId !== owner || (text(leaseId) && run.leaseId !== text(leaseId))) {
            return { renewed: false, reason: "lease_lost", run };
        }
        const at = now();
        const expiresAt = new Date(Date.now() + Math.max(5_000, Number(ttlMs || 120_000))).toISOString();
        db.prepare("UPDATE agent_runs SET lease_expires_at = ?, last_heartbeat_at = ?, updated_at = ? WHERE run_id = ?")
            .run(expiresAt, at, at, runId);
        return { renewed: true, reason: "renewed", run: resolveRun(db, runId) };
    });
}
function releaseAgentRunLease(runId, ownerId, leaseId = "") {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const run = resolveRun(db, runId);
        if (!run)
            return { released: false, reason: "run_not_found", run: null };
        if (run.leaseOwnerId !== text(ownerId) || (text(leaseId) && run.leaseId !== text(leaseId))) {
            return { released: false, reason: "lease_lost", run };
        }
        const at = now();
        db.prepare("UPDATE agent_runs SET lease_owner_id = '', lease_expires_at = ?, updated_at = ? WHERE run_id = ?")
            .run(at, at, runId);
        insertEvent(db, run, { eventType: "run.lease_released", status: run.status, message: "AgentRun 租约已释放", payload: { ownerId: text(ownerId) }, idempotencyKey: `lease-release:${runId}:${run.leaseVersion}` });
        return { released: true, reason: "released", run: resolveRun(db, runId) };
    });
}
function expireAgentRunLeases(nowMs = Date.now()) {
    const rows = (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT run_id FROM agent_runs
    WHERE status NOT IN ('succeeded', 'failed', 'cancelled') AND lease_owner_id <> ''
    AND lease_expires_at <> '' AND lease_expires_at <= ?`).all(new Date(nowMs).toISOString()));
    let expired = 0;
    for (const row of rows) {
        const run = getAgentRun(String(row.run_id));
        if (!run || (0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
            continue;
        const next = transitionAgentRun(run.runId, "recovery_required", "AgentRun 租约已过期，等待恢复", {
            eventType: "run.lease_expired", error: { code: "lease_expired" },
        });
        if (next?.status === "recovery_required") {
            (0, task_store_1.withImmediateTaskStoreTransaction)(db => { db.prepare("UPDATE agent_runs SET lease_owner_id = '', lease_expires_at = ? WHERE run_id = ?").run(now(), run.runId); });
            expired += 1;
        }
    }
    return { checked: rows.length, expired };
}
/** Recover an expired run in place when session/workspace evidence is usable; otherwise fork a linked run. */
function recoverAgentRun(runId, options = {}) {
    const run = getAgentRun(runId);
    if (!run || run.status !== "recovery_required")
        return { recovered: false, reason: "not_recovery_required", run };
    const workspaceEvidence = !!run.workspacePath && require("fs").existsSync(run.workspacePath)
        && (!run.workspaceEvidence || !options.workspaceEvidence
            || String(run.workspaceEvidence.workspacePath || run.workspacePath) === String(options.workspaceEvidence.workspacePath || run.workspacePath))
        && (!run.worktreeId || !options.workspaceEvidence?.worktreeId || String(run.worktreeId) === String(options.workspaceEvidence.worktreeId));
    const sessionEvidence = !!run.nativeSessionId && !!run.taskAgentSessionId;
    if (workspaceEvidence && sessionEvidence && options.resume !== false) {
        const recovering = transitionAgentRun(runId, "recovering", "已确认工作区和原生会话证据，恢复原 Run");
        return { recovered: !!recovering, mode: "in_place", run: recovering };
    }
    const child = createAgentRun({
        traceId: run.traceId, taskId: run.taskId, attemptId: run.attemptId, parentRunId: run.runId,
        scope: run.scope, scopeId: run.scopeId, agentId: run.agentId, runtimeId: run.runtimeId,
        runtimeVersionSnapshot: run.runtimeVersionSnapshot, taskAgentSessionId: run.taskAgentSessionId,
        nativeSessionId: run.nativeSessionId, executionId: run.executionId, workspacePath: run.workspacePath,
        worktreeId: run.worktreeId, triggerType: "resume", source: "recovery_fork",
        idempotencyKey: `recovery:${run.runId}:${run.leaseVersion}:${run.updatedAt}`,
    });
    if (child.created)
        transitionAgentRun(child.run.runId, "queued", "恢复证据不足，创建关联 Run 等待重新执行", { eventType: "run.recovery_forked", payload: { parentRunId: run.runId } });
    return { recovered: false, mode: "forked", parentRunId: run.runId, run: child.run, created: child.created };
}
function recordAgentRunUsage(runId, usage, meta = {}) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const run = resolveRun(db, runId);
        if (!run)
            return null;
        const usageId = id("usage");
        db.prepare(`
      INSERT INTO agent_run_usage(
        usage_id, run_id, provider, model, input_tokens, output_tokens,
        cached_tokens, cost, provenance, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(usageId, runId, text(meta.provider || usage?.provider), text(meta.model || usage?.model), Number(usage?.inputTokens ?? usage?.input_tokens ?? usage?.input ?? 0) || 0, Number(usage?.outputTokens ?? usage?.output_tokens ?? usage?.output ?? 0) || 0, Number(usage?.cachedTokens ?? usage?.cached_tokens ?? usage?.cacheReadInputTokens ?? 0) || 0, Number(usage?.cost ?? usage?.costUsd ?? usage?.cost_usd ?? 0) || 0, text(meta.provenance || usage?.provenance?.origin || usage?.source), json(sanitizeStoredValue(usage, "usage")), now());
        return usageId;
    });
}
function listAgentRunUsage(runId) {
    return (0, task_store_1.withSqliteTaskStore)(db => db.prepare("SELECT * FROM agent_run_usage WHERE run_id = ? ORDER BY created_at ASC").all(text(runId)).map(row => ({
        usageId: text(row.usage_id), runId: text(row.run_id), provider: text(row.provider), model: text(row.model),
        inputTokens: Number(row.input_tokens || 0), outputTokens: Number(row.output_tokens || 0), cachedTokens: Number(row.cached_tokens || 0),
        cost: Number(row.cost || 0), provenance: text(row.provenance), payload: parse(row.payload_json), createdAt: text(row.created_at),
    })));
}
function reconcileLegacyAgentRuns() {
    const tasks = (0, task_store_1.loadTasksFromSqlite)();
    let created = 0;
    let checked = 0;
    for (const task of tasks) {
        const status = text(task?.status).toLowerCase();
        if (!task?.id || ["done", "completed", "failed", "cancelled", "canceled", "archived"].includes(status))
            continue;
        checked += 1;
        const taskId = text(task.id);
        const executionId = text(task.execution_id || task.executionId || task.global_run_id || task.globalRunId);
        const existing = listAgentRuns({ taskId }).find(run => run.source === "legacy_reconciled");
        if (existing)
            continue;
        const runtimeId = text(task.runtime || task.agent_type || task.agentType || task.agent) || "legacy";
        const result = createAgentRun({
            traceId: text(task.trace_id || task.traceId),
            taskId,
            attemptId: text(task.attempt_id || task.attemptId) || "legacy-1",
            scope: task.group_id ? "group" : task.target_project ? "project" : "global",
            scopeId: text(task.group_id || task.target_project || "global"),
            agentId: text(task.agent_id || task.agent || runtimeId),
            runtimeId,
            taskAgentSessionId: text(task.task_agent_session_id || task.taskAgentSessionId),
            nativeSessionId: text(task.native_session_id || task.nativeSessionId),
            executionId,
            workspacePath: text(task.work_dir || task.workDir),
            triggerType: "resume",
            source: "legacy_reconciled",
            idempotencyKey: `legacy:${taskId}:${executionId}:${text(task.attempt_id || task.attemptId) || "1"}`,
        });
        if (result.created) {
            transitionAgentRun(result.run.runId, "recovery_required", "从旧任务记录物化，等待恢复检查", { eventType: "legacy.reconciled" });
            created += 1;
        }
    }
    return { checked, created };
}
/** Mark stale in-flight Runtime executions for explicit recovery after restart. */
function reconcileAgentRunLeases(maxAgeMs = 5 * 60_000) {
    const leaseExpiry = expireAgentRunLeases();
    const cutoff = Date.now() - Math.max(30_000, Number(maxAgeMs || 0));
    const candidates = (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`
    SELECT run_id, status, last_heartbeat_at, updated_at, lease_owner_id, lease_expires_at FROM agent_runs
    WHERE status IN ('queued', 'leased', 'starting', 'running', 'recovering')
  `).all());
    let checked = 0;
    let recovered = 0;
    for (const row of candidates) {
        checked += 1;
        const heartbeat = Date.parse(String(row.last_heartbeat_at || row.updated_at || ""));
        if (Number.isFinite(heartbeat) && heartbeat > cutoff)
            continue;
        const next = transitionAgentRun(String(row.run_id), "recovery_required", "服务重启后租约需要恢复检查", {
            eventType: "run.recovery_required",
            error: { code: "lease_stale_after_restart" },
        });
        if (next?.status === "recovery_required")
            recovered += 1;
    }
    return { checked, recovered: recovered + leaseExpiry.expired, expired: leaseExpiry.expired };
}
function buildAgentRunProjection(runId) {
    const run = getAgentRun(runId);
    if (!run)
        return null;
    return {
        run_id: run.runId,
        trace_id: run.traceId,
        task_id: run.taskId,
        attempt_id: run.attemptId,
        runtime_id: run.runtimeId,
        run_status: run.status,
        run_started_at: run.startedAt,
        run_finished_at: run.finishedAt,
        run_recovery_state: ["recovery_required", "recovering"].includes(run.status) ? run.status : "",
        lease_id: run.leaseId,
        lease_owner_id: run.leaseOwnerId,
        lease_expires_at: run.leaseExpiresAt,
    };
}
function buildTaskAgentRunProjection(task) {
    const taskId = text(task?.id || task?.task_id);
    if (!taskId)
        return null;
    const explicit = text(task?.agent_run_id || task?.agentRunId || task?.run_id || task?.active_run_id || task?.project_main_run_id);
    const run = explicit ? getAgentRun(explicit) : listAgentRuns({ taskId, limit: 1 })[0];
    return run ? buildAgentRunProjection(run.runId) : null;
}
/** Read-only operational snapshot used by health checks and diagnostics. */
function getAgentRunMetrics(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const clauses = [];
        const values = [];
        if (String(filters.runtimeId || "").trim()) {
            clauses.push("runtime_id = ?");
            values.push(String(filters.runtimeId).trim());
        }
        if (String(filters.scope || "").trim()) {
            clauses.push("scope = ?");
            values.push(String(filters.scope).trim());
        }
        if (String(filters.status || "").trim()) {
            clauses.push("status = ?");
            values.push(String(filters.status).trim());
        }
        if (String(filters.from || "").trim()) {
            clauses.push("created_at >= ?");
            values.push(String(filters.from).trim());
        }
        if (String(filters.to || "").trim()) {
            clauses.push("created_at <= ?");
            values.push(String(filters.to).trim());
        }
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        const counts = db.prepare(`SELECT status, COUNT(*) AS count FROM agent_runs ${where} GROUP BY status`).all(...values);
        const runtimes = db.prepare(`SELECT runtime_id, scope, status, COUNT(*) AS count FROM agent_runs ${where} GROUP BY runtime_id, scope, status`).all(...values);
        const durations = db.prepare(`SELECT
      AVG(CASE WHEN started_at <> '' THEN MAX(0, (julianday(started_at) - julianday(created_at)) * 86400000) END) AS avg_start_ms,
      AVG(CASE WHEN finished_at <> '' AND started_at <> '' THEN MAX(0, (julianday(finished_at) - julianday(started_at)) * 86400000) END) AS avg_execution_ms,
      AVG(CASE WHEN status = 'recovering' THEN MAX(0, (julianday(updated_at) - julianday(created_at)) * 86400000) END) AS avg_recovery_ms
      FROM agent_runs`).get();
        const usage = db.prepare("SELECT COUNT(*) AS records, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens, COALESCE(SUM(cost),0) AS cost FROM agent_run_usage").get();
        const missingUsage = db.prepare("SELECT COUNT(*) AS count FROM agent_runs r WHERE r.status IN ('succeeded','failed') AND NOT EXISTS (SELECT 1 FROM agent_run_usage u WHERE u.run_id = r.run_id)").get();
        return {
            run_count: Number(db.prepare("SELECT COUNT(*) AS count FROM agent_runs").get()?.count || 0),
            by_status: Object.fromEntries(counts.map(row => [String(row.status), Number(row.count || 0)])),
            by_runtime: runtimes.map(row => ({ runtime_id: text(row.runtime_id), scope: text(row.scope), status: text(row.status), count: Number(row.count || 0) })),
            success_rate: Number(counts.find(row => row.status === "succeeded")?.count || 0) / Math.max(1, Number((db.prepare("SELECT COUNT(*) AS count FROM agent_runs WHERE status IN ('succeeded','failed','cancelled')").get()?.count) || 0)),
            failure_rate: Number(counts.find(row => row.status === "failed")?.count || 0) / Math.max(1, Number((db.prepare("SELECT COUNT(*) AS count FROM agent_runs WHERE status IN ('succeeded','failed','cancelled')").get()?.count) || 0)),
            average_start_ms: Number(durations?.avg_start_ms || 0),
            average_execution_ms: Number(durations?.avg_execution_ms || 0),
            average_recovery_ms: Number(durations?.avg_recovery_ms || 0),
            usage: { records: Number(usage?.records || 0), input_tokens: Number(usage?.input_tokens || 0), output_tokens: Number(usage?.output_tokens || 0), cost: Number(usage?.cost || 0) },
            provider_usage_missing: Number(missingUsage?.count || 0),
            lease_expired: Number(db.prepare("SELECT COUNT(*) AS count FROM agent_runs WHERE status = 'recovery_required' AND error_json LIKE '%lease_expired%'").get()?.count || 0),
        };
    });
}
//# sourceMappingURL=agent-run-store.js.map