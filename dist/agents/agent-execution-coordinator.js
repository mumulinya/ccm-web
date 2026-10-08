"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPersistentAgentExecutionSync = startPersistentAgentExecutionSync;
exports.startPersistentAgentExecution = startPersistentAgentExecution;
exports.finalizePersistentAgentExecution = finalizePersistentAgentExecution;
exports.markPersistentAgentExecutionStarted = markPersistentAgentExecutionStarted;
exports.markPersistentAgentExecutionRecoveryRequired = markPersistentAgentExecutionRecoveryRequired;
exports.relinkPersistentAgentExecution = relinkPersistentAgentExecution;
exports.claimPersistentAgentExecution = claimPersistentAgentExecution;
exports.cancelPersistentAgentExecution = cancelPersistentAgentExecution;
exports.applyPersistentAgentManualAction = applyPersistentAgentManualAction;
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
const ACTIVE_RUN_STATUSES = new Set([
    "created", "queued", "leased", "starting", "running", "waiting_confirmation",
    "waiting_input", "paused", "recovering",
]);
function text(value) { return String(value ?? "").trim(); }
function scope(value) {
    const normalized = text(value).toLowerCase();
    return ["project", "group", "global", "test_agent", "automation"].includes(normalized) ? normalized : "project";
}
function isActive(run) { return !!run && ACTIVE_RUN_STATUSES.has(run.status); }
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
            result.mode = "blocked";
            result.reason = "budget_hard_stop";
        }
        catch { }
    }
    if (result.mode !== "coalesced" && !result.checkout) {
        try {
            result.checkout = (0, agent_governance_store_1.acquireAgentTaskCheckout)({
                taskId: run.taskId, runId: run.runId, traceId: run.traceId, workspacePath: run.workspacePath || input.workspacePath,
                worktreeId: run.worktreeId || input.worktreeId, ownerId: String(input.leaseOwnerId || `execution-coordinator:${process.pid}`),
                leaseId: run.leaseId || result.lease?.leaseId || "", ttlMs: input.leaseTtlMs, idempotencyKey: `run-checkout:${idempotencyKey}`,
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
        let checkout = null;
        if (!started.coalesced && started.lease?.acquired && started.lease?.run?.leaseId) {
            checkout = (0, agent_governance_store_1.acquireAgentTaskCheckoutInTransaction)(db, {
                taskId: run.taskId,
                runId: run.runId,
                traceId: run.traceId,
                workspacePath: run.workspacePath || input.workspacePath,
                worktreeId: run.worktreeId || input.worktreeId,
                ownerId: owner,
                leaseId: run.leaseId || started.lease.run.leaseId,
                ttlMs: input.leaseTtlMs,
                idempotencyKey: `run-checkout:${idempotencyKey}`,
            });
            if (checkout && checkout.acquired === false) {
                (0, agent_run_store_1.transitionAgentRunInTransaction)(db, run.runId, "recovery_required", "任务 Checkout 被其他执行占用", {
                    eventType: "task.checkout_blocked",
                    error: { reason: "checkout_held", checkoutId: checkout.checkout?.checkoutId || "" },
                });
            }
        }
        return {
            run,
            wake: started.wake || wakeResult.wake,
            lease: started.lease || null,
            mode: started.coalesced ? "coalesced" : input.triggerType === "retry" ? "retried" : input.triggerType === "resume" ? "resumed" : "created",
            checkout,
        };
    });
}
/** Synchronous path for process tracking, which cannot await resume inspection. */
function startPersistentAgentExecutionSync(input) {
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
    const requestedRun = text(input.runId) ? (0, agent_run_store_1.getAgentRun)(text(input.runId)) : null;
    if (requestedRun) {
        const pendingApproval = (0, agent_governance_store_1.listAgentApprovals)(requestedRun.runId).find(item => item.status === "pending" && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()));
        if (pendingApproval && input.triggerType !== "resume")
            throw Object.assign(new Error("Run 仍在等待人工审批"), { code: "CCM_RUN_APPROVAL_PENDING", approvalId: pendingApproval.approvalId });
    }
    const active = findActive({ ...input, scope: normalizedScope });
    if (active) {
        if (active.traceId !== input.traceId)
            throw Object.assign(new Error("活跃 Run 的 trace_id 不匹配"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
        return { run: active, wake: null, lease: null, mode: "coalesced", reason: "active_run_exists" };
    }
    return createNewPersistentAgentExecution(input, idempotencyKey);
}
function wakeForKey(key, taskId) {
    return (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId, limit: 200 }).find(wake => wake.idempotencyKey === key) || null;
}
/**
 * The only supported composition point for a new persistent Agent execution.
 * Existing callers can migrate incrementally while the lower-level store remains
 * available for legacy reconciliation and startup recovery.
 */
async function startPersistentAgentExecution(input) {
    validate(input);
    const blockers = (0, agent_governance_store_1.listActiveBlockingDependencies)(input.taskId);
    if (blockers.length && input.triggerType !== "resume") {
        throw Object.assign(new Error("任务存在未释放的前置依赖"), { code: "CCM_TASK_DEPENDENCY_BLOCKED", dependencyIds: blockers.map(item => item.dependencyId) });
    }
    const normalizedScope = scope(input.scope);
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
    const requestedRun = text(input.runId) ? (0, agent_run_store_1.getAgentRun)(text(input.runId)) : null;
    if (requestedRun) {
        const pendingApproval = (0, agent_governance_store_1.listAgentApprovals)(requestedRun.runId).find(item => item.status === "pending" && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()));
        if (pendingApproval && input.triggerType !== "resume") {
            throw Object.assign(new Error("Run 仍在等待人工审批"), { code: "CCM_RUN_APPROVAL_PENDING", approvalId: pendingApproval.approvalId });
        }
    }
    if (requestedRun && input.triggerType === "resume") {
        if (requestedRun.status === "recovery_required") {
            const adapter = (0, agent_runtime_adapter_1.getAgentRuntimeAdapter)(requestedRun.runtimeId);
            const inspection = await adapter.inspectResume({ ...requestedRun, runtimeId: requestedRun.runtimeId });
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
        return { run: active, wake: null, lease: null, mode: "coalesced", reason: "active_run_exists" };
    }
    return createNewPersistentAgentExecution(input, idempotencyKey);
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
    if (!["succeeded", "failed", "cancelled"].includes(current.status)) {
        (0, agent_run_store_1.updateAgentRunBindings)(current.runId, {
            nativeSessionId: input.nativeSessionId,
            taskAgentSessionId: input.taskAgentSessionId,
            workspacePath: input.workspacePath,
            worktreeId: input.worktreeId,
            workspaceEvidence: input.workspaceEvidence,
            runtimeVersionSnapshot: input.runtimeVersionSnapshot,
        });
        if (input.usage) {
            (0, agent_run_store_1.recordAgentRunUsage)(current.runId, input.usage, input.usageMeta || {});
            const budget = (0, agent_governance_store_1.evaluateAgentRunBudget)(current.runId);
            if (budget.warning || budget.hardStop) {
                (0, agent_governance_store_1.recordAgentActivity)({ taskId: current.taskId, runId: current.runId, traceId: current.traceId, eventType: budget.hardStop ? "budget.hard_stop" : "budget.warning", summary: budget.hardStop ? "Run 执行后达到预算上限" : "Run 执行接近预算上限", payload: { policyId: budget.policy?.policyId || "", tokenUsed: budget.tokenUsed, costUsedUsd: budget.costUsedUsd }, idempotencyKey: `budget-finalize:${current.runId}:${budget.hardStop ? "hard" : "warning"}` });
            }
            (0, agent_run_store_1.transitionAgentRun)(current.runId, input.status, input.status === "succeeded" ? "Persistent Agent 执行成功" : input.status === "cancelled" ? "Persistent Agent 已取消" : "Persistent Agent 执行失败", {
                result: input.result,
                error: input.error,
                eventType: `run.execution_${input.status}`,
            });
        }
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
            if (routineRun)
                (0, agent_routine_store_1.updateAgentRoutineRun)(routineRun.routineRunId, { status: input.status === "succeeded" ? "succeeded" : input.status === "cancelled" ? "failed" : "failed" });
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
            const gitEvidence = (0, agent_run_workspace_1.captureAgentRunGitEvidence)(text(input.workspacePath) || finalized.workspacePath);
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
        if (input.leaseOwnerId)
            (0, agent_run_store_1.releaseAgentRunLease)(finalized.runId, input.leaseOwnerId, finalized.leaseId);
        try {
            const checkout = (0, agent_governance_store_1.getAgentTaskCheckout)(finalized.taskId, finalized.runId);
            if (checkout?.status === "active")
                (0, agent_governance_store_1.releaseAgentTaskCheckout)(checkout.checkoutId, checkout.ownerId);
        }
        catch { }
        try {
            (0, agent_governance_store_1.recordAgentActivity)({ taskId: finalized.taskId, runId: finalized.runId, traceId: finalized.traceId, actorType: "runtime", actorId: finalized.runtimeId, eventType: `run.${input.status}`, summary: input.status === "succeeded" ? "AgentRun 执行成功" : input.status === "cancelled" ? "AgentRun 已取消" : "AgentRun 执行失败", payload: { nativeSessionId: input.nativeSessionId || finalized.nativeSessionId, usageRecorded: !!input.usage }, idempotencyKey: `run-finalized:${finalized.runId}:${input.status}` });
        }
        catch { }
        const wakes = (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId: finalized.taskId, limit: 500 }).filter(wake => wake.wakeId === input.wakeId || wake.runId === finalized.runId || wake.coalescedRunId === finalized.runId);
        for (const wake of wakes) {
            if (["queued", "claimed", "coalesced"].includes(wake.status))
                (0, agent_heartbeat_coordinator_1.finishHeartbeatRun)(wake.wakeId, finalized.runId, input.status, input.status === "succeeded" ? (input.result || {}) : (input.error || {}));
        }
        return finalized;
    }
}
function markPersistentAgentExecutionStarted(runId, leaseId = "") {
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (!run)
        return null;
    if (run.status === "starting" || run.status === "leased") {
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
    const run = (0, agent_run_store_1.ensureAgentRun)({ ...input, source: input.source || "external_runner_relinked" });
    if (run.status === "created")
        (0, agent_run_store_1.transitionAgentRun)(run.runId, "queued", "兼容执行记录已重新接入 Coordinator", { eventType: "run.relinked" });
    const lease = (0, agent_run_store_1.claimAgentRunLease)(run.runId, ownerId, ttlMs);
    if (!lease.acquired && ["lease_held", "terminal"].includes(String(lease.reason))) {
        throw Object.assign(new Error("AgentRun 已由其他执行者占用或已终态"), { code: "CCM_RUN_ALREADY_LEASED", agentRunId: run.runId });
    }
    if (lease.acquired && lease.run?.status === "leased") {
        (0, agent_run_store_1.transitionAgentRun)(run.runId, "starting", "兼容执行记录已开始启动", { leaseId: lease.run.leaseId, eventType: "run.relinked_starting" });
    }
    return { run: (0, agent_run_store_1.getAgentRun)(run.runId) || run, lease };
}
function claimPersistentAgentExecution(runId, ownerId, ttlMs = 120_000, leaseId = "") {
    return (0, agent_run_store_1.claimAgentRunLease)(runId, ownerId, ttlMs, leaseId);
}
function cancelPersistentAgentExecution(runId, ownerId = "", reason = "用户取消任务") {
    return finalizePersistentAgentExecution({ runId, leaseOwnerId: ownerId, status: "cancelled", error: { code: "cancelled", message: reason } });
}
async function applyPersistentAgentManualAction(input) {
    const run = (0, agent_run_store_1.getAgentRun)(input.runId);
    if (!run)
        throw Object.assign(new Error("AgentRun 不存在"), { code: "CCM_RUN_NOT_FOUND" });
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
        if (run.status === "paused")
            (0, agent_run_store_1.transitionAgentRun)(run.runId, "queued", input.reason || "人工恢复 Run", { eventType: `manual.${input.action}`, actorId: input.actorId });
        const current = (0, agent_run_store_1.getAgentRun)(run.runId) || run;
        const result = await startPersistentAgentExecution({ ...current, scope: current.scope, scopeId: current.scopeId, taskId: current.taskId, traceId: current.traceId, attemptId: current.attemptId, agentId: current.agentId, runtimeId: current.runtimeId, triggerType: "resume", reason: "resume", idempotencyKey: `${input.idempotencyKey}:resume`, runId: current.runId, leaseOwnerId: input.ownerId || `manual:${input.actorId}`, workspacePath: current.workspacePath, worktreeId: current.worktreeId, nativeSessionId: current.nativeSessionId, taskAgentSessionId: current.taskAgentSessionId });
        return { action: input.action, activity, ...result };
    }
    if (input.action === "retry") {
        const retryAttempt = `${run.attemptId}:retry:${Date.now().toString(36)}`;
        const result = await startPersistentAgentExecution({ ...run, scope: run.scope, scopeId: run.scopeId, taskId: run.taskId, traceId: run.traceId, attemptId: retryAttempt, agentId: run.agentId, runtimeId: input.runtimeId || run.runtimeId, triggerType: "retry", reason: "retry", idempotencyKey: input.idempotencyKey, parentRunId: run.runId, leaseOwnerId: input.ownerId || `manual:${input.actorId}` });
        return { action: input.action, activity, ...result };
    }
    if (input.action === "reassign") {
        const result = await startPersistentAgentExecution({ ...run, scope: run.scope, scopeId: run.scopeId, taskId: run.taskId, traceId: run.traceId, attemptId: run.attemptId, agentId: input.agentId || run.agentId, runtimeId: input.runtimeId || run.runtimeId, triggerType: "resume", reason: "resume", idempotencyKey: input.idempotencyKey, parentRunId: run.runId, leaseOwnerId: input.ownerId || `manual:${input.actorId}` });
        return { action: input.action, activity, ...result };
    }
    return { action: input.action, activity, run };
}
//# sourceMappingURL=agent-execution-coordinator.js.map