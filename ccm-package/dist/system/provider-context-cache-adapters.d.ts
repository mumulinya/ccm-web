export type ProviderCacheFamily = "anthropic" | "openai" | "gemini" | "compatible";
export type ProviderCacheAdapterKind = "anthropic_context_management" | "openai_prompt_cache" | "gemini_implicit_cache" | "stable_prefix" | "disabled";
export declare function detectProviderCacheFamily(config?: any, hint?: string): ProviderCacheFamily;
export declare function resolveProviderContextCacheAdapter(config?: any, hint?: string, evidenceInput?: any): {
    schema: string;
    version: number;
    family: ProviderCacheFamily;
    adapter: ProviderCacheAdapterKind;
    providerNative: boolean;
    providerManagedKvCache: boolean;
    requestLayerOwned: boolean;
    capabilitySource: string;
    capabilityStatus: string;
    capabilityEvidenceId: any;
    capabilityEvidenceExpiresAt: any;
    capabilityReason: any;
    requestedMode: string;
    supportsPromptCacheKey: boolean;
    supportsPromptCacheRetention: boolean;
    supportsImplicitCache: boolean;
    supportsContextManagement: boolean;
    supportsCacheReferenceEdits: boolean;
    customCompatibleEndpoint: boolean;
    safeToSendProviderFields: boolean;
    forcedWithoutEvidence: boolean;
    unsupportedEvidenceBlocksForce: boolean;
};
export declare function buildProviderContextCacheAdapterRequestPatch(config: any, plan: any, capabilityInput?: any): {
    patchChecksum: string;
    capability: any;
    body: any;
    headers: {};
};
export declare function providerCacheAdapterPublicSummary(config?: any): {
    schema: string;
    version: number;
    active: {
        schema: string;
        version: number;
        family: ProviderCacheFamily;
        adapter: ProviderCacheAdapterKind;
        providerNative: boolean;
        providerManagedKvCache: boolean;
        requestLayerOwned: boolean;
        capabilitySource: string;
        capabilityStatus: string;
        capabilityEvidenceId: any;
        capabilityEvidenceExpiresAt: any;
        capabilityReason: any;
        requestedMode: string;
        supportsPromptCacheKey: boolean;
        supportsPromptCacheRetention: boolean;
        supportsImplicitCache: boolean;
        supportsContextManagement: boolean;
        supportsCacheReferenceEdits: boolean;
        customCompatibleEndpoint: boolean;
        safeToSendProviderFields: boolean;
        forcedWithoutEvidence: boolean;
        unsupportedEvidenceBlocksForce: boolean;
    };
    adapters: {
        family: string;
        mode: string;
        fields: string[];
        guarded: boolean;
    }[];
    falseNativeClaimsForbidden: boolean;
};
export declare function runProviderContextCacheAdapterSelfTest(): {
    pass: boolean;
    checks: {
        officialOpenAiUsesNativePromptCache: boolean;
        openAiPatchHasStableKeyAndRetention: boolean;
        officialAnthropicUsesContextManagement: boolean;
        officialGeminiUsesImplicitCache: boolean;
        unknownGatewayDoesNotReceiveNativeFields: boolean;
        declaredCompatibleGatewayCanUseSelectedAdapter: boolean;
    };
};
