import { IncomingMessage, ServerResponse } from "http";
import { loadCronJobs, loadTasks, saveTasks, getConfigs, getConfigInfo, isRunning } from "../../core/db";
import { CCM_DIR, sendJson } from "../../core/utils";
import { loadGroups } from "../collaboration/collaboration";
import { reconcileTaskAgentSessions } from "../../tasks/agent-sessions";
import * as fs from "fs";
import * as path from "path";

const DAY = 24 * 60 * 60 * 1000;
const AUTO_ARCHIVE_DAYS = 30;
let archiveTimer: NodeJS.Timeout | null = null;
const GOVERNANCE_AUDIT_FILE = path.join(CCM_DIR, "task-governance-audit.jsonl");

function appendGovernanceAudit(event: any) {
  fs.appendFileSync(GOVERNANCE_AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, "utf-8");
}

function timeOf(value: any) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstText(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return String(value[0] || "").trim();
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function taskPhase(task: any) {
  const status = String(task.status || "pending").toLowerCase();
  const delivery = task.delivery_summary || {};
  if (["cancelled", "archived", "deleted"].includes(status)) return "history";
  const blocking = [
    ...(Array.isArray(delivery.blocking_needs) ? delivery.blocking_needs : []),
    ...(Array.isArray(delivery.blockers) ? delivery.blockers : []),
  ];
  if (task.intake_state === "awaiting_confirmation") return "needs_user";
  if (["paused", "waiting_user", "needs_confirmation"].includes(status) || blocking.length > 0) return "needs_user";
  if (status === "failed" || delivery.status === "failed") return "failed";
  if (["in_progress", "running", "queued", "cancelling"].includes(status)) return "in_progress";
  if (["pending", "waiting"].includes(status)) return "queued";
  if (status === "done") return Date.now() - timeOf(task.completed_at || task.updated_at) <= DAY ? "recently_completed" : "history";
  return "history";
}

function taskReason(task: any, phase: string) {
  const delivery = task.delivery_summary || {};
  const blocking = firstText(delivery.blocking_needs, delivery.blockers, delivery.needs);
  if (phase === "needs_user") return firstText(blocking, task.status_detail, "需要你确认后才能继续");
  if (phase === "failed") return firstText(task.status_detail, delivery.detail, task.result, "执行失败，可重试或切换执行器");
  if (phase === "recently_completed") return firstText(delivery.headline, task.result, "已完成并生成交付报告");
  return firstText(task.status_detail, delivery.detail, task.result, phase === "queued" ? "等待开始" : "正在执行");
}

function taskActions(task: any, phase: string) {
  if (task.intake_state === "awaiting_confirmation") return ["confirm", "edit", "cancel"];
  if (phase === "needs_user") return ["supplement", "resume", "cancel"];
  if (phase === "failed") return ["retry", "switch_executor", "cancel"];
  if (phase === "in_progress") return ["supplement", "pause", "cancel"];
  if (phase === "queued") return ["start", "edit", "cancel"];
  if (phase === "recently_completed") return ["view_report", "archive"];
  return ["view"];
}

function publicTask(task: any) {
  const phase = taskPhase(task);
  const delivery = task.delivery_summary || {};
  const changed = Array.isArray(delivery.actual_file_changes) ? delivery.actual_file_changes.length : Number(delivery.actual_file_change_count || task.file_changes?.count || 0);
  const verified = Array.isArray(delivery.verification_executed) ? delivery.verification_executed.length : 0;
  return {
    id: task.id,
    trace_id: task.trace_id || "",
    title: task.title || task.business_goal || "未命名任务",
    goal: task.business_goal || task.description || "",
    phase,
    status: task.status || "pending",
    reason: taskReason(task, phase).slice(0, 280),
    target_project: task.target_project || "",
    group_id: task.group_id || "",
    updated_at: task.updated_at || task.created_at || "",
    created_at: task.created_at || "",
    actions: taskActions(task, phase),
    delivery: { files_changed: changed, verification_count: verified, report: delivery.user_report || task.final_report || "" },
    intake: task.intake_draft || null,
  };
}

export function archiveOldUsabilityHistory(now = Date.now()) {
  const tasks = loadTasks();
  let changed = 0;
  const cutoff = now - AUTO_ARCHIVE_DAYS * DAY;
  for (const task of tasks) {
    if (task.archived || task.deleted_at || !["done", "cancelled"].includes(String(task.status || ""))) continue;
    if (timeOf(task.completed_at || task.cancelled_at || task.updated_at || task.created_at) >= cutoff) continue;
    task.archived = true;
    task.archived_at = new Date(now).toISOString();
    task.archive_reason = `日常工作台自动归档：终态超过 ${AUTO_ARCHIVE_DAYS} 天`;
    changed++;
  }
  for (const task of tasks) {
    if (task.archived || task.deleted_at || task.intake_state !== "awaiting_confirmation") continue;
    if (timeOf(task.created_at) >= now - DAY) continue;
    task.archived = true;
    task.status = "archived";
    task.archived_at = new Date(now).toISOString();
    task.archive_reason = "执行前确认卡超过 24 小时未确认，自动归档";
    changed++;
  }
  if (changed) saveTasks(tasks);
  if (changed) appendGovernanceAudit({ type: "automatic_task_archive", changed, retention_days: AUTO_ARCHIVE_DAYS });
  return { changed, retention_days: AUTO_ARCHIVE_DAYS };
}

export function runUsabilityGovernance() {
  const archive = archiveOldUsabilityHistory();
  const sessions = reconcileTaskAgentSessions(loadTasks());
  if (sessions.closed) appendGovernanceAudit({ type: "stale_session_cleanup", closed: sessions.closed, session_ids: sessions.sessions.map((item: any) => item.id) });
  return { archive, sessions: { closed: sessions.closed }, audit_file: GOVERNANCE_AUDIT_FILE };
}

export function buildUsabilityWorkbench() {
  const archive = archiveOldUsabilityHistory();
  const tasks = loadTasks().filter((item: any) => !item.archived && !item.deleted_at).map(publicTask)
    .sort((a: any, b: any) => timeOf(b.updated_at) - timeOf(a.updated_at));
  const buckets: Record<string, any[]> = { needs_user: [], failed: [], in_progress: [], queued: [], recently_completed: [], history: [] };
  tasks.forEach((task: any) => (buckets[task.phase] || buckets.history).push(task));
  const notifications = [...buckets.failed, ...buckets.needs_user, ...buckets.recently_completed].slice(0, 12).map(task => ({
    id: `${task.id}:${task.phase}:${task.updated_at}`,
    level: task.phase === "failed" ? "error" : task.phase === "needs_user" ? "decision" : "success",
    task,
  }));
  const projects = getConfigs().map((config: any) => {
    const info = getConfigInfo(config.path)?.[0] || {};
    return { name: config.name, running: isRunning(config.name), agent: info.agent || "claudecode", work_dir: info.workDir || "" };
  });
  const groups = loadGroups().map((group: any) => ({ id: group.id, name: group.name, members: Array.isArray(group.members) ? group.members.length : 0 }));
  const cron = loadCronJobs().filter((job: any) => !job.archived && !job.deleted_at).map((job: any) => ({
    id: job.id, name: job.name || job.title || "定时任务", enabled: job.enabled !== false && job.status !== "paused", next_run: job.next_run || job.nextRun || "", last_status: job.last_status || job.lastStatus || "",
  }));
  return {
    generated_at: new Date().toISOString(),
    archive,
    counts: Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, value.length])),
    attention: [...buckets.failed, ...buckets.needs_user].slice(0, 5),
    active: [...buckets.in_progress, ...buckets.queued],
    completed: buckets.recently_completed,
    notifications,
    resources: { projects, groups, cron },
    onboarding: { empty: projects.length === 0 && groups.length === 0, has_tasks: tasks.length > 0 },
  };
}

export function startUsabilityArchiveScheduler() {
  runUsabilityGovernance();
  if (archiveTimer) clearInterval(archiveTimer);
  archiveTimer = setInterval(() => runUsabilityGovernance(), 6 * 60 * 60 * 1000);
  archiveTimer.unref?.();
}

export function stopUsabilityArchiveScheduler() {
  if (archiveTimer) clearInterval(archiveTimer);
  archiveTimer = null;
}

export function handleUsabilityApi(pathname: string, req: IncomingMessage, res: ServerResponse) {
  if (pathname === "/api/usability/workbench" && req.method === "GET") {
    sendJson(res, buildUsabilityWorkbench());
    return true;
  }
  if (pathname === "/api/usability/archive-history" && req.method === "POST") {
    sendJson(res, { success: true, ...archiveOldUsabilityHistory() });
    return true;
  }
  return false;
}
