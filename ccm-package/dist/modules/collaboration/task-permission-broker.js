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
exports.classifyTaskPermissionRequest = classifyTaskPermissionRequest;
exports.requestTaskPermission = requestTaskPermission;
exports.listTaskPermissionRequests = listTaskPermissionRequests;
exports.decideTaskPermission = decideTaskPermission;
exports.consumeTaskPermission = consumeTaskPermission;
exports.executeApprovedTaskCommand = executeApprovedTaskCommand;
exports.deliverPendingTaskPermissionNotifications = deliverPendingTaskPermissionNotifications;
exports.startTaskPermissionNotificationScheduler = startTaskPermissionNotificationScheduler;
exports.stopTaskPermissionNotificationScheduler = stopTaskPermissionNotificationScheduler;
exports.runTaskPermissionBrokerSelfTest = runTaskPermissionBrokerSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_config_1 = require("./group-orchestrator-config");
const group_orchestrator_llm_client_1 = require("./group-orchestrator-llm-client");
const logs_1 = require("./logs");
const execution_kernel_1 = require("../../agents/execution-kernel");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const runtime_events_1 = require("../../system/runtime-events");
const STORE_DIR = path.join(utils_1.CCM_DIR, "permission-broker");
const STORE_FILE = path.join(STORE_DIR, "requests.json");
const MAX_RECORDS = 1000;
function now() { return new Date().toISOString(); }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function clean(value, max = 800) { return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max); }
function list(value, maxItems = 20, maxChars = 500) {
    return Array.from(new Set((Array.isArray(value) ? value : value ? [value] : []).map(item => clean(item, maxChars)).filter(Boolean))).slice(0, maxItems);
}
function readStore() {
    try {
        const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
        return Array.isArray(parsed?.requests) ? parsed.requests : [];
    }
    catch {
        return [];
    }
}
function writeStore(requests) {
    (0, atomic_json_file_1.writeJsonAtomic)(STORE_FILE, { schema: "ccm-task-permission-store-v1", updatedAt: now(), requests: requests.slice(-MAX_RECORDS) });
}
function publicRequest(request) {
    return { ...request, command: request.command.slice(0, 500), reason: request.reason.slice(0, 500) };
}
function isInside(root, candidate) {
    const base = path.resolve(root);
    const target = path.resolve(base, candidate || ".");
    return target === base || target.startsWith(`${base}${path.sep}`);
}
function classifyTaskPermissionRequest(context, input) {
    const operation = clean(input?.operation, 80).toLowerCase().replace(/[^a-z0-9_-]+/g, "_") || "custom";
    const command = clean(input?.command, 1200);
    const paths = list(input?.paths, 30, 600);
    const hosts = list(input?.hosts, 20, 240);
    const reasons = [];
    let risk = "medium";
    const highOperation = /^(?:git_force_push|publish|production_deploy|secret_access|system_change|privilege_elevation|destructive_database_migration)$/;
    const lowOperation = /^(?:workspace_read|workspace_write|workspace_delete|build|test|lint|format|git_status|git_diff|git_fetch|git_pull|git_branch|dependency_install)$/;
    if (highOperation.test(operation)) {
        risk = "high";
        reasons.push("操作类型必须由用户确认");
    }
    else if (lowOperation.test(operation))
        risk = "low";
    if (paths.some(item => !isInside(context.workDir, item))) {
        risk = "high";
        reasons.push("请求路径越过目标项目工作区");
    }
    if (/(?:git\s+push\s+.*--force|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|npm\s+publish|pnpm\s+publish|docker\s+push|kubectl\s+(?:delete|apply)|terraform\s+apply|DROP\s+(?:DATABASE|TABLE)|TRUNCATE\s+TABLE|sudo\b|RunAs|chmod\s+777|rm\s+-rf|rmdir\s+\/s)/i.test(command)) {
        risk = "high";
        reasons.push("命令包含发布、强制覆盖、提权或破坏性操作");
    }
    if (/(?:\.env|credential|secret|token|api[_-]?key|private[_-]?key)/i.test(`${command} ${paths.join(" ")}`)) {
        risk = "high";
        reasons.push("请求可能访问凭据或密钥");
    }
    if (operation === "deploy" || operation === "git_push" || operation === "network_access" || operation === "database_migration") {
        if (risk !== "high")
            risk = "medium";
    }
    if (command && risk === "low") {
        const routineCommand = /^(?:npm|pnpm|yarn|bun)\s+(?:install|ci|run\s+[\w:.-]+|test|build|lint)|^(?:git\s+(?:status|diff|fetch|pull|branch)(?:\s|$))|^(?:npx\s+(?:tsc|vite|vitest|eslint|prettier)(?:\s|$))/i.test(command);
        if (!routineCommand || /[;&|`$><]/.test(command)) {
            risk = "medium";
            reasons.push("命令不属于可确定识别的项目内日常命令，需要主 Agent 复核");
        }
    }
    if (!reasons.length)
        reasons.push(risk === "low" ? "操作限制在目标项目的日常开发范围" : "需要群聊主 Agent 判断必要性与影响范围");
    return { operation, command, paths, hosts, risk, reasons };
}
async function askGroupMainAgent(context, request) {
    const config = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    if (!config?.apiKey || !config?.apiUrl || !config?.model)
        return { decision: "user", reason: "群聊主 Agent 模型未配置，无法可靠审批" };
    const system = `你是 CCM 群聊主 Agent 的权限审批器。你只能审批当前目标项目内、完成当前任务确有必要、影响可恢复的操作。
以下情况必须 decision=user：发布软件包、生产部署、强制推送或覆盖历史、读取/导出密钥、系统提权、项目目录外操作、破坏性数据库迁移、明显费用或你无法判断。
不需要额外权限的请求应 decision=reject。允许的中风险请求可 decision=approve。只返回 JSON：{"decision":"approve|user|reject","reason":"依据","maxUses":1,"expiresInMinutes":15}`;
    const user = JSON.stringify({
        taskId: context.taskId,
        groupId: context.groupId,
        groupSessionId: context.groupSessionId,
        project: context.project,
        operation: request.operation,
        command: request.command,
        paths: request.paths,
        hosts: request.hosts,
        reason: request.reason,
        deterministicRisk: request.risk,
    });
    try {
        const options = { messages: [{ role: "system", content: system }, { role: "user", content: user }], system, temperature: 0, maxTokens: 300, defaultTimeoutMs: 20000 };
        const parsed = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleJson)(config, options)
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleJson)(config, options);
        const decision = ["approve", "user", "reject"].includes(String(parsed?.decision || "")) ? String(parsed.decision) : "user";
        return { decision, reason: clean(parsed?.reason || "群聊主 Agent 未提供可核验理由", 600), maxUses: Math.max(1, Math.min(3, Number(parsed?.maxUses || 1))), expiresInMinutes: Math.max(5, Math.min(30, Number(parsed?.expiresInMinutes || 15))) };
    }
    catch (error) {
        return { decision: "user", reason: `群聊主 Agent 无法完成权限判断：${clean(error?.message || error, 300)}` };
    }
}
function currentTask(context) {
    if (context.bindingKind === "project_session") {
        if (!context.project || !context.projectSessionId)
            throw new Error("项目会话权限申请缺少精确会话绑定");
        return { id: `project-session:${context.project}:${context.projectSessionId}`, assign_type: "project_session", target_project: context.project, project_session_id: context.projectSessionId, virtual: true };
    }
    const task = (0, db_1.loadTasks)().find((item) => String(item.id) === String(context.taskId));
    if (!task)
        throw new Error("权限申请绑定的任务不存在");
    if (context.groupId && String(task.group_id || task.groupId || "") !== String(context.groupId))
        throw new Error("权限申请的群聊绑定不匹配");
    const taskProject = String(task.target_project || task.targetProject || task.project || "");
    if (taskProject && taskProject !== context.project && String(task.assign_type || "") !== "group")
        throw new Error("权限申请的项目绑定不匹配");
    return task;
}
function permissionOrigin(task, context) {
    const globalMeta = task?.workflow_meta?.global_direct_dispatch || task?.workflowMeta?.global_direct_dispatch || null;
    if (String(globalMeta?.session_id || "").trim())
        return {
            originType: "global", originSessionId: String(globalMeta.session_id), originGroupId: "", originProject: "",
            globalRunId: String(globalMeta.global_run_id || ""), globalMissionId: String(task.global_mission_id || task.parent_task_id || ""), notificationAgent: "global-agent",
        };
    if (context.bindingKind === "project_session")
        return {
            originType: "project", originSessionId: String(context.projectSessionId || ""), originGroupId: "", originProject: context.project,
            globalRunId: "", globalMissionId: "", notificationAgent: context.project,
        };
    if (context.groupId)
        return {
            originType: "group", originSessionId: String(context.groupSessionId || task.group_session_id || ""), originGroupId: context.groupId, originProject: "",
            globalRunId: "", globalMissionId: String(task.global_mission_id || ""), notificationAgent: String(task.target_project || "global-agent"),
        };
    return {
        originType: "task", originSessionId: "", originGroupId: "", originProject: context.project,
        globalRunId: "", globalMissionId: String(task.global_mission_id || ""), notificationAgent: context.project,
    };
}
function persist(request) {
    (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const requests = readStore();
        const index = requests.findIndex(item => item.id === request.id);
        if (index >= 0)
            requests[index] = request;
        else
            requests.push(request);
        writeStore(requests);
    });
    if (!request.taskId.startsWith("project-session:"))
        (0, logs_1.appendTaskTimelineEvent)(request.taskId, {
            type: request.state === "awaiting_user" ? "permission.user_required" : `permission.${request.state}`,
            title: request.state === "approved" ? `${request.project} 获得限时权限` : request.state === "rejected" ? `${request.project} 权限申请被拒绝` : `${request.project} 请求用户审批权限`,
            detail: `${request.operation}：${request.decisionReason}`,
            status: request.state === "approved" ? "active" : request.state === "rejected" ? "warning" : "blocked",
            phase: "execution",
            agent: request.project,
            data: { permission_request_id: request.id, risk: request.risk, state: request.state, expires_at: request.expiresAt },
        });
    (0, runtime_events_1.publishRuntimeEvent)("permission", "permission.changed", {
        id: request.id,
        taskId: request.taskId,
        project: request.project,
        originType: request.originType,
        originSessionId: request.originSessionId,
        state: request.state,
        operation: request.operation,
    });
    return publicRequest(request);
}
async function requestTaskPermission(context, input) {
    const task = currentTask(context);
    if (!new Set(["project-agent", "project-child-agent"]).has(context.role))
        throw new Error("当前 Agent 角色不能申请执行权限");
    const classified = classifyTaskPermissionRequest(context, input);
    const reason = clean(input?.reason, 900);
    if (!reason)
        throw new Error("权限申请必须说明与当前任务的关系");
    const effectiveTaskId = String(context.taskId || task.id);
    const origin = permissionOrigin(task, context);
    const identity = hash([effectiveTaskId, context.groupId, context.groupSessionId, context.project, context.projectSessionId, context.taskAgentSessionId, context.nativeSessionId, classified.operation, classified.command, classified.paths, classified.hosts]);
    const existing = readStore().find(item => item.checksum === identity && !["expired", "consumed"].includes(item.state));
    if (existing)
        return publicRequest(existing);
    let decision;
    if (classified.risk === "high")
        decision = { decision: "user", reason: classified.reasons.join("；") };
    else if (!context.groupId)
        decision = classified.risk === "low"
            ? { decision: "approve", reason: "独立项目的项目内日常开发策略允许", maxUses: 1, expiresInMinutes: 15, actor: "project-policy" }
            : { decision: "user", reason: "独立项目没有群聊主 Agent，中高风险权限需要用户确认" };
    else if (classified.risk === "low")
        decision = { decision: "approve", reason: "群聊主 Agent 的项目内日常开发策略允许", maxUses: 1, expiresInMinutes: 15, actor: "group-main-policy" };
    else
        decision = await askGroupMainAgent(context, { ...classified, reason });
    const createdAt = now();
    const approved = decision.decision === "approve";
    const state = approved ? "approved" : decision.decision === "reject" ? "rejected" : "awaiting_user";
    const request = {
        schema: "ccm-task-permission-request-v1",
        id: `perm_${identity.slice(0, 24)}`,
        taskId: effectiveTaskId,
        groupId: context.groupId || "",
        groupSessionId: context.groupSessionId || "",
        project: context.project,
        projectSessionId: context.projectSessionId || "",
        taskAgentSessionId: context.taskAgentSessionId || "",
        nativeSessionId: context.nativeSessionId || "",
        ...origin,
        notificationState: state === "awaiting_user" ? "pending" : "skipped",
        notificationAt: "",
        notificationAttempts: 0,
        nextNotificationAt: state === "awaiting_user" ? createdAt : "",
        notificationPetSent: false,
        notificationFeishuSent: false,
        operation: classified.operation,
        command: classified.command,
        paths: classified.paths,
        hosts: classified.hosts,
        reason,
        risk: classified.risk,
        riskReasons: classified.reasons,
        state,
        decidedBy: approved ? (decision.actor || "group-main-agent") : state === "rejected" ? "group-main-agent" : "system",
        decisionReason: clean(decision.reason, 800),
        createdAt,
        decidedAt: state === "awaiting_user" ? "" : createdAt,
        expiresAt: approved ? new Date(Date.now() + Math.max(5, Math.min(30, Number(decision.expiresInMinutes || 15))) * 60_000).toISOString() : "",
        maxUses: approved ? Math.max(1, Math.min(3, Number(decision.maxUses || 1))) : 0,
        usedCount: 0,
        checksum: identity,
    };
    return persist(request);
}
function listTaskPermissionRequests(filters = {}) {
    const current = Date.now();
    const requests = readStore().map(request => {
        if (request.state === "approved" && Date.parse(request.expiresAt) <= current)
            return { ...request, state: "expired" };
        return request;
    });
    return requests.filter(item => !filters.taskId || item.taskId === filters.taskId)
        .filter(item => !filters.groupId || item.groupId === filters.groupId)
        .filter(item => !filters.project || item.project === filters.project)
        .filter(item => !filters.originType || item.originType === filters.originType)
        .filter(item => !filters.originSessionId || item.originSessionId === filters.originSessionId)
        .filter(item => !filters.originGroupId || item.originGroupId === filters.originGroupId)
        .filter(item => !filters.originProject || item.originProject === filters.originProject)
        .filter(item => !filters.state || item.state === filters.state)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicRequest);
}
function decideTaskPermission(requestId, input) {
    const updated = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const requests = readStore();
        const index = requests.findIndex(item => item.id === requestId);
        if (index < 0)
            throw new Error("权限申请不存在");
        const current = requests[index];
        if (current.state !== "awaiting_user")
            throw new Error("这项权限申请已经处理或失效");
        const decision = String(input?.decision || "").toLowerCase();
        if (!new Set(["approve", "reject"]).has(decision))
            throw new Error("用户决策必须是 approve 或 reject");
        const decidedAt = now();
        requests[index] = {
            ...current,
            state: decision === "approve" ? "approved" : "rejected",
            decidedBy: "local-user",
            decisionReason: clean(input?.reason || (decision === "approve" ? "用户明确批准" : "用户拒绝"), 800),
            decidedAt,
            expiresAt: decision === "approve" ? new Date(Date.now() + Math.max(5, Math.min(30, Number(input?.expiresInMinutes || 15))) * 60_000).toISOString() : "",
            maxUses: decision === "approve" ? Math.max(1, Math.min(3, Number(input?.maxUses || 1))) : 0,
        };
        writeStore(requests);
        return requests[index];
    });
    if (!updated.taskId.startsWith("project-session:"))
        (0, logs_1.appendTaskTimelineEvent)(updated.taskId, { type: `permission.${updated.state}`, title: updated.state === "approved" ? `${updated.project} 获得用户限时授权` : `${updated.project} 的权限申请被用户拒绝`, detail: `${updated.operation}：${updated.decisionReason}`, status: updated.state === "approved" ? "active" : "warning", phase: "execution", agent: updated.project, data: { permission_request_id: updated.id, risk: updated.risk, state: updated.state, expires_at: updated.expiresAt } });
    (0, runtime_events_1.publishRuntimeEvent)("permission", "permission.decided", {
        id: updated.id,
        taskId: updated.taskId,
        project: updated.project,
        originType: updated.originType,
        originSessionId: updated.originSessionId,
        state: updated.state,
        operation: updated.operation,
    });
    return publicRequest(updated);
}
function consumeTaskPermission(context, requestId) {
    const consumed = (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const requests = readStore();
        const index = requests.findIndex(item => item.id === requestId);
        if (index < 0)
            throw new Error("权限授权不存在");
        const request = requests[index];
        const effectiveTaskId = String(context.taskId || (context.bindingKind === "project_session" ? `project-session:${context.project}:${context.projectSessionId}` : ""));
        if (request.taskId !== effectiveTaskId
            || request.groupId !== (context.groupId || "")
            || request.project !== context.project
            || request.taskAgentSessionId !== (context.taskAgentSessionId || "")
            || !!request.nativeSessionId && request.nativeSessionId !== (context.nativeSessionId || "")) {
            throw new Error("权限授权与当前精确任务或 Agent 会话不匹配");
        }
        if (request.state !== "approved")
            throw new Error(`权限授权当前不可用：${request.state}`);
        if (!request.expiresAt || Date.parse(request.expiresAt) <= Date.now()) {
            requests[index] = { ...request, state: "expired" };
            writeStore(requests);
            throw new Error("权限授权已经过期");
        }
        if (request.usedCount >= request.maxUses)
            throw new Error("权限授权使用次数已经耗尽");
        const usedCount = request.usedCount + 1;
        requests[index] = { ...request, usedCount, state: usedCount >= request.maxUses ? "consumed" : "approved" };
        writeStore(requests);
        return requests[index];
    });
    if (!consumed.taskId.startsWith("project-session:"))
        (0, logs_1.appendTaskTimelineEvent)(consumed.taskId, { type: "permission.consumed", title: `${consumed.project} 使用了限时权限`, detail: `${consumed.operation}，使用 ${consumed.usedCount}/${consumed.maxUses}`, status: "active", phase: "execution", agent: consumed.project, data: { permission_request_id: consumed.id } });
    (0, runtime_events_1.publishRuntimeEvent)("permission", "permission.consumed", {
        id: consumed.id,
        taskId: consumed.taskId,
        project: consumed.project,
        originType: consumed.originType,
        originSessionId: consumed.originSessionId,
        state: consumed.state,
        operation: consumed.operation,
    });
    return { success: true, allowed: true, grant: publicRequest(consumed) };
}
async function executeApprovedTaskCommand(context, requestId) {
    const request = readStore().find(item => item.id === requestId);
    if (!request)
        throw new Error("权限授权不存在");
    if (!request.command)
        throw new Error("这项授权没有绑定可由 CCM 执行的命令");
    consumeTaskPermission(context, requestId);
    const envKeys = ["PATH", "Path", "PATHEXT", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "HOME", "USERPROFILE", "LANG", "LC_ALL"];
    const env = Object.fromEntries(envKeys.flatMap(key => process.env[key] === undefined ? [] : [[key, String(process.env[key])]]));
    try {
        const result = await (0, execution_kernel_1.runManagedCommand)({
            taskId: context.taskId || request.taskId,
            command: request.command,
            cwd: context.workDir,
            env,
            timeoutMs: 10 * 60_000,
            maxOutputBytes: 2 * 1024 * 1024,
            project: context.project,
            agentType: context.agentType || "project-child-agent",
            source: "approved-permission-command",
            commandLabel: request.operation,
            title: `执行已审批操作：${request.operation}`,
        });
        if (!request.taskId.startsWith("project-session:"))
            (0, logs_1.appendTaskTimelineEvent)(request.taskId, { type: "permission.command_completed", title: `${request.project} 已完成审批操作`, detail: request.operation, status: "active", phase: "execution", agent: request.project, data: { permission_request_id: request.id, exit_code: result.exitCode } });
        return { success: true, request_id: request.id, exit_code: result.exitCode, stdout: String(result.stdout || "").slice(-20_000), stderr: String(result.stderr || "").slice(-10_000), output_file: result.outputFile || "" };
    }
    catch (error) {
        if (!request.taskId.startsWith("project-session:"))
            (0, logs_1.appendTaskTimelineEvent)(request.taskId, { type: "permission.command_failed", title: `${request.project} 的审批操作执行失败`, detail: `${request.operation}：${clean(error?.message || error, 500)}`, status: "warning", phase: "execution", agent: request.project, data: { permission_request_id: request.id } });
        throw error;
    }
}
let notificationTimer = null;
let notificationRunning = false;
function updatePermissionNotification(id, updates) {
    return (0, atomic_json_file_1.withFileLock)(STORE_FILE, () => {
        const requests = readStore();
        const index = requests.findIndex(item => item.id === id);
        if (index < 0)
            return null;
        requests[index] = { ...requests[index], ...updates };
        writeStore(requests);
        return requests[index];
    });
}
async function deliverPendingTaskPermissionNotifications(ctx, dependencies = {}) {
    if (notificationRunning)
        return { due: 0, sent: 0 };
    notificationRunning = true;
    try {
        const due = readStore().filter(item => item.state === "awaiting_user"
            && ["pending", "partial"].includes(item.notificationState)
            && Number(item.notificationAttempts || 0) < 5
            && Date.parse(item.nextNotificationAt || item.createdAt || "") <= Date.now()).slice(0, 10);
        let sent = 0;
        for (const request of due) {
            const title = "开发任务需要权限确认";
            const originLabel = request.originType === "global" ? "全局会话" : request.originType === "group" ? "群聊会话" : request.originType === "project" ? "项目会话" : "任务派发";
            const text = `${request.project} 请求 ${request.operation} 权限，需要你确认`;
            let petSent = request.notificationPetSent === true;
            const petAvailable = typeof ctx?.broadcastPetSpeech === "function";
            if (!petSent && petAvailable)
                try {
                    ctx.broadcastPetSpeech(request.notificationAgent || "global-agent", { role: "attention", text, source: "permission-approval", mode: "replace" });
                    petSent = true;
                }
                catch { }
            let feishuSent = request.notificationFeishuSent === true;
            if (!feishuSent)
                try {
                    const approvalHint = request.originType === "global"
                        ? `可在本飞书会话回复“批准权限 ${request.id}”或“拒绝权限 ${request.id}”，也可回到 CCM 对应会话审批。`
                        : "请回到 CCM 对应会话或任务派发页审批。";
                    const markdown = [`**来源**：${originLabel}`, `**项目**：${request.project}`, `**请求操作**：${request.operation}`, `**风险**：${request.risk}`, `**原因**：${request.reason}`, `**申请 ID**：${request.id}`, "", approvalHint].join("\n");
                    const notifyFeishuTaskStage = dependencies.notifyFeishuTaskStage || require("./feishu-channel").notifyFeishuTaskStage;
                    const bound = await notifyFeishuTaskStage({ stage: "permission_approval", title, markdown, dedupeKey: `permission:${request.id}`, runId: request.globalRunId, missionId: request.globalMissionId, taskId: request.taskId.startsWith("project-session:") ? "" : request.taskId, sessionId: request.originSessionId });
                    if (bound?.success || bound?.queued)
                        feishuSent = true;
                    else {
                        const sendFeishuReportMessage = dependencies.sendFeishuReportMessage || require("./feishu").sendFeishuReportMessage;
                        const fallback = await sendFeishuReportMessage({ title, markdown });
                        feishuSent = fallback?.success === true;
                    }
                }
                catch { }
            const attempts = Number(request.notificationAttempts || 0) + 1;
            const complete = (petSent || !petAvailable) && feishuSent;
            updatePermissionNotification(request.id, {
                notificationState: complete ? "sent" : "partial",
                notificationAt: complete ? now() : request.notificationAt || "",
                notificationAttempts: attempts,
                nextNotificationAt: complete || attempts >= 5 ? "" : new Date(Date.now() + Math.min(60_000, 5_000 * 2 ** attempts)).toISOString(),
                notificationPetSent: petSent,
                notificationFeishuSent: feishuSent,
            });
            if (complete)
                sent += 1;
        }
        return { due: due.length, sent };
    }
    finally {
        notificationRunning = false;
    }
}
function startTaskPermissionNotificationScheduler(ctx) {
    if (notificationTimer)
        return;
    void deliverPendingTaskPermissionNotifications(ctx);
    notificationTimer = setInterval(() => void deliverPendingTaskPermissionNotifications(ctx), 3_000);
    notificationTimer.unref?.();
}
function stopTaskPermissionNotificationScheduler() {
    if (notificationTimer)
        clearInterval(notificationTimer);
    notificationTimer = null;
}
function runTaskPermissionBrokerSelfTest() {
    const base = { workDir: path.resolve("C:/workspace/demo") };
    const low = classifyTaskPermissionRequest(base, { operation: "dependency_install", command: "npm install", paths: ["."] });
    const outside = classifyTaskPermissionRequest(base, { operation: "workspace_write", paths: ["../other"] });
    const publish = classifyTaskPermissionRequest(base, { operation: "publish", command: "npm publish" });
    const force = classifyTaskPermissionRequest(base, { operation: "git_push", command: "git push --force origin main" });
    return { pass: low.risk === "low" && outside.risk === "high" && publish.risk === "high" && force.risk === "high", low, outside, publish, force };
}
//# sourceMappingURL=task-permission-broker.js.map