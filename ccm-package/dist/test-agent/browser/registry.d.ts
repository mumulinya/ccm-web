import { BrowserCheckResult, NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "../types";
import { BrowserProvider } from "./provider-types";
export interface BrowserProviderPreflightResult {
    provider: BrowserProvider["id"];
    label: string;
    preferred: boolean;
    available: boolean;
    reason?: string;
    tools?: string[];
    diagnostics?: Record<string, any>;
}
export declare function collectBrowserProviderPreflight(workOrder: NormalizedTestAgentWorkOrder, runtime?: TestAgentRuntimeOptions): Promise<BrowserProviderPreflightResult[]>;
export declare function runBrowserVerificationWithProviders(workOrder: NormalizedTestAgentWorkOrder, runtime?: TestAgentRuntimeOptions): Promise<BrowserCheckResult[]>;
