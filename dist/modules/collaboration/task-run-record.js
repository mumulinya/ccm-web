"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRecord = normalizeRecord;
const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
function normalizeRecord(raw) {
    if (!raw || !text(raw.run_id) || !text(raw.task_id) || !text(raw.trace_id))
        return null;
    return {
        schema: "ccm-task-run-record-v1",
        run_id: text(raw.run_id),
        task_id: text(raw.task_id),
        trace_id: text(raw.trace_id),
        spec_revision: Math.max(1, Number(raw.spec_revision || 1)),
        trigger: ["user", "automation", "retry", "resume"].includes(text(raw.trigger)) ? raw.trigger : "user",
        status: ["queued", "running", "verifying", "waiting_user", "blocked", "completed", "failed", "cancelled", "recovery_required"].includes(text(raw.status)) ? raw.status : "recovery_required",
        attempt: Math.max(1, Number(raw.attempt || 1)),
        parent_run_id: text(raw.parent_run_id),
        created_at: text(raw.created_at, new Date().toISOString()),
        updated_at: text(raw.updated_at, raw.created_at || new Date().toISOString()),
        queue_lane: text(raw.queue_lane),
        lease: raw.lease && typeof raw.lease === "object" ? raw.lease : null,
        execution_evidence: Array.isArray(raw.execution_evidence) ? raw.execution_evidence : [],
        verification_result: raw.verification_result ?? null,
        delivery_result: raw.delivery_result ?? null,
        task_spec_checksum: text(raw.task_spec_checksum),
        ...(text(raw.automation_definition_id) ? { automation_definition_id: text(raw.automation_definition_id) } : {}),
        ...(Number(raw.automation_definition_revision || 0) > 0 ? { automation_definition_revision: Number(raw.automation_definition_revision) } : {}),
        history: Array.isArray(raw.history) ? raw.history.slice(-50) : [],
    };
}
//# sourceMappingURL=task-run-record.js.map