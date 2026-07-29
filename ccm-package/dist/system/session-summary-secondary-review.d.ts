export declare function reviewSessionSummaryIfSelected(input: {
    config: any;
    scope: string;
    scopeId?: string;
    sessionId: string;
    boundaryGeneration?: number;
    summary: any;
    reference?: any;
    sourceMessageIds?: string[];
    deterministicQuality?: any;
    modelCall?: (config: any, request: any) => Promise<any>;
}): Promise<any>;
export declare function runSessionSummarySecondaryReviewSelfTest(): Promise<{
    pass: boolean;
    checks: {
        disabledHasNoCall: boolean;
        selectedPasses: any;
    };
}>;
