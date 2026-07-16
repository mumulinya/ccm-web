export declare const LIVE_PROVIDER_MEMORY_SOAK_RETENTION_SCHEMA = "ccm-live-provider-memory-soak-retention-v1";
export declare function buildLiveProviderMemorySoakRetentionInventory(options?: any): {
    schema: string;
    generatedAt: string;
    directories: {
        single: string;
        multi: string;
    };
    coordination: {
        schema: string;
        sharedReportSetLock: boolean;
        executeUsesSharedLock: boolean;
        coordinatedWriterKinds: string[];
        lockTargetChecksum: string;
    };
    policy: {
        graceHours: number;
        single: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
        multi: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
        fleet: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
        endurance: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
    };
    summary: {
        reportCount: number;
        singleReportCount: number;
        multiReportCount: number;
        fleetReportCount: number;
        enduranceReportCount: number;
        validCount: number;
        invalidCount: number;
        referencedSingleCount: number;
        referencedMultiCount: number;
        approvalReferencedEnduranceCount: number;
        approvalReferencedMultiCount: number;
        transitionReferencedEnduranceCount: number;
        transitionLedgerValid: boolean;
        transitionLedgerInvalidFailClosed: boolean;
        retainedApprovalCount: number;
        invalidApprovalCount: number;
        prunableCount: number;
        retentionExpiredCount: number;
        overflowCount: number;
        unexpectedEntryCount: number;
    };
    rows: {
        kind: any;
        file: any;
        name: any;
        reportChecksum: any;
        valid: boolean;
        checksumValid: boolean;
        generatedAt: any;
        ageHours: number;
        referenced: boolean;
        protectedBy: string;
        prunable: boolean;
        candidateReasons: any;
        issues: any;
    }[];
    prunableRows: {
        kind: any;
        file: any;
        name: any;
        reportChecksum: any;
        valid: boolean;
        checksumValid: boolean;
        generatedAt: any;
        ageHours: number;
        referenced: boolean;
        protectedBy: string;
        prunable: boolean;
        candidateReasons: any;
        issues: any;
    }[];
    unexpectedEntries: any[];
};
export declare function reconcileLiveProviderMemorySoakReports(options?: any): {
    dryRun: boolean;
    pruned: any[];
    skipped: any[];
    audit: {
        schema: string;
        at: string;
        dryRun: boolean;
        candidateCount: number;
        prunedCount: number;
        skippedCount: number;
        reportSetLockHeld: boolean;
        candidateChecksum: string;
        prunedChecksum: string;
    };
    schema: string;
    generatedAt: string;
    directories: {
        single: string;
        multi: string;
    };
    coordination: {
        schema: string;
        sharedReportSetLock: boolean;
        executeUsesSharedLock: boolean;
        coordinatedWriterKinds: string[];
        lockTargetChecksum: string;
    };
    policy: {
        graceHours: number;
        single: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
        multi: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
        fleet: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
        endurance: {
            retentionDays: number;
            maximumReports: number;
            minimumRetained: number;
            graceHours: number;
        };
    };
    summary: {
        reportCount: number;
        singleReportCount: number;
        multiReportCount: number;
        fleetReportCount: number;
        enduranceReportCount: number;
        validCount: number;
        invalidCount: number;
        referencedSingleCount: number;
        referencedMultiCount: number;
        approvalReferencedEnduranceCount: number;
        approvalReferencedMultiCount: number;
        transitionReferencedEnduranceCount: number;
        transitionLedgerValid: boolean;
        transitionLedgerInvalidFailClosed: boolean;
        retainedApprovalCount: number;
        invalidApprovalCount: number;
        prunableCount: number;
        retentionExpiredCount: number;
        overflowCount: number;
        unexpectedEntryCount: number;
    };
    rows: {
        kind: any;
        file: any;
        name: any;
        reportChecksum: any;
        valid: boolean;
        checksumValid: boolean;
        generatedAt: any;
        ageHours: number;
        referenced: boolean;
        protectedBy: string;
        prunable: boolean;
        candidateReasons: any;
        issues: any;
    }[];
    prunableRows: {
        kind: any;
        file: any;
        name: any;
        reportChecksum: any;
        valid: boolean;
        checksumValid: boolean;
        generatedAt: any;
        ageHours: number;
        referenced: boolean;
        protectedBy: string;
        prunable: boolean;
        candidateReasons: any;
        issues: any;
    }[];
    unexpectedEntries: any[];
};
