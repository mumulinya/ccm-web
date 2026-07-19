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
