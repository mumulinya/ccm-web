import { type ToolResultPersistContext } from "../tools/tool-result-storage";
export type SessionExecutionEventType = "tool_use" | "tool_result";
export type SessionExecutionEvent = {
    id: string;
    type: SessionExecutionEventType;
    toolCallId: string;
    toolName: string;
    timestamp: string;
    runId: string;
    traceId: string;
    anchorMessageId: string;
    status: "running" | "ok" | "error";
    hidden: true;
    payload: any;
};
export declare function sanitizeSessionExecutionValue(value: any, depth?: number, seen?: WeakSet<object>): any;
export declare function createSessionExecutionEvent(input: Partial<SessionExecutionEvent> & {
    type: SessionExecutionEventType;
    toolName: string;
    payload?: any;
    persistContext?: ToolResultPersistContext | null;
}): {
    type: SessionExecutionEventType;
    toolName: string;
    toolCallId: string;
    timestamp: string;
    runId: string;
    traceId: string;
    anchorMessageId: string;
    status: "error" | "ok" | "running";
    payload: any;
    id: string;
    hidden: true;
};
export declare function executionEventModelContent(event: SessionExecutionEvent, options?: {
    clearToolResult?: boolean;
    replacementText?: string;
}): string;
export declare function executionEventToModelMessage(event: SessionExecutionEvent, options?: {
    clearToolResult?: boolean;
    replacementText?: string;
}): {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    type: SessionExecutionEventType;
    tool_call_id: string;
    tool_name: string;
    hidden_execution: boolean;
    anchor_message_id: string;
};
export declare function normalizeSessionExecutionEvents(value: any): SessionExecutionEvent[];
export declare function findPendingToolCallId(events: SessionExecutionEvent[], runId: string, toolName: string): string;
export declare function eventsAnchoredToMessages(events: SessionExecutionEvent[], messages: any[]): SessionExecutionEvent[];
export declare function mergeConversationWithExecution(messages: any[], events: SessionExecutionEvent[], options?: {
    clearedToolCallIds?: Set<string>;
    replacedToolResults?: Map<string, string>;
}): any[];
export declare function runSessionExecutionLedgerSelfTest(): {
    pass: boolean;
    checks: {
        secretRedacted: boolean;
        binaryReplaced: boolean;
        toolPairBound: boolean;
        toolRolesMatchCc: boolean;
        hiddenFromVisibleTranscript: boolean;
        recentResultPreservedRaw: boolean;
        anchoredSelectionExact: boolean;
    };
};
