import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const TASK_RUNTIME_MCP_SERVER_NAME = "ccm__task_runtime";
export declare function buildTaskRuntimeMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
    };
};
export declare function runTaskRuntimeMcpServer(): void;
