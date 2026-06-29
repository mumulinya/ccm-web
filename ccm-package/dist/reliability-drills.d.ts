export declare function getReliabilityDrillStatus(): any;
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
        traceExplainsWholeDelivery: any;
    };
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
            traceExplainsWholeDelivery: any;
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
