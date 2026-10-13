export declare function inspectExplicitTaskDispatchRetry(task: any, requestedParent: string): {
    success: boolean;
    status: number;
    code: string;
    error: string;
};
export declare function buildExplicitTaskDispatchRetryIdentity(task: any, nextRun: any, retryCount: number): {
    attempt_id?: undefined;
    agent_retry_parent_run_id?: undefined;
} | {
    attempt_id: string;
    agent_retry_parent_run_id: string;
};
/** Legacy Task controls must reach the same business Attempt as Run controls. */
export declare function resolveTaskDispatchExecutionIdentity(taskId: string, proposedAttempt?: string, proposedParent?: string): {
    attemptId: string;
    parentRunId: any;
};
