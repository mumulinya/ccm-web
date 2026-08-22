"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKSPACE_READONLY_MCP_SERVER_NAME = void 0;
exports.workspaceReadonlyMcpTools = workspaceReadonlyMcpTools;
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const workspace_readonly_tools_1 = require("../tools/workspace-readonly-tools");
const task_context_1 = require("../tasks/task-context");
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
    callTool: async (context, name, args) => {
        const result = await (0, workspace_readonly_tools_1.executeWorkspaceReadonlyToolWithCapability)(name, args, capabilityFromContext(context), 3);
        if (context.bindingKind === "task" && context.taskId && /(?:^|_)(?:read_file|read_text_file)$/.test(String(name || "")) && result?.path && result?.checksum) {
            try {
                const lines = Array.isArray(result.lines) ? result.lines : [];
                const starts = lines.map((row) => Number(row?.line || 0)).filter((value) => value > 0);
                (0, task_context_1.addTaskFileEvidence)(context.taskId, {
                    evidenceId: `mcp-read:${context.taskId}:${result.checksum}:${result.offset || starts[0] || 1}`,
                    project: context.project,
                    path: result.path,
                    checksum: result.checksum,
                    readRanges: starts.length ? [{ start: Math.min(...starts), end: Math.max(...starts) }] : [],
                    purpose: String(args?.purpose || "workspace_readonly_mcp"),
                    workItemIds: context.communicationMessageId ? [context.communicationMessageId] : [],
                });
            }
            catch (error) {
                console.warn(`[workspace-readonly-mcp] task evidence append failed: ${error?.message || error}`);
            }
        }
        return result;
    },
});
//# sourceMappingURL=workspace-readonly-mcp.js.map