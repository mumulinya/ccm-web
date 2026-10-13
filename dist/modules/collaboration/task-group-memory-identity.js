"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthoritativeGroupMemorySession = isAuthoritativeGroupMemorySession;
const task_store_1 = require("../../core/task-store");
const task_session_boundary_1 = require("./task-session-boundary");
/** Task-owned memory is admitted by authority, never by an invented chat ID. */
function isAuthoritativeGroupMemorySession(groupId, sessionId, expectedTaskId = "") {
    if (!groupId)
        return false;
    if (String(sessionId || "").startsWith("gcs_"))
        return true;
    if (!(0, task_session_boundary_1.isPrivateTaskSessionId)(sessionId))
        return false;
    const rows = (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT payload_json FROM tasks
    WHERE group_id = ? AND json_extract(payload_json, '$.group_session_id') = ? LIMIT 2`).all(groupId, sessionId));
    if (rows.length !== 1)
        return false;
    const task = JSON.parse(rows[0].payload_json);
    if (expectedTaskId && task.id !== expectedTaskId)
        return false;
    const binding = task.execution_session_binding_snapshot;
    return task.task_session_boundary_version === 1 && binding?.scope === "group" && binding.scopeId === groupId
        && binding.exactSessionId === sessionId && !!require("./task-session-store").getTaskSession(task.id);
}
//# sourceMappingURL=task-group-memory-identity.js.map