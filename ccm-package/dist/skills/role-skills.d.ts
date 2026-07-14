export type CcmAgentRole = "global-agent" | "group-main-agent" | "project-child-agent" | "test-agent";
export type CcmAgentSkillPhase = "intake" | "planning" | "execution" | "review" | "summary" | "verification" | "release";
export declare const CCM_ROLE_SKILL_NAMES: {
    readonly global: "ccm-global-mission-lead";
    readonly group: "ccm-group-coordination-lead";
    readonly project: "ccm-project-delivery-worker";
    readonly test: "ccm-test-acceptance-verifier";
    readonly receipt: "ccm-delivery-receipt";
    readonly evidence: "ccm-acceptance-evidence";
    readonly requirementIntake: "ccm-requirement-intake";
    readonly taskDecomposition: "ccm-task-decomposition";
    readonly deliveryReviewRework: "ccm-delivery-review-rework";
    readonly projectSourceResearch: "ccm-project-source-research";
    readonly documentDrivenDelivery: "ccm-document-driven-delivery";
    readonly incidentDiagnosis: "ccm-incident-diagnosis";
    readonly frontendVisualQa: "ccm-frontend-visual-qa";
    readonly releaseReadiness: "ccm-release-readiness";
};
type RoleSkillName = typeof CCM_ROLE_SKILL_NAMES[keyof typeof CCM_ROLE_SKILL_NAMES];
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
        ordinaryGlobal: RoleSkillName[];
        ordinaryGroup: RoleSkillName[];
        globalWork: RoleSkillName[];
        groupWork: RoleSkillName[];
        groupReview: RoleSkillName[];
        contextualGroupWork: RoleSkillName[];
        projectWork: RoleSkillName[];
        incidentWork: RoleSkillName[];
        releaseWork: RoleSkillName[];
        testWork: RoleSkillName[];
    };
    installation: {
        installed: string[];
        available: string[];
    };
};
export {};
