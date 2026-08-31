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
exports.buildTaskPreflight = buildTaskPreflight;
exports.handleTaskPreflightApi = handleTaskPreflightApi;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const automation_session_bindings_1 = require("../../system/automation-session-bindings");
const agent_provider_settings_1 = require("../system/agent-provider-settings");
const test_agent_settings_1 = require("../system/test-agent-settings");
const access_policy_1 = require("../system/access-policy");
const storage_1 = require("./storage");
const task_templates_1 = require("./task-templates");
const ACTIVE_TASK_STATUSES = new Set(["pending", "queued", "in_progress", "running", "reviewing", "waiting", "paused"]);
function parsePayload(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 512 * 1024)
                reject(new Error("请求内容过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求JSON无效"));
            }
        });
        req.on("error", reject);
    });
}
function normalizedText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").replace(/[，。！？、；：“”‘’（）()\[\]{}]/g, "").trim();
}
function contentFingerprint(title, instructions) {
    return crypto.createHash("sha256").update(`${normalizedText(title)}\n${normalizedText(instructions)}`).digest("hex");
}
function targetIdentity(payload) {
    const type = String(payload.targetType || payload.target_type || payload.assignType || payload.assign_type || "project").toLowerCase() === "group" ? "group" : "project";
    const id = String(type === "group"
        ? payload.targetId || payload.target_id || payload.groupId || payload.group_id
        : payload.targetId || payload.target_id || payload.projectId || payload.project_id || payload.targetProject || payload.target_project || "").trim();
    return { type: type, id };
}
function authPrincipal(req) {
    const auth = req?.ccmAuth || {};
    return { userId: String(auth.userId || auth.user_id || "system"), role: String(auth.role || "admin"), admin: auth.role === "admin" || auth.kind !== "browser" };
}
function projectProbe(project) {
    const config = (0, db_1.getConfigs)().find((item) => String(item.name || "") === project);
    if (!config)
        return { exists: false, pathAvailable: false, workDir: "", agentType: "", agentEnabled: false, agentReady: false, workspace: { available: false, git: false, clean: null } };
    let info = {};
    try {
        info = (0, db_1.getConfigInfo)(config.path)?.[0] || {};
    }
    catch { }
    const workDir = String(info.workDir || info.work_dir || "");
    const pathAvailable = !!workDir && fs.existsSync(workDir);
    const agentType = String(info.agent || info.agent_type || "claudecode");
    let git = false;
    let clean = null;
    if (pathAvailable) {
        const probe = (0, child_process_1.spawnSync)("git", ["-C", workDir, "status", "--porcelain"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
        git = probe.status === 0;
        clean = git ? !String(probe.stdout || "").trim() : null;
    }
    return {
        exists: true,
        pathAvailable,
        workDir: pathAvailable ? workDir : "",
        agentType,
        agentEnabled: (0, agent_provider_settings_1.isDevelopmentAgentEnabled)(agentType),
        agentReady: (0, agent_provider_settings_1.isDevelopmentAgentReady)(agentType),
        workspace: { available: pathAvailable, git, clean },
    };
}
function groupProbe(groupId) {
    const group = (0, storage_1.loadGroups)().find((item) => String(item.id || "") === groupId);
    if (!group)
        return { exists: false, projectCount: 0, availableProjectCount: 0, projects: [] };
    const projectNames = [...new Set((Array.isArray(group.members) ? group.members : []).map((item) => String(item.project || item.name || "").trim()).filter(Boolean))];
    const projects = projectNames.map(projectProbe).map((probe, index) => ({ project: projectNames[index], exists: probe.exists, pathAvailable: probe.pathAvailable, agentReady: probe.agentReady }));
    return { exists: true, projectCount: projects.length, availableProjectCount: projects.filter(item => item.exists && item.pathAvailable && item.agentReady).length, projects };
}
function duplicateTasks(target, title, instructions) {
    const wanted = contentFingerprint(title, instructions);
    const cutoff = Date.now() - 10 * 60_000;
    return (0, db_1.loadTasks)().filter((task) => {
        if (!ACTIVE_TASK_STATUSES.has(String(task.status || "")))
            return false;
        if ((Date.parse(task.created_at || task.updated_at || "") || 0) < cutoff)
            return false;
        const taskTarget = target.type === "group" ? String(task.group_id || "") : String(task.target_project || "");
        if (taskTarget !== target.id)
            return false;
        return contentFingerprint(task.title, task.description || task.business_goal) === wanted;
    }).slice(0, 5).map((task) => ({ id: task.id, title: task.title, status: task.status, createdAt: task.created_at }));
}
function buildTaskPreflight(payload, req) {
    const target = targetIdentity(payload);
    const auth = authPrincipal(req);
    const errors = [];
    const warnings = [];
    let title = String(payload.title || "").trim();
    let instructions = String(payload.instructions || payload.description || payload.prompt || "").trim();
    let template = null;
    let rendered = null;
    const templateId = String(payload.templateId || payload.template_id || "").trim();
    if (templateId) {
        template = (0, task_templates_1.getTaskTemplate)(templateId);
        if (!template || (!auth.admin && template.createdBy !== auth.userId))
            errors.push({ code: "TASK_TEMPLATE_UNAVAILABLE", message: "任务模板不存在或无权使用" });
        else {
            rendered = (0, task_templates_1.renderTaskTemplate)(template, payload.templateVariables || payload.template_variables || {});
            if (!rendered.valid)
                errors.push({ code: "TASK_TEMPLATE_VARIABLES_MISSING", message: `缺少模板变量：${rendered.missing.join("、")}` });
            title = rendered.title;
            instructions = rendered.instructions;
        }
    }
    if (!title)
        errors.push({ code: "TASK_TITLE_REQUIRED", message: "请输入任务标题" });
    if (!instructions)
        errors.push({ code: "TASK_INSTRUCTIONS_REQUIRED", message: "请输入任务要求" });
    if (!target.id)
        errors.push({ code: "TASK_TARGET_REQUIRED", message: "请选择目标项目或群聊" });
    const hasAccess = !!target.id && (auth.admin || (0, access_policy_1.hasResourceAccess)(auth.userId, auth.role, target.type, target.id, "use"));
    if (target.id && !hasAccess)
        errors.push({ code: "RESOURCE_ACCESS_DENIED", message: "当前账户没有目标资源的任务派发权限" });
    const targetProbe = target.type === "group" ? groupProbe(target.id) : projectProbe(target.id);
    if (target.id && !targetProbe.exists)
        errors.push({ code: "TASK_TARGET_UNAVAILABLE", message: target.type === "group" ? "目标群聊不存在或已归档" : "目标项目不存在或已归档" });
    if (target.type === "project" && targetProbe.exists) {
        if (!targetProbe.pathAvailable)
            errors.push({ code: "PROJECT_PATH_UNAVAILABLE", message: "项目路径不可用" });
        if (!targetProbe.agentEnabled)
            errors.push({ code: "AGENT_DISABLED", message: "项目开发 Agent 已停用" });
        else if (!targetProbe.agentReady)
            warnings.push({ code: "AGENT_RUNTIME_UNAVAILABLE", message: "项目开发 Agent 当前不可用，任务创建后会等待通道恢复" });
        if (targetProbe.workspace.clean === false)
            warnings.push({ code: "WORKSPACE_DIRTY", message: "项目工作区存在未提交改动，执行前将再次核验写入风险" });
    }
    if (target.type === "group" && targetProbe.exists && targetProbe.availableProjectCount === 0)
        warnings.push({ code: "GROUP_AGENT_UNAVAILABLE", message: "群聊当前没有可直接执行的项目 Agent，任务会等待主 Agent 协调" });
    const source = (0, automation_session_bindings_1.normalizeAutomationTaskSource)(payload.automationTaskSource || payload.automation_task_source || payload.sourceChannel || payload.source_channel || "workbench") || "workbench";
    const bindings = target.id ? (0, automation_session_bindings_1.listAutomationSessionBindings)(target.type, target.id).filter((binding) => binding.status === "active" && binding.sources.includes(source)) : [];
    const duplicates = title && instructions && target.id ? duplicateTasks(target, title, instructions) : [];
    if (duplicates.length)
        warnings.push({ code: "POSSIBLE_DUPLICATE_TASK", message: "10分钟内存在目标和内容相同的活动任务，请确认是否仍要创建" });
    const dependencyIds = [...new Set((Array.isArray(payload.dependencyTaskIds || payload.dependency_task_ids || payload.mission_dependencies) ? (payload.dependencyTaskIds || payload.dependency_task_ids || payload.mission_dependencies) : []).map(String).filter(Boolean))];
    const tasks = (0, db_1.loadTasks)();
    const dependencies = dependencyIds.map(id => tasks.find((task) => String(task.id) === id)).filter(Boolean).map((task) => ({ id: task.id, title: task.title, status: task.status, accepted: task.status === "done" && task.acceptance_state !== "failed" }));
    if (dependencies.length !== dependencyIds.length)
        errors.push({ code: "TASK_DEPENDENCY_UNAVAILABLE", message: "部分前置任务不存在或不可访问" });
    const deadlineAt = String(payload.deadlineAt || payload.deadline_at || "").trim();
    if (deadlineAt && (!Number.isFinite(Date.parse(deadlineAt)) || Date.parse(deadlineAt) <= Date.now()))
        errors.push({ code: "TASK_DEADLINE_INVALID", message: "截止时间必须晚于当前时间" });
    const acceptanceSettings = (0, test_agent_settings_1.loadTestAgentSettings)();
    return {
        schema: "ccm-task-preflight-v1",
        allowed: errors.length === 0,
        requiresConfirmation: duplicates.length > 0 || warnings.some(item => item.code === "WORKSPACE_DIRTY"),
        target: { type: target.type, id: target.id, exists: !!targetProbe.exists, accessible: hasAccess },
        automationSession: bindings[0]
            ? { state: "reuse", exactSessionId: bindings[0].exactSessionId, bindingRevision: bindings[0].revision, bindingChecksum: bindings[0].checksum }
            : { state: "create_on_submit" },
        agent: target.type === "project"
            ? { runtime: targetProbe.agentType || "", enabled: !!targetProbe.agentEnabled, ready: !!targetProbe.agentReady }
            : { runtime: "group-main-agent", enabled: true, ready: targetProbe.availableProjectCount > 0 },
        projectPath: target.type === "project" ? { available: !!targetProbe.pathAvailable } : null,
        workspace: target.type === "project" ? targetProbe.workspace : null,
        testAgent: {
            enabled: acceptanceSettings.mode !== "self_verification_only",
            mode: acceptanceSettings.mode,
            automatic: acceptanceSettings.mode === "auto",
        },
        template: template ? { id: template.id, revision: template.revision, rendered } : null,
        finalTask: { title, instructions, priority: String(payload.priority || template?.priority || "normal"), deadlineAt: deadlineAt || null, dependencyIds },
        dependencies,
        duplicates,
        errors,
        warnings,
        checkedAt: new Date().toISOString(),
        contentStored: false,
    };
}
function handleTaskPreflightApi(pathname, req, res) {
    if (pathname !== "/api/tasks/preflight" || req.method !== "POST")
        return false;
    void parsePayload(req).then(payload => (0, utils_1.sendJson)(res, { success: true, preflight: buildTaskPreflight(payload, req) }))
        .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
    return true;
}
//# sourceMappingURL=task-intake-preflight.js.map