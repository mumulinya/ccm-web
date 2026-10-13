type Dependencies = {
    readTask: (id: string) => any;
    updateTask: (id: string, patch: any) => any;
    pause?: (run: any) => any;
    continueRun?: (run: any, request: any) => Promise<any>;
    continuationChannel?: "mcp_tool";
};
/** Task JSON is the approval WAL: persist applying before changing Run or contract. */
export declare function mutateDispatchScope(deps: Dependencies, taskId: string, workItemId: string, action: string, input: any, actorId: string): Promise<any>;
/** Compensate JSON/Run partial writes without executing requested side effects. */
export declare function reconcileDispatchScopeApplications(deps: Dependencies, tasks: any[]): Promise<{
    repaired: number;
}>;
export {};
