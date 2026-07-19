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
