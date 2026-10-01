export type CacheAdaptiveTuning = {
    toolResultMaxTokens: number;
    filePageTokens: number;
    searchPageSize: number;
    rollingBreakpointLimit: number;
    projectionThresholdTokens: number;
    compactionWarningRatio: number;
    compactionRecommendedRatio: number;
    reason: string;
};
/** Conservative tuning from measured usage only; never changes cache identity. */
export declare function tuneCacheParameters(trend?: any): CacheAdaptiveTuning;
