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
export declare function validateTaskTerminalTransition(task: any, updates?: any, options?: {
    developmentCycleSource?: string;
}): string;
export declare function buildTaskTerminalDecisionV2(task: any, updates?: any): any;
export declare function updateTask(id: string, updates: any, options?: {
    allowCancelledRecovery?: boolean;
    repairProjectionOnReplay?: boolean;
    developmentCycleSource?: string;
}): any;
export declare function normalizeTaskTerminalStateView(task: any): any;
export declare function removeTaskFromQueues(taskId: string, requestedRunId?: string): number;
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
export declare function retryTask(id: string, ctx: CollabCtx, reason?: string, autoExecute?: boolean, parentRunId?: string, options?: {
    automaticRecovery?: boolean;
}): any;
export declare function purgeArchivedTask(id: string): any;
