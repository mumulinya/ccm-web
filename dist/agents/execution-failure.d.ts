export type ExecutionFailureType = "EXECUTION_FAILURE" | "VERIFICATION_FAILURE" | "PLAN_FAILURE" | "REPEATED_FAILURE" | "RESOURCE_FAILURE" | "AUTH_FAILURE";
export declare function classifyExecutionFailure(input: {
    stage?: string;
    errorKind?: string;
    message?: string;
    verification?: boolean;
}): ExecutionFailureType;
export declare function failureSignature(input: {
    type: ExecutionFailureType;
    criterionIds?: string[];
    repoStateFingerprint?: string;
    normalizedFailure?: string;
}): string;
export declare function shouldEscalateRepeatedFailure(signatures: string[], threshold?: number): boolean;
export declare function buildDeltaRepair(input: {
    taskId: string;
    workItemId: string;
    executionSessionId: string;
    attempt: number;
    failedCriterionIds: string[];
    evidenceIds: string[];
    failureSummary: string;
    allowedPaths: string[];
}): {
    schema: string;
    taskId: string;
    workItemId: string;
    executionSessionId: string;
    attempt: number;
    failedCriterionIds: string[];
    evidenceIds: string[];
    failureSummary: string;
    allowedPaths: string[];
    contentStored: boolean;
};
