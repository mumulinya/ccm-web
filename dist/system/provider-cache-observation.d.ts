/** Local plan history cannot establish whether a remote cache is cold. */
export type ProviderCacheReuseClass = "full_reuse" | "partial_reuse" | "baseline_only" | "miss" | "unreported";
type ProviderCacheObservationEvidence = {
    candidateTokens?: number;
    matchedTokens?: number;
    matchingPrefixTokensEstimate?: number;
    hasComparableProviderEvidence?: boolean;
    /**
     * The local side of the comparison that produced candidateTokens.  A
     * current_request_only candidate describes the bytes in this request; it
     * does not prove that the Provider reused the previous session prefix.
     */
    candidateSource?: string;
};
export declare function providerCacheObservation(plan: any, usageReported: boolean, cacheReadTokens: number, evidence?: ProviderCacheObservationEvidence): {
    localHistoryState: "existing" | "first_request";
    providerCacheObservation: "unreported" | "miss" | "hit";
    cacheMissReason: string;
    providerCacheReuseClass: ProviderCacheReuseClass;
    providerCacheCandidateTokens: number;
    providerCacheMatchedTokens: number;
    providerCachePartialReason: string;
    providerCacheColdStart: boolean;
    providerCacheComparableEvidence: boolean;
    providerCacheCandidateSource: string;
};
export {};
