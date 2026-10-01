export declare const GROUP_SESSION_MEMORY_EXTRACTION_LEASE_TTL_MS = 60000;
export declare const GROUP_SESSION_MEMORY_EXTRACTION_WAIT_TIMEOUT_MS = 15000;
export declare const GROUP_SESSION_MEMORY_EXTRACTION_RETRY_BASE_MS = 30000;
export declare const GROUP_SESSION_MEMORY_EXTRACTION_RETRY_MAX_MS: number;
export declare function getGroupSessionMemoryExtractionLeaseFile(scopeId: string): string;
export declare function getGroupSessionMemoryExtractionStateFile(scopeId: string): string;
export declare function readGroupSessionMemoryExtractionState(scopeId: string): any;
export declare function inspectGroupSessionMemoryExtractionLease(scopeId: string, options?: any): {
    file: string;
    present: boolean;
    valid: boolean;
    active: boolean;
    stale: boolean;
    lease: any;
    checksumValid?: undefined;
    ownerAlive?: undefined;
    unexpired?: undefined;
} | {
    file: string;
    present: boolean;
    valid: boolean;
    checksumValid: boolean;
    ownerAlive: boolean;
    unexpired: boolean;
    active: boolean;
    stale: boolean;
    lease: any;
};
export declare function acquireGroupSessionMemoryExtractionLease(scopeId: string, options?: any): {
    acquired: boolean;
    reason: string;
    status: {
        file: string;
        present: boolean;
        valid: boolean;
        active: boolean;
        stale: boolean;
        lease: any;
        checksumValid?: undefined;
        ownerAlive?: undefined;
        unexpired?: undefined;
    } | {
        file: string;
        present: boolean;
        valid: boolean;
        checksumValid: boolean;
        ownerAlive: boolean;
        unexpired: boolean;
        active: boolean;
        stale: boolean;
        lease: any;
    };
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    recovered: boolean;
    handle: any;
    lease: any;
    reason?: undefined;
    status?: undefined;
    error?: undefined;
} | {
    acquired: boolean;
    reason: string;
    error: string;
    status?: undefined;
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
} | {
    acquired: boolean;
    reason: string;
    status?: undefined;
    recovered?: undefined;
    handle?: undefined;
    lease?: undefined;
    error?: undefined;
};
export declare function releaseGroupSessionMemoryExtractionLease(handle: any, finalStatus?: string): boolean;
export declare function verifyGroupSessionMemoryExtractionLease(handle: any, options?: any): {
    valid: boolean;
    active: boolean;
    owned: boolean;
    reason: string;
    status: {
        file: string;
        present: boolean;
        valid: boolean;
        active: boolean;
        stale: boolean;
        lease: any;
        checksumValid?: undefined;
        ownerAlive?: undefined;
        unexpired?: undefined;
    } | {
        file: string;
        present: boolean;
        valid: boolean;
        checksumValid: boolean;
        ownerAlive: boolean;
        unexpired: boolean;
        active: boolean;
        stale: boolean;
        lease: any;
    };
};
export declare function renewGroupSessionMemoryExtractionLease(handle: any, options?: any): {
    renewed: boolean;
    reason: string;
    verification: {
        valid: boolean;
        active: boolean;
        owned: boolean;
        reason: string;
        status: {
            file: string;
            present: boolean;
            valid: boolean;
            active: boolean;
            stale: boolean;
            lease: any;
            checksumValid?: undefined;
            ownerAlive?: undefined;
            unexpired?: undefined;
        } | {
            file: string;
            present: boolean;
            valid: boolean;
            checksumValid: boolean;
            ownerAlive: boolean;
            unexpired: boolean;
            active: boolean;
            stale: boolean;
            lease: any;
        };
    };
    lease?: undefined;
    error?: undefined;
} | {
    renewed: boolean;
    reason: string;
    verification: {
        valid: boolean;
        active: boolean;
        owned: boolean;
        reason: string;
        status: {
            file: string;
            present: boolean;
            valid: boolean;
            active: boolean;
            stale: boolean;
            lease: any;
            checksumValid?: undefined;
            ownerAlive?: undefined;
            unexpired?: undefined;
        } | {
            file: string;
            present: boolean;
            valid: boolean;
            checksumValid: boolean;
            ownerAlive: boolean;
            unexpired: boolean;
            active: boolean;
            stale: boolean;
            lease: any;
        };
    };
    lease: any;
    error?: undefined;
} | {
    renewed: boolean;
    reason: string;
    error: string;
    verification: {
        valid: boolean;
        active: boolean;
        owned: boolean;
        reason: string;
        status: {
            file: string;
            present: boolean;
            valid: boolean;
            active: boolean;
            stale: boolean;
            lease: any;
            checksumValid?: undefined;
            ownerAlive?: undefined;
            unexpired?: undefined;
        } | {
            file: string;
            present: boolean;
            valid: boolean;
            checksumValid: boolean;
            ownerAlive: boolean;
            unexpired: boolean;
            active: boolean;
            stale: boolean;
            lease: any;
        };
    };
    lease?: undefined;
};
export declare function waitForGroupSessionMemoryExtraction(scopeId: string, options?: any): Promise<{
    completed: boolean;
    timedOut: boolean;
    stale: boolean;
    status: {
        file: string;
        present: boolean;
        valid: boolean;
        active: boolean;
        stale: boolean;
        lease: any;
        checksumValid?: undefined;
        ownerAlive?: undefined;
        unexpired?: undefined;
    } | {
        file: string;
        present: boolean;
        valid: boolean;
        checksumValid: boolean;
        ownerAlive: boolean;
        unexpired: boolean;
        active: boolean;
        stale: boolean;
        lease: any;
    };
}>;
export declare function runGroupSessionMemoryExtractionTransaction(scopeId: string, operation: (transaction: any) => any, options?: any): {
    committed: boolean;
    status: any;
    acquired: any;
    value?: undefined;
    lease?: undefined;
    recovered?: undefined;
    state?: undefined;
    error?: undefined;
    superseded?: undefined;
} | {
    committed: boolean;
    status: string;
    value: any;
    lease: any;
    recovered: any;
    state: any;
    acquired?: undefined;
    error?: undefined;
    superseded?: undefined;
} | {
    committed: boolean;
    status: string;
    error: any;
    lease: any;
    recovered: any;
    superseded: boolean;
    state: any;
    acquired?: undefined;
    value?: undefined;
};
export declare function runGroupSessionMemoryExtractionTransactionAsync(scopeId: string, operation: (transaction: any) => Promise<any> | any, options?: any): Promise<{
    committed: boolean;
    status: string;
    retryAt: any;
    retryInMs: number;
    state: any;
    acquired?: undefined;
    value?: undefined;
    lease?: undefined;
    recovered?: undefined;
    error?: undefined;
    failureClass?: undefined;
    superseded?: undefined;
} | {
    committed: boolean;
    status: any;
    acquired: any;
    retryAt?: undefined;
    retryInMs?: undefined;
    state?: undefined;
    value?: undefined;
    lease?: undefined;
    recovered?: undefined;
    error?: undefined;
    failureClass?: undefined;
    superseded?: undefined;
} | {
    committed: boolean;
    status: string;
    value: any;
    lease: any;
    recovered: any;
    state: any;
    retryAt?: undefined;
    retryInMs?: undefined;
    acquired?: undefined;
    error?: undefined;
    failureClass?: undefined;
    superseded?: undefined;
} | {
    committed: boolean;
    status: string;
    error: string;
    failureClass: string;
    retryAt: any;
    retryInMs: number;
    lease: any;
    recovered: any;
    superseded: boolean;
    state: any;
    acquired?: undefined;
    value?: undefined;
}>;
