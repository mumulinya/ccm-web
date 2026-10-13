"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSessionExecutionIntent = taskSessionExecutionIntent;
exports.validateTaskSessionExecutionTarget = validateTaskSessionExecutionTarget;
const task_run_store_1 = require("./task-run-store");
function taskSessionExecutionIntent(payload, messageType) {
    return messageType === "execution_request" || payload.execution_intent === true || payload.executionIntent === true
        || ["fix", "modify", "continue", "rerun", "execute"].includes(String(payload.intent || "").toLowerCase());
}
/** Reject stale execution targets before the user's message becomes task history. */
function validateTaskSessionExecutionTarget(task, payload, executionIntent) {
    if (!executionIntent || String(payload.mode || "queue").toLowerCase() !== "steer")
        return;
    const runId = String(payload.active_run_id || "").trim();
    const currentId = String(task.active_run_id || task.run_id || task.task_run?.run_id || "").trim();
    const run = runId ? (0, task_run_store_1.getTaskRun)(runId) : null;
    if (!currentId || runId !== currentId || !run || run.task_id !== task.id
        || !["queued", "pending", "running", "in_progress", "verifying", "resuming"].includes(String(run.status || "").toLowerCase())
        || String(payload.attempt_id || "") !== `${run.run_id}:${Number(run.attempt || 1)}`) {
        throw Object.assign(new Error("当前没有可追加的活动执行，请改为排队等待"), { code: "TASK_SESSION_STEER_TARGET_INVALID", status: 409 });
    }
}
//# sourceMappingURL=task-session-message-validation.js.map