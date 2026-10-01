export declare function finalizeTaskPauseAtSafeBoundary(task: any, deps: any, options?: {
    allowRuntimeHolder?: boolean;
}): any;
declare function reconcileTree(task: any, deps: any): {
    root: any;
    rows: any[];
    childrenSafe: boolean;
};
export declare const reconcileTaskPauseTree: typeof reconcileTree;
export declare function requestTaskPauseTree(task: any, deps: any): {
    root: any;
    rows: any[];
    childrenSafe: boolean;
};
export declare function resumeTaskPauseTree(task: any, ctx: any, deps: any): Promise<{
    root: any;
    resumedRows: any[];
}>;
export declare function handleTaskPauseRoutes(req: any, res: any, parsed: any, ctx: any, deps: any): boolean;
export {};
