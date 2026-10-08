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
exports.recordAgentActivityInTransaction = recordAgentActivityInTransaction;
exports.recordAgentActivity = recordAgentActivity;
exports.listAgentActivity = listAgentActivity;
exports.createAgentComment = createAgentComment;
exports.listAgentComments = listAgentComments;
exports.createAgentApproval = createAgentApproval;
exports.decideAgentApproval = decideAgentApproval;
exports.listAgentApprovals = listAgentApprovals;
exports.acquireAgentTaskCheckout = acquireAgentTaskCheckout;
exports.acquireAgentTaskCheckoutInTransaction = acquireAgentTaskCheckoutInTransaction;
exports.releaseAgentTaskCheckout = releaseAgentTaskCheckout;
exports.getAgentTaskCheckout = getAgentTaskCheckout;
exports.saveAgentHeartbeatContext = saveAgentHeartbeatContext;
exports.getAgentHeartbeatContext = getAgentHeartbeatContext;
exports.getLatestAgentHeartbeatContext = getLatestAgentHeartbeatContext;
exports.upsertAgentBudgetPolicy = upsertAgentBudgetPolicy;
exports.listAgentBudgetPolicies = listAgentBudgetPolicies;
exports.evaluateAgentRunBudget = evaluateAgentRunBudget;
exports.recordAgentBudgetUsageUnreported = recordAgentBudgetUsageUnreported;
exports.createAgentRunArtifact = createAgentRunArtifact;
exports.listAgentRunArtifacts = listAgentRunArtifacts;
exports.listAgentTaskDependencies = listAgentTaskDependencies;
exports.listActiveBlockingDependencies = listActiveBlockingDependencies;
exports.addAgentTaskDependency = addAgentTaskDependency;
exports.releaseAgentTaskDependency = releaseAgentTaskDependency;
exports.bindAgentRunSecret = bindAgentRunSecret;
exports.updateAgentRunSecret = updateAgentRunSecret;
exports.listAgentRunSecrets = listAgentRunSecrets;
exports.agentGovernanceMetrics = agentGovernanceMetrics;
exports.recordManualAgentAction = recordManualAgentAction;
exports.listAgentBudgetIncidents = listAgentBudgetIncidents;
const crypto = __importStar(require("crypto"));
const task_store_1 = require("../core/task-store");
const agent_run_store_1 = require("./agent-run-store");
const agent_run_store_2 = require("./agent-run-store");
const agent_heartbeat_coordinator_1 = require("./agent-heartbeat-coordinator");
const SECRET_KEY = /(?:secret|token|password|api[_-]?key|authorization|cookie|private[_-]?key|prompt|stdout|stderr|raw)/i;
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function now() { return new Date().toISOString(); }
function text(value) { return String(value ?? "").trim(); }
function json(value) { return JSON.stringify(value ?? {}); }
function parse(value, fallback = {}) { try {
    return JSON.parse(String(value || ""));
}
catch {
    return fallback;
} }
function stable(value) {
    const normalize = (input) => Array.isArray(input)
        ? input.map(normalize)
        : input && typeof input === "object"
            ? Object.keys(input).sort().reduce((out, key) => { out[key] = normalize(input[key]); return out; }, {})
            : input;
    return JSON.stringify(normalize(value));
}
function checksum(value) { return crypto.createHash("sha256").update(stable(value)).digest("hex"); }
function redact(value, depth = 0) {
    if (depth > 5)
        return "[truncated]";
    if (typeof value === "string")
        return value.length > 1000 ? `${value.slice(0, 1000)}...[truncated]` : value;
    if (Array.isArray(value))
        return value.slice(0, 100).map(item => redact(item, depth + 1));
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).slice(0, 100).reduce((out, key) => {
        out[key] = SECRET_KEY.test(key) ? "[redacted]" : redact(value[key], depth + 1);
        return out;
    }, {});
}
function rowActivity(row) {
    return {
        eventId: text(row.event_id), taskId: text(row.task_id), runId: text(row.run_id), wakeId: text(row.wake_id), traceId: text(row.trace_id),
        actorType: (text(row.actor_type) || "system"), actorId: text(row.actor_id), eventType: text(row.event_type), summary: text(row.summary),
        payload: parse(row.payload_json), payloadRef: text(row.payload_ref), idempotencyKey: text(row.idempotency_key), previousChecksum: text(row.previous_checksum),
        checksum: text(row.checksum), createdAt: text(row.created_at),
    };
}
function recordAgentActivityInTransaction(db, input) {
    const key = text(input.idempotencyKey);
    if (!key)
        throw Object.assign(new Error("Activity 缺少幂等键"), { code: "CCM_ACTIVITY_IDEMPOTENCY_REQUIRED" });
    const existing = db.prepare("SELECT * FROM agent_activity_events WHERE idempotency_key = ?").get(key);
    if (existing)
        return rowActivity(existing);
    const previous = db.prepare("SELECT checksum FROM agent_activity_events ORDER BY created_at DESC, rowid DESC LIMIT 1").get();
    const createdAt = now();
    const payload = redact(input.payload ?? {});
    const body = {
        taskId: text(input.taskId), runId: text(input.runId), wakeId: text(input.wakeId), traceId: text(input.traceId),
        actorType: input.actorType || "system", actorId: text(input.actorId), eventType: text(input.eventType), summary: text(input.summary),
        payload, payloadRef: text(input.payloadRef), idempotencyKey: key, previousChecksum: text(previous?.checksum), createdAt,
    };
    const event = { ...body, eventId: id("activity"), checksum: checksum(body) };
    db.prepare(`INSERT INTO agent_activity_events(
    event_id, task_id, run_id, wake_id, trace_id, actor_type, actor_id, event_type, summary, payload_json, payload_ref,
    idempotency_key, previous_checksum, checksum, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(event.eventId, event.taskId, event.runId, event.wakeId, event.traceId, event.actorType, event.actorId, event.eventType, event.summary, json(event.payload), event.payloadRef, event.idempotencyKey, event.previousChecksum, event.checksum, event.createdAt);
    return event;
}
function recordAgentActivity(input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => recordAgentActivityInTransaction(db, input));
}
function listAgentActivity(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const clauses = [];
        const args = [];
        if (text(filters.taskId)) {
            clauses.push("task_id = ?");
            args.push(text(filters.taskId));
        }
        if (text(filters.runId)) {
            clauses.push("run_id = ?");
            args.push(text(filters.runId));
        }
        if (text(filters.eventType)) {
            clauses.push("event_type = ?");
            args.push(text(filters.eventType));
        }
        args.push(Math.max(1, Math.min(1000, Number(filters.limit || 200))));
        return db.prepare(`SELECT * FROM agent_activity_events ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC, rowid DESC LIMIT ?`).all(...args).map(rowActivity);
    });
}
function rowComment(row) {
    return { commentId: text(row.comment_id), taskId: text(row.task_id), runId: text(row.run_id), traceId: text(row.trace_id), authorType: (text(row.author_type) || "user"),
        authorId: text(row.author_id), body: text(row.body), bodyChecksum: text(row.body_checksum), idempotencyKey: text(row.idempotency_key), heartbeatWakeId: text(row.heartbeat_wake_id), createdAt: text(row.created_at) };
}
function createAgentComment(input) {
    const body = text(input.body);
    if (!body)
        throw Object.assign(new Error("评论内容不能为空"), { code: "CCM_COMMENT_EMPTY" });
    const result = (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const duplicate = db.prepare("SELECT * FROM agent_comments WHERE idempotency_key = ?").get(text(input.idempotencyKey));
        if (duplicate)
            return { comment: rowComment(duplicate), duplicate: true };
        const createdAt = now();
        const commentId = id("comment");
        const bodyChecksum = checksum(body);
        const run = text(input.runId) ? (0, agent_run_store_1.getAgentRun)(text(input.runId)) : null;
        const traceId = text(input.traceId) || text(run?.traceId);
        db.prepare(`INSERT INTO agent_comments(comment_id, task_id, run_id, trace_id, author_type, author_id, body, body_checksum, idempotency_key, heartbeat_wake_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`)
            .run(commentId, text(input.taskId), text(input.runId), traceId, input.authorType || "user", text(input.authorId), body, bodyChecksum, text(input.idempotencyKey), createdAt);
        recordAgentActivityInTransaction(db, { taskId: text(input.taskId), runId: text(input.runId), traceId, actorType: input.authorType || "user", actorId: text(input.authorId), eventType: "task.comment_created", summary: "任务评论已创建", payload: { commentId, bodyChecksum }, idempotencyKey: `comment-activity:${text(input.idempotencyKey)}` });
        return { comment: rowComment(db.prepare("SELECT * FROM agent_comments WHERE comment_id = ?").get(commentId)), duplicate: false };
    });
    if (!result.duplicate && input.triggerHeartbeat !== false) {
        try {
            const run = text(input.runId) ? (0, agent_run_store_1.getAgentRun)(text(input.runId)) : null;
            const wake = (0, agent_heartbeat_coordinator_1.requestAgentHeartbeat)({ agentId: text(run?.agentId) || "comment-agent", scope: run?.scope || "project", scopeId: text(run?.scopeId), taskId: text(input.taskId), traceId: text(input.traceId) || text(run?.traceId), reason: "comment", idempotencyKey: `comment-wake:${text(input.idempotencyKey)}`, runId: text(input.runId), runtimeId: text(run?.runtimeId), attemptId: text(run?.attemptId), nativeSessionId: text(run?.nativeSessionId), taskAgentSessionId: text(run?.taskAgentSessionId), workspacePath: text(run?.workspacePath), worktreeId: text(run?.worktreeId), source: "comment" });
            (0, task_store_1.withImmediateTaskStoreTransaction)(db => { db.prepare("UPDATE agent_comments SET heartbeat_wake_id = ? WHERE comment_id = ?").run(text(wake.wake?.wakeId), result.comment.commentId); recordAgentActivityInTransaction(db, { taskId: text(input.taskId), runId: text(input.runId), traceId: text(input.traceId) || text(run?.traceId), eventType: wake.coalesced ? "heartbeat.coalesced" : "heartbeat.requested", summary: wake.coalesced ? "评论唤醒已合并" : "评论已请求 Heartbeat", payload: { wakeId: wake.wake?.wakeId, commentId: result.comment.commentId }, idempotencyKey: `comment-wake-activity:${text(input.idempotencyKey)}` }); });
            result.comment.heartbeatWakeId = text(wake.wake?.wakeId);
        }
        catch (error) {
            recordAgentActivity({ taskId: text(input.taskId), runId: text(input.runId), traceId: text(input.traceId), eventType: "heartbeat.failed", summary: "评论唤醒失败", payload: { error: String(error?.message || error) }, idempotencyKey: `comment-wake-failed:${text(input.idempotencyKey)}` });
        }
    }
    return result;
}
function listAgentComments(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => { const field = text(filters.runId) ? "run_id" : "task_id"; const value = text(filters.runId) || text(filters.taskId); return db.prepare(`SELECT * FROM agent_comments WHERE ${field} = ? ORDER BY created_at ASC LIMIT ?`).all(value, Math.max(1, Math.min(1000, Number(filters.limit || 200)))).map(rowComment); });
}
function rowApproval(row) {
    return { approvalId: text(row.approval_id), taskId: text(row.task_id), runId: text(row.run_id), traceId: text(row.trace_id), actionType: text(row.action_type), actionFingerprint: text(row.action_fingerprint), requestedBy: text(row.requested_by), decisionBy: text(row.decision_by), status: (text(row.status) || "pending"), reason: text(row.reason), requestedAt: text(row.requested_at), decidedAt: text(row.decided_at), expiresAt: text(row.expires_at), idempotencyKey: text(row.idempotency_key), payload: parse(row.payload_json) };
}
function createAgentApproval(input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const existing = db.prepare("SELECT * FROM agent_approvals WHERE idempotency_key = ?").get(text(input.idempotencyKey));
        if (existing)
            return rowApproval(existing);
        const run = (0, agent_run_store_1.getAgentRun)(input.runId);
        const requestedAt = now();
        const approvalId = id("approval");
        db.prepare(`INSERT INTO agent_approvals(approval_id, task_id, run_id, trace_id, action_type, action_fingerprint, requested_by, status, requested_at, expires_at, idempotency_key, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`)
            .run(approvalId, text(input.taskId) || text(run?.taskId), input.runId, text(input.traceId) || text(run?.traceId), text(input.actionType), text(input.actionFingerprint), text(input.requestedBy), requestedAt, text(input.expiresAt), text(input.idempotencyKey), json(redact(input.payload || {})));
        recordAgentActivityInTransaction(db, { taskId: text(input.taskId) || text(run?.taskId), runId: input.runId, traceId: text(input.traceId) || text(run?.traceId), actorType: "user", actorId: text(input.requestedBy), eventType: "approval.requested", summary: "AgentRun 等待人工审批", payload: { approvalId, actionType: text(input.actionType), actionFingerprint: text(input.actionFingerprint) }, idempotencyKey: `approval-requested:${text(input.idempotencyKey)}` });
        if (run && !["succeeded", "failed", "cancelled", "waiting_confirmation"].includes(run.status)) {
            try {
                (0, agent_run_store_2.transitionAgentRunInTransaction)(db, input.runId, "waiting_confirmation", "等待人工审批", { eventType: "approval.requested", idempotencyKey: `approval-run-state:${approvalId}` });
            }
            catch { }
        }
        return rowApproval(db.prepare("SELECT * FROM agent_approvals WHERE approval_id = ?").get(approvalId));
    });
}
function decideAgentApproval(approvalId, input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const row = db.prepare("SELECT * FROM agent_approvals WHERE approval_id = ?").get(text(approvalId));
        if (!row)
            throw Object.assign(new Error("审批不存在"), { code: "CCM_APPROVAL_NOT_FOUND" });
        if (row.status !== "pending")
            return rowApproval(row);
        if (text(input.actionFingerprint) && text(input.actionFingerprint) !== text(row.action_fingerprint))
            throw Object.assign(new Error("审批动作指纹不匹配"), { code: "CCM_APPROVAL_ACTION_CONFLICT" });
        const decidedAt = now();
        db.prepare("UPDATE agent_approvals SET status = ?, decision_by = ?, reason = ?, decided_at = ? WHERE approval_id = ?").run(input.status, text(input.decisionBy), text(input.reason), decidedAt, text(approvalId));
        const next = rowApproval(db.prepare("SELECT * FROM agent_approvals WHERE approval_id = ?").get(text(approvalId)));
        recordAgentActivityInTransaction(db, { taskId: next.taskId, runId: next.runId, traceId: next.traceId, actorType: "user", actorId: text(input.decisionBy), eventType: `approval.${input.status}`, summary: `人工审批${input.status === "approved" ? "已通过" : input.status === "rejected" ? "已拒绝" : "已取消"}`, payload: { approvalId, reason: text(input.reason) }, idempotencyKey: `approval-decision:${approvalId}:${input.status}` });
        try {
            if (input.status === "approved")
                (0, agent_run_store_2.transitionAgentRunInTransaction)(db, next.runId, "queued", "人工审批已通过，等待继续执行", { eventType: "approval.approved", idempotencyKey: `approval-approved-run:${approvalId}` });
            else
                (0, agent_run_store_2.transitionAgentRunInTransaction)(db, next.runId, input.status === "rejected" ? "paused" : "cancelled", `人工审批${input.status === "rejected" ? "已拒绝" : "已取消"}`, { eventType: `approval.${input.status}`, idempotencyKey: `approval-decision-run:${approvalId}:${input.status}` });
        }
        catch { }
        return next;
    });
}
function listAgentApprovals(runId) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const timestamp = now();
        db.prepare("UPDATE agent_approvals SET status = 'expired', decided_at = ?, reason = 'approval_expired' WHERE run_id = ? AND status = 'pending' AND expires_at <> '' AND expires_at <= ?").run(timestamp, text(runId), timestamp);
        return db.prepare("SELECT * FROM agent_approvals WHERE run_id = ? ORDER BY requested_at ASC").all(text(runId)).map(rowApproval);
    });
}
function rowCheckout(row) { return { checkoutId: text(row.checkout_id), taskId: text(row.task_id), runId: text(row.run_id), traceId: text(row.trace_id), workspacePath: text(row.workspace_path), worktreeId: text(row.worktree_id), ownerId: text(row.owner_id), leaseId: text(row.lease_id), status: (text(row.status) || "active"), acquiredAt: text(row.acquired_at), expiresAt: text(row.expires_at), releasedAt: text(row.released_at) }; }
function acquireAgentTaskCheckout(input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => acquireAgentTaskCheckoutInTransaction(db, input));
}
function acquireAgentTaskCheckoutInTransaction(db, input) {
    const duplicate = db.prepare("SELECT * FROM agent_task_checkouts WHERE idempotency_key = ?").get(text(input.idempotencyKey));
    if (duplicate)
        return { checkout: rowCheckout(duplicate), acquired: duplicate.status === "active", reason: "idempotency_replay" };
    const active = db.prepare("SELECT * FROM agent_task_checkouts WHERE task_id = ? AND workspace_path = ? AND worktree_id = ? AND status = 'active'").get(text(input.taskId), text(input.workspacePath), text(input.worktreeId));
    if (active && Date.parse(text(active.expires_at)) > Date.now())
        return { checkout: rowCheckout(active), acquired: false, reason: "checkout_held" };
    if (active)
        db.prepare("UPDATE agent_task_checkouts SET status = 'expired', released_at = ? WHERE checkout_id = ?").run(now(), text(active.checkout_id));
    const acquiredAt = now();
    const expiresAt = new Date(Date.now() + Math.max(10_000, Number(input.ttlMs || 120_000))).toISOString();
    const checkoutId = id("checkout");
    db.prepare(`INSERT INTO agent_task_checkouts(checkout_id, task_id, run_id, trace_id, workspace_path, worktree_id, owner_id, lease_id, status, acquired_at, expires_at, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`).run(checkoutId, text(input.taskId), text(input.runId), text(input.traceId), text(input.workspacePath), text(input.worktreeId), text(input.ownerId), text(input.leaseId), acquiredAt, expiresAt, text(input.idempotencyKey));
    recordAgentActivityInTransaction(db, { taskId: input.taskId, runId: input.runId, traceId: input.traceId, actorType: "system", actorId: input.ownerId, eventType: "task.checkout_acquired", summary: "任务 Checkout 已获取", payload: { checkoutId, workspacePath: input.workspacePath, worktreeId: input.worktreeId }, idempotencyKey: `checkout-acquired:${input.idempotencyKey}` });
    return { checkout: rowCheckout(db.prepare("SELECT * FROM agent_task_checkouts WHERE checkout_id = ?").get(checkoutId)), acquired: true, reason: "acquired" };
}
function releaseAgentTaskCheckout(checkoutId, ownerId, status = "released") {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const row = db.prepare("SELECT * FROM agent_task_checkouts WHERE checkout_id = ?").get(text(checkoutId));
        if (!row)
            return null;
        if (text(ownerId) && text(row.owner_id) !== text(ownerId))
            throw Object.assign(new Error("Checkout 所有者不匹配"), { code: "CCM_CHECKOUT_OWNER_CONFLICT" });
        db.prepare("UPDATE agent_task_checkouts SET status = ?, released_at = ? WHERE checkout_id = ? AND status = 'active'").run(status, now(), text(checkoutId));
        recordAgentActivityInTransaction(db, { taskId: row.task_id, runId: row.run_id, traceId: row.trace_id, actorType: "system", actorId: text(ownerId) || "system", eventType: "task.checkout_released", summary: status === "blocked" ? "任务 Checkout 进入阻塞" : "任务 Checkout 已释放", payload: { checkoutId, status }, idempotencyKey: `checkout-release:${checkoutId}:${status}` });
        return rowCheckout(db.prepare("SELECT * FROM agent_task_checkouts WHERE checkout_id = ?").get(text(checkoutId)));
    });
}
function getAgentTaskCheckout(taskId, runId) { return (0, task_store_1.withSqliteTaskStore)(db => { const row = db.prepare(`SELECT * FROM agent_task_checkouts WHERE task_id = ? ${text(runId) ? "AND run_id = ?" : ""} ORDER BY acquired_at DESC LIMIT 1`).get(...[text(taskId), ...(text(runId) ? [text(runId)] : [])]); return row ? rowCheckout(row) : null; }); }
function rowContext(row) { return { wakeId: text(row.wake_id), runId: text(row.run_id), nativeSessionId: text(row.native_session_id), baseContextChecksum: text(row.base_context_checksum), contextCursor: text(row.context_cursor), contextDeltaChecksum: text(row.context_delta_checksum), promptFingerprint: text(row.prompt_fingerprint), promptInputTokens: Number(row.prompt_input_tokens || 0), promptOutputTokens: Number(row.prompt_output_tokens || 0), reuseMode: (text(row.reuse_mode) || "fresh_session"), capturedAt: text(row.captured_at) }; }
function saveAgentHeartbeatContext(context) { return (0, task_store_1.withImmediateTaskStoreTransaction)(db => { db.prepare(`INSERT INTO agent_heartbeat_context(wake_id, run_id, native_session_id, base_context_checksum, context_cursor, context_delta_checksum, prompt_fingerprint, prompt_input_tokens, prompt_output_tokens, reuse_mode, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(wake_id) DO UPDATE SET run_id=excluded.run_id, native_session_id=excluded.native_session_id, base_context_checksum=excluded.base_context_checksum, context_cursor=excluded.context_cursor, context_delta_checksum=excluded.context_delta_checksum, prompt_fingerprint=excluded.prompt_fingerprint, prompt_input_tokens=excluded.prompt_input_tokens, prompt_output_tokens=excluded.prompt_output_tokens, reuse_mode=excluded.reuse_mode, captured_at=excluded.captured_at`).run(context.wakeId, context.runId, context.nativeSessionId, context.baseContextChecksum, context.contextCursor, context.contextDeltaChecksum, context.promptFingerprint, context.promptInputTokens, context.promptOutputTokens, context.reuseMode, context.capturedAt); return context; }); }
function getAgentHeartbeatContext(wakeId) { return (0, task_store_1.withSqliteTaskStore)(db => { const row = db.prepare("SELECT * FROM agent_heartbeat_context WHERE wake_id = ?").get(text(wakeId)); return row ? rowContext(row) : null; }); }
function getLatestAgentHeartbeatContext(runId) { return (0, task_store_1.withSqliteTaskStore)(db => { const row = db.prepare("SELECT * FROM agent_heartbeat_context WHERE run_id = ? ORDER BY captured_at DESC LIMIT 1").get(text(runId)); return row ? rowContext(row) : null; }); }
function rowBudget(row) { return { policyId: text(row.policy_id), scopeType: text(row.scope_type), scopeId: text(row.scope_id), period: text(row.period), tokenLimit: row.token_limit == null ? null : Number(row.token_limit), costLimitUsd: row.cost_limit_usd == null ? null : Number(row.cost_limit_usd), warningRatio: Number(row.warning_ratio ?? 0.8), hardStopRatio: Number(row.hard_stop_ratio ?? 1), enabled: Number(row.enabled) === 1, createdAt: text(row.created_at), updatedAt: text(row.updated_at) }; }
function upsertAgentBudgetPolicy(input) { return (0, task_store_1.withImmediateTaskStoreTransaction)(db => { const timestamp = now(); const policyId = text(input.policyId) || id("budget"); db.prepare(`INSERT INTO agent_budget_policies(policy_id, scope_type, scope_id, period, token_limit, cost_limit_usd, warning_ratio, hard_stop_ratio, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(scope_type, scope_id, period) DO UPDATE SET token_limit=excluded.token_limit, cost_limit_usd=excluded.cost_limit_usd, warning_ratio=excluded.warning_ratio, hard_stop_ratio=excluded.hard_stop_ratio, enabled=excluded.enabled, updated_at=excluded.updated_at`).run(policyId, input.scopeType, text(input.scopeId), input.period, input.tokenLimit == null ? null : Number(input.tokenLimit), input.costLimitUsd == null ? null : Number(input.costLimitUsd), Number(input.warningRatio ?? 0.8), Number(input.hardStopRatio ?? 1), input.enabled === false ? 0 : 1, timestamp, timestamp); return rowBudget(db.prepare("SELECT * FROM agent_budget_policies WHERE scope_type = ? AND scope_id = ? AND period = ?").get(input.scopeType, text(input.scopeId), input.period)); }); }
function listAgentBudgetPolicies(scopeType, scopeId) { return (0, task_store_1.withSqliteTaskStore)(db => { const clauses = []; const args = []; if (text(scopeType)) {
    clauses.push("scope_type = ?");
    args.push(text(scopeType));
} if (text(scopeId)) {
    clauses.push("scope_id = ?");
    args.push(text(scopeId));
} return db.prepare(`SELECT * FROM agent_budget_policies ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY CASE scope_type WHEN 'run' THEN 0 WHEN 'agent' THEN 1 WHEN 'project' THEN 2 ELSE 3 END`).all(...args).map(rowBudget); }); }
function evaluateAgentRunBudget(runId, additional = {}) {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return { allowed: false, warning: false, hardStop: true, policy: null, tokenUsed: 0, costUsedUsd: 0, reason: "run_not_found" };
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const usage = db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens),0) AS tokens, COALESCE(SUM(cost),0) AS cost FROM agent_run_usage WHERE run_id = ?").get(runId);
        const tokenUsed = Number(usage?.tokens || 0) + Number(additional.inputTokens || 0) + Number(additional.outputTokens || 0);
        const costUsedUsd = Number(usage?.cost || 0) + Number(additional.cost || 0);
        const candidates = listAgentBudgetPoliciesForRun(db, run);
        const policy = candidates.find(item => item.enabled) || null;
        if (!policy)
            return { allowed: true, warning: false, hardStop: false, policy: null, tokenUsed, costUsedUsd, reason: "no_policy" };
        const tokenRatio = policy.tokenLimit && policy.tokenLimit > 0 ? tokenUsed / policy.tokenLimit : 0;
        const costRatio = policy.costLimitUsd && policy.costLimitUsd > 0 ? costUsedUsd / policy.costLimitUsd : 0;
        const ratio = Math.max(tokenRatio, costRatio);
        const hardStop = ratio >= policy.hardStopRatio;
        const warning = ratio >= policy.warningRatio;
        const level = hardStop ? "hard_stop" : warning ? "warning" : "";
        if (level) {
            const incidentId = id("budget_incident");
            const inserted = db.prepare(`INSERT INTO agent_budget_incidents(
        incident_id, policy_id, run_id, task_id, level, token_used, cost_used_usd, token_limit, cost_limit_usd, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(policy_id, run_id, level) DO NOTHING`).run(incidentId, policy.policyId, run.runId, run.taskId, level, tokenUsed, costUsedUsd, policy.tokenLimit, policy.costLimitUsd, hardStop ? "budget_hard_stop" : "budget_warning", now());
            if (inserted.changes) {
                recordAgentActivityInTransaction(db, {
                    taskId: run.taskId, runId: run.runId, traceId: run.traceId, actorType: "system", actorId: "budget-guard",
                    eventType: hardStop ? "budget.hard_stop" : "budget.warning",
                    summary: hardStop ? "Run 已达到预算硬停阈值" : "Run 已达到预算告警阈值",
                    payload: { policyId: policy.policyId, tokenUsed, costUsedUsd, tokenLimit: policy.tokenLimit, costLimitUsd: policy.costLimitUsd },
                    idempotencyKey: `budget-incident-activity:${policy.policyId}:${run.runId}:${level}`,
                });
            }
        }
        return { allowed: !hardStop, warning, hardStop, policy, tokenUsed, costUsedUsd, reason: hardStop ? "budget_hard_stop" : warning ? "budget_warning" : "within_budget" };
    });
}
function recordAgentBudgetUsageUnreported(runId, reason = "provider_usage_missing") {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return null;
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const incidentId = id("budget_incident");
        const inserted = db.prepare(`INSERT INTO agent_budget_incidents(
      incident_id, policy_id, run_id, task_id, level, token_used, cost_used_usd, reason, created_at
    ) VALUES (?, '', ?, ?, 'usage_unreported', 0, 0, ?, ?)
    ON CONFLICT(policy_id, run_id, level) DO NOTHING`).run(incidentId, run.runId, run.taskId, text(reason) || "provider_usage_missing", now());
        if (!inserted.changes)
            return listAgentBudgetIncidents(run.runId).find(item => item.level === "usage_unreported") || null;
        recordAgentActivityInTransaction(db, { taskId: run.taskId, runId: run.runId, traceId: run.traceId, actorType: "runtime", actorId: run.runtimeId, eventType: "budget.usage_unreported", summary: "Provider 未上报用量", payload: { reason: text(reason) }, idempotencyKey: `budget-usage-unreported:${run.runId}` });
        return listAgentBudgetIncidents(run.runId).find(item => item.level === "usage_unreported") || null;
    });
}
function listAgentBudgetPoliciesForRun(db, run) { const rows = db.prepare("SELECT * FROM agent_budget_policies WHERE enabled = 1 AND (scope_type = 'global' OR (scope_type = 'project' AND scope_id = ?) OR (scope_type = 'agent' AND scope_id = ?) OR (scope_type = 'run' AND scope_id = ?)) ORDER BY CASE scope_type WHEN 'run' THEN 0 WHEN 'agent' THEN 1 WHEN 'project' THEN 2 ELSE 3 END").all(text(run.scopeId), text(run.agentId), text(run.runId)); return rows.map(rowBudget); }
function rowArtifact(row) { return { artifactId: text(row.artifact_id), runId: text(row.run_id), taskId: text(row.task_id), kind: text(row.kind), name: text(row.name), path: text(row.path), externalRef: text(row.external_ref), checksum: text(row.checksum), contentType: text(row.content_type), sizeBytes: Number(row.size_bytes || 0), retentionStatus: text(row.retention_status) || "active", createdAt: text(row.created_at) }; }
function createAgentRunArtifact(input) { return (0, task_store_1.withImmediateTaskStoreTransaction)(db => { const existing = db.prepare("SELECT * FROM agent_run_artifacts WHERE idempotency_key = ?").get(text(input.idempotencyKey)); if (existing)
    return rowArtifact(existing); const artifactId = id("artifact"); db.prepare(`INSERT INTO agent_run_artifacts(artifact_id, run_id, task_id, kind, name, path, external_ref, checksum, content_type, size_bytes, retention_status, created_at, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(artifactId, input.runId, input.taskId, input.kind, text(input.name), text(input.path), text(input.externalRef), text(input.checksum), text(input.contentType), Number(input.sizeBytes || 0), text(input.retentionStatus) || "active", now(), text(input.idempotencyKey)); recordAgentActivityInTransaction(db, { taskId: input.taskId, runId: input.runId, eventType: "artifact.created", summary: "Run 交付物已记录", payload: { artifactId, kind: input.kind, checksum: input.checksum }, idempotencyKey: `artifact-activity:${input.idempotencyKey}` }); return rowArtifact(db.prepare("SELECT * FROM agent_run_artifacts WHERE artifact_id = ?").get(artifactId)); }); }
function listAgentRunArtifacts(runId, taskId) { return (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT * FROM agent_run_artifacts WHERE ${text(taskId) ? "task_id = ?" : "run_id = ?"} ORDER BY created_at ASC`).all(text(taskId) || text(runId)).map(rowArtifact)); }
function rowDependency(row) { return { dependencyId: text(row.dependency_id), taskId: text(row.task_id), dependsOnTaskId: text(row.depends_on_task_id), relation: (text(row.relation) || "blocks"), status: (text(row.status) || "active"), createdAt: text(row.created_at), releasedAt: text(row.released_at) }; }
function listAgentTaskDependencies(taskId) { return (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT * FROM agent_task_dependencies ${text(taskId) ? "WHERE task_id = ? OR depends_on_task_id = ?" : ""} ORDER BY created_at ASC`).all(...(text(taskId) ? [text(taskId), text(taskId)] : [])).map(rowDependency)); }
function listActiveBlockingDependencies(taskId) {
    return listAgentTaskDependencies(taskId).filter(item => item.taskId === text(taskId) && item.relation === "blocks" && item.status === "active");
}
function addAgentTaskDependency(input) { if (!text(input.taskId) || !text(input.dependsOnTaskId) || input.taskId === input.dependsOnTaskId)
    throw Object.assign(new Error("任务依赖无效"), { code: "CCM_DEPENDENCY_INVALID" }); return (0, task_store_1.withImmediateTaskStoreTransaction)(db => { const edges = db.prepare("SELECT task_id, depends_on_task_id FROM agent_task_dependencies WHERE status = 'active' AND relation = 'blocks'").all(); const graph = new Map(); for (const edge of edges)
    graph.set(text(edge.task_id), [...(graph.get(text(edge.task_id)) || []), text(edge.depends_on_task_id)]); graph.set(text(input.taskId), [...(graph.get(text(input.taskId)) || []), text(input.dependsOnTaskId)]); const seen = new Set(); const visiting = new Set(); const visit = (node) => { if (visiting.has(node))
    return true; if (seen.has(node))
    return false; visiting.add(node); for (const next of graph.get(node) || [])
    if (visit(next))
        return true; visiting.delete(node); seen.add(node); return false; }; if (visit(text(input.taskId)))
    throw Object.assign(new Error("任务依赖存在循环"), { code: "CCM_DEPENDENCY_CYCLE" }); const existing = db.prepare("SELECT * FROM agent_task_dependencies WHERE task_id = ? AND depends_on_task_id = ? AND relation = ?").get(text(input.taskId), text(input.dependsOnTaskId), input.relation || "blocks"); if (existing)
    return rowDependency(existing); const dependencyId = id("dependency"); db.prepare("INSERT INTO agent_task_dependencies(dependency_id, task_id, depends_on_task_id, relation, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)").run(dependencyId, text(input.taskId), text(input.dependsOnTaskId), input.relation || "blocks", now()); recordAgentActivityInTransaction(db, { taskId: input.taskId, eventType: "dependency.blocked", summary: "任务依赖已建立", payload: { dependencyId, dependsOnTaskId: input.dependsOnTaskId, relation: input.relation || "blocks" }, idempotencyKey: `dependency-created:${dependencyId}` }); return rowDependency(db.prepare("SELECT * FROM agent_task_dependencies WHERE dependency_id = ?").get(dependencyId)); }); }
function releaseAgentTaskDependency(dependencyId, failed = false) {
    const result = (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const row = db.prepare("SELECT * FROM agent_task_dependencies WHERE dependency_id = ?").get(text(dependencyId));
        if (!row)
            return null;
        if (text(row.status) !== "active")
            return { dependency: rowDependency(row), releasedAt: text(row.released_at), shouldWake: false, task: null };
        const releasedAt = now();
        db.prepare("UPDATE agent_task_dependencies SET status = ?, released_at = ? WHERE dependency_id = ? AND status = 'active'")
            .run(failed ? "failed" : "released", releasedAt, text(dependencyId));
        const next = rowDependency(db.prepare("SELECT * FROM agent_task_dependencies WHERE dependency_id = ?").get(text(dependencyId)));
        const remaining = db.prepare("SELECT COUNT(*) AS count FROM agent_task_dependencies WHERE task_id = ? AND relation = 'blocks' AND status = 'active'").get(text(row.task_id));
        const taskRow = db.prepare("SELECT * FROM tasks WHERE id = ?").get(text(row.task_id));
        let task = {};
        try {
            task = JSON.parse(String(taskRow?.payload_json || "{}"));
        }
        catch {
            task = {};
        }
        recordAgentActivityInTransaction(db, {
            taskId: row.task_id,
            eventType: failed ? "dependency.blocked" : "dependency.released",
            summary: failed ? "前置任务失败，依赖仍阻塞" : "任务依赖已释放",
            payload: { dependencyId, remainingBlockingDependencies: Number(remaining?.count || 0) },
            idempotencyKey: `dependency-release:${dependencyId}:${next.status}`,
        });
        return {
            dependency: next,
            releasedAt,
            shouldWake: !failed && next.status === "released" && Number(remaining?.count || 0) === 0
                && !["done", "completed", "cancelled", "canceled"].includes(text(task.status).toLowerCase()),
            task: {
                taskId: text(row.task_id),
                agentId: text(task.agent_id || task.agentId || task.target_project || task.targetProject) || "task-agent",
                scope: text(task.group_id || task.groupId) ? "group" : text(task.target_project || task.targetProject) ? "project" : "global",
                scopeId: text(task.group_id || task.groupId || task.target_project || task.targetProject) || "global",
                traceId: text(task.trace_id || task.traceId) || `task:${text(row.task_id)}`,
                attemptId: text(task.attempt_id || task.attemptId) || `${text(row.task_id)}:${Number(task.execution_attempt || task.attempt || 1)}`,
                runtimeId: text(task.runtime_id || task.runtimeId || task.agent_type || task.agentType) || "unknown",
                runId: text(task.active_run_id || task.activeRunId || task.run_id || task.task_run?.run_id),
                taskAgentSessionId: text(task.task_agent_session_id || task.taskAgentSessionId),
                nativeSessionId: text(task.native_session_id || task.nativeSessionId),
                workspacePath: text(task.workspace_path || task.workspacePath),
                worktreeId: text(task.worktree_id || task.worktreeId),
            },
        };
    });
    if (result?.shouldWake) {
        try {
            const target = result.task;
            const wake = (0, agent_heartbeat_coordinator_1.requestAgentHeartbeat)({
                agentId: target.agentId,
                scope: target.scope,
                scopeId: target.scopeId,
                taskId: target.taskId,
                traceId: target.traceId,
                reason: "assignment",
                idempotencyKey: `dependency-wake:${dependencyId}:${result.releasedAt}`,
                runId: target.runId,
                runtimeId: target.runtimeId,
                attemptId: target.attemptId,
                taskAgentSessionId: target.taskAgentSessionId,
                nativeSessionId: target.nativeSessionId,
                workspacePath: target.workspacePath,
                worktreeId: target.worktreeId,
            });
            recordAgentActivity({
                taskId: target.taskId,
                traceId: target.traceId,
                wakeId: wake.wake?.wakeId,
                eventType: wake.coalesced ? "heartbeat.coalesced" : "heartbeat.requested",
                summary: wake.coalesced ? "依赖释放后唤醒已合并" : "依赖释放后已请求任务唤醒",
                payload: { dependencyId, wakeId: wake.wake?.wakeId || "", coalesced: !!wake.coalesced },
                idempotencyKey: `dependency-wake-activity:${dependencyId}:${result.releasedAt}`,
            });
        }
        catch (error) {
            recordAgentActivity({
                taskId: result.task.taskId,
                traceId: result.task.traceId,
                eventType: "heartbeat.failed",
                summary: "依赖释放后的任务唤醒失败",
                payload: { dependencyId, code: text(error?.code), message: text(error?.message).slice(0, 300) },
                idempotencyKey: `dependency-wake-failed:${dependencyId}:${result.releasedAt}`,
            });
        }
    }
    return result?.dependency || null;
}
function rowSecret(row) { return { bindingId: text(row.binding_id), runId: text(row.run_id), secretRef: text(row.secret_ref), scope: (text(row.scope) || "run"), envName: text(row.env_name), status: (text(row.status) || "requested"), createdAt: text(row.created_at), revokedAt: text(row.revoked_at) }; }
function bindAgentRunSecret(input) { return (0, task_store_1.withImmediateTaskStoreTransaction)(db => { const existing = db.prepare("SELECT * FROM agent_run_secret_bindings WHERE run_id = ? AND secret_ref = ? AND env_name = ?").get(input.runId, text(input.secretRef), text(input.envName)); if (existing)
    return rowSecret(existing); const bindingId = id("secret"); db.prepare("INSERT INTO agent_run_secret_bindings(binding_id, run_id, secret_ref, scope, env_name, status, created_at) VALUES (?, ?, ?, ?, ?, 'requested', ?)").run(bindingId, input.runId, text(input.secretRef), input.scope || "run", text(input.envName), now()); const run = (0, agent_run_store_1.getAgentRun)(input.runId); recordAgentActivityInTransaction(db, { taskId: text(run?.taskId), runId: input.runId, traceId: text(run?.traceId), eventType: "secret.requested", summary: "Run 请求 Secret 引用", payload: { bindingId, secretRef: text(input.secretRef), envName: text(input.envName) }, idempotencyKey: `secret-requested:${bindingId}` }); return rowSecret(db.prepare("SELECT * FROM agent_run_secret_bindings WHERE binding_id = ?").get(bindingId)); }); }
function updateAgentRunSecret(bindingId, status) { return (0, task_store_1.withImmediateTaskStoreTransaction)(db => { const row = db.prepare("SELECT * FROM agent_run_secret_bindings WHERE binding_id = ?").get(text(bindingId)); if (!row)
    return null; db.prepare("UPDATE agent_run_secret_bindings SET status = ?, revoked_at = ? WHERE binding_id = ?").run(status, status === "revoked" ? now() : "", text(bindingId)); const run = (0, agent_run_store_1.getAgentRun)(row.run_id); recordAgentActivityInTransaction(db, { taskId: text(run?.taskId), runId: row.run_id, traceId: text(run?.traceId), eventType: status === "injected" ? "secret.injected" : `secret.${status}`, summary: `Run Secret ${status}`, payload: { bindingId, envName: row.env_name }, idempotencyKey: `secret-status:${bindingId}:${status}` }); return rowSecret(db.prepare("SELECT * FROM agent_run_secret_bindings WHERE binding_id = ?").get(text(bindingId))); }); }
function listAgentRunSecrets(runId) { return (0, task_store_1.withSqliteTaskStore)(db => db.prepare("SELECT * FROM agent_run_secret_bindings WHERE run_id = ? ORDER BY created_at ASC").all(text(runId)).map(rowSecret)); }
function agentGovernanceMetrics(filters = {}) {
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const clauses = [];
        const args = [];
        if (text(filters.runtimeId)) {
            clauses.push("r.runtime_id = ?");
            args.push(text(filters.runtimeId));
        }
        if (text(filters.scope)) {
            clauses.push("r.scope = ?");
            args.push(text(filters.scope));
        }
        if (text(filters.status)) {
            clauses.push("r.status = ?");
            args.push(text(filters.status));
        }
        if (text(filters.from)) {
            clauses.push("r.created_at >= ?");
            args.push(text(filters.from));
        }
        if (text(filters.to)) {
            clauses.push("r.created_at <= ?");
            args.push(text(filters.to));
        }
        const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
        const runCounts = db.prepare(`SELECT r.status, COUNT(*) AS count FROM agent_runs r ${where} GROUP BY r.status`).all(...args);
        const eventCounts = db.prepare(`SELECT a.event_type, COUNT(*) AS count FROM agent_activity_events a LEFT JOIN agent_runs r ON r.run_id = a.run_id ${where} GROUP BY a.event_type`).all(...args);
        const usage = db.prepare(`SELECT COALESCE(SUM(u.input_tokens),0) input_tokens, COALESCE(SUM(u.output_tokens),0) output_tokens, COALESCE(SUM(u.cost),0) cost FROM agent_run_usage u JOIN agent_runs r ON r.run_id = u.run_id ${where}`).get(...args);
        return { runs: Object.fromEntries(runCounts.map(row => [text(row.status), Number(row.count || 0)])), events: Object.fromEntries(eventCounts.map(row => [text(row.event_type), Number(row.count || 0)])), usage: { inputTokens: Number(usage?.input_tokens || 0), outputTokens: Number(usage?.output_tokens || 0), costUsd: Number(usage?.cost || 0) }, budgetIncidents: listAgentBudgetIncidents().length };
    });
}
function recordManualAgentAction(input) { const run = (0, agent_run_store_1.getAgentRun)(input.runId); return recordAgentActivity({ taskId: text(input.taskId) || text(run?.taskId), runId: input.runId, traceId: text(input.traceId) || text(run?.traceId), actorType: "user", actorId: input.actorId, eventType: `manual.${input.action}`, summary: `人工操作：${input.action}`, payload: redact(input.payload || {}), idempotencyKey: `manual:${input.idempotencyKey}` }); }
function listAgentBudgetIncidents(runId) { return (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT * FROM agent_budget_incidents ${text(runId) ? "WHERE run_id = ?" : ""} ORDER BY created_at DESC`).all(...(text(runId) ? [text(runId)] : [])).map(row => ({ incidentId: text(row.incident_id), policyId: text(row.policy_id), runId: text(row.run_id), taskId: text(row.task_id), level: text(row.level), tokenUsed: Number(row.token_used || 0), costUsedUsd: Number(row.cost_used_usd || 0), reason: text(row.reason), createdAt: text(row.created_at) }))); }
//# sourceMappingURL=agent-governance-store.js.map