export declare function runGroupTypedMemoryDistillationMutationCoordinatorSelfTest(): {
    pass: boolean;
    schema: string;
    groupId: string;
    checks: {
        nestedCallReusesLease: boolean;
        nestedKindsAreAudited: any;
        oneLedgerWriteCommitted: boolean;
        receiptBindsLedgerFence: boolean;
        stateBindsMutation: boolean;
        lockReleased: boolean;
        uncoordinatedWriteFailsClosed: boolean;
    };
    receipt: any;
    commit: any;
    state: any;
};
export declare function runGroupTypedMemoryIndexSelfTest(): {
    pass: boolean;
    checks: {
        indexCreated: boolean;
        fourTypeDocsCreated: boolean;
        recallFindsSentinel: any;
        recallFindsFile: boolean;
        recallLedgerStartsEmpty: boolean;
        recallLedgerRecordsSurfaced: boolean;
        alreadySurfacedDedupesRecall: boolean;
        ignoreMemoryHonored: boolean;
        renderedMentionsVerification: any;
    };
    indexFile: string;
    recalled: any;
};
export declare function runGroupTypedMemoryPostCompactUsageScoringSelfTest(): {
    pass: boolean;
    checks: {
        usefulCandidateRecalled: boolean;
        usefulCandidateBoosted: any;
        ignoredCandidateDeprioritized: any;
        recallSummaryCountsUsageScoring: boolean;
        renderedShowsUsageAdjustment: any;
    };
    scoring: any;
    recalled: any;
};
export declare function runGroupTypedMemoryWorkerContextPressureRecallSelfTest(): {
    pass: boolean;
    checks: {
        noPressureDoesNotPolluteNormalRecall: boolean;
        overBudgetBoostsUsagePressureMemory: boolean;
        overBudgetBoostsCompactStrategyMemory: boolean;
        ptlEmergencyBoostsDowngradeMemory: boolean;
        pressureScoringSummarized: boolean;
        usageLedgerFeedsFuturePressureRecall: boolean;
        staleUsageFeedbackDecaysBeforeScoring: boolean;
        renderedShowsPressureRecall: any;
    };
    noPressure: {
        scoring: any;
        recalled: any;
    };
    pressure: {
        scoring: any;
        recalled: any;
    };
    ptl: {
        scoring: any;
        recalled: any;
    };
    usage: {
        record: any;
        summary: any;
        staleRecord: any;
        staleSummary: any;
        scoring: any;
        staleScoring: any;
    };
};
export declare function runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest(): {
    pass: boolean;
    checks: {
        sourceLedgerRecorded: boolean;
        projectSummaryReadsOnlySourceGroup: any;
        crossGroupHintsPromoteSameProjectPressureMemory: any;
        crossGroupHintsCanDeprioritizeIgnoredPressureMemory: any;
        targetProjectIsolationBlocksWrongProjectHints: boolean;
        localGroupUsageOverridesSameDocCrossGroupHint: boolean;
    };
    crossSummary: {
        source_group_count: any;
        entry_count: any;
        weighted_totals: any;
        rows: any;
    };
    crossRecall: {
        scoring: any;
        promotedDoc: any;
        ignoredDoc: any;
    };
    localOverride: {
        scoring: any;
        usageDocMatches: any;
    };
};
export declare function runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest(): {
    pass: boolean;
    checks: {
        usageLedgerRecorded: boolean;
        repairHintMatchedDoc: boolean;
        scoringCountsRepair: boolean;
        renderedCarriesRepairProvenance: any;
    };
    scoring: any;
    doc: {
        relPath: any;
        score: any;
        workerContextPressureUsage: any;
    };
    rendered: any;
};
export declare function runGroupTypedMemoryLoadPlanSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        entrypointFirst: boolean;
        priorityTierOrdering: boolean;
        includeLoadsBeforeParent: boolean;
        missingIncludeAudited: any;
        cycleAudited: any;
        userMemoryHighestPriority: boolean;
        boundedEntries: boolean;
        renderedMentionsPlan: any;
    };
    plan: {
        status: any;
        entryCount: any;
        issues: any;
    };
};
export declare function runGroupTypedMemoryPathConditionSelfTest(): {
    pass: boolean;
    checks: {
        pathsPersistedInFrontmatter: boolean;
        payRecallIncludesPayRule: boolean;
        payRecallSkipsSearchRule: boolean;
        searchRecallIncludesSearchRule: boolean;
        unrelatedSkipsConditionalRules: boolean;
        diagnosticsRecordPathMiss: any;
        loadPlanIncludesMatchedConditional: boolean;
        loadPlanSkipsUnmatchedConditionals: boolean;
        loadPlanCountsConditionalSkips: boolean;
        renderedMentionsPathCondition: any;
    };
    payRecall: {
        surfaced: any;
        conditionalMatched: any;
        conditionalSkipped: any;
    };
    payPlan: {
        conditionalMatched: any;
        conditionalSkipped: any;
    };
};
export declare function runGroupProjectMemoryImportSelfTest(): {
    pass: boolean;
    checks: {
        discoversClaudeFiles: any;
        importsTypedDocs: boolean;
        importsClaudeIncludes: boolean;
        missingIncludeAudited: any;
        preservesPathFrontmatter: boolean;
        recallFindsPathRule: boolean;
        unrelatedSkipsPathRule: any;
        loadPlanIncludesImportedRule: boolean;
        indexLinksImportedDocs: boolean;
    };
    discovery: {
        discoveredCount: any;
        status: any;
    };
    imported: {
        importedCount: any;
        status: any;
        includeAudit: any;
    };
    recalled: any;
};
export declare function runGroupGlobalClaudeMemoryImportSelfTest(): {
    pass: boolean;
    checks: {
        discoversUserAndManaged: any;
        importsTypedDocs: boolean;
        importsUserExternalInclude: boolean;
        skipsManagedExternalInclude: boolean;
        userMemoryHasHighPriorityType: boolean;
        managedMemoryIsReference: boolean;
        preservesRulePaths: boolean;
        recallFindsPathRule: boolean;
        unrelatedSkipsPathRule: any;
        indexLinksGlobalDocs: boolean;
    };
    discovery: {
        discoveredCount: any;
        status: any;
    };
    imported: {
        importedCount: any;
        status: any;
        includeAudit: any;
    };
    recalled: any;
};
