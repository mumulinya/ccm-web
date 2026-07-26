export declare function runGroupMemoryStorageRecoverySelfTest(): {
    pass: boolean;
    checks: {
        atomicFileIsValidJson: boolean;
        backupRecoveryWorks: boolean;
        backupExists: boolean;
    };
};
export declare function runGlobalGroupMemoryContextSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        includesMultipleGroups: any;
        recallsTypedMemory: boolean;
        renderedMentionsMemoryBoundary: boolean;
        renderedMentionsQuality: boolean;
        renderedMentionsPostCompactRecoveryAudit: boolean;
        renderedMentionsSourceManifest: boolean;
        renderedMentionsReloadAudit: boolean;
        renderedMentionsTypedLoadPlan: boolean;
        rawSourcesExposed: boolean;
        ignoreMemoryHonored: boolean;
    };
    selected: any;
};
export declare function runGroupCompactFileReferenceReadPlanSelfTest(): {
    pass: boolean;
    checks: {
        referencesExist: boolean;
        readPlanSchema: boolean;
        readPlanPrioritizesSummaryAndSource: any;
        readPlanCarriesReceiptContract: any;
        childRenderedMentionsReadPlan: boolean;
        globalContextSeesReadPlan: boolean;
        policyIsReadOnDemand: boolean;
    };
    readPlan: {
        plannedCount: any;
        missingCount: any;
        entries: any;
    };
};
export declare function runGroupMemorySourceManifestSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        manifestPasses: boolean;
        requiredSourcesPresent: boolean;
        typedDocsRecorded: any;
        checksumsRecorded: any;
        rawSourcesExposeRecallLedger: boolean;
        renderedMentionsManifest: boolean;
        contextUsesTypedMemory: boolean;
    };
    manifest: {
        status: any;
        entryCount: any;
        typedDocCount: any;
    };
};
export declare function runGroupMemoryReloadAuditSelfTest(): {
    pass: boolean;
    checks: {
        firstAuditRecorded: boolean;
        secondAuditSeesPrevious: boolean;
        ledgerPersisted: boolean;
        renderedMentionsReloadAudit: boolean;
        rawSourcesExposeReloadLedger: boolean;
    };
    firstAudit: {
        reason: any;
        action: any;
    };
    secondAudit: {
        reason: any;
        action: any;
    };
};
export declare function runGroupMemorySourceChangeReloadSelfTest(): {
    pass: boolean;
    checks: {
        firstCreatesBaselineWithoutSourceTrigger: boolean;
        secondAutoPromotesReason: boolean;
        thirdReusesWhenStable: boolean;
        ledgerStoresSnapshotAndTrigger: any;
    };
    second: {
        reason: string;
        trigger: {
            schema: string;
            version: number;
            triggered: boolean;
            reason: string;
            originalReason: string;
            generatedAt: string;
            previousAuditAt: any;
            sourceManifestChanged: boolean;
            sourceShapeChanged: boolean;
            loadPlanChanged: boolean;
            addedCount: number;
            removedCount: number;
            changedCount: number;
            changedIds: any[];
            added: any[];
            removed: any[];
            changed: any[];
        };
    };
    third: {
        reason: string;
        shouldReload: boolean;
    };
};
export declare function runGroupMemoryDispatchFreshnessGateSelfTest(): {
    pass: boolean;
    checks: {
        gateSchema: boolean;
        gateBindsScopeAndTarget: boolean;
        gateCarriesSourceAndReload: boolean;
        gateRequiresReceiptDeclaration: any;
        renderedMentionsFreshnessGate: boolean;
        ignoredGateHonorsUserPolicy: boolean;
    };
    gate: {
        id: any;
        status: any;
        action: any;
    };
};
export declare function runGroupPostCompactFirstDispatchMarkerSelfTest(): {
    pass: boolean;
    checks: {
        firstMarkerRecorded: boolean;
        secondMarkerAdvancesSameTarget: boolean;
        otherTargetGetsOwnFirstDispatch: boolean;
        renderedMentionsMarker: boolean;
        rawSourcesExposeDispatchLedger: boolean;
        ledgerPersisted: boolean;
    };
    first: {
        marker_id: any;
        boundary_id: any;
        dispatch_sequence: any;
    };
    second: {
        marker_id: any;
        boundary_id: any;
        dispatch_sequence: any;
    };
    other: {
        marker_id: any;
        boundary_id: any;
        dispatch_sequence: any;
    };
};
export declare function runGroupPostCompactCandidateUsageLedgerSelfTest(): {
    pass: boolean;
    checks: {
        recordWritesThreeEntries: boolean;
        duplicateDoesNotRecount: boolean;
        statsClassifyUsage: boolean;
        summaryFiltersCurrentCandidates: boolean;
        bundleExposesUsageLedger: boolean;
        bundleFeedsUsageIntoTypedRecall: boolean;
        renderedMentionsUsageLedger: boolean;
    };
    record: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        file: string;
        skipped: boolean;
        reason: string;
        recorded_count: number;
        totals: any;
        duplicate_count?: undefined;
        updatedAt?: undefined;
    } | {
        schema: string;
        groupId: string;
        groupSessionId: string;
        file: string;
        recorded_count: any;
        duplicate_count: number;
        totals: any;
        updatedAt: string;
        skipped?: undefined;
        reason?: undefined;
    };
    summary: {
        totals: any;
        candidate_count: any;
    };
};
export declare function runGroupProjectMemoryImportContextSelfTest(): {
    pass: boolean;
    checks: {
        importRecorded: boolean;
        renderedMentionsProjectImport: boolean;
        rootClaudeInjected: boolean;
        pathRuleInjected: boolean;
        loadPlanSeesImportedDocs: boolean;
        sourceManifestSeesTypedDocs: boolean;
    };
    imported: {
        importedCount: any;
        status: any;
    };
};
export declare function runGroupGlobalClaudeMemoryImportContextSelfTest(): {
    pass: boolean;
    checks: {
        importRecorded: boolean;
        renderedMentionsGlobalImport: boolean;
        userMemoryInjected: boolean;
        managedMemoryInjected: boolean;
        pathRuleInjected: boolean;
        sourceManifestSeesGlobalDocs: boolean;
    };
    imported: {
        importedCount: any;
        status: any;
    };
};
export declare function runGroupGlobalAgentMemoryBridgeContextSelfTest(): {
    pass: boolean;
    checks: {
        healthGateAllowsCleanGlobalMemory: boolean;
        globalRecallStructured: boolean;
        renderedInjectsGlobalAgentMemory: boolean;
        renderedMentionsHealthGate: boolean;
        currentStateBoundaryRendered: boolean;
        sourceManifestTracksGlobalMemory: any;
        compactReferencesTrackGlobalMemory: any;
        reloadAuditCanUseGlobalReason: boolean;
        rawSourceExposesGlobalMemoryFile: boolean;
        ignoreMemorySuppressesGlobalAgentMemory: boolean;
    };
    globalRecall: {
        itemCount: any;
        file: any;
    };
};
export declare function runGroupGlobalAgentMemoryHealthGateSelfTest(): {
    pass: boolean;
    checks: {
        healthGateFailsActivePollution: boolean;
        recallBlocked: boolean;
        renderedBlocksGlobalMemory: boolean;
        contaminatedPreviewNotRendered: boolean;
        sourceManifestStillAvailable: boolean;
        rawSourceStillTrackedForAudit: boolean;
    };
    healthGate: {
        status: any;
        active: any;
    };
};
export declare function runGroupGlobalAgentMemoryArbitrationContextSelfTest(): {
    pass: boolean;
    checks: {
        globalMemoryWasRecalled: boolean;
        arbitrationDemotesGlobalRule: boolean;
        summaryCountsConflict: boolean;
        renderedShowsDemotion: boolean;
        renderedKeepsLocalRuleVisible: boolean;
        arbitrationLedgerPersistsConflict: boolean;
        sourceManifestTracksArbitrationLedger: any;
        compactReferencesTrackArbitrationLedger: any;
        readPlanCanTargetArbitrationLedger: any;
        repeatedConflictDistilledToTypedMemory: boolean;
        renderedMentionsArbitrationDistillation: boolean;
    };
    arbitration: any;
    ledger: any;
    arbitrationDistillation: any;
};
export declare function runGroupGlobalAgentMemorySemanticArbitrationSelfTest(): {
    pass: boolean;
    checks: {
        globalMemoryWasRecalled: boolean;
        semanticRiskScoresConflict: any;
        arbitrationDemotesViaSemanticConflict: boolean;
        decisiveEvidenceCarriesSemanticReasons: any;
        renderedShowsSemanticRisk: boolean;
        ledgerPersistsSemanticRisk: any;
        sourceManifestTracksArbitrationLedger: any;
        compactReferencesTrackArbitrationLedger: any;
    };
    arbitration: any;
    ledger: any;
    ledgerEntry: any;
};
export declare function runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest(): {
    pass: boolean;
    checks: {
        sourceGroupRecordedConflict: boolean;
        targetRecallsSameGlobalMemory: boolean;
        targetSuppressesByCrossGroupLedger: any;
        arbitrationDemotesWithoutLocalConflict: boolean;
        recallSummaryCountsCrossGroupSuppression: boolean;
        renderedWarnsChildAgent: boolean;
        sourceManifestTracksCrossGroupLedgerDir: any;
        compactReferencesTrackCrossGroupLedgerDir: any;
        readPlanTargetsCrossGroupSuppression: any;
    };
    crossGroupSuppression: any;
    arbitration: any;
    sourceLedger: any;
    targetSummary: any;
};
export declare function runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest(): {
    pass: boolean;
    checks: {
        sourceGroupRecordedConflict: boolean;
        targetRecallsUpdatedGlobalMemory: boolean;
        suppressionDowngradedToAdvisory: boolean;
        arbitrationDoesNotCrossGroupSuppress: boolean;
        recallSummaryCountsFreshness: boolean;
        renderedShowsFreshnessAdvisory: boolean;
        sourceManifestTracksCrossGroupLedgerDir: any;
        compactReferencesTrackCrossGroupLedgerDir: any;
    };
    crossGroupSuppression: any;
    arbitration: any;
    sourceLedger: any;
    targetSummary: any;
};
export declare function runGroupTypedMemoryContextSelfTest(): {
    pass: boolean;
    checks: {
        typedIndexSelfTestPasses: boolean;
        syncCreatesIndex: boolean;
        recallsTypedMemory: boolean;
        recallFindsSentinel: boolean;
        renderedInjectsTypedMemory: boolean;
        distillationRunsForContextBundle: boolean;
        renderedMentionsDistillation: boolean;
        renderedMentionsDistillationQuality: boolean;
        renderedMentionsSourceManifest: boolean;
        renderedMentionsReloadAudit: boolean;
        renderedMentionsTypedLoadPlan: boolean;
        pathConditionalMemoryHonored: boolean;
        renderedMentionsPostCompactRecoveryAudit: boolean;
        postCompactReinjectionGateRecorded: boolean;
        renderedMentionsPostCompactReinjectionGate: boolean;
        renderedMentionsReinjectionCandidateIds: boolean;
        postCompactDispatchMarkerRecorded: boolean;
        renderedMentionsPostCompactDispatchMarker: boolean;
        renderedMentionsPartialSidecar: boolean;
        ptlRecoveryRendered: boolean;
        ledgerDedupesSecondRecall: boolean;
        ledgerRecordedSurfaced: boolean;
        ignoreMemoryHonoredForTypedRecall: boolean;
        ignoreMemoryRenderedWithoutOldFacts: boolean;
    };
    recalled: any;
};
export declare function runGroupTypedMemoryContextPressureRepairProvenanceSelfTest(): {
    pass: boolean;
    checks: {
        bundleRecallCarriesRepair: any;
        bundleRenderedTextCarriesRepair: boolean;
        bundleCarriesPreDispatchDiscipline: boolean;
        workerContextPacketCarriesRepairMemory: any;
    };
    scoring: any;
    renderedExcerpt: string;
};
export declare function runGroupMemoryAutoCompactionSelfTest(): Promise<{
    pass: boolean;
    checks: {
        success: boolean;
        compacted: boolean;
        boundaryRecorded: boolean;
        backgroundRecorded: boolean;
        qualityGatePassed: boolean;
        microCompactRecorded: boolean;
        postCompactReinjectRecorded: boolean;
        postCompactRecoveryAuditRecorded: boolean;
        logDistillationRecorded: boolean;
        typedMemoryBoundToSession: boolean;
        noBareGroupTypedMemoryCreated: boolean;
        contextPressureWarningRecorded: boolean;
        summaryPreservesSentinel: boolean;
        rawTranscriptUntouched: any;
    };
    background: any;
}>;
