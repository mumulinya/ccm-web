export declare function collectSoakSample(): Promise<{
    at: string;
    boot_id: string;
    pid: number;
    uptime_seconds: number;
    memory: {
        rss: number;
        heap_used: number;
        heap_total: number;
        external: number;
    };
    event_loop_lag_ms: number;
    tasks: {
        stuck_without_lease: number;
        total: number;
        statuses: Record<string, number>;
        duplicate_idempotency_groups: number;
    };
    ledger: {
        operations: {
            total: number;
            in_progress: number;
            completed: number;
            failed: number;
            duplicate_suppressed: any;
            stale_in_progress: number;
        };
        leases: {
            total: number;
            active: number;
            stale: number;
            recoveries: any;
        };
        traces: {
            total: number;
            bytes: number;
        };
    };
    runner: {
        status: any;
        pid: number;
        process_alive: boolean;
        heartbeat_age_ms: number;
        healthy: boolean;
    };
    feishu: {
        global: {
            expected: boolean;
            pid: number;
            alive: boolean;
        };
        projects: {
            config: string;
            pid: number;
            alive: boolean;
        }[];
        active_project_connections: number;
        stale_project_locks: number;
        healthy: boolean;
    };
    runtimes: {
        claudecode: boolean;
        codex: boolean;
        cursor: boolean;
    };
    drill: any;
}>;
export declare function startSoakTest(options?: any): Promise<{
    started: boolean;
    already_running: boolean;
    state: any;
} | {
    started: boolean;
    state: any;
    already_running?: undefined;
}>;
export declare function getSoakTestStatus(): any;
export declare function sampleSoakTestNow(): Promise<any>;
export declare function stopSoakTest(reason?: string): any;
export declare function resumeSoakTest(): {
    resumed: boolean;
    state: any;
    finalizing?: undefined;
} | {
    resumed: boolean;
    finalizing: boolean;
    state: any;
};
export declare function shutdownSoakMonitor(): void;
export declare function getSoakReport(): any;
export declare function runSoakTestSelfTest(): {
    pass: boolean;
    checks: {
        stableSamplesPass: boolean;
        restartIsObserved: boolean;
        availabilityCalculated: boolean;
        memorySlopeCalculated: boolean;
    };
};
