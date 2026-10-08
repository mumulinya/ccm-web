import type Database from "better-sqlite3";
import { type AgentRun, type AgentRunStatus } from "./agent-run-types";
import { type HeartbeatWakeInput, type HeartbeatWakeRequest } from "./agent-heartbeat-types";
export declare function getAgentHeartbeat(wakeId: string): HeartbeatWakeRequest | null;
export declare function listAgentHeartbeats(filters?: any): HeartbeatWakeRequest[];
export declare function requestAgentHeartbeatInTransaction(db: Database.Database, input: HeartbeatWakeInput): {
    wake: HeartbeatWakeRequest;
    duplicate: boolean;
    coalesced: boolean;
    activeRun: AgentRun;
};
export declare function requestAgentHeartbeat(input: HeartbeatWakeInput): {
    wake: HeartbeatWakeRequest;
    duplicate: boolean;
    coalesced: boolean;
    activeRun: AgentRun;
};
export declare function coalesceAgentHeartbeat(input: HeartbeatWakeInput): HeartbeatWakeRequest;
/**
 * Bind an already-created legacy/入口 Run to the persistent heartbeat
 * ledger. This compatibility path lets existing executors adopt the
 * coordinator incrementally without creating a second Run.
 */
export declare function adoptAgentRunHeartbeat(runId: string, input?: HeartbeatWakeInput): {
    run: any;
    wake: any;
    adopted: boolean;
    rejected?: undefined;
    error?: undefined;
    duplicate?: undefined;
    coalesced?: undefined;
} | {
    run: AgentRun;
    wake: any;
    adopted: boolean;
    rejected: boolean;
    error: {
        code: string;
        source: string;
    };
    duplicate?: undefined;
    coalesced?: undefined;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest;
    adopted: boolean;
    duplicate: boolean;
    coalesced: boolean;
    rejected?: undefined;
    error?: undefined;
};
export declare function claimNextAgentHeartbeat(ownerId: string): HeartbeatWakeRequest | null;
/** Requeue claims left behind by a crashed worker or service restart. */
export declare function requeueStaleAgentHeartbeats(maxAgeMs?: number): {
    checked: number;
    requeued: number;
};
/**
 * A completed wake is an audit claim about a real execution. It may only be
 * marked completed when it points at a terminal AgentRun; otherwise the wake
 * is failed and the reason remains queryable for recovery reconciliation.
 */
export declare function completeAgentHeartbeat(wakeId: string, result?: any): HeartbeatWakeRequest;
export declare function failAgentHeartbeat(wakeId: string, error?: any): HeartbeatWakeRequest;
export declare function startHeartbeatRunInTransaction(db: Database.Database, wake: HeartbeatWakeRequest, ownerId: string, input?: HeartbeatWakeInput): {
    run: AgentRun;
    wake: HeartbeatWakeRequest;
    coalesced: boolean;
    lease?: undefined;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest;
    coalesced: boolean;
    lease: {
        acquired: boolean;
        reason: string;
        run: AgentRun;
    };
};
export declare function startHeartbeatRun(wake: HeartbeatWakeRequest, ownerId: string, input?: HeartbeatWakeInput): {
    run: AgentRun;
    wake: HeartbeatWakeRequest;
    coalesced: boolean;
    lease?: undefined;
} | {
    run: AgentRun;
    wake: HeartbeatWakeRequest;
    coalesced: boolean;
    lease: {
        acquired: boolean;
        reason: string;
        run: AgentRun;
    };
};
export type AgentHeartbeatWakeProcessor = (wake: HeartbeatWakeRequest, run: AgentRun | null) => Promise<any> | any;
/** Register the existing execution channel as the durable Heartbeat consumer. */
export declare function registerAgentHeartbeatProcessor(processor: AgentHeartbeatWakeProcessor | null): () => void;
/** Claim and dispatch one durable wake. The processor owns Provider side effects. */
export declare function processNextAgentHeartbeat(ownerId: string, processor?: AgentHeartbeatWakeProcessor | null): Promise<{
    processed: boolean;
    reason: string;
    wake?: undefined;
    run?: undefined;
    result?: undefined;
    error?: undefined;
} | {
    processed: boolean;
    reason: string;
    wake: HeartbeatWakeRequest;
    run: AgentRun;
    result?: undefined;
    error?: undefined;
} | {
    processed: boolean;
    wake: HeartbeatWakeRequest;
    run: AgentRun;
    result: any;
    reason?: undefined;
    error?: undefined;
} | {
    processed: boolean;
    reason: string;
    wake: HeartbeatWakeRequest;
    run: AgentRun;
    error: string;
    result?: undefined;
}>;
export declare function startAgentHeartbeatProcessor(options?: {
    ownerId?: string;
    intervalMs?: number;
    processor?: AgentHeartbeatWakeProcessor | null;
}): {
    started: boolean;
    alreadyRunning: boolean;
    intervalMs?: undefined;
    ownerId?: undefined;
} | {
    started: boolean;
    intervalMs: number;
    ownerId: string;
    alreadyRunning?: undefined;
};
export declare function stopAgentHeartbeatProcessor(): boolean;
export declare function finishHeartbeatRun(wakeId: string, runId: string, status: AgentRunStatus, resultOrError?: any, ownerId?: string): {
    wake: HeartbeatWakeRequest;
    run: AgentRun;
};
export declare function heartbeatMetrics(filters?: any): {
    wakeRequests: number;
    wakeQueued: number;
    wakeCoalesced: number;
    wakeFailed: number;
    activeRuns: number;
    leaseExpired: number;
    runtimeStatuses: {
        runtimeId: string;
        status: string;
        count: number;
    }[];
    duplicateIdempotencyHits: number;
    activeRunDuplicateStartBlocked: number;
    active_run_duplicate_blocked: number;
    heartbeatRequests: number;
    heartbeat_requests: number;
    heartbeat_coalesced: number;
    heartbeat_duplicate_idempotency: number;
    runCreated: number;
    run_created: number;
    runSucceeded: number;
    run_succeeded: number;
    runFailed: number;
    run_failed: number;
    runCancelled: number;
    run_cancelled: number;
    resumeAttempted: number;
    resumeSucceeded: number;
    resumeBlocked: number;
    receiptIdentityAmbiguous: number;
    receipt_identity_ambiguous: number;
    adoptionRejected: number;
    taskRunConsistencyRepairable: number;
    taskRunConsistencyBlocked: number;
    startupDurationMs: number;
    executionDurationMs: number;
    recoveryDurationMs: number;
    recoverySuccess: number;
    recoveryFailure: number;
    workspaceEvidenceFailures: any;
    workspace_evidence_failed: any;
    runtimeVersionIncompatible: any;
    runtime_version_incompatible: any;
    nativeSessionInvalid: any;
    native_session_invalid: any;
    usage: {
        records: number;
        inputTokens: number;
        outputTokens: number;
        cachedTokens: number;
        cost: number;
        unreported: number;
        providerUsageMissing: number;
        provider_usage_missing: number;
    };
    providerUsageMissing: number;
    provider_usage_missing: number;
    runtimeMetrics: {
        runtimeId: string;
        scope: string;
        total: number;
        succeeded: number;
        failed: number;
        successRate: number;
    }[];
    filters: {
        runtimeId: string;
        scope: string;
        status: string;
        from: string;
        to: string;
    };
};
