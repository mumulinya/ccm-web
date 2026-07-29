export type ProviderCacheCapabilityStatus = "confirmed" | "unsupported" | "unproven" | "degraded";
export type InferenceBackendKind = "remote_api" | "vllm" | "sglang";
export type ProviderCacheCapabilityEvidenceV1 = {
    schema: "ccm-provider-cache-capability-evidence-v1";
    version: 1;
    id: string;
    identityChecksum: string;
    interfaceFingerprint: string;
    interfaceProtocol: string;
    cacheFamily: string;
    model: string;
    inferenceBackendKind: InferenceBackendKind;
    status: ProviderCacheCapabilityStatus;
    source: "probe" | "official_endpoint" | "backend_metrics";
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
export declare function normalizeInferenceBackendKind(value: any): InferenceBackendKind;
export declare function providerCacheCapabilityIdentity(config: any): {
    identityChecksum: string;
    interfaceFingerprint: string;
    interfaceProtocol: string;
    cacheFamily: string;
    model: string;
    inferenceBackendKind: InferenceBackendKind;
};
export declare function createProviderCacheCapabilityEvidence(config: any, input: Partial<ProviderCacheCapabilityEvidenceV1> & {
    status: ProviderCacheCapabilityStatus;
}): ProviderCacheCapabilityEvidenceV1;
export declare function recordProviderCacheCapabilityEvidence(config: any, input: Partial<ProviderCacheCapabilityEvidenceV1> & {
    status: ProviderCacheCapabilityStatus;
}): {
    evidence: ProviderCacheCapabilityEvidenceV1;
    latestAttempt: ProviderCacheCapabilityEvidenceV1;
    preservedConfirmed: boolean;
};
export declare function readProviderCacheCapabilityState(config: any): {
    schema: string;
    version: number;
    identity: {
        identityChecksum: string;
        interfaceFingerprint: string;
        interfaceProtocol: string;
        cacheFamily: string;
        model: string;
        inferenceBackendKind: InferenceBackendKind;
    };
    status: ProviderCacheCapabilityStatus;
    evidence: ProviderCacheCapabilityEvidenceV1;
    latestAttempt: ProviderCacheCapabilityEvidenceV1;
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
        confirmedRecorded: boolean;
        transientFailurePreservesConfirmed: boolean;
        secretsNotStored: boolean;
        revokeWorks: boolean;
    };
};
