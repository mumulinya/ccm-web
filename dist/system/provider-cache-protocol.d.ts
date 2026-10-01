export type CcmProviderCacheProtocol = "chat_completions" | "responses" | "anthropic_messages" | "gemini_generate_content" | "custom";
export type CcmProviderTransportResolutionV2 = {
    schema: "ccm-provider-transport-resolution-v2";
    protocol: CcmProviderCacheProtocol;
    normalizedEndpoint: string;
    source: "exact_endpoint" | "manual_override" | "legacy_hint" | "compatibility_default";
    confidence: "exact" | "manual" | "inferred";
    conflict?: "endpoint_override_mismatch";
    transportIdentityChecksum: string;
    /** @deprecated Compatibility alias for cache capability identities. */
    transportParametersChecksum: string;
    contentStored: false;
};
export declare function hasConfiguredProviderProxy(config?: any): boolean;
/** @deprecated Use CcmProviderTransportResolutionV2. */
export type CcmProviderCacheProtocolResolutionV1 = CcmProviderTransportResolutionV2;
export declare function resolveProviderTransport(config?: any): CcmProviderTransportResolutionV2;
export declare function assertProviderTransportResolution(config?: any): CcmProviderTransportResolutionV2;
export declare function resolveProviderCacheProtocol(config?: any): CcmProviderTransportResolutionV2;
export declare function runProviderCacheProtocolSelfTest(): {
    pass: boolean;
    checks: {
        modelNameDoesNotSelectProtocol: boolean;
        exactChatEndpointOverridesLegacyFormat: boolean;
        exactResponsesEndpointOverridesLegacyFormat: boolean;
        ambiguousBaseDefaultsToChat: boolean;
        ambiguousLegacyBaseKeepsFormatHint: boolean;
        manualOverrideSupportsAmbiguousBase: boolean;
        equivalentTransportIgnoresResolutionSource: boolean;
        manualConflictIsReported: boolean;
        endpointNormalizationIsIdempotent: boolean;
        responsesUsesPluralEndpoint: boolean;
    };
    samples: {
        chat: CcmProviderTransportResolutionV2;
        responses: CcmProviderTransportResolutionV2;
        base: CcmProviderTransportResolutionV2;
        legacyBase: CcmProviderTransportResolutionV2;
        manualResponses: CcmProviderTransportResolutionV2;
        conflict: CcmProviderTransportResolutionV2;
    };
};
