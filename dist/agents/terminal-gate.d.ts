export declare function evaluateTerminalGate(input: any): {
    canComplete: boolean;
    issues: string[];
    status: string;
};
export declare function issueTerminalReceipt(input: any): {
    id: string;
    taskId: any;
    generation: any;
    completedWorkItemIds: any;
    satisfiedAcceptanceCriterionIds: any;
    evidenceIds: any;
    issuedBy: string;
    issuedAt: string;
    contentStored: boolean;
};
