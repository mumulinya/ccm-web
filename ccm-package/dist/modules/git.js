"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGitApi = handleGitApi;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
const db_1 = require("../db");
function parseDiffHunks(diff) {
    const lines = String(diff || "").split("\n");
    const hunks = [];
    let currentHunk = null;
    for (const line of lines) {
        if (line.startsWith("@@")) {
            const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
            if (match) {
                if (currentHunk)
                    hunks.push(currentHunk);
                currentHunk = {
                    header: line,
                    oldStart: parseInt(match[1]),
                    oldLines: parseInt(match[2] || "1"),
                    newStart: parseInt(match[3]),
                    newLines: parseInt(match[4] || "1"),
                    context: match[5]?.trim() || "",
                    changes: []
                };
            }
            else if (currentHunk) {
                currentHunk.changes.push({ type: "context", content: line });
            }
        }
        else if (currentHunk) {
            if (line.startsWith("+") && !line.startsWith("+++")) {
                currentHunk.changes.push({ type: "add", content: line.substring(1) });
            }
            else if (line.startsWith("-") && !line.startsWith("---")) {
                currentHunk.changes.push({ type: "remove", content: line.substring(1) });
            }
            else if (!line.startsWith("---") && !line.startsWith("+++")) {
                currentHunk.changes.push({ type: "context", content: line.startsWith(" ") ? line.substring(1) : line });
            }
        }
    }
    if (currentHunk)
        hunks.push(currentHunk);
    return hunks;
}
function handleGitApi(pathname, req, res, parsed) {
    // 1. 获取项目 Git 状态
    if (pathname === "/api/git/status" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const configs = (0, db_1.getConfigs)();
        const config = configs.find(c => c.name === project);
        if (!config)
            return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
        const info = (0, db_1.getConfigInfo)(config.path);
        const workDir = info[0]?.workDir;
        if (!workDir)
            return (0, utils_1.sendJson)(res, { error: "项目目录不存在" }, 400);
        try {
            // 检查是否是 git 仓库
            (0, child_process_1.execFileSync)("git", ["rev-parse", "--is-inside-work-tree"], { cwd: workDir, stdio: "pipe" });
            // 获取 git 状态
            const status = (0, child_process_1.execFileSync)("git", ["-c", "core.quotepath=false", "status", "--porcelain"], {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            });
            const branch = (0, child_process_1.execFileSync)("git", ["branch", "--show-current"], {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            }).trim();
            const files = status.split("\n")
                .filter(line => line.trim())
                .map(line => {
                const statusCode = line.substring(0, 2);
                const filePath = line.substring(3).trim();
                return { path: filePath, status: statusCode.trim() || statusCode, ...(0, utils_1.describeFileStatus)(statusCode) };
            });
            (0, utils_1.sendJson)(res, { success: true, branch, files, total: files.length });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: "不是 Git 仓库或 Git 未安装: " + e.message });
        }
        return true;
    }
    // 2. 获取文件 diff
    if (pathname === "/api/git/diff" && req.method === "GET") {
        const project = parsed.query.project;
        const filePath = parsed.query.file;
        const staged = parsed.query.staged === "true";
        if (!project || !filePath)
            return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
        const configs = (0, db_1.getConfigs)();
        const config = configs.find(c => c.name === project);
        if (!config)
            return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
        const info = (0, db_1.getConfigInfo)(config.path);
        const workDir = info[0]?.workDir;
        try {
            const statusForFile = (0, child_process_1.execFileSync)("git", ["-c", "core.quotepath=false", "status", "--porcelain", "--", filePath], {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            }).split("\n")[0] || "";
            const statusCode = statusForFile.substring(0, 2);
            const diffArgs = staged ? ["diff", "--staged", "--", filePath] : ["diff", "--", filePath];
            let diff = (0, child_process_1.execFileSync)("git", diffArgs, {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"],
                maxBuffer: 10 * 1024 * 1024
            });
            let reason = "";
            let truncated = false;
            if (!staged && !diff.trim() && (statusCode === "??" || statusCode.includes("A"))) {
                const afterState = (0, utils_1.readWorkingFileText)(workDir, filePath);
                if (afterState.binary) {
                    reason = "二进制文件无法做文本对比";
                }
                else if (afterState.exists) {
                    diff = (0, utils_1.createUnifiedDiff)("", afterState.text, filePath);
                    truncated = !!(afterState.truncated || afterState.tooLarge);
                    if (truncated)
                        reason = "文件过大，仅展示前半部分内容";
                }
            }
            // 解析 diff 为结构化数据
            const hunks = parseDiffHunks(diff);
            (0, utils_1.sendJson)(res, { success: true, file: filePath, hunks, raw: diff, reason, truncated });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: "获取 diff 失败: " + e.message });
        }
        return true;
    }
    // 3. 读取当前完整文件内容（用于聊天里的代码改动抽屉）
    if (pathname === "/api/git/file" && req.method === "GET") {
        const project = parsed.query.project;
        const filePath = parsed.query.file;
        if (!project || !filePath)
            return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
        if (path_1.default.isAbsolute(filePath) || String(filePath).split(/[\\/]+/).includes("..")) {
            return (0, utils_1.sendJson)(res, { error: "非法文件路径" }, 400);
        }
        const configs = (0, db_1.getConfigs)();
        const config = configs.find(c => c.name === project);
        if (!config)
            return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
        const info = (0, db_1.getConfigInfo)(config.path);
        const workDir = info[0]?.workDir;
        if (!workDir)
            return (0, utils_1.sendJson)(res, { error: "项目目录不存在" }, 400);
        const root = path_1.default.resolve(workDir);
        const absPath = path_1.default.resolve(root, filePath);
        if (absPath !== root && !absPath.startsWith(root + path_1.default.sep)) {
            return (0, utils_1.sendJson)(res, { error: "文件不在项目目录内" }, 400);
        }
        const state = (0, utils_1.readWorkingFileText)(workDir, filePath);
        return (0, utils_1.sendJson)(res, {
            success: true,
            project,
            file: filePath,
            exists: !!state.exists,
            binary: !!state.binary,
            text: state.binary ? "" : (state.text || ""),
            truncated: !!(state.truncated || state.tooLarge),
            size: state.size || 0
        });
    }
    // 4. 提交更改
    if (pathname === "/api/git/commit" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, message, files } = JSON.parse(body);
                if (!project || !message)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                // 添加文件到暂存区
                if (files && files.length > 0) {
                    for (const file of files) {
                        (0, child_process_1.execFileSync)("git", ["add", "--", file], { cwd: workDir, stdio: "pipe" });
                    }
                }
                else {
                    (0, child_process_1.execFileSync)("git", ["add", "-A"], { cwd: workDir, stdio: "pipe" });
                }
                // 提交
                (0, child_process_1.execFileSync)("git", ["commit", "-m", message], {
                    encoding: "utf-8",
                    cwd: workDir,
                    stdio: ["pipe", "pipe", "pipe"]
                });
                (0, utils_1.sendJson)(res, { success: true, message: "提交成功" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: "提交失败: " + e.message });
            }
        });
        return true;
    }
    // 4. 回滚更改
    if (pathname === "/api/git/rollback" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, file, staged } = JSON.parse(body);
                if (!project || !file)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                if (staged) {
                    // 取消暂存
                    (0, child_process_1.execFileSync)("git", ["restore", "--staged", "--", file], { cwd: workDir, stdio: "pipe" });
                }
                else {
                    // 回滚工作区更改
                    (0, child_process_1.execFileSync)("git", ["restore", "--", file], { cwd: workDir, stdio: "pipe" });
                }
                (0, utils_1.sendJson)(res, { success: true, message: "回滚成功" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: "回滚失败: " + e.message });
            }
        });
        return true;
    }
    // 5. 获取提交历史
    if (pathname === "/api/git/log" && req.method === "GET") {
        const project = parsed.query.project;
        const limit = parseInt(parsed.query.limit) || 20;
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const configs = (0, db_1.getConfigs)();
        const config = configs.find(c => c.name === project);
        if (!config)
            return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
        const info = (0, db_1.getConfigInfo)(config.path);
        const workDir = info[0]?.workDir;
        try {
            const log = (0, child_process_1.execFileSync)("git", ["log", "--pretty=format:%H|%h|%an|%ae|%at|%s", "-n", String(limit)], { encoding: "utf-8", cwd: workDir, stdio: ["pipe", "pipe", "pipe"] });
            const commits = log.split("\n")
                .filter(line => line.trim())
                .map(line => {
                const [hash, shortHash, author, email, timestamp, message] = line.split("|");
                return {
                    hash,
                    shortHash,
                    author,
                    email,
                    timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
                    message
                };
            });
            (0, utils_1.sendJson)(res, { success: true, commits });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: "获取提交历史失败: " + e.message });
        }
        return true;
    }
    // 6. 应用局部 patch (Hunk Stage / Rollback)
    if (pathname === "/api/git/apply-patch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, patchText, revert, cached } = JSON.parse(body);
                if (!project || !patchText)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 404);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                if (!workDir)
                    return (0, utils_1.sendJson)(res, { error: "项目目录不存在" }, 400);
                // 创建临时文件写入 patch 内容
                const fs = require("fs");
                const path = require("path");
                const tempPatchDir = path.join(workDir, ".cc-temp-patches");
                if (!fs.existsSync(tempPatchDir)) {
                    fs.mkdirSync(tempPatchDir, { recursive: true });
                }
                const patchFile = path.join(tempPatchDir, `patch_${Date.now()}.patch`);
                fs.writeFileSync(patchFile, patchText, "utf-8");
                try {
                    const args = ["apply", "--recount"];
                    if (cached)
                        args.push("--cached");
                    if (revert)
                        args.push("-R");
                    args.push(patchFile);
                    (0, child_process_1.execFileSync)("git", args, { cwd: workDir, stdio: "pipe" });
                    (0, utils_1.sendJson)(res, { success: true, message: "应用 Patch 成功" });
                }
                catch (err) {
                    (0, utils_1.sendJson)(res, { success: false, error: "应用 Patch 失败: " + (err.stderr || err.message) });
                }
                finally {
                    // 清理临时文件
                    try {
                        if (fs.existsSync(patchFile))
                            fs.unlinkSync(patchFile);
                    }
                    catch { }
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: "系统错误: " + e.message });
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=git.js.map