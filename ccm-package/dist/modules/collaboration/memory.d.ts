export declare const GROUP_MEMORY_SOURCE_MANIFEST_VERSION = 1;
export declare const GROUP_MEMORY_RELOAD_AUDIT_VERSION = 1;
export declare const GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION = 1;
export declare const GROUP_MEMORY_DISPATCH_FRESHNESS_GATE_VERSION = 1;
export declare const GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION = 1;
export declare const GROUP_MEMORY_POST_COMPACT_FIRST_DISPATCH_MARKER_VERSION = 1;
export declare const GROUP_MEMORY_POST_COMPACT_CANDIDATE_USAGE_LEDGER_VERSION = 1;
export declare const GROUP_API_MICROCOMPACT_NATIVE_APPLY_PROOF_LEDGER_VERSION = 1;
export declare const GROUP_API_MICROCOMPACT_NATIVE_APPLY_REQUEST_TELEMETRY_LEDGER_VERSION = 1;
export declare const GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS: number;
export declare const GROUP_SESSION_MEMORY_SNAPSHOT_VERSION = 3;
export declare const GROUP_SESSION_MEMORY_MAX_SECTION_TOKENS = 2000;
export declare const GROUP_SESSION_MEMORY_MAX_TOTAL_TOKENS = 12000;
export declare const GROUP_SESSION_MEMORY_MIN_TOKENS_TO_INIT = 10000;
export declare const GROUP_SESSION_MEMORY_MIN_TOKENS_BETWEEN_UPDATES = 5000;
export declare const GROUP_SESSION_MEMORY_TOOL_CALLS_BETWEEN_UPDATES = 3;
export declare const GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION = 1;
export declare const GROUP_COMPACT_FILE_REFERENCE_LEDGER_VERSION = 1;
export declare const GROUP_COMPACT_FILE_REFERENCE_READ_PLAN_REVALIDATION_GATE_VERSION = 1;
export declare const GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION = 1;
export declare const GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION = 1;
export declare function getGroupSessionMemoryScopeId(groupId: string, sessionId?: string): string;
export declare function getGroupMemoryFile(groupId: string, sessionId?: string): string;
export declare function getGroupMemoryReloadLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupPostCompactDispatchLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupPostCompactCandidateUsageLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupReplayRepairLedgerFile(groupId: string, sessionId?: string): string;
export declare function getGroupReplayRepairWorkItemsFile(groupId: string, sessionId?: string): string;
export declare function getGroupSessionMemorySnapshotFile(groupId: string): string;
export declare function getGroupSessionMemoryMarkdownFile(groupId: string): string;
export declare function getGroupToolContinuitySnapshotFile(groupId: string): string;
export declare function getGroupToolContinuityMarkdownFile(groupId: string): string;
export declare function getGroupCompactFileReferenceLedgerFile(groupId: string): string;
export declare function getGroupGlobalMemoryArbitrationLedgerFile(groupId: string): string;
export declare function readGroupReplayRepairDispatchCandidatesSummary(groupId: string, limit?: number, sessionId?: string): {
    schema: string;
    groupId: string;
    file: string;
    updatedAt: any;
    candidateCount: any;
    openItemCount: any;
    claimedCount: any;
    dispatchMarkedCount: any;
    criticalCount: any;
    readyCount: any;
    shouldCreateRealTask: boolean;
    candidates: any;
};
export declare function createEmptyGroupMemory(groupId: string, sessionId?: string): {
    groupId: string;
    groupSessionId: string;
    goal: string;
    summary: string;
    currentPhase: string;
    decisions: any[];
    completed: any[];
    blocked: any[];
    workerLedger: any[];
    agentMemories: {};
    conversationSummary: any;
    factAnchors: any[];
    persistentRequirements: any[];
    messageDigest: string;
    sessionMemory: any;
    toolContinuity: any;
    compactBoundary: any;
    compaction: {
        version: number;
        enabled: boolean;
        health: string;
        compactedMessageCount: number;
    };
    messageCompression: {
        enabled: boolean;
        recentLimit: number;
        olderLimit: number;
        totalMessages: number;
        compressedMessages: number;
        lastCompressedAt: string;
    };
    longTermLogDistillation: any;
    openQuestions: any[];
    nextActions: any[];
    updated_at: string;
};
export declare function loadGroupMemory(groupId: string, sessionId?: string): any;
export declare function saveGroupMemory(groupId: string, memory: any, sessionId?: string, options?: any): any;
export declare function runGroupMemoryStorageRecoverySelfTest(): {
    pass: boolean;
    checks: {
        atomicFileIsValidJson: boolean;
        backupRecoveryWorks: boolean;
        backupExists: boolean;
    };
};
export declare function uniqueByKey(items: any[], keyFn: (item: any) => string, limit?: number): any[];
export declare function compactMemoryText(value: any, max?: number): string;
export declare function compactPreserveLines(value: any, max?: number): string;
export declare function buildChildGlobalAgentMemoryHealthGate(input?: any): any;
export declare function readGroupGlobalMemoryArbitrationLedger(groupId: string): any;
export declare function recordGroupGlobalMemoryArbitrationLedger(groupId: string, input?: any): {
    schema: string;
    groupId: string;
    file: any;
    entryCount: any;
    recordedCount: number;
    demotedCount: any;
    conflictCount: any;
    semanticRiskCount: any;
    semanticConflictCount: any;
    maxSemanticRiskScore: any;
    repeatedConflictCount: any;
    distilledConflictCount: any;
    pendingDistillationCount: any;
    typedMemoryDocs: any[];
    updatedAt: any;
    latestEntries: any;
    distillationCandidates: any;
};
export declare function distillGroupGlobalMemoryArbitrationToTypedMemory(groupId: string, input?: any): {
    schema: string;
    groupId: string;
    skipped: boolean;
    reason: string;
    threshold: number;
    candidateCount: number;
    writeCount: number;
    ledgerFile: any;
    write?: undefined;
    index?: undefined;
    summary?: undefined;
    distilledAt?: undefined;
} | {
    schema: string;
    groupId: string;
    skipped: boolean;
    reason: string;
    threshold: number;
    candidateCount: any;
    writeCount: number;
    write: {
        file: string;
        changed: boolean;
        slug: string;
        type: import("./group-memory-index").GroupTypedMemoryType;
        name: string;
    };
    index: {
        file: string;
        dir: string;
        docs: {
            file: string;
            relPath: string;
            name: any;
            description: any;
            type: import("./group-memory-index").GroupTypedMemoryType;
            source: any;
            paths: string[];
            updatedAt: any;
            checksum: any;
            body: string;
            mtimeMs: number;
            bytes: number;
        }[];
        changed: boolean;
        lineCount: number;
        bytes: number;
    };
    ledgerFile: any;
    summary: {
        schema: string;
        groupId: string;
        file: any;
        entryCount: any;
        recordedCount: number;
        demotedCount: any;
        conflictCount: any;
        semanticRiskCount: any;
        semanticConflictCount: any;
        maxSemanticRiskScore: any;
        repeatedConflictCount: any;
        distilledConflictCount: any;
        pendingDistillationCount: any;
        typedMemoryDocs: any[];
        updatedAt: any;
        latestEntries: any;
        distillationCandidates: any;
    };
    distilledAt: string;
};
export declare function analyzeGroupSessionMemoryBudget(markdown: string): {
    schema: string;
    version: number;
    status: string;
    estimator: string;
    ccParitySource: string;
    totalTokens: number;
    maxTotalTokens: number;
    totalUtilizationPercent: number;
    maxSectionTokens: number;
    maxSectionUtilizationPercent: number;
    sectionCount: number;
    oversizedSectionCount: number;
    oversizedSections: {
        header: string;
        tokens: number;
        maxTokens: number;
        overBudget: boolean;
    }[];
    sections: {
        header: string;
        tokens: number;
        maxTokens: number;
        overBudget: boolean;
    }[];
};
export declare function evaluateGroupSessionMemoryUpdateCadence(messages: any[], previousSnapshot?: any, options?: any): {
    schema: string;
    version: number;
    ccParitySource: string;
    minimumMessageTokensToInit: number;
    minimumTokensBetweenUpdate: number;
    toolCallsBetweenUpdates: number;
    initialized: boolean;
    status: string;
    shouldExtract: boolean;
    currentContextTokens: number;
    tokensAtLastExtraction: number;
    tokensSinceLastExtraction: number;
    toolCallsSinceLastExtraction: any;
    lastAssistantTurnHasToolCalls: boolean;
    tokenThresholdMet: boolean;
    toolCallThresholdMet: boolean;
    naturalBreak: boolean;
    lastObservedMessageId: string;
    lastExtractionMessageId: string;
    extractionCount: number;
    lastExtractedAt: string;
    observedAt: string;
};
export declare function enforceGroupSessionMemoryBudget(markdown: string): {
    markdown: string;
    wasTruncated: boolean;
    truncatedSections: string[];
    before: {
        schema: string;
        version: number;
        status: string;
        estimator: string;
        ccParitySource: string;
        totalTokens: number;
        maxTotalTokens: number;
        totalUtilizationPercent: number;
        maxSectionTokens: number;
        maxSectionUtilizationPercent: number;
        sectionCount: number;
        oversizedSectionCount: number;
        oversizedSections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
        sections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
    };
    after: {
        schema: string;
        version: number;
        status: string;
        estimator: string;
        ccParitySource: string;
        totalTokens: number;
        maxTotalTokens: number;
        totalUtilizationPercent: number;
        maxSectionTokens: number;
        maxSectionUtilizationPercent: number;
        sectionCount: number;
        oversizedSectionCount: number;
        oversizedSections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
        sections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
    };
};
export declare function buildGroupSessionMemorySectionEvidence(markdown: string, source?: any): {
    checksum: string;
    schema: string;
    version: number;
    sourceType: string;
    markdownChecksum: string;
    sourceTranscriptChecksum: string;
    sourceFirstMessageId: string;
    sourceLastMessageId: string;
    sourceMessageCount: number;
    sourceMessageIds: unknown[];
    sections: {
        evidenceId: string;
        section: string;
        sectionIndex: number;
        sectionChecksum: string;
        sourceTranscriptChecksum: string;
        sourceFirstMessageId: string;
        sourceLastMessageId: string;
        sourceMessageCount: number;
        sourceMessageIds: unknown[];
    }[];
};
export declare function buildGroupSessionMemorySnapshot(groupId: string, memory?: any, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    generatedAt: string;
    reason: string;
    strategy: string;
    extractionMethod: string;
    modelExtracted: boolean;
    deterministicFallback: boolean;
    modelExtractionReceipt: any;
    modelMergeQuality: any;
    factSupersessionGraph: any;
    sectionEvidence: any;
    budgetEnforcement: {
        wasTruncated: boolean;
        truncatedSections: string[];
        before: {
            schema: string;
            version: number;
            status: string;
            estimator: string;
            ccParitySource: string;
            totalTokens: number;
            maxTotalTokens: number;
            totalUtilizationPercent: number;
            maxSectionTokens: number;
            maxSectionUtilizationPercent: number;
            sectionCount: number;
            oversizedSectionCount: number;
            oversizedSections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
            sections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
        };
        after: {
            schema: string;
            version: number;
            status: string;
            estimator: string;
            ccParitySource: string;
            totalTokens: number;
            maxTotalTokens: number;
            totalUtilizationPercent: number;
            maxSectionTokens: number;
            maxSectionUtilizationPercent: number;
            sectionCount: number;
            oversizedSectionCount: number;
            oversizedSections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
            sections: {
                header: string;
                tokens: number;
                maxTokens: number;
                overBudget: boolean;
            }[];
        };
    };
    summaryFile: string;
    snapshotFile: string;
    lastSummarizedMessageId: string;
    summaryChecksum: string;
    markdownChecksum: string;
    markdownChars: number;
    markdownTokens: number;
    memoryBudget: {
        schema: string;
        version: number;
        status: string;
        estimator: string;
        ccParitySource: string;
        totalTokens: number;
        maxTotalTokens: number;
        totalUtilizationPercent: number;
        maxSectionTokens: number;
        maxSectionUtilizationPercent: number;
        sectionCount: number;
        oversizedSectionCount: number;
        oversizedSections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
        sections: {
            header: string;
            tokens: number;
            maxTokens: number;
            overBudget: boolean;
        }[];
    };
    updateCadence: any;
    extractionTransaction: any;
    hasSummary: boolean;
    compactedMessageCount: number;
    preservedRecentMessages: number;
    preCompactTokenCount: number;
    postCompactTokenCount: number;
    health: string;
    contextPressureWarning: any;
    markdownExcerpt: string;
    markdown: string;
};
export declare function persistGroupSessionMemorySnapshot(groupId: string, memory?: any, options?: any): any;
export declare function commitGroupSessionMemorySnapshot(snapshot?: any): any;
export declare function persistGroupSessionMemoryCadenceObservation(groupId: string, cadenceDecision?: any): any;
export declare function readGroupSessionMemorySnapshotSummary(groupId: string): any;
export declare function persistGroupToolContinuitySnapshot(groupId: string, memory?: any, options?: any): any;
export declare function readGroupToolContinuitySnapshotSummary(groupId: string): any;
export declare function buildGroupCompactFileReferences(groupId: string, input?: any): {
    schema: string;
    version: number;
    groupId: string;
    generatedAt: string;
    referenceCount: number;
    fileCount: number;
    directoryCount: number;
    missingCount: number;
    references: any[];
    usePolicy: {
        sourceOfTruth: string;
        behavior: string;
        note: string;
    };
};
export declare function buildGroupCompactFileReferenceReadPlan(groupId: string, references?: any, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    generatedAt: string;
    sourceReferenceCount: any;
    plannedCount: any;
    missingCount: any;
    maxEntries: number;
    hasSourceOfTruth: boolean;
    hasCompactSummary: boolean;
    entries: any[];
    policy: {
        mode: string;
        sourceOfTruth: string;
        doNotReadAll: boolean;
        preferOrder: string[];
        receiptFields: string[];
        note: string;
    };
};
export declare function readGroupCompactFileReferenceLedger(groupId: string): any;
export declare function recordGroupCompactFileReferenceSurfacing(groupId: string, references?: any, options?: any): any;
export declare function summarizeGroupCompactFileReferenceAccess(groupId: string, references?: any, memory?: any): {
    schema: string;
    version: number;
    groupId: string;
    ledger_file: any;
    ledger_entry_count: any;
    reference_count: any;
    mentioned_count: any;
    missing_count: any;
    mention_rate: number;
    rows: any;
    recent_surfaced: any;
};
export declare function summarizeGroupCompactFileReferenceReadPlanAccess(groupId: string, readPlan?: any, memory?: any): {
    schema: string;
    version: number;
    groupId: string;
    ledger_file: any;
    ledger_entry_count: any;
    read_plan_entry_count: any;
    mentioned_count: any;
    read_plan_id_mentioned_count: any;
    reference_mentioned_count: any;
    mention_rate: number;
    read_plan_id_mention_rate: number;
    rows: any;
    recent_surfaced: any;
};
export declare function summarizeGroupCompactFileReferenceReadPlanFreshness(groupId: string, readPlan?: any): {
    schema: string;
    version: number;
    groupId: string;
    generatedAt: string;
    status: string;
    checked: any;
    freshCount: any;
    changedCount: any;
    unverifiableCount: any;
    freshnessRate: number;
    rows: any;
    staleRows: any;
    gaps: any[];
};
export declare function latestGroupCompactFileReferenceReadPlanRows(groupId: string, fallbackReadPlan?: any, options?: any): {
    schema: string;
    groupId: string;
    ledgerFile: any;
    ledgerEntryCount: any;
    rows: any[];
};
export declare function latestGroupCompactFileReferenceReadPlanRevalidationGate(groupId: string): any;
export declare function buildGroupCompactFileReferenceReadPlanRevalidationGate(groupId: string, freshness?: any, options?: any): {
    context_budget: {
        chars: number;
        estimated_tokens: number;
        max_chars: number;
        max_tokens: number;
        reserved_output_tokens: number;
        auto_compact_threshold: number;
        warning_threshold: number;
        blocking_threshold: number;
        pressure: number;
        compact_recommended: boolean;
        boundary: {
            type: string;
            preserved_head_chars: number;
            preserved_tail_chars: number;
        };
    };
    schema: string;
    version: number;
    revalidation_gate_id: string;
    group_id: string;
    target_project: string;
    scope: string;
    generated_at: string;
    task_id: string;
    trace_id: string;
    task_agent_session_id: string;
    native_session_id: string;
    session_binding: any;
    status: string;
    action: string;
    required_count: any;
    verification_count: any;
    checked_count: number;
    freshness_status: any;
    freshness_rate: any;
    changed_count: number;
    unverifiable_count: number;
    required_read_plan_ids: any;
    verification_read_plan_ids: any;
    required_entries: any;
    verification_entries: any;
    receipt_contract: {
        required_receipt_fields: string[];
        required_reference: string;
        required_read_plan_ids: any;
        required_task_agent_session_id: string;
        required_native_session_id: string;
        memory_used_must_reference_gate: boolean;
        memory_ignored_must_reference_gate: boolean;
        receipt_should_match_session: boolean;
        require_current_source_verification: boolean;
        required_receipt_signal: string;
        note: string;
    };
    prompt_patch: string;
};
export declare function buildGroupMemoryContext(memory: any): string;
export declare function deleteGroupSessionMemoryArtifacts(groupId: string, sessionId: string): {
    schema: string;
    groupId: string;
    sessionId: string;
    scopeId: string;
    deletedFiles: number;
    boundaryArtifacts: {
        schema: string;
        groupId: string;
        sessionId: string;
        deletedFiles: number;
        files: string[];
        deletedAt: string;
    };
    typedMemoryDispatchWalArtifacts: {
        deletedFiles: number;
    };
    invocationLineageArtifacts: {
        deleted: number;
        recoveryDeleted: number;
        recoveryLeaseDeleted: number;
    } | {
        deleted: number;
        recoveryDeleted: number;
    };
    continuationSoakArtifacts: {
        deleted: number;
        groupId: string;
        groupSessionId: string;
        taskAgentSessionId: string;
    } | {
        deleted: number;
    };
    compactHeadArtifacts: {
        deleted: number;
        groupId: string;
        groupSessionId: string;
        file: string;
    } | {
        deleted: number;
    };
    deletedAt: string;
};
export declare function prepareGroupMemoryResumeProjection(groupId: string, groupSessionId: string, allMessages: any[], storedMemory: any, options?: any): {
    schema: string;
    groupId: string;
    groupSessionId: string;
    memory: any;
    projection: any;
    proof: any;
    recovered: boolean;
    recoveryReason: any;
    recoveryRotation: any;
};
export declare function buildGroupMemorySourceManifest(groupId: string, input?: any): {
    schema: string;
    version: number;
    groupId: string;
    groupSessionId: string;
    generatedAt: string;
    status: string;
    pass: boolean;
    sourceOrder: string[];
    entryCount: number;
    typedDocCount: any;
    includedTypedDocCount: any;
    requiredIds: string[];
    missingRequired: any[];
    changedAfterManifest: any[];
    latestMtimeMs: any;
    latestMtime: string;
    manifestChecksum: string;
    entries: any[];
};
export declare function readGroupPostCompactDispatchLedger(groupId: string, sessionId?: string): any;
export declare function readGroupPostCompactCandidateUsageLedger(groupId: string, sessionId?: string): any;
export declare function readGroupApiMicrocompactNativeApplyProofLedger(groupId: string, sessionId?: string): any;
export declare function readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId: string, sessionId?: string): any;
export declare function recordGroupPostCompactCandidateUsageLedger(groupId: string, input?: any): {
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
export declare function buildGroupPostCompactCandidateUsageSummary(groupId: string, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    groupSessionId: string;
    target_project: string;
    ledger_file: any;
    has_history: boolean;
    candidate_count: number;
    totals: unknown;
    useful_candidates: unknown[];
    ignored_candidates: unknown[];
    missing_usage_candidates: unknown[];
    recent_entries: any;
    updatedAt: any;
};
export declare function buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow(input?: any): {
    planChecksum: string;
    applyPlanChecksum: string;
    requestPatchChecksum: string;
    requestBodyChecksum: string;
    requestBody: any;
    hasContextManagement: boolean;
    contextManagementEditCount: number;
    betaHeaders: string[];
    provider: string;
    model: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    requestId: string;
    runnerRequestId: string;
    externalRunnerRequestId: string;
    taskAgentSessionId: string;
    nativeSessionId: string;
    memoryContextSnapshotId: string;
    memoryContextSnapshotChecksum: string;
    targetProject: string;
    agent: string;
    taskId: string;
    executionId: string;
    sentAt: string;
    telemetrySource: string;
    ok: any;
    error: string;
};
export declare function recordGroupApiMicrocompactNativeApplyAdapterTelemetry(input?: any): {
    schema: string;
    groupId: string;
    groupSessionId: string;
    file: string;
    skipped: boolean;
    reason: string;
    recorded_count: number;
    totals: any;
    updated_count?: undefined;
    updatedAt?: undefined;
} | {
    schema: string;
    groupId: string;
    groupSessionId: string;
    file: string;
    recorded_count: number;
    updated_count: number;
    totals: any;
    updatedAt: string;
    skipped?: undefined;
    reason?: undefined;
} | {
    schema: string;
    skipped: boolean;
    reason: string;
    recorded_count: number;
    groupId?: undefined;
} | {
    schema: string;
    groupId: string;
    skipped: boolean;
    reason: string;
    recorded_count: number;
};
export declare function recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId: string, input?: any): {
    schema: string;
    groupId: string;
    groupSessionId: string;
    file: string;
    skipped: boolean;
    reason: string;
    recorded_count: number;
    totals: any;
    updated_count?: undefined;
    updatedAt?: undefined;
} | {
    schema: string;
    groupId: string;
    groupSessionId: string;
    file: string;
    recorded_count: number;
    updated_count: number;
    totals: any;
    updatedAt: string;
    skipped?: undefined;
    reason?: undefined;
};
export declare function buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary(groupId: string, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    groupSessionId: string;
    target_project: string;
    ledger_file: any;
    has_history: boolean;
    status: string;
    entry_count: any;
    totals: any;
    source_counts: any;
    matched_entries: any;
    failed_entries: any;
    recent_entries: any;
    updatedAt: any;
};
export declare function recordGroupApiMicrocompactNativeApplyProofLedger(groupId: string, input?: any): {
    schema: string;
    groupId: string;
    groupSessionId: string;
    file: string;
    skipped: boolean;
    reason: string;
    recorded_count: number;
    totals: any;
    updated_count?: undefined;
    updatedAt?: undefined;
} | {
    schema: string;
    groupId: string;
    groupSessionId: string;
    file: string;
    recorded_count: number;
    updated_count: number;
    totals: any;
    updatedAt: string;
    skipped?: undefined;
    reason?: undefined;
};
export declare function buildGroupApiMicrocompactNativeApplyProofSummary(groupId: string, options?: any): {
    schema: string;
    version: number;
    groupId: string;
    groupSessionId: string;
    target_project: string;
    ledger_file: any;
    has_history: boolean;
    status: string;
    entry_count: any;
    proof_coverage_rate: number;
    request_telemetry: {
        matched_verified_count: any;
        adapter_matched_verified_count: any;
        receipt_matched_verified_count: any;
        strong_verified_count: any;
        receipt_only_verified_count: any;
        missing_verified_count: any;
        stale_verified_count: any;
        max_age_ms: number;
        schema: string;
        version: number;
        groupId: string;
        groupSessionId: string;
        target_project: string;
        ledger_file: any;
        has_history: boolean;
        status: string;
        entry_count: any;
        totals: any;
        source_counts: any;
        matched_entries: any;
        failed_entries: any;
        recent_entries: any;
        updatedAt: any;
    };
    totals: any;
    verified_entries: any;
    failed_entries: any;
    advisory_entries: any;
    recent_entries: any;
    updatedAt: any;
};
export declare function recordGroupMemoryReloadAudit(groupId: string, input?: any): {
    ledgerFile: string;
    schema: string;
    version: number;
    groupId: string;
    groupSessionId: string;
    scope: string;
    contextKind: any;
    reason: string;
    originalReason: string;
    generatedAt: string;
    shouldReload: boolean;
    cacheAction: string;
    hookEvent: string;
    previousAuditAt: any;
    sourceManifestChecksum: string;
    previousSourceManifestChecksum: any;
    sourceManifestChanged: boolean;
    stableSourceFingerprint: string;
    previousStableSourceFingerprint: any;
    sourceShapeChanged: boolean;
    loadPlanFingerprint: string;
    previousLoadPlanFingerprint: any;
    loadPlanChanged: boolean;
    sourceChangeTrigger: {
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
    sourceStatus: any;
    sourceEntryCount: number;
    typedDocCount: number;
    loadPlanStatus: any;
    loadPlanEntryCount: number;
    imports: {
        globalClaudeImported: number;
        projectImported: number;
        projectImportRoots: any;
    };
    compact: {
        postCompactRecoveryStatus: any;
        summaryChecksum: any;
    };
};
export declare function scheduleGroupMemoryAutoCompaction(groupId: string, options?: any): {
    scheduled: boolean;
    reason: string;
    groupId?: undefined;
    sessionId?: undefined;
    delayMs?: undefined;
} | {
    scheduled: boolean;
    groupId: string;
    sessionId: string;
    delayMs: number;
    reason?: undefined;
};
export declare function runGroupMemoryAutoCompactionNow(groupId: string, options?: any): Promise<{
    success: boolean;
    compacted: boolean;
    reason: string;
    scheduled?: undefined;
    boundary?: undefined;
    keepIndex?: undefined;
    background?: undefined;
    memory?: undefined;
    compactHead?: undefined;
    error?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    scheduled: boolean;
    reason: string;
    boundary?: undefined;
    keepIndex?: undefined;
    background?: undefined;
    memory?: undefined;
    compactHead?: undefined;
    error?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    boundary: any;
    keepIndex: any;
    background: {
        status: string;
        reason: string;
        messageId: string;
        compacted: boolean;
        modelCompactionEnabled: boolean;
        rebuild: boolean;
        force: boolean;
        boundaryId: string;
        summarizedThroughMessageId: string;
        keepIndex: number;
        messageCount: number;
        error: string;
        startedAt: string;
        completedAt: string;
    };
    memory: any;
    compactHead: {
        committed: boolean;
        idempotent: boolean;
        head: any;
        file: any;
    };
    reason?: undefined;
    scheduled?: undefined;
    error?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    error: string;
    background: {
        status: string;
        reason: string;
        messageId: string;
        compacted: boolean;
        modelCompactionEnabled: boolean;
        rebuild: boolean;
        force: boolean;
        boundaryId: string;
        summarizedThroughMessageId: string;
        keepIndex: number;
        messageCount: number;
        error: string;
        startedAt: string;
        completedAt: string;
    };
    reason?: undefined;
    scheduled?: undefined;
    boundary?: undefined;
    keepIndex?: undefined;
    memory?: undefined;
    compactHead?: undefined;
}>;
export declare function ensureGroupMemoryAutoCompactionHook(): {
    registered: boolean;
    already: boolean;
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
        contextPressureWarningRecorded: boolean;
        summaryPreservesSentinel: boolean;
        rawTranscriptUntouched: any;
    };
    background: any;
}>;
export declare function buildChildTypedMemoryRecallLedgerScope(targetProject: string, sessionBinding?: any, memory?: any, options?: any): {
    schema: string;
    version: number;
    scope: string;
    scopeKind: string;
    targetProject: string;
    taskId: string;
    taskAgentSessionId: string;
    compactEpoch: string;
    sessionBound: boolean;
    dedupeBoundary: string;
    crossTaskSessionRecallRequired: boolean;
    postCompactRecallRequired: boolean;
    changedDocumentRecallRequired: boolean;
};
export declare function buildChildTypedMemoryDeliveryCapsule(input?: any, options?: any): any;
export declare function buildAgentMemoryContextBundle(groupId: string, targetProject: string, task?: string, options?: any): any;
export declare function admitChildPostTurnSummaryDelivery(memoryBundle: any, options?: any): any;
export declare function admitChildTypedMemoryDelivery(memoryBundle: any, options?: any): any;
export declare function commitChildTypedMemoryDelivery(memoryBundle: any, options?: any): {
    committed: boolean;
    reason: string;
    validation_issues?: undefined;
    dispatched?: undefined;
    executionReturned?: undefined;
    promptBindingVerified?: undefined;
    idempotent?: undefined;
    lease?: undefined;
    stats?: undefined;
    ledger_file?: undefined;
} | {
    committed: boolean;
    reason: string;
    validation_issues: any;
    dispatched?: undefined;
    executionReturned?: undefined;
    promptBindingVerified?: undefined;
    idempotent?: undefined;
    lease?: undefined;
    stats?: undefined;
    ledger_file?: undefined;
} | {
    committed: boolean;
    reason: string;
    dispatched: boolean;
    executionReturned: boolean;
    promptBindingVerified: boolean;
    validation_issues?: undefined;
    idempotent?: undefined;
    lease?: undefined;
    stats?: undefined;
    ledger_file?: undefined;
} | {
    committed: boolean;
    idempotent: boolean;
    reason: string;
    lease: any;
    stats: {
        schema: string;
        version: number;
        groupId: string;
        scope: string;
        deliveredBytes: number;
        deliveredTokens: number;
        deliveryCount: number;
        deliveredDocumentCount: number;
        compactEpoch: string;
        taskAgentSessionId: string;
        updatedAt: string;
        file: any;
    };
    ledger_file: any;
    validation_issues?: undefined;
    dispatched?: undefined;
    executionReturned?: undefined;
    promptBindingVerified?: undefined;
};
export declare function createChildTypedMemoryDispatchWal(admission: any, input?: any): {
    required: boolean;
    created: boolean;
    reason: string;
    idempotent?: undefined;
    record?: undefined;
} | {
    required: boolean;
    created: boolean;
    idempotent: boolean;
    record: any;
    reason?: undefined;
} | {
    required: boolean;
    created: boolean;
    record: any;
    reason?: undefined;
    idempotent?: undefined;
} | {
    required: boolean;
    created: boolean;
    reason: string;
    record: any;
};
export declare function markChildTypedMemoryDispatchStarted(wal: any, input?: any): any;
export declare function markChildTypedMemoryRunnerReturned(record: any, input?: any): any;
export declare function markChildTypedMemoryDispatchCommitted(record: any, commit?: any): any;
export declare function recoverChildTypedMemoryDispatchWal(options?: any): {
    schema: string;
    checked_at: string;
    total: number;
    recovered: number;
    uncertain: number;
    expired: number;
    invalid: number;
    pruned: number;
    direct_spool_pruned: number;
    rows: any[];
};
export declare function renderGroupMemoryContextBundle(bundle: any): string;
export declare function buildAgentMemoryPacket(groupId: string, targetProject: string, task?: string, options?: any): string;
export declare function buildGlobalGroupMemoryContext(query?: string, options?: any): any;
export declare function renderGlobalGroupMemoryContextBundle(bundle: any): string;
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
export declare function buildGroupContextPacket(groupId: string, options?: any): string;
export declare function findLatestWorkerLedger(memory: any, project: string): any;
export declare function appendWorkerLedger(memory: any, item: any): any;
export declare function updateGroupMemory(groupId: string, patch?: any): any;
