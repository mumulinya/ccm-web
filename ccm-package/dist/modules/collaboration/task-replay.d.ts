import { type ResolvedTestAgentArtifact } from "../../test-agent/artifact-retention";
export type TaskReplayStage = "intake" | "planning" | "dispatch" | "execution" | "change" | "test" | "rework" | "review" | "completion" | "system";
export type TaskReplayStatus = "info" | "running" | "passed" | "warning" | "failed" | "blocked" | "cancelled";
export interface TaskReplayEvent {
    id: string;
    at: string;
    stage: TaskReplayStage;
    category: string;
    status: TaskReplayStatus;
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
        trace_id: string;
        status: string;
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
    };
    phases: {
        id: TaskReplayStage;
        status: "warning" | "info" | "failed" | "passed" | "running" | "blocked";
        event_count: number;
        started_at: string;
        finished_at: string;
    }[];
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
    };
};
