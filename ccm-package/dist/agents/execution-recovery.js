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
exports.createExecutionRecoveryManifest = createExecutionRecoveryManifest;
exports.finalizeExecutionRecoveryManifest = finalizeExecutionRecoveryManifest;
exports.finalizeExecutionRecoveryManifests = finalizeExecutionRecoveryManifests;
exports.readExecutionRecoveryManifest = readExecutionRecoveryManifest;
exports.listExecutionRecoveryManifests = listExecutionRecoveryManifests;
exports.previewExecutionRecovery = previewExecutionRecovery;
exports.applyExecutionRecovery = applyExecutionRecovery;
exports.compensateExecutionRecovery = compensateExecutionRecovery;
exports.purgeExecutionRecoveryManifests = purgeExecutionRecoveryManifests;
exports.runExecutionRecoverySelfTest = runExecutionRecoverySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const CCM_DIR = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
const RECOVERY_DIR = path.join(CCM_DIR, "execution-recovery");
const MANIFEST_DIR = path.join(RECOVERY_DIR, "manifests");
const WORKTREE_DIR = path.join(RECOVERY_DIR, "worktrees");
function now() { return new Date().toISOString(); }
function safePart(value, fallback = "recovery") {
    return String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || fallback;
}
function ensureDirs() {
    fs.mkdirSync(MANIFEST_DIR, { recursive: true });
    fs.mkdirSync(WORKTREE_DIR, { recursive: true });
}
function manifestFile(checkpointId) {
    ensureDirs();
    return path.join(MANIFEST_DIR, `${safePart(checkpointId)}.json`);
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
function git(cwd, args, options = {}) {
    const result = (0, child_process_1.spawnSync)("git", args, {
        cwd,
        encoding: "utf-8",
        windowsHide: true,
        env: { ...process.env, ...(options.env || {}) },
    });
    if (result.status !== 0 && !options.allowFailure)
        throw new Error(String(result.stderr || result.stdout || `git ${args[0]} 失败`).trim());
    return { ok: result.status === 0, stdout: String(result.stdout || "").trim(), stderr: String(result.stderr || "").trim() };
}
function objectExists(repoRoot, object) {
    return !!object && git(repoRoot, ["cat-file", "-e", object], { allowFailure: true }).ok;
}
function blobAt(repoRoot, commit, relativePath) {
    const result = git(repoRoot, ["rev-parse", `${commit}:${relativePath}`], { allowFailure: true });
    return result.ok ? result.stdout : "";
}
function isProtectedRecoveryPath(relativePath) {
    const normalized = String(relativePath || "").replace(/\\/g, "/");
    return /(^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.pypirc$|id_(?:rsa|ed25519)(?:\.|$)|credentials?(?:\.|$)|secrets?(?:\.|$)|.*\.(?:pem|key|p12|pfx|keystore))$/i.test(normalized);
}
function protectRef(repoRoot, kind, id, commit) {
    const ref = `refs/ccm/${kind}/${safePart(id)}`;
    git(repoRoot, ["update-ref", ref, commit]);
    return ref;
}
function snapshotWorkingTree(repoRoot, parent, label) {
    ensureDirs();
    const tempIndex = path.join(RECOVERY_DIR, `${safePart(label)}-${Date.now()}.index`);
    const env = { GIT_INDEX_FILE: tempIndex };
    try {
        git(repoRoot, ["read-tree", parent], { env });
        git(repoRoot, ["add", "-A"], { env });
        const tree = git(repoRoot, ["write-tree"], { env }).stdout;
        const result = (0, child_process_1.spawnSync)("git", ["commit-tree", tree, "-p", parent, "-m", `CCM delivery ${label}`], {
            cwd: repoRoot,
            encoding: "utf-8",
            windowsHide: true,
            env: {
                ...process.env,
                ...env,
                GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || "CCM Recovery",
                GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || "ccm-recovery@localhost",
                GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || "CCM Recovery",
                GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || "ccm-recovery@localhost",
            },
        });
        if (result.status !== 0)
            throw new Error(String(result.stderr || "无法固定交付版本").trim());
        return String(result.stdout || "").trim();
    }
    finally {
        try {
            fs.unlinkSync(tempIndex);
        }
        catch { }
    }
}
function parseChangedPaths(repoRoot, baselineCommit, deliveryCommit) {
    const raw = git(repoRoot, ["diff", "--name-status", "-z", baselineCommit, deliveryCommit]).stdout;
    const tokens = raw.split("\0").filter(Boolean);
    const paths = [];
    for (let index = 0; index < tokens.length;) {
        const token = tokens[index++];
        let status = token;
        let firstPath = "";
        if (token.includes("\t")) {
            const parts = token.split("\t");
            status = parts.shift() || "";
            firstPath = parts.join("\t");
        }
        else {
            firstPath = tokens[index++] || "";
        }
        if (firstPath)
            paths.push(firstPath.replace(/\\/g, "/"));
        if (/^[RC]/.test(status)) {
            const secondPath = tokens[index++] || "";
            if (secondPath)
                paths.push(secondPath.replace(/\\/g, "/"));
        }
    }
    return Array.from(new Set(paths)).sort().map(relativePath => ({
        path: relativePath,
        beforeBlob: blobAt(repoRoot, baselineCommit, relativePath),
        afterBlob: blobAt(repoRoot, deliveryCommit, relativePath),
        recoverable: !isProtectedRecoveryPath(relativePath),
    }));
}
function createExecutionRecoveryManifest(checkpoint, execution = null) {
    const authoritativeRepoRoot = path.resolve(execution?.workspace?.originalWorkDir || checkpoint.repoRoot);
    const baselineCommit = String(checkpoint.checkpointCommit || "");
    if (!objectExists(authoritativeRepoRoot, baselineCommit))
        throw new Error("检查点Git对象不可用");
    const durableRef = protectRef(authoritativeRepoRoot, "checkpoints", checkpoint.id, baselineCommit);
    const manifest = {
        schema: "ccm-turn-rewind-point-v1",
        id: `rewind-point-${safePart(checkpoint.id)}`,
        checkpointId: checkpoint.id,
        executionId: checkpoint.executionId,
        taskId: checkpoint.taskId,
        project: String(execution?.project || ""),
        generation: Number(execution?.generation || 0),
        attempt: Number(execution?.executionAttempt || 0),
        authoritativeRepoRoot,
        sourceWorktree: String(checkpoint.repoRoot || ""),
        sourceMode: String(checkpoint.mode || "shared"),
        baselineCommit,
        baselineRef: durableRef,
        deliveryCommit: "",
        deliveryRef: "",
        mergeCommit: "",
        changedFiles: [],
        createdAt: now(),
        finalizedAt: "",
        recoveries: [],
        contentStored: false,
    };
    writeJsonAtomic(manifestFile(checkpoint.id), manifest);
    return manifest;
}
function finalizeExecutionRecoveryManifest(checkpointId, input = {}) {
    const file = manifestFile(checkpointId);
    const manifest = readJson(file, null);
    if (!manifest)
        return null;
    const sourceRoot = path.resolve(input.workDir || manifest.sourceWorktree || manifest.authoritativeRepoRoot);
    const parent = String(manifest.baselineCommit || "");
    let deliveryCommit = String(input.deliveryCommit || "");
    if (!deliveryCommit)
        deliveryCommit = snapshotWorkingTree(sourceRoot, parent, checkpointId);
    if (!objectExists(manifest.authoritativeRepoRoot, deliveryCommit))
        throw new Error("交付Git对象不可用");
    manifest.deliveryCommit = deliveryCommit;
    manifest.deliveryRef = protectRef(manifest.authoritativeRepoRoot, "deliveries", checkpointId, deliveryCommit);
    manifest.mergeCommit = String(input.mergeCommit || manifest.mergeCommit || "");
    manifest.changedFiles = parseChangedPaths(manifest.authoritativeRepoRoot, manifest.baselineCommit, deliveryCommit);
    manifest.finalizedAt = now();
    writeJsonAtomic(file, manifest);
    return manifest;
}
function finalizeExecutionRecoveryManifests(execution, input = {}) {
    const results = [];
    for (const checkpointId of execution?.checkpointIds || []) {
        try {
            const result = finalizeExecutionRecoveryManifest(checkpointId, input);
            if (result)
                results.push(result);
        }
        catch (error) {
            results.push({ checkpointId, error: error?.message || String(error) });
        }
    }
    return results;
}
function readExecutionRecoveryManifest(checkpointId) {
    return readJson(manifestFile(checkpointId), null);
}
function listExecutionRecoveryManifests(filters = {}) {
    ensureDirs();
    const taskIds = new Set((filters.taskIds || []).map(String));
    const executionIds = new Set((filters.executionIds || []).map(String));
    return fs.readdirSync(MANIFEST_DIR).filter(name => name.endsWith(".json"))
        .map(name => readJson(path.join(MANIFEST_DIR, name), null)).filter(Boolean)
        .filter((item) => (!taskIds.size && !executionIds.size) || taskIds.has(String(item.taskId)) || executionIds.has(String(item.executionId)))
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}
function normalizedSelectedPaths(manifest, selectedPaths) {
    const allowedRows = (manifest.changedFiles || []).filter((item) => item.recoverable !== false);
    const allowed = new Set(allowedRows.map((item) => String(item.path)));
    const requested = Array.isArray(selectedPaths) && selectedPaths.length ? selectedPaths : Array.from(allowed);
    const normalized = Array.from(new Set(requested.map(value => String(value || "").trim().replace(/\\/g, "/")).filter(Boolean)));
    for (const relativePath of normalized)
        if (!allowed.has(relativePath))
            throw new Error(`文件不属于本轮交付：${relativePath}`);
    return normalized;
}
function previewExecutionRecovery(checkpointId, options = {}) {
    const manifest = readExecutionRecoveryManifest(checkpointId);
    if (!manifest)
        return { checkpointId, available: false, reason: "历史检查点不可用", conflicts: [], files: [] };
    const repoRoot = String(manifest.authoritativeRepoRoot || "");
    if (!fs.existsSync(repoRoot) || !manifest.deliveryCommit || !objectExists(repoRoot, manifest.baselineCommit) || !objectExists(repoRoot, manifest.deliveryCommit)) {
        return { checkpointId, available: false, reason: "历史检查点或交付版本不可用", conflicts: [], files: [] };
    }
    const paths = normalizedSelectedPaths(manifest, options.paths);
    const protectedFileCount = (manifest.changedFiles || []).filter((item) => item.recoverable === false).length;
    const currentHead = git(repoRoot, ["rev-parse", "HEAD"]).stdout;
    const conflicts = [];
    const files = paths.map(relativePath => {
        const row = (manifest.changedFiles || []).find((item) => item.path === relativePath) || {};
        const currentBlob = blobAt(repoRoot, currentHead, relativePath);
        const dirty = !!git(repoRoot, ["status", "--porcelain=v1", "--", relativePath], { allowFailure: true }).stdout;
        const changedAfterDelivery = currentBlob !== String(row.afterBlob || "");
        const conflict = dirty || changedAfterDelivery;
        if (conflict)
            conflicts.push({ path: relativePath, reason: dirty ? "当前工作区仍有未提交修改" : "文件已被后续提交修改" });
        return { path: relativePath, action: row.beforeBlob ? "restore" : "remove", conflict };
    });
    const plan = { checkpointId, currentHead, paths, manifestRevision: String(manifest.finalizedAt || manifest.createdAt || ""), files };
    return {
        schema: "ccm-execution-recovery-preview-v1",
        checkpointId,
        executionId: manifest.executionId,
        taskId: manifest.taskId,
        project: manifest.project || path.basename(repoRoot),
        available: true,
        canExecute: conflicts.length === 0,
        conflicts,
        files,
        protectedFileCount,
        currentHead,
        previewToken: crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex"),
        contentStored: false,
    };
}
function applyExecutionRecovery(checkpointId, options = {}) {
    const preview = previewExecutionRecovery(checkpointId, { paths: options.paths });
    if (!preview.available)
        throw new Error(preview.reason || "历史检查点不可用");
    if (!preview.canExecute)
        throw new Error("文件已发生变化，请处理冲突后重新预览");
    if (!options.previewToken || options.previewToken !== preview.previewToken)
        throw new Error("恢复预览已漂移，请重新预览");
    const manifest = readExecutionRecoveryManifest(checkpointId);
    const repoRoot = String(manifest.authoritativeRepoRoot);
    const expectedHead = String(preview.currentHead);
    if (git(repoRoot, ["rev-parse", "HEAD"]).stdout !== expectedHead)
        throw new Error("仓库HEAD已漂移，请重新预览");
    const recoveryId = `recovery-${safePart(checkpointId)}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const recoveryWorktree = path.join(WORKTREE_DIR, recoveryId);
    try {
        git(repoRoot, ["worktree", "add", "--detach", recoveryWorktree, expectedHead]);
        for (const relativePath of (preview.files || []).map((item) => item.path)) {
            const beforeBlob = blobAt(repoRoot, manifest.baselineCommit, relativePath);
            if (beforeBlob) {
                git(recoveryWorktree, ["restore", `--source=${manifest.baselineCommit}`, "--staged", "--worktree", "--", relativePath]);
            }
            else {
                git(recoveryWorktree, ["rm", "-f", "--ignore-unmatch", "--", relativePath]);
            }
        }
        git(recoveryWorktree, ["add", "-A"]);
        const staged = git(recoveryWorktree, ["diff", "--cached", "--quiet"], { allowFailure: true });
        if (staged.ok)
            return { success: true, duplicate: true, checkpointId, restoredFiles: preview.files.length, contentStored: false };
        const env = {
            GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || "CCM Recovery",
            GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || "ccm-recovery@localhost",
            GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || "CCM Recovery",
            GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || "ccm-recovery@localhost",
        };
        git(recoveryWorktree, ["commit", "-m", `revert: restore ${manifest.taskId || checkpointId}`], { env });
        const recoveryCommit = git(recoveryWorktree, ["rev-parse", "HEAD"]).stdout;
        protectRef(repoRoot, "recoveries", recoveryId, recoveryCommit);
        if (git(repoRoot, ["rev-parse", "HEAD"]).stdout !== expectedHead)
            throw new Error("仓库在恢复发布前发生变化，未应用恢复提交");
        git(repoRoot, ["merge", "--ff-only", recoveryCommit]);
        manifest.recoveries = [...(manifest.recoveries || []), {
                id: recoveryId,
                commit: recoveryCommit,
                reason: String(options.reason || "用户恢复本轮文件").slice(0, 500),
                paths: (preview.files || []).map((item) => item.path),
                restoredAt: now(),
            }].slice(-50);
        writeJsonAtomic(manifestFile(checkpointId), manifest);
        return { success: true, checkpointId, executionId: manifest.executionId, taskId: manifest.taskId, recoveryCommit, restoredFiles: preview.files.length, restoredAt: now(), contentStored: false };
    }
    finally {
        try {
            git(repoRoot, ["worktree", "remove", "--force", recoveryWorktree], { allowFailure: true });
        }
        catch { }
        try {
            fs.rmSync(recoveryWorktree, { recursive: true, force: true });
        }
        catch { }
    }
}
function compensateExecutionRecovery(checkpointId, recoveryCommit, reason = "多项目恢复未全部成功，自动补偿") {
    const manifest = readExecutionRecoveryManifest(checkpointId);
    if (!manifest?.authoritativeRepoRoot || !recoveryCommit)
        throw new Error("缺少可补偿的恢复提交");
    const repoRoot = String(manifest.authoritativeRepoRoot);
    const currentHead = git(repoRoot, ["rev-parse", "HEAD"]).stdout;
    if (currentHead !== recoveryCommit)
        throw new Error("仓库在补偿前已发生变化，需要人工处理");
    const env = {
        GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || "CCM Recovery",
        GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || "ccm-recovery@localhost",
        GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || "CCM Recovery",
        GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || "ccm-recovery@localhost",
    };
    git(repoRoot, ["revert", "--no-edit", recoveryCommit], { env });
    const compensationCommit = git(repoRoot, ["rev-parse", "HEAD"]).stdout;
    manifest.recoveries = (manifest.recoveries || []).map((item) => item.commit === recoveryCommit
        ? { ...item, compensatedAt: now(), compensationCommit, compensationReason: reason }
        : item);
    writeJsonAtomic(manifestFile(checkpointId), manifest);
    return { success: true, checkpointId, recoveryCommit, compensationCommit, compensatedAt: now(), contentStored: false };
}
function purgeExecutionRecoveryManifests(taskId) {
    let removed = 0;
    for (const manifest of listExecutionRecoveryManifests({ taskIds: [taskId] })) {
        if (manifest.authoritativeRepoRoot && fs.existsSync(manifest.authoritativeRepoRoot)) {
            for (const ref of [manifest.baselineRef, manifest.deliveryRef, ...(manifest.recoveries || []).map((item) => `refs/ccm/recoveries/${safePart(item.id)}`)].filter(Boolean)) {
                try {
                    git(manifest.authoritativeRepoRoot, ["update-ref", "-d", String(ref)], { allowFailure: true });
                }
                catch { }
            }
        }
        try {
            fs.unlinkSync(manifestFile(manifest.checkpointId));
            removed++;
        }
        catch { }
    }
    return removed;
}
function runExecutionRecoverySelfTest() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-recovery-self-test-"));
    const worktree = path.join(root, "lane");
    const checkpointId = `self-test-${process.pid}-${Date.now()}`;
    try {
        git(root, ["init"]);
        git(root, ["config", "user.email", "ccm-self-test@example.invalid"]);
        git(root, ["config", "user.name", "CCM Self Test"]);
        fs.writeFileSync(path.join(root, "tracked.txt"), "before\n", "utf-8");
        git(root, ["add", "tracked.txt"]);
        git(root, ["commit", "-m", "initial"]);
        const baselineCommit = git(root, ["rev-parse", "HEAD"]).stdout;
        git(root, ["worktree", "add", "-b", "ccm-self-test-lane", worktree, baselineCommit]);
        const checkpoint = { id: checkpointId, executionId: checkpointId, taskId: checkpointId, repoRoot: worktree, checkpointCommit: baselineCommit, mode: "worktree" };
        const execution = { id: checkpointId, taskId: checkpointId, project: "self-test", executionAttempt: 1, workspace: { originalWorkDir: root } };
        createExecutionRecoveryManifest(checkpoint, execution);
        fs.writeFileSync(path.join(worktree, "tracked.txt"), "after\n", "utf-8");
        fs.writeFileSync(path.join(worktree, "created.txt"), "new\n", "utf-8");
        git(worktree, ["add", "-A"]);
        git(worktree, ["commit", "-m", "delivery"]);
        const deliveryCommit = git(worktree, ["rev-parse", "HEAD"]).stdout;
        git(root, ["merge", "--no-ff", "ccm-self-test-lane", "-m", "merge delivery"]);
        const mergeCommit = git(root, ["rev-parse", "HEAD"]).stdout;
        finalizeExecutionRecoveryManifest(checkpointId, { workDir: worktree, deliveryCommit, mergeCommit });
        git(root, ["worktree", "remove", "--force", worktree]);
        git(root, ["branch", "-D", "ccm-self-test-lane"]);
        fs.writeFileSync(path.join(root, "tracked.txt"), "later-conflict\n", "utf-8");
        git(root, ["add", "tracked.txt"]);
        git(root, ["commit", "-m", "later conflicting change"]);
        const conflictPreview = previewExecutionRecovery(checkpointId);
        const conflictLeavesFileUntouched = fs.readFileSync(path.join(root, "tracked.txt"), "utf-8").replace(/\r\n/g, "\n") === "later-conflict\n";
        fs.writeFileSync(path.join(root, "tracked.txt"), "after\n", "utf-8");
        fs.writeFileSync(path.join(root, "unrelated.txt"), "keep\n", "utf-8");
        git(root, ["add", "-A"]);
        git(root, ["commit", "-m", "resolve target and add unrelated change"]);
        const preview = previewExecutionRecovery(checkpointId);
        const applied = applyExecutionRecovery(checkpointId, { previewToken: preview.previewToken, reason: "self test" });
        const checks = {
            availableAfterWorktreeCleanup: preview.available === true && preview.canExecute === true,
            conflictingLaterChangeBlocksWithoutWriting: conflictPreview.canExecute === false && conflictPreview.conflicts.length === 1 && conflictLeavesFileUntouched,
            restoresTrackedFile: fs.readFileSync(path.join(root, "tracked.txt"), "utf-8").replace(/\r\n/g, "\n") === "before\n",
            removesCreatedFile: !fs.existsSync(path.join(root, "created.txt")),
            preservesUnrelatedLaterFile: fs.readFileSync(path.join(root, "unrelated.txt"), "utf-8").replace(/\r\n/g, "\n") === "keep\n",
            createsRecoveryCommit: !!applied.recoveryCommit && git(root, ["rev-parse", "HEAD"]).stdout === applied.recoveryCommit,
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        try {
            fs.unlinkSync(manifestFile(checkpointId));
        }
        catch { }
        const resolved = path.resolve(root);
        if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith("ccm-recovery-self-test-")) {
            try {
                fs.rmSync(resolved, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
//# sourceMappingURL=execution-recovery.js.map