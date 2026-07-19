"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceEvidenceGateSummary = buildAcceptanceEvidenceGateSummary;
exports.formatAcceptanceEvidenceGateSummaryLine = formatAcceptanceEvidenceGateSummaryLine;
exports.acceptanceEvidenceGateSummaryErrors = acceptanceEvidenceGateSummaryErrors;
function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function canonicalJson(value) {
    if (Array.isArray(value))
        return value.map(canonicalJson);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value)
        .sort()
        .reduce((out, key) => {
        out[key] = canonicalJson(value[key]);
        return out;
    }, {});
}
function sameJson(left, right) {
    return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}
function statusFor(input) {
    if (input.total === 0)
        return "not_applicable";
    if (input.notVerified > 0)
        return "failed";
    if (input.unknown > 0)
        return "incomplete";
    if (input.fallbackEvidence > 0)
        return "weak";
    return "verified";
}
function buildAcceptanceEvidenceGateSummary(coverage = []) {
    const verified = coverage.filter(item => item.status === "verified");
    const notVerifiedItems = coverage.filter(item => item.status === "not_verified");
    const unknownItems = coverage.filter(item => item.status === "unknown");
    const matchedItems = coverage.filter(item => item.evidenceSource === "matched_evidence");
    const fallbackItems = coverage.filter(item => item.evidenceSource === "single_criterion_report_status"
        || item.matchStrength === "fallback"
        // Pure token matches are too loose for accept; treat like weak fallback evidence.
        || item.matchStrength === "token");
    const missingItems = coverage.filter(item => item.evidenceSource === "none" || !item.evidenceSource);
    const status = statusFor({
        total: coverage.length,
        notVerified: notVerifiedItems.length,
        unknown: unknownItems.length,
        fallbackEvidence: fallbackItems.length,
    });
    return {
        status,
        canAccept: status === "verified" || status === "not_applicable",
        total: coverage.length,
        verified: verified.length,
        notVerified: notVerifiedItems.length,
        unknown: unknownItems.length,
        matchedEvidence: matchedItems.length,
        fallbackEvidence: fallbackItems.length,
        missingEvidence: missingItems.length,
        direct: coverage.filter(item => item.matchStrength === "direct").length,
        token: coverage.filter(item => item.matchStrength === "token").length,
        fallback: coverage.filter(item => item.matchStrength === "fallback").length,
        none: coverage.filter(item => !item.matchStrength || item.matchStrength === "none").length,
        failedCriteria: unique(notVerifiedItems.map(item => item.criterion)),
        incompleteCriteria: unique(unknownItems.map(item => item.criterion)),
        weakCriteria: unique(fallbackItems.map(item => item.criterion)),
    };
}
function formatAcceptanceEvidenceGateSummaryLine(summary) {
    if (!summary) {
        return "status=incomplete; canAccept=no; total=0; verified=0; notVerified=0; unknown=0; matched=0; fallback=0; missing=0";
    }
    return [
        `status=${summary.status}`,
        `canAccept=${summary.canAccept ? "yes" : "no"}`,
        `total=${summary.total}`,
        `verified=${summary.verified}`,
        `notVerified=${summary.notVerified}`,
        `unknown=${summary.unknown}`,
        `matched=${summary.matchedEvidence}`,
        `fallback=${summary.fallbackEvidence}`,
        `missing=${summary.missingEvidence}`,
        `direct=${summary.direct}`,
        `token=${summary.token}`,
    ].join("; ");
}
function acceptanceEvidenceGateSummaryErrors(summary, coverage, label = "acceptance evidence gate summary") {
    if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
        return [`${label} must be an object.`];
    }
    const errors = [];
    const allowedKeys = new Set([
        "status",
        "canAccept",
        "total",
        "verified",
        "notVerified",
        "unknown",
        "matchedEvidence",
        "fallbackEvidence",
        "missingEvidence",
        "direct",
        "token",
        "fallback",
        "none",
        "failedCriteria",
        "incompleteCriteria",
        "weakCriteria",
    ]);
    for (const key of Object.keys(summary)) {
        if (!allowedKeys.has(key))
            errors.push(`${label}.${key} is not permitted.`);
    }
    const expectedCanAccept = summary.status === "verified" || summary.status === "not_applicable";
    if (summary.canAccept !== expectedCanAccept) {
        errors.push(`${label}.canAccept does not match status ${JSON.stringify(summary.status)}.`);
    }
    const numeric = (key) => Number(summary[key]);
    if (numeric("total") !== numeric("verified") + numeric("notVerified") + numeric("unknown")) {
        errors.push(`${label} acceptance status counts do not add up to total.`);
    }
    if (numeric("total") !== numeric("direct") + numeric("token") + numeric("fallback") + numeric("none")) {
        errors.push(`${label} match-strength counts do not add up to total.`);
    }
    const expectedStatus = statusFor({
        total: numeric("total"),
        notVerified: numeric("notVerified"),
        unknown: numeric("unknown"),
        fallbackEvidence: numeric("fallbackEvidence"),
    });
    if (summary.status !== expectedStatus) {
        errors.push(`${label}.status does not match its evidence counts.`);
    }
    if (coverage) {
        const expected = buildAcceptanceEvidenceGateSummary(coverage);
        if (!sameJson(summary, expected)) {
            errors.push(`${label} does not match acceptance coverage.`);
        }
    }
    return errors;
}
//# sourceMappingURL=acceptance-gate.js.map