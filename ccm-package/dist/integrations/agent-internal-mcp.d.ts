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
};
export declare function buildTaskBoundInternalMcpServers(input: TaskBoundInternalMcpInput): Record<string, any>;
