export interface WorkflowDecision {
    schema: "ccm-model-workflow-decision-v2";
    reason: string;
    confidence: number;
    needsEpicDecomposition: boolean;
    actionRequired: boolean;
    continuationKind: "new_task" | "supplement" | "revise_goal";
    readAction: "none" | "inspect_status";
    targetRefs: string[];
    impactScope: string[];
    planSteps: string[];
    clarificationQuestions: string[];
    structuredClarificationQuestions: any[];
    selectedSkills: string[];
    intentKind: "conversation" | "question" | "status" | "analysis" | "execution" | "management" | "continuation";
    requiresCodeChanges: boolean;
    requiresAgentQa: boolean;
    requiresIndependentReview: boolean;
    verificationModes: Array<"commands" | "http" | "browser" | "visual" | "integration" | "release">;
    memoryPolicy: "use" | "ignore";
    sourcePolicy: "require_read" | "ignore_unread";
    authorizationDirective: "preserve" | "grant" | "revoke";
    riskLevel: "low" | "write" | "high";
    requiresUserConfirmation: boolean;
    directReplyReady: boolean;
    directReply: string;
    source: "model" | "explicit_user_choice";
    semanticDecisionReceipt?: any;
}
export declare const WORKFLOW_DECISION_GUIDANCE: string;
export declare function normalizeWorkflowDecision(value: any, source?: WorkflowDecision["source"]): WorkflowDecision;
export declare function isDevelopmentTaskWorkflowDecision(value: any): boolean;
export declare function explicitWorkflowDecision(reason: string, overrides?: Partial<WorkflowDecision>): WorkflowDecision;
export declare function decideWorkflowWithModel(input: {
    message: string;
    scope: "global" | "group" | "project";
    context?: any;
    sourceCount?: number;
}): Promise<WorkflowDecision>;
export declare function runWorkflowDecisionContractSelfTest(): {
    success: boolean;
    cases: WorkflowDecision[];
    direct: WorkflowDecision;
    unsafeDirect: WorkflowDecision;
    legacyRejected: boolean;
};
