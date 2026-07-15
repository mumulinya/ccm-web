import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const DELIVERY_WORKSPACE_MCP_SERVER_NAME = "ccm__delivery_workspace";
export declare function buildDeliveryWorkspaceMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
    };
};
export declare function runDeliveryWorkspaceMcpServer(): void;
