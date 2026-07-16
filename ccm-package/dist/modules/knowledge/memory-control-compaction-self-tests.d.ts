export declare function runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest(): {
    pass: boolean;
    checks: {
        pressureReportFindsConflict: boolean;
        repairReportCreatesCoveredWorkItem: boolean;
        repairItemCarriesPressureContext: boolean;
        repairItemSurfacesAsMainAgentCandidate: boolean;
        existingStateMachineHandlesRepairItem: any;
    };
    pressure: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        sourceGroupCount: number;
        projectCount: any;
        checkedProjectCount: any;
        localProjectCount: any;
        crossGroupAssistProjectCount: any;
        crossGroupSupplementCount: any;
        conflictCount: any;
        staleCrossGroupEntryCount: any;
        freshCrossGroupEntryCount: any;
    };
    repair: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWork: any;
        groupsCovered: any;
        requiredActionCount: any;
        coveredItemCount: any;
        openItemCount: any;
        conflictRepairCount: any;
        staleOnlyRepairCount: any;
    };
    repairItem: {
        id: any;
        status: any;
        priority: any;
        target_project: any;
        local_recommendation: any;
        cross_group_recommendation: any;
    };
    candidate: {
        id: any;
        source: any;
        recommendedAction: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest(): {
    pass: boolean;
    checks: {
        gateReportAcceptsBlockedOverBudget: boolean;
        gateQualityCheckPasses: boolean;
        overBudgetStillCreatesRepairItem: boolean;
    };
    gateReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        gateBindingCount: any;
        validGateCount: any;
        metadataGapCount: any;
        overBudgetCount: any;
        blockedOverBudgetCount: any;
        blockedGateCount: any;
        compactRecommendedCount: any;
    };
    repairReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWork: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        currentOpenItemCount: any;
        coveredItemCount: any;
        overBudgetCount: any;
        criticalCount: any;
        compactRecommendedCount: any;
        maxPressure: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketCompactionRetrySelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsRecoveredRetry: boolean;
        qualityCheckCoversRetry: boolean;
        retryShowsTokenRecovery: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        validRetryCount: any;
        metadataGapCount: any;
        recoveredCount: any;
        blockedCount: any;
        memoryFirstCount: any;
        partialCompactCount: any;
        partialCompactPolicyCount: any;
        totalOmittedChars: any;
        memoryOmittedChars: any;
        partialOmittedChars: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketMemoryFirstCompactionRetrySelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsMemoryFirstRetry: boolean;
        qualityCheckCoversMemoryFirstRetry: boolean;
        retryShowsMemoryFirstRecovery: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        validRetryCount: any;
        metadataGapCount: any;
        recoveredCount: any;
        blockedCount: any;
        memoryFirstCount: any;
        partialCompactCount: any;
        partialCompactPolicyCount: any;
        totalOmittedChars: any;
        memoryOmittedChars: any;
        partialOmittedChars: any;
    };
    retry: {
        memory_first: boolean;
        memory_compaction_schema: any;
        memory_omitted_chars: any;
        original_task_chars: any;
        compacted_task_chars: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPartialCompactRetrySelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsPartialCompactRetry: boolean;
        qualityCheckCoversPartialCompactRetry: boolean;
        retryShowsPartialRecoveryWithoutTaskCompaction: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        validRetryCount: any;
        metadataGapCount: any;
        recoveredCount: any;
        blockedCount: any;
        memoryFirstCount: any;
        partialCompactCount: any;
        partialCompactPolicyCount: any;
        totalOmittedChars: any;
        memoryOmittedChars: any;
        partialOmittedChars: any;
    };
    retry: {
        partial_compact: boolean;
        partial_compaction_schema: any;
        partial_compaction_category: any;
        partial_omitted_chars: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketMetadataPartialCompactRetrySelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsMetadataPartialCompactRetry: boolean;
        qualityCheckCoversMetadataPartialCompactRetry: boolean;
        retryShowsMetadataRecoveryWithoutTaskCompaction: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        validRetryCount: any;
        metadataGapCount: any;
        recoveredCount: any;
        blockedCount: any;
        memoryFirstCount: any;
        partialCompactCount: any;
        partialCompactPolicyCount: any;
        totalOmittedChars: any;
        memoryOmittedChars: any;
        partialOmittedChars: any;
    };
    retry: {
        partial_compact: boolean;
        partial_compaction_schema: any;
        partial_compaction_category: any;
        partial_compaction_categories: any;
        partial_omitted_chars: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest(): {
    pass: boolean;
    checks: {
        reportCountsPartialCompactPolicy: boolean;
        retryRowExposesPolicy: any;
        qualityCheckCoversPolicy: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        validRetryCount: any;
        metadataGapCount: any;
        recoveredCount: any;
        blockedCount: any;
        memoryFirstCount: any;
        partialCompactCount: any;
        partialCompactPolicyCount: any;
        totalOmittedChars: any;
        memoryOmittedChars: any;
        partialOmittedChars: any;
    };
    retry: {
        partial_compact_policy: any;
        partial_compaction_categories: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsOutcomeLedger: boolean;
        qualityCheckCoversOutcomeLedger: boolean;
        outcomeRowCarriesStrategySample: any;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        outcomeCount: any;
        validOutcomeCount: any;
        metadataGapCount: any;
        recoveredOutcomeCount: any;
        blockedOutcomeCount: any;
        partialCompactPolicyOutcomeCount: any;
        taskPreservedOutcomeCount: any;
        providerRankingProvenanceRequiredCount: any;
        providerRankingProvenancePreservedCount: any;
        completionMemoryPreservationRequiredCount: any;
        completionMemoryPreservedCount: any;
        totalTokenDelta: any;
        totalFreeTokenDelta: any;
    };
    outcome: {
        outcome_status: any;
        selected_categories: any;
        token_delta: any;
        task_hash_unchanged: boolean;
        provider_ranking_provenance_required: boolean;
        provider_ranking_provenance_preserved: boolean;
        provider_ranking_provenance_rel_paths: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairWorkItemsSelfTest(): {
    pass: boolean;
    checks: {
        lossReportCreatesRepairWorkItem: boolean;
        qualityCheckCoversRepairWorkItems: boolean;
        repairItemCarriesProviderProvenanceContract: boolean;
        repairCandidateSurfacesForMainAgent: any;
        resolvedOutcomeClosesOpenRepairItem: boolean;
    };
    lossReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWork: any;
        groupsCovered: any;
        requiredActionCount: any;
        coveredItemCount: any;
        openItemCount: any;
        currentOpenItemCount: any;
        completedCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    repairItem: {
        id: any;
        status: string;
        priority: any;
        provider_switch_decision_receipt_id: any;
        rel_paths: any;
    };
    candidate: {
        id: any;
        source: any;
        receipt: any;
        rel_paths: any;
    };
    resolved: {
        status: string;
        completedStatus: string;
        resolutionReason: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairDispatchBriefSelfTest(): {
    pass: boolean;
    checks: {
        workItemReportCreatesProviderRepairItem: boolean;
        briefReportCoversProviderRepairCandidate: boolean;
        qualityCheckCoversProviderRepairBrief: boolean;
        readyBriefMirrorsReceiptAndTypedMemory: boolean;
        workerTaskCarriesRerenderReceiptContract: boolean;
    };
    workItemReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWork: any;
        groupsCovered: any;
        requiredActionCount: any;
        coveredItemCount: any;
        openItemCount: any;
        currentOpenItemCount: any;
        completedCount: any;
    };
    briefReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingBriefs: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        readyBriefCount: any;
        metadataGapCount: any;
        receiptBoundBriefCount: any;
        typedMemoryBriefCount: any;
        preservationContractBriefCount: any;
        authorizationBoundaryBriefCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    brief: {
        brief_id: any;
        source: any;
        receipt_id: any;
        receipt_checksum: any;
        rel_paths: any;
        row_ids: any;
        metadataGaps: any;
        worker_task: string;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptConsumptionSelfTest(): {
    pass: boolean;
    checks: {
        incompleteReceiptDoesNotCloseRepairItem: boolean;
        completeReceiptClosesOnlyAfterVerifiedProviderProof: boolean;
        timelineBindingRecordsProviderProof: boolean;
        receiptConsumptionReportPasses: boolean;
        qualityCheckRegisteredAndPasses: boolean;
    };
    incompleteReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        receiptBindingCount: any;
        validConsumptionCount: any;
        metadataGapCount: any;
        verifiedUsageCount: any;
        preservedCount: any;
        receiptBoundCount: any;
        typedMemoryBoundCount: any;
        completedRepairItemCount: any;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        receiptBindingCount: any;
        validConsumptionCount: any;
        metadataGapCount: any;
        verifiedUsageCount: any;
        preservedCount: any;
        receiptBoundCount: any;
        typedMemoryBoundCount: any;
        completedRepairItemCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    binding: {
        timeline_binding_id: any;
        receipt_id: any;
        receipt_checksum: any;
        rel_paths: any;
        row_ids: any;
        preserved: boolean;
        repair_status: any;
        repair_gap_type: any;
    };
    completedItem: {
        id: any;
        status: string;
        resolutionReason: any;
        completion_source: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        reportDistillsVerifiedReceipts: boolean;
        qualityCheckRegisteredAndPasses: boolean;
        ledgerArchiveCreated: boolean;
        typedDocAndRecallWork: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        verifiedReceiptCount: any;
        archivedReceiptCount: any;
        typedArchiveCount: any;
        typedDocCount: any;
        recallProbeCoveredCount: any;
        authorizationBoundaryCoveredCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    archive: {
        archived_count: any;
        rel_path_count: any;
        row_id_count: any;
    };
    recalled: any;
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptWorkerContextRecallSelfTest(): {
    pass: boolean;
    checks: {
        distillationCreatedArchive: boolean;
        legacyMemoryIsNotInjectedIntoUnscopedSessions: boolean;
        qualityCheckRegistersSafeLegacyBoundary: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        archivedReceiptCount: number;
        recalledGroupCount: number;
        repeatChildSessionRecallCount: number;
        renderedContextCoveredCount: number;
        workerContextPacketCoveredCount: number;
        loadPlanDocCount: number;
        metadataGapCount: number;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    group: {
        status: any;
        recalledThisTurn: boolean;
        repeatChildSessionRecalled: boolean;
        workerContextPacketCovered: boolean;
        typedRecallUsageTokens: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageContractSelfTest(): {
    pass: boolean;
    checks: {
        distillationCreatedArchive: boolean;
        reportProvesContractInjection: boolean;
        reportProvesUsageCategory: boolean;
        reportProvesReceiptValidator: boolean;
        qualityCheckRegisteredAndPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        archivedReceiptCount: number;
        contractActiveCount: number;
        acceptanceUsageCount: number;
        renderedContractCoveredCount: number;
        validatorCoveredCount: number;
        metadataGapCount: number;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    group: {
        status: any;
        contractActive: boolean;
        acceptanceRequiresUsage: boolean;
        renderedContractCovered: boolean;
        contextUsageTokens: any;
        goodReceiptPass: boolean;
        badReceiptPass: boolean;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptSelfTest(): {
    pass: boolean;
    checks: {
        reportProvesReceiptCoverage: boolean;
        reportPreservesAuthorizationBoundary: any;
        badReceiptRejected: boolean;
        qualityCheckRegisteredAndPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        receiptContractCount: any;
        coveredReceiptCount: any;
        missingReceiptCoverageCount: number;
        missingReceiptCount: any;
        missingDocCoverageCount: any;
        missingUsageStateCount: any;
        missingAuthorizationBoundaryCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    group: {
        status: any;
        receiptContractCount: any;
        compliantReceiptCount: any;
        missingReceiptCoverageCount: any;
    };
    badRow: {
        compliant: boolean;
        gaps: string[];
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairSelfTest(): {
    pass: boolean;
    checks: {
        repairWorkItemCreated: any;
        repairDispatchCandidateCreated: boolean;
        qualityChecksRegisteredAndPass: boolean;
    };
    repairReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingRepairItems: any;
        groupsCovered: any;
        expectedRepairItemCount: any;
        coveredRepairItemCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        dispatchMarkedCount: any;
        docRelPathItemCount: any;
        boundaryPromptItemCount: any;
    };
    candidateReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingCandidates: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedCandidateCount: any;
        coveredCandidateCount: any;
        candidateCount: any;
        readyCount: any;
        dispatchMarkedCount: any;
        metadataGapCount: any;
        promptPatchCandidateCount: any;
        packetBoundCandidateCount: any;
        docRelPathCandidateCount: any;
        boundaryPromptCandidateCount: any;
    };
    qualityChecks: {
        repair: {
            id: any;
            status: any;
            checked: any;
            passed: any;
        };
        candidate: {
            id: any;
            status: any;
            checked: any;
            passed: any;
        };
    };
    repairItem: any;
    candidate: {
        work_item_id: any;
        source: any;
        worker_context_packet_id: any;
        shouldCreateRealTask: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefSelfTest(): {
    pass: boolean;
    checks: {
        briefCreatedAndRegistered: boolean;
        briefIsSelfContained: boolean;
        qualityCheckRegisteredAndPasses: boolean;
    };
    briefReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingBriefs: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        readyBriefCount: any;
        metadataGapCount: any;
        packetBoundBriefCount: any;
        docRelPathBriefCount: any;
        requiredDocBriefCount: any;
        disciplineRequiredDocBriefCount: any;
        missingDocBriefCount: any;
        memoryUsedPromptBriefCount: any;
        memoryIgnoredPromptBriefCount: any;
        authorizationBoundaryBriefCount: any;
        freshReceiptBriefCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    brief: {
        brief_id: any;
        work_item_id: any;
        source: any;
        worker_context_packet_id: any;
        worker_task: string;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        repairDispatchChainReady: boolean;
        typedMemoryReportPasses: boolean;
        qualityCheckExposesTypedMemory: boolean;
        ledgerArchivesProviderRankingReceiptRows: any;
        typedDocContainsReceiptDiscipline: boolean;
        recallFindsProviderRankingReceiptDiscipline: boolean;
    };
    repairReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingRepairItems: any;
        groupsCovered: any;
        expectedRepairItemCount: any;
        coveredRepairItemCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        dispatchMarkedCount: any;
        docRelPathItemCount: any;
        boundaryPromptItemCount: any;
    };
    candidateReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingCandidates: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedCandidateCount: any;
        coveredCandidateCount: any;
        candidateCount: any;
        readyCount: any;
        dispatchMarkedCount: any;
        metadataGapCount: any;
        promptPatchCandidateCount: any;
        packetBoundCandidateCount: any;
        docRelPathCandidateCount: any;
        boundaryPromptCandidateCount: any;
    };
    briefReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingBriefs: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        readyBriefCount: any;
        metadataGapCount: any;
        packetBoundBriefCount: any;
        docRelPathBriefCount: any;
        requiredDocBriefCount: any;
        disciplineRequiredDocBriefCount: any;
        missingDocBriefCount: any;
        memoryUsedPromptBriefCount: any;
        memoryIgnoredPromptBriefCount: any;
        authorizationBoundaryBriefCount: any;
        freshReceiptBriefCount: any;
    };
    typedReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        inputRowCount: number;
        repairItemCount: number;
        candidateCount: number;
        briefCount: number;
        archivedCount: number;
        typedMemoryDocCount: number;
        recallMatchCount: number;
        docRelPathCount: number;
        correctedPromptCount: number;
        usageStatePromptCount: number;
        authorizationBoundaryPromptCount: number;
        freshReceiptPromptCount: number;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    archive: {
        archived_count: any;
        corrected_prompt_count: any;
        usage_state_prompt_count: any;
        authorization_boundary_prompt_count: any;
        fresh_receipt_prompt_count: any;
        doc_rel_paths: any;
    };
    doc: {
        relPath: any;
        source: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairWorkerContextInjectionSelfTest(): {
    pass: boolean;
    checks: {
        typedMemoryReportReady: boolean;
        workerContextInjectionReportPasses: boolean;
        contractRequiresDisciplineDoc: any;
        qualityCheckRegisteredAndPasses: boolean;
    };
    typedMemoryReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        inputRowCount: number;
        repairItemCount: number;
        candidateCount: number;
        briefCount: number;
        archivedCount: number;
        typedMemoryDocCount: number;
        recallMatchCount: number;
        docRelPathCount: number;
        correctedPromptCount: number;
        usageStatePromptCount: number;
        authorizationBoundaryPromptCount: number;
        freshReceiptPromptCount: number;
    };
    injectionReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        archivedCount: any;
        typedMemoryDocCount: any;
        recallSurfacedDisciplineCount: any;
        renderedContextCoveredCount: any;
        workerContextPacketCoveredCount: any;
        contextUsageContractTokens: any;
        loadPlanDisciplineCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    group: {
        status: any;
        recallSurfacedDiscipline: boolean;
        renderedContextCovered: boolean;
        workerContextPacketCovered: boolean;
        contract: any;
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocsSelfTest(): {
    pass: boolean;
    checks: {
        baseReceiptReportAcceptsAllRequiredDocs: boolean;
        requiredDocsReportAcceptsAllRequiredDocs: boolean;
        qualityCheckRegisteredAndPasses: boolean;
        goodReceiptCoversBothDocs: boolean;
        badReceiptRejectedForMissingDisciplineDoc: boolean;
        repairItemCarriesRequiredAndMissingDocs: boolean;
    };
    receiptReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        receiptContractCount: any;
        coveredReceiptCount: any;
        missingReceiptCoverageCount: number;
        missingReceiptCount: any;
        missingDocCoverageCount: any;
        missingUsageStateCount: any;
        missingAuthorizationBoundaryCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        metadataGapCount: any;
    };
    requiredDocsReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredDocReceiptCount: any;
        coveredRequiredDocReceiptCount: any;
        disciplineDocReceiptCount: any;
        missingRequiredDocCount: any;
        missingUsageStateDocCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    group: {
        status: any;
        requiredDocRelPaths: any;
        disciplineDocReceiptCount: any;
    };
    goodReceipt: {
        requiredDocRelPaths: any;
        coveredDocRelPaths: any;
        missingDocRelPaths: any;
        missingUsageStateDocRelPaths: any;
    };
    badRow: {
        compliant: boolean;
        missingDocRelPaths: any[];
        missingUsageStateDocRelPaths: any[];
        gaps: string[];
    };
    badRepairItem: {
        requiredDocRelPaths: string[];
        missingDocRelPaths: string[];
    };
};
export declare function runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefRequiredDocsSelfTest(): {
    pass: boolean;
    checks: {
        repairCandidateAndBriefReportsPass: boolean;
        candidateCarriesRequiredAndMissingDocs: boolean;
        briefCarriesRequiredAndMissingDocs: boolean;
        briefWorkerTaskIsSelfContained: boolean;
        requiredDocsQualityPasses: boolean;
    };
    repairReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingRepairItems: any;
        groupsCovered: any;
        expectedRepairItemCount: any;
        coveredRepairItemCount: any;
        repairItemCount: any;
        openRepairItemCount: any;
        dispatchMarkedCount: any;
        docRelPathItemCount: any;
        boundaryPromptItemCount: any;
    };
    candidateReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingCandidates: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedCandidateCount: any;
        coveredCandidateCount: any;
        candidateCount: any;
        readyCount: any;
        dispatchMarkedCount: any;
        metadataGapCount: any;
        promptPatchCandidateCount: any;
        packetBoundCandidateCount: any;
        docRelPathCandidateCount: any;
        boundaryPromptCandidateCount: any;
    };
    briefReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsNeedingBriefs: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        readyBriefCount: any;
        metadataGapCount: any;
        packetBoundBriefCount: any;
        docRelPathBriefCount: any;
        requiredDocBriefCount: any;
        disciplineRequiredDocBriefCount: any;
        missingDocBriefCount: any;
        memoryUsedPromptBriefCount: any;
        memoryIgnoredPromptBriefCount: any;
        authorizationBoundaryBriefCount: any;
        freshReceiptBriefCount: any;
    };
    requiredDocsReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        scopeCount: any;
        exactSessionCount: any;
        legacyScopeCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredDocBriefCount: any;
        coveredRequiredDocBriefCount: any;
        disciplineDocBriefCount: any;
        missingDocBriefCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    candidate: {
        requiredDocRelPaths: any;
        missingDocRelPaths: any;
        provenanceRelPaths: any;
    };
    brief: {
        status: any;
        requiredDocRelPaths: any;
        missingDocRelPaths: any;
        provenanceRelPaths: any;
        worker_task: string;
    };
};
export declare function runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest(): {
    pass: boolean;
    checks: {
        reportDistillsStrategyMemory: boolean;
        strategySidecarCreated: boolean;
        preferredCategoryFromRecovery: boolean;
        qualityCheckCoversStrategyMemory: boolean;
        reportRowCarriesStrategy: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        distilledOutcomeCount: number;
        strategyMemoryCount: number;
        categoryCount: number;
        preferredCategoryCount: number;
        metadataGapCount: number;
    };
    strategy: {
        preferred_categories: any;
        sample_count: any;
        source_ledger_file: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        strategyReportReady: boolean;
        typedMemoryReportPasses: boolean;
        qualityCheckExposesTypedMemory: boolean;
        ledgerArchivesCompactStrategy: boolean;
        referenceDocContainsStrategy: boolean;
        cautionDocContainsBlockedCategory: boolean;
        recallFindsCompactStrategyMemory: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        outcomeCount: any;
        strategySampleCount: any;
        archivedOutcomeCount: any;
        categoryCount: any;
        preferredCount: any;
        avoidCount: any;
        typedDocCount: any;
        recallMatchCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    docs: {
        relPath: any;
        source: any;
        type: any;
    }[];
};
export declare function runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest(): {
    pass: boolean;
    checks: {
        reportEngagesPtlEmergency: boolean;
        hintSidecarCreated: boolean;
        hintCarriesDowngradeBudgets: boolean;
        qualityCheckCoversPtlEmergency: boolean;
        reportRowCarriesPtl: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        exactSessionCount: number;
        legacyScopeCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        engagedCount: number;
        criticalCount: number;
        blockedOutcomeCount: number;
        taskCompactedBlockedCount: number;
        metadataGapCount: number;
    };
    hint: {
        engaged: any;
        emergency_level: any;
        blocked_outcome_count: any;
        maxTaskChars: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        ptlReportReady: boolean;
        typedMemoryReportPasses: boolean;
        qualityCheckExposesTypedMemory: boolean;
        ledgerArchivesPtlEmergency: boolean;
        typedDocContainsEmergencyBudgets: boolean;
        typedDocContainsFailureSignals: boolean;
        recallFindsPtlEmergencyDiscipline: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        engagedCount: any;
        outcomeCount: any;
        blockedOutcomeCount: any;
        taskCompactedBlockedCount: any;
        failedCategoryCount: any;
        typedDocCount: any;
        recallMatchCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    doc: {
        relPath: any;
        source: any;
        type: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest(): {
    pass: boolean;
    checks: {
        reportCoversIgnorePolicy: boolean;
        reportRequiresReceiptAndProof: boolean;
        qualityCheckExposesIgnorePolicy: boolean;
        reinjectionProofAcceptsIgnoredByPolicy: boolean;
        policyRowCarriesReason: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        ignoredPolicyBindingCount: any;
        validIgnoredPolicyCount: any;
        metadataGapCount: any;
        receiptRequiredCount: any;
        ignoredProofCount: any;
        usagePolicyCategoryCount: any;
        renderedIgnoredPolicyCount: any;
    };
    proofReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        reinjectionBindingCount: any;
        validReinjectionCount: any;
        metadataGapCount: any;
        memoryFirstCount: any;
        compactedReinjectionCount: any;
        ignoredByPolicyCount: any;
        hashMatchCount: any;
        renderedProofCount: any;
        renderedMemoryCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest(): {
    pass: boolean;
    checks: {
        missingComplianceDetectsGap: boolean;
        missingGapCreatesRepairItem: boolean;
        repairQualityCheckCoversGap: boolean;
        resolvedCompliancePasses: boolean;
        resolvedRepairItemClosed: boolean;
    };
    missingComplianceReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        ignoredPolicyBindingCount: any;
        compliantReceiptCount: any;
        metadataGapCount: any;
        missingReceiptCount: any;
        missingMemoryIgnoredCount: any;
        missingReasonCount: any;
        memoryUsedViolationCount: any;
    };
    missingRepairReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        currentOpenItemCount: any;
        staleOpenItemCount: any;
        coveredItemCount: any;
        total: any;
        missingReceiptCount: any;
        memoryUsedViolationCount: any;
    };
    resolvedComplianceReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        ignoredPolicyBindingCount: any;
        compliantReceiptCount: any;
        metadataGapCount: any;
        missingReceiptCount: any;
        missingMemoryIgnoredCount: any;
        missingReasonCount: any;
        memoryUsedViolationCount: any;
    };
    resolvedRepairReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        currentOpenItemCount: any;
        staleOpenItemCount: any;
        coveredItemCount: any;
        total: any;
        missingReceiptCount: any;
        memoryUsedViolationCount: any;
    };
    repairItem: {
        id: any;
        status: any;
        source: any;
        component: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest(): {
    pass: boolean;
    checks: {
        repairItemCreated: boolean;
        repairItemBecomesDispatchCandidate: boolean;
        candidateQualityCheckPasses: boolean;
        correctedReceiptBriefCreated: boolean;
        briefQualityCheckPasses: boolean;
        renderedContextMentionsIgnoreMemoryCandidate: any;
    };
    repairReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        currentOpenItemCount: any;
        staleOpenItemCount: any;
        coveredItemCount: any;
        total: any;
        missingReceiptCount: any;
        memoryUsedViolationCount: any;
    };
    candidateReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingCandidates: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedCandidateCount: any;
        coveredCandidateCount: any;
        candidateCount: any;
        readyCount: any;
        dispatchMarkedCount: any;
        metadataGapCount: any;
        promptPatchCandidateCount: any;
        packetBoundCandidateCount: any;
    };
    briefReport: {
        status: string;
        coverageRate: number;
        metadataCoverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingBriefs: any;
        groupsCovered: any;
        groupsMetadataComplete: any;
        expectedBriefCount: any;
        coveredBriefCount: any;
        readyBriefCount: any;
        metadataGapCount: any;
        packetBoundBriefCount: any;
        memoryIgnoredPromptBriefCount: any;
    };
    candidate: {
        work_item_id: any;
        source: any;
        worker_context_packet_id: any;
        memory_policy_reason: any;
    };
    brief: {
        brief_id: any;
        source: any;
        worker_context_packet_id: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        repairDispatchChainReady: boolean;
        typedMemoryReportPasses: boolean;
        qualityCheckExposesTypedMemory: boolean;
        ledgerArchivesIgnoreMemoryRows: boolean;
        typedDocContainsReceiptDiscipline: boolean;
        recallFindsIgnoreMemoryDiscipline: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        inputRowCount: number;
        archivedCount: number;
        typedMemoryDocCount: number;
        recallMatchCount: number;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    doc: {
        relPath: any;
        source: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketCompactHookLedgerSelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsPrePostHookLedger: boolean;
        qualityCheckCoversCompactHookLedger: boolean;
        hookRowBindsRetryToPrePost: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        retryBindingCount: any;
        validHookBindingCount: any;
        metadataGapCount: any;
        hookRunCount: any;
        preHookCount: any;
        postHookCount: any;
        memoryFirstHookCount: any;
        recoveredHookCount: any;
        blockedHookCount: any;
    };
    hook: {
        hook_run_id: any;
        pre_count: any;
        post_count: any;
        post_dispatch_ready: boolean;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketMemoryReinjectionProofSelfTest(): {
    pass: boolean;
    checks: {
        reportAcceptsMemoryReinjectionProof: boolean;
        qualityCheckCoversMemoryReinjectionProof: boolean;
        proofBindsRetryHashToRenderedPacket: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        reinjectionBindingCount: any;
        validReinjectionCount: any;
        metadataGapCount: any;
        memoryFirstCount: any;
        compactedReinjectionCount: any;
        ignoredByPolicyCount: any;
        hashMatchCount: any;
        renderedProofCount: any;
        renderedMemoryCount: any;
    };
    proof: {
        status: any;
        memory_first: boolean;
        hash_matches_compaction: boolean;
        rendered_memory_reinjection_proof: boolean;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineBindingSelfTest(): {
    pass: boolean;
    checks: {
        dispatchBriefReady: boolean;
        assignmentCarriesBriefBinding: boolean;
        timelineLedgerMergesRequiredEvents: boolean;
        timelineLedgerCarriesExecutionProof: boolean;
        qualityCoversTimelineBinding: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        bindingCount: any;
        validBindingCount: any;
        metadataGapCount: any;
        taskBoundBindingCount: any;
        sessionBoundBindingCount: any;
        snapshotBoundBindingCount: any;
        executionBoundBindingCount: any;
        runnerBoundBindingCount: any;
        receiptBoundBindingCount: any;
        requiredEventCoverageCount: any;
    };
    binding: {
        timeline_binding_id: any;
        brief_id: any;
        task_id: any;
        assignment_id: any;
        worker_context_packet_id: any;
        task_agent_session_id: any;
        memory_context_snapshot_id: any;
        execution_id: any;
        event_types: any;
    };
};
