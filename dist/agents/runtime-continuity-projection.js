"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRuntimeContinuity = projectRuntimeContinuity;
exports.readRuntimeContinuity = readRuntimeContinuity;
const task_store_1 = require("../core/task-store");
const acceptance_user_projection_1 = require("./acceptance-user-projection");
/** Inspection and actual Provider observation are independent evidence levels. */
function projectRuntimeContinuity(run, events = []) {
    const check = [...events].reverse().find(e => e.eventType === "runtime.resume_inspected");
    const observed = [...events].reverse().find(e => e.eventType === "runtime.continuity_observed");
    return { session_saved: !!run?.nativeSessionId, inspection: check ? check.payload.resumable ? "passed" : "failed" : "unknown",
        reuse: ["reused", "fresh_session", "unverified"].includes(observed?.payload?.reuse) ? observed.payload.reuse : "unverified", reason: (0, acceptance_user_projection_1.acceptanceDisplayText)(observed?.payload?.reason || check?.payload?.reason),
        evidence_refs: [check?.eventId, observed?.eventId].filter(Boolean) };
}
function readRuntimeContinuity(run) {
    if (!run)
        return projectRuntimeContinuity(null);
    const rows = (0, task_store_1.withSqliteTaskStore)(db => db.prepare("SELECT event_id, event_type, payload_json FROM agent_run_events WHERE run_id=? AND event_type IN ('runtime.resume_inspected','runtime.continuity_observed') ORDER BY sequence DESC LIMIT 20").all(run.runId));
    return projectRuntimeContinuity(run, rows.reverse().map(row => ({ eventId: row.event_id, eventType: row.event_type, payload: JSON.parse(row.payload_json || "{}") })));
}
//# sourceMappingURL=runtime-continuity-projection.js.map