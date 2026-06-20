export declare function loadGroups(): any[];
export declare const FEISHU_SCOPES: string[];
export declare function buildEvidenceGateFollowUps(group: any, outputs: string[]): any[];
export declare function createAndQueueTask(task: any, ctx: CollabCtx): {
    task: {
        id: string;
        title: any;
        description: any;
        target_project: any;
        group_id: any;
        assign_type: any;
        status: string;
        priority: any;
        auto_execute: boolean;
        workflow_type: any;
        business_goal: any;
        acceptance_criteria: any;
        source_documents: any;
        requires_code_changes: any;
        requires_verification: any;
        workflow_meta: any;
        followups: any;
        cron_job_id: any;
        cron_trigger: any;
        created_at: string;
        updated_at: string;
    };
    queueResult: {
        queued: boolean;
        message: string;
        blocked?: undefined;
        reason?: undefined;
        readiness?: undefined;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        blocked: boolean;
        reason: string;
        message: any;
        readiness: any;
        targetKey?: undefined;
        position?: undefined;
    } | {
        queued: boolean;
        message: string;
        targetKey: string;
        position: number;
        blocked?: undefined;
        reason?: undefined;
        readiness?: undefined;
    };
};
export declare function resumeTaskQueues(ctx: CollabCtx): {
    resumed: number;
    total: number;
    results: any[];
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
export declare function runTaskWatchdog(ctx: CollabCtx, options?: any): {
    success: boolean;
    recovered: number;
    total_recoverable: number;
    stale_recovered: number;
    stale_recoverable: number;
    blocked_recovery: any;
    runtime_failed_total: number;
    runtime_retried: any;
    runtime_queued: any;
    gap_rework_total: number;
    gap_continued: number;
    gap_queued: number;
    gap_results: any[];
    gap_continue_skipped_reason: string;
    runtime_retry: any;
    runtime_retry_skipped_reason: string;
    execution_readiness: {
        ready: boolean;
        mode: string;
        message: string;
        fix_actions: string[];
        childProcess: {
            ok: boolean;
            status: number;
            stdout: string;
            stderr: string;
            error: string;
        } | {
            ok: boolean;
            status: any;
            stdout: string;
            stderr: string;
            error: any;
        };
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
        childProcess: {
            ok: boolean;
            status: number;
            stdout: string;
            stderr: string;
            error: string;
        } | {
            ok: boolean;
            status: any;
            stdout: string;
            stderr: string;
            error: any;
        };
        probe: any;
        probeHealth: {
            status: string;
            successFresh: boolean;
            failureRecent: boolean;
            message: any;
        };
        externalRunner?: undefined;
    };
    daily_dev_execution_readiness: {
        ready: boolean;
        mode: string;
        message: string;
        fix_actions: string[];
        childProcess: {
            ok: boolean;
            status: number;
            stdout: string;
            stderr: string;
            error: string;
        } | {
            ok: boolean;
            status: any;
            stdout: string;
            stderr: string;
            error: any;
        };
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
        childProcess: {
            ok: boolean;
            status: number;
            stdout: string;
            stderr: string;
            error: string;
        } | {
            ok: boolean;
            status: any;
            stdout: string;
            stderr: string;
            error: any;
        };
        probe: any;
        probeHealth: {
            status: string;
            successFresh: boolean;
            failureRecent: boolean;
            message: any;
        };
        externalRunner?: undefined;
    };
    results: any[];
    status: {
        stale_ms: number;
        checked_at: string;
        stale_pending: any[];
        stalled_in_progress: any[];
        running_long: any[];
        runtime_failed: any[];
        gap_rework: any[];
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
};
export declare function runAgentRecoveryMonitorOnce(ctx: CollabCtx, options?: any): Promise<{
    success: boolean;
    skipped: boolean;
    reason: string;
    work: {
        blocked_pending: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            blocked_at: any;
            status_detail: string;
        }[];
        runtime_failed: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            retry_count: number;
            reason: string;
        }[];
        total: number;
    };
}> | Promise<{
    success: boolean;
    skipped: boolean;
    work: {
        blocked_pending: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            blocked_at: any;
            status_detail: string;
        }[];
        runtime_failed: {
            id: any;
            title: any;
            status: any;
            target_key: string;
            retry_count: number;
            reason: string;
        }[];
        total: number;
    };
    probe_groups: any[];
    target_results: any[];
    failures: any[];
    message: any;
    probe: any;
    blocked_recovery: {
        total_blocked: any;
        recovered: any;
        results: any[];
    };
    runtime_recovery: {
        success: boolean;
        total_recoverable: any;
        retried: any;
        queued: any;
        auto_execute: boolean;
        results: any[];
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
}>;
export declare function startAgentRecoveryMonitor(ctx: CollabCtx): void;
export declare function stopAgentRecoveryMonitor(): void;
export declare function startTaskWatchdog(ctx: CollabCtx): void;
export declare function stopTaskWatchdog(): void;
export interface CollabCtx {
    PORT: number;
    callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => Promise<string>;
    callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
    setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any, durationMs?: number) => void;
    broadcastPetSpeech: (agent: string, payload: any) => void;
    createFileChangeSnapshot: (workDir: string) => any;
    getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
    recordMetric: (agent: string, data: any) => void;
    toolManager: any;
    buildUploadedFilesContext: (files: any[], title?: string) => string;
    summarizeUploadedFiles: (files: any[]) => string;
    buildFilesContext: (files: any[], title?: string) => string;
    collectRequestBuffer: (req: any) => Promise<Buffer>;
    getMultipartBoundary: (contentType: string) => string;
    parseMultipart: (buffer: Buffer, boundary: string) => any;
    getSharedFilePath: (name: string) => string;
    createSharedFileRecord: (name: string, source?: string) => any;
    normalizeSharedFileList: (files: any[]) => any[];
    onTaskStatusChange?: (task: any, status: string, result?: string) => void | Promise<void>;
}
export declare function runCollaborationProtocolSelfTest(): {
    pass: boolean;
    reworkProtocol: {
        pass: boolean;
        checks: {
            hasReworkPacket: boolean;
            hasRound: boolean;
            hasContinuationSemantics: boolean;
            hasScratchpadContext: boolean;
            hasOriginalRequirement: boolean;
            hasCoordinatorPlan: boolean;
            hasReason: boolean;
            hasVerification: boolean;
            hasReceipt: boolean;
        };
    };
    taskDocumentContextPreview: string;
    taskDocumentChecks: {
        hasBusinessGoal: boolean;
        hasAcceptance: boolean;
        hasSourceDocument: boolean;
        mergeKeepsTaskDocument: boolean;
    };
    structuredAssignmentChecks: {
        hasTwoMentions: boolean;
        preservesTarget: boolean;
        preservesTask: boolean;
        preservesDependency: boolean;
        preservesContinuation: boolean;
    };
    executionFixChecks: {
        hasCliCheck: boolean;
        hasApiNetworkHint: boolean;
        hasRetryAction: boolean;
    };
    executionFixActions: string[];
    probeHealthChecks: {
        recentFailureBlocks: boolean;
        freshSuccessPasses: boolean;
        probeCanRetryAfterRecentFailure: boolean;
        probeFailureKeepsRunnerError: boolean;
        freshProbeEnablesImmediateRecovery: boolean;
        staleProbeDoesNotEnableImmediateRecovery: boolean;
        dailyDevRequiresFreshProbe: boolean;
        dailyDevWatchdogGapsRequireFreshProbe: boolean;
        dailyDevFreshProbePasses: boolean;
        dailyDevFreshProbeMustMatchTarget: boolean;
        groupProbeRequiresAllMembers: boolean;
        groupProbeAllMembersPass: boolean;
        explicitProjectBypassesGroupWideProbe: boolean;
        targetProbeKeysAreIsolated: boolean;
        targetProbePartialMatchWorks: boolean;
        recoveryProbeGroupsAreTargeted: boolean;
        recoveryProbePayloadKeepsTarget: boolean;
        recoveryTargetMatchWorks: boolean;
        generalTaskDoesNotRequireProbe: boolean;
    };
    taskNotificationChecks: {
        hasXmlEnvelope: boolean;
        hasTaskId: boolean;
        hasCompletedStatus: boolean;
        detectsMissingReceipt: boolean;
    };
    dependencyGateChecks: {
        doneDependencyPasses: boolean;
        blockedDependencyStopsDownstream: boolean;
        blockedDependencyExplainsReason: boolean;
    };
    notificationDeliveryChecks: {
        summaryHasWorkerNotification: boolean;
        summaryKeepsNotificationTaskId: boolean;
        summaryUsesNotificationAgent: any;
        userReportMentionsNotification: boolean;
    };
    continuationGapChecks: {
        workerNotificationTriggersGap: any;
        draftIncludesWorkerNotification: boolean;
        draftIncludesSameWorkerStrategy: boolean;
        missingCoordinationTriggersGap: any;
        draftIncludesCoordinationEvidenceGap: boolean;
    };
    scratchpadChecks: {
        storesWorkerLedger: boolean;
        contextIncludesScratchpad: boolean;
        contextIncludesWorkerSummary: boolean;
    };
};
export declare function importSharedDocsToDailyDevBacklog(options?: any): {
    success: boolean;
    imported: number;
    skipped: number;
    items: any[];
    skipped_items: any[];
    counts: any;
};
export declare function claimReadyDailyDevBacklog(groupId: string, claim?: any): {
    title: string;
    business_goal: string;
    scope: string;
    documents: string;
    acceptance: string;
    constraints: string;
    priority: string;
    requires_code_changes: boolean;
    backlog_file: any;
};
export declare function markDailyDevBacklogStatus(groupId: string, fileName: string, status: string, meta?: any): any;
export declare function continueDailyDevTasksFromGaps(ctx: CollabCtx, options?: any): {
    success: boolean;
    total_candidates: number;
    continued: number;
    queued: number;
    blocked: number;
    failed: number;
    limit: number;
    max_per_task: number;
    results: ({
        task: any;
        continuation_message: string;
        success: boolean;
        status: number;
        error: string;
        message?: undefined;
        queued?: undefined;
        queue_result?: undefined;
        queue_status?: undefined;
        task_id: any;
        title: any;
        group_id: any;
    } | {
        task: any;
        continuation_message: string;
        success: boolean;
        message: string;
        queued: boolean;
        queue_result: any;
        queue_status: {
            total_queued: number;
            running_targets: number;
            target_status: any;
            pending_tasks: number;
            in_progress_tasks: number;
            failed_tasks: number;
            running_task_ids: string[];
        };
        status?: undefined;
        error?: undefined;
        task_id: any;
        title: any;
        group_id: any;
    })[];
};
export declare function handleCollaborationApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
