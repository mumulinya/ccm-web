import { BrowserCheckSpec, BrowserCheckResult, NormalizedTestAgentProjectTarget, NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "../types";
export interface BrowserProviderContext {
    workOrder: NormalizedTestAgentWorkOrder;
    runtime: TestAgentRuntimeOptions;
    checkFilter?: (project: NormalizedTestAgentProjectTarget, check: BrowserCheckSpec, index: number) => boolean;
}
export interface BrowserProviderAvailability {
    available: boolean;
    reason?: string;
    tools?: string[];
    diagnostics?: Record<string, any>;
}
export interface BrowserProvider {
    id: "playwright" | "mcp";
    label: string;
    availability: (context: BrowserProviderContext) => Promise<BrowserProviderAvailability>;
    run: (context: BrowserProviderContext) => Promise<BrowserCheckResult[]>;
}
export declare function blockedBrowserResult(provider: BrowserCheckResult["provider"], name: string, error: string): BrowserCheckResult;
