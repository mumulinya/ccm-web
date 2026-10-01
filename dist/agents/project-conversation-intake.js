"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistProjectConversationIntake = persistProjectConversationIntake;
/** Called once, before a newly admitted HTTP turn becomes runnable. */
function persistProjectConversationIntake(turn, editing = false) {
    if (turn.scope !== 'project' || turn.source !== 'web' || turn.kind !== 'user_message')
        return;
    const project = String(turn.metadata?.project || turn.conversation_id.split(':')[0] || '');
    const sessionId = String(turn.metadata?.session_id || turn.conversation_id.slice(project.length + 1) || '');
    if (!project || !sessionId || turn.conversation_id !== `${project}:${sessionId}`) {
        throw new Error('项目消息与目标会话不匹配');
    }
    // Resolve lazily: sessions also uses the turn controller for cancellation.
    const sessions = require('../modules/projects/sessions');
    const id = String(turn.metadata?.original_message_id || turn.request_id);
    if (editing) {
        const { listProjectSessionHistoryMessages } = require('../modules/projects/project-session-compaction');
        const message = listProjectSessionHistoryMessages(project, sessionId).find((row) => row.id === id);
        if (!message || message.role !== 'user')
            throw new Error('原用户消息不存在，不能编辑或重新创建');
    }
    const persist = editing ? sessions.upsertProjectSessionTaskMessage : sessions.appendProjectSessionTaskMessage;
    persist(project, sessionId, {
        id,
        role: 'user', content: turn.message, files: turn.attachments,
        timestamp: turn.created_at, conversation_turn_id: turn.id,
        ...(turn.task_id ? { task_id: turn.task_id } : {}),
        source: 'web',
    });
}
//# sourceMappingURL=project-conversation-intake.js.map