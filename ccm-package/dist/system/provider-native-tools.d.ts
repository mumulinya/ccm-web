import type { LlmTokenUsage } from "../modules/collaboration/group-orchestrator-llm-client";
export type ProviderToolDefinition = {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    deferred?: boolean;
};
export type ProviderToolCall = {
    id: string;
    name: string;
    arguments: any;
    argumentsChecksum: string;
};
export type ProviderAgentTurn = {
    text: string;
    toolCalls: ProviderToolCall[];
    toolReferences: string[];
    stopReason: string;
    usage: LlmTokenUsage;
};
export declare function providerToolsRequestPatch(family: "openai" | "anthropic" | "gemini", tools: ProviderToolDefinition[], nativeToolReference?: boolean): {
    body: {
        tools: {
            type: string;
            function: {
                name: string;
                description: string;
                parameters: Record<string, any>;
            };
        }[];
        tool_choice: string;
    };
    headers: {
        "anthropic-beta"?: undefined;
    };
} | {
    body: {
        tools: {
            functionDeclarations: {
                name: string;
                description: string;
                parameters: Record<string, any>;
            }[];
        }[];
        tool_choice?: undefined;
    };
    headers: {
        "anthropic-beta"?: undefined;
    };
} | {
    body: {
        tools: {
            defer_loading?: boolean;
            name: string;
            description: string;
            input_schema: Record<string, any>;
        }[];
        tool_choice?: undefined;
    };
    headers: {
        "anthropic-beta": string;
    } | {
        "anthropic-beta"?: undefined;
    };
};
export declare function parseOpenAiAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function parseGeminiAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function parseAnthropicAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn;
export declare function turnForLegacyJsonLoop(turn: ProviderAgentTurn): string;
export declare function createOpenAiStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void): {
    push(event: any): void;
    finish(usage: LlmTokenUsage): ProviderAgentTurn;
};
export declare function createAnthropicStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void): {
    push(event: any): void;
    finish(usage: LlmTokenUsage): ProviderAgentTurn;
};
