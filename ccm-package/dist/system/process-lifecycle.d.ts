export declare function getProcessBootId(): string;
export declare function registerRestartIntent(input?: any): {
    version: number;
    category: string;
    reason: string;
    requested_at: string;
    expires_at: string;
    requested_by_pid: number;
    task_id: string;
    trace_id: string;
};
export declare function initializeProcessLifecycle(): any;
export declare function touchProcessLifecycle(): boolean;
export declare function markProcessShutdown(input?: any): any;
export declare function recordProcessFault(error: any, type?: string): void;
export declare function installProcessLifecycleFaultHandlers(): void;
export declare function getProcessLifecycleSnapshot(options?: any): {
    current: any;
    events: any[];
    counts: {
        events: number;
        starts: number;
        planned_restarts: number;
        unexpected_restarts: number;
    };
    last_restart: any;
};
export declare function runProcessLifecycleSelfTest(): {
    pass: boolean;
    checks: {
        categoryNormalization: boolean;
        bootIdentityExists: boolean;
        snapshotShape: boolean;
        executionContextShape: boolean;
    };
};
