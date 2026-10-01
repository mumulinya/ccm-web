export declare const PROVIDER_TASK_CIRCUIT_SCHEMA = "ccm-provider-task-circuit-v1";
export declare const PROVIDER_TASK_CIRCUIT_COOLDOWNS_MS: readonly [number, number, number, number];
export type ProviderTaskCircuit = {
    schema: typeof PROVIDER_TASK_CIRCUIT_SCHEMA;
    state: "open" | "closed";
    failureClass: "llm-error";
    consecutiveFailures: number;
    openedAt: string;
    retryAfter: string;
    cooldownMs: number;
    reason: string;
    modelAttempts: number;
    providerElapsedMs: number;
    closedAt?: string;
    closeReason?: string;
};
export declare function readTaskProviderCircuit(task: any): ProviderTaskCircuit | null;
export declare function getTaskProviderCircuitGate(task: any, nowMs?: number): {
    blocked: boolean;
    circuit: ProviderTaskCircuit;
    retryAfterMs: number;
    remainingMs: number;
};
export declare function openTaskProviderCircuit(task: any, failure?: any, options?: {
    nowMs?: number;
    reason?: string;
}): ProviderTaskCircuit;
export declare function closeTaskProviderCircuit(task: any, reason?: string, nowMs?: number): ProviderTaskCircuit | null;
export declare function formatTaskProviderCircuitMessage(circuit: ProviderTaskCircuit | null): string;
export declare function runProviderTaskCircuitSelfTest(): {
    pass: boolean;
    checks: {
        firstFailureUsesFiveMinuteCooldown: boolean;
        openCircuitBlocksQueue: boolean;
        expiredCircuitAllowsHalfOpenAttempt: boolean;
        repeatedFailureEscalatesCooldown: boolean;
        successfulAttemptClosesCircuit: boolean;
    };
};
