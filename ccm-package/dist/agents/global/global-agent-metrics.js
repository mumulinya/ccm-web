"use strict";
/**
 * Record Global Agent run terminals into the shared performance metrics store.
 * Scope: global:global / role: global_agent. Skips duplicate executionId events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.accumulateGlobalAgentRunUsage = accumulateGlobalAgentRunUsage;
exports.recordGlobalAgentRunMetric = recordGlobalAgentRunMetric;
const db_1 = require("../../core/db");
const GLOBAL_AGENT_NAME = "global-agent";
function finiteToken(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
/** Accumulate provider usage onto a Global Agent run across multi-step model calls. */
function accumulateGlobalAgentRunUsage(run, delta) {
    if (!run || typeof run !== "object" || !delta || typeof delta !== "object")
        return run?.usage || null;
    const prev = run.usage && typeof run.usage === "object" ? run.usage : {};
    const inputTokens = finiteToken(prev.inputTokens ?? prev.input_tokens)
        + finiteToken(delta.inputTokens ?? delta.input_tokens ?? delta.prompt_tokens);
    const outputTokens = finiteToken(prev.outputTokens ?? prev.output_tokens)
        + finiteToken(delta.outputTokens ?? delta.output_tokens ?? delta.completion_tokens);
    const directInputTokens = finiteToken(prev.directInputTokens ?? prev.direct_input_tokens)
        + finiteToken(delta.directInputTokens ?? delta.direct_input_tokens);
    const cacheCreationInputTokens = finiteToken(prev.cacheCreationInputTokens ?? prev.cache_creation_input_tokens)
        + finiteToken(delta.cacheCreationInputTokens ?? delta.cache_creation_input_tokens);
    const cacheReadInputTokens = finiteToken(prev.cacheReadInputTokens ?? prev.cache_read_input_tokens)
        + finiteToken(delta.cacheReadInputTokens ?? delta.cache_read_input_tokens);
    const totalCostUsd = Number(prev.totalCostUsd ?? prev.total_cost_usd ?? 0)
        + Number(delta.totalCostUsd ?? delta.total_cost_usd ?? 0);
    if (!(inputTokens > 0 || outputTokens > 0 || totalCostUsd > 0))
        return run.usage || null;
    run.usage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        reported: true,
        directInputTokens,
        cacheCreationInputTokens,
        cacheReadInputTokens,
        totalCostUsd: Number.isFinite(totalCostUsd) && totalCostUsd > 0 ? totalCostUsd : 0,
    };
    run.input_tokens = inputTokens;
    run.output_tokens = outputTokens;
    if (run.usage.totalCostUsd > 0)
        run.total_cost_usd = run.usage.totalCostUsd;
    return run.usage;
}
function finiteDurationMs(run) {
    const end = Date.parse(String(run?.completed_at || ""));
    const start = Date.parse(String(run?.started_at || run?.created_at || run?.completed_at || ""));
    if (!Number.isFinite(end) || !Number.isFinite(start) || end < start)
        return 0;
    return Math.max(0, end - start);
}
function alreadyRecorded(executionId) {
    if (!executionId)
        return false;
    try {
        const metrics = (0, db_1.loadMetrics)();
        return (Array.isArray(metrics?.events) ? metrics.events : []).some((event) => String(event?.executionId || "") === executionId
            && String(event?.scopeType || "") === "global"
            && String(event?.agent || "") === GLOBAL_AGENT_NAME);
    }
    catch {
        return false;
    }
}
function collectUsage(run) {
    const usage = run?.usage && typeof run.usage === "object" ? run.usage : null;
    const inputTokens = Number(run?.input_tokens ?? run?.inputTokens ?? usage?.input_tokens ?? usage?.inputTokens ?? 0);
    const outputTokens = Number(run?.output_tokens ?? run?.outputTokens ?? usage?.output_tokens ?? usage?.outputTokens ?? 0);
    const totalCostUsd = Number(run?.total_cost_usd ?? run?.totalCostUsd ?? usage?.total_cost_usd ?? usage?.totalCostUsd ?? 0);
    if (!(inputTokens > 0 || outputTokens > 0 || totalCostUsd > 0))
        return null;
    return {
        inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
        outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
        totalCostUsd: Number.isFinite(totalCostUsd) ? totalCostUsd : 0,
    };
}
/**
 * Record a terminal Global Agent run (completed / failed / cancelled).
 * Does not record supervising / waiting states.
 */
function recordGlobalAgentRunMetric(run, status, options = {}) {
    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (!["completed", "failed", "cancelled"].includes(normalizedStatus))
        return false;
    if (run?.metrics_recorded === true)
        return false;
    const executionId = String(run?.id || "").trim();
    if (!executionId || alreadyRecorded(executionId)) {
        if (run && typeof run === "object")
            run.metrics_recorded = true;
        return false;
    }
    const usage = collectUsage(run);
    const success = normalizedStatus === "completed";
    const recorded = (0, db_1.recordMetric)(GLOBAL_AGENT_NAME, {
        scopeType: "global",
        scopeId: "global",
        role: "global_agent",
        source: String(options.source || run?.source || "global-agent-loop"),
        runtime: String(options.runtime || "global-agent-loop"),
        success,
        status: normalizedStatus,
        durationMs: finiteDurationMs(run),
        traceId: String(run?.trace_id || run?.traceId || ""),
        taskId: String(run?.mission_id || run?.missionId || run?.id || ""),
        executionId,
        error: success ? "" : String(run?.error || normalizedStatus || "").slice(0, 300),
        ...(usage ? { usage, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, totalCostUsd: usage.totalCostUsd } : {}),
    });
    if (recorded && run && typeof run === "object") {
        run.metrics_recorded = true;
    }
    return recorded === true;
}
//# sourceMappingURL=global-agent-metrics.js.map