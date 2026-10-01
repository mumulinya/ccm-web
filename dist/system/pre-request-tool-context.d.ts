export type CcmPreRequestToolResultStateV2 = "unconsumed" | "pending_provider" | "consumed" | "compacted" | "stale";
export type CcmPreRequestToolContextStateV2 = {
    schema: "ccm-pre-request-tool-context-state-v2";
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    results: Array<{
        toolCallId: string;
        resultChecksum: string;
        turnId: string;
        generation: number;
        attempt: number;
        state: CcmPreRequestToolResultStateV2;
        consumedByRequestId?: string;
        consumedAt?: string;
        observedAt?: string;
    }>;
    pendingRequests: Array<{
        requestId: string;
        providerPayloadChecksum: string;
        toolCallIds: string[];
        createdAt: string;
    }>;
    lastEvaluation?: CcmPreRequestToolContextEvaluationV2;
    updatedAt: string;
    contentStored: false;
};
export type CcmPreRequestToolContextEvaluationV2 = {
    schema: "ccm-pre-request-tool-context-evaluation-v2";
    phase: "before_provider_request";
    requestId: string;
    trigger: "below_threshold" | "context_pressure" | "provider_prompt_too_long" | "legacy_evidence_projection";
    effectiveInputWindowTokens: number;
    autoCompactBufferTokens: 13000;
    thresholdTokens: number;
    tokensBefore: number;
    tokensAfter: number;
    consumedToolCallIds: string[];
    protectedToolCallIds: string[];
    compactedToolCallIds: string[];
    rawExecutionLedgerPreserved: true;
    contentStored: false;
};
type ToolResultView = {
    toolCallId: string;
    toolName: string;
    content: string;
    failed: boolean;
    order: number;
};
export declare function collectProviderToolResults(messages: any[]): ToolResultView[];
export declare function loadPreRequestToolContextState(scope: "project" | "group" | "global", scopeId: string, exactSessionId: string): CcmPreRequestToolContextStateV2 | null;
export declare function stagePreRequestToolContext(input: {
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    messages: any[];
    providerPayloadChecksum: string;
    tokensBefore: number;
    config?: any;
    generation?: number;
    attempt?: number;
    currentToolCallIds?: string[];
    forcePromptTooLong?: boolean;
}): {
    messages: import("../modules/collaboration/group-orchestrator-llm-client").LlmChatMessage[];
    evaluation: CcmPreRequestToolContextEvaluationV2;
    pendingToolCallIds: string[];
    changed: boolean;
};
export declare function bindPreRequestToolContext(input: {
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    requestId: string;
    providerPayloadChecksum: string;
    toolCallIds: string[];
    tokensAfter?: number;
}): {
    results: {
        toolCallId: string;
        resultChecksum: string;
        turnId: string;
        generation: number;
        attempt: number;
        state: CcmPreRequestToolResultStateV2;
        consumedByRequestId?: string;
        consumedAt?: string;
        observedAt?: string;
    }[];
    pendingRequests: {
        requestId: string;
        providerPayloadChecksum: string;
        toolCallIds: string[];
        createdAt: string;
    }[];
    updatedAt: string;
    schema: "ccm-pre-request-tool-context-state-v2";
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    lastEvaluation?: CcmPreRequestToolContextEvaluationV2;
    contentStored: false;
};
export declare function commitPreRequestToolContext(scope: "project" | "group" | "global", scopeId: string, exactSessionId: string, requestId: string): CcmPreRequestToolContextStateV2;
export declare function abortPreRequestToolContext(scope: "project" | "group" | "global", scopeId: string, exactSessionId: string, requestId: string): {
    results: {
        toolCallId: string;
        resultChecksum: string;
        turnId: string;
        generation: number;
        attempt: number;
        state: CcmPreRequestToolResultStateV2;
        consumedByRequestId?: string;
        consumedAt?: string;
        observedAt?: string;
    }[];
    pendingRequests: {
        requestId: string;
        providerPayloadChecksum: string;
        toolCallIds: string[];
        createdAt: string;
    }[];
    updatedAt: string;
    schema: "ccm-pre-request-tool-context-state-v2";
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    lastEvaluation?: CcmPreRequestToolContextEvaluationV2;
    contentStored: false;
};
export declare function deletePreRequestToolContextState(scope: "project" | "group" | "global", scopeId: string, exactSessionId: string): {
    deleted: boolean;
    contentStored: boolean;
};
export {};
