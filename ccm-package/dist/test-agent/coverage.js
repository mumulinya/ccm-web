"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceCoverage = buildAcceptanceCoverage;
const utils_1 = require("./utils");
const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "by",
    "can",
    "for",
    "from",
    "has",
    "have",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "with",
    "work",
    "works",
    "done",
    "complete",
    "completed",
    "功能",
    "完成",
    "可以",
    "应该",
    "需要",
]);
function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function stemToken(token) {
    if (token.length > 5 && token.endsWith("ing"))
        return token.slice(0, -3);
    if (token.length > 4 && token.endsWith("ed"))
        return token.slice(0, -2);
    if (token.length > 3 && token.endsWith("s"))
        return token.slice(0, -1);
    return token;
}
function cjkNgrams(chunk) {
    const out = [chunk];
    if (chunk.length <= 2)
        return out;
    for (let i = 0; i < chunk.length - 1; i += 1)
        out.push(chunk.slice(i, i + 2));
    return out;
}
function tokenize(value) {
    const text = normalizeText(value);
    const tokens = new Set();
    for (const token of text.match(/[a-z0-9./:#]+/g) || []) {
        if (token.length < 2 || STOP_WORDS.has(token))
            continue;
        tokens.add(token);
        const stemmed = stemToken(token);
        if (stemmed !== token && !STOP_WORDS.has(stemmed))
            tokens.add(stemmed);
    }
    for (const chunk of text.match(/[\u4e00-\u9fff]+/g) || []) {
        for (const token of cjkNgrams(chunk)) {
            if (token.length >= 2 && !STOP_WORDS.has(token))
                tokens.add(token);
        }
    }
    return [...tokens];
}
function toCandidateStatus(status) {
    if (status === "passed" || status === "started" || status === "already_running")
        return "passed";
    if (status === "failed" || status === "timed_out")
        return "failed";
    if (status === "blocked")
        return "blocked";
    return "skipped";
}
function candidate(label, status, evidence, haystack = "") {
    return {
        label,
        status: toCandidateStatus(status),
        evidence,
        haystack: normalizeText(`${label}\n${evidence}\n${haystack}`),
    };
}
function commandCandidate(result) {
    return candidate(`${result.project}: command ${result.command}`, result.status, result.error || `exit=${result.exitCode}; duration=${result.durationMs}ms`, (0, utils_1.compactText)(`${result.stdout}\n${result.stderr}\n${result.output}`, 2000));
}
function serverCandidate(result) {
    return candidate(`${result.project}: dev server ${result.command || result.url}`, result.status, result.error || result.url, result.output || "");
}
function httpCandidate(result) {
    const resources = result.resourceChecks.map(item => `${item.status} ${item.statusCode ?? ""} ${item.url} ${item.error || ""}`).join("\n");
    const assertions = (result.assertions || []).map(item => `${item.status} ${item.name} ${item.detail || ""} ${item.error || ""}`).join("\n");
    return candidate(`${result.project}: ${result.adversarial ? "adversarial " : ""}HTTP ${result.name || "probe"} ${result.url}`, result.status, result.error || `method=${result.method || "GET"}; status=${result.statusCode}; contentType=${result.contentType}; resources=${result.resourceChecks.length}; assertions=${(result.assertions || []).length}; probe=${result.probeType || ""}`, [resources, assertions, result.responsePreview || "", result.probeType || ""].join("\n"));
}
function browserCandidate(result) {
    const steps = result.steps.map(step => `${step.status} ${step.name} ${step.detail || ""} ${step.error || ""}`).join("\n");
    return candidate(`${result.project}: ${result.adversarial ? "adversarial " : ""}browser ${result.name}`, result.status, result.error || `${result.url}; final=${result.finalUrl || ""}; title=${result.title || ""}; provider=${result.provider || "unknown"}; screenshots=${result.screenshots.length}; probe=${result.probeType || ""}`, [
        steps,
        result.finalUrl || "",
        result.title || "",
        result.pageTextPreview || "",
        result.context ? JSON.stringify(result.context) : "",
        (result.consoleMessages || []).join("\n"),
        result.consoleLogPath || "",
        (result.dialogMessages || []).join("\n"),
        result.dialogLogPath || "",
        result.consoleErrors.join("\n"),
        result.pageErrors.join("\n"),
        (result.networkRequests || []).join("\n"),
        result.networkLogPath || "",
        (result.networkErrors || []).join("\n"),
        result.screenshots.join("\n"),
        (result.pageSnapshots || []).join("\n"),
        result.probeType || "",
    ].join("\n"));
}
function toolCallCandidate(records) {
    const failed = records.some(item => item.status === "failed");
    const haystack = records.map(item => `${item.status} ${item.toolName} ${JSON.stringify(item.input)} ${item.outputPreview || ""} ${item.error || ""}`).join("\n");
    return candidate("Browser MCP tool call transcript", failed ? "failed" : "passed", `${records.length} browser tool calls recorded`, haystack);
}
function issueCandidate(issue) {
    return candidate(`Work order issue ${issue.code}`, issue.severity === "error" ? "blocked" : "skipped", issue.project ? `${issue.project}: ${issue.message}` : issue.message);
}
function evidenceCandidate(item) {
    return candidate(item.project ? `${item.project}: ${item.title}` : item.title, item.status, item.path || item.detail || "");
}
function scoreCandidate(criterion, item) {
    const normalizedCriterion = normalizeText(criterion);
    const criterionTokens = tokenize(criterion);
    if (!criterionTokens.length)
        return 0;
    if (normalizedCriterion.length >= 6 && item.haystack.includes(normalizedCriterion))
        return 100;
    const hits = criterionTokens.filter(token => item.haystack.includes(token));
    if (!hits.length)
        return 0;
    if (criterionTokens.length === 1)
        return hits.length;
    return hits.length / Math.min(criterionTokens.length, 6);
}
function matchingCandidates(criterion, candidates) {
    return candidates
        .map(item => ({ item, score: scoreCandidate(criterion, item) }))
        .filter(match => match.score >= 0.34 || match.score === 100)
        .sort((a, b) => b.score - a.score);
}
function evidenceStrings(candidates) {
    return candidates.slice(0, 8).map(item => `${item.label}: ${item.evidence}`);
}
function evidenceStringsFromMatches(matches) {
    return evidenceStrings(matches.map(match => match.item));
}
function roundedScore(score) {
    return Number(score.toFixed(3));
}
function bestMatchScore(matches) {
    return matches.length ? roundedScore(matches[0].score) : 0;
}
function matchStrength(matches) {
    if (!matches.length)
        return "none";
    return matches[0].score === 100 ? "direct" : "token";
}
function coverageItem(criterion, status, evidence, matchStrength, evidenceSource, matchScore = 0) {
    return {
        criterion,
        status,
        evidence,
        matchStrength,
        matchScore: roundedScore(matchScore),
        evidenceSource,
    };
}
function buildAcceptanceCoverage(input) {
    const candidates = [
        ...input.devServerResults.map(serverCandidate),
        ...input.commandResults.map(commandCandidate),
        ...input.httpResults.map(httpCandidate),
        ...input.browserResults.map(browserCandidate),
        ...input.issues.map(issueCandidate),
        ...input.evidence.map(evidenceCandidate),
    ];
    if (input.browserToolCalls.length)
        candidates.push(toolCallCandidate(input.browserToolCalls));
    const positiveCandidates = candidates.filter(item => item.status === "passed");
    const negativeCandidates = candidates.filter(item => item.status === "failed" || item.status === "blocked");
    const singleCriterion = input.workOrder.acceptanceCriteria.length === 1;
    return input.workOrder.acceptanceCriteria.map(criterion => {
        const matched = matchingCandidates(criterion, candidates);
        const matchedNegative = matched.filter(match => match.item.status === "failed" || match.item.status === "blocked");
        const matchedPositive = matched.filter(match => match.item.status === "passed");
        if (matchedNegative.length) {
            const combinedMatches = [...matchedNegative, ...matchedPositive];
            return coverageItem(criterion, "not_verified", evidenceStringsFromMatches(combinedMatches), matchStrength(combinedMatches), "matched_evidence", bestMatchScore(combinedMatches));
        }
        if (matchedPositive.length) {
            return coverageItem(criterion, "verified", evidenceStringsFromMatches(matchedPositive), matchStrength(matchedPositive), "matched_evidence", bestMatchScore(matchedPositive));
        }
        if (singleCriterion && input.status === "passed" && positiveCandidates.length) {
            return coverageItem(criterion, "verified", evidenceStrings(positiveCandidates), "fallback", "single_criterion_report_status");
        }
        if (singleCriterion && input.status === "failed" && negativeCandidates.length) {
            return coverageItem(criterion, "not_verified", evidenceStrings(negativeCandidates), "fallback", "single_criterion_report_status");
        }
        return coverageItem(criterion, "unknown", [], "none", "none");
    });
}
//# sourceMappingURL=coverage.js.map