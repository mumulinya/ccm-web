export declare const AGENT_COMMUNICATION_ENVELOPE_SCHEMA = "ccm-agent-communication-envelope-v2";
export declare const AGENT_DISPATCH_ACK_SCHEMA = "ccm-agent-dispatch-ack-v2";
export declare const AGENT_PROGRESS_RECEIPT_SCHEMA = "ccm-agent-progress-receipt-v2";
export declare const AGENT_RESULT_RECEIPT_SCHEMA = "ccm-agent-result-receipt-v2";
export declare const AGENT_TERMINAL_RECEIPT_SCHEMA = "ccm-agent-terminal-receipt-v2";
export type AgentCommunicationMessageType = "task_dispatch" | "dispatch_ack" | "progress" | "heartbeat" | "coordination_request" | "coordination_resolution" | "result" | "cancel" | "terminal";
export type AgentCommunicationState = "created" | "queued" | "lease_acquired" | "runner_starting" | "runner_started" | "acknowledged" | "executing" | "waiting_dependency" | "result_submitted" | "verifying" | "accepted" | "rejected" | "completed" | "startup_timeout" | "ack_timeout" | "heartbeat_lost" | "lease_expired" | "cancel_requested" | "cancelled" | "recovery_required" | "stale_receipt" | "failed";
export type AgentCommunicationIdentity = {
    taskId: string;
    workItemId?: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    attempt: number;
    senderAgentId: string;
    receiverAgentId: string;
};
export type AgentCommunicationEnvelopeV2 = {
    schema: typeof AGENT_COMMUNICATION_ENVELOPE_SCHEMA;
    messageId: string;
    messageType: AgentCommunicationMessageType;
    correlationId: string;
    parentMessageId: string;
    taskId: string;
    workItemId: string;
    scope: "global" | "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    attempt: number;
    leaseId: string;
    senderAgentId: string;
    receiverAgentId: string;
    deadlineAt: string;
    idempotencyKey: string;
    payloadChecksum: string;
    state: AgentCommunicationState;
    contentStored: false;
    createdAt: string;
    updatedAt: string;
};
export declare const DEFAULT_AGENT_COMMUNICATION_POLICY: Readonly<{
    agentCommunicationV2Enabled: true;
    agentRunnerStartTimeoutMs: 60000;
    agentAckTimeoutMs: 30000;
    agentHeartbeatIntervalMs: 20000;
    agentHeartbeatLostTimeoutMs: 90000;
    agentLeaseTtlMs: 120000;
    agentMaxAttempts: 3;
    agentMaxParallelPerProject: 2;
    agentMaxParallelGlobal: 6;
}>;
export declare function readAgentCommunicationPolicy(overrides?: any): {
    agentCommunicationV2Enabled: boolean;
    agentRunnerStartTimeoutMs: number;
    agentAckTimeoutMs: number;
    agentHeartbeatIntervalMs: number;
    agentHeartbeatLostTimeoutMs: number;
    agentLeaseTtlMs: number;
    agentMaxAttempts: number;
    agentMaxParallelPerProject: number;
    agentMaxParallelGlobal: number;
};
export declare function createAgentCommunicationEnvelope(input: AgentCommunicationIdentity & {
    messageType?: AgentCommunicationMessageType;
    correlationId?: string;
    parentMessageId?: string;
    deadlineAt?: string;
    idempotencyKey?: string;
    payload?: any;
    initialState?: AgentCommunicationState;
}): {
    envelope: AgentCommunicationEnvelopeV2;
    deduplicated: boolean;
};
export declare function getAgentCommunication(messageId: string, options?: {
    includeEvents?: boolean;
    includeReceipts?: boolean;
}): any;
export declare function listAgentCommunications(query?: any): AgentCommunicationEnvelopeV2[];
export declare function transitionAgentCommunication(messageId: string, toState: AgentCommunicationState, input?: any): {
    envelope: AgentCommunicationEnvelopeV2;
    unchanged: boolean;
};
export declare function recordAgentCommunicationAuditEvent(messageId: string, eventType: string, detail?: any): {
    recorded: boolean;
    reason: string;
    messageId?: undefined;
    state?: undefined;
    contentStored?: undefined;
} | {
    recorded: boolean;
    messageId: any;
    state: any;
    contentStored: boolean;
    reason?: undefined;
};
export declare function acquireAgentCommunicationLease(messageId: string, ownerId: string, options?: any): {
    acquired: boolean;
    lease: any;
    envelope: AgentCommunicationEnvelopeV2;
    capacity?: undefined;
    reason?: undefined;
    position?: undefined;
} | {
    acquired: boolean;
    capacity: boolean;
    reason: string;
    position: number;
    envelope: AgentCommunicationEnvelopeV2;
    lease?: undefined;
};
export declare function heartbeatAgentCommunication(messageId: string, identity: any, input?: any): {
    accepted: boolean;
    stale: boolean;
    issues: string[];
    envelope: AgentCommunicationEnvelopeV2;
    heartbeatAt?: undefined;
    expiresAt?: undefined;
    state?: undefined;
    contentStored?: undefined;
} | {
    accepted: boolean;
    heartbeatAt: string;
    expiresAt: string;
    state: any;
    contentStored: boolean;
    stale?: undefined;
    issues?: undefined;
    envelope?: undefined;
};
export declare function recordAgentCommunicationReceipt(messageId: string, receiptType: "dispatch_ack" | "progress" | "result" | "terminal", identity: any, rawReceipt: any, options?: any): any;
export declare function releaseAgentCommunicationLease(messageId: string, status?: string): {
    released: boolean;
    releasedAt: string;
};
export declare function reconcileAgentCommunications(options?: any): any[];
export declare function performAgentCommunicationAction(messageId: string, action: "cancel" | "retry" | "takeover" | "reconcile", input?: any): {
    envelope: AgentCommunicationEnvelopeV2;
    unchanged: boolean;
} | {
    action: "reconcile";
    outcomes: any[];
};
export declare function bridgeLegacyAgentCommunication(input: AgentCommunicationIdentity & {
    legacySchema: string;
    legacyId: string;
    legacyStatus: string;
    payload?: any;
}): {
    bridged: boolean;
    reason: string;
} | {
    envelope: AgentCommunicationEnvelopeV2;
    deduplicated: boolean;
    bridged: boolean;
    legacyBridge: boolean;
    reason?: undefined;
};
export declare function getAgentCommunicationDiagnostics(): {
    schema: string;
    states: any;
    concurrency: {
        global: number;
        byProject: any;
        maxGlobal: number;
        maxPerProject: number;
    };
    metrics: {
        dispatch_to_runner_started_ms: number;
        runner_started_to_ack_ms: number;
        heartbeat_lost_total: number;
        lease_recovery_total: number;
        stale_receipt_total: number;
        coordination_dependency_wait_ms: number;
        worktree_merge_conflict_total: number;
    };
    alerts: {
        messageId: any;
        taskId: any;
        state: any;
        reason: string;
    }[];
    contentStored: boolean;
    generatedAt: string;
};
export declare function buildAgentCommunicationTaskSummary(taskId: string): {
    schema: string;
    total: number;
    active: number;
    latest: {
        messageId: string;
        state: AgentCommunicationState;
        receiverAgentId: string;
        generation: number;
        attempt: number;
        heartbeatAt: any;
        leaseExpiresAt: any;
        sideEffectState: any;
        updatedAt: string;
    };
    states: {
        [k: string]: number;
    };
    contentStored: boolean;
};
export declare function startAgentCommunicationWatchdog(options?: {
    onSafeRetry?: (outcome: any) => void;
}): {
    started: boolean;
    running: boolean;
};
export declare function stopAgentCommunicationWatchdog(): {
    stopped: boolean;
};
/** Starts the durable dispatch gate before a third-party runner is invoked. */
export declare function startAgentCommunicationDispatch(input: AgentCommunicationIdentity & {
    ownerId: string;
    existingMessageId?: string;
    deadlineAt?: string;
    payload?: any;
    idempotencyKey?: string;
    policy?: any;
}): {
    acquired: boolean;
    lease: any;
    envelope: AgentCommunicationEnvelopeV2;
    capacity?: undefined;
    reason?: undefined;
    position?: undefined;
    enabled: boolean;
    deduplicated?: undefined;
} | {
    acquired: boolean;
    capacity: boolean;
    reason: string;
    position: number;
    envelope: AgentCommunicationEnvelopeV2;
    lease?: undefined;
    enabled: boolean;
    deduplicated?: undefined;
} | {
    enabled: boolean;
    acquired: boolean;
    deduplicated: boolean;
    envelope: any;
    lease: any;
};
export declare function markAgentCommunicationRunnerStarted(messageId: string, detail?: any): {
    envelope: any;
    unchanged: boolean;
};
/** Compatibility bridge for runtimes that still return ACK inside CCM_AGENT_RECEIPT. */
export declare function ensureAgentCommunicationAcknowledged(messageId: string, ack?: any): any;
export declare function submitAgentCommunicationResult(messageId: string, result?: any): any;
/** CCM-only acceptance gate. A worker result can never create its own terminal state. */
export declare function finalizeAgentCommunication(messageId: string, outcome: "accepted" | "rejected" | "cancelled" | "failed", evidence?: any): any;
