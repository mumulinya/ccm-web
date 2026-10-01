import { BrowserCheckResult, BrowserCheckSpec, BrowserStabilitySummary } from "../types";
export declare const MAX_BROWSER_STABILITY_RUNS = 10;
export declare function browserCheckStabilityRuns(check: BrowserCheckSpec): number;
export declare function browserStabilityGroupId(project: string, check: BrowserCheckSpec, index: number): string;
export declare function withBrowserStabilityMetadata(input: {
    result: BrowserCheckResult;
    groupId: string;
    run: number;
    runs: number;
}): BrowserCheckResult;
interface StabilityMetadata {
    groupId: string;
    run: number;
    runs: number;
}
export declare function browserStabilityMetadata(result: BrowserCheckResult): StabilityMetadata | null;
export declare function buildBrowserStabilitySummary(browserResults: BrowserCheckResult[]): BrowserStabilitySummary;
export declare function formatBrowserStabilitySummaryLine(summary?: BrowserStabilitySummary): string;
export declare function formatBrowserStabilityAttentionLines(summary?: BrowserStabilitySummary, limit?: number): string[];
export {};
