declare const TOOL_DISPLAY_SCHEMA: "ccm-tool-display-detail-v1";
export type ToolDisplayFamily = "read" | "search" | "symbol" | "git" | "verify" | "terminal" | "agent" | "external" | "other";
export type ToolDisplayDetailV1 = {
    schema: typeof TOOL_DISPLAY_SCHEMA;
    tool: {
        name?: string;
        label: string;
        userLabel?: string;
        family?: ToolDisplayFamily;
        category: "builtin" | "mcp" | "skill" | "agent";
        serverLabel?: string;
        target?: string;
    };
    sensitiveCommand?: string;
    arguments: Array<{
        label: string;
        value: unknown;
    }>;
    result: {
        kind: "summary" | "list" | "table" | "text" | "locations" | "diagnostics" | "diff" | "empty" | "error";
        summary: string;
        rows?: unknown[];
        fileRows?: Array<{
            path: string;
            status: "completed" | "partial" | "unchanged" | "failed";
            from: number;
            to: number;
            totalLines: number;
            nextOffset?: number;
            checksum?: string;
            observedChecksum?: string;
            currentChecksum?: string;
            freshness?: "current" | "drifted" | "deleted" | "permission_revoked";
            lines: Array<{
                line: number;
                text: string;
            }>;
        }>;
        preview?: string;
        total?: number;
        truncated: boolean;
        nextCursor?: string;
        continuation?: {
            kind: "read_file" | "read_files";
            pendingCount: number;
            files: Array<{
                path: string;
                nextOffset: number;
                checksum: string;
            }>;
        };
        rehydratable?: boolean;
        freshness?: "current" | "drifted" | "deleted" | "permission_revoked";
        authoritativeRevision?: string;
        searchExecution?: {
            engine: "bundled_rg" | "system_rg" | "node_fallback";
            timedOut: boolean;
            cancelled: boolean;
            partial: boolean;
        };
        presentation?: {
            layout: "directory" | "files" | "matches" | "symbols" | "file_content" | "git" | "verification" | "generic";
            groups?: Array<{
                id: string;
                label: string;
                count: number;
                items: Array<{
                    label: string;
                    secondary?: string;
                    path?: string;
                    line?: number;
                    status?: string;
                }>;
            }>;
        };
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
    includeTechnicalCommand?: boolean;
}): ToolDisplayDetailV1;
export declare function workspaceReadonlyToolShortName(value: any): string;
export declare function isWorkspaceReadonlyToolName(value: any): boolean;
export declare function workspaceReadonlyContractVersion(value: any, storedVersion?: any): 2 | 3;
export {};
