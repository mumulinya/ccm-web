"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectCurrentAgentRun = selectCurrentAgentRun;
exports.assertTaskAndRunProjectionConsistency = assertTaskAndRunProjectionConsistency;
exports.buildTaskRunConsistencyProjection = buildTaskRunConsistencyProjection;
exports.repairTaskAgentRunProjection = repairTaskAgentRunProjection;
exports.reconcileTaskAgentRunConsistency = reconcileTaskAgentRunConsistency;
const agent_run_store_1 = require("./agent-run-store");
const agent_heartbeat_coordinator_1 = require("./agent-heartbeat-coordinator");
const db_1 = require("../core/db");
const agent_governance_store_1 = require("./agent-governance-store");
const agent_routine_store_1 = require("./agent-routine-store");
const ACTIVE = new Set([
    "created", "queued", "leased", "starting", "running", "waiting_confirmation",
    "waiting_input", "paused", "recovering",
]);
const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);
const TASK_TERMINAL = new Set(["done", "completed", "succeeded", "success", "failed", "cancelled"]);
const VERIFICATION_STATES = new Set([
    "test_agent_running", "test_agent_passed", "main_agent_accepting", "rework_required",
    "reworking", "test_agent_recheck", "environment_blocked", "needs_user", "blocked",
]);
function text(value) { return String(value ?? "").trim(); }
function isActive(run) { return ACTIVE.has(run.status); }
function isTerminal(run) { return TERMINAL.has(run.status); }
function latestHeartbeat(run, wakes) {
    return wakes
        .filter(wake => wake.runId === run.runId || wake.coalescedRunId === run.runId)
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0] || null;
}
function heartbeatsForRun(run, wakes) {
    const related = wakes.filter(wake => wake.runId === run.runId || wake.coalescedRunId === run.runId);
    if (related.length || !wakes.length)
        return related;
    // A completed orphan wake still belongs to this task even when an older
    // runner failed to persist run_id. Only inspect the newest unbound wake so
    // historical wakes cannot make a healthy Run look inconsistent.
    const newest = [...wakes].sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0];
    return newest && !newest.runId && !newest.coalescedRunId ? [newest] : related;
}
function heartbeatConsistencyIssues(run, wakes) {
    if (!run)
        return [];
    const issues = [];
    for (const wake of heartbeatsForRun(run, wakes)) {
        if (wake.status === "completed" && !isTerminal(run)) {
            issues.push(wake.runId || wake.coalescedRunId
                ? "heartbeat_completed_without_terminal_run"
                : "heartbeat_completed_without_run_binding");
        }
        if (wake.status === "failed" && !["failed", "cancelled", "recovery_required"].includes(run.status)) {
            issues.push("heartbeat_failed_without_run_evidence");
        }
        if (["queued", "claimed", "coalesced"].includes(wake.status) && isTerminal(run)) {
            issues.push("heartbeat_pending_after_terminal_run");
        }
    }
    return Array.from(new Set(issues));
}
function selectCurrentAgentRun(task, runs = (0, agent_run_store_1.listAgentRuns)({ taskId: text(task?.id || task?.task_id), limit: 500 })) {
    const explicit = text(task?.active_run_id || task?.agent_run_id || task?.agentRunId || task?.run_id || task?.project_main_run_id);
    if (explicit)
        return runs.find(run => run.runId === explicit) || (0, agent_run_store_1.getAgentRun)(explicit) || runs.find(run => isActive(run)) || runs[0] || null;
    return runs.find(run => isActive(run)) || runs[0] || null;
}
function assertTaskAndRunProjectionConsistency(task, runs = (0, agent_run_store_1.listAgentRuns)({ taskId: text(task?.id || task?.task_id), limit: 500 }), wakes = (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId: text(task?.id || task?.task_id), limit: 500 })) {
    const taskId = text(task?.id || task?.task_id);
    const current = selectCurrentAgentRun(task, runs);
    const taskStatus = text(task?.status).toLowerCase();
    const acceptanceState = text(task?.acceptance_state || task?.acceptanceState).toLowerCase();
    const issues = [];
    if (!taskId)
        issues.push("task_identity_missing");
    if (current) {
        if (isActive(current) && TASK_TERMINAL.has(taskStatus))
            issues.push("task_terminal_while_run_active");
        if (current.status === "recovery_required" && !["pending", "blocked", "recovery_required", "waiting_input"].includes(taskStatus) && acceptanceState !== "recovery_required") {
            issues.push("run_recovery_required_not_projected");
        }
        if (current.status === "succeeded" && ["pending", "running"].includes(taskStatus) && !VERIFICATION_STATES.has(acceptanceState)) {
            issues.push("run_succeeded_task_still_running");
        }
        if (current.status === "failed" && ["done", "completed", "success", "succeeded"].includes(taskStatus))
            issues.push("run_failed_task_marked_success");
        if (current.status === "cancelled" && ["done", "completed", "success", "succeeded"].includes(taskStatus))
            issues.push("run_cancelled_task_marked_success");
        issues.push(...heartbeatConsistencyIssues(current, wakes));
        const checkout = (0, agent_governance_store_1.getAgentTaskCheckout)(current.taskId, current.runId);
        if (isActive(current) && (!checkout || checkout.status !== "active"))
            issues.push("run_active_without_active_checkout");
        if (!isActive(current) && checkout?.status === "active")
            issues.push("checkout_active_after_run_terminal");
        if (isActive(current) && (0, agent_governance_store_1.listActiveBlockingDependencies)(current.taskId).length)
            issues.push("dependency_blocked_run_started");
        if (isActive(current) && (0, agent_governance_store_1.listAgentApprovals)(current.runId).some(item => item.status === "pending"))
            issues.push("approval_pending_while_run_active");
        if (isTerminal(current) && (0, agent_governance_store_1.listAgentRunSecrets)(current.runId).some(item => item.status === "injected"))
            issues.push("secret_injected_after_run_terminal");
        const routineRun = (0, agent_routine_store_1.listAgentRoutineRuns)().find(item => item.runId === current.runId);
        if (routineRun && ["succeeded", "failed", "skipped"].includes(routineRun.status) && isActive(current))
            issues.push("routine_terminal_while_run_active");
    }
    if (["done", "completed"].includes(taskStatus) && runs.some(isActive))
        issues.push("task_done_with_active_run");
    const state = issues.length === 0
        ? "consistent"
        : issues.some(issue => issue.includes("missing") || issue.includes("ambiguous") || issue.includes("recovery_required") || issue.startsWith("heartbeat_"))
            ? "blocked"
            : "repairable";
    return { consistent: issues.length === 0, state, issues, current, runs, wakes };
}
function buildTaskRunConsistencyProjection(task) {
    const taskId = text(task?.id || task?.task_id);
    if (!taskId)
        return null;
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId, limit: 500 });
    const current = selectCurrentAgentRun(task, runs);
    if (!current)
        return null;
    const wakes = (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId, limit: 500 });
    const wake = latestHeartbeat(current, wakes);
    const checked = assertTaskAndRunProjectionConsistency(task, runs);
    return {
        run_id: current.runId,
        run_status: current.status,
        runtime_id: current.runtimeId,
        run_started_at: current.startedAt,
        run_finished_at: current.finishedAt,
        run_recovery_state: ["recovery_required", "recovering"].includes(current.status) ? current.status : "",
        heartbeat_wake_id: wake?.wakeId || "",
        heartbeat_status: wake?.status || "",
        heartbeat_coalesced: wake?.status === "coalesced" || wake?.coalescedRunId === current.runId,
        lease_owner_id: current.leaseOwnerId,
        lease_expires_at: current.leaseExpiresAt,
        consistency_state: checked.state,
        consistency_issues: checked.issues,
    };
}
/**
 * Repair only the durable task projection from the AgentRun authority. This
 * deliberately does not infer success or rewrite a task lifecycle status.
 */
function repairTaskAgentRunProjection(task, current, wake = null) {
    const taskId = text(task?.id || task?.task_id);
    if (!taskId || !current)
        return { repaired: false, task: task || null, reason: "missing_identity" };
    const recovery = current.status === "recovery_required" || current.status === "recovering";
    const terminalConflict = (current.status === "failed" || current.status === "cancelled")
        && ["done", "completed", "success", "succeeded"].includes(text(task?.status).toLowerCase());
    const activeAfterDone = ["done", "completed"].includes(text(task?.status).toLowerCase()) && isActive(current);
    const heartbeatConflict = !!wake && ((wake.status === "completed" && !isTerminal(current))
        || (wake.status === "failed" && !["failed", "cancelled", "recovery_required"].includes(current.status))
        || (["queued", "claimed", "coalesced"].includes(wake.status) && isTerminal(current)));
    const patch = {
        active_run_id: current.runId,
        agent_run_id: current.runId,
        run_id: current.runId,
        trace_id: current.traceId,
        attempt_id: current.attemptId,
        run_status: current.status,
        run_recovery_state: recovery ? current.status : "",
        heartbeat_wake_id: wake?.wakeId || "",
        heartbeat_status: wake?.status || "",
        heartbeat_coalesced: wake?.status === "coalesced" || wake?.coalescedRunId === current.runId,
        run_projection_updated_at: new Date().toISOString(),
    };
    if (recovery || terminalConflict || activeAfterDone || heartbeatConflict) {
        patch.recovery_required = true;
        patch.recovery_required_at = patch.recovery_required_at || new Date().toISOString();
        patch.acceptance_state = "recovery_required";
        patch.status_detail = recovery
            ? "AgentRun 需要恢复检查，任务状态已同步为待处理"
            : terminalConflict
                ? "AgentRun 已失败或取消，但任务终态与运行结果冲突，等待人工核对"
                : heartbeatConflict
                    ? "Heartbeat 与 AgentRun 终态不一致，等待恢复核对"
                    : "任务已标记完成但仍存在活跃 AgentRun，等待一致性核对";
    }
    try {
        const updated = (0, db_1.updateTaskById)(taskId, (latest) => ({ ...latest, ...patch, id: latest.id }));
        return { repaired: !!updated, task: updated || task, patch };
    }
    catch (error) {
        return { repaired: false, task, patch, reason: String(error?.message || error) };
    }
}
function reconcileTaskAgentRunConsistency(tasks = [], options = {}) {
    let checked = 0;
    let consistent = 0;
    let repairable = 0;
    let blocked = 0;
    let repaired = 0;
    const issues = [];
    for (const task of tasks) {
        const taskId = text(task?.id || task?.task_id);
        const wakes = taskId ? (0, agent_heartbeat_coordinator_1.listAgentHeartbeats)({ taskId, limit: 500 }) : [];
        const result = assertTaskAndRunProjectionConsistency(task, undefined, wakes);
        checked += 1;
        if (result.state === "consistent")
            consistent += 1;
        else {
            if (result.state === "repairable")
                repairable += 1;
            else
                blocked += 1;
            const current = result.current;
            const wake = current ? latestHeartbeat(current, wakes) : null;
            const repair = repairTaskAgentRunProjection(task, current, wake);
            if (repair.repaired)
                repaired += 1;
            issues.push({ taskId: text(task?.id || task?.task_id), runId: current?.runId || "", state: result.state, issues: result.issues });
            if (options.appendEvents !== false && current) {
                (0, agent_run_store_1.appendAgentRunEvent)(current.runId, {
                    eventType: result.state === "blocked" ? "task_run.consistency_blocked" : "task_run.consistency_repairable",
                    status: current.status,
                    message: "Task 与 AgentRun 投影存在一致性问题",
                    payload: { taskId: text(task?.id || task?.task_id), issues: result.issues },
                    idempotencyKey: `task-run-consistency:${current.runId}:${result.issues.join(",")}`,
                });
            }
        }
    }
    return { checked, consistent, repairable, blocked, repaired, issues };
}
//# sourceMappingURL=agent-run-consistency.js.map