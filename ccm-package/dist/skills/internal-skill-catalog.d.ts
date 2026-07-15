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
export type CcmInternalSkillName = typeof CCM_ROLE_SKILL_NAMES[keyof typeof CCM_ROLE_SKILL_NAMES];
export declare const CCM_INTERNAL_SKILL_CATALOG: ReadonlyArray<{
    name: CcmInternalSkillName;
    description: string;
}>;
export declare function isCcmInternalSkillName(name: any): name is CcmInternalSkillName;
export declare function assertCcmInternalSkillMutable(name: any, action?: string): void;
