export declare function runWorkerContextMetadataPartialCompactPolicySelfTest(): {
    pass: boolean;
    checks: {
        initialTopCategoryIsMetadataDocs: boolean;
        policySelectsOnlyDocs: any;
        partialSummaryMatchesPolicy: boolean;
        unselectedMetadataPreserved: boolean;
        taskWasNotCompacted: boolean;
        bindingAndRenderExposePolicy: boolean;
        hookRecordsPolicy: any;
    };
    retry: {
        status: any;
        method: any;
        selected_categories: any;
        skipped_categories: any;
        partial_categories: any;
    };
    gate: {
        dispatch_ready: any;
        auto_retry_status: any;
        total_tokens: any;
        max_tokens: any;
    };
};
export declare function runWorkerContextCompactOutcomeLedgerSelfTest(): {
    pass: boolean;
    checks: {
        outcomeLedgerCreated: boolean;
        outcomeBindsRetryAndHook: boolean;
        outcomeRecordsPolicyDecision: boolean;
        outcomeRecordsRecoveryDelta: boolean;
        outcomeShowsTaskPreserved: boolean;
        statsAggregateOutcome: boolean;
    };
    outcome: {
        status: any;
        method: any;
        selected_categories: any;
        token_delta: any;
        free_token_delta: any;
        task_hash_unchanged: boolean;
    };
    stats: any;
};
export declare function runWorkerContextCompactStrategyMemorySelfTest(): {
    pass: boolean;
    checks: {
        strategyMemoryCreated: boolean;
        dependencyPreferredFromOutcome: boolean;
        policyUsesStrategyMemory: boolean;
        equalPressureSelectsPreferredCategory: boolean;
        workerPacketRendersStrategyMemory: boolean;
    };
    strategy: {
        preferred_categories: any;
        avoid_categories: any;
        sample_count: any;
        categories: any;
    };
    policy: {
        method: any;
        selected_categories: any;
        compact_strategy_memory: any;
    };
};
export declare function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest(): {
    pass: boolean;
    checks: {
        strategyMemoryPrefersDependencies: boolean;
        baselineStillFollowsTokenPressure: boolean;
        usageLedgerPromotesCompactStrategyMemory: any;
        pressureUsageFeedbackChangesPolicy: boolean;
        renderedShowsPressureUsageBias: boolean;
    };
    baselinePolicy: {
        method: any;
        selected_categories: any;
    };
    biasedPolicy: {
        method: any;
        selected_categories: any;
        pressure_recall_usage_strategy_bias: any;
        candidates: any;
    };
    usageSummary: {
        weighted_totals: any;
        aging: any;
    };
};
export declare function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest(): {
    pass: boolean;
    checks: {
        targetHasNoLocalUsageLedger: boolean;
        strategyMemoryStillPrefersDependencies: boolean;
        baselineStillFollowsTokenPressure: boolean;
        sourceLedgerFeedsCrossGroupSummary: any;
        crossGroupUsageChangesPolicy: boolean;
        targetProjectIsolationBlocksWrongProjectStrategyBias: boolean;
    };
    crossGroupSummary: {
        source_group_count: any;
        entry_count: any;
        weighted_totals: any;
    };
    baselinePolicy: {
        method: any;
        selected_categories: any;
    };
    crossBiasedPolicy: {
        method: any;
        selected_categories: any;
        pressure_recall_usage_strategy_bias: any;
        pressure_recall_usage_summary: any;
        candidates: any;
    };
    wrongProjectPolicy: {
        method: any;
        selected_categories: any;
    };
};
