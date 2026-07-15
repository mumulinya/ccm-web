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
exports.TASK_EVIDENCE_MCP_SERVER_NAME = void 0;
exports.buildTaskEvidenceMcpServerConfig = buildTaskEvidenceMcpServerConfig;
exports.runTaskEvidenceMcpServer = runTaskEvidenceMcpServer;
const path = __importStar(require("path"));
const task_replay_1 = require("../modules/collaboration/task-replay");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const internal_mcp_test_store_1 = require("./internal-mcp-test-store");
exports.TASK_EVIDENCE_MCP_SERVER_NAME = "ccm__task_evidence";
function buildTaskEvidenceMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "task-evidence-mcp.js"), context);
}
const tools = [
    { name: "get_task_timeline", description: "读取当前绑定任务可回放的主 Agent 派发、子 Agent 执行、测试、返工、验收和完成时间线。", inputSchema: { type: "object", properties: { stage: { type: "string" }, status: { type: "string" }, search: { type: "string" }, limit: { type: "number", minimum: 1, maximum: 500 } }, additionalProperties: false } },
    { name: "get_code_changes", description: "读取当前任务已持久化的代码变更文件、行数统计和可用的历史逐行 diff。", inputSchema: { type: "object", properties: { project: { type: "string" }, include_diff: { type: "boolean" } }, additionalProperties: false } },
    { name: "list_test_evidence", description: "列出当前任务 TestAgent 的报告、截图、浏览器、接口和命令证据及保留状态。", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
    { name: "get_delivery_receipts", description: "读取项目子 Agent 交付候选、验证记录、分支合并记录和 TestAgent 结论，供主 Agent 验收或子 Agent自查。", inputSchema: { type: "object", properties: { project: { type: "string" }, limit: { type: "number", minimum: 1, maximum: 200 } }, additionalProperties: false } },
];
function scopedReplay(context) {
    (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
    const replay = (0, task_replay_1.buildCompleteTaskReplay)(context.taskId);
    if (!replay)
        throw new Error("当前任务还没有可回放证据");
    if (context.role !== "project-child-agent")
        return replay;
    return {
        ...replay,
        tasks: replay.tasks.filter((task) => task.id === context.taskId || task.project === context.project),
        events: replay.events.filter((event) => event.task_id === context.taskId || event.project === context.project || ["group_agent", "test_agent", "system"].includes(event.actor?.type)),
        evidence: replay.evidence.filter((item) => item.task_id === context.taskId || item.project === context.project || item.type !== "code_changes"),
    };
}
function callTool(context, name, args) {
    if (name === "get_task_timeline") {
        const replay = scopedReplay(context);
        const stage = String(args?.stage || "").trim();
        const status = String(args?.status || "").trim();
        const search = String(args?.search || "").trim().toLowerCase();
        const limit = Math.max(1, Math.min(500, Number(args?.limit || 160)));
        const events = replay.events.filter((event) => (!stage || event.stage === stage) && (!status || event.status === status) && (!search || `${event.title}\n${event.summary}\n${event.project}`.toLowerCase().includes(search))).slice(-limit);
        return { success: true, task: { selected_task_id: replay.selected_task_id, root_task_id: replay.root_task_id, title: replay.title, goal: replay.goal, status: replay.status, completed: replay.completed }, summary: replay.summary, phases: replay.phases, events };
    }
    if (name === "get_code_changes") {
        const replay = scopedReplay(context);
        const project = String(args?.project || "").trim();
        const includeDiff = args?.include_diff !== false;
        const changes = replay.evidence.filter((item) => item.type === "code_changes" && (!project || item.project === project)).map((item) => ({ ...item, files: (item.files || []).map((file) => includeDiff ? file : { ...file, diff: { ...file.diff, diff: "", raw: "" } }) }));
        return { success: true, task_id: context.taskId, change_groups: changes, file_count: changes.reduce((sum, item) => sum + Number(item.file_count || 0), 0) };
    }
    if (name === "list_test_evidence")
        return { success: true, task_id: context.taskId, runs: (0, internal_mcp_test_store_1.internalMcpTestEvidence)(context.taskId) };
    if (name === "get_delivery_receipts") {
        const project = String(args?.project || "").trim();
        const limit = Math.max(1, Math.min(200, Number(args?.limit || 80)));
        const journal = (0, internal_mcp_task_store_1.readInternalMcpTaskJournal)(context.taskId, 500).filter(entry => ["delivery", "workspace", "test"].includes(entry.kind) && (!project || entry.project === project) && (context.role !== "project-child-agent" || entry.project === context.project || entry.kind === "test")).slice(-limit);
        const replay = scopedReplay(context);
        const verification = replay.evidence.filter((item) => item.type === "verification" && (!project || item.project === project));
        return { success: true, task_id: context.taskId, receipts: journal, verification };
    }
    throw new Error(`未知任务证据工具：${name}`);
}
function runTaskEvidenceMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.TASK_EVIDENCE_MCP_SERVER_NAME, tools, callTool });
}
if (require.main === module)
    runTaskEvidenceMcpServer();
//# sourceMappingURL=task-evidence-mcp.js.map