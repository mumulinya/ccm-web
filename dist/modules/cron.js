"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCronDailyDevProtocolSelfTest = runCronDailyDevProtocolSelfTest;
exports.syncCronTaskStatus = syncCronTaskStatus;
exports.startCronScheduler = startCronScheduler;
exports.stopCronScheduler = stopCronScheduler;
exports.handleCronApi = handleCronApi;
const utils_1 = require("../utils");
const db_1 = require("../db");
const collaboration_1 = require("./collaboration");
const runningCronJobs = new Set();
let schedulerTimer = null;
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
    const jobs = (0, db_1.loadCronJobs)().filter(j => j.id !== id);
    (0, db_1.saveCronJobs)(jobs);
}
function buildTaskFromCronJob(job, trigger) {
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
    const cronMeta = {
        workflow_type: workflowType,
        imported_shared_docs: null,
        claimed_backlogs: [],
    };
    const buildBacklogTask = (backlog, batchIndex = 0, batchTotal = 1) => {
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
            const importResult = (0, collaboration_1.importSharedDocsToDailyDevBacklog)({
                group_id: job.group_id,
                limit: Math.max(1, Math.min(20, Number(job.import_shared_docs_limit || job.importSharedDocsLimit || job.backlog_batch_limit || job.backlogBatchLimit || 1))),
                priority: job.priority || "normal",
                requires_code_changes: requiresCodeChanges,
                source: "cron",
            });
            cronMeta.imported_shared_docs = {
                imported: importResult.imported || 0,
                skipped: importResult.skipped || 0,
                items: (importResult.items || []).map((item) => ({
                    source: item.source,
                    backlog: item.backlog,
                    title: item.title,
                })),
            };
        }
        const batchLimit = Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1)));
        const claimed = [];
        for (let i = 0; i < batchLimit; i++) {
            const backlog = (0, collaboration_1.claimReadyDailyDevBacklog)(job.group_id, { source: "cron", cron_job_id: job.id, trigger });
            if (!backlog)
                break;
            claimed.push(backlog);
        }
        if (claimed.length > 0) {
            const total = claimed.length;
            cronMeta.claimed_backlogs = claimed.map((backlog) => ({
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
function runCronDailyDevProtocolSelfTest() {
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
function formatCronMetaSummary(meta = {}) {
    const imported = meta?.imported_shared_docs;
    const continued = meta?.continued_gap_tasks;
    const parts = [];
    if (continued)
        parts.push(`续跑缺口任务 ${Number(continued.continued || 0)} 个`);
    if (imported)
        parts.push(`导入共享文档 ${Number(imported.imported || 0)} 个`);
    if (Array.isArray(meta?.claimed_backlogs))
        parts.push(`认领需求 ${meta.claimed_backlogs.length} 条`);
    return parts.length ? `；${parts.join("，")}` : "";
}
function syncCronTaskStatus(task, status, result = "") {
    const cronJobId = task?.cron_job_id;
    if (!cronJobId)
        return;
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === cronJobId);
    if (!job)
        return;
    const resultText = String(result || task.result || "").trim();
    const patch = {
        last_task_id: task.id || job.last_task_id || null,
        next_run: job.enabled === false ? null : computeNextRun(job.schedule),
    };
    if (status === "in_progress") {
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
        (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, backlogStatus, {
            task_id: task.id,
            result: resultText || patch.last_result || status,
        });
    }
}
async function runCronJob(id, ctx, trigger) {
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === id);
    if (!job)
        throw new Error("定时任务不存在");
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
    let taskDraft = null;
    let taskDrafts = [];
    let cronMeta = {};
    let gapContinueResult = null;
    try {
        validateCronJobPayload(job);
        const targetType = normalizeTargetType(job);
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
        taskDraft = buildTaskFromCronJob(job, trigger);
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
        const updated = patchCronJob(id, {
            last_status: "failed",
            last_result: e.message,
            last_run_meta: cronMeta,
            run_count: Number(job.run_count || 0) + 1,
            next_run: nextRun,
        });
        return { success: false, error: e.message, job: updated };
    }
    finally {
        runningCronJobs.delete(id);
    }
}
async function tickCronScheduler(ctx) {
    const now = new Date();
    const key = minuteKey(now);
    const jobs = (0, db_1.loadCronJobs)();
    for (const rawJob of jobs) {
        const job = normalizeCronJob(rawJob);
        if (!job.enabled)
            continue;
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
        if (job.last_run_key === key || runningCronJobs.has(job.id))
            continue;
        if (!matchesCron(job.schedule, now))
            continue;
        runCronJob(job.id, ctx, "schedule")
            .then(result => {
            if (!result.success)
                console.error("[Cron]", job.name, result.error || result.message);
        })
            .catch((e) => console.error("[Cron]", job.name, e.message));
    }
}
function startCronScheduler(ctx) {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    const tick = () => tickCronScheduler(ctx).catch((e) => console.error("[Cron]", e.message));
    tick();
    schedulerTimer = setInterval(tick, 30 * 1000);
    console.log("[Cron] 定时任务调度器已启动");
}
function stopCronScheduler() {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    schedulerTimer = null;
}
function schedulerStatus() {
    return {
        running: !!schedulerTimer,
        interval_ms: 30 * 1000,
        running_job_ids: Array.from(runningCronJobs),
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
        (0, utils_1.sendJson)(res, { jobs: (0, db_1.loadCronJobs)().map(normalizeCronJob), scheduler: schedulerStatus() });
        return true;
    }
    if (pathname === "/api/cron/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, schedulerStatus());
        return true;
    }
    if (pathname === "/api/cron/create" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const job = createCronJob(payload);
                (0, utils_1.sendJson)(res, { success: true, job: normalizeCronJob(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/update" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const { id, ...updates } = payload;
                const job = updateCronJob(id, updates);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: normalizeCronJob(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/delete" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                deleteCronJob(payload.id);
                (0, utils_1.sendJson)(res, { success: true });
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
    return false;
}
//# sourceMappingURL=cron.js.map