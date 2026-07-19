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
exports.projectChatRuns = exports.PROJECT_CHAT_RUNS_FILE = void 0;
exports.saveProjectChatRuns = saveProjectChatRuns;
exports.loadProjectChatRuns = loadProjectChatRuns;
exports.createProjectChatRun = createProjectChatRun;
exports.publicProjectChatRun = publicProjectChatRun;
exports.archiveProjectChatRun = archiveProjectChatRun;
exports.purgeProjectChatRun = purgeProjectChatRun;
exports.purgeProjectChatRunsForSession = purgeProjectChatRunsForSession;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const agent_sessions_1 = require("../tasks/agent-sessions");
const execution_kernel_1 = require("../agents/execution-kernel");
const utils_1 = require("../core/utils");
exports.PROJECT_CHAT_RUNS_FILE = path.join(utils_1.CCM_DIR, "project-chat-runs.json");
exports.projectChatRuns = new Map();
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
        message_mode: run.message_mode || "",
        workflow_decision: run.workflow_decision || null,
        workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [],
        parent_run_id: run.parent_run_id || "",
        project_session_id: run.project_session_id || "",
        project_session_generation: Number(run.project_session_generation || 0),
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
        const runs = [...exports.projectChatRuns.values()].map(serializableProjectChatRun).filter(Boolean).slice(-200);
        fs.mkdirSync(path.dirname(exports.PROJECT_CHAT_RUNS_FILE), { recursive: true });
        fs.writeFileSync(exports.PROJECT_CHAT_RUNS_FILE, JSON.stringify({ version: 1, updated_at: new Date().toISOString(), runs }, null, 2), "utf-8");
    }
    catch (error) {
        console.warn("[项目聊天运行] 持久化失败", error);
    }
}
function loadProjectChatRuns() {
    try {
        if (!fs.existsSync(exports.PROJECT_CHAT_RUNS_FILE))
            return;
        const data = JSON.parse(fs.readFileSync(exports.PROJECT_CHAT_RUNS_FILE, "utf-8"));
        const runs = Array.isArray(data?.runs) ? data.runs : [];
        for (const item of runs) {
            if (!item?.id)
                continue;
            exports.projectChatRuns.set(String(item.id), { ...item, child: null });
        }
    }
    catch (error) {
        console.warn("[项目聊天运行] 读取持久化记录失败", error);
    }
}
function createProjectChatRun(project, message, workDir, parentRunId = "", projectSessionId = "") {
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
    const run = { id: runId, trace_id: traceId, project, message, workDir, status: "running", checkpoint_id: checkpoint?.checkpointId || checkpoint?.id || "", checkpoint, parent_run_id: parentRunId, project_session_id: projectSessionId, project_session_generation: 0, task_session_scope_id: "", task_agent_session_id: "", native_session_id: "", resume_mode: "", created_at: now, updated_at: now, child: null, fileChanges: null, workEvents: [] };
    exports.projectChatRuns.set(runId, run);
    saveProjectChatRuns();
    return run;
}
function publicProjectChatRun(run) {
    if (!run)
        return null;
    return {
        id: run.id,
        trace_id: run.trace_id,
        project: run.project,
        status: run.status,
        message_mode: run.message_mode || "",
        workflow_decision: run.workflow_decision || null,
        checkpoint_id: run.checkpoint_id || "",
        rollback_available: !!run.checkpoint_id,
        parent_run_id: run.parent_run_id || "",
        project_session_id: run.project_session_id || "",
        project_session_generation: Number(run.project_session_generation || 0),
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
    const run = exports.projectChatRuns.get(String(id || "").trim());
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
    const run = exports.projectChatRuns.get(runId);
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
    const sharedProjectSessionBinding = !!String(run.project_session_id || "").trim();
    const cleanupIds = Array.from(new Set([
        run.id,
        ...(sharedProjectSessionBinding ? [] : [run.task_session_scope_id, run.task_agent_session_id]),
    ].map(value => String(value || "").trim()).filter(Boolean)));
    const cleanup = { sessions: 0, executions: 0, checkpoints: 0, outputs: 0 };
    for (const cleanupId of cleanupIds) {
        try {
            cleanup.sessions += (0, agent_sessions_1.purgeTaskAgentSessions)(cleanupId).length;
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
    exports.projectChatRuns.delete(runId);
    saveProjectChatRuns();
    return { run, cleanup };
}
function purgeProjectChatRunsForSession(project, projectSessionId) {
    const ids = [...exports.projectChatRuns.values()]
        .filter(run => String(run.project || "") === String(project || "") && String(run.project_session_id || "") === String(projectSessionId || ""))
        .map(run => String(run.id || ""))
        .filter(Boolean);
    const removed = ids.map(id => purgeProjectChatRun(id)).filter(Boolean);
    return { ids, removed };
}
//# sourceMappingURL=chat-runs.js.map