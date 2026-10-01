export type ProviderCacheCapabilityStatus = "confirmed" | "unsupported" | "unproven" | "degraded";
export type ProviderPrefixExtensionStatus = "unproven" | "confirmed" | "exact_only" | "degraded" | "unsupported";
export type ProviderExactReplayStatus = "unproven" | "confirmed" | "degraded";
export type ProviderCacheRequestClass = "foreground_main" | "auxiliary" | "probe";
export type ProviderCacheMissReason = "cold_start" | "first_request_miss" | "ttl_expired" | "stable_prefix_changed" | "tool_schema_changed" | "schema_changed" | "ccm_projection_changed" | "transcript_projection_changed" | "compaction_boundary_changed" | "scope_or_generation_changed" | "provider_usage_not_reported" | "native_fields_unproven" | "gateway_exact_replay_only" | "provider_prefix_reuse_unproven" | "provider_routing_or_eviction" | "prefix_below_provider_threshold";
export type InferenceBackendKind = "remote_api" | "vllm" | "sglang";
type ProviderCacheCapabilityEvidenceBase = {
    id: string;
    identityChecksum: string;
    interfaceFingerprint: string;
    interfaceProtocol: string;
    cacheFamily: string;
    model: string;
    inferenceBackendKind: InferenceBackendKind;
    status: ProviderCacheCapabilityStatus;
    /** Aggregate prompt-cache health, independent from Responses continuation. */
    cacheStatus?: ProviderCacheCapabilityStatus;
    promptCacheKeyStatus?: ProviderCacheCapabilityStatus;
    providerCallCount: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    backendMetricsVerified: boolean;
    checkedAt: string;
    expiresAt: string;
    reason: string;
    contentStored: false;
    checksum: string;
};
export type ProviderCacheCapabilityEvidenceV2 = ProviderCacheCapabilityEvidenceBase & {
    schema: "ccm-provider-cache-capability-evidence-v2";
    version: 2;
    source: "probe" | "official_endpoint" | "backend_metrics" | "provider_usage";
    transportIdentityChecksum: string;
    implicitCacheStatus: ProviderCacheCapabilityStatus;
    explicitFieldStatus: ProviderCacheCapabilityStatus;
    lastCacheReadTokens: number;
    hitCount: number;
    missCount: number;
    exactReplayStatus: ProviderExactReplayStatus;
    prefixExtensionStatus: ProviderPrefixExtensionStatus;
    stablePrefixChecksum?: string;
    promptCacheKeyChecksum?: string;
    foregroundHitCount: number;
    foregroundMissCount: number;
    foregroundCacheReadTokens: number;
    foregroundProviderInputTokens: number;
    auxiliaryHitCount: number;
    auxiliaryMissCount: number;
    /** Consecutive foreground samples that prove dynamic-prefix reuse. */
    prefixExtensionSuccessStreak?: number;
    /** Consecutive reported foreground misses eligible for dynamic-prefix reuse. */
    prefixExtensionMissStreak?: number;
    lastProbeResult?: "hit" | "miss" | "unreported";
    lastProbeAt?: string;
    prefixEligibleMissStreak: number;
    explicitBreakpointsVerified: boolean;
    explicitCacheKeyStatus?: ProviderCacheCapabilityStatus;
    promptCacheOptionsStatus?: ProviderCacheCapabilityStatus;
    explicitBreakpointsStatus?: ProviderCacheCapabilityStatus;
    responsesContinuationStatus?: ProviderCacheCapabilityStatus;
    responsesToolLoopContinuationStatus?: ProviderCacheCapabilityStatus;
    responsesWebSocketStatus?: ProviderCacheCapabilityStatus;
    responsesWebSocketResponseCreateStatus?: ProviderCacheCapabilityStatus;
    responsesWebSocketContinuationStatus?: ProviderCacheCapabilityStatus;
    responsesWebSocketToolLoopStatus?: ProviderCacheCapabilityStatus;
    responsesWebSocketLastFailureReason?: string;
    lastContinuationFailureReason?: string;
    blockCacheControlStatus?: ProviderCacheCapabilityStatus;
    nativeCacheEditingStatus?: ProviderCacheCapabilityStatus;
    cacheUsageReportingStatus?: ProviderCacheCapabilityStatus;
    providerRoutingMissStreak: number;
    recentForegroundSamples: Array<{
        at: string;
        hit: boolean;
        cacheReadTokens: number;
        providerInputTokens: number;
        stablePrefixChecksum: string;
        dynamicSuffixChecksum: string;
        payloadChecksum: string;
        promptCacheKeyChecksum: string;
        conversationIdentityChecksum: string;
    }>;
    lastMissReason?: ProviderCacheMissReason;
};
export declare function normalizeInferenceBackendKind(value: any): InferenceBackendKind;
export declare function providerCacheCapabilityIdentity(config: any): {
    transportIdentityChecksum: string;
    transportParametersChecksum: string;
    identityChecksum: string;
    interfaceFingerprint: string;
    interfaceProtocol: import("./provider-cache-protocol").CcmProviderCacheProtocol;
    cacheFamily: string;
    model: string;
    inferenceBackendKind: InferenceBackendKind;
};
export declare function createProviderCacheCapabilityEvidence(config: any, input: Partial<ProviderCacheCapabilityEvidenceV2> & {
    status: ProviderCacheCapabilityStatus;
}): ProviderCacheCapabilityEvidenceV2;
export declare function recordProviderCacheCapabilityEvidence(config: any, input: Partial<ProviderCacheCapabilityEvidenceV2> & {
    status: ProviderCacheCapabilityStatus;
}): {
    evidence: ProviderCacheCapabilityEvidenceV2;
    latestAttempt: ProviderCacheCapabilityEvidenceV2;
    preservedConfirmed: boolean;
};
export declare function observeProviderCacheUsage(config: any, input: {
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    providerInputTokens?: number;
    requestPatchApplied?: boolean;
    usageReported?: boolean;
    missReason?: ProviderCacheMissReason;
    requestClass?: ProviderCacheRequestClass;
    stablePrefixChecksum?: string;
    dynamicSuffixChecksum?: string;
    payloadChecksum?: string;
    promptCacheKeyChecksum?: string;
    conversationIdentityChecksum?: string;
    prefixExtensionEligible?: boolean;
    explicitBreakpointsApplied?: boolean;
    explicitCacheKeyApplied?: boolean;
    blockCacheControlApplied?: boolean;
    nativeCacheEditingApplied?: boolean;
    /** Local lower-bound estimate used only to classify explicit breakpoint evidence. */
    matchingPrefixTokensEstimate?: number;
    cacheablePrefixTokens?: number;
}): ProviderCacheCapabilityEvidenceV2;
export declare function readProviderCacheCapabilityState(config: any): {
    schema: string;
    version: number;
    identity: {
        transportIdentityChecksum: string;
        transportParametersChecksum: string;
        identityChecksum: string;
        interfaceFingerprint: string;
        interfaceProtocol: import("./provider-cache-protocol").CcmProviderCacheProtocol;
        cacheFamily: string;
        model: string;
        inferenceBackendKind: InferenceBackendKind;
    };
    status: ProviderCacheCapabilityStatus;
    cacheStatus: ProviderCacheCapabilityStatus;
    promptCacheKeyStatus: ProviderCacheCapabilityStatus;
    implicitCacheStatus: ProviderCacheCapabilityStatus;
    explicitFieldStatus: ProviderCacheCapabilityStatus;
    exactReplayStatus: ProviderExactReplayStatus;
    prefixExtensionStatus: ProviderPrefixExtensionStatus;
    explicitBreakpointsVerified: boolean;
    promptCacheOptionsStatus: ProviderCacheCapabilityStatus;
    explicitBreakpointsStatus: ProviderCacheCapabilityStatus;
    responsesContinuationStatus: ProviderCacheCapabilityStatus;
    responsesToolLoopContinuationStatus: ProviderCacheCapabilityStatus;
    responsesWebSocketStatus: ProviderCacheCapabilityStatus;
    responsesWebSocketResponseCreateStatus: ProviderCacheCapabilityStatus;
    responsesWebSocketContinuationStatus: ProviderCacheCapabilityStatus;
    responsesWebSocketToolLoopStatus: ProviderCacheCapabilityStatus;
    responsesWebSocketLastFailureReason: string;
    lastContinuationFailureReason: string;
    prefixExtensionSuccessStreak: number;
    prefixExtensionMissStreak: number;
    lastProbeResult: "unreported" | "miss" | "hit";
    lastProbeAt: string;
    providerRoutingMissStreak: number;
    lastCacheReadTokens: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    foreground: {
        hitCount: number;
        missCount: number;
        requestHitRate: number;
        cacheReadTokens: number;
        providerInputTokens: number;
        tokenReuseRate: number;
        recent20: {
            samples: number;
            hits: number;
            misses: number;
            requestHitRate: number;
            cacheReadTokens: number;
            providerInputTokens: number;
            tokenReuseRate: number;
        };
        recent50: {
            samples: number;
            hits: number;
            misses: number;
            requestHitRate: number;
            cacheReadTokens: number;
            providerInputTokens: number;
            tokenReuseRate: number;
        };
    };
    auxiliary: {
        hitCount: number;
        missCount: number;
    };
    evidence: ProviderCacheCapabilityEvidenceV2;
    latestAttempt: ProviderCacheCapabilityEvidenceV2;
    expired: boolean;
    contentStored: boolean;
};
export declare function revokeProviderCacheCapabilityEvidence(config: any): {
    success: boolean;
    removed: boolean;
    identityChecksum: string;
};
export declare function pruneProviderCacheCapabilityRegistry(options?: {
    now?: number;
    expiredRetentionDays?: number;
}): {
    removedEntries: number;
    removedAttempts: number;
    remainingEntries: number;
    remainingAttempts: number;
};
export declare function runProviderCacheCapabilityRegistrySelfTest(): {
    pass: boolean;
    checks: {
        implicitDoesNotProveExplicit: boolean;
        explicitUsageConfirmsField: boolean;
        businessUsageConfirmsPrefixExtension: boolean;
        cacheStatusIsIndependentFromContinuation: boolean;
        crossSessionPrefixReuse: boolean;
        transientFailurePreservesConfirmed: boolean;
        singleMissDoesNotDowngrade: boolean;
        threeMissesDowngradePrefixOnly: boolean;
        exactOnlyNeedsTwoHitsToRecover: boolean;
        baselineFragmentDoesNotConfirmPrefixExtension: boolean;
        baselineFragmentPreservesConfirmedBreakpoints: boolean;
        secretsNotStored: boolean;
        revokeWorks: boolean;
    };
};
export {};
