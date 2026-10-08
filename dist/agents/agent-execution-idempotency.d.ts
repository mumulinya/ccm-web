export interface AgentExecutionIdempotencyInput {
    scope: string;
    scopeId: string;
    taskId: string;
    agentId: string;
    traceId: string;
    attemptId: string;
    triggerType?: string;
    reason?: string;
    requestId?: string;
}
/** Build a stable key for one logical execution request. Never include prompt or secrets. */
export declare function buildAgentExecutionIdempotencyKey(input: AgentExecutionIdempotencyInput): string;
export declare function buildAgentHeartbeatIdempotencyKey(input: AgentExecutionIdempotencyInput): string;
