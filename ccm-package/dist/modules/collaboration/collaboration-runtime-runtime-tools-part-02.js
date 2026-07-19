"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasDailyDevContinuationGaps = hasDailyDevContinuationGaps;
exports.taskNeedsUserIntervention = taskNeedsUserIntervention;
exports.getTaskExecutionPhase = getTaskExecutionPhase;
exports.buildExecutionDashboard = buildExecutionDashboard;
exports.continueDailyDevTasksFromGaps = continueDailyDevTasksFromGaps;
exports.continueTaskWithMessage = continueTaskWithMessage;
exports.retryTask = retryTask;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const protocol_gates_1 = require("./protocol-gates");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_coordinator_review_1 = require("./collaboration-runtime-coordinator-review");
const collaboration_runtime_runtime_tools_part_01_1 = require("./collaboration-runtime-runtime-tools-part-01");
function hasDailyDevContinuationGaps(task) {
    if (!task || task.workflow_type !== "daily_dev")
        return false;
    if (task.status === "done" && (0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, [], task?.delivery_summary || {}))
        return false;
    if ((0, collaboration_runtime_task_queue_1.isTaskPaused)(task) || collaboration_runtime_task_queue_1.runningTaskIds.has(task.id) || (0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task.id))
        return false;
    const summary = task.delivery_summary || {};
    const hasSummaryGaps = [
        summary.blockers,
        summary.needs,
        summary.verification_required_missing,
        summary.verification_suggested,
        summary.verification_failed,
    ].some((items) => Array.isArray(items) && items.length > 0);
    const hasReceiptGaps = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].some((item) => item?.status && item.status !== "done");
    const hasWorkerNotificationGaps = (Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [])
        .some((item) => {
        const status = String(item?.status || "").trim();
        const receiptStatus = String(item?.receipt_status || "").trim();
        return ["failed", "blocked", "partial", "missing_receipt", "needs_info"].includes(status)
            || (!!receiptStatus && receiptStatus !== "done");
    });
    const hasCoordinationEvidenceGaps = Number(summary.coordination_plan_count || 0) <= 0
        || Number(summary.assignment_count || 0) <= 0
        || Number(summary.worker_notification_count || 0) <= 0;
    const hasAgentQaGap = summary.agent_qa_required === true && summary.agent_qa_gate_passed !== true;
    const hasIndependentReviewGap = summary.independent_review_required === true && summary.independent_review_gate_passed !== true;
    const hasPostReviewSpotCheckGap = summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true;
    const hasWeakAcceptanceGap = summary.acceptance_gate_passed === true && !(0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, [], summary);
    const hasAckGateGap = ((0, collaboration_runtime_status_helpers_1.taskRequiresCodeChanges)(task) || (0, collaboration_runtime_status_helpers_1.taskRequiresVerification)(task))
        && (summary.ack_gate_passed === false || (0, protocol_gates_1.getTaskAckRewriteRows)(task).length > 0);
    const contractInjection = (0, protocol_gates_1.getTaskContractInjectionRows)(task);
    const contractGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractInjection.rows, Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [], Array.isArray(summary.receipts) ? summary.receipts : []);
    const hasContractInjectionGap = contractGate.required && !contractGate.pass;
    return hasSummaryGaps || hasReceiptGaps || hasWorkerNotificationGaps || hasCoordinationEvidenceGaps || hasAgentQaGap || hasIndependentReviewGap || hasPostReviewSpotCheckGap || hasWeakAcceptanceGap || hasAckGateGap || hasContractInjectionGap;
}
function taskNeedsUserIntervention(task) {
    const summary = task?.delivery_summary || {};
    return task?.status === "failed"
        || (0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task)
        || [
            summary.blockers,
            summary.needs,
            summary.verification_failed,
            summary.verification_required_missing,
            summary.project_policy_violations,
            summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? [summary.independent_review_gate?.reason || "复杂变更缺少独立复核"] : [],
            summary.post_review_spot_check_required === true && summary.post_review_spot_check_gate_passed !== true ? [summary.post_review_spot_check_gate?.reason || "TestAgent 通过后主 Agent 抽查尚未通过"] : [],
        ].some((items) => Array.isArray(items) && items.length > 0)
        || [
            ...(Array.isArray(summary.receipts) ? summary.receipts : []),
            ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
        ].some((item) => ["failed", "blocked", "partial", "needs_info", "missing_receipt"].includes(String(item?.status || "")));
}
function getTaskExecutionPhase(task) {
    if (task?.status === "done")
        return (0, collaboration_runtime_task_queue_1.hasStrongTaskAcceptanceEvidence)(task, [], task?.delivery_summary || {}) ? "done" : "reviewing";
    if (collaboration_runtime_task_queue_1.runningTaskIds.has(task?.id) || task?.status === "in_progress")
        return "running";
    if (taskNeedsUserIntervention(task))
        return "blocked";
    if ((0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task?.id))
        return "queued";
    if (task?.status === "pending")
        return "pending";
    return task?.status || "unknown";
}
function getDashboardWorkerRows(task) {
    return require("./collaboration-task-card").getDashboardWorkerRows.apply(null, arguments);
}
function getTaskDashboardActions(task, phase) {
    const actions = [];
    if ((0, collaboration_runtime_task_queue_1.isTaskPaused)(task)) {
        actions.push({ id: "resume", label: "继续执行", kind: "resume", tone: "primary" });
    }
    else if (!["done", "cancelled"].includes(String(task?.status || ""))) {
        actions.push({ id: "pause", label: "暂停", kind: "pause", tone: "outline" });
    }
    if (task?.status !== "done") {
        actions.push({ id: "supplement", label: "补充说明", kind: "continue", tone: "primary" });
        actions.push({ id: "replan", label: "重新规划", kind: "continue", tone: "outline" });
        actions.push({ id: "redispatch", label: "重派", kind: "retry", tone: "outline" });
        actions.push({ id: "switch_executor", label: "换执行器", kind: "switch_executor", tone: "outline" });
    }
    if (hasDailyDevContinuationGaps(task)) {
        actions.push({ id: "gap_continue", label: "按缺口返工", kind: "gap_continue", tone: "warning" });
    }
    if (task?.status === "pending" && !(0, collaboration_runtime_coordinator_review_1.isTaskQueuedInMemory)(task?.id) && !(0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task)) {
        actions.push({ id: "queue", label: "加入队列", kind: "queue", tone: "primary" });
    }
    if (task?.delivery_summary)
        actions.push({ id: "pipeline", label: "协作看板", kind: "view_pipeline", tone: "outline" });
    if (task?.delivery_summary || task?.final_report || task?.result || task?.receipt || task?.review) {
        actions.push({ id: "report", label: "执行报告", kind: "view_report", tone: "outline" });
    }
    if (task?.status !== "done" && (0, collaboration_runtime_runtime_tools_part_01_1.canCompleteDailyDevFromDeliverySummary)(task, {}, task?.delivery_summary)) {
        actions.push({ id: "confirm_done", label: "人工确认完成", kind: "confirm_done", tone: "success" });
    }
    if (phase === "blocked" && (0, collaboration_runtime_task_queue_1.isAgentExecutionBlockedPendingTask)(task)) {
        actions.unshift({ id: "probe", label: "复检执行通道", kind: "probe", tone: "warning" });
    }
    if (!["done", "cancelled"].includes(String(task?.status || ""))) {
        actions.push({ id: "cancel", label: "取消任务", kind: "cancel", tone: "danger" });
    }
    return actions;
}
function buildExecutionDashboard(limit = 12) {
    const tasks = (0, db_1.loadTasks)()
        .filter((task) => !task.archived && !task.deleted_at)
        .slice()
        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));
    const queueStatus = (0, collaboration_runtime_coordinator_review_1.getQueueStatus)();
    const phaseCounts = { pending: 0, queued: 0, running: 0, blocked: 0, done: 0, failed: 0, unknown: 0 };
    const rows = tasks.map((task) => {
        const summary = task.delivery_summary || {};
        const phase = getTaskExecutionPhase(task);
        phaseCounts[phase] = Number(phaseCounts[phase] || 0) + 1;
        const latestPlan = summary.latest_coordination_plan || {};
        const blockers = [
            ...(Array.isArray(summary.blockers) ? summary.blockers : []),
            ...(Array.isArray(summary.needs) ? summary.needs : []),
            ...(Array.isArray(summary.verification_failed) ? summary.verification_failed.map((item) => `验证失败：${String(item)}`) : []),
            ...(Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.map((item) => `${item?.agent || "未知 Agent"} 缺验证：${Array.isArray(item?.required) ? item.required.join(" / ") : "项目配置命令"}`) : []),
            ...(Array.isArray(summary.project_policy_violations) ? summary.project_policy_violations : []),
            summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? `复杂变更缺少独立复核：${summary.independent_review_gate?.reason || "需要另一个 Agent 复核"}` : "",
        ].filter(Boolean);
        return {
            id: task.id,
            title: task.title,
            status: task.status,
            phase,
            priority: task.priority || "normal",
            workflow_type: task.workflow_type || "",
            assign_type: task.assign_type || "",
            target_project: task.target_project || "",
            group_id: task.group_id || "",
            created_at: task.created_at,
            updated_at: task.updated_at,
            status_detail: task.status_detail || "",
            headline: summary.headline || task.final_report || task.result || "",
            execution_readiness: task.execution_readiness || null,
            main_plan: {
                count: Number(summary.coordination_plan_count || (Array.isArray(summary.coordination_plans) ? summary.coordination_plans.length : 0) || (latestPlan?.phases?.length ? 1 : 0)),
                strategy: latestPlan.strategy || "",
                phases: Array.isArray(latestPlan.phases) ? latestPlan.phases.slice(0, 8) : [],
            },
            assignments: Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.slice(0, 12) : [],
            workers: getDashboardWorkerRows(task),
            evidence: {
                actual_file_change_count: Number(summary.actual_file_change_count || task.file_changes?.count || 0),
                actual_file_changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 12) : [],
                verification_executed: Array.isArray(summary.verification_executed) ? summary.verification_executed.slice(0, 12) : [],
                verification_failed: Array.isArray(summary.verification_failed) ? summary.verification_failed.slice(0, 12) : [],
                verification_required_missing: Array.isArray(summary.verification_required_missing) ? summary.verification_required_missing.slice(0, 12) : [],
                has_final_review: !!summary.has_final_review || !!task.review,
                receipt_count: Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0)),
            },
            rework_records: [
                ...(Array.isArray(summary.rework_evidence) ? summary.rework_evidence : []),
                ...(Array.isArray(task.followups) ? task.followups.map((item) => ({
                    time: item.time,
                    source: item.source || "user",
                    summary: item.message || item.summary || "用户补充说明",
                })) : []),
            ].slice(0, 12),
            blockers: blockers.slice(0, 12),
            recent_logs: (0, logs_1.getTaskLogs)(task.id, 5),
            actions: getTaskDashboardActions(task, phase),
            raw_task: task,
        };
    });
    const activeRows = rows.filter((item) => item.phase !== "done").slice(0, limit);
    const recentDoneRows = rows.filter((item) => item.phase === "done").slice(0, Math.max(0, limit - activeRows.length));
    return {
        success: true,
        generated_at: new Date().toISOString(),
        queue_status: queueStatus,
        summary: {
            total: tasks.length,
            active: activeRows.length,
            queued: Number(phaseCounts.queued || 0),
            running: Number(phaseCounts.running || 0),
            blocked: Number(phaseCounts.blocked || 0),
            pending: Number(phaseCounts.pending || 0),
            done: Number(phaseCounts.done || 0),
        },
        phase_counts: phaseCounts,
        items: [...activeRows, ...recentDoneRows],
    };
}
function continueDailyDevTasksFromGaps(ctx, options = {}) {
    return require("./collaboration-task-service").continueDailyDevTasksFromGaps(ctx, options);
}
function continueTaskWithMessage(taskId, message, ctx, options = {}) {
    if (!taskId)
        return { success: false, status: 400, error: "缺少任务 ID" };
    if (!(0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(message, ""))
        return { success: false, status: 400, error: "请输入补充说明" };
    const tasks = (0, db_1.loadTasks)();
    const current = tasks.find(t => t.id === taskId);
    if (!current)
        return { success: false, status: 404, error: "任务不存在" };
    const continuationKind = String(options.continuation_kind || options.continuationKind || "auto") === "auto"
        ? (0, collaboration_runtime_runtime_tools_part_01_1.classifyTaskContinuation)(message)
        : String(options.continuation_kind || options.continuationKind);
    if (continuationKind === "new_task") {
        return { success: false, status: 409, new_task_suggested: true, error: "这条要求看起来是一个独立新任务，请直接在群聊发送，不会混入当前任务。" };
    }
    const currentlyRunning = collaboration_runtime_task_queue_1.runningTaskIds.has(taskId);
    const source = String(options.source || "user");
    const automaticGapContinuation = (0, collaboration_runtime_runtime_tools_part_01_1.isAutomaticGapContinuationSource)(source);
    const internalContinuation = options.internal === true || options.internalContinuation === true || /dependency_unlocked_next_work_item/i.test(source);
    const gapFingerprint = automaticGapContinuation ? (0, collaboration_runtime_runtime_tools_part_01_1.getTaskGapFingerprint)(current) : "";
    const gapItems = automaticGapContinuation ? (0, collaboration_runtime_runtime_tools_part_01_1.getTaskGapItems)(current) : [];
    if (automaticGapContinuation && !(0, collaboration_runtime_runtime_tools_part_01_1.canAutoContinueTaskGaps)(current)) {
        return {
            success: false,
            status: 409,
            needs_user: true,
            error: "相同交付缺口已经自动返工过一次，但没有出现新的验收证据；请补充业务信息、调整方案或人工选择重试。",
            gap_fingerprint: gapFingerprint,
            gap_items: gapItems,
        };
    }
    const explicitOperationKey = String(options.idempotency_key || options.idempotencyKey || options.request_id || options.requestId || "").trim();
    const automaticOperationKey = automaticGapContinuation && gapFingerprint ? `auto-gap:${gapFingerprint}` : "";
    const operationKey = explicitOperationKey || automaticOperationKey;
    const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "task-continue", key: `${taskId}:${operationKey}`, traceId: current.trace_id, leaseMs: 60_000 }) : null;
    if (operation && !operation.acquired) {
        return { success: true, duplicate: true, task: (0, db_1.loadTasks)().find((item) => item.id === taskId) || current, ...(operation.record?.result || {}), trace_id: operation.traceId };
    }
    const resolvesWaitingUser = options.resolve_waiting_user === true
        || options.resolveWaitingUser === true
        || /waiting[_-]?user[_-]?resolution/i.test(source);
    const continuationMeta = {
        rework_kind: (0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(options.rework_kind || options.reworkKind || options.continuation_rework_kind || "", ""),
        target: (0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(options.target || options.agent || options.project || "", ""),
        reason: (0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(options.reason || options.detail || "", ""),
        title: (0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(options.title || options.label || "", ""),
        work_item_id: (0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(options.work_item_id || options.workItemId || "", ""),
        resolves_waiting_user: resolvesWaitingUser,
    };
    const shouldInterruptCurrentRun = currentlyRunning
        && continuationKind === "revise_goal"
        && options.interrupt_current_run !== false
        && options.interruptCurrentRun !== false;
    const isNextWorkItemContinuation = continuationMeta.rework_kind === "next_claimable_work_item"
        || /next_work_item|user_next_work_item/i.test(`${source} ${continuationMeta.rework_kind}`);
    const continuationDecision = (0, collaboration_runtime_task_queue_1.buildContinuationUserDecision)({
        source,
        kind: continuationKind,
        meta: { ...continuationMeta, interrupt_current_run: shouldInterruptCurrentRun },
        deferred: currentlyRunning,
    });
    const continuationTitle = continuationDecision.title;
    const continuationDetail = continuationDecision.timeline_detail || continuationDecision.reason || (continuationMeta.target ? `目标：${continuationMeta.target}` : "");
    const followup = {
        time: new Date().toISOString(),
        message: (0, collaboration_runtime_runtime_tools_part_01_1.compactFormText)(message, ""),
        source,
        kind: continuationKind,
        status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupt_requested" : "queued_for_current_task") : "accepted",
        continuation: {
            ...continuationMeta,
            strategy: continuationDecision.strategy,
            route_label: continuationDecision.route_label,
            replan_required: continuationDecision.replan_required,
            interrupt_current_run: shouldInterruptCurrentRun,
        },
        user_visible: {
            schema: "ccm-main-agent-continuation-status-v1",
            title: continuationDecision.title,
            headline: continuationDecision.headline,
            route_label: continuationDecision.route_label,
            kind_label: continuationDecision.kind_label,
            next_action: continuationDecision.next_action,
        },
    };
    const nextDescription = `${current.description || ""}${(0, collaboration_runtime_runtime_tools_part_01_1.buildTaskContinuationBlock)(followup.message)}`;
    const previousGap = current.collaboration_state?.gap || {};
    const autoAttempts = automaticGapContinuation
        ? (previousGap.fingerprint === gapFingerprint ? Number(previousGap.auto_attempts || 0) : 0) + 1
        : Number(previousGap.auto_attempts || 0);
    const nextCollaborationState = {
        ...(current.collaboration_state || {}),
        phase: "reworking",
        needs_user: false,
        gap: automaticGapContinuation ? {
            ...previousGap,
            fingerprint: gapFingerprint,
            items: gapItems,
            auto_attempts: autoAttempts,
            last_auto_continue_at: followup.time,
        } : resolvesWaitingUser && Object.keys(previousGap).length ? {
            ...previousGap,
            resolved_at: followup.time,
            resolved_by: source,
        } : previousGap,
        waiting_user_resolution: resolvesWaitingUser ? {
            resolved_at: followup.time,
            source,
            summary: "用户已补充任务所需条件",
        } : current.collaboration_state?.waiting_user_resolution || null,
        last_continuation: {
            source,
            at: followup.time,
            automatic: automaticGapContinuation || internalContinuation,
            kind: continuationKind,
            status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
            strategy: continuationDecision.strategy,
            route_label: continuationDecision.route_label,
            replan_required: continuationDecision.replan_required,
            interrupt_current_run: shouldInterruptCurrentRun,
            ...continuationMeta,
        },
        continuation_events: [
            ...(Array.isArray(current.collaboration_state?.continuation_events) ? current.collaboration_state.continuation_events : []),
            {
                source,
                at: followup.time,
                automatic: automaticGapContinuation || internalContinuation,
                kind: continuationKind,
                status: currentlyRunning ? (shouldInterruptCurrentRun ? "interrupting" : "deferred") : "accepted",
                title: continuationTitle,
                detail: continuationDetail,
                strategy: continuationDecision.strategy,
                route_label: continuationDecision.route_label,
                replan_required: continuationDecision.replan_required,
                interrupt_current_run: shouldInterruptCurrentRun,
                ...continuationMeta,
            },
        ].slice(-20),
        goal_revision_interruption: shouldInterruptCurrentRun ? {
            requested: true,
            requested_at: followup.time,
            reason: followup.message,
            source,
            followup_revision: Number(current.followup_revision || 0) + 1,
        } : current.collaboration_state?.goal_revision_interruption || null,
    };
    const updates = {
        description: nextDescription,
        followups: automaticGapContinuation || internalContinuation ? (Array.isArray(current.followups) ? current.followups : []) : [...(Array.isArray(current.followups) ? current.followups : []), followup],
        internal_continuations: automaticGapContinuation || internalContinuation ? [...(Array.isArray(current.internal_continuations) ? current.internal_continuations : []), followup].slice(-20) : (Array.isArray(current.internal_continuations) ? current.internal_continuations : []),
        status: currentlyRunning ? "in_progress" : "pending",
        is_paused: false,
        paused: false,
        ...(currentlyRunning ? {} : { result: "", final_report: "" }),
        followup_revision: Number(current.followup_revision || 0) + 1,
        pending_followups: [...(Array.isArray(current.pending_followups) ? current.pending_followups : []), followup].slice(-20),
        status_detail: options.status_detail || (automaticGapContinuation
            ? `已按 ${gapItems.length} 个交付缺口自动返工，等待主 Agent 继续执行`
            : continuationDecision.status_detail),
        collaboration_state: nextCollaborationState,
        last_continue_at: followup.time,
        last_continue_source: followup.source,
        ...(resolvesWaitingUser ? {
            recovery_pending: false,
            waiting_user_resolved_at: followup.time,
            waiting_user_resolution_source: source,
        } : {}),
        ...(internalContinuation ? { last_internal_continue_at: followup.time } : {}),
    };
    if (continuationKind === "revise_goal") {
        updates.business_goal = `${current.business_goal || current.title || ""}\n目标调整：${followup.message}`.trim();
        updates.plan_revision_required = true;
        updates.last_goal_revision_at = followup.time;
    }
    if (current.status === "done") {
        const reopened = (0, agent_sessions_1.reopenTaskAgentSessions)(taskId, "用户在同一任务中继续修改，恢复已验收会话");
        updates.reopened_session_count = reopened.length;
    }
    if (automaticGapContinuation) {
        updates.auto_gap_continue_count = Number(current.auto_gap_continue_count || 0) + 1;
        updates.last_auto_gap_continue_at = followup.time;
    }
    const task = (0, collaboration_runtime_runtime_tools_part_01_1.updateTask)(taskId, updates);
    let interruptionResult = null;
    if (shouldInterruptCurrentRun) {
        try {
            interruptionResult = (0, execution_kernel_1.requestTaskCancellation)(taskId, "用户调整了目标，先停止当前执行轮以重新核对计划", "main-agent-goal-revision");
            (0, logs_1.addTaskLog)(taskId, "warning", "目标调整触发当前执行轮停止；主 Agent 将保留上下文并按新目标重核计划");
            (0, logs_1.appendTaskTimelineEvent)(taskId, {
                type: "task_goal_revision_interrupt",
                title: "已停止当前执行轮以重核计划",
                detail: "用户调整了目标边界，主 Agent 正在停止可能跑偏的执行轮。",
                status: "warn",
                phase: "rework",
                agent: continuationMeta.target || "coordinator",
                data: { source, kind: continuationKind, interruption: interruptionResult },
            });
        }
        catch (error) {
            interruptionResult = { success: false, error: String(error?.message || error || "停止当前执行轮失败") };
            (0, logs_1.addTaskLog)(taskId, "warning", `目标调整尝试停止当前执行轮失败：${interruptionResult.error}`);
        }
    }
    (0, logs_1.addTaskLog)(taskId, "info", automaticGapContinuation
        ? `按交付缺口自动继续（${gapFingerprint}）：${gapItems.join("、").slice(0, 300)}`
        : internalContinuation
            ? `前置完成后自动接上下一步工作项：${followup.message.slice(0, 300)}`
            : `任务补充说明并继续执行：${followup.message.slice(0, 300)}`);
    (0, logs_1.appendTaskTimelineEvent)(taskId, {
        type: automaticGapContinuation ? "auto_gap_rework" : continuationDecision.timeline_type || (isNextWorkItemContinuation ? "next_work_item_dispatch" : /targeted|gap_rework|rework/i.test(source) ? "targeted_rework" : "task_continuation"),
        title: continuationTitle,
        detail: (0, memory_1.compactMemoryText)(continuationDetail || "我已复用同一任务上下文继续处理。", 260),
        status: "active",
        phase: "rework",
        agent: continuationMeta.target || "",
        data: { source, kind: continuationKind, rework_kind: continuationMeta.rework_kind, work_item_id: continuationMeta.work_item_id },
    });
    if (task?.assign_type === "group" && task.group_id && !automaticGapContinuation && !internalContinuation && options.append_group_message !== false && options.appendGroupMessage !== false) {
        const group = (0, storage_1.loadGroups)().find(g => g.id === task.group_id);
        const target = group ? (0, group_orchestrator_1.getCoordinatorMember)(group).project : "coordinator";
        (0, storage_1.appendGroupMessage)(task.group_id, {
            id: "m" + Date.now().toString(36) + "cont" + crypto.randomBytes(2).toString("hex"),
            role: "user",
            target,
            content: `任务补充说明：${followup.message}`,
            timestamp: followup.time,
            task_id: taskId,
        });
        (0, logs_1.safeAddGroupLog)(task.group_id, "info", "task", `任务收到补充说明并继续执行: ${task.title}`, { task_id: taskId });
    }
    else if (task?.assign_type === "group" && task.group_id && automaticGapContinuation) {
        (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(task, "pending", `已自动按 ${gapItems.length} 个交付缺口返工，不新增重复消息`);
        (0, logs_1.safeAddGroupLog)(task.group_id, "info", "task", `任务按相同卡片继续返工: ${task.title}`, { task_id: taskId, gap_fingerprint: gapFingerprint, gap_items: gapItems });
    }
    else if (task?.assign_type === "group" && task.group_id && internalContinuation) {
        (0, collaboration_runtime_task_queue_1.updateGroupTaskInlineStatus)(task, "pending", "前置工作已完成，我已自动接上下一步派发");
        (0, logs_1.safeAddGroupLog)(task.group_id, "info", "task", `任务前置完成后自动接续下一步: ${task.title}`, { task_id: taskId, work_item_id: continuationMeta.work_item_id });
    }
    let queueResult = null;
    if (!currentlyRunning && options.auto_execute !== false && options.autoExecute !== false) {
        queueResult = (0, collaboration_runtime_coordinator_review_1.enqueueTask)(taskId, ctx);
    }
    if (operationKey)
        (0, reliability_ledger_1.completeIdempotency)("task-continue", `${taskId}:${operationKey}`, { task_id: taskId, queued: !!queueResult?.queued, followup_time: followup.time });
    const userStatus = (0, collaboration_runtime_task_queue_1.buildUserContinuationStatus)(task, task?.status || "");
    return {
        success: true,
        task,
        message: followup.message,
        friendly_text: userStatus?.headline || continuationDecision.headline,
        next_action: userStatus?.next_action || continuationDecision.next_action,
        user_status: userStatus,
        interruption: interruptionResult,
        queued: !!queueResult?.queued,
        deferred: currentlyRunning,
        interrupted_current_run: shouldInterruptCurrentRun,
        same_task_trace: true,
        continuation_kind: continuationKind,
        trace_id: task?.trace_id || current.trace_id || "",
        queue_result: queueResult,
        queue_status: (0, collaboration_runtime_coordinator_review_1.getQueueStatus)(),
    };
}
function retryTask(id, ctx, reason = "", autoExecute = true) {
    return require("./collaboration-task-service").retryTask(id, ctx, reason, autoExecute);
}
//# sourceMappingURL=collaboration-runtime-runtime-tools-part-02.js.map