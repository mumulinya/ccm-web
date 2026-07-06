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
exports.normalizeChildAgentIsolationMode = normalizeChildAgentIsolationMode;
exports.createChildAgentWorktree = createChildAgentWorktree;
exports.prepareChildAgentWorkDir = prepareChildAgentWorkDir;
exports.buildChildAgentWorktreeNotice = buildChildAgentWorktreeNotice;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
function runGit(cwd, args) {
    return String((0, child_process_1.execFileSync)("git", args, {
        cwd,
        encoding: "utf-8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
    })).trim();
}
function slugifyWorktreePart(value) {
    return String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}
function normalizeChildAgentIsolationMode(value) {
    return String(value || "").trim().toLowerCase() === "worktree" ? "worktree" : "shared";
}
function createChildAgentWorktree(baseWorkDir, options = {}) {
    const rawWorkDir = String(baseWorkDir || "").trim();
    const originalWorkDir = rawWorkDir ? path.resolve(rawWorkDir) : "";
    if (!originalWorkDir || !fs.existsSync(originalWorkDir) || !fs.statSync(originalWorkDir).isDirectory()) {
        throw new Error("子 Agent 工作目录不存在，无法创建 worktree");
    }
    const repoRoot = runGit(originalWorkDir, ["rev-parse", "--show-toplevel"]);
    if (!repoRoot)
        throw new Error("当前工作目录不是 Git 仓库，无法创建 worktree");
    const baseHead = runGit(repoRoot, ["rev-parse", "HEAD"]);
    const baseBranch = runGit(repoRoot, ["branch", "--show-current"]);
    const taskPart = slugifyWorktreePart(options.taskId || "task");
    const agentPart = slugifyWorktreePart(options.agentName || "agent");
    const sourcePart = slugifyWorktreePart(options.sourceProject || "main");
    const reusePart = slugifyWorktreePart(options.reuseKey || options.sessionScopeId || "");
    const nonce = reusePart ? "" : Date.now().toString(36);
    const slug = slugifyWorktreePart([taskPart, sourcePart, agentPart, reusePart, nonce].filter(Boolean).join("-")).slice(0, 64);
    const worktreesDir = path.join(repoRoot, ".cc-connect", "worktrees");
    const worktreePath = path.join(worktreesDir, slug);
    const worktreeBranch = `ccm/${slug}`;
    if (fs.existsSync(worktreePath)) {
        return { worktreePath, worktreeBranch, reused: true, baseHead, baseBranch };
    }
    fs.mkdirSync(worktreesDir, { recursive: true });
    runGit(repoRoot, ["worktree", "add", "-b", worktreeBranch, worktreePath, "HEAD"]);
    return { worktreePath, worktreeBranch, reused: false, baseHead, baseBranch };
}
function prepareChildAgentWorkDir(baseWorkDir, options = {}) {
    const requestedMode = normalizeChildAgentIsolationMode(options.mode || options.isolation);
    const rawWorkDir = String(baseWorkDir || "").trim();
    const originalWorkDir = rawWorkDir ? path.resolve(rawWorkDir) : "";
    if (requestedMode !== "worktree") {
        return { mode: "shared", requestedMode, workDir: originalWorkDir, originalWorkDir };
    }
    try {
        const info = createChildAgentWorktree(originalWorkDir, options);
        return {
            mode: "worktree",
            requestedMode,
            workDir: info.worktreePath,
            originalWorkDir,
            worktreePath: info.worktreePath,
            worktreeBranch: info.worktreeBranch,
            baseHead: info.baseHead,
            baseBranch: info.baseBranch,
            reused: info.reused,
        };
    }
    catch (error) {
        if (options.failClosed === true)
            throw error;
        return {
            mode: "shared",
            requestedMode,
            workDir: originalWorkDir,
            originalWorkDir,
            warning: error?.message || String(error),
        };
    }
}
function buildChildAgentWorktreeNotice(prepared) {
    if (prepared.requestedMode !== "worktree")
        return "";
    if (prepared.mode === "worktree") {
        return [
            "子 Agent 工作区隔离：",
            `- 已为本次任务创建独立 Git worktree：${prepared.worktreePath}`,
            `- 分支：${prepared.worktreeBranch || "未知"}`,
            `- 原项目目录：${prepared.originalWorkDir}`,
            "- 只在当前 worktree 中修改、验证并汇报文件；完成后在回执中写明 worktree 路径和分支，方便主 Agent 合并或人工检查。",
        ].join("\n");
    }
    return [
        "子 Agent 工作区隔离：",
        `- 本次请求了 worktree 隔离，但创建失败，已降级到共享工作目录：${prepared.originalWorkDir}`,
        `- 降级原因：${prepared.warning || "未知"}`,
        "- 修改前必须格外谨慎，避免覆盖用户或其他 Agent 的未完成改动。",
    ].join("\n");
}
//# sourceMappingURL=worktree.js.map