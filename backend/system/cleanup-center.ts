import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { loadCronJobs, loadTasks, saveCronJobs } from "../core/db";
import { getSqliteTaskStoreStatus } from "../core/task-store";
import { withFileLock } from "../core/atomic-json-file";
import { CCM_DIR, GROUP_MESSAGES_DIR, GROUPS_FILE } from "../core/utils";
import { purgeArchivedTask } from "../modules/collaboration/collaboration";
import {
  archiveProjectChatRun,
  projectChatRuns,
  purgeProjectChatRun,
} from "../projects/chat-runs";

const CLEANUP_DIR = path.join(CCM_DIR, "cleanup-center");
const CLEANUP_LOCK_FILE = path.join(CLEANUP_DIR, "operation");
const CLEANUP_AUDIT_FILE = path.join(CLEANUP_DIR, "audit.jsonl");
const PREVIEW_TTL_MS = 10 * 60_000;
const DEFAULT_RETENTION_DAYS = 30;
const RETENTION_OPTIONS = [7, 30, 90, 0];

type CleanupRisk = "safe" | "danger";

interface CleanupCandidate {
  id: string;
  title: string;
  status: string;
  project: string;
  updated_at: string;
  fingerprint: string;
}

interface CleanupPreviewSnapshot {
  token: string;
  action: string;
  retentionDays: number;
  createdAt: number;
  expiresAt: number;
  candidates: CleanupCandidate[];
  consumed: boolean;
}

const previewSnapshots = new Map<string, CleanupPreviewSnapshot>();

const ACTIONS: Record<string, {
  id: string;
  label: string;
  description: string;
  risk: CleanupRisk;
  irreversible: boolean;
}> = {
  archive_failed_project_runs: {
    id: "archive_failed_project_runs",
    label: "归档失败的项目运行",
    description: "从进行中列表移走失败记录，仍可保留用于复盘。",
    risk: "safe",
    irreversible: false,
  },
  purge_archived_tasks: {
    id: "purge_archived_tasks",
    label: "永久删除已归档任务",
    description: "同时清理子 Agent 会话、TestAgent 证据、任务回放和执行工作树。",
    risk: "danger",
    irreversible: true,
  },
  purge_archived_cron: {
    id: "purge_archived_cron",
    label: "永久删除已归档定时任务",
    description: "永久移除不再需要的定时任务配置。",
    risk: "danger",
    irreversible: true,
  },
  purge_archived_project_runs: {
    id: "purge_archived_project_runs",
    label: "永久删除已归档项目运行",
    description: "永久移除项目运行记录及关联会话和执行产物。",
    risk: "danger",
    irreversible: true,
  },
};

function readJsonSafe(file: string, fallback: any = null) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function countFilesAndBytes(target: string) {
  const result = { files: 0, bytes: 0 };
  const walk = (entry: string) => {
    if (!fs.existsSync(entry)) return;
    const stat = fs.statSync(entry);
    if (stat.isFile()) {
      result.files += 1;
      result.bytes += stat.size;
      return;
    }
    if (!stat.isDirectory()) return;
    for (const name of fs.readdirSync(entry)) walk(path.join(entry, name));
  };
  try { walk(target); } catch {}
  return result;
}

function fileBytes(file: string) {
  try { return fs.statSync(file).size; } catch { return 0; }
}

function normalizedRetentionDays(value: any) {
  const days = Number(value);
  return RETENTION_OPTIONS.includes(days) ? days : DEFAULT_RETENTION_DAYS;
}

function recordTimestamp(record: any, fields: string[]) {
  for (const field of fields) {
    const value = record?.[field];
    if (!value) continue;
    const timestamp = Date.parse(String(value));
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

function matchesRetention(record: any, retentionDays: number, fields: string[]) {
  if (retentionDays === 0) return true;
  const timestamp = recordTimestamp(record, fields);
  if (timestamp === null) return false;
  return timestamp <= Date.now() - retentionDays * 24 * 60 * 60_000;
}

function candidateFingerprint(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function cleanupExpiredPreviews() {
  const now = Date.now();
  for (const [token, snapshot] of previewSnapshots.entries()) {
    if (snapshot.expiresAt <= now || snapshot.consumed) previewSnapshots.delete(token);
  }
}

function taskCandidate(task: any): CleanupCandidate {
  return {
    id: String(task.id || ""),
    title: task.title || task.description || task.message || task.goal || "未命名任务",
    status: task.status || "archived",
    project: task.target_project || task.project || task.group_id || "",
    updated_at: task.archived_at || task.deleted_at || task.updated_at || task.created_at || "",
    fingerprint: candidateFingerprint({
      id: task.id,
      status: task.status,
      archived: !!task.archived,
      deleted_at: task.deleted_at || "",
      updated_at: task.updated_at || "",
    }),
  };
}

function cronCandidate(job: any): CleanupCandidate {
  return {
    id: String(job.id || ""),
    title: job.name || job.title || "未命名定时任务",
    status: "archived",
    project: job.project || job.group_id || job.target || "",
    updated_at: job.archived_at || job.deleted_at || job.updated_at || job.created_at || "",
    fingerprint: candidateFingerprint({
      id: job.id,
      archived: !!job.archived,
      deleted_at: job.deleted_at || "",
      updated_at: job.updated_at || "",
    }),
  };
}

function projectRunCandidate(run: any): CleanupCandidate {
  return {
    id: String(run.id || ""),
    title: run.message || run.project || "项目运行",
    status: run.status || "",
    project: run.project || "",
    updated_at: run.archived_at || run.deleted_at || run.updated_at || run.created_at || "",
    fingerprint: candidateFingerprint({
      id: run.id,
      status: run.status,
      archived: !!run.archived,
      deleted_at: run.deleted_at || "",
      updated_at: run.updated_at || "",
    }),
  };
}

function listCleanupCandidates(action: string, retentionDays: number) {
  const dateFields = ["archived_at", "deleted_at", "updated_at", "created_at"];
  let candidates: CleanupCandidate[] = [];
  if (action === "purge_archived_tasks") {
    candidates = loadTasks()
      .filter((task: any) => task.archived || task.deleted_at || task.status === "archived")
      .filter((task: any) => matchesRetention(task, retentionDays, dateFields))
      .map(taskCandidate);
  } else if (action === "purge_archived_cron") {
    candidates = loadCronJobs()
      .filter((job: any) => job.archived || job.deleted_at)
      .filter((job: any) => matchesRetention(job, retentionDays, dateFields))
      .map(cronCandidate);
  } else if (action === "purge_archived_project_runs") {
    candidates = [...projectChatRuns.values()]
      .filter((run: any) => run.archived || run.deleted_at || run.status === "archived")
      .filter((run: any) => matchesRetention(run, retentionDays, dateFields))
      .map(projectRunCandidate);
  } else if (action === "archive_failed_project_runs") {
    candidates = [...projectChatRuns.values()]
      .filter((run: any) => run.status === "failed" && !run.archived && !run.deleted_at)
      .filter((run: any) => matchesRetention(run, retentionDays, ["updated_at", "created_at"]))
      .map(projectRunCandidate);
  }
  return candidates
    .filter(candidate => !!candidate.id)
    .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)) || a.id.localeCompare(b.id));
}

function getStorageStats() {
  const executionRoot = path.join(CCM_DIR, "execution-kernel");
  const executions = countFilesAndBytes(path.join(executionRoot, "executions"));
  const checkpoints = countFilesAndBytes(path.join(executionRoot, "checkpoints"));
  const outputs = countFilesAndBytes(path.join(executionRoot, "outputs"));
  const projectSessions = countFilesAndBytes(path.join(CCM_DIR, "web-sessions"));
  const groupMessages = countFilesAndBytes(GROUP_MESSAGES_DIR);
  const testArtifacts = countFilesAndBytes(path.join(CCM_DIR, "test-agent-artifacts"));
  const testRuns = countFilesAndBytes(path.join(CCM_DIR, "test-agent-runs"));
  const replay = countFilesAndBytes(path.join(CCM_DIR, "reliability", "task-replay-journal"));
  const totalBytes = [executions, checkpoints, outputs, projectSessions, groupMessages, testArtifacts, testRuns, replay]
    .reduce((sum, item) => sum + item.bytes, 0);
  return { executions, checkpoints, outputs, projectSessions, groupMessages, testArtifacts, testRuns, replay, totalBytes };
}

function appendCleanupAudit(record: any) {
  fs.mkdirSync(path.dirname(CLEANUP_AUDIT_FILE), { recursive: true });
  if (fs.existsSync(CLEANUP_AUDIT_FILE) && fs.statSync(CLEANUP_AUDIT_FILE).size > 2 * 1024 * 1024) {
    const rows = fs.readFileSync(CLEANUP_AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-500);
    fs.writeFileSync(CLEANUP_AUDIT_FILE, rows.length ? `${rows.join("\n")}\n` : "", "utf-8");
  }
  fs.appendFileSync(CLEANUP_AUDIT_FILE, `${JSON.stringify(record)}\n`, "utf-8");
}

export function getCleanupHistory(limit = 40) {
  const size = Math.max(1, Math.min(100, Number(limit) || 40));
  if (!fs.existsSync(CLEANUP_AUDIT_FILE)) return [];
  try {
    return fs.readFileSync(CLEANUP_AUDIT_FILE, "utf-8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-size)
      .reverse()
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getCleanupSummary() {
  const tasks = loadTasks();
  const cronJobs = loadCronJobs();
  const projectRuns = [...projectChatRuns.values()];
  const groups = readJsonSafe(GROUPS_FILE, []);
  const globalHistoryFile = path.join(CCM_DIR, "global-agent-history.json");
  const globalHistory = readJsonSafe(globalHistoryFile, { sessions: [] });
  const storage = getStorageStats();
  const groupRows = Array.isArray(groups) ? groups.map((group: any) => {
    const file = path.join(GROUP_MESSAGES_DIR, `${group.id}.json`);
    const messages = readJsonSafe(file, []);
    return {
      id: group.id,
      title: group.name || group.id,
      type: "群聊会话",
      count: Array.isArray(messages) ? messages.length : 0,
      bytes: fileBytes(file),
      updated_at: "",
    };
  }) : [];
  const globalSessions = Array.isArray(globalHistory.sessions) ? globalHistory.sessions : [];
  const projectSessionCount = storage.projectSessions.files;
  const conversationCount = projectSessionCount + groupRows.length + globalSessions.length;
  const qualityFiles = storage.testArtifacts.files + storage.testRuns.files + storage.replay.files;
  const qualityBytes = storage.testArtifacts.bytes + storage.testRuns.bytes + storage.replay.bytes;
  const executionFiles = storage.executions.files + storage.checkpoints.files + storage.outputs.files;
  const executionBytes = storage.executions.bytes + storage.checkpoints.bytes + storage.outputs.bytes;
  const defaultCandidates = Object.fromEntries(Object.keys(ACTIONS).map(action => [action, listCleanupCandidates(action, DEFAULT_RETENTION_DAYS)]));
  const cards = [
    {
      id: "tasks",
      title: "任务记录",
      count: tasks.length,
      bytes: (() => {
        try {
          const status = getSqliteTaskStoreStatus();
          return Number(status.database_bytes || 0) + Number(status.wal_bytes || 0) + Number(status.shm_bytes || 0);
        } catch {
          return fileBytes(path.join(CCM_DIR, "ccm.db")) || fileBytes(path.join(CCM_DIR, "tasks.json"));
        }
      })(),
      detail: `${tasks.filter((task: any) => task.archived || task.deleted_at || task.status === "archived").length} 项已归档`,
    },
    {
      id: "cron",
      title: "定时任务",
      count: cronJobs.length,
      bytes: fileBytes(path.join(CCM_DIR, "cron-jobs.json")),
      detail: `${cronJobs.filter((job: any) => job.archived || job.deleted_at).length} 项已归档`,
    },
    {
      id: "project_runs",
      title: "项目运行",
      count: projectRuns.length,
      bytes: fileBytes(path.join(CCM_DIR, "project-chat-runs.json")),
      detail: `${projectRuns.filter((run: any) => run.status === "failed").length} 项失败`,
    },
    {
      id: "conversations",
      title: "会话数据",
      count: conversationCount,
      bytes: storage.projectSessions.bytes + storage.groupMessages.bytes + fileBytes(globalHistoryFile),
      detail: "项目、群聊与全局会话",
    },
    {
      id: "execution_artifacts",
      title: "执行产物",
      count: executionFiles,
      bytes: executionBytes,
      detail: "执行记录、检查点和输出",
    },
    {
      id: "quality_evidence",
      title: "测试与回放证据",
      count: qualityFiles,
      bytes: qualityBytes,
      detail: "TestAgent 证据和任务回放",
    },
  ];

  return {
    success: true,
    updated_at: new Date().toISOString(),
    policy: {
      default_retention_days: DEFAULT_RETENTION_DAYS,
      retention_options: RETENTION_OPTIONS,
      preview_ttl_minutes: PREVIEW_TTL_MS / 60_000,
    },
    storage: { total_bytes: cards.reduce((sum, card) => sum + Number(card.bytes || 0), 0) },
    cards,
    rows: {
      tasks: tasks.slice(-200).reverse().map((task: any) => ({
        id: task.id,
        title: task.title || task.description || task.message || task.goal || "未命名任务",
        status: task.status || "",
        project: task.target_project || task.project || task.group_id || "",
        updated_at: task.updated_at || task.created_at || "",
      })),
      cron: cronJobs.slice(-200).reverse().map((job: any) => ({
        id: job.id,
        title: job.name || job.title || "未命名定时任务",
        status: job.archived || job.deleted_at ? "archived" : job.enabled === false ? "disabled" : "enabled",
        project: job.project || job.group_id || job.target || "",
        updated_at: job.updated_at || job.created_at || "",
      })),
      project_runs: projectRuns.slice(-200).reverse().map((run: any) => ({
        id: run.id,
        title: run.message || run.project || "项目运行",
        status: run.status || "",
        project: run.project || "",
        updated_at: run.updated_at || run.created_at || "",
      })),
      conversations: [
        ...groupRows,
        ...globalSessions.slice(-100).reverse().map((session: any) => ({
          id: session.id,
          title: session.name || session.title || session.id || "全局会话",
          type: "全局 Agent 会话",
          count: Array.isArray(session.messages) ? session.messages.length : 0,
          bytes: 0,
          updated_at: session.updatedAt || session.updated_at || session.createdAt || "",
        })),
        { id: "project-sessions", title: "项目会话文件", type: "项目会话", count: projectSessionCount, bytes: storage.projectSessions.bytes, updated_at: "" },
      ],
      execution_artifacts: [
        { id: "executions", title: "执行记录", type: "执行产物", count: storage.executions.files, bytes: storage.executions.bytes },
        { id: "checkpoints", title: "执行检查点", type: "执行产物", count: storage.checkpoints.files, bytes: storage.checkpoints.bytes },
        { id: "outputs", title: "执行输出", type: "执行产物", count: storage.outputs.files, bytes: storage.outputs.bytes },
      ],
      quality_evidence: [
        { id: "test-artifacts", title: "TestAgent 截图与浏览器证据", type: "测试证据", count: storage.testArtifacts.files, bytes: storage.testArtifacts.bytes },
        { id: "test-runs", title: "TestAgent 运行记录", type: "测试证据", count: storage.testRuns.files, bytes: storage.testRuns.bytes },
        { id: "task-replay", title: "任务回放日志", type: "回放证据", count: storage.replay.files, bytes: storage.replay.bytes },
      ],
    },
    actions: Object.values(ACTIONS).map(action => ({
      ...action,
      target_count: defaultCandidates[action.id].length,
    })),
    history: getCleanupHistory(),
  };
}

export function previewCleanupAction(action: string, options: { retention_days?: any } = {}) {
  cleanupExpiredPreviews();
  const definition = ACTIONS[action];
  if (!definition) return { success: false, error: "不支持的清理动作" };
  const retentionDays = normalizedRetentionDays(options.retention_days);
  const candidates = listCleanupCandidates(action, retentionDays);
  const token = crypto.randomUUID();
  const now = Date.now();
  previewSnapshots.set(token, {
    token,
    action,
    retentionDays,
    createdAt: now,
    expiresAt: now + PREVIEW_TTL_MS,
    candidates,
    consumed: false,
  });
  return {
    success: true,
    preview_token: token,
    expires_at: new Date(now + PREVIEW_TTL_MS).toISOString(),
    action: { ...definition, target_count: candidates.length },
    policy: { retention_days: retentionDays },
    preview: {
      will_affect: candidates.length,
      irreversible: definition.irreversible,
      note: definition.irreversible
        ? "只会永久删除本次预览中勾选的记录。任务相关的测试证据和回放会一并删除。"
        : "归档后记录仍会保留，可以继续用于复盘。",
      items: candidates.map(({ fingerprint, ...candidate }) => candidate),
    },
  };
}

function mergeCleanupTotals(target: any, source: any) {
  if (!source || typeof source !== "object") return;
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") target[key] = Number(target[key] || 0) + value;
    else if (value && typeof value === "object" && "removed" in value) target[key] = Number(target[key] || 0) + ((value as any).removed ? 1 : 0);
  }
}

export function runCleanupAction(action: string, options: { preview_token?: any; selected_ids?: any } = {}) {
  const definition = ACTIONS[action];
  if (!definition) return { success: false, error: "不支持的清理动作" };
  const previewToken = String(options.preview_token || "").trim();
  if (!previewToken) return { success: false, error: "请先生成清理预览" };

  try {
    return withFileLock(CLEANUP_LOCK_FILE, () => {
      cleanupExpiredPreviews();
      const snapshot = previewSnapshots.get(previewToken);
      if (!snapshot || snapshot.action !== action || snapshot.consumed || snapshot.expiresAt <= Date.now()) {
        return { success: false, error: "清理预览已失效，请重新预览" };
      }
      const availableIds = new Set(snapshot.candidates.map(candidate => candidate.id));
      const requestedIds = Array.isArray(options.selected_ids)
        ? [...new Set(options.selected_ids.map(value => String(value || "").trim()).filter(Boolean))]
        : snapshot.candidates.map(candidate => candidate.id);
      if (!requestedIds.length) return { success: false, error: "请至少选择一条记录" };
      if (requestedIds.some(id => !availableIds.has(id))) return { success: false, error: "选择内容不属于本次预览，请重新预览" };

      const currentById = new Map(listCleanupCandidates(action, snapshot.retentionDays).map(candidate => [candidate.id, candidate]));
      for (const id of requestedIds) {
        const expected = snapshot.candidates.find(candidate => candidate.id === id);
        const current = currentById.get(id);
        if (!expected || !current || expected.fingerprint !== current.fingerprint) {
          return { success: false, error: "预览后数据已发生变化，请重新预览后再执行" };
        }
      }

      snapshot.consumed = true;
      const startedAt = new Date().toISOString();
      const beforeBytes = getStorageStats().totalBytes;
      const cleanup: Record<string, number> = {};
      const results: any[] = [];
      const failures: any[] = [];

      if (action === "purge_archived_cron") {
        const selected = new Set(requestedIds);
        const jobs = loadCronJobs();
        saveCronJobs(jobs.filter((job: any) => !selected.has(String(job.id || ""))));
        for (const id of requestedIds) results.push({ id, status: "deleted" });
      } else {
        for (const id of requestedIds) {
          try {
            if (action === "archive_failed_project_runs") {
              const archived = archiveProjectChatRun(id, "清理中心归档失败项目运行");
              if (!archived) throw new Error("项目运行不存在");
              results.push({ id, status: "archived" });
            } else if (action === "purge_archived_project_runs") {
              const result = purgeProjectChatRun(id);
              if (!result) throw new Error("项目运行不存在");
              mergeCleanupTotals(cleanup, result.cleanup);
              results.push({ id, status: "deleted" });
            } else if (action === "purge_archived_tasks") {
              const result: any = purgeArchivedTask(id);
              if (!result) throw new Error("任务不存在");
              mergeCleanupTotals(cleanup, result.purge_cleanup);
              results.push({ id, status: "deleted" });
            }
          } catch (error: any) {
            failures.push({ id, error: error?.message || String(error) });
          }
        }
      }

      const afterBytes = getStorageStats().totalBytes;
      const completedAt = new Date().toISOString();
      const receipt = {
        schema: "ccm-cleanup-receipt-v1",
        id: `cleanup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        action,
        label: definition.label,
        operation: definition.irreversible ? "永久删除" : "安全整理",
        status: failures.length ? (results.length ? "partial" : "failed") : "success",
        retention_days: snapshot.retentionDays,
        requested_count: requestedIds.length,
        processed_count: results.length,
        failed_count: failures.length,
        released_bytes: Math.max(0, beforeBytes - afterBytes),
        cleanup,
        results: results.slice(0, 100),
        failures: failures.slice(0, 100),
        source: "cleanup-center",
        started_at: startedAt,
        completed_at: completedAt,
      };
      appendCleanupAudit(receipt);
      previewSnapshots.delete(previewToken);
      return {
        success: failures.length === 0 || results.length > 0,
        partial: failures.length > 0 && results.length > 0,
        receipt,
        error: failures.length ? `有 ${failures.length} 条记录未能处理` : undefined,
      };
    }, { timeoutMs: 250, retryMs: 25, staleMs: 5 * 60_000 });
  } catch (error: any) {
    const message = String(error?.message || error || "");
    return {
      success: false,
      error: message.includes("file lock timeout") ? "另一个清理操作正在执行，请稍后再试" : message || "清理执行失败",
    };
  }
}
