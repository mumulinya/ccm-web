export type GlobalMissionSupervisorStatus = "monitoring" | "paused" | "waiting_user" | "completed" | "failed" | "cancelled" | "manual_takeover";
export interface GlobalMissionSupervisorRecord {
    version: 1;
    id: string;
    mission_id: string;
    global_run_id: string;
    trace_id: string;
    session_id: string;
    source: string;
    business_goal: string;
    acceptance: string;
    status: GlobalMissionSupervisorStatus;
    phase: string;
    cycle_count: number;
    max_attempts: number;
    poll_interval_ms: number;
    next_check_at: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    last_checked_at?: string;
    last_progress_at?: string;
    last_snapshot?: any;
    actions: any[];
    incidents: any[];
    last_continuation?: any;
    final_report?: any;
    final_notification_sent_at?: string;
    error?: string;
}
export interface GlobalMissionSupervisorRuntime {
    inspectMission: (missionId: string) => Promise<any> | any;
    advanceMission: (missionId: string, options: any) => Promise<any> | any;
    controlMission: (missionId: string, operation: string, payload: any) => Promise<any> | any;
    onCompleted?: (record: GlobalMissionSupervisorRecord, report: any) => Promise<void> | void;
    onProgress?: (record: GlobalMissionSupervisorRecord, event: any) => Promise<void> | void;
    onTerminal?: (record: GlobalMissionSupervisorRecord, outcome: "failed" | "cancelled", report: any) => Promise<void> | void;
    now?: () => number;
}
export declare function buildGlobalMissionFinalReport(snapshot: any): {
    status: string;
    completed: boolean;
    summary: string;
    completed_content: any;
    files_modified: any[];
    verification_results: any[];
    merge_commits: any[];
    risks: any[];
    remaining_items: any[];
    acceptance_gate_passed: boolean;
    generated_at: string;
};
export declare function formatGlobalMissionFinalReport(report: any): string;
export declare function getGlobalMissionSupervisor(id: string): GlobalMissionSupervisorRecord;
export declare function listGlobalMissionSupervisors(options?: {
    status?: string;
    limit?: number;
}): GlobalMissionSupervisorRecord[];
export declare function startGlobalMissionSupervisor(input: any): GlobalMissionSupervisorRecord;
export declare function checkGlobalMissionSupervisorNow(id: string, runtime: GlobalMissionSupervisorRuntime): Promise<GlobalMissionSupervisorRecord>;
export declare function controlGlobalMissionSupervisor(id: string, operation: string, runtime: GlobalMissionSupervisorRuntime, payload?: any): Promise<any>;
export declare function startGlobalMissionSupervisorScheduler(runtime: GlobalMissionSupervisorRuntime, intervalMs?: number): {
    started: boolean;
    active: boolean;
    resumed?: undefined;
} | {
    started: boolean;
    active: boolean;
    resumed: number;
};
export declare function stopGlobalMissionSupervisorScheduler(): void;
export declare function getGlobalMissionSupervisorSchedulerStatus(): {
    active: boolean;
    monitoring: number;
    waiting_user: number;
    paused: number;
    active_checks: string[];
};
export declare function runGlobalMissionSupervisorSelfTest(): {
    pass: boolean;
    checks: {
        completedOnlyWithGate: boolean;
        fixedFilesSection: boolean;
        fixedVerificationSection: boolean;
        mergeTracked: boolean;
        noFalseCompletion: boolean;
    };
    report: {
        status: string;
        completed: boolean;
        summary: string;
        completed_content: any;
        files_modified: any[];
        verification_results: any[];
        merge_commits: any[];
        risks: any[];
        remaining_items: any[];
        acceptance_gate_passed: boolean;
        generated_at: string;
    };
};
export declare function runGlobalMissionSupervisorAsyncSelfTest(): Promise<{
    pass: boolean;
    checks: {
        asyncRecoveryActionPersisted: boolean;
        restartReloadKeepsIdentity: boolean;
        pauseWorks: boolean;
        resumeWorks: boolean;
        finalGateCompletes: boolean;
        fixedFinalReport: any;
        completionNotifiedOnce: boolean;
    };
    supervisor_id: string;
    final_report: any;
}>;
