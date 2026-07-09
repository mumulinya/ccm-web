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
exports.sanitizeExecutionEnv = sanitizeExecutionEnv;
exports.isSafeVerificationCommand = isSafeVerificationCommand;
exports.buildDevelopmentTaskPacket = buildDevelopmentTaskPacket;
exports.validateDevelopmentTaskPacket = validateDevelopmentTaskPacket;
exports.ensureExecution = ensureExecution;
exports.loadExecution = loadExecution;
exports.listExecutions = listExecutions;
exports.purgeTaskExecutionArtifacts = purgeTaskExecutionArtifacts;
exports.transitionExecution = transitionExecution;
exports.attachExecutionWorkspace = attachExecutionWorkspace;
exports.registerExternalRunnerRequest = registerExternalRunnerRequest;
exports.listActiveAgentRuns = listActiveAgentRuns;
exports.cancelActiveAgentRun = cancelActiveAgentRun;
exports.trackManagedChildProcess = trackManagedChildProcess;
exports.terminateManagedChildProcess = terminateManagedChildProcess;
exports.clearTaskCancellation = clearTaskCancellation;
exports.isTaskCancellationRequested = isTaskCancellationRequested;
exports.requestTaskCancellation = requestTaskCancellation;
exports.runManagedCommand = runManagedCommand;
exports.persistBoundedOutput = persistBoundedOutput;
exports.classifyExecutionFailure = classifyExecutionFailure;
exports.evaluateGreenContract = evaluateGreenContract;
exports.createExecutionCheckpoint = createExecutionCheckpoint;
exports.rollbackExecutionCheckpoint = rollbackExecutionCheckpoint;
exports.inspectBranchFreshness = inspectBranchFreshness;
exports.mergeExecutionWorktree = mergeExecutionWorktree;
exports.cleanupExecutionWorktree = cleanupExecutionWorktree;
exports.runExecutionKernelSelfTest = runExecutionKernelSelfTest;
exports.runExecutionKernelCancellationSelfTest = runExecutionKernelCancellationSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../core/utils");
const KERNEL_DIR = path.join(utils_1.CCM_DIR, "execution-kernel");
const EXECUTIONS_DIR = path.join(KERNEL_DIR, "executions");
const CHECKPOINTS_DIR = path.join(KERNEL_DIR, "checkpoints");
const OUTPUTS_DIR = path.join(KERNEL_DIR, "outputs");
const CANCELLATIONS_DIR = path.join(KERNEL_DIR, "cancellations");
const AGENT_RUNNER_REQUESTS_DIR = path.join(utils_1.CCM_DIR, "agent-runner", "requests");
const activeProcesses = new Map();
const activeAgentRuns = new Map();
const MAX_EVENTS = 300;
function now() { return new Date().toISOString(); }
function ensureDirs() {
    for (const dir of [KERNEL_DIR, EXECUTIONS_DIR, CHECKPOINTS_DIR, OUTPUTS_DIR, CANCELLATIONS_DIR]) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function safePart(value, fallback = "execution") {
    return String(value || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100)
        .replace(/^-+|-+$/g, "")
        || fallback;
}
function hash(value, length = 16) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}
function executionFile(executionId) {
    ensureDirs();
    return path.join(EXECUTIONS_DIR, `${safePart(executionId)}.json`);
}
function checkpointFile(checkpointId) {
    ensureDirs();
    return path.join(CHECKPOINTS_DIR, `${safePart(checkpointId)}.json`);
}
function cancellationFile(taskId) {
    ensureDirs();
    return path.join(CANCELLATIONS_DIR, `${safePart(taskId)}.json`);
}
function readJson(file, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function runGit(workDir, args, env = {}) {
    const result = (0, child_process_1.spawnSync)("git", args, {
        cwd: workDir,
        encoding: "utf-8",
        windowsHide: true,
        env: { ...process.env, ...env },
    });
    if (result.status !== 0)
        throw new Error(String(result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
    return String(result.stdout || "").trim();
}
function normalizeList(value, limit = 100) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|,/) : [];
    return Array.from(new Set(source.map(item => String(item || "").trim()).filter(Boolean))).slice(0, limit);
}
function normalizeRelativePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}
function defaultEnvAllowlist() {
    return [
        "PATH", "Path", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "HOME", "USERPROFILE",
        "LOCALAPPDATA", "APPDATA", "PROGRAMDATA", "TERM", "COLORTERM", "LANG", "LC_ALL", "SHELL",
        "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "all_proxy", "no_proxy",
        "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "OPENAI_API_KEY", "OPENAI_BASE_URL", "CODEX_HOME",
        "CURSOR_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "CLAUDE_CONFIG_DIR", "CCM_CODEX_GATEWAY_CONFIG", "CCM_CODEX_API_KEY", "CCM_CODEX_LOCAL_ACCESS_TOKEN",
    ];
}
function sanitizeExecutionEnv(extra = {}, allowlist = []) {
    const allowed = new Set([...defaultEnvAllowlist(), ...allowlist.map(String)]);
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (allowed.has(key) && value !== undefined)
            env[key] = String(value);
    }
    for (const [key, value] of Object.entries(extra || {})) {
        if (allowed.has(key) && value !== undefined && value !== null)
            env[key] = String(value);
    }
    return env;
}
function isSafeVerificationCommand(command) {
    const text = String(command || "").trim();
    if (!text || text.length > 500)
        return false;
    const denied = /(?:^|[;&|]\s*)(?:rm\s+-rf|rmdir\s+\/s|del\s+\/s|format\b|shutdown\b|reboot\b|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|npm\s+publish|curl\b[^\n]*\|\s*(?:sh|bash)|Invoke-Expression|Start-Process\s+[^\n]*-Verb\s+RunAs)/i;
    return !denied.test(text);
}
function buildDevelopmentTaskPacket(task, options = {}) {
    const workDir = path.resolve(String(options.workDir || task?.work_dir || task?.workDir || process.cwd()));
    const isolationMode = String(options.isolationMode || task?.child_agent_isolation || task?.childAgentIsolation || "shared").toLowerCase() === "worktree" ? "worktree" : "shared";
    const verificationCommands = normalizeList(options.verificationCommands || task?.verification_commands || task?.verificationCommands || task?.test_commands || [], 12)
        .filter(isSafeVerificationCommand);
    const requiredVerification = task?.requires_verification !== false && task?.requiresVerification !== false;
    return {
        version: 1,
        taskId: String(task?.id || options.taskId || `task-${Date.now().toString(36)}`),
        objective: String(task?.business_goal || task?.businessGoal || task?.description || task?.title || "").trim(),
        project: String(options.project || task?.target_project || task?.targetProject || "").trim(),
        workDir,
        scope: {
            allowedPaths: normalizeList(options.allowedPaths || task?.allowed_paths || task?.allowedPaths || ["."], 100).map(normalizeRelativePath),
            deniedPaths: normalizeList(options.deniedPaths || task?.denied_paths || task?.deniedPaths || [".git", ".env", "node_modules"], 100).map(normalizeRelativePath),
            requiresChanges: task?.requires_code_changes !== false && task?.requiresCodeChanges !== false,
        },
        isolation: { mode: isolationMode, failClosed: isolationMode === "worktree" },
        branchPolicy: isolationMode === "worktree" ? "worktree" : (task?.branch_policy === "require_fresh" ? "require_fresh" : "current"),
        verification: {
            required: requiredVerification,
            commands: verificationCommands,
            requiredGreenLevel: String(task?.required_green_level || task?.requiredGreenLevel || (requiredVerification ? "project" : "none")),
        },
        commitPolicy: String(task?.commit_policy || task?.commitPolicy || (isolationMode === "worktree" ? "verified_commit" : "manual")),
        permissions: {
            filesystem: task?.read_only === true ? "read_only" : "workspace_write",
            network: task?.allow_network === false ? "deny" : "allow",
            envAllowlist: normalizeList(task?.env_allowlist || task?.envAllowlist || defaultEnvAllowlist(), 100),
        },
        budget: {
            timeoutMs: Math.max(10_000, Math.min(Number(task?.timeout_ms || task?.timeoutMs || options.timeoutMs || 300_000), 3_600_000)),
            maxOutputBytes: Math.max(64 * 1024, Math.min(Number(task?.max_output_bytes || task?.maxOutputBytes || 2 * 1024 * 1024), 20 * 1024 * 1024)),
            maxRecoveryAttempts: Math.max(0, Math.min(Number(task?.max_recovery_attempts || task?.maxRecoveryAttempts || 1), 3)),
        },
        escalationPolicy: String(task?.escalation_policy || task?.escalationPolicy || "ask_user"),
        acceptanceCriteria: String(task?.acceptance_criteria || task?.acceptanceCriteria || "").trim(),
        createdAt: now(),
    };
}
function validateDevelopmentTaskPacket(packet) {
    const errors = [];
    if (!packet.taskId)
        errors.push("taskId 不能为空");
    if (!packet.objective)
        errors.push("objective 不能为空");
    if (!packet.project)
        errors.push("project 不能为空");
    if (!packet.workDir || !fs.existsSync(packet.workDir))
        errors.push("workDir 不存在");
    if (packet.scope.allowedPaths.some(item => item.includes("..")))
        errors.push("allowedPaths 不能越过工作目录");
    if (packet.verification.commands.some(command => !isSafeVerificationCommand(command)))
        errors.push("验证命令包含危险操作");
    if (!["none", "targeted", "project", "workspace", "merge_ready"].includes(packet.verification.requiredGreenLevel))
        errors.push("requiredGreenLevel 无效");
    return { pass: errors.length === 0, errors };
}
function createEvent(record, name, message, extra = {}) {
    return {
        id: `event-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`,
        at: now(), taskId: record.taskId, executionId: record.id, name,
        state: extra.state || record.state,
        status: extra.status || "info",
        failureClass: extra.failureClass,
        message: String(message || "").slice(0, 1200),
        data: extra.data,
    };
}
function ensureExecution(input) {
    const executionId = safePart(input.executionId || input.task?.id || `execution-${Date.now().toString(36)}`);
    const file = executionFile(executionId);
    const existing = readJson(file, null);
    if (existing)
        return existing;
    const packet = input.packet || buildDevelopmentTaskPacket(input.task, { project: input.project, workDir: input.workDir });
    const validation = validateDevelopmentTaskPacket(packet);
    if (!validation.pass)
        throw new Error(`任务包校验失败：${validation.errors.join("；")}`);
    const createdAt = now();
    const record = {
        version: 1, id: executionId, taskId: packet.taskId, project: input.project, agent: input.agent || input.project,
        state: "queued", packet, processIds: [], externalRunnerRequestIds: [], workspace: {}, checkpointIds: [],
        green: { level: "none", checks: [], evaluatedAt: "" }, failure: null, cancellation: null,
        createdAt, updatedAt: createdAt, startedAt: "", finishedAt: "", events: [],
    };
    record.events.push(createEvent(record, "execution.queued", "开发执行已进入队列"));
    writeJsonAtomic(file, record);
    return record;
}
function loadExecution(executionId) {
    return readJson(executionFile(executionId), null);
}
function listExecutions(filters = {}) {
    ensureDirs();
    const records = fs.readdirSync(EXECUTIONS_DIR).filter(name => name.endsWith(".json"))
        .map(name => readJson(path.join(EXECUTIONS_DIR, name), null)).filter(Boolean);
    return records.filter(record => !filters.taskId || record.taskId === filters.taskId)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
function purgeTaskExecutionArtifacts(taskId) {
    const id = String(taskId || "").trim();
    if (!id)
        throw new Error("缺少任务 ID");
    const records = listExecutions({ taskId: id });
    let checkpoints = 0;
    let outputs = 0;
    for (const record of records) {
        for (const checkpointId of record.checkpointIds || []) {
            try {
                fs.unlinkSync(checkpointFile(checkpointId));
                checkpoints++;
            }
            catch { }
        }
        try {
            fs.unlinkSync(executionFile(record.id));
        }
        catch { }
    }
    const outputPrefix = `${safePart(id)}-`;
    try {
        for (const name of fs.readdirSync(OUTPUTS_DIR)) {
            if (!name.startsWith(outputPrefix))
                continue;
            try {
                fs.unlinkSync(path.join(OUTPUTS_DIR, name));
                outputs++;
            }
            catch { }
        }
    }
    catch { }
    clearTaskCancellation(id);
    activeProcesses.delete(id);
    return { executions: records.length, checkpoints, outputs };
}
function transitionExecution(executionId, state, message = "", extra = {}) {
    const record = loadExecution(executionId);
    if (!record)
        return null;
    const at = now();
    record.state = state;
    record.updatedAt = at;
    if (!record.startedAt && ["spawning", "ready", "prompt_accepted", "running"].includes(state))
        record.startedAt = at;
    if (["succeeded", "failed", "cancelled"].includes(state))
        record.finishedAt = at;
    if (extra.failure)
        record.failure = extra.failure;
    if (extra.green)
        record.green = extra.green;
    if (Object.prototype.hasOwnProperty.call(extra, "receipt"))
        record.receipt = extra.receipt;
    if (Object.prototype.hasOwnProperty.call(extra, "fileChanges"))
        record.fileChanges = extra.fileChanges;
    if (Object.prototype.hasOwnProperty.call(extra, "runnerVerification"))
        record.runnerVerification = extra.runnerVerification;
    if (Object.prototype.hasOwnProperty.call(extra, "outputPreview"))
        record.outputPreview = String(extra.outputPreview || "").slice(0, 12_000);
    if (extra.cancellation)
        record.cancellation = extra.cancellation;
    record.events = [...(record.events || []), createEvent(record, extra.name || `execution.${state}`, message || state, {
            state, status: extra.status || (state === "failed" ? "error" : state === "succeeded" ? "ok" : state === "cancelled" ? "warning" : "info"),
            failureClass: extra.failureClass, data: extra.data,
        })].slice(-MAX_EVENTS);
    writeJsonAtomic(executionFile(executionId), record);
    return record;
}
function attachExecutionWorkspace(executionId, workspace) {
    const record = loadExecution(executionId);
    if (!record)
        return null;
    record.workspace = { ...(record.workspace || {}), ...(workspace || {}), updatedAt: now() };
    record.updatedAt = now();
    record.events = [...record.events, createEvent(record, "workspace.prepared", workspace?.mode === "worktree" ? "独立 worktree 已准备" : "共享工作目录已准备", { data: record.workspace })].slice(-MAX_EVENTS);
    writeJsonAtomic(executionFile(executionId), record);
    return record;
}
function registerExternalRunnerRequest(executionId, requestId) {
    const record = loadExecution(executionId);
    if (!record)
        return;
    record.externalRunnerRequestIds = Array.from(new Set([...(record.externalRunnerRequestIds || []), requestId]));
    record.updatedAt = now();
    writeJsonAtomic(executionFile(executionId), record);
}
function registerProcess(taskId, child) {
    const group = activeProcesses.get(taskId) || new Set();
    group.add(child);
    activeProcesses.set(taskId, group);
}
function unregisterProcess(taskId, child) {
    const group = activeProcesses.get(taskId);
    if (!group)
        return;
    group.delete(child);
    if (!group.size)
        activeProcesses.delete(taskId);
}
function publicActiveAgentRun(run) {
    return {
        id: run.id,
        taskId: run.taskId,
        executionId: run.executionId,
        project: run.project,
        agentType: run.agentType,
        source: run.source,
        pid: run.pid || null,
        cwd: run.cwd || "",
        status: run.status,
        startedAt: run.startedAt,
        updatedAt: run.updatedAt,
        timeoutMs: run.timeoutMs || 0,
        ageMs: Date.now() - Date.parse(run.startedAt || new Date().toISOString()),
        commandLabel: run.commandLabel || "",
        title: run.title || "",
        cancellable: true,
    };
}
function registerActiveAgentRun(taskId, executionId, child, meta = {}) {
    const runId = String(meta.runId || `run-${safePart(taskId || executionId || "standalone")}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`);
    const at = now();
    const run = {
        id: runId,
        taskId: String(taskId || ""),
        executionId: String(executionId || ""),
        project: String(meta.project || ""),
        agentType: String(meta.agentType || ""),
        source: String(meta.source || "agent-cli"),
        pid: child.pid || null,
        cwd: String(meta.cwd || ""),
        status: "running",
        startedAt: at,
        updatedAt: at,
        timeoutMs: Number(meta.timeoutMs || 0),
        commandLabel: String(meta.commandLabel || ""),
        title: String(meta.title || ""),
        child,
    };
    activeAgentRuns.set(runId, run);
    return runId;
}
function finishActiveAgentRun(runId, status = "finished") {
    const run = activeAgentRuns.get(runId);
    if (!run)
        return;
    run.status = status;
    run.updatedAt = now();
    activeAgentRuns.delete(runId);
}
function listActiveAgentRuns(filters = {}) {
    const taskId = String(filters.taskId || filters.task_id || "").trim();
    const project = String(filters.project || "").trim();
    return Array.from(activeAgentRuns.values())
        .map(publicActiveAgentRun)
        .filter(run => !taskId || run.taskId === taskId)
        .filter(run => !project || run.project === project)
        .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}
function cancelActiveAgentRun(input = {}) {
    const runId = String(input.runId || input.run_id || "").trim();
    const taskId = String(input.taskId || input.task_id || "").trim();
    const executionId = String(input.executionId || input.execution_id || "").trim();
    const project = String(input.project || input.agent || input.target_project || "").trim();
    const reason = String(input.reason || "用户停止 Agent 运行").trim();
    const cancelTask = input.cancelTask !== false && input.cancel_task !== false;
    if (!runId && !taskId && !executionId && !project)
        throw new Error("缺少 runId、taskId、executionId 或 project");
    const matched = Array.from(activeAgentRuns.values()).filter(run => {
        if (runId)
            return run.id === runId;
        if (taskId && run.taskId !== taskId)
            return false;
        if (executionId && run.executionId !== executionId)
            return false;
        if (project && run.project !== project)
            return false;
        return true;
    });
    let killed = 0;
    for (const run of matched) {
        try {
            if (run.child && killProcessTree(run.child))
                killed++;
            run.status = "cancel_requested";
            run.updatedAt = now();
            if (run.executionId) {
                transitionExecution(run.executionId, "cancel_requested", reason, {
                    cancellation: { reason, actor: String(input.actor || "local-user"), requestedAt: now(), targeted: !cancelTask },
                    status: "warning",
                });
            }
        }
        catch { }
    }
    const cancellation = cancelTask && (taskId || matched[0]?.taskId)
        ? requestTaskCancellation(taskId || matched[0]?.taskId, reason, String(input.actor || "local-user"))
        : null;
    return { success: true, matched: matched.length, killed, cancellation, targeted: !cancelTask, runs: matched.map(publicActiveAgentRun) };
}
function trackManagedChildProcess(taskId, executionId, child, meta = {}) {
    const safeTaskId = String(taskId || executionId || "standalone");
    const runId = registerActiveAgentRun(safeTaskId, executionId, child, meta);
    registerProcess(safeTaskId, child);
    if (executionId) {
        const record = loadExecution(executionId);
        if (record && child.pid) {
            record.processIds = Array.from(new Set([...(record.processIds || []), child.pid]));
            writeJsonAtomic(executionFile(executionId), record);
        }
        transitionExecution(executionId, "ready", `Agent 进程已启动${child.pid ? `（PID ${child.pid}）` : ""}`);
        transitionExecution(executionId, "prompt_accepted", "任务提示已交给 Agent");
        transitionExecution(executionId, "running", "Agent 正在执行开发任务");
    }
    let stopped = false;
    const cancellationPoll = setInterval(() => {
        if (!isTaskCancellationRequested(safeTaskId))
            return;
        killProcessTree(child);
    }, 250);
    return () => {
        if (stopped)
            return;
        stopped = true;
        clearInterval(cancellationPoll);
        unregisterProcess(safeTaskId, child);
        finishActiveAgentRun(runId, isTaskCancellationRequested(safeTaskId) ? "cancelled" : "finished");
    };
}
function killProcessTree(child) {
    if (!child.pid)
        return false;
    try {
        if (process.platform === "win32") {
            (0, child_process_1.spawnSync)("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        }
        else {
            try {
                process.kill(-child.pid, "SIGTERM");
            }
            catch {
                child.kill("SIGTERM");
            }
        }
        return true;
    }
    catch {
        return false;
    }
}
function terminateManagedChildProcess(child) {
    return killProcessTree(child);
}
function clearTaskCancellation(taskId) {
    try {
        fs.unlinkSync(cancellationFile(taskId));
    }
    catch { }
}
function isTaskCancellationRequested(taskId) {
    return !!taskId && fs.existsSync(cancellationFile(taskId));
}
function requestTaskCancellation(taskId, reason = "用户取消任务", actor = "local-user") {
    if (!taskId)
        throw new Error("缺少任务 ID");
    const requestedAt = now();
    writeJsonAtomic(cancellationFile(taskId), { taskId, reason, actor, requestedAt });
    let killed = 0;
    for (const child of activeProcesses.get(taskId) || [])
        if (killProcessTree(child))
            killed++;
    let runnerRequests = 0;
    try {
        for (const name of fs.readdirSync(AGENT_RUNNER_REQUESTS_DIR).filter(name => name.endsWith(".json"))) {
            const file = path.join(AGENT_RUNNER_REQUESTS_DIR, name);
            const request = readJson(file, null);
            if (!request || String(request.taskId || request.executionId || "") !== taskId || ["done", "failed", "cancelled"].includes(request.status))
                continue;
            writeJsonAtomic(file, { ...request, status: "cancel_requested", cancel_reason: reason, cancel_requested_at: requestedAt });
            runnerRequests++;
        }
    }
    catch { }
    const executions = listExecutions({ taskId });
    const hasLiveCancellationTarget = killed > 0 || runnerRequests > 0;
    for (const execution of executions) {
        if (["succeeded", "failed", "cancelled"].includes(execution.state))
            continue;
        transitionExecution(execution.id, hasLiveCancellationTarget ? "cancel_requested" : "cancelled", reason, { cancellation: { reason, actor, requestedAt }, status: "warning" });
    }
    return { success: true, taskId, killedProcesses: killed, externalRunnerRequests: runnerRequests, executions: executions.map(item => item.id) };
}
async function runManagedCommand(input) {
    const taskId = String(input.taskId || input.executionId || "standalone");
    const executionId = String(input.executionId || input.taskId || "");
    if (isTaskCancellationRequested(taskId))
        throw Object.assign(new Error("任务已取消"), { code: "CCM_CANCELLED" });
    if (executionId)
        transitionExecution(executionId, "spawning", "正在启动项目 Agent");
    const child = (0, child_process_1.spawn)(input.command, [], {
        shell: true,
        cwd: input.cwd,
        env: input.env || sanitizeExecutionEnv(),
        windowsHide: true,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
    });
    const runId = registerActiveAgentRun(taskId, executionId, child, {
        project: input.project,
        agentType: input.agentType,
        source: input.source || "managed-command",
        cwd: input.cwd,
        timeoutMs: input.timeoutMs,
        commandLabel: input.commandLabel,
        title: input.title,
    });
    registerProcess(taskId, child);
    if (executionId) {
        const record = loadExecution(executionId);
        if (record && child.pid) {
            record.processIds = Array.from(new Set([...(record.processIds || []), child.pid]));
            writeJsonAtomic(executionFile(executionId), record);
        }
        transitionExecution(executionId, "ready", `Agent 进程已启动${child.pid ? `（PID ${child.pid}）` : ""}`);
        transitionExecution(executionId, "prompt_accepted", "任务提示已交给 Agent");
        transitionExecution(executionId, "running", "Agent 正在执行开发任务");
    }
    const maxOutputBytes = Math.max(64 * 1024, Number(input.maxOutputBytes || 2 * 1024 * 1024));
    const hardMemoryLimit = Math.max(maxOutputBytes, Math.min(maxOutputBytes * 4, 20 * 1024 * 1024));
    let stdout = "";
    let stderr = "";
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let outputFile = "";
    let outputStream = null;
    const persistChunk = (stream, chunk) => {
        if (!outputFile) {
            ensureDirs();
            outputFile = path.join(OUTPUTS_DIR, `${safePart(taskId)}-${Date.now()}.log`);
            outputStream = fs.createWriteStream(outputFile, { flags: "a" });
            if (stdout)
                outputStream.write(`[stdout]\n${stdout}\n`);
            if (stderr)
                outputStream.write(`[stderr]\n${stderr}\n`);
        }
        outputStream?.write(`[${stream}]\n`);
        outputStream?.write(chunk);
    };
    child.stdout?.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        stdoutBytes += chunk.length;
        if (stdoutBytes + stderrBytes > maxOutputBytes)
            persistChunk("stdout", chunk);
        if (Buffer.byteLength(stdout) < hardMemoryLimit)
            stdout += text;
        else
            stdout = (stdout + text).slice(-512 * 1024);
        input.onStdout?.(text);
    });
    child.stderr?.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        stderrBytes += chunk.length;
        if (stdoutBytes + stderrBytes > maxOutputBytes)
            persistChunk("stderr", chunk);
        if (Buffer.byteLength(stderr) < hardMemoryLimit)
            stderr += text;
        else
            stderr = (stderr + text).slice(-256 * 1024);
        input.onStderr?.(text);
    });
    return await new Promise((resolve, reject) => {
        let settled = false;
        let cancelled = false;
        const finish = (error, code, signal) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            clearInterval(cancelPoll);
            unregisterProcess(taskId, child);
            finishActiveAgentRun(runId, cancelled ? "cancelled" : (error ? "failed" : "finished"));
            outputStream?.end();
            const result = { stdout, stderr, exitCode: code, signal, outputFile, totalOutputBytes: stdoutBytes + stderrBytes, cancelled };
            if (error)
                reject(Object.assign(error, result));
            else
                resolve(result);
        };
        const timeout = setTimeout(() => {
            killProcessTree(child);
            finish(Object.assign(new Error("Agent 响应超时"), { code: "CCM_TIMEOUT" }), null, "SIGTERM");
        }, Math.max(10_000, Number(input.timeoutMs || 300_000)));
        const cancelPoll = setInterval(() => {
            if (!isTaskCancellationRequested(taskId))
                return;
            cancelled = true;
            killProcessTree(child);
            finish(Object.assign(new Error("任务已取消"), { code: "CCM_CANCELLED" }), null, "SIGTERM");
        }, 250);
        child.on("error", error => finish(error, null, null));
        child.on("close", (code, signal) => {
            if (settled)
                return;
            if (isTaskCancellationRequested(taskId)) {
                cancelled = true;
                return finish(Object.assign(new Error("任务已取消"), { code: "CCM_CANCELLED" }), code, signal);
            }
            if (code !== 0)
                return finish(Object.assign(new Error(stderr.trim() || stdout.trim() || `Agent 进程退出，exitCode=${code}`), { code: "CCM_PROCESS_FAILED" }), code, signal);
            finish(null, code, signal);
        });
    });
}
function persistBoundedOutput(taskId, content, maxBytes = 256 * 1024) {
    const text = String(content || "");
    if (Buffer.byteLength(text, "utf-8") <= maxBytes)
        return { content: text, persisted: false, path: "", bytes: Buffer.byteLength(text) };
    ensureDirs();
    const file = path.join(OUTPUTS_DIR, `${safePart(taskId)}-${Date.now()}-${hash(text, 8)}.txt`);
    fs.writeFileSync(file, text, "utf-8");
    const preview = text.slice(0, 12_000);
    const tail = text.slice(-24_000);
    return {
        content: `${preview}\n\n[中间大输出已持久化，避免占满 Agent 上下文]\n\n${tail}\n\n<persisted-output path="${file}" bytes="${Buffer.byteLength(text)}" />`,
        persisted: true, path: file, bytes: Buffer.byteLength(text),
    };
}
function classifyExecutionFailure(value) {
    const message = String(value?.message || value?.error || value || "未知错误");
    const rules = [
        [/CCM_CANCELLED|任务已取消|cancelled/i, "cancelled", false, []],
        [/CCM_TIMEOUT|响应超时|timed?\s*out|ETIMEDOUT/i, "timeout", true, ["终止残留进程", "缩小任务范围后重试一次"]],
        [/trust|required.*trust|信任目录/i, "trust_gate", true, ["确认工作目录在允许列表", "重新启动 Agent"]],
        [/prompt.*misdeliver|提示.*投递|shell.*prompt/i, "prompt_delivery", true, ["等待 ready 握手后重新投递"]],
        [/permission|denied|not allowed|EPERM|EACCES|权限|拒绝/i, "permission", false, ["检查任务包权限和允许路径"]],
        [/branch.*(?:stale|behind|diverg)|分支.*(?:落后|分叉)|merge conflict/i, "branch_divergence", true, ["同步基线分支", "重新执行验证"]],
        [/mcp.*handshake|initialize.*mcp/i, "mcp_handshake", true, ["重启 MCP 服务", "重新执行 initialize 握手"]],
        [/mcp.*(?:spawn|start|connect)|MCP.*连接失败/i, "mcp_startup", true, ["校验 MCP 配置", "重启失败服务"]],
        [/plugin.*(?:spawn|start|load)|插件.*失败/i, "plugin_startup", true, ["禁用失败插件后降级运行"]],
        [/(?:test|pytest|jest|vitest|cargo test|mvn test).*(?:timeout|hung)|测试.*(?:超时|卡死)/i, "test_timeout", true, ["终止挂起测试", "按测试文件拆分重跑"]],
        [/(?:test|pytest|jest|vitest|cargo test|mvn test).*(?:failed|failure)|测试.*失败/i, "test", false, ["读取失败用例", "修复后只重跑相关测试"]],
        [/(?:compile|typescript|tsc|build).*(?:failed|error)|编译.*(?:失败|错误)/i, "compile", false, ["读取首个编译错误", "修复后重新构建"]],
        [/rate limit|429|model.*unavailable|provider|API.*(?:失败|不可用)/i, "provider", true, ["等待退避窗口", "切换已配置的备用 Runtime"]],
        [/gateway|ECONNREFUSED|ENOTFOUND|network|网络|网关/i, "gateway_routing", true, ["检查网关和代理", "运行执行通道探针"]],
        [/(?:command not found|not recognized as an internal|ENOENT|找不到.*(?:命令|程序)|未找到.*CLI|executable.*not found)/i, "infra", true, ["检查 CLI 安装与 PATH", "切换已安装的备用 Runtime"]],
        [/tool.*(?:failed|error)|工具.*失败/i, "tool_runtime", true, ["检查工具输入", "重连工具服务"]],
    ];
    for (const [pattern, failureClass, recoverable, recovery] of rules)
        if (pattern.test(message))
            return { failureClass, recoverable, recovery, message: message.slice(0, 1200) };
    return { failureClass: "unknown", recoverable: false, recovery: ["保留现场并请求人工检查"], message: message.slice(0, 1200) };
}
function greenRank(level) {
    return { none: 0, targeted: 1, project: 2, workspace: 3, merge_ready: 4 }[level];
}
function evaluateGreenContract(input) {
    const checks = [];
    const receipt = input.receipt || {};
    const fileChanges = input.fileChanges?.files || input.fileChanges || [];
    const verification = Array.isArray(receipt.verification) ? receipt.verification : [];
    const runner = input.runnerVerification || receipt.runnerVerification || {};
    const runnerPassed = runner.status === "passed" || (Array.isArray(runner.results) && runner.results.length > 0 && runner.results.every((item) => item.status === "passed"));
    const runnerFailed = runner.status === "failed" || (Array.isArray(runner.failed) && runner.failed.length > 0);
    const hasExecutedVerification = runnerPassed || verification.some((item) => /passed|通过|exit\s*0|成功/i.test(String(item)) && !/建议|should|未运行/i.test(String(item)));
    const hasChanges = Array.isArray(fileChanges) && fileChanges.length > 0;
    const receiptDone = ["done", "complete", "completed", "success"].includes(String(receipt.status || input.status || "").toLowerCase());
    checks.push({ id: "receipt", pass: receiptDone, detail: receiptDone ? "结构化回执完成" : "缺少完成回执" });
    checks.push({ id: "changes", pass: input.requiresChanges === false || hasChanges, detail: hasChanges ? `${fileChanges.length} 个文件变更` : "未捕获文件变更" });
    checks.push({ id: "targeted_verification", pass: input.requiresVerification === false || hasExecutedVerification, detail: hasExecutedVerification ? "存在已执行验证" : "缺少已执行验证" });
    checks.push({ id: "project_verification", pass: input.requiresVerification === false || (hasExecutedVerification && !runnerFailed), detail: runnerFailed ? "项目验证失败" : "项目验证无失败" });
    const workspacePassed = !!input.workspacePassed || (runnerPassed && (runner.results || []).some((item) => /workspace|npm run build|npm test|mvn test|cargo test|go test|pytest/i.test(String(item.command || ""))));
    checks.push({ id: "workspace_verification", pass: workspacePassed, detail: workspacePassed ? "工作区验证通过" : "尚未完成工作区级验证" });
    const branchFresh = input.branchFresh !== false;
    const reviewPassed = input.reviewPassed === true || input.hasFinalReview === true;
    checks.push({ id: "branch_fresh", pass: branchFresh, detail: branchFresh ? "分支基线可用" : "分支落后或分叉" });
    checks.push({ id: "review", pass: reviewPassed, detail: reviewPassed ? "主 Agent 已复盘" : "尚未完成主 Agent 复盘" });
    let level = "none";
    if (receiptDone && (input.requiresVerification === false || hasExecutedVerification))
        level = "targeted";
    if (level === "targeted" && (input.requiresVerification === false || !runnerFailed))
        level = "project";
    if (level === "project" && workspacePassed)
        level = "workspace";
    if (level === "workspace" && branchFresh && reviewPassed && (input.requiresChanges === false || hasChanges))
        level = "merge_ready";
    const requiredLevel = String(input.requiredLevel || "project");
    return { level, requiredLevel, pass: greenRank(level) >= greenRank(requiredLevel), checks, evaluatedAt: now() };
}
function createExecutionCheckpoint(input) {
    const workDir = path.resolve(input.workDir);
    const repoRoot = runGit(workDir, ["rev-parse", "--show-toplevel"]);
    const originalHead = runGit(repoRoot, ["rev-parse", "HEAD"]);
    const originalBranch = runGit(repoRoot, ["branch", "--show-current"]);
    const indexTree = runGit(repoRoot, ["write-tree"]);
    const tempIndex = path.join(CHECKPOINTS_DIR, `${safePart(input.executionId)}-${Date.now()}.index`);
    const env = { GIT_INDEX_FILE: tempIndex };
    runGit(repoRoot, ["read-tree", "HEAD"], env);
    runGit(repoRoot, ["add", "-A"], env);
    const workingTree = runGit(repoRoot, ["write-tree"], env);
    const commitResult = (0, child_process_1.spawnSync)("git", ["commit-tree", workingTree, "-p", originalHead, "-m", `CCM checkpoint ${input.taskId}`], {
        cwd: repoRoot, encoding: "utf-8", windowsHide: true, env: { ...process.env, ...env },
    });
    try {
        fs.unlinkSync(tempIndex);
    }
    catch { }
    if (commitResult.status !== 0)
        throw new Error(String(commitResult.stderr || "无法创建 Git 检查点").trim());
    const checkpointCommit = String(commitResult.stdout || "").trim();
    const checkpointId = `checkpoint-${safePart(input.taskId)}-${Date.now().toString(36)}-${hash(checkpointCommit, 8)}`;
    const checkpoint = {
        version: 1, id: checkpointId, executionId: input.executionId, taskId: input.taskId,
        label: input.label || "任务开始前", workDir, repoRoot, mode: input.mode || "shared",
        originalHead, originalBranch, indexTree, checkpointCommit, createdAt: now(), rolledBackAt: "", rollbackReason: "",
    };
    writeJsonAtomic(checkpointFile(checkpointId), checkpoint);
    const record = loadExecution(input.executionId);
    if (record) {
        record.checkpointIds = Array.from(new Set([...(record.checkpointIds || []), checkpointId]));
        record.events = [...record.events, createEvent(record, "checkpoint.created", "已创建任务前文件检查点", { status: "ok", data: { checkpointId, checkpointCommit } })].slice(-MAX_EVENTS);
        record.updatedAt = now();
        writeJsonAtomic(executionFile(record.id), record);
    }
    return checkpoint;
}
function rollbackExecutionCheckpoint(checkpointId, reason, options = {}) {
    if (!String(reason || "").trim())
        throw new Error("回滚必须填写原因");
    const checkpoint = readJson(checkpointFile(checkpointId), null);
    if (!checkpoint)
        throw new Error("检查点不存在");
    if (checkpoint.mode !== "worktree" && options.allowShared !== true)
        throw new Error("共享工作目录默认禁止自动回滚；请显式确认 allowShared=true");
    const repoRoot = checkpoint.repoRoot;
    const currentHead = runGit(repoRoot, ["rev-parse", "HEAD"]);
    if (currentHead !== checkpoint.originalHead)
        runGit(repoRoot, ["reset", "--soft", checkpoint.originalHead]);
    runGit(repoRoot, ["read-tree", checkpoint.indexTree]);
    runGit(repoRoot, ["restore", `--source=${checkpoint.checkpointCommit}`, "--worktree", "--", "."]);
    const untracked = runGit(repoRoot, ["ls-files", "--others", "--exclude-standard", "-z"]);
    for (const relative of untracked.split("\0").filter(Boolean)) {
        const existsInCheckpoint = (0, child_process_1.spawnSync)("git", ["cat-file", "-e", `${checkpoint.checkpointCommit}:${relative.replace(/\\/g, "/")}`], { cwd: repoRoot, windowsHide: true, stdio: "ignore" }).status === 0;
        if (!existsInCheckpoint) {
            const target = path.resolve(repoRoot, relative);
            if (target.startsWith(path.resolve(repoRoot) + path.sep) && fs.existsSync(target) && fs.statSync(target).isFile())
                fs.unlinkSync(target);
        }
    }
    checkpoint.rolledBackAt = now();
    checkpoint.rollbackReason = reason;
    writeJsonAtomic(checkpointFile(checkpointId), checkpoint);
    transitionExecution(checkpoint.executionId, "cancelled", `已回滚到检查点：${reason}`, { name: "checkpoint.rolled_back", status: "warning", data: { checkpointId } });
    return { success: true, checkpointId, executionId: checkpoint.executionId, restoredHead: checkpoint.originalHead, rolledBackAt: checkpoint.rolledBackAt };
}
function inspectBranchFreshness(workDir, baseRef = "") {
    const repoRoot = runGit(workDir, ["rev-parse", "--show-toplevel"]);
    const branch = runGit(repoRoot, ["branch", "--show-current"]);
    const base = baseRef || runGit(repoRoot, ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"]).replace(/^origin\//, "");
    const baseFull = base.startsWith("origin/") ? base : ((0, child_process_1.spawnSync)("git", ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${base}`], { cwd: repoRoot }).status === 0 ? `origin/${base}` : base);
    const counts = runGit(repoRoot, ["rev-list", "--left-right", "--count", `${baseFull}...HEAD`]).split(/\s+/).map(Number);
    const behind = counts[0] || 0;
    const ahead = counts[1] || 0;
    return { repoRoot, branch, baseRef: baseFull, behind, ahead, fresh: behind === 0, diverged: behind > 0 && ahead > 0, checkedAt: now() };
}
function mergeExecutionWorktree(executionId, options = {}) {
    const record = loadExecution(executionId);
    if (!record)
        throw new Error("执行记录不存在");
    if (record.workspace?.mergedAt && record.workspace?.mergeCommit) {
        return { success: true, duplicate: true, executionId, branch: record.workspace.worktreeBranch || "", mergeCommit: record.workspace.mergeCommit, mergedAt: record.workspace.mergedAt };
    }
    if (record.workspace?.mode !== "worktree" || !record.workspace?.worktreeBranch || !record.workspace?.originalWorkDir)
        throw new Error("该执行没有可合并的 worktree");
    if (record.workspace?.conflictGroup && record.workspace?.mergeOwner === false) {
        const owner = listExecutions({ taskId: record.taskId }).find(item => item.workspace?.conflictGroup === record.workspace.conflictGroup && item.workspace?.mergeOwner !== false);
        throw new Error(`共享冲突 worktree 只能由合并负责人执行合并${owner ? `：${owner.project}（${owner.id}）` : ""}`);
    }
    if (record.green?.level !== "merge_ready" && options.force !== true)
        throw new Error("只有 merge_ready 的执行才能合并");
    const original = record.workspace.originalWorkDir;
    const freshness = inspectBranchFreshness(record.workspace.worktreePath, record.workspace.baseBranch || "");
    if (!freshness.fresh && options.force !== true)
        throw new Error(`worktree 分支落后基线 ${freshness.behind} 个提交，请先同步后再合并`);
    const status = runGit(record.workspace.worktreePath, ["status", "--porcelain"]);
    if (status.trim()) {
        if (record.packet.commitPolicy !== "verified_commit" && options.commit !== true)
            throw new Error("worktree 仍有未提交变更");
        runGit(record.workspace.worktreePath, ["add", "-A"]);
        runGit(record.workspace.worktreePath, ["commit", "-m", options.message || `feat: complete ${record.taskId}`]);
    }
    const currentBranch = runGit(original, ["branch", "--show-current"]);
    if (record.workspace.baseBranch && currentBranch !== record.workspace.baseBranch && options.force !== true)
        throw new Error(`主工作目录当前分支 ${currentBranch} 与任务基线 ${record.workspace.baseBranch} 不一致`);
    try {
        runGit(original, ["merge", "--no-ff", record.workspace.worktreeBranch, "-m", options.mergeMessage || `merge: ${record.taskId}`]);
    }
    catch (error) {
        try {
            runGit(original, ["merge", "--abort"]);
        }
        catch { }
        throw error;
    }
    record.workspace.mergedAt = now();
    record.workspace.mergeCommit = runGit(original, ["rev-parse", "HEAD"]);
    record.events = [...record.events, createEvent(record, "lane.merged", "worktree 已安全合并到主工作目录", { status: "ok", data: { mergeCommit: record.workspace.mergeCommit } })].slice(-MAX_EVENTS);
    record.updatedAt = now();
    writeJsonAtomic(executionFile(record.id), record);
    if (record.workspace?.conflictGroup) {
        for (const sibling of listExecutions({ taskId: record.taskId })) {
            if (sibling.id === record.id || sibling.workspace?.conflictGroup !== record.workspace.conflictGroup)
                continue;
            sibling.workspace = { ...(sibling.workspace || {}), mergedAt: record.workspace.mergedAt, mergeCommit: record.workspace.mergeCommit, mergedByExecutionId: record.id };
            sibling.events = [...(sibling.events || []), createEvent(sibling, "lane.merged", `共享冲突 worktree 已由 ${record.project} 合并`, { status: "ok", data: { mergeCommit: record.workspace.mergeCommit, ownerExecutionId: record.id } })].slice(-MAX_EVENTS);
            sibling.updatedAt = now();
            writeJsonAtomic(executionFile(sibling.id), sibling);
        }
    }
    return { success: true, executionId, branch: record.workspace.worktreeBranch, mergeCommit: record.workspace.mergeCommit };
}
function cleanupExecutionWorktree(executionId, force = false) {
    const record = loadExecution(executionId);
    if (!record)
        throw new Error("执行记录不存在");
    if (record.workspace?.mode !== "worktree" || !record.workspace?.worktreePath || !record.workspace?.originalWorkDir)
        throw new Error("该执行没有 worktree");
    if (!record.workspace.mergedAt && !force)
        throw new Error("未合并的 worktree 默认不能清理");
    runGit(record.workspace.originalWorkDir, ["worktree", "remove", ...(force ? ["--force"] : []), record.workspace.worktreePath]);
    if (record.workspace.worktreeBranch) {
        try {
            runGit(record.workspace.originalWorkDir, ["branch", "-d", record.workspace.worktreeBranch]);
        }
        catch {
            if (force)
                runGit(record.workspace.originalWorkDir, ["branch", "-D", record.workspace.worktreeBranch]);
        }
    }
    record.workspace.cleanedAt = now();
    record.events = [...record.events, createEvent(record, "workspace.cleaned", "任务 worktree 已清理", { status: "ok" })].slice(-MAX_EVENTS);
    record.updatedAt = now();
    writeJsonAtomic(executionFile(record.id), record);
    if (record.workspace?.conflictGroup) {
        for (const sibling of listExecutions({ taskId: record.taskId })) {
            if (sibling.id === record.id || sibling.workspace?.conflictGroup !== record.workspace.conflictGroup)
                continue;
            sibling.workspace = { ...(sibling.workspace || {}), cleanedAt: record.workspace.cleanedAt, cleanedByExecutionId: record.id };
            sibling.updatedAt = now();
            writeJsonAtomic(executionFile(sibling.id), sibling);
        }
    }
    return { success: true, executionId, cleanedAt: record.workspace.cleanedAt };
}
function runExecutionKernelSelfTest() {
    const tempRoot = path.join(KERNEL_DIR, `self-test-${process.pid}-${Date.now()}`);
    let selfTestExecutionId = "";
    let selfTestCheckpointId = "";
    fs.mkdirSync(tempRoot, { recursive: true });
    try {
        runGit(tempRoot, ["init"]);
        runGit(tempRoot, ["config", "user.email", "ccm-self-test@example.invalid"]);
        runGit(tempRoot, ["config", "user.name", "CCM Self Test"]);
        fs.writeFileSync(path.join(tempRoot, "tracked.txt"), "before\n", "utf-8");
        runGit(tempRoot, ["add", "tracked.txt"]);
        runGit(tempRoot, ["commit", "-m", "initial"]);
        const task = { id: `kernel-self-test-${process.pid}`, title: "execution kernel self test", target_project: "self-test", requires_verification: true, child_agent_isolation: "worktree" };
        const packet = buildDevelopmentTaskPacket(task, { project: "self-test", workDir: tempRoot, verificationCommands: ["npm test", "git reset --hard"] });
        const validation = validateDevelopmentTaskPacket(packet);
        const execution = ensureExecution({ task, project: "self-test", workDir: tempRoot, executionId: task.id, packet });
        selfTestExecutionId = execution.id;
        attachExecutionWorkspace(execution.id, { mode: "worktree", originalWorkDir: tempRoot, worktreePath: tempRoot, worktreeBranch: "self-test", baseBranch: runGit(tempRoot, ["branch", "--show-current"]) });
        const checkpoint = createExecutionCheckpoint({ executionId: execution.id, taskId: task.id, workDir: tempRoot, mode: "worktree" });
        selfTestCheckpointId = checkpoint.id;
        fs.writeFileSync(path.join(tempRoot, "tracked.txt"), "after\n", "utf-8");
        fs.writeFileSync(path.join(tempRoot, "created.txt"), "new\n", "utf-8");
        const rollback = rollbackExecutionCheckpoint(checkpoint.id, "self test");
        const green = evaluateGreenContract({ receipt: { status: "done", verification: ["npm test passed"] }, fileChanges: [{ path: "tracked.txt" }], requiresChanges: true, requiresVerification: true, runnerVerification: { status: "passed", results: [{ command: "npm test", status: "passed" }] }, workspacePassed: true, branchFresh: true, reviewPassed: true, requiredLevel: "merge_ready" });
        const persistedReceipt = { agent: "self-test", status: "done", verification: ["npm test passed by external runner (exit 0)"] };
        const persistedFileChanges = { files: [{ path: "tracked.txt" }] };
        const persistedRunner = { status: "passed", verification: persistedReceipt.verification, failed: [] };
        transitionExecution(execution.id, "reviewing", "self-test evidence", {
            green,
            receipt: persistedReceipt,
            fileChanges: persistedFileChanges,
            runnerVerification: persistedRunner,
            outputPreview: "CCM_AGENT_RECEIPT",
        });
        const reloadedExecution = loadExecution(execution.id);
        const failure = classifyExecutionFailure("MCP initialize handshake failed");
        const restored = fs.readFileSync(path.join(tempRoot, "tracked.txt"), "utf-8").replace(/\r\n/g, "\n") === "before\n" && !fs.existsSync(path.join(tempRoot, "created.txt"));
        const checks = {
            validatesTypedPacket: validation.pass,
            rejectsDangerousVerificationCommand: packet.verification.commands.length === 1 && packet.verification.commands[0] === "npm test",
            createsPersistentExecution: !!loadExecution(execution.id),
            checkpointRollbackRestoresFiles: rollback.success && restored,
            classifiesTypedFailure: failure.failureClass === "mcp_handshake" && failure.recoverable,
            evaluatesMergeReadyGreenContract: green.pass && green.level === "merge_ready",
            persistsDeliveryEvidence: reloadedExecution?.receipt?.status === "done"
                && reloadedExecution?.fileChanges?.files?.[0]?.path === "tracked.txt"
                && reloadedExecution?.runnerVerification?.status === "passed"
                && reloadedExecution?.outputPreview === "CCM_AGENT_RECEIPT",
            sanitizesEnvironment: sanitizeExecutionEnv({ CCM_SECRET_NOT_ALLOWED: "secret" }).CCM_SECRET_NOT_ALLOWED === undefined,
            supportsTargetedAgentRunCancel: cancelActiveAgentRun.toString().includes("cancelTask")
                && cancelActiveAgentRun.toString().includes("executionId")
                && cancelActiveAgentRun.toString().includes("project")
                && cancelActiveAgentRun.toString().includes("targeted: !cancelTask"),
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        try {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
        catch { }
        if (selfTestExecutionId)
            try {
                fs.unlinkSync(executionFile(selfTestExecutionId));
            }
            catch { }
        if (selfTestCheckpointId)
            try {
                fs.unlinkSync(checkpointFile(selfTestCheckpointId));
            }
            catch { }
    }
}
async function runExecutionKernelCancellationSelfTest() {
    const taskId = `cancel-self-test-${process.pid}-${Date.now()}`;
    clearTaskCancellation(taskId);
    const startedAt = Date.now();
    const command = `"${process.execPath}" -e "setTimeout(() => {}, 30000)"`;
    const running = runManagedCommand({ taskId, command, cwd: process.cwd(), timeoutMs: 35_000 });
    const cancelTimer = setTimeout(() => requestTaskCancellation(taskId, "execution kernel cancellation self test", "self-test"), 500);
    let code = "";
    try {
        await running;
    }
    catch (error) {
        code = String(error?.code || "");
    }
    finally {
        clearTimeout(cancelTimer);
        clearTaskCancellation(taskId);
    }
    const elapsedMs = Date.now() - startedAt;
    const checks = { returnsTypedCancellation: code === "CCM_CANCELLED", terminatesPromptly: elapsedMs < 8_000 };
    return { pass: Object.values(checks).every(Boolean), checks, elapsedMs };
}
//# sourceMappingURL=execution-kernel.js.map