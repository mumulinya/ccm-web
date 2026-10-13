"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSessionOpeningState = taskSessionOpeningState;
exports.isPrivateTaskSessionId = isPrivateTaskSessionId;
exports.assertTaskSessionOpen = assertTaskSessionOpen;
const task_workflow_model_1 = require("./task-workflow-model");
/** Internal materialization and user-visible opening are separate lifecycles. */
function taskSessionOpeningState(task) {
    if (Number(task?.task_session_boundary_version || 0) < 1)
        return { open: true, reason: "legacy_policy" };
    const origin = (0, task_workflow_model_1.normalizeTaskOrigin)(task);
    if (!["conversation", "global_agent"].includes(origin))
        return { open: true, reason: "task_entry" };
    // Once opened, another development cycle must not hide the same conversation.
    if (task?.task_session_opened_at)
        return { open: true, reason: "previously_opened" };
    if (task?.task_spec?.task_session_archive_policy === "auto_terminal")
        return { open: ["done", "completed", "success", "failed", "blocked", "cancelled", "interrupted", "recovery_required"].includes(String(task.status)), reason: "auto_terminal" };
    if (task?.acceptance_state === "accepted" && task?.acceptance_decision?.actor === "user" && task?.acceptance_decision?.status === "approved")
        return { open: true, reason: "user_accepted" };
    if (task?.task_session_archive?.decision === "close_unfinished")
        return { open: true, reason: "user_closed_unfinished" };
    return { open: false, reason: "awaiting_user_acceptance" };
}
function isPrivateTaskSessionId(value) {
    return /^(?:internal-task-session:|task-intake:|task_session_)/.test(String(value || ""));
}
function assertTaskSessionOpen(task) {
    const state = taskSessionOpeningState(task);
    if (!state.open)
        throw Object.assign(new Error("任务会话将在确认完成或关闭未完成任务后开放；当前进展请在来源聊天查看"), { code: "TASK_SESSION_NOT_OPEN", status: 409 });
}
//# sourceMappingURL=task-session-boundary.js.map