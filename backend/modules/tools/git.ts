import * as fs from "fs";
import * as path from "path";
import { execFileSync, spawn } from "child_process";
import { CCM_DIR, createUnifiedDiff, readWorkingFileText, sendJson } from "../../core/utils";
import { getConfigs, getConfigInfo, loadTasks } from "../../core/db";

const MAX_PATCH_BYTES = 2 * 1024 * 1024;
const LARGE_FILE_BYTES = 1024 * 1024;
const REMOTE_GIT_TIMEOUT_MS = 30_000;
const REMOTE_GIT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

type FileStats = { additions: number; deletions: number; binary: boolean };

function runGit(workDir: string, args: string[], options: any = {}) {
  const optionEnv = options?.env && typeof options.env === "object" ? options.env : {};
  return execFileSync("git", args, {
    cwd: workDir,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 12 * 1024 * 1024,
    timeout: 60_000,
    ...options,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", ...optionEnv },
  }) as string;
}

function tryGit(workDir: string, args: string[]) {
  try {
    return { ok: true, output: String(runGit(workDir, args) || "").trim() };
  } catch (error: any) {
    return { ok: false, output: "", error: safeGitError(error) };
  }
}

function safeGitError(error: any) {
  return String(error?.stderr || error?.stdout || error?.message || error || "Git 操作失败")
    .replace(/(https?:\/\/)[^/@\s]+@/gi, "$1")
    .replace(/([?&](?:access_token|auth_token|token|key|password)=)[^&\s]+/gi, "$1[已隐藏]")
    .replace(/(authorization:\s*(?:bearer|basic)\s+)[^\s]+/gi, "$1[已隐藏]")
    .replace(/[\0\r]+/g, " ")
    .trim()
    .slice(0, 2_000);
}

function gitCommandError(message: string, stdout = "", stderr = "", gitErrorCode = "") {
  const error: any = new Error(message);
  error.stdout = stdout;
  error.stderr = stderr;
  if (gitErrorCode) error.gitErrorCode = gitErrorCode;
  return error;
}

function killProcessTree(child: any) {
  const pid = Number(child?.pid || 0);
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        encoding: "utf-8",
        stdio: ["ignore", "ignore", "ignore"],
        windowsHide: true,
        timeout: 5_000,
      });
    } catch {
      try { child.kill(); } catch {}
    }
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try { child.kill("SIGTERM"); } catch {}
  }
}

function runGitRemote(workDir: string, args: string[], timeout = REMOTE_GIT_TIMEOUT_MS) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("git", ["-c", "credential.interactive=never", ...args], {
      cwd: workDir,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
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
      },
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    const append = (target: "stdout" | "stderr", chunk: any) => {
      const text = String(chunk || "");
      outputBytes += Buffer.byteLength(text, "utf-8");
      if (outputBytes > REMOTE_GIT_MAX_OUTPUT_BYTES) {
        outputExceeded = true;
        killProcessTree(child);
        return;
      }
      if (target === "stdout") stdout += text;
      else stderr += text;
    };
    child.stdout?.on("data", chunk => append("stdout", chunk));
    child.stderr?.on("data", chunk => append("stderr", chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree(child);
    }, timeout);
    child.once("error", error => {
      clearTimeout(timer);
      reject(gitCommandError(error.message || "无法启动 Git 远端操作", stdout, stderr));
    });
    child.once("close", code => {
      clearTimeout(timer);
      if (timedOut) {
        reject(gitCommandError(`Git 远端连接在 ${Math.ceil(timeout / 1_000)} 秒内没有完成`, stdout, stderr, "remote_timeout"));
        return;
      }
      if (outputExceeded) {
        reject(gitCommandError("Git 远端输出超过安全限制", stdout, stderr, "remote_output_exceeded"));
        return;
      }
      if (code !== 0) {
        reject(gitCommandError(`Git 远端操作失败（退出码 ${code ?? "unknown"}）`, stdout, stderr));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

function gitFailureDetails(error: any, operation: string) {
  const raw = safeGitError(error);
  const lower = raw.toLowerCase();
  if (error?.gitErrorCode === "remote_timeout") {
    return { error: "Git 远端连接超时，操作已停止", errorCode: "remote_timeout", suggestion: "检查服务器网络、代理和远端站点连通性后重试", raw };
  }
  if (error?.gitErrorCode === "remote_ahead") {
    return { error: "远端分支包含本地没有的提交，当前推送已被阻止", errorCode: "remote_ahead", suggestion: "先拉取代码并处理差异，再重新推送", raw };
  }
  if (/authentication failed|could not read username|terminal prompts disabled|permission denied \(publickey\)|http basic: access denied|403 forbidden|error:\s*403/.test(lower)) {
    return { error: "Git 远端认证失败，请先在服务器配置 Git 凭据或 SSH Key", errorCode: "authentication_required", suggestion: "完成 git credential 或 SSH 登录后重新执行推送", raw };
  }
  if (/repository not found|does not appear to be a git repository/.test(lower)) {
    return { error: "远端仓库不存在或当前账号没有访问权限", errorCode: "repository_unavailable", suggestion: "检查 origin 地址及仓库访问权限", raw };
  }
  if (/non-fast-forward|fetch first|rejected.*behind|updates were rejected/.test(lower)) {
    return { error: "远端分支包含本地没有的提交，当前推送已被拒绝", errorCode: "remote_ahead", suggestion: "先拉取代码并处理差异，再重新推送", raw };
  }
  if (/no upstream branch|has no upstream branch/.test(lower)) {
    return { error: "当前分支还没有关联远端分支", errorCode: "upstream_missing", suggestion: "使用首次推送建立 upstream", raw };
  }
  if (/timed out|timeout/.test(lower)) {
    return { error: "Git 远端连接超时", errorCode: "remote_timeout", suggestion: "检查服务器网络、代理和 GitHub 连通性后重试", raw };
  }
  return { error: raw || `${operation} 失败`, errorCode: "git_operation_failed", suggestion: "打开 Git 终端检查远端配置和当前分支状态", raw };
}

function sanitizeRemoteUrl(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return raw.replace(/^(https?:\/\/)[^/@\s]+@/i, "$1");
  }
}

export function inspectGitRemoteState(workDir: string, changedFiles = -1) {
  const branchResult = tryGit(workDir, ["branch", "--show-current"]);
  const branch = branchResult.ok ? branchResult.output : "";
  const remoteResult = tryGit(workDir, ["remote", "get-url", "origin"]);
  const remoteUrl = remoteResult.ok ? sanitizeRemoteUrl(remoteResult.output) : "";
  const upstreamResult = tryGit(workDir, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  const upstream = upstreamResult.ok ? upstreamResult.output : "";
  const remoteTrackingRef = !upstream && branch && remoteUrl && tryGit(workDir, ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`]).ok
    ? `origin/${branch}`
    : "";
  const comparisonRef = upstream || remoteTrackingRef;
  let ahead = 0;
  let behind = 0;
  if (comparisonRef) {
    const counts = tryGit(workDir, ["rev-list", "--left-right", "--count", `HEAD...${comparisonRef}`]);
    const match = counts.output.match(/^(\d+)\s+(\d+)$/);
    if (counts.ok && match) {
      ahead = Number(match[1]);
      behind = Number(match[2]);
    }
  }
  const changed = changedFiles >= 0
    ? changedFiles
    : parseGitStatus(String(tryGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]).output || "")).length;
  const detached = !branch;
  return {
    remoteUrl,
    remoteName: remoteUrl ? "origin" : "",
    branch: branch || "detached HEAD",
    detached,
    upstream,
    comparisonRef,
    ahead,
    behind,
    dirty: changed > 0,
    changedFiles: changed,
    canFetch: !!remoteUrl,
    canPull: !!remoteUrl && !detached && changed === 0,
    canPush: !!remoteUrl && !detached && behind === 0 && (!upstream || ahead > 0),
    canCommitAndPush: !!remoteUrl && !detached,
    pushState: !remoteUrl ? "remote_missing" : detached ? "detached" : behind > 0 ? "remote_ahead" : !upstream ? "first_push" : ahead > 0 ? "ready" : "up_to_date",
    pushTarget: upstream || (remoteUrl && branch ? `origin/${branch}` : ""),
    pullTarget: upstream || (remoteUrl && branch ? `origin/${branch}` : ""),
  };
}

async function performGitRemoteOperation(workDir: string, operation: string) {
  let before = inspectGitRemoteState(workDir);
  if (!before.remoteUrl) throw new Error("当前项目没有配置 origin 远端仓库");
  if (operation !== "fetch" && before.detached) throw new Error("当前处于 detached HEAD，不能更新或推送分支");
  if (operation === "pull" && before.dirty) throw new Error(`工作区有 ${before.changedFiles} 个未提交文件，请先提交或处理后再更新本地代码`);

  let args: string[];
  if (operation === "fetch") args = ["fetch", "--prune", "origin"];
  else if (operation === "pull") args = before.upstream
    ? ["pull", "--ff-only"]
    : ["pull", "--ff-only", "origin", before.branch];
  else if (operation === "push") {
    await runGitRemote(workDir, ["fetch", "--prune", "origin"]);
    before = inspectGitRemoteState(workDir);
    if (before.behind > 0) {
      throw gitCommandError("remote branch contains commits that are not available locally", "", "", "remote_ahead");
    }
    if (before.upstream && before.ahead === 0) {
      return {
        operation,
        output: "",
        noop: true,
        outcome: "up_to_date",
        repository: before,
      };
    }
    args = before.upstream ? ["push"] : ["push", "--set-upstream", "origin", before.branch];
  }
  else throw new Error("不支持的 Git 远端操作");

  const output = await runGitRemote(workDir, args);
  return {
    operation,
    output: output.slice(-4_000),
    noop: false,
    repository: inspectGitRemoteState(workDir),
  };
}

function commitSelectedChanges(workDir: string, message: string, requested: string[], allFiles: boolean) {
  let commitPaths: string[] = [];
  if (requested.length) {
    const preview = commitPreview(workDir, requested);
    if (preview.blocked) {
      const error: any = new Error(preview.conflicts.length ? "存在冲突文件，不能提交" : "所选文件已变化，请刷新后重试");
      error.preview = preview;
      throw error;
    }
    const stagingPaths = Array.from(new Set([
      ...requested,
      ...preview.files.map((file: any) => normalizeRepoPath(file.originalPath)).filter(Boolean),
    ]));
    runGit(workDir, ["add", "-A", "--", ...stagingPaths]);
    commitPaths = String(runGit(workDir, ["diff", "--cached", "--name-only", "-z", "--", ...stagingPaths]) || "").split("\0").filter(Boolean);
    if (!commitPaths.length) {
      return { hash: "", files: [], noop: true };
    }
    runGit(workDir, ["commit", "--only", "-m", message, "--", ...commitPaths]);
  } else if (allFiles) {
    runGit(workDir, ["add", "-A"]);
    runGit(workDir, ["commit", "-m", message]);
    commitPaths = String(runGit(workDir, ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"]) || "").split("\0").filter(Boolean);
  } else {
    throw new Error("请明确选择本次要提交的文件");
  }
  return { hash: runGit(workDir, ["rev-parse", "--short", "HEAD"]).trim(), files: commitPaths, noop: false };
}

function readJson(file: string, fallback: any) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function readBody(req: any, res: any, callback: (body: any) => void) {
  let body = "";
  req.on("data", (chunk: any) => {
    body += chunk;
    if (Buffer.byteLength(body, "utf-8") > MAX_PATCH_BYTES + 64 * 1024) req.destroy();
  });
  req.on("end", () => {
    try {
      callback(JSON.parse(body || "{}"));
    } catch (error: any) {
      sendJson(res, { success: false, error: "请求内容不是有效 JSON: " + error.message }, 400);
    }
  });
}

function projectWorkDir(project: string) {
  const config = getConfigs().find(item => item.name === project);
  if (!config) return { error: "项目不存在", status: 404 } as const;
  const workDir = getConfigInfo(config.path)[0]?.workDir;
  if (!workDir || !fs.existsSync(workDir)) return { error: "项目目录不存在", status: 400 } as const;
  return { workDir: path.resolve(workDir), config } as const;
}

export function normalizeRepoPath(filePath: any) {
  return String(filePath ?? "").replace(/\\/g, "/");
}

export function resolveSafeProjectFile(workDir: string, filePath: any) {
  const normalized = normalizeRepoPath(filePath);
  if (!normalized || normalized.includes("\0") || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    throw new Error("非法文件路径");
  }
  const root = path.resolve(workDir);
  const absolute = path.resolve(root, normalized);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) throw new Error("文件不在项目目录内");
  return { normalized, absolute };
}

function expandedRenamePath(rawPath: string) {
  const value = rawPath.trim();
  const braceMatch = value.match(/^(.*)\{([^{}]*) => ([^{}]*)\}(.*)$/);
  if (braceMatch) return `${braceMatch[1]}${braceMatch[3]}${braceMatch[4]}`;
  const arrow = value.lastIndexOf(" => ");
  if (arrow >= 0) return value.slice(arrow + 4).trim();
  return value;
}

function currentRenamePath(rawPath: string) {
  const value = rawPath.trim();
  const arrow = value.lastIndexOf(" -> ");
  return arrow >= 0 ? value.slice(arrow + 4).trim() : expandedRenamePath(value);
}

function statusPresentation(indexStatus: string, worktreeStatus: string) {
  const combined = `${indexStatus}${worktreeStatus}`;
  if (combined === "??") return { statusText: "未跟踪", statusColor: "#0f766e" };
  if (/U|AA|DD/.test(combined)) return { statusText: "冲突", statusColor: "#dc2626" };
  const label = (status: string) => {
    if (status === "M") return "修改";
    if (status === "A") return "新增";
    if (status === "D") return "删除";
    if (status === "R") return "重命名";
    if (status === "C") return "复制";
    if (status === "T") return "类型变化";
    return "变更";
  };
  const color = combined.includes("D")
    ? "#dc2626"
    : combined.includes("A") ? "#059669"
      : /R|C/.test(combined) ? "#7c3aed" : "#2563eb";
  if (indexStatus !== " " && worktreeStatus !== " ") {
    return { statusText: `已暂存${label(indexStatus)}，工作区又${label(worktreeStatus)}`, statusColor: color };
  }
  if (indexStatus !== " ") return { statusText: `已暂存${label(indexStatus)}`, statusColor: color };
  if (worktreeStatus !== " ") return { statusText: `工作区已${label(worktreeStatus)}`, statusColor: color };
  return { statusText: "文件已变化", statusColor: "#2563eb" };
}

export function parseGitStatus(output: string) {
  const raw = String(output || "");
  if (raw.includes("\0")) {
    const records = raw.split("\0");
    const files: any[] = [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (!record) continue;
      const statusCode = record.slice(0, 2).padEnd(2, " ");
      const indexStatus = statusCode[0] || " ";
      const worktreeStatus = statusCode[1] || " ";
      const filePath = record.slice(3);
      const renamed = /R|C/.test(statusCode);
      const originalPath = renamed ? String(records[index + 1] || "") : "";
      if (renamed) index += 1;
      const untracked = statusCode === "??";
      const conflict = /U/.test(statusCode) || ["AA", "DD"].includes(statusCode);
      files.push({
        path: filePath,
        originalPath,
        status: statusCode.trim() || statusCode,
        statusCode,
        indexStatus,
        worktreeStatus,
        staged: !untracked && indexStatus !== " " && indexStatus !== "?",
        unstaged: untracked || worktreeStatus !== " ",
        untracked,
        conflict,
        ...statusPresentation(indexStatus, worktreeStatus),
      });
    }
    return files;
  }
  return raw.split(/\r?\n/).filter(Boolean).map(line => {
    const statusCode = line.slice(0, 2).padEnd(2, " ");
    const originalPath = line.slice(3).trim();
    const filePath = currentRenamePath(originalPath);
    const indexStatus = statusCode[0] || " ";
    const worktreeStatus = statusCode[1] || " ";
    const untracked = statusCode === "??";
    const conflict = /U/.test(statusCode) || ["AA", "DD"].includes(statusCode);
    return {
      path: filePath,
      originalPath: originalPath === filePath ? "" : originalPath,
      status: statusCode.trim() || statusCode,
      statusCode,
      indexStatus,
      worktreeStatus,
      staged: !untracked && indexStatus !== " " && indexStatus !== "?",
      unstaged: untracked || worktreeStatus !== " ",
      untracked,
      conflict,
      ...statusPresentation(indexStatus, worktreeStatus),
    };
  });
}

export function parseNumstat(output: string) {
  const result = new Map<string, FileStats>();
  const raw = String(output || "");
  if (raw.includes("\0")) {
    const records = raw.split("\0");
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (!record) continue;
      const match = record.match(/^(-|\d+)\t(-|\d+)\t([\s\S]*)$/);
      if (!match) continue;
      let filePath = match[3];
      if (!filePath) {
        index += 1;
        const originalPath = String(records[index] || "");
        index += 1;
        filePath = String(records[index] || originalPath);
      }
      if (!filePath) continue;
      const binary = match[1] === "-" || match[2] === "-";
      result.set(normalizeRepoPath(filePath), {
        additions: binary ? 0 : Number(match[1] || 0),
        deletions: binary ? 0 : Number(match[2] || 0),
        binary,
      });
    }
    return result;
  }
  raw.split(/\r?\n/).filter(Boolean).forEach(line => {
    const [addRaw, deleteRaw, ...pathParts] = line.split("\t");
    const filePath = expandedRenamePath(pathParts.join("\t"));
    if (!filePath) return;
    const binary = addRaw === "-" || deleteRaw === "-";
    result.set(normalizeRepoPath(filePath), {
      additions: binary ? 0 : Number(addRaw || 0),
      deletions: binary ? 0 : Number(deleteRaw || 0),
      binary,
    });
  });
  return result;
}

function untrackedStats(workDir: string, filePath: string): FileStats {
  const state = readWorkingFileText(workDir, filePath);
  if (!state.exists || state.binary) return { additions: 0, deletions: 0, binary: !!state.binary };
  return { additions: state.text ? state.text.split(/\r?\n/).length : 0, deletions: 0, binary: false };
}

function taskFiles(task: any) {
  const values = [
    task?.delivery_summary?.actual_file_changes,
    task?.delivery_summary?.files_changed,
    task?.receipt?.files_changed,
    task?.file_changes?.files,
    task?.fileChanges?.files,
  ].flatMap(value => Array.isArray(value) ? value : []);
  return Array.from(new Set(values.map((item: any) => normalizeRepoPath(typeof item === "string" ? item : item?.path)).filter(Boolean)));
}

function verificationSummary(task: any) {
  const values = task?.delivery_summary?.verification_executed
    || task?.delivery_summary?.verification
    || task?.verification?.executed
    || task?.receipt?.verification
    || [];
  return (Array.isArray(values) ? values : [values]).map(value => String(value || "").trim()).filter(Boolean).slice(0, 4);
}

function timeOf(item: any) {
  const value = item?.finishedAt || item?.completed_at || item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function buildChangeContext(project: string, workDir: string, changedPaths: string[]) {
  const normalizedFiles = new Set(changedPaths.map(normalizeRepoPath));
  const tasks = loadTasks();
  const sessionStore = readJson(path.join(CCM_DIR, "task-agent-sessions.json"), { sessions: [] });
  const sessions = Array.isArray(sessionStore) ? sessionStore : sessionStore?.sessions || [];
  const runStore = readJson(path.join(CCM_DIR, "project-chat-runs.json"), { runs: [] });
  const projectRuns = (runStore?.runs || []).filter((run: any) => run?.project === project);

  const candidates = tasks.map((task: any) => {
    const files = taskFiles(task);
    const exactFiles = files.filter(file => normalizedFiles.has(file));
    const projectMatch = String(task?.target_project || task?.project || "") === project;
    const runMatch = projectRuns.some((run: any) => String(run?.taskId || run?.id || "") === String(task?.id || ""));
    if (!projectMatch && !exactFiles.length && !runMatch) return null;
    const session = sessions.filter((item: any) => item?.taskId === task?.id && (!item?.project || item.project === project)).sort((a: any, b: any) => timeOf(b) - timeOf(a))[0];
    return {
      taskId: String(task?.id || ""),
      title: String(task?.title || task?.business_goal || "关联任务"),
      status: String(task?.status || ""),
      updatedAt: new Date(timeOf(task) || Date.now()).toISOString(),
      traceId: String(task?.trace_id || task?.traceId || ""),
      groupId: String(task?.group_id || task?.groupId || ""),
      agent: String(session?.agentType || task?.runtime_override || task?.runtime || "项目 Agent"),
      files,
      exactFiles,
      association: exactFiles.length ? "exact" : "project_recent",
      verification: verificationSummary(task),
      acceptancePassed: task?.delivery_summary?.acceptance_gate_passed === true,
      _time: timeOf(task),
    };
  }).filter(Boolean);

  for (const run of projectRuns) {
    const files = (run?.fileChanges?.files || []).map((item: any) => normalizeRepoPath(typeof item === "string" ? item : item?.path)).filter(Boolean);
    const exactFiles = files.filter((file: string) => normalizedFiles.has(file));
    candidates.push({
      taskId: String(run?.taskId || run?.id || ""),
      title: String(run?.message || "项目 Agent 对话"),
      status: String(run?.status || ""),
      updatedAt: new Date(timeOf(run) || Date.now()).toISOString(),
      traceId: String(run?.trace_id || ""),
      groupId: "",
      agent: String(run?.agentType || run?.runtime || project),
      files,
      exactFiles,
      association: exactFiles.length ? "exact" : "project_recent",
      verification: [],
      acceptancePassed: run?.status === "done",
      _time: timeOf(run),
    });
  }

  const deduped = Array.from(new Map(candidates.sort((a: any, b: any) => b._time - a._time).map((item: any) => [item.taskId, item])).values()).slice(0, 3) as any[];
  const taskIds = new Set(deduped.map(item => item.taskId));
  const exactTaskIds = new Set(deduped.filter(item => item.association === "exact").map(item => item.taskId));
  let latestTestAgent: any = null;
  const testRunDir = path.join(CCM_DIR, "test-agent-runs");
  try {
    const files = fs.readdirSync(testRunDir).filter(file => /^tar_.+\.json$/.test(file) && !file.includes("stdout")).slice(-250);
    const matching = files.map(file => readJson(path.join(testRunDir, file), null)).filter((run: any) => {
      const sourceProjects = [...(run?.sourceBefore?.projects || []), ...(run?.sourceAfter?.projects || [])];
      const projectMatch = sourceProjects.some((item: any) => item?.name === project || path.resolve(item?.realWorkDir || item?.workDir || ".") === path.resolve(workDir));
      return run && (taskIds.has(String(run?.taskId || "")) || projectMatch);
    }).sort((a: any, b: any) => timeOf(b) - timeOf(a));
    const run = matching.find((item: any) => exactTaskIds.has(String(item?.taskId || ""))) || matching[0];
    if (run) {
      const report = run?.result?.report || {};
      latestTestAgent = {
        runId: String(run.id || ""),
        taskId: String(run.taskId || report.taskId || ""),
        status: String(report.status || run?.result?.outcome || run.status || ""),
        recommendation: String(report.recommendation || run?.result?.recommendation || ""),
        summary: String(report.summary || run.error || ""),
        finishedAt: String(report.finishedAt || run.finishedAt || ""),
        browserChecks: Array.isArray(report.browserResults) ? report.browserResults.length : Number(report.browserCheckCount || 0),
        association: exactTaskIds.has(String(run.taskId || report.taskId || "")) ? "exact" : "project_recent",
      };
    }
  } catch {}

  return {
    tasks: deduped.map(({ _time, ...item }) => item),
    latestTestAgent,
    attribution: deduped.some(item => item.association === "exact") ? "exact" : deduped.length ? "project_recent" : "none",
  };
}

export function buildGitStatusSummary(files: any[]) {
  const summary = files.reduce((acc, file) => {
    if (file.indexResidual) {
      acc.indexResidual += 1;
      return acc;
    }
    acc.total += 1;
    if (file.staged) acc.staged += 1;
    if (file.unstaged) acc.unstaged += 1;
    if (file.untracked) acc.untracked += 1;
    if (file.conflict) acc.conflicts += 1;
    if (file.binary) acc.binary += 1;
    if (file.large) acc.largeFiles += 1;
    acc.additions += Number(file.additions || 0);
    acc.deletions += Number(file.deletions || 0);
    const moduleName = normalizeRepoPath(file.path).split("/")[0] || "根目录";
    if (!acc.modules.includes(moduleName)) acc.modules.push(moduleName);
    return acc;
  }, { total: 0, staged: 0, unstaged: 0, untracked: 0, conflicts: 0, binary: 0, largeFiles: 0, indexResidual: 0, additions: 0, deletions: 0, modules: [] as string[] });
  const warnings: string[] = [];
  if (summary.conflicts) warnings.push(`${summary.conflicts} 个冲突文件会阻止提交`);
  if (summary.indexResidual) warnings.push(`${summary.indexResidual} 个暂存区索引残留已单独归类`);
  if (summary.untracked) warnings.push(`${summary.untracked} 个未跟踪文件需要确认`);
  if (summary.largeFiles) warnings.push(`${summary.largeFiles} 个大文件需要检查`);
  if (summary.binary) warnings.push(`${summary.binary} 个二进制文件无法逐行预览`);
  return { ...summary, modules: summary.modules.slice(0, 8), riskLevel: summary.conflicts ? "high" : warnings.length ? "medium" : "low", warnings };
}

function isIndexResidual(file: any) {
  return file?.indexStatus === "A" && file?.worktreeStatus === "D";
}

function cleanupIndexResiduals(workDir: string, requestedFiles: any[]) {
  const current = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]))
    .filter(isIndexResidual);
  const available = new Map(current.map(file => [normalizeRepoPath(file.path), file]));
  const requested = Array.from(new Set((requestedFiles || []).map(normalizeRepoPath).filter(Boolean))) as string[];
  if (!requested.length) throw new Error("没有选择要清理的索引残留");
  const invalid = requested.filter(file => !available.has(file));
  if (invalid.length) throw new Error(`文件状态已变化，请刷新后重试：${invalid.slice(0, 3).join("、")}`);
  requested.forEach(file => resolveSafeProjectFile(workDir, file));
  runGit(workDir, ["rm", "--cached", "--ignore-unmatch", "-f", "--", ...requested]);
  const remaining = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]))
    .filter(isIndexResidual)
    .map(file => file.path);
  return { cleaned: requested, remaining };
}

function parseDiffHunks(diff: string) {
  const hunks: any[] = [];
  let currentHunk: any = null;
  for (const line of String(diff || "").split("\n")) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
      if (!match) continue;
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = { header: line, oldStart: Number(match[1]), oldLines: Number(match[2] || 1), newStart: Number(match[3]), newLines: Number(match[4] || 1), context: match[5]?.trim() || "", changes: [] };
    } else if (currentHunk) {
      if (line.startsWith("+") && !line.startsWith("+++")) currentHunk.changes.push({ type: "add", content: line.slice(1) });
      else if (line.startsWith("-") && !line.startsWith("---")) currentHunk.changes.push({ type: "remove", content: line.slice(1) });
      else if (!line.startsWith("---") && !line.startsWith("+++")) currentHunk.changes.push({ type: "context", content: line.startsWith(" ") ? line.slice(1) : line });
    }
  }
  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}

export function validatePatchPaths(patchText: string) {
  if (!patchText || Buffer.byteLength(patchText, "utf-8") > MAX_PATCH_BYTES) throw new Error("Patch 为空或超过 2 MB 安全限制");
  const paths: string[] = [];
  for (const line of patchText.split(/\r?\n/)) {
    let value = "";
    if (line.startsWith("--- ") || line.startsWith("+++ ")) value = line.slice(4).split("\t")[0].trim();
    if (!value || value === "/dev/null") continue;
    value = value.replace(/^[ab]\//, "");
    const normalized = normalizeRepoPath(value);
    if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes("..")) throw new Error("Patch 包含非法文件路径");
    paths.push(normalized);
  }
  if (!paths.length) throw new Error("Patch 不包含可验证的文件路径");
  return Array.from(new Set(paths));
}

function fileStatus(workDir: string, filePath: string) {
  return runGit(workDir, ["-c", "core.quotepath=false", "status", "--porcelain", "--", filePath]).split("\n")[0] || "";
}

function commitPreview(workDir: string, requestedFiles: any[]) {
  const allFiles = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]));
  const files = Array.from(new Set((requestedFiles || []).map(normalizeRepoPath).filter(Boolean)));
  files.forEach(file => resolveSafeProjectFile(workDir, file));
  const selected = allFiles.filter(file => files.includes(normalizeRepoPath(file.path)));
  const outsideStaged = allFiles.filter(file => file.staged && !files.includes(normalizeRepoPath(file.path)));
  const conflicts = selected.filter(file => file.conflict);
  const warnings: string[] = [];
  if (selected.some(file => file.untracked)) warnings.push("包含未跟踪文件，提交后会开始受 Git 管理");
  if (selected.some(file => file.statusCode.includes("D"))) warnings.push("包含删除文件，请确认删除符合预期");
  if (outsideStaged.length) warnings.push(`暂存区还有 ${outsideStaged.length} 个未选文件，本次不会提交`);
  return {
    files: selected,
    requestedFiles: files,
    outsideStaged: outsideStaged.map(file => file.path),
    conflicts: conflicts.map(file => file.path),
    blocked: !files.length || selected.length !== files.length || conflicts.length > 0,
    warnings,
  };
}

export function handleGitApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/git/status" && req.method === "GET") {
    const project = String(parsed.query.project || "");
    if (!project) return sendJson(res, { error: "缺少项目参数" }, 400);
    const resolved = projectWorkDir(project);
    if ("error" in resolved) return sendJson(res, { error: resolved.error }, resolved.status);
    const { workDir } = resolved;
    try {
      runGit(workDir, ["rev-parse", "--is-inside-work-tree"]);
      const files = parseGitStatus(runGit(workDir, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"]));
      const stagedStats = parseNumstat(runGit(workDir, ["diff", "--staged", "--numstat", "-z"]));
      const workingStats = parseNumstat(runGit(workDir, ["diff", "--numstat", "-z"]));
      const hasHead = tryGit(workDir, ["rev-parse", "--verify", "HEAD"]).ok;
      const effectiveStats = hasHead
        ? parseNumstat(runGit(workDir, ["diff", "HEAD", "--numstat", "-z"]))
        : new Map<string, FileStats>();
      const enriched = files.map(file => {
        const safe = resolveSafeProjectFile(workDir, file.path);
        const staged = stagedStats.get(normalizeRepoPath(file.path)) || { additions: 0, deletions: 0, binary: false };
        const working = file.untracked ? untrackedStats(workDir, file.path) : (workingStats.get(normalizeRepoPath(file.path)) || { additions: 0, deletions: 0, binary: false });
        const indexResidual = isIndexResidual(file);
        const effective = file.untracked
          ? working
          : (effectiveStats.get(normalizeRepoPath(file.path)) || (indexResidual ? { additions: 0, deletions: 0, binary: false } : {
            additions: staged.additions + working.additions,
            deletions: staged.deletions + working.deletions,
            binary: staged.binary || working.binary,
          }));
        let size = 0;
        try { size = fs.existsSync(safe.absolute) ? fs.statSync(safe.absolute).size : 0; } catch {}
        return {
          ...file,
          indexResidual,
          effective: !indexResidual,
          stagedAdditions: staged.additions,
          stagedDeletions: staged.deletions,
          workingAdditions: working.additions,
          workingDeletions: working.deletions,
          additions: effective.additions,
          deletions: effective.deletions,
          binary: effective.binary,
          size,
          large: size > LARGE_FILE_BYTES,
        };
      });
      const branch = runGit(workDir, ["branch", "--show-current"]).trim() || "detached HEAD";
      const summary = buildGitStatusSummary(enriched);
      const context = buildChangeContext(project, workDir, enriched.filter(file => !file.indexResidual).map(file => file.path));
      const repository = {
        ...inspectGitRemoteState(workDir, enriched.length),
        changedFiles: summary.total,
        indexResidualFiles: summary.indexResidual,
      };
      sendJson(res, { success: true, branch, files: enriched, total: summary.total, rawTotal: enriched.length, summary, context, repository });
    } catch (error: any) {
      sendJson(res, { success: false, error: "无法读取 Git 工作区: " + (error.stderr || error.message) });
    }
    return true;
  }

  if (pathname === "/api/git/index-residuals/cleanup" && req.method === "POST") {
    readBody(req, res, body => {
      const project = String(body.project || "").trim();
      const resolved = projectWorkDir(project);
      if (!project || !Array.isArray(body.files)) return sendJson(res, { success: false, error: "缺少项目或文件列表" }, 400);
      if (body.confirmed !== true) return sendJson(res, { success: false, error: "清理索引残留需要用户明确确认", confirmationRequired: true }, 409);
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      try {
        const result = cleanupIndexResiduals(resolved.workDir, body.files);
        sendJson(res, {
          success: true,
          message: `已清理 ${result.cleaned.length} 个暂存区索引残留，本地有效文件未被删除`,
          cleanedFiles: result.cleaned,
          remaining: result.remaining.length,
        });
      } catch (error: any) {
        sendJson(res, { success: false, error: "清理索引残留失败: " + safeGitError(error) }, 409);
      }
    });
    return true;
  }

  if (pathname === "/api/git/remote-operation" && req.method === "POST") {
    readBody(req, res, async body => {
      const project = String(body.project || "").trim();
      const operation = String(body.operation || "").trim().toLowerCase();
      const resolved = projectWorkDir(project);
      if (!project || !["fetch", "pull", "push"].includes(operation)) {
        return sendJson(res, { success: false, error: "缺少项目或 Git 操作无效" }, 400);
      }
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      if (operation !== "fetch" && body.confirmed !== true) {
        return sendJson(res, { success: false, error: "该操作需要用户明确确认", confirmationRequired: true }, 409);
      }
      try {
        runGit(resolved.workDir, ["rev-parse", "--is-inside-work-tree"]);
        const result = await performGitRemoteOperation(resolved.workDir, operation);
        const message = result.noop
          ? "当前分支已与远端同步，没有待推送提交"
          : operation === "fetch"
          ? "远端引用已拉取"
          : operation === "pull" ? "本地分支已更新" : "本地提交已推送";
        sendJson(res, { success: true, message, ...result });
      } catch (error: any) {
        sendJson(res, { success: false, ...gitFailureDetails(error, operation), operation }, 409);
      }
    });
    return true;
  }

  if (pathname === "/api/git/diff" && req.method === "GET") {
    const project = String(parsed.query.project || "");
    const staged = parsed.query.staged === "true";
    const resolved = projectWorkDir(project);
    if (!project || !parsed.query.file) return sendJson(res, { error: "缺少参数" }, 400);
    if ("error" in resolved) return sendJson(res, { error: resolved.error }, resolved.status);
    try {
      const { normalized: filePath } = resolveSafeProjectFile(resolved.workDir, parsed.query.file);
      const statusLine = fileStatus(resolved.workDir, filePath);
      const statusCode = statusLine.slice(0, 2);
      let diff = runGit(resolved.workDir, staged ? ["diff", "--staged", "--", filePath] : ["diff", "--", filePath]);
      let reason = "";
      let truncated = false;
      if (!staged && !diff.trim() && (statusCode === "??" || statusCode.includes("A"))) {
        const afterState = readWorkingFileText(resolved.workDir, filePath);
        if (afterState.binary) reason = "二进制文件无法做文本对比";
        else if (afterState.exists) {
          diff = createUnifiedDiff("", afterState.text, filePath);
          truncated = !!(afterState.truncated || afterState.tooLarge);
          if (truncated) reason = "文件过大，仅展示前半部分内容";
        }
      }
      const additions = diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++")).length;
      const deletions = diff.split("\n").filter(line => line.startsWith("-") && !line.startsWith("---")).length;
      sendJson(res, { success: true, file: filePath, hunks: parseDiffHunks(diff), raw: diff, reason, truncated, additions, deletions });
    } catch (error: any) {
      sendJson(res, { success: false, error: "获取 diff 失败: " + (error.stderr || error.message) });
    }
    return true;
  }

  if (pathname === "/api/git/file" && req.method === "GET") {
    const project = String(parsed.query.project || "");
    const resolved = projectWorkDir(project);
    if (!project || !parsed.query.file) return sendJson(res, { error: "缺少参数" }, 400);
    if ("error" in resolved) return sendJson(res, { error: resolved.error }, resolved.status);
    try {
      const { normalized: filePath } = resolveSafeProjectFile(resolved.workDir, parsed.query.file);
      const state = readWorkingFileText(resolved.workDir, filePath);
      return sendJson(res, { success: true, project, file: filePath, exists: !!state.exists, binary: !!state.binary, text: state.binary ? "" : state.text || "", truncated: !!(state.truncated || state.tooLarge), size: state.size || 0 });
    } catch (error: any) {
      return sendJson(res, { success: false, error: error.message }, 400);
    }
  }

  if (pathname === "/api/git/commit-preview" && req.method === "POST") {
    readBody(req, res, body => {
      const project = String(body.project || "");
      const resolved = projectWorkDir(project);
      if (!project || !Array.isArray(body.files)) return sendJson(res, { success: false, error: "缺少项目或文件列表" }, 400);
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      try {
        sendJson(res, { success: true, preview: commitPreview(resolved.workDir, body.files) });
      } catch (error: any) {
        sendJson(res, { success: false, error: "提交预检失败: " + error.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/git/commit" && req.method === "POST") {
    readBody(req, res, async body => {
      const project = String(body.project || "");
      const message = String(body.message || "").trim();
      const action = String(body.action || "commit").trim().toLowerCase();
      const resolved = projectWorkDir(project);
      if (!project || !message) return sendJson(res, { success: false, error: "缺少项目或提交信息" }, 400);
      if (!["commit", "commit_and_push"].includes(action)) return sendJson(res, { success: false, error: "不支持的提交操作" }, 400);
      if (message.length > 300) return sendJson(res, { success: false, error: "提交信息不能超过 300 个字符" }, 400);
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      try {
        const requested = Array.isArray(body.files) ? Array.from(new Set(body.files.map(normalizeRepoPath).filter(Boolean))) as string[] : [];
        const allFiles = body.allFiles === true && body.confirmed === true;
        if (!requested.length && !allFiles) return sendJson(res, { success: false, error: "请明确选择本次要提交的文件" }, 400);
        if (action === "commit_and_push") {
          const preflight = inspectGitRemoteState(resolved.workDir);
          if (!preflight.remoteUrl) return sendJson(res, { success: false, error: "当前项目没有配置 origin 远端仓库", errorCode: "remote_missing" }, 409);
          if (preflight.detached) return sendJson(res, { success: false, error: "当前处于 detached HEAD，不能提交并推送", errorCode: "detached_head" }, 409);
        }
        const committed = commitSelectedChanges(resolved.workDir, message, requested, allFiles);
        if (committed.noop) {
          sendJson(res, {
            success: true,
            action,
            outcome: "no_changes",
            message: "所选文件同步后没有可提交内容，变更状态已刷新",
            commit: { success: false, noop: true, hash: "" },
            push: null,
            hash: "",
            committedFiles: [],
            committedAllFiles: allFiles,
            verification: body.verification || "not_recorded",
          });
          return;
        }
        const hash = committed.hash;
        const base = { hash, committedFiles: committed.files, committedAllFiles: allFiles, verification: body.verification || "not_recorded" };
        if (action === "commit") {
          sendJson(res, { success: true, action, outcome: "committed", message: "代码已提交到本地仓库", commit: { success: true, hash }, push: null, ...base });
          return;
        }
        try {
          const pushed = await performGitRemoteOperation(resolved.workDir, "push");
          sendJson(res, { success: true, action, outcome: "committed_and_pushed", message: "代码已提交并推送到远端", commit: { success: true, hash }, push: { success: true, ...pushed }, ...base });
        } catch (pushError: any) {
          const failure = gitFailureDetails(pushError, "push");
          sendJson(res, {
            success: true,
            action,
            outcome: "committed_push_failed",
            partialSuccess: true,
            message: `本地提交 ${hash} 已创建，但推送失败`,
            commit: { success: true, hash },
            push: { success: false, ...failure },
            ...base,
          });
        }
      } catch (error: any) {
        const preview = error?.preview;
        sendJson(res, { success: false, error: "提交失败: " + safeGitError(error), ...(preview ? { preview } : {}) }, preview ? 409 : 400);
      }
    });
    return true;
  }

  if (pathname === "/api/git/rollback" && req.method === "POST") {
    readBody(req, res, body => {
      const project = String(body.project || "");
      const resolved = projectWorkDir(project);
      if (!project || !body.file) return sendJson(res, { success: false, error: "缺少参数" }, 400);
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      try {
        const { normalized: filePath } = resolveSafeProjectFile(resolved.workDir, body.file);
        const status = fileStatus(resolved.workDir, filePath).slice(0, 2);
        if (status === "??") return sendJson(res, { success: false, error: "未跟踪文件不会自动删除，请确认内容后在文件系统中处理" }, 409);
        if (body.staged) runGit(resolved.workDir, ["restore", "--staged", "--", filePath]);
        else runGit(resolved.workDir, ["restore", "--worktree", "--", filePath]);
        sendJson(res, { success: true, message: body.staged ? "已取消暂存" : "已丢弃工作区改动", action: body.staged ? "unstage" : "discard" });
      } catch (error: any) {
        sendJson(res, { success: false, error: "操作失败: " + String(error.stderr || error.message).trim() });
      }
    });
    return true;
  }

  if (pathname === "/api/git/log" && req.method === "GET") {
    const project = String(parsed.query.project || "");
    const resolved = projectWorkDir(project);
    if (!project) return sendJson(res, { error: "缺少项目参数" }, 400);
    if ("error" in resolved) return sendJson(res, { error: resolved.error }, resolved.status);
    try {
      const limit = Math.min(Math.max(Number(parsed.query.limit || 20), 1), 100);
      const log = runGit(resolved.workDir, ["log", "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%at%x1f%s", "-n", String(limit)]);
      const commits = log.split("\n").filter(Boolean).map(line => {
        const [hash, shortHash, author, email, timestamp, message] = line.split("\x1f");
        return { hash, shortHash, author, email, timestamp: new Date(Number(timestamp) * 1000).toISOString(), message };
      });
      sendJson(res, { success: true, commits });
    } catch (error: any) {
      sendJson(res, { success: false, error: "获取提交历史失败: " + error.message });
    }
    return true;
  }

  if (pathname === "/api/git/apply-patch" && req.method === "POST") {
    readBody(req, res, body => {
      const project = String(body.project || "");
      const patchText = String(body.patchText || "");
      const resolved = projectWorkDir(project);
      if (!project || !patchText) return sendJson(res, { success: false, error: "缺少参数" }, 400);
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      try {
        const patchPaths = validatePatchPaths(patchText);
        patchPaths.forEach(file => resolveSafeProjectFile(resolved.workDir, file));
        if (body.file && !patchPaths.includes(normalizeRepoPath(body.file))) throw new Error("Patch 与当前文件不一致");
        const args = ["apply", "--recount", "--whitespace=nowarn"];
        if (body.cached) args.push("--cached");
        if (body.revert) args.push("-R");
        runGit(resolved.workDir, [...args, "--check"], { input: patchText });
        runGit(resolved.workDir, args, { input: patchText });
        sendJson(res, { success: true, message: "Patch 已通过检查并应用", checked: true, files: patchPaths });
      } catch (error: any) {
        sendJson(res, { success: false, error: "应用 Patch 失败: " + String(error.stderr || error.message).trim() });
      }
    });
    return true;
  }

  return false;
}
