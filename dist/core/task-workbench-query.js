"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTaskAccessReferences = listTaskAccessReferences;
exports.queryTaskWorkbenchPage = queryTaskWorkbenchPage;
const task_store_1 = require("./task-store");
const performance_monitor_1 = require("../system/performance-monitor");
const snapshots = new WeakMap();
// Authorization reads every resource reference, including cross-project mission
// targets, from the authoritative payload. This is not an execution-state cache.
function listTaskAccessReferences() {
    return (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT id,json_object(
    'target_project',target_project,'group_id',group_id,
    'targetProject',json_extract(payload_json,'$.targetProject'),'project',json_extract(payload_json,'$.project'),
    'project_id',json_extract(payload_json,'$.project_id'),'projectId',json_extract(payload_json,'$.projectId'),
    'groupId',json_extract(payload_json,'$.groupId'),'target_group',json_extract(payload_json,'$.target_group'),'targetGroup',json_extract(payload_json,'$.targetGroup'),
    'mission_target',json_extract(payload_json,'$.mission_target'),'missionTarget',json_extract(payload_json,'$.missionTarget'),
    'targets',json_extract(payload_json,'$.targets'),'mission_targets',json_extract(payload_json,'$.mission_targets'),
    'missionTargets',json_extract(payload_json,'$.missionTargets'),'child_targets',json_extract(payload_json,'$.child_targets'),'childTargets',json_extract(payload_json,'$.childTargets')
  ) refs FROM tasks WHERE archived=0 AND json_extract(payload_json,'$.deleted_at') IS NULL`).all().map((row) => ({ id: row.id, ...JSON.parse(row.refs) })));
}
function queryTaskWorkbenchPage(runs, input, accessibleIds, sourceVersion, authorizationKey = '') {
    return (0, performance_monitor_1.measurePerformance)('db.tasks.workbench_page', () => (0, task_store_1.withSqliteTaskStore)(db => {
        db.function('ccm_workbench_lower', { deterministic: true }, (value) => String(value ?? '').toLowerCase());
        const text = (value, fallback = '') => String(value ?? '').trim() || fallback;
        const page = Math.max(1, Math.floor(Number(input.page) || 1)), limit = Math.max(1, Math.min(100, Math.floor(Number(input.limit) || 50)));
        const revision = () => `${db.pragma('data_version', { simple: true })}:${db.prepare('SELECT total_changes() value').get().value}`;
        const access = JSON.stringify([authorizationKey, accessibleIds || null]);
        const previous = snapshots.get(db);
        const reusable = !!sourceVersion && previous?.runs === sourceVersion && previous.access === access
            && previous.version === revision() && Date.now() - previous.at < 5000;
        db.exec(`CREATE TEMP TABLE IF NOT EXISTS ccm_workbench_runs(run_id TEXT PRIMARY KEY,task_id TEXT,status TEXT,updated_at TEXT);
      CREATE INDEX IF NOT EXISTS temp.idx_workbench_run_task ON ccm_workbench_runs(task_id,updated_at DESC)`);
        const insert = db.prepare('INSERT OR IGNORE INTO ccm_workbench_runs VALUES(?,?,?,?)');
        if (!reusable)
            db.transaction(() => {
                db.prepare('DELETE FROM ccm_workbench_runs').run();
                for (const run of runs)
                    insert.run(run.run_id, run.task_id, run.status, run.updated_at);
            })();
        const base = `WITH run_rows AS (
      SELECT task_id,run_id,status,updated_at FROM ccm_workbench_runs
    ), candidates AS (
      SELECT id,payload_json,status,updated_at,created_at,group_id,target_project,
        COALESCE(NULLIF(trim(json_extract(payload_json,'$.active_run_id')),''),NULLIF(trim(json_extract(payload_json,'$.task_run.run_id')),''),json_extract(payload_json,'$.run_id'),'') active_id
      FROM tasks WHERE archived=0 AND json_extract(payload_json,'$.deleted_at') IS NULL
        ${accessibleIds ? 'AND id IN (SELECT value FROM json_each(?))' : ''}
    ), bound AS MATERIALIZED (
      SELECT t.id,t.target_project,t.group_id,
        COALESCE(NULLIF(r.updated_at,''),NULLIF(t.updated_at,''),t.created_at) sort_at,
        CASE WHEN json_extract(payload_json,'$.intake_state')='awaiting_confirmation'
          OR (json_extract(payload_json,'$.task_spec.task_session_archive_policy')='user_confirm' AND json_extract(payload_json,'$.acceptance_state')='awaiting_user_acceptance') THEN 'waiting_user'
        WHEN r.status IS NOT NULL THEN r.status WHEN ccm_workbench_lower(t.status)='done' THEN 'completed' ELSE ccm_workbench_lower(t.status) END projected_status,
        CASE WHEN json_extract(payload_json,'$.approval_policy')='confirm_before_delivery'
          OR json_extract(payload_json,'$.task_spec.approval_policy')='confirm_before_delivery' THEN 1 ELSE 0 END approval_attention,
        ccm_workbench_lower(COALESCE(NULLIF(trim(json_extract(payload_json,'$.task_spec.origin')),''),NULLIF(trim(json_extract(payload_json,'$.origin')),''),NULLIF(trim(json_extract(payload_json,'$.source_channel')),''),json_extract(payload_json,'$.request_origin'),'')) raw_origin,
        COALESCE(NULLIF(trim(json_extract(payload_json,'$.title')),''),NULLIF(trim(json_extract(payload_json,'$.name')),''),NULLIF(trim(json_extract(payload_json,'$.task_spec.goal')),''),NULLIF(trim(json_extract(payload_json,'$.description')),''),'未命名任务') title,
        COALESCE(NULLIF(trim(json_extract(payload_json,'$.task_spec.goal')),''),NULLIF(trim(json_extract(payload_json,'$.description')),''),json_extract(payload_json,'$.title'),'') goal
      FROM candidates t LEFT JOIN run_rows r ON r.run_id=COALESCE(
        (SELECT run_id FROM run_rows WHERE task_id=t.id AND run_id=t.active_id LIMIT 1),
        (SELECT run_id FROM run_rows WHERE task_id=t.id ORDER BY updated_at DESC LIMIT 1))
    ), projected AS (
      SELECT *,CASE WHEN instr(raw_origin,'automation') OR instr(raw_origin,'cron') THEN 'automation'
          WHEN instr(raw_origin,'global') THEN 'global_agent' WHEN instr(raw_origin,'conversation') OR instr(raw_origin,'chat') THEN 'conversation'
          WHEN instr(raw_origin,'workbench') THEN 'workbench' ELSE 'dispatch' END origin
      FROM bound
    ), rows AS MATERIALIZED (
      SELECT id,title,goal,projected_status,origin,target_project,group_id,sort_at,
        CASE WHEN projected_status IN ('failed','blocked','waiting_user','recovery_required')
        OR approval_attention=1 THEN 1 ELSE 0 END needs_attention
      FROM projected WHERE origin<>'automation'
    )`;
        if (sourceVersion && !reusable) {
            db.exec('DROP TABLE IF EXISTS temp.ccm_workbench_rows');
            db.prepare(`CREATE TEMP TABLE ccm_workbench_rows AS ${base} SELECT id,title,goal,projected_status,origin,target_project,group_id,needs_attention,
        sort_at FROM rows`).run(...(accessibleIds ? [JSON.stringify(accessibleIds)] : []));
            db.exec('CREATE INDEX temp.idx_workbench_rows_sort ON ccm_workbench_rows(sort_at DESC,id ASC)');
            snapshots.set(db, { version: revision(), runs: sourceVersion, access, at: Date.now() });
        }
        const args = accessibleIds && !sourceVersion ? [JSON.stringify(accessibleIds)] : [];
        const filters = [];
        const query = text(input.query || input.q).toLowerCase(), view = text(input.view, 'needs_attention');
        if (query) {
            filters.push("instr(ccm_workbench_lower(title||' '||goal||' '||id),?)>0");
            args.push(query);
        }
        for (const [field, value] of [['projected_status', text(input.status).toLowerCase()], ['origin', text(input.origin).toLowerCase()], ['ccm_workbench_lower(target_project)', text(input.project).toLowerCase()], ['group_id', text(input.group_id || input.groupId)]]) {
            if (value) {
                filters.push(`${field}=?`);
                args.push(value);
            }
        }
        if (view === 'running')
            filters.push("projected_status IN ('queued','running','verifying','waiting_user')");
        if (view === 'needs_attention')
            filters.push('needs_attention=1');
        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const accessArguments = accessibleIds && !sourceVersion ? 1 : 0;
        const baseArgs = args.slice(0, accessArguments);
        const filterArgs = args.slice(accessArguments);
        const queryBase = sourceVersion ? 'WITH rows AS (SELECT * FROM ccm_workbench_rows)' : base;
        const order = 'sort_at';
        const result = db.prepare(`${queryBase} SELECT COUNT(*) AS "all",COALESCE(SUM(needs_attention),0) needs_attention,
      COALESCE(SUM(projected_status IN ('queued','running','verifying','waiting_user')),0) running,
      COALESCE(SUM(projected_status='completed'),0) completed,
      (SELECT COUNT(*) FROM rows ${where}) total,
      (SELECT json_group_array(id) FROM (SELECT id FROM rows ${where}
        ORDER BY ${order} DESC,id ASC LIMIT ? OFFSET ?)) ids
      FROM rows`).get(...baseArgs, ...filterArgs, ...filterArgs, limit, (page - 1) * limit);
        const { all, needs_attention, running, completed, total } = result;
        const counts = { all, needs_attention, running, completed };
        const ids = JSON.parse(result.ids);
        return { ids, counts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }));
}
//# sourceMappingURL=task-workbench-query.js.map