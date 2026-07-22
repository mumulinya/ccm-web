import { type InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const PERMISSION_BROKER_MCP_SERVER_NAME = "ccm__permission_broker";
export declare function buildPermissionBrokerMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
    };
};
export declare function runPermissionBrokerMcpServer(): void;
