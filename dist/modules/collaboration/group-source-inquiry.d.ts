export declare function requestGroupSourceInquiry(input: {
    group: any;
    exactSessionId: string;
    question: string;
    readDepth?: "focused" | "broad";
    projects?: string[];
    generation?: number;
    signal?: AbortSignal;
}): Promise<{
    answer: string;
    receipt: import("../../agents/source-inquiry-contract").CcmSourceInquiryReceiptV1;
    planningEvidenceEntries: any;
}>;
