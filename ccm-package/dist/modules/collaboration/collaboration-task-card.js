"use strict";
// collaboration-task-card.ts — merged from 5 part files (behavior-freeze merge).
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
exports.MAIN_AGENT_VERIFICATION_STEP_PATTERN = exports.GROUP_MAIN_AGENT_LOOP_STAGES = void 0;
exports.isTaskPaused = isTaskPaused;
exports.getTaskFailureText = getTaskFailureText;
exports.getChildAgentIsolationMode = getChildAgentIsolationMode;
exports.isRecoverableRuntimeFailure = isRecoverableRuntimeFailure;
exports.isAgentExecutionBlockedPendingTask = isAgentExecutionBlockedPendingTask;
exports.isPositiveAcceptanceEvidenceText = isPositiveAcceptanceEvidenceText;
exports.isBareAcceptanceMarker = isBareAcceptanceMarker;
exports.isStrongExecutedVerificationText = isStrongExecutedVerificationText;
exports.flattenAcceptanceEvidenceRows = flattenAcceptanceEvidenceRows;
exports.evidenceRowText = evidenceRowText;
exports.rowEvidenceCount = rowEvidenceCount;
exports.isStrongPositiveReviewRow = isStrongPositiveReviewRow;
exports.hasStrongTaskAcceptanceEvidence = hasStrongTaskAcceptanceEvidence;
exports.deriveTaskLifecycle = deriveTaskLifecycle;
exports.buildTaskPreflightReasoning = buildTaskPreflightReasoning;
exports.getTaskRecoveryChecks = getTaskRecoveryChecks;
exports.hasTaskRecoveryEvidence = hasTaskRecoveryEvidence;
exports.buildMainAgentRecoverySummary = buildMainAgentRecoverySummary;
exports.taskCardPhase = taskCardPhase;
exports.taskCardGapLabel = taskCardGapLabel;
exports.userAgentRole = userAgentRole;
exports.userAgentProgress = userAgentProgress;
exports.sanitizeUserAgentProgressText = sanitizeUserAgentProgressText;
exports.normalizeUserAgentProgressStatus = normalizeUserAgentProgressStatus;
exports.userAgentProgressStatusLabel = userAgentProgressStatusLabel;
exports.userAgentProgressDefaultSummary = userAgentProgressDefaultSummary;
exports.userAgentProgressNextAction = userAgentProgressNextAction;
exports.userAgentSessionStatus = userAgentSessionStatus;
exports.userAgentSessionSummary = userAgentSessionSummary;
exports.userAgentSessionEvidence = userAgentSessionEvidence;
exports.agentNameMatches = agentNameMatches;
exports.latestAgentMatch = latestAgentMatch;
exports.isVisibleChildAgentName = isVisibleChildAgentName;
exports.buildUserAgentProgressSummary = buildUserAgentProgressSummary;
exports.normalizeUserChangeFile = normalizeUserChangeFile;
exports.pushUserChangeFiles = pushUserChangeFiles;
exports.userChangeFileKey = userChangeFileKey;
exports.isGenericChangeOwner = isGenericChangeOwner;
exports.pickChangeOwner = pickChangeOwner;
exports.mergeUserChangeFile = mergeUserChangeFile;
exports.uniqueUserChangeFiles = uniqueUserChangeFiles;
exports.buildUserChangeSummary = buildUserChangeSummary;
exports.buildUserTaskActions = buildUserTaskActions;
exports.getTaskWorkItems = getTaskWorkItems;
exports.stableTaskEntityId = stableTaskEntityId;
exports.groupSessionIdForTask = groupSessionIdForTask;
exports.buildTaskEntityChain = buildTaskEntityChain;
exports.buildTaskCardView = buildTaskCardView;
exports.normalizeContinuationKind = normalizeContinuationKind;
exports.buildContinuationUserDecision = buildContinuationUserDecision;
exports.buildUserContinuationStatus = buildUserContinuationStatus;
exports.shouldResumeAfterGoalRevisionInterruption = shouldResumeAfterGoalRevisionInterruption;
exports.buildGoalRevisionInterruptedStatus = buildGoalRevisionInterruptedStatus;
exports.shouldShowUserTaskCard = shouldShowUserTaskCard;
exports.timelineStatusForUser = timelineStatusForUser;
exports.timelineLabelForUser = timelineLabelForUser;
exports.buildUserWorkflowTimeline = buildUserWorkflowTimeline;
exports.buildUserAgentQuestionRows = buildUserAgentQuestionRows;
exports.buildUserConflictWarnings = buildUserConflictWarnings;
exports.splitUserAcceptanceText = splitUserAcceptanceText;
exports.getTaskPlanMode = getTaskPlanMode;
exports.buildUserWorkOrderPreview = buildUserWorkOrderPreview;
exports.executionStoryStatus = executionStoryStatus;
exports.buildUserExecutionStory = buildUserExecutionStory;
exports.buildUserCompletionReadinessSummary = buildUserCompletionReadinessSummary;
exports.sanitizeAcceptanceVisibleText = sanitizeAcceptanceVisibleText;
exports.normalizeUserAcceptanceCheck = normalizeUserAcceptanceCheck;
exports.buildUserAcceptanceReview = buildUserAcceptanceReview;
exports.planAlignmentEvidenceLabels = planAlignmentEvidenceLabels;
exports.planCriterionStatus = planCriterionStatus;
exports.buildUserPlanAlignmentReview = buildUserPlanAlignmentReview;
exports.buildUserHandoffSummary = buildUserHandoffSummary;
exports.buildLiveMainAgentTodoPlan = buildLiveMainAgentTodoPlan;
exports.buildLiveMainAgentDecisionForTask = buildLiveMainAgentDecisionForTask;
exports.getDashboardWorkerRows = getDashboardWorkerRows;
exports.normalizeMainAgentActionIds = normalizeMainAgentActionIds;
exports.buildGroupMainAgentInternalLoop = buildGroupMainAgentInternalLoop;
exports.buildUserVisiblePlanStep = buildUserVisiblePlanStep;
exports.buildMainAgentPlanVerificationReminder = buildMainAgentPlanVerificationReminder;
exports.normalizeLiveTodoStatus = normalizeLiveTodoStatus;
exports.buildTodoStepEvidence = buildTodoStepEvidence;
exports.buildTodoStepActions = buildTodoStepActions;
exports.loopStageStatus = loopStageStatus;
exports.planStepHasVerificationSignal = planStepHasVerificationSignal;
exports.summaryHasExecutedVerification = summaryHasExecutedVerification;
const collaboration_1 = require("./collaboration");
const collaboration_coordination_ux_1 = require("./collaboration-coordination-ux");
const collaboration_memory_gates_1 = require("./collaboration-memory-gates");
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const display_1 = require("./display");
const memory_1 = require("./memory");
const agent_qa_service_1 = require("./agent-qa-service");
const storage_1 = require("./storage");
const worktree_1 = require("../../agents/worktree");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
const dispatch_records_1 = require("./dispatch-records");
const work_items_1 = require("../../agents/work-items");
const main_agent_plan_core_1 = require("./main-agent-plan-core");
// ===== merged from collaboration-task-card-part-01.ts =====
/** User-facing task card, work item, and summary builders. Behavior-preserving extraction from the collaboration facade. */
const USER_AGENT_PROGRESS_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_id|global_run_id|workflow_timeline|raw_report|raw\s+receipt|raw\s+payload|原始回执|stack|injection_id/i;
function isTaskPaused(task) {
    return !!(task?.is_paused || task?.paused);
}
function getTaskFailureText(task) {
    return [
        task?.status_detail,
        task?.result,
        task?.final_report,
        task?.delivery_summary?.detail,
        task?.delivery_summary?.headline,
        ...(Array.isArray(task?.delivery_summary?.blockers) ? task.delivery_summary.blockers : []),
    ].filter(Boolean).join("\n");
}
function getChildAgentIsolationMode(group = null, task = null) {
    const explicit = task?.child_agent_isolation
        || task?.childAgentIsolation
        || group?.orchestrator?.child_agent_isolation
        || group?.orchestrator?.childAgentIsolation
        || group?.child_agent_isolation
        || group?.childAgentIsolation
        || process.env.CCM_CHILD_AGENT_ISOLATION
        || "";
    return (0, worktree_1.normalizeChildAgentIsolationMode)(explicit);
}
function isRecoverableRuntimeFailure(task) {
    if (!task?.auto_execute || isTaskPaused(task) || task.status !== "failed")
        return false;
    const text = getTaskFailureText(task);
    return /Agent Runner|外部 Agent Runner|spawn\s+EPERM|spawnSync .* EPERM|ConnectionRefused|Unable to connect to API|ECONNREFUSED|Agent 响应超时|响应超时|转发失败:\s*spawn EPERM/i.test(text);
}
function isAgentExecutionBlockedPendingTask(task) {
    if (!task?.auto_execute || isTaskPaused(task) || task.status !== "pending")
        return false;
    if (collaboration_1.runningTaskIds.has(task.id) || (0, collaboration_1.isTaskQueuedInMemory)(task.id))
        return false;
    const readiness = task.execution_readiness || {};
    const text = [
        task.status_detail,
        readiness.message,
        task.result,
    ].filter(Boolean).join("\n");
    return !!task.last_queue_blocked_at
        || readiness.ready === false
        || /Agent CLI|执行通道|Agent Runner|外部 Agent Runner|spawn\s+EPERM|ConnectionRefused|Unable to connect to API|ECONNREFUSED/i.test(text);
}
function isPositiveAcceptanceEvidenceText(value) {
    const text = String(value || "").trim();
    if (!text)
        return false;
    if (/未通过|失败|待补|待处理|缺口|证据不足|无法确认|无法验证|failed|failure|partial|incomplete|missing|blocked/i.test(text))
        return false;
    return /已通过|通过|可以接受|已覆盖|已执行|已复核|已验证|passed|pass|success|ok/i.test(text);
}
function isBareAcceptanceMarker(value) {
    return /^(最终验收|主\s*Agent\s*验收|验收结论)\s*[：:]?\s*(已通过|通过)$/i.test(String(value || "").trim());
}
function isStrongExecutedVerificationText(value) {
    const text = String(value || "").trim();
    if (!text || (0, collaboration_coordination_ux_1.isFailedVerification)(text) || (0, collaboration_coordination_ux_1.isSuggestedOnlyVerification)(text))
        return false;
    return /已实际执行|已执行|外部 Runner|验证来源|命令|npm|pnpm|yarn|test|check|lint|build|playwright|pytest|exit\s*0|passed|success|ok/i.test(text);
}
function flattenAcceptanceEvidenceRows(...values) {
    const rows = [];
    const visit = (value) => {
        if (!value)
            return;
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        if (typeof value === "object") {
            const hasOwnConclusion = value.verdict || value.status || value.summary || value.detail || value.reason || value.label || value.reviewer;
            if (!hasOwnConclusion && Array.isArray(value.items)) {
                for (const item of value.items)
                    visit(item);
                return;
            }
            if (!hasOwnConclusion && Array.isArray(value.evidence)) {
                for (const item of value.evidence)
                    visit(item);
                return;
            }
        }
        rows.push(value);
    };
    for (const value of values)
        visit(value);
    return rows;
}
function evidenceRowText(row) {
    if (!row || typeof row !== "object")
        return String(row || "");
    return [
        row.summary,
        row.detail,
        row.reason,
        row.message,
        row.label,
        row.title,
        row.verdict,
        row.status,
    ].filter(Boolean).join(" ");
}
function rowEvidenceCount(row) {
    if (!row || typeof row !== "object")
        return 0;
    return (0, collaboration_1.uniqueStrings)(row.evidence, row.verification, row.checks, row.files, row.files_changed, row.filesChanged).length;
}
function isStrongPositiveReviewRow(row) {
    if (!row || typeof row !== "object")
        return isPositiveAcceptanceEvidenceText(row) && !isBareAcceptanceMarker(row);
    const verdict = String(row.verdict || row.status || "").toLowerCase();
    const passed = /pass|passed|approved|accepted|success|ok|通过|已通过/.test(verdict)
        && !/fail|failed|rejected|partial|incomplete|blocked|未通过|失败|待补/.test(verdict);
    const text = evidenceRowText(row);
    return passed && (rowEvidenceCount(row) > 0 || (isPositiveAcceptanceEvidenceText(text) && !isBareAcceptanceMarker(text)));
}
function hasStrongTaskAcceptanceEvidence(task, executions = [], explicitSummary = null) {
    const summary = explicitSummary || task?.delivery_summary || {};
    const gate = summary.acceptance_gate || {};
    const gatePass = summary.acceptance_gate_passed === true || gate.pass === true;
    if (!gatePass)
        return false;
    const gateChecks = Array.isArray(gate.checks) ? gate.checks : (Array.isArray(gate.items) ? gate.items : []);
    const gateFailedCount = Number(gate.failed_count || gate.failedCount || gateChecks.filter((item) => item?.ok === false || item?.pass === false).length || 0);
    const gateTotal = Number(gate.total || gate.total_count || gateChecks.length || 0);
    const substantiveGateIds = new Set([
        "actual_changes",
        "actual_diff",
        "verification",
        "required_verification",
        "verification_source",
        "independent_review",
        "final_review",
        "worker_receipt",
        "receipt_quality",
        "work_items",
        "team_shutdown",
    ]);
    const gateHasSubstantiveChecks = gateTotal > 0
        && gateFailedCount === 0
        && gateChecks.every((item) => item?.ok !== false && item?.pass !== false)
        && gateChecks.some((item) => substantiveGateIds.has(String(item?.id || "")) && (item?.detail || item?.label));
    if (gateHasSubstantiveChecks)
        return true;
    const deliveryReport = summary.delivery_report || summary.deliveryReport || {};
    const verificationRows = (0, collaboration_1.uniqueStrings)(summary.verification_executed, summary.external_runner_verification, summary.verification_results, summary.verification, task?.verification_results, task?.verification, deliveryReport.verification, deliveryReport.verification_evidence?.executed, deliveryReport.verificationEvidence?.executed, deliveryReport.verification_evidence?.items, deliveryReport.verificationEvidence?.items);
    if (verificationRows.some(isStrongExecutedVerificationText))
        return true;
    if (summary.verification_source_gate_passed === true && Number(summary.external_runner_verification_count || 0) > 0)
        return true;
    const independentReviewRows = flattenAcceptanceEvidenceRows(summary.independent_review, summary.independentReview, summary.independent_review_evidence, summary.independent_review_gate?.evidence, deliveryReport.independent_review, deliveryReport.independentReview);
    if (summary.independent_review_gate_passed === true && Number(summary.independent_review_gate?.evidence_count || independentReviewRows.length || 0) > 0)
        return true;
    if (independentReviewRows.some(isStrongPositiveReviewRow))
        return true;
    const acceptanceRows = flattenAcceptanceEvidenceRows(summary.acceptance, summary.acceptance_evidence, summary.acceptanceEvidence, deliveryReport.acceptance, deliveryReport.acceptance_evidence, deliveryReport.acceptanceEvidence);
    if (acceptanceRows.some((row) => {
        const text = evidenceRowText(row) || String(row || "");
        return isPositiveAcceptanceEvidenceText(text) && !isBareAcceptanceMarker(text);
    }))
        return true;
    const executionGreen = executions.some((item) => item?.green?.pass === true && ["project", "workspace", "merge_ready"].includes(String(item?.green?.level || "")));
    if (executionGreen && (verificationRows.length > 0 || gateTotal > 0))
        return true;
    return false;
}
function deriveTaskLifecycle(task, executions = []) {
    const summary = task?.delivery_summary || {};
    const status = String(task?.status || "pending");
    const strongAcceptance = hasStrongTaskAcceptanceEvidence(task, executions, summary);
    if (status === "done" && strongAcceptance)
        return { state: "completed", terminal: true, keepsSession: false };
    if (status === "cancelled")
        return { state: "cancelled", terminal: true, keepsSession: false };
    if (status === "failed")
        return { state: "failed", terminal: false, keepsSession: true };
    if (status === "paused")
        return { state: "paused", terminal: false, keepsSession: true };
    if (task?.sandbox_rehearsal?.status === "needs_user" || task?.workflow_meta?.sandbox_rehearsal?.status === "needs_user")
        return { state: "waiting_confirmation", terminal: false, keepsSession: true };
    if (Number(summary.agent_qa_open_count || 0) > 0 || /等待.*依赖|前置依赖/.test(String(task?.status_detail || "")))
        return { state: "waiting_dependency", terminal: false, keepsSession: true };
    if (Number(summary.rework_count || 0) > 0)
        return { state: "rework", terminal: false, keepsSession: true };
    if (status === "done" || executions.some(item => item.state === "reviewing") || summary.acceptance_gate_passed === false && summary.acceptance_gate)
        return { state: "acceptance", terminal: false, keepsSession: true };
    if (executions.some(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state)) || status === "in_progress")
        return { state: "executing", terminal: false, keepsSession: true };
    if (["pending", "queued"].includes(status))
        return { state: "queued", terminal: false, keepsSession: true };
    return { state: "intake", terminal: false, keepsSession: true };
}
function buildTaskPreflightReasoning(task, reason = "任务执行前复核", recovery = false) {
    const state = task?.reasoning_loop
        ? (0, reasoning_loop_1.normalizeAgentReasoningState)(task.reasoning_loop, task?.business_goal || task?.title || "")
        : (0, reasoning_loop_1.createAgentReasoningState)({
            goal: task?.business_goal || task?.title || task?.description || "",
            assertions: [
                { id: "goal", label: "业务目标得到满足", kind: "goal" },
                { id: "files", label: "真实文件变更符合任务范围", kind: "delivery" },
                { id: "verification", label: "独立 Runner 验证通过", kind: "verification" },
                { id: "acceptance", label: "主 Agent 最终验收通过", kind: "acceptance" },
            ],
        });
    const planSource = task?.delivery_summary?.latest_coordination_plan || task?.workflow_meta?.coordination_plan || task?.coordination_plan || {};
    const plan = Array.isArray(planSource?.phases) ? planSource.phases
        : Array.isArray(planSource?.plan) ? planSource.plan
            : Array.isArray(task?.workflow_meta?.phases) ? task.workflow_meta.phases : [];
    (0, reasoning_loop_1.updateReasoningPlan)(state, plan.map((item) => item?.title || item?.description || item), reason);
    const executions = task?.id ? (0, execution_kernel_1.listExecutions)({ taskId: task.id }) : [];
    const sessions = task?.id ? (0, agent_sessions_1.listTaskAgentSessions)({ taskId: task.id }) : [];
    const currentFacts = {
        task_id: task?.id,
        status: task?.status,
        status_detail: task?.status_detail,
        business_goal: task?.business_goal || task?.title,
        acceptance_criteria: task?.acceptance_criteria || "",
        target_project: task?.target_project || "",
        group_id: task?.group_id || "",
        executions: executions.map(item => ({ project: item.project, state: item.state, green: item.green?.level || "none" })),
        sessions: sessions.map(item => ({ project: item.project, executor: item.agentType, status: item.status, resume_mode: item.resumeMode, turns: item.turnCount })),
    };
    (0, reasoning_loop_1.captureReasoningFacts)(state, recovery ? "recovery_preflight" : "execution_preflight", currentFacts);
    (0, reasoning_loop_1.explainReasoningDecision)(state, recovery ? "resume_after_revalidation" : "start_execution", reason);
    (0, reasoning_loop_1.setReasoningAssertion)(state, { id: "goal_revalidated", label: "执行前已重新核对原始目标", kind: "preflight", status: state.original_goal ? "passed" : "blocked", evidence: [state.original_goal], reason });
    (0, reasoning_loop_1.setReasoningAssertion)(state, { id: "acceptance_revalidated", label: "执行前已重新核对验收条件", kind: "preflight", status: task?.acceptance_criteria ? "passed" : "blocked", evidence: [task?.acceptance_criteria || ""], reason });
    if (recovery) {
        const gaps = (0, collaboration_1.uniqueStrings)([
            ...(task?.delivery_summary?.acceptance_gate?.failed_checks?.map((item) => item.label || item.id) || task?.delivery_summary?.needs || []),
            ...(!task?.acceptance_criteria ? ["缺少可核对的验收条件"] : []),
        ]);
        (0, reasoning_loop_1.recordReasoningRecoveryCheck)(state, {
            reason,
            goalRevalidated: !!state.original_goal,
            stateRevalidated: true,
            acceptanceRevalidated: !!task?.acceptance_criteria,
            remainingGaps: gaps,
        });
        if (!task?.acceptance_criteria)
            (0, reasoning_loop_1.recordReasoningDeviation)(state, "recovery_acceptance_missing", "恢复任务时没有可核对的验收条件，禁止直接宣告完成", "error");
    }
    return state;
}
function getTaskRecoveryChecks(task) {
    return Array.isArray(task?.reasoning_loop?.recovery_checks) ? task.reasoning_loop.recovery_checks : [];
}
function hasTaskRecoveryEvidence(task) {
    const recovery = task?.recovery || {};
    return task?.recovery_pending === true
        || getTaskRecoveryChecks(task).length > 0
        || !!recovery.recovered_at
        || !!recovery.revalidated_at
        || !!recovery.pending_since
        || Number(task?.execution_lease?.recovery_count || 0) > 0;
}
function buildMainAgentRecoverySummary(task, phase, sessions = [], workItems = [], gapItems = []) {
    if (!hasTaskRecoveryEvidence(task))
        return null;
    const recovery = task?.recovery || {};
    const checks = getTaskRecoveryChecks(task);
    const latestCheck = checks[checks.length - 1] || {};
    const preserved = [];
    const nativeSessions = sessions.filter((item) => item.resumeMode === "native" || item.nativeSessionId);
    if (sessions.length)
        preserved.push(`保留 ${sessions.length} 个执行成员会话上下文`);
    if (nativeSessions.length)
        preserved.push(`其中 ${nativeSessions.length} 个可尝试恢复原生 CLI 会话`);
    if (workItems.length)
        preserved.push(`恢复 ${workItems.length} 个执行队列工作项`);
    const remainingGaps = (0, collaboration_1.uniqueStrings)([
        ...(Array.isArray(latestCheck.remaining_gaps) ? latestCheck.remaining_gaps : []),
        ...gapItems.map(taskCardGapLabel),
    ]).slice(0, 6);
    const mode = recovery.mode || (recovery.pending_since ? "manual_startup_recovery" : recovery.revalidated_at ? "manual_resume" : recovery.recovered_at ? "startup_auto_recovery" : "runtime_recovery");
    const status = task?.recovery_pending === true || phase === "needs_user"
        ? "needs_user"
        : ["completed", "cancelled", "reverted"].includes(phase)
            ? "recorded"
            : "active";
    return {
        schema: "ccm-main-agent-recovery-summary-v1",
        title: "恢复接续",
        status,
        mode,
        status_label: status === "needs_user"
            ? "待确认"
            : mode === "startup_auto_recovery"
                ? "已自动接上"
                : status === "recorded"
                    ? "已记录"
                    : "已接上",
        headline: status === "needs_user"
            ? recovery.requires_user === true && recovery.user_headline
                ? recovery.user_headline
                : "检测到上次任务没有完整收尾，我已暂停并等待你确认是否继续。"
            : recovery.user_headline || "我已接上上次任务上下文，重新核对目标、当前状态和验收条件后继续推进。",
        revalidated: {
            goal: latestCheck.goal_revalidated === true,
            state: latestCheck.state_revalidated === true,
            acceptance: latestCheck.acceptance_revalidated === true,
        },
        preserved: (0, collaboration_1.uniqueStrings)([
            ...(recovery.authorization_preserved === true ? ["已保留你之前确认的执行授权"] : []),
            ...preserved,
        ]),
        remaining_gaps: remainingGaps,
        next_action: status === "needs_user"
            ? recovery.user_next_action || "确认继续后会复用原任务、执行队列和可恢复会话。"
            : remainingGaps.length
                ? "继续处理恢复后仍未满足的验收缺口。"
                : recovery.user_next_action || "继续使用恢复后的上下文执行并等待验收。",
        technical: {
            recovery_checks: checks.length,
            lease_recovery_count: Number(task?.execution_lease?.recovery_count || recovery.lease_recovery_count || 0),
            previous_status: recovery.previous_status || "",
            recovered_at: recovery.recovered_at || recovery.revalidated_at || recovery.pending_since || "",
            decision_code: recovery.decision_code || "",
            decision_reason: recovery.decision_reason || "",
            authorization_preserved: recovery.authorization_preserved === true,
            authorization_evidence: Array.isArray(recovery.authorization_evidence) ? recovery.authorization_evidence : [],
        },
    };
}
function taskCardPhase(task, executions) {
    const explicit = String(task?.collaboration_state?.phase || "");
    if (task?.rolled_back_at)
        return "reverted";
    if (task?.intake_state === "awaiting_confirmation")
        return "needs_user";
    if (task?.status === "awaiting_change_review")
        return "change_review";
    if (explicit)
        return explicit === "completed" && !hasStrongTaskAcceptanceEvidence(task, executions) ? "reviewing" : explicit;
    if (task?.status === "done")
        return hasStrongTaskAcceptanceEvidence(task, executions) ? "completed" : "reviewing";
    if (task?.status === "cancelled")
        return "cancelled";
    if (task?.collaboration_state?.needs_user)
        return "needs_user";
    if (executions.some(item => item.state === "reviewing"))
        return "reviewing";
    if (executions.some(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state)) || task?.status === "in_progress")
        return "executing";
    if (task?.status === "failed")
        return "blocked";
    return (0, collaboration_1.isTaskQueuedInMemory)(task?.id) ? "queued" : "planning";
}
function taskCardGapLabel(item) {
    const value = String(item || "");
    if (value === "coordination_plan")
        return "主 Agent 尚未形成可验收计划";
    if (value === "assignment_evidence")
        return "目标 Agent 尚未接到明确工作单";
    if (value === "worker_notification")
        return "尚未收到项目 Agent 的执行结果";
    if (value === "agent_qa_evidence")
        return "Agent 间仍有问题需要确认";
    if (value.startsWith("verification_required:"))
        return `${value.split(":")[1] || "项目"} 尚未完成要求的验证`;
    if (value.startsWith("verification_failed:"))
        return `验证失败：${value.slice("verification_failed:".length)}`;
    if (value.startsWith("verification_unexecuted:"))
        return `验证尚未实际执行：${value.slice("verification_unexecuted:".length)}`;
    if (value.startsWith("blocker:"))
        return value.slice("blocker:".length);
    if (value.startsWith("need:"))
        return value.slice("need:".length);
    if (value.startsWith("receipt:"))
        return `${value.split(":")[1] || "项目 Agent"} 尚未提交可验收结果`;
    if (value.startsWith("ack_rewrite:"))
        return `${value.split(":")[1] || "项目 Agent"} 需要先重写接单 ACK`;
    if (value.startsWith("contract_inject:"))
        return `${value.split(":")[1] || "依赖 Agent"} 尚未收到 contractChanges 注入续跑`;
    if (value.startsWith("contract_consume:"))
        return `${value.split(":")[1] || "依赖 Agent"} 需要补充 contractChanges 消费结果说明`;
    if (value.startsWith("notification:"))
        return `${value.split(":")[1] || "项目 Agent"} 的本轮工作尚未完成`;
    if (value === "acceptance_evidence")
        return "最终验收缺少真实验证或复核证据";
    return value;
}
function userAgentRole(project) {
    const name = String(project || "");
    if (/web|front|frontend|app|mobile|ui|页面|前端/i.test(name))
        return "前端";
    if (/api|server|backend|cloud|service|后端|服务/i.test(name))
        return "后端";
    if (/test|qa|验收|测试/i.test(name))
        return "测试";
    return "项目";
}
function userAgentProgress(worker) {
    const status = String(worker?.status || "pending");
    const role = userAgentRole(worker?.agent || "");
    if (["done", "completed"].includes(status))
        return `${role}已回传结果`;
    if (["failed", "blocked"].includes(status))
        return `${role}遇到问题，正在自动恢复`;
    if (["running", "in_progress", "partial"].includes(status))
        return `${role}正在修改和检查`;
    return `${role}正在等待开始`;
}
function sanitizeUserAgentProgressText(value, fallback = "", max = 180) {
    const text = (0, memory_1.compactMemoryText)(value || "", max);
    if (!text)
        return fallback;
    if (USER_AGENT_PROGRESS_INTERNAL_PATTERN.test(text))
        return fallback;
    return (0, display_1.sanitizeMainAgentUserText)(text, fallback, max) || fallback;
}
function normalizeUserAgentProgressStatus(status, phase = "") {
    const value = String(status || "").toLowerCase().trim();
    if (["done", "completed", "succeeded", "success"].includes(value))
        return "completed";
    if (["failed", "error"].includes(value))
        return "failed";
    if (["blocked", "needs_info", "needs_user", "waiting_user", "partial", "missing_receipt"].includes(value))
        return "blocked";
    if (["running", "in_progress", "executing", "reviewing", "ready", "prompt_accepted", "spawning", "open"].includes(value))
        return "running";
    if (["pending", "queued", "waiting", "planned"].includes(value))
        return "pending";
    if (phase === "completed")
        return "completed";
    if (phase === "executing" || phase === "reviewing" || phase === "reworking")
        return "running";
    return "pending";
}
function userAgentProgressStatusLabel(status) {
    const value = normalizeUserAgentProgressStatus(status);
    if (value === "completed")
        return "已回传结果";
    if (value === "failed")
        return "失败";
    if (value === "blocked")
        return "待补齐";
    if (value === "running")
        return "执行中";
    return "等待中";
}
function userAgentProgressDefaultSummary(agent, status, currentFocus = "", blockers = []) {
    const focus = sanitizeUserAgentProgressText(currentFocus, "", 120);
    if (status === "completed")
        return focus ? `已回传结果：${focus}` : `${userAgentRole(agent)}已回传结果`;
    if (status === "failed")
        return blockers[0] ? `失败：${blockers[0]}` : `${userAgentRole(agent)}执行失败，等待我处理`;
    if (status === "blocked")
        return blockers[0] ? `受阻：${blockers[0]}` : `${userAgentRole(agent)}遇到问题，等待我调整`;
    if (status === "running")
        return focus ? `正在${focus.replace(/^正在/, "")}` : `${userAgentRole(agent)}正在修改和检查`;
    return focus ? `等待派发：${focus}` : `${userAgentRole(agent)}正在等待开始`;
}
function userAgentProgressNextAction(status, currentFocus = "") {
    if (status === "completed")
        return "等待我纳入验收和最终总结";
    if (status === "failed" || status === "blocked")
        return "我会按缺口精准返工";
    if (status === "running")
        return "继续执行，完成后提交结果和验证";
    return currentFocus ? "等待前置条件满足后派发" : "等待我分配下一步";
}
function userAgentSessionStatus(session) {
    if (!session || typeof session !== "object")
        return "";
    const status = String(session.status || "").toLowerCase();
    if (status === "open")
        return session.lastTurnSucceeded === false ? "blocked" : "running";
    if (status === "closed")
        return "completed";
    return status;
}
function userAgentSessionSummary(session, status) {
    if (!session || typeof session !== "object")
        return "";
    const turnCount = Number(session.turnCount || 0);
    const parts = [];
    if (status === "completed")
        parts.push("执行上下文已收尾");
    else if (turnCount > 0)
        parts.push(`已连续推进 ${turnCount} 轮`);
    else
        parts.push("已建立执行上下文");
    if (session.lastTurnSucceeded === true)
        parts.push("最近一轮已返回");
    if (session.lastTurnSucceeded === false) {
        const error = sanitizeUserAgentProgressText(session.lastError || "", "", 120);
        parts.push(error ? `最近一轮需要处理：${error}` : "最近一轮需要我处理");
    }
    if (session.resumeMode === "native" && (session.nativeSessionId || Number(session.turnCount || 0) > 0))
        parts.push("上下文已保留，可接着做");
    else if (session.resumeMode === "scratchpad")
        parts.push("上下文已用备份方式保留");
    return sanitizeUserAgentProgressText(parts.filter(Boolean).join("；"), "", 220);
}
function userAgentSessionEvidence(session, status) {
    if (!session || typeof session !== "object")
        return null;
    const turnCount = Number(session.turnCount || 0);
    const detail = userAgentSessionSummary(session, status);
    return {
        id: "session_progress",
        label: "上下文",
        value: turnCount > 0 ? `${turnCount} 轮` : status === "completed" ? "已收尾" : "已建立",
        detail,
    };
}
function agentNameMatches(value, name) {
    const target = String(value || "").trim().toLowerCase();
    const current = String(name || "").trim().toLowerCase();
    return !!target && !!current && target === current;
}
function latestAgentMatch(rows, name, picker) {
    return [...(Array.isArray(rows) ? rows : [])].reverse().find(item => agentNameMatches(picker(item), name)) || null;
}
function isVisibleChildAgentName(name) {
    const value = String(name || "").trim();
    if (!value)
        return false;
    return !/^(coordinator|main-agent|main agent|global-agent|global agent|主\s*Agent|全局主\s*Agent)$/i.test(value);
}
function buildUserAgentProgressSummary(task, summary = {}, workers = [], executions = [], sessions = [], workItems = [], phase = "") {
    const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ].filter(Boolean);
    const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const names = (0, collaboration_1.uniqueStrings)([
        ...workers.map((item) => item.agent),
        ...workItems.map((item) => item.owner || item.target),
        ...executions.map((item) => item.project || item.agent),
        ...sessions.map((item) => item.project || item.agent),
        ...assignments.map((item) => item.project || item.agent || item.target_project),
        ...receipts.map((item) => item.agent || item.project || item.target_project || item.target),
        ...notifications.map((item) => item.agent || item.project || item.task_id),
    ].filter(Boolean)).filter(isVisibleChildAgentName).slice(0, 12);
    if (!names.length)
        return null;
    const rows = names.map((name) => {
        const worker = latestAgentMatch(workers, name, item => item.agent) || {};
        const workItem = latestAgentMatch(workItems, name, item => item.owner || item.target) || {};
        const execution = latestAgentMatch(executions, name, item => item.project || item.agent) || {};
        const session = latestAgentMatch(sessions, name, item => item.project || item.agent) || {};
        const assignment = latestAgentMatch(assignments, name, item => item.project || item.agent || item.target_project) || {};
        const receipt = latestAgentMatch(receipts, name, item => item.agent || item.project || item.target_project || item.target) || {};
        const notification = latestAgentMatch(notifications, name, item => item.agent || item.project || item.task_id) || {};
        const sessionProgressStatus = userAgentSessionStatus(session);
        const rawStatus = receipt.status || receipt.receipt_status || notification.receipt_status || notification.status || worker.status || execution.state || execution.status || sessionProgressStatus || workItem.status || assignment.status || "";
        const status = normalizeUserAgentProgressStatus(rawStatus, phase);
        const sessionSummary = userAgentSessionSummary(session, status);
        const filesChanged = (0, collaboration_1.uniqueStrings)(worker.files_changed, workItem.filesChanged || workItem.files_changed, receipt.filesChanged || receipt.files_changed || receipt.files, notification.filesChanged || notification.files_changed || notification.files).slice(0, 30);
        const verification = (0, collaboration_1.uniqueStrings)(worker.verification, workItem.verification, receipt.verification || receipt.tests || receipt.verification_results, notification.verification || notification.tests || notification.verification_results).slice(0, 20);
        const blockers = (0, collaboration_1.uniqueStrings)(worker.blockers, workItem.blockers, workItem.needs, receipt.blockers, receipt.needs, notification.blockers, notification.needs).map(item => sanitizeUserAgentProgressText(item, "", 160)).filter(Boolean).slice(0, 4);
        const currentFocus = sanitizeUserAgentProgressText(workItem.subject || worker.task || assignment.task || assignment.summary || notification.task || task?.business_goal || task?.title || "", "", 150);
        const fallbackSummary = userAgentProgressDefaultSummary(name, status, currentFocus, blockers);
        const preferSessionProgress = !!sessionSummary
            && ["running", "blocked"].includes(status)
            && (session.resumeMode === "native" || Number(session.turnCount || 0) > 0);
        const rowSummary = sanitizeUserAgentProgressText(preferSessionProgress
            ? sessionSummary
            : receipt.summary || notification.summary || worker.summary || sessionSummary || workItem.evidence?.[0] || workItem.description || assignment.reason || "", fallbackSummary, 180) || fallbackSummary;
        const evidence = [];
        if (filesChanged.length)
            evidence.push({ id: "files", label: "文件", value: `${filesChanged.length} 个`, detail: filesChanged.slice(0, 3).join("、") });
        if (verification.length)
            evidence.push({ id: "verification", label: "验证", value: `${verification.length} 项`, detail: verification.slice(0, 2).join("、") });
        const sessionEvidence = userAgentSessionEvidence(session, status);
        if (sessionEvidence)
            evidence.push(sessionEvidence);
        if (receipt.agent || receipt.project)
            evidence.push({ id: "result", label: "结果", value: userAgentProgressStatusLabel(status), detail: sanitizeUserAgentProgressText(receipt.summary || "", "", 120) });
        else if (notification.agent || notification.project || notification.task_id)
            evidence.push({ id: "update", label: "更新", value: userAgentProgressStatusLabel(status), detail: sanitizeUserAgentProgressText(notification.summary || "", "", 120) });
        return {
            agent: name,
            role: userAgentRole(name),
            status,
            status_label: userAgentProgressStatusLabel(status),
            summary: rowSummary,
            current_focus: currentFocus,
            evidence: evidence.slice(0, 4),
            files_changed_count: filesChanged.length,
            verification_count: verification.length,
            blockers,
            next_action: userAgentProgressNextAction(status, currentFocus),
        };
    });
    if (!rows.length)
        return null;
    const blockedCount = rows.filter(row => ["blocked", "failed"].includes(row.status)).length;
    const runningCount = rows.filter(row => row.status === "running").length;
    const pendingCount = rows.filter(row => row.status === "pending").length;
    const completedCount = rows.filter(row => row.status === "completed").length;
    const status = blockedCount
        ? "needs_attention"
        : runningCount || pendingCount
            ? "running"
            : completedCount === rows.length
                ? "completed"
                : "running";
    const headline = blockedCount
        ? `${blockedCount} 个执行成员需要补证据或处理阻塞，我会按缺口继续推进。`
        : runningCount || pendingCount
            ? `${rows.length} 个执行成员的进展已汇总，我会继续跟踪文件、验证和结果。`
            : `${completedCount} 个执行成员的结果已收齐，我正在整理验收和交付总结。`;
    return {
        schema: "ccm-child-agent-progress-summary-v1",
        title: "执行进展摘要",
        status,
        status_label: status === "completed" ? "已收齐" : status === "needs_attention" ? "需关注" : "跟踪中",
        headline,
        rows,
        next_action: status === "completed"
            ? "我会把这些结果合并进最终总结"
            : status === "needs_attention"
                ? "优先处理缺口，不整轮重跑"
                : "等待执行成员继续提交结果和验证",
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
    };
}
function normalizeUserChangeFile(item, fallback = {}) {
    if (!item)
        return null;
    if (typeof item === "string") {
        const pathText = (0, memory_1.compactMemoryText)(item, 260);
        if (!pathText)
            return null;
        return {
            path: pathText,
            project: fallback.project || "",
            agent: fallback.agent || fallback.project || "",
            status: "changed",
            status_label: "变更",
            additions: 0,
            deletions: 0,
            diff: null,
        };
    }
    const pathText = (0, memory_1.compactMemoryText)(item.path || item.file || item.name || item.filename || "", 260);
    if (!pathText)
        return null;
    const additions = Number(item.additions || item.diff?.additions || 0) || 0;
    const deletions = Number(item.deletions || item.diff?.deletions || 0) || 0;
    const project = (0, memory_1.compactMemoryText)(item.project || item.target_project || item.projectName || item.agent || fallback.project || "", 100);
    const agent = (0, memory_1.compactMemoryText)(item.agent || item.project || item.target_project || fallback.agent || project || "", 100);
    return {
        ...item,
        path: pathText,
        project,
        agent,
        status: item.status || item.status_kind || "changed",
        status_label: item.statusText || item.status_label || item.status || "变更",
        statusColor: item.statusColor || item.status_color || "#64748b",
        additions,
        deletions,
        diff: item.diff || (additions || deletions ? { additions, deletions, available: false } : null),
    };
}
function pushUserChangeFiles(target, value, fallback = {}) {
    const list = Array.isArray(value)
        ? value
        : value?.files && Array.isArray(value.files)
            ? value.files
            : [];
    for (const item of list) {
        const file = normalizeUserChangeFile(item, fallback);
        if (file)
            target.push(file);
    }
}
function userChangeFileKey(file) {
    return String(file?.path || "").trim().replace(/\\/g, "/").toLowerCase();
}
function isGenericChangeOwner(value) {
    const text = String(value || "").trim().toLowerCase();
    return !text || ["项目", "project", "agent", "default"].includes(text);
}
function pickChangeOwner(current, incoming) {
    const currentText = (0, memory_1.compactMemoryText)(current || "", 100);
    const incomingText = (0, memory_1.compactMemoryText)(incoming || "", 100);
    if (isGenericChangeOwner(currentText) && !isGenericChangeOwner(incomingText))
        return incomingText;
    return currentText || incomingText;
}
function mergeUserChangeFile(current, incoming) {
    return {
        ...current,
        ...incoming,
        path: current.path || incoming.path,
        project: pickChangeOwner(current.project, incoming.project),
        agent: pickChangeOwner(current.agent, incoming.agent || incoming.project),
        status: incoming.status || current.status,
        status_label: incoming.status_label || current.status_label,
        statusColor: incoming.statusColor || current.statusColor,
        additions: Math.max(Number(current.additions || 0), Number(incoming.additions || 0)),
        deletions: Math.max(Number(current.deletions || 0), Number(incoming.deletions || 0)),
        diff: incoming.diff || current.diff || null,
    };
}
function uniqueUserChangeFiles(rawFiles) {
    const byPath = new Map();
    for (const file of rawFiles) {
        const key = userChangeFileKey(file);
        if (!key)
            continue;
        const existing = byPath.get(key);
        byPath.set(key, existing ? mergeUserChangeFile(existing, file) : file);
    }
    return Array.from(byPath.values()).slice(0, 40);
}
// ===== merged from collaboration-task-card-part-02-part-01.ts =====
function buildUserChangeSummary(task, summary = {}, workers = [], workItems = []) {
    const fallbackProject = task?.target_project || task?.mission_target?.name || task?.mission_target?.project || "";
    const rawFiles = [];
    pushUserChangeFiles(rawFiles, summary.actual_file_changes, { project: fallbackProject });
    pushUserChangeFiles(rawFiles, summary.file_changes, { project: fallbackProject });
    pushUserChangeFiles(rawFiles, summary.files_changed, { project: fallbackProject });
    pushUserChangeFiles(rawFiles, task?.file_changes, { project: fallbackProject });
    pushUserChangeFiles(rawFiles, summary.delivery_report?.files, { project: fallbackProject });
    for (const item of workItems)
        pushUserChangeFiles(rawFiles, item.filesChanged || item.files_changed || item.files, { project: item.target || item.owner || fallbackProject, agent: item.owner || item.target || "" });
    for (const worker of workers)
        pushUserChangeFiles(rawFiles, worker.files_changed || worker.filesChanged || worker.files, { project: worker.agent || fallbackProject, agent: worker.agent || "" });
    const files = uniqueUserChangeFiles(rawFiles);
    if (!files.length)
        return null;
    const agentNames = (0, collaboration_1.uniqueStrings)(files.map(file => file.agent || file.project).filter(Boolean));
    const agents = agentNames.map((agent) => {
        const agentFiles = files.filter(file => (file.agent || file.project || "") === agent);
        return {
            agent,
            role: userAgentRole(agent),
            file_count: agentFiles.length,
            additions: agentFiles.reduce((sum, file) => sum + Number(file.additions || 0), 0),
            deletions: agentFiles.reduce((sum, file) => sum + Number(file.deletions || 0), 0),
            files: agentFiles.slice(0, 8),
        };
    });
    const additions = files.reduce((sum, file) => sum + Number(file.additions || 0), 0);
    const deletions = files.reduce((sum, file) => sum + Number(file.deletions || 0), 0);
    return {
        schema: "ccm-main-agent-change-summary-v1",
        title: "改动明细",
        status: hasStrongTaskAcceptanceEvidence(task, [], summary) ? "ready" : "tracking",
        status_label: `${files.length} 个文件`,
        headline: agentNames.length
            ? `${agentNames.length} 个子 Agent/项目产生了 ${files.length} 个文件改动。`
            : `本轮捕获到 ${files.length} 个文件改动。`,
        file_count: files.length,
        additions,
        deletions,
        files,
        agents,
        next_action: "可以点开查看具体文件 diff；原始执行记录仍在技术详情里。",
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
    };
}
function buildUserTaskActions(task, phase, executions) {
    const actions = [];
    const completed = String(task?.status || "") === "done" && hasStrongTaskAcceptanceEvidence(task, executions, task?.delivery_summary || {});
    const terminal = completed || String(task?.status || "") === "cancelled";
    if (task?.intake_state === "awaiting_confirmation") {
        actions.push({ id: "confirm_plan", label: "确认执行", kind: "confirm_plan", tone: "primary" });
        actions.push({ id: "revise_plan", label: "调整计划", kind: "revise_plan", tone: "warning" });
        actions.push({ id: "cancel", label: "取消任务", kind: "cancel", tone: "danger" });
        return actions;
    }
    if (task?.workflow_type === "requirement_epic" && task?.status === "awaiting_change_review") {
        actions.push({ id: "changes", label: "查看整批改动", kind: "view_changes", tone: "outline" });
        actions.push({ id: "approve_epic", label: "批准 Epic 交付", kind: "approve_epic", tone: "primary" });
        actions.push({ id: "targeted_rework", label: "退回子任务返工", kind: "targeted_rework", tone: "warning", requirement_epic: true });
        return actions;
    }
    if (task?.delivery_summary || task?.file_changes)
        actions.push({ id: "changes", label: "查看改动", kind: "view_changes", tone: "outline" });
    if (completed)
        actions.push({ id: "continue", label: "继续修改", kind: "continue", tone: "primary" });
    else if (!terminal)
        actions.push({ id: "supplement", label: "追加要求", kind: "continue", tone: "primary" });
    if (["failed", "blocked"].includes(String(task?.status || "")) || phase === "blocked")
        actions.push({ id: "retry", label: "重新执行", kind: "retry", tone: "warning" });
    const checkpointIds = executions.flatMap((item) => Array.isArray(item.checkpointIds) ? item.checkpointIds : []).filter(Boolean);
    if (completed && checkpointIds.length)
        actions.push({ id: "rollback", label: "安全撤销", kind: "rollback", tone: "danger", checkpoint_ids: checkpointIds });
    if (!terminal)
        actions.push({ id: "cancel", label: "停止", kind: "cancel", tone: "danger" });
    return actions;
}
function getTaskWorkItems(task, executions = []) {
    return (0, work_items_1.buildMainAgentWorkItems)(task, { executions: executions.length ? executions : (0, execution_kernel_1.listExecutions)({ taskId: task?.id || "" }) });
}
function stableTaskEntityId(prefix, value) {
    return `${prefix}_${crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, 20)}`;
}
function groupSessionIdForTask(task) {
    return String(task?.group_session_id || task?.groupSessionId || "default");
}
function buildTaskEntityChain(taskId) {
    const task = (0, db_1.loadTasks)().find((item) => item.id === taskId);
    if (!task)
        return null;
    const messages = task.group_id
        ? (0, storage_1.getGroupMessages)(task.group_id, groupSessionIdForTask(task)).filter((message) => String(message?.task_id || message?.task?.id || "") === taskId)
        : [];
    const messageEntities = messages.map((message, index) => ({
        id: String(message.id || stableTaskEntityId("message", { taskId, index, timestamp: message.timestamp, content: message.content })),
        task_id: taskId,
        group_id: task.group_id || "",
        role: message.role || "",
        agent: message.agent || message.target || "",
        type: message.type || "message",
        timestamp: message.timestamp || "",
        summary: (0, memory_1.compactMemoryText)(message.content, 240),
    }));
    const summary = task.delivery_summary || {};
    const rawAssignments = [
        ...(Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : []),
        ...messages.flatMap((message) => Array.isArray(message.assignments) ? message.assignments : []),
    ];
    const assignments = (0, dispatch_records_1.normalizeDispatchBatch)(rawAssignments, { scopeId: task.group_id || taskId, taskId, sourceProject: "coordinator" });
    const receiptRows = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
        ...(task.receipt ? [task.receipt] : []),
    ];
    const receiptEntities = receiptRows.map((receipt) => ({
        id: stableTaskEntityId("receipt", { taskId, agent: receipt.agent || receipt.project, status: receipt.status, summary: receipt.summary, files: receipt.filesChanged || receipt.files_changed || [] }),
        task_id: taskId,
        agent: receipt.agent || receipt.project || task.target_project || "",
        status: receipt.status || "unknown",
        summary: (0, memory_1.compactMemoryText)(receipt.summary || receipt.message, 500),
        files_changed: receipt.filesChanged || receipt.files_changed || receipt.files || [],
        verification: receipt.verification || receipt.tests || [],
        blockers: receipt.blockers || [],
        needs: receipt.needs || [],
    }));
    const dispatchEntities = assignments.map((assignment) => {
        const receipt = receiptRows.find((item) => String(item.agent || item.project || "").toLowerCase() === String(assignment.project || "").toLowerCase()) || null;
        return (0, dispatch_records_1.createDispatchRecord)({
            assignment,
            status: assignment.status === "done" ? "completed" : assignment.status || "pending",
            statusText: assignment.statusText,
            receipt,
            summary: receipt?.summary || assignment.reason || "",
            blockers: receipt?.blockers || [],
            needs: receipt?.needs || [],
        });
    });
    const executionEntities = (0, execution_kernel_1.listExecutions)({ taskId }).map((execution) => ({
        id: execution.id,
        task_id: execution.taskId,
        project: execution.project,
        state: execution.state,
        runtime: execution.runtime || execution.packet?.agentType || "",
        workspace: execution.workspace,
        process_ids: execution.processIds || [],
        green: execution.green,
        failure: execution.failure || null,
        updated_at: execution.updatedAt || "",
    }));
    const workItemEntities = (0, work_items_1.buildMainAgentWorkItems)(task, { executions: executionEntities });
    const sessionEntities = (0, agent_sessions_1.listTaskAgentSessions)({ taskId }).map((session) => ({
        id: session.id,
        task_id: session.taskId,
        group_id: session.groupId || "",
        project: session.project,
        executor: session.agentType,
        native_session_id: session.nativeSessionId || "",
        resume_mode: session.resumeMode,
        turn_count: session.turnCount,
        status: session.status,
        continuity: (0, agent_sessions_1.getTaskAgentSessionContinuity)(session),
    }));
    const trace = task.trace_id ? (0, reliability_ledger_1.getTrace)(task.trace_id) : null;
    const acceptance = summary.acceptance_gate || null;
    const acceptancePassed = hasStrongTaskAcceptanceEvidence(task, executionEntities, summary);
    const acceptanceEntity = acceptance ? {
        id: stableTaskEntityId("acceptance", { taskId, pass: summary.acceptance_gate_passed, checks: acceptance.checks || acceptance.items || acceptance }),
        task_id: taskId,
        pass: acceptancePassed,
        gate: acceptance,
        reviewed_at: summary.generated_at || task.updated_at || "",
    } : null;
    const reportContent = task.final_report || summary.user_report || task.result || "";
    const reportEntity = reportContent ? {
        id: stableTaskEntityId("report", { taskId, reportContent }),
        task_id: taskId,
        status: task.status,
        content: reportContent,
        generated_at: summary.generated_at || task.completed_at || task.updated_at || "",
    } : null;
    const checks = {
        task_has_trace: !!task.trace_id,
        messages_reference_task: messageEntities.every((message) => message.task_id === taskId),
        dispatches_reference_task: dispatchEntities.every((dispatch) => dispatch.identity.taskId === taskId),
        executions_reference_task: executionEntities.every((execution) => execution.task_id === taskId),
        sessions_reference_task: sessionEntities.every((session) => session.task_id === taskId),
        work_items_reference_task: workItemEntities.every((item) => item.taskId === taskId),
        completed_task_has_acceptance: task.status !== "done" || acceptanceEntity?.pass === true,
        completed_task_has_report: task.status !== "done" || !!reportEntity,
    };
    return {
        version: 1,
        task: { id: task.id, trace_id: task.trace_id || "", group_id: task.group_id || "", title: task.title, status: task.status, workflow_type: task.workflow_type || "general", collaboration_state: task.collaboration_state || null, created_at: task.created_at, updated_at: task.updated_at },
        messages: messageEntities,
        dispatches: dispatchEntities,
        work_items: workItemEntities,
        executions: executionEntities,
        sessions: sessionEntities,
        trace: trace ? { trace_id: trace.trace_id, created_at: trace.created_at, events: (trace.events || []).slice(-200) } : null,
        receipts: receiptEntities,
        acceptance: acceptanceEntity,
        report: reportEntity,
        links: {
            message_ids: messageEntities.map((item) => item.id),
            dispatch_ids: dispatchEntities.map((item) => item.identity.assignmentId),
            work_item_ids: workItemEntities.map((item) => item.id),
            execution_ids: executionEntities.map((item) => item.id),
            session_ids: sessionEntities.map((item) => item.id),
            receipt_ids: receiptEntities.map((item) => item.id),
            acceptance_id: acceptanceEntity?.id || "",
            report_id: reportEntity?.id || "",
        },
        consistency: { pass: Object.values(checks).every(Boolean), checks },
        generated_at: new Date().toISOString(),
    };
}
function buildTaskCardView(task, executions, sessions) {
    const summary = task?.delivery_summary || {};
    const planMode = task?.workflow_meta?.plan_mode || task?.workflow_meta?.intake?.plan_mode || task?.intake_draft || null;
    const phase = taskCardPhase(task, executions);
    const latestContinuation = task?.collaboration_state?.last_continuation || {};
    const waitingUserResolved = latestContinuation.resolves_waiting_user === true
        || latestContinuation.resolvesWaitingUser === true
        || /waiting[_-]?user[_-]?resolution/i.test(String(latestContinuation.source || task?.last_continue_source || ""));
    const deliveryAccepted = hasStrongTaskAcceptanceEvidence(task, executions, summary);
    const visible = shouldShowUserTaskCard(task, summary, executions);
    const hasPlanForPresentation = !!(planMode && ((Array.isArray(planMode.steps) && planMode.steps.length)
        || String(planMode.title || planMode.content || planMode.summary || planMode.next_step || "").trim()
        || (Array.isArray(planMode.clarification_questions) && planMode.clarification_questions.length)));
    const hasDeliveryForPresentation = Number(summary.assignment_count || 0) > 0
        || Number(summary.actual_file_change_count || 0) > 0
        || Number(summary.receipt_count || 0) > 0
        || (Array.isArray(executions) && executions.some((item) => ["running", "reviewing", "succeeded", "failed"].includes(String(item.state || ""))))
        || !!(summary.delivery_report?.files?.length || summary.delivery_report?.verification?.length || summary.acceptance_gate_passed === true);
    // 无计划也无交付证据时按 reply，避免简单业务误挂「任务交付完成」卡
    const presentation = !visible
        ? "reply"
        : hasDeliveryForPresentation
            ? "delivery"
            : hasPlanForPresentation
                ? "plan"
                : "reply";
    const phaseLabels = {
        planning: "正在分析",
        queued: "准备开始",
        dispatching: "正在安排工作",
        executing: "正在修改",
        reworking: "正在修复问题",
        reviewing: "正在运行测试",
        needs_user: "需要你确认",
        change_review: "等待你审阅",
        blocked: "正在恢复",
        completed: "已完成",
        cancelled: "已取消",
        reverted: "已安全撤销",
    };
    const progressByPhase = { planning: 10, queued: 20, dispatching: 30, executing: 55, reworking: 65, reviewing: 85, needs_user: 70, change_review: 95, blocked: 60, completed: 100, cancelled: 0, reverted: 100 };
    const terminalPhase = phase === "completed" || phase === "cancelled" || phase === "reverted";
    const gapItems = terminalPhase ? [] : (0, collaboration_1.getTaskGapItems)(task);
    const dashboardWorkers = getDashboardWorkerRows(task);
    const workItems = (0, work_items_1.buildMainAgentWorkItems)(task, { executions });
    const workItemSummary = (0, work_items_1.buildMainAgentWorkItemSummary)(workItems);
    const workItemClaimSummary = task?.work_item_runtime?.last_claim_summary || task?.work_item_claim_summary || null;
    const workItemUnlockSummary = task?.work_item_runtime?.last_unlock_summary || task?.work_item_unlock_summary || null;
    const completionReadinessSummary = buildUserCompletionReadinessSummary(task, summary, workItems, phase);
    const laneNames = (0, collaboration_1.uniqueStrings)([
        ...executions.map((item) => item.project),
        ...sessions.map((item) => item.project),
    ].filter(Boolean));
    const workers = [...dashboardWorkers];
    for (const name of laneNames) {
        if (workers.some((item) => item.agent === name))
            continue;
        const execution = [...executions].reverse().find((item) => item.project === name);
        const session = [...sessions].reverse().find((item) => item.project === name);
        workers.push({ agent: name, task: "", status: execution?.state === "succeeded" ? "done" : execution?.state === "failed" ? "failed" : session?.status === "open" ? "running" : "pending", summary: "", files_changed: [], verification: [], blockers: [] });
    }
    for (const item of workItems) {
        const agentName = item.owner || item.target;
        if (!agentName || workers.some((worker) => worker.agent === agentName))
            continue;
        workers.push({
            agent: agentName,
            task: item.subject,
            status: item.status === "completed" ? "done" : item.status,
            summary: item.evidence[0] || item.description || "",
            files_changed: item.filesChanged,
            verification: item.verification,
            blockers: item.blockers,
            work_item_id: item.id,
        });
    }
    if (waitingUserResolved && phase === "reworking") {
        for (const worker of workers) {
            if (!["blocked", "needs_user", "needs_info", "waiting_user"].includes(String(worker.status || "").toLowerCase()))
                continue;
            worker.status = "pending";
            worker.summary = "任务条件已收到，等待重新复核。";
            worker.blockers = [];
        }
    }
    const activeAgents = terminalPhase ? [] : (0, collaboration_1.uniqueStrings)([
        ...executions.filter(item => ["spawning", "ready", "prompt_accepted", "running", "reviewing"].includes(item.state)).map(item => item.project),
        ...workers.filter((item) => ["running", "in_progress", "pending", "partial", "blocked"].includes(String(item.status || ""))).map((item) => item.agent),
    ].filter(Boolean));
    const files = (0, collaboration_1.uniqueStrings)([
        ...(Array.isArray(summary.files_changed) ? summary.files_changed : []),
        ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item) => item?.path || item) : []),
    ].filter(Boolean));
    const verification = (0, collaboration_1.uniqueStrings)(Array.isArray(summary.verification_executed) ? summary.verification_executed : []);
    const workflowTimeline = buildUserWorkflowTimeline(task, summary, phase);
    const rawWorkflowEvents = Array.isArray(summary?.timeline) && summary.timeline.length
        ? summary.timeline
        : (Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []);
    const agentQuestions = buildUserAgentQuestionRows(summary);
    const conflictWarnings = buildUserConflictWarnings(summary);
    const workOrderPreview = buildUserWorkOrderPreview(task, summary, planMode);
    const executionStory = buildUserExecutionStory(task, summary, executions, phase, workOrderPreview);
    const acceptanceReview = buildUserAcceptanceReview(task, summary, executions, phase);
    const planAlignment = buildUserPlanAlignmentReview(task, summary, phase, planMode, workOrderPreview, acceptanceReview);
    const agentCoordination = (0, collaboration_coordination_ux_1.buildUserAgentCoordinationProtocol)(task, summary, executions, workOrderPreview, acceptanceReview);
    const agentProgressSummary = buildUserAgentProgressSummary(task, summary, workers, executions, sessions, workItems, phase);
    const changeSummary = buildUserChangeSummary(task, summary, workers, workItems);
    const receiptReworkSummary = (0, collaboration_coordination_ux_1.buildUserReceiptReworkSummary)(task, summary, agentCoordination);
    const runtimeKernel = summary.runtime_kernel || agentCoordination.runtime_kernel || (0, collaboration_coordination_ux_1.buildRuntimeKernelSnapshot)(task, summary);
    const recoverySummary = buildMainAgentRecoverySummary(task, phase, sessions, workItems, gapItems);
    const continuationStatus = buildUserContinuationStatus(task, phase);
    const liveTodoPlan = buildLiveMainAgentTodoPlan(task, phase, workers, executions, summary);
    const liveMainAgentDecision = buildLiveMainAgentDecisionForTask(task, phase, liveTodoPlan, summary);
    const completed = [];
    const completedWorkers = workers.filter((item) => item.status === "done");
    if (completedWorkers.length)
        completed.push(`${completedWorkers.length} 个项目已完成修改`);
    if (files.length)
        completed.push(`修改了 ${files.length} 个文件`);
    if (verification.length)
        completed.push(`${verification.length} 项检查已执行`);
    const blockers = (0, collaboration_1.uniqueStrings)([
        ...(task?.intake_state === "awaiting_confirmation" && planMode?.risk?.summary ? [planMode.risk.summary] : []),
        ...gapItems.map(taskCardGapLabel).filter(Boolean),
    ]).slice(0, 6);
    let nextAction = "正在理解你的需求";
    if (phase === "queued")
        nextAction = "即将开始修改";
    else if (phase === "executing")
        nextAction = "完成修改后会自动运行检查";
    else if (phase === "reworking")
        nextAction = waitingUserResolved ? "正在沿用原任务继续复核和验收" : "修复后会重新运行检查";
    else if (phase === "reviewing")
        nextAction = "检查通过后自动交付";
    else if (phase === "change_review")
        nextAction = "请审阅整批变更后批准交付，或退回指定子任务返工";
    else if (phase === "needs_user")
        nextAction = task?.intake_state === "awaiting_confirmation" ? "请确认执行前计划，确认后才会派发子 Agent" : "请补充卡片中列出的信息";
    else if (phase === "blocked")
        nextAction = "系统正在重试或切换执行器";
    else if (phase === "completed")
        nextAction = "可以查看改动、继续修改或安全撤销";
    else if (phase === "cancelled")
        nextAction = "任务已停止，不会继续执行";
    else if (phase === "reverted")
        nextAction = "最近一轮改动已恢复到任务开始前";
    const userHandoff = buildUserHandoffSummary(task, summary, phase, nextAction, blockers, acceptanceReview, planAlignment, changeSummary);
    const displayStream = (0, display_1.buildMainAgentDisplayStream)({
        surface: "group",
        mode: phase === "reworking" ? "followup" : "delegation",
        status: task?.status || phase,
        phase,
        userText: summary.headline || task?.status_detail || nextAction,
        goal: task?.business_goal || task?.goal || task?.title || "",
        actionIds: liveMainAgentDecision?.decision?.selected_actions || [],
        steps: liveTodoPlan?.steps || [],
        permissions: liveMainAgentDecision?.permissions || [],
        observations: liveMainAgentDecision?.observation || {},
        traceId: task?.trace_id || "",
        technical: { execution_ids: executions.map(item => item.id), session_ids: sessions.map(item => item.id), failed_gates: summary.failed_gates || [], blockers, recovery_summary: recoverySummary },
        workers: workItems.length ? workItems.map((item) => ({ agent: item.owner || item.target, status: item.status, summary: item.evidence?.[0] || item.description, files_changed: item.filesChanged || [], verification: item.verification || [], blockers: item.blockers || [] })) : workers,
        executions,
        summary,
        rawEvents: rawWorkflowEvents,
        taskId: task?.id || "",
    });
    const progressCheckpoints = displayStream.progress_checkpoints || displayStream.workchain?.progress_checkpoints || null;
    return {
        version: 1,
        visible: visible && presentation !== "reply",
        presentation,
        task_id: task?.id || "",
        title: task?.title || "开发任务",
        goal: task?.business_goal || task?.goal || task?.title || "",
        phase,
        phase_label: waitingUserResolved && phase === "reworking" ? "正在继续" : phaseLabels[phase] || phase,
        status: task?.status || "pending",
        progress: progressByPhase[phase] ?? 0,
        active_agents: activeAgents.map((name) => `${userAgentRole(name)} · ${name} 正在处理`),
        agents: workers.map((item) => ({ name: `${userAgentRole(item.agent)} · ${item.agent}`, status: item.status, summary: userAgentProgress(item), blockers: item.blockers.slice(0, 3) })),
        live_todo_plan: liveTodoPlan,
        work_items: workItems,
        work_item_summary: workItemSummary,
        work_item_claim_summary: workItemClaimSummary,
        workItemClaimSummary,
        work_item_unlock_summary: workItemUnlockSummary,
        workItemUnlockSummary,
        completion_readiness_summary: completionReadinessSummary,
        completionReadinessSummary,
        display_stream: displayStream,
        displayStream,
        progress_checkpoints: progressCheckpoints,
        progressCheckpoints,
        mainAgentDecision: liveMainAgentDecision,
        main_agent_decision: liveMainAgentDecision,
        workflow_timeline: workflowTimeline,
        agent_questions: agentQuestions,
        conflict_warnings: conflictWarnings,
        work_order_preview: workOrderPreview,
        execution_story: executionStory,
        acceptance_review: acceptanceReview,
        plan_alignment: planAlignment,
        planAlignment,
        agent_coordination: agentCoordination,
        agentCoordination,
        agent_progress_summary: agentProgressSummary,
        agentProgressSummary,
        change_summary: changeSummary,
        changeSummary,
        receipt_rework_summary: receiptReworkSummary,
        receiptReworkSummary,
        user_handoff: userHandoff,
        userHandoff,
        runtime_kernel: runtimeKernel,
        runtimeKernel,
        recovery_summary: recoverySummary,
        recoverySummary,
        continuation_status: continuationStatus,
        continuationStatus,
        requirement_epic: task?.workflow_type === "requirement_epic" ? {
            schema: task?.decomposition_plan?.schema || task?.requirement_decomposition?.schema || "ccm-requirement-decomposition-v1",
            content_hash: task?.requirement_content_hash || task?.decomposition_plan?.content_hash || "",
            version: Number(task?.requirement_version || task?.decomposition_plan?.version || 1),
            title: task?.decomposition_plan?.epic_title || task?.title || "需求 Epic",
            items: Array.isArray(task?.decomposition_plan?.items)
                ? task.decomposition_plan.items.slice(0, 50).map((item) => ({
                    item_key: item.item_key,
                    title: (0, memory_1.compactMemoryText)(item.title || item.business_goal || "子任务", 120),
                    target_type: item.target_type || "auto",
                    target_id: item.target_id || "",
                    depends_on: Array.isArray(item.depends_on) ? item.depends_on.slice(0, 20) : [],
                    acceptance_criteria: Array.isArray(item.acceptance_criteria) ? item.acceptance_criteria.slice(0, 8) : [],
                    parallelizable: item.parallelizable !== false,
                }))
                : [],
            child_task_ids: Array.isArray(task?.child_task_ids) ? task.child_task_ids : [],
            summary: task?.mission_summary || null,
        } : null,
        plan_mode: planMode ? {
            title: planMode.title || "执行前计划",
            mode: planMode.mode || "",
            requires_confirmation: planMode.requires_confirmation === true,
            auto_continue: planMode.auto_continue === true,
            confirmation_status: planMode.confirmation_status || "",
            accepted_at: planMode.accepted_at || planMode.confirmed_at || "",
            accepted_feedback: (0, memory_1.compactMemoryText)(planMode.accepted_feedback || planMode.last_accept_feedback || "", 520),
            next_step: planMode.next_step || "",
            steps: Array.isArray(planMode.steps) ? planMode.steps.slice(0, 8).map((item, index) => ({
                id: item?.id || `plan-step-${index + 1}`,
                label: (0, memory_1.compactMemoryText)(item?.label || item?.content || item?.message || item || `计划步骤 ${index + 1}`, 180),
                content: (0, memory_1.compactMemoryText)(item?.content || item?.label || item?.message || item || `计划步骤 ${index + 1}`, 180),
                detail: (0, memory_1.compactMemoryText)(item?.detail || item?.reason || item?.evidence || "", 220),
                activeForm: (0, memory_1.compactMemoryText)(item?.activeForm || item?.active_form || item?.label || item?.content || "", 180),
                status: item?.status || "pending",
                source: item?.source || "",
            })) : [],
            steps_hidden_count: Array.isArray(planMode.steps) ? Math.max(0, planMode.steps.length - 8) : 0,
            risk: planMode.risk ? { level: planMode.risk.level || "low", summary: planMode.risk.summary || "", reasons: Array.isArray(planMode.risk.reasons) ? planMode.risk.reasons.slice(0, 6) : [] } : null,
            impact_scope: planMode.impact_scope ? { areas: Array.isArray(planMode.impact_scope.areas) ? planMode.impact_scope.areas.slice(0, 6) : [], projects: Array.isArray(planMode.impact_scope.projects) ? planMode.impact_scope.projects.slice(0, 8) : [], multi_agent: planMode.impact_scope.multi_agent === true } : null,
            read_only_exploration: planMode.read_only_exploration ? { summary: (0, memory_1.compactMemoryText)(planMode.read_only_exploration.summary || "", 520), projects: Array.isArray(planMode.read_only_exploration.projects) ? planMode.read_only_exploration.projects.slice(0, 8) : [], knowledge_used: planMode.read_only_exploration.knowledge_used === true, code_snapshot_used: planMode.read_only_exploration.code_snapshot_used === true } : null,
            acceptance: Array.isArray(planMode.acceptance) ? planMode.acceptance.slice(0, 6) : [],
            clarification_questions: Array.isArray(planMode.clarification_questions) ? planMode.clarification_questions.slice(0, 5).map((item) => ({
                id: item.id || "",
                question: (0, memory_1.compactMemoryText)(item.question || "", 220),
                reason: (0, memory_1.compactMemoryText)(item.reason || "", 220),
                examples: Array.isArray(item.examples) ? item.examples.slice(0, 3) : [],
                status: item.status || "open",
                answer: (0, memory_1.compactMemoryText)(item.answer || "", 220),
            })) : [],
            needs_clarification: planMode.needs_clarification === true,
            permission_boundaries: Array.isArray(planMode.permission_boundaries) ? planMode.permission_boundaries.slice(0, 6) : [],
            session_strategy: planMode.session_strategy || null,
            revision: planMode.revision_status || planMode.last_revision_feedback ? {
                status: planMode.revision_status || "revision_requested",
                count: Number(planMode.revision_count || 0),
                feedback: (0, memory_1.compactMemoryText)(planMode.last_revision_feedback || "", 420),
                revised_at: planMode.revised_at || "",
                next_step: planMode.next_step || "请重新确认调整后的执行前计划。",
            } : null,
        } : null,
        completed: completed.slice(0, 6),
        blockers,
        next_action: nextAction,
        delivery_report: summary.delivery_report || null,
        deliveryReport: summary.delivery_report || null,
        post_review_spot_check_summary: summary.post_review_spot_check_summary || summary.delivery_report?.post_review_spot_check_summary || null,
        postReviewSpotCheckSummary: summary.post_review_spot_check_summary || summary.delivery_report?.postReviewSpotCheckSummary || null,
        completion_card: summary.delivery_report?.completion_card || summary.completion_card || null,
        completionCard: summary.delivery_report?.completion_card || summary.completionCard || null,
        pickup_summary: summary.delivery_report?.pickup_summary || summary.pickup_summary || null,
        pickupSummary: summary.delivery_report?.pickup_summary || summary.pickupSummary || null,
        delivery: { headline: summary.headline || task?.status_detail || "", files: files.slice(0, 30), changes: Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.slice(0, 30) : [], verification: verification.slice(0, 20), risks: (0, collaboration_1.uniqueStrings)([...(summary.risks || []), ...(summary.remaining_items || []), ...(summary.advisory_needs || [])]).slice(0, 10), acceptance_passed: deliveryAccepted },
        actions: buildUserTaskActions(task, phase, executions),
        technical: { trace_id: task?.trace_id || "", execution_ids: executions.map(item => item.id), session_ids: sessions.map(item => item.id), source_ingestion: task?.source_ingestion || task?.sourceIngestion || null, requirement_extraction: task?.requirement_extraction || task?.requirementExtraction || null, work_item_ids: workItems.map((item) => item.id), work_item_summary: workItemSummary, work_item_claim_summary: workItemClaimSummary, work_item_unlock_summary: workItemUnlockSummary, completion_readiness_summary: completionReadinessSummary, recovery_summary: recoverySummary, continuation_state: task?.collaboration_state?.last_continuation || null, receipt_rework_summary: receiptReworkSummary, agent_progress_summary: agentProgressSummary, change_summary: changeSummary, plan_alignment: planAlignment, user_handoff: userHandoff, post_review_spot_check: summary.post_review_spot_check || null, gap_fingerprint: terminalPhase ? "" : (0, collaboration_1.getTaskGapFingerprint)(task), entity_chain_endpoint: `/api/tasks/entity-chain?id=${encodeURIComponent(task?.id || "")}`, mainAgentDecision: liveMainAgentDecision, main_agent_decision: liveMainAgentDecision, runtime_kernel: runtimeKernel, display_stream: displayStream },
        updated_at: task?.updated_at || new Date().toISOString(),
    };
}
function normalizeContinuationKind(kind) {
    const value = String(kind || "").trim();
    return ["supplement", "revise_goal", "new_task"].includes(value) ? value : "supplement";
}
function buildContinuationUserDecision(input = {}) {
    const source = String(input.source || "").trim();
    const kind = normalizeContinuationKind(input.kind || input.continuation_kind || input.continuationKind);
    const meta = input.meta || input.continuation || {};
    const reworkKind = String(meta.rework_kind || meta.reworkKind || "").trim();
    const target = (0, memory_1.compactMemoryText)(meta.target || meta.agent || meta.project || input.target || "", 80);
    const reason = (0, memory_1.compactMemoryText)(meta.reason || meta.detail || meta.title || meta.label || input.reason || "", 180);
    const resolvesWaitingUser = meta.resolves_waiting_user === true
        || meta.resolvesWaitingUser === true
        || input.resolve_waiting_user === true
        || input.resolveWaitingUser === true
        || /waiting[_-]?user[_-]?resolution/i.test(source);
    const isNextWorkItem = reworkKind === "next_claimable_work_item" || /next_work_item|user_next_work_item/i.test(`${source} ${reworkKind}`);
    const isQualityFollowup = /quality[_-]?followup/i.test(`${source} ${reworkKind}`);
    const isTargeted = isNextWorkItem || /targeted|gap_rework|rework|ack_rewrite|missing_|contract_|weak_receipt/i.test(`${source} ${reworkKind}`);
    const replanRequired = kind === "revise_goal" || meta.replan_required === true || input.replan_required === true;
    const interruptCurrentRun = replanRequired && (meta.interrupt_current_run === true || meta.interruptCurrentRun === true || input.interrupt_current_run === true || input.interruptCurrentRun === true);
    const deferred = input.deferred === true || String(input.status || "") === "deferred";
    const strategy = isNextWorkItem
        ? "continue_next_work_item"
        : isQualityFollowup
            ? "complete_quality_followup"
            : isTargeted
                ? "targeted_rework"
                : replanRequired
                    ? "replan_same_task"
                    : "continue_same_task";
    const kindLabel = {
        supplement: resolvesWaitingUser ? "任务条件" : "补充要求",
        revise_goal: "目标调整",
        new_task: "独立新任务",
    };
    const routeLabel = deferred
        ? interruptCurrentRun
            ? "先停止当前轮再重核计划"
            : "本轮结束后接续"
        : replanRequired
            ? "先重核计划再继续"
            : isNextWorkItem
                ? "继续派发已解锁工作项"
                : isQualityFollowup
                    ? "补齐交付总结"
                    : isTargeted
                        ? "定向返工"
                        : "并入同一任务";
    const title = resolvesWaitingUser
        ? "任务条件已补充"
        : isNextWorkItem
            ? "下一步派发已接上"
            : isQualityFollowup
                ? "交付总结补齐已接上"
                : isTargeted
                    ? "精准返工已接上"
                    : replanRequired
                        ? "目标调整已接收"
                        : "补充要求已接收";
    const targetText = target ? `${target} 的` : "";
    const headline = resolvesWaitingUser
        ? "我已收到任务所需条件，会在同一任务里继续处理。"
        : isNextWorkItem
            ? `我已接收${targetText}已解锁工作项，只推进这一小步。`
            : isQualityFollowup
                ? "我已接上交付总结补齐，会补齐交付证据、验证结果和验收结论。"
                : isTargeted
                    ? `我已接收${targetText}返工缺口，会复用当前任务上下文继续处理。`
                    : replanRequired && interruptCurrentRun
                        ? "我已收到新的目标边界，会先停止可能跑偏的当前执行轮，再重新核对计划。"
                        : replanRequired
                            ? "我已收到新的目标边界，会先重新核对计划，再在同一任务里继续推进。"
                            : "我已收到你的补充要求，会在同一任务里继续处理。";
    const nextAction = deferred
        ? replanRequired && interruptCurrentRun
            ? "我正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。"
            : replanRequired
                ? "当前执行轮结束后，我会先重新核对目标、影响范围和验收条件，再决定是否继续派发或返工。"
                : "当前执行轮结束后，我会自动接着处理这条补充。"
        : replanRequired
            ? "我会复用原任务上下文重新核对计划，必要时重新派发执行成员，完成后重新验收并总结。"
            : isQualityFollowup
                ? "我会复用已有执行结果和复核证据，补齐最终总结缺口，完成后重新给你一份可验收总结。"
                : "我会复用原任务证据继续执行，完成后重新验收并总结。";
    const statusDetail = resolvesWaitingUser
        ? deferred
            ? "补充信息已收到，本轮结束后会沿用原任务继续复核和验收"
            : "补充信息已收到，正在沿用原任务继续复核和验收"
        : deferred
            ? replanRequired && interruptCurrentRun
                ? "已收到目标调整，正在停止当前执行轮并准备重核计划"
                : replanRequired
                    ? "已收到目标调整，本轮结束后会先重新核对计划再继续"
                    : "已收到追加要求，本轮结束后将在同一任务中继续"
            : replanRequired
                ? "已收到目标调整，等待我重新核对计划并继续执行"
                : isQualityFollowup
                    ? "已接上交付总结补齐，等待我补齐证据、验证和验收结论"
                    : "已收到补充说明，等待我继续执行";
    const steps = [
        {
            id: "capture",
            label: resolvesWaitingUser ? "已收到任务所需条件" : replanRequired ? "已记录新的目标边界" : isQualityFollowup ? "已记录总结补齐要求" : "已记录补充要求",
            detail: resolvesWaitingUser ? "用户补充已写入当前任务上下文，具体内容只保留在用户消息和执行上下文中。" : reason || "补充内容已写入当前任务上下文。",
        },
        {
            id: "preserve_context",
            label: "保留已有上下文",
            detail: "已完成的文件、验证和执行成员结果说明会继续作为判断依据。",
        },
        {
            id: replanRequired ? (interruptCurrentRun ? "interrupt_and_replan" : "replan") : deferred ? "defer" : "continue",
            label: replanRequired ? (interruptCurrentRun ? "停止当前轮并重核计划" : "重新核对计划") : deferred ? "等待当前轮结束" : isQualityFollowup ? "补齐交付总结" : "继续同一任务",
            detail: nextAction,
        },
    ];
    return {
        kind,
        kind_label: kindLabel[kind] || "补充要求",
        strategy,
        route_label: routeLabel,
        title,
        headline,
        reason,
        target,
        replan_required: replanRequired,
        interrupt_current_run: interruptCurrentRun,
        next_action: nextAction,
        status_detail: statusDetail,
        steps,
        timeline_type: resolvesWaitingUser ? "waiting_user_resolution" : replanRequired ? "task_goal_revision" : isNextWorkItem ? "next_work_item_dispatch" : isQualityFollowup ? "quality_followup_continuation" : isTargeted ? "targeted_rework" : "task_continuation",
        timeline_detail: resolvesWaitingUser ? "用户已补充任务所需条件，我将复用同一任务上下文继续处理。" : reason || (replanRequired ? "用户调整了目标边界，我将重新核对计划。" : "我已复用同一任务上下文继续处理。"),
    };
}
function buildUserContinuationStatus(task, phase = "") {
    const terminal = ["completed", "cancelled", "reverted"].includes(String(phase || ""))
        || ["done", "cancelled"].includes(String(task?.status || ""));
    if (terminal)
        return null;
    const last = task?.collaboration_state?.last_continuation || task?.last_continuation || null;
    if (!last?.at)
        return null;
    const source = String(last.source || task?.last_continue_source || "").trim();
    const kind = String(last.rework_kind || last.reworkKind || last.kind || "").trim();
    const target = (0, memory_1.compactMemoryText)(last.target || last.agent || last.project || "", 80);
    const reason = (0, memory_1.compactMemoryText)(last.reason || last.detail || "", 180);
    const titleText = (0, memory_1.compactMemoryText)(last.title || last.label || "", 120);
    const workItemId = (0, memory_1.compactMemoryText)(last.work_item_id || last.workItemId || "", 80);
    const status = String(task?.status || "") === "in_progress" && last.status === "deferred"
        ? "deferred"
        : String(task?.status || "") === "in_progress" && last.status === "interrupting"
            ? "interrupting"
            : ["pending", "queued"].includes(String(task?.status || "")) ? "queued"
                : phase === "reworking" ? "active" : String(last.status || "accepted");
    const statusLabel = {
        queued: "已入队",
        accepted: "已接收",
        active: "处理中",
        deferred: "本轮后继续",
        interrupting: "正在停止当前轮",
    };
    const detail = reason || titleText || (workItemId ? `工作项 ${workItemId}` : "");
    const decision = buildContinuationUserDecision({
        source,
        kind: last.kind,
        meta: { ...last, reason: detail },
        status,
        deferred: status === "deferred" || status === "interrupting",
    });
    return {
        schema: "ccm-main-agent-continuation-status-v1",
        title: decision.title,
        status,
        status_label: statusLabel[status] || "已接收",
        headline: decision.headline,
        kind: decision.kind,
        kind_label: decision.kind_label,
        strategy: decision.strategy,
        route_label: decision.route_label,
        replan_required: decision.replan_required,
        interrupt_current_run: decision.interrupt_current_run,
        target,
        reason: detail,
        handoff_steps: decision.steps,
        next_action: decision.next_action,
        at: last.at,
        technical: { source, kind, work_item_id: workItemId },
    };
}
function shouldResumeAfterGoalRevisionInterruption(task, executionFollowupRevision = 0) {
    if (!task?.id)
        return false;
    const state = task.collaboration_state || {};
    const interruption = state.goal_revision_interruption || {};
    const pending = Array.isArray(task.pending_followups) ? task.pending_followups : [];
    const hasGoalRevision = pending.some((item) => item?.kind === "revise_goal" || item?.continuation?.replan_required === true);
    return interruption.requested === true
        && hasGoalRevision
        && Number(task.followup_revision || 0) > Number(executionFollowupRevision || 0);
}
function buildGoalRevisionInterruptedStatus(pending = []) {
    const count = Math.max(1, pending.filter((item) => item?.status !== "accepted").length);
    const hasGoalRevision = pending.some((item) => item?.kind === "revise_goal" || item?.continuation?.replan_required === true);
    return hasGoalRevision
        ? "已按目标调整停止当前执行轮；我会重新核对计划并继续"
        : `已接收 ${count} 条追加要求，继续使用当前任务上下文`;
}
function shouldShowUserTaskCard(task, summary = {}, executions = []) {
    const explicit = task?.workflow_meta?.intake?.task_intent || task?.workflowMeta?.intake?.task_intent;
    if (explicit?.executable === false)
        return false;
    if (explicit?.executable === true)
        return true;
    const hasWorkEvidence = Number(summary.assignment_count || 0) > 0
        || Number(summary.actual_file_change_count || 0) > 0
        || Number(summary.worker_notification_count || 0) > 0
        || Number(summary.receipt_count || 0) > 0
        || (Array.isArray(summary.receipts) && summary.receipts.length > 0)
        || (Array.isArray(summary.receipt_statuses) && summary.receipt_statuses.length > 0)
        || (Array.isArray(executions) && executions.length > 0 && executions.some((item) => ["running", "reviewing", "succeeded", "failed"].includes(String(item.state || ""))));
    if (hasWorkEvidence)
        return true;
    return false;
}
function timelineStatusForUser(item) {
    const status = String(item?.status || "").toLowerCase();
    if (["ok", "done", "success", "succeeded", "completed"].includes(status))
        return "done";
    if (["fail", "failed", "error"].includes(status))
        return "failed";
    if (["warn", "warning", "blocked"].includes(status))
        return "warning";
    if (["active", "running", "in_progress"].includes(status))
        return "active";
    return "pending";
}
function timelineLabelForUser(item) {
    const type = String(item?.type || "");
    const agent = item?.agent ? `${item.agent}：` : "";
    const title = String(item?.title || "").trim();
    if (type === "queued_group_task")
        return "我已接收任务";
    if (type === "coordinator_plan")
        return "我已制定协作计划";
    if (type === "reasoning_plan" || type === "reasoning_preflight")
        return "我已复核目标";
    if (type === "sandbox_rehearsal")
        return "已完成任务前预演";
    if (type === "conflict_plan")
        return "已预判潜在修改冲突";
    if (type === "global_mission_handoff_ready")
        return "我已补齐子任务交接";
    if (type === "worker_handoff_ready")
        return `${agent}工作单已补齐`;
    if (type === "global_mission_plan")
        return "我已制定跨项目计划";
    if (type === "dispatch")
        return "已派发给执行成员";
    if (type === "direct_task")
        return "已派发给项目执行成员";
    if (type === "child_agent_start")
        return `${agent}开始处理`;
    if (type === "child_agent_rework")
        return `${agent}开始返工`;
    if (type === "child_agent_failed")
        return `${agent}执行遇到问题`;
    if (type === "child_agent_receipt")
        return `${agent}提交结果`;
    if (type === "agent_qa_question")
        return `${agent}向其他执行成员确认问题`;
    if (type === "agent_qa_waiting")
        return `${agent}等待依赖回答`;
    if (type === "agent_qa_accepted")
        return "我已采纳协作回答";
    if (type === "agent_qa_resume")
        return `${agent}拿到回答并继续执行`;
    if (type === "plan_mode_confirmed")
        return "执行前计划已确认";
    if (type === "plan_mode_revision_requested")
        return "执行前计划已按反馈调整";
    if (type === "next_work_item_dispatch")
        return "我已接上下一步派发";
    if (type === "targeted_rework")
        return "我已接上精准返工";
    if (type === "auto_gap_rework")
        return "我已按缺口继续";
    if (type === "waiting_user_resolution")
        return "任务条件已补充";
    if (type === "task_continuation")
        return "我已收到补充要求";
    if (type === "coordinator_review")
        return "我正在验收";
    if (type === "acceptance_gate")
        return "已检查交付质量";
    if (type === "reasoning_recovery_check" || type === "startup_manual_recovery")
        return "我已接上恢复任务";
    if (type === "native_session_retry")
        return `${agent}恢复会话继续执行`;
    if (type === "runtime_fallback" || type === "runtime_switch")
        return agent ? `${agent}切换执行通道` : "执行通道已切换";
    if (type === "permission_drift")
        return agent ? `${agent}权限状态已校正` : "权限状态已校正";
    if (type === "runtime_debt_cleanup")
        return "运行通道已清理";
    if (type === "task_rollback")
        return "已安全撤销改动";
    if (type === "global_supervisor_cycle")
        return "我已检查子任务";
    if (type === "global_supervisor_rework")
        return "我已安排返工";
    if (type === "global_supervisor_waiting_user")
        return "等待你处理阻塞";
    if (type === "global_supervisor_completed")
        return "全局任务已通过交付验收";
    if (type === "global_direct_dispatch_continuation_synced")
        return "全局会话已同步接续状态";
    if (type === "global_direct_dispatch_completion_synced")
        return "全局会话已同步最终总结";
    if (type === "global_direct_dispatch_rollback_synced")
        return "全局会话已同步撤销结果";
    if (type === "global_agent.supervising")
        return "全局任务已进入持续跟踪";
    if (type === "global_agent.run_completed")
        return "我已完成总结";
    return title || "协作状态更新";
}
function buildUserWorkflowTimeline(task, summary, phase) {
    const timeline = Array.isArray(summary?.timeline) && summary.timeline.length
        ? summary.timeline
        : (Array.isArray(task?.workflow_timeline) ? task.workflow_timeline : []);
    const visible = timeline
        .filter((item) => !/CCM_AGENT_RECEIPT|scratchpad|Trace|session|原始提示词/i.test(`${item?.title || ""}\n${item?.detail || ""}`))
        .map((item) => ({
        id: item.id || `${item.at || ""}:${item.type || ""}:${item.title || ""}`,
        at: item.at || "",
        label: timelineLabelForUser(item),
        detail: (0, memory_1.compactMemoryText)(item.detail || "", 140),
        agent: item.agent || "",
        status: timelineStatusForUser(item),
        phase: item.phase || "",
    }))
        .filter((item) => item.label)
        .slice(-8);
    if (visible.length)
        return visible;
    const fallback = [
        { id: "understand", label: "主 Agent 正在理解需求", status: ["planning", "queued", "dispatching", "executing", "reviewing", "completed"].includes(phase) ? "done" : "active" },
        { id: "dispatch", label: "安排合适的项目 Agent", status: ["dispatching", "executing", "reviewing", "completed"].includes(phase) ? "done" : phase === "planning" ? "pending" : "active" },
        { id: "execute", label: "子 Agent 修改并验证", status: ["reviewing", "completed"].includes(phase) ? "done" : phase === "executing" ? "active" : "pending" },
        { id: "review", label: "主 Agent 验收交付", status: phase === "completed" ? "done" : phase === "reviewing" ? "active" : "pending" },
    ];
    return fallback;
}
function buildUserAgentQuestionRows(summary) {
    const items = Array.isArray(summary?.agent_qa) ? summary.agent_qa : [];
    return items.slice(-6).map((item) => {
        const accepted = item.acceptance?.accepted === true || item.status === "resumed" || item.resumed_at;
        const waiting = ["waiting", "asking", "queued", "timeout", "manual"].includes(String(item.status || ""));
        const preview = (0, agent_qa_service_1.buildAgentQaUserPreview)(item, accepted ? "resume" : item.answer ? "answer" : "question");
        return {
            id: item.id || `${item.from_agent || ""}:${item.to_agent || ""}:${item.question || ""}`,
            schema: preview.schema,
            from: preview.from || item.from_agent || "子 Agent",
            to: preview.to || item.to_agent || "目标 Agent",
            summary: preview.summary,
            question: preview.question || sanitizeUserAgentProgressText(item.question || "", "问题原文已收进技术详情。", 160),
            answer: preview.answer || (item.answer ? sanitizeUserAgentProgressText(item.answer || "", "回答详情已收进技术详情。", 160) : ""),
            status: accepted ? "accepted" : waiting ? "waiting" : item.status || "answered",
            label: preview.label || (accepted ? "已采纳并继续" : waiting ? "等待回答" : item.answer ? "已回答" : "已记录"),
            next_action: preview.next_action,
            badges: preview.badges || [],
            display_policy: preview.display_policy,
        };
    });
}
function buildUserConflictWarnings(summary) {
    const timeline = Array.isArray(summary?.timeline) ? summary.timeline : [];
    const plans = timeline.filter((item) => item.type === "conflict_plan" && item.data);
    return plans.flatMap((item) => {
        const conflicts = Array.isArray(item.data?.conflicts) ? item.data.conflicts : [];
        if (!conflicts.length && item.detail)
            return [{ id: item.id || "conflict", title: "已启用冲突保护", detail: (0, memory_1.compactMemoryText)(item.detail, 160), agents: [] }];
        return conflicts.map((conflict, index) => ({
            id: `${item.id || "conflict"}:${index}`,
            title: `${(conflict.projects || []).join(" 与 ") || "多个 Agent"} 可能修改同一范围`,
            detail: (0, memory_1.compactMemoryText)(conflict.reason || "系统已改为更安全的执行顺序", 160),
            agents: conflict.projects || [],
            scopes: conflict.scopes || [],
        }));
    }).slice(-4);
}
function splitUserAcceptanceText(value) {
    if (Array.isArray(value))
        return value.map((item) => (0, memory_1.compactMemoryText)(item, 160)).filter(Boolean);
    return String(value || "")
        .split(/(?:\n|；|;|。|\d+[、.]\s*)+/)
        .map(item => (0, memory_1.compactMemoryText)(item, 160))
        .filter(Boolean)
        .slice(0, 8);
}
function getTaskPlanMode(task) {
    return require("./collaboration-task-intake").getTaskPlanMode(task);
}
// ===== merged from collaboration-task-card-part-02-part-02.ts =====
function buildUserWorkOrderPreview(task, summary = {}, planMode = null) {
    const plan = planMode || getTaskPlanMode(task);
    const assignmentEvidence = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const sandboxPlan = Array.isArray(task?.sandbox_rehearsal?.agent_plan)
        ? task.sandbox_rehearsal.agent_plan
        : Array.isArray(task?.workflow_meta?.sandbox_rehearsal?.agent_plan)
            ? task.workflow_meta.sandbox_rehearsal.agent_plan
            : [];
    const planProjects = Array.isArray(plan?.impact_scope?.projects) ? plan.impact_scope.projects : [];
    const fallbackProjects = (0, collaboration_1.uniqueStrings)([
        ...planProjects,
        task?.target_project,
    ].filter(Boolean)).slice(0, 6);
    const sourceRows = assignmentEvidence.length
        ? assignmentEvidence
        : sandboxPlan.length
            ? sandboxPlan
            : fallbackProjects.map((project) => ({ project, task: task?.title || task?.business_goal || "等待主 Agent 细化工作单", reason: "来自执行前计划影响范围" }));
    const acceptance = splitUserAcceptanceText(plan?.acceptance || task?.acceptance_criteria || task?.acceptanceCriteria);
    const areas = Array.isArray(plan?.impact_scope?.areas) ? plan.impact_scope.areas : [];
    const fileHints = Array.isArray(plan?.impact_scope?.file_hints) ? plan.impact_scope.file_hints : [];
    const boundaries = Array.isArray(plan?.permission_boundaries) ? plan.permission_boundaries : [];
    const orders = sourceRows.map((item, index) => {
        const project = String(item.project || item.agent || item.target_project || item.targetName || `Agent ${index + 1}`).trim();
        const objective = (0, memory_1.compactMemoryText)(item.task || item.summary || item.description || task?.business_goal || task?.title || "等待主 Agent 细化工作单", 220);
        const projectRole = userAgentRole(project);
        return {
            id: item.assignment_id || item.id || `work_order_${index + 1}_${stableTaskEntityId("agent", project).slice(-8)}`,
            order: index + 1,
            project,
            role: projectRole,
            title: `${projectRole} · ${project}`,
            objective,
            reason: (0, memory_1.compactMemoryText)(item.reason || plan?.risk?.summary || "主 Agent 根据只读探索和影响范围分派", 180),
            depends_on: Array.isArray(item.dependsOn || item.depends_on) ? (item.dependsOn || item.depends_on).slice(0, 6) : (item.dependsOn || item.depends_on ? [item.dependsOn || item.depends_on] : []),
            allowed_scope: (0, collaboration_1.uniqueStrings)([
                project ? `仅在 ${project} 项目职责范围内修改` : "",
                ...areas,
                ...fileHints,
            ].filter(Boolean)).slice(0, 8),
            forbidden_scope: (0, collaboration_1.uniqueStrings)([
                "不要修改无关模块或用户已有改动",
                "不要编造未执行的验证结果",
                ...boundaries.filter((line) => /不得|禁止|等待|只能|边界|确认|删除|部署|迁移|生产/i.test(String(line || ""))),
            ].filter(Boolean)).slice(0, 8),
            acceptance: acceptance.length ? acceptance.slice(0, 6) : [
                "返回结构化结果说明",
                (0, collaboration_1.taskRequiresCodeChanges)(task) ? "提供真实文件变更" : "说明无需代码变更的依据",
                (0, collaboration_1.taskRequiresVerification)(task) ? "提供已执行验证记录" : "说明检查依据",
            ],
            status: item.status || (summary.assignment_count ? "dispatched" : task?.intake_state === "awaiting_confirmation" ? "waiting_confirmation" : "planned"),
        };
    }).slice(0, 8);
    return {
        title: summary.assignment_count ? "子 Agent 工作单" : "准备派发的工作单",
        source: assignmentEvidence.length ? "dispatch_evidence" : sandboxPlan.length ? "sandbox_rehearsal" : "plan_mode_preview",
        ready: orders.length > 0,
        requires_confirmation: task?.intake_state === "awaiting_confirmation" || plan?.requires_confirmation === true,
        summary: orders.length
            ? `主 Agent 准备让 ${orders.length} 个子 Agent 按边界执行；每个 Agent 必须回传文件、验证和阻塞情况。`
            : "主 Agent 还没有形成可展示的子 Agent 工作单。",
        orders,
    };
}
function executionStoryStatus(conditionDone, conditionActive, phase) {
    if (conditionDone)
        return "done";
    if (conditionActive)
        return "active";
    if (["blocked", "needs_user"].includes(phase))
        return "warning";
    if (phase === "cancelled" || phase === "reverted")
        return "failed";
    return "pending";
}
function buildUserExecutionStory(task, summary = {}, executions = [], phase = "planning", workOrderPreview = null) {
    const files = Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes : [];
    const verification = Array.isArray(summary.verification_executed) ? summary.verification_executed : [];
    const acceptancePassed = hasStrongTaskAcceptanceEvidence(task, executions, summary);
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    const qaRows = Array.isArray(summary.agent_qa) ? summary.agent_qa : [];
    const runningExecutions = executions.filter((item) => ["spawning", "ready", "prompt_accepted", "running"].includes(String(item.state || "")));
    const reviewingExecutions = executions.filter((item) => String(item.state || "") === "reviewing");
    const failedExecutions = executions.filter((item) => String(item.state || "") === "failed");
    const steps = [
        {
            id: "read_context",
            label: "读取项目和上下文",
            detail: task?.workflow_meta?.plan_mode || task?.intake_draft ? "已完成只读探索，形成执行边界" : "读取群聊上下文、项目记忆和必要代码快照",
            status: executionStoryStatus(!!(task?.workflow_meta?.plan_mode || task?.intake_draft || summary.coordination_plan_count), phase === "planning", phase),
            evidence: (0, memory_1.compactMemoryText)((task?.workflow_meta?.plan_mode || task?.intake_draft)?.read_only_exploration?.summary || "", 180),
        },
        {
            id: "prepare_work_orders",
            label: "准备子 Agent 工作单",
            detail: workOrderPreview?.orders?.length ? `${workOrderPreview.orders.length} 个工作单已形成` : "等待主 Agent 细化派发范围",
            status: executionStoryStatus(!!workOrderPreview?.orders?.length, phase === "dispatching", phase),
            evidence: workOrderPreview?.orders?.map((item) => item.project).join("、") || "",
        },
        {
            id: "dispatch_agents",
            label: "派发给子 Agent",
            detail: Number(summary.assignment_count || 0) > 0 ? `已派发 ${summary.assignment_count} 条` : "确认后才会派发",
            status: executionStoryStatus(Number(summary.assignment_count || 0) > 0, ["queued", "dispatching"].includes(phase), phase),
            evidence: receipts.length ? `${receipts.length} 条结果说明/状态` : "",
        },
        {
            id: "edit_files",
            label: "修改文件",
            detail: files.length ? `已捕获 ${files.length} 个文件改动` : runningExecutions.length ? `${runningExecutions.length} 个 Agent 正在修改` : "等待实际文件改动",
            status: executionStoryStatus(files.length > 0, runningExecutions.length > 0 || phase === "executing", phase),
            evidence: files.slice(0, 4).map((item) => item.path || item).join("、"),
        },
        {
            id: "run_checks",
            label: "运行验证",
            detail: verification.length ? `已执行 ${verification.length} 项检查` : reviewingExecutions.length ? "正在验收/检查" : "等待验证结果",
            status: executionStoryStatus(verification.length > 0, reviewingExecutions.length > 0 || phase === "reviewing", phase),
            evidence: verification.slice(0, 3).join("；"),
        },
        {
            id: "resolve_dependencies",
            label: "处理依赖/返工",
            detail: qaRows.length ? `Agent 问答 ${qaRows.length} 条` : failedExecutions.length ? `${failedExecutions.length} 个执行失败，等待恢复` : "暂无开放依赖",
            status: failedExecutions.length ? "warning" : qaRows.some((item) => !item.answer && item.status !== "resumed") ? "active" : qaRows.length ? "done" : "pending",
            evidence: qaRows.slice(-2).map((item) => `${item.from_agent || "Agent"}→${item.to_agent || "Agent"}`).join("、"),
        },
        {
            id: "final_review",
            label: "主 Agent 验收",
            detail: acceptancePassed ? "验收通过，可以交付" : summary.acceptance_gate ? `仍有 ${summary.acceptance_gate.failed_count || 0} 个缺口` : "等待交付证据",
            status: acceptancePassed ? "done" : phase === "reviewing" ? "active" : summary.acceptance_gate?.failed_count ? "warning" : "pending",
            evidence: summary.acceptance_gate?.failed_checks?.slice?.(0, 3)?.map((item) => item.label).join("、") || "",
        },
    ];
    return {
        title: "执行过程",
        style: "codex-cursor-lite",
        current_step: steps.find((item) => item.status === "active")?.id || steps.find((item) => item.status === "warning")?.id || "",
        steps,
    };
}
function buildUserCompletionReadinessSummary(task, summary = {}, workItems = [], phase = "planning") {
    const teamShutdown = summary.team_shutdown || summary.teamShutdown || {};
    const unresolved = (workItems || []).filter((item) => String(item?.status || "") !== "completed");
    const openSessionCount = Number(teamShutdown.open_session_count || teamShutdown.openSessionCount || 0);
    const nearCompletion = ["reviewing", "needs_user", "blocked", "completed"].includes(String(phase || ""))
        || task?.status === "done"
        || teamShutdown.required === true;
    if (!nearCompletion || (!workItems.length && teamShutdown.required !== true))
        return null;
    const pass = unresolved.length === 0 && openSessionCount === 0;
    const rows = unresolved.slice(0, 8).map((item) => ({
        target: sanitizeUserAgentProgressText(item.target || item.owner || "执行成员", "执行成员", 80),
        subject: (0, memory_1.compactMemoryText)(item.subject || item.description || "未完成工作项", 180),
        status: String(item.status || "pending"),
        status_label: item.status === "in_progress" ? "执行中" : item.status === "blocked" ? "等待处理" : item.status === "failed" ? "需要修复" : "等待开始",
    }));
    return {
        schema: "ccm-main-agent-completion-readiness-v1",
        title: "完成前收尾",
        status: pass ? "ready" : "blocked",
        status_label: pass ? "可以总结" : "尚未收尾",
        headline: pass
            ? "执行队列和执行成员会话都已收尾，可以进入最终验收与总结。"
            : `还有 ${unresolved.length} 个工作项未完成${openSessionCount ? `，${openSessionCount} 个执行成员会话仍在处理` : ""}，我不会提前宣布完成。`,
        rows,
        open_session_count: openSessionCount,
        unresolved_work_item_count: unresolved.length,
        next_action: pass
            ? "继续核对验收证据并整理最终总结。"
            : unresolved.length
                ? "先完成或处理这些工作项；全部收敛后再做最终总结。"
                : "等待执行成员会话结束，再做最终验收和总结。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
        technical: {
            unresolved_work_item_ids: unresolved.map((item) => item.id).filter(Boolean),
            open_session_ids: Array.isArray(teamShutdown.open_sessions) ? teamShutdown.open_sessions.map((item) => item?.id).filter(Boolean) : [],
        },
    };
}
function sanitizeAcceptanceVisibleText(value, fallback = "验收检查已整理。", max = 220) {
    return (0, display_1.sanitizeMainAgentUserText)(value, fallback, max)
        .replace(/\bACK\b/g, "接单说明")
        .replace(/接单确认/g, "接单说明")
        .replace(/API\s*microcompact\s*edit\s*plan/gi, "上下文压缩计划")
        .replace(/API\s*microcompact/gi, "上下文压缩")
        .replace(/\bmicrocompact\b/gi, "上下文压缩")
        .replace(/native[_\s-]*applied/gi, "已实际应用")
        .replace(/\bnative\s*apply\b/gi, "实际应用")
        .replace(/\badvisory\b/gi, "参考使用")
        .replace(/\bignored\b/gi, "未使用")
        .replace(/\bused\b/gi, "已使用")
        .replace(/\bverified\b/gi, "已核对")
        .replace(/used\s*\/\s*ignored\s*\/\s*verified/gi, "已使用/未使用/已核对");
}
function normalizeUserAcceptanceCheck(item, context = {}) {
    const id = String(item?.id || "");
    const labels = {
        ack_gate: "接单说明完整",
        receipt_quality: "结果说明完整",
        memory_gate_receipt: "记忆使用声明",
        global_memory_health_gate_receipt: "全局记忆使用说明",
        read_plan_revalidation_gate_receipt: "读取计划已复核",
        post_compact_reinjection_gate_receipt: "压缩后上下文恢复声明",
        api_microcompact_receipt: "上下文压缩计划使用说明",
        actual_diff: "真实文件改动",
    };
    let detail = item?.detail || "";
    if (id === "ack_gate") {
        const rejectedCount = Number(context.summary?.ack_review?.rejected?.length || 0);
        detail = item.ok
            ? "执行成员的目标、范围和验证安排已确认"
            : rejectedCount
                ? `还有 ${rejectedCount} 个接单说明需要补齐目标、范围和验证安排`
                : "等待执行成员补齐接单说明";
    }
    else if (id === "receipt_quality") {
        const weakCount = Number(context.summary?.weak_receipt_quality?.length || 0);
        detail = item.ok
            ? "结果说明已包含完成内容、文件改动和验证证据"
            : weakCount
                ? `还有 ${weakCount} 条结果说明需要补齐改动、验证或阻塞信息`
                : "等待执行成员提交完整结果说明";
    }
    else if (id === "memory_gate_receipt") {
        const info = context.memoryGateSummary || {};
        detail = !info.required
            ? "本轮不需要额外记忆使用声明"
            : info.pass
                ? "执行成员已说明本轮群聊记忆使用情况"
                : `还有 ${Number(info.missing_count || info.missing_gate_ids?.length || 1)} 条记忆使用声明需要补齐`;
    }
    else if (id === "global_memory_health_gate_receipt") {
        const info = context.globalMemoryHealthGateSummary || {};
        detail = !info.required
            ? "本轮不需要额外全局记忆说明"
            : info.pass
                ? "执行成员已说明全局记忆使用风险和处理情况"
                : `还有 ${Number(info.missing_count || 1)} 条全局记忆使用说明需要补齐`;
    }
    else if (id === "read_plan_revalidation_gate_receipt") {
        const info = context.readPlanRevalidationGateSummary || {};
        detail = !info.required
            ? "本轮不需要额外读取计划复核"
            : info.pass
                ? "执行成员已重新核对读取计划和当前来源"
                : `还有 ${Number(info.missing_count || info.missing_gate_ids?.length || 1)} 条读取计划复核说明需要补齐`;
    }
    else if (id === "post_compact_reinjection_gate_receipt") {
        const info = context.reinjectionGateSummary || {};
        detail = !info.required
            ? "本轮不需要压缩后上下文恢复说明"
            : info.pass
                ? "执行成员已说明压缩后上下文如何恢复和使用"
                : `还有 ${Number(info.missing_count || info.missing_gate_ids?.length || 1)} 条压缩后上下文恢复声明需要补齐`;
    }
    else if (id === "api_microcompact_receipt") {
        const info = context.apiMicrocompactSummary || {};
        detail = !info.required
            ? "本轮不需要上下文压缩计划使用说明"
            : info.pass
                ? "执行成员已说明上下文压缩计划的使用状态"
                : info.status === "unsafe_native_applied"
                    ? `还有 ${Number(info.missing_count || info.unsafe_native_applied_plan_checksums?.length || 1)} 个上下文压缩计划的实际应用状态需要更正`
                    : `还有 ${Number(info.missing_count || info.missing_plan_checksums?.length || 1)} 个上下文压缩计划缺少使用状态`;
    }
    return {
        ...item,
        label: sanitizeAcceptanceVisibleText(labels[id] || item.label || "验收检查", "验收检查", 80),
        detail: sanitizeAcceptanceVisibleText(detail, "验收检查已整理。", 220),
    };
}
// ===== merged from collaboration-task-card-part-03-part-01.ts =====
function buildUserAcceptanceReview(task, summary = {}, executions = [], phase = "planning") {
    const gate = summary.acceptance_gate || {};
    const gateChecks = Array.isArray(gate.checks) ? gate.checks : [];
    const strongAcceptance = hasStrongTaskAcceptanceEvidence(task, executions, summary);
    const memoryGateSummary = (0, collaboration_memory_gates_1.buildMemoryGateVisibleSummary)(summary);
    const globalMemoryHealthGateSummary = (0, collaboration_memory_gates_1.buildGlobalMemoryHealthGateVisibleSummary)(summary);
    const readPlanRevalidationGateSummary = (0, collaboration_memory_gates_1.buildReadPlanRevalidationGateVisibleSummary)(summary);
    const reinjectionGateSummary = (0, collaboration_memory_gates_1.buildPostCompactReinjectionGateVisibleSummary)(summary);
    const apiMicrocompactSummary = (0, collaboration_memory_gates_1.buildApiMicrocompactReceiptVisibleSummary)(summary);
    const hasDoneReceipt = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
        task?.receipt,
    ].filter(Boolean).some((item) => String(item?.status || "") === "done");
    const actualChangeCount = Number(summary.actual_file_change_count || task?.file_changes?.count || 0);
    const verificationCount = Number(summary.verification_executed?.length || 0);
    const checkById = (id) => gateChecks.find((item) => item.id === id);
    const checks = [
        {
            id: "work_order",
            label: "派发工作单",
            ok: Number(summary.assignment_count || 0) > 0 || task?.assign_type !== "group",
            detail: Number(summary.assignment_count || 0) > 0 ? `已派发 ${summary.assignment_count} 条` : "还没有可验收的派发证据",
        },
        {
            id: "receipt",
            label: "执行成员结果说明",
            ok: hasDoneReceipt || task?.assign_type !== "group",
            detail: hasDoneReceipt ? "已有完成结果说明" : "缺少执行成员完成结果说明",
        },
        {
            id: "work_items",
            label: "执行队列收尾",
            ok: !summary.work_item_summary?.total || summary.work_item_summary?.all_completed === true,
            detail: summary.work_item_summary?.total
                ? summary.work_item_summary?.all_completed === true
                    ? `${summary.work_item_summary.total} 个工作项已全部完成`
                    : `还有 ${Number(summary.team_shutdown?.unresolved_work_item_count || 0)} 个工作项未完成`
                : "没有独立工作项需要收尾",
        },
        {
            id: "team_shutdown",
            label: "执行成员会话收尾",
            ok: summary.team_shutdown?.required !== true || summary.team_shutdown?.pass === true,
            detail: summary.team_shutdown?.required !== true
                ? "最终交付时再检查"
                : summary.team_shutdown?.pass === true
                    ? "所有执行成员会话已结束"
                    : `还有 ${Number(summary.team_shutdown?.open_session_count || 0)} 个执行成员会话未结束`,
        },
        {
            id: "ack_gate",
            label: "接单说明完整",
            ok: !((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) || summary.ack_gate_passed === true,
            detail: summary.ack_review?.rejected?.length ? `还有 ${summary.ack_review.rejected.length} 个接单说明需要补齐目标、范围和验证安排` : summary.ack_gate_passed === true ? "执行成员的目标、范围和验证安排已确认" : "等待执行成员补齐接单说明",
        },
        {
            id: "receipt_quality",
            label: "结果说明完整",
            ok: !((0, collaboration_1.taskRequiresCodeChanges)(task) || (0, collaboration_1.taskRequiresVerification)(task)) || summary.receipt_quality_gate_passed === true,
            detail: summary.weak_receipt_quality?.length ? `还有 ${summary.weak_receipt_quality.length} 条结果说明需要补齐改动、验证或阻塞信息` : summary.receipt_quality_gate_passed === true ? "结果说明已包含完成内容、文件改动和验证证据" : "等待执行成员提交完整结果说明",
        },
        {
            id: "memory_gate_receipt",
            label: "记忆使用声明",
            ok: !memoryGateSummary.required || memoryGateSummary.pass === true,
            detail: memoryGateSummary.summary,
        },
        {
            id: "global_memory_health_gate_receipt",
            label: "全局记忆使用说明",
            ok: !globalMemoryHealthGateSummary.required || globalMemoryHealthGateSummary.pass === true,
            detail: globalMemoryHealthGateSummary.summary,
        },
        {
            id: "read_plan_revalidation_gate_receipt",
            label: "读取计划重读声明",
            ok: !readPlanRevalidationGateSummary.required || readPlanRevalidationGateSummary.pass === true,
            detail: readPlanRevalidationGateSummary.summary,
        },
        {
            id: "post_compact_reinjection_gate_receipt",
            label: "压缩后上下文恢复声明",
            ok: !reinjectionGateSummary.required || reinjectionGateSummary.pass === true,
            detail: reinjectionGateSummary.summary,
        },
        {
            id: "api_microcompact_receipt",
            label: "上下文压缩计划使用说明",
            ok: !apiMicrocompactSummary.required || apiMicrocompactSummary.pass === true,
            detail: apiMicrocompactSummary.summary,
        },
        {
            id: "actual_diff",
            label: "真实文件改动",
            ok: !(0, collaboration_1.taskRequiresCodeChanges)(task) || actualChangeCount > 0,
            detail: (0, collaboration_1.taskRequiresCodeChanges)(task) ? `捕获 ${actualChangeCount} 个文件` : "该任务允许无代码变更",
        },
        {
            id: "verification",
            label: "已执行验证",
            ok: !(0, collaboration_1.taskRequiresVerification)(task) || verificationCount > 0,
            detail: (0, collaboration_1.taskRequiresVerification)(task) ? `已执行 ${verificationCount} 项` : "该任务不强制验证",
        },
        {
            id: "goal_coverage",
            label: "目标覆盖",
            ok: strongAcceptance,
            detail: strongAcceptance ? "我已确认目标覆盖" : "等待最终验收确认",
        },
        {
            id: "runner_source",
            label: "验证来源可信",
            ok: !(0, collaboration_1.taskRequiresVerification)(task) || summary.verification_source_gate_passed === true,
            detail: (0, collaboration_1.taskRequiresVerification)(task) ? `外部 Runner ${summary.external_runner_verification_count || 0} 条` : "不强制",
        },
        {
            id: "independent_review",
            label: "复杂变更独立复核",
            ok: summary.independent_review_required !== true || summary.independent_review_gate_passed === true,
            detail: summary.independent_review_gate?.user_detail
                || summary.independent_review_gate?.userDetail
                || (summary.independent_review_required
                    ? `复核 ${summary.independent_review_gate?.evidence_count || 0} 条；${summary.independent_review_gate?.reason || "已触发"}`
                    : (summary.independent_review_gate?.decision_detail
                        || summary.independent_review_gate?.reason
                        || "未触发：本次变更不强制独立复核")),
        },
    ].map(item => {
        const fromGate = checkById(item.id) || checkById(item.id === "actual_diff" ? "actual_changes" : item.id);
        const merged = fromGate ? {
            ...item,
            ok: item.id === "goal_coverage" ? strongAcceptance : fromGate.ok === true,
            detail: ["work_items", "team_shutdown"].includes(item.id) ? item.detail : fromGate.detail || item.detail,
            technical: { raw_label: fromGate.label || "", raw_detail: fromGate.detail || "" },
        } : item;
        return normalizeUserAcceptanceCheck(merged, {
            summary,
            memoryGateSummary,
            globalMemoryHealthGateSummary,
            readPlanRevalidationGateSummary,
            reinjectionGateSummary,
            apiMicrocompactSummary,
        });
    });
    const failed = checks.filter(item => !item.ok);
    const pass = failed.length === 0 && strongAcceptance;
    return {
        title: "最终验收",
        pass,
        status: pass ? "passed" : phase === "reviewing" ? "reviewing" : failed.length ? "needs_rework" : "pending",
        headline: pass
            ? "证据齐全，允许交付"
            : failed.length
                ? `还缺 ${failed.length} 项证据，不能宣布完成`
                : "等待执行成员提交交付证据",
        checks,
        missing: failed.map(item => item.label).slice(0, 8),
        next_action: pass ? "可以交付最终报告" : "继续返工或补齐缺失证据后再验收",
        technical: {
            raw_gate_checks: gateChecks.slice(0, 20),
        },
    };
}
function planAlignmentEvidenceLabels(summary = {}, task = {}) {
    const files = [
        ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item) => item?.path || item) : []),
        ...(Array.isArray(summary.file_changes) ? summary.file_changes.map((item) => item?.path || item) : []),
        ...(Array.isArray(task?.file_changes?.files) ? task.file_changes.files.map((item) => item?.path || item) : []),
    ].filter(Boolean);
    const verification = Array.isArray(summary.verification_executed) ? summary.verification_executed : [];
    const receiptCandidates = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    const seenReceiptAgents = new Set();
    const receipts = receiptCandidates.filter((receipt) => {
        const agent = String(receipt?.agent || receipt?.project || "").trim().toLowerCase();
        if (!agent)
            return true;
        if (seenReceiptAgents.has(agent))
            return false;
        seenReceiptAgents.add(agent);
        return true;
    });
    const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    return {
        files: (0, collaboration_1.uniqueStrings)(files).slice(0, 8),
        verification: (0, collaboration_1.uniqueStrings)(verification).slice(0, 8),
        receipts,
        assignments,
    };
}
function planCriterionStatus(criterion, summary = {}, task = {}, acceptanceReview = null) {
    const text = String(criterion || "");
    const evidence = planAlignmentEvidenceLabels(summary, task);
    const acceptancePassed = acceptanceReview?.pass === true || hasStrongTaskAcceptanceEvidence(task, [], summary);
    if (/文件|改动|diff|代码|修改|变更/i.test(text)) {
        const ok = !(0, collaboration_1.taskRequiresCodeChanges)(task) || evidence.files.length > 0;
        return { ok, evidence: evidence.files.slice(0, 3), detail: ok ? `已捕获 ${evidence.files.length} 个文件改动` : "还没有捕获真实文件改动" };
    }
    if (/验证|测试|检查|test|check|lint|build/i.test(text)) {
        const ok = !(0, collaboration_1.taskRequiresVerification)(task) || evidence.verification.length > 0;
        return { ok, evidence: evidence.verification.slice(0, 3), detail: ok ? `已执行 ${evidence.verification.length} 项验证` : "还没有系统捕获的验证记录" };
    }
    if (/回执|agent|子\s*Agent|工作单|派发|协作/i.test(text)) {
        const doneReceipts = evidence.receipts.filter((item) => String(item?.status || "") === "done");
        const ok = doneReceipts.length > 0 || evidence.assignments.length > 0;
        return { ok, evidence: doneReceipts.slice(0, 2).map((item) => item.summary || item.agent || item.project).filter(Boolean), detail: ok ? `已收集 ${doneReceipts.length || evidence.assignments.length} 条协作证据` : "还没有可核对的执行成员证据" };
    }
    return {
        ok: acceptancePassed,
        evidence: acceptancePassed ? [summary.headline || "已通过最终验收"].filter(Boolean) : [],
        detail: acceptancePassed ? "我已在最终验收中覆盖该计划项" : "等待最终验收确认该计划项",
    };
}
function buildUserPlanAlignmentReview(task, summary = {}, phase = "planning", planMode = null, workOrderPreview = null, acceptanceReview = null) {
    const plan = planMode || getTaskPlanMode(task);
    const hasPlan = !!plan || Array.isArray(task?.workflow_meta?.plan_acceptance);
    if (!hasPlan)
        return null;
    const planAcceptance = splitUserAcceptanceText(plan?.acceptance || task?.workflow_meta?.plan_acceptance || task?.acceptance_criteria || task?.acceptanceCriteria);
    const workOrderAcceptance = Array.isArray(workOrderPreview?.orders)
        ? workOrderPreview.orders.flatMap((order) => Array.isArray(order.acceptance) ? order.acceptance : [])
        : [];
    const criteria = (0, collaboration_1.uniqueStrings)([
        ...planAcceptance,
        ...workOrderAcceptance,
    ]).slice(0, 8);
    const evidence = planAlignmentEvidenceLabels(summary, task);
    const planConfirmed = task?.intake_state !== "awaiting_confirmation" && plan?.requires_confirmation !== true || summary.assignment_count || task?.status === "done";
    const checks = [
        {
            id: "plan_confirmed",
            label: "计划已进入执行",
            ok: !!planConfirmed,
            detail: planConfirmed ? "已按确认后的计划进入执行链路" : "仍在等待你确认或调整计划",
            evidence: plan?.revision_status ? [`已按反馈调整：${(0, memory_1.compactMemoryText)(plan.last_revision_feedback || "", 120)}`].filter(Boolean) : [],
        },
        {
            id: "work_orders",
            label: "工作单按计划派发",
            ok: !Array.isArray(workOrderPreview?.orders) || !workOrderPreview.orders.length || Number(summary.assignment_count || 0) > 0 || task?.assign_type !== "group",
            detail: Number(summary.assignment_count || 0) > 0 ? `已派发 ${summary.assignment_count} 条工作单` : workOrderPreview?.orders?.length ? "工作单已准备，等待派发证据" : "该任务未拆成执行成员工作单",
            evidence: Array.isArray(workOrderPreview?.orders) ? workOrderPreview.orders.map((item) => item.project).filter(Boolean).slice(0, 4) : [],
        },
        ...criteria.map((criterion, index) => {
            const status = planCriterionStatus(criterion, summary, task, acceptanceReview);
            return {
                id: `criterion_${index + 1}`,
                label: (0, memory_1.compactMemoryText)(criterion, 90),
                ok: status.ok,
                detail: status.detail,
                evidence: status.evidence,
            };
        }),
    ];
    if (!criteria.length) {
        checks.push({
            id: "code_changes",
            label: (0, collaboration_1.taskRequiresCodeChanges)(task) ? "计划要求代码改动" : "计划允许无代码改动",
            ok: !(0, collaboration_1.taskRequiresCodeChanges)(task) || evidence.files.length > 0,
            detail: (0, collaboration_1.taskRequiresCodeChanges)(task) ? `捕获 ${evidence.files.length} 个文件改动` : "无需强制代码改动",
            evidence: evidence.files.slice(0, 3),
        }, {
            id: "verification",
            label: (0, collaboration_1.taskRequiresVerification)(task) ? "计划要求验证" : "计划允许说明性验证",
            ok: !(0, collaboration_1.taskRequiresVerification)(task) || evidence.verification.length > 0,
            detail: (0, collaboration_1.taskRequiresVerification)(task) ? `已执行 ${evidence.verification.length} 项验证` : "无需强制验证命令",
            evidence: evidence.verification.slice(0, 3),
        });
    }
    const failed = checks.filter(item => !item.ok);
    const terminal = ["completed", "cancelled", "reverted"].includes(String(phase || ""))
        || ["cancelled"].includes(String(task?.status || ""))
        || (String(task?.status || "") === "done" && hasStrongTaskAcceptanceEvidence(task, [], summary));
    const status = !failed.length && terminal ? "aligned" : failed.length && terminal ? "deviated" : failed.length ? "needs_evidence" : "tracking";
    return {
        schema: "ccm-main-agent-plan-alignment-v1",
        title: "计划执行核对",
        status,
        status_label: status === "aligned" ? "已对齐" : status === "deviated" ? "有偏离" : status === "needs_evidence" ? `${failed.length} 项待补` : "核对中",
        headline: status === "aligned"
            ? "我已把执行结果和原计划逐项核对，当前没有发现计划偏离。"
            : failed.length
                ? `我已发现 ${failed.length} 个计划项还缺证据或存在偏离，不会把它们藏在技术详情里。`
                : "我正在按原计划收集执行证据。",
        checks: checks.slice(0, 10),
        deviations: failed.map(item => ({ id: item.id, label: item.label, reason: item.detail })).slice(0, 8),
        next_action: failed.length ? "优先补齐这些计划项，再进入最终交付总结。" : terminal ? "可以查看最终总结和改动明细。" : "继续执行并更新计划核对结果。",
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
    };
}
function buildUserHandoffSummary(task, summary = {}, phase = "planning", nextAction = "", blockers = [], acceptanceReview = null, planAlignment = null, changeSummary = null) {
    const normalizedPhase = String(phase || "").toLowerCase();
    const strongAcceptance = hasStrongTaskAcceptanceEvidence(task, [], summary);
    const taskStatus = String(task?.status || "").toLowerCase();
    const terminal = ["failed", "cancelled", "canceled", "reverted"].includes(normalizedPhase)
        || (normalizedPhase === "completed" && strongAcceptance)
        || ["failed", "cancelled"].includes(taskStatus)
        || (taskStatus === "done" && strongAcceptance);
    const needsUser = normalizedPhase === "needs_user";
    const blocked = normalizedPhase === "blocked";
    const failed = normalizedPhase === "failed" || String(task?.status || "").toLowerCase() === "failed";
    if (!terminal && !needsUser && !blocked)
        return null;
    const fileCount = Number(changeSummary?.file_count || changeSummary?.fileCount || summary.actual_file_change_count || 0);
    const verificationCount = Number(Array.isArray(summary.verification_executed) ? summary.verification_executed.length : 0);
    const deliveryReport = summary.delivery_report || {};
    const planProblems = Array.isArray(planAlignment?.deviations) ? planAlignment.deviations : [];
    const acceptanceMissing = Array.isArray(acceptanceReview?.missing) ? acceptanceReview.missing : [];
    const handoffText = (item) => {
        if (!item || typeof item !== "object")
            return String(item || "").trim();
        return (0, memory_1.compactMemoryText)(item.label || item.reason || item.summary || item.detail || item.message || item.title || item.path || item.id || "", 220);
    };
    const riskItems = (0, collaboration_1.uniqueStrings)([
        ...blockers.map(handoffText),
        ...(Array.isArray(summary.risks) ? summary.risks.map(handoffText) : []),
        ...(Array.isArray(summary.remaining_items) ? summary.remaining_items.map(handoffText) : []),
        ...(Array.isArray(summary.blocking_needs) ? summary.blocking_needs.map(handoffText) : []),
        ...acceptanceMissing.map(handoffText),
        ...planProblems.map((item) => handoffText(item.reason || item.label)).filter(Boolean),
    ]).slice(0, 8);
    const evidence = (0, collaboration_1.uniqueStrings)([
        fileCount ? `改动：${fileCount} 个文件` : "",
        verificationCount ? `验证：${verificationCount} 项已执行` : "",
        acceptanceReview?.pass === true ? "最终验收：通过" : acceptanceMissing.length ? `最终验收：还缺 ${acceptanceMissing.length} 项` : "",
        planAlignment?.status === "aligned" ? "计划核对：已对齐" : planProblems.length ? `计划核对：${planProblems.length} 项待补` : "",
        deliveryReport?.headline || summary.headline || "",
    ]).slice(0, 6);
    const actions = [];
    const addAction = (id, label, detail = "", kind = "", tone = "outline") => {
        if (actions.some(item => item.id === id))
            return;
        actions.push({ id, label, detail: (0, memory_1.compactMemoryText)(detail || label, 180), kind: kind || id, tone });
    };
    if (needsUser)
        addAction("provide_input", task?.intake_state === "awaiting_confirmation" ? "确认执行计划" : "补充所需信息", riskItems[0] || nextAction || "我正在等待你的确认。", task?.intake_state === "awaiting_confirmation" ? "confirm_plan" : "continue", "primary");
    if (failed || blocked || riskItems.length)
        addAction("continue_rework", failed ? "重新执行或继续修复" : "继续处理缺口", riskItems[0] || nextAction || "我会复用已有证据继续处理。", failed ? "retry" : "gap_continue", failed ? "primary" : "warning");
    if (fileCount > 0)
        addAction("view_changes", "查看改动", changeSummary?.headline || `已捕获 ${fileCount} 个文件改动。`, "view_changes", terminal && !riskItems.length ? "primary" : "outline");
    if (deliveryReport?.schema || summary.delivery_report)
        addAction("review_delivery", "核对交付总结", "查看完成内容、验证结果和风险提示。", "review_delivery", fileCount ? "outline" : "primary");
    if (terminal && !riskItems.length)
        addAction("continue_request", "继续提出新要求", "如果结果符合预期，可以直接继续补充下一步需求。", "continue", actions.length ? "outline" : "primary");
    if (!actions.length)
        addAction("next_action", "继续跟进", nextAction || "我会继续处理并更新结果。", "continue", "primary");
    const status = needsUser ? "needs_user" : failed ? "failed" : blocked || riskItems.length ? "needs_attention" : normalizedPhase === "cancelled" || normalizedPhase === "canceled" ? "cancelled" : normalizedPhase === "reverted" ? "reverted" : "ready";
    const summaryCards = [
        {
            id: "completed",
            label: failed ? "处理结果" : status === "cancelled" ? "停止说明" : "完成内容",
            value: (0, memory_1.compactMemoryText)(deliveryReport?.headline || summary.headline || (fileCount ? `已整理 ${fileCount} 个文件改动` : status === "ready" ? "任务结果已整理，等待你核对。" : "当前状态已整理。"), 180),
            tone: failed ? "warning" : status === "ready" ? "ok" : "neutral",
        },
        {
            id: "verification",
            label: "验证状态",
            value: verificationCount
                ? `已执行 ${verificationCount} 项验证`
                : acceptanceReview?.pass === true
                    ? "最终验收通过"
                    : "等待补齐验证证据",
            tone: verificationCount || acceptanceReview?.pass === true ? "ok" : "warning",
        },
        {
            id: "attention",
            label: "待关注",
            value: riskItems.length ? `${riskItems.length} 项待补齐` : "暂无需要额外关注的风险",
            tone: riskItems.length ? "warning" : "ok",
        },
        {
            id: "next",
            label: "下一步",
            value: (0, memory_1.compactMemoryText)(actions[0]?.detail || actions[0]?.label || nextAction || "可以继续提出新要求。", 180),
            tone: status === "ready" ? "ok" : "action",
        },
    ];
    return {
        schema: "ccm-main-agent-user-handoff-v1",
        title: "接下来建议",
        status,
        status_label: status === "ready" ? "可验收" : status === "needs_user" ? "等你确认" : status === "failed" ? "未完成" : status === "cancelled" ? "已停止" : status === "reverted" ? "已撤销" : "待补齐",
        headline: status === "ready"
            ? "这轮任务已经收尾，建议先核对交付总结和改动明细。"
            : status === "needs_user"
                ? "我已停在需要你决定的位置，不会擅自继续。"
                : status === "failed"
                    ? "这轮任务没有完整完成，我已整理可以继续推进的入口。"
                    : status === "cancelled"
                        ? "任务已经停止；需要继续时可以重新发起或恢复需求。"
                        : status === "reverted"
                            ? "最近一轮改动已撤销；继续前建议重新确认当前代码状态。"
                            : "还有缺口待补齐，我会按证据继续收敛。",
        primary_action: actions[0],
        secondary_actions: actions.slice(1, 4),
        summary_cards: summaryCards,
        evidence,
        unresolved: riskItems,
        next_action: actions[0]?.detail || nextAction,
        technical_hint: "底层记录、Trace、会话和执行器细节仍在技术详情里。",
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    };
}
// ===== merged from collaboration-task-card-part-03-part-02.ts =====
function buildLiveMainAgentTodoPlan(task, phase, workers, executions, summary = {}) {
    const assignmentCount = Number(summary.assignment_count || (Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence.length : 0) || 0);
    const receiptCount = Number(summary.receipt_count || (Array.isArray(summary.receipts) ? summary.receipts.length : 0) || (Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses.length : 0) || 0);
    const workerNotificationCount = Number(summary.worker_notification_count || (Array.isArray(summary.worker_notifications) ? summary.worker_notifications.length : 0) || 0);
    const hasDispatchEvidence = assignmentCount > 0 || workerNotificationCount > 0 || workers.length > 0 || executions.length > 0;
    const terminal = ["completed", "cancelled", "reverted"].includes(phase);
    const recoveryVisible = hasTaskRecoveryEvidence(task);
    const failed = task?.status === "failed" || phase === "blocked" || workers.some((item) => ["failed", "blocked", "partial", "needs_info"].includes(String(item.status || "")));
    const reworking = phase === "reworking" || executions.some((item) => /rework|retry|recover/i.test(String(item.state || item.phase || "")));
    const allWorkersDone = workers.length > 0 && workers.every((item) => ["done", "completed", "succeeded"].includes(String(item.status || "")));
    const activeWorkers = (0, collaboration_1.uniqueStrings)(workers
        .filter((item) => ["running", "in_progress", "pending", "partial", "blocked", "reviewing"].includes(String(item.status || "")))
        .map((item) => item.agent)
        .filter(Boolean));
    const verificationCount = Number((Array.isArray(summary.verification_executed) ? summary.verification_executed.length : 0) || 0);
    const acceptancePassed = hasStrongTaskAcceptanceEvidence(task, executions, summary);
    const steps = [];
    // content/activeForm 传空串时回退到 PLAN_STEP_LIBRARY 的统一文案；仅带任务实时信息时才写字面量。
    const add = (id, content, status, activeForm = "", detail = "") => {
        const normalizedStatus = normalizeLiveTodoStatus(status);
        const text = (0, main_agent_plan_core_1.planStepText)(id, { content, activeForm });
        steps.push(buildUserVisiblePlanStep({
            id,
            content: text.content,
            status: normalizedStatus,
            activeForm: text.activeForm,
            detail,
            evidence: buildTodoStepEvidence({ task, summary, workers, executions, stepId: id, phase }),
            actions: buildTodoStepActions({ task, stepId: id, status: normalizedStatus, phase, summary }),
        }));
    };
    add("understand_intent", "", "completed", "", task?.business_goal || task?.title || "");
    add("read_group_context", "", "completed");
    if (recoveryVisible)
        add("restore_task_context", task?.recovery_pending === true ? "恢复上次任务上下文，等待确认继续" : "", task?.recovery_pending === true ? "needs_confirmation" : "completed", "", task?.recovery?.previous_status ? `上次状态：${task.recovery.previous_status}` : "");
    add("create_project_task", "", task?.id ? "completed" : "pending", "", task?.id ? `任务 ${task.id}` : "");
    let dispatchStatus = "pending";
    if (["cancelled", "reverted"].includes(phase))
        dispatchStatus = "cancelled";
    else if (hasDispatchEvidence || ["dispatching", "executing", "reviewing", "reworking", "completed"].includes(phase))
        dispatchStatus = "completed";
    else if (["queued", "planning"].includes(phase))
        dispatchStatus = "in_progress";
    add("dispatch_child_agent", hasDispatchEvidence ? `派发给 ${Math.max(assignmentCount, workers.length, executions.length, 1)} 个执行成员或执行通道` : "", dispatchStatus);
    // 执行前计划中的模型步骤和用户追加步骤随任务阶段贯穿到执行期，用户批准的计划就是执行中展示的计划。
    for (const spec of (0, main_agent_plan_core_1.buildPlanModeWorkStepSpecs)(task, phase)) {
        add(spec.id, spec.content, spec.status, spec.activeForm, spec.detail);
    }
    let workerStatus = "pending";
    if (["cancelled", "reverted"].includes(phase))
        workerStatus = "cancelled";
    else if (failed)
        workerStatus = "failed";
    else if (reworking)
        workerStatus = "reworking";
    else if (allWorkersDone || (receiptCount > 0 && ["reviewing", "completed"].includes(phase)))
        workerStatus = "completed";
    else if (activeWorkers.length || phase === "executing")
        workerStatus = "in_progress";
    add("child_agent_execution", activeWorkers.length ? `${activeWorkers.join("、")} 正在执行` : workers.length ? "" : "等待执行成员开始执行", workerStatus, "", workers.map((item) => `${item.agent}:${item.status || "pending"}`).join("；"));
    let receiptStatus = "pending";
    if (["cancelled", "reverted"].includes(phase))
        receiptStatus = "cancelled";
    else if (failed)
        receiptStatus = "needs_confirmation";
    else if (receiptCount > 0 && (allWorkersDone || ["reviewing", "completed"].includes(phase)))
        receiptStatus = "completed";
    else if (hasDispatchEvidence)
        receiptStatus = "in_progress";
    add("read_child_agent_receipts", receiptCount > 0 ? `读取 ${receiptCount} 条执行成员结果说明` : "", receiptStatus);
    let reviewStatus = "pending";
    if (["cancelled", "reverted"].includes(phase))
        reviewStatus = "cancelled";
    else if (failed)
        reviewStatus = reworking ? "reworking" : "needs_confirmation";
    else if (phase === "reviewing")
        reviewStatus = "reviewing";
    else if (phase === "completed")
        reviewStatus = "completed";
    else if (receiptCount > 0 || allWorkersDone)
        reviewStatus = "reviewing";
    add("coordinator_review", verificationCount > 0 ? `最终验收并检查 ${verificationCount} 项验证` : "", reviewStatus, "", acceptancePassed ? "验收已通过" : "");
    let finalStatus = "pending";
    if (phase === "completed")
        finalStatus = "completed";
    else if (["cancelled", "reverted"].includes(phase))
        finalStatus = "cancelled";
    else if (task?.status === "failed")
        finalStatus = "failed";
    add("final_delivery_report", phase === "completed" ? "" : "等待验收完成后生成交付报告", finalStatus, "", summary.headline || task?.status_detail || "");
    const verificationReminder = buildMainAgentPlanVerificationReminder({
        mode: "delegation",
        phase,
        steps,
        summary,
        task,
        verified: acceptancePassed,
    });
    return {
        title: "我正在这样处理",
        source: "ccm-live-task-todo",
        schema: "cc-style-todo-v2",
        display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true },
        phase,
        task_id: task?.id || "",
        updated_at: task?.updated_at || new Date().toISOString(),
        verification_nudge: Boolean(verificationReminder),
        verification_reminder: verificationReminder,
        steps,
    };
}
function buildLiveMainAgentDecisionForTask(task, phase, liveTodoPlan, summary = {}) {
    const steps = Array.isArray(liveTodoPlan?.steps) ? liveTodoPlan.steps : [];
    const liveAssignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const dispatchLaunchSummary = (0, collaboration_1.buildDispatchLaunchSummary)({
        task,
        goal: task?.business_goal || task?.goal || task?.title || "",
        assignments: liveAssignments,
        dispatchPolicy: { action: "live_task_followup", reason: "根据任务真实执行状态展示已派发工作" },
        mode: phase === "reworking" ? "followup" : "delegation",
        taskId: task?.id || "",
    });
    const hasRecoveryStep = steps.some((step) => step.id === "restore_task_context");
    const selectedActions = normalizeMainAgentActionIds([
        "read_group_context",
        "inspect_task_status",
        ...(hasRecoveryStep ? ["restore_task_context"] : []),
        "dispatch_child_agent",
        "read_child_agent_receipts",
        ...(phase === "reworking" ? ["replan_from_observation"] : []),
        "generate_final_reply",
    ]);
    const blockedActions = steps.some((step) => step.status === "needs_confirmation" || step.status === "failed") ? ["generate_final_reply"] : [];
    const passed = hasStrongTaskAcceptanceEvidence(task, [], summary);
    const permissions = selectedActions.map((id) => ({ action_id: id, risk: ["dispatch_child_agent"].includes(id) ? "write" : "safe", allowed: !blockedActions.includes(id), reason: blockedActions.includes(id) ? "仍有执行缺口，等待返工或用户确认" : "来自任务生命周期的状态更新" }));
    const observation = {
        live_task_phase: phase,
        receipt_count: Number(summary.receipt_count || 0),
        acceptance_gate_passed: passed,
        needs_replan: phase === "reworking" || summary.acceptance_gate_passed === false || !passed && (phase === "reviewing" || task?.status === "done"),
    };
    const internalLoop = buildGroupMainAgentInternalLoop({
        mode: phase === "reworking" ? "followup" : "delegation",
        actionIds: selectedActions,
        permissions,
        taskIntent: { kind: "task", executable: true, reason: "根据任务真实执行状态刷新内部循环" },
        dispatchPolicy: { action: "live_task_followup", reason: "根据任务真实执行状态刷新 Todo/Plan", nextStep: steps.find((step) => ["in_progress", "reviewing", "reworking", "needs_confirmation", "failed"].includes(step.status))?.content || "等待下一次任务状态更新" },
        assignments: liveAssignments,
        observations: observation,
        verified: passed,
    });
    const displayStream = (0, display_1.buildMainAgentDisplayStream)({
        surface: "group",
        mode: phase === "reworking" ? "followup" : "delegation",
        status: task?.status || phase,
        phase,
        userText: task?.status_detail || summary.headline || "",
        goal: task?.business_goal || task?.goal || task?.title || "",
        actionIds: selectedActions,
        steps,
        permissions,
        observations: observation,
        traceId: task?.trace_id || "",
        technical: { blockers: summary.blockers || summary.needs || [] },
        workers: liveAssignments,
        executions: [],
        summary: { ...summary, dispatch_launch_summary: dispatchLaunchSummary },
        rawEvents: Array.isArray(summary.timeline) ? summary.timeline : [],
        taskId: task?.id || "",
    });
    return {
        version: 2,
        trace_id: task?.trace_id || "",
        group_id: task?.group_id || "",
        task_id: task?.id || "",
        message_id: "",
        coordinator: task?.target_project || "coordinator",
        mode: phase === "reworking" ? "followup" : "delegation",
        decision: {
            selected_actions: selectedActions,
            dispatch_policy: { action: "live_task_followup", reason: "根据任务真实执行状态刷新 Todo/Plan", nextStep: steps.find((step) => ["in_progress", "reviewing", "reworking", "needs_confirmation", "failed"].includes(step.status))?.content || "等待下一次任务状态更新" },
            reason: "任务执行状态实时闭环",
        },
        internal_loop: internalLoop,
        loop: internalLoop,
        user_plan_steps: steps,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary: dispatchLaunchSummary,
        display_stream: displayStream,
        displayStream,
        todo_plan: liveTodoPlan,
        verification_reminder: liveTodoPlan?.verification_reminder || null,
        verificationReminder: liveTodoPlan?.verification_reminder || null,
        permissions,
        observation,
        verify: {
            passed,
            blocked_actions: blockedActions,
            conclusion: passed ? "任务 Todo 已闭环并通过验收" : "任务仍在执行、验收或返工中",
        },
        reply: {
            kind: "task_card",
            message_id: "",
            preview: task?.status_detail || summary.headline || "",
        },
        created_at: new Date().toISOString(),
    };
}
function getDashboardWorkerRows(task) {
    const summary = task?.delivery_summary || {};
    const assignments = Array.isArray(summary.assignment_evidence) ? summary.assignment_evidence : [];
    const receipts = [
        ...(Array.isArray(summary.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    const notifications = Array.isArray(summary.worker_notifications) ? summary.worker_notifications : [];
    const names = (0, collaboration_1.uniqueStrings)([
        ...assignments.map((item) => item.project || item.agent || item.target_project),
        ...receipts.map((item) => item.agent || item.project || item.target_project),
        ...notifications.map((item) => item.task_id || item.agent || item.project),
    ].filter(Boolean)).slice(0, 12);
    return names.map((name) => {
        const matchName = (item) => String(item?.project || item?.agent || item?.target_project || item?.task_id || "").toLowerCase() === name.toLowerCase();
        const assignment = assignments.find(matchName) || {};
        const receipt = receipts.find(matchName) || {};
        const notification = notifications.find(matchName) || {};
        return {
            agent: name,
            task: assignment.task || assignment.summary || notification.task || "",
            status: receipt.status || notification.receipt_status || notification.status || assignment.status || (task?.status === "in_progress" ? "running" : "pending"),
            summary: receipt.summary || notification.summary || assignment.reason || "",
            files_changed: Array.isArray(receipt.filesChanged || receipt.files_changed || receipt.files) ? (receipt.filesChanged || receipt.files_changed || receipt.files) : [],
            verification: Array.isArray(receipt.verification || receipt.tests) ? (receipt.verification || receipt.tests) : [],
            blockers: [
                ...(Array.isArray(receipt.blockers) ? receipt.blockers : []),
                ...(Array.isArray(receipt.needs) ? receipt.needs : []),
            ].filter(Boolean),
        };
    });
}
function normalizeMainAgentActionIds(ids) {
    const known = new Set((0, collaboration_1.getGroupMainAgentActionRegistry)().map(action => action.id));
    const result = [];
    for (const raw of ids || []) {
        const id = String(raw || "").trim();
        if (!id || !known.has(id) || result.includes(id))
            continue;
        result.push(id);
    }
    return result;
}
function buildGroupMainAgentInternalLoop(input) {
    const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
    const permissions = Array.isArray(input.permissions) ? input.permissions : [];
    const blockedActions = permissions.filter((item) => item.allowed === false).map((item) => item.action_id);
    const observations = input.observations || {};
    const toolChoiceReason = (stage, stageActions) => {
        if (stage.id === "observe") {
            if (input.mode === "conversation")
                return "普通对话只读群聊上下文，不读取项目代码。";
            if (input.mode === "project_analysis")
                return "项目分析只读项目快照和知识库，不创建任务。";
            return "开发/续跑任务需要读取任务状态、项目上下文和历史证据。";
        }
        if (stage.id === "think")
            return input.taskIntent?.reason || input.dispatchPolicy?.reason || "根据消息模式、意图分类和风险信号判断下一步。";
        if (stage.id === "plan")
            return observations.requires_confirmation ? "风险或范围需要用户确认，先形成计划卡。" : "形成 Todo、工作单边界和验收标准。";
        if (stage.id === "act")
            return blockedActions.some((id) => stageActions.includes(id)) ? "存在未授权动作，暂停执行。" : "当前消息授权允许执行对应动作。";
        if (stage.id === "monitor")
            return "读取子 Agent 结果说明、执行状态、Diff 和验证证据。";
        if (stage.id === "reflect")
            return observations.acceptance_gate_passed === false || observations.needs_replan ? "验收或执行存在缺口，需要返工/重规划。" : "暂无返工证据。";
        return input.verified ? "证据边界通过，生成回复。" : "仍需说明等待确认、继续执行或缺口。";
    };
    const stages = exports.GROUP_MAIN_AGENT_LOOP_STAGES.map(stage => {
        const stageActions = (stage.actions || []).filter((id) => actionIds.includes(id));
        const status = loopStageStatus(stage, { mode: input.mode, actionIds, blockedActions, observations, verified: input.verified });
        return {
            id: stage.id,
            label: stage.label,
            title: stage.title,
            status,
            purpose: stage.purpose,
            actions: stageActions,
            tool_choice: toolChoiceReason(stage, stageActions),
            evidence: [
                stage.id === "think" && input.taskIntent?.kind ? `intent=${input.taskIntent.kind}` : "",
                stage.id === "plan" && Array.isArray(input.assignments) ? `assignments=${input.assignments.length}` : "",
                stage.id === "act" && input.dispatchPolicy?.action ? `dispatch=${input.dispatchPolicy.action}` : "",
                stage.id === "monitor" && observations.receipt_count !== undefined ? `receipts=${observations.receipt_count}` : "",
                stage.id === "reflect" && observations.acceptance_gate_passed !== undefined ? `acceptance=${observations.acceptance_gate_passed}` : "",
            ].filter(Boolean),
        };
    });
    const current = stages.find((stage) => ["needs_confirmation", "failed", "in_progress", "reviewing", "reworking"].includes(stage.status))
        || [...stages].reverse().find((stage) => stage.status === "completed")
        || stages[0];
    const completedCount = stages.filter((stage) => ["completed", "skipped"].includes(stage.status)).length;
    return {
        version: 1,
        source: "group-main-agent-loop-5.0",
        pattern: "observe-think-plan-act-monitor-reflect-respond",
        current_stage: current?.id || "observe",
        current_label: current?.title || "观察上下文",
        progress: { completed: completedCount, total: stages.length },
        stages,
        next_action: current?.status === "needs_confirmation"
            ? "等待用户确认后继续"
            : current?.id === "respond"
                ? "生成或更新用户回复"
                : current?.purpose || "",
    };
}
function buildUserVisiblePlanStep(input) {
    const status = normalizeLiveTodoStatus(input.status || "pending");
    const activeForm = input.activeForm || input.content;
    return {
        id: input.id,
        content: input.content,
        subject: input.content,
        activeForm,
        active_form: activeForm,
        summary: ["in_progress", "reviewing", "reworking"].includes(status) ? activeForm : input.content,
        status,
        detail: (0, memory_1.compactMemoryText)(input.detail || "", 220),
        user_visible: true,
        technical: false,
        evidence: Array.isArray(input.evidence) ? input.evidence : [],
        actions: Array.isArray(input.actions) ? input.actions : [],
    };
}
function buildMainAgentPlanVerificationReminder(input) {
    const mode = String(input.mode || "");
    if (mode === "conversation" || mode === "project_analysis")
        return null;
    const steps = Array.isArray(input.steps) ? input.steps : [];
    if (steps.length < 3)
        return null;
    if (steps.some(planStepHasVerificationSignal))
        return null;
    if (summaryHasExecutedVerification(input.summary))
        return null;
    const strongAcceptance = hasStrongTaskAcceptanceEvidence(input.task, [], input.summary || input.task?.delivery_summary || {});
    if (input.verified === true || input.phase === "completed" && strongAcceptance || input.task?.status === "done" && strongAcceptance)
        return null;
    return {
        schema: "ccm-main-agent-plan-verification-reminder-v1",
        status: "needs_verification_step",
        title: "还缺验收步骤",
        headline: "完成前需要补一项真实验证，或者说明为什么当前不能验证。",
        reason: "计划已有 3 项以上，但没有显式的真实验证、测试或检查步骤。",
        next_action: "我会把验收补进计划，再继续交付总结。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function normalizeLiveTodoStatus(status) {
    const value = String(status || "pending");
    if (["done", "completed", "success", "succeeded"].includes(value))
        return "completed";
    if (["running", "active", "in_progress", "executing"].includes(value))
        return "in_progress";
    if (["review", "reviewing", "testing"].includes(value))
        return "reviewing";
    if (["rework", "reworking", "retrying"].includes(value))
        return "reworking";
    if (["blocked", "warning", "needs_info", "partial"].includes(value))
        return "needs_confirmation";
    if (["failed", "error"].includes(value))
        return "failed";
    if (["cancelled", "canceled"].includes(value))
        return "cancelled";
    if (["skipped", "skip"].includes(value))
        return "skipped";
    return value || "pending";
}
function buildTodoStepEvidence(input) {
    const { task, summary, workers, executions, stepId, phase } = input;
    const timeline = Array.isArray(summary?.timeline) ? summary.timeline : [];
    const receipts = [
        ...(Array.isArray(summary?.receipts) ? summary.receipts : []),
        ...(Array.isArray(summary?.receipt_statuses) ? summary.receipt_statuses : []),
    ];
    const files = (0, collaboration_1.uniqueStrings)([
        ...(Array.isArray(summary?.files_changed) ? summary.files_changed : []),
        ...(Array.isArray(summary?.actual_file_changes) ? summary.actual_file_changes.map((item) => item?.path || item?.file || item) : []),
    ].filter(Boolean)).slice(0, 8);
    const verification = (0, collaboration_1.uniqueStrings)(Array.isArray(summary?.verification_executed) ? summary.verification_executed : []).slice(0, 8);
    const blockers = (0, collaboration_1.uniqueStrings)([
        ...(Array.isArray(summary?.blockers) ? summary.blockers : []),
        ...(Array.isArray(summary?.needs) ? summary.needs : []),
        ...(Array.isArray(summary?.verification_failed) ? summary.verification_failed.map((item) => `验证失败：${String(item)}`) : []),
    ].filter(Boolean)).slice(0, 8);
    const evidence = [];
    const add = (type, title, detail = "", data = null) => {
        evidence.push({ type, title, detail: (0, memory_1.compactMemoryText)(detail || "", 220), data });
    };
    if (stepId === "understand_intent")
        add("task", "需求目标", task?.business_goal || task?.title || "", { task_id: task?.id || "" });
    if (stepId === "read_group_context")
        add("trace", "Trace", task?.trace_id ? `Trace ${task.trace_id}` : "当前任务没有 Trace ID", { trace_id: task?.trace_id || "" });
    if (stepId === "create_project_task")
        add("task", "任务卡", `任务 ${task?.id || ""} · ${task?.status || ""}`, { task_id: task?.id || "", status: task?.status || "" });
    if (stepId === "restore_task_context") {
        const checks = getTaskRecoveryChecks(task);
        const latest = checks[checks.length - 1] || {};
        if (checks.length)
            add("recovery", "恢复复核", latest.reason || "已重新核对任务上下文", latest);
        if (task?.recovery?.previous_status)
            add("state", "上次状态", task.recovery.previous_status, task.recovery);
        if (task?.execution_lease?.recovery_count)
            add("lease", "恢复次数", String(task.execution_lease.recovery_count), task.execution_lease);
        if (!checks.length && task?.recovery_pending)
            add("recovery", "恢复等待确认", "服务启动后检测到未完成任务，已暂停等待确认", task.recovery || {});
    }
    if (stepId === "dispatch_child_agent") {
        const dispatchEvents = timeline.filter((item) => ["dispatch", "coordinator_plan", "sandbox_rehearsal", "conflict_plan"].includes(String(item?.type || ""))).slice(-4);
        for (const item of dispatchEvents)
            add("trace", item.title || "派发证据", item.detail || item.phase || "", { id: item.id || "", type: item.type || "" });
        if (!dispatchEvents.length)
            add("trace", "派发状态", phase === "planning" ? "主 Agent 仍在形成派发计划" : "已进入任务执行链路");
    }
    if (stepId === "child_agent_execution") {
        for (const worker of workers.slice(0, 8))
            add("agent", worker.agent || "子 Agent", `${worker.status || "pending"} · ${worker.summary || worker.task || ""}`, { agent: worker.agent, status: worker.status });
        for (const execution of executions.slice(-4))
            add("execution", execution.project || "执行器", `${execution.state || ""} · ${execution.id || ""}`, { execution_id: execution.id || "", project: execution.project || "" });
        if (!workers.length && !executions.length)
            add("agent", "子 Agent", "等待执行通道开始处理");
    }
    if (stepId === "read_child_agent_receipts") {
        for (const receipt of receipts.slice(0, 8))
            add("receipt", receipt.agent || receipt.project || "子 Agent 结果说明", `${receipt.status || receipt.receipt_status || ""} · ${receipt.summary || ""}`, receipt);
        if (!receipts.length)
            add("receipt", "结果说明", "尚未收到可验收结果说明");
    }
    if (stepId === "coordinator_review") {
        if (verification.length)
            add("verification", "已执行验证", verification.join("；"), { verification });
        if (summary?.acceptance_gate)
            add("acceptance", "验收门禁", hasStrongTaskAcceptanceEvidence(task, executions, summary) ? "已通过" : "未通过或等待中", summary.acceptance_gate);
        if (blockers.length)
            add("blocker", "阻塞/失败原因", blockers.join("；"), { blockers });
        if (!verification.length && !summary?.acceptance_gate && !blockers.length)
            add("acceptance", "验收", "等待我汇总结果说明并验收");
    }
    if (stepId === "final_delivery_report") {
        if (summary?.headline || task?.status_detail)
            add("report", "交付摘要", summary.headline || task.status_detail || "");
        if (files.length)
            add("files", "修改文件", files.join("；"), { files });
        if (verification.length)
            add("verification", "验证结果", verification.join("；"), { verification });
        if (blockers.length)
            add("blocker", "遗留风险", blockers.join("；"), { blockers });
    }
    if (/^model_plan_\d+$/.test(stepId) || /^followup_requirement_\d+$/.test(stepId)) {
        const planMode = (0, main_agent_plan_core_1.readTaskPlanMode)(task);
        const planStep = (0, main_agent_plan_core_1.extractPlanModeWorkSteps)(planMode).find((item) => String(item?.id || "") === stepId) || {};
        if (/^followup_requirement_\d+$/.test(stepId)) {
            const revision = (Array.isArray(planMode?.plan_revisions) ? planMode.plan_revisions : []).find((item) => item?.step_id === stepId);
            add("plan", "追加要求", revision?.feedback || planStep.label || planStep.content || "用户在计划提出后补充的要求", { step_id: stepId, revised_at: revision?.at || planStep.added_at || "" });
        }
        else {
            add("plan", "执行前计划", planStep.label || planStep.content || "来自执行前计划的模型步骤", { step_id: stepId, plan_title: planMode?.title || "执行前计划" });
        }
    }
    return evidence.slice(0, 10);
}
function buildTodoStepActions(input) {
    const { task, stepId, status, phase, summary } = input;
    const taskId = task?.id || "";
    if (!taskId)
        return [];
    const actions = [];
    const add = (id, label, kind, tone = "outline") => actions.push({ id, label, kind, tone, task_id: taskId, step_id: stepId });
    if (["failed", "needs_confirmation"].includes(status)) {
        if (stepId === "dispatch_child_agent")
            add("retry", "重新派发", "retry", "primary");
        if (["child_agent_execution", "read_child_agent_receipts", "coordinator_review"].includes(stepId))
            add("gap_continue", "按缺口返工", "gap_continue", "warning");
        if (["child_agent_execution", "coordinator_review"].includes(stepId))
            add("switch_executor", "切换执行器", "switch_executor", "outline");
        add("cancel", "取消任务", "cancel", "danger");
    }
    if (status === "reworking")
        add("view_pipeline", "查看协作看板", "view_pipeline", "outline");
    if (status === "reviewing" && stepId === "coordinator_review") {
        add("gap_continue", "按缺口返工", "gap_continue", "warning");
        if (hasStrongTaskAcceptanceEvidence(task, [], summary))
            add("confirm_done", "标记已处理", "confirm_done", "success");
    }
    if (status === "completed" && stepId === "final_delivery_report")
        add("view_pipeline", "查看交付证据", "view_pipeline", "outline");
    if (["in_progress", "reviewing", "reworking"].includes(status) && !["completed", "cancelled"].includes(phase))
        add("cancel", "取消任务", "cancel", "danger");
    return actions.slice(0, 4);
}
function loopStageStatus(stage, input) {
    const actionIds = input.actionIds || [];
    const blockedActions = input.blockedActions || [];
    const stageActions = stage.actions || [];
    const hasAction = stageActions.some((id) => actionIds.includes(id));
    const blocked = stageActions.some((id) => blockedActions.includes(id));
    if (blocked)
        return "needs_confirmation";
    if (stage.id === "think")
        return "completed";
    if (stage.id === "reflect") {
        if (actionIds.includes("replan_from_observation") || input.observations?.needs_replan || input.observations?.acceptance_gate_passed === false)
            return "in_progress";
        if (input.verified)
            return "completed";
        return input.mode === "conversation" || input.mode === "project_analysis" ? "skipped" : "pending";
    }
    if (stage.id === "respond")
        return actionIds.includes("generate_final_reply") ? (input.verified ? "completed" : "in_progress") : "pending";
    if (stage.id === "monitor") {
        if (actionIds.includes("read_child_agent_receipts") || input.observations?.receipt_count || input.observations?.queued)
            return input.verified ? "completed" : "in_progress";
        return input.mode === "conversation" || input.mode === "project_analysis" ? "skipped" : "pending";
    }
    if (stage.id === "act") {
        if (hasAction)
            return input.verified ? "completed" : "in_progress";
        return ["conversation", "project_analysis"].includes(input.mode) ? "skipped" : "pending";
    }
    if (stage.id === "plan") {
        if (hasAction || ["project_task", "delegation", "followup", "governance"].includes(input.mode))
            return "completed";
        return input.mode === "conversation" ? "skipped" : "completed";
    }
    if (stage.id === "observe")
        return hasAction ? "completed" : "pending";
    return hasAction ? "completed" : "pending";
}
function planStepHasVerificationSignal(step) {
    const text = [
        step?.content,
        step?.title,
        step?.subject,
        step?.summary,
        step?.activeForm,
        step?.active_form,
        step?.detail,
    ].filter(Boolean).join(" ");
    return exports.MAIN_AGENT_VERIFICATION_STEP_PATTERN.test(text);
}
function summaryHasExecutedVerification(summary = {}) {
    const fields = [
        summary?.verification_executed,
        summary?.executed_verification,
        summary?.verification_results,
        summary?.verification,
        summary?.runner_verification?.verification,
        summary?.external_runner_verification?.verification,
    ];
    return fields.some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
}
exports.GROUP_MAIN_AGENT_LOOP_STAGES = [
    { id: "observe", label: "Observe", title: "观察上下文", actions: ["read_group_context", "read_project_code_snapshot", "query_knowledge_base", "inspect_task_status"], purpose: "先看群聊、项目、知识库和任务状态，避免盲目派发。" },
    { id: "think", label: "Think", title: "判断意图", actions: [], purpose: "判断普通问答、项目分析、开发任务、治理动作或续跑。" },
    { id: "plan", label: "Plan", title: "形成计划", actions: ["create_project_task", "ask_user_clarification"], purpose: "形成用户可读计划、Todo、风险和工作单边界。" },
    { id: "act", label: "Act", title: "执行动作", actions: ["dispatch_child_agent", "govern_task_lifecycle"], purpose: "只在授权后创建任务、派发子 Agent 或执行治理动作。" },
    { id: "monitor", label: "Monitor", title: "跟踪执行", actions: ["read_child_agent_receipts", "inspect_task_status"], purpose: "持续读取子 Agent 结果说明、任务状态、文件变更和验证结果。" },
    { id: "reflect", label: "Reflect", title: "复盘返工", actions: ["replan_from_observation"], purpose: "发现缺口时重规划、返工、追问或切换执行器。" },
    { id: "respond", label: "Respond", title: "回复用户", actions: ["generate_final_reply"], purpose: "只在证据足够或需要用户决定时，给出清晰回复。" },
];
exports.MAIN_AGENT_VERIFICATION_STEP_PATTERN = /验证|测试|运行检查|执行检查|检查(?:命令|结果|通过|失败)|verify|verification|test|qa|typecheck|lint|build|check/i;
//# sourceMappingURL=collaboration-task-card.js.map