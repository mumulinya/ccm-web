type SummaryQualityScope = "global" | "group" | "project" | "music" | "other";
export declare function evaluateSessionSummaryQuality(input: {
    scope: SummaryQualityScope;
    scopeId?: string;
    sessionId: string;
    summary: any;
    reference?: any;
    previousSummary?: any;
    sourceMessages?: any[];
    sourceMessageIds?: string[];
}): any;
export declare function runSessionSummaryQualityGateSelfTest(): {
    pass: any;
    checks: {
        validSummaryAccepted: any;
        lossySummaryRejected: boolean;
        contentStored: boolean;
    };
};
export {};
