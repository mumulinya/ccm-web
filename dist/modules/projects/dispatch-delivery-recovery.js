"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockInterruptedDispatchDelivery = blockInterruptedDispatchDelivery;
exports.reconcileInterruptedDispatchDeliveries = reconcileInterruptedDispatchDeliveries;
const db_1 = require("../../core/db");
const agent_run_store_1 = require("../../agents/agent-run-store");
const collaboration_task_service_1 = require("../collaboration/collaboration-task-service");
/** An interrupted human merge wait is not a failed implementation. Retain the
 * branch and exact approval for recovery; never replay the worker implicitly. */
function blockInterruptedDispatchDelivery(taskId, runId, error) {
    if (!String(error?.code || "").startsWith("CCM_DISPATCH_DELIVERY_"))
        return null;
    const task = (0, db_1.loadTasks)().find(row => row.id === taskId);
    const run = (0, agent_run_store_1.getAgentRun)(runId);
    if (run && ["running", "waiting_confirmation", "waiting_input"].includes(run.status))
        (0, agent_run_store_1.transitionAgentRun)(runId, "paused", "交付门禁等待人工处理，保留隔离分支");
    const summary = String(error.message || "交付门禁未完成");
    const updated = (0, collaboration_task_service_1.updateTask)(taskId, { status: "blocked", auto_execute: false, acceptance_state: "needs_user", status_detail: summary, project_main_execution: { ...(task?.project_main_execution || {}), state: "paused", phase: "delivery_approval" } });
    return { task: updated, status: "blocked", summary, fileChanges: { count: 0, files: [] }, verification: [], risks: [summary], testAgent: null };
}
function reconcileInterruptedDispatchDeliveries() {
    let blocked = 0;
    for (const task of (0, db_1.loadTasks)()) {
        const pending = Object.values(task.dispatch_delivery_approvals || {}).some((row) => ["pending", "approved"].includes(row.status));
        if (!pending || ["done", "completed", "cancelled"].includes(task.status))
            continue;
        const run = (0, agent_run_store_1.getAgentRun)(task.agent_run_id || task.run_id || "");
        if (!run || !["waiting_confirmation", "recovery_required", "paused"].includes(run.status))
            continue;
        if (task.acceptance_state !== "delivery_recovery_required")
            (0, collaboration_task_service_1.updateTask)(task.id, { status: "blocked", auto_execute: false, acceptance_state: "delivery_recovery_required", status_detail: "服务中断期间的隔离分支交付需要核对提交、审批和接收分支；禁止重放开发 Runtime" });
        blocked++;
    }
    return { blocked };
}
//# sourceMappingURL=dispatch-delivery-recovery.js.map