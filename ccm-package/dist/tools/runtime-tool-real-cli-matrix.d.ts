export declare function getRuntimeToolRealCliMatrixStatus(): any;
export declare function runRuntimeToolRealCliMatrix(options?: any): Promise<any>;
export declare function runRuntimeToolRealCliMatrixSelfTest(): {
    pass: boolean;
    checks: {
        subsetRunPreservesOtherRuntimeEvidence: boolean;
        latestRuntimeEvidenceWins: boolean;
        freshRunRemainsRunning: boolean;
        staleRunBecomesInterrupted: boolean;
        completionRequiresAllRuntimes: boolean;
    };
};
export declare function startRuntimeToolRealCliMatrix(options?: any): {
    accepted: boolean;
    reason: string;
    status: any;
} | {
    accepted: boolean;
    status: any;
    reason?: undefined;
};
export declare function startRuntimeToolRealCliMatrixScheduler(): {
    enabled: boolean;
    intervalMs?: undefined;
} | {
    enabled: boolean;
    intervalMs: number;
};
export declare function stopRuntimeToolRealCliMatrixScheduler(): void;
