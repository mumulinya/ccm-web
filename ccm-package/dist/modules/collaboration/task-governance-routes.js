"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTaskGovernanceRoutes = handleTaskGovernanceRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const logs_1 = require("./logs");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const execution_kernel_1 = require("../../agents/execution-kernel");
function handleTaskGovernanceRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    if (pathname === "/api/tasks/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const task = deps.archiveTask(payload.id, deps.compactFormText(payload.reason, "用户删除任务并移入归档"));
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, task, cleanup: task.cleanup, archived: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/restore" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const task = deps.restoreArchivedTask(payload.id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, task });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/purge" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const task = deps.purgeArchivedTask(payload.id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, task_id: task.id, cleanup: task.purge_cleanup || null });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/bulk" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const ids = deps.uniqueStrings(Array.isArray(payload.ids) ? payload.ids : []);
                const action = String(payload.action || "");
                if (!ids.length)
                    return (0, utils_1.sendJson)(res, { error: "请选择任务" }, 400);
                if (!["archive", "restore", "purge", "pause", "resume", "cancel"].includes(action))
                    return (0, utils_1.sendJson)(res, { error: "不支持的批量操作" }, 400);
                const results = ids.map((id) => {
                    try {
                        if (action === "archive")
                            return { id, success: !!deps.archiveTask(id, "用户批量删除任务并移入归档") };
                        if (action === "restore")
                            return { id, success: !!deps.restoreArchivedTask(id) };
                        if (action === "purge")
                            return { id, success: !!deps.purgeArchivedTask(id) };
                        if (action === "cancel") {
                            deps.removeTaskFromQueues(id);
                            (0, execution_kernel_1.requestTaskCancellation)(id, "用户批量取消任务", "task-governance");
                            const task = deps.updateTask(id, { status: "cancelled", auto_execute: false, cancelled_at: new Date().toISOString(), status_detail: "用户批量取消任务" });
                            (0, agent_sessions_1.closeTaskAgentSessions)({ taskId: id }, "用户批量取消任务");
                            (0, reliability_ledger_1.releaseTaskLease)(id, "cancelled");
                            return { id, success: !!task };
                        }
                        const paused = action === "pause";
                        const task = deps.updateTask(id, { status: paused ? "paused" : "pending", is_paused: paused, paused, status_detail: paused ? "用户批量暂停" : "用户批量恢复" });
                        if (!paused && task)
                            deps.enqueueTask(id, ctx);
                        return { id, success: !!task };
                    }
                    catch (error) {
                        return { id, success: false, error: error.message };
                    }
                });
                (0, utils_1.sendJson)(res, { success: results.every((item) => item.success), results }, results.some((item) => item.success) ? 200 : 409);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const queueResult = deps.enqueueTask(task_id, ctx);
                (0, utils_1.sendJson)(res, { success: true, message: queueResult.message, queued: queueResult.queued, queue_result: queueResult, queue_status: deps.getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/retry" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const operationKey = String(payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId || "").trim();
                const task = (0, db_1.loadTasks)().find((item) => item.id === taskId);
                const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "task-retry", key: `${taskId}:${operationKey}`, traceId: task?.trace_id, leaseMs: 60_000 }) : null;
                if (operation && !operation.acquired)
                    return (0, utils_1.sendJson)(res, { success: true, duplicate: true, ...(operation.record?.result || {}), trace_id: operation.traceId });
                const autoExecute = payload.auto_execute !== false && payload.autoExecute !== false;
                const result = deps.retryTask(taskId, ctx, payload.reason || payload.message || "", autoExecute);
                if (!result.success) {
                    if (operationKey)
                        (0, reliability_ledger_1.failIdempotency)("task-retry", `${taskId}:${operationKey}`, result.error || "重试失败");
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                }
                if (operationKey)
                    (0, reliability_ledger_1.completeIdempotency)("task-retry", `${taskId}:${operationKey}`, { task_id: taskId, queued: !!result.queue_result?.queued, retry_count: result.task?.retry_count });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/retry-runtime-failures" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, deps.retryRuntimeFailedTasks(ctx, payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue-batch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_ids } = JSON.parse(body);
                if (!task_ids || !Array.isArray(task_ids))
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID 列表" }, 400);
                const results = task_ids.map(id => ({ task_id: id, ...deps.enqueueTask(id, ctx) }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, { success: true, message: `${queuedCount}/${task_ids.length} 个任务已加入队列`, results, queue_status: deps.getQueueStatus() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, deps.getQueueStatus());
        return true;
    }
    if (pathname === "/api/tasks/watchdog" && req.method === "GET") {
        const staleMs = parsed.query.stale_ms ? Number(parsed.query.stale_ms) : deps.taskWatchdogStaleMs;
        (0, utils_1.sendJson)(res, deps.getTaskWatchdogStatus(staleMs));
        return true;
    }
    if (pathname === "/api/tasks/watchdog/resume" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, deps.runTaskWatchdog(ctx));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tasks/runtime-debt/cleanup" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, deps.cleanupRuntimeDebt(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/queue/resume" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, { success: true, ...deps.resumeTaskQueues(ctx, { force: true }) });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tasks/queue/clear" && req.method === "POST") {
        deps.clearTaskQueues();
        (0, utils_1.sendJson)(res, { success: true, message: "队列已清空" });
        return true;
    }
    if (pathname === "/api/tasks/logs" && req.method === "GET") {
        const taskId = parsed.query.task_id;
        const limit = parseInt(String(parsed.query.limit || "")) || 50;
        if (!taskId)
            return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
        const logs = (0, logs_1.getTaskLogs)(String(taskId), limit);
        (0, utils_1.sendJson)(res, { success: true, logs });
        return true;
    }
    if (pathname === "/api/tasks/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                (0, logs_1.clearTaskLogs)(task_id);
                (0, utils_1.sendJson)(res, { success: true, message: "日志已清空" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=task-governance-routes.js.map