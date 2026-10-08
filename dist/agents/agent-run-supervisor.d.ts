export interface AgentRunSupervisorOptions {
    intervalMs?: number;
    startingTimeoutMs?: number;
    runningTimeoutMs?: number;
    autoRecover?: boolean;
}
export declare function reconcileAgentRunSupervisor(options?: AgentRunSupervisorOptions): Promise<{
    startingTimedOut: number;
    runningTimedOut: number;
    recoveryChecked: number;
    recoverySucceeded: number;
    recoveryBlocked: number;
    metrics: {
        wakeRequests: number;
        wakeQueued: number;
        wakeCoalesced: number;
        wakeFailed: number;
        activeRuns: number;
        leaseExpired: number;
        runtimeStatuses: {
            runtimeId: string;
            status: string;
            count: number;
        }[];
        duplicateIdempotencyHits: number;
        activeRunDuplicateStartBlocked: number;
        active_run_duplicate_blocked: number;
        heartbeatRequests: number;
        heartbeat_requests: number;
        heartbeat_coalesced: number;
        heartbeat_duplicate_idempotency: number;
        runCreated: number;
        run_created: number;
        runSucceeded: number;
        run_succeeded: number;
        runFailed: number;
        run_failed: number;
        runCancelled: number;
        run_cancelled: number;
        resumeAttempted: number;
        resumeSucceeded: number;
        resumeBlocked: number;
        receiptIdentityAmbiguous: number;
        receipt_identity_ambiguous: number;
        adoptionRejected: number;
        taskRunConsistencyRepairable: number;
        taskRunConsistencyBlocked: number;
        startupDurationMs: number;
        executionDurationMs: number;
        recoveryDurationMs: number;
        recoverySuccess: number;
        recoveryFailure: number;
        workspaceEvidenceFailures: any;
        workspace_evidence_failed: any;
        runtimeVersionIncompatible: any;
        runtime_version_incompatible: any;
        nativeSessionInvalid: any;
        native_session_invalid: any;
        usage: {
            records: number;
            inputTokens: number;
            outputTokens: number;
            cachedTokens: number;
            cost: number;
            unreported: number;
            providerUsageMissing: number;
            provider_usage_missing: number;
        };
        providerUsageMissing: number;
        provider_usage_missing: number;
        runtimeMetrics: {
            runtimeId: string;
            scope: string;
            total: number;
            succeeded: number;
            failed: number;
            successRate: number;
        }[];
        filters: {
            runtimeId: string;
            scope: string;
            status: string;
            from: string;
            to: string;
        };
    };
    checked: number;
    expired: number;
}>;
export declare function startAgentRunSupervisor(options?: AgentRunSupervisorOptions): {
    started: boolean;
    alreadyRunning: boolean;
    intervalMs?: undefined;
} | {
    started: boolean;
    intervalMs: number;
    alreadyRunning?: undefined;
};
export declare function stopAgentRunSupervisor(): boolean;
export declare function inspectAgentRun(runId: string): import("./agent-run-types").AgentRun;
