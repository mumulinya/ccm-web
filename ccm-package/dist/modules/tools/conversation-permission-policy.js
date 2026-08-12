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
exports.readConversationPermissionPolicy = readConversationPermissionPolicy;
exports.updateConversationPermissionPolicy = updateConversationPermissionPolicy;
exports.permissionSnapshotForTask = permissionSnapshotForTask;
exports.authorizeProjectChildAgentStart = authorizeProjectChildAgentStart;
exports.permissionPolicyChecksum = permissionPolicyChecksum;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const task_permission_broker_1 = require("../collaboration/task-permission-broker");
const STORE_FILE = path.join(utils_1.CCM_DIR, "conversation-permission-policies.json");
const MODES = new Set(["full_access", "main_agent_only", "ask_before_edit"]);
function now() { return new Date().toISOString(); }
function cleanId(value, fallback = "") { return String(value || fallback).trim().slice(0, 180); }
function key(scope, scopeId, sessionId) { return `${scope}:${scopeId}:${sessionId}`; }
function readStore() {
    return (0, atomic_json_file_1.readJsonWithBackup)(STORE_FILE, { schema: "ccm-conversation-permission-policy-store-v1", revision: 0, policies: {} });
}
function identity(input) {
    const requestedScope = String(input?.scope);
    const scope = requestedScope === "project" ? "project" : requestedScope === "group" ? "group" : "global";
    const scopeId = scope === "global" ? "global" : cleanId(input?.scopeId || input?.scope_id || input?.project || input?.groupId || input?.group_id);
    const exactSessionId = cleanId(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id);
    if (!scopeId || !exactSessionId)
        throw new Error("权限模式缺少精确会话绑定");
    return { scope, scopeId, exactSessionId, key: key(scope, scopeId, exactSessionId) };
}
function readConversationPermissionPolicy(input) {
    const id = identity(input);
    const saved = readStore().policies?.[id.key];
    if (saved)
        return saved;
    return {
        schema: "ccm-conversation-permission-policy-v1",
        scope: id.scope,
        scopeId: id.scopeId,
        exactSessionId: id.exactSessionId,
        mode: "ask_before_edit",
        source: "manual_default",
        approvalScope: "task",
        revision: 0,
        generation: Math.max(0, Number(input?.generation || 0)),
        updatedAt: now(),
    };
}
function updateConversationPermissionPolicy(input) {
    const id = identity(input);
    const mode = String(input?.mode || "");
    if (!MODES.has(mode))
        throw new Error("未知的会话权限模式");
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const store = readStore();
        store.policies = store.policies && typeof store.policies === "object" ? store.policies : {};
        const current = store.policies[id.key] || readConversationPermissionPolicy(id);
        if (input?.revision !== undefined && Number(input.revision) !== Number(current.revision || 0)) {
            const error = new Error("权限模式已被其他窗口修改，请重新读取");
            error.statusCode = 409;
            error.code = "PERMISSION_POLICY_REVISION_CONFLICT";
            throw error;
        }
        if (input?.generation !== undefined && Number(input.generation) < Number(current.generation || 0)) {
            const error = new Error("会话 generation 已更新，请重新读取");
            error.statusCode = 409;
            throw error;
        }
        const next = {
            ...current,
            ...id,
            schema: "ccm-conversation-permission-policy-v1",
            mode,
            source: input?.source === "automation_default" ? "automation_default" : "user",
            approvalScope: "task",
            revision: Number(current.revision || 0) + 1,
            generation: Math.max(Number(current.generation || 0), Number(input?.generation || 0)),
            updatedAt: now(),
        };
        delete next.key;
        store.policies[id.key] = next;
        store.revision = Number(store.revision || 0) + 1;
        store.updatedAt = now();
        (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, store);
        return next;
    });
}
function automationTask(task) {
    const source = String(task?.automation_task_source || task?.request_origin || task?.source_channel || task?.workflow_meta?.intake?.source || "").toLowerCase();
    return !!(task?.cron_job_id || task?.cron_occurrence_id || task?.global_mission_id
        || task?.workflow_meta?.global_direct_dispatch || task?.workflow_meta?.project_mission
        || /(?:schedule|cron|workbench|global[_ -]?agent|automation|mission)/.test(source));
}
function taskConversationIdentity(task) {
    const globalSessionId = cleanId(task?.workflow_meta?.global_direct_dispatch?.session_id);
    if (globalSessionId)
        return { scope: "global", scopeId: "global", exactSessionId: globalSessionId };
    const groupId = cleanId(task?.group_id || task?.groupId);
    const groupSessionId = cleanId(task?.group_session_id || task?.groupSessionId);
    if (groupId && groupSessionId)
        return { scope: "group", scopeId: groupId, exactSessionId: groupSessionId };
    const project = cleanId(task?.target_project || task?.targetProject || task?.project);
    const projectSessionId = cleanId(task?.project_session_id || task?.projectSessionId || task?.exact_session_id || task?.exactSessionId);
    if (project && projectSessionId)
        return { scope: "project", scopeId: project, exactSessionId: projectSessionId };
    return null;
}
function permissionSnapshotForTask(task) {
    const existing = task?.conversation_permission_snapshot || task?.conversationPermissionSnapshot;
    if (existing && MODES.has(existing.mode))
        return existing;
    const id = taskConversationIdentity(task);
    if (automationTask(task))
        return {
            schema: "ccm-conversation-permission-policy-v1",
            ...(id || { scope: "project", scopeId: cleanId(task?.target_project || task?.project, "task"), exactSessionId: cleanId(task?.id, "automation") }),
            mode: "full_access",
            source: "automation_default",
            approvalScope: "task",
            revision: 0,
            generation: Math.max(0, Number(task?.generation || 0)),
            updatedAt: now(),
        };
    return id ? readConversationPermissionPolicy(id) : {
        schema: "ccm-conversation-permission-policy-v1",
        scope: "project",
        scopeId: cleanId(task?.target_project || task?.project, "task"),
        exactSessionId: cleanId(task?.id, "manual"),
        mode: "ask_before_edit",
        source: "manual_default",
        approvalScope: "task",
        revision: 0,
        generation: Math.max(0, Number(task?.generation || 0)),
        updatedAt: now(),
    };
}
async function authorizeProjectChildAgentStart(input) {
    const snapshot = permissionSnapshotForTask(input.task);
    const approvalTaskKey = String(input.task?.task_thread_id || input.task?.taskThreadId || input.task?.root_task_id || input.task?.rootTaskId || input.task?.retry_of_task_id || input.task?.retryOfTaskId || input.task?.id || "");
    const approvedPaths = (Array.isArray(input.task?.allowed_paths || input.task?.allowedPaths) ? (input.task.allowed_paths || input.task.allowedPaths) : [input.workDir])
        .map((item) => String(item || "").trim()).filter(Boolean).sort();
    if (snapshot.mode === "full_access")
        return { allowed: true, mode: snapshot.mode, snapshot };
    const approved = (0, task_permission_broker_1.listTaskPermissionRequests)({ project: input.project })
        .find((item) => item.approvalScope === "task" && item.operation === "workspace_edit_session"
        && String(item.approvalTaskKey || item.taskId) === approvalTaskKey
        && item.state === "approved" && Number(item.permissionPolicyRevision || 0) === Number(snapshot.revision || 0)
        && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now())
        && (item.approvedProjectIds || []).includes(input.project)
        && JSON.stringify([...(item.approvedPaths || [])].sort()) === JSON.stringify(approvedPaths));
    if (approved)
        return { allowed: true, mode: snapshot.mode, snapshot, editApprovalId: approved.id };
    const issuedAt = now();
    const context = {
        schema: "ccm-internal-mcp-context-v2",
        bindingKind: "task",
        taskId: String(input.task.id),
        groupId: cleanId(input.task.group_id || input.task.groupId),
        groupSessionId: cleanId(input.task.group_session_id || input.task.groupSessionId),
        project: input.project,
        projectSessionId: cleanId(input.task.project_session_id || input.task.projectSessionId),
        role: "project-child-agent",
        agentType: input.agentType,
        workDir: input.workDir,
        baseWorkDir: input.workDir,
        boundaryGeneration: Math.max(0, Number(input.task.generation || snapshot.generation || 0)),
        issuedAt,
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    };
    const request = await (0, task_permission_broker_1.requestTaskPermission)(context, {
        operation: "workspace_edit_session",
        paths: approvedPaths,
        reason: `允许 ${input.project} 的第三方项目子 Agent 在当前任务内修改、返工并复验`,
        forceUserDecision: snapshot.mode === "ask_before_edit",
        forceMainAgentReview: snapshot.mode === "main_agent_only",
        decisionReason: snapshot.mode === "main_agent_only" ? "当前会话设置为“主 Agent 审核”" : "当前会话设置为“修改时询问我”",
        approvalScope: "task",
        permissionPolicyRevision: snapshot.revision,
        approvedProjectIds: [input.project],
        approvedPaths,
    });
    return {
        allowed: request.state === "approved",
        mode: snapshot.mode,
        snapshot,
        editApprovalId: request.state === "approved" ? request.id : "",
        permissionRequest: request,
        code: request.state === "rejected" ? "EDIT_PERMISSION_REJECTED" : "EDIT_PERMISSION_REQUIRED",
        message: request.state === "rejected"
            ? (snapshot.mode === "main_agent_only" ? "主 Agent 审核后未批准项目子 Agent 的修改权限。" : "代码修改授权已被拒绝。")
            : (snapshot.mode === "main_agent_only"
                ? "主 Agent 审核后认为这项权限需要你确认，批准后项目子 Agent会继续执行。"
                : "开始修改代码前需要你的确认，批准后当前任务及其返工、复验会继续使用这次授权。"),
    };
}
function permissionPolicyChecksum(policy) {
    return crypto.createHash("sha256").update(JSON.stringify(policy)).digest("hex");
}
//# sourceMappingURL=conversation-permission-policy.js.map