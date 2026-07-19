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
