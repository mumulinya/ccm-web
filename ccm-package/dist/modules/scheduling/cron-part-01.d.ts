export declare const runningCronJobs: Set<string>;
export declare let latestConflictResolutionMaintenanceTick: any;
export declare function readConflictResolutionMaintenanceSchedulerState(file?: string): {
    schema: string;
    version: number;
    groups: {};
    updated_at: string;
};
export declare function writeConflictResolutionMaintenanceSchedulerState(value: any, file?: string): void;
export declare function conflictResolutionMaintenanceSchedulerScopeIdentity(scopeId: any): {
    typedScopeId: string;
    rootGroupId: string;
    groupSessionId: string;
    exactSession: boolean;
};
export declare function deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId: string, groupSessionId: string, options?: any): any;
export declare function runConflictResolutionMemoryMaintenanceSchedulerTick(options?: any): any;
export declare function buildTaskFromCronJob(job: any, trigger: "manual" | "schedule" | "recovery" | "retry" | "resume"): {
    drafts: {
        title: string;
        description: string;
        target_project: string;
        group_id: any;
        assign_type: string;
        priority: any;
        auto_execute: boolean;
        workflow_type: string;
        requires_code_changes: boolean;
        requires_verification: boolean;
        business_goal: any;
        acceptance_criteria: any;
        source_documents: string;
        source_attachments: any;
        source_attachment_contexts: any;
        source_attachment_context: string;
        source_attachment_warnings: any[];
        workflow_meta: {
            intake: {
                backlog_file: any;
                claimed_by_cron_job_id: any;
                cron_trigger: "resume" | "manual" | "retry" | "recovery" | "schedule";
                claimed_at: string;
            };
            batch: {
                index: number;
                total: number;
            };
            cron: any;
        };
        cron_job_id: any;
        cron_trigger: "resume" | "manual" | "retry" | "recovery" | "schedule";
    }[];
    meta: any;
} | {
    drafts: {
        title: string;
        description: string;
        target_project: any;
        group_id: any;
        assign_type: string;
        priority: any;
        auto_execute: boolean;
        workflow_type: any;
        requires_code_changes: any;
        requires_verification: boolean;
        business_goal: string;
        acceptance_criteria: string;
        source_documents: string;
        source_attachments: any;
        source_attachment_contexts: any;
        source_attachment_context: string;
        source_attachment_warnings: any[];
        cron_job_id: any;
        cron_trigger: "resume" | "manual" | "retry" | "recovery" | "schedule";
    }[];
    meta: any;
};
export declare function runCronDailyDevProtocolSelfTest(): {
    pass: boolean;
    checks: {
        hasDraft: boolean;
        workflowDailyDev: boolean;
        targetCoordinatorGroup: boolean;
        requiresVerification: boolean;
        sourceDocumentsIncludePrompt: boolean;
        hasCronMeta: boolean;
    };
    source_documents_preview: string;
};
export declare function formatCronMetaSummary(meta?: any): string;
export declare function attachCronRunToTasks(taskIds: string[], cronJobId: string, cronRunId: string): void;
export declare function cronFriendlyText(value: any, fallback?: string, limit?: number): string;
export declare function taskTodoSummary(task: any): {
    total: any;
    completed: any;
    current: any;
    steps: any;
};
export declare function taskTestAgentSummary(task: any, artifactRuns: any[]): {
    status: string;
    recommendation: string;
    summary: string;
    run_count: number;
    evidence_count: number;
    screenshot_count: number;
    evidence_available: boolean;
};
export declare function synthesizedTaskTodo(task: any, testAgent: any): {
    total: number;
    completed: number;
    current: {
        id: string;
        label: string;
        status: string;
    };
    steps: {
        id: string;
        label: string;
        status: string;
    }[];
    synthesized: boolean;
};
export declare function publicCronTaskSummary(task: any, artifactRuns: any[]): {
    id: string;
    title: string;
    status: string;
    phase: string;
    status_detail: string;
    trace_id: string;
    group_id: string;
    todo: {
        total: any;
        completed: any;
        current: any;
        steps: any;
    };
    main_agent: {
        headline: string;
        summary: string;
        acceptance_passed: boolean;
    };
    test_agent: {
        status: string;
        recommendation: string;
        summary: string;
        run_count: number;
        evidence_count: number;
        screenshot_count: number;
        evidence_available: boolean;
    };
    replay_available: boolean;
};
export declare function publicCronJobs(rawJobs: any[]): any[];
export declare const CRON_RUN_ACTIVE_STATUSES: Set<string>;
export declare function cronRetryPatch(job: any, run: any, now?: Date): {
    next_retry_at: any;
    retry_reason?: undefined;
} | {
    next_retry_at: string;
    retry_reason: string;
};
export declare function notifyCronRun(jobId: string, runId: string, event: string): void;
export declare function scheduleFailedCronRunRetry(job: any, run: any, now?: Date): any;
export declare function cancelCronRun(jobId: string, runId: string, reason?: string): {
    success: boolean;
    run: any;
    results: ({
        task_id: any;
        skipped: boolean;
        cancelled?: undefined;
    } | {
        task_id: any;
        cancelled: boolean;
        skipped?: undefined;
    })[];
};
