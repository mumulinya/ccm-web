export declare function runWorkerContextProviderReliabilitySnapshotRankingSelfTest(): {
    pass: boolean;
    checks: {
        snapshotIsFreshAndChecksummed: boolean;
        expiredSnapshotIsRejected: any;
        tamperedSnapshotIsRejected: any;
        sourceGenerationChangeInvalidatesSnapshot: boolean;
        staleSnapshotRefreshesToFreshGeneration: boolean;
        onlyExplicitSameProjectCandidateIsRanked: boolean;
        rankingDoesNotAutoSwitchCurrentAssignment: boolean;
        localHoldRemainsAuthoritativeWithAlternative: boolean;
        workerPacketRendersSnapshotAndAlternative: boolean;
    };
    snapshot: {
        snapshot_id: any;
        status: any;
        expires_at: any;
        generation_id: any;
    };
    ranking: {
        selected: any;
        alternatives: any;
        dispatch_ready: any;
    };
    local: {
        selected: any;
        alternative_count: any;
        dispatch_ready: any;
    };
};
export declare function runWorkerContextProviderSwitchExecutionRankingSelfTest(): {
    pass: boolean;
    checks: {
        policyCarriesDecayedExecutionRisk: boolean;
        policyCarriesTypedMemoryProvenance: any;
        rankingUsesExecutionDecayForSaferAlternative: boolean;
        advisoryCarriesCompactSafeRankingProvenance: any;
        equallyRecentMismatchIsNotPreferred: boolean;
        rankingDoesNotAutoSwitchCurrentAssignment: boolean;
        renderedPacketShowsRankingProvenance: boolean;
        switchReceiptPreservesRankingProvenance: boolean;
        compactRetryPreservesProviderRankingProvenance: boolean;
        compactOutcomeLedgerCarriesProviderRankingProvenance: boolean;
        compactRenderedPacketStillShowsRankingProvenance: boolean;
    };
    selected: {
        agent_type: any;
        composite_rank: any;
        local_execution_rank_penalty: any;
        weighted_risk_score: any;
    };
    alternatives: any;
    rankedCandidates: any;
    decision: {
        action: any;
        selected_provider: any;
        dispatch_ready: any;
    };
    switchReceipt: {
        valid: boolean;
        status: any;
        requested_provider: any;
        provenance: any;
    };
    compactRetry: {
        status: any;
        method: any;
        dispatch_ready: boolean;
        gate_reason: any;
        pressure_status: any;
        provider_dispatch_hold: boolean;
        total_tokens: any;
        max_tokens: any;
        free_tokens: any;
        provider_ranking_provenance_required: boolean;
        provider_ranking_provenance_preserved: boolean;
        outcome_provider_ranking_provenance_preserved: boolean;
    };
};
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
export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest(): {
    pass: boolean;
    checks: {
        invalidOverrideDoesNotBypassHold: boolean;
        validOverrideDispatchesOnce: boolean;
        validDecisionCarriesOverrideReceipt: boolean;
        bindingLedgerPersistsOverride: boolean;
        ledgerCountersTrackOverride: boolean;
    };
    invalid: {
        action: any;
        dispatch_ready: any;
        override_valid: boolean;
        gaps: any;
    };
    valid: {
        action: any;
        dispatch_ready: any;
        override_valid: boolean;
        next_step: any;
    };
    ledger: {
        providerDispatchDecisionCount: any;
        providerDispatchHoldDecisionCount: any;
        providerDispatchOverrideDecisionCount: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest(): {
    pass: boolean;
    checks: {
        overrideDispatchCreatesFollowupWorkItem: boolean;
        completionRequiresVerifiedMemoryProvenanceUsage: boolean;
        bindingLedgerPersistsCompletion: boolean;
        followupRepairWorkItemClosed: boolean;
    };
    followup: {
        work_item_id: any;
        before_status: string;
        after_status: string;
    };
    completion: {
        status: any;
        completion_ok: boolean;
        memory_provenance_usage_count: any;
        current_source_verified_count: any;
    };
    ledger: {
        providerDispatchOverrideCompletionCount: any;
    };
};
