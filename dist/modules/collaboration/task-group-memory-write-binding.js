"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskGroupMemoryWriteSession = taskGroupMemoryWriteSession;
const db_1 = require("../../core/db");
const task_group_memory_identity_1 = require("./task-group-memory-identity");
/** Worker results belong to their task's execution session. The currently
 * selected public conversation is not an execution authority. */
function taskGroupMemoryWriteSession(groupId, patch) {
    const explicit = String(patch.groupSessionId || patch.group_session_id || "");
    const worker = patch.workerLedger || patch.workerNotification;
    const taskId = String(worker?.taskId || worker?.task_id || patch.taskId || patch.task_id || "");
    if (!taskId)
        return explicit;
    const task = (0, db_1.getTaskById)(taskId);
    // Old diagnostic ledgers may carry a label instead of a persisted Task ID.
    if (!task)
        return explicit;
    const sessionId = String(task.group_session_id || "");
    if (task.group_id !== groupId || !sessionId || explicit && explicit !== sessionId
        || task.task_session_boundary_version && !(0, task_group_memory_identity_1.isAuthoritativeGroupMemorySession)(groupId, sessionId, taskId)) {
        throw new Error("群聊任务记忆写入身份冲突");
    }
    return sessionId;
}
//# sourceMappingURL=task-group-memory-write-binding.js.map