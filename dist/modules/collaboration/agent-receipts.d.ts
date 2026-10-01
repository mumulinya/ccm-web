export declare function checkTaskCompletion(response: string): boolean;
export declare function checkTaskFailure(response: string): boolean;
export declare function extractRunnerVerificationEvidence(text: string): {
    status: string;
    verification: string[];
    failed: string[];
};
export declare function extractAgentReceipt(response: string, agent: string): any;
export declare function getReceiptAssignmentStatus(response: string, receipt: any): {
    status: string;
    text: string;
};
export declare function formatAgentReceiptForReview(receipt: any): string;
export declare function runAgentReceiptProviderDispatchOverrideFollowupSelfTest(): {
    pass: boolean;
    checks: {
        parsesProviderOverrideId: boolean;
        parsesHistoryReverifiedFlag: boolean;
        preservesCurrentSourceVerified: boolean;
        reviewShowsProviderEvidence: boolean;
    };
    row: any;
    review: string;
};
export declare function runAgentReceiptProviderSwitchExecutionSelfTest(): {
    pass: boolean;
    checks: {
        parsesDecisionReceiptId: boolean;
        parsesExpectedAndExecutedProvider: boolean;
        parsesSessionAndExecutionBinding: boolean;
        normalizesUsageState: boolean;
        reviewShowsSwitchExecution: boolean;
    };
    row: any;
    review: string;
};
