/** A persistence/lease failure is not a verified implementation failure. Keep
 * the accepted evidence and immutable Run outcome, and require reconciliation
 * before publishing a successful delivery or replaying side effects. */
export declare function blockDispatchProjectFinalization(taskId: string, runId: string, error: any): {
    task: any;
    status: string;
    summary: string;
    fileChanges: any;
    verification: any;
    risks: string[];
    testAgent: any;
};
