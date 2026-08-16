import { type NativeQueryFamily } from "./native-query-messages";
import type { SessionExecutionEvent } from "../system/session-execution-ledger";
import type { LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
import { type ToolResultPersistContext } from "../tools/tool-result-storage";
export declare const NATIVE_SESSION_RESUME_HINT = "\u7CBE\u786E\u4F1A\u8BDD\u539F\u751F\u7EED\u5199\u5DF2\u542F\u7528\u3002\u4E0A\u4E00\u8F6E\u6B63\u6587\u3001\u8BA1\u5212\u5361\u7247\u548C\u5DE5\u5177\u7ED3\u679C\u5DF2\u5728 messages \u4E2D\uFF1B\u672A\u53D8\u5316\u7684\u6587\u4EF6\u4E0D\u8981\u91CD\u8BFB\u3002\u4EE5\u4E0B\u53C2\u8003\u6750\u6599\u4E0D\u4E00\u5B9A\u4E0E\u5F53\u524D\u53E5\u76F8\u5173\u3002";
export type NativeSessionMetaBlock = {
    title: string;
    body: string;
};
export type NativeSessionTranscriptInput = {
    family?: NativeQueryFamily;
    conversation?: any[];
    executionEvents?: SessionExecutionEvent[];
    canonicalSummary?: any;
    metaBlocks?: NativeSessionMetaBlock[];
    currentUserText?: string;
    presentedPlan?: any;
    clearedToolCallIds?: Iterable<string>;
    replacedToolResults?: Map<string, string> | Record<string, string> | Array<{
        toolCallId?: string;
        projectedText?: string;
    }>;
    persistContext?: ToolResultPersistContext | null;
};
export declare function shouldMaterializeNativeSessionTranscript(config: any, sessionId: string): boolean;
export declare function splitNativeSystemSegments(input: {
    identityRules: string;
    sessionGuidance?: string;
    mcpPolicy?: string;
}): LlmChatMessage[];
export declare function buildNativeMetaUserMessage(blocks: NativeSessionMetaBlock[], extra?: string[]): {
    role: string;
    content: string;
    isMeta: boolean;
};
export declare function materializeNativeSessionTranscript(input: NativeSessionTranscriptInput): LlmChatMessage[];
export declare function lastNativeUserText(messages: LlmChatMessage[]): string;
export declare function inspectNativeResumePayload(messages: LlmChatMessage[], currentUserText: string): {
    lastUserIsCurrent: boolean;
    systemHasNoSessionDump: boolean;
    latestUserHasNoSessionDump: boolean;
    hasNativeToolCall: boolean;
    hasNativeToolResult: boolean;
    noPendingPresentPlan: boolean;
    serialized: string;
};
export declare function runNativeSessionTranscriptSelfTest(): {
    pass: boolean;
    checks: {
        lastUserIsCurrent: boolean;
        hasNativeToolCall: boolean;
        hasNativeToolResult: boolean;
        noSessionJsonDump: boolean;
        noPendingPresentPlan: boolean;
        droppedUnpairedToolUse: boolean;
        planInMeta: boolean;
        resumeHintPresent: boolean;
        systemHasThreeSegments: boolean;
        systemHasNoHistory: boolean;
        compactWindowKeepsToolPair: boolean;
        groupAssembly: boolean;
        projectAssembly: boolean;
        globalAssembly: boolean;
        nativeFamilyHelper: boolean;
        jsonModeSkipped: boolean;
        emptySessionSkipped: boolean;
        forcedNativeMaterialize: boolean;
        readFilesReplayUsesReceipt: boolean;
        nativeAppliesMicroCompact: boolean;
    };
    messages: LlmChatMessage[];
    system: LlmChatMessage[];
};
