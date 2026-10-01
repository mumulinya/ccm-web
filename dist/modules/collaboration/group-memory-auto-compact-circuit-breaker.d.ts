import { AutoCompactFailureMode } from "./group-memory-auto-compact-circuit-policy";
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
/** 读取台账并按冷却策略推导本次调度是否放行（closed / half_open 试探 / open）。 */
export declare function readGroupMemoryAutoCompactCircuitAdmission(groupId: string, groupSessionId: string, options?: any): {
    ledger: any;
    schema: string;
    allowed: boolean;
    effectiveState: string;
    probe: boolean;
    failureMode: AutoCompactFailureMode;
    reason: string;
    cooldownMs: number;
    elapsedMs: number;
    retryAt: string;
};
/**
 * 人工重置：把熔断台账写回 closed。相较直接删除文件，这里保留 revision 与
 * 重置事件，便于审计「谁在什么时候解开了熔断」。
 */
export declare function resetGroupMemoryAutoCompactCircuitBreaker(groupId: string, groupSessionId: string, options?: any): any;
export declare function deleteGroupMemoryAutoCompactCircuitBreaker(groupId: string, groupSessionId: string): {
    deleted: number;
    groupId: string;
    groupSessionId: string;
    file: string;
};
