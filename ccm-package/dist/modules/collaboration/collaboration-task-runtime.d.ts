import { CollabCtx } from "./collaboration";
export declare function bindTaskRuntimeCollabCtx(ctx: CollabCtx): void;
/** 子任务强验收通过后立即调度父 Epic，解锁并入队后继节点（不依赖看门狗轮询）。 */
export declare function scheduleRequirementEpicDependencyUnlock(parentId: string, reason?: string): {
    scheduled: boolean;
    reason: string;
    mission_id?: undefined;
} | {
    scheduled: boolean;
    mission_id: string;
    reason: string;
};
export declare function enqueueTask(taskId: string, ctx: CollabCtx): {
    queued: boolean;
    message: string;
    blocked?: undefined;
    reason?: undefined;
    retry_after?: undefined;
    remaining_ms?: undefined;
    duplicate_block_suppressed?: undefined;
    dependency_wait?: undefined;
    dependencies?: undefined;
    readiness?: undefined;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    blocked: boolean;
    reason: string;
    retry_after: string;
    remaining_ms: number;
    duplicate_block_suppressed: boolean;
    message: string;
    dependency_wait?: undefined;
    dependencies?: undefined;
    readiness?: undefined;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    blocked: boolean;
    dependency_wait: boolean;
    dependencies: any;
    message: string;
    reason?: undefined;
    retry_after?: undefined;
    remaining_ms?: undefined;
    duplicate_block_suppressed?: undefined;
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
    retry_after?: undefined;
    remaining_ms?: undefined;
    dependency_wait?: undefined;
    dependencies?: undefined;
    targetKey?: undefined;
    position?: undefined;
} | {
    queued: boolean;
    message: string;
    targetKey: string;
    position: number;
    blocked?: undefined;
    reason?: undefined;
    retry_after?: undefined;
    remaining_ms?: undefined;
    duplicate_block_suppressed?: undefined;
    dependency_wait?: undefined;
    dependencies?: undefined;
    readiness?: undefined;
};
export declare function createAndQueueTask(task: any, ctx: CollabCtx): {
    task: any;
    queueResult: {
        queued: boolean;
        message: string;
        blocked?: undefined;
        reason?: undefined;
        retry_after?: undefined;
        remaining_ms?: undefined;
        duplicate_block_suppressed?: undefined;
        dependency_wait?: undefined;
        dependencies?: undefined;
        readiness?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        blocked: boolean;
        reason: string;
        retry_after: string;
        remaining_ms: number;
        duplicate_block_suppressed: boolean;
        message: string;
        dependency_wait?: undefined;
        dependencies?: undefined;
        readiness?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        blocked: boolean;
        dependency_wait: boolean;
        dependencies: any;
        message: string;
        reason?: undefined;
        retry_after?: undefined;
        remaining_ms?: undefined;
        duplicate_block_suppressed?: undefined;
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
        retry_after?: undefined;
        remaining_ms?: undefined;
        dependency_wait?: undefined;
        dependencies?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        message: string;
        targetKey: string;
        position: number;
        blocked?: undefined;
        reason?: undefined;
        retry_after?: undefined;
        remaining_ms?: undefined;
        duplicate_block_suppressed?: undefined;
        dependency_wait?: undefined;
        dependencies?: undefined;
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
    agent_communication_recovery: any[];
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
};
export declare function getTaskWatchdogStatus(staleMs?: number, gapCooldownMs?: number, gapMaxCount?: number, taskSnapshot?: any[], recoveryMaxCount?: number): {
    stale_ms: number;
    checked_at: string;
    stale_pending: any[];
    stalled_in_progress: any[];
    running_long: any[];
    runtime_failed: any[];
    gap_rework: any[];
    work_item_stalled: any[];
    recovery_exhausted: any[];
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
};
export declare function runTaskWatchdog(ctx: CollabCtx, options?: any): {
    success: boolean;
    recovered: number;
    total_recoverable: number;
    stale_recovered: number;
    stale_recoverable: number;
    recovery_exhausted: number;
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
    requirement_epic_results: any[];
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
        recovery_exhausted: any[];
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
            reason: any;
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
            reason: any;
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
    };
}>;
export declare function startAgentRecoveryMonitor(ctx: CollabCtx): void;
export declare function stopAgentRecoveryMonitor(): void;
export declare function startTaskWatchdog(ctx: CollabCtx): void;
export declare function stopTaskWatchdog(): void;
