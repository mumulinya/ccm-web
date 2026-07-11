import { BrowserCheckResult, BrowserRecoverySummary } from "../types";
export declare function buildBrowserRecoverySummary(results: BrowserCheckResult[]): BrowserRecoverySummary;
export declare function formatBrowserRecoverySummaryLine(summary: BrowserRecoverySummary | undefined): string;
