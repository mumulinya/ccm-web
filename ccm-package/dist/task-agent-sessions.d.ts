export type TaskAgentSession = {
    id: string;
    scopeId: string;
    taskId: string;
    groupId: string;
    project: string;
    agentType: string;
    nativeSessionId: string;
    resumeMode: "native" | "scratchpad";
    status: "open" | "closed";
    turnCount: number;
    lastTurnSucceeded: boolean | null;
    createdAt: string;
    lastUsedAt: string;
    closedAt: string;
    closeReason: string;
    nativeCaptureFailures?: number;
    nativeRecoveryAttempts?: number;
    nativeSessionHistory?: string[];
    lastNativeRecoveryAt?: string;
    lastError?: string;
    permissionDriftCount?: number;
    lastPermissionDriftAt?: string;
};
export declare function openTaskAgentSession(input: {
    scopeId: string;
    taskId?: string;
    groupId: string;
    project: string;
    agentType: string;
}): any;
export declare function recordTaskAgentSessionTurn(sessionId: string, result?: {
    nativeSessionId?: string;
    success?: boolean;
    error?: string;
    nativeSessionInvalid?: boolean;
    permissionDrift?: boolean;
}): TaskAgentSession;
export declare function advanceTaskAgentSession(current: TaskAgentSession, result?: {
    nativeSessionId?: string;
    success?: boolean;
    error?: string;
    nativeSessionInvalid?: boolean;
    permissionDrift?: boolean;
}): TaskAgentSession;
export declare function closeTaskAgentSessions(input: {
    scopeId?: string;
    taskId?: string;
    groupId?: string;
}, reason?: string): TaskAgentSession[];
export declare function reopenTaskAgentSessions(taskId: string, reason?: string): TaskAgentSession[];
export declare function getTaskAgentSessionOptions(session: TaskAgentSession): {
    sessionId: string;
    resumeSession: boolean;
    persistSession: boolean;
};
export declare function getTaskAgentSessionContinuity(session: TaskAgentSession): {
    mode: "native" | "scratchpad";
    native: boolean;
    degraded: boolean;
    reason: string;
    turnCount: number;
    recoveryAttempts: number;
    previousNativeSessionIds: string[];
};
export declare function listTaskAgentSessions(filter?: {
    scopeId?: string;
    taskId?: string;
    groupId?: string;
    project?: string;
    status?: string;
}): any;
export declare function purgeTaskAgentSessions(taskId: string): any;
export declare function reconcileTaskAgentSessions(tasks: any[], nowMs?: number): {
    closed: number;
    sessions: TaskAgentSession[];
};
export declare function shouldCloseTaskAgentSessions(input: {
    taskId?: string;
    reviewStatus?: string;
    taskStatus?: string;
}): boolean;
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
        permissionDriftRebuildsNativeSession: boolean;
    };
};
