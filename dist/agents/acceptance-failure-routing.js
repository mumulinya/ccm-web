"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyAcceptanceFailure = classifyAcceptanceFailure;
const acceptance_user_projection_1 = require("./acceptance-user-projection");
/** Structured observations decide repair eligibility; prose is display only. */
function classifyAcceptanceFailure(input = {}) {
    const report = input.report || input.invocation?.report || {}, verdict = input.verdict || input.invocation?.verdict || report.verdict || {};
    const array = (value) => Array.isArray(value) ? value : [];
    const checks = [...array(input.verification_results || input.quick_check_receipt?.verification_results), ...array(report.commandResults), ...array(report.browserResults), ...array(report.httpResults), ...array(report.devServerResults), ...array(report.metadata?.environmentPreflight).flatMap((row) => array(row.failures))];
    const failed = checks.filter((row) => row.status === "failed");
    const validKinds = new Set(["implementation", "environment", "permission", "criteria_conflict", "evidence", "reconciliation", "unknown"]);
    const observed = checks.filter((row) => validKinds.has(row.failure_kind));
    const unclassifiedFailure = failed.some((row) => !validKinds.has(row.failure_kind));
    const hasKind = (kind) => observed.some((row) => row.failure_kind === kind);
    const failedCriteria = array(verdict.failedAcceptanceCriteria || input.failed_criteria || report.acceptanceCoverage?.filter((row) => ["failed", "blocked", "unverified", "unknown"].includes(row.status)));
    const environment = hasKind("environment") || input.environmentBlocked === true || input.forceEnvironmentSignals === true || verdict.needsEnvironment === true || (!observed.length && report.status === "blocked")
        || ["blocked", "timed_out", "timeout"].includes(input.invocation?.status || input.runner?.status || input.status)
        || checks.some((row) => !row.failure_kind && ["blocked", "timed_out"].includes(row.status));
    const permission = hasKind("permission") || input.permissionBlocked === true || input.approvalPending === true || verdict.permissionBlocked === true;
    const criteriaConflict = hasKind("criteria_conflict") || input.contractConflict === true || verdict.criteriaConflict === true;
    const reconcile = hasKind("reconciliation") || input.deliveryReconciliationRequired === true || input.projectionConflict === true;
    const insufficient = hasKind("evidence") || input.forceRecheckSignals === true || verdict.needsRecheck === true || input.evidenceMissing === true || report.status === "partial"
        || [...(report.acceptanceCoverage || []), ...(report.requiredCheckCoverage || [])].some((r) => ["unknown", "unverified"].includes(r.status))
        || array(report.browserProviderGaps || report.browser_provider_gaps).length > 0 || array(verdict.browserProviderGaps || verdict.browser_provider_gaps).length > 0;
    const human = input.forceHumanSignals === true || verdict.needsHuman === true && !observed.length && !insufficient;
    // A verdict generated from an environmental failure cannot override the executor.
    const implementation = hasKind("implementation") || (!observed.length && !unclassifiedFailure && (input.forceReworkSignals === true || verdict.needsRework === true || verdict.recommendation === "rework" || array(verdict.failedAcceptanceCriteria || input.failed_criteria).length > 0));
    const unspecifiedFailure = input.receiptStatus === "failed" || verdict.status === "failed" || report.status === "failed";
    const passed = !unspecifiedFailure && !unclassifiedFailure && !human && !permission && !criteriaConflict && !reconcile && !environment && !insufficient && !implementation
        && (verdict.canAccept === true || input.canAccept === true);
    const kind = permission ? "permission" : reconcile ? "reconciliation" : criteriaConflict ? "criteria_conflict"
        : environment ? "environment" : human || unclassifiedFailure ? "unknown" : hasKind("unknown") ? "unknown" : insufficient ? "evidence" : implementation ? "implementation" : passed ? null : "unknown";
    const routes = { permission: "await_authorization", reconciliation: "reconcile", criteria_conflict: "clarify_criteria",
        environment: "prepare_environment", evidence: "supplement_evidence", implementation: "implementation_rework", unknown: "needs_user" };
    return {
        failure_kind: kind,
        failure_kinds: [...new Set([...(permission ? ["permission"] : []), ...(reconcile ? ["reconciliation"] : []), ...(criteriaConflict ? ["criteria_conflict"] : []), ...(environment ? ["environment"] : []), ...(insufficient ? ["evidence"] : []), ...(implementation ? ["implementation"] : []), ...observed.map((row) => row.failure_kind), ...(kind === "unknown" ? ["unknown"] : [])])],
        failed_criteria: failedCriteria.map((row) => ({ criterion: (0, acceptance_user_projection_1.acceptanceDisplayText)(row.criterion || row.description || row), status: row.status || "unverified" })),
        failed_checks: checks.filter((row) => ["failed", "blocked", "timed_out"].includes(row.status)).map((row, index) => ({ check_id: (0, acceptance_user_projection_1.acceptanceDisplayText)(row.checkId || row.id || `check-${index + 1}`), exit_code: row.exit_code ?? row.exitCode ?? null,
            failure_code: (0, acceptance_user_projection_1.acceptanceDisplayText)(row.failure_code || "unclassified_failure"), failure_stage: (0, acceptance_user_projection_1.acceptanceDisplayText)(row.failure_stage || "unknown"), failure_kind: validKinds.has(row.failure_kind) ? row.failure_kind : "unknown",
            reproduction: "在当前授权工作区执行该冻结检查", expected_summary: "满足冻结验收断言与权限要求",
            actual_summary: `status=${row.status}${Number.isFinite(row.exitCode ?? row.exit_code) ? `; exit=${row.exitCode ?? row.exit_code}` : ""}${Number.isFinite(row.statusCode) ? `; HTTP=${row.statusCode}` : ""}`,
            evidence_refs: array(row.acceptanceEvidenceIds || row.evidenceIds).filter((id) => typeof id === "string").slice(0, 20) })),
        evidence_refs: [...new Set([...array(input.evidence_refs || report.evidenceIds), ...checks.flatMap((row) => array(row.acceptanceEvidenceIds || row.evidenceIds))].filter((id) => typeof id === "string"))].slice(0, 100),
        recommended_route: kind ? routes[kind] : "accept",
        can_auto_rework: kind === "implementation",
        review_cycle: typeof input.review_cycle === "string" ? input.review_cycle : input.review_cycle ? {
            id: input.review_cycle.id || input.review_cycle.cycleId, rework_round: input.review_cycle.rework_round,
            rework_max_rounds: input.review_cycle.rework_max_rounds,
        } : null,
    };
}
//# sourceMappingURL=acceptance-failure-routing.js.map