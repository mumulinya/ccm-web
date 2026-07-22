import { buildDeliveryWorkspaceMcpServerConfig, DELIVERY_WORKSPACE_MCP_SERVER_NAME } from "./delivery-workspace-mcp";
import { buildGroupCoordinationMcpServerConfig, GROUP_COORDINATION_MCP_SERVER_NAME } from "./group-coordination-mcp";
import { buildKnowledgeContextMcpServerConfig, KNOWLEDGE_CONTEXT_MCP_SERVER_NAME } from "./knowledge-context-mcp";
import { InternalMcpAgentRole, InternalMcpProjectBinding, InternalMcpTaskContext } from "./internal-mcp-runtime";
import { buildTaskEvidenceMcpServerConfig, TASK_EVIDENCE_MCP_SERVER_NAME } from "./task-evidence-mcp";
import { buildTaskRuntimeMcpServerConfig, TASK_RUNTIME_MCP_SERVER_NAME } from "./task-runtime-mcp";
import { buildTestAcceptanceMcpServerConfig, TEST_ACCEPTANCE_MCP_SERVER_NAME } from "./test-acceptance-mcp";
import { buildPermissionBrokerMcpServerConfig, PERMISSION_BROKER_MCP_SERVER_NAME } from "./permission-broker-mcp";

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

export function buildTaskBoundInternalMcpServers(input: TaskBoundInternalMcpInput) {
  if (!input.taskId || !input.project || !input.workDir) return {};
  const context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt"> = {
    taskId: input.taskId,
    groupId: input.groupId || "",
    groupSessionId: input.groupSessionId || "",
    project: input.project,
    role: input.role,
    agentType: input.agentType || "",
    taskAgentSessionId: input.taskAgentSessionId || "",
    nativeSessionId: input.nativeSessionId || "",
    workDir: input.workDir,
    baseWorkDir: input.baseWorkDir || input.workDir,
    projects: input.projects || [],
    memoryReceiptChallenge: input.memoryReceiptChallenge || null,
    memoryReceiptFile: input.memoryReceiptFile || "",
    memorySnapshotId: input.memorySnapshotId || "",
    memorySnapshotChecksum: input.memorySnapshotChecksum || "",
    boundaryGeneration: Number(input.boundaryGeneration || 0),
    nativeGeneration: Number(input.nativeGeneration || 0),
    requestText: input.requestText || "",
    memoryReadBudgetTokens: Number(input.memoryReadBudgetTokens || 0),
  };
  const servers: Record<string, any> = {
    [TASK_RUNTIME_MCP_SERVER_NAME]: buildTaskRuntimeMcpServerConfig(context),
    [KNOWLEDGE_CONTEXT_MCP_SERVER_NAME]: buildKnowledgeContextMcpServerConfig(context),
    [TASK_EVIDENCE_MCP_SERVER_NAME]: buildTaskEvidenceMcpServerConfig(context),
    [PERMISSION_BROKER_MCP_SERVER_NAME]: buildPermissionBrokerMcpServerConfig(context),
  };
  if (input.role !== "global-agent") {
    servers[TEST_ACCEPTANCE_MCP_SERVER_NAME] = buildTestAcceptanceMcpServerConfig(context);
  }
  if (["group-main-agent", "project-child-agent", "test-agent"].includes(input.role)) {
    servers[DELIVERY_WORKSPACE_MCP_SERVER_NAME] = buildDeliveryWorkspaceMcpServerConfig(context);
  }
  if (input.role === "project-child-agent" && input.groupId) {
    servers[GROUP_COORDINATION_MCP_SERVER_NAME] = buildGroupCoordinationMcpServerConfig({
      groupId: input.groupId,
      taskId: input.taskId,
      groupSessionId: input.groupSessionId || "",
      sourceProject: input.project,
      sourceAgentType: input.agentType || "",
      sourceTaskAgentSessionId: input.taskAgentSessionId || "",
      sourceNativeSessionId: input.nativeSessionId || "",
      sourceWorkDir: input.workDir,
    });
  }
  return servers;
}

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

export function buildProjectSessionBoundMemoryMcpServer(input: ProjectSessionBoundMemoryMcpInput) {
  if (!input.project || !input.projectSessionId || !input.workDir || !input.memorySnapshotId) return {};
  const context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt"> = {
    bindingKind: "project_session",
    taskId: "",
    groupId: "",
    groupSessionId: "",
    project: input.project,
    projectSessionId: input.projectSessionId,
    role: "project-agent",
    agentType: input.agentType || "",
    taskAgentSessionId: input.taskAgentSessionId || "",
    nativeSessionId: input.nativeSessionId || "",
    workDir: input.workDir,
    baseWorkDir: input.workDir,
    projects: [],
    memoryReceiptChallenge: input.memoryReceiptChallenge,
    memoryReceiptFile: input.memoryReceiptFile,
    memorySnapshotId: input.memorySnapshotId,
    memorySnapshotChecksum: input.memorySnapshotChecksum,
    boundaryGeneration: Number(input.boundaryGeneration || 0),
    nativeGeneration: Number(input.nativeGeneration || 0),
    requestText: input.requestText || "",
    memoryReadBudgetTokens: Number(input.memoryReadBudgetTokens || 0),
  };
  return {
    [KNOWLEDGE_CONTEXT_MCP_SERVER_NAME]: buildKnowledgeContextMcpServerConfig(context),
    [PERMISSION_BROKER_MCP_SERVER_NAME]: buildPermissionBrokerMcpServerConfig(context),
  };
}
