export declare function inspectGroupSessionRetentionMaintenanceLease(options?: any): {
    file: string;
    present: boolean;
    valid: boolean;
    active: boolean;
    abandoned: boolean;
    lease: any;
    checksumValid?: undefined;
    ownerAlive?: undefined;
    unexpired?: undefined;
} | {
    file: string;
    present: boolean;
    valid: boolean;
    checksumValid: boolean;
    ownerAlive: boolean;
    unexpired: boolean;
    active: boolean;
    abandoned: boolean;
    lease: any;
};
export declare function acquireGroupSessionRetentionMaintenanceLease(options?: any): {
    acquired: boolean;
    reason: string;
    status: {
        file: string;
        present: boolean;
        valid: boolean;
        active: boolean;
        abandoned: boolean;
        lease: any;
        checksumValid?: undefined;
        ownerAlive?: undefined;
        unexpired?: undefined;
    } | {
        file: string;
        present: boolean;
        valid: boolean;
        checksumValid: boolean;
        ownerAlive: boolean;
        unexpired: boolean;
        active: boolean;
        abandoned: boolean;
        lease: any;
    };
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    recovered: boolean;
    handle: any;
    lease: any;
    reason?: undefined;
    status?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    reason: string;
    error: string;
    status?: undefined;
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
} | {
    acquired: boolean;
    reason: string;
    status?: undefined;
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
    error?: undefined;
};
export declare function renewGroupSessionRetentionMaintenanceLease(handle: any): boolean;
export declare function releaseGroupSessionRetentionMaintenanceLease(handle: any, finalStatus?: string): boolean;
export declare function readGroupSessionRetentionMaintenanceStatus(): any;
export declare function purgeLegacyDefaultGroupSessions(options?: any): {
    schema: string;
    generatedAt: string;
    groupCount: number;
    purgedCount: number;
    failedCount: number;
    migrationPerformed: boolean;
    policy: string;
    rows: any[];
};
export declare function runGroupSessionRetentionMaintenance(options?: any): any;
export declare function startGroupSessionRetentionMaintenanceScheduler(): {
    started: boolean;
    enabled: boolean;
    legacyPurge: {
        schema: string;
        generatedAt: string;
        groupCount: number;
        purgedCount: number;
        failedCount: number;
        migrationPerformed: boolean;
        policy: string;
        rows: any[];
    };
    intervalMs?: undefined;
} | {
    started: boolean;
    enabled: boolean;
    intervalMs: number;
    legacyPurge: {
        schema: string;
        generatedAt: string;
        groupCount: number;
        purgedCount: number;
        failedCount: number;
        migrationPerformed: boolean;
        policy: string;
        rows: any[];
    };
};
export declare function stopGroupSessionRetentionMaintenanceScheduler(): void;
export declare function runGroupSessionRetentionMaintenanceSelfTest(): {
    pass: boolean;
    checks: {
        enabledRunCoversAllGroups: boolean;
        enabledRunDeletesArtifacts: boolean;
        statusCarriesNextRun: boolean;
        disabledRunIsFailClosed: boolean;
        firstLeaseAcquires: boolean;
        competingLeaseIsRejected: boolean;
        expiredLeaseIsRecovered: boolean;
        fencingTokenAdvancesOnRecovery: boolean;
    };
    result: any;
    disabled: any;
};
