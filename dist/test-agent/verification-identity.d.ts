/** Runner-owned environment points to the authoritative Coordinator record. */
export declare function testAgentVerificationIdentity(taskId: string): {
    status: string;
    taskId: string;
    runId?: undefined;
    attemptId?: undefined;
    traceId?: undefined;
} | {
    status: string;
    taskId: string;
    runId: string;
    attemptId: string;
    traceId: string;
};
