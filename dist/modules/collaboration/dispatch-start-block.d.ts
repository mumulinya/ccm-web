/** A denied safety gate is waiting for a decision, not a failed Provider call. */
export declare function preserveDispatchStartBlock(taskId: string, error: any, parentRunId?: string): {
    task: any;
    status: string;
    summary: string;
    verification: any[];
    risks: any[];
    fileChanges: any;
};
