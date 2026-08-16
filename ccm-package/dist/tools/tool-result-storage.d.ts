export declare const DEFAULT_MAX_RESULT_SIZE_CHARS = 50000;
export declare const MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = 200000;
export declare const PREVIEW_SIZE_BYTES = 2000;
export declare const PERSISTED_OUTPUT_TAG = "<persisted-output>";
export declare const PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
export declare const TOOL_RESULT_CLEARED_MESSAGE = "[Old tool result content cleared]";
export declare const PERSISTED_TOOL_RESULT_SCHEMA = "ccm-persisted-tool-result-v1";
export type ToolResultPersistContext = {
    scope: string;
    sessionId: string;
};
export type PersistedToolResultV1 = {
    schema: typeof PERSISTED_TOOL_RESULT_SCHEMA;
    version: 1;
    toolCallId: string;
    toolName: string;
    preview: string;
    originalChars: number;
    bytes: number;
    checksum: string;
    locator: string;
    path: string;
    contentStored: true;
};
export declare function markToolResultSeenUnreplaced(context: ToolResultPersistContext, toolCallId: string): void;
export declare function frozenToolResultPreview(context: ToolResultPersistContext, toolCallId: string): string;
export declare function wasToolResultSentUnreplaced(context: ToolResultPersistContext, toolCallId: string): boolean;
export declare function isPersistedToolResult(value: any): value is PersistedToolResultV1;
export declare function shouldSkipToolResultPersist(toolName: string, value: any): boolean;
export declare function modelVisiblePersistedToolResult(value: PersistedToolResultV1 | string): string;
export declare function modelVisibleToolResultValue(value: any): any;
export declare function persistToolResultIfNeeded(input: {
    toolName: string;
    toolCallId: string;
    payload: any;
    context?: ToolResultPersistContext | null;
    thresholdChars?: number;
}): any;
export declare function persistPayloadObservation(input: {
    toolName: string;
    toolCallId: string;
    payload: any;
    context?: ToolResultPersistContext | null;
    thresholdChars?: number;
}): any;
export declare function enforceToolResultBudget<T extends {
    callId?: string;
    toolCallId?: string;
    name?: string;
    output?: any;
}>(rows: T[], context: ToolResultPersistContext, maxChars?: number): {
    rows: T[];
    changed: boolean;
};
export declare function persistNativeToolResultRows<T extends {
    callId?: string;
    toolCallId?: string;
    name?: string;
    output?: any;
}>(rows: T[], context?: ToolResultPersistContext | null): {
    rows: T[];
    changed: boolean;
};
export declare function runToolResultStorageSelfTest(): {
    pass: boolean;
    checks: {
        persistedSchema: boolean;
        previewStable: boolean;
        fileExists: boolean;
        previewHasTag: boolean;
        smallUnchanged: boolean;
        readFileSkipped: boolean;
        alreadySentFullNotReplaced: boolean;
    };
};
