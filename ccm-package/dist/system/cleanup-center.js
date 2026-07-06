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
exports.getCleanupSummary = getCleanupSummary;
exports.previewCleanupAction = previewCleanupAction;
exports.runCleanupAction = runCleanupAction;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const agent_sessions_1 = require("../tasks/agent-sessions");
const execution_kernel_1 = require("../agents/execution-kernel");
const utils_1 = require("../core/utils");
const chat_runs_1 = require("../projects/chat-runs");
function readJsonSafe(file, fallback = null) {
    try {
        if (!fs.existsSync(file))
            return fallback;
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function countFilesAndBytes(dir) {
    const result = { files: 0, bytes: 0 };
    const walk = (target) => {
        if (!fs.existsSync(target))
            return;
        const stat = fs.statSync(target);
        if (stat.isFile()) {
            result.files += 1;
            result.bytes += stat.size;
            return;
        }
        if (!stat.isDirectory())
            return;
        for (const name of fs.readdirSync(target))
            walk(path.join(target, name));
    };
    try {
        walk(dir);
    }
    catch { }
    return result;
}
function getCleanupSummary() {
    const tasks = (0, db_1.loadTasks)();
    const cronJobs = (0, db_1.loadCronJobs)();
    const projectRuns = [...chat_runs_1.projectChatRuns.values()];
    const groups = readJsonSafe(utils_1.GROUPS_FILE, []);
    const projectSessionsRoot = path.join(utils_1.CCM_DIR, "web-sessions");
    const globalHistory = readJsonSafe(path.join(utils_1.CCM_DIR, "global-agent-history.json"), { sessions: [] });
    const kernelRoot = path.join(utils_1.CCM_DIR, "execution-kernel");
    const executions = countFilesAndBytes(path.join(kernelRoot, "executions"));
    const checkpoints = countFilesAndBytes(path.join(kernelRoot, "checkpoints"));
    const outputs = countFilesAndBytes(path.join(kernelRoot, "outputs"));
    const projectSessions = countFilesAndBytes(projectSessionsRoot);
    const groupMessages = Array.isArray(groups) ? groups.map((group) => {
        const file = path.join(utils_1.GROUP_MESSAGES_DIR, `${group.id}.json`);
        const messages = readJsonSafe(file, []);
        return { id: group.id, name: group.name || group.id, messages: Array.isArray(messages) ? messages.length : 0 };
    }) : [];
    const detailRows = {
        tasks: tasks.slice(-200).reverse().map((task) => ({
            id: task.id,
            title: task.title || task.description || task.message || task.goal || "未命名任务",
            status: task.status || "",
            project: task.target_project || task.project || task.group_id || "",
            updated_at: task.updated_at || task.created_at || "",
            archived: !!(task.archived || task.deleted_at || task.status === "archived"),
        })),
        cron: cronJobs.slice(-200).reverse().map((job) => ({
            id: job.id,
            title: job.name || job.title || "未命名定时任务",
            status: job.archived || job.deleted_at ? "archived" : job.enabled === false ? "disabled" : "enabled",
            target: job.target_type === "project" ? job.project : (job.group_id || job.target || ""),
            schedule: job.schedule || job.cron || "",
            updated_at: job.updated_at || job.created_at || "",
            archived: !!(job.archived || job.deleted_at),
        })),
        project_runs: projectRuns.slice(-200).reverse().map((run) => ({
            id: run.id,
            title: run.message || run.project || "项目运行",
            status: run.status || "",
            project: run.project || "",
            trace_id: run.trace_id || "",
            native_session_id: run.native_session_id || "",
            updated_at: run.updated_at || run.created_at || "",
            archived: !!(run.archived || run.deleted_at || run.status === "archived"),
        })),
        project_sessions: (() => {
            const rows = [];
            try {
                if (fs.existsSync(projectSessionsRoot)) {
                    for (const project of fs.readdirSync(projectSessionsRoot)) {
                        const dir = path.join(projectSessionsRoot, project);
                        if (!fs.statSync(dir).isDirectory())
                            continue;
                        for (const file of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) {
                            const data = readJsonSafe(path.join(dir, file), {});
                            rows.push({
                                id: data.id || file.replace(/\.json$/, ""),
                                title: data.name || data.title || file.replace(/\.json$/, ""),
                                project,
                                messages: Array.isArray(data.history) ? data.history.length : 0,
                                updated_at: data.updated_at || data.created_at || "",
                            });
                        }
                    }
                }
            }
            catch { }
            return rows.slice(-200).reverse();
        })(),
        group_messages: groupMessages.map((group) => ({
            id: group.id,
            title: group.name,
            messages: group.messages,
            status: group.messages > 0 ? "has_messages" : "empty",
        })),
        global_sessions: (Array.isArray(globalHistory.sessions) ? globalHistory.sessions : []).slice(-200).reverse().map((session) => ({
            id: session.id,
            title: session.name || session.title || session.id || "全局会话",
            messages: Array.isArray(session.messages) ? session.messages.length : 0,
            updated_at: session.updatedAt || session.updated_at || session.createdAt || "",
        })),
        execution_artifacts: [
            { id: "executions", title: "execution records", files: executions.files, bytes: executions.bytes },
            { id: "checkpoints", title: "checkpoints", files: checkpoints.files, bytes: checkpoints.bytes },
            { id: "outputs", title: "outputs", files: outputs.files, bytes: outputs.bytes },
        ],
    };
    return {
        success: true,
        updated_at: new Date().toISOString(),
        cards: [
            { id: "tasks", title: "任务", count: tasks.length, detail: `已归档 ${tasks.filter((t) => t.archived || t.deleted_at || t.status === "archived").length}；失败 ${tasks.filter((t) => t.status === "failed").length}` },
            { id: "cron", title: "定时任务", count: cronJobs.length, detail: `已归档 ${cronJobs.filter((j) => j.archived || j.deleted_at).length}` },
            { id: "project_runs", title: "项目运行记录", count: projectRuns.length, detail: `已归档 ${projectRuns.filter((r) => r.archived || r.deleted_at || r.status === "archived").length}；失败 ${projectRuns.filter((r) => r.status === "failed").length}` },
            { id: "project_sessions", title: "项目会话文件", count: projectSessions.files, detail: `${Math.round(projectSessions.bytes / 1024)} KB` },
            { id: "group_messages", title: "群聊消息", count: groupMessages.reduce((sum, item) => sum + item.messages, 0), detail: `${groupMessages.length} 个群聊` },
            { id: "global_sessions", title: "全局 Agent 会话", count: Array.isArray(globalHistory.sessions) ? globalHistory.sessions.length : 0, detail: "聊天历史" },
            { id: "execution_artifacts", title: "执行产物", count: executions.files + checkpoints.files + outputs.files, detail: `execution ${executions.files}；checkpoint ${checkpoints.files}；output ${outputs.files}` },
        ],
        details: {
            tasks: { total: tasks.length, archived: tasks.filter((t) => t.archived || t.deleted_at || t.status === "archived").length, failed: tasks.filter((t) => t.status === "failed").length, done: tasks.filter((t) => t.status === "done").length },
            cron: { total: cronJobs.length, archived: cronJobs.filter((j) => j.archived || j.deleted_at).length, disabled: cronJobs.filter((j) => j.enabled === false).length },
            project_runs: { total: projectRuns.length, archived: projectRuns.filter((r) => r.archived || r.deleted_at || r.status === "archived").length, failed: projectRuns.filter((r) => r.status === "failed").length },
            group_messages: groupMessages,
            project_sessions: projectSessions,
            execution_artifacts: { executions, checkpoints, outputs },
        },
        rows: detailRows,
        actions: [
            { id: "purge_archived_tasks", label: "永久清除已归档任务", risk: "high", target_count: tasks.filter((t) => t.archived || t.deleted_at || t.status === "archived").length },
            { id: "purge_archived_cron", label: "永久清除已归档定时任务", risk: "high", target_count: cronJobs.filter((j) => j.archived || j.deleted_at).length },
            { id: "purge_archived_project_runs", label: "永久清除已归档项目运行", risk: "high", target_count: projectRuns.filter((r) => r.archived || r.deleted_at || r.status === "archived").length },
            { id: "archive_failed_project_runs", label: "归档失败项目运行", risk: "medium", target_count: projectRuns.filter((r) => r.status === "failed").length },
        ],
    };
}
function previewCleanupAction(action) {
    const summary = getCleanupSummary();
    const found = (summary.actions || []).find((item) => item.id === action);
    if (!found)
        return { success: false, error: "不支持的清理动作" };
    return {
        success: true,
        action: found,
        preview: {
            will_affect: found.target_count,
            risk: found.risk,
            irreversible: String(found.id).startsWith("purge_"),
            note: found.risk === "high" ? "永久清除不可撤销，请确认已不需要复盘记录。" : "归档后仍可在对应管理页查看或继续清理。",
        },
    };
}
function runCleanupAction(action) {
    const now = new Date().toISOString();
    if (action === "archive_failed_project_runs") {
        let archived = 0;
        for (const run of [...chat_runs_1.projectChatRuns.values()]) {
            if (run.status !== "failed")
                continue;
            (0, chat_runs_1.archiveProjectChatRun)(run.id, "清理中心归档失败项目运行");
            archived += 1;
        }
        return { success: true, action, archived };
    }
    if (action === "purge_archived_project_runs") {
        let purged = 0;
        const cleanup = { sessions: 0, executions: 0, checkpoints: 0, outputs: 0 };
        for (const run of [...chat_runs_1.projectChatRuns.values()]) {
            if (!(run.archived || run.deleted_at || run.status === "archived"))
                continue;
            const result = (0, chat_runs_1.purgeProjectChatRun)(run.id);
            if (!result)
                continue;
            purged += 1;
            cleanup.sessions += result.cleanup.sessions || 0;
            cleanup.executions += result.cleanup.executions || 0;
            cleanup.checkpoints += result.cleanup.checkpoints || 0;
            cleanup.outputs += result.cleanup.outputs || 0;
        }
        return { success: true, action, purged, cleanup };
    }
    if (action === "purge_archived_tasks") {
        const tasks = (0, db_1.loadTasks)();
        const keep = [];
        const cleanup = { sessions: 0, executions: 0, checkpoints: 0, outputs: 0 };
        let purged = 0;
        for (const task of tasks) {
            if (!(task.archived || task.deleted_at || task.status === "archived")) {
                keep.push(task);
                continue;
            }
            purged += 1;
            try {
                cleanup.sessions += (0, agent_sessions_1.purgeTaskAgentSessions)(task.id).length;
            }
            catch { }
            try {
                const artifacts = (0, execution_kernel_1.purgeTaskExecutionArtifacts)(task.id);
                cleanup.executions += artifacts.executions || 0;
                cleanup.checkpoints += artifacts.checkpoints || 0;
                cleanup.outputs += artifacts.outputs || 0;
            }
            catch { }
        }
        (0, db_1.saveTasks)(keep);
        return { success: true, action, purged, cleanup };
    }
    if (action === "purge_archived_cron") {
        const jobs = (0, db_1.loadCronJobs)();
        const keep = jobs.filter((job) => !(job.archived || job.deleted_at));
        (0, db_1.saveCronJobs)(keep);
        return { success: true, action, purged: jobs.length - keep.length, timestamp: now };
    }
    return { success: false, error: "不支持的清理动作" };
}
//# sourceMappingURL=cleanup-center.js.map