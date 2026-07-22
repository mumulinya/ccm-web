"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCronTaskStatus = syncCronTaskStatus;
exports.retryCronRun = retryCronRun;
exports.reconcileCronRunsOnStartup = reconcileCronRunsOnStartup;
exports.startCronScheduler = startCronScheduler;
exports.stopCronScheduler = stopCronScheduler;
exports.getConflictResolutionMemoryMaintenanceSchedulerStatus = getConflictResolutionMemoryMaintenanceSchedulerStatus;
exports.handleCronApi = handleCronApi;
// Behavior-freeze split from cron.ts (part 2/2).
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const collaboration_1 = require("../collaboration/collaboration");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const cron_job_store_1 = require("./cron-job-store");
const cron_dev_reports_1 = require("./cron-dev-reports");
const work_journal_1 = require("./work-journal");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const task_attachments_1 = require("../../system/task-attachments");
const cron_part_01_1 = require("./cron-part-01");
let schedulerTimer = null;
function syncCronTaskStatus(task, status, result = "") {
    const cronJobId = task?.cron_job_id;
    if (!cronJobId)
        return;
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === cronJobId);
    if (!job)
        return;
    const resultText = String(result || task.result || "").trim();
    const preferredRunId = String(task?.cron_run_id || task?.workflow_meta?.cron_run_id || "");
    const matchedRun = (0, cron_job_store_1.findCronRunForTask)(job, String(task?.id || ""), preferredRunId);
    const syncedRun = matchedRun
        ? (0, cron_job_store_1.syncCronRunTask)(cronJobId, matchedRun.id, String(task?.id || ""), status, resultText, task?.updated_at || new Date().toISOString())
        : null;
    const patch = {
        last_task_id: task.id || job.last_task_id || null,
        last_task_ids: syncedRun?.task_ids || job.last_task_ids || [],
        next_run: job.enabled === false ? null : (0, cron_job_store_1.computeNextRun)(job.schedule, new Date(), (0, cron_job_store_1.normalizeCronJob)(job).timezone),
    };
    if (syncedRun) {
        patch.last_status = syncedRun.status;
        patch.last_result = syncedRun.result || resultText || job.last_result || "任务状态已更新";
    }
    else if (status === "in_progress") {
        patch.last_status = "running_task";
        patch.last_result = "任务已进入执行阶段";
    }
    else if (status === "done") {
        patch.last_status = "done";
        patch.last_result = resultText || "任务执行完成";
    }
    else if (status === "waiting") {
        patch.last_status = "waiting";
        patch.last_result = resultText || "任务仍在进行，等待下一步处理";
    }
    else if (status === "failed") {
        patch.last_status = "failed";
        patch.last_result = resultText || "任务执行失败";
    }
    else {
        patch.last_status = status || "queued";
        patch.last_result = resultText || patch.last_result || "";
    }
    (0, cron_job_store_1.patchCronJob)(cronJobId, patch);
    if (syncedRun?.status === "failed") {
        const retried = (0, cron_part_01_1.scheduleFailedCronRunRetry)((0, db_1.loadCronJobs)().find(item => item.id === cronJobId), syncedRun);
        (0, cron_part_01_1.notifyCronRun)(cronJobId, syncedRun.id, "failed");
        if (!retried?.next_retry_at)
            (0, cron_job_store_1.patchCronJob)(cronJobId, { last_status: "failed", last_result: resultText || "任务执行失败" });
    }
    else if (syncedRun?.status === "done") {
        (0, cron_part_01_1.notifyCronRun)(cronJobId, syncedRun.id, "done");
    }
    else if (syncedRun?.status === "waiting") {
        (0, cron_part_01_1.notifyCronRun)(cronJobId, syncedRun.id, "waiting");
    }
    else if (syncedRun?.status === "cancelled") {
        (0, cron_part_01_1.notifyCronRun)(cronJobId, syncedRun.id, "cancelled");
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
        (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, backlogStatus, {
            task_id: task.id,
            result: resultText || patch.last_result || status,
        });
    }
}
async function runCronJobCore(id, ctx, trigger, reliability = null, options = {}) {
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === id);
    if (!job)
        throw new Error("定时任务不存在");
    if (job.archived || job.deleted_at)
        throw new Error("定时任务已归档，请先恢复后再运行");
    if (cron_part_01_1.runningCronJobs.has(id)) {
        return { success: false, message: "定时任务正在触发中，请稍后再试" };
    }
    const now = new Date();
    const normalizedJob = (0, cron_job_store_1.normalizeCronJob)(job);
    const scheduledFor = options.scheduledFor || (trigger === "schedule" || trigger === "recovery" ? job.next_run : null);
    const nextRun = (0, cron_job_store_1.computeNextRun)(job.schedule, now, normalizedJob.timezone);
    cron_part_01_1.runningCronJobs.add(id);
    const cronRun = (0, cron_job_store_1.appendCronRun)(id, {
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
        cron_part_01_1.runningCronJobs.delete(id);
        throw new Error("定时任务运行记录创建失败");
    }
    (0, cron_job_store_1.patchCronJob)(id, {
        last_run: now.toISOString(),
        last_run_key: (0, cron_job_store_1.minuteKey)(scheduledFor ? new Date(scheduledFor) : now, normalizedJob.timezone),
        last_scheduled_at: scheduledFor || null,
        last_status: "running",
        last_result: "正在创建并派发任务...",
    });
    (0, cron_part_01_1.notifyCronRun)(id, cronRun.id, trigger === "recovery" ? "recovered" : "started");
    let taskDraft = null;
    let taskDrafts = [];
    let cronMeta = {};
    let gapContinueResult = null;
    try {
        (0, cron_job_store_1.validateCronJobPayload)(job);
        const targetType = (0, cron_job_store_1.normalizeTargetType)(job);
        const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
        const shouldContinueGaps = targetType === "group" && workflowType === "daily_dev"
            && job.continue_gaps !== false
            && job.continueGaps !== false;
        if (shouldContinueGaps) {
            gapContinueResult = (0, collaboration_1.continueDailyDevTasksFromGaps)(ctx, {
                group_id: job.group_id,
                limit: Math.max(1, Math.min(20, Number(job.gap_continue_limit || job.gapContinueLimit || 3))),
                auto_execute: true,
                source: "cron_gap_rework",
            });
        }
        taskDraft = (0, cron_part_01_1.buildTaskFromCronJob)(job, trigger);
        cronMeta = taskDraft?.meta || {};
        if (gapContinueResult) {
            cronMeta.continued_gap_tasks = {
                continued: gapContinueResult.continued || 0,
                queued: gapContinueResult.queued || 0,
                blocked: gapContinueResult.blocked || 0,
                failed: gapContinueResult.failed || 0,
                task_ids: (gapContinueResult.results || []).filter((item) => item.success).map((item) => item.task_id),
            };
        }
        taskDrafts = Array.isArray(taskDraft?.drafts)
            ? taskDraft.drafts
            : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean));
        taskDrafts = taskDrafts.map((draft) => ({
            ...draft,
            cron_run_id: cronRun.id,
            workflow_meta: {
                ...(draft?.workflow_meta || {}),
                cron_run_id: cronRun.id,
            },
        }));
        if (reliability?.operationKey) {
            taskDrafts = taskDrafts.map((draft, index) => ({
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
            (0, cron_part_01_1.attachCronRunToTasks)(continuedTaskIds, id, cronRun.id);
            const result = continuedCount > 0
                ? `本次定时任务续跑 ${continuedCount} 个交付缺口任务，入队 ${queuedCount} 个；没有 ready 状态的新需求池文件${(0, cron_part_01_1.formatCronMetaSummary)(cronMeta)}`
                : `没有 ready 状态的业务需求池文件，本次定时任务跳过且未创建空任务${(0, cron_part_01_1.formatCronMetaSummary)(cronMeta)}`;
            const updated = (0, cron_job_store_1.patchCronJob)(id, {
                last_status: continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "continued")) : "skipped",
                last_result: result,
                last_run_meta: cronMeta,
                last_task_ids: continuedCount > 0 ? (cronMeta.continued_gap_tasks?.task_ids || []) : job.last_task_ids,
                run_count: Number(job.run_count || 0) + 1,
                next_run: nextRun,
            });
            const runStatus = continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "done")) : "skipped";
            const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
                status: runStatus,
                result,
                task_ids: continuedTaskIds,
                primary_task_id: continuedTaskIds[0] || "",
                task_states: Object.fromEntries(continuedTaskIds.map((taskId) => [taskId, { status: queuedCount > 0 ? "queued" : "waiting", result, updated_at: new Date().toISOString() }])),
                dispatched_at: continuedCount > 0 ? new Date().toISOString() : null,
                completed_at: runStatus === "skipped" || runStatus === "done" ? new Date().toISOString() : null,
                meta: cronMeta,
            });
            if (runStatus === "done" || runStatus === "skipped")
                (0, cron_part_01_1.notifyCronRun)(id, cronRun.id, "done");
            return { success: true, queued: queuedCount > 0, skipped: continuedCount === 0, continued: continuedCount, message: result, job: updated, run, gap_continue_result: gapContinueResult };
        }
        const created = taskDrafts.map((draft) => {
            const { task, queueResult } = (0, collaboration_1.createAndQueueTask)(draft, ctx);
            const backlogFile = task?.workflow_meta?.intake?.backlog_file;
            if (task?.group_id && backlogFile) {
                (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, "queued", {
                    task_id: task.id,
                    result: `${queueResult?.message || "任务已创建"}：${task.title}`,
                });
            }
            return { task, queueResult, queued: !!queueResult?.queued };
        });
        const continuedTaskIds = (cronMeta.continued_gap_tasks?.task_ids || []).map((taskId) => String(taskId));
        const createdTaskIds = [...new Set([...continuedTaskIds, ...created.map(item => String(item.task.id))])];
        (0, cron_part_01_1.attachCronRunToTasks)(createdTaskIds, id, cronRun.id);
        const queuedCount = created.filter(item => item.queued).length;
        if (created.length > 1) {
            const status = queuedCount > 0 ? "queued" : (created.some(item => item.queueResult?.blocked) ? "waiting" : "skipped");
            const result = `批量创建 ${created.length} 个业务开发任务，已入队 ${queuedCount} 个${(0, cron_part_01_1.formatCronMetaSummary)(cronMeta)}`;
            const updated = (0, cron_job_store_1.patchCronJob)(id, {
                last_status: status,
                last_result: result,
                last_run_meta: cronMeta,
                last_task_id: created[created.length - 1]?.task?.id || null,
                last_task_ids: created.map(item => item.task.id),
                run_count: Number(job.run_count || 0) + 1,
                next_run: nextRun,
            });
            const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
                status,
                result,
                task_ids: createdTaskIds,
                primary_task_id: createdTaskIds[0] || "",
                task_states: Object.fromEntries([
                    ...continuedTaskIds.map((taskId) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
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
        const result = `${queueResult?.message || "任务已创建"}：${task.title}${(0, cron_part_01_1.formatCronMetaSummary)(cronMeta)}`;
        const updated = (0, cron_job_store_1.patchCronJob)(id, {
            last_status: status,
            last_result: result,
            last_run_meta: cronMeta,
            last_task_id: task.id,
            run_count: Number(job.run_count || 0) + 1,
            next_run: nextRun,
        });
        const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
            status,
            result,
            task_ids: createdTaskIds,
            primary_task_id: String(task.id),
            task_states: Object.fromEntries([
                ...continuedTaskIds.map((taskId) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
                [String(task.id), { status: queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped"), result: queueResult?.message || result, updated_at: new Date().toISOString() }],
            ]),
            dispatched_at: new Date().toISOString(),
            completed_at: status === "skipped" ? new Date().toISOString() : null,
            meta: cronMeta,
        });
        return { success: true, queued, task, queue_result: queueResult, job: updated, run };
    }
    catch (e) {
        const drafts = taskDrafts.length ? taskDrafts : (Array.isArray(taskDraft?.drafts) ? taskDraft.drafts : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean)));
        for (const draft of drafts) {
            const backlogFile = draft?.workflow_meta?.intake?.backlog_file;
            if (!draft?.group_id || !backlogFile)
                continue;
            (0, collaboration_1.markDailyDevBacklogStatus)(draft.group_id, backlogFile, "ready", {
                result: `定时任务创建失败，已恢复为 ready：${e.message}`,
            });
        }
        const updated = (0, cron_job_store_1.patchCronJob)(id, {
            last_status: "failed",
            last_result: e.message,
            last_run_meta: cronMeta,
            run_count: Number(job.run_count || 0) + 1,
            next_run: nextRun,
        });
        let run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
            status: "failed",
            result: e.message,
            completed_at: new Date().toISOString(),
            meta: cronMeta,
        });
        run = (0, cron_part_01_1.scheduleFailedCronRunRetry)(updated, run);
        (0, cron_part_01_1.notifyCronRun)(id, cronRun.id, "failed");
        return { success: false, error: e.message, job: updated, run };
    }
    finally {
        try {
            (0, cron_dev_reports_1.upsertAutoDevDailyReport)((0, cron_dev_reports_1.localDateKey)());
        }
        catch (reportError) {
            console.error("[Cron] 生成开发日报失败", reportError?.message || reportError);
        }
        cron_part_01_1.runningCronJobs.delete(id);
    }
}
async function runCronJob(id, ctx, trigger, options = {}) {
    if (trigger !== "schedule" && trigger !== "recovery")
        return runCronJobCore(id, ctx, trigger, null, options);
    const job = (0, cron_job_store_1.normalizeCronJob)((0, db_1.loadCronJobs)().find(item => item.id === id) || {});
    const scheduledFor = options.scheduledFor || job.next_run || new Date().toISOString();
    const operationKey = `${id}:${(0, cron_job_store_1.minuteKey)(new Date(scheduledFor), job.timezone)}`;
    const operation = (0, reliability_ledger_1.acquireIdempotency)({ scope: "cron-schedule", key: operationKey, leaseMs: 10 * 60 * 1000, metadata: { cron_job_id: id, minute_key: operationKey.split(":").slice(1).join(":") } });
    if (!operation.acquired) {
        return operation.record?.result || { success: true, duplicate: true, skipped: true, message: operation.inProgress ? "相同定时周期正在执行" : "相同定时周期已执行" };
    }
    try {
        const result = await runCronJobCore(id, ctx, trigger, { operationKey, traceId: operation.traceId }, { ...options, scheduledFor });
        if (result?.success === false) {
            (0, reliability_ledger_1.failIdempotency)("cron-schedule", operationKey, result.error || result.message || "定时任务执行失败");
            return result;
        }
        (0, reliability_ledger_1.completeIdempotency)("cron-schedule", operationKey, {
            success: true,
            queued: !!result?.queued,
            task_id: result?.task?.id || null,
            task_ids: result?.tasks?.map((task) => task.id) || [],
            message: result?.message || result?.error || "",
        });
        return result;
    }
    catch (error) {
        (0, reliability_ledger_1.failIdempotency)("cron-schedule", operationKey, error);
        throw error;
    }
}
async function retryCronRun(jobId, runId, ctx, trigger = "retry") {
    const job = (0, db_1.loadCronJobs)().find(item => item.id === jobId);
    if (!job)
        throw new Error("定时任务不存在");
    const parent = (0, cron_job_store_1.normalizeCronJob)(job).run_history.find((item) => item.id === runId);
    if (!parent)
        throw new Error("运行记录不存在");
    if (parent.retry_child_run_id) {
        const existing = (0, cron_job_store_1.normalizeCronJob)((0, db_1.loadCronJobs)().find(item => item.id === jobId)).run_history.find((item) => item.id === parent.retry_child_run_id);
        if (existing && cron_part_01_1.CRON_RUN_ACTIVE_STATUSES.has(existing.status))
            return { success: true, duplicate: true, run: existing };
    }
    const tasks = (0, db_1.loadTasks)().filter(task => (parent.task_ids || []).includes(String(task.id || "")));
    const retryable = tasks.filter(task => !["done", "completed"].includes(String(task.status || "").toLowerCase()));
    if (!retryable.length) {
        return runCronJob(jobId, ctx, trigger, { parentRunId: parent.id, attempt: Number(parent.attempt || 1) + 1 });
    }
    const child = (0, cron_job_store_1.appendCronRun)(jobId, {
        trigger,
        parent_run_id: parent.id,
        attempt: Number(parent.attempt || 1) + 1,
        scheduled_for: parent.scheduled_for,
        status: "triggering",
        result: trigger === "resume" ? "正在从未完成任务继续" : "正在重新执行失败任务",
        task_ids: retryable.map(task => task.id),
    });
    if (!child)
        throw new Error("重试运行记录创建失败");
    (0, cron_part_01_1.attachCronRunToTasks)(retryable.map(task => task.id), jobId, child.id);
    const results = retryable.map(task => ({ taskId: task.id, ...(0, collaboration_1.retryTask)(task.id, ctx, trigger === "resume" ? "从定时任务运行记录继续" : "定时任务自动重试", true) }));
    const taskIds = results.filter(item => item.success).map(item => item.taskId);
    const queued = results.filter(item => item.queued).length;
    const failed = results.filter(item => !item.success).length;
    const status = failed === results.length ? "failed" : queued > 0 ? "queued" : "waiting";
    const result = failed ? `${taskIds.length}/${results.length} 个任务已重新执行` : `${taskIds.length} 个任务已重新执行`;
    const updated = (0, cron_job_store_1.patchCronRun)(jobId, child.id, {
        status,
        result,
        task_ids: taskIds,
        primary_task_id: taskIds[0] || "",
        task_states: Object.fromEntries(results.map(item => [item.taskId, { status: item.success ? (item.queued ? "queued" : "waiting") : "failed", result: item.error || result, updated_at: new Date().toISOString() }])),
        dispatched_at: new Date().toISOString(),
        completed_at: status === "failed" ? new Date().toISOString() : null,
    });
    (0, cron_job_store_1.patchCronRun)(jobId, parent.id, { retry_child_run_id: child.id, next_retry_at: null });
    (0, cron_job_store_1.patchCronJob)(jobId, { last_status: status, last_result: result, last_task_ids: taskIds, last_task_id: taskIds[0] || null });
    (0, cron_part_01_1.notifyCronRun)(jobId, child.id, trigger === "resume" ? "recovered" : "started");
    if (status === "failed")
        (0, cron_part_01_1.scheduleFailedCronRunRetry)((0, db_1.loadCronJobs)().find(item => item.id === jobId), updated);
    return { success: status !== "failed", run: updated, results };
}
function reconcileCronRunsOnStartup(now = new Date()) {
    const jobs = (0, db_1.loadCronJobs)();
    const tasks = (0, db_1.loadTasks)();
    const summary = { jobs: jobs.length, recovered_runs: 0, failed_stale_runs: 0, schedules_initialized: 0 };
    for (const rawJob of jobs) {
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (job.enabled && !rawJob.next_run && !job.schedule_error) {
            (0, cron_job_store_1.patchCronJob)(job.id, { next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone) });
            summary.schedules_initialized++;
        }
        for (const run of job.run_history || []) {
            if (!cron_part_01_1.CRON_RUN_ACTIVE_STATUSES.has(run.status) || run.status === "retry_waiting" || run.status === "waiting")
                continue;
            const boundTasks = tasks.filter(task => (run.task_ids || []).includes(String(task.id || "")));
            if (boundTasks.length) {
                let updated = run;
                for (const task of boundTasks)
                    updated = (0, cron_job_store_1.syncCronRunTask)(job.id, run.id, task.id, task.status, task.result || task.status_detail || "", task.updated_at || now.toISOString()) || updated;
                if (updated?.status !== run.status)
                    summary.recovered_runs++;
                continue;
            }
            const age = now.getTime() - Date.parse(run.started_at || "");
            if (Number.isFinite(age) && age >= 5 * 60_000) {
                const failed = (0, cron_job_store_1.patchCronRun)(job.id, run.id, { status: "failed", result: "服务重启时发现本轮未完成派发，已转入恢复流程", completed_at: now.toISOString(), recovered_after_restart: true });
                (0, cron_part_01_1.scheduleFailedCronRunRetry)(rawJob, failed, now);
                (0, cron_part_01_1.notifyCronRun)(job.id, run.id, "failed");
                summary.failed_stale_runs++;
            }
        }
    }
    return summary;
}
async function processDueCronRetries(ctx, now) {
    for (const rawJob of (0, db_1.loadCronJobs)()) {
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (!job.enabled || rawJob.archived || rawJob.deleted_at)
            continue;
        for (const run of job.run_history || []) {
            if (run.status !== "retry_waiting" || !run.next_retry_at || run.retry_child_run_id)
                continue;
            if (Date.parse(run.next_retry_at) > now.getTime() || cron_part_01_1.runningCronJobs.has(job.id))
                continue;
            try {
                await retryCronRun(job.id, run.id, ctx, "retry");
            }
            catch (error) {
                console.error("[Cron][Retry]", job.name, error?.message || error);
            }
        }
    }
}
async function tickCronScheduler(ctx) {
    const now = new Date();
    await processDueCronRetries(ctx, now);
    const jobs = (0, db_1.loadCronJobs)();
    for (const rawJob of jobs) {
        if (rawJob.archived || rawJob.deleted_at)
            continue;
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (!job.enabled)
            continue;
        if (job.schedule_error) {
            if (rawJob.last_status !== "invalid_schedule" || rawJob.last_result !== job.schedule_error) {
                (0, cron_job_store_1.patchCronJob)(job.id, {
                    last_status: "invalid_schedule",
                    last_result: job.schedule_error,
                    next_run: null,
                });
            }
            continue;
        }
        if (cron_part_01_1.runningCronJobs.has(job.id))
            continue;
        const scheduledFor = job.next_run;
        if (!scheduledFor) {
            (0, cron_job_store_1.patchCronJob)(job.id, { next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone) });
            continue;
        }
        const dueAt = Date.parse(scheduledFor);
        if (!Number.isFinite(dueAt) || dueAt > now.getTime())
            continue;
        const lateMinutes = Math.max(0, (now.getTime() - dueAt) / 60_000);
        const shouldRecover = lateMinutes > 1.5;
        const withinGrace = lateMinutes <= Number(job.misfire_grace_minutes || 1440);
        if (shouldRecover && (job.misfire_policy === "skip" || !withinGrace)) {
            const reason = withinGrace ? "服务停机期间错过执行，已按任务策略跳过" : "错过执行时间已超过补跑窗口，已跳过";
            const run = (0, cron_job_store_1.appendCronRun)(job.id, { trigger: "recovery", scheduled_for: scheduledFor, started_at: now.toISOString(), completed_at: now.toISOString(), status: "skipped", result: reason, meta: { missed_by_minutes: Math.round(lateMinutes), misfire_policy: job.misfire_policy } });
            (0, cron_job_store_1.patchCronJob)(job.id, { last_run: now.toISOString(), last_scheduled_at: scheduledFor, last_status: "skipped", last_result: reason, next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone), run_count: Number(job.run_count || 0) + 1 });
            if (run)
                (0, cron_part_01_1.notifyCronRun)(job.id, run.id, "done");
            continue;
        }
        const result = await runCronJob(job.id, ctx, shouldRecover ? "recovery" : "schedule", { scheduledFor });
        if (!result?.success)
            console.error("[Cron]", job.name, result?.error || result?.message);
    }
    await (0, cron_dev_reports_1.tickAutoDevReportNotifications)(now);
    await (0, feishu_channel_1.tickFeishuNotificationOutbox)(now);
    try {
        (0, cron_part_01_1.runConflictResolutionMemoryMaintenanceSchedulerTick)({ at: now.toISOString() });
    }
    catch (error) {
        console.error("[Cron][MemoryMaintenance]", error?.message || error);
    }
}
function startCronScheduler(ctx) {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    const recovery = reconcileCronRunsOnStartup();
    const tick = () => tickCronScheduler(ctx).catch((e) => console.error("[Cron]", e.message));
    tick();
    schedulerTimer = setInterval(tick, 30 * 1000);
    console.log(`[Cron] 定时任务调度器已启动，恢复 ${recovery.recovered_runs} 条运行，修复 ${recovery.failed_stale_runs} 条中断记录`);
}
function stopCronScheduler() {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    schedulerTimer = null;
}
function getConflictResolutionMemoryMaintenanceSchedulerStatus() {
    const latest = cron_part_01_1.latestConflictResolutionMaintenanceTick;
    const safe = !latest || (latest.destructiveActionAuthorized === false
        && Number(latest.deletedCount || 0) === 0
        && Number(latest.createdTaskCount || 0) === 0
        && Number(latest.createdApprovalReceiptCount || 0) === 0
        && (latest.rows || []).every((row) => row.destructiveActionAuthorized === false && Number(row.deletedCount || 0) === 0));
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
        running_job_ids: Array.from(cron_part_01_1.runningCronJobs),
        conflict_resolution_memory_maintenance: cron_part_01_1.latestConflictResolutionMaintenanceTick || {
            schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
            status: "not_run",
            destructiveActionAuthorized: false,
            deletedCount: 0,
            createdTaskCount: 0,
            createdApprovalReceiptCount: 0,
        },
    };
}
function readJsonBody(req, onDone, onError) {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
        try {
            onDone(body ? JSON.parse(body) : {});
        }
        catch (e) {
            onError(e);
        }
    });
}
// === Cron API 路由分流 ===
function handleCronApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/cron" && req.method === "GET") {
        const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
        const onlyArchived = String(parsed.query.archived || "") === "true";
        const allJobs = (0, db_1.loadCronJobs)();
        const jobs = onlyArchived ? allJobs.filter(job => job.archived || job.deleted_at) : includeArchived ? allJobs : allJobs.filter(job => !job.archived && !job.deleted_at);
        (0, utils_1.sendJson)(res, { jobs: (0, cron_part_01_1.publicCronJobs)(jobs), archived_count: allJobs.filter(job => job.archived || job.deleted_at).length, scheduler: schedulerStatus() });
        return true;
    }
    if (pathname === "/api/cron/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, schedulerStatus());
        return true;
    }
    if (pathname === "/api/cron/create" && req.method === "POST") {
        const handleCreate = async (payload, files = []) => {
            try {
                let jobPayload = payload || {};
                if (files.length) {
                    const attachments = await (0, task_attachments_1.buildTaskAttachmentMutation)({ files, retainedIds: [], userText: `${jobPayload.name || ""}\n${jobPayload.prompt || ""}` });
                    jobPayload = {
                        ...jobPayload,
                        source_attachments: attachments.attachments,
                        source_attachment_contexts: attachments.contexts,
                        source_attachment_context: attachments.context,
                        source_attachment_warnings: attachments.warnings,
                    };
                }
                const job = (0, cron_job_store_1.createCronJob)(jobPayload);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, task_attachments_1.removeUploadedFiles)(files);
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        };
        const contentType = String(req.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的定时任务附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                const payload = fields.payload ? JSON.parse(fields.payload) : fields;
                return handleCreate(payload, files || []);
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        readJsonBody(req, (payload) => void handleCreate(payload), (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/update" && req.method === "POST") {
        const handleUpdate = async (payload, files = [], multipart = false) => {
            try {
                const { id, retained_attachment_ids, retainedAttachmentIds, ...incomingUpdates } = payload || {};
                let updates = incomingUpdates;
                const current = (0, db_1.loadCronJobs)().find((item) => item.id === id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                if (multipart) {
                    const attachments = await (0, task_attachments_1.buildTaskAttachmentMutation)({
                        files,
                        currentAttachments: current.source_attachments,
                        currentContexts: current.source_attachment_contexts,
                        retainedIds: retained_attachment_ids === undefined && retainedAttachmentIds === undefined
                            ? undefined
                            : (0, task_attachments_1.parseRetainedAttachmentIds)(retained_attachment_ids ?? retainedAttachmentIds),
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
                const job = (0, cron_job_store_1.updateCronJob)(id, updates);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, task_attachments_1.removeUploadedFiles)(files);
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        };
        const contentType = String(req.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的定时任务附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                const payload = fields.payload ? JSON.parse(fields.payload) : fields;
                return handleUpdate(payload, files || [], true);
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        readJsonBody(req, (payload) => void handleUpdate(payload), (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/delete" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.deleteCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, archived: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/restore" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.restoreCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/purge" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = (0, cron_job_store_1.purgeCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, id: job.id });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/bulk" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const ids = Array.from(new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id || "")).filter(Boolean)));
                const action = String(payload.action || "");
                if (!ids.length)
                    return (0, utils_1.sendJson)(res, { error: "请选择定时任务" }, 400);
                if (!["archive", "restore", "purge", "enable", "disable"].includes(action))
                    return (0, utils_1.sendJson)(res, { error: "不支持的批量操作" }, 400);
                const results = ids.map((id) => {
                    try {
                        const job = action === "archive" ? (0, cron_job_store_1.deleteCronJob)(id)
                            : action === "restore" ? (0, cron_job_store_1.restoreCronJob)(id)
                                : action === "purge" ? (0, cron_job_store_1.purgeCronJob)(id)
                                    : (0, cron_job_store_1.updateCronJob)(id, { enabled: action === "enable" });
                        return { id, success: !!job };
                    }
                    catch (error) {
                        return { id, success: false, error: error.message };
                    }
                });
                (0, utils_1.sendJson)(res, { success: results.every((item) => item.success), results }, results.some((item) => item.success) ? 200 : 409);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/run" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            runCronJob(payload.id, ctx, "manual")
                .then((result) => {
                const status = result.success ? 200 : 400;
                (0, utils_1.sendJson)(res, result, status);
            })
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/overview" && req.method === "GET") {
        const today = String(parsed.query.date || (0, cron_dev_reports_1.localDateKey)());
        const report = (0, cron_dev_reports_1.upsertAutoDevDailyReport)(today);
        const reports = (0, db_1.loadDevReports)().slice(0, 30);
        const jobs = (0, db_1.loadCronJobs)().map(cron_job_store_1.normalizeCronJob).filter((job) => job.workflow_type === "daily_dev");
        const journalAudit = (0, work_journal_1.getWorkJournalAudit)({ sync: false });
        (0, utils_1.sendJson)(res, {
            success: true,
            scheduler: schedulerStatus(),
            today: report,
            reports,
            weekly_reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20),
            notification: (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)()),
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
            if (!jobId || !runId)
                return (0, utils_1.sendJson)(res, { error: "缺少定时任务或运行标识" }, 400);
            if (pathname.endsWith("/cancel")) {
                try {
                    (0, utils_1.sendJson)(res, (0, cron_part_01_1.cancelCronRun)(jobId, runId, String(payload.reason || "用户取消本轮定时任务")));
                }
                catch (error) {
                    (0, utils_1.sendJson)(res, { error: error.message }, 409);
                }
                return;
            }
            retryCronRun(jobId, runId, ctx, pathname.endsWith("/resume") ? "resume" : "retry")
                .then(result => (0, utils_1.sendJson)(res, result, result?.success === false ? 409 : 200))
                .catch((error) => (0, utils_1.sendJson)(res, { error: error.message }, 409));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/work-journal/audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, work_journal_1.getWorkJournalAudit)());
        return true;
    }
    if (pathname === "/api/auto-dev/work-journal/events" && req.method === "GET") {
        const events = (0, work_journal_1.listWorkJournalEvents)({
            start: parsed.query.start,
            end: parsed.query.end,
            task_id: parsed.query.task_id,
            source: parsed.query.source,
            limit: parsed.query.limit,
        });
        (0, utils_1.sendJson)(res, { success: true, count: events.length, events });
        return true;
    }
    if (pathname === "/api/auto-dev/reports" && req.method === "GET") {
        const limit = Math.max(1, Math.min(120, Number(parsed.query.limit || 30)));
        (0, utils_1.sendJson)(res, { success: true, reports: (0, db_1.loadDevReports)().slice(0, limit) });
        return true;
    }
    if (pathname === "/api/auto-dev/weekly-reports" && req.method === "GET") {
        const limit = Math.max(1, Math.min(80, Number(parsed.query.limit || 20)));
        (0, utils_1.sendJson)(res, { success: true, reports: (0, db_1.loadDevWeeklyReports)().slice(0, limit) });
        return true;
    }
    if (pathname === "/api/auto-dev/weekly-report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const report = (0, cron_dev_reports_1.upsertAutoDevWeeklyReport)(payload.date || (0, cron_dev_reports_1.localDateKey)(), { force: payload.force === true });
                (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)()) });
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
                const config = (0, cron_dev_reports_1.saveNormalizedNotifyConfig)({
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
                (0, utils_1.sendJson)(res, { success: true, config });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/send" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const kind = payload.kind === "weekly" ? "weekly" : "daily";
            (0, cron_dev_reports_1.dispatchAutoDevReport)(kind, { date: payload.date || (0, cron_dev_reports_1.localDateKey)() })
                .then(result => (0, utils_1.sendJson)(res, result, result.success ? 200 : 400))
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const report = (0, cron_dev_reports_1.upsertAutoDevDailyReport)(payload.date || (0, cron_dev_reports_1.localDateKey)(), { force: payload.force === true });
                (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevReports)().slice(0, 30) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=cron-part-02.js.map