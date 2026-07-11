import {
  BrowserCheckResult,
  BrowserProviderSummary,
  BrowserProviderSummaryItem,
  NormalizedTestAgentWorkOrder,
} from "../types";

interface PreflightLike {
  provider?: string;
  label?: string;
  preferred?: boolean;
  available?: boolean;
  reason?: string;
  tools?: string[];
  diagnostics?: Record<string, any>;
}

function emptyCounts() {
  return {
    resultCount: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  };
}

function resultProvider(result: BrowserCheckResult) {
  return result.provider || "none";
}

function resultIsSelectedSignal(result: BrowserCheckResult) {
  return result.status === "passed" || result.status === "failed" || result.status === "skipped";
}

function statusFor(input: {
  preferred: string;
  hasAnyProviderEvidence: boolean;
  selectedProviders: string[];
  availableProviders: string[];
  browserResults: BrowserCheckResult[];
}): BrowserProviderSummary["status"] {
  if (!input.hasAnyProviderEvidence) return input.preferred === "none" ? "provider_none" : "not_required";
  if (input.selectedProviders.length) return "used";
  if (input.browserResults.length && input.browserResults.every(result => result.status === "blocked")) return "blocked";
  if (input.availableProviders.length) return "ready";
  return "unavailable";
}

function sortedUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function buildBrowserProviderSummary(
  workOrder: NormalizedTestAgentWorkOrder,
  browserResults: BrowserCheckResult[],
): BrowserProviderSummary {
  const preferred = workOrder.options.browserProvider || "auto";
  const preflight = Array.isArray(workOrder.metadata?.browserProviderPreflight)
    ? workOrder.metadata.browserProviderPreflight as PreflightLike[]
    : [];
  const providerKeys = sortedUnique([
    ...preflight.map(item => String(item.provider || "")),
    ...browserResults.map(resultProvider),
  ]);
  const countsByProvider = new Map<string, ReturnType<typeof emptyCounts>>();
  for (const provider of providerKeys) countsByProvider.set(provider, emptyCounts());

  for (const result of browserResults) {
    const provider = resultProvider(result);
    const counts = countsByProvider.get(provider) || emptyCounts();
    counts.resultCount += 1;
    if (result.status === "passed") counts.passed += 1;
    else if (result.status === "failed") counts.failed += 1;
    else if (result.status === "blocked") counts.blocked += 1;
    else counts.skipped += 1;
    countsByProvider.set(provider, counts);
  }

  const selectedResult = browserResults.find(resultIsSelectedSignal);
  const selectedProvider = selectedResult ? resultProvider(selectedResult) : "";
  const selectedProviders = sortedUnique(
    browserResults.filter(resultIsSelectedSignal).map(resultProvider),
  );
  const preflightByProvider = new Map(preflight.map(item => [String(item.provider || ""), item]));
  const items: BrowserProviderSummaryItem[] = providerKeys.map(provider => {
    const preflightItem = preflightByProvider.get(provider);
    const counts = countsByProvider.get(provider) || emptyCounts();
    const hasNonBlockedResult = counts.passed + counts.failed + counts.skipped > 0;
    return {
      provider,
      ...(preflightItem?.label ? { label: preflightItem.label } : {}),
      preferred: Boolean(preflightItem?.preferred || preferred === provider || preferred === "auto"),
      available: Boolean(preflightItem?.available || hasNonBlockedResult),
      selected: selectedProviders.includes(provider),
      attempted: counts.resultCount > 0,
      ...counts,
      ...(preflightItem?.reason ? { reason: preflightItem.reason } : {}),
      ...(Array.isArray(preflightItem?.tools) ? { tools: preflightItem.tools } : {}),
      ...(preflightItem?.diagnostics ? { diagnostics: preflightItem.diagnostics } : {}),
    };
  });
  const availableProviders = sortedUnique(items.filter(item => item.available).map(item => item.provider));
  const attemptedProviders = sortedUnique(items.filter(item => item.attempted).map(item => item.provider));
  const status = statusFor({
    preferred,
    hasAnyProviderEvidence: preflight.length > 0 || browserResults.length > 0,
    selectedProviders,
    availableProviders,
    browserResults,
  });

  return {
    preferred,
    status,
    ...(selectedProvider ? { selectedProvider } : {}),
    ...(selectedProviders.length ? { selectedProviders } : {}),
    availableProviders,
    attemptedProviders,
    fallbackUsed: Boolean(
      selectedProviders.length
      && preferred !== "auto"
      && preferred !== "none"
      && selectedProviders.some(provider => provider !== preferred)
    ),
    items,
  };
}

export function formatBrowserProviderSummaryLine(summary: BrowserProviderSummary | undefined) {
  if (!summary) return "status=not_required; preferred=unknown; selected=none; available=none; attempted=none; fallback=no";
  const selected = (summary.selectedProviders?.length
    ? summary.selectedProviders.join(",")
    : summary.selectedProvider) || "none";
  const available = summary.availableProviders.join(",") || "none";
  const attempted = summary.attemptedProviders.join(",") || "none";
  return `status=${summary.status}; preferred=${summary.preferred}; selected=${selected}; available=${available}; attempted=${attempted}; fallback=${summary.fallbackUsed ? "yes" : "no"}`;
}
