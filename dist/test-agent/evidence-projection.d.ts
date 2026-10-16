export declare const TEST_AGENT_EVIDENCE_PROJECTION_SCHEMA: "ccm-test-agent-evidence-projection-v2";
export declare const TEST_AGENT_HANDOFF_PROJECTION_SCHEMA: "ccm-test-agent-handoff-persistence-projection-v2";
export declare function testAgentEvidenceChecksum(value: any): string;
export type TestAgentEvidenceRedactionReference = {
    field: string;
    fieldPathChecksum: string;
    checksum: string;
    charCount: number;
    tokenCount: number;
    contentStored: false;
};
export declare function findForbiddenTestAgentEvidencePaths(value: any): string[];
/**
 * Creates the durable form used by handoff/runner stores. The live caller keeps
 * the original value; only the returned copy crosses a persistence boundary.
 */
export declare function projectTestAgentValueForPersistence<T = any>(value: T): {
    value: any;
    redactions: TestAgentEvidenceRedactionReference[];
};
export type TestAgentEvidenceProjectionV2 = {
    schema: typeof TEST_AGENT_EVIDENCE_PROJECTION_SCHEMA;
    taskId: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    createdAt: string;
    workerReceipts: any[];
    totals: {
        workers: number;
        passed: number;
        failed: number;
        files: number;
        checks: number;
        sourceRefs: number;
        rawChars: number;
        rawTokens: number;
    };
    checksum: string;
    contentStored: false;
};
export declare function buildTestAgentEvidenceProjection(input: {
    taskId?: string;
    scope?: "global" | "project" | "group";
    scopeId?: string;
    workerResults?: any[];
    createdAt?: string;
}): TestAgentEvidenceProjectionV2;
export declare function summarizeTestAgentEvidenceProjection(value: TestAgentEvidenceProjectionV2): string;
export declare function readTestAgentEvidenceProjection(value: any): TestAgentEvidenceProjectionV2 | null;
export declare function projectTestAgentHandoffForPersistence(handoff: any): any;
export declare function projectTestAgentExecutionResultForPersistence(result: any): any;
/** Report artifacts retain executable evidence identities, status and hashes,
 * while full invocation text and captured output remain live-only. Handoff
 * definitions are intentionally handled separately because they must execute. */
export declare function projectTestAgentReportForPersistence(report: any, options?: {
    retainVerificationMetadata?: boolean;
}): any;
export declare function runTestAgentEvidenceProjectionSelfTest(): {
    pass: boolean;
    sentinelAbsent: boolean;
    forbiddenPaths: string[];
    projectionChecksum: string;
};
