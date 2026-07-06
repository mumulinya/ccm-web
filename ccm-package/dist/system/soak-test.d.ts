export declare function inspectReliabilityDebt(): {
    generated_at: string;
    stale_idempotency: {
        operation_id: any;
        scope: any;
        trace_id: any;
        owner_pid: any;
        lease_expires_at: any;
    }[];
    stale_task_leases: {
        task_id: any;
        trace_id: any;
        owner_pid: any;
        expires_at: any;
        recovery_count: any;
    }[];
    orphaned_tasks: {
        task_id: any;
        trace_id: any;
        title: any;
        updated_at: any;
        group_id: any;
    }[];
    stale_feishu_locks: {
        config: any;
        project: any;
        lock: any;
        pid: any;
    }[];
    counts: {
        stale_idempotency: number;
        stale_task_leases: number;
        orphaned_tasks: number;
        stale_feishu_locks: number;
    };
};
export declare function reconcileStabilityDebt(reason?: string): {
    reconciled_at: string;
    reason: string;
    before: {
        generated_at: string;
        stale_idempotency: {
            operation_id: any;
            scope: any;
            trace_id: any;
            owner_pid: any;
            lease_expires_at: any;
        }[];
        stale_task_leases: {
            task_id: any;
            trace_id: any;
            owner_pid: any;
            expires_at: any;
            recovery_count: any;
        }[];
        orphaned_tasks: {
            task_id: any;
            trace_id: any;
            title: any;
            updated_at: any;
            group_id: any;
        }[];
        stale_feishu_locks: {
            config: any;
            project: any;
            lock: any;
            pid: any;
        }[];
        counts: {
            stale_idempotency: number;
            stale_task_leases: number;
            orphaned_tasks: number;
            stale_feishu_locks: number;
        };
    };
    ledger: {
        reconciled_at: string;
        reason: string;
        operations: any[];
        leases: any[];
        operation_count: number;
        lease_count: number;
    };
    recovered_tasks: any[];
    removed_feishu_locks: any[];
    after: {
        generated_at: string;
        stale_idempotency: {
            operation_id: any;
            scope: any;
            trace_id: any;
            owner_pid: any;
            lease_expires_at: any;
        }[];
        stale_task_leases: {
            task_id: any;
            trace_id: any;
            owner_pid: any;
            expires_at: any;
            recovery_count: any;
        }[];
        orphaned_tasks: {
            task_id: any;
            trace_id: any;
            title: any;
            updated_at: any;
            group_id: any;
        }[];
        stale_feishu_locks: {
            config: any;
            project: any;
            lock: any;
            pid: any;
        }[];
        counts: {
            stale_idempotency: number;
            stale_task_leases: number;
            orphaned_tasks: number;
            stale_feishu_locks: number;
        };
    };
    pass: boolean;
};
export declare function collectSoakSample(options?: any): Promise<{
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
    event_loop_point_lag_ms: number;
    event_loop_phase: "runtime" | "startup" | "transition";
    event_loop_delay_window_ms: {
        phase: "runtime" | "startup" | "transition";
        window_started_uptime_seconds: number;
        window_ended_uptime_seconds: number;
        samples: number;
        min: number;
        mean: number;
        p95: number;
        p99: number;
        max: number;
    };
    event_loop_startup_window_ms: any;
    startup_phase: boolean;
    diagnostic_stage_ms: Record<string, number>;
    snapshot_duration_ms: number;
    tasks: {
        stuck_without_lease: any;
        stuck_items: any;
        total: number;
        statuses: Record<string, number>;
        duplicate_idempotency_groups: number;
    };
    ledger: any;
    runner: any;
    feishu: any;
    freeze: {
        hash: string;
        files: number;
        counts: {
            code: number;
            config: number;
        };
        complete: boolean;
        project_root: string;
        required_runtime: string;
        entries: {
            error?: any;
            path: string;
            scope: any;
            hash: any;
            size: any;
            mtime_ms: any;
        }[];
    };
    lifecycle: any;
    runtimes: any;
    drill: any;
}>;
export declare function startSoakTest(options?: any): Promise<{
    started: boolean;
    already_running: boolean;
    state: any;
    blocked?: undefined;
    message?: undefined;
    preflight?: undefined;
    reconciliation?: undefined;
} | {
    started: boolean;
    blocked: boolean;
    message: string;
    preflight: {
        checked_at: string;
        debt: {
            generated_at: string;
            stale_idempotency: {
                operation_id: any;
                scope: any;
                trace_id: any;
                owner_pid: any;
                lease_expires_at: any;
            }[];
            stale_task_leases: {
                task_id: any;
                trace_id: any;
                owner_pid: any;
                expires_at: any;
                recovery_count: any;
            }[];
            orphaned_tasks: {
                task_id: any;
                trace_id: any;
                title: any;
                updated_at: any;
                group_id: any;
            }[];
            stale_feishu_locks: {
                config: any;
                project: any;
                lock: any;
                pid: any;
            }[];
            counts: {
                stale_idempotency: number;
                stale_task_leases: number;
                orphaned_tasks: number;
                stale_feishu_locks: number;
            };
        };
        runner_healthy: boolean;
        feishu_healthy: boolean;
        expected_feishu_configs: any;
        missing_feishu_connections: any;
        freeze: {
            hash: string;
            files: number;
            counts: {
                code: number;
                config: number;
            };
            complete: boolean;
            project_root: string;
            required_runtime: string;
            entries: {
                error?: any;
                path: string;
                scope: any;
                hash: any;
                size: any;
                mtime_ms: any;
            }[];
        };
        process_boot_id: string;
        process_uptime_seconds: number;
    };
    reconciliation: {
        reconciled_at: string;
        reason: string;
        before: {
            generated_at: string;
            stale_idempotency: {
                operation_id: any;
                scope: any;
                trace_id: any;
                owner_pid: any;
                lease_expires_at: any;
            }[];
            stale_task_leases: {
                task_id: any;
                trace_id: any;
                owner_pid: any;
                expires_at: any;
                recovery_count: any;
            }[];
            orphaned_tasks: {
                task_id: any;
                trace_id: any;
                title: any;
                updated_at: any;
                group_id: any;
            }[];
            stale_feishu_locks: {
                config: any;
                project: any;
                lock: any;
                pid: any;
            }[];
            counts: {
                stale_idempotency: number;
                stale_task_leases: number;
                orphaned_tasks: number;
                stale_feishu_locks: number;
            };
        };
        ledger: {
            reconciled_at: string;
            reason: string;
            operations: any[];
            leases: any[];
            operation_count: number;
            lease_count: number;
        };
        recovered_tasks: any[];
        removed_feishu_locks: any[];
        after: {
            generated_at: string;
            stale_idempotency: {
                operation_id: any;
                scope: any;
                trace_id: any;
                owner_pid: any;
                lease_expires_at: any;
            }[];
            stale_task_leases: {
                task_id: any;
                trace_id: any;
                owner_pid: any;
                expires_at: any;
                recovery_count: any;
            }[];
            orphaned_tasks: {
                task_id: any;
                trace_id: any;
                title: any;
                updated_at: any;
                group_id: any;
            }[];
            stale_feishu_locks: {
                config: any;
                project: any;
                lock: any;
                pid: any;
            }[];
            counts: {
                stale_idempotency: number;
                stale_task_leases: number;
                orphaned_tasks: number;
                stale_feishu_locks: number;
            };
        };
        pass: boolean;
    };
    already_running?: undefined;
    state?: undefined;
} | {
    started: boolean;
    state: any;
    already_running?: undefined;
    blocked?: undefined;
    message?: undefined;
    preflight?: undefined;
    reconciliation?: undefined;
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
        repeatedSamplesBecomeOneIncident: boolean;
        startupLagIsInformational: boolean;
        alertsCarryProcessEvidence: boolean;
        stoppedCleanRunCannotPass: boolean;
    };
};
