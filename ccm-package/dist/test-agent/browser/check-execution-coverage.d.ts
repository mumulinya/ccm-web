import { BrowserCheckExecutionCoverageSummary, BrowserCheckExecutionIdentity, BrowserCheckExecutionPlan, BrowserCheckResult, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder } from "../types";
export declare function buildBrowserCheckExecutionPlan(workOrder: NormalizedTestAgentWorkOrder, preferredProvider?: "mcp" | "none" | "auto" | "playwright"): BrowserCheckExecutionPlan;
export declare function browserCheckExecutionPlanErrors(plan: BrowserCheckExecutionPlan): string[];
export declare function browserCheckExecutionIdentity(input: {
    workOrder: NormalizedTestAgentWorkOrder;
    project: NormalizedTestAgentProjectTarget;
    checkIndex: number;
    run?: number;
    expectedRuns?: number;
    evidence?: BrowserCheckExecutionIdentity["evidence"];
}): BrowserCheckExecutionIdentity;
export declare function withBrowserCheckExecutionIdentity(input: {
    result: BrowserCheckResult;
    workOrder: NormalizedTestAgentWorkOrder;
    project: NormalizedTestAgentProjectTarget;
    checkIndex: number;
    run?: number;
    expectedRuns?: number;
}): BrowserCheckResult;
export declare function buildBrowserCheckExecutionCoverage(plan: BrowserCheckExecutionPlan, results: BrowserCheckResult[]): BrowserCheckExecutionCoverageSummary;
export declare function browserCheckExecutionEvidenceErrors(input: {
    plan: BrowserCheckExecutionPlan;
    results: BrowserCheckResult[];
    summary?: BrowserCheckExecutionCoverageSummary;
    reportStatus?: string;
}): string[];
export declare function reconcileBrowserCheckExecution(plan: BrowserCheckExecutionPlan, providerResults: BrowserCheckResult[]): {
    results: BrowserCheckResult[];
    summary: BrowserCheckExecutionCoverageSummary;
};
export declare function formatBrowserCheckExecutionCoverageLine(summary?: BrowserCheckExecutionCoverageSummary): string;
export declare function formatBrowserCheckExecutionCoverageAttentionLines(summary?: BrowserCheckExecutionCoverageSummary, limit?: number): string[];
