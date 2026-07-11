import { buildContextBudget } from "../system/context-budget";
export type AgentRuntimeScope = "global" | "group" | "worker";
export type AgentRuntimeRisk = "read" | "write" | "high" | "agent";
export type AgentRuntimeDecision = "allow" | "ask" | "deny";
export interface AgentRuntimeLifecycleInput {
    scope: AgentRuntimeScope;
    traceId?: string;
    taskId?: string;
    groupId?: string;
    runId?: string;
    agent?: string;
    action: string;
    phase?: string;
    risk?: AgentRuntimeRisk;
    target?: string;
    status?: "planned" | "running" | "ok" | "blocked" | "error" | "skipped";
    message?: string;
    data?: any;
}
export interface AgentRuntimeLifecycleRecord {
    id: string;
    type: "agent_runtime.lifecycle";
    scope: AgentRuntimeScope;
    action: string;
    phase: string;
    risk: AgentRuntimeRisk;
    target: string;
    status: string;
    permission: ReturnType<typeof evaluateAgentRuntimePermission>;
    context_budget: ReturnType<typeof buildContextBudget>;
    artifact_budget: {
        chars: number;
        max_chars: number;
        truncated: boolean;
        artifact_hash: string;
    };
    data: any;
}
export interface AgentPermissionRule {
    id: string;
    scope: AgentRuntimeScope | "all";
    action: string;
    target?: string;
    risk?: AgentRuntimeRisk | "all";
    decision: AgentRuntimeDecision;
    reason: string;
}
export declare function compactWorkerContextMemoryForRetry(memory: any, options?: any): {
    compacted: boolean;
    memory: any;
    summary: {
        schema: string;
        method: string;
        status: string;
        original_memory_hash: string;
        compacted_memory_hash: string;
        original_memory_chars: number;
        compacted_memory_chars: number;
        omitted_chars: number;
        max_rendered_chars: number;
        max_recall_items: number;
        preserves_schema: boolean;
    };
};
export declare function buildWorkerContextMemoryReinjectionProof(packet?: any): {
    schema: string;
    packet_id: any;
    project: any;
    memory_present: boolean;
    memory_ignored: boolean;
    memory_policy_reason: any;
    rendered_memory_present: boolean;
    source_schema: string;
    group_id: string;
    target_project: string;
    packet_memory_hash: string;
    packet_memory_chars: number;
    rendered_memory_hash: string;
    rendered_memory_chars: any;
    memory_first: boolean;
    compaction_retry_id: any;
    memory_compaction_schema: any;
    expected_compacted_memory_hash: string;
    hash_matches_compaction: boolean;
    status: string;
};
export declare function buildWorkerContextUsage(packet?: any, options?: any): {
    schema: string;
    version: number;
    packet_id: any;
    project: any;
    task_id: any;
    model_context_policy: string;
    max_tokens: number;
    reserved_output_tokens: number;
    autocompact_buffer_tokens: number;
    total_tokens: number;
    total_chars: number;
    free_tokens: number;
    pressure: number;
    status: string;
    compact_recommended: boolean;
    categories: {
        id: string;
        name: string;
        tokens: number;
        chars: number;
        item_count: number;
        source: string;
        required: boolean;
        included: boolean;
    }[];
    top_categories: {
        id: string;
        name: string;
        tokens: number;
        chars: number;
    }[];
    suggested_reductions: {
        category_id: string;
        name: string;
        tokens: number;
        suggestion: string;
    }[];
};
export declare function renderWorkerContextUsage(usage?: any): string;
export declare function refreshWorkerContextPacketUsage(packet?: any, options?: any): any;
export declare function evaluateAgentRuntimePermission(input: AgentRuntimeLifecycleInput, rules?: AgentPermissionRule[]): {
    decision: AgentRuntimeDecision;
    allowed: boolean;
    needs_confirmation: boolean;
    denied: boolean;
    rule_id: string;
    reason: string;
};
export declare function buildArtifactBudget(value: any, maxChars?: number): {
    chars: number;
    max_chars: number;
    truncated: boolean;
    artifact_hash: string;
    preview: string;
};
export declare function recordAgentRuntimeLifecycle(input: AgentRuntimeLifecycleInput): AgentRuntimeLifecycleRecord;
export declare function buildWorkerContextPacket(input: {
    group?: any;
    project: string;
    task: string;
    analysis?: any;
    agentType?: string;
    agent_type?: string;
    traceId?: string;
    taskId?: string;
    dependencies?: any[];
    contractInjections?: any[];
    replayRepairDispatchBriefs?: any[];
    memory?: any;
    memoryPolicy?: any;
    pressureMemoryProvenanceReceiptDiscipline?: any;
    pressure_memory_provenance_receipt_discipline?: any;
    pressureProvenanceDispatchFeedbackPolicy?: any;
    pressure_provenance_dispatch_feedback_policy?: any;
    pressureProvenanceProviderDispatchAdvisory?: any;
    pressure_provenance_provider_dispatch_advisory?: any;
    pressureProvenanceProviderDispatchOverrideFollowupReceiptContract?: any;
    pressure_provenance_provider_dispatch_override_followup_receipt_contract?: any;
    providerRankingCompactRepairReceiptMemoryContract?: any;
    provider_ranking_compact_repair_receipt_memory_contract?: any;
    postCompactReinjectionRepairReceiptMemoryContract?: any;
    post_compact_reinjection_repair_receipt_memory_contract?: any;
    providerSwitchDecisionReceipt?: any;
    provider_switch_decision_receipt?: any;
    verification?: any;
    contextUsageOptions?: any;
}): any;
export declare function renderWorkerContextPacket(packet: any): string;
export declare function buildContractInjectionEvent(input: {
    traceId?: string;
    taskId?: string;
    sourceAgent?: string;
    targetAgent: string;
    contract: any;
    packetId?: string;
}): {
    injection_id: any;
    source_agent: string;
    target_agent: string;
    endpoint: any;
    summary: any;
    packet_id: string;
    receipt_reference_required: boolean;
};
export declare function replayAgentTrace(traceId: string): {
    success: boolean;
    trace_id: string;
    event_count: any;
    lifecycle_count: any;
    tool_or_dispatch_count: any;
    blocked_count: any;
    contract_injection_count: any;
    ack_signal_count: any;
    verdict: string;
    latest_events: any;
};
export declare function buildTraceReplaySuite(limit?: number): {
    pass: boolean;
    total: number;
    needs_review: number;
    replays: {
        success: boolean;
        trace_id: string;
        event_count: any;
        lifecycle_count: any;
        tool_or_dispatch_count: any;
        blocked_count: any;
        contract_injection_count: any;
        ack_signal_count: any;
        verdict: string;
        latest_events: any;
    }[];
};
export declare function runAgentRuntimeKernelSelfTest(): {
    pass: boolean;
    checks: {
        readAllowed: boolean;
        highRiskAsks: boolean;
        contextBudgetComputed: boolean;
        contextUsageComputed: any;
        workerPacketHasMemoryReinjectionProof: boolean;
        workerPacketHasAckGate: boolean;
        workerPacketRendersContextUsage: boolean;
        workerPacketRendersMemory: boolean;
        contractInjectionHasId: any;
        replaySuiteShape: boolean;
    };
    read: AgentRuntimeLifecycleRecord;
    high: AgentRuntimeLifecycleRecord;
    packet: any;
    replay: {
        pass: boolean;
        total: number;
        needs_review: number;
        replays: {
            success: boolean;
            trace_id: string;
            event_count: any;
            lifecycle_count: any;
            tool_or_dispatch_count: any;
            blocked_count: any;
            contract_injection_count: any;
            ack_signal_count: any;
            verdict: string;
            latest_events: any;
        }[];
    };
};
export declare function runWorkerContextUsageSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        categorizesTaskAndMemory: boolean;
        categorizesReplayBrief: boolean;
        categorizesTypedRecall: boolean;
        categorizesMemoryReinjectionProof: boolean;
        keepsBudgetBuffers: boolean;
        suggestsReductions: boolean;
        statusOk: boolean;
        renderedMentionsUsage: boolean;
    };
    usage: {
        status: any;
        total_tokens: any;
        free_tokens: any;
        top_categories: any;
    };
};
export declare function runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest(): {
    pass: boolean;
    checks: {
        packetCarriesContract: boolean;
        acceptanceRequiresSamplingReceipt: boolean;
        usageCategorizesContract: boolean;
        renderedShowsContract: boolean;
        advisoryDoesNotHold: boolean;
    };
    contract: {
        schema: any;
        active: boolean;
        rel_paths: any;
        followup_work_item_ids: any;
    };
    acceptance: any;
};
