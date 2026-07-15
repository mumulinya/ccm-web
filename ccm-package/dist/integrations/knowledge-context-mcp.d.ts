import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const KNOWLEDGE_CONTEXT_MCP_SERVER_NAME = "ccm__knowledge_context";
export declare function buildKnowledgeContextMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
    };
};
export declare function runKnowledgeContextMcpServer(): void;
