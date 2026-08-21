import { IncomingMessage, ServerResponse } from "http";
import * as crypto from "crypto";
import { subscribeRuntimeEventListener } from "../../system/runtime-events";
import {
  getConfigInfo,
  getConfigs,
  getTaskById,
  isRunningReadOnly,
  listUsabilityArchiveCandidates,
  listUsabilityTaskCandidates,
  loadCronJobs,
  loadTasks,
  updateTaskByIdCas,
} from "../../core/db";
import { CCM_DIR, sendJson } from "../../core/utils";
import { loadGroups } from "../collaboration/collaboration";
import { closeTaskAgentSessions, reconcileTaskAgentSessions } from "../../tasks/agent-sessions";
import { getProjectRuntimeSummaryReadOnly, projectDisplayName } from "../projects/project-runtime";
import { requestAccessPrincipal } from "./api-access-control";
import { requestTaskCancellation } from "../../agents/execution-kernel";
import { interruptTaskExecution, reconcileTaskInterruptionReceipt } from "../../tasks/task-interruption";
import { captureTaskRecoveryWorkspace, runTaskRecoveryOrchestrator } from "../../tasks/task-recovery-orchestrator";
import { acquireIdempotency, completeIdempotency, failIdempotency, releaseTaskLease } from "../../system/reliability-ledger";
import * as fs from "fs";
import * as path from "path";

const DAY = 24 * 60 * 60 * 1000;
const AUTO_ARCHIVE_DAYS = 30;
let archiveTimer: NodeJS.Timeout | null = null;
const GOVERNANCE_AUDIT_FILE = path.join(CCM_DIR, "task-governance-audit.jsonl");

type UsabilityActionDeps = {
  ctx: any;
  archiveTask: (id: string, reason?: string) => any;
  continueTaskWithMessage: (id: string, message: string, ctx: any, options?: any) => any;
  enqueueTask: (id: string, ctx: any) => any;
  removeTaskFromQueues: (id: string) => number;
  retryTask: (id: string, ctx: any, reason?: string, autoExecute?: boolean) => any;
};

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
  if (["paused", "waiting_user", "waiting_input", "needs_confirmation", "needs_input", "awaiting_user", "blocked"].includes(status) || blocking.length > 0) return "needs_user";
  if (status === "failed" || delivery.status === "failed") return "failed";
  if (["in_progress", "running", "cancelling", "reviewing", "reworking"].includes(status)) return "in_progress";
  if (["pending", "waiting", "queued"].includes(status)) return "queued";
  if (["done", "completed", "succeeded"].includes(status)) return Date.now() - timeOf(task.completed_at || task.updated_at) <= DAY ? "recently_completed" : "history";
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
  if (phase === "in_progress") return ["supplement", "interrupt", "pause", "cancel"];
  if (phase === "queued") return ["start", "edit", "cancel"];
  if (phase === "recently_completed") return ["view_report", "archive"];
  return ["view"];
}

function textFromValue(value: any) {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (!value || typeof value !== "object") return "";
  return firstText(value.content, value.title, value.label, value.summary, value.detail, value.description, value.name);
}

function latestWorkflowEvent(task: any) {
  const rows = [
    ...(Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []),
    ...(Array.isArray(task.timeline) ? task.timeline : []),
    ...(Array.isArray(task.activity_log) ? task.activity_log : []),
  ];
  return rows.sort((a: any, b: any) => timeOf(b.at || b.timestamp || b.updated_at || b.created_at) - timeOf(a.at || a.timestamp || a.updated_at || a.created_at))[0] || null;
}

function taskProgress(task: any, phase: string) {
  const delivery = task.delivery_summary || {};
  const reasoning = task.reasoning_loop || delivery.reasoning_loop || {};
  const kernel = task.execution_kernel || {};
  const latest = latestWorkflowEvent(task);
  const rawPercent = [task.progress_percent, task.progress_percentage, task.progress, kernel.progress_percent, reasoning.progress_percent]
    .find(value => Number.isFinite(Number(value)));
  const percent = rawPercent == null ? null : Math.max(0, Math.min(100, Number(rawPercent)));
  const currentStep = firstText(
    textFromValue(task.current_step), textFromValue(task.currentStep), textFromValue(kernel.current_step),
    textFromValue(reasoning.current_step), textFromValue(task.execution_plan?.current_step),
    phase === "queued" ? "等待执行资源" : "",
  );
  const startedAt = firstText(task.started_at, task.execution_started_at, task.queued_at);
  const startedMs = timeOf(startedAt);
  return {
    current_step: currentStep,
    percent,
    started_at: startedAt,
    elapsed_ms: startedMs > 0 ? Math.max(0, Date.now() - startedMs) : 0,
    last_action: firstText(textFromValue(latest), task.status_detail, delivery.detail),
    last_action_at: firstText(latest?.at, latest?.timestamp, latest?.updated_at, latest?.created_at, task.updated_at),
    waiting_reason: phase === "needs_user" || phase === "failed" || phase === "queued" ? taskReason(task, phase) : "",
  };
}

function taskAttentionKind(task: any, phase: string) {
  if (phase === "failed") return "failed";
  if (task.intake_state === "awaiting_confirmation" || ["needs_confirmation"].includes(String(task.status || ""))) return "confirmation";
  return phase === "needs_user" ? "supplement" : "";
}

function taskRevision(task: any) {
  return crypto.createHash("sha256").update(JSON.stringify({
    id: task?.id || "",
    status: task?.status || "",
    updated_at: task?.updated_at || "",
    intake_state: task?.intake_state || "",
    acceptance_state: task?.acceptance_state || "",
    archived: task?.archived === true,
  })).digest("hex");
}

function taskBlockerKind(task: any, phase: string) {
  if (task?.acceptance_state === "recovery_required" || task?.interruption_receipt?.schema === "ccm-task-interruption-receipt-v1") return "recovery_required";
  if (task?.intake_state === "awaiting_confirmation") return "waiting_confirmation";
  const permissionState = String(task?.permission_state || task?.permission_request?.state || "").toLowerCase();
  if (task?.permission_required === true || ["awaiting_user", "permission_required", "waiting_permission"].includes(permissionState)) return "permission_required";
  const status = String(task?.status || "").toLowerCase();
  if (status === "paused" || task?.paused === true || task?.is_paused === true) return "paused";
  if (phase === "failed") return "failed";
  if (["waiting_confirmation", "needs_confirmation"].includes(status)) return "waiting_confirmation";
  if (["waiting_user", "waiting_input", "needs_input", "awaiting_user", "needs_user", "blocked"].includes(status)
    || task?.collaboration_state?.needs_user === true) return "needs_user";
  return "";
}

function taskActionsForBlocker(task: any, phase: string) {
  const blocker = taskBlockerKind(task, phase);
  if (blocker === "waiting_confirmation") return ["confirm", "edit", "cancel"];
  if (blocker === "permission_required") return ["view_permission", "cancel"];
  if (blocker === "paused") return ["resume", "cancel"];
  if (blocker === "recovery_required") return task?.recovery_preflight?.recoveryMode === "manual_reconciliation"
    ? ["adopt_current_changes", "resume_interrupted", "cancel"]
    : ["resume_interrupted", "cancel"];
  if (blocker === "needs_user") return ["supplement", "cancel"];
  return taskActions(task, phase);
}

function publicTask(task: any) {
  const phase = taskPhase(task);
  const delivery = task.delivery_summary || {};
  const changed = Array.isArray(delivery.actual_file_changes) ? delivery.actual_file_changes.length : Number(delivery.actual_file_change_count || task.file_changes?.count || 0);
  const verified = Array.isArray(delivery.verification_executed) ? delivery.verification_executed.length : 0;
  return {
    id: task.id,
    revision: taskRevision(task),
    title: task.title || task.business_goal || "未命名任务",
    goal: task.business_goal || task.description || "",
    phase,
    status: task.status || "pending",
    reason: taskReason(task, phase).slice(0, 280),
    target_project: task.target_project || "",
    group_id: task.group_id || "",
    updated_at: task.updated_at || task.created_at || "",
    created_at: task.created_at || "",
    actions: taskActionsForBlocker(task, phase),
    blocker_kind: taskBlockerKind(task, phase),
    attention_kind: taskAttentionKind(task, phase),
    progress: taskProgress(task, phase),
    delivery: { files_changed: changed, verification_count: verified, report: delivery.user_report || task.final_report || "" },
    intake: task.intake_draft || null,
    technical: {
      trace_available: !!task.trace_id,
      source: task.source || task.request_origin || "",
    },
  };
}

export function archiveOldUsabilityHistory(now = Date.now()) {
  let changed = 0;
  let conflicts = 0;
  const cutoff = now - AUTO_ARCHIVE_DAYS * DAY;
  const tasks = listUsabilityArchiveCandidates(new Date(cutoff).toISOString(), new Date(now - DAY).toISOString());
  for (const task of tasks) {
    if (task.archived || task.deleted_at || !["done", "cancelled"].includes(String(task.status || ""))) continue;
    if (timeOf(task.completed_at || task.cancelled_at || task.updated_at || task.created_at) >= cutoff) continue;
    const expectedStatus = String(task.status || "");
    const expectedUpdatedAt = String(task.updated_at || "");
    const result = updateTaskByIdCas(task.id, current => (
      current.archived !== true
      && !current.deleted_at
      && String(current.status || "") === expectedStatus
      && String(current.updated_at || "") === expectedUpdatedAt
      && timeOf(current.completed_at || current.cancelled_at || current.updated_at || current.created_at) < cutoff
    ), current => ({
      ...current,
      archived: true,
      archived_at: new Date(now).toISOString(),
      archive_reason: `日常工作台自动归档：终态超过 ${AUTO_ARCHIVE_DAYS} 天`,
    }));
    if (result.updated) changed++;
    else if (result.conflict) conflicts++;
  }
  for (const task of tasks) {
    if (task.archived || task.deleted_at || task.intake_state !== "awaiting_confirmation") continue;
    if (timeOf(task.created_at) >= now - DAY) continue;
    const expectedUpdatedAt = String(task.updated_at || "");
    const result = updateTaskByIdCas(task.id, current => (
      current.archived !== true
      && !current.deleted_at
      && current.intake_state === "awaiting_confirmation"
      && String(current.updated_at || "") === expectedUpdatedAt
      && timeOf(current.created_at) < now - DAY
    ), current => ({
      ...current,
      archived: true,
      status: "archived",
      archived_at: new Date(now).toISOString(),
      archive_reason: "执行前确认卡超过 24 小时未确认，自动归档",
    }));
    if (result.updated) changed++;
    else if (result.conflict) conflicts++;
  }
  if (changed || conflicts) appendGovernanceAudit({ type: "automatic_task_archive", changed, conflicts, retention_days: AUTO_ARCHIVE_DAYS });
  return { changed, conflicts, retention_days: AUTO_ARCHIVE_DAYS };
}

export function runUsabilityGovernance() {
  const archive = archiveOldUsabilityHistory();
  const sessions = reconcileTaskAgentSessions(loadTasks());
  if (sessions.closed) appendGovernanceAudit({ type: "stale_session_cleanup", closed: sessions.closed, session_ids: sessions.sessions.map((item: any) => item.id) });
  return { archive, sessions: { closed: sessions.closed }, audit_file: GOVERNANCE_AUDIT_FILE };
}

function readProjectResources() {
  return getConfigs().map((config: any) => {
    const info = getConfigInfo(config.path)?.[0] || {};
    const agentConnected = isRunningReadOnly(config.name);
    let runtimeSummary: any = {
      profile_count: 0,
      running_count: 0,
      unknown_count: 0,
      building_count: 0,
      selected_profile_id: "",
      profiles: [],
      processes: [],
    };
    try { runtimeSummary = getProjectRuntimeSummaryReadOnly(config.name); } catch {}
    return {
      name: config.name,
      display_name: projectDisplayName(config.name),
      agent: info.agent || "claudecode",
      agent_connection: { connected: agentConnected },
      runtime_summary: runtimeSummary,
      actions: {
        agent: agentConnected ? ["open", "disconnect"] : ["open", "connect"],
        runtime: runtimeSummary.profile_count ? ["start", "stop", "restart", "build"] : ["configure"],
      },
    };
  });
}

function pageMeta(total: number, pageSize: number) {
  return {
    total,
    page_size: pageSize,
    next_cursor: total > pageSize ? Buffer.from(String(pageSize), "utf-8").toString("base64url") : "",
    truncated: total > pageSize,
  };
}

function workbenchCapabilities(principal: any) {
  const capabilities = new Set(Array.isArray(principal?.capabilities) ? principal.capabilities : []);
  const role = principal?.role || "user";
  return {
    role,
    task_execute: role === "admin" || capabilities.has("task.execute"),
    project_runtime: role === "admin" || capabilities.has("project.runtime"),
    project_git: role === "admin" || capabilities.has("project.git"),
    cron_manage: role === "admin",
    required_roles: {
      task_execute: "user",
      project_runtime: "user",
      cron_manage: "admin",
    },
  };
}

export function buildUsabilityWorkbench(options: { runArchive?: boolean; principal?: any } = {}) {
  const archive = options.runArchive === false ? { changed: 0, conflicts: 0, retention_days: AUTO_ARCHIVE_DAYS } : archiveOldUsabilityHistory();
  const recentCutoff = new Date(Date.now() - DAY).toISOString();
  const tasks = listUsabilityTaskCandidates(recentCutoff).filter((item: any) => !item.archived && !item.deleted_at).map(publicTask)
    .sort((a: any, b: any) => timeOf(b.updated_at) - timeOf(a.updated_at));
  const buckets: Record<string, any[]> = { needs_user: [], failed: [], in_progress: [], queued: [], recently_completed: [], history: [] };
  tasks.forEach((task: any) => (buckets[task.phase] || buckets.history).push(task));
  const notifications = [...buckets.failed, ...buckets.needs_user, ...buckets.recently_completed].slice(0, 12).map(task => ({
    id: `${task.id}:${task.phase}:${task.updated_at}`,
    level: task.phase === "failed" ? "error" : task.phase === "needs_user" ? "decision" : "success",
    task,
  }));
  const projects = readProjectResources();
  const groups = loadGroups().map((group: any) => ({ id: group.id, name: group.name, members: Array.isArray(group.members) ? group.members.length : 0 }));
  const cron = loadCronJobs().filter((job: any) => !job.archived && !job.deleted_at).map((job: any) => ({
    id: job.id, name: job.name || job.title || "定时任务", enabled: job.enabled !== false && job.status !== "paused", next_run: job.next_run || job.nextRun || "", last_status: job.last_status || job.lastStatus || "", actions: ["open", "toggle"],
  }));
  const attentionCounts = { confirmation: 0, failed: 0, supplement: 0 };
  [...buckets.failed, ...buckets.needs_user].forEach((task: any) => {
    const key = task.attention_kind as keyof typeof attentionCounts;
    if (key && key in attentionCounts) attentionCounts[key]++;
  });
  const active = [...buckets.in_progress, ...buckets.queued];
  const completed = buckets.recently_completed;
  const pageSize = 12;
  const stable = {
    counts: Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, value.length])),
    attention_counts: attentionCounts,
    attention: [...buckets.failed, ...buckets.needs_user].slice(0, 5),
    active: active.slice(0, pageSize),
    completed: completed.slice(0, pageSize),
    resources: {
      projects: projects.slice(0, 50),
      groups: groups.slice(0, 50),
      cron: cron.slice(0, 50),
    },
  };
  return {
    schema: "ccm-usability-workbench-snapshot-v3",
    version: 3,
    generated_at: new Date().toISOString(),
    archive,
    checksum: crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex"),
    ...stable,
    notifications,
    pages: {
      active: pageMeta(active.length, pageSize),
      completed: pageMeta(completed.length, pageSize),
      projects: pageMeta(projects.length, 50),
      groups: pageMeta(groups.length, 50),
      cron: pageMeta(cron.length, 50),
    },
    capabilities: workbenchCapabilities(options.principal),
    onboarding: { empty: projects.length === 0 && groups.length === 0, has_tasks: tasks.length > 0 },
  };
}

function decodeCursor(value: any) {
  if (!value) return 0;
  try {
    const offset = Number(Buffer.from(String(value), "base64url").toString("utf-8"));
    return Number.isInteger(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(value: number) {
  return Buffer.from(String(value), "utf-8").toString("base64url");
}

function workbenchSectionItems(section: string) {
  if (["active", "completed", "attention"].includes(section)) {
    const tasks = listUsabilityTaskCandidates(new Date(Date.now() - DAY).toISOString())
      .filter((item: any) => !item.archived && !item.deleted_at)
      .map(publicTask)
      .sort((a: any, b: any) => timeOf(b.updated_at) - timeOf(a.updated_at));
    if (section === "active") return tasks.filter(task => ["in_progress", "queued"].includes(task.phase));
    if (section === "completed") return tasks.filter(task => task.phase === "recently_completed");
    return tasks.filter(task => ["failed", "needs_user"].includes(task.phase));
  }
  if (section === "projects") return readProjectResources();
  if (section === "groups") return loadGroups().map((group: any) => ({ id: group.id, name: group.name, members: Array.isArray(group.members) ? group.members.length : 0 }));
  if (section === "cron") return loadCronJobs().filter((job: any) => !job.archived && !job.deleted_at).map((job: any) => ({
    id: job.id,
    name: job.name || job.title || "定时任务",
    enabled: job.enabled !== false && job.status !== "paused",
    next_run: job.next_run || job.nextRun || "",
    last_status: job.last_status || job.lastStatus || "",
  }));
  throw new Error("不支持的工作台分页区域");
}

function sendWorkbenchEvent(res: ServerResponse, payload: any) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function workbenchSignature(snapshot: any) {
  const { generated_at: _generatedAt, archive: _archive, ...stable } = snapshot || {};
  return JSON.stringify(stable);
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

function readActionBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    let rejected = false;
    req.on("data", chunk => {
      if (rejected) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf-8") > 256 * 1024) {
        rejected = true;
        reject(new Error("任务操作内容过大"));
      }
    });
    req.on("end", () => {
      if (rejected) return;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("任务操作JSON无效")); }
    });
    req.on("error", reject);
  });
}

function workbenchActionReceipt(task: any, revisionBefore: string, action: string, principal: any, clientMessageId: string, result: any) {
  const value = {
    schema: "ccm-workbench-task-action-receipt-v1",
    task_id: task.id,
    action,
    actor_id: principal?.userId || "",
    actor_role: principal?.role || "internal",
    client_message_id: clientMessageId,
    task_revision_before: revisionBefore,
    task_revision_after: taskRevision(task),
    result_status: result?.task?.status || result?.status || task.status || "",
    created_at: new Date().toISOString(),
  };
  return {
    ...value,
    checksum: crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  };
}

function assertTaskRevision(task: any, expected: any) {
  const supplied = String(expected || "").trim();
  if (!supplied) return;
  if (supplied !== taskRevision(task)) {
    const error: any = new Error("任务状态已经变化，请刷新工作台后重试");
    error.code = "state_drift";
    throw error;
  }
}

async function executeWorkbenchTaskAction(
  taskId: string,
  payload: any,
  req: IncomingMessage,
  deps: UsabilityActionDeps,
) {
  const principal = requestAccessPrincipal(req);
  if (!principal || principal.kind !== "browser") throw new Error("任务操作需要已登录用户");
  const action = String(payload.action || "").trim();
  const clientMessageId = String(payload.client_message_id || payload.clientMessageId || "").trim();
  if (!clientMessageId) throw new Error("缺少client_message_id");
  let task = getTaskById(taskId);
  if (!task || task.archived || task.deleted_at) {
    const error: any = new Error("任务不存在或已归档");
    error.status = 404;
    throw error;
  }
  assertTaskRevision(task, payload.expected_revision);
  const revisionBefore = taskRevision(task);
  const phase = taskPhase(task);
  const blocker = taskBlockerKind(task, phase);
  const allowed = new Set(taskActionsForBlocker(task, phase));
  if (!allowed.has(action)) {
    const error: any = new Error(`当前任务状态不允许“${action}”操作`);
    error.code = "action_not_allowed";
    error.status = 409;
    throw error;
  }
  const operationKey = `${taskId}:${action}:${clientMessageId}`;
  const operation = acquireIdempotency({ scope: "workbench-task-action", key: operationKey, traceId: task.trace_id, leaseMs: 60_000 });
  if (!operation.acquired) return { success: true, duplicate: true, ...(operation.record?.result || {}) };
  try {
    let result: any = null;
    if (action === "pause") {
      deps.removeTaskFromQueues(taskId);
      const changed = updateTaskByIdCas(taskId, current => (
        taskRevision(current) === taskRevision(task)
        && ["pending", "queued", "waiting", "in_progress", "running"].includes(String(current.status || ""))
      ), current => ({
        ...current,
        status: "paused",
        paused: true,
        is_paused: true,
        auto_execute: false,
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_detail: "用户从工作台暂停任务",
      }));
      if (!changed.updated) throw Object.assign(new Error("任务状态已经变化，请刷新后重试"), { code: "state_drift" });
      result = { task: changed.task };
    } else if (action === "resume") {
      if (blocker !== "paused") throw Object.assign(new Error("只有已暂停任务可以直接恢复"), { code: "resume_gate_failed" });
      const changed = updateTaskByIdCas(taskId, current => (
        taskRevision(current) === taskRevision(task)
        && (String(current.status || "") === "paused" || current.paused === true || current.is_paused === true)
      ), current => ({
        ...current,
        status: "pending",
        paused: false,
        is_paused: false,
        auto_execute: true,
        resumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_detail: "用户从工作台恢复任务",
      }));
      if (!changed.updated) throw Object.assign(new Error("任务状态已经变化，请刷新后重试"), { code: "state_drift" });
      result = { task: changed.task, queue_result: deps.enqueueTask(taskId, deps.ctx) };
    } else if (action === "interrupt") {
      deps.removeTaskFromQueues(taskId);
      const interruptionWorkspace = captureTaskRecoveryWorkspace(task);
      const interrupted = interruptTaskExecution({
        task,
        reasonCode: "user_interrupt",
        reason: String(payload.reason || "用户从工作台停止当前执行"),
        actor: `workbench:${principal.userId || "user"}`,
        checkpoint: String(task.acceptance_state || task.status || "unknown"),
        sideEffectState: "uncertain",
        workspaceChecksum: interruptionWorkspace.checksum,
        changedFileCount: interruptionWorkspace.changedFileCount,
      });
      const changed = updateTaskByIdCas(taskId, current => taskRevision(current) === taskRevision(task), current => ({
        ...current,
        status: "blocked",
        acceptance_state: "recovery_required",
        auto_execute: false,
        paused: true,
        is_paused: true,
        recovery_pending: true,
        interruption_receipt: interrupted.receipt,
        interrupted_at: interrupted.receipt.interrupted_at,
        updated_at: new Date().toISOString(),
        status_detail: "当前执行已停止，任务和子 Agent 会话已保留",
      }));
      if (!changed.updated) throw Object.assign(new Error("任务状态已经变化，请刷新后重试"), { code: "state_drift" });
      releaseTaskLease(taskId, "interrupted");
      result = { task: changed.task, interruption_receipt: interrupted.receipt };
    } else if (action === "resume_interrupted" || action === "adopt_current_changes") {
      if (blocker !== "recovery_required") throw Object.assign(new Error("当前任务不在可恢复中断状态"), { code: "recovery_gate_failed" });
      let workspace = captureTaskRecoveryWorkspace(task);
      if (action === "adopt_current_changes") {
        const reconciledReceipt = reconcileTaskInterruptionReceipt(task, { action: "adopt_current_changes", workspaceChecksum: workspace.checksum, actor: `workbench:${principal.userId || "user"}` });
        const reconciled = updateTaskByIdCas(taskId, current => taskRevision(current) === taskRevision(task), current => ({
          ...current,
          interruption_receipt: reconciledReceipt,
          recovery_preflight: null,
          status_detail: "已采用当前工作区改动，正在重新执行恢复检查",
          updated_at: new Date().toISOString(),
        }));
        if (!reconciled.updated) throw Object.assign(new Error("任务状态已经变化，请刷新后重试"), { code: "state_drift" });
        task = reconciled.task;
        workspace = captureTaskRecoveryWorkspace(task);
      }
      const recovery = await runTaskRecoveryOrchestrator(task, {
        scope: task.group_id ? "group" : task.project_session_id ? "project" : "global",
        scopeId: String(task.group_id || task.target_project || "global"),
        exactSessionId: String(task.group_session_id || task.project_session_id || task.origin_session_id || task.task_agent_session_id || task.id),
        idempotencyKey: clientMessageId || `${taskId}:${task.interruption_receipt?.checksum || "resume"}`,
        authorizationValid: true,
        runtimeValid: true,
        currentWorkspaceChecksum: workspace.checksum,
        worktreeOwnershipValid: workspace.ownershipValid,
        enqueue: id => deps.enqueueTask(id, deps.ctx),
      });
      if (!recovery.success) throw Object.assign(new Error(recovery.preflight?.blockers?.join("、") || "恢复安全检查未通过"), { code: "recovery_gate_failed", recovery_preflight: recovery.preflight });
      result = { task: recovery.task, queue_result: recovery.queueResult, recovery_decision: recovery.decision, recovery_preflight: recovery.preflight, recovery_transaction: recovery.transaction };
    } else if (action === "retry") {
      if (blocker !== "failed") throw Object.assign(new Error("只有失败任务可以重试"), { code: "retry_gate_failed" });
      result = deps.retryTask(taskId, deps.ctx, String(payload.message || payload.reason || "用户从工作台按失败缺口重试"), true);
      if (result?.success === false) throw new Error(result.error || "任务重试失败");
    } else if (action === "start") {
      if (blocker) throw Object.assign(new Error("任务仍有未处理的确认或阻塞，不能直接开始"), { code: "start_gate_failed" });
      result = { task, queue_result: deps.enqueueTask(taskId, deps.ctx) };
    } else if (action === "supplement") {
      const message = String(payload.message || "").trim();
      if (blocker !== "needs_user") throw Object.assign(new Error("当前任务不在等待补充状态"), { code: "supplement_gate_failed" });
      if (!message) throw new Error("请填写补充说明");
      result = deps.continueTaskWithMessage(taskId, message, deps.ctx, {
        source: "workbench",
        resolve_waiting_user: true,
        client_message_id: clientMessageId,
      });
      if (result?.success === false) throw new Error(result.error || "补充说明提交失败");
    } else if (action === "archive") {
      if (!["recently_completed", "history"].includes(phase)) throw Object.assign(new Error("只有终态任务可以归档"), { code: "archive_gate_failed" });
      result = { task: deps.archiveTask(taskId, "用户从工作台归档已完成任务") };
    } else if (action === "cancel") {
      deps.removeTaskFromQueues(taskId);
      requestTaskCancellation(taskId, "用户从工作台取消任务", "usability-workbench");
      const changed = updateTaskByIdCas(taskId, current => taskRevision(current) === taskRevision(task), current => ({
        ...current,
        status: "cancelled",
        acceptance_state: "cancelled",
        auto_execute: false,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_detail: "用户从工作台取消任务",
      }));
      if (!changed.updated) throw Object.assign(new Error("任务状态已经变化，请刷新后重试"), { code: "state_drift" });
      closeTaskAgentSessions({ taskId }, "用户从工作台取消任务");
      releaseTaskLease(taskId, "cancelled");
      result = { task: changed.task };
    } else if (action === "view_permission") {
      result = { task, navigate: { tab: "tasks", task_id: taskId, permission_required: true } };
    } else {
      throw Object.assign(new Error("该操作需要在任务详情中完成"), { code: "detail_action_required", status: 409 });
    }
    task = getTaskById(taskId) || result?.task || task;
    const receipt = workbenchActionReceipt(task, revisionBefore, action, principal, clientMessageId, result);
    const response = { success: true, task: publicTask(task), action_receipt: receipt, queue_result: result?.queue_result || null, navigate: result?.navigate || null };
    completeIdempotency("workbench-task-action", operationKey, response);
    appendGovernanceAudit({ type: "workbench_task_action", task_id: taskId, action, actor_id: principal.userId, receipt_checksum: receipt.checksum });
    return response;
  } catch (error: any) {
    failIdempotency("workbench-task-action", operationKey, error?.message || "工作台任务操作失败");
    throw error;
  }
}

export function handleUsabilityApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any = null, actionDeps?: UsabilityActionDeps) {
  if (pathname === "/api/usability/workbench" && req.method === "GET") {
    // Archival governance runs on its scheduler, not on a user-facing read path.
    sendJson(res, buildUsabilityWorkbench({ runArchive: false, principal: requestAccessPrincipal(req) }));
    return true;
  }
  if (pathname === "/api/usability/workbench/items" && req.method === "GET") {
    try {
      const section = String(parsed?.query?.section || "");
      const limit = Math.max(1, Math.min(100, Number(parsed?.query?.limit || 25)));
      const offset = decodeCursor(parsed?.query?.cursor);
      const rows = workbenchSectionItems(section);
      const items = rows.slice(offset, offset + limit);
      sendJson(res, {
        success: true,
        schema: "ccm-usability-workbench-page-v3",
        section,
        items,
        total: rows.length,
        next_cursor: offset + items.length < rows.length ? encodeCursor(offset + items.length) : "",
        checksum: crypto.createHash("sha256").update(JSON.stringify(items)).digest("hex"),
      });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取工作台分页失败" }, 400);
    }
    return true;
  }
  const taskActionMatch = pathname.match(/^\/api\/usability\/tasks\/([^/]+)\/action$/);
  if (taskActionMatch && req.method === "POST") {
    if (!actionDeps) {
      sendJson(res, { success: false, error: "工作台任务运行时尚未就绪" }, 503);
      return true;
    }
    void readActionBody(req)
      .then(payload => executeWorkbenchTaskAction(decodeURIComponent(taskActionMatch[1]), payload, req, actionDeps))
      .then(result => sendJson(res, result))
      .catch((error: any) => sendJson(res, { success: false, error: error?.message || "工作台任务操作失败", code: error?.code || "" }, Number(error?.status || (error?.code === "state_drift" ? 409 : 400))));
    return true;
  }
  if (pathname === "/api/usability/workbench/stream" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    let snapshot = buildUsabilityWorkbench({ runArchive: false, principal: requestAccessPrincipal(req) });
    let signature = workbenchSignature(snapshot);
    let refreshTimer: NodeJS.Timeout | null = null;
    sendWorkbenchEvent(res, { type: "snapshot", data: snapshot });
    const refresh = () => {
      try {
        const next = buildUsabilityWorkbench({ runArchive: false, principal: requestAccessPrincipal(req) });
        const nextSignature = workbenchSignature(next);
        if (nextSignature !== signature) {
          snapshot = next;
          signature = nextSignature;
          sendWorkbenchEvent(res, { type: "update", data: snapshot });
        }
      } catch (error: any) {
        sendWorkbenchEvent(res, { type: "warning", message: error?.message || String(error) });
      }
    };
    const unsubscribe = subscribeRuntimeEventListener(["task", "permission", "agent", "feishu", "project", "group", "cron"], () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, 180);
    });
    const heartbeat = setInterval(() => sendWorkbenchEvent(res, { type: "heartbeat", generated_at: new Date().toISOString() }), 15_000);
    heartbeat.unref?.();
    req.on("close", () => {
      unsubscribe();
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(heartbeat);
    });
    return true;
  }
  if (pathname === "/api/usability/archive-history" && req.method === "POST") {
    sendJson(res, { success: true, ...archiveOldUsabilityHistory() });
    return true;
  }
  return false;
}
