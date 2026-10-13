/** Authorization covers immutable commits and the receiving HEAD. A decision
 * never authorizes a changed branch or starts another Provider process. */
export declare function awaitDispatchDeliveryApproval(input: {
    taskId?: string;
    workItemId: string;
    workspacePath: string;
    branch: string;
    baseCommit: string;
    commit: string;
    mainHead: string;
    changedFiles: string[];
    pollMs?: number;
}): Promise<{
    approvalId: string;
    fingerprint: string;
    runId: string;
    taskId: any;
    workItemId: string;
}>;
export declare function recordDispatchDeliveryApplied(authorization: any, commit: string): void;
