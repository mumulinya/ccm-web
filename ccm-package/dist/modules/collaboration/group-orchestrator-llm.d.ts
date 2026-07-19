import { type LlmTokenUsage } from "./group-orchestrator-llm-client";
import { type WorkflowDecision } from "../../agents/workflow-decision";
export declare function mergeLlmTokenUsage(...values: any[]): LlmTokenUsage | null;
export declare function attachLlmTokenUsage(error: any, usage: LlmTokenUsage | null): any;
export declare function runLlmCoordinatorSummary(group: any, userMessage: string, outputs: string[], options?: any): Promise<{
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
    groupSessionId?: string;
    group_session_id?: string;
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
export declare function buildLlmCoordinatorMessages(input: {
    group: any;
    message: string;
    context?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    extraInstructions?: string;
    source?: string;
}): {
    role: string;
    content: string;
}[];
export declare function normalizeDocumentFindings(parsed: any): any;
export declare function enrichTaskWithDocumentFindings(task: string, findings: string[]): string;
export declare function sanitizeLlmTargets(group: any, parsed: any, message: string, fallbackAnalysis: any, allowRuleRepair?: boolean): any;
export declare function normalizeLlmAnalysis(parsed: any, fallback: any): any;
export declare function buildCoordinatorResultFromAnalysis(group: any, message: string, analysis: any, targets: any[], runtime: string, parsed?: any, options?: any): {
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
};
export declare function runLlmGroupOrchestrator(input: {
    group: any;
    message: string;
    context?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    ragCitations?: string[];
    ragScoped?: boolean;
    source?: string;
    extraInstructions?: string;
    providerSwitchRequests?: any;
    provider_switch_requests?: any;
    groupSessionId?: string;
    group_session_id?: string;
}): Promise<{
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
}>;
