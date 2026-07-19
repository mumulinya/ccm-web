"use strict";
// Behavior-freeze split from workchain-part-01.ts (part 2/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorkchainTodoPlan = buildWorkchainTodoPlan;
exports.buildMainAgentProgressCheckpoints = buildMainAgentProgressCheckpoints;
exports.stageStatus = stageStatus;
exports.terminalWorkchain = terminalWorkchain;
exports.collectWorkchainVisibleQualityText = collectWorkchainVisibleQualityText;
exports.buildFinalSummaryQuality = buildFinalSummaryQuality;
const workchain_part_01_part_01_1 = require("./workchain-part-01-part-01");
function buildWorkchainTodoPlan(input, stages, evidence, terminal, options = {}) {
    const steps = (0, workchain_part_01_part_01_1.applyQualityFollowupTodoStep)((0, workchain_part_01_part_01_1.normalizeWorkchainTodoSteps)(input, stages, terminal), options.qualityFollowup);
    const completedCount = steps.filter(step => step.status === "completed").length;
    const current = steps.find(step => step.status === "in_progress")
        || steps.find(step => ["needs_confirmation", "failed"].includes(step.status))
        || steps.find(step => step.status === "pending")
        || steps[steps.length - 1]
        || null;
    const verificationReminder = (0, workchain_part_01_part_01_1.buildWorkchainTodoVerificationReminder)(input, steps, evidence, terminal);
    const hasVerificationEvidence = evidence.verification.length > 0 || evidence.acceptance.length > 0 || evidence.independentReview.length > 0;
    const hasQualityFollowup = Boolean(options.qualityFollowup);
    const archiveCompletedTodo = !hasQualityFollowup
        && terminal
        && steps.length > 0
        && steps.every(step => step.status === "completed")
        && hasVerificationEvidence
        && !verificationReminder;
    const archiveSummary = archiveCompletedTodo
        ? "计划已全部完成，主视图只保留最终总结；完整步骤和底层记录可在技术详情中查看。"
        : "";
    return {
        schema: "ccm-main-agent-workchain-todo-v1",
        source: "workchain",
        title: input.surface === "global" ? "我的当前计划" : "协作群当前计划",
        surface: input.surface,
        mode: input.mode || "",
        task_id: input.taskId || "",
        run_id: input.runId || "",
        mission_id: input.missionId || "",
        steps,
        current_step: current,
        currentStep: current,
        completed_count: completedCount,
        total_count: steps.length,
        progress_label: `${completedCount}/${steps.length}`,
        visible_steps: archiveCompletedTodo ? [] : steps,
        visibleSteps: archiveCompletedTodo ? [] : steps,
        archived_steps_count: archiveCompletedTodo ? steps.length : 0,
        archivedStepsCount: archiveCompletedTodo ? steps.length : 0,
        archive_summary: archiveSummary,
        archiveSummary,
        quality_followup_required: hasQualityFollowup,
        qualityFollowupRequired: hasQualityFollowup,
        quality_followup: options.qualityFollowup || null,
        qualityFollowup: options.qualityFollowup || null,
        verification_nudge: Boolean(verificationReminder),
        verification_reminder: verificationReminder,
        verificationReminder,
        display_policy: {
            user_visible: true,
            hide_for_ordinary_conversation: input.mode === "conversation" && !(0, workchain_part_01_part_01_1.hasExecutableWorkEvidence)(input, evidence),
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            quiet_completed: true,
            archive_completed_todo: archiveCompletedTodo,
            archiveCompletedTodo,
            archived_when_complete: archiveCompletedTodo,
            archivedWhenComplete: archiveCompletedTodo,
            visible_when_completed: !archiveCompletedTodo,
            visibleWhenCompleted: !archiveCompletedTodo,
            max_visible_steps: 5,
        },
    };
}
function eventStatusForCheckpoint(item) {
    const status = String(item?.status || item?.level || "").toLowerCase();
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
function checkpointLabelFromAction(action) {
    const id = String(action || "");
    if (/inspect|read|query|search|analyze|context/i.test(id))
        return "已检查相关上下文";
    if (/plan|reason/i.test(id))
        return "已形成执行计划";
    if (/orchestrate|dispatch|send_group|send_project|child|mission/i.test(id))
        return "已安排执行目标";
    if (/verify|review|acceptance|receipt/i.test(id))
        return "已进入验收检查";
    if (/complete|final|reply|summary|report/i.test(id))
        return "已整理阶段结果";
    return "";
}
function checkpointLabelFromEvent(item, surface) {
    const type = String(item?.type || "");
    const agent = item?.agent ? `${item.agent}：` : "";
    const title = (0, workchain_part_01_part_01_1.compactText)(item?.title || item?.message || "", 96);
    if (type === "queued_group_task")
        return "我已接收任务";
    if (type === "coordinator_plan")
        return "我已制定协作计划";
    if (type === "reasoning_plan" || type === "reasoning_preflight")
        return "我已复核目标与验收";
    if (type === "sandbox_rehearsal")
        return "已完成任务前预演";
    if (type === "conflict_plan")
        return "已启用修改冲突保护";
    if (type === "global_mission_handoff_ready")
        return "我已补齐子任务交接";
    if (type === "worker_handoff_ready")
        return `${agent}工作单已补齐`;
    if (type === "global_mission_plan")
        return "我已制定跨项目计划";
    if (type === "dispatch")
        return "已安排执行成员";
    if (type === "direct_task")
        return "已安排项目执行成员";
    if (type === "child_agent_start")
        return `${agent}开始处理`;
    if (type === "child_agent_rework")
        return `${agent}开始返工`;
    if (type === "child_agent_failed")
        return `${agent}执行遇到问题`;
    if (type === "child_agent_receipt")
        return `${agent}提交结果`;
    if (type === "agent_qa_question")
        return `${agent}向其他 Agent 确认问题`;
    if (type === "agent_qa_waiting")
        return `${agent}等待依赖回答`;
    if (type === "agent_qa_accepted")
        return "我已采纳协作回答";
    if (type === "agent_qa_resume")
        return `${agent}拿到回答并继续执行`;
    if (type === "coordinator_review")
        return "我正在验收";
    if (type === "acceptance_gate")
        return "已检查交付质量";
    if (type === "plan_mode_confirmed")
        return "执行前计划已确认";
    if (type === "plan_mode_revision_requested")
        return "执行前计划已按反馈调整";
    if (type === "next_work_item_dispatch")
        return "下一步工作已接上";
    if (type === "targeted_rework")
        return "我已发起定向补充";
    if (type === "auto_gap_rework")
        return "我已按缺口自动返工";
    if (type === "task_continuation")
        return "补充要求已接收";
    if (type === "reasoning_recovery_check" || type === "startup_manual_recovery")
        return "我已接上恢复任务";
    if (type === "native_session_retry")
        return `${agent}恢复会话继续执行`;
    if (type === "runtime_fallback" || type === "runtime_switch")
        return agent ? `${agent}切换执行通道` : "我已切换执行通道";
    if (type === "permission_drift")
        return agent ? `${agent}权限状态已校正` : "权限状态已校正";
    if (type === "runtime_debt_cleanup")
        return "运行通道已清理";
    if (type === "task_rollback")
        return "已安全撤销改动";
    if (type === "global_supervisor_cycle")
        return "我已检查子任务进展";
    if (type === "global_supervisor_rework")
        return "我已安排子任务返工";
    if (type === "global_supervisor_waiting_user")
        return "我在等待你处理阻塞";
    if (type === "global_supervisor_completed")
        return "全局任务已通过交付验收";
    if (type === "global_direct_dispatch_completion_synced")
        return "全局会话已同步最终总结";
    if (type === "global_direct_dispatch_rollback_synced")
        return "全局会话已同步撤销结果";
    if (type === "global_agent.supervising")
        return "全局任务已进入持续跟踪";
    if (type === "global_agent.run_completed")
        return "我已完成总结";
    if (title)
        return (0, workchain_part_01_part_01_1.sanitizeWorkchainUserText)(title, surface === "global" ? "我更新了处理进展。" : "协作群更新了处理进展。", 96);
    return "";
}
function buildMainAgentProgressCheckpoints(input, stages, evidence, options = {}) {
    const items = [];
    const seen = new Set();
    const push = (item) => {
        const label = (0, workchain_part_01_part_01_1.sanitizeWorkchainUserText)(item.label || item.title, "", 110);
        if (!label)
            return;
        const detail = (0, workchain_part_01_part_01_1.sanitizeWorkchainUserText)(item.detail || "", "", 180);
        const key = `${label}|${detail}|${item.phase || ""}`;
        if (seen.has(key))
            return;
        seen.add(key);
        items.push({
            id: item.id || `checkpoint-${items.length + 1}`,
            label,
            detail,
            status: item.status || "pending",
            phase: item.phase || "",
            at: item.at || "",
            source: item.source || "workchain",
        });
    };
    for (const event of (input.rawEvents || []).filter(Boolean)) {
        const raw = `${event?.title || ""}\n${event?.detail || ""}\n${event?.message || ""}`;
        if (workchain_part_01_part_01_1.INTERNAL_TEXT_PATTERN.test(raw))
            continue;
        push({
            id: event.id || `${event.at || ""}:${event.type || ""}`,
            label: checkpointLabelFromEvent(event, input.surface),
            detail: (0, workchain_part_01_part_01_1.compactText)(event.detail || event.message || "", 180),
            status: eventStatusForCheckpoint(event),
            phase: event.phase || "",
            at: event.at || "",
            source: "timeline",
        });
    }
    if (items.length < 4) {
        for (const step of (input.steps || []).filter(Boolean)) {
            if (items.length >= 6)
                break;
            const raw = `${step.activeForm || step.active_form || step.summary || step.content || ""}`;
            if (workchain_part_01_part_01_1.INTERNAL_TEXT_PATTERN.test(raw))
                continue;
            push({
                id: step.id ? `step-${step.id}` : "",
                label: (0, workchain_part_01_part_01_1.sanitizeWorkchainUserText)(step.activeForm || step.active_form || step.summary || step.content, "我更新了当前处理进展。", 110),
                detail: (0, workchain_part_01_part_01_1.compactText)(step.evidence?.[0] || step.detail || "", 160),
                status: (0, workchain_part_01_part_01_1.checkpointStatus)(step.status),
                phase: step.phase || "",
                source: "todo",
            });
        }
    }
    if (!items.length) {
        for (const action of input.actionIds || []) {
            const label = checkpointLabelFromAction(action);
            if (label)
                push({ id: `action-${action}`, label, status: "done", phase: input.phase || input.mode || "", source: "action" });
        }
    }
    if (!items.length) {
        for (const stage of stages) {
            if (!["completed", "in_progress", "needs_confirmation", "failed", "cancelled"].includes(String(stage.status || "")))
                continue;
            push({ id: `stage-${stage.id}`, label: stage.label, detail: stage.summary, status: (0, workchain_part_01_part_01_1.checkpointStatus)(stage.status), phase: stage.id, source: "stage" });
        }
    }
    const terminal = ["completed", "done", "succeeded", "failed", "cancelled", "canceled", "supervising"].includes(String(input.status || "").toLowerCase())
        || ["completed", "failed", "cancelled", "reverted"].includes(String(input.phase || "").toLowerCase());
    if (terminal) {
        const detail = evidence.evidence.length ? evidence.evidence.slice(0, 3).join("，") : "";
        push({
            id: "final-summary-checkpoint",
            label: input.status === "supervising" ? "已进入持续跟踪" : "已整理本轮总结",
            detail,
            status: input.status === "failed" ? "failed" : "done",
            phase: "summarize",
            source: "summary",
        });
    }
    if (options.qualityFollowup) {
        push({
            id: "quality-followup-checkpoint",
            label: "正在补齐交付总结",
            detail: (0, workchain_part_01_part_01_1.sanitizeWorkchainUserText)(options.qualityFollowup.next_action || options.qualityFollowup.nextAction, "我会先补齐缺少的交付总结内容。", 180),
            status: "active",
            phase: "summarize",
            source: "final_summary_quality",
        });
    }
    return {
        schema: "ccm-main-agent-progress-checkpoints-v1",
        title: "关键进展",
        display_policy: {
            user_visible: true,
            hide_for_ordinary_conversation: input.mode === "conversation" && !(input.actionIds || []).length,
            raw_events_default_collapsed: true,
        },
        items: items.slice(-6),
    };
}
function stageStatus(input, stage) {
    const status = String(input.status || "").toLowerCase();
    const phase = String(input.phase || input.mode || "").toLowerCase();
    const terminal = ["completed", "done", "succeeded", "failed", "cancelled", "canceled"].includes(status)
        || ["completed", "failed", "cancelled", "reverted"].includes(phase);
    if (stage === "intake")
        return "completed";
    if (stage === "plan") {
        if (["waiting_confirmation", "waiting_clarification", "needs_user"].includes(status) || phase === "needs_user")
            return "needs_confirmation";
        return terminal || (input.steps || []).length || (input.actionIds || []).length ? "completed" : "in_progress";
    }
    if (stage === "execute") {
        if (["cancelled", "canceled"].includes(status) || phase === "cancelled")
            return "cancelled";
        if (status === "failed" || phase === "failed")
            return "failed";
        if (terminal)
            return "completed";
        if ((input.workers || []).length || (input.executions || []).length || (input.actionIds || []).some(id => /dispatch|create|execute|manage|send|orchestrate/i.test(String(id))))
            return "in_progress";
        return "pending";
    }
    if (stage === "verify") {
        if (status === "failed" || phase === "failed")
            return "failed";
        if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user")
            return "needs_confirmation";
        if (terminal)
            return "completed";
        const summary = input.summary || {};
        if (summary.acceptance_gate_passed === true || (0, workchain_part_01_part_01_1.stringList)(summary.verification_executed).length)
            return "in_progress";
        return "pending";
    }
    if (stage === "summarize") {
        if (terminal || status === "supervising")
            return "completed";
        if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user")
            return "needs_confirmation";
        return "pending";
    }
    return "pending";
}
function terminalWorkchain(input) {
    return ["completed", "done", "succeeded", "failed", "cancelled", "canceled", "supervising"].includes(String(input.status || "").toLowerCase())
        || ["completed", "failed", "cancelled", "reverted"].includes(String(input.phase || "").toLowerCase());
}
function collectWorkchainVisibleQualityText(value, depth = 0) {
    if (depth > 8 || value === undefined || value === null)
        return [];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        return [String(value)];
    if (Array.isArray(value))
        return value.flatMap(item => collectWorkchainVisibleQualityText(item, depth + 1));
    if (typeof value !== "object")
        return [];
    return Object.entries(value)
        .filter(([key]) => ![
        "schema",
        "source",
        "surface",
        "mode",
        "task_id",
        "run_id",
        "mission_id",
        "display_policy",
    ].includes(key))
        .flatMap(([, nested]) => collectWorkchainVisibleQualityText(nested, depth + 1));
}
function buildFinalSummaryQuality(input, evidence, terminal, headline, nextAction, options = {}) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const deliveryReport = summary.delivery_report || summary.deliveryReport || completion.delivery_report || completion.deliveryReport || {};
    const isOrdinaryConversation = input.mode === "conversation";
    const required = terminal && !isOrdinaryConversation && (0, workchain_part_01_part_01_1.hasExecutableWorkEvidence)(input, evidence);
    const strongVerificationEvidence = (0, workchain_part_01_part_01_1.hasStrongWorkchainVerificationEvidence)(evidence);
    const failedVerificationEvidence = evidence.verification.some(workchain_part_01_part_01_1.workchainVerificationFailureText);
    const failedAcceptanceEvidence = evidence.acceptance.some(workchain_part_01_part_01_1.workchainAcceptanceFailureText)
        || summary.acceptance_gate_passed === false
        || deliveryReport.acceptance_gate_passed === false;
    const acceptanceGatePassed = summary.acceptance_gate_passed === true || deliveryReport.acceptance_gate_passed === true;
    const verificationStatus = evidence.verification.length
        ? failedVerificationEvidence
            ? `验证未通过：${evidence.verification.find(workchain_part_01_part_01_1.workchainVerificationFailureText)}`
            : `已记录 ${evidence.verification.length} 项验证或检查。`
        : failedAcceptanceEvidence
            ? "最终验收未通过，缺口已整理。"
            : strongVerificationEvidence
                ? "已记录验收或独立复核证据。"
                : acceptanceGatePassed
                    ? "最终验收标记为通过，但没有捕获到实际验证、复核或验收明细。"
                    : terminal && required
                        ? "暂无系统捕获的验证命令；这点会明确展示，不会被当作已验证。"
                        : "";
    const riskStatus = evidence.risks.length
        ? `仍有 ${evidence.risks.length} 项需要留意。`
        : required && (!strongVerificationEvidence || failedVerificationEvidence || failedAcceptanceEvidence)
            ? "仍需补齐实际验证、复核或验收明细。"
            : terminal && required
                ? "暂无需要你额外处理的风险。"
                : "";
    const checks = [
        { id: "outcome", label: "完成内容", passed: !!headline, detail: headline },
        { id: "evidence", label: "交付证据", passed: !required || evidence.evidence.length > 0 || evidence.files.length > 0 || evidence.workersDone > 0 || evidence.receipts > 0, detail: evidence.evidence.slice(0, 3).join("；") },
        { id: "verification", label: "验证或验收", passed: !required || (strongVerificationEvidence && !failedVerificationEvidence && !failedAcceptanceEvidence), detail: verificationStatus },
        { id: "independent_review", label: "独立复核", passed: !required || !evidence.independentReviewGate?.required || evidence.independentReviewGate.passed === true, detail: evidence.independentReviewGate?.failed ? evidence.independentReviewGate.failedText : evidence.independentReviewGate?.needsRecheck || evidence.independentReviewGate?.needsEnvironment || evidence.independentReviewGate?.needsUser ? evidence.independentReviewGate.riskText : evidence.independentReviewGate?.missing ? "复杂变更独立复核仍需补齐。" : evidence.independentReviewGate?.passed ? "复杂变更独立复核已通过。" : "" },
        { id: "post_review_spot_check", label: "完成前抽查", passed: !required || !evidence.postReviewSpotCheck?.required || evidence.postReviewSpotCheck.passed === true, detail: evidence.postReviewSpotCheck?.failed || evidence.postReviewSpotCheck?.needsUser ? evidence.postReviewSpotCheck.failedText : evidence.postReviewSpotCheck?.missing ? "TestAgent 通过后我仍需抽查关键验证。" : evidence.postReviewSpotCheck?.passed ? "我已抽查关键验证，结果与 TestAgent 结论一致。" : "" },
        { id: "risk", label: "风险说明", passed: !required || !!riskStatus, detail: riskStatus },
        { id: "next_action", label: "下一步", passed: !required || !!nextAction, detail: nextAction },
    ];
    const visibleText = collectWorkchainVisibleQualityText([
        headline,
        nextAction,
        evidence.evidence,
        evidence.verification,
        evidence.acceptance,
        evidence.independentReview,
        evidence.risks,
        options.todoPlan?.title,
        options.todoPlan?.visible_steps || options.todoPlan?.visibleSteps || [],
        options.todoPlan?.current_step || options.todoPlan?.currentStep || null,
        options.todoPlan?.verification_reminder || options.todoPlan?.verificationReminder || null,
        options.progressCheckpoints?.items || [],
    ]).join("\n");
    checks.push({
        id: "user_visible_protocol_sanitized",
        label: "普通文本不含内部协议",
        passed: !workchain_part_01_part_01_1.WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(visibleText),
        detail: "用户可见总结、计划和关键进展已按普通文本边界检查。",
    });
    return {
        schema: "ccm-main-agent-final-summary-quality-v1",
        required,
        passed: !required || checks.every(item => item.passed),
        checks,
        missing: checks.filter(item => !item.passed).map(item => item.label),
        verification_status: verificationStatus,
        risk_status: riskStatus,
        source: "workchain",
    };
}
//# sourceMappingURL=workchain-part-01-part-02.js.map