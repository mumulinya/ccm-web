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
    assignments: {
        project: string;
        task: string;
        reason: string;
        dependsOn: string;
        worker_context_packet: {
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
    }[];
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
    pass: any;
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
    documentFindings: any;
};
export declare function buildCodedCoordinatorSummary(group: any, outputs: string[]): {
    agent: any;
    content: string;
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
    gaps: any;
    conflicts: any;
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
        gaps: any;
        conflicts: any;
        user_question: string;
        confidence: any;
    };
}>;
export declare function decomposeRequirementWithCodedCoordinator(group: any, requirement: string): any;
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
    assignments: {
        project: string;
        task: string;
        reason: string;
        dependsOn: string;
        worker_context_packet: {
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
    }[];
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
    assignments: {
        project: string;
        task: string;
        reason: string;
        dependsOn: string;
        worker_context_packet: {
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
    }[];
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
