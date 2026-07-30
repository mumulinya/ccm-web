import { type LlmTokenUsage } from "../modules/collaboration/group-orchestrator-llm-client";
export type SemanticDecisionScope = "global" | "group" | "project" | "music" | "test_agent";
export type SemanticDecisionKind = "workflow" | "music_intent" | "music_selection" | "agent_collaboration_route" | "test_agent_plan" | "memory_extraction" | "acceptance_projection" | "main_agent_self_verification" | "requirement_intake_quality" | "work_report_summary";
export interface SemanticDecisionIdentityV1 {
    scope: SemanticDecisionScope;
    scopeId: string;
    sessionId: string;
    taskId?: string;
    generation?: number;
}
export interface SemanticDecisionReceiptV1 {
    schema: "ccm-semantic-decision-receipt-v1";
    version: 1;
    decisionKind: SemanticDecisionKind;
    identity: SemanticDecisionIdentityV1;
    inputChecksum: string;
    resultChecksum: string;
    provider: string;
    model: string;
    confidence: number;
    status: "confirmed" | "failed";
    startedAt?: string;
    decidedAt: string;
    durationMs?: number;
    usage?: LlmTokenUsage | null;
    checksum: string;
}
export interface AgentCollaborationRouteDecisionV1 {
    schema: "ccm-agent-collaboration-route-decision-v1";
    targetProject: string;
    action: "ask_agent" | "ask_user" | "reject";
    reason: string;
    confidence: number;
    candidateProjects: string[];
}
export interface TestAgentSemanticPlanV2 {
    schema: "ccm-test-agent-semantic-plan-v2";
    summary: string;
    inspectedFiles: string[];
    projects: any[];
    criterionCoverage: Array<{
        criterion: string;
        status: "planned" | "unsupported" | "needs_user";
        checkNames: string[];
        reason: string;
    }>;
}
export interface MemorySemanticExtractionV1 {
    schema: "ccm-memory-semantic-extraction-v1";
    candidates: Array<{
        type: string;
        operation: "add" | "update" | "supersede" | "ignore";
        text: string;
        evidenceMessageIds: string[];
        evidenceQuotes: string[];
        confidence: number;
        applicableScope: string;
        supersedes?: string[];
    }>;
}
export interface AcceptancePresentationV1 {
    schema: "ccm-acceptance-presentation-v1";
    status: "passed" | "needs_rework" | "needs_user" | "recorded" | "unverified";
    label: string;
    reason: string;
    blocking: boolean;
}
type SemanticDecisionRequest<T> = {
    kind: SemanticDecisionKind;
    identity: SemanticDecisionIdentityV1;
    system: string;
    input: any;
    validate: (value: any) => T;
    confidence?: (value: T) => number;
    maxTokens?: number;
    reasoningEffort?: "low" | "medium" | "high" | "off";
    modelCall?: (request: {
        config: any;
        messages: any[];
        maxTokens: number;
    }) => Promise<any>;
    config?: any;
};
export declare function semanticDecisionChecksum(value: any, length?: number): string;
export declare function runSemanticDecision<T>(request: SemanticDecisionRequest<T>): Promise<{
    value: T;
    receipt: SemanticDecisionReceiptV1;
}>;
export declare function buildExplicitSemanticDecisionReceipt(kind: SemanticDecisionKind, identityInput: SemanticDecisionIdentityV1, input: any, value: any, confidence?: number): SemanticDecisionReceiptV1;
export declare function normalizeCollaborationRouteDecision(value: any, candidateProjects: string[]): AgentCollaborationRouteDecisionV1;
export declare function normalizeAcceptancePresentation(value: any): AcceptancePresentationV1;
export declare function runSemanticDecisionRuntimeSelfTest(): {
    pass: boolean;
    checks: {
        exactCandidateAccepted: boolean;
        unverifiedAcceptanceBlocks: boolean;
        invalidCandidateRejected: boolean;
        stableChecksum: boolean;
    };
};
export {};
