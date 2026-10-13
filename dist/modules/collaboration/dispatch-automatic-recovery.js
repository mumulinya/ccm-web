"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestAutomaticDispatchRecovery = requestAutomaticDispatchRecovery;
const db_1 = require("../../core/db");
const agent_run_store_1 = require("../../agents/agent-run-store");
const agent_run_lifecycle_1 = require("../../agents/agent-run-lifecycle");
/** Watchdogs are recovery requests, never authorization for a new review cycle. */
function requestAutomaticDispatchRecovery(taskId, reason) {
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    if (!task?.dispatch_profile_snapshot)
        return null;
    const { updateTask } = require("./collaboration-task-service");
    const run = (0, agent_run_store_1.getAgentRun)(task.active_run_id || "") || (0, agent_run_store_1.listAgentRuns)({ taskId }).find(row => !(0, agent_run_lifecycle_1.isAgentRunTerminal)(row.status));
    if (task.rework_exhausted || !run || (0, agent_run_lifecycle_1.isAgentRunTerminal)(run.status) || run.leaseExpiresAt && Date.parse(run.leaseExpiresAt) > Date.now()) {
        const blocked = updateTask(taskId, { status: "blocked", acceptance_state: task.rework_exhausted ? "needs_user" : "recovery_required", auto_execute: false,
            status_detail: task.rework_exhausted ? "自动返工已停止，恢复监控不能重置返工余额" : "无法确认旧 Runtime 已安全结束；保留原 Attempt 和返工周期，等待恢复核验" });
        return { success: false, status: 409, code: "TASK_RECOVERY_REVIEW_REQUIRED", error: blocked.status_detail, task: blocked };
    }
    const coordinator = require("../../agents/agent-execution-coordinator");
    coordinator.markPersistentAgentExecutionRecoveryRequired(run.runId, reason);
    updateTask(taskId, { status: "blocked", acceptance_state: "recovery_required", status_detail: "恢复监控正在核验原 Session 和工作区；返工余额保持不变" });
    void coordinator.startPersistentAgentExecution({ ...run, runId: run.runId, triggerType: "resume", reason: "resume", source: "startup_recovery",
        idempotencyKey: `automatic-recover:${run.runId}:${run.leaseId}`, leaseOwnerId: `automatic-recovery:${process.pid}`,
    }).then((result) => {
        if (result.mode === "blocked")
            updateTask(taskId, { status: "blocked", acceptance_state: "recovery_required", auto_execute: false, status_detail: `自动恢复证据不足：${result.reason || "resume_blocked"}；原周期和余额保持不变` });
    }).catch(() => {
        updateTask(taskId, { status: "blocked", acceptance_state: "recovery_required", auto_execute: false, status_detail: "自动恢复核验未通过，需要人工处理；未创建新 Attempt 或重置返工次数" });
    });
    return { success: true, scheduled: true, queued: false, run_id: run.runId, task: (0, db_1.loadTasks)().find(row => row.id === taskId) };
}
//# sourceMappingURL=dispatch-automatic-recovery.js.map