export interface MainAgentBrowserFlowReviewSummary {
    total: number;
    passedCount: number;
    failedCount: number;
    blockedCount: number;
    skippedCount: number;
    criteriaCount: number;
    actionCount: number;
    assertionCount: number;
    failedStepCount: number;
    headline: string;
    evidenceLines: string[];
    failedLines: string[];
    incompleteLines: string[];
    raw: any;
}
export interface MainAgentBrowserMultiSessionReviewSummary {
    total: number;
    passedCount: number;
    failedCount: number;
    blockedCount: number;
    skippedCount: number;
    sessionCount: number;
    uniqueSessionCount: number;
    parallelGroupCount: number;
    comparisonCount: number;
    failedComparisonCount: number;
    actionCount: number;
    assertionCount: number;
    failedStepCount: number;
    headline: string;
    evidenceLines: string[];
    failedLines: string[];
    incompleteLines: string[];
    raw: any;
}
export interface MainAgentBrowserAuthenticationReviewSummary {
    configuredChecks: number;
    passedChecks: number;
    failedChecks: number;
    blockedChecks: number;
    pendingChecks: number;
    authenticatedSessions: number;
    headline: string;
    evidenceLines: string[];
    failedLines: string[];
    incompleteLines: string[];
    raw: any;
}
export interface MainAgentBrowserActionEffectReviewSummary {
    checks: number;
    actions: number;
    changed: number;
    unchanged: number;
    unavailable: number;
    failed: number;
    crossSession: number;
    headline: string;
    evidenceLines: string[];
    failedLines: string[];
    recheckLines: string[];
    raw: any;
}
export interface MainAgentBrowserRecoveryReviewSummary {
    checks: number;
    attempted: number;
    recovered: number;
    failed: number;
    notRetried: number;
    headline: string;
    evidenceLines: string[];
    recheckLines: string[];
    raw: any;
}
export interface MainAgentAdversarialEvidenceReviewSummary {
    status: "verified" | "failed" | "blocked" | "missing" | "unlinked" | "waived";
    required: boolean;
    waived: boolean;
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    relevant: number;
    unlinked: number;
    passedRelevant: number;
    headline: string;
    evidenceLines: string[];
    failedLines: string[];
    recheckLines: string[];
    blockedLines: string[];
    raw: any;
}
export interface MainAgentSafeBrowserAuthenticationSummary {
    configuredChecks: number;
    passedChecks: number;
    failedChecks: number;
    blockedChecks: number;
    authenticatedSessions: number;
}
export declare function summarizeTestAgentBrowserActionEffects(...sources: any[]): MainAgentBrowserActionEffectReviewSummary | null;
export declare function summarizeTestAgentBrowserRecovery(...sources: any[]): MainAgentBrowserRecoveryReviewSummary | null;
export declare function summarizeTestAgentAdversarialEvidence(...sources: any[]): MainAgentAdversarialEvidenceReviewSummary | null;
export declare function summarizeTestAgentBrowserAuthentication(...sources: any[]): MainAgentBrowserAuthenticationReviewSummary | null;
export declare function compactTestAgentBrowserAuthenticationSummary(summary: MainAgentBrowserAuthenticationReviewSummary | null | undefined): MainAgentSafeBrowserAuthenticationSummary | null;
export declare function summarizeTestAgentMultiSessionBrowser(...sources: any[]): MainAgentBrowserMultiSessionReviewSummary | null;
export declare function summarizeTestAgentBrowserFlows(...sources: any[]): MainAgentBrowserFlowReviewSummary | null;
export declare function runTestAgentReviewBridgeSelfTest(): {
    recognized: boolean;
    userReadable: boolean;
    hidesRawSteps: boolean;
    passed: boolean;
};
