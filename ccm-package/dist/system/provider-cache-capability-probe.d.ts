import { ProviderCacheCapabilityStatus } from "./provider-cache-capability-registry";
export type ProviderCacheProbeReceiptV1 = {
    schema: "ccm-provider-cache-probe-receipt-v1";
    version: 1;
    id: string;
    identityChecksum: string;
    status: ProviderCacheCapabilityStatus;
    providerCallCount: number;
    firstCallOk: boolean;
    secondCallOk: boolean;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
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
};
type ProbeCaller = (config: any, request: any) => Promise<ProbeCallResult>;
export declare function probeProviderCacheCapability(config: any, options?: {
    caller?: ProbeCaller;
    fetchImpl?: typeof fetch;
}): Promise<{
    success: boolean;
    connection: {
        success: boolean;
        providerCallCount: number;
        checkedAt: string;
    };
    receipt: ProviderCacheProbeReceiptV1;
    capability: {
        schema: string;
        version: number;
        identity: {
            identityChecksum: string;
            interfaceFingerprint: string;
            interfaceProtocol: string;
            cacheFamily: string;
            model: string;
            inferenceBackendKind: import("./provider-cache-capability-registry").InferenceBackendKind;
        };
        status: ProviderCacheCapabilityStatus;
        evidence: import("./provider-cache-capability-registry").ProviderCacheCapabilityEvidenceV1;
        latestAttempt: import("./provider-cache-capability-registry").ProviderCacheCapabilityEvidenceV1;
        expired: boolean;
        contentStored: boolean;
    };
}>;
export declare function runProviderCacheCapabilityProbeSelfTest(): Promise<{
    pass: boolean;
    checks: {
        confirmedNeedsRealCachedTokens: boolean;
        confirmedUsesExactlyTwoCalls: boolean;
        networkFailureStopsAfterOneCall: boolean;
        explicitFieldRejectionUnsupported: boolean;
        receiptsContainNoPrompt: boolean;
    };
}>;
export {};
