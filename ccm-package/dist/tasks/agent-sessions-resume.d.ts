import { TaskAgentSession } from "./agent-sessions-shared";
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
    nativeContinuationUnverified?: boolean;
    nativeContinuationEvidence?: any;
    permissionDrift?: boolean;
    runtimeToolSnapshot?: any;
    modelCapabilityRecord?: any;
    nativeModelCapabilityRecord?: any;
}): TaskAgentSession;
export declare function verifyTaskAgentFinalDispatchReactiveCompactCircuitBreaker(state: any, expected?: any): {
    valid: boolean;
    issues: string[];
};
export declare function inspectTaskAgentFinalDispatchReactiveCompactCircuitBreaker(sessionId: string, input?: any): any;
export declare function recordTaskAgentFinalDispatchReactiveCompactCircuitOutcome(sessionId: string, input?: any): any;
export declare function advanceTaskAgentSession(current: TaskAgentSession, result?: {
    nativeSessionId?: string;
    success?: boolean;
    error?: string;
    nativeSessionInvalid?: boolean;
    nativeContinuationUnverified?: boolean;
    nativeContinuationEvidence?: any;
    permissionDrift?: boolean;
    runtimeToolSnapshot?: any;
    modelCapabilityRecord?: any;
    nativeModelCapabilityRecord?: any;
}): TaskAgentSession;
export declare function reopenTaskAgentSessions(taskId: string, reason?: string): TaskAgentSession[];
export declare function getTaskAgentSessionOptions(session: TaskAgentSession): {
    sessionId: string;
    resumeSession: boolean;
    persistSession: boolean;
    expectedProviderContractId: string;
    providerContractId: string;
    providerRuntimeVersion: string;
    runtimeSnapshotId: string;
    mcpConfigPath: string;
};
export declare function getTaskAgentSessionContinuity(session: TaskAgentSession): {
    mode: "native" | "scratchpad";
    native: boolean;
    degraded: boolean;
    reason: string;
    turnCount: number;
    recoveryAttempts: number;
    previousNativeSessionIds: string[];
    runtimeSnapshotId: string;
    mcpConfigPath: string;
    runtimeToolUpdatedAt: string;
    providerContractId: string;
    pendingProviderContractId: string;
    providerRuntimeVersion: string;
    providerContractHistory: any[];
};
export declare function listTaskAgentSessions(filter?: {
    scopeId?: string;
    taskId?: string;
    groupId?: string;
    groupSessionId?: string;
    group_session_id?: string;
    project?: string;
    status?: string;
}): any;
export declare function markTaskAgentSessionsForCapacityDowngrade(input?: any): {
    marked: number;
    sessions: any[];
} | {
    marked: number;
    sessions: any[];
    reason: string;
};
export declare function verifyTaskAgentSessionCapacityRevalidationProof(proof: any, session?: TaskAgentSession | null): {
    valid: boolean;
    issues: string[];
};
export declare function verifyTaskAgentSessionCapacityRevalidationCommitReceipt(receipt: any, proof?: any): {
    valid: boolean;
    issues: string[];
};
export declare function prepareTaskAgentSessionCapacityRevalidation(sessionId: string, packet?: any): {
    prepared: boolean;
    required: boolean;
    proof: any;
    session: any;
    reason: any;
};
export declare function commitTaskAgentSessionCapacityRevalidation(sessionId: string, proof: any, dispatchWitness?: any): {
    acknowledged: boolean;
    committed: boolean;
    idempotent: boolean;
    receipt: any;
    session: any;
    reason: string;
    issues?: undefined;
    proof?: undefined;
} | {
    acknowledged: boolean;
    committed: boolean;
    session: any;
    reason: string;
    issues: string[];
    idempotent?: undefined;
    receipt?: undefined;
    proof?: undefined;
} | {
    acknowledged: boolean;
    committed: boolean;
    session: any;
    reason: string;
    idempotent?: undefined;
    receipt?: undefined;
    issues?: undefined;
    proof?: undefined;
} | {
    acknowledged: boolean;
    committed: boolean;
    proof: any;
    receipt: any;
    session: any;
    reason: string;
    idempotent?: undefined;
    issues?: undefined;
};
export declare function acknowledgeTaskAgentSessionCapacityRevalidation(sessionId: string, packet?: any, dispatchWitness?: any): {
    acknowledged: boolean;
    committed: boolean;
    idempotent: boolean;
    receipt: any;
    session: any;
    reason: string;
    issues?: undefined;
    proof?: undefined;
} | {
    acknowledged: boolean;
    committed: boolean;
    session: any;
    reason: string;
    issues: string[];
    idempotent?: undefined;
    receipt?: undefined;
    proof?: undefined;
} | {
    acknowledged: boolean;
    committed: boolean;
    session: any;
    reason: string;
    idempotent?: undefined;
    receipt?: undefined;
    issues?: undefined;
    proof?: undefined;
} | {
    acknowledged: boolean;
    committed: boolean;
    proof: any;
    receipt: any;
    session: any;
    reason: string;
    idempotent?: undefined;
    issues?: undefined;
} | {
    prepared: boolean;
    required: boolean;
    proof: any;
    session: any;
    reason: any;
    acknowledged: boolean;
    committed: boolean;
};
export declare function runTaskAgentSessionModelIdentitySelfTest(): {
    pass: boolean;
    checks: {
        permissionDriftClearsActiveModel: boolean;
        permissionDriftArchivesIdentity: boolean;
        modelIdPersists: boolean;
        contextWindowPersists: boolean;
        evidenceChecksumPersists: boolean;
        sourceAndTimePersist: boolean;
        nativeSessionContinuityPreserved: boolean;
        verifiedIdentityAddedToHistory: boolean;
    };
    session: TaskAgentSession;
    drifted: TaskAgentSession;
};
