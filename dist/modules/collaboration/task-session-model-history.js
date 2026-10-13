"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectTaskSessionModelHistory = projectTaskSessionModelHistory;
const crypto_1 = require("crypto");
/** Bound only the model projection. Original task records remain queryable,
 * including large receipts and every revision of the related messages. */
function projectTaskSessionModelHistory(messages, maxCharacters = 24000) {
    const budget = Math.max(4000, maxCharacters);
    if (JSON.stringify(messages).length <= budget)
        return { messages, state: {
                complete: true, archived_message_count: messages.length, projected_message_count: messages.length,
                omitted_message_count: 0, truncated_message_count: 0,
            } };
    const selected = new Map();
    let used = 2;
    const add = (index) => {
        const row = messages[index];
        const content = String(row.content || "");
        const clipped = content.slice(0, index === 0 ? 6000 : 2400);
        const attachments = (row.attachments || []).slice(0, 16).map((item) => ({
            attachment_ref: item.attachment_ref, name: String(item.name || "").slice(0, 240), status: item.status,
        }));
        const candidate = { id: row.id || row.message_id, message_id: row.message_id, role: row.role,
            content: clipped, created_at: row.created_at, task_id: row.task_id,
            ...(attachments.length ? { attachments } : {}),
            history_projection: { content_complete: clipped.length === content.length,
                original_characters: content.length, attachments_complete: attachments.length === (row.attachments || []).length } };
        const size = JSON.stringify(candidate).length + 1;
        if (used + size > budget)
            return false;
        selected.set(index, candidate);
        used += size;
        return true;
    };
    if (messages.length)
        add(0);
    for (let index = messages.length - 1; index > 0; index--)
        if (!add(index))
            break;
    const projected = [...selected].sort(([a], [b]) => a - b).map(([, row]) => row);
    return { messages: projected, state: { complete: false, archived_message_count: messages.length,
            projected_message_count: projected.length, omitted_message_count: messages.length - projected.length,
            truncated_message_count: projected.filter(row => !row.history_projection.content_complete).length,
            archive_checksum: (0, crypto_1.createHash)("sha256").update(JSON.stringify(messages)).digest("hex"),
        } };
}
//# sourceMappingURL=task-session-model-history.js.map