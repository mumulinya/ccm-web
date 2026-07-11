"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStartupTaskRecoveryDecision = buildStartupTaskRecoveryDecision;
exports.buildStartupTaskRecoveryPlan = buildStartupTaskRecoveryPlan;
exports.runStartupTaskRecoveryDecisionSelfTest = runStartupTaskRecoveryDecisionSelfTest;
function taskStatus(task) {
    return String(task?.status || "pending").trim().toLowerCase();
}
function planRequiresConfirmation(task) {
    const plans = [
        task?.intake_draft,
        task?.workflow_meta?.plan_mode,
        task?.workflow_meta?.intake?.plan_mode,
        task?.workflow_meta?.project_mission,
    ];
    return task?.intake_state === "awaiting_confirmation"
        || plans.some((plan) => plan?.requires_confirmation === true || plan?.control_state === "awaiting_confirmation");
}
function isStartupManualHold(task) {
    return task?.recovery_pending === true
        && String(task?.recovery?.mode || "") === "manual_startup_recovery";
}
function hasExplicitUserPause(task) {
    if (isStartupManualHold(task))
        return false;
    const controlMode = String(task?.supervisor_control?.mode || "").toLowerCase();
    const detail = String(task?.status_detail || "");
    return taskStatus(task) === "paused"
        || task?.is_paused === true
        || task?.paused === true
        || ["paused", "manual"].includes(controlMode)
        || /用户.*暂停|人工接管|暂停后续调度|跟进已暂停/.test(detail);
}
function authorizationReadinessRows(task) {
    return [
        task?.authorization_readiness,
        task?.authorizationReadiness,
        task?.tool_authorization?.authorization_readiness,
        task?.toolAuthorization?.authorizationReadiness,
        task?.workflow_meta?.authorization_readiness,
        task?.workflow_meta?.authorizationReadiness,
        task?.execution_readiness?.authorization_readiness,
        task?.execution_readiness?.authorizationReadiness,
        task?.delivery_summary?.authorization_readiness,
        task?.delivery_summary?.authorizationReadiness,
    ].filter((item) => item && typeof item === "object");
}
function hasAuthorizationBlock(task) {
    return authorizationReadinessRows(task).some((item) => {
        const status = String(item.status || item.state || "").toLowerCase();
        return item.dispatchReady === false
            || item.dispatch_ready === false
            || item.requires_user === true
            || item.requiresUser === true
            || ["blocked", "needs_user", "missing_credentials", "authorization_required"].includes(status);
    });
}
function hasRealUserInputBlock(task) {
    if (isStartupManualHold(task))
        return false;
    const status = taskStatus(task);
    const collaborationNeedsUser = task?.collaboration_state?.needs_user === true;
    const sandboxNeedsUser = task?.sandbox_rehearsal?.status === "needs_user"
        || task?.workflow_meta?.sandbox_rehearsal?.status === "needs_user";
    return status === "needs_user" || collaborationNeedsUser || sandboxNeedsUser;
}
function authorizationEvidence(task, forceAuto) {
    const evidence = [];
    if (task?.intake_state === "confirmed")
        evidence.push("intake_confirmed");
    if (task?.confirmed_at)
        evidence.push("plan_confirmed_at");
    if (task?.queued_at)
        evidence.push("queued_at");
    if (task?.started_at)
        evidence.push("started_at");
    if (task?.execution_lease?.acquired_at)
        evidence.push("execution_lease_acquired");
    if (forceAuto)
        evidence.push("operator_resume_override");
    return Array.from(new Set(evidence));
}
function decision(task, mode, reasonCode, reason, userHeadline, userNextAction, options = {}) {
    return {
        schema: "ccm-startup-task-recovery-decision-v1",
        mode,
        reason_code: reasonCode,
        reason,
        authorization_preserved: options.authorizationPreserved === true,
        authorization_evidence: options.authorizationEvidence || [],
        requires_user: options.requiresUser === true,
        candidate: options.candidate !== false,
        previous_status: taskStatus(task),
        user_headline: userHeadline,
        user_next_action: userNextAction,
    };
}
function buildStartupTaskRecoveryDecision(task, forceAuto = false) {
    const status = taskStatus(task);
    const candidate = task?.auto_execute === true || task?.recovery_pending === true;
    if (!candidate) {
        return decision(task, "skip", "not_auto_task", "任务没有自动执行或恢复标记。", "", "", { candidate: false });
    }
    if (task?.archived || task?.deleted_at || task?.completed_at || ["done", "completed", "cancelled", "canceled", "archived", "failed"].includes(status)) {
        return decision(task, "skip", "terminal_task", "任务已结束或归档，不参与启动恢复。", "", "", { candidate: false });
    }
    if (planRequiresConfirmation(task)) {
        return decision(task, "manual", "awaiting_plan_confirmation", "执行前计划仍待用户确认。", "这轮任务还在等你确认执行计划，服务重启后没有自动开始。", "确认计划后，我会沿用同一任务上下文继续执行。", { requiresUser: true });
    }
    if (task?.cancellation_requested_at || task?.cancellation_reason) {
        return decision(task, "manual", "cancellation_requested", "任务存在用户取消请求。", "这轮任务之前已请求停止，服务重启后不会自动继续。", "如需继续，请重新发起或明确恢复这项任务。", { requiresUser: true });
    }
    if (task?.runtime_debt_cleanup) {
        return decision(task, "manual", "runtime_debt_requires_review", "任务已由运行治理中心暂停，需要人工确认恢复。", "这轮任务之前因运行状态异常被暂停，服务重启后仍保持等待确认。", "请先检查当前工作区和执行环境，再决定是否继续。", { requiresUser: true });
    }
    if (isStartupManualHold(task) && !forceAuto) {
        return decision(task, "manual", "startup_manual_hold", "任务已在上一轮启动恢复中转为人工确认。", task?.recovery?.user_headline || "这轮任务仍在等待你确认是否继续，服务重启后没有自动恢复。", task?.recovery?.user_next_action || "确认继续后，我会复用原任务、计划和已有执行上下文。", { requiresUser: true });
    }
    if (task?.recovery_pending === true && !isStartupManualHold(task)) {
        return decision(task, "manual", "manual_recovery_pending", "任务带有人工恢复标记，不能由启动流程清除。", "这轮任务仍在等待你确认如何继续，服务重启后没有自动恢复。", "确认继续后，我会复用原任务、计划和已有执行上下文。", { requiresUser: true });
    }
    if (hasExplicitUserPause(task)) {
        const takeover = String(task?.supervisor_control?.mode || "").toLowerCase() === "manual"
            || /人工接管/.test(String(task?.status_detail || ""));
        return decision(task, "manual", takeover ? "manual_takeover" : "user_paused", takeover ? "任务已由用户人工接管。" : "任务已由用户主动暂停。", takeover
            ? "这轮任务目前由你人工接管，服务重启后不会恢复自动调度。"
            : "这轮任务之前由你暂停，服务重启后仍保持暂停。", takeover ? "切回自动跟进后，我会继续协调执行与验收。" : "恢复任务后，我会从原计划和当前进度继续。", { requiresUser: true });
    }
    if (hasRealUserInputBlock(task)) {
        return decision(task, "manual", "user_input_required", "任务仍缺少用户输入或确认。", "这轮任务还需要你的确认或补充，服务重启后没有自动继续。", "补充卡片中列出的信息后，我会接着原任务推进。", { requiresUser: true });
    }
    if (hasAuthorizationBlock(task)) {
        return decision(task, "manual", "authorization_required", "执行所需账号、凭据或工具授权仍不完整。", "这轮任务还缺少执行所需的授权，服务重启后没有自动继续。", "补齐授权后，我会重新核对执行环境并继续。", { requiresUser: true });
    }
    if (!["pending", "in_progress", "needs_user"].includes(status)) {
        return decision(task, "skip", "unsupported_status", `状态 ${status || "unknown"} 不参与启动恢复。`, "", "", { candidate: false });
    }
    if (task?.auto_execute !== true && !isStartupManualHold(task)) {
        return decision(task, "manual", "auto_execute_disabled", "任务没有保留自动执行授权。", "这轮任务没有保留自动执行授权，服务重启后不会自行开始。", "确认继续后，我会重新进入执行队列。", { requiresUser: true });
    }
    const evidence = authorizationEvidence(task, forceAuto);
    if (!evidence.length) {
        return decision(task, "manual", "authorization_not_proven", "没有找到计划确认、入队或开始执行的持久化证据。", "我找到了未完成任务，但还不能确认它在重启前已经获准执行，所以没有自动开始。", "确认继续后，我会保留原计划和验收条件重新入队。", { requiresUser: true });
    }
    return decision(task, "auto", isStartupManualHold(task) ? "explicit_manual_resume" : "authorized_incomplete_task", "任务已明确获准执行，且持久化记录证明它已确认、入队或开始运行。", "服务重启后，我已自动接上这轮任务，并重新核对目标、当前状态和验收条件。", "我会沿用原计划和执行上下文继续推进，完成后再给你最终总结。", {
        authorizationPreserved: true,
        authorizationEvidence: evidence,
        requiresUser: false,
    });
}
function buildStartupTaskRecoveryPlan(tasks = [], forceAuto = false) {
    const entries = (Array.isArray(tasks) ? tasks : []).map((task) => ({
        task,
        decision: buildStartupTaskRecoveryDecision(task, forceAuto),
    }));
    return {
        schema: "ccm-startup-task-recovery-plan-v1",
        entries,
        auto: entries.filter((entry) => entry.decision.mode === "auto"),
        manual: entries.filter((entry) => entry.decision.mode === "manual"),
        skipped: entries.filter((entry) => entry.decision.mode === "skip"),
    };
}
function runStartupTaskRecoveryDecisionSelfTest() {
    const started = buildStartupTaskRecoveryDecision({
        id: "started",
        status: "in_progress",
        auto_execute: true,
        started_at: "2026-07-10T01:00:00.000Z",
    });
    const queuedConfirmed = buildStartupTaskRecoveryDecision({
        id: "queued-confirmed",
        status: "pending",
        auto_execute: true,
        intake_state: "confirmed",
        queued_at: "2026-07-10T01:00:00.000Z",
    });
    const awaitingConfirmation = buildStartupTaskRecoveryDecision({
        id: "awaiting-confirmation",
        status: "pending",
        auto_execute: true,
        intake_state: "awaiting_confirmation",
    });
    const userPaused = buildStartupTaskRecoveryDecision({
        id: "user-paused",
        status: "paused",
        auto_execute: true,
        is_paused: true,
        status_detail: "用户批量暂停",
        queued_at: "2026-07-10T01:00:00.000Z",
    });
    const runtimeDebt = buildStartupTaskRecoveryDecision({
        id: "runtime-debt",
        status: "needs_user",
        auto_execute: false,
        recovery_pending: true,
        runtime_debt_cleanup: { cleaned_at: "2026-07-10T01:00:00.000Z" },
    });
    const missingAuthorization = buildStartupTaskRecoveryDecision({
        id: "missing-authorization",
        status: "pending",
        auto_execute: true,
        queued_at: "2026-07-10T01:00:00.000Z",
        authorization_readiness: { dispatchReady: false, status: "authorization_required" },
    });
    const startupManualHold = {
        id: "startup-manual-hold",
        status: "needs_user",
        auto_execute: true,
        is_paused: true,
        paused: true,
        recovery_pending: true,
        recovery: { mode: "manual_startup_recovery" },
        started_at: "2026-07-10T01:00:00.000Z",
    };
    const heldWithoutOverride = buildStartupTaskRecoveryDecision(startupManualHold, false);
    const heldWithOverride = buildStartupTaskRecoveryDecision(startupManualHold, true);
    const mixedPlan = buildStartupTaskRecoveryPlan([
        { id: "auto", status: "pending", auto_execute: true, queued_at: "2026-07-10T01:00:00.000Z" },
        { id: "manual", status: "pending", auto_execute: true },
        { id: "skip", status: "done", auto_execute: true, completed_at: "2026-07-10T01:00:00.000Z" },
    ]);
    const checks = {
        startedAuthorizedTaskAutoResumes: started.mode === "auto" && started.authorization_preserved,
        confirmedQueuedTaskAutoResumes: queuedConfirmed.mode === "auto" && queuedConfirmed.authorization_evidence.includes("intake_confirmed"),
        awaitingConfirmationStaysManual: awaitingConfirmation.mode === "manual" && awaitingConfirmation.requires_user,
        userPauseStaysManual: userPaused.mode === "manual" && userPaused.reason_code === "user_paused",
        runtimeDebtStaysManual: runtimeDebt.mode === "manual" && runtimeDebt.reason_code === "runtime_debt_requires_review",
        missingAuthorizationStaysManual: missingAuthorization.mode === "manual" && missingAuthorization.reason_code === "authorization_required",
        startupManualHoldNeedsExplicitResume: heldWithoutOverride.mode === "manual" && heldWithoutOverride.reason_code === "startup_manual_hold",
        explicitResumeCanReleaseStartupHold: heldWithOverride.mode === "auto" && heldWithOverride.reason_code === "explicit_manual_resume",
        mixedBatchIsPartitioned: mixedPlan.auto.length === 1 && mixedPlan.manual.length === 1 && mixedPlan.skipped.length === 1,
        userCopyHidesTechnicalEvidence: !/execution_lease|queued_at|reason_code|dispatchReady/.test([
            started.user_headline,
            started.user_next_action,
            awaitingConfirmation.user_headline,
            awaitingConfirmation.user_next_action,
        ].join("\n")),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        samples: {
            started,
            queuedConfirmed,
            awaitingConfirmation,
            userPaused,
            runtimeDebt,
            missingAuthorization,
            heldWithoutOverride,
            heldWithOverride,
        },
    };
}
//# sourceMappingURL=startup-task-recovery.js.map