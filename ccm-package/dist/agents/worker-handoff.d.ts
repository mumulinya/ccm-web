import type { CcmPlanDispatchContractV1 } from "./plan-dispatch-contract";
export declare function renderMemoryContextForWorker(memory: any): string;
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
    planDispatchContract?: CcmPlanDispatchContractV1 | null;
    planId?: string;
    planRevision?: number;
    planChecksum?: string;
    sourceManifestChecksum?: string;
    contractChecksum?: string;
    workItemId?: string;
    traceId?: string;
    taskId?: string;
    taskAgentSessionId?: string;
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
    communicationEnvelope?: any;
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
    communication_envelope: {
        sourceManifestChecksum?: string;
        contractChecksum?: string;
        planChecksum?: string;
        planRevision?: number;
        planId?: string;
        schema: string;
        messageId: string;
        correlationId: string;
        taskId: string;
        workItemId: string;
        scope: string;
        scopeId: string;
        exactSessionId: string;
        generation: number;
        attempt: number;
        leaseId: string;
        senderAgentId: string;
        receiverAgentId: string;
        deadlineAt: string;
        payloadChecksum: string;
        contentStored: boolean;
    };
    worker_context_packet: any;
    plan_binding: {
        contentStored: false;
        workItemId?: string;
        contractChecksum?: string;
        sourceManifestChecksum?: string;
        planChecksum?: string;
        planRevision?: number;
        planId?: string;
    };
    work_item_contract: {
        project: string;
        files: string[];
        dependsOn: string[];
        parallelGroup: string;
        allowedTools: string[];
        forbiddenPaths: string[];
        acceptance: string[];
        verification: {
            command?: string;
            expected: string;
            evidenceRequired: boolean;
        }[];
        worktree: {
            strategy: "isolated" | "shared";
            branch?: string;
        };
        executor: {
            provider: string;
            agentType: string;
            model?: string;
            transport: "acp" | "cli" | "websocket";
            capabilities: string[];
            degraded: boolean;
            degradedReason?: string;
        };
        timeoutMs: number;
        maxAttempts: number;
        contentStored: boolean;
    };
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
            has_agent_communication_v2: boolean;
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
        communication_envelope: {
            sourceManifestChecksum?: string;
            contractChecksum?: string;
            planChecksum?: string;
            planRevision?: number;
            planId?: string;
            schema: string;
            messageId: string;
            correlationId: string;
            taskId: string;
            workItemId: string;
            scope: string;
            scopeId: string;
            exactSessionId: string;
            generation: number;
            attempt: number;
            leaseId: string;
            senderAgentId: string;
            receiverAgentId: string;
            deadlineAt: string;
            payloadChecksum: string;
            contentStored: boolean;
        };
        worker_context_packet: any;
        plan_binding: {
            contentStored: false;
            workItemId?: string;
            contractChecksum?: string;
            sourceManifestChecksum?: string;
            planChecksum?: string;
            planRevision?: number;
            planId?: string;
        };
        work_item_contract: {
            project: string;
            files: string[];
            dependsOn: string[];
            parallelGroup: string;
            allowedTools: string[];
            forbiddenPaths: string[];
            acceptance: string[];
            verification: {
                command?: string;
                expected: string;
                evidenceRequired: boolean;
            }[];
            worktree: {
                strategy: "isolated" | "shared";
                branch?: string;
            };
            executor: {
                provider: string;
                agentType: string;
                model?: string;
                transport: "acp" | "cli" | "websocket";
                capabilities: string[];
                degraded: boolean;
                degradedReason?: string;
            };
            timeoutMs: number;
            maxAttempts: number;
            contentStored: boolean;
        };
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
                has_agent_communication_v2: boolean;
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
