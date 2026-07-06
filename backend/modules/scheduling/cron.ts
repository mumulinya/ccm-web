import { sendJson } from "../../core/utils";
import {
  loadAutoDevNotifyConfig,
  loadCronJobs,
  loadDevReports,
  loadDevWeeklyReports,
} from "../../core/db";
import {
  claimReadyDailyDevBacklog,
  continueDailyDevTasksFromGaps,
  createAndQueueTask,
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
  matchesCron,
  minuteKey,
  normalizeCronJob,
  normalizeTargetType,
  patchCronJob,
  purgeCronJob,
  restoreCronJob,
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

const runningCronJobs = new Set<string>();
let schedulerTimer: NodeJS.Timeout | null = null;

function buildTaskFromCronJob(job: any, trigger: "manual" | "schedule") {
  const targetType = normalizeTargetType(job);
  const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
  const requiresCodeChanges = workflowType === "daily_dev"
    ? (job.requires_code_changes ?? job.requiresCodeChanges ?? true)
    : false;
  const triggerText = trigger === "manual" ? "手动执行" : "计划执行";
  const buildCronSourceDocuments = (extra = "") => [
    `[定时任务 ${job.name || job.id || "未命名"}]`,
    `触发方式：${triggerText}`,
    `Cron 表达式：${job.schedule || ""}`,
    "定时任务提示词：",
    job.prompt || "",
    extra ? "\n已认领/生成的业务文档：" : "",
    extra,
  ].filter(Boolean).join("\n");
  const cronMeta: any = {
    workflow_type: workflowType,
    imported_shared_docs: null,
    claimed_backlogs: [],
  };
  const buildBacklogTask = (backlog: any, batchIndex = 0, batchTotal = 1) => {
    const description = [
      `定时任务来源：${job.name}`,
      `触发方式：${triggerText}`,
      `Cron 表达式：${job.schedule}`,
      `工作流类型：业务开发 daily_dev`,
      `需求池文件：${backlog.backlog_file}`,
      batchTotal > 1 ? `批量认领：第 ${batchIndex + 1}/${batchTotal} 条` : "",
      `代码变更要求：${requiresCodeChanges && backlog.requires_code_changes !== false ? "必须有实际文件变更才能完成" : "允许无代码变更"}`,
      "",
      "定时任务提示词：",
      job.prompt,
      "",
      "已认领的需求池内容：",
      backlog.documents,
      "",
      "主 Agent 执行要求：",
      "- 按已认领需求拆分给对应项目子 Agent。",
      "- 子 Agent 必须返回 CCM_AGENT_RECEIPT。",
      "- 最终报告必须覆盖完成内容、涉及文件、验证结果、风险和仍需用户确认的事项。",
    ].filter(line => line !== "").join("\n");

    return {
      title: `[定时] ${backlog.title}`,
      description,
      target_project: "coordinator",
      group_id: job.group_id,
      assign_type: "group",
      priority: backlog.priority || job.priority || "normal",
      auto_execute: true,
      workflow_type: "daily_dev",
      requires_code_changes: requiresCodeChanges && backlog.requires_code_changes !== false,
      requires_verification: true,
      business_goal: backlog.business_goal || backlog.title || String(job.prompt || job.name || "").slice(0, 500),
      acceptance_criteria: backlog.acceptance || "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。",
      source_documents: buildCronSourceDocuments(backlog.documents),
      workflow_meta: {
        intake: {
          backlog_file: backlog.backlog_file,
          claimed_by_cron_job_id: job.id,
          cron_trigger: trigger,
          claimed_at: new Date().toISOString(),
        },
        batch: batchTotal > 1 ? { index: batchIndex + 1, total: batchTotal } : null,
        cron: cronMeta,
      },
      cron_job_id: job.id,
      cron_trigger: trigger,
    };
  };

  if (workflowType === "daily_dev" && targetType === "group") {
    const shouldImportSharedDocs = job.import_shared_docs !== false && job.importSharedDocs !== false;
    if (shouldImportSharedDocs) {
      const importResult = importSharedDocsToDailyDevBacklog({
        group_id: job.group_id,
        limit: Math.max(1, Math.min(20, Number(job.import_shared_docs_limit || job.importSharedDocsLimit || job.backlog_batch_limit || job.backlogBatchLimit || 1))),
        priority: job.priority || "normal",
        requires_code_changes: requiresCodeChanges,
        source: "cron",
      });
      cronMeta.imported_shared_docs = {
        imported: importResult.imported || 0,
        skipped: importResult.skipped || 0,
        items: (importResult.items || []).map((item: any) => ({
          source: item.source,
          backlog: item.backlog,
          title: item.title,
        })),
      };
    }
    const batchLimit = Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1)));
    const claimed: any[] = [];
    for (let i = 0; i < batchLimit; i++) {
      const backlog = claimReadyDailyDevBacklog(job.group_id, { source: "cron", cron_job_id: job.id, trigger });
      if (!backlog) break;
      claimed.push(backlog);
    }
    if (claimed.length > 0) {
      const total = claimed.length;
      cronMeta.claimed_backlogs = claimed.map((backlog: any) => ({
        backlog_file: backlog.backlog_file,
        title: backlog.title,
        priority: backlog.priority,
      }));
      const drafts = claimed.map((backlog, index) => buildBacklogTask(backlog, index, total));
      return { drafts: batchLimit > 1 ? drafts : [drafts[0]], meta: cronMeta };
    }
  }

  if (workflowType === "daily_dev" && targetType === "group" && job.run_without_backlog !== true && job.allow_empty_run !== true) {
    return { drafts: [], meta: cronMeta };
  }

  const description = [
    `定时任务来源：${job.name}`,
    `触发方式：${triggerText}`,
    `Cron 表达式：${job.schedule}`,
    workflowType === "daily_dev" ? "工作流类型：业务开发 daily_dev" : "",
    workflowType === "daily_dev"
      ? `代码变更要求：${requiresCodeChanges ? "必须有实际文件变更才能完成" : "允许无代码变更"}`
      : "",
    "",
    job.prompt,
  ].filter(line => line !== "").join("\n");

  const draft = {
    title: `[定时] ${job.name}`,
    description,
    target_project: targetType === "group" ? "coordinator" : job.project,
    group_id: targetType === "group" ? job.group_id : null,
    assign_type: targetType === "group" ? "group" : "project",
    priority: job.priority || "normal",
    auto_execute: true,
    workflow_type: workflowType,
    requires_code_changes: requiresCodeChanges,
    requires_verification: workflowType === "daily_dev",
    business_goal: workflowType === "daily_dev" ? String(job.prompt || job.name || "").slice(0, 500) : "",
    acceptance_criteria: workflowType === "daily_dev" ? "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。" : "",
    source_documents: workflowType === "daily_dev" ? buildCronSourceDocuments("来自定时任务提示词、群聊共享文件或 backlog 文档。") : "",
    cron_job_id: job.id,
    cron_trigger: trigger,
  };
  return { drafts: [draft], meta: cronMeta };
}

export function runCronDailyDevProtocolSelfTest() {
  const job = {
    id: "cron-daily-dev-self-test",
    name: "退款审核定时开发",
    schedule: "*/30 * * * *",
    target_type: "group",
    group_id: "demo-group",
    workflow_type: "daily_dev",
    run_without_backlog: true,
    prompt: "按接口文档实现退款审核，接口 POST /api/refunds/:id/audit，字段 approved、reason。",
  };
  const result = buildTaskFromCronJob(job, "manual");
  const draft = Array.isArray(result?.drafts) ? result.drafts[0] : null;
  const sourceDocs = String(draft?.source_documents || "");
  const checks = {
    hasDraft: !!draft,
    workflowDailyDev: draft?.workflow_type === "daily_dev",
    targetCoordinatorGroup: draft?.assign_type === "group" && draft?.target_project === "coordinator",
    requiresVerification: draft?.requires_verification === true,
    sourceDocumentsIncludePrompt: sourceDocs.includes("/api/refunds") && sourceDocs.includes("approved"),
    hasCronMeta: draft?.cron_job_id === job.id && draft?.cron_trigger === "manual",
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    source_documents_preview: sourceDocs.slice(0, 500),
  };
}

function formatCronMetaSummary(meta: any = {}) {
  const imported = meta?.imported_shared_docs;
  const continued = meta?.continued_gap_tasks;
  const parts: string[] = [];
  if (continued) parts.push(`续跑缺口任务 ${Number(continued.continued || 0)} 个`);
  if (imported) parts.push(`导入共享文档 ${Number(imported.imported || 0)} 个`);
  if (Array.isArray(meta?.claimed_backlogs)) parts.push(`认领需求 ${meta.claimed_backlogs.length} 条`);
  return parts.length ? `；${parts.join("，")}` : "";
}

export function syncCronTaskStatus(task: any, status: string, result = "") {
  const cronJobId = task?.cron_job_id;
  if (!cronJobId) return;

  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === cronJobId);
  if (!job) return;

  const resultText = String(result || task.result || "").trim();
  const patch: any = {
    last_task_id: task.id || job.last_task_id || null,
    next_run: job.enabled === false ? null : computeNextRun(job.schedule),
  };

  if (status === "in_progress") {
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

async function runCronJobCore(id: string, ctx: CollabCtx, trigger: "manual" | "schedule", reliability: any = null) {
  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error("定时任务不存在");
  if (job.archived || job.deleted_at) throw new Error("定时任务已归档，请先恢复后再运行");

  if (runningCronJobs.has(id)) {
    return { success: false, message: "定时任务正在触发中，请稍后再试" };
  }

  const now = new Date();
  const nextRun = computeNextRun(job.schedule, now);
  runningCronJobs.add(id);
  patchCronJob(id, {
    last_run: now.toISOString(),
    last_run_key: minuteKey(now),
    last_status: "running",
    last_result: "正在创建并派发任务...",
  });

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
      return { success: true, queued: queuedCount > 0, skipped: continuedCount === 0, continued: continuedCount, message: result, job: updated, gap_continue_result: gapContinueResult };
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
      return {
        success: true,
        queued: queuedCount > 0,
        queued_count: queuedCount,
        task_count: created.length,
        tasks: created.map(item => item.task),
        results: created,
        job: updated,
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
    return { success: true, queued, task, queue_result: queueResult, job: updated };
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
    return { success: false, error: e.message, job: updated };
  } finally {
    try { upsertAutoDevDailyReport(localDateKey()); } catch (reportError: any) { console.error("[Cron] 生成开发日报失败", reportError?.message || reportError); }
    runningCronJobs.delete(id);
  }
}

async function runCronJob(id: string, ctx: CollabCtx, trigger: "manual" | "schedule") {
  if (trigger !== "schedule") return runCronJobCore(id, ctx, trigger);
  const operationKey = `${id}:${minuteKey(new Date())}`;
  const operation = acquireIdempotency({ scope: "cron-schedule", key: operationKey, leaseMs: 10 * 60 * 1000, metadata: { cron_job_id: id, minute_key: operationKey.split(":").slice(1).join(":") } });
  if (!operation.acquired) {
    return operation.record?.result || { success: true, duplicate: true, skipped: true, message: operation.inProgress ? "相同定时周期正在执行" : "相同定时周期已执行" };
  }
  try {
    const result = await runCronJobCore(id, ctx, trigger, { operationKey, traceId: operation.traceId });
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

async function tickCronScheduler(ctx: CollabCtx) {
  const now = new Date();
  const key = minuteKey(now);
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
    if (job.last_run_key === key && getIdempotencyRecord("cron-schedule", `${job.id}:${key}`)?.status === "completed") continue;
    if (!matchesCron(job.schedule, now)) continue;

    runCronJob(job.id, ctx, "schedule")
      .then(result => {
        if (!result.success) console.error("[Cron]", job.name, result.error || result.message);
      })
      .catch((e: any) => console.error("[Cron]", job.name, e.message));
  }
  await tickAutoDevReportNotifications(now);
}

export function startCronScheduler(ctx: CollabCtx) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  const tick = () => tickCronScheduler(ctx).catch((e: any) => console.error("[Cron]", e.message));
  tick();
  schedulerTimer = setInterval(tick, 30 * 1000);
  console.log("[Cron] 定时任务调度器已启动");
}

export function stopCronScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

function schedulerStatus() {
  return {
    running: !!schedulerTimer,
    interval_ms: 30 * 1000,
    running_job_ids: Array.from(runningCronJobs),
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
    sendJson(res, { jobs: jobs.map(normalizeCronJob), archived_count: allJobs.filter(job => job.archived || job.deleted_at).length, scheduler: schedulerStatus() });
    return true;
  }

  if (pathname === "/api/cron/status" && req.method === "GET") {
    sendJson(res, schedulerStatus());
    return true;
  }

  if (pathname === "/api/cron/create" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = createCronJob(payload);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/update" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const { id, ...updates } = payload;
        const job = updateCronJob(id, updates);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
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
    sendJson(res, {
      success: true,
      scheduler: schedulerStatus(),
      today: report,
      reports,
      weekly_reports: loadDevWeeklyReports().slice(0, 20),
      notification: normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig()),
      daily_dev_jobs: jobs,
      backlog: report.backlog,
    });
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
        const report = upsertAutoDevWeeklyReport(payload.date || localDateKey());
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
        const report = upsertAutoDevDailyReport(payload.date || localDateKey());
        sendJson(res, { success: true, report, reports: loadDevReports().slice(0, 30) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  return false;
}
