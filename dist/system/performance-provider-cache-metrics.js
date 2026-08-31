"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPerformanceProviderCacheMetrics = buildPerformanceProviderCacheMetrics;
const provider_cache_scope_metrics_1 = require("./provider-cache-scope-metrics");
function buildPerformanceProviderCacheMetrics(groups = [], projects = []) {
    const bindings = [{ scope: "global", scopeId: "global", sessionId: "" }];
    for (const group of groups) {
        const id = String(group?.id || "").trim();
        if (id)
            bindings.push({ scope: "group", scopeId: id, sessionId: "" });
    }
    for (const project of projects) {
        const id = String(project?.id || "").trim();
        if (id)
            bindings.push({ scope: "project", scopeId: id, sessionId: "" });
    }
    const projections = (0, provider_cache_scope_metrics_1.readProviderCacheScopeMetricsBatch)(bindings);
    const scopes = Object.fromEntries(bindings.map((binding, index) => [
        `${binding.scope}:${binding.scopeId}`,
        projections[index]?.scope || null,
    ]));
    return {
        schema: "ccm-performance-provider-cache-metrics-v1",
        scopes,
        contentStored: false,
    };
}
//# sourceMappingURL=performance-provider-cache-metrics.js.map