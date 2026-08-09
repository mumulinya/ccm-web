import { EvidenceRecord } from "./unified-evidence-registry";
export declare const OPERATION_REGISTRY_SCHEMA: "ccm-operation-registry-v1";
export type OperationType = "read" | "query" | "test" | "build" | "lint" | "typecheck" | "diagnostic" | "side_effecting";
export type OperationRecord = {
    schema: typeof OPERATION_REGISTRY_SCHEMA;
    operationId: string;
    operationType: OperationType;
    fingerprint: string;
    normalizedArguments: any;
    scope: string;
    target: string;
    repoStateFingerprint: string;
    toolVersion: string;
    estimatorVersion: string;
    evidenceIds: string[];
    status: "running" | "succeeded" | "failed" | "invalidated";
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
};
export declare function buildOperationFingerprint(input: any): string;
export declare function reserveOperation(input: any): {
    record: OperationRecord;
    reused: boolean;
};
export declare function completeOperation(operationId: string, input?: {
    status?: "succeeded" | "failed" | "invalidated";
    evidenceIds?: string[];
}): OperationRecord;
export declare function findReusableOperation(input: any): OperationRecord | null;
export declare function attachOperationEvidence(operationId: string, evidence: EvidenceRecord | string): OperationRecord;
export declare function runOperationRegistrySelfTest(): {
    pass: boolean;
    first: {
        record: OperationRecord;
        reused: boolean;
    };
    reused: OperationRecord;
};
