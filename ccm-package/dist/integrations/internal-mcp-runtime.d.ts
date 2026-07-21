export type InternalMcpAgentRole = "global-agent" | "group-main-agent" | "project-agent" | "project-child-agent" | "test-agent";
export type InternalMcpProjectBinding = {
    name: string;
    workDir: string;
    verificationCommands?: string[];
    targetUrl?: string;
};
export type InternalMcpTaskContext = {
    schema: "ccm-internal-mcp-task-context-v1" | "ccm-internal-mcp-context-v2";
    bindingKind?: "task" | "project_session";
    taskId: string;
    groupId: string;
    groupSessionId?: string;
    project: string;
    projectSessionId?: string;
    role: InternalMcpAgentRole;
    agentType?: string;
    taskAgentSessionId?: string;
    nativeSessionId?: string;
    workDir: string;
    baseWorkDir: string;
    projects?: InternalMcpProjectBinding[];
    memoryReceiptChallenge?: any;
    memoryReceiptFile?: string;
    memorySnapshotId?: string;
    memorySnapshotChecksum?: string;
    boundaryGeneration?: number;
    nativeGeneration?: number;
    requestText?: string;
    memoryReadBudgetTokens?: number;
    issuedAt: string;
    expiresAt: string;
};
export type InternalMcpToolDefinition = {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    roles?: InternalMcpAgentRole[];
};
export declare function signInternalMcpEvidence(value: any): string;
export declare function verifyInternalMcpEvidenceSignature(value: any, supplied: any): boolean;
export declare function sealInternalMcpTaskContext(input: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt"> & Partial<Pick<InternalMcpTaskContext, "issuedAt" | "expiresAt">>): string;
export declare function openInternalMcpTaskContext(token?: string): InternalMcpTaskContext;
export declare function buildInternalMcpServerConfig(entryFile: string, context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">): {
    command: string;
    args: string[];
    env: {
        CCM_INTERNAL_MCP_CONTEXT: string;
        CCM_INTERNAL_MCP_SECRET_FILE: string;
    };
};
export declare function assertInternalMcpRole(context: InternalMcpTaskContext, roles: InternalMcpAgentRole[], action: string): void;
export declare function internalMcpTextResult(value: any, isError?: boolean): {
    content: {
        type: string;
        text: string;
    }[];
    isError: boolean;
};
export declare function runInternalMcpServer(options: {
    name: string;
    version?: string;
    tools: InternalMcpToolDefinition[] | ((context: InternalMcpTaskContext) => InternalMcpToolDefinition[]);
    callTool: (context: InternalMcpTaskContext, name: string, args: any) => any | Promise<any>;
}): void;
