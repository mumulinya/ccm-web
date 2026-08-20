export declare const CCM_PLANNING_SESSION_SCHEMA: "ccm-planning-session-v1";
export declare const CCM_PLAN_REVIEW_RECEIPT_SCHEMA: "ccm-plan-review-receipt-v1";
export type PlanningIntensity = "focused" | "coordinated" | "critical";
export type PlanningPhase = "exploring" | "drafting" | "reviewing" | "repairing" | "awaiting_user" | "confirmed" | "invalidated";
export type PlanningEvidenceEntry = {
    evidenceId: string;
    project: string;
    path: string;
    checksum: string;
    from: number;
    to: number;
    source: "source_read" | "tool_result";
    contentStored: false;
};
export type PlanningEvidenceManifest = {
    schema: "ccm-planning-evidence-manifest-v1";
    entries: PlanningEvidenceEntry[];
    checksum: string;
    contentStored: false;
};
export type CcmPlanReviewReceiptV1 = {
    schema: typeof CCM_PLAN_REVIEW_RECEIPT_SCHEMA;
    verdict: "passed" | "repair_required" | "blocked";
    issues: Array<{
        code: string;
        message: string;
        stepId?: string;
    }>;
    evidenceCoverage: number;
    acceptanceCoverage: number;
    verificationCoverage: number;
    reviewerBindingChecksum: string;
    checksum: string;
    contentStored: false;
};
export type CcmPlanningSessionV1 = {
    schema: typeof CCM_PLANNING_SESSION_SCHEMA;
    planningId: string;
    scope: "project" | "group" | "global";
    scopeId: string;
    exactSessionId: string;
    intensity: PlanningIntensity;
    phase: PlanningPhase;
    planId: string;
    revision: number;
    planChecksum: string;
    sourceManifestChecksum: string;
    evidenceManifestChecksum: string;
    reviewReceiptChecksum?: string;
    promptVersion: string;
    promptTurn: number;
    plan?: any;
    evidenceManifest?: PlanningEvidenceManifest;
    reviewReceipt?: CcmPlanReviewReceiptV1;
    updatedAt: string;
    contentStored: false;
};
export declare function resolvePlanningIntensity(input: any): PlanningIntensity;
export declare function planningAgentLimits(intensity: PlanningIntensity): {
    exploreAgents: number;
    planCandidates: number;
    independentReview: boolean;
};
export declare function buildPlanningEvidenceManifest(rows: any[]): PlanningEvidenceManifest;
export declare function planningEvidenceManifestFromToolResults(rows: any[]): PlanningEvidenceManifest;
export declare function planningPromptForTurn(promptTurn: number): {
    kind: "full" | "sparse";
    prompt: string;
};
export declare function openPlanningSession(input: any): CcmPlanningSessionV1;
export declare function updatePlanningSession(session: CcmPlanningSessionV1, patch: Partial<CcmPlanningSessionV1>): CcmPlanningSessionV1;
export declare function latestPlanningSession(scope: CcmPlanningSessionV1["scope"], scopeId: string, exactSessionId: string): CcmPlanningSessionV1;
export declare function confirmPlanningSession(input: {
    scope: CcmPlanningSessionV1["scope"];
    scopeId: string;
    exactSessionId: string;
    planRevision: number;
    planChecksum: string;
}): {
    ok: false;
    code: string;
    session?: undefined;
} | {
    ok: false;
    code: string;
    session: CcmPlanningSessionV1;
} | {
    ok: true;
    session: CcmPlanningSessionV1;
    code?: undefined;
};
export declare function buildPlanReviewReceipt(input: {
    plan: any;
    evidenceManifest: PlanningEvidenceManifest;
    reviewer?: any;
    blocked?: boolean;
}): CcmPlanReviewReceiptV1;
export declare function planningReviewPrompt(plan: any, evidenceManifest: PlanningEvidenceManifest): string;
export declare function planningRepairPrompt(plan: any, receipt: CcmPlanReviewReceiptV1, evidenceManifest: PlanningEvidenceManifest): string;
export declare function runPlanningOrchestratorSelfTest(): {
    pass: boolean;
    checks: {
        intensity: PlanningIntensity;
        evidence: number;
        receipt: "blocked" | "passed" | "repair_required";
    };
};
