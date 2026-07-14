import { CcmInternalSkillName } from "./internal-skill-catalog";
export { CCM_ROLE_SKILL_NAMES } from "./internal-skill-catalog";
export type CcmAgentRole = "global-agent" | "group-main-agent" | "project-child-agent" | "test-agent";
export type CcmAgentSkillPhase = "intake" | "planning" | "execution" | "review" | "summary" | "verification" | "release";
type RoleSkillName = CcmInternalSkillName;
export interface SelectedRoleSkill {
    name: RoleSkillName;
    role: CcmAgentRole;
    kind: "role" | "shared" | "workflow";
    reason: string;
    packagePath: string;
    skillPath: string;
    body: string;
}
export interface RoleSkillSelectionOptions {
    forceWork?: boolean;
    source?: string;
    maxSkills?: number;
    phase?: CcmAgentSkillPhase;
}
export declare function ensureRoleSkillsInstalled(options?: {
    force?: boolean;
}): {
    installed: string[];
    available: string[];
};
export declare function isRoleSkillWorkRequest(message?: string, options?: RoleSkillSelectionOptions): boolean;
export declare function selectRoleSkills(role: CcmAgentRole, taskText?: string, options?: RoleSkillSelectionOptions): SelectedRoleSkill[];
export declare function buildSelectedSkillUsageDirective(selected: Array<Pick<SelectedRoleSkill, "name" | "reason">>): string;
export declare function buildRoleSkillPrompt(role: CcmAgentRole, taskText?: string, options?: RoleSkillSelectionOptions): {
    names: string[];
    prompt: string;
    selected: SelectedRoleSkill[];
};
export declare function runRoleSkillSelectionSelfTest(): {
    pass: boolean;
    checks: {
        allPackagesInstalled: boolean;
        ordinaryGlobalLoadsNoWorkSkills: boolean;
        ordinaryGroupLoadsNoWorkSkills: boolean;
        globalGetsOnlyRelevantSkills: boolean;
        groupGetsCoordinatorAndDecomposition: boolean;
        groupReviewGetsReviewAndReceipt: boolean;
        contextualExecutionLoadsGroupSkill: boolean;
        projectGetsSourceReceiptAndMatchedWorkflows: boolean;
        incidentTaskGetsDiagnosis: boolean;
        releaseTaskGetsReadiness: boolean;
        testAgentGetsVerifierEvidenceAndVisualQa: boolean;
        selectionBudgetBounded: boolean;
        usageDirectiveRequiresApplicationAndReceipt: boolean;
    };
    selections: {
        ordinaryGlobal: CcmInternalSkillName[];
        ordinaryGroup: CcmInternalSkillName[];
        globalWork: CcmInternalSkillName[];
        groupWork: CcmInternalSkillName[];
        groupReview: CcmInternalSkillName[];
        contextualGroupWork: CcmInternalSkillName[];
        projectWork: CcmInternalSkillName[];
        incidentWork: CcmInternalSkillName[];
        releaseWork: CcmInternalSkillName[];
        testWork: CcmInternalSkillName[];
    };
    installation: {
        installed: string[];
        available: string[];
    };
};
