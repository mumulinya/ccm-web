import type { ProviderAgentTurn } from "../system/provider-native-tools";
import { type LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
export type NativeQueryFamily = "openai" | "anthropic" | "gemini";
export type NativeToolResult = {
    callId: string;
    name: string;
    ok: boolean;
    output?: any;
    error?: string;
    reason?: string;
};
export declare function nativeQueryFamily(config: any): NativeQueryFamily;
export declare function appendNativeAssistantTurn(messages: LlmChatMessage[], turn: ProviderAgentTurn, family: NativeQueryFamily): LlmChatMessage[];
export declare function appendNativeToolResults(messages: LlmChatMessage[], results: NativeToolResult[], family: NativeQueryFamily): LlmChatMessage[];
export declare function appendNativeTurnTranscript(messages: LlmChatMessage[], turn: ProviderAgentTurn, results: NativeToolResult[], family: NativeQueryFamily): LlmChatMessage[];
export declare function nativeTranscriptHasToolResult(messages: LlmChatMessage[]): boolean;
export declare function applyCompactedToolResultsToMessages(messages: LlmChatMessage[], results: Array<{
    callId?: string;
    toolCallId?: string;
    tool_call_id?: string;
    name?: string;
    ok?: boolean;
    output?: any;
    error?: string;
    reason?: string;
}>): LlmChatMessage[];
