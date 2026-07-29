export type ProviderContextCacheScope = "global" | "group" | "project" | "music" | "other";
export type ProviderContextCacheMode = "auto" | "native" | "controlled" | "off";
export type ProviderContextCacheExecutionMode = "native_api_context_management" | "provider_prompt_cache" | "provider_implicit_cache" | "provider_explicit_cache" | "stable_prefix_cache" | "ccm_controlled_projection" | "disabled";
export type ProviderContextCacheBinding = {
    scope: ProviderContextCacheScope;
    scopeId?: string;
    sessionId: string;
    generation?: number;
    boundaryGeneration?: number;
    source?: string;
};
export type ProviderContextCacheOptions = ProviderContextCacheBinding & {
    enabled?: boolean;
    mode?: ProviderContextCacheMode;
    provider?: string;
    model?: string;
    nativeApplyPlan?: any;
    adapterCapability?: any;
    protectedRecentMessages?: number;
    apiUrl?: string;
    format?: string;
    providerNativeCacheFamily?: string;
    inferenceBackendKind?: string;
    contextWindowTokens?: number;
    maxOutputTokens?: number;
    reservedTokens?: number;
    formalCompactionStatus?: string;
    adaptiveStablePrefix?: boolean;
    providerPromptCacheRetention?: string;
    inputCostPerMillionTokens?: number;
    cacheReadCostPerMillionTokens?: number;
    cacheCreationCostPerMillionTokens?: number;
    materializationSingleflightJoined?: boolean;
};
export type ContextPlanV2 = {
    schema: "ccm-context-plan-v2";
    version: 2;
    requestId: string;
    contextPlanChecksum: string;
    planChecksum: string;
    scope: ProviderContextCacheScope;
    scopeId?: string;
    sessionId: string;
    generation?: number;
    boundaryGeneration?: number;
    providerEndpointFingerprint: string;
    contextIdentityChecksum: string;
    blocks: any[];
    edits: any[];
    tokenGate: any;
    contentStored: false;
    rawTranscriptPreserved: true;
    [key: string]: any;
};
export declare function verifyProviderNeutralContextCachePlan(plan: any, expected?: Partial<ProviderContextCacheBinding>): {
    valid: boolean;
    issues: string[];
};
export declare function prepareProviderNeutralContextCacheRequest(messagesInput: any[], options: ProviderContextCacheOptions): {
    messages: any[];
    plan: ContextPlanV2;
};
export declare function prepareProviderNeutralContextCacheRequestSingleflight(messagesInput: any[], options: ProviderContextCacheOptions): Promise<{
    messages: any[];
    plan: ContextPlanV2;
}>;
export declare function completeProviderNeutralContextCacheRequest(plan: any, input?: {
    ok: boolean;
    usage?: any;
    error?: any;
    providerRequestId?: string;
    adapterEvidence?: any;
}): any;
export declare function readProviderNeutralContextCacheRuntimeStatus(): {
    schema: string;
    hotCache: {
        contentPersisted: boolean;
        hits: number;
        misses: number;
        evictions: number;
        expired: number;
        singleflightOwners: number;
        singleflightJoins: number;
        sharedStateHits: number;
        entries: number;
        approximateBytes: number;
        maxEntries: number;
        maxBytes: number;
        ttlMs: number;
    };
    singleflight: {
        inFlight: number;
        owners: number;
        joins: number;
        mergesModelAnswers: boolean;
    };
    multiInstance: {
        stateFileLocks: boolean;
        staleLeaseRecovery: boolean;
        sharedMaterializationMetadata: boolean;
        sharedCapabilityEvidence: boolean;
        promptContentSharedOnDisk: boolean;
    };
};
export declare function clearProviderNeutralContextHotCache(binding?: Partial<ProviderContextCacheBinding>): {
    cleared: number;
    remaining: number;
};
export declare function invalidateProviderNeutralContextCacheState(binding: ProviderContextCacheBinding, reason?: string): {
    hotCleared: number;
    deleted: boolean;
    planChecksum: string;
    blockCount: number;
    totalTokens: number;
    success: boolean;
};
export declare function runProviderNeutralContextCacheMaintenance(options?: {
    now?: number;
    stateRetentionDays?: number;
    archiveRetentionDays?: number;
    dryRun?: boolean;
}): {
    dryRun: boolean;
    scannedStates: number;
    staleStates: number;
    corruptStates: number;
    deletedStates: number;
    expiredArchives: number;
    capability: {
        removedEntries: number;
        removedAttempts: number;
        remainingEntries: number;
        remainingAttempts: number;
    } | {
        removedEntries: number;
        removedAttempts: number;
        dryRun: boolean;
    };
    hotCache: {
        contentPersisted: boolean;
        hits: number;
        misses: number;
        evictions: number;
        expired: number;
        singleflightOwners: number;
        singleflightJoins: number;
        sharedStateHits: number;
        entries: number;
        approximateBytes: number;
        maxEntries: number;
        maxBytes: number;
        ttlMs: number;
    };
};
export declare function readLatestProviderNeutralContextCacheState(binding: ProviderContextCacheBinding): any;
export declare function readContextEngineV2Status(binding: ProviderContextCacheBinding, config?: any): {
    schema: string;
    version: number;
    applicable: boolean;
    identity: {
        scope: ProviderContextCacheScope;
        scopeId: string;
        sessionId: string;
        generation: number;
        boundaryGeneration: number;
        contextIdentityChecksum: string;
        providerEndpointFingerprint: string;
    };
    plan: {
        schema: any;
        version: number;
        contextPlanChecksum: string;
        executionMode: string;
        adapterKind: string;
        capabilitySource: string;
        blockCount: number;
        totalTokens: number;
        reusedBlockCount: number;
        changedBlockCount: number;
        blockChanges: any;
        adaptiveStablePrefix: any;
        materializationCache: any;
        tokenGate: any;
        blocks: any;
        providerInputTokens: number;
        cacheCreationInputTokens: number;
        cacheReadInputTokens: number;
        cacheDeletedInputTokens: number;
        cacheHitRate: number;
        projectionDurationMs: number;
        providerLatencyMs: number;
        reportedCostUsd: number;
        estimatedInputCostUsd: number;
        costSource: string;
        rollingMetrics: any;
        cacheRecommendation: any;
        lastRequestStatus: string;
        downgradeReason: string;
        updatedAt: string;
        contentStored: boolean;
    };
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
        status: import("./provider-cache-capability-registry").ProviderCacheCapabilityStatus;
        evidence: import("./provider-cache-capability-registry").ProviderCacheCapabilityEvidenceV1;
        latestAttempt: import("./provider-cache-capability-registry").ProviderCacheCapabilityEvidenceV1;
        expired: boolean;
        contentStored: boolean;
    };
    adapter: {
        schema: string;
        version: number;
        family: import("./provider-context-cache-adapters").ProviderCacheFamily;
        adapter: import("./provider-context-cache-adapters").ProviderCacheAdapterKind;
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
    runtime: {
        schema: string;
        hotCache: {
            contentPersisted: boolean;
            hits: number;
            misses: number;
            evictions: number;
            expired: number;
            singleflightOwners: number;
            singleflightJoins: number;
            sharedStateHits: number;
            entries: number;
            approximateBytes: number;
            maxEntries: number;
            maxBytes: number;
            ttlMs: number;
        };
        singleflight: {
            inFlight: number;
            owners: number;
            joins: number;
            mergesModelAnswers: boolean;
        };
        multiInstance: {
            stateFileLocks: boolean;
            staleLeaseRecovery: boolean;
            sharedMaterializationMetadata: boolean;
            sharedCapabilityEvidence: boolean;
            promptContentSharedOnDisk: boolean;
        };
    };
    rawTranscriptPreserved: boolean;
    contentStored: boolean;
};
export declare function providerNeutralContextCacheCapability(config?: any): {
    schema: string;
    enabled: boolean;
    requestedMode: ProviderContextCacheMode;
    modes: {
        anthropicDirectApi: string;
        openAiDirectApi: string;
        openAiCompatibleApi: string;
        geminiApi: string;
        externalCli: string;
    };
    adapterV2: {
        schema: string;
        version: number;
        active: {
            schema: string;
            version: number;
            family: import("./provider-context-cache-adapters").ProviderCacheFamily;
            adapter: import("./provider-context-cache-adapters").ProviderCacheAdapterKind;
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
    rawTranscriptPreserved: boolean;
    contentStored: boolean;
};
export declare function runProviderNeutralContextCacheSelfTest(): {
    pass: boolean;
    checks: {
        genericProviderUsesControlledProjection: boolean;
        secondRequestReusesAllBlocks: boolean;
        nativeModeRequiresVerifiedReadyPlan: boolean;
        rawTranscriptNeverStoredInBlocks: boolean;
        exactScopeReceiptValid: boolean;
        providerUsageRecorded: boolean;
    };
};
