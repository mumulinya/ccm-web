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
