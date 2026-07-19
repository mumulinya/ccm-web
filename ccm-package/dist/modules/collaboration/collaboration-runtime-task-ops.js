"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.switchTaskExecutor = switchTaskExecutor;
exports.retryRuntimeFailedTasks = retryRuntimeFailedTasks;
exports.archiveTask = archiveTask;
exports.restoreArchivedTask = restoreArchivedTask;
exports.purgeArchivedTask = purgeArchivedTask;
exports.handleCollaborationApi = handleCollaborationApi;
const db_1 = require("../../core/db");
const logs_1 = require("./logs");
const test_agent_runner_1 = require("./test-agent-runner");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const runtime_1 = require("../../agents/runtime");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const collaboration_resilience_1 = require("./collaboration-resilience");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
function switchTaskExecutor(id, requestedRuntime, ctx, options = {}) {
    if (collaboration_runtime_task_queue_1.runningTaskIds.has(id))
        return { success: false, status: 409, error: "任务正在执行中，请先暂停或等待本轮结束后再切换执行器" };
    const current = (0, db_1.loadTasks)().find((task) => task.id === id);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    if (current.archived || current.deleted_at)
        return { success: false, status: 409, error: "归档任务不能切换执行器，请先恢复" };
    if (["done", "cancelled"].includes(String(current.status || "")))
        return { success: false, status: 409, error: "已结束任务不能切换执行器" };
    const requested = String(requestedRuntime || "").trim().toLowerCase();
    const descriptor = (0, runtime_1.getPublicAgentRuntimes)().find((runtime) => runtime.id === requested || runtime.aliases?.includes(requested));
    if (!descriptor)
        return { success: false, status: 400, error: `不支持的执行器：${requested || "未指定"}` };
    if (!(0, collaboration_resilience_1.isRuntimeCommandAvailable)(descriptor.id))
        return { success: false, status: 409, error: `${descriptor.label} 当前不可用，请先安装或登录对应 CLI` };
    const project = String(options.project || options.target_project || options.targetProject || "").trim();
    const overrideKey = project || "*";
    const previousRuntime = String(current.runtime_overrides?.[overrideKey] || current.runtime_override || "").trim();
    const now = new Date().toISOString();
    const historyItem = {
        from: previousRuntime || "project_default",
        to: descriptor.id,
        project: project || "all",
        reason: (0, collaboration_runtime_runtime_tools_1.compactFormText)(options.reason, "用户手动切换执行器"),
        switched_at: now,
    };
    const sessions = (0, agent_sessions_1.closeTaskAgentSessions)({ taskId: id }, `执行器切换为 ${descriptor.label}，旧原生会话已关闭`);
    const task = (0, collaboration_runtime_runtime_tools_1.updateTask)(id, {
        runtime_override: project ? current.runtime_override || "" : descriptor.id,
        runtime_overrides: { ...(current.runtime_overrides || {}), [overrideKey]: descriptor.id },
        runtime_switch_history: [...(Array.isArray(current.runtime_switch_history) ? current.runtime_switch_history : []), historyItem].slice(-20),
        status: "pending",
        is_paused: false,
        paused: false,
        queued_at: null,
        status_detail: `已切换到 ${descriptor.label}，等待从现有工作区和证据继续执行`,
        collaboration_state: { ...(current.collaboration_state || {}), phase: "reworking", needs_user: false, updated_at: now },
        last_runtime_switch_at: now,
    });
    if (!task)
        return { success: false, status: 500, error: "切换执行器后保存任务失败" };
    (0, logs_1.addTaskLog)(id, "warning", `执行器切换：${historyItem.from} → ${descriptor.id}${project ? `（${project}）` : "（全部项目 Agent）"}；关闭 ${sessions.length} 个旧会话`);
    (0, logs_1.appendTaskTimelineEvent)(id, { type: "runtime_switch", title: "用户切换执行器", detail: `${historyItem.from} → ${descriptor.id}`, status: "warn", phase: "reworking", agent: project || "all", data: { ...historyItem, sessions_closed: sessions.length } });
    (0, reliability_ledger_1.appendTraceEvent)(current.trace_id, { type: "task.runtime_switched", status: "warning", task_id: id, group_id: current.group_id || "", agent: project || "all", message: `${historyItem.from} → ${descriptor.id}`, data: { ...historyItem, sessions_closed: sessions.length } });
    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(task, "pending", task.status_detail);
    const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
    const queueResult = autoExecute ? (0, collaboration_runtime_coordinator_review_1.enqueueTask)(id, ctx) : null;
    return { success: true, task, runtime: descriptor, previous_runtime: historyItem.from, project: project || null, sessions_closed: sessions.length, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_runtime_coordinator_review_1.getQueueStatus)() };
}
function retryRuntimeFailedTasks(ctx, options = {}) {
    const autoExecute = options.auto_execute !== false && options.autoExecute !== false;
    const dryRun = !!(options.dry_run || options.dryRun);
    const limit = Math.max(1, Math.min(100, Number(options.limit || 100)));
    const probeTarget = options.probeTarget || options.probe_target || null;
    const candidates = (0, db_1.loadTasks)()
        .filter(collaboration_runtime_task_queue_1.isRecoverableRuntimeFailure)
        .filter((task) => (0, collaboration_runtime_coordinator_review_1.taskMatchesAgentProbeTarget)(task, probeTarget))
        .sort((a, b) => Date.parse(a.updated_at || a.created_at || "") - Date.parse(b.updated_at || b.created_at || ""))
        .slice(0, limit);
    if (dryRun) {
        return {
            success: true,
            dry_run: true,
            total_recoverable: candidates.length,
            retried: 0,
            queued: 0,
            auto_execute: autoExecute,
            results: candidates.map((task) => ({
                task_id: task.id,
                title: task.title,
                status: task.status,
                retry_count: Number(task.retry_count || 0),
                previous_failure: (0, collaboration_runtime_task_queue_1.getTaskFailureText)(task).slice(0, 500),
            })),
            queue_status: (0, collaboration_runtime_coordinator_review_1.getQueueStatus)(),
        };
    }
    const results = candidates.map((task) => {
        const reason = options.reason || "执行通道恢复后批量重试";
        const result = (0, collaboration_runtime_runtime_tools_1.retryTask)(task.id, ctx, reason, autoExecute);
        return {
            task_id: task.id,
            title: task.title,
            previous_failure: (0, collaboration_runtime_task_queue_1.getTaskFailureText)(task).slice(0, 500),
            ...result,
        };
    });
    return {
        success: true,
        total_recoverable: candidates.length,
        retried: results.filter((item) => item.success).length,
        queued: results.filter((item) => item.queued).length,
        auto_execute: autoExecute,
        results,
        queue_status: (0, collaboration_runtime_coordinator_review_1.getQueueStatus)(),
    };
}
function archiveTask(id, reason = "用户删除任务") {
    const tasks = (0, db_1.loadTasks)();
    const index = tasks.findIndex(task => task.id === id);
    if (index < 0)
        return null;
    const current = tasks[index];
    if (current.archived || current.deleted_at)
        return current;
    (0, collaboration_runtime_runtime_tools_1.removeTaskFromQueues)(id);
    const running = collaboration_runtime_task_queue_1.runningTaskIds.has(id);
    let cancellation = null;
    if (!['done', 'cancelled'].includes(String(current.status || ''))) {
        try {
            cancellation = (0, execution_kernel_1.requestTaskCancellation)(id, reason, "task-governance");
        }
        catch { }
        try {
            (0, test_agent_runner_1.cancelTestAgentRunsForTask)(id, reason);
        }
        catch { }
    }
    const sessions = (0, agent_sessions_1.closeTaskAgentSessions)({ taskId: id }, `${reason}，关闭任务级原生会话`);
    const leaseReleased = (0, reliability_ledger_1.releaseTaskLease)(id, "archived");
    const idempotencySettled = current.trace_id ? (0, reliability_ledger_1.settleIdempotencyByTrace)(current.trace_id, "failed", { archived: true, task_id: id, reason }) : [];
    const worktrees = [];
    for (const execution of (0, execution_kernel_1.listExecutions)({ taskId: id })) {
        if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt)
            continue;
        try {
            worktrees.push({ execution_id: execution.id, ...(0, execution_kernel_1.cleanupExecutionWorktree)(execution.id, true) });
        }
        catch (error) {
            worktrees.push({ execution_id: execution.id, success: false, error: error.message });
        }
    }
    const now = new Date().toISOString();
    const cleanup = {
        queue_removed: true,
        cancellation,
        sessions_closed: sessions.length,
        lease_released: leaseReleased,
        idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0),
        worktrees,
        running_at_request: running,
        completed_at: now,
    };
    tasks[index] = {
        ...current,
        previous_status: current.status,
        status: "archived",
        status_detail: reason,
        archived: true,
        archived_at: now,
        deleted_at: now,
        auto_execute_before_archive: current.auto_execute !== false,
        auto_execute: false,
        cleanup,
        collaboration_state: { ...(current.collaboration_state || {}), phase: "cancelled", needs_user: false, updated_at: now },
        updated_at: now,
    };
    (0, db_1.saveTasks)(tasks);
    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(tasks[index], "cancelled", "任务已删除并归档");
    (0, reliability_ledger_1.appendTraceEvent)(current.trace_id, { type: "task.archived", status: "warning", task_id: id, group_id: current.group_id || "", message: reason, data: cleanup });
    return tasks[index];
}
function restoreArchivedTask(id) {
    const tasks = (0, db_1.loadTasks)();
    const index = tasks.findIndex(task => task.id === id);
    if (index < 0)
        return null;
    const current = tasks[index];
    if (!current.archived && !current.deleted_at)
        return current;
    (0, execution_kernel_1.clearTaskCancellation)(id);
    const now = new Date().toISOString();
    const restoredStatus = current.previous_status === "done" ? "done" : "pending";
    tasks[index] = {
        ...current,
        status: restoredStatus,
        status_detail: restoredStatus === "done" ? "已从归档恢复" : "已从归档恢复，等待重新执行",
        archived: false,
        archived_at: null,
        deleted_at: null,
        restored_at: now,
        auto_execute: restoredStatus !== "done" ? current.auto_execute_before_archive !== false : false,
        collaboration_state: { ...(current.collaboration_state || {}), phase: restoredStatus === "done" ? "completed" : "planning", needs_user: false, updated_at: now },
        updated_at: now,
    };
    (0, db_1.saveTasks)(tasks);
    (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(tasks[index], restoredStatus, tasks[index].status_detail);
    (0, reliability_ledger_1.appendTraceEvent)(current.trace_id, { type: "task.restored", status: "info", task_id: id, group_id: current.group_id || "", message: "任务已从归档恢复" });
    return tasks[index];
}
function purgeArchivedTask(id) {
    return require("./collaboration-task-service").purgeArchivedTask(id);
}
(0, daily_dev_backlog_1.configureDailyDevBacklogRuntime)({
    validateDailyDevGroupReady: collaboration_runtime_status_helpers_1.validateDailyDevGroupReady,
    getReadyDailyDevMembers: collaboration_runtime_status_helpers_1.getReadyDailyDevMembers,
    getTaskExecutionPhase: collaboration_runtime_runtime_tools_1.getTaskExecutionPhase,
    taskNeedsUserIntervention: collaboration_runtime_runtime_tools_1.taskNeedsUserIntervention,
    isTaskQueuedInMemory: collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory,
    createTask: collaboration_runtime_runtime_tools_1.createTask,
    enqueueTask: collaboration_runtime_coordinator_review_1.enqueueTask,
    getQueueStatus: collaboration_runtime_coordinator_review_1.getQueueStatus,
    getAgentExecutionReadiness: collaboration_runtime_plan_tools_1.getAgentExecutionReadiness,
    continueDailyDevTasksFromGaps: collaboration_runtime_runtime_tools_1.continueDailyDevTasksFromGaps,
    buildDailyDevAgentDiagnostics: collaboration_runtime_plan_tools_1.buildDailyDevAgentDiagnostics,
    hasDailyDevContinuationGaps: collaboration_runtime_runtime_tools_1.hasDailyDevContinuationGaps,
});
function handleCollaborationApi(pathname, req, res, parsed, ctx) {
    return require("./collaboration-routes").handleCollaborationApi(pathname, req, res, parsed, ctx);
}
//# sourceMappingURL=collaboration-runtime-task-ops.js.map