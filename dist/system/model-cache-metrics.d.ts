export type ModelCacheFilters = {
    executionOrigin?: string;
    requestClass?: string;
    protocol?: string;
    model?: string;
    from?: string;
    to?: string;
    limit?: number;
};
export declare function filterModelCacheRows<T extends Record<string, any>>(rows: T[], filter?: ModelCacheFilters): T[];
export declare function providerCostEvidence(usage?: any): {
    providerCostReported: boolean;
    reportedCostUsd: number;
    estimatedCostUsd: number;
};
export declare function configuredModelInputCost(rates: any, usage: any, protocol?: string): number | null;
export declare function modelCacheCompletionProjection(plan: any, usage: any, input: any): {
    providerCostReported: boolean;
    reportedCostUsd: number;
    estimatedCostUsd: number;
    execution_origin: any;
    binding_mode: any;
    cache_preparation_status: any;
    cache_eligibility: any;
    cache_eligibility_reason: any;
    cache_usage_reported: boolean;
    cacheUsageReported: boolean;
};
/** Rates use final logical results; spending always counts physical attempts. */
export declare function summarizeModelCacheRows(rows: any[]): {
    request_hit_rate: number;
    token_reuse_rate: number;
    total_input_tokens: any;
    cache_known_input_tokens: any;
    cache_token_reporting_coverage: number;
    baseline_only_rate: number;
    cache_preparation_coverage: number;
    logical_calls: number;
    physical_attempts: number;
    cache_reported_calls: number;
    cache_unreported_calls: number;
    reported_cost_usd: any;
    estimated_cost_usd: any;
    cost_unreported_attempts: number;
    by_origin: {
        [k: string]: number;
    };
    contentStored: boolean;
};
