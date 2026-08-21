export declare const CCM_COMPLETION_SUMMARY_SCHEMA: "ccm-completion-summary-v1";
export type CcmCompletionSummaryStatus = "success" | "failed" | "blocked" | "cancelled" | "interrupted" | "waiting" | "partial";
export type CcmCompletionSummaryV1 = {
    schema: typeof CCM_COMPLETION_SUMMARY_SCHEMA;
    status: CcmCompletionSummaryStatus;
    headline: string;
    detail?: string;
    filesChanged: number;
    additions?: number;
    deletions?: number;
    verificationPassed: number;
    verificationFailed: number;
    nextAction?: string;
    blockers: string[];
    durationMs?: number;
    source: "terminal_gate" | "query_projection";
    contentStored: false;
};
export declare function buildCcmCompletionSummary(input?: any): CcmCompletionSummaryV1;
