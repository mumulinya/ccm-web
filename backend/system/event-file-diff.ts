import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { listExecutions } from "../agents/execution-kernel";
import { listExecutionRecoveryManifests } from "../agents/execution-recovery";
import { createUnifiedDiff, getWorkDirForProject } from "../core/utils";
import type { UserVisibleAgentEvent } from "./user-visible-agent-events";

const MAX_DIFF_CHARS = 240_000;
const SENSITIVE_FILE_PATTERN = /(^|\/)(?:\.env(?:\.|$)|\.npmrc$|\.pypirc$|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)|credentials?(?:\.|$)|secrets?(?:\.|$)|[^/]+\.(?:pem|key|p12|pfx|jks|keystore))$/i;

function normalizedPath(value: any) {
  const result = String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
  if (!result || path.posix.isAbsolute(result) || result.split("/").some(part => part === "..")) {
    throw Object.assign(new Error("文件路径无效或超出项目边界"), { statusCode: 400 });
  }
  if (SENSITIVE_FILE_PATTERN.test(result)) {
    throw Object.assign(new Error("敏感文件不支持在线查看差异"), { statusCode: 403 });
  }
  return result;
}

function git(cwd: string, args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  return {
    ok: result.status === 0,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || "").trim(),
  };
}

function objectExists(repoRoot: string, object: string) {
  return !!object && git(repoRoot, ["cat-file", "-e", object]).ok;
}

function untrackedFileDiff(workDir: string, filePath: string) {
  const tracked = git(workDir, ["ls-files", "--error-unmatch", "--", filePath]);
  const absolute = path.resolve(workDir, filePath);
  const root = path.resolve(workDir);
  if (tracked.ok || (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) || !fs.existsSync(absolute)) return "";
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) return "";
  const realRoot = fs.realpathSync.native(root);
  const realFile = fs.realpathSync.native(absolute);
  if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${path.sep}`)) return "";
  if (stat.size > 1_500_000) return "";
  const content = fs.readFileSync(absolute, "utf-8");
  if (content.includes("\0")) return "";
  return createUnifiedDiff("", content, filePath);
}

function boundedDiff(raw: string) {
  if (raw.length <= MAX_DIFF_CHARS) return { raw, truncated: false };
  return { raw: `${raw.slice(0, MAX_DIFF_CHARS)}\n\n[Diff过长，已截断]`, truncated: true };
}

function counts(raw: string) {
  const lines = raw.split("\n");
  return {
    additions: lines.filter(line => line.startsWith("+") && !line.startsWith("+++")).length,
    deletions: lines.filter(line => line.startsWith("-") && !line.startsWith("---")).length,
  };
}

function fileRows(event: UserVisibleAgentEvent) {
  return Array.isArray(event.detail?.fileChanges) ? event.detail.fileChanges : [];
}

function boundFile(event: UserVisibleAgentEvent, requestedPath: string) {
  const wanted = normalizedPath(requestedPath);
  const row = fileRows(event).find((item: any) => {
    try { return normalizedPath(item?.path || item?.file || item?.name) === wanted; } catch { return false; }
  }) as any;
  const runtimeTarget = String(event.detail?.runtimeObservation?.eventType || "") === "file_changed"
    ? String(event.display?.target || "") : "";
  if (!row && (!runtimeTarget || normalizedPath(runtimeTarget) !== wanted)) {
    throw Object.assign(new Error("该文件不属于当前子 Agent事件"), { statusCode: 409 });
  }
  return { ...(row || {}), path: wanted };
}

function executionCandidates(event: UserVisibleAgentEvent, project: string) {
  if (!event.taskId) return [];
  return listExecutions({ taskId: event.taskId }).filter((record: any) => {
    if (project && String(record?.project || "") !== project) return false;
    const attempt = Number(event.detail?.agentDisplay?.attempt || event.detail?.executionStage?.attempt || 0);
    return !attempt || !record.executionAttempt || Number(record.executionAttempt) === attempt;
  }).sort((left: any, right: any) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
}

function diffFromExecution(record: any, filePath: string) {
  const worktree = String(record?.workspace?.worktreePath || "");
  if (!worktree || !fs.existsSync(worktree) || !fs.statSync(worktree).isDirectory()) return null;
  const base = String(record?.workspace?.baseHead || record?.workspace?.originalHead || "");
  const args = ["diff", "--no-ext-diff", "--unified=3"];
  if (base && objectExists(worktree, base)) args.push(base);
  args.push("--", filePath);
  const result = git(worktree, args);
  if (!result.ok) return null;
  return { raw: result.stdout || untrackedFileDiff(worktree, filePath), freshness: "active_worktree", sourceRoot: worktree };
}

function diffFromDelivery(event: UserVisibleAgentEvent, project: string, filePath: string) {
  const eventAttempt = Number(event.detail?.agentDisplay?.attempt || event.detail?.executionStage?.attempt || 0);
  const manifests = listExecutionRecoveryManifests({ taskIds: event.taskId ? [event.taskId] : [] })
    .filter((manifest: any) => (!project || String(manifest?.project || "") === project)
      && (!eventAttempt || !manifest.attempt || Number(manifest.attempt) === eventAttempt)
      && (manifest.changedFiles || []).some((item: any) => String(item?.path || "").replace(/\\/g, "/") === filePath));
  for (const manifest of manifests) {
    const repoRoot = String(manifest.authoritativeRepoRoot || "");
    const baseline = String(manifest.baselineCommit || "");
    const delivery = String(manifest.deliveryCommit || "");
    if (!repoRoot || !fs.existsSync(repoRoot) || !objectExists(repoRoot, baseline) || !objectExists(repoRoot, delivery)) continue;
    const result = git(repoRoot, ["diff", "--no-ext-diff", "--unified=3", baseline, delivery, "--", filePath]);
    if (result.ok) return { raw: result.stdout, freshness: "accepted_delivery", sourceRoot: repoRoot };
  }
  return null;
}

function diffFromAuthority(project: string, filePath: string) {
  const workDir = String(getWorkDirForProject(project) || "");
  if (!workDir || !fs.existsSync(workDir)) return null;
  const result = git(workDir, ["diff", "--no-ext-diff", "--unified=3", "--", filePath]);
  if (!result.ok) return null;
  return { raw: result.stdout || untrackedFileDiff(workDir, filePath), freshness: "current_authority", sourceRoot: workDir };
}

function statusKind(file: any, raw: string) {
  const status = String(file?.statusKind || file?.status || "").toLowerCase();
  if (file?.deleted || /删除|deleted|^d$/.test(status)) return "deleted";
  if (/新增|added|^a$/.test(status) || (!raw.includes("--- a/") && raw.includes("+++ b/"))) return "added";
  if (/重命名|renamed|^r/.test(status)) return "renamed";
  return "modified";
}

export function projectEventFileDiff(event: UserVisibleAgentEvent, requestedPath: string, projectHint = "") {
  const file = boundFile(event, requestedPath);
  const executions = executionCandidates(event, projectHint);
  const project = String(file.project || event.detail?.agentDisplay?.projectId || projectHint || executions[0]?.project || (event.scope === "project" ? event.scopeId : "")).trim();
  if (!project) throw Object.assign(new Error("文件事件缺少明确的项目归属"), { statusCode: 409 });

  let source: any = null;
  for (const execution of executions) {
    source = diffFromExecution(execution, file.path);
    if (source?.raw) break;
  }
  if (!source?.raw) source = diffFromDelivery(event, project, file.path);
  if (!source?.raw) source = diffFromAuthority(project, file.path);

  const raw = String(source?.raw || "");
  const limited = boundedDiff(raw);
  const stats = counts(raw);
  const additions = Number.isFinite(Number(file.additions)) ? Number(file.additions) : stats.additions;
  const deletions = Number.isFinite(Number(file.deletions)) ? Number(file.deletions) : stats.deletions;
  return {
    schema: "ccm-file-diff-detail-v1",
    file: {
      project,
      path: file.path,
      status: statusKind(file, raw),
      additions: Math.max(0, additions),
      deletions: Math.max(0, deletions),
    },
    diff: {
      available: !!raw,
      raw: limited.raw,
      truncated: limited.truncated,
      ...(!raw ? { reason: "当前没有可重建的文本差异；文件可能尚未形成安全检查点、已经提交到其他版本，或属于二进制文件。" } : {}),
    },
    freshness: source?.freshness || "unavailable",
    contentStored: false,
  };
}
