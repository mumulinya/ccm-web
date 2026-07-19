import type { TestAgentReport, TestAgentVerdict } from "../../test-agent/types";
export declare function collectTestAgentBrowserNetworkLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserFlowLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserMultiSessionLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserAuthenticationLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserActionEffectLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserRecoveryLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentAdversarialEvidenceLines(report: TestAgentReport, verdict?: any): string[];
export declare function summarizeTestAgentBrowserFailedStep(step: any): string;
export declare function collectTestAgentBrowserTableLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserUploadLines(report: TestAgentReport, verdict?: any): string[];
export declare function collectTestAgentBrowserDownloadLines(report: TestAgentReport): string[];
export declare function collectTestAgentBrowserEvidenceSummaryLines(report: TestAgentReport, verdict?: any): any;
export declare function collectTestAgentVerificationLines(report: TestAgentReport, verdict?: TestAgentVerdict | null): string[];
export declare function collectTestAgentEvidenceLines(report: TestAgentReport): string[];
export declare function getTestAgentReviewedFiles(workOrder: any, report: TestAgentReport): string[];
export declare function buildNativeTestAgentReceipt(targetName: string, report: TestAgentReport, handoff?: any, workOrder?: any, invocationResult?: any): any;
export declare function buildNativeTestAgentReviewSummary(targetName: string, report: TestAgentReport, receipt: any): any;
export declare function formatNativeTestAgentOutput(targetName: string, report: TestAgentReport, receipt: any, handoff?: any): any;
export declare function summarizeNativeTestAgentExecutionPlan(plan: any): any;
export declare function buildNativeTestAgentPlanBlockedReceipt(targetName: string, plan: any, dispatch?: any, handoff?: any): any;
export declare function formatNativeTestAgentPlanBlockedOutput(targetName: string, plan: any, receipt: any, handoff?: any): any;
export declare function buildNativeTestAgentRuntimeToolContext(targetName: string, workDir: string): any;
export declare function buildCoordinatorReworkContinuationFallback(input: {
    reworkRoute?: any;
    mention?: any;
    sourceTask?: any;
    targetName: string;
    stopResult?: any;
}): any;
export declare function stopWrongDirectionWorkerForCoordinatorRoute(input: {
    taskId?: string;
    groupId: string;
    targetName: string;
    sourceProject: string;
    route: any;
    mention?: any;
    streamRes?: any;
}): any;
export declare function buildCoordinatorReworkFollowUp(item: any, input: {
    group: any;
    memorySnapshot: any;
    userMessage: string;
    coordinatorOutput: string;
    round: number;
    maxRounds: number;
    taskId?: string;
    sourceTask?: any;
}): any;
export declare function buildCoordinatorReworkTask(item: any, input: {
    userMessage: string;
    coordinatorOutput: string;
    round: number;
    maxRounds: number;
    previousLedger?: any;
    reworkRoute?: any;
}): any;
export declare function runCoordinatorReworkProtocolSelfTest(): any;
export declare const COORDINATOR_REVIEW_MAX_ROUNDS = 5;
/** Per review-subject cap for TestAgent rechecks (including provider-gap → Playwright reruns). */
export declare const TEST_AGENT_RECHECK_MAX_PER_SUBJECT = 2;
export declare function getTestAgentRecheckSubjectKey(item?: any): string;
export declare function isTestAgentRecheckFollowUp(item?: any): boolean;
/**
 * Enforce a per-subject recheck budget. Returns kept follow-ups and blocked subjects.
 * `counts` is mutated so callers can accumulate across coordinator rounds.
 */
export declare function applyTestAgentRecheckBudget(followUps?: any[], counts?: Map<string, number> | Record<string, number>, maxPerSubject?: number): {
    kept: any[];
    blocked: {
        subject: string;
        count: number;
        max: number;
        reason: string;
    }[];
    counts: Map<string, number>;
};
export declare function followUpTargetCompleted(outputs?: string[], targetName?: string): boolean;
export declare function scheduleTestAgentRecheckAfterFollowUps(followUps?: any[], outputs?: string[]): any[];
export declare function filterCoordinatorLlmFollowUpsAgainstHardRoutes(proposed?: any[], hardReviewFollowUps?: any[], hasScheduledTestAgentRecheck?: boolean): any[];
