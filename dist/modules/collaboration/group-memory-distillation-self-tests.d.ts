export declare function runGroupClaudeMemoryExternalIncludeApprovalSelfTest(): {
    pass: boolean;
    checks: {
        firstWarnsAndSkips: boolean;
        warningShownSuppressesRepeatPrompt: boolean;
        approvalLedgerPersists: boolean;
        approvedExternalImports: boolean;
        recallFindsApprovedExternalInclude: boolean;
    };
    first: {
        importedCount: any;
        approval: any;
    };
    second: {
        importedCount: any;
        approval: any;
    };
    recalled: any;
};
export declare function runGroupClaudeMemorySettingSourcePolicySelfTest(): {
    pass: boolean;
    checks: {
        defaultEnablesEditableAndAlwaysOn: boolean;
        emptySettingSourcesEnterIsolationButKeepManaged: boolean;
        projectOnlySkipsLocal: boolean;
        localOnlySkipsProject: boolean;
        isolatedProjectSkipsProjectAndLocal: boolean;
        isolatedGlobalImportsManagedOnly: boolean;
        recallFindsManagedButNotUser: boolean;
    };
    defaultPolicy: any;
    isolatedPolicy: any;
    projectDiscovery: {
        discoveredCount: any;
        files: any;
    };
    isolatedGlobal: {
        importedCount: any;
        includeUser: any;
        includeManaged: any;
    };
};
export declare function runGroupInstructionsLoadedHookPipelineSelfTest(): {
    pass: boolean;
    checks: {
        hooksRegistered: boolean;
        hookSummaryRecordsEvents: boolean;
        goodHookSawTopLevelAndInclude: boolean;
        ledgerPersistsRows: boolean;
        importContinuesAfterHookFailure: boolean;
        typedLoadPlanStillWorks: any;
    };
    hookSummary: {
        eventCount: any;
        firedCount: any;
        failureCount: any;
    };
    seen: {
        memory_type: any;
        load_reason: any;
        parent_file_path: any;
    }[];
};
export declare function runGroupTypedMemoryLogDistillationSelfTest(): {
    pass: boolean;
    checks: {
        distillationCreatedFacts: boolean;
        repeatDoesNotAddDuplicates: boolean;
        qualityReportRecorded: boolean;
        ledgerPersistsFacts: boolean;
        fourTypedDocsCreated: boolean;
        indexLinksDistilledDocs: boolean;
        recallFindsDurableAndNonObviousFacts: boolean;
        activityNoiseRejected: boolean;
        renderedMentionsDistilledMemory: any;
        rawTranscriptUntouched: boolean;
    };
    first: {
        newFactCount: any;
        writeCount: any;
    };
    second: {
        newFactCount: any;
        updatedFactCount: any;
    };
    recalled: any;
};
export declare function runGroupTypedMemoryPostCompactUsageDistillationSelfTest(): {
    pass: boolean;
    checks: {
        archiveDocWritten: boolean;
        distillationReportsArchive: any;
        ledgerPersistsArchive: boolean;
        recallDeprioritizesArchive: any;
        recallScoringCountsArchive: boolean;
    };
    archive: any;
    recalled: any;
};
export declare function runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest(): {
    pass: boolean;
    checks: {
        archiveCountsRows: boolean;
        repeatDoesNotDuplicateRows: boolean;
        ledgerPersistsArchive: any;
        typedDocsWritten: boolean;
        indexLinksProviderDocs: boolean;
        promotedRecallFindsUsedRow: boolean;
        cautionRecallIsFeedbackMemory: boolean;
        strongClaimWarnsNotNativeProof: boolean;
    };
    first: {
        archivedCount: any;
        promotedCount: any;
        cautionCount: any;
        strongReceiptClaimCount: any;
    };
    second: {
        archivedCount: any;
        newRowCount: any;
        updatedRowCount: any;
    };
    recalled: any;
    cautionRecalled: any;
};
export declare function runGroupTypedMemoryProviderRankingProvenanceCompactRepairReceiptConsumptionDistillationSelfTest(): {
    pass: boolean;
    checks: {
        archiveCountsVerifiedReceipt: boolean;
        repeatDoesNotDuplicateRows: boolean;
        ledgerPersistsArchive: any;
        typedDocWritten: boolean;
        indexLinksTypedDoc: boolean;
        recallFindsVerifiedRepair: boolean;
        authorizationBoundaryPreserved: boolean;
    };
    first: {
        archivedCount: any;
        verifiedCount: any;
        preservedCount: any;
        relPathCount: any;
        rowIdCount: any;
    };
    second: {
        archivedCount: any;
        newRowCount: any;
        updatedRowCount: any;
    };
    recalled: any;
};
export declare function runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest(): {
    pass: boolean;
    checks: {
        archiveCountsVerifiedCompletion: boolean;
        repeatIsIdempotent: boolean;
        ledgerPersistsExactIdentity: any;
        typedReferenceWritten: boolean;
        ignoredCompletionStaysFeedback: boolean;
        indexLinksTypedMemory: boolean;
        recallFindsVerifiedCompletion: boolean;
        freshnessBoundaryPreserved: boolean;
    };
    first: {
        archivedCount: any;
        restoredCount: any;
        cautionCount: any;
        verifiedCount: any;
        ignoredCount: any;
        taskSessionCount: any;
        nativeSessionCount: any;
    };
    second: {
        archivedCount: any;
        newRowCount: any;
        updatedRowCount: any;
    };
    recalled: any;
};
export declare function runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest(): {
    pass: boolean;
    checks: {
        archiveStoresVerifiedClosure: boolean;
        repeatIsIdempotent: boolean;
        ledgerKeepsExactIdentity: any;
        typedDocAndIndexWritten: boolean;
        freshnessAndAuthorityBoundaryPersisted: boolean;
        recallFindsClosure: boolean;
        crossGroupIsolation: boolean;
    };
    first: {
        archivedCount: any;
        verifiedCount: any;
        newRowCount: any;
    };
    second: {
        archivedCount: any;
        newRowCount: any;
        updatedRowCount: any;
    };
    crossGroup: {
        archivedCount: any;
    };
    recalled: any;
};
export declare function runGroupTypedMemoryDistillationQualitySelfTest(): {
    pass: boolean;
    checks: {
        qualityReportCreated: boolean;
        qualityStoredInLedger: boolean;
        stalePathDetected: boolean;
        existingPathNotFlagged: boolean;
        taskActivityRejectedBeforeContradiction: boolean;
        sourceLinksPreserved: boolean;
        writeAdmissionPasses: any;
        qualityKeepsStalePathAsCurrentSourceWarning: boolean;
    };
    quality: {
        score: any;
        status: any;
        stalePathCount: any;
        contradictionCount: any;
    };
};
