import type { LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
import type { ProviderToolDefinition } from "./provider-native-tools";
export declare function isOfficialOpenAiResponsesEndpoint(endpoint: string, config?: any): boolean;
export declare function buildResponsesContinuationFingerprint(input?: any): string;
export declare function responsesInputItemChecksums(inputItems: any[]): string[];
export declare function prepareResponsesContinuationRequest(endpoint: string, cache: any, config: any, input: {
    inputItems: any[];
    instructions?: string;
    tools?: any[];
    cacheKey?: string;
    reasoning?: string;
    model?: string;
}): {
    previousResponseId: string;
    inputItems: any[];
    mode: string;
    reason: string;
};
/**
 * Responses conversation state is used for first-party endpoints and for
 * proxied endpoints only after an isolated capability probe confirms it.
 * The local execution ledger remains authoritative; this state only decides
 * whether the provider request can be reduced to an append-only input suffix.
 */
export declare function getReusableResponsesPreviousId(endpoint: string, cache: any, config?: any): string;
export declare function rememberResponsesResponseId(endpoint: string, cache: any, responseId: string, config?: any, metadata?: any): void;
export declare function forgetResponsesPreviousId(cache: any, endpoint?: string, config?: any): void;
export declare function shouldOmitOpenAiResponsesMaxOutputTokens(endpoint: string, model: string): boolean;
export declare function rememberOpenAiResponsesMaxOutputTokensUnsupported(endpoint: string, model: string): void;
export declare function shouldOmitOpenAiResponsesTemperature(endpoint: string, model: string): boolean;
export declare function rememberOpenAiResponsesTemperatureUnsupported(endpoint: string, model: string): void;
export declare function shouldRetryOpenAiResponsesWithoutMaxOutputTokens(status: number, detail: string): boolean;
export declare function shouldRetryOpenAiResponsesWithoutTemperature(status: number, detail: string): boolean;
export declare function isOpenAiResponsesSse(response: any): boolean;
export declare function normalizeOpenAiResponsesUrl(value: string): string;
export declare function encodeOpenAiResponsesInput(messages: LlmChatMessage[], options?: {
    breakpointMessageIndexes?: number[];
    replayIdentity?: string;
}): any[];
export declare function buildOpenAiResponsesTools(tools?: ProviderToolDefinition[]): any[];
export declare function buildOpenAiResponsesBody(input: {
    model: string;
    messages: LlmChatMessage[];
    instructions?: string;
    previousResponseId?: string;
    maxOutputTokens?: number;
    stream?: boolean;
    reasoningEffort?: string;
    reasoningSummary?: "auto";
    temperature?: number;
    cachePatch?: Record<string, any>;
    breakpointMessageIndexes?: number[];
    nativeTools?: ProviderToolDefinition[];
    nativeToolChoice?: "auto" | "none";
    inputItems?: any[];
    replayIdentity?: string;
}): {
    tools?: any[];
    tool_choice?: "none" | "auto";
    temperature?: number;
    reasoning?: {
        summary?: string;
        effort: string;
    };
    stream?: boolean;
    max_output_tokens?: number;
    input: any[];
    previous_response_id?: string;
    instructions?: string;
    model: string;
};
export declare function safeProviderHttpDetail(value: any, limit?: number): string;
export declare function consumeOpenAiResponsesSse(response: any, onEvent: (event: any) => void): Promise<void>;
