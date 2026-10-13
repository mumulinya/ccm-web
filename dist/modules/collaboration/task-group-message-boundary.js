"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectPrivateTaskGroupMessage = redirectPrivateTaskGroupMessage;
const db_1 = require("../../core/db");
const task_session_boundary_1 = require("./task-session-boundary");
const task_session_store_1 = require("./task-session-store");
/** Internal execution messages belong to TaskSession, not a new group chat. */
function redirectPrivateTaskGroupMessage(groupId, message) {
    if (!message?.task_id)
        return null;
    const task = (0, db_1.getTaskById)(String(message.task_id));
    if (!task?.task_session_boundary_version || !(0, task_session_boundary_1.isPrivateTaskSessionId)(task.group_session_id))
        return null;
    if (task.group_id !== groupId || task.execution_session_binding_snapshot?.exactSessionId !== task.group_session_id || !(0, task_session_store_1.getTaskSession)(task.id)) {
        throw new Error("群聊内部任务消息绑定尚未完成或归属冲突");
    }
    const saved = (0, task_session_store_1.appendTaskSessionSourceMessage)(task.id, message, { scope: "task_session", task_session_id: (0, task_session_store_1.getTaskSession)(task.id).session_id,
        group_id: groupId, kind: "private_task_execution" });
    return { ...message, id: message.id || saved?.message_id, group_session_id: task.group_session_id, trace_id: task.trace_id };
}
//# sourceMappingURL=task-group-message-boundary.js.map