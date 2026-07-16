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
const db_1 = require("../../core/db");
const agent_qa_service_1 = require("./agent-qa-service");
const logs_1 = require("./logs");
const startup_task_recovery_1 = require("./startup-task-recovery");
const test_agent_runner_1 = require("./test-agent-runner");
const execution_kernel_1 = require("../../agents/execution-kernel");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
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
function enqueueTask(taskId, ctx) {
    const tasks = (0, db_1.loadTasks)();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.log(`[任务队列] 任务 ${taskId} 不存在`);
        return { queued: false, message: "任务不存在" };
    }
    if (task.status === "done") {
        (0, logs_1.addTaskLog)(taskId, "info", "任务已完成，跳过入队");
        return { queued: false, message: "任务已完成，跳过入队" };
    }
    if ((0, collaboration_1.isTaskPaused)(task)) {
        (0, logs_1.addTaskLog)(taskId, "info", "任务已暂停，跳过入队");
        return { queued: false, message: "任务已暂停，跳过入队" };
    }
    const dependencyIds = Array.isArray(task.mission_dependencies) ? task.mission_dependencies.map(String).filter(Boolean) : [];
    const blockedDependencies = dependencyIds.filter((dependencyId) => {
        const dependency = tasks.find((candidate) => String(candidate.id) === dependencyId);
        if (!dependency || dependency.status !== "done")
            return true;
        const summary = dependency.delivery_summary || {};
        if (task.parent_workflow_type === "requirement_epic" || task.requirement_epic_id) {
            return dependency.global_mission_gate_passed !== true;
        }
        return false;
    });
    if (blockedDependencies.length) {
        const message = `等待前置子任务通过交付验收：${blockedDependencies.join("、")}`;
        (0, collaboration_1.updateTask)(taskId, { status: "pending", status_detail: message, dependency_blocked: true });
        (0, logs_1.addTaskLog)(taskId, "info", message);
        return { queued: false, blocked: true, dependency_wait: true, dependencies: blockedDependencies, message };
    }
    const readiness = (0, collaboration_1.getTaskAgentExecutionReadiness)(task);
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
    if (queue.includes(taskId) || collaboration_1.runningTaskIds.has(taskId)) {
        (0, logs_1.addTaskLog)(taskId, "info", "任务已在队列中或正在执行，跳过重复入队");
        return { queued: false, message: "任务已在队列中或正在执行" };
    }
    const newPriority = collaboration_1.PRIORITY_WEIGHT[task.priority] || 2;
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
        const queuedTask = tasks.find(t => t.id === queue[i]);
        if (!queuedTask)
            continue;
        const queuedPriority = collaboration_1.PRIORITY_WEIGHT[queuedTask.priority] || 2;
        if (newPriority > queuedPriority) {
            insertIndex = i;
            break;
        }
    }
    queue.splice(insertIndex, 0, taskId);
    console.log(`[任务队列] 任务 ${taskId} (${task.priority}) 已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
    (0, collaboration_1.updateTask)(taskId, { queued_at: new Date().toISOString() });
    (0, logs_1.addTaskLog)(taskId, "info", `任务已加入队列 [${targetKey}]，位置 ${insertIndex + 1}/${queue.length}`);
    (0, collaboration_1.processTargetQueue)(targetKey, ctx);
    return { queued: true, message: "任务已加入队列", targetKey, position: insertIndex + 1 };
}
function createAndQueueTask(task, ctx) {
    const newTask = (0, collaboration_1.createTask)({ ...task, auto_execute: true });
    const queueResult = enqueueTask(newTask.id, ctx);
    return { task: newTask, queueResult };
}
function resumeTaskQueues(ctx, options = {}) {
    bindTaskRuntimeCollabCtx(ctx);
    const testAgentRunnerRecovery = (0, test_agent_runner_1.reconcileTestAgentRunnerRecords)();
    const traceBackfilled = (0, collaboration_1.backfillTaskTraceIds)();
    const tasks = (0, db_1.loadTasks)();
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
                return dependency.global_mission_gate_passed !== true;
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
        const traceId = (0, reliability_ledger_1.ensureTraceId)(task.trace_id, "task");
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
        results,
        queue_status: (0, collaboration_1.getQueueStatus)(),
    };
}
function getTaskWatchdogStatus(staleMs = collaboration_1.TASK_WATCHDOG_STALE_MS, gapCooldownMs = collaboration_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, gapMaxCount = collaboration_1.TASK_WATCHDOG_GAP_REWORK_MAX, taskSnapshot) {
    const now = Date.now();
    const tasks = Array.isArray(taskSnapshot) ? taskSnapshot : (0, db_1.loadTasks)();
    const stalePending = [];
    const stalledInProgress = [];
    const runningLong = [];
    const runtimeFailed = [];
    const gapRework = [];
    const workItemStalled = [];
    for (const task of tasks) {
        if (!task?.auto_execute || task.status === "done" || (0, collaboration_1.isTaskPaused)(task))
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
            stalePending.push(base);
        }
        else if (task.status === "in_progress" && !collaboration_1.runningTaskIds.has(task.id) && ageMs >= staleMs) {
            stalledInProgress.push(base);
        }
        else if (task.status === "in_progress" && collaboration_1.runningTaskIds.has(task.id) && ageMs >= staleMs) {
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
        queue_status: (0, collaboration_1.getQueueStatus)(tasks),
    };
}
function runTaskWatchdog(ctx, options = {}) {
    const staleMs = Number(options.staleMs || options.stale_ms || collaboration_1.TASK_WATCHDOG_STALE_MS);
    const gapCooldownMs = Number(options.gapCooldownMs || options.gap_cooldown_ms || collaboration_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS);
    const gapMaxCount = Math.max(1, Math.min(20, Number(options.gapMaxCount || options.gap_max_count || collaboration_1.TASK_WATCHDOG_GAP_REWORK_MAX)));
    const taskSnapshot = (0, db_1.loadTasks)();
    const status = getTaskWatchdogStatus(staleMs, gapCooldownMs, gapMaxCount, taskSnapshot);
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
    for (const item of recoverable) {
        const task = taskSnapshot.find(t => t.id === item.id);
        if (!task || task.status === "done" || (0, collaboration_1.isTaskPaused)(task) || collaboration_1.runningTaskIds.has(task.id))
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
        results.push({ task_id: task.id, ...enqueueTask(task.id, ctx) });
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
        const shouldQueue = !collaboration_1.runningTaskIds.has(task.id) && !(0, collaboration_1.isTaskQueuedInMemory)(task.id);
        const queueResult = shouldQueue
            ? enqueueTask(task.id, ctx)
            : { queued: false, message: collaboration_1.runningTaskIds.has(task.id) ? "任务仍在运行，工作项已释放，等待本轮调度接管" : "任务已在队列中" };
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
    const timeoutMs = Number(options.timeout_ms || options.timeoutMs || collaboration_1.AGENT_RECOVERY_PROBE_TIMEOUT_MS);
    const probeGroups = (0, collaboration_1.getAgentRecoveryProbeGroups)();
    return Promise.all(probeGroups.map(async (group) => {
        const probe = await (0, collaboration_1.runAgentCliProbe)({
            ...options,
            ...group.probe_payload,
            timeout_ms: timeoutMs,
            source: "agent-recovery-monitor",
        }, ctx);
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