import { type InternalMcpAgentRole } from "./internal-mcp-runtime";
export declare const WORKSPACE_READONLY_MCP_SERVER_NAME = "ccm__workspace_readonly";
export declare function workspaceReadonlyMcpTools(): {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    roles?: InternalMcpAgentRole[];
}[];
