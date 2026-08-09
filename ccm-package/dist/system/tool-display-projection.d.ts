declare const TOOL_DISPLAY_SCHEMA: "ccm-tool-display-detail-v1";
export type ToolDisplayDetailV1 = {
    schema: typeof TOOL_DISPLAY_SCHEMA;
    tool: {
        label: string;
        category: "builtin" | "mcp" | "skill" | "agent";
        serverLabel?: string;
        target?: string;
    };
    arguments: Array<{
        label: string;
        value: unknown;
    }>;
    result: {
        kind: "summary" | "list" | "table" | "text" | "locations" | "diagnostics" | "diff" | "empty" | "error";
        summary: string;
        rows?: unknown[];
        preview?: string;
        total?: number;
        truncated: boolean;
        nextCursor?: string;
        rehydratable?: boolean;
        freshness?: "current" | "drifted" | "deleted" | "permission_revoked";
        authoritativeRevision?: string;
    };
    contentStored: false;
};
export declare function buildToolDisplayDetail(input: {
    toolName: any;
    arguments?: any;
    result?: any;
    error?: any;
    transientBody?: boolean;
    freshness?: ToolDisplayDetailV1["result"]["freshness"];
    authoritativeRevision?: string;
}): ToolDisplayDetailV1;
export declare function isWorkspaceReadonlyToolName(value: any): boolean;
export {};
