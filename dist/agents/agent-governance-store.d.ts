import type Database from "better-sqlite3";
import type { AgentActivityEvent, AgentApproval, AgentBudgetDecision, AgentBudgetPolicy, AgentComment, AgentHeartbeatContext, AgentRunArtifact, AgentRunSecretBinding, AgentTaskCheckout, AgentTaskDependency } from "./agent-governance-types";
export interface ActivityInput {
    taskId?: string;
    runId?: string;
    wakeId?: string;
    traceId?: string;
    actorType?: "user" | "agent" | "runtime" | "system";
    actorId?: string;
    eventType: string;
    summary?: string;
    payload?: any;
    payloadRef?: string;
    idempotencyKey: string;
}
export declare function recordAgentActivityInTransaction(db: Database.Database, input: ActivityInput): AgentActivityEvent;
export declare function recordAgentActivity(input: ActivityInput): AgentActivityEvent;
export declare function listAgentActivity(filters?: {
    taskId?: string;
    runId?: string;
    eventType?: string;
    limit?: number;
}): AgentActivityEvent[];
export declare function createAgentComment(input: {
    taskId: string;
    runId?: string;
    traceId?: string;
    authorType?: "user" | "agent" | "runtime" | "system";
    authorId?: string;
    body: string;
    idempotencyKey: string;
    triggerHeartbeat?: boolean;
}): {
    comment: AgentComment;
    duplicate: boolean;
};
export declare function listAgentComments(filters?: {
    taskId?: string;
    runId?: string;
    limit?: number;
}): AgentComment[];
export declare function createAgentApproval(input: {
    taskId?: string;
    runId: string;
    traceId?: string;
    actionType: string;
    actionFingerprint: string;
    requestedBy?: string;
    expiresAt?: string;
    payload?: any;
    idempotencyKey: string;
}): AgentApproval;
export declare function decideAgentApproval(approvalId: string, input: {
    status: "approved" | "rejected" | "cancelled";
    decisionBy: string;
    reason?: string;
    actionFingerprint?: string;
}): AgentApproval;
export declare function listAgentApprovals(runId: string): AgentApproval[];
export declare function acquireAgentTaskCheckout(input: {
    taskId: string;
    runId: string;
    traceId?: string;
    workspacePath?: string;
    worktreeId?: string;
    ownerId: string;
    leaseId: string;
    ttlMs?: number;
    idempotencyKey: string;
}): {
    checkout: AgentTaskCheckout;
    acquired: boolean;
    reason: string;
};
export declare function acquireAgentTaskCheckoutInTransaction(db: Database.Database, input: {
    taskId: string;
    runId: string;
    traceId?: string;
    workspacePath?: string;
    worktreeId?: string;
    ownerId: string;
    leaseId: string;
    ttlMs?: number;
    idempotencyKey: string;
}): {
    checkout: AgentTaskCheckout;
    acquired: boolean;
    reason: string;
};
export declare function releaseAgentTaskCheckout(checkoutId: string, ownerId?: string, status?: "released" | "blocked"): AgentTaskCheckout;
export declare function getAgentTaskCheckout(taskId: string, runId?: string): AgentTaskCheckout;
export declare function saveAgentHeartbeatContext(context: AgentHeartbeatContext): AgentHeartbeatContext;
export declare function getAgentHeartbeatContext(wakeId: string): AgentHeartbeatContext;
export declare function getLatestAgentHeartbeatContext(runId: string): AgentHeartbeatContext;
export declare function upsertAgentBudgetPolicy(input: Partial<AgentBudgetPolicy> & {
    scopeType: AgentBudgetPolicy["scopeType"];
    scopeId: string;
    period: AgentBudgetPolicy["period"];
}): AgentBudgetPolicy;
export declare function listAgentBudgetPolicies(scopeType?: string, scopeId?: string): AgentBudgetPolicy[];
export declare function evaluateAgentRunBudget(runId: string, additional?: {
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
}): AgentBudgetDecision;
export declare function recordAgentBudgetUsageUnreported(runId: string, reason?: string): {
    incidentId: string;
    policyId: string;
    runId: string;
    taskId: string;
    level: string;
    tokenUsed: number;
    costUsedUsd: number;
    reason: string;
    createdAt: string;
};
export declare function createAgentRunArtifact(input: Omit<AgentRunArtifact, "artifactId" | "createdAt" | "retentionStatus"> & {
    idempotencyKey: string;
    retentionStatus?: string;
}): AgentRunArtifact;
export declare function listAgentRunArtifacts(runId: string, taskId?: string): AgentRunArtifact[];
export declare function listAgentTaskDependencies(taskId?: string): AgentTaskDependency[];
export declare function listActiveBlockingDependencies(taskId: string): AgentTaskDependency[];
export declare function addAgentTaskDependency(input: {
    taskId: string;
    dependsOnTaskId: string;
    relation?: "blocks" | "related";
}): AgentTaskDependency;
export declare function releaseAgentTaskDependency(dependencyId: string, failed?: boolean): AgentTaskDependency;
export declare function bindAgentRunSecret(input: {
    runId: string;
    secretRef: string;
    scope?: AgentRunSecretBinding["scope"];
    envName: string;
}): AgentRunSecretBinding;
export declare function updateAgentRunSecret(bindingId: string, status: "injected" | "revoked" | "failed"): AgentRunSecretBinding;
export declare function listAgentRunSecrets(runId: string): AgentRunSecretBinding[];
export declare function agentGovernanceMetrics(filters?: {
    runtimeId?: string;
    scope?: string;
    status?: string;
    from?: string;
    to?: string;
}): {
    runs: {
        [k: string]: number;
    };
    events: {
        [k: string]: number;
    };
    usage: {
        inputTokens: number;
        outputTokens: number;
        costUsd: number;
    };
    budgetIncidents: number;
};
export declare function recordManualAgentAction(input: {
    runId: string;
    taskId?: string;
    traceId?: string;
    action: string;
    actorId: string;
    idempotencyKey: string;
    payload?: any;
}): AgentActivityEvent;
export declare function listAgentBudgetIncidents(runId?: string): {
    incidentId: string;
    policyId: string;
    runId: string;
    taskId: string;
    level: string;
    tokenUsed: number;
    costUsedUsd: number;
    reason: string;
    createdAt: string;
}[];
