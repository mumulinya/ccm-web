export interface SelfContainedWorkerHandoffInput {
    group?: any;
    project: string;
    task: string;
    userGoal?: string;
    source?: string;
    reason?: string;
    workDir?: string;
    agentType?: string;
    model?: string;
    traceId?: string;
    taskId?: string;
    analysis?: any;
    workerContextPacket?: any;
    dependencies?: any[];
    contractInjections?: any[];
    memory?: any;
    verificationHints?: any[];
    acceptance?: any;
    requiresCodeChanges?: boolean;
    advisoryOnly?: boolean;
    continuation?: any;
    allowedScope?: any[];
    forbiddenScope?: any[];
    expectedFiles?: any[];
    doneCriteria?: any[];
}
export declare function buildSelfContainedWorkerHandoff(input: SelfContainedWorkerHandoffInput): {
    schema: string;
    handoff_id: string;
    project: string;
    source: string;
    reason: string;
    user_goal: string;
    task: string;
    work_dir: string;
    agent_type: string;
    worker_context_packet: any;
    scope: {
        allowed: string[];
        forbidden: string[];
        expected_files: string[];
        dependencies: {
            project: string;
            reason: string;
        }[];
        continuation: any;
        advisory_only: boolean;
    };
    references: {
        document_findings: string[];
        constraints: string[];
        memory_context: any;
        memory_summary: string;
        contract_injections: any;
        memory_freshness_gate: any;
        post_compact_reinjection_gate: any;
        post_compact_dispatch_marker: any;
        read_plan_revalidation_gate: any;
        global_memory_health_gate: any;
        api_microcompact_native_apply_plan: any;
    };
    verification: {
        required: string;
        hints: string[];
        acceptance: string[];
    };
    done_criteria: string[];
    ack_gate: {
        required: boolean;
        fields: string[];
        rule: string;
    };
    receipt_schema: {
        marker: string;
        required_fields: string[];
        status_values: string[];
    };
    user_summary: {
        label: string;
        text: string;
        completeness: {
            has_goal: boolean;
            has_scope: boolean;
            has_done_criteria: boolean;
            has_receipt_schema: boolean;
            has_ack_gate: boolean;
            has_memory_freshness_gate: boolean;
            has_post_compact_reinjection_gate: boolean;
            has_post_compact_dispatch_marker: boolean;
            has_read_plan_revalidation_gate: boolean;
            has_global_memory_health_gate: boolean;
            has_api_microcompact_native_apply_plan: boolean;
        };
    };
};
export declare function renderReceiptSchemaForWorker(handoff: any): string;
export declare function renderSelfContainedWorkerHandoff(handoff: any): string;
export declare function summarizeWorkerHandoffForUser(handoff: any): {
    schema: any;
    handoff_id: any;
    project: any;
    label: any;
    text: any;
    packet_id: any;
    completeness: any;
};
export declare function runWorkerHandoffSelfTest(): {
    pass: boolean;
    checks: {
        schema: boolean;
        packet: boolean;
        selfContainedPrinciple: boolean;
        goalAndScope: boolean;
        doneAndVerification: boolean;
        ackAndReceipt: boolean;
        dependencyAndInjection: boolean;
        memoryContextPreserved: boolean;
        globalMemoryHealthGatePreserved: boolean;
        memoryFreshnessGatePreserved: boolean;
        postCompactReinjectionGatePreserved: boolean;
        postCompactDispatchMarkerPreserved: boolean;
        continuationHandoffRendered: boolean;
        avoidsLazyDelegation: boolean;
    };
    handoff: {
        schema: string;
        handoff_id: string;
        project: string;
        source: string;
        reason: string;
        user_goal: string;
        task: string;
        work_dir: string;
        agent_type: string;
        worker_context_packet: any;
        scope: {
            allowed: string[];
            forbidden: string[];
            expected_files: string[];
            dependencies: {
                project: string;
                reason: string;
            }[];
            continuation: any;
            advisory_only: boolean;
        };
        references: {
            document_findings: string[];
            constraints: string[];
            memory_context: any;
            memory_summary: string;
            contract_injections: any;
            memory_freshness_gate: any;
            post_compact_reinjection_gate: any;
            post_compact_dispatch_marker: any;
            read_plan_revalidation_gate: any;
            global_memory_health_gate: any;
            api_microcompact_native_apply_plan: any;
        };
        verification: {
            required: string;
            hints: string[];
            acceptance: string[];
        };
        done_criteria: string[];
        ack_gate: {
            required: boolean;
            fields: string[];
            rule: string;
        };
        receipt_schema: {
            marker: string;
            required_fields: string[];
            status_values: string[];
        };
        user_summary: {
            label: string;
            text: string;
            completeness: {
                has_goal: boolean;
                has_scope: boolean;
                has_done_criteria: boolean;
                has_receipt_schema: boolean;
                has_ack_gate: boolean;
                has_memory_freshness_gate: boolean;
                has_post_compact_reinjection_gate: boolean;
                has_post_compact_dispatch_marker: boolean;
                has_read_plan_revalidation_gate: boolean;
                has_global_memory_health_gate: boolean;
                has_api_microcompact_native_apply_plan: boolean;
            };
        };
    };
    rendered: string;
};
