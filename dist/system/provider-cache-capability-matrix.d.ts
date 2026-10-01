import { CcmProviderCacheProtocol } from "./provider-cache-protocol";
export type CapabilityStatus = "unproven" | "confirmed" | "degraded" | "unsupported";
export type CcmProviderCacheCapabilityMatrixV1 = {
    schema: "ccm-provider-cache-capability-matrix-v1";
    transportIdentityChecksum: string;
    protocol: CcmProviderCacheProtocol;
    capabilities: {
        implicitPrefix: CapabilityStatus;
        explicitCacheKey: CapabilityStatus;
        promptCacheOptions?: CapabilityStatus;
        explicitBreakpoints: CapabilityStatus;
        responsesContinuation: CapabilityStatus;
        responsesToolLoopContinuation: CapabilityStatus;
        responsesWebSocketStatus?: CapabilityStatus;
        responsesWebSocketResponseCreateStatus?: CapabilityStatus;
        responsesWebSocketContinuationStatus?: CapabilityStatus;
        responsesWebSocketToolLoopStatus?: CapabilityStatus;
        blockCacheControl: CapabilityStatus;
        nativeCacheEditing: CapabilityStatus;
        cacheUsageReporting: CapabilityStatus;
    };
    supportedTtls: Array<"provider_default" | "30m" | "1h" | "24h">;
    evidenceUpdatedAt: string;
    contentStored: false;
};
/**
 * OpenAI's explicit Responses cache breakpoints are a model capability, not
 * merely a transport capability.  Keep unknown/relay model names on the
 * implicit path until a real capability probe can prove otherwise.
 */
export declare function responsesModelSupportsExplicitBreakpoints(modelInput: unknown): boolean;
export declare function buildProviderCacheCapabilityMatrix(config?: any, stateInput?: any): CcmProviderCacheCapabilityMatrixV1;
export declare function runProviderCacheCapabilityMatrixSelfTest(): {
    pass: boolean;
    checks: {
        modelNamesShareProtocolDecision: boolean;
        implicitEvidenceIsSharedRule: boolean;
        standardProtocolUsesStableKeyWithoutProbe: boolean;
        responsesRequiresSupportedModel: boolean;
        verifiedRelayModelUsesExplicitBreakpoints: boolean;
        degradedRelayWithHistoricalReuseCanRetryBreakpoints: boolean;
        baselineOnlyRelayDoesNotRecoverBreakpoints: boolean;
        proxiedOfficialEndpointKeepsStandardKeyButNotBreakpoints: boolean;
        anthropicProtocolUsesGenericBlockCapability: boolean;
    };
};
