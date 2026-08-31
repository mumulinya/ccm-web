"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_LOOP_BUDGET_SCHEMA = void 0;
exports.resolveAgentLoopBudget = resolveAgentLoopBudget;
exports.shouldContinueAgentLoop = shouldContinueAgentLoop;
exports.runAgentLoopBudgetSelfTest = runAgentLoopBudgetSelfTest;
exports.AGENT_LOOP_BUDGET_SCHEMA = "ccm-agent-loop-budget-v1";
const readonly_tool_concurrency_1 = require("./readonly-tool-concurrency");
function configuredNumber(input, camelKey, snakeKey, fallback) {
    const raw = input?.[camelKey] ?? input?.[snakeKey];
    const value = raw === undefined || raw === null || raw === "" ? fallback : Number(raw);
    return Number.isFinite(value) ? value : fallback;
}
function resolveAgentLoopBudget(input = {}) {
    const contextWindow = Math.max(8_000, configuredNumber(input, "contextWindow", "context_window", 200_000));
    const remainingSafeTokens = Math.max(1_000, configuredNumber(input, "remainingSafeTokens", "remaining_safe_tokens", Math.floor(contextWindow * 0.65)));
    const configuredToolBudget = Math.max(1, configuredNumber(input, "toolCallBudget", "tool_call_budget", 6));
    const configuredTurns = Math.max(1, configuredNumber(input, "maxModelTurns", "max_model_turns", 8));
    const timeBudgetMs = Math.max(5_000, configuredNumber(input, "timeBudgetMs", "time_budget_ms", 120_000));
    const riskBudget = Math.max(0, Math.min(100, configuredNumber(input, "riskBudget", "risk_budget", 100)));
    const adaptive = input.enabled !== false
        && (input.adaptive ?? input.adaptiveAgentLoopEnabled ?? input.adaptive_agent_loop_enabled) !== false;
    const scale = contextWindow >= 500_000 ? 1.5 : contextWindow >= 200_000 ? 1.25 : contextWindow >= 64_000 ? 1 : 0.75;
    const maxToolRounds = adaptive
        ? Math.max(1, Math.min(6, Math.floor(Math.min(configuredToolBudget / 2, (configuredTurns - 1) / 2) * scale)))
        : Math.max(1, Math.min(6, Math.floor(Math.min(configuredToolBudget / 2, (configuredTurns - 1) / 2) * scale) || 2));
    return {
        schema: exports.AGENT_LOOP_BUDGET_SCHEMA,
        mode: adaptive ? "adaptive" : "bounded",
        contextWindow,
        remainingSafeTokens,
        toolCallBudget: Math.min(64, Math.floor(configuredToolBudget)),
        timeBudgetMs,
        riskBudget,
        maxModelTurns: Math.min(32, Math.floor(configuredTurns)),
        maxToolRounds,
        toolBatchSize: Math.max(1, Math.min(readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_MAX, Math.floor(configuredNumber(input, "toolBatchSize", "tool_batch_size", readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT)))),
        readOnlyParallelism: (0, readonly_tool_concurrency_1.clampReadonlyToolConcurrency)(configuredNumber(input, "readOnlyParallelism", "read_only_parallelism", readonly_tool_concurrency_1.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT)),
        noProgressThreshold: Math.max(2, Math.min(10, Math.floor(configuredNumber(input, "noProgressThreshold", "no_progress_threshold", 3)))),
    };
}
function shouldContinueAgentLoop(input) {
    if (input.cancelled)
        return { continue: false, reason: "cancelled", resetSegment: false };
    if (input.authorizationBlocked)
        return { continue: false, reason: "authorization_blocked", resetSegment: false };
    if (input.contextSafe === false)
        return { continue: false, reason: "context_safety_gate", resetSegment: false };
    if (input.repeatedFailure)
        return { continue: false, reason: "repeated_failure", resetSegment: false };
    if (Number(input.noProgressCount || 0) >= input.budget.noProgressThreshold)
        return { continue: false, reason: "no_progress", resetSegment: false };
    if (input.waitingDependency || input.dependenciesReady === false)
        return { continue: false, reason: "waiting_dependency", resetSegment: false };
    if (input.unresolvedCriteria === 0)
        return { continue: false, reason: "acceptance_satisfied", resetSegment: false };
    const segmentExhausted = input.modelTurns >= input.budget.maxModelTurns
        || input.toolCalls >= input.budget.toolCallBudget
        || Number(input.elapsedMs || 0) >= input.budget.timeBudgetMs;
    if (input.budget.mode === "adaptive") {
        return segmentExhausted
            ? { continue: true, reason: "segment_rollover", resetSegment: true }
            : { continue: true, reason: "progress_available", resetSegment: false };
    }
    if (input.round >= input.budget.maxToolRounds)
        return { continue: false, reason: "tool_round_budget", resetSegment: false };
    if (input.modelTurns >= input.budget.maxModelTurns)
        return { continue: false, reason: "model_turn_budget", resetSegment: false };
    if (input.toolCalls >= input.budget.toolCallBudget)
        return { continue: false, reason: "tool_call_budget", resetSegment: false };
    if (Number(input.elapsedMs || 0) >= input.budget.timeBudgetMs)
        return { continue: false, reason: "time_budget", resetSegment: false };
    return { continue: true, reason: "budget_available", resetSegment: false };
}
function runAgentLoopBudgetSelfTest() {
    const adaptive = resolveAgentLoopBudget({ contextWindow: 516_000, toolCallBudget: 8, maxModelTurns: 10 });
    const adaptiveDecision = shouldContinueAgentLoop({
        budget: adaptive,
        round: adaptive.maxToolRounds + 5,
        modelTurns: adaptive.maxModelTurns,
        toolCalls: adaptive.toolCallBudget,
        unresolvedCriteria: 1,
    });
    const bounded = resolveAgentLoopBudget({ adaptive: false, contextWindow: 200_000, toolCallBudget: 6, maxModelTurns: 8 });
    const boundedDecision = shouldContinueAgentLoop({ budget: bounded, round: bounded.maxToolRounds, modelTurns: 2, toolCalls: 2, unresolvedCriteria: 1 });
    const noProgressDecision = shouldContinueAgentLoop({ budget: adaptive, round: 20, modelTurns: 20, toolCalls: 20, unresolvedCriteria: 1, noProgressCount: adaptive.noProgressThreshold });
    return {
        pass: adaptiveDecision.continue === true
            && adaptiveDecision.reason === "segment_rollover"
            && boundedDecision.continue === false
            && noProgressDecision.continue === false,
        adaptive,
        adaptiveDecision,
        bounded,
        boundedDecision,
        noProgressDecision,
    };
}
//# sourceMappingURL=agent-loop-budget.js.map