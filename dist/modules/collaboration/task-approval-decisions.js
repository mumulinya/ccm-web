"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskApprovalItems = taskApprovalItems;
exports.applyTaskApprovalDecisions = applyTaskApprovalDecisions;
exports.handleTaskApprovalDecisions = handleTaskApprovalDecisions;
const crypto_1 = require("crypto");
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const access_policy_1 = require("../system/access-policy");
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
const acceptance_user_projection_1 = require("../../agents/acceptance-user-projection");
const runtime_events_1 = require("../../system/runtime-events");
const dispatch_scope_service_1 = require("../../agents/dispatch-scope-service");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const hash = (value) => (0, crypto_1.createHash)("sha256").update(JSON.stringify(value)).digest("hex");
const conflict = (message) => Object.assign(new Error(message), { code: "CCM_APPROVAL_ACTION_CONFLICT" });
/** Existing approval stores and lifecycle modules remain authoritative. */
function taskApprovalItems(task, knownRuns) {
    const runs = knownRuns || (0, agent_run_store_1.listAgentRuns)({ taskId: task.id, limit: 100 });
    const attempt = task.attempt_id;
    const items = [];
    for (const a of (0, agent_governance_store_1.listTaskAgentApprovals)(task.id, attempt)) {
        const run = runs.find(r => r.runId === a.runId);
        if (!run || a.taskId !== task.id || a.traceId !== run.traceId)
            continue;
        items.push({ kind: a.actionType === "task_delivery_confirmation" ? "completion" : a.actionType === "project_worktree_merge" ? "delivery" : "run",
            id: a.approvalId, run_id: run.runId, attempt_id: run.attemptId, decision_revision: a.actionFingerprint,
            action_fingerprint: a.actionFingerprint, status: a.status, target: a.actionType, reason: (0, acceptance_user_projection_1.acceptanceDisplayText)(a.reason),
            changed_files: (Array.isArray(a.payload?.changedFiles) ? a.payload.changedFiles : []).map(acceptance_user_projection_1.acceptanceDisplayText), expires_at: a.expiresAt });
    }
    for (const r of task.scope_expansion_requests || []) {
        const run = runs.find(run => run.runId === r.runId);
        if (!run || attempt && run.attemptId !== attempt)
            continue;
        items.push({ kind: "scope", id: r.id, run_id: r.runId, attempt_id: r.attemptId, work_item_id: r.workItemId,
            decision_revision: r.contractRevision, action_fingerprint: r.actionFingerprint,
            status: r.status === "pending" && r.expiresAt && Date.parse(r.expiresAt) <= Date.now() ? "expired" : r.status, application_state: r.applicationState,
            target: (r.requestedPaths || [r.path]).map(acceptance_user_projection_1.acceptanceDisplayText), reason: (0, acceptance_user_projection_1.acceptanceDisplayText)(r.reason), impact: (0, acceptance_user_projection_1.acceptanceDisplayText)(r.impactSummary), expires_at: r.expiresAt });
    }
    if (task.intake_state === "awaiting_confirmation")
        items.push({ kind: "plan", id: `plan:${task.id}:${task.task_spec?.revision || task.plan_revision || 1}`,
            decision_revision: task.task_spec?.revision || task.plan_revision || 1, status: "pending",
            target: (0, acceptance_user_projection_1.acceptanceDisplayText)(task.task_spec?.goal || task.title), reason: "请使用任务原有的计划确认或补充信息操作" });
    return items;
}
async function applyTaskApprovalDecisions(taskId, payload, auth, updateTask) {
    const task = (0, db_1.getTaskById)(taskId);
    if (!task)
        throw Object.assign(new Error("任务不存在"), { status: 404 });
    if (!(0, access_policy_1.hasTaskResourceAccess)(task, auth, "manage") || !auth?.userId)
        throw Object.assign(new Error("任务管理权限不足"), { status: 403 });
    const key = String(payload.idempotency_key || "").trim(), items = payload.items;
    if (!key || !Array.isArray(items) || !items.length || items.length > 50
        || items.some(item => !item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string" || !item.id))
        throw conflict("审批需要幂等键及 1 至 50 项明确决定");
    const batchKey = `${taskId}:${auth.userId}:${key}`, digest = hash(items);
    const previous = (0, reliability_ledger_1.getIdempotencyRecord)("task-approval-batch", batchKey);
    if (previous && previous.metadata?.requestDigest !== digest)
        throw conflict("同一幂等键不能提交不同审批内容");
    const batch = (0, reliability_ledger_1.acquireIdempotency)({ scope: "task-approval-batch", key: batchKey, traceId: task.trace_id, metadata: { requestDigest: digest } });
    if (!batch.acquired)
        return batch.record.status === "completed" ? { ...batch.record.result, duplicate: true } : { success: false, in_progress: true, results: [] };
    const results = [], scopes = new Map();
    for (const item of items) {
        const itemKey = `${batchKey}:${item.kind}:${item.id}`, itemDigest = hash(item);
        const saved = (0, reliability_ledger_1.getIdempotencyRecord)("task-approval-item", itemKey);
        if (saved?.metadata?.requestDigest !== undefined && saved.metadata.requestDigest !== itemDigest) {
            results.push({ id: item.id, success: false, code: "CCM_APPROVAL_ACTION_CONFLICT" });
            continue;
        }
        const operation = (0, reliability_ledger_1.acquireIdempotency)({ scope: "task-approval-item", key: itemKey, traceId: task.trace_id, metadata: { requestDigest: itemDigest } });
        if (!operation.acquired) {
            if (operation.record.status === "completed" && item.kind === "scope" && item.decision === "approved") {
                const request = (0, db_1.getTaskById)(taskId)?.scope_expansion_requests?.find(r => r.id === item.id);
                if (request?.continuation?.mode === "startup_deferred")
                    scopes.set(request.runId, item.id);
            }
            results.push(operation.record.status === "completed" ? { ...operation.record.result, duplicate: true } : { id: item.id, success: false, in_progress: true });
            continue;
        }
        try {
            if (!["approved", "rejected"].includes(item.decision))
                throw conflict("审批决定无效");
            if (!["scope", "run", "delivery"].includes(item.kind))
                throw conflict("计划确认及确认任务完成需要使用专用操作");
            const latest = (0, db_1.getTaskById)(taskId), entries = taskApprovalItems(latest);
            if (!latest || !(0, access_policy_1.hasTaskResourceAccess)(latest, auth, "manage"))
                throw Object.assign(new Error("任务管理权限已变化"), { code: "CCM_APPROVAL_PERMISSION_CHANGED" });
            const entry = entries.find(row => row.kind === item.kind && row.id === item.id);
            if (!entry || !item.action_fingerprint || entry.action_fingerprint !== item.action_fingerprint
                || String(entry.decision_revision) !== String(item.revision) || entry.attempt_id !== item.attempt_id)
                throw conflict("审批归属、Attempt、revision 或动作已变化");
            const run = (0, agent_run_store_1.getAgentRun)(entry.run_id);
            if (!run || run.taskId !== taskId || run.traceId !== latest.trace_id)
                throw conflict("Run 身份不匹配");
            if (entry.status !== "pending" && entry.status !== item.decision)
                throw conflict("已拒绝、过期或已决定的审批不能改写");
            let outcome;
            if (item.kind === "scope") {
                outcome = await (0, dispatch_scope_service_1.mutateDispatchScope)({ readTask: db_1.getTaskById, updateTask,
                    continueRun: async () => ({ mode: "startup_deferred", reason: "batch_decisions_applying" }) }, taskId, entry.work_item_id, item.decision === "approved" ? "approve" : "reject", { requestId: item.id, contractRevision: item.revision, idempotencyKey: itemKey, reason: item.reason }, auth.userId);
                if (outcome.request.status !== item.decision)
                    throw conflict("范围申请已过期或决定不匹配");
                if (item.decision === "approved")
                    scopes.set(entry.run_id, item.id);
            }
            else {
                outcome = (0, agent_governance_store_1.decideAgentApproval)(item.id, { status: item.decision, decisionBy: auth.userId, reason: item.reason, actionFingerprint: item.action_fingerprint });
                if (outcome.status !== item.decision)
                    throw conflict("审批已过期或决定不匹配");
            }
            const result = { id: item.id, kind: item.kind, success: true, status: item.decision };
            (0, reliability_ledger_1.completeIdempotency)("task-approval-item", itemKey, result);
            results.push(result);
        }
        catch (error) {
            (0, reliability_ledger_1.failIdempotency)("task-approval-item", itemKey, error.code || "approval_application_failed");
            results.push({ id: item.id, kind: item.kind, success: false, code: error.code || "APPROVAL_APPLICATION_FAILED", error: (0, acceptance_user_projection_1.acceptanceDisplayText)(error.message) });
        }
    }
    const continuation = [];
    for (const [runId, requestId] of scopes) {
        try {
            const request = (0, db_1.getTaskById)(taskId)?.scope_expansion_requests?.find(r => r.id === requestId);
            const applied = await (0, dispatch_scope_service_1.mutateDispatchScope)({ readTask: db_1.getTaskById, updateTask,
                continueRun: (run, scope) => require("../../agents/agent-execution-coordinator").continueApprovedDispatchScope(run.runId, scope.id) }, taskId, request.workItemId, "approve", { requestId, contractRevision: request.contractRevision, idempotencyKey: `batch-continuation:${batchKey}:${requestId}` }, auth.userId);
            continuation.push({ run_id: runId, ...applied.continuation });
        }
        catch (error) {
            continuation.push({ run_id: runId, mode: "blocked", reason: error.code || "continuation_failed" });
        }
    }
    const result = { success: results.every(row => row.success), results, continuation };
    if (results.some(row => row.success)) {
        const projectionRevision = hash({ batchKey, decisions: results.filter(row => row.success).map(row => [row.id, row.status]) });
        try {
            if ((0, db_1.getTaskById)(taskId)?.governance_projection_revision !== projectionRevision)
                updateTask(taskId, { governance_projection_revision: projectionRevision });
        }
        catch {
            result.success = false;
            result.projection_status = "pending_reconciliation";
        }
        (0, runtime_events_1.publishRuntimeEvent)("task", "task.changed", { taskId });
    }
    if (result.success)
        (0, reliability_ledger_1.completeIdempotency)("task-approval-batch", batchKey, result);
    else
        (0, reliability_ledger_1.failIdempotency)("task-approval-batch", batchKey, "partial_failure");
    return result;
}
function handleTaskApprovalDecisions(pathname, req, res, updateTask) {
    const match = pathname.match(/^\/api\/tasks\/([^/]+)\/(approval-decisions|approval-items)$/);
    if (!match || !["GET", "POST"].includes(req.method))
        return false;
    const taskId = decodeURIComponent(match[1]), task = (0, db_1.getTaskById)(taskId);
    if (!task) {
        (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
        return true;
    }
    if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, req.method === "GET" ? "use" : "manage")) {
        (0, utils_1.sendJson)(res, { error: "任务权限不足" }, 403);
        return true;
    }
    if (req.method === "GET" && match[2] === "approval-items") {
        (0, utils_1.sendJson)(res, { success: true, items: taskApprovalItems(task) });
        return true;
    }
    if (req.method !== "POST" || match[2] !== "approval-decisions") {
        (0, utils_1.sendJson)(res, { error: "不支持该操作" }, 405);
        return true;
    }
    new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0, failed = false;
        req.on("data", chunk => {
            size += chunk.length;
            if (size > 65536) {
                if (!failed)
                    reject(Object.assign(new Error("请求过大"), { status: 413 }));
                failed = true;
                chunks.length = 0;
            }
            else if (!failed)
                chunks.push(chunk);
        });
        req.on("end", () => { if (!failed)
            resolve(Buffer.concat(chunks)); });
        req.on("error", reject);
        req.on("aborted", () => reject(new Error("请求已取消")));
    }).then(buffer => {
        return applyTaskApprovalDecisions(taskId, JSON.parse(buffer.toString() || "{}"), req.ccmAuth, updateTask);
    }).then(result => (0, utils_1.sendJson)(res, result)).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 409));
    return true;
}
//# sourceMappingURL=task-approval-decisions.js.map