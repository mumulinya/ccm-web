export type ModelActivityPhase = "understanding" | "tool_decision" | "tool_result_review" | "verification" | "final_synthesis";
export type ModelActivityState = "thinking" | "retrying" | "streaming" | "completed" | "failed" | "started" | "waiting";
export type ProviderRequestActivity = {
    phase: "request_dispatched" | "response_started";
    provider?: "openai" | "anthropic" | "gemini";
    providerRequestIdPresent?: boolean;
};
export type CcmNativeModelCallLifecycle = {
    onAnswerPhase?(phase: 'process' | 'final'): void;
    onDelta(delta: string): void;
    onToolDeclared?(toolName: string): void;
    onRetry(attempt: number, maxRetries?: number, retryDelayMs?: number): void;
    onProviderRequestActivity?(activity: ProviderRequestActivity): void;
    complete(): void;
    fail(error?: unknown): void;
};
export type CcmNativeModelCallLifecycleFactory = (input: {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    anchorMessageId?: string;
    modelCallIndex: number;
    phase: ModelActivityPhase;
}) => CcmNativeModelCallLifecycle;
export declare function modelActivityDefaultLabel(_phase: ModelActivityPhase): string;
export declare function createModelActivityController(input: {
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    modelCallIndex: number;
    phase: ModelActivityPhase;
    label?: string;
    generation?: number;
    taskId?: string;
    anchorMessageId?: string;
    onActivity?: (activity: any, event: any) => void;
}): {
    eventId: string;
    onAnswerPhase(value: "process" | "final"): void;
    onDelta(delta: string): void;
    onToolDeclared(toolName: string): void;
    onRetry(attempt: number, maximumRetries?: number, delayMs?: number): void;
    onProviderRequestActivity(activity: ProviderRequestActivity): void;
    updateLabel(label: string): void;
    complete(): void;
    fail(error?: any): void;
};
/** Extracts only a JSON string field after an allowed response type is known. */
export declare function createSafeJsonReplyDeltaExtractor(onDelta?: (delta: string) => void): {
    push(chunk: string): void;
    readonly emitted: boolean;
};
export declare function streamDeltaChecksum(input: {
    runId: string;
    modelCallIndex: number;
    sequence: number;
    delta: string;
}): string;
