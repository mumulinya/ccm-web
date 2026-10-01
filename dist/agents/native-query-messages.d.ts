import type { ProviderAgentTurn } from "../system/provider-native-tools";
import { type LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
export type NativeQueryFamily = "openai" | "anthropic" | "gemini";
export type NativeToolResult = {
    callId: string;
    name: string;
    ok: boolean;
    output?: any;
    /** Stable model-visible projection; auditReceipt is never serialized to providers. */
    modelOutput?: any;
    auditReceipt?: any;
    modelAttachments?: any[];
    error?: string;
    reason?: string;
};
/** Remove backend-only audit data before a JSON-protocol result is appended to a model message. */
export declare function modelVisibleNativeToolResult(result: NativeToolResult): NativeToolResult;
/**
 * Keep one full copy of an exactly repeated tool result per model turn while
 * retaining one protocol result for every native call id. Audit receipts and
 * persisted rows are untouched; only the model-visible payload is replaced by
 * a deterministic reference for later duplicates.
 */
export declare function dedupeNativeToolResultsForModel(results: NativeToolResult[], existingMessages?: LlmChatMessage[]): NativeToolResult[];
export declare function nativeQueryFamily(config: any): NativeQueryFamily;
export declare function appendNativeAssistantTurn(messages: LlmChatMessage[], turn: ProviderAgentTurn, family: NativeQueryFamily): LlmChatMessage[];
export declare function appendNativeToolResults(messages: LlmChatMessage[], results: NativeToolResult[], family: NativeQueryFamily): LlmChatMessage[];
/**
 * Runtime catalog/session blocks are request metadata. Keep them as one
 * trailing block in the source transcript while conversation/tool events are
 * appended before them. Otherwise the next wire projection has to move the
 * metadata across committed tool history and loses the Provider prefix.
 */
export declare function insertBeforeDynamicSystemTail(messages: LlmChatMessage[], additions: LlmChatMessage[]): LlmChatMessage[];
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
