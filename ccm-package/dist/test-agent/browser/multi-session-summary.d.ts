import { BrowserCheckResult, BrowserMultiSessionSummary } from "../types";
export declare function buildBrowserMultiSessionSummary(browserResults: BrowserCheckResult[]): BrowserMultiSessionSummary;
export declare function formatBrowserMultiSessionSummaryLine(summary?: BrowserMultiSessionSummary): string;
export declare function formatBrowserMultiSessionAttentionLines(summary?: BrowserMultiSessionSummary, limit?: number): string[];
