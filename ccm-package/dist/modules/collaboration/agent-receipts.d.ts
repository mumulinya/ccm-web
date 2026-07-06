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
