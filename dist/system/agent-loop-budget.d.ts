export declare const AGENT_LOOP_BUDGET_SCHEMA: "ccm-agent-loop-budget-v1";
export type AgentLoopMode = "adaptive" | "bounded";
export type AgentLoopBudget = {
    schema: typeof AGENT_LOOP_BUDGET_SCHEMA;
    mode: AgentLoopMode;
    contextWindow: number;
    remainingSafeTokens: number;
    /** Adaptive mode: soft segment size. Bounded mode: hard total limit. */
    toolCallBudget: number;
    /** Adaptive mode: soft segment duration. Bounded mode: hard total limit. */
    timeBudgetMs: number;
    riskBudget: number;
    /** Adaptive mode: soft segment size. Bounded mode: hard total limit. */
    maxModelTurns: number;
    /** Legacy bounded-mode limit. It is never a normal stop condition in adaptive mode. */
    maxToolRounds: number;
    toolBatchSize: number;
    readOnlyParallelism: number;
    noProgressThreshold: number;
};
export declare function resolveAgentLoopBudget(input?: any): AgentLoopBudget;
export declare function shouldContinueAgentLoop(input: {
    budget: AgentLoopBudget;
    round: number;
    modelTurns: number;
    toolCalls: number;
    elapsedMs?: number;
    unresolvedCriteria?: number;
    dependenciesReady?: boolean;
    waitingDependency?: boolean;
    repeatedFailure?: boolean;
    noProgressCount?: number;
    cancelled?: boolean;
    authorizationBlocked?: boolean;
    contextSafe?: boolean;
}): {
    continue: boolean;
    reason: string;
    resetSegment: boolean;
};
export declare function runAgentLoopBudgetSelfTest(): {
    pass: boolean;
    adaptive: AgentLoopBudget;
    adaptiveDecision: {
        continue: boolean;
        reason: string;
        resetSegment: boolean;
    };
    bounded: AgentLoopBudget;
    boundedDecision: {
        continue: boolean;
        reason: string;
        resetSegment: boolean;
    };
    noProgressDecision: {
        continue: boolean;
        reason: string;
        resetSegment: boolean;
    };
};
