import { type CcmSourceInquiryReceiptV1 } from "../../agents/source-inquiry-contract";
export type ProjectSourceInquiryResultV1 = {
    schema: "ccm-project-source-inquiry-result-v1";
    answer: string;
    receipt: CcmSourceInquiryReceiptV1;
    evidence: {
        project: string;
        manifestChecksum: string;
        manifestFiles: number;
        selectedPaths: string[];
        files: Array<{
            path: string;
            checksum: string;
            evidenceId: string;
            chars: number;
        }>;
    };
    missingEvidence: Array<{
        kind: "source" | "user_input";
        summary: string;
    }>;
    needsUserInput: boolean;
    cacheStatus: "fresh" | "reused";
    contentStored: false;
};
export declare function requestProjectSourceInquiry(input: {
    requestScope: "global" | "group" | "project" | "feishu";
    requestScopeId?: string;
    exactSessionId: string;
    project: string;
    question: string;
    readDepth?: "focused" | "broad";
    projectSessionId?: string;
    generation?: number;
    evidenceGaps?: string[];
    signal?: AbortSignal;
}): Promise<ProjectSourceInquiryResultV1>;
export declare function clearProjectSourceInquiryCache(input?: {
    project?: string;
    exactSessionId?: string;
}): number;
