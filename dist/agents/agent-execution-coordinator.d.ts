import type { AgentRun, AgentRunContext, AgentRunStatus } from "./agent-run-types";
import type { HeartbeatWakeRequest } from "./agent-heartbeat-types";
export interface PersistentAgentExecutionInput extends AgentRunContext {
    scope: NonNullable<AgentRunContext["scope"]>;
    scopeId: string;
    taskId: string;
    traceId: string;
    attemptId: string;
    agentId: string;
    runtimeId: string;
    triggerType: NonNullable<AgentRunContext["triggerType"]>;
    reason?: string;
    requestId?: string;
    leaseOwnerId?: string;
    leaseTtlMs?: number;
    routineRunId?: string;
}
export interface PersistentAgentExecutionResult {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
    runtimeProbe?: any;
}
/** Governance inputs request wake-ups through the same coordination boundary. */
export declare function requestPersistentAgentWake(input: any): {
    wake: HeartbeatWakeRequest;
    duplicate: boolean;
    coalesced: boolean;
    activeRun: AgentRun;
};
/** Call immediately before any Runtime side effect. A blocked projection is
 * not a permit, and a resumed wake without a lease belongs to the processor. */
export declare function assertPersistentExecutionLaunchAllowed(result: PersistentAgentExecutionResult): void;
/** Synchronous path for process tracking, which cannot await resume inspection. */
export declare function startPersistentAgentExecutionSync(input: PersistentAgentExecutionInput): PersistentAgentExecutionResult;
/** Approval must never launch a second process while the original is alive. */
export declare function continueApprovedDispatchScope(runId: string, requestId: string): Promise<{
    mode: string;
    reason: any;
    wakeId?: undefined;
} | {
    mode: string;
    wakeId: string;
    reason?: undefined;
}>;
/**
 * The only supported composition point for a new persistent Agent execution.
 * Existing callers can migrate incrementally while the lower-level store remains
 * available for legacy reconciliation and startup recovery.
 */
export declare function startPersistentAgentExecution(input: PersistentAgentExecutionInput): Promise<PersistentAgentExecutionResult>;
export declare function finalizePersistentAgentExecution(input: {
    runId: string;
    wakeId?: string;
    leaseOwnerId?: string;
    status: Extract<AgentRunStatus, "succeeded" | "failed" | "cancelled">;
    result?: any;
    error?: any;
    nativeSessionId?: string;
    taskAgentSessionId?: string;
    workspacePath?: string;
    worktreeId?: string;
    workspaceEvidence?: any;
    runtimeVersionSnapshot?: any;
    usage?: any;
    usageMeta?: any;
}): AgentRun;
export declare function markPersistentAgentExecutionStarted(runId: string, leaseId?: string): AgentRun;
/** Route recovery-blocked transitions through the same execution boundary as
 * terminal finalization. Entry points may request a recovery state, but they
 * do not compose a second Run lifecycle themselves. */
export declare function markPersistentAgentExecutionRecoveryRequired(runId: string, message?: string, error?: any): AgentRun;
export declare function relinkPersistentAgentExecution(input: AgentRunContext, ownerId: string, ttlMs?: number): {
    run: AgentRun;
    lease: {
        acquired: boolean;
        reason: string;
        run: AgentRun;
    };
};
export declare function claimPersistentAgentExecution(runId: string, ownerId: string, ttlMs?: number, leaseId?: string): {
    acquired: boolean;
    reason: string;
    run: AgentRun;
};
export declare function cancelPersistentAgentExecution(runId: string, ownerId?: string, reason?: string): AgentRun;
export declare function applyPersistentAgentManualAction(input: {
    runId: string;
    action: "pause" | "resume" | "cancel" | "retry" | "recover" | "reassign" | "release_lease" | "mark_recovery_required";
    actorId: string;
    idempotencyKey: string;
    reason?: string;
    ownerId?: string;
    runtimeId?: string;
    agentId?: string;
}): Promise<{
    action: "cancel";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease?: undefined;
    mode?: undefined;
} | {
    action: "pause";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease?: undefined;
    mode?: undefined;
} | {
    action: "mark_recovery_required";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease?: undefined;
    mode?: undefined;
} | {
    action: "release_lease";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease: {
        released: boolean;
        reason: string;
        run: AgentRun;
    };
    mode?: undefined;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
    runtimeProbe?: any;
    action: "resume" | "recover";
    activity: import("./agent-governance-types").AgentActivityEvent;
} | {
    action: "retry";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    mode: string;
    lease?: undefined;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
    runtimeProbe?: any;
    action: "retry";
    activity: import("./agent-governance-types").AgentActivityEvent;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
    runtimeProbe?: any;
    action: "reassign";
    activity: import("./agent-governance-types").AgentActivityEvent;
}>;
