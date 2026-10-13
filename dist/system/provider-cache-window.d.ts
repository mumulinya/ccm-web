export declare function providerCacheWindow(rows: any[], size?: number): {
    logical: any[];
    physical: any[];
};
export declare function cacheUsageKnown(row: any): boolean;
/** Preparation owns the current plan; completion owns accumulated evidence. */
export declare function preserveProviderCacheHistory(previous: any): {
    completedPhysicalRequests?: any;
    rollingMetrics?: any;
    cacheWarmState: any;
    providerRoutingMissStreak: any;
    tokenCalibration: any;
};
export declare function priorProviderCacheCompletion(state: any, input: any, plan: any): any;
export declare function rememberProviderCacheCompletion(state: any, completion: any, input: any, plan: any): any[];
export declare function commitProviderCacheCompletion(input: any, plan: any): void;
