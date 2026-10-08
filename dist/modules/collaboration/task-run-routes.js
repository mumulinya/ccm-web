"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTaskRunRoutes = handleTaskRunRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const task_run_store_1 = require("./task-run-store");
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_run_consistency_1 = require("../../agents/agent-run-consistency");
function parseBody(req) {
    return (0, utils_1.collectRequestBuffer)(req).then(buffer => {
        if (!buffer.length)
            return {};
        try {
            return JSON.parse(buffer.toString("utf8"));
        }
        catch {
            throw new Error("请求 JSON 无效");
        }
    });
}
function taskForRun(runId) {
    const run = (0, task_run_store_1.getTaskRun)(runId);
    if (!run)
        return { run: null, task: null };
    const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === run.task_id) || null;
    return { run, task };
}
function handleTaskRunRoutes(pathname, req, res, parsed, ctx, deps) {
    const agentRunEventsMatch = pathname.match(/^\/api\/agent-runs\/([^/]+)\/events$/);
    if (pathname === "/api/agent-runs/metrics" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, metrics: (0, agent_run_store_1.getAgentRunMetrics)({
                runtimeId: parsed?.query?.runtime_id || parsed?.query?.runtimeId,
                scope: parsed?.query?.scope,
                status: parsed?.query?.status,
                from: parsed?.query?.from,
                to: parsed?.query?.to,
            }) });
        return true;
    }
    const agentRunMatch = pathname.match(/^\/api\/agent-runs\/([^/]+)$/);
    const runMatch = pathname.match(/^\/api\/task-runs\/([^/]+)$/);
    const actionMatch = pathname.match(/^\/api\/task-runs\/([^/]+)\/(cancel|retry|resume)$/);
    const taskRunsMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/runs$/);
    if (agentRunEventsMatch && req.method === "GET") {
        const runId = decodeURIComponent(agentRunEventsMatch[1]);
        const run = (0, agent_run_store_1.getAgentRun)(runId);
        if (!run) {
            (0, utils_1.sendJson)(res, { success: false, error: "AgentRun 不存在" }, 404);
            return true;
        }
        const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === run.taskId) || null;
        if (task && !(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
            (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有该运行实例的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            return true;
        }
        const limit = Number(parsed?.query?.limit || 500);
        (0, utils_1.sendJson)(res, { success: true, run_id: run.runId, events: (0, agent_run_store_1.listAgentRunEvents)(run.runId, limit) });
        return true;
    }
    if (agentRunMatch && req.method === "GET") {
        const runId = decodeURIComponent(agentRunMatch[1]);
        const run = (0, agent_run_store_1.getAgentRun)(runId);
        if (!run) {
            (0, utils_1.sendJson)(res, { success: false, error: "AgentRun 不存在" }, 404);
            return true;
        }
        const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === run.taskId) || null;
        if (task && !(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
            (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有该运行实例的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            return true;
        }
        (0, utils_1.sendJson)(res, { success: true, run, usage: (0, agent_run_store_1.listAgentRunUsage)(run.runId), projection: (0, agent_run_store_1.buildAgentRunProjection)(run.runId), consistency: (0, agent_run_consistency_1.buildTaskRunConsistencyProjection)(task) });
        return true;
    }
    if (taskRunsMatch && req.method === "GET") {
        const taskId = decodeURIComponent(taskRunsMatch[1]);
        const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === taskId);
        if (!task) {
            (0, utils_1.sendJson)(res, { success: false, error: "任务不存在" }, 404);
            return true;
        }
        if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
            (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有该任务的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            return true;
        }
        const legacyRuns = (0, task_run_store_1.listTaskRuns)(taskId);
        const agentRuns = (0, agent_run_store_1.listAgentRuns)({ taskId });
        (0, utils_1.sendJson)(res, { success: true, task_id: taskId, runs: legacyRuns, agent_runs: agentRuns, run_projections: agentRuns.map(run => (0, agent_run_store_1.buildAgentRunProjection)(run.runId)).filter(Boolean), consistency: (0, agent_run_consistency_1.buildTaskRunConsistencyProjection)(task) });
        return true;
    }
    if (runMatch && req.method === "GET") {
        const runId = decodeURIComponent(runMatch[1]);
        const { run, task } = taskForRun(runId);
        if (!run || !task) {
            (0, utils_1.sendJson)(res, { success: false, error: "运行实例不存在" }, 404);
            return true;
        }
        if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
            (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有该运行实例的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            return true;
        }
        const agentRuns = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id });
        (0, utils_1.sendJson)(res, { success: true, run, agent_runs: agentRuns, run_projections: agentRuns.map(item => (0, agent_run_store_1.buildAgentRunProjection)(item.runId)).filter(Boolean), consistency: (0, agent_run_consistency_1.buildTaskRunConsistencyProjection)(task), task: { id: task.id, title: task.title, status: task.status, active_run_id: task.active_run_id || task.run_id || task.task_run?.run_id || "" } });
        return true;
    }
    if (!actionMatch || req.method !== "POST")
        return false;
    const runId = decodeURIComponent(actionMatch[1]);
    const action = actionMatch[2];
    const { run, task } = taskForRun(runId);
    if (!run || !task) {
        (0, utils_1.sendJson)(res, { success: false, error: "运行实例不存在" }, 404);
        return true;
    }
    if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "manage")) {
        (0, utils_1.sendJson)(res, { success: false, error: "当前账户没有该运行实例的管理权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
        return true;
    }
    const activeRunId = String(task.active_run_id || task.run_id || task.task_run?.run_id || "");
    if (task.task_spec?.schema === "ccm-task-spec-v1" && activeRunId && activeRunId !== runId) {
        (0, utils_1.sendJson)(res, { success: false, error: "历史运行仅支持回放，不能控制当前任务", code: "TASK_RUN_NOT_ACTIVE" }, 409);
        return true;
    }
    void parseBody(req).then((payload) => {
        if (task.intake_state === "awaiting_confirmation" && action !== "cancel") {
            (0, utils_1.sendJson)(res, { success: false, error: "请在任务会话中完成计划确认", code: "TASK_PLAN_CONFIRMATION_REQUIRED" }, 409);
            return;
        }
        const reason = String(payload?.reason || payload?.message || `用户${action}运行实例`).trim();
        if (action === "cancel") {
            try {
                deps.removeTaskFromQueues(task.id, runId);
            }
            catch { }
            try {
                deps.requestTaskCancellation(task.id, reason, "task-run-api");
            }
            catch { }
            const updatedTask = deps.updateTask(task.id, { status: "cancelled", status_detail: reason, run_control: { run_id: runId, action, at: new Date().toISOString() } });
            const updatedRun = (0, task_run_store_1.patchTaskRun)(runId, { status: "cancelled", delivery_result: { status: "cancelled", reason }, reason });
            (0, utils_1.sendJson)(res, { success: true, action, run: updatedRun, task: updatedTask });
            return;
        }
        if (action === "retry") {
            if (run.status === "completed") {
                (0, utils_1.sendJson)(res, { success: false, error: "已完成运行不能重试" }, 409);
                return;
            }
            const result = deps.retryTask(task.id, ctx, reason, payload?.auto_execute !== false, runId);
            if (!result?.success) {
                (0, utils_1.sendJson)(res, result, result?.status || 409);
                return;
            }
            const nextRunId = String(result.task?.task_run?.run_id || result.task?.run_id || "");
            (0, utils_1.sendJson)(res, { ...result, action, parent_run_id: runId, run: nextRunId ? (0, task_run_store_1.getTaskRun)(nextRunId) : null });
            return;
        }
        if (["recovery_required", "cancelled", "completed"].includes(run.status)) {
            (0, utils_1.sendJson)(res, { success: false, error: `当前运行状态 ${run.status} 不允许恢复` }, 409);
            return;
        }
        const updatedTask = deps.updateTask(task.id, { status: "pending", status_detail: reason, recovery_required: false, run_control: { run_id: runId, action, at: new Date().toISOString() } });
        const queued = deps.enqueueTask(task.id, ctx, runId);
        const updatedRun = (0, task_run_store_1.patchTaskRun)(runId, { status: queued?.queued ? "queued" : "blocked", queue_lane: queued?.targetKey || run.queue_lane, reason });
        (0, utils_1.sendJson)(res, { success: !!queued?.queued, action, queued, run: updatedRun, task: updatedTask });
    }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
}
//# sourceMappingURL=task-run-routes.js.map