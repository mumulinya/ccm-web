import { CollabCtx } from "./collaboration";
export declare function enqueueTask(taskId: string, ctx: CollabCtx): {
    queued: boolean;
    message: string;
    blocked?: undefined;
    duplicate_block_suppressed?: undefined;
    reason?: undefined;
    readiness?: undefined;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    blocked: boolean;
    duplicate_block_suppressed: boolean;
    reason: string;
    message: any;
    readiness: any;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    message: string;
    targetKey: string;
    position: number;
    blocked?: undefined;
    duplicate_block_suppressed?: undefined;
    reason?: undefined;
    readiness?: undefined;
};
export declare function createAndQueueTask(task: any, ctx: CollabCtx): {
    task: any;
    queueResult: {
        queued: boolean;
        message: string;
        blocked?: undefined;
        duplicate_block_suppressed?: undefined;
        reason?: undefined;
        readiness?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        blocked: boolean;
        duplicate_block_suppressed: boolean;
        reason: string;
        message: any;
        readiness: any;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        message: string;
        targetKey: string;
        position: number;
        blocked?: undefined;
        duplicate_block_suppressed?: undefined;
        reason?: undefined;
        readiness?: undefined;
    };
};
export declare function resumeTaskQueues(ctx: CollabCtx, options?: any): {
    resumed: number;
    auto_resumed: number;
    manual_pending: number;
    skipped: number;
    total: number;
    trace_backfilled: number;
    manual_recovery: boolean;
    mixed_recovery: boolean;
    recovery_policy: string;
    test_agent_runner_recovery: {
        schema: string;
        total: number;
        running: number;
        interrupted: number;
        retention: {
            schema: string;
            scanned: number;
            removedRecords: number;
            removedFiles: number;
        };
    };
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
};
export declare function getTaskWatchdogStatus(staleMs?: number, gapCooldownMs?: number, gapMaxCount?: number, taskSnapshot?: any[]): {
    stale_ms: number;
    checked_at: string;
    stale_pending: any[];
    stalled_in_progress: any[];
    running_long: any[];
    runtime_failed: any[];
    gap_rework: any[];
    work_item_stalled: any[];
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
    };
};
export declare function runTaskWatchdog(ctx: CollabCtx, options?: any): {
    success: boolean;
    recovered: number;
    total_recoverable: number;
    stale_recovered: number;
    stale_recoverable: number;
    work_item_stalled_total: number;
    work_item_requeued: any;
    work_item_results: any[];
    blocked_recovery: any;
    runtime_failed_total: number;
    runtime_retried: any;
    runtime_queued: any;
    gap_rework_total: number;
    gap_continued: number;
    gap_queued: number;
    gap_results: any[];
    gap_continue_skipped_reason: any;
    runtime_retry: any;
    runtime_retry_skipped_reason: any;
    execution_readiness: any;
    daily_dev_execution_readiness: any;
    results: any[];
    status: {
        stale_ms: number;
        checked_at: string;
        stale_pending: any[];
        stalled_in_progress: any[];
        running_long: any[];
        runtime_failed: any[];
        gap_rework: any[];
        work_item_stalled: any[];
        queue_status: {
            total_queued: number;
            running_targets: number;
            target_status: any;
            pending_tasks: number;
            in_progress_tasks: number;
            failed_tasks: number;
            running_task_ids: string[];
        };
    };
};
export declare function taskMatchesAgentProbeTarget(task: any, target?: any): boolean;
export declare function buildAgentRecoveryProbeGroups(tasks: any[]): any[];
export declare function runAgentRecoveryMonitorOnce(ctx: CollabCtx, options?: any): Promise<{
    success: boolean;
    skipped: boolean;
    reason: string;
    work: {
        blocked_pending: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            blocked_at: any;
            status_detail: string;
        }[];
        runtime_failed: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            retry_count: number;
            reason: string;
        }[];
        total: number;
    };
}> | Promise<{
    success: boolean;
    skipped: boolean;
    work: {
        blocked_pending: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            blocked_at: any;
            status_detail: string;
        }[];
        runtime_failed: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            retry_count: number;
            reason: string;
        }[];
        total: number;
    };
    probe_groups: any;
    target_results: any[];
    failures: any[];
    message: any;
    probe: any;
    blocked_recovery: {
        total_blocked: any;
        recovered: any;
        results: any[];
    };
    runtime_recovery: {
        success: boolean;
        total_recoverable: any;
        retried: any;
        queued: any;
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
    };
}>;
export declare function startAgentRecoveryMonitor(ctx: CollabCtx): void;
export declare function stopAgentRecoveryMonitor(): void;
export declare function startTaskWatchdog(ctx: CollabCtx): void;
export declare function stopTaskWatchdog(): void;
