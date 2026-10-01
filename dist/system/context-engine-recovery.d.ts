export declare function createContextEngineRecoveryPoint(input: any): any;
export declare function listContextEngineRecoveryPoints(input: any): any[];
export declare function drillContextEngineRecoveryPoint(input: any): {
    passed: boolean;
    checksumMatched: boolean;
    sizeMatched: boolean;
    canonicalUntouched: boolean;
    drilledAt: string;
    contentStored: boolean;
    scope: string;
    scopeId: string;
    sessionId: string;
    schema: string;
    version: number;
    recoveryId: string;
};
export declare function restoreContextEngineRecoveryPoint(input: any): {
    restoredChecksum: string;
    beforeRestoreRecoveryId: any;
    restoredAt: string;
    contentStored: boolean;
    scope: string;
    scopeId: string;
    sessionId: string;
    schema: string;
    restored: boolean;
    recoveryId: string;
};
export declare function registerContextEngineRecoveryHook(): void;
export declare function runContextEngineRecoverySelfTest(): {
    pass: boolean;
    checks: {
        pathContainment: boolean;
        contentStored: boolean;
    };
};
