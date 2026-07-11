import { BrowserCheckSpec, NormalizedTestAgentWorkOrder } from "../types";
import { browserCheckUsesExistingSession } from "./existing-session";
import { browserCheckRequiresPlaywright } from "./provider-gaps";

export type BrowserProviderRoutingReason =
  | "provider_disabled"
  | "existing_authenticated_session"
  | "capability_requires_playwright"
  | "preferred_provider"
  | "auto_default";

export interface BrowserProviderRoute {
  provider: "playwright" | "mcp" | "none";
  reason: BrowserProviderRoutingReason;
}

export function browserProviderRouteForCheck(
  workOrder: NormalizedTestAgentWorkOrder,
  check: BrowserCheckSpec,
  preferredOverride?: string,
): BrowserProviderRoute {
  const preferred = preferredOverride || workOrder.options.browserProvider || "auto";
  if (preferred === "none") return { provider: "none", reason: "provider_disabled" };
  if (browserCheckUsesExistingSession(check)) {
    return { provider: "mcp", reason: "existing_authenticated_session" };
  }
  if (preferred === "mcp" && browserCheckRequiresPlaywright(workOrder, check)) {
    return { provider: "playwright", reason: "capability_requires_playwright" };
  }
  if (preferred === "mcp") return { provider: "mcp", reason: "preferred_provider" };
  if (preferred === "playwright") return { provider: "playwright", reason: "preferred_provider" };
  return { provider: "playwright", reason: "auto_default" };
}
