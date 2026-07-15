import { type CollabCtx } from "../collaboration/collaboration";
export declare function deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId: string, groupSessionId: string, options?: any): any;
export declare function runConflictResolutionMemoryMaintenanceSchedulerTick(options?: any): any;
export declare function runCronDailyDevProtocolSelfTest(): {
    pass: boolean;
    checks: {
        hasDraft: boolean;
        workflowDailyDev: boolean;
        targetCoordinatorGroup: boolean;
        requiresVerification: boolean;
        sourceDocumentsIncludePrompt: boolean;
        hasCronMeta: boolean;
    };
    source_documents_preview: string;
};
export declare function syncCronTaskStatus(task: any, status: string, result?: string): void;
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
