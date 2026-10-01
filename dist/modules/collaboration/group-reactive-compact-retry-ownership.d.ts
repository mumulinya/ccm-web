export declare const GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_SCHEMA = "ccm-group-reactive-compact-retry-ownership-v1";
export declare const GROUP_REACTIVE_COMPACT_RETRY_OWNERSHIP_DIR: string;
export declare const GROUP_REACTIVE_COMPACT_RETRY_LEASE_MS: number;
export declare function getGroupReactiveCompactRetryOwnershipFile(groupId: string, groupSessionId: string): string;
export declare function verifyGroupReactiveCompactRetryOwnership(ledger: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readGroupReactiveCompactRetryOwnership(groupId: string, groupSessionId: string): any;
export declare function claimGroupReactiveCompactRetry(input?: any): {
    status: string;
    acquired: boolean;
    ledger: any;
    issues: any;
    entry?: undefined;
    idempotent?: undefined;
    reclaimed?: undefined;
} | {
    status: string;
    acquired: boolean;
    entry: any;
    ledger: any;
    issues?: undefined;
    idempotent?: undefined;
    reclaimed?: undefined;
} | {
    status: string;
    acquired: boolean;
    entry: any;
    ledger: any;
    idempotent: boolean;
    issues?: undefined;
    reclaimed?: undefined;
} | {
    status: string;
    acquired: boolean;
    reclaimed: boolean;
    entry: {
        schema: string;
        entry_id: string;
        channel: string;
        retry_epoch: string;
        state: string;
        claim_id: string;
        fencing_token: number;
        claim_generation: number;
        reclaimed: boolean;
        owner_pid: number;
        owner_hostname: string;
        lease_expires_at: string;
        request_fingerprint: string;
        context_checksum: string;
        input_chars: number;
        output_chars: number;
        claimed_at: string;
        completed_at: string;
        outcome_reason: string;
        error_class: string;
        error_fingerprint: string;
    };
    ledger: any;
    issues?: undefined;
    idempotent?: undefined;
};
export declare function completeGroupReactiveCompactRetry(input?: any): {
    status: string;
    accepted: boolean;
    ledger: any;
    issues: any;
    entry?: undefined;
} | {
    status: string;
    accepted: boolean;
    ledger: any;
    issues?: undefined;
    entry?: undefined;
} | {
    status: string;
    accepted: boolean;
    entry: any;
    ledger: any;
    issues?: undefined;
};
export declare function deleteGroupReactiveCompactRetryOwnership(groupId: string, groupSessionId: string): {
    deleted: number;
    groupId: string;
    groupSessionId: string;
    file: string;
};
