export declare const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_SCHEMA = "ccm-group-memory-auto-compact-circuit-breaker-v1";
export declare const GROUP_MEMORY_AUTO_COMPACT_MAX_CONSECUTIVE_FAILURES = 3;
export declare const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_BREAKER_DIR: string;
export declare function getGroupMemoryAutoCompactCircuitBreakerFile(groupId: string, groupSessionId: string): string;
export declare function verifyGroupMemoryAutoCompactCircuitBreaker(ledger: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function readGroupMemoryAutoCompactCircuitBreaker(groupId: string, groupSessionId: string): any;
export declare function recordGroupMemoryAutoCompactCircuitBreakerOutcome(input?: any): any;
export declare function deleteGroupMemoryAutoCompactCircuitBreaker(groupId: string, groupSessionId: string): {
    deleted: number;
    groupId: string;
    groupSessionId: string;
    file: string;
};
