import type { UnifiedCompactionResult } from "../../system/unified-session-compaction-types";
export declare function createProjectSessionCompactionAdapter(input: {
    project: string;
    sessionId: string;
    load: () => Promise<any> | any;
    commit: (result: UnifiedCompactionResult, fence: any) => Promise<void> | void;
    acquire?: () => Promise<any> | any;
    failure?: (error: unknown, fence: any) => Promise<void> | void;
    validate?: (fence: any, snapshot: any) => Promise<void> | void;
}): import("../../system/unified-session-compaction-types").UnifiedSessionCompactionAdapter;
export declare function getProjectSessionCompactionActivity(project: string, projectSessionId: string): {
    active: boolean;
    status: string;
    stage: string;
    reason: string;
    startedAt: string;
    updatedAt: string;
};
export declare function listProjectSessionExecutionEvents(projectInput: string, projectSessionIdInput: string): import("../../system/session-execution-ledger").SessionExecutionEvent[];
export declare function listProjectSessionHistoryMessages(projectInput: string, projectSessionIdInput: string): any;
export declare function appendProjectSessionExecutionEvent(projectInput: string, projectSessionIdInput: string, event: any): {
    type: import("../../system/session-execution-ledger").SessionExecutionEventType;
    toolName: string;
    toolCallId: string;
    timestamp: string;
    runId: string;
    traceId: string;
    anchorMessageId: string;
    status: "error" | "ok" | "running";
    payload: any;
    id: string;
    hidden: true;
};
export declare function recordProjectSessionProviderUsage(project: string, projectSessionId: string, input?: any): import("../../system/session-compaction-core").SessionProviderUsageBaseline;
export declare function scheduleProjectSessionMemoryExtraction(project: string, projectSessionId: string, options?: {
    modelCall?: (request: any) => Promise<any>;
}): {
    scheduled: boolean;
    reason: string;
    cadence?: undefined;
} | {
    scheduled: boolean;
    reason: string;
    cadence: {
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
} | {
    cadence: {
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
    scheduled: boolean;
    reason: string;
    startedAt: string;
    identity: any;
};
export declare function compactProjectSessionWithModel(project: string, projectSessionId: string, options?: {
    force?: boolean;
    reason?: string;
    customInstructions?: string;
    modelCall?: (request: any) => Promise<any>;
    currentRequest?: any;
    fixedContext?: any;
    tools?: any;
    recoveryContext?: any;
    contextComponents?: any;
    context_components?: any;
    provider?: string;
    model?: string;
    modelVisiblePayload?: any;
}): Promise<{
    compacted: any;
    reason: any;
    before_tokens: any;
    after_tokens: any;
    summary_source: any;
    boundary_generation: any;
    boundaryGeneration: any;
    boundary: any;
    receipt: any;
    unifiedSessionSummary: any;
    unifiedSessionCompaction: any;
    model_context_capacity: {
        provider: string;
        model: string;
        autoCompactThreshold: number;
        resolution: string;
        schema: string;
        contextWindow: number;
        maxOutputTokens: number;
        windowSemantics: string;
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
        conservativeFallback: boolean;
    };
    auto_compact_threshold: number;
    contentStored: boolean;
}>;
export declare function buildProjectSessionPostCompactContext(project: string, projectSessionId: string, targetAgentType?: string, options?: {
    currentRequest?: any;
}): string;
export declare function buildProjectSessionModelContextProjection(project: string, projectSessionId: string, options?: {
    currentRequest?: any;
    persistMicroCompactReceipt?: boolean;
}): any;
