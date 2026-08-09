import { type InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const NOTEBOOK_WORKSPACE_MCP_SERVER_NAME = "ccm__notebook_workspace";
export declare function buildNotebookWorkspaceMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
    };
};
export declare function runNotebookWorkspaceMcpServer(): void;
