export declare function runWorkerContextPtlEmergencyDowngradeSelfTest(): {
    pass: boolean;
    checks: {
        ptlHintEngaged: boolean;
        retryUsesPtlHint: boolean;
        taskCompactedWithEmergencyBudget: boolean;
        renderedExposesPtlDowngrade: boolean;
        outcomeCarriesPtlHint: boolean;
    };
    ptlHint: {
        engaged: any;
        emergency_level: any;
        blocked_outcome_count: any;
        repeated_failed_categories: any;
    };
    retry: {
        status: any;
        method: any;
        original_task_chars: any;
        compacted_task_chars: any;
        ptl_emergency_level: any;
    };
};
export declare function runWorkerContextCompletionMemoryCompactionPreservationSelfTest(): {
    pass: boolean;
    checks: {
        allStrategiesCarryVerifiedPreservation: boolean;
        exactCompletionIdentitySurvivesAllStrategies: boolean;
        exactConflictResolutionIdentitySurvivesAllStrategies: boolean;
        resolvedAndReopenedStatesSurviveCorrectStrategies: boolean;
        currentAndHistoricalSessionBoundarySurvives: boolean;
        memoryFirstReinjectsCompactedMemoryWithContract: any;
        replayAndMetadataPartialCompactPreserveContract: boolean;
        ptlEmergencyPreservesContract: any;
        compactOutcomeLedgerCarriesProof: boolean;
        tamperedCompactPacketIsRejected: boolean;
    };
    scenarios: {
        kind: string;
        retry_status: any;
        retry_method: any;
        dispatch_ready: boolean;
        initial_total_tokens: any;
        retry_total_tokens: any;
        max_tokens: any;
        retry_free_tokens: any;
        preservation_required: boolean;
        preservation_preserved: boolean;
        conflict_resolution_present: boolean;
        conflict_resolution_active: boolean;
        conflict_resolution_reopened: boolean;
        conflict_resolution_entry_id: any;
        conflict_resolution_state: any;
        conflict_resolution_usage_state: any;
        conflict_resolution_doc_rel_paths: any;
        conflict_resolution_task_agent_session_id: any;
        conflict_resolution_native_session_id: any;
        conflict_resolution_reversible: boolean;
        conflict_resolution_historical_branches_preserved: boolean;
        conflict_resolution_reverification_acceptance_required: boolean;
        conflict_resolution_reversible_acceptance_required: boolean;
        conflict_verification_acceptance_required: boolean;
        ptl_emergency_engaged: boolean;
        outcome_preserved: boolean;
    }[];
    tampered: {
        gaps: string[];
        dispatch_ready: any;
    };
};
export declare function runWorkerContextIgnoreMemoryPolicySelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesIgnorePolicy: boolean;
        proofMarksIgnoredByPolicy: boolean;
        usageCategorizesPolicy: boolean;
        renderedRequiresMemoryIgnoredReceipt: boolean;
        bindingPersistsIgnorePolicy: boolean;
    };
    memoryPolicy: any;
    proof: {
        status: any;
        memory_ignored: boolean;
    };
    binding: {
        memory_policy_ignored: boolean;
        render_probe_ignored: boolean;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesProviderAdvisory: boolean;
        usageCategorizesProviderAdvisory: boolean;
        gateBlocksProviderHold: boolean;
        renderedShowsProviderAdvisory: boolean;
        bindingPersistsProviderAdvisory: boolean;
        recoveryDisarmsProviderHold: boolean;
    };
    gate: {
        dispatch_ready: any;
        provider_dispatch_hold: any;
        repair_source: any;
        reason: any;
    };
    advisory: {
        health_status: any;
        dispatch_policy: any;
        should_hold_dispatch: boolean;
    };
    recovered: {
        dispatch_ready: any;
        provider_dispatch_hold: any;
        health_status: any;
        dispatch_policy: any;
    };
};
