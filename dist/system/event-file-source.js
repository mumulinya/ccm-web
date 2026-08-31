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
exports.projectEventFileSource = projectEventFileSource;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const execution_kernel_1 = require("../agents/execution-kernel");
const execution_recovery_1 = require("../agents/execution-recovery");
const utils_1 = require("../core/utils");
const MAX_LINES = 2_000;
const MAX_BYTES = 1_500_000;
const SENSITIVE_FILE_PATTERN = /(^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.pypirc$|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)|credentials?(?:\.|$)|secrets?(?:\.|$)|[^/]+\.(?:pem|key|p12|pfx|jks|keystore))$/i;
function normalizedPath(value) {
    const result = String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
    if (!result || path.posix.isAbsolute(result) || /^[a-z]:\//i.test(result) || result.split("/").some(part => part === "..")) {
        throw Object.assign(new Error("文件路径无效或超出项目边界"), { statusCode: 400 });
    }
    if (SENSITIVE_FILE_PATTERN.test(result))
        throw Object.assign(new Error("敏感文件不支持在线查看"), { statusCode: 403 });
    return result;
}
function git(cwd, args) {
    return (0, child_process_1.spawnSync)("git", args, { cwd, encoding: "utf-8", windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
}
function safeFileFromRoot(rootValue, filePath) {
    const root = path.resolve(rootValue);
    const target = path.resolve(root, filePath);
    if (target === root || !target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target))
        return null;
    const stat = fs.lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES)
        return null;
    const realRoot = fs.realpathSync.native(root);
    const realTarget = fs.realpathSync.native(target);
    if (!realTarget.startsWith(`${realRoot}${path.sep}`))
        return null;
    const content = fs.readFileSync(realTarget);
    if (content.includes(0))
        throw Object.assign(new Error("二进制文件不支持文本预览"), { statusCode: 409 });
    return content.toString("utf-8");
}
function attemptFor(event) {
    return Math.max(0, Number(event.attempt || event.detail?.agentDisplay?.attempt || event.detail?.executionStage?.attempt || 0));
}
function fromActiveWorktree(event, project, filePath) {
    if (!event.taskId)
        return null;
    const attempt = attemptFor(event);
    const executions = (0, execution_kernel_1.listExecutions)({ taskId: event.taskId })
        .filter((record) => (!project || String(record?.project || "") === project)
        && (!attempt || !record.executionAttempt || Number(record.executionAttempt) === attempt))
        .sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
    for (const execution of executions) {
        const worktree = String(execution?.workspace?.worktreePath || "");
        if (!worktree || !fs.existsSync(worktree))
            continue;
        const content = safeFileFromRoot(worktree, filePath);
        if (content != null)
            return { content, freshness: "active_worktree" };
    }
    return null;
}
function fromAcceptedDelivery(event, project, filePath) {
    if (!event.taskId)
        return null;
    const attempt = attemptFor(event);
    const manifests = (0, execution_recovery_1.listExecutionRecoveryManifests)({ taskIds: [event.taskId] })
        .filter((manifest) => (!project || String(manifest?.project || "") === project)
        && (!attempt || !manifest.attempt || Number(manifest.attempt) === attempt));
    for (const manifest of manifests) {
        const repoRoot = String(manifest?.authoritativeRepoRoot || "");
        const delivery = String(manifest?.deliveryCommit || "");
        if (!repoRoot || !delivery || !fs.existsSync(repoRoot))
            continue;
        const result = git(repoRoot, ["show", `${delivery}:${filePath}`]);
        if (result.status !== 0)
            continue;
        const content = String(result.stdout || "");
        if (Buffer.byteLength(content, "utf-8") > MAX_BYTES || content.includes("\0"))
            continue;
        return { content, freshness: "accepted_delivery" };
    }
    return null;
}
function fromCurrentAuthority(project, filePath) {
    const root = String((0, utils_1.getWorkDirForProject)(project) || "");
    if (!root || !fs.existsSync(root))
        return null;
    const content = safeFileFromRoot(root, filePath);
    return content == null ? null : { content, freshness: "current_authority" };
}
function projectEventFileSource(event, projectHint = "") {
    const evidence = event.detail?.fileReadEvidence;
    if (!evidence?.path)
        throw Object.assign(new Error("该事件没有可验证的文件读取证据"), { statusCode: 409 });
    const filePath = normalizedPath(evidence.path);
    const project = String(evidence.project || projectHint || event.detail?.agentDisplay?.projectId || (event.scope === "project" ? event.scopeId : "")).trim();
    if (!project)
        throw Object.assign(new Error("文件读取事件缺少明确的项目归属"), { statusCode: 409 });
    const source = fromActiveWorktree(event, project, filePath)
        || fromAcceptedDelivery(event, project, filePath)
        || fromCurrentAuthority(project, filePath);
    if (!source)
        throw Object.assign(new Error("当前内容不可恢复；对应 worktree、交付引用和项目文件均不可用"), { statusCode: 409 });
    const allLines = source.content.split(/\r?\n/);
    const requested = evidence.ranges?.[0] || { start: 1, end: MAX_LINES };
    const start = Math.max(1, Number(requested.start || 1));
    const end = Math.min(allLines.length, Math.max(start, Number(requested.end || start + MAX_LINES - 1)), start + MAX_LINES - 1);
    const checksum = crypto.createHash("sha256").update(source.content).digest("hex");
    const observedChecksum = String(evidence.checksum || "");
    return {
        project,
        path: filePath,
        lines: allLines.slice(start - 1, end).map((text, index) => ({ line: start + index, text })),
        offset: start,
        total_lines: allLines.length,
        checksum,
        freshness: observedChecksum && observedChecksum !== checksum ? "drifted" : "current",
        sourceFreshness: source.freshness,
        contentStored: false,
    };
}
//# sourceMappingURL=event-file-source.js.map