"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveTaskSourceDiscussion = saveTaskSourceDiscussion;
exports.saveTaskSourceDiscussionResult = saveTaskSourceDiscussionResult;
const db_1 = require("../../core/db");
const task_session_store_1 = require("./task-session-store");
const project_session_compaction_1 = require("../projects/project-session-compaction");
const conversation_message_route_store_1 = require("../../agents/conversation-message-route-store");
/** Persist only the relation confirmed by this message's backend model decision. */
function saveTaskSourceDiscussion(input) {
    const taskId = input.route?.discussionTaskId;
    if (!taskId || input.newTopic || !input.messageId)
        return;
    const task = (0, db_1.getTaskById)(String(taskId));
    if (!task || !(0, task_session_store_1.getTaskSession)(task.id))
        return;
    const source = task.source_conversation_ref;
    if (task.task_session_boundary_version && (source?.scope !== input.scope
        || String(source.exactSessionId) !== input.sessionId
        || input.scope !== "global" && String(source.scopeId) !== input.scopeId))
        throw new Error("任务讨论来源身份不一致");
    (0, task_session_store_1.materializeTaskSession)(task);
    const provenance = { scope: input.scope, scope_id: input.scopeId, exact_session_id: input.sessionId, kind: "confirmed_read_only_discussion" };
    (0, task_session_store_1.appendTaskSessionSourceMessage)(task.id, { id: input.messageId, role: "user", content: input.message, attachments: input.attachments, timestamp: input.timestamp }, provenance);
    if (input.reply && input.replyId)
        (0, task_session_store_1.appendTaskSessionSourceMessage)(task.id, { id: input.replyId, role: "assistant", content: input.reply }, provenance);
    if (input.scope === "project" && input.assistantMessageId) {
        const answer = (0, project_session_compaction_1.listProjectSessionHistoryMessages)(input.scopeId, input.sessionId).find(row => row.id === input.assistantMessageId);
        if (answer?.content)
            (0, task_session_store_1.appendTaskSessionSourceMessage)(task.id, answer, provenance);
    }
}
function saveTaskSourceDiscussionResult(input) {
    const record = (0, conversation_message_route_store_1.readConversationMessageRoute)({ scope: input.routeScope || input.scope, scopeId: input.scope === "global" ? "" : input.scopeId,
        exactSessionId: input.sessionId, messageId: input.messageId, message: input.message });
    if (record?.route)
        saveTaskSourceDiscussion({ ...input, route: record.route });
}
//# sourceMappingURL=task-session-source-discussion.js.map