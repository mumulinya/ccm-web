export { FINAL_DISPATCH_REACTIVE_COMPACT_MAX_CONSECUTIVE_FAILURES, TaskAgentMemoryContextSnapshotRef, TaskAgentSession, verifyTaskAgentMemorySnapshotSyncDecision, verifyTaskAgentMemoryPromptInjectionProof, verifyTaskAgentMemorySnapshotSyncCommit, verifyMemoryContextDeliveryReceiptChecksum } from "./agent-sessions-shared";
export { prepareTaskAgentMemoryEntrySyncContext, verifyTaskAgentMemoryEntryRenderContentionReceipt, prepareTaskAgentMemoryEntrySyncContextWithRetry, bindTaskAgentMemoryContextSnapshot, attachTaskAgentFinalDispatchPayloadGate } from "./agent-sessions-bind";
export { recordTaskAgentMemoryContextDelivery, readTaskAgentMemoryContextDeliveryReceipt, } from "./agent-sessions-delivery";
export { listTaskAgentMemoryContextSnapshots, buildTaskAgentMemoryContextSnapshotInventory, } from "./agent-sessions-inventory";
export { TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_MINIMUM_SAMPLES, TASK_AGENT_MEMORY_TRANSPORT_USAGE_COHORT_SCHEMA, buildTaskAgentMemoryTransportUsageCohortReport, verifyTaskAgentMemoryTransportUsageCohortReport, } from "./task-agent-memory-transport-usage-cohorts";
export { openTaskAgentSession, recordTaskAgentSessionTurn, verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker, inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker, recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome, advanceTaskAgentSession, reopenTaskAgentSessions, getTaskAgentSessionOptions, getTaskAgentSessionContinuity, listTaskAgentSessions, markTaskAgentSessionsForCapacityDowngrade, verifyTaskAgentSessionCapacityRevalidationProof, verifyTaskAgentSessionCapacityRevalidationCommitReceipt, prepareTaskAgentSessionCapacityRevalidation, commitTaskAgentSessionCapacityRevalidation, acknowledgeTaskAgentSessionCapacityRevalidation, runTaskAgentSessionModelIdentitySelfTest } from "./agent-sessions-resume";
export { closeTaskAgentSessions, pruneTaskAgentMemoryContextSnapshots, purgeTaskAgentSessions, reconcileTaskAgentSessions, shouldCloseTaskAgentSessions } from "./agent-sessions-purge";
export declare function runTaskAgentSessionSelfTest(): {
    pass: boolean;
    checks: {
        persistsNativeSession: boolean;
        resumesAfterFirstTurn: boolean;
        preservesNativeId: boolean;
        cursorUsesNativeContinuation: boolean;
        persistentTaskWaitsForDoneState: boolean;
        persistentTaskClosesAfterDoneState: boolean;
        persistentTaskKeepsSessionOnFailed: boolean;
        persistentTaskKeepsSessionOnPaused: boolean;
        persistentTaskClosesAfterCancelled: boolean;
        persistentTaskClosesAfterArchived: boolean;
        conversationalTaskClosesAfterReview: boolean;
        missingNativeIdCanDegradeSafely: boolean;
        capturedNativeIdStaysResumable: boolean;
        invalidNativeSessionCreatesRecoveryPath: boolean;
        runtimeSnapshotPersistsAcrossTurns: boolean;
        permissionDriftRebuildsNativeSession: boolean;
        taskAgentMemoryContextSnapshotBindsSession: boolean;
    };
};
