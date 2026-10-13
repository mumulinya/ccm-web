/** Existing approval stores and lifecycle modules remain authoritative. */
export declare function taskApprovalItems(task: any, knownRuns?: any[]): any[];
export declare function applyTaskApprovalDecisions(taskId: string, payload: any, auth: any, updateTask: any): Promise<any>;
export declare function handleTaskApprovalDecisions(pathname: string, req: any, res: any, updateTask: any): boolean;
