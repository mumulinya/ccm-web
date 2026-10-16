import type { ReviewSubjectSnapshot } from './types';
export declare function registeredReviewWorkspace(project: string, configs?: any[]): any;
export declare function reviewPlanFingerprint(task: any): string;
export declare const reviewRoot: () => string;
type Manifest = {
    root: string;
    dir: string;
    head: string;
    files: Record<string, {
        hash: string;
        binary: boolean;
    }>;
};
export declare function snapshotPath(dir: string, rel: string): string;
export declare function captureReviewBaseline(task: any, project: string, root: string): Manifest;
export declare function taskReviewSubject(task: any, project: string, root: string, workItemId?: string): Promise<ReviewSubjectSnapshot>;
export declare function gitReviewSubject(project: string, root: string, requested: string[], expected: string): Promise<ReviewSubjectSnapshot>;
export declare function readReviewSource(subject: ReviewSubjectSnapshot, rel: string, side?: 'before' | 'after'): string;
export declare function subjectFiles(subject: ReviewSubjectSnapshot): string[];
export declare function reviewSubjectIsCurrent(subject: ReviewSubjectSnapshot): Promise<boolean>;
export declare function taskReviewSubjectIsCurrent(subject: ReviewSubjectSnapshot): boolean;
export {};
