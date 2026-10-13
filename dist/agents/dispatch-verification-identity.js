"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDispatchVerificationIdentity = resolveDispatchVerificationIdentity;
const db_1 = require("../core/db");
const agent_run_store_1 = require("./agent-run-store");
/** Review scope deduplicates verification jobs; it is not the delivery Attempt. */
function resolveDispatchVerificationIdentity(taskId, handoff, legacyAttemptScope) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    const traceId = String(task?.trace_id || handoff?.trace_id || handoff?.traceId || `task:${taskId}`);
    if (task?.trace_id && (handoff?.trace_id || handoff?.traceId) && traceId !== (handoff.trace_id || handoff.traceId))
        throw Object.assign(new Error("验收 Trace 与任务不匹配"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    const requestedParent = String(handoff?.parent_run_id || handoff?.parentRunId || "");
    const explicit = requestedParent ? (0, agent_run_store_1.getAgentRun)(requestedParent) : null;
    if (requestedParent && (!explicit || explicit.taskId !== taskId || explicit.traceId !== traceId))
        throw Object.assign(new Error("验收父 Run 与任务不匹配"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    const current = task?.active_run_id && (0, agent_run_store_1.getAgentRun)(task.active_run_id);
    const parent = explicit || (current?.taskId === taskId && current.traceId === traceId && current.scope !== "test_agent" ? current : null)
        || (0, agent_run_store_1.listAgentRuns)({ taskId }).filter(run => run.traceId === traceId && run.scope !== "test_agent").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const attemptId = String(task?.attempt_id || task?.attemptId || parent?.attemptId || legacyAttemptScope);
    if (explicit && (task?.attempt_id || task?.attemptId) && explicit.attemptId !== attemptId)
        throw Object.assign(new Error("验收父 Run 不属于当前 Attempt"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    return { traceId, attemptId, parentRunId: parent?.runId || "" };
}
//# sourceMappingURL=dispatch-verification-identity.js.map