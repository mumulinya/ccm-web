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
exports.normalizeGitHubRepositoryUrl = normalizeGitHubRepositoryUrl;
exports.githubWebUrl = githubWebUrl;
exports.sanitizeGitRemoteUrl = sanitizeGitRemoteUrl;
exports.normalizeGitBranch = normalizeGitBranch;
exports.inspectProjectGit = inspectProjectGit;
exports.cloneGitHubRepository = cloneGitHubRepository;
exports.configureProjectRepository = configureProjectRepository;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const GIT_OUTPUT_LIMIT = 16_000;
function commandExists(command) {
    try {
        const result = process.platform === "win32"
            ? (0, child_process_1.spawnSync)("where.exe", [command], { windowsHide: true, stdio: "ignore" })
            : (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
        return result.status === 0;
    }
    catch {
        return false;
    }
}
function runGit(cwd, args, timeout = 10_000) {
    const result = (0, child_process_1.spawnSync)("git", args, {
        cwd,
        windowsHide: true,
        encoding: "utf-8",
        timeout,
        maxBuffer: 1024 * 1024,
    });
    return {
        ok: result.status === 0 && !result.error,
        stdout: String(result.stdout || "").trim(),
        stderr: String(result.stderr || "").trim(),
        error: result.error?.message || "",
    };
}
function normalizeGitHubRepositoryUrl(value) {
    const raw = String(value || "").trim();
    if (!raw)
        throw new Error("GitHub 仓库地址不能为空");
    const ssh = raw.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/i);
    if (ssh)
        return `git@github.com:${ssh[1]}/${ssh[2]}.git`;
    let parsed;
    try {
        parsed = new URL(raw);
    }
    catch {
        throw new Error("GitHub 仓库地址格式无效");
    }
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
        throw new Error("仅支持 github.com 的 HTTPS 或 SSH 仓库地址");
    }
    if (parsed.username || parsed.password)
        throw new Error("仓库地址不能包含账号、Token 或密码");
    if (parsed.search || parsed.hash)
        throw new Error("仓库地址不能包含查询参数或片段");
    const parts = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (parts.length !== 2)
        throw new Error("GitHub 仓库地址必须是 owner/repository 格式");
    const owner = parts[0];
    const repository = parts[1].replace(/\.git$/i, "");
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) {
        throw new Error("GitHub owner 或仓库名称格式无效");
    }
    return `https://github.com/${owner}/${repository}.git`;
}
function githubWebUrl(value) {
    const normalized = normalizeGitHubRepositoryUrl(value);
    const ssh = normalized.match(/^git@github\.com:([^/]+)\/(.+)\.git$/i);
    return ssh
        ? `https://github.com/${ssh[1]}/${ssh[2]}`
        : normalized.replace(/\.git$/i, "");
}
function sanitizeGitRemoteUrl(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    try {
        const parsed = new URL(raw);
        if (parsed.username || parsed.password) {
            parsed.username = "";
            parsed.password = "";
        }
        return parsed.toString();
    }
    catch {
        return raw.replace(/^(https?:\/\/)[^/@\s]+@/i, "$1");
    }
}
function normalizeGitBranch(value) {
    const branch = String(value || "").trim();
    if (!branch)
        return "";
    if (branch.length > 200
        || branch.startsWith("-")
        || branch.endsWith(".")
        || branch.endsWith("/")
        || branch.endsWith(".lock")
        || branch.includes("..")
        || branch.includes("@{")
        || /\s/.test(branch)
        || ["~", "^", ":", "?", "*", "[", "]", "\\"].some(character => branch.includes(character))) {
        throw new Error("Git 分支名称格式无效");
    }
    return branch;
}
function validateCloneDestination(value) {
    const destination = String(value || "").trim();
    if (!destination || !path.isAbsolute(destination))
        throw new Error("克隆目标必须是绝对路径");
    const resolved = path.resolve(destination);
    const parent = path.dirname(resolved);
    if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory())
        throw new Error("克隆目标的上级目录不存在");
    if (fs.existsSync(resolved)) {
        if (!fs.statSync(resolved).isDirectory())
            throw new Error("克隆目标不是文件夹");
        if (fs.readdirSync(resolved).length > 0)
            throw new Error("克隆目标文件夹必须为空");
    }
    return resolved;
}
function inspectProjectGit(workDir) {
    const resolved = path.resolve(String(workDir || ""));
    const gitAvailable = commandExists("git");
    const ghAvailable = commandExists("gh");
    const base = {
        git_available: gitAvailable,
        gh_available: ghAvailable,
        gh_authenticated: false,
        is_repository: false,
        work_dir: resolved,
        remote_url: "",
        remote_web_url: "",
        branch: "",
        upstream: "",
        ahead: 0,
        behind: 0,
        dirty: false,
        changed_files: 0,
        untracked_files: 0,
        last_commit: null,
    };
    if (ghAvailable) {
        const auth = (0, child_process_1.spawnSync)("gh", ["auth", "status", "--hostname", "github.com"], {
            windowsHide: true,
            encoding: "utf-8",
            timeout: 8_000,
        });
        base.gh_authenticated = auth.status === 0;
    }
    if (!gitAvailable || !fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory())
        return base;
    if (!runGit(resolved, ["rev-parse", "--is-inside-work-tree"]).ok)
        return base;
    base.is_repository = true;
    const remote = runGit(resolved, ["remote", "get-url", "origin"]);
    base.remote_url = remote.ok ? sanitizeGitRemoteUrl(remote.stdout) : "";
    try {
        base.remote_web_url = base.remote_url ? githubWebUrl(base.remote_url) : "";
    }
    catch { }
    const branch = runGit(resolved, ["branch", "--show-current"]);
    base.branch = branch.ok ? branch.stdout : "";
    const upstream = runGit(resolved, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
    base.upstream = upstream.ok ? upstream.stdout : "";
    if (base.upstream) {
        const counts = runGit(resolved, ["rev-list", "--left-right", "--count", `HEAD...${base.upstream}`]);
        const match = counts.stdout.match(/^(\d+)\s+(\d+)$/);
        if (counts.ok && match) {
            base.ahead = Number(match[1]);
            base.behind = Number(match[2]);
        }
    }
    const status = runGit(resolved, ["status", "--porcelain=v1", "--untracked-files=normal"]);
    if (status.ok) {
        const lines = status.stdout.split(/\r?\n/).filter(Boolean);
        base.changed_files = lines.length;
        base.untracked_files = lines.filter(line => line.startsWith("??")).length;
        base.dirty = lines.length > 0;
    }
    const commit = runGit(resolved, ["log", "-1", "--format=%H%x09%h%x09%an%x09%aI%x09%s"]);
    if (commit.ok && commit.stdout) {
        const [hash, short_hash, author, authored_at, ...summary] = commit.stdout.split("\t");
        base.last_commit = { hash, short_hash, author, authored_at, summary: summary.join("\t") };
    }
    return base;
}
async function cloneGitHubRepository(input) {
    if (!commandExists("git"))
        throw new Error("未安装 Git，无法克隆 GitHub 仓库");
    const repositoryUrl = normalizeGitHubRepositoryUrl(input.repositoryUrl);
    const destination = validateCloneDestination(input.destination);
    const branch = normalizeGitBranch(input.branch);
    const args = ["clone", "--origin", "origin"];
    if (branch)
        args.push("--branch", branch, "--single-branch");
    args.push("--", repositoryUrl, destination);
    await new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)("git", args, {
            cwd: path.dirname(destination),
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        const append = (chunk) => { output = `${output}${String(chunk || "")}`.slice(-GIT_OUTPUT_LIMIT); };
        child.stdout?.on("data", append);
        child.stderr?.on("data", append);
        const timer = setTimeout(() => {
            try {
                child.kill();
            }
            catch { }
            reject(new Error("GitHub 仓库克隆超时"));
        }, 5 * 60_000);
        child.once("error", error => {
            clearTimeout(timer);
            reject(new Error(`无法启动 git clone：${error.message}`));
        });
        child.once("close", code => {
            clearTimeout(timer);
            if (code === 0)
                resolve();
            else
                reject(new Error(`GitHub 仓库克隆失败：${output.trim() || `退出码 ${code}`}`));
        });
    });
    const status = inspectProjectGit(destination);
    if (!status.is_repository)
        throw new Error("仓库克隆完成，但目标目录未通过 Git 仓库校验");
    return status;
}
function configureProjectRepository(input) {
    if (!commandExists("git"))
        throw new Error("未安装 Git，无法管理项目仓库");
    const workDir = path.resolve(input.workDir);
    let status = inspectProjectGit(workDir);
    if (!status.is_repository && input.initialize === true) {
        const initialized = runGit(workDir, ["init"]);
        if (!initialized.ok)
            throw new Error(`Git 仓库初始化失败：${initialized.stderr || initialized.error}`);
        status = inspectProjectGit(workDir);
    }
    const requestedUrl = String(input.repositoryUrl || "").trim();
    if (requestedUrl) {
        if (!status.is_repository)
            throw new Error("当前目录不是 Git 仓库，请先勾选初始化 Git 仓库");
        const repositoryUrl = normalizeGitHubRepositoryUrl(requestedUrl);
        const current = runGit(workDir, ["remote", "get-url", "origin"]);
        const updated = current.ok
            ? runGit(workDir, ["remote", "set-url", "origin", repositoryUrl])
            : runGit(workDir, ["remote", "add", "origin", repositoryUrl]);
        if (!updated.ok)
            throw new Error(`GitHub origin 更新失败：${updated.stderr || updated.error}`);
    }
    return inspectProjectGit(workDir);
}
//# sourceMappingURL=project-git.js.map