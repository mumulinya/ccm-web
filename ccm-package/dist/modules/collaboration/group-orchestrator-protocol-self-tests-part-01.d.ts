export declare function runCoordinatorProtocolSelfTest(): {
    pass: boolean;
    contentHasPlan: boolean;
    coordinationPlan: any;
    assignmentCount: number;
    assignments: any[];
    taskChecks: {
        project: any;
        dependsOn: any;
        hasWorkerPacket: boolean;
        hasRuntimeWorkerContextPacket: boolean;
        hasStructuredWorkerPacket: boolean;
        hasUnderstanding: boolean;
        hasVerification: boolean;
        hasReceipt: boolean;
        hasDocumentEvidence: boolean;
        hasCoordinatorWorkerProtocol: boolean;
        forbidsLazyDelegation: boolean;
    }[];
    executionOrder: any;
    coordinationStrategy: any;
    frontendDependsOnBackend: boolean;
    llmDocumentGuardPass: any;
    semanticReasoningPass: any;
    shortDocBackendFirstPass: any;
    shortDocExecutionOrder: any;
    ragInjectionPass: any;
    ragCitations: any;
    reactiveCompactionPass: boolean;
    structuredFallbackPolicyPass: boolean;
    informationalBoundaryPass: boolean;
    coordinatorUserSanitizerPass: boolean;
    codedNotificationDigestPass: boolean;
    followUpSpecQualityPass: boolean;
    lazyFollowUpQuality: {
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    } | {
        auto_enriched: boolean;
        enriched_hint_count: number;
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    };
    lazyFollowUpMessage: string;
    synthesizedFollowUpQuality: {
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    } | {
        auto_enriched: boolean;
        enriched_hint_count: number;
        schema: string;
        pass: boolean;
        status: string;
        status_label: string;
        reason: string;
        missing: string[];
        hints: string[];
        lazy_delegation: boolean;
        done_criteria_present: boolean;
    };
    codedNotificationSummary: {
        agent: any;
        content: string;
        structured_summary: {
            schema: string;
            rows: {
                id: string;
                agent: string;
                status: string;
                receipt_status: string;
                status_label: string;
                summary: string;
                result: string;
                gaps: string[];
            }[];
            gaps: any[];
            next_action: string;
        };
    };
    sanitizedCoordinatorSummary: string;
    documentFindings: any;
};
export declare function runWorkerContextPreDispatchGateSelfTest(): {
    pass: boolean;
    checks: {
        assignmentGateBlocksOverBudget: boolean;
        bindingLedgerPersistsGate: boolean;
        orchestratorHoldsBlockedDispatch: boolean;
    };
    gate: {
        gate_id: any;
        dispatch_ready: any;
        pressure_status: any;
        total_tokens: any;
        max_tokens: any;
        free_tokens: any;
    };
    binding: {
        binding_id: any;
        source: any;
        dispatch_ready: any;
        usage_status: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
};
export declare function runWorkerContextCompactionRetrySelfTest(): {
    pass: boolean;
    checks: {
        retryRecoveredDispatch: boolean;
        assignmentDispatchReadyAfterRetry: boolean;
        orchestratorStillDispatchesMention: boolean;
        bindingPersistsRetryProof: boolean;
    };
    retry: {
        status: any;
        from_usage_status: any;
        retry_usage_status: any;
        original_task_chars: any;
        compacted_task_chars: any;
    };
    gate: {
        dispatch_ready: any;
        auto_retry_status: any;
        pressure_status: any;
        total_tokens: any;
        max_tokens: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
};
export declare function runWorkerContextMemoryFirstCompactionRetrySelfTest(): {
    pass: boolean;
    checks: {
        memoryFirstRetryRecovered: boolean;
        taskWasNotCompacted: boolean;
        dispatchReadyAfterMemoryRetry: boolean;
        bindingPersistsMemoryRetry: boolean;
        memoryProofReinjectedCompactedMemory: boolean;
        bindingRenderProbeShowsMemoryProof: boolean;
        compactHookLedgerRecordsPreAndPost: boolean;
    };
    retry: {
        status: any;
        method: any;
        memory_first: boolean;
        from_usage_status: any;
        retry_usage_status: any;
        memory_omitted_chars: any;
        memory_reinjection_status: any;
        compact_hook_run_id: any;
    };
    hookLedger: {
        file: any;
        hook_run_id: string;
        entry_count: any;
        pre_count: any;
        post_count: any;
    };
    gate: {
        dispatch_ready: any;
        auto_retry_status: any;
        pressure_status: any;
        total_tokens: any;
        max_tokens: any;
    };
};
export declare function runWorkerContextPartialCompactionRetrySelfTest(): {
    pass: boolean;
    checks: {
        initialGateBlockedByReplayBrief: boolean;
        partialRetryRecovered: boolean;
        taskWasNotCompacted: boolean;
        replayBriefIdentifiersPreserved: boolean;
        bindingPersistsPartialCompaction: boolean;
        renderShowsPartialCompaction: boolean;
        compactHookLedgerRecordsPartialPost: any;
    };
    retry: {
        status: any;
        method: any;
        partial_compact: boolean;
        partial_compaction_schema: any;
        partial_omitted_chars: any;
        original_task_chars: any;
        compacted_task_chars: any;
    };
    hookLedger: {
        file: any;
        hook_run_id: string;
        entry_count: any;
    };
    gate: {
        dispatch_ready: any;
        auto_retry_status: any;
        total_tokens: any;
        max_tokens: any;
    };
};
export declare function runWorkerContextMetadataPartialCompactionRetrySelfTest(): {
    pass: boolean;
    checks: {
        initialGateBlockedByMetadata: any;
        metadataRetryRecovered: boolean;
        taskWasNotCompacted: boolean;
        metadataIdentifiersPreserved: any;
        bindingPersistsMetadataPartialCompaction: boolean;
        renderShowsMetadataPartialCompaction: boolean;
        compactHookLedgerRecordsMetadataPost: any;
    };
    retry: {
        status: any;
        method: any;
        partial_compact: boolean;
        partial_compaction_schema: any;
        partial_omitted_chars: any;
        original_task_chars: any;
        compacted_task_chars: any;
    };
    gate: {
        dispatch_ready: any;
        auto_retry_status: any;
        total_tokens: any;
        max_tokens: any;
    };
};
