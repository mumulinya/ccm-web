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
        id: import("../../agents/runtime").AgentRuntimeId;
        aliases: string[];
        label: string;
        commandLabel: string;
        capabilities: {
            print: boolean;
            streaming: boolean;
            externalRunner: boolean;
            worktreeIsolation: boolean;
            sessionResume: boolean;
            scratchpadContinuation: boolean;
        };
        nativeContinuation: {
            schema: string;
            version: number;
            provider: any;
            sessionResume: boolean;
            resumeAckPolicy: string;
            sessionIdOrigin: string;
            nativeFork: boolean;
            forkStrategy: string;
        };
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
    };
    dry_run?: undefined;
};
export declare function archiveTask(id: string, reason?: string): any;
export declare function restoreArchivedTask(id: string): any;
export declare function purgeArchivedTask(id: string): any;
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
