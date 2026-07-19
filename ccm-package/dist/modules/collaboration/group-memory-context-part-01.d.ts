export declare function buildChildAgentTypeSummary(memory?: any): {
    schema: string;
    agentTypeCount: number;
    targetCount: any;
    rows: any[];
};
export declare function verifyGroupSessionMemoryFactSupersessionGraphForContext(graph: any): any;
export declare function buildChildAgentSessionBinding(groupId: string, targetProject: string, task?: string, options?: any): {
    schema: string;
    binding_id: string;
    group_id: string;
    group_session_id: string;
    target_project: string;
    task_id: string;
    trace_id: string;
    execution_id: string;
    parent_run_id: string;
    task_agent_session_id: string;
    native_session_id: string;
    agent_type: string;
    turn: number;
    binding_required: boolean;
    scope: string;
};
export declare function renderGroupPostCompactInvokedSkillAttachments(source: any): string;
export declare function renderGroupPostCompactPlanAttachment(source: any): string;
export declare function renderGroupPostCompactDynamicContextDelta(source: any): string;
export declare function buildGroupMemoryContext(memory: any): string;
export declare function prepareGroupMemoryResumeProjection(groupId: string, groupSessionId: string, allMessages: any[], storedMemory: any, options?: any): {
    schema: string;
    groupId: string;
    groupSessionId: string;
    memory: any;
    projection: any;
    proof: any;
    resumeBaseline: any;
    sessionMemoryCadenceDecision: any;
    skippedFullSnapshotRefresh: boolean;
    compactHeadRecovery: any;
    providerNativeCompactSessionCapacityReconciliation: any;
    recovered: boolean;
    recoveryReason: any;
    recoveryRotation: any;
};
export declare function normalizePostCompactReinjectionRows(plan?: any): {
    candidate_id: string;
    kind: string;
    value: string;
    sourceMessageId: string;
    actor: string;
    taskId: string;
}[];
export declare function buildGroupMemoryPostCompactReinjectionGate(input?: any): {
    schema: string;
    version: number;
    reinjection_gate_id: string;
    group_id: string;
    target_project: string;
    scope: string;
    generated_at: any;
    status: string;
    action: string;
    candidate_count: number;
    candidates: {
        candidate_id: string;
        kind: string;
        value: string;
        sourceMessageId: string;
        actor: string;
        taskId: string;
    }[];
    post_compact_recovery_audit: {
        status: any;
        pass: boolean;
        action: any;
        boundary_id: any;
        summary_checksum: string;
        transcript_path: any;
    };
    receipt_contract: {
        memory_used_should_reference_gate: boolean;
        memory_ignored_should_reference_gate: boolean;
        required_receipt_fields: string[];
        required_reference: string;
        required_candidate_reference: string;
        required_candidate_usage_state: string;
        candidate_ids: any[];
        note: string;
    };
};
export declare function normalizeDynamicContextToolScope(value?: any): {
    mcp: string[];
    skill: string[];
};
export declare function buildGroupPostCompactDynamicContextCatalog(groupId: string, memory?: any, options?: any): {
    schema: string;
    groupId: string;
    tools: {
        name: string;
        description: string;
        server: string;
        line: string;
    }[];
    skills: {
        name: string;
        description: string;
        contentHash: string;
        line: string;
    }[];
    mcpInstructions: {
        name: string;
        instructions: string;
        block: string;
    }[];
    agents: any;
};
export declare function scheduleGroupMemoryAutoCompaction(groupId: string, options?: any): {
    scheduled: boolean;
    reason: string;
    groupId?: undefined;
    sessionId?: undefined;
    circuitBreaker?: undefined;
    delayMs?: undefined;
} | {
    scheduled: boolean;
    reason: string;
    groupId: string;
    sessionId: string;
    circuitBreaker?: undefined;
    delayMs?: undefined;
} | {
    scheduled: boolean;
    reason: string;
    groupId: string;
    sessionId: string;
    circuitBreaker: any;
    delayMs?: undefined;
} | {
    scheduled: boolean;
    groupId: string;
    sessionId: string;
    delayMs: number;
    reason?: undefined;
    circuitBreaker?: undefined;
};
export declare function runGroupMemoryAutoCompactionNow(groupId: string, options?: any): Promise<{
    success: boolean;
    compacted: boolean;
    reason: string;
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    circuitBreaker?: undefined;
    scheduled?: undefined;
    error?: undefined;
    lifecycleValidation?: undefined;
    compactionActivity?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    reason: string;
    groupId: string;
    sessionId: string;
    skipped?: undefined;
    circuitBreaker?: undefined;
    scheduled?: undefined;
    error?: undefined;
    lifecycleValidation?: undefined;
    compactionActivity?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    skipped: boolean;
    reason: string;
    groupId: string;
    sessionId: string;
    circuitBreaker: any;
    scheduled?: undefined;
    error?: undefined;
    lifecycleValidation?: undefined;
    compactionActivity?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    scheduled: boolean;
    reason: string;
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    circuitBreaker?: undefined;
    error?: undefined;
    lifecycleValidation?: undefined;
    compactionActivity?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    reason: string;
    error: string;
    lifecycleValidation: {
        schema: string;
        valid: boolean;
        required: boolean;
        status: string;
        issues: string[];
        fence: {
            schema: string;
            required: boolean;
            groupId: string;
            groupSessionId: string;
            lifecycleGeneration: number;
            lifecycleStatus: string;
            lifecycleHeadId: string;
            lifecycleHeadChecksum: string;
            memoryContextSnapshotId: string;
            memoryContextSnapshotChecksum: string;
        };
        expected: {
            lifecycleHeadId: string;
            generation: number;
            status: string;
            lifecycleHeadChecksum: string;
        };
    };
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    circuitBreaker?: undefined;
    scheduled?: undefined;
    compactionActivity?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    scheduled: boolean;
    reason: string;
    compactionActivity: {
        started: boolean;
        busy: boolean;
        reason: string;
        current: any;
        ledger: any;
        operationId?: undefined;
        lifecycleValidation?: undefined;
    } | {
        started: boolean;
        busy: boolean;
        operationId: string;
        current: any;
        ledger: any;
        lifecycleValidation: {
            schema: string;
            valid: boolean;
            required: boolean;
            status: string;
            issues: string[];
            fence: {
                schema: string;
                required: boolean;
                groupId: string;
                groupSessionId: string;
                lifecycleGeneration: number;
                lifecycleStatus: string;
                lifecycleHeadId: string;
                lifecycleHeadChecksum: string;
                memoryContextSnapshotId: string;
                memoryContextSnapshotChecksum: string;
            };
            expected: {
                lifecycleHeadId: string;
                generation: number;
                status: string;
                lifecycleHeadChecksum: string;
            };
        };
        reason?: undefined;
    } | {
        started: boolean;
        busy: boolean;
        reason: string;
        lifecycleValidation: {
            schema: string;
            valid: boolean;
            required: boolean;
            status: string;
            issues: string[];
            fence: {
                schema: string;
                required: boolean;
                groupId: string;
                groupSessionId: string;
                lifecycleGeneration: number;
                lifecycleStatus: string;
                lifecycleHeadId: string;
                lifecycleHeadChecksum: string;
                memoryContextSnapshotId: string;
                memoryContextSnapshotChecksum: string;
            };
            expected: {
                lifecycleHeadId: string;
                generation: number;
                status: string;
                lifecycleHeadChecksum: string;
            };
        };
    };
    lifecycleValidation: {
        schema: string;
        valid: boolean;
        required: boolean;
        status: string;
        issues: string[];
        fence: {
            schema: string;
            required: boolean;
            groupId: string;
            groupSessionId: string;
            lifecycleGeneration: number;
            lifecycleStatus: string;
            lifecycleHeadId: string;
            lifecycleHeadChecksum: string;
            memoryContextSnapshotId: string;
            memoryContextSnapshotChecksum: string;
        };
        expected: {
            lifecycleHeadId: string;
            generation: number;
            status: string;
            lifecycleHeadChecksum: string;
        };
    };
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    circuitBreaker?: undefined;
    error?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    compactionActivity: {
        finished: boolean;
        terminal: any;
        ledger: any;
        commitFence: {
            schema: string;
            status: string;
            group_id: string;
            group_session_id: string;
            operation_id: string;
            boundary_id: any;
            compact_transaction_receipt_checksum: any;
            committed_at: string;
            body_free: boolean;
            ledger_checksum: any;
        };
    };
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
        typedMemoryScopeId: string;
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
    typedMemoryScopeId: string;
    logDistillation: any;
    providerNativeCompactSessionCapacityReset: any;
    postCompactSessionStateReset: any;
    promptCacheCompactionNotification: any;
    circuitBreaker: any;
    lifecycleValidation: any;
    lifecycleCommitProof: any;
    reason?: undefined;
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    scheduled?: undefined;
    error?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    cancelled: boolean;
    reason: string;
    cancelRequestId: string;
    cancelRequestedAt: string;
    compactionActivity: {
        finished: boolean;
        reason: string;
        ledger: any;
        terminal?: undefined;
    } | {
        finished: boolean;
        terminal: any;
        ledger: any;
        reason?: undefined;
    } | {
        finished: boolean;
        reason: string;
    };
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    circuitBreaker?: undefined;
    scheduled?: undefined;
    error?: undefined;
    lifecycleValidation?: undefined;
    lifecycleStage?: undefined;
    background?: undefined;
} | {
    success: boolean;
    compacted: boolean;
    reason: string;
    error: string;
    lifecycleValidation: any;
    lifecycleStage: string;
    compactionActivity: {
        finished: boolean;
        reason: string;
        ledger: any;
        terminal?: undefined;
    } | {
        finished: boolean;
        terminal: any;
        ledger: any;
        reason?: undefined;
    } | {
        finished: boolean;
        reason: string;
    };
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    circuitBreaker?: undefined;
    scheduled?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    background?: undefined;
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
        typedMemoryScopeId: string;
        error: string;
        startedAt: string;
        completedAt: string;
    };
    circuitBreaker: any;
    compactionActivity: {
        finished: boolean;
        reason: string;
        ledger: any;
        terminal?: undefined;
    } | {
        finished: boolean;
        terminal: any;
        ledger: any;
        reason?: undefined;
    } | {
        finished: boolean;
        reason: string;
    };
    reason?: undefined;
    groupId?: undefined;
    sessionId?: undefined;
    skipped?: undefined;
    scheduled?: undefined;
    lifecycleValidation?: undefined;
    cancelled?: undefined;
    cancelRequestId?: undefined;
    cancelRequestedAt?: undefined;
    lifecycleStage?: undefined;
}>;
export declare function ensureGroupMemoryAutoCompactionHook(): {
    registered: boolean;
    already: boolean;
};
export declare function pressureMemoryProvenanceDisciplineStatus(value: any): string;
export declare function pressureMemoryProvenanceDisciplineUnderRepair(value?: any): boolean;
export declare function buildPressureMemoryProvenanceReceiptDiscipline(input?: any, options?: any): {
    schema: string;
    version: number;
    active: boolean;
    source: string;
    targetProject: string;
    generatedAt: string;
    docCount: number;
    requiredFields: string[];
    currentSourceVerifiedRule: string;
    rows: any[];
    exampleRows: {
        relPath: any;
        usageState: string;
        provenanceStatus: any;
        repairWorkItemId: any;
        repairStatus: any;
        repairGapType: any;
        currentSourceVerified: boolean;
    }[];
};
export declare function buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall(groupId: string, task?: string, memory?: any, options?: any): {
    schema: string;
    version: number;
    active: boolean;
    disabled: boolean;
    reason: string;
    docRelPath: string;
    archivedCount: number;
    verifiedCount: number;
    preservedCount: number;
    receiptCount: number;
    relPathCount: number;
    rowIdCount: number;
    taskMatched: boolean;
    recalledThisTurn: boolean;
    repeatableRelPaths: any[];
    targetPaths: any[];
    queryAppend: string;
    authorizationBoundary: string;
    memoryUsageReceiptDocRelPaths: any[];
    memoryUsageReceiptDisciplineRelPaths: any[];
    memoryUsageReceiptDisciplineRequired: boolean;
    memoryUsageReceiptDisciplineRecalledThisTurn: boolean;
    rows: any[];
} | {
    active: boolean;
    reason: string;
    archivedCount: number;
    verifiedCount: number;
    preservedCount: number;
    receiptCount: number;
    relPathCount: number;
    rowIdCount: number;
    taskMatched: boolean;
    repeatableRelPaths: string[];
    targetPaths: string[];
    queryAppend: string;
    typedMemoryRelPaths: string[];
    memoryUsageReceiptDocRelPaths: string[];
    memoryUsageReceiptDisciplineRelPaths: string[];
    memoryUsageReceiptDisciplineRequired: boolean;
    typedMemoryRowIds: string[];
    receiptIds: string[];
    receiptChecksums: string[];
    rows: any;
    schema: string;
    version: number;
    disabled: boolean;
    docRelPath: string;
    recalledThisTurn: boolean;
    authorizationBoundary: string;
    memoryUsageReceiptDisciplineRecalledThisTurn: boolean;
};
export declare function isPostCompactReinjectionRepairReceiptRecallQuery(value: any, rows?: any[]): boolean;
