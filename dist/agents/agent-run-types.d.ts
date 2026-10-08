import type { AgentRuntimeDescriptor } from "./runtime";
export declare const AGENT_RUN_STATUS_VALUES: readonly ["created", "queued", "leased", "starting", "running", "waiting_confirmation", "waiting_input", "paused", "recovery_required", "recovering", "succeeded", "failed", "cancelled"];
export type AgentRunStatus = typeof AGENT_RUN_STATUS_VALUES[number];
export type RunStatus = AgentRunStatus;
export type AgentRunScope = "project" | "group" | "global" | "test_agent" | "automation";
export type AgentRunTrigger = "user" | "schedule" | "heartbeat" | "resume" | "retry";
export type RunScope = AgentRunScope;
export type RunTrigger = AgentRunTrigger;
export interface AgentRun {
    runId: string;
    traceId: string;
    taskId: string;
    attemptId: string;
    parentRunId: string;
    scope: AgentRunScope;
    scopeId: string;
    agentId: string;
    runtimeId: string;
    runtimeVersionSnapshot: any;
    taskAgentSessionId: string;
    nativeSessionId: string;
    executionId: string;
    workspacePath: string;
    worktreeId: string;
    workspaceEvidence: AgentRunWorkspaceEvidence | null;
    triggerType: AgentRunTrigger;
    status: AgentRunStatus;
    leaseId: string;
    leaseOwnerId: string;
    leaseExpiresAt: string;
    leaseVersion: number;
    idempotencyKey: string;
    source: string;
    startedAt: string;
    lastHeartbeatAt: string;
    finishedAt: string;
    result: any;
    error: any;
    createdAt: string;
    updatedAt: string;
}
export interface AgentRunEvent {
    eventId: string;
    runId: string;
    sequence: number;
    eventType: string;
    status: AgentRunStatus | "";
    message: string;
    payload: any;
    payloadRef: string;
    idempotencyKey: string;
    previousChecksum: string;
    checksum: string;
    createdAt: string;
}
export type RunEvent = AgentRunEvent;
export interface AgentRunUsage {
    usageId: string;
    runId: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    cost: number;
    provenance: string;
    payload: any;
    createdAt: string;
}
export type UsageRecord = AgentRunUsage;
export interface ResumeInspection {
    resumable: boolean;
    nativeSessionValid: boolean;
    workspaceValid: boolean;
    runtimeVersionCompatible: boolean;
    reason: string;
    evidence?: any;
}
export interface AgentRunWorkspaceEvidence {
    runId: string;
    workspacePath: string;
    worktreeId: string;
    repositoryRoot: string;
    headCommit: string;
    statusChecksum: string;
    indexChecksum: string;
    contentChecksum: string;
    capturedAt: string;
}
export interface AgentRunContext {
    runId?: string;
    traceId?: string;
    taskId?: string;
    attemptId?: string;
    parentRunId?: string;
    scope?: AgentRunScope | string;
    scopeId?: string;
    agentId?: string;
    runtimeId: string;
    runtimeVersionSnapshot?: any;
    taskAgentSessionId?: string;
    nativeSessionId?: string;
    executionId?: string;
    workspacePath?: string;
    worktreeId?: string;
    workspaceEvidence?: AgentRunWorkspaceEvidence | null;
    triggerType?: AgentRunTrigger | string;
    leaseId?: string;
    leaseOwnerId?: string;
    leaseExpiresAt?: string;
    leaseVersion?: number;
    idempotencyKey?: string;
    source?: string;
}
export interface RuntimeHandle {
    id: string;
    runId: string;
    provider: string;
    nativeSessionId?: string;
    pid?: number;
    cancel?: () => Promise<void> | void;
}
export interface RuntimeEvent {
    type: string;
    status?: AgentRunStatus | string;
    message?: string;
    payload?: any;
    payloadRef?: string;
    idempotencyKey?: string;
}
export interface RuntimeResult {
    success: boolean;
    output?: string;
    error?: any;
    nativeSessionId?: string;
    usage?: any;
    payload?: any;
}
export declare function normalizeAgentRunScope(value: any): AgentRunScope;
export declare function normalizeAgentRunTrigger(value: any): AgentRunTrigger;
export declare function runtimeDescriptorToPublicSnapshot(descriptor: AgentRuntimeDescriptor | null | undefined): {
    id: "claudecode" | "codex" | "cursor" | "gemini" | "opencode" | "qoder";
    label: string;
    commandLabel: string;
    capabilities: {
        print?: boolean;
        streaming?: boolean;
        externalRunner?: boolean;
        worktreeIsolation?: boolean;
        sessionResume?: boolean;
        scratchpadContinuation?: boolean;
        nativeWorkspaceEditing?: boolean;
    };
};
