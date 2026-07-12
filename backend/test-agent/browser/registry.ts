import { BrowserCheckResult, NormalizedTestAgentWorkOrder, TestAgentRuntimeOptions } from "../types";
import { blockedBrowserResult, BrowserProvider, BrowserProviderAvailability, BrowserProviderContext } from "./provider-types";
import { McpBrowserProvider } from "./mcp-provider";
import { PlaywrightBrowserProvider } from "./playwright-provider";
import { browserCheckUsesExistingSession } from "./existing-session";
import { browserProviderRouteForCheck } from "./provider-routing";
import { checksForProject, wantsBrowser } from "./shared";
import {
  buildBrowserCheckExecutionPlan,
  reconcileBrowserCheckExecution,
} from "./check-execution-coverage";
import { browserResultHasToolCallTimeout } from "./tool-call-timeout";

export interface BrowserProviderPreflightResult {
  provider: BrowserProvider["id"];
  label: string;
  preferred: boolean;
  available: boolean;
  reason?: string;
  tools?: string[];
  diagnostics?: Record<string, any>;
}

type BrowserCheckFilter = NonNullable<BrowserProviderContext["checkFilter"]>;

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
  const plan = buildBrowserCheckExecutionPlan(workOrder, preferred);
  workOrder.metadata = {
    ...workOrder.metadata,
    browserCheckExecutionPlan: plan,
  };
  let providerResults: BrowserCheckResult[];
  try {
    providerResults = preferred === "none"
      ? []
      : await runRoutedBrowserProviders(workOrder, runtime, preferred);
  } catch (error: any) {
    providerResults = [blockedBrowserResult(
      "none",
      "Browser provider orchestration",
      error?.message || String(error),
    )];
  }
  const reconciled = reconcileBrowserCheckExecution(plan, providerResults);
  workOrder.metadata = {
    ...workOrder.metadata,
    browserCheckExecutionCoverage: reconciled.summary,
  };
  return reconciled.results;
}

async function runRoutedBrowserProviders(
  workOrder: NormalizedTestAgentWorkOrder,
  runtime: TestAgentRuntimeOptions,
  preferred: string,
): Promise<BrowserCheckResult[]> {
  const hasExistingSessionChecks = workOrder.projects.some(project =>
    checksForProject(project, workOrder.acceptanceCriteria).some(browserCheckUsesExistingSession)
  );
  const hasStandardChecks = workOrder.projects.some(project =>
    checksForProject(project, workOrder.acceptanceCriteria).some(check => !browserCheckUsesExistingSession(check))
  );
  const results: BrowserCheckResult[] = [];

  if (hasStandardChecks) {
    const standardFilter: BrowserCheckFilter = (_project, check) =>
      !browserCheckUsesExistingSession(check);
    if (preferred === "mcp") {
      const playwrightRequiredFilter: BrowserCheckFilter = (_project, check, index) =>
        standardFilter(_project, check, index)
        && browserProviderRouteForCheck(workOrder, check, preferred).provider === "playwright";
      const mcpCompatibleFilter: BrowserCheckFilter = (_project, check, index) =>
        standardFilter(_project, check, index)
        && browserProviderRouteForCheck(workOrder, check, preferred).provider === "mcp";
      if (hasChecksMatching(workOrder, mcpCompatibleFilter)) {
        results.push(...await runProviderChain(
          workOrder,
          runtime,
          [McpBrowserProvider, PlaywrightBrowserProvider],
          mcpCompatibleFilter,
        ));
      }
      if (hasChecksMatching(workOrder, playwrightRequiredFilter)) {
        results.push(...await runProviderChain(
          workOrder,
          runtime,
          [PlaywrightBrowserProvider],
          playwrightRequiredFilter,
        ));
      }
    } else {
      results.push(...await runProviderChain(
        workOrder,
        runtime,
        orderedProviders(preferred),
        standardFilter,
      ));
    }
  }
  if (hasExistingSessionChecks) {
    results.push(...await runProviderChain(
      workOrder,
      runtime,
      [McpBrowserProvider],
      (_project, check) => browserCheckUsesExistingSession(check),
    ));
  }
  return results.length ? results : [blockedBrowserResult("none", "Browser verification", "No browser checks were routed to a provider.")];
}

function hasChecksMatching(
  workOrder: NormalizedTestAgentWorkOrder,
  checkFilter: BrowserCheckFilter,
) {
  return workOrder.projects.some(project =>
    checksForProject(project, workOrder.acceptanceCriteria)
      .some((check, index) => checkFilter(project, check, index))
  );
}

async function runProviderChain(
  workOrder: NormalizedTestAgentWorkOrder,
  runtime: TestAgentRuntimeOptions,
  providers: BrowserProvider[],
  checkFilter: BrowserCheckFilter,
) {
  const context = { workOrder, runtime, checkFilter };
  const blocked: BrowserCheckResult[] = [];
  for (const provider of providers) {
    const availability = await provider.availability(context);
    if (!availability.available) {
      blocked.push(blockedBrowserResult(provider.id, `${provider.label} availability`, availability.reason || "provider unavailable"));
      continue;
    }
    const results = await provider.run(context);
    if (results.some(browserResultHasToolCallTimeout)) return results;
    if (results.length && !results.every(item => item.status === "blocked")) return results;
    blocked.push(...results);
  }
  return blocked.length ? blocked : [blockedBrowserResult("none", "Browser verification", "No browser provider was available.")];
}
