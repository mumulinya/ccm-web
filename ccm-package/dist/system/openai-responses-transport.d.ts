import type { LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
import type { ProviderToolDefinition } from "./provider-native-tools";
export declare function normalizeOpenAiResponsesUrl(value: string): string;
export declare function encodeOpenAiResponsesInput(messages: LlmChatMessage[]): any[];
export declare function buildOpenAiResponsesTools(tools?: ProviderToolDefinition[]): {
    type: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
}[];
export declare function buildOpenAiResponsesBody(input: {
    model: string;
    messages: LlmChatMessage[];
    maxOutputTokens?: number;
    stream?: boolean;
    reasoningEffort?: string;
    temperature?: number;
    cachePatch?: Record<string, any>;
    nativeTools?: ProviderToolDefinition[];
}): {
    tools?: {
        type: string;
        name: string;
        description: string;
        parameters: Record<string, any>;
    }[];
    tool_choice?: string;
    temperature?: number;
    reasoning?: {
        effort: string;
    };
    stream?: boolean;
    max_output_tokens?: number;
    model: string;
    input: any[];
};
export declare function safeProviderHttpDetail(value: any, limit?: number): string;
export declare function consumeOpenAiResponsesSse(response: any, onEvent: (event: any) => void): Promise<void>;
