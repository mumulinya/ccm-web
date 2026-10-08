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
exports.getAgentHeartbeat = getAgentHeartbeat;
exports.listAgentHeartbeats = listAgentHeartbeats;
exports.requestAgentHeartbeatInTransaction = requestAgentHeartbeatInTransaction;
exports.requestAgentHeartbeat = requestAgentHeartbeat;
exports.coalesceAgentHeartbeat = coalesceAgentHeartbeat;
exports.adoptAgentRunHeartbeat = adoptAgentRunHeartbeat;
exports.claimNextAgentHeartbeat = claimNextAgentHeartbeat;
exports.requeueStaleAgentHeartbeats = requeueStaleAgentHeartbeats;
exports.completeAgentHeartbeat = completeAgentHeartbeat;
exports.failAgentHeartbeat = failAgentHeartbeat;
exports.startHeartbeatRunInTransaction = startHeartbeatRunInTransaction;
exports.startHeartbeatRun = startHeartbeatRun;
exports.registerAgentHeartbeatProcessor = registerAgentHeartbeatProcessor;
exports.processNextAgentHeartbeat = processNextAgentHeartbeat;
exports.startAgentHeartbeatProcessor = startAgentHeartbeatProcessor;
exports.stopAgentHeartbeatProcessor = stopAgentHeartbeatProcessor;
exports.finishHeartbeatRun = finishHeartbeatRun;
exports.heartbeatMetrics = heartbeatMetrics;
const crypto = __importStar(require("crypto"));
const task_store_1 = require("../core/task-store");
const agent_run_store_1 = require("./agent-run-store");
const agent_run_types_1 = require("./agent-run-types");
const agent_heartbeat_types_1 = require("./agent-heartbeat-types");
function now() { return new Date().toISOString(); }
function text(value) { return String(value ?? "").trim(); }
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
const heartbeatCounters = {
    duplicateIdempotency: 0,
    activeRunDuplicate: 0,
    wakeCoalesced: 0,
};
const ADOPTION_SOURCES = new Set([
    "legacy_reconciled",
    "external_runner_relinked",
    "startup_recovery",
    "managed_process_relinked",
]);
function rowToWake(row) {
    return {
        wakeId: text(row.wake_id),
        agentId: text(row.agent_id),
        scope: (0, agent_run_types_1.normalizeAgentRunScope)(row.scope),
        scopeId: text(row.scope_id),
        taskId: text(row.task_id),
        traceId: text(row.trace_id),
        reason: (0, agent_heartbeat_types_1.normalizeHeartbeatReason)(row.reason),
        idempotencyKey: text(row.idempotency_key),
        requestedAt: text(row.requested_at),
        availableAt: text(row.available_at),
        status: text(row.status),
        claimedBy: text(row.claimed_by),
        claimedAt: text(row.claimed_at),
        attemptId: text(row.attempt_id),
        completedAt: text(row.completed_at),
        runId: text(row.run_id),
        coalescedRunId: text(row.coalesced_run_id),
        result: parse(row.result_json),
        error: parse(row.error_json),
        createdAt: text(row.created_at),
        updatedAt: text(row.updated_at),
    };
}
function activeRunFor(input) {
    const rows = (0, agent_run_store_1.listAgentRuns)({ taskId: text(input.taskId), limit: 50 });
    const agentId = text(input.agentId);
    const scopeId = text(input.scopeId);
    return rows.find(run => !["succeeded", "failed", "cancelled", "recovery_required"].includes(run.status)
        && (!agentId || run.agentId === agentId)
        && (!scopeId || run.scopeId === scopeId)) || null;
}
function getAgentHeartbeat(wakeId) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const row = db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(text(wakeId));
        return row ? rowToWake(row) : null;
    });
}
function listAgentHeartbeats(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const clauses = [];
        const values = [];
        for (const [column, value] of [["agent_id", filters.agentId], ["task_id", filters.taskId], ["status", filters.status], ["scope_id", filters.scopeId]]) {
            if (text(value)) {
                clauses.push(`${column} = ?`);
                values.push(text(value));
            }
        }
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        const limit = Math.min(500, Math.max(1, Number(filters.limit || 100)));
        return db.prepare(`SELECT * FROM agent_wake_requests ${where} ORDER BY created_at DESC LIMIT ?`).all(...values, limit).map(rowToWake);
    });
}
function requestAgentHeartbeatInTransaction(db, input) {
    const taskId = text(input.taskId);
    const scopeId = text(input.scopeId) || taskId;
    const reason = (0, agent_heartbeat_types_1.normalizeHeartbeatReason)(input.reason);
    const key = text(input.idempotencyKey)
        || `heartbeat:${text(input.agentId)}:${scopeId}:${taskId}:${reason}:${text(input.executionId) || text(input.attemptId) || Date.now()}`;
    const requestedAt = now();
    const availableAt = text(input.availableAt) || requestedAt;
    const requestedRunId = text(input.runId);
    const activeRows = db.prepare(`SELECT run_id FROM agent_runs
      WHERE task_id = ? AND status NOT IN ('succeeded','failed','cancelled','recovery_required')
      ORDER BY created_at DESC LIMIT 50`).all(taskId);
    const requestedAgentId = text(input.agentId);
    const requestedScopeId = text(input.scopeId);
    const active = activeRows.map(row => (0, agent_run_store_1.getAgentRunInTransaction)(db, String(row.run_id))).find(run => !!run
        && (!requestedAgentId || run.agentId === requestedAgentId)
        && (!requestedScopeId || run.scopeId === requestedScopeId)) || null;
    const existing = db.prepare("SELECT * FROM agent_wake_requests WHERE idempotency_key = ?").get(key);
    if (existing) {
        heartbeatCounters.duplicateIdempotency += 1;
        return { wake: rowToWake(existing), duplicate: true, coalesced: existing.status === "coalesced", activeRun: active };
    }
    const existingPending = db.prepare(`
      SELECT * FROM agent_wake_requests
      WHERE agent_id = ? AND scope_id = ? AND task_id = ?
        AND status IN ('queued', 'claimed')
      ORDER BY created_at DESC LIMIT 1
  `).get(text(input.agentId), scopeId, taskId);
    // A Supervisor resume is intentionally attached to the recovering Run so
    // the durable queue can be consumed by the existing Runner. Ordinary
    // duplicate wakes still coalesce against an active Run.
    const forceResume = reason === "resume" && requestedRunId && active?.runId === requestedRunId;
    if ((active || existingPending) && !forceResume) {
        heartbeatCounters.activeRunDuplicate += active ? 1 : 0;
        heartbeatCounters.wakeCoalesced += 1;
        const wakeId = id("wake");
        const updatedAt = now();
        const coalescedRunId = active?.runId || text(existingPending?.run_id || existingPending?.coalesced_run_id);
        db.prepare(`INSERT INTO agent_wake_requests(
        wake_id, agent_id, scope, scope_id, task_id, trace_id, reason, idempotency_key,
        requested_at, available_at, status, run_id, coalesced_run_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'coalesced', ?, ?, ?, ?)`)
            .run(wakeId, text(input.agentId), (0, agent_run_types_1.normalizeAgentRunScope)(input.scope), scopeId, taskId, text(input.traceId) || active?.traceId || "", reason, key, requestedAt, availableAt, active?.runId || "", coalescedRunId, requestedAt, updatedAt);
        return { wake: rowToWake(db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(wakeId)), duplicate: false, coalesced: true, activeRun: active };
    }
    const wakeId = id("wake");
    db.prepare(`INSERT INTO agent_wake_requests(
      wake_id, agent_id, scope, scope_id, task_id, trace_id, reason, idempotency_key,
      requested_at, available_at, status, run_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`)
        .run(wakeId, text(input.agentId), (0, agent_run_types_1.normalizeAgentRunScope)(input.scope), scopeId, taskId, text(input.traceId), reason, key, requestedAt, availableAt, forceResume ? requestedRunId : "", requestedAt, requestedAt);
    return { wake: rowToWake(db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(wakeId)), duplicate: false, coalesced: false, activeRun: active };
}
function requestAgentHeartbeat(input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => requestAgentHeartbeatInTransaction(db, input));
}
function coalesceAgentHeartbeat(input) {
    return requestAgentHeartbeat(input).wake;
}
/**
 * Bind an already-created legacy/入口 Run to the persistent heartbeat
 * ledger. This compatibility path lets existing executors adopt the
 * coordinator incrementally without creating a second Run.
 */
function adoptAgentRunHeartbeat(runId, input = {}) {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return { run: null, wake: null, adopted: false };
    const source = text(input.source || run.source || "");
    if (!ADOPTION_SOURCES.has(source)) {
        (0, agent_run_store_1.appendAgentRunEvent)(run.runId, {
            eventType: "run.adoption_rejected",
            status: run.status,
            message: "普通新执行禁止通过 adoption 绕过 Coordinator",
            payload: { source, allowedSources: Array.from(ADOPTION_SOURCES) },
            idempotencyKey: `adoption-rejected:${run.runId}:${source || "missing"}`,
        });
        return { run, wake: null, adopted: false, rejected: true, error: { code: "CCM_ADOPTION_SOURCE_REJECTED", source } };
    }
    const wakeResult = requestAgentHeartbeat({
        agentId: input.agentId || run.agentId,
        scope: input.scope || run.scope,
        scopeId: input.scopeId || run.scopeId,
        taskId: input.taskId || run.taskId,
        traceId: input.traceId || run.traceId,
        reason: input.reason || (run.triggerType === "retry" ? "retry" : run.triggerType === "resume" ? "resume" : "on_demand"),
        idempotencyKey: input.idempotencyKey || `adopt-run:${run.runId}:${run.attemptId}`,
        availableAt: input.availableAt,
        runtimeId: input.runtimeId || run.runtimeId,
        attemptId: input.attemptId || run.attemptId,
        executionId: input.executionId || run.executionId,
        taskAgentSessionId: input.taskAgentSessionId || run.taskAgentSessionId,
        nativeSessionId: input.nativeSessionId || run.nativeSessionId,
        workspacePath: input.workspacePath || run.workspacePath,
        worktreeId: input.worktreeId || run.worktreeId,
        parentRunId: input.parentRunId || run.parentRunId,
        runtimeVersionSnapshot: input.runtimeVersionSnapshot || run.runtimeVersionSnapshot,
        source,
    });
    // Adoption observes an already-created execution. It must never leave a
    // queued wake behind, otherwise the background consumer could start the
    // same provider a second time after the current entry point has launched it.
    const wake = wakeResult.wake && (!wakeResult.wake.runId || wakeResult.wake.status === "queued")
        ? updateWake(wakeResult.wake.wakeId, "coalesced", { runId: run.runId, coalescedRunId: run.runId })
        : wakeResult.wake;
    return { run, wake, adopted: true, duplicate: wakeResult.duplicate, coalesced: wakeResult.coalesced };
}
function claimNextAgentHeartbeat(ownerId) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const at = now();
        const row = db.prepare(`SELECT * FROM agent_wake_requests
      WHERE status = 'queued' AND available_at <= ?
      ORDER BY available_at ASC, created_at ASC LIMIT 1`).get(at);
        if (!row)
            return null;
        const claimedAt = now();
        const changed = db.prepare(`UPDATE agent_wake_requests SET status='claimed', claimed_by=?, claimed_at=?, updated_at=?
      WHERE wake_id=? AND status='queued'`).run(text(ownerId), claimedAt, claimedAt, row.wake_id);
        if (!changed.changes)
            return null;
        const attemptId = id("hwa");
        db.prepare(`INSERT INTO agent_wake_attempts(attempt_id, wake_id, owner_id, status, started_at) VALUES (?, ?, ?, 'claimed', ?)`)
            .run(attemptId, row.wake_id, text(ownerId), claimedAt);
        db.prepare("UPDATE agent_wake_requests SET attempt_id = ?, updated_at = ? WHERE wake_id = ?")
            .run(attemptId, claimedAt, row.wake_id);
        return rowToWake(db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(row.wake_id));
    });
}
/** Requeue claims left behind by a crashed worker or service restart. */
function requeueStaleAgentHeartbeats(maxAgeMs = 120_000) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const requestedAge = Number.isFinite(Number(maxAgeMs)) ? Number(maxAgeMs) : 120_000;
        const cutoff = new Date(Date.now() - Math.max(0, requestedAge)).toISOString();
        const rows = db.prepare(`SELECT wake_id, attempt_id FROM agent_wake_requests
      WHERE status = 'claimed' AND claimed_at <> '' AND claimed_at <= ?`).all(cutoff);
        const at = now();
        for (const row of rows) {
            if (row.attempt_id) {
                db.prepare(`UPDATE agent_wake_attempts SET status='failed', finished_at=?, error_json=? WHERE attempt_id=? AND status='claimed'`)
                    .run(at, json({ code: "heartbeat_claim_expired", requeued: true }), row.attempt_id);
            }
            db.prepare(`UPDATE agent_wake_requests SET status='queued', claimed_by='', claimed_at='', attempt_id='', updated_at=? WHERE wake_id=? AND status='claimed'`)
                .run(at, row.wake_id);
        }
        return { checked: rows.length, requeued: rows.length };
    });
}
function updateWake(wakeId, status, patch = {}) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => updateWakeInTransaction(db, wakeId, status, patch));
}
function updateWakeInTransaction(db, wakeId, status, patch = {}) {
    const current = db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(text(wakeId));
    if (!current)
        return null;
    const at = now();
    const completedAt = ["completed", "failed", "cancelled"].includes(status) ? at : text(current.completed_at);
    db.prepare(`UPDATE agent_wake_requests SET status=?, run_id=?, coalesced_run_id=?, result_json=?, error_json=?, completed_at=?, updated_at=? WHERE wake_id=?`)
        .run(status, text(patch.runId || current.run_id), text(patch.coalescedRunId || current.coalesced_run_id), json(patch.result ?? parse(current.result_json)), json(patch.error ?? parse(current.error_json)), completedAt, at, current.wake_id);
    const attemptId = text(patch.attemptId || current.attempt_id);
    if (attemptId)
        db.prepare("UPDATE agent_wake_attempts SET status=?, run_id=?, finished_at=?, error_json=? WHERE attempt_id=?")
            .run(status, text(patch.runId || current.run_id), ["completed", "failed", "cancelled"].includes(status) ? at : "", json(patch.error || {}), attemptId);
    return rowToWake(db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(current.wake_id));
}
/**
 * A completed wake is an audit claim about a real execution. It may only be
 * marked completed when it points at a terminal AgentRun; otherwise the wake
 * is failed and the reason remains queryable for recovery reconciliation.
 */
function completeAgentHeartbeat(wakeId, result = {}) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const current = db.prepare("SELECT * FROM agent_wake_requests WHERE wake_id = ?").get(text(wakeId));
        if (!current)
            return null;
        if (["completed", "failed", "cancelled"].includes(text(current.status)))
            return rowToWake(current);
        const runId = text(result?.runId || current.run_id || current.coalesced_run_id);
        const run = runId ? (0, agent_run_store_1.getAgentRunInTransaction)(db, runId) : null;
        if (!runId || !run || !["succeeded", "failed", "cancelled"].includes(run.status)) {
            return updateWakeInTransaction(db, wakeId, "failed", {
                error: {
                    code: !runId ? "heartbeat_completion_missing_run" : !run ? "heartbeat_completion_run_not_found" : "heartbeat_completion_run_not_terminal",
                    runId,
                    runStatus: run?.status || "",
                },
            });
        }
        return updateWakeInTransaction(db, wakeId, "completed", { result, runId, attemptId: result?.attemptId });
    });
}
function failAgentHeartbeat(wakeId, error = {}) { return updateWake(wakeId, "failed", { error }); }
function startHeartbeatRunInTransaction(db, wake, ownerId, input = {}) {
    const activeRows = db.prepare(`SELECT * FROM agent_runs
        WHERE task_id = ? AND status NOT IN ('succeeded','failed','cancelled','recovery_required')
        ORDER BY created_at DESC LIMIT 50`).all(wake.taskId);
    const requestedAgentId = text(wake.agentId);
    const requestedScopeId = text(wake.scopeId);
    const existing = activeRows.map(row => (0, agent_run_store_1.getAgentRunInTransaction)(db, String(row.run_id))).find(run => !!run && (!requestedAgentId || run.agentId === requestedAgentId) && (!requestedScopeId || run.scopeId === requestedScopeId)) || null;
    if (existing) {
        heartbeatCounters.activeRunDuplicate += 1;
        const nextWake = updateWakeInTransaction(db, wake.wakeId, "coalesced", { coalescedRunId: existing.runId });
        return { run: existing, wake: nextWake, coalesced: true };
    }
    const created = (0, agent_run_store_1.createAgentRunInTransaction)(db, {
        traceId: wake.traceId || input.traceId,
        taskId: wake.taskId,
        attemptId: text(input.attemptId) || `attempt-${Date.now()}`,
        parentRunId: text(input.parentRunId),
        scope: wake.scope,
        scopeId: wake.scopeId,
        agentId: wake.agentId,
        runtimeId: text(input.runtimeId) || "unknown",
        runtimeVersionSnapshot: input.runtimeVersionSnapshot || {},
        taskAgentSessionId: text(input.taskAgentSessionId),
        nativeSessionId: text(input.nativeSessionId),
        executionId: text(input.executionId) || wake.wakeId,
        workspacePath: text(input.workspacePath),
        worktreeId: text(input.worktreeId),
        triggerType: wake.reason === "retry" ? "retry" : wake.reason === "resume" ? "resume" : wake.reason === "timer" || wake.reason === "automation" ? "schedule" : "heartbeat",
        idempotencyKey: text(input.idempotencyKey) || `heartbeat-run:${wake.wakeId}`,
        source: input.source || "heartbeat",
    });
    const run = created.run;
    if (!created.created) {
        const nextWake = updateWakeInTransaction(db, wake.wakeId, "coalesced", { coalescedRunId: run.runId });
        return { run, wake: nextWake, coalesced: true };
    }
    (0, agent_run_store_1.transitionAgentRunInTransaction)(db, run.runId, "queued", "Heartbeat 已创建 Run");
    const lease = (0, agent_run_store_1.claimAgentRunLeaseInTransaction)(db, run.runId, ownerId, 120_000);
    if (!lease.acquired) {
        const nextWake = updateWakeInTransaction(db, wake.wakeId, "failed", { error: { code: "run_lease_unavailable" } });
        return { run: (0, agent_run_store_1.getAgentRunInTransaction)(db, run.runId) || run, wake: nextWake, coalesced: false, lease: null };
    }
    (0, agent_run_store_1.transitionAgentRunInTransaction)(db, run.runId, "starting", "Heartbeat Runtime 正在启动", { leaseId: lease.run?.leaseId || "" });
    const nextWake = updateWakeInTransaction(db, wake.wakeId, "claimed", { runId: run.runId });
    return { run: (0, agent_run_store_1.getAgentRunInTransaction)(db, run.runId) || run, wake: nextWake, coalesced: false, lease };
}
function startHeartbeatRun(wake, ownerId, input = {}) {
    try {
        return (0, task_store_1.withImmediateTaskStoreTransaction)(db => startHeartbeatRunInTransaction(db, wake, ownerId, input));
    }
    catch (error) {
        if (!String(error?.code || "").includes("SQLITE_CONSTRAINT"))
            throw error;
        const winner = activeRunFor({ ...input, taskId: wake.taskId, agentId: wake.agentId, scopeId: wake.scopeId });
        if (winner) {
            heartbeatCounters.activeRunDuplicate += 1;
            updateWake(wake.wakeId, "coalesced", { coalescedRunId: winner.runId });
            return { run: winner, wake: getAgentHeartbeat(wake.wakeId), coalesced: true };
        }
        throw error;
    }
    /*
      The public wrapper above owns the transaction. This unreachable block is
      intentionally absent; all state changes happen in the transaction-local
      implementation so Coordinator can compose Wake, Run, and Lease atomically.
    */
    /* legacy implementation removed */
    /*
      return withImmediateTaskStoreTransaction(db => {
        const activeRows = db.prepare(`SELECT * FROM agent_runs
          WHERE task_id = ? AND status NOT IN ('succeeded','failed','cancelled','recovery_required')
          ORDER BY created_at DESC LIMIT 50`).all(wake.taskId) as any[];
        const requestedAgentId = text(wake.agentId);
        const requestedScopeId = text(wake.scopeId);
        const existing = activeRows.map(row => getAgentRun(String(row.run_id))).find(run =>
          !!run && (!requestedAgentId || run.agentId === requestedAgentId) && (!requestedScopeId || run.scopeId === requestedScopeId)
        ) || null;
        if (existing) {
          heartbeatCounters.activeRunDuplicate += 1;
          const nextWake = updateWakeInTransaction(db, wake.wakeId, "coalesced", { coalescedRunId: existing.runId });
          return { run: existing, wake: nextWake, coalesced: true };
        }
  
        const created = createAgentRunInTransaction(db, {
          traceId: wake.traceId || input.traceId,
          taskId: wake.taskId,
          attemptId: text(input.attemptId) || `attempt-${Date.now()}`,
          parentRunId: text(input.parentRunId),
          scope: wake.scope,
          scopeId: wake.scopeId,
          agentId: wake.agentId,
          runtimeId: text(input.runtimeId) || "unknown",
          runtimeVersionSnapshot: input.runtimeVersionSnapshot || {},
          taskAgentSessionId: text(input.taskAgentSessionId),
          nativeSessionId: text(input.nativeSessionId),
          executionId: text(input.executionId) || wake.wakeId,
          workspacePath: text(input.workspacePath),
          worktreeId: text(input.worktreeId),
          triggerType: wake.reason === "retry" ? "retry" : wake.reason === "resume" ? "resume" : wake.reason === "timer" || wake.reason === "automation" ? "schedule" : "heartbeat",
          idempotencyKey: text(input.idempotencyKey) || `heartbeat-run:${wake.wakeId}`,
          source: input.source || "heartbeat",
        });
        const run = created.run;
        if (!created.created) {
          const nextWake = updateWakeInTransaction(db, wake.wakeId, "coalesced", { coalescedRunId: run.runId });
          return { run, wake: nextWake, coalesced: true };
        }
        transitionAgentRunInTransaction(db, run.runId, "queued", "Heartbeat 已创建 Run");
        const lease = claimAgentRunLeaseInTransaction(db, run.runId, ownerId, 120_000);
        if (!lease.acquired) {
          const nextWake = updateWakeInTransaction(db, wake.wakeId, "failed", { error: { code: "run_lease_unavailable" } });
          return { run: getAgentRun(run.runId) || run, wake: nextWake, coalesced: false, lease: null };
        }
        transitionAgentRunInTransaction(db, run.runId, "starting", "Heartbeat Runtime 正在启动", { leaseId: lease.run?.leaseId || "" });
        const nextWake = updateWakeInTransaction(db, wake.wakeId, "claimed", { runId: run.runId });
        return { run: getAgentRun(run.runId) || run, wake: nextWake, coalesced: false, lease };
      });
    } catch (error: any) {
      if (!String(error?.code || "").includes("SQLITE_CONSTRAINT")) throw error;
      const winner = activeRunFor({ ...input, taskId: wake.taskId, agentId: wake.agentId, scopeId: wake.scopeId });
      if (winner) {
        heartbeatCounters.activeRunDuplicate += 1;
        updateWake(wake.wakeId, "coalesced", { coalescedRunId: winner.runId });
        return { run: winner, wake: getAgentHeartbeat(wake.wakeId), coalesced: true };
      }
      throw error;
    }
    */
}
let registeredWakeProcessor = null;
let processorTimer = null;
/** Register the existing execution channel as the durable Heartbeat consumer. */
function registerAgentHeartbeatProcessor(processor) {
    registeredWakeProcessor = processor;
    return () => {
        if (registeredWakeProcessor === processor)
            registeredWakeProcessor = null;
    };
}
/** Claim and dispatch one durable wake. The processor owns Provider side effects. */
async function processNextAgentHeartbeat(ownerId, processor = registeredWakeProcessor) {
    const claimed = claimNextAgentHeartbeat(ownerId);
    if (!claimed)
        return { processed: false, reason: "empty" };
    let run = claimed.runId ? (0, agent_run_store_1.getAgentRun)(claimed.runId) : null;
    if (!run) {
        const started = startHeartbeatRun(claimed, ownerId, {
            agentId: claimed.agentId,
            scope: claimed.scope,
            scopeId: claimed.scopeId,
            taskId: claimed.taskId,
            traceId: claimed.traceId,
            attemptId: claimed.attemptId,
            runId: claimed.runId,
            runtimeId: "unknown",
            executionId: claimed.wakeId,
            source: "heartbeat-processor",
        });
        run = started.run || null;
    }
    if (run && ["succeeded", "failed", "cancelled"].includes(run.status)) {
        const terminalWake = completeAgentHeartbeat(claimed.wakeId, {
            runId: run.runId,
            status: run.status,
            reason: "wake_replayed_after_terminal_run",
        });
        return { processed: false, reason: "terminal_run", wake: terminalWake, run };
    }
    if (run?.status === "recovery_required") {
        const blockedWake = failAgentHeartbeat(claimed.wakeId, {
            runId: run.runId,
            code: "run_recovery_required",
            message: "Run 尚未通过恢复检查，禁止直接重启 Runtime",
        });
        return { processed: false, reason: "recovery_required", wake: blockedWake, run };
    }
    if (run && ["starting", "recovering", "leased"].includes(run.status)) {
        try {
            run = (0, agent_run_store_1.transitionAgentRun)(run.runId, "running", "Heartbeat Runtime 已开始执行", { eventType: "run.heartbeat_started" }) || run;
        }
        catch { }
    }
    if (!processor) {
        failAgentHeartbeat(claimed.wakeId, { code: "heartbeat_processor_unavailable" });
        return { processed: false, reason: "processor_unavailable", wake: getAgentHeartbeat(claimed.wakeId), run };
    }
    try {
        const result = await processor(claimed, run);
        const status = String(result?.status || "");
        if (status === "succeeded")
            finishHeartbeatRun(claimed.wakeId, result?.runId || run?.runId || "", "succeeded", result?.result || result, ownerId);
        else if (["failed", "cancelled"].includes(status))
            finishHeartbeatRun(claimed.wakeId, result?.runId || run?.runId || "", status, result?.error || result, ownerId);
        return { processed: true, wake: getAgentHeartbeat(claimed.wakeId), run: (0, agent_run_store_1.getAgentRun)(result?.runId || run?.runId || "") || run, result };
    }
    catch (error) {
        if (run?.runId)
            finishHeartbeatRun(claimed.wakeId, run.runId, "failed", { code: error?.code || "heartbeat_processor_failed", message: String(error?.message || error).slice(0, 500) }, ownerId);
        else
            failAgentHeartbeat(claimed.wakeId, { code: error?.code || "heartbeat_processor_failed", message: String(error?.message || error).slice(0, 500) });
        return { processed: false, reason: "processor_failed", wake: getAgentHeartbeat(claimed.wakeId), run, error: String(error?.message || error) };
    }
}
function startAgentHeartbeatProcessor(options = {}) {
    if (processorTimer)
        return { started: false, alreadyRunning: true };
    const ownerId = text(options.ownerId) || `heartbeat-processor:${process.pid}`;
    const intervalMs = Math.max(1_000, Number(options.intervalMs || 5_000));
    processorTimer = setInterval(() => {
        void processNextAgentHeartbeat(ownerId, options.processor || registeredWakeProcessor).catch(error => {
            console.warn(`[AgentRun] Heartbeat 唤醒消费失败：${error?.message || error}`);
        });
    }, intervalMs);
    processorTimer.unref?.();
    return { started: true, intervalMs, ownerId };
}
function stopAgentHeartbeatProcessor() {
    if (!processorTimer)
        return false;
    clearInterval(processorTimer);
    processorTimer = null;
    return true;
}
function finishHeartbeatRun(wakeId, runId, status, resultOrError = {}, ownerId = "") {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return { wake: failAgentHeartbeat(wakeId, { code: "run_not_found" }), run: null };
    try {
        (0, agent_run_store_1.transitionAgentRun)(runId, status, `Heartbeat Run ${status}`, status === "succeeded" ? { result: resultOrError } : { error: resultOrError });
    }
    catch (error) {
        return { wake: failAgentHeartbeat(wakeId, { runId, code: "run_transition_failed", message: String(error?.message || error).slice(0, 500) }), run: (0, agent_run_store_1.getAgentRun)(runId) };
    }
    const transitioned = (0, agent_run_store_1.getAgentRun)(runId);
    if (!transitioned || transitioned.status !== status) {
        return { wake: failAgentHeartbeat(wakeId, { runId, code: "run_status_mismatch", expected: status, actual: transitioned?.status || "missing" }), run: transitioned };
    }
    if (ownerId) {
        try {
            (0, agent_run_store_1.releaseAgentRunLease)(runId, ownerId);
        }
        catch { }
    }
    if (["succeeded", "failed", "cancelled"].includes(status)) {
        if (status === "succeeded")
            completeAgentHeartbeat(wakeId, { runId, result: resultOrError });
        else
            failAgentHeartbeat(wakeId, { runId, ...resultOrError });
    }
    return { wake: getAgentHeartbeat(wakeId), run: (0, agent_run_store_1.getAgentRun)(runId) };
}
function heartbeatMetrics(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const runFilters = [];
        const runValues = [];
        if (text(filters.runtimeId)) {
            runFilters.push("runtime_id = ?");
            runValues.push(text(filters.runtimeId));
        }
        if (text(filters.scope)) {
            runFilters.push("scope = ?");
            runValues.push(text(filters.scope));
        }
        if (text(filters.status)) {
            runFilters.push("status = ?");
            runValues.push(text(filters.status));
        }
        if (text(filters.from)) {
            runFilters.push("created_at >= ?");
            runValues.push(text(filters.from));
        }
        if (text(filters.to)) {
            runFilters.push("created_at <= ?");
            runValues.push(text(filters.to));
        }
        const runWhere = runFilters.length ? `WHERE ${runFilters.join(" AND ")}` : "";
        const count = (sql, ...values) => Number(db.prepare(sql).get(...values)?.count || 0);
        const runs = db.prepare(`SELECT runtime_id, scope, status, COUNT(*) AS count FROM agent_runs ${runWhere} GROUP BY runtime_id, scope, status`).all(...runValues)
            .map(row => ({ runtimeId: text(row.runtime_id), status: text(row.status), count: Number(row.count || 0) }));
        const duration = (where) => Number(db.prepare(`SELECT COALESCE(AVG((julianday(finished_at) - julianday(started_at)) * 86400000), 0) AS value
      FROM agent_runs WHERE ${where} AND started_at <> '' AND finished_at <> ''`).get()?.value || 0);
        const usage = db.prepare(`SELECT COUNT(*) AS records,
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(cached_tokens), 0) AS cached_tokens,
      COALESCE(SUM(cost), 0) AS cost,
      SUM(CASE WHEN provider = '' OR provenance = '' THEN 1 ELSE 0 END) AS unreported
      FROM agent_run_usage`).get();
        const runtimeMetrics = db.prepare(`SELECT runtime_id, scope,
      SUM(CASE WHEN status='succeeded' THEN 1 ELSE 0 END) AS succeeded,
      SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed,
      COUNT(*) AS total
      FROM agent_runs ${runWhere} GROUP BY runtime_id, scope`).all(...runValues).map(row => ({
            runtimeId: text(row.runtime_id),
            scope: text(row.scope),
            total: Number(row.total || 0),
            succeeded: Number(row.succeeded || 0),
            failed: Number(row.failed || 0),
            successRate: Number(row.total || 0) ? Number(row.succeeded || 0) / Number(row.total || 0) : 0,
        }));
        const eventFilters = [];
        const eventValues = [];
        if (text(filters.runtimeId)) {
            eventFilters.push("r.runtime_id = ?");
            eventValues.push(text(filters.runtimeId));
        }
        if (text(filters.scope)) {
            eventFilters.push("r.scope = ?");
            eventValues.push(text(filters.scope));
        }
        if (text(filters.status)) {
            eventFilters.push("r.status = ?");
            eventValues.push(text(filters.status));
        }
        if (text(filters.from)) {
            eventFilters.push("e.created_at >= ?");
            eventValues.push(text(filters.from));
        }
        if (text(filters.to)) {
            eventFilters.push("e.created_at <= ?");
            eventValues.push(text(filters.to));
        }
        const eventWhere = eventFilters.length ? `WHERE ${eventFilters.join(" AND ")}` : "";
        const diagnosticRows = db.prepare(`SELECT e.event_type, e.status, e.payload_json, r.error_json
      FROM agent_run_events e JOIN agent_runs r ON r.run_id = e.run_id ${eventWhere}`).all(...eventValues);
        const diagnosticReason = (row) => {
            try {
                const payload = JSON.parse(String(row.payload_json || "{}"));
                const error = JSON.parse(String(row.error_json || "{}"));
                return `${row.event_type || ""} ${JSON.stringify(payload)} ${JSON.stringify(error)}`.toLowerCase();
            }
            catch {
                return String(row.event_type || "").toLowerCase();
            }
        };
        const diagnosticCount = (matcher) => diagnosticRows.reduce((total, row) => total + (matcher(diagnosticReason(row), row) ? 1 : 0), 0);
        const runtimeVersionIncompatible = diagnosticCount(value => value.includes("runtime_version_incompatible"));
        const nativeSessionInvalid = diagnosticCount(value => value.includes("native_session_invalid") || value.includes("native_session_missing"));
        const workspaceEvidenceFailed = diagnosticCount(value => value.includes("workspace") && (value.includes("drift") || value.includes("invalid") || value.includes("missing") || value.includes("changed")));
        const recoverySuccess = count(`SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type IN ('run.recovered','run.recovery_in_place','run.recovering')`);
        const recoveryFailure = count(`SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.recovery_blocked'`) + count(`SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.recovery_forked'`);
        return {
            wakeRequests: count("SELECT COUNT(*) AS count FROM agent_wake_requests"),
            wakeQueued: count("SELECT COUNT(*) AS count FROM agent_wake_requests WHERE status='queued'"),
            wakeCoalesced: count("SELECT COUNT(*) AS count FROM agent_wake_requests WHERE status='coalesced'"),
            wakeFailed: count("SELECT COUNT(*) AS count FROM agent_wake_requests WHERE status='failed'"),
            activeRuns: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status NOT IN ('succeeded','failed','cancelled','recovery_required')"),
            leaseExpired: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.lease_expired'"),
            runtimeStatuses: runs,
            duplicateIdempotencyHits: heartbeatCounters.duplicateIdempotency,
            activeRunDuplicateStartBlocked: heartbeatCounters.activeRunDuplicate,
            active_run_duplicate_blocked: heartbeatCounters.activeRunDuplicate,
            heartbeatRequests: count("SELECT COUNT(*) AS count FROM agent_wake_requests"),
            heartbeat_requests: count("SELECT COUNT(*) AS count FROM agent_wake_requests"),
            heartbeat_coalesced: count("SELECT COUNT(*) AS count FROM agent_wake_requests WHERE status='coalesced'"),
            heartbeat_duplicate_idempotency: heartbeatCounters.duplicateIdempotency,
            runCreated: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.created'"),
            run_created: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.created'"),
            runSucceeded: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status='succeeded'"),
            run_succeeded: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status='succeeded'"),
            runFailed: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status='failed'"),
            run_failed: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status='failed'"),
            runCancelled: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status='cancelled'"),
            run_cancelled: count("SELECT COUNT(*) AS count FROM agent_runs WHERE status='cancelled'"),
            resumeAttempted: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type IN ('run.recovering','run.resume_blocked')"),
            resumeSucceeded: recoverySuccess,
            resumeBlocked: recoveryFailure + count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.resume_blocked'"),
            receiptIdentityAmbiguous: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run_identity_ambiguous'"),
            receipt_identity_ambiguous: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run_identity_ambiguous'"),
            adoptionRejected: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='run.adoption_rejected'"),
            taskRunConsistencyRepairable: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='task_run.consistency_repairable'"),
            taskRunConsistencyBlocked: count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type='task_run.consistency_blocked'"),
            startupDurationMs: duration("status IN ('running','succeeded','failed','cancelled')"),
            executionDurationMs: duration("status IN ('succeeded','failed','cancelled')"),
            recoveryDurationMs: duration("status IN ('succeeded','failed','cancelled') AND parent_run_id <> ''"),
            recoverySuccess,
            recoveryFailure,
            workspaceEvidenceFailures: workspaceEvidenceFailed || count("SELECT COUNT(*) AS count FROM agent_run_events WHERE event_type LIKE '%workspace%' AND (status='failed' OR event_type LIKE '%blocked%')"),
            workspace_evidence_failed: workspaceEvidenceFailed,
            runtimeVersionIncompatible,
            runtime_version_incompatible: runtimeVersionIncompatible,
            nativeSessionInvalid,
            native_session_invalid: nativeSessionInvalid,
            usage: {
                records: Number(usage?.records || 0),
                inputTokens: Number(usage?.input_tokens || 0),
                outputTokens: Number(usage?.output_tokens || 0),
                cachedTokens: Number(usage?.cached_tokens || 0),
                cost: Number(usage?.cost || 0),
                unreported: Number(usage?.unreported || 0),
                providerUsageMissing: Number(usage?.unreported || 0),
                provider_usage_missing: Number(usage?.unreported || 0),
            },
            providerUsageMissing: Number(usage?.unreported || 0),
            provider_usage_missing: Number(usage?.unreported || 0),
            runtimeMetrics,
            filters: {
                runtimeId: text(filters.runtimeId),
                scope: text(filters.scope),
                status: text(filters.status),
                from: text(filters.from),
                to: text(filters.to),
            },
        };
    });
}
//# sourceMappingURL=agent-heartbeat-coordinator.js.map