#!/usr/bin/env node
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
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url = __importStar(require("url"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const tool_manager_1 = require("./tool-manager");
const agent_runtime_1 = require("./agent-runtime");
const task_agent_sessions_1 = require("./task-agent-sessions");
const runtime_tool_sync_1 = require("./runtime-tool-sync");
const execution_kernel_1 = require("./execution-kernel");
const project_memory_1 = require("./project-memory");
// 导入底座与持久层
const utils_1 = require("./utils");
const db_1 = require("./db");
// 导入子模块控制器
const projects_1 = require("./modules/projects");
const sessions_1 = require("./modules/sessions");
const git_1 = require("./modules/git");
const marketplace_1 = require("./modules/marketplace");
const templates_1 = require("./modules/templates");
const cron_1 = require("./modules/cron");
const tools_1 = require("./modules/tools");
const pets_1 = require("./modules/pets");
const music_1 = require("./modules/music");
const collaboration_1 = require("./modules/collaboration");
const reliability_drills_1 = require("./reliability-drills");
const soak_test_1 = require("./soak-test");
const process_lifecycle_1 = require("./process-lifecycle");
const global_agent_1 = require("./modules/global-agent");
const rag_1 = require("./modules/rag");
const slash_commands_1 = require("./modules/slash-commands");
const credential_store_1 = require("./credential-store");
const usability_1 = require("./modules/usability");
const sessions_2 = require("./modules/sessions");
// === 运行时内存状态与心跳推送 ===
const petStatusClients = new Set();
const petWorkspaceClients = new Set();
const stateCache = new Map();
const agentActivity = new Map();
const petWorkspaceTargets = new Map();
const MUSIC_PET_AGENT_NAME = "music-agent";
const GLOBAL_PET_AGENT_NAME = "global-agent";
const MUSIC_PET_AGENT_DEFAULT_LABEL = "乖乖";
const AGENT_RUNNER_DIR = path.join(utils_1.CCM_DIR, "agent-runner");
const AGENT_RUNNER_REQUESTS_DIR = path.join(AGENT_RUNNER_DIR, "requests");
const AGENT_RUNNER_RESULTS_DIR = path.join(AGENT_RUNNER_DIR, "results");
const PROJECT_CHAT_RUNS_FILE = path.join(utils_1.CCM_DIR, "project-chat-runs.json");
let musicPetState = {
    state: "idle",
    detail: "等待音乐指令",
    track: null,
    timestamp: Date.now(),
};
function getMusicPetAgentLabel() {
    try {
        if (!fs.existsSync(utils_1.PETS_FILE))
            return MUSIC_PET_AGENT_DEFAULT_LABEL;
        const data = JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8"));
        const config = data?.configs?.[MUSIC_PET_AGENT_NAME] || {};
        const label = String(config.label || config.petLabel || config.displayName || "").trim();
        return label ? label.slice(0, 24) : MUSIC_PET_AGENT_DEFAULT_LABEL;
    }
    catch {
        return MUSIC_PET_AGENT_DEFAULT_LABEL;
    }
}
// === 辅助广播及状态跟踪函数 ===
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
    catch { }
}
const projectChatRuns = new Map();
function serializableProjectChatRun(run) {
    if (!run)
        return null;
    return {
        id: run.id,
        trace_id: run.trace_id,
        project: run.project,
        message: run.message,
        workDir: run.workDir,
        status: run.status,
        checkpoint_id: run.checkpoint_id || "",
        checkpoint: run.checkpoint || null,
        rollback: run.rollback || null,
        fileChanges: run.fileChanges || null,
        workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [],
        parent_run_id: run.parent_run_id || "",
        task_session_scope_id: run.task_session_scope_id || "",
        task_agent_session_id: run.task_agent_session_id || "",
        native_session_id: run.native_session_id || "",
        resume_mode: run.resume_mode || "",
        archived: !!run.archived,
        archived_at: run.archived_at || "",
        deleted_at: run.deleted_at || "",
        deletion_reason: run.deletion_reason || "",
        created_at: run.created_at,
        updated_at: run.updated_at,
    };
}
function saveProjectChatRuns() {
    try {
        const runs = [...projectChatRuns.values()].map(serializableProjectChatRun).filter(Boolean).slice(-200);
        fs.mkdirSync(path.dirname(PROJECT_CHAT_RUNS_FILE), { recursive: true });
        fs.writeFileSync(PROJECT_CHAT_RUNS_FILE, JSON.stringify({ version: 1, updated_at: new Date().toISOString(), runs }, null, 2), "utf-8");
    }
    catch (error) {
        console.warn("[项目聊天运行] 持久化失败", error);
    }
}
function loadProjectChatRuns() {
    try {
        if (!fs.existsSync(PROJECT_CHAT_RUNS_FILE))
            return;
        const data = JSON.parse(fs.readFileSync(PROJECT_CHAT_RUNS_FILE, "utf-8"));
        const runs = Array.isArray(data?.runs) ? data.runs : [];
        for (const item of runs) {
            if (!item?.id)
                continue;
            projectChatRuns.set(String(item.id), { ...item, child: null });
        }
    }
    catch (error) {
        console.warn("[项目聊天运行] 读取持久化记录失败", error);
    }
}
function createProjectChatRun(project, message, workDir, parentRunId = "") {
    const now = new Date().toISOString();
    const runId = "pchat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    const traceId = "project_chat_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    let checkpoint = null;
    try {
        if (workDir)
            checkpoint = (0, execution_kernel_1.createExecutionCheckpoint)({ executionId: runId, taskId: runId, workDir, mode: "project-chat", label: `项目聊天执行：${project}` });
    }
    catch (error) {
        checkpoint = { success: false, error: error?.message || String(error) };
    }
    const run = { id: runId, trace_id: traceId, project, message, workDir, status: "running", checkpoint_id: checkpoint?.checkpointId || checkpoint?.id || "", checkpoint, parent_run_id: parentRunId, task_session_scope_id: "", task_agent_session_id: "", native_session_id: "", resume_mode: "", created_at: now, updated_at: now, child: null, fileChanges: null, workEvents: [] };
    projectChatRuns.set(runId, run);
    saveProjectChatRuns();
    return run;
}
loadProjectChatRuns();
function publicProjectChatRun(run) {
    if (!run)
        return null;
    return {
        id: run.id,
        trace_id: run.trace_id,
        project: run.project,
        status: run.status,
        checkpoint_id: run.checkpoint_id || "",
        rollback_available: !!run.checkpoint_id,
        parent_run_id: run.parent_run_id || "",
        task_session_scope_id: run.task_session_scope_id || "",
        task_agent_session_id: run.task_agent_session_id || "",
        native_session_id: run.native_session_id || "",
        resume_mode: run.resume_mode || "",
        archived: !!run.archived,
        archived_at: run.archived_at || "",
        deleted_at: run.deleted_at || "",
        deletion_reason: run.deletion_reason || "",
        created_at: run.created_at,
        updated_at: run.updated_at,
    };
}
function archiveProjectChatRun(id, reason = "用户删除项目执行记录") {
    const run = projectChatRuns.get(String(id || "").trim());
    if (!run)
        return null;
    if (run.child) {
        try {
            (0, execution_kernel_1.terminateManagedChildProcess)(run.child);
        }
        catch {
            try {
                run.child.kill();
            }
            catch { }
        }
    }
    run.status = run.status === "running" ? "cancelled" : (run.status || "archived");
    run.archived = true;
    run.archived_at = run.archived_at || new Date().toISOString();
    run.deleted_at = new Date().toISOString();
    run.deletion_reason = reason;
    run.updated_at = new Date().toISOString();
    saveProjectChatRuns();
    return run;
}
function purgeProjectChatRun(id) {
    const runId = String(id || "").trim();
    const run = projectChatRuns.get(runId);
    if (!run)
        return null;
    if (run.child) {
        try {
            (0, execution_kernel_1.terminateManagedChildProcess)(run.child);
        }
        catch {
            try {
                run.child.kill();
            }
            catch { }
        }
    }
    const cleanupIds = Array.from(new Set([
        run.id,
        run.task_session_scope_id,
        run.task_agent_session_id,
    ].map(value => String(value || "").trim()).filter(Boolean)));
    const cleanup = { sessions: 0, executions: 0, checkpoints: 0, outputs: 0 };
    for (const cleanupId of cleanupIds) {
        try {
            cleanup.sessions += (0, task_agent_sessions_1.purgeTaskAgentSessions)(cleanupId).length;
        }
        catch { }
        try {
            const artifacts = (0, execution_kernel_1.purgeTaskExecutionArtifacts)(cleanupId);
            cleanup.executions += Number(artifacts.executions || 0);
            cleanup.checkpoints += Number(artifacts.checkpoints || 0);
            cleanup.outputs += Number(artifacts.outputs || 0);
        }
        catch { }
    }
    projectChatRuns.delete(runId);
    saveProjectChatRuns();
    return { run, cleanup };
}
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
    const projectRuns = [...projectChatRuns.values()];
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
        for (const run of [...projectChatRuns.values()]) {
            if (run.status !== "failed")
                continue;
            archiveProjectChatRun(run.id, "清理中心归档失败项目运行");
            archived += 1;
        }
        return { success: true, action, archived };
    }
    if (action === "purge_archived_project_runs") {
        let purged = 0;
        const cleanup = { sessions: 0, executions: 0, checkpoints: 0, outputs: 0 };
        for (const run of [...projectChatRuns.values()]) {
            if (!(run.archived || run.deleted_at || run.status === "archived"))
                continue;
            const result = purgeProjectChatRun(run.id);
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
                cleanup.sessions += (0, task_agent_sessions_1.purgeTaskAgentSessions)(task.id).length;
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
        return { success: true, action, purged, cleanup, updated_at: now };
    }
    if (action === "purge_archived_cron") {
        const jobs = (0, db_1.loadCronJobs)();
        const keep = jobs.filter((job) => !(job.archived || job.deleted_at));
        (0, db_1.saveCronJobs)(keep);
        return { success: true, action, purged: jobs.length - keep.length, updated_at: now };
    }
    return { success: false, error: "不支持的清理动作" };
}
function bindProjectRunAgentSession(projectRun, projectName, agentType) {
    const parentRun = projectRun?.parent_run_id ? projectChatRuns.get(projectRun.parent_run_id) : null;
    const taskSessionScopeId = String(parentRun?.task_session_scope_id || parentRun?.parent_run_id || projectRun?.parent_run_id || projectRun?.id || "");
    const session = (0, task_agent_sessions_1.openTaskAgentSession)({
        scopeId: taskSessionScopeId,
        taskId: taskSessionScopeId,
        groupId: "project-chat",
        project: projectName,
        agentType,
    });
    projectRun.task_session_scope_id = taskSessionScopeId;
    projectRun.task_agent_session_id = session.id;
    projectRun.native_session_id = session.nativeSessionId || "";
    projectRun.resume_mode = session.resumeMode || "";
    saveProjectChatRuns();
    return { session, options: (0, task_agent_sessions_1.getTaskAgentSessionOptions)(session) };
}
function broadcastPetSpeech(agent, payload = {}) {
    const text = payload.text == null ? "" : String(payload.text);
    if (!agent || (!text.trim() && !payload.final))
        return;
    const source = payload.source || "project";
    const event = {
        type: "speech",
        agent,
        role: payload.role || "assistant",
        text,
        mode: payload.mode || "replace",
        final: !!payload.final,
        source,
        timestamp: new Date().toISOString(),
    };
    for (const client of petStatusClients)
        writeSse(client, event);
    if (agent !== GLOBAL_PET_AGENT_NAME && agent !== MUSIC_PET_AGENT_NAME && ["project", "group", "task"].includes(String(source))) {
        if (shouldKeepGlobalPetPrimaryActivity())
            return;
        const mirrorText = text.trim() ? `${agent}：${text}` : "";
        const mirror = {
            ...event,
            agent: GLOBAL_PET_AGENT_NAME,
            text: mirrorText,
            source: `workspace-${source}`,
        };
        for (const client of petStatusClients)
            writeSse(client, mirror);
    }
}
function broadcastPetConfigChanged() {
    const event = {
        type: "config",
        timestamp: new Date().toISOString(),
    };
    for (const client of petStatusClients)
        writeSse(client, event);
}
function sanitizePetNavigationTarget(target = {}) {
    const tab = String(target.tab || "").trim();
    if (tab === "music")
        return { tab: "music" };
    if (tab === "global-agent")
        return { tab: "global-agent" };
    if (tab === "groups") {
        return {
            tab: "groups",
            groupId: target.groupId ? String(target.groupId) : "",
            keyword: target.keyword ? String(target.keyword) : "",
        };
    }
    if (tab === "projects") {
        return {
            tab: "projects",
            project: target.project ? String(target.project) : "",
            sessionId: target.sessionId ? String(target.sessionId) : "",
            keyword: target.keyword ? String(target.keyword) : "",
        };
    }
    return { tab: "projects", project: target.project ? String(target.project) : "" };
}
function setAgentWorkspaceTarget(name, target = null) {
    if (!name || !target)
        return;
    petWorkspaceTargets.set(name, {
        ...sanitizePetNavigationTarget(target),
        updatedAt: Date.now(),
    });
}
function getPetNavigationTarget(agent) {
    const name = String(agent || "").trim();
    if (name === MUSIC_PET_AGENT_NAME)
        return { tab: "music" };
    if (name === GLOBAL_PET_AGENT_NAME)
        return { tab: "global-agent" };
    const existing = petWorkspaceTargets.get(name);
    if (existing?.tab) {
        const { updatedAt, ...target } = existing;
        return target;
    }
    const project = (0, db_1.getConfigs)().find(c => c.name === name);
    if (project)
        return { tab: "projects", project: name };
    return { tab: "projects" };
}
function buildPetNavigationUrl(target) {
    const params = new URLSearchParams();
    params.set("tab", target?.tab || "projects");
    if (target?.project)
        params.set("project", String(target.project));
    if (target?.sessionId)
        params.set("sessionId", String(target.sessionId));
    if (target?.groupId)
        params.set("groupId", String(target.groupId));
    if (target?.keyword)
        params.set("keyword", String(target.keyword));
    return `http://localhost:${PORT}/?${params.toString()}`;
}
function broadcastPetNavigation(agent, target) {
    const event = {
        type: "navigate",
        agent,
        target,
        url: buildPetNavigationUrl(target),
        timestamp: new Date().toISOString(),
    };
    for (const client of petStatusClients)
        writeSse(client, event);
    return event;
}
const PROJECT_IDLE_ACTION_STRATEGY = [
    { state: "idle", seconds: 20, detail: "空闲，等待指令" },
    { state: "idle", seconds: 20, detail: "待机小动作随机播放" },
    { state: "yawning", seconds: 8, detail: "长时间无任务时轻微放松" },
    { state: "idle", seconds: 12, detail: "回到安静待机" },
];
const PROJECT_IDLE_ACTION_CYCLE_MS = PROJECT_IDLE_ACTION_STRATEGY.reduce((sum, item) => sum + item.seconds * 1000, 0);
const PROJECT_ACTIVE_ACTION_STRATEGY = [
    { state: "working", seconds: 90, detail: "Agent 调用中", trigger: "用户向项目 Agent 提问、群聊协作、定时任务执行" },
    { state: "planning", seconds: 15, detail: "正在规划下一步", trigger: "全局 Agent 形成决策、拆任务或选择工具" },
    { state: "building", seconds: 90, detail: "正在实现/执行", trigger: "全局 Agent 或子 Agent 开始执行开发任务" },
    { state: "debugging", seconds: 60, detail: "正在排查失败", trigger: "工具失败、测试失败、执行器恢复或返工" },
    { state: "reviewing", seconds: 45, detail: "正在验收/复盘", trigger: "工具完成、代码审查、最终验收" },
    { state: "waiting", seconds: 300, detail: "等待用户确认", trigger: "需要用户确认、澄清或继续授权" },
    { state: "happy", seconds: 12, detail: "任务完成", trigger: "项目 Agent 成功完成回复或协作任务" },
    { state: "error", seconds: 45, detail: "错误", trigger: "项目 Agent 调用失败或任务执行报错" },
    { state: "attention", seconds: 12, detail: "正在展示回复", trigger: "项目 Agent 输出消息气泡时" },
];
function getProjectPetActionStrategy() {
    return {
        idleCycleSeconds: Math.round(PROJECT_IDLE_ACTION_CYCLE_MS / 1000),
        idle: PROJECT_IDLE_ACTION_STRATEGY.map((item, index) => ({ order: index + 1, ...item })),
        active: PROJECT_ACTIVE_ACTION_STRATEGY.map((item, index) => ({ order: index + 1, ...item })),
    };
}
function getActivityDurationMs(state) {
    const normalized = normalizePetState(state);
    const durations = {
        idle: 10000,
        thinking: 10000,
        planning: 15000,
        working: 90000,
        building: 90000,
        debugging: 60000,
        reviewing: 45000,
        waiting: 300000,
        happy: 10000,
        attention: 10000,
        notification: 10000,
        error: 45000,
        carrying: 10000,
        sweeping: 10000,
        juggling: 10000,
        yawning: 10000,
        dozing: 10000,
        collapsing: 10000,
        sleeping: 10000,
        waking: 10000,
    };
    return durations[normalized] || 60000;
}
function getAgentRunActivityDuration(timeoutMs) {
    return Math.max((timeoutMs || 300000) + 30000, getActivityDurationMs("working"));
}
function hashString(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}
function getProjectAmbientPetState(name, now = Date.now()) {
    const offset = hashString(name) % PROJECT_IDLE_ACTION_CYCLE_MS;
    let cursor = (now + offset) % PROJECT_IDLE_ACTION_CYCLE_MS;
    for (const item of PROJECT_IDLE_ACTION_STRATEGY) {
        const span = item.seconds * 1000;
        if (cursor < span)
            return item;
        cursor -= span;
    }
    return PROJECT_IDLE_ACTION_STRATEGY[0];
}
function broadcastAgentActivityState(name, state, detail = "", timestamp = Date.now()) {
    const event = {
        type: "state",
        agent: name,
        displayName: name,
        state,
        lastActivity: new Date(timestamp).toISOString(),
        detail,
    };
    for (const client of petStatusClients)
        writeSse(client, event);
    if (name !== GLOBAL_PET_AGENT_NAME && name !== MUSIC_PET_AGENT_NAME) {
        if (shouldKeepGlobalPetPrimaryActivity())
            return;
        const mirror = {
            ...event,
            agent: GLOBAL_PET_AGENT_NAME,
            displayName: getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent"),
            detail: detail ? `${name}：${detail}` : `${name} 状态更新`,
        };
        for (const client of petStatusClients)
            writeSse(client, mirror);
    }
}
function shouldKeepGlobalPetPrimaryActivity(now = Date.now()) {
    const activity = agentActivity.get(GLOBAL_PET_AGENT_NAME);
    if (!activity)
        return false;
    const active = activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000;
    if (!active)
        return false;
    return new Set([
        "thinking",
        "planning",
        "building",
        "debugging",
        "reviewing",
        "waiting",
    ]).has(normalizePetState(activity.state));
}
function setAgentActivity(name, state, detail = "", workspaceTarget = null, durationMs) {
    if (workspaceTarget)
        setAgentWorkspaceTarget(name, workspaceTarget);
    const timestamp = Date.now();
    const normalizedState = normalizePetState(state);
    agentActivity.set(name, {
        state: normalizedState,
        timestamp,
        detail,
        expiresAt: timestamp + (durationMs || getActivityDurationMs(normalizedState)),
    });
    stateCache.delete(name);
    broadcastAgentActivityState(name, normalizedState, detail, timestamp);
}
function getSystemPetActivity(name, fallbackDetail = "") {
    const now = Date.now();
    const activity = agentActivity.get(name);
    if (activity && (activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000)) {
        return {
            state: normalizePetState(activity.state),
            lastActivity: new Date(activity.timestamp).toISOString(),
            detail: activity.detail || fallbackDetail,
        };
    }
    return {
        state: "idle",
        lastActivity: new Date().toISOString(),
        detail: fallbackDetail,
    };
}
function normalizePetState(state) {
    const value = String(state || "idle");
    const allowed = new Set([
        "idle", "working", "thinking", "error", "happy", "attention",
        "notification", "carrying", "sweeping", "juggling", "yawning",
        "dozing", "collapsing", "sleeping", "waking", "planning",
        "building", "debugging", "reviewing", "waiting", "drag",
    ]);
    return allowed.has(value) ? value : "idle";
}
function setMusicPetState(state, detail = "", track = null) {
    setAgentWorkspaceTarget(MUSIC_PET_AGENT_NAME, { tab: "music" });
    const displayName = getMusicPetAgentLabel();
    musicPetState = {
        state: normalizePetState(state),
        detail: detail || "等待音乐指令",
        track: track || null,
        timestamp: Date.now(),
    };
    const event = {
        type: "state",
        agent: MUSIC_PET_AGENT_NAME,
        displayName,
        state: musicPetState.state,
        lastActivity: new Date(musicPetState.timestamp).toISOString(),
        detail: musicPetState.detail,
        track: musicPetState.track,
    };
    for (const client of petStatusClients)
        writeSse(client, event);
}
function getMusicPetAgent() {
    const displayName = getMusicPetAgentLabel();
    return {
        name: MUSIC_PET_AGENT_NAME,
        displayName,
        petLabel: displayName,
        virtual: true,
        type: "music",
        agent: "music",
        running: true,
        state: musicPetState.state,
        lastActivity: new Date(musicPetState.timestamp).toISOString(),
        stateDetail: musicPetState.detail,
        track: musicPetState.track,
    };
}
function getPetConfigLabel(agentName, fallback) {
    try {
        if (!fs.existsSync(utils_1.PETS_FILE))
            return fallback;
        const data = JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8"));
        const label = String(data?.configs?.[agentName]?.label || "").trim();
        return label || fallback;
    }
    catch {
        return fallback;
    }
}
function getGlobalPetAgent() {
    const displayName = getPetConfigLabel(GLOBAL_PET_AGENT_NAME, "全局 Agent");
    const current = getSystemPetActivity(GLOBAL_PET_AGENT_NAME, "等待全局指令");
    return {
        name: GLOBAL_PET_AGENT_NAME,
        displayName,
        petLabel: displayName,
        virtual: true,
        type: "global",
        agent: "global",
        running: true,
        state: current.state,
        lastActivity: current.lastActivity,
        stateDetail: current.detail,
    };
}
function getPetAgents() {
    const configs = (0, db_1.getConfigs)();
    const projectNames = new Set(configs.map(c => c.name));
    const customAgents = [];
    try {
        if (fs.existsSync(utils_1.PETS_FILE)) {
            const data = JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8"));
            const petConfigs = data.configs || {};
            for (const name of Object.keys(petConfigs)) {
                if (name !== MUSIC_PET_AGENT_NAME && name !== GLOBAL_PET_AGENT_NAME && !projectNames.has(name)) {
                    const cfg = petConfigs[name];
                    customAgents.push({
                        name: name,
                        displayName: cfg.label || name,
                        petLabel: cfg.label || name,
                        virtual: true,
                        type: "custom",
                        agent: "custom",
                        running: true,
                        state: "idle",
                        lastActivity: new Date().toISOString(),
                        stateDetail: "自定义挂件",
                    });
                }
            }
        }
    }
    catch (e) {
        console.error("[pet] 读取自定义宠物配置失败", e);
    }
    return [getGlobalPetAgent(), getMusicPetAgent(), ...customAgents];
}
function getAgentState(name) {
    const now = Date.now();
    const activity = agentActivity.get(name);
    if (activity && (activity.expiresAt ? now < activity.expiresAt : now - activity.timestamp < 60000)) {
        return {
            state: normalizePetState(activity.state),
            lastActivity: new Date(activity.timestamp).toISOString(),
            detail: activity.detail,
            processRunning: true,
            cachedAt: now
        };
    }
    const cached = stateCache.get(name);
    if (cached && now - cached.cachedAt < 2000)
        return cached;
    const pidFile = path.join(utils_1.PID_DIR, `${name}.pid`);
    let state = "sleeping";
    let lastActivity = null;
    let detail = "";
    let processRunning = false;
    try {
        if (!fs.existsSync(pidFile)) {
            const result = { state: "idle", lastActivity: new Date(now).toISOString(), detail: "待命中", processRunning: false, cachedAt: now };
            stateCache.set(name, result);
            return result;
        }
        const pid = fs.readFileSync(pidFile, "utf-8").trim();
        try {
            process.kill(parseInt(pid), 0);
            processRunning = true;
            const ambient = getProjectAmbientPetState(name, now);
            state = ambient.state;
            detail = ambient.detail;
            lastActivity = new Date(now).toISOString();
        }
        catch {
            try {
                fs.unlinkSync(pidFile);
            }
            catch { }
            state = "idle";
            detail = "待命中";
        }
    }
    catch {
        state = "idle";
        detail = "状态未知";
    }
    const result = {
        state: normalizePetState(state),
        lastActivity,
        detail,
        processRunning,
        cachedAt: now
    };
    stateCache.set(name, result);
    return result;
}
// === Agent 并行/同步调用底座 ===
function normalizeToolSelection(tools = {}) {
    return {
        mcp: Array.isArray(tools.mcp) ? tools.mcp.map((x) => String(x).trim()).filter(Boolean) : [],
        skill: Array.isArray(tools.skill) ? tools.skill.map((x) => String(x).trim()).filter(Boolean) : [],
    };
}
function getProjectToolSelection(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    return normalizeToolSelection(configs?.[projectName]?.tools || {});
}
function normalizeVerificationCommands(value) {
    const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
    const seen = new Set();
    const commands = [];
    for (const item of raw) {
        const command = String(item || "").trim();
        if (!command || seen.has(command))
            continue;
        seen.add(command);
        commands.push(command);
    }
    return commands.slice(0, 8);
}
function getProjectVerificationCommandsForRunner(projectName) {
    const configs = (0, db_1.loadProjectConfigs)();
    const projectConfig = configs?.[projectName] || {};
    return normalizeVerificationCommands(projectConfig.verification_commands
        || projectConfig.verificationCommands
        || projectConfig.test_commands
        || projectConfig.testCommands
        || projectConfig.check_commands
        || projectConfig.checkCommands);
}
async function runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType) {
    const commands = getProjectVerificationCommandsForRunner(projectName).filter(execution_kernel_1.isSafeVerificationCommand);
    if (!commands.length || !workDir)
        return "";
    const verification = [];
    const failed = [];
    const results = [];
    const perCommandTimeout = Math.max(30_000, Math.min(timeoutMs || 300_000, 180_000));
    for (const command of commands) {
        try {
            const managed = await (0, execution_kernel_1.runManagedCommand)({
                taskId,
                executionId,
                command,
                cwd: workDir,
                timeoutMs: perCommandTimeout,
                maxOutputBytes: 5 * 1024 * 1024,
                env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), []),
            });
            verification.push(`${command} passed by external runner (exit 0)`);
            results.push({ command, status: "passed", exitCode: 0, output: String(managed.stdout || "").slice(-4000) });
        }
        catch (error) {
            const exitCode = error?.exitCode ?? error?.status ?? null;
            failed.push(`${command} failed by external runner${exitCode === null ? "" : ` (exit ${exitCode})`}`);
            results.push({ command, status: "failed", exitCode, output: String(error?.stdout || error?.stderr || error?.message || error || "").slice(-4000) });
        }
    }
    return "\n\nCCM_RUNNER_VERIFICATION\n```json\n" + JSON.stringify({
        ccm_runner_verification: true,
        status: failed.length ? "failed" : "passed",
        verification,
        failed,
        results,
    }, null, 2) + "\n```";
}
function extractVerificationCommandsFromMessage(message) {
    const text = String(message || "");
    const commands = [];
    const add = (value) => {
        for (const part of value.split(/[；;，,]/)) {
            const command = part.trim();
            if (/^(npm run [\w:-]+|mvn \w+|gradle \w+|pytest|go test\b.*|cargo test\b.*)$/i.test(command))
                commands.push(command);
        }
    };
    for (const match of text.matchAll(/推荐优先执行的项目验证：([^\n]+)/g))
        add(match[1] || "");
    for (const match of text.matchAll(/验证命令：([^\n]+)/g))
        add(match[1] || "");
    return normalizeVerificationCommands(commands);
}
function buildAgentCliAllowedTools(projectName, message = "") {
    const commands = normalizeVerificationCommands([
        ...getProjectVerificationCommandsForRunner(projectName),
        ...extractVerificationCommandsFromMessage(message),
    ]);
    const rules = [];
    for (const command of commands) {
        rules.push(`Bash(${command})`);
        if (process.platform === "win32")
            rules.push(`PowerShell(${command})`);
    }
    return Array.from(new Set(rules));
}
function buildProjectToolContext(projectName, workDir = "", agentType = "claudecode") {
    const allowedTools = getProjectToolSelection(projectName);
    const audit = (0, runtime_tool_sync_1.syncRuntimeTools)(workDir, agentType, allowedTools);
    (0, runtime_tool_sync_1.recordRuntimeToolSyncAudit)(audit, projectName);
    const prompt = tool_manager_1.toolManager.buildToolPrompt(allowedTools) + (0, runtime_tool_sync_1.buildRuntimeToolSyncPrompt)(audit);
    const workEvent = {
        id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        time: new Date().toISOString(),
        agent: projectName,
        kind: audit.mode === "failed" ? "error" : "tool",
        text: audit.mode === "native-and-proxy"
            ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已同步原生工具：MCP ${audit.synced.mcp.length}，Skill ${audit.synced.skill.length}${audit.warnings?.length ? `；${audit.warnings.join("；")}` : ""}`
            : audit.mode === "ccm-proxy-only"
                ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式`
                : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`,
        runtimeToolSync: audit,
    };
    return { prompt, allowedTools, audit, workEvent };
}
function ensureAgentRunnerDirs() {
    for (const dir of [AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, utils_1.UPLOAD_DIR]) {
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
}
function isSpawnPermissionError(error) {
    const text = `${error?.code || ""} ${error?.message || ""} ${error?.stderr || ""}`;
    return /\bEPERM\b|spawnSync .* EPERM|spawn .* EPERM/i.test(text);
}
function createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
    ensureAgentRunnerDirs();
    const id = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const request = {
        id,
        projectName,
        workDir,
        agentType: (0, agent_runtime_1.normalizeAgentRuntimeId)(agentType || "claudecode"),
        timeoutMs,
        allowedTools,
        mcpConfigPath,
        agentSession: agentSession || null,
        taskId: String(executionInfo?.taskId || ""),
        executionId: String(executionInfo?.executionId || executionInfo?.taskId || ""),
        cliAllowedTools: buildAgentCliAllowedTools(projectName, message),
        message,
        status: "pending",
        created_at: new Date().toISOString(),
    };
    const tmpFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.tmp`);
    const requestFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(request, null, 2), "utf-8");
    fs.renameSync(tmpFile, requestFile);
    return { id, requestFile, resultFile: path.join(AGENT_RUNNER_RESULTS_DIR, `${id}.json`) };
}
async function waitForAgentRunnerResult(resultFile, timeoutMs) {
    const started = Date.now();
    const pollMs = 1000;
    while (Date.now() - started < Math.max(1000, timeoutMs || 300000)) {
        if (fs.existsSync(resultFile)) {
            try {
                return JSON.parse(fs.readFileSync(resultFile, "utf-8").replace(/^\uFEFF/, ""));
            }
            catch { }
        }
        await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    throw new Error("外部 Agent Runner 等待超时；请运行 npm run agent-runner:ps 或 npm run agent-runner 启用外部执行通道");
}
async function callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
    const request = createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
    if (executionInfo?.executionId)
        (0, execution_kernel_1.registerExternalRunnerRequest)(executionInfo.executionId, request.id);
    const result = await waitForAgentRunnerResult(request.resultFile, timeoutMs);
    if (!result?.success) {
        const label = result?.command || (0, agent_runtime_1.getAgentCommandLabel)(agentType);
        const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
        throw new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`);
    }
    const output = await appendToolResults(String(result.output || "").trim(), allowedTools);
    return { output, fileChanges: result.fileChanges || null, runnerRequestId: request.id, nativeSessionId: result.nativeSessionId || "" };
}
async function appendToolResults(output, allowedTools = null) {
    const calls = tool_manager_1.toolManager.parseToolCalls(output);
    if (calls.length === 0)
        return output;
    const results = [];
    for (const call of calls) {
        try {
            const res = await tool_manager_1.toolManager.executeToolCall(call.name, call.arguments, allowedTools || undefined);
            results.push(`[工具结果: ${call.name}]\n${res}`);
        }
        catch (err) {
            results.push(`[工具错误: ${call.name}] ${err.message}`);
        }
    }
    return output + "\n\n" + results.join("\n\n");
}
async function callAgent(projectName, message, workDir, agentType, timeoutMs, workspaceTarget = null) {
    setAgentActivity(projectName, "working", "Agent 调用中", workspaceTarget || { tab: "projects", project: projectName }, getAgentRunActivityDuration(timeoutMs));
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = (0, agent_runtime_1.buildAgentCommand)(agentType, tmpMsg, { mcpConfigPath: workspaceTarget?.mcpConfigPath, ...(workspaceTarget?.agentSession || {}) });
    const taskId = String(workspaceTarget?.taskId || workspaceTarget?.executionId || `standalone-${projectName}-${Date.now()}`);
    const executionId = String(workspaceTarget?.executionId || workspaceTarget?.taskId || "");
    try {
        const managed = await (0, execution_kernel_1.runManagedCommand)({
            taskId,
            executionId,
            command: cmd,
            cwd: safeCwd,
            timeoutMs: timeoutMs || 300000,
            maxOutputBytes: Number(workspaceTarget?.maxOutputBytes || 2 * 1024 * 1024),
            env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), workspaceTarget?.envAllowlist || []),
            project: projectName,
            agentType,
            source: workspaceTarget?.probe ? "agent-probe" : "project-agent",
            commandLabel: (0, agent_runtime_1.getAgentCommandLabel)(agentType),
            title: String(workspaceTarget?.title || message || "").slice(0, 120),
        });
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        const normalized = (0, agent_runtime_1.normalizeAgentCommandOutput)(agentType, managed.stdout);
        const bounded = (0, execution_kernel_1.persistBoundedOutput)(taskId, normalized.output, Number(workspaceTarget?.maxContextOutputBytes || 256 * 1024));
        let output = await appendToolResults(bounded.content, workspaceTarget?.allowedTools);
        if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
            output += await runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType);
        }
        const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
        (0, db_1.recordMetric)(projectName, {
            success: true,
            durationMs: Date.now() - startedAt,
            fileChangeCount: fileChanges?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "assistant", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "happy", "任务完成");
        setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
        return output;
    }
    catch (e) {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        if (isSpawnPermissionError(e)) {
            try {
                const runner = await callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, workspaceTarget?.allowedTools, workspaceTarget?.mcpConfigPath, workspaceTarget?.agentSession, { taskId, executionId });
                const fileChanges = runner.fileChanges || (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                (0, db_1.recordMetric)(projectName, {
                    success: true,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0
                });
                broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "project" });
                setAgentActivity(projectName, "happy", "外部 Runner 任务完成");
                setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
                return runner.output;
            }
            catch (runnerError) {
                const output = `[${projectName}] Agent Runner 错误: ${runnerError.message || runnerError}`;
                (0, db_1.recordMetric)(projectName, {
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
                });
                broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
                setAgentActivity(projectName, "error", "外部 Runner 错误");
                return output;
            }
        }
        const output = e.killed || e.signal === "SIGTERM"
            ? `[${projectName}] Agent 响应超时，请稍后重试`
            : `[${projectName}] Agent 错误: ${(e.stderr || e.message || "").substring(0, 200)}`;
        (0, db_1.recordMetric)(projectName, {
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "error", text: output, final: true, source: "project" });
        setAgentActivity(projectName, "error", "错误");
        return output;
    }
}
function callAgentForGroupStream(projectName, message, workDir, agentType, options = {}) {
    const groupId = options.groupId;
    setAgentActivity(projectName, "working", options.detail || "群聊协作中", groupId ? { tab: "groups", groupId } : { tab: "groups" }, getAgentRunActivityDuration(options.timeoutMs));
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
        fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
    }
    fs.writeFileSync(tmpMsg, message, "utf-8");
    const cmd = (0, agent_runtime_1.buildAgentCommand)(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...(options.agentSession || {}) });
    const taskId = String(options.taskId || options.executionId || `standalone-${projectName}-${Date.now()}`);
    const executionId = String(options.executionId || options.taskId || "");
    const streamRes = options.res;
    const workEvents = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
    const pushWorkEvent = (kind, text, extra = {}) => {
        const event = {
            id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            agent: projectName,
            kind,
            text: String(text || "").slice(0, 2400),
            ...extra,
        };
        workEvents.push(event);
        if (workEvents.length > 80)
            workEvents.splice(0, workEvents.length - 80);
        writeSse(streamRes, { type: "agent_work_event", agent: projectName, event });
        return event;
    };
    const thinkingText = `🧠 ${projectName} 正在思考...`;
    pushWorkEvent("status", thinkingText);
    writeSse(streamRes, { type: "status", text: thinkingText, agent: projectName });
    broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 正在思考...`, source: "group" });
    return new Promise((resolve) => {
        let child = null;
        let stopTracking = () => { };
        try {
            child = (0, child_process_1.spawn)(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true, env: (0, execution_kernel_1.sanitizeExecutionEnv)((0, runtime_tool_sync_1.getRuntimeExecutionEnv)(agentType), options.envAllowlist || []) });
            stopTracking = (0, execution_kernel_1.trackManagedChildProcess)(taskId, executionId, child, {
                project: projectName,
                agentType,
                source: options.probe ? "agent-probe" : "group-agent",
                cwd: safeCwd,
                timeoutMs: options.timeoutMs || 300000,
                commandLabel: (0, agent_runtime_1.getAgentCommandLabel)(agentType),
                title: String(options.title || message || "").slice(0, 120),
            });
        }
        catch (spawnError) {
            if (!isSpawnPermissionError(spawnError)) {
                const text = `❌ 错误: ${spawnError.message || spawnError}`;
                writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
                resolve(text);
                return;
            }
            const runnerText = `🧩 ${projectName} 交给外部 Agent Runner 执行...`;
            pushWorkEvent("status", runnerText);
            writeSse(streamRes, { type: "status", text: runnerText, agent: projectName });
            callAgentViaExternalRunner(projectName, message, workDir, agentType, options.timeoutMs || 300000, options.allowedTools, options.mcpConfigPath, options.agentSession, { taskId, executionId })
                .then((runner) => {
                const fileChanges = runner.fileChanges || (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                (0, db_1.recordMetric)(projectName, {
                    success: true,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0
                });
                try {
                    if (typeof options.onDone === "function") {
                        pushWorkEvent("done", "外部 Runner 执行完成", { final: true, fileChanges });
                        options.onDone({ text: runner.output, fileChanges, isError: false, runnerRequestId: runner.runnerRequestId, nativeSessionId: runner.nativeSessionId || "", workEvents });
                    }
                }
                catch { }
                writeSse(streamRes, { type: "agent_done", agent: projectName, text: runner.output, fileChanges, messageId: options.messageId, workEvents });
                broadcastPetSpeech(projectName, { role: "assistant", text: runner.output, final: true, source: "group" });
                setAgentActivity(projectName, "happy", "外部 Runner 回复完成");
                setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
                resolve(runner.output);
            })
                .catch((runnerError) => {
                const text = `❌ Agent Runner 错误: ${runnerError.message || runnerError}`;
                (0, db_1.recordMetric)(projectName, {
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
                });
                try {
                    if (typeof options.onDone === "function") {
                        pushWorkEvent("error", text, { final: true });
                        options.onDone({ text, fileChanges: null, isError: true, workEvents });
                    }
                }
                catch { }
                writeSse(streamRes, { type: "agent_done", agent: projectName, text, messageId: options.messageId, workEvents });
                broadcastPetSpeech(projectName, { role: "error", text, final: true, source: "group" });
                setAgentActivity(projectName, "error", "外部 Runner 错误");
                resolve(text);
            });
            return;
        }
        child.stdin.end();
        let output = "";
        let stderrOutput = "";
        let settled = false;
        const timeoutId = setTimeout(() => {
            try {
                if (child?.exitCode === null && child?.signalCode === null)
                    (0, execution_kernel_1.terminateManagedChildProcess)(child);
            }
            catch { }
            finish("⏰ 响应超时", true).catch(() => { });
        }, options.timeoutMs || 300000);
        const finish = async (text, isError = false) => {
            if (settled)
                return;
            settled = true;
            stopTracking();
            clearTimeout(timeoutId);
            try {
                if (child)
                    (0, execution_kernel_1.terminateManagedChildProcess)(child);
            }
            catch { }
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
            let finalText = text || output.trim();
            const normalized = isError ? { output: finalText, sessionId: "" } : (0, agent_runtime_1.normalizeAgentCommandOutput)(agentType, finalText);
            finalText = normalized.output;
            finalText = (0, execution_kernel_1.persistBoundedOutput)(taskId, finalText, Number(options.maxContextOutputBytes || 256 * 1024)).content;
            if (!isError) {
                finalText = await appendToolResults(finalText, options.allowedTools);
                if (!/CCM_AGENT_PROBE_OK|执行通道健康探针/i.test(message)) {
                    finalText += await runIndependentProjectVerification(projectName, workDir, options.timeoutMs || 300000, taskId, executionId, agentType);
                }
            }
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            (0, db_1.recordMetric)(projectName, {
                success: !isError,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0
            });
            try {
                if (typeof options.onDone === "function") {
                    pushWorkEvent(isError ? "error" : "done", isError ? finalText : "执行完成", { final: true, fileChanges });
                    options.onDone({ text: finalText, fileChanges, isError, nativeSessionId: normalized.sessionId || options.agentSession?.sessionId || "", workEvents });
                }
            }
            catch { }
            writeSse(streamRes, { type: "agent_done", agent: projectName, text: finalText, fileChanges, messageId: options.messageId, workEvents });
            broadcastPetSpeech(projectName, { role: isError ? "error" : "assistant", text: finalText, final: true, source: "group" });
            setAgentActivity(projectName, isError ? "error" : "happy", isError ? "错误" : "群聊回复完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
            resolve(finalText);
        };
        child.stdout.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
            if (!text)
                return;
            output += text;
            const jsonSessionStream = ["codex", "cursor"].includes((0, agent_runtime_1.normalizeAgentRuntimeId)(agentType)) && !!options.agentSession?.persistSession;
            if (!jsonSessionStream) {
                pushWorkEvent("output", text);
                writeSse(streamRes, { type: "chunk", agent: projectName, text });
                broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "group" });
            }
        });
        child.stderr.on("data", (chunk) => {
            const text = chunk.toString("utf-8");
            stderrOutput = (stderrOutput + text).slice(-12000);
            if (text.trim() && !output.trim()) {
                const runningText = `🧠 ${projectName} 运行中...`;
                pushWorkEvent("status", runningText);
                writeSse(streamRes, { type: "status", text: runningText, agent: projectName });
                broadcastPetSpeech(projectName, { role: "status", text: `${projectName} 运行中...`, source: "group" });
            }
        });
        child.on("close", (code) => {
            const failed = typeof code === "number" && code !== 0;
            const text = failed ? (output.trim() || stderrOutput.trim() || `Agent 进程退出，exitCode=${code}`) : output.trim();
            finish(text, failed).catch((err) => finish(`❌ 错误: ${err.message}`, true));
        });
        child.on("error", (err) => { finish(`❌ 错误: ${err.message}`, true).catch(() => { }); });
    });
}
// 流式调用 Agent（SSE）
function callAgentStream(projectName, message, workDir, agentType, res, options = {}) {
    const startedAt = Date.now();
    const changeSnapshot = workDir ? (0, utils_1.createFileChangeSnapshot)(workDir) : null;
    const projectRun = createProjectChatRun(projectName, options.userMessage || message, workDir, String(options.parentRunId || options.parent_run_id || ""));
    const { session: taskAgentSession, options: taskAgentSessionOptions } = bindProjectRunAgentSession(projectRun, projectName, agentType);
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(utils_1.UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    const executionBrief = (0, project_memory_1.buildProjectExecutionBrief)(projectName, options.userMessage || message, {
        workDir,
        query: options.userMessage || message,
        verificationHints: getProjectVerificationCommandsForRunner(projectName),
    });
    fs.writeFileSync(tmpMsg, executionBrief, "utf-8");
    const cmd = (0, agent_runtime_1.buildAgentCommand)(agentType, tmpMsg, { mcpConfigPath: options.mcpConfigPath, ...taskAgentSessionOptions });
    const send = (data) => writeSse(res, data);
    const workEvents = Array.isArray(options.initialWorkEvents) ? options.initialWorkEvents.slice(-20) : [];
    const pushProjectWorkEvent = (kind, text, extra = {}) => {
        const event = {
            id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            agent: projectName,
            kind,
            text: String(text || "").slice(0, 2400),
            ...extra,
        };
        workEvents.push(event);
        if (workEvents.length > 80)
            workEvents.splice(0, workEvents.length - 80);
        send({ type: "work_event", event });
        return event;
    };
    // 设置 SSE
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
    });
    if (typeof res.flushHeaders === "function")
        res.flushHeaders();
    send({ type: "task_runtime", run: publicProjectChatRun(projectRun), taskExperience: {
            task_id: projectRun.id,
            trace_id: projectRun.trace_id,
            title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
            goal: String(options.userMessage || "").slice(0, 240),
            status: "in_progress",
            phase: "executing",
            session_ids: [taskAgentSession.id],
            parent_run_id: projectRun.parent_run_id || "",
            rollback_available: !!projectRun.checkpoint_id,
        } });
    for (const event of workEvents)
        send({ type: "work_event", event });
    // 发送状态事件
    pushProjectWorkEvent("status", "Agent 正在思考...");
    send({ type: "status", text: "Agent 正在思考..." });
    broadcastPetSpeech(projectName, { role: "status", text: "Agent 正在思考...", source: "project" });
    setAgentActivity(projectName, "working", "正在处理消息", null, getAgentRunActivityDuration(300000));
    const child = (0, child_process_1.spawn)(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
    const stopProjectChatTracking = (0, execution_kernel_1.trackManagedChildProcess)(projectRun.id, projectRun.id, child, {
        project: projectName,
        agentType,
        source: "project-chat",
        cwd: safeCwd,
        timeoutMs: 300000,
        commandLabel: (0, agent_runtime_1.getAgentCommandLabel)(agentType),
        title: String(options.userMessage || message || "").slice(0, 120),
    });
    projectRun.child = child;
    projectRun.updated_at = new Date().toISOString();
    saveProjectChatRuns();
    // 关闭 stdin（已通过临时文件传入）
    child.stdin.end();
    let fullOutput = "";
    let stderrOutput = "";
    let finished = false;
    let timeoutTimer = null;
    let lastStderrStatusAt = 0;
    const jsonSessionStream = ["codex", "cursor"].includes((0, agent_runtime_1.normalizeAgentRuntimeId)(agentType)) && !!taskAgentSessionOptions.persistSession;
    const heartbeatTimer = setInterval(() => {
        if (!res.writableEnded && !res.destroyed) {
            try {
                res.write(": keep-alive\n\n");
            }
            catch { }
        }
    }, 15000);
    child.stdout.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (!text)
            return;
        fullOutput += text;
        if (jsonSessionStream)
            return;
        pushProjectWorkEvent("output", text);
        send({ type: "chunk", text });
        broadcastPetSpeech(projectName, { role: "assistant", text, mode: "append", source: "project" });
    });
    child.stderr.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        stderrOutput += text;
        const now = Date.now();
        if (text.trim() && now - lastStderrStatusAt > 1500) {
            lastStderrStatusAt = now;
            pushProjectWorkEvent("status", "Agent 处理中...");
            send({ type: "status", text: "Agent 处理中..." });
            broadcastPetSpeech(projectName, { role: "status", text: "Agent 处理中...", source: "project" });
        }
    });
    child.on("close", (code) => {
        if (finished)
            return;
        finished = true;
        stopProjectChatTracking();
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
        clearInterval(heartbeatTimer);
        (async () => {
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
            const normalized = (0, agent_runtime_1.normalizeAgentCommandOutput)(agentType, fullOutput.trim());
            const nativeFailure = (0, agent_runtime_1.detectAgentCommandFailure)(agentType, fullOutput.trim(), code, stderrOutput);
            let displayOutput = normalized.output || fullOutput.trim();
            if (nativeFailure.failed) {
                const failedSession = (0, task_agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { nativeSessionId: normalized.sessionId, success: false, error: nativeFailure.message }) || taskAgentSession;
                projectRun.native_session_id = failedSession.nativeSessionId || normalized.sessionId || projectRun.native_session_id || "";
                projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
                if (jsonSessionStream && displayOutput) {
                    pushProjectWorkEvent("output", displayOutput);
                    send({ type: "chunk", text: displayOutput });
                }
                const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
                projectRun.status = "failed";
                projectRun.fileChanges = fileChanges;
                projectRun.workEvents = workEvents;
                projectRun.updated_at = new Date().toISOString();
                saveProjectChatRuns();
                (0, db_1.recordMetric)(projectName, {
                    success: false,
                    durationMs: Date.now() - startedAt,
                    fileChangeCount: fileChanges?.count || 0
                });
                setAgentActivity(projectName, "error", "执行失败");
                pushProjectWorkEvent("error", nativeFailure.message || "Agent 执行失败", { final: true, fileChanges });
                send({ type: "error", text: nativeFailure.message || "Agent 执行失败", fileChanges, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
                        task_id: projectRun.id,
                        trace_id: projectRun.trace_id,
                        title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
                        goal: String(options.userMessage || "").slice(0, 240),
                        status: "failed",
                        phase: "failed",
                        session_ids: [failedSession.id],
                        parent_run_id: projectRun.parent_run_id || "",
                        rollback_available: !!projectRun.checkpoint_id,
                    } });
                res.end();
                return;
            }
            const updatedSession = (0, task_agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { nativeSessionId: normalized.sessionId, success: true }) || taskAgentSession;
            projectRun.native_session_id = updatedSession.nativeSessionId || normalized.sessionId || projectRun.native_session_id || "";
            projectRun.resume_mode = updatedSession.resumeMode || projectRun.resume_mode || "";
            if (jsonSessionStream && displayOutput) {
                pushProjectWorkEvent("output", displayOutput);
                send({ type: "chunk", text: displayOutput });
            }
            const outputWithTools = await appendToolResults(displayOutput, options.allowedTools);
            const toolAppend = outputWithTools.slice(displayOutput.length);
            if (toolAppend) {
                pushProjectWorkEvent("output", toolAppend);
                send({ type: "chunk", text: toolAppend });
                broadcastPetSpeech(projectName, { role: "assistant", text: toolAppend, mode: "append", source: "project" });
            }
            broadcastPetSpeech(projectName, { role: "assistant", text: "", mode: "append", final: true, source: "project" });
            const fileChanges = (0, utils_1.getFileChanges)(projectName, changeSnapshot);
            projectRun.status = "done";
            projectRun.fileChanges = fileChanges;
            projectRun.workEvents = workEvents;
            projectRun.updated_at = new Date().toISOString();
            saveProjectChatRuns();
            (0, db_1.recordMetric)(projectName, {
                success: true,
                durationMs: Date.now() - startedAt,
                fileChangeCount: fileChanges?.count || 0
            });
            setAgentActivity(projectName, "happy", "任务完成");
            setTimeout(() => setAgentActivity(projectName, "idle", "空闲"), 10000);
            pushProjectWorkEvent("done", "执行完成", { final: true, fileChanges });
            send({ type: "done", fileChanges, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
                    task_id: projectRun.id,
                    trace_id: projectRun.trace_id,
                    title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
                    goal: String(options.userMessage || "").slice(0, 240),
                    status: "done",
                    phase: "completed",
                    session_ids: [updatedSession.id],
                    parent_run_id: projectRun.parent_run_id || "",
                    rollback_available: !!projectRun.checkpoint_id,
                } });
            res.end();
        })().catch((err) => {
            pushProjectWorkEvent("error", err.message, { final: true });
            const failedSession = (0, task_agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
            projectRun.status = "failed";
            projectRun.workEvents = workEvents;
            projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
            projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
            projectRun.updated_at = new Date().toISOString();
            saveProjectChatRuns();
            send({ type: "error", text: err.message, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
                    task_id: projectRun.id,
                    trace_id: projectRun.trace_id,
                    title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
                    goal: String(options.userMessage || "").slice(0, 240),
                    status: "failed",
                    phase: "failed",
                    session_ids: [failedSession.id],
                    parent_run_id: projectRun.parent_run_id || "",
                    rollback_available: !!projectRun.checkpoint_id,
                } });
            try {
                res.end();
            }
            catch { }
        });
    });
    child.on("error", (err) => {
        if (finished)
            return;
        finished = true;
        stopProjectChatTracking();
        if (timeoutTimer)
            clearTimeout(timeoutTimer);
        clearInterval(heartbeatTimer);
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        pushProjectWorkEvent("error", err.message, { final: true });
        const failedSession = (0, task_agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { success: false, error: err.message }) || taskAgentSession;
        projectRun.status = "failed";
        projectRun.workEvents = workEvents;
        projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
        projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        send({ type: "error", text: err.message, workEvents, run: publicProjectChatRun(projectRun), taskExperience: {
                task_id: projectRun.id,
                trace_id: projectRun.trace_id,
                title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
                goal: String(options.userMessage || "").slice(0, 240),
                status: "failed",
                phase: "failed",
                session_ids: [failedSession.id],
                parent_run_id: projectRun.parent_run_id || "",
                rollback_available: !!projectRun.checkpoint_id,
            } });
        (0, db_1.recordMetric)(projectName, {
            success: false,
            durationMs: Date.now() - startedAt,
            fileChangeCount: (0, utils_1.getFileChanges)(projectName, changeSnapshot)?.count || 0
        });
        broadcastPetSpeech(projectName, { role: "error", text: err.message, final: true, source: "project" });
        setAgentActivity(projectName, "error", "错误");
        res.end();
    });
    // 超时处理
    timeoutTimer = setTimeout(() => {
        if (finished)
            return;
        finished = true;
        stopProjectChatTracking();
        clearInterval(heartbeatTimer);
        try {
            child.kill();
        }
        catch { }
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        const failedSession = (0, task_agent_sessions_1.recordTaskAgentSessionTurn)(taskAgentSession.id, { success: false, error: "Agent 响应超时" }) || taskAgentSession;
        projectRun.status = "failed";
        projectRun.native_session_id = failedSession.nativeSessionId || projectRun.native_session_id || "";
        projectRun.resume_mode = failedSession.resumeMode || projectRun.resume_mode || "";
        projectRun.updated_at = new Date().toISOString();
        saveProjectChatRuns();
        send({ type: "error", text: "Agent 响应超时", run: publicProjectChatRun(projectRun), taskExperience: {
                task_id: projectRun.id,
                trace_id: projectRun.trace_id,
                title: String(options.userMessage || "项目 Agent 执行").slice(0, 90),
                goal: String(options.userMessage || "").slice(0, 240),
                status: "failed",
                phase: "failed",
                session_ids: [failedSession.id],
                parent_run_id: projectRun.parent_run_id || "",
                rollback_available: !!projectRun.checkpoint_id,
            } });
        res.end();
    }, 300000);
}
// === HTTP 静态服务逻辑 ===
function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
        ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
        ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
        ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
        ".map": "application/json",
    };
    const contentType = types[ext] || "application/octet-stream";
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not Found");
        return;
    }
    const headers = { "Content-Type": contentType };
    if (ext === ".html")
        headers["Content-Type"] = "text/html; charset=utf-8";
    if (ext === ".js" || ext === ".css")
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
}
function createCollabCtx() {
    return {
        PORT,
        callAgent,
        callAgentForGroupStream,
        setAgentActivity,
        broadcastPetSpeech,
        createFileChangeSnapshot: utils_1.createFileChangeSnapshot,
        getFileChanges: utils_1.getFileChanges,
        recordMetric: db_1.recordMetric,
        toolManager: tool_manager_1.toolManager,
        buildUploadedFilesContext: utils_1.buildUploadedFilesContext,
        summarizeUploadedFiles: utils_1.summarizeUploadedFiles,
        buildFilesContext: utils_1.buildFilesContext,
        collectRequestBuffer: utils_1.collectRequestBuffer,
        getMultipartBoundary: utils_1.getMultipartBoundary,
        parseMultipart: utils_1.parseMultipart,
        getSharedFilePath: utils_1.getSharedFilePath,
        createSharedFileRecord: utils_1.createSharedFileRecord,
        normalizeSharedFileList: utils_1.normalizeSharedFileList,
        onTaskStatusChange: cron_1.syncCronTaskStatus,
    };
}
// === 主生命周期请求拦截与模块化分流 ===
function handleRequest(req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname || "/";
    // CORS 头支持
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    if (pathname === "/api/agent-runs" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            runs: (0, execution_kernel_1.listActiveAgentRuns)({
                taskId: parsed.query.task_id || parsed.query.taskId,
                project: parsed.query.project,
            }),
            generated_at: new Date().toISOString(),
        });
        return;
    }
    if (pathname === "/api/agent-runs/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, execution_kernel_1.cancelActiveAgentRun)(payload);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return;
    }
    // 1. SSE 实时状态数据管道单独拦截
    if (pathname === "/api/status/stream" && req.method === "GET") {
        const clientType = String(parsed.query.client || "").trim();
        const isWorkspaceClient = clientType === "workspace";
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        petStatusClients.add(res);
        if (isWorkspaceClient)
            petWorkspaceClients.add(res);
        const snapshot = getPetAgents();
        writeSse(res, { type: "snapshot", agents: snapshot });
        const prevStates = {};
        snapshot.forEach(s => { prevStates[s.name] = s.state; });
        const interval = setInterval(() => {
            try {
                const currentSnapshot = getPetAgents();
                for (const s of currentSnapshot) {
                    if (prevStates[s.name] !== s.state) {
                        prevStates[s.name] = s.state;
                        writeSse(res, {
                            type: "state",
                            agent: s.name,
                            displayName: s.displayName,
                            state: s.state,
                            lastActivity: s.lastActivity,
                            detail: s.stateDetail,
                            track: s.track || null
                        });
                    }
                }
            }
            catch { }
        }, 1000);
        req.on("close", () => {
            clearInterval(interval);
            petStatusClients.delete(res);
            petWorkspaceClients.delete(res);
        });
        return;
    }
    // 2. 静态页面与 React SPA 托管
    if (pathname === "/" || pathname === "/index.html") {
        return sendFile(res, path.join(utils_1.PUBLIC_DIR, "index.html"));
    }
    if (pathname.startsWith("/assets/") || pathname.startsWith("/public/") ||
        pathname.startsWith("/css/") || pathname.startsWith("/js/") ||
        pathname === "/favicon.svg" || pathname === "/icons.svg" || pathname === "/favicon.ico") {
        const filePath = path.join(utils_1.PUBLIC_DIR, pathname.startsWith("/public/") ? pathname.replace("/public/", "") : pathname);
        if (fs.existsSync(filePath)) {
            return sendFile(res, filePath);
        }
    }
    // SPA fallback
    if (!pathname.startsWith("/api/") && req.method === "GET") {
        const filePath = path.join(utils_1.PUBLIC_DIR, pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return sendFile(res, filePath);
        }
        return sendFile(res, path.join(utils_1.PUBLIC_DIR, "index.html"));
    }
    // 提供飞书扫码二维码等临时文件访问的动态路由
    if (pathname.startsWith("/api/uploads/") && req.method === "GET") {
        const filename = pathname.split("/").pop();
        if (filename) {
            const filePath = path.join(utils_1.UPLOAD_DIR, filename);
            console.log("[文件访问] 请求文件:", filename, "路径:", filePath, "存在:", fs.existsSync(filePath));
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filename).toLowerCase();
                const types = { ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml" };
                res.writeHead(200, {
                    "Content-Type": types[ext] || "application/octet-stream",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache"
                });
                fs.createReadStream(filePath).pipe(res);
                return;
            }
        }
        (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
        return;
    }
    // 3. 构建依赖注入上下文 (Contexts)
    const projectsCtx = {
        PORT,
        getSessions: sessions_2.getSessions,
        getAgentState,
    };
    const petsCtx = {
        PORT,
        getPetAgents: getPetAgents,
        getPetNavigationTarget,
        broadcastPetNavigation,
        broadcastPetConfigChanged,
        getProjectPetActionStrategy,
        petWorkspaceClientsSize: petWorkspaceClients.size,
    };
    const musicCtx = {
        getMusicPetAgent,
        setMusicPetState,
        broadcastPetSpeech,
        MUSIC_PET_AGENT_NAME,
    };
    const collabCtx = createCollabCtx();
    if (pathname === "/api/project-runs/self-test" && req.method === "GET") {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-project-run-"));
        let runForCleanup = null;
        let continuationRunForCleanup = null;
        try {
            (0, child_process_1.execSync)("git init", { cwd: dir, stdio: "ignore" });
            fs.writeFileSync(path.join(dir, "tracked.txt"), "before\n", "utf-8");
            (0, child_process_1.execSync)("git add tracked.txt", { cwd: dir, stdio: "ignore" });
            (0, child_process_1.execSync)("git -c user.name=ccm -c user.email=ccm@example.local commit -m init", { cwd: dir, stdio: "ignore" });
            const run = createProjectChatRun("self-test-project", "修改 tracked.txt", dir);
            runForCleanup = run;
            const firstSession = bindProjectRunAgentSession(run, "self-test-project", "claudecode").session;
            const afterFirstTurn = (0, task_agent_sessions_1.recordTaskAgentSessionTurn)(firstSession.id, { nativeSessionId: firstSession.nativeSessionId, success: true }) || firstSession;
            const continuationRun = createProjectChatRun("self-test-project", "继续修改 tracked.txt", dir, run.id);
            continuationRunForCleanup = continuationRun;
            const continuationSession = bindProjectRunAgentSession(continuationRun, "self-test-project", "claudecode").session;
            if (!run.checkpoint_id)
                return (0, utils_1.sendJson)(res, { success: false, error: run.checkpoint?.error || "未创建检查点", run: publicProjectChatRun(run), checkpoint: run.checkpoint }, 500);
            fs.writeFileSync(path.join(dir, "tracked.txt"), "after\n", "utf-8");
            const beforeRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
            const rollback = (0, execution_kernel_1.rollbackExecutionCheckpoint)(run.checkpoint_id, "project run self-test", { allowShared: true });
            const afterRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
            const normalizedAfter = afterRollback.replace(/\r\n/g, "\n");
            let persistedBeforeCleanup = false;
            try {
                const persisted = JSON.parse(fs.readFileSync(PROJECT_CHAT_RUNS_FILE, "utf-8"));
                persistedBeforeCleanup = (persisted.runs || []).some((item) => item.id === run.id && item.checkpoint_id === run.checkpoint_id);
            }
            catch { }
            const continuationReusesSession = continuationRun.task_session_scope_id === run.id
                && continuationRun.task_agent_session_id === run.task_agent_session_id
                && continuationSession.id === firstSession.id
                && Number(continuationSession.turnCount || 0) >= Number(afterFirstTurn.turnCount || 0);
            (0, utils_1.sendJson)(res, { success: rollback.success && beforeRollback === "after\n" && normalizedAfter === "before\n" && persistedBeforeCleanup && continuationReusesSession, run: publicProjectChatRun(run), continuationRun: publicProjectChatRun(continuationRun), rollback, checks: { hasRunId: !!run.id, hasTrace: !!run.trace_id, hasCheckpoint: !!run.checkpoint_id, rollbackRestored: normalizedAfter === "before\n", persistedRunRecord: persistedBeforeCleanup, continuationReusesTaskAgentSession: continuationReusesSession }, contents: { beforeRollback, afterRollback } });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 500);
        }
        finally {
            if (continuationRunForCleanup?.checkpoint_id) {
                try {
                    (0, execution_kernel_1.rollbackExecutionCheckpoint)(continuationRunForCleanup.checkpoint_id, "project run continuation self-test cleanup", { allowShared: true });
                }
                catch { }
            }
            if (runForCleanup?.id) {
                projectChatRuns.delete(runForCleanup.id);
            }
            if (continuationRunForCleanup?.id)
                projectChatRuns.delete(continuationRunForCleanup.id);
            if (runForCleanup?.id || continuationRunForCleanup?.id)
                saveProjectChatRuns();
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        return;
    }
    if (pathname === "/api/project-runs/get" && req.method === "GET") {
        const id = String(parsed.query.id || parsed.query.run_id || "").trim();
        const run = id ? projectChatRuns.get(id) : null;
        if (!run)
            return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        return (0, utils_1.sendJson)(res, { success: true, run: publicProjectChatRun(run), fileChanges: run.fileChanges || null, workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [] });
    }
    if (pathname === "/api/project-runs/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = projectChatRuns.get(id);
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                if (run.child) {
                    try {
                        (0, execution_kernel_1.terminateManagedChildProcess)(run.child);
                    }
                    catch {
                        try {
                            run.child.kill();
                        }
                        catch { }
                    }
                }
                run.status = "cancelled";
                run.updated_at = new Date().toISOString();
                saveProjectChatRuns();
                (0, utils_1.sendJson)(res, { success: true, run: publicProjectChatRun(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/project-runs/rollback" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = projectChatRuns.get(id);
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                if (!run.checkpoint_id)
                    return (0, utils_1.sendJson)(res, { success: false, error: "该项目执行没有可用检查点" }, 409);
                const rollback = (0, execution_kernel_1.rollbackExecutionCheckpoint)(run.checkpoint_id, payload.reason || "用户从项目聊天安全撤销", { allowShared: true });
                run.status = "reverted";
                run.rollback = rollback;
                run.updated_at = new Date().toISOString();
                saveProjectChatRuns();
                (0, utils_1.sendJson)(res, { success: true, run: publicProjectChatRun(run), rollback });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/project-runs/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = archiveProjectChatRun(id, String(payload.reason || "用户删除项目执行记录").slice(0, 500));
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                (0, utils_1.sendJson)(res, { success: true, archived: true, run: publicProjectChatRun(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/project-runs/purge" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const result = purgeProjectChatRun(id);
                if (!result)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, run_id: id, cleanup: result.cleanup });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/summary" && req.method === "GET") {
        return (0, utils_1.sendJson)(res, getCleanupSummary());
    }
    if (pathname === "/api/cleanup/preview" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = previewCleanupAction(String(payload.action || ""));
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                if (payload.confirm !== true)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少确认参数 confirm=true" }, 400);
                const result = runCleanupAction(String(payload.action || ""));
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    // === 流式发送消息给 Agent（SSE）===
    if (pathname === "/api/send-stream" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleStreamSend = (project, message, files = [], parentRunId = "") => {
            const finalMessage = files && files.length > 0
                ? `${message || ""}${(0, utils_1.buildUploadedFilesContext)(files, "本次消息附件")}`
                : (message || "");
            if (!project || !finalMessage.trim())
                return (0, utils_1.sendJson)(res, { error: "参数不足" }, 400);
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, agent_runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            const toolContext = buildProjectToolContext(project, workDir, agentType);
            if (resolvedRuntime.switched) {
                toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
                toolContext.workEvent.runtimeFallback = resolvedRuntime;
            }
            const fullMessage = `${toolContext.prompt}\n\n${finalMessage}`;
            callAgentStream(project, fullMessage, workDir, agentType, res, { allowedTools: toolContext.allowedTools, mcpConfigPath: toolContext.audit.mcpConfigPath, initialWorkEvents: [toolContext.workEvent], userMessage: finalMessage, parentRunId });
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                try {
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    handleStreamSend(fields.project, fields.message, files, String(fields.parent_run_id || fields.parentRunId || ""));
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, message, parent_run_id, parentRunId } = JSON.parse(body);
                handleStreamSend(project, message, [], String(parent_run_id || parentRunId || ""));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 发送消息给 Agent（非流式）===
    if (pathname === "/api/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleSend = async (project, message, files) => {
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            if (!workDir)
                return (0, utils_1.sendJson)(res, { error: "无法获取项目目录" }, 400);
            let fullMessage = message || "";
            if (files && files.length > 0) {
                const filesContext = (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件");
                fullMessage = fullMessage ? `${fullMessage}${filesContext}` : `请处理以下附件：${filesContext}`;
            }
            if (!fullMessage)
                return (0, utils_1.sendJson)(res, { error: "消息不能为空" }, 400);
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, agent_runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            const toolContext = buildProjectToolContext(project, workDir, agentType);
            const promptWithTools = `${toolContext.prompt}\n\n${fullMessage}`;
            try {
                const output = await callAgent(project, promptWithTools, workDir, agentType, 120000, {
                    tab: "projects",
                    project,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: toolContext.audit.mcpConfigPath,
                });
                (0, utils_1.sendJson)(res, { success: true, output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.stdout || e.stderr || e.message || "发送失败" }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    await handleSend(fields.project, fields.message, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            });
            return;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project, message } = JSON.parse(body);
                await handleSend(project, message, null);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 4. API 子模块分流拦截
    if ((0, projects_1.handleProjectsApi)(pathname, req, res, parsed, projectsCtx))
        return;
    if ((0, sessions_1.handleSessionsApi)(pathname, req, res, parsed))
        return;
    if ((0, git_1.handleGitApi)(pathname, req, res, parsed))
        return;
    if ((0, marketplace_1.handleMarketplaceApi)(pathname, req, res, parsed))
        return;
    if ((0, templates_1.handleTemplatesApi)(pathname, req, res, parsed))
        return;
    if ((0, cron_1.handleCronApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, tools_1.handleToolsAndMetricsApi)(pathname, req, res, parsed))
        return;
    if ((0, pets_1.handlePetsApi)(pathname, req, res, parsed, petsCtx))
        return;
    if ((0, music_1.handleMusicApi)(pathname, req, res, parsed, musicCtx))
        return;
    if ((0, collaboration_1.handleCollaborationApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, global_agent_1.handleGlobalAgentApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, rag_1.handleRagApi)(pathname, req, res, parsed))
        return;
    if ((0, slash_commands_1.handleSlashCommandsApi)(pathname, req, res, parsed))
        return;
    if ((0, usability_1.handleUsabilityApi)(pathname, req, res))
        return;
    const { handleMemoryCenterApi } = require("./modules/memory-control-center");
    if (handleMemoryCenterApi(pathname, req, res, parsed))
        return;
    // 404 fallback
    (0, utils_1.sendJson)(res, { error: "Not Found" }, 404);
}
// === 启动服务器 ===
function bootstrapServerRuntime(startupCollabCtx, port) {
    (0, utils_1.refreshEnvPath)();
    const credentialMigration = (0, credential_store_1.migrateConfigDirectory)(utils_1.CONFIGS_DIR);
    const controlBotMigration = (0, credential_store_1.migrateTomlCredentials)(path.join(utils_1.CCM_DIR, "control-bot", "config.toml"));
    const protectedFeishuConfig = (0, db_1.loadFeishuConfig)();
    if (Object.keys(protectedFeishuConfig || {}).length)
        (0, db_1.saveFeishuConfig)(protectedFeishuConfig);
    const migratedCredentials = credentialMigration.credentials + controlBotMigration.count;
    if (migratedCredentials > 0)
        console.log(`[凭据安全] 已迁移 ${migratedCredentials} 个明文凭据到本机加密存储；建议轮换曾以明文保存的密钥`);
    tool_manager_1.toolManager.loadTools().catch((e) => console.error("[ToolManager]", e.message));
    (0, cron_1.startCronScheduler)(startupCollabCtx);
    (0, collaboration_1.startTaskWatchdog)(startupCollabCtx);
    const autoAgentRecoveryMonitor = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_AGENT_RECOVERY_MONITOR || ""));
    if (autoAgentRecoveryMonitor) {
        (0, collaboration_1.startAgentRecoveryMonitor)(startupCollabCtx);
    }
    else {
        console.log("[执行通道恢复监控] 默认关闭；执行通道探针仅在用户点击“复检执行通道”或手动运行恢复监控时触发");
    }
    const globalMemoryBootstrap = (0, global_agent_1.bootstrapGlobalAgentMemoryForServer)();
    if (globalMemoryBootstrap.total > 0)
        console.log(`[全局记忆] 启动迁移/同步 ${globalMemoryBootstrap.migrated}/${globalMemoryBootstrap.total} 个历史会话`);
    const missionSupervisor = (0, global_agent_1.startGlobalMissionSupervisionForServer)(startupCollabCtx);
    if (missionSupervisor.resumed > 0)
        console.log(`[全局任务监工] 启动恢复 ${missionSupervisor.resumed} 个异步监督任务`);
    (0, reliability_drills_1.startReliabilityDrillScheduler)();
    (0, usability_1.startUsabilityArchiveScheduler)();
    const soakResume = (0, soak_test_1.resumeSoakTest)();
    if (soakResume.resumed)
        console.log("[Soak Test] 已恢复未完成的稳定性浸泡测试");
    const resumeResult = (0, collaboration_1.resumeTaskQueues)(startupCollabCtx);
    if (resumeResult.total > 0) {
        console.log(resumeResult.manual_recovery
            ? `[任务队列] 启动发现 ${resumeResult.total} 个可恢复自动任务，已进入手动恢复模式`
            : `[任务队列] 启动恢复 ${resumeResult.resumed}/${resumeResult.total} 个自动执行任务`);
    }
}
function startServer(port) {
    PORT = port;
    const startupCollabCtx = createCollabCtx();
    const server = http.createServer(handleRequest);
    server.on("close", () => {
        (0, cron_1.stopCronScheduler)();
        (0, collaboration_1.stopTaskWatchdog)();
        (0, collaboration_1.stopAgentRecoveryMonitor)();
        (0, global_agent_1.stopGlobalMissionSupervisionForServer)();
        (0, reliability_drills_1.stopReliabilityDrillScheduler)();
        (0, usability_1.stopUsabilityArchiveScheduler)();
        (0, soak_test_1.shutdownSoakMonitor)();
    });
    server.listen(port, () => {
        // Port ownership is the fail-closed singleton gate. No schedulers, queue
        // recovery, soak resume, or mutable startup work may run before it succeeds.
        bootstrapServerRuntime(startupCollabCtx, port);
        console.log(`\n╔══════════════════════════════════════╗`);
        console.log(`║     ccm Web 控制台                    ║`);
        console.log(`╚══════════════════════════════════════╝\n`);
        console.log(`  地址: http://localhost:${port}`);
        console.log(`  按 Ctrl+C 停止\n`);
        void (0, global_agent_1.resumeGlobalAgentLoopsForServer)(startupCollabCtx, port)
            .then(result => { if (result.total > 0)
            console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`); })
            .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`));
        try {
            const feishuConfig = (0, db_1.loadFeishuConfig)();
            const hasControlBotCredentials = !!((feishuConfig.control_bot_app_id || feishuConfig.app_id) && (feishuConfig.control_bot_app_secret || feishuConfig.app_secret));
            if (feishuConfig.control_bot_enabled === true && hasControlBotCredentials) {
                const result = (0, projects_1.startControlBotConnection)(port);
                console.log(`[飞书控制机器人] ${result.message || "长连接已启动"}${result.pid ? ` (PID: ${result.pid})` : ""}`);
            }
        }
        catch (error) {
            console.warn(`[飞书控制机器人] 自动启动失败：${error?.message || error}`);
        }
    });
    return server;
}
let PORT = 3080;
if (require.main === module) {
    PORT = parseInt(process.argv[2]) || 3080;
    (0, process_lifecycle_1.installProcessLifecycleFaultHandlers)();
    const server = startServer(PORT);
    let lifecycleHeartbeat = null;
    server.prependOnceListener("listening", () => {
        (0, process_lifecycle_1.initializeProcessLifecycle)();
        lifecycleHeartbeat = setInterval(() => (0, process_lifecycle_1.touchProcessLifecycle)(), 30_000);
        lifecycleHeartbeat.unref?.();
    });
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        if (lifecycleHeartbeat)
            clearInterval(lifecycleHeartbeat);
        (0, process_lifecycle_1.markProcessShutdown)({ category: "system_shutdown", reason: `收到 ${signal}，执行受控退出`, signal, exit_code: 0 });
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5_000).unref?.();
    };
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("exit", code => (0, process_lifecycle_1.markProcessShutdown)({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}
module.exports = { startServer };
//# sourceMappingURL=server.js.map