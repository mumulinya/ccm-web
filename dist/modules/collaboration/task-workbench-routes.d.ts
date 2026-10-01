export declare function projectTaskWorkbenchRow(task: any, allRuns?: any[]): {
    task_id: string;
    title: string;
    goal: string;
    scope: string;
    origin: string;
    target: {
        project: string;
        group_id: string;
        label: string;
    };
    status: any;
    active_run: {
        run_id: any;
        attempt_id: string;
        task_id: any;
        trace_id: any;
        trigger: any;
        status: any;
        attempt: any;
        parent_run_id: any;
        queue_lane: any;
        created_at: any;
        updated_at: any;
        verification_result: any;
        delivery_result: any;
        evidence_count: any;
        automation_definition_id: any;
        automation_definition_revision: any;
    };
    run_count: number;
    acceptance: any;
    updated_at: string;
    attention_reason: string;
    available_actions: string[];
    archive_policy: any;
    creation_policy: any;
    archive_state: {
        eligible: boolean;
        policy: any;
        reason: string;
    };
    archive_actions: string[];
    output_revision: string;
    automation: {
        definition_id: any;
        name: any;
        revision: any;
        schedule: any;
        timezone: any;
        enabled: boolean;
    };
    plan_status: string;
    clarification: {
        count: any;
        pending: boolean;
        questions: any;
    };
    task_session: {
        available: boolean;
        session_id: string;
        lifecycle: "running" | "awaiting_confirmation" | "planning" | "available";
        creation_policy: "on_create" | "on_terminal";
        materialized_at: string;
        updated_at: string;
    } | {
        available: boolean;
        lifecycle: string;
        creation_policy: any;
        session_id?: undefined;
        materialized_at?: undefined;
        updated_at?: undefined;
    };
    spec_summary: {
        revision: any;
        checksum: any;
        execution_policy: any;
    };
};
export declare function handleTaskWorkbenchRoutes(pathname: string, req: any, res: any, parsed: any): boolean;
