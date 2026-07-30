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
exports.getProjectCloneReceipt = getProjectCloneReceipt;
exports.cancelProjectClone = cancelProjectClone;
exports.finalizeProjectCloneReceipt = finalizeProjectCloneReceipt;
exports.rollbackProjectClone = rollbackProjectClone;
exports.cleanupStaleProjectCloneArtifacts = cleanupStaleProjectCloneArtifacts;
exports.normalizeGitHubRepositoryUrl = normalizeGitHubRepositoryUrl;
exports.githubWebUrl = githubWebUrl;
exports.sanitizeGitRemoteUrl = sanitizeGitRemoteUrl;
exports.normalizeGitBranch = normalizeGitBranch;
exports.inspectProjectGit = inspectProjectGit;
exports.inspectProjectGitAsync = inspectProjectGitAsync;
exports.cloneGitHubRepository = cloneGitHubRepository;
exports.configureProjectRepository = configureProjectRepository;
exports.configureProjectRepositoryAsync = configureProjectRepositoryAsync;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const git_workspace_runtime_1 = require("../tools/git-workspace-runtime");
const CLONE_RECEIPT_DIR = path.join(utils_1.CCM_DIR, "project-clone-receipts");
const activeCloneControllers = new Map();
function ensureCloneReceiptDir() { fs.mkdirSync(CLONE_RECEIPT_DIR, { recursive: true }); }
function cloneReceiptFile(id) { return path.join(CLONE_RECEIPT_DIR, `${String(id).replace(/[^a-zA-Z0-9_-]/g, "")}.json`); }
function saveCloneReceipt(receipt) {
    ensureCloneReceiptDir();
    const { checksum: _ignored, ...base } = receipt;
    const payload = { ...base, updated_at: new Date().toISOString() };
    const next = { ...payload, checksum: (0, git_workspace_runtime_1.gitChecksum)(payload) };
    (0, atomic_json_file_1.writeJsonAtomic)(cloneReceiptFile(next.id), next);
    return next;
}
function getProjectCloneReceipt(id) {
    try {
        return JSON.parse(fs.readFileSync(cloneReceiptFile(id), "utf-8"));
    }
    catch {
        return null;
    }
}
function safeOwnedCloneTemp(receipt) {
    if (!receipt?.temporary_directory)
        return "";
    const temp = path.resolve(receipt.temporary_directory);
    const destination = path.resolve(receipt.destination);
    const parent = path.dirname(destination);
    const prefix = `.${path.basename(destination)}.ccm-clone-`;
    return path.dirname(temp) === parent && path.basename(temp).startsWith(prefix) ? temp : "";
}
function cleanupOwnedCloneTemp(receipt) {
    const temp = safeOwnedCloneTemp(receipt);
    if (!temp || !fs.existsSync(temp))
        return false;
    try {
        fs.rmSync(temp, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 });
        return true;
    }
    catch {
        return false;
    }
}
function cancelProjectClone(id) {
    const receipt = getProjectCloneReceipt(id);
    if (!receipt)
        throw new Error("克隆记录不存在");
    if (["completed", "rolled_back", "recovery_required"].includes(receipt.status))
        throw new Error("克隆已经结束，不能再取消");
    if (receipt.status === "validated" && !receipt.temporary_directory)
        throw new Error("仓库已切换到项目目录，不能再取消克隆");
    if (["failed", "cancelled"].includes(receipt.status))
        return receipt;
    activeCloneControllers.get(id)?.abort();
    const next = saveCloneReceipt({ ...receipt, status: "cancelled", error: "用户已取消克隆" });
    cleanupOwnedCloneTemp(next);
    return next;
}
function finalizeProjectCloneReceipt(id, status = "completed", error = "") {
    const receipt = getProjectCloneReceipt(id);
    if (!receipt)
        return null;
    return saveCloneReceipt({ ...receipt, status, error });
}
async function rollbackProjectClone(id, reason) {
    const receipt = getProjectCloneReceipt(id);
    if (!receipt)
        return null;
    cleanupOwnedCloneTemp(receipt);
    const destination = path.resolve(receipt.destination);
    let rolledBack = false;
    if (receipt.destination_created_by_ccm && fs.existsSync(destination)) {
        try {
            const current = await inspectProjectGitAsync(destination);
            const currentHead = current.last_commit?.hash || "";
            const unchanged = current.is_repository && currentHead === receipt.result_head && current.dirty === false;
            if (unchanged) {
                fs.rmSync(destination, { recursive: true, force: true });
                rolledBack = true;
            }
        }
        catch { }
    }
    return saveCloneReceipt({ ...receipt, status: rolledBack ? "rolled_back" : "recovery_required", error: reason });
}
function cleanupStaleProjectCloneArtifacts(maxAgeMs = 24 * 60 * 60_000) {
    ensureCloneReceiptDir();
    let cleaned = 0;
    for (const name of fs.readdirSync(CLONE_RECEIPT_DIR).filter(item => item.endsWith(".json"))) {
        const receipt = getProjectCloneReceipt(name.slice(0, -5));
        if (!receipt || !["cloning", "failed", "cancelled"].includes(receipt.status) || Date.now() - Date.parse(String(receipt.updated_at || receipt.created_at || "")) < maxAgeMs)
            continue;
        if (cleanupOwnedCloneTemp(receipt))
            cleaned += 1;
    }
    return cleaned;
}
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
function tryExternalCommand(command, args, timeoutMs = 8_000) {
    return new Promise(resolve => {
        let settled = false;
        let stdout = "";
        const child = (0, child_process_1.spawn)(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
        const finish = (ok) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve({ ok, stdout: stdout.trim() });
        };
        child.stdout?.on("data", chunk => {
            if (Buffer.byteLength(stdout) < 128 * 1024)
                stdout += String(chunk || "");
        });
        child.once("error", () => finish(false));
        child.once("close", code => finish(code === 0));
        const timer = setTimeout(() => {
            try {
                child.kill();
            }
            catch { }
            finish(false);
        }, timeoutMs);
    });
}
async function inspectProjectGitAsync(workDir) {
    const resolved = path.resolve(String(workDir || ""));
    const directoryAvailable = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
    const [gitProbe, ghProbe] = await Promise.all([
        directoryAvailable ? (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["--version"]) : Promise.resolve({ ok: false, output: "", error: "" }),
        tryExternalCommand("gh", ["--version"]),
    ]);
    const base = {
        git_available: gitProbe.ok,
        gh_available: ghProbe.ok,
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
    if (ghProbe.ok)
        base.gh_authenticated = (await tryExternalCommand("gh", ["auth", "status", "--hostname", "github.com"])).ok;
    if (!gitProbe.ok || !directoryAvailable)
        return base;
    const inside = await (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["rev-parse", "--is-inside-work-tree"]);
    if (!inside.ok)
        return base;
    base.is_repository = true;
    const [remote, branch, upstream, status, commit] = await Promise.all([
        (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["remote", "get-url", "origin"]),
        (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["branch", "--show-current"]),
        (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]),
        (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["status", "--porcelain=v1", "--untracked-files=normal"]),
        (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["log", "-1", "--format=%H%x09%h%x09%an%x09%aI%x09%s"]),
    ]);
    base.remote_url = remote.ok ? sanitizeGitRemoteUrl(remote.output) : "";
    try {
        base.remote_web_url = base.remote_url ? githubWebUrl(base.remote_url) : "";
    }
    catch { }
    base.branch = branch.ok ? branch.output : "";
    base.upstream = upstream.ok ? upstream.output : "";
    if (base.upstream) {
        const counts = await (0, git_workspace_runtime_1.tryGitCommand)(resolved, ["rev-list", "--left-right", "--count", `HEAD...${base.upstream}`]);
        const match = counts.output.match(/^(\d+)\s+(\d+)$/);
        if (counts.ok && match) {
            base.ahead = Number(match[1]);
            base.behind = Number(match[2]);
        }
    }
    if (status.ok) {
        const lines = status.output.split(/\r?\n/).filter(Boolean);
        base.changed_files = lines.length;
        base.untracked_files = lines.filter(line => line.startsWith("??")).length;
        base.dirty = lines.length > 0;
    }
    if (commit.ok && commit.output) {
        const [hash, short_hash, author, authored_at, ...summary] = commit.output.split("\t");
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
    const destinationExisted = fs.existsSync(destination);
    const destinationStat = destinationExisted ? fs.statSync(destination) : null;
    const requestedId = String(input.receiptId || "").trim();
    const id = requestedId && /^clone_[a-zA-Z0-9_-]{8,120}$/.test(requestedId) ? requestedId : `clone_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
    const temporaryDirectory = path.join(path.dirname(destination), `.${path.basename(destination)}.ccm-clone-${id.slice(-16)}`);
    let receipt = saveCloneReceipt({
        schema: "ccm-project-clone-receipt-v2",
        id,
        destination,
        temporary_directory: temporaryDirectory,
        repository_fingerprint: (0, git_workspace_runtime_1.gitChecksum)(repositoryUrl),
        branch,
        status: "cloning",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: "",
        destination_created_by_ccm: !destinationExisted,
        result_head: "",
    });
    const controller = new AbortController();
    activeCloneControllers.set(id, controller);
    const args = ["clone", "--origin", "origin"];
    if (branch)
        args.push("--branch", branch, "--single-branch");
    args.push("--", repositoryUrl, temporaryDirectory);
    try {
        await (0, git_workspace_runtime_1.runGitCommand)(path.dirname(destination), args, { remote: true, timeoutMs: 5 * 60_000, maxOutputBytes: 4 * 1024 * 1024, signal: controller.signal });
        const temporaryStatus = await inspectProjectGitAsync(temporaryDirectory);
        if (!temporaryStatus.is_repository || !temporaryStatus.last_commit?.hash)
            throw new Error("仓库克隆完成，但临时目录未通过Git仓库校验");
        receipt = saveCloneReceipt({ ...receipt, status: "validated", result_head: temporaryStatus.last_commit.hash });
        if (controller.signal.aborted)
            throw new Error("GitHub仓库克隆已取消");
        if (destinationExisted) {
            if (!fs.existsSync(destination) || !fs.statSync(destination).isDirectory() || fs.readdirSync(destination).length > 0)
                throw new Error("克隆期间目标目录发生变化，已停止写入");
            const current = fs.statSync(destination);
            if (destinationStat && (current.dev !== destinationStat.dev || current.ino !== destinationStat.ino))
                throw new Error("克隆期间目标目录身份发生变化，已停止写入");
            fs.rmdirSync(destination);
        }
        if (controller.signal.aborted)
            throw new Error("GitHub仓库克隆已取消");
        try {
            fs.renameSync(temporaryDirectory, destination);
        }
        catch (error) {
            if (destinationExisted && !fs.existsSync(destination))
                fs.mkdirSync(destination, { recursive: false });
            throw error;
        }
        const status = await inspectProjectGitAsync(destination);
        if (!status.is_repository || status.last_commit?.hash !== receipt.result_head)
            throw new Error("仓库切换完成，但最终目录校验失败");
        receipt = saveCloneReceipt({ ...receipt, status: "validated", temporary_directory: "" });
        return { ...status, clone_receipt: receipt };
    }
    catch (error) {
        const cancelled = controller.signal.aborted;
        receipt = saveCloneReceipt({ ...receipt, status: cancelled ? "cancelled" : "failed", error: (0, git_workspace_runtime_1.sanitizeGitDiagnostic)(error?.stderr || error?.message) });
        cleanupOwnedCloneTemp(receipt);
        throw new Error(cancelled ? "GitHub仓库克隆已取消" : `GitHub仓库克隆失败：${receipt.error}`);
    }
    finally {
        activeCloneControllers.delete(id);
    }
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
async function configureProjectRepositoryAsync(input) {
    if (!commandExists("git"))
        throw new Error("未安装 Git，无法管理项目仓库");
    const workDir = path.resolve(input.workDir);
    const lockDir = path.join(utils_1.CCM_DIR, "git-operation-leases");
    fs.mkdirSync(lockDir, { recursive: true });
    const lockFile = path.join(lockDir, `repository-config-${(0, git_workspace_runtime_1.gitChecksum)(workDir.toLowerCase()).slice(0, 24)}.json`);
    let handle;
    try {
        handle = await fs.promises.open(lockFile, "wx", 0o600);
        await handle.writeFile(`${JSON.stringify({ schema: "ccm-git-mutation-lease-v1", lease_id: crypto.randomBytes(12).toString("hex"), operation: "configure_repository", owner_pid: process.pid, acquired_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60_000).toISOString() })}\n`);
        await handle.close();
    }
    catch {
        const error = new Error("仓库正在执行其他Git操作");
        error.gitErrorCode = "repository_busy";
        throw error;
    }
    try {
        let status = await inspectProjectGitAsync(workDir);
        if (!status.is_repository && input.initialize === true) {
            await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["init"]);
            status = await inspectProjectGitAsync(workDir);
        }
        const requestedUrl = String(input.repositoryUrl || "").trim();
        if (requestedUrl) {
            if (!status.is_repository)
                throw new Error("当前目录不是 Git 仓库，请先勾选初始化 Git 仓库");
            const repositoryUrl = normalizeGitHubRepositoryUrl(requestedUrl);
            const current = await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["remote", "get-url", "origin"]);
            await (0, git_workspace_runtime_1.runGitCommand)(workDir, current.ok ? ["remote", "set-url", "origin", repositoryUrl] : ["remote", "add", "origin", repositoryUrl]);
        }
        return inspectProjectGitAsync(workDir);
    }
    finally {
        try {
            await fs.promises.unlink(lockFile);
        }
        catch { }
    }
}
//# sourceMappingURL=project-git.js.map