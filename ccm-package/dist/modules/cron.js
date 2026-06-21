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
exports.generateAutoDevDailyReport = generateAutoDevDailyReport;
exports.upsertAutoDevDailyReport = upsertAutoDevDailyReport;
exports.generateAutoDevWeeklyReport = generateAutoDevWeeklyReport;
exports.upsertAutoDevWeeklyReport = upsertAutoDevWeeklyReport;
exports.runCronDailyDevProtocolSelfTest = runCronDailyDevProtocolSelfTest;
exports.syncCronTaskStatus = syncCronTaskStatus;
exports.startCronScheduler = startCronScheduler;
exports.stopCronScheduler = stopCronScheduler;
exports.handleCronApi = handleCronApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const db_1 = require("../db");
const collaboration_1 = require("./collaboration");
const runningCronJobs = new Set();
let schedulerTimer = null;
function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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
    const jobs = (0, db_1.loadCronJobs)().map(normalizeCronJob);
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
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
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
    return `${pad2(Math.max(0, Math.min(23, Number(match[1]))))}:${pad2(Math.max(0, Math.min(59, Number(match[2]))))}`;
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
        try {
            upsertAutoDevDailyReport(localDateKey());
        }
        catch (reportError) {
            console.error("[Cron] 生成开发日报失败", reportError?.message || reportError);
        }
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
    await tickAutoDevReportNotifications(now);
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
    if (pathname === "/api/auto-dev/overview" && req.method === "GET") {
        const today = String(parsed.query.date || localDateKey());
        const report = upsertAutoDevDailyReport(today);
        const reports = (0, db_1.loadDevReports)().slice(0, 30);
        const jobs = (0, db_1.loadCronJobs)().map(normalizeCronJob).filter((job) => job.workflow_type === "daily_dev");
        (0, utils_1.sendJson)(res, {
            success: true,
            scheduler: schedulerStatus(),
            today: report,
            reports,
            weekly_reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20),
            notification: normalizeAutoDevNotifyConfig((0, db_1.loadAutoDevNotifyConfig)()),
            daily_dev_jobs: jobs,
            backlog: report.backlog,
        });
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
                const report = upsertAutoDevWeeklyReport(payload.date || localDateKey());
                (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: normalizeAutoDevNotifyConfig((0, db_1.loadAutoDevNotifyConfig)()) });
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = normalizeAutoDevNotifyConfig((0, db_1.loadAutoDevNotifyConfig)());
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
            dispatchAutoDevReport(kind, { date: payload.date || localDateKey() })
                .then(result => (0, utils_1.sendJson)(res, result, result.success ? 200 : 400))
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const report = upsertAutoDevDailyReport(payload.date || localDateKey());
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
//# sourceMappingURL=cron.js.map