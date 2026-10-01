import { BrowserCheckResult, BrowserToolCallRecord, BrowserToolCallTimeoutSummary } from "../types";
export declare const MIN_BROWSER_TOOL_CALL_TIMEOUT_MS = 1000;
export declare function isBrowserToolCallTimeout(value: any): boolean;
export declare function browserResultHasToolCallTimeout(result: BrowserCheckResult): boolean;
export declare function buildBrowserToolCallTimeoutSummary(browserToolCalls: BrowserToolCallRecord[]): BrowserToolCallTimeoutSummary;
export declare function browserToolCallTimeoutEvidenceErrors(input: {
    browserResults: BrowserCheckResult[];
    browserToolCalls: BrowserToolCallRecord[];
    summary?: BrowserToolCallTimeoutSummary;
    reportStatus?: string;
}): string[];
export declare function formatBrowserToolCallTimeoutSummaryLine(summary?: BrowserToolCallTimeoutSummary): string;
export declare function formatBrowserToolCallTimeoutAttentionLines(summary?: BrowserToolCallTimeoutSummary, limit?: number): string[];
