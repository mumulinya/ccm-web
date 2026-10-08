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
exports.captureAgentRunGitEvidence = captureAgentRunGitEvidence;
exports.captureAgentRunWorkspaceEvidence = captureAgentRunWorkspaceEvidence;
exports.verifyAgentRunWorkspaceEvidence = verifyAgentRunWorkspaceEvidence;
const crypto = __importStar(require("crypto"));
const childProcess = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const git_workspace_runtime_1 = require("../modules/tools/git-workspace-runtime");
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function text(value) { return String(value ?? "").trim(); }
function git(workspacePath, args) {
    try {
        return childProcess.execFileSync("git", ["-C", workspacePath, ...args], {
            encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 4 * 1024 * 1024,
        }).trim();
    }
    catch {
        return "";
    }
}
/** Collects a bounded Git summary for Finalize. Diff content is hashed and
 * discarded; only the file list and checksum are persisted as artifacts. */
function captureAgentRunGitEvidence(workspacePath) {
    const root = text(git(workspacePath, ["rev-parse", "--show-toplevel"]));
    if (!root)
        return null;
    const headCommit = text(git(workspacePath, ["rev-parse", "HEAD"]));
    const status = git(workspacePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
    const changedFiles = status.split(/\r?\n/).map(line => line.slice(3).trim()).filter(Boolean).slice(0, 500);
    const diff = `${git(workspacePath, ["diff", "--no-ext-diff", "--binary", "HEAD"])}\n${git(workspacePath, ["diff", "--cached", "--no-ext-diff", "--binary"])}`;
    return { repositoryRoot: root, headCommit, changedFiles, diffChecksum: hash(diff), capturedAt: new Date().toISOString() };
}
async function captureAgentRunWorkspaceEvidence(run) {
    const rawWorkspacePath = text(run.workspacePath);
    if (!rawWorkspacePath)
        throw new Error("AgentRun 工作区不存在");
    const workspacePath = path.resolve(rawWorkspacePath);
    if (!fs.existsSync(workspacePath))
        throw new Error("AgentRun 工作区不存在");
    try {
        const snapshot = await (0, git_workspace_runtime_1.captureWorkspaceSnapshot)(workspacePath);
        return {
            runId: run.runId,
            workspacePath,
            worktreeId: text(run.worktreeId),
            repositoryRoot: text(snapshot.repository?.repository_root),
            headCommit: text(snapshot.repository?.head),
            statusChecksum: text(snapshot.status_checksum),
            indexChecksum: text(snapshot.index_checksum),
            contentChecksum: text(snapshot.worktree_content_checksum),
            capturedAt: text(snapshot.captured_at) || new Date().toISOString(),
        };
    }
    catch {
        const stat = fs.statSync(workspacePath);
        return {
            runId: run.runId,
            workspacePath,
            worktreeId: text(run.worktreeId),
            repositoryRoot: workspacePath,
            headCommit: "",
            statusChecksum: hash({ mtimeMs: stat.mtimeMs, size: stat.size }),
            indexChecksum: "unavailable",
            contentChecksum: hash({ path: workspacePath, mtimeMs: stat.mtimeMs, size: stat.size }),
            capturedAt: new Date().toISOString(),
        };
    }
}
async function verifyAgentRunWorkspaceEvidence(run, expected) {
    if (!text(run.workspacePath) || !fs.existsSync(run.workspacePath))
        return { valid: false, reason: "workspace_missing" };
    const actual = await captureAgentRunWorkspaceEvidence(run);
    if (expected?.workspacePath && path.resolve(String(expected.workspacePath)) !== path.resolve(actual.workspacePath))
        return { valid: false, reason: "workspace_path_changed", actual };
    if (expected?.worktreeId && String(expected.worktreeId) !== actual.worktreeId)
        return { valid: false, reason: "worktree_changed", actual };
    for (const key of ["repositoryRoot", "headCommit", "statusChecksum", "indexChecksum", "contentChecksum"]) {
        if (expected?.[key] && String(expected[key]) !== String(actual[key]))
            return { valid: false, reason: `${key}_changed`, actual };
    }
    return { valid: true, reason: "workspace_evidence_ok", actual };
}
//# sourceMappingURL=agent-run-workspace.js.map