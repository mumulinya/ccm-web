export type CcmSourceAccessRoute = "none" | "project_local_tools" | "group_project_coordination" | "global_project_delegation";
export type CcmSourceInquiryProjectReceiptV1 = {
    project: string;
    projectSessionId: string;
    readDepth: "focused" | "broad";
    evidenceIds: string[];
    paths: string[];
    findings: string[];
    sufficient: boolean;
    repoStateChecksum: string;
    checksum: string;
};
export type CcmSourceInquiryReceiptV1 = {
    schema: "ccm-source-inquiry-receipt-v1";
    requestScope: "global" | "group" | "project" | "feishu";
    accessRoute: CcmSourceAccessRoute;
    scope: "global" | "group" | "project";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    targetProjects: string[];
    projectReceipts: CcmSourceInquiryProjectReceiptV1[];
    sufficient: boolean;
    reason: string;
    checksum: string;
    contentStored: false;
};
export declare function buildSourceInquiryProjectReceipt(input: Omit<CcmSourceInquiryProjectReceiptV1, "checksum" | "repoStateChecksum"> & {
    repoStateChecksum?: string;
}): CcmSourceInquiryProjectReceiptV1;
export declare function buildSourceInquiryReceipt(input: Omit<CcmSourceInquiryReceiptV1, "schema" | "checksum" | "contentStored" | "scope" | "scopeId" | "generation"> & {
    scope?: "global" | "group" | "project";
    scopeId?: string;
    generation?: number;
}): CcmSourceInquiryReceiptV1;
export declare function sourceAccessRouteForScope(scope: "global" | "group" | "project" | "feishu"): CcmSourceAccessRoute;
