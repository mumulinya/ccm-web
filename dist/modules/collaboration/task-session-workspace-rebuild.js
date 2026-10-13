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
exports.verifyTaskSessionWorkspaceRebuild = verifyTaskSessionWorkspaceRebuild;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const db_1 = require("../../core/db");
const execution_kernel_1 = require("../../agents/execution-kernel");
const execute = (0, util_1.promisify)(child_process_1.execFile);
async function git(directory, args) {
    const result = await execute("git", ["-C", directory, ...args], { windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024 });
    return String(result.stdout || "").trim();
}
function canonical(directory) {
    const actual = fs.realpathSync(directory);
    return process.platform === "win32" ? actual.toLowerCase() : actual;
}
async function common(directory) {
    return canonical(path.resolve(directory, await git(directory, ["rev-parse", "--git-common-dir"])));
}
/** A delivered lane can only be replaced from an authoritative merge record.
 * This never restores a terminal Run or claims Native Session compatibility. */
async function verifyTaskSessionWorkspaceRebuild(task, session, previous, workspacePath) {
    if (previous?.status !== "succeeded" || !previous.workspaceEvidence?.headCommit)
        return null;
    const matches = (0, execution_kernel_1.listExecutions)({ taskId: task.id }).filter(record => record.project === session.project
        && record.agent !== "test-agent" && record.state === "succeeded"
        && record.workspace?.mode === "worktree" && record.workspace.mergedAt
        && record.workspace.mergeCommit && record.workspace.originalWorkDir
        && path.resolve(record.workspace.worktreePath || record.workspace.workDir || "") === path.resolve(previous.workspacePath));
    if (!matches.length || new Set(matches.map(record => record.workspace.mergeCommit)).size !== 1)
        return null;
    const workspace = matches[0].workspace;
    const registered = (0, db_1.getConfigs)().flatMap(config => (0, db_1.getConfigInfo)(config.path)).filter(project => project.name === session.project);
    if (registered.length !== 1 || !registered[0].workDir || canonical(registered[0].workDir) !== canonical(workspace.originalWorkDir))
        return null;
    // Require successful original delivery, not a forced cleanup of failed work.
    if (!(task.delivery_history || []).some((row) => ["done", "completed"].includes(row.status) && row.acceptance_state === "accepted"))
        return null;
    const sourceCommon = await common(workspace.originalWorkDir);
    if (sourceCommon !== await common(workspacePath))
        return null;
    if (fs.existsSync(previous.workspacePath)) {
        if (sourceCommon !== await common(previous.workspacePath)
            || await git(previous.workspacePath, ["status", "--porcelain", "--untracked-files=all"]))
            return null;
        const deliveredHead = await git(previous.workspacePath, ["rev-parse", "HEAD"]);
        await git(workspace.originalWorkDir, ["merge-base", "--is-ancestor", deliveredHead, workspace.mergeCommit]);
    }
    else if (!workspace.cleanedAt)
        return null;
    if (await git(workspace.originalWorkDir, ["status", "--porcelain", "--untracked-files=all"])
        || await git(workspacePath, ["status", "--porcelain", "--untracked-files=all"]))
        return null;
    // Every replacement must contain both the reviewed developer commit and the
    // delivered merge. Git errors/unknown commits fail closed at the caller.
    await git(workspace.originalWorkDir, ["merge-base", "--is-ancestor", previous.workspaceEvidence.headCommit, workspace.mergeCommit]);
    await git(workspace.originalWorkDir, ["merge-base", "--is-ancestor", workspace.mergeCommit, "HEAD"]);
    await git(workspacePath, ["merge-base", "--is-ancestor", workspace.mergeCommit, "HEAD"]);
    return { mode: "rebuilt_from_delivery", merge_commit: workspace.mergeCommit,
        head_commit: await git(workspacePath, ["rev-parse", "HEAD"]), execution_id: matches[0].id };
}
//# sourceMappingURL=task-session-workspace-rebuild.js.map