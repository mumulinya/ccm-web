export declare const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_POLICY_VERSION = 1;
export declare const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_COOLDOWN_MS: number;
export declare const GROUP_MEMORY_AUTO_COMPACT_CIRCUIT_MAX_BACKOFF_STEPS = 4;
export type AutoCompactFailureMode = "transient" | "structural" | "cancelled";
export declare function classifyAutoCompactFailure(error: any): {
    failureMode: AutoCompactFailureMode;
    errorClass: string;
    countsTowardCircuit: boolean;
};
export declare function autoCompactCircuitCooldownMs(openCount: number, cooldownMs?: number): number;
/**
 * 判断本次调度是否放行。持久化状态只有 closed/open；half_open 是读取时按冷却推导的
 * 一次性试探，避免改动台账 schema 版本导致历史文件校验失败。
 */
export declare function evaluateAutoCompactCircuitAdmission(ledger?: any, options?: any): {
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
 * 展示态：把「真正阻断调度的硬熔断」与「模型摘要降级的软计数」分开，
 * 供 API 与前端使用，避免二者互相冒充。
 */
export declare function buildAutoCompactCircuitDisplayState(input?: any): {
    schema: string;
    circuitOpen: boolean;
    circuitState: string;
    circuitEffectiveState: string;
    circuitFailureMode: AutoCompactFailureMode;
    circuitConsecutiveFailures: number;
    circuitAutoRetryAt: string;
    circuitRequiresManualReset: boolean;
    summaryDegraded: boolean;
    summaryFallbackFailures: number;
    summaryFallbackLimit: number;
};
