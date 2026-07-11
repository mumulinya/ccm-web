import type { TestAgentReport } from "../test-agent/types";
export type MainAgentPostReviewSpotCheckStatus = "not_required" | "passed" | "needs_recheck" | "needs_user";
export interface MainAgentPostReviewSpotCheckItem {
    project: string;
    command: string;
    cwd: string;
    review_status: string;
    review_exit_code: number | null;
    review_output_hash: string;
    review_output_preview: string;
    command_block_complete: boolean;
    safe_to_run: boolean;
    observed_status: "passed" | "failed" | "blocked";
    observed_exit_code: number | null;
    observed_output_hash: string;
    observed_output_preview: string;
    observed_output_file: string;
    output_consistency: "exact" | "silent" | "outcome_matched" | "divergent" | "not_run";
    matches_review: boolean;
    error: string;
    started_at: string;
    finished_at: string;
    duration_ms: number;
}
export interface MainAgentPostReviewSpotCheck {
    schema: "ccm-main-agent-post-review-spot-check-v1";
    required: boolean;
    pass: boolean;
    status: MainAgentPostReviewSpotCheckStatus;
    report_id: string;
    work_order_id: string;
    candidate_count: number;
    selected_count: number;
    executed_count: number;
    passed_count: number;
    mismatch_count: number;
    incomplete_command_block_count: number;
    unavailable_command_count: number;
    checks: MainAgentPostReviewSpotCheckItem[];
    issues: string[];
    headline: string;
    next_action: string;
    generated_at: string;
    display_policy: {
        user_text_first: true;
        technical_default_collapsed: true;
        hide_internal_protocols: true;
        show_for_ordinary_conversation: false;
    };
}
export interface MainAgentPostReviewSpotCheckSummary {
    schema: "ccm-main-agent-post-review-spot-check-summary-v1";
    title: string;
    status: "passed" | "needs_recheck" | "needs_user" | "recorded";
    status_label: string;
    headline: string;
    rows: string[];
    next_action: string;
    display_policy: MainAgentPostReviewSpotCheck["display_policy"];
}
export declare function runMainAgentPostReviewSpotCheck(input: {
    report: TestAgentReport;
    taskId?: string;
    projectRoot?: string;
    required?: boolean;
    maxCommands?: number;
    timeoutMs?: number;
}): Promise<MainAgentPostReviewSpotCheck>;
export declare function buildPostReviewSpotCheckSummary(value: any): MainAgentPostReviewSpotCheckSummary | null;
export declare function buildPostReviewSpotCheckGate(input: {
    required?: boolean;
    receipts?: any[];
}): {
    schema: string;
    required: boolean;
    pass: boolean;
    status: string;
    reason: any;
    check_count: number;
    latest: any;
    summary: MainAgentPostReviewSpotCheckSummary;
};
export declare function runPostReviewSpotCheckContractSelfTest(): {
    pass: boolean;
    passed: {
        schema: string;
        required: boolean;
        pass: boolean;
        status: string;
        reason: any;
        check_count: number;
        latest: any;
        summary: MainAgentPostReviewSpotCheckSummary;
    };
    missing: {
        schema: string;
        required: boolean;
        pass: boolean;
        status: string;
        reason: any;
        check_count: number;
        latest: any;
        summary: MainAgentPostReviewSpotCheckSummary;
    };
    mismatch: {
        schema: string;
        required: boolean;
        pass: boolean;
        status: string;
        reason: any;
        check_count: number;
        latest: any;
        summary: MainAgentPostReviewSpotCheckSummary;
    };
};
