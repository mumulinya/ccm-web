type Identity = {
    taskId: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
};
export declare function previewTestAgentMaintenance(input: any): {
    success: boolean;
    schema: any;
    identity: any;
    planChecksum: any;
    affectedRecordCount: any;
    estimatedRemovedBodyTokens: any;
    unresolvedCount: any;
    records: any;
    taskChecksum: any;
    projectedTaskChecksum: any;
    contentStored: boolean;
};
export declare function applyTestAgentMaintenance(input: any): {
    success: boolean;
    jobId: string;
    identity: Identity;
    planChecksum: string;
    affectedRecordCount: any;
    contentStored: boolean;
};
export declare function rollbackTestAgentMaintenance(input: any): {
    success: boolean;
    jobId: string;
    status: string;
    idempotent: boolean;
    contentStored: boolean;
    restoredRecords?: undefined;
} | {
    success: boolean;
    jobId: string;
    status: string;
    restoredRecords: any;
    contentStored: boolean;
    idempotent?: undefined;
};
export {};
