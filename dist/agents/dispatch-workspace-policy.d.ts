export declare function isDispatchPlanningRun(input: any): boolean;
/** An orchestrator retains its Run lease and logical Task Checkout. The child
 * performing edits owns the physical workspace lane, not its planning parent. */
export declare function dispatchCheckoutWorkspace(input: any): {
    workspacePath: any;
    worktreeId: any;
};
export declare function requiresExclusiveDispatchWorkspace(input: any): boolean;
export declare function canonicalDispatchWorkspace(directory: string): string;
/** Plan isolation before launch. The SQLite Checkout still arbitrates races
 * between two starts that both observed a free lane. */
export declare function resolveDispatchWorkspaceMode(baseWorkDir: string, options: any, requested: "shared" | "worktree"): {
    mode: "shared" | "worktree";
    failClosed: boolean;
};
