export declare const CCM_EVIDENCE_POLICY_SCHEMA: "ccm-evidence-policy-v1";
export type CcmEvidencePolicyLevel = "none" | "lightweight" | "strict";
export type CcmEvidencePolicyV1 = {
    schema: typeof CCM_EVIDENCE_POLICY_SCHEMA;
    level: CcmEvidencePolicyLevel;
    source: "server_policy";
    reasons: string[];
    sourceGroundingRequired: boolean;
    perFileEvidenceRequired: boolean;
    verificationEvidenceRequired: boolean;
    contentStored: false;
};
export type EvidencePolicyInput = {
    requiresCodeChanges?: boolean;
    targetProjects?: unknown[];
    riskLevel?: unknown;
    hasArchitectureOrPublicContractChange?: boolean;
    hasPermissionOrSecurityChange?: boolean;
    hasMigration?: boolean;
    hasReleaseOrDeployment?: boolean;
    destructive?: boolean;
    scopeExpanded?: boolean;
    verificationModes?: unknown[];
    changeClass?: unknown;
    previousLevel?: CcmEvidencePolicyLevel;
};
export declare function resolveEvidencePolicy(input?: EvidencePolicyInput): CcmEvidencePolicyV1;
export declare function isPlanReviewPassed(verdict: unknown): verdict is "passed" | "passed_with_warnings";
export declare function runEvidencePolicySelfTest(): {
    pass: boolean;
    checks: {
        none: boolean;
        lightweight: boolean;
        strict: boolean;
        noDowngrade: boolean;
    };
};
