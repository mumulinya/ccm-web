"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTaskGlobalHistoryMessages = normalizeTaskGlobalHistoryMessages;
exports.resolveTaskGlobalNotificationSession = resolveTaskGlobalNotificationSession;
const crypto_1 = require("crypto");
const credential_store_1 = require("../../core/credential-store");
/** A task notification cannot erase the identity, attachments or unrelated
 * messages of the source conversation. UI/model windows are separate reads. */
function normalizeTaskGlobalHistoryMessages(messages = []) {
    const occurrences = new Map();
    return messages.filter(item => item && ["user", "assistant"].includes(String(item.role || ""))
        && (String(item.content || "").trim() || item.attachments?.length || item.files?.length))
        .map(item => {
        const seed = JSON.stringify([item.role, item.content, item.timestamp || item.created_at || ""]);
        const occurrence = occurrences.get(seed) || 0;
        occurrences.set(seed, occurrence + 1);
        const id = String(item.id || item.message_id || `legacy-global:${(0, crypto_1.createHash)("sha256").update(`${seed}:${occurrence}`).digest("hex").slice(0, 24)}`);
        return { ...item, id, role: String(item.role), content: (0, credential_store_1.redactSensitiveText)(String(item.content)),
            timestamp: item.timestamp || item.created_at || "" };
    });
}
/** A late result may update an existing source, but must not recreate a
 * source conversation the user deleted. Old records retain their policy. */
function resolveTaskGlobalNotificationSession(task, sessions, sessionId) {
    const existing = sessions.find(item => item.id === sessionId);
    if (existing)
        return existing;
    if (task.task_session_boundary_version) {
        task.workflow_meta = { ...(task.workflow_meta || {}), global_direct_dispatch: {
                ...(task.workflow_meta?.global_direct_dispatch || {}),
                history_sync_state: { status: "source_unavailable", reason: "source_session_missing", archive_retained: true },
            } };
        return null;
    }
    const session = { id: sessionId, name: "全局 Agent 会话", source: "web", createdAt: new Date().toISOString(), messages: [] };
    sessions.unshift(session);
    return session;
}
//# sourceMappingURL=task-global-history-messages.js.map