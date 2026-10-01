export declare const PRESENTED_PLAN_QUALITY_ERROR = "PRESENTED_PLAN_QUALITY";
export declare const PRESENTED_PLAN_QUALITY_GOAL_MIN = 60;
export declare const PRESENTED_PLAN_QUALITY_TITLE_MAX = 240;
export type PresentedPlanQuality = {
    ok: boolean;
    issues: string[];
    directive: string;
    repaired?: boolean;
    report?: CcmPlanQualityReportV1;
};
export type CcmPlanQualityReportV1 = {
    schema: "ccm-plan-quality-report-v1";
    status: "passed" | "passed_with_warnings" | "repair_required" | "blocked";
    specificityScore: number;
    evidenceCoverage: number;
    acceptanceCoverage: number;
    verificationCoverage: number;
    issues: Array<{
        code: "plan_step_too_generic" | "missing_affected_location" | "missing_behavior_change" | "file_evidence_missing" | "verification_mapping_missing" | "ungrounded_file" | "ungrounded_command" | "scope_drift" | "acceptance_not_implemented";
        severity: "warning" | "blocking";
        stepId?: string;
        message: string;
    }>;
    checkedPlanChecksum: string;
    checkedEvidenceManifestChecksum: string;
    contentStored: false;
};
export declare function assessImplementationPlanQuality(plan: any, evidenceManifest?: any, options?: {
    allowedProjects?: string[];
}): CcmPlanQualityReportV1;
export declare function evaluatePresentedPlanQuality(plan: any, options?: {
    evidenceManifest?: any;
    allowedProjects?: string[];
}): PresentedPlanQuality;
export declare function attachPresentedPlanQuality(plan: any, extra?: {
    repaired?: boolean;
}): {
    plan: any;
    quality: {
        report?: any;
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
