export declare const TASK_AGENT_INVOCATION_EDGE_SCHEMA = "ccm-task-agent-invocation-edge-v1";
export declare const TASK_AGENT_INVOCATION_EVENT_SCHEMA = "ccm-task-agent-invocation-lineage-event-v1";
export declare const TASK_AGENT_INVOCATION_LINEAGE_DIR: string;
export declare const TASK_AGENT_INVOCATION_RECOVERY_EVENT_SCHEMA = "ccm-task-agent-invocation-recovery-event-v1";
export declare const TASK_AGENT_INVOCATION_RECOVERY_DIR: string;
export declare const TASK_AGENT_INVOCATION_RECOVERY_LEASE_SCHEMA = "ccm-task-agent-invocation-recovery-lease-v1";
export declare const TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA = "ccm-task-agent-invocation-adoption-receipt-v1";
export declare const TASK_AGENT_INVOCATION_REINJECTION_PROOF_SCHEMA = "ccm-task-agent-invocation-reinjection-proof-v1";
export declare const TASK_AGENT_NATIVE_CONTINUATION_RECEIPT_SCHEMA = "ccm-task-agent-native-continuation-receipt-v1";
export declare const TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA = "ccm-task-agent-context-rebudget-proof-v1";
export declare const LOCK_STALE_MS = 60000;
export declare const RECOVERY_LEASE_MS = 120000;
export declare const TERMINAL: Set<string>;
export declare function canonical(value: any): any;
export declare function sha256(value: any, length?: number): string;
export declare function rawJsonSha256(value: any, length?: number): string;
export declare function writeJsonAtomic(file: string, value: any): void;
export declare function clean(value: any): string;
export declare function processAlive(pid: number): boolean;
export declare function assertIdentity(groupId: string, groupSessionId: string, taskAgentSessionId: string): void;
export declare function assertGroupSessionIdentity(groupId: string, groupSessionId: string): void;
export declare function recordInvocationSoakPhase(edge: any, phase: string, status: string, evidence?: any, eventKey?: string): {
    recorded: boolean;
    idempotent: boolean;
    event: any;
    file: string;
    ledger: {
        file: string;
        valid: boolean;
        events: any[];
        issues: string[];
        headChecksum: string;
        lastSequence: number;
    };
} | {
    recorded: boolean;
    idempotent: boolean;
    event: any;
    file: string;
    ledger?: undefined;
} | {
    recorded: boolean;
    error: any;
};
export declare function getTaskAgentInvocationLineageFile(groupId: string, groupSessionId: string, taskAgentSessionId: string): string;
export declare function acquireLock(file: string): () => void;
export declare function eventChecksum(event: any): string;
export declare function edgeChecksum(edge: any): string;
export declare function readEventsFromFile(file: string): {
    file: string;
    valid: boolean;
    events: any[];
    issues: string[];
    headChecksum: string;
    lastSequence: number;
};
export declare function appendEvent(file: string, edge: any, transition: string): any;
export declare function listFiles(): string[];
export declare function readTaskAgentInvocationLineage(groupId: string, groupSessionId: string, taskAgentSessionId: string): {
    edges: any[];
    latest: any;
    file: string;
    valid: boolean;
    events: any[];
    issues: string[];
    headChecksum: string;
    lastSequence: number;
};
export declare function listTaskAgentInvocationEdges(filter?: any): {
    schema: string;
    valid: boolean;
    issues: any[];
    edges: any[];
};
export declare function findTaskAgentInvocationEdge(invocationEdgeId: string): any;
export declare function latestCommittedEdge(filter?: any): any;
export declare function prepareTaskAgentInvocationEdge(input?: any): any;
export declare function transitionEdge(edgeOrId: any, status: string, evidence?: any): any;
export declare function bindTaskAgentInvocationContext(edgeOrId: any, evidence?: any): any;
export declare function dispatchTaskAgentInvocationEdge(edgeOrId: any, evidence?: any): any;
export declare function bindTaskAgentInvocationRunnerRequest(edgeOrId: any, runnerRequestId: string, evidence?: any): any;
export declare function nativeContinuationReceiptChecksum(receipt: any): string;
export declare function verifyTaskAgentNativeContinuationReceipt(receipt: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildTaskAgentNativeContinuationReceipt(edge: any, evidence: any, success: boolean): any;
export declare function contextRebudgetProofChecksum(proof: any): string;
export declare function verifyTaskAgentContextRebudgetProof(proof: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildTaskAgentContextRebudgetProof(edge: any, evidence: any): any;
export declare function adoptionReceiptChecksum(receipt: any): string;
export declare function verifyTaskAgentInvocationAdoptionReceipt(receipt: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function buildTaskAgentInvocationAdoptionReceipt(edge: any, evidence: any, success: boolean, nativeContinuationReceipt: any): any;
export declare function completeTaskAgentInvocationEdge(edgeOrId: any, evidence?: any): any;
export declare function verifyMemoryDeliveryReceiptChecksum(receipt: any): boolean;
export declare function reinjectionProofChecksum(proof: any): string;
export declare function verifyTaskAgentInvocationReinjectionProof(proof: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function bindTaskAgentInvocationMemoryDelivery(edgeOrId: any, evidence?: any): any;
export declare function recoveryEventChecksum(event: any): string;
export declare function recoveryStatusChecksum(status: any): string;
export declare function getInvocationRecoveryHistoryFile(groupId: string, groupSessionId: string): string;
export declare function getInvocationRecoveryStatusFile(groupId: string, groupSessionId: string): string;
