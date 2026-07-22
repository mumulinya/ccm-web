import * as path from "path";
import {
  buildInternalMcpServerConfig,
  type InternalMcpTaskContext,
  type InternalMcpToolDefinition,
  runInternalMcpServer,
} from "./internal-mcp-runtime";
import {
  consumeTaskPermission,
  executeApprovedTaskCommand,
  requestTaskPermission,
} from "../modules/collaboration/task-permission-broker";

export const PERMISSION_BROKER_MCP_SERVER_NAME = "ccm__permission_broker";

export function buildPermissionBrokerMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">) {
  return buildInternalMcpServerConfig(path.join(__dirname, "permission-broker-mcp.js"), context);
}

const tools: InternalMcpToolDefinition[] = [
  {
    name: "request_execution_permission",
    description: "在执行超出当前项目默认权限的操作前申请限时授权。群聊任务先由主 Agent 审批；高风险或无法判断时升级给用户。未返回 approved 时不得执行。",
    inputSchema: {
      type: "object",
      required: ["operation", "reason"],
      properties: {
        operation: { type: "string" }, reason: { type: "string" }, command: { type: "string" },
        paths: { type: "array", maxItems: 30, items: { type: "string" } },
        hosts: { type: "array", maxItems: 20, items: { type: "string" } },
      },
      additionalProperties: false,
    },
    roles: ["project-agent", "project-child-agent"],
  },
  {
    name: "consume_execution_permission",
    description: "消费当前精确任务或项目会话的一次非命令权限租约。过期、次数耗尽或会话不匹配时拒绝。",
    inputSchema: { type: "object", required: ["request_id"], properties: { request_id: { type: "string", pattern: "^perm_[a-f0-9]{24}$" } }, additionalProperties: false },
    roles: ["project-agent", "project-child-agent"],
  },
  {
    name: "execute_approved_command",
    description: "由 CCM 受控运行器执行授权中绑定的精确命令并自动消费租约。发布、部署、Git 远程写入等命令不得绕开此工具自行执行。",
    inputSchema: { type: "object", required: ["request_id"], properties: { request_id: { type: "string", pattern: "^perm_[a-f0-9]{24}$" } }, additionalProperties: false },
    roles: ["project-agent", "project-child-agent"],
  },
];

async function callTool(context: InternalMcpTaskContext, name: string, args: any) {
  if (name === "request_execution_permission") {
    const request = await requestTaskPermission(context, args);
    return { success: true, request, allowed: request.state === "approved", next_action: request.state === "approved" ? (request.command ? "调用 execute_approved_command" : "调用 consume_execution_permission") : request.state === "awaiting_user" ? "停止相关操作并等待用户审批" : "停止相关操作并调整方案" };
  }
  if (name === "consume_execution_permission") return consumeTaskPermission(context, String(args?.request_id || ""));
  if (name === "execute_approved_command") return executeApprovedTaskCommand(context, String(args?.request_id || ""));
  throw new Error(`未知权限工具：${name}`);
}

export function runPermissionBrokerMcpServer() {
  runInternalMcpServer({ name: PERMISSION_BROKER_MCP_SERVER_NAME, tools, callTool });
}

if (require.main === module) runPermissionBrokerMcpServer();
