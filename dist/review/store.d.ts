import type { ReviewJob } from './types';
export declare function readReviewJob(id: string): ReviewJob | null;
export declare function listReviewJobs(taskId?: string, project?: string): ReviewJob[];
export declare function ensureReviewJob(job: ReviewJob): {
    job: ReviewJob;
    created: boolean;
};
export declare function updateReviewJob(id: string, mutate: (job: ReviewJob) => void, expectedRevision?: number): ReviewJob;
export declare function acquireReviewLock(name: string, owner: string, ttl?: number): boolean;
export declare function releaseReviewLock(name: string, owner: string): void;
export declare const newReviewId: () => string;
export declare function queuedReviewJobs(): ReviewJob[];
export declare function staleStandaloneReviewJobs(): ReviewJob[];
export declare function expiredCredentialReviewJobs(): ReviewJob[];
export declare function removeReviewJobs(ids: string[]): void;
export declare function taskReviewProjection(task: any): {
    id: string;
    revision: number;
    runId: string;
    status: "completed" | "failed" | "queued" | "cancelled" | "running" | "recovery_required";
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
export declare function saveRuleDraft(draft: any): any;
export declare function listRuleDrafts(): any[];
export declare function publicReviewJob(job: ReviewJob): {
    id: string;
    revision: number;
    runId: string;
    status: "completed" | "failed" | "queued" | "cancelled" | "running" | "recovery_required";
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
