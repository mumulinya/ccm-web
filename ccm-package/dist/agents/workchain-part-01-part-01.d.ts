export declare const INTERNAL_TEXT_PATTERN: RegExp;
export declare const WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN: RegExp;
export declare const GENERIC_COMPLETION_REPLY_PATTERN: RegExp;
export type MainAgentWorkchainSurface = "group" | "global";
export interface MainAgentWorkchainInput {
    surface: MainAgentWorkchainSurface;
    mode?: string;
    status?: string;
    phase?: string;
    userText?: any;
    goal?: any;
    actionIds?: any[];
    steps?: any[];
    workers?: any[];
    executions?: any[];
    summary?: any;
    completion?: any;
    technical?: any;
    traceId?: string;
    taskId?: string;
    runId?: string;
    missionId?: string;
    supervisorId?: string;
    rawEvents?: any[];
}
export declare function compactText(value: any, max?: number): string;
export declare function compactMultilineText(value: any, max?: number): string;
export declare function sanitizeWorkchainTerminology(value: string): string;
export declare function stringList(value: any, limit?: number): string[];
export declare function narrativeList(value: any, limit?: number, fallback?: string): string[];
export declare function sanitizeTestAgentFailureText(value: any, fallback?: string, max?: number): string;
export declare function getIndependentReviewGateState(input: MainAgentWorkchainInput): {
    required: boolean;
    passed: boolean;
    failed: boolean;
    missing: boolean;
    needsUser: boolean;
    gate: any;
    failedEvidence: any[];
    testAgentFailures: {
        items: any[];
        failureLines: string[];
        diagnosticLines: string[];
        hasRework: boolean;
        hasNeedsUser: boolean;
        primaryLine: string;
    };
    testAgentCoverage: {
        sources: any[];
        failedLines: string[];
        unknownLines: string[];
        weakLines: string[];
    };
    testAgentBrowserFlows: {
        summaries: import("./test-agent-review-bridge").MainAgentBrowserFlowReviewSummary[];
        evidenceLines: string[];
        failedLines: string[];
        incompleteLines: string[];
    };
    testAgentMultiSessionBrowser: {
        summaries: import("./test-agent-review-bridge").MainAgentBrowserMultiSessionReviewSummary[];
        evidenceLines: string[];
        failedLines: string[];
        incompleteLines: string[];
    };
    testAgentBrowserAuthentication: {
        summaries: import("./test-agent-review-bridge").MainAgentBrowserAuthenticationReviewSummary[];
        evidenceLines: string[];
        failedLines: string[];
        incompleteLines: string[];
    };
    testAgentBrowserActionEffects: {
        summaries: import("./test-agent-review-bridge").MainAgentBrowserActionEffectReviewSummary[];
        evidenceLines: string[];
        failedLines: string[];
        recheckLines: string[];
    };
    testAgentBrowserRecovery: {
        summaries: import("./test-agent-review-bridge").MainAgentBrowserRecoveryReviewSummary[];
        evidenceLines: string[];
        recheckLines: string[];
    };
    testAgentAdversarialEvidence: {
        summaries: import("./test-agent-review-bridge").MainAgentAdversarialEvidenceReviewSummary[];
        evidenceLines: string[];
        failedLines: string[];
        recheckLines: string[];
        blockedLines: string[];
    };
    testAgentBrowserProviderGaps: {
        count: number;
        lines: string[];
        hasGaps: boolean;
        recheckLines: string[];
    };
    failedText: string;
    riskText: string;
    nextAction: string;
    needsRecheck: boolean;
    needsEnvironment: boolean;
};
export declare function getPostReviewSpotCheckState(input: MainAgentWorkchainInput): {
    required: boolean;
    passed: boolean;
    failed: boolean;
    needsUser: boolean;
    missing: boolean;
    gate: any;
    spotCheck: any;
    summary: any;
    failedText: string;
    nextAction: string;
};
export declare function collectAcceptanceEvidence(input: MainAgentWorkchainInput): string[];
export declare function collectIndependentReviewEvidence(input: MainAgentWorkchainInput): string[];
export declare function checkpointStatus(status: any): "failed" | "pending" | "done" | "active" | "warning";
export declare function normalizeWorkchainTodoSteps(input: MainAgentWorkchainInput, stages: any[], terminal: boolean): {
    id: string;
    content: string;
    label: string;
    activeForm: string;
    active_form: string;
    status: string;
    detail: string;
    source: string;
}[];
export declare function buildWorkchainTodoVerificationReminder(input: MainAgentWorkchainInput, steps: any[], evidence: ReturnType<typeof collectCompletionEvidence>, terminal: boolean): {
    schema: string;
    status: string;
    title: string;
    headline: string;
    reason: string;
    next_action: string;
    display_policy: {
        user_text_first: boolean;
        technical_default_collapsed: boolean;
        hide_internal_protocols: boolean;
        show_for_ordinary_conversation: boolean;
    };
};
export declare function applyQualityFollowupTodoStep(steps: any[], qualityFollowup: any): any[];
export declare function sanitizeWorkchainUserText(value: any, fallback?: string, max?: number): string;
export declare function collectCompletionEvidence(input: MainAgentWorkchainInput): {
    files: any[];
    verification: string[];
    acceptance: string[];
    independentReview: string[];
    independentReviewGate: {
        required: boolean;
        passed: boolean;
        failed: boolean;
        missing: boolean;
        needsUser: boolean;
        gate: any;
        failedEvidence: any[];
        testAgentFailures: {
            items: any[];
            failureLines: string[];
            diagnosticLines: string[];
            hasRework: boolean;
            hasNeedsUser: boolean;
            primaryLine: string;
        };
        testAgentCoverage: {
            sources: any[];
            failedLines: string[];
            unknownLines: string[];
            weakLines: string[];
        };
        testAgentBrowserFlows: {
            summaries: import("./test-agent-review-bridge").MainAgentBrowserFlowReviewSummary[];
            evidenceLines: string[];
            failedLines: string[];
            incompleteLines: string[];
        };
        testAgentMultiSessionBrowser: {
            summaries: import("./test-agent-review-bridge").MainAgentBrowserMultiSessionReviewSummary[];
            evidenceLines: string[];
            failedLines: string[];
            incompleteLines: string[];
        };
        testAgentBrowserAuthentication: {
            summaries: import("./test-agent-review-bridge").MainAgentBrowserAuthenticationReviewSummary[];
            evidenceLines: string[];
            failedLines: string[];
            incompleteLines: string[];
        };
        testAgentBrowserActionEffects: {
            summaries: import("./test-agent-review-bridge").MainAgentBrowserActionEffectReviewSummary[];
            evidenceLines: string[];
            failedLines: string[];
            recheckLines: string[];
        };
        testAgentBrowserRecovery: {
            summaries: import("./test-agent-review-bridge").MainAgentBrowserRecoveryReviewSummary[];
            evidenceLines: string[];
            recheckLines: string[];
        };
        testAgentAdversarialEvidence: {
            summaries: import("./test-agent-review-bridge").MainAgentAdversarialEvidenceReviewSummary[];
            evidenceLines: string[];
            failedLines: string[];
            recheckLines: string[];
            blockedLines: string[];
        };
        testAgentBrowserProviderGaps: {
            count: number;
            lines: string[];
            hasGaps: boolean;
            recheckLines: string[];
        };
        failedText: string;
        riskText: string;
        nextAction: string;
        needsRecheck: boolean;
        needsEnvironment: boolean;
    };
    postReviewSpotCheck: {
        required: boolean;
        passed: boolean;
        failed: boolean;
        needsUser: boolean;
        missing: boolean;
        gate: any;
        spotCheck: any;
        summary: any;
        failedText: string;
        nextAction: string;
    };
    receipts: number;
    workersDone: number;
    evidence: string[];
    risks: string[];
};
export declare function hasExecutableWorkEvidence(input: MainAgentWorkchainInput, evidence: ReturnType<typeof collectCompletionEvidence>): boolean;
export declare function hasStrongWorkchainVerificationEvidence(evidence: ReturnType<typeof collectCompletionEvidence>): boolean;
export declare function workchainVerificationFailureText(item: any): boolean;
export declare function isBareWorkchainAcceptanceLine(item: any): boolean;
export declare function workchainAcceptanceFailureText(item: any): boolean;
