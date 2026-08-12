import { type InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const WORKSPACE_EDIT_MCP_SERVER_NAME = "ccm__workspace_edit";
export declare function buildWorkspaceEditMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
    };
};
export declare function workspaceEditMcpTools(): {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    roles?: import("./internal-mcp-runtime").InternalMcpAgentRole[];
}[];
export declare function runWorkspaceEditMcpServer(): void;
