import { type CollabCtx } from "../collaboration/collaboration";
export declare function runConflictResolutionMemoryMaintenanceSchedulerTick(options?: any): {
    schema: string;
    at: string;
    groupCount: number;
    completedCount: number;
    notDueCount: number;
    duplicateSuppressedCount: number;
    backoffCount: number;
    failedCount: number;
    destructiveActionAuthorized: boolean;
    deletedCount: number;
    createdTaskCount: number;
    createdApprovalReceiptCount: number;
    deliveryRetentionCount: number;
    deliveryRetentionBlockedCount: number;
    deliveryRecoveryCount: number;
    deliveryRecoveryBlockedCount: number;
    deliveryOrphanCandidateCount: any;
    deliveryQuarantineRetentionCount: number;
    deliveryQuarantineRetentionBlockedCount: number;
    rows: any[];
    stateFile: string;
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
export declare function syncCronTaskStatus(task: any, status: string, result?: string): void;
export declare function startCronScheduler(ctx: CollabCtx): void;
export declare function stopCronScheduler(): void;
export declare function getConflictResolutionMemoryMaintenanceSchedulerStatus(): {
    schema: string;
    activeWithCronScheduler: boolean;
    safe: any;
    latest: any;
    policy: string;
};
export declare function handleCronApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
