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
exports.handleAutomationRoutes = handleAutomationRoutes;
const utils_1 = require("../../core/utils");
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const collaboration_1 = require("../collaboration/collaboration");
const task_run_store_1 = require("../collaboration/task-run-store");
const access_policy_1 = require("../system/access-policy");
const automation_definition_service_1 = require("./automation-definition-service");
function body(req) { return (0, utils_1.collectRequestBuffer)(req).then(buffer => buffer.length ? JSON.parse(buffer.toString("utf8")) : {}); }
function definitionTask(definition, operationKey = "") {
    return {
        title: definition.name,
        description: definition.prompt || definition.goal,
        business_goal: definition.goal,
        scope: definition.scope,
        source_attachments: definition.attachments || [],
        target_project: definition.target.type === "project" ? definition.target.id : "",
        group_id: definition.target.type === "group" ? definition.target.id : null,
        exact_session_id: definition.target.exact_session_id,
        source_channel: "automation",
        origin: "automation",
        automation_definition: definition,
        automation_definition_id: definition.definition_id,
        automation_definition_revision: definition.revision,
        ...(operationKey ? { client_message_id: operationKey, idempotency_key: `automation-manual:${definition.definition_id}:${operationKey}` } : {}),
        dispatch_policy: definition.execution_policy.dispatch,
        verification_policy: definition.execution_policy.verification,
        workspace_policy: definition.execution_policy.workspace,
        approval_policy: definition.execution_policy.approval,
        auto_execute: true,
    };
}
function handleAutomationRoutes(pathname, req, res, parsed, ctx) {
    const idMatch = pathname.match(/^\/api\/automations\/([^/]+)$/);
    const runsMatch = pathname.match(/^\/api\/automations\/([^/]+)\/runs$/);
    const actionMatch = pathname.match(/^\/api\/automation-runs\/([^/]+)\/(cancel|retry|resume)$/);
    const canAccess = (definition, level) => {
        const principal = req.ccmAuth;
        return !principal || principal.kind !== "browser" || principal.role === "admin"
            || (0, access_policy_1.hasResourceAccess)(String(principal.userId || ""), principal.role, definition.target.type, definition.target.id, level);
    };
    if (pathname === "/api/automations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, definitions: (0, automation_definition_service_1.listAutomationDefinitions)().filter(row => canAccess(row, "use")) });
        return true;
    }
    if (pathname === "/api/automations" && req.method === "POST") {
        void body(req).then(payload => {
            const target = payload?.target || {};
            const type = target.type || (payload?.group_id ? "group" : "project");
            const id = target.id || payload?.group_id || payload?.project || payload?.target_project;
            if (!(0, access_policy_1.authorizeResource)(req, res, type, id, "manage"))
                return;
            (0, utils_1.sendJson)(res, { success: true, definition: (0, automation_definition_service_1.createAutomationDefinition)(payload) });
        }).catch(e => (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400));
        return true;
    }
    if (idMatch && req.method === "GET") {
        const definition = (0, automation_definition_service_1.getAutomationDefinition)(decodeURIComponent(idMatch[1]));
        if (!definition) {
            (0, utils_1.sendJson)(res, { success: false, error: "自动化定义不存在" }, 404);
            return true;
        }
        if (!(0, access_policy_1.authorizeResource)(req, res, definition.target.type, definition.target.id))
            return true;
        (0, utils_1.sendJson)(res, { success: true, definition });
        return true;
    }
    if (runsMatch && req.method === "GET") {
        const id = decodeURIComponent(runsMatch[1]);
        const definition = (0, automation_definition_service_1.getAutomationDefinition)(id);
        if (!definition) {
            (0, utils_1.sendJson)(res, { success: false, error: "自动化定义不存在" }, 404);
            return true;
        }
        if (!(0, access_policy_1.authorizeResource)(req, res, definition.target.type, definition.target.id))
            return true;
        (0, utils_1.sendJson)(res, { success: true, definition_id: id, runs: (0, automation_definition_service_1.listAutomationDefinitionRuns)(id) });
        return true;
    }
    if (idMatch && req.method === "PATCH") {
        void body(req).then(payload => { const current = (0, automation_definition_service_1.getAutomationDefinition)(decodeURIComponent(idMatch[1])); if (!current)
            return (0, utils_1.sendJson)(res, { success: false, error: "自动化定义不存在" }, 404); if (!(0, access_policy_1.authorizeResource)(req, res, current.target.type, current.target.id, "manage"))
            return; const target = payload?.target; if (target && !(0, access_policy_1.authorizeResource)(req, res, target.type, target.id, "manage"))
            return; const definition = (0, automation_definition_service_1.updateAutomationDefinition)(current.definition_id, payload); if (!definition)
            return (0, utils_1.sendJson)(res, { success: false, error: "自动化定义不存在" }, 404); (0, utils_1.sendJson)(res, { success: true, definition }); }).catch(e => (0, utils_1.sendJson)(res, { success: false, error: e.message }, 409));
        return true;
    }
    if (idMatch && req.method === "DELETE") {
        const current = (0, automation_definition_service_1.getAutomationDefinition)(decodeURIComponent(idMatch[1]));
        if (!current) {
            (0, utils_1.sendJson)(res, { success: false, error: "自动化定义不存在" }, 404);
            return true;
        }
        if (!(0, access_policy_1.authorizeResource)(req, res, current.target.type, current.target.id, "manage"))
            return true;
        const definition = (0, automation_definition_service_1.deleteAutomationDefinition)(current.definition_id);
        (0, utils_1.sendJson)(res, { success: true, definition });
        return true;
    }
    const runDefinitionMatch = pathname.match(/^\/api\/automations\/([^/]+)\/run$/);
    if (runDefinitionMatch && req.method === "POST") {
        const definition = (0, automation_definition_service_1.getAutomationDefinition)(decodeURIComponent(runDefinitionMatch[1]));
        if (!definition || definition.enabled === false || definition.deleted_at) {
            (0, utils_1.sendJson)(res, { success: false, error: "自动化定义不存在或已停用" }, 404);
            return true;
        }
        if (!(0, access_policy_1.authorizeResource)(req, res, definition.target.type, definition.target.id, "manage"))
            return true;
        void body(req).then(payload => {
            const operationKey = String(payload?.operation_key || payload?.operationKey || crypto.randomUUID()).trim();
            const task = (0, collaboration_1.createTask)(definitionTask(definition, operationKey));
            const runId = task.active_run_id || task.task_run?.run_id || task.run_id || "";
            const queued = (0, collaboration_1.enqueueTask)(task.id, ctx, runId);
            (0, utils_1.sendJson)(res, { success: !!queued?.queued || task.deduplicated === true, duplicate: task.deduplicated === true, definition, task, run: (0, task_run_store_1.getTaskRun)(runId), queued });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (actionMatch && req.method === "POST") {
        const runId = decodeURIComponent(actionMatch[1]);
        const run = (0, task_run_store_1.getTaskRun)(runId);
        if (!run) {
            (0, utils_1.sendJson)(res, { success: false, error: "自动化运行不存在" }, 404);
            return true;
        }
        const taskForRun = (0, db_1.loadTasks)().find((item) => item.id === run.task_id);
        if (taskForRun && !(0, access_policy_1.hasTaskResourceAccess)(taskForRun, req.ccmAuth, "manage")) {
            (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有该运行实例的管理权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            return true;
        }
        if (!taskForRun || String(taskForRun.active_run_id || taskForRun.run_id || taskForRun.task_run?.run_id || "") !== runId) {
            (0, utils_1.sendJson)(res, { success: false, error: "历史运行仅支持回放，不能控制当前任务", code: "TASK_RUN_NOT_ACTIVE" }, 409);
            return true;
        }
        const action = actionMatch[2];
        const definition = run.automation_definition_id ? (0, automation_definition_service_1.getAutomationDefinition)(run.automation_definition_id) : null;
        if (action !== "cancel" && (!definition || definition.deleted_at)) {
            (0, utils_1.sendJson)(res, { success: false, error: "定时任务已删除，不能重试或恢复运行" }, 409);
            return true;
        }
        if (action === "cancel") {
            (0, collaboration_1.removeTaskFromQueues)(run.task_id, runId);
            const task = (0, collaboration_1.updateTask)(run.task_id, { status: "cancelled", status_detail: "自动化运行已取消", run_control: { run_id: runId, action, at: new Date().toISOString() } });
            const updated = (0, task_run_store_1.patchTaskRun)(runId, { status: "cancelled", delivery_result: { status: "cancelled", reason: "自动化运行已取消" } });
            (0, utils_1.sendJson)(res, { success: true, run: updated, task });
            return true;
        }
        if (action === "retry") {
            const result = (0, collaboration_1.retryTask)(run.task_id, ctx, "自动化运行重试", true, runId);
            if (!result?.success) {
                (0, utils_1.sendJson)(res, result, result?.status || 409);
                return true;
            }
            (0, utils_1.sendJson)(res, { ...result, parent_run_id: runId, run: (0, task_run_store_1.getTaskRun)(result.task?.task_run?.run_id || result.task?.run_id) });
            return true;
        }
        const task = (0, collaboration_1.updateTask)(run.task_id, { status: "pending", status_detail: "自动化运行恢复" });
        const queued = (0, collaboration_1.enqueueTask)(run.task_id, ctx, runId);
        const updated = (0, task_run_store_1.patchTaskRun)(runId, { status: queued?.queued ? "queued" : "blocked", queue_lane: queued?.targetKey || run.queue_lane });
        (0, utils_1.sendJson)(res, { success: !!queued?.queued, queued, run: updated, task });
        return true;
    }
    return false;
}
//# sourceMappingURL=automation-routes.js.map