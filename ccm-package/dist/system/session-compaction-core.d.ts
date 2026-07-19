export declare const SESSION_COMPACTION_STATE_SCHEMA = "ccm-session-compaction-state-v2";
export declare const SESSION_COMPACTION_MAX_CONSECUTIVE_FAILURES = 3;
export declare const SESSION_MEMORY_INITIAL_TOKENS = 10000;
export declare const SESSION_MEMORY_UPDATE_GROWTH_TOKENS = 5000;
export declare const SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;
export declare const SESSION_MEMORY_EXTRACTION_WAIT_MS = 15000;
export type SessionCompactionScope = "global" | "group" | "project" | "task_agent";
export type SessionCompactionHookPhase = "pre_compact" | "session_start" | "post_compact";
export type SessionProviderUsageBaseline = {
    scope?: SessionCompactionScope;
    sessionId?: string;
    provider?: string;
    model?: string;
    generation?: number;
    anchorMessageId?: string;
    boundaryGeneration?: number;
    inputTokens?: number;
    outputTokens?: number;
    directInputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    recordedAt?: string;
    estimatedContextTokens?: number;
    providerObservedContextTokens?: number;
    payloadChecksum?: string;
    fixedContextChecksum?: string;
    estimatedFixedTokens?: number;
    estimatedPayloadTokens?: number;
};
export type ModelVisiblePayloadSnapshot = {
    schema: "ccm-model-visible-payload-snapshot-v1";
    scope: SessionCompactionScope;
    sessionId: string;
    system: any;
    tools: any;
    activeSummary: any;
    recentMessages: any[];
    currentRequest: any;
    recoveryContext: any;
    hookResults: any[];
    tokenBreakdown: Record<string, number>;
    totalTokens: number;
    payloadChecksum: string;
    fixedContextChecksum: string;
    pendingRequestChecksum: string;
};
export type SessionCompactionStateV2 = {
    schema: typeof SESSION_COMPACTION_STATE_SCHEMA;
    scope: SessionCompactionScope;
    sessionId: string;
    activeSummary: any;
    activeSummaryChecksum: string;
    previousSummaryChecksum: string;
    lastCompactedIndex: number;
    lastCompactedMessageId: string;
    preservedRecentMessageIds: string[];
    preservedRecentTokens: number;
    preservedRecentTextMessageCount: number;
    latestProviderUsage: SessionProviderUsageBaseline | null;
    tokenMeasurement: any;
    sessionMemoryState: any;
    postCompactGate: any;
    consecutiveFailures: number;
    lastFailureAt: string;
    lastError: string;
    lastCompactedAt: string;
    boundaryGeneration: number;
    modelVisiblePayloadChecksum: string;
    fixedContextChecksum: string;
    pendingRequestChecksum: string;
    sessionMemoryExtraction: any;
    boundaryMarker: any;
    preservedSegmentChecksum: string;
    recoveryContextTokens: number;
    hookResultTokens: number;
    ptlRecoveryAttempts: number;
};
type SessionCompactionHook = (input: any) => any | Promise<any>;
export declare function sessionCompactionChecksum(value: any): string;
export declare function buildModelVisiblePayloadSnapshot(input: {
    scope: SessionCompactionScope;
    sessionId: string;
    system?: any;
    tools?: any;
    activeSummary?: any;
    recentMessages?: any[];
    currentRequest?: any;
    recoveryContext?: any;
    hookResults?: any[];
}): ModelVisiblePayloadSnapshot;
export declare function evaluateSessionMemoryCadence(messagesInput: any[], stateInput?: any): {
    schema: string;
    shouldExtract: boolean;
    reason: string;
    totalTokens: any;
    priorTokens: number;
    growthTokens: number;
    toolCallsSinceLastExtraction: any;
    cursorIndex: number;
    cursorValid: boolean;
    sourceLastMessageId: string;
    sourceMessageIds: string[];
};
export declare function validateSessionMemoryState(stateInput: any, input: {
    scope: SessionCompactionScope;
    sessionId: string;
    expectedLastMessageId?: string;
}): {
    valid: boolean;
    issues: string[];
    summary: any;
    checksum: string;
};
export declare function waitForSessionMemoryExtraction<T>(promise: Promise<T>, timeoutMs?: number): Promise<{
    status: "ready";
    value: T;
} | {
    status: "timeout";
    value: null;
} | {
    status: "failed";
    value: any;
    error: any;
}>;
export declare function scheduleSessionMemoryExtraction(input: {
    scope: SessionCompactionScope;
    sessionId: string;
    identity: any;
    extract: () => Promise<any>;
    commit: (value: any, identity: any) => Promise<any> | any;
}): {
    scheduled: boolean;
    reason: string;
    startedAt: string;
    identity: any;
};
export declare function inspectSessionMemoryExtraction(scope: SessionCompactionScope, sessionId: string): {
    inFlight: boolean;
    startedAt: string;
    identity: any;
} | {
    inFlight: boolean;
    startedAt?: undefined;
    identity?: undefined;
};
export declare function waitForScheduledSessionMemoryExtraction(scope: SessionCompactionScope, sessionId: string, timeoutMs?: number): Promise<{
    status: "ready";
    value: any;
} | {
    status: "timeout";
    value: null;
} | {
    status: "failed";
    value: any;
    error: any;
} | {
    status: "missing";
    value: any;
}>;
export declare function buildSessionMemoryState(input: {
    scope: SessionCompactionScope;
    sessionId: string;
    summary: any;
    cadence: any;
    provider?: string;
    model?: string;
}): {
    schema: string;
    scope: SessionCompactionScope;
    sessionId: string;
    summary: any;
    summaryChecksum: string;
    lastExtractedMessageId: string;
    sourceMessageIds: any;
    tokensAtLastExtraction: number;
    toolCallsAtLastExtraction: number;
    provider: string;
    model: string;
    extractionSource: string;
    updatedAt: string;
};
export declare function normalizeSessionProviderUsage(value: any): SessionProviderUsageBaseline | null;
export declare function providerObservedContextTokens(value: any): number;
export declare function measureSessionContextTokens(input: {
    scope?: SessionCompactionScope;
    sessionId?: string;
    messages?: any[];
    activeSummary?: any;
    fixedContext?: any;
    latestProviderUsage?: any;
    provider?: string;
    model?: string;
    generation?: number;
    boundaryGeneration?: number;
    modelVisiblePayload?: ModelVisiblePayloadSnapshot | null;
}): {
    schema: string;
    method: string;
    activeTokens: any;
    providerObservedTokens: number;
    estimatedTokensAfterUsage: any;
    estimatedSummaryTokens: number;
    estimatedFixedTokens: number;
    estimatedMessageTokens: any;
    baselineValid: boolean;
    baselineIssues: string[];
    anchorMessageId: string;
    provider: string;
    model: string;
    generation: number;
    boundaryGeneration: number;
    modelVisiblePayload: ModelVisiblePayloadSnapshot;
    payloadChecksum: string;
    fixedContextChecksum: string;
    pendingRequestChecksum: string;
};
export declare function buildSessionPostCompactGate(input: {
    afterTokens?: number;
    threshold: number;
    modelVisiblePayload?: ModelVisiblePayloadSnapshot | null;
}): {
    schema: string;
    status: string;
    providerCallAllowed: boolean;
    afterTokens: number;
    threshold: number;
    remainingTokens: number;
    payloadChecksum: string;
    fixedContextChecksum: string;
    tokenBreakdown: Record<string, number>;
};
export declare function buildSessionCompactionBoundaryMarker(input: {
    scope: SessionCompactionScope;
    sessionId: string;
    generation: number;
    summarizedThroughMessageId?: string;
    previousSummaryChecksum?: string;
    preservedMessageIds?: string[];
}): {
    checksum: string;
    schema: string;
    type: string;
    scope: SessionCompactionScope;
    sessionId: string;
    generation: number;
    summarizedThroughMessageId: string;
    previousSummaryChecksum: string;
    preservedMessageIds: string[];
};
export declare function normalizeSessionCompactionState(value: any, input: {
    scope: SessionCompactionScope;
    sessionId: string;
}): SessionCompactionStateV2;
export declare function sessionCompactionCircuitOpen(state: any): boolean;
export declare function recordSessionCompactionFailure(state: any, error: any): any;
export declare function resetSessionCompactionFailures(state: any): any;
export declare function registerSessionCompactionHook(phase: SessionCompactionHookPhase, hook: SessionCompactionHook): () => boolean;
export declare function runSessionCompactionHooks(phase: SessionCompactionHookPhase, input: any): Promise<any[]>;
export {};
