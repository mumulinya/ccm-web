export type CcmDelegatedInquiryStatusV2 = "queued" | "running" | "completed" | "partial" | "needs_input" | "failed";
export type CcmDelegatedInquiryOutcomeV2 = "completed" | "partial" | "needs_input" | "failed";
export type CcmDelegatedInquiryActionV2 = "continue_with_current" | "supplement_check" | "provide_clarification" | "promote_to_development";
export type CcmDelegatedInquiryProjectionV2 = {
    schema: "ccm-delegated-inquiry-projection-v2";
    inquiryId: string;
    revision: number;
    sourceScope: "global";
    sourceScopeId: "global";
    sourceSessionId: string;
    exactSessionId: string;
    generation: number;
    targetScope: "group" | "project";
    targetId: string;
    status: CcmDelegatedInquiryStatusV2;
    outcome?: CcmDelegatedInquiryOutcomeV2;
    questionSummary: string;
    evidenceCount: number;
    evidenceReferenceChecksum?: string;
    repoStateChecksums: Record<string, string>;
    missingEvidenceSummaries: string[];
    automaticSupplementAttempts: number;
    availableActions: CcmDelegatedInquiryActionV2[];
    conclusionSummary?: string;
    startedAt: string;
    completedAt?: string;
    checksum: string;
    contentStored: false;
};
export declare function delegatedInquiryId(input: {
    sourceSessionId: string;
    targetScope: "group" | "project";
    targetId: string;
    question: string;
}): string;
export declare function beginDelegatedInquiryProjection(input: {
    inquiryId?: string;
    sourceSessionId: string;
    targetScope: "group" | "project";
    targetId: string;
    question: string;
    generation?: number;
}): CcmDelegatedInquiryProjectionV2;
export declare function finishDelegatedInquiryProjection(input: {
    inquiryId: string;
    status: "completed" | "partial" | "needs_input" | "failed";
    evidenceCount?: number;
    evidenceIds?: string[];
    missingEvidenceSummaries?: string[];
    automaticSupplementAttempts?: number;
    conclusion?: string;
    repoStateChecksums?: Record<string, string>;
}): CcmDelegatedInquiryProjectionV2;
export declare function getDelegatedInquiryProjection(inquiryId: string): CcmDelegatedInquiryProjectionV2;
export declare function updateDelegatedInquiryProjection(input: {
    inquiryId: string;
    expectedRevision: number;
    actionKey?: string;
    patch: Partial<Pick<CcmDelegatedInquiryProjectionV2, "status" | "outcome" | "conclusionSummary" | "missingEvidenceSummaries" | "availableActions">>;
}): {
    projection: CcmDelegatedInquiryProjectionV2;
    replayed: boolean;
};
export declare function listDelegatedInquiryProjections(input?: {
    targetScope?: string;
    targetId?: string;
    sourceSessionId?: string;
    limit?: number;
}): CcmDelegatedInquiryProjectionV2[];
