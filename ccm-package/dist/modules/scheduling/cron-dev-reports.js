"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.localDateKey = localDateKey;
exports.generateAutoDevDailyReport = generateAutoDevDailyReport;
exports.upsertAutoDevDailyReport = upsertAutoDevDailyReport;
exports.generateAutoDevWeeklyReport = generateAutoDevWeeklyReport;
exports.upsertAutoDevWeeklyReport = upsertAutoDevWeeklyReport;
exports.normalizeAutoDevNotifyConfig = normalizeAutoDevNotifyConfig;
exports.saveNormalizedNotifyConfig = saveNormalizedNotifyConfig;
exports.dispatchAutoDevReport = dispatchAutoDevReport;
exports.tickAutoDevReportNotifications = tickAutoDevReportNotifications;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const collaboration_1 = require("../collaboration/collaboration");
const cron_job_store_1 = require("./cron-job-store");
function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${(0, cron_job_store_1.pad2)(date.getMonth() + 1)}-${(0, cron_job_store_1.pad2)(date.getDate())}`;
}
function parseReportDay(dateKey = localDateKey()) {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)) ? String(dateKey) : localDateKey();
    const [year, month, day] = safe.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
    return { key: safe, start, end };
}
function isInReportDay(value, day) {
    const time = Date.parse(String(value || ""));
    return Number.isFinite(time) && time >= day.start.getTime() && time < day.end.getTime();
}
function compactLine(value, fallback = "未记录", max = 180) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return (text || fallback).slice(0, max);
}
function readBacklogStatus(file) {
    const explicit = String(file?.status || "").trim().toLowerCase();
    if (explicit)
        return explicit;
    return String(String(file?.content || "").match(/^\s*-\s*状态\s*:\s*([^\n\r]+)/mi)?.[1] || "unknown").trim().toLowerCase();
}
function collectDailyDevBacklogSnapshot() {
    const groups = (0, collaboration_1.loadGroups)();
    const items = [];
    const counts = {};
    for (const group of groups) {
        const files = Array.isArray(group.shared_files) ? group.shared_files : [];
        for (const file of files) {
            const content = String(file?.content || "");
            const isBacklog = file?.category === "daily_dev_backlog" || /类型\s*:\s*daily_dev/i.test(content) || /^backlog-[\w-]+\.md$/i.test(String(file?.name || ""));
            if (!isBacklog)
                continue;
            const status = readBacklogStatus(file) || "unknown";
            counts[status] = Number(counts[status] || 0) + 1;
            items.push({
                group_id: group.id,
                group_name: group.name || group.id,
                name: file.name,
                status,
                title: compactLine(content.match(/^#\s+(.+)$/m)?.[1] || file.name, file.name, 120),
                task_id: file.task_id || null,
                updated_at: file.updated_at || file.created_at || "",
            });
        }
    }
    return { total: items.length, counts, items: items.slice(0, 50) };
}
function taskTouchesDay(task, day) {
    return [task.created_at, task.updated_at, task.started_at, task.completed_at, task.queued_at].some(value => isInReportDay(value, day));
}
function taskFileChangeCount(task) {
    return Number(task?.delivery_summary?.actual_file_change_count || task?.file_changes?.count || task?.receipt?.files_changed?.length || 0);
}
function taskVerificationCount(task) {
    const summary = task?.delivery_summary || {};
    return Number(summary.verification_executed?.length || summary.executed_verification_count || summary.verification?.length || task?.verification?.executed?.length || 0);
}
function taskChangedFiles(task) {
    const summary = task?.delivery_summary || {};
    const values = [];
    const append = (value) => {
        if (Array.isArray(value))
            value.forEach(append);
        else if (typeof value === "string")
            values.push(value);
        else if (value?.path)
            values.push(value.path);
    };
    append(summary.actual_file_changes);
    append(summary.files_changed);
    append(task?.receipt?.files_changed);
    append(task?.file_changes?.files);
    return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean))).slice(0, 30);
}
function taskVerificationLines(task) {
    const summary = task?.delivery_summary || {};
    const values = summary.verification_executed || summary.verification || task?.verification?.executed || [];
    return (Array.isArray(values) ? values : [values]).map(value => compactLine(value, "", 180)).filter(Boolean).slice(0, 10);
}
const DEV_INTENT_RE = /(开发|实现|新增|添加|修改|修复|优化|重构|联调|对接|测试|部署|发布|排查|调试|解决|改成|做成|编写|代码|接口|页面|功能|需求|bug|fix|implement|refactor|test|deploy)/i;
const NON_WORK_RE = /^(你好|您好|在吗|谢谢|你是谁|你是什么模型|介绍一下(?:这个)?项目|这个是什么项目|你当前在(?:哪|什么)个工作目录)[？?！!。\s]*$/i;
const COMPLETION_RE = /(已完成|完成了|已实现|已修复|修改完成|实现完成|测试通过|验证通过|构建通过|任务完成|filesChanged|CCM_AGENT_RECEIPT)/i;
function isDevelopmentRequest(message) {
    const content = String(message?.content || "").trim();
    if (!content || message?.role !== "user" || NON_WORK_RE.test(content))
        return false;
    return !!message?.task_id || DEV_INTENT_RE.test(content) || /📋\s*执行任务/.test(content);
}
function readJsonArray(file) {
    try {
        const value = JSON.parse(fs.readFileSync(file, "utf-8"));
        return Array.isArray(value) ? value : [];
    }
    catch {
        return [];
    }
}
function findFollowingAssistant(messages, index, day) {
    for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
        const candidate = messages[cursor];
        if (candidate?.role === "user")
            break;
        if (candidate?.role === "assistant" && isInReportDay(candidate?.timestamp, day) && !String(candidate?.content || "").startsWith("📤"))
            return candidate;
    }
    return null;
}
function collectConversationActivities(day) {
    const groups = (0, collaboration_1.loadGroups)();
    const groupNames = new Map(groups.map((group) => [String(group.id), group.name || group.id]));
    const activities = [];
    if (fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        for (const file of fs.readdirSync(utils_1.GROUP_MESSAGES_DIR).filter(name => name.endsWith(".json"))) {
            const groupId = file.replace(/\.json$/i, "");
            const messages = readJsonArray(path.join(utils_1.GROUP_MESSAGES_DIR, file));
            messages.forEach((message, index) => {
                if (!isInReportDay(message?.timestamp, day) || !isDevelopmentRequest(message))
                    return;
                const reply = findFollowingAssistant(messages, index, day);
                activities.push({
                    id: message.id || `group-${groupId}-${index}`,
                    source: message?.task_id ? "document_task" : "group_chat",
                    source_label: message?.task_id ? "文档/任务派活" : "群聊开发指令",
                    location: groupNames.get(groupId) || groupId,
                    title: compactLine(String(message.content || "").replace(/^📋\s*执行任务[：:]?\s*/i, ""), "群聊开发指令", 100),
                    timestamp: message.timestamp,
                    task_id: message.task_id || "",
                    status: reply ? (COMPLETION_RE.test(String(reply.content || "")) ? "reported_done" : "responded") : "waiting",
                    result: reply ? compactLine(reply.content, "Agent 已响应", 180) : "等待 Agent 响应",
                });
            });
        }
    }
    const sessionsDir = path.join(utils_1.CCM_DIR, "web-sessions");
    if (fs.existsSync(sessionsDir)) {
        for (const projectEntry of fs.readdirSync(sessionsDir, { withFileTypes: true })) {
            if (!projectEntry.isDirectory())
                continue;
            const projectDir = path.join(sessionsDir, projectEntry.name);
            for (const file of fs.readdirSync(projectDir).filter(name => name.endsWith(".json"))) {
                try {
                    const session = JSON.parse(fs.readFileSync(path.join(projectDir, file), "utf-8"));
                    const messages = Array.isArray(session?.history) ? session.history : [];
                    messages.forEach((message, index) => {
                        if (!isInReportDay(message?.timestamp, day) || !isDevelopmentRequest(message))
                            return;
                        const reply = findFollowingAssistant(messages, index, day);
                        activities.push({
                            id: `project-${projectEntry.name}-${session.id || file}-${index}`,
                            source: "project_chat",
                            source_label: "项目对话",
                            location: projectEntry.name,
                            title: compactLine(message.content, "项目开发指令", 100),
                            timestamp: message.timestamp,
                            task_id: message.task_id || "",
                            status: reply ? (COMPLETION_RE.test(String(reply.content || "")) ? "reported_done" : "responded") : "waiting",
                            result: reply ? compactLine(reply.content, "Agent 已响应", 180) : "等待 Agent 响应",
                        });
                    });
                }
                catch { }
            }
        }
    }
    const deduped = new Map();
    for (const activity of activities) {
        const normalizedTitle = String(activity.title || "").toLowerCase().replace(/\s+/g, " ").slice(0, 160);
        const key = activity.task_id
            ? `task:${activity.task_id}`
            : `${activity.source}:${activity.location}:${normalizedTitle}`;
        const existing = deduped.get(key);
        if (!existing || Date.parse(activity.timestamp || "") < Date.parse(existing.timestamp || "")) {
            deduped.set(key, activity);
        }
    }
    return Array.from(deduped.values()).sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""));
}
function formatActivityMarkdown(item) {
    const lines = [`- [${item.source_label} · ${item.location}] ${item.title}（${item.status_label}）`];
    if (item.files_changed?.length)
        lines.push(`  - 代码修改：${item.files_changed.join("、")}`);
    if (item.verifications?.length)
        lines.push(`  - 验证：${item.verifications.join("；")}`);
    if (item.linked_task && !item.files_changed?.length)
        lines.push("  - 代码修改：尚无可核验的文件变更记录");
    return lines;
}
function buildAutoDevReportMarkdown(report) {
    const lines = [
        `# 自动开发日报 ${report.date}`,
        "",
        "## 今日概览",
        `- 全天开发活动：${report.summary.total_activities}`,
        `- 文档/任务派活：${report.summary.document_requests}`,
        `- 群聊开发指令：${report.summary.group_chat_requests}`,
        `- 项目开发对话：${report.summary.project_chat_requests}`,
        `- 新增/更新开发任务：${report.summary.touched_tasks}`,
        `- 完成任务：${report.summary.done_tasks}`,
        `- 执行中任务：${report.summary.running_tasks}`,
        `- 阻塞/失败任务：${report.summary.blocked_tasks + report.summary.failed_tasks}`,
        `- 代码变更证据：${report.summary.file_changes} 个文件/条目`,
        `- 验证记录：${report.summary.verifications} 项`,
        "",
        "## 今日做了什么",
        ...(report.activities.length ? report.activities.flatMap(formatActivityMarkdown) : ["- 暂无可识别的开发活动"]),
        "",
        "## 定时接活",
        `- 启用的日常开发定时任务：${report.summary.enabled_daily_dev_jobs}`,
        `- 今日触发定时任务：${report.summary.cron_runs_today}`,
        `- 需求池：ready ${report.backlog.counts.ready || 0}，needs_user ${report.backlog.counts.needs_user || 0}，blocked ${report.backlog.counts.blocked || 0}，done ${report.backlog.counts.done || 0}`,
        "",
        "## 已完成",
        ...(report.completed.length ? report.completed.map((task) => `- ${task.title}：${task.result}`) : ["- 暂无完成任务"]),
        "",
        "## 阻塞与风险",
        ...(report.blockers.length ? report.blockers.map((item) => `- ${item.title}：${item.reason}`) : ["- 暂无明确阻塞"]),
        "",
        "## 明日建议",
        ...(report.tomorrow.length ? report.tomorrow.map((item) => `- ${item}`) : ["- 继续等待新需求或共享文档进入需求池"]),
    ];
    return lines.join("\n");
}
function generateAutoDevDailyReport(dateKey = localDateKey()) {
    const day = parseReportDay(dateKey);
    const tasks = (0, db_1.loadTasks)();
    const touched = tasks.filter((task) => taskTouchesDay(task, day));
    const conversationActivities = collectConversationActivities(day);
    const taskById = new Map(touched.map((task) => [String(task.id || ""), task]));
    const activities = conversationActivities.map((item) => {
        const linkedTask = item.task_id ? taskById.get(String(item.task_id)) : null;
        const status = String(linkedTask?.status || item.status || "waiting");
        return {
            ...item,
            linked_task: !!linkedTask,
            task_status: linkedTask?.status || "",
            status_label: status === "done" || status === "reported_done" ? "已完成" : status === "failed" ? "失败" : status === "blocked" || status === "waiting" ? "等待/阻塞" : status === "in_progress" ? "执行中" : "Agent 已响应",
            files_changed: linkedTask ? taskChangedFiles(linkedTask) : [],
            verifications: linkedTask ? taskVerificationLines(linkedTask) : [],
        };
    }).slice(0, 80);
    const jobs = (0, db_1.loadCronJobs)().map(cron_job_store_1.normalizeCronJob);
    const dailyDevJobs = jobs.filter((job) => job.workflow_type === "daily_dev");
    const cronRunsToday = dailyDevJobs.filter((job) => isInReportDay(job.last_run, day));
    const backlog = collectDailyDevBacklogSnapshot();
    const completed = touched.filter((task) => task.status === "done").slice(0, 20).map((task) => ({
        id: task.id,
        title: task.title,
        result: compactLine(task.delivery_summary?.headline || task.final_report || task.result, "已完成", 220),
        file_changes: taskFileChangeCount(task),
        verifications: taskVerificationCount(task),
        files_changed: taskChangedFiles(task),
    }));
    const blockers = touched.filter((task) => ["failed", "blocked", "waiting"].includes(String(task.status || "")) || task.status_detail || task.delivery_summary?.blockers?.length || task.delivery_summary?.needs?.length)
        .slice(0, 20)
        .map((task) => ({
        id: task.id,
        title: task.title,
        reason: compactLine(task.status_detail || task.delivery_summary?.blockers?.[0] || task.delivery_summary?.needs?.[0] || task.result, "等待处理", 220),
    }));
    const running = tasks.filter((task) => ["pending", "in_progress"].includes(String(task.status || ""))).slice(0, 20).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        updated_at: task.updated_at || task.started_at || task.created_at || "",
    }));
    const summary = {
        total_activities: touched.length + activities.filter((item) => !item.linked_task).length,
        conversation_requests: activities.length,
        document_requests: activities.filter((item) => item.source === "document_task").length,
        group_chat_requests: activities.filter((item) => item.source === "group_chat").length,
        project_chat_requests: activities.filter((item) => item.source === "project_chat").length,
        touched_tasks: touched.length,
        done_tasks: touched.filter((task) => task.status === "done").length,
        running_tasks: tasks.filter((task) => ["pending", "in_progress"].includes(String(task.status || ""))).length,
        failed_tasks: touched.filter((task) => task.status === "failed").length,
        blocked_tasks: blockers.length,
        file_changes: touched.reduce((sum, task) => sum + taskFileChangeCount(task), 0),
        verifications: touched.reduce((sum, task) => sum + taskVerificationCount(task), 0),
        enabled_daily_dev_jobs: dailyDevJobs.filter((job) => job.enabled !== false).length,
        cron_runs_today: cronRunsToday.length,
    };
    const tomorrow = [
        Number(backlog.counts.ready || 0) > 0 ? `继续自动认领 ${backlog.counts.ready} 条可接活需求` : "保持共享文档扫描，等待新的 ready 需求",
        blockers.length > 0 ? `优先处理 ${blockers.length} 个阻塞/失败任务` : "保持自动复盘，发现缺口后自动续跑",
        summary.enabled_daily_dev_jobs > 0 ? "确认定时接活任务按计划运行并查看下一份日报" : "创建并启用日常开发定时任务",
    ];
    const report = {
        id: day.key,
        date: day.key,
        generated_at: new Date().toISOString(),
        summary,
        backlog,
        cron_jobs: dailyDevJobs.map((job) => ({
            id: job.id,
            name: job.name,
            enabled: job.enabled !== false,
            schedule: job.schedule,
            next_run: job.next_run,
            last_run: job.last_run,
            last_status: job.last_status || "never",
            last_result: job.last_result || "",
            target_group: job.group_id || "",
            backlog_batch_limit: job.backlog_batch_limit || 1,
            import_shared_docs: job.import_shared_docs !== false,
            continue_gaps: job.continue_gaps !== false,
        })),
        cron_runs_today: cronRunsToday.map((job) => ({ id: job.id, name: job.name, last_run: job.last_run, status: job.last_status, result: job.last_result })),
        activities,
        completed,
        blockers,
        running,
        tomorrow,
    };
    report.markdown = buildAutoDevReportMarkdown(report);
    return report;
}
function upsertAutoDevDailyReport(dateKey = localDateKey()) {
    const report = generateAutoDevDailyReport(dateKey);
    const reports = (0, db_1.loadDevReports)().filter((item) => item.date !== report.date && item.id !== report.id);
    reports.unshift(report);
    (0, db_1.saveDevReports)(reports.slice(0, 120));
    return report;
}
function dateKeyFromDate(date) {
    return `${date.getFullYear()}-${(0, cron_job_store_1.pad2)(date.getMonth() + 1)}-${(0, cron_job_store_1.pad2)(date.getDate())}`;
}
function addLocalDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function reportWeekRange(dateKey = localDateKey()) {
    const day = parseReportDay(dateKey);
    const weekday = day.start.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const start = addLocalDays(day.start, mondayOffset);
    const end = addLocalDays(start, 6);
    return { id: `week-${dateKeyFromDate(start)}`, start, end, start_key: dateKeyFromDate(start), end_key: dateKeyFromDate(end) };
}
function uniqueBy(items, keyOf) {
    const result = [];
    const seen = new Set();
    for (const item of items) {
        const key = keyOf(item);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        result.push(item);
    }
    return result;
}
function buildWeeklyReportMarkdown(report) {
    const lines = [
        `# 开发周报 ${report.start_date} 至 ${report.end_date}`,
        "",
        "## 本周概览",
        `- 业务/开发活动：${report.summary.total_activities}`,
        `- 完成任务：${report.summary.done_tasks}`,
        `- 代码变更：${report.summary.file_changes} 个文件/条目`,
        `- 验证记录：${report.summary.verifications} 项`,
        `- 阻塞/失败：${report.summary.blocked_tasks}`,
        "",
        "## 本周完成",
        ...(report.completed.length ? report.completed.map((item) => `- ${item.title}${item.files_changed?.length ? `\n  - 修改：${item.files_changed.join("、")}` : ""}`) : ["- 暂无完成任务"]),
        "",
        "## 主要代码变更",
        ...(report.changed_files.length ? report.changed_files.map((file) => `- ${file}`) : ["- 暂无可核验的文件变更"]),
        "",
        "## 风险与未完成",
        ...(report.blockers.length ? report.blockers.map((item) => `- ${item.title}：${item.reason}`) : ["- 暂无明确阻塞"]),
        "",
        "## 下周计划",
        ...(report.next_week.length ? report.next_week.map((item) => `- ${item}`) : ["- 继续处理需求池中的 ready 需求"]),
    ];
    return lines.join("\n");
}
function generateAutoDevWeeklyReport(dateKey = localDateKey()) {
    const range = reportWeekRange(dateKey);
    const days = Array.from({ length: 7 }, (_, index) => generateAutoDevDailyReport(dateKeyFromDate(addLocalDays(range.start, index))));
    const weekSpan = { start: range.start, end: addLocalDays(range.end, 1) };
    const touchedTasks = (0, db_1.loadTasks)().filter((task) => taskTouchesDay(task, weekSpan));
    const completed = uniqueBy(days.flatMap(day => day.completed || []), (item) => String(item.id || item.title || "")).slice(0, 60);
    const blockers = uniqueBy(days.flatMap(day => day.blockers || []), (item) => String(item.id || item.title || "")).slice(0, 40);
    const activities = uniqueBy(days.flatMap(day => day.activities || []), (item) => String(item.task_id || item.id || `${item.source}:${item.title}`)).slice(0, 150);
    const changedFiles = Array.from(new Set([
        ...completed.flatMap((item) => item.files_changed || []),
        ...activities.flatMap((item) => item.files_changed || []),
    ].map(value => String(value || "").trim()).filter(Boolean))).slice(0, 120);
    const summary = {
        total_activities: touchedTasks.length + activities.filter((item) => !item.linked_task).length,
        done_tasks: touchedTasks.filter((task) => task.status === "done").length,
        file_changes: touchedTasks.reduce((sum, task) => sum + taskFileChangeCount(task), 0),
        verifications: touchedTasks.reduce((sum, task) => sum + taskVerificationCount(task), 0),
        blocked_tasks: blockers.length,
        active_days: days.filter(day => Number(day.summary?.total_activities || 0) > 0).length,
    };
    const report = {
        id: range.id,
        type: "weekly",
        start_date: range.start_key,
        end_date: range.end_key,
        generated_at: new Date().toISOString(),
        summary,
        completed,
        blockers,
        activities,
        changed_files: changedFiles,
        daily_reports: days.map(day => ({ date: day.date, summary: day.summary })),
        next_week: [
            blockers.length ? `优先解决 ${blockers.length} 个阻塞或失败事项` : "保持任务验收和自动复盘",
            "继续认领 ready 需求并记录业务到代码的完整证据",
            "复查本周未形成文件变更或验证证据的开发活动",
        ],
    };
    report.markdown = buildWeeklyReportMarkdown(report);
    return report;
}
function upsertAutoDevWeeklyReport(dateKey = localDateKey()) {
    const report = generateAutoDevWeeklyReport(dateKey);
    const reports = (0, db_1.loadDevWeeklyReports)().filter((item) => item.id !== report.id);
    reports.unshift(report);
    (0, db_1.saveDevWeeklyReports)(reports.slice(0, 80));
    return report;
}
function normalizeClock(value, fallback) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match)
        return fallback;
    return `${(0, cron_job_store_1.pad2)(Math.max(0, Math.min(23, Number(match[1]))))}:${(0, cron_job_store_1.pad2)(Math.max(0, Math.min(59, Number(match[2]))))}`;
}
function normalizeAutoDevNotifyConfig(input = {}) {
    return {
        daily_enabled: input.daily_enabled === true,
        daily_time: normalizeClock(input.daily_time, "18:30"),
        weekly_enabled: input.weekly_enabled === true,
        weekly_day: Math.max(0, Math.min(6, Number(input.weekly_day ?? 5))),
        weekly_time: normalizeClock(input.weekly_time, "18:40"),
        target_type: "user",
        target_id: "",
        retry_limit: Math.max(1, Math.min(10, Number(input.retry_limit || 3))),
        retry_interval_minutes: Math.max(1, Math.min(120, Number(input.retry_interval_minutes || 10))),
        last_daily_sent_key: input.last_daily_sent_key || "",
        last_weekly_sent_key: input.last_weekly_sent_key || "",
        daily_attempt_key: input.daily_attempt_key || "",
        weekly_attempt_key: input.weekly_attempt_key || "",
        daily_retry_count: Number(input.daily_retry_count || 0),
        weekly_retry_count: Number(input.weekly_retry_count || 0),
        last_daily_attempt_at: input.last_daily_attempt_at || "",
        last_weekly_attempt_at: input.last_weekly_attempt_at || "",
        last_daily_status: input.last_daily_status || "never",
        last_weekly_status: input.last_weekly_status || "never",
        last_daily_result: input.last_daily_result || "",
        last_weekly_result: input.last_weekly_result || "",
        history: Array.isArray(input.history) ? input.history.slice(-80) : [],
        updated_at: input.updated_at || "",
    };
}
function saveNormalizedNotifyConfig(config) {
    const normalized = { ...normalizeAutoDevNotifyConfig(config), updated_at: new Date().toISOString() };
    (0, db_1.saveAutoDevNotifyConfig)(normalized);
    return normalized;
}
async function dispatchAutoDevReport(kind, options = {}) {
    let config = normalizeAutoDevNotifyConfig((0, db_1.loadAutoDevNotifyConfig)());
    const dateKey = String(options.date || localDateKey());
    const report = kind === "weekly" ? upsertAutoDevWeeklyReport(dateKey) : upsertAutoDevDailyReport(dateKey);
    const targetType = "webhook";
    const targetId = "";
    const title = kind === "weekly" ? `开发周报 ${report.start_date} 至 ${report.end_date}` : `开发日报 ${report.date}`;
    const result = await (0, collaboration_1.sendFeishuReportMessage)({ title, markdown: report.markdown });
    const now = new Date().toISOString();
    const key = kind === "weekly" ? report.id : report.date;
    const prefix = kind === "weekly" ? "weekly" : "daily";
    const retryKey = `${prefix}_retry_count`;
    const previousAttemptKey = config[`${prefix}_attempt_key`];
    const retryCount = previousAttemptKey === key ? Number(config[retryKey] || 0) + (result.success ? 0 : 1) : (result.success ? 0 : 1);
    const historyItem = { id: `${kind}-${Date.now()}`, kind, report_id: report.id, attempted_at: now, success: !!result.success, target_type: targetType, target_id: result.target_id || targetId, message_id: result.message_id || "", result: result.success ? "发送成功" : result.error || "发送失败" };
    config = saveNormalizedNotifyConfig({
        ...config,
        [`${prefix}_attempt_key`]: key,
        [retryKey]: result.success ? 0 : retryCount,
        [`last_${prefix}_attempt_at`]: now,
        [`last_${prefix}_status`]: result.success ? "sent" : "failed",
        [`last_${prefix}_result`]: historyItem.result,
        ...(result.success ? { [`last_${prefix}_sent_key`]: key } : {}),
        history: [...config.history, historyItem],
    });
    return { ...result, kind, report, config, history: historyItem };
}
let reportNotificationRunning = false;
function clockReached(now, clock) {
    const [hour, minute] = normalizeClock(clock, "18:30").split(":").map(Number);
    return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}
function retryReady(lastAttempt, intervalMinutes, now) {
    const time = Date.parse(String(lastAttempt || ""));
    return !Number.isFinite(time) || now.getTime() - time >= intervalMinutes * 60 * 1000;
}
async function tickAutoDevReportNotifications(now = new Date()) {
    if (reportNotificationRunning)
        return;
    const config = normalizeAutoDevNotifyConfig((0, db_1.loadAutoDevNotifyConfig)());
    const today = localDateKey(now);
    const week = reportWeekRange(today);
    const jobs = [];
    const dailyRetries = config.daily_attempt_key === today ? config.daily_retry_count : 0;
    const weeklyRetries = config.weekly_attempt_key === week.id ? config.weekly_retry_count : 0;
    const dailyRetryReady = config.daily_attempt_key !== today || retryReady(config.last_daily_attempt_at, config.retry_interval_minutes, now);
    const weeklyRetryReady = config.weekly_attempt_key !== week.id || retryReady(config.last_weekly_attempt_at, config.retry_interval_minutes, now);
    if (config.daily_enabled && config.last_daily_sent_key !== today && clockReached(now, config.daily_time)
        && dailyRetries < config.retry_limit && dailyRetryReady)
        jobs.push("daily");
    if (config.weekly_enabled && now.getDay() === config.weekly_day && config.last_weekly_sent_key !== week.id && clockReached(now, config.weekly_time)
        && weeklyRetries < config.retry_limit && weeklyRetryReady)
        jobs.push("weekly");
    if (!jobs.length)
        return;
    reportNotificationRunning = true;
    try {
        for (const kind of jobs)
            await dispatchAutoDevReport(kind, { date: today });
    }
    finally {
        reportNotificationRunning = false;
    }
}
//# sourceMappingURL=cron-dev-reports.js.map