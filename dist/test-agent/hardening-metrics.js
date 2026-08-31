"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTestAgentHardeningMetric = recordTestAgentHardeningMetric;
exports.readTestAgentHardeningMetrics = readTestAgentHardeningMetrics;
exports.resetTestAgentHardeningMetricsForTest = resetTestAgentHardeningMetricsForTest;
exports.runTestAgentHardeningMetricsSelfTest = runTestAgentHardeningMetricsSelfTest;
const counters = new Map();
/** Process-local counters consumed by the existing metrics/diagnostic projection. */
function recordTestAgentHardeningMetric(name, increment = 1) {
    const amount = Math.max(1, Math.floor(Number(increment) || 1));
    counters.set(name, Number(counters.get(name) || 0) + amount);
}
function readTestAgentHardeningMetrics() {
    return {
        schema: "ccm-test-agent-hardening-metrics-v1",
        counters: Object.fromEntries([...counters.entries()].sort(([left], [right]) => left.localeCompare(right))),
        contentStored: false,
    };
}
function resetTestAgentHardeningMetricsForTest() {
    counters.clear();
}
function runTestAgentHardeningMetricsSelfTest() {
    resetTestAgentHardeningMetricsForTest();
    const names = [
        "test_agent_planner_fallback_total",
        "test_agent_isolation_blocked_total",
        "test_agent_side_effect_blocked_total",
        "test_agent_undeclared_change_total",
        "test_agent_projection_rejected_total",
        "test_agent_runtime_drift_total",
        "test_agent_spot_check_failed_total",
        "test_agent_readonly_capability_rejected_total",
    ];
    names.forEach(name => recordTestAgentHardeningMetric(name));
    const snapshot = readTestAgentHardeningMetrics();
    return {
        pass: snapshot.contentStored === false && names.every(name => snapshot.counters[name] === 1),
        snapshot,
    };
}
//# sourceMappingURL=hardening-metrics.js.map