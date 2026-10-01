import { BrowserCheckResult, BrowserProviderSummary, NormalizedTestAgentWorkOrder } from "../types";
export declare function buildBrowserProviderSummary(workOrder: NormalizedTestAgentWorkOrder, browserResults: BrowserCheckResult[]): BrowserProviderSummary;
export declare function formatBrowserProviderSummaryLine(summary: BrowserProviderSummary | undefined): string;
