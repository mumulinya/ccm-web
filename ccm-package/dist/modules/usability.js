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
exports.archiveOldUsabilityHistory = archiveOldUsabilityHistory;
exports.runUsabilityGovernance = runUsabilityGovernance;
exports.buildUsabilityWorkbench = buildUsabilityWorkbench;
exports.startUsabilityArchiveScheduler = startUsabilityArchiveScheduler;
exports.stopUsabilityArchiveScheduler = stopUsabilityArchiveScheduler;
exports.handleUsabilityApi = handleUsabilityApi;
const db_1 = require("../db");
const utils_1 = require("../utils");
const collaboration_1 = require("./collaboration");
const task_agent_sessions_1 = require("../task-agent-sessions");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DAY = 24 * 60 * 60 * 1000;
const AUTO_ARCHIVE_DAYS = 30;
let archiveTimer = null;
const GOVERNANCE_AUDIT_FILE = path.join(utils_1.CCM_DIR, "task-governance-audit.jsonl");
function appendGovernanceAudit(event) {
    fs.appendFileSync(GOVERNANCE_AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, "utf-8");
}
function timeOf(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
}
function firstText(...values) {
    for (const value of values) {
        if (Array.isArray(value) && value.length)
            return String(value[0] || "").trim();
        if (value != null && String(value).trim())
            return String(value).trim();
    }
    return "";
}
function taskPhase(task) {
    const status = String(task.status || "pending").toLowerCase();
    const delivery = task.delivery_summary || {};
    if (["cancelled", "archived", "deleted"].includes(status))
        return "history";
    const blocking = [
        ...(Array.isArray(delivery.blocking_needs) ? delivery.blocking_needs : []),
        ...(Array.isArray(delivery.blockers) ? delivery.blockers : []),
    ];
    if (task.intake_state === "awaiting_confirmation")
        return "needs_user";
    if (["paused", "waiting_user", "needs_confirmation"].includes(status) || blocking.length > 0)
        return "needs_user";
    if (status === "failed" || delivery.status === "failed")
        return "failed";
    if (["in_progress", "running", "queued", "cancelling"].includes(status))
        return "in_progress";
    if (["pending", "waiting"].includes(status))
        return "queued";
    if (status === "done")
        return Date.now() - timeOf(task.completed_at || task.updated_at) <= DAY ? "recently_completed" : "history";
    return "history";
}
function taskReason(task, phase) {
    const delivery = task.delivery_summary || {};
    const blocking = firstText(delivery.blocking_needs, delivery.blockers, delivery.needs);
    if (phase === "needs_user")
        return firstText(blocking, task.status_detail, "需要你确认后才能继续");
    if (phase === "failed")
        return firstText(task.status_detail, delivery.detail, task.result, "执行失败，可重试或切换执行器");
    if (phase === "recently_completed")
        return firstText(delivery.headline, task.result, "已完成并生成交付报告");
    return firstText(task.status_detail, delivery.detail, task.result, phase === "queued" ? "等待开始" : "正在执行");
}
function taskActions(task, phase) {
    if (task.intake_state === "awaiting_confirmation")
        return ["confirm", "edit", "cancel"];
    if (phase === "needs_user")
        return ["supplement", "resume", "cancel"];
    if (phase === "failed")
        return ["retry", "switch_executor", "cancel"];
    if (phase === "in_progress")
        return ["supplement", "pause", "cancel"];
    if (phase === "queued")
        return ["start", "edit", "cancel"];
    if (phase === "recently_completed")
        return ["view_report", "archive"];
    return ["view"];
}
function publicTask(task) {
    const phase = taskPhase(task);
    const delivery = task.delivery_summary || {};
    const changed = Array.isArray(delivery.actual_file_changes) ? delivery.actual_file_changes.length : Number(delivery.actual_file_change_count || task.file_changes?.count || 0);
    const verified = Array.isArray(delivery.verification_executed) ? delivery.verification_executed.length : 0;
    return {
        id: task.id,
        trace_id: task.trace_id || "",
        title: task.title || task.business_goal || "未命名任务",
        goal: task.business_goal || task.description || "",
        phase,
        status: task.status || "pending",
        reason: taskReason(task, phase).slice(0, 280),
        target_project: task.target_project || "",
        group_id: task.group_id || "",
        updated_at: task.updated_at || task.created_at || "",
        created_at: task.created_at || "",
        actions: taskActions(task, phase),
        delivery: { files_changed: changed, verification_count: verified, report: delivery.user_report || task.final_report || "" },
        intake: task.intake_draft || null,
    };
}
function archiveOldUsabilityHistory(now = Date.now()) {
    const tasks = (0, db_1.loadTasks)();
    let changed = 0;
    const cutoff = now - AUTO_ARCHIVE_DAYS * DAY;
    for (const task of tasks) {
        if (task.archived || task.deleted_at || !["done", "cancelled"].includes(String(task.status || "")))
            continue;
        if (timeOf(task.completed_at || task.cancelled_at || task.updated_at || task.created_at) >= cutoff)
            continue;
        task.archived = true;
        task.archived_at = new Date(now).toISOString();
        task.archive_reason = `日常工作台自动归档：终态超过 ${AUTO_ARCHIVE_DAYS} 天`;
        changed++;
    }
    for (const task of tasks) {
        if (task.archived || task.deleted_at || task.intake_state !== "awaiting_confirmation")
            continue;
        if (timeOf(task.created_at) >= now - DAY)
            continue;
        task.archived = true;
        task.status = "archived";
        task.archived_at = new Date(now).toISOString();
        task.archive_reason = "执行前确认卡超过 24 小时未确认，自动归档";
        changed++;
    }
    if (changed)
        (0, db_1.saveTasks)(tasks);
    if (changed)
        appendGovernanceAudit({ type: "automatic_task_archive", changed, retention_days: AUTO_ARCHIVE_DAYS });
    return { changed, retention_days: AUTO_ARCHIVE_DAYS };
}
function runUsabilityGovernance() {
    const archive = archiveOldUsabilityHistory();
    const sessions = (0, task_agent_sessions_1.reconcileTaskAgentSessions)((0, db_1.loadTasks)());
    if (sessions.closed)
        appendGovernanceAudit({ type: "stale_session_cleanup", closed: sessions.closed, session_ids: sessions.sessions.map((item) => item.id) });
    return { archive, sessions: { closed: sessions.closed }, audit_file: GOVERNANCE_AUDIT_FILE };
}
function buildUsabilityWorkbench() {
    const archive = archiveOldUsabilityHistory();
    const tasks = (0, db_1.loadTasks)().filter((item) => !item.archived && !item.deleted_at).map(publicTask)
        .sort((a, b) => timeOf(b.updated_at) - timeOf(a.updated_at));
    const buckets = { needs_user: [], failed: [], in_progress: [], queued: [], recently_completed: [], history: [] };
    tasks.forEach((task) => (buckets[task.phase] || buckets.history).push(task));
    const notifications = [...buckets.failed, ...buckets.needs_user, ...buckets.recently_completed].slice(0, 12).map(task => ({
        id: `${task.id}:${task.phase}:${task.updated_at}`,
        level: task.phase === "failed" ? "error" : task.phase === "needs_user" ? "decision" : "success",
        task,
    }));
    const projects = (0, db_1.getConfigs)().map((config) => {
        const info = (0, db_1.getConfigInfo)(config.path)?.[0] || {};
        return { name: config.name, running: (0, db_1.isRunning)(config.name), agent: info.agent || "claudecode", work_dir: info.workDir || "" };
    });
    const groups = (0, collaboration_1.loadGroups)().map((group) => ({ id: group.id, name: group.name, members: Array.isArray(group.members) ? group.members.length : 0 }));
    const cron = (0, db_1.loadCronJobs)().filter((job) => !job.archived && !job.deleted_at).map((job) => ({
        id: job.id, name: job.name || job.title || "定时任务", enabled: job.enabled !== false && job.status !== "paused", next_run: job.next_run || job.nextRun || "", last_status: job.last_status || job.lastStatus || "",
    }));
    return {
        generated_at: new Date().toISOString(),
        archive,
        counts: Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, value.length])),
        attention: [...buckets.failed, ...buckets.needs_user].slice(0, 5),
        active: [...buckets.in_progress, ...buckets.queued],
        completed: buckets.recently_completed,
        notifications,
        resources: { projects, groups, cron },
        onboarding: { empty: projects.length === 0 && groups.length === 0, has_tasks: tasks.length > 0 },
    };
}
function startUsabilityArchiveScheduler() {
    runUsabilityGovernance();
    if (archiveTimer)
        clearInterval(archiveTimer);
    archiveTimer = setInterval(() => runUsabilityGovernance(), 6 * 60 * 60 * 1000);
    archiveTimer.unref?.();
}
function stopUsabilityArchiveScheduler() {
    if (archiveTimer)
        clearInterval(archiveTimer);
    archiveTimer = null;
}
function handleUsabilityApi(pathname, req, res) {
    if (pathname === "/api/usability/workbench" && req.method === "GET") {
        (0, utils_1.sendJson)(res, buildUsabilityWorkbench());
        return true;
    }
    if (pathname === "/api/usability/archive-history" && req.method === "POST") {
        (0, utils_1.sendJson)(res, { success: true, ...archiveOldUsabilityHistory() });
        return true;
    }
    return false;
}
//# sourceMappingURL=usability.js.map