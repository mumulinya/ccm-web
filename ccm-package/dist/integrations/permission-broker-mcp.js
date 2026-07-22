"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_BROKER_MCP_SERVER_NAME = void 0;
exports.buildPermissionBrokerMcpServerConfig = buildPermissionBrokerMcpServerConfig;
exports.runPermissionBrokerMcpServer = runPermissionBrokerMcpServer;
const path = __importStar(require("path"));
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const task_permission_broker_1 = require("../modules/collaboration/task-permission-broker");
exports.PERMISSION_BROKER_MCP_SERVER_NAME = "ccm__permission_broker";
function buildPermissionBrokerMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "permission-broker-mcp.js"), context);
}
const tools = [
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
async function callTool(context, name, args) {
    if (name === "request_execution_permission") {
        const request = await (0, task_permission_broker_1.requestTaskPermission)(context, args);
        return { success: true, request, allowed: request.state === "approved", next_action: request.state === "approved" ? (request.command ? "调用 execute_approved_command" : "调用 consume_execution_permission") : request.state === "awaiting_user" ? "停止相关操作并等待用户审批" : "停止相关操作并调整方案" };
    }
    if (name === "consume_execution_permission")
        return (0, task_permission_broker_1.consumeTaskPermission)(context, String(args?.request_id || ""));
    if (name === "execute_approved_command")
        return (0, task_permission_broker_1.executeApprovedTaskCommand)(context, String(args?.request_id || ""));
    throw new Error(`未知权限工具：${name}`);
}
function runPermissionBrokerMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.PERMISSION_BROKER_MCP_SERVER_NAME, tools, callTool });
}
if (require.main === module)
    runPermissionBrokerMcpServer();
//# sourceMappingURL=permission-broker-mcp.js.map