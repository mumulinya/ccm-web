export declare const CCM_IMPLEMENTATION_PLAN_SCHEMA: "ccm-implementation-plan-v2";
export declare const CCM_IMPLEMENTATION_PLAN_PROMPT_VERSION = "2026-08-18.en-v2";
export type CcmImplementationPlanV2 = {
    schema: typeof CCM_IMPLEMENTATION_PLAN_SCHEMA;
    planId?: string;
    title: string;
    context: string;
    goal: string;
    approach: string;
    scope: string[];
    files: Array<{
        project: string;
        path: string;
        reason: string;
        sourceEvidenceIds: string[];
    }>;
    steps: Array<{
        id: string;
        title: string;
        objective: string;
        dependsOn: string[];
        acceptance: string[];
        files?: string[];
        sourceEvidenceIds?: string[];
        artifacts?: string[];
        allowedTools?: string[];
        forbiddenPaths?: string[];
        status?: string;
    }>;
    verification: Array<{
        command?: string;
        expected: string;
        acceptanceCriteria: string[];
    }>;
    risks: string[];
    exclusions: string[];
    openQuestions: string[];
    revision: number;
    checksum: string;
    promptVersion: string;
    outputLanguage: string;
    sourceManifestChecksum?: string;
    contentStored: false;
    overview?: string;
    expectedResults?: string[];
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    quality?: any;
};
export declare const IMPLEMENTATION_PLAN_PROMPTS: {
    readonly planning_exploration: "You are the CCM implementation planner.\n\nWork in read-only mode. Do not modify project files, configuration, dependencies,\nGit state, or external systems.\n\nPhase 1: Inspect only the minimum relevant files.\nPhase 2: Identify existing code, utilities, conventions, and tests to reuse.\nPhase 3: Produce one recommended implementation approach.\nPhase 4: Review scope, evidence, risks, acceptance criteria, and verification.\nPhase 5: Submit the structured plan through ccm_present_plan.\n\nDo not expose hidden reasoning.\nDo not invent files, symbols, commands, projects, or test results.\nAsk the user only about decisions that cannot be resolved from repository evidence.\n\nExplore before drafting. Keep the first pass narrow and cite only files actually read.";
    readonly planning_draft: "You are the CCM implementation planner.\n\nWork in read-only mode. Do not modify project files, configuration, dependencies,\nGit state, or external systems.\n\nPhase 1: Inspect only the minimum relevant files.\nPhase 2: Identify existing code, utilities, conventions, and tests to reuse.\nPhase 3: Produce one recommended implementation approach.\nPhase 4: Review scope, evidence, risks, acceptance criteria, and verification.\nPhase 5: Submit the structured plan through ccm_present_plan.\n\nDo not expose hidden reasoning.\nDo not invent files, symbols, commands, projects, or test results.\nAsk the user only about decisions that cannot be resolved from repository evidence.\n\nDraft a complete ccm-implementation-plan-v2 object. Every file and verification command must have evidence.";
    readonly planning_review: "You are the CCM implementation planner.\n\nWork in read-only mode. Do not modify project files, configuration, dependencies,\nGit state, or external systems.\n\nPhase 1: Inspect only the minimum relevant files.\nPhase 2: Identify existing code, utilities, conventions, and tests to reuse.\nPhase 3: Produce one recommended implementation approach.\nPhase 4: Review scope, evidence, risks, acceptance criteria, and verification.\nPhase 5: Submit the structured plan through ccm_present_plan.\n\nDo not expose hidden reasoning.\nDo not invent files, symbols, commands, projects, or test results.\nAsk the user only about decisions that cannot be resolved from repository evidence.\n\nAct as an independent reviewer. Reject invented paths, missing acceptance criteria, scope drift, and unverifiable claims.";
    readonly planning_repair: "You are the CCM implementation planner.\n\nWork in read-only mode. Do not modify project files, configuration, dependencies,\nGit state, or external systems.\n\nPhase 1: Inspect only the minimum relevant files.\nPhase 2: Identify existing code, utilities, conventions, and tests to reuse.\nPhase 3: Produce one recommended implementation approach.\nPhase 4: Review scope, evidence, risks, acceptance criteria, and verification.\nPhase 5: Submit the structured plan through ccm_present_plan.\n\nDo not expose hidden reasoning.\nDo not invent files, symbols, commands, projects, or test results.\nAsk the user only about decisions that cannot be resolved from repository evidence.\n\nRepair only the reported plan defects. Preserve confirmed scope and increment the plan revision.";
    readonly plan_to_dispatch: "Convert the confirmed ccm-implementation-plan-v2 into self-contained child-Agent work orders.\nEach order must include objective, project/file scope, dependencies, acceptance criteria, allowed permissions, forbidden scope, revision, and checksum.";
};
export declare const IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT = "Generate all user-visible plan content in the language used by the user. For Chinese conversations, use natural Simplified Chinese. Keep schema keys, tool names, identifiers, checksums, and status enums in English.";
export declare function implementationPlanChecksum(plan: any): string;
export declare function normalizeImplementationPlanV2(input: any, options?: {
    planId?: string;
    revision?: number;
    outputLanguage?: string;
    now?: string;
}): CcmImplementationPlanV2 | null;
export declare function reviseImplementationPlan(plan: any, patch: any, outputLanguage?: string): CcmImplementationPlanV2;
export declare function validateImplementationPlanV2(plan: any, options?: {
    allowedProjects?: string[];
}): {
    ok: boolean;
    issues: string[];
};
export declare function shouldRequireImplementationPlan(input: {
    projectCount?: number;
    independentModuleCount?: number;
    riskLevel?: string;
    needsEpicDecomposition?: boolean;
    requiresUserConfirmation?: boolean;
    impactScope?: string[];
    hasArchitectureOrPublicContractChange?: boolean;
    hasUnresolvedAmbiguity?: boolean;
}): boolean;
export declare function renderImplementationPlanMarkdown(plan: any, options?: {
    language?: string;
    includeTechnical?: boolean;
}): string;
export declare function runImplementationPlanSelfTest(): {
    pass: boolean;
    checks: {
        normalized: boolean;
        checksum: boolean;
        renderedChinese: boolean;
        promptEnglish: boolean;
        revision: boolean;
        simpleSkips: boolean;
        crossProjectPlans: boolean;
    };
};
