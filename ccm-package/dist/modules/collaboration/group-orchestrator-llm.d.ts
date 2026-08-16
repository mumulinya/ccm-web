import { type LlmTokenUsage } from "./group-orchestrator-llm-client";
import type { ToolScope } from "../../tools/tool-manager";
import { type MainAgentToolRequest } from "../../tools/main-agent-tool-runtime";
import { type WorkflowDecision } from "../../agents/workflow-decision";
export declare function mergeLlmTokenUsage(...values: any[]): LlmTokenUsage | null;
export type GroupMainToolRequest = MainAgentToolRequest;
export declare function isGroupMainReadOnlyMcpTool(tool: any): boolean;
export declare function buildGroupMainAgentToolContext(input: {
    group: any;
    message: string;
    source?: string;
    groupSessionId?: string;
    group_session_id?: string;
    workflowDecision?: WorkflowDecision | null;
    loadedMainAgentTools?: string[];
    anchorMessageId?: string;
    anchor_message_id?: string;
}): any;
export declare function normalizeGroupMainToolRequests(value: any): GroupMainToolRequest[];
export declare function executeGroupMainAgentToolRequests(input: {
    requests: GroupMainToolRequest[];
    toolContext: any;
    toolCallIds?: string[];
    executeToolCall?: (name: string, args: any, scope?: ToolScope) => Promise<string>;
    toolBatchSize?: number;
    readOnlyParallelism?: number;
    signal?: AbortSignal;
}): Promise<any[]>;
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
export declare function decomposeRequirementWithModelCoordinator(group: any, requirement: string): Promise<any>;
export declare const decomposeRequirementWithCodedCoordinator: typeof decomposeRequirementWithModelCoordinator;
export declare function buildLlmCoordinatorMessages(input: {
    group: any;
    message: string;
    context?: string;
    sharedFilesContext?: string;
    ragContext?: string;
    extraInstructions?: string;
    source?: string;
    groupSessionId?: string;
    group_session_id?: string;
    mainAgentToolResults?: any[];
    main_agent_tool_results?: any[];
    workflowDecision?: WorkflowDecision | null;
}): import("./group-orchestrator-llm-client").LlmChatMessage[];
export declare function buildLlmCoordinatorContextComponents(input: {
    group: any;
    message: string;
    extraInstructions?: string;
    source?: string;
    groupSessionId?: string;
    group_session_id?: string;
    mainAgentToolResults?: any[];
    main_agent_tool_results?: any[];
    workflowDecision?: WorkflowDecision | null;
}): {
    rules: string;
    skills: string;
    mcpTools: any;
    mcpResults: any[];
    subagentDefinitions: any;
    loadedContextItems: import("../../system/session-compaction-core").LoadedContextItemsV1;
};
export declare function normalizeDocumentFindings(parsed: any): any;
export declare function enrichTaskWithDocumentFindings(task: string, findings: string[]): string;
export declare function sanitizeLlmTargets(group: any, parsed: any, message: string, fallbackAnalysis: any, allowRuleRepair?: boolean, dispatchContext?: any): any[];
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
        structuredClarificationQuestions: any[];
        confidence: any;
    } | {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
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
    projectSourceEvidence?: undefined;
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
} | {
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
    coordinationPlan: any;
    projectSourceEvidence: any;
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        structuredClarificationQuestions: any[];
        confidence: any;
    } | {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
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
    mainAgentToolResults?: any[];
    main_agent_tool_results?: any[];
    workflowDecision?: WorkflowDecision | null;
    workflow_decision?: WorkflowDecision | null;
    projectSourceEvidence?: any;
    project_source_evidence?: any;
    onRetry?: (notice: any) => void;
    onDelta?: (delta: string) => void;
    onModelActivity?: (activity: any) => void;
    turnId?: string;
    turn_id?: string;
    anchorMessageId?: string;
    anchor_message_id?: string;
    signal?: AbortSignal;
}): Promise<{
    usage: LlmTokenUsage;
    mainAgentTurnDecision: import("../../agents/main-agent-turn").MainAgentTurnDecisionV1;
    mainAgentTurnReceipt: import("../../agents/main-agent-turn").MainAgentTurnReceiptV1;
    modelRetryReceipt: {
        schema: string;
        attempts: any;
        retries: any[];
    };
    mainAgentToolUsage: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        mode: import("../../system/agent-loop-budget").AgentLoopMode;
        modelCalls: number;
        toolRounds: number;
        calls: number;
        continuationSegments: number;
        noProgressCount: number;
        stopReason: string;
        results: {
            name: any;
            ok: any;
            outputTokens: any;
            error: any;
        }[];
    };
    replyDeltaEmitted: boolean;
    reply_delta_emitted: boolean;
    streamingMetric: {
        modelMs: number;
        toolWallMs: number;
        firstVisibleFeedbackMs: number;
        firstTokenMs: number;
        maxSilentGapMs: number;
        providerRetryCount: number;
        fallbackStreamCount: number;
        initialReadFileCount: number;
        initialReadTokens: number;
    };
    presentedPlan?: {
        steps: any;
        scope: string[];
        expectedResults: string[];
        exclusions: string[];
        status: "ready" | "completed" | "blocked" | "superseded" | "executing";
        createdAt: string;
        updatedAt: string;
        overview?: string;
        planId: string;
        revision: number;
        title: string;
        goal: string;
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
        structuredClarificationQuestions: any[];
        confidence: any;
    } | {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
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
    projectSourceEvidence?: undefined;
    executionOrder?: undefined;
    coordinationStrategy?: undefined;
} | {
    usage: LlmTokenUsage;
    mainAgentTurnDecision: import("../../agents/main-agent-turn").MainAgentTurnDecisionV1;
    mainAgentTurnReceipt: import("../../agents/main-agent-turn").MainAgentTurnReceiptV1;
    modelRetryReceipt: {
        schema: string;
        attempts: any;
        retries: any[];
    };
    mainAgentToolUsage: {
        schema: string;
        groupId: string;
        groupSessionId: string;
        mode: import("../../system/agent-loop-budget").AgentLoopMode;
        modelCalls: number;
        toolRounds: number;
        calls: number;
        continuationSegments: number;
        noProgressCount: number;
        stopReason: string;
        results: {
            name: any;
            ok: any;
            outputTokens: any;
            error: any;
        }[];
    };
    replyDeltaEmitted: boolean;
    reply_delta_emitted: boolean;
    streamingMetric: {
        modelMs: number;
        toolWallMs: number;
        firstVisibleFeedbackMs: number;
        firstTokenMs: number;
        maxSilentGapMs: number;
        providerRetryCount: number;
        fallbackStreamCount: number;
        initialReadFileCount: number;
        initialReadTokens: number;
    };
    presentedPlan?: {
        steps: any;
        scope: string[];
        expectedResults: string[];
        exclusions: string[];
        status: "ready" | "completed" | "blocked" | "superseded" | "executing";
        createdAt: string;
        updatedAt: string;
        overview?: string;
        planId: string;
        revision: number;
        title: string;
        goal: string;
    };
    agent: any;
    delegated: any[];
    assignments: any[];
    analysis: any;
    workflowDecision: WorkflowDecision;
    coordinationPlan: any;
    projectSourceEvidence: any;
    dispatchPolicy: {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
        structuredClarificationQuestions: any[];
        confidence: any;
    } | {
        action: string;
        reason: string;
        requiresConfirmation: boolean;
        risk: string;
        nextStep: string;
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
