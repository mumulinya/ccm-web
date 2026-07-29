import { ModelCallRetryNotice } from "../../system/model-call-retry";
export type LlmChatMessage = {
    role: string;
    content: any;
};
export type LlmTokenUsage = {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    reported: boolean;
    directInputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    cacheDeletedInputTokens?: number;
    cacheCreation5mInputTokens?: number;
    cacheCreation1hInputTokens?: number;
    costUsd?: number;
};
export type LlmCallOptions = {
    messages: LlmChatMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    defaultTimeoutMs?: number;
    timeoutMs?: number;
    stream?: boolean;
    reasoningEffort?: "low" | "medium" | "high" | "off";
    httpErrorPrefix?: string;
    invalidJsonMessage?: string;
    apiMicrocompactNativeApplyPlan?: any;
    api_microcompact_native_apply_plan?: any;
    apiMicrocompactNativeApplyTelemetry?: any;
    api_microcompact_native_apply_telemetry?: any;
    promptCacheTracking?: any;
    prompt_cache_tracking?: any;
    providerContextCache?: any;
    provider_context_cache?: any;
    onProviderContextCache?: (receipt: any) => void;
    onUsage?: (usage: LlmTokenUsage) => void;
    onDelta?: (delta: string) => void;
    retry?: boolean;
    retryAttempts?: number;
    retryBaseDelayMs?: number;
    retryTotalTimeoutMs?: number;
    retryScope?: string;
    onRetry?: (notice: ModelCallRetryNotice) => void;
};
export declare function normalizeLlmTokenUsage(value: any, provider?: "openai" | "anthropic" | "gemini"): LlmTokenUsage;
export declare function normalizeChatCompletionsUrl(apiUrl: string): string;
export declare function normalizeAnthropicMessagesUrl(apiUrl: string): string;
export declare function normalizeGeminiGenerateContentUrl(apiUrl: string, model: string, stream?: boolean): string;
export declare function shouldUseAnthropic(config: any): boolean;
export declare function shouldUseGemini(config: any): boolean;
export declare function extractJsonObject(text: string): any;
export declare function resolveLlmTimeoutMs(config: any, defaultTimeoutMs: number, callTimeoutMs?: number): number;
export declare function resolveReasoningEffort(config: any): string;
export declare function buildOpenAiReasoningFields(config: any): {
    reasoning_effort?: undefined;
    reasoning?: undefined;
} | {
    reasoning_effort: string;
    reasoning: {
        effort: string;
    };
};
export declare function parseOpenAiStreamText(text: string): {
    content: string;
    usage: any;
};
export declare function buildAnthropicThinkingFields(config: any): {
    thinking?: undefined;
} | {
    thinking: {
        type: string;
        budget_tokens: number;
    };
};
export declare function fetchWithNodeHttpFallback(endpoint: string | URL, init?: any): Promise<any>;
export declare function applyAnthropicCacheReferenceEditing(bodyInput: any, config?: any): {
    body: any;
    applied: boolean;
    cacheReferenceCount: number;
    cacheEditCount: number;
    reason: string;
};
export declare const MODEL_LONG_REQUEST_TOTAL_TIMEOUT_MS = 360000;
export declare function resolveLlmRetryOptions(config: any, options: LlmCallOptions, fallbackScope: string): {
    attempts: number;
    attemptTimeoutMs: number;
    baseDelayMs: number;
    totalTimeoutMs: number;
    scope: string;
    onRetry: (notice: ModelCallRetryNotice) => void;
};
export declare function callOpenAiCompatibleChat(config: any, options: LlmCallOptions): Promise<any>;
export declare function callGeminiCompatibleChat(config: any, options: LlmCallOptions): Promise<any>;
export declare function callAnthropicCompatibleChat(config: any, options: LlmCallOptions): Promise<any>;
export declare function callOpenAiCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export declare function callGeminiCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export declare function callAnthropicCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export declare function runLlmTokenUsageSelfTest(): Promise<{
    pass: boolean;
    checks: {
        openAiContentPreserved: boolean;
        openAiInputTokensCaptured: boolean;
        openAiOutputTokensCaptured: boolean;
        anthropicContentPreserved: boolean;
        anthropicDirectInputTokensCaptured: boolean;
        anthropicCacheTokensCaptured: boolean;
        anthropicTotalIncludesCacheTokens: boolean;
        anthropicOutputTokensCaptured: boolean;
    };
    openAiUsage: LlmTokenUsage;
    anthropicUsage: LlmTokenUsage;
}>;
export declare function runLlmStreamingSelfTest(): Promise<{
    pass: boolean;
    checks: {
        openAiContent: boolean;
        openAiDeltas: boolean;
        openAiIncremental: boolean;
        openAiUsage: boolean;
        anthropicContent: boolean;
        anthropicDeltas: boolean;
        anthropicIncremental: boolean;
        anthropicUsage: boolean;
        interruptedStreamDoesNotRetry: boolean;
    };
}>;
export declare function runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest(): Promise<{
    pass: boolean;
    checks: {
        modelReturned: boolean;
        requestBodyIncludesContextManagement: boolean;
        requestHeaderIncludesBeta: boolean;
        ledgerRecordedAdapterTelemetry: boolean;
        ledgerBindsSessionAndSnapshot: boolean;
        platformExecutionReceiptIsStrong: boolean;
    };
    captured: {
        hasContextManagement: boolean;
        beta: any;
    };
    entry: {
        telemetryStatus: any;
        telemetrySource: any;
        requestPatchChecksum: any;
    };
}>;
