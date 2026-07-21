import { InternalMcpAgentRole, InternalMcpProjectBinding } from "./internal-mcp-runtime";
export type TaskBoundInternalMcpInput = {
    taskId: string;
    groupId: string;
    groupSessionId?: string;
    project: string;
    role: InternalMcpAgentRole;
    agentType?: string;
    taskAgentSessionId?: string;
    nativeSessionId?: string;
    workDir: string;
    baseWorkDir?: string;
    projects?: InternalMcpProjectBinding[];
    memoryReceiptChallenge?: any;
    memoryReceiptFile?: string;
    memorySnapshotId?: string;
    memorySnapshotChecksum?: string;
    boundaryGeneration?: number;
    nativeGeneration?: number;
    requestText?: string;
    memoryReadBudgetTokens?: number;
};
export declare function buildTaskBoundInternalMcpServers(input: TaskBoundInternalMcpInput): Record<string, any>;
export type ProjectSessionBoundMemoryMcpInput = {
    project: string;
    projectSessionId: string;
    agentType?: string;
    workDir: string;
    taskAgentSessionId?: string;
    nativeSessionId?: string;
    memoryReceiptChallenge: any;
    memoryReceiptFile: string;
    memorySnapshotId: string;
    memorySnapshotChecksum: string;
    boundaryGeneration?: number;
    nativeGeneration?: number;
    requestText?: string;
    memoryReadBudgetTokens?: number;
};
export declare function buildProjectSessionBoundMemoryMcpServer(input: ProjectSessionBoundMemoryMcpInput): {
    ccm__knowledge_context?: undefined;
} | {
    ccm__knowledge_context: {
        command: string;
        args: string[];
        env: {
            CCM_INTERNAL_MCP_CONTEXT: string;
            CCM_INTERNAL_MCP_SECRET_FILE: string;
        };
    };
};
