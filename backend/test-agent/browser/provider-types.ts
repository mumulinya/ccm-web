import {
  BrowserCheckResult,
  NormalizedTestAgentWorkOrder,
  TestAgentRuntimeOptions,
} from "../types";
import { nowIso } from "../utils";

export interface BrowserProviderContext {
  workOrder: NormalizedTestAgentWorkOrder;
  runtime: TestAgentRuntimeOptions;
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

export function blockedBrowserResult(provider: BrowserCheckResult["provider"], name: string, error: string): BrowserCheckResult {
  const at = nowIso();
  return {
    provider,
    project: "",
    name,
    url: "",
    status: "blocked",
    startedAt: at,
    finishedAt: at,
    durationMs: 0,
    steps: [],
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    error,
  };
}
