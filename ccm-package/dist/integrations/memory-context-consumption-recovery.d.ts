export declare const MEMORY_CONTEXT_CONSUMPTION_RECOVERY_SCHEMA = "ccm-memory-context-consumption-recovery-v1";
export declare const MEMORY_CONTEXT_CONSUMPTION_RECOVERY_FAILPOINTS: readonly ["after_running_before_provider", "after_provider_before_receipt_verify", "after_receipt_verify_before_recovery_commit", "after_recovery_commit_before_return"];
export declare function verifyMemoryContextConsumptionRecovery(record: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function recoverMemoryContextConsumptionReceipt(input: any, executeContinuation: (request: any) => Promise<any>): Promise<{
    recovered: boolean;
    receipt: any;
    record: any;
}>;
export declare function memoryContextConsumptionRecoveryDirectory(): string;
export declare function removeMemoryContextConsumptionRecoveryIfUnreferenced(challengeId: any, options?: any): {
    removed: boolean;
    reason: any;
    challengeId: string;
    file: string;
};
export declare function reconcileMemoryContextConsumptionRecoveries(options?: any): {
    schema: string;
    generatedAt: string;
    directory: string;
    policy: {
        retentionDays: number;
        interruptedAfterMinutes: number;
        graceHours: number;
        maxOrphanRecoveries: number;
    };
    prune: boolean;
    reconcileInterrupted: boolean;
    pruningBlocked: boolean;
    summary: {
        count: number;
        recoveredCount: number;
        blockedCount: number;
        runningCount: number;
        invalidCount: number;
        replaySuppressedCount: number;
        referencedCount: number;
        orphanCount: number;
        staleOrphanCount: number;
        overflowOrphanCount: number;
        interruptedCount: number;
        interruptedCandidateCount: number;
        interruptedReceiptUncommittedCount: number;
        prunableCount: number;
        prunedCount: number;
        skippedCount: number;
        unexpectedFileCount: number;
    };
    rows: any[];
    prunableRows: any[];
    pruned: any[];
    skipped: any[];
    unexpectedFiles: string[];
};
export declare function buildMemoryContextConsumptionRecoveryInventory(options?: any): {
    schema: string;
    generatedAt: string;
    directory: string;
    policy: {
        retentionDays: number;
        interruptedAfterMinutes: number;
        graceHours: number;
        maxOrphanRecoveries: number;
    };
    prune: boolean;
    reconcileInterrupted: boolean;
    pruningBlocked: boolean;
    summary: {
        count: number;
        recoveredCount: number;
        blockedCount: number;
        runningCount: number;
        invalidCount: number;
        replaySuppressedCount: number;
        referencedCount: number;
        orphanCount: number;
        staleOrphanCount: number;
        overflowOrphanCount: number;
        interruptedCount: number;
        interruptedCandidateCount: number;
        interruptedReceiptUncommittedCount: number;
        prunableCount: number;
        prunedCount: number;
        skippedCount: number;
        unexpectedFileCount: number;
    };
    rows: any[];
    prunableRows: any[];
    pruned: any[];
    skipped: any[];
    unexpectedFiles: string[];
};
