import { AgentRuntimeId } from "./runtime";
export declare const AGENT_RUNTIME_EVENT_SCHEMA: "ccm-agent-runtime-event-v1";
export type AgentRuntimeStructuredEventType = "assistant_progress" | "tool_started" | "tool_completed" | "tool_failed" | "file_changed" | "verification_started" | "verification_completed" | "status";
export type AgentRuntimeProgressSource = "agent_reported" | "runtime_structured" | "system_observed";
export interface AgentRuntimeEventIdentity {
    taskId: string;
    workItemId: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    anchorMessageId: string;
    originMessageId?: string;
    agentRunId: string;
    generation: number;
    attempt: number;
    leaseId: string;
    project?: string;
}
export type AgentRuntimeFileReadEvidence = {
    project: string;
    path: string;
    ranges: Array<{
        start: number;
        end: number;
    }>;
    checksum?: string;
    source: "structured_tool" | "safe_command_inference";
    contentStored: false;
};
export interface AgentRuntimeStructuredEvent extends AgentRuntimeEventIdentity {
    schema: typeof AGENT_RUNTIME_EVENT_SCHEMA;
    eventId: string;
    runtime: AgentRuntimeId;
    runtimeVersion: string;
    eventType: AgentRuntimeStructuredEventType;
    toolCallId?: string;
    assistantRole?: "progress" | "final";
    relatedToolCallIds?: string[];
    progressSource: AgentRuntimeProgressSource;
    confidence: "declared" | "observed";
    safeSummary?: string;
    target?: string;
    toolName?: string;
    safeArguments?: Record<string, unknown>;
    safeResult?: Record<string, unknown>;
    fileReadEvidence?: AgentRuntimeFileReadEvidence;
    status: "running" | "success" | "failed" | "waiting";
    sourceEventChecksum: string;
    createdAt: string;
    contentStored: false;
}
type ParserOptions = {
    runtime: string;
    runtimeVersion?: string;
    identity: AgentRuntimeEventIdentity;
    onEvent: (event: AgentRuntimeStructuredEvent) => void;
    onContractDrift?: (detail: {
        runtime: AgentRuntimeId;
        reason: string;
        sourceEventChecksum: string;
    }) => void;
};
export declare function createAgentRuntimeStructuredEventParser(options: ParserOptions): {
    push(chunk: string | Buffer): void;
    flush(): void;
    stats(): {
        runtime: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
        seen: number;
        pendingBytes: number;
        index: number;
    };
};
export declare function runAgentRuntimeStructuredEventSelfTest(): {
    pass: boolean;
    events: AgentRuntimeStructuredEvent[];
};
export {};
