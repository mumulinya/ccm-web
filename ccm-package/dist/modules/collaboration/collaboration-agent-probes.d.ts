export declare function hasFreshSuccessfulAgentProbe(readiness: any): boolean;
export declare function taskMatchesAgentProbeTarget(task: any, target?: any): any;
export declare function getAgentProbeTargetStatusKey(target: any): string;
export declare function readAgentProbeStatus(requiredTarget?: any): any;
export declare function getAgentProbeHealth(probe: any): {
    status: string;
    successFresh: boolean;
    failureRecent: boolean;
    message: any;
};
export declare function getAgentProbeOutputFailure(output: any): {
    message: string;
    error: string;
};
export declare function getAgentExecutionReadiness(probeTarget?: any): {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    childProcess: any;
    externalRunner: {
        active: boolean;
        status: any;
        detail: any;
        pid: number;
        process_alive: boolean;
        updated_at: any;
        age_ms: number;
        pending_requests: number;
        requests: number;
        results: number;
        last_result: any;
    };
    probe: any;
    probeHealth: {
        status: string;
        successFresh: boolean;
        failureRecent: boolean;
        message: any;
    };
} | {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: any[];
    childProcess: any;
    probe: any;
    probeHealth: {
        status: string;
        successFresh: boolean;
        failureRecent: boolean;
        message: any;
    };
    externalRunner?: undefined;
};
export declare function enforceAgentProbeExecutionReadiness(capability?: any): {
    childProcess: any;
    externalRunner: any;
    probe: any;
    probeHealth: any;
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    gateway: {
        baseUrl: string;
        host: string;
        port: number;
        ok: boolean;
        error: any;
    };
} | {
    ready: boolean;
    mode: string;
    message: string;
    fix_actions: string[];
    childProcess: any;
    externalRunner: any;
    probe: any;
    probeHealth: any;
};
export declare function taskNeedsGroupWideAgentProbe(task: any): boolean;
export declare function summarizeAgentProbeTargets(targets: any[], probeResolver?: any): {
    total: number;
    ready: number;
    missing: number;
    stale: number;
    failed_recent: number;
    allReady: boolean;
    rows: any[];
};
export declare function enforceTaskAgentProbeReadiness(task: any, readiness: any): any;
export declare function getTaskAgentExecutionReadiness(task: any): any;
export declare function buildDailyDevAgentDiagnostics(): {
    success: boolean;
    generated_at: string;
    readiness: string;
    ready: boolean;
    summary: string;
    counts: {
        checks: number;
        ok: number;
        warn: number;
        fail: number;
        groups: number;
        readyGroups: number;
        projectConfigs: number;
        cronJobs: number;
        enabledCronJobs: number;
        autoTasks: number;
    };
    autopilot: {
        mode: string;
        ready: boolean;
        headline: string;
        counts: {
            executableGroups: number;
            readyBacklogs: number;
            sharedFiles: number;
            continuationGaps: number;
            dailyDevCronJobs: number;
            queuedTasks: number;
            recoveryWork: number;
            verificationConfigured: number;
            verificationInferred: number;
            verificationMissing: number;
            agentProbeReady: number;
            agentProbeExecutable: number;
        };
        next_actions: string[];
        recent_cron: {
            id: any;
            name: any;
            last_status: any;
            last_result: any;
            last_run: any;
            last_run_meta: any;
        }[];
    };
    agent_probe_matrix: {
        total: number;
        executable: number;
        ready: number;
        blocked: number;
        missing: number;
        stale: number;
        failed_recent: number;
        group_total: number;
        group_ready: number;
        groups: {
            group_id: any;
            group_name: any;
            orchestratorEnabled: boolean;
            executable: any;
            ready: any;
            missing: any;
            stale: any;
            failed_recent: any;
            all_ready: any;
            targets: any;
        }[];
        targets: any[];
    };
    checks: any[];
    groups: {
        id: any;
        name: any;
        orchestratorEnabled: boolean;
        coordinator: any;
        sharedFiles: any;
        backlogFiles: any;
        readyBacklogs: number;
        backlogCounts: any;
        memberCount: any;
        readyMemberCount: any;
        members: any;
    }[];
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
