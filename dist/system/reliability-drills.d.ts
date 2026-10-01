export declare function getReliabilityDrillRun(runId: string): {
    schema: string;
    run_id: any;
    kind: any;
    status: any;
    checkpoint: any;
    pid: number;
    requested_by: any;
    created_at: any;
    started_at: any;
    completed_at: any;
    updated_at: any;
    result: any;
    error: any;
    log_summary: any;
    cleanup_status: any;
    cancel_requested: boolean;
};
export declare function listReliabilityDrillRuns(limit?: number): any;
export declare function getReliabilityDrillStatus(): {
    scheduler_running: boolean;
    next_run_at: string;
    active_run: {
        schema: string;
        run_id: any;
        kind: any;
        status: any;
        checkpoint: any;
        pid: number;
        requested_by: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        result: any;
        error: any;
        log_summary: any;
        cleanup_status: any;
        cancel_requested: boolean;
    };
    latest_run: any;
};
export declare function runProductionReliabilityDrills(): {
    pass: boolean;
    trace_id: string;
    task_id: string;
    merge_commit: string;
    checks: {
        intakeAcceptedOnce: boolean;
        duplicateMessageSuppressedWhileRunning: boolean;
        duplicateMessageReplaysOriginalTask: boolean;
        taskLeaseAcquired: boolean;
        conflictPredictedAndSerialized: boolean;
        agentsShareProtectedWorktree: boolean;
        downstreamWorkerSeesUpstreamChange: boolean;
        realVerificationPassed: true;
        mergeExecutedOnce: boolean;
        runtimeCrashTriggersFallback: boolean;
        missingNativeSessionHasSafeRecovery: boolean;
        staleLeaseRecoveryWorks: boolean;
        traceExplainsWholeDelivery: boolean;
    };
};
export declare function startReliabilityDrillRun(options?: any): {
    accepted: boolean;
    duplicate: boolean;
    run: {
        schema: string;
        run_id: any;
        kind: any;
        status: any;
        checkpoint: any;
        pid: number;
        requested_by: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        result: any;
        error: any;
        log_summary: any;
        cleanup_status: any;
        cancel_requested: boolean;
    };
} | {
    accepted: boolean;
    run: {
        schema: string;
        run_id: any;
        kind: any;
        status: any;
        checkpoint: any;
        pid: number;
        requested_by: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        result: any;
        error: any;
        log_summary: any;
        cleanup_status: any;
        cancel_requested: boolean;
    };
    duplicate?: undefined;
};
export declare function cancelReliabilityDrillRun(runId: string): Promise<{
    success: boolean;
    error: string;
    run?: undefined;
} | {
    success: boolean;
    run: {
        schema: string;
        run_id: any;
        kind: any;
        status: any;
        checkpoint: any;
        pid: number;
        requested_by: any;
        created_at: any;
        started_at: any;
        completed_at: any;
        updated_at: any;
        result: any;
        error: any;
        log_summary: any;
        cleanup_status: any;
        cancel_requested: boolean;
    };
    error?: undefined;
}>;
export declare function recoverReliabilityDrillRuns(): {
    scanned: number;
    recovered: number;
};
export declare function runScheduledProductionReliabilityDrill(options?: any): {
    skipped: boolean;
    reason: string;
    next_run_at: string;
    last_result: any;
    result?: undefined;
} | {
    skipped: boolean;
    result: {
        pass: boolean;
        trace_id: string;
        task_id: string;
        merge_commit: string;
        checks: {
            intakeAcceptedOnce: boolean;
            duplicateMessageSuppressedWhileRunning: boolean;
            duplicateMessageReplaysOriginalTask: boolean;
            taskLeaseAcquired: boolean;
            conflictPredictedAndSerialized: boolean;
            agentsShareProtectedWorktree: boolean;
            downstreamWorkerSeesUpstreamChange: boolean;
            realVerificationPassed: true;
            mergeExecutedOnce: boolean;
            runtimeCrashTriggersFallback: boolean;
            missingNativeSessionHasSafeRecovery: boolean;
            staleLeaseRecoveryWorks: boolean;
            traceExplainsWholeDelivery: boolean;
        };
    };
    reason?: undefined;
    next_run_at?: undefined;
    last_result?: undefined;
} | {
    skipped: boolean;
    result: {
        pass: boolean;
        error: any;
    };
    reason?: undefined;
    next_run_at?: undefined;
    last_result?: undefined;
};
export declare function startReliabilityDrillScheduler(): boolean;
export declare function stopReliabilityDrillScheduler(): void;
