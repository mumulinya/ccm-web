export declare function runMemoryDispatchGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGate: boolean;
        ignoredReceiptCanSatisfyGate: boolean;
        missingGateHardFailsQuality: any;
        deliverySummaryRecordsGate: any;
        acceptanceGateBlocksMissingGate: any;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: any;
        grade: any;
        memoryGate: any;
    };
    missing: {
        score: any;
        grade: any;
        memoryGate: any;
    };
};
export declare function runPressureMemoryProvenanceReceiptUsageSelfTest(): {
    pass: boolean;
    checks: {
        receiptParserKeepsStructuredProvenance: boolean;
        collectionPrefersStructuredProvenance: boolean;
        ledgerPersistsProvenance: boolean;
        statsAggregateProvenance: boolean;
    };
    receipt: {
        memoryProvenanceUsage: any;
    };
    rows: any;
    ledger: {
        entry: any;
        stat: any;
    };
};
export declare function runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        snapshotPersistedOnSession: any;
        deliverySummaryCollectsGateFromSessionSnapshot: boolean;
        goodReceiptMatchesExactSnapshot: boolean;
        goodDeliveryPassesMemoryGate: boolean;
        wrongSessionFailsSnapshotGate: boolean;
        wrongSessionBlocksAcceptance: any;
        forgedFactCitationBlocksAcceptance: boolean;
        foreignSourceMessageCitationBlocksAcceptance: boolean;
        runtimeKernelShowsSnapshotMismatch: boolean;
    };
    snapshot: any;
    good: any;
    wrong: any;
    wrongCitation: any;
    wrongSourceMessage: any;
};
export declare function runGlobalMemoryUsageReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGlobalMemoryGate: any;
        missingGlobalMemoryHardFailsQuality: any;
        unsafeBackgroundUseHardFailsQuality: any;
        deliverySummaryRecordsMissingGlobalMemory: boolean;
        acceptanceGateBlocksMissingGlobalMemory: any;
        runtimeKernelShowsGlobalMemoryGap: boolean;
        unsafeSummaryShowsUnsafeUse: any;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: any;
        grade: any;
        globalMemoryGate: any;
    };
    missing: {
        score: any;
        grade: any;
        globalMemoryGate: any;
    };
    unsafe: {
        score: any;
        grade: any;
        globalMemoryGate: any;
    };
};
export declare function runGlobalMemoryHealthGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesHealthGate: any;
        missingHealthGateHardFailsQuality: any;
        unsafeBlockedGlobalMemoryUseHardFails: any;
        warnGateRequiresAcknowledgement: any;
        deliverySummaryRecordsMissingHealthGate: boolean;
        acceptanceGateBlocksMissingHealthGate: any;
        runtimeKernelShowsHealthGateGap: boolean;
        unsafeSummaryShowsBlockedMemoryUse: any;
        goodDeliverySummaryPassesHealthGate: boolean;
    };
    good: {
        score: any;
        grade: any;
        healthGate: any;
    };
    missing: {
        score: any;
        grade: any;
        healthGate: any;
    };
    unsafe: {
        score: any;
        grade: any;
        healthGate: any;
    };
    warn: {
        score: any;
        grade: any;
        healthGate: any;
    };
};
export declare function runReadPlanRevalidationGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGate: boolean;
        wrongSessionHardFailsQuality: any;
        missingCurrentSourceHardFailsQuality: boolean;
        uniqueGateSessionBoundShorthandPasses: boolean;
        shorthandStillFailsWrongSession: boolean;
        uniqueGateSessionBoundCurrentSourceActionPasses: boolean;
        currentSourceActionStillFailsWrongSession: boolean;
        boundCurrentDiffEvidencePasses: boolean;
        currentDiffEvidenceStillFailsWrongSession: boolean;
        latestSessionTurnSupersedesOlderReadPlanGate: boolean;
        deliverySummaryRecordsGate: boolean;
        acceptanceGateBlocksWrongSession: any;
        runtimeKernelShowsWrongSession: boolean;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: any;
        grade: any;
        readPlanRevalidationGate: any;
    };
    wrongSession: {
        score: any;
        grade: any;
        readPlanRevalidationGate: any;
    };
    missingCurrentSource: {
        score: any;
        grade: any;
        readPlanRevalidationGate: any;
    };
    boundShorthand: {
        score: any;
        grade: any;
        readPlanRevalidationGate: any;
    };
};
export declare function runApiMicrocompactReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesApiMicrocompactGate: boolean;
        ignoredReceiptPassesAsDeclaredNotSupported: boolean;
        missingReceiptHardFailsQuality: any;
        unsafeNativeApplyHardFailsQuality: any;
        nativeApplyPassesWithBoundChecksums: boolean;
        nativeApplyMissingChecksumsHardFails: any;
        sessionBoundApiMicrocompactReceiptPasses: boolean;
        wrongSessionApiMicrocompactReceiptFails: any;
        deliverySummaryRecordsMissingApiMicrocompact: boolean;
        acceptanceGateBlocksMissingApiMicrocompact: any;
        runtimeKernelShowsApiMicrocompactGap: boolean;
        goodDeliverySummaryPassesApiMicrocompact: boolean;
    };
    good: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    missing: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    unsafe: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    native: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    nativeMissingChecksum: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    sessionBound: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    wrongSession: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
    ignored: {
        score: any;
        grade: any;
        apiMicrocompact: any;
    };
};
export declare function runPostCompactReinjectionGateReceiptValidationSelfTest(): {
    pass: boolean;
    checks: {
        goodReceiptPassesGate: boolean;
        ignoredReceiptCanSatisfyGate: boolean;
        structuredCandidateUsagePassesGate: any;
        partialCandidateUsageHardFailsStrictGate: any;
        missingGateHardFailsQuality: any;
        missingCandidateHardFailsQuality: any;
        missingUsageHardFailsQuality: any;
        deliverySummaryRecordsGate: any;
        acceptanceGateBlocksMissingGate: any;
        visibleSummaryRecordsCandidateCount: boolean;
        visibleSummaryRecordsMissingUsage: boolean;
        goodDeliverySummaryPassesGate: boolean;
    };
    good: {
        score: any;
        grade: any;
        reinjectionGate: any;
    };
    structuredGood: {
        score: any;
        grade: any;
        reinjectionGate: any;
    };
    missing: {
        score: any;
        grade: any;
        reinjectionGate: any;
    };
    missingCandidate: {
        score: any;
        grade: any;
        reinjectionGate: any;
    };
    missingUsage: {
        score: any;
        grade: any;
        reinjectionGate: any;
    };
    partialUsage: {
        score: any;
        grade: any;
        reinjectionGate: any;
    };
};
export declare function runPostCompactDispatchMarkerVisibleSelfTest(): {
    pass: boolean;
    checks: {
        summaryRecordsMarker: boolean;
        runtimeKernelRecordsMarker: boolean;
        agentCoordinationRecordsMarker: any;
        taskCardRuntimeRecordsMarker: boolean;
    };
    markerSummary: any;
};
