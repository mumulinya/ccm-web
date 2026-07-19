export * from "./task-agent-invocation-lineage-part-01";
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
