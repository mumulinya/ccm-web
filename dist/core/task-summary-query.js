"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTaskWorkbenchCandidates = listTaskWorkbenchCandidates;
const task_store_1 = require("./task-store");
const performance_monitor_1 = require("../system/performance-monitor");
// Query-only projection. Execution/authorization gates keep using the original
// task. Large context ledgers, prompt history, receipts and file contents never
// enter the workbench list's intermediate rows.
function listTaskWorkbenchCandidates() {
    return (0, performance_monitor_1.measurePerformance)('db.tasks.workbench_summary', () => (0, task_store_1.withSqliteTaskStore)(db => {
        const rows = db.prepare(`SELECT id, status, group_id, target_project, created_at, updated_at,
      json_object('id',id,'status',status,'group_id',group_id,'target_project',target_project,'created_at',created_at,'updated_at',updated_at,
        'title',json_extract(payload_json,'$.title'),'name',json_extract(payload_json,'$.name'),
        'description',substr(json_extract(payload_json,'$.description'),1,4000),'scope',json_extract(payload_json,'$.scope'),
        'origin',json_extract(payload_json,'$.origin'),'source_channel',json_extract(payload_json,'$.source_channel'),
        'request_origin',json_extract(payload_json,'$.request_origin'),'intake_state',json_extract(payload_json,'$.intake_state'),
        'acceptance_state',json_extract(payload_json,'$.acceptance_state'),'approval_policy',json_extract(payload_json,'$.approval_policy'),
        'active_run_id',json_extract(payload_json,'$.active_run_id'),'run_id',json_extract(payload_json,'$.run_id'),
        'task_run',json_object('run_id',json_extract(payload_json,'$.task_run.run_id')),
        'automation_definition_id',json_extract(payload_json,'$.automation_definition_id'),
        'source_automation_definition_id',json_extract(payload_json,'$.source_automation_definition_id'),
        'task_spec',json_object('origin',json_extract(payload_json,'$.task_spec.origin'),'scope',json_extract(payload_json,'$.task_spec.scope'),
          'goal',substr(json_extract(payload_json,'$.task_spec.goal'),1,4000),'schema',json_extract(payload_json,'$.task_spec.schema'),
          'revision',json_extract(payload_json,'$.task_spec.revision'),'checksum',json_extract(payload_json,'$.task_spec.checksum'),
          'task_session_creation_policy',json_extract(payload_json,'$.task_spec.task_session_creation_policy'),
          'task_session_archive_policy',json_extract(payload_json,'$.task_spec.task_session_archive_policy'),
          'approval_policy',json_extract(payload_json,'$.task_spec.approval_policy'))
      ) summary FROM tasks WHERE archived=0 AND json_extract(payload_json,'$.deleted_at') IS NULL
      ORDER BY updated_at DESC,id ASC`).all();
        return rows.map(row => JSON.parse(row.summary));
    }));
}
//# sourceMappingURL=task-summary-query.js.map