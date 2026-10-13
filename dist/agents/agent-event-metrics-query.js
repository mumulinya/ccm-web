"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAgentEventDiagnostics = queryAgentEventDiagnostics;
const task_store_1 = require("../core/task-store");
const performance_monitor_1 = require("../system/performance-monitor");
// Aggregate in SQLite; never materialize/parse the entire event ledger in JS.
function queryAgentEventDiagnostics(where, values) {
    return (0, performance_monitor_1.measurePerformance)('db.events.aggregate', () => (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`
    WITH reasons AS (SELECT lower(e.event_type || ' ' || COALESCE(e.payload_json,'') || ' ' || COALESCE(r.error_json,'')) reason
      FROM agent_run_events e JOIN agent_runs r ON r.run_id=e.run_id ${where})
    SELECT COALESCE(SUM(instr(reason,'runtime_version_incompatible')>0),0) runtimeVersionIncompatible,
      COALESCE(SUM(instr(reason,'native_session_invalid')>0 OR instr(reason,'native_session_missing')>0),0) nativeSessionInvalid,
      COALESCE(SUM(instr(reason,'workspace')>0 AND (instr(reason,'drift')>0 OR instr(reason,'invalid')>0 OR instr(reason,'missing')>0 OR instr(reason,'changed')>0)),0) workspaceEvidenceFailed
    FROM reasons`).get(...values)));
}
//# sourceMappingURL=agent-event-metrics-query.js.map