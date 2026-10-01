export declare const CCM_AGENT_CACHE_AFFINITY_SCHEMA: "ccm-agent-cache-affinity-v1";
export declare const CCM_AGENT_CACHE_STAGE_METRICS_SCHEMA: "ccm-agent-cache-stage-metrics-v1";
export type CcmAgentCacheScope = "project" | "group" | "global";
export type CcmAgentCacheRole = "project_main" | "group_main" | "global_main" | "project_worker" | "test_agent" | "plan_reviewer" | "semantic_auxiliary";
export type CcmAgentCacheStage = "conversation" | "tool_loop" | "main_tool_loop" | "final_answer" | "source_correction" | "plan_candidate" | "test_plan" | "test_plan_repair" | "test_followup" | "plan_review" | "coordination_review" | "semantic_decision";
export type CcmAgentCacheAffinityV1 = {
    schema: typeof CCM_AGENT_CACHE_AFFINITY_SCHEMA;
    scope: CcmAgentCacheScope;
    scopeId: string;
    projectId?: string;
    agentRole: CcmAgentCacheRole;
    stage: CcmAgentCacheStage;
    runtimeOwnership: "ccm_provider" | "external_agent_runtime";
    stablePromptVersion: string;
    cacheKeyProfile: string;
    exactSessionId?: string;
    taskId?: string;
    generation?: number;
    attempt?: number;
    contentStored: false;
};
export type CcmAgentCacheStageMetricsV1 = {
    schema: typeof CCM_AGENT_CACHE_STAGE_METRICS_SCHEMA;
    agentRole: CcmAgentCacheRole;
    stage: CcmAgentCacheStage;
    runtimeOwnership: "ccm_provider" | "external_agent_runtime";
    capabilityStatus: "confirmed" | "unproven" | "unsupported" | "degraded" | "not_applicable";
    eligibleRequestCount: number;
    hitRequestCount: number;
    directInputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    tokenReuseRate: number;
    lastMissReason?: string;
    contentStored: false;
};
export type CcmModelCallStageV1 = {
    agentRole: CcmAgentCacheRole;
    stage: CcmAgentCacheStage;
    requestKind: "main_loop" | "auxiliary";
    modelCallIndex: number;
    cacheKeyProfile: string;
    contentStored: false;
};
export type CcmAgentModelCallAccountingV1 = {
    mainLoopModelCalls: number;
    auxiliaryModelCalls: number;
    toolLoopRounds: number;
    toolCallCount: number;
    auxiliaryStages: Array<{
        stage: CcmAgentCacheStage;
        calls: number;
        cacheReadInputTokens: number;
        directInputTokens: number;
    }>;
    contentStored: false;
};
export declare const AGENT_CACHE_STABLE_PROMPT_VERSIONS: Readonly<{
    project_main: "ccm-project-main-stable-core-v2";
    group_main: "ccm-group-main-stable-core-v2";
    global_main: "ccm-global-main-stable-core-v2";
    project_worker: "ccm-external-project-worker-native-session-v1";
    test_agent_plan: "ccm-test-agent-plan-stable-core-v2";
    test_agent_followup: "ccm-test-agent-followup-stable-core-v1";
    plan_review: "ccm-plan-review-stable-core-v2";
    plan_candidate: "ccm-plan-candidate-stable-core-v1";
    coordination_review: "ccm-coordination-review-stable-core-v2";
    semantic_decision: "ccm-semantic-decision-stable-core-v1";
}>;
export declare function createAgentCacheAffinity(input: Omit<CcmAgentCacheAffinityV1, "schema" | "contentStored">): CcmAgentCacheAffinityV1;
export declare function mainAgentCacheAffinity(input: {
    scope: CcmAgentCacheScope;
    scopeId: string;
    exactSessionId: string;
    generation?: number;
    attempt?: number;
}): CcmAgentCacheAffinityV1;
export declare function testAgentCacheAffinity(input: {
    scope: "project" | "group";
    scopeId: string;
    projectId?: string;
    exactSessionId: string;
    taskId?: string;
    generation?: number;
    attempt?: number;
    stage: "test_plan" | "test_plan_repair" | "test_followup";
}): CcmAgentCacheAffinityV1;
export declare function planReviewerCacheAffinity(input: {
    scope: CcmAgentCacheScope;
    scopeId: string;
    exactSessionId: string;
    taskId?: string;
    generation?: number;
    attempt?: number;
}): CcmAgentCacheAffinityV1;
export declare function semanticCacheAffinity(input: {
    scope: CcmAgentCacheScope;
    scopeId: string;
    exactSessionId: string;
    taskId?: string;
    generation?: number;
    decisionKind: string;
}): CcmAgentCacheAffinityV1;
export declare function externalProjectWorkerCacheAffinity(input: {
    projectId: string;
    exactSessionId?: string;
    taskId?: string;
    generation?: number;
    attempt?: number;
}): CcmAgentCacheAffinityV1;
export declare function inferAgentCacheAffinity(input: {
    scope?: string;
    scopeId?: string;
    sessionId?: string;
    source?: string;
    generation?: number;
}): CcmAgentCacheAffinityV1 | null;
export declare function agentCacheStageMetricsFromUsage(affinity: CcmAgentCacheAffinityV1, usage?: any, options?: {
    capabilityStatus?: CcmAgentCacheStageMetricsV1["capabilityStatus"];
    missReason?: string;
    eligible?: boolean;
}): CcmAgentCacheStageMetricsV1;
export declare function createModelCallStage(input: {
    affinity: CcmAgentCacheAffinityV1;
    modelCallIndex: number;
    requestKind?: "main_loop" | "auxiliary";
}): CcmModelCallStageV1;
export declare function emptyAgentModelCallAccounting(): CcmAgentModelCallAccountingV1;
export declare function recordAgentModelCallAccounting(accounting: CcmAgentModelCallAccountingV1, stage: CcmModelCallStageV1, usage?: any, counters?: {
    toolLoopRounds?: number;
    toolCallCount?: number;
}): CcmAgentModelCallAccountingV1;
export declare function runAgentCacheAffinitySelfTest(): {
    pass: boolean;
    checks: {
        sameProjectSharesAffinity: boolean;
        auditSessionsRemainDistinct: boolean;
        stagesRemainIsolated: boolean;
        mainLoopAndFinalShareStage: boolean;
        modelCallsAreAccountedByStage: boolean;
        externalRuntimeUsesOnlyReportedCacheTokens: boolean;
        externalRuntimeNeverFabricatesMissingUsage: boolean;
    };
};
