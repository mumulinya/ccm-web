import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { buildInternalMcpServerConfig, type InternalMcpTaskContext, type InternalMcpToolDefinition, runInternalMcpServer } from "./internal-mcp-runtime";
import { getBoundInternalMcpTask, appendInternalMcpTaskJournal } from "./internal-mcp-task-store";
import { captureRepoStateIdentity, recordEvidence } from "../system/unified-evidence-registry";

export const NOTEBOOK_WORKSPACE_MCP_SERVER_NAME = "ccm__notebook_workspace";
function hash(value: any) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex"); }

export function buildNotebookWorkspaceMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">) {
  return buildInternalMcpServerConfig(path.join(__dirname, "notebook-workspace-mcp.js"), context);
}

const tools: InternalMcpToolDefinition[] = [
  { name: "notebook_patch", roles: ["project-child-agent"], description: "在当前正式WorkItem的独立worktree内原子插入、替换、删除或移动Notebook单元格，并生成绑定RepoStateIdentity的diff Evidence。", inputSchema: { type: "object", required: ["path", "operation", "work_item_id", "attempt", "lease_id"], properties: { path: { type: "string" }, operation: { enum: ["insert", "replace", "delete", "move"] }, index: { type: "integer", minimum: 0 }, target_index: { type: "integer", minimum: 0 }, cell: { type: "object" }, work_item_id: { type: "string" }, attempt: { type: "integer", minimum: 1 }, lease_id: { type: "string" } }, additionalProperties: false } },
  { name: "notebook_execute", roles: ["project-child-agent"], description: "在当前正式WorkItem与租约门禁下使用已配置Jupyter环境执行Notebook，带超时并生成验证Evidence。", inputSchema: { type: "object", required: ["path", "work_item_id", "attempt", "lease_id"], properties: { path: { type: "string" }, timeout_ms: { type: "integer", minimum: 1000, maximum: 1800000 }, work_item_id: { type: "string" }, attempt: { type: "integer", minimum: 1 }, lease_id: { type: "string" } }, additionalProperties: false } },
];

function notebookPath(context: InternalMcpTaskContext, value: any, allowed: string[]) {
  const root = fs.realpathSync(context.workDir);
  const requested = String(value || "").replace(/\\/g, "/");
  if (!requested || path.isAbsolute(requested) || requested.split("/").includes("..") || path.extname(requested).toLowerCase() !== ".ipynb") throw new Error("Notebook路径无效");
  const absolute = path.resolve(root, requested);
  const relative = path.relative(root, absolute).replace(/\\/g, "/");
  const permitted = allowed.length === 0 || allowed.includes(".") || allowed.some(item => relative === item || relative.startsWith(`${item.replace(/\/$/, "")}/`));
  if (!permitted) throw new Error("Notebook不在当前WorkItem允许路径内");
  return { root, absolute, relative };
}

function assertFence(context: InternalMcpTaskContext, args: any) {
  if (context.role !== "project-child-agent") throw new Error("只有项目子Agent可以修改或执行Notebook");
  const task: any = getBoundInternalMcpTask(context);
  const workItemId = String(args?.work_item_id || "");
  const attempt = Math.max(1, Number(args?.attempt || 0));
  const leaseId = String(args?.lease_id || "");
  const expectedWorkItem = String(task.work_item_id || task.workItemId || task.id || "");
  const expectedAttempt = Math.max(1, Number(task.attempt || task.agent_communication_attempt || 1));
  const expectedLease = String(task.agent_communication_lease_id || task.lease_id || task.leaseId || "");
  if (!workItemId || workItemId !== expectedWorkItem) throw new Error("Notebook操作WorkItem身份不匹配");
  if (attempt !== expectedAttempt) throw new Error("Notebook操作attempt已过期");
  if (!leaseId || (expectedLease && leaseId !== expectedLease)) throw new Error("Notebook操作lease已过期或缺失");
  const allowed = (Array.isArray(task.allowed_paths || task.allowedPaths) ? task.allowed_paths || task.allowedPaths : []).map((item: any) => String(item || "").replace(/\\/g, "/").replace(/^\.\//, "")).filter(Boolean);
  return { task, workItemId, attempt, leaseId, allowed };
}

function validateCell(value: any) {
  if (!value || typeof value !== "object" || !["code", "markdown", "raw"].includes(String(value.cell_type || ""))) throw new Error("Notebook cell必须包含有效cell_type");
  const source = Array.isArray(value.source) ? value.source.map(String) : [String(value.source || "")];
  return { id: String(value.id || `cell-${crypto.randomBytes(6).toString("hex")}`), cell_type: String(value.cell_type), metadata: value.metadata && typeof value.metadata === "object" ? value.metadata : {}, source, ...(value.cell_type === "code" ? { execution_count: null, outputs: [] } : {}) };
}

function readNotebook(file: string) {
  const raw = fs.readFileSync(file, "utf8");
  if (Buffer.byteLength(raw) > 16 * 1024 * 1024) throw new Error("Notebook超过16MB限制");
  const value = JSON.parse(raw);
  if (!value || !Array.isArray(value.cells) || !Number.isFinite(Number(value.nbformat))) throw new Error("Notebook JSON结构无效");
  return { raw, value };
}

function atomicWrite(file: string, value: any) {
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 1)}\n`, { encoding: "utf8", mode: 0o600 });
  JSON.parse(fs.readFileSync(temp, "utf8"));
  fs.renameSync(temp, file);
}

async function callTool(context: InternalMcpTaskContext, name: string, args: any) {
  const { loadOrchestratorConfig } = require("../modules/collaboration/group-orchestrator-config");
  if (loadOrchestratorConfig().notebookToolsEnabled === false) throw new Error("Notebook工具已关闭");
  const fence = assertFence(context, args);
  const target = notebookPath(context, args.path, fence.allowed);
  if (!fs.existsSync(target.absolute)) throw new Error("Notebook不存在");
  if (name === "notebook_patch") {
    const before = readNotebook(target.absolute);
    const index = Math.max(0, Number(args.index || 0));
    if (args.operation === "insert") before.value.cells.splice(Math.min(index, before.value.cells.length), 0, validateCell(args.cell));
    else if (args.operation === "replace") { if (index >= before.value.cells.length) throw new Error("cell index越界"); before.value.cells[index] = validateCell(args.cell); }
    else if (args.operation === "delete") { if (index >= before.value.cells.length) throw new Error("cell index越界"); before.value.cells.splice(index, 1); }
    else if (args.operation === "move") { if (index >= before.value.cells.length) throw new Error("cell index越界"); const [cell] = before.value.cells.splice(index, 1); before.value.cells.splice(Math.min(Math.max(0, Number(args.target_index || 0)), before.value.cells.length), 0, cell); }
    else throw new Error("不支持的Notebook patch操作");
    atomicWrite(target.absolute, before.value);
    const after = fs.readFileSync(target.absolute, "utf8");
    const repoStateIdentity = captureRepoStateIdentity(target.root, [target.relative]);
    const evidence = recordEvidence({ evidenceType: "diff", taskId: context.taskId, workItemId: fence.workItemId, scope: "project", scopeId: context.project, exactSessionId: context.taskAgentSessionId, generation: Number(context.nativeGeneration || 0), attempt: fence.attempt, leaseId: fence.leaseId, repoStateIdentity, producerAgentId: context.taskAgentSessionId || context.project, status: "valid", subject: `notebook_patch:${args.operation}`, references: [target.relative], summary: `Notebook ${args.operation} completed`, sourceChecksum: hash({ before: hash(before.raw), after: hash(after) }) });
    appendInternalMcpTaskJournal(context, "workspace", { action: "notebook_patch", path: target.relative, operation: args.operation, before_checksum: hash(before.raw), after_checksum: hash(after), evidence_id: evidence.evidenceId, contentStored: false }, { type: "notebook_patch", title: "Notebook变更", detail: `${target.relative} ${args.operation}`, status: "completed" });
    return { success: true, schema: "ccm-notebook-patch-result-v1", path: target.relative, operation: args.operation, beforeChecksum: hash(before.raw), afterChecksum: hash(after), evidenceId: evidence.evidenceId, repoStateIdentity, contentStored: false };
  }
  if (name === "notebook_execute") {
    const before = fs.readFileSync(target.absolute, "utf8");
    const timeout = Math.max(1000, Math.min(1_800_000, Number(args.timeout_ms || 300_000)));
    const run = spawnSync("jupyter", ["nbconvert", "--to", "notebook", "--execute", "--inplace", `--ExecutePreprocessor.timeout=${Math.ceil(timeout / 1000)}`, target.relative], { cwd: target.root, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, JUPYTER_PLATFORM_DIRS: "1" } });
    const success = run.status === 0 && !run.error;
    const after = fs.existsSync(target.absolute) ? fs.readFileSync(target.absolute, "utf8") : before;
    readNotebook(target.absolute);
    const repoStateIdentity = captureRepoStateIdentity(target.root, [target.relative]);
    const evidence = recordEvidence({ evidenceType: "test", taskId: context.taskId, workItemId: fence.workItemId, scope: "project", scopeId: context.project, exactSessionId: context.taskAgentSessionId, generation: Number(context.nativeGeneration || 0), attempt: fence.attempt, leaseId: fence.leaseId, repoStateIdentity, producerAgentId: context.taskAgentSessionId || context.project, status: success ? "valid" : "invalid", subject: "jupyter nbconvert --execute", references: [target.relative], summary: success ? "Notebook execution passed" : `Notebook execution failed (${String(run.error?.message || run.stderr || "unknown").replace(/[\r\n]+/g, " ").slice(0, 300)})`, sourceChecksum: hash({ before: hash(before), after: hash(after), status: run.status }) });
    appendInternalMcpTaskJournal(context, "test", { action: "notebook_execute", path: target.relative, success, exit_code: run.status, evidence_id: evidence.evidenceId, result_checksum: hash(after), contentStored: false }, { type: "notebook_execute", title: "Notebook执行", detail: `${target.relative}: ${success ? "通过" : "失败"}`, status: success ? "completed" : "failed" });
    return { success, schema: "ccm-notebook-execution-result-v1", path: target.relative, exitCode: run.status, timedOut: !!run.error && /timed out/i.test(String(run.error.message)), notebookChecksum: hash(after), evidenceId: evidence.evidenceId, repoStateIdentity, contentStored: false };
  }
  throw new Error("未知Notebook工具");
}

export function runNotebookWorkspaceMcpServer() { runInternalMcpServer({ name: NOTEBOOK_WORKSPACE_MCP_SERVER_NAME, tools, callTool }); }
if (require.main === module) runNotebookWorkspaceMcpServer();
