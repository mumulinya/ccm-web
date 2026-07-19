/**
 * Shared Independent Review decision for TestAgent reports.
 * Used by group native summary, handoff strengthening, workchain gates, and global relay.
 */
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
export declare function summarizeTestAgentBrowserProviderGaps(report: any, verdict?: any): {
    count: number;
    lines: string[];
    hasGaps: boolean;
};
/**
 * When a prior TestAgent run hit browser provider capability gaps, force the
 * next recheck handoff onto Playwright so auto/MCP cannot fake-green again.
 */
export declare function applyTestAgentProviderGapPlaywrightReroute(handoff: any, source?: any): any;
/**
 * Derive a single review decision from report + verdict + optional spot-check / receipt status.
 */
export declare function deriveIndependentReviewDecision(input: {
    report?: any;
    verdict?: any;
    receiptStatus?: string;
    postReviewSpotCheck?: any;
    forceReworkSignals?: boolean;
    forceRecheckSignals?: boolean;
    forceEnvironmentSignals?: boolean;
    forceHumanSignals?: boolean;
}): IndependentReviewDecision;
