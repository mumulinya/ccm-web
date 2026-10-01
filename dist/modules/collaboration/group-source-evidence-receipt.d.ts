export declare function buildSafeGroupSourceInquiryReceipt(input: {
    group: any;
    exactSessionId: string;
    readDepth: "focused" | "broad";
    authorizedProjectIds: string[];
    toolResults?: any[];
    findings?: string[];
}): {
    checksum: string;
    schema: string;
    groupId: string;
    exactSessionId: string;
    readDepth: "focused" | "broad";
    targetProjects: string[];
    evidence: {
        evidenceId: string;
        project: string;
        path: string;
        checksum: string;
        from: number;
        to: number;
        contentStored: boolean;
    }[];
    findings: string[];
    sufficient: boolean;
    contentStored: boolean;
};
