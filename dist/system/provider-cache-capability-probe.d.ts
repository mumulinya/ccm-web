import { ProviderCacheCapabilityStatus, ProviderExactReplayStatus, ProviderPrefixExtensionStatus } from "./provider-cache-capability-registry";
export type ProviderCacheProbeReceiptV1 = {
    schema: "ccm-provider-cache-probe-receipt-v2";
    version: 2;
    id: string;
    identityChecksum: string;
    status: ProviderCacheCapabilityStatus;
    providerCallCount: number;
    firstCallOk: boolean;
    secondCallOk: boolean;
    thirdCallOk: boolean;
    explicitFieldStatus: ProviderCacheCapabilityStatus;
    exactReplayStatus: ProviderExactReplayStatus;
    prefixExtensionStatus: ProviderPrefixExtensionStatus;
    stablePrefixChecksum: string;
    promptCacheKeyChecksum: string;
    providerInputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    continuationUsed: boolean;
    toolLoopContinuationUsed?: boolean;
    backendMetrics: {
        checked: boolean;
        verified: boolean;
        kind: string;
        reason: string;
    };
    preservedConfirmed: boolean;
    reason: string;
    checkedAt: string;
    contentStored: false;
    checksum: string;
};
type ProbeCallResult = {
    content?: string;
    usage?: any;
    responseId?: string;
    previousResponseIdUsed?: boolean;
    toolCalls?: any[];
};
type ProbeCaller = (config: any, request: any) => Promise<ProbeCallResult>;
export declare function probeProviderCacheCapability(config: any, options?: {
    caller?: ProbeCaller;
    fetchImpl?: typeof fetch;
}): Promise<any>;
export declare function scheduleProviderCacheCapabilityProbe(config: any, options?: {
    force?: boolean;
    delayMs?: number;
}): {
    scheduled: boolean;
    reason: string;
};
export declare function runProviderCacheCapabilityProbeSelfTest(): Promise<{
    pass: boolean;
    checks: {
        confirmedNeedsRealCachedTokens: boolean;
        confirmedUsesExactlyTwoCalls: boolean;
        probeChangesOnlyDynamicSuffix: boolean;
        prefixHitIsConfirmed: boolean;
        exactReplayIsNotPrefixCapability: boolean;
        networkFailureStopsAfterOneCall: boolean;
        explicitFieldRejectionUnsupported: boolean;
        firstCallFailureDoesNotImplyContinuationRejection: boolean;
        responsesContinuationIsProbed: boolean;
        matchingProbeUsesSingleflight: boolean;
        receiptsContainNoPrompt: boolean;
    };
}>;
export {};
