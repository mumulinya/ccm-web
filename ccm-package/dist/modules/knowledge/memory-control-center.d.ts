export type MemoryScope = "group" | "project" | "global";
type MemoryAction = "pin" | "unpin" | "lock" | "unlock" | "edit" | "deprecate" | "delete" | "restore";
export declare function getMemoryItemId(itemType: string, item: any, index?: number): string;
export declare function applyMemoryControls(scope: MemoryScope, scopeId: string, source: any): any;
export declare function updateMemoryControl(input: {
    scope: MemoryScope;
    scopeId: string;
    itemType: string;
    itemId: string;
    action: MemoryAction;
    text?: string;
    reason?: string;
    actor?: string;
}): {
    control: any;
    audit: any;
};
export declare function getMemoryMetrics(): any;
export declare function recordMemoryMetric(type: string, payload?: any): any;
export declare function runMemoryAcceptanceSnapshot(): {
    id: string;
    at: string;
    dataset: {
        scopes: number;
        groupMessages: any;
        recallChecks: number;
        memoryChecks: number;
        dispatches: number;
        recoveryAttempts: number;
        projectIntegrityChecks: number;
    };
    counts: {
        recallHits: number;
        forgettingFailures: number;
        misdispatchSignals: number;
        recoverySuccesses: number;
        projectIntegrityPasses: number;
    };
    rates: {
        recallRate: number;
        forgettingRate: number;
        misdispatchRate: number;
        recoverySuccessRate: number;
        projectIntegrityRate: number;
    };
    scopes: any[];
};
export declare function buildMemoryQualityReport(options?: any): any;
export declare function buildMemoryCenterOverview(): {
    generatedAt: string;
    groups: {
        scope: MemoryScope;
        id: string;
        label: string;
        health: string;
        alerts: number;
        pinned: any;
        edited: any;
        deprecated: any;
        tokenPressure: number;
        preCompactPressure: number;
        beforeTokens: number;
        afterTokens: number;
        updatedAt: any;
    }[];
    projects: {
        scope: MemoryScope;
        id: string;
        label: string;
        health: string;
        alerts: number;
        pinned: any;
        edited: any;
        deprecated: any;
        tokenPressure: number;
        preCompactPressure: number;
        beforeTokens: number;
        afterTokens: number;
        updatedAt: any;
    }[];
    globals: {
        scope: MemoryScope;
        id: string;
        label: string;
        health: string;
        alerts: number;
        pinned: any;
        edited: any;
        deprecated: any;
        tokenPressure: number;
        preCompactPressure: number;
        beforeTokens: number;
        afterTokens: number;
        updatedAt: any;
    }[];
    alerts: any[];
    totals: {
        scopes: number;
        healthy: number;
        alerts: number;
    };
    metrics: any;
};
export declare function getMemoryCenterScope(scope: MemoryScope, scopeId: string): {
    scope: MemoryScope;
    id: string;
    file: string;
    backupExists: boolean;
    policy: any;
    summary: {
        scope: MemoryScope;
        id: string;
        label: string;
        health: string;
        alerts: number;
        pinned: any;
        edited: any;
        deprecated: any;
        tokenPressure: number;
        preCompactPressure: number;
        beforeTokens: number;
        afterTokens: number;
        updatedAt: any;
    };
    alerts: any[];
    memory: any;
    rawMemory: any;
    itemGroups: any[];
};
export declare function listMemoryAudit(limit?: number, filters?: any): any[];
export declare function findMemoryEvidence(input: {
    scope?: string;
    groupId?: string;
    messageId?: string;
    taskId?: string;
    sessionId?: string;
    missionId?: string;
}): any;
export declare function rollbackMemory(scope: MemoryScope, scopeId: string, reason: string, actor?: string): {
    restored: boolean;
    snapshot: string;
    audit: any;
    memory: any;
};
export declare function recordMemoryOperation(input: any): any;
export declare function runGlobalMemoryControlSelfTest(): {
    pass: boolean;
    checks: {
        globalScopePins: boolean;
        globalScopeEdits: boolean;
        globalScopeDeletes: boolean;
        globalScopeRestores: boolean;
        operationsAreAudited: boolean;
    };
};
export declare function handleMemoryCenterApi(pathname: string, req: any, res: any, parsed: any): boolean;
export {};
