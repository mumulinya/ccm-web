"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectUserWorkflow = projectUserWorkflow;
exports.filterUserWorkflowActions = filterUserWorkflowActions;
exports.readUserWorkflow = readUserWorkflow;
const crypto_1 = require("crypto");
const acceptance_user_projection_1 = require("./acceptance-user-projection");
const acceptance_failure_routing_1 = require("./acceptance-failure-routing");
const runtime_continuity_projection_1 = require("./runtime-continuity-projection");
const labels = { planning: "正在整理执行计划", queued: "等待执行", developing: "开发 Agent 正在执行",
    development_finished: "开发执行结束，等待验收", verifying: "正在核对真实产出与验证证据", acceptance_passed: "验收通过，正在准备交付",
    awaiting_delivery: "等待批准指定交付动作", awaiting_completion_confirmation: "结果已准备，请确认任务完成", completed: "任务已完成",
    blocked: "任务需要处理阻塞事项", paused: "任务已暂停", failed: "执行失败，请查看证据", cancelled: "任务已取消", needs_reconciliation: "任务状态需要核对" };
/** Pure shared projection. Callers supply persisted facts, never model-inferred completion. */
function projectUserWorkflow(task, facts = {}) {
    const run = facts.run, state = String(task.acceptance_state || ""), status = String(task.status || "");
    const blockers = [];
    const add = (code, summary, actions, evidence_refs = []) => blockers.push({ code, summary, available_actions: actions, evidence_refs });
    const hard = ["recovery_required", "delivery_recovery_required"].includes(state) || run?.status === "recovery_required"
        || state === "accepted" && ["done", "completed"].includes(status) && run && !["succeeded", "failed", "cancelled"].includes(run.status)
        || ["conflict", "blocked", "repairable"].includes(facts.consistency?.consistency_state || task.consistency_state)
        || facts.sourceSyncPending || task.source_sync_state === "pending";
    if (hard)
        add("reconciliation_required", "执行身份、工作区或提交记录需要核对", ["inspect_evidence"]);
    if (facts.permissionBlocked)
        add("permission_required", "当前操作缺少授权", []);
    if (facts.dependencyBlocked)
        add("dependency_required", "前置任务尚未完成", ["inspect_evidence"]);
    if (facts.checkoutBlocked)
        add("checkout_required", "工作区占用或执行租约需要核对", ["inspect_evidence"]);
    const executionFinished = ["succeeded", "failed", "cancelled"].includes(run?.status);
    if (facts.budgetBlocked && !executionFinished)
        add("budget_required", "当前预算不允许下一次调用", ["inspect_evidence"]);
    if (state === "environment_blocked")
        add("environment_required", "运行或验证环境尚未准备完成", ["inspect_evidence"]);
    if (task.rework_exhausted)
        add(task.rework_exhausted.reason || "rework_exhausted", "自动修复已停止，请检查缺口与证据", executionFinished && ["rework_exhausted", "rework_no_progress"].includes(task.rework_exhausted.reason)
            ? ["inspect_evidence", "retry"] : ["inspect_evidence"]);
    const scope = (task.scope_expansion_requests || []).filter((r) => !task.attempt_id || r.attemptId === task.attempt_id)
        .map((r) => r.status === "pending" && r.expiresAt && Date.parse(r.expiresAt) <= Date.now() ? { ...r, status: "expired" } : r);
    for (const r of scope)
        if (r.status === "pending" || r.applicationState === "applying" || ["rejected", "expired"].includes(r.status))
            add(`scope_${r.applicationState === "applying" ? "applying" : r.status}`, r.applicationState === "applying" ? "范围审批仍在应用或对账" : r.status === "pending" ? "等待审阅范围申请" : "范围申请未获有效批准", r.status === "pending" ? ["review_approvals"] : ["inspect_evidence"], [r.id]);
    for (const r of scope)
        if (r.status === "approved" && r.continuation?.mode === "blocked"
            && (facts.runs || [run]).some(current => current?.runId === r.runId && !["succeeded", "failed", "cancelled"].includes(current.status)))
            add("scope_resume_blocked", `范围已批准，原执行仍需安全恢复核对：${(0, acceptance_user_projection_1.acceptanceDisplayText)(r.continuation.reason)}`, ["inspect_evidence"], [r.id]);
    const approvals = (facts.approvals || []).filter((r) => !run || r.runId === run.runId);
    for (const a of approvals)
        if (a.status !== "approved" && a.status !== "cancelled")
            add(`approval_${a.status}`, a.status === "pending" ? "等待审阅具体动作" : "审批未获有效批准", a.status === "pending" ? ["review_approvals"] : ["inspect_evidence"], [a.approvalId]);
    for (const a of facts.approvalItems || [])
        if (!["scope", "plan"].includes(a.kind) && ["pending", "rejected", "expired", "cancelled"].includes(a.status) && !approvals.some((r) => r.approvalId === a.id))
            add(`approval_${a.status}`, a.status === "pending" ? a.kind === "completion" ? "等待你确认任务完成" : a.kind === "delivery" ? "指定交付动作等待批准" : "等待审阅具体动作" : "审批未获有效批准", a.status === "pending" ? [a.kind === "completion" ? "confirm_completion" : "review_approvals"] : ["inspect_evidence"], [a.id]);
    const questions = task.task_spec?.clarification_questions || task.intake_draft?.clarification_questions || [];
    if (task.intake_state === "awaiting_confirmation")
        add(questions.length ? "clarification_required" : "plan_confirmation_required", questions.length ? "需要补充计划信息" : "等待确认执行计划", [questions.length ? "answer_clarification" : "confirm_execution"]);
    let phase = "needs_reconciliation";
    if (["cancelled", "canceled"].includes(status))
        phase = "cancelled";
    else if (blockers.length && !hard && blockers.every(b => b.code === "approval_pending") && facts.approvalItems?.length && facts.approvalItems.every(a => a.status === "approved" || a.kind === "delivery"))
        phase = "awaiting_delivery";
    else if (blockers.length && !hard && blockers.every(b => b.code === "approval_pending") && facts.approvalItems?.length && facts.approvalItems.every(a => a.status === "approved" || a.kind === "completion"))
        phase = "awaiting_completion_confirmation";
    else if (blockers.length)
        phase = "blocked";
    else if (state === "accepted" && ["done", "completed"].includes(status))
        phase = "completed";
    else if (state === "awaiting_user_acceptance")
        phase = "awaiting_completion_confirmation";
    else if (state === "waiting_confirmation" && Object.keys(task.dispatch_delivery_approvals || {}).length)
        phase = "awaiting_delivery";
    else if (["test_agent_passed", "main_agent_self_verified", "main_agent_accepting"].includes(state))
        phase = "acceptance_passed";
    else if (["main_agent_self_verifying", "test_agent_running", "awaiting_test_agent", "test_agent_recheck"].includes(state) || status === "reviewing")
        phase = "verifying";
    else if (run?.status === "succeeded")
        phase = "development_finished";
    else if (run?.status === "failed" || status === "failed")
        phase = "failed";
    else if (run?.status === "paused" || task.is_paused || status === "paused")
        phase = "paused";
    else if (["starting", "running", "recovering"].includes(run?.status))
        phase = "developing";
    else if (["created", "queued", "leased"].includes(run?.status) || ["pending", "queued"].includes(status))
        phase = "queued";
    else if (task.intake_state === "planning")
        phase = "planning";
    let actions = [...new Set(blockers.flatMap(b => b.available_actions))];
    if (hard || facts.permissionBlocked || scope.some((r) => r.applicationState === "applying"))
        actions = ["inspect_evidence"];
    if (!blockers.length)
        actions = phase === "awaiting_completion_confirmation" ? ["confirm_completion"] : ["inspect_evidence"];
    const route = (0, acceptance_failure_routing_1.classifyAcceptanceFailure)({ ...(task.test_agent_review || task.review || task.acceptance_result || {}), permissionBlocked: facts.permissionBlocked,
        environmentBlocked: state === "environment_blocked", deliveryReconciliationRequired: hard, review_cycle: task.review_cycle || task.review_cycle_id });
    const core = { phase, summary: labels[phase], waiting_on: hard || facts.checkoutBlocked ? "system" : facts.dependencyBlocked ? "dependency" : blockers.length || phase === "awaiting_completion_confirmation" ? "user" : ["developing", "verifying", "acceptance_passed", "development_finished"].includes(phase) ? "agent" : phase === "queued" ? "queue" : "none",
        blockers, primary_action: actions[0] || null, available_actions: actions, acceptance_feedback: route,
        compatible_action_kinds: workflowControlKinds(blockers),
        approval_items: facts.approvalItems || [],
        runtime_continuity: facts.runtimeContinuity || { session_saved: !!run?.nativeSessionId, inspection: "unknown", reuse: "unverified", reason: "" } };
    return { ...core, revision: (0, crypto_1.createHash)("sha256").update(JSON.stringify({ core, run: run?.runId, attempt: run?.attemptId, spec: task.task_spec?.checksum || task.task_spec?.revision })).digest("hex") };
}
/** Existing controls are compatibility projections, never a second decision source. */
function filterUserWorkflowActions(workflow, actions) {
    const kinds = workflow?.compatible_action_kinds ?? workflowControlKinds(workflow?.blockers || []);
    if (!kinds)
        return actions;
    return actions.filter(action => kinds.includes(typeof action === "string" ? action : action.kind || action.id));
}
function workflowControlKinds(blockers) {
    if (!blockers.length)
        return null;
    const allowed = new Set(["cancel", "view_changes", "open_source_session", "reconcile_delivery", "recheck", "takeover"]);
    if (blockers.every(b => ["plan_confirmation_required", "clarification_required"].includes(b.code))) {
        allowed.add("confirm_plan");
        allowed.add("revise_plan");
    }
    if (blockers.every(b => b.available_actions.includes("retry")))
        allowed.add("retry");
    return Array.from(allowed);
}
function readUserWorkflow(task) {
    const { listAgentRuns, getAgentRun } = require("./agent-run-store");
    const id = task.id || task.task_id;
    const runs = listAgentRuns({ taskId: id, limit: 100 });
    const boundRun = task.agent_run_id ? getAgentRun(task.agent_run_id) : null;
    const currentAttempt = (r) => r.scope !== "test_agent" && (!task.attempt_id || r.attemptId === task.attempt_id);
    const run = boundRun && (boundRun.taskId !== id || boundRun.traceId !== task.trace_id || currentAttempt(boundRun))
        ? boundRun : runs.find(currentAttempt);
    if (run && (run.taskId !== id || run.traceId !== task.trace_id))
        return projectUserWorkflow(task, { consistency: { consistency_state: "conflict" } });
    const approvalItems = require("../modules/collaboration/task-approval-decisions").taskApprovalItems(task, runs);
    const nativeRun = runs.find(r => r.scope !== "test_agent" && r.nativeSessionId && (!task.attempt_id || r.attemptId === task.attempt_id));
    const governance = require("./agent-governance-store");
    const dependencies = governance.listAgentTaskDependencies(id).filter(d => d.taskId === id && d.relation === "blocks" && ["active", "failed"].includes(d.status));
    const checkout = run && governance.getAgentTaskCheckout(id, run.runId);
    const permissionBlocked = task.acceptance_state === "needs_user" && task.status === "blocked"
        && require("../modules/collaboration/task-permission-broker").listTaskPermissionRequests({ taskId: id })
            .some(request => ["awaiting_user", "rejected", "expired"].includes(request.state)
            && (!task.permission_policy_revision || request.permissionPolicyRevision === task.permission_policy_revision));
    return projectUserWorkflow(task, { run, runs, approvalItems, runtimeContinuity: (0, runtime_continuity_projection_1.readRuntimeContinuity)(nativeRun || run),
        permissionBlocked,
        budgetBlocked: run && !["succeeded", "failed", "cancelled"].includes(run.status)
            && !governance.evaluateAgentRunBudget(run.runId, { record: false }).allowed,
        checkoutBlocked: run && ["leased", "starting", "running", "recovering", "waiting_input", "waiting_confirmation"].includes(run.status)
            && (!checkout || checkout.status !== "active" || Date.parse(checkout.expiresAt || "") <= Date.now()),
        sourceSyncPending: task.task_session_boundary_version === 1 && require("../modules/collaboration/task-session-source-sync").hasPendingTaskSourceSync(id),
        dependencyBlocked: dependencies.length > 0 });
}
//# sourceMappingURL=user-workflow-projection.js.map