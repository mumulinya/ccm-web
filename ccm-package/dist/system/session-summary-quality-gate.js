"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSessionSummaryQuality = evaluateSessionSummaryQuality;
exports.runSessionSummaryQualityGateSelfTest = runSessionSummaryQualityGateSelfTest;
const crypto = __importStar(require("crypto"));
function checksum(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function text(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value))
        return value.map(text).filter(Boolean).join("\n");
    if (value && typeof value === "object")
        return Object.entries(value)
            .filter(([key]) => !/sourceMessageIds|source_message_ids/i.test(key))
            .map(([, item]) => text(item)).filter(Boolean).join("\n");
    return "";
}
function normalized(value) {
    return text(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}
function terms(value) {
    return new Set(text(value).toLowerCase().match(/[\p{Script=Han}]{2,}|[a-z0-9_.\-/]{3,}/gu) || []);
}
function represented(anchor, summaryText, summaryTerms) {
    const exact = normalized(anchor);
    const target = normalized(summaryText);
    if (!exact)
        return true;
    if (target.includes(exact))
        return true;
    const anchorTerms = terms(anchor);
    if (!anchorTerms.size)
        return false;
    let hits = 0;
    for (const term of anchorTerms)
        if (summaryTerms.has(term))
            hits += 1;
    return hits / anchorTerms.size >= 0.72;
}
function anchorValues(reference) {
    if (!reference || typeof reference !== "object")
        return [];
    const durableKeys = [
        "userAnchors", "feedback", "authorization", "decisions", "references", "unresolved",
        "filesAndResources", "preferences", "dislikes", "artistsAndGenres", "playbackDecisions",
        "persistentRequirements", "blockedItems", "constraints", "userGoals", "corrections",
        "authorizationBoundaries", "completedWork", "pendingWork", "risksAndBlockers",
        "fileReferences", "verificationEvidence", "attachmentReferences", "nextActions",
    ];
    return [...new Set(durableKeys.flatMap(key => Array.isArray(reference[key]) ? reference[key].map(String) : []))].filter(Boolean);
}
function evaluateSessionSummaryQuality(input) {
    const sourceIds = (input.sourceMessageIds || []).map(String);
    const actualIds = Array.isArray(input.summary?.sourceMessageIds) ? input.summary.sourceMessageIds.map(String) : [];
    const summaryText = text(input.summary);
    const sourceText = text(input.sourceMessages || []);
    const summaryTerms = terms(summaryText);
    const sourceTerms = terms(sourceText);
    const anchors = anchorValues(input.reference);
    const missingAnchors = anchors.filter(anchor => !represented(anchor, summaryText, summaryTerms));
    const issues = [];
    if (!input.summary || typeof input.summary !== "object" || Array.isArray(input.summary))
        issues.push("summary_not_object");
    if (sourceIds.length && (actualIds.length !== sourceIds.length || actualIds.some((id, index) => id !== sourceIds[index])))
        issues.push("source_boundary_mismatch");
    if (sourceIds.length && !summaryText.trim())
        issues.push("summary_core_empty");
    if (missingAnchors.length)
        issues.push("durable_anchor_missing");
    const meaningfulSummaryTerms = [...summaryTerms].filter(term => term.length >= 3);
    const groundedTerms = meaningfulSummaryTerms.filter(term => sourceTerms.has(term) || terms(input.reference).has(term));
    const groundingRatio = meaningfulSummaryTerms.length ? groundedTerms.length / meaningfulSummaryTerms.length : 1;
    if (sourceText && meaningfulSummaryTerms.length >= 8 && groundingRatio < 0.18)
        issues.push("summary_weakly_grounded");
    const previousAnchors = anchorValues(input.previousSummary);
    const previousContinuityCount = previousAnchors.filter(anchor => represented(anchor, summaryText, summaryTerms)).length;
    const continuityRatio = previousAnchors.length ? previousContinuityCount / previousAnchors.length : 1;
    if (previousAnchors.length >= 3 && continuityRatio < 0.5)
        issues.push("previous_summary_continuity_low");
    const score = Math.max(0, Math.min(100, Math.round(100
        - missingAnchors.length * 10
        - (issues.includes("source_boundary_mismatch") ? 35 : 0)
        - (issues.includes("summary_core_empty") ? 35 : 0)
        - (issues.includes("summary_weakly_grounded") ? 15 : 0)
        - (issues.includes("previous_summary_continuity_low") ? 15 : 0))));
    const receipt = {
        schema: "ccm-session-summary-quality-gate-v1",
        version: 1,
        scope: input.scope,
        scopeId: String(input.scopeId || input.sessionId || ""),
        sessionId: String(input.sessionId || ""),
        sourceMessageCount: sourceIds.length,
        sourceBoundaryChecksum: checksum(sourceIds),
        summaryChecksum: checksum(input.summary),
        anchorCount: anchors.length,
        missingAnchorCount: missingAnchors.length,
        missingAnchorChecksums: missingAnchors.map(checksum).slice(0, 24),
        groundingRatio: Math.round(groundingRatio * 10_000) / 10_000,
        previousContinuityRatio: Math.round(continuityRatio * 10_000) / 10_000,
        score,
        valid: issues.length === 0,
        issues: [...new Set(issues)],
        contentStored: false,
        evaluatedAt: new Date().toISOString(),
        checksum: "",
    };
    receipt.checksum = checksum(receipt);
    return receipt;
}
function runSessionSummaryQualityGateSelfTest() {
    const sourceMessageIds = ["m1", "m2"];
    const reference = { authorization: ["只能修改项目目录"], unresolved: ["登录测试仍待处理"] };
    const pass = evaluateSessionSummaryQuality({
        scope: "project", sessionId: "p1", sourceMessageIds, reference,
        sourceMessages: [{ content: "只能修改项目目录，登录测试仍待处理" }],
        summary: { authorization: ["只能修改项目目录"], unresolved: ["登录测试仍待处理"], sourceMessageIds },
    });
    const fail = evaluateSessionSummaryQuality({
        scope: "project", sessionId: "p1", sourceMessageIds, reference,
        sourceMessages: [{ content: "只能修改项目目录，登录测试仍待处理" }],
        summary: { latestOutcome: "全部完成并通过验收", sourceMessageIds },
    });
    return {
        pass: pass.valid && !fail.valid && fail.issues.includes("durable_anchor_missing"),
        checks: { validSummaryAccepted: pass.valid, lossySummaryRejected: !fail.valid, contentStored: pass.contentStored === false },
    };
}
//# sourceMappingURL=session-summary-quality-gate.js.map