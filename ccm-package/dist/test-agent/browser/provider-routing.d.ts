import { BrowserCheckSpec, NormalizedTestAgentWorkOrder } from "../types";
export type BrowserProviderRoutingReason = "provider_disabled" | "existing_authenticated_session" | "capability_requires_playwright" | "preferred_provider" | "auto_default";
export interface BrowserProviderRoute {
    provider: "playwright" | "mcp" | "none";
    reason: BrowserProviderRoutingReason;
}
export declare function browserProviderRouteForCheck(workOrder: NormalizedTestAgentWorkOrder, check: BrowserCheckSpec, preferredOverride?: string): BrowserProviderRoute;
