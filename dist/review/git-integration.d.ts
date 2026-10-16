import type { ReviewJob } from './types';
export declare function commitReviewSettings(): {
    enabled: boolean;
    mode: "warn" | "block" | "off";
    localChecks: boolean;
    model: string;
    requiresReview: boolean;
    budget: {
        timeoutMs: number;
        maxCalls: number;
        ocrTokenBudget: number;
    };
};
export declare function preCommitReview(input: any): Promise<ReviewJob>;
export declare function verifyCommittedReview(job: ReviewJob, root: string, committed: any): Promise<boolean>;
