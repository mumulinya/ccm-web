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
};
type LlmCallOptions = {
    messages: LlmChatMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    defaultTimeoutMs?: number;
    httpErrorPrefix?: string;
    invalidJsonMessage?: string;
    apiMicrocompactNativeApplyPlan?: any;
    api_microcompact_native_apply_plan?: any;
    apiMicrocompactNativeApplyTelemetry?: any;
    api_microcompact_native_apply_telemetry?: any;
    promptCacheTracking?: any;
    prompt_cache_tracking?: any;
    onUsage?: (usage: LlmTokenUsage) => void;
};
export declare function normalizeLlmTokenUsage(value: any, provider?: "openai" | "anthropic"): LlmTokenUsage;
export declare function normalizeChatCompletionsUrl(apiUrl: string): string;
export declare function normalizeAnthropicMessagesUrl(apiUrl: string): string;
export declare function shouldUseAnthropic(config: any): boolean;
export declare function extractJsonObject(text: string): any;
export declare function fetchWithNodeHttpFallback(endpoint: string | URL, init?: any): Promise<any>;
export declare function callOpenAiCompatibleChat(config: any, options: LlmCallOptions): Promise<string>;
export declare function callAnthropicCompatibleChat(config: any, options: LlmCallOptions): Promise<any>;
export declare function callOpenAiCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export declare function callAnthropicCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export declare function runLlmTokenUsageSelfTest(): Promise<{
    pass: boolean;
    checks: {
        openAiContentPreserved: boolean;
        openAiInputTokensCaptured: boolean;
        openAiOutputTokensCaptured: boolean;
        anthropicContentPreserved: boolean;
        anthropicInputIncludesCacheTokens: boolean;
        anthropicOutputTokensCaptured: boolean;
    };
    openAiUsage: LlmTokenUsage;
    anthropicUsage: LlmTokenUsage;
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
export {};
