export type MainAgentIdentityOptions = {
    planAuthoring?: boolean;
    sessionDirective?: string;
    roleSkillsPrompt?: string;
};
export declare function buildGroupMainSessionGuidance(options?: {
    planAuthoring?: boolean;
}): string;
export declare const GROUP_MAIN_SESSION_CONTEXT_GUIDANCE: string;
export declare function buildProjectMainSessionGuidance(options?: {
    planAuthoring?: boolean;
}): string;
export declare const PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE: string;
export declare function buildGlobalMainSessionGuidance(options?: {
    planAuthoring?: boolean;
}): string;
export declare const GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE: string;
export declare function buildGlobalMainIdentityRules(input?: MainAgentIdentityOptions): string;
export declare function buildGroupMainIdentityRules(input?: MainAgentIdentityOptions & {
    projectBrief?: string;
    extraInstructions?: string;
}): string;
export declare function buildProjectMainIdentityRules(input: MainAgentIdentityOptions & {
    project: string;
    continuationNote?: string;
    forcedRoute?: string;
}): string;
export declare function runMainAgentIdentitySelfTest(): {
    pass: boolean;
    checks: {
        groupHasFourSections: boolean;
        groupDropsInternalActionCatalog: boolean;
        groupKeepsHardBoundaries: boolean;
        groupAgentOmitsPlanSkillPointer: boolean;
        groupPlanInjectsSkillPointer: boolean;
        firstPlanLineOnce: boolean;
        projectHasFourSections: boolean;
        sharedToolCatalog: boolean;
        projectKeepsCodeAuthority: boolean;
        projectAgentOmitsPlanSkillPointer: boolean;
        projectPlanInjectsSkillPointer: boolean;
        sessionGuidanceHasNoShapeEssay: boolean;
        defaultExportsAreAgentMode: boolean;
        globalHasFourSections: boolean;
        globalDropsSchemaDump: boolean;
        globalKeepsControlTools: boolean;
        globalDefersManagementTools: boolean;
        globalOmitsDispatchAndPlanMode: boolean;
        globalToolSectionDiffersFromGroup: boolean;
    };
};
