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
exports.GROUP_COORDINATION_MCP_SERVER_NAME = void 0;
exports.buildGroupCoordinationMcpServerConfig = buildGroupCoordinationMcpServerConfig;
exports.validateGroupCoordinationMcpBinding = validateGroupCoordinationMcpBinding;
exports.runGroupCoordinationMcpServer = runGroupCoordinationMcpServer;
const path = __importStar(require("path"));
const runtime_1 = require("../agents/runtime");
const db_1 = require("../core/db");
const agent_sessions_1 = require("../tasks/agent-sessions");
const storage_1 = require("../modules/collaboration/storage");
const group_coordination_store_1 = require("../modules/collaboration/group-coordination-store");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
exports.GROUP_COORDINATION_MCP_SERVER_NAME = "ccm__group_coordinator";
const TERMINAL_TASK_STATUSES = new Set(["completed", "done", "failed", "cancelled", "archived"]);
function coordinationContext(context) {
    return {
        groupId: String(context.groupId || ""),
        taskId: String(context.taskId || ""),
        groupSessionId: String(context.groupSessionId || ""),
        sourceProject: String(context.project || ""),
        sourceAgentType: String(context.agentType || ""),
        sourceTaskAgentSessionId: String(context.taskAgentSessionId || ""),
        sourceNativeSessionId: String(context.nativeSessionId || ""),
        sourceWorkDir: String(context.workDir || ""),
    };
}
function buildGroupCoordinationMcpServerConfig(context) {
    if (!context.groupId || !context.taskId || !context.groupSessionId || !context.sourceProject || !context.sourceTaskAgentSessionId || !context.sourceWorkDir) {
        throw new Error("内部协调 MCP 缺少精确群聊、任务、项目或子 Agent 会话绑定");
    }
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "group-coordination-mcp.js"), {
        bindingKind: "task",
        taskId: context.taskId,
        groupId: context.groupId,
        groupSessionId: context.groupSessionId,
        project: context.sourceProject,
        projectSessionId: "",
        role: "project-child-agent",
        agentType: context.sourceAgentType || "",
        taskAgentSessionId: context.sourceTaskAgentSessionId,
        nativeSessionId: context.sourceNativeSessionId || "",
        workDir: context.sourceWorkDir,
        baseWorkDir: context.sourceWorkDir,
        projects: [],
    });
}
function validateGroupCoordinationMcpBinding(context) {
    (0, internal_mcp_runtime_1.assertInternalMcpRole)(context, ["project-child-agent"], "群聊跨 Agent 协作");
    if (context.bindingKind !== "task")
        throw new Error("协作 MCP 只接受正式任务绑定");
    if (!context.groupId || !context.groupSessionId || !context.taskId || !context.project || !context.taskAgentSessionId) {
        throw new Error("协作 MCP 缺少精确群聊会话或子 Agent 会话绑定");
    }
    const task = (0, db_1.getTaskById)(context.taskId);
    if (!task)
        throw new Error("协作 MCP 绑定的任务不存在或已被清理");
    if (TERMINAL_TASK_STATUSES.has(String(task.status || "").toLowerCase())) {
        throw new Error(`任务已结束，不能继续提交协作请求：${task.status}`);
    }
    if (String(task.group_id || task.groupId || "") !== context.groupId)
        throw new Error("协作 MCP 的群聊绑定与当前任务不一致");
    if (String(task.group_session_id || task.groupSessionId || "") !== context.groupSessionId)
        throw new Error("协作 MCP 的精确群聊会话已失效");
    if (String(task.target_project || task.targetProject || "") !== context.project)
        throw new Error("协作 MCP 的项目绑定与当前任务不一致");
    const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === context.groupId);
    if (!group)
        throw new Error("协作 MCP 绑定的群聊不存在或已被删除");
    const isMember = (Array.isArray(group.members) ? group.members : [])
        .some((member) => String(member?.project || "") === context.project);
    if (!isMember)
        throw new Error("当前项目已不属于该群聊，协作请求被拒绝");
    const session = (0, agent_sessions_1.listTaskAgentSessions)({ taskId: context.taskId, groupId: context.groupId, project: context.project })
        .find(item => item.id === context.taskAgentSessionId);
    if (!session || session.status !== "open")
        throw new Error("协作 MCP 绑定的子 Agent 会话不存在或已关闭");
    if (context.agentType && session.agentType !== (0, runtime_1.normalizeAgentRuntimeId)(context.agentType))
        throw new Error("协作 MCP 的 Agent 运行时绑定已变化");
    if (context.nativeSessionId && session.nativeSessionId && session.nativeSessionId !== context.nativeSessionId) {
        throw new Error("协作 MCP 的原生 Agent 会话绑定已变化，请重新加载运行时工具");
    }
    return { task, group, session };
}
const tools = [
    {
        name: "request_coordination",
        description: "向群聊主 Agent 提交跨 Agent 协调请求。只提交需求和证据，不能直接派发或命令其他子 Agent。",
        inputSchema: {
            type: "object",
            required: ["kind", "summary"],
            properties: {
                kind: { type: "string", enum: ["information", "implementation", "review", "risk"] },
                summary: { type: "string", description: "用一句话说明需要主 Agent 协调什么" },
                question: { type: "string", description: "需要得到回答或实现的具体内容" },
                reason: { type: "string" },
                blocking: { type: "boolean", default: true },
                required_capabilities: { type: "array", items: { type: "string" } },
                target_hint: { type: "string", description: "可选建议，仅供主 Agent 判断，不代表派发" },
                evidence: { type: "array", items: { type: "string" } },
                acceptance_criteria: { type: "array", items: { type: "string" } },
                requested_write_paths: { type: "array", items: { type: "string" } },
                idempotency_key: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "report_blocker",
        description: "把无法自行解除的风险、权限或业务阻塞报告给群聊主 Agent。",
        inputSchema: {
            type: "object",
            required: ["summary"],
            properties: {
                summary: { type: "string" },
                reason: { type: "string" },
                evidence: { type: "array", items: { type: "string" } },
                needs_user: { type: "boolean", default: false },
                idempotency_key: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "request_review",
        description: "向群聊主 Agent 申请另一个 Agent 进行只读评审；由主 Agent 选择评审者。",
        inputSchema: {
            type: "object",
            required: ["summary"],
            properties: {
                summary: { type: "string" },
                question: { type: "string" },
                reason: { type: "string" },
                evidence: { type: "array", items: { type: "string" } },
                acceptance_criteria: { type: "array", items: { type: "string" } },
                required_capabilities: { type: "array", items: { type: "string" } },
                idempotency_key: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "get_coordination_status",
        description: "查询当前任务会话由群聊主 Agent 管理的协调请求状态。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
];
function textResult(value, isError = false) {
    return { content: [{ type: "text", text: JSON.stringify(value) }], isError };
}
function callTool(internalContext, name, args) {
    validateGroupCoordinationMcpBinding(internalContext);
    const context = coordinationContext(internalContext);
    if (name === "get_coordination_status") {
        const requests = (0, group_coordination_store_1.listGroupCoordinationRequests)(context).map(row => ({ id: row.id, kind: row.kind, status: row.status, summary: row.summary, updated_at: row.updated_at }));
        return textResult({ success: true, requests });
    }
    if (name === "report_blocker") {
        const result = (0, group_coordination_store_1.submitGroupCoordinationRequest)(context, {
            kind: args?.needs_user === true ? "risk" : "information",
            summary: args?.summary,
            question: args?.summary,
            reason: args?.reason,
            evidence: args?.evidence,
            blocking: true,
            idempotencyKey: args?.idempotency_key,
            metadata: { needs_user: args?.needs_user === true, submitted_tool: name },
        });
        return textResult({ success: true, request_id: result.record.id, status: result.record.status, deduplicated: result.deduplicated, next: "群聊主 Agent 将统一判断并安排下一步" });
    }
    if (name === "request_review" || name === "request_coordination") {
        const result = (0, group_coordination_store_1.submitGroupCoordinationRequest)(context, {
            kind: name === "request_review" ? "review" : args?.kind,
            summary: args?.summary,
            question: args?.question,
            reason: args?.reason,
            blocking: args?.blocking !== false,
            requiredCapabilities: args?.required_capabilities,
            targetHint: args?.target_hint,
            evidence: args?.evidence,
            acceptanceCriteria: args?.acceptance_criteria,
            requestedWritePaths: args?.requested_write_paths,
            idempotencyKey: args?.idempotency_key,
            metadata: { submitted_tool: name },
        });
        return textResult({ success: true, request_id: result.record.id, status: result.record.status, deduplicated: result.deduplicated, next: "群聊主 Agent 将统一判断、派发和验收" });
    }
    return textResult({ success: false, error: `未知工具：${name}` }, true);
}
function runGroupCoordinationMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({
        name: exports.GROUP_COORDINATION_MCP_SERVER_NAME,
        version: "2.0.0",
        tools: tools.map(tool => ({ ...tool, roles: ["project-child-agent"] })),
        callTool,
    });
}
if (require.main === module)
    runGroupCoordinationMcpServer();
//# sourceMappingURL=group-coordination-mcp.js.map