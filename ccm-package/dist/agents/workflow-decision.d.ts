export type WorkflowDecisionMode = "answer" | "project_analysis" | "execute_direct" | "plan_task" | "decompose_epic";
export interface WorkflowDecision {
    schema: "ccm-model-workflow-decision-v1";
    mode: WorkflowDecisionMode;
    reason: string;
    confidence: number;
    needsPlanning: boolean;
    needsEpicDecomposition: boolean;
    actionRequired: boolean;
    continuationKind: "new_task" | "supplement" | "revise_goal";
    readAction: "none" | "inspect_status";
    targetRefs: string[];
    impactScope: string[];
    planSteps: string[];
    clarificationQuestions: string[];
    source: "model" | "explicit_user_choice";
}
export declare const WORKFLOW_DECISION_GUIDANCE: string;
export declare function normalizeWorkflowDecision(value: any, source?: WorkflowDecision["source"]): WorkflowDecision;
export declare function explicitWorkflowDecision(mode: WorkflowDecisionMode, reason: string, overrides?: Partial<WorkflowDecision>): WorkflowDecision;
export declare function decideWorkflowWithModel(input: {
    message: string;
    scope: "global" | "group" | "project";
    context?: any;
    sourceCount?: number;
}): Promise<WorkflowDecision>;
export declare function runWorkflowDecisionContractSelfTest(): {
    success: boolean;
    cases: WorkflowDecision[];
};
