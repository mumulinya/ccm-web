export type CcmCachePromptSegmentsV1 = {
    schema: "ccm-cache-prompt-segments-v1";
    stableCore: unknown;
    stableTools: unknown;
    scopeDirectory: unknown;
    sessionContext: unknown;
    turnContext: unknown;
    toolResults: unknown;
    stablePrefixChecksum: string;
    dynamicSuffixChecksum: string;
    cacheEpoch: number;
    cacheablePrefixTokens: number;
    uncachedSuffixTokens: number;
    stableCoreTokens: number;
    stableToolSchemaTokens: number;
    rollingHistoryTokens: number;
    rollingToolResultTokens: number;
    activeToolResultTokens: number;
    duplicateToolResultTokens: number;
    breakpointEligibility: "eligible" | "ineligible" | "unknown";
    breakpointApplied: boolean;
    rollingBreakpointIndex: number;
    rollingBreakpointReason: string;
    firstDivergenceKind: string;
    firstDivergenceIndex: number;
    routeFingerprint: string;
    providerCacheReadTokens: number;
    microCompactApplied: boolean;
    microCompactReason: string;
    clearedToolResultCount: number;
    clearedToolResultTokens: number;
    retainedToolResultTokens: number;
    boundaryChecksum: string;
    contentStored: false;
};
export declare function detectDynamicPrefixLeak(value: unknown): boolean;
/**
 * Build the cache-facing prompt layout without retaining prompt bodies. The
 * raw transcript remains owned by the execution ledger; this projection is
 * safe to persist and is only used for cache diagnostics and routing.
 */
export declare function buildCcmCachePromptSegmentsV1(input: {
    blocks?: any[];
    messages?: any[];
    stablePrefixChecksum?: string;
    dynamicSuffixChecksum?: string;
    cacheEpoch?: number;
    toolSchemaChecksum?: string;
    toolSchemaTokens?: number;
    toolSchemaVersion?: string;
    toolSchemaStableRuns?: number;
    toolSchemaPrefixEligible?: boolean;
    breakpointEligibility?: "eligible" | "ineligible" | "unknown";
    breakpointApplied?: boolean;
    rollingBreakpointIndex?: number;
    rollingBreakpointReason?: string;
    firstDivergenceKind?: string;
    firstDivergenceIndex?: number;
    routeFingerprint?: string;
    providerCacheReadTokens?: number;
    microCompactApplied?: boolean;
    microCompactReason?: string;
    clearedToolResultCount?: number;
    clearedToolResultTokens?: number;
    retainedToolResultTokens?: number;
    boundaryChecksum?: string;
}): CcmCachePromptSegmentsV1;
export declare function runProviderCachePromptSegmentsSelfTest(): {
    pass: boolean;
    checks: {
        deterministic: boolean;
        rollingToolResultRecorded: boolean;
        activeToolResultRecorded: boolean;
        noNegativeDuplicateTokens: boolean;
        contentNotStored: boolean;
    };
    result: CcmCachePromptSegmentsV1;
};
