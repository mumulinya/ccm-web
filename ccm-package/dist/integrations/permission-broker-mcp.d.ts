import { type InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const PERMISSION_BROKER_MCP_SERVER_NAME = "ccm__permission_broker";
export declare function buildPermissionBrokerMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
        CCM_TASK_STORE_DIR: string;
        CCM_EVIDENCE_STORE_DIR: string;
        CCM_USER_VISIBLE_AGENT_EVENT_DIR: string;
        CCM_INTERNAL_MCP_AUDIT_FILE: string;
    };
};
export declare function runPermissionBrokerMcpServer(): void;
