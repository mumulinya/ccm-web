"use strict";
/**
 * Shared Independent Review decision for TestAgent reports.
 * Used by group native summary, handoff strengthening, workchain gates, and global relay.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeTestAgentBrowserProviderGaps = summarizeTestAgentBrowserProviderGaps;
exports.applyTestAgentProviderGapPlaywrightReroute = applyTestAgentProviderGapPlaywrightReroute;
exports.deriveIndependentReviewDecision = deriveIndependentReviewDecision;
const test_agent_environment_prep_1 = require("./test-agent-environment-prep");
const acceptance_failure_routing_1 = require("../../agents/acceptance-failure-routing");
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function summarizeTestAgentBrowserProviderGaps(report, verdict = null) {
    const gaps = asArray(report?.browserProviderGaps).length
        ? asArray(report?.browserProviderGaps)
        : asArray(verdict?.browserProviderGaps).length
            ? asArray(verdict?.browserProviderGaps)
            : asArray(report?.browser_provider_gaps).length
                ? asArray(report?.browser_provider_gaps)
                : asArray(verdict?.browser_provider_gaps);
    const lines = gaps
        .map((gap) => {
        const step = String(gap?.step || gap?.category || "provider_gap").trim();
        const message = String(gap?.message || gap?.reason || gap?.detail || "browser provider capability gap").trim();
        const recommendation = String(gap?.recommendation
            || gap?.recommendedProvider
            || gap?.recommended_provider
            || "use Playwright").trim();
        return `${step}: ${message} → ${recommendation}`;
    })
        .filter(Boolean)
        .slice(0, 8);
    return {
        count: gaps.length,
        lines,
        hasGaps: gaps.length > 0,
    };
}
/**
 * When a prior TestAgent run hit browser provider capability gaps, force the
 * next recheck handoff onto Playwright so auto/MCP cannot fake-green again.
 */
function applyTestAgentProviderGapPlaywrightReroute(handoff, source = null) {
    if (!handoff || typeof handoff !== "object")
        return handoff;
    if (handoff?.metadata?.providerGapReroute === true
        && String(handoff?.options?.browserProvider || "").toLowerCase() === "playwright") {
        return handoff;
    }
    const report = source?.report
        || source?.testAgentReport
        || source?.test_agent_report
        || (source && (source.browserProviderGaps || source.browser_provider_gaps) ? source : null)
        || null;
    const verdict = source?.verdict
        || source?.testAgentVerdict
        || source?.test_agent_verdict
        || report?.verdict
        || null;
    const gaps = summarizeTestAgentBrowserProviderGaps(report || handoff, verdict);
    const reasonText = [
        source?.reason,
        source?.detail,
        ...(asArray(source?.blockedReasons)),
        ...(asArray(verdict?.blockedReasons)),
        ...gaps.lines,
    ].map(item => String(item || "")).join("\n");
    const gapTextHint = /Provider缺口|provider gap|capability gap|改走 Playwright|use Playwright/i.test(reasonText);
    const reviewRouteRecheck = String(source?.reviewRoute
        || verdict?.reviewRoute
        || handoff?.metadata?.reviewRoute
        || "").toLowerCase() === "test_agent_recheck";
    const shouldReroute = gaps.hasGaps || (reviewRouteRecheck && gapTextHint) || gapTextHint;
    if (!shouldReroute)
        return handoff;
    return {
        ...handoff,
        options: {
            ...(handoff.options || {}),
            browserProvider: "playwright",
        },
        metadata: {
            ...(handoff.metadata || {}),
            providerGapReroute: true,
            providerGapRerouteReason: gaps.hasGaps
                ? "previous_run_browser_provider_gaps"
                : "provider_gap_recheck_hint",
            providerGapCount: gaps.count,
            providerGapLines: gaps.lines,
        },
    };
}
/**
 * Derive a single review decision from report + verdict + optional spot-check / receipt status.
 */
function deriveIndependentReviewDecision(input) {
    const report = input.report || {};
    const verdict = input.verdict || {};
    const postReviewSpotCheck = input.postReviewSpotCheck || null;
    const spotCheckNeedsRecheck = postReviewSpotCheck?.required === true && postReviewSpotCheck?.pass !== true;
    const providerGaps = summarizeTestAgentBrowserProviderGaps(report, verdict);
    const flakyStabilityGroups = (0, test_agent_environment_prep_1.countTestAgentFlakyStabilityGroups)(report, verdict);
    const hasFlakyStability = flakyStabilityGroups > 0;
    const feedback = (0, acceptance_failure_routing_1.classifyAcceptanceFailure)({ ...input, report, verdict, canAccept: input.receiptStatus === "done" || verdict.canAccept === true,
        evidenceMissing: spotCheckNeedsRecheck || providerGaps.hasGaps || hasFlakyStability,
        forceReworkSignals: input.forceReworkSignals === true });
    const needsRework = feedback.can_auto_rework;
    const needsRecheck = feedback.failure_kind === "evidence";
    const needsEnvironment = feedback.failure_kind === "environment";
    const needsHuman = ["permission", "criteria_conflict", "reconciliation", "unknown"].includes(feedback.failure_kind);
    let status;
    if (feedback.failure_kind === null) {
        status = "passed";
    }
    else if (needsRework) {
        status = "needs_rework";
    }
    else if (needsRecheck) {
        status = "needs_recheck";
    }
    else if (needsEnvironment) {
        status = "needs_environment";
    }
    else if (needsHuman) {
        status = "needs_user";
    }
    else {
        status = "needs_user";
    }
    const canAccept = status === "passed";
    const reviewRoute = needsRework
        ? "implementation_rework"
        : needsRecheck
            ? "test_agent_recheck"
            : needsEnvironment
                ? "environment"
                : canAccept
                    ? "accept"
                    : "needs_user";
    return {
        status,
        needsRework,
        needsRecheck,
        needsEnvironment,
        needsHuman,
        canAccept,
        reviewRoute,
        providerGapLines: providerGaps.lines,
        providerGapCount: providerGaps.count,
        spotCheckNeedsRecheck,
        flakyStabilityGroups,
        acceptance_feedback: feedback,
    };
}
//# sourceMappingURL=test-agent-independent-review-decision.js.map