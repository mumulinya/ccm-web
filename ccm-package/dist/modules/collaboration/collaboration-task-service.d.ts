import { CollabCtx } from "./collaboration";
export declare function createTask(task: any): any;
export declare function classifyTaskContinuation(message: string): "supplement" | "revise_goal" | "new_task";
export declare function looksLikeTaskContinuation(message: string): boolean;
export declare function updateTask(id: string, updates: any): any;
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
    };
    status?: undefined;
    error?: undefined;
};
export declare function purgeArchivedTask(id: string): any;
