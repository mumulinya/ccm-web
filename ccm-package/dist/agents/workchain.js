"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeWorkchainUserText = sanitizeWorkchainUserText;
exports.buildMainAgentWorkchain = buildMainAgentWorkchain;
exports.formatMainAgentCompletionReply = formatMainAgentCompletionReply;
exports.runMainAgentWorkchainSelfTest = runMainAgentWorkchainSelfTest;
const INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease|workchain/i;
const GENERIC_COMPLETION_REPLY_PATTERN = /^(已处理|已完成|完成|ok|done|全局 Agent 已完成本轮处理|任务已建立|任务已派发|已派发|执行完成)[。.!！]?$/i;
function compactText(value, max = 240) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}...`;
}
function sanitizeWorkchainTerminology(value) {
    return String(value || "")
        .replace(/最终\s*收尾\s*门禁/g, "最终收尾检查")
        .replace(/交付\s*门禁/g, "交付验收")
        .replace(/验收\s*门禁/g, "验收检查")
        .replace(/完成\s*门禁/g, "完成检查")
        .replace(/合并\s*门禁/g, "合并前检查")
        .replace(/测试\s*和\s*合并\s*门禁/g, "测试和合并检查")
        .replace(/路径\s*门禁/g, "路径范围检查")
        .replace(/权限\s*门禁/g, "权限检查")
        .replace(/门禁\s*通过/g, "验收通过")
        .replace(/门禁\s*未通过/g, "验收未通过")
        .replace(/未过\s*门禁/g, "未通过验收")
        .replace(/\bgate\b/gi, "检查项")
        .replace(/门禁/g, "检查")
        .replace(/回执/g, "结果说明");
}
function stringList(value, limit = 12) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|；|;|,/) : [];
    return [...new Set(source.map(item => compactText(item, 220)).filter(Boolean))].slice(0, limit);
}
function normalizeStepStatus(status) {
    const value = String(status || "").toLowerCase();
    if (["done", "completed", "succeeded", "success", "skipped"].includes(value))
        return "completed";
    if (["running", "in_progress", "executing", "reviewing", "reworking"].includes(value))
        return "in_progress";
    if (["waiting_confirmation", "waiting_clarification", "needs_confirmation", "waiting_user", "paused"].includes(value))
        return "needs_confirmation";
    if (["failed", "error"].includes(value))
        return "failed";
    if (["cancelled", "canceled"].includes(value))
        return "cancelled";
    return "pending";
}
function checkpointStatus(status) {
    const value = normalizeStepStatus(status);
    if (value === "completed")
        return "done";
    if (value === "in_progress")
        return "active";
    if (value === "needs_confirmation")
        return "warning";
    if (value === "failed")
        return "failed";
    return "pending";
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
    const title = compactText(item?.title || item?.message || "", 96);
    if (type === "queued_group_task")
        return "主 Agent 已接收任务";
    if (type === "coordinator_plan")
        return "主 Agent 已制定协作计划";
    if (type === "reasoning_plan" || type === "reasoning_preflight")
        return "主 Agent 已复核目标与验收";
    if (type === "sandbox_rehearsal")
        return "已完成任务前预演";
    if (type === "conflict_plan")
        return "已启用修改冲突保护";
    if (type === "global_mission_handoff_ready")
        return "全局 Agent 已补齐子任务交接";
    if (type === "worker_handoff_ready")
        return `${agent}工作单已补齐`;
    if (type === "global_mission_plan")
        return "全局 Agent 已制定跨项目计划";
    if (type === "dispatch")
        return "已派发给子 Agent";
    if (type === "direct_task")
        return "已派发给项目 Agent";
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
        return "主 Agent 已采纳 Agent 回答";
    if (type === "agent_qa_resume")
        return `${agent}拿到回答并继续执行`;
    if (type === "coordinator_review")
        return "主 Agent 正在验收";
    if (type === "acceptance_gate")
        return "已检查交付质量";
    if (type === "plan_mode_confirmed")
        return "执行前计划已确认";
    if (type === "plan_mode_revision_requested")
        return "执行前计划已按反馈调整";
    if (type === "next_work_item_dispatch")
        return "下一步工作已接上";
    if (type === "targeted_rework")
        return "主 Agent 已发起定向补充";
    if (type === "auto_gap_rework")
        return "主 Agent 已按缺口自动返工";
    if (type === "task_continuation")
        return "补充要求已接收";
    if (type === "reasoning_recovery_check" || type === "startup_manual_recovery")
        return "主 Agent 已接上恢复任务";
    if (type === "native_session_retry")
        return `${agent}恢复会话继续执行`;
    if (type === "runtime_fallback" || type === "runtime_switch")
        return agent ? `${agent}切换执行通道` : "Agent 已切换执行通道";
    if (type === "permission_drift")
        return agent ? `${agent}权限状态已校正` : "权限状态已校正";
    if (type === "runtime_debt_cleanup")
        return "运行通道已清理";
    if (type === "task_rollback")
        return "已安全撤销改动";
    if (type === "global_supervisor_cycle")
        return "全局监工已检查子任务";
    if (type === "global_supervisor_rework")
        return "全局监工已安排返工";
    if (type === "global_supervisor_waiting_user")
        return "全局监工等待你处理阻塞";
    if (type === "global_supervisor_completed")
        return "全局任务已通过交付验收";
    if (type === "global_direct_dispatch_completion_synced")
        return "全局会话已同步最终总结";
    if (type === "global_direct_dispatch_rollback_synced")
        return "全局会话已同步撤销结果";
    if (type === "global_agent.supervising")
        return "全局任务已进入持续跟踪";
    if (type === "global_agent.run_completed")
        return "全局主 Agent 已完成总结";
    if (title)
        return sanitizeWorkchainUserText(title, surface === "global" ? "全局主 Agent 更新了处理进展。" : "群聊主 Agent 更新了处理进展。", 96);
    return "";
}
function buildMainAgentProgressCheckpoints(input, stages, evidence) {
    const items = [];
    const seen = new Set();
    const push = (item) => {
        const label = sanitizeWorkchainUserText(item.label || item.title, "", 110);
        if (!label)
            return;
        const detail = sanitizeWorkchainUserText(item.detail || "", "", 180);
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
        if (INTERNAL_TEXT_PATTERN.test(raw))
            continue;
        push({
            id: event.id || `${event.at || ""}:${event.type || ""}`,
            label: checkpointLabelFromEvent(event, input.surface),
            detail: compactText(event.detail || event.message || "", 180),
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
            if (INTERNAL_TEXT_PATTERN.test(raw))
                continue;
            push({
                id: step.id ? `step-${step.id}` : "",
                label: sanitizeWorkchainUserText(step.activeForm || step.active_form || step.summary || step.content, "主 Agent 更新了当前处理进展。", 110),
                detail: compactText(step.evidence?.[0] || step.detail || "", 160),
                status: checkpointStatus(step.status),
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
            push({ id: `stage-${stage.id}`, label: stage.label, detail: stage.summary, status: checkpointStatus(stage.status), phase: stage.id, source: "stage" });
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
        if (summary.acceptance_gate_passed === true || stringList(summary.verification_executed).length)
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
function sanitizeWorkchainUserText(value, fallback = "Agent 正在处理当前请求。", max = 260) {
    let text = compactText(value, max);
    if (!text)
        text = fallback;
    if (INTERNAL_TEXT_PATTERN.test(text)) {
        if (/error|失败|denied|invalid|权限|门禁/i.test(text))
            text = "Agent 遇到需要处理的执行保护或权限问题，排障信息已放入技术详情。";
        else if (/done|完成|receipt|回执/i.test(text))
            text = "Agent 已提交结果说明，主 Agent 正在汇总验收。";
        else
            text = fallback;
    }
    return compactText(sanitizeWorkchainTerminology(text
        .replace(/\bCoordinator\b/g, "主 Agent")
        .replace(/\bPipeline\b/g, "协作看板")
        .replace(/\bRuntime Kernel\b/g, "技术运行信息")
        .replace(/\bTrace Replay\b/g, "技术回放")
        .replace(/回执/g, "结果说明")), max);
}
function collectCompletionEvidence(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const technical = input.technical || {};
    const files = [
        ...stringList(summary.files_changed, 20),
        ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item) => item?.path || item?.file || item).filter(Boolean) : []),
    ].slice(0, 20);
    const verification = stringList(summary.verification_executed || completion.verification || completion.evidence, 12);
    const receipts = Number(summary.receipt_count || 0);
    const workersDone = (input.workers || []).filter((item) => ["done", "completed", "succeeded"].includes(String(item?.status || "").toLowerCase())).length;
    const evidence = [
        ...stringList(completion.evidence, 8),
        ...(files.length ? [`修改文件 ${files.length} 个`] : []),
        ...(verification.length ? [`执行检查 ${verification.length} 项`] : []),
        ...(receipts ? [`收到子 Agent 结果说明 ${receipts} 条`] : []),
        ...(workersDone ? [`完成执行目标 ${workersDone} 个`] : []),
    ];
    const risks = stringList([
        ...(summary.risks || []),
        ...(summary.remaining_items || []),
        ...(summary.blockers || []),
        ...(summary.needs || []),
        ...(technical.blockers || []),
        ...(completion.risks || []),
    ], 8);
    return { files, verification, receipts, workersDone, evidence: [...new Set(evidence)].slice(0, 8), risks };
}
function terminalWorkchain(input) {
    return ["completed", "done", "succeeded", "failed", "cancelled", "canceled", "supervising"].includes(String(input.status || "").toLowerCase())
        || ["completed", "failed", "cancelled", "reverted"].includes(String(input.phase || "").toLowerCase());
}
function hasExecutableWorkEvidence(input, evidence) {
    const actionIds = (input.actionIds || []).map(item => String(item || ""));
    const meaningfulActions = actionIds.filter(id => !["answer", "complete", "generate_final_reply"].includes(id));
    const summary = input.summary || {};
    return evidence.evidence.length > 0
        || evidence.files.length > 0
        || evidence.verification.length > 0
        || evidence.risks.length > 0
        || evidence.receipts > 0
        || evidence.workersDone > 0
        || meaningfulActions.length > 0
        || Array.isArray(input.workers) && input.workers.length > 0
        || Array.isArray(input.executions) && input.executions.length > 0
        || !!(summary.delivery_report || summary.deliveryReport);
}
function buildFinalSummaryQuality(input, evidence, terminal, headline, nextAction) {
    const summary = input.summary || {};
    const isOrdinaryConversation = input.mode === "conversation" && !hasExecutableWorkEvidence(input, evidence);
    const required = terminal && !isOrdinaryConversation && hasExecutableWorkEvidence(input, evidence);
    const verificationStatus = evidence.verification.length
        ? `已记录 ${evidence.verification.length} 项验证或检查。`
        : summary.acceptance_gate_passed === true
            ? "主 Agent 验收已通过，但没有捕获到单独的验证命令。"
            : summary.acceptance_gate_passed === false
                ? "主 Agent 验收未通过，缺口已整理。"
                : terminal && required
                    ? "暂无系统捕获的验证命令；这点会明确展示，不会被当作已验证。"
                    : "";
    const riskStatus = evidence.risks.length
        ? `仍有 ${evidence.risks.length} 项需要留意。`
        : terminal && required
            ? "暂无需要你额外处理的风险。"
            : "";
    const checks = [
        { id: "outcome", label: "完成内容", passed: !!headline, detail: headline },
        { id: "evidence", label: "交付证据", passed: !required || evidence.evidence.length > 0 || evidence.files.length > 0 || evidence.workersDone > 0 || evidence.receipts > 0, detail: evidence.evidence.slice(0, 3).join("；") },
        { id: "verification", label: "验证或验收", passed: !required || !!verificationStatus, detail: verificationStatus },
        { id: "risk", label: "风险说明", passed: !required || !!riskStatus, detail: riskStatus },
        { id: "next_action", label: "下一步", passed: !required || !!nextAction, detail: nextAction },
    ];
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
function buildUserVisibleText(input, evidence) {
    const status = String(input.status || "").toLowerCase();
    const phase = String(input.phase || input.mode || "").toLowerCase();
    const summary = input.summary || {};
    const completion = input.completion || {};
    const explicit = completion.summary || summary.headline || input.userText;
    if (status === "supervising")
        return "已受理并进入持续跟踪；最终交付通过验收后，我会再给你完整总结。";
    if (["failed"].includes(status) || phase === "failed")
        return sanitizeWorkchainUserText(explicit, "这次处理没有完成；原因和排障信息已放在技术详情里。");
    if (["cancelled", "canceled"].includes(status) || phase === "cancelled")
        return "本次处理已停止，不会继续执行。";
    if (["completed", "done", "succeeded"].includes(status) || phase === "completed") {
        if (explicit && !GENERIC_COMPLETION_REPLY_PATTERN.test(String(explicit).trim()))
            return sanitizeWorkchainUserText(explicit, "本轮处理已完成。");
        const parts = [];
        if (evidence.files.length)
            parts.push(`修改了 ${evidence.files.length} 个文件`);
        if (evidence.verification.length)
            parts.push(`完成 ${evidence.verification.length} 项检查`);
        if (evidence.workersDone)
            parts.push(`${evidence.workersDone} 个执行目标已完成`);
        return parts.length ? `已完成：${parts.join("，")}。` : "已完成本轮处理，并整理了结果给你。";
    }
    if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user")
        return sanitizeWorkchainUserText(explicit, "我需要你确认目标、范围或授权后再继续。");
    return sanitizeWorkchainUserText(explicit, input.surface === "global" ? "全局主 Agent 正在处理你的需求。" : "群聊主 Agent 正在协调处理你的需求。");
}
function buildTechnicalSections(input) {
    const technical = input.technical || {};
    const records = [];
    const troubleshooting = [];
    if (input.traceId)
        records.push({ label: "Trace", value: input.traceId });
    if (input.runId)
        records.push({ label: "Run", value: input.runId });
    if (input.taskId)
        records.push({ label: "Task", value: input.taskId });
    if (input.missionId)
        records.push({ label: "Mission", value: input.missionId });
    if (input.supervisorId)
        records.push({ label: "Supervisor", value: input.supervisorId });
    if (technical.execution_ids?.length)
        records.push({ label: "执行", value: technical.execution_ids.join("、") });
    if (technical.session_ids?.length)
        records.push({ label: "会话", value: technical.session_ids.join("、") });
    if ((input.actionIds || []).length)
        records.push({ label: "动作", value: (input.actionIds || []).join(", ") });
    const blockers = stringList([...(technical.blockers || []), ...((input.summary || {}).blockers || [])], 6);
    if (blockers.length)
        troubleshooting.push({ label: "阻塞", value: blockers.join("；") });
    if ((input.rawEvents || []).length)
        records.push({ label: "原始事件", value: `${(input.rawEvents || []).length} 条，默认隐藏` });
    return [
        { id: "troubleshooting", title: "排障摘要", items: troubleshooting },
        { id: "records", title: "完整记录", items: records },
    ].filter(section => section.items.length);
}
function buildMainAgentWorkchain(input) {
    const evidence = collectCompletionEvidence(input);
    const userVisibleText = buildUserVisibleText(input, evidence);
    const stages = [
        { id: "intake", label: "理解需求", status: stageStatus(input, "intake"), summary: "确认用户真正想完成什么" },
        { id: "plan", label: "形成计划", status: stageStatus(input, "plan"), summary: "拆成可执行步骤和验收标准" },
        { id: "execute", label: input.surface === "global" ? "调度执行" : "协作执行", status: stageStatus(input, "execute"), summary: "调用工具或派发子 Agent 落地" },
        { id: "verify", label: "检查验收", status: stageStatus(input, "verify"), summary: "核对文件、结果说明、验证和风险" },
        { id: "summarize", label: "总结交付", status: stageStatus(input, "summarize"), summary: "用用户能看懂的话说明结果" },
    ];
    const progressCheckpoints = buildMainAgentProgressCheckpoints(input, stages, evidence);
    const terminal = terminalWorkchain(input);
    const nextAction = input.completion?.next_action
        || (evidence.risks.length ? "先处理风险或缺口，再继续交付" : terminal ? "可以查看详情、继续补充要求或保存为知识" : "继续执行并在完成后给出总结");
    const finalSummaryQuality = buildFinalSummaryQuality(input, evidence, terminal, userVisibleText, nextAction);
    return {
        schema: "ccm-main-agent-workchain-v1",
        surface: input.surface,
        mode: input.mode || "",
        status: input.status || "",
        phase: input.phase || "",
        user_visible_text: userVisibleText,
        stages,
        progress_checkpoints: progressCheckpoints,
        completion_summary: {
            headline: userVisibleText,
            evidence: evidence.evidence,
            files: evidence.files,
            verification: evidence.verification,
            risks: evidence.risks,
            next_action: nextAction,
            verification_status: finalSummaryQuality.verification_status,
            risk_status: finalSummaryQuality.risk_status,
            final_summary_quality: finalSummaryQuality,
            terminal,
        },
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            final_summary_required: true,
        },
        technical_details: buildTechnicalSections(input),
    };
}
function completionSummaryHasEvidence(summary) {
    return Array.isArray(summary?.evidence) && summary.evidence.length > 0
        || Array.isArray(summary?.files) && summary.files.length > 0
        || Array.isArray(summary?.verification) && summary.verification.length > 0
        || Array.isArray(summary?.risks) && summary.risks.length > 0
        || !!summary?.delivery_report
        || !!summary?.deliveryReport;
}
function replyAlreadyHasFinalSummaryShape(value) {
    if (!value)
        return false;
    const text = String(value || "");
    const hasOutcome = /完成内容|处理总结|交付|已完成|已处理|结果/.test(text);
    const hasVerification = /验证|验收|检查|证据/.test(text);
    const hasRiskOrNext = /风险|需要留意|下一步|接下来/.test(text);
    return hasOutcome && hasVerification && hasRiskOrNext;
}
function formatMainAgentCompletionReply(options) {
    const original = sanitizeWorkchainUserText(options.reply, "", 1200);
    const generic = !original || GENERIC_COMPLETION_REPLY_PATTERN.test(original);
    const summary = options.workchain?.completion_summary || {};
    const quality = summary.final_summary_quality || {};
    const shouldShape = options.includeDetails === true || quality.required === true || completionSummaryHasEvidence(summary);
    if (!shouldShape && !generic && !options.includeDetails)
        return original;
    if (!generic && shouldShape && replyAlreadyHasFinalSummaryShape(original))
        return original;
    const lines = [generic ? (summary.headline || "本轮处理已完成。") : original];
    if (shouldShape && summary.evidence?.length)
        lines.push(`处理总结：\n- ${summary.evidence.slice(0, 6).join("\n- ")}`);
    else if (shouldShape && quality.required)
        lines.push("处理总结：主 Agent 已完成本轮处理，但没有更多可展示的业务证据。");
    if (shouldShape && summary.verification?.length)
        lines.push(`验证与验收：\n- ${summary.verification.slice(0, 6).join("\n- ")}`);
    else if (shouldShape && summary.verification_status)
        lines.push(`验证与验收：${summary.verification_status}`);
    if (shouldShape && summary.risks?.length)
        lines.push(`需要留意：\n- ${summary.risks.slice(0, 5).join("\n- ")}`);
    else if (shouldShape && summary.risk_status)
        lines.push(`需要留意：${summary.risk_status}`);
    if (shouldShape && summary.next_action)
        lines.push(`下一步：${summary.next_action}`);
    return lines.filter(Boolean).join("\n\n");
}
function runMainAgentWorkchainSelfTest() {
    const simple = buildMainAgentWorkchain({ surface: "global", status: "completed", mode: "conversation", userText: "已完成。", traceId: "trace-1", runId: "run-1" });
    const group = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        summary: { actual_file_changes: [{ path: "src/app.ts" }], verification_executed: ["npm test"], receipt_count: 2 },
        technical: { blockers: ["trace_id=hidden"], execution_ids: ["exec-1"] },
        traceId: "trace-2",
        taskId: "task-1",
    });
    const reply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: group, includeDetails: true });
    const shapedReply = formatMainAgentCompletionReply({ reply: "任务已建立", workchain: group, includeDetails: false });
    const ordinary = buildMainAgentWorkchain({ surface: "global", status: "completed", mode: "conversation", userText: "知识库压缩会按时间和主题整理。", traceId: "trace-3" });
    const ordinaryReply = formatMainAgentCompletionReply({ reply: "知识库压缩会按时间和主题整理。", workchain: ordinary, includeDetails: false });
    const checks = {
        simpleHasSummary: simple.user_visible_text.includes("已完成"),
        groupEvidenceVisible: group.completion_summary.evidence.length >= 3,
        finalSummaryQualityRequired: group.completion_summary.final_summary_quality?.required === true && group.completion_summary.final_summary_quality?.passed === true,
        technicalCollapsedPolicy: group.display_policy.technical_default_collapsed === true,
        noInternalLeakInUserText: !INTERNAL_TEXT_PATTERN.test(group.user_visible_text),
        replyHasSummary: reply.includes("处理总结") && reply.includes("修改文件"),
        shapedReplyAddsRequiredSections: shapedReply.includes("处理总结") && shapedReply.includes("验证与验收") && shapedReply.includes("需要留意") && shapedReply.includes("下一步"),
        ordinaryReplyStaysPlain: ordinaryReply === "知识库压缩会按时间和主题整理。" && !ordinaryReply.includes("处理总结"),
        traceInTechnical: group.technical_details.some(section => section.items.some((item) => item.label === "Trace" && item.value === "trace-2")),
        progressCheckpointsVisible: group.progress_checkpoints?.schema === "ccm-main-agent-progress-checkpoints-v1" && group.progress_checkpoints.items.length > 0,
        progressCheckpointsHideRawProtocol: !INTERNAL_TEXT_PATTERN.test(JSON.stringify(group.progress_checkpoints.items)),
    };
    return { pass: Object.values(checks).every(Boolean), checks, simple, group, reply, shapedReply, ordinaryReply };
}
//# sourceMappingURL=workchain.js.map