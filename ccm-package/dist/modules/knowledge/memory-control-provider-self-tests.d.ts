export declare function runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest(): {
    pass: boolean;
    checks: {
        usageReportSeesOverBudget: boolean;
        repairReportCreatesOpenWorkItem: boolean;
        repairItemCarriesPressureMetadata: boolean;
        dispatchCandidateSurfacesRepair: boolean;
        qualityCheckCoversReactiveRepair: boolean;
    };
    usageReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        packetBindingCount: any;
        validUsageCount: any;
        metadataGapCount: any;
        overBudgetCount: any;
        compactRecommendedCount: any;
        renderedBudgetCount: any;
        totalTokens: any;
        maxPressure: any;
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
    repairItem: {
        id: any;
        status: any;
        priority: any;
        packet_id: any;
        usage_status: any;
        top_categories: any;
    };
    candidate: {
        candidate_id: any;
        work_item_id: any;
        source: any;
        recommendedAction: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        repairReportCreatesPressureItem: boolean;
        typedMemoryReportPasses: boolean;
        qualityCheckExposesTypedMemory: boolean;
        ledgerArchivesContextUsageRows: boolean;
        typedDocContainsBudgetDiscipline: boolean;
        recallFindsContextUsageDiscipline: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        inputRowCount: any;
        repairItemCount: any;
        archivedCount: any;
        typedMemoryDocCount: any;
        recallMatchCount: any;
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
    doc: {
        relPath: any;
        source: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest(): {
    pass: boolean;
    checks: {
        highPressureWithoutRecallFails: boolean;
        recallWithoutReceiptWarns: boolean;
        receiptLedgerClosesLoop: boolean;
        usageLedgerPersistsUsedAndIgnored: boolean;
        usageAgingHealthExposed: boolean;
    };
    reports: {
        missingRecall: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressurePacketCount: any;
            overBudgetCount: any;
            criticalCount: any;
            pressureRecallPacketCount: any;
            usageLedgerPacketCount: any;
            pressureDocCount: any;
            usageEntryCount: any;
            staleUsageMemoryCount: any;
            staleUsageEntryCount: any;
            freshUsageEntryCount: any;
            maxPressure: any;
        };
        missingUsage: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressurePacketCount: any;
            overBudgetCount: any;
            criticalCount: any;
            pressureRecallPacketCount: any;
            usageLedgerPacketCount: any;
            pressureDocCount: any;
            usageEntryCount: any;
            staleUsageMemoryCount: any;
            staleUsageEntryCount: any;
            freshUsageEntryCount: any;
            maxPressure: any;
        };
        ok: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressurePacketCount: any;
            overBudgetCount: any;
            criticalCount: any;
            pressureRecallPacketCount: any;
            usageLedgerPacketCount: any;
            pressureDocCount: any;
            usageEntryCount: any;
            staleUsageMemoryCount: any;
            staleUsageEntryCount: any;
            freshUsageEntryCount: any;
            maxPressure: any;
        };
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    usageRecord: {
        recorded_count: any;
        stale_recorded_count: any;
        duplicate_count: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest(): {
    pass: boolean;
    checks: {
        missingReceiptFailsAndCreatesRepair: boolean;
        genericMemoryUsedStillFails: boolean;
        unsafeStructuredUseWarns: boolean;
        structuredVerifiedReceiptPassesAndClosesRepair: boolean;
        projectStatsExposeTrustedDisputedVerifiedCounts: boolean;
    };
    reports: {
        missingReceipt: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressureProvenancePacketCount: any;
            provenanceDocCount: any;
            requiredProvenanceDocCount: any;
            receiptRowCount: any;
            compliantDocCount: any;
            missingReceiptCount: any;
            missingMemoryProvenanceUsageCount: any;
            missingStructuredDocReceiptCount: any;
            unsafeDisputedUseCount: any;
            missingRepairWorkItemIdCount: any;
            trustedCount: any;
            disputedCount: any;
            staleUnderRepairCount: any;
            verifiedUnderRepairCount: any;
            repairWorkItemCount: any;
            openRepairWorkItemCount: any;
        };
        missingStructured: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressureProvenancePacketCount: any;
            provenanceDocCount: any;
            requiredProvenanceDocCount: any;
            receiptRowCount: any;
            compliantDocCount: any;
            missingReceiptCount: any;
            missingMemoryProvenanceUsageCount: any;
            missingStructuredDocReceiptCount: any;
            unsafeDisputedUseCount: any;
            missingRepairWorkItemIdCount: any;
            trustedCount: any;
            disputedCount: any;
            staleUnderRepairCount: any;
            verifiedUnderRepairCount: any;
            repairWorkItemCount: any;
            openRepairWorkItemCount: any;
        };
        unsafe: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressureProvenancePacketCount: any;
            provenanceDocCount: any;
            requiredProvenanceDocCount: any;
            receiptRowCount: any;
            compliantDocCount: any;
            missingReceiptCount: any;
            missingMemoryProvenanceUsageCount: any;
            missingStructuredDocReceiptCount: any;
            unsafeDisputedUseCount: any;
            missingRepairWorkItemIdCount: any;
            trustedCount: any;
            disputedCount: any;
            staleUnderRepairCount: any;
            verifiedUnderRepairCount: any;
            repairWorkItemCount: any;
            openRepairWorkItemCount: any;
        };
        resolved: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            pressureProvenancePacketCount: any;
            provenanceDocCount: any;
            requiredProvenanceDocCount: any;
            receiptRowCount: any;
            compliantDocCount: any;
            missingReceiptCount: any;
            missingMemoryProvenanceUsageCount: any;
            missingStructuredDocReceiptCount: any;
            unsafeDisputedUseCount: any;
            missingRepairWorkItemIdCount: any;
            trustedCount: any;
            disputedCount: any;
            staleUnderRepairCount: any;
            verifiedUnderRepairCount: any;
            repairWorkItemCount: any;
            openRepairWorkItemCount: any;
        };
    };
    repairItem: {
        id: any;
        status: any;
        source: any;
        component: any;
    };
    project: any;
};
export declare function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest(): {
    pass: boolean;
    checks: {
        receiptGapCreatesRepairItem: boolean;
        repairItemBecomesDispatchCandidate: boolean;
        candidateQualityCheckPasses: boolean;
        correctedReceiptBriefCreated: boolean;
        briefQualityCheckPasses: boolean;
        renderedContextMentionsPressureProvenanceCandidate: any;
    };
    receiptReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        pressureProvenancePacketCount: any;
        provenanceDocCount: any;
        requiredProvenanceDocCount: any;
        receiptRowCount: any;
        compliantDocCount: any;
        missingReceiptCount: any;
        missingMemoryProvenanceUsageCount: any;
        missingStructuredDocReceiptCount: any;
        unsafeDisputedUseCount: any;
        missingRepairWorkItemIdCount: any;
        trustedCount: any;
        disputedCount: any;
        staleUnderRepairCount: any;
        verifiedUnderRepairCount: any;
        repairWorkItemCount: any;
        openRepairWorkItemCount: any;
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
        provenanceRelPathCandidateCount: any;
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
        provenanceRelPathBriefCount: any;
        repairWorkItemIdBriefCount: any;
        memoryProvenanceUsagePromptBriefCount: any;
        currentSourceVerifiedPromptBriefCount: any;
    };
    candidate: {
        work_item_id: any;
        source: any;
        worker_context_packet_id: any;
        rel_paths: any;
        repair_ids: any;
    };
    brief: {
        brief_id: any;
        source: any;
        worker_context_packet_id: any;
        rel_paths: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefRequiredDocsSelfTest(): {
    pass: boolean;
    checks: {
        missingReceiptCreatesRepairChain: boolean;
        candidateCarriesAllPressureDocs: boolean;
        briefCarriesAllPressureDocs: boolean;
        briefWorkerTaskIsSelfContained: boolean;
        requiredDocsQualityPasses: boolean;
    };
    receiptReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        pressureProvenancePacketCount: any;
        provenanceDocCount: any;
        requiredProvenanceDocCount: any;
        receiptRowCount: any;
        compliantDocCount: any;
        missingReceiptCount: any;
        missingMemoryProvenanceUsageCount: any;
        missingStructuredDocReceiptCount: any;
        unsafeDisputedUseCount: any;
        missingRepairWorkItemIdCount: any;
        trustedCount: any;
        disputedCount: any;
        staleUnderRepairCount: any;
        verifiedUnderRepairCount: any;
        repairWorkItemCount: any;
        openRepairWorkItemCount: any;
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
        provenanceRelPathCandidateCount: any;
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
        provenanceRelPathBriefCount: any;
        repairWorkItemIdBriefCount: any;
        memoryProvenanceUsagePromptBriefCount: any;
        currentSourceVerifiedPromptBriefCount: any;
    };
    requiredDocsReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        requiredDocBriefCount: any;
        coveredRequiredDocBriefCount: any;
        requiredRelPathCount: any;
        requiredRepairWorkItemIdCount: any;
        metadataGapCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    candidate: {
        rel_paths: any;
        repair_ids: any;
    };
    brief: {
        rel_paths: any;
        repair_ids: any;
        worker_task: string;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        repairDispatchChainReady: boolean;
        typedMemoryReportPasses: boolean;
        qualityCheckExposesTypedMemory: boolean;
        ledgerArchivesPressureProvenanceRows: any;
        typedDocContainsReceiptDiscipline: boolean;
        recallFindsPressureProvenanceDiscipline: boolean;
    };
    receiptReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        pressureProvenancePacketCount: any;
        provenanceDocCount: any;
        requiredProvenanceDocCount: any;
        receiptRowCount: any;
        compliantDocCount: any;
        missingReceiptCount: any;
        missingMemoryProvenanceUsageCount: any;
        missingStructuredDocReceiptCount: any;
        unsafeDisputedUseCount: any;
        missingRepairWorkItemIdCount: any;
        trustedCount: any;
        disputedCount: any;
        staleUnderRepairCount: any;
        verifiedUnderRepairCount: any;
        repairWorkItemCount: any;
        openRepairWorkItemCount: any;
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
        provenanceRelPathCandidateCount: any;
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
        provenanceRelPathBriefCount: any;
        repairWorkItemIdBriefCount: any;
        memoryProvenanceUsagePromptBriefCount: any;
        currentSourceVerifiedPromptBriefCount: any;
    };
    typedReport: {
        status: string;
        coverageRate: number;
        groupCount: number;
        checkedGroupCount: number;
        groupsCovered: number;
        inputRowCount: number;
        archivedCount: number;
        typedMemoryDocCount: number;
        recallMatchCount: number;
        correctedPromptCount: number;
        currentSourceVerifiedPromptCount: number;
        relPathCount: number;
        repairWorkItemCount: number;
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
        current_source_verified_prompt_count: any;
        rel_paths: any;
        repair_work_item_ids: any;
    };
    doc: {
        relPath: any;
        source: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest(): {
    pass: boolean;
    checks: {
        bundleBuildsDiscipline: boolean;
        packetCarriesDisciplineAndAcceptance: any;
        renderedPacketContainsCopyableReceiptExample: any;
        bindingRecordsPreDispatchDiscipline: boolean;
        reportPassesPreDispatchDiscipline: boolean;
        qualityCheckExposesPreDispatchDiscipline: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedPacketCount: any;
        passedPacketCount: any;
        requiredDocCount: any;
        disciplineDocCount: any;
        acceptanceCoveredCount: any;
        usageCategoryCoveredCount: any;
        renderedCoveredCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    discipline: {
        docCount: any;
        requiredFields: any;
    };
    binding: {
        binding_id: any;
        packet_id: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest(): {
    pass: boolean;
    checks: {
        reportAttributesPostDispatchFailures: boolean;
        qualityCheckFailsWithActionableGaps: any;
        typedMemoryArchivesFrequentAttribution: any;
        typedDocContainsExecutorPolicy: boolean;
        recallFindsPostDispatchComplianceMemory: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedPacketCount: any;
        compliantPacketCount: any;
        violationPacketCount: any;
        requiredDocCount: any;
        receiptRowCount: any;
        missingReceiptCount: any;
        missingMemoryProvenanceUsageCount: any;
        currentSourceVerifiedGapCount: any;
        attributionCount: any;
        frequentViolationAttributionCount: any;
        typedMemoryDocCount: any;
        typedMemoryRecoveryDocCount: any;
        archivedViolationCount: any;
        archivedRecoveryCount: any;
        recoveryAttributionCount: any;
        recallMatchCount: any;
    };
    attribution: any;
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    archive: {
        archived_count: any;
        frequent_attribution_count: any;
    };
    doc: {
        relPath: any;
        source: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest(): {
    pass: boolean;
    checks: {
        archiveSurvivesContextBundleDistillation: boolean;
        bundleCarriesFeedbackPolicy: boolean;
        workerPacketCarriesFeedbackPolicy: boolean;
        contextUsageAccountsFeedbackPolicy: boolean;
        renderedHandoffShowsFeedbackPolicy: any;
        bindingPersistsFeedbackPolicy: boolean;
        memoryCenterQualityPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        frequentAttributionCount: any;
        coveredAttributionCount: any;
        missingPolicyAttributionCount: any;
        policyBindingCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    policy: {
        active: boolean;
        action: any;
        agentType: any;
        targetProject: any;
    };
    binding: {
        binding_id: any;
        packet_id: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest(): {
    pass: boolean;
    checks: {
        policyActivatesFromFrequentAttribution: boolean;
        recallScoresFeedbackRisk: boolean;
        riskyPressureMemoryDownranked: boolean;
        normalPressureMemoryRemainsAvailable: boolean;
        renderedMentionsFeedbackPolicyGating: any;
        memoryCenterQualityPasses: boolean;
    };
    scoring: any;
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        frequentAttributionCount: any;
        riskAttributionCount: any;
        coveredRiskAttributionCount: any;
        missingRiskGatingAttributionCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    risk: {
        relPath: any;
        score: any;
        reason: any;
        adjustment: any;
        action: any;
    };
    normal: {
        relPath: any;
        score: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest(): {
    pass: boolean;
    checks: {
        policyActiveBeforeRecovery: boolean;
        recoveryArchiveWritten: boolean;
        typedRecoveryDocWritten: boolean;
        policyRecoveredBelowThreshold: boolean;
        bundleDoesNotInjectRecoveredActivePolicy: boolean;
        memoryCenterQualityPasses: boolean;
    };
    activePolicy: {
        active: any;
        action: any;
        frequentViolationAttributionCount: any;
    };
    recoveredPolicy: {
        active: any;
        action: any;
        recoveredAttributionCount: any;
        row: any;
    };
    recovery: {
        archivedCount: any;
        compliantCount: any;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        violationAttributionCount: any;
        recoveryAttributionCount: any;
        recoveredAttributionCount: any;
        activeAfterRecoveryAttributionCount: any;
        compliantRecoveryCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest(): {
    pass: boolean;
    checks: {
        recoveredBeforeRelapse: boolean;
        relapsedPolicyReactivates: boolean;
        relapsedRowCarriesPostRecoveryEvidence: boolean;
        bundleInjectsRelapsedPolicy: boolean;
        memoryCenterQualityPasses: boolean;
        archivesPreserveRecoveryAndViolationFacts: boolean;
    };
    recoveredPolicy: {
        active: any;
        action: any;
        recoveredAttributionCount: any;
    };
    relapsedPolicy: {
        active: any;
        action: any;
        relapsedAttributionCount: any;
        row: any;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        violationAttributionCount: any;
        recoveryAttributionCount: any;
        relapseAttributionCount: any;
        activeRelapseAttributionCount: any;
    };
    qualityCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest(): {
    pass: boolean;
    checks: {
        relapsedPolicyIsActionable: boolean;
        repairReportCreatesOpenItem: boolean;
        openItemCarriesPressurePolicyMetadata: boolean;
        postRelapseRecoveryDisarmsPolicy: boolean;
        resolvedReportCompletesItem: boolean;
    };
    repairReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWorkItems: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        coveredItemCount: any;
        relapsedActionableCount: any;
        maxEffectiveViolationCount: any;
    };
    resolvedReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsNeedingWorkItems: any;
        groupsCovered: any;
        requiredActionCount: any;
        openItemCount: any;
        coveredItemCount: any;
        relapsedActionableCount: any;
        maxEffectiveViolationCount: any;
    };
    repairCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    openRepairItem: {
        id: any;
        status: string;
        priority: any;
        relapsed: boolean;
    };
    completedRepairItem: {
        id: any;
        status: string;
        resolutionReason: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest(): {
    pass: boolean;
    checks: {
        activeHealthIsCritical: boolean;
        activeHealthCarriesDispatchRecommendation: boolean;
        activeHealthCarriesOpenRepairBacklog: boolean;
        recoveredHealthMonitors: boolean;
        recoveredHealthShowsRepairResolved: boolean;
    };
    active: {
        overall: {
            status: string;
            riskStatus: any;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            healthRowCount: any;
            activePolicyRowCount: any;
            relapsedRowCount: any;
            recoveredRowCount: any;
            criticalRowCount: any;
            warningRowCount: any;
            monitorRowCount: any;
            watchRowCount: any;
            openRepairItemCount: any;
            missingRepairRowCount: any;
        };
        row: {
            agent_type: any;
            project: any;
            health_status: any;
            dispatch_recommendation: any;
            open_repair_item_count: any;
            repair_backlog_state: any;
        };
        check: {
            id: any;
            status: any;
            checked: any;
            passed: any;
        };
    };
    recovered: {
        overall: {
            status: string;
            riskStatus: any;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            healthRowCount: any;
            activePolicyRowCount: any;
            relapsedRowCount: any;
            recoveredRowCount: any;
            criticalRowCount: any;
            warningRowCount: any;
            monitorRowCount: any;
            watchRowCount: any;
            openRepairItemCount: any;
            missingRepairRowCount: any;
        };
        row: {
            agent_type: any;
            project: any;
            health_status: any;
            dispatch_recommendation: any;
            open_repair_item_count: any;
            completed_repair_item_count: any;
            repair_backlog_state: any;
        };
        check: {
            id: any;
            status: any;
            checked: any;
            passed: any;
        };
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest(): {
    pass: boolean;
    checks: {
        activeAdvisoryWarnsButDoesNotFailWithSaferAlternative: boolean;
        criticalConfiguredRunnerIsHeld: boolean;
        saferRunnerPreferred: boolean;
        qualityCheckPassesAdvisoryCoverage: boolean;
        recoveredAdvisoryReturnsToOk: boolean;
    };
    active: {
        overall: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            projectCount: any;
            candidateCount: any;
            riskyCandidateCount: any;
            criticalCandidateCount: any;
            configuredRiskyCandidateCount: any;
            blockedProjectCount: any;
            saferAlternativeCount: any;
        };
        project: {
            project: any;
            status: any;
            preferred_agent_type: any;
            safer_alternative_count: any;
            recommendation: any;
        };
        riskyCandidate: {
            agent_type: any;
            health_status: any;
            dispatch_policy: any;
            open_repair_item_count: any;
        };
        saferCandidate: {
            agent_type: any;
            health_status: any;
            dispatch_policy: any;
        };
        check: {
            id: any;
            status: any;
            checked: any;
            passed: any;
        };
    };
    recovered: {
        overall: {
            status: string;
            coverageRate: number;
            groupCount: any;
            checkedGroupCount: any;
            groupsCovered: any;
            projectCount: any;
            candidateCount: any;
            riskyCandidateCount: any;
            criticalCandidateCount: any;
            configuredRiskyCandidateCount: any;
            blockedProjectCount: any;
            saferAlternativeCount: any;
        };
        project: {
            project: any;
            status: any;
            preferred_agent_type: any;
            recommendation: any;
        };
        riskyCandidate: {
            agent_type: any;
            health_status: any;
            dispatch_policy: any;
            completed_repair_item_count: any;
        };
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest(): {
    pass: boolean;
    checks: {
        reportCoversBothDecisions: boolean;
        activeDecisionRequiresHold: boolean;
        recoveredDecisionRequiresReceiptSampling: boolean;
        qualityCheckPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedDecisionCount: any;
        coveredDecisionCount: any;
        failedDecisionCount: any;
        holdDecisionCount: any;
        receiptSamplingDecisionCount: any;
    };
    active: {
        action: any;
        expected_action: any;
        covered: boolean;
    };
    recovered: {
        action: any;
        expected_action: any;
        covered: boolean;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest(): {
    pass: boolean;
    checks: {
        overrideReportPasses: boolean;
        overrideCheckRequiresUserRiskReceipt: boolean;
        decisionLedgerTreatsOverrideAsDispatch: boolean;
        qualityCheckPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedOverrideCount: any;
        coveredOverrideCount: any;
        failedOverrideCount: any;
    };
    decision: {
        action: any;
        expected_action: any;
        override_receipt_valid: boolean;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupSelfTest(): {
    pass: boolean;
    checks: {
        bindingCreatedFollowupWorkItem: boolean;
        completionClosesFollowup: boolean;
        followupReportPasses: boolean;
        reportRowShowsVerifiedCompletion: boolean;
        qualityCheckPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedOverrideDispatchCount: any;
        coveredOverrideDispatchCount: any;
        failedOverrideDispatchCount: any;
        openFollowupCount: any;
        completedFollowupCount: any;
    };
    row: {
        followup_work_item_id: any;
        completion_id: any;
        covered: boolean;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupTypedMemorySelfTest(): {
    pass: boolean;
    checks: {
        completionRecordedVerifiedFollowup: boolean;
        typedArchiveCapturesCompletedOverride: any;
        typedFeedbackDocWritten: any;
        recallProbeFindsTypedRepairMemory: boolean;
        reportCoversTypedMemoryDistillation: boolean;
        qualityCheckPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        completedOverrideFollowupCount: any;
        archivedOverrideFollowupCount: any;
        typedArchiveCount: any;
        typedCompletedCount: any;
        typedDocCount: any;
        recallProbeCoveredCount: any;
        metadataGapCount: any;
    };
    typedArchive: {
        archived_count: any;
        completed_count: any;
        attribution_count: any;
    };
    recalled: any;
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupPreDispatchPolicySelfTest(): {
    pass: boolean;
    checks: {
        typedArchiveHasOverrideFollowupAttribution: boolean;
        policyConsumesOverrideFollowupArchive: boolean;
        reportCoversPreDispatchPolicyConsumption: boolean;
        qualityCheckPasses: boolean;
    };
    policy: {
        action: any;
        providerOverrideFollowupRepairedAttributionCount: any;
        rowProviderOverrideFollowupRepaired: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        providerOverrideFollowupAttributionCount: any;
        coveredProviderOverrideFollowupAttributionCount: any;
        missingProviderOverrideFollowupPolicyCount: any;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractSelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesReceiptContract: any;
        packetAcceptanceRequiresSamplingReceipt: boolean;
        packetUsageAndRenderExposeContract: any;
        bindingPersistsContractProbe: boolean;
        reportCoversReceiptContract: boolean;
        qualityCheckPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedPacketCount: any;
        coveredPacketCount: any;
        failedPacketCount: any;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    contract: {
        active: boolean;
        rel_paths: any;
        followup_work_item_ids: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationSelfTest(): {
    pass: boolean;
    checks: {
        failedReceiptIsDetected: boolean;
        passedReceiptSatisfiesContract: boolean;
        reportCoversValidation: boolean;
        qualityCheckPasses: boolean;
    };
    failedReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedPacketCount: any;
        passedValidationCount: any;
        failedValidationCount: any;
    };
    report: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedPacketCount: any;
        passedValidationCount: any;
        failedValidationCount: any;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairSelfTest(): {
    pass: boolean;
    checks: {
        failedValidationCreatesOpenRepairItem: boolean;
        failedValidationCreatesCandidateAndBrief: boolean;
        retryBriefIsSelfContained: any;
        passedValidationClosesSameWorkItem: boolean;
        resolvedReportRetiresReadyBrief: boolean;
        qualityCheckPasses: boolean;
    };
    failedReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedValidationCount: any;
        coveredValidationCount: any;
        failedValidationRepairCount: any;
        openRepairItemCount: any;
        completedRepairItemCount: any;
        readyCandidateCount: any;
        readyBriefCount: any;
    };
    resolvedReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        checkedValidationCount: any;
        coveredValidationCount: any;
        failedValidationRepairCount: any;
        openRepairItemCount: any;
        completedRepairItemCount: any;
        readyCandidateCount: any;
        readyBriefCount: any;
    };
    repairWorkItem: {
        id: any;
        initialStatus: any;
        finalStatus: any;
    };
    brief: {
        brief_id: any;
        source: any;
        target_project: any;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicySelfTest(): {
    pass: boolean;
    checks: {
        appendOnlyArchivePreservesAttempts: boolean;
        escalatedPolicyIsCovered: boolean;
        repairedPolicyIsCovered: boolean;
        repairClearsStreakWithoutDeletingAudit: boolean;
        typedMemoryDocumentAndRecallWork: boolean;
        qualityCheckPasses: boolean;
    };
    escalatedReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        archivedAttemptCount: any;
        failedAttemptCount: any;
        passedAttemptCount: any;
        attributionCount: any;
        coveredAttributionCount: any;
        escalatedAttributionCount: any;
        repairedAttributionCount: any;
        typedDocCount: any;
        recallCoveredCount: any;
    };
    repairedReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        archivedAttemptCount: any;
        failedAttemptCount: any;
        passedAttemptCount: any;
        attributionCount: any;
        coveredAttributionCount: any;
        escalatedAttributionCount: any;
        repairedAttributionCount: any;
        typedDocCount: any;
        recallCoveredCount: any;
    };
    archive: {
        attempt_count: any;
        failed_count: any;
        passed_count: any;
        consecutive_failure_count: any;
        repair_verified: boolean;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketCrossGroupProviderReliabilityGuidanceSelfTest(): {
    pass: boolean;
    checks: {
        reportBuildsDecayedGlobalSignal: boolean;
        reportEnforcesGuidanceOnlyLocalFirst: boolean;
        serializedGlobalSignalIsPrivate: boolean;
        highRiskIsGlobalGuidanceNotGroupPolicy: boolean;
        globalAgentContextReceivesOnlySanitizedGuidance: boolean;
        ignoreMemorySuppressesGlobalReliabilityGuidance: boolean;
        qualityCheckPasses: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        signalCount: any;
        coveredSignalCount: any;
        actionableSignalCount: any;
        highRiskSignalCount: any;
        privacyGapCount: number;
        forbiddenFieldCount: number;
        promotionGapCount: any;
    };
    signal: {
        agent_type: any;
        risk_status: any;
        risk_score: any;
        confidence: any;
        source_group_count: any;
        half_life_days: any;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketProviderReliabilitySnapshotRankingSelfTest(): {
    pass: boolean;
    checks: {
        freshSnapshotAndBindingAreCovered: boolean;
        rankingIsConfiguredSameProjectAndNoAutoSwitch: any;
        qualityCheckPasses: boolean;
        tamperedSnapshotFailsQualityReport: boolean;
        tamperedSnapshotIsNotCovered: boolean;
    };
    report: {
        status: string;
        coverageRate: number;
        checked: any;
        passed: any;
        snapshotStatus: any;
        snapshotCovered: boolean;
        checkedGroupCount: any;
        coveredGroupCount: any;
        checkedBindingCount: any;
        coveredBindingCount: any;
        saferAlternativeCount: any;
        privacyGapCount: number;
    };
    tamperedReport: {
        status: string;
        coverageRate: number;
        checked: any;
        passed: any;
        snapshotStatus: any;
        snapshotCovered: boolean;
        checkedGroupCount: any;
        coveredGroupCount: any;
        checkedBindingCount: any;
        coveredBindingCount: any;
        saferAlternativeCount: any;
        privacyGapCount: number;
    };
    snapshot: {
        snapshot_id: any;
        generation_id: any;
        snapshot_checksum: any;
        payload_checksum: any;
        status: any;
        usable: boolean;
        generated_at: any;
        expires_at: any;
        source_generation_checksum: any;
        source_ledger_count: number;
    };
    binding: {
        selected_agent_type: any;
        safer_alternative_agent_types: any;
        assignmentUnchanged: boolean;
    };
    check: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
};
export declare function runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest(): {
    pass: boolean;
    checks: {
        advisedOnlyAndMatchedExecutionAreHealthy: boolean;
        matchedSessionAndExecutionAreBound: boolean;
        targetedQualityCheckPasses: any;
        mismatchExecutionDegradesReport: boolean;
        mismatchGapNamesActualRunnerFailure: boolean;
        reportKeepsThreeLifecycleStatesDistinct: boolean;
        providerSwitchExecutionTypedMemoryQualityPasses: any;
        providerSwitchExecutionTypedPolicyHoldsMismatch: boolean;
    };
    healthyReport: {
        status: string;
        coverageRate: number;
        checkedBindingCount: any;
        coveredBindingCount: any;
        advisedAlternativeCount: any;
        approvedSwitchCount: any;
        sessionBoundCount: any;
        executedProviderCount: any;
        executionPassedCount: any;
    };
    mismatchReport: {
        status: string;
        coverageRate: number;
        checkedBindingCount: any;
        coveredBindingCount: any;
        advisedAlternativeCount: any;
        approvedSwitchCount: any;
        sessionBoundCount: any;
        executedProviderCount: any;
        executionPassedCount: any;
    };
    healthyCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    typedMemoryReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        executionReceiptCount: any;
        archivedExecutionReceiptCount: any;
        typedExecutedCount: any;
        typedPassedCount: any;
        typedFailedCount: any;
        typedMismatchCount: any;
        typedDocCount: any;
        recallProbeCoveredCount: any;
        policyCoveredAttributionCount: any;
        policyRankingSignalCoveredCount: any;
        policyProvenanceCoveredCount: any;
        policyProbeCount: any;
        metadataGapCount: any;
    };
    typedMemoryCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    matchedExecution: any;
    mismatchExecution: any;
    mismatchRow: any;
};
export declare function runMemoryCenterWorkerContextPacketProviderSwitchExecutionTypedMemorySelfTest(): {
    pass: boolean;
    focus: string;
    checks: {
        advisedOnlyAndMatchedExecutionAreHealthy: boolean;
        matchedSessionAndExecutionAreBound: boolean;
        targetedQualityCheckPasses: any;
        mismatchExecutionDegradesReport: boolean;
        mismatchGapNamesActualRunnerFailure: boolean;
        reportKeepsThreeLifecycleStatesDistinct: boolean;
        providerSwitchExecutionTypedMemoryQualityPasses: any;
        providerSwitchExecutionTypedPolicyHoldsMismatch: boolean;
    };
    healthyReport: {
        status: string;
        coverageRate: number;
        checkedBindingCount: any;
        coveredBindingCount: any;
        advisedAlternativeCount: any;
        approvedSwitchCount: any;
        sessionBoundCount: any;
        executedProviderCount: any;
        executionPassedCount: any;
    };
    mismatchReport: {
        status: string;
        coverageRate: number;
        checkedBindingCount: any;
        coveredBindingCount: any;
        advisedAlternativeCount: any;
        approvedSwitchCount: any;
        sessionBoundCount: any;
        executedProviderCount: any;
        executionPassedCount: any;
    };
    healthyCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    typedMemoryReport: {
        status: string;
        coverageRate: number;
        groupCount: any;
        checkedGroupCount: any;
        groupsCovered: any;
        executionReceiptCount: any;
        archivedExecutionReceiptCount: any;
        typedExecutedCount: any;
        typedPassedCount: any;
        typedFailedCount: any;
        typedMismatchCount: any;
        typedDocCount: any;
        recallProbeCoveredCount: any;
        policyCoveredAttributionCount: any;
        policyRankingSignalCoveredCount: any;
        policyProvenanceCoveredCount: any;
        policyProbeCount: any;
        metadataGapCount: any;
    };
    typedMemoryCheck: {
        id: any;
        status: any;
        checked: any;
        passed: any;
    };
    matchedExecution: any;
    mismatchExecution: any;
    mismatchRow: any;
};
export declare function runMemoryCenterWorkerContextPacketProviderSwitchExecutionRankingSelfTest(): any;
export declare function runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest(): {
    pass: boolean;
    checks: {
        sourceLedgerCreatesCrossGroupEvidence: boolean;
        targetWithoutLocalLedgerUsesCrossGroupAssist: any;
        localConflictIsAudited: any;
    };
    assist: {
        overall: {
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
        project: any;
        quality: {
            status: any;
            checked: any;
            passed: any;
        };
    };
    conflict: {
        overall: {
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
        project: any;
        quality: {
            status: any;
            checked: any;
            passed: any;
            gaps: any;
        };
    };
};
