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
exports.inspectGitRemoteState = inspectGitRemoteState;
exports.inspectGitRemoteStateAsync = inspectGitRemoteStateAsync;
exports.normalizeRepoPath = normalizeRepoPath;
exports.resolveSafeProjectFile = resolveSafeProjectFile;
exports.parseGitStatus = parseGitStatus;
exports.parseNumstat = parseNumstat;
exports.buildGitStatusSummary = buildGitStatusSummary;
exports.validatePatchPaths = validatePatchPaths;
exports.handleGitApi = handleGitApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const test_agent_runner_1 = require("../collaboration/test-agent-runner");
const git_workspace_runtime_1 = require("./git-workspace-runtime");
const MAX_PATCH_BYTES = 2 * 1024 * 1024;
const LARGE_FILE_BYTES = 1024 * 1024;
const REMOTE_GIT_TIMEOUT_MS = 30_000;
const REMOTE_GIT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
function runGit(workDir, args, options = {}) {
    const optionEnv = options?.env && typeof options.env === "object" ? options.env : {};
    return (0, child_process_1.execFileSync)("git", args, {
        cwd: workDir,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        maxBuffer: 12 * 1024 * 1024,
        timeout: 60_000,
        ...options,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...optionEnv },
    });
}
function tryGit(workDir, args) {
    try {
        return { ok: true, output: String(runGit(workDir, args) || "").trim() };
    }
    catch (error) {
        return { ok: false, output: "", error: safeGitError(error) };
    }
}
function safeGitError(error) {
    return String(error?.stderr || error?.stdout || error?.message || error || "Git 操作失败")
        .replace(/(https?:\/\/)[^/@\s]+@/gi, "$1")
        .replace(/([?&](?:access_token|auth_token|token|key|password)=)[^&\s]+/gi, "$1[已隐藏]")
        .replace(/(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi, "$1[已隐藏]")
        .replace(/[\0\r]+/g, " ")
        .trim()
        .slice(0, 2_000);
}
function gitCommandError(message, stdout = "", stderr = "", gitErrorCode = "") {
    const error = new Error(message);
    error.stdout = stdout;
    error.stderr = stderr;
    if (gitErrorCode)
        error.gitErrorCode = gitErrorCode;
    return error;
}
function killProcessTree(child) {
    const pid = Number(child?.pid || 0);
    if (!pid)
        return;
    if (process.platform === "win32") {
        try {
            (0, child_process_1.execFileSync)("taskkill", ["/PID", String(pid), "/T", "/F"], {
                encoding: "utf-8",
                stdio: ["ignore", "ignore", "ignore"],
                windowsHide: true,
                timeout: 5_000,
            });
        }
        catch {
            try {
                child.kill();
            }
            catch { }
        }
        return;
    }
    try {
        process.kill(-pid, "SIGTERM");
    }
    catch {
        try {
            child.kill("SIGTERM");
        }
        catch { }
    }
}
function runGitRemote(workDir, args, timeout = REMOTE_GIT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)("git", ["-c", "credential.interactive=never", ...args], {
            cwd: workDir,
            windowsHide: true,
            detached: process.platform !== "win32",
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: "0",
                GCM_INTERACTIVE: "Never",
                GCM_MODAL_PROMPT: "false",
                GIT_ASKPASS: "",
                SSH_ASKPASS: "",
                GIT_HTTP_LOW_SPEED_LIMIT: "1",
                GIT_HTTP_LOW_SPEED_TIME: "20",
                GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || "ssh -o BatchMode=yes -o ConnectTimeout=15 -o ConnectionAttempts=1",
            },
        });
        let stdout = "";
        let stderr = "";
        let outputBytes = 0;
        let timedOut = false;
        let outputExceeded = false;
        const append = (target, chunk) => {
            const text = String(chunk || "");
            outputBytes += Buffer.byteLength(text, "utf-8");
            if (outputBytes > REMOTE_GIT_MAX_OUTPUT_BYTES) {
                outputExceeded = true;
                killProcessTree(child);
                return;
            }
            if (target === "stdout")
                stdout += text;
            else
                stderr += text;
        };
        child.stdout?.on("data", chunk => append("stdout", chunk));
        child.stderr?.on("data", chunk => append("stderr", chunk));
        const timer = setTimeout(() => {
            timedOut = true;
            killProcessTree(child);
        }, timeout);
        child.once("error", error => {
            clearTimeout(timer);
            reject(gitCommandError(error.message || "无法启动 Git 远端操作", stdout, stderr));
        });
        child.once("close", code => {
            clearTimeout(timer);
            if (timedOut) {
                reject(gitCommandError(`Git 远端连接在 ${Math.ceil(timeout / 1_000)} 秒内没有完成`, stdout, stderr, "remote_timeout"));
                return;
            }
            if (outputExceeded) {
                reject(gitCommandError("Git 远端输出超过安全限制", stdout, stderr, "remote_output_exceeded"));
                return;
            }
            if (code !== 0) {
                reject(gitCommandError(`Git 远端操作失败（退出码 ${code ?? "unknown"}）`, stdout, stderr));
                return;
            }
            resolve(stdout.trim());
        });
    });
}
function gitFailureDetails(error, operation) {
    const raw = safeGitError(error);
    const lower = raw.toLowerCase();
    if (error?.gitErrorCode === "remote_timeout") {
        return { error: "Git 远端连接超时，操作已停止", errorCode: "remote_timeout", suggestion: "检查服务器网络、代理和远端站点连通性后重试", raw };
    }
    if (error?.gitErrorCode === "remote_ahead") {
        return { error: "远端分支包含本地没有的提交，当前推送已被阻止", errorCode: "remote_ahead", suggestion: "先拉取代码并处理差异，再重新推送", raw };
    }
    if (/authentication failed|could not read username|terminal prompts disabled|permission denied \(publickey\)|http basic: access denied|403 forbidden|error:\s*403/.test(lower)) {
        return { error: "Git 远端认证失败，请先在服务器配置 Git 凭据或 SSH Key", errorCode: "authentication_required", suggestion: "完成 git credential 或 SSH 登录后重新执行推送", raw };
    }
    if (/repository not found|does not appear to be a git repository/.test(lower)) {
        return { error: "远端仓库不存在或当前账号没有访问权限", errorCode: "repository_unavailable", suggestion: "检查 origin 地址及仓库访问权限", raw };
    }
    if (/non-fast-forward|fetch first|rejected.*behind|updates were rejected/.test(lower)) {
        return { error: "远端分支包含本地没有的提交，当前推送已被拒绝", errorCode: "remote_ahead", suggestion: "先拉取代码并处理差异，再重新推送", raw };
    }
    if (/no upstream branch|has no upstream branch/.test(lower)) {
        return { error: "当前分支还没有关联远端分支", errorCode: "upstream_missing", suggestion: "使用首次推送建立 upstream", raw };
    }
    if (/timed out|timeout/.test(lower)) {
        return { error: "Git 远端连接超时", errorCode: "remote_timeout", suggestion: "检查服务器网络、代理和 GitHub 连通性后重试", raw };
    }
    return { error: raw || `${operation} 失败`, errorCode: "git_operation_failed", suggestion: "打开 Git 终端检查远端配置和当前分支状态", raw };
}
function sanitizeRemoteUrl(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    try {
        const parsed = new URL(raw);
        parsed.username = "";
        parsed.password = "";
        return parsed.toString();
    }
    catch {
        return raw.replace(/^(https?:\/\/)[^/@\s]+@/i, "$1");
    }
}
function inspectGitRemoteState(workDir, changedFiles = -1) {
    const branchResult = tryGit(workDir, ["branch", "--show-current"]);
    const branch = branchResult.ok ? branchResult.output : "";
    const remoteResult = tryGit(workDir, ["remote", "get-url", "origin"]);
    const remoteUrl = remoteResult.ok ? sanitizeRemoteUrl(remoteResult.output) : "";
    const upstreamResult = tryGit(workDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
    const upstream = upstreamResult.ok ? upstreamResult.output : "";
    const remoteTrackingRef = !upstream && branch && remoteUrl && tryGit(workDir, ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`]).ok
        ? `origin/${branch}`
        : "";
    const comparisonRef = upstream || remoteTrackingRef;
    let ahead = 0;
    let behind = 0;
    if (comparisonRef) {
        const counts = tryGit(workDir, ["rev-list", "--left-right", "--count", `HEAD...${comparisonRef}`]);
        const match = counts.output.match(/^(\d+)\s+(\d+)$/);
        if (counts.ok && match) {
            ahead = Number(match[1]);
            behind = Number(match[2]);
        }
    }
    const changed = changedFiles >= 0
        ? changedFiles
        : parseGitStatus(String(tryGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]).output || "")).length;
    const detached = !branch;
    return {
        remoteUrl,
        remoteName: remoteUrl ? "origin" : "",
        branch: branch || "detached HEAD",
        detached,
        upstream,
        comparisonRef,
        ahead,
        behind,
        dirty: changed > 0,
        changedFiles: changed,
        canFetch: !!remoteUrl,
        canPull: !!remoteUrl && !detached && changed === 0,
        canPush: !!remoteUrl && !detached && behind === 0 && (!upstream || ahead > 0),
        canCommitAndPush: !!remoteUrl && !detached,
        pushState: !remoteUrl ? "remote_missing" : detached ? "detached" : behind > 0 ? "remote_ahead" : !upstream ? "first_push" : ahead > 0 ? "ready" : "up_to_date",
        pushTarget: upstream || (remoteUrl && branch ? `origin/${branch}` : ""),
        pullTarget: upstream || (remoteUrl && branch ? `origin/${branch}` : ""),
    };
}
async function inspectGitRemoteStateAsync(workDir, changedFiles = -1) {
    const branchResult = await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["branch", "--show-current"]);
    const branch = branchResult.ok ? branchResult.output : "";
    const remoteResult = await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["remote", "get-url", "origin"]);
    const remoteUrl = remoteResult.ok ? sanitizeRemoteUrl(remoteResult.output) : "";
    const upstreamResult = await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
    const upstream = upstreamResult.ok ? upstreamResult.output : "";
    const tracking = !upstream && branch && remoteUrl
        ? await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`])
        : { ok: false, output: "" };
    const remoteTrackingRef = tracking.ok ? `origin/${branch}` : "";
    const comparisonRef = upstream || remoteTrackingRef;
    let ahead = 0;
    let behind = 0;
    if (comparisonRef) {
        const counts = await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["rev-list", "--left-right", "--count", `HEAD...${comparisonRef}`]);
        const match = counts.output.match(/^(\d+)\s+(\d+)$/);
        if (counts.ok && match) {
            ahead = Number(match[1]);
            behind = Number(match[2]);
        }
    }
    const changed = changedFiles >= 0
        ? changedFiles
        : parseGitStatus((await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"])).output).length;
    const detached = !branch;
    return {
        remoteUrl,
        remoteName: remoteUrl ? "origin" : "",
        branch: branch || "detached HEAD",
        detached,
        upstream,
        comparisonRef,
        ahead,
        behind,
        dirty: changed > 0,
        changedFiles: changed,
        canFetch: !!remoteUrl,
        canPull: !!remoteUrl && !detached && changed === 0,
        canPush: !!remoteUrl && !detached && behind === 0 && (!upstream || ahead > 0),
        canCommitAndPush: !!remoteUrl && !detached,
        pushState: !remoteUrl ? "remote_missing" : detached ? "detached" : behind > 0 ? "remote_ahead" : !upstream ? "first_push" : ahead > 0 ? "ready" : "up_to_date",
        pushTarget: upstream || (remoteUrl && branch ? `origin/${branch}` : ""),
        pullTarget: upstream || (remoteUrl && branch ? `origin/${branch}` : ""),
    };
}
async function performGitRemoteOperation(workDir, operation) {
    let before = await inspectGitRemoteStateAsync(workDir);
    if (!before.remoteUrl)
        throw new Error("当前项目没有配置 origin 远端仓库");
    if (operation !== "fetch" && before.detached)
        throw new Error("当前处于 detached HEAD，不能更新或推送分支");
    if (operation === "pull" && before.dirty)
        throw new Error(`工作区有 ${before.changedFiles} 个未提交文件，请先提交或处理后再更新本地代码`);
    let args;
    if (operation === "fetch")
        args = ["fetch", "--prune", "origin"];
    else if (operation === "pull")
        args = before.upstream
            ? ["pull", "--ff-only"]
            : ["pull", "--ff-only", "origin", before.branch];
    else if (operation === "push") {
        await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["fetch", "--prune", "origin"], { remote: true, timeoutMs: REMOTE_GIT_TIMEOUT_MS, maxOutputBytes: REMOTE_GIT_MAX_OUTPUT_BYTES });
        before = await inspectGitRemoteStateAsync(workDir);
        if (before.behind > 0) {
            throw gitCommandError("remote branch contains commits that are not available locally", "", "", "remote_ahead");
        }
        if (before.upstream && before.ahead === 0) {
            return {
                operation,
                output: "",
                noop: true,
                outcome: "up_to_date",
                repository: before,
            };
        }
        args = before.upstream ? ["push"] : ["push", "--set-upstream", "origin", before.branch];
    }
    else
        throw new Error("不支持的 Git 远端操作");
    const output = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, args, { remote: true, timeoutMs: REMOTE_GIT_TIMEOUT_MS, maxOutputBytes: REMOTE_GIT_MAX_OUTPUT_BYTES })).stdout.trim();
    return {
        operation,
        output: output.slice(-4_000),
        noop: false,
        repository: await inspectGitRemoteStateAsync(workDir),
    };
}
function commitSelectedChanges(workDir, message, requested, allFiles) {
    let commitPaths = [];
    if (requested.length) {
        const preview = commitPreview(workDir, requested);
        if (preview.blocked) {
            const error = new Error(preview.conflicts.length ? "存在冲突文件，不能提交" : "所选文件已变化，请刷新后重试");
            error.preview = preview;
            throw error;
        }
        const stagingPaths = Array.from(new Set([
            ...requested,
            ...preview.files.map((file) => normalizeRepoPath(file.originalPath)).filter(Boolean),
        ]));
        runGit(workDir, ["add", "-A", "--", ...stagingPaths]);
        commitPaths = String(runGit(workDir, ["diff", "--cached", "--name-only", "-z", "--", ...stagingPaths]) || "").split("\0").filter(Boolean);
        if (!commitPaths.length) {
            return { hash: "", files: [], noop: true };
        }
        runGit(workDir, ["commit", "--only", "-m", message, "--", ...commitPaths]);
    }
    else if (allFiles) {
        runGit(workDir, ["add", "-A"]);
        runGit(workDir, ["commit", "-m", message]);
        commitPaths = String(runGit(workDir, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"]) || "").split("\0").filter(Boolean);
    }
    else {
        throw new Error("请明确选择本次要提交的文件");
    }
    return { hash: runGit(workDir, ["rev-parse", "--short", "HEAD"]).trim(), files: commitPaths, noop: false };
}
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function readBody(req, res, callback) {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk;
        if (Buffer.byteLength(body, "utf-8") > MAX_PATCH_BYTES + 64 * 1024)
            req.destroy();
    });
    req.on("end", () => {
        try {
            callback(JSON.parse(body || "{}"));
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: "请求内容不是有效 JSON: " + error.message }, 400);
        }
    });
}
function projectWorkDir(project) {
    const config = (0, db_1.getConfigs)().find(item => item.name === project);
    if (!config)
        return { error: "项目不存在", status: 404 };
    const workDir = (0, db_1.getConfigInfo)(config.path)[0]?.workDir;
    if (!workDir || !fs.existsSync(workDir))
        return { error: "项目目录不存在", status: 400 };
    return { workDir: path.resolve(workDir), config };
}
function normalizeRepoPath(filePath) {
    return (0, git_workspace_runtime_1.normalizeGitRepoPath)(filePath);
}
function resolveSafeProjectFile(workDir, filePath) {
    return (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(workDir, filePath, { allowLeafSymlink: true });
}
function expandedRenamePath(rawPath) {
    const value = rawPath.trim();
    const braceMatch = value.match(/^(.*)\{([^{}]*) => ([^{}]*)\}(.*)$/);
    if (braceMatch)
        return `${braceMatch[1]}${braceMatch[3]}${braceMatch[4]}`;
    const arrow = value.lastIndexOf(" => ");
    if (arrow >= 0)
        return value.slice(arrow + 4).trim();
    return value;
}
function currentRenamePath(rawPath) {
    const value = rawPath.trim();
    const arrow = value.lastIndexOf(" -> ");
    return arrow >= 0 ? value.slice(arrow + 4).trim() : expandedRenamePath(value);
}
function statusPresentation(indexStatus, worktreeStatus) {
    const combined = `${indexStatus}${worktreeStatus}`;
    if (combined === "??")
        return { statusText: "未跟踪", statusColor: "#0f766e" };
    if (/U|AA|DD/.test(combined))
        return { statusText: "冲突", statusColor: "#dc2626" };
    const label = (status) => {
        if (status === "M")
            return "修改";
        if (status === "A")
            return "新增";
        if (status === "D")
            return "删除";
        if (status === "R")
            return "重命名";
        if (status === "C")
            return "复制";
        if (status === "T")
            return "类型变化";
        return "变更";
    };
    const color = combined.includes("D")
        ? "#dc2626"
        : combined.includes("A") ? "#059669"
            : /R|C/.test(combined) ? "#7c3aed" : "#2563eb";
    if (indexStatus !== " " && worktreeStatus !== " ") {
        return { statusText: `已暂存${label(indexStatus)}，工作区又${label(worktreeStatus)}`, statusColor: color };
    }
    if (indexStatus !== " ")
        return { statusText: `已暂存${label(indexStatus)}`, statusColor: color };
    if (worktreeStatus !== " ")
        return { statusText: `工作区已${label(worktreeStatus)}`, statusColor: color };
    return { statusText: "文件已变化", statusColor: "#2563eb" };
}
function parseGitStatus(output) {
    const raw = String(output || "");
    if (raw.includes("\0")) {
        const records = raw.split("\0");
        const files = [];
        for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            if (!record)
                continue;
            const statusCode = record.slice(0, 2).padEnd(2, " ");
            const indexStatus = statusCode[0] || " ";
            const worktreeStatus = statusCode[1] || " ";
            const filePath = record.slice(3);
            const renamed = /R|C/.test(statusCode);
            const originalPath = renamed ? String(records[index + 1] || "") : "";
            if (renamed)
                index += 1;
            const untracked = statusCode === "??";
            const conflict = /U/.test(statusCode) || ["AA", "DD"].includes(statusCode);
            files.push({
                path: filePath,
                originalPath,
                status: statusCode.trim() || statusCode,
                statusCode,
                indexStatus,
                worktreeStatus,
                staged: !untracked && indexStatus !== " " && indexStatus !== "?",
                unstaged: untracked || worktreeStatus !== " ",
                untracked,
                conflict,
                ...statusPresentation(indexStatus, worktreeStatus),
            });
        }
        return files;
    }
    return raw.split(/\r?\n/).filter(Boolean).map(line => {
        const statusCode = line.slice(0, 2).padEnd(2, " ");
        const originalPath = line.slice(3).trim();
        const filePath = currentRenamePath(originalPath);
        const indexStatus = statusCode[0] || " ";
        const worktreeStatus = statusCode[1] || " ";
        const untracked = statusCode === "??";
        const conflict = /U/.test(statusCode) || ["AA", "DD"].includes(statusCode);
        return {
            path: filePath,
            originalPath: originalPath === filePath ? "" : originalPath,
            status: statusCode.trim() || statusCode,
            statusCode,
            indexStatus,
            worktreeStatus,
            staged: !untracked && indexStatus !== " " && indexStatus !== "?",
            unstaged: untracked || worktreeStatus !== " ",
            untracked,
            conflict,
            ...statusPresentation(indexStatus, worktreeStatus),
        };
    });
}
function parseNumstat(output) {
    const result = new Map();
    const raw = String(output || "");
    if (raw.includes("\0")) {
        const records = raw.split("\0");
        for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            if (!record)
                continue;
            const match = record.match(/^(-|\d+)\t(-|\d+)\t([\s\S]*)$/);
            if (!match)
                continue;
            let filePath = match[3];
            if (!filePath) {
                index += 1;
                const originalPath = String(records[index] || "");
                index += 1;
                filePath = String(records[index] || originalPath);
            }
            if (!filePath)
                continue;
            const binary = match[1] === "-" || match[2] === "-";
            result.set(normalizeRepoPath(filePath), {
                additions: binary ? 0 : Number(match[1] || 0),
                deletions: binary ? 0 : Number(match[2] || 0),
                binary,
            });
        }
        return result;
    }
    raw.split(/\r?\n/).filter(Boolean).forEach(line => {
        const [addRaw, deleteRaw, ...pathParts] = line.split("\t");
        const filePath = expandedRenamePath(pathParts.join("\t"));
        if (!filePath)
            return;
        const binary = addRaw === "-" || deleteRaw === "-";
        result.set(normalizeRepoPath(filePath), {
            additions: binary ? 0 : Number(addRaw || 0),
            deletions: binary ? 0 : Number(deleteRaw || 0),
            binary,
        });
    });
    return result;
}
function untrackedStats(workDir, filePath) {
    const state = (0, utils_1.readWorkingFileText)(workDir, filePath);
    if (!state.exists || state.binary)
        return { additions: 0, deletions: 0, binary: !!state.binary };
    return { additions: state.text ? state.text.split(/\r?\n/).length : 0, deletions: 0, binary: false };
}
async function readSafeWorkingFileText(workDir, filePath) {
    const safe = (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(workDir, filePath, { allowLeafSymlink: true });
    if (!fs.existsSync(safe.absolute))
        return { exists: false, binary: false, text: "", truncated: false, tooLarge: false, size: 0, symlink: false };
    const stat = fs.lstatSync(safe.absolute);
    if (stat.isSymbolicLink())
        return { exists: true, binary: false, text: "", truncated: false, tooLarge: false, size: stat.size, symlink: true };
    if (!stat.isFile())
        throw new Error("仅支持读取普通文件");
    if (stat.size > 4 * 1024 * 1024)
        return { exists: true, binary: false, text: "", truncated: true, tooLarge: true, size: stat.size, symlink: false };
    const buffer = await fs.promises.readFile(safe.absolute);
    const binary = buffer.subarray(0, Math.min(buffer.length, 8_192)).includes(0);
    return { exists: true, binary, text: binary ? "" : buffer.toString("utf-8"), truncated: false, tooLarge: false, size: stat.size, symlink: false };
}
async function untrackedStatsAsync(workDir, filePath) {
    const state = await readSafeWorkingFileText(workDir, filePath);
    if (!state.exists || state.binary || state.tooLarge || state.symlink)
        return { additions: 0, deletions: 0, binary: !!state.binary };
    return { additions: state.text ? state.text.split(/\r?\n/).length : 0, deletions: 0, binary: false };
}
function taskFiles(task) {
    const values = [
        task?.delivery_summary?.actual_file_changes,
        task?.delivery_summary?.files_changed,
        task?.receipt?.files_changed,
        task?.file_changes?.files,
        task?.fileChanges?.files,
    ].flatMap(value => Array.isArray(value) ? value : []);
    return Array.from(new Set(values.map((item) => normalizeRepoPath(typeof item === "string" ? item : item?.path)).filter(Boolean)));
}
function verificationSummary(task) {
    const values = task?.delivery_summary?.verification_executed
        || task?.delivery_summary?.verification
        || task?.verification?.executed
        || task?.receipt?.verification
        || [];
    return (Array.isArray(values) ? values : [values]).map(value => String(value || "").trim()).filter(Boolean).slice(0, 4);
}
function timeOf(item) {
    const value = item?.finishedAt || item?.completed_at || item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || "";
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
}
function buildChangeContext(project, workDir, changedPaths) {
    const normalizedFiles = new Set(changedPaths.map(normalizeRepoPath));
    const tasks = (0, db_1.loadTasks)();
    const sessionStore = readJson(path.join(utils_1.CCM_DIR, "task-agent-sessions.json"), { sessions: [] });
    const sessions = Array.isArray(sessionStore) ? sessionStore : sessionStore?.sessions || [];
    const runStore = readJson(path.join(utils_1.CCM_DIR, "project-chat-runs.json"), { runs: [] });
    const projectRuns = (runStore?.runs || []).filter((run) => run?.project === project);
    const candidates = tasks.map((task) => {
        const files = taskFiles(task);
        const exactFiles = files.filter(file => normalizedFiles.has(file));
        const projectMatch = String(task?.target_project || task?.project || "") === project;
        const runMatch = projectRuns.some((run) => String(run?.taskId || run?.id || "") === String(task?.id || ""));
        if (!projectMatch && !exactFiles.length && !runMatch)
            return null;
        const session = sessions.filter((item) => item?.taskId === task?.id && (!item?.project || item.project === project)).sort((a, b) => timeOf(b) - timeOf(a))[0];
        return {
            taskId: String(task?.id || ""),
            title: String(task?.title || task?.business_goal || "关联任务"),
            status: String(task?.status || ""),
            updatedAt: new Date(timeOf(task) || Date.now()).toISOString(),
            traceId: String(task?.trace_id || task?.traceId || ""),
            groupId: String(task?.group_id || task?.groupId || ""),
            agent: String(session?.agentType || task?.runtime_override || task?.runtime || "项目 Agent"),
            files,
            exactFiles,
            association: exactFiles.length ? "exact" : "project_recent",
            verification: verificationSummary(task),
            acceptancePassed: task?.delivery_summary?.acceptance_gate_passed === true,
            _time: timeOf(task),
        };
    }).filter(Boolean);
    for (const run of projectRuns) {
        const files = (run?.fileChanges?.files || []).map((item) => normalizeRepoPath(typeof item === "string" ? item : item?.path)).filter(Boolean);
        const exactFiles = files.filter((file) => normalizedFiles.has(file));
        candidates.push({
            taskId: String(run?.taskId || run?.id || ""),
            title: String(run?.message || "项目 Agent 对话"),
            status: String(run?.status || ""),
            updatedAt: new Date(timeOf(run) || Date.now()).toISOString(),
            traceId: String(run?.trace_id || ""),
            groupId: "",
            agent: String(run?.agentType || run?.runtime || project),
            files,
            exactFiles,
            association: exactFiles.length ? "exact" : "project_recent",
            verification: [],
            acceptancePassed: run?.status === "done",
            _time: timeOf(run),
        });
    }
    const deduped = Array.from(new Map(candidates.sort((a, b) => b._time - a._time).map((item) => [item.taskId, item])).values()).slice(0, 3);
    const taskIds = new Set(deduped.map(item => item.taskId));
    const exactTaskIds = new Set(deduped.filter(item => item.association === "exact").map(item => item.taskId));
    let latestTestAgent = null;
    const testRunDir = path.join(utils_1.CCM_DIR, "test-agent-runs");
    try {
        const files = fs.readdirSync(testRunDir).filter(file => /^tar_.+\.json$/.test(file) && !file.includes("stdout")).slice(-250);
        const matching = files.map(file => readJson(path.join(testRunDir, file), null)).filter((run) => {
            const sourceProjects = [...(run?.sourceBefore?.projects || []), ...(run?.sourceAfter?.projects || [])];
            const projectMatch = sourceProjects.some((item) => item?.name === project || path.resolve(item?.realWorkDir || item?.workDir || ".") === path.resolve(workDir));
            return run && (taskIds.has(String(run?.taskId || "")) || projectMatch);
        }).sort((a, b) => timeOf(b) - timeOf(a));
        const run = matching.find((item) => exactTaskIds.has(String(item?.taskId || ""))) || matching[0];
        if (run) {
            const report = run?.result?.report || {};
            latestTestAgent = {
                runId: String(run.id || ""),
                taskId: String(run.taskId || report.taskId || ""),
                status: String(report.status || run?.result?.outcome || run.status || ""),
                recommendation: String(report.recommendation || run?.result?.recommendation || ""),
                summary: String(report.summary || run.error || ""),
                finishedAt: String(report.finishedAt || run.finishedAt || ""),
                browserChecks: Array.isArray(report.browserResults) ? report.browserResults.length : Number(report.browserCheckCount || 0),
                association: exactTaskIds.has(String(run.taskId || report.taskId || "")) ? "exact" : "project_recent",
            };
        }
    }
    catch { }
    return {
        tasks: deduped.map(({ _time, ...item }) => item),
        latestTestAgent,
        attribution: deduped.some(item => item.association === "exact") ? "exact" : deduped.length ? "project_recent" : "none",
    };
}
async function buildChangeContextAsync(project, workDir, changedPaths) {
    const normalizedFiles = new Set(changedPaths.map(normalizeRepoPath));
    const tasks = (0, db_1.loadTasks)();
    const sessionStore = readJson(path.join(utils_1.CCM_DIR, "task-agent-sessions.json"), { sessions: [] });
    const sessions = Array.isArray(sessionStore) ? sessionStore : sessionStore?.sessions || [];
    const runStore = readJson(path.join(utils_1.CCM_DIR, "project-chat-runs.json"), { runs: [] });
    const projectRuns = (runStore?.runs || []).filter((run) => run?.project === project);
    const candidates = [];
    for (const task of tasks) {
        const files = taskFiles(task);
        const matchingFiles = files.filter(file => normalizedFiles.has(file));
        const projectMatch = String(task?.target_project || task?.project || "") === project;
        const runMatch = projectRuns.some((run) => String(run?.taskId || run?.id || "") === String(task?.id || ""));
        if (!projectMatch && !matchingFiles.length && !runMatch)
            continue;
        const session = sessions.filter((item) => item?.taskId === task?.id && (!item?.project || item.project === project)).sort((a, b) => timeOf(b) - timeOf(a))[0];
        candidates.push({
            taskId: String(task?.id || ""),
            title: String(task?.title || task?.business_goal || "关联任务"),
            status: String(task?.status || ""),
            updatedAt: new Date(timeOf(task) || Date.now()).toISOString(),
            traceId: String(task?.trace_id || task?.traceId || ""),
            groupId: String(task?.group_id || task?.groupId || ""),
            agent: String(session?.agentType || task?.runtime_override || task?.runtime || "项目 Agent"),
            files,
            exactFiles: [],
            matchingFiles,
            association: matchingFiles.length ? "path_only" : "project_recent",
            verification: verificationSummary(task),
            acceptancePassed: false,
            _time: timeOf(task),
        });
    }
    for (const run of projectRuns) {
        const files = (run?.fileChanges?.files || []).map((item) => normalizeRepoPath(typeof item === "string" ? item : item?.path)).filter(Boolean);
        const matchingFiles = files.filter((file) => normalizedFiles.has(file));
        candidates.push({
            taskId: String(run?.taskId || run?.id || ""), title: String(run?.message || "项目 Agent 对话"), status: String(run?.status || ""),
            updatedAt: new Date(timeOf(run) || Date.now()).toISOString(), traceId: String(run?.trace_id || ""), groupId: "",
            agent: String(run?.agentType || run?.runtime || project), files, exactFiles: [], matchingFiles,
            association: matchingFiles.length ? "path_only" : "project_recent", verification: [], acceptancePassed: false, _time: timeOf(run),
        });
    }
    const deduped = Array.from(new Map(candidates.sort((a, b) => b._time - a._time).map(item => [item.taskId, item])).values()).slice(0, 3);
    const taskIds = deduped.map(item => item.taskId).filter(Boolean);
    let latestTestAgent = null;
    const records = (0, test_agent_runner_1.listTestAgentRunnerRecords)({ taskIds, limit: 100 }).filter(record => record.mode === "invocation").sort((a, b) => timeOf(b) - timeOf(a));
    for (const record of records) {
        const source = record.sourceAfter || record.sourceBefore;
        const sourceProject = source?.projects?.find((item) => item.name === project || path.resolve(item.realWorkDir || item.workDir || ".") === path.resolve(workDir));
        if (!sourceProject)
            continue;
        const overlap = (sourceProject.declaredFiles || []).map(normalizeRepoPath).filter((file) => normalizedFiles.has(file));
        if (!overlap.length)
            continue;
        const current = (0, test_agent_runner_1.captureTestAgentSourceBinding)({ projects: [{ name: project, workDir, changedFiles: sourceProject.declaredFiles || [] }] }).projects[0];
        const contractPassed = record.status === "completed" && record.sourceStable === true;
        const evidenceVerified = Array.isArray(sourceProject.declaredFileEvidence)
            ? sourceProject.declaredFileEvidence.length > 0 && sourceProject.declaredFileEvidence.every((item) => item.verified === true)
            : false;
        const exact = contractPassed
            && evidenceVerified
            && current.realWorkDir.toLowerCase() === String(sourceProject.realWorkDir || "").toLowerCase()
            && current.gitHead === String(sourceProject.gitHead || "")
            && current.declaredFileHash === String(sourceProject.declaredFileHash || "");
        const task = deduped.find(item => item.taskId === record.taskId);
        if (task && exact) {
            task.association = "exact";
            task.exactFiles = overlap;
            task.acceptancePassed = true;
        }
        const report = record?.result?.report || {};
        latestTestAgent = {
            runId: String(record.id || ""), taskId: String(record.taskId || report.taskId || ""),
            status: String(report.status || record?.result?.outcome || record.status || ""),
            recommendation: String(report.recommendation || record?.result?.recommendation || ""),
            summary: String(report.summary || record.error || ""), finishedAt: String(report.finishedAt || record.finishedAt || ""),
            browserChecks: Array.isArray(report.browserResults) ? report.browserResults.length : Number(report.browserCheckCount || 0),
            association: exact ? "exact" : "historical_unverified",
            evidenceChecksum: source.fingerprint || "",
        };
        if (exact)
            break;
    }
    return {
        tasks: deduped.map(({ _time, ...item }) => item),
        latestTestAgent,
        attribution: deduped.some(item => item.association === "exact") ? "exact" : deduped.length ? "historical_unverified" : "none",
    };
}
function buildGitStatusSummary(files) {
    const summary = files.reduce((acc, file) => {
        if (file.indexResidual) {
            acc.indexResidual += 1;
            return acc;
        }
        acc.total += 1;
        if (file.staged)
            acc.staged += 1;
        if (file.unstaged)
            acc.unstaged += 1;
        if (file.untracked)
            acc.untracked += 1;
        if (file.conflict)
            acc.conflicts += 1;
        if (file.binary)
            acc.binary += 1;
        if (file.large)
            acc.largeFiles += 1;
        acc.additions += Number(file.additions || 0);
        acc.deletions += Number(file.deletions || 0);
        const moduleName = normalizeRepoPath(file.path).split("/")[0] || "根目录";
        if (!acc.modules.includes(moduleName))
            acc.modules.push(moduleName);
        return acc;
    }, { total: 0, staged: 0, unstaged: 0, untracked: 0, conflicts: 0, binary: 0, largeFiles: 0, indexResidual: 0, additions: 0, deletions: 0, modules: [] });
    const warnings = [];
    if (summary.conflicts)
        warnings.push(`${summary.conflicts} 个冲突文件会阻止提交`);
    if (summary.indexResidual)
        warnings.push(`${summary.indexResidual} 个暂存区索引残留已单独归类`);
    if (summary.untracked)
        warnings.push(`${summary.untracked} 个未跟踪文件需要确认`);
    if (summary.largeFiles)
        warnings.push(`${summary.largeFiles} 个大文件需要检查`);
    if (summary.binary)
        warnings.push(`${summary.binary} 个二进制文件无法逐行预览`);
    return { ...summary, modules: summary.modules.slice(0, 8), riskLevel: summary.conflicts ? "high" : warnings.length ? "medium" : "low", warnings };
}
function isIndexResidual(file) {
    return file?.indexStatus === "A" && file?.worktreeStatus === "D";
}
function cleanupIndexResiduals(workDir, requestedFiles) {
    const current = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]))
        .filter(isIndexResidual);
    const available = new Map(current.map(file => [normalizeRepoPath(file.path), file]));
    const requested = Array.from(new Set((requestedFiles || []).map(normalizeRepoPath).filter(Boolean)));
    if (!requested.length)
        throw new Error("没有选择要清理的索引残留");
    const invalid = requested.filter(file => !available.has(file));
    if (invalid.length)
        throw new Error(`文件状态已变化，请刷新后重试：${invalid.slice(0, 3).join("、")}`);
    requested.forEach(file => resolveSafeProjectFile(workDir, file));
    runGit(workDir, ["rm", "--cached", "--ignore-unmatch", "-f", "--", ...requested]);
    const remaining = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]))
        .filter(isIndexResidual)
        .map(file => file.path);
    return { cleaned: requested, remaining };
}
async function cleanupIndexResidualsAsync(workDir, requestedFiles) {
    const current = parseGitStatus((await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"])).stdout).filter(isIndexResidual);
    const available = new Map(current.map(file => [normalizeRepoPath(file.path), file]));
    const requested = Array.from(new Set((requestedFiles || []).map(normalizeRepoPath).filter(Boolean)));
    if (!requested.length)
        throw new Error("没有选择要清理的索引残留");
    const invalid = requested.filter(file => !available.has(file));
    if (invalid.length)
        throw new Error(`文件状态已变化，请刷新后重试：${invalid.slice(0, 3).join("、")}`);
    requested.forEach(file => (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(workDir, file, { allowLeafSymlink: true }));
    await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["rm", "--cached", "--ignore-unmatch", "-f", "--", ...requested]);
    const remaining = parseGitStatus((await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"])).stdout).filter(isIndexResidual).map(file => file.path);
    return { cleaned: requested, remaining };
}
function parseDiffHunks(diff) {
    const hunks = [];
    let currentHunk = null;
    for (const line of String(diff || "").split("\n")) {
        if (line.startsWith("@@")) {
            const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
            if (!match)
                continue;
            if (currentHunk)
                hunks.push(currentHunk);
            currentHunk = { header: line, oldStart: Number(match[1]), oldLines: Number(match[2] || 1), newStart: Number(match[3]), newLines: Number(match[4] || 1), context: match[5]?.trim() || "", changes: [] };
        }
        else if (currentHunk) {
            if (line.startsWith("+") && !line.startsWith("+++"))
                currentHunk.changes.push({ type: "add", content: line.slice(1) });
            else if (line.startsWith("-") && !line.startsWith("---"))
                currentHunk.changes.push({ type: "remove", content: line.slice(1) });
            else if (!line.startsWith("---") && !line.startsWith("+++"))
                currentHunk.changes.push({ type: "context", content: line.startsWith(" ") ? line.slice(1) : line });
        }
    }
    if (currentHunk)
        hunks.push(currentHunk);
    return hunks;
}
function validatePatchPaths(patchText) {
    if (!patchText || Buffer.byteLength(patchText, "utf-8") > MAX_PATCH_BYTES)
        throw new Error("Patch 为空或超过 2 MB 安全限制");
    const paths = [];
    for (const line of patchText.split(/\r?\n/)) {
        let value = "";
        if (line.startsWith("--- ") || line.startsWith("+++ "))
            value = line.slice(4).split("\t")[0].trim();
        if (!value || value === "/dev/null")
            continue;
        value = value.replace(/^[ab]\//, "");
        const normalized = normalizeRepoPath(value);
        if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes(".."))
            throw new Error("Patch 包含非法文件路径");
        paths.push(normalized);
    }
    if (!paths.length)
        throw new Error("Patch 不包含可验证的文件路径");
    return Array.from(new Set(paths));
}
function fileStatus(workDir, filePath) {
    return runGit(workDir, ["-c", "core.quotepath=false", "status", "--porcelain", "--", filePath]).split("\n")[0] || "";
}
function commitPreview(workDir, requestedFiles) {
    const allFiles = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]));
    const files = Array.from(new Set((requestedFiles || []).map(normalizeRepoPath).filter(Boolean)));
    files.forEach(file => resolveSafeProjectFile(workDir, file));
    const selected = allFiles.filter(file => files.includes(normalizeRepoPath(file.path)));
    const outsideStaged = allFiles.filter(file => file.staged && !files.includes(normalizeRepoPath(file.path)));
    const conflicts = selected.filter(file => file.conflict);
    const warnings = [];
    if (selected.some(file => file.untracked))
        warnings.push("包含未跟踪文件，提交后会开始受 Git 管理");
    if (selected.some(file => file.statusCode.includes("D")))
        warnings.push("包含删除文件，请确认删除符合预期");
    if (outsideStaged.length)
        warnings.push(`暂存区还有 ${outsideStaged.length} 个未选文件，本次不会提交`);
    return {
        files: selected,
        requestedFiles: files,
        outsideStaged: outsideStaged.map(file => file.path),
        conflicts: conflicts.map(file => file.path),
        blocked: !files.length || selected.length !== files.length || conflicts.length > 0,
        warnings,
    };
}
async function commitPreviewAsync(workDir, requestedFiles, project = "") {
    const snapshot = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(workDir, project);
    const allFiles = parseGitStatus(snapshot.status_raw);
    const files = Array.from(new Set((requestedFiles || []).map(normalizeRepoPath).filter(Boolean)));
    files.forEach(file => (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(workDir, file, { allowLeafSymlink: true }));
    const selected = allFiles.filter(file => files.includes(normalizeRepoPath(file.path)));
    const outsideStaged = allFiles.filter(file => file.staged && !files.includes(normalizeRepoPath(file.path)));
    const conflicts = selected.filter(file => file.conflict);
    const warnings = [];
    if (selected.some(file => file.untracked))
        warnings.push("包含未跟踪文件，提交后会开始受 Git 管理");
    if (selected.some(file => file.statusCode.includes("D")))
        warnings.push("包含删除文件，请确认删除符合预期");
    if (outsideStaged.length)
        warnings.push(`暂存区还有 ${outsideStaged.length} 个未选文件，本次不会提交`);
    const evidence = await (0, git_workspace_runtime_1.captureFileEvidence)(workDir, files);
    const previewBase = {
        schema: "ccm-git-commit-preview-v2",
        files: selected,
        requestedFiles: files,
        outsideStaged: outsideStaged.map(file => file.path),
        conflicts: conflicts.map(file => file.path),
        blocked: !files.length || selected.length !== files.length || conflicts.length > 0,
        warnings,
        workspace_snapshot_checksum: snapshot.checksum,
        file_evidence: evidence,
    };
    return { ...previewBase, checksum: (0, git_workspace_runtime_1.gitChecksum)(previewBase), snapshot };
}
async function commitSelectedChangesAsync(workDir, message, requested, allFiles, project = "") {
    let commitPaths = [];
    if (requested.length) {
        const preview = await commitPreviewAsync(workDir, requested, project);
        if (preview.blocked) {
            const error = new Error(preview.conflicts.length ? "存在冲突文件，不能提交" : "所选文件已变化，请刷新后重试");
            error.preview = preview;
            throw error;
        }
        const stagingPaths = Array.from(new Set([...requested, ...preview.files.map((file) => normalizeRepoPath(file.originalPath)).filter(Boolean)]));
        await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["add", "-A", "--", ...stagingPaths]);
        commitPaths = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["diff", "--cached", "--name-only", "-z", "--", ...stagingPaths])).stdout.split("\0").filter(Boolean);
        if (!commitPaths.length)
            return { hash: "", fullHash: "", files: [], blobs: [], noop: true };
        await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["commit", "--only", "-m", message, "--", ...commitPaths]);
    }
    else if (allFiles) {
        await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["add", "-A"]);
        await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["commit", "-m", message]);
        commitPaths = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"])).stdout.split("\0").filter(Boolean);
    }
    else
        throw new Error("请明确选择本次要提交的文件");
    const fullHash = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["rev-parse", "HEAD"])).stdout.trim();
    const hash = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["rev-parse", "--short", "HEAD"])).stdout.trim();
    const blobOutput = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["ls-tree", "-r", "-z", "HEAD", "--", ...commitPaths])).stdout;
    const blobs = blobOutput.split("\0").filter(Boolean).map(row => {
        const match = row.match(/^\d+\s+(\w+)\s+([0-9a-f]+)\t(.+)$/);
        return match ? { type: match[1], blob: match[2], path: normalizeRepoPath(match[3]) } : null;
    }).filter(Boolean);
    return { hash, fullHash, files: commitPaths, blobs, noop: false };
}
const gitStatusSnapshots = new Map();
function statusCursor(checksum, offset) {
    return Buffer.from(JSON.stringify({ checksum, offset }), "utf-8").toString("base64url");
}
function parseStatusCursor(value) {
    if (!value)
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf-8"));
        return { checksum: String(parsed.checksum || ""), offset: Math.max(0, Number(parsed.offset || 0)) };
    }
    catch {
        throw new Error("Git状态游标无效，请刷新后重试");
    }
}
async function buildGitStatusSnapshot(project, workDir, requestedChecksum = "") {
    const cached = requestedChecksum ? gitStatusSnapshots.get(requestedChecksum) : null;
    if (cached && cached.expiresAt > Date.now())
        return cached;
    const snapshot = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(workDir, project);
    if (requestedChecksum && requestedChecksum !== snapshot.checksum) {
        const error = new Error("Git工作区已发生变化，请刷新状态");
        error.gitErrorCode = "state_drift";
        throw error;
    }
    const [stagedRaw, workingRaw, effectiveRaw] = await Promise.all([
        (0, git_workspace_runtime_1.runGitCommand)(workDir, ["diff", "--staged", "--numstat", "-z"]),
        (0, git_workspace_runtime_1.runGitCommand)(workDir, ["diff", "--numstat", "-z"]),
        snapshot.repository.head
            ? (0, git_workspace_runtime_1.runGitCommand)(workDir, ["diff", "HEAD", "--numstat", "-z"])
            : Promise.resolve({ stdout: "", stderr: "", exitCode: 0 }),
    ]);
    const stagedStats = parseNumstat(stagedRaw.stdout);
    const workingStats = parseNumstat(workingRaw.stdout);
    const effectiveStats = parseNumstat(effectiveRaw.stdout);
    const files = parseGitStatus(snapshot.status_raw).map(file => {
        const key = normalizeRepoPath(file.path);
        const staged = stagedStats.get(key) || { additions: 0, deletions: 0, binary: false };
        const working = workingStats.get(key) || { additions: 0, deletions: 0, binary: false };
        const indexResidual = isIndexResidual(file);
        const effective = file.untracked
            ? { additions: 0, deletions: 0, binary: false }
            : (effectiveStats.get(key) || (indexResidual ? { additions: 0, deletions: 0, binary: false } : {
                additions: staged.additions + working.additions,
                deletions: staged.deletions + working.deletions,
                binary: staged.binary || working.binary,
            }));
        return {
            ...file, indexResidual, effective: !indexResidual,
            stagedAdditions: staged.additions, stagedDeletions: staged.deletions,
            workingAdditions: working.additions, workingDeletions: working.deletions,
            additions: effective.additions, deletions: effective.deletions, binary: effective.binary,
            size: 0, large: false,
        };
    });
    const entry = { expiresAt: Date.now() + 30_000, snapshot, files, summary: buildGitStatusSummary(files), stagedStats, workingStats, effectiveStats };
    gitStatusSnapshots.set(snapshot.checksum, entry);
    for (const [key, item] of gitStatusSnapshots)
        if (item.expiresAt <= Date.now())
            gitStatusSnapshots.delete(key);
    return entry;
}
async function enrichGitStatusPage(workDir, files) {
    const result = [];
    const concurrency = 8;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, Math.max(1, files.length)) }, async () => {
        while (cursor < files.length) {
            const index = cursor++;
            const file = files[index];
            const safe = (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(workDir, file.path, { allowLeafSymlink: true });
            let size = 0;
            let symlink = !!safe.leafSymlink;
            try {
                if (fs.existsSync(safe.absolute)) {
                    const stat = fs.lstatSync(safe.absolute);
                    size = stat.size;
                    symlink = stat.isSymbolicLink();
                }
            }
            catch { }
            let working = { additions: file.workingAdditions || 0, deletions: file.workingDeletions || 0, binary: !!file.binary };
            if (file.untracked && !symlink && size <= LARGE_FILE_BYTES)
                working = await untrackedStatsAsync(workDir, file.path);
            result[index] = {
                ...file,
                workingAdditions: working.additions,
                workingDeletions: working.deletions,
                additions: file.untracked ? working.additions : file.additions,
                deletions: file.untracked ? working.deletions : file.deletions,
                binary: file.binary || working.binary,
                size,
                large: size > LARGE_FILE_BYTES,
                symlink,
            };
        }
    });
    await Promise.all(workers);
    return result;
}
function gitApiFailure(res, error, fallback, operation = "") {
    const code = String(error?.gitErrorCode || "");
    if (code === "repository_busy")
        return (0, utils_1.sendJson)(res, { success: false, error: error.message, errorCode: code, operation, retryable: true, lease: error.lease ? { operation: error.lease.operation, acquired_at: error.lease.acquired_at, expires_at: error.lease.expires_at } : null }, 423);
    if (code === "state_drift")
        return (0, utils_1.sendJson)(res, { success: false, error: error.message, errorCode: code, retryable: true, expected: error.expected || "", actual: error.actual || "" }, 409);
    return (0, utils_1.sendJson)(res, { success: false, error: `${fallback}: ${(0, git_workspace_runtime_1.sanitizeGitDiagnostic)(error?.stderr || error?.message || error)}` }, 400);
}
function handleGitApi(pathname, req, res, parsed) {
    if (pathname === "/api/git/status" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const resolved = projectWorkDir(project);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        void (async () => {
            try {
                const cursor = parseStatusCursor(parsed.query.cursor);
                const limit = Math.min(500, Math.max(1, Number(parsed.query.limit || 200)));
                const entry = await buildGitStatusSnapshot(project, resolved.workDir, cursor?.checksum || "");
                const offset = cursor?.offset || 0;
                const pageFiles = await enrichGitStatusPage(resolved.workDir, entry.files.slice(offset, offset + limit));
                const nextOffset = offset + pageFiles.length;
                const context = parsed.query.include_context === "false"
                    ? { tasks: [], latestTestAgent: null, attribution: "pending" }
                    : await buildChangeContextAsync(project, resolved.workDir, entry.files.filter(file => !file.indexResidual).map(file => file.path));
                const repository = {
                    ...(await inspectGitRemoteStateAsync(resolved.workDir, entry.files.length)),
                    changedFiles: entry.summary.total,
                    indexResidualFiles: entry.summary.indexResidual,
                    identityChecksum: entry.snapshot.repository.checksum,
                };
                (0, utils_1.sendJson)(res, {
                    success: true,
                    branch: entry.snapshot.repository.branch,
                    files: pageFiles,
                    total: entry.summary.total,
                    rawTotal: entry.files.length,
                    summary: entry.summary,
                    context,
                    repository,
                    workspace_snapshot_checksum: entry.snapshot.checksum,
                    snapshot: { checksum: entry.snapshot.checksum, captured_at: entry.snapshot.captured_at, status_checksum: entry.snapshot.status_checksum },
                    cursor: cursor ? String(parsed.query.cursor || "") : "",
                    next_cursor: nextOffset < entry.files.length ? statusCursor(entry.snapshot.checksum, nextOffset) : "",
                    truncated: nextOffset < entry.files.length,
                    page_size: pageFiles.length,
                });
            }
            catch (error) {
                gitApiFailure(res, error, "无法读取 Git 工作区");
            }
        })();
        return true;
    }
    if (pathname === "/api/git/context" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        const resolved = projectWorkDir(project);
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        void (async () => {
            try {
                const entry = await buildGitStatusSnapshot(project, resolved.workDir, String(parsed.query.workspace_snapshot_checksum || ""));
                const context = await buildChangeContextAsync(project, resolved.workDir, entry.files.filter(file => !file.indexResidual).map(file => file.path));
                (0, utils_1.sendJson)(res, { success: true, context, workspace_snapshot_checksum: entry.snapshot.checksum });
            }
            catch (error) {
                gitApiFailure(res, error, "无法读取任务与验收关联");
            }
        })();
        return true;
    }
    if (pathname === "/api/git/index-residuals/cleanup" && req.method === "POST") {
        readBody(req, res, body => {
            const project = String(body.project || "").trim();
            const resolved = projectWorkDir(project);
            if (!project || !Array.isArray(body.files))
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少项目或文件列表" }, 400);
            if (body.confirmed !== true)
                return (0, utils_1.sendJson)(res, { success: false, error: "清理索引残留需要用户明确确认", confirmationRequired: true }, 409);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            void (async () => {
                try {
                    const response = await (0, git_workspace_runtime_1.withGitMutationLease)(resolved.workDir, project, "cleanup_index_residuals", async ({ before }) => {
                        (0, git_workspace_runtime_1.assertExpectedWorkspaceSnapshot)(body.expected_snapshot_checksum, before);
                        const result = await cleanupIndexResidualsAsync(resolved.workDir, body.files);
                        const after = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(resolved.workDir, project);
                        return { result, after, receipt: await (0, git_workspace_runtime_1.buildGitMutationReceipt)({ projectId: project, operation: "cleanup_index_residuals", before, after, files: result.cleaned, actor: body.actor }) };
                    });
                    (0, utils_1.sendJson)(res, { success: true, message: `已清理 ${response.result.cleaned.length} 个暂存区索引残留，本地有效文件未被删除`, cleanedFiles: response.result.cleaned, remaining: response.result.remaining.length, mutation_receipt: response.receipt, workspace_snapshot_checksum: response.after.checksum });
                }
                catch (error) {
                    gitApiFailure(res, error, "清理索引残留失败", "cleanup_index_residuals");
                }
            })();
        });
        return true;
    }
    if (pathname === "/api/git/remote-operation" && req.method === "POST") {
        readBody(req, res, async (body) => {
            const project = String(body.project || "").trim();
            const operation = String(body.operation || "").trim().toLowerCase();
            const resolved = projectWorkDir(project);
            if (!project || !["fetch", "pull", "push"].includes(operation)) {
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少项目或 Git 操作无效" }, 400);
            }
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            if (operation !== "fetch" && body.confirmed !== true) {
                return (0, utils_1.sendJson)(res, { success: false, error: "该操作需要用户明确确认", confirmationRequired: true }, 409);
            }
            try {
                const response = await (0, git_workspace_runtime_1.withGitMutationLease)(resolved.workDir, project, operation, async ({ before }) => {
                    (0, git_workspace_runtime_1.assertExpectedWorkspaceSnapshot)(body.expected_snapshot_checksum, before);
                    const result = await performGitRemoteOperation(resolved.workDir, operation);
                    const after = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(resolved.workDir, project);
                    const receipt = await (0, git_workspace_runtime_1.buildGitMutationReceipt)({ projectId: project, operation, before, after, actor: body.actor, outcome: result.noop ? "no_changes" : "completed" });
                    return { result, after, receipt };
                });
                const result = response.result;
                const message = result.noop
                    ? "当前分支已与远端同步，没有待推送提交"
                    : operation === "fetch"
                        ? "远端引用已拉取"
                        : operation === "pull" ? "本地分支已更新" : "本地提交已推送";
                (0, utils_1.sendJson)(res, { success: true, message, ...result, mutation_receipt: response.receipt, workspace_snapshot_checksum: response.after.checksum });
            }
            catch (error) {
                if (["repository_busy", "state_drift"].includes(String(error?.gitErrorCode || "")))
                    return gitApiFailure(res, error, `${operation}失败`, operation);
                (0, utils_1.sendJson)(res, { success: false, ...gitFailureDetails(error, operation), operation }, 409);
            }
        });
        return true;
    }
    if (pathname === "/api/git/diff" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        const staged = parsed.query.staged === "true";
        const resolved = projectWorkDir(project);
        if (!project || !parsed.query.file)
            return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        void (async () => {
            try {
                const expected = String(parsed.query.workspace_snapshot_checksum || "");
                const snapshot = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(resolved.workDir, project);
                (0, git_workspace_runtime_1.assertExpectedWorkspaceSnapshot)(expected, snapshot);
                const { normalized: filePath } = (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(resolved.workDir, parsed.query.file, { allowLeafSymlink: true });
                const statusLine = (await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, ["-c", "core.quotepath=false", "status", "--porcelain", "--", filePath])).stdout.split("\n")[0] || "";
                const statusCode = statusLine.slice(0, 2);
                let diff = (await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, staged ? ["diff", "--staged", "--", filePath] : ["diff", "--", filePath], { maxOutputBytes: 8 * 1024 * 1024 })).stdout;
                let reason = "";
                let truncated = false;
                if (!staged && !diff.trim() && (statusCode === "??" || statusCode.includes("A"))) {
                    const afterState = await readSafeWorkingFileText(resolved.workDir, filePath);
                    if (afterState.symlink)
                        reason = "符号链接仅展示Git记录，不读取链接目标内容";
                    else if (afterState.binary)
                        reason = "二进制文件无法做文本对比";
                    else if (afterState.exists && !afterState.tooLarge)
                        diff = (0, utils_1.createUnifiedDiff)("", afterState.text, filePath);
                    else if (afterState.tooLarge) {
                        truncated = true;
                        reason = "文件超过4MB安全预览上限，请使用本地IDE查看";
                    }
                }
                const additions = diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++")).length;
                const deletions = diff.split("\n").filter(line => line.startsWith("-") && !line.startsWith("---")).length;
                (0, utils_1.sendJson)(res, { success: true, file: filePath, hunks: parseDiffHunks(diff), raw: diff, reason, truncated, additions, deletions, workspace_snapshot_checksum: snapshot.checksum });
            }
            catch (error) {
                gitApiFailure(res, error, "获取diff失败");
            }
        })();
        return true;
    }
    if (pathname === "/api/git/file" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        const resolved = projectWorkDir(project);
        if (!project || !parsed.query.file)
            return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        void (async () => {
            try {
                const { normalized: filePath } = (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(resolved.workDir, parsed.query.file, { allowLeafSymlink: true });
                const state = await readSafeWorkingFileText(resolved.workDir, filePath);
                return (0, utils_1.sendJson)(res, { success: true, project, file: filePath, exists: !!state.exists, binary: !!state.binary, symlink: !!state.symlink, text: state.binary || state.symlink ? "" : state.text || "", truncated: !!(state.truncated || state.tooLarge), size: state.size || 0 });
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
            }
        })();
        return true;
    }
    if (pathname === "/api/git/commit-preview" && req.method === "POST") {
        readBody(req, res, body => {
            const project = String(body.project || "");
            const resolved = projectWorkDir(project);
            if (!project || !Array.isArray(body.files))
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少项目或文件列表" }, 400);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            void (async () => {
                try {
                    const preview = await commitPreviewAsync(resolved.workDir, body.files, project);
                    (0, utils_1.sendJson)(res, { success: true, preview, workspace_snapshot_checksum: preview.workspace_snapshot_checksum });
                }
                catch (error) {
                    gitApiFailure(res, error, "提交预检失败");
                }
            })();
        });
        return true;
    }
    if (pathname === "/api/git/commit" && req.method === "POST") {
        readBody(req, res, async (body) => {
            const project = String(body.project || "");
            const message = String(body.message || "").trim();
            const action = String(body.action || "commit").trim().toLowerCase();
            const resolved = projectWorkDir(project);
            if (!project || !message)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少项目或提交信息" }, 400);
            if (!["commit", "commit_and_push"].includes(action))
                return (0, utils_1.sendJson)(res, { success: false, error: "不支持的提交操作" }, 400);
            if (message.length > 300)
                return (0, utils_1.sendJson)(res, { success: false, error: "提交信息不能超过 300 个字符" }, 400);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            try {
                const requested = Array.isArray(body.files) ? Array.from(new Set(body.files.map(normalizeRepoPath).filter(Boolean))) : [];
                const allRequested = body.all_files === true || body.allFiles === true;
                const allFiles = allRequested && body.confirmed === true;
                if (allRequested && (!allFiles || req.ccmAuth?.kind !== "browser" || req.ccmAuth?.role !== "admin")) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "提交全部文件仅允许管理员在页面明确确认后执行", confirmationRequired: true, errorCode: "all_files_authorization_required" }, 403);
                }
                if (!requested.length && !allFiles)
                    return (0, utils_1.sendJson)(res, { success: false, error: "请明确选择本次要提交的文件" }, 400);
                const response = await (0, git_workspace_runtime_1.withGitMutationLease)(resolved.workDir, project, action, async ({ before }) => {
                    (0, git_workspace_runtime_1.assertExpectedWorkspaceSnapshot)(body.expected_snapshot_checksum || body.workspace_snapshot_checksum, before);
                    if (action === "commit_and_push") {
                        const preflight = await inspectGitRemoteStateAsync(resolved.workDir);
                        if (!preflight.remoteUrl) {
                            const error = new Error("当前项目没有配置 origin 远端仓库");
                            error.gitErrorCode = "remote_missing";
                            throw error;
                        }
                        if (preflight.detached) {
                            const error = new Error("当前处于 detached HEAD，不能提交并推送");
                            error.gitErrorCode = "detached_head";
                            throw error;
                        }
                    }
                    const committed = await commitSelectedChangesAsync(resolved.workDir, message, requested, allFiles, project);
                    let push = null;
                    let outcome = committed.noop ? "no_changes" : "committed";
                    let partialSuccess = false;
                    if (!committed.noop && action === "commit_and_push") {
                        try {
                            push = { success: true, ...(await performGitRemoteOperation(resolved.workDir, "push")) };
                            outcome = "committed_and_pushed";
                        }
                        catch (pushError) {
                            push = { success: false, ...gitFailureDetails(pushError, "push") };
                            outcome = "committed_push_failed";
                            partialSuccess = true;
                        }
                    }
                    const after = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(resolved.workDir, project);
                    const receipt = await (0, git_workspace_runtime_1.buildGitMutationReceipt)({ projectId: project, operation: action, before, after, files: committed.files, actor: req.ccmAuth?.kind === "browser" ? `user:${req.ccmAuth.userId || ""}` : `internal:${req.ccmAuth?.caller || "unknown"}`, outcome });
                    return { committed, push, outcome, partialSuccess, after, receipt };
                });
                const { committed, push, outcome, partialSuccess, after, receipt } = response;
                const hash = committed.hash;
                const messageText = outcome === "no_changes" ? "所选文件同步后没有可提交内容，变更状态已刷新"
                    : outcome === "committed" ? "代码已提交到本地仓库"
                        : outcome === "committed_and_pushed" ? "代码已提交并推送到远端"
                            : `本地提交 ${hash} 已创建，但推送失败`;
                (0, utils_1.sendJson)(res, {
                    success: true, action, outcome, partialSuccess, message: messageText,
                    commit: committed.noop ? { success: false, noop: true, hash: "" } : { success: true, hash, fullHash: committed.fullHash, blobs: committed.blobs },
                    push, hash, committedFiles: committed.files, committedAllFiles: allFiles,
                    verification: body.verification || "not_recorded",
                    mutation_receipt: receipt,
                    workspace_snapshot_checksum: after.checksum,
                });
            }
            catch (error) {
                if (["repository_busy", "state_drift"].includes(String(error?.gitErrorCode || "")))
                    return gitApiFailure(res, error, "提交失败", action);
                if (["remote_missing", "detached_head"].includes(String(error?.gitErrorCode || "")))
                    return (0, utils_1.sendJson)(res, { success: false, error: error.message, errorCode: error.gitErrorCode }, 409);
                const preview = error?.preview;
                (0, utils_1.sendJson)(res, { success: false, error: "提交失败: " + (0, git_workspace_runtime_1.sanitizeGitDiagnostic)(error?.stderr || error?.message), ...(preview ? { preview } : {}) }, preview ? 409 : 400);
            }
        });
        return true;
    }
    if (pathname === "/api/git/rollback" && req.method === "POST") {
        readBody(req, res, body => {
            const project = String(body.project || "");
            const resolved = projectWorkDir(project);
            if (!project || !body.file)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少参数" }, 400);
            if (body.confirmed !== true)
                return (0, utils_1.sendJson)(res, { success: false, error: "丢弃或取消暂存需要用户明确确认", confirmationRequired: true }, 409);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            void (async () => {
                try {
                    const operation = body.staged ? "unstage" : "discard";
                    const response = await (0, git_workspace_runtime_1.withGitMutationLease)(resolved.workDir, project, operation, async ({ before }) => {
                        (0, git_workspace_runtime_1.assertExpectedWorkspaceSnapshot)(body.expected_snapshot_checksum, before);
                        const { normalized: filePath } = (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(resolved.workDir, body.file, { allowLeafSymlink: true });
                        const status = (await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, ["-c", "core.quotepath=false", "status", "--porcelain", "--", filePath])).stdout.slice(0, 2);
                        if (status === "??") {
                            const error = new Error("未跟踪文件不会自动删除，请确认内容后在文件系统中处理");
                            error.gitErrorCode = "untracked_delete_denied";
                            throw error;
                        }
                        await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, body.staged ? ["restore", "--staged", "--", filePath] : ["restore", "--worktree", "--", filePath]);
                        const after = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(resolved.workDir, project);
                        return { after, receipt: await (0, git_workspace_runtime_1.buildGitMutationReceipt)({ projectId: project, operation, before, after, files: [filePath], actor: body.actor }) };
                    });
                    (0, utils_1.sendJson)(res, { success: true, message: body.staged ? "已取消暂存" : "已丢弃工作区改动", action: body.staged ? "unstage" : "discard", mutation_receipt: response.receipt, workspace_snapshot_checksum: response.after.checksum });
                }
                catch (error) {
                    if (error?.gitErrorCode === "untracked_delete_denied")
                        return (0, utils_1.sendJson)(res, { success: false, error: error.message }, 409);
                    gitApiFailure(res, error, "操作失败", body.staged ? "unstage" : "discard");
                }
            })();
        });
        return true;
    }
    if (pathname === "/api/git/log" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        const resolved = projectWorkDir(project);
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        void (async () => {
            try {
                const limit = Math.min(Math.max(Number(parsed.query.limit || 20), 1), 100);
                const log = (await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, ["log", "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%s", "-n", String(limit)])).stdout;
                const commits = log.split("\n").filter(Boolean).map(line => {
                    const [hash, shortHash, author, email, timestamp, message] = line.split("\x1f");
                    return { hash, shortHash, author, email, timestamp: new Date(Number(timestamp) * 1000).toISOString(), message };
                });
                (0, utils_1.sendJson)(res, { success: true, commits });
            }
            catch (error) {
                gitApiFailure(res, error, "获取提交历史失败");
            }
        })();
        return true;
    }
    if (pathname === "/api/git/apply-patch" && req.method === "POST") {
        readBody(req, res, body => {
            const project = String(body.project || "");
            const patchText = String(body.patchText || "");
            const resolved = projectWorkDir(project);
            if (!project || !patchText)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少参数" }, 400);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            void (async () => {
                try {
                    const patchPaths = validatePatchPaths(patchText);
                    patchPaths.forEach(file => (0, git_workspace_runtime_1.resolveSafeRepositoryPath)(resolved.workDir, file, { allowLeafSymlink: false }));
                    if (body.file && !patchPaths.includes(normalizeRepoPath(body.file)))
                        throw new Error("Patch 与当前文件不一致");
                    const response = await (0, git_workspace_runtime_1.withGitMutationLease)(resolved.workDir, project, "apply_patch", async ({ before }) => {
                        (0, git_workspace_runtime_1.assertExpectedWorkspaceSnapshot)(body.expected_snapshot_checksum, before);
                        const args = ["apply", "--recount", "--whitespace=nowarn"];
                        if (body.cached)
                            args.push("--cached");
                        if (body.revert)
                            args.push("-R");
                        await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, [...args, "--check"], { input: patchText, maxOutputBytes: 4 * 1024 * 1024 });
                        await (0, git_workspace_runtime_1.runGitCommand)(resolved.workDir, args, { input: patchText, maxOutputBytes: 4 * 1024 * 1024 });
                        const after = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(resolved.workDir, project);
                        return { after, receipt: await (0, git_workspace_runtime_1.buildGitMutationReceipt)({ projectId: project, operation: "apply_patch", before, after, files: patchPaths, actor: body.actor }) };
                    });
                    (0, utils_1.sendJson)(res, { success: true, message: "Patch 已通过检查并应用", checked: true, files: patchPaths, mutation_receipt: response.receipt, workspace_snapshot_checksum: response.after.checksum });
                }
                catch (error) {
                    gitApiFailure(res, error, "应用Patch失败", "apply_patch");
                }
            })();
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=git.js.map