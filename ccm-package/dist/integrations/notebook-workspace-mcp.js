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
exports.NOTEBOOK_WORKSPACE_MCP_SERVER_NAME = void 0;
exports.buildNotebookWorkspaceMcpServerConfig = buildNotebookWorkspaceMcpServerConfig;
exports.runNotebookWorkspaceMcpServer = runNotebookWorkspaceMcpServer;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const unified_evidence_registry_1 = require("../system/unified-evidence-registry");
exports.NOTEBOOK_WORKSPACE_MCP_SERVER_NAME = "ccm__notebook_workspace";
function hash(value) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex"); }
function buildNotebookWorkspaceMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "notebook-workspace-mcp.js"), context);
}
const tools = [
    { name: "notebook_patch", roles: ["project-child-agent"], description: "在当前正式WorkItem的独立worktree内原子插入、替换、删除或移动Notebook单元格，并生成绑定RepoStateIdentity的diff Evidence。", inputSchema: { type: "object", required: ["path", "operation", "work_item_id", "attempt", "lease_id"], properties: { path: { type: "string" }, operation: { enum: ["insert", "replace", "delete", "move"] }, index: { type: "integer", minimum: 0 }, target_index: { type: "integer", minimum: 0 }, cell: { type: "object" }, work_item_id: { type: "string" }, attempt: { type: "integer", minimum: 1 }, lease_id: { type: "string" } }, additionalProperties: false } },
    { name: "notebook_execute", roles: ["project-child-agent"], description: "在当前正式WorkItem与租约门禁下使用已配置Jupyter环境执行Notebook，带超时并生成验证Evidence。", inputSchema: { type: "object", required: ["path", "work_item_id", "attempt", "lease_id"], properties: { path: { type: "string" }, timeout_ms: { type: "integer", minimum: 1000, maximum: 1800000 }, work_item_id: { type: "string" }, attempt: { type: "integer", minimum: 1 }, lease_id: { type: "string" } }, additionalProperties: false } },
];
function notebookPath(context, value, allowed) {
    const root = fs.realpathSync(context.workDir);
    const requested = String(value || "").replace(/\\/g, "/");
    if (!requested || path.isAbsolute(requested) || requested.split("/").includes("..") || path.extname(requested).toLowerCase() !== ".ipynb")
        throw new Error("Notebook路径无效");
    const absolute = path.resolve(root, requested);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    const permitted = allowed.length === 0 || allowed.includes(".") || allowed.some(item => relative === item || relative.startsWith(`${item.replace(/\/$/, "")}/`));
    if (!permitted)
        throw new Error("Notebook不在当前WorkItem允许路径内");
    return { root, absolute, relative };
}
function assertFence(context, args) {
    if (context.role !== "project-child-agent")
        throw new Error("只有项目子Agent可以修改或执行Notebook");
    const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
    const workItemId = String(args?.work_item_id || "");
    const attempt = Math.max(1, Number(args?.attempt || 0));
    const leaseId = String(args?.lease_id || "");
    const expectedWorkItem = String(task.work_item_id || task.workItemId || task.id || "");
    const expectedAttempt = Math.max(1, Number(task.attempt || task.agent_communication_attempt || 1));
    const expectedLease = String(task.agent_communication_lease_id || task.lease_id || task.leaseId || "");
    if (!workItemId || workItemId !== expectedWorkItem)
        throw new Error("Notebook操作WorkItem身份不匹配");
    if (attempt !== expectedAttempt)
        throw new Error("Notebook操作attempt已过期");
    if (!leaseId || (expectedLease && leaseId !== expectedLease))
        throw new Error("Notebook操作lease已过期或缺失");
    const allowed = (Array.isArray(task.allowed_paths || task.allowedPaths) ? task.allowed_paths || task.allowedPaths : []).map((item) => String(item || "").replace(/\\/g, "/").replace(/^\.\//, "")).filter(Boolean);
    return { task, workItemId, attempt, leaseId, allowed };
}
function validateCell(value) {
    if (!value || typeof value !== "object" || !["code", "markdown", "raw"].includes(String(value.cell_type || "")))
        throw new Error("Notebook cell必须包含有效cell_type");
    const source = Array.isArray(value.source) ? value.source.map(String) : [String(value.source || "")];
    return { id: String(value.id || `cell-${crypto.randomBytes(6).toString("hex")}`), cell_type: String(value.cell_type), metadata: value.metadata && typeof value.metadata === "object" ? value.metadata : {}, source, ...(value.cell_type === "code" ? { execution_count: null, outputs: [] } : {}) };
}
function readNotebook(file) {
    const raw = fs.readFileSync(file, "utf8");
    if (Buffer.byteLength(raw) > 16 * 1024 * 1024)
        throw new Error("Notebook超过16MB限制");
    const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.cells) || !Number.isFinite(Number(value.nbformat)))
        throw new Error("Notebook JSON结构无效");
    return { raw, value };
}
function atomicWrite(file, value) {
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 1)}\n`, { encoding: "utf8", mode: 0o600 });
    JSON.parse(fs.readFileSync(temp, "utf8"));
    fs.renameSync(temp, file);
}
async function callTool(context, name, args) {
    const { loadOrchestratorConfig } = require("../modules/collaboration/group-orchestrator-config");
    if (loadOrchestratorConfig().notebookToolsEnabled === false)
        throw new Error("Notebook工具已关闭");
    const fence = assertFence(context, args);
    const target = notebookPath(context, args.path, fence.allowed);
    if (!fs.existsSync(target.absolute))
        throw new Error("Notebook不存在");
    if (name === "notebook_patch") {
        const before = readNotebook(target.absolute);
        const index = Math.max(0, Number(args.index || 0));
        if (args.operation === "insert")
            before.value.cells.splice(Math.min(index, before.value.cells.length), 0, validateCell(args.cell));
        else if (args.operation === "replace") {
            if (index >= before.value.cells.length)
                throw new Error("cell index越界");
            before.value.cells[index] = validateCell(args.cell);
        }
        else if (args.operation === "delete") {
            if (index >= before.value.cells.length)
                throw new Error("cell index越界");
            before.value.cells.splice(index, 1);
        }
        else if (args.operation === "move") {
            if (index >= before.value.cells.length)
                throw new Error("cell index越界");
            const [cell] = before.value.cells.splice(index, 1);
            before.value.cells.splice(Math.min(Math.max(0, Number(args.target_index || 0)), before.value.cells.length), 0, cell);
        }
        else
            throw new Error("不支持的Notebook patch操作");
        atomicWrite(target.absolute, before.value);
        const after = fs.readFileSync(target.absolute, "utf8");
        const repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(target.root, [target.relative]);
        const evidence = (0, unified_evidence_registry_1.recordEvidence)({ evidenceType: "diff", taskId: context.taskId, workItemId: fence.workItemId, scope: "project", scopeId: context.project, exactSessionId: context.taskAgentSessionId, generation: Number(context.nativeGeneration || 0), attempt: fence.attempt, leaseId: fence.leaseId, repoStateIdentity, producerAgentId: context.taskAgentSessionId || context.project, status: "valid", subject: `notebook_patch:${args.operation}`, references: [target.relative], summary: `Notebook ${args.operation} completed`, sourceChecksum: hash({ before: hash(before.raw), after: hash(after) }) });
        (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "workspace", { action: "notebook_patch", path: target.relative, operation: args.operation, before_checksum: hash(before.raw), after_checksum: hash(after), evidence_id: evidence.evidenceId, contentStored: false }, { type: "notebook_patch", title: "Notebook变更", detail: `${target.relative} ${args.operation}`, status: "completed" });
        return { success: true, schema: "ccm-notebook-patch-result-v1", path: target.relative, operation: args.operation, beforeChecksum: hash(before.raw), afterChecksum: hash(after), evidenceId: evidence.evidenceId, repoStateIdentity, contentStored: false };
    }
    if (name === "notebook_execute") {
        const before = fs.readFileSync(target.absolute, "utf8");
        const timeout = Math.max(1000, Math.min(1_800_000, Number(args.timeout_ms || 300_000)));
        const run = (0, child_process_1.spawnSync)("jupyter", ["nbconvert", "--to", "notebook", "--execute", "--inplace", `--ExecutePreprocessor.timeout=${Math.ceil(timeout / 1000)}`, target.relative], { cwd: target.root, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, JUPYTER_PLATFORM_DIRS: "1" } });
        const success = run.status === 0 && !run.error;
        const after = fs.existsSync(target.absolute) ? fs.readFileSync(target.absolute, "utf8") : before;
        readNotebook(target.absolute);
        const repoStateIdentity = (0, unified_evidence_registry_1.captureRepoStateIdentity)(target.root, [target.relative]);
        const evidence = (0, unified_evidence_registry_1.recordEvidence)({ evidenceType: "test", taskId: context.taskId, workItemId: fence.workItemId, scope: "project", scopeId: context.project, exactSessionId: context.taskAgentSessionId, generation: Number(context.nativeGeneration || 0), attempt: fence.attempt, leaseId: fence.leaseId, repoStateIdentity, producerAgentId: context.taskAgentSessionId || context.project, status: success ? "valid" : "invalid", subject: "jupyter nbconvert --execute", references: [target.relative], summary: success ? "Notebook execution passed" : `Notebook execution failed (${String(run.error?.message || run.stderr || "unknown").replace(/[\r\n]+/g, " ").slice(0, 300)})`, sourceChecksum: hash({ before: hash(before), after: hash(after), status: run.status }) });
        (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "test", { action: "notebook_execute", path: target.relative, success, exit_code: run.status, evidence_id: evidence.evidenceId, result_checksum: hash(after), contentStored: false }, { type: "notebook_execute", title: "Notebook执行", detail: `${target.relative}: ${success ? "通过" : "失败"}`, status: success ? "completed" : "failed" });
        return { success, schema: "ccm-notebook-execution-result-v1", path: target.relative, exitCode: run.status, timedOut: !!run.error && /timed out/i.test(String(run.error.message)), notebookChecksum: hash(after), evidenceId: evidence.evidenceId, repoStateIdentity, contentStored: false };
    }
    throw new Error("未知Notebook工具");
}
function runNotebookWorkspaceMcpServer() { (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.NOTEBOOK_WORKSPACE_MCP_SERVER_NAME, tools, callTool }); }
if (require.main === module)
    runNotebookWorkspaceMcpServer();
//# sourceMappingURL=notebook-workspace-mcp.js.map