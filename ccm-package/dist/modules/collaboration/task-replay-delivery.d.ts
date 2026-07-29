export interface TaskReplayDeliveryView {
    task_id: string;
    status: string;
    headline: string;
    detail: string;
    business_goal: string;
    acceptance_criteria: string[];
    source_documents: string;
    followups: Array<{
        at: string;
        message: string;
        source: string;
    }>;
    final_report: string;
    user_report: string;
    review: {
        agent: string;
        status: string;
        content: string;
        gaps: string[];
        follow_ups: string[];
        conflicts: string[];
        confidence: number;
    } | null;
    agents: string[];
    actions: string[];
    rework_count: number;
    rework_rounds: Array<{
        project: string;
        summary: string;
    }>;
    verification: {
        executed: string[];
        required: string[];
        missing: string[];
        failed: string[];
    };
    blockers: string[];
    needs: string[];
    recovery: {
        watchdog_count: number;
        last_recovered_at: string;
        auto_gap_continue_count: number;
        continuation_count: number;
    };
}
export declare function buildTaskReplayDeliveryView(task: any): TaskReplayDeliveryView | null;
export declare function runTaskReplayDeliverySelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        delivery_view_built: boolean;
        duplicate_report_suppressed: boolean;
        acceptance_criteria_split: boolean;
        review_gaps_kept: boolean;
        followups_kept: boolean;
        rework_and_recovery_kept: boolean;
        verification_gap_kept: boolean;
        empty_task_has_no_delivery: boolean;
        delivery_text_redacted: boolean;
    };
};
