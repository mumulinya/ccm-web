export declare const FAILURE_RECORD_SCHEMA: "ccm-failure-record-v1";
export type FailureType = "execution_failure" | "verification_failure" | "plan_failure" | "environment_failure" | "resource_failure" | "authorization_failure" | "repeated_failure";
export type FailureRecord = {
    schema: typeof FAILURE_RECORD_SCHEMA;
    failureId: string;
    taskId: string;
    workItemId: string;
    criterionIds: string[];
    failureType: FailureType;
    repairScope: {
        allowedFiles: string[];
        forbiddenFiles: string[];
        unresolvedCriteria: string[];
    };
    observedEvidenceIds: string[];
    recommendedAction: string;
    attempt: number;
    fingerprint: string;
    status: "open" | "repaired" | "escalated" | "ignored";
    createdAt: string;
    updatedAt: string;
};
export declare function classifyFailure(input: any): FailureType;
export declare function normalizeFailureRecord(input: any): FailureRecord;
export declare function recordFailure(input: any): FailureRecord;
export declare function listFailures(filter?: any): FailureRecord[];
export declare function markFailure(failureId: string, status: FailureRecord["status"]): FailureRecord;
export declare function runFailureRecordSelfTest(): {
    pass: boolean;
    record: FailureRecord;
};
