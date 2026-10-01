/**
 * A planning operation is only live inside the current server process. If the
 * process was restarted while the operation was marked running, release the
 * stale marker so the user can retry instead of being blocked forever.
 */
export declare function reconcilePlanningOperation(task: any): any;
/** Selected targets are facts supplied to the model, never keyword routing rules. */
export declare function taskPlanningTargetContext(payload: any, groups: any[], configs: any[]): {
    group: any;
    targetProject: string;
    context: {
        target_determined: boolean;
        project_id: any;
        project_path: any;
        group_id: any;
        group_name: any;
        candidate_projects: string[];
    };
    userText: string;
    availableTargets: {
        type: string;
        id: any;
        name: any;
    }[];
};
export declare function mergePlanningQuestions(...lists: any[][]): any[];
export declare function resolvePlanningTarget(context: any, plan: any): {
    targetProject: any;
    targets: string[];
};
export declare function assertPlanningState(task: any): void;
export declare function assertPlanningVersion(task: any, input: any): void;
/** A persisted receipt prevents retries and competing tabs from applying feedback twice. */
export declare function updatePlanningTask(taskInput: any, input: any, deps?: any): Promise<any>;
/** Only a never-started run can acquire the newly confirmed specification. */
export declare function prepareTaskPlanConfirmation(task: any, payload: any): import("./task-run-store").TaskRunRecord;
