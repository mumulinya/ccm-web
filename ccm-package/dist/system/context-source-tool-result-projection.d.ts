export type ContextSourceToolResultReferenceV1 = {
    schema: "ccm-context-source-tool-result-reference-v1";
    version: 1;
    toolName: string;
    sourceKinds: Array<"knowledge" | "shared_file" | "web">;
    sources: Array<{
        sourceKind: "knowledge" | "shared_file" | "web";
        sourceId: string;
        documentName: string;
        chunkIds: string[];
        revision: string;
        checksum: string;
        citations: string[];
        tokenCount: number;
    }>;
    queryChecksum: string;
    resultChecksum: string;
    tokenCount: number;
    truncated: boolean;
    complete: boolean;
    contentStored: false;
};
export declare function isContextSourceToolResult(toolName: any, value?: any): boolean;
export declare function buildContextSourceToolResultReference(toolNameInput: any, value: any, query?: any): ContextSourceToolResultReferenceV1 | null;
export declare function projectContextSourceToolResultForPersistence(toolName: any, value: any, query?: any): any;
export declare function contextSourceToolResultProjectionSelfTest(): {
    pass: boolean;
    knowledge: any;
    shared: any;
};
