export type AgentIntentCategory = "conversation" | "question" | "analysis" | "execution" | "high_risk" | "ambiguous";
export interface AgentDecisionIntent {
    category: AgentIntentCategory;
    goal: string;
    action_required: boolean;
    target_refs: string[];
    impact_scope: string[];
    confidence: number;
    authorization_basis: "current_message" | "confirmation" | "none";
    reason: string;
}
export interface AgentQualityPolicy {
    version: 1;
    shadowMode: boolean;
    minWriteConfidence: number;
    requireGroundedTarget: boolean;
    updatedAt: string;
    updatedBy: string;
    reason: string;
}
export declare function getAgentQualityPolicy(): AgentQualityPolicy;
export declare function setAgentQualityPolicy(input: Partial<AgentQualityPolicy> & {
    actor?: string;
    reason: string;
}): AgentQualityPolicy;
export declare function normalizeAgentDecisionIntent(value: any, message: string): AgentDecisionIntent;
export declare function evaluateAgentDecision(input: {
    message: string;
    decision: any;
    toolName?: string;
    args?: any;
    risk?: "read" | "write" | "high";
    explicitWriteAuthorization?: boolean;
    priorSteps?: any[];
    policyOverride?: Partial<AgentQualityPolicy>;
}): {
    intent: AgentDecisionIntent;
    policy: AgentQualityPolicy;
    toolName: string;
    risk: "high" | "read" | "write";
    targets: any[];
    groundedTarget: boolean;
    authorizationBasis: string;
    requiresClarification: boolean;
    clarificationReasons: string[];
    clarificationQuestion: string;
    shadowed: boolean;
    allowed: boolean;
};
export declare function recordAgentDecision(input: any): {
    version: number;
    id: any;
    at: any;
    run_id: string;
    trace_id: string;
    session_id: string;
    source: string;
    message_hash: string;
    message_preview: string;
    intent: any;
    proposed_tool: any;
    risk: any;
    target_grounded: boolean;
    authorization_basis: any;
    outcome: any;
    reasons: string[];
    status: any;
};
export declare function buildAgentQualitySnapshot(input?: {
    tasks?: any[];
    sessions?: any[];
}): {
    generated_at: string;
    policy: AgentQualityPolicy;
    totals: {
        decisions: number;
        proposed_writes: number;
        tasks: number;
        completed_tasks: number;
        scored_completed_tasks: number;
        legacy_unscored_completed: number;
        sessions: number;
    };
    counts: {
        potential_misdispatch: number;
        missed_execution: number;
        unauthorized_write: number;
        false_completion: number;
        clarification: number;
        shadowed: number;
        recovered_sessions: number;
        healthy_native_recovery: number;
        conflict_tasks: number;
        handled_conflicts: number;
        first_pass_delivery: number;
        reasoning_tasks: number;
        recovery_revalidated: number;
        replanned_tasks: number;
        reasoning_error_tasks: number;
        postmortem_tasks: number;
    };
    rates: {
        misdispatch_rate: number;
        missed_execution_rate: number;
        unauthorized_write_rate: number;
        false_completion_rate: number;
        native_session_recovery_rate: number;
        conflict_handling_rate: number;
        first_pass_delivery_rate: number;
        recovery_goal_revalidation_rate: number;
        dynamic_replan_rate: number;
    };
    recent_decisions: any[];
    recent_reasoning_tasks: {
        task_id: any;
        title: any;
        status: any;
        plan_version: number;
        open_assertions: any;
        deviations: any;
        postmortems: any;
        replan_required: boolean;
        recovery_checks: any;
        last_fact_hash: any;
    }[];
};
export declare function runAgentQualityCenterSelfTest(): {
    pass: boolean;
    checks: {
        consultationWriteIsBlocked: boolean;
        groundedExplicitExecutionPasses: boolean;
        lowConfidenceGuessIsBlocked: boolean;
        shadowModeRecordsWithoutExecution: boolean;
        historyCannotAuthorize: boolean;
        clarificationDenialOverridesOriginalDirective: boolean;
    };
};
