"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supervisorCandidatePage = supervisorCandidatePage;
const task_store_1 = require("../core/task-store");
function supervisorCandidatePage(after = '') {
    return (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT run_id FROM agent_runs
    WHERE status IN ('created','queued','leased','starting','running','waiting_confirmation','waiting_input','paused','recovery_required')
      AND run_id > ? ORDER BY run_id LIMIT 100`).all(after).map(row => String(row.run_id)));
}
//# sourceMappingURL=agent-supervisor-candidates.js.map