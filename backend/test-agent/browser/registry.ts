import { BrowserCheckResult, NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "../types";
import { blockedBrowserResult, BrowserProvider, BrowserProviderAvailability } from "./provider-types";
import { McpBrowserProvider } from "./mcp-provider";
import { PlaywrightBrowserProvider } from "./playwright-provider";
import { wantsBrowser } from "./shared";

export interface BrowserProviderPreflightResult {
  provider: BrowserProvider["id"];
  label: string;
  preferred: boolean;
  available: boolean;
  reason?: string;
  tools?: string[];
  diagnostics?: Record<string, any>;
}

function preferredProvider(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions) {
  return runtime.browserProvider || workOrder.options.browserProvider || "auto";
}

function orderedProviders(preferred: string): BrowserProvider[] {
  return preferred === "mcp"
    ? [McpBrowserProvider, PlaywrightBrowserProvider]
    : preferred === "playwright"
      ? [PlaywrightBrowserProvider, McpBrowserProvider]
      : [PlaywrightBrowserProvider, McpBrowserProvider];
}

function availabilityToPreflight(provider: BrowserProvider, preferred: string, availability: BrowserProviderAvailability): BrowserProviderPreflightResult {
  return {
    provider: provider.id,
    label: provider.label,
    preferred: preferred === provider.id || preferred === "auto",
    available: availability.available,
    reason: availability.reason,
    tools: availability.tools,
    diagnostics: availability.diagnostics,
  };
}

export async function collectBrowserProviderPreflight(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions = {}): Promise<BrowserProviderPreflightResult[]> {
  if (!wantsBrowser(workOrder)) return [];
  const preferred = preferredProvider(workOrder, runtime);
  if (preferred === "none") return [];
  const context = { workOrder, runtime };
  const results: BrowserProviderPreflightResult[] = [];
  for (const provider of orderedProviders(preferred)) {
    try {
      results.push(availabilityToPreflight(provider, preferred, await provider.availability(context)));
    } catch (error: any) {
      results.push({
        provider: provider.id,
        label: provider.label,
        preferred: preferred === provider.id || preferred === "auto",
        available: false,
        reason: error.message || String(error),
      });
    }
  }
  return results;
}

export async function runBrowserVerificationWithProviders(workOrder: NormalizedTestAgentWorkOrder, runtime: TestAgentRuntimeOptions = {}): Promise<BrowserCheckResult[]> {
  if (!wantsBrowser(workOrder)) return [];
  const preferred = preferredProvider(workOrder, runtime);
  if (preferred === "none") return [];

  const context = { workOrder, runtime };
  const ordered = orderedProviders(preferred);

  const blocked: BrowserCheckResult[] = [];
  for (const provider of ordered) {
    const availability = await provider.availability(context);
    if (!availability.available) {
      blocked.push(blockedBrowserResult(provider.id, `${provider.label} availability`, availability.reason || "provider unavailable"));
      continue;
    }
    const results = await provider.run(context);
    if (results.length && !results.every(item => item.status === "blocked")) return results;
    blocked.push(...results);
  }
  return blocked.length ? blocked : [blockedBrowserResult("none", "Browser verification", "No browser provider was available.")];
}
