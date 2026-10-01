export type ExecutionSessionStatus = "created" | "ready" | "running" | "paused" | "verifying" | "repairing" | "blocked" | "completed" | "failed" | "cancelled";
export type ExecutionSession = {
    id: string;
    taskId: string;
    workItemId: string;
    projectId: string;
    generation: number;
    status: ExecutionSessionStatus;
    currentRuntimeBindingId?: string;
    attemptIds: string[];
    evidenceIds: string[];
    failureRecordIds: string[];
    createdAt: string;
    updatedAt: string;
    contentStored: false;
};
export type RuntimeBinding = {
    id: string;
    executionSessionId: string;
    runtimeType: "CLAUDE_CODE" | "CODEX" | "GEMINI" | "CUSTOM";
    providerSessionId?: string;
    agentId?: string;
    status: "active" | "paused" | "lost" | "replaced" | "closed";
    boundAt: string;
    lastSeenAt?: string;
    contentStored: false;
};
export declare function createExecutionSession(input: {
    taskId: string;
    workItemId: string;
    projectId: string;
    generation?: number;
}): ExecutionSession;
export declare function getExecutionSession(sessionId: string): ExecutionSession | null;
export declare function listExecutionSessions(taskId: string): ExecutionSession[];
export declare function transitionExecutionSession(sessionId: string, status: ExecutionSessionStatus): {
    status: ExecutionSessionStatus;
    updatedAt: string;
    id: string;
    taskId: string;
    workItemId: string;
    projectId: string;
    generation: number;
    currentRuntimeBindingId?: string;
    attemptIds: string[];
    evidenceIds: string[];
    failureRecordIds: string[];
    createdAt: string;
    contentStored: false;
};
export declare function bindRuntimeSession(sessionId: string, input: {
    runtimeType: RuntimeBinding["runtimeType"];
    providerSessionId?: string;
    agentId?: string;
}): RuntimeBinding;
export declare function listRuntimeBindings(sessionId: string): any[];
/** Update a runtime binding without changing the authoritative execution session. */
export declare function updateRuntimeBinding(bindingId: string, status: RuntimeBinding["status"], lastSeenAt?: string): {
    status: "paused" | "active" | "closed" | "lost" | "replaced";
    lastSeenAt: string;
    contentStored: false;
    id: string;
    executionSessionId: string;
    runtimeType: "CLAUDE_CODE" | "CODEX" | "GEMINI" | "CUSTOM";
    providerSessionId?: string;
    agentId?: string;
    boundAt: string;
};
/** Rebind only the runtime implementation; WorkItem and ExecutionSession IDs stay stable. */
export declare function replaceRuntimeSession(sessionId: string, input: {
    runtimeType: RuntimeBinding["runtimeType"];
    providerSessionId?: string;
    agentId?: string;
}): RuntimeBinding;
export declare function appendExecutionAttempt(sessionId: string, attemptId: string): {
    attemptIds: string[];
    updatedAt: string;
    id: string;
    taskId: string;
    workItemId: string;
    projectId: string;
    generation: number;
    status: ExecutionSessionStatus;
    currentRuntimeBindingId?: string;
    evidenceIds: string[];
    failureRecordIds: string[];
    createdAt: string;
    contentStored: false;
};
