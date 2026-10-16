import type { ReviewJob, ReviewCoverage, ReviewFinding } from './types';
export { redactReviewSource } from './redaction';
export declare function probeOcr(): Promise<{
    available: boolean;
    version: string;
}>;
export declare function normalizeOcrResult(raw: any, job: ReviewJob): {
    findings: ReviewFinding[];
    coverage: ReviewCoverage;
};
export declare function runOcrReview(job: ReviewJob, signal: AbortSignal): Promise<{
    usage: {
        stage: string;
        reported: boolean;
        usage: {
            inputTokens: any;
            outputTokens: any;
            totalTokens: any;
            provenance: string;
            cost: any;
        };
    };
    findings: ReviewFinding[];
    coverage: ReviewCoverage;
}>;
