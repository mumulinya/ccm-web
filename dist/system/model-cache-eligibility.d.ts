export declare const CACHE_ELIGIBILITY_CATALOG_VERSION = "official-2026-10-10-v1";
export type ModelCacheEligibility = {
    status: 'eligible' | 'ineligible' | 'unknown';
    reason: string;
    minimumTokens: number | null;
    candidateTokens: number;
    precision: 'estimated';
    source: string;
    catalogVersion: string;
};
/** Model names select documented length requirements, never write/routing authorization. */
export declare function modelCacheEligibility(config: any, candidateTokens: number): ModelCacheEligibility;
