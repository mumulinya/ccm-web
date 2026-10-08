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
}
export interface PersistentAgentExecutionResult {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
}
/** Synchronous path for process tracking, which cannot await resume inspection. */
export declare function startPersistentAgentExecutionSync(input: PersistentAgentExecutionInput): PersistentAgentExecutionResult;
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
} | {
    action: "pause";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease?: undefined;
} | {
    action: "mark_recovery_required";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease?: undefined;
} | {
    action: "release_lease";
    activity: import("./agent-governance-types").AgentActivityEvent;
    run: AgentRun;
    lease: {
        released: boolean;
        reason: string;
        run: AgentRun;
    };
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
    action: "resume" | "recover";
    activity: import("./agent-governance-types").AgentActivityEvent;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest | null;
    lease: any;
    mode: "created" | "coalesced" | "resumed" | "retried" | "blocked";
    reason?: string;
    checkout?: any;
    budget?: any;
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
    action: "reassign";
    activity: import("./agent-governance-types").AgentActivityEvent;
}>;
