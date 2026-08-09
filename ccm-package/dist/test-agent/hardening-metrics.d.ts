export type TestAgentHardeningMetricName = "test_agent_planner_fallback_total" | "test_agent_isolation_blocked_total" | "test_agent_side_effect_blocked_total" | "test_agent_undeclared_change_total" | "test_agent_projection_rejected_total" | "test_agent_runtime_drift_total" | "test_agent_spot_check_failed_total" | "test_agent_readonly_capability_rejected_total";
/** Process-local counters consumed by the existing metrics/diagnostic projection. */
export declare function recordTestAgentHardeningMetric(name: TestAgentHardeningMetricName, increment?: number): void;
export declare function readTestAgentHardeningMetrics(): {
    schema: string;
    counters: {
        [k: string]: number;
    };
    contentStored: boolean;
};
export declare function resetTestAgentHardeningMetricsForTest(): void;
export declare function runTestAgentHardeningMetricsSelfTest(): {
    pass: boolean;
    snapshot: {
        schema: string;
        counters: {
            [k: string]: number;
        };
        contentStored: boolean;
    };
};
