import type { ReviewJob, ReviewFinding } from './types';
export declare function checkPlanScope(job: ReviewJob): ReviewFinding[];
export declare function testShape(source: string, file: string): {
    tests: string[];
    assertions: string[];
    controls: string[];
};
export declare function checkTestIntegrity(job: ReviewJob): ReviewFinding[];
export declare function scanSecrets(job: ReviewJob, signal: AbortSignal): Promise<{
    findings: ReviewFinding[];
    masks: any[];
    completed: string[];
}>;
