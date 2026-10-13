"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDispatchSelfReview = runDispatchSelfReview;
const db_1 = require("../../core/db");
const dispatch_rework_reservation_1 = require("./dispatch-rework-reservation");
const dispatch_rework_evidence_1 = require("./dispatch-rework-evidence");
const acceptance_failure_routing_1 = require("../../agents/acceptance-failure-routing");
/** Initial verification is free. Only a new development dispatch consumes the
 * shared persisted repair quota. Model/permission/environment faults do not ask
 * the developer to modify code blindly. */
async function runDispatchSelfReview(input) {
    let review = await input.verify();
    while (review?.canAccept !== true) {
        const feedback = (0, acceptance_failure_routing_1.classifyAcceptanceFailure)(review);
        if (!feedback.can_auto_rework)
            return { ...review, acceptance_feedback: feedback };
        const results = review?.verification_results || review?.quick_check_receipt?.verification_results || [];
        if (!results.length || results.some((row) => ["blocked", "timed_out"].includes(row.status)))
            return review;
        const failed = results.filter((row) => row.status === "failed");
        if (!failed.length)
            return review;
        const task = (0, db_1.loadTasks)().find(row => row.id === input.taskId);
        if (!task?.dispatch_profile_snapshot || ["cancelled", "done", "completed"].includes(task.status) || task.is_paused || task.paused)
            return review;
        const gaps = failed.map((row) => `command:${row.command};exit:${row.exit_code ?? "unknown"}`);
        const evidence = (0, dispatch_rework_evidence_1.captureDispatchReworkEvidenceSync)(task, input.workspacePath);
        const reservation = (0, dispatch_rework_reservation_1.reservePersistentAutomaticRework)(input.taskId, gaps, evidence);
        if (!reservation.allowed)
            return review;
        await input.repair(Number(reservation.task.rework_round), gaps);
        review = await input.verify();
    }
    return review;
}
//# sourceMappingURL=dispatch-self-review.js.map