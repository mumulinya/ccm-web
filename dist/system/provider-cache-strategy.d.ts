import { CcmProviderCacheCapabilityMatrixV1 } from "./provider-cache-capability-matrix";
export type CcmResolvedCacheExecutionV1 = {
    schema: "ccm-resolved-cache-execution-v1";
    prefixMode: "stable_only" | "implicit" | "explicit";
    /** session_key is the legacy wire-contract name; routing now shares scope/profile. */
    keyMode: "none" | "session_key";
    breakpointMode: "none" | "static" | "static_and_rolling";
    editingMode: "none" | "native" | "controlled";
    ttl: "provider_default" | "30m" | "1h" | "24h";
    evidenceChecksum: string;
    contentStored: false;
};
export type CcmProviderCacheStrategyV3 = {
    schema: "ccm-provider-cache-strategy-v3";
    mode: "auto" | "implicit" | "explicit";
    transport: "chat_completions_key" | "responses_implicit" | "responses_explicit" | "anthropic_cache_control" | "gemini_implicit" | "stable_prefix";
    ttl: "provider_default" | "30m" | "1h" | "24h";
    explicitBreakpointsVerified: boolean;
    execution: CcmResolvedCacheExecutionV1;
    capabilityMatrix: CcmProviderCacheCapabilityMatrixV1;
    contentStored: false;
};
export declare function resolveProviderCacheExecutionV1(config: any, matrixInput?: CcmProviderCacheCapabilityMatrixV1): CcmResolvedCacheExecutionV1;
export declare function resolveProviderCacheStrategyV3(config: any, capability: any): CcmProviderCacheStrategyV3;
export declare function responsesPromptCacheOptions(strategy: CcmProviderCacheStrategyV3, explicitBreakpointCount?: number): {
    mode: "implicit";
};
export declare function runProviderCacheStrategySelfTest(): {
    pass: boolean;
    checks: {
        responsesUsesStableKeyWithConfirmedBreakpoints: boolean;
        evidenceChecksumPresent: boolean;
        evidenceRefreshDoesNotChangeBreakpointLayout: boolean;
        cacheKeyWithoutBreakpointsUsesImplicitMode: boolean;
        explicitOptInEnablesForegroundLayout: boolean;
        confirmedBreakpointsRemainImplicitByDefault: boolean;
        isolatedProbeCanTestExplicitBreakpoints: boolean;
        unprovenCustomUsesStandardKeyWithoutBreakpoints: boolean;
    };
};
