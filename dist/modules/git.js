"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGitApi = handleGitApi;
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const db_1 = require("../db");
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
            (0, child_process_1.execSync)("git rev-parse --is-inside-work-tree", { cwd: workDir, stdio: "pipe" });
            // 获取 git 状态
            const status = (0, child_process_1.execFileSync)("git", ["-c", "core.quotepath=false", "status", "--porcelain"], {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            });
            const branch = (0, child_process_1.execSync)("git branch --show-current", {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            }).trim();
            const files = status.split("\n")
                .filter(line => line.trim())
                .map(line => {
                const statusCode = line.substring(0, 2).trim();
                const filePath = line.substring(3).trim();
                let statusText = "";
                let statusColor = "";
                if (statusCode === "M" || statusCode === "MM") {
                    statusText = "已修改";
                    statusColor = "#facc15";
                }
                else if (statusCode === "A") {
                    statusText = "新增";
                    statusColor = "#22c55e";
                }
                else if (statusCode === "D") {
                    statusText = "已删除";
                    statusColor = "#ef4444";
                }
                else if (statusCode === "R") {
                    statusText = "重命名";
                    statusColor = "#a78bfa";
                }
                else if (statusCode === "??") {
                    statusText = "未跟踪";
                    statusColor = "#64748b";
                }
                else {
                    statusText = statusCode;
                    statusColor = "#94a3b8";
                }
                return { path: filePath, status: statusCode, statusText, statusColor };
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
            const diffArgs = staged ? ["diff", "--staged", "--", filePath] : ["diff", "--", filePath];
            const diff = (0, child_process_1.execFileSync)("git", diffArgs, {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"],
                maxBuffer: 10 * 1024 * 1024
            });
            // 解析 diff 为结构化数据
            const lines = diff.split("\n");
            const hunks = [];
            let currentHunk = null;
            for (const line of lines) {
                if (line.startsWith("@@")) {
                    if (currentHunk)
                        hunks.push(currentHunk);
                    const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
                    if (match) {
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
                }
                else if (currentHunk) {
                    if (line.startsWith("+")) {
                        currentHunk.changes.push({ type: "add", content: line.substring(1) });
                    }
                    else if (line.startsWith("-")) {
                        currentHunk.changes.push({ type: "remove", content: line.substring(1) });
                    }
                    else {
                        currentHunk.changes.push({ type: "context", content: line.substring(1) });
                    }
                }
            }
            if (currentHunk)
                hunks.push(currentHunk);
            (0, utils_1.sendJson)(res, { success: true, file: filePath, hunks, raw: diff });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: "获取 diff 失败: " + e.message });
        }
        return true;
    }
    // 3. 提交更改
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
    return false;
}
//# sourceMappingURL=git.js.map