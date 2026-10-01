export declare const LIVE_WORKSPACE_CHANGES_SCHEMA: "ccm-live-workspace-changes-v1";
export type CcmLiveWorkspaceFileChangeV1 = {
    path: string;
    status: "added" | "modified" | "deleted" | "renamed";
    additions?: number;
    deletions?: number;
    diffAvailable: boolean;
};
export type CcmLiveWorkspaceChangesV1 = {
    schema: typeof LIVE_WORKSPACE_CHANGES_SCHEMA;
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    generation: number;
    attempt: number;
    taskId?: string;
    agentRunId: string;
    projectId: string;
    revision: number;
    files: CcmLiveWorkspaceFileChangeV1[];
    totalFiles: number;
    totalAdditions?: number;
    totalDeletions?: number;
    checksum: string;
    contentStored: false;
};
type RuntimeIdentity = {
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    anchorMessageId: string;
    turnId?: string;
    generation: number;
    attempt: number;
    taskId?: string;
    agentRunId: string;
    project?: string;
};
export declare function buildLiveWorkspaceChangesReceipt(input: {
    identity: RuntimeIdentity;
    projectId: string;
    revision: number;
    fileChanges: any;
}): CcmLiveWorkspaceChangesV1;
export declare function createLiveWorkspaceChangesTracker(input: {
    identity: RuntimeIdentity;
    projectId: string;
    baseline: any;
    intervalMs?: number;
    publish: (receipt: CcmLiveWorkspaceChangesV1) => void;
}): {
    schedule: () => void;
    flush(): CcmLiveWorkspaceChangesV1;
    stop(): void;
};
export {};
