"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectBrowserProviderPreflight = collectBrowserProviderPreflight;
exports.runBrowserVerificationWithProviders = runBrowserVerificationWithProviders;
const provider_types_1 = require("./provider-types");
const mcp_provider_1 = require("./mcp-provider");
const playwright_provider_1 = require("./playwright-provider");
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
    const context = { workOrder, runtime };
    const ordered = orderedProviders(preferred);
    const blocked = [];
    for (const provider of ordered) {
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
