export declare const GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA = "ccm-group-session-lifecycle-head-v1";
export declare const GROUP_SESSION_LIFECYCLE_HEAD_DIR: string;
export declare const GROUP_SESSION_LIFECYCLE_JOURNAL_SCHEMA = "ccm-group-session-lifecycle-journal-v1";
export declare const GROUP_SESSION_LIFECYCLE_COMMIT_SCHEMA = "ccm-group-session-lifecycle-commit-v1";
export declare const GROUP_SESSION_LIFECYCLE_COMMIT_DIR: string;
export declare function getGroupSessionLifecycleHeadFile(groupId: string, groupSessionId: string): string;
export declare function getGroupSessionLifecycleJournalFile(groupId: string, groupSessionId: string): string;
export declare function getGroupSessionLifecycleCommittedFile(groupId: string, groupSessionId: string): string;
export declare function getGroupSessionLifecycleCommitFile(groupId: string, groupSessionId: string, generation: number): string;
export declare function readGroupSessionLifecycleCommitChain(groupId: string, groupSessionId: string): {
    exists: boolean;
    valid: boolean;
    issues: string[];
    receipts: any[];
    latest: any;
};
export declare function readGroupSessionLifecycleJournal(groupId: string, groupSessionId: string): {
    exists: boolean;
    valid: boolean;
    issues: string[];
    records: any[];
    latest: any;
    file: string;
};
export declare function verifyGroupSessionLifecycleHead(head: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readGroupSessionLifecycleHead(groupId: string, groupSessionId: string): any;
export declare function bootstrapGroupSessionLifecycleJournals(): {
    schema: string;
    checked: number;
    adopted: number;
    current: number;
    failed: number;
    failures: any[];
    bootstrappedAt: string;
};
export declare function ensureGroupSessionLifecycleHead(groupId: string, groupSessionId: string, input?: any): {
    committed: boolean;
    idempotent: boolean;
    head: any;
    file: string;
    journal?: undefined;
    receipt?: undefined;
} | {
    committed: boolean;
    idempotent: boolean;
    head: any;
    journal: {
        committed: boolean;
        idempotent: boolean;
        record: any;
        file: string;
    };
    receipt: {
        committed: boolean;
        idempotent: boolean;
        receipt: any;
        file: string;
    };
    file: string;
};
export declare function transitionGroupSessionLifecycleHead(input?: any): {
    committed: boolean;
    idempotent: boolean;
    head: any;
    file: string;
    journal?: undefined;
    receipt?: undefined;
} | {
    committed: boolean;
    idempotent: boolean;
    head: any;
    journal: {
        committed: boolean;
        idempotent: boolean;
        record: any;
        file: string;
    };
    receipt: {
        committed: boolean;
        idempotent: boolean;
        receipt: any;
        file: string;
    };
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
export declare function withGroupSessionLifecycleCommitFence<T>(input: any, operation: (state: any) => T): T;
export declare function buildGroupCompactionLifecycleCommitProof(input?: any): any;
export declare function verifyGroupCompactionLifecycleCommitProof(proof: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
