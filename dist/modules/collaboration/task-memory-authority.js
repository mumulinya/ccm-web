"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskOwnsGroupMemory = taskOwnsGroupMemory;
const db_1 = require("../../core/db");
const task_session_store_1 = require("./task-session-store");
const task_session_boundary_1 = require("./task-session-boundary");
const task_group_memory_identity_1 = require("./task-group-memory-identity");
/** A task can retain its memory after its source chat is removed. Public chat
 * admission still requires a live chat unless this exact continuation is bound. */
function taskOwnsGroupMemory(identity) {
    const task = (0, db_1.getTaskById)(String(identity.taskId || ""));
    const archive = task && (0, task_session_store_1.getTaskSession)(task.id);
    const binding = task?.execution_session_binding_snapshot;
    if (!archive || task?.task_session_boundary_version !== 1 || task.group_id !== identity.groupId
        || binding?.scope !== "group" || binding.scopeId !== identity.groupId || binding.exactSessionId !== identity.groupSessionId)
        return false;
    const sessions = require("../../tasks/agent-sessions").listTaskAgentSessions({ taskId: task.id });
    if (!sessions.some((row) => row.id === identity.taskAgentSessionId && row.taskId === task.id && row.project === identity.project))
        return false;
    return (0, task_session_boundary_1.isPrivateTaskSessionId)(identity.groupSessionId)
        ? (0, task_group_memory_identity_1.isAuthoritativeGroupMemorySession)(identity.groupId, identity.groupSessionId, task.id)
        : task.task_session_continuation_context?.session_id === archive.session_id;
}
//# sourceMappingURL=task-memory-authority.js.map