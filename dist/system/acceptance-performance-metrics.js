"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAcceptanceStrategyPerformanceMetrics = buildAcceptanceStrategyPerformanceMetrics;
function buildAcceptanceStrategyPerformanceMetrics(tasks) {
    const createBucket = (scope, scopeId) => ({
        schema: "ccm-acceptance-strategy-metrics-v1",
        scope,
        scopeId,
        taskCount: 0,
        frozenLevels: { lightweight: 0, standard: 0, strict: 0 },
        actualLevels: { lightweight: 0, standard: 0, strict: 0 },
        standardEscalated: 0,
        standardTaskCount: 0,
        mainAgentSelfVerification: { runs: 0, passed: 0 },
        independentTestAgent: { runs: 0, passed: 0 },
        reworkRounds: 0,
        reviewRounds: 0,
        durationMsByLevel: { lightweight: 0, standard: 0, strict: 0 },
        tokensByLevel: { lightweight: 0, standard: 0, strict: 0 },
        terminalGateBlocks: 0,
        contentStored: false,
    });
    const scopes = { "global:global": createBucket("global", "global") };
    const add = (bucket, task, snapshot) => {
        const frozen = ["lightweight", "standard", "strict"].includes(snapshot.level) ? snapshot.level : "standard";
        const actual = ["lightweight", "standard", "strict"].includes(task.acceptance_actual_level)
            ? task.acceptance_actual_level
            : task.acceptance_escalation ? "strict" : frozen;
        bucket.taskCount += 1;
        bucket.frozenLevels[frozen] += 1;
        bucket.actualLevels[actual] += 1;
        if (frozen === "standard")
            bucket.standardTaskCount += 1;
        if (frozen === "standard" && (task.acceptance_escalation || task.acceptance_actual_route === "independent_test_agent"))
            bucket.standardEscalated += 1;
        const self = task.main_agent_self_verification || task.mainAgentSelfVerification;
        if (self) {
            bucket.mainAgentSelfVerification.runs += 1;
            if (self.canAccept === true || self.passed === true)
                bucket.mainAgentSelfVerification.passed += 1;
        }
        const independent = task.test_agent_review || task.testAgentReview || task.test_agent || task.testAgent;
        if (independent) {
            bucket.independentTestAgent.runs += 1;
            if (independent.canAccept === true || independent.passed === true)
                bucket.independentTestAgent.passed += 1;
        }
        bucket.reworkRounds += Math.max(0, Number(task.rework_round_total || task.reworkRoundTotal || task.rework_round || task.reworkRound || 0));
        bucket.reviewRounds += Math.max(0, Number(task.review_round_total || task.reviewRoundTotal || task.review_round || task.reviewRound || 0));
        const started = Date.parse(String(task.started_at || task.startedAt || task.created_at || task.createdAt || ""));
        const ended = Date.parse(String(task.completed_at || task.completedAt || task.updated_at || task.updatedAt || ""));
        if (Number.isFinite(started) && Number.isFinite(ended) && ended >= started)
            bucket.durationMsByLevel[actual] += ended - started;
        const usage = task.usage_summary || task.usageSummary || task.provider_usage || task.providerUsage || {};
        bucket.tokensByLevel[actual] += Math.max(0, Number(usage.providerTotalTokens || usage.provider_total_tokens || usage.totalTokens || usage.total_tokens || 0));
        if (task.terminal_gate?.passed === false || task.terminalGate?.passed === false || task.terminal_decision?.accepted === false || task.terminalDecision?.accepted === false)
            bucket.terminalGateBlocks += 1;
    };
    for (const task of Array.isArray(tasks) ? tasks : []) {
        const snapshot = task?.acceptance_policy_snapshot || task?.acceptancePolicySnapshot;
        if (snapshot?.schema !== "ccm-task-acceptance-policy-snapshot-v3")
            continue;
        const scope = snapshot.scope === "project" ? "project" : "group";
        const scopeId = String(snapshot.scopeId || snapshot.scope_id || "").trim();
        if (!scopeId)
            continue;
        const key = `${scope}:${scopeId}`;
        const bucket = scopes[key] ||= createBucket(scope, scopeId);
        add(bucket, task, snapshot);
        add(scopes["global:global"], task, snapshot);
    }
    for (const bucket of Object.values(scopes)) {
        bucket.standardEscalationRate = bucket.standardTaskCount ? Number((bucket.standardEscalated / bucket.standardTaskCount).toFixed(4)) : 0;
        bucket.mainAgentSelfVerification.passRate = bucket.mainAgentSelfVerification.runs ? Number((bucket.mainAgentSelfVerification.passed / bucket.mainAgentSelfVerification.runs).toFixed(4)) : 0;
        bucket.independentTestAgent.passRate = bucket.independentTestAgent.runs ? Number((bucket.independentTestAgent.passed / bucket.independentTestAgent.runs).toFixed(4)) : 0;
        bucket.averageReworkRounds = bucket.taskCount ? Number((bucket.reworkRounds / bucket.taskCount).toFixed(2)) : 0;
        bucket.averageReviewRounds = bucket.taskCount ? Number((bucket.reviewRounds / bucket.taskCount).toFixed(2)) : 0;
    }
    return { schema: "ccm-acceptance-strategy-metrics-v1", scopes, contentStored: false };
}
//# sourceMappingURL=acceptance-performance-metrics.js.map