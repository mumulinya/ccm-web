"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequiredCheckSummary = buildRequiredCheckSummary;
exports.formatRequiredCheckStatusCounts = formatRequiredCheckStatusCounts;
exports.formatRequiredCheckAttentionLines = formatRequiredCheckAttentionLines;
exports.formatRequiredCheckVerifiedEvidenceLines = formatRequiredCheckVerifiedEvidenceLines;
exports.formatRequiredCheckMarkdownSummaryLines = formatRequiredCheckMarkdownSummaryLines;
const utils_1 = require("./utils");
const REQUIRED_CHECK_STATUSES = ["verified", "not_verified", "unknown"];
function emptyStatusCounts() {
    return {
        verified: 0,
        not_verified: 0,
        unknown: 0,
    };
}
function cleanText(value, limit) {
    return (0, utils_1.compactText)(String(value || "").replace(/\s+/g, " ").trim(), limit);
}
function summarizeItem(item, options) {
    const evidenceLimit = Math.max(0, options.evidenceLimit ?? 2);
    const textLimit = Math.max(40, options.textLimit ?? 240);
    const evidence = (item.evidence || [])
        .filter(Boolean)
        .slice(0, evidenceLimit)
        .map(value => cleanText(value, textLimit))
        .filter(Boolean);
    const missingReason = item.missingReason ? cleanText(item.missingReason, textLimit) : undefined;
    return {
        check: item.check,
        status: item.status,
        evidence,
        ...(missingReason ? { missingReason } : {}),
    };
}
function buildRequiredCheckSummary(coverage, options = {}) {
    const statusCounts = emptyStatusCounts();
    const summary = {
        total: coverage.length,
        statusCounts,
        verified: [],
        notVerified: [],
        unknown: [],
    };
    for (const item of coverage) {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        const summarized = summarizeItem(item, options);
        if (item.status === "verified")
            summary.verified.push(summarized);
        else if (item.status === "not_verified")
            summary.notVerified.push(summarized);
        else
            summary.unknown.push(summarized);
    }
    return summary;
}
function formatRequiredCheckStatusCounts(summary) {
    const counts = REQUIRED_CHECK_STATUSES.map(status => `${status}:${summary.statusCounts[status] || 0}`).join(", ");
    return `${counts}, total:${summary.total}`;
}
function itemDetail(item) {
    return item.evidence[0] || item.missingReason || item.status;
}
function formatRequiredCheckAttentionLines(summary, limit = 5) {
    const attention = [...summary.notVerified, ...summary.unknown];
    if (!attention.length)
        return ["Required check attention: none"];
    const lines = ["Required check attention:"];
    for (const item of attention.slice(0, limit)) {
        lines.push(`- ${item.status} ${item.check}: ${itemDetail(item)}`);
    }
    if (attention.length > limit)
        lines.push(`- ... ${attention.length - limit} more required checks need attention`);
    return lines;
}
function formatRequiredCheckVerifiedEvidenceLines(summary, limit = 3) {
    const verified = summary.verified.filter(item => item.evidence.length > 0).slice(0, limit);
    if (!verified.length)
        return ["Required check verified evidence: none"];
    const lines = ["Required check verified evidence:"];
    for (const item of verified)
        lines.push(`- ${item.check}: ${item.evidence[0]}`);
    const remaining = summary.verified.filter(item => item.evidence.length > 0).length - verified.length;
    if (remaining > 0)
        lines.push(`- ... ${remaining} more verified evidence samples`);
    return lines;
}
function formatRequiredCheckMarkdownSummaryLines(summary) {
    const lines = [`- Status counts: ${formatRequiredCheckStatusCounts(summary)}`];
    const attention = [...summary.notVerified, ...summary.unknown];
    if (!attention.length) {
        lines.push("- Attention: none");
    }
    else {
        for (const item of attention.slice(0, 8)) {
            lines.push(`- Attention ${item.status} ${item.check}: ${itemDetail(item)}`);
        }
        if (attention.length > 8)
            lines.push(`- Attention: ${attention.length - 8} more required checks need attention`);
    }
    const verified = summary.verified.filter(item => item.evidence.length > 0).slice(0, 5);
    if (!verified.length) {
        lines.push("- Verified evidence samples: none");
    }
    else {
        for (const item of verified)
            lines.push(`- Verified ${item.check}: ${item.evidence[0]}`);
    }
    return lines;
}
//# sourceMappingURL=required-check-summary.js.map