export declare const MODEL_CAPABILITY_CACHE_SCHEMA = "ccm-model-capability-cache-v1";
export declare const MODEL_CONTEXT_CAPACITY_SCHEMA = "ccm-model-context-capacity-v2";
export declare const CONSERVATIVE_CONTEXT_WINDOW_TOKENS = 200000;
export declare const CONSERVATIVE_MAX_OUTPUT_TOKENS = 20000;
export declare const CONTEXT_AUTOCOMPACT_BUFFER_TOKENS = 13000;
type CapabilitySource = "explicit_provider_capability" | "native_executor_receipt" | "user_setting";
export type ModelCapabilityEvidence = {
    provider?: string;
    model?: string;
    source: CapabilitySource;
    contextWindow?: number;
    context_window?: number;
    maxInputTokens?: number;
    max_input_tokens?: number;
    maxOutputTokens?: number;
    max_output_tokens?: number;
    checkedAt?: string;
    checked_at?: string;
    expiresAt?: string;
    expires_at?: string;
    verified?: boolean;
    receiptId?: string;
    receipt_id?: string;
    evidenceId?: string;
    evidence_id?: string;
};
export declare function recordModelCapabilityEvidence(input: ModelCapabilityEvidence): {
    entry: any;
    cache: {
        schema: string;
        file: string;
        total: number;
        active: number;
        expired: number;
        revoked: number;
        refreshDue: number;
        providers: number;
        models: number;
        updatedAt: string;
        checksumValid: boolean;
    };
    downgrade: any;
    refreshRequest: any;
};
export declare function recordVerifiedNativeModelCapabilityReceipt(receipt: any, expected?: any): {
    recorded: boolean;
    validation: {
        valid: boolean;
        gaps: string[];
    };
} | {
    entry: any;
    cache: {
        schema: string;
        file: string;
        total: number;
        active: number;
        expired: number;
        revoked: number;
        refreshDue: number;
        providers: number;
        models: number;
        updatedAt: string;
        checksumValid: boolean;
    };
    downgrade: any;
    refreshRequest: any;
    recorded: boolean;
    validation: {
        valid: boolean;
        gaps: string[];
    };
};
export declare function revokeModelCapabilityEvidence(input?: any): {
    revoked: number;
    revokedAt: string;
    cache: {
        schema: string;
        file: string;
        total: number;
        active: number;
        expired: number;
        revoked: number;
        refreshDue: number;
        providers: number;
        models: number;
        updatedAt: string;
        checksumValid: boolean;
    };
    saved: boolean;
};
export declare function runModelCapabilityCacheMaintenance(input?: any): {
    schema: string;
    dryRun: boolean;
    candidateCount: any;
    deletedCount: any;
    candidateEvidenceIds: any;
    ranAt: any;
};
export declare function readModelCapabilityCache(now?: Date): {
    file: string;
    entries: any;
    checksumValid: boolean;
    schema: string;
    version: number;
    updatedAt: string;
    checksum: string;
};
export declare function summarizeModelCapabilityCache(cache?: {
    file: string;
    entries: any;
    checksumValid: boolean;
    schema: string;
    version: number;
    updatedAt: string;
    checksum: string;
}): {
    schema: string;
    file: string;
    total: number;
    active: number;
    expired: number;
    revoked: number;
    refreshDue: number;
    providers: number;
    models: number;
    updatedAt: string;
    checksumValid: boolean;
};
export declare function resolveTrustedModelContextCapacity(input?: any): {
    schema: string;
    provider: any;
    model: any;
    contextWindow: number;
    maxOutputTokens: number;
    reservedOutputTokens: number;
    effectiveContextWindow: number;
    autoCompactBufferTokens: number;
    autoCompactThreshold: number;
    source: any;
    confidence: number;
    checkedAt: any;
    expiresAt: any;
    evidenceId: any;
    evidenceChecksum: any;
    cacheStatus: string;
    conservativeFallback: boolean;
} | {
    conservativeFallback: boolean;
    fallbackReason: string;
    staleEvidenceId: any;
    staleEvidenceSource: any;
    schema: string;
    provider: any;
    model: any;
    contextWindow: number;
    maxOutputTokens: number;
    reservedOutputTokens: number;
    effectiveContextWindow: number;
    autoCompactBufferTokens: number;
    autoCompactThreshold: number;
    source: any;
    confidence: number;
    checkedAt: any;
    expiresAt: any;
    evidenceId: any;
    evidenceChecksum: any;
    cacheStatus: string;
} | {
    schema: string;
    provider: string;
    model: string;
    contextWindow: number;
    maxOutputTokens: number;
    reservedOutputTokens: number;
    effectiveContextWindow: number;
    autoCompactBufferTokens: number;
    autoCompactThreshold: number;
    source: string;
    confidence: number;
    checkedAt: string;
    expiresAt: string;
    evidenceId: string;
    evidenceChecksum: string;
    cacheStatus: string;
    conservativeFallback: boolean;
    fallbackReason: string;
};
export declare function buildModelCapabilityRefreshPlan(input?: any): {
    schema: string;
    generatedAt: any;
    requestCount: any;
    requests: any;
    cacheChecksumValid: boolean;
};
export declare function recordModelCapabilityRefreshOutcome(input?: any): {
    recorded: boolean;
    reason: string;
    outcome?: undefined;
    queued?: undefined;
    count?: undefined;
    rows?: undefined;
    lease?: undefined;
    pendingFiles?: undefined;
} | {
    recorded: boolean;
    reason: string;
    outcome: string;
    queued?: undefined;
    count?: undefined;
    rows?: undefined;
    lease?: undefined;
    pendingFiles?: undefined;
} | {
    recorded: boolean;
    queued: boolean;
    outcome: string;
    count: any;
    rows: any;
    lease: any;
    reason?: undefined;
    pendingFiles?: undefined;
} | {
    recorded: boolean;
    queued: boolean;
    outcome: string;
    count: any;
    rows: any;
    pendingFiles: string[];
    reason: any;
    lease?: undefined;
};
export declare function writeModelCapabilityRefreshPlan(input?: any): {
    file: string;
    schema: string;
    generatedAt: any;
    requestCount: any;
    requests: any;
    cacheChecksumValid: boolean;
};
export declare function buildModelCapabilityRefreshOutcomeLedger(input?: any): any;
export declare function readModelCapabilityRefreshOutcomeLedger(input?: any): any;
export declare function readInvalidPendingModelCapabilityRefreshOutcomes(input?: any): {
    schema: string;
    quarantineDir: string;
    acknowledgementLedgerFile: string;
    total: number;
    pendingAcknowledgementCount: number;
    acknowledgedCount: number;
    outcomes: any[];
};
export declare function acknowledgeInvalidPendingModelCapabilityRefreshOutcome(input?: any): {
    acknowledged: boolean;
    reason: any;
    alreadyAcknowledged?: undefined;
    acknowledgement?: undefined;
} | {
    acknowledged: boolean;
    alreadyAcknowledged: boolean;
    acknowledgement: any;
    reason?: undefined;
};
export declare function inspectModelCapabilityRefreshLease(input?: any): {
    file: string;
    present: boolean;
    valid: boolean;
    active: boolean;
    lease: any;
    checksumValid?: undefined;
    ownerAlive?: undefined;
    unexpired?: undefined;
} | {
    file: string;
    present: boolean;
    valid: boolean;
    checksumValid: boolean;
    ownerAlive: boolean;
    unexpired: boolean;
    active: boolean;
    lease: any;
};
export declare function acquireModelCapabilityRefreshLease(input?: any): {
    acquired: boolean;
    reason: string;
    status: {
        file: string;
        present: boolean;
        valid: boolean;
        active: boolean;
        lease: any;
        checksumValid?: undefined;
        ownerAlive?: undefined;
        unexpired?: undefined;
    } | {
        file: string;
        present: boolean;
        valid: boolean;
        checksumValid: boolean;
        ownerAlive: boolean;
        unexpired: boolean;
        active: boolean;
        lease: any;
    };
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    recovered: boolean;
    handle: any;
    lease: any;
    reason?: undefined;
    status?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    reason: string;
    error: string;
    status?: undefined;
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
} | {
    acquired: boolean;
    reason: string;
    status?: undefined;
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
    error?: undefined;
};
export declare function releaseModelCapabilityRefreshLease(handle: any, finalStatus?: string): boolean;
export declare function runModelCapabilityRefreshMaintenance(input?: any): {
    schema: string;
    success: boolean;
    skipped: boolean;
    reason: any;
    requestCount: number;
    startedAt: string;
    completedAt: string;
    lease: any;
} | {
    schema: string;
    success: boolean;
    skipped: boolean;
    error: string;
    trigger: string;
    requestCount: number;
    pendingOutcomeDrained: number;
    pendingOutcomeQuarantined: number;
    pendingOutcomeFailed: number;
    journalRetention: any;
    archiveRetention: any;
    ledgerRecovery: any;
    outcomeHealth: {
        outcomeCount: any;
        providers: any;
        totals: any;
        checksum: any;
    };
    startedAt: string;
    completedAt: string;
    lease: {
        leaseId: any;
        fencingToken: number;
        recoveryCount: number;
        recovered: boolean;
        ownerPid: number;
        ownerHostname: string;
    };
};
export declare function readModelCapabilityRefreshStatus(): any;
export declare function readModelCapabilityDowngradeAlerts(limit?: number): any[];
export declare function pruneModelCapabilityDowngradeAlerts(input?: any): {
    removed: number;
    remaining: number;
};
export declare function startModelCapabilityRefreshScheduler(intervalMs?: number): {
    started: boolean;
    reason: string;
    intervalMs?: undefined;
    file?: undefined;
} | {
    started: boolean;
    intervalMs: number;
    file: string;
    reason?: undefined;
};
export declare function stopModelCapabilityRefreshScheduler(): boolean;
export declare function runModelCapabilityCacheSelfTest(): {
    pass: boolean;
    checks: {
        explicitProviderWins: boolean;
        unverifiedNativeRejected: boolean;
        expiredSettingFallsBack: boolean;
        fallbackMatchesCcDefault: boolean;
    };
};
export {};
