import { type TestAgentHardeningPolicyV1, type TestAgentHardeningRiskTier } from "./hardening-policy";
import type { NormalizedTestAgentWorkOrder, WorkOrderIssue } from "./types";
/**
 * The planner is an optional semantic aid.  The checks already present in a
 * handoff are the only checks that may be used by a fallback; this module keeps
 * that rule independent from the (large) execution and planner modules.
 */
export type TestAgentPlanningFallbackStatus = "model_applied" | "deterministic_fallback" | "degraded_blocked" | "blocked" | "environment_blocked";
export type TestAgentPlanningFailureClass = "none" | "provider_unavailable" | "invalid_json" | "invalid_handoff" | "safety_blocked" | "acceptance_uncovered" | "unknown";
export interface TestAgentPlanningReceiptV2 {
    schema: "ccm-test-agent-planning-receipt-v2";
    version: 2;
    status: TestAgentPlanningFallbackStatus;
    riskTier: TestAgentHardeningRiskTier;
    model: string;
    provider: string;
    deterministicFallback: boolean;
    /** snake_case alias retained for integrations that consume protocol fields. */
    deterministic_fallback: boolean;
    degraded: boolean;
    blocked: boolean;
    failureClass: TestAgentPlanningFailureClass;
    failureReason: string;
    coverageChecksum: string;
    policyChecksum: string;
    deterministicCheckCount: number;
    mappedCriteriaCount: number;
    criteriaCount: number;
    isolationStatus: string;
    isolationReady: boolean;
    decidedAt: string;
    checksum: string;
}
export interface TestAgentDeterministicCheckInventory {
    commands: string[];
    http: string[];
    browser: string[];
    all: string[];
    unsafeCommands: string[];
}
export interface TestAgentDeterministicCoverage {
    criteria: string[];
    mapped: Record<string, string[]>;
    unmapped: string[];
    inventory: TestAgentDeterministicCheckInventory;
    checksum: string;
}
export interface TestAgentPlannerFallbackDecision {
    allowed: boolean;
    status: "deterministic_fallback" | "environment_blocked" | "degraded_blocked" | "blocked";
    failureClass: TestAgentPlanningFailureClass;
    reason: string;
    policy: TestAgentHardeningPolicyV1;
    coverage: TestAgentDeterministicCoverage;
    isolationStatus: string;
    isolationReady: boolean;
}
/** Resolve the frozen policy when a caller did not persist one yet (v1 compatibility). */
export declare function resolveTestAgentHardeningPolicy(workOrder: NormalizedTestAgentWorkOrder): TestAgentHardeningPolicyV1;
/**
 * Build criterion-to-check mappings without guessing from natural-language
 * criterion text.  Explicit coversAcceptanceCriteria and structured evidence
 * plans are accepted; a bare requiredChecks entry is intentionally insufficient.
 */
export declare function buildTestAgentDeterministicCoverage(workOrder: NormalizedTestAgentWorkOrder): TestAgentDeterministicCoverage;
export declare function decideTestAgentPlannerFallback(input: {
    workOrder: NormalizedTestAgentWorkOrder;
    error: any;
    preexistingIssues?: WorkOrderIssue[];
}): TestAgentPlannerFallbackDecision;
export declare function buildTestAgentPlanningReceiptV2(input: {
    status: TestAgentPlanningFallbackStatus;
    riskTier: TestAgentHardeningRiskTier;
    error?: any;
    failureClass?: TestAgentPlanningFailureClass;
    semanticDecisionReceipt?: any;
    policy: TestAgentHardeningPolicyV1;
    coverage: TestAgentDeterministicCoverage;
    isolationStatus?: string;
    isolationReady?: boolean;
    modelFallbackName?: string;
}): TestAgentPlanningReceiptV2;
export declare function attachTestAgentPlanningMetadata(workOrder: NormalizedTestAgentWorkOrder, receipt: TestAgentPlanningReceiptV2, patch?: Record<string, any>): NormalizedTestAgentWorkOrder;
export declare function testAgentPlanningIsBlocked(workOrder: NormalizedTestAgentWorkOrder): boolean;
export declare function testAgentPlanningIsDegraded(workOrder: NormalizedTestAgentWorkOrder): boolean;
export declare function runTestAgentPlanningFallbackSelfTest(): {
    pass: boolean;
    standard: TestAgentPlannerFallbackDecision;
    critical: TestAgentPlannerFallbackDecision;
    invalid: TestAgentPlannerFallbackDecision;
};
