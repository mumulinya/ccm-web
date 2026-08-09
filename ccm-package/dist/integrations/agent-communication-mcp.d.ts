import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const AGENT_COMMUNICATION_MCP_SERVER_NAME = "ccm__agent_communication";
export declare const AGENT_COMMUNICATION_ACK_MCP_TOOL_ALIASES: string[];
export declare function buildAgentCommunicationMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
    };
};
export declare function assertAgentCommunicationMcpBinding(context: InternalMcpTaskContext, message: any, messageId: any): boolean;
export declare function runAgentCommunicationMcpBindingSelfTest(): {
    pass: boolean;
};
export declare function runAgentCommunicationMcpServer(): void;
