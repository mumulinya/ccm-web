export declare function createTraceId(prefix?: string): string;
export declare function ensureTraceId(value: any, prefix?: string): string;
export declare function getTrace(traceId: string): any;
export declare function appendTraceEvent(traceId: string, event: any): any;
export declare function listTraces(limit?: number): any[];
export declare function getIdempotencyRecord(scope: string, key: string): any;
export declare function acquireIdempotency(input: {
    scope: string;
    key: string;
    traceId?: string;
    leaseMs?: number;
    metadata?: any;
    retryFailed?: boolean;
}): {
    acquired: boolean;
    duplicate: boolean;
    inProgress: boolean;
    record: any;
    traceId: any;
};
export declare function completeIdempotency(scope: string, key: string, result?: any): any;
export declare function failIdempotency(scope: string, key: string, error: any): any;
export declare function settleIdempotencyByTrace(traceId: string, status: "completed" | "failed", result?: any, scopes?: string[]): any[];
export declare function getTaskLease(taskId: string): any;
export declare function listTaskLeases(): any[];
export declare function getReliabilityLedgerStats(): {
    operations: {
        total: number;
        in_progress: number;
        completed: number;
        failed: number;
        duplicate_suppressed: any;
        stale_in_progress: number;
        stale_items: {
            operation_id: any;
            scope: any;
            trace_id: any;
            owner_pid: any;
            lease_expires_at: any;
        }[];
    };
    leases: {
        total: number;
        active: number;
        stale: number;
        stale_items: {
            task_id: any;
            trace_id: any;
            owner_pid: any;
            expires_at: any;
            recovery_count: any;
        }[];
        recoveries: any;
    };
    traces: {
        total: number;
        bytes: number;
    };
};
export declare function reconcileReliabilityLedgerDebt(reason?: string): {
    reconciled_at: string;
    reason: string;
    operations: any[];
    leases: any[];
    operation_count: number;
    lease_count: number;
};
export declare function acquireTaskLease(taskId: string, traceId: string, ttlMs?: number): {
    acquired: boolean;
    lease: any;
};
export declare function renewTaskLease(taskId: string, ttlMs?: number): boolean;
export declare function releaseTaskLease(taskId: string, finalStatus?: string): boolean;
export declare function runReliabilityLedgerSelfTest(): {
    pass: boolean;
    checks: {
        firstAttemptAcquired: boolean;
        duplicateRunningSuppressed: boolean;
        completedResultReplayed: boolean;
        taskLeaseLifecycleWorks: boolean;
        deadOwnerLeaseIsRecovered: boolean;
        recoveredRunSettlesIdempotency: boolean;
        traceEventsPersist: boolean;
    };
};
