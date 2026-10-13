"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryHydratedTasks = queryHydratedTasks;
exports.listUnfinishedTasks = listUnfinishedTasks;
exports.listTasksByIds = listTasksByIds;
exports.listAutomationTasks = listAutomationTasks;
exports.listGroupSessionTasks = listGroupSessionTasks;
const task_store_1 = require("./task-store");
const performance_monitor_1 = require("../system/performance-monitor");
function parse(value) { try {
    return JSON.parse(value);
}
catch {
    return null;
} }
function queryHydratedTasks(where = '', values = [], limit) {
    return (0, performance_monitor_1.measurePerformance)('db.tasks.query', () => (0, task_store_1.withSqliteTaskStore)(db => {
        const rows = db.prepare(`SELECT t.payload_json, h.revision, h.checksum, h.active_span_id, h.projection_json
      FROM tasks t LEFT JOIN task_context_heads h ON h.task_id = t.id
      ${where ? `WHERE ${where}` : ''} ORDER BY t.position ASC, t.rowid ASC ${limit ? 'LIMIT ?' : ''}`)
            .all(...values, ...(limit ? [limit] : []));
        return rows.map(row => {
            const task = parse(row.payload_json);
            if (!task || row.revision == null)
                return task;
            const context = parse(row.projection_json);
            return { ...task, ...(context ? { task_context: context } : {}), task_context_revision: Number(row.revision || 0),
                task_context_checksum: String(row.checksum || ''), active_timeline_span_id: String(row.active_span_id || '') };
        }).filter(Boolean);
    }));
}
// Blocked/paused/needs_user records can still contain interrupted execution.
// Keep them as candidates and let the existing recovery policies decide.
function listUnfinishedTasks() {
    return queryHydratedTasks("t.archived = 0 AND t.status NOT IN ('done','completed','failed','cancelled','canceled','archived')");
}
function listTasksByIds(ids) {
    if (!ids.length)
        return [];
    return queryHydratedTasks('t.id IN (SELECT value FROM json_each(?))', [JSON.stringify(ids)]);
}
function listAutomationTasks() {
    return queryHydratedTasks("json_extract(t.payload_json, '$.automation_routine_run_id') IS NOT NULL");
}
function listGroupSessionTasks(groupId, sessionId) {
    return queryHydratedTasks("t.group_id=? AND COALESCE(NULLIF(json_extract(t.payload_json,'$.group_session_id'),''),NULLIF(json_extract(t.payload_json,'$.groupSessionId'),''),'default')=?", [groupId, sessionId]);
}
//# sourceMappingURL=task-query.js.map