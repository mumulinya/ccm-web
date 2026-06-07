import { sendJson } from "../utils";
import { loadCronJobs, saveCronJobs } from "../db";
import { createAndQueueTask, type CollabCtx } from "./collaboration";

const runningCronJobs = new Set<string>();
let schedulerTimer: NodeJS.Timeout | null = null;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function minuteKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function startOfNextMinute(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  return next;
}

function parseCronNumber(raw: string, min: number, max: number, label: string) {
  if (!/^\d+$/.test(raw)) throw new Error(`${label} 字段包含无效值: ${raw}`);
  const value = Number(raw);
  if (value < min || value > max) throw new Error(`${label} 字段超出范围: ${raw}`);
  return value;
}

function expandCronField(raw: string, min: number, max: number, label: string, weekday = false) {
  const value = String(raw || "").trim();
  if (!value) throw new Error(`${label} 字段不能为空`);

  const values = new Set<number>();
  for (const item of value.split(",")) {
    const part = item.trim();
    if (!part) throw new Error(`${label} 字段包含空片段`);

    const pieces = part.split("/");
    if (pieces.length > 2) throw new Error(`${label} 字段步长格式错误: ${part}`);
    const rangePart = pieces[0] || "*";
    const step = pieces[1] == null ? 1 : parseCronNumber(pieces[1], 1, max - min + 1, label);

    let start = min;
    let end = max;

    if (rangePart !== "*" && rangePart !== "?") {
      if (rangePart.includes("-")) {
        const [left, right] = rangePart.split("-");
        start = parseCronNumber(left, min, max, label);
        end = parseCronNumber(right, min, max, label);
        if (start > end) throw new Error(`${label} 字段范围错误: ${rangePart}`);
      } else {
        start = parseCronNumber(rangePart, min, max, label);
        end = start;
      }
    }

    for (let current = start; current <= end; current += step) {
      values.add(weekday && current === 7 ? 0 : current);
    }
  }

  return values;
}

function parseCronExpression(expression: string) {
  const parts = String(expression || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 5) {
    throw new Error("Cron 表达式需要 5 段：分 时 日 月 周");
  }

  return {
    minute: expandCronField(parts[0], 0, 59, "分钟"),
    hour: expandCronField(parts[1], 0, 23, "小时"),
    day: expandCronField(parts[2], 1, 31, "日期"),
    month: expandCronField(parts[3], 1, 12, "月份"),
    weekday: expandCronField(parts[4], 0, 7, "星期", true),
  };
}

function validateCronExpression(expression: string) {
  parseCronExpression(expression);
}

function matchesCron(expression: string, date: Date) {
  const cron = parseCronExpression(expression);
  return cron.minute.has(date.getMinutes())
    && cron.hour.has(date.getHours())
    && cron.day.has(date.getDate())
    && cron.month.has(date.getMonth() + 1)
    && cron.weekday.has(date.getDay());
}

function computeNextRun(expression: string, from = new Date()) {
  try {
    let cursor = startOfNextMinute(from);
    const maxMinutes = 366 * 24 * 60;
    for (let i = 0; i < maxMinutes; i++) {
      if (matchesCron(expression, cursor)) return cursor.toISOString();
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeTargetType(job: any) {
  return job.target_type || (job.group_id ? "group" : "project");
}

function normalizeCronJob(job: any) {
  const targetType = normalizeTargetType(job);
  let scheduleError = "";
  try {
    validateCronExpression(job.schedule);
  } catch (e: any) {
    scheduleError = e.message;
  }

  return {
    ...job,
    target_type: targetType,
    enabled: job.enabled !== false,
    priority: job.priority || "normal",
    run_count: Number(job.run_count || 0),
    next_run: scheduleError || job.enabled === false ? null : computeNextRun(job.schedule),
    schedule_error: scheduleError || null,
  };
}

function patchCronJob(id: string, updates: any) {
  const jobs = loadCronJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = {
    ...jobs[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveCronJobs(jobs);
  return jobs[idx];
}

function validateCronJobPayload(job: any) {
  if (!String(job.name || "").trim()) throw new Error("请输入定时任务名称");
  if (!String(job.schedule || "").trim()) throw new Error("请输入 Cron 表达式");
  if (!String(job.prompt || "").trim()) throw new Error("请输入执行提示词");
  validateCronExpression(job.schedule);

  const targetType = normalizeTargetType(job);
  if (targetType === "group" && !job.group_id) throw new Error("请选择目标群聊");
  if (targetType !== "group" && !job.project) throw new Error("请选择目标项目");
}

function createCronJob(job: any) {
  validateCronJobPayload(job);
  const jobs = loadCronJobs();
  const now = new Date();
  const targetType = normalizeTargetType(job);
  const newJob = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: String(job.name || "").trim(),
    target_type: targetType,
    project: targetType === "project" ? job.project : "",
    group_id: targetType === "group" ? job.group_id : null,
    schedule: String(job.schedule || "").trim(),
    prompt: String(job.prompt || "").trim(),
    priority: job.priority || "normal",
    enabled: job.enabled !== false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    last_run: null,
    last_run_key: null,
    last_status: "never",
    last_result: "",
    last_task_id: null,
    run_count: 0,
    next_run: job.enabled === false ? null : computeNextRun(job.schedule, now),
  };
  jobs.push(newJob);
  saveCronJobs(jobs);
  return newJob;
}

function updateCronJob(id: string, updates: any) {
  const jobs = loadCronJobs();
  const idx = jobs.findIndex(j => j.id === id);
  if (idx === -1) return null;

  const current = jobs[idx];
  const draft = {
    ...current,
    ...updates,
  };
  draft.target_type = normalizeTargetType(draft);
  draft.enabled = draft.enabled !== false;
  draft.priority = draft.priority || "normal";
  if (draft.target_type === "group") {
    draft.project = "";
  } else {
    draft.group_id = null;
  }

  validateCronJobPayload(draft);
  draft.updated_at = new Date().toISOString();
  draft.next_run = draft.enabled ? computeNextRun(draft.schedule) : null;

  jobs[idx] = draft;
  saveCronJobs(jobs);
  return draft;
}

function deleteCronJob(id: string) {
  const jobs = loadCronJobs().filter(j => j.id !== id);
  saveCronJobs(jobs);
}

function buildTaskFromCronJob(job: any, trigger: "manual" | "schedule") {
  const targetType = normalizeTargetType(job);
  const triggerText = trigger === "manual" ? "手动执行" : "计划执行";
  const description = [
    `定时任务来源：${job.name}`,
    `触发方式：${triggerText}`,
    `Cron 表达式：${job.schedule}`,
    "",
    job.prompt,
  ].join("\n");

  return {
    title: `[定时] ${job.name}`,
    description,
    target_project: targetType === "group" ? "coordinator" : job.project,
    group_id: targetType === "group" ? job.group_id : null,
    assign_type: targetType === "group" ? "group" : "project",
    priority: job.priority || "normal",
    auto_execute: true,
  };
}

async function runCronJob(id: string, ctx: CollabCtx, trigger: "manual" | "schedule") {
  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error("定时任务不存在");

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

  try {
    validateCronJobPayload(job);
    const { task, queueResult } = createAndQueueTask(buildTaskFromCronJob(job, trigger), ctx);
    const queued = !!queueResult?.queued;
    const status = queued ? "queued" : "skipped";
    const result = `${queueResult?.message || "任务已创建"}：${task.title}`;
    const updated = patchCronJob(id, {
      last_status: status,
      last_result: result,
      last_task_id: task.id,
      run_count: Number(job.run_count || 0) + 1,
      next_run: nextRun,
    });
    return { success: true, queued, task, queue_result: queueResult, job: updated };
  } catch (e: any) {
    const updated = patchCronJob(id, {
      last_status: "failed",
      last_result: e.message,
      run_count: Number(job.run_count || 0) + 1,
      next_run: nextRun,
    });
    return { success: false, error: e.message, job: updated };
  } finally {
    runningCronJobs.delete(id);
  }
}

async function tickCronScheduler(ctx: CollabCtx) {
  const now = new Date();
  const key = minuteKey(now);
  const jobs = loadCronJobs();

  for (const rawJob of jobs) {
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
    if (job.last_run_key === key || runningCronJobs.has(job.id)) continue;
    if (!matchesCron(job.schedule, now)) continue;

    runCronJob(job.id, ctx, "schedule")
      .then(result => {
        if (!result.success) console.error("[Cron]", job.name, result.error || result.message);
      })
      .catch((e: any) => console.error("[Cron]", job.name, e.message));
  }
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
    sendJson(res, { jobs: loadCronJobs().map(normalizeCronJob), scheduler: schedulerStatus() });
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
        deleteCronJob(payload.id);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
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

  return false;
}
