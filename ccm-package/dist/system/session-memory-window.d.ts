export declare const SESSION_MEMORY_MIN_KEEP_TOKENS = 10000;
export declare const SESSION_MEMORY_MIN_TEXT_MESSAGES = 5;
export declare const SESSION_MEMORY_MAX_KEEP_TOKENS = 40000;
type SessionMemoryWindowOptions = {
    floorIndex?: number;
    lastSummarizedMessageId?: string;
    minTokens?: number;
    minTextMessages?: number;
    maxTokens?: number;
    estimateMessageTokens?: (message: any) => number;
};
export declare function adjustSessionWindowForApiInvariants(messages: any[], startIndex: number, floorIndex?: number): number;
export declare function buildCompleteConversationRounds(messagesInput: any[]): any[][];
export declare function peelOldestCompleteConversationRound(messagesInput: any[]): {
    peeled: boolean;
    messages: any[];
    removed: any[];
};
export declare function calculateSessionMemoryKeepWindow(messages: any[], options?: SessionMemoryWindowOptions): {
    schema: string;
    strategy: string;
    startIndex: number;
    floorIndex: number;
    preservedMessageCount: number;
    preservedTextMessageCount: number;
    preservedTokenCount: number;
    minTokens: number;
    minTextMessages: number;
    maxTokens: number;
    lastSummarizedMessageId: string;
    lastSummarizedMessageIndex: number;
    cursorValid: boolean;
    tokenSelectedStartIndex: number;
    expandedForConversationTurn: boolean;
    maxExceededForAtomicBoundary: boolean;
    minimumSatisfied: boolean;
};
export {};
