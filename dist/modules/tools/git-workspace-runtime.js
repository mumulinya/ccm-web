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
exports.gitChecksum = gitChecksum;
exports.sanitizeGitDiagnostic = sanitizeGitDiagnostic;
exports.runGitCommand = runGitCommand;
exports.tryGitCommand = tryGitCommand;
exports.normalizeGitRepoPath = normalizeGitRepoPath;
exports.resolveSafeRepositoryPath = resolveSafeRepositoryPath;
exports.captureRepositoryIdentity = captureRepositoryIdentity;
exports.captureWorkspaceSnapshot = captureWorkspaceSnapshot;
exports.captureFileEvidence = captureFileEvidence;
exports.acquireGitMutationLease = acquireGitMutationLease;
exports.releaseGitMutationLease = releaseGitMutationLease;
exports.withGitMutationLease = withGitMutationLease;
exports.assertExpectedWorkspaceSnapshot = assertExpectedWorkspaceSnapshot;
exports.buildGitMutationReceipt = buildGitMutationReceipt;
exports.cleanupStaleGitMutationLeases = cleanupStaleGitMutationLeases;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const LEASE_DIR = path.join(utils_1.CCM_DIR, "git-operation-leases");
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
}
function gitChecksum(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(stable(value))).digest("hex");
}
function sanitizeGitDiagnostic(value, max = 2_000) {
    return String(value || "Git 操作失败")
        .replace(/(https?:\/\/)[^/@\s]+@/gi, "$1")
        .replace(/([?&](?:access_token|auth_token|token|key|password)=)[^&\s]+/gi, "$1[已隐藏]")
        .replace(/(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi, "$1[已隐藏]")
        .replace(/[\0\r]+/g, " ")
        .trim()
        .slice(0, max);
}
function terminateProcessTree(child) {
    const pid = Number(child?.pid || 0);
    if (!pid)
        return;
    if (process.platform === "win32") {
        try {
            const killer = (0, child_process_1.spawn)("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
            killer.unref();
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
function runGitCommand(workDir, args, options = {}) {
    return new Promise((resolve, reject) => {
        const timeoutMs = Math.max(1_000, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
        const maxOutputBytes = Math.max(64 * 1024, Number(options.maxOutputBytes || DEFAULT_MAX_OUTPUT_BYTES));
        const remoteArgs = options.remote ? ["-c", "credential.interactive=never", ...args] : args;
        const child = (0, child_process_1.spawn)("git", remoteArgs, {
            cwd: workDir,
            windowsHide: true,
            detached: process.platform !== "win32",
            stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
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
                ...(options.env || {}),
            },
        });
        const stdout = [];
        const stderr = [];
        let outputBytes = 0;
        let failureCode = "";
        let settled = false;
        const fail = (message, code, error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", onAbort);
            const failure = new Error(message);
            failure.gitErrorCode = code;
            failure.stdout = Buffer.concat(stdout).toString("utf-8");
            failure.stderr = Buffer.concat(stderr).toString("utf-8");
            failure.cause = error;
            reject(failure);
        };
        const append = (target, chunk) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk || ""));
            outputBytes += buffer.length;
            if (outputBytes > maxOutputBytes && !failureCode) {
                failureCode = "output_exceeded";
                terminateProcessTree(child);
                return;
            }
            target.push(buffer);
        };
        child.stdout?.on("data", chunk => append(stdout, chunk));
        child.stderr?.on("data", chunk => append(stderr, chunk));
        const onAbort = () => {
            failureCode = "aborted";
            terminateProcessTree(child);
        };
        options.signal?.addEventListener("abort", onAbort, { once: true });
        const timer = setTimeout(() => {
            failureCode = "timeout";
            terminateProcessTree(child);
        }, timeoutMs);
        child.once("error", error => fail(`无法启动 Git：${error.message}`, "spawn_failed", error));
        child.once("close", code => {
            if (settled)
                return;
            clearTimeout(timer);
            options.signal?.removeEventListener("abort", onAbort);
            const stdoutText = Buffer.concat(stdout).toString("utf-8");
            const stderrText = Buffer.concat(stderr).toString("utf-8");
            if (failureCode)
                return fail(failureCode === "timeout" ? "Git 操作超时" : failureCode === "aborted" ? "Git 操作已取消" : "Git 输出超过安全限制", failureCode);
            if (code !== 0) {
                const error = new Error(`Git 操作失败（退出码 ${code ?? "unknown"}）`);
                error.stdout = stdoutText;
                error.stderr = stderrText;
                error.gitErrorCode = "command_failed";
                settled = true;
                reject(error);
                return;
            }
            settled = true;
            resolve({ stdout: stdoutText, stderr: stderrText, exitCode: Number(code || 0) });
        });
        if (options.input !== undefined)
            child.stdin?.end(options.input);
    });
}
async function tryGitCommand(workDir, args, options = {}) {
    try {
        const result = await runGitCommand(workDir, args, options);
        return { ok: true, output: result.stdout.trim(), error: "" };
    }
    catch (error) {
        return { ok: false, output: "", error: sanitizeGitDiagnostic(error?.stderr || error?.message) };
    }
}
function within(root, target) {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}
function normalizeGitRepoPath(filePath) {
    return String(filePath ?? "").replace(/\\/g, "/");
}
function resolveSafeRepositoryPath(workDir, filePath, options = {}) {
    const normalized = normalizeGitRepoPath(filePath);
    if (!normalized || normalized.includes("\0") || path.isAbsolute(normalized) || normalized.split("/").includes(".."))
        throw new Error("非法文件路径");
    const lexicalRoot = path.resolve(workDir);
    const realRoot = fs.realpathSync.native(lexicalRoot);
    const parts = normalized.split("/").filter(Boolean);
    let current = lexicalRoot;
    let leafSymlink = false;
    for (let index = 0; index < parts.length; index += 1) {
        current = path.join(current, parts[index]);
        if (!fs.existsSync(current))
            continue;
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) {
            const isLeaf = index === parts.length - 1;
            if (!isLeaf || options.allowLeafSymlink !== true)
                throw new Error("文件路径包含不允许跟随的符号链接或目录联接");
            leafSymlink = true;
            continue;
        }
        const realCurrent = fs.realpathSync.native(current);
        if (!within(realRoot, realCurrent))
            throw new Error("文件真实路径不在项目仓库内");
    }
    const absolute = path.resolve(lexicalRoot, ...parts);
    if (!within(lexicalRoot, absolute))
        throw new Error("文件不在项目目录内");
    return { normalized, absolute, realRoot, leafSymlink };
}
async function hashFile(file) {
    return new Promise((resolve, reject) => {
        const digest = crypto.createHash("sha256");
        const stream = fs.createReadStream(file);
        stream.on("data", chunk => digest.update(chunk));
        stream.once("error", reject);
        stream.once("end", () => resolve(digest.digest("hex")));
    });
}
async function captureRepositoryIdentity(workDir, projectId = "") {
    const top = (await runGitCommand(workDir, ["rev-parse", "--show-toplevel"])).stdout.trim();
    const repositoryRoot = fs.realpathSync.native(path.resolve(top));
    const commonRaw = (await runGitCommand(repositoryRoot, ["rev-parse", "--git-common-dir"])).stdout.trim();
    const commonLexical = path.isAbsolute(commonRaw) ? commonRaw : path.resolve(repositoryRoot, commonRaw);
    const gitCommonDir = fs.realpathSync.native(commonLexical);
    const head = (await tryGitCommand(repositoryRoot, ["rev-parse", "--verify", "HEAD"])).output;
    const branch = (await tryGitCommand(repositoryRoot, ["branch", "--show-current"])).output || "detached HEAD";
    const remote = (await tryGitCommand(repositoryRoot, ["remote", "get-url", "origin"])).output;
    const base = {
        schema: "ccm-git-repository-identity-v2",
        project_id: projectId,
        work_dir: path.resolve(workDir),
        repository_root: repositoryRoot,
        git_common_dir: gitCommonDir,
        head,
        branch,
        remote_fingerprint: remote ? gitChecksum(remote.replace(/(https?:\/\/)[^/@\s]+@/i, "$1")) : "",
    };
    return { ...base, checksum: gitChecksum(base) };
}
async function captureWorkspaceSnapshot(workDir, projectId = "", statusRaw) {
    const repository = await captureRepositoryIdentity(workDir, projectId);
    const raw = statusRaw === undefined
        // Ask Git for individual untracked files. With `normal`, an untracked
        // directory is returned as one directory entry and file evidence rejects
        // it because evidence and diff operations are file-scoped.
        ? (await runGitCommand(repository.repository_root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])).stdout
        : statusRaw;
    const indexPathRaw = (await tryGitCommand(repository.repository_root, ["rev-parse", "--git-path", "index"])).output;
    const indexPath = indexPathRaw ? (path.isAbsolute(indexPathRaw) ? indexPathRaw : path.resolve(repository.repository_root, indexPathRaw)) : "";
    let indexChecksum = "missing";
    try {
        if (indexPath && fs.existsSync(indexPath))
            indexChecksum = await hashFile(indexPath);
    }
    catch {
        indexChecksum = "unreadable";
    }
    const records = raw.split("\0");
    const changedPaths = [];
    for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (!record)
            continue;
        const statusCode = record.slice(0, 2);
        const currentPath = record.slice(3);
        if (currentPath)
            changedPaths.push(currentPath);
        if (/R|C/.test(statusCode)) {
            const originalPath = String(records[index + 1] || "");
            if (originalPath)
                changedPaths.push(originalPath);
            index += 1;
        }
    }
    const worktreeEvidence = await captureFileEvidence(repository.repository_root, changedPaths);
    const worktreeContentChecksum = gitChecksum(worktreeEvidence);
    const base = {
        schema: "ccm-git-workspace-snapshot-v2",
        repository,
        status_checksum: gitChecksum(raw),
        index_checksum: indexChecksum,
        worktree_content_checksum: worktreeContentChecksum,
        captured_at: new Date().toISOString(),
    };
    return { ...base, checksum: gitChecksum({ repository: repository.checksum, status: base.status_checksum, index: indexChecksum, worktree: worktreeContentChecksum }), status_raw: raw };
}
async function captureFileEvidence(workDir, files) {
    const values = Array.from(new Set((files || []).map(normalizeGitRepoPath).filter(Boolean)));
    const results = new Array(values.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(8, Math.max(1, values.length)) }, async () => {
        while (cursor < values.length) {
            const index = cursor++;
            const value = values[index];
            const safe = resolveSafeRepositoryPath(workDir, value, { allowLeafSymlink: true });
            if (!fs.existsSync(safe.absolute)) {
                results[index] = { path: safe.normalized, state: "missing", checksum: gitChecksum("missing") };
                continue;
            }
            const stat = fs.lstatSync(safe.absolute);
            if (stat.isSymbolicLink()) {
                const target = fs.readlinkSync(safe.absolute);
                results[index] = { path: safe.normalized, state: "symlink", size: Buffer.byteLength(target), checksum: gitChecksum(`symlink:${target}`) };
                continue;
            }
            if (!stat.isFile())
                throw new Error(`不支持读取非普通文件：${safe.normalized}`);
            results[index] = { path: safe.normalized, state: "file", size: stat.size, checksum: await hashFile(safe.absolute) };
        }
    });
    await Promise.all(workers);
    return results;
}
function processAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function leaseFile(repository) {
    fs.mkdirSync(LEASE_DIR, { recursive: true });
    return path.join(LEASE_DIR, `${gitChecksum(repository.git_common_dir.toLowerCase()).slice(0, 32)}.json`);
}
function readLease(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
async function acquireGitMutationLease(repository, operation, leaseMs = 5 * 60_000) {
    const file = leaseFile(repository);
    const existing = readLease(file);
    if (existing) {
        const active = Date.parse(existing.expires_at || 0) > Date.now() && (String(existing.hostname || "") !== require("os").hostname() || processAlive(Number(existing.owner_pid || 0)));
        if (active) {
            const error = new Error(`仓库正在执行${existing.operation || "其他Git操作"}`);
            error.gitErrorCode = "repository_busy";
            error.lease = existing;
            throw error;
        }
        try {
            fs.unlinkSync(file);
        }
        catch { }
    }
    const lease = {
        schema: "ccm-git-mutation-lease-v1",
        lease_id: crypto.randomBytes(16).toString("hex"),
        repository_checksum: repository.checksum,
        operation,
        owner_pid: process.pid,
        hostname: require("os").hostname(),
        acquired_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + Math.max(30_000, leaseMs)).toISOString(),
        file,
    };
    try {
        const handle = await fs.promises.open(file, "wx", 0o600);
        try {
            await handle.writeFile(`${JSON.stringify(lease)}\n`, "utf-8");
            await handle.sync();
        }
        finally {
            await handle.close();
        }
    }
    catch (error) {
        const current = readLease(file);
        const busy = new Error(`仓库正在执行${current?.operation || "其他Git操作"}`);
        busy.gitErrorCode = "repository_busy";
        busy.lease = current;
        throw busy;
    }
    return lease;
}
async function releaseGitMutationLease(lease) {
    const current = readLease(lease.file);
    if (!current || current.lease_id !== lease.lease_id || Number(current.owner_pid || 0) !== process.pid)
        return false;
    try {
        await fs.promises.unlink(lease.file);
        return true;
    }
    catch {
        return false;
    }
}
async function withGitMutationLease(workDir, projectId, operation, callback) {
    const before = await captureWorkspaceSnapshot(workDir, projectId);
    const lease = await acquireGitMutationLease(before.repository, operation);
    try {
        const lockedBefore = await captureWorkspaceSnapshot(workDir, projectId);
        return await callback({ repository: lockedBefore.repository, lease, before: lockedBefore });
    }
    finally {
        await releaseGitMutationLease(lease);
    }
}
function assertExpectedWorkspaceSnapshot(expected, actual) {
    const value = String(expected || "").trim();
    if (!value)
        return;
    if (value !== actual.checksum) {
        const error = new Error("Git工作区已发生变化，请刷新后重新确认");
        error.gitErrorCode = "state_drift";
        error.expected = value;
        error.actual = actual.checksum;
        throw error;
    }
}
async function buildGitMutationReceipt(input) {
    const evidence = await captureFileEvidence(input.after.repository.repository_root, input.files || []);
    const base = {
        schema: "ccm-git-mutation-receipt-v2",
        project_id: input.projectId,
        operation: input.operation,
        actor: String(input.actor || "user"),
        outcome: String(input.outcome || "completed"),
        before_snapshot_checksum: input.before.checksum,
        after_snapshot_checksum: input.after.checksum,
        base_head: input.before.repository.head,
        result_head: input.after.repository.head,
        files: evidence,
        completed_at: new Date().toISOString(),
    };
    return { ...base, checksum: gitChecksum(base) };
}
function cleanupStaleGitMutationLeases() {
    fs.mkdirSync(LEASE_DIR, { recursive: true });
    let removed = 0;
    for (const name of fs.readdirSync(LEASE_DIR)) {
        if (!name.endsWith(".json"))
            continue;
        const file = path.join(LEASE_DIR, name);
        const lease = readLease(file);
        if (lease && Date.parse(lease.expires_at || 0) > Date.now() && processAlive(Number(lease.owner_pid || 0)))
            continue;
        try {
            fs.unlinkSync(file);
            removed += 1;
        }
        catch { }
    }
    return removed;
}
//# sourceMappingURL=git-workspace-runtime.js.map