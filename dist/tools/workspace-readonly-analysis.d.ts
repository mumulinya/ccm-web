export declare const WORKSPACE_ANALYSIS_TOOL_NAMES: Set<string>;
export type ReadonlyAnalysisIdentity = {
    scope: "project" | "group";
    scopeId: string;
    exactSessionId: string;
    generation: number;
    projectId: string;
};
export type CcmReadonlyAnalysisReceiptV1 = {
    schema: "ccm-readonly-analysis-receipt-v1";
    scope: "project" | "group";
    scopeId: string;
    exactSessionId: string;
    projectId: string;
    repoStateChecksum: string;
    evidenceRefs: string[];
    resultChecksum: string;
    truncated: boolean;
    contentStored: false;
};
type AnalysisInput = {
    name: string;
    args: any;
    identity: ReadonlyAnalysisIdentity;
    root: string;
    signal?: AbortSignal;
};
type ContractRow = {
    kind: "http_route" | "export" | "event" | "schema" | "migration" | "config";
    name: string;
    path: string;
    line: number;
};
export declare function executeWorkspaceReadonlyAnalysisTool(input: AnalysisInput): Promise<any>;
export declare function compareWorkspaceProjectContracts(input: {
    identity: Omit<ReadonlyAnalysisIdentity, "projectId">;
    left: {
        projectId: string;
        root: string;
    };
    right: {
        projectId: string;
        root: string;
    };
    args: any;
}): Promise<{
    safeReceipt: CcmReadonlyAnalysisReceiptV1;
    contentStored: boolean;
    leftProject: string;
    rightProject: string;
    shared: {
        contract: string;
        left: ContractRow;
        right: ContractRow;
    }[];
    onlyLeft: ContractRow[];
    onlyRight: ContractRow[];
    completeness: string;
    truncated: boolean;
}>;
export {};
