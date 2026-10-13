"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextRollingMetrics = nextRollingMetrics;
const provider_cache_scope_metrics_1 = require("./provider-cache-scope-metrics");
const provider_cache_window_1 = require("./provider-cache-window");
function nextRollingMetrics(current, completion, plan) {
    const previous = current?.rollingMetrics || {};
    const samples = Math.max(0, Number(previous.samples || 0));
    const nextSamples = samples + 1;
    const reportedSamples = Math.max(0, Number(previous.reportedSamples || 0)) + (completion.providerUsageReported === true ? 1 : 0);
    const unreportedSamples = Math.max(0, Number(previous.unreportedSamples || 0)) + (completion.providerUsageReported === true ? 0 : 1);
    const average = (previousValue, nextValue, includeNext = true, sampleCount = samples) => {
        const priorCount = Math.max(0, Number(previousValue == null ? 0 : sampleCount));
        const nextCount = includeNext ? priorCount + 1 : priorCount;
        if (!nextCount)
            return null;
        return Math.round((((Number(previousValue || 0) * priorCount) + (includeNext ? Number(nextValue || 0) : 0)) / nextCount) * 1000) / 1000;
    };
    const previousForeground = Array.isArray(previous.recentForegroundSamples)
        ? previous.recentForegroundSamples.map((row) => ({ ...row, requestClass: row.requestClass || 'foreground_main' })) : [];
    const recentForegroundSamples = (0, provider_cache_window_1.providerCacheWindow)(completion.requestClass === "foreground_main"
        ? [...previousForeground, {
                at: completion.completedAt,
                requestClass: completion.requestClass, status: completion.status,
                requestKey: completion.requestAttemptId || completion.requestId,
                logicalCallId: completion.logicalCallId || completion.requestId,
                attempt: completion.attempt || 1,
                cache_usage_reported: completion.cache_usage_reported,
                providerCacheReuseClass: completion.providerCacheReuseClass,
                directInputTokens: completion.providerInputTokens,
                cacheCreationInputTokens: completion.cacheCreationInputTokens,
                hit: completion.cacheReadInputTokens > 0,
                cacheReadTokens: completion.cacheReadInputTokens,
                providerInputTokens: completion.providerInputTokens + completion.cacheCreationInputTokens + completion.cacheReadInputTokens,
                usageReported: completion.providerUsageReported === true,
                missReason: completion.cacheMissReason,
                warmState: completion.cacheWarmState,
            }]
        : previousForeground, 50).physical;
    const trend = (size) => (0, provider_cache_scope_metrics_1.providerCacheTrend)(recentForegroundSamples, size);
    return {
        schema: "ccm-context-cache-rolling-metrics-v1",
        samples: nextSamples,
        averageProjectionDurationMs: average(previous.averageProjectionDurationMs, plan.projectionDurationMs),
        averageProviderLatencyMs: average(previous.averageProviderLatencyMs, completion.providerLatencyMs),
        averageCacheHitRate: completion.cacheHitRate == null
            ? (previous.averageCacheHitRate == null ? null : previous.averageCacheHitRate)
            : average(previous.averageCacheHitRate, completion.cacheHitRate, true, Math.max(0, Number(previous.averageCacheHitSamples ?? samples))),
        averageCacheHitSamples: Math.max(0, Number(previous.averageCacheHitSamples ?? (previous.averageCacheHitRate == null ? 0 : samples))) + (completion.cacheHitRate == null ? 0 : 1),
        reportedSamples,
        unreportedSamples,
        averageReusedBlockRatio: average(previous.averageReusedBlockRatio, completion.reusedBlockCount / Math.max(1, completion.reusedBlockCount + completion.changedBlockCount)),
        totalDirectInputTokens: Math.max(0, Number(previous.totalDirectInputTokens || 0)) + completion.providerInputTokens,
        totalCacheReadInputTokens: Math.max(0, Number(previous.totalCacheReadInputTokens || 0)) + completion.cacheReadInputTokens,
        totalCacheCreationInputTokens: Math.max(0, Number(previous.totalCacheCreationInputTokens || 0)) + completion.cacheCreationInputTokens,
        totalEstimatedCostUsd: Math.round((Math.max(0, Number(previous.totalEstimatedCostUsd || 0)) + completion.estimatedInputCostUsd) * 1_000_000) / 1_000_000,
        recentForegroundSamples,
        recent20: trend(20),
        recent50: trend(50),
        lastUpdatedAt: completion.completedAt,
        contentStored: false,
    };
}
//# sourceMappingURL=provider-cache-rolling-metrics.js.map