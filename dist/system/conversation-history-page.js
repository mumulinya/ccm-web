"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationHistoryPage = conversationHistoryPage;
exports.projectGlobalHistoryPage = projectGlobalHistoryPage;
const crypto_1 = require("crypto");
const hash = (value) => (0, crypto_1.createHash)('sha256').update(value).digest('hex');
function identity(message) {
    return String(message?.id || message?.message_id || message?.messageId || '')
        || hash(JSON.stringify([message?.role, message?.timestamp || message?.created_at, message?.content]));
}
// Cursor is anchored to a persisted message, so new tail messages do not move
// older pages. It contains neither message text nor a user/session identity.
function conversationHistoryPage(messages, scope, query = {}) {
    const limit = Math.max(1, Math.min(200, Number.parseInt(String(query.limit || 50), 10) || 50));
    const cursor = String(query.before || '');
    const key = (message) => hash(`${scope}\0${identity(message)}`);
    let end = messages.length;
    if (cursor) {
        if (!/^[a-f0-9]{64}$/.test(cursor))
            throw Object.assign(new Error('历史游标无效'), { code: 'HISTORY_CURSOR_INVALID', status: 409 });
        end = messages.findIndex(message => key(message) === cursor);
        if (end < 0)
            throw Object.assign(new Error('历史已变更，请刷新后重新加载'), { code: 'HISTORY_CURSOR_STALE', status: 409 });
    }
    const start = Math.max(0, end - limit);
    const items = messages.slice(start, end);
    return { items, pagination: { limit, total: messages.length, start, end, has_more: start > 0,
            next_before: start > 0 && items.length ? key(items[0]) : '' } };
}
function projectGlobalHistoryPage(store, query = {}) {
    const selected = String(query.session_id || store.current_session_id || '');
    return { ...store, sessions: (store.sessions || []).map((session) => {
            const page = conversationHistoryPage(session.messages || [], `global:${session.id}`, {
                limit: query.limit, before: session.id === selected ? query.before : ''
            });
            return { ...session, messages: page.items, history_pagination: page.pagination };
        }) };
}
//# sourceMappingURL=conversation-history-page.js.map