import { type ResponsesOutputReplay } from './responses-output-replay';
import type { LlmTokenUsage } from "../modules/collaboration/group-orchestrator-llm-client";
export type ProviderToolDefinition = {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    deferred?: boolean;
};
export declare function orderedProviderTools(tools: ProviderToolDefinition[]): ProviderToolDefinition[];
export declare function serializeProviderToolSchema(tools: ProviderToolDefinition[]): string;
export type ProviderToolCall = {
    id: string;
    name: string;
    arguments: any;
    argumentsChecksum: string;
};
export type ProviderToolDeclaration = {
    id: string;
    name: string;
};
export type ProviderAgentTurn = {
    responsesOutput?: ResponsesOutputReplay;
    text: string;
    toolCalls: ProviderToolCall[];
    toolReferences: string[];
    stopReason: string;
    usage: LlmTokenUsage;
};
export declare function providerToolsRequestPatch(family: "openai" | "openai-responses" | "anthropic" | "gemini", tools: ProviderToolDefinition[], nativeToolReference?: boolean, toolChoice?: "auto" | "none"): {
    body: {
        tools: any[];
        tool_choice: "none" | "auto";
    };
    headers: {
        "anthropic-beta"?: undefined;
    };
} | {
    body: {
        toolConfig?: {
            functionCallingConfig: {
                mode: string;
            };
        };
        tools: {
            functionDeclarations: any[];
        }[];
        tool_choice?: undefined;
    };
    headers: {
        "anthropic-beta"?: undefined;
    };
} | {
    body: {
        tool_choice?: {
            type: string;
        };
        tools: any[];
    };
    headers: {
        "anthropic-beta": string;
    } | {
        "anthropic-beta"?: undefined;
    };
};
export declare function parseOpenAiAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function parseOpenAiResponsesAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function parseGeminiAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function parseAnthropicAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function turnForLegacyJsonLoop(turn: ProviderAgentTurn): string;
export declare function createOpenAiStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void, onToolCallDeclared?: (item: ProviderToolDeclaration) => void): {
    push(event: any): void;
    finish(usage: LlmTokenUsage): ProviderAgentTurn;
};
export declare function createOpenAiResponsesStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void, onToolCallDeclared?: (item: ProviderToolDeclaration) => void): {
    push(event: any): void;
    finalResponse(): any;
    finish(usage: LlmTokenUsage): ProviderAgentTurn;
};
export declare function createAnthropicStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void, onToolCallDeclared?: (item: ProviderToolDeclaration) => void): {
    push(event: any): void;
    finish(usage: LlmTokenUsage): ProviderAgentTurn;
};
