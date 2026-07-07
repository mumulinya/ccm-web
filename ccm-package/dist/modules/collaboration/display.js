"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMainAgentUserText = sanitizeMainAgentUserText;
exports.buildStreamlinedToolUseSummary = buildStreamlinedToolUseSummary;
exports.buildTechnicalDetailSections = buildTechnicalDetailSections;
exports.buildMainAgentDisplayStream = buildMainAgentDisplayStream;
const workchain_1 = require("../../agents/workchain");
function compactDisplayText(value, max = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}...`;
}
const USER_DISPLAY_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|scratchpad|trace_id|session_id|session_ids|native_session|task_agent_session|WorkerContextPacket|raw\s+receipt|raw\s+payload|raw_report|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|回执要求|任务级原生会话/i;
function sanitizeUserVisibleTerminology(value) {
    return String(value || "")
        .replace(/最终\s*收尾\s*门禁/g, "最终收尾检查")
        .replace(/交付\s*门禁/g, "交付验收")
        .replace(/验收\s*门禁/g, "验收检查")
        .replace(/完成\s*门禁/g, "完成检查")
        .replace(/合并\s*门禁/g, "合并前检查")
        .replace(/测试\s*和\s*合并\s*门禁/g, "测试和合并检查")
        .replace(/路径\s*门禁/g, "路径范围检查")
        .replace(/权限\s*门禁/g, "权限检查")
        .replace(/记忆\s*派发\s*门禁/g, "记忆派发检查")
        .replace(/压缩后\s*重注入\s*门禁/g, "压缩后重注入检查")
        .replace(/门禁\s*通过/g, "验收通过")
        .replace(/门禁\s*未通过/g, "验收未通过")
        .replace(/未过\s*门禁/g, "未通过验收")
        .replace(/记忆\s*gate\s*引用/gi, "记忆使用声明")
        .replace(/重注入\s*gate\s*引用/gi, "重注入声明")
        .replace(/gate\/候选引用\/使用状态/gi, "声明/候选使用状态")
        .replace(/\bgate\b/gi, "检查项")
        .replace(/门禁/g, "检查")
        .replace(/回执/g, "结果说明");
}
function sanitizeMainAgentUserText(value, fallback = "Agent 正在处理当前请求。", max = 260) {
    let text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text)
        text = fallback;
    if (USER_DISPLAY_INTERNAL_PATTERN.test(text)) {
        if (/error|失败|denied|invalid|权限|门禁/i.test(text))
            text = "Agent 遇到需要处理的执行保护或权限问题，排障信息已放入技术详情。";
        else if (/done|完成|receipt|回执/i.test(text))
            text = "Agent 已提交结构化完成信息，主 Agent 正在汇总验收。";
        else
            text = fallback;
    }
    text = text
        .replace(/\bCoordinator\b/g, "主 Agent")
        .replace(/\bPipeline\b/g, "协作看板")
        .replace(/\bRuntime Kernel\b/g, "技术运行信息")
        .replace(/\bTrace Replay\b/g, "技术回放");
    text = sanitizeUserVisibleTerminology(text);
    return compactDisplayText(text, max);
}
function buildStreamlinedToolUseSummary(input) {
    const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
    const steps = Array.isArray(input.steps) ? input.steps : [];
    const workers = Array.isArray(input.workers) ? input.workers : [];
    const executions = Array.isArray(input.executions) ? input.executions : [];
    const summary = input.summary || {};
    const counts = {
        reads: actionIds.filter(id => /read|inspect|query/.test(id)).length + steps.filter(step => /read|读取|查看|查询/i.test(String(step.id || step.content || ""))).length,
        writes: actionIds.filter(id => /create|govern|replan/.test(id)).length,
        dispatches: actionIds.includes("dispatch_child_agent") ? Math.max(1, workers.length, Number(summary.assignment_count || 0)) : workers.length,
        receipts: Number(summary.receipt_count || 0) || steps.filter(step => /receipt|回执/i.test(String(step.id || step.content || ""))).length,
        verifications: Number((Array.isArray(summary.verification_executed) ? summary.verification_executed.length : 0) || 0),
        executions: executions.length,
    };
    const parts = [];
    if (counts.reads)
        parts.push(`读取/检查 ${counts.reads} 项`);
    if (counts.writes)
        parts.push(`准备写入/治理 ${counts.writes} 项`);
    if (counts.dispatches)
        parts.push(`协作通道 ${counts.dispatches} 个`);
    if (counts.receipts)
        parts.push(`结果说明 ${counts.receipts} 条`);
    if (counts.verifications)
        parts.push(`验证 ${counts.verifications} 项`);
    if (counts.executions)
        parts.push(`执行记录 ${counts.executions} 条`);
    const toolSummary = parts.length ? parts.join("，") : "本轮没有需要展示的工具调用";
    return {
        type: "streamlined_tool_use_summary",
        tool_summary: toolSummary,
        counts,
        hidden_tool_uses: Math.max(0, actionIds.length + steps.length + executions.length - 3),
    };
}
function buildTechnicalDetailSections(input) {
    const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
    const permissions = Array.isArray(input.permissions) ? input.permissions : [];
    const technical = input.technical || {};
    const rawEvents = Array.isArray(input.rawEvents) ? input.rawEvents : [];
    const blocked = permissions.filter((item) => item?.allowed === false);
    const troubleshooting = [];
    const records = [];
    if (blocked.length)
        troubleshooting.push({ label: "待确认动作", value: blocked.map((item) => item.action_id).join("、") });
    if (technical.failed_gates?.length)
        troubleshooting.push({ label: "未通过验收", value: sanitizeMainAgentUserText(technical.failed_gates.map((item) => item.label || item.id || item).join("、"), "仍有验收检查未通过。", 240) });
    if (technical.blockers?.length)
        troubleshooting.push({ label: "阻塞", value: technical.blockers.slice(0, 5).join("；") });
    if (input.traceId)
        records.push({ label: "Trace", value: input.traceId });
    if (technical.execution_ids?.length)
        records.push({ label: "执行", value: technical.execution_ids.join("、") });
    if (technical.session_ids?.length)
        records.push({ label: "会话", value: technical.session_ids.join("、") });
    if (actionIds.length)
        records.push({ label: "动作", value: actionIds.join(", ") });
    if (input.observations)
        records.push({ label: "观察", value: compactDisplayText(JSON.stringify(input.observations), 360) });
    if (rawEvents.length)
        records.push({ label: "原始事件", value: `${rawEvents.length} 条，默认隐藏` });
    return [
        { id: "troubleshooting", title: "排障摘要", items: troubleshooting },
        { id: "records", title: "完整记录", items: records },
    ].filter(section => section.items.length > 0);
}
function buildMainAgentDisplayStream(input) {
    const actionIds = Array.isArray(input.actionIds) ? input.actionIds : [];
    const toolUseSummary = buildStreamlinedToolUseSummary(input);
    const modeLabels = {
        conversation: "普通回复",
        project_analysis: "项目分析",
        project_task: "项目任务",
        delegation: "协作执行",
        followup: "追加处理",
        governance: "任务治理",
    };
    const currentStep = (input.steps || []).find((step) => ["failed", "needs_confirmation", "reworking", "reviewing", "in_progress"].includes(step.status))
        || (input.steps || []).find((step) => step.status === "pending")
        || (input.steps || [])[0];
    const fallback = currentStep
        ? `${modeLabels[input.mode] || "主 Agent"}：${currentStep.activeForm || currentStep.active_form || currentStep.summary || currentStep.content}`
        : `${modeLabels[input.mode] || "主 Agent"}正在处理当前请求。`;
    const workchain = (0, workchain_1.buildMainAgentWorkchain)({
        surface: input.surface || "group",
        mode: input.mode,
        status: input.status,
        phase: input.phase,
        userText: input.userText,
        goal: input.goal,
        actionIds,
        steps: input.steps || [],
        workers: input.workers || [],
        executions: input.executions || [],
        summary: input.summary || {},
        technical: input.technical || {},
        traceId: input.traceId,
        taskId: input.taskId,
        runId: input.runId,
        missionId: input.missionId,
        supervisorId: input.supervisorId,
        rawEvents: input.rawEvents || [],
    });
    const deliveryReport = input.summary?.delivery_report
        || input.summary?.deliveryReport
        || input.technical?.delivery_report
        || input.technical?.deliveryReport
        || null;
    const dispatchLaunchSummary = input.summary?.dispatch_launch_summary
        || input.summary?.dispatchLaunchSummary
        || input.technical?.dispatch_launch_summary
        || input.technical?.dispatchLaunchSummary
        || null;
    if (deliveryReport) {
        workchain.delivery_report = deliveryReport;
        if (workchain.completion_summary)
            workchain.completion_summary.delivery_report = deliveryReport;
    }
    const text = workchain.user_visible_text || sanitizeMainAgentUserText(input.userText, fallback);
    const baseTechnicalDetails = buildTechnicalDetailSections(input);
    const technicalDetails = [
        ...baseTechnicalDetails,
        ...workchain.technical_details.filter((section) => !baseTechnicalDetails.some(existing => existing.id === section.id)),
    ];
    return {
        schema: "ccm-streamlined-display-v2",
        type: "streamlined_agent_display",
        user_visible: true,
        user_visible_text: text,
        text_message: { type: "streamlined_text", text },
        tool_use_summary: toolUseSummary,
        workchain,
        completion_summary: workchain.completion_summary,
        progress_checkpoints: workchain.progress_checkpoints,
        dispatch_launch_summary: dispatchLaunchSummary,
        dispatchLaunchSummary,
        delivery_report: deliveryReport,
        workchain_stages: workchain.stages,
        technical_details: technicalDetails,
        raw_events: Array.isArray(input.rawEvents) ? input.rawEvents.slice(-20) : [],
        todo: {
            visible: true,
            surface: "plan_panel",
            tool_message_visible: false,
            quiet_completed: true,
        },
        terminology: {
            sanitized: true,
            blocked_terms: ["Coordinator", "Pipeline", "Runtime Kernel", "trace_id", "session_ids"],
        },
    };
}
//# sourceMappingURL=display.js.map