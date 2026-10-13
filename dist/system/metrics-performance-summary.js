"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMetricsPerformanceSummary = readMetricsPerformanceSummary;
exports.startMetricsPerformanceSummary = startMetricsPerformanceSummary;
exports.stopMetricsPerformanceSummary = stopMetricsPerformanceSummary;
const observability_database_1 = require("./observability-database");
const metrics_v3_1 = require("./metrics-v3");
const task_store_1 = require("../core/task-store");
const acceptance_performance_metrics_1 = require("./acceptance-performance-metrics");
const performance_monitor_1 = require("./performance-monitor");
let cached = null;
let timer = null;
const fields = ['acceptance_policy_snapshot', 'acceptancePolicySnapshot', 'acceptance_actual_level', 'acceptance_escalation', 'acceptance_actual_route',
    'main_agent_self_verification', 'mainAgentSelfVerification', 'test_agent_review', 'testAgentReview', 'test_agent', 'testAgent',
    'rework_round_total', 'reworkRoundTotal', 'rework_round', 'reworkRound', 'review_round_total', 'reviewRoundTotal', 'review_round', 'reviewRound',
    'started_at', 'startedAt', 'created_at', 'createdAt', 'completed_at', 'completedAt', 'updated_at', 'updatedAt',
    'usage_summary', 'usageSummary', 'provider_usage', 'providerUsage', 'terminal_gate', 'terminalGate', 'terminal_decision', 'terminalDecision'];
// This cache holds internal, read-only aggregates. Authorization/catalog
// filtering is performed afresh by the existing route for every request.
// Local writes and writes from other connections both invalidate the snapshot.
function readMetricsPerformanceSummary() {
    const obs = (0, observability_database_1.getObservabilityDatabase)();
    return (0, task_store_1.withSqliteTaskStore)(db => {
        const revision = (connection) => `${connection.pragma('data_version', { simple: true })}:${connection.prepare('SELECT total_changes() value').get().value}`;
        const version = `${revision(db)}:${revision(obs)}`;
        if (cached && cached.version === version && Date.now() - cached.at < 5000)
            return cached.value;
        const value = (0, performance_monitor_1.measurePerformance)('db.metrics.summary', () => {
            const rows = db.prepare(`SELECT json_extract(payload_json,${fields.map(field => `'$.${field}'`).join(',')}) fields
        FROM tasks WHERE json_extract(payload_json,'$.acceptance_policy_snapshot') IS NOT NULL
          OR json_extract(payload_json,'$.acceptancePolicySnapshot') IS NOT NULL`).all();
            const tasks = rows.map(row => Object.fromEntries(JSON.parse(row.fields).map((value, index) => [fields[index], value])));
            return { metrics: (0, metrics_v3_1.loadMetricsDashboardV3)(), acceptanceStrategy: (0, acceptance_performance_metrics_1.buildAcceptanceStrategyPerformanceMetrics)(tasks) };
        });
        cached = { version, at: Date.now(), value };
        return value;
    });
}
function startMetricsPerformanceSummary() {
    if (timer)
        return;
    const tick = () => { try {
        (0, metrics_v3_1.pruneMetricEventsV3)();
        readMetricsPerformanceSummary();
    }
    catch (error) {
        console.warn(`[性能摘要] ${error.code || 'sampling_failed'}`);
    } };
    timer = setInterval(tick, 5000);
    timer.unref();
}
function stopMetricsPerformanceSummary() { if (timer)
    clearInterval(timer); timer = null; cached = null; }
//# sourceMappingURL=metrics-performance-summary.js.map