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
exports.internalMcpTestRunFile = internalMcpTestRunFile;
exports.readInternalMcpTestRun = readInternalMcpTestRun;
exports.createInternalMcpTestRun = createInternalMcpTestRun;
exports.markInternalMcpTestRunStarted = markInternalMcpTestRunStarted;
exports.attachInternalMcpTestRunPid = attachInternalMcpTestRunPid;
exports.executeInternalMcpTestRunFile = executeInternalMcpTestRunFile;
exports.publicInternalMcpTestRun = publicInternalMcpTestRun;
exports.internalMcpTestEvidence = internalMcpTestEvidence;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const execution_plan_1 = require("../test-agent/execution-plan");
const artifact_retention_1 = require("../test-agent/artifact-retention");
const invocation_1 = require("../test-agent/invocation");
const work_order_builder_1 = require("../test-agent/work-order-builder");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "test-acceptance");
const DELIVERY_ROOT = path.join(os.homedir(), ".cc-connect", "internal-mcp", "delivery-workspaces");
function safe(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}
function runDir(taskId) {
    return path.join(ROOT, safe(taskId));
}
function internalMcpTestRunFile(taskId, runId) {
    return path.join(runDir(taskId), `${safe(runId)}.json`);
}
function atomicWrite(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
    if (fs.existsSync(file))
        fs.unlinkSync(file);
    fs.renameSync(temp, file);
}
function readInternalMcpTestRun(taskId, runId = "") {
    const dir = runDir(taskId);
    if (!fs.existsSync(dir))
        return null;
    const files = fs.readdirSync(dir).filter(file => file.endsWith(".json")).map(file => path.join(dir, file)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    const file = runId ? internalMcpTestRunFile(taskId, runId) : files[0];
    if (!file || !fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function selectProjectBindings(context, requested = []) {
    const available = (context.projects?.length ? context.projects : [{ name: context.project, workDir: context.baseWorkDir || context.workDir }]).filter(project => project.name && project.workDir && fs.existsSync(project.workDir));
    const wanted = new Set(requested.map(String).filter(Boolean));
    const selected = wanted.size ? available.filter(project => wanted.has(project.name)) : available;
    if (!selected.length)
        throw new Error("没有找到当前群聊任务允许交给 TestAgent 的项目工作目录");
    if (wanted.size && selected.length !== wanted.size)
        throw new Error("请求包含未绑定到当前任务的测试项目");
    return selected;
}
function runGit(cwd, args) {
    try {
        return String((0, child_process_1.execFileSync)("git", args, { cwd, encoding: "utf-8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] })).trim();
    }
    catch (error) {
        throw new Error(String(error?.stderr || error?.message || "Git 状态读取失败").trim());
    }
}
function samePath(left, right) {
    const normalizedLeft = path.resolve(left);
    const normalizedRight = path.resolve(right);
    return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
}
function resolveDeliveryBindings(context, workspaceIds, requestedProjects) {
    if (!workspaceIds.length)
        return { projects: selectProjectBindings(context, requestedProjects), deliveryBindings: [] };
    if (context.role !== "group-main-agent")
        throw new Error("只有群聊主 Agent 能把交付工作区交给 TestAgent 验收");
    const available = selectProjectBindings(context);
    const allowedByName = new Map(available.map(project => [project.name, project]));
    const uniqueIds = [...new Set(workspaceIds.map(value => safe(value)).filter(Boolean))];
    if (uniqueIds.length !== workspaceIds.length)
        throw new Error("TestAgent 验收工作区包含空值或重复项");
    const records = uniqueIds.map(id => {
        const file = path.join(DELIVERY_ROOT, safe(context.taskId), `${id}.json`);
        if (!fs.existsSync(file))
            throw new Error(`交付工作区不存在：${id}`);
        let record;
        try {
            record = JSON.parse(fs.readFileSync(file, "utf-8"));
        }
        catch {
            throw new Error(`交付工作区记录损坏：${id}`);
        }
        if (record.id !== id || record.task_id !== context.taskId || context.groupId && record.group_id !== context.groupId)
            throw new Error(`交付工作区不属于当前任务：${id}`);
        if (record.status !== "committed" || !/^[a-f0-9]{40}$/i.test(String(record.commit || "")))
            throw new Error(`交付工作区尚未形成可验收提交：${id}`);
        const base = allowedByName.get(String(record.project || ""));
        if (!base)
            throw new Error(`交付工作区项目不在当前任务允许范围：${record.project || id}`);
        const worktreePath = path.resolve(String(record.worktree_path || ""));
        if (!fs.existsSync(worktreePath) || !fs.statSync(worktreePath).isDirectory())
            throw new Error(`交付 worktree 不存在：${id}`);
        const baseRepo = path.resolve(runGit(base.workDir, ["rev-parse", "--show-toplevel"]));
        if (!samePath(baseRepo, String(record.repo_root || "")))
            throw new Error(`交付工作区仓库绑定不一致：${id}`);
        if (!samePath(runGit(worktreePath, ["rev-parse", "--show-toplevel"]), worktreePath))
            throw new Error(`交付 worktree 路径绑定不一致：${id}`);
        if (runGit(worktreePath, ["branch", "--show-current"]) !== record.branch)
            throw new Error(`交付 worktree 分支已变化：${id}`);
        if (runGit(worktreePath, ["rev-parse", "HEAD"]) !== record.commit)
            throw new Error(`交付 worktree HEAD 与待验收提交不一致：${id}`);
        if (runGit(worktreePath, ["status", "--porcelain"]))
            throw new Error(`交付 worktree 仍有未提交改动：${id}`);
        const changedFiles = runGit(worktreePath, ["diff-tree", "--no-commit-id", "--name-only", "-r", record.commit]).split(/\r?\n/).filter(Boolean);
        return {
            project: { ...base, workDir: worktreePath, changedFiles },
            delivery: { workspace_id: id, project: record.project, branch: record.branch, commit: record.commit },
        };
    });
    const projectNames = records.map(row => row.delivery.project);
    if (new Set(projectNames).size !== projectNames.length)
        throw new Error("一次验收不能为同一项目绑定多个交付工作区");
    const wanted = new Set(requestedProjects.map(String).filter(Boolean));
    if (wanted.size && (wanted.size !== projectNames.length || projectNames.some(name => !wanted.has(name))))
        throw new Error("验收项目与交付工作区不一致");
    return { projects: records.map(row => row.project), deliveryBindings: records.map(row => row.delivery) };
}
function createInternalMcpTestRun(context, input = {}) {
    const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
    const requestedProjects = Array.isArray(input.projects) ? input.projects.map(String).filter(Boolean) : [];
    const resolvedBindings = resolveDeliveryBindings(context, Array.isArray(input.workspace_ids) ? input.workspace_ids.map(String).filter(Boolean) : [], requestedProjects);
    const projectBindings = resolvedBindings.projects;
    const runId = `test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const acceptanceCriteria = internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(input.acceptance_criteria?.length ? input.acceptance_criteria : task.acceptance_criteria || task.acceptanceCriteria, 80, 1000);
    const completedTasks = internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(input.completed_tasks || [], 80, 800);
    const handoff = {
        id: runId,
        taskId: context.taskId,
        groupId: context.groupId,
        issuedBy: context.role,
        originalUserGoal: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(task.business_goal || task.description || task.title, 2400),
        acceptanceCriteria,
        completedTasks,
        requiredChecks: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(input.required_checks || [], 50, 100),
        projects: projectBindings.map(project => ({
            name: project.name,
            workDir: project.workDir,
            targetUrl: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(input.target_url || project.targetUrl, 500),
            verificationCommands: Array.isArray(input.verification_commands) && projectBindings.length === 1
                ? internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(input.verification_commands, 30, 300)
                : internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(project.verificationCommands || [], 30, 300),
            changedFiles: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(input.changed_files?.length ? input.changed_files : project.changedFiles || [], 200, 400),
            completedTasks,
            agentSummary: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(input.summary || "群聊主 Agent 请求独立验收当前交付候选", 1000),
        })),
        options: {
            verificationOnly: true,
            browserProvider: ["auto", "playwright", "mcp", "none"].includes(input.browser_provider) ? input.browser_provider : "auto",
            autoDiscoverVerificationCommands: input.auto_discover !== false,
            collectBrowserArtifacts: input.collect_browser_artifacts !== false,
            requireAdversarialProbe: input.require_adversarial_probe !== false,
            ...(input.adversarial_probe_waiver ? { adversarialProbeWaiver: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(input.adversarial_probe_waiver, 800) } : {}),
        },
        metadata: { source: "ccm-internal-test-acceptance-mcp", taskAgentSessionId: context.taskAgentSessionId || "", requestedByProject: context.project, deliveryWorkspaces: resolvedBindings.deliveryBindings },
        completedByProjectAgents: projectBindings.map(project => project.name),
    };
    const built = (0, work_order_builder_1.buildTestAgentWorkOrderFromHandoff)(handoff);
    const plan = (0, execution_plan_1.buildTestAgentExecutionPlan)(built.workOrder);
    const now = new Date().toISOString();
    const state = { schema: "ccm-internal-mcp-test-run-v1", run_id: runId, task_id: context.taskId, group_id: context.groupId, created_at: now, updated_at: now, status: "planned", context, handoff, work_order: built.workOrder, plan, warnings: built.warnings, delivery_bindings: resolvedBindings.deliveryBindings };
    atomicWrite(internalMcpTestRunFile(context.taskId, runId), state);
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(context, "test", { run_id: runId, status: "planned", projects: projectBindings.map(project => project.name), plan_summary: plan.summary }, { type: "internal_mcp_test_plan_created", title: "TestAgent 验收计划已创建", detail: `将独立验证 ${projectBindings.map(project => project.name).join("、")}`, status: plan.valid ? "active" : "warning", phase: "test" });
    return state;
}
function markInternalMcpTestRunStarted(state, pid) {
    const next = { ...state, status: "running", pid, updated_at: new Date().toISOString() };
    atomicWrite(internalMcpTestRunFile(state.task_id, state.run_id), next);
    (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(state.context, "test", { run_id: state.run_id, status: "running" }, { type: "internal_mcp_test_run_started", title: "TestAgent 开始独立验收", detail: `验收运行 ${state.run_id} 已启动`, status: "active", phase: "test" });
    return next;
}
function attachInternalMcpTestRunPid(state, pid) {
    const current = readInternalMcpTestRun(state.task_id, state.run_id);
    if (!current || current.status !== "running")
        return current || state;
    const next = { ...current, pid, updated_at: new Date().toISOString() };
    atomicWrite(internalMcpTestRunFile(state.task_id, state.run_id), next);
    return next;
}
async function executeInternalMcpTestRunFile(file) {
    const resolved = path.resolve(file);
    const root = path.resolve(ROOT);
    if (!(resolved === root || resolved.startsWith(root + path.sep)) || !fs.existsSync(resolved))
        throw new Error("TestAgent 运行文件不在受控目录");
    const state = JSON.parse(fs.readFileSync(resolved, "utf-8"));
    const running = { ...state, status: "running", updated_at: new Date().toISOString(), pid: process.pid };
    atomicWrite(resolved, running);
    try {
        const result = await (0, invocation_1.invokeTestAgentHandoff)(state.handoff);
        const completed = { ...running, status: "completed", updated_at: new Date().toISOString(), invocation_result: result, error: "" };
        atomicWrite(resolved, completed);
        (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(state.context, "test", { run_id: state.run_id, status: "completed", outcome: result.outcome, recommendation: result.recommendation, can_accept: result.canAccept === true }, { type: "internal_mcp_test_run_completed", title: "TestAgent 独立验收完成", detail: result.canAccept ? "验收证据完整，可以进入主 Agent 最终判断" : result.error || result.report?.summary || "验收发现缺口，需要返工或人工判断", status: result.canAccept ? "passed" : "warning", phase: "test" });
        return completed;
    }
    catch (error) {
        const failed = { ...running, status: "failed", updated_at: new Date().toISOString(), error: error?.message || String(error) };
        atomicWrite(resolved, failed);
        (0, internal_mcp_task_store_1.appendInternalMcpTaskJournal)(state.context, "test", { run_id: state.run_id, status: "failed", error: failed.error }, { type: "internal_mcp_test_run_failed", title: "TestAgent 独立验收失败", detail: failed.error || "TestAgent 运行失败", status: "failed", phase: "test" });
        return failed;
    }
}
function publicInternalMcpTestRun(state) {
    if (!state)
        return null;
    const result = state.invocation_result || {};
    return {
        schema: state.schema,
        run_id: state.run_id,
        task_id: state.task_id,
        status: state.status,
        created_at: state.created_at,
        updated_at: state.updated_at,
        plan_valid: state.plan?.valid === true,
        plan_summary: state.plan?.summary || {},
        projects: state.plan?.projects?.map((project) => ({ name: project.name, commands: project.commands?.length || 0, browser_checks: project.browserChecks?.length || 0, http_checks: project.httpChecks?.length || 0 })) || [],
        delivery_bindings: state.delivery_bindings || [],
        warnings: state.warnings || [],
        outcome: result.outcome || "",
        recommendation: result.recommendation || "",
        can_accept: result.canAccept === true,
        error: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(state.error || result.error, 1000),
        report: result.report ? { id: result.report.id, status: result.report.status, summary: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(result.report.summary, 1400), recommendation: result.report.recommendation, started_at: result.report.startedAt, finished_at: result.report.finishedAt } : null,
        verdict: result.verdict ? { id: result.verdict.id, status: result.verdict.status, recommendation: result.verdict.recommendation, canAccept: result.verdict.canAccept, summary: internal_mcp_task_store_1.internalMcpTaskPayload.cleanText(result.verdict.summary, 1400), reasons: internal_mcp_task_store_1.internalMcpTaskPayload.cleanList(result.verdict.reasons, 30, 700) } : null,
        artifact_verification: result.artifactVerification ? { status: result.artifactVerification.status, summary: result.artifactVerification.summary } : null,
    };
}
function internalMcpTestEvidence(taskId) {
    return (0, artifact_retention_1.listTestAgentArtifactCatalogForTasks)([taskId]).map(run => ({ ...run, artifacts: run.artifacts.map(artifact => ({ ...artifact })) }));
}
//# sourceMappingURL=internal-mcp-test-store.js.map