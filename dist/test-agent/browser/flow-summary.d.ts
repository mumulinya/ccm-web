import { BrowserCheckResult, BrowserFlowSummary } from "../types";
export declare function buildBrowserFlowSummary(browserResults: BrowserCheckResult[]): BrowserFlowSummary;
export declare function formatBrowserFlowSummaryLine(summary?: BrowserFlowSummary): string;
export declare function formatBrowserFlowAttentionLines(summary?: BrowserFlowSummary, limit?: number): string[];
