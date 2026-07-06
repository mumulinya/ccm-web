"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pad2 = pad2;
exports.minuteKey = minuteKey;
exports.validateCronExpression = validateCronExpression;
exports.matchesCron = matchesCron;
exports.computeNextRun = computeNextRun;
exports.normalizeTargetType = normalizeTargetType;
exports.normalizeCronJob = normalizeCronJob;
exports.patchCronJob = patchCronJob;
exports.validateCronJobPayload = validateCronJobPayload;
exports.createCronJob = createCronJob;
exports.updateCronJob = updateCronJob;
exports.deleteCronJob = deleteCronJob;
exports.restoreCronJob = restoreCronJob;
exports.purgeCronJob = purgeCronJob;
const db_1 = require("../../core/db");
function pad2(value) {
    return String(value).padStart(2, "0");
}
function minuteKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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
function matchesCron(expression, date) {
    const cron = parseCronExpression(expression);
    return cron.minute.has(date.getMinutes())
        && cron.hour.has(date.getHours())
        && cron.day.has(date.getDate())
        && cron.month.has(date.getMonth() + 1)
        && cron.weekday.has(date.getDay());
}
function computeNextRun(expression, from = new Date()) {
    try {
        let cursor = startOfNextMinute(from);
        const maxMinutes = 366 * 24 * 60;
        for (let i = 0; i < maxMinutes; i++) {
            if (matchesCron(expression, cursor))
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
    try {
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
        next_run: scheduleError || job.enabled === false ? null : computeNextRun(job.schedule),
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
function validateCronJobPayload(job) {
    if (!String(job.name || "").trim())
        throw new Error("请输入定时任务名称");
    if (!String(job.schedule || "").trim())
        throw new Error("请输入 Cron 表达式");
    if (!String(job.prompt || "").trim())
        throw new Error("请输入执行提示词");
    validateCronExpression(job.schedule);
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
        run_count: 0,
        next_run: job.enabled === false ? null : computeNextRun(job.schedule, now),
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
    draft.next_run = draft.enabled ? computeNextRun(draft.schedule) : null;
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
    jobs[index] = { ...jobs[index], archived: false, archived_at: null, deleted_at: null, enabled, restored_at: now, updated_at: now, next_run: enabled ? computeNextRun(jobs[index].schedule) : null };
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