export declare let latestConflictResolutionMaintenanceTick: any;
export declare function readConflictResolutionMaintenanceSchedulerState(file?: string): {
    schema: string;
    version: number;
    groups: {};
    updated_at: string;
};
export declare function writeConflictResolutionMaintenanceSchedulerState(value: any, file?: string): void;
export declare function conflictResolutionMaintenanceSchedulerScopeIdentity(scopeId: any): {
    typedScopeId: string;
    rootGroupId: string;
    groupSessionId: string;
    exactSession: boolean;
};
export declare function deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId: string, groupSessionId: string, options?: any): any;
export declare function runConflictResolutionMemoryMaintenanceSchedulerTick(options?: any): any;
