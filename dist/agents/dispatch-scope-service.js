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
exports.mutateDispatchScope = mutateDispatchScope;
exports.reconcileDispatchScopeApplications = reconcileDispatchScopeApplications;
const crypto_1 = require("crypto");
const scope_expansion_1 = require("./scope-expansion");
const dispatch_profile_1 = require("./dispatch-profile");
const agent_run_store_1 = require("./agent-run-store");
const agent_governance_store_1 = require("./agent-governance-store");
const agent_run_lifecycle_1 = require("./agent-run-lifecycle");
const atomic_json_file_1 = require("../core/atomic-json-file");
const utils_1 = require("../core/utils");
const path = __importStar(require("path"));
const acceptance_user_projection_1 = require("./acceptance-user-projection");
function revision(task) { return Number(task?.task_spec?.revision || 1); }
/** Only revisions produced by applied approvals in this Attempt can coexist. */
function compatibleScopeRevision(task, request, requests) {
    if (revision(task) === request.contractRevision)
        return true;
    const last = task.task_spec?.scope_expansion_revision;
    const applied = requests.filter(r => r.runId === request.runId && r.attemptId === request.attemptId && r.status === "approved" && r.applicationState === "applied");
    if (!applied.some(r => r.id === last?.requestId && r.actionFingerprint === last?.actionFingerprint && r.appliedRevision === revision(task)))
        return false;
    for (let n = Number(request.contractRevision) + 1; n <= revision(task); n++)
        if (!applied.some(r => r.appliedRevision === n))
            return false;
    return true;
}
function requireRun(task, input) {
    const run = (0, agent_run_store_1.getAgentRun)(String(input.runId || input.run_id || ""));
    if (!run || run.taskId !== task.id || run.traceId !== task.trace_id || (input.attemptId && input.attemptId !== run.attemptId) || (input.traceId && input.traceId !== run.traceId))
        throw Object.assign(new Error("范围申请 Run 身份不匹配"), { code: "CCM_SCOPE_IDENTITY_CONFLICT" });
    if ((0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
        throw new Error("终态 Run 不能申请范围扩展");
    return run;
}
function audit(task, run, request, eventType, actorId) {
    const key = `${eventType}:${request.id}`;
    const payload = { requestId: request.id, actionFingerprint: request.actionFingerprint, contractRevision: request.contractRevision, appliedRevision: request.appliedRevision || 0, contentStored: false };
    (0, agent_run_store_1.appendAgentRunEvent)(run.runId, { eventType, idempotencyKey: key, payload });
    (0, agent_governance_store_1.recordAgentActivity)({ taskId: task.id, runId: run.runId, traceId: run.traceId, actorType: actorId.startsWith("mcp:") ? "agent" : actorId === "startup-reconciliation" ? "system" : "user", actorId, eventType, summary: eventType, payload, idempotencyKey: key });
}
/** Task JSON is the approval WAL: persist applying before changing Run or contract. */
async function mutateDispatchScope(deps, taskId, workItemId, action, input, actorId) {
    return (0, atomic_json_file_1.withFileLock)(path.join(utils_1.CCM_DIR, "dispatch-scope", (0, crypto_1.createHash)("sha256").update(taskId).digest("hex")), () => mutateScopeUnderLock(deps, taskId, workItemId, action, input, actorId));
}
// All WAL and revision writes are synchronous under the cross-process lock;
// runtime continuation starts afterwards and is separately idempotent.
async function mutateScopeUnderLock(deps, taskId, workItemId, action, input, actorId) {
    let task = deps.readTask(taskId);
    if (!task)
        throw new Error("任务不存在");
    if (!actorId || !String(input.idempotencyKey || input.idempotency_key || ""))
        throw new Error("范围操作缺少操作者或幂等键");
    if (!(task.work_items || []).some((row) => (row.id || row.workItemId) === workItemId))
        throw new Error("工作项不存在");
    let requests = [...(task.scope_expansion_requests || [])];
    if (action === "request") {
        const replay = requests.find((row) => row.workItemId === workItemId && row.runId === (input.runId || input.run_id) && row.idempotencyKey === (input.idempotencyKey || input.idempotency_key));
        if (replay) {
            const original = (0, agent_run_store_1.getAgentRun)(replay.runId);
            if (!original || original.taskId !== task.id || original.traceId !== task.trace_id || input.traceId && input.traceId !== original.traceId || input.attemptId && input.attemptId !== original.attemptId)
                throw new Error("范围申请重放身份不匹配");
            return { request: replay, replayed: true };
        }
        const run = requireRun(task, input);
        const boundItem = (0, agent_run_store_1.listAgentRunEvents)(run.runId).find(event => event.eventType === "execution.work_item_bound")?.payload?.workItemId;
        if (boundItem ? boundItem !== workItemId : task.work_items.length !== 1)
            throw Object.assign(new Error("Run 缺少当前工作项的权威绑定"), { code: "CCM_SCOPE_IDENTITY_CONFLICT" });
        const request = (0, scope_expansion_1.createScopeExpansionRequest)({ ...input, taskId, workItemId, runId: run.runId, traceId: run.traceId, attemptId: run.attemptId, contractRevision: input.contractRevision || revision(task), forbiddenPaths: (0, dispatch_profile_1.resolveDispatchScope)(task).forbiddenPaths, workspacePath: run.workspacePath, requestedBy: actorId, idempotencyKey: input.idempotencyKey || input.idempotency_key });
        const old = requests.find(r => r.id === request.id);
        if (old)
            return { request: old, replayed: true };
        if (Number(request.contractRevision) !== revision(task))
            throw new Error("合同 revision 已变化，请重新申请");
        if (!["starting", "running", "recovering", "waiting_input", "waiting_confirmation"].includes(run.status))
            throw new Error("当前 Run 不允许申请范围扩展");
        request.taskAttempt = Number(task.execution_attempt || task.attempt || 1);
        if (deps.continuationChannel)
            request.continuationChannel = deps.continuationChannel;
        requests.push(request);
        task = deps.updateTask(taskId, { scope_expansion_requests: requests });
        if (!["waiting_input", "waiting_confirmation"].includes(run.status))
            (0, agent_run_store_1.transitionAgentRun)(run.runId, "waiting_input", "等待范围扩展审批");
        deps.pause?.(run);
        audit(task, run, request, "scope.expansion_requested", actorId);
        return { request, replayed: false };
    }
    const index = requests.findIndex(r => r.id === (input.requestId || input.request_id) && r.workItemId === workItemId);
    if (index < 0)
        throw new Error("范围申请不存在");
    let request = requests[index];
    if (request.status === "approved" && request.applicationState === "applied" && action === "approve" && request.continuation && request.continuation.mode !== "startup_deferred")
        return { request, replayed: true, continuation: request.continuation };
    const unresolved = requests.some((r, i) => i !== index && r.runId === request.runId && (r.status === "pending" || r.applicationState === "applying"));
    if (request.taskAttempt && request.taskAttempt !== Number(task.execution_attempt || task.attempt || 1))
        throw Object.assign(new Error("申请属于旧 Attempt，禁止续跑"), { code: "CCM_SCOPE_IDENTITY_CONFLICT" });
    const run = requireRun(task, { runId: request.runId, attemptId: request.attemptId });
    if (request.applicationState === "applied" && request.status === "approved" && action === "approve") {
        if (request.continuation && request.continuation.mode !== "startup_deferred")
            return { request, replayed: true, continuation: request.continuation };
        return continueApplied(deps, task, run, request);
    }
    if (request.status !== "pending" && request.applicationState !== "applying") {
        if (request.status === "rejected" && action === "reject" || request.status === "expired" && action === "expire")
            return { request, replayed: true };
        throw new Error("已决定的范围申请不能改写");
    }
    if (action !== "expire" && request.status === "pending" && (!compatibleScopeRevision(task, request, requests) || input.contractRevision && Number(input.contractRevision) !== request.contractRevision))
        throw new Error("合同 revision 已变化，请重新申请");
    if (request.status === "pending" && Date.parse(request.expiresAt || "") <= Date.now())
        action = "expire";
    if (!["approve", "reject", "expire"].includes(action))
        throw new Error("范围操作无效");
    if (action !== "approve") {
        request = { ...request, status: action === "reject" ? "rejected" : "expired", decidedBy: actorId, decidedAt: new Date().toISOString(), decisionReason: (0, acceptance_user_projection_1.acceptanceDisplayText)(input.reason) };
        requests[index] = request;
        task = deps.updateTask(taskId, { scope_expansion_requests: requests });
        audit(task, run, request, `scope.expansion_${request.status}`, actorId);
        return { request, continuation: "blocked" };
    }
    // Revalidate all paths against current forbidden boundaries before granting.
    const revalidated = (0, scope_expansion_1.createScopeExpansionRequest)({ ...request, forbiddenPaths: (0, dispatch_profile_1.resolveDispatchScope)(task).forbiddenPaths, workspacePath: run.workspacePath });
    if (JSON.stringify(revalidated.requestedPaths) !== JSON.stringify(request.requestedPaths))
        throw new Error("申请路径的真实目标已变化，需重新申请");
    request = { ...request, status: "approved", applicationState: "applying", approvedBy: actorId, approvedAt: request.approvedAt || new Date().toISOString(), decisionReason: (0, acceptance_user_projection_1.acceptanceDisplayText)(input.reason), appliedRevision: request.appliedRevision || revision(task) + 1 };
    requests[index] = request;
    deps.updateTask(taskId, { scope_expansion_requests: requests });
    const spec = task.task_spec;
    if (!spec)
        throw new Error("任务缺少 TaskSpec，需兼容对账后批准");
    const { checksum: _checksum, plan_checksum: _planChecksum, ...core } = spec;
    const updatedSpec = { ...core, revision: request.appliedRevision, spec_revision: request.appliedRevision, plan_revision: request.appliedRevision, scope_expansion_revision: { requestId: request.id, actionFingerprint: request.actionFingerprint } };
    request = { ...request, applicationState: "applied" };
    requests[index] = request;
    task = deps.updateTask(taskId, { task_spec: { ...updatedSpec, checksum: (0, crypto_1.createHash)("sha256").update(JSON.stringify(updatedSpec)).digest("hex"), plan_checksum: (0, crypto_1.createHash)("sha256").update(JSON.stringify(updatedSpec)).digest("hex") }, scope_expansion_requests: requests, scope_approval_attempt_id: run.attemptId });
    audit(task, run, request, "scope.expansion_approved", actorId);
    if (unresolved)
        return { request, continuation: { mode: "blocked", reason: "other_scope_approval_pending" } };
    return continueApplied(deps, task, run, request);
}
const continuing = new Map();
function continueApplied(deps, task, run, request) {
    const key = request.id;
    const pending = continuing.get(key);
    if (pending)
        return pending;
    const work = Promise.resolve().then(async () => {
        const continuation = deps.continueRun ? await deps.continueRun(run, request) : { mode: "blocked", reason: "runtime_continuation_unavailable" };
        return (0, atomic_json_file_1.withFileLock)(path.join(utils_1.CCM_DIR, "dispatch-scope", (0, crypto_1.createHash)("sha256").update(task.id).digest("hex")), () => {
            const latest = deps.readTask(task.id);
            const requests = (latest.scope_expansion_requests || []).map((row) => row.id === key ? { ...row, continuation } : row);
            deps.updateTask(task.id, { scope_expansion_requests: requests });
            return { request: requests.find((row) => row.id === key), continuation };
        });
    }).finally(() => continuing.delete(key));
    continuing.set(key, work);
    return work;
}
/** Compensate JSON/Run partial writes without executing requested side effects. */
async function reconcileDispatchScopeApplications(deps, tasks) {
    let repaired = 0;
    for (const task of tasks)
        for (const request of task.scope_expansion_requests || []) {
            const run = (0, agent_run_store_1.getAgentRun)(request.runId);
            if (!run || (0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
                continue;
            if (request.status === "pending") {
                if (["starting", "running"].includes(run.status))
                    (0, agent_run_store_1.transitionAgentRun)(run.runId, "waiting_input", "恢复未完成的范围审批等待");
                if (Date.parse(request.expiresAt || "") <= Date.now()) {
                    await mutateDispatchScope(deps, task.id, request.workItemId, "expire", { requestId: request.id, idempotencyKey: `startup-expire:${request.id}` }, "startup-reconciliation");
                    repaired++;
                }
            }
            else if (request.applicationState === "applying") {
                await mutateDispatchScope(deps, task.id, request.workItemId, "approve", { requestId: request.id, idempotencyKey: `compensate:${request.id}` }, request.approvedBy);
                repaired++;
            }
            else if (request.status === "approved" && (!request.continuation || request.continuation.mode === "startup_deferred")) {
                await continueApplied(deps, task, run, request);
                repaired++;
            }
        }
    return { repaired };
}
//# sourceMappingURL=dispatch-scope-service.js.map