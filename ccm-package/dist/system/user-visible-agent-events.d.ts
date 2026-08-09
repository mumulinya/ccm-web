export declare const USER_VISIBLE_AGENT_EVENT_SCHEMA: "ccm-user-visible-agent-event-v1";
export declare const USER_VISIBLE_AGENT_RESULT_SCHEMA: "ccm-user-visible-agent-result-v1";
export type UserVisibleAgentEventType = "turn_started" | "thinking_status" | "assistant_text_delta" | "tool_started" | "tool_progress" | "tool_completed" | "tool_failed" | "agent_started" | "agent_progress" | "agent_completed" | "agent_failed" | "permission_required" | "clarification_required" | "context_compacted" | "result";
export type UserVisibleAgentEvent = {
    schema: typeof USER_VISIBLE_AGENT_EVENT_SCHEMA;
    eventId: string;
    sequence: number;
    eventType: UserVisibleAgentEventType;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    taskId?: string;
    workItemId?: string;
    toolCallId?: string;
    parentEventId?: string;
    parallelGroupId?: string;
    display: {
        title: string;
        target?: string;
        summary?: string;
        status: "running" | "success" | "failed" | "waiting";
        durationMs?: number;
        toolUseCount?: number;
        tokenCount?: number;
    };
    detail?: {
        safeArguments?: any;
        safeResult?: any;
        evidenceIds?: string[];
        fileChanges?: any[];
        usage?: any;
    };
    visibility: "default" | "transcript" | "technical";
    contentStored: false;
    createdAt: string;
};
export declare function sanitizeUserVisibleAgentDetail(value: any, depth?: number, seen?: WeakSet<object>): any;
export declare function normalizeUserVisibleAgentEvent(input: any, sequence?: number): UserVisibleAgentEvent;
export declare function appendUserVisibleAgentEvent(input: any): UserVisibleAgentEvent;
export declare function listUserVisibleAgentEvents(filter: any): {
    schema: string;
    events: UserVisibleAgentEvent[];
    nextCursor: number;
    hasMore: boolean;
    contentStored: boolean;
};
export declare function subscribeUserVisibleAgentEvents(handler: (event: UserVisibleAgentEvent) => void): () => boolean;
/** Live-only text/progress events. They deliberately bypass the projection store. */
export declare function publishEphemeralUserVisibleAgentEvent(input: any): UserVisibleAgentEvent;
export declare function buildUserVisibleAgentResult(input: any): {
    schema: "ccm-user-visible-agent-result-v1";
    status: string;
    text: string;
    durationMs: number;
    modelDurationMs: number;
    turns: number;
    toolCalls: number;
    stopReason: string;
    agentStats: any;
    fileChanges: any;
    verification: any;
    unfinished: string[];
    usage: any;
    contentStored: boolean;
};
export declare function appendToolProjection(input: any): UserVisibleAgentEvent;
export declare function clearUserVisibleAgentEventsForTest(): void;
export declare function runUserVisibleAgentEventSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        ccLabel: boolean;
        secretRedacted: boolean;
        bodyProjected: boolean;
        noContent: boolean;
    };
    event: UserVisibleAgentEvent;
};
