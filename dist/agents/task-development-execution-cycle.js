"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskDevelopmentExecutionHistory = taskDevelopmentExecutionHistory;
const crypto_1 = require("crypto");
/** A new authorized review cycle keeps the old execution as history. The
 * canonical task execution file continues to serve legacy query APIs. */
function taskDevelopmentExecutionHistory(task, existing) {
    if (!existing || !task?.task_session_continuation_context || !task.review_cycle_id
        || existing.reviewCycleId === task.review_cycle_id)
        return null;
    if (!["succeeded", "failed", "cancelled"].includes(existing.state)) {
        throw Object.assign(new Error("原执行尚未结束，不能创建第二个开发执行"), { code: "TASK_SESSION_ACTIVE_EXECUTION" });
    }
    const checksum = (0, crypto_1.createHash)("sha256").update(JSON.stringify([existing.id, existing.reviewCycleId || "", existing.createdAt])).digest("hex").slice(0, 20);
    return { ...existing, id: `task-cycle-${checksum}`, historicalExecutionId: existing.id };
}
//# sourceMappingURL=task-development-execution-cycle.js.map