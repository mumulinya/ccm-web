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
    traceId?: string;
    taskId?: string;
    dependencies?: any[];
    contractInjections?: any[];
    memory?: any;
    verification?: any;
}): {
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
    packet_id: string;
    version: number;
    project: string;
    task_id: string;
    trace_id: string;
    group: {
        id: any;
        name: any;
        members: any;
    };
    goal: any;
    task: string;
    constraints: any;
    document_findings: any;
    dependencies: any[];
    contract_injections: {
        injection_id: any;
        source_agent: any;
        target_agent: any;
        endpoint: any;
        summary: any;
        required_receipt_reference: boolean;
    }[];
    memory: any;
    verification: any;
    acceptance: {
        ack_required_before_implementation: boolean;
        receipt_required: boolean;
        actual_diff_required: boolean;
        verification_required: boolean;
        contract_injection_receipt_required: boolean;
    };
};
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
        workerPacketHasAckGate: boolean;
        workerPacketRendersMemory: boolean;
        contractInjectionHasId: any;
        replaySuiteShape: boolean;
    };
    read: AgentRuntimeLifecycleRecord;
    high: AgentRuntimeLifecycleRecord;
    packet: {
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
        packet_id: string;
        version: number;
        project: string;
        task_id: string;
        trace_id: string;
        group: {
            id: any;
            name: any;
            members: any;
        };
        goal: any;
        task: string;
        constraints: any;
        document_findings: any;
        dependencies: any[];
        contract_injections: {
            injection_id: any;
            source_agent: any;
            target_agent: any;
            endpoint: any;
            summary: any;
            required_receipt_reference: boolean;
        }[];
        memory: any;
        verification: any;
        acceptance: {
            ack_required_before_implementation: boolean;
            receipt_required: boolean;
            actual_diff_required: boolean;
            verification_required: boolean;
            contract_injection_receipt_required: boolean;
        };
    };
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
