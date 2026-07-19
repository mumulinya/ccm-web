import { CollabCtx } from "./collaboration";
export declare function getGlobalDirectDispatchContinuationKey(task: any): string;
export declare function shouldNotifyGlobalDirectDispatchContinuation(task: any, previousStatus?: string): boolean;
export declare function buildGlobalDirectDispatchContinuationMessage(task: any): string;
export declare function shouldNotifyGlobalDirectDispatchCompletion(task: any, previousStatus?: string): boolean;
export declare function buildGlobalDirectDispatchCompletionMessage(task: any): string;
export declare function shouldNotifyGlobalDirectDispatchRollback(task: any, previousStatus?: string): boolean;
export declare function buildGlobalDirectDispatchRollbackMessage(task: any): string;
export declare function refreshGlobalDevelopmentMissions(): any[];
export declare function getGlobalDevelopmentMission(id: string): {
    mission: any;
    children: any[];
};
export declare function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options?: any): {
    success: boolean;
    error: string;
    terminal: boolean;
    mission?: undefined;
    children?: undefined;
    waiting_user?: undefined;
    actions?: undefined;
} | {
    success: boolean;
    mission: any;
    children: any[];
    terminal: boolean;
    waiting_user: any[];
    actions: any[];
    error?: undefined;
};
export declare function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload?: any): Promise<{
    success: boolean;
    status: number;
    error: string;
} | {
    mission: any;
    children: any[];
    success: boolean;
    operation: string;
    continuation_kind: any;
    continuation_summary: {
        schema: string;
        kind: any;
        source: string;
        replan_required: boolean;
        interrupt_current_run: boolean;
        affected_task_count: number;
        queued_task_count: number;
        deferred_task_count: number;
        interruption_requested_count: number;
        interrupted_task_count: number;
        interruption_failed_count: number;
        failed_task_count: number;
        results: any[];
        at: string;
    };
    status?: undefined;
    error?: undefined;
} | {
    mission: any;
    children: any[];
    success: boolean;
    operation: string;
    status?: undefined;
    error?: undefined;
}>;
export declare function buildGlobalMissionTargetHandoff(input: {
    parent: any;
    target: any;
    group?: any;
    businessGoal: string;
    childGoal: string;
    acceptance: string;
    sourceDocuments?: string;
    traceId: string;
    priority?: string;
}): {
    global_mission: {
        mission_id: any;
        target_type: any;
        target_name: any;
        priority: string;
        depends_on: any;
    };
    schema: string;
    handoff_id: string;
    project: string;
    source: string;
    reason: string;
    user_goal: string;
    task: string;
    work_dir: string;
    agent_type: string;
    worker_context_packet: any;
    scope: {
        allowed: string[];
        forbidden: string[];
        expected_files: string[];
        dependencies: {
            project: string;
            reason: string;
        }[];
        continuation: any;
        advisory_only: boolean;
    };
    references: {
        document_findings: string[];
        constraints: string[];
        memory_context: any;
        memory_summary: string;
        contract_injections: any;
        memory_freshness_gate: any;
        post_compact_reinjection_gate: any;
        post_compact_dispatch_marker: any;
        read_plan_revalidation_gate: any;
        global_memory_health_gate: any;
        api_microcompact_native_apply_plan: any;
    };
    verification: {
        required: string;
        hints: string[];
        acceptance: string[];
    };
    done_criteria: string[];
    ack_gate: {
        required: boolean;
        fields: string[];
        rule: string;
    };
    receipt_schema: {
        marker: string;
        required_fields: string[];
        status_values: string[];
    };
    user_summary: {
        label: string;
        text: string;
        completeness: {
            has_goal: boolean;
            has_scope: boolean;
            has_done_criteria: boolean;
            has_receipt_schema: boolean;
            has_ack_gate: boolean;
            has_memory_freshness_gate: boolean;
            has_post_compact_reinjection_gate: boolean;
            has_post_compact_dispatch_marker: boolean;
            has_read_plan_revalidation_gate: boolean;
            has_global_memory_health_gate: boolean;
            has_api_microcompact_native_apply_plan: boolean;
        };
    };
};
export declare function normalizeGlobalMissionTargetRequirements(payload: any, target: any): {
    requires_code_changes: boolean;
    requires_verification: boolean;
    requires_independent_review: boolean;
};
export declare function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx): {
    success: boolean;
    duplicate: boolean;
    mission: any;
    children: any;
    rejected: any[];
} | {
    success: boolean;
    mission: any;
    children: any[];
    rejected: any[];
    duplicate?: undefined;
};
