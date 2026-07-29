import { type RequirementDecompositionPlan } from "../requirements/source-ingestion";
import { CollabCtx } from "./collaboration";
export interface TaskIntakeIdentityV2 {
    schema: "ccm-task-intake-identity-v2";
    source_channel: string;
    target_scope: "group_session" | "project_session" | "global";
    target_id: string;
    exact_session_id: string;
    client_message_id: string;
    content_checksum: string;
    workflow_type: string;
    checksum: string;
}
export declare function buildTaskIntakeIdentityV2(task: any): TaskIntakeIdentityV2 | null;
export declare function createTask(task: any): any;
export declare function createRequirementEpicWithChildren(payload: any): {
    success: boolean;
    duplicate: boolean;
    epic: any;
    children: any;
    decomposition_plan: any;
    needs_clarification?: undefined;
    clarification_questions?: undefined;
    needs_confirmation?: undefined;
    dependency_edges?: undefined;
} | {
    success: boolean;
    needs_clarification: boolean;
    decomposition_plan: RequirementDecompositionPlan;
    clarification_questions: string[];
    duplicate?: undefined;
    epic?: undefined;
    children?: undefined;
    needs_confirmation?: undefined;
    dependency_edges?: undefined;
} | {
    success: boolean;
    needs_confirmation: boolean;
    decomposition_plan: RequirementDecompositionPlan;
    duplicate?: undefined;
    epic?: undefined;
    children?: undefined;
    needs_clarification?: undefined;
    clarification_questions?: undefined;
    dependency_edges?: undefined;
} | {
    success: boolean;
    duplicate: boolean;
    epic: any;
    children: any[];
    decomposition_plan: RequirementDecompositionPlan;
    dependency_edges: {
        from_item_key: string;
        to_item_key: string;
        from_task_id: string;
        to_task_id: string;
    }[];
    needs_clarification?: undefined;
    clarification_questions?: undefined;
    needs_confirmation?: undefined;
};
export declare function updateRequirementEpicFromPlan(payload: any): {
    success: boolean;
    needs_confirmation: boolean;
    epic: any;
    duplicate?: undefined;
    children?: undefined;
    diff?: undefined;
    retired_children?: undefined;
    dependency_edges?: undefined;
} | {
    success: boolean;
    duplicate: boolean;
    epic: any;
    children: any[];
    diff: {
        schema: string;
        from_version: number;
        to_version: number;
        from_content_hash: string;
        to_content_hash: string;
        added: string[];
        removed: string[];
        changed: string[];
        unchanged: string[];
        has_changes: boolean;
    };
    needs_confirmation?: undefined;
    retired_children?: undefined;
    dependency_edges?: undefined;
} | {
    success: boolean;
    epic: any;
    children: any[];
    retired_children: any[];
    diff: {
        affected: string[];
        reopened: string[];
        schema: string;
        from_version: number;
        to_version: number;
        from_content_hash: string;
        to_content_hash: string;
        added: string[];
        removed: string[];
        changed: string[];
        unchanged: string[];
        has_changes: boolean;
    };
    dependency_edges: {
        from_item_key: string;
        to_item_key: string;
        from_task_id: any;
        to_task_id: any;
    }[];
    needs_confirmation?: undefined;
    duplicate?: undefined;
};
export declare function classifyTaskContinuation(message: string): string;
export declare function looksLikeTaskContinuation(message: string): boolean;
export declare function hasStructuredTaskAcceptanceEvidence(task: any, updates?: any): boolean;
export declare function validateTaskTerminalTransition(task: any, updates?: any): string;
export declare function buildTaskTerminalDecisionV2(task: any, updates?: any): {
    checksum: string;
    schema: string;
    task_id: string;
    status: string;
    acceptance_state: string;
    actor: string;
    gate_passed: boolean;
    evidence_checksum: string;
    reason: string;
    decided_at: string;
};
export declare function updateTask(id: string, updates: any): any;
export declare function normalizeTaskTerminalStateView(task: any): any;
export declare function removeTaskFromQueues(taskId: string): number;
export declare function canCompleteDailyDevFromDeliverySummary(task: any, execution: any, summary: any): any;
export declare function reconcileTaskCollaborationState(task: any, previous?: any): any;
export declare function continueDailyDevTasksFromGaps(ctx: CollabCtx, options?: any): {
    success: boolean;
    total_candidates: number;
    continued: number;
    queued: number;
    blocked: number;
    failed: number;
    limit: number;
    max_per_task: number;
    results: any[];
};
export declare function retryTask(id: string, ctx: CollabCtx, reason?: string, autoExecute?: boolean): {
    success: boolean;
    status: number;
    error: string;
    reason?: undefined;
    retry_after?: undefined;
    remaining_ms?: undefined;
    task?: undefined;
    queued?: undefined;
    queue_result?: undefined;
    queue_status?: undefined;
} | {
    success: boolean;
    status: number;
    error: any;
    reason: string;
    retry_after: any;
    remaining_ms: any;
    task?: undefined;
    queued?: undefined;
    queue_result?: undefined;
    queue_status?: undefined;
} | {
    success: boolean;
    task: any;
    queued: boolean;
    queue_result: any;
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
        unified_scheduler: {
            schema: string;
            queued: number;
            running_lanes: string[];
            running_task_ids: string[];
            workspace_lanes: string[];
            queues: {
                queue_key: string;
                task_ids: string[];
            }[];
        };
        unified_queued: number;
        unified_running_lanes: number;
        workspace_mutation_lanes: string[];
    };
    status?: undefined;
    error?: undefined;
    reason?: undefined;
    retry_after?: undefined;
    remaining_ms?: undefined;
};
export declare function purgeArchivedTask(id: string): any;
