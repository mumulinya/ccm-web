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
exports.projectTaskWorkEvents = projectTaskWorkEvents;
exports.projectConversationWorkEvents = projectConversationWorkEvents;
exports.projectTestAgentWorkEvents = projectTestAgentWorkEvents;
exports.collectProjectedWorkEvents = collectProjectedWorkEvents;
exports.readWorkJournalEvents = readWorkJournalEvents;
exports.mergeWorkJournalEvents = mergeWorkJournalEvents;
exports.syncWorkJournal = syncWorkJournal;
exports.localWorkDateKey = localWorkDateKey;
exports.parseWorkDay = parseWorkDay;
exports.generateEvidenceDailyReport = generateEvidenceDailyReport;
exports.workWeekRange = workWeekRange;
exports.generateEvidenceWeeklyReport = generateEvidenceWeeklyReport;
exports.listWorkJournalEvents = listWorkJournalEvents;
exports.getWorkJournalAudit = getWorkJournalAudit;
exports.runWorkJournalSelfTest = runWorkJournalSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const storage_1 = require("../collaboration/storage");
const WORK_JOURNAL_FILE = path.join(utils_1.CCM_DIR, "work-journal.jsonl");
const GLOBAL_AGENT_HISTORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-history.json");
const PROJECT_SESSIONS_DIR = path.join(utils_1.CCM_DIR, "web-sessions");
const TEST_AGENT_RUNS_DIR = path.join(utils_1.CCM_DIR, "test-agent-runs");
const WORK_EVENT_SCHEMA = "ccm-work-journal-event-v1";
const REPORT_SCHEMA = "ccm-evidence-work-report-v2";
const WORK_INTENT_RE = /(开发|实现|新增|添加|修改|修复|优化|重构|联调|对接|测试|部署|发布|排查|调试|解决|改成|做成|编写|代码审查|创建.{0,8}任务|业务需求|接口需求|页面需求|bug|fix|implement|refactor|deploy)/i;
const NON_WORK_RE = /^(你好|您好|在吗|谢谢|你是谁|你是什么模型|什么模型|介绍一下(?:这个)?项目|这个是什么项目|你当前在(?:哪|什么)个工作目录|今天天气怎么样)[？?！!。\s]*$/i;
const COMPLETION_RE = /(已完成|完成了|已实现|已修复|修改完成|实现完成|测试通过|验证通过|构建通过|验收通过|任务完成)/i;
const REPORTABLE_TIMELINE_TYPES = new Set([
    "global_mission_plan",
    "project_mission_intake",
    "queued_group_task",
    "coordinator_plan",
    "dispatch",
    "child_agent_start",
    "child_agent_receipt",
    "child_agent_rework",
    "child_agent_failed",
    "coordinator_review",
    "acceptance_gate",
    "agent_qa_question",
    "agent_qa_waiting",
    "agent_qa_accepted",
    "agent_qa_resume",
    "requirement_sources_ingested",
    "direct_task",
    "task_rollback",
]);
function hash(value, length = 20) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}
function validIso(value) {
    const time = Date.parse(String(value || ""));
    return Number.isFinite(time) ? new Date(time).toISOString() : "";
}
function compact(value, fallback = "", max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return (text || fallback).slice(0, max);
}
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function uniqueStrings(values, limit = 120) {
    return Array.from(new Set(values.flatMap(value => Array.isArray(value) ? value : [value])
        .map(value => typeof value === "string" ? value.trim() : value?.path ? String(value.path).trim() : "")
        .filter(Boolean))).slice(0, limit);
}
function event(input) {
    const at = validIso(input.at);
    if (!at || !input.id)
        return null;
    return {
        schema: WORK_EVENT_SCHEMA,
        id: String(input.id),
        at,
        type: String(input.type || "activity"),
        state: String(input.state || "recorded"),
        actor_type: input.actor_type || "system",
        actor_label: compact(input.actor_label, input.actor_type === "user" ? "你" : input.actor_type === "test_agent" ? "TestAgent" : input.actor_type === "agent" ? "Agent" : "系统", 80),
        source: String(input.source || "system"),
        source_label: compact(input.source_label, "系统记录", 80),
        title: compact(input.title, "工作记录", 180),
        detail: compact(input.detail, "", 360),
        task_id: String(input.task_id || ""),
        group_id: String(input.group_id || ""),
        project: String(input.project || ""),
        work_id: String(input.work_id || input.task_id || input.id),
        evidence_level: input.evidence_level === "medium" ? "medium" : "strong",
        evidence_ref: compact(input.evidence_ref, input.id, 260),
        metadata: input.metadata || {},
    };
}
function isWorkRequest(message) {
    const content = compact(message?.content, "", 4000);
    if (!content || message?.role !== "user" || NON_WORK_RE.test(content))
        return false;
    return !!(message?.task_id || message?.taskId || message?.mission_id || message?.attachments?.length || message?.files?.length || WORK_INTENT_RE.test(content));
}
function sourceFromMessage(message, fallback) {
    const raw = String(message?.source_channel || message?.sourceChannel || message?.channel || message?.source || message?.origin || message?.metadata?.source || fallback).toLowerCase();
    return raw.includes("feishu") ? "feishu" : fallback;
}
function sourceLabel(source) {
    return {
        feishu: "飞书任务会话",
        global_chat: "全局助手",
        group_chat: "群聊协作",
        project_chat: "项目对话",
        workbench: "工作台任务",
        task_timeline: "任务时间线",
        delivery: "交付证据",
        test_agent: "TestAgent 验收",
        automation: "自动开发",
    }[source] || "系统记录";
}
function taskFiles(task) {
    const summary = task?.delivery_summary || {};
    return uniqueStrings([
        summary.actual_file_changes,
        summary.files_changed,
        task?.receipt?.files_changed,
        task?.file_changes?.files,
    ]);
}
function verificationLines(task) {
    const summary = task?.delivery_summary || {};
    const values = summary.verification_executed || summary.verification || task?.verification?.executed || task?.receipt?.verification || [];
    return uniqueStrings(Array.isArray(values) ? values : [values], 40).map(value => compact(value, "", 220)).filter(Boolean);
}
function actorForTimeline(item) {
    const agent = String(item?.agent || "").trim();
    if (/test.?agent/i.test(agent) || /independent.?review/i.test(String(item?.type || "")))
        return { type: "test_agent", label: "TestAgent" };
    if (agent)
        return { type: "agent", label: agent };
    if (/coordinator|child_agent|dispatch|review|mission_plan/i.test(String(item?.type || "")))
        return { type: "agent", label: /coordinator/i.test(String(item?.type || "")) ? "群聊主 Agent" : "项目子 Agent" };
    return { type: "system", label: "系统" };
}
function timelineState(item) {
    const type = String(item?.type || "");
    const status = String(item?.status || "").toLowerCase();
    if (type === "acceptance_gate" && ["ok", "completed", "passed"].includes(status))
        return "verified";
    if (/failed/.test(type) || ["fail", "failed", "error"].includes(status))
        return "failed";
    if (/rework|waiting|rollback/.test(type) || ["warn", "warning", "blocked", "waiting"].includes(status))
        return "blocked";
    if (/receipt|accepted/.test(type) && ["ok", "completed", "passed"].includes(status))
        return "progress";
    return "progress";
}
function projectTaskWorkEvents(tasks = (0, db_1.loadTasks)()) {
    const projected = [];
    for (const task of tasks) {
        const taskId = String(task?.id || "");
        if (!taskId)
            continue;
        const project = String(task.target_project || task.project || "");
        const groupId = String(task.group_id || "");
        const fromWorkbench = task.workflow_meta?.source === "workbench" || !!task.intake_state || !!task.intake_draft;
        const automated = !fromWorkbench && !!(task.cron_job_id || task.cron_trigger || task.workflow_type === "daily_dev");
        const baseSource = fromWorkbench ? "workbench" : automated ? "automation" : "task_timeline";
        const created = event({
            id: `task:${taskId}:created`,
            at: task.created_at,
            type: "task_created",
            state: "pending",
            actor_type: fromWorkbench ? "user" : "system",
            actor_label: fromWorkbench ? "你" : automated ? "自动开发" : "主 Agent",
            source: baseSource,
            source_label: sourceLabel(baseSource),
            title: task.title,
            detail: task.business_goal || task.description,
            task_id: taskId,
            group_id: groupId,
            project,
            work_id: taskId,
            evidence_ref: `tasks.json#${taskId}:created_at`,
            metadata: { priority: task.priority || "", workflow_type: task.workflow_type || "", automated, from_workbench: fromWorkbench },
        });
        if (created)
            projected.push(created);
        for (const [kind, at, state, label] of [
            ["task_queued", task.queued_at, "queued", "任务已进入执行队列"],
            ["task_started", task.started_at, "in_progress", "任务开始执行"],
        ]) {
            const item = event({
                id: `task:${taskId}:${kind}`,
                at,
                type: kind,
                state,
                actor_type: "system",
                actor_label: "系统",
                source: baseSource,
                source_label: sourceLabel(baseSource),
                title: task.title,
                detail: label,
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:${kind}`,
            });
            if (item)
                projected.push(item);
        }
        for (const timeline of Array.isArray(task.workflow_timeline) ? task.workflow_timeline : []) {
            const at = timeline.at || timeline.timestamp;
            const actor = actorForTimeline(timeline);
            const item = event({
                id: `task:${taskId}:timeline:${timeline.id || hash(`${at}|${timeline.type}|${timeline.title}`)}`,
                at,
                type: REPORTABLE_TIMELINE_TYPES.has(String(timeline.type || "")) ? String(timeline.type) : "technical_progress",
                state: timelineState(timeline),
                actor_type: actor.type,
                actor_label: actor.label,
                source: "task_timeline",
                source_label: sourceLabel("task_timeline"),
                title: timeline.title || task.title,
                detail: timeline.detail,
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:workflow_timeline:${timeline.id || "event"}`,
                metadata: { phase: timeline.phase || "", original_type: timeline.type || "", reportable: REPORTABLE_TIMELINE_TYPES.has(String(timeline.type || "")) },
            });
            if (item)
                projected.push(item);
        }
        const deliveryAt = task.completed_at || task.delivery_summary?.generated_at || (task.status === "done" ? task.updated_at : "");
        if (task.status === "done" || task.delivery_summary?.acceptance_gate_passed === true) {
            const completed = event({
                id: `task:${taskId}:completed:${hash(deliveryAt || task.updated_at, 12)}`,
                at: deliveryAt || task.updated_at,
                type: "task_completed",
                state: "done",
                actor_type: "agent",
                actor_label: task.delivery_summary?.global_mission ? "全局 Agent" : "群聊主 Agent",
                source: "delivery",
                source_label: sourceLabel("delivery"),
                title: task.title,
                detail: task.delivery_summary?.headline || task.final_report || task.result || "任务已完成",
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:delivery_summary`,
                metadata: { acceptance_gate_passed: task.delivery_summary?.acceptance_gate_passed === true },
            });
            if (completed)
                projected.push(completed);
        }
        else if (["failed", "blocked", "waiting"].includes(String(task.status || ""))) {
            const blocked = event({
                id: `task:${taskId}:${task.status}:${hash(task.updated_at || task.created_at, 12)}`,
                at: task.updated_at || task.created_at,
                type: task.status === "failed" ? "task_failed" : "task_blocked",
                state: task.status,
                actor_type: "system",
                actor_label: "系统",
                source: "task_timeline",
                source_label: sourceLabel("task_timeline"),
                title: task.title,
                detail: task.status_detail || task.delivery_summary?.blockers?.[0] || task.delivery_summary?.needs?.[0] || task.result || "等待继续处理",
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:status`,
            });
            if (blocked)
                projected.push(blocked);
        }
        for (const file of taskFiles(task)) {
            const changed = event({
                id: `task:${taskId}:file:${hash(file)}`,
                at: deliveryAt || task.updated_at || task.created_at,
                type: "file_change",
                state: "changed",
                actor_type: "agent",
                actor_label: "项目子 Agent",
                source: "delivery",
                source_label: sourceLabel("delivery"),
                title: `修改 ${file}`,
                detail: task.title,
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:file:${file}`,
                metadata: { file },
            });
            if (changed)
                projected.push(changed);
        }
        for (const verification of verificationLines(task)) {
            const verified = event({
                id: `task:${taskId}:verification:${hash(verification)}`,
                at: deliveryAt || task.updated_at || task.created_at,
                type: "verification",
                state: /fail|失败|error/i.test(verification) ? "failed" : "passed",
                actor_type: "agent",
                actor_label: "项目子 Agent",
                source: "delivery",
                source_label: sourceLabel("delivery"),
                title: `执行验证：${verification}`,
                detail: task.title,
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:verification:${hash(verification)}`,
                metadata: { verification },
            });
            if (verified)
                projected.push(verified);
        }
        if (task.review && /test.?agent/i.test(String(task.review.agent || task.review.reviewer || ""))) {
            const review = event({
                id: `task:${taskId}:test-agent-review:${hash(task.review.updated_at || task.updated_at, 12)}`,
                at: task.review.updated_at || task.updated_at,
                type: "test_agent_review",
                state: /pass|accept|通过|完成/i.test(String(task.review.status || "")) ? "passed" : /fail|reject|失败/i.test(String(task.review.status || "")) ? "failed" : "reviewed",
                actor_type: "test_agent",
                actor_label: "TestAgent",
                source: "test_agent",
                source_label: sourceLabel("test_agent"),
                title: `验收 ${task.title}`,
                detail: task.review.content || task.review.summary || task.review.status,
                task_id: taskId,
                group_id: groupId,
                project,
                work_id: taskId,
                evidence_ref: `tasks.json#${taskId}:review`,
            });
            if (review)
                projected.push(review);
        }
    }
    return projected;
}
function projectConversation(messages, context) {
    const projected = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        if (!isWorkRequest(message))
            continue;
        const at = message.timestamp || message.created_at || message.createdAt;
        const messageId = String(message.id || hash(`${context.session_id}|${at}|${message.content}`));
        const source = sourceFromMessage(message, context.source);
        const taskId = String(message.task_id || message.taskId || message.mission_id || "");
        const request = event({
            id: `message:${source}:${context.session_id}:${messageId}:request`,
            at,
            type: "work_request",
            state: "requested",
            actor_type: "user",
            actor_label: "你",
            source,
            source_label: sourceLabel(source),
            title: message.content,
            detail: (message.attachments?.length || message.files?.length) ? `包含 ${message.attachments?.length || message.files?.length} 个附件` : "",
            task_id: taskId,
            group_id: context.group_id || "",
            project: context.project || "",
            work_id: taskId || `message:${source}:${context.session_id}:${messageId}`,
            evidence_level: "medium",
            evidence_ref: `${context.evidence_ref}#${messageId}`,
            metadata: { attachments: message.attachments?.length || message.files?.length || 0 },
        });
        if (request)
            projected.push(request);
        for (let cursor = index + 1; cursor < messages.length; cursor += 1) {
            const reply = messages[cursor];
            if (reply?.role === "user")
                break;
            if (reply?.role !== "assistant")
                continue;
            if (!COMPLETION_RE.test(String(reply.content || "")))
                break;
            const replyAt = reply.timestamp || reply.created_at || reply.createdAt;
            const replyId = String(reply.id || hash(`${context.session_id}|${replyAt}|${reply.content}`));
            const response = event({
                id: `message:${source}:${context.session_id}:${replyId}:response`,
                at: replyAt,
                type: "agent_response",
                state: "reported",
                actor_type: "agent",
                actor_label: reply.agent || context.agent_label || "Agent",
                source,
                source_label: sourceLabel(source),
                title: `响应：${message.content}`,
                detail: reply.content,
                task_id: taskId,
                group_id: context.group_id || "",
                project: context.project || "",
                work_id: taskId || `message:${source}:${context.session_id}:${messageId}`,
                evidence_level: "medium",
                evidence_ref: `${context.evidence_ref}#${replyId}`,
            });
            if (response)
                projected.push(response);
            break;
        }
    }
    return projected;
}
function projectConversationWorkEvents() {
    const projected = [];
    const globalStore = readJson(GLOBAL_AGENT_HISTORY_FILE, { sessions: [] });
    const globalSessions = Array.isArray(globalStore.sessions) ? globalStore.sessions : Object.values(globalStore.sessions || {});
    for (const session of globalSessions) {
        projected.push(...projectConversation(session.messages || session.history || [], {
            source: String(session.source || "").toLowerCase().includes("feishu") ? "feishu" : "global_chat",
            session_id: session.id || hash(session.name || session.createdAt),
            evidence_ref: `global-agent-history.json:${session.id || "session"}`,
            agent_label: "全局 Agent",
        }));
    }
    for (const group of (0, storage_1.loadGroups)()) {
        const sessions = (0, storage_1.listGroupChatSessions)(group.id).sessions || [];
        for (const session of sessions) {
            projected.push(...projectConversation((0, storage_1.getGroupMessages)(group.id, session.id), {
                source: "group_chat",
                session_id: `${group.id}:${session.id}`,
                evidence_ref: `group-messages:${group.id}:${session.id}`,
                group_id: group.id,
                agent_label: "群聊主 Agent",
            }));
        }
    }
    if (fs.existsSync(PROJECT_SESSIONS_DIR)) {
        for (const projectEntry of fs.readdirSync(PROJECT_SESSIONS_DIR, { withFileTypes: true })) {
            if (!projectEntry.isDirectory())
                continue;
            const projectDir = path.join(PROJECT_SESSIONS_DIR, projectEntry.name);
            for (const file of fs.readdirSync(projectDir).filter(name => name.endsWith(".json"))) {
                const session = readJson(path.join(projectDir, file), null);
                if (!session)
                    continue;
                projected.push(...projectConversation(session.history || session.messages || [], {
                    source: "project_chat",
                    session_id: `${projectEntry.name}:${session.id || file}`,
                    evidence_ref: `web-sessions:${projectEntry.name}:${file}`,
                    project: projectEntry.name,
                    agent_label: session.agent_type || projectEntry.name,
                }));
            }
        }
    }
    return projected;
}
function projectTestAgentWorkEvents(tasks = (0, db_1.loadTasks)()) {
    if (!fs.existsSync(TEST_AGENT_RUNS_DIR))
        return [];
    const tasksById = new Map(tasks.map((task) => [String(task.id || ""), task]));
    const projected = [];
    for (const file of fs.readdirSync(TEST_AGENT_RUNS_DIR).filter(name => name.endsWith(".json") && !name.endsWith(".stdout.json"))) {
        const run = readJson(path.join(TEST_AGENT_RUNS_DIR, file), null);
        const task = tasksById.get(String(run?.taskId || ""));
        if (!run || !task)
            continue;
        const report = run.result?.report || run.result?.result?.report || {};
        const finishedAt = run.finishedAt || report.finishedAt || run.heartbeatAt || run.createdAt;
        const status = String(report.status || run.result?.outcome || run.status || "");
        const browserChecks = Number(report.browserResults?.length || report.summaryCounts?.browserChecks || 0);
        const screenshots = Number(report.browserMultiSessionSummary?.screenshotCount || report.browserStabilitySummary?.screenshotCount || 0);
        const item = event({
            id: `test-agent:${run.id || hash(file)}`,
            at: finishedAt,
            type: "test_agent_run",
            state: /pass|accept|completed/i.test(status) ? "passed" : /fail|reject|error/i.test(status) ? "failed" : "reviewed",
            actor_type: "test_agent",
            actor_label: "TestAgent",
            source: "test_agent",
            source_label: sourceLabel("test_agent"),
            title: `验收 ${task.title}`,
            detail: report.summary || run.error || status,
            task_id: String(task.id),
            group_id: String(task.group_id || ""),
            project: String(task.target_project || task.project || ""),
            work_id: String(task.id),
            evidence_ref: `test-agent-runs/${file}`,
            metadata: { browser_checks: browserChecks, screenshots, recommendation: report.recommendation || run.result?.recommendation || "" },
        });
        if (item)
            projected.push(item);
    }
    return projected;
}
function projectAutomationEvents() {
    const projected = [];
    for (const job of (0, db_1.loadCronJobs)()) {
        if (!job?.last_run)
            continue;
        const item = event({
            id: `automation:${job.id}:run:${hash(job.last_run, 14)}`,
            at: job.last_run,
            type: "automation_run",
            state: String(job.last_status || "recorded"),
            actor_type: "system",
            actor_label: "自动开发",
            source: "automation",
            source_label: sourceLabel("automation"),
            title: job.name || "自动开发计划",
            detail: job.last_result || "自动任务已运行",
            group_id: String(job.group_id || ""),
            project: String(job.project || ""),
            work_id: `automation:${job.id}`,
            evidence_ref: `cron-jobs.json#${job.id}:last_run`,
            metadata: { workflow_type: job.workflow_type || "", schedule: job.schedule || "" },
        });
        if (item)
            projected.push(item);
    }
    return projected;
}
function collectProjectedWorkEvents() {
    const tasks = (0, db_1.loadTasks)();
    return [
        ...projectTaskWorkEvents(tasks),
        ...projectConversationWorkEvents(),
        ...projectTestAgentWorkEvents(tasks),
        ...projectAutomationEvents(),
    ].sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id));
}
function readWorkJournalEvents() {
    if (!fs.existsSync(WORK_JOURNAL_FILE))
        return [];
    return fs.readFileSync(WORK_JOURNAL_FILE, "utf-8").split(/\r?\n/).filter(Boolean).flatMap(line => {
        try {
            const parsed = JSON.parse(line);
            return parsed?.schema === WORK_EVENT_SCHEMA && parsed?.id && validIso(parsed.at) ? [parsed] : [];
        }
        catch {
            return [];
        }
    });
}
function mergeWorkJournalEvents(existing, candidates) {
    const seen = new Set(existing.map(item => item.id));
    const appended = [];
    for (const candidate of candidates) {
        if (!candidate?.id || seen.has(candidate.id))
            continue;
        seen.add(candidate.id);
        appended.push(candidate);
    }
    return { events: [...existing, ...appended].sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id)), appended };
}
function syncWorkJournal() {
    const existing = readWorkJournalEvents();
    const projected = collectProjectedWorkEvents();
    const merged = mergeWorkJournalEvents(existing, projected);
    if (merged.appended.length) {
        fs.mkdirSync(path.dirname(WORK_JOURNAL_FILE), { recursive: true });
        fs.appendFileSync(WORK_JOURNAL_FILE, `${merged.appended.map(item => JSON.stringify(item)).join("\n")}\n`, "utf-8");
    }
    return {
        schema: "ccm-work-journal-sync-v1",
        file: WORK_JOURNAL_FILE,
        existing: existing.length,
        projected: projected.length,
        appended: merged.appended.length,
        total: merged.events.length,
        events: merged.events,
    };
}
function localWorkDateKey(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function parseWorkDay(dateKey = localWorkDateKey()) {
    const safe = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)) ? String(dateKey) : localWorkDateKey();
    const [year, month, day] = safe.split("-").map(Number);
    return { key: safe, start: new Date(year, month - 1, day, 0, 0, 0, 0), end: new Date(year, month - 1, day + 1, 0, 0, 0, 0) };
}
function inSpan(at, span) {
    const time = Date.parse(at);
    return Number.isFinite(time) && time >= span.start.getTime() && time < span.end.getTime();
}
function isReportableEvent(item) {
    return item.type !== "technical_progress";
}
function stateAtEnd(events, end) {
    const relevant = events.filter(item => item.task_id && Date.parse(item.at) < end.getTime()).sort((left, right) => left.at.localeCompare(right.at));
    const states = new Map();
    for (const item of relevant) {
        if (["task_created"].includes(item.type))
            states.set(item.task_id, "pending");
        else if (["task_queued"].includes(item.type))
            states.set(item.task_id, "queued");
        else if (["task_started", "dispatch", "child_agent_start", "child_agent_receipt"].includes(item.type))
            states.set(item.task_id, "in_progress");
        else if (item.type === "task_completed")
            states.set(item.task_id, "done");
        else if (item.type === "task_failed")
            states.set(item.task_id, "failed");
        else if (item.type === "task_blocked")
            states.set(item.task_id, "blocked");
    }
    return states;
}
function backlogSnapshot() {
    const items = [];
    const counts = {};
    for (const group of (0, storage_1.loadGroups)()) {
        for (const file of Array.isArray(group.shared_files) ? group.shared_files : []) {
            const content = String(file?.content || "");
            const isBacklog = file?.category === "daily_dev_backlog" || /类型\s*:\s*daily_dev/i.test(content) || /^backlog-[\w-]+\.md$/i.test(String(file?.name || ""));
            if (!isBacklog)
                continue;
            const status = String(file?.status || content.match(/^\s*-\s*状态\s*:\s*([^\n\r]+)/mi)?.[1] || "unknown").trim().toLowerCase();
            counts[status] = Number(counts[status] || 0) + 1;
            items.push({ group_id: group.id, group_name: group.name || group.id, name: file.name, status, title: compact(content.match(/^#\s+(.+)$/m)?.[1] || file.name, file.name, 120), task_id: file.task_id || null });
        }
    }
    return { total: items.length, counts, items: items.slice(0, 50) };
}
function workTitle(workEvents, taskMap) {
    const taskId = workEvents.find(item => item.task_id)?.task_id || "";
    const request = workEvents.find(item => item.type === "work_request");
    return compact(taskMap.get(taskId)?.title || request?.title || workEvents[0]?.title, "工作事项", 140);
}
function groupActivities(dayEvents, allEvents, day) {
    const taskMap = new Map((0, db_1.loadTasks)().map((task) => [String(task.id || ""), task]));
    const states = stateAtEnd(allEvents, day.end);
    const grouped = new Map();
    for (const item of dayEvents) {
        const key = item.work_id || item.task_id || item.id;
        grouped.set(key, [...(grouped.get(key) || []), item]);
    }
    return Array.from(grouped.entries()).map(([id, events]) => {
        const taskId = events.find(item => item.task_id)?.task_id || "";
        const state = taskId ? states.get(taskId) || events.at(-1)?.state || "recorded" : events.at(-1)?.state || "recorded";
        const actors = uniqueStrings(events.map(item => item.actor_label), 8);
        const actorTypes = uniqueStrings(events.map(item => item.actor_type), 4);
        const sources = uniqueStrings(events.map(item => item.source_label), 8);
        const files = uniqueStrings(events.filter(item => item.type === "file_change").map(item => item.metadata?.file), 30);
        const verifications = uniqueStrings(events.filter(item => item.type === "verification").map(item => item.metadata?.verification || item.title), 20);
        const testEvents = events.filter(item => item.actor_type === "test_agent");
        return {
            id,
            task_id: taskId,
            title: workTitle(events, taskMap),
            status: state,
            status_label: { done: "已完成", in_progress: "执行中", queued: "已排队", failed: "失败", blocked: "等待处理", pending: "待开始" }[state] || "已记录",
            source: events[0]?.source || "system",
            source_label: sources.join("、") || "系统记录",
            location: uniqueStrings(events.map(item => item.project || item.group_id), 6).join("、") || "工作台",
            actor_label: actors.join("、"),
            actors,
            actor_types: actorTypes,
            files_changed: files,
            verifications,
            test_status: testEvents.at(-1)?.state || "",
            evidence_count: events.length,
            timestamp: events[0]?.at || "",
            result: compact(events.find(item => item.type === "task_completed")?.detail || events.at(-1)?.detail || "", "", 240),
        };
    }).sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}
function ownershipSummary(events) {
    const count = (actor) => events.filter(item => item.actor_type === actor && isReportableEvent(item)).length;
    return {
        user_actions: count("user"),
        agent_actions: count("agent"),
        test_agent_actions: count("test_agent"),
        system_actions: count("system"),
    };
}
function evidenceSummary(events) {
    const reportable = events.filter(isReportableEvent);
    const sourceCounts = {};
    for (const item of reportable)
        sourceCounts[item.source] = Number(sourceCounts[item.source] || 0) + 1;
    return {
        event_count: reportable.length,
        strong_evidence: reportable.filter(item => item.evidence_level === "strong").length,
        conversational_evidence: reportable.filter(item => item.evidence_level === "medium").length,
        source_count: Object.keys(sourceCounts).length,
        source_counts: sourceCounts,
        captured_sources: Object.keys(sourceCounts).map(sourceLabel),
        generated_from: "不可变工作事件账本",
    };
}
function formatActivity(item) {
    const lines = [`- ${item.title}（${item.status_label}；${item.actor_label || "系统记录"}）`];
    if (item.files_changed?.length)
        lines.push(`  - 代码变更：${item.files_changed.join("、")}`);
    if (item.verifications?.length)
        lines.push(`  - 已执行验证：${item.verifications.join("；")}`);
    if (item.test_status)
        lines.push(`  - TestAgent：${item.test_status === "passed" ? "验收通过" : item.test_status === "failed" ? "验收未通过" : "已复核"}`);
    return lines;
}
function buildDailyMarkdown(report) {
    const userActivities = report.activities.filter((item) => item.actor_types?.includes("user"));
    const agentActivities = report.activities.filter((item) => item.actor_types?.includes("agent"));
    const testActivities = report.activities.filter((item) => item.actor_types?.includes("test_agent"));
    const systemActivities = report.activities.filter((item) => item.actor_types?.includes("system"));
    return [
        `# 工作日报 ${report.date}`,
        "",
        "## 今天完成了什么",
        ...(report.completed.length ? report.completed.flatMap(formatActivity) : ["- 今天还没有形成已验收完成的工作"]),
        "",
        "## 你今天发起或推进的工作",
        ...(userActivities.length ? userActivities.slice(0, 30).flatMap(formatActivity) : ["- 没有识别到新的业务工作指令"]),
        "",
        "## Agent 今天推进的工作",
        ...(agentActivities.length ? agentActivities.slice(0, 40).flatMap(formatActivity) : ["- 没有识别到 Agent 交付活动"]),
        "",
        "## 系统自动化",
        ...(systemActivities.length ? systemActivities.slice(0, 30).flatMap(formatActivity) : ["- 今天没有新的自动化运行记录"]),
        "",
        "## 验收与质量",
        ...(testActivities.length ? testActivities.slice(0, 20).flatMap(formatActivity) : report.summary.verifications > 0 ? [`- 已记录 ${report.summary.verifications} 项执行验证`] : ["- 今天没有新的独立验收记录"]),
        "",
        "## 仍在进行",
        ...(report.running.length ? report.running.map((item) => `- ${item.title}（${item.status_label}）`) : ["- 暂无执行中的工作"]),
        "",
        "## 风险与待处理",
        ...(report.blockers.length ? report.blockers.map((item) => `- ${item.title}：${item.reason}`) : ["- 暂无明确阻塞"]),
        "",
        "## 明天继续",
        ...(report.next_actions.length ? report.next_actions.map((item) => `- ${item}`) : ["- 等待新的业务需求"]),
        "",
        "## 数据依据",
        `- 工作事件：${report.evidence_summary.event_count} 条，其中强证据 ${report.evidence_summary.strong_evidence} 条`,
        `- 数据来源：${report.evidence_summary.captured_sources.join("、") || "暂无"}`,
        `- 工作归属：你 ${report.ownership.user_actions} 条、Agent ${report.ownership.agent_actions} 条、TestAgent ${report.ownership.test_agent_actions} 条、系统自动化 ${report.ownership.system_actions} 条`,
    ].join("\n");
}
function generateEvidenceDailyReport(dateKey = localWorkDateKey(), inputEvents) {
    const sync = inputEvents ? null : syncWorkJournal();
    const events = inputEvents || sync.events;
    const day = parseWorkDay(dateKey);
    const dayEvents = events.filter(item => inSpan(item.at, day) && isReportableEvent(item));
    const activities = groupActivities(dayEvents, events, day);
    const stateMap = stateAtEnd(events, day.end);
    const taskMap = new Map((0, db_1.loadTasks)().map((task) => [String(task.id || ""), task]));
    const completed = activities.filter(item => item.status === "done" && dayEvents.some(event => event.task_id === item.task_id && event.type === "task_completed"));
    const running = Array.from(stateMap.entries()).filter(([, state]) => ["pending", "queued", "in_progress"].includes(state)).map(([taskId, state]) => ({
        id: taskId,
        title: taskMap.get(taskId)?.title || activities.find(item => item.task_id === taskId)?.title || taskId,
        status: state,
        status_label: state === "in_progress" ? "执行中" : state === "queued" ? "已排队" : "待开始",
        updated_at: events.filter(item => item.task_id === taskId && Date.parse(item.at) < day.end.getTime()).at(-1)?.at || "",
    })).slice(0, 40);
    const blockers = Array.from(stateMap.entries()).filter(([, state]) => ["blocked", "failed"].includes(state)).map(([taskId, state]) => {
        const latest = events.filter(item => item.task_id === taskId && ["task_blocked", "task_failed", "child_agent_failed", "child_agent_rework"].includes(item.type) && Date.parse(item.at) < day.end.getTime()).at(-1);
        return { id: taskId, title: taskMap.get(taskId)?.title || latest?.title || taskId, reason: latest?.detail || (state === "failed" ? "任务执行失败" : "等待继续处理") };
    }).slice(0, 40);
    const backlog = backlogSnapshot();
    const ownership = ownershipSummary(dayEvents);
    const evidence = evidenceSummary(dayEvents);
    const fileChanges = uniqueStrings(dayEvents.filter(item => item.type === "file_change").map(item => item.metadata?.file), 200);
    const verifications = dayEvents.filter(item => item.type === "verification");
    const sourceTypeCount = (source) => dayEvents.filter(item => item.type === "work_request" && item.source === source).length;
    const nextActions = [
        ...blockers.slice(0, 3).map(item => `继续处理：${item.title}`),
        ...running.slice(0, 3).map(item => `继续推进：${item.title}`),
        ...(Number(backlog.counts.ready || 0) > 0 ? [`认领 ${backlog.counts.ready} 条可接活需求`] : []),
    ].slice(0, 6);
    const report = {
        schema: REPORT_SCHEMA,
        id: day.key,
        type: "daily",
        date: day.key,
        generated_at: new Date().toISOString(),
        immutable_source: true,
        summary: {
            total_activities: activities.length,
            conversation_requests: dayEvents.filter(item => item.type === "work_request").length,
            document_requests: dayEvents.filter(item => item.type === "work_request" && Number(item.metadata?.attachments || 0) > 0).length,
            group_chat_requests: sourceTypeCount("group_chat") + sourceTypeCount("feishu"),
            project_chat_requests: sourceTypeCount("project_chat"),
            global_chat_requests: sourceTypeCount("global_chat"),
            touched_tasks: new Set(dayEvents.map(item => item.task_id).filter(Boolean)).size,
            done_tasks: completed.length,
            running_tasks: running.length,
            failed_tasks: blockers.filter(item => stateMap.get(item.id) === "failed").length,
            blocked_tasks: blockers.length,
            file_changes: fileChanges.length,
            verifications: verifications.length,
            test_agent_reviews: dayEvents.filter(item => item.actor_type === "test_agent").length,
            enabled_daily_dev_jobs: (0, db_1.loadCronJobs)().filter((job) => job.workflow_type === "daily_dev" && job.enabled !== false).length,
            cron_runs_today: dayEvents.filter(item => item.type === "automation_run").length,
        },
        ownership,
        evidence_summary: evidence,
        backlog,
        activities: activities.slice(0, 100),
        completed: completed.slice(0, 60),
        blockers,
        running,
        next_actions: nextActions,
        changed_files: fileChanges,
        verifications: verifications.map(item => ({ title: item.title, status: item.state, task_id: item.task_id, evidence_ref: item.evidence_ref })),
        event_ids: dayEvents.map(item => item.id),
    };
    report.markdown = buildDailyMarkdown(report);
    return report;
}
function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function workWeekRange(dateKey = localWorkDateKey()) {
    const day = parseWorkDay(dateKey);
    const weekday = day.start.getDay();
    const start = addDays(day.start, weekday === 0 ? -6 : 1 - weekday);
    const end = addDays(start, 7);
    return { id: `week-${localWorkDateKey(start)}`, start, end, start_key: localWorkDateKey(start), end_key: localWorkDateKey(addDays(end, -1)) };
}
function uniqueBy(items, keyOf) {
    const seen = new Set();
    return items.filter(item => {
        const key = keyOf(item);
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function buildWeeklyMarkdown(report) {
    return [
        `# 工作周报 ${report.start_date} 至 ${report.end_date}`,
        "",
        "## 本周完成",
        ...(report.completed.length ? report.completed.flatMap(formatActivity) : ["- 本周还没有形成已验收完成的工作"]),
        "",
        "## 本周重点推进",
        ...(report.highlights.length ? report.highlights.flatMap(formatActivity) : ["- 没有识别到新的重点工作"]),
        "",
        "## 代码与交付",
        ...(report.changed_files.length ? report.changed_files.map((file) => `- ${file}`) : ["- 本周暂无可核验的文件变更"]),
        "",
        "## 验收与质量",
        `- 已执行验证：${report.summary.verifications} 项`,
        `- TestAgent/独立复核：${report.summary.test_agent_reviews} 条`,
        "",
        "## 风险与未完成",
        ...(report.blockers.length ? report.blockers.map((item) => `- ${item.title}：${item.reason}`) : ["- 暂无明确阻塞"]),
        "",
        "## 下周继续",
        ...(report.next_week.length ? report.next_week.map((item) => `- ${item}`) : ["- 等待新的业务需求"]),
        "",
        "## 本周工作依据",
        `- 活跃天数：${report.summary.active_days} 天`,
        `- 工作事件：${report.evidence_summary.event_count} 条，其中强证据 ${report.evidence_summary.strong_evidence} 条`,
        `- 数据来源：${report.evidence_summary.captured_sources.join("、") || "暂无"}`,
        `- 工作归属：你 ${report.ownership.user_actions} 条、Agent ${report.ownership.agent_actions} 条、TestAgent ${report.ownership.test_agent_actions} 条、系统自动化 ${report.ownership.system_actions} 条`,
    ].join("\n");
}
function generateEvidenceWeeklyReport(dateKey = localWorkDateKey()) {
    const sync = syncWorkJournal();
    const events = sync.events;
    const range = workWeekRange(dateKey);
    const span = { start: range.start, end: range.end };
    const weekEvents = events.filter(item => inSpan(item.at, span) && isReportableEvent(item));
    const days = Array.from({ length: 7 }, (_, index) => generateEvidenceDailyReport(localWorkDateKey(addDays(range.start, index)), events));
    const activities = uniqueBy(days.flatMap(day => day.activities || []), (item) => String(item.task_id || item.id)).slice(0, 180);
    const completed = uniqueBy(days.flatMap(day => day.completed || []), (item) => String(item.task_id || item.id)).slice(0, 80);
    const lastDay = days[6];
    const blockers = lastDay.blockers || [];
    const changedFiles = uniqueStrings(weekEvents.filter(item => item.type === "file_change").map(item => item.metadata?.file), 200);
    const ownership = ownershipSummary(weekEvents);
    const evidence = evidenceSummary(weekEvents);
    const highlights = activities.filter((item) => item.evidence_count > 1 || item.files_changed?.length || item.verifications?.length).slice(0, 50);
    const nextWeek = [
        ...blockers.slice(0, 4).map((item) => `继续处理：${item.title}`),
        ...(lastDay.running || []).slice(0, 4).map((item) => `继续推进：${item.title}`),
        ...(Number(lastDay.backlog?.counts?.ready || 0) > 0 ? [`认领 ${lastDay.backlog.counts.ready} 条可接活需求`] : []),
    ].slice(0, 8);
    const report = {
        schema: REPORT_SCHEMA,
        id: range.id,
        type: "weekly",
        start_date: range.start_key,
        end_date: range.end_key,
        generated_at: new Date().toISOString(),
        immutable_source: true,
        summary: {
            total_activities: activities.length,
            done_tasks: completed.length,
            file_changes: changedFiles.length,
            verifications: weekEvents.filter(item => item.type === "verification").length,
            test_agent_reviews: weekEvents.filter(item => item.actor_type === "test_agent").length,
            blocked_tasks: blockers.length,
            active_days: days.filter(day => Number(day.summary?.total_activities || 0) > 0).length,
        },
        ownership,
        evidence_summary: evidence,
        completed,
        highlights,
        blockers,
        activities,
        changed_files: changedFiles,
        next_week: nextWeek,
        daily_reports: days.map(day => ({ date: day.date, summary: day.summary, ownership: day.ownership, evidence_summary: day.evidence_summary })),
        event_ids: weekEvents.map(item => item.id),
    };
    report.markdown = buildWeeklyMarkdown(report);
    return report;
}
function listWorkJournalEvents(options = {}) {
    const sync = syncWorkJournal();
    const parsedStart = options.start ? Date.parse(String(options.start)) : Number.NEGATIVE_INFINITY;
    const parsedEnd = options.end ? Date.parse(String(options.end)) : Number.POSITIVE_INFINITY;
    const start = Number.isFinite(parsedStart) ? parsedStart : Number.NEGATIVE_INFINITY;
    const end = Number.isFinite(parsedEnd) ? parsedEnd : Number.POSITIVE_INFINITY;
    const taskId = String(options.task_id || options.taskId || "");
    const source = String(options.source || "");
    const requestedLimit = Number(options.limit || 200);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(1000, requestedLimit)) : 200;
    return sync.events.filter(item => {
        const time = Date.parse(item.at);
        return time >= start && time < end && (!taskId || item.task_id === taskId) && (!source || item.source === source);
    }).slice(-limit).reverse();
}
function getWorkJournalAudit(options = {}) {
    const sync = options.sync === false
        ? { events: readWorkJournalEvents(), appended: 0 }
        : syncWorkJournal();
    const sourceCounts = {};
    const actorCounts = {};
    for (const item of sync.events) {
        sourceCounts[item.source] = Number(sourceCounts[item.source] || 0) + 1;
        actorCounts[item.actor_type] = Number(actorCounts[item.actor_type] || 0) + 1;
    }
    return {
        schema: "ccm-work-journal-audit-v1",
        success: true,
        file: WORK_JOURNAL_FILE,
        append_only: true,
        auto_cleanup: false,
        total: sync.events.length,
        appended: sync.appended,
        source_counts: sourceCounts,
        actor_counts: actorCounts,
        earliest_at: sync.events[0]?.at || "",
        latest_at: sync.events.at(-1)?.at || "",
        self_test: runWorkJournalSelfTest(),
    };
}
function runWorkJournalSelfTest() {
    const monday = "2026-07-06T02:00:00.000Z";
    const friday = "2026-07-10T08:00:00.000Z";
    const task = {
        id: "journal-self-test-task",
        title: "完成退款审批功能",
        status: "done",
        created_at: monday,
        completed_at: friday,
        updated_at: friday,
        intake_state: "confirmed",
        delivery_summary: {
            generated_at: friday,
            actual_file_changes: ["src/refund.ts"],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
        },
    };
    const projected = projectTaskWorkEvents([task]);
    const mondayCompleted = projected.filter(item => item.type === "task_completed" && localWorkDateKey(new Date(item.at)) === "2026-07-06").length;
    const fridayCompleted = projected.filter(item => item.type === "task_completed" && localWorkDateKey(new Date(item.at)) === "2026-07-10").length;
    const existing = projected.slice(0, 1);
    const merged = mergeWorkJournalEvents(existing, projected);
    const checks = {
        appendOnlyDedup: merged.events.filter(item => item.id === existing[0].id).length === 1,
        historicalCompletionNotBackdated: mondayCompleted === 0 && fridayCompleted === 1,
        fileEvidenceBoundToCompletion: projected.some(item => item.type === "file_change" && item.at === friday),
        verificationEvidenceBoundToCompletion: projected.some(item => item.type === "verification" && item.at === friday),
        ownershipSeparated: projected.some(item => item.actor_type === "user") && projected.some(item => item.actor_type === "agent"),
        workbenchAttributedToUser: projected.some(item => item.type === "task_created" && item.source === "workbench" && item.actor_type === "user"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=work-journal.js.map