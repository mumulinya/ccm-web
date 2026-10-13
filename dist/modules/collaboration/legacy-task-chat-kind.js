"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyAutomaticGroupSessionIds = legacyAutomaticGroupSessionIds;
const task_store_1 = require("../../core/task-store");
/** Legacy binding evidence may classify an untyped chat; task presence alone cannot. */
function legacyAutomaticGroupSessionIds(groupId) {
    const rows = (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`
    SELECT json_extract(payload_json, '$.group_session_id') AS session_id
    FROM tasks
    WHERE group_id = ?
      AND COALESCE(json_extract(payload_json, '$.task_session_boundary_version'), 0) = 0
      AND json_extract(payload_json, '$.automation_session_binding_snapshot') IS NOT NULL
  `).all(groupId));
    return new Set(rows.map(row => String(row.session_id || "")).filter(Boolean));
}
//# sourceMappingURL=legacy-task-chat-kind.js.map