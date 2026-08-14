import { type ResolvedTestAgentArtifact } from "../../test-agent/artifact-retention";
import { type TaskReplayStatus } from "./task-replay-shared";
import type { ToolDisplayDetailV1 } from "../../system/tool-display-projection";
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
    tool_display?: ToolDisplayDetailV1;
    replay_link?: {
        schema: "ccm-task-event-link-v1";
        taskId: string;
        replayEventId?: string;
        scope: "global" | "project" | "group";
        scopeId: string;
        exactSessionId: string;
        anchorMessageId: string;
        generation: number;
        attempt: number;
        planStepId?: string;
        workItemId?: string;
        batchId?: string;
        evidenceIds?: string[];
        contentStored: false;
    };
    causal_refs?: {
        planStepId?: string;
        workItemId?: string;
        dependencyIds?: string[];
        criterionIds?: string[];
        evidenceIds?: string[];
    };
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
    includeDetails?: boolean;
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
export declare function buildCompleteTaskReplay(taskId: string, options?: TaskReplayEventPageOptions): any;
export declare function buildTaskReplayFreshness(taskId: string): {
    schema: string;
    taskId: string;
    checkedAt: string;
    projects: any[];
    evidence: {
        evidenceId: string;
        type: import("../../system/unified-evidence-registry").EvidenceType;
        freshness: string;
        expiresAt: string;
        sourceChecksum: string;
    }[];
    contentStored: boolean;
};
export declare function buildTaskReplayUserReport(taskId: string): {
    schema: string;
    generatedAt: string;
    taskId: any;
    title: any;
    goal: any;
    status: any;
    result: any;
    integrity: any;
    requirementsAndDelivery: any;
    plan: any;
    attempts: any;
    acceptance: any;
    fileStatistics: any;
    contentStored: boolean;
};
export declare function buildTaskReplayAuditExport(taskId: string): {
    schema: string;
    generatedAt: string;
    taskId: any;
    sourceChecksum: any;
    status: any;
    acceptanceState: any;
    integrity: any;
    attempts: any;
    actionCenter: any;
    tasks: any;
    events: any;
    evidence: any;
    retention: any;
    contentStored: boolean;
};
export declare function projectTaskReplayForAccess(replay: any, canManage: boolean): any;
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
        user_readable_v5: boolean;
        duplicate_events_merged: boolean;
        redundant_summary_dropped: boolean;
        replay_event_linked: boolean;
        business_projection_hides_technical: boolean;
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
    presentation_checks: {
        schema: boolean;
        six_chapters: boolean;
        acceptance_verified: boolean;
        historical_failure_resolved: boolean;
        attempt_preserved: boolean;
        integrity_present: boolean;
        causal_chain_present: boolean;
        no_content: boolean;
    };
};
