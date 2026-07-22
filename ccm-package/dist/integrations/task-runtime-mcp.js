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
exports.TASK_RUNTIME_MCP_SERVER_NAME = void 0;
exports.buildTaskRuntimeMcpServerConfig = buildTaskRuntimeMcpServerConfig;
exports.runTaskRuntimeMcpServer = runTaskRuntimeMcpServer;
const path = __importStar(require("path"));
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
exports.TASK_RUNTIME_MCP_SERVER_NAME = "ccm__task_runtime";
function buildTaskRuntimeMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "task-runtime-mcp.js"), context);
}
const tools = [
    {
        name: "get_task_context",
        description: "读取当前签名绑定任务的目标、验收标准、工作项、Todo、近期进度和待用户决策。不能读取其他任务。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
        name: "update_todo",
        description: "更新当前 Agent 在绑定任务中的 Todo 快照。只用于真实工作任务，不会直接把任务标记为完成。",
        inputSchema: {
            type: "object",
            required: ["items"],
            properties: {
                items: { type: "array", minItems: 1, maxItems: 30, items: { type: "object", required: ["title", "status"], properties: { id: { type: "string" }, title: { type: "string" }, status: { type: "string", enum: ["pending", "in_progress", "completed", "blocked"] }, detail: { type: "string" } }, additionalProperties: false } },
                summary: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "report_progress",
        description: "向绑定任务写入用户可回放的阶段进度、已完成事项、下一步和阻塞，不改变最终验收状态。",
        inputSchema: {
            type: "object",
            required: ["summary"],
            properties: { summary: { type: "string" }, completed: { type: "array", items: { type: "string" } }, next: { type: "array", items: { type: "string" } }, blockers: { type: "array", items: { type: "string" } }, percent: { type: "number", minimum: 0, maximum: 100 } },
            additionalProperties: false,
        },
    },
    {
        name: "submit_delivery",
        description: "提交当前 Agent 的交付候选、文件变更和验证证据，由群聊主 Agent 与 TestAgent 后续验收；本工具不能自行完成任务。",
        inputSchema: {
            type: "object",
            required: ["summary"],
            properties: { summary: { type: "string" }, files_changed: { type: "array", items: { type: "string" } }, verification: { type: "array", items: { type: "string" } }, blockers: { type: "array", items: { type: "string" } }, branch: { type: "string" }, commit: { type: "string" } },
            additionalProperties: false,
        },
        roles: ["project-child-agent", "group-main-agent"],
    },
    {
        name: "request_user_decision",
        description: "记录必须由用户决定的问题、可选方案和默认建议，由主 Agent 统一向用户展示。",
        inputSchema: {
            type: "object",
            required: ["question"],
            properties: { question: { type: "string" }, options: { type: "array", maxItems: 8, items: { type: "string" } }, recommendation: { type: "string" }, blocking: { type: "boolean" } },
            additionalProperties: false,
        },
    },
];
async function callTool(context, name, args) {
    if (name === "get_task_context")
        return { success: true, ...(0, internal_mcp_task_store_1.publicInternalMcpTaskContext)(context) };
    if (name === "update_todo") {
        const items = (Array.isArray(args?.items) ? args.items : []).slice(0, 30).map((item, index) => ({
            id: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(item?.id || `todo-${index + 1}`, 80),
            title: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(item?.title, 300),
            status: ["pending", "in_progress", "completed", "blocked"].includes(item?.status) ? item.status : "pending",
            detail: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(item?.detail, 600),
        })).filter((item) => item.title);
        if (!items.length)
            throw new Error("Todo 至少需要一个有效事项");
        const entry = (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "todo", { items, summary: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.summary, 600) }, {
            type: "internal_mcp_todo_updated",
            title: `${context.project} 更新了工作计划`,
            detail: args?.summary || `${items.filter((item) => item.status === "completed").length}/${items.length} 项已完成`,
            status: items.some((item) => item.status === "blocked") ? "warning" : "active",
            phase: "execution",
        });
        return { success: true, event_id: entry.id, items };
    }
    if (name === "report_progress") {
        const payload = {
            summary: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.summary, 900),
            completed: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.completed, 30, 500),
            next: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.next, 30, 500),
            blockers: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.blockers, 20, 500),
            percent: Math.max(0, Math.min(100, Number(args?.percent || 0))),
        };
        if (!payload.summary)
            throw new Error("进度摘要不能为空");
        const entry = (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "progress", payload, { type: "internal_mcp_progress_reported", title: `${context.project} 更新了任务进度`, detail: payload.summary, status: payload.blockers.length ? "warning" : "active", phase: "execution" });
        return { success: true, event_id: entry.id, progress: payload };
    }
    if (name === "submit_delivery") {
        const payload = {
            status: "candidate",
            summary: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.summary, 1200),
            files_changed: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.files_changed, 200, 400),
            verification: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.verification, 100, 800),
            blockers: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.blockers, 50, 800),
            branch: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.branch, 200),
            commit: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.commit, 100),
            acceptance_required: true,
        };
        if (!payload.summary)
            throw new Error("交付摘要不能为空");
        const entry = (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "delivery", payload, { type: "internal_mcp_delivery_submitted", title: `${context.project} 提交了交付候选`, detail: payload.summary, status: payload.blockers.length ? "warning" : "active", phase: "review" });
        return { success: true, event_id: entry.id, status: "awaiting_group_main_agent_and_test_agent_acceptance", delivery: payload };
    }
    if (name === "request_user_decision") {
        const payload = { status: "pending", question: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.question, 1000), options: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(args?.options, 8, 500), recommendation: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.recommendation, 700), blocking: args?.blocking !== false };
        if (!payload.question)
            throw new Error("用户决策问题不能为空");
        const entry = (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "decision", payload, { type: "internal_mcp_user_decision_requested", title: `${context.project} 请求用户决策`, detail: payload.question, status: payload.blocking ? "blocked" : "warning", phase: "execution" });
        return { success: true, decision_id: entry.id, status: "pending_main_agent_presentation" };
    }
    throw new Error(`未知任务运行工具：${name}`);
}
function runTaskRuntimeMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.TASK_RUNTIME_MCP_SERVER_NAME, tools, callTool });
}
if (require.main === module)
    runTaskRuntimeMcpServer();
//# sourceMappingURL=task-runtime-mcp.js.map