import { type LlmTokenUsage } from "./group-orchestrator-llm-client";
export declare const COORDINATOR_PROJECT = "coordinator";
export declare const DEFAULT_GROUP_ORCHESTRATOR: {
    enabled: boolean;
    mode: string;
    coordinatorProject: string;
    maxDepth: number;
};
export declare function defaultOrchestratorConfig(): {
    enabled: boolean;
    format: string;
    apiUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
    timeoutMs: number;
    fallbackToRules: boolean;
    memoryContextPreset: string;
    modelContextWindow: number;
    modelAutoCompactTokenLimit: number;
    typedMemoryDeliveryMaxDocuments: number;
    typedMemoryDeliveryMaxBytesPerDocument: number;
    typedMemoryDeliveryMaxLinesPerDocument: number;
    typedMemoryDeliveryMaxSessionBytes: number;
    typedMemoryDeliveryMaxTokens: number;
    groupSessionRetentionDays: number;
    groupSessionMaxArchived: number;
    groupSessionAutoPruneEnabled: boolean;
    groupSessionRetentionIntervalHours: number;
    groupSessionArtifactAutoArchiveEnabled: boolean;
    groupSessionArtifactHotExecutions: number;
    groupSessionArtifactMaxHotMb: number;
    groupSessionArtifactMaxAgeDays: number;
};
export declare function loadOrchestratorConfig(): any;
export declare function saveOrchestratorConfig(updates: any): any;
export declare function publicOrchestratorConfig(config?: any): any;
export declare function testUnifiedModelConnection(): Promise<{
    success: boolean;
    checkedAt: string;
    latencyMs: number;
    provider: string;
    model: any;
    message: string;
    consumers: {
        ready: boolean;
        id: string;
        label: string;
    }[];
}>;
export declare function createCoordinatorMember(agent?: string): {
    project: string;
    role: string;
    agent: string;
};
export declare function isCoordinatorMember(member: any, group?: any): boolean;
export declare function getCoordinatorProject(group: any): string;
export declare function getCoordinatorMember(group: any): any;
export declare function normalizeGroupOrchestrator(group: any): any;
export declare function isOrchestratorEnabled(group: any): boolean;
export declare function getRoutableMembers(group: any): any;
export declare function getMemberNames(group: any, excludeProject?: string): any;
export declare function selectGroupTargets(group: any, targetProject: string | undefined | null): {
    isBroadcast: boolean;
    orchestrated: boolean;
    targetLabel: any;
    members: any;
};
export declare function resolveMemberRuntime(projectName: string, group: any, configs: any[]): {
    project: string;
    workDir: any;
    agentType: any;
    configured: boolean;
};
export declare function buildRecentGroupContext(messages: any[], fullCount?: number): string;
export declare function buildGroupCollaborationRules(memberList?: string): string;
export declare function buildCoordinatorCollaborationInstructions(memberList?: string): string;
export declare function buildMemberCollaborationInstructions(projectName: string, memberList?: string): string;
export declare function buildCoordinatorPrompt(input: {
    group: any;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    extraInstructions?: string;
    maintenanceAt?: string;
    contextId?: string;
    sessionId?: string;
}): string;
export declare function buildCoordinatorMaintenanceNotificationInstructions(groupInput: any, options?: any): {
    text: string;
    context: any;
    health: any;
    cleanup_commit_repair_context?: undefined;
} | {
    text: string;
    context: {
        schema: string;
        group_id: string;
        audience: string;
        generated_at: string;
        pending_count: any;
        current_notification_count: any;
        hidden_by_valid_receipt_count: number;
        notifications: any;
        policy: string;
        advisory_only: boolean;
        cross_group_authorization_allowed: boolean;
        notification_file: string;
        receipt_file: string;
        delivery: {
            schema: string;
            group_id: string;
            audience: string;
            context_id: string;
            consumer_session_id: string;
            recorded_count: number;
            entries: any[];
            destructive_action_authorized: boolean;
            created_task_count: number;
            created_approval_receipt_count: number;
            deleted_count: number;
        };
    };
    health: {
        schema: string;
        group_id: string;
        generated_at: string;
        pending_count: number;
        delivered_pending_count: number;
        unseen_pending_count: number;
        repeated_unseen_count: number;
        invalid_delivery_count: any;
        ledger_checksum_valid: boolean;
        previous_chain_valid: boolean;
        retention_generation: number;
        hot_delivery_entry_count: any;
        compacted_delivery_entry_count: any;
        compacted_current_delivery_count: any;
        pinned_current_notification_count: number;
        unprotected_repeated_unseen_count: number;
        retention: any;
        rows: {
            group_id: string;
            audience: any;
            notification_id: any;
            state_fingerprint: any;
            severity: any;
            action: any;
            state_observed_at: any;
            first_seen_at: any;
            last_seen_at: any;
            seen_count: number;
            age_ms: number;
            delivered: boolean;
            delivery_count: any;
            repeated_unseen: boolean;
            advisory_only: boolean;
            should_create_real_task: boolean;
        }[];
        policy: string;
        destructive_action_authorized: boolean;
        created_task_count: number;
        created_approval_receipt_count: number;
        deleted_count: number;
        file: string;
    };
    cleanup_commit_repair_context: {
        rendered: string;
        schema: string;
        group_id: string;
        audience: string;
        brief_count: any;
        briefs: any;
        assignment_binding_id: any;
        integrity_valid: boolean;
        can_claim_or_dispatch: boolean;
        can_resolve_without_receipt: boolean;
        cross_group_authorization_allowed: boolean;
        policy: string;
    };
};
export declare function buildMemberPrompt(input: {
    group: any;
    projectName: string;
    context: string;
    message: string;
    toolsContext?: string;
    sharedFilesContext?: string;
}): string;
export declare function sanitizeCoordinatorUserText(value: any, fallback?: any, maxLength?: number): string;
export declare function isExplicitExecutionRequest(message: string): boolean;
export declare function analyzeRequirement(group: any, message: string, context?: string): {
    raw: string;
    summary: string;
    intent: string;
    domains: string[];
    deliverables: string[];
    constraints: string[];
    explicitProjects: any;
    missingInfo: string[];
    needsCoordination: boolean;
    contextSignal: string;
    confidence: number;
};
export declare function runCodedGroupOrchestrator(input: {
    group: any;
    message: string;
    context?: string;
    source?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    ragCitations?: string[];
    ragScoped?: boolean;
    workerContextUsageOptions?: any;
    autoWorkerContextCompactRetry?: boolean;
    workerContextRetryOptions?: any;
    providerSwitchRequests?: any;
    provider_switch_requests?: any;
}): {
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: {
        documentFindings: string[];
        ragContext: {
            citations: string[];
            scoped: boolean;
            injected: boolean;
        };
        coordinationStrategy: string;
        constraints: string[];
        needsCoordination: boolean;
        confidence: number;
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        explicitProjects: any;
        missingInfo: string[];
        contextSignal: string;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    content: string;
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
    coordinationPlan?: undefined;
} | {
    agent: any;
    delegated: any[];
    assignments: any[];
    executionOrder: string;
    coordinationStrategy: string;
    analysis: {
        documentFindings: string[];
        ragContext: {
            citations: string[];
            scoped: boolean;
            injected: boolean;
        };
        coordinationStrategy: string;
        constraints: string[];
        needsCoordination: boolean;
        confidence: number;
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        explicitProjects: any;
        missingInfo: string[];
        contextSignal: string;
    };
    coordinationPlan: {
        mode: string;
        strategy: string;
        executionOrder: string;
        phases: string[];
        targets: any[];
        missingInfo: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    content: string;
};
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
export declare function runWorkerContextMetadataPartialCompactPolicySelfTest(): {
    pass: boolean;
    checks: {
        initialTopCategoryIsMetadataDocs: boolean;
        policySelectsOnlyDocs: any;
        partialSummaryMatchesPolicy: boolean;
        unselectedMetadataPreserved: boolean;
        taskWasNotCompacted: boolean;
        bindingAndRenderExposePolicy: boolean;
        hookRecordsPolicy: any;
    };
    retry: {
        status: any;
        method: any;
        selected_categories: any;
        skipped_categories: any;
        partial_categories: any;
    };
    gate: {
        dispatch_ready: any;
        auto_retry_status: any;
        total_tokens: any;
        max_tokens: any;
    };
};
export declare function runWorkerContextCompactOutcomeLedgerSelfTest(): {
    pass: boolean;
    checks: {
        outcomeLedgerCreated: boolean;
        outcomeBindsRetryAndHook: boolean;
        outcomeRecordsPolicyDecision: boolean;
        outcomeRecordsRecoveryDelta: boolean;
        outcomeShowsTaskPreserved: boolean;
        statsAggregateOutcome: boolean;
    };
    outcome: {
        status: any;
        method: any;
        selected_categories: any;
        token_delta: any;
        free_token_delta: any;
        task_hash_unchanged: boolean;
    };
    stats: any;
};
export declare function runWorkerContextCompactStrategyMemorySelfTest(): {
    pass: boolean;
    checks: {
        strategyMemoryCreated: boolean;
        dependencyPreferredFromOutcome: boolean;
        policyUsesStrategyMemory: boolean;
        equalPressureSelectsPreferredCategory: boolean;
        workerPacketRendersStrategyMemory: boolean;
    };
    strategy: {
        preferred_categories: any;
        avoid_categories: any;
        sample_count: number;
        categories: any;
    };
    policy: {
        method: string;
        selected_categories: any;
        compact_strategy_memory: {
            schema: string;
            strategy_id: string;
            source_ledger_file: string;
            sample_count: number;
            preferred_categories: any;
            avoid_categories: any;
        };
    };
};
export declare function runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest(): {
    pass: boolean;
    checks: {
        strategyMemoryPrefersDependencies: boolean;
        baselineStillFollowsTokenPressure: boolean;
        usageLedgerPromotesCompactStrategyMemory: boolean;
        pressureUsageFeedbackChangesPolicy: boolean;
        renderedShowsPressureUsageBias: boolean;
    };
    baselinePolicy: {
        method: string;
        selected_categories: any;
    };
    biasedPolicy: {
        method: string;
        selected_categories: any;
        pressure_recall_usage_strategy_bias: {
            schema: string;
            active: boolean;
            reason: string;
            category_adjustment_cap: number;
            summary_source: any;
            source_group_count: number;
            suppressed?: undefined;
            stale?: undefined;
            rel_path?: undefined;
            recommendation?: undefined;
            weighted_used_count?: undefined;
            weighted_verified_count?: undefined;
            weighted_ignored_count?: undefined;
            weighted_mentioned_count?: undefined;
            weighted_total_count?: undefined;
            stale_count?: undefined;
            fresh_count?: undefined;
            avg_decay_weight?: undefined;
            trust_score?: undefined;
            summary_ledger_file?: undefined;
            source_groups?: undefined;
        } | {
            schema: string;
            active: boolean;
            suppressed: boolean;
            stale: boolean;
            rel_path: any;
            recommendation: string;
            weighted_used_count: number;
            weighted_verified_count: number;
            weighted_ignored_count: number;
            weighted_mentioned_count: number;
            weighted_total_count: number;
            stale_count: number;
            fresh_count: number;
            avg_decay_weight: number;
            trust_score: number;
            category_adjustment_cap: number;
            reason: string;
            summary_ledger_file: any;
            summary_source: any;
            source_group_count: number;
            source_groups: any;
        };
        candidates: any;
    };
    usageSummary: {
        weighted_totals: any;
        aging: any;
    };
};
export declare function runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest(): {
    pass: boolean;
    checks: {
        targetHasNoLocalUsageLedger: boolean;
        strategyMemoryStillPrefersDependencies: boolean;
        baselineStillFollowsTokenPressure: boolean;
        sourceLedgerFeedsCrossGroupSummary: boolean;
        crossGroupUsageChangesPolicy: boolean;
        targetProjectIsolationBlocksWrongProjectStrategyBias: boolean;
    };
    crossGroupSummary: {
        source_group_count: number;
        entry_count: number;
        weighted_totals: any;
    };
    baselinePolicy: {
        method: string;
        selected_categories: any;
    };
    crossBiasedPolicy: {
        method: string;
        selected_categories: any;
        pressure_recall_usage_strategy_bias: {
            schema: string;
            active: boolean;
            reason: string;
            category_adjustment_cap: number;
            summary_source: any;
            source_group_count: number;
            suppressed?: undefined;
            stale?: undefined;
            rel_path?: undefined;
            recommendation?: undefined;
            weighted_used_count?: undefined;
            weighted_verified_count?: undefined;
            weighted_ignored_count?: undefined;
            weighted_mentioned_count?: undefined;
            weighted_total_count?: undefined;
            stale_count?: undefined;
            fresh_count?: undefined;
            avg_decay_weight?: undefined;
            trust_score?: undefined;
            summary_ledger_file?: undefined;
            source_groups?: undefined;
        } | {
            schema: string;
            active: boolean;
            suppressed: boolean;
            stale: boolean;
            rel_path: any;
            recommendation: string;
            weighted_used_count: number;
            weighted_verified_count: number;
            weighted_ignored_count: number;
            weighted_mentioned_count: number;
            weighted_total_count: number;
            stale_count: number;
            fresh_count: number;
            avg_decay_weight: number;
            trust_score: number;
            category_adjustment_cap: number;
            reason: string;
            summary_ledger_file: any;
            summary_source: any;
            source_group_count: number;
            source_groups: any;
        };
        pressure_recall_usage_summary: {
            schema: any;
            source: any;
            ledger_file: any;
            target_project: any;
            source_group_count: number;
            source_groups: any;
            weighted_totals: any;
            aging: {
                stale_entry_count: any;
                fresh_entry_count: any;
                stale_memory_count: any;
            };
        };
        candidates: any;
    };
    wrongProjectPolicy: {
        method: string;
        selected_categories: any;
    };
};
export declare function runWorkerContextPtlEmergencyDowngradeSelfTest(): {
    pass: boolean;
    checks: {
        ptlHintEngaged: boolean;
        retryUsesPtlHint: boolean;
        taskCompactedWithEmergencyBudget: boolean;
        renderedExposesPtlDowngrade: boolean;
        outcomeCarriesPtlHint: boolean;
    };
    ptlHint: {
        engaged: boolean;
        emergency_level: string;
        blocked_outcome_count: number;
        repeated_failed_categories: any;
    };
    retry: {
        status: any;
        method: any;
        original_task_chars: any;
        compacted_task_chars: any;
        ptl_emergency_level: any;
    };
};
export declare function runWorkerContextCompletionMemoryCompactionPreservationSelfTest(): {
    pass: boolean;
    checks: {
        allStrategiesCarryVerifiedPreservation: boolean;
        exactCompletionIdentitySurvivesAllStrategies: boolean;
        exactConflictResolutionIdentitySurvivesAllStrategies: boolean;
        resolvedAndReopenedStatesSurviveCorrectStrategies: boolean;
        currentAndHistoricalSessionBoundarySurvives: boolean;
        memoryFirstReinjectsCompactedMemoryWithContract: any;
        replayAndMetadataPartialCompactPreserveContract: boolean;
        ptlEmergencyPreservesContract: any;
        compactOutcomeLedgerCarriesProof: boolean;
        tamperedCompactPacketIsRejected: boolean;
    };
    scenarios: {
        kind: string;
        retry_status: any;
        retry_method: any;
        dispatch_ready: boolean;
        initial_total_tokens: any;
        retry_total_tokens: any;
        max_tokens: any;
        retry_free_tokens: any;
        preservation_required: boolean;
        preservation_preserved: boolean;
        conflict_resolution_present: boolean;
        conflict_resolution_active: boolean;
        conflict_resolution_reopened: boolean;
        conflict_resolution_entry_id: any;
        conflict_resolution_state: any;
        conflict_resolution_usage_state: any;
        conflict_resolution_doc_rel_paths: any;
        conflict_resolution_task_agent_session_id: any;
        conflict_resolution_native_session_id: any;
        conflict_resolution_reversible: boolean;
        conflict_resolution_historical_branches_preserved: boolean;
        conflict_resolution_reverification_acceptance_required: boolean;
        conflict_resolution_reversible_acceptance_required: boolean;
        conflict_verification_acceptance_required: boolean;
        ptl_emergency_engaged: boolean;
        outcome_preserved: boolean;
    }[];
    tampered: {
        gaps: string[];
        dispatch_ready: boolean;
    };
};
export declare function runWorkerContextIgnoreMemoryPolicySelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesIgnorePolicy: boolean;
        proofMarksIgnoredByPolicy: boolean;
        usageCategorizesPolicy: boolean;
        renderedRequiresMemoryIgnoredReceipt: boolean;
        bindingPersistsIgnorePolicy: boolean;
    };
    memoryPolicy: any;
    proof: {
        status: any;
        memory_ignored: boolean;
    };
    binding: {
        memory_policy_ignored: boolean;
        render_probe_ignored: boolean;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchGateSelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesProviderAdvisory: boolean;
        usageCategorizesProviderAdvisory: boolean;
        gateBlocksProviderHold: boolean;
        renderedShowsProviderAdvisory: boolean;
        bindingPersistsProviderAdvisory: boolean;
        recoveryDisarmsProviderHold: boolean;
    };
    gate: {
        dispatch_ready: boolean;
        provider_dispatch_hold: boolean;
        repair_source: string;
        reason: string;
    };
    advisory: {
        health_status: any;
        dispatch_policy: any;
        should_hold_dispatch: boolean;
    };
    recovered: {
        dispatch_ready: boolean;
        provider_dispatch_hold: boolean;
        health_status: any;
        dispatch_policy: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest(): {
    pass: boolean;
    checks: {
        repairedHistoryFeedsProviderAdvisory: boolean;
        repairedHistoryAllowsSamplingNotHold: boolean;
        preDispatchGateCarriesRepairedHistory: any;
        activeRelapseStillWinsOverHistory: boolean;
        holdDecisionStillRequiresRepair: boolean;
    };
    repaired: {
        health_status: any;
        dispatch_policy: any;
        provider_override_followup_repaired: boolean;
        action: string;
        dispatch_ready: boolean;
    };
    relapsed: {
        health_status: any;
        dispatch_policy: any;
        provider_override_followup_repaired: boolean;
        provider_override_followup_fresh_after_last_violation: boolean;
        action: string;
        dispatch_ready: boolean;
    };
};
export declare function runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest(): {
    pass: boolean;
    checks: {
        invalidReceiptFailsContract: boolean;
        validReceiptPassesContract: boolean;
        ledgerPersistsFinalValidation: boolean;
        ledgerCountersTrackValidation: boolean;
    };
    invalid: {
        status: string;
        gaps: any[];
    };
    valid: {
        status: string;
        contract_satisfied: boolean;
        covered_rel_path_count: number;
        covered_followup_work_item_count: number;
        covered_override_id_count: number;
    };
};
export declare function runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest(): {
    pass: boolean;
    checks: {
        everyAttemptIsArchived: boolean;
        typedFeedbackDocumentWritten: any;
        repeatedFailuresEscalatePolicy: boolean;
        repeatedFailuresBlockDispatch: boolean;
        verifiedRepairClearsOnlyActiveStreak: boolean;
        repairedProviderReturnsToSampling: boolean;
        repairedPacketCarriesSamplingContract: boolean;
    };
    archive: {
        attempt_count: any;
        failed_count: any;
        passed_count: any;
        consecutive_failure_count: any;
        repair_verified: boolean;
    };
    escalated: {
        action: string;
        health_status: any;
        dispatch_policy: any;
        dispatch_ready: boolean;
    };
    repaired: {
        action: string;
        health_status: any;
        dispatch_policy: any;
        dispatch_ready: boolean;
    };
};
export declare function runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest(): {
    pass: boolean;
    checks: {
        recentEvidenceOutweighsOldRepairedHistory: boolean;
        crossGroupSignalIsActionableAndDecayed: boolean;
        privacyBoundaryRemovesGroupContent: boolean;
        crossGroupGuidanceOnlyAddsSampling: boolean;
        explicitPolicyDisableSuppressesCrossGuidance: boolean;
        workerPacketCarriesOnlySanitizedGuidance: boolean;
        localPolicyRemainsAuthoritative: boolean;
    };
    oldRepaired: {
        risk_status: any;
        risk_score: any;
        weighted_failure_score: any;
    };
    recentFailure: {
        risk_status: any;
        risk_score: any;
        weighted_failure_score: any;
    };
    cross: {
        risk_status: any;
        source_group_count: any;
        action: string;
        dispatch_policy: any;
        dispatch_ready: boolean;
    };
    local: {
        action: string;
        dispatch_policy: any;
        dispatch_ready: boolean;
    };
};
export declare function runWorkerContextProviderReliabilitySnapshotRankingSelfTest(): {
    pass: boolean;
    checks: {
        snapshotIsFreshAndChecksummed: boolean;
        expiredSnapshotIsRejected: any;
        tamperedSnapshotIsRejected: any;
        sourceGenerationChangeInvalidatesSnapshot: boolean;
        staleSnapshotRefreshesToFreshGeneration: boolean;
        onlyExplicitSameProjectCandidateIsRanked: boolean;
        rankingDoesNotAutoSwitchCurrentAssignment: boolean;
        localHoldRemainsAuthoritativeWithAlternative: boolean;
        workerPacketRendersSnapshotAndAlternative: boolean;
    };
    snapshot: {
        snapshot_id: any;
        status: any;
        expires_at: any;
        generation_id: any;
    };
    ranking: {
        selected: any;
        alternatives: any;
        dispatch_ready: boolean;
    };
    local: {
        selected: any;
        alternative_count: any;
        dispatch_ready: boolean;
    };
};
export declare function runWorkerContextProviderSwitchExecutionRankingSelfTest(): {
    pass: boolean;
    checks: {
        policyCarriesDecayedExecutionRisk: boolean;
        policyCarriesTypedMemoryProvenance: any;
        rankingUsesExecutionDecayForSaferAlternative: boolean;
        advisoryCarriesCompactSafeRankingProvenance: any;
        equallyRecentMismatchIsNotPreferred: boolean;
        rankingDoesNotAutoSwitchCurrentAssignment: boolean;
        renderedPacketShowsRankingProvenance: boolean;
        switchReceiptPreservesRankingProvenance: boolean;
        compactRetryPreservesProviderRankingProvenance: boolean;
        compactOutcomeLedgerCarriesProviderRankingProvenance: boolean;
        compactRenderedPacketStillShowsRankingProvenance: boolean;
    };
    selected: {
        agent_type: any;
        composite_rank: any;
        local_execution_rank_penalty: any;
        weighted_risk_score: any;
    };
    alternatives: any;
    rankedCandidates: any;
    decision: {
        action: string;
        selected_provider: string;
        dispatch_ready: boolean;
    };
    switchReceipt: {
        valid: boolean;
        status: any;
        requested_provider: any;
        provenance: any;
    };
    compactRetry: {
        status: any;
        method: any;
        dispatch_ready: boolean;
        gate_reason: any;
        pressure_status: any;
        provider_dispatch_hold: boolean;
        total_tokens: any;
        max_tokens: any;
        free_tokens: any;
        provider_ranking_provenance_required: boolean;
        provider_ranking_provenance_preserved: boolean;
        outcome_provider_ranking_provenance_preserved: boolean;
    };
};
export declare function runWorkerContextProviderSwitchDecisionReceiptSelfTest(): {
    pass: boolean;
    checks: {
        validSwitchIsApprovedAndChecksummed: boolean;
        expiredSnapshotRejectsReceipt: boolean;
        tamperedReceiptIsRejected: boolean;
        staleSourceGenerationRejectsReceipt: boolean;
        projectAndGroupMismatchAreRejected: boolean;
        unconfiguredCandidateIsRejected: boolean;
        compatibilityEvidenceIsRequired: boolean;
        localAuthorityIsRequired: boolean;
        heldProviderNeedsExplicitSwitchPermission: boolean;
        sessionBindingRejectsWrongProjectThenBindsActualSession: boolean;
        matchedExecutionIsSystemAttested: boolean;
        runtimeFallbackMismatchIsNotDisguisedAsApprovedExecution: boolean;
        ledgerSeparatesAdvisedApprovedAndExecutedStates: boolean;
        compactRetryPreservesDecisionReceipt: boolean;
        providerSwitchExecutionDistillsToTypedMemory: boolean;
        providerSwitchExecutionTypedMemoryIsRecallable: boolean;
        providerSwitchExecutionPolicySeesMismatchHistory: boolean;
    };
    receipt: {
        receipt_id: any;
        status: any;
        snapshot_id: any;
        old_provider: any;
        new_provider: any;
    };
    sessionBinding: {
        schema: string;
        binding_id: string;
        provider_switch_decision_receipt_id: any;
        provider_switch_decision_receipt_checksum: any;
        groupId: string;
        project: any;
        expected_provider: string;
        session_provider: string;
        task_agent_session_id: string;
        native_session_id: string;
        execution_id: any;
        worker_context_packet_id: any;
        status: string;
        valid: boolean;
        gaps: string[];
        validation: {
            schema: string;
            valid: boolean;
            status: string;
            gaps: string[];
            snapshot_status: any;
            checked_at: string;
        };
        bound_at: string;
    };
    matchedExecution: {
        typed_memory_distillation: any;
        schema: string;
        execution_receipt_id: string;
        provider_switch_decision_receipt_id: any;
        provider_switch_decision_receipt_checksum: any;
        groupId: string;
        project: any;
        advised_alternative: boolean;
        approved_switch: boolean;
        expected_provider: string;
        actually_executed_provider: string;
        task_agent_session_id: string;
        native_session_id: string;
        execution_id: string;
        worker_context_packet_id: any;
        receipt_status: string;
        system_attested: boolean;
        child_declared: boolean;
        child_declaration: {
            decision_receipt_id: string;
            expected_provider: string;
            executed_provider: string;
            task_agent_session_id: string;
            native_session_id: string;
            execution_id: string;
            usage_state: string;
        };
        status: string;
        executed_as_approved: boolean;
        gaps: string[];
        final_child_receipt_present: boolean;
        at: string;
    };
    mismatchedExecution: {
        typed_memory_distillation: any;
        schema: string;
        execution_receipt_id: string;
        provider_switch_decision_receipt_id: any;
        provider_switch_decision_receipt_checksum: any;
        groupId: string;
        project: any;
        advised_alternative: boolean;
        approved_switch: boolean;
        expected_provider: string;
        actually_executed_provider: string;
        task_agent_session_id: string;
        native_session_id: string;
        execution_id: string;
        worker_context_packet_id: any;
        receipt_status: string;
        system_attested: boolean;
        child_declared: boolean;
        child_declaration: {
            decision_receipt_id: string;
            expected_provider: string;
            executed_provider: string;
            task_agent_session_id: string;
            native_session_id: string;
            execution_id: string;
            usage_state: string;
        };
        status: string;
        executed_as_approved: boolean;
        gaps: string[];
        final_child_receipt_present: boolean;
        at: string;
    };
    ledger: {
        providerSwitchAdvisedCount: any;
        providerSwitchApprovedCount: any;
        providerSwitchSessionBoundCount: any;
        providerSwitchExecutedCount: any;
        providerSwitchExecutionPassedCount: any;
        providerSwitchExecutionFailedCount: any;
    };
    typedMemory: {
        archiveSchema: any;
        executedCount: any;
        passedCount: any;
        failedCount: any;
        mismatchCount: any;
        recallCount: any;
        policyAction: string;
    };
    compactRetry: {
        status: any;
        receipt_id: any;
        usage_status: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest(): {
    pass: boolean;
    checks: {
        activeAssignmentStoresDecision: boolean;
        activeDecisionHoldsCriticalProvider: boolean;
        activeNeedsPressureRepair: any;
        bindingLedgerPersistsDecision: boolean;
        recoveredDecisionAllowsReceiptSampling: boolean;
        ledgerCountersTrackProviderDecisions: boolean;
    };
    active: {
        action: any;
        dispatch_ready: any;
        provider_dispatch_hold: any;
        health_status: any;
        reason: any;
    };
    recovered: {
        action: any;
        dispatch_ready: any;
        requires_receipt_sampling: boolean;
        health_status: any;
    };
    ledger: {
        providerDispatchDecisionCount: any;
        providerDispatchHoldDecisionCount: any;
        providerDispatchReadyDecisionCount: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest(): {
    pass: boolean;
    checks: {
        invalidOverrideDoesNotBypassHold: boolean;
        validOverrideDispatchesOnce: boolean;
        validDecisionCarriesOverrideReceipt: boolean;
        bindingLedgerPersistsOverride: boolean;
        ledgerCountersTrackOverride: boolean;
    };
    invalid: {
        action: any;
        dispatch_ready: any;
        override_valid: boolean;
        gaps: any;
    };
    valid: {
        action: any;
        dispatch_ready: any;
        override_valid: boolean;
        next_step: any;
    };
    ledger: {
        providerDispatchDecisionCount: any;
        providerDispatchHoldDecisionCount: any;
        providerDispatchOverrideDecisionCount: any;
    };
};
export declare function runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest(): {
    pass: boolean;
    checks: {
        overrideDispatchCreatesFollowupWorkItem: boolean;
        completionRequiresVerifiedMemoryProvenanceUsage: boolean;
        bindingLedgerPersistsCompletion: boolean;
        followupRepairWorkItemClosed: boolean;
    };
    followup: {
        work_item_id: any;
        before_status: string;
        after_status: string;
    };
    completion: {
        status: any;
        completion_ok: boolean;
        memory_provenance_usage_count: any;
        current_source_verified_count: any;
    };
    ledger: {
        providerDispatchOverrideCompletionCount: any;
    };
};
export declare function buildCodedCoordinatorSummary(group: any, outputs: string[]): {
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
export declare function runLlmCoordinatorSummary(group: any, userMessage: string, outputs: string[]): Promise<{
    agent: any;
    content: string;
}>;
export declare function runLlmCoordinatorReview(group: any, userMessage: string, coordinatorPlan: string, outputs: string[], options?: {
    allowFollowUps?: boolean;
    round?: number;
    maxRounds?: number;
    requiresCodeChanges?: boolean;
    requiresVerification?: boolean;
    traceId?: string;
    taskId?: string;
    executionId?: string;
}): Promise<{
    agent: any;
    status: string;
    followUps: any;
    gaps: string[];
    conflicts: string[];
    content: string;
    confidence: any;
    structured_review: {
        schema_version: number;
        verdict: string;
        decision: {
            can_complete: boolean;
            reason: string;
        };
        summary: string;
        checks: any;
        worker_reviews: any;
        follow_ups: any;
        gaps: string[];
        conflicts: string[];
        user_question: string;
        confidence: any;
    };
}>;
export declare function decomposeRequirementWithCodedCoordinator(group: any, requirement: string): any;
export declare function readWorkerContextCompactHookLedgerForCoordinator(groupId: string): any;
export declare function readWorkerContextCompactStrategyMemoryForCoordinator(groupId: string): {
    schema: string;
    version: number;
    strategy_id: string;
    groupId: string;
    file: string;
    source_ledger_file: string;
    source_ledger_updated_at: string;
    sample_count: number;
    category_count: number;
    preferred_categories: any;
    avoid_categories: any;
    categories: any;
    generated_at: string;
    updatedAt: string;
};
export declare function readWorkerContextPtlEmergencyHintForCoordinator(groupId: string): {
    schema: string;
    version: number;
    hint_id: string;
    groupId: string;
    file: string;
    engaged: boolean;
    emergency_level: string;
    reason: string;
    blocked_outcome_count: number;
    task_compacted_blocked_count: number;
    repeated_failed_categories: any;
    source_ledger_file: string;
    source_strategy_file: string;
    recommended_retry_options: {
        memory: any;
        replayRepairDispatchBriefs: any;
        metadata: any;
        maxTaskChars: number;
    };
    generated_at: string;
    updatedAt: string;
};
export declare function readWorkerContextCompactOutcomeLedgerForCoordinator(groupId: string): any;
export declare function compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId: string, options?: any): any;
export declare function buildWorkerContextPacketForAssignment(baseAssignment: any, dependsOn: string, replayRepairDispatchBriefs: any[], options?: any): any;
export declare function validateProviderSwitchDecisionReceiptForCoordinator(receipt?: any, options?: any): {
    schema: string;
    valid: boolean;
    status: string;
    gaps: string[];
    snapshot_status: any;
    checked_at: string;
};
export declare function buildProviderSwitchDecisionReceiptForCoordinator(groupId: string, assignment?: any, requestValue?: any, options?: any): any;
export declare function readReplayRepairDispatchPlanLedgerForCoordinator(groupId: string): any;
export declare function readReplayRepairDispatchBindingLedgerForCoordinator(groupId: string): any;
export declare function recordWorkerContextPacketAssignmentBindingForCoordinator(groupId: string, assignment?: any, options?: any): any;
export declare function recordWorkerContextProviderSwitchSessionBindingForCoordinator(groupId: string, input?: any, options?: any): {
    schema: string;
    binding_id: string;
    provider_switch_decision_receipt_id: any;
    provider_switch_decision_receipt_checksum: any;
    groupId: string;
    project: any;
    expected_provider: string;
    session_provider: string;
    task_agent_session_id: string;
    native_session_id: string;
    execution_id: any;
    worker_context_packet_id: any;
    status: string;
    valid: boolean;
    gaps: string[];
    validation: {
        schema: string;
        valid: boolean;
        status: string;
        gaps: string[];
        snapshot_status: any;
        checked_at: string;
    };
    bound_at: string;
};
export declare function recordWorkerContextProviderSwitchExecutionReceiptForCoordinator(groupId: string, input?: any, options?: any): {
    typed_memory_distillation: any;
    schema: string;
    execution_receipt_id: string;
    provider_switch_decision_receipt_id: any;
    provider_switch_decision_receipt_checksum: any;
    groupId: string;
    project: any;
    advised_alternative: boolean;
    approved_switch: boolean;
    expected_provider: string;
    actually_executed_provider: string;
    task_agent_session_id: string;
    native_session_id: string;
    execution_id: string;
    worker_context_packet_id: any;
    receipt_status: string;
    system_attested: boolean;
    child_declared: boolean;
    child_declaration: {
        decision_receipt_id: string;
        expected_provider: string;
        executed_provider: string;
        task_agent_session_id: string;
        native_session_id: string;
        execution_id: string;
        usage_state: string;
    };
    status: string;
    executed_as_approved: boolean;
    gaps: string[];
    final_child_receipt_present: boolean;
    at: string;
};
export declare function recordWorkerContextProviderDispatchOverrideCompletionForCoordinator(groupId: string, input?: any, options?: any): any;
export declare function readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId: string): any;
export declare function recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(groupId: string, input?: any, options?: any): {
    typed_memory_distillation: {
        schema: any;
        archived_count: number;
        attempt_count: number;
        failed_count: number;
        passed_count: number;
        attribution_count: number;
        write_count: number;
        ledger_file: any;
    };
    typed_memory_distillation_error: string;
    repair_work_item: {
        schema: string;
        work_item_id: string;
        status: any;
        file: any;
        source: any;
    };
    repair_work_item_id: string;
    repair_work_item_status: any;
    schema: string;
    validation_id: string;
    groupId: any;
    project: any;
    agent_type: any;
    binding_id: any;
    assignment_id: any;
    dispatch_key: any;
    worker_context_packet_id: any;
    task_id: any;
    worker_handoff_id: any;
    task_agent_session_id: any;
    native_session_id: any;
    execution_id: any;
    receipt_status: string;
    receipt: any;
    contract: any;
    contract_required: boolean;
    contract_satisfied: boolean;
    status: string;
    memory_provenance_usage_count: number;
    provider_override_followup_reverified_row_count: number;
    current_source_verified_count: number;
    contract_row_count: number;
    required_rel_path_count: number;
    covered_rel_path_count: number;
    required_followup_work_item_count: number;
    covered_followup_work_item_count: number;
    required_override_id_count: number;
    covered_override_id_count: number;
    gaps: any[];
    reason: string;
    at: string;
};
export declare function recordReplayRepairDispatchBriefTimelineBinding(groupId: string, input?: any, options?: any): any;
export declare function recordReplayRepairDispatchBriefAssignmentBinding(groupId: string, assignment?: any, match?: any, options?: any): {
    schema: string;
    binding_id: string;
    groupId: string;
    brief_id: any;
    work_item_id: any;
    source: any;
    component: any;
    project: any;
    assignment_id: any;
    dispatch_key: any;
    task_fingerprint: any;
    worker_context_packet_id: any;
    source_worker_context_packet_id: any;
    source_worker_context_packet_binding_id: any;
    source_worker_context_packet_memory_policy_reason: any;
    reinjection_gate_id: any;
    post_compact_candidate_id: any;
    post_compact_candidate_kind: any;
    post_compact_candidate_value: any;
    post_compact_candidate_source_message_id: any;
    original_worker_context_packet_id: any;
    original_binding_id: any;
    original_assignment_id: any;
    original_dispatch_key: any;
    original_task_agent_session_id: any;
    original_native_session_id: any;
    post_compact_receipt_memory_required_doc_rel_paths: any;
    worker_context_packet_context_usage: any;
    worker_context_packet_acceptance: any;
    post_compact_reinjection_repair_receipt_memory_contract: any;
    worker_context_packet_post_compact_reinjection_repair_receipt_memory_contract: any;
    provider_ranking_compact_repair_receipt_memory_contract: any;
    worker_context_provider_dispatch_decision: any;
    worker_context_provider_dispatch_override_receipt: any;
    proof_entry_id: any;
    request_patch_checksum: any;
    provider_reproof_status: any;
    provider_reproof_reason: any;
    reproof_candidate_id: any;
    timeline_binding_id: any;
    original_work_item_id: any;
    request_telemetry_session_status: any;
    request_telemetry_dispatch_status: any;
    runner_request_id: any;
    execution_id: any;
    should_create_real_task: boolean;
    worker_context_packet_replay_briefs: any;
    worker_context_packet_render_probe: {
        packet_id: any;
        replay_repair_dispatch_brief_count: any;
        matching_brief: any;
        rendered_flags: {
            has_brief_id: boolean;
            has_work_item_id: boolean;
            has_source: boolean;
            has_component: boolean;
            has_reinjection_gate_id: boolean;
            has_post_compact_candidate_id: boolean;
            has_post_compact_candidate_kind: boolean;
            has_post_compact_candidate_value: boolean;
            has_post_compact_candidate_source_message_id: boolean;
            has_proof_entry_id: boolean;
            has_request_patch_checksum: boolean;
            has_provider_reproof_status: boolean;
            has_provider_reproof_reason: boolean;
            has_reproof_candidate_id: boolean;
            has_timeline_binding_id: boolean;
            has_original_work_item_id: boolean;
            has_request_telemetry_session_status: boolean;
            has_request_telemetry_dispatch_status: boolean;
            has_runner_request_id: boolean;
            has_execution_id: boolean;
            has_should_create_real_task_false: boolean;
            has_context_usage_budget: boolean;
            has_platform_memory: boolean;
            has_memory_reinjection_proof: boolean;
            has_memory_compaction_hash: boolean;
        };
        rendered_excerpt: string;
    };
    match_score: number;
    matched_by: any;
    at: string;
};
export declare function buildReplayRepairDispatchBriefForCoordinator(groupId: string, candidate?: any, index?: number, existing?: any, at?: string): {
    schema: string;
    brief_id: string;
    groupId: string;
    status: string;
    should_create_real_task: boolean;
    source_candidate_id: any;
    work_item_id: string;
    source: any;
    priority: any;
    component: any;
    target_project: string;
    dispatch_target: any;
    recommended_action: any;
    proof_entry_id: any;
    plan_checksum: any;
    request_patch_checksum: any;
    revalidation_gate_id: string;
    read_plan_id: string;
    reference_id: string;
    reinjection_gate_id: string;
    post_compact_candidate_id: string;
    post_compact_candidate_kind: string;
    post_compact_candidate_value: string;
    post_compact_candidate_source_message_id: string;
    expected_task_agent_session_id: string;
    expected_native_session_id: string;
    receipt_task_agent_session_id: string;
    receipt_native_session_id: string;
    session_mismatch: boolean;
    worker_context_packet_id: any;
    worker_context_packet_binding_id: any;
    worker_context_packet_memory_policy_reason: any;
    binding_id: any;
    assignment_id: any;
    dispatch_key: any;
    pressure_memory_provenance_gap_codes: any;
    pressure_memory_provenance_repair_work_item_ids: any;
    pressure_memory_provenance_rel_paths: any;
    provider_override_followup_contract_validation_id: any;
    provider_override_followup_contract_rel_paths: any;
    provider_override_followup_contract_work_item_ids: any;
    provider_override_followup_contract_override_ids: any;
    provider_override_followup_contract_gap_codes: any;
    provider_switch_decision_receipt_id: any;
    provider_switch_decision_receipt_checksum: any;
    provider_ranking_provenance_gap_codes: any;
    provider_ranking_provenance_rel_paths: any;
    provider_ranking_provenance_row_ids: any;
    provider_ranking_provenance_missing_rel_paths: any;
    provider_ranking_provenance_missing_row_ids: any;
    provider_ranking_memory_receipt_required_doc_rel_paths: string[];
    provider_ranking_memory_receipt_missing_doc_rel_paths: any;
    provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths: any;
    post_compact_receipt_memory_gap_codes: string[];
    post_compact_receipt_memory_required_doc_rel_paths: string[];
    post_compact_receipt_memory_missing_doc_rel_paths: string[];
    post_compact_receipt_memory_missing_current_source_verified_doc_rel_paths: string[];
    post_compact_receipt_memory_missing_ignored_reason_doc_rel_paths: string[];
    completion_preservation_gap_codes: string[];
    completion_preservation_completion_doc_rel_paths: string[];
    completion_preservation_required_doc_rel_paths: string[];
    completion_preservation_work_item_ids: string[];
    completion_preservation_timeline_binding_ids: string[];
    completion_preservation_historical_task_agent_session_ids: string[];
    completion_preservation_historical_native_session_ids: string[];
    completion_preservation_current_session_binding_id: any;
    completion_preservation_current_task_agent_session_id: any;
    completion_preservation_current_native_session_id: any;
    completion_preservation_conflict_resolution_present: boolean;
    completion_preservation_conflict_resolution_doc_rel_paths: string[];
    completion_preservation_conflict_resolution_entry_id: any;
    completion_preservation_conflict_resolution_state: any;
    completion_preservation_conflict_resolution_usage_state: any;
    completion_preservation_conflict_resolution_task_agent_session_id: any;
    completion_preservation_conflict_resolution_native_session_id: any;
    completion_preservation_conflict_resolution_active: boolean;
    completion_preservation_conflict_resolution_reopened: boolean;
    completion_preservation_conflict_resolution_reversible: boolean;
    completion_preservation_conflict_resolution_historical_branches_preserved: boolean;
    completion_preservation_conflict_resolution_reverification_acceptance_required: boolean;
    completion_preservation_conflict_resolution_reversible_acceptance_required: boolean;
    completion_preservation_conflict_verification_acceptance_required: boolean;
    corrected_compact_outcome_id: any;
    corrected_compact_retry_id: any;
    corrected_compact_hook_run_id: any;
    original_worker_context_packet_id: any;
    original_binding_id: any;
    original_assignment_id: any;
    original_dispatch_key: any;
    original_task_agent_session_id: any;
    original_native_session_id: any;
    compact_outcome_id: any;
    compact_retry_id: any;
    compact_hook_run_id: any;
    provider_reproof_status: any;
    provider_reproof_reason: any;
    reproof_candidate_id: any;
    timeline_binding_id: any;
    original_work_item_id: any;
    request_telemetry_status: any;
    request_telemetry_source: any;
    request_telemetry_session_status: any;
    request_telemetry_dispatch_status: any;
    runner_request_id: any;
    execution_id: any;
    worker_task: string;
    verification: string[];
    createdAt: any;
    updatedAt: string;
};
export declare function syncReplayRepairDispatchPlansForCoordinator(groupId: string, summaryInput?: any, options?: any): any;
export declare function isStructuredCoordinatorFallbackAllowed(input: {
    source?: string;
    message?: string;
}): boolean;
export type GroupOrchestratorInput = {
    group: any;
    message: string;
    context?: string;
    source?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    ragCitations?: string[];
    ragScoped?: boolean;
    extraInstructions?: string;
    providerSwitchRequests?: any;
    provider_switch_requests?: any;
    contextId?: string;
    context_id?: string;
    sessionId?: string;
    session_id?: string;
    traceId?: string;
    trace_id?: string;
    taskId?: string;
    task_id?: string;
    executionId?: string;
    execution_id?: string;
};
export declare function runGroupOrchestrator(input: GroupOrchestratorInput): Promise<{
    usage: LlmTokenUsage;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    coordinationPlan?: undefined;
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
} | {
    usage: LlmTokenUsage;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    coordinationPlan: {
        mode: string;
        strategy: string;
        executionOrder: string;
        phases: string[];
        targets: any[];
        missingInfo: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    executionOrder: string;
    coordinationStrategy: string;
    content: string;
} | {
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: {
        documentFindings: string[];
        ragContext: {
            citations: string[];
            scoped: boolean;
            injected: boolean;
        };
        coordinationStrategy: string;
        constraints: string[];
        needsCoordination: boolean;
        confidence: number;
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        explicitProjects: any;
        missingInfo: string[];
        contextSignal: string;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
    coordinationPlan?: undefined;
    usage?: undefined;
} | {
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    agent: any;
    delegated: any[];
    assignments: any[];
    executionOrder: string;
    coordinationStrategy: string;
    analysis: {
        documentFindings: string[];
        ragContext: {
            citations: string[];
            scoped: boolean;
            injected: boolean;
        };
        coordinationStrategy: string;
        constraints: string[];
        needsCoordination: boolean;
        confidence: number;
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        explicitProjects: any;
        missingInfo: string[];
        contextSignal: string;
    };
    coordinationPlan: {
        mode: string;
        strategy: string;
        executionOrder: string;
        phases: string[];
        targets: any[];
        missingInfo: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    usage?: undefined;
} | {
    agent: any;
    delegated: any[];
    assignments: any[];
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    usage?: undefined;
} | {
    usage: LlmTokenUsage;
    contextRecovery: {
        type: string;
        originalChars: number;
        recoveredChars: number;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    coordinationPlan?: undefined;
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
} | {
    usage: LlmTokenUsage;
    contextRecovery: {
        type: string;
        originalChars: number;
        recoveredChars: number;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    coordinationPlan: {
        mode: string;
        strategy: string;
        executionOrder: string;
        phases: string[];
        targets: any[];
        missingInfo: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    runtime: string;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    executionOrder: string;
    coordinationStrategy: string;
    content: string;
} | {
    runtime: string;
    usage: any;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: {
        documentFindings: string[];
        ragContext: {
            citations: string[];
            scoped: boolean;
            injected: boolean;
        };
        coordinationStrategy: string;
        constraints: string[];
        needsCoordination: boolean;
        confidence: number;
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        explicitProjects: any;
        missingInfo: string[];
        contextSignal: string;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
    coordinationPlan?: undefined;
} | {
    runtime: string;
    usage: any;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
    agent: any;
    delegated: any[];
    assignments: any[];
    executionOrder: string;
    coordinationStrategy: string;
    analysis: {
        documentFindings: string[];
        ragContext: {
            citations: string[];
            scoped: boolean;
            injected: boolean;
        };
        coordinationStrategy: string;
        constraints: string[];
        needsCoordination: boolean;
        confidence: number;
        raw: string;
        summary: string;
        intent: string;
        domains: string[];
        deliverables: string[];
        explicitProjects: any;
        missingInfo: string[];
        contextSignal: string;
    };
    coordinationPlan: {
        mode: string;
        strategy: string;
        executionOrder: string;
        phases: string[];
        targets: any[];
        missingInfo: any;
    };
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        confidence: any;
    };
} | {
    agent: any;
    delegated: any[];
    assignments: any[];
    runtime: string;
    usage: any;
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
}>;
export declare function isContextLimitError(error: any): boolean;
export declare function buildReactiveCompactionContext(context: string, maxChars?: number): string;
