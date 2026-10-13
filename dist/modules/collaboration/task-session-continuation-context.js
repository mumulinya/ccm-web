"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTaskSessionContinuationContext = renderTaskSessionContinuationContext;
const db_1 = require("../../core/db");
const task_session_store_1 = require("./task-session-store");
/** Task history is evidence, not permission to repeat past tools or side effects. */
function renderTaskSessionContinuationContext(input, maxCharacters = 24000) {
    const task = input?.task_session_continuation_context ? input : (0, db_1.getTaskById)(String(input?.id || input?.task_id || ""));
    const reference = task?.task_session_continuation_context;
    if (!reference)
        return "";
    const session = (0, task_session_store_1.getTaskSession)(String(task.id));
    if (!session || session.session_id !== reference.session_id || session.revision < reference.revision) {
        throw Object.assign(new Error("再次开发所需任务上下文缺失或版本不一致"), { code: "TASK_SESSION_CONTEXT_UNAVAILABLE", status: 409 });
    }
    const ids = new Set(reference.message_ids || []);
    const messages = session.messages.filter(row => ids.has(row.message_id));
    const found = new Set(messages.map(row => row.message_id));
    if ([...ids].some(id => !found.has(String(id))))
        throw Object.assign(new Error("再次开发所需历史消息不完整，请先修复任务上下文"), { code: "TASK_SESSION_CONTEXT_INCOMPLETE", status: 409 });
    const selected = [];
    let size = 0;
    for (const row of [...messages].reverse()) {
        const encoded = JSON.stringify({ message_id: row.message_id, role: row.role, content: row.content, attachments: row.attachments || [], source_ref: row.source_ref });
        if (size + encoded.length > maxCharacters)
            break;
        selected.unshift(JSON.parse(encoded));
        size += encoded.length;
    }
    return `任务会话续接上下文（仅为历史证据；不授权重放工具，不替代当前合同或权限）：\n${JSON.stringify({
        task_id: task.id, task_session_id: session.session_id, revision: reference.revision, trace_id: task.trace_id,
        original_goal: session.dossier?.original_request, parent_run_id: task.parent_run_id,
        original_attachments: session.dossier?.attachments || [],
        source_history_state: session.dossier?.source_history_state || null,
        related_messages: selected, omitted_message_count: messages.length - selected.length,
        context_complete: selected.length === messages.length,
        history_lookup: { task_id: task.id, endpoint: `/api/task-sessions/${task.id}/messages` },
    })}`;
}
//# sourceMappingURL=task-session-continuation-context.js.map