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
const MAX_PATCH_BYTES = 2 * 1024 * 1024;
const LARGE_FILE_BYTES = 1024 * 1024;
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
        .replace(/[\0\r]+/g, " ")
        .trim()
        .slice(0, 2_000);
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
    let ahead = 0;
    let behind = 0;
    if (upstream) {
        const counts = tryGit(workDir, ["rev-list", "--left-right", "--count", `HEAD...${upstream}`]);
        const match = counts.output.match(/^(\d+)\s+(\d+)$/);
        if (counts.ok && match) {
            ahead = Number(match[1]);
            behind = Number(match[2]);
        }
    }
    const changed = changedFiles >= 0
        ? changedFiles
        : String(tryGit(workDir, ["status", "--porcelain=v1", "--untracked-files=normal"]).output || "").split(/\r?\n/).filter(Boolean).length;
    const detached = !branch;
    return {
        remoteUrl,
        remoteName: remoteUrl ? "origin" : "",
        branch: branch || "detached HEAD",
        detached,
        upstream,
        ahead,
        behind,
        dirty: changed > 0,
        changedFiles: changed,
        canFetch: !!remoteUrl,
        canPull: !!remoteUrl && !detached && changed === 0,
        canPush: !!remoteUrl && !detached,
    };
}
function performGitRemoteOperation(workDir, operation) {
    const before = inspectGitRemoteState(workDir);
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
    else if (operation === "push")
        args = before.upstream
            ? ["push"]
            : ["push", "--set-upstream", "origin", before.branch];
    else
        throw new Error("不支持的 Git 远端操作");
    const output = String(runGit(workDir, args, { timeout: 90_000 }) || "").trim();
    return {
        operation,
        output: output.slice(-4_000),
        repository: inspectGitRemoteState(workDir),
    };
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
    return String(filePath || "").trim().replace(/\\/g, "/");
}
function resolveSafeProjectFile(workDir, filePath) {
    const normalized = normalizeRepoPath(filePath);
    if (!normalized || normalized.includes("\0") || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
        throw new Error("非法文件路径");
    }
    const root = path.resolve(workDir);
    const absolute = path.resolve(root, normalized);
    if (absolute !== root && !absolute.startsWith(root + path.sep))
        throw new Error("文件不在项目目录内");
    return { normalized, absolute };
}
function currentRenamePath(rawPath) {
    const value = rawPath.trim();
    const arrow = value.lastIndexOf(" -> ");
    return arrow >= 0 ? value.slice(arrow + 4).trim() : value;
}
function statusPresentation(indexStatus, worktreeStatus) {
    const combined = `${indexStatus}${worktreeStatus}`;
    if (combined === "??")
        return { statusText: "未跟踪", statusColor: "#0f766e" };
    if (/U|AA|DD/.test(combined))
        return { statusText: "冲突", statusColor: "#dc2626" };
    if (combined.includes("R"))
        return { statusText: "重命名", statusColor: "#7c3aed" };
    if (combined.includes("D"))
        return { statusText: "已删除", statusColor: "#dc2626" };
    if (combined.includes("A"))
        return { statusText: "新增", statusColor: "#059669" };
    if (combined.includes("C"))
        return { statusText: "已复制", statusColor: "#7c3aed" };
    return { statusText: "已修改", statusColor: "#2563eb" };
}
function parseGitStatus(output) {
    return String(output || "").split("\n").filter(Boolean).map(line => {
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
    String(output || "").split("\n").filter(Boolean).forEach(line => {
        const [addRaw, deleteRaw, ...pathParts] = line.split("\t");
        const filePath = pathParts.join("\t").trim();
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
function buildGitStatusSummary(files) {
    const summary = files.reduce((acc, file) => {
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
    }, { total: 0, staged: 0, unstaged: 0, untracked: 0, conflicts: 0, binary: 0, largeFiles: 0, additions: 0, deletions: 0, modules: [] });
    const warnings = [];
    if (summary.conflicts)
        warnings.push(`${summary.conflicts} 个冲突文件会阻止提交`);
    if (summary.untracked)
        warnings.push(`${summary.untracked} 个未跟踪文件需要确认`);
    if (summary.largeFiles)
        warnings.push(`${summary.largeFiles} 个大文件需要检查`);
    if (summary.binary)
        warnings.push(`${summary.binary} 个二进制文件无法逐行预览`);
    return { ...summary, modules: summary.modules.slice(0, 8), riskLevel: summary.conflicts ? "high" : warnings.length ? "medium" : "low", warnings };
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
    const allFiles = parseGitStatus(runGit(workDir, ["-c", "core.quotepath=false", "status", "--porcelain"]));
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
function handleGitApi(pathname, req, res, parsed) {
    if (pathname === "/api/git/status" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const resolved = projectWorkDir(project);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        const { workDir } = resolved;
        try {
            runGit(workDir, ["rev-parse", "--is-inside-work-tree"]);
            const files = parseGitStatus(runGit(workDir, ["-c", "core.quotepath=false", "status", "--porcelain"]));
            const stagedStats = parseNumstat(runGit(workDir, ["-c", "core.quotepath=false", "diff", "--staged", "--numstat"]));
            const workingStats = parseNumstat(runGit(workDir, ["-c", "core.quotepath=false", "diff", "--numstat"]));
            const enriched = files.map(file => {
                const safe = resolveSafeProjectFile(workDir, file.path);
                const staged = stagedStats.get(normalizeRepoPath(file.path)) || { additions: 0, deletions: 0, binary: false };
                const working = file.untracked ? untrackedStats(workDir, file.path) : (workingStats.get(normalizeRepoPath(file.path)) || { additions: 0, deletions: 0, binary: false });
                let size = 0;
                try {
                    size = fs.existsSync(safe.absolute) ? fs.statSync(safe.absolute).size : 0;
                }
                catch { }
                return {
                    ...file,
                    stagedAdditions: staged.additions,
                    stagedDeletions: staged.deletions,
                    workingAdditions: working.additions,
                    workingDeletions: working.deletions,
                    additions: staged.additions + working.additions,
                    deletions: staged.deletions + working.deletions,
                    binary: staged.binary || working.binary,
                    size,
                    large: size > LARGE_FILE_BYTES,
                };
            });
            const branch = runGit(workDir, ["branch", "--show-current"]).trim() || "detached HEAD";
            const summary = buildGitStatusSummary(enriched);
            const context = buildChangeContext(project, workDir, enriched.map(file => file.path));
            const repository = inspectGitRemoteState(workDir, enriched.length);
            (0, utils_1.sendJson)(res, { success: true, branch, files: enriched, total: enriched.length, summary, context, repository });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: "无法读取 Git 工作区: " + (error.stderr || error.message) });
        }
        return true;
    }
    if (pathname === "/api/git/remote-operation" && req.method === "POST") {
        readBody(req, res, body => {
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
                runGit(resolved.workDir, ["rev-parse", "--is-inside-work-tree"]);
                const result = performGitRemoteOperation(resolved.workDir, operation);
                const message = operation === "fetch"
                    ? "远端引用已拉取"
                    : operation === "pull" ? "本地分支已更新" : "本地提交已推送";
                (0, utils_1.sendJson)(res, { success: true, message, ...result });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: safeGitError(error), operation }, 409);
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
        try {
            const { normalized: filePath } = resolveSafeProjectFile(resolved.workDir, parsed.query.file);
            const statusLine = fileStatus(resolved.workDir, filePath);
            const statusCode = statusLine.slice(0, 2);
            let diff = runGit(resolved.workDir, staged ? ["diff", "--staged", "--", filePath] : ["diff", "--", filePath]);
            let reason = "";
            let truncated = false;
            if (!staged && !diff.trim() && (statusCode === "??" || statusCode.includes("A"))) {
                const afterState = (0, utils_1.readWorkingFileText)(resolved.workDir, filePath);
                if (afterState.binary)
                    reason = "二进制文件无法做文本对比";
                else if (afterState.exists) {
                    diff = (0, utils_1.createUnifiedDiff)("", afterState.text, filePath);
                    truncated = !!(afterState.truncated || afterState.tooLarge);
                    if (truncated)
                        reason = "文件过大，仅展示前半部分内容";
                }
            }
            const additions = diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++")).length;
            const deletions = diff.split("\n").filter(line => line.startsWith("-") && !line.startsWith("---")).length;
            (0, utils_1.sendJson)(res, { success: true, file: filePath, hunks: parseDiffHunks(diff), raw: diff, reason, truncated, additions, deletions });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: "获取 diff 失败: " + (error.stderr || error.message) });
        }
        return true;
    }
    if (pathname === "/api/git/file" && req.method === "GET") {
        const project = String(parsed.query.project || "");
        const resolved = projectWorkDir(project);
        if (!project || !parsed.query.file)
            return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
        if ("error" in resolved)
            return (0, utils_1.sendJson)(res, { error: resolved.error }, resolved.status);
        try {
            const { normalized: filePath } = resolveSafeProjectFile(resolved.workDir, parsed.query.file);
            const state = (0, utils_1.readWorkingFileText)(resolved.workDir, filePath);
            return (0, utils_1.sendJson)(res, { success: true, project, file: filePath, exists: !!state.exists, binary: !!state.binary, text: state.binary ? "" : state.text || "", truncated: !!(state.truncated || state.tooLarge), size: state.size || 0 });
        }
        catch (error) {
            return (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
        }
    }
    if (pathname === "/api/git/commit-preview" && req.method === "POST") {
        readBody(req, res, body => {
            const project = String(body.project || "");
            const resolved = projectWorkDir(project);
            if (!project || !Array.isArray(body.files))
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少项目或文件列表" }, 400);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            try {
                (0, utils_1.sendJson)(res, { success: true, preview: commitPreview(resolved.workDir, body.files) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: "提交预检失败: " + error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/git/commit" && req.method === "POST") {
        readBody(req, res, body => {
            const project = String(body.project || "");
            const message = String(body.message || "").trim();
            const resolved = projectWorkDir(project);
            if (!project || !message)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少项目或提交信息" }, 400);
            if (message.length > 300)
                return (0, utils_1.sendJson)(res, { success: false, error: "提交信息不能超过 300 个字符" }, 400);
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            try {
                const requested = Array.isArray(body.files) ? Array.from(new Set(body.files.map(normalizeRepoPath).filter(Boolean))) : [];
                if (requested.length) {
                    const preview = commitPreview(resolved.workDir, requested);
                    if (preview.blocked)
                        return (0, utils_1.sendJson)(res, { success: false, error: preview.conflicts.length ? "存在冲突文件，不能提交" : "所选文件已变化，请刷新后重试", preview }, 409);
                    runGit(resolved.workDir, ["add", "-A", "--", ...requested]);
                    runGit(resolved.workDir, ["commit", "--only", "-m", message, "--", ...requested]);
                }
                else {
                    runGit(resolved.workDir, ["add", "-A"]);
                    runGit(resolved.workDir, ["commit", "-m", message]);
                }
                const hash = runGit(resolved.workDir, ["rev-parse", "--short", "HEAD"]).trim();
                (0, utils_1.sendJson)(res, { success: true, message: "提交成功", hash, committedFiles: requested, verification: body.verification || "not_recorded" });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: "提交失败: " + String(error.stderr || error.message).trim() });
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
            if ("error" in resolved)
                return (0, utils_1.sendJson)(res, { success: false, error: resolved.error }, resolved.status);
            try {
                const { normalized: filePath } = resolveSafeProjectFile(resolved.workDir, body.file);
                const status = fileStatus(resolved.workDir, filePath).slice(0, 2);
                if (status === "??")
                    return (0, utils_1.sendJson)(res, { success: false, error: "未跟踪文件不会自动删除，请确认内容后在文件系统中处理" }, 409);
                if (body.staged)
                    runGit(resolved.workDir, ["restore", "--staged", "--", filePath]);
                else
                    runGit(resolved.workDir, ["restore", "--worktree", "--", filePath]);
                (0, utils_1.sendJson)(res, { success: true, message: body.staged ? "已取消暂存" : "已丢弃工作区改动", action: body.staged ? "unstage" : "discard" });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: "操作失败: " + String(error.stderr || error.message).trim() });
            }
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
        try {
            const limit = Math.min(Math.max(Number(parsed.query.limit || 20), 1), 100);
            const log = runGit(resolved.workDir, ["log", "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%s", "-n", String(limit)]);
            const commits = log.split("\n").filter(Boolean).map(line => {
                const [hash, shortHash, author, email, timestamp, message] = line.split("\x1f");
                return { hash, shortHash, author, email, timestamp: new Date(Number(timestamp) * 1000).toISOString(), message };
            });
            (0, utils_1.sendJson)(res, { success: true, commits });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: "获取提交历史失败: " + error.message });
        }
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
            try {
                const patchPaths = validatePatchPaths(patchText);
                patchPaths.forEach(file => resolveSafeProjectFile(resolved.workDir, file));
                if (body.file && !patchPaths.includes(normalizeRepoPath(body.file)))
                    throw new Error("Patch 与当前文件不一致");
                const args = ["apply", "--recount", "--whitespace=nowarn"];
                if (body.cached)
                    args.push("--cached");
                if (body.revert)
                    args.push("-R");
                runGit(resolved.workDir, [...args, "--check"], { input: patchText });
                runGit(resolved.workDir, args, { input: patchText });
                (0, utils_1.sendJson)(res, { success: true, message: "Patch 已通过检查并应用", checked: true, files: patchPaths });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: "应用 Patch 失败: " + String(error.stderr || error.message).trim() });
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=git.js.map