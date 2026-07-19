"use strict";
// Behavior-freeze split from collaboration-task-card-part-03.ts (part 1/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserAcceptanceReview = buildUserAcceptanceReview;
exports.planAlignmentEvidenceLabels = planAlignmentEvidenceLabels;
exports.planCriterionStatus = planCriterionStatus;
exports.buildUserPlanAlignmentReview = buildUserPlanAlignmentReview;
exports.buildUserHandoffSummary = buildUserHandoffSummary;
// Behavior-freeze split from collaboration-task-card.ts (part 3/3).
const collaboration_1 = require("./collaboration");
const collaboration_memory_gates_1 = require("./collaboration-memory-gates");
const memory_1 = require("./memory");
const collaboration_task_card_part_01_1 = require("./collaboration-task-card-part-01");
const collaboration_task_card_part_02_1 = require("./collaboration-task-card-part-02");
function buildUserAcceptanceReview(task, summary = {}, executions = [], phase = "planning") {
    const gate = summary.acceptance_gate || {};
    const gateChecks = Array.isArray(gate.checks) ? gate.checks : [];
    const strongAcceptance = (0, collaboration_task_card_part_01_1.hasStrongTaskAcceptanceEvidence)(task, executions, summary);
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
        return (0, collaboration_task_card_part_02_1.normalizeUserAcceptanceCheck)(merged, {
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
    const acceptancePassed = acceptanceReview?.pass === true || (0, collaboration_task_card_part_01_1.hasStrongTaskAcceptanceEvidence)(task, [], summary);
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
    const plan = planMode || (0, collaboration_task_card_part_02_1.getTaskPlanMode)(task);
    const hasPlan = !!plan || Array.isArray(task?.workflow_meta?.plan_acceptance);
    if (!hasPlan)
        return null;
    const planAcceptance = (0, collaboration_task_card_part_02_1.splitUserAcceptanceText)(plan?.acceptance || task?.workflow_meta?.plan_acceptance || task?.acceptance_criteria || task?.acceptanceCriteria);
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
        || (String(task?.status || "") === "done" && (0, collaboration_task_card_part_01_1.hasStrongTaskAcceptanceEvidence)(task, [], summary));
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
    const strongAcceptance = (0, collaboration_task_card_part_01_1.hasStrongTaskAcceptanceEvidence)(task, [], summary);
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
//# sourceMappingURL=collaboration-task-card-part-03-part-01.js.map