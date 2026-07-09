"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceSummary = buildAcceptanceSummary;
exports.formatAcceptanceStatusCounts = formatAcceptanceStatusCounts;
exports.formatAcceptanceMatchStrengthCounts = formatAcceptanceMatchStrengthCounts;
exports.formatAcceptanceEvidenceSourceCounts = formatAcceptanceEvidenceSourceCounts;
exports.formatAcceptanceAttentionLines = formatAcceptanceAttentionLines;
exports.formatAcceptanceVerifiedEvidenceLines = formatAcceptanceVerifiedEvidenceLines;
exports.formatAcceptanceMarkdownSummaryLines = formatAcceptanceMarkdownSummaryLines;
const utils_1 = require("./utils");
const ACCEPTANCE_STATUSES = ["verified", "not_verified", "unknown"];
const ACCEPTANCE_MATCH_STRENGTHS = ["direct", "token", "fallback", "none"];
const ACCEPTANCE_EVIDENCE_SOURCES = ["matched_evidence", "single_criterion_report_status", "none"];
function emptyStatusCounts() {
    return {
        verified: 0,
        not_verified: 0,
        unknown: 0,
    };
}
function emptyMatchStrengthCounts() {
    return {
        direct: 0,
        token: 0,
        fallback: 0,
        none: 0,
    };
}
function emptyEvidenceSourceCounts() {
    return {
        matched_evidence: 0,
        single_criterion_report_status: 0,
        none: 0,
    };
}
function cleanText(value, limit) {
    return (0, utils_1.compactText)(String(value || "").replace(/\s+/g, " ").trim(), limit);
}
function summarizeItem(item, options) {
    const evidenceLimit = Math.max(0, options.evidenceLimit ?? 2);
    const textLimit = Math.max(60, options.textLimit ?? 260);
    const evidence = (item.evidence || [])
        .filter(Boolean)
        .slice(0, evidenceLimit)
        .map(value => cleanText(value, textLimit))
        .filter(Boolean);
    return {
        criterion: cleanText(item.criterion, textLimit),
        status: item.status,
        evidence,
        ...(item.matchStrength ? { matchStrength: item.matchStrength } : {}),
        ...(typeof item.matchScore === "number" ? { matchScore: item.matchScore } : {}),
        ...(item.evidenceSource ? { evidenceSource: item.evidenceSource } : {}),
    };
}
function buildAcceptanceSummary(coverage, options = {}) {
    const statusCounts = emptyStatusCounts();
    const matchStrengthCounts = emptyMatchStrengthCounts();
    const evidenceSourceCounts = emptyEvidenceSourceCounts();
    const summary = {
        total: coverage.length,
        statusCounts,
        matchStrengthCounts,
        evidenceSourceCounts,
        verified: [],
        notVerified: [],
        unknown: [],
    };
    for (const item of coverage) {
        statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        const strength = item.matchStrength || "none";
        const source = item.evidenceSource || "none";
        matchStrengthCounts[strength] = (matchStrengthCounts[strength] || 0) + 1;
        evidenceSourceCounts[source] = (evidenceSourceCounts[source] || 0) + 1;
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
function formatAcceptanceStatusCounts(summary) {
    const counts = ACCEPTANCE_STATUSES.map(status => `${status}:${summary.statusCounts[status] || 0}`).join(", ");
    return `${counts}, total:${summary.total}`;
}
function formatAcceptanceMatchStrengthCounts(summary) {
    return ACCEPTANCE_MATCH_STRENGTHS.map(strength => `${strength}:${summary.matchStrengthCounts[strength] || 0}`).join(", ");
}
function formatAcceptanceEvidenceSourceCounts(summary) {
    return ACCEPTANCE_EVIDENCE_SOURCES.map(source => `${source}:${summary.evidenceSourceCounts[source] || 0}`).join(", ");
}
function itemDetail(item) {
    return item.evidence[0] || item.status;
}
function matchDescriptor(item) {
    const strength = item.matchStrength || "none";
    const source = item.evidenceSource || "none";
    if (strength === "none" && source === "none")
        return "";
    const score = typeof item.matchScore === "number" && item.matchScore > 0 ? ` score=${item.matchScore}` : "";
    return ` [${strength}/${source}${score}]`;
}
function formatAcceptanceAttentionLines(summary, limit = 5) {
    const attention = [...summary.notVerified, ...summary.unknown];
    if (!attention.length)
        return ["Acceptance attention: none"];
    const lines = ["Acceptance attention:"];
    for (const item of attention.slice(0, limit)) {
        lines.push(`- ${item.status} ${item.criterion}${matchDescriptor(item)}: ${itemDetail(item)}`);
    }
    if (attention.length > limit)
        lines.push(`- ... ${attention.length - limit} more acceptance criteria need attention`);
    return lines;
}
function formatAcceptanceVerifiedEvidenceLines(summary, limit = 3) {
    const verified = summary.verified.filter(item => item.evidence.length > 0).slice(0, limit);
    if (!verified.length)
        return ["Acceptance verified evidence: none"];
    const lines = ["Acceptance verified evidence:"];
    for (const item of verified)
        lines.push(`- ${item.criterion}${matchDescriptor(item)}: ${item.evidence[0]}`);
    const remaining = summary.verified.filter(item => item.evidence.length > 0).length - verified.length;
    if (remaining > 0)
        lines.push(`- ... ${remaining} more verified acceptance evidence samples`);
    return lines;
}
function formatAcceptanceMarkdownSummaryLines(summary) {
    const lines = [
        `- Status counts: ${formatAcceptanceStatusCounts(summary)}`,
        `- Match strength counts: ${formatAcceptanceMatchStrengthCounts(summary)}`,
        `- Evidence source counts: ${formatAcceptanceEvidenceSourceCounts(summary)}`,
    ];
    const attention = [...summary.notVerified, ...summary.unknown];
    if (!attention.length) {
        lines.push("- Attention: none");
    }
    else {
        for (const item of attention.slice(0, 8)) {
            lines.push(`- Attention ${item.status} ${item.criterion}${matchDescriptor(item)}: ${itemDetail(item)}`);
        }
        if (attention.length > 8)
            lines.push(`- Attention: ${attention.length - 8} more acceptance criteria need attention`);
    }
    const verified = summary.verified.filter(item => item.evidence.length > 0).slice(0, 5);
    if (!verified.length) {
        lines.push("- Verified evidence samples: none");
    }
    else {
        for (const item of verified)
            lines.push(`- Verified ${item.criterion}${matchDescriptor(item)}: ${item.evidence[0]}`);
    }
    return lines;
}
//# sourceMappingURL=acceptance-summary.js.map