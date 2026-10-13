"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStartupConsistency = reconcileStartupConsistency;
const task_store_1 = require("../core/task-store");
const agent_run_consistency_1 = require("./agent-run-consistency");
const cooperative_batch_1 = require("../system/cooperative-batch");
async function reconcileStartupConsistency() {
    // Include terminal Tasks with active Runs: excluding them would hide a
    // completed Task / running Runtime conflict after an interrupted commit.
    const ids = (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT t.id FROM tasks t
    WHERE (t.archived = 0 AND t.status NOT IN ('done','completed','failed','cancelled','canceled','archived'))
      OR EXISTS (SELECT 1 FROM agent_runs r WHERE r.task_id=t.id AND r.status NOT IN ('succeeded','failed','cancelled'))
      OR EXISTS (SELECT 1 FROM agent_wake_requests w WHERE w.task_id=t.id AND w.status IN ('queued','claimed','coalesced'))
      OR EXISTS (SELECT 1 FROM agent_runs r WHERE r.task_id=t.id AND r.status IN ('failed','cancelled')
        AND t.status IN ('done','completed','success','succeeded')
        AND (r.run_id=COALESCE(json_extract(t.payload_json,'$.active_run_id'),json_extract(t.payload_json,'$.agent_run_id'),json_extract(t.payload_json,'$.run_id'),json_extract(t.payload_json,'$.project_main_run_id'))
          OR (json_extract(t.payload_json,'$.active_run_id') IS NULL AND r.run_id=(SELECT r2.run_id FROM agent_runs r2 WHERE r2.task_id=t.id ORDER BY r2.created_at DESC LIMIT 1))))
      OR EXISTS (SELECT 1 FROM agent_wake_requests w JOIN agent_runs r ON r.run_id=COALESCE(NULLIF(w.run_id,''),w.coalesced_run_id)
        WHERE w.task_id=t.id AND w.status='failed' AND r.status NOT IN ('failed','cancelled','recovery_required'))`).all());
    const summary = { checked: 0, consistent: 0, repairable: 0, blocked: 0, repaired: 0 };
    await (0, cooperative_batch_1.forEachCooperatively)(ids, row => {
        const task = (0, task_store_1.getTaskByIdFromSqlite)(row.id);
        if (!task)
            return;
        const result = (0, agent_run_consistency_1.reconcileTaskAgentRunConsistency)([task], { appendEvents: true });
        for (const key of Object.keys(summary))
            summary[key] += result[key] || 0;
    });
    return summary;
}
//# sourceMappingURL=agent-consistency-recovery.js.map