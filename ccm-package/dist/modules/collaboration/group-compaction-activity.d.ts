export declare const GROUP_COMPACTION_ACTIVITY_SCHEMA = "ccm-group-compaction-activity-ledger-v1";
export declare const GROUP_COMPACTION_ACTIVITY_DIR: string;
export declare const GROUP_COMPACTION_ACTIVITY_DEFAULT_LEASE_MS = 90000;
export declare const GROUP_COMPACTION_ACTIVITY_DEFAULT_HEARTBEAT_MS = 30000;
export declare function getGroupCompactionActivityFile(groupId: string, groupSessionId: string): string;
export declare function verifyGroupCompactionActivityLedger(ledger: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readGroupCompactionActivity(groupId: string, groupSessionId: string): any;
export declare function assertGroupCompactionNotCancelled(input?: any): {
    cancelled: boolean;
    current: any;
    ledger: any;
};
export declare function requestGroupCompactionCancellation(input?: any): {
    requested: boolean;
    reason: string;
    terminal: any;
    ledger: any;
    current?: undefined;
    alreadyRequested?: undefined;
    cancelRequestId?: undefined;
} | {
    requested: boolean;
    reason: string;
    ledger: any;
    terminal?: undefined;
    current?: undefined;
    alreadyRequested?: undefined;
    cancelRequestId?: undefined;
} | {
    requested: boolean;
    reason: string;
    current: any;
    ledger: any;
    terminal?: undefined;
    alreadyRequested?: undefined;
    cancelRequestId?: undefined;
} | {
    requested: boolean;
    alreadyRequested: boolean;
    cancelRequestId: any;
    current: any;
    ledger: any;
    reason?: undefined;
    terminal?: undefined;
};
export declare function reconcileGroupCompactionActivity(groupId: string, groupSessionId: string, options?: any): any;
export declare function startGroupCompactionActivity(input?: any): {
    started: boolean;
    busy: boolean;
    reason: string;
    current: any;
    ledger: any;
    operationId?: undefined;
    lifecycleValidation?: undefined;
} | {
    started: boolean;
    busy: boolean;
    operationId: string;
    current: any;
    ledger: any;
    lifecycleValidation: {
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
    reason?: undefined;
} | {
    started: boolean;
    busy: boolean;
    reason: string;
    lifecycleValidation: {
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
};
export declare function pulseGroupCompactionActivity(input?: any): {
    pulsed: boolean;
    current: any;
    ledger: any;
    lifecycleValidation: {
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
};
export declare function finishGroupCompactionActivity(input?: any): {
    finished: boolean;
    reason: string;
    ledger: any;
    terminal?: undefined;
} | {
    finished: boolean;
    terminal: any;
    ledger: any;
    reason?: undefined;
} | {
    finished: boolean;
    reason: string;
};
export declare function withGroupCompactionActivityCommitFence<T>(input: any, operation: (state: any) => T): {
    value: T;
    compactionActivity: {
        finished: boolean;
        terminal: any;
        ledger: any;
        commitFence: {
            schema: string;
            status: string;
            group_id: string;
            group_session_id: string;
            operation_id: string;
            boundary_id: any;
            compact_transaction_receipt_checksum: any;
            committed_at: string;
            body_free: boolean;
            ledger_checksum: any;
        };
    };
};
export declare function deleteGroupCompactionActivity(groupId: string, groupSessionId: string): {
    deleted: number;
    file: string;
    groupId: string;
    groupSessionId: string;
};
