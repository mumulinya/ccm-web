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
export declare function buildCompleteTaskReplay(taskId: string): {
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
        status: "info" | "failed" | "blocked" | "passed" | "running" | "warning";
        event_count: number;
        started_at: string;
        finished_at: string;
    }[];
    events: TaskReplayEvent[];
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
        failure_navigation: boolean;
        evidence_preview: boolean;
        historical_line_diff: boolean;
        raw_machine_paths_exposed: boolean;
    };
};
export declare function buildTaskReplayIndex(limit?: number): {
    schema: string;
    generated_at: string;
    total: number;
    tasks: {
        child_count: number;
        replay_url: string;
        id: string;
        parent_task_id: string;
        root_task_id: string;
        title: string;
        goal: string;
        project: string;
        group_id: string;
        trace_id: string;
        status: string;
        created_at: string;
        updated_at: string;
        is_root: boolean;
    }[];
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
