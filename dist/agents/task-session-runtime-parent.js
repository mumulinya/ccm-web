"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSessionRuntimeParent = taskSessionRuntimeParent;
const db_1 = require("../core/db");
const agent_run_store_1 = require("./agent-run-store");
const agent_sessions_1 = require("../tasks/agent-sessions");
/** Legacy TaskRun and AgentRun IDs are different authorities. Link the new
 * developer Run to the exact prior Run inspected for this Agent's session. */
function taskSessionRuntimeParent(input) {
    const task = (0, db_1.getTaskById)(input.taskId);
    if (!task?.task_session_continuation_context || input.scope === "test_agent")
        return undefined;
    const session = (0, agent_sessions_1.listTaskAgentSessions)({ taskId: task.id }).find(row => row.id === input.taskAgentSessionId);
    if (!session?.taskSessionContinuation)
        return undefined;
    const checked = session.taskSessionContinuation;
    const parent = checked.parent_run_id && (0, agent_run_store_1.getAgentRun)(checked.parent_run_id);
    if (checked.parent_run_id && !parent || checked.attempt_id !== task.attempt_id || input.attemptId !== task.attempt_id
        || parent && (parent.taskId !== task.id || parent.traceId !== input.traceId || parent.taskAgentSessionId !== session.id
            || parent.scope === "test_agent" || parent.agentId === "test-agent" || !["succeeded", "failed", "cancelled"].includes(parent.status))) {
        throw Object.assign(new Error("再次开发的原运行身份或续接检查已失效"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    }
    if (input.parentRunId && input.parentRunId !== task.parent_run_id && input.parentRunId !== parent?.runId) {
        throw Object.assign(new Error("再次开发不能关联另一个 Agent 的 Run"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    }
    return parent?.runId || "";
}
//# sourceMappingURL=task-session-runtime-parent.js.map