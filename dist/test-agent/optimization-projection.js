"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAgentOptimizationProjection = testAgentOptimizationProjection;
const acceptance_user_projection_1 = require("../agents/acceptance-user-projection");
const acceptance_failure_routing_1 = require("../agents/acceptance-failure-routing");
/** Shared durable/user projection: never include command or response bodies. */
function testAgentOptimizationProjection(report = {}) {
    const feedback = (0, acceptance_failure_routing_1.classifyAcceptanceFailure)({ report, canAccept: report.status === "passed" });
    const metadata = report.metadata || {};
    const statuses = (value, allowed) => allowed.includes(value) ? value : "unknown";
    const times = {};
    const stages = ["preflight_planning", "preflight_execution", "isolation_prepare", "planning", "commands", "service_ready", "http", "browser", "supplemental_planning", "supplemental_verification", "evidence_write", "cleanup"];
    for (const stage of stages)
        if (Number.isFinite(metadata.timing?.stage_durations?.[stage]))
            times[stage] = Math.max(0, metadata.timing.stage_durations[stage]);
    const usage = metadata.model_usage || {};
    const summary = {
        failure_kind: feedback.failure_kind, failure_kinds: feedback.failure_kinds,
        failed_criteria: feedback.failed_criteria, failed_checks: feedback.failed_checks,
        recommended_route: feedback.recommended_route, can_auto_rework: feedback.can_auto_rework,
        evidence_refs: feedback.evidence_refs,
        model_call_status: statuses(metadata.model_call_status, ["not_called", "called", "unknown"]),
        usage_status: statuses(metadata.usage_status, ["reported", "partial", "unreported", "unknown"]),
        cost_status: statuses(usage.cost_status, ["reported", "partial", "unreported", "unknown"]),
        model_stages: (Array.isArray(usage.stages) ? usage.stages : []).filter(row => ["planning", "supplemental_planning"].includes(row.stage)).map(row => ({
            stage: row.stage, usage_status: statuses(row.usage_status, ["reported", "partial", "unreported", "unknown"]),
            ...(Number.isFinite(row.requestCount) ? { requestCount: row.requestCount } : {}),
            ...(Number.isFinite(row.inputTokens) ? { inputTokens: row.inputTokens } : {}),
            ...(Number.isFinite(row.outputTokens) ? { outputTokens: row.outputTokens } : {}),
        })),
        timing: { stage_durations: times, measurement_endpoint: ["before_report_seal", "return"].includes(metadata.timing?.measurement_endpoint) ? metadata.timing.measurement_endpoint : "unknown" },
        reverification: { mode: metadata.reverification?.mode === "incremental" ? "incremental" : metadata.reverification?.mode === "full" ? "full" : "unknown",
            fallback_reasons: (Array.isArray(metadata.reverification?.fallbackReasons) ? metadata.reverification.fallbackReasons : []).map(acceptance_user_projection_1.acceptanceDisplayText).slice(0, 20) },
    };
    for (const field of ["requestCount", "unknownRequestCount", "inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens", "totalCostUsd"]) {
        if (Number.isFinite(usage[field]))
            summary[field] = Math.max(0, usage[field]);
    }
    for (const field of ["totalMs", "verificationMs"])
        if (Number.isFinite(metadata.timing?.[field]))
            summary.timing[field] = Math.max(0, metadata.timing[field]);
    return summary;
}
//# sourceMappingURL=optimization-projection.js.map