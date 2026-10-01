import type { CcmPlanDispatchWorkItem } from "./plan-dispatch-contract";
export declare function buildProjectWorkerSemanticAckPrompt(workItem: CcmPlanDispatchWorkItem): string;
export declare function buildProjectWorkerSemanticAckRepairPrompt(workItem: CcmPlanDispatchWorkItem, issues: string[]): string;
export declare function projectWorkerSemanticAckCanRepair(issues: string[]): boolean;
export declare function validateProjectWorkerSemanticAck(workItem: CcmPlanDispatchWorkItem, output: any): {
    ok: boolean;
    issues: string[];
    receipt: {
        schema: string;
        requirementChecksum: string;
        planChecksum: string;
        stepId: string;
        understoodGoal: string;
        acceptanceCriterionIds: string[];
        plannedScope: string[];
        forbiddenScope: string[];
        verificationPlan: string[];
        unclear: string[];
        contentStored: boolean;
    };
};
export declare function runProjectWorkerSemanticAckSelfTest(): {
    pass: boolean;
    checks: {
        validAckAccepted: boolean;
        opaqueChecksumTypoCanRetryOnce: boolean;
        opaqueCriterionIdTypoCanRetryOnce: boolean;
        missingSemanticUnderstandingCannotUseChecksumRetry: boolean;
        repairPromptCarriesExactFrozenChecksum: boolean;
    };
};
