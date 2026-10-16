import type { ReviewJob, ReviewCoverage, ReviewFinding } from './types';
export declare function runAuxScanner(tool: 'semgrep' | 'osv', job: ReviewJob, signal: AbortSignal): Promise<{
    findings: ReviewFinding[];
    coverage: ReviewCoverage;
}>;
