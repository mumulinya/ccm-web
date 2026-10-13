"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTaskForExplicitDispatchRetry = resetTaskForExplicitDispatchRetry;
const db_1 = require("../../core/db");
const rework_policy_1 = require("./rework-policy");
function resetTaskForExplicitDispatchRetry(taskId, attemptId) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    if (!task)
        return;
    return require("./collaboration-task-service").updateTask(taskId, {
        ...(0, rework_policy_1.buildReviewCycleResetUpdate)(task, "用户明确 retry"),
        attempt_id: attemptId, execution_attempt: Number(task.execution_attempt || task.attempt || 1) + 1,
        status: "pending", acceptance_state: "pending", is_paused: false, paused: false,
    });
}
//# sourceMappingURL=dispatch-explicit-retry.js.map