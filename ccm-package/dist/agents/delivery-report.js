"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMainAgentDeliveryText = sanitizeMainAgentDeliveryText;
exports.formatDeliveryFileItem = formatDeliveryFileItem;
exports.shouldShowMainAgentDeliveryReport = shouldShowMainAgentDeliveryReport;
exports.buildMainAgentDeliveryReport = buildMainAgentDeliveryReport;
exports.formatMainAgentDeliveryReply = formatMainAgentDeliveryReply;
exports.runMainAgentDeliveryReportSelfTest = runMainAgentDeliveryReportSelfTest;
const INTERNAL_DELIVERY_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease|workchain/i;
function compactDeliveryText(value, max = 260) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}...`;
}
function sanitizeDeliveryUserTerminology(value) {
    return String(value || "")
        .replace(/最终\s*收尾\s*门禁/g, "最终收尾检查")
        .replace(/交付\s*门禁/g, "交付验收")
        .replace(/验收\s*门禁/g, "验收检查")
        .replace(/完成\s*门禁/g, "完成检查")
        .replace(/合并\s*门禁/g, "合并前检查")
        .replace(/测试\s*和\s*合并\s*门禁/g, "测试和合并检查")
        .replace(/路径\s*门禁/g, "路径范围检查")
        .replace(/权限\s*门禁/g, "权限检查")
        .replace(/记忆\s*gate\s*引用/gi, "记忆使用声明")
        .replace(/重注入\s*gate\s*引用/gi, "重注入声明")
        .replace(/门禁\s*通过/g, "验收通过")
        .replace(/门禁\s*未通过/g, "验收未通过")
        .replace(/\bgate\b/gi, "检查项")
        .replace(/门禁/g, "检查")
        .replace(/回执/g, "结果说明");
}
function sanitizeMainAgentDeliveryText(value, fallback = "本轮处理已完成。", max = 260) {
    let text = compactDeliveryText(value, max);
    if (!text)
        text = fallback;
    if (INTERNAL_DELIVERY_TEXT_PATTERN.test(text)) {
        if (/error|失败|denied|invalid|权限|门禁/i.test(text))
            text = "执行过程中遇到需要处理的问题，排障信息已放入技术详情。";
        else if (/done|完成|receipt|回执/i.test(text))
            text = "子 Agent 已提交结果说明，主 Agent 已完成汇总。";
        else
            text = fallback;
    }
    return compactDeliveryText(sanitizeDeliveryUserTerminology(text
        .replace(/\bCoordinator\b/g, "主 Agent")
        .replace(/\bPipeline\b/g, "协作看板")
        .replace(/\bRuntime Kernel\b/g, "技术运行信息")
        .replace(/\bTrace Replay\b/g, "技术回放")), max);
}
function splitDeliveryValues(value) {
    if (Array.isArray(value))
        return value.flatMap(splitDeliveryValues);
    if (value && typeof value === "object") {
        if (value.label || value.summary || value.reason || value.command || value.path || value.file || value.title) {
            return [formatDeliveryObject(value)].filter(Boolean);
        }
        return [];
    }
    const text = String(value || "").trim();
    if (!text || ["无", "暂无", "未提供", "未填写", "null", "undefined"].includes(text))
        return [];
    return text.split(/[；;,\n]/).map(item => item.trim()).filter(Boolean);
}
function uniqueDeliveryStrings(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const raw of splitDeliveryValues(list)) {
            const value = sanitizeMainAgentDeliveryText(raw, "", 360);
            if (!value || seen.has(value))
                continue;
            seen.add(value);
            result.push(value);
        }
    }
    return result;
}
function asArray(value) {
    return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}
function firstObject(...values) {
    return values.find(value => value && typeof value === "object" && !Array.isArray(value)) || null;
}
function firstBoolean(...values) {
    for (const value of values) {
        if (typeof value === "boolean")
            return value;
        const text = String(value ?? "").trim().toLowerCase();
        if (["true", "passed", "pass", "ok", "success", "yes"].includes(text))
            return true;
        if (["false", "failed", "fail", "no"].includes(text))
            return false;
    }
    return null;
}
function formatDeliveryObject(item) {
    if (!item || typeof item !== "object")
        return String(item || "").trim();
    if (item.path || item.file || item.name)
        return formatDeliveryFileItem(item);
    if (item.command || item.result || item.status || item.summary) {
        const command = item.command || item.name || "";
        const result = item.result || item.statusText || item.status || item.summary || "";
        return compactDeliveryText([command, result].filter(Boolean).join(" - "), 360);
    }
    return compactDeliveryText(item.label || item.title || item.reason || item.detail || "", 360);
}
function formatDeliveryFileItem(item) {
    if (!item || typeof item === "string")
        return sanitizeMainAgentDeliveryText(item, "", 320);
    const pathText = item.path || item.file || item.name || "";
    if (!pathText)
        return "";
    const project = item.project || item.target_project || item.agent || "";
    const status = item.statusText || item.status || item.status_kind || "";
    const diff = Number(item.additions || item.deletions || item.diff?.additions || item.diff?.deletions || 0) > 0
        ? ` +${Number(item.additions || item.diff?.additions || 0)}/-${Number(item.deletions || item.diff?.deletions || 0)}`
        : "";
    return sanitizeMainAgentDeliveryText([
        project ? `${project}:` : "",
        pathText,
        status ? `(${status})` : "",
        diff,
    ].filter(Boolean).join(" "), "", 360);
}
function normalizeDeliveryStatus(status) {
    const value = String(status || "").toLowerCase();
    if (["done", "completed", "succeeded", "success", "ok"].includes(value))
        return "done";
    if (["failed", "error", "rejected"].includes(value))
        return "failed";
    if (["cancelled", "canceled", "stopped"].includes(value))
        return "cancelled";
    return "waiting";
}
function deliveryStatusLabel(status) {
    if (status === "done")
        return "已完成";
    if (status === "failed")
        return "未完成";
    if (status === "cancelled")
        return "已取消";
    return "继续处理中";
}
function deliveryTitle(status) {
    if (status === "done")
        return "任务交付完成";
    if (status === "failed")
        return "任务执行失败";
    if (status === "cancelled")
        return "任务已取消";
    return "任务需要继续处理";
}
function getNestedReport(input) {
    const report = input.report?.schema === "ccm-main-agent-delivery-report-v1"
        ? input.report.raw_report || {}
        : input.report || {};
    const summary = input.summary || {};
    const completion = input.completion || {};
    const workchainSummary = input.workchain?.completion_summary || {};
    return { report, summary, completion, workchainSummary };
}
function collectDeliveryFiles(input) {
    const { report, summary, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const run = input.run || {};
    const candidates = [
        report.actual_file_changes,
        report.file_changes,
        report.files_changed,
        report.files_modified,
        report.files,
        report.changes,
        report.delivery?.files,
        summary.actual_file_changes,
        summary.file_changes,
        summary.files_changed,
        summary.files_modified,
        summary.files,
        summary.changes,
        task.file_changes?.files,
        task.delivery_summary?.actual_file_changes,
        run.files_modified,
        workchainSummary.files,
    ];
    const flattened = candidates.flatMap(value => {
        if (value?.files && Array.isArray(value.files))
            return value.files;
        return asArray(value);
    });
    const seen = new Set();
    return flattened.map(formatDeliveryFileItem).filter(item => {
        if (!item || seen.has(item))
            return false;
        seen.add(item);
        return true;
    }).slice(0, 16);
}
function collectDeliveryVerification(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    return uniqueDeliveryStrings(report.verification_executed, report.verification_results, report.verification, report.checks, report.delivery?.verification, summary.verification_executed, summary.verification_results, summary.verification, summary.checks, task.receipt?.verification, completion.verification, completion.evidence, workchainSummary.verification).slice(0, 12);
}
function firstDeliveryNumber(...values) {
    for (const value of values) {
        if (value === undefined || value === null || value === "")
            continue;
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric >= 0)
            return numeric;
    }
    return null;
}
function formatDeliveryMissingVerification(item) {
    if (!item || typeof item !== "object")
        return sanitizeMainAgentDeliveryText(item, "未提供项目验证命令执行证据", 260);
    const agent = sanitizeMainAgentDeliveryText(item.agent || item.project || item.target || "未知 Agent", "未知 Agent", 80);
    const required = uniqueDeliveryStrings(item.required, item.commands, item.command, item.expected).slice(0, 3);
    const reason = sanitizeMainAgentDeliveryText(item.reason || item.detail || "", "", 160);
    return sanitizeMainAgentDeliveryText(`${agent}：${required.length ? required.join(" / ") : "未提供项目验证命令执行证据"}${reason ? `（${reason}）` : ""}`, "", 320);
}
function collectDeliveryVerificationEvidence(input, status) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const executedExplicit = uniqueDeliveryStrings(report.verification_executed, report.executed_verification, summary.verification_executed, summary.executed_verification, completion.verification_executed, workchainSummary.verification_executed);
    const externalRunnerEvidence = uniqueDeliveryStrings(report.external_runner_verification, summary.external_runner_verification, completion.external_runner_verification, workchainSummary.external_runner_verification);
    const recordedResults = uniqueDeliveryStrings(report.verification_results, summary.verification_results, report.verification, summary.verification, report.checks, summary.checks, report.delivery?.verification, task.receipt?.verification, completion.verification, completion.evidence, workchainSummary.verification);
    const executed = uniqueDeliveryStrings(executedExplicit, externalRunnerEvidence, executedExplicit.length || externalRunnerEvidence.length ? [] : recordedResults).slice(0, 12);
    const failed = uniqueDeliveryStrings(report.verification_failed, report.failed_verification, summary.verification_failed, summary.failed_verification, completion.verification_failed, workchainSummary.verification_failed).slice(0, 8);
    const suggested = uniqueDeliveryStrings(report.verification_suggested, report.suggested_verification, report.verification_recommended, summary.verification_suggested, summary.suggested_verification, summary.verification_recommended, completion.verification_suggested, workchainSummary.verification_suggested).slice(0, 8);
    const missingRequired = uniqueDeliveryStrings(asArray(report.verification_required_missing).map(formatDeliveryMissingVerification), asArray(summary.verification_required_missing).map(formatDeliveryMissingVerification), asArray(completion.verification_required_missing).map(formatDeliveryMissingVerification), asArray(workchainSummary.verification_required_missing).map(formatDeliveryMissingVerification)).slice(0, 8);
    const requiredGatePassed = firstBoolean(report.verification_required_gate_passed, summary.verification_required_gate_passed, completion.verification_required_gate_passed, workchainSummary.verification_required_gate_passed);
    const sourceGatePassed = firstBoolean(report.verification_source_gate_passed, summary.verification_source_gate_passed, completion.verification_source_gate_passed, workchainSummary.verification_source_gate_passed);
    const externalRunnerCount = firstDeliveryNumber(report.external_runner_verification_count, summary.external_runner_verification_count, completion.external_runner_verification_count, workchainSummary.external_runner_verification_count) ?? externalRunnerEvidence.length;
    const items = [];
    if (executed.length) {
        const label = executedExplicit.length || externalRunnerEvidence.length ? "已实际执行" : "已记录验证结果";
        items.push(`${label} ${executed.length} 项验证：${executed.slice(0, 3).join("；")}`);
    }
    if (failed.length)
        items.push(`失败验证 ${failed.length} 项：${failed.slice(0, 3).join("；")}`);
    if (suggested.length)
        items.push(`仅建议/未执行验证 ${suggested.length} 项：${suggested.slice(0, 3).join("；")}；这些不算完成证据。`);
    if (missingRequired.length)
        items.push(`项目必需验证缺口 ${missingRequired.length} 项：${missingRequired.slice(0, 3).join("；")}`);
    else if (requiredGatePassed === true)
        items.push("项目配置要求的验证命令：已覆盖。");
    else if (requiredGatePassed === false)
        items.push("项目配置要求的验证命令：未覆盖，仍需补跑。");
    if (externalRunnerCount > 0)
        items.push(`外部 Runner 证据 ${externalRunnerCount} 项：验证来源已记录。`);
    else if (sourceGatePassed === true)
        items.push("验证来源：已通过外部 Runner 口径。");
    else if (sourceGatePassed === false)
        items.push("外部 Runner 证据缺失：当前不能只凭子 Agent 自述判定完成。");
    if (!items.length) {
        items.push(status === "done"
            ? "暂无系统捕获的实际验证证据；建议核对技术详情里的执行记录后再最终确认。"
            : "验证证据仍在收集，完成后会在这里展示实际执行结果。");
    }
    const needsAttention = failed.length > 0
        || missingRequired.length > 0
        || requiredGatePassed === false
        || sourceGatePassed === false
        || (suggested.length > 0 && executed.length === 0);
    const evidenceStatus = needsAttention
        ? "needs_attention"
        : executed.length || externalRunnerCount > 0 || requiredGatePassed === true
            ? "ready"
            : status === "waiting" ? "tracking" : "weak";
    const metricValue = failed.length
        ? `${failed.length} 项失败`
        : missingRequired.length
            ? `缺 ${missingRequired.length} 项`
            : executed.length
                ? `${executed.length} 项${executedExplicit.length || externalRunnerEvidence.length ? "实际执行" : "已记录"}`
                : suggested.length
                    ? "仅建议"
                    : evidenceStatus === "weak" ? "证据不足" : "收集中";
    return {
        schema: "ccm-main-agent-verification-evidence-v1",
        title: "验收证据",
        status: evidenceStatus,
        status_label: evidenceStatus === "ready" ? "证据充分" : evidenceStatus === "needs_attention" ? "需补齐" : evidenceStatus === "tracking" ? "收集中" : "证据偏弱",
        metric_value: metricValue,
        metric_detail: items.slice(0, 2).join("；"),
        metric_tone: evidenceStatus === "ready" ? "success" : evidenceStatus === "needs_attention" ? "warning" : evidenceStatus === "weak" ? "warning" : "muted",
        executed_count: executed.length,
        failed_count: failed.length,
        suggested_count: suggested.length,
        missing_required_count: missingRequired.length,
        external_runner_count: externalRunnerCount,
        required_gate_passed: requiredGatePassed,
        source_gate_passed: sourceGatePassed,
        executed,
        failed,
        suggested,
        missing_required: missingRequired,
        items: uniqueDeliveryStrings(items).slice(0, 8),
        next_action: needsAttention
            ? "先补齐失败、缺失或仅建议的验证，再进行最终验收。"
            : evidenceStatus === "ready"
                ? "可以结合改动明细和验收结论一起核对。"
                : "等待实际验证完成后再下最终结论。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function deliveryIndependentReviewLabel(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text)
        return "";
    if (["passed", "pass", "approved", "approve", "success", "ok", "done", "complete", "completed"].includes(text) || /通过|批准|无阻塞|无高风险/.test(text))
        return "已通过";
    if (["failed", "fail", "rejected", "reject", "blocked", "block"].includes(text) || /未通过|拒绝|阻塞|风险/.test(text))
        return "未通过";
    if (["missing", "pending", "waiting", "required"].includes(text) || /待|缺|等待/.test(text))
        return "待补齐";
    if (["not_required", "not-required", "none"].includes(text))
        return "未触发";
    return sanitizeMainAgentDeliveryText(value, "已记录", 80);
}
function formatDeliveryIndependentReviewEvidence(item) {
    if (!item || typeof item !== "object")
        return sanitizeMainAgentDeliveryText(item, "", 260);
    const reviewer = sanitizeMainAgentDeliveryText(item.reviewer || item.agent || item.by || item.reviewedBy || item.reviewed_by || "", "", 80);
    const verdict = deliveryIndependentReviewLabel(item.verdict || item.status || item.result || "");
    const summary = sanitizeMainAgentDeliveryText(item.summary || item.note || item.comment || item.message || "", "", 220);
    const evidence = uniqueDeliveryStrings(item.evidence, item.checks, item.findings, item.filesReviewed, item.files_reviewed).slice(0, 2).join("；");
    const core = [verdict, summary].filter(Boolean).join(" - ") || evidence || "独立复核已记录";
    return sanitizeMainAgentDeliveryText(`${reviewer ? `${reviewer}：` : ""}${core}`, "", 320);
}
function collectDeliveryIndependentReview(input, status) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const gate = firstObject(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, completion.independent_review_gate, completion.independentReviewGate, workchainSummary.independent_review_gate, workchainSummary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    const required = firstBoolean(report.independent_review_required, report.independentReviewRequired, summary.independent_review_required, summary.independentReviewRequired, completion.independent_review_required, completion.independentReviewRequired, workchainSummary.independent_review_required, workchainSummary.independentReviewRequired, task.delivery_summary?.independent_review_required, task.delivery_summary?.independentReviewRequired, task.requires_independent_review, task.requiresIndependentReview, gate?.required);
    const passed = firstBoolean(report.independent_review_gate_passed, report.independentReviewGatePassed, summary.independent_review_gate_passed, summary.independentReviewGatePassed, completion.independent_review_gate_passed, completion.independentReviewGatePassed, workchainSummary.independent_review_gate_passed, workchainSummary.independentReviewGatePassed, task.delivery_summary?.independent_review_gate_passed, task.delivery_summary?.independentReviewGatePassed, gate?.pass, gate?.passed);
    const gateStatus = String(gate?.status
        || report.independent_review_status
        || report.independentReviewStatus
        || summary.independent_review_status
        || summary.independentReviewStatus
        || "").trim();
    const evidence = asArray([
        report.independent_review_evidence,
        report.independentReviewEvidence,
        report.independent_review,
        report.independentReview,
        report.code_review,
        report.codeReview,
        summary.independent_review_evidence,
        summary.independentReviewEvidence,
        summary.independent_review,
        summary.independentReview,
        summary.code_review,
        summary.codeReview,
        completion.independent_review_evidence,
        completion.independentReviewEvidence,
        workchainSummary.independent_review_evidence,
        workchainSummary.independentReviewEvidence,
        task.delivery_summary?.independent_review_evidence,
        task.delivery_summary?.independentReviewEvidence,
        gate?.evidence,
    ]).flatMap(asArray).map(formatDeliveryIndependentReviewEvidence).filter(Boolean);
    if (required !== true && !evidence.length)
        return [];
    const headline = required === true
        ? passed === true
            ? "独立复核：已通过"
            : passed === false || /failed|rejected|blocked/i.test(gateStatus)
                ? "独立复核：未通过，仍需处理复核意见"
                : status === "cancelled"
                    ? "独立复核：任务已停止，未继续复核"
                    : "独立复核：待补齐"
        : "独立复核：已记录";
    const reason = sanitizeMainAgentDeliveryText(gate?.reason || summary.independent_review_reason || report.independent_review_reason || "", "", 220);
    return uniqueDeliveryStrings(headline, required === true && reason ? `触发原因：${reason}` : "", evidence.slice(0, 4)).slice(0, 8);
}
function collectDeliveryRisks(input) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const run = input.run || {};
    const independentReviewGate = firstObject(report.independent_review_gate, report.independentReviewGate, summary.independent_review_gate, summary.independentReviewGate, task.delivery_summary?.independent_review_gate, task.delivery_summary?.independentReviewGate);
    const independentReviewRequired = firstBoolean(report.independent_review_required, report.independentReviewRequired, summary.independent_review_required, summary.independentReviewRequired, task.delivery_summary?.independent_review_required, task.delivery_summary?.independentReviewRequired, task.requires_independent_review, task.requiresIndependentReview, independentReviewGate?.required);
    const independentReviewPassed = firstBoolean(report.independent_review_gate_passed, report.independentReviewGatePassed, summary.independent_review_gate_passed, summary.independentReviewGatePassed, task.delivery_summary?.independent_review_gate_passed, task.delivery_summary?.independentReviewGatePassed, independentReviewGate?.pass, independentReviewGate?.passed);
    const independentReviewRisk = independentReviewRequired === true && independentReviewPassed !== true
        ? `复杂变更缺少独立复核${independentReviewGate?.reason ? `：${independentReviewGate.reason}` : ""}`
        : "";
    const failedChecks = [
        ...(asArray(report.acceptance_gate?.failed_checks).map((item) => item?.label || item?.id || item)),
        ...(asArray(summary.acceptance_gate?.failed_checks).map((item) => item?.label || item?.id || item)),
    ];
    return uniqueDeliveryStrings(run.error, input.status && normalizeDeliveryStatus(input.status) !== "done" ? input.detail : "", report.risks, report.remaining_items, report.blockers, report.needs, report.blocking_needs, report.advisory_needs, report.verification_required_missing, summary.risks, summary.remaining_items, summary.blockers, summary.needs, summary.blocking_needs, summary.advisory_needs, summary.verification_required_missing, independentReviewRisk, task.receipt?.blockers, task.receipt?.needs, completion.risks, workchainSummary.risks, failedChecks).slice(0, 10);
}
function deliveryPlanStepText(item) {
    if (!item || typeof item !== "object")
        return sanitizeMainAgentDeliveryText(item, "", 180);
    return sanitizeMainAgentDeliveryText(item.content || item.subject || item.title || item.label || item.summary || item.activeForm || item.active_form || "", "", 180);
}
function collectDeliveryPlanReview(input, status) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const run = input.run || {};
    const plan = firstObject(report.plan_mode, report.planMode, summary.plan_mode, summary.planMode, completion.plan_mode, completion.planMode, workchainSummary.plan_mode, workchainSummary.planMode, task.plan_mode, task.planMode, run.plan_mode, run.planMode);
    const planAlignment = firstObject(report.plan_alignment, report.planAlignment, summary.plan_alignment, summary.planAlignment, completion.plan_alignment, completion.planAlignment, workchainSummary.plan_alignment, workchainSummary.planAlignment, task.delivery_summary?.plan_alignment, task.delivery_summary?.planAlignment);
    const todo = firstObject(report.todo_plan, report.todoPlan, summary.todo_plan, summary.todoPlan, task.todo_plan, task.todoPlan, run.todo_plan, run.todoPlan);
    const modeTitle = sanitizeMainAgentDeliveryText(plan?.title || plan?.mode_label || plan?.modeLabel || (plan ? "执行前计划" : ""), "", 120);
    const scope = uniqueDeliveryStrings(plan?.impact_scope?.areas, plan?.impactScope?.areas, plan?.impact_scope?.projects, plan?.impactScope?.projects).slice(0, 3);
    const steps = uniqueDeliveryStrings(report.plan_steps, report.planSteps, summary.plan_steps, summary.planSteps, asArray(plan?.steps).map(deliveryPlanStepText), asArray(todo?.steps).map(deliveryPlanStepText)).slice(0, 4);
    const acceptance = uniqueDeliveryStrings(plan?.acceptance, plan?.acceptance_criteria, plan?.acceptanceCriteria, report.acceptance_criteria, report.acceptanceCriteria, summary.acceptance_criteria, summary.acceptanceCriteria, task.acceptance_criteria, task.acceptanceCriteria, run.acceptance_criteria, run.acceptanceCriteria).slice(0, 3);
    const planStatus = String(planAlignment?.status || "").toLowerCase();
    const alignmentText = planStatus === "aligned"
        ? "计划核对：已对齐"
        : ["deviated", "needs_evidence", "failed"].includes(planStatus)
            ? "计划核对：仍有缺口"
            : planStatus
                ? `计划核对：${planAlignment.status_label || planAlignment.statusLabel || planAlignment.status}`
                : "";
    const fallback = status === "waiting"
        ? "计划回顾：主 Agent 正在按当前计划推进，完成后会补齐验收和总结。"
        : "计划回顾：未捕获到单独计划记录，主 Agent 已按交付证据整理结果。";
    const items = uniqueDeliveryStrings(modeTitle ? `执行前计划：${modeTitle}` : "", scope.length ? `计划范围：${scope.join("；")}` : "", steps.length ? `计划步骤：${steps.join("；")}` : "", acceptance.length ? `验收标准：${acceptance.join("；")}` : "", alignmentText).slice(0, 6);
    return items.length ? items : [fallback];
}
function formatDeliveryAcceptanceCheck(item) {
    if (!item || typeof item !== "object")
        return sanitizeMainAgentDeliveryText(item, "", 260);
    const label = item.label || item.title || item.name || item.id || "验收项";
    const ok = firstBoolean(item.ok, item.pass, item.passed, item.status);
    const detail = sanitizeMainAgentDeliveryText(item.detail || item.reason || item.summary || item.message || "", "", 160);
    const prefix = ok === true ? "通过" : ok === false ? "待处理" : "核对";
    return sanitizeMainAgentDeliveryText(`${prefix}：${label}${detail && !String(label).includes(detail) ? `（${detail}）` : ""}`, "", 260);
}
function collectDeliveryAcceptance(input, status, verification, risks) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const run = input.run || {};
    const gate = firstObject(report.acceptance_gate, summary.acceptance_gate, completion.acceptance_gate, workchainSummary.acceptance_gate, task.delivery_summary?.acceptance_gate);
    const planAlignment = firstObject(report.plan_alignment, report.planAlignment, summary.plan_alignment, summary.planAlignment, completion.plan_alignment, completion.planAlignment, workchainSummary.plan_alignment, workchainSummary.planAlignment, task.delivery_summary?.plan_alignment, task.delivery_summary?.planAlignment);
    const passed = firstBoolean(report.acceptance_gate_passed, report.acceptance_passed, summary.acceptance_gate_passed, summary.acceptance_passed, completion.acceptance_gate_passed, completion.acceptance_passed, workchainSummary.acceptance_gate_passed, task.delivery_summary?.acceptance_gate_passed, gate?.pass, gate?.passed);
    const items = [];
    if (passed === true)
        items.push("主 Agent 验收：已通过");
    else if (passed === false)
        items.push("主 Agent 验收：未通过，仍需处理缺口");
    else if (status === "done")
        items.push(verification.length || !risks.length ? "主 Agent 验收：已完成交付复核" : "主 Agent 验收：仍有风险需要复核");
    else if (status === "failed")
        items.push("主 Agent 验收：未通过，原因已整理在未完成原因里");
    else if (status === "cancelled")
        items.push("主 Agent 验收：任务已停止，未继续验收");
    else
        items.push("主 Agent 验收：仍在等待最终复核");
    const failedChecks = asArray(gate?.failed_checks || gate?.failedChecks)
        .map((item) => formatDeliveryAcceptanceCheck({ ...(typeof item === "object" ? item : { label: item }), ok: false }));
    const checks = asArray(gate?.checks).map(formatDeliveryAcceptanceCheck);
    const criteria = uniqueDeliveryStrings(report.acceptance, report.acceptance_criteria, report.acceptanceCriteria, summary.acceptance, summary.acceptance_criteria, summary.acceptanceCriteria, task.acceptance_criteria, task.acceptanceCriteria, run.acceptance_criteria, run.acceptanceCriteria).slice(0, 3).map(item => `验收标准：${item}`);
    const planStatus = String(planAlignment?.status || "").toLowerCase();
    const planLabel = planStatus === "aligned" ? "计划核对：已对齐"
        : ["deviated", "needs_evidence", "failed"].includes(planStatus) ? "计划核对：仍有缺口"
            : planStatus ? `计划核对：${planAlignment.status_label || planAlignment.statusLabel || planAlignment.status}` : "";
    return uniqueDeliveryStrings(items, failedChecks, checks, criteria, planLabel).slice(0, 8);
}
function collectDeliveryCompleted(input, files, verification, status) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const task = input.task || {};
    const headline = sanitizeMainAgentDeliveryText(report.headline || report.summary || report.user_text || summary.headline || summary.summary || completion.summary || input.detail || task.status_detail || workchainSummary.headline, "", 500);
    const evidence = uniqueDeliveryStrings(headline, report.completed, report.evidence, summary.completed, summary.evidence, completion.evidence, workchainSummary.evidence).filter(item => item !== headline).slice(0, 6);
    const result = [headline, ...evidence].filter(Boolean);
    if (!result.length && files.length)
        result.push(`已整理 ${files.length} 个文件变更。`);
    if (!result.length && verification.length)
        result.push(`已完成 ${verification.length} 项检查。`);
    if (result.length)
        return result;
    if (status === "failed")
        return ["任务没有完成，主 Agent 已整理未完成原因和下一步。"];
    if (status === "cancelled")
        return ["任务已停止，主 Agent 已整理当前状态。"];
    if (status === "waiting")
        return ["任务仍在处理中，主 Agent 会继续跟进并在完成后总结。"];
    return ["本轮处理已经完成，结果已整理给你。"];
}
function collectDeliveryNextAction(input, status, risks) {
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const explicit = sanitizeMainAgentDeliveryText(report.next_action || summary.next_action || completion.next_action || workchainSummary.next_action, "", 260);
    if (explicit)
        return [explicit];
    if (status === "done")
        return ["可以查看改动详情，或继续补充新的要求。"];
    if (status === "failed")
        return ["可以根据上面的风险重新执行，或补充范围后让主 Agent 继续处理。"];
    if (status === "cancelled")
        return ["任务已经停止；如果需要，可以重新发起新的需求。"];
    if (risks.length)
        return ["先处理风险或缺口，主 Agent 会继续跟进验收。"];
    return ["主 Agent 会继续协调执行，并在完成后给出最终交付总结。"];
}
function buildDeliverySection(id, title, items, empty) {
    const normalized = uniqueDeliveryStrings(items).slice(0, 12);
    return { id, title, items: normalized.length ? normalized : [empty] };
}
function deliveryPrimarySectionTitle(status) {
    if (status === "done")
        return "完成内容";
    if (status === "failed")
        return "处理结果";
    if (status === "cancelled")
        return "停止说明";
    return "当前进展";
}
function deliveryPrimarySectionEmpty(status) {
    if (status === "failed")
        return "任务没有完成，未完成原因已整理到风险与待确认。";
    if (status === "cancelled")
        return "任务已停止，没有继续执行。";
    if (status === "waiting")
        return "任务仍在处理中。";
    return "本轮处理已完成。";
}
function deliveryRiskSectionEmpty(status) {
    if (status === "failed")
        return "未捕获到明确失败原因；排障信息已放入技术详情。";
    if (status === "cancelled")
        return "任务已停止；没有继续执行。";
    return "暂无需要你额外处理的风险。";
}
function formatDeliverySection(title, items) {
    return [`${title}：`, ...items.map(item => `- ${item}`)].join("\n");
}
function buildDeliveryFinalSummaryQuality(status, sections, nextAction) {
    const requiredSections = status === "done"
        ? ["completed", "plan_review", "scope", "verification", "verification_evidence", "acceptance", "risks", "next_action"]
        : status === "waiting"
            ? ["completed", "plan_review", "risks", "next_action"]
            : ["completed", "acceptance", "risks", "next_action"];
    const sectionHasItems = (id) => {
        const section = sections.find(item => item?.id === id);
        return Array.isArray(section?.items) && section.items.some((item) => String(item || "").trim());
    };
    const checks = requiredSections.map(id => ({
        id,
        label: {
            completed: "完成内容",
            plan_review: "计划回顾",
            scope: "涉及范围",
            verification: "验证结果",
            verification_evidence: "验收证据",
            acceptance: "验收结论",
            risks: status === "failed" ? "未完成原因" : status === "cancelled" ? "停止原因" : "风险与待确认",
            next_action: "下一步",
        }[id] || id,
        passed: sectionHasItems(id),
    }));
    if (nextAction.length) {
        const existing = checks.find(item => item.id === "next_action");
        if (existing)
            existing.passed = true;
    }
    return {
        schema: "ccm-main-agent-final-summary-quality-v1",
        source: "delivery_report",
        required: true,
        passed: checks.every(item => item.passed),
        checks,
        missing: checks.filter(item => !item.passed).map(item => item.label),
        technical_default_collapsed: true,
    };
}
function buildDeliveryPickupSummary(input, status, completed, planReview, files, verification, acceptance, independentReview, risks, nextAction) {
    const done = status === "done";
    const failed = status === "failed";
    const cancelled = status === "cancelled";
    const reviewItems = uniqueDeliveryStrings(risks.slice(0, 4).map(item => `${cancelled ? "停止原因" : "注意"}：${item}`), independentReview.slice(0, 2).map(item => `复核：${item}`), acceptance.slice(0, 2).map(item => `验收：${item}`), planReview.slice(0, 2).map(item => `计划：${item}`), files.slice(0, 2).map(item => `改动：${item}`), verification.slice(0, 2).map(item => `验证：${item}`)).slice(0, 8);
    return {
        schema: "ccm-main-agent-pickup-summary-v1",
        title: done ? "回来继续看这里" : failed ? "恢复处理时先看这里" : cancelled ? "任务停止记录" : "当前接续提示",
        status,
        status_label: done ? "已完成" : failed ? "未完成" : cancelled ? "已停止" : "处理中",
        headline: completed[0] || (done ? "这项任务已经完成，主 Agent 已整理交付结果。" : failed ? "这项任务没有完成，未完成原因已整理。" : cancelled ? "这项任务已停止。" : "这项任务仍在处理中。"),
        current_state: done
            ? "可以直接查看完成内容、涉及范围和验证结果；原始执行记录在技术详情里。"
            : failed
                ? "可以从未完成原因继续处理，系统会保留已收集到的证据。"
                : cancelled
                    ? "当前不会继续执行；如需推进，可以重新发起或恢复需求。"
                    : "主 Agent 会继续协调执行，并在完成后整理最终总结。",
        review_items: reviewItems.length ? reviewItems : [done ? "暂无额外风险需要处理。" : "暂无更多可展示的业务证据；技术细节可在技术详情中查看。"],
        resume_action: nextAction[0] || (done ? "可以继续补充新的要求。" : "可以让主 Agent 继续处理。"),
        technical_hint: "底层执行记录和排障信息默认收在技术详情里。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
        source: input.surface,
    };
}
function buildDeliveryCompletionCard(input, status, completed, files, verification, verificationEvidence, acceptance, independentReview, risks, nextAction) {
    const done = status === "done";
    const failed = status === "failed";
    const cancelled = status === "cancelled";
    const riskText = risks.length
        ? `${risks.length} 项`
        : done ? "无待处理风险" : failed ? "已整理原因" : cancelled ? "已停止" : "等待复核";
    const highlights = uniqueDeliveryStrings(completed).slice(0, 4);
    const acceptanceValue = acceptance.some(item => /未通过|待处理|缺口/.test(item))
        ? "未通过"
        : acceptance.some(item => /已通过|已完成|已对齐/.test(item))
            ? "已通过"
            : cancelled ? "已停止" : "待复核";
    return {
        schema: "ccm-main-agent-completion-card-v1",
        title: failed ? "未完成总览" : cancelled ? "停止总览" : done ? "最终交付总览" : "当前交付总览",
        surface: input.surface,
        status,
        status_label: deliveryStatusLabel(status),
        headline: highlights[0] || (done ? "任务已完成，交付结果已经整理。" : failed ? "任务没有完成，未完成原因已经整理。" : cancelled ? "任务已停止，当前状态已经整理。" : "任务仍在处理中。"),
        metrics: [
            { id: "status", label: "状态", value: deliveryStatusLabel(status), tone: done ? "success" : failed ? "danger" : cancelled ? "muted" : "warning" },
            { id: "scope", label: "涉及范围", value: files.length ? `${files.length} 个文件` : "未检测到文件变更", detail: files.slice(0, 2).join("；") },
            { id: "verification", label: "验证", value: verificationEvidence?.metric_value || (verification.length ? `${verification.length} 项` : "暂无系统捕获"), detail: verificationEvidence?.metric_detail || verification.slice(0, 2).join("；"), tone: verificationEvidence?.metric_tone },
            { id: "acceptance", label: "验收", value: acceptanceValue, detail: acceptance.slice(0, 2).join("；"), tone: acceptanceValue === "已通过" ? "success" : acceptanceValue === "未通过" ? "warning" : cancelled ? "muted" : "warning" },
            { id: "risk", label: failed ? "未完成原因" : cancelled ? "停止原因" : "风险", value: riskText, tone: risks.length ? "warning" : cancelled ? "muted" : "success" },
        ],
        highlights,
        verification: verificationEvidence?.items?.length ? verificationEvidence.items.slice(0, 5) : verification.slice(0, 5),
        verification_evidence: verificationEvidence,
        verificationEvidence,
        acceptance: acceptance.slice(0, 5),
        risks: risks.length ? risks.slice(0, 5) : [done ? "暂无需要你额外处理的风险。" : failed ? "未捕获到明确失败原因；排障信息已放入技术详情。" : cancelled ? "任务已停止；没有继续执行。" : "仍在等待最终验收。"],
        next_action: nextAction[0] || "",
        technical_hint: "底层执行记录和排障信息默认收在技术详情里。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function buildDeliveryUserHandoff(input, status, completed, planReview, files, verification, acceptance, independentReview, risks, nextAction) {
    const done = status === "done";
    const failed = status === "failed";
    const cancelled = status === "cancelled";
    const actions = [];
    const addAction = (id, label, detail = "", kind = "", tone = "outline") => {
        if (actions.some(item => item.id === id))
            return;
        actions.push({
            id,
            label: sanitizeMainAgentDeliveryText(label, "继续跟进", 80),
            detail: sanitizeMainAgentDeliveryText(detail || label, "", 220),
            kind: kind || id,
            tone,
        });
    };
    if (failed)
        addAction("retry_or_continue", "重新执行或继续修复", risks[0] || nextAction[0] || "主 Agent 会复用已有证据继续处理。", "retry", "primary");
    else if (cancelled)
        addAction("restart_request", "重新发起需求", nextAction[0] || "任务已经停止；需要继续时可以重新发起。", "continue", "primary");
    else if (risks.length)
        addAction("review_risks", "先处理风险与待确认", risks[0], "review_risks", "warning");
    if (files.length)
        addAction("view_changes", "查看改动", `已整理 ${files.length} 个文件变更。`, "view_changes", done && !risks.length ? "primary" : "outline");
    if (verification.length)
        addAction("review_verification", "核对验证结果", `已整理 ${verification.length} 项验证记录。`, "review_delivery", actions.length ? "outline" : "primary");
    if (done)
        addAction("continue_request", "继续提出新要求", nextAction[0] || "如果结果符合预期，可以继续补充下一步需求。", "continue", actions.length ? "outline" : "primary");
    if (cancelled && risks.length)
        addAction("review_stop_reason", "查看停止原因", risks[0], "review_risks", "outline");
    if (status === "waiting")
        addAction("wait_for_summary", "等待最终总结", nextAction[0] || "主 Agent 会继续协调执行并在完成后总结。", "continue", "outline");
    if (!actions.length)
        addAction("next_action", "继续跟进", nextAction[0] || "主 Agent 会继续处理并更新结果。", "continue", "primary");
    const handoffStatus = failed ? "failed" : cancelled ? "cancelled" : risks.length ? "needs_attention" : done ? "ready" : "tracking";
    const evidence = uniqueDeliveryStrings(planReview[0] ? `计划：${planReview[0]}` : "", files.length ? `改动：${files.length} 个文件` : "", verification.length ? `验证：${verification.length} 项已执行` : "", acceptance[0] ? `验收：${acceptance[0]}` : "", independentReview[0] ? `复核：${independentReview[0]}` : "", completed[0] ? `结果：${completed[0]}` : "", risks.length ? `待确认：${risks.length} 项` : "").slice(0, 6);
    return {
        schema: "ccm-main-agent-user-handoff-v1",
        title: "接下来建议",
        surface: input.surface,
        status: handoffStatus,
        status_label: handoffStatus === "ready" ? "可验收" : handoffStatus === "failed" ? "未完成" : handoffStatus === "cancelled" ? "已停止" : handoffStatus === "needs_attention" ? "需处理" : "跟踪中",
        headline: handoffStatus === "ready"
            ? "这轮任务已经收尾，建议先核对交付总结和改动明细。"
            : handoffStatus === "failed"
                ? "这轮任务没有完整完成，主 Agent 已整理可以继续推进的入口。"
                : handoffStatus === "cancelled"
                    ? "任务已经停止；需要继续时可以重新发起或恢复需求。"
                    : handoffStatus === "needs_attention"
                        ? "还有风险或待确认项，建议先处理这些内容再继续。"
                        : "任务仍在推进，主 Agent 会继续整理进展和最终总结。",
        primary_action: actions[0],
        primaryAction: actions[0],
        secondary_actions: actions.slice(1, 4),
        secondaryActions: actions.slice(1, 4),
        evidence,
        unresolved: risks.slice(0, 8),
        next_action: actions[0]?.detail || nextAction[0] || "",
        technical_hint: "底层执行记录和排障信息默认收在技术详情里。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function deliveryUserHandoffSectionItems(handoff) {
    if (!handoff)
        return [];
    return uniqueDeliveryStrings(handoff.primary_action?.label ? `${handoff.primary_action.label}${handoff.primary_action.detail ? `：${handoff.primary_action.detail}` : ""}` : "", ...(Array.isArray(handoff.secondary_actions) ? handoff.secondary_actions.map((item) => item?.label ? `${item.label}${item.detail ? `：${item.detail}` : ""}` : "") : [])).slice(0, 4);
}
function shouldShowMainAgentDeliveryReport(input) {
    if (input.ordinaryConversation)
        return false;
    if (input.executed === true)
        return true;
    const { report, summary, completion, workchainSummary } = getNestedReport(input);
    const actionEvidence = [
        report.actual_file_changes,
        report.file_changes,
        report.files_modified,
        report.verification_results,
        report.verification,
        report.verification_failed,
        report.verification_required_missing,
        summary.actual_file_changes,
        summary.file_changes,
        summary.verification_executed,
        summary.verification_failed,
        summary.verification_required_missing,
        completion.evidence,
        workchainSummary.evidence,
    ];
    return actionEvidence.some(value => asArray(value).length > 0) || normalizeDeliveryStatus(input.status) !== "done";
}
function buildMainAgentDeliveryReport(input) {
    const status = normalizeDeliveryStatus(input.status);
    const title = sanitizeMainAgentDeliveryText(input.title || input.task?.title || input.run?.original_user_message || input.run?.user_message || input.goal || "本轮任务", "本轮任务", 180);
    const files = collectDeliveryFiles(input);
    const verification = collectDeliveryVerification(input);
    const verificationEvidence = collectDeliveryVerificationEvidence(input, status);
    const risks = collectDeliveryRisks(input);
    const planReview = collectDeliveryPlanReview(input, status);
    const acceptance = collectDeliveryAcceptance(input, status, verification, risks);
    const independentReview = collectDeliveryIndependentReview(input, status);
    const completed = collectDeliveryCompleted(input, files, verification, status);
    const nextAction = collectDeliveryNextAction(input, status, risks);
    const pickupSummary = buildDeliveryPickupSummary(input, status, completed, planReview, files, verification, acceptance, independentReview, risks, nextAction);
    const completionCard = buildDeliveryCompletionCard(input, status, completed, files, verification, verificationEvidence, acceptance, independentReview, risks, nextAction);
    const userHandoff = buildDeliveryUserHandoff(input, status, completed, planReview, files, verification, acceptance, independentReview, risks, nextAction);
    const headline = completed[0] || (status === "done" ? "任务已完成。" : "任务已处理。");
    const sections = [
        buildDeliverySection("completed", deliveryPrimarySectionTitle(status), completed, deliveryPrimarySectionEmpty(status)),
        buildDeliverySection("plan_review", "计划回顾", planReview, "暂无单独计划记录；主 Agent 已按交付证据整理结果。"),
        buildDeliverySection("scope", "涉及范围", files, files.length ? "" : "未检测到代码文件变更。"),
        buildDeliverySection("verification", "验证结果", verification, verification.length ? "" : "暂无系统捕获的验证命令。"),
        buildDeliverySection("verification_evidence", "验收证据", verificationEvidence.items, "验证证据仍在收集。"),
        buildDeliverySection("acceptance", "验收结论", acceptance, "主 Agent 仍在等待最终复核。"),
        ...(independentReview.length ? [buildDeliverySection("independent_review", "复核结论", independentReview, "本次未触发独立复核。")] : []),
        buildDeliverySection("risks", status === "failed" ? "未完成原因" : status === "cancelled" ? "停止原因" : "风险与待确认", risks, deliveryRiskSectionEmpty(status)),
        buildDeliverySection("user_handoff", "接下来建议", deliveryUserHandoffSectionItems(userHandoff), nextAction[0] || "可以继续补充新的要求。"),
        buildDeliverySection("next_action", "下一步", nextAction, "可以继续补充新的要求。"),
    ];
    const finalSummaryQuality = buildDeliveryFinalSummaryQuality(status, sections, nextAction);
    const header = `【${deliveryTitle(status)}】`;
    const intro = [
        header,
        `任务：${title}`,
        `状态：${deliveryStatusLabel(status)}`,
    ].join("\n");
    const body = sections.map(section => formatDeliverySection(section.title, section.items)).join("\n\n");
    const markdown = `${intro}\n\n${body}`;
    return {
        schema: "ccm-main-agent-delivery-report-v1",
        surface: input.surface,
        status,
        status_label: deliveryStatusLabel(status),
        title,
        headline,
        sections,
        user_text: markdown,
        markdown,
        files,
        plan_review: planReview,
        planReview,
        verification,
        verification_evidence: verificationEvidence,
        verificationEvidence,
        acceptance,
        independent_review: independentReview,
        independentReview,
        risks,
        next_action: nextAction[0] || "",
        final_summary_quality: finalSummaryQuality,
        summary_quality: finalSummaryQuality,
        completion_card: completionCard,
        completionCard,
        pickup_summary: pickupSummary,
        pickupSummary,
        user_handoff: userHandoff,
        userHandoff,
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
        technical_details: [
            ...(Array.isArray(input.workchain?.technical_details) ? input.workchain.technical_details : []),
            ...(Array.isArray(input.technical?.technical_details) ? input.technical.technical_details : []),
        ],
        raw_report: input.report?.schema === "ccm-main-agent-delivery-report-v1" ? input.report.raw_report || null : input.report || null,
    };
}
function formatMainAgentDeliveryReply(report) {
    if (!report)
        return "";
    if (report.schema === "ccm-main-agent-delivery-report-v1")
        return report.markdown || report.user_text || report.headline || "";
    return String(report.formatted || report.user_text || report.summary || "").trim();
}
function runMainAgentDeliveryReportSelfTest() {
    const group = buildMainAgentDeliveryReport({
        surface: "group",
        status: "done",
        title: "给工单页增加负责人筛选",
        summary: {
            headline: "负责人筛选已经完成。",
            actual_file_changes: [{ project: "web", path: "src/Tickets.vue", additions: 18, deletions: 2 }],
            verification_executed: ["npm test -- --run Tickets"],
            external_runner_verification_count: 1,
            verification_source_gate_passed: true,
            verification_required_gate_passed: true,
            acceptance_gate_passed: true,
            acceptance_gate: { checks: [{ id: "owner_filter", label: "负责人筛选可用", ok: true }] },
            plan_mode: {
                title: "执行前计划",
                impact_scope: { areas: ["工单列表", "负责人筛选"] },
                steps: [{ content: "确认筛选入口" }, { content: "接入负责人参数" }, { content: "运行验证" }],
                acceptance: ["负责人筛选可用"],
            },
            plan_alignment: { status: "aligned", status_label: "已对齐" },
            risks: [],
        },
        executed: true,
    });
    const global = buildMainAgentDeliveryReport({
        surface: "global",
        status: "completed",
        title: "跨项目接入支付",
        report: {
            summary: "支付接入已通过门禁。",
            files_modified: ["api/src/pay.ts", "web/src/pay.vue"],
            verification_results: ["npm run check", "npm run build"],
            acceptance_gate_passed: true,
            acceptance_gate: { checks: [{ id: "cross_project", label: "前后端支付链路完成", ok: true }] },
            plan_mode: {
                title: "跨项目支付接入计划",
                impact_scope: { projects: ["api", "web"] },
                acceptance: ["前后端支付链路完成"],
            },
            plan_alignment: { status: "aligned" },
            independent_review_required: true,
            independent_review_gate_passed: true,
            independent_review_gate: {
                status: "passed",
                reason: "跨项目支付链路属于高风险改动",
                evidence_count: 1,
                evidence: [{
                        reviewer: "qa-agent",
                        verdict: "passed",
                        summary: "已复核支付 API 和前端调用，未发现阻塞风险。",
                        evidence: ["npm run check", "npm run build"],
                    }],
            },
            remaining_items: ["生产密钥需要上线前配置"],
        },
        executed: true,
    });
    const ordinaryShouldHide = shouldShowMainAgentDeliveryReport({
        surface: "global",
        status: "done",
        title: "解释知识库压缩原理",
        detail: "这是普通问答。",
        ordinaryConversation: true,
        executed: false,
    }) === false;
    const failed = buildMainAgentDeliveryReport({
        surface: "group",
        status: "failed",
        title: "修复登录",
        summary: {
            blockers: ["缺少测试环境变量"],
            verification_failed: ["npm test -- --run login 失败"],
            verification_suggested: ["建议补跑 npm run e2e:login"],
            verification_required_missing: [{ agent: "web", required: ["npm run test:login"] }],
            verification_required_gate_passed: false,
            verification_source_gate_passed: false,
            acceptance_gate_passed: false,
            acceptance_gate: { failed_checks: [{ id: "verify", label: "测试环境变量齐全" }] },
        },
        executed: true,
    });
    const cancelled = buildMainAgentDeliveryReport({
        surface: "global",
        status: "cancelled",
        title: "整理自动化任务列表",
        detail: "用户取消了本轮任务。",
        executed: true,
    });
    const legacy = buildMainAgentDeliveryReport({
        surface: "group",
        status: "done",
        title: "整理结果",
        summary: { headline: "CCM_AGENT_RECEIPT done receipt-status raw payload 回执已完成", verification_executed: ["npm test"], acceptance_gate_passed: true },
        executed: true,
    });
    const formattedGroup = formatMainAgentDeliveryReply(group);
    const checks = {
        groupHasFriendlySections: group.markdown.includes("完成内容") && group.markdown.includes("计划回顾") && group.markdown.includes("验证结果") && group.markdown.includes("验收证据") && group.markdown.includes("验收结论") && group.markdown.includes("下一步"),
        groupKeepsFilesReadable: group.files.some(file => file.includes("src/Tickets.vue")),
        groupHasPlanReview: group.plan_review?.some((item) => item.includes("执行前计划"))
            && group.markdown.includes("计划步骤")
            && group.markdown.includes("计划核对：已对齐")
            && group.pickup_summary?.review_items?.some((item) => item.includes("计划：")),
        groupHasAcceptanceConclusion: group.acceptance?.some((item) => item.includes("已通过"))
            && group.markdown.includes("主 Agent 验收")
            && group.completion_card?.metrics?.some((item) => item.id === "acceptance" && item.value === "已通过"),
        groupHasVerificationEvidenceQuality: group.verification_evidence?.schema === "ccm-main-agent-verification-evidence-v1"
            && group.verification_evidence?.items?.some((item) => item.includes("已实际执行 1 项验证"))
            && group.verification_evidence?.items?.some((item) => item.includes("外部 Runner 证据 1 项"))
            && group.completion_card?.metrics?.some((item) => item.id === "verification" && item.value.includes("实际执行"))
            && group.markdown.includes("验收证据"),
        groupHasCompletionCard: group.completion_card?.schema === "ccm-main-agent-completion-card-v1" && group.completion_card?.metrics?.some((item) => item.id === "verification" && item.value.includes("1")),
        groupHasFinalSummaryQualityGate: group.final_summary_quality?.schema === "ccm-main-agent-final-summary-quality-v1" && group.final_summary_quality?.passed === true,
        formattedDeliveryReplyHasRequiredSections: formattedGroup.includes("完成内容") && formattedGroup.includes("验证结果") && formattedGroup.includes("验收证据") && formattedGroup.includes("验收结论") && formattedGroup.includes("下一步"),
        groupHasPickupSummary: group.pickup_summary?.schema === "ccm-main-agent-pickup-summary-v1" && group.pickup_summary?.review_items?.some((item) => item.includes("src/Tickets.vue")) && group.pickup_summary?.review_items?.some((item) => item.includes("验收")) && group.pickup_summary?.technical_hint?.includes("技术详情"),
        groupHasUserHandoff: group.user_handoff?.schema === "ccm-main-agent-user-handoff-v1"
            && group.user_handoff?.primary_action?.kind === "view_changes"
            && group.markdown.includes("接下来建议"),
        globalShowsRiskAndNextAction: global.markdown.includes("生产密钥") && global.next_action.length > 0,
        globalCompletionCardShowsRisk: global.completion_card?.risks?.some((item) => item.includes("生产密钥")) && global.completion_card?.technical_hint?.includes("技术详情"),
        globalPickupShowsRisk: global.pickup_summary?.review_items?.some((item) => item.includes("生产密钥")) && global.pickup_summary?.resume_action?.length > 0,
        globalHasIndependentReviewConclusion: global.independent_review?.some((item) => item.includes("已通过"))
            && global.independent_review?.some((item) => item.includes("qa-agent"))
            && global.markdown.includes("复核结论")
            && global.pickup_summary?.review_items?.some((item) => item.includes("复核：")),
        globalHandoffPrioritizesRisk: global.user_handoff?.status === "needs_attention"
            && global.user_handoff?.primary_action?.kind === "review_risks"
            && global.user_handoff?.unresolved?.some((item) => item.includes("生产密钥")),
        ordinaryConversationHiddenByPolicy: ordinaryShouldHide,
        failedReportHasRisk: failed.markdown.includes("未完成原因") && failed.markdown.includes("缺少测试环境变量") && failed.markdown.includes("验收结论") && failed.markdown.includes("未通过") && failed.status === "failed"
            && failed.markdown.includes("验收证据")
            && failed.verification_evidence?.items?.some((item) => item.includes("失败验证"))
            && failed.verification_evidence?.items?.some((item) => item.includes("项目必需验证缺口"))
            && failed.user_handoff?.primary_action?.kind === "retry",
        cancelledReportHasStopSummary: cancelled.markdown.includes("停止说明")
            && cancelled.markdown.includes("停止原因")
            && !cancelled.markdown.includes("风险与待确认")
            && cancelled.completion_card?.metrics?.some((item) => item.id === "risk" && item.label === "停止原因")
            && cancelled.pickup_summary?.review_items?.some((item) => item.includes("停止原因"))
            && cancelled.status === "cancelled" && cancelled.status_label === "已取消"
            && cancelled.user_handoff?.status === "cancelled"
            && cancelled.user_handoff?.primary_action?.kind === "continue",
        legacyProtocolTextSanitized: !INTERNAL_DELIVERY_TEXT_PATTERN.test(legacy.markdown) && legacy.markdown.includes("结果说明") && !legacy.markdown.includes("raw payload"),
        noInternalLeak: !INTERNAL_DELIVERY_TEXT_PATTERN.test(group.markdown) && !INTERNAL_DELIVERY_TEXT_PATTERN.test(global.markdown),
    };
    return { pass: Object.values(checks).every(Boolean), checks, group, global, failed, cancelled, legacy };
}
//# sourceMappingURL=delivery-report.js.map