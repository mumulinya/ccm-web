import { type WorkflowDecision } from "./workflow-decision";
export type MainAgentTurnResponseKind = "reply" | "tool_calls" | "clarify" | "plan" | "dispatch";
export type MainAgentTurnDecisionV1 = {
    schema: "ccm-main-agent-turn-decision-v1";
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    responseKind: MainAgentTurnResponseKind;
    workflowDecision: WorkflowDecision;
    reply: string;
    toolRequests: Array<{
        name: string;
        arguments: Record<string, any>;
        reason?: string;
    }>;
    planDraft: any;
    dispatchDraft: any;
    checksum: string;
};
export type MainAgentTurnReceiptV1 = {
    schema: "ccm-main-agent-turn-receipt-v1";
    version: 1;
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    turnId: string;
    responseKind: MainAgentTurnResponseKind;
    modelCallPurpose: "main_first_turn" | "tool_followup";
    modelCallIndex: number;
    toolRound: number;
    usage: any;
    inputChecksum: string;
    decisionChecksum: string;
    createdAt: string;
    checksum: string;
};
export declare function normalizeMainAgentTurnDecision(input: {
    scope: "global" | "group" | "project";
    scopeId?: string;
    exactSessionId?: string;
    turnId?: string;
    parsed?: any;
    workflowDecision?: any;
    reply?: string;
    toolRequests?: any[];
    planDraft?: any;
    dispatchDraft?: any;
}): MainAgentTurnDecisionV1;
export declare function createMainAgentTurnReceipt(input: {
    decision: MainAgentTurnDecisionV1;
    modelCallIndex: number;
    toolRound?: number;
    usage?: any;
    inputIdentity?: any;
    createdAt?: string;
}): MainAgentTurnReceiptV1;
export declare function publicMainAgentTurnDecision(decision: MainAgentTurnDecisionV1): {
    schema: "ccm-main-agent-turn-decision-v1";
    scope: "global" | "group" | "project";
    scope_id: string;
    exact_session_id: string;
    turn_id: string;
    response_type: MainAgentTurnResponseKind;
    workflow_decision: WorkflowDecision;
    tool_count: number;
    checksum: string;
};
