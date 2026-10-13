"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterModelCacheRows = filterModelCacheRows;
exports.providerCostEvidence = providerCostEvidence;
exports.configuredModelInputCost = configuredModelInputCost;
exports.modelCacheCompletionProjection = modelCacheCompletionProjection;
exports.summarizeModelCacheRows = summarizeModelCacheRows;
const provider_usage_1 = require("./provider-usage");
const provider_cache_window_1 = require("./provider-cache-window");
const finite = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
function filterModelCacheRows(rows, filter = {}) {
    return rows.filter(row => (!filter.executionOrigin || (row.execution_origin || 'unknown') === filter.executionOrigin)
        && (!filter.requestClass || (row.attribution?.requestClass || row.requestClass) === filter.requestClass)
        && (!filter.protocol || row.protocol === filter.protocol) && (!filter.model || row.model === filter.model)
        && (!filter.from || Date.parse(row.startedAt || row.at || '') >= Date.parse(filter.from))
        && (!filter.to || Date.parse(row.startedAt || row.at || '') <= Date.parse(filter.to)));
}
function providerCostEvidence(usage = {}) {
    usage = usage || {};
    const reported = usage.providerCostReported === false ? undefined : usage.reportedCostUsd ?? usage.cost_usd ?? usage.costUsd ?? usage.cost?.usd;
    const estimate = usage.estimated_cost_usd ?? usage.estimatedCostUsd;
    return { providerCostReported: reported != null && Number.isFinite(Number(reported)),
        reportedCostUsd: reported == null || !Number.isFinite(Number(reported)) ? null : finite(reported), estimatedCostUsd: estimate == null || !Number.isFinite(Number(estimate)) ? null : finite(estimate) };
}
function configuredModelInputCost(rates, usage, protocol = 'openai') {
    const normalized = (0, provider_usage_1.normalizeProviderUsage)(usage, protocol);
    if (!normalized.reported || !rates)
        return null;
    const buckets = [[normalized.directInputTokens, rates.input], [normalized.cacheReadInputTokens, rates.read], [normalized.cacheCreationInputTokens, rates.create]];
    if (buckets.some(([tokens, price]) => tokens > 0 && (price == null || !Number.isFinite(Number(price)) || Number(price) < 0)))
        return null;
    if (!buckets.some(([, price]) => price != null))
        return null;
    return buckets.reduce((sum, [tokens, price]) => sum + tokens * Number(price || 0) / 1_000_000, 0);
}
function modelCacheCompletionProjection(plan, usage, input) {
    const normalized = (0, provider_usage_1.normalizeProviderUsage)(usage, plan?.provider);
    return { execution_origin: input.execution_origin || 'unknown', binding_mode: input.binding_mode || 'unattributed',
        cache_preparation_status: input.cache_preparation_status || 'unknown',
        cache_eligibility: input.cache_eligibility || plan?.cacheEligibility?.status || 'unknown',
        cache_eligibility_reason: input.cache_eligibility_reason || plan?.cacheEligibility?.reason || 'provider_conditions_unknown',
        cache_usage_reported: normalized.cacheUsageReported, cacheUsageReported: normalized.cacheUsageReported,
        ...providerCostEvidence(usage) };
}
/** Rates use final logical results; spending always counts physical attempts. */
function summarizeModelCacheRows(rows) {
    const window = (0, provider_cache_window_1.providerCacheWindow)(rows);
    const terminal = window.physical;
    const samples = window.logical;
    const cacheReported = samples.filter(provider_cache_window_1.cacheUsageKnown);
    const physicalReported = terminal.filter(row => row.usageReported || row.providerUsageReported);
    const input = physicalReported.reduce((sum, row) => sum + finite(row.totalInputTokens ?? row.providerInputTokens), 0);
    const comparable = physicalReported.filter(provider_cache_window_1.cacheUsageKnown);
    const knownInput = comparable.reduce((sum, row) => sum + finite(row.totalInputTokens ?? row.providerInputTokens), 0);
    const cached = comparable.reduce((sum, row) => sum + finite(row.cacheReadInputTokens ?? row.cacheReadTokens), 0);
    const prepared = samples.filter(row => ['prepared', 'prepared_legacy_wire'].includes(row.cache_preparation_status));
    const costReported = terminal.filter(row => row.reportedCostUsd != null);
    const costEstimated = terminal.filter(row => row.estimatedCostUsd != null);
    return { request_hit_rate: cacheReported.length ? cacheReported.filter(row => finite(row.cacheReadInputTokens ?? row.cacheReadTokens) > 0).length / cacheReported.length : null,
        token_reuse_rate: knownInput > 0 ? cached / knownInput : null,
        total_input_tokens: input, cache_known_input_tokens: knownInput,
        cache_token_reporting_coverage: input > 0 ? knownInput / input : null,
        baseline_only_rate: cacheReported.length ? cacheReported.filter(row => row.providerCacheReuseClass === 'baseline_only').length / cacheReported.length : null,
        cache_preparation_coverage: samples.length ? prepared.length / samples.length : null,
        logical_calls: samples.length, physical_attempts: terminal.length, cache_reported_calls: cacheReported.length,
        cache_unreported_calls: samples.length - cacheReported.length, reported_cost_usd: costReported.length ? costReported.reduce((sum, row) => sum + finite(row.reportedCostUsd), 0) : null,
        estimated_cost_usd: costEstimated.length ? costEstimated.reduce((sum, row) => sum + finite(row.estimatedCostUsd), 0) : null,
        cost_unreported_attempts: terminal.length - costReported.length,
        by_origin: Object.fromEntries(['business', 'test', 'probe', 'unknown'].map(origin => [origin, terminal.filter(row => (row.execution_origin || 'unknown') === origin).length])),
        contentStored: false };
}
//# sourceMappingURL=model-cache-metrics.js.map