/** Review scope deduplicates verification jobs; it is not the delivery Attempt. */
export declare function resolveDispatchVerificationIdentity(taskId: string, handoff: any, legacyAttemptScope: string): {
    traceId: string;
    attemptId: string;
    parentRunId: string;
};
