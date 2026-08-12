"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKSPACE_READONLY_MCP_SERVER_NAME = void 0;
exports.workspaceReadonlyMcpTools = workspaceReadonlyMcpTools;
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const workspace_readonly_tools_1 = require("../tools/workspace-readonly-tools");
exports.WORKSPACE_READONLY_MCP_SERVER_NAME = "ccm__workspace_readonly";
const MAIN_AGENT_ROLES = ["global-agent", "group-main-agent", "project-agent"];
const tools = workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    roles: MAIN_AGENT_ROLES,
}));
function capabilityFromContext(context) {
    const scope = context.role === "global-agent"
        ? "global"
        : context.role === "group-main-agent" ? "group" : "project";
    const scopeId = scope === "global"
        ? "global-agent"
        : scope === "group" ? String(context.groupId || "") : String(context.project || "");
    const exactSessionId = scope === "group"
        ? String(context.groupSessionId || context.taskId || "")
        : scope === "project" ? String(context.projectSessionId || context.taskId || "") : String(context.taskId || "global-agent-runtime");
    const allowedProjects = scope === "global"
        ? (context.projects || []).map(project => project.name)
        : scope === "group" ? (context.projects || []).map(project => project.name) : [context.project];
    if (!scopeId || !exactSessionId)
        throw new Error("工作区只读MCP缺少精确作用域或会话绑定");
    return {
        schema: "ccm-scoped-tool-capability-v1",
        scope,
        scopeId,
        exactSessionId,
        generation: Math.max(0, Number(context.nativeGeneration || context.boundaryGeneration || 0)),
        allowedProjects: Array.from(new Set(allowedProjects.map(String).filter(Boolean))).sort(),
        issuedAt: context.issuedAt,
        expiresAt: context.expiresAt,
    };
}
function workspaceReadonlyMcpTools() {
    return tools.map(tool => ({ ...tool }));
}
(0, internal_mcp_runtime_1.runInternalMcpServer)({
    name: exports.WORKSPACE_READONLY_MCP_SERVER_NAME,
    version: "2.0.0",
    tools,
    callTool: (context, name, args) => (0, workspace_readonly_tools_1.executeWorkspaceReadonlyToolWithCapability)(name, args, capabilityFromContext(context), 3),
});
//# sourceMappingURL=workspace-readonly-mcp.js.map