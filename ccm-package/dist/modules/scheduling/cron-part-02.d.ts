import { type CollabCtx } from "../collaboration/collaboration";
export declare function syncCronTaskStatus(task: any, status: string, result?: string): void;
export declare function retryCronRun(jobId: string, runId: string, ctx: CollabCtx, trigger?: "retry" | "resume"): Promise<any>;
export declare function reconcileCronRunsOnStartup(now?: Date): {
    jobs: number;
    recovered_runs: number;
    failed_stale_runs: number;
    schedules_initialized: number;
};
export declare function startCronScheduler(ctx: CollabCtx): void;
export declare function stopCronScheduler(): void;
export declare function getConflictResolutionMemoryMaintenanceSchedulerStatus(): {
    schema: string;
    activeWithCronScheduler: boolean;
    safe: any;
    latest: any;
    policy: string;
};
export declare function handleCronApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
