export declare const PLAN_INHERITANCE_SCHEMA: "ccm-plan-inheritance-v1";
export type PlanInheritanceRow = {
    oldWorkItemId: string;
    newWorkItemId: string;
    inheritance: "completed" | "partially_valid" | "invalidated" | "replaced";
    inheritedCriterionIds: string[];
    invalidatedEvidenceIds: string[];
    reason: string;
};
export declare function buildPlanInheritance(previousPlan: any, nextPlan: any, evidenceByWorkItem?: Record<string, any[]>): PlanInheritanceRow[];
export declare function planInheritanceChecksum(rows: PlanInheritanceRow[]): string;
export declare function runPlanInheritanceSelfTest(): {
    pass: boolean;
    rows: PlanInheritanceRow[];
};
