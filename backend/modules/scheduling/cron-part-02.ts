// Behavior-freeze split from cron.ts (part 2/2).
import { collectRequestBuffer, getMultipartBoundary, parseMultipart, sendJson } from "../../core/utils";
import * as fs from "fs";
import * as path from "path";
import {
  loadAutoDevNotifyConfig,
  loadCronJobs,
  loadDevReports,
  loadDevWeeklyReports,
  loadTasks,
  saveTasks,
} from "../../core/db";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import {
  claimReadyDailyDevBacklog,
  continueDailyDevTasksFromGaps,
  createAndQueueTask,
  removeTaskFromQueues,
  retryTask,
  updateTask,
  importSharedDocsToDailyDevBacklog,
  markDailyDevBacklogStatus,
  type CollabCtx,
} from "../collaboration/collaboration";
import {
  acquireIdempotency,
  completeIdempotency,
  failIdempotency,
  getIdempotencyRecord,
} from "../../system/reliability-ledger";
import {
  computeNextRun,
  createCronJob,
  deleteCronJob,
  appendCronRun,
  findCronRunForTask,
  matchesCron,
  minuteKey,
  normalizeCronJob,
  normalizeTargetType,
  patchCronJob,
  patchCronRun,
  purgeCronJob,
  restoreCronJob,
  syncCronRunTask,
  updateCronJob,
  validateCronJobPayload,
} from "./cron-job-store";
import {
  dispatchAutoDevReport,
  localDateKey,
  normalizeAutoDevNotifyConfig,
  saveNormalizedNotifyConfig,
  tickAutoDevReportNotifications,
  upsertAutoDevDailyReport,
  upsertAutoDevWeeklyReport,
} from "./cron-dev-reports";
import {
  getWorkJournalAudit,
  listWorkJournalEvents,
} from "./work-journal";
import { loadGroups } from "../collaboration/storage";
import { tickFeishuNotificationOutbox } from "../collaboration/feishu-channel";
import { sendFeishuReportMessage } from "../collaboration/feishu";
import { cancelTestAgentRunsForTask } from "../collaboration/test-agent-runner";
import { requestTaskCancellation } from "../../agents/execution-kernel";
import { listTestAgentArtifactCatalogForTasks } from "../../test-agent/artifact-retention";
import {
  discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits,
  discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions,
  listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds,
  reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans,
  reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals,
  recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger,
  runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance,
  runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention,
  runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention,
} from "../collaboration/group-memory-index";
import { buildTaskAttachmentMutation, parseRetainedAttachmentIds, removeUploadedFiles } from "../../system/task-attachments";

import {
  runningCronJobs,
  latestConflictResolutionMaintenanceTick,
  attachCronRunToTasks,
  buildTaskFromCronJob,
  cancelCronRun,
  cronRetryPatch,
  notifyCronRun,
  publicCronJobs,
  scheduleFailedCronRunRetry,
  formatCronMetaSummary,
  CRON_RUN_ACTIVE_STATUSES,
  runConflictResolutionMemoryMaintenanceSchedulerTick,
} from "./cron-part-01";

let schedulerTimer: NodeJS.Timeout | null = null;

export function syncCronTaskStatus(task: any, status: string, result = "") {
  const cronJobId = task?.cron_job_id;
  if (!cronJobId) return;

  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === cronJobId);
  if (!job) return;

  const resultText = String(result || task.result || "").trim();
  const preferredRunId = String(task?.cron_run_id || task?.workflow_meta?.cron_run_id || "");
  const matchedRun = findCronRunForTask(job, String(task?.id || ""), preferredRunId);
  const syncedRun = matchedRun
    ? syncCronRunTask(cronJobId, matchedRun.id, String(task?.id || ""), status, resultText, task?.updated_at || new Date().toISOString())
    : null;
  const patch: any = {
    last_task_id: task.id || job.last_task_id || null,
    last_task_ids: syncedRun?.task_ids || job.last_task_ids || [],
    next_run: job.enabled === false ? null : computeNextRun(job.schedule, new Date(), normalizeCronJob(job).timezone),
  };

  if (syncedRun) {
    patch.last_status = syncedRun.status;
    patch.last_result = syncedRun.result || resultText || job.last_result || "任务状态已更新";
  } else if (status === "in_progress") {
    patch.last_status = "running_task";
    patch.last_result = "任务已进入执行阶段";
  } else if (status === "done") {
    patch.last_status = "done";
    patch.last_result = resultText || "任务执行完成";
  } else if (status === "waiting") {
    patch.last_status = "waiting";
    patch.last_result = resultText || "任务仍在进行，等待下一步处理";
  } else if (status === "failed") {
    patch.last_status = "failed";
    patch.last_result = resultText || "任务执行失败";
  } else {
    patch.last_status = status || "queued";
    patch.last_result = resultText || patch.last_result || "";
  }

  patchCronJob(cronJobId, patch);
  if (syncedRun?.status === "failed") {
    const retried = scheduleFailedCronRunRetry(loadCronJobs().find(item => item.id === cronJobId), syncedRun);
    notifyCronRun(cronJobId, syncedRun.id, "failed");
    if (!retried?.next_retry_at) patchCronJob(cronJobId, { last_status: "failed", last_result: resultText || "任务执行失败" });
  } else if (syncedRun?.status === "done") {
    notifyCronRun(cronJobId, syncedRun.id, "done");
  } else if (syncedRun?.status === "waiting") {
    notifyCronRun(cronJobId, syncedRun.id, "waiting");
  } else if (syncedRun?.status === "cancelled") {
    notifyCronRun(cronJobId, syncedRun.id, "cancelled");
  }
  const backlogFile = task?.workflow_meta?.intake?.backlog_file;
  if (task?.group_id && backlogFile) {
    const backlogStatus = status === "done"
      ? "done"
      : status === "failed"
        ? "blocked"
        : status === "waiting"
          ? "blocked"
          : status === "in_progress"
            ? "in_progress"
            : "queued";
    markDailyDevBacklogStatus(task.group_id, backlogFile, backlogStatus, {
      task_id: task.id,
      result: resultText || patch.last_result || status,
    });
  }
}

type CronRunTrigger = "manual" | "schedule" | "recovery" | "retry" | "resume";

async function runCronJobCore(id: string, ctx: CollabCtx, trigger: CronRunTrigger, reliability: any = null, options: any = {}) {
  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error("定时任务不存在");
  if (job.archived || job.deleted_at) throw new Error("定时任务已归档，请先恢复后再运行");

  if (runningCronJobs.has(id)) {
    return { success: false, message: "定时任务正在触发中，请稍后再试" };
  }

  const now = new Date();
  const normalizedJob = normalizeCronJob(job);
  const scheduledFor = options.scheduledFor || (trigger === "schedule" || trigger === "recovery" ? job.next_run : null);
  const nextRun = computeNextRun(job.schedule, now, normalizedJob.timezone);
  runningCronJobs.add(id);
  const cronRun = appendCronRun(id, {
    trigger,
    started_at: now.toISOString(),
    status: "triggering",
    result: "正在创建并派发任务...",
    parent_run_id: options.parentRunId || "",
    attempt: options.attempt || 1,
    scheduled_for: scheduledFor,
    meta: { reliability_trace_id: reliability?.traceId || "", recovered_misfire: trigger === "recovery" },
  });
  if (!cronRun) {
    runningCronJobs.delete(id);
    throw new Error("定时任务运行记录创建失败");
  }
  patchCronJob(id, {
    last_run: now.toISOString(),
    last_run_key: minuteKey(scheduledFor ? new Date(scheduledFor) : now, normalizedJob.timezone),
    last_scheduled_at: scheduledFor || null,
    last_status: "running",
    last_result: "正在创建并派发任务...",
  });
  notifyCronRun(id, cronRun.id, trigger === "recovery" ? "recovered" : "started");

  let taskDraft: any = null;
  let taskDrafts: any[] = [];
  let cronMeta: any = {};
  let gapContinueResult: any = null;
  try {
    validateCronJobPayload(job);
    const targetType = normalizeTargetType(job);
    const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
    const shouldContinueGaps = targetType === "group" && workflowType === "daily_dev"
      && job.continue_gaps !== false
      && job.continueGaps !== false;
    if (shouldContinueGaps) {
      gapContinueResult = continueDailyDevTasksFromGaps(ctx, {
        group_id: job.group_id,
        limit: Math.max(1, Math.min(20, Number(job.gap_continue_limit || job.gapContinueLimit || 3))),
        auto_execute: true,
        source: "cron_gap_rework",
      });
    }
    taskDraft = buildTaskFromCronJob(job, trigger);
    cronMeta = taskDraft?.meta || {};
    if (gapContinueResult) {
      cronMeta.continued_gap_tasks = {
        continued: gapContinueResult.continued || 0,
        queued: gapContinueResult.queued || 0,
        blocked: gapContinueResult.blocked || 0,
        failed: gapContinueResult.failed || 0,
        task_ids: (gapContinueResult.results || []).filter((item: any) => item.success).map((item: any) => item.task_id),
      };
    }
    taskDrafts = Array.isArray(taskDraft?.drafts)
      ? taskDraft.drafts
      : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean));
    taskDrafts = taskDrafts.map((draft: any) => ({
      ...draft,
      cron_run_id: cronRun.id,
      workflow_meta: {
        ...(draft?.workflow_meta || {}),
        cron_run_id: cronRun.id,
      },
    }));
    if (reliability?.operationKey) {
      taskDrafts = taskDrafts.map((draft: any, index: number) => ({
        ...draft,
        trace_id: reliability.traceId,
        idempotency_key: `cron:${reliability.operationKey}:draft:${index}:${draft?.workflow_meta?.intake?.backlog_file || draft?.title || "task"}`,
      }));
    }
    if (taskDrafts.length === 0) {
      const continuedCount = Number(gapContinueResult?.continued || 0);
      const queuedCount = Number(gapContinueResult?.queued || 0);
      const blockedCount = Number(gapContinueResult?.blocked || 0);
      const continuedTaskIds = cronMeta.continued_gap_tasks?.task_ids || [];
      attachCronRunToTasks(continuedTaskIds, id, cronRun.id);
      const result = continuedCount > 0
        ? `本次定时任务续跑 ${continuedCount} 个交付缺口任务，入队 ${queuedCount} 个；没有 ready 状态的新需求池文件${formatCronMetaSummary(cronMeta)}`
        : `没有 ready 状态的业务需求池文件，本次定时任务跳过且未创建空任务${formatCronMetaSummary(cronMeta)}`;
      const updated = patchCronJob(id, {
        last_status: continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "continued")) : "skipped",
        last_result: result,
        last_run_meta: cronMeta,
        last_task_ids: continuedCount > 0 ? (cronMeta.continued_gap_tasks?.task_ids || []) : job.last_task_ids,
        run_count: Number(job.run_count || 0) + 1,
        next_run: nextRun,
      });
      const runStatus = continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "done")) : "skipped";
      const run = patchCronRun(id, cronRun.id, {
        status: runStatus,
        result,
        task_ids: continuedTaskIds,
        primary_task_id: continuedTaskIds[0] || "",
        task_states: Object.fromEntries(continuedTaskIds.map((taskId: string) => [taskId, { status: queuedCount > 0 ? "queued" : "waiting", result, updated_at: new Date().toISOString() }])),
        dispatched_at: continuedCount > 0 ? new Date().toISOString() : null,
        completed_at: runStatus === "skipped" || runStatus === "done" ? new Date().toISOString() : null,
        meta: cronMeta,
      });
      if (runStatus === "done" || runStatus === "skipped") notifyCronRun(id, cronRun.id, "done");
      return { success: true, queued: queuedCount > 0, skipped: continuedCount === 0, continued: continuedCount, message: result, job: updated, run, gap_continue_result: gapContinueResult };
    }
    const created = taskDrafts.map((draft) => {
      const { task, queueResult } = createAndQueueTask(draft, ctx);
      const backlogFile = task?.workflow_meta?.intake?.backlog_file;
      if (task?.group_id && backlogFile) {
        markDailyDevBacklogStatus(task.group_id, backlogFile, "queued", {
          task_id: task.id,
          result: `${queueResult?.message || "任务已创建"}：${task.title}`,
        });
      }
      return { task, queueResult, queued: !!queueResult?.queued };
    });
    const continuedTaskIds = (cronMeta.continued_gap_tasks?.task_ids || []).map((taskId: any) => String(taskId));
    const createdTaskIds = [...new Set([...continuedTaskIds, ...created.map(item => String(item.task.id))])];
    attachCronRunToTasks(createdTaskIds, id, cronRun.id);
    const queuedCount = created.filter(item => item.queued).length;
    if (created.length > 1) {
      const status = queuedCount > 0 ? "queued" : (created.some(item => item.queueResult?.blocked) ? "waiting" : "skipped");
      const result = `批量创建 ${created.length} 个业务开发任务，已入队 ${queuedCount} 个${formatCronMetaSummary(cronMeta)}`;
      const updated = patchCronJob(id, {
        last_status: status,
        last_result: result,
        last_run_meta: cronMeta,
        last_task_id: created[created.length - 1]?.task?.id || null,
        last_task_ids: created.map(item => item.task.id),
        run_count: Number(job.run_count || 0) + 1,
        next_run: nextRun,
      });
      const run = patchCronRun(id, cronRun.id, {
        status,
        result,
        task_ids: createdTaskIds,
        primary_task_id: createdTaskIds[0] || "",
        task_states: Object.fromEntries([
          ...continuedTaskIds.map((taskId: string) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
          ...created.map(item => [String(item.task.id), { status: item.queued ? "queued" : (item.queueResult?.blocked ? "waiting" : "skipped"), result: item.queueResult?.message || result, updated_at: new Date().toISOString() }]),
        ]),
        dispatched_at: new Date().toISOString(),
        completed_at: status === "skipped" ? new Date().toISOString() : null,
        meta: cronMeta,
      });
      return {
        success: true,
        queued: queuedCount > 0,
        queued_count: queuedCount,
        task_count: created.length,
        tasks: created.map(item => item.task),
        results: created,
        job: updated,
        run,
      };
    }
    const { task, queueResult, queued } = created[0];
    const status = queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped");
    const result = `${queueResult?.message || "任务已创建"}：${task.title}${formatCronMetaSummary(cronMeta)}`;
    const updated = patchCronJob(id, {
      last_status: status,
      last_result: result,
      last_run_meta: cronMeta,
      last_task_id: task.id,
      run_count: Number(job.run_count || 0) + 1,
      next_run: nextRun,
    });
    const run = patchCronRun(id, cronRun.id, {
      status,
      result,
      task_ids: createdTaskIds,
      primary_task_id: String(task.id),
      task_states: Object.fromEntries([
        ...continuedTaskIds.map((taskId: string) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
        [String(task.id), { status: queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped"), result: queueResult?.message || result, updated_at: new Date().toISOString() }],
      ]),
      dispatched_at: new Date().toISOString(),
      completed_at: status === "skipped" ? new Date().toISOString() : null,
      meta: cronMeta,
    });
    return { success: true, queued, task, queue_result: queueResult, job: updated, run };
  } catch (e: any) {
    const drafts = taskDrafts.length ? taskDrafts : (Array.isArray(taskDraft?.drafts) ? taskDraft.drafts : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean)));
    for (const draft of drafts) {
      const backlogFile = draft?.workflow_meta?.intake?.backlog_file;
      if (!draft?.group_id || !backlogFile) continue;
      markDailyDevBacklogStatus(draft.group_id, backlogFile, "ready", {
        result: `定时任务创建失败，已恢复为 ready：${e.message}`,
      });
    }
    const updated = patchCronJob(id, {
      last_status: "failed",
      last_result: e.message,
      last_run_meta: cronMeta,
      run_count: Number(job.run_count || 0) + 1,
      next_run: nextRun,
    });
    let run = patchCronRun(id, cronRun.id, {
      status: "failed",
      result: e.message,
      completed_at: new Date().toISOString(),
      meta: cronMeta,
    });
    run = scheduleFailedCronRunRetry(updated, run);
    notifyCronRun(id, cronRun.id, "failed");
    return { success: false, error: e.message, job: updated, run };
  } finally {
    try { upsertAutoDevDailyReport(localDateKey()); } catch (reportError: any) { console.error("[Cron] 生成开发日报失败", reportError?.message || reportError); }
    runningCronJobs.delete(id);
  }
}

async function runCronJob(id: string, ctx: CollabCtx, trigger: CronRunTrigger, options: any = {}) {
  if (trigger !== "schedule" && trigger !== "recovery") return runCronJobCore(id, ctx, trigger, null, options);
  const job = normalizeCronJob(loadCronJobs().find(item => item.id === id) || {});
  const scheduledFor = options.scheduledFor || job.next_run || new Date().toISOString();
  const operationKey = `${id}:${minuteKey(new Date(scheduledFor), job.timezone)}`;
  const operation = acquireIdempotency({ scope: "cron-schedule", key: operationKey, leaseMs: 10 * 60 * 1000, metadata: { cron_job_id: id, minute_key: operationKey.split(":").slice(1).join(":") } });
  if (!operation.acquired) {
    return operation.record?.result || { success: true, duplicate: true, skipped: true, message: operation.inProgress ? "相同定时周期正在执行" : "相同定时周期已执行" };
  }
  try {
    const result = await runCronJobCore(id, ctx, trigger, { operationKey, traceId: operation.traceId }, { ...options, scheduledFor });
    if (result?.success === false) {
      failIdempotency("cron-schedule", operationKey, result.error || result.message || "定时任务执行失败");
      return result;
    }
    completeIdempotency("cron-schedule", operationKey, {
      success: true,
      queued: !!result?.queued,
      task_id: result?.task?.id || null,
      task_ids: result?.tasks?.map((task: any) => task.id) || [],
      message: result?.message || result?.error || "",
    });
    return result;
  } catch (error: any) {
    failIdempotency("cron-schedule", operationKey, error);
    throw error;
  }
}

export async function retryCronRun(jobId: string, runId: string, ctx: CollabCtx, trigger: "retry" | "resume" = "retry") {
  const job = loadCronJobs().find(item => item.id === jobId);
  if (!job) throw new Error("定时任务不存在");
  const parent = normalizeCronJob(job).run_history.find((item: any) => item.id === runId);
  if (!parent) throw new Error("运行记录不存在");
  if (parent.retry_child_run_id) {
    const existing = normalizeCronJob(loadCronJobs().find(item => item.id === jobId)).run_history.find((item: any) => item.id === parent.retry_child_run_id);
    if (existing && CRON_RUN_ACTIVE_STATUSES.has(existing.status)) return { success: true, duplicate: true, run: existing };
  }
  const tasks = loadTasks().filter(task => (parent.task_ids || []).includes(String(task.id || "")));
  const retryable = tasks.filter(task => !["done", "completed"].includes(String(task.status || "").toLowerCase()));
  if (!retryable.length) {
    return runCronJob(jobId, ctx, trigger, { parentRunId: parent.id, attempt: Number(parent.attempt || 1) + 1 });
  }
  const child = appendCronRun(jobId, {
    trigger,
    parent_run_id: parent.id,
    attempt: Number(parent.attempt || 1) + 1,
    scheduled_for: parent.scheduled_for,
    status: "triggering",
    result: trigger === "resume" ? "正在从未完成任务继续" : "正在重新执行失败任务",
    task_ids: retryable.map(task => task.id),
  });
  if (!child) throw new Error("重试运行记录创建失败");
  attachCronRunToTasks(retryable.map(task => task.id), jobId, child.id);
  const results = retryable.map(task => ({ taskId: task.id, ...retryTask(task.id, ctx, trigger === "resume" ? "从定时任务运行记录继续" : "定时任务自动重试", true) }));
  const taskIds = results.filter(item => item.success).map(item => item.taskId);
  const queued = results.filter(item => item.queued).length;
  const failed = results.filter(item => !item.success).length;
  const status = failed === results.length ? "failed" : queued > 0 ? "queued" : "waiting";
  const result = failed ? `${taskIds.length}/${results.length} 个任务已重新执行` : `${taskIds.length} 个任务已重新执行`;
  const updated = patchCronRun(jobId, child.id, {
    status,
    result,
    task_ids: taskIds,
    primary_task_id: taskIds[0] || "",
    task_states: Object.fromEntries(results.map(item => [item.taskId, { status: item.success ? (item.queued ? "queued" : "waiting") : "failed", result: item.error || result, updated_at: new Date().toISOString() }])),
    dispatched_at: new Date().toISOString(),
    completed_at: status === "failed" ? new Date().toISOString() : null,
  });
  patchCronRun(jobId, parent.id, { retry_child_run_id: child.id, next_retry_at: null });
  patchCronJob(jobId, { last_status: status, last_result: result, last_task_ids: taskIds, last_task_id: taskIds[0] || null });
  notifyCronRun(jobId, child.id, trigger === "resume" ? "recovered" : "started");
  if (status === "failed") scheduleFailedCronRunRetry(loadCronJobs().find(item => item.id === jobId), updated);
  return { success: status !== "failed", run: updated, results };
}

export function reconcileCronRunsOnStartup(now = new Date()) {
  const jobs = loadCronJobs();
  const tasks = loadTasks();
  const summary = { jobs: jobs.length, recovered_runs: 0, failed_stale_runs: 0, schedules_initialized: 0 };
  for (const rawJob of jobs) {
    const job = normalizeCronJob(rawJob);
    if (job.enabled && !rawJob.next_run && !job.schedule_error) {
      patchCronJob(job.id, { next_run: computeNextRun(job.schedule, now, job.timezone) });
      summary.schedules_initialized++;
    }
    for (const run of job.run_history || []) {
      if (!CRON_RUN_ACTIVE_STATUSES.has(run.status) || run.status === "retry_waiting" || run.status === "waiting") continue;
      const boundTasks = tasks.filter(task => (run.task_ids || []).includes(String(task.id || "")));
      if (boundTasks.length) {
        let updated: any = run;
        for (const task of boundTasks) updated = syncCronRunTask(job.id, run.id, task.id, task.status, task.result || task.status_detail || "", task.updated_at || now.toISOString()) || updated;
        if (updated?.status !== run.status) summary.recovered_runs++;
        continue;
      }
      const age = now.getTime() - Date.parse(run.started_at || "");
      if (Number.isFinite(age) && age >= 5 * 60_000) {
        const failed = patchCronRun(job.id, run.id, { status: "failed", result: "服务重启时发现本轮未完成派发，已转入恢复流程", completed_at: now.toISOString(), recovered_after_restart: true });
        scheduleFailedCronRunRetry(rawJob, failed, now);
        notifyCronRun(job.id, run.id, "failed");
        summary.failed_stale_runs++;
      }
    }
  }
  return summary;
}

async function processDueCronRetries(ctx: CollabCtx, now: Date) {
  for (const rawJob of loadCronJobs()) {
    const job = normalizeCronJob(rawJob);
    if (!job.enabled || rawJob.archived || rawJob.deleted_at) continue;
    for (const run of job.run_history || []) {
      if (run.status !== "retry_waiting" || !run.next_retry_at || run.retry_child_run_id) continue;
      if (Date.parse(run.next_retry_at) > now.getTime() || runningCronJobs.has(job.id)) continue;
      try { await retryCronRun(job.id, run.id, ctx, "retry"); }
      catch (error: any) { console.error("[Cron][Retry]", job.name, error?.message || error); }
    }
  }
}

async function tickCronScheduler(ctx: CollabCtx) {
  const now = new Date();
  await processDueCronRetries(ctx, now);
  const jobs = loadCronJobs();

  for (const rawJob of jobs) {
    if (rawJob.archived || rawJob.deleted_at) continue;
    const job = normalizeCronJob(rawJob);
    if (!job.enabled) continue;
    if (job.schedule_error) {
      if (rawJob.last_status !== "invalid_schedule" || rawJob.last_result !== job.schedule_error) {
        patchCronJob(job.id, {
          last_status: "invalid_schedule",
          last_result: job.schedule_error,
          next_run: null,
        });
      }
      continue;
    }
    if (runningCronJobs.has(job.id)) continue;
    const scheduledFor = job.next_run;
    if (!scheduledFor) {
      patchCronJob(job.id, { next_run: computeNextRun(job.schedule, now, job.timezone) });
      continue;
    }
    const dueAt = Date.parse(scheduledFor);
    if (!Number.isFinite(dueAt) || dueAt > now.getTime()) continue;
    const lateMinutes = Math.max(0, (now.getTime() - dueAt) / 60_000);
    const shouldRecover = lateMinutes > 1.5;
    const withinGrace = lateMinutes <= Number(job.misfire_grace_minutes || 1440);
    if (shouldRecover && (job.misfire_policy === "skip" || !withinGrace)) {
      const reason = withinGrace ? "服务停机期间错过执行，已按任务策略跳过" : "错过执行时间已超过补跑窗口，已跳过";
      const run = appendCronRun(job.id, { trigger: "recovery", scheduled_for: scheduledFor, started_at: now.toISOString(), completed_at: now.toISOString(), status: "skipped", result: reason, meta: { missed_by_minutes: Math.round(lateMinutes), misfire_policy: job.misfire_policy } });
      patchCronJob(job.id, { last_run: now.toISOString(), last_scheduled_at: scheduledFor, last_status: "skipped", last_result: reason, next_run: computeNextRun(job.schedule, now, job.timezone), run_count: Number(job.run_count || 0) + 1 });
      if (run) notifyCronRun(job.id, run.id, "done");
      continue;
    }
    const result = await runCronJob(job.id, ctx, shouldRecover ? "recovery" : "schedule", { scheduledFor });
    if (!result?.success) console.error("[Cron]", job.name, result?.error || result?.message);
  }
  await tickAutoDevReportNotifications(now);
  await tickFeishuNotificationOutbox(now);
  try {
    runConflictResolutionMemoryMaintenanceSchedulerTick({ at: now.toISOString() });
  } catch (error: any) {
    console.error("[Cron][MemoryMaintenance]", error?.message || error);
  }
}

export function startCronScheduler(ctx: CollabCtx) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  const recovery = reconcileCronRunsOnStartup();
  const tick = () => tickCronScheduler(ctx).catch((e: any) => console.error("[Cron]", e.message));
  tick();
  schedulerTimer = setInterval(tick, 30 * 1000);
  console.log(`[Cron] 定时任务调度器已启动，恢复 ${recovery.recovered_runs} 条运行，修复 ${recovery.failed_stale_runs} 条中断记录`);
}

export function stopCronScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

export function getConflictResolutionMemoryMaintenanceSchedulerStatus() {
  const latest = latestConflictResolutionMaintenanceTick;
  const safe = !latest || (latest.destructiveActionAuthorized === false
    && Number(latest.deletedCount || 0) === 0
    && Number(latest.createdTaskCount || 0) === 0
    && Number(latest.createdApprovalReceiptCount || 0) === 0
    && (latest.rows || []).every((row: any) => row.destructiveActionAuthorized === false && Number(row.deletedCount || 0) === 0));
  return {
    schema: "ccm-conflict-resolution-maintenance-scheduler-status-v1",
    activeWithCronScheduler: !!schedulerTimer,
    safe,
    latest,
    policy: "scheduler_verify_dry_run_only_no_task_no_approval_no_delete",
  };
}

function schedulerStatus() {
  return {
    running: !!schedulerTimer,
    interval_ms: 30 * 1000,
    running_job_ids: Array.from(runningCronJobs),
    conflict_resolution_memory_maintenance: latestConflictResolutionMaintenanceTick || {
      schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
      status: "not_run",
      destructiveActionAuthorized: false,
      deletedCount: 0,
      createdTaskCount: 0,
      createdApprovalReceiptCount: 0,
    },
  };
}

function readJsonBody(req: any, onDone: (payload: any) => void, onError: (error: Error) => void) {
  let body = "";
  req.on("data", (chunk: any) => body += chunk);
  req.on("end", () => {
    try {
      onDone(body ? JSON.parse(body) : {});
    } catch (e: any) {
      onError(e);
    }
  });
}

// === Cron API 路由分流 ===
export function handleCronApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean {
  if (pathname === "/api/cron" && req.method === "GET") {
    const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
    const onlyArchived = String(parsed.query.archived || "") === "true";
    const allJobs = loadCronJobs();
    const jobs = onlyArchived ? allJobs.filter(job => job.archived || job.deleted_at) : includeArchived ? allJobs : allJobs.filter(job => !job.archived && !job.deleted_at);
    sendJson(res, { jobs: publicCronJobs(jobs), archived_count: allJobs.filter(job => job.archived || job.deleted_at).length, scheduler: schedulerStatus() });
    return true;
  }

  if (pathname === "/api/cron/status" && req.method === "GET") {
    sendJson(res, schedulerStatus());
    return true;
  }

  if (pathname === "/api/cron/create" && req.method === "POST") {
    const handleCreate = async (payload: any, files: any[] = []) => {
      try {
        let jobPayload = payload || {};
        if (files.length) {
          const attachments = await buildTaskAttachmentMutation({ files, retainedIds: [], userText: `${jobPayload.name || ""}\n${jobPayload.prompt || ""}` });
          jobPayload = {
            ...jobPayload,
            source_attachments: attachments.attachments,
            source_attachment_contexts: attachments.contexts,
            source_attachment_context: attachments.context,
            source_attachment_warnings: attachments.warnings,
          };
        }
        const job = createCronJob(jobPayload);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        removeUploadedFiles(files);
        sendJson(res, { error: e.message }, 400);
      }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的定时任务附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        const payload = (fields as any).payload ? JSON.parse((fields as any).payload) : fields;
        return handleCreate(payload, files || []);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    readJsonBody(req, (payload) => void handleCreate(payload), (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/update" && req.method === "POST") {
    const handleUpdate = async (payload: any, files: any[] = [], multipart = false) => {
      try {
        const { id, retained_attachment_ids, retainedAttachmentIds, ...incomingUpdates } = payload || {};
        let updates = incomingUpdates;
        const current = loadCronJobs().find((item: any) => item.id === id);
        if (!current) return sendJson(res, { error: "定时任务不存在" }, 404);
        if (multipart) {
          const attachments = await buildTaskAttachmentMutation({
            files,
            currentAttachments: current.source_attachments,
            currentContexts: current.source_attachment_contexts,
            retainedIds: retained_attachment_ids === undefined && retainedAttachmentIds === undefined
              ? undefined
              : parseRetainedAttachmentIds(retained_attachment_ids ?? retainedAttachmentIds),
            userText: `${updates.name || current.name || ""}\n${updates.prompt || current.prompt || ""}`,
          });
          updates = {
            ...updates,
            source_attachments: attachments.attachments,
            source_attachment_contexts: attachments.contexts,
            source_attachment_context: attachments.context,
            source_attachment_warnings: attachments.warnings,
          };
        }
        const job = updateCronJob(id, updates);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        removeUploadedFiles(files);
        sendJson(res, { error: e.message }, 400);
      }
    };
    const contentType = String(req.headers["content-type"] || "");
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的定时任务附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        const payload = (fields as any).payload ? JSON.parse((fields as any).payload) : fields;
        return handleUpdate(payload, files || [], true);
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }
    readJsonBody(req, (payload) => void handleUpdate(payload), (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/delete" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = deleteCronJob(payload.id);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, archived: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/restore" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = restoreCronJob(payload.id);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/purge" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = purgeCronJob(payload.id);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, purged: true, id: job.id });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/bulk" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const ids = Array.from(new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id: any) => String(id || "")).filter(Boolean)));
        const action = String(payload.action || "");
        if (!ids.length) return sendJson(res, { error: "请选择定时任务" }, 400);
        if (!["archive", "restore", "purge", "enable", "disable"].includes(action)) return sendJson(res, { error: "不支持的批量操作" }, 400);
        const results = ids.map((id: string) => {
          try {
            const job = action === "archive" ? deleteCronJob(id)
              : action === "restore" ? restoreCronJob(id)
              : action === "purge" ? purgeCronJob(id)
              : updateCronJob(id, { enabled: action === "enable" });
            return { id, success: !!job };
          } catch (error: any) { return { id, success: false, error: error.message }; }
        });
        sendJson(res, { success: results.every((item: any) => item.success), results }, results.some((item: any) => item.success) ? 200 : 409);
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/run" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      runCronJob(payload.id, ctx, "manual")
        .then((result) => {
          const status = result.success ? 200 : 400;
          sendJson(res, result, status);
        })
        .catch((e: any) => sendJson(res, { error: e.message }, 500));
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/overview" && req.method === "GET") {
    const today = String(parsed.query.date || localDateKey());
    const report = upsertAutoDevDailyReport(today);
    const reports = loadDevReports().slice(0, 30);
    const jobs = loadCronJobs().map(normalizeCronJob).filter((job: any) => job.workflow_type === "daily_dev");
    const journalAudit = getWorkJournalAudit({ sync: false });
    sendJson(res, {
      success: true,
      scheduler: schedulerStatus(),
      today: report,
      reports,
      weekly_reports: loadDevWeeklyReports().slice(0, 20),
      notification: normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig()),
      daily_dev_jobs: jobs,
      backlog: report.backlog,
      journal: {
        schema: journalAudit.schema,
        append_only: journalAudit.append_only,
        total: journalAudit.total,
        source_counts: journalAudit.source_counts,
        actor_counts: journalAudit.actor_counts,
        earliest_at: journalAudit.earliest_at,
        latest_at: journalAudit.latest_at,
      },
    });
    return true;
  }

  if (["/api/cron/run/retry", "/api/cron/run/resume", "/api/cron/run/cancel"].includes(pathname) && req.method === "POST") {
    readJsonBody(req, (payload) => {
      const jobId = String(payload.job_id || payload.jobId || payload.id || "");
      const runId = String(payload.run_id || payload.runId || "");
      if (!jobId || !runId) return sendJson(res, { error: "缺少定时任务或运行标识" }, 400);
      if (pathname.endsWith("/cancel")) {
        try { sendJson(res, cancelCronRun(jobId, runId, String(payload.reason || "用户取消本轮定时任务"))); }
        catch (error: any) { sendJson(res, { error: error.message }, 409); }
        return;
      }
      retryCronRun(jobId, runId, ctx, pathname.endsWith("/resume") ? "resume" : "retry")
        .then(result => sendJson(res, result, result?.success === false ? 409 : 200))
        .catch((error: any) => sendJson(res, { error: error.message }, 409));
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/work-journal/audit" && req.method === "GET") {
    sendJson(res, getWorkJournalAudit());
    return true;
  }

  if (pathname === "/api/auto-dev/work-journal/events" && req.method === "GET") {
    const events = listWorkJournalEvents({
      start: parsed.query.start,
      end: parsed.query.end,
      task_id: parsed.query.task_id,
      source: parsed.query.source,
      limit: parsed.query.limit,
    });
    sendJson(res, { success: true, count: events.length, events });
    return true;
  }

  if (pathname === "/api/auto-dev/reports" && req.method === "GET") {
    const limit = Math.max(1, Math.min(120, Number(parsed.query.limit || 30)));
    sendJson(res, { success: true, reports: loadDevReports().slice(0, limit) });
    return true;
  }

  if (pathname === "/api/auto-dev/weekly-reports" && req.method === "GET") {
    const limit = Math.max(1, Math.min(80, Number(parsed.query.limit || 20)));
    sendJson(res, { success: true, reports: loadDevWeeklyReports().slice(0, limit) });
    return true;
  }

  if (pathname === "/api/auto-dev/weekly-report/generate" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const report = upsertAutoDevWeeklyReport(payload.date || localDateKey(), { force: payload.force === true });
        sendJson(res, { success: true, report, reports: loadDevWeeklyReports().slice(0, 20) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/notification/config" && req.method === "GET") {
    sendJson(res, { success: true, config: normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig()) });
    return true;
  }

  if (pathname === "/api/auto-dev/notification/config" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const current = normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig());
        const config = saveNormalizedNotifyConfig({
          ...current,
          daily_enabled: payload.daily_enabled === true,
          daily_time: payload.daily_time ?? current.daily_time,
          weekly_enabled: payload.weekly_enabled === true,
          weekly_day: payload.weekly_day ?? current.weekly_day,
          weekly_time: payload.weekly_time ?? current.weekly_time,
          retry_limit: payload.retry_limit ?? current.retry_limit,
          retry_interval_minutes: payload.retry_interval_minutes ?? current.retry_interval_minutes,
          target_type: "user",
          target_id: "",
        });
        sendJson(res, { success: true, config });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/notification/send" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      const kind = payload.kind === "weekly" ? "weekly" : "daily";
      dispatchAutoDevReport(kind, { date: payload.date || localDateKey() })
        .then(result => sendJson(res, result, result.success ? 200 : 400))
        .catch((e: any) => sendJson(res, { error: e.message }, 500));
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }
  if (pathname === "/api/auto-dev/report/generate" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const report = upsertAutoDevDailyReport(payload.date || localDateKey(), { force: payload.force === true });
        sendJson(res, { success: true, report, reports: loadDevReports().slice(0, 30) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  return false;
}
