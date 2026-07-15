import { InternalMcpTaskContext } from "./internal-mcp-runtime";
export declare const TASK_EVIDENCE_MCP_SERVER_NAME = "ccm__task_evidence";
export declare function buildTaskEvidenceMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
    };
};
export declare function runTaskEvidenceMcpServer(): void;
