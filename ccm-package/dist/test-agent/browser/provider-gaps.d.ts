import { BrowserCheckResult, BrowserProviderGapItem, NormalizedTestAgentWorkOrder } from "../types";
export interface BrowserProviderPlanWarning {
    provider: string;
    project: string;
    check: string;
    kind: "action" | "assertion" | "context" | "artifact" | "provider";
    item?: string;
    category: "requires_playwright" | "provider_disabled" | "provider_dependent";
    reason: string;
    recommendation: string;
}
export declare function buildBrowserProviderGaps(results: BrowserCheckResult[]): BrowserProviderGapItem[];
export declare function formatBrowserProviderGapLine(item: BrowserProviderGapItem): string;
export declare function buildBrowserProviderPlanWarnings(workOrder: NormalizedTestAgentWorkOrder): BrowserProviderPlanWarning[];
export declare function formatBrowserProviderPlanWarningLine(item: BrowserProviderPlanWarning): string;
