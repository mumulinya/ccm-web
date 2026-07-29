import { type ResolvedTestAgentArtifact } from "../../test-agent/artifact-retention";
import { type TaskReplayStatus } from "./task-replay-shared";
export type TaskReplayStage = "intake" | "planning" | "dispatch" | "execution" | "change" | "test" | "rework" | "review" | "completion" | "system";
export type { TaskReplayStatus } from "./task-replay-shared";
export interface TaskReplayEvent {
    id: string;
    at: string;
    stage: TaskReplayStage;
    category: string;
    status: TaskReplayStatus;
    audience: "user" | "technical";
    title: string;
    summary: string;
    actor: {
        type: "user" | "global_agent" | "group_agent" | "project_agent" | "test_agent" | "system";
        label: string;
    };
    task_id: string;
    parent_task_id: string;
    trace_id: string;
    project: string;
    source: string;
    evidence_ids: string[];
    technical?: Record<string, any>;
}
export interface TaskReplayEventPageOptions {
    eventOffset?: number;
    eventLimit?: number;
    eventTail?: boolean;
    afterEventAt?: string;
    afterEventId?: string;
    stage?: string;
    status?: string;
    actor?: string;
    task?: string;
    query?: string;
    preset?: string;
    includeSystemEvents?: boolean;
}
export interface TaskReplayIndexOptions {
    page?: number;
    limit?: number;
    query?: string;
    project?: string;
    groupId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}
export declare function paginateReplayEventsForView(allEvents: TaskReplayEvent[], options?: TaskReplayEventPageOptions): {
    events: TaskReplayEvent[];
    eventPage: {
        mode: string;
        offset: number;
        limit: number;
        returned: number;
        total: number;
        total_unfiltered: number;
        has_previous: boolean;
        has_more: boolean;
        previous_offset: number;
        next_offset: number;
        first_cursor: {
            at: string;
            id: string;
        };
        last_cursor: {
            at: string;
            id: string;
        };
    };
};
export declare function buildCompleteTaskReplay(taskId: string, options?: TaskReplayEventPageOptions): {
    schema: string;
    generated_at: string;
    selected_task_id: string;
    root_task_id: string;
    title: string;
    goal: string;
    status: string;
    acceptance_state: string;
    acceptance_decision: any;
    terminal_state_receipt: any;
    terminal_decision: any;
    terminal_gate: any;
    scheduler_state: any;
    completed: boolean;
    started_at: string;
    finished_at: string;
    tasks: {
        id: string;
        parent_task_id: string;
        root_task_id: string;
        title: string;
        goal: string;
        project: string;
        group_id: string;
        group_session_id: string;
        project_session_id: string;
        request_origin: string;
        queue_scope: string;
        queue_target_key: string;
        queue_position: number;
        queue_state: string;
        scheduler_state: any;
        workspace_lane: string;
        trace_id: string;
        status: string;
        acceptance_state: string;
        intake_identity_checksum: string;
        terminal_state_receipt: any;
        terminal_decision: any;
        terminal_gate: any;
        legacy_status_unverified: boolean;
        semantic_decision_receipt: any;
        route_decision: any;
        created_at: string;
        updated_at: string;
        is_root: boolean;
    }[];
    actors: {
        id: string;
        label: string;
        present: boolean;
    }[];
    summary: {
        event_count: number;
        issue_count: number;
        failed_count: number;
        task_count: number;
        evidence_count: number;
        test_run_count: number;
        plan_count: number;
        work_item_count: number;
        user_event_count: number;
        technical_event_count: number;
        delivery_count: number;
        model_call_count: number;
        provider_retry_count: number;
        input_token_count: number;
        output_token_count: number;
        token_count: number;
    };
    phases: {
        id: TaskReplayStage;
        status: "warning" | "info" | "failed" | "passed" | "running" | "blocked";
        event_count: number;
        started_at: string;
        finished_at: string;
    }[];
    plans: any[];
    work_items: any[];
    deliveries: import("./task-replay-delivery").TaskReplayDeliveryView[];
    events: TaskReplayEvent[];
    event_page: {
        mode: string;
        offset: number;
        limit: number;
        returned: number;
        total: number;
        total_unfiltered: number;
        has_previous: boolean;
        has_more: boolean;
        previous_offset: number;
        next_offset: number;
        first_cursor: {
            at: string;
            id: string;
        };
        last_cursor: {
            at: string;
            id: string;
        };
    };
    evidence: any[];
    retention: {
        task_record: {
            status: string;
            policy: string;
        };
        trace: {
            status: string;
            policy: string;
        };
        test_agent: {
            status: string;
            policy: string;
            earliest_expiry: string;
        };
    };
    replay_capabilities: {
        chronological: boolean;
        filters: string[];
        event_pagination: boolean;
        incremental_cursor: boolean;
        failure_navigation: boolean;
        evidence_preview: boolean;
        historical_line_diff: boolean;
        plan_visibility: boolean;
        work_item_visibility: boolean;
        delivery_visibility: boolean;
        duplicate_event_merging: boolean;
        raw_machine_paths_exposed: boolean;
    };
};
export declare function buildTaskReplayIndex(input?: number | TaskReplayIndexOptions): {
    schema: string;
    generated_at: string;
    total: number;
    total_all: number;
    page: number;
    page_size: number;
    page_count: number;
    has_previous: boolean;
    has_more: boolean;
    filters: {
        query: string;
        project: string;
        group_id: string;
        status: string;
        date_from: string;
        date_to: string;
    };
    facets: {
        projects: {
            value: string;
            label: string;
            count: number;
        }[];
        groups: {
            value: string;
            label: string;
            count: number;
        }[];
        statuses: {
            value: string;
            label: string;
            count: number;
        }[];
    };
    tasks: any[];
};
export declare function buildTaskReplayIndexFromRecords(tasks: any[], groups: any[], input?: number | TaskReplayIndexOptions): {
    schema: string;
    generated_at: string;
    total: number;
    total_all: number;
    page: number;
    page_size: number;
    page_count: number;
    has_previous: boolean;
    has_more: boolean;
    filters: {
        query: string;
        project: string;
        group_id: string;
        status: string;
        date_from: string;
        date_to: string;
    };
    facets: {
        projects: {
            value: string;
            label: string;
            count: number;
        }[];
        groups: {
            value: string;
            label: string;
            count: number;
        }[];
        statuses: {
            value: string;
            label: string;
            count: number;
        }[];
    };
    tasks: any[];
};
export declare function resolveTaskReplayArtifact(input: {
    taskId: string;
    runId: string;
    artifactId: string;
}): ResolvedTestAgentArtifact | null;
export declare function runTaskReplayContractSelfTest(): {
    schema: string;
    pass: boolean;
    checks: {
        secrets_redacted: boolean;
        paths_redacted: boolean;
        status_normalized: boolean;
        browser_stage: boolean;
        complete_journal: boolean;
        historical_line_diff_preserved: boolean;
        missing_historical_diff_explained: boolean;
        plan_and_work_items_visible: boolean;
        acceptance_gate_failures_detailed: boolean;
        readable_execution_event_visible: boolean;
        machine_trace_event_hidden: boolean;
        problem_event_always_visible: boolean;
        narrative_event_always_visible: boolean;
        execution_state_readable: boolean;
        delivery_anchors_visible: boolean;
        duplicate_events_merged: boolean;
        redundant_summary_dropped: boolean;
    };
    plan_checks: {
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
    delivery_checks: {
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
