"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectBrowserProviderPreflight = collectBrowserProviderPreflight;
exports.runBrowserVerificationWithProviders = runBrowserVerificationWithProviders;
const provider_types_1 = require("./provider-types");
const mcp_provider_1 = require("./mcp-provider");
const playwright_provider_1 = require("./playwright-provider");
const existing_session_1 = require("./existing-session");
const provider_routing_1 = require("./provider-routing");
const shared_1 = require("./shared");
function preferredProvider(workOrder, runtime) {
    return runtime.browserProvider || workOrder.options.browserProvider || "auto";
}
function orderedProviders(preferred) {
    return preferred === "mcp"
        ? [mcp_provider_1.McpBrowserProvider, playwright_provider_1.PlaywrightBrowserProvider]
        : preferred === "playwright"
            ? [playwright_provider_1.PlaywrightBrowserProvider, mcp_provider_1.McpBrowserProvider]
            : [playwright_provider_1.PlaywrightBrowserProvider, mcp_provider_1.McpBrowserProvider];
}
function availabilityToPreflight(provider, preferred, availability) {
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
async function collectBrowserProviderPreflight(workOrder, runtime = {}) {
    if (!(0, shared_1.wantsBrowser)(workOrder))
        return [];
    const preferred = preferredProvider(workOrder, runtime);
    if (preferred === "none")
        return [];
    const context = { workOrder, runtime };
    const results = [];
    for (const provider of orderedProviders(preferred)) {
        try {
            results.push(availabilityToPreflight(provider, preferred, await provider.availability(context)));
        }
        catch (error) {
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
async function runBrowserVerificationWithProviders(workOrder, runtime = {}) {
    if (!(0, shared_1.wantsBrowser)(workOrder))
        return [];
    const preferred = preferredProvider(workOrder, runtime);
    if (preferred === "none")
        return [];
    const hasExistingSessionChecks = workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).some(existing_session_1.browserCheckUsesExistingSession));
    const hasStandardChecks = workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).some(check => !(0, existing_session_1.browserCheckUsesExistingSession)(check)));
    const results = [];
    if (hasStandardChecks) {
        const standardFilter = (_project, check) => !(0, existing_session_1.browserCheckUsesExistingSession)(check);
        if (preferred === "mcp") {
            const playwrightRequiredFilter = (_project, check, index) => standardFilter(_project, check, index)
                && (0, provider_routing_1.browserProviderRouteForCheck)(workOrder, check, preferred).provider === "playwright";
            const mcpCompatibleFilter = (_project, check, index) => standardFilter(_project, check, index)
                && (0, provider_routing_1.browserProviderRouteForCheck)(workOrder, check, preferred).provider === "mcp";
            if (hasChecksMatching(workOrder, mcpCompatibleFilter)) {
                results.push(...await runProviderChain(workOrder, runtime, [mcp_provider_1.McpBrowserProvider, playwright_provider_1.PlaywrightBrowserProvider], mcpCompatibleFilter));
            }
            if (hasChecksMatching(workOrder, playwrightRequiredFilter)) {
                results.push(...await runProviderChain(workOrder, runtime, [playwright_provider_1.PlaywrightBrowserProvider], playwrightRequiredFilter));
            }
        }
        else {
            results.push(...await runProviderChain(workOrder, runtime, orderedProviders(preferred), standardFilter));
        }
    }
    if (hasExistingSessionChecks) {
        results.push(...await runProviderChain(workOrder, runtime, [mcp_provider_1.McpBrowserProvider], (_project, check) => (0, existing_session_1.browserCheckUsesExistingSession)(check)));
    }
    return results.length ? results : [(0, provider_types_1.blockedBrowserResult)("none", "Browser verification", "No browser checks were routed to a provider.")];
}
function hasChecksMatching(workOrder, checkFilter) {
    return workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria)
        .some((check, index) => checkFilter(project, check, index)));
}
async function runProviderChain(workOrder, runtime, providers, checkFilter) {
    const context = { workOrder, runtime, checkFilter };
    const blocked = [];
    for (const provider of providers) {
        const availability = await provider.availability(context);
        if (!availability.available) {
            blocked.push((0, provider_types_1.blockedBrowserResult)(provider.id, `${provider.label} availability`, availability.reason || "provider unavailable"));
            continue;
        }
        const results = await provider.run(context);
        if (results.length && !results.every(item => item.status === "blocked"))
            return results;
        blocked.push(...results);
    }
    return blocked.length ? blocked : [(0, provider_types_1.blockedBrowserResult)("none", "Browser verification", "No browser provider was available.")];
}
//# sourceMappingURL=registry.js.map