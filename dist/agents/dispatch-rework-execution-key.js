"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistedDispatchReworkExecutionKey = persistedDispatchReworkExecutionKey;
exports.dispatchReworkMentionKey = dispatchReworkMentionKey;
const crypto_1 = require("crypto");
const db_1 = require("../core/db");
/** An automatic repair is a distinct, bounded execution of the same Attempt.
 * Its reservation comes only from the persisted shared review cycle; repeated
 * delivery of that reservation must resolve to the very same Run. */
function persistedDispatchReworkExecutionKey(taskId, executionId, originalKey) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    const round = Number(task?.rework_round || 0);
    if (!task?.dispatch_profile_snapshot || !task.review_cycle_id)
        return originalKey;
    if (round < 1) {
        if (!task.task_session_continuation_context || !task.attempt_id)
            return originalKey;
        // ACK and the developer use the same business Attempt but are distinct
        // execution stages. Replays keep this key; a stage cannot replay another.
        return `dispatch-cycle:${(0, crypto_1.createHash)("sha256").update(JSON.stringify([
            taskId, task.trace_id, task.attempt_id, executionId, originalKey || "", task.review_cycle_id,
        ])).digest("hex")}`;
    }
    const identity = [taskId, task.trace_id, task.attempt_id, executionId, originalKey || "", task.review_cycle_id, round];
    return `dispatch-rework:${(0, crypto_1.createHash)("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}
function dispatchReworkMentionKey(task, base) {
    return task?.dispatch_profile_snapshot && task.review_cycle_id && Number(task.rework_round || 0) > 0
        ? `${base}:${task.review_cycle_id}:${Number(task.rework_round)}` : base;
}
//# sourceMappingURL=dispatch-rework-execution-key.js.map