"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingTaskForConversation = pendingTaskForConversation;
const db_1 = require("../core/db");
const REVIEWABLE = new Set(["waiting_user", "failed", "blocked", "recovery_required", "interrupted"]);
function pendingTaskForConversation(scope, conversationId) {
    const id = String(conversationId || "");
    const separator = id.indexOf(":");
    if ((scope === "project" || scope === "group") && separator < 1)
        return null;
    const scopeId = scope === "project" || scope === "group" ? id.slice(0, separator) : "";
    const exactSessionId = scopeId ? id.slice(separator + 1) : id;
    if (!exactSessionId)
        return null;
    return (0, db_1.loadTasks)()
        .filter((task) => task?.task_spec?.task_session_archive_policy === "user_confirm"
        && !task?.archived && !task?.deleted_at && !task?.task_session_archive?.decision
        && task?.acceptance_state !== "accepted" && REVIEWABLE.has(String(task?.status || "").toLowerCase()))
        .filter((task) => {
        const source = task?.source_conversation_ref || {};
        if (scope === "project")
            return String(task?.target_project || "") === scopeId
                && String(task?.project_session_id || task?.task_spec?.target?.exact_session_id || "") === exactSessionId;
        if (scope === "group")
            return String(task?.group_id || "") === scopeId
                && String(task?.group_session_id || task?.task_spec?.target?.exact_session_id || "") === exactSessionId;
        return String(source.scope || "") === scope
            && String(source.exactSessionId || task?.origin_session_id || "") === exactSessionId;
    })
        .sort((left, right) => String(right.updated_at || right.created_at || "").localeCompare(String(left.updated_at || left.created_at || "")))[0] || null;
}
//# sourceMappingURL=task-conversation-binding.js.map