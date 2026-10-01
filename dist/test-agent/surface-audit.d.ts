export declare const TEST_AGENT_SURFACE_AUDIT_SCHEMA: "ccm-test-agent-surface-audit-v1";
export declare function surfaceAuditChecksum(value: any): string;
export type TestAgentSurfaceSnapshot = {
    status: "available" | "unavailable";
    gitHead: string;
    files: Array<{
        path: string;
        state: string;
    }>;
    checksum: string;
    capturedAt: string;
};
export declare function captureTestAgentSurfaceSnapshot(workDir: string, options?: {
    ignoredPrefixes?: string[];
    baselineRef?: string;
}): TestAgentSurfaceSnapshot;
export type TestAgentSurfaceAuditReceipt = {
    schema: typeof TEST_AGENT_SURFACE_AUDIT_SCHEMA;
    status: "passed" | "blocked" | "warn" | "unavailable";
    workDir: string;
    capturedAt: string;
    declaredFiles: string[];
    actualFiles: Array<{
        path: string;
        state: string;
    }>;
    undeclaredChanges: string[];
    missingDeclaredChanges: string[];
    criteria: Array<{
        criterionId: string;
        criterionChecksum: string;
        checkIds: string[];
        fileRefs: string[];
        status: "covered" | "uncovered" | "waived";
        reason?: string;
    }>;
    exemptions: Array<{
        criterionId: string;
        reasonChecksum: string;
    }>;
    actualChangeCount: number;
    undeclaredChangeCount: number;
    criterionUncoveredCount: number;
    checksum: string;
    canAccept: boolean;
    contentStored: false;
};
export declare function auditTestAgentSurface(input: {
    workDir: string;
    declaredFiles?: string[];
    acceptanceCriteria?: any[];
    criterionBindings?: any[];
    checkDefinitions?: any[];
    exemptions?: any[];
    ignoredPrefixes?: string[];
    baselineRef?: string;
    mode?: "strict" | "warn";
}): TestAgentSurfaceAuditReceipt;
export declare function readTestAgentSurfaceAudit(value: any): TestAgentSurfaceAuditReceipt;
export declare function runTestAgentSurfaceAuditSelfTest(): {
    pass: boolean;
    status: "unavailable" | "blocked" | "passed" | "warn";
    actualChangeCount: number;
    checksum: string;
};
