"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectExplicitTaskDispatchRetry = inspectExplicitTaskDispatchRetry;
exports.buildExplicitTaskDispatchRetryIdentity = buildExplicitTaskDispatchRetryIdentity;
exports.resolveTaskDispatchExecutionIdentity = resolveTaskDispatchExecutionIdentity;
const db_1 = require("../core/db");
const agent_run_store_1 = require("./agent-run-store");
function inspectExplicitTaskDispatchRetry(task, requestedParent) {
    if (!task?.dispatch_profile_snapshot)
        return null;
    const currentIds = [task.active_run_id, task.task_run?.run_id, task.run_id].filter(Boolean).map(String);
    if (requestedParent && currentIds.length && !currentIds.includes(requestedParent))
        return { success: false, status: 409, code: "TASK_RUN_NOT_ACTIVE", error: "原运行已被新的 Attempt 替代，请刷新任务状态" };
    const live = require("./execution-kernel").listActiveAgentRuns({ taskId: task.id });
    if (live.length || (0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).some(run => !["succeeded", "failed", "cancelled"].includes(run.status)))
        return { success: false, status: 409, code: "TASK_RECOVERY_REVIEW_REQUIRED", error: "旧 Run 尚未安全结束，请先取消或完成恢复核验" };
    return null;
}
function buildExplicitTaskDispatchRetryIdentity(task, nextRun, retryCount) {
    if (!task?.dispatch_profile_snapshot)
        return {};
    const parent = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).filter(run => run.scope !== "test_agent" && run.traceId === task.trace_id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { attempt_id: `attempt:${task.id}:retry:${nextRun?.run_id || retryCount}`, agent_retry_parent_run_id: parent?.runId || "" };
}
/** Legacy Task controls must reach the same business Attempt as Run controls. */
function resolveTaskDispatchExecutionIdentity(taskId, proposedAttempt = "", proposedParent = "") {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    const authoritative = task?.dispatch_profile_snapshot && String(task.attempt_id || "");
    if (authoritative && proposedAttempt && authoritative !== proposedAttempt)
        throw Object.assign(new Error("执行请求属于旧 Attempt，请刷新任务身份"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    return { attemptId: proposedAttempt || authoritative || "", parentRunId: authoritative && !(0, agent_run_store_1.getAgentRun)(proposedParent) ? task.agent_retry_parent_run_id || proposedParent || "" : proposedParent || "" };
}
//# sourceMappingURL=dispatch-task-retry-identity.js.map