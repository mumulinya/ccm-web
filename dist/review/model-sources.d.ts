import type { ReviewJob } from './types';
/** Scan both old and new context before any model sees source. Ranges retain
 * newlines so review line references continue to address the original files. */
export declare function prepareModelSources(job: ReviewJob, signal: AbortSignal, reviewInput?: any): Promise<{
    baselineDir: string;
    targetDir: string;
    reviewInput: any;
    kind: "task" | "git";
    project: string;
    root: string;
    taskId: string;
    workItemId: string;
    traceId: string;
    attemptId: string;
    generation: number;
    exactSessionId: string;
    planChecksum: string;
    goal: string;
    plan: any;
    head: string;
    workspaceChecksum: string;
    files: import("./types").ReviewFile[];
    contextFingerprint: string;
    checksum: string;
    requestedFiles?: string[];
    dispatchScope?: any;
}>;
