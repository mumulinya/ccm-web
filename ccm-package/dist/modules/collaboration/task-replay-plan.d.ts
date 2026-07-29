export interface TaskReplayPlanStep {
    id: string;
    title: string;
    detail: string;
    status: string;
    source: "model" | "user_followup" | "skeleton" | "live";
    added_at: string;
}
export interface TaskReplayPlanView {
    task_id: string;
    source: "plan_mode" | "coordination_plan" | "live_todo";
    title: string;
    status: "awaiting_confirmation" | "in_progress" | "completed";
    confirmed: boolean;
    confirmed_at: string;
    generated_at: string;
    revised_at: string;
    next_step: string;
    step_count: number;
    completed_count: number;
    progress_label: string;
    step_status_derived: boolean;
    strategy: string;
    steps: TaskReplayPlanStep[];
    impact_projects: string[];
    impact_areas: string[];
    acceptance: string[];
    revision_count: number;
    revisions: Array<{
        count: number;
        feedback: string;
        kind: string;
        at: string;
    }>;
}
export interface TaskReplayWorkItemRow {
    id: string;
    task_id: string;
    subject: string;
    description: string;
    target: string;
    owner: string;
    agent_type: string;
    status: string;
    attempt: number;
    source: string;
    blocked_by: string[];
    files_changed: string[];
    files_changed_count: number;
    verification: string[];
    evidence: string[];
    blockers: string[];
    needs: string[];
    receipt_status: string;
    receipt_summary: string;
    created_at: string;
    updated_at: string;
    completed_at: string;
}
export declare function buildTaskReplayPlanView(task: any, options?: {
    fallbackTodo?: any;
}): TaskReplayPlanView | null;
export declare function buildTaskReplayWorkItemRows(task: any, executions?: any[]): TaskReplayWorkItemRow[];
export declare function runTaskReplayPlanSelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        plan_mode_view_built: boolean;
        plan_followup_step_marked: boolean;
        plan_revision_recorded: boolean;
        plan_scope_and_acceptance_kept: boolean;
        long_plan_is_not_truncated: boolean;
        live_todo_fallback: boolean;
        empty_task_has_no_plan: boolean;
        work_item_receipt_applied: boolean;
        work_item_paths_redacted: boolean;
        work_item_timestamps_stable: boolean;
        derived_work_item_timestamps_stable: boolean;
        fallback_todo_reachable: boolean;
        coordination_plan_view_built: boolean;
        coordination_plan_splits_phase_text: boolean;
        coordination_plan_keeps_targets_and_history: boolean;
        plan_mode_still_wins_over_coordination: boolean;
    };
};
