import type { CcmEvidencePolicyV1 } from "./evidence-policy";
export declare const CCM_COMPILED_EXECUTION_PLAN_SCHEMA: "ccm-compiled-execution-plan-v1";
export type CcmCompiledExecutionPlanV1 = {
    schema: typeof CCM_COMPILED_EXECUTION_PLAN_SCHEMA;
    requirementChecksum: string;
    reviewedPlanChecksum: string;
    evidencePolicyChecksum: string;
    workItems: Array<{
        id: string;
        projectId: string;
        objective: string;
        dependencies: string[];
        allowedPaths: string[];
        evidenceRefs: string[];
        acceptanceCriterionIds: string[];
        verificationCommands: string[];
    }>;
    dispatchChecksum: string;
    verdict: "ready" | "repair_required" | "blocked";
    contentStored: false;
};
/** Deterministically compiles an already reviewed plan; it never invents scope or business goals. */
export declare function compileExecutionPlan(input: {
    plan: any;
    evidencePolicy: CcmEvidencePolicyV1;
    allowedProjects?: string[];
    verificationCommands?: Array<{
        projectId?: string;
        command: string;
    }>;
}): CcmCompiledExecutionPlanV1 & {
    issues: string[];
};
