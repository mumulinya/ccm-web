export declare const TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA = "ccm-task-agent-memory-transport-usage-cohort-report-v1";
export declare const TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES = 3;
export declare function buildTaskAgentMemoryTransportUsageCohortReport(rows?: any[], options?: any): {
    report_checksum: string;
    schema: string;
    version: number;
    generated_at: string;
    scope: {
        group_id: string;
        group_session_id: string;
        exact_group_session: boolean;
    };
    measurement_scope: string;
    savings_claim_policy: string;
    minimum_samples_per_mode: number;
    status: string;
    summary: {
        input_row_count: number;
        eligible_row_count: number;
        rejected_row_count: number;
        cohort_count: number;
        comparable_cohort_count: number;
        drifted_cohort_count: number;
        insufficient_sample_cohort_count: number;
        savings_claim_count: number;
        unreported_row_count: number;
        invalid_receipt_row_count: number;
    };
    cohorts: {
        cohort_checksum: string;
        cohort_key: string;
        status: string;
        dimensions: any;
        minimum_samples_per_mode: number;
        eligible_sample_count: number;
        dimension_drift_observed: boolean;
        modes: any;
        savings_claims: {
            cohort_key: string;
            baseline_mode: string;
            comparison_mode: string;
            measurement_scope: string;
            causality: string;
            input_token_median_reduction: number;
            input_token_median_reduction_ratio: number;
            estimated_memory_transport_token_median_reduction: number;
            estimated_memory_transport_token_median_reduction_ratio: number;
        }[];
        usage_checksums: any[];
    }[];
    rejected_rows: any[];
};
export declare function verifyTaskAgentMemoryTransportUsageCohortReport(report: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
