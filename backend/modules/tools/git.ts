import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { CCM_DIR, createUnifiedDiff, readWorkingFileText, sendJson } from "../../core/utils";
import { getConfigs, getConfigInfo } from "../../core/db";

const MAX_PATCH_BYTES = 2 * 1024 * 1024;
const LARGE_FILE_BYTES = 1024 * 1024;

type FileStats = { additions: number; deletions: number; binary: boolean };

function runGit(workDir: string, args: string[], options: any = {}) {
  return execFileSync("git", args, {
    cwd: workDir,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 12 * 1024 * 1024,
    ...options,
  }) as string;
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
  return String(filePath || "").trim().replace(/\\/g, "/");
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

function currentRenamePath(rawPath: string) {
  const value = rawPath.trim();
  const arrow = value.lastIndexOf(" -> ");
  return arrow >= 0 ? value.slice(arrow + 4).trim() : value;
}

function statusPresentation(indexStatus: string, worktreeStatus: string) {
  const combined = `${indexStatus}${worktreeStatus}`;
  if (combined === "??") return { statusText: "未跟踪", statusColor: "#0f766e" };
  if (/U|AA|DD/.test(combined)) return { statusText: "冲突", statusColor: "#dc2626" };
  if (combined.includes("R")) return { statusText: "重命名", statusColor: "#7c3aed" };
  if (combined.includes("D")) return { statusText: "已删除", statusColor: "#dc2626" };
  if (combined.includes("A")) return { statusText: "新增", statusColor: "#059669" };
  if (combined.includes("C")) return { statusText: "已复制", statusColor: "#7c3aed" };
  return { statusText: "已修改", statusColor: "#2563eb" };
}

export function parseGitStatus(output: string) {
  return String(output || "").split("\n").filter(Boolean).map(line => {
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
  String(output || "").split("\n").filter(Boolean).forEach(line => {
    const [addRaw, deleteRaw, ...pathParts] = line.split("\t");
    const filePath = pathParts.join("\t").trim();
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
  const taskStore = readJson(path.join(CCM_DIR, "tasks.json"), []);
  const tasks = Array.isArray(taskStore) ? taskStore : taskStore?.tasks || [];
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
  }, { total: 0, staged: 0, unstaged: 0, untracked: 0, conflicts: 0, binary: 0, largeFiles: 0, additions: 0, deletions: 0, modules: [] as string[] });
  const warnings: string[] = [];
  if (summary.conflicts) warnings.push(`${summary.conflicts} 个冲突文件会阻止提交`);
  if (summary.untracked) warnings.push(`${summary.untracked} 个未跟踪文件需要确认`);
  if (summary.largeFiles) warnings.push(`${summary.largeFiles} 个大文件需要检查`);
  if (summary.binary) warnings.push(`${summary.binary} 个二进制文件无法逐行预览`);
  return { ...summary, modules: summary.modules.slice(0, 8), riskLevel: summary.conflicts ? "high" : warnings.length ? "medium" : "low", warnings };
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
  const allFiles = parseGitStatus(runGit(workDir, ["-c", "core.quotepath=false", "status", "--porcelain"]));
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
      const files = parseGitStatus(runGit(workDir, ["-c", "core.quotepath=false", "status", "--porcelain"]));
      const stagedStats = parseNumstat(runGit(workDir, ["-c", "core.quotepath=false", "diff", "--staged", "--numstat"]));
      const workingStats = parseNumstat(runGit(workDir, ["-c", "core.quotepath=false", "diff", "--numstat"]));
      const enriched = files.map(file => {
        const safe = resolveSafeProjectFile(workDir, file.path);
        const staged = stagedStats.get(normalizeRepoPath(file.path)) || { additions: 0, deletions: 0, binary: false };
        const working = file.untracked ? untrackedStats(workDir, file.path) : (workingStats.get(normalizeRepoPath(file.path)) || { additions: 0, deletions: 0, binary: false });
        let size = 0;
        try { size = fs.existsSync(safe.absolute) ? fs.statSync(safe.absolute).size : 0; } catch {}
        return {
          ...file,
          stagedAdditions: staged.additions,
          stagedDeletions: staged.deletions,
          workingAdditions: working.additions,
          workingDeletions: working.deletions,
          additions: staged.additions + working.additions,
          deletions: staged.deletions + working.deletions,
          binary: staged.binary || working.binary,
          size,
          large: size > LARGE_FILE_BYTES,
        };
      });
      const branch = runGit(workDir, ["branch", "--show-current"]).trim() || "detached HEAD";
      const summary = buildGitStatusSummary(enriched);
      const context = buildChangeContext(project, workDir, enriched.map(file => file.path));
      sendJson(res, { success: true, branch, files: enriched, total: enriched.length, summary, context });
    } catch (error: any) {
      sendJson(res, { success: false, error: "无法读取 Git 工作区: " + (error.stderr || error.message) });
    }
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
    readBody(req, res, body => {
      const project = String(body.project || "");
      const message = String(body.message || "").trim();
      const resolved = projectWorkDir(project);
      if (!project || !message) return sendJson(res, { success: false, error: "缺少项目或提交信息" }, 400);
      if (message.length > 300) return sendJson(res, { success: false, error: "提交信息不能超过 300 个字符" }, 400);
      if ("error" in resolved) return sendJson(res, { success: false, error: resolved.error }, resolved.status);
      try {
        const requested = Array.isArray(body.files) ? Array.from(new Set(body.files.map(normalizeRepoPath).filter(Boolean))) as string[] : [];
        if (requested.length) {
          const preview = commitPreview(resolved.workDir, requested);
          if (preview.blocked) return sendJson(res, { success: false, error: preview.conflicts.length ? "存在冲突文件，不能提交" : "所选文件已变化，请刷新后重试", preview }, 409);
          runGit(resolved.workDir, ["add", "-A", "--", ...requested]);
          runGit(resolved.workDir, ["commit", "--only", "-m", message, "--", ...requested]);
        } else {
          runGit(resolved.workDir, ["add", "-A"]);
          runGit(resolved.workDir, ["commit", "-m", message]);
        }
        const hash = runGit(resolved.workDir, ["rev-parse", "--short", "HEAD"]).trim();
        sendJson(res, { success: true, message: "提交成功", hash, committedFiles: requested, verification: body.verification || "not_recorded" });
      } catch (error: any) {
        sendJson(res, { success: false, error: "提交失败: " + String(error.stderr || error.message).trim() });
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
