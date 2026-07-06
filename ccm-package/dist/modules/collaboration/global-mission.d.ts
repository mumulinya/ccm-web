type GlobalMissionDeps = {
    listExecutions: (filters?: any) => any[];
    taskRequiresCodeChanges: (task: any) => boolean;
    taskRequiresVerification: (task: any) => boolean;
};
export declare function getGlobalMissionChildDeliveryEvidence(task: any, deps: Pick<GlobalMissionDeps, "listExecutions">): {
    execution_count: number;
    execution_states: {
        execution_id: any;
        agent: any;
        state: any;
        green_level: any;
        green_passed: boolean;
        workspace_mode: any;
        merge_status: string;
        merge_commit: any;
    }[];
    merge_required: boolean;
    merge_passed: boolean;
    merge_pending_execution_ids: any[];
    merge_commits: any[];
};
export declare function globalMissionChildGatePassed(task: any, deps: GlobalMissionDeps): boolean;
export declare function refreshGlobalMissionParentInTaskList(tasks: any[], parentId: string, deps: GlobalMissionDeps): any;
export {};
