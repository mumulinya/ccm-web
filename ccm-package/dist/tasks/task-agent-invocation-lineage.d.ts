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
export declare function getTaskAgentInvocationLineageFile(groupId: string, groupSessionId: string, taskAgentSessionId: string): string;
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
export declare function prepareTaskAgentInvocationEdge(input?: any): any;
export declare function bindTaskAgentInvocationContext(edgeOrId: any, evidence?: any): any;
export declare function dispatchTaskAgentInvocationEdge(edgeOrId: any, evidence?: any): any;
export declare function bindTaskAgentInvocationRunnerRequest(edgeOrId: any, runnerRequestId: string, evidence?: any): any;
export declare function verifyTaskAgentNativeContinuationReceipt(receipt: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function verifyTaskAgentContextRebudgetProof(proof: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function verifyTaskAgentInvocationAdoptionReceipt(receipt: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function completeTaskAgentInvocationEdge(edgeOrId: any, evidence?: any): any;
export declare function verifyTaskAgentInvocationReinjectionProof(proof: any, edge?: any): {
    valid: boolean;
    issues: string[];
};
export declare function bindTaskAgentInvocationMemoryDelivery(edgeOrId: any, evidence?: any): any;
export declare function getTaskAgentInvocationRecoveryLeaseFile(groupId: string, groupSessionId: string): string;
export declare function readTaskAgentInvocationRecoveryLease(groupId: string, groupSessionId: string): any;
export declare function acquireTaskAgentInvocationRecoveryLease(groupId: string, groupSessionId: string, options?: any): {
    acquired: boolean;
    reason: string;
    lease: any;
    file: string;
};
export declare function finalizeTaskAgentInvocationRecoveryLease(leaseInput: any, report?: any): {
    finalized: boolean;
    reason: string;
    lease: any;
} | {
    finalized: boolean;
    lease: any;
    reason?: undefined;
};
export declare function buildTaskAgentInvocationRecoveryStatus(options?: any): {
    schema: string;
    generated_at: string;
    overall: {
        status: string;
        session_count: number;
        checked_count: any;
        recovered_count: any;
        uncertain_count: any;
        active_count: any;
        pending_count: any;
        relinked_count: any;
        quarantined_count: any;
        leased_count: number;
        lease_takeover_count: number;
        max_fencing_token: any;
    };
    rows: any[];
    issues: any[];
};
export declare function reconcileTaskAgentInvocationRecovery(options?: any): {
    schema: string;
    recovery_run_id: string;
    started_at: string;
    completed_at: string;
    checked: number;
    recovered: number;
    uncertain: number;
    active: number;
    pending: number;
    relinked: number;
    quarantined: number;
    leased: number;
    lease_contended: number;
    lease_takeover: number;
    max_fencing_token: any;
    rows: any[];
};
export declare function verifyTaskAgentInvocationEdge(edge: any, options?: any): {
    valid: boolean;
    issues: string[];
    checksumValid?: undefined;
    parent?: undefined;
} | {
    valid: boolean;
    checksumValid: boolean;
    issues: string[];
    parent: any;
};
export declare function buildTaskAgentInvocationLineageReport(filter?: any): {
    schema: string;
    generatedAt: string;
    overall: {
        status: string;
        edgeCount: number;
        validCount: number;
        invalidCount: number;
        branchCount: number;
        retryCount: number;
        providerSwitchCount: number;
        nonTerminalCount: number;
        recoveredCount: number;
        uncertainCount: number;
        orphanParentCount: number;
        relinkedParentCount: number;
        adoptionRequiredCount: number;
        adoptionReceiptCount: number;
        adoptionVerifiedCount: number;
        adoptionInvalidCount: number;
        reinjectionRequiredCount: number;
        reinjectionProofCount: number;
        reinjectionProvenCount: number;
        reinjectionUnverifiedCount: number;
        nativeContinuationReceiptCount: number;
        nativeContinuationAcknowledgedCount: number;
        nativeContinuationUnverifiedCount: number;
        nativeContinuationPolicyRejectedCount: number;
        nativeContinuationOutputFormatDriftCount: number;
        nativeForkUnsupportedCount: number;
        contextRebudgetProofCount: number;
        contextRebudgetVerifiedCount: number;
        contextRebudgetDriftCount: number;
        contextRebudgetUnavailableCount: number;
        compactHeadFenceRequiredCount: number;
        compactHeadFenceValidatedCount: number;
        compactHeadFenceStaleCount: number;
        sessionLifecycleFenceRequiredCount: number;
        sessionLifecycleFenceValidatedCount: number;
        sessionLifecycleFenceStaleCount: number;
    };
    rows: any[];
    weakRows: any[];
    ledgerIssues: any[];
    recoveryStatus: {
        schema: string;
        generated_at: string;
        overall: {
            status: string;
            session_count: number;
            checked_count: any;
            recovered_count: any;
            uncertain_count: any;
            active_count: any;
            pending_count: any;
            relinked_count: any;
            quarantined_count: any;
            leased_count: number;
            lease_takeover_count: number;
            max_fencing_token: any;
        };
        rows: any[];
        issues: any[];
    };
};
export declare function deleteTaskAgentInvocationLineageArtifacts(groupId: string, groupSessionId: string, taskAgentSessionId?: string): {
    deleted: number;
    recoveryDeleted: number;
    recoveryLeaseDeleted: number;
};
