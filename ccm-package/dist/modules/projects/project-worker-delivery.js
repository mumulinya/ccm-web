"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueProjectWorkerDelivery = enqueueProjectWorkerDelivery;
const child_process_1 = require("child_process");
function runGit(cwd, args) {
    return String((0, child_process_1.execFileSync)("git", args, {
        cwd,
        encoding: "utf-8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
    })).trim();
}
function commitPaths(worktreePath, commit) {
    return new Set(runGit(worktreePath, ["diff-tree", "--no-commit-id", "--name-only", "-r", commit])
        .split(/\r?\n/).map(value => value.trim().replace(/\\/g, "/").toLowerCase()).filter(Boolean));
}
function assertMainWorktreeSafe(mainWorkDir, changedPaths) {
    const porcelain = runGit(mainWorkDir, ["status", "--porcelain"]);
    const staged = porcelain.split(/\r?\n/).filter(line => line && line[0] !== " " && line[0] !== "?").length;
    if (staged)
        throw new Error("主工作区存在已暂存改动，已阻止自动合并第三方 Agent 交付");
    const conflicting = porcelain.split(/\r?\n/).map(line => line.slice(3).trim().replace(/\\/g, "/").toLowerCase()).filter(Boolean)
        .filter(file => changedPaths.has(file));
    if (conflicting.length)
        throw new Error(`主工作区已有同文件改动，已阻止自动覆盖：${conflicting.slice(0, 8).join("、")}`);
}
function cleanupWorktree(mainWorkDir, prepared) {
    runGit(mainWorkDir, ["worktree", "remove", prepared.worktreePath]);
    try {
        runGit(mainWorkDir, ["branch", "-D", prepared.worktreeBranch]);
    }
    catch { /* branch cleanup is best effort after worktree removal */ }
}
function enqueueProjectWorkerDelivery(input) {
    const { prepared, workItem, mainWorkDir } = input;
    if (prepared?.mode !== "worktree" || !prepared.worktreePath || !prepared.worktreeBranch) {
        return { queue: input.queue, promise: Promise.resolve(null) };
    }
    const run = async () => {
        const status = runGit(prepared.worktreePath, ["status", "--porcelain"]);
        if (!status) {
            cleanupWorktree(mainWorkDir, prepared);
            return { commit: "", branch: prepared.worktreeBranch, merged: true, cleaned: true };
        }
        runGit(prepared.worktreePath, ["add", "-A"]);
        runGit(prepared.worktreePath, ["commit", "-m", `ccm: ${workItem?.id || "work-item"}`]);
        const commit = runGit(prepared.worktreePath, ["rev-parse", "HEAD"]);
        const changed = commitPaths(prepared.worktreePath, commit);
        assertMainWorktreeSafe(mainWorkDir, changed);
        try {
            runGit(mainWorkDir, ["cherry-pick", commit]);
            cleanupWorktree(mainWorkDir, prepared);
            return { commit, branch: prepared.worktreeBranch, merged: true, cleaned: true };
        }
        catch (error) {
            try {
                runGit(mainWorkDir, ["cherry-pick", "--abort"]);
            }
            catch { /* preserve the original failure */ }
            throw new Error(`工作项 ${workItem?.title || workItem?.id || "unknown"} 合并失败，已保留隔离分支 ${prepared.worktreeBranch} 供处理：${String(error?.message || error)}`);
        }
    };
    const promise = input.queue.then(run);
    const queue = promise.then(() => undefined, () => undefined);
    return { queue, promise };
}
//# sourceMappingURL=project-worker-delivery.js.map