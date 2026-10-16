export declare function projectTaskWorkbenchRow(task: any, allRuns?: any[], options?: {
    session?: any;
    detail?: boolean;
}): {
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
    available_actions: any[];
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
    plan_status: any;
    clarification: {
        count: any;
        pending: boolean;
        questions: any;
    };
    task_session: {
        available: boolean;
        opening_reason: string;
        materialized: boolean;
        session_id: any;
        lifecycle: any;
        creation_policy: any;
        materialized_at: any;
        updated_at: any;
    } | {
        available: boolean;
        opening_reason: string;
        lifecycle: string;
        creation_policy: any;
        materialized?: undefined;
        session_id?: undefined;
        materialized_at?: undefined;
        updated_at?: undefined;
    };
    spec_summary: {
        revision: any;
        checksum: any;
        execution_policy: any;
    };
    dispatch_profile?: undefined;
    dispatch_diagnostic?: undefined;
    profile_reason?: undefined;
    required_gates?: undefined;
    verification_mode?: undefined;
    worktree_mode?: undefined;
    scope_expansion_state?: undefined;
    delivery_approvals?: undefined;
    rework_round?: undefined;
    rework_max_rounds?: undefined;
    rework_remaining_rounds?: undefined;
    task_id: string;
    user_workflow: {
        revision: string;
        phase: string;
        summary: string;
        waiting_on: string;
        blockers: any[];
        primary_action: string;
        available_actions: string[];
        acceptance_feedback: {
            failure_kind: string;
            failure_kinds: any[];
            failed_criteria: {
                criterion: string;
                status: any;
            }[];
            failed_checks: {
                check_id: string;
                exit_code: any;
                failure_code: string;
                failure_stage: string;
                failure_kind: any;
                reproduction: string;
                expected_summary: string;
                actual_summary: string;
                evidence_refs: string[];
            }[];
            evidence_refs: string[];
            recommended_route: string;
            can_auto_rework: boolean;
            review_cycle: any;
        };
        code_review_summary: any;
        verification_summary: any;
        compatible_action_kinds: string[];
        approval_items: any;
        runtime_continuity: any;
    };
} | {
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
    available_actions: any[];
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
    plan_status: any;
    clarification: {
        count: any;
        pending: boolean;
        questions: any;
    };
    task_session: {
        available: boolean;
        opening_reason: string;
        materialized: boolean;
        session_id: any;
        lifecycle: any;
        creation_policy: any;
        materialized_at: any;
        updated_at: any;
    } | {
        available: boolean;
        opening_reason: string;
        lifecycle: string;
        creation_policy: any;
        materialized?: undefined;
        session_id?: undefined;
        materialized_at?: undefined;
        updated_at?: undefined;
    };
    spec_summary: {
        revision: any;
        checksum: any;
        execution_policy: any;
    };
    dispatch_profile: any;
    dispatch_diagnostic: string;
    profile_reason?: undefined;
    required_gates?: undefined;
    verification_mode?: undefined;
    worktree_mode?: undefined;
    scope_expansion_state?: undefined;
    delivery_approvals?: undefined;
    rework_round?: undefined;
    rework_max_rounds?: undefined;
    rework_remaining_rounds?: undefined;
    task_id: string;
    user_workflow: {
        revision: string;
        phase: string;
        summary: string;
        waiting_on: string;
        blockers: any[];
        primary_action: string;
        available_actions: string[];
        acceptance_feedback: {
            failure_kind: string;
            failure_kinds: any[];
            failed_criteria: {
                criterion: string;
                status: any;
            }[];
            failed_checks: {
                check_id: string;
                exit_code: any;
                failure_code: string;
                failure_stage: string;
                failure_kind: any;
                reproduction: string;
                expected_summary: string;
                actual_summary: string;
                evidence_refs: string[];
            }[];
            evidence_refs: string[];
            recommended_route: string;
            can_auto_rework: boolean;
            review_cycle: any;
        };
        code_review_summary: any;
        verification_summary: any;
        compatible_action_kinds: string[];
        approval_items: any;
        runtime_continuity: any;
    };
} | {
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
    available_actions: any[];
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
    plan_status: any;
    clarification: {
        count: any;
        pending: boolean;
        questions: any;
    };
    task_session: {
        available: boolean;
        opening_reason: string;
        materialized: boolean;
        session_id: any;
        lifecycle: any;
        creation_policy: any;
        materialized_at: any;
        updated_at: any;
    } | {
        available: boolean;
        opening_reason: string;
        lifecycle: string;
        creation_policy: any;
        materialized?: undefined;
        session_id?: undefined;
        materialized_at?: undefined;
        updated_at?: undefined;
    };
    spec_summary: {
        revision: any;
        checksum: any;
        execution_policy: any;
    };
    dispatch_profile: any;
    profile_reason: any;
    required_gates: any;
    verification_mode: any;
    worktree_mode: any;
    scope_expansion_state: any;
    delivery_approvals: {
        approvalId: any;
        runId: any;
        status: any;
        actionFingerprint: any;
        changedFiles: any;
    }[];
    rework_round: number;
    rework_max_rounds: number;
    rework_remaining_rounds: number;
    dispatch_diagnostic: any;
    task_id: string;
    user_workflow: {
        revision: string;
        phase: string;
        summary: string;
        waiting_on: string;
        blockers: any[];
        primary_action: string;
        available_actions: string[];
        acceptance_feedback: {
            failure_kind: string;
            failure_kinds: any[];
            failed_criteria: {
                criterion: string;
                status: any;
            }[];
            failed_checks: {
                check_id: string;
                exit_code: any;
                failure_code: string;
                failure_stage: string;
                failure_kind: any;
                reproduction: string;
                expected_summary: string;
                actual_summary: string;
                evidence_refs: string[];
            }[];
            evidence_refs: string[];
            recommended_route: string;
            can_auto_rework: boolean;
            review_cycle: any;
        };
        code_review_summary: any;
        verification_summary: any;
        compatible_action_kinds: string[];
        approval_items: any;
        runtime_continuity: any;
    };
};
export declare function handleTaskWorkbenchRoutes(pathname: string, req: any, res: any, parsed: any): boolean;
