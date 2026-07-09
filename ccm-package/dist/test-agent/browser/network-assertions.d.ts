import { BrowserAssertionSpec } from "../types";
export interface ParsedBrowserNetworkLine {
    kind: "request" | "response" | "failed" | "unknown";
    line: string;
    method?: string;
    status?: number;
    resourceType?: string;
    url?: string;
    headersText?: string;
    headers?: Record<string, string>;
    body?: string;
}
export declare function parseBrowserNetworkLine(rawLine: string): ParsedBrowserNetworkLine;
export declare function browserNetworkAssertionHasExpectation(assertion: BrowserAssertionSpec): boolean;
export declare function browserNetworkAssertionIsNegative(assertion: BrowserAssertionSpec): boolean;
export declare function browserNetworkAssertionSettleMs(assertion: BrowserAssertionSpec, defaultTimeout: number, fallback?: number): number;
export declare function browserNetworkAssertionDetail(assertion: BrowserAssertionSpec): string;
export declare function findMatchingBrowserNetworkLine(lines: string[], assertion: BrowserAssertionSpec): string;
export declare function waitForAbsentBrowserNetworkLine(lines: string[], assertion: BrowserAssertionSpec, settleMs: number): Promise<string>;
export declare function waitForBrowserNetworkLine(lines: string[], assertion: BrowserAssertionSpec, timeout: number): Promise<string>;
