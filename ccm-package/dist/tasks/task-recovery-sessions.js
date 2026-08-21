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
exports.resolveTaskUserSession = resolveTaskUserSession;
exports.resolveTaskAgentSessionProjection = resolveTaskAgentSessionProjection;
exports.purgeTaskRecoveryUserSessions = purgeTaskRecoveryUserSessions;
const db_1 = require("../core/db");
const fs = __importStar(require("fs"));
const sessions_1 = require("../modules/projects/sessions");
const storage_1 = require("../modules/collaboration/storage");
const global_agent_1 = require("../modules/global/global-agent");
const task_context_1 = require("./task-context");
const WRITE_STATUSES = new Set(["pending", "queued", "in_progress", "running", "reviewing", "executing", "recovery_validating"]);
const text = (value, max = 400) => String(value ?? "").trim().slice(0, max);
const scopeOf = (task) => text(task?.source_channel || task?.request_origin, 40).toLowerCase().includes("feishu") ? "feishu" : text(task?.group_id) ? "group" : text(task?.target_project || task?.project_session_id) ? "project" : "global";
const scopeIdOf = (task, scope) => scope === "group" ? text(task?.group_id) : scope === "project" ? text(task?.target_project) : scope === "feishu" ? text(task?.target_id || task?.source_conversation_ref?.scopeId || "global") : "global";
const sourceSessionOf = (task) => text(task?.exact_session_id || task?.group_session_id || task?.project_session_id || task?.origin_session_id || task?.source_conversation_ref?.exactSessionId);
const activeSessionOf = (task) => text(task?.execution_session_id || task?.active_execution_session_id || [...(Array.isArray(task?.task_context?.sessionBindings) ? task.task_context.sessionBindings : [])].reverse().find((item) => item?.status === "active" && item?.role !== "source")?.exactSessionId || sourceSessionOf(task));
function isBusy(task, currentTaskId) {
    return String(task?.id || "") !== currentTaskId && WRITE_STATUSES.has(String(task?.status || "").toLowerCase()) && task?.requires_code_changes !== false;
}
function appendBinding(taskId, binding, expectedContextChecksum = "") {
    const result = (0, db_1.updateTaskByIdCas)(taskId, current => !expectedContextChecksum || String(current?.task_context?.checksum || "") === expectedContextChecksum, current => {
        const context = current?.task_context || (0, task_context_1.buildTaskContextCapsule)(current);
        const bindings = [...(Array.isArray(context.sessionBindings) ? context.sessionBindings : []).filter(item => item.bindingChecksum !== binding.bindingChecksum), binding];
        const next = { ...context, sessionBindings: bindings, revision: Number(context.revision || 0) + 1, updatedAt: new Date().toISOString() };
        delete next.checksum;
        next.checksum = require("crypto").createHash("sha256").update(JSON.stringify(next)).digest("hex");
        return { ...current, task_context: next, task_context_revision_receipt: { revision: next.revision, checksum: next.checksum, reason: "session_binding", at: next.updatedAt, contentStored: false } };
    });
    return result.updated ? result.task : null;
}
function findBusy(task, sessionId) {
    return (0, db_1.loadTasks)().find(item => String(item?.execution_session_id || item?.active_execution_session_id || item?.exact_session_id || item?.group_session_id || item?.project_session_id || item?.origin_session_id || "") === sessionId && isBusy(item, String(task?.id || "")));
}
function resolveTaskUserSession(taskInput, options = {}) {
    const task = (0, db_1.getTaskById)(text(taskInput?.id)) || taskInput;
    if (!task)
        throw new Error("任务不存在，无法恢复会话");
    const taskId = text(task.id);
    const scope = scopeOf(task);
    const scopeId = scopeIdOf(task, scope);
    const sourceSession = sourceSessionOf(task);
    const original = activeSessionOf(task);
    const attempt = Math.max(1, Number(options.attempt || task.execution_attempt || task.attempt || 0) + 1);
    let available = false;
    let archived = false;
    let originalSession = null;
    try {
        if (scope === "project") {
            originalSession = original ? (0, sessions_1.getSessionDetail)(scopeId, original) : null;
            available = !!originalSession;
            archived = originalSession?.archived === true || originalSession?.readOnly === true;
        }
        else if (scope === "group") {
            const row = (0, storage_1.listGroupChatSessions)(scopeId).sessions.find((x) => String(x.id) === original);
            originalSession = row || null;
            available = !!row;
            archived = row?.archived === true;
        }
        else if (scope === "global" || scope === "feishu") {
            const store = (0, global_agent_1.loadGlobalAgentHistoryStore)();
            originalSession = (store.sessions || []).find((x) => String(x.id) === original) || null;
            available = !!originalSession;
            archived = originalSession?.archived === true || originalSession?.readOnly === true;
        }
    }
    catch {
        available = false;
    }
    const busy = original ? findBusy(task, original) : null;
    const canReuse = !options.forceRecoverySession && available && !archived && !busy;
    let activeSessionId = original;
    let mode = "rejected";
    let reason = "permission_changed";
    let created = false;
    if (canReuse) {
        mode = "original_reused";
        reason = "original_reused";
    }
    else {
        reason = !available ? "original_missing" : archived ? "original_archived" : busy ? "session_busy" : "permission_changed";
        const title = `恢复任务 · ${text(task.title || task.business_goal || "未命名任务", 55)} · 第 ${attempt} 次执行`;
        try {
            if (scope === "project")
                activeSessionId = String((0, sessions_1.createProjectSessionRecord)(scopeId, title, "web", { sessionKind: "automation" }).sessionId || "");
            else if (scope === "group")
                activeSessionId = String((0, storage_1.createGroupChatSession)(scopeId, title, { sessionKind: "automation" }).id || "");
            else
                activeSessionId = String((0, global_agent_1.createGlobalAgentConversationSession)({ source: scope === "feishu" ? "feishu" : "web", name: title }).id || "");
            created = !!activeSessionId;
            mode = created ? "recovery_session_created" : "rejected";
        }
        catch (error) {
            return { mode: "rejected", originalSessionId: original || undefined, activeSessionId: undefined, reason, error: text(error?.message || error), created: false };
        }
    }
    if (!activeSessionId)
        return { mode: "rejected", originalSessionId: original || undefined, reason, created: false };
    const context = task.task_context || (0, task_context_1.buildTaskContextCapsule)(task);
    const binding = (0, task_context_1.createTaskSessionBinding)({ task, taskId, attempt, role: created ? "recovery" : "active_execution", scope, scopeId, exactSessionId: activeSessionId, originalSessionId: sourceSession || original || undefined, createdForRecovery: created, reason, revision: Number(context.revision || 0) });
    const updated = appendBinding(taskId, binding, options.expectedContextChecksum || "");
    if (!updated)
        return { mode: "rejected", originalSessionId: original || undefined, reason: "permission_changed", created: false, error: "任务上下文已变化，请重新恢复" };
    return { mode, originalSessionId: original || undefined, activeSessionId, created, reason, binding, task: updated };
}
function resolveTaskAgentSessionProjection(task, workItem, attempt, mode = "rehydrated_session") {
    const taskContext = task?.task_context || (0, task_context_1.buildTaskContextCapsule)(task);
    const previous = Array.isArray(workItem?.agent_session_ids) ? workItem.agent_session_ids.at(-1) : workItem?.agent_session_id;
    const raw = { taskId: text(task?.id), workItemId: text(workItem?.id || workItem?.workItemId), attempt: Math.max(1, Number(attempt || 1)), mode, ...(previous ? { previousAgentSessionId: text(previous) } : {}), provider: text(workItem?.provider || task?.provider || ""), project: text(workItem?.target || workItem?.project || task?.target_project), taskContextChecksum: text(taskContext.checksum, 160), workItemChecksum: require("crypto").createHash("sha256").update(JSON.stringify(workItem || {})).digest("hex"), workspaceManifestChecksum: text(taskContext.workspace?.manifestChecksum, 160), blockers: [], contentStored: false };
    return { ...raw, checksum: require("crypto").createHash("sha256").update(JSON.stringify(raw)).digest("hex") };
}
function purgeTaskRecoveryUserSessions(task) {
    const bindings = Array.isArray(task?.task_context?.sessionBindings) ? task.task_context.sessionBindings : [];
    const removed = [];
    for (const binding of bindings) {
        if (binding?.createdForRecovery !== true || !binding?.exactSessionId)
            continue;
        try {
            if (binding.scope === "group") {
                const result = (0, storage_1.deleteGroupChatSession)(String(binding.scopeId), String(binding.exactSessionId), { reason: "永久删除任务恢复会话" });
                if (result?.deleted || result?.session)
                    removed.push({ scope: binding.scope, sessionId: binding.exactSessionId });
            }
            else if (binding.scope === "global" || binding.scope === "feishu") {
                const result = (0, global_agent_1.deleteGlobalAgentConversationSession)(String(binding.exactSessionId), binding.scope === "feishu" ? "feishu" : "web");
                if (result?.deleted || result?.session || result?.lifecycleTombstone)
                    removed.push({ scope: binding.scope, sessionId: binding.exactSessionId });
            }
            else if (binding.scope === "project") {
                const file = (0, sessions_1.getSessionFilePath)(String(binding.scopeId), String(binding.exactSessionId));
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    removed.push({ scope: binding.scope, sessionId: binding.exactSessionId });
                }
            }
        }
        catch { /* cleanup is best effort; task purge remains authoritative */ }
    }
    return removed;
}
//# sourceMappingURL=task-recovery-sessions.js.map