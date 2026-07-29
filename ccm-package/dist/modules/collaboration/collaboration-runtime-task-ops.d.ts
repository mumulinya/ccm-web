import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function switchTaskExecutor(id: string, requestedRuntime: string, ctx: CollabCtx, options?: any): {
    success: boolean;
    status: number;
    error: string;
    task?: undefined;
    runtime?: undefined;
    previous_runtime?: undefined;
    project?: undefined;
    sessions_closed?: undefined;
    queued?: undefined;
    queue_result?: undefined;
    queue_status?: undefined;
} | {
    success: boolean;
    task: any;
    runtime: {
        id: import("../../agents/catalog").AgentRuntimeId;
        aliases: string[];
        label: string;
        commandLabel: string;
        capabilities: import("../../agents/runtime").AgentRuntimeDescriptor["capabilities"];
        nativeContinuation: any;
    };
    previous_runtime: string;
    project: string;
    sessions_closed: number;
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
};
export declare function retryRuntimeFailedTasks(ctx: CollabCtx, options?: any): {
    success: boolean;
    dry_run: boolean;
    total_recoverable: number;
    retried: number;
    queued: number;
    auto_execute: boolean;
    results: {
        task_id: any;
        title: any;
        status: any;
        retry_count: number;
        previous_failure: any;
    }[];
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
} | {
    success: boolean;
    total_recoverable: number;
    retried: number;
    queued: number;
    auto_execute: boolean;
    results: any[];
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
    dry_run?: undefined;
};
export declare function archiveTask(id: string, reason?: string): any;
export declare function restoreArchivedTask(id: string): any;
export declare function purgeArchivedTask(id: string): any;
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
