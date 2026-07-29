export type TestAgentReviewTier = "lightweight" | "standard" | "interactive" | "critical";
export type TestAgentFailureRoute = "accept" | "implementation_rework" | "test_agent_recheck" | "environment" | "needs_user";
export type TestAgentEvidenceType = "code_diff" | "command" | "http" | "browser" | "artifact";
export type TestAgentAcceptanceEvidence = {
    criterion: string;
    observableOutcome: string;
    evidenceTypes: TestAgentEvidenceType[];
    target: string;
};
export type TestAgentVerificationProfile = {
    tier: TestAgentReviewTier;
    changeClass: "documentation" | "configuration" | "code" | "interactive" | "critical";
    reason: string;
};
export type TestAgentReviewPolicy = {
    schema: "ccm-test-agent-review-policy-v1";
    tier: TestAgentReviewTier;
    reason: string;
    requiredChecks: string[];
    browserEnabled: boolean;
    httpEnabled: boolean;
    requireAdversarialProbe: boolean;
    collectBrowserArtifacts: boolean;
    autoDiscoverVerificationCommands: boolean;
};
export type TestAgentIncrementalScope = {
    schema: "ccm-test-agent-incremental-scope-v1";
    mode: "full" | "incremental";
    round: number;
    acceptanceCriteria: string[];
    focusedAcceptanceCriteria: string[];
    coreRegressionCriteria: string[];
    verificationCommands: string[];
    focusedCommands: string[];
    coreRegressionCommands: string[];
    browserCheckNames: string[];
};
export declare function normalizeTestAgentAcceptanceEvidencePlan(value: any): TestAgentAcceptanceEvidence[];
export declare function normalizeTestAgentVerificationProfile(value: any): TestAgentVerificationProfile;
export declare function deriveTestAgentReviewPolicy(input: {
    profile?: Partial<TestAgentVerificationProfile> | null;
    workflowDecision?: any;
    evidencePlan?: TestAgentAcceptanceEvidence[];
    hasTestTarget?: boolean;
}): TestAgentReviewPolicy;
export declare function buildTestAgentIncrementalScope(input: {
    round: number;
    acceptanceCriteria: string[];
    verificationCommands: string[];
    previousReview?: any;
}): TestAgentIncrementalScope;
export declare function classifyTestAgentReview(review: any): {
    route: TestAgentFailureRoute;
    reason: string;
};
export declare function runTestAgentReviewPolicySelfTest(): {
    pass: boolean;
    evidencePlan: TestAgentAcceptanceEvidence[];
    policy: TestAgentReviewPolicy;
    scope: TestAgentIncrementalScope;
    environment: {
        route: TestAgentFailureRoute;
        reason: string;
    };
};
