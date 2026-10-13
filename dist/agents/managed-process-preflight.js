"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareManagedProcessExecution = prepareManagedProcessExecution;
const db_1 = require("../core/db");
const agent_execution_coordinator_1 = require("./agent-execution-coordinator");
const agent_run_store_1 = require("./agent-run-store");
const agent_run_workspace_1 = require("./agent-run-workspace");
/** Complete authorization before spawn; process registration is observation. */
async function prepareManagedProcessExecution(taskId, executionId, meta) {
    if (meta.persistAgentRun === false)
        return meta;
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    const identity = require("./dispatch-task-retry-identity").resolveTaskDispatchExecutionIdentity(taskId, meta.attemptId, meta.parentRunId);
    let run = meta.agentRunId ? (0, agent_run_store_1.getAgentRun)(meta.agentRunId) : null;
    if (!run) {
        const result = await (0, agent_execution_coordinator_1.startPersistentAgentExecution)({ taskId, executionId,
            traceId: meta.traceId || task?.trace_id || `task:${taskId}`, attemptId: identity.attemptId || `attempt:${executionId || taskId}`, parentRunId: identity.parentRunId,
            scope: meta.scope || (meta.groupId ? "group" : "project"), scopeId: meta.scopeId || meta.groupId || meta.project || taskId,
            agentId: meta.agentId || meta.agentType, runtimeId: meta.agentType,
            nativeSessionId: meta.nativeSessionId || "", taskAgentSessionId: meta.taskAgentSessionId || "",
            workspacePath: meta.cwd, worktreeId: meta.worktreeId || "", source: meta.source,
            triggerType: meta.triggerType || "user", idempotencyKey: meta.idempotencyKey || `managed-process:${taskId}:${executionId}:${identity.attemptId}`,
            leaseOwnerId: `managed-process:${process.pid}`, leaseTtlMs: meta.timeoutMs || 300000,
        });
        require("./agent-execution-coordinator").assertPersistentExecutionLaunchAllowed(result);
        run = result.run;
    }
    if (run.taskId !== taskId || run.executionId !== executionId || task?.trace_id && run.traceId !== task.trace_id)
        throw new Error("进程执行绑定身份不一致");
    const owner = `managed-process:${process.pid}`;
    const lease = (0, agent_execution_coordinator_1.claimPersistentAgentExecution)(run.runId, owner, meta.timeoutMs || 300000);
    if (!lease.acquired)
        throw new Error("Runtime 进程未取得唯一执行租约");
    try {
        const workspaceEvidence = await (0, agent_run_workspace_1.captureAgentRunWorkspaceEvidence)({ runId: run.runId, workspacePath: meta.cwd, worktreeId: meta.worktreeId || "" });
        (0, agent_run_store_1.updateAgentRunBindings)(run.runId, { workspaceEvidence });
    }
    catch (error) {
        require("./agent-execution-coordinator").markPersistentAgentExecutionRecoveryRequired(run.runId, "启动前工作区证据不可用");
        throw error;
    }
    return { ...meta, agentRunId: run.runId, leaseId: lease.run.leaseId, leaseOwnerId: owner };
}
//# sourceMappingURL=managed-process-preflight.js.map