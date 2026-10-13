"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureActiveRunIdentityIndex = ensureActiveRunIdentityIndex;
const activeRunIndex = `CREATE UNIQUE INDEX uq_agent_runs_active_identity
  ON agent_runs(agent_id, scope_id, task_id)
  WHERE status NOT IN ('succeeded', 'failed', 'cancelled', 'recovery_required')`;
const canonical = (sql) => sql.replace(/\s+/g, ' ').trim().toLowerCase();
function ensureActiveRunIdentityIndex(db) {
    const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='uq_agent_runs_active_identity'").get();
    if (canonical(existing?.sql || '') === canonical(activeRunIndex))
        return;
    // Replace an obsolete definition once, atomically. Other readers/workers
    // opening the same store must not drop/rebuild an already current index.
    db.transaction(() => {
        const latest = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='uq_agent_runs_active_identity'").get();
        if (canonical(latest?.sql || '') === canonical(activeRunIndex))
            return;
        db.exec('DROP INDEX IF EXISTS uq_agent_runs_active_identity');
        db.exec(activeRunIndex);
    }).immediate();
}
//# sourceMappingURL=task-store-index-maintenance.js.map