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
    rows: any[];
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
    snapshot: {
        schema: any;
        snapshot_id: any;
        snapshot_file: any;
        checksum: any;
        generated_at: any;
        task_agent_session_id: any;
        task_id: any;
        group_id: any;
        project: any;
        agent_type: any;
        native_session_id: any;
        turn: number;
        worker_context_packet_id: any;
        worker_handoff_id: any;
        memory_context_checksum: any;
        rendered_prompt_checksum: any;
        group_session_memory_binding: any;
        group_session_id: any;
        group_session_scope_id: any;
        session_memory_checksum: any;
        memory_binding_id: any;
        model_extraction_execution_id: any;
        model_extraction_receipt_checksum: any;
        model_extraction_history_head_checksum: any;
        model_extraction_replay_status: any;
        model_extraction_replay_execution_id: any;
        model_extraction_evidence_valid: boolean;
        fact_supersession_graph_checksum: any;
        fact_supersession_graph_valid: boolean;
        session_lifecycle_fence_required: boolean;
        session_lifecycle_fence_valid: boolean;
        session_lifecycle_status: any;
        session_lifecycle_generation: number;
        session_lifecycle_head_id: any;
        session_lifecycle_head_checksum: any;
        active_fact_count: any;
        delivery_receipt: any;
        delivery_receipt_checksum_valid: boolean;
        memory_context_delivered: boolean;
        memory_context_consumption_receipt_required: boolean;
        memory_context_consumption_receipt_valid: boolean;
        memory_context_consumption_receipt_status: string;
        memory_context_consumption_challenge_id: string;
        memory_context_consumption_receipt_signature: string;
        memory_context_consumption_recovery_present: boolean;
        memory_context_consumption_recovery_valid: boolean;
        memory_context_consumption_recovery_status: string;
        memory_context_consumption_recovery_id: string;
        gate_ids: string[];
        replay_repair_dispatch_brief_ids: any[];
        replay_repair_dispatch_briefs: any[];
    };
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
        agentCoordinationRecordsMarker: boolean;
        taskCardRuntimeRecordsMarker: boolean;
    };
    markerSummary: any;
};
