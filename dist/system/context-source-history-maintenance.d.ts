export declare function previewContextSourceMaintenance(input: any): {
    success: boolean;
    schema: any;
    identity: any;
    planChecksum: any;
    affectedRecordCount: any;
    estimatedRemovedBodyTokens: any;
    promotionBackfillCount: any;
    unresolvedCount: any;
    files: any;
    promotionIds: any;
    idempotencyRecordCount: any;
    traceRecordCount: any;
    encryptedTranscriptRecordCount: number;
    contentStored: boolean;
};
export declare function applyContextSourceMaintenance(input: any): {
    success: boolean;
    jobId: string;
    status: string;
    affectedRecordCount: any;
    estimatedRemovedBodyTokens: any;
    promotionResults: any[];
    idempotencyRecordCount: any;
    traceRecordCount: any;
    encryptedTranscriptRecordCount: any;
    contentStored: boolean;
};
export declare function rollbackContextSourceMaintenance(input: any): {
    success: boolean;
    jobId: string;
    status: string;
    restoredFileCount: number;
    idempotent: boolean;
    contentStored: boolean;
    restoredIdempotencyCount?: undefined;
    restoredTraceCount?: undefined;
    restoredTranscriptCount?: undefined;
} | {
    success: boolean;
    jobId: string;
    status: any;
    restoredFileCount: number;
    restoredIdempotencyCount: number;
    restoredTraceCount: number;
    restoredTranscriptCount: number;
    contentStored: boolean;
    idempotent?: undefined;
};
export declare function contextSourceHistoryMaintenanceSelfTest(): {
    pass: boolean;
    projected: {
        changed: number;
        removedTokens: number;
        unresolved: number;
    };
};
