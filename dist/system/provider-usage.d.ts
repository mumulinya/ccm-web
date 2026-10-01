/**
 * Normalize provider usage without guessing that a provider's `input_tokens`
 * field is either cached-only or uncached-only. Callers receive a single
 * direct-input value and can account cached/created tokens exactly once.
 */
export type NormalizedProviderUsage = {
    reported: boolean;
    directInputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    totalContextTokens: number;
    providerTotalTokens: number;
    outputTokens: number;
    inputTokensIncludesCache: boolean;
};
export declare function normalizeProviderUsage(value?: any, _provider?: string): NormalizedProviderUsage;
export declare function providerUsageSelfTest(): {
    pass: boolean;
    explicit: NormalizedProviderUsage;
    included: NormalizedProviderUsage;
    openAiDetails: NormalizedProviderUsage;
    explicitZero: NormalizedProviderUsage;
    unreported: NormalizedProviderUsage;
};
