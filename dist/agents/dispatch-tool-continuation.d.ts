/** Tool rounds retain the business identity. A synthetic task ID must not
 * remove the frozen Task's permission, scope, budget or recovery gates. */
export declare function bindDispatchToolContinuation(input: any): {
    taskId: string;
    traceId: string;
    attemptId: string;
    scope: import("./agent-run-types").AgentRunScope;
    scopeId: string;
    agentId: string;
    runtimeId: string;
    taskAgentSessionId: string;
    worktreeId: string;
    workspacePath: string;
    executionId: string;
    agentRunId: string;
    parentRunId: string;
    leaseOwnerId: string;
    deferAgentRunFinalization: boolean;
    source: string;
    idempotencyKey: string;
    originalRun: import("./agent-run-types").AgentRun;
};
export declare function recordDispatchToolContinuationUsage(binding: any, usage: any, round: number): import("./agent-governance-types").AgentBudgetDecision;
/** Called only after the previous Provider command has closed, with its
 * verified output contract. It is not a startup recovery inspection. */
export declare function observeDispatchToolContinuation(binding: any, evidence: any): Promise<void>;
