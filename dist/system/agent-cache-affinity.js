"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS = exports.CCM_AGENT_CACHE_STAGE_METRICS_SCHEMA = exports.CCM_AGENT_CACHE_AFFINITY_SCHEMA = void 0;
exports.createAgentCacheAffinity = createAgentCacheAffinity;
exports.mainAgentCacheAffinity = mainAgentCacheAffinity;
exports.testAgentCacheAffinity = testAgentCacheAffinity;
exports.planReviewerCacheAffinity = planReviewerCacheAffinity;
exports.semanticCacheAffinity = semanticCacheAffinity;
exports.externalProjectWorkerCacheAffinity = externalProjectWorkerCacheAffinity;
exports.inferAgentCacheAffinity = inferAgentCacheAffinity;
exports.agentCacheStageMetricsFromUsage = agentCacheStageMetricsFromUsage;
exports.createModelCallStage = createModelCallStage;
exports.emptyAgentModelCallAccounting = emptyAgentModelCallAccounting;
exports.recordAgentModelCallAccounting = recordAgentModelCallAccounting;
exports.runAgentCacheAffinitySelfTest = runAgentCacheAffinitySelfTest;
exports.CCM_AGENT_CACHE_AFFINITY_SCHEMA = "ccm-agent-cache-affinity-v1";
exports.CCM_AGENT_CACHE_STAGE_METRICS_SCHEMA = "ccm-agent-cache-stage-metrics-v1";
exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS = Object.freeze({
    project_main: "ccm-project-main-stable-core-v2",
    group_main: "ccm-group-main-stable-core-v2",
    global_main: "ccm-global-main-stable-core-v2",
    project_worker: "ccm-external-project-worker-native-session-v1",
    test_agent_plan: "ccm-test-agent-plan-stable-core-v2",
    test_agent_followup: "ccm-test-agent-followup-stable-core-v1",
    plan_review: "ccm-plan-review-stable-core-v2",
    plan_candidate: "ccm-plan-candidate-stable-core-v1",
    coordination_review: "ccm-coordination-review-stable-core-v2",
    semantic_decision: "ccm-semantic-decision-stable-core-v1",
});
function clean(value, max = 240) {
    return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}
function normalizedScope(value) {
    const scope = clean(value).toLowerCase();
    if (scope === "global" || scope === "group")
        return scope;
    return "project";
}
function mainRole(scope) {
    if (scope === "global")
        return "global_main";
    if (scope === "group")
        return "group_main";
    return "project_main";
}
function createAgentCacheAffinity(input) {
    const scope = normalizedScope(input.scope);
    const scopeId = scope === "global" ? "global" : clean(input.scopeId);
    if (!scopeId)
        throw new Error("CCM_AGENT_CACHE_AFFINITY_SCOPE_ID_REQUIRED");
    const agentRole = clean(input.agentRole);
    const stage = clean(input.stage);
    const cacheKeyProfile = clean(input.cacheKeyProfile);
    const stablePromptVersion = clean(input.stablePromptVersion);
    if (!agentRole || !stage || !cacheKeyProfile || !stablePromptVersion) {
        throw new Error("CCM_AGENT_CACHE_AFFINITY_PROFILE_INCOMPLETE");
    }
    return {
        schema: exports.CCM_AGENT_CACHE_AFFINITY_SCHEMA,
        scope,
        scopeId,
        ...(clean(input.projectId) ? { projectId: clean(input.projectId) } : {}),
        agentRole,
        stage,
        runtimeOwnership: input.runtimeOwnership === "external_agent_runtime" ? "external_agent_runtime" : "ccm_provider",
        stablePromptVersion,
        cacheKeyProfile,
        ...(clean(input.exactSessionId) ? { exactSessionId: clean(input.exactSessionId) } : {}),
        ...(clean(input.taskId) ? { taskId: clean(input.taskId) } : {}),
        ...(Number.isFinite(Number(input.generation)) ? { generation: Math.max(0, Number(input.generation)) } : {}),
        ...(Number.isFinite(Number(input.attempt)) ? { attempt: Math.max(0, Number(input.attempt)) } : {}),
        contentStored: false,
    };
}
function mainAgentCacheAffinity(input) {
    const scope = normalizedScope(input.scope);
    const role = mainRole(scope);
    return createAgentCacheAffinity({
        scope,
        scopeId: input.scopeId,
        ...(scope === "project" ? { projectId: input.scopeId } : {}),
        agentRole: role,
        // The main loop owns both tool turns and the final no-tool response. Keep
        // one stage so the final answer does not open a second cache domain.
        stage: "main_tool_loop",
        runtimeOwnership: "ccm_provider",
        stablePromptVersion: exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS[role],
        cacheKeyProfile: `${role}:main_tool_loop`,
        exactSessionId: input.exactSessionId,
        generation: input.generation,
        attempt: input.attempt,
    });
}
function testAgentCacheAffinity(input) {
    const promptVersion = input.stage === "test_followup"
        ? exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS.test_agent_followup
        : exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS.test_agent_plan;
    return createAgentCacheAffinity({
        ...input,
        agentRole: "test_agent",
        runtimeOwnership: "ccm_provider",
        stablePromptVersion: promptVersion,
        cacheKeyProfile: `test_agent:${input.stage}`,
    });
}
function planReviewerCacheAffinity(input) {
    return createAgentCacheAffinity({
        ...input,
        agentRole: "plan_reviewer",
        stage: "plan_review",
        runtimeOwnership: "ccm_provider",
        stablePromptVersion: exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS.plan_review,
        cacheKeyProfile: "plan_reviewer:plan_review",
    });
}
function semanticCacheAffinity(input) {
    const decisionKind = clean(input.decisionKind, 100) || "unknown";
    return createAgentCacheAffinity({
        ...input,
        agentRole: "semantic_auxiliary",
        stage: "semantic_decision",
        runtimeOwnership: "ccm_provider",
        stablePromptVersion: `${exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS.semantic_decision}:${decisionKind}:v1`,
        cacheKeyProfile: `semantic_auxiliary:${decisionKind}`,
    });
}
function externalProjectWorkerCacheAffinity(input) {
    return createAgentCacheAffinity({
        scope: "project",
        scopeId: input.projectId,
        projectId: input.projectId,
        agentRole: "project_worker",
        stage: "tool_loop",
        runtimeOwnership: "external_agent_runtime",
        stablePromptVersion: exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS.project_worker,
        cacheKeyProfile: "project_worker:native_session",
        exactSessionId: input.exactSessionId,
        taskId: input.taskId,
        generation: input.generation,
        attempt: input.attempt,
    });
}
function inferAgentCacheAffinity(input) {
    const source = clean(input.source).toLowerCase();
    const rawScope = clean(input.scope).toLowerCase();
    if (!["project", "group", "global"].includes(rawScope))
        return null;
    const scope = normalizedScope(rawScope);
    if (/plan_review/.test(source))
        return planReviewerCacheAffinity({ scope, scopeId: String(input.scopeId || ""), exactSessionId: String(input.sessionId || ""), generation: input.generation });
    if (/group_main_(?:review|summary)/.test(source))
        return createAgentCacheAffinity({
            scope: "group", scopeId: String(input.scopeId || ""), agentRole: "group_main", stage: "coordination_review",
            runtimeOwnership: "ccm_provider", stablePromptVersion: exports.AGENT_CACHE_STABLE_PROMPT_VERSIONS.coordination_review,
            cacheKeyProfile: `group_main:${source.includes("summary") ? "summary" : "review"}`, exactSessionId: String(input.sessionId || ""), generation: input.generation,
        });
    if (/semantic_/.test(source))
        return semanticCacheAffinity({ scope, scopeId: String(input.scopeId || ""), exactSessionId: String(input.sessionId || ""), generation: input.generation, decisionKind: source.replace(/^semantic_/, "") });
    if (/(?:main|native_query|conversation|planning)/.test(source))
        return mainAgentCacheAffinity({ scope, scopeId: String(input.scopeId || ""), exactSessionId: String(input.sessionId || ""), generation: input.generation });
    return null;
}
function finite(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function agentCacheStageMetricsFromUsage(affinity, usage = {}, options = {}) {
    const directInputTokens = finite(usage.directInputTokens ?? usage.direct_input_tokens ?? usage.inputTokens ?? usage.input_tokens);
    const cacheCreationInputTokens = finite(usage.cacheCreationInputTokens ?? usage.cache_creation_input_tokens);
    const cacheReadInputTokens = finite(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens);
    const eligible = options.eligible !== false;
    const total = directInputTokens + cacheCreationInputTokens + cacheReadInputTokens;
    return {
        schema: exports.CCM_AGENT_CACHE_STAGE_METRICS_SCHEMA,
        agentRole: affinity.agentRole,
        stage: affinity.stage,
        runtimeOwnership: affinity.runtimeOwnership,
        capabilityStatus: options.capabilityStatus || (usage.reported === false ? "unproven" : cacheReadInputTokens > 0 ? "confirmed" : "unproven"),
        eligibleRequestCount: eligible ? 1 : 0,
        hitRequestCount: eligible && cacheReadInputTokens > 0 ? 1 : 0,
        directInputTokens,
        cacheCreationInputTokens,
        cacheReadInputTokens,
        tokenReuseRate: total > 0 ? Math.min(1, cacheReadInputTokens / total) : 0,
        ...(!cacheReadInputTokens && options.missReason ? { lastMissReason: clean(options.missReason, 120) } : {}),
        contentStored: false,
    };
}
function createModelCallStage(input) {
    return {
        agentRole: input.affinity.agentRole,
        stage: input.affinity.stage,
        requestKind: input.requestKind || (input.affinity.stage === "conversation" || input.affinity.stage === "tool_loop" || input.affinity.stage === "main_tool_loop" ? "main_loop" : "auxiliary"),
        modelCallIndex: Math.max(1, Number(input.modelCallIndex || 1)),
        cacheKeyProfile: clean(input.affinity.cacheKeyProfile, 160),
        contentStored: false,
    };
}
function emptyAgentModelCallAccounting() {
    return { mainLoopModelCalls: 0, auxiliaryModelCalls: 0, toolLoopRounds: 0, toolCallCount: 0, auxiliaryStages: [], contentStored: false };
}
function recordAgentModelCallAccounting(accounting, stage, usage = {}, counters = {}) {
    const next = accounting || emptyAgentModelCallAccounting();
    if (stage.requestKind === "main_loop")
        next.mainLoopModelCalls += 1;
    else {
        next.auxiliaryModelCalls += 1;
        const direct = finite(usage.directInputTokens ?? usage.direct_input_tokens ?? usage.inputTokens ?? usage.input_tokens);
        const cached = finite(usage.cacheReadInputTokens ?? usage.cache_read_input_tokens);
        const row = next.auxiliaryStages.find(item => item.stage === stage.stage) || { stage: stage.stage, calls: 0, cacheReadInputTokens: 0, directInputTokens: 0 };
        row.calls += 1;
        row.cacheReadInputTokens += cached;
        row.directInputTokens += direct;
        if (!next.auxiliaryStages.includes(row))
            next.auxiliaryStages.push(row);
    }
    next.toolLoopRounds = Math.max(next.toolLoopRounds, Number(counters.toolLoopRounds || 0));
    next.toolCallCount = Math.max(next.toolCallCount, Number(counters.toolCallCount || 0));
    return next;
}
function runAgentCacheAffinitySelfTest() {
    const main = mainAgentCacheAffinity({ scope: "project", scopeId: "project-a", exactSessionId: "main-session" });
    const mainStage = createModelCallStage({ affinity: main, modelCallIndex: 2 });
    const accounting = recordAgentModelCallAccounting(emptyAgentModelCallAccounting(), mainStage, {}, { toolLoopRounds: 1, toolCallCount: 3 });
    const correction = createAgentCacheAffinity({ scope: "project", scopeId: "project-a", projectId: "project-a", agentRole: "semantic_auxiliary", stage: "source_correction", runtimeOwnership: "ccm_provider", stablePromptVersion: "source-correction-v1", cacheKeyProfile: "project:source_correction" });
    recordAgentModelCallAccounting(accounting, createModelCallStage({ affinity: correction, modelCallIndex: 1 }), { directInputTokens: 100, cacheReadInputTokens: 80 });
    const first = testAgentCacheAffinity({ scope: "project", scopeId: "project-a", projectId: "project-a", exactSessionId: "session-1", taskId: "task-1", stage: "test_plan" });
    const second = testAgentCacheAffinity({ scope: "project", scopeId: "project-a", projectId: "project-a", exactSessionId: "session-2", taskId: "task-2", stage: "test_plan" });
    const followup = testAgentCacheAffinity({ scope: "project", scopeId: "project-a", projectId: "project-a", exactSessionId: "session-2", taskId: "task-2", stage: "test_followup" });
    const worker = externalProjectWorkerCacheAffinity({ projectId: "project-a", exactSessionId: "native-session-1", taskId: "task-1" });
    const workerMetrics = agentCacheStageMetricsFromUsage(worker, { reported: true, directInputTokens: 500, cacheCreationInputTokens: 100, cacheReadInputTokens: 400 });
    const unreportedWorkerMetrics = agentCacheStageMetricsFromUsage(worker, { reported: false }, { missReason: "external_runtime_unreported" });
    return {
        pass: first.scopeId === second.scopeId
            && first.cacheKeyProfile === second.cacheKeyProfile
            && first.exactSessionId !== second.exactSessionId
            && first.cacheKeyProfile !== followup.cacheKeyProfile
            && workerMetrics.hitRequestCount === 1
            && workerMetrics.tokenReuseRate === 0.4
            && main.stage === "main_tool_loop"
            && mainStage.requestKind === "main_loop"
            && accounting.mainLoopModelCalls === 1
            && accounting.auxiliaryModelCalls === 1
            && accounting.auxiliaryStages[0]?.cacheReadInputTokens === 80
            && unreportedWorkerMetrics.lastMissReason === "external_runtime_unreported",
        checks: {
            sameProjectSharesAffinity: first.scopeId === second.scopeId && first.cacheKeyProfile === second.cacheKeyProfile,
            auditSessionsRemainDistinct: first.exactSessionId !== second.exactSessionId,
            stagesRemainIsolated: first.cacheKeyProfile !== followup.cacheKeyProfile,
            mainLoopAndFinalShareStage: main.stage === "main_tool_loop" && main.cacheKeyProfile === "project_main:main_tool_loop",
            modelCallsAreAccountedByStage: accounting.mainLoopModelCalls === 1 && accounting.auxiliaryModelCalls === 1 && accounting.toolLoopRounds === 1 && accounting.toolCallCount === 3,
            externalRuntimeUsesOnlyReportedCacheTokens: workerMetrics.hitRequestCount === 1 && workerMetrics.tokenReuseRate === 0.4,
            externalRuntimeNeverFabricatesMissingUsage: unreportedWorkerMetrics.hitRequestCount === 0 && unreportedWorkerMetrics.lastMissReason === "external_runtime_unreported",
        },
    };
}
//# sourceMappingURL=agent-cache-affinity.js.map