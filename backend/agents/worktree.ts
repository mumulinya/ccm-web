import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

export type ChildAgentIsolationMode = "shared" | "worktree";

export interface PreparedAgentWorkDir {
  mode: ChildAgentIsolationMode;
  requestedMode: ChildAgentIsolationMode;
  workDir: string;
  originalWorkDir: string;
  worktreePath?: string;
  worktreeBranch?: string;
  baseHead?: string;
  baseBranch?: string;
  reused?: boolean;
  warning?: string;
}

function runGit(cwd: string, args: string[]) {
  return String(execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  })).trim();
}

function slugifyWorktreePart(value: string) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ensureManagedWorktreesIgnored(repoRoot: string) {
  const rawExcludePath = runGit(repoRoot, ["rev-parse", "--git-path", "info/exclude"]);
  const excludePath = path.isAbsolute(rawExcludePath) ? rawExcludePath : path.resolve(repoRoot, rawExcludePath);
  const pattern = ".cc-connect/worktrees/";
  const current = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, "utf-8") : "";
  if (current.split(/\r?\n/).some(line => line.trim() === pattern)) return;
  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  fs.appendFileSync(excludePath, `${current && !current.endsWith("\n") ? "\n" : ""}${pattern}\n`, "utf-8");
}

export function normalizeChildAgentIsolationMode(value: any): ChildAgentIsolationMode {
  return String(value || "").trim().toLowerCase() === "worktree" ? "worktree" : "shared";
}

function isRegisteredWorktree(repoRoot: string, worktreePath: string) {
  const target = path.resolve(worktreePath).toLowerCase();
  try {
    return runGit(repoRoot, ["worktree", "list", "--porcelain"])
      .split(/\r?\n/)
      .filter(line => line.startsWith("worktree "))
      .some(line => path.resolve(line.slice("worktree ".length).trim()).toLowerCase() === target);
  } catch {
    return false;
  }
}

function branchExists(repoRoot: string, branch: string) {
  try {
    runGit(repoRoot, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

export function createChildAgentWorktree(baseWorkDir: string, options: any = {}) {
  const rawWorkDir = String(baseWorkDir || "").trim();
  const originalWorkDir = rawWorkDir ? path.resolve(rawWorkDir) : "";
  if (!originalWorkDir || !fs.existsSync(originalWorkDir) || !fs.statSync(originalWorkDir).isDirectory()) {
    throw new Error("子 Agent 工作目录不存在，无法创建 worktree");
  }

  const repoRoot = runGit(originalWorkDir, ["rev-parse", "--show-toplevel"]);
  if (!repoRoot) throw new Error("当前工作目录不是 Git 仓库，无法创建 worktree");
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

  ensureManagedWorktreesIgnored(repoRoot);

  if (fs.existsSync(worktreePath)) {
    if (isRegisteredWorktree(repoRoot, worktreePath)) {
      return { worktreePath, worktreeBranch, reused: true, baseHead, baseBranch };
    }
    // 目录残留但 git 已不再管理它：清掉过期元数据后，空目录可安全重建；
    // 非空目录拒绝复用，避免把遗留改动当成干净工作区。
    try { runGit(repoRoot, ["worktree", "prune"]); } catch {}
    if (fs.readdirSync(worktreePath).length === 0) {
      fs.rmdirSync(worktreePath);
    } else {
      throw new Error(`worktree 目录已存在但未被 git 管理，拒绝复用：${worktreePath}`);
    }
  }

  fs.mkdirSync(worktreesDir, { recursive: true });
  if (branchExists(repoRoot, worktreeBranch)) {
    runGit(repoRoot, ["worktree", "add", worktreePath, worktreeBranch]);
  } else {
    runGit(repoRoot, ["worktree", "add", "-b", worktreeBranch, worktreePath, "HEAD"]);
  }
  return { worktreePath, worktreeBranch, reused: false, baseHead, baseBranch };
}

export function prepareChildAgentWorkDir(baseWorkDir: string, options: any = {}): PreparedAgentWorkDir {
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
  } catch (error: any) {
    if (options.failClosed === true) throw error;
    return {
      mode: "shared",
      requestedMode,
      workDir: originalWorkDir,
      originalWorkDir,
      warning: error?.message || String(error),
    };
  }
}

export function buildChildAgentWorktreeNotice(prepared: PreparedAgentWorkDir) {
  if (prepared.requestedMode !== "worktree") return "";
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
