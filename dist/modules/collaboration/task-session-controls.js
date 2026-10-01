"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskSessionControls = taskSessionControls;
const stream_1 = require("stream");
const db_1 = require("../../core/db");
const task_run_store_1 = require("./task-run-store");
const task_session_store_1 = require("./task-session-store");
/** Reuse the existing safe pause and acceptance gates, including their permission checks. */
function invokeControlRoute(pathname, payload, req, deps) {
    return new Promise((resolve, reject) => {
        const request = stream_1.Readable.from([JSON.stringify(payload)]);
        Object.assign(request, { method: "POST", headers: req.headers || {}, ccmAuth: req.ccmAuth, url: pathname });
        const response = {
            statusCode: 200, setHeader() { }, writeHead(status) { this.statusCode = status; },
            end(body) {
                try {
                    const result = JSON.parse(String(body));
                    if (this.statusCode >= 400 || result.success === false || result.error) {
                        reject(Object.assign(new Error(result.error || "任务操作失败"), { code: result.code, status: this.statusCode }));
                    }
                    else
                        resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            },
        };
        if (!deps.dispatchRoute(pathname, request, response, { pathname, query: {} }))
            reject(new Error("任务控制服务不可用"));
    });
}
function taskSessionControls(deps) {
    return {
        confirmExecution: ({ task, payload }) => {
            const run = (0, task_run_store_1.getTaskRun)(task.active_run_id || task.run_id || task.task_run?.run_id);
            if (!run)
                throw new Error("当前任务运行不存在");
            const updated = deps.updateTask(task.id, {
                intake_state: "confirmed", acceptance_state: "confirmed", confirmed_at: new Date().toISOString(),
                plan_confirmation: { key: payload.idempotency_key, spec_checksum: task.task_spec.checksum, plan_revision: task.plan_revision_count || 1 },
                auto_execute: true, status: "pending",
                task_run: { ...task.task_run, spec_revision: run.spec_revision },
                status_detail: "用户已确认执行计划",
            });
            const queued = deps.enqueueTask(task.id, run.run_id);
            return { success: !!queued?.queued, action: "confirm_execution", queued, task: updated };
        },
        archiveUnfinished: ({ task, payload, req }) => invokeControlRoute("/api/tasks/acceptance", { ...payload, task_id: task.id, action: "archive_unfinished" }, req, deps),
        taskRunAction: async ({ action, task, run, payload, req }) => {
            task = (0, db_1.getTaskById)(task.id);
            const guard = (0, task_run_store_1.validateActiveTaskRun)(task, run.run_id);
            if (!guard.ok)
                throw Object.assign(new Error(guard.error), { code: guard.code, status: 409 });
            if (String(payload.attempt_id || "") !== `${run.run_id}:${run.attempt}`) {
                throw Object.assign(new Error("运行尝试已变化，请刷新后重试"), { code: "TASK_RUN_ATTEMPT_MISMATCH", status: 409 });
            }
            if (["pause", "resume"].includes(action)) {
                if (task.intake_state === "awaiting_confirmation")
                    throw new Error("请先确认执行计划");
                return invokeControlRoute(action === "pause" ? "/api/tasks/pause" : "/api/tasks/resume-paused", {
                    ...payload, task_id: task.id, run_id: run.run_id,
                    expected_revision: task.revision, pauseSequence: task.pause_control?.pauseSequence,
                }, req, deps);
            }
            if (action === "retry") {
                if (!["failed", "blocked", "cancelled", "recovery_required"].includes(run.status) || task.intake_state === "awaiting_confirmation") {
                    throw new Error("当前运行不能重试，请先完成计划确认");
                }
                return { ...deps.retryTask(task.id, payload.reason || "用户重试", payload.auto_execute !== false, run.run_id), action };
            }
            if (action === "cancel") {
                if (["completed", "failed", "cancelled"].includes(run.status))
                    throw new Error("运行已经结束");
                const reason = String(payload.reason || "用户取消任务");
                deps.removeTaskFromQueues(task.id, run.run_id);
                deps.requestTaskCancellation(task.id, reason, "task-session-api");
                const updated = deps.updateTask(task.id, { status: "cancelled", status_detail: reason });
                (0, task_session_store_1.materializeTaskSession)(updated);
                return { success: true, action, task: updated };
            }
            throw new Error("不支持此运行操作");
        },
    };
}
//# sourceMappingURL=task-session-controls.js.map