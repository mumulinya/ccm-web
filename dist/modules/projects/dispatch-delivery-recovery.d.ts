/** An interrupted human merge wait is not a failed implementation. Retain the
 * branch and exact approval for recovery; never replay the worker implicitly. */
export declare function blockInterruptedDispatchDelivery(taskId: string, runId: string, error: any): {
    task: any;
    status: string;
    summary: string;
    fileChanges: {
        count: number;
        files: any[];
    };
    verification: any[];
    risks: string[];
    testAgent: any;
};
export declare function reconcileInterruptedDispatchDeliveries(): {
    blocked: number;
};
