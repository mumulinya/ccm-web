import { type AcceptanceContract, type AcceptanceCheck } from "./acceptance-contract";
import { type AcceptanceSnapshot } from "./acceptance-workspace";
export type AcceptanceExecution = {
    id: string;
    projectId: string;
    workItemId: string;
    executionSessionId: string;
    attempt: number;
    root: string;
    baseline: AcceptanceSnapshot;
    verificationSource?: AcceptanceSnapshot;
    environmentFingerprint: string;
};
export type AcceptanceObservation = {
    id: string;
    contractChecksum: string;
    taskId: string;
    workItemId: string;
    projectId: string;
    exactSessionId: string;
    generation: number;
    executionSessionId: string;
    attempt: number;
    verificationId: string;
    producer: "main_agent" | "test_agent" | "ccm";
    repoStateFingerprint: string;
    environmentFingerprint: string;
    observedAt: string;
    gitFingerprint: string;
    status: "passed" | "failed" | "blocked";
    exitCode?: number;
    outputChecksum: string;
    command?: string;
    cwd: string;
    reason: string;
    sourceRecordId: string;
    sourceChecksum: string;
};
type Ledger = {
    contract: AcceptanceContract;
    executions: AcceptanceExecution[];
    observations: AcceptanceObservation[];
};
export declare function readAcceptanceLedger(taskId: string): Ledger | null;
export declare function registerAcceptanceExecution(contract: AcceptanceContract, input: {
    projectId: string;
    workItemId: string;
    executionSessionId: string;
    attempt: number;
    root: string;
}): AcceptanceExecution;
export declare function beginAcceptanceVerification(taskId: string, executionId: string): {
    taskId: string;
    executionId: string;
    contractChecksum: string;
};
/** Called only by trusted execution adapters, never from model receipt/report ingestion. */
export declare function recordAcceptanceObservation(context: {
    taskId: string;
    executionId: string;
    contractChecksum: string;
}, checkId: string, input: {
    producer: AcceptanceObservation["producer"];
    sourceRecordId: string;
    cwd: string;
    command?: string;
    exitCode?: number | null;
    output?: string;
    actual?: unknown;
    status: string;
    beforeFingerprint: string;
    afterFingerprint: string;
    executionRoot?: string;
}): AcceptanceObservation;
export declare function prepareAcceptanceCommand(context: any, projectId: string, command: string, executionRoot: string): {
    checks: AcceptanceCheck[];
    cwd: string;
    snapshot: AcceptanceSnapshot;
    contract: AcceptanceContract;
};
export declare function evaluateAcceptanceLedger(task: any): {
    canComplete: boolean;
    status: string;
    issues: string[];
    criteria: any[];
    evidenceIds: any[];
    scopes?: undefined;
    contractChecksum?: undefined;
} | {
    canComplete: boolean;
    status: string;
    issues: string[];
    criteria: {
        criterionId: string;
        description: string;
        expected: string;
        verificationIds: string[];
        status: string;
        freshness: string;
        evidenceIds: string[];
        verifier: string;
        reason: string;
    }[];
    scopes: any[];
    evidenceIds: string[];
    contractChecksum: string;
};
export {};
