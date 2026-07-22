"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CRON_TIMEZONE = exports.CRON_RUN_HISTORY_LIMIT = void 0;
exports.normalizeCronRunHistory = normalizeCronRunHistory;
exports.aggregateCronRunStatus = aggregateCronRunStatus;
exports.pad2 = pad2;
exports.normalizeCronTimezone = normalizeCronTimezone;
exports.minuteKey = minuteKey;
exports.validateCronExpression = validateCronExpression;
exports.matchesCron = matchesCron;
exports.computeNextRun = computeNextRun;
exports.normalizeTargetType = normalizeTargetType;
exports.normalizeCronJob = normalizeCronJob;
exports.patchCronJob = patchCronJob;
exports.appendCronRun = appendCronRun;
exports.patchCronRun = patchCronRun;
exports.findCronRunForTask = findCronRunForTask;
exports.syncCronRunTask = syncCronRunTask;
exports.runCronRunHistoryContractSelfTest = runCronRunHistoryContractSelfTest;
exports.validateCronJobPayload = validateCronJobPayload;
exports.createCronJob = createCronJob;
exports.updateCronJob = updateCronJob;
exports.deleteCronJob = deleteCronJob;
exports.restoreCronJob = restoreCronJob;
exports.purgeCronJob = purgeCronJob;
const db_1 = require("../../core/db");
exports.CRON_RUN_HISTORY_LIMIT = 40;
exports.DEFAULT_CRON_TIMEZONE = "Asia/Shanghai";
const CRON_RUN_TERMINAL_STATUSES = new Set(["done", "failed", "skipped", "cancelled"]);
function cronRunId() {
    return `cron-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function normalizedTaskIds(value) {
    return [...new Set((Array.isArray(value) ? value : [value]).map(item => String(item || "").trim()).filter(Boolean))];
}
function legacyCronRun(job) {
    if (!job?.last_run)
        return null;
    const taskIds = normalizedTaskIds(job.last_task_ids?.length ? job.last_task_ids : job.last_task_id);
    const status = String(job.last_status || "done");
    return {
        id: `cron-run-legacy-${String(job.id || "job")}-${Date.parse(job.last_run) || 0}`,
        trigger: "legacy",
        started_at: job.last_run,
        dispatched_at: job.last_run,
        completed_at: CRON_RUN_TERMINAL_STATUSES.has(status) ? job.last_run : null,
        status,
        result: String(job.last_result || "历史运行记录"),
        task_ids: taskIds,
        primary_task_id: String(job.last_task_id || taskIds[0] || ""),
        task_states: Object.fromEntries(taskIds.map(taskId => [taskId, { status, result: String(job.last_result || ""), updated_at: job.updated_at || job.last_run }])),
        meta: job.last_run_meta || {},
        legacy: true,
        legacy_summary: true,
    };
}
function normalizeCronRunHistory(job) {
    const source = Array.isArray(job?.run_history) ? job.run_history : [];
    const rows = source.length ? source : [legacyCronRun(job)].filter(Boolean);
    return rows
        .filter((run) => run && run.id)
        .map((run) => {
        const taskIds = normalizedTaskIds(run.task_ids?.length ? run.task_ids : run.primary_task_id);
        return {
            ...run,
            trigger: run.trigger || "schedule",
            status: run.status || "queued",
            result: String(run.result || ""),
            task_ids: taskIds,
            primary_task_id: String(run.primary_task_id || taskIds[0] || ""),
            task_states: run.task_states && typeof run.task_states === "object" ? run.task_states : {},
            meta: run.meta && typeof run.meta === "object" ? run.meta : {},
            attempt: Math.max(1, Number(run.attempt || 1)),
            parent_run_id: String(run.parent_run_id || ""),
            scheduled_for: run.scheduled_for || null,
            next_retry_at: run.next_retry_at || null,
            notifications: run.notifications && typeof run.notifications === "object" ? run.notifications : {},
        };
    })
        .sort((left, right) => String(right.started_at || "").localeCompare(String(left.started_at || "")))
        .slice(0, exports.CRON_RUN_HISTORY_LIMIT);
}
function aggregateCronRunStatus(taskStates, fallback = "queued") {
    const statuses = Object.values(taskStates || {}).map((item) => String(item?.status || "").toLowerCase()).filter(Boolean);
    if (!statuses.length)
        return fallback;
    if (statuses.some(status => ["failed", "error"].includes(status)))
        return "failed";
    if (statuses.some(status => ["in_progress", "running", "running_task"].includes(status)))
        return "running_task";
    if (statuses.some(status => ["waiting", "blocked", "needs_user", "paused"].includes(status)))
        return "waiting";
    if (statuses.some(status => ["pending", "queued"].includes(status)))
        return "queued";
    if (statuses.every(status => ["done", "completed", "passed", "skipped", "cancelled"].includes(status))) {
        if (statuses.some(status => status === "cancelled"))
            return "cancelled";
        if (statuses.every(status => status === "skipped"))
            return "skipped";
        return "done";
    }
    return fallback;
}
function pad2(value) {
    return String(value).padStart(2, "0");
}
function normalizeCronTimezone(value) {
    const timezone = String(value || exports.DEFAULT_CRON_TIMEZONE).trim() || exports.DEFAULT_CRON_TIMEZONE;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
        return timezone;
    }
    catch {
        throw new Error(`无效时区：${timezone}`);
    }
}
function zonedDateParts(date, timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: normalizeCronTimezone(timezone), year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[values.weekday] ?? 0;
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), weekday };
}
function minuteKey(date, timezone = exports.DEFAULT_CRON_TIMEZONE) {
    const parts = zonedDateParts(date, timezone);
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}
function startOfNextMinute(date) {
    const next = new Date(date);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next;
}
function parseCronNumber(raw, min, max, label) {
    if (!/^\d+$/.test(raw))
        throw new Error(`${label} 字段包含无效值: ${raw}`);
    const value = Number(raw);
    if (value < min || value > max)
        throw new Error(`${label} 字段超出范围: ${raw}`);
    return value;
}
function expandCronField(raw, min, max, label, weekday = false) {
    const value = String(raw || "").trim();
    if (!value)
        throw new Error(`${label} 字段不能为空`);
    const values = new Set();
    for (const item of value.split(",")) {
        const part = item.trim();
        if (!part)
            throw new Error(`${label} 字段包含空片段`);
        const pieces = part.split("/");
        if (pieces.length > 2)
            throw new Error(`${label} 字段步长格式错误: ${part}`);
        const rangePart = pieces[0] || "*";
        const step = pieces[1] == null ? 1 : parseCronNumber(pieces[1], 1, max - min + 1, label);
        let start = min;
        let end = max;
        if (rangePart !== "*" && rangePart !== "?") {
            if (rangePart.includes("-")) {
                const [left, right] = rangePart.split("-");
                start = parseCronNumber(left, min, max, label);
                end = parseCronNumber(right, min, max, label);
                if (start > end)
                    throw new Error(`${label} 字段范围错误: ${rangePart}`);
            }
            else {
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
function parseCronExpression(expression) {
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
function validateCronExpression(expression) {
    parseCronExpression(expression);
}
function matchesCron(expression, date, timezone = exports.DEFAULT_CRON_TIMEZONE) {
    const cron = parseCronExpression(expression);
    const parts = zonedDateParts(date, timezone);
    return cron.minute.has(parts.minute)
        && cron.hour.has(parts.hour)
        && cron.day.has(parts.day)
        && cron.month.has(parts.month)
        && cron.weekday.has(parts.weekday);
}
function computeNextRun(expression, from = new Date(), timezone = exports.DEFAULT_CRON_TIMEZONE) {
    try {
        let cursor = startOfNextMinute(from);
        const maxMinutes = 366 * 24 * 60;
        for (let i = 0; i < maxMinutes; i++) {
            if (matchesCron(expression, cursor, timezone))
                return cursor.toISOString();
            cursor.setMinutes(cursor.getMinutes() + 1);
        }
    }
    catch {
        return null;
    }
    return null;
}
function normalizeTargetType(job) {
    return job.target_type || (job.group_id ? "group" : "project");
}
function normalizeCronJob(job) {
    const targetType = normalizeTargetType(job);
    const workflowType = job.workflow_type || job.workflowType || (job.daily_dev || job.dailyDev ? "daily_dev" : "general");
    let scheduleError = "";
    let timezone = exports.DEFAULT_CRON_TIMEZONE;
    try {
        timezone = normalizeCronTimezone(job.timezone);
        validateCronExpression(job.schedule);
    }
    catch (e) {
        scheduleError = e.message;
    }
    return {
        ...job,
        target_type: targetType,
        workflow_type: targetType === "group" ? workflowType : "general",
        requires_code_changes: targetType === "group"
            ? (job.requires_code_changes ?? job.requiresCodeChanges ?? workflowType === "daily_dev")
            : false,
        enabled: job.enabled !== false,
        priority: job.priority || "normal",
        backlog_batch_limit: Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1))),
        import_shared_docs: targetType === "group" && workflowType === "daily_dev"
            ? (job.import_shared_docs ?? job.importSharedDocs ?? true)
            : false,
        continue_gaps: targetType === "group" && workflowType === "daily_dev"
            ? (job.continue_gaps ?? job.continueGaps ?? true)
            : false,
        gap_continue_limit: targetType === "group" && workflowType === "daily_dev"
            ? Math.max(1, Math.min(20, Number(job.gap_continue_limit || job.gapContinueLimit || 3)))
            : 0,
        run_count: Number(job.run_count || 0),
        run_history: normalizeCronRunHistory(job),
        timezone,
        retry_limit: Math.max(0, Math.min(10, Number(job.retry_limit ?? job.retryLimit ?? 2))),
        retry_interval_minutes: Math.max(1, Math.min(1440, Number(job.retry_interval_minutes ?? job.retryIntervalMinutes ?? 10))),
        misfire_policy: ["run_once", "skip"].includes(String(job.misfire_policy || job.misfirePolicy)) ? String(job.misfire_policy || job.misfirePolicy) : "run_once",
        misfire_grace_minutes: Math.max(1, Math.min(10080, Number(job.misfire_grace_minutes ?? job.misfireGraceMinutes ?? 1440))),
        notification_enabled: job.notification_enabled === true || job.notificationEnabled === true,
        notify_on: [...new Set((Array.isArray(job.notify_on) ? job.notify_on : Array.isArray(job.notifyOn) ? job.notifyOn : ["failed", "waiting", "done"]).map(String).filter(value => ["started", "done", "failed", "waiting", "recovered", "cancelled"].includes(value)))],
        source_attachments: Array.isArray(job.source_attachments || job.sourceAttachments) ? (job.source_attachments || job.sourceAttachments) : [],
        source_attachment_contexts: Array.isArray(job.source_attachment_contexts || job.sourceAttachmentContexts) ? (job.source_attachment_contexts || job.sourceAttachmentContexts) : [],
        source_attachment_context: String(job.source_attachment_context || job.sourceAttachmentContext || ""),
        source_attachment_warnings: Array.isArray(job.source_attachment_warnings || job.sourceAttachmentWarnings) ? (job.source_attachment_warnings || job.sourceAttachmentWarnings) : [],
        next_run: scheduleError || job.enabled === false ? null : (job.next_run || computeNextRun(job.schedule, new Date(), timezone)),
        schedule_error: scheduleError || null,
    };
}
function patchCronJob(id, updates) {
    const jobs = (0, db_1.loadCronJobs)();
    const idx = jobs.findIndex(j => j.id === id);
    if (idx === -1)
        return null;
    jobs[idx] = {
        ...jobs[idx],
        ...updates,
        updated_at: new Date().toISOString(),
    };
    (0, db_1.saveCronJobs)(jobs);
    return jobs[idx];
}
function appendCronRun(jobId, input = {}) {
    const jobs = (0, db_1.loadCronJobs)();
    const index = jobs.findIndex(job => job.id === jobId);
    if (index < 0)
        return null;
    const now = String(input.started_at || new Date().toISOString());
    const run = {
        id: String(input.id || cronRunId()),
        trigger: input.trigger || "schedule",
        started_at: now,
        dispatched_at: input.dispatched_at || null,
        completed_at: input.completed_at || null,
        status: input.status || "triggering",
        result: String(input.result || "正在创建并派发任务..."),
        task_ids: normalizedTaskIds(input.task_ids),
        primary_task_id: String(input.primary_task_id || ""),
        task_states: input.task_states && typeof input.task_states === "object" ? input.task_states : {},
        meta: input.meta && typeof input.meta === "object" ? input.meta : {},
        attempt: Math.max(1, Number(input.attempt || 1)),
        parent_run_id: String(input.parent_run_id || ""),
        scheduled_for: input.scheduled_for || null,
        next_retry_at: input.next_retry_at || null,
        notifications: input.notifications && typeof input.notifications === "object" ? input.notifications : {},
    };
    jobs[index] = {
        ...jobs[index],
        run_history: [run, ...normalizeCronRunHistory(jobs[index]).filter((item) => item.id !== run.id)].slice(0, exports.CRON_RUN_HISTORY_LIMIT),
        updated_at: new Date().toISOString(),
    };
    (0, db_1.saveCronJobs)(jobs);
    return run;
}
function patchCronRun(jobId, runId, updates = {}) {
    const jobs = (0, db_1.loadCronJobs)();
    const jobIndex = jobs.findIndex(job => job.id === jobId);
    if (jobIndex < 0)
        return null;
    const history = normalizeCronRunHistory(jobs[jobIndex]);
    const runIndex = history.findIndex((run) => run.id === runId);
    if (runIndex < 0)
        return null;
    const next = {
        ...history[runIndex],
        ...updates,
        task_ids: normalizedTaskIds(updates.task_ids ?? history[runIndex].task_ids),
        task_states: updates.task_states && typeof updates.task_states === "object" ? updates.task_states : history[runIndex].task_states,
        meta: updates.meta && typeof updates.meta === "object" ? updates.meta : history[runIndex].meta,
        updated_at: new Date().toISOString(),
    };
    history[runIndex] = next;
    jobs[jobIndex] = { ...jobs[jobIndex], run_history: history.slice(0, exports.CRON_RUN_HISTORY_LIMIT), updated_at: next.updated_at };
    (0, db_1.saveCronJobs)(jobs);
    return next;
}
function findCronRunForTask(job, taskId, preferredRunId = "") {
    const history = normalizeCronRunHistory(job);
    return history.find((run) => preferredRunId && run.id === preferredRunId)
        || history.find((run) => run.task_ids.includes(taskId))
        || null;
}
function syncCronRunTask(jobId, runId, taskId, status, result = "", updatedAt = new Date().toISOString()) {
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(item => item.id === jobId);
    if (!job)
        return null;
    const run = findCronRunForTask(job, taskId, runId);
    if (!run)
        return null;
    const taskIds = normalizedTaskIds([...(run.task_ids || []), taskId]);
    const taskStates = {
        ...(run.task_states || {}),
        [taskId]: { status, result: String(result || ""), updated_at: updatedAt },
    };
    const aggregateStatus = aggregateCronRunStatus(taskStates, run.status || "queued");
    const completedAt = CRON_RUN_TERMINAL_STATUSES.has(aggregateStatus) ? updatedAt : null;
    return patchCronRun(jobId, run.id, {
        task_ids: taskIds,
        primary_task_id: run.primary_task_id || taskId,
        task_states: taskStates,
        status: aggregateStatus,
        result: String(result || run.result || ""),
        completed_at: completedAt,
    });
}
function runCronRunHistoryContractSelfTest() {
    const taskStates = {
        first: { status: "done" },
        second: { status: "in_progress" },
    };
    const legacy = normalizeCronRunHistory({ id: "legacy", last_run: "2026-07-13T01:00:00.000Z", last_status: "done", last_task_id: "task-legacy" });
    const shanghaiMorning = new Date("2026-07-13T01:00:00.000Z");
    const checks = {
        batchRunningUntilAllDone: aggregateCronRunStatus(taskStates) === "running_task",
        batchDoneWhenAllDone: aggregateCronRunStatus({ first: { status: "done" }, second: { status: "completed" } }) === "done",
        failureWins: aggregateCronRunStatus({ first: { status: "done" }, second: { status: "failed" } }) === "failed",
        waitingVisible: aggregateCronRunStatus({ first: { status: "done" }, second: { status: "needs_user" } }) === "waiting",
        legacyBackfill: legacy.length === 1 && legacy[0].task_ids[0] === "task-legacy" && legacy[0].legacy_summary === true,
        timezoneMatch: matchesCron("0 9 * * *", shanghaiMorning, "Asia/Shanghai") && !matchesCron("0 9 * * *", shanghaiMorning, "UTC"),
        timezoneMinuteKey: minuteKey(shanghaiMorning, "Asia/Shanghai") === "2026-07-13 09:00",
        timezoneNextRun: computeNextRun("0 9 * * *", new Date("2026-07-12T23:00:00.000Z"), "Asia/Shanghai") === "2026-07-13T01:00:00.000Z",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
function validateCronJobPayload(job) {
    if (!String(job.name || "").trim())
        throw new Error("请输入定时任务名称");
    if (!String(job.schedule || "").trim())
        throw new Error("请输入 Cron 表达式");
    if (!String(job.prompt || "").trim())
        throw new Error("请输入执行提示词");
    validateCronExpression(job.schedule);
    normalizeCronTimezone(job.timezone);
    const targetType = normalizeTargetType(job);
    if (targetType === "group" && !job.group_id)
        throw new Error("请选择目标群聊");
    if (targetType !== "group" && !job.project)
        throw new Error("请选择目标项目");
}
function createCronJob(job) {
    validateCronJobPayload(job);
    const jobs = (0, db_1.loadCronJobs)();
    const now = new Date();
    const targetType = normalizeTargetType(job);
    const timezone = normalizeCronTimezone(job.timezone);
    const newJob = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: String(job.name || "").trim(),
        target_type: targetType,
        workflow_type: targetType === "group" ? (job.workflow_type || job.workflowType || (job.daily_dev || job.dailyDev ? "daily_dev" : "general")) : "general",
        requires_code_changes: targetType === "group"
            ? (job.requires_code_changes ?? job.requiresCodeChanges ?? (job.workflow_type === "daily_dev" || job.workflowType === "daily_dev" || job.daily_dev || job.dailyDev))
            : false,
        project: targetType === "project" ? job.project : "",
        group_id: targetType === "group" ? job.group_id : null,
        schedule: String(job.schedule || "").trim(),
        prompt: String(job.prompt || "").trim(),
        priority: job.priority || "normal",
        timezone,
        retry_limit: Math.max(0, Math.min(10, Number(job.retry_limit ?? job.retryLimit ?? 2))),
        retry_interval_minutes: Math.max(1, Math.min(1440, Number(job.retry_interval_minutes ?? job.retryIntervalMinutes ?? 10))),
        misfire_policy: ["run_once", "skip"].includes(String(job.misfire_policy || job.misfirePolicy)) ? String(job.misfire_policy || job.misfirePolicy) : "run_once",
        misfire_grace_minutes: Math.max(1, Math.min(10080, Number(job.misfire_grace_minutes ?? job.misfireGraceMinutes ?? 1440))),
        notification_enabled: job.notification_enabled === true || job.notificationEnabled === true,
        notify_on: [...new Set((Array.isArray(job.notify_on) ? job.notify_on : Array.isArray(job.notifyOn) ? job.notifyOn : ["failed", "waiting", "done"]).map(String).filter(value => ["started", "done", "failed", "waiting", "recovered", "cancelled"].includes(value)))],
        source_attachments: Array.isArray(job.source_attachments || job.sourceAttachments) ? (job.source_attachments || job.sourceAttachments) : [],
        source_attachment_contexts: Array.isArray(job.source_attachment_contexts || job.sourceAttachmentContexts) ? (job.source_attachment_contexts || job.sourceAttachmentContexts) : [],
        source_attachment_context: String(job.source_attachment_context || job.sourceAttachmentContext || ""),
        source_attachment_warnings: Array.isArray(job.source_attachment_warnings || job.sourceAttachmentWarnings) ? (job.source_attachment_warnings || job.sourceAttachmentWarnings) : [],
        backlog_batch_limit: Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1))),
        import_shared_docs: targetType === "group"
            && (job.workflow_type === "daily_dev" || job.workflowType === "daily_dev" || job.daily_dev || job.dailyDev)
            ? (job.import_shared_docs ?? job.importSharedDocs ?? true)
            : false,
        continue_gaps: targetType === "group"
            && (job.workflow_type === "daily_dev" || job.workflowType === "daily_dev" || job.daily_dev || job.dailyDev)
            ? (job.continue_gaps ?? job.continueGaps ?? true)
            : false,
        gap_continue_limit: targetType === "group"
            && (job.workflow_type === "daily_dev" || job.workflowType === "daily_dev" || job.daily_dev || job.dailyDev)
            ? Math.max(1, Math.min(20, Number(job.gap_continue_limit || job.gapContinueLimit || 3)))
            : 0,
        enabled: job.enabled !== false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        last_run: null,
        last_run_key: null,
        last_status: "never",
        last_result: "",
        last_task_id: null,
        last_task_ids: [],
        run_history: [],
        run_count: 0,
        next_run: job.enabled === false ? null : computeNextRun(job.schedule, now, timezone),
    };
    jobs.push(newJob);
    (0, db_1.saveCronJobs)(jobs);
    return newJob;
}
function updateCronJob(id, updates) {
    const jobs = (0, db_1.loadCronJobs)();
    const idx = jobs.findIndex(j => j.id === id);
    if (idx === -1)
        return null;
    const current = jobs[idx];
    const draft = {
        ...current,
        ...updates,
    };
    draft.target_type = normalizeTargetType(draft);
    draft.workflow_type = draft.target_type === "group" ? (draft.workflow_type || draft.workflowType || (draft.daily_dev || draft.dailyDev ? "daily_dev" : "general")) : "general";
    draft.requires_code_changes = draft.target_type === "group"
        ? (draft.requires_code_changes ?? draft.requiresCodeChanges ?? draft.workflow_type === "daily_dev")
        : false;
    draft.enabled = draft.enabled !== false;
    draft.priority = draft.priority || "normal";
    draft.timezone = normalizeCronTimezone(draft.timezone);
    draft.retry_limit = Math.max(0, Math.min(10, Number(draft.retry_limit ?? draft.retryLimit ?? 2)));
    draft.retry_interval_minutes = Math.max(1, Math.min(1440, Number(draft.retry_interval_minutes ?? draft.retryIntervalMinutes ?? 10)));
    draft.misfire_policy = ["run_once", "skip"].includes(String(draft.misfire_policy || draft.misfirePolicy)) ? String(draft.misfire_policy || draft.misfirePolicy) : "run_once";
    draft.misfire_grace_minutes = Math.max(1, Math.min(10080, Number(draft.misfire_grace_minutes ?? draft.misfireGraceMinutes ?? 1440)));
    draft.notification_enabled = draft.notification_enabled === true || draft.notificationEnabled === true;
    draft.notify_on = [...new Set((Array.isArray(draft.notify_on) ? draft.notify_on : Array.isArray(draft.notifyOn) ? draft.notifyOn : ["failed", "waiting", "done"]).map(String).filter(value => ["started", "done", "failed", "waiting", "recovered", "cancelled"].includes(value)))];
    draft.backlog_batch_limit = Math.max(1, Math.min(20, Number(draft.backlog_batch_limit || draft.backlogBatchLimit || 1)));
    draft.import_shared_docs = draft.target_type === "group" && draft.workflow_type === "daily_dev"
        ? (draft.import_shared_docs ?? draft.importSharedDocs ?? true)
        : false;
    draft.continue_gaps = draft.target_type === "group" && draft.workflow_type === "daily_dev"
        ? (draft.continue_gaps ?? draft.continueGaps ?? true)
        : false;
    draft.gap_continue_limit = draft.target_type === "group" && draft.workflow_type === "daily_dev"
        ? Math.max(1, Math.min(20, Number(draft.gap_continue_limit || draft.gapContinueLimit || 3)))
        : 0;
    if (draft.target_type === "group") {
        draft.project = "";
    }
    else {
        draft.group_id = null;
    }
    validateCronJobPayload(draft);
    draft.updated_at = new Date().toISOString();
    draft.next_run = draft.enabled ? computeNextRun(draft.schedule, new Date(), draft.timezone) : null;
    jobs[idx] = draft;
    (0, db_1.saveCronJobs)(jobs);
    return draft;
}
function deleteCronJob(id) {
    const jobs = (0, db_1.loadCronJobs)();
    const index = jobs.findIndex(j => j.id === id);
    if (index < 0)
        return null;
    const now = new Date().toISOString();
    jobs[index] = { ...jobs[index], enabled_before_archive: jobs[index].enabled !== false, enabled: false, archived: true, archived_at: now, deleted_at: now, next_run: null, updated_at: now };
    (0, db_1.saveCronJobs)(jobs);
    return jobs[index];
}
function restoreCronJob(id) {
    const jobs = (0, db_1.loadCronJobs)();
    const index = jobs.findIndex(j => j.id === id);
    if (index < 0)
        return null;
    const now = new Date().toISOString();
    const enabled = jobs[index].enabled_before_archive !== false;
    jobs[index] = { ...jobs[index], archived: false, archived_at: null, deleted_at: null, enabled, restored_at: now, updated_at: now, next_run: enabled ? computeNextRun(jobs[index].schedule, new Date(), normalizeCronTimezone(jobs[index].timezone)) : null };
    (0, db_1.saveCronJobs)(jobs);
    return jobs[index];
}
function purgeCronJob(id) {
    const jobs = (0, db_1.loadCronJobs)();
    const current = jobs.find(j => j.id === id);
    if (!current)
        return null;
    if (!current.archived && !current.deleted_at)
        throw new Error("定时任务必须先删除归档，才能永久清除");
    (0, db_1.saveCronJobs)(jobs.filter(j => j.id !== id));
    return current;
}
//# sourceMappingURL=cron-job-store.js.map