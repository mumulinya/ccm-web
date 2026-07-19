"use strict";
// Behavior-freeze split from collaboration-task-card.ts (part 1/3).
Object.defineProperty(exports, "__esModule", { value: true });
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
/** User-facing task card, work item, and summary builders. Behavior-preserving extraction from the collaboration facade. */
const USER_AGENT_PROGRESS_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_id|global_run_id|workflow_timeline|raw_report|raw\s+receipt|raw\s+payload|原始回执|stack|injection_id/i;
const collaboration_1 = require("./collaboration");
const collaboration_coordination_ux_1 = require("./collaboration-coordination-ux");
const display_1 = require("./display");
const memory_1 = require("./memory");
const worktree_1 = require("../../agents/worktree");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
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
//# sourceMappingURL=collaboration-task-card-part-01.js.map