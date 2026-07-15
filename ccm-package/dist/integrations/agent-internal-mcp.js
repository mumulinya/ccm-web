"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTaskBoundInternalMcpServers = buildTaskBoundInternalMcpServers;
const delivery_workspace_mcp_1 = require("./delivery-workspace-mcp");
const group_coordination_mcp_1 = require("./group-coordination-mcp");
const knowledge_context_mcp_1 = require("./knowledge-context-mcp");
const task_evidence_mcp_1 = require("./task-evidence-mcp");
const task_runtime_mcp_1 = require("./task-runtime-mcp");
const test_acceptance_mcp_1 = require("./test-acceptance-mcp");
function buildTaskBoundInternalMcpServers(input) {
    if (!input.taskId || !input.project || !input.workDir)
        return {};
    const context = {
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
    };
    const servers = {
        [task_runtime_mcp_1.TASK_RUNTIME_MCP_SERVER_NAME]: (0, task_runtime_mcp_1.buildTaskRuntimeMcpServerConfig)(context),
        [knowledge_context_mcp_1.KNOWLEDGE_CONTEXT_MCP_SERVER_NAME]: (0, knowledge_context_mcp_1.buildKnowledgeContextMcpServerConfig)(context),
        [task_evidence_mcp_1.TASK_EVIDENCE_MCP_SERVER_NAME]: (0, task_evidence_mcp_1.buildTaskEvidenceMcpServerConfig)(context),
    };
    if (input.role !== "global-agent") {
        servers[test_acceptance_mcp_1.TEST_ACCEPTANCE_MCP_SERVER_NAME] = (0, test_acceptance_mcp_1.buildTestAcceptanceMcpServerConfig)(context);
    }
    if (["group-main-agent", "project-child-agent", "test-agent"].includes(input.role)) {
        servers[delivery_workspace_mcp_1.DELIVERY_WORKSPACE_MCP_SERVER_NAME] = (0, delivery_workspace_mcp_1.buildDeliveryWorkspaceMcpServerConfig)(context);
    }
    if (input.role === "project-child-agent" && input.groupId) {
        servers[group_coordination_mcp_1.GROUP_COORDINATION_MCP_SERVER_NAME] = (0, group_coordination_mcp_1.buildGroupCoordinationMcpServerConfig)({
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
//# sourceMappingURL=agent-internal-mcp.js.map