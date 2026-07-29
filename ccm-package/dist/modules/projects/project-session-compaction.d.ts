export declare function getProjectSessionCompactionActivity(project: string, projectSessionId: string): {
    active: boolean;
    status: string;
    stage: string;
    reason: string;
    startedAt: string;
    updatedAt: string;
};
export declare function appendProjectSessionExecutionEvent(projectInput: string, projectSessionIdInput: string, event: any): {
    id: string;
    toolCallId: string;
    hidden: true;
    type: import("../../system/session-execution-ledger").SessionExecutionEventType;
    toolName: string;
    timestamp: string;
    runId: string;
    traceId: string;
    anchorMessageId: string;
    status: "error" | "ok" | "running";
    payload: any;
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
}): Promise<any>;
export declare function buildProjectSessionPostCompactContext(project: string, projectSessionId: string, targetAgentType?: string, options?: {
    currentRequest?: any;
}): string;
export declare function buildProjectSessionModelContextProjection(project: string, projectSessionId: string, options?: {
    currentRequest?: any;
    persistMicroCompactReceipt?: boolean;
}): any;
