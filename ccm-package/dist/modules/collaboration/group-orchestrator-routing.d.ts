import { type LlmTokenUsage } from "./group-orchestrator-llm-client";
import { type WorkflowDecision } from "../../agents/workflow-decision";
export declare const GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR: string;
export declare const GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_PLANS_DIR: string;
export declare const GROUP_MEMORY_REPLAY_REPAIR_DISPATCH_BINDINGS_DIR: string;
export declare const GROUP_MEMORY_REPLAY_REPAIR_TIMELINE_BINDINGS_DIR: string;
export declare const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_HOOKS_DIR: string;
export declare const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_OUTCOMES_DIR: string;
export declare const GROUP_MEMORY_WORKER_CONTEXT_COMPACT_STRATEGIES_DIR: string;
export declare const GROUP_MEMORY_WORKER_CONTEXT_PTL_EMERGENCIES_DIR: string;
export declare function getLlmConfigIssue(config: any): string;
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
    members: any[];
    rejectedDirectTarget: string;
};
export declare function resolveMemberRuntime(projectName: string, group: any, configs: any[]): {
    project: string;
    workDir: any;
    agentType: any;
    configured: boolean;
};
export declare function buildRecentGroupContext(messages: any[], fullCount?: number): string;
export declare function containsAny(text: string, words: string[]): boolean;
export declare function memberKind(member: any): "frontend" | "backend" | "general";
export declare const FRONTEND_HINTS: string[];
export declare const BACKEND_HINTS: string[];
export declare const BROAD_HINTS: string[];
export declare const QUESTION_HINTS: string[];
export declare const REVIEW_HINTS: string[];
export declare const TEST_HINTS: string[];
export declare const BUG_HINTS: string[];
export declare const IMPLEMENT_HINTS: string[];
export declare const PLANNING_HINTS: string[];
export declare const GREETING_PATTERNS: RegExp[];
export declare const SIMPLE_MESSAGE_PATTERNS: RegExp[];
export declare function isGreetingMessage(message: string): boolean;
export declare function isSimpleMessage(message: string): boolean;
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
export declare function scoreMember(member: any, message: string, analysis?: any): number;
export declare function explicitMentionTargets(group: any, message: string): any[];
export declare function routeMembers(group: any, message: string, analysis?: any): any;
export declare function formatRequirementUnderstanding(analysis: any): string[];
export declare function buildDelegationLine(project: string, task: string, analysis: any): string;
export declare function buildVisibleAssignmentLine(item: any): string;
export declare function inferCoordinatorStrategy(analysis?: any, targetCount?: number): "research_synthesis_implementation_verification" | "direct_worker_execution";
export declare function buildCoordinatorPlan(group: any, analysis: any, targets: any[], executionOrder?: string, strategy?: string): {
    mode: string;
    strategy: string;
    executionOrder: string;
    phases: string[];
    targets: any[];
    missingInfo: any;
};
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
    groupSessionId?: string;
    group_session_id?: string;
    workerContextUsageOptions?: any;
    worker_context_usage_options?: any;
    autoWorkerContextCompactRetry?: boolean;
    auto_worker_context_compact_retry?: boolean;
    workerContextRetryOptions?: any;
    worker_context_retry_options?: any;
};
export declare function measureGroupMainAgentPayload(input: any): {
    messages: {
        role: string;
        content: string;
    }[];
    snapshot: import("../../system/session-compaction-core").ModelVisiblePayloadSnapshot;
    tokens: number;
};
export declare function prepareExactGroupMainAgentInput(input: any, group: any, groupSessionId: string, config: any, runtime?: any): Promise<{
    input: any;
    compacted: boolean;
    measurement: {
        messages: {
            role: string;
            content: string;
        }[];
        snapshot: import("../../system/session-compaction-core").ModelVisiblePayloadSnapshot;
        tokens: number;
    };
    projection?: undefined;
    capacity?: undefined;
    threshold?: undefined;
    compactResult?: undefined;
} | {
    input: any;
    compacted: boolean;
    projection: any;
    measurement: {
        messages: {
            role: string;
            content: string;
        }[];
        snapshot: import("../../system/session-compaction-core").ModelVisiblePayloadSnapshot;
        tokens: number;
    };
    capacity: {
        schema: string;
        provider: any;
        model: any;
        contextWindow: number;
        maxOutputTokens: number;
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
        conservativeFallback: boolean;
    } | {
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        reserveSource: string;
        schema: string;
        provider: any;
        model: any;
        contextWindow: number;
        maxOutputTokens: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
        conservativeFallback: boolean;
    } | {
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        reserveSource: string;
        conservativeFallback: boolean;
        fallbackReason: string;
        staleEvidenceId: any;
        staleEvidenceSource: any;
        schema: string;
        provider: any;
        model: any;
        contextWindow: number;
        maxOutputTokens: number;
        source: any;
        confidence: number;
        checkedAt: any;
        expiresAt: any;
        evidenceId: any;
        evidenceChecksum: any;
        cacheStatus: string;
    } | {
        reservedOutputTokens: number;
        effectiveContextWindow: number;
        autoCompactBufferTokens: number;
        autoCompactThreshold: number;
        reserveSource: string;
        schema: string;
        provider: string;
        model: string;
        contextWindow: number;
        maxOutputTokens: number;
        source: string;
        confidence: number;
        checkedAt: string;
        expiresAt: string;
        evidenceId: string;
        evidenceChecksum: string;
        cacheStatus: string;
        conservativeFallback: boolean;
        fallbackReason: string;
    };
    threshold: number;
    compactResult: any;
}>;
export declare function runGroupOrchestratorCore(input: GroupOrchestratorInput): Promise<{
    usage: LlmTokenUsage;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
    workflowDecision: WorkflowDecision;
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
    contextRecovery?: undefined;
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
    contextRecovery?: undefined;
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
    contextRecovery?: undefined;
} | {
    usage: LlmTokenUsage;
    contextRecovery: {
        type: string;
        originalChars: number;
        recoveredChars: number;
        ownership: any;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
        ownership: any;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
    contextRecovery: {
        type: string;
        ownership: any;
        originalChars?: undefined;
        recoveredChars?: undefined;
    };
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
    contextRecovery: {
        type: string;
        ownership: any;
        originalChars?: undefined;
        recoveredChars?: undefined;
    };
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
    contextRecovery: {
        type: string;
        ownership: any;
        originalChars?: undefined;
        recoveredChars?: undefined;
    };
    agentBoundary: {
        layer: string;
        planner: string;
        runtime: string;
        responsibility: string;
    };
    content: string;
}>;
export declare function summarizeGroupOrchestratorProviderError(error: any): string;
export declare function runGroupOrchestrator(input: GroupOrchestratorInput): Promise<{
    selectedRoleSkills: string[];
    usage: LlmTokenUsage;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
    selectedRoleSkills: string[];
    usage: LlmTokenUsage;
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
    selectedRoleSkills: string[];
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
    contextRecovery?: undefined;
} | {
    selectedRoleSkills: string[];
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
    contextRecovery?: undefined;
} | {
    selectedRoleSkills: string[];
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
    contextRecovery?: undefined;
} | {
    selectedRoleSkills: string[];
    usage: LlmTokenUsage;
    contextRecovery: {
        type: string;
        originalChars: number;
        recoveredChars: number;
        ownership: any;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
    selectedRoleSkills: string[];
    usage: LlmTokenUsage;
    contextRecovery: {
        type: string;
        originalChars: number;
        recoveredChars: number;
        ownership: any;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
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
    selectedRoleSkills: string[];
    runtime: string;
    usage: any;
    contextRecovery: {
        type: string;
        ownership: any;
        originalChars?: undefined;
        recoveredChars?: undefined;
    };
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
    selectedRoleSkills: string[];
    runtime: string;
    usage: any;
    contextRecovery: {
        type: string;
        ownership: any;
        originalChars?: undefined;
        recoveredChars?: undefined;
    };
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
    selectedRoleSkills: string[];
    agent: any;
    delegated: any[];
    assignments: any[];
    runtime: string;
    usage: any;
    contextRecovery: {
        type: string;
        ownership: any;
        originalChars?: undefined;
        recoveredChars?: undefined;
    };
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
