"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindTaskRuntimeCollabCtx = bindTaskRuntimeCollabCtx;
exports.scheduleRequirementEpicDependencyUnlock = scheduleRequirementEpicDependencyUnlock;
exports.enqueueTask = enqueueTask;
exports.createAndQueueTask = createAndQueueTask;
exports.resumeTaskQueues = resumeTaskQueues;
exports.getTaskWatchdogStatus = getTaskWatchdogStatus;
exports.runTaskWatchdog = runTaskWatchdog;
exports.taskMatchesAgentProbeTarget = taskMatchesAgentProbeTarget;
exports.buildAgentRecoveryProbeGroups = buildAgentRecoveryProbeGroups;
exports.runAgentRecoveryMonitorOnce = runAgentRecoveryMonitorOnce;
exports.startAgentRecoveryMonitor = startAgentRecoveryMonitor;
exports.stopAgentRecoveryMonitor = stopAgentRecoveryMonitor;
exports.startTaskWatchdog = startTaskWatchdog;
exports.stopTaskWatchdog = stopTaskWatchdog;
const runtime_1 = require("../../agents/runtime");
const agent_communication_v2_1 = require("../../system/agent-communication-v2");
const db_1 = require("../../core/db");
const provider_task_circuit_breaker_1 = require("./provider-task-circuit-breaker");
const agent_qa_service_1 = require("./agent-qa-service");
const logs_1 = require("./logs");
const startup_task_recovery_1 = require("./startup-task-recovery");
const test_agent_runner_1 = require("./test-agent-runner");
const execution_kernel_1 = require("../../agents/execution-kernel");
const task_recovery_orchestrator_1 = require("../../tasks/task-recovery-orchestrator");
const session_task_timeline_1 = require("../../tasks/session-task-timeline");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
const task_run_store_1 = require("./task-run-store");
let runtimeCollabCtx = null;
const unlockingMissionParents = new Set();
function bindTaskRuntimeCollabCtx(ctx) {
    if (ctx)
        runtimeCollabCtx = ctx;
}
/** 子任务强验收通过后立即调度父 Epic，解锁并入队后继节点（不依赖看门狗轮询）。 */
function scheduleRequirementEpicDependencyUnlock(parentId, reason = "child_gate_passed") {
    const missionId = String(parentId || "").trim();
    if (!missionId || unlockingMissionParents.has(missionId))
        return { scheduled: false, reason: "busy_or_missing" };
    const ctx = runtimeCollabCtx;
    if (!ctx)
        return { scheduled: false, reason: "collab_ctx_unbound" };
    unlockingMissionParents.add(missionId);
    setImmediate(() => {
        try {
            require("./collaboration-global-missions").superviseGlobalDevelopmentMissionCycle(missionId, ctx, { max_attempts: 3 });
        }
        catch (error) {
            console.warn(`[Epic 依赖解锁] ${missionId} (${reason}):`, error?.message || error);
        }
        finally {
            unlockingMissionParents.delete(missionId);
        }
    });
    return { scheduled: true, mission_id: missionId, reason };
}
function enqueueTask(taskId, ctx, requestedRunId = "") {
    const tasks = (0, db_1.loadTasks)();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.log(`[任务队列] 任务 ${taskId} 不存在`);
        return { queued: false, message: "任务不存在" };
    }
    const taskRunId = String(task?.active_run_id || task?.task_run?.run_id || task?.run_id || "");
    if (task?.task_spec?.schema === "ccm-task-spec-v1" && requestedRunId && requestedRunId !== taskRunId) {
        return { queued: false, blocked: true, reason: "task_run_mismatch", message: "指定运行实例不是当前任务的活动运行" };
    }
    if (task.status === "done") {
        (0, logs_1.addTaskLog)(taskId, "info", "任务已完成，跳过入队");
        return { queued: false, message: "任务已完成，跳过入队" };
    }
    if ((0, collaboration_1.isTaskPaused)(task)) {
        (0, logs_1.addTaskLog)(taskId, "info", "任务已暂停，跳过入队");
        return { queued: false, message: "任务已暂停，跳过入队" };
    }
    const providerCircuitGate = (0, provider_task_circuit_breaker_1.getTaskProviderCircuitGate)(task);
    if (providerCircuitGate.blocked) {
        const message = (0, provider_task_circuit_breaker_1.formatTaskProviderCircuitMessage)(providerCircuitGate.circuit);
        const lastBlockedAt = Date.parse(String(task.last_provider_circuit_queue_blocked_at || ""));
        const recentlyRecorded = Number.isFinite(lastBlockedAt) && Date.now() - lastBlockedAt < 60_000;
        if (!recentlyRecorded) {
            (0, collaboration_1.updateTask)(taskId, {
                status: task.status === "in_progress" ? task.status : "failed",
                status_detail: message,
                last_provider_circuit_queue_blocked_at: new Date().toISOString(),
            });
            (0, logs_1.addTaskLog)(taskId, "warning", `任务级 Provider 熔断阻止重新入队：${message}`);
        }
        return {
            queued: false,
            blocked: true,
            reason: "provider_circuit_open",
            retry_after: providerCircuitGate.circuit?.retryAfter || "",
            remaining_ms: providerCircuitGate.remainingMs,
            duplicate_block_suppressed: recentlyRecorded,
            message,
        };
    }
    const dependencyIds = Array.isArray(task.mission_dependencies) ? task.mission_dependencies.map(String).filter(Boolean) : [];
    const blockedDependencies = dependencyIds.filter((dependencyId) => {
        const dependency = tasks.find((candidate) => String(candidate.id) === dependencyId);
        if (!dependency || !["done", "completed"].includes(String(dependency.status || "").toLowerCase()) || dependency.acceptance_state === "awaiting_user_acceptance")
            return true;
        const summary = dependency.delivery_summary || {};
        if (task.parent_workflow_type === "requirement_epic" || task.requirement_epic_id) {
            const terminalAccepted = dependency.terminal_gate?.passed === true
                && dependency.test_agent_review?.canAccept === true
                && dependency.main_agent_final_acceptance?.accepted === true;
            return dependency.global_mission_gate_passed !== true && !terminalAccepted;
        }
        return false;
    });
    if (blockedDependencies.length) {
        const message = `等待前置子任务通过交付验收：${blockedDependencies.join("、")}`;
        (0, collaboration_1.updateTask)(taskId, { status: "pending", status_detail: message, dependency_blocked: true });
        (0, logs_1.addTaskLog)(taskId, "info", message);
        return { queued: false, blocked: true, dependency_wait: true, dependencies: blockedDependencies, message };
    }
    const isTestAgentProjection = String(task?.requirement_item_key || task?.mission_target?.item_key || "").toUpperCase() === "TESTAGENT_VERIFY"
        || task?.task_kind === "acceptance_projection";
    const readiness = isTestAgentProjection
        ? { ready: true, message: "TestAgent 只读投影不需要项目 Agent CLI 探针" }
        : (0, collaboration_1.getTaskAgentExecutionReadiness)(task);
    if (!readiness.ready) {
        const message = readiness.message || "Agent CLI 执行通道不可用，任务暂不入队";
        const fixActions = Array.isArray(readiness.fix_actions) ? readiness.fix_actions : [];
        const firstFixAction = fixActions[0] ? `；建议：${fixActions[0]}` : "";
        const lastBlockedAt = Date.parse(task.last_queue_blocked_at || 0);
        const sameReason = String(task.status_detail || "") === message.slice(0, 500);
        const recentlyRecorded = Number.isFinite(lastBlockedAt) && Date.now() - lastBlockedAt < collaboration_1.AGENT_QUEUE_BLOCK_LOG_COOLDOWN_MS;
        if (!sameReason || !recentlyRecorded) {
            (0, collaboration_1.updateTask)(taskId, {
                status: "pending",
                acceptance_state: "blocked",
                status_detail: message.slice(0, 500),
                last_queue_blocked_at: new Date().toISOString(),
                execution_readiness: readiness,
            });
            (0, logs_1.addTaskLog)(taskId, "warning", `任务暂不入队：${message}${firstFixAction}`);
        }
        return { queued: false, blocked: true, duplicate_block_suppressed: sameReason && recentlyRecorded, reason: "agent_process", message, readiness };
    }
    const targetKey = (0, collaboration_1.getTaskTargetKey)(task);
    if (!collaboration_1.taskQueues.has(targetKey)) {
        collaboration_1.taskQueues.set(targetKey, []);
    }
    const queue = collaboration_1.taskQueues.get(targetKey);
    if (queue.includes(taskRunId || taskId) || (0, collaboration_1.isTaskRunningInMemory)(task)) {
        (0, logs_1.addTaskLog)(taskId, "info", "任务已在队列中或正在执行，跳过重复入队");
        return { queued: false, message: "任务已在队列中或正在执行" };
    }
    const newPriority = collaboration_1.PRIORITY_WEIGHT[task.priority] || 2;
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
        const queuedTask = tasks.find(t => t.id === queue[i] || String(t?.task_run?.run_id || t?.run_id || "") === queue[i]);
        if (!queuedTask)
            continue;
        const queuedPriority = collaboration_1.PRIORITY_WEIGHT[queuedTask.priority] || 2;
        if (newPriority > queuedPriority) {
            insertIndex = i;
            break;
        }
    }
    const queueIdentity = taskRunId || taskId;
    queue.splice(insertIndex, 0, queueIdentity);
    console.log(`[任务队列] 运行 ${queueIdentity}（任务 ${taskId}，${task.priority}）已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
    queue.forEach((queuedId, index) => {
        const queuedTask = tasks.find(t => t.id === queuedId || String(t?.task_run?.run_id || t?.run_id || "") === queuedId);
        if (!queuedTask)
            return;
        (0, collaboration_1.updateTask)(queuedTask.id, {
            queued_at: queuedId === queueIdentity ? new Date().toISOString() : undefined,
            queue_target_key: targetKey,
            queue_position: index + 1,
            queue_state: "queued",
            ...(queuedTask.task_run?.run_id ? { task_run_id: queuedTask.task_run.run_id } : {}),
        });
    });
    (0, logs_1.addTaskLog)(taskId, "info", `任务已加入队列 [${targetKey}]，位置 ${insertIndex + 1}/${queue.length}`);
    (0, task_run_store_1.syncTaskRunFromTask)(task, { status: "queued", queue_lane: targetKey, reason: "queued" });
    launchTargetQueueProcessor(targetKey, ctx);
    return { queued: true, message: "任务已加入队列", targetKey, position: insertIndex + 1, run_id: taskRunId };
}
function launchTargetQueueProcessor(targetKey, ctx, recoveryAttempt = 0) {
    void (0, collaboration_1.processTargetQueue)(targetKey, ctx).catch((error) => {
        const detail = String(error?.message || error || "队列处理异常").slice(0, 500);
        console.error(`[任务队列] [${targetKey}] 处理器异常:`, detail);
        const queue = collaboration_1.taskQueues.get(targetKey) || [];
        const nextRunId = queue[0];
        const nextTask = (0, db_1.loadTasks)().find((item) => item.id === nextRunId || String(item?.task_run?.run_id || item?.run_id || "") === nextRunId);
        if (nextTask) {
            (0, logs_1.addTaskLog)(nextTask.id, "error", `队列处理器异常：${detail}`);
            (0, logs_1.appendTaskTimelineEvent)(nextTask.id, { type: "queue_processor_error", title: "队列处理器正在恢复", detail, status: "warn", phase: "queued", data: { target_key: targetKey, recovery_attempt: recoveryAttempt + 1, run_id: nextRunId } });
        }
        if (queue.length > 0 && recoveryAttempt < 2) {
            const delayMs = 1_000 * (recoveryAttempt + 1);
            setTimeout(() => launchTargetQueueProcessor(targetKey, ctx, recoveryAttempt + 1), delayMs);
        }
    });
}
function createAndQueueTask(task, ctx) {
    const newTask = (0, collaboration_1.createTask)({ ...task, auto_execute: true });
    const queueResult = enqueueTask(newTask.id, ctx, newTask.active_run_id || newTask.run_id || "");
    return { task: newTask, queueResult };
}
function resumeTaskQueues(ctx, options = {}) {
    bindTaskRuntimeCollabCtx(ctx);
    // Consume terminal structured TestAgent receipts before rebuilding queues.
    // Without this recovery pass a restart could replay a read-only baseline
    // whose acceptance was already persisted by the project-main executor.
    try {
        require("./collaboration-runtime-coordinator-review").reconcilePersistedStructuredAcceptances?.(ctx);
    }
    catch (error) {
        console.warn(`[任务队列] 结构化验收恢复延后：${String(error?.message || error).slice(0, 240)}`);
    }
    const communicationRecovery = (0, agent_communication_v2_1.reconcileAgentCommunications)();
    const testAgentRunnerRecovery = (0, test_agent_runner_1.reconcileTestAgentRunnerRecords)();
    const traceBackfilled = (0, collaboration_1.backfillTaskTraceIds)();
    let tasks = (0, db_1.loadTasks)();
    // Backfill only records that already carry a complete new-model identity.
    // Ambiguous legacy activity is handled below as recovery_required.
    for (const task of tasks) {
        if (task?.task_spec?.schema !== "ccm-task-spec-v1" || task?.task_run?.schema !== "ccm-task-run-v1")
            continue;
        try {
            (0, task_run_store_1.recordTaskRunFromTask)(task);
        }
        catch (error) {
            console.warn(`[task-run-store] 启动回放失败 ${task.id}: ${error?.message || error}`);
        }
    }
    // Clean switch: active historical records without a frozen TaskSpec are
    // ambiguous and must be reviewed instead of being routed through guessed
    // legacy behavior. Completed records remain available for read-only replay.
    for (const task of tasks) {
        const status = String(task?.status || "").toLowerCase();
        const active = ["pending", "queued", "in_progress", "running", "reviewing", "waiting", "blocked"].includes(status);
        if (!active || task?.task_spec?.schema === "ccm-task-spec-v1")
            continue;
        const marked = (0, collaboration_1.updateTask)(task.id, {
            status: "blocked",
            acceptance_state: "recovery_required",
            status_detail: "历史任务缺少冻结任务规格，需要人工核验后恢复",
            recovery_required: true,
            recovery_required_at: new Date().toISOString(),
        });
        if (marked)
            (0, logs_1.addTaskLog)(task.id, "warning", "历史任务缺少 TaskSpec，已暂停自动恢复并等待人工核验");
    }
    tasks = (0, db_1.loadTasks)();
    // A service restart can leave a task in the transient TestAgent phase after
    // its child process has already exited. Requeue only that orphaned review;
    // a still-live TestAgent remains untouched and will finish normally.
    for (const task of tasks) {
        if (!(task?.status === "reviewing" || task?.status === "in_progress"))
            continue;
        if (!(task?.acceptance_state === "test_agent_running" || task?.acceptance_state === "awaiting_test_agent"))
            continue;
        if ((0, test_agent_runner_1.hasActiveTestAgentRunForTask)(task.id))
            continue;
        const terminalReview = (0, test_agent_runner_1.getLatestTestAgentRunnerResultForTask)(task.id, "invocation");
        const terminalInvocation = terminalReview?.invocation;
        // A TestAgent can finish between the child process exit and the
        // coordinator's persistence step (most commonly during a server restart).
        // Do not requeue that review indefinitely: consume the terminal result and
        // put the task into an explicit, user-actionable blocked state.  A failed
        // TestAgent result is never promoted to success here.
        if (terminalInvocation && terminalReview?.record) {
            const passed = terminalInvocation.status === "completed"
                && terminalInvocation.outputValidation?.valid === true
                && terminalInvocation.artifactVerification?.status === "passed"
                && terminalInvocation.canAccept === true
                && terminalReview.record.sourceStable === true;
            if (!passed) {
                const detail = String(terminalInvocation.report?.summary
                    || terminalInvocation.error
                    || terminalReview.record.error
                    || "TestAgent 验收已结束但未通过").slice(0, 500);
                const recoveredReview = {
                    schema: "ccm-test-agent-review-recovered-v1",
                    canAccept: false,
                    status: terminalInvocation.outcome || terminalInvocation.status || terminalReview.record.status,
                    error: terminalInvocation.error || terminalReview.record.error || detail,
                    report: terminalInvocation.report || null,
                    invocation: terminalInvocation,
                    runner: terminalReview.record,
                    recoveredAt: new Date().toISOString(),
                    sourceStable: terminalReview.record.sourceStable === true,
                };
                // Some legacy tasks predate the durable session timeline and therefore
                // have no open span.  Create a recovery attempt before persisting the
                // terminal blocked state; otherwise the atomic task store correctly
                // rejects the transition and can abort server startup.
                try {
                    const scope = task.group_id ? "group" : task.global_mission_id ? "global" : "project";
                    const scopeId = String(task.group_id || task.global_mission_id || task.target_project || task.id);
                    const exactSessionId = String(task.exact_session_id || task.group_session_id || task.project_session_id || task.id);
                    (0, session_task_timeline_1.createTaskAttemptStartedTimeline)({
                        taskId: task.id,
                        exactSessionId,
                        scope: scope,
                        scopeId,
                        attempt: Math.max(1, Number(task.execution_attempt || task.retry_count || 1)),
                        generation: Number(task.generation || 0),
                        workItemId: task.work_item_id || task.workItemId || task.id,
                        leaseId: task.execution_lease?.lease_id || task.lease_id || "",
                        eventIdSuffix: "test-agent-recovery",
                    });
                }
                catch { }
                const blocked = (0, collaboration_1.updateTask)(task.id, {
                    status: "blocked",
                    acceptance_state: "blocked",
                    auto_execute: false,
                    is_paused: true,
                    paused: true,
                    status_detail: `TestAgent 验收已结束但未通过：${detail}`,
                    test_agent_review: recoveredReview,
                    review: recoveredReview,
                    queue_state: "blocked",
                    queue_position: 0,
                    recovery: {
                        ...(task.recovery || {}),
                        test_agent_recovered_at: new Date().toISOString(),
                        test_agent_recovery_reason: "terminal_runner_result_consumed",
                    },
                });
                try {
                    (0, execution_kernel_1.transitionExecution)(task.id, "failed", `TestAgent 验收已结束但未通过：${detail}`, {
                        failureClass: "verification",
                        status: "error",
                        data: { recovered: true, runnerId: terminalReview.record.id, contentStored: false },
                    });
                }
                catch { }
                (0, logs_1.addTaskLog)(task.id, "warning", `服务恢复已消费 TestAgent 终态：${detail}`);
                (0, logs_1.appendTaskTimelineEvent)(task.id, {
                    type: "test_agent_review_recovered_terminal",
                    title: "TestAgent 验收结果已恢复",
                    detail,
                    status: "warn",
                    phase: "reviewing",
                    agent: "test-agent",
                    data: { runner_id: terminalReview.record.id, outcome: recoveredReview.status, content_stored: false },
                });
                if (blocked)
                    continue;
            }
        }
        const resumed = (0, collaboration_1.updateTask)(task.id, {
            status: "pending",
            acceptance_state: "awaiting_test_agent",
            status_detail: "TestAgent 进程已中断，已保留原验收证据并重新排队复核",
            queue_state: "queued",
            queue_position: 0,
            recovery: {
                ...(task.recovery || {}),
                test_agent_recovered_at: new Date().toISOString(),
                test_agent_recovery_reason: "orphaned_review_after_restart",
            },
        });
        if (resumed) {
            (0, logs_1.addTaskLog)(task.id, "warning", "服务重启后发现孤儿 TestAgent 验收，已安全恢复并重新排队");
            (0, logs_1.appendTaskTimelineEvent)(task.id, {
                type: "test_agent_review_recovered",
                title: "TestAgent 验收已恢复",
                detail: "原验收进程已结束，保留已有证据并重新执行独立复核。",
                status: "active",
                phase: "reviewing",
                agent: "test-agent",
                data: { reason: "orphaned_review_after_restart", content_stored: false },
            });
        }
    }
    tasks = (0, db_1.loadTasks)();
    const forceAuto = options.force === true
        || options.manual === true
        || /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_STARTUP_TASK_RECOVERY || ""));
    const recoveryPlan = (0, startup_task_recovery_1.buildStartupTaskRecoveryPlan)(tasks, forceAuto);
    const candidates = recoveryPlan.entries.filter((entry) => entry.decision.candidate);
    const results = [];
    for (const entry of candidates) {
        const task = entry.task;
        const recoveryDecision = entry.decision;
        const dependencyIds = Array.isArray(task?.mission_dependencies) ? task.mission_dependencies.map(String).filter(Boolean) : [];
        const blockedDependencies = dependencyIds.filter((dependencyId) => {
            const dependency = tasks.find((candidate) => String(candidate.id) === dependencyId);
            if (!dependency || dependency.status !== "done")
                return true;
            const summary = dependency.delivery_summary || {};
            const report = summary.delivery_report || dependency.delivery_report || {};
            if (task?.parent_workflow_type === "requirement_epic" || task?.requirement_epic_id) {
                const terminalAccepted = dependency.terminal_gate?.passed === true
                    && dependency.test_agent_review?.canAccept === true
                    && dependency.main_agent_final_acceptance?.accepted === true;
                return dependency.global_mission_gate_passed !== true && !terminalAccepted;
            }
            return summary.acceptance_gate_passed !== true
                && summary.acceptanceGatePassed !== true
                && summary.acceptance_gate?.pass !== true
                && report.status !== "done";
        });
        if (blockedDependencies.length > 0) {
            results.push({
                task_id: task.id,
                queued: false,
                skipped: true,
                dependency_wait: true,
                dependencies: blockedDependencies,
                message: "等待前置子任务通过交付验收",
            });
            continue;
        }
        if (recoveryDecision.mode === "skip") {
            results.push({
                task_id: task.id,
                queued: false,
                skipped: true,
                reason_code: recoveryDecision.reason_code,
                message: recoveryDecision.reason,
            });
            continue;
        }
        if (recoveryDecision.mode === "manual") {
            const alreadyHeld = task?.recovery_pending === true
                || (0, collaboration_1.isTaskPaused)(task)
                || task?.status === "needs_user"
                || task?.intake_state === "awaiting_confirmation";
            if (!alreadyHeld) {
                const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id, "task");
                const recoveryReasoning = (0, collaboration_1.buildTaskPreflightReasoning)(task, `服务启动恢复需等待确认：${recoveryDecision.reason}`, true);
                const now = new Date().toISOString();
                const patch = {
                    trace_id: traceId,
                    status: task.status === "in_progress" ? "needs_user" : task.status,
                    is_paused: true,
                    paused: true,
                    recovery_pending: true,
                    recovery: {
                        ...(task.recovery || {}),
                        pending_since: now,
                        previous_status: task.status,
                        mode: "manual_startup_recovery",
                        decision_code: recoveryDecision.reason_code,
                        decision_reason: recoveryDecision.reason,
                        authorization_preserved: false,
                        authorization_evidence: recoveryDecision.authorization_evidence,
                        requires_user: true,
                        user_headline: recoveryDecision.user_headline,
                        user_next_action: recoveryDecision.user_next_action,
                    },
                    reasoning_loop: recoveryReasoning,
                    collaboration_state: {
                        ...(task.collaboration_state || {}),
                        phase: "needs_user",
                        needs_user: true,
                        updated_at: now,
                    },
                    status_detail: recoveryDecision.user_headline,
                };
                (0, collaboration_1.updateTask)(task.id, patch);
                (0, logs_1.addTaskLog)(task.id, "warning", recoveryDecision.reason);
                (0, logs_1.appendTaskTimelineEvent)(task.id, {
                    type: "startup_manual_recovery",
                    title: "服务重启后仍在等待确认",
                    detail: recoveryDecision.user_headline,
                    status: "warn",
                    phase: "needs_user",
                    data: { previous_status: task.status, decision: recoveryDecision },
                });
            }
            results.push({
                task_id: task.id,
                queued: false,
                manual_recovery_required: true,
                reason_code: recoveryDecision.reason_code,
                message: recoveryDecision.user_headline || recoveryDecision.reason,
            });
            continue;
        }
        const existingCommunicationId = String(task.agent_communication_message_id || "");
        const existingCommunication = existingCommunicationId
            ? (0, agent_communication_v2_1.getAgentCommunication)(existingCommunicationId, { includeEvents: false, includeReceipts: false })
            : null;
        const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id, "task");
        const requiresInterruptedRecovery = task?.interruption_receipt?.schema === "ccm-task-interruption-receipt-v1"
            && (task?.recovery_pending === true
                || ["recovery_required", "recovery_validating"].includes(String(task?.acceptance_state || ""))
                || ["validating", "rolled_back"].includes(String(task?.recovery_transaction?.status || "")));
        if (requiresInterruptedRecovery) {
            const workspace = (0, task_recovery_orchestrator_1.captureTaskRecoveryWorkspace)(task);
            const recoveredExecution = (0, task_recovery_orchestrator_1.runTaskRecoveryOrchestrator)(task, {
                scope: task.group_id ? "group" : task.global_mission_id ? "global" : "project",
                scopeId: String(task.group_id || task.global_mission_id || task.target_project || "global"),
                exactSessionId: String(task.execution_session_id || task.active_execution_session_id || task.group_session_id || task.groupSessionId || task.project_session_id || task.projectSessionId || task.task_agent_session_id || task.id),
                idempotencyKey: `startup:${task.id}:${task.interruption_receipt.checksum}`,
                authorizationValid: recoveryDecision.authorization_preserved === true,
                runtimeValid: true,
                currentWorkspaceChecksum: workspace.checksum,
                worktreeOwnershipValid: workspace.ownershipValid,
                enqueue: id => enqueueTask(id, ctx),
            });
            if (!recoveredExecution.success) {
                results.push({ task_id: task.id, queued: false, manual_recovery_required: true, reason_code: recoveredExecution.preflight?.blockers?.[0] || "recovery_preflight_failed", message: "恢复前需要核对中断现场" });
                continue;
            }
            (0, logs_1.appendTaskTimelineEvent)(task.id, {
                type: "startup_auto_recovery",
                title: `服务重启后已恢复第 ${recoveredExecution.preflight.nextAttempt} 次执行`,
                detail: "已重新核对权限、工作区、Agent 会话和未完成工具回合。",
                status: "active",
                phase: "planning",
                data: { recovery_mode: recoveredExecution.preflight.recoveryMode, transaction_checksum: recoveredExecution.transaction.checksum },
            });
            results.push({ task_id: task.id, ...(recoveredExecution.queueResult || { queued: true }), auto_recovered: true, authorization_preserved: true, reason_code: recoveryDecision.reason_code });
            continue;
        }
        const recoveryLease = (0, reliability_ledger_1.acquireTaskLease)(task.id, traceId, 45_000);
        if (!recoveryLease.acquired) {
            (0, logs_1.addTaskLog)(task.id, "info", `启动恢复跳过：另一个存活实例仍持有任务租约（owner=${recoveryLease.lease?.owner_id || "unknown"}）`);
            results.push({ task_id: task.id, queued: false, active_elsewhere: true, message: "另一个实例仍在执行" });
            continue;
        }
        const recoveryReasoning = (0, collaboration_1.buildTaskPreflightReasoning)(task, "服务启动恢复：重新核对原始目标、当前代码状态、剩余缺口与验收条件", true);
        const recoveredAt = new Date().toISOString();
        const recoveryRecord = {
            ...(task.recovery || {}),
            recovered_at: recoveredAt,
            revalidated_at: recoveredAt,
            lease_recovery_count: recoveryLease.lease.recovery_count,
            previous_status: task.status,
            mode: "startup_auto_recovery",
            decision_code: recoveryDecision.reason_code,
            decision_reason: recoveryDecision.reason,
            authorization_preserved: recoveryDecision.authorization_preserved,
            authorization_evidence: recoveryDecision.authorization_evidence,
            requires_user: false,
            user_headline: recoveryDecision.user_headline,
            user_next_action: recoveryDecision.user_next_action,
        };
        if (task.status === "in_progress") {
            (0, collaboration_1.updateTask)(task.id, {
                status: "pending",
                trace_id: traceId,
                is_paused: false,
                paused: false,
                recovery_pending: false,
                result: "服务重启后已自动接上未完成执行",
                status_detail: "服务重启后已自动接上，正在重新进入执行队列",
                recovery: recoveryRecord,
                reasoning_loop: recoveryReasoning,
                collaboration_state: {
                    ...(task.collaboration_state || {}),
                    phase: "planning",
                    needs_user: false,
                    updated_at: recoveredAt,
                },
            });
            (0, logs_1.addTaskLog)(task.id, "warning", "服务重启后已接上未完成任务，重新核对后恢复排队");
        }
        else {
            (0, collaboration_1.updateTask)(task.id, {
                status: task.status === "needs_user" ? "pending" : task.status,
                is_paused: false,
                paused: false,
                recovery_pending: false,
                reasoning_loop: recoveryReasoning,
                recovery: recoveryRecord,
                status_detail: "服务重启后已自动接上，正在重新进入执行队列",
                collaboration_state: {
                    ...(task.collaboration_state || {}),
                    phase: "planning",
                    needs_user: false,
                    updated_at: recoveredAt,
                },
            });
            (0, logs_1.addTaskLog)(task.id, "info", "服务重启后自动接上已授权任务，重新加入队列");
        }
        (0, logs_1.appendTaskTimelineEvent)(task.id, {
            type: "startup_auto_recovery",
            title: "服务重启后已自动接上",
            detail: "已保留原任务授权，并重新核对目标、当前状态和验收条件。",
            status: "active",
            phase: "planning",
            data: { decision: recoveryDecision, recovery_check: recoveryReasoning.recovery_checks[recoveryReasoning.recovery_checks.length - 1] || {} },
        });
        (0, logs_1.appendTaskTimelineEvent)(task.id, { type: "reasoning_recovery_check", title: "恢复前已重新核对任务", detail: `原始目标、当前状态与验收条件已复核；剩余 ${recoveryReasoning.assertions.filter(item => item.status !== "passed").length} 项待证明`, status: recoveryReasoning.recovery_checks[recoveryReasoning.recovery_checks.length - 1]?.acceptance_revalidated ? "ok" : "warn", phase: "planning", data: recoveryReasoning.recovery_checks[recoveryReasoning.recovery_checks.length - 1] || {} });
        const queued = enqueueTask(task.id, ctx);
        if (!queued.queued)
            (0, reliability_ledger_1.releaseTaskLease)(task.id, "recovery_not_queued");
        results.push({
            task_id: task.id,
            ...queued,
            auto_recovered: true,
            authorization_preserved: true,
            reason_code: recoveryDecision.reason_code,
        });
    }
    const resumed = results.filter(item => item.queued).length;
    const manualPending = results.filter(item => item.manual_recovery_required).length;
    const skipped = results.filter(item => item.skipped || item.active_elsewhere).length;
    void (0, collaboration_1.recoverGroupCoordinationDependencies)(ctx).catch((error) => {
        console.error("[群聊协作恢复]", error?.message || error);
    });
    return {
        resumed,
        auto_resumed: resumed,
        manual_pending: manualPending,
        skipped,
        total: candidates.length,
        trace_backfilled: traceBackfilled,
        manual_recovery: resumed === 0 && manualPending > 0,
        mixed_recovery: resumed > 0 && manualPending > 0,
        recovery_policy: "risk_tiered_authorization_preserving",
        test_agent_runner_recovery: testAgentRunnerRecovery,
        agent_communication_recovery: communicationRecovery,
        results,
        queue_status: (0, collaboration_1.getQueueStatus)(),
    };
}
function getTaskWatchdogStatus(staleMs = collaboration_1.TASK_WATCHDOG_STALE_MS, gapCooldownMs = collaboration_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, gapMaxCount = collaboration_1.TASK_WATCHDOG_GAP_REWORK_MAX, taskSnapshot, recoveryMaxCount = collaboration_1.TASK_WATCHDOG_RECOVERY_MAX) {
    const now = Date.now();
    const tasks = Array.isArray(taskSnapshot) ? taskSnapshot : (0, db_1.loadTasks)();
    const stalePending = [];
    const stalledInProgress = [];
    const runningLong = [];
    const runtimeFailed = [];
    const gapRework = [];
    const workItemStalled = [];
    const recoveryExhausted = [];
    for (const task of tasks) {
        if (!task?.auto_execute
            || ["done", "blocked", "needs_user", "failed", "cancelled", "archived"].includes(String(task.status || ""))
            || (0, collaboration_1.isTaskPaused)(task))
            continue;
        const ageMs = (0, collaboration_1.getTaskAgeMs)(task, now);
        const base = {
            id: task.id,
            title: task.title,
            status: task.status,
            target_key: (0, collaboration_1.getTaskTargetKeyFromTask)(task),
            age_ms: ageMs,
            updated_at: task.updated_at || null,
            started_at: task.started_at || null,
            queued_at: task.queued_at || null,
        };
        const workItems = (0, work_items_1.buildMainAgentWorkItems)(task, { executions: (0, execution_kernel_1.listExecutions)({ taskId: task.id }) });
        for (const item of workItems) {
            if (item.status !== "in_progress")
                continue;
            const itemAgeMs = Math.max(0, now - Date.parse(item.updatedAt || item.startedAt || item.createdAt || task.updated_at || ""));
            if (Number.isFinite(itemAgeMs) && itemAgeMs >= staleMs) {
                workItemStalled.push({
                    ...base,
                    work_item_id: item.id,
                    target: item.target || item.owner,
                    owner: item.owner || "",
                    subject: item.subject,
                    item_age_ms: itemAgeMs,
                    item_updated_at: item.updatedAt || null,
                    reason: item.requeueReason || "子 Agent 工作项长时间无进展",
                });
            }
        }
        if ((0, collaboration_1.isRecoverableRuntimeFailure)(task)) {
            runtimeFailed.push({
                ...base,
                reason: (0, collaboration_1.getTaskFailureText)(task).slice(0, 500),
                retry_count: Number(task.retry_count || 0),
            });
        }
        else if ((0, collaboration_1.isWatchdogGapReworkCandidate)(task, now, gapCooldownMs, gapMaxCount)) {
            const summary = task.delivery_summary || {};
            gapRework.push({
                ...base,
                reason: [
                    Number(summary.coordination_plan_count || 0) <= 0 ? "缺少主 Agent 协调计划证据" : "",
                    Number(summary.assignment_count || 0) <= 0 ? "缺少主 Agent 派发证据" : "",
                    Number(summary.worker_notification_count || 0) <= 0 ? "缺少子 Agent 执行结果" : "",
                    ...(Array.isArray(summary.blockers) ? summary.blockers : []),
                    ...(Array.isArray(summary.needs) ? summary.needs : []),
                    ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item) => `${item?.agent || "Agent"} 缺少验证命令证据`) : []),
                    ...(Array.isArray(summary.verification_failed) ? summary.verification_failed : []),
                    ...(Array.isArray(summary.verification_suggested) ? summary.verification_suggested : []),
                ].filter(Boolean).join("；").slice(0, 500) || task.status_detail || "存在交付缺口",
                auto_gap_continue_count: Number(task.auto_gap_continue_count || 0),
            });
        }
        else if (task.status === "pending" && !(0, collaboration_1.isTaskQueuedInMemory)(task.id) && ageMs >= staleMs) {
            if (Number(task.watchdog_recoveries || 0) >= recoveryMaxCount) {
                recoveryExhausted.push({ ...base, recoveries: Number(task.watchdog_recoveries || 0) });
            }
            else {
                stalePending.push(base);
            }
        }
        else if (task.status === "in_progress" && !(0, collaboration_1.isTaskRunningInMemory)(task) && ageMs >= staleMs) {
            if (Number(task.watchdog_recoveries || 0) >= recoveryMaxCount) {
                recoveryExhausted.push({ ...base, recoveries: Number(task.watchdog_recoveries || 0) });
            }
            else {
                stalledInProgress.push(base);
            }
        }
        else if (task.status === "in_progress" && (0, collaboration_1.isTaskRunningInMemory)(task) && ageMs >= staleMs) {
            runningLong.push(base);
        }
    }
    return {
        stale_ms: staleMs,
        checked_at: new Date().toISOString(),
        stale_pending: stalePending,
        stalled_in_progress: stalledInProgress,
        running_long: runningLong,
        runtime_failed: runtimeFailed,
        gap_rework: gapRework,
        work_item_stalled: workItemStalled,
        recovery_exhausted: recoveryExhausted,
        queue_status: (0, collaboration_1.getQueueStatus)(tasks),
    };
}
function runTaskWatchdog(ctx, options = {}) {
    const staleMs = Number(options.staleMs || options.stale_ms || collaboration_1.TASK_WATCHDOG_STALE_MS);
    const gapCooldownMs = Number(options.gapCooldownMs || options.gap_cooldown_ms || collaboration_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS);
    const gapMaxCount = Math.max(1, Math.min(20, Number(options.gapMaxCount || options.gap_max_count || collaboration_1.TASK_WATCHDOG_GAP_REWORK_MAX)));
    const recoveryMaxCount = Math.max(1, Math.min(20, Number(options.recoveryMaxCount || options.recovery_max_count || collaboration_1.TASK_WATCHDOG_RECOVERY_MAX)));
    const taskSnapshot = (0, db_1.loadTasks)();
    const status = getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount, taskSnapshot, recoveryMaxCount);
    const recoverable = [...status.stale_pending, ...status.stalled_in_progress];
    const results = [];
    const gapResults = [];
    const workItemResults = [];
    const requirementEpicResults = [];
    const executionReadiness = (0, collaboration_1.getAgentExecutionReadiness)();
    const freshRecoveryProbeGroups = (0, collaboration_1.getAgentRecoveryProbeGroups)(taskSnapshot)
        .filter((group) => (0, collaboration_1.getAgentProbeHealth)((0, collaboration_1.readAgentProbeStatus)(group.probe_target)).successFresh);
    const dailyDevExecutionReadiness = executionReadiness;
    const canAutoRetryRuntimeFailures = executionReadiness.ready && freshRecoveryProbeGroups.length > 0;
    const canAutoContinueGaps = executionReadiness.ready === true;
    let blockedRecovery = null;
    let runtimeRetry = null;
    for (const item of status.recovery_exhausted) {
        const task = taskSnapshot.find(t => t.id === item.id);
        if (!task || (0, collaboration_1.isTaskPaused)(task))
            continue;
        const detail = `任务自动恢复已达到 ${recoveryMaxCount} 次上限，已停止自动重试，请检查执行记录后手动继续`;
        const blockedTask = (0, collaboration_1.updateTask)(task.id, {
            status: "needs_user",
            acceptance_state: task.acceptance_state || "recovery_required",
            status_detail: detail,
            auto_execute: false,
            is_paused: true,
            paused: true,
            recovery_pending: true,
            watchdog_recovery_exhausted_at: new Date().toISOString(),
        }) || task;
        (0, logs_1.addTaskLog)(task.id, "warning", detail);
        (0, logs_1.appendTaskTimelineEvent)(task.id, {
            type: "watchdog_recovery_exhausted",
            title: "自动恢复已停止",
            detail,
            status: "warn",
            phase: "needs_user",
            data: { recoveries: Number(task.watchdog_recoveries || 0), max_recoveries: recoveryMaxCount },
        });
        (0, collaboration_1.syncTaskBacklogStatus)(blockedTask, "blocked", detail);
        results.push({ task_id: task.id, queued: false, blocked: true, recovery_exhausted: true, message: detail });
    }
    for (const item of recoverable) {
        const task = taskSnapshot.find(t => t.id === item.id);
        if (!task || task.status === "done" || (0, collaboration_1.isTaskPaused)(task) || (0, collaboration_1.isTaskRunningInMemory)(task))
            continue;
        const patch = {
            status: "pending",
            status_detail: task.status === "in_progress"
                ? "任务看门狗检测到执行中断，已恢复排队"
                : "任务看门狗检测到待处理任务未入队，已恢复排队",
            watchdog_recovered_at: new Date().toISOString(),
            watchdog_recoveries: Number(task.watchdog_recoveries || 0) + 1,
        };
        if (task.status === "in_progress") {
            patch.result = "任务看门狗检测到执行中断，已恢复为待执行并重新入队";
        }
        (0, collaboration_1.updateTask)(task.id, patch);
        (0, logs_1.addTaskLog)(task.id, "warning", patch.status_detail);
        results.push({ task_id: task.id, ...enqueueTask(task.id, ctx, (0, collaboration_1.taskRunIdentity)(task)) });
    }
    const stalledByTask = new Map();
    for (const item of status.work_item_stalled || []) {
        stalledByTask.set(item.id, [...(stalledByTask.get(item.id) || []), item]);
    }
    for (const [taskId, items] of stalledByTask.entries()) {
        const task = (0, db_1.loadTasks)().find((entry) => entry.id === taskId);
        if (!task || task.status === "done" || (0, collaboration_1.isTaskPaused)(task))
            continue;
        const reason = `任务看门狗检测到 ${items.length} 个子 Agent 工作项长时间无进展`;
        const requeue = (0, collaboration_1.requeueTaskWorkItemsForWatchdog)(task, staleMs, reason);
        if (!requeue.requeued.length)
            continue;
        const shouldQueue = !(0, collaboration_1.isTaskRunningInMemory)(task) && !(0, collaboration_1.isTaskQueuedInMemory)(task.id);
        const queueResult = shouldQueue
            ? enqueueTask(task.id, ctx, (0, collaboration_1.taskRunIdentity)(task))
            : { queued: false, message: (0, collaboration_1.isTaskRunningInMemory)(task) ? "任务仍在运行，工作项已释放，等待本轮调度接管" : "任务已在队列中" };
        workItemResults.push({
            task_id: task.id,
            requeued: requeue.requeued.length,
            work_item_ids: requeue.requeued.map((entry) => entry.id),
            queue_result: queueResult,
        });
    }
    if (options.recover_agent_blocked !== false && options.recoverAgentBlocked !== false && freshRecoveryProbeGroups.length > 0) {
        blockedRecovery = (0, collaboration_1.aggregateBlockedRecovery)(freshRecoveryProbeGroups.map((group) => (0, collaboration_1.recoverAgentExecutionBlockedTasks)(ctx, "目标项目 Agent CLI 探针通过后立即恢复任务", { probeTarget: group.probe_target, taskSnapshot })));
    }
    if (options.continue_gaps !== false && options.continueGaps !== false && canAutoContinueGaps) {
        for (const item of status.gap_rework) {
            const task = taskSnapshot.find(t => t.id === item.id);
            if (!task || !(0, collaboration_1.isWatchdogGapReworkCandidate)(task, Date.now(), gapCooldownMs, gapMaxCount))
                continue;
            const message = (0, collaboration_1.buildTaskGapContinuationDraft)(task);
            const result = (0, collaboration_1.continueTaskWithMessage)(task.id, message, ctx, {
                source: "watchdog_gap_rework",
                auto_execute: true,
                status_detail: "任务看门狗已按交付缺口生成返工说明，等待主 Agent 继续执行",
            });
            (0, logs_1.addTaskLog)(task.id, result.success ? "info" : "warning", result.success
                ? "任务看门狗已按交付缺口自动续跑"
                : `任务看门狗续跑缺口失败：${result.error || "未知错误"}`);
            gapResults.push({ task_id: task.id, ...result, task: undefined });
        }
    }
    if (options.retry_runtime_failures !== false && canAutoRetryRuntimeFailures && status.runtime_failed.length > 0) {
        runtimeRetry = (0, collaboration_1.aggregateRuntimeRecovery)(freshRecoveryProbeGroups.map((group) => (0, collaboration_1.retryRuntimeFailedTasks)(ctx, {
            reason: "目标执行通道恢复后看门狗自动重试",
            limit: status.runtime_failed.length,
            probeTarget: group.probe_target,
        })));
    }
    for (const epic of taskSnapshot.filter((task) => task.workflow_type === "requirement_epic"
        && task.intake_state === "confirmed"
        && !["done", "cancelled", "archived"].includes(String(task.status || "")))) {
        try {
            const cycle = require("./collaboration-global-missions").superviseGlobalDevelopmentMissionCycle(epic.id, ctx, {
                max_attempts: options.epic_max_attempts || options.epicMaxAttempts || 3,
            });
            requirementEpicResults.push({
                epic_id: epic.id,
                terminal: cycle?.terminal === true,
                actions: cycle?.actions || [],
                waiting_user: cycle?.waiting_user || [],
            });
        }
        catch (error) {
            requirementEpicResults.push({ epic_id: epic.id, error: error?.message || String(error), actions: [], waiting_user: [] });
        }
    }
    const stateChanged = results.length > 0
        || workItemResults.length > 0
        || gapResults.length > 0
        || requirementEpicResults.some(item => item.actions.length > 0)
        || Number(blockedRecovery?.recovered || 0) > 0
        || Number(runtimeRetry?.queued || 0) > 0;
    return {
        success: true,
        recovered: results.filter(item => item.queued).length + Number(blockedRecovery?.recovered || 0),
        total_recoverable: recoverable.length + Number(blockedRecovery?.total_blocked || 0),
        stale_recovered: results.filter(item => item.queued).length,
        stale_recoverable: recoverable.length,
        recovery_exhausted: status.recovery_exhausted.length,
        work_item_stalled_total: status.work_item_stalled.length,
        work_item_requeued: workItemResults.reduce((sum, item) => sum + Number(item.requeued || 0), 0),
        work_item_results: workItemResults,
        blocked_recovery: blockedRecovery,
        runtime_failed_total: status.runtime_failed.length,
        runtime_retried: runtimeRetry?.retried || 0,
        runtime_queued: runtimeRetry?.queued || 0,
        gap_rework_total: status.gap_rework.length,
        gap_continued: gapResults.filter(item => item.success).length,
        gap_queued: gapResults.filter(item => item.queued).length,
        gap_results: gapResults,
        gap_continue_skipped_reason: status.gap_rework.length > 0 && !canAutoContinueGaps ? dailyDevExecutionReadiness.message : "",
        runtime_retry: runtimeRetry,
        requirement_epic_results: requirementEpicResults,
        runtime_retry_skipped_reason: status.runtime_failed.length > 0 && !canAutoRetryRuntimeFailures
            ? (executionReadiness.ready ? "等待目标项目 Agent CLI 探针通过后再自动重试" : executionReadiness.message)
            : "",
        execution_readiness: executionReadiness,
        daily_dev_execution_readiness: dailyDevExecutionReadiness,
        results,
        status: stateChanged ? getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount) : status,
    };
}
function taskMatchesAgentProbeTarget(task, target = null) {
    if (!target)
        return true;
    const required = (0, collaboration_1.getTaskRequiredProbeTarget)(task);
    const hasRequired = !!(required.groupId || required.project || required.agentType);
    if (!hasRequired)
        return false;
    return (0, collaboration_1.doesProbeTargetMatchRequired)(target, required);
}
function buildAgentRecoveryProbeGroups(tasks) {
    const groups = new Map();
    for (const task of tasks) {
        const probeTarget = (0, collaboration_1.getTaskRequiredProbeTarget)(task);
        const key = (0, collaboration_1.getAgentProbeTargetStatusKey)(probeTarget) || "default";
        if (!groups.has(key)) {
            groups.set(key, {
                key,
                probe_target: key === "default" ? null : probeTarget,
                probe_payload: key === "default" ? {} : (0, collaboration_1.getAgentRecoveryProbePayload)(probeTarget),
                task_ids: [],
                blocked_pending: 0,
                runtime_failed: 0,
            });
        }
        const group = groups.get(key);
        group.task_ids.push(task.id);
        if ((0, collaboration_1.isAgentExecutionBlockedPendingTask)(task))
            group.blocked_pending += 1;
        if ((0, collaboration_1.isRecoverableRuntimeFailure)(task))
            group.runtime_failed += 1;
    }
    return Array.from(groups.values());
}
function runAgentRecoveryMonitorOnce(ctx, options = {}) {
    const work = (0, collaboration_1.getAgentRecoveryWorkSummary)();
    if (work.total === 0) {
        return Promise.resolve({ success: true, skipped: true, reason: "没有等待执行通道恢复的自动任务", work });
    }
    if (collaboration_1.agentRecoveryProbeInFlight) {
        return Promise.resolve({ success: true, skipped: true, reason: "执行通道探针正在运行", work });
    }
    (0, collaboration_1.setAgentRecoveryProbeInFlight)(true);
    const probeGroups = (0, collaboration_1.getAgentRecoveryProbeGroups)();
    return Promise.all(probeGroups.map(async (group) => {
        // Recovery health checks must remain side-effect free. Do not launch an
        // Agent/model probe here: the queued task's normal ACK + first model call
        // is the half-open recovery attempt.
        const agentType = String(group?.probe_target?.agentType || group?.probe_payload?.agent_type || group?.probe_payload?.agentType || "claudecode");
        const available = (0, runtime_1.isAgentRuntimeAvailable)(agentType);
        const probe = {
            success: available,
            observed: true,
            paid_provider_called: false,
            business_write_performed: false,
            agent_type: agentType,
            message: available ? "本地 Agent CLI 与配置可用，允许任务自身执行半开恢复" : "本地 Agent CLI 或配置仍不可用",
        };
        if (!probe?.success) {
            return {
                success: false,
                group,
                probe,
                message: probe?.message || "执行通道探针未通过",
            };
        }
        const blockedRecovery = (0, collaboration_1.recoverAgentExecutionBlockedTasks)(ctx, "执行通道自动探针通过后恢复目标任务", { probeTarget: group.probe_target });
        const runtimeRecovery = (0, collaboration_1.retryRuntimeFailedTasks)(ctx, {
            reason: "执行通道自动探针通过后重试",
            limit: group.runtime_failed || 100,
            probeTarget: group.probe_target,
        });
        return {
            success: true,
            group,
            probe,
            blocked_recovery: blockedRecovery,
            runtime_recovery: runtimeRecovery,
        };
    }))
        .then((target_results) => {
        const successes = target_results.filter((item) => item.success);
        const failures = target_results.filter((item) => !item.success);
        const blockedRecoveries = successes.map((item) => item.blocked_recovery);
        const runtimeRecoveries = successes.map((item) => item.runtime_recovery);
        const blockedRecovery = (0, collaboration_1.aggregateBlockedRecovery)(blockedRecoveries);
        const runtimeRecovery = (0, collaboration_1.aggregateRuntimeRecovery)(runtimeRecoveries);
        return {
            success: successes.length > 0,
            skipped: false,
            work,
            probe_groups: probeGroups,
            target_results,
            failures,
            message: successes.length > 0 ? "目标执行通道探针通过，已按项目 Agent 恢复任务" : (failures[0]?.message || "执行通道探针未通过"),
            probe: target_results[0]?.probe || null,
            blocked_recovery: blockedRecovery,
            runtime_recovery: runtimeRecovery,
        };
    })
        .finally(() => {
        (0, collaboration_1.setAgentRecoveryProbeInFlight)(false);
    });
}
function startAgentRecoveryMonitor(ctx) {
    if (collaboration_1.agentRecoveryMonitorTimer)
        clearInterval(collaboration_1.agentRecoveryMonitorTimer);
    const tick = () => {
        runAgentRecoveryMonitorOnce(ctx)
            .then((result) => {
            if (result?.skipped)
                return;
            if (result?.success) {
                const recovered = Number(result.blocked_recovery?.recovered || 0);
                const retried = Number(result.runtime_recovery?.queued || 0);
                console.log(`[执行通道恢复监控] 探针通过，自动恢复 ${recovered} 个阻塞任务，重试 ${retried} 个执行失败任务`);
            }
            else {
                console.log(`[执行通道恢复监控] 探针未通过：${result?.message || "未知原因"}`);
            }
        })
            .catch((e) => console.error("[执行通道恢复监控]", e.message));
    };
    (0, collaboration_1.setAgentRecoveryMonitorTimer)(setInterval(tick, collaboration_1.AGENT_RECOVERY_PROBE_INTERVAL_MS));
    setTimeout(tick, 10 * 1000);
    console.log("[执行通道恢复监控] 已启动");
}
function stopAgentRecoveryMonitor() {
    if (collaboration_1.agentRecoveryMonitorTimer)
        clearInterval(collaboration_1.agentRecoveryMonitorTimer);
    (0, collaboration_1.setAgentRecoveryMonitorTimer)(null);
}
function startTaskWatchdog(ctx) {
    bindTaskRuntimeCollabCtx(ctx);
    if (collaboration_1.taskWatchdogTimer)
        clearInterval(collaboration_1.taskWatchdogTimer);
    const autoRecover = /^(1|true|yes|on)$/i.test(String(process.env.CCM_AUTO_TASK_WATCHDOG_RECOVERY || ""));
    const tick = () => {
        try {
            const expiredQa = (0, agent_qa_service_1.markExpiredAgentQaItems)();
            if (expiredQa.length)
                console.log(`[Agent 问答看门狗] ${expiredQa.length} 个问答已超时`);
            const status = getTaskWatchdogStatus();
            const recoverable = status.stale_pending.length + status.stalled_in_progress.length + status.runtime_failed.length + status.gap_rework.length;
            if (!autoRecover) {
                if (recoverable > 0)
                    console.log(`[任务看门狗] 手动恢复模式：发现 ${recoverable} 个需要处理的任务，等待用户点击恢复`);
                return;
            }
            const result = runTaskWatchdog(ctx);
            if (result.total_recoverable > 0 || result.runtime_failed_total > 0 || result.gap_rework_total > 0) {
                console.log(`[任务看门狗] 自动恢复 ${result.recovered}/${result.total_recoverable} 个任务，运行时重试 ${result.runtime_queued || 0}，缺口续跑 ${result.gap_queued || 0}`);
            }
        }
        catch (e) {
            console.error("[任务看门狗]", e.message);
        }
    };
    (0, collaboration_1.setTaskWatchdogTimer)(setInterval(tick, collaboration_1.TASK_WATCHDOG_INTERVAL_MS));
    console.log(`[任务看门狗] 已启动（${autoRecover ? "自动恢复模式" : "手动恢复模式"}）`);
}
function stopTaskWatchdog() {
    if (collaboration_1.taskWatchdogTimer)
        clearInterval(collaboration_1.taskWatchdogTimer);
    (0, collaboration_1.setTaskWatchdogTimer)(null);
}
//# sourceMappingURL=collaboration-task-runtime.js.map