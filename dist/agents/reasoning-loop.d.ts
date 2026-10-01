export type ReasoningAssertionStatus = "pending" | "passed" | "failed" | "blocked";
export interface AgentReasoningState {
    version: 1;
    original_goal: string;
    effective_goal: string;
    authorization_scope: string[];
    clarification_chain: Array<{
        question: string;
        answer: string;
        at: string;
    }>;
    plan_version: number;
    plan: string[];
    replan_required: boolean;
    last_replan_reason: string;
    plan_history: Array<{
        version: number;
        plan: string[];
        reason: string;
        fact_hash: string;
        at: string;
    }>;
    fact_snapshots: Array<{
        id: string;
        source: string;
        hash: string;
        summary: string;
        at: string;
    }>;
    assertions: Array<{
        id: string;
        label: string;
        kind: string;
        status: ReasoningAssertionStatus;
        evidence: string[];
        reason: string;
        updated_at: string;
    }>;
    deviations: Array<{
        id: string;
        type: string;
        detail: string;
        severity: "info" | "warning" | "error";
        at: string;
    }>;
    postmortems: Array<{
        trigger: string;
        what_happened: string;
        correction: string;
        prevent_repeat: string;
        at: string;
    }>;
    recovery_checks: Array<{
        reason: string;
        goal_revalidated: boolean;
        state_revalidated: boolean;
        acceptance_revalidated: boolean;
        remaining_gaps: string[];
        at: string;
    }>;
    explanations: Array<{
        decision: string;
        reason: string;
        at: string;
    }>;
    updated_at: string;
}
export declare function createAgentReasoningState(input?: {
    goal?: string;
    authorizationScope?: string[];
    plan?: string[];
    assertions?: any[];
}): AgentReasoningState;
export declare function normalizeAgentReasoningState(value: any, goal?: string): AgentReasoningState;
export declare function appendReasoningClarification(state: AgentReasoningState, input: {
    question: string;
    answer: string;
    authorizationScope?: string[];
}): AgentReasoningState;
export declare function captureReasoningFacts(state: AgentReasoningState, source: string, facts: any): string;
export declare function updateReasoningPlan(state: AgentReasoningState, plan: string[], reason?: string): AgentReasoningState;
export declare function explainReasoningDecision(state: AgentReasoningState, decision: string, reason: string): AgentReasoningState;
export declare function recordReasoningDeviation(state: AgentReasoningState, type: string, detail: string, severity?: "info" | "warning" | "error"): AgentReasoningState;
export declare function recordReasoningPostmortem(state: AgentReasoningState, input: {
    trigger: string;
    whatHappened: string;
    correction: string;
    preventRepeat: string;
}): AgentReasoningState;
export declare function setReasoningAssertion(state: AgentReasoningState, input: {
    id: string;
    label?: string;
    kind?: string;
    status: ReasoningAssertionStatus;
    evidence?: any[];
    reason?: string;
}): AgentReasoningState;
export declare function recordReasoningRecoveryCheck(state: AgentReasoningState, input: {
    reason: string;
    goalRevalidated: boolean;
    stateRevalidated: boolean;
    acceptanceRevalidated: boolean;
    remainingGaps?: any[];
}): AgentReasoningState;
export declare function buildTaskReasoningState(task: any, summary?: any): AgentReasoningState;
export declare function runAgentReasoningLoopSelfTest(): {
    pass: boolean;
    checks: {
        clarificationPreservesOriginalGoal: boolean;
        planVersionIncrements: boolean;
        authorizationScopeIsExplicit: boolean;
        deviationIsAudited: boolean;
        deviationRequiresReplan: boolean;
        misjudgmentCreatesPostmortem: boolean;
        recoveryRevalidatesGoalAndAcceptance: boolean;
    };
    state: AgentReasoningState;
};
