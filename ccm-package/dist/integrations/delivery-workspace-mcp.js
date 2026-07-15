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
exports.DELIVERY_WORKSPACE_MCP_SERVER_NAME = void 0;
exports.buildDeliveryWorkspaceMcpServerConfig = buildDeliveryWorkspaceMcpServerConfig;
exports.runDeliveryWorkspaceMcpServer = runDeliveryWorkspaceMcpServer;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const worktree_1 = require("../agents/worktree");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const internal_mcp_test_store_1 = require("./internal-mcp-test-store");
exports.DELIVERY_WORKSPACE_MCP_SERVER_NAME = "ccm__delivery_workspace";
const ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "delivery-workspaces");
function buildDeliveryWorkspaceMcpServerConfig(context) {
    return (0, internal_mcp_runtime_1.buildInternalMcpServerConfig)(path.join(__dirname, "delivery-workspace-mcp.js"), context);
}
const tools = [
    { name: "create_delivery_worktree", description: "为当前任务中的指定项目创建独立 ccm/* 分支和 worktree。仅群聊主 Agent 可创建。", roles: ["group-main-agent"], inputSchema: { type: "object", required: ["project"], properties: { project: { type: "string" }, purpose: { type: "string" } }, additionalProperties: false } },
    { name: "get_delivery_diff", description: "读取当前绑定工作区或指定受控 worktree 的 git 状态、统计和逐行 diff。", roles: ["group-main-agent", "project-child-agent", "test-agent"], inputSchema: { type: "object", properties: { workspace_id: { type: "string" }, max_chars: { type: "number", minimum: 1000, maximum: 200000 } }, additionalProperties: false } },
    { name: "run_project_checks", description: "在受控工作区执行项目配置或 package.json 中已经声明的 test/check/lint/build 验证命令，不接受任意 shell。", roles: ["group-main-agent", "project-child-agent", "test-agent"], inputSchema: { type: "object", properties: { workspace_id: { type: "string" }, checks: { type: "array", maxItems: 8, items: { type: "string", enum: ["test", "check", "lint", "build"] } } }, additionalProperties: false } },
    { name: "commit_delivery_branch", description: "在受控 ccm/* worktree 中提交当前变更并生成可验收的分支回执，不会合并到主分支。", roles: ["group-main-agent", "project-child-agent"], inputSchema: { type: "object", required: ["message"], properties: { workspace_id: { type: "string" }, message: { type: "string" } }, additionalProperties: false } },
    { name: "merge_approved_delivery", description: "在 TestAgent canAccept 后把受控 ccm/* 分支合并回原仓库。仅群聊主 Agent 可执行，主仓库必须干净。", roles: ["group-main-agent"], inputSchema: { type: "object", required: ["workspace_id", "test_run_id"], properties: { workspace_id: { type: "string" }, test_run_id: { type: "string" } }, additionalProperties: false } },
    { name: "cleanup_delivery_worktree", description: "清理已经合并且无未提交改动的受控 worktree，并安全删除已合并分支。仅群聊主 Agent可执行。", roles: ["group-main-agent"], inputSchema: { type: "object", required: ["workspace_id"], properties: { workspace_id: { type: "string" } }, additionalProperties: false } },
];
function safe(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}
function taskDir(taskId) {
    return path.join(ROOT, safe(taskId));
}
function workspaceFile(taskId, id) {
    return path.join(taskDir(taskId), `${safe(id)}.json`);
}
function writeWorkspace(record) {
    const file = workspaceFile(record.task_id, record.id);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(record, null, 2)}\n`, "utf-8");
    if (fs.existsSync(file))
        fs.unlinkSync(file);
    fs.renameSync(temp, file);
    return record;
}
function readWorkspace(context, id) {
    const file = workspaceFile(context.taskId, id);
    if (!id || !fs.existsSync(file))
        throw new Error("受控交付工作区不存在");
    const record = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (record.task_id !== context.taskId || context.groupId && record.group_id !== context.groupId)
        throw new Error("交付工作区不属于当前任务");
    if (context.role !== "group-main-agent" && record.project !== context.project)
        throw new Error("项目子 Agent 不能访问其他项目的交付工作区");
    return record;
}
function runGit(cwd, args, allowFailure = false) {
    const result = (0, child_process_1.spawnSync)("git", args, { cwd, encoding: "utf-8", windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    if (!allowFailure && (result.error || result.status !== 0))
        throw new Error(output || result.error?.message || `git ${args[0]} 执行失败`);
    return { status: result.status ?? -1, output };
}
function repoInfo(workDir) {
    const resolved = path.resolve(workDir);
    if (!fs.existsSync(resolved))
        throw new Error("工作目录不存在");
    const repoRoot = runGit(resolved, ["rev-parse", "--show-toplevel"]).output;
    const branch = runGit(resolved, ["branch", "--show-current"]).output;
    const head = runGit(resolved, ["rev-parse", "HEAD"]).output;
    return { workDir: resolved, repoRoot: path.resolve(repoRoot), branch, head };
}
function bindingFor(context, project) {
    const bindings = context.projects?.length ? context.projects : [{ name: context.project, workDir: context.baseWorkDir || context.workDir }];
    const binding = bindings.find(item => item.name === project);
    if (!binding?.workDir || !fs.existsSync(binding.workDir))
        throw new Error("项目不在当前任务的受控工作区列表中");
    return binding;
}
function currentWorkspaceRecord(context, id = "") {
    if (id)
        return readWorkspace(context, id);
    const info = repoInfo(context.workDir);
    if (!info.branch.startsWith("ccm/"))
        throw new Error("当前目录不是受控 ccm/* 交付 worktree，请提供 workspace_id 或由主 Agent 创建 worktree");
    const record = {
        schema: "ccm-internal-mcp-delivery-workspace-v1",
        id: `workspace_${crypto.createHash("sha256").update(`${context.taskId}|${info.workDir}|${info.branch}`).digest("hex").slice(0, 16)}`,
        task_id: context.taskId,
        group_id: context.groupId,
        project: context.project,
        repo_root: path.resolve(runGit(info.workDir, ["rev-parse", "--git-common-dir"]).output, ".."),
        worktree_path: info.workDir,
        branch: info.branch,
        base_branch: "",
        base_head: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "active",
        head: info.head,
    };
    return writeWorkspace(record);
}
function publicWorkspace(record) {
    return { id: record.id, task_id: record.task_id, project: record.project, branch: record.branch, base_branch: record.base_branch, base_head: record.base_head, head: record.head || "", commit: record.commit || "", status: record.status, worktree_path: record.worktree_path, created_at: record.created_at, updated_at: record.updated_at, test_run_id: record.test_run_id || "" };
}
function createWorkspace(context, args) {
    (0, internal_mcp_runtime_1.assertInternalMcpRole)(context, ["group-main-agent"], "create_delivery_worktree");
    const project = String(args?.project || "").trim();
    const binding = bindingFor(context, project);
    const created = (0, worktree_1.createChildAgentWorktree)(binding.workDir, { taskId: context.taskId, agentName: project, sourceProject: context.project, reuseKey: `delivery-${context.taskId}-${project}`, failClosed: true });
    const info = repoInfo(created.worktreePath);
    const record = {
        schema: "ccm-internal-mcp-delivery-workspace-v1",
        id: `workspace_${crypto.createHash("sha256").update(`${context.taskId}|${created.worktreePath}|${created.worktreeBranch}`).digest("hex").slice(0, 16)}`,
        task_id: context.taskId,
        group_id: context.groupId,
        project,
        repo_root: repoInfo(binding.workDir).repoRoot,
        worktree_path: created.worktreePath,
        branch: created.worktreeBranch,
        base_branch: created.baseBranch,
        base_head: created.baseHead,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "active",
        head: info.head,
    };
    writeWorkspace(record);
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "workspace", { action: "created", workspace_id: record.id, project, branch: record.branch }, { type: "internal_mcp_delivery_worktree_created", title: `已为 ${project} 创建独立交付工作区`, detail: args?.purpose || `分支 ${record.branch} 已准备`, status: "active", phase: "dispatch" });
    return { success: true, workspace: publicWorkspace(record) };
}
function diffWorkspace(context, args) {
    const record = currentWorkspaceRecord(context, String(args?.workspace_id || ""));
    const maxChars = Math.max(1000, Math.min(200000, Number(args?.max_chars || 80000)));
    const status = runGit(record.worktree_path, ["status", "--short"], true).output;
    const stat = runGit(record.worktree_path, ["diff", "--stat", "HEAD"], true).output;
    const diff = runGit(record.worktree_path, ["diff", "--no-ext-diff", "--unified=3", "HEAD"], true).output;
    const head = runGit(record.worktree_path, ["rev-parse", "HEAD"]).output;
    const updated = writeWorkspace({ ...record, head, updated_at: new Date().toISOString() });
    return { success: true, workspace: publicWorkspace(updated), clean: !status, status, stat, diff: diff.slice(0, maxChars), truncated: diff.length > maxChars };
}
function configuredChecks(context, record, requested) {
    const binding = (context.projects || []).find(item => item.name === record.project) || { name: record.project, workDir: record.worktree_path };
    const commands = [...(binding.verificationCommands || [])];
    const packageFile = path.join(record.worktree_path, "package.json");
    if (fs.existsSync(packageFile)) {
        try {
            const scripts = JSON.parse(fs.readFileSync(packageFile, "utf-8"))?.scripts || {};
            for (const name of ["test", "check", "lint", "build"])
                if (scripts[name])
                    commands.push(`npm run ${name}`);
        }
        catch { }
    }
    const wanted = new Set(requested.length ? requested : ["test", "check", "lint", "build"]);
    return [...new Set(commands)].filter(command => [...wanted].some(check => new RegExp(`(^|[ :_-])${check}($|[ :_-])`, "i").test(command))).filter(command => !/[;&|`$<>\r\n]/.test(command)).slice(0, 8);
}
function executable(command) {
    const tokens = command.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length || !["npm", "pnpm", "yarn", "mvn", "mvnw", "gradle", "gradlew", "pytest", "go", "cargo"].includes(tokens[0].replace(/^\.\//, "").replace(/\.cmd$/i, "")))
        throw new Error(`验证命令不在允许范围：${command}`);
    if (process.platform === "win32" && ["npm", "pnpm", "yarn"].includes(tokens[0]))
        tokens[0] += ".cmd";
    return { file: tokens[0], args: tokens.slice(1) };
}
function runChecks(context, args) {
    const record = currentWorkspaceRecord(context, String(args?.workspace_id || ""));
    const commands = configuredChecks(context, record, Array.isArray(args?.checks) ? args.checks : []);
    if (!commands.length)
        throw new Error("项目没有配置可执行的 test/check/lint/build 验证命令");
    const results = commands.map(command => {
        const spec = executable(command);
        const result = (0, child_process_1.spawnSync)(spec.file, spec.args, { cwd: record.worktree_path, encoding: "utf-8", windowsHide: true, shell: process.platform === "win32", timeout: 15 * 60_000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, CI: "1" } });
        return { command, status: result.status === 0 ? "passed" : "failed", exit_code: result.status ?? -1, output: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(`${result.stdout || ""}\n${result.stderr || ""}`.slice(-12000), 12000) };
    });
    const passed = results.every(result => result.status === "passed");
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "workspace", { action: "checks", workspace_id: record.id, passed, results: results.map(result => ({ command: result.command, status: result.status, exit_code: result.exit_code })) }, { type: "internal_mcp_delivery_checks_completed", title: `${record.project} 项目验证${passed ? "通过" : "失败"}`, detail: results.map(result => `${result.command}: ${result.status}`).join("；"), status: passed ? "passed" : "failed", phase: "test" });
    return { success: passed, workspace: publicWorkspace(record), results };
}
function commitBranch(context, args) {
    const record = currentWorkspaceRecord(context, String(args?.workspace_id || ""));
    const info = repoInfo(record.worktree_path);
    if (!info.branch.startsWith("ccm/") || info.branch !== record.branch)
        throw new Error("只能提交当前任务受控的 ccm/* 分支");
    const message = internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(args?.message, 240);
    if (!message)
        throw new Error("提交说明不能为空");
    runGit(record.worktree_path, ["add", "--all"]);
    const staged = runGit(record.worktree_path, ["diff", "--cached", "--name-only"], true).output;
    if (!staged)
        throw new Error("当前工作区没有待提交变更");
    runGit(record.worktree_path, ["commit", "-m", message]);
    const commit = runGit(record.worktree_path, ["rev-parse", "HEAD"]).output;
    const updated = writeWorkspace({ ...record, status: "committed", commit, head: commit, updated_at: new Date().toISOString() });
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "delivery", { status: "candidate", workspace_id: record.id, project: record.project, branch: record.branch, commit, files_changed: staged.split(/\r?\n/).filter(Boolean), acceptance_required: true }, { type: "internal_mcp_delivery_branch_committed", title: `${record.project} 已提交交付分支`, detail: `${record.branch} @ ${commit.slice(0, 12)}，等待 TestAgent 与主 Agent 验收`, status: "active", phase: "review" });
    return { success: true, workspace: publicWorkspace(updated), files_changed: staged.split(/\r?\n/).filter(Boolean), next: "创建并运行 TestAgent 验收，只有 canAccept 后群聊主 Agent 才能合并" };
}
function mergeBranch(context, args) {
    (0, internal_mcp_runtime_1.assertInternalMcpRole)(context, ["group-main-agent"], "merge_approved_delivery");
    const record = readWorkspace(context, String(args?.workspace_id || ""));
    if (record.status !== "committed")
        throw new Error("交付分支尚未形成已提交候选，不能合并");
    const testState = (0, internal_mcp_test_store_1.readInternalMcpTestRun)(context.taskId, String(args?.test_run_id || ""));
    const testView = (0, internal_mcp_test_store_1.publicInternalMcpTestRun)(testState);
    if (!testView || testView.can_accept !== true || testView.status !== "completed")
        throw new Error("TestAgent 尚未给出 canAccept=true 的完整验收结论");
    const testedDelivery = testState?.delivery_bindings?.find(binding => binding.workspace_id === record.id);
    if (!testedDelivery || testedDelivery.project !== record.project || testedDelivery.branch !== record.branch || testedDelivery.commit !== record.commit) {
        throw new Error("TestAgent 结论未绑定当前交付工作区和提交，已拒绝合并");
    }
    const deliveryHead = repoInfo(record.worktree_path);
    if (deliveryHead.branch !== record.branch || deliveryHead.head !== record.commit)
        throw new Error("TestAgent 验收后交付分支或提交已变化，请重新验收");
    if (runGit(record.worktree_path, ["status", "--porcelain"], true).output)
        throw new Error("TestAgent 验收后交付 worktree 出现新改动，请重新提交并验收");
    const repo = repoInfo(record.repo_root);
    if (runGit(repo.repoRoot, ["status", "--porcelain"], true).output)
        throw new Error("原仓库存在未提交改动，为避免覆盖用户工作已拒绝合并");
    if (!record.branch.startsWith("ccm/"))
        throw new Error("只能合并受控 ccm/* 分支");
    const result = runGit(repo.repoRoot, ["merge", "--no-ff", record.branch, "-m", `merge: ${record.project} ${context.taskId}`], true);
    if (result.status !== 0) {
        runGit(repo.repoRoot, ["merge", "--abort"], true);
        throw new Error(`交付分支合并失败并已回滚：${result.output}`);
    }
    const head = runGit(repo.repoRoot, ["rev-parse", "HEAD"]).output;
    const updated = writeWorkspace({ ...record, status: "merged", head, merged_at: new Date().toISOString(), updated_at: new Date().toISOString(), test_run_id: testView.run_id });
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "workspace", { action: "merged", workspace_id: record.id, project: record.project, branch: record.branch, head, test_run_id: testView.run_id }, { type: "internal_mcp_delivery_merged", title: `${record.project} 交付已通过验收并合并`, detail: `${record.branch} 已合并，TestAgent 验收 ${testView.run_id}`, status: "passed", phase: "completion" });
    return { success: true, workspace: publicWorkspace(updated), test_verdict: testView.verdict };
}
function cleanupWorkspace(context, args) {
    (0, internal_mcp_runtime_1.assertInternalMcpRole)(context, ["group-main-agent"], "cleanup_delivery_worktree");
    const record = readWorkspace(context, String(args?.workspace_id || ""));
    if (record.status !== "merged")
        throw new Error("只有已合并的交付 worktree 才能清理");
    if (runGit(record.worktree_path, ["status", "--porcelain"], true).output)
        throw new Error("worktree 仍有未提交改动，已拒绝清理");
    runGit(record.repo_root, ["worktree", "remove", record.worktree_path]);
    runGit(record.repo_root, ["branch", "-d", record.branch]);
    const updated = writeWorkspace({ ...record, status: "cleaned", updated_at: new Date().toISOString() });
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "workspace", { action: "cleaned", workspace_id: record.id, project: record.project, branch: record.branch }, { type: "internal_mcp_delivery_worktree_cleaned", title: `${record.project} 交付工作区已清理`, detail: `已安全清理合并后的 ${record.branch}`, status: "passed", phase: "completion" });
    return { success: true, workspace: publicWorkspace(updated) };
}
function callTool(context, name, args) {
    if (name === "create_delivery_worktree")
        return createWorkspace(context, args);
    if (name === "get_delivery_diff")
        return diffWorkspace(context, args);
    if (name === "run_project_checks")
        return runChecks(context, args);
    if (name === "commit_delivery_branch")
        return commitBranch(context, args);
    if (name === "merge_approved_delivery")
        return mergeBranch(context, args);
    if (name === "cleanup_delivery_worktree")
        return cleanupWorkspace(context, args);
    throw new Error(`未知交付工作区工具：${name}`);
}
function runDeliveryWorkspaceMcpServer() {
    (0, internal_mcp_runtime_1.runInternalMcpServer)({ name: exports.DELIVERY_WORKSPACE_MCP_SERVER_NAME, tools, callTool });
}
if (require.main === module)
    runDeliveryWorkspaceMcpServer();
//# sourceMappingURL=delivery-workspace-mcp.js.map