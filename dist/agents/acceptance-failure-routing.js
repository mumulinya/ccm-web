"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyAcceptanceFailure = classifyAcceptanceFailure;
const acceptance_user_projection_1 = require("./acceptance-user-projection");
/** Structured observations decide repair eligibility; prose is display only. */
function classifyAcceptanceFailure(input = {}) {
    const report = input.report || input.invocation?.report || {}, verdict = input.verdict || input.invocation?.verdict || report.verdict || {};
    const array = (value) => Array.isArray(value) ? value : [];
    const checks = [...array(input.verification_results || input.quick_check_receipt?.verification_results), ...array(report.commandResults), ...array(report.browserResults), ...array(report.httpResults), ...array(report.devServerResults)];
    const failed = checks.filter((row) => row.status === "failed");
    const failedCriteria = array(verdict.failedAcceptanceCriteria || input.failed_criteria);
    const environment = input.environmentBlocked === true || input.forceEnvironmentSignals === true || verdict.needsEnvironment === true || report.status === "blocked"
        || ["blocked", "timed_out", "timeout"].includes(input.invocation?.status || input.runner?.status || input.status)
        || checks.some((row) => ["blocked", "timed_out"].includes(row.status));
    const permission = input.permissionBlocked === true || input.approvalPending === true || verdict.permissionBlocked === true;
    const criteriaConflict = input.contractConflict === true || verdict.criteriaConflict === true;
    const reconcile = input.deliveryReconciliationRequired === true || input.projectionConflict === true;
    const insufficient = input.forceRecheckSignals === true || verdict.needsRecheck === true || input.evidenceMissing === true || report.status === "partial"
        || [...(report.acceptanceCoverage || []), ...(report.requiredCheckCoverage || [])].some((r) => ["unknown", "unverified"].includes(r.status))
        || array(report.browserProviderGaps || report.browser_provider_gaps).length > 0 || array(verdict.browserProviderGaps || verdict.browser_provider_gaps).length > 0;
    const human = input.forceHumanSignals === true || verdict.needsHuman === true;
    const implementation = input.forceReworkSignals === true || verdict.needsRework === true || verdict.recommendation === "rework" || failed.length > 0 || failedCriteria.length > 0;
    const unspecifiedFailure = input.receiptStatus === "failed" || verdict.status === "failed" || report.status === "failed";
    const passed = !unspecifiedFailure && !human && !permission && !criteriaConflict && !reconcile && !environment && !insufficient && !implementation
        && (verdict.canAccept === true || input.canAccept === true);
    const kind = permission ? "permission" : reconcile ? "reconciliation" : criteriaConflict ? "criteria_conflict"
        : environment ? "environment" : human ? "unknown" : implementation ? "implementation" : insufficient ? "evidence" : passed ? null : "unknown";
    const routes = { permission: "await_authorization", reconciliation: "reconcile", criteria_conflict: "clarify_criteria",
        environment: "prepare_environment", evidence: "supplement_evidence", implementation: "implementation_rework", unknown: "needs_user" };
    return {
        failure_kind: kind,
        failed_criteria: failedCriteria.map((row) => ({ criterion: (0, acceptance_user_projection_1.acceptanceDisplayText)(row.criterion || row.description || row), status: row.status || "unverified" })),
        failed_checks: failed.map((row, index) => ({ check_id: (0, acceptance_user_projection_1.acceptanceDisplayText)(row.checkId || row.id || `check-${index + 1}`), exit_code: row.exit_code ?? row.exitCode ?? null })),
        evidence_refs: [...new Set((input.evidence_refs || report.evidenceIds || []).filter((id) => typeof id === "string"))].slice(0, 100),
        recommended_route: kind ? routes[kind] : "accept",
        can_auto_rework: kind === "implementation",
        review_cycle: typeof input.review_cycle === "string" ? input.review_cycle : input.review_cycle ? {
            id: input.review_cycle.id || input.review_cycle.cycleId, rework_round: input.review_cycle.rework_round,
            rework_max_rounds: input.review_cycle.rework_max_rounds,
        } : null,
    };
}
//# sourceMappingURL=acceptance-failure-routing.js.map