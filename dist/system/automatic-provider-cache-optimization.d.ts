import type { CcmProviderCacheCapabilityMatrixV1, CapabilityStatus } from "./provider-cache-capability-matrix";
import { type CcmAgentCacheAffinityV1 } from "./agent-cache-affinity";
export declare const CCM_STABLE_PROMPT_VERSION = "ccm-main-agent-stable-core-v2";
export declare const CCM_CACHE_ROUTE_VERSION = 11;
export declare const CCM_CACHE_KEY_PREFIX = "ccm-v11-";
export type CcmAutomaticCacheOptimizationV1 = {
    schema: "ccm-automatic-cache-optimization-v1";
    enabled: true;
    effectiveStrategy: "explicit_breakpoints" | "explicit_cache_key" | "implicit_prefix" | "stable_prefix_only";
    cacheKeyScope: "conversation_branch";
    stableCoreChecksum: string;
    stableCoreTokens: number;
    capabilityStatus: CapabilityStatus;
    fallbackReason?: string;
    prefixChangeReasons: string[];
    agentCacheAffinity?: Pick<CcmAgentCacheAffinityV1, "agentRole" | "stage" | "runtimeOwnership" | "stablePromptVersion" | "cacheKeyProfile">;
    contentStored: false;
};
export type CcmCacheLifecycleMetricsV1 = {
    cacheState: "cold" | "warming" | "warm" | "expired" | "degraded";
    ttlSource: "provider_default" | "30m" | "1h" | "24h" | "unknown";
    stablePrefixTokens: number;
    stablePrefixBlockCount: number;
    breakpointCount: number;
    cacheKeyScope: "conversation_branch";
    cacheIdentityPersistent?: true;
    localMaterializationStatus?: "computed" | "memory_hot_cache" | "shared_state" | "recomputed_after_local_eviction";
    providerTtlHint?: string;
    idleDurationMs?: number;
    identityResetReason?: string;
    missReason?: "cold_start" | "first_request_miss" | "ttl_expired" | "stable_prefix_changed" | "tool_schema_changed" | "dynamic_prefix_leak" | "schema_changed" | "ccm_projection_changed" | "transcript_projection_changed" | "compaction_boundary_changed" | "provider_routing_or_eviction" | "provider_usage_unreported";
    contentStored: false;
};
/** Usage is observational; misses must never rotate a shared routing key. */
export declare function observeAutomaticProviderCacheRouting(config: any, plan: any, matrix: CcmProviderCacheCapabilityMatrixV1, input: boolean | {
    hit: boolean;
    eligible: boolean;
    missReason?: string;
    stablePrefixChecksum?: string;
    promptCacheKeyChecksum?: string;
}): {
    shardCount: number;
    missStreak: number;
    trafficPerMinute: number;
    eligible: boolean;
};
export declare function buildAutomaticProviderCacheKey(config: any, plan: any, matrix: CcmProviderCacheCapabilityMatrixV1): string;
export declare function automaticProviderCacheTtl(matrix: CcmProviderCacheCapabilityMatrixV1): "provider_default";
export declare function buildAutomaticCacheOptimizationProjection(input: {
    matrix?: CcmProviderCacheCapabilityMatrixV1;
    execution: any;
    stableCoreChecksum?: string;
    stableCoreTokens?: number;
    prefixChangeReasons?: string[];
    fallbackReason?: string;
    cacheAffinity?: CcmAgentCacheAffinityV1 | null;
}): CcmAutomaticCacheOptimizationV1;
export declare function automaticProviderCacheEnabled(): boolean;
export declare function runAutomaticProviderCacheOptimizationSelfTest(): {
    pass: boolean;
    checks: {
        projectSessionsAreIsolated: boolean;
        projectsAreIsolated: boolean;
        groupsAreIsolated: boolean;
        globalSessionsAreIsolated: boolean;
        scopesAreIsolated: boolean;
        projectsWithSamePublicPrefixAreIsolated: boolean;
        projectsWithDifferentPublicPrefixStayIsolated: boolean;
        testAgentProjectSessionsAreIsolated: boolean;
        testAgentStagesStayIsolated: boolean;
        mainScopesUseSeparateConversationBranches: boolean;
        auxiliaryStageStaysIsolatedFromMain: boolean;
        auxiliaryRequestOverridesInheritedMainAffinity: boolean;
        probeRequestOverridesInheritedMainAffinity: boolean;
        routeAndWireVersionsAlign: boolean;
        keyLengthSafe: boolean;
        highTrafficExactSessionKeyStaysStable: boolean;
    };
};
