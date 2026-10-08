export type ActivityActorType = "user" | "agent" | "runtime" | "system";
export interface AgentActivityEvent {
    eventId: string;
    taskId: string;
    runId: string;
    wakeId: string;
    traceId: string;
    actorType: ActivityActorType;
    actorId: string;
    eventType: string;
    summary: string;
    payload: any;
    payloadRef: string;
    idempotencyKey: string;
    previousChecksum: string;
    checksum: string;
    createdAt: string;
}
export interface AgentComment {
    commentId: string;
    taskId: string;
    runId: string;
    traceId: string;
    authorType: ActivityActorType;
    authorId: string;
    body: string;
    bodyChecksum: string;
    idempotencyKey: string;
    heartbeatWakeId: string;
    createdAt: string;
}
export type AgentApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";
export interface AgentApproval {
    approvalId: string;
    taskId: string;
    runId: string;
    traceId: string;
    actionType: string;
    actionFingerprint: string;
    requestedBy: string;
    decisionBy: string;
    status: AgentApprovalStatus;
    reason: string;
    requestedAt: string;
    decidedAt: string;
    expiresAt: string;
    idempotencyKey: string;
    payload: any;
}
export type AgentManualAction = "pause" | "resume" | "cancel" | "retry" | "recover" | "reassign" | "release_lease" | "mark_recovery_required";
export interface AgentTaskCheckout {
    checkoutId: string;
    taskId: string;
    runId: string;
    traceId: string;
    workspacePath: string;
    worktreeId: string;
    ownerId: string;
    leaseId: string;
    status: "active" | "released" | "expired" | "blocked";
    acquiredAt: string;
    expiresAt: string;
    releasedAt: string;
}
export interface AgentHeartbeatContext {
    wakeId: string;
    runId: string;
    nativeSessionId: string;
    baseContextChecksum: string;
    contextCursor: string;
    contextDeltaChecksum: string;
    promptFingerprint: string;
    promptInputTokens: number;
    promptOutputTokens: number;
    reuseMode: "native_session_delta" | "native_session_full" | "fresh_session";
    capturedAt: string;
}
export interface AgentBudgetPolicy {
    policyId: string;
    scopeType: "global" | "project" | "agent" | "run";
    scopeId: string;
    period: "run" | "day" | "week" | "month";
    tokenLimit: number | null;
    costLimitUsd: number | null;
    warningRatio: number;
    hardStopRatio: number;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface AgentBudgetDecision {
    allowed: boolean;
    warning: boolean;
    hardStop: boolean;
    policy: AgentBudgetPolicy | null;
    tokenUsed: number;
    costUsedUsd: number;
    reason: string;
}
export interface AgentRunArtifact {
    artifactId: string;
    runId: string;
    taskId: string;
    kind: "diff" | "file" | "test_evidence" | "receipt" | "report" | "external";
    name: string;
    path: string;
    externalRef: string;
    checksum: string;
    contentType: string;
    sizeBytes: number;
    retentionStatus: string;
    createdAt: string;
}
export interface AgentTaskDependency {
    dependencyId: string;
    taskId: string;
    dependsOnTaskId: string;
    relation: "blocks" | "related";
    status: "active" | "released" | "failed";
    createdAt: string;
    releasedAt: string;
}
export interface AgentRunSecretBinding {
    bindingId: string;
    runId: string;
    secretRef: string;
    scope: "project" | "agent" | "runtime" | "run";
    envName: string;
    status: "requested" | "injected" | "revoked" | "failed";
    createdAt: string;
    revokedAt: string;
}
export interface AgentRoutineRun {
    routineRunId: string;
    routineId: string;
    scheduleWindowId: string;
    triggerType: string;
    runId: string;
    status: "queued" | "coalesced" | "running" | "succeeded" | "failed" | "skipped";
    catchUp: boolean;
    createdAt: string;
    updatedAt: string;
}
