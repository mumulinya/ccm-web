export type LlmChatMessage = {
    role: string;
    content: string;
};
type LlmCallOptions = {
    messages: LlmChatMessage[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    defaultTimeoutMs?: number;
    httpErrorPrefix?: string;
    invalidJsonMessage?: string;
};
export declare function normalizeChatCompletionsUrl(apiUrl: string): string;
export declare function normalizeAnthropicMessagesUrl(apiUrl: string): string;
export declare function shouldUseAnthropic(config: any): boolean;
export declare function extractJsonObject(text: string): any;
export declare function callOpenAiCompatibleChat(config: any, options: LlmCallOptions): Promise<string>;
export declare function callAnthropicCompatibleChat(config: any, options: LlmCallOptions): Promise<any>;
export declare function callOpenAiCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export declare function callAnthropicCompatibleJson(config: any, options: LlmCallOptions): Promise<any>;
export {};
