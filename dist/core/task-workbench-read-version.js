"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskWorkbenchReadVersion = taskWorkbenchReadVersion;
const prepared = new WeakSet();
const key = 'task_workbench_read_revision_v1';
/** A committed Task change invalidates read projections, including writes from
 * other SQLite connections. Unrelated metrics/auth writes do not change it. */
function taskWorkbenchReadVersion(db) {
    if (!prepared.has(db)) {
        db.prepare("INSERT OR IGNORE INTO app_meta(key,value_json,updated_at) VALUES(?,'0',strftime('%Y-%m-%dT%H:%M:%fZ','now'))").run(key);
        for (const operation of ['INSERT', 'UPDATE', 'DELETE']) {
            db.exec(`CREATE TRIGGER IF NOT EXISTS ccm_workbench_task_${operation.toLowerCase()} AFTER ${operation} ON tasks BEGIN
        INSERT INTO app_meta(key,value_json,updated_at) VALUES('${key}','1',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        ON CONFLICT(key) DO UPDATE SET value_json=CAST(CAST(value_json AS INTEGER)+1 AS TEXT),updated_at=excluded.updated_at;
      END`);
        }
        prepared.add(db);
    }
    return String(db.prepare('SELECT value_json FROM app_meta WHERE key=?').get(key).value_json);
}
//# sourceMappingURL=task-workbench-read-version.js.map