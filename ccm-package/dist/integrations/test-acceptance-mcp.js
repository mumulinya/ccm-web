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
exports.TEST_ACCEPTANCE_MCP_SERVER_NAME = void 0;
exports.buildTestAcceptanceMcpServerConfig = buildTestAcceptanceMcpServerConfig;
exports.runTestAcceptanceMcpServer = runTestAcceptanceMcpServer;
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_test_store_1 = require("./internal-mcp-test-store");
exports.TEST_ACCEPTANCE_MCP_SERVER_NAME = "ccm__test_acceptance";
function buildTestAcceptanceMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "test-acceptance-mcp.js"), context);
}
const tools = [
    {
        name: "create_test_work_order",
        description: "由全局或群聊主 Agent 为当前任务创建真实 TestAgent 工作单与验收计划。不会接受绑定任务以外的项目路径。",
        roles: ["group-main-agent"],
        inputSchema: { type: "object", properties: { projects: { type: "array", items: { type: "string" } }, workspace_ids: { type: "array", items: { type: "string" } }, acceptance_criteria: { type: "array", items: { type: "string" } }, completed_tasks: { type: "array", items: { type: "string" } }, required_checks: { type: "array", items: { type: "string" } }, verification_commands: { type: "array", items: { type: "string" } }, changed_files: { type: "array", items: { type: "string" } }, target_url: { type: "string" }, browser_provider: { type: "string", enum: ["auto", "playwright", "mcp", "none"] }, collect_browser_artifacts: { type: "boolean" }, require_adversarial_probe: { type: "boolean" }, adversarial_probe_waiver: { type: "string" }, summary: { type: "string" }, start: { type: "boolean" } }, additionalProperties: false },
    },
    {
        name: "start_test_run",
        description: "启动已创建的 TestAgent 工作单，后台执行命令、接口和浏览器验收并持久化证据。",
        roles: ["group-main-agent"],
        inputSchema: { type: "object", properties: { run_id: { type: "string" } }, additionalProperties: false },
    },
    { name: "get_test_plan", description: "读取当前任务最近一次或指定 TestAgent 运行的结构化验收计划。", inputSchema: { type: "object", properties: { run_id: { type: "string" } }, additionalProperties: false } },
    { name: "get_test_status", description: "查询当前任务 TestAgent 运行状态、项目和计划摘要。", inputSchema: { type: "object", properties: { run_id: { type: "string" } }, additionalProperties: false } },
    { name: "get_test_verdict", description: "读取 TestAgent 结论、canAccept、报告摘要和 artifact 完整性校验结果。", inputSchema: { type: "object", properties: { run_id: { type: "string" } }, additionalProperties: false } },
    { name: "list_test_evidence", description: "列出当前任务 TestAgent 保存的截图、报告、浏览器与命令证据目录，不返回任意本机文件。", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
];
function startRun(context, runId = "") {
    const state = (0, internal_mcp_test_store_1.readInternalMcpTestRun)(context.taskId, runId);
    if (!state)
        throw new Error("TestAgent 工作单不存在，请先创建验收工作单");
    if (state.status === "running")
        return { success: true, already_running: true, run: (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(state) };
    if (state.status === "completed")
        return { success: true, already_completed: true, run: (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(state) };
    const file = (0, internal_mcp_test_store_1.internalMcpTestRunFile)(context.taskId, state.run_id);
    const running = (0, internal_mcp_test_store_1.markInternalMcpTestRunStarted)(state, 0);
    const child = (0, child_process_1.spawn)(process.execPath, [path.join(__dirname, "test-acceptance-worker.js"), file], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env } });
    child.unref();
    const current = (0, internal_mcp_test_store_1.attachInternalMcpTestRunPid)(running, child.pid || 0);
    return { success: true, started: true, run: (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(current) };
}
function callTool(context, name, args) {
    if (name === "create_test_work_order") {
        const state = (0, internal_mcp_test_store_1.createInternalMcpTestRun)(context, args);
        return args?.start === true ? startRun(context, state.run_id) : { success: true, run: (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(state), next: "调用 start_test_run 开始真实验收" };
    }
    if (name === "start_test_run")
        return startRun(context, String(args?.run_id || ""));
    const state = (0, internal_mcp_test_store_1.readInternalMcpTestRun)(context.taskId, String(args?.run_id || ""));
    if (name === "get_test_plan") {
        if (!state)
            throw new Error("当前任务还没有 TestAgent 验收计划");
        return { success: true, run_id: state.run_id, status: state.status, plan: state.plan, warnings: state.warnings };
    }
    if (name === "get_test_status")
        return { success: true, run: (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(state) };
    if (name === "get_test_verdict") {
        const view = (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(state);
        return { success: true, run_id: view?.run_id || "", status: view?.status || "not_created", can_accept: view?.can_accept === true, verdict: view?.verdict || null, report: view?.report || null, artifact_verification: view?.artifact_verification || null, error: view?.error || "" };
    }
    if (name === "list_test_evidence")
        return { success: true, task_id: context.taskId, runs: (0, internal_mcp_test_store_1.internalMcpTestEvidence)(context.taskId) };
    throw new Error(`未知 TestAgent 验收工具：${name}`);
}
function runTestAcceptanceMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.TEST_ACCEPTANCE_MCP_SERVER_NAME, tools, callTool });
}
if (require.main === module)
    runTestAcceptanceMcpServer();
//# sourceMappingURL=test-acceptance-mcp.js.map