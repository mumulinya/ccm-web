import type Database from "better-sqlite3";
import { type AgentRun, type AgentRunContext, type AgentRunEvent, type AgentRunStatus, type AgentRunUsage } from "./agent-run-types";
export declare function getAgentRunInTransaction(db: Database.Database, runId: string): AgentRun;
export declare function getAgentRun(runId: string): AgentRun;
export declare function getAgentRunByIdempotencyKey(key: string): AgentRun;
export declare function listAgentRuns(filters?: any): AgentRun[];
export declare function listAgentRunEvents(runId: string, limit?: number): AgentRunEvent[];
export declare function verifyAgentRunEventLedger(runId: string): {
    valid: boolean;
    count: number;
    issues: string[];
};
/**
 * Transaction-local Run creation. Callers that already own an IMMEDIATE
 * transaction (Heartbeat coordination, recovery, etc.) use this function so
 * the Run row and its first ledger event commit with the caller's records.
 */
export declare function createAgentRunInTransaction(db: Database.Database, input: AgentRunContext): {
    run: AgentRun;
    created: boolean;
};
export declare function createAgentRun(input: AgentRunContext): {
    run: AgentRun;
    created: boolean;
};
export declare function ensureAgentRun(input: AgentRunContext): AgentRun;
export declare function transitionAgentRunInTransaction(db: Database.Database, runId: string, status: AgentRunStatus, message?: string, extra?: any): AgentRun;
export declare function transitionAgentRun(runId: string, status: AgentRunStatus, message?: string, extra?: any): AgentRun;
/** Transaction-local lease acquisition for Heartbeat and recovery coordinators. */
export declare function claimAgentRunLeaseInTransaction(db: Database.Database, runId: string, ownerId: string, ttlMs?: number, requestedLeaseId?: string): {
    acquired: boolean;
    reason: string;
    run: AgentRun;
};
export declare function claimAgentRunLease(runId: string, ownerId: string, ttlMs?: number, requestedLeaseId?: string): {
    acquired: boolean;
    reason: string;
    run: AgentRun;
};
export declare function appendAgentRunEvent(runId: string, event: {
    eventType: string;
    status?: AgentRunStatus | "";
    message?: string;
    payload?: any;
    payloadRef?: string;
    idempotencyKey?: string;
}): {
    checksum: string;
    eventId: string;
    runId: string;
    sequence: number;
    eventType: string;
    status: string;
    message: string;
    payload: any;
    payloadRef: string;
    idempotencyKey: string;
    previousChecksum: string;
    createdAt: string;
};
export declare function touchAgentRunLease(runId: string, leaseId?: string): AgentRun;
/** Persist provider/session bindings discovered after a Runtime starts. */
export declare function updateAgentRunBindings(runId: string, patch: {
    taskAgentSessionId?: string;
    nativeSessionId?: string;
    workspacePath?: string;
    worktreeId?: string;
    workspaceEvidence?: any;
    executionId?: string;
    runtimeVersionSnapshot?: any;
}): AgentRun;
export declare function heartbeatAgentRunLease(runId: string, ownerId: string, leaseId?: string, ttlMs?: number): {
    renewed: boolean;
    reason: string;
    run: AgentRun;
};
export declare function releaseAgentRunLease(runId: string, ownerId: string, leaseId?: string): {
    released: boolean;
    reason: string;
    run: AgentRun;
};
export declare function expireAgentRunLeases(nowMs?: number): {
    checked: number;
    expired: number;
};
/** Recover an expired run in place when session/workspace evidence is usable; otherwise fork a linked run. */
export declare function recoverAgentRun(runId: string, options?: any): {
    recovered: boolean;
    reason: string;
    run: AgentRun;
    mode?: undefined;
    parentRunId?: undefined;
    created?: undefined;
} | {
    recovered: boolean;
    mode: string;
    run: AgentRun;
    reason?: undefined;
    parentRunId?: undefined;
    created?: undefined;
} | {
    recovered: boolean;
    mode: string;
    parentRunId: string;
    run: AgentRun;
    created: boolean;
    reason?: undefined;
};
export declare function recordAgentRunUsage(runId: string, usage: any, meta?: any): string;
export declare function listAgentRunUsage(runId: string): AgentRunUsage[];
export declare function reconcileLegacyAgentRuns(): {
    checked: number;
    created: number;
};
/** Mark stale in-flight Runtime executions for explicit recovery after restart. */
export declare function reconcileAgentRunLeases(maxAgeMs?: number): {
    checked: number;
    recovered: number;
    expired: number;
};
export declare function buildAgentRunProjection(runId: string): {
    run_id: string;
    trace_id: string;
    task_id: string;
    attempt_id: string;
    runtime_id: string;
    run_status: "queued" | "paused" | "failed" | "cancelled" | "running" | "recovering" | "succeeded" | "waiting_confirmation" | "recovery_required" | "starting" | "created" | "leased" | "waiting_input";
    run_started_at: string;
    run_finished_at: string;
    run_recovery_state: string;
    lease_id: string;
    lease_owner_id: string;
    lease_expires_at: string;
};
export declare function buildTaskAgentRunProjection(task: any): {
    run_id: string;
    trace_id: string;
    task_id: string;
    attempt_id: string;
    runtime_id: string;
    run_status: "queued" | "paused" | "failed" | "cancelled" | "running" | "recovering" | "succeeded" | "waiting_confirmation" | "recovery_required" | "starting" | "created" | "leased" | "waiting_input";
    run_started_at: string;
    run_finished_at: string;
    run_recovery_state: string;
    lease_id: string;
    lease_owner_id: string;
    lease_expires_at: string;
};
/** Read-only operational snapshot used by health checks and diagnostics. */
export declare function getAgentRunMetrics(filters?: any): {
    run_count: number;
    by_status: {
        [k: string]: number;
    };
    by_runtime: {
        runtime_id: string;
        scope: string;
        status: string;
        count: number;
    }[];
    success_rate: number;
    failure_rate: number;
    average_start_ms: number;
    average_execution_ms: number;
    average_recovery_ms: number;
    usage: {
        records: number;
        input_tokens: number;
        output_tokens: number;
        cost: number;
    };
    provider_usage_missing: number;
    lease_expired: number;
};
