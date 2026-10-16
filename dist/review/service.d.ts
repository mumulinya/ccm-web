import type { ReviewJob, ReviewSubjectSnapshot, ReviewPolicySnapshot } from './types';
export declare function createReviewJob(subject: ReviewSubjectSnapshot, policy: ReviewPolicySnapshot, requestKey?: string): ReviewJob;
export declare function pumpReviews(): Promise<void>;
export declare function cancelReviewJob(id: string, revision: number): ReviewJob;
export declare function decideReviewFinding(id: string, findingId: string, revision: number, actor: {
    userId: string;
    role: string;
}, input: any): ReviewJob;
/** A signed manual check supplements non-text artifacts only. It cannot waive
 * a missing model, failed scanner, uncovered text or an unresolved defect. */
export declare function attestReviewArtifacts(id: string, revision: number, actor: {
    userId: string;
    role: string;
}, reason: string): ReviewJob;
export declare function awaitReviewJob(id: string, signal?: AbortSignal): Promise<ReviewJob>;
export declare function assertReviewForCommit(id: string, project: string, files: string[], workspaceChecksum: string, currentPolicy: ReviewPolicySnapshot): Promise<ReviewJob>;
/** Generic runtime controls must not turn this read-only run into a developer. */
export declare function controlReviewRun(runId: string, action: string): {
    run: import("../agents/agent-run-types").AgentRun;
    review: {
        id: string;
        revision: number;
        runId: string;
        status: "queued" | "completed" | "failed" | "cancelled" | "running" | "recovery_required";
        stage: string;
        conclusion: "pending" | "blocked" | "passed" | "not_required" | "incomplete";
        project: string;
        taskId: string;
        subjectChecksum: string;
        policyChecksum: string;
        level: "light" | "standard" | "strict" | "commit";
        files: {
            path: string;
            deleted: boolean;
            binary: boolean;
        }[];
        findings: import("./types").ReviewFinding[];
        coverage: import("./types").ReviewCoverage[];
        error: string;
        elapsedMs: number;
        usage: any[];
        createdAt: string;
        updatedAt: string;
        history: {
            type: string;
            at: string;
            findingId?: string;
            reason?: string;
        }[];
    };
};
export declare function reconcileReviewRuns(): void;
export declare function startReviewRecovery(): () => void;
