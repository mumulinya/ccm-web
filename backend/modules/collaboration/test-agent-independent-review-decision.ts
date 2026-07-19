/**
 * Shared Independent Review decision for TestAgent reports.
 * Used by group native summary, handoff strengthening, workchain gates, and global relay.
 */

import { countTestAgentFlakyStabilityGroups } from "./test-agent-environment-prep";

export type IndependentReviewStatus = "passed" | "needs_rework" | "needs_recheck" | "needs_environment" | "needs_user";

export type IndependentReviewDecision = {
  status: IndependentReviewStatus;
  needsRework: boolean;
  needsRecheck: boolean;
  needsEnvironment: boolean;
  needsHuman: boolean;
  canAccept: boolean;
  reviewRoute: "implementation_rework" | "test_agent_recheck" | "environment" | "accept" | "needs_user";
  providerGapLines: string[];
  providerGapCount: number;
  spotCheckNeedsRecheck: boolean;
  flakyStabilityGroups: number;
};

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

export function summarizeTestAgentBrowserProviderGaps(report: any, verdict: any = null) {
  const gaps = asArray(report?.browserProviderGaps).length
    ? asArray(report?.browserProviderGaps)
    : asArray(verdict?.browserProviderGaps).length
      ? asArray(verdict?.browserProviderGaps)
      : asArray(report?.browser_provider_gaps).length
        ? asArray(report?.browser_provider_gaps)
        : asArray(verdict?.browser_provider_gaps);
  const lines = gaps
    .map((gap: any) => {
      const step = String(gap?.step || gap?.category || "provider_gap").trim();
      const message = String(gap?.message || gap?.reason || gap?.detail || "browser provider capability gap").trim();
      const recommendation = String(
        gap?.recommendation
        || gap?.recommendedProvider
        || gap?.recommended_provider
        || "use Playwright",
      ).trim();
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
export function applyTestAgentProviderGapPlaywrightReroute(handoff: any, source: any = null) {
  if (!handoff || typeof handoff !== "object") return handoff;
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
  const reviewRouteRecheck = String(
    source?.reviewRoute
    || verdict?.reviewRoute
    || handoff?.metadata?.reviewRoute
    || "",
  ).toLowerCase() === "test_agent_recheck";
  const shouldReroute = gaps.hasGaps || (reviewRouteRecheck && gapTextHint) || gapTextHint;
  if (!shouldReroute) return handoff;
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
export function deriveIndependentReviewDecision(input: {
  report?: any;
  verdict?: any;
  receiptStatus?: string;
  postReviewSpotCheck?: any;
  forceReworkSignals?: boolean;
  forceRecheckSignals?: boolean;
  forceEnvironmentSignals?: boolean;
  forceHumanSignals?: boolean;
}): IndependentReviewDecision {
  const report = input.report || {};
  const verdict = input.verdict || {};
  const postReviewSpotCheck = input.postReviewSpotCheck || null;
  const spotCheckNeedsRecheck = postReviewSpotCheck?.required === true && postReviewSpotCheck?.pass !== true;
  const providerGaps = summarizeTestAgentBrowserProviderGaps(report, verdict);
  const flakyStabilityGroups = countTestAgentFlakyStabilityGroups(report, verdict);
  const hasFlakyStability = flakyStabilityGroups > 0;

  const needsRework = input.forceReworkSignals === true
    || input.receiptStatus === "failed"
    || verdict?.needsRework === true
    || String(verdict?.recommendation || "").toLowerCase().includes("rework")
    || String(verdict?.status || "").toLowerCase() === "failed";

  const needsRecheck = !needsRework && (
    input.forceRecheckSignals === true
    || spotCheckNeedsRecheck
    || verdict?.needsRecheck === true
    || providerGaps.hasGaps
    || hasFlakyStability
  );

  const needsEnvironment = !needsRework && !needsRecheck && (
    input.forceEnvironmentSignals === true
    || verdict?.needsEnvironment === true
  );

  const needsHuman = !needsRework && !needsRecheck && !needsEnvironment && (
    input.forceHumanSignals === true
    || verdict?.needsHuman === true
    || input.receiptStatus === "blocked"
  );

  let status: IndependentReviewStatus;
  if (input.receiptStatus === "done" && !spotCheckNeedsRecheck && !needsRework && !needsRecheck && !needsEnvironment && !needsHuman && !hasFlakyStability) {
    status = "passed";
  } else if (needsRework) {
    status = "needs_rework";
  } else if (needsRecheck) {
    status = "needs_recheck";
  } else if (needsEnvironment) {
    status = "needs_environment";
  } else if (needsHuman) {
    status = "needs_user";
  } else if (verdict?.canAccept === true) {
    status = "passed";
  } else {
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
  };
}
