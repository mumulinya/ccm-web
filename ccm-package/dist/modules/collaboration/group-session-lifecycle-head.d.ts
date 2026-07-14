export declare const GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA = "ccm-group-session-lifecycle-head-v1";
export declare const GROUP_SESSION_LIFECYCLE_HEAD_DIR: string;
export declare function getGroupSessionLifecycleHeadFile(groupId: string, groupSessionId: string): string;
export declare function verifyGroupSessionLifecycleHead(head: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readGroupSessionLifecycleHead(groupId: string, groupSessionId: string): any;
export declare function ensureGroupSessionLifecycleHead(groupId: string, groupSessionId: string, input?: any): {
    committed: boolean;
    idempotent: boolean;
    head: any;
    file: string;
};
export declare function transitionGroupSessionLifecycleHead(input?: any): {
    committed: boolean;
    idempotent: boolean;
    head: any;
    file: string;
};
export declare function validateGroupSessionLifecycleBinding(input?: any): {
    schema: string;
    valid: boolean;
    status: string;
    issues: string[];
    expected: {
        lifecycleHeadId: string;
        generation: number;
        status: string;
        lifecycleHeadChecksum: string;
    };
};
export declare function normalizeGroupSessionLifecycleRuntimeFence(input?: any): {
    schema: string;
    required: boolean;
    groupId: string;
    groupSessionId: string;
    lifecycleGeneration: number;
    lifecycleStatus: string;
    lifecycleHeadId: string;
    lifecycleHeadChecksum: string;
    memoryContextSnapshotId: string;
    memoryContextSnapshotChecksum: string;
};
export declare function validateGroupSessionLifecycleRuntimeFence(input?: any): {
    schema: string;
    valid: boolean;
    required: boolean;
    status: string;
    issues: string[];
    fence: {
        schema: string;
        required: boolean;
        groupId: string;
        groupSessionId: string;
        lifecycleGeneration: number;
        lifecycleStatus: string;
        lifecycleHeadId: string;
        lifecycleHeadChecksum: string;
        memoryContextSnapshotId: string;
        memoryContextSnapshotChecksum: string;
    };
    expected: {
        lifecycleHeadId: string;
        generation: number;
        status: string;
        lifecycleHeadChecksum: string;
    };
};
