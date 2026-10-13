"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startupTaskCandidates = startupTaskCandidates;
exports.backfillStartupTaskTraces = backfillStartupTaskTraces;
const task_query_1 = require("../../core/task-query");
const db_1 = require("../../core/db");
const reliability_ledger_1 = require("../../system/reliability-ledger");
// Failed/cancelled records can still contain a recoverable checkpoint. The
// recovery decision service, rather than this query, decides whether to run.
function startupTaskCandidates() {
    return (0, task_query_1.queryHydratedTasks)("t.archived=0 AND t.status NOT IN ('done','completed','success','succeeded','archived')");
}
function backfillStartupTaskTraces() {
    let changed = 0;
    for (const candidate of startupTaskCandidates()) {
        if (candidate.trace_id)
            continue;
        const task = (0, db_1.getTaskById)(candidate.id);
        if (!task || task.trace_id)
            continue;
        const traceId = (0, reliability_ledger_1.createTraceId)('task');
        (0, db_1.updateTaskById)(task.id, { trace_id: traceId, updated_at: task.updated_at || new Date().toISOString() });
        (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `task:${task.id}:trace-backfill`, type: 'task.trace_backfilled', status: 'info',
            task_id: task.id, group_id: task.group_id || '', agent: task.target_project || '', message: '历史任务已补齐统一 Trace ID',
            data: { original_created_at: task.created_at || '' } });
        changed++;
    }
    return changed;
}
//# sourceMappingURL=task-startup-candidates.js.map