import type { TaskAcceptancePolicySnapshot } from "./task-acceptance-policy";
type VerificationProject = {
    name: string;
    workDir: string;
    verificationCommands: string[];
    env?: Record<string, string>;
};
type VerificationResult = {
    id: string;
    project: string;
    command: string;
    status: "passed" | "failed" | "blocked" | "timed_out";
    exit_code: number | null;
    duration_ms: number;
    output: string;
    error: string;
};
export type MainAgentSelfVerificationReceiptV1 = {
    schema: "ccm-main-agent-self-verification-receipt-v1";
    version: 1;
    task_id: string;
    scope: "group" | "project";
    scope_id: string;
    exact_session_id: string;
    acceptance_policy_checksum: string;
    mode: "main_agent_self_verification";
    round: 1;
    model_status: "confirmed" | "failed";
    semantic_decision_receipt: any;
    source_snapshot_checksum: string;
    changed_files: any[];
    verification_results: VerificationResult[];
    criterion_coverage: any[];
    deterministic_gate: {
        pass: boolean;
        checks: Array<{
            id: string;
            pass: boolean;
            detail: string;
        }>;
    };
    canAccept: boolean;
    status: "main_agent_self_verified" | "main_agent_self_verification_failed";
    report: {
        summary: string;
        verification: string[];
        risks: string[];
        blockers: string[];
    };
    verdict: {
        accepted: boolean;
        gaps: string[];
        evidence: string[];
        nextActions: string[];
    };
    decision: {
        route: "complete" | "needs_user";
        reason: string;
    };
    completed_at: string;
    checksum: string;
};
export declare function runMainAgentSelfVerification(input: {
    task: any;
    policy: TaskAcceptancePolicySnapshot;
    acceptanceCriteria?: string[];
    changedFiles?: any[];
    projects?: VerificationProject[];
    workerOutputs?: string[];
    sourceSnapshotChecksum?: string;
    commandTimeoutMs?: number;
    semanticModelCall?: (request: {
        config: any;
        messages: any[];
        maxTokens: number;
    }) => Promise<any>;
    semanticConfig?: any;
}): Promise<MainAgentSelfVerificationReceiptV1>;
export declare function validateMainAgentSelfVerificationReceipt(task: any, policy: TaskAcceptancePolicySnapshot, receipt: any): {
    valid: boolean;
    reason: string;
};
export {};
