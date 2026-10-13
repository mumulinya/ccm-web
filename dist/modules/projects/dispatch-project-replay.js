"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayDispatchProjectExecution = replayDispatchProjectExecution;
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_run_lifecycle_1 = require("../../agents/agent-run-lifecycle");
/** Replay before source-drift validation: the completed child intentionally
 * changed the original planning snapshot. A reconnect must not overwrite its
 * delivery state with a new source-drift blocker. Explicit retry has a new key. */
function replayDispatchProjectExecution(task) {
    if (task?.acceptance_state === "delivery_recovery_required")
        return {
            task, status: "blocked", summary: String(task.status_detail || "交付需恢复对账"),
            fileChanges: task.file_changes || { count: 0, files: [] }, verification: task.verification || [], risks: ["交付需恢复对账"], testAgent: task.test_agent_review || null,
        };
    const attempt = String(task?.attempt_id || task?.attemptId || task?.execution_attempt || task?.attempt || 1);
    const run = (0, agent_run_store_1.getAgentRunByIdempotencyKey)(`project-main:${task?.id}:${attempt}`);
    if (!run || !(0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status))
        return null;
    if (run.taskId !== task.id || run.traceId !== task.trace_id || run.agentId !== "project-main-agent")
        return null;
    return {
        task, status: run.status === "succeeded" ? "completed" : run.status === "failed" ? "failed" : "blocked",
        summary: String(task.final_summary || task.result || task.status_detail || ""),
        fileChanges: task.file_changes || { count: 0, files: [] },
        verification: task.verification || [], risks: task.risks || [], testAgent: task.test_agent_review || null,
    };
}
//# sourceMappingURL=dispatch-project-replay.js.map