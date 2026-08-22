import {
  type InternalMcpAgentRole,
  type InternalMcpTaskContext,
  type InternalMcpToolDefinition,
  runInternalMcpServer,
} from "./internal-mcp-runtime";
import {
  WORKSPACE_READONLY_TOOL_DEFINITIONS_V3,
  executeWorkspaceReadonlyToolWithCapability,
  type MainAgentScopeKind,
  type ScopedToolCapabilityV1,
} from "../tools/workspace-readonly-tools";
import { addTaskFileEvidence } from "../tasks/task-context";

export const WORKSPACE_READONLY_MCP_SERVER_NAME = "ccm__workspace_readonly";
const MAIN_AGENT_ROLES: InternalMcpAgentRole[] = ["global-agent", "group-main-agent", "project-agent"];

const tools: InternalMcpToolDefinition[] = WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.map(tool => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  roles: MAIN_AGENT_ROLES,
}));

function capabilityFromContext(context: InternalMcpTaskContext): ScopedToolCapabilityV1 {
  const scope: MainAgentScopeKind = context.role === "global-agent"
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
  if (!scopeId || !exactSessionId) throw new Error("工作区只读MCP缺少精确作用域或会话绑定");
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

export function workspaceReadonlyMcpTools() {
  return tools.map(tool => ({ ...tool }));
}

runInternalMcpServer({
  name: WORKSPACE_READONLY_MCP_SERVER_NAME,
  version: "2.0.0",
  tools,
  callTool: async (context, name, args) => {
    const result: any = await executeWorkspaceReadonlyToolWithCapability(name, args, capabilityFromContext(context), 3);
    if (context.bindingKind === "task" && context.taskId && /(?:^|_)(?:read_file|read_text_file)$/.test(String(name || "")) && result?.path && result?.checksum) {
      try {
        const lines = Array.isArray(result.lines) ? result.lines : [];
        const starts = lines.map((row: any) => Number(row?.line || 0)).filter((value: number) => value > 0);
        addTaskFileEvidence(context.taskId, {
          evidenceId: `mcp-read:${context.taskId}:${result.checksum}:${result.offset || starts[0] || 1}`,
          project: context.project,
          path: result.path,
          checksum: result.checksum,
          readRanges: starts.length ? [{ start: Math.min(...starts), end: Math.max(...starts) }] : [],
          purpose: String(args?.purpose || "workspace_readonly_mcp"),
          workItemIds: context.communicationMessageId ? [context.communicationMessageId] : [],
        });
      } catch (error: any) {
        console.warn(`[workspace-readonly-mcp] task evidence append failed: ${error?.message || error}`);
      }
    }
    return result;
  },
});
