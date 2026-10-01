import { type CcmSourceInquiryReceiptV1 } from "../agents/source-inquiry-contract";
type PlanningEvidenceEntry = {
    evidenceId: string;
    project: string;
    path: string;
    checksum: string;
    from: number;
    to: number;
    source: "source_read";
    contentStored: false;
};
export type RecoverableDelegatedInquiryResult = {
    answer: string;
    receipt: CcmSourceInquiryReceiptV1;
    planningEvidenceEntries: PlanningEvidenceEntry[];
    missingEvidenceSummaries: string[];
    needsUserInput: boolean;
    automaticSupplementAttempts: number;
    cacheStatus?: string;
    contentStored: false;
};
export declare function requestRecoverableProjectSourceInquiry(input: {
    requestScope: "global" | "group" | "project" | "feishu";
    exactSessionId: string;
    project: string;
    question: string;
    readDepth?: "focused" | "broad";
    generation?: number;
    automaticSupplement?: boolean;
    signal?: AbortSignal;
}): Promise<RecoverableDelegatedInquiryResult>;
export declare function requestRecoverableGroupSourceInquiry(input: {
    group: any;
    exactSessionId: string;
    question: string;
    readDepth?: "focused" | "broad";
    projects?: string[];
    generation?: number;
    automaticSupplement?: boolean;
    signal?: AbortSignal;
}): Promise<RecoverableDelegatedInquiryResult>;
export {};
