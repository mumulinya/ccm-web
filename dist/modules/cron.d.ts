import { type CollabCtx } from "./collaboration";
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
export declare function handleCronApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean;
