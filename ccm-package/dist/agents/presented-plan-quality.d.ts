export declare const PRESENTED_PLAN_QUALITY_ERROR = "PRESENTED_PLAN_QUALITY";
export declare const PRESENTED_PLAN_QUALITY_GOAL_MIN = 60;
export declare const PRESENTED_PLAN_QUALITY_TITLE_MAX = 240;
export type PresentedPlanQuality = {
    ok: boolean;
    issues: string[];
    directive: string;
    repaired?: boolean;
};
export declare function evaluatePresentedPlanQuality(plan: any): PresentedPlanQuality;
export declare function attachPresentedPlanQuality(plan: any, extra?: {
    repaired?: boolean;
}): {
    plan: any;
    quality: {
        ok: boolean;
        issues: string[];
        repaired: boolean;
        directive: string;
    };
};
export declare function shouldRepairPresentedPlan(parsed: any, alreadyRepaired: boolean): boolean;
export declare function buildPresentedPlanQualityToolResult(callId: string, quality: PresentedPlanQuality): {
    callId: string;
    name: string;
    ok: false;
    error: string;
    reason: string;
};
export declare function runPresentedPlanQualitySelfTest(): {
    pass: boolean;
    checks: {
        validPasses: boolean;
        nineStepsAllowed: boolean;
        oneStepAllowed: boolean;
        emptyStepsRejected: boolean;
        duplicateTitleRejected: boolean;
        missingBoundaryRejected: boolean;
        shortGoalRejected: boolean;
        missingPlanRejected: boolean;
        attachRecordsRepaired: boolean;
        shouldRepairOnce: boolean;
        repairResultHasError: boolean;
    };
};
