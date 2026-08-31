"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTaskUserPhase = resolveTaskUserPhase;
exports.buildTaskUserRuntimeStatus = buildTaskUserRuntimeStatus;
exports.runTaskUserRuntimeSelfTest = runTaskUserRuntimeSelfTest;
const TERMINAL_PHASES = new Set(["completed", "failed", "cancelled", "reverted"]);
const PHASE_LABELS = {
    understanding: "理解需求",
    planning: "制定计划",
    queued: "等待执行",
    dispatching: "安排执行",
    executing: "开发执行",
    testing: "TestAgent 独立验收",
    self_verifying: "主 Agent 自验",
    reworking: "修复验收问题",
    accepting: "主 Agent 最终验收",
    needs_user: "等待你确认",
    environment_blocked: "等待补充运行条件",
    recovery_required: "等待安全恢复",
    blocked: "任务受阻",
    completed: "已完成",
    failed: "执行失败",
    cancelled: "已取消",
    reverted: "已撤销",
};
function text(value) {
    return String(value || "").trim().toLowerCase();
}
function timestamp(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
}
function latestIso(values) {
    const valid = values
        .map(value => ({ value: String(value || ""), time: timestamp(value) }))
        .filter(item => item.time > 0)
        .sort((left, right) => right.time - left.time);
    return valid[0]?.value || "";
}
function resolveTaskUserPhase(task, fallbackPhase = "") {
    const status = text(task?.status);
    const acceptance = text(task?.acceptance_state || task?.acceptanceState);
    const fallback = text(fallbackPhase);
    if (["done", "completed", "succeeded", "accepted"].includes(status) || acceptance === "accepted")
        return "completed";
    if (["cancelled", "canceled"].includes(status) || acceptance === "cancelled")
        return "cancelled";
    if (status === "reverted" || acceptance === "reverted")
        return "reverted";
    if (status === "failed" || acceptance === "failed" || acceptance === "worker_failed")
        return "failed";
    if (acceptance === "environment_blocked")
        return "environment_blocked";
    if (acceptance === "recovery_required")
        return "recovery_required";
    if (["needs_user", "waiting_confirmation", "waiting_clarification"].includes(acceptance) || status === "paused")
        return "needs_user";
    if (status === "blocked" || acceptance === "blocked")
        return "blocked";
    if (["main_agent_accepting", "test_agent_passed", "main_agent_self_verified"].includes(acceptance))
        return "accepting";
    if (acceptance === "main_agent_self_verifying")
        return "self_verifying";
    if (["test_agent_running", "test_agent_recheck", "awaiting_test_agent"].includes(acceptance) || status === "reviewing")
        return "testing";
    if (["reworking", "rework_required"].includes(acceptance) || fallback === "reworking")
        return "reworking";
    if (["executing"].includes(acceptance) || ["in_progress", "running"].includes(status))
        return "executing";
    if (["pending", "queued"].includes(status) || fallback === "queued")
        return "queued";
    if (["planning", "intake"].includes(fallback))
        return fallback;
    if (fallback && PHASE_LABELS[fallback])
        return fallback;
    return "planning";
}
function nextActionForPhase(phase) {
    if (phase === "queued")
        return "任务会按当前队列顺序开始执行，也可以在任务派发页调整顺序。";
    if (phase === "executing")
        return "等待开发 Agent 提交实际变更与验证结果。";
    if (phase === "testing")
        return "等待 TestAgent 完成独立验收；不通过时会按失败证据返工。";
    if (phase === "self_verifying")
        return "TestAgent 已关闭，主 Agent 正在核对开发结果、文件变更和已执行验证证据。";
    if (phase === "reworking")
        return "原开发 Agent 正在按验收失败点修复，完成后会重新验收。";
    if (phase === "accepting")
        return "项目主 Agent 正在核对完成内容、验证证据和剩余风险。";
    if (phase === "needs_user")
        return "请处理任务卡中的确认事项，确认后任务会沿用现有上下文继续。";
    if (phase === "environment_blocked")
        return "请补充缺少的运行环境、登录信息或验收环境后重新执行。";
    if (phase === "recovery_required")
        return "请重新执行；系统会复用已保存的任务证据并重新核对状态。";
    if (phase === "blocked")
        return "请查看阻塞原因并补充所需条件，或在确认后重新执行。";
    if (phase === "failed")
        return "可以重新执行；系统会保留已完成步骤和失败证据。";
    if (phase === "completed")
        return "可以查看变更文件、验证结果和任务回放。";
    if (phase === "cancelled" || phase === "reverted")
        return "如需继续，请重新发起任务。";
    return "主 Agent 正在核对需求并生成可执行计划。";
}
function blockerKindForPhase(phase) {
    if (phase === "environment_blocked")
        return "runtime_conditions";
    if (phase === "needs_user")
        return "user_input";
    if (phase === "recovery_required")
        return "safe_recovery";
    if (phase === "blocked")
        return "task_blocked";
    if (phase === "failed")
        return "execution_failed";
    return "";
}
function buildTaskUserRuntimeStatus(task, options = {}) {
    const phase = resolveTaskUserPhase(task, options.phase);
    const execution = task?.project_main_execution || task?.projectMainExecution || {};
    const providerCircuit = task?.provider_circuit || task?.providerCircuit || {};
    const lastActivityAt = latestIso([
        execution.heartbeat_at,
        execution.heartbeatAt,
        task?.heartbeat_at,
        task?.heartbeatAt,
        task?.updated_at,
        task?.updatedAt,
        task?.started_at,
        task?.startedAt,
        task?.created_at,
        task?.createdAt,
    ]);
    const startedAt = latestIso([
        task?.started_at,
        task?.startedAt,
        execution.started_at,
        execution.startedAt,
        task?.created_at,
        task?.createdAt,
    ]);
    const completedAt = TERMINAL_PHASES.has(phase)
        ? latestIso([task?.completed_at, task?.completedAt, execution.finished_at, execution.finishedAt, task?.updated_at, task?.updatedAt])
        : "";
    const reviewRound = Math.max(0, Number(task?.review_round || task?.reviewRound || 0));
    const maxReviewRounds = Math.max(reviewRound, Number(task?.rework_exhausted?.rounds || task?.reworkExhausted?.rounds || options.maxReviewRounds || 3));
    const queuePosition = Math.max(0, Number(task?.queue?.position
        || task?.queue_position
        || task?.queuePosition
        || options.queuePosition
        || 0));
    return {
        schema: "ccm-task-user-runtime-v1",
        phase,
        phase_label: PHASE_LABELS[phase] || "正在处理",
        terminal: TERMINAL_PHASES.has(phase),
        active: ["understanding", "planning", "dispatching", "executing", "testing", "reworking", "accepting"].includes(phase),
        waiting: ["queued", "needs_user", "environment_blocked", "recovery_required", "blocked"].includes(phase),
        blocker_kind: blockerKindForPhase(phase),
        status_detail: String(task?.status_detail || task?.statusDetail || options.statusDetail || "").slice(0, 600),
        next_action: String(task?.next_action || task?.nextAction || options.nextAction || nextActionForPhase(phase)).slice(0, 600),
        started_at: startedAt,
        last_activity_at: lastActivityAt,
        completed_at: completedAt,
        queue_position: queuePosition,
        review_round: reviewRound,
        max_review_rounds: maxReviewRounds,
        provider_retry: providerCircuit?.state === "open" || Number(providerCircuit?.modelAttempts || 0) > 0
            ? {
                state: providerCircuit.state || "",
                attempts: Math.max(0, Number(providerCircuit.modelAttempts || 0)),
                retry_after: providerCircuit.retryAfter || "",
            }
            : null,
        recovery_count: Math.max(0, Number(execution.lease_recovery_count || task?.watchdog_recovery_count || task?.auto_gap_continue_count || 0)),
    };
}
function runTaskUserRuntimeSelfTest() {
    const testing = buildTaskUserRuntimeStatus({
        status: "reviewing",
        acceptance_state: "test_agent_running",
        review_round: 2,
        updated_at: "2026-07-27T10:00:00.000Z",
    });
    const blocked = buildTaskUserRuntimeStatus({
        status: "blocked",
        acceptance_state: "environment_blocked",
        updated_at: "2026-07-27T10:01:00.000Z",
    });
    const done = buildTaskUserRuntimeStatus({
        status: "done",
        acceptance_state: "accepted",
        completed_at: "2026-07-27T10:02:00.000Z",
    });
    const checks = {
        testAgentStageIsVisible: testing.phase === "testing" && testing.review_round === 2,
        environmentBlockIsActionable: blocked.phase === "environment_blocked"
            && blocked.blocker_kind === "runtime_conditions"
            && /运行环境/.test(blocked.next_action),
        terminalCompletionIsExplicit: done.phase === "completed" && done.terminal === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=task-user-runtime.js.map