"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tuneCacheParameters = tuneCacheParameters;
/** Conservative tuning from measured usage only; never changes cache identity. */
function tuneCacheParameters(trend = {}) {
    const samples = Math.max(0, Number(trend.samples || trend.reportedSamples || 0));
    const dynamicRate = Number.isFinite(Number(trend.dynamicSuffixRate)) ? Number(trend.dynamicSuffixRate) : 0;
    const hitRate = Number.isFinite(Number(trend.requestHitRate)) ? Number(trend.requestHitRate) : 0;
    if (samples < 3)
        return { toolResultMaxTokens: 2000, filePageTokens: 4000, searchPageSize: 50, rollingBreakpointLimit: 2, projectionThresholdTokens: 2000, compactionWarningRatio: .6, compactionRecommendedRatio: .7, reason: 'insufficient_samples' };
    if (dynamicRate >= .7)
        return { toolResultMaxTokens: 1200, filePageTokens: 2400, searchPageSize: 30, rollingBreakpointLimit: 2, projectionThresholdTokens: 1600, compactionWarningRatio: .6, compactionRecommendedRatio: .7, reason: 'dynamic_tail_high' };
    if (hitRate < .35)
        return { toolResultMaxTokens: 2000, filePageTokens: 4000, searchPageSize: 50, rollingBreakpointLimit: 1, projectionThresholdTokens: 2000, compactionWarningRatio: .6, compactionRecommendedRatio: .7, reason: 'cache_reuse_unproven' };
    return { toolResultMaxTokens: 2400, filePageTokens: 4800, searchPageSize: 60, rollingBreakpointLimit: 3, projectionThresholdTokens: 2200, compactionWarningRatio: .6, compactionRecommendedRatio: .7, reason: 'stable_observed' };
}
//# sourceMappingURL=cache-adaptive-tuning.js.map