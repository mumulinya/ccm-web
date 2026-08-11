import * as fs from "fs";
import { spawnSync } from "child_process";
import { getConfigInfo, getConfigs, loadTasks } from "../../core/db";
import { listActiveLocalAuthUsers } from "../system/local-auth";
import { hasFeatureAccess, hasResourceAccess } from "../system/access-policy";
import { getTaskTemplate, renderTaskTemplate } from "../collaboration/task-templates";
import { computeNextRun, minuteKey, normalizeCronJob, normalizeTargetType } from "./cron-job-store";

export function cronPrincipal(req: any) {
  const auth = req?.ccmAuth || {};
  return { userId: String(auth.userId || auth.user_id || "system"), role: String(auth.role || "admin"), admin: auth.role === "admin" || auth.kind !== "browser" };
}

export function cronTarget(job: any) {
  const type = normalizeTargetType(job) === "group" ? "group" : "project";
  return { type: type as "project" | "group", id: String(type === "group" ? job.group_id || job.groupId : job.project || "").trim() };
}

export function cronTargetAccess(userId: string, role: string, job: any, level: "use" | "manage" = "use") {
  const target = cronTarget(job);
  return !!target.id && hasResourceAccess(userId, role, target.type, target.id, level);
}

export function canViewCronJob(req: any, job: any) {
  const actor = cronPrincipal(req);
  if (actor.admin) return true;
  const owner = String(job.owner_id || job.ownerId || "legacy-system");
  return (owner === actor.userId && cronTargetAccess(actor.userId, actor.role, job, "use"))
    || (owner === "legacy-system" && cronTargetAccess(actor.userId, actor.role, job, "manage"));
}

export function canManageCronJob(req: any, job: any) {
  const actor = cronPrincipal(req);
  if (actor.admin) return true;
  const owner = String(job.owner_id || job.ownerId || "legacy-system");
  return (owner === actor.userId && cronTargetAccess(actor.userId, actor.role, job, "use"))
    || (owner === "legacy-system" && cronTargetAccess(actor.userId, actor.role, job, "manage"));
}

export function assertCronTargetAccess(req: any, job: any, level: "use" | "manage" = "use") {
  const actor = cronPrincipal(req);
  if (actor.admin) return;
  if (!cronTargetAccess(actor.userId, actor.role, job, level)) {
    const error: any = new Error("当前账户没有目标项目或群聊的定时任务权限");
    error.status = 403;
    error.code = "RESOURCE_ACCESS_DENIED";
    throw error;
  }
}

export function assertCronManage(req: any, job: any) {
  if (canManageCronJob(req, job)) return;
  const error: any = new Error("只能管理自己创建的定时任务");
  error.status = 403;
  error.code = "CRON_OWNER_REQUIRED";
  throw error;
}

export function assertCronTemplateAccess(req: any, job: any) {
  const templateId = String(job.task_template_id || job.taskTemplateId || "").trim();
  if (!templateId) return;
  const template = getTaskTemplate(templateId);
  const actor = cronPrincipal(req);
  if (!template || (!actor.admin && template.createdBy !== actor.userId)) {
    const error: any = new Error("定时任务使用的任务模板不存在或无权访问");
    error.status = 403;
    error.code = "TASK_TEMPLATE_UNAVAILABLE";
    throw error;
  }
}

export function cronExecutionAuthorization(job: any) {
  const ownerId = String(job.owner_id || job.ownerId || "legacy-system");
  if (ownerId === "legacy-system") return { allowed: true, ownerId, role: "system", legacy: true };
  const owner = listActiveLocalAuthUsers().find(user => user.id === ownerId);
  if (!owner) return { allowed: false, ownerId, role: "user", reason: "定时任务所有者已停用或不存在" };
  if (owner.role === "admin") return { allowed: true, ownerId, role: owner.role };
  if (!hasFeatureAccess(owner.id, owner.role, "schedule_ops")) return { allowed: false, ownerId, role: owner.role, reason: "定时任务功能权限已撤销" };
  if (!cronTargetAccess(owner.id, owner.role, job, "use")) return { allowed: false, ownerId, role: owner.role, reason: "定时任务目标权限已撤销" };
  return { allowed: true, ownerId, role: owner.role };
}

export function resolveCronTemplate(job: any) {
  const templateId = String(job.task_template_id || job.taskTemplateId || "").trim();
  if (!templateId) return { template: null, rendered: null, title: String(job.name || ""), instructions: String(job.prompt || "") };
  const template = getTaskTemplate(templateId);
  if (!template) throw new Error("定时任务使用的任务模板已不存在");
  const rendered = renderTaskTemplate(template, job.template_variables || job.templateVariables || {});
  if (!rendered.valid) throw new Error(`定时任务缺少模板变量：${rendered.missing.join("、")}`);
  return { template, rendered, title: rendered.title, instructions: rendered.instructions };
}

export function previewCronSchedule(job: any, count = 5, from = new Date()) {
  const normalized = normalizeCronJob(job);
  const times: string[] = [];
  let cursor = new Date(from);
  for (let index = 0; index < Math.max(1, Math.min(20, count)); index += 1) {
    const next = computeNextRun(normalized.schedule, cursor, normalized.timezone);
    if (!next) break;
    times.push(next);
    cursor = new Date(next);
  }
  const template = resolveCronTemplate(job);
  return {
    schema: "ccm-cron-preview-v1",
    valid: !normalized.schedule_error,
    scheduleError: normalized.schedule_error || "",
    timezone: normalized.timezone,
    nextRuns: times,
    renderedTask: { title: template.title, instructions: template.instructions, templateId: template.template?.id || "", templateRevision: template.template?.revision || null },
    policies: { overlap: normalized.overlap_policy, misfire: normalized.misfire_policy, catchUpLimit: normalized.catch_up_limit, consecutiveFailureLimit: normalized.consecutive_failure_limit },
    contentStored: false,
  };
}

const ACTIVE = new Set(["triggering", "running", "queued", "running_task", "waiting", "retry_waiting"]);

export function activeCronRuns(job: any) {
  const tasks = loadTasks();
  return (normalizeCronJob(job).run_history || []).filter((run: any) => {
    if (!ACTIVE.has(String(run.status || ""))) return false;
    if (!(run.task_ids || []).length) return ["triggering", "running"].includes(String(run.status || ""));
    return (run.task_ids || []).some((id: string) => {
      const task = tasks.find((item: any) => String(item.id) === String(id));
      return task && !["done", "completed", "failed", "cancelled", "skipped"].includes(String(task.status || ""));
    });
  });
}

function projectWorktreeGate(job: any, activeRuns: any[]) {
  const target = cronTarget(job);
  if (target.type !== "project") return { allowed: false, reason: "群聊多项目任务不能直接声明安全并行" };
  const config = getConfigs().find((item: any) => String(item.name || "") === target.id);
  let info: any = null;
  try { info = config ? getConfigInfo(config.path)?.[0] : null; } catch {}
  const workDir = String(info?.workDir || info?.work_dir || "");
  if (!workDir || !fs.existsSync(workDir)) return { allowed: false, reason: "项目路径不可用" };
  const probe = spawnSync("git", ["-C", workDir, "worktree", "list", "--porcelain"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
  if (probe.status !== 0) return { allowed: false, reason: "仓库不支持可验证的Git worktree" };
  const tasks = loadTasks();
  const previousTasks = activeRuns.flatMap(run => run.task_ids || []).map(id => tasks.find((task: any) => String(task.id) === String(id))).filter(Boolean);
  if (previousTasks.some((task: any) => task.queue_scope !== "isolated_parallel" && task.execution_workspace?.mode !== "worktree")) {
    return { allowed: false, reason: "上一轮没有在隔离工作区执行" };
  }
  return { allowed: true, reason: "Git worktree与上一轮隔离证据有效" };
}

export function resolveCronOverlap(job: any) {
  const activeRuns = activeCronRuns(job);
  if (!activeRuns.length) return { action: "proceed", activeRuns, dependencyTaskIds: [], parallelSafe: false };
  const policy = normalizeCronJob(job).overlap_policy;
  const dependencyTaskIds = [...new Set(activeRuns.flatMap((run: any) => run.task_ids || []).map(String).filter(Boolean))];
  if (policy === "skip") return { action: "skip", activeRuns, dependencyTaskIds, parallelSafe: false, reason: "上一轮尚未完成，已按并发策略跳过" };
  if (policy === "cancel_previous") {
    const tasks = loadTasks().filter((task: any) => dependencyTaskIds.includes(String(task.id)));
    const unsafe = tasks.some((task: any) => task.recovery_required === true || task.side_effect_uncertain === true || task.execution_state === "recovery_required");
    return unsafe
      ? { action: "needs_user", activeRuns, dependencyTaskIds, parallelSafe: false, reason: "上一轮存在不确定副作用，不能自动取消" }
      : { action: "cancel_previous", activeRuns, dependencyTaskIds, parallelSafe: false };
  }
  if (policy === "parallel_safe") {
    const gate = projectWorktreeGate(job, activeRuns);
    if (gate.allowed) return { action: "proceed", activeRuns, dependencyTaskIds: [], parallelSafe: true, reason: gate.reason };
    return { action: "queue", activeRuns, dependencyTaskIds, parallelSafe: false, reason: `${gate.reason}，已回退排队` };
  }
  return { action: "queue", activeRuns, dependencyTaskIds, parallelSafe: false, reason: "等待上一轮任务完成" };
}

export function missedCronOccurrences(job: any, now = new Date()) {
  const normalized = normalizeCronJob(job);
  const start = String(job.next_run || normalized.next_run || "");
  if (!start || Date.parse(start) > now.getTime()) return [];
  const rows: string[] = [];
  let cursor = new Date(start);
  const hardLimit = Math.max(1, Math.min(20, normalized.catch_up_limit || 5));
  while (cursor.getTime() <= now.getTime() && rows.length < hardLimit) {
    rows.push(cursor.toISOString());
    const next = computeNextRun(normalized.schedule, cursor, normalized.timezone);
    if (!next || Date.parse(next) <= cursor.getTime()) break;
    cursor = new Date(next);
  }
  return rows;
}

export function latestMissedCronOccurrence(job: any, now = new Date()) {
  const normalized = normalizeCronJob(job);
  const start = String(job.next_run || normalized.next_run || "");
  if (!start || Date.parse(start) > now.getTime()) return "";
  let latest = start;
  let cursor = new Date(start);
  for (let index = 0; index < 10080; index += 1) {
    const next = computeNextRun(normalized.schedule, cursor, normalized.timezone);
    if (!next || Date.parse(next) > now.getTime() || Date.parse(next) <= cursor.getTime()) break;
    latest = next;
    cursor = new Date(next);
  }
  return latest;
}

export function occurrenceSlot(job: any, scheduledFor: string) {
  const normalized = normalizeCronJob(job);
  return minuteKey(new Date(scheduledFor), normalized.timezone);
}

export function cronFailureDecision(job: any) {
  const normalized = normalizeCronJob(job);
  const consecutiveFailures = Number(normalized.consecutive_failures || 0) + 1;
  const paused = consecutiveFailures >= Number(normalized.consecutive_failure_limit || 3);
  return {
    consecutiveFailures,
    paused,
    patch: paused
      ? { consecutive_failures: consecutiveFailures, enabled: false, next_run: null, paused_reason: `连续失败 ${consecutiveFailures} 次，已自动暂停`, last_status: "paused_failure" }
      : { consecutive_failures: consecutiveFailures },
  };
}

export function cronSuccessPatch() {
  return { consecutive_failures: 0, paused_reason: "" };
}
