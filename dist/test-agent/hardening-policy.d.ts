export type TestAgentHardeningRiskTier = "lightweight" | "standard" | "interactive" | "critical";
export type TestAgentPlannerFallbackMode = "risk_based" | "always" | "never";
export type TestAgentIsolationMode = "sandbox_preferred" | "sandbox_required" | "strict_allowlist";
export type TestAgentSurfaceAuditMode = "strict" | "warn";
export type TestAgentPostReviewSpotCheckMode = "policy" | "required" | "off";
export type TestAgentHardeningPolicyV1 = {
    schema: "ccm-test-agent-hardening-policy-v1";
    version: 1;
    riskTier: TestAgentHardeningRiskTier;
    plannerFallbackMode: TestAgentPlannerFallbackMode;
    isolationMode: TestAgentIsolationMode;
    readonlyCapabilityInjection: boolean;
    surfaceAuditMode: TestAgentSurfaceAuditMode;
    runtimeFingerprintEnabled: boolean;
    postReviewSpotCheckMode: TestAgentPostReviewSpotCheckMode;
    requiresSurfaceAudit: boolean;
    requiresRuntimeFingerprint: boolean;
    requiresSpotCheck: boolean;
    checksum: string;
};
export declare function testAgentHardeningChecksum(value: any): string;
/** Project/group task overrides may only strengthen the global policy. */
export declare function resolveTestAgentHardeningConfig(globalConfig: any, task?: any): any;
export declare function inferTestAgentRiskTier(input: any): TestAgentHardeningRiskTier;
export declare function buildTestAgentHardeningPolicy(input?: {
    config?: any;
    task?: any;
    reviewPolicy?: any;
    riskTier?: TestAgentHardeningRiskTier;
}): TestAgentHardeningPolicyV1;
export declare function validateTestAgentHardeningPolicy(value: any): {
    valid: boolean;
    reason: string;
    policy: TestAgentHardeningPolicyV1 | null;
};
export declare function testAgentTierAtLeast(value: TestAgentHardeningRiskTier, minimum: TestAgentHardeningRiskTier): boolean;
export declare function plannerFallbackAllowed(input: {
    policy: TestAgentHardeningPolicyV1;
    hasDeterministicChecks: boolean;
    hasPredeclaredInteractiveChecks?: boolean;
    isolationReady?: boolean;
}): boolean;
export declare function isOperationalPlanningFailure(error: any): boolean;
export declare function runTestAgentHardeningPolicySelfTest(): {
    pass: boolean;
    standard: TestAgentHardeningPolicyV1;
    critical: TestAgentHardeningPolicyV1;
};
