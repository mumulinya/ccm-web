import { ConversationSummary } from "./group-compaction-receipts";
export declare function buildGroupSessionMemoryCompactSelectionReceipt(input?: any): any;
export declare function verifyGroupSessionMemoryCompactSelectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function selectGroupSessionMemoryForCompact(input?: any): Promise<{
    selected: boolean;
    markdown: string;
    keepIndex: number;
    receipt: any;
} | {
    selected: boolean;
    markdown: string;
    keepIndex: number;
    snapshot: any;
    receipt: any;
}>;
export declare function buildGroupPreservedSegment(messages: any[], keepIndex: number, options?: any): {
    schema: string;
    version: number;
    keepIndex: number;
    floorIndex: number;
    preservedMessageCount: number;
    preservedTextBlockMessageCount: number;
    preservedTokenEstimate: any;
    preservedMessageIds: string[];
    omittedPreservedMessageIds: number;
    firstPreservedMessageId: string;
    lastPreservedMessageId: string;
    summarizedThroughMessageId: string;
    summaryMessageId: string;
    summaryChecksum: string;
    headMessageId: string;
    anchorMessageId: string;
    tailMessageId: string;
    anchorKind: string;
    anchorMode: string;
    minTokens: number;
    minTextBlockMessages: number;
    maxTokens: number;
    protectedTaskTransaction: boolean;
    firstPreservedTaskId: string;
    transcriptPath: any;
    createdAt: any;
};
export declare function messageContentBlocks(message: any): any[];
export declare function collectWindowBlockRefs(messages: any[], offset?: number): {
    toolUseIds: Set<string>;
    toolResultIds: Set<string>;
    thinkingMessageIds: Set<string>;
    rows: any[];
};
export declare function collectApiMicroCompactSignals(messages?: any[]): {
    toolUseIds: string[];
    toolResultIds: string[];
    toolNames: string[];
    resultToolNames: string[];
    toolUseBlockCount: number;
    toolResultBlockCount: number;
    thinkingBlockCount: number;
    redactedThinkingBlockCount: number;
    hasThinking: boolean;
    hasToolUses: boolean;
    hasToolResults: boolean;
};
export declare const GROUP_TIME_BASED_COMPACTABLE_TOOL_NAMES: Set<string>;
export declare function normalizedToolName(value: any): string;
export declare function timeBasedToolResultReceiptChecksum(receipt: any): string;
export declare function verifyGroupTimeBasedToolResultProjectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function clearProjectedToolResultValue(value: any, clearIds: Set<string>, state: {
    tokensSaved: number;
    cleared: number;
}): any;
export declare function buildGroupTimeBasedToolResultProjection(messages?: any[], options?: any): {
    messages: any[];
    receipt: any;
    applied: boolean;
};
export declare function timeBasedThinkingReceiptChecksum(receipt: any): string;
export declare function verifyGroupTimeBasedThinkingProjectionReceipt(receipt: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function hasModelVisibleThinking(message: any): boolean;
export declare function clearProjectedThinkingValue(value: any, state: {
    tokensSaved: number;
    clearedBlocks: number;
}): any;
export declare function buildGroupTimeBasedThinkingProjection(messages?: any[], options?: any): {
    messages: any[];
    receipt: any;
    applied: boolean;
    shouldPersist: boolean;
};
export declare function buildGroupApiMicroCompactEditPlan(messages?: any[], options?: any): any;
export declare function buildGroupApiMicrocompactNativeApplyPlan(apiEditPlan?: any, options?: any): any;
export declare function verifyGroupApiMicrocompactNativeApplyPlan(plan?: any, expected?: any): {
    valid: boolean;
    issues: string[];
    computedApplyPlanChecksum: string;
    computedRequestPatchChecksum: string;
};
export declare function createEmptyConversationSummary(): ConversationSummary;
export declare function extractFiles(message: any): string[];
export declare function extractRuntimeSkillFacts(message: any): string[];
export declare function extractVerificationFacts(message: any): string[];
export declare function extractMessageStatus(message: any): string;
