export interface PlanStepText {
    content: string;
    activeForm: string;
}
export declare const PLAN_STEP_LIBRARY: Record<string, PlanStepText>;
export declare function planStepText(id: string, overrides?: Partial<PlanStepText>): PlanStepText;
export declare function readTaskPlanMode(task: any): any;
export declare function extractPlanModeWorkSteps(planMode: any): any;
export declare function planWorkStepLiveStatus(phase: string, task: any): "in_progress" | "pending" | "completed" | "cancelled" | "reviewing" | "reworking" | "needs_confirmation";
export interface PlanWorkStepSpec {
    id: string;
    content: string;
    status: string;
    activeForm: string;
    detail: string;
}
export declare function buildPlanModeWorkStepSpecs(task: any, phase: string): PlanWorkStepSpec[];
export interface PlanFollowupInput {
    message: string;
    kind?: string;
    source?: string;
    at?: string;
    executing?: boolean;
}
export declare function mergeFollowupIntoPlanMode(planMode: any, input: PlanFollowupInput): any;
export declare function buildPlanRevisionTaskUpdates(task: any, revisedPlan: any): any;
export declare function summarizePlanRevisionForUser(revisedPlan: any, input?: {
    executing?: boolean;
}): string;
export declare function runMainAgentPlanCoreSelfTest(): {
    pass: boolean;
    checks: {
        followupStepInsertedBeforeGate: boolean;
        awaitingRevisionRequiresReconfirm: boolean;
        inFlightRevisionKeepsExecution: boolean;
        revisionHistoryAccumulates: boolean;
        followupStepMarkedAsUserSource: boolean;
        replayedFollowupIsIdempotent: boolean;
        liveSpecsCarryModelAndFollowupSteps: boolean;
        liveSpecsProgressWithPhase: boolean;
        planStepTextFallsBack: boolean;
        revisionUpdatesSyncAllStores: boolean;
    };
    samples: {
        awaiting: any;
        inFlight: any;
        liveSpecs: PlanWorkStepSpec[];
    };
};
