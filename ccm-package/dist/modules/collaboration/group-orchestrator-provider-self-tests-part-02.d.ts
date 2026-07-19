export declare function runWorkerContextProviderSwitchDecisionReceiptSelfTest(): {
    pass: boolean;
    checks: {
        validSwitchIsApprovedAndChecksummed: boolean;
        expiredSnapshotRejectsReceipt: any;
        tamperedReceiptIsRejected: any;
        staleSourceGenerationRejectsReceipt: any;
        projectAndGroupMismatchAreRejected: any;
        unconfiguredCandidateIsRejected: any;
        compatibilityEvidenceIsRequired: any;
        localAuthorityIsRequired: any;
        heldProviderNeedsExplicitSwitchPermission: any;
        sessionBindingRejectsWrongProjectThenBindsActualSession: boolean;
        matchedExecutionIsSystemAttested: boolean;
        runtimeFallbackMismatchIsNotDisguisedAsApprovedExecution: boolean;
        ledgerSeparatesAdvisedApprovedAndExecutedStates: boolean;
        compactRetryPreservesDecisionReceipt: boolean;
        providerSwitchExecutionDistillsToTypedMemory: boolean;
        providerSwitchExecutionTypedMemoryIsRecallable: boolean;
        providerSwitchExecutionPolicySeesMismatchHistory: boolean;
    };
    receipt: {
        receipt_id: any;
        status: any;
        snapshot_id: any;
        old_provider: any;
        new_provider: any;
    };
    sessionBinding: any;
    matchedExecution: any;
    mismatchedExecution: any;
    ledger: {
        providerSwitchAdvisedCount: any;
        providerSwitchApprovedCount: any;
        providerSwitchSessionBoundCount: any;
        providerSwitchExecutedCount: any;
        providerSwitchExecutionPassedCount: any;
        providerSwitchExecutionFailedCount: any;
    };
    typedMemory: {
        archiveSchema: any;
        executedCount: any;
        passedCount: any;
        failedCount: any;
        mismatchCount: any;
        recallCount: any;
        policyAction: string;
    };
    compactRetry: {
        status: any;
        receipt_id: any;
        usage_status: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest(): {
    pass: boolean;
    checks: {
        activeAssignmentStoresDecision: boolean;
        activeDecisionHoldsCriticalProvider: boolean;
        activeNeedsPressureRepair: any;
        bindingLedgerPersistsDecision: boolean;
        recoveredDecisionAllowsReceiptSampling: boolean;
        ledgerCountersTrackProviderDecisions: boolean;
    };
    active: {
        action: any;
        dispatch_ready: any;
        provider_dispatch_hold: any;
        health_status: any;
        reason: any;
    };
    recovered: {
        action: any;
        dispatch_ready: any;
        requires_receipt_sampling: boolean;
        health_status: any;
    };
    ledger: {
        providerDispatchDecisionCount: any;
        providerDispatchHoldDecisionCount: any;
        providerDispatchReadyDecisionCount: any;
    };
};
