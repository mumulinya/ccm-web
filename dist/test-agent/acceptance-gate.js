"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTestAgentAcceptanceGate = evaluateTestAgentAcceptanceGate;
exports.classifyVerificationFailure = classifyVerificationFailure;
exports.buildAcceptanceEvidenceGateSummary = buildAcceptanceEvidenceGateSummary;
exports.formatAcceptanceEvidenceGateSummaryLine = formatAcceptanceEvidenceGateSummaryLine;
exports.acceptanceEvidenceGateSummaryErrors = acceptanceEvidenceGateSummaryErrors;
function text(v) { return String(v ?? "").trim(); }
function list(v) { return Array.isArray(v) ? v : []; }
function evaluateTestAgentAcceptanceGate(input) {
    const issues = [];
    const criteria = list(input?.acceptanceCriteria || input?.criteria);
    const results = list(input?.criteriaResults || input?.acceptanceResults || input?.items);
    if (!criteria.length)
        issues.push("缺少验收标准");
    const byId = new Map(results.map((r) => [text(r?.criterionId || r?.acceptanceCriterionId || r?.id), r]));
    let passed = 0;
    for (const criterion of criteria) {
        const id = text(criterion?.id || criterion?.criterionId || criterion);
        const row = byId.get(id);
        if (!row) {
            issues.push(`验收标准缺少结果：${id}`);
            continue;
        }
        const status = text(row.status).toLowerCase();
        if (status === "passed")
            passed++;
        if (!["passed", "failed", "blocked"].includes(status))
            issues.push(`验收结果状态无效：${id}`);
        if (status === "passed") {
            const evidence = list(row.evidence || row.evidenceIds || row.artifacts);
            if (!evidence.length || !text(row.command || row.verificationCommand))
                issues.push(`通过结果缺少可复现证据：${id}`);
        }
    }
    const failed = results.some((r) => text(r?.status).toLowerCase() === "failed");
    const blocked = results.some((r) => text(r?.status).toLowerCase() === "blocked");
    const status = issues.length || blocked ? "blocked" : failed ? "failed" : passed === criteria.length ? "passed" : "blocked";
    return { canAccept: status === "passed", status, issues, qualityScore: criteria.length ? Math.round((passed / criteria.length) * 100) : 0 };
}
function classifyVerificationFailure(input) {
    const code = text(input?.errorCode || input?.code).toLowerCase();
    if (input?.status === "passed" && input?.exitCode === 0)
        return "passed";
    if (input?.status === "blocked" || /missing|dependency|permission|environment|timeout/.test(code))
        return "environment_blocked";
    if (input?.executed === false || input?.exitCode == null)
        return "not_executed";
    return "verification_failed";
}
// Compatibility exports used by the existing artifact/report validators.
function buildAcceptanceEvidenceGateSummary(coverage = []) {
    const verified = coverage.filter(item => item.status === "verified");
    const notVerified = coverage.filter(item => item.status === "not_verified");
    const unknown = coverage.filter(item => item.status === "unknown");
    const fallback = coverage.filter(item => item.evidenceSource === "single_criterion_report_status" || item.matchStrength === "fallback" || item.matchStrength === "token");
    const status = coverage.length === 0 ? "not_applicable" : notVerified.length ? "failed" : unknown.length ? "incomplete" : fallback.length ? "weak" : "verified";
    const unique = (xs) => [...new Set(xs.filter(Boolean))];
    return { status, canAccept: status === "verified" || status === "not_applicable", total: coverage.length, verified: verified.length, notVerified: notVerified.length, unknown: unknown.length, matchedEvidence: coverage.filter(i => i.evidenceSource === "matched_evidence").length, fallbackEvidence: fallback.length, missingEvidence: coverage.filter(i => i.evidenceSource === "none" || !i.evidenceSource).length, direct: coverage.filter(i => i.matchStrength === "direct").length, token: coverage.filter(i => i.matchStrength === "token").length, fallback: coverage.filter(i => i.matchStrength === "fallback").length, none: coverage.filter(i => !i.matchStrength || i.matchStrength === "none").length, failedCriteria: unique(notVerified.map(i => i.criterion)), incompleteCriteria: unique(unknown.map(i => i.criterion)), weakCriteria: unique(fallback.map(i => i.criterion)) };
}
function formatAcceptanceEvidenceGateSummaryLine(summary) {
    if (!summary)
        return "status=incomplete; canAccept=no; total=0; verified=0; notVerified=0; unknown=0; matched=0; fallback=0; missing=0";
    return [`status=${summary.status}`, `canAccept=${summary.canAccept ? "yes" : "no"}`, `total=${summary.total}`, `verified=${summary.verified}`, `notVerified=${summary.notVerified}`, `unknown=${summary.unknown}`, `matched=${summary.matchedEvidence}`, `fallback=${summary.fallbackEvidence}`, `missing=${summary.missingEvidence}`, `direct=${summary.direct}`, `token=${summary.token}`].join("; ");
}
function acceptanceEvidenceGateSummaryErrors(summary, coverage, label = "acceptance evidence gate summary") {
    if (!summary || typeof summary !== "object" || Array.isArray(summary))
        return [`${label} must be an object.`];
    const expected = coverage ? buildAcceptanceEvidenceGateSummary(coverage) : null;
    const errors = [];
    if (summary.canAccept !== (summary.status === "verified" || summary.status === "not_applicable"))
        errors.push(`${label}.canAccept does not match status.`);
    if (expected && JSON.stringify(summary) !== JSON.stringify(expected))
        errors.push(`${label} does not match acceptance coverage.`);
    return errors;
}
//# sourceMappingURL=acceptance-gate.js.map