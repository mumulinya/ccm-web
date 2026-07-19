import type { TestAgentInvocationResult } from "../../test-agent/invocation";
export type TestAgentRunnerMode = "plan" | "invocation";
export type TestAgentRunnerStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "interrupted";
export interface TestAgentSourceProjectBinding {
    name: string;
    workDir: string;
    realWorkDir: string;
    gitHead: string;
    gitStatusHash: string;
    declaredFiles: string[];
    declaredFileHash: string;
    fingerprint: string;
}
export interface TestAgentSourceBinding {
    schema: "ccm-test-agent-source-binding-v1";
    capturedAt: string;
    fingerprint: string;
    projects: TestAgentSourceProjectBinding[];
}
export interface TestAgentRunnerRecord {
    schema: "ccm-test-agent-runner-record-v1";
    id: string;
    key: string;
    mode: TestAgentRunnerMode;
    taskId: string;
    groupId: string;
    handoffId: string;
    handoffHash: string;
    status: TestAgentRunnerStatus;
    pid: number;
    createdAt: string;
    startedAt: string;
    heartbeatAt: string;
    finishedAt: string;
    deadlineAt: string;
    timeoutMs: number;
    handoffPath: string;
    stdoutPath: string;
    stderrPath: string;
    exitCode: number | null;
    signal: string;
    error: string;
    cancelledReason: string;
    recoveredAfterRestart: boolean;
    sourceBefore: TestAgentSourceBinding;
    sourceAfter?: TestAgentSourceBinding;
    sourceStable?: boolean;
    result?: any;
}
export interface RunTestAgentJobInput {
    mode: TestAgentRunnerMode;
    handoff: any;
    taskId?: string;
    groupId?: string;
    timeoutMs?: number;
    idempotencyKey?: string;
    allowedWorkDirs?: string[];
}
export interface TestAgentRunnerResult {
    schema: "ccm-test-agent-runner-result-v1";
    record: TestAgentRunnerRecord;
    plan?: any;
    invocation?: TestAgentInvocationResult;
    stdout: string;
    stderr: string;
    reused: boolean;
}
export declare function listTestAgentRunnerRecords(options?: {
    taskIds?: string[];
    limit?: number;
}): TestAgentRunnerRecord[];
/** Test-only helper: persist a runner record without registering activeChildren (orphan simulation). */
export declare function upsertTestAgentRunnerRecordForSelfTest(partial: Partial<TestAgentRunnerRecord> & {
    id: string;
    taskId: string;
}): TestAgentRunnerRecord;
export declare function getTestAgentRunnerRecordForSelfTest(id: string): TestAgentRunnerRecord;
export declare function captureTestAgentSourceBinding(handoff: any): TestAgentSourceBinding;
export declare function runTestAgentCliJob(input: RunTestAgentJobInput): Promise<TestAgentRunnerResult>;
export declare function cancelTestAgentRunsForTask(taskId: string, reason?: string): string[];
export declare function reconcileTestAgentRunnerRecords(): {
    schema: string;
    total: number;
    running: number;
    interrupted: number;
    retention: {
        schema: string;
        scanned: number;
        removedRecords: number;
        removedFiles: number;
    };
};
export declare function pruneTestAgentRunnerRecords(options?: {
    retentionDays?: number;
    maxRecords?: number;
}): {
    schema: string;
    scanned: number;
    removedRecords: number;
    removedFiles: number;
};
export declare function purgeTestAgentRunnerRecordsForTask(taskId: string): {
    schema: string;
    taskId: string;
    removedRecords: number;
    removedFiles: number;
};
export declare function runTestAgentRunnerSelfTest(): {
    pass: boolean;
    stableSourceFingerprint: boolean;
    recordsReconcile: boolean;
};
