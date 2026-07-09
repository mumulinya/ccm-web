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
};
export declare function loadOrchestratorConfig(): any;
export declare function saveOrchestratorConfig(updates: any): any;
export declare function publicOrchestratorConfig(config?: any): any;
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
}): string;
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
export declare function readReplayRepairDispatchPlanLedgerForCoordinator(groupId: string): any;
export declare function readReplayRepairDispatchBindingLedgerForCoordinator(groupId: string): any;
export declare function recordWorkerContextPacketAssignmentBindingForCoordinator(groupId: string, assignment?: any, options?: any): {
    schema: string;
    binding_id: string;
    groupId: string;
    source: string;
    project: any;
    assignment_id: any;
    dispatch_key: any;
    task_fingerprint: any;
    worker_context_packet_id: any;
    worker_context_packet_context_usage: any;
    worker_context_packet_memory_policy: any;
    worker_context_packet_acceptance: any;
    worker_context_packet_compaction_retry: any;
    worker_context_packet_partial_compaction: any;
    worker_context_packet_partial_compact_policy: any;
    worker_context_packet_compact_hook_run_id: any;
    worker_context_packet_memory_reinjection_proof: any;
    worker_context_pre_dispatch_gate: any;
    dispatch_ready: boolean;
    dispatchReady: boolean;
    worker_context_packet_render_probe: {
        packet_id: any;
        rendered_flags: {
            has_context_usage_budget: boolean;
            has_worker_context_packet: boolean;
            has_platform_memory: boolean;
            has_memory_policy: boolean;
            has_memory_ignored_policy: boolean;
            has_memory_reinjection_proof: boolean;
            has_memory_compaction_hash: boolean;
            has_memory_context_compact_marker: boolean;
            has_partial_compaction: boolean;
        };
        rendered_excerpt: string;
    };
    should_create_real_task: boolean;
    at: string;
};
export declare function readReplayRepairDispatchTimelineBindingLedgerForCoordinator(groupId: string): any;
export declare function recordReplayRepairDispatchBriefTimelineBinding(groupId: string, input?: any, options?: any): any;
export declare function recordReplayRepairDispatchBriefAssignmentBinding(groupId: string, assignment?: any, match?: any, options?: any): {
    schema: string;
    binding_id: string;
    groupId: string;
    brief_id: any;
    work_item_id: any;
    source: any;
    project: any;
    assignment_id: any;
    dispatch_key: any;
    task_fingerprint: any;
    worker_context_packet_id: any;
    source_worker_context_packet_id: any;
    source_worker_context_packet_binding_id: any;
    source_worker_context_packet_memory_policy_reason: any;
    worker_context_packet_context_usage: any;
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
    worker_context_packet_id: any;
    worker_context_packet_binding_id: any;
    worker_context_packet_memory_policy_reason: any;
    binding_id: any;
    assignment_id: any;
    dispatch_key: any;
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
export declare function runGroupOrchestrator(input: {
    group: any;
    message: string;
    context?: string;
    source?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    ragCitations?: string[];
    ragScoped?: boolean;
    extraInstructions?: string;
}): Promise<{
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
} | {
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
}>;
export declare function isContextLimitError(error: any): boolean;
export declare function buildReactiveCompactionContext(context: string, maxChars?: number): string;
