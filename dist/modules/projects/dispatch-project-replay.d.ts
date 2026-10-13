/** Replay before source-drift validation: the completed child intentionally
 * changed the original planning snapshot. A reconnect must not overwrite its
 * delivery state with a new source-drift blocker. Explicit retry has a new key. */
export declare function replayDispatchProjectExecution(task: any): {
    task: any;
    status: string;
    summary: string;
    fileChanges: any;
    verification: any;
    risks: any;
    testAgent: any;
};
