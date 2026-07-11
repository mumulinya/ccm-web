import { BrowserActionEffectSummary, BrowserCheckResult } from "../types";
export declare function buildBrowserActionEffectSummary(results: BrowserCheckResult[]): BrowserActionEffectSummary;
export declare function formatBrowserActionEffectSummaryLine(summary: BrowserActionEffectSummary | undefined): string;
export declare function browserActionEffectSummaryErrors(summary: BrowserActionEffectSummary | Record<string, any> | undefined, results?: BrowserCheckResult[], label?: string): string[];
