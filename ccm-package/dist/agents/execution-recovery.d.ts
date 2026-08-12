export declare function createExecutionRecoveryManifest(checkpoint: any, execution?: any): {
    schema: string;
    id: string;
    checkpointId: any;
    executionId: any;
    taskId: any;
    project: string;
    generation: number;
    attempt: number;
    authoritativeRepoRoot: string;
    sourceWorktree: string;
    sourceMode: string;
    baselineCommit: string;
    baselineRef: string;
    deliveryCommit: string;
    deliveryRef: string;
    mergeCommit: string;
    changedFiles: any[];
    createdAt: string;
    finalizedAt: string;
    recoveries: any[];
    contentStored: boolean;
};
export declare function finalizeExecutionRecoveryManifest(checkpointId: string, input?: {
    workDir?: string;
    deliveryCommit?: string;
    mergeCommit?: string;
}): any;
export declare function finalizeExecutionRecoveryManifests(execution: any, input?: {
    workDir?: string;
    deliveryCommit?: string;
    mergeCommit?: string;
}): any[];
export declare function readExecutionRecoveryManifest(checkpointId: string): any;
export declare function listExecutionRecoveryManifests(filters?: {
    taskIds?: string[];
    executionIds?: string[];
}): any[];
export declare function previewExecutionRecovery(checkpointId: string, options?: {
    paths?: string[];
}): {
    checkpointId: string;
    available: boolean;
    reason: string;
    conflicts: any[];
    files: any[];
    schema?: undefined;
    executionId?: undefined;
    taskId?: undefined;
    project?: undefined;
    canExecute?: undefined;
    protectedFileCount?: undefined;
    currentHead?: undefined;
    previewToken?: undefined;
    contentStored?: undefined;
} | {
    schema: string;
    checkpointId: string;
    executionId: any;
    taskId: any;
    project: any;
    available: boolean;
    canExecute: boolean;
    conflicts: any[];
    files: {
        path: string;
        action: string;
        conflict: boolean;
    }[];
    protectedFileCount: any;
    currentHead: string;
    previewToken: string;
    contentStored: boolean;
    reason?: undefined;
};
export declare function applyExecutionRecovery(checkpointId: string, options?: {
    paths?: string[];
    previewToken?: string;
    reason?: string;
}): {
    success: boolean;
    duplicate: boolean;
    checkpointId: string;
    restoredFiles: number;
    contentStored: boolean;
    executionId?: undefined;
    taskId?: undefined;
    recoveryCommit?: undefined;
    restoredAt?: undefined;
} | {
    success: boolean;
    checkpointId: string;
    executionId: any;
    taskId: any;
    recoveryCommit: string;
    restoredFiles: number;
    restoredAt: string;
    contentStored: boolean;
    duplicate?: undefined;
};
export declare function compensateExecutionRecovery(checkpointId: string, recoveryCommit: string, reason?: string): {
    success: boolean;
    checkpointId: string;
    recoveryCommit: string;
    compensationCommit: string;
    compensatedAt: string;
    contentStored: boolean;
};
export declare function purgeExecutionRecoveryManifests(taskId: string): number;
export declare function runExecutionRecoverySelfTest(): {
    pass: boolean;
    checks: {
        availableAfterWorktreeCleanup: boolean;
        conflictingLaterChangeBlocksWithoutWriting: boolean;
        restoresTrackedFile: boolean;
        removesCreatedFile: boolean;
        preservesUnrelatedLaterFile: boolean;
        createsRecoveryCommit: boolean;
    };
};
