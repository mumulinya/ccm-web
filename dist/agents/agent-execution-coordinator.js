"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPersistentAgentWake = requestPersistentAgentWake;
exports.assertPersistentExecutionLaunchAllowed = assertPersistentExecutionLaunchAllowed;
exports.startPersistentAgentExecutionSync = startPersistentAgentExecutionSync;
exports.continueApprovedDispatchScope = continueApprovedDispatchScope;
exports.startPersistentAgentExecution = startPersistentAgentExecution;
exports.finalizePersistentAgentExecution = finalizePersistentAgentExecution;
exports.markPersistentAgentExecutionStarted = markPersistentAgentExecutionStarted;
exports.markPersistentAgentExecutionRecoveryRequired = markPersistentAgentExecutionRecoveryRequired;
exports.relinkPersistentAgentExecution = relinkPersistentAgentExecution;
exports.claimPersistentAgentExecution = claimPersistentAgentExecution;
exports.cancelPersistentAgentExecution = cancelPersistentAgentExecution;
exports.applyPersistentAgentManualAction = applyPersistentAgentManualAction;
const agent_run_lifecycle_1 = require("./agent-run-lifecycle");
const dispatch_workspace_policy_1 = require("./dispatch-workspace-policy");
const dispatch_lease_checkout_1 = require("./dispatch-lease-checkout");
const runtime_1 = require("./runtime");
const agent_run_store_1 = require("./agent-run-store");
const agent_heartbeat_coordinator_1 = require("./agent-heartbeat-coordinator");
const task_store_1 = require("../core/task-store");
const agent_runtime_adapter_1 = require("./agent-runtime-adapter");
const agent_execution_idempotency_1 = require("./agent-execution-idempotency");
const agent_governance_store_1 = require("./agent-governance-store");
const agent_heartbeat_context_1 = require("./agent-heartbeat-context");
const agent_run_secrets_1 = require("./agent-run-secrets");
const agent_routine_store_1 = require("./agent-routine-store");
const agent_run_workspace_1 = require("./agent-run-workspace");
const dispatch_run_gate_1 = require("./dispatch-run-gate");
const dispatch_write_permission_1 = require("./dispatch-write-permission");
const ACTIVE_RUN_STATUSES = new Set([
    "created", "queued", "leased", "starting", "running", "waiting_confirmation",
    "waiting_input", "paused", "recovering",
]);
const ADOPTION_SOURCES = new Set(["legacy_reconciled", "external_runner_relinked", "startup_recovery", "managed_process_relinked"]);
function text(value) { return String(value ?? "").trim(); }
function scope(value) {
    const normalized = text(value).toLowerCase();
    return ["project", "group", "global", "test_agent", "automation"].includes(normalized) ? normalized : "project";
}
function isActive(run) { return !!run && ACTIVE_RUN_STATUSES.has(run.status); }
/** Governance inputs request wake-ups through the same coordination boundary. */
function requestPersistentAgentWake(input) { return (0, agent_heartbeat_coordinator_1.requestAgentHeartbeat)(input); }
/** Call immediately before any Runtime side effect. A blocked projection is
 * not a permit, and a resumed wake without a lease belongs to the processor. */
function assertPersistentExecutionLaunchAllowed(result) {
    if (result.mode === "blocked")
        throw Object.assign(new Error(`Runtime 启动已阻塞：${result.reason || "execution_gate"}`), { code: "CCM_DISPATCH_START_BLOCKED", agentRunId: result.run?.runId });
    if (result.mode === "coalesced")
        throw Object.assign(new Error("同一幂等执行已存在，禁止重复启动 Runtime"), { code: "CCM_RUN_ALREADY_ACTIVE", agentRunId: result.run?.runId });
    if (!result.lease?.acquired || !result.run || (0, agent_run_lifecycle_1.isAgentRunTerminal)(result.run.status))
        throw Object.assign(new Error("Runtime 未持有有效启动租约"), { code: "CCM_RUN_ALREADY_LEASED", agentRunId: result.run?.runId });
}
function validate(input) {
    const missing = ["taskId", "traceId", "attemptId", "agentId", "runtimeId", "scopeId"].filter(key => !text(input[key]));
    if (missing.length)
        throw Object.assign(new Error(`持久化 Agent 执行缺少身份字段：${missing.join(", ")}`), { code: "CCM_EXECUTION_IDENTITY_REQUIRED", fields: missing });
}
function findActive(input) {
    return (0, agent_run_store_1.listAgentRuns)({ taskId: input.taskId, limit: 200 }).find(run => isActive(run)
        && run.agentId === input.agentId
        && run.scopeId === input.scopeId) || null;
}
function coalesceActiveExecutionWake(input, active, idempotencyKey) {
    const wakeKey = (0, agent_execution_idempotency_1.buildAgentHeartbeatIdempotencyKey)({
        scope: scope(input.scope), scopeId: input.scopeId, taskId: input.taskId,
        agentId: input.agentId, traceId: input.traceId, attemptId: input.attemptId,
        triggerType: input.triggerType, reason: input.reason, requestId: input.requestId || idempotencyKey,
    });
    return (0, agent_heartbeat_coordinator_1.requestAgentHeartbeat)({
        runId: active.runId,
        agentId: active.agentId,
        scope: active.scope,
        scopeId: active.scopeId,
        taskId: active.taskId,
        traceId: active.traceId,
        reason: input.reason || (input.triggerType === "retry" ? "retry" : input.triggerType === "resume" ? "resume" : "assignment"),
        idempotencyKey: wakeKey,
        runtimeId: active.runtimeId,
        attemptId: active.attemptId,
        executionId: active.executionId,
        taskAgentSessionId: active.taskAgentSessionId,
        nativeSessionId: active.nativeSessionId,
        workspacePath: active.workspacePath,
        worktreeId: active.worktreeId,
        runtimeVersionSnapshot: active.runtimeVersionSnapshot,
        source: "coordinator",
    });
}
function createNewPersistentAgentExecution(input, idempotencyKey) {
    const result = createExecutionInTransaction(input, idempotencyKey);
    return attachExecutionGovernance(result, input, idempotencyKey);
}
function attachExecutionGovernance(result, input, idempotencyKey) {
    const run = result.run;
    if (!run)
        return result;
    const budget = (0, agent_governance_store_1.evaluateAgentRunBudget)(run.runId);
    if (budget.hardStop && result.mode !== "coalesced") {
        try {
            (0, agent_run_store_1.transitionAgentRun)(run.runId, "waiting_confirmation", "Run 已达到预算上限，等待人工处理", { eventType: "budget.hard_stop", error: { reason: budget.reason, policyId: budget.policy?.policyId || "" } });
            if (result.lease?.leaseId)
                (0, agent_run_store_1.releaseAgentRunLease)(run.runId, String(input.leaseOwnerId || `execution-coordinator:${process.pid}`), result.lease.leaseId);
            if (result.checkout?.checkout?.checkoutId) {
                try {
                    (0, agent_governance_store_1.releaseAgentTaskCheckout)(result.checkout.checkout.checkoutId, result.checkout.checkout.ownerId, "blocked");
                }
                catch { }
            }
            result.mode = "blocked";
            result.reason = "budget_hard_stop";
        }
        catch { }
    }
    if (result.mode !== "coalesced" && !result.checkout) {
        try {
            result.checkout = (0, agent_governance_store_1.acquireAgentTaskCheckout)({
                taskId: run.taskId, runId: run.runId, traceId: run.traceId,
                ...(0, dispatch_workspace_policy_1.dispatchCheckoutWorkspace)({ ...input, workspacePath: run.workspacePath || input.workspacePath, worktreeId: run.worktreeId || input.worktreeId }),
                ownerId: String(input.leaseOwnerId || `execution-coordinator:${process.pid}`),
                leaseId: run.leaseId || result.lease?.leaseId || "", ttlMs: input.leaseTtlMs, idempotencyKey: `run-checkout:${idempotencyKey}`, exclusiveWorkspace: (0, dispatch_workspace_policy_1.requiresExclusiveDispatchWorkspace)(input),
            });
            if (result.checkout && result.checkout.acquired === false) {
                result.mode = "blocked";
                result.reason = result.reason || "checkout_held";
            }
        }
        catch (error) {
            (0, agent_governance_store_1.recordAgentActivity)({ taskId: run.taskId, runId: run.runId, traceId: run.traceId, eventType: "task.checkout_blocked", summary: "任务 Checkout 获取失败", payload: { error: String(error?.message || error) }, idempotencyKey: `checkout-failed:${run.runId}:${idempotencyKey}` });
            result.mode = "blocked";
            result.reason = result.reason || "checkout_failed";
        }
        try {
            const adapter = (0, agent_runtime_adapter_1.getAgentRuntimeAdapter)(run.runtimeId);
            (0, agent_heartbeat_context_1.buildAgentHeartbeatContext)({
                wakeId: result.wake?.wakeId || `run:${run.runId}`,
                run,
                nativeSessionId: run.nativeSessionId || input.nativeSessionId,
                runtimeSupportsResume: adapter.describe().capabilities?.sessionResume !== false,
            });
        }
        catch { }
    }
    try {
        (0, agent_governance_store_1.recordAgentActivity)({ taskId: run.taskId, runId: run.runId, wakeId: result.wake?.wakeId, traceId: run.traceId, actorType: "system", actorId: "agent-execution-coordinator", eventType: result.mode === "retried" ? "run.retried" : result.mode === "resumed" ? "run.recovered" : result.mode === "blocked" ? "run.blocked" : "run.created", summary: result.mode === "blocked" ? `Run 启动被阻止：${result.reason || "unknown"}` : "持久化 Agent Run 已进入统一协调流程", payload: { mode: result.mode, runtimeId: run.runtimeId, checkoutId: result.checkout?.checkout?.checkoutId || "", budget: budget.reason }, idempotencyKey: `execution-activity:${run.runId}:${idempotencyKey}` });
    }
    catch { }
    result.budget = budget;
    const routineTask = require("../core/db").getTaskById(run.taskId);
    const routineRunId = text(input.routineRunId || routineTask?.automation_routine_run_id);
    if (routineRunId && run.scope !== "test_agent" && result.mode !== "blocked") {
        // Existing queue entrypoints do not all carry Routine metadata. Bind from
        // the authoritative Task, and keep an independent verifier from replacing
        // the development Run that owns this scheduled delivery.
        try {
            (0, agent_routine_store_1.updateAgentRoutineRun)(routineRunId, { runId: run.runId, status: "running" });
        }
        catch { }
    }
    return result;
}
function assertBinding(input, run) {
    const fields = ["taskId", "traceId", "attemptId", "agentId", "scopeId", "runtimeId"];
    const conflicts = fields.filter(field => text(input[field]) && text(input[field]) !== text(run[field]));
    if (conflicts.length)
        throw Object.assign(new Error(`AgentRun 身份绑定冲突：${conflicts.join(", ")}`), { code: "CCM_RUN_IDENTITY_CONFLICT" });
}
function createExecutionInTransaction(input, idempotencyKey) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const normalizedScope = scope(input.scope);
        const heartbeatKey = (0, agent_execution_idempotency_1.buildAgentHeartbeatIdempotencyKey)({
            scope: normalizedScope, scopeId: input.scopeId, taskId: input.taskId,
            agentId: input.agentId, traceId: input.traceId, attemptId: input.attemptId,
            triggerType: input.triggerType, reason: input.reason, requestId: input.requestId || idempotencyKey,
        });
        const runtimeVersionSnapshot = input.runtimeVersionSnapshot || (0, runtime_1.captureAgentRuntimeVersionSnapshot)(input.runtimeId);
        const wakeResult = (0, agent_heartbeat_coordinator_1.requestAgentHeartbeatInTransaction)(db, {
            agentId: input.agentId, scope: normalizedScope, scopeId: input.scopeId, taskId: input.taskId,
            traceId: input.traceId,
            reason: input.reason || (input.triggerType === "retry" ? "retry" : input.triggerType === "resume" ? "resume" : "assignment"),
            idempotencyKey: heartbeatKey, runId: input.runId, runtimeId: input.runtimeId,
            attemptId: input.attemptId, executionId: input.executionId,
            taskAgentSessionId: input.taskAgentSessionId, nativeSessionId: input.nativeSessionId,
            workspacePath: input.workspacePath, worktreeId: input.worktreeId, parentRunId: input.parentRunId,
            runtimeVersionSnapshot, source: input.source || "coordinator",
        });
        if (wakeResult.coalesced && wakeResult.activeRun) {
            return { run: wakeResult.activeRun, wake: wakeResult.wake, lease: null, mode: "coalesced", reason: "active_run_exists" };
        }
        const owner = text(input.leaseOwnerId) || `execution-coordinator:${process.pid}`;
        const started = (wakeResult.wake.status === "queued" || wakeResult.wake.status === "claimed")
            ? (0, agent_heartbeat_coordinator_1.startHeartbeatRunInTransaction)(db, wakeResult.wake, owner, { ...input, scope: normalizedScope, runtimeVersionSnapshot, idempotencyKey, source: input.source || "coordinator" })
            : { run: (0, agent_run_store_1.getAgentRunInTransaction)(db, wakeResult.wake.runId || wakeResult.wake.coalescedRunId), wake: wakeResult.wake, lease: null, coalesced: true };
        const run = started.run || (0, agent_run_store_1.getAgentRunInTransaction)(db, wakeResult.wake.runId || wakeResult.wake.coalescedRunId);
        if (!run)
            throw Object.assign(new Error("Coordinator 未能创建 AgentRun"), { code: "CCM_RUN_CREATE_FAILED" });
        if (input.workItemId && !started.coalesced)
            (0, agent_run_store_1.appendAgentRunEventInTransaction)(db, run.runId, { eventType: "execution.work_item_bound", payload: { workItemId: input.workItemId }, idempotencyKey: `work-item-binding:${run.runId}` });
        let checkout = null;
        if (!started.coalesced && started.lease?.acquired && started.lease?.run?.leaseId) {
            checkout = (0, agent_governance_store_1.acquireAgentTaskCheckoutInTransaction)(db, {
                taskId: run.taskId,
                runId: run.runId,
                traceId: run.traceId,
                ...(0, dispatch_workspace_policy_1.dispatchCheckoutWorkspace)({ ...input, workspacePath: run.workspacePath || input.workspacePath, worktreeId: run.worktreeId || input.worktreeId }),
                ownerId: owner,
                leaseId: run.leaseId || started.lease.run.leaseId,
                ttlMs: input.leaseTtlMs,
                idempotencyKey: `run-checkout:${idempotencyKey}`,
                exclusiveWorkspace: (0, dispatch_workspace_policy_1.requiresExclusiveDispatchWorkspace)(input),
            });
            if (checkout && checkout.acquired === false) {
                (0, agent_run_store_1.transitionAgentRunInTransaction)(db, run.runId, "recovery_required", "任务 Checkout 被其他执行占用", {
                    eventType: "task.checkout_blocked",
                    error: { reason: "checkout_held", checkoutId: checkout.checkout?.checkoutId || "" },
                });
            }
        }
        return {
            run: (0, agent_run_store_1.getAgentRunInTransaction)(db, run.runId) || run,
            wake: started.wake || wakeResult.wake,
            lease: started.lease || null,
            mode: checkout?.acquired === false ? "blocked" : started.coalesced ? "coalesced" : input.triggerType === "retry" ? "retried" : input.triggerType === "resume" ? "resumed" : "created",
            checkout,
        };
    });
}
/** Synchronous path for process tracking, which cannot await resume inspection. */
function startPersistentAgentExecutionSync(input) {
    if (input.scope === 'review_agent' || (input.runId && (0, agent_run_store_1.getAgentRun)(input.runId)?.scope === 'review_agent'))
        throw new Error('ReviewAgent 只能由代码审核服务启动');
    validate(input);
    const blockers = (0, agent_governance_store_1.listActiveBlockingDependencies)(input.taskId);
    if (blockers.length && input.triggerType !== "resume") {
        throw Object.assign(new Error("任务存在未释放的前置依赖"), { code: "CCM_TASK_DEPENDENCY_BLOCKED", dependencyIds: blockers.map(item => item.dependencyId) });
    }
    const normalizedScope = scope(input.scope);
    const idempotencyKey = text(input.idempotencyKey) || (0, agent_execution_idempotency_1.buildAgentExecutionIdempotencyKey)({
        scope: normalizedScope, scopeId: input.scopeId, taskId: input.taskId, agentId: input.agentId,
        traceId: input.traceId, attemptId: input.attemptId, triggerType: input.triggerType,
        reason: input.reason, requestId: input.requestId,
    });
    const existing = (0, agent_run_store_1.getAgentRunByIdempotencyKey)(idempotencyKey);
    if (existing) {
        assertBinding(input, existing);
        (0, agent_run_store_1.appendAgentRunEvent)(existing.runId, { eventType: "run.idempotency_replayed", idempotencyKey: `replay:${existing.runId}:${Date.now()}`, payload: { contentStored: false } });
        return { run: existing, wake: null, lease: null, mode: "coalesced", reason: "idempotency_replay" };
    }
    (0, dispatch_run_gate_1.assertPersistentDispatchGate)(input);
    const requestedRun = text(input.runId) ? (0, agent_run_store_1.getAgentRun)(text(input.runId)) : null;
    if (requestedRun) {
        const pendingApproval = (0, agent_governance_store_1.listAgentApprovals)(requestedRun.runId).find(item => item.status !== "approved");
        if (pendingApproval)
            throw Object.assign(new Error("Run 仍在等待人工审批"), { code: "CCM_RUN_APPROVAL_PENDING", approvalId: pendingApproval.approvalId });
    }
    const active = findActive({ ...input, scope: normalizedScope });
    if (active) {
        if (active.traceId !== input.traceId)
            throw Object.assign(new Error("活跃 Run 的 trace_id 不匹配"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
        const wake = coalesceActiveExecutionWake(input, active, idempotencyKey);
        return { run: active, wake: wake.wake, lease: null, mode: "coalesced", reason: "active_run_exists" };
    }
    return createNewPersistentAgentExecution(input, idempotencyKey);
}
function wakeForKey(key, taskId) {
    return (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId, limit: 200 }).find(wake => wake.idempotencyKey === key) || null;
}
/** Approval must never launch a second process while the original is alive. */
async function continueApprovedDispatchScope(runId, requestId) {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        throw new Error("Run 不存在");
    const task = require("../core/db").getTaskById(run.taskId);
    const request = (task?.scope_expansion_requests || []).find((row) => row.id === requestId && row.runId === runId && row.status === "approved" && row.applicationState === "applied");
    if (!request)
        throw new Error("范围批准尚未应用");
    const kernel = require("./execution-kernel");
    const active = kernel.listActiveAgentRuns({ taskId: run.taskId }).filter((row) => row.executionId === run.executionId);
    if (active.length) {
        assertPersistentRunLaunchGates(run);
        if (!run.leaseId || Date.parse(run.leaseExpiresAt || "") <= Date.now())
            return { mode: "blocked", reason: "run_lease_expired" };
        if (request.continuationChannel === "mcp_tool")
            return { mode: "tool_released", reason: "approved_scope_returned_to_original_tool" };
        const signal = kernel.requestActiveAgentRunPause({ taskId: run.taskId, executionId: run.executionId, resume: true, reason: "范围扩展已批准" });
        if (signal.signalled && ["waiting_input", "waiting_confirmation"].includes(run.status))
            markPersistentAgentExecutionStarted(runId, run.leaseId);
        return { mode: signal.signalled ? "signalled" : "blocked", reason: signal.signalled ? "" : "runtime_resume_signal_unsupported" };
    }
    // No command/Prompt is reconstructed from receipt data. Safe recovery remains
    // owned by the existing task recovery pipeline, with explicit evidence checks.
    if (!run.workspaceEvidence || !run.nativeSessionId)
        return { mode: "blocked", reason: "resume_evidence_insufficient" };
    const inspection = await require("./dispatch-resume-inspection").inspectDispatchResume(run);
    if (!inspection.resumable)
        return { mode: "blocked", reason: inspection.reason };
    const activeLease = run.leaseOwnerId && Date.parse(run.leaseExpiresAt || "") > Date.now();
    if (activeLease && run.leaseOwnerId !== `execution-coordinator:${process.pid}` && !run.leaseOwnerId.includes(String(process.pid)))
        return { mode: "blocked", reason: "run_owned_by_other_instance" };
    if (run.leaseOwnerId)
        (0, agent_run_store_1.releaseAgentRunLease)(runId, run.leaseOwnerId, run.leaseId);
    const wake = (0, agent_heartbeat_coordinator_1.requestAgentHeartbeat)({ ...run, runId, reason: "resume", source: "coordinator", idempotencyKey: `scope-resume:${runId}:${requestId}` });
    (0, agent_run_store_1.appendAgentRunEvent)(runId, { eventType: "scope.resume_queued", idempotencyKey: `scope-resume-event:${requestId}`, payload: { wakeId: wake.wake.wakeId, requestId, contentStored: false } });
    return { mode: "queued", wakeId: wake.wake.wakeId };
}
/**
 * The only supported composition point for a new persistent Agent execution.
 * Existing callers can migrate incrementally while the lower-level store remains
 * available for legacy reconciliation and startup recovery.
 */
async function startPersistentAgentExecution(input) {
    if (input.scope === 'review_agent' || (input.runId && (0, agent_run_store_1.getAgentRun)(input.runId)?.scope === 'review_agent'))
        throw new Error('ReviewAgent 只能由代码审核服务启动');
    const continuationParent = require("./task-session-runtime-parent").taskSessionRuntimeParent(input);
    if (continuationParent !== undefined)
        input = { ...input, parentRunId: continuationParent };
    require("./dispatch-startup-barrier").assertDispatchStartupReady();
    validate(input);
    const normalizedScope = scope(input.scope);
    let runtimeProbe = null;
    const idempotencyKey = text(input.idempotencyKey) || (0, agent_execution_idempotency_1.buildAgentExecutionIdempotencyKey)({
        scope: normalizedScope,
        scopeId: input.scopeId,
        taskId: input.taskId,
        agentId: input.agentId,
        traceId: input.traceId,
        attemptId: input.attemptId,
        triggerType: input.triggerType,
        reason: input.reason,
        requestId: input.requestId,
    });
    const existingByKey = (0, agent_run_store_1.getAgentRunByIdempotencyKey)(idempotencyKey);
    if (existingByKey) {
        assertBinding(input, existingByKey);
        return {
            run: existingByKey,
            wake: wakeForKey((0, agent_execution_idempotency_1.buildAgentHeartbeatIdempotencyKey)({
                scope: normalizedScope, scopeId: input.scopeId, taskId: input.taskId,
                agentId: input.agentId, traceId: input.traceId, attemptId: input.attemptId,
                triggerType: input.triggerType, reason: input.reason, requestId: input.requestId || idempotencyKey,
            }), input.taskId),
            lease: null,
            mode: "coalesced",
            reason: "idempotency_replay",
        };
    }
    await (0, dispatch_write_permission_1.ensureDispatchWritePermission)(input);
    await require("../modules/collaboration/task-session-source-attachments").retainTaskSessionSourceAttachments(input.taskId);
    (0, dispatch_run_gate_1.assertPersistentDispatchGate)(input);
    const blockers = (0, agent_governance_store_1.listActiveBlockingDependencies)(input.taskId);
    if (blockers.length)
        throw Object.assign(new Error("任务存在未释放的前置依赖"), { code: "CCM_TASK_DEPENDENCY_BLOCKED", dependencyIds: blockers.map(item => item.dependencyId) });
    try {
        runtimeProbe = input.scope === "test_agent" && input.source === "test-agent" && input.agentId === "test-agent"
            ? { runtimeId: "test-agent", available: true, executablePath: process.execPath, version: process.version, checkedAt: new Date().toISOString() }
            : await (0, agent_runtime_adapter_1.getAgentRuntimeRegistry)().probe((0, runtime_1.normalizeAgentRuntimeId)(input.runtimeId));
        if (!runtimeProbe.available) {
            throw Object.assign(new Error(`Runtime 不可用：${runtimeProbe.runtimeId}`), { code: "CCM_RUNTIME_UNAVAILABLE", probe: runtimeProbe });
        }
    }
    catch (error) {
        if (error?.code === "CCM_RUNTIME_UNAVAILABLE")
            throw error;
        throw Object.assign(new Error("Runtime 健康探测失败，禁止启动"), { code: "CCM_RUNTIME_PROBE_FAILED", cause: error });
    }
    const requestedRun = text(input.runId) ? (0, agent_run_store_1.getAgentRun)(text(input.runId)) : null;
    if (requestedRun) {
        const pendingApproval = (0, agent_governance_store_1.listAgentApprovals)(requestedRun.runId).find(item => item.status !== "approved");
        if (pendingApproval) {
            throw Object.assign(new Error("Run 仍在等待人工审批"), { code: "CCM_RUN_APPROVAL_PENDING", approvalId: pendingApproval.approvalId });
        }
    }
    if (requestedRun && input.triggerType === "resume") {
        const frozenTask = require("../core/db").getTaskById(requestedRun.taskId)?.dispatch_profile_snapshot;
        if (frozenTask && requestedRun.status !== "recovery_required") {
            const live = require("./execution-kernel").listActiveAgentRuns({ taskId: requestedRun.taskId }).filter((row) => row.executionId === requestedRun.executionId);
            if (live.length) {
                const signal = require("./execution-kernel").requestActiveAgentRunPause({ taskId: requestedRun.taskId, executionId: requestedRun.executionId, resume: true });
                if (!signal.signalled)
                    return { run: requestedRun, wake: null, lease: null, mode: "blocked", reason: "runtime_resume_signal_unsupported" };
                if (["waiting_input", "waiting_confirmation"].includes(requestedRun.status))
                    (0, agent_run_store_1.transitionAgentRun)(requestedRun.runId, "running", "原进程继续执行");
                return { run: (0, agent_run_store_1.getAgentRun)(requestedRun.runId), wake: null, lease: null, mode: "resumed" };
            }
            if ((0, agent_run_lifecycle_1.isAgentRunTerminal)(requestedRun.status))
                return { run: requestedRun, wake: null, lease: null, mode: "blocked", reason: "terminal_run_cannot_resume" };
            markPersistentAgentExecutionRecoveryRequired(requestedRun.runId, "原进程已停止，必须验证 Session 和工作区后恢复");
        }
        if (((0, agent_run_store_1.getAgentRun)(requestedRun.runId) || requestedRun).status === "recovery_required") {
            const adapter = (0, agent_runtime_adapter_1.getAgentRuntimeAdapter)(requestedRun.runtimeId);
            const inspection = await require("./dispatch-resume-inspection").inspectDispatchResume({ ...requestedRun, source: input.source || requestedRun.source });
            if (!inspection.resumable) {
                (0, agent_run_store_1.appendAgentRunEvent)(requestedRun.runId, {
                    eventType: "run.resume_blocked",
                    status: requestedRun.status,
                    message: "Runtime 恢复检查未通过",
                    payload: { reason: inspection.reason },
                    idempotencyKey: `resume-blocked:${requestedRun.runId}:${inspection.reason}`,
                });
                return { run: requestedRun, wake: null, lease: null, mode: "blocked", reason: inspection.reason };
            }
            const recovered = (0, agent_run_store_1.recoverAgentRun)(requestedRun.runId, {
                resume: true,
                workspaceEvidence: inspection.evidence?.workspace || requestedRun.workspaceEvidence,
            });
            if (recovered.mode !== "in_place" || !recovered.run) {
                return { run: recovered.run || requestedRun, wake: null, lease: null, mode: "blocked", reason: "recovery_fork_required" };
            }
        }
        const current = (0, agent_run_store_1.getAgentRun)(requestedRun.runId) || requestedRun;
        if (isActive(current)) {
            const wakeResult = (0, agent_heartbeat_coordinator_1.requestAgentHeartbeat)({
                runId: current.runId,
                agentId: current.agentId,
                scope: current.scope,
                scopeId: current.scopeId,
                taskId: current.taskId,
                traceId: current.traceId,
                reason: "resume",
                idempotencyKey,
                runtimeId: current.runtimeId,
                attemptId: current.attemptId,
                executionId: current.executionId,
                taskAgentSessionId: current.taskAgentSessionId,
                nativeSessionId: current.nativeSessionId,
                workspacePath: current.workspacePath,
                worktreeId: current.worktreeId,
                runtimeVersionSnapshot: current.runtimeVersionSnapshot,
                source: "coordinator",
            });
            return { run: current, wake: wakeResult.wake, lease: null, mode: "resumed" };
        }
    }
    const active = findActive({ ...input, scope: normalizedScope });
    if (active) {
        (0, agent_run_store_1.appendAgentRunEvent)(active.runId, {
            eventType: "run.execution_coalesced",
            status: active.status,
            message: "重复执行请求已合并到活跃 Run",
            payload: { idempotencyKey, reason: input.reason || "assignment" },
            idempotencyKey: `coalesced:${active.runId}:${idempotencyKey}`,
        });
        if (active.traceId !== input.traceId)
            throw Object.assign(new Error("活跃 Run 的 trace_id 不匹配"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
        const wake = coalesceActiveExecutionWake(input, active, idempotencyKey);
        return { run: active, wake: wake.wake, lease: null, mode: "coalesced", reason: "active_run_exists", runtimeProbe };
    }
    const result = createNewPersistentAgentExecution(input, idempotencyKey);
    result.runtimeProbe = runtimeProbe;
    return result;
}
function finalizePersistentAgentExecution(input) {
    const current = (0, agent_run_store_1.getAgentRun)(input.runId);
    if (!current)
        throw Object.assign(new Error("AgentRun 不存在"), { code: "CCM_RUN_NOT_FOUND" });
    if (["succeeded", "failed", "cancelled"].includes(current.status) && current.status !== input.status) {
        throw Object.assign(new Error("终态 Run 的结果不可覆盖"), { code: "CCM_RUN_TERMINAL_CONFLICT" });
    }
    if (input.leaseOwnerId && current.leaseOwnerId && current.leaseOwnerId !== input.leaseOwnerId) {
        throw Object.assign(new Error("执行者已失去 Run 租约"), { code: "CCM_RUN_LEASE_LOST" });
    }
    // The terminal Run, lease, Checkout and bound wake commit together. Git
    // artifact collection below may be slow and must not leave a visible
    // terminal Run holding the workspace lane.
    (0, task_store_1.withImmediateTaskStoreTransaction)(() => {
        const current = (0, agent_run_store_1.getAgentRun)(input.runId);
        if (!current)
            throw Object.assign(new Error("AgentRun 不存在"), { code: "CCM_RUN_NOT_FOUND" });
        if ((0, agent_run_lifecycle_1.isAgentRunTerminal)(current.status) && current.status !== input.status) {
            throw Object.assign(new Error("终态 Run 的结果不可覆盖"), { code: "CCM_RUN_TERMINAL_CONFLICT" });
        }
        if (input.leaseOwnerId && current.leaseOwnerId && current.leaseOwnerId !== input.leaseOwnerId) {
            throw Object.assign(new Error("执行者已失去 Run 租约"), { code: "CCM_RUN_LEASE_LOST" });
        }
        if (!["succeeded", "failed", "cancelled"].includes(current.status)) {
            (0, agent_run_store_1.updateAgentRunBindings)(current.runId, {
                nativeSessionId: input.nativeSessionId,
                taskAgentSessionId: input.taskAgentSessionId,
                workspacePath: input.workspacePath,
                worktreeId: input.worktreeId,
                workspaceEvidence: input.workspaceEvidence,
                runtimeVersionSnapshot: input.runtimeVersionSnapshot,
            });
            const initialUsageRecorded = (0, task_store_1.withImmediateTaskStoreTransaction)(db => !!db.prepare("SELECT event_id FROM agent_run_events WHERE run_id = ? AND idempotency_key = ?").get(current.runId, `tool-usage:${current.runId}:0`));
            if (input.usage) {
                if (!initialUsageRecorded)
                    (0, agent_run_store_1.recordAgentRunUsage)(current.runId, { ...input.usage, costUsd: input.usage.costUsd ?? input.usage.totalCostUsd }, input.usageMeta || {});
                const budget = (0, agent_governance_store_1.evaluateAgentRunBudget)(current.runId);
                if (budget.warning || budget.hardStop) {
                    (0, agent_governance_store_1.recordAgentActivity)({ taskId: current.taskId, runId: current.runId, traceId: current.traceId, eventType: budget.hardStop ? "budget.hard_stop" : "budget.warning", summary: budget.hardStop ? "Run 执行后达到预算上限" : "Run 执行接近预算上限", payload: { policyId: budget.policy?.policyId || "", tokenUsed: budget.tokenUsed, costUsedUsd: budget.costUsedUsd }, idempotencyKey: `budget-finalize:${current.runId}:${budget.hardStop ? "hard" : "warning"}` });
                }
            }
            if (!input.usage && !initialUsageRecorded)
                (0, agent_governance_store_1.recordAgentBudgetUsageUnreported)(current.runId);
            (0, agent_run_store_1.transitionAgentRun)(current.runId, input.status, input.status === "succeeded" ? "Persistent Agent 执行成功" : input.status === "cancelled" ? "Persistent Agent 已取消" : "Persistent Agent 执行失败", {
                result: input.result,
                error: input.error,
                eventType: `run.execution_${input.status}`,
            });
        }
        const settled = (0, agent_run_store_1.getAgentRun)(current.runId);
        if (settled.leaseOwnerId)
            (0, agent_run_store_1.releaseAgentRunLease)(settled.runId, settled.leaseOwnerId, settled.leaseId);
        const checkout = (0, agent_governance_store_1.getAgentTaskCheckout)(settled.taskId, settled.runId);
        if (checkout?.status === "active")
            (0, agent_governance_store_1.releaseAgentTaskCheckout)(checkout.checkoutId, checkout.ownerId);
        const wakes = (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId: settled.taskId, limit: 500 }).filter(wake => wake.wakeId === input.wakeId || wake.runId === settled.runId || wake.coalescedRunId === settled.runId);
        for (const wake of wakes) {
            if (["queued", "claimed", "coalesced"].includes(wake.status))
                (0, agent_heartbeat_coordinator_1.finishHeartbeatRun)(wake.wakeId, settled.runId, input.status, input.status === "succeeded" ? (input.result || {}) : (input.error || {}));
        }
    });
    const finalized = (0, agent_run_store_1.getAgentRun)(current.runId);
    if (input.status === "succeeded" || input.status === "failed") {
        try {
            for (const dependency of (0, agent_governance_store_1.listAgentTaskDependencies)().filter(item => item.dependsOnTaskId === finalized.taskId && item.status === "active"))
                (0, agent_governance_store_1.releaseAgentTaskDependency)(dependency.dependencyId, input.status === "failed");
        }
        catch { }
    }
    try {
        const routineRun = (0, agent_routine_store_1.listAgentRoutineRuns)().find(item => item.runId === finalized.runId);
        if (routineRun) {
            const task = require("../core/db").getTaskById(finalized.taskId);
            if (task?.automation_routine_run_id)
                require("./dispatch-routine-consistency").syncDispatchRoutineTask(task);
            else
                (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: input.status === "succeeded" ? "succeeded" : "failed" });
        }
    }
    catch { }
    try {
        const evidence = input.workspaceEvidence || finalized.workspaceEvidence;
        if (evidence)
            (0, agent_governance_store_1.createAgentRunArtifact)({
                runId: finalized.runId, taskId: finalized.taskId, kind: "report", name: "workspace-evidence",
                externalRef: `workspace:${evidence.statusChecksum || evidence.contentChecksum || "unknown"}`,
                checksum: String(evidence.contentChecksum || evidence.statusChecksum || ""), contentType: "application/json", sizeBytes: 0,
                path: "", idempotencyKey: `finalize-artifact:${finalized.runId}:workspace-evidence`,
            });
        // Only evidence captured by this completion may replace the legacy
        // synchronous collector; the stored Run evidence can be its start snapshot.
        const workspaceEvidence = input.workspaceEvidence;
        const gitEvidence = workspaceEvidence && Object.hasOwn(workspaceEvidence, 'gitEvidence')
            ? workspaceEvidence.gitEvidence : (0, agent_run_workspace_1.captureAgentRunGitEvidence)(text(input.workspacePath) || finalized.workspacePath);
        if (gitEvidence) {
            (0, agent_governance_store_1.createAgentRunArtifact)({
                runId: finalized.runId, taskId: finalized.taskId, kind: "diff", name: "git-diff-summary",
                path: gitEvidence.repositoryRoot, externalRef: `git-diff:${gitEvidence.diffChecksum}`,
                checksum: gitEvidence.diffChecksum, contentType: "application/vnd.git.summary+json",
                sizeBytes: gitEvidence.changedFiles.length,
                idempotencyKey: `finalize-git-diff:${finalized.runId}:${gitEvidence.diffChecksum}`,
            });
            for (const [index, changedPath] of gitEvidence.changedFiles.slice(0, 200).entries()) {
                (0, agent_governance_store_1.createAgentRunArtifact)({
                    runId: finalized.runId, taskId: finalized.taskId, kind: "file", name: changedPath.slice(0, 200),
                    path: changedPath, externalRef: `git-file:${gitEvidence.diffChecksum}:${index}`,
                    checksum: gitEvidence.diffChecksum, contentType: "text/plain", sizeBytes: 0,
                    idempotencyKey: `finalize-git-file:${finalized.runId}:${index}:${changedPath}`,
                });
            }
        }
        const resultArtifacts = [
            ...(Array.isArray(input.result?.artifacts) ? input.result.artifacts : []),
            ...(Array.isArray(input.result?.changedFiles || input.result?.changed_files) ? (input.result.changedFiles || input.result.changed_files).map((item) => ({ kind: "diff", name: typeof item === "string" ? item : item?.path || "changed-file", path: typeof item === "string" ? item : item?.path, checksum: item?.checksum || "" })) : []),
            ...(input.result?.testEvidence ? [{ kind: "test_evidence", name: "test-evidence", externalRef: typeof input.result.testEvidence === "string" ? input.result.testEvidence : input.result.testEvidence?.externalRef, checksum: input.result.testEvidence?.checksum || "" }] : []),
            ...(input.result?.receiptRef ? [{ kind: "receipt", name: "external-receipt", externalRef: input.result.receiptRef, checksum: input.result.receiptChecksum || "" }] : []),
        ];
        for (const [index, artifact] of resultArtifacts.slice(0, 50).entries()) {
            const pathOrRef = String(artifact?.path || artifact?.externalRef || artifact?.external_ref || "").trim();
            if (!pathOrRef)
                continue;
            (0, agent_governance_store_1.createAgentRunArtifact)({
                runId: finalized.runId, taskId: finalized.taskId,
                kind: artifact?.kind === "test_evidence" ? "test_evidence" : artifact?.kind === "diff" ? "diff" : "external",
                name: String(artifact?.name || `artifact-${index + 1}`).slice(0, 200), path: String(artifact?.path || ""),
                externalRef: String(artifact?.externalRef || artifact?.external_ref || ""), checksum: String(artifact?.checksum || ""),
                contentType: String(artifact?.contentType || ""), sizeBytes: Number(artifact?.sizeBytes || 0),
                idempotencyKey: `finalize-artifact:${finalized.runId}:${index}:${pathOrRef}`,
            });
        }
    }
    catch { }
    try {
        (0, agent_run_secrets_1.revokeAgentRunSecrets)(finalized.runId);
    }
    catch { }
    try {
        (0, agent_governance_store_1.recordAgentActivity)({ taskId: finalized.taskId, runId: finalized.runId, traceId: finalized.traceId, actorType: "runtime", actorId: finalized.runtimeId, eventType: `run.${input.status}`, summary: input.status === "succeeded" ? "AgentRun 执行成功" : input.status === "cancelled" ? "AgentRun 已取消" : "AgentRun 执行失败", payload: { nativeSessionId: input.nativeSessionId || finalized.nativeSessionId, usageRecorded: !!input.usage }, idempotencyKey: `run-finalized:${finalized.runId}:${input.status}` });
    }
    catch { }
    return finalized;
}
function markPersistentAgentExecutionStarted(runId, leaseId = "") {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return null;
    assertPersistentRunLaunchGates(run);
    if (!run.leaseId || Date.parse(run.leaseExpiresAt || "") <= Date.now() || leaseId && leaseId !== run.leaseId)
        throw Object.assign(new Error("Runtime 启动租约已失效"), { code: "CCM_RUN_LEASE_LOST" });
    if (["starting", "leased", "recovering", "waiting_input", "waiting_confirmation"].includes(run.status)) {
        return (0, agent_run_store_1.transitionAgentRun)(runId, "running", "Persistent Agent Runtime 已开始执行", { leaseId, eventType: "run.execution_started" });
    }
    return run;
}
/** Route recovery-blocked transitions through the same execution boundary as
 * terminal finalization. Entry points may request a recovery state, but they
 * do not compose a second Run lifecycle themselves. */
function markPersistentAgentExecutionRecoveryRequired(runId, message = "AgentRun 需要恢复检查", error = {}) {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return null;
    if (run.status === "recovery_required")
        return run;
    return (0, agent_run_store_1.transitionAgentRun)(runId, "recovery_required", message, {
        error,
        eventType: "run.recovery_required",
    });
}
function relinkPersistentAgentExecution(input, ownerId, ttlMs = 120_000) {
    const source = text(input.source) || "external_runner_relinked";
    if (!ADOPTION_SOURCES.has(source)) {
        throw Object.assign(new Error("AgentRun relink 来源不允许用于普通新执行"), { code: "CCM_ADOPTION_SOURCE_REJECTED", source });
    }
    const run = (0, agent_run_store_1.ensureAgentRun)({ ...input, source });
    if (run.status === "created")
        (0, agent_run_store_1.transitionAgentRun)(run.runId, "queued", "兼容执行记录已重新接入 Coordinator", { eventType: "run.relinked" });
    const lease = claimPersistentAgentExecution(run.runId, ownerId, ttlMs);
    if (!lease.acquired && ["lease_held", "terminal"].includes(String(lease.reason))) {
        throw Object.assign(new Error("AgentRun 已由其他执行者占用或已终态"), { code: "CCM_RUN_ALREADY_LEASED", agentRunId: run.runId });
    }
    if (lease.acquired && lease.run?.status === "leased") {
        (0, agent_run_store_1.transitionAgentRun)(run.runId, "starting", "兼容执行记录已开始启动", { leaseId: lease.run.leaseId, eventType: "run.relinked_starting" });
    }
    return { run: (0, agent_run_store_1.getAgentRun)(run.runId) || run, lease };
}
function claimPersistentAgentExecution(runId, ownerId, ttlMs = 120_000, leaseId = "") {
    require("./dispatch-startup-barrier").assertDispatchStartupReady();
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (run) {
        if (run.leaseOwnerId && run.leaseExpiresAt && Date.parse(run.leaseExpiresAt) <= Date.now() && !(0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status)) {
            markPersistentAgentExecutionRecoveryRequired(runId, "启动租约已过期，需确认旧 Runtime 退出并恢复核验");
            throw Object.assign(new Error("过期 Run 必须先经 Coordinator 恢复核验"), { code: "CCM_DISPATCH_RECOVERY_REQUIRED" });
        }
        assertPersistentRunLaunchGates(run);
    }
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const claimed = (0, agent_run_store_1.claimAgentRunLeaseInTransaction)(db, runId, ownerId, ttlMs, leaseId);
        if (claimed.acquired && claimed.run)
            (0, dispatch_lease_checkout_1.ensureClaimedRunCheckout)(db, claimed.run, ttlMs);
        return claimed;
    });
}
function assertPersistentRunLaunchGates(run) {
    // A terminal Run may be read/replayed, but cannot start another Runtime.
    if ((0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
        throw Object.assign(new Error("终态 Run 不能启动 Runtime"), { code: "CCM_RUN_ALREADY_TERMINAL" });
    if (["paused", "recovery_required"].includes(run.status))
        throw Object.assign(new Error("Run 必须先经 Coordinator 恢复核验"), { code: "CCM_DISPATCH_RECOVERY_REQUIRED" });
    (0, dispatch_run_gate_1.assertPersistentDispatchGate)(run);
    if ((0, agent_governance_store_1.listAgentApprovals)(run.runId).some(item => item.status !== "approved"))
        throw Object.assign(new Error("Run 审批尚未完成或未获有效批准"), { code: "CCM_RUN_APPROVAL_PENDING" });
    if ((0, agent_governance_store_1.listActiveBlockingDependencies)(run.taskId).length)
        throw Object.assign(new Error("前置依赖尚未完成"), { code: "CCM_TASK_DEPENDENCY_BLOCKED" });
    if ((0, agent_governance_store_1.evaluateAgentRunBudget)(run.runId).hardStop)
        throw Object.assign(new Error("预算硬停仍然有效，禁止通过续租启动"), { code: "CCM_DISPATCH_BUDGET_REQUIRED" });
}
function cancelPersistentAgentExecution(runId, ownerId = "", reason = "用户取消任务") {
    return finalizePersistentAgentExecution({ runId, leaseOwnerId: ownerId, status: "cancelled", error: { code: "cancelled", message: reason } });
}
async function applyPersistentAgentManualAction(input) {
    const run = (0, agent_run_store_1.getAgentRun)(input.runId);
    if (!run)
        throw Object.assign(new Error("AgentRun 不存在"), { code: "CCM_RUN_NOT_FOUND" });
    if (run.scope === 'review_agent')
        return { action: input.action, ...require('../review/service').controlReviewRun(run.runId, input.action) };
    const activity = (0, agent_governance_store_1.recordManualAgentAction)({ runId: run.runId, taskId: run.taskId, traceId: run.traceId, action: input.action, actorId: input.actorId, idempotencyKey: input.idempotencyKey, payload: { reason: input.reason || "" } });
    if (input.action === "cancel")
        return { action: input.action, activity, run: cancelPersistentAgentExecution(run.runId, input.ownerId || "", input.reason || "人工取消 Run") };
    if (input.action === "pause") {
        const paused = ["created", "queued", "leased", "starting", "running", "waiting_confirmation", "waiting_input"].includes(run.status)
            ? (0, agent_run_store_1.transitionAgentRun)(run.runId, "paused", input.reason || "人工暂停 Run", { eventType: "manual.pause", actorId: input.actorId })
            : run;
        return { action: input.action, activity, run: paused };
    }
    if (input.action === "mark_recovery_required")
        return { action: input.action, activity, run: markPersistentAgentExecutionRecoveryRequired(run.runId, input.reason || "人工要求进入恢复状态", { actorId: input.actorId }) };
    if (input.action === "release_lease") {
        const lease = (0, agent_run_store_1.releaseAgentRunLease)(run.runId, input.ownerId || run.leaseOwnerId, run.leaseId);
        const checkout = (0, agent_governance_store_1.getAgentTaskCheckout)(run.taskId, run.runId);
        if (checkout?.status === "active")
            (0, agent_governance_store_1.releaseAgentTaskCheckout)(checkout.checkoutId, input.ownerId || checkout.ownerId);
        return { action: input.action, activity, run: (0, agent_run_store_1.getAgentRun)(run.runId) || run, lease };
    }
    if (input.action === "resume" || input.action === "recover") {
        const current = (0, agent_run_store_1.getAgentRun)(run.runId) || run;
        const result = await startPersistentAgentExecution({ ...current, scope: current.scope, scopeId: current.scopeId, taskId: current.taskId, traceId: current.traceId, attemptId: current.attemptId, agentId: current.agentId, runtimeId: current.runtimeId, triggerType: "resume", reason: "resume", idempotencyKey: `${input.idempotencyKey}:resume`, runId: current.runId, leaseOwnerId: input.ownerId || `manual:${input.actorId}`, workspacePath: current.workspacePath, worktreeId: current.worktreeId, nativeSessionId: current.nativeSessionId, taskAgentSessionId: current.taskAgentSessionId });
        return { action: input.action, activity, ...result };
    }
    if (input.action === "retry") {
        const replay = (0, agent_run_store_1.getAgentRunByIdempotencyKey)(input.idempotencyKey);
        if (replay)
            return { action: input.action, activity, run: replay, mode: "coalesced" };
        if (!(0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
            throw new Error("先停止旧 Runtime，再明确 retry");
        const retryAttempt = `${run.attemptId}:retry:${require("crypto").createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 16)}`;
        require("../modules/collaboration/dispatch-explicit-retry").resetTaskForExplicitDispatchRetry(run.taskId, retryAttempt);
        const result = await startPersistentAgentExecution({ ...run, runId: undefined, executionId: `${run.executionId}:${retryAttempt}`, scope: run.scope, scopeId: run.scopeId, taskId: run.taskId, traceId: run.traceId, attemptId: retryAttempt, agentId: run.agentId, runtimeId: input.runtimeId || run.runtimeId, triggerType: "retry", reason: "retry", idempotencyKey: input.idempotencyKey, parentRunId: run.runId, leaseOwnerId: input.ownerId || `manual:${input.actorId}` });
        return { action: input.action, activity, ...result };
    }
    if (input.action === "reassign") {
        const result = await startPersistentAgentExecution({ ...run, scope: run.scope, scopeId: run.scopeId, taskId: run.taskId, traceId: run.traceId, attemptId: run.attemptId, agentId: input.agentId || run.agentId, runtimeId: input.runtimeId || run.runtimeId, triggerType: "resume", reason: "resume", idempotencyKey: input.idempotencyKey, parentRunId: run.runId, leaseOwnerId: input.ownerId || `manual:${input.actorId}` });
        return { action: input.action, activity, ...result };
    }
    return { action: input.action, activity, run };
}
//# sourceMappingURL=agent-execution-coordinator.js.map